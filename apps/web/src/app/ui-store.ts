import { create } from "zustand";

/** Estado de interface que atravessa componentes: diálogos abertos e menu móvel. */
interface UiState {
  themeOpen: boolean;
  assistantOpen: boolean;
  selectedDealId: string | null;
  setThemeOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  openDeal: (dealId: string) => void;
  closeDeal: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  themeOpen: false,
  assistantOpen: false,
  selectedDealId: null,
  setThemeOpen: (themeOpen) => set({ themeOpen }),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  openDeal: (selectedDealId) => set({ selectedDealId }),
  closeDeal: () => set({ selectedDealId: null }),
}));
