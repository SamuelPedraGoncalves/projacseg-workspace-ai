import type { UserContext } from "@projacseg/shared";
import { getDemoUser } from "../config/session";
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
 * - `demo`: fora do Bitrix24 — a interface mostra o chat demonstrativo.
 */
export type AssistantOpenResult = "opened" | "not-installed" | "demo";

export interface Platform {
  mode: PlatformMode;
  user: UserContext;
  /** Abre o card do negócio no CRM. `null` quando não há CRM conectado. */
  openDealInCrm: ((dealId: string) => void) | null;
  openAssistant(): Promise<AssistantOpenResult>;
}

/** Código do bot do assistente (identificador da própria aplicação, não um ID do Bitrix24). */
export const ASSISTANT_BOT_CODE =
  import.meta.env.VITE_BITRIX24_ASSISTANT_BOT_CODE || "projacseg_assistant";

export function createDemoPlatform(user: UserContext = getDemoUser()): Platform {
  return {
    mode: "demo",
    user,
    openDealInCrm: null,
    openAssistant: async () => "demo",
  };
}

export function createBitrix24Platform(host: Bitrix24Host, user: UserContext): Platform {
  return {
    mode: "bitrix24",
    user,
    openDealInCrm: (dealId) => host.openDeal(dealId),
    openAssistant: async () => {
      try {
        return (await host.openAssistantChat(ASSISTANT_BOT_CODE)) ? "opened" : "not-installed";
      } catch (error) {
        console.warn("Não foi possível abrir o chat do assistente no Bitrix24.", error);
        return "not-installed";
      }
    },
  };
}

/** Detecta o ambiente. Dentro do Bitrix24 carrega a SDK e o usuário logado (com foto). */
export async function bootstrapPlatform(): Promise<Platform> {
  const sdk = await loadBitrix24Sdk();
  if (!sdk) return createDemoPlatform();

  const host = new Bitrix24Host(sdk);
  try {
    return createBitrix24Platform(host, await host.getCurrentUser());
  } catch (error) {
    console.warn("Falha ao identificar o usuário no Bitrix24; usando modo demonstrativo.", error);
    return createDemoPlatform();
  }
}
