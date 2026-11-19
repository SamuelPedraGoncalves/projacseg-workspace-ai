import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CrmReader } from "../../integrations/bitrix24/crm-reader";
import { Bitrix24Portal } from "../../integrations/bitrix24/portal";
import type { LlmProvider } from "../../integrations/llm/llm-provider";
import { SessionSigner } from "../../security/session";
import { TokenCipher } from "../../security/token-cipher";
import { createMemoryStore } from "../../store/memory-store";
import type { Store, TenantRecord } from "../../store/types";
import {
  ENCRYPTION_KEY,
  RULE,
  SESSION_SECRET,
  acceptTerms,
  at,
  fakeRest,
  seedTenant,
  snapshot,
  testApp,
} from "../../test/helpers";
import { AssistantService, OBSERVING_PROMPT } from "../assistant/assistant.service";
import { DigestService } from "../engine/digest.service";
import { EngineService } from "../engine/engine.service";
import type { Notifier } from "../engine/ports";
import { crmScopeUsers, isObserving, observerOf, subjectOf } from "./pilot";
import { loadTenantFile } from "./tenant-config";

// Usuário 7 (piloto) observa o colaborador 8, que continua fora do piloto.
async function observing(store: Store): Promise<TenantRecord> {
  const tenant = await seedTenant(store);
  await acceptTerms(store, tenant.id);
  return store.tenants.update(tenant.id, {
    config: { ...tenant.config, pilotUserIds: ["7"], pilotViewAs: { "7": "8" } },
  });
}

describe("modo de observação do piloto", () => {
  it("configuração: só quem está no piloto pode observar", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tenants-"));
    writeFileSync(
      join(dir, "a.bitrix24.com.json"),
      JSON.stringify({ pilot: { userIds: ["13"], viewAs: { "13": "27" } } }),
    );
    const file = await loadTenantFile(dir, "a.bitrix24.com");
    expect(file?.config.pilotViewAs).toEqual({ "13": "27" });
    const tenant = { config: file!.config };
    expect(subjectOf(tenant, "13")).toBe("27");
    expect(isObserving(tenant, "13")).toBe(true);
    expect(observerOf(tenant, "27")).toBe("13");
    expect(crmScopeUsers(tenant)).toEqual(["13", "27"]);

    writeFileSync(
      join(dir, "b.bitrix24.com.json"),
      JSON.stringify({ pilot: { userIds: ["13"], viewAs: { "14": "27" } } }),
    );
    await expect(loadTenantFile(dir, "b.bitrix24.com")).rejects.toThrow(/viewAs/);
  });

  it("o CRM lê também os negócios do observado", async () => {
    const store = createMemoryStore();
    const tenant = await observing(store);
    const rest = fakeRest({ "crm.deal.list": [] });
    const reader = new CrmReader(
      new Bitrix24Portal(store, new TokenCipher(ENCRYPTION_KEY), rest.client, null),
    );
    await reader.listOpenDeals(tenant);
    expect(rest.calls[0]?.params.filter).toEqual({ CLOSED: "N", ASSIGNED_BY_ID: ["7", "8"] });
  });

  it("dashboard do observador mostra os negócios do observado; o observado não acessa", async () => {
    const { app, store } = await testApp({});
    const tenant = await observing(store);
    await store.deals.upsert(tenant.id, snapshot({ dealId: "501", assignedById: "7" }));
    await store.deals.upsert(tenant.id, snapshot({ dealId: "900", assignedById: "8" }));
    const signer = new SessionSigner(SESSION_SECRET);
    const get = (userId: string, url: string) =>
      app.inject({
        method: "GET",
        url,
        headers: {
          authorization: `Bearer ${signer.issue({ tenantId: tenant.id, userId, name: "x", admin: false })}`,
        },
      });

    const journey = await get("7", "/api/v1/journey");
    expect(journey.json().deals.map((deal: { id: string }) => deal.id)).toEqual(["900"]);
    expect((await get("7", "/api/v1/deals/900/history")).statusCode).toBe(200);
    expect((await get("8", "/api/v1/journey")).statusCode).toBe(403);
    await app.close();
  });

  it("chat do observador analisa o observado, só leitura (sem ferramentas de ação)", async () => {
    const store = createMemoryStore();
    const tenant = await observing(store);
    await store.deals.upsert(tenant.id, snapshot({ dealId: "900", assignedById: "8" }));
    const answer = vi.fn<LlmProvider["answer"]>(async () => ({
      ok: true,
      text: "Veja o Negócio #900.",
    }));
    const plan = vi.fn<NonNullable<LlmProvider["plan"]>>();
    const assistant = new AssistantService(store, { name: "fake", answer, plan }, true, () =>
      at("2026-11-18T10:00:00-03:00"),
    );
    const reply = await assistant.reply(tenant, "7", "Samuel", "o que está atrasado?");
    expect(plan).not.toHaveBeenCalled();
    const input = answer.mock.calls[0]![0];
    expect(input.context).toContain("Negócio #900");
    expect(input.system).toContain(OBSERVING_PROMPT);
    expect(reply).toContain("Negócio #900");
  });

  it("alertas do observado vão para o observador, marcados; o observado e o chefe não recebem", async () => {
    const store = createMemoryStore();
    const tenant = await observing(store);
    await store.rules.replaceAll(tenant.id, [RULE]);
    const deal = snapshot({ dealId: "900", assignedById: "8" });
    const sent: { userId: string; message: string }[] = [];
    const notifier: Notifier = {
      notify: async (_tenant, userId, _kind, _key, message) => {
        sent.push({ userId, message });
        return true;
      },
    };
    let now = at("2026-11-16T11:00:00-03:00");
    const engine = new EngineService({
      store,
      source: { listOpenDeals: async () => [deal], getDeal: async () => deal },
      superiors: { superiors: async () => ["20"] },
      notifier,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      now: () => now,
    });
    await engine.fullSync(tenant);
    now = at("2026-11-17T18:30:00-03:00");
    await engine.tick(tenant);

    expect(sent.map((item) => item.userId)).toEqual(["7", "7"]);
    expect(sent.every((item) => item.message.startsWith("👁 [B]Observação[/B]"))).toBe(true);

    const digest = new DigestService(store, notifier, () => at("2026-11-18T09:30:00-03:00"));
    expect(await digest.run(tenant)).toBe(1);
    expect(sent.at(-1)).toMatchObject({ userId: "7" });
    expect(sent.at(-1)?.message).toMatch(/^👁 \[B\]Observação\[\/B\] — Resumo do dia/);
    expect(sent.some((item) => item.userId === "8" || item.userId === "20")).toBe(false);
  });

  it("ao começar a observar uma carteira atrasada, no máximo 5 avisos por hora", async () => {
    const store = createMemoryStore();
    const tenant = await observing(store);
    await store.rules.replaceAll(tenant.id, [RULE]);
    const deals = ["901", "902", "903", "904", "905", "906", "907"].map((dealId) =>
      snapshot({ dealId, assignedById: "8" }),
    );
    const sent: string[] = [];
    let now = at("2026-11-16T11:00:00-03:00");
    const engine = new EngineService({
      store,
      source: {
        listOpenDeals: async () => deals,
        getDeal: async (_t, id) => deals.find((deal) => deal.dealId === id) ?? null,
      },
      superiors: { superiors: async () => [] },
      notifier: { notify: async (_t, userId) => (sent.push(userId), true) },
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      now: () => now,
    });
    await engine.fullSync(tenant);
    now = at("2026-11-18T10:00:00-03:00");
    await engine.tick(tenant);
    expect(sent).toHaveLength(5);
    // O que passou do limite não é reenviado depois: fica no histórico, no resumo e no dashboard.
    now = at("2026-11-18T11:30:00-03:00");
    await engine.tick(tenant);
    expect(sent).toHaveLength(5);
    const events = await Promise.all(
      (await store.occurrences.listOpen(tenant.id)).map((item) =>
        store.occurrences.listEvents(item.id),
      ),
    );
    expect(
      events.flat().filter((event) => event.payload.mode === "observer_limit").length,
    ).toBeGreaterThan(0);
  });
});
