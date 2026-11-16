import { contrastRatio, isValidHex, mixColors, normalizeHex } from "./color";

/** Tema institucional ProjacSeg (azul). */
export const DEFAULT_THEME_BASE = "#0649a8";

/**
 * Extremidade clara do degradê institucional. É fixa para preservar a referência visual aprovada;
 * nos demais temas a extremidade é derivada da própria cor base.
 */
export const DEFAULT_THEME_END = "#33b2f2";

/** Quanto a extremidade clara de um tema personalizado se aproxima do branco. */
export const CUSTOM_END_WHITE_MIX = 0.4;

/** Posições dos cinco pontos tonais no degradê (tom 0 a tom 4). */
export const TONE_STOPS = [0, 0.25, 0.5, 0.75, 1] as const;

export const TEXT_ON_DARK = "#ffffff";
export const TEXT_ON_LIGHT = "#171717";

/** Paleta de cinco tons: [base, tom 1, tom 2, tom 3, tom 4 (mais claro)]. */
export type ThemePalette = readonly [string, string, string, string, string];

export interface ThemePreset {
  id: string;
  name: string;
  color: string;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: "azul", name: "Azul", color: DEFAULT_THEME_BASE },
  { id: "roxo", name: "Roxo", color: "#6534ae" },
  { id: "verde", name: "Verde", color: "#137849" },
  { id: "rosa", name: "Rosa", color: "#b52b77" },
  { id: "laranja", name: "Laranja", color: "#bd5210" },
  { id: "vermelho", name: "Vermelho", color: "#b52b38" },
  { id: "turquesa", name: "Turquesa", color: "#087d85" },
  { id: "grafite", name: "Grafite", color: "#354052" },
];

function requireHex(value: string): string {
  const normalized = normalizeHex(value);
  if (!normalized || !isValidHex(normalized)) {
    throw new Error(`Cor HEX inválida: ${value}`);
  }
  return normalized;
}

/** Extremidade clara do degradê para uma cor base. */
export function getGradientEnd(baseColor: string): string {
  const base = requireHex(baseColor);
  return base === DEFAULT_THEME_BASE
    ? DEFAULT_THEME_END
    : mixColors(base, "#ffffff", CUSTOM_END_WHITE_MIX);
}

/**
 * Gera os cinco tons por interpolação linear entre a cor base e a extremidade clara.
 * Como a extremidade é a própria base misturada com branco, o matiz é preservado e cada tom é
 * progressivamente mais claro.
 */
export function generatePalette(baseColor: string): ThemePalette {
  const base = requireHex(baseColor);
  const end = getGradientEnd(base);
  const [t0, t1, t2, t3, t4] = TONE_STOPS.map((stop) => mixColors(base, end, stop)) as [
    string,
    string,
    string,
    string,
    string,
  ];
  return [t0, t1, t2, t3, t4];
}

/**
 * Escolhe a cor de texto sobre o degradê comparando o pior contraste do branco e do texto escuro
 * em todos os tons. O tema institucional mantém o branco para fidelidade à referência.
 */
export function getTextOnGradient(palette: ThemePalette): string {
  if (palette[0] === DEFAULT_THEME_BASE) {
    return TEXT_ON_DARK;
  }

  const worst = (text: string) => Math.min(...palette.map((tone) => contrastRatio(tone, text)));
  return worst(TEXT_ON_DARK) >= worst(TEXT_ON_LIGHT) ? TEXT_ON_DARK : TEXT_ON_LIGHT;
}
