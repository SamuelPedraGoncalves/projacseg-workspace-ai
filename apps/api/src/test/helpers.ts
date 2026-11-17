import type { RuleDefinition } from "@projacseg/engine";
import { vi } from "vitest";
import { buildApp, type AppDeps } from "../app";
import { loadEnv } from "../config/env";
import type { Bitrix24Response, Bitrix24RestClient } from "../integrations/bitrix24/rest-client";
import { DEFAULT_TENANT_CONFIG } from "../modules/tenants/tenant-config";
import { TokenCipher } from "../security/token-cipher";
import { createMemoryStore } from "../store/memory-store";
import type { DealSnapshotRecord, Store, TenantRecord } from "../store/types";

export const DOMAIN = "projacseg-teste.bitrix24.com.br";
export const ENCRYPTION_KEY = TokenCipher.generateKey();
export const SESSION_SECRET = "segredo-de-sessao-para-testes-0123456789";

export const at = (iso: string) => new Date(iso);

/** Regra de exemplo — NÃO é uma regra homologada. */
export const RULE: RuleDefinition = {
  code: "enviar_cotacao",
  name: "Enviar cotação",
  enabled: true,
  homologated: false,
  mode: "active",
  categoryIds: null,
  stageIds: ["PREPARATION"],
  action: "Enviar cotação",
  kind: "action",
  deadline: { amount: 1, unit: "business_days" },
  riskAtRatio: 0.75,
  escalation: { maxLevels: 2, interval: { amount: 1, unit: "business_days" } },
};

export function snapshot(overrides: Partial<DealSnapshotRecord> = {}): DealSnapshotRecord {
  return {
    dealId: "501",
    title: "Carlos Almeida - Auto",
    categoryId: "0",
    categoryName: "Automóvel",
    stageId: "PREPARATION",
    stageName: "Elaborando cotação",
    stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
    assignedById: "7",
    responsibleName: "Lucas Carvalho",
    closed: false,
    ...overrides,
  };
}

export async function seedTenant(store: Store, overrides: Partial<TenantRecord> = {}) {
  const cipher = new TokenCipher(ENCRYPTION_KEY);
  return store.tenants.upsert({
    domain: DOMAIN,
    memberId: "membro-1",
    clientEndpoint: `https://${DOMAIN}/rest/`,
    applicationToken: "app-token-1",
    accessTokenEnc: cipher.encrypt("access-1"),
    refreshTokenEnc: cipher.encrypt("refresh-1"),
    tokenExpiresAt: at("2030-01-01T00:00:00Z"),
    config: { ...DEFAULT_TENANT_CONFIG, aiEnabled: true },
    ...overrides,
  });
}

type Handler = (params: Record<string, unknown>, token: string, endpoint: string) => unknown;

/** REST do Bitrix24 falsa: mapa método → resposta (ou função). Registra as chamadas. */
export function fakeRest(handlers: Record<string, Handler | unknown> = {}) {
  const calls: {
    endpoint: string;
    method: string;
    params: Record<string, unknown>;
    token: string;
  }[] = [];
  const client: Bitrix24RestClient = {
    call: async <T>(
      endpoint: string,
      method: string,
      params: Record<string, unknown>,
      token: string,
    ) => {
      calls.push({ endpoint, method, params, token });
      const handler = handlers[method];
      const result =
        typeof handler === "function" ? (handler as Handler)(params, token, endpoint) : handler;
      if (result instanceof Error) throw result;
      return { result: result ?? true } as Bitrix24Response<T>;
    },
  };
  return { client, calls };
}

export async function testApp(env: Record<string, string> = {}, deps: AppDeps = {}) {
  const store = deps.store ?? createMemoryStore();
  const app = await buildApp(
    loadEnv({
      NODE_ENV: "test",
      WEB_DIST_DIR: "/nao-existe",
      TENANTS_DIR: "/nao-existe",
      BITRIX24_ALLOWED_DOMAINS: DOMAIN,
      TOKEN_ENCRYPTION_KEY: ENCRYPTION_KEY,
      SESSION_SECRET,
      ...env,
    }),
    {
      oauth: null,
      llm: null,
      messenger: { sendToUser: vi.fn(async () => undefined) },
      ...deps,
      store,
    },
  );
  return { app, store };
}
