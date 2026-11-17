import type {
  BusinessCalendar,
  DealView,
  OccurrenceStatus,
  ProjectedOccurrence,
  RuleDefinition,
} from "@projacseg/engine";

export interface TenantConfig {
  calendar: BusinessCalendar;
  /** Campos personalizados (UF_CRM_*) do portal. Configuração, nunca código. */
  fieldMapping: { branch?: string; insuranceType?: string };
  /** Horário local do resumo diário ("08:00"); `null` desliga. */
  digestTime: string | null;
  /** Liga as respostas por IA no chat do assistente (requer provedor configurado). */
  aiEnabled: boolean;
  /** Papéis usados pelas regras (papel → ID do usuário no Bitrix24). Configuração, nunca código. */
  roles?: Record<string, string>;
}

export interface TenantRecord {
  id: string;
  domain: string;
  memberId: string;
  clientEndpoint: string;
  applicationToken: string | null;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  tokenExpiresAt: Date | null;
  config: TenantConfig;
}

export interface DealSnapshotRecord extends DealView {
  stageEnteredAt: Date;
  /** Só os campos que as regras usam (condições, datas, responsável por campo). */
  fields?: Record<string, string[]>;
}

export interface OccurrenceRecord extends ProjectedOccurrence {
  tenantId: string;
  resolveReason?: string;
}

export interface NewOccurrence {
  tenantId: string;
  ruleCode: string;
  dealId: string;
  stageId: string;
  stageEnteredAt: Date;
  responsibleId: string;
  openedAt: Date;
  dueAt: Date;
  riskAt: Date;
}

export interface OccurrencePatch {
  status?: OccurrenceStatus;
  escalationLevel?: number;
  responsibleId?: string;
  resolvedAt?: Date;
  resolveReason?: string;
}

export interface OccurrenceEventRecord {
  occurrenceId: string;
  tenantId: string;
  type: string;
  /** "engine", "system" ou ID de usuário. */
  actor: string;
  payload: Record<string, unknown>;
  createdAt?: Date;
}

/**
 * Armazenamento da aplicação. Duas implementações: memória (desenvolvimento e testes, sem banco) e
 * Prisma/PostgreSQL. Tudo é escopado por `tenantId`.
 */
export interface Store {
  tenants: {
    findById(id: string): Promise<TenantRecord | null>;
    findByMemberId(memberId: string): Promise<TenantRecord | null>;
    findByDomain(domain: string): Promise<TenantRecord | null>;
    list(): Promise<TenantRecord[]>;
    /** Cria ou atualiza pelo `memberId` (reinstalação). */
    upsert(input: Omit<TenantRecord, "id">): Promise<TenantRecord>;
    update(id: string, patch: Partial<Omit<TenantRecord, "id">>): Promise<TenantRecord>;
  };
  rules: {
    list(tenantId: string): Promise<RuleDefinition[]>;
    replaceAll(tenantId: string, rules: RuleDefinition[]): Promise<void>;
  };
  deals: {
    upsert(tenantId: string, deal: DealSnapshotRecord): Promise<void>;
    get(tenantId: string, dealId: string): Promise<DealSnapshotRecord | null>;
    list(tenantId: string): Promise<DealSnapshotRecord[]>;
    listByAssignee(tenantId: string, userId: string): Promise<DealSnapshotRecord[]>;
  };
  occurrences: {
    /** Idempotente: se já existir para (negócio, regra, entrada na etapa), devolve a existente. */
    create(input: NewOccurrence): Promise<{ record: OccurrenceRecord; created: boolean }>;
    update(id: string, patch: OccurrencePatch): Promise<OccurrenceRecord>;
    get(id: string): Promise<OccurrenceRecord | null>;
    listOpenByDeal(tenantId: string, dealId: string): Promise<OccurrenceRecord[]>;
    listOpen(tenantId: string): Promise<OccurrenceRecord[]>;
    /** Abertas + resolvidas desde `resolvedSince`, dos negócios informados. */
    listForDeals(
      tenantId: string,
      dealIds: string[],
      resolvedSince: Date,
    ): Promise<OccurrenceRecord[]>;
    appendEvent(event: OccurrenceEventRecord): Promise<void>;
    listEvents(occurrenceId: string): Promise<OccurrenceEventRecord[]>;
  };
  notifications: {
    /** Registra o envio; devolve `false` se a chave já existia (não enviar de novo). */
    claim(tenantId: string, userId: string, kind: string, dedupeKey: string): Promise<boolean>;
    /** Desfaz o registro quando o envio falhou, para tentar de novo no próximo ciclo. */
    release(tenantId: string, dedupeKey: string): Promise<void>;
  };
  close(): Promise<void>;
}
