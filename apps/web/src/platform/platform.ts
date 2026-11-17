import type { UserContext } from "@projacseg/shared";
import { getDemoUser } from "../config/session";
import { fetchAssistantStatus, type AssistantStatus } from "../features/assistant/assistant-api";
import {
  ApiJourneyRepository,
  DemoJourneyRepository,
  type JourneyRepository,
} from "../features/deals/deals-repository";
import { Bitrix24Host } from "../integrations/bitrix24/host";
import { loadBitrix24Sdk } from "../integrations/bitrix24/sdk";

/**
 * Ambiente em que a aplicação está rodando.
 * - `bitrix24`: aberta dentro de um portal Bitrix24 (app em iframe, com a BX24 JS SDK).
 * - `demo`: fora do Bitrix24 (desenvolvimento, homologação visual, testes).
 */
export type PlatformMode = "demo" | "bitrix24";

/**
 * Resultado de "abrir o assistente":
 * - `opened`: o chat do assistente foi aberto no messenger do Bitrix24;
 * - `not-installed`: dentro do Bitrix24, mas o bot do assistente não está registrado no portal;
 * - `unavailable`: dentro do Bitrix24, mas a consulta ao portal falhou (rede, permissão, erro da API);
 * - `demo`: fora do Bitrix24 — a interface mostra o chat demonstrativo.
 */
export type AssistantOpenResult = "opened" | "not-installed" | "unavailable" | "demo";

export interface Platform {
  mode: PlatformMode;
  user: UserContext;
  /** Abre o card do negócio no CRM. `null` quando não há CRM conectado. */
  openDealInCrm: ((dealId: string) => void) | null;
  openAssistant(): Promise<AssistantOpenResult>;
  /** Instalação do aplicativo no portal. `null` fora do Bitrix24. */
  installer: AppInstaller | null;
  /** De onde vêm negócios e indicadores: demonstração ou API (motor de regras + CRM). */
  journey: JourneyRepository;
}

export interface AppInstaller {
  /**
   * Situação do bot do assistente depois da instalação no servidor (o backend registra o bot com
   * `imbot.v2` ao instalar).
   */
  assistantStatus(): Promise<AssistantStatus["status"]>;
  finish(): void;
}

export function createDemoPlatform(user: UserContext = getDemoUser()): Platform {
  return {
    mode: "demo",
    user,
    openDealInCrm: null,
    openAssistant: async () => "demo",
    installer: null,
    journey: new DemoJourneyRepository(),
  };
}

/** Sessão assinada que o backend injeta no HTML ao abrir o app pelo Bitrix24. */
export function readWorkspaceSession(doc: Document = document): string | null {
  return doc.querySelector<HTMLMetaElement>('meta[name="workspace-session"]')?.content || null;
}

export function createBitrix24Platform(
  host: Bitrix24Host,
  user: UserContext,
  session: string | null,
): Platform {
  return {
    mode: "bitrix24",
    user,
    openDealInCrm: (dealId) => host.openDeal(dealId),
    openAssistant: async () => {
      // Sem sessão o portal ainda não foi instalado no servidor: não há bot para abrir.
      if (!session) return "not-installed";
      const assistant = await fetchAssistantStatus(session);
      if (assistant.status !== "ready") return assistant.status;
      try {
        host.openMessenger(assistant.dialogId);
        return "opened";
      } catch (error) {
        console.warn("Não foi possível abrir o chat do assistente no Bitrix24.", error);
        return "unavailable";
      }
    },
    installer: {
      assistantStatus: async () =>
        session ? (await fetchAssistantStatus(session)).status : "not-installed",
      finish: () => host.finishInstall(),
    },
    // Sem sessão (portal ainda não instalado no backend), mostra a demonstração.
    journey: session ? new ApiJourneyRepository(session) : new DemoJourneyRepository(),
  };
}

/** Detecta o ambiente. Dentro do Bitrix24 carrega a SDK e o usuário logado (com foto). */
export async function bootstrapPlatform(): Promise<Platform> {
  const sdk = await loadBitrix24Sdk();
  if (!sdk) return createDemoPlatform();

  const host = new Bitrix24Host(sdk);
  try {
    return createBitrix24Platform(host, await host.getCurrentUser(), readWorkspaceSession());
  } catch (error) {
    console.warn("Falha ao identificar o usuário no Bitrix24; usando modo demonstrativo.", error);
    return createDemoPlatform();
  }
}
