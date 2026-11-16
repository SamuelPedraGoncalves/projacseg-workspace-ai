import { mixColors } from "./color";
import { generatePalette, getTextOnGradient, type ThemePalette } from "./palette";

/** Quanto os cards de indicadores se aproximam do branco (degradê suavizado). */
export const SOFT_GRADIENT_WHITE_MIX = 0.68;

/** Quanto o fundo dos cards de negócios se aproxima do branco. */
export const SURFACE_WHITE_MIX = 0.84;

/**
 * Variáveis de tema. Apenas estas mudam com a cor escolhida; alertas, atraso, sucesso, textos
 * neutros e o fundo da aplicação são fixos (ver `STATIC_TOKENS`).
 */
export type ThemeTokenName =
  | "--theme-base"
  | "--theme-tone-1"
  | "--theme-tone-2"
  | "--theme-tone-3"
  | "--theme-tone-4"
  | "--theme-gradient"
  | "--theme-gradient-soft"
  | "--theme-surface"
  | "--theme-on-gradient";

export type ThemeTokens = Record<ThemeTokenName, string>;

export interface ThemeDefinition {
  base: string;
  palette: ThemePalette;
  tokens: ThemeTokens;
}

/** Cores que nunca mudam com o tema (semânticas e neutras). */
export const STATIC_TOKENS = {
  "--background": "#fdfdfd",
  "--text-primary": "#403933",
  "--text-secondary": "#797979",
  "--text-muted": "#969696",
  "--color-danger": "#ff5058",
  "--color-warning": "#e5a33c",
  "--color-success": "#21966b",
  "--color-neutral": "#9ca3af",
  "--border-color": "#e9e9e9",
} as const;

export function buildGradient(palette: ThemePalette): string {
  const stops = palette.map((tone, index) => `${tone} ${index * 25}%`).join(", ");
  return `linear-gradient(180deg, ${stops})`;
}

export function buildTheme(baseColor: string): ThemeDefinition {
  const palette = generatePalette(baseColor);
  const [base, tone1, tone2, tone3, tone4] = palette;

  const softStart = mixColors(base, "#ffffff", SOFT_GRADIENT_WHITE_MIX);
  const softEnd = mixColors(tone4, "#ffffff", SOFT_GRADIENT_WHITE_MIX);

  return {
    base,
    palette,
    tokens: {
      "--theme-base": base,
      "--theme-tone-1": tone1,
      "--theme-tone-2": tone2,
      "--theme-tone-3": tone3,
      "--theme-tone-4": tone4,
      "--theme-gradient": buildGradient(palette),
      "--theme-gradient-soft": `linear-gradient(180deg, ${softStart}, ${softEnd})`,
      "--theme-surface": mixColors(tone4, "#ffffff", SURFACE_WHITE_MIX),
      "--theme-on-gradient": getTextOnGradient(palette),
    },
  };
}

/** Elemento mínimo necessário para aplicar tokens (facilita testes sem DOM completo). */
export interface StyleTarget {
  style: Pick<CSSStyleDeclaration, "setProperty">;
}

/** Aplica os tokens como CSS custom properties no elemento (normalmente `document.documentElement`). */
export function applyThemeTokens(target: StyleTarget, tokens: ThemeTokens): void {
  for (const [name, value] of Object.entries(tokens)) {
    target.style.setProperty(name, value);
  }
}
