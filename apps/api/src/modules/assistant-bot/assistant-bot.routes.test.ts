import qs from "qs";
import { describe, expect, it, vi } from "vitest";
import type { LlmProvider } from "../../integrations/llm/llm-provider";
import { DOMAIN, fakeRest, seedTenant, snapshot, testApp } from "../../test/helpers";
import { ASSISTANT_MESSAGES } from "../assistant/assistant.service";

function eventBody(overrides: Record<string, unknown> = {}) {
  return qs.stringify({
    event: "ONIMBOTMESSAGEADD",
    data: {
      BOT: { "41": { BOT_ID: "41", BOT_CODE: "projacseg_assistant" } },
      PARAMS: { DIALOG_ID: "7", MESSAGE: "o que faço primeiro?", FROM_USER_ID: "7" },
      USER: { NAME: "Lucas" },
    },
    auth: {
      access_token: "token-do-evento",
      domain: DOMAIN,
      client_endpoint: `https://${DOMAIN}/rest/`,
      member_id: "membro-1",
      application_token: "app-token-1",
    },
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

const sentMessage = (calls: ReturnType<typeof fakeRest>["calls"]) =>
  calls.find((call) => call.method === "imbot.message.add")?.params.MESSAGE;

describe("bot do assistente", () => {
  it("sem IA configurada, responde com aviso honesto", async () => {
    const rest = fakeRest();
    const { app } = await testApp({}, { restClient: rest.client });
    expect((await post(app, eventBody())).statusCode).toBe(200);
    expect(rest.calls[0]).toMatchObject({
      endpoint: `https://${DOMAIN}/rest/`,
      method: "imbot.message.add",
      params: { BOT_ID: "41", DIALOG_ID: "7", MESSAGE: ASSISTANT_MESSAGES.notConnected },
      token: "token-do-evento",
    });
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
    await store.deals.upsert(tenant.id, snapshot());

    await post(app, eventBody());
    const input = answer.mock.calls[0]![0];
    expect(input.question).toBe("o que faço primeiro?");
    expect(input.context).toContain("Negócio #501");
    expect(input.context).not.toContain("Carlos Almeida");
    expect(input.system).toMatch(/não pode cancelar, adiar/);
    expect(sentMessage(rest.calls)).toBe("Comece pelo Negócio #501 (Carlos Almeida - Auto).");
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
    expect(sentMessage(rest.calls)).toBe(ASSISTANT_MESSAGES.notConnected);
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
    await seedTenant(store);
    await post(app, eventBody());
    expect(sentMessage(rest.calls)).toBe(ASSISTANT_MESSAGES.failure);
    await app.close();
  });

  it("recusa portal fora da lista e client_endpoint forjado", async () => {
    const rest = fakeRest();
    const { app } = await testApp({}, { restClient: rest.client });
    const foreign = eventBody({
      auth: {
        access_token: "x",
        domain: "outro.bitrix24.com",
        client_endpoint: "https://outro.bitrix24.com/rest/",
        member_id: "m",
        application_token: "t",
      },
    });
    const forged = eventBody({
      auth: {
        access_token: "x",
        domain: DOMAIN,
        client_endpoint: "https://atacante.exemplo/rest/",
        member_id: "membro-1",
        application_token: "app-token-1",
      },
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
    const forged = eventBody({
      auth: {
        access_token: "x",
        domain: DOMAIN,
        client_endpoint: `https://${DOMAIN}/rest/`,
        member_id: "membro-1",
        application_token: "outro",
      },
    });
    expect((await post(app, forged)).statusCode).toBe(403);
    await app.close();
  });

  it("memoriza o primeiro application_token de um portal sem cadastro", async () => {
    const { app } = await testApp({}, { restClient: fakeRest().client });
    expect((await post(app, eventBody())).statusCode).toBe(200);
    const forged = eventBody({
      auth: {
        access_token: "x",
        domain: DOMAIN,
        client_endpoint: `https://${DOMAIN}/rest/`,
        member_id: "membro-1",
        application_token: "outro",
      },
    });
    expect((await post(app, forged)).statusCode).toBe(403);
    await app.close();
  });

  it("ignora outros bots e IDs pequenos não viram arrays", async () => {
    const rest = fakeRest();
    const { app } = await testApp({}, { restClient: rest.client });
    const other = eventBody({
      data: { BOT: { "9": { BOT_ID: "9", BOT_CODE: "outro" } }, PARAMS: { DIALOG_ID: "7" } },
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
