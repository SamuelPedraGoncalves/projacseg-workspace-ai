/**
 * Utilitários de cor puros (sem DOM). Toda cor trafega como HEX de 6 dígitos minúsculo (#rrggbb).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const SHORT_HEX_PATTERN = /^#?[0-9a-f]{3}$/i;

export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/**
 * Normaliza entradas digitadas pelo usuário: aceita "0649A8", "#0649a8" e "#06A".
 * Retorna `null` quando não for uma cor válida.
 */
export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();

  if (SHORT_HEX_PATTERN.test(trimmed)) {
    const digits = trimmed.replace("#", "");
    return `#${[...digits].map((digit) => digit + digit).join("")}`.toLowerCase();
  }

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return isValidHex(withHash) ? withHash.toLowerCase() : null;
}

export function hexToRgb(hex: string): Rgb {
  if (!isValidHex(hex)) {
    throw new Error(`Cor HEX inválida: ${hex}`);
  }

  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toChannel(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${toChannel(r)}${toChannel(g)}${toChannel(b)}`;
}

/** Interpolação linear em RGB: amount = 0 devolve `from`, amount = 1 devolve `to`. */
export function mixColors(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = Math.min(1, Math.max(0, amount));

  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/** Luminância relativa conforme WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const [red, green, blue] = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
