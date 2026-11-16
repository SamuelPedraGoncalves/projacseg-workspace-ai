import type { Deal } from "@projacseg/shared";
import { useUiStore } from "../app/ui-store";
import type { Platform } from "./platform";
import { usePlatform } from "./platform-context";

/** Só negócios lidos do CRM podem abrir o card no Bitrix24; fictícios não existem no portal. */
export function canOpenInCrm(platform: Platform, deal: Pick<Deal, "origin">): boolean {
  return platform.openDealInCrm !== null && deal.origin === "crm";
}

/**
 * Ações que mudam conforme o ambiente:
 * - Abrir negócio: no Bitrix24 (negócio real) abre o card do CRM; senão, o diálogo de detalhes.
 * - Assistente: no Bitrix24 abre o chat do bot no messenger; na demonstração, o chat demonstrativo.
 */
export function useWorkspaceActions() {
  const platform = usePlatform();
  const openDealDialog = useUiStore((state) => state.openDeal);
  const showAssistantFallback = useUiStore((state) => state.showAssistantFallback);

  return {
    openDeal: (deal: Pick<Deal, "id" | "origin">) => {
      if (canOpenInCrm(platform, deal)) platform.openDealInCrm?.(deal.id);
      else openDealDialog(deal.id);
    },
    openAssistant: async () => {
      const result = await platform.openAssistant();
      if (result !== "opened") showAssistantFallback(result);
    },
  };
}
