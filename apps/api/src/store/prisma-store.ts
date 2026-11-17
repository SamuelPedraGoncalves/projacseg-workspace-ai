import { PrismaPg } from "@prisma/adapter-pg";
import type { OccurrenceStatus, RuleDefinition } from "@projacseg/engine";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import type {
  DealSnapshotRecord,
  OccurrenceRecord,
  Store,
  TenantConfig,
  TenantRecord,
} from "./types";

type TenantRow = Prisma.TenantGetPayload<object>;
type OccurrenceRow = Prisma.OccurrenceGetPayload<object>;
type DealRow = Prisma.DealSnapshotGetPayload<object>;

const toTenant = (row: TenantRow): TenantRecord => ({
  id: row.id,
  domain: row.domain,
  memberId: row.memberId,
  clientEndpoint: row.clientEndpoint,
  applicationToken: row.applicationToken,
  accessTokenEnc: row.accessTokenEnc,
  refreshTokenEnc: row.refreshTokenEnc,
  tokenExpiresAt: row.tokenExpiresAt,
  config: row.config as unknown as TenantConfig,
});

const toOccurrence = (row: OccurrenceRow): OccurrenceRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  ruleCode: row.ruleCode,
  dealId: row.dealId,
  stageId: row.stageId,
  stageEnteredAt: row.stageEnteredAt,
  responsibleId: row.responsibleId,
  openedAt: row.openedAt,
  dueAt: row.dueAt,
  riskAt: row.riskAt,
  status: row.status as OccurrenceStatus,
  escalationLevel: row.escalationLevel,
  ...(row.resolvedAt ? { resolvedAt: row.resolvedAt } : {}),
  ...(row.resolveReason ? { resolveReason: row.resolveReason } : {}),
});

const toDeal = (row: DealRow): DealSnapshotRecord => ({
  dealId: row.dealId,
  title: row.title,
  categoryId: row.categoryId,
  categoryName: row.categoryName,
  stageId: row.stageId,
  stageName: row.stageName,
  stageEnteredAt: row.stageEnteredAt,
  assignedById: row.assignedById,
  responsibleName: row.responsibleName,
  ...(row.branch ? { branch: row.branch } : {}),
  ...(row.insuranceType ? { insuranceType: row.insuranceType } : {}),
  ...(row.fields ? { fields: row.fields as Record<string, string[]> } : {}),
  closed: row.closed,
});

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** Armazenamento em PostgreSQL via Prisma (driver adapter `pg`). */
export function createPrismaStore(databaseUrl: string): Store {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  return {
    tenants: {
      findById: async (id) => {
        const row = await db.tenant.findUnique({ where: { id } });
        return row ? toTenant(row) : null;
      },
      findByMemberId: async (memberId) => {
        const row = await db.tenant.findUnique({ where: { memberId } });
        return row ? toTenant(row) : null;
      },
      findByDomain: async (domain) => {
        const row = await db.tenant.findUnique({ where: { domain } });
        return row ? toTenant(row) : null;
      },
      list: async () => (await db.tenant.findMany()).map(toTenant),
      upsert: async (input) => {
        const data = { ...input, config: json(input.config) };
        const row = await db.tenant.upsert({
          where: { memberId: input.memberId },
          create: data,
          update: data,
        });
        return toTenant(row);
      },
      update: async (id, patch) => {
        const { config, ...rest } = patch;
        const row = await db.tenant.update({
          where: { id },
          data: { ...rest, ...(config ? { config: json(config) } : {}) },
        });
        return toTenant(row);
      },
    },
    rules: {
      list: async (tenantId) =>
        (await db.rule.findMany({ where: { tenantId }, orderBy: { code: "asc" } })).map(
          (row) => row.definition as unknown as RuleDefinition,
        ),
      replaceAll: async (tenantId, rules) => {
        await db.$transaction([
          db.rule.deleteMany({ where: { tenantId } }),
          db.rule.createMany({
            data: rules.map((rule) => ({
              tenantId,
              code: rule.code,
              definition: json(rule),
              enabled: rule.enabled,
              homologated: rule.homologated,
            })),
          }),
        ]);
      },
    },
    deals: {
      upsert: async (tenantId, deal) => {
        const data = {
          title: deal.title,
          categoryId: deal.categoryId,
          categoryName: deal.categoryName,
          stageId: deal.stageId,
          stageName: deal.stageName,
          stageEnteredAt: deal.stageEnteredAt,
          assignedById: deal.assignedById,
          responsibleName: deal.responsibleName,
          branch: deal.branch ?? null,
          insuranceType: deal.insuranceType ?? null,
          closed: deal.closed,
          fields: deal.fields ? json(deal.fields) : Prisma.DbNull,
          syncedAt: new Date(),
        };
        await db.dealSnapshot.upsert({
          where: { tenantId_dealId: { tenantId, dealId: deal.dealId } },
          create: { tenantId, dealId: deal.dealId, ...data },
          update: data,
        });
      },
      get: async (tenantId, dealId) => {
        const row = await db.dealSnapshot.findUnique({
          where: { tenantId_dealId: { tenantId, dealId } },
        });
        return row ? toDeal(row) : null;
      },
      list: async (tenantId) =>
        (await db.dealSnapshot.findMany({ where: { tenantId } })).map(toDeal),
      listByAssignee: async (tenantId, assignedById) =>
        (await db.dealSnapshot.findMany({ where: { tenantId, assignedById } })).map(toDeal),
    },
    occurrences: {
      create: async (input) => {
        try {
          const row = await db.occurrence.create({ data: { ...input, status: "open" } });
          return { record: toOccurrence(row), created: true };
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const row = await db.occurrence.findUniqueOrThrow({
              where: {
                tenantId_dealId_ruleCode_stageEnteredAt: {
                  tenantId: input.tenantId,
                  dealId: input.dealId,
                  ruleCode: input.ruleCode,
                  stageEnteredAt: input.stageEnteredAt,
                },
              },
            });
            return { record: toOccurrence(row), created: false };
          }
          throw error;
        }
      },
      update: async (id, patch) =>
        toOccurrence(await db.occurrence.update({ where: { id }, data: patch })),
      get: async (id) => {
        const row = await db.occurrence.findUnique({ where: { id } });
        return row ? toOccurrence(row) : null;
      },
      listOpenByDeal: async (tenantId, dealId) =>
        (
          await db.occurrence.findMany({ where: { tenantId, dealId, status: { not: "resolved" } } })
        ).map(toOccurrence),
      listOpen: async (tenantId) =>
        (await db.occurrence.findMany({ where: { tenantId, status: { not: "resolved" } } })).map(
          toOccurrence,
        ),
      listForDeals: async (tenantId, dealIds, resolvedSince) =>
        (
          await db.occurrence.findMany({
            where: {
              tenantId,
              dealId: { in: dealIds },
              OR: [{ status: { not: "resolved" } }, { resolvedAt: { gte: resolvedSince } }],
            },
          })
        ).map(toOccurrence),
      appendEvent: async (event) => {
        await db.occurrenceEvent.create({
          data: {
            occurrenceId: event.occurrenceId,
            tenantId: event.tenantId,
            type: event.type,
            actor: event.actor,
            payload: json(event.payload),
          },
        });
      },
      listEvents: async (occurrenceId) =>
        (
          await db.occurrenceEvent.findMany({
            where: { occurrenceId },
            orderBy: { createdAt: "asc" },
          })
        ).map((row) => ({
          occurrenceId: row.occurrenceId,
          tenantId: row.tenantId,
          type: row.type,
          actor: row.actor,
          payload: row.payload as Record<string, unknown>,
          createdAt: row.createdAt,
        })),
    },
    notifications: {
      claim: async (tenantId, userId, kind, dedupeKey) => {
        try {
          await db.notificationLog.create({ data: { tenantId, userId, kind, dedupeKey } });
          return true;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return false;
          }
          throw error;
        }
      },
      release: async (tenantId, dedupeKey) => {
        await db.notificationLog.deleteMany({ where: { tenantId, dedupeKey } });
      },
    },
    close: () => db.$disconnect(),
  };
}
