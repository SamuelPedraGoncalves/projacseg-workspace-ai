import qs from "qs";
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app";
import { loadEnv } from "../../config/env";
import type { Bitrix24RestClient } from "../../integrations/bitrix24/rest-client";
import { BOT_MESSAGES } from "./assistant-bot.routes";

const DOMAIN = "projacseg-teste.bitrix24.com.br";

function setup(env: Record<string, string> = {}) {
  const restClient: Bitrix24RestClient = { call: vi.fn(async () => 1) };
  const appPromise = buildApp(
    loadEnv({
      NODE_ENV: "test",
      WEB_DIST_DIR: "/nao-existe",
      BITRIX24_ALLOWED_DOMAINS: DOMAIN,
      ...env,
    }),
    { restClient },
  );
  return { appPromise, restClient };
}

function eventBody(overrides: Record<string, unknown> = {}) {
  return qs.stringify({
    event: "ONIMBOTMESSAGEADD",
    data: {
      BOT: { "41": { BOT_ID: "41", BOT_CODE: "projacseg_assistant" } },
      PARAMS: { DIALOG_ID: "7", MESSAGE: "oi" },
    },
    auth: {
      access_token: "token-de-teste",
      domain: DOMAIN,
      client_endpoint: `https://${DOMAIN}/rest/`,
      member_id: "membro-1",
      application_token: "app-token-1",
    },
    ...overrides,
  });
}

async function post(app: Awaited<ReturnType<typeof setup>["appPromise"]>, body: string) {
  return app.inject({
    method: "POST",
    url: "/bitrix24/events/assistant",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: body,
  });
}

describe("eventos do bot do assistente", () => {
  it("responde no chat do Bitrix24 com mensagem honesta (sem IA)", async () => {
    const { appPromise, restClient } = setup();
    const app = await appPromise;
    const response = await post(app, eventBody());

    expect(response.statusCode).toBe(200);
    expect(restClient.call).toHaveBeenCalledWith(
      `https://${DOMAIN}/rest/`,
      "imbot.message.add",
      { BOT_ID: "41", DIALOG_ID: "7", MESSAGE: BOT_MESSAGES.reply },
      "token-de-teste",
    );
    await app.close();
  });

  it("envia boas-vindas quando o bot entra no chat", async () => {
    const { appPromise, restClient } = setup();
    const app = await appPromise;
    await post(app, eventBody({ event: "ONIMBOTJOINCHAT" }));
    expect(vi.mocked(restClient.call).mock.calls[0]?.[2]).toMatchObject({
      MESSAGE: BOT_MESSAGES.welcome,
    });
    await app.close();
  });

  it("recusa portal fora da lista autorizada", async () => {
    const { appPromise, restClient } = setup();
    const app = await appPromise;
    const body = eventBody({
      auth: {
        access_token: "x",
        domain: "outro.bitrix24.com",
        client_endpoint: "https://outro.bitrix24.com/rest/",
        member_id: "m",
        application_token: "t",
      },
    });
    expect((await post(app, body)).statusCode).toBe(403);
    expect(restClient.call).not.toHaveBeenCalled();
    await app.close();
  });

  it("não chama endereços diferentes do portal (client_endpoint forjado)", async () => {
    const { appPromise, restClient } = setup();
    const app = await appPromise;
    const body = eventBody({
      auth: {
        access_token: "x",
        domain: DOMAIN,
        client_endpoint: "https://atacante.exemplo/rest/",
        member_id: "membro-1",
        application_token: "app-token-1",
      },
    });
    expect((await post(app, body)).statusCode).toBe(403);
    expect(restClient.call).not.toHaveBeenCalled();
    await app.close();
  });

  it("memoriza o application_token e recusa um diferente depois", async () => {
    const { appPromise } = setup();
    const app = await appPromise;
    expect((await post(app, eventBody())).statusCode).toBe(200);
    const forged = eventBody({
      auth: {
        access_token: "x",
        domain: DOMAIN,
        client_endpoint: `https://${DOMAIN}/rest/`,
        member_id: "membro-1",
        application_token: "outro-token",
      },
    });
    expect((await post(app, forged)).statusCode).toBe(403);
    await app.close();
  });

  it("respeita o application_token fixado por variável", async () => {
    const { appPromise } = setup({ BITRIX24_APPLICATION_TOKEN: "fixo" });
    const app = await appPromise;
    expect((await post(app, eventBody())).statusCode).toBe(403);
    await app.close();
  });

  it("ignora eventos de outros bots", async () => {
    const { appPromise, restClient } = setup();
    const app = await appPromise;
    const body = eventBody({
      data: { BOT: { "9": { BOT_ID: "9", BOT_CODE: "outro" } }, PARAMS: { DIALOG_ID: "7" } },
    });
    expect((await post(app, body)).json()).toMatchObject({ ignored: true });
    expect(restClient.call).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejeita corpo inválido", async () => {
    const { appPromise } = setup();
    const app = await appPromise;
    expect((await post(app, "event=x")).statusCode).toBe(400);
    await app.close();
  });
});
