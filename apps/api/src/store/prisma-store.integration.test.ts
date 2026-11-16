import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { EngineService } from "../modules/engine/engine.service";
import { buildJourney } from "../modules/journey/journey.service";
import { RULE, at, seedTenant, snapshot } from "../test/helpers";
import { createPrismaStore } from "./prisma-store";
import type { Store } from "./types";

/**
 * Integração real com PostgreSQL (PGlite = Postgres em WebAssembly, servido via protocolo de rede):
 * aplica a migração versionada e exercita o armazenamento Prisma de ponta a ponta.
 */
const PORT = 54329;
let pg: PGlite;
let server: PGLiteSocketServer;
let store: Store;

beforeAll(async () => {
  pg = new PGlite();
  const migration = readFileSync(
    resolve(__dirname, "../../prisma/migrations/20261116000000_init/migration.sql"),
    "utf8",
  );
  await pg.exec(migration);
  server = new PGLiteSocketServer({ db: pg, port: PORT, maxConnections: 10 });
  await server.start();
  store = createPrismaStore(
    `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?sslmode=disable`,
  );
}, 60_000);

afterAll(async () => {
  await store?.close();
  await server?.stop();
  await pg?.close();
});

describe("armazenamento Prisma em PostgreSQL", () => {
  it("empresas, regras, negócios, ocorrências, histórico e notificações", async () => {
    const tenant = await seedTenant(store);
    expect((await store.tenants.findByMemberId("membro-1"))?.id).toBe(tenant.id);
    const again = await seedTenant(store, { clientEndpoint: tenant.clientEndpoint });
    expect(again.id).toBe(tenant.id); // reinstalação atualiza, não duplica

    await store.rules.replaceAll(tenant.id, [RULE]);
    expect(await store.rules.list(tenant.id)).toEqual([RULE]);

    await store.deals.upsert(tenant.id, snapshot());
    await store.deals.upsert(tenant.id, snapshot({ title: "Título novo" }));
    expect((await store.deals.get(tenant.id, "501"))?.title).toBe("Título novo");
    expect(await store.deals.listByAssignee(tenant.id, "7")).toHaveLength(1);

    const input = {
      tenantId: tenant.id,
      ruleCode: RULE.code,
      dealId: "501",
      stageId: "PREPARATION",
      stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
      responsibleId: "7",
      openedAt: at("2026-11-16T10:00:00-03:00"),
      dueAt: at("2026-11-17T18:00:00-03:00"),
      riskAt: at("2026-11-17T10:00:00-03:00"),
    };
    const first = await store.occurrences.create(input);
    const duplicate = await store.occurrences.create(input);
    expect(first.created).toBe(true);
    expect(duplicate).toMatchObject({ created: false, record: { id: first.record.id } });

    await store.occurrences.update(first.record.id, { status: "overdue", escalationLevel: 1 });
    await store.occurrences.appendEvent({
      occurrenceId: first.record.id,
      tenantId: tenant.id,
      type: "escalated",
      actor: "engine",
      payload: { level: 1 },
    });
    expect((await store.occurrences.listOpen(tenant.id))[0]).toMatchObject({
      status: "overdue",
      escalationLevel: 1,
    });
    expect((await store.occurrences.listEvents(first.record.id))[0]).toMatchObject({
      type: "escalated",
      payload: { level: 1 },
    });

    expect(await store.notifications.claim(tenant.id, "7", "overdue", "k1")).toBe(true);
    expect(await store.notifications.claim(tenant.id, "7", "overdue", "k1")).toBe(false);
    await store.notifications.release(tenant.id, "k1");
    expect(await store.notifications.claim(tenant.id, "7", "overdue", "k1")).toBe(true);
  });

  it("motor de regras completo sobre o banco", async () => {
    const tenant = await store.tenants.upsert({
      domain: "outra.bitrix24.com.br",
      memberId: "membro-2",
      clientEndpoint: "https://outra.bitrix24.com.br/rest/",
      applicationToken: null,
      accessTokenEnc: "x",
      refreshTokenEnc: null,
      tokenExpiresAt: null,
      config: (await seedTenant(store)).config,
    });
    await store.rules.replaceAll(tenant.id, [RULE]);
    let now = at("2026-11-16T11:00:00-03:00");
    const sent: string[] = [];
    const engine = new EngineService({
      store,
      source: { listOpenDeals: async () => [snapshot()], getDeal: async () => snapshot() },
      superiors: { superiors: async () => ["20", "30"] },
      notifier: {
        notify: async (_t, userId, kind, key) => {
          if (!(await store.notifications.claim(tenant.id, userId, kind, key))) return false;
          sent.push(`${kind}:${userId}`);
          return true;
        },
      },
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      now: () => now,
    });

    await engine.fullSync(tenant);
    now = at("2026-11-17T19:00:00-03:00");
    await engine.tick(tenant);
    await engine.tick(tenant); // idempotente

    expect(sent).toEqual(["overdue:7", "escalation:20", "escalation:7"]);
    const journey = await buildJourney(store, tenant, "7", now);
    expect(journey.summary).toMatchObject({ atRisk: 1 });
    expect(journey.deals[0]?.deadlineLabel).toBe("Em atraso · superior notificado");
  });
});
