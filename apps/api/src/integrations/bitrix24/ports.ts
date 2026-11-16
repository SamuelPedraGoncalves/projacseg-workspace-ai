import type {
  Bitrix24Deal,
  Bitrix24Department,
  Bitrix24Event,
  Bitrix24Portal,
  Bitrix24Task,
  Bitrix24Tokens,
  Bitrix24User,
} from "./types";

/**
 * Portas (interfaces) da integração com o Bitrix24. As implementações reais entram após a
 * homologação, em ambiente de testes — nunca em produção sem autorização.
 *
 * Regras:
 * - Todas as operações são escopadas por `tenantId` (multiempresa).
 * - Leitura respeita as permissões do usuário no Bitrix24 (chamadas feitas com o token do usuário,
 *   não com um token administrativo genérico).
 * - Nenhuma porta altera ou desativa automações existentes.
 */

/** Autenticação OAuth 2.0 do aplicativo Bitrix24. */
export interface Bitrix24OAuthPort {
  buildAuthorizationUrl(portalDomain: string, state: string): string;
  exchangeCode(
    code: string,
    portalDomain: string,
  ): Promise<{ portal: Bitrix24Portal; tokens: Bitrix24Tokens }>;
  refresh(tenantId: string, refreshToken: string): Promise<Bitrix24Tokens>;
}

/** Identificação do portal (tenant) a partir do domínio ou do member_id recebido do Bitrix24. */
export interface PortalResolverPort {
  resolveByDomain(domain: string): Promise<Bitrix24Portal | null>;
  resolveByMemberId(memberId: string): Promise<Bitrix24Portal | null>;
}

/** Identificação do usuário autenticado e consulta de colaboradores. */
export interface UserDirectoryPort {
  getCurrentUser(tenantId: string, accessToken: string): Promise<Bitrix24User>;
  getUser(tenantId: string, userId: string): Promise<Bitrix24User | null>;
}

/** Consulta de negócios (somente leitura nesta fase). */
export interface DealGatewayPort {
  listByResponsible(tenantId: string, userId: string): Promise<Bitrix24Deal[]>;
  getById(tenantId: string, dealId: string): Promise<Bitrix24Deal | null>;
}

/** Consulta de tarefas vinculadas a negócios. */
export interface TaskGatewayPort {
  listByResponsible(tenantId: string, userId: string): Promise<Bitrix24Task[]>;
  listByDeal(tenantId: string, dealId: string): Promise<Bitrix24Task[]>;
}

/** Estrutura organizacional. */
export interface DepartmentGatewayPort {
  listDepartments(tenantId: string): Promise<Bitrix24Department[]>;
}

/**
 * Identificação dos superiores para escalonamento. Percorre a árvore de departamentos do Bitrix24;
 * o escalonamento é automático e não pode ser impedido pelo comercial.
 */
export interface HierarchyResolverPort {
  getSuperiors(tenantId: string, userId: string): Promise<Bitrix24User[]>;
}

/** Recebimento de eventos (webhooks de saída do Bitrix24). Validar `application_token`. */
export interface EventSubscriptionPort {
  subscribe(tenantId: string, events: Bitrix24Event["event"][], handlerUrl: string): Promise<void>;
  verify(tenantId: string, applicationToken: string): Promise<boolean>;
}

/** Notificações dentro do Bitrix24 (im.notify). */
export interface NotificationPort {
  notifyUser(tenantId: string, userId: string, message: string): Promise<void>;
}

/** Endereço para abrir um negócio dentro do CRM. Domínio vem do portal, nunca fixo. */
export interface CrmLinkPort {
  dealUrl(portal: Bitrix24Portal, dealId: string): string;
}
