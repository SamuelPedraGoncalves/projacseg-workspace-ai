import type { TenantRecord } from "../../store/types";

/**
 * Modo piloto: quando a empresa define `pilot.userIds`, o Workspace funciona **só** para esses
 * usuários — inclusive num portal real. Aplicado pelo software em todas as entradas e saídas:
 *
 * - leitura do CRM: só negócios cujo responsável está no piloto (filtro na própria consulta);
 * - mensagens do bot: só para usuários do piloto (escalonamento a um chefe fora do piloto fica
 *   registrado no histórico, sem envio);
 * - chat: quem está fora do piloto recebe só um aviso, sem dados e sem IA;
 * - aplicativo e API: quem está fora do piloto vê um aviso, sem sessão nem dados.
 */
export function pilotUsers(tenant: Pick<TenantRecord, "config">): string[] | null {
  const ids = tenant.config.pilotUserIds;
  return ids && ids.length > 0 ? ids : null;
}

export function inPilot(tenant: Pick<TenantRecord, "config">, userId: string | undefined): boolean {
  const ids = pilotUsers(tenant);
  return ids === null || (userId !== undefined && ids.includes(userId));
}

/**
 * Modo de observação (só no piloto): `pilot.viewAs` liga um usuário do piloto a outro colaborador
 * ({"13": "27"}). O usuário 13 vê no dashboard e no chat os negócios do 27 — só leitura — e recebe os
 * alertas que iriam para o 27. O 27 continua fora do piloto: não acessa nada e não recebe nada.
 */
export function subjectOf(tenant: Pick<TenantRecord, "config">, userId: string): string {
  return tenant.config.pilotViewAs?.[userId] ?? userId;
}

/** Está vendo os negócios de outro colaborador (sem poder alterá-los)? */
export function isObserving(tenant: Pick<TenantRecord, "config">, userId: string): boolean {
  return subjectOf(tenant, userId) !== userId;
}

/** Quem do piloto observa este colaborador (para receber os alertas no lugar dele). */
export function observerOf(
  tenant: Pick<TenantRecord, "config">,
  subjectId: string,
): string | undefined {
  return Object.entries(tenant.config.pilotViewAs ?? {}).find(
    ([viewer, subject]) => subject === subjectId && viewer !== subjectId,
  )?.[0];
}

/** Responsáveis cujos negócios o CRM precisa ler: o piloto e quem ele observa. */
export function crmScopeUsers(tenant: Pick<TenantRecord, "config">): string[] | null {
  const ids = pilotUsers(tenant);
  if (!ids) return null;
  return [...new Set([...ids, ...Object.values(tenant.config.pilotViewAs ?? {})])];
}
