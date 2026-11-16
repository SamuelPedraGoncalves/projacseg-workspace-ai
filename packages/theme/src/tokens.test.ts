import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME_BASE } from "./palette";
import { STATIC_TOKENS, applyThemeTokens, buildGradient, buildTheme } from "./tokens";

describe("buildTheme", () => {
  it("expõe todas as variáveis mínimas exigidas", () => {
    const { tokens } = buildTheme(DEFAULT_THEME_BASE);
    expect(Object.keys(tokens).sort()).toEqual(
      [
        "--theme-base",
        "--theme-tone-1",
        "--theme-tone-2",
        "--theme-tone-3",
        "--theme-tone-4",
        "--theme-gradient",
        "--theme-gradient-soft",
        "--theme-surface",
        "--theme-on-gradient",
      ].sort(),
    );
  });

  it("monta o degradê com cinco pontos de 0% a 100%", () => {
    const { palette, tokens } = buildTheme(DEFAULT_THEME_BASE);
    expect(tokens["--theme-gradient"]).toBe(buildGradient(palette));
    expect(tokens["--theme-gradient"]).toBe(
      "linear-gradient(180deg, #0649a8 0%, #1163bb 25%, #1d7ecd 50%, #2898e0 75%, #33b2f2 100%)",
    );
  });

  it("deriva superfície e degradê suave do próprio tema", () => {
    const { tokens } = buildTheme(DEFAULT_THEME_BASE);
    expect(tokens["--theme-surface"]).toBe("#def3fd");
    expect(tokens["--theme-gradient-soft"]).toBe("linear-gradient(180deg, #afc5e3, #bee6fb)");
  });

  it("temas diferentes produzem superfícies diferentes", () => {
    expect(buildTheme("#137849").tokens["--theme-surface"]).not.toBe(
      buildTheme(DEFAULT_THEME_BASE).tokens["--theme-surface"],
    );
  });

  it("não inclui cores semânticas nem neutras entre as variáveis de tema", () => {
    const { tokens } = buildTheme("#b52b38");
    for (const fixed of Object.keys(STATIC_TOKENS)) {
      expect(tokens).not.toHaveProperty(fixed);
    }
  });
});

describe("applyThemeTokens", () => {
  it("grava cada token como CSS custom property", () => {
    const setProperty = vi.fn();
    const { tokens } = buildTheme("#087d85");
    applyThemeTokens({ style: { setProperty } }, tokens);
    expect(setProperty).toHaveBeenCalledTimes(Object.keys(tokens).length);
    expect(setProperty).toHaveBeenCalledWith("--theme-base", "#087d85");
  });

  it("funciona sobre um elemento real do DOM", () => {
    const element = document.createElement("div");
    applyThemeTokens(element, buildTheme("#087d85").tokens);
    expect(element.style.getPropertyValue("--theme-base")).toBe("#087d85");
  });
});
