import type { TenantRecord } from "../../store/types";

/**
 * A corretora está liberada para usar o WorkSeg? Ponto único onde a cobrança (teste de 7 dias,
 * assinatura) vai entrar depois. Nesta versão, toda corretora está liberada.
 */
export function licensed(_tenant: TenantRecord): boolean {
  return true;
}
