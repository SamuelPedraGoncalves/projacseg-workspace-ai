import { useUiStore } from "../app/ui-store";
import { usePlatform } from "./platform-context";

/**
 * Ações que mudam conforme o ambiente:
 * - Abrir negócio: no Bitrix24 abre o card do CRM; na demonstração, o diálogo de detalhes.
 * - Assistente: no Bitrix24 abre o chat do bot no messenger; na demonstração, o chat demonstrativo.
 */
export function useWorkspaceActions() {
  const platform = usePlatform();
  const openDealDialog = useUiStore((state) => state.openDeal);
  const showAssistantFallback = useUiStore((state) => state.showAssistantFallback);

  return {
    openDeal: (dealId: string) => {
      if (platform.openDealInCrm) platform.openDealInCrm(dealId);
      else openDealDialog(dealId);
    },
    openAssistant: async () => {
      const result = await platform.openAssistant();
      if (result !== "opened") showAssistantFallback(result);
    },
  };
}
