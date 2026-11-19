import { vi } from "vitest";
import { DemoJourneyRepository } from "../features/deals/deals-repository";
import type { Platform } from "../platform/platform";

export interface ApiCall {
  method: string;
  url: string;
  body: unknown;
}

type Handler = (body: unknown) => { status?: number; body: unknown };

/**
 * API falsa por `fetch`: mapa "MÉTODO /caminho" → resposta. Registra as chamadas. Caminho sem
 * handler responde 404.
 */
export function fakeApi(handlers: Record<string, Handler>) {
  const calls: ApiCall[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
    calls.push({ method, url, body });
    const handler = handlers[`${method} ${url}`];
    const result = handler ? handler(body) : { status: 404, body: { error: "Não encontrado" } };
    return new Response(JSON.stringify(result.body), {
      status: result.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  return calls;
}

/** Plataforma "dentro do Bitrix24" com sessão, para as telas que falam com a API. */
export function sessionPlatform(overrides: Partial<Platform> = {}): Platform {
  return {
    mode: "bitrix24",
    user: {
      tenantId: "corretora.bitrix24.com.br",
      bitrixUserId: "1",
      name: "Samuel",
      initials: "SP",
    },
    session: "sessao-de-teste",
    pickUsers: vi.fn(async () => []),
    openDealInCrm: vi.fn(),
    openAssistant: vi.fn(async () => "opened" as const),
    openCompanyStructure: vi.fn(),
    installer: { assistantStatus: vi.fn(async () => "ready" as const), finish: vi.fn() },
    journey: new DemoJourneyRepository(),
    ...overrides,
  };
}
