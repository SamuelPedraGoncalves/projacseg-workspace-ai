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
