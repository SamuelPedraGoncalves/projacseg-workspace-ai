import formbody from "@fastify/formbody";
import Fastify, { type FastifyInstance } from "fastify";
import qs from "qs";
import type { Env } from "./config/env";
import {
  FetchBitrix24RestClient,
  type Bitrix24RestClient,
} from "./integrations/bitrix24/rest-client";
import { assistantBotRoutes } from "./modules/assistant-bot/assistant-bot.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { registerWebApp } from "./modules/web-app/web-app.routes";

export interface AppDeps {
  restClient?: Bitrix24RestClient;
}

/**
 * Monta a aplicação sem abrir porta (facilita testes com `app.inject`).
 * - /health
 * - /bitrix24/events/assistant — eventos do bot do assistente
 * - frontend (aplicativo Bitrix24), aceitando GET e POST
 */
export async function buildApp(env: Env, deps: AppDeps = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : { level: env.LOG_LEVEL },
    // Atrás de túnel/proxy HTTPS (necessário para o Bitrix24 alcançar o servidor).
    trustProxy: true,
  });

  // O Bitrix24 envia formulários com chaves aninhadas (auth[access_token], data[BOT][41][...]).
  // parseArrays: false — IDs numéricos pequenos (data[BOT][9]) não podem virar arrays.
  await app.register(formbody, {
    parser: (body) => qs.parse(body, { depth: 6, parseArrays: false }),
  });

  await app.register(healthRoutes, {
    bitrix24Configured: env.BITRIX24_ALLOWED_DOMAINS.length > 0,
  });
  await app.register(assistantBotRoutes, {
    allowedDomains: env.BITRIX24_ALLOWED_DOMAINS,
    applicationToken: env.BITRIX24_APPLICATION_TOKEN,
    botCode: env.BITRIX24_ASSISTANT_BOT_CODE,
    restClient: deps.restClient ?? new FetchBitrix24RestClient(),
  });
  await registerWebApp(app, {
    distDir: env.WEB_DIST_DIR,
    allowedDomains: env.BITRIX24_ALLOWED_DOMAINS,
  });

  return app;
}
