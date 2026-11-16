import {
  DEFAULT_THEME_BASE,
  LocalStorageThemeRepository,
  applyThemeTokens,
  buildTheme,
  getBrowserStorage,
  normalizeHex,
  type StyleTarget,
  type ThemePalette,
  type ThemePreferenceRepository,
  type ThemeScope,
} from "@projacseg/theme";
import { create } from "zustand";

export interface ThemeState {
  /** Colaborador dono da preferência. `null` até a sessão ser identificada. */
  scope: ThemeScope | null;
  baseColor: string;
  palette: ThemePalette;
  /** Carrega e aplica a preferência do colaborador (chamado ao identificar a sessão). */
  initialize: (scope: ThemeScope) => void;
  /** Aplica e persiste. Retorna `false` se a cor for inválida. */
  setTheme: (color: string) => boolean;
  /** Restaura o tema institucional e apaga a preferência salva do colaborador. */
  resetTheme: () => void;
}

interface ThemeStoreDeps {
  repository: ThemePreferenceRepository;
  target: () => StyleTarget | undefined;
}

export function createThemeStore({ repository, target }: ThemeStoreDeps) {
  const apply = (color: string) => {
    const theme = buildTheme(color);
    const element = target();
    if (element) applyThemeTokens(element, theme.tokens);
    return { baseColor: theme.base, palette: theme.palette };
  };

  return create<ThemeState>()((set, get) => ({
    scope: null,
    ...apply(DEFAULT_THEME_BASE),
    initialize: (scope) => {
      set({ scope, ...apply(repository.load(scope) ?? DEFAULT_THEME_BASE) });
    },
    setTheme: (color) => {
      const normalized = normalizeHex(color);
      if (!normalized) return false;
      const next = apply(normalized);
      const { scope } = get();
      if (scope) repository.save(scope, next.baseColor);
      set(next);
      return true;
    },
    resetTheme: () => {
      const { scope } = get();
      if (scope) repository.clear(scope);
      set(apply(DEFAULT_THEME_BASE));
    },
  }));
}

/** Store global do tema do colaborador logado. */
export const useThemeStore = createThemeStore({
  repository: new LocalStorageThemeRepository(getBrowserStorage()),
  target: () => (typeof document !== "undefined" ? document.documentElement : undefined),
});
