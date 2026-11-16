import { randomUUID } from "node:crypto";
import type { RuleDefinition } from "@projacseg/engine";
import type {
  DealSnapshotRecord,
  OccurrenceEventRecord,
  OccurrenceRecord,
  Store,
  TenantRecord,
} from "./types";

const clone = <T>(value: T): T => structuredClone(value);

const NEW_OCCURRENCE_FIELDS = new Set([
  "tenantId",
  "ruleCode",
  "dealId",
  "stageId",
  "stageEnteredAt",
  "responsibleId",
  "openedAt",
  "dueAt",
  "riskAt",
]);

/** Armazenamento em memória: desenvolvimento sem banco e testes. Os dados somem ao reiniciar. */
export function createMemoryStore(): Store {
  const tenants = new Map<string, TenantRecord>();
  const rules = new Map<string, RuleDefinition[]>();
  const deals = new Map<string, DealSnapshotRecord>();
  const occurrences = new Map<string, OccurrenceRecord>();
  const events: OccurrenceEventRecord[] = [];
  const notifications = new Set<string>();

  const dealKey = (tenantId: string, dealId: string) => `${tenantId}\u0000${dealId}`;
  const findTenant = (predicate: (tenant: TenantRecord) => boolean) => {
    const found = [...tenants.values()].find(predicate);
    return found ? clone(found) : null;
  };

  return {
    tenants: {
      findById: async (id) => findTenant((tenant) => tenant.id === id),
      findByMemberId: async (memberId) => findTenant((tenant) => tenant.memberId === memberId),
      findByDomain: async (domain) => findTenant((tenant) => tenant.domain === domain),
      list: async () => [...tenants.values()].map(clone),
      upsert: async (input) => {
        const existing = [...tenants.values()].find((tenant) => tenant.memberId === input.memberId);
        const record: TenantRecord = { ...input, id: existing?.id ?? randomUUID() };
        tenants.set(record.id, clone(record));
        return clone(record);
      },
      update: async (id, patch) => {
        const existing = tenants.get(id);
        if (!existing) throw new Error(`Tenant inexistente: ${id}`);
        const record = { ...existing, ...patch, id };
        tenants.set(id, clone(record));
        return clone(record);
      },
    },
    rules: {
      list: async (tenantId) => clone(rules.get(tenantId) ?? []),
      replaceAll: async (tenantId, list) => void rules.set(tenantId, clone(list)),
    },
    deals: {
      upsert: async (tenantId, deal) => void deals.set(dealKey(tenantId, deal.dealId), clone(deal)),
      get: async (tenantId, dealId) => {
        const found = deals.get(dealKey(tenantId, dealId));
        return found ? clone(found) : null;
      },
      list: async (tenantId) =>
        [...deals.entries()]
          .filter(([key]) => key.startsWith(`${tenantId}\u0000`))
          .map(([, deal]) => clone(deal)),
      listByAssignee: async (tenantId, userId) =>
        [...deals.entries()]
          .filter(
            ([key, deal]) => key.startsWith(`${tenantId}\u0000`) && deal.assignedById === userId,
          )
          .map(([, deal]) => clone(deal)),
    },
    occurrences: {
      create: async (input) => {
        const existing = [...occurrences.values()].find(
          (item) =>
            item.tenantId === input.tenantId &&
            item.dealId === input.dealId &&
            item.ruleCode === input.ruleCode &&
            item.stageEnteredAt.getTime() === input.stageEnteredAt.getTime(),
        );
        if (existing) return { record: clone(existing), created: false };
        // Mesmo comportamento do banco: campos fora do contrato são recusados.
        const unknown = Object.keys(input).filter((key) => !NEW_OCCURRENCE_FIELDS.has(key));
        if (unknown.length > 0) throw new Error(`Campos desconhecidos: ${unknown.join(", ")}`);
        const record: OccurrenceRecord = {
          ...input,
          id: randomUUID(),
          status: "open",
          escalationLevel: 0,
        };
        occurrences.set(record.id, clone(record));
        return { record: clone(record), created: true };
      },
      update: async (id, patch) => {
        const existing = occurrences.get(id);
        if (!existing) throw new Error(`Ocorrência inexistente: ${id}`);
        const record = { ...existing, ...patch };
        occurrences.set(id, clone(record));
        return clone(record);
      },
      get: async (id) => {
        const found = occurrences.get(id);
        return found ? clone(found) : null;
      },
      listOpenByDeal: async (tenantId, dealId) =>
        [...occurrences.values()]
          .filter(
            (item) =>
              item.tenantId === tenantId && item.dealId === dealId && item.status !== "resolved",
          )
          .map(clone),
      listOpen: async (tenantId) =>
        [...occurrences.values()]
          .filter((item) => item.tenantId === tenantId && item.status !== "resolved")
          .map(clone),
      listForDeals: async (tenantId, dealIds, resolvedSince) =>
        [...occurrences.values()]
          .filter(
            (item) =>
              item.tenantId === tenantId &&
              dealIds.includes(item.dealId) &&
              (item.status !== "resolved" || (item.resolvedAt && item.resolvedAt >= resolvedSince)),
          )
          .map(clone),
      appendEvent: async (event) => {
        events.push(clone({ ...event, createdAt: event.createdAt ?? new Date() }));
      },
      listEvents: async (occurrenceId) =>
        events.filter((event) => event.occurrenceId === occurrenceId).map(clone),
    },
    notifications: {
      claim: async (tenantId, _userId, _kind, dedupeKey) => {
        const key = `${tenantId}\u0000${dedupeKey}`;
        if (notifications.has(key)) return false;
        notifications.add(key);
        return true;
      },
      release: async (tenantId, dedupeKey) =>
        void notifications.delete(`${tenantId}\u0000${dedupeKey}`),
    },
    close: async () => undefined,
  };
}
