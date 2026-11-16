import type { ThemePreference } from "@projacseg/shared";

/**
 * Persistência futura da preferência de tema no banco (tabela `theme_preferences`, chave única
 * tenantId + bitrixUserId). A identidade deve vir da sessão autenticada no backend; a rota HTTP só
 * será exposta junto com a autenticação OAuth.
 */
export interface ThemePreferenceRepository {
  find(tenantId: string, bitrixUserId: string): Promise<ThemePreference | null>;
  upsert(preference: ThemePreference): Promise<ThemePreference>;
  remove(tenantId: string, bitrixUserId: string): Promise<void>;
}

/** Implementação em memória para testes e desenvolvimento, até o Prisma entrar. */
export class InMemoryThemePreferenceRepository implements ThemePreferenceRepository {
  private readonly items = new Map<string, ThemePreference>();

  private key(tenantId: string, bitrixUserId: string) {
    return JSON.stringify([tenantId, bitrixUserId]);
  }

  async find(tenantId: string, bitrixUserId: string) {
    return this.items.get(this.key(tenantId, bitrixUserId)) ?? null;
  }

  async upsert(preference: ThemePreference) {
    const stored = { ...preference, baseColor: preference.baseColor.toLowerCase() };
    this.items.set(this.key(preference.tenantId, preference.bitrixUserId), stored);
    return stored;
  }

  async remove(tenantId: string, bitrixUserId: string) {
    this.items.delete(this.key(tenantId, bitrixUserId));
  }
}
