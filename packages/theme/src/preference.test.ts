import { describe, expect, it } from "vitest";
import {
  LocalStorageThemeRepository,
  themeStorageKey,
  type KeyValueStorage,
  type ThemeScope,
} from "./preference";

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const lucas: ThemeScope = { tenantId: "projacseg-demo", bitrixUserId: "101" };
const marina: ThemeScope = { tenantId: "projacseg-demo", bitrixUserId: "102" };
const otherTenant: ThemeScope = { tenantId: "outra-corretora", bitrixUserId: "101" };

describe("chave de armazenamento", () => {
  it("inclui empresa e colaborador", () => {
    expect(themeStorageKey(lucas)).toBe("workspace-theme:projacseg-demo:101");
  });

  it("exige escopo completo", () => {
    expect(() => themeStorageKey({ tenantId: "", bitrixUserId: "1" })).toThrow();
  });
});

describe("LocalStorageThemeRepository", () => {
  it("salva e recupera a preferência normalizada", () => {
    const repo = new LocalStorageThemeRepository(memoryStorage());
    repo.save(lucas, "#6534AE");
    expect(repo.load(lucas)).toBe("#6534ae");
  });

  it("isola colaboradores e empresas", () => {
    const repo = new LocalStorageThemeRepository(memoryStorage());
    repo.save(lucas, "#137849");
    repo.save(marina, "#b52b77");

    expect(repo.load(lucas)).toBe("#137849");
    expect(repo.load(marina)).toBe("#b52b77");
    expect(repo.load(otherTenant)).toBeNull();
  });

  it("restaurar remove apenas a preferência do próprio colaborador", () => {
    const repo = new LocalStorageThemeRepository(memoryStorage());
    repo.save(lucas, "#137849");
    repo.save(marina, "#b52b77");
    repo.clear(lucas);

    expect(repo.load(lucas)).toBeNull();
    expect(repo.load(marina)).toBe("#b52b77");
  });

  it("ignora valores inválidos gravados manualmente", () => {
    const storage = memoryStorage();
    storage.setItem(themeStorageKey(lucas), "javascript:alert(1)");
    expect(new LocalStorageThemeRepository(storage).load(lucas)).toBeNull();
  });

  it("não salva cores inválidas", () => {
    const storage = memoryStorage();
    new LocalStorageThemeRepository(storage).save(lucas, "rosa");
    expect(storage.data.size).toBe(0);
  });

  it("continua funcionando quando o armazenamento falha", () => {
    const failing: KeyValueStorage = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("cota excedida");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    const repo = new LocalStorageThemeRepository(failing);
    expect(() => repo.save(lucas, "#137849")).not.toThrow();
    expect(repo.load(lucas)).toBeNull();
    expect(() => repo.clear(lucas)).not.toThrow();
  });

  it("aceita ausência de armazenamento", () => {
    const repo = new LocalStorageThemeRepository(undefined);
    repo.save(lucas, "#137849");
    expect(repo.load(lucas)).toBeNull();
  });
});
