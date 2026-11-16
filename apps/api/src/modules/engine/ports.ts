import type { DealSnapshotRecord, TenantRecord } from "../../store/types";

/** Origem dos negócios (Bitrix24 em produção; falsa nos testes). */
export interface DealSource {
  listOpenDeals(tenant: TenantRecord): Promise<DealSnapshotRecord[]>;
  /** `null` se o negócio não existe mais. */
  getDeal(tenant: TenantRecord, dealId: string): Promise<DealSnapshotRecord | null>;
}

export interface SuperiorResolver {
  superiors(tenant: TenantRecord, userId: string, maxLevels: number): Promise<string[]>;
}

/** Envio de mensagens com proteção contra duplicidade (`dedupeKey`). */
export interface Notifier {
  notify(
    tenant: TenantRecord,
    userId: string,
    kind: string,
    dedupeKey: string,
    message: string,
  ): Promise<boolean>;
}
