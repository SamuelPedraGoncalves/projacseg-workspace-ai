import type { UserContext } from "@projacseg/shared";

/**
 * Usuário do modo demonstrativo (fora do Bitrix24). Identificadores vindos de variáveis de ambiente
 * com valores padrão fictícios — nada de IDs reais no código.
 *
 * Dentro do Bitrix24 o usuário (nome, ID e foto) vem de `user.current` — ver `platform/platform.ts`.
 */
export function getDemoUser(): UserContext {
  const photo = import.meta.env.VITE_DEMO_USER_PHOTO_URL;
  return {
    tenantId: import.meta.env.VITE_DEMO_TENANT_ID || "projacseg-demo",
    bitrixUserId: import.meta.env.VITE_DEMO_USER_ID || "demo-lucas",
    name: import.meta.env.VITE_DEMO_USER_NAME || "Lucas",
    initials: import.meta.env.VITE_DEMO_USER_INITIALS || "LC",
    ...(photo ? { avatarUrl: photo } : {}),
  };
}
