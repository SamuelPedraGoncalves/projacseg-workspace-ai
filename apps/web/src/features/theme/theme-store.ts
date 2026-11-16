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
import { getCurrentUser } from "../../config/session";

export interface ThemeState {
  baseColor: string;
  palette: ThemePalette;
  /** Aplica e persiste. Retorna `false` se a cor for inválida. */
  setTheme: (color: string) => boolean;
  /** Restaura o tema institucional e apaga a preferência salva do colaborador. */
  resetTheme: () => void;
}

interface ThemeStoreDeps {
  repository: ThemePreferenceRepository;
  scope: ThemeScope;
  target: () => StyleTarget | undefined;
}

export function createThemeStore({ repository, scope, target }: ThemeStoreDeps) {
  const apply = (color: string) => {
    const theme = buildTheme(color);
    const element = target();
    if (element) applyThemeTokens(element, theme.tokens);
    return theme;
  };

  const initial = apply(repository.load(scope) ?? DEFAULT_THEME_BASE);

  return create<ThemeState>()((set) => ({
    baseColor: initial.base,
    palette: initial.palette,
    setTheme: (color) => {
      const normalized = normalizeHex(color);
      if (!normalized) return false;
      const theme = apply(normalized);
      repository.save(scope, theme.base);
      set({ baseColor: theme.base, palette: theme.palette });
      return true;
    },
    resetTheme: () => {
      const theme = apply(DEFAULT_THEME_BASE);
      repository.clear(scope);
      set({ baseColor: theme.base, palette: theme.palette });
    },
  }));
}

const user = getCurrentUser();

/** Store global do tema do colaborador logado. */
export const useThemeStore = createThemeStore({
  repository: new LocalStorageThemeRepository(getBrowserStorage()),
  scope: { tenantId: user.tenantId, bitrixUserId: user.bitrixUserId },
  target: () => (typeof document !== "undefined" ? document.documentElement : undefined),
});
