import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import qs from "qs";
import { describe, expect, it, vi } from "vitest";
import { Bitrix24Portal } from "../../integrations/bitrix24/portal";
import { CrmReader } from "../../integrations/bitrix24/crm-reader";
import { SessionSigner } from "../../security/session";
import { TokenCipher } from "../../security/token-cipher";
import { createMemoryStore } from "../../store/memory-store";
import type { Store, TenantRecord } from "../../store/types";
import {
  DOMAIN,
  ENCRYPTION_KEY,
  RULE,
  SESSION_SECRET,
  at,
  fakeRest,
  seedTenant,
  snapshot,
  testApp,
} from "../../test/helpers";
import { ASSISTANT_MESSAGES } from "../assistant/assistant.service";
import { EngineService } from "../engine/engine.service";
import { DedupNotifier } from "../engine/notifier";
import { inPilot } from "./pilot";
import { loadTenantFile } from "./tenant-config";

const PILOT = ["7"];

async function pilotTenant(store: Store): Promise<TenantRecord> {
  const tenant = await seedTenant(store);
  return store.tenants.update(tenant.id, { config: { ...tenant.config, pilotUserIds: PILOT } });
}

describe("modo piloto", () => {
  it("lido da configuração da empresa; sem piloto, todos usam", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tenants-"));
    writeFileSync(join(dir, "a.bitrix24.com.json"), JSON.stringify({ pilot: { userIds: ["13"] } }));
    const file = await loadTenantFile(dir, "a.bitrix24.com");
    expect(file?.config.pilotUserIds).toEqual(["13"]);
    expect(inPilot({ config: file!.config }, "13")).toBe(true);
    expect(inPilot({ config: file!.config }, "14")).toBe(false);
    expect(inPilot({ config: file!.config }, undefined)).toBe(false);
    expect(inPilot({ config: { ...file!.config, pilotUserIds: [] } }, "14")).toBe(true);

    writeFileSync(join(dir, "b.bitrix24.com.json"), JSON.stringify({ pilot: { userIds: ["x"] } }));
    await expect(loadTenantFile(dir, "b.bitrix24.com")).rejects.toThrow();
  });

  it("o CRM filtra pelo responsável na própria consulta (negócios de outros nem chegam)", async () => {
    const store = createMemoryStore();
    const tenant = await pilotTenant(store);
    const rest = fakeRest({ "crm.deal.list": [] });
    const reader = new CrmReader(
      new Bitrix24Portal(store, new TokenCipher(ENCRYPTION_KEY), rest.client, null),
    );
    await reader.listOpenDeals(tenant);
    expect(await reader.getDeal(tenant, "900")).toBeNull();
    const filters = rest.calls.map((call) => call.params.filter);
    expect(filters).toEqual([
      { CLOSED: "N", ASSIGNED_BY_ID: PILOT },
      { ID: "900", ASSIGNED_BY_ID: PILOT },
    ]);
    expect(rest.calls.some((call) => call.method === "crm.deal.get")).toBe(false);
  });

  it("mensagens só para usuários do piloto; chefe fora do piloto fica no histórico", async () => {
    const store = createMemoryStore();
    const tenant = await pilotTenant(store);
    await store.rules.replaceAll(tenant.id, [RULE]);
    const sent: string[] = [];
    let now = at("2026-11-16T11:00:00-03:00");
    const engine = new EngineService({
      store,
      source: { listOpenDeals: async () => [snapshot()], getDeal: async () => snapshot() },
      superiors: { superiors: async () => ["20", "30"] },
      notifier: {
        notify: async (_tenant, userId) => {
          sent.push(userId);
          return true;
        },
      },
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      now: () => now,
    });
    await engine.fullSync(tenant);
    now = at("2026-11-17T18:30:00-03:00");
    await engine.tick(tenant);

    expect(sent).toEqual(["7", "7"]); // atraso e aviso de escalonamento ao próprio responsável
    const [occurrence] = await store.occurrences.listOpen(tenant.id);
    const suppressed = (await store.occurrences.listEvents(occurrence!.id)).filter(
      (event) => event.type === "notification_suppressed",
    );
    expect(suppressed.map((event) => event.payload)).toEqual([
      { kind: "escalation", to: "20", mode: "pilot" },
    ]);
  });

  it("última barreira: o envio pelo bot recusa quem está fora do piloto", async () => {
    const store = createMemoryStore();
    const tenant = await pilotTenant(store);
    const messenger = { sendToUser: vi.fn(async () => undefined) };
    const notifier = new DedupNotifier(store, messenger, { warn: vi.fn() });
    expect(await notifier.notify(tenant, "20", "digest", "k1", "oi")).toBe(false);
    expect(await notifier.notify(tenant, "7", "digest", "k2", "oi")).toBe(true);
    expect(messenger.sendToUser).toHaveBeenCalledTimes(1);
  });

  it("no chat, quem está fora do piloto recebe só um aviso, sem dados nem IA", async () => {
    const rest = fakeRest();
    const answer = vi.fn();
    const { app, store } = await testApp(
      {},
      { restClient: rest.client, llm: { name: "fake", answer } },
    );
    await pilotTenant(store);
    const body = qs.stringify({
      event: "ONIMBOTV2MESSAGEADD",
      data: {
        bot: { id: "41", code: "projacseg_assistant" },
        message: { text: "meus prazos?", authorId: "8" },
        chat: { dialogId: "8", type: "private" },
        user: { id: "8", name: "Outra pessoa" },
      },
      auth: {
        domain: DOMAIN,
        client_endpoint: `https://${DOMAIN}/rest/`,
        member_id: "membro-1",
        application_token: "app-token-1",
      },
    });
    await app.inject({
      method: "POST",
      url: "/bitrix24/events/assistant",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: body,
    });
    expect(answer).not.toHaveBeenCalled();
    const send = rest.calls.find((call) => call.method === "imbot.v2.Chat.Message.send");
    expect(send?.params).toMatchObject({
      dialogId: "8",
      fields: { message: ASSISTANT_MESSAGES.pilotOnly },
    });
    await app.close();
  });

  it("aplicativo e API: fora do piloto, aviso sem sessão e sem dados", async () => {
    const dist = mkdtempSync(join(tmpdir(), "web-"));
    writeFileSync(join(dist, "index.html"), "<!doctype html><html><head></head></html>");
    const rest = fakeRest({
      "app.info": { CODE: "local.app.1" },
      "user.current": { ID: "8", NAME: "Outra" },
      "user.admin": false,
    });
    const { app, store } = await testApp({ WEB_DIST_DIR: dist }, { restClient: rest.client });
    const tenant = await pilotTenant(store);
    await store.deals.upsert(tenant.id, snapshot({ dealId: "900", assignedById: "8" }));

    const opened = await app.inject({
      method: "POST",
      url: `/?DOMAIN=${DOMAIN}&APP_SID=abc`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: qs.stringify({ AUTH_ID: "a", member_id: "membro-1" }),
    });
    expect(opened.body).toContain('name="workspace-access" content="restricted"');
    expect(opened.body).not.toContain("workspace-session");

    // Mesmo com uma sessão válida, a API não entrega dados a quem está fora do piloto.
    const signer = new SessionSigner(SESSION_SECRET);
    const session = signer.issue({ tenantId: tenant.id, userId: "8", name: "Outra", admin: true });
    const headers = { authorization: `Bearer ${session}` };
    expect((await app.inject({ method: "GET", url: "/api/v1/journey", headers })).statusCode).toBe(
      403,
    );
    expect(
      (await app.inject({ method: "GET", url: "/api/v1/deals/900/history", headers })).statusCode,
    ).toBe(403);
    await app.close();
  });

  it("bot oculto nas listas do messenger durante o piloto", async () => {
    const rest = fakeRest({
      "imbot.v2.Bot.register": { bot: { id: 92, code: "projacseg_assistant" } },
    });
    const store = createMemoryStore();
    const tenant = await pilotTenant(store);
    const { AssistantBot } = await import("../../integrations/bitrix24/bot-messenger");
    const bot = new AssistantBot(
      new Bitrix24Portal(store, new TokenCipher(ENCRYPTION_KEY), rest.client, null),
      "projacseg_assistant",
    );
    await bot.register(tenant, "https://x.exemplo/bitrix24/events/assistant");
    expect(rest.calls.find((call) => call.method === "imbot.v2.Bot.update")?.params).toMatchObject({
      fields: { isHidden: true },
    });
  });
});

describe("aviso ao superior no dashboard e na IA", () => {
  it("no piloto, o escalonamento aparece como registrado, nunca como superior notificado", async () => {
    const { buildJourney } = await import("../journey/journey.service");
    const store = createMemoryStore();
    const tenant = await pilotTenant(store);
    await store.rules.replaceAll(tenant.id, [RULE]);
    await store.deals.upsert(tenant.id, snapshot());
    const { record } = await store.occurrences.create({
      tenantId: tenant.id,
      ruleCode: RULE.code,
      dealId: "501",
      stageId: "PREPARATION",
      stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
      responsibleId: "7",
      openedAt: at("2026-11-16T10:00:00-03:00"),
      dueAt: at("2026-11-17T18:00:00-03:00"),
      riskAt: at("2026-11-17T10:00:00-03:00"),
    });
    await store.occurrences.update(record.id, { status: "overdue", escalationLevel: 1 });

    const journey = await buildJourney(store, tenant, "7", at("2026-11-18T10:00:00-03:00"));
    expect(journey.deals[0]?.deadlineLabel).toBe(
      "Em atraso há 1 dia · escalonamento registrado, superior não avisado",
    );
    expect(journey.briefing).not.toContain("superior notificado");
  });
});
