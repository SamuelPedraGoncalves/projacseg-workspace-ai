import { describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "../../store/memory-store";
import type { DealSnapshotRecord, Store, TenantRecord } from "../../store/types";
import { RULE, at, seedTenant, snapshot } from "../../test/helpers";
import { buildJourney } from "../journey/journey.service";
import { DigestService } from "./digest.service";
import { EngineService } from "./engine.service";
import type { Notifier } from "./ports";

interface World {
  store: Store;
  tenant: TenantRecord;
  engine: EngineService;
  crm: Map<string, DealSnapshotRecord>;
  sent: { userId: string; kind: string; key: string; message: string }[];
  clock: { now: Date };
  notifier: Notifier;
}

async function world(): Promise<World> {
  const store = createMemoryStore();
  const tenant = await seedTenant(store);
  await store.rules.replaceAll(tenant.id, [RULE]);
  const crm = new Map<string, DealSnapshotRecord>([["501", snapshot()]]);
  const clock = { now: at("2026-11-16T11:00:00-03:00") };
  const sent: World["sent"] = [];
  const keys = new Set<string>();
  const notifier: Notifier = {
    notify: async (_tenant, userId, kind, key, message) => {
      if (keys.has(key)) return false;
      keys.add(key);
      sent.push({ userId, kind, key, message });
      return true;
    },
  };
  const engine = new EngineService({
    store,
    source: {
      listOpenDeals: async () => [...crm.values()].filter((deal) => !deal.closed),
      getDeal: async (_tenant, id) => crm.get(id) ?? null,
    },
    // Lucas (7) → chefe Marina (20) → diretora Ana (30)
    superiors: { superiors: async () => ["20", "30"] },
    notifier,
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    now: () => clock.now,
  });
  return { store, tenant, engine, crm, sent, clock, notifier };
}

describe("motor de regras ponta a ponta", () => {
  it("abre ocorrência, alerta risco, vence, escalona e resolve ao avançar de etapa", async () => {
    const w = await world();

    await w.engine.fullSync(w.tenant);
    const [opened] = await w.store.occurrences.listOpen(w.tenant.id);
    expect(opened).toMatchObject({ status: "open", dueAt: at("2026-11-17T18:00:00-03:00") });

    w.clock.now = at("2026-11-17T12:00:00-03:00");
    await w.engine.tick(w.tenant);
    expect(w.sent.map((item) => [item.userId, item.kind])).toEqual([["7", "at_risk"]]);

    w.clock.now = at("2026-11-17T18:30:00-03:00");
    await w.engine.tick(w.tenant);
    expect(w.sent.map((item) => [item.userId, item.kind])).toEqual([
      ["7", "at_risk"],
      ["7", "overdue"],
      ["20", "escalation"],
      ["7", "escalation"],
    ]);
    expect(w.sent[2]?.message).toContain("Lucas Carvalho");
    expect(w.sent[2]?.message).toContain(`https://${w.tenant.domain}/crm/deal/details/501/`);

    // Ciclos repetidos não duplicam mensagens nem eventos.
    await w.engine.tick(w.tenant);
    expect(w.sent).toHaveLength(4);

    w.clock.now = at("2026-11-18T18:00:00-03:00");
    await w.engine.tick(w.tenant);
    expect(w.sent.at(-2)).toMatchObject({ userId: "30", kind: "escalation" });

    // O negócio avança: a ocorrência é resolvida (único jeito de encerrar).
    w.crm.set(
      "501",
      snapshot({ stageId: "EXECUTING", stageEnteredAt: at("2026-11-18T18:10:00-03:00") }),
    );
    w.clock.now = at("2026-11-18T18:15:00-03:00");
    await w.engine.syncDeal(w.tenant, "501");
    expect(await w.store.occurrences.listOpen(w.tenant.id)).toHaveLength(0);

    const events = await w.store.occurrences.listEvents(opened!.id);
    expect(events.map((event) => event.type)).toEqual([
      "opened",
      "at_risk",
      "overdue",
      "escalated",
      "escalated",
      "resolved",
    ]);
    expect(events.every((event) => event.actor === "engine")).toBe(true);
  });

  it("negócio excluído no CRM encerra as ocorrências", async () => {
    const w = await world();
    await w.engine.fullSync(w.tenant);
    w.crm.delete("501");
    await w.engine.fullSync(w.tenant);
    expect(await w.store.occurrences.listOpen(w.tenant.id)).toHaveLength(0);
  });

  it("sem superior no organograma registra o problema e não quebra", async () => {
    const w = await world();
    const engine = new EngineService({
      store: w.store,
      source: { listOpenDeals: async () => [snapshot()], getDeal: async () => snapshot() },
      superiors: { superiors: async () => [] },
      notifier: w.notifier,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      now: () => at("2026-11-17T19:00:00-03:00"),
    });
    await engine.fullSync(w.tenant);
    await engine.tick(w.tenant);
    const [occurrence] = await w.store.occurrences.listOpen(w.tenant.id);
    const types = (await w.store.occurrences.listEvents(occurrence!.id)).map((event) => event.type);
    expect(types).toContain("escalation_target_missing");
  });

  it("dashboard e resumo diário saem do motor", async () => {
    const w = await world();
    await w.engine.fullSync(w.tenant);
    w.clock.now = at("2026-11-17T12:00:00-03:00");
    await w.engine.tick(w.tenant);

    const journey = await buildJourney(w.store, w.tenant, "7", w.clock.now);
    expect(journey.summary).toEqual({
      activeDeals: 1,
      actionsToday: 1,
      atRisk: 1,
      resolvedToday: 0,
    });
    expect(journey.deals[0]).toMatchObject({ id: "501", origin: "crm", status: "risk" });

    const digest = new DigestService(w.store, w.notifier, () => w.clock.now);
    expect(await digest.run(w.tenant)).toBe(1);
    expect(await digest.run(w.tenant)).toBe(0); // uma vez por dia
    expect(w.sent.at(-1)?.message).toMatch(/^Resumo do dia: 1 em risco, 1 para hoje/);
  });

  it("resumo diário respeita horário e fim de semana", async () => {
    const w = await world();
    await w.engine.fullSync(w.tenant);
    const early = new DigestService(w.store, w.notifier, () => at("2026-11-16T07:00:00-03:00"));
    const saturday = new DigestService(w.store, w.notifier, () => at("2026-11-21T09:00:00-03:00"));
    expect(await early.run(w.tenant)).toBe(0);
    expect(await saturday.run(w.tenant)).toBe(0);
  });
});
