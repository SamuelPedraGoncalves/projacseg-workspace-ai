import { create } from "zustand";

/** O que o diálogo do assistente mostra quando o chat do Bitrix24 não pôde ser aberto. */
export type AssistantFallback = "demo" | "not-installed" | "unavailable";

/** Estado de interface que atravessa componentes: diálogos abertos. */
interface UiState {
  themeOpen: boolean;
  assistantOpen: boolean;
  assistantFallback: AssistantFallback;
  selectedDealId: string | null;
  setThemeOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  showAssistantFallback: (fallback: AssistantFallback) => void;
  openDeal: (dealId: string) => void;
  closeDeal: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  themeOpen: false,
  assistantOpen: false,
  assistantFallback: "demo",
  selectedDealId: null,
  setThemeOpen: (themeOpen) => set({ themeOpen }),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  showAssistantFallback: (assistantFallback) => set({ assistantFallback, assistantOpen: true }),
  openDeal: (selectedDealId) => set({ selectedDealId }),
  closeDeal: () => set({ selectedDealId: null }),
}));
