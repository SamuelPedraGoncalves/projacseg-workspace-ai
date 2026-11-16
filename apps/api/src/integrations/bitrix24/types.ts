/**
 * Tipos da integração com o Bitrix24. Somente contratos — nenhuma chamada real nesta etapa.
 * Referência: REST API do Bitrix24 (crm.deal.*, tasks.task.*, department.get, user.get, im.notify.*).
 */

/** Portal Bitrix24 de uma empresa cliente. Um tenant = um portal. */
export interface Bitrix24Portal {
  tenantId: string;
  /** Domínio do portal, ex.: "empresa.bitrix24.com.br". Vem do OAuth, nunca fixo em código. */
  domain: string;
  memberId: string;
}

/** Tokens OAuth. Ficam apenas no backend, criptografados em repouso. Nunca vão ao navegador. */
export interface Bitrix24Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface Bitrix24User {
  id: string;
  name: string;
  email?: string;
  departmentIds: string[];
  active: boolean;
}

export interface Bitrix24Department {
  id: string;
  name: string;
  parentId?: string;
  /** Chefe do departamento (UF_HEAD). Base para identificar superiores. */
  headUserId?: string;
}

export interface Bitrix24Deal {
  id: string;
  title: string;
  categoryId: string;
  stageId: string;
  assignedById: string;
  /** Campos personalizados (UF_CRM_*) brutos; interpretados via `TenantFieldMapping`. */
  customFields: Record<string, unknown>;
  dateModify: Date;
}

export interface Bitrix24Task {
  id: string;
  title: string;
  responsibleId: string;
  deadline?: Date;
  status: string;
  /** Vínculos CRM no formato do Bitrix24, ex.: "D_123" para negócio. */
  crmBindings: string[];
}

/** Eventos do Bitrix24 assinados pela aplicação. */
export type Bitrix24EventName = "ONCRMDEALUPDATE" | "ONCRMDEALADD" | "ONTASKUPDATE";

export interface Bitrix24Event {
  event: Bitrix24EventName;
  tenantId: string;
  entityId: string;
  receivedAt: Date;
}

/**
 * Mapeamento por empresa. Pipelines, etapas e campos personalizados variam entre portais, por isso
 * NUNCA ficam fixos no código: são configuração persistida por tenant.
 */
export interface TenantFieldMapping {
  tenantId: string;
  pipelines: { categoryId: string; label: string }[];
  fields: {
    /** Campo que guarda o ramo do seguro. */
    branch?: string;
    /** Campo que guarda o tipo (novo/renovação). */
    insuranceType?: string;
  };
}
