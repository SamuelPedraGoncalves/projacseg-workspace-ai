import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexToRgb,
  isValidHex,
  mixColors,
  normalizeHex,
  relativeLuminance,
  rgbToHex,
} from "./color";

describe("validação e normalização de HEX", () => {
  it("aceita apenas #rrggbb em isValidHex", () => {
    expect(isValidHex("#0649A8")).toBe(true);
    expect(isValidHex("#0649a8")).toBe(true);
    expect(isValidHex("0649a8")).toBe(false);
    expect(isValidHex("#06a")).toBe(false);
    expect(isValidHex("#zzzzzz")).toBe(false);
    expect(isValidHex("")).toBe(false);
  });

  it("normaliza entradas digitadas pelo usuário", () => {
    expect(normalizeHex("#0649A8")).toBe("#0649a8");
    expect(normalizeHex("  0649a8 ")).toBe("#0649a8");
    expect(normalizeHex("#06A")).toBe("#0066aa");
    expect(normalizeHex("abc")).toBe("#aabbcc");
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("azul")).toBeNull();
  });
});

describe("conversões RGB", () => {
  it("converte ida e volta sem perda", () => {
    expect(hexToRgb("#0649a8")).toEqual({ r: 6, g: 73, b: 168 });
    expect(rgbToHex({ r: 6, g: 73, b: 168 })).toBe("#0649a8");
  });

  it("limita canais fora do intervalo", () => {
    expect(rgbToHex({ r: -10, g: 300, b: 127.6 })).toBe("#00ff80");
  });

  it("rejeita HEX inválido", () => {
    expect(() => hexToRgb("#xyz")).toThrow();
  });
});

describe("mixColors", () => {
  it("retorna as extremidades em 0 e 1", () => {
    expect(mixColors("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixColors("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("interpola linearmente", () => {
    expect(mixColors("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("limita a quantidade entre 0 e 1", () => {
    expect(mixColors("#000000", "#ffffff", 2)).toBe("#ffffff");
    expect(mixColors("#000000", "#ffffff", -1)).toBe("#000000");
  });
});

describe("contraste WCAG", () => {
  it("calcula luminância nos extremos", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("preto e branco têm contraste 21:1 e é simétrico", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#0649a8", "#0649a8")).toBe(1);
  });
});
