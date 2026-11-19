import type {
  BusinessCalendar,
  DealView,
  OccurrenceStatus,
  ProjectedOccurrence,
  RuleDefinition,
} from "@projacseg/engine";

/**
 * Campos personalizados (UF_CRM_*) do portal, definidos no mapeamento. Configuração, nunca código.
 * Só códigos de campo (strings): o `CrmReader` lê todos os valores daqui como campos do negócio.
 */
export interface FieldMapping {
  insuranceType?: string;
  branch?: string;
  validity?: string;
  cpf?: string;
  quoteNumber?: string;
  lossReason?: string;
}

/** Quais negócios são Seguro Novo e Renovação: funis e itens do campo de tipo do seguro. */
export interface SituationMapping {
  categoryIds: string[];
  newBusinessValues: string[];
  renewalValues: string[];
}

/** Marcos do primeiro acesso (datas ISO) e origem do calendário. */
export interface SetupMilestones {
  editorsConfirmedAt?: string;
  mappingConfirmedAt?: string;
  calendarSource?: "bitrix24" | "default" | "manual";
}

export interface TenantConfig {
  calendar: BusinessCalendar;
  fieldMapping: FieldMapping;
  situations?: SituationMapping;
  setup?: SetupMilestones;
  /** Horário local do resumo diário ("08:00"); `null` desliga. */
  digestTime: string | null;
  /** Liga as respostas por IA no chat do assistente (requer provedor configurado). */
  aiEnabled: boolean;
  /** Papéis usados pelas regras (papel → ID do usuário no Bitrix24). Configuração, nunca código. */
  roles?: Record<string, string>;
  /** Modo piloto: o Workspace só funciona para estes usuários (ver modules/tenants/pilot.ts). */
  pilotUserIds?: string[];
  /** Modo de observação no piloto: usuário do piloto → colaborador cujos negócios ele vê. */
  pilotViewAs?: Record<string, string>;
  /** Ações do assistente no chat (mover etapa, preencher campo). Desligadas sem esta seção. */
  assistant?: AssistantConfig;
}

export interface AssistantConfig {
  actions: boolean;
  /** Minutos para o colaborador confirmar uma ação proposta (padrão 10). */
  confirmMinutes?: number;
  /** Pipeline (CATEGORY_ID) → etapas (STAGE_ID) para onde o assistente pode mover negócios. */
  stages: Record<string, string[]>;
  /** Campos (códigos do Bitrix24) que o assistente pode preencher. */
  fields: string[];
  /**
   * Descarte por pipeline: etapa de perdido e o campo (lista) com o motivo, sempre obrigatório.
   * Sem esta entrada, o assistente não descarta negócios naquele pipeline.
   */
  discard?: Record<string, { stage: string; reasonField: string }>;
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
  /** Usuário do Bitrix24 que instalou o app (administrador do WorkSeg). */
  installedByUserId?: string | null;
  config: TenantConfig;
}

export type TenantRoleName = "rule_editor";

export interface TenantRoleRecord {
  tenantId: string;
  userId: string;
  userName: string;
  role: TenantRoleName;
  grantedBy: string;
  grantedAt: Date;
}

export type ConsentKind = "terms" | "privacy_notice";

/** Aceite de termos ou aviso. Somente inserção. */
export interface ConsentRecord {
  tenantId: string;
  userId: string;
  kind: ConsentKind;
  version: string;
  provisional: boolean;
  acceptedAt: Date;
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

export type AssistantActionStatus = "pending" | "executed" | "cancelled" | "expired" | "failed";

/** Ação pedida ao assistente no chat: proposta → confirmação → execução (auditável). */
export interface AssistantActionRecord {
  id: string;
  tenantId: string;
  userId: string;
  dealId: string;
  kind: "stage" | "field" | "discard";
  /** Campos do negócio a alterar, já validados (ex.: { STAGE_ID: "UC_IYS6WC" }). */
  payload: Record<string, string>;
  summary: string;
  status: AssistantActionStatus;
  createdAt: Date;
  expiresAt: Date;
  decidedAt?: Date;
  result?: string;
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
    /**
     * Cria ou atualiza pelo `memberId` (reinstalação). Sem `installedByUserId` no input, mantém o
     * já gravado.
     */
    upsert(input: Omit<TenantRecord, "id">): Promise<TenantRecord>;
    update(id: string, patch: Partial<Omit<TenantRecord, "id">>): Promise<TenantRecord>;
  };
  roles: {
    list(tenantId: string): Promise<TenantRoleRecord[]>;
    /** Substitui os usuários do papel; quem continua mantém `grantedBy`/`grantedAt` originais. */
    replace(
      tenantId: string,
      role: TenantRoleName,
      users: { userId: string; userName: string }[],
      grantedBy: string,
      at: Date,
    ): Promise<void>;
  };
  consents: {
    append(record: ConsentRecord): Promise<void>;
    /** Aceite mais recente do tipo; com `userId`, só os daquele usuário. */
    latest(tenantId: string, kind: ConsentKind, userId?: string): Promise<ConsentRecord | null>;
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
  assistantActions: {
    create(
      input: Omit<AssistantActionRecord, "id" | "status" | "createdAt" | "decidedAt" | "result">,
    ): Promise<AssistantActionRecord>;
    /** Pendentes do colaborador, mais antigas primeiro (inclui as vencidas, que o serviço expira). */
    listPending(tenantId: string, userId: string): Promise<AssistantActionRecord[]>;
    update(
      id: string,
      patch: { status: AssistantActionStatus; decidedAt: Date; result?: string },
    ): Promise<AssistantActionRecord>;
  };
  notifications: {
    /** Registra o envio; devolve `false` se a chave já existia (não enviar de novo). */
    claim(tenantId: string, userId: string, kind: string, dedupeKey: string): Promise<boolean>;
    /** Desfaz o registro quando o envio falhou, para tentar de novo no próximo ciclo. */
    release(tenantId: string, dedupeKey: string): Promise<void>;
  };
  close(): Promise<void>;
}
