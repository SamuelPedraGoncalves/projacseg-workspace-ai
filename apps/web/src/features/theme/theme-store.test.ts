import { DEFAULT_THEME_BASE, LocalStorageThemeRepository, type ThemeScope } from "@projacseg/theme";
import { beforeEach, describe, expect, it } from "vitest";
import { createThemeStore } from "./theme-store";

const scope: ThemeScope = { tenantId: "projacseg-demo", bitrixUserId: "demo-lucas" };

function setup() {
  const element = document.createElement("div");
  const repository = new LocalStorageThemeRepository(window.localStorage);
  const store = createThemeStore({ repository, scope, target: () => element });
  return { element, repository, store };
}

const cssVar = (element: HTMLElement, name: string) => element.style.getPropertyValue(name);

describe("theme store", () => {
  beforeEach(() => window.localStorage.clear());

  it("inicia no tema institucional e aplica as variáveis", () => {
    const { element, store } = setup();
    expect(store.getState().baseColor).toBe(DEFAULT_THEME_BASE);
    expect(cssVar(element, "--theme-tone-4")).toBe("#33b2f2");
  });

  it("aplica imediatamente e persiste a cor escolhida", () => {
    const { element, repository, store } = setup();
    expect(store.getState().setTheme("#137849")).toBe(true);
    expect(cssVar(element, "--theme-base")).toBe("#137849");
    expect(repository.load(scope)).toBe("#137849");
  });

  it("recupera a preferência salva ao recarregar", () => {
    setup().store.getState().setTheme("#B52B77");
    const reloaded = setup();
    expect(reloaded.store.getState().baseColor).toBe("#b52b77");
    expect(cssVar(reloaded.element, "--theme-base")).toBe("#b52b77");
  });

  it("rejeita cor inválida sem alterar o tema", () => {
    const { store } = setup();
    expect(store.getState().setTheme("roxo")).toBe(false);
    expect(store.getState().baseColor).toBe(DEFAULT_THEME_BASE);
  });

  it("restaura o tema original e apaga a preferência", () => {
    const { element, repository, store } = setup();
    store.getState().setTheme("#bd5210");
    store.getState().resetTheme();
    expect(store.getState().baseColor).toBe(DEFAULT_THEME_BASE);
    expect(cssVar(element, "--theme-base")).toBe(DEFAULT_THEME_BASE);
    expect(repository.load(scope)).toBeNull();
  });
});
