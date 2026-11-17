import type { DealSnapshotRecord, TenantRecord } from "../../store/types";
import { pilotUsers } from "../../modules/tenants/pilot";
import type { Bitrix24Portal } from "./portal";

/** Negócio como vem de crm.deal.list / crm.deal.get. */
export interface RawDeal {
  ID: string;
  TITLE?: string;
  CATEGORY_ID?: string;
  STAGE_ID?: string;
  ASSIGNED_BY_ID?: string;
  CLOSED?: "Y" | "N";
  MOVED_TIME?: string;
  DATE_CREATE?: string;
  [field: string]: unknown;
}

export interface CrmCatalog {
  categories: Map<string, string>;
  stages: Map<string, string>;
  /** Valores de campos de lista: campo → (ID do item → texto). */
  enums: Map<string, Map<string, string>>;
}

interface FieldMeta {
  type?: string;
  items?: { ID: string; VALUE: string }[];
}

const CATALOG_TTL_MS = 10 * 60_000;

/**
 * Leitura do CRM (somente leitura: não altera negócios, tarefas nem automações).
 * Converte negócios do Bitrix24 em fotografias usadas pelo motor e pelo dashboard.
 */
export class CrmReader {
  private readonly catalogs = new Map<string, { at: number; catalog: CrmCatalog }>();
  private readonly userNames = new Map<string, string>();

  constructor(private readonly portal: Bitrix24Portal) {}

  private selectFields(tenant: TenantRecord, ruleFields: readonly string[]): string[] {
    const mapped = Object.values(tenant.config.fieldMapping).filter(Boolean) as string[];
    return [
      ...new Set([
        "ID",
        "TITLE",
        "CATEGORY_ID",
        "STAGE_ID",
        "ASSIGNED_BY_ID",
        "CLOSED",
        "MOVED_TIME",
        "DATE_CREATE",
        ...mapped,
        ...ruleFields,
      ]),
    ];
  }

  /** `ruleFields`: campos usados pelas regras da empresa (`ruleFieldNames`). */
  async listOpenDeals(
    tenant: TenantRecord,
    ruleFields: readonly string[] = [],
  ): Promise<RawDeal[]> {
    return this.portal.callAll<RawDeal>(tenant, "crm.deal.list", {
      select: this.selectFields(tenant, ruleFields),
      filter: { CLOSED: "N", ...this.pilotFilter(tenant) },
      order: { ID: "ASC" },
    });
  }

  /** Modo piloto: o próprio Bitrix24 filtra — negócios de outros responsáveis nem chegam aqui. */
  private pilotFilter(tenant: TenantRecord): { ASSIGNED_BY_ID?: string[] } {
    const users = pilotUsers(tenant);
    return users ? { ASSIGNED_BY_ID: users } : {};
  }

  /** `null` se o negócio não existe — ou, no modo piloto, se não é de um usuário do piloto. */
  async getDeal(
    tenant: TenantRecord,
    dealId: string,
    ruleFields: readonly string[] = [],
  ): Promise<RawDeal | null> {
    if (pilotUsers(tenant)) {
      const response = await this.portal.call<RawDeal[]>(tenant, "crm.deal.list", {
        select: this.selectFields(tenant, ruleFields),
        filter: { ID: dealId, ...this.pilotFilter(tenant) },
      });
      return response.result?.[0] ?? null;
    }
    try {
      const response = await this.portal.call<RawDeal>(tenant, "crm.deal.get", { id: dealId });
      return response.result ?? null;
    } catch (error) {
      if (error instanceof Error && /not.?found/i.test(error.message)) return null;
      throw error;
    }
  }

  async catalog(tenant: TenantRecord, force = false): Promise<CrmCatalog> {
    const cached = this.catalogs.get(tenant.id);
    if (!force && cached && Date.now() - cached.at < CATALOG_TTL_MS) return cached.catalog;

    const categoriesResult = await this.portal.call<{ categories: { id: number; name: string }[] }>(
      tenant,
      "crm.category.list",
      { entityTypeId: 2 },
    );
    const categories = new Map<string, string>(
      (categoriesResult.result.categories ?? []).map((item) => [String(item.id), item.name]),
    );
    if (!categories.has("0")) categories.set("0", "Geral");

    const stages = new Map<string, string>();
    for (const categoryId of categories.keys()) {
      const entityId = categoryId === "0" ? "DEAL_STAGE" : `DEAL_STAGE_${categoryId}`;
      const list = await this.portal.callAll<{ STATUS_ID: string; NAME: string }>(
        tenant,
        "crm.status.list",
        { filter: { ENTITY_ID: entityId } },
      );
      for (const stage of list) stages.set(stage.STATUS_ID, stage.NAME);
    }

    const enums = new Map<string, Map<string, string>>();
    const mapped = Object.values(tenant.config.fieldMapping).filter(Boolean) as string[];
    if (mapped.length > 0) {
      const fields = await this.portal.call<Record<string, FieldMeta>>(tenant, "crm.deal.fields");
      for (const name of mapped) {
        const items = fields.result[name]?.items;
        if (items) enums.set(name, new Map(items.map((item) => [String(item.ID), item.VALUE])));
      }
    }

    const catalog = { categories, stages, enums };
    this.catalogs.set(tenant.id, { at: Date.now(), catalog });
    return catalog;
  }

  async userName(tenant: TenantRecord, userId: string): Promise<string> {
    const key = `${tenant.id}:${userId}`;
    const cached = this.userNames.get(key);
    if (cached) return cached;
    const response = await this.portal.call<{ NAME?: string; LAST_NAME?: string }[]>(
      tenant,
      "user.get",
      { ID: userId },
    );
    const user = response.result[0];
    const name = [user?.NAME, user?.LAST_NAME].filter(Boolean).join(" ") || `Usuário ${userId}`;
    this.userNames.set(key, name);
    return name;
  }

  async toSnapshot(
    tenant: TenantRecord,
    raw: RawDeal,
    ruleFields: readonly string[] = [],
  ): Promise<DealSnapshotRecord> {
    const catalog = await this.catalog(tenant);
    const categoryId = String(raw.CATEGORY_ID ?? "0");
    const stageId = String(raw.STAGE_ID ?? "");
    const assignedById = String(raw.ASSIGNED_BY_ID ?? "");
    const readField = (field: string | undefined): string | undefined => {
      if (!field) return undefined;
      const value = raw[field];
      const first = Array.isArray(value) ? value[0] : value;
      if (first === undefined || first === null || first === "") return undefined;
      return catalog.enums.get(field)?.get(String(first)) ?? String(first);
    };
    const branch = readField(tenant.config.fieldMapping.branch);
    const insuranceType = readField(tenant.config.fieldMapping.insuranceType);

    return {
      dealId: String(raw.ID),
      title: raw.TITLE?.trim() || `Negócio #${raw.ID}`,
      categoryId,
      categoryName: catalog.categories.get(categoryId) ?? `Pipeline ${categoryId}`,
      stageId,
      stageName: catalog.stages.get(stageId) ?? stageId,
      stageEnteredAt: new Date(raw.MOVED_TIME ?? raw.DATE_CREATE ?? Date.now()),
      assignedById,
      responsibleName: assignedById ? await this.userName(tenant, assignedById) : "Sem responsável",
      ...(branch ? { branch } : {}),
      ...(insuranceType ? { insuranceType } : {}),
      ...(ruleFields.length > 0 ? { fields: pickFields(raw, ruleFields) } : {}),
      closed: raw.CLOSED === "Y",
    };
  }
}

/**
 * Valores crus dos campos usados pelas regras: listas guardam o ID do item, datas o texto ISO do
 * Bitrix24. Objetos (arquivos, endereços) são ignorados — regras não os usam.
 */
export function pickFields(raw: RawDeal, names: readonly string[]): Record<string, string[]> {
  const toValues = (value: unknown): string[] => {
    if (value === undefined || value === null || value === "" || value === false) return [];
    if (Array.isArray(value)) return value.flatMap(toValues);
    if (typeof value === "object") return [];
    return [String(value)];
  };
  return Object.fromEntries(names.map((name) => [name, toValues(raw[name])]));
}
