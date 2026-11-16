import { normalizeHex } from "./color";

/**
 * Escopo de uma preferência de tema. Cada colaborador de cada empresa tem a sua; a preferência de
 * um colaborador nunca altera a de outro.
 */
export interface ThemeScope {
  tenantId: string;
  bitrixUserId: string;
}

/**
 * Contrato de persistência. Hoje: `LocalStorageThemeRepository`. Futuro: implementação HTTP que
 * grava no banco por `tenantId` + `bitrixUserId` (identidade vinda da sessão autenticada, nunca do
 * cliente).
 */
export interface ThemePreferenceRepository {
  load(scope: ThemeScope): string | null;
  save(scope: ThemeScope, baseColor: string): void;
  clear(scope: ThemeScope): void;
}

/** Subconjunto de `Storage` usado — permite injetar armazenamento falso em testes. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function themeStorageKey({ tenantId, bitrixUserId }: ThemeScope): string {
  if (!tenantId || !bitrixUserId) {
    throw new Error("tenantId e bitrixUserId são obrigatórios para o escopo do tema.");
  }
  return `workspace-theme:${encodeURIComponent(tenantId)}:${encodeURIComponent(bitrixUserId)}`;
}

/**
 * Persistência provisória no navegador. Falhas de armazenamento (modo privado, cota, bloqueio) são
 * absorvidas: o tema continua funcionando na sessão atual.
 */
export class LocalStorageThemeRepository implements ThemePreferenceRepository {
  constructor(private readonly storage: KeyValueStorage | undefined) {}

  load(scope: ThemeScope): string | null {
    try {
      const saved = this.storage?.getItem(themeStorageKey(scope));
      return saved ? normalizeHex(saved) : null;
    } catch {
      return null;
    }
  }

  save(scope: ThemeScope, baseColor: string): void {
    const normalized = normalizeHex(baseColor);
    if (!normalized) return;
    try {
      this.storage?.setItem(themeStorageKey(scope), normalized);
    } catch {
      // Sem persistência disponível: mantém apenas em memória.
    }
  }

  clear(scope: ThemeScope): void {
    try {
      this.storage?.removeItem(themeStorageKey(scope));
    } catch {
      // Ignora: nada a limpar.
    }
  }
}

/** Retorna `localStorage` quando acessível; `undefined` em SSR ou quando o navegador bloqueia. */
export function getBrowserStorage(): KeyValueStorage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
