import qs from "qs";
import { describe, expect, it, vi } from "vitest";
import type { LlmProvider } from "../../integrations/llm/llm-provider";
import { SessionSigner } from "../../security/session";
import {
  DOMAIN,
  SESSION_SECRET,
  fakeRest,
  acceptTerms,
  seedTenant,
  snapshot,
  testApp,
} from "../../test/helpers";
import { ASSISTANT_MESSAGES } from "../assistant/assistant.service";

const AUTH = {
  domain: DOMAIN,
  client_endpoint: `https://${DOMAIN}/rest/`,
  server_endpoint: "https://oauth.bitrix.info/rest/",
  member_id: "membro-1",
  application_token: "app-token-1",
};

/** Evento ONIMBOTV2* como o Bitrix24 envia em modo webhook: formulário, tudo em texto. */
function eventBody(overrides: Record<string, unknown> = {}) {
  return qs.stringify({
    event: "ONIMBOTV2MESSAGEADD",
    event_handler_id: "12",
    ts: "1763300000",
    data: {
      bot: { id: "41", code: "projacseg_assistant" },
      message: { id: "900", text: "o que faço primeiro?", authorId: "7" },
      chat: { id: "15", dialogId: "7", type: "private" },
      user: { id: "7", name: "Lucas" },
      language: "br",
    },
    auth: AUTH,
    ...overrides,
  });
}

const post = (app: Awaited<ReturnType<typeof testApp>>["app"], body: string) =>
  app.inject({
    method: "POST",
    url: "/bitrix24/events/assistant",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: body,
  });

const sent = (calls: ReturnType<typeof fakeRest>["calls"]) =>
  calls.find((call) => call.method === "imbot.v2.Chat.Message.send");

describe("bot do assistente (imbot.v2)", () => {
  it("sem IA configurada, responde com aviso honesto usando os tokens do aplicativo", async () => {
    const rest = fakeRest();
    const { app, store } = await testApp({}, { restClient: rest.client });
    await seedTenant(store);
    expect((await post(app, eventBody())).statusCode).toBe(200);
    expect(sent(rest.calls)).toMatchObject({
      endpoint: `https://${DOMAIN}/rest/`,
      params: { botId: 41, dialogId: "7", fields: { message: ASSISTANT_MESSAGES.notConnected } },
      token: "access-1",
    });
    expect(rest.calls.some((call) => call.method.startsWith("imbot.message"))).toBe(false);
    await app.close();
  });

  it("com IA ativada, responde com base no painel do motor e sem nomes de clientes", async () => {
    const rest = fakeRest();
    const answer = vi.fn<LlmProvider["answer"]>(async () => ({
      ok: true,
      text: "Comece pelo Negócio #501.",
    }));
    const { app, store } = await testApp(
      {},
      { restClient: rest.client, llm: { name: "fake", answer } },
    );
    const tenant = await seedTenant(store);
    await acceptTerms(store, tenant.id);
    await store.deals.upsert(tenant.id, snapshot());

    await post(app, eventBody());
    const input = answer.mock.calls[0]![0];
    expect(input.question).toBe("o que faço primeiro?");
    expect(input.context).toContain("Negócio #501");
    expect(input.context).not.toContain("Carlos Almeida");
    expect(input.system).toMatch(/não pode cancelar, adiar/);
    expect(sent(rest.calls)?.params.fields).toEqual({
      message: `Comece pelo [URL=https://${DOMAIN}/crm/deal/details/501/]Negócio #501[/URL] (Carlos Almeida - Auto).`,
    });
    await app.close();
  });

  it("em conversa de grupo não expõe dados: pede para falar no privado", async () => {
    const rest = fakeRest();
    const answer = vi.fn<LlmProvider["answer"]>();
    const { app, store } = await testApp(
      {},
      { restClient: rest.client, llm: { name: "fake", answer } },
    );
    await seedTenant(store);
    const group = eventBody({
      data: {
        bot: { id: "41", code: "projacseg_assistant" },
        message: { text: "[USER=41]Assistente[/USER] meus prazos?", authorId: "7" },
        chat: { dialogId: "chat15", type: "chat" },
        user: { id: "7", name: "Lucas" },
      },
    });
    expect((await post(app, group)).statusCode).toBe(200);
    expect(answer).not.toHaveBeenCalled();
    expect(sent(rest.calls)?.params).toMatchObject({
      dialogId: "chat15",
      fields: { message: ASSISTANT_MESSAGES.privateOnly },
    });
    await app.close();
  });

  it("IA desativada na empresa: aviso honesto mesmo com provedor configurado", async () => {
    const rest = fakeRest();
    const answer = vi.fn<LlmProvider["answer"]>();
    const { app, store } = await testApp(
      {},
      { restClient: rest.client, llm: { name: "fake", answer } },
    );
    const tenant = await seedTenant(store);
    await store.tenants.update(tenant.id, { config: { ...tenant.config, aiEnabled: false } });
    await post(app, eventBody());
    expect(answer).not.toHaveBeenCalled();
    expect(sent(rest.calls)?.params.fields).toEqual({ message: ASSISTANT_MESSAGES.notConnected });
    await app.close();
  });

  it("termos vigentes não aceitos: aviso honesto, sem chamar a IA", async () => {
    const rest = fakeRest();
    const answer = vi.fn<LlmProvider["answer"]>();
    const { app, store } = await testApp(
      {},
      { restClient: rest.client, llm: { name: "fake", answer } },
    );
    await seedTenant(store); // aiEnabled: true, mas sem aceite
    await post(app, eventBody());
    expect(sent(rest.calls)?.params.fields).toEqual({ message: ASSISTANT_MESSAGES.notConnected });
    expect(answer).not.toHaveBeenCalled();
    await app.close();
  });

  it("falha da IA não deixa o colaborador sem resposta", async () => {
    const rest = fakeRest();
    const { app, store } = await testApp(
      {},
      {
        restClient: rest.client,
        llm: { name: "fake", answer: async () => ({ ok: false, reason: "rate_limited" }) },
      },
    );
    await acceptTerms(store, (await seedTenant(store)).id);
    await post(app, eventBody());
    expect(sent(rest.calls)?.params.fields).toEqual({ message: ASSISTANT_MESSAGES.failure });
    await app.close();
  });

  it("boas-vindas ao entrar num chat", async () => {
    const rest = fakeRest();
    const { app, store } = await testApp({}, { restClient: rest.client });
    await seedTenant(store);
    const join = eventBody({
      event: "ONIMBOTV2JOINCHAT",
      data: {
        bot: { id: "41", code: "projacseg_assistant" },
        dialogId: "7",
        chat: { dialogId: "7", type: "private" },
        user: { id: "7" },
      },
    });
    expect((await post(app, join)).statusCode).toBe(200);
    expect(sent(rest.calls)?.params).toMatchObject({ botId: 41, dialogId: "7" });
    await app.close();
  });

  it("recusa portal fora da lista e client_endpoint forjado", async () => {
    const rest = fakeRest();
    const { app, store } = await testApp({}, { restClient: rest.client });
    await seedTenant(store);
    const foreign = eventBody({
      auth: {
        ...AUTH,
        domain: "outro.bitrix24.com",
        client_endpoint: "https://outro.bitrix24.com/rest/",
      },
    });
    const forged = eventBody({
      auth: { ...AUTH, client_endpoint: "https://atacante.exemplo/rest/" },
    });
    expect((await post(app, foreign)).statusCode).toBe(403);
    expect((await post(app, forged)).statusCode).toBe(403);
    expect(rest.calls).toHaveLength(0);
    await app.close();
  });

  it("confere o application_token gravado na empresa", async () => {
    const rest = fakeRest();
    const { app, store } = await testApp({}, { restClient: rest.client });
    await seedTenant(store);
    const forged = eventBody({ auth: { ...AUTH, application_token: "outro" } });
    expect((await post(app, forged)).statusCode).toBe(403);
    expect(rest.calls).toHaveLength(0);
    await app.close();
  });

  it("portal sem instalação concluída: memoriza o token e não responde", async () => {
    const rest = fakeRest();
    const { app } = await testApp({}, { restClient: rest.client });
    expect((await post(app, eventBody())).json()).toMatchObject({ ignored: true });
    expect(rest.calls).toHaveLength(0);
    const forged = eventBody({ auth: { ...AUTH, application_token: "outro" } });
    expect((await post(app, forged)).statusCode).toBe(403);
    await app.close();
  });

  it("ignora eventos de outros bots do aplicativo", async () => {
    const rest = fakeRest();
    const { app, store } = await testApp({}, { restClient: rest.client });
    await seedTenant(store);
    const other = eventBody({
      data: {
        bot: { id: "9", code: "outro" },
        message: { text: "oi", authorId: "7" },
        chat: { dialogId: "7" },
        user: { id: "7" },
      },
    });
    expect((await post(app, other)).json()).toMatchObject({ ignored: true });
    expect(rest.calls).toHaveLength(0);
    await app.close();
  });

  it("rejeita corpo inválido", async () => {
    const { app } = await testApp();
    expect((await post(app, "event=x")).statusCode).toBe(400);
    await app.close();
  });
});

describe("situação do bot para o frontend", () => {
  const signer = new SessionSigner(SESSION_SECRET);
  const bearer = (tenantId: string) => ({
    authorization: `Bearer ${signer.issue({ tenantId, userId: "7", name: "Lucas", admin: false })}`,
  });

  it("devolve o diálogo do bot localizado pelo código, sem ID fixo", async () => {
    const rest = fakeRest({
      "imbot.v2.Bot.list": (params: Record<string, unknown>) =>
        params.offset === 0
          ? { bots: [{ id: 91, code: "outro_bot" }], hasNextPage: true }
          : { bots: [{ id: 92, code: "projacseg_assistant" }], hasNextPage: false },
    });
    const { app, store } = await testApp({}, { restClient: rest.client });
    const tenant = await seedTenant(store);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assistant",
      headers: bearer(tenant.id),
    });
    expect(response.json()).toEqual({ status: "ready", dialogId: "92" });
    await app.close();
  });

  it("informa quando o bot não está registrado e exige sessão", async () => {
    const rest = fakeRest({ "imbot.v2.Bot.list": { bots: [], hasNextPage: false } });
    const { app, store } = await testApp({}, { restClient: rest.client });
    const tenant = await seedTenant(store);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assistant",
      headers: bearer(tenant.id),
    });
    expect(response.json()).toEqual({ status: "not-installed" });
    expect((await app.inject({ method: "GET", url: "/api/v1/assistant" })).statusCode).toBe(401);
    await app.close();
  });

  it("falha do portal vira 'indisponível'", async () => {
    const rest = fakeRest({ "imbot.v2.Bot.list": new Error("QUERY_LIMIT_EXCEEDED") });
    const { app, store } = await testApp({}, { restClient: rest.client });
    const tenant = await seedTenant(store);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assistant",
      headers: bearer(tenant.id),
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "unavailable" });
    await app.close();
  });
});
