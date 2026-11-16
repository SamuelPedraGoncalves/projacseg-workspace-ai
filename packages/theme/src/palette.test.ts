import { describe, expect, it } from "vitest";
import { hexToRgb, relativeLuminance } from "./color";
import {
  DEFAULT_THEME_BASE,
  DEFAULT_THEME_END,
  THEME_PRESETS,
  TEXT_ON_DARK,
  TEXT_ON_LIGHT,
  generatePalette,
  getGradientEnd,
  getTextOnGradient,
} from "./palette";

describe("tema institucional", () => {
  it("reproduz exatamente os cinco tons da referência", () => {
    expect(generatePalette(DEFAULT_THEME_BASE)).toEqual([
      "#0649a8",
      "#1163bb",
      "#1d7ecd",
      "#2898e0",
      "#33b2f2",
    ]);
  });

  it("usa a extremidade clara fixa #33B2F2", () => {
    expect(getGradientEnd("#0649A8")).toBe(DEFAULT_THEME_END);
  });

  it("aceita a cor base em maiúsculas", () => {
    expect(generatePalette("#0649A8")[0]).toBe("#0649a8");
  });

  it("mantém texto branco sobre o degradê", () => {
    expect(getTextOnGradient(generatePalette(DEFAULT_THEME_BASE))).toBe(TEXT_ON_DARK);
  });
});

describe("temas personalizados", () => {
  it("gera cinco tons com o tom 0 igual à cor base", () => {
    const palette = generatePalette("#6534ae");
    expect(palette).toHaveLength(5);
    expect(palette[0]).toBe("#6534ae");
  });

  it("deriva a extremidade misturando 40% de branco", () => {
    // #6534ae → r: 101 + 154*0.4 = 162.6; g: 52 + 203*0.4 = 133.2; b: 174 + 81*0.4 = 206.4
    expect(getGradientEnd("#6534ae")).toBe("#a385ce");
  });

  it.each(THEME_PRESETS.map((preset) => [preset.name, preset.color]))(
    "%s: cada tom é progressivamente mais claro",
    (_name, color) => {
      const luminances = generatePalette(color).map(relativeLuminance);
      for (let index = 1; index < luminances.length; index += 1) {
        expect(luminances[index]).toBeGreaterThan(luminances[index - 1]!);
      }
    },
  );

  it("preserva a identidade cromática (canal dominante não muda)", () => {
    const dominant = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      const max = Math.max(r, g, b);
      return max === r ? "r" : max === g ? "g" : "b";
    };
    for (const preset of THEME_PRESETS) {
      const palette = generatePalette(preset.color);
      const expected = dominant(palette[0]);
      for (const tone of palette) expect(dominant(tone)).toBe(expected);
    }
  });

  it("rejeita cor inválida", () => {
    expect(() => generatePalette("#12")).toThrow(/inválida/);
    expect(() => generatePalette("vermelho")).toThrow(/inválida/);
  });
});

describe("cor do texto sobre o degradê", () => {
  it("usa texto escuro em temas claros", () => {
    expect(getTextOnGradient(generatePalette("#f5d90a"))).toBe(TEXT_ON_LIGHT);
    expect(getTextOnGradient(generatePalette("#ffffff"))).toBe(TEXT_ON_LIGHT);
  });

  it("usa texto branco em temas escuros", () => {
    expect(getTextOnGradient(generatePalette("#354052"))).toBe(TEXT_ON_DARK);
    expect(getTextOnGradient(generatePalette("#000000"))).toBe(TEXT_ON_DARK);
  });
});
