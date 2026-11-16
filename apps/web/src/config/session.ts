import type { UserContext } from "@projacseg/shared";

/**
 * Sessão do colaborador.
 *
 * Nesta sprint é um usuário demonstrativo (sem Bitrix24). Os identificadores vêm de variáveis de
 * ambiente com valores padrão fictícios — nada de IDs reais no código. Na integração, a sessão será
 * resolvida pelo backend a partir do OAuth do Bitrix24 e validada com `userContextSchema`
 * (ver docs/INTEGRATIONS.md). O schema Zod não é importado aqui para não pesar o bundle.
 */
export function getCurrentUser(): UserContext {
  return {
    tenantId: import.meta.env.VITE_DEMO_TENANT_ID || "projacseg-demo",
    bitrixUserId: import.meta.env.VITE_DEMO_USER_ID || "demo-lucas",
    name: import.meta.env.VITE_DEMO_USER_NAME || "Lucas",
    initials: import.meta.env.VITE_DEMO_USER_INITIALS || "LC",
  };
}
