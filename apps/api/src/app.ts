import formbody from "@fastify/formbody";
import { ruleFieldNames } from "@projacseg/engine";
import type { TermsDocument } from "@projacseg/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import qs from "qs";
import type { Env } from "./config/env";
import { AssistantBot, type Messenger } from "./integrations/bitrix24/bot-messenger";
import { readCompanyCalendar } from "./integrations/bitrix24/company-calendar";
import { CrmReader } from "./integrations/bitrix24/crm-reader";
import { PortalEventVerifier } from "./integrations/bitrix24/event-verifier";
import { HierarchyResolver } from "./integrations/bitrix24/hierarchy";
import {
  BITRIX24_PACING,
  Bitrix24Portal,
  HttpBitrix24OAuthClient,
  NO_PACING,
  type Bitrix24OAuthClient,
} from "./integrations/bitrix24/portal";
import {
  FetchBitrix24RestClient,
  type Bitrix24RestClient,
} from "./integrations/bitrix24/rest-client";
import { AnthropicProvider } from "./integrations/llm/anthropic-provider";
import type { LlmProvider } from "./integrations/llm/llm-provider";
import { AssistantActions } from "./modules/assistant/actions";
import { AssistantService } from "./modules/assistant/assistant.service";
import { assistantBotRoutes } from "./modules/assistant-bot/assistant-bot.routes";
import { BitrixAppService } from "./modules/bitrix-app/bitrix-app.service";
import { crmEventsRoutes } from "./modules/engine/crm-events.routes";
import { DigestService } from "./modules/engine/digest.service";
import { EngineService } from "./modules/engine/engine.service";
import { DedupNotifier } from "./modules/engine/notifier";
import type { DealSource, SuperiorResolver } from "./modules/engine/ports";
import { EngineScheduler } from "./modules/engine/scheduler";
import { healthRoutes } from "./modules/health/health.routes";
import { journeyRoutes } from "./modules/journey/journey.routes";
import { toMappingCatalog } from "./modules/setup/mapping";
import { setupRoutes } from "./modules/setup/setup.routes";
import { aiAllowed } from "./modules/setup/terms";
import { registerWebApp } from "./modules/web-app/web-app.routes";
import { SessionSigner } from "./security/session";
import { TokenCipher } from "./security/token-cipher";
import { createMemoryStore } from "./store/memory-store";
import { createPrismaStore } from "./store/prisma-store";
import type { Store } from "./store/types";

/** Dependências substituíveis (testes injetam versões falsas). */
export interface AppDeps {
  store?: Store;
  restClient?: Bitrix24RestClient;
  oauth?: Bitrix24OAuthClient | null;
  llm?: LlmProvider | null;
  dealSource?: DealSource;
  superiors?: SuperiorResolver;
  messenger?: Messenger;
  assistantBot?: AssistantBot;
  now?: () => Date;
  /** Termos vigentes (os testes injetam uma versão nova). */
  terms?: TermsDocument;
}

/**
 * Monta a aplicação sem abrir porta (testes usam `app.inject`):
 * - /health
 * - POST / e /install — abertura e instalação do aplicativo Bitrix24
 * - /api/v1/journey — dashboard do colaborador
 * - /bitrix24/events/crm e /bitrix24/events/assistant — eventos do portal
 * - motor de regras em segundo plano (prazos, alertas, escalonamento, resumo diário)
 */
export async function buildApp(env: Env, deps: AppDeps = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : { level: env.LOG_LEVEL },
    trustProxy: true,
  });

  // O Bitrix24 envia formulários com chaves aninhadas (auth[access_token], data[BOT][41][...]).
  // parseArrays: false — IDs numéricos pequenos (data[BOT][9]) não podem virar arrays.
  await app.register(formbody, {
    parser: (body) => qs.parse(body, { depth: 6, parseArrays: false }),
  });

  const store =
    deps.store ?? (env.DATABASE_URL ? createPrismaStore(env.DATABASE_URL) : createMemoryStore());
  if (!deps.store && !env.DATABASE_URL && env.NODE_ENV !== "test") {
    app.log.warn("Sem DATABASE_URL: dados em memória (perdidos ao reiniciar). Use só para testes.");
  }
  const cipher = new TokenCipher(env.TOKEN_ENCRYPTION_KEY ?? TokenCipher.generateKey());
  const signer = new SessionSigner(env.SESSION_SECRET ?? randomBytes(32).toString("hex"));
  const now = deps.now ?? (() => new Date());

  const rest = deps.restClient ?? new FetchBitrix24RestClient();
  const oauth =
    deps.oauth !== undefined
      ? deps.oauth
      : env.BITRIX24_CLIENT_ID && env.BITRIX24_CLIENT_SECRET
        ? new HttpBitrix24OAuthClient(env.BITRIX24_CLIENT_ID, env.BITRIX24_CLIENT_SECRET)
        : null;
  // Respeita o limite de chamadas do Bitrix24 (ritmo + nova tentativa); nos testes, sem esperas.
  const portal = new Bitrix24Portal(
    store,
    cipher,
    rest,
    oauth,
    now,
    env.NODE_ENV === "test" ? NO_PACING : BITRIX24_PACING,
  );
  const crm = new CrmReader(portal);
  const hierarchy = new HierarchyResolver(portal);
  const assistantBot =
    deps.assistantBot ?? new AssistantBot(portal, env.BITRIX24_ASSISTANT_BOT_CODE);
  const messenger = deps.messenger ?? assistantBot;
  const notifier = new DedupNotifier(store, messenger, app.log);

  // Lê do CRM só os campos que as regras da empresa usam.
  const fieldsFor = async (tenant: { id: string }) =>
    ruleFieldNames(await store.rules.list(tenant.id));
  const source: DealSource = deps.dealSource ?? {
    listOpenDeals: async (tenant) => {
      const fields = await fieldsFor(tenant);
      return Promise.all(
        (await crm.listOpenDeals(tenant, fields)).map((raw) => crm.toSnapshot(tenant, raw, fields)),
      );
    },
    getDeal: async (tenant, dealId) => {
      const fields = await fieldsFor(tenant);
      const raw = await crm.getDeal(tenant, dealId, fields);
      return raw ? crm.toSnapshot(tenant, raw, fields) : null;
    },
  };

  const engine = new EngineService({
    store,
    source,
    superiors: deps.superiors ?? hierarchy,
    notifier,
    log: app.log,
    now,
  });
  const digest = new DigestService(store, notifier, now);
  const scheduler = new EngineScheduler(store, engine, digest, app.log, {
    tickMs: env.ENGINE_TICK_SECONDS * 1000,
    fullSyncMs: env.ENGINE_FULL_SYNC_MINUTES * 60_000,
  });

  const llm =
    deps.llm !== undefined
      ? deps.llm
      : env.AI_PROVIDER === "anthropic"
        ? new AnthropicProvider(env.AI_MODEL, env.ANTHROPIC_API_KEY)
        : null;
  // Ações do assistente no CRM (mover etapa, preencher campo): só com confirmação do colaborador.
  const actions = new AssistantActions({
    store,
    call: (tenant, method, params) => portal.call(tenant, method, params),
    catalog: (tenant) => crm.catalog(tenant),
    onChanged: (tenant, dealId) => engine.syncDeal(tenant, dealId),
    log: app.log,
    now,
  });
  const assistant = new AssistantService(
    store,
    llm,
    env.AI_REDACT_CLIENT_NAMES,
    now,
    actions,
    (tenant) => aiAllowed(store, tenant, deps.terms),
  );
  const verifier = new PortalEventVerifier(
    store,
    env.BITRIX24_ALLOWED_DOMAINS,
    env.BITRIX24_APPLICATION_TOKEN,
  );

  const bitrixApp = new BitrixAppService({
    store,
    rest,
    portal,
    crm,
    signer,
    allowedDomains: env.BITRIX24_ALLOWED_DOMAINS,
    clientId: env.BITRIX24_CLIENT_ID,
    tenantsDir: env.TENANTS_DIR,
    assistantBot,
    log: app.log,
    onInstalled: (tenant) => {
      hierarchy.invalidate(tenant.id);
      scheduler.requestFullSync(tenant.id);
      void scheduler.runOnce();
    },
  });

  await app.register(healthRoutes, {
    bitrix24Configured: env.BITRIX24_ALLOWED_DOMAINS.length > 0,
    database: env.DATABASE_URL ? "postgresql" : "memory",
    ai: llm ? llm.name : "none",
  });
  await app.register(journeyRoutes, { store, signer, now });
  await app.register(setupRoutes, {
    store,
    signer,
    now,
    ...(deps.terms ? { terms: deps.terms } : {}),
    catalog: async (tenant) => toMappingCatalog(await crm.catalog(tenant, true)),
    readCalendar: (tenant) => readCompanyCalendar(portal, tenant, now()),
    onMappingSaved: (tenant) => {
      void crm.catalog(tenant, true).catch((error: unknown) => {
        app.log.warn({ err: error }, "Catálogo do CRM não recarregado após o mapeamento.");
      });
      scheduler.requestFullSync(tenant.id);
    },
  });
  await app.register(crmEventsRoutes, { verifier, engine });
  await app.register(assistantBotRoutes, { verifier, bot: assistantBot, assistant, store, signer });
  await registerWebApp(app, {
    distDir: env.WEB_DIST_DIR,
    allowedDomains: env.BITRIX24_ALLOWED_DOMAINS,
    bitrixApp,
  });

  if (env.ENGINE_ENABLED && env.NODE_ENV !== "test") {
    app.addHook("onReady", async () => scheduler.start());
  }
  app.addHook("onClose", async () => {
    scheduler.stop();
    await store.close();
  });

  return app;
}
