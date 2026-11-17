import {
  evaluateDeal,
  ruleMode,
  type DealState,
  type EngineCommand,
  type RuleDefinition,
} from "@projacseg/engine";
import type { FastifyBaseLogger } from "fastify";
import type { DealSnapshotRecord, OccurrenceRecord, Store, TenantRecord } from "../../store/types";
import { inPilot } from "../tenants/pilot";
import { dealLink, engineMessages } from "./messages";
import type { DealSource, Notifier, SuperiorResolver } from "./ports";

interface EngineDeps {
  store: Store;
  source: DealSource;
  superiors: SuperiorResolver;
  notifier: Notifier;
  log: Pick<FastifyBaseLogger, "info" | "warn" | "error">;
  now?: () => Date;
}

const toState = (deal: DealSnapshotRecord): DealState => ({
  dealId: deal.dealId,
  categoryId: deal.categoryId,
  stageId: deal.stageId,
  stageEnteredAt: deal.stageEnteredAt,
  assignedById: deal.assignedById,
  closed: deal.closed,
  ...(deal.fields ? { fields: deal.fields } : {}),
});

/**
 * Executa o motor de regras sobre os negócios de uma empresa e persiste o resultado: ocorrências,
 * histórico (somente inserção) e mensagens. Não depende de IA.
 */
export class EngineService {
  private readonly now: () => Date;

  constructor(private readonly deps: EngineDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  /** Reavalia um negócio buscando o estado atual no CRM (eventos de alteração). */
  async syncDeal(tenant: TenantRecord, dealId: string): Promise<void> {
    const fresh = await this.deps.source.getDeal(tenant, dealId);
    if (fresh) {
      await this.deps.store.deals.upsert(tenant.id, fresh);
      await this.evaluate(tenant, fresh);
      return;
    }
    // Negócio excluído: encerra o que estiver aberto como fechado.
    const known = await this.deps.store.deals.get(tenant.id, dealId);
    if (known) {
      const closed = { ...known, closed: true };
      await this.deps.store.deals.upsert(tenant.id, closed);
      await this.evaluate(tenant, closed);
    }
  }

  /** Sincronização completa: todos os negócios abertos + confirmação dos que sumiram da lista. */
  async fullSync(tenant: TenantRecord): Promise<{ deals: number }> {
    const deals = await this.deps.source.listOpenDeals(tenant);
    const seen = new Set<string>();
    for (const deal of deals) {
      seen.add(deal.dealId);
      await this.deps.store.deals.upsert(tenant.id, deal);
      await this.evaluate(tenant, deal);
    }
    const open = await this.deps.store.occurrences.listOpen(tenant.id);
    const missing = [...new Set(open.map((item) => item.dealId))].filter((id) => !seen.has(id));
    for (const dealId of missing) await this.syncDeal(tenant, dealId);
    return { deals: deals.length };
  }

  /** Ciclo periódico: transições por tempo das ocorrências abertas, sem chamar o CRM. */
  async tick(tenant: TenantRecord): Promise<void> {
    const open = await this.deps.store.occurrences.listOpen(tenant.id);
    for (const dealId of new Set(open.map((item) => item.dealId))) {
      const deal = await this.deps.store.deals.get(tenant.id, dealId);
      if (deal) await this.evaluate(tenant, deal);
    }
  }

  async evaluate(tenant: TenantRecord, deal: DealSnapshotRecord): Promise<void> {
    const rules = await this.deps.store.rules.list(tenant.id);
    const open = await this.deps.store.occurrences.listOpenByDeal(tenant.id, deal.dealId);
    const commands = evaluateDeal(toState(deal), rules, open, tenant.config.calendar, this.now(), {
      roles: tenant.config.roles ?? {},
    });
    if (commands.length === 0) return;

    const rulesByCode = new Map(rules.map((rule) => [rule.code, rule]));
    const byId = new Map(open.map((item) => [item.id, item]));
    for (const command of commands) {
      try {
        await this.apply(tenant, deal, command, rulesByCode, byId);
      } catch (error) {
        this.deps.log.error(
          { err: error, command: command.type, dealId: deal.dealId },
          "Falha ao aplicar comando do motor.",
        );
      }
    }
  }

  private async event(
    occurrence: OccurrenceRecord,
    type: string,
    payload: Record<string, unknown> = {},
  ) {
    await this.deps.store.occurrences.appendEvent({
      occurrenceId: occurrence.id,
      tenantId: occurrence.tenantId,
      type,
      actor: "engine",
      payload,
      createdAt: this.now(),
    });
  }

  /**
   * Envia pelo bot — exceto em regras em **modo sombra**, cujas mensagens ficam só registradas no
   * histórico (`notification_suppressed`) para comparar com as automações do Bitrix24.
   */
  private async notify(
    tenant: TenantRecord,
    rule: RuleDefinition | undefined,
    occurrence: OccurrenceRecord,
    userId: string,
    kind: string,
    dedupeKey: string,
    message: string,
  ): Promise<void> {
    if (!rule || ruleMode(rule) === "shadow") {
      await this.event(occurrence, "notification_suppressed", { kind, to: userId, mode: "shadow" });
      return;
    }
    if (!inPilot(tenant, userId)) {
      await this.event(occurrence, "notification_suppressed", { kind, to: userId, mode: "pilot" });
      return;
    }
    await this.deps.notifier.notify(tenant, userId, kind, dedupeKey, message);
  }

  /** Destinatários de um nível: superior no organograma e/ou papéis da empresa, sem repetição. */
  private async escalationRecipients(
    tenant: TenantRecord,
    rule: RuleDefinition | undefined,
    responsibleId: string,
    level: number,
  ): Promise<{ superiorId?: string; recipients: string[] }> {
    const config = rule?.escalation.levels?.[level - 1];
    const recipients: string[] = [];
    let superiorId: string | undefined;
    if (!config || config.superior) {
      superiorId = (await this.deps.superiors.superiors(tenant, responsibleId, level))[level - 1];
      if (superiorId) recipients.push(superiorId);
    }
    for (const role of config?.roles ?? []) {
      const userId = tenant.config.roles?.[role];
      if (userId && userId !== responsibleId && !recipients.includes(userId))
        recipients.push(userId);
    }
    return { ...(superiorId ? { superiorId } : {}), recipients };
  }

  private async apply(
    tenant: TenantRecord,
    deal: DealSnapshotRecord,
    command: EngineCommand,
    rules: Map<string, RuleDefinition>,
    open: Map<string, OccurrenceRecord>,
  ): Promise<void> {
    const { store } = this.deps;
    const calendar = tenant.config.calendar;
    const link = dealLink(tenant.domain, deal.dealId, deal.title);

    if (command.type === "open") {
      const { type: _type, ...fields } = command;
      const { record, created } = await store.occurrences.create({
        tenantId: tenant.id,
        ...fields,
      });
      if (created) {
        await this.event(record, "opened", {
          ruleCode: command.ruleCode,
          stageId: command.stageId,
          dueAt: command.dueAt.toISOString(),
        });
      }
      open.set(record.id, record);
      return;
    }

    const occurrence = open.get(command.occurrenceId);
    if (!occurrence) return;
    const rule = rules.get(occurrence.ruleCode);
    const action = rule?.action ?? occurrence.ruleCode;

    switch (command.type) {
      case "resolve": {
        const updated = await store.occurrences.update(occurrence.id, {
          status: "resolved",
          resolvedAt: this.now(),
          resolveReason: command.reason,
        });
        await this.event(updated, "resolved", { reason: command.reason });
        return;
      }
      case "reassign": {
        const updated = await store.occurrences.update(occurrence.id, {
          responsibleId: command.responsibleId,
        });
        await this.event(updated, "reassigned", {
          from: occurrence.responsibleId,
          to: command.responsibleId,
        });
        open.set(updated.id, updated);
        return;
      }
      case "mark_at_risk": {
        const updated = await store.occurrences.update(occurrence.id, { status: "at_risk" });
        await this.event(updated, "at_risk");
        await this.notify(
          tenant,
          rule,
          updated,
          updated.responsibleId,
          "at_risk",
          `at_risk:${updated.id}`,
          engineMessages.atRisk(action, link, updated.dueAt, calendar),
        );
        return;
      }
      case "mark_overdue": {
        const updated = await store.occurrences.update(occurrence.id, { status: "overdue" });
        open.set(updated.id, updated);
        await this.event(updated, "overdue");
        await this.notify(
          tenant,
          rule,
          updated,
          updated.responsibleId,
          "overdue",
          `overdue:${updated.id}`,
          engineMessages.overdue(
            action,
            link,
            updated.dueAt,
            (rule?.escalation.maxLevels ?? 0) > 0,
            calendar,
          ),
        );
        return;
      }
      case "escalate": {
        const updated = await store.occurrences.update(occurrence.id, {
          escalationLevel: command.level,
        });
        open.set(updated.id, updated);
        const { superiorId, recipients } = await this.escalationRecipients(
          tenant,
          rule,
          updated.responsibleId,
          command.level,
        );
        if (recipients.length === 0) {
          await this.event(updated, "escalation_target_missing", { level: command.level });
          this.deps.log.warn(
            { tenant: tenant.domain, dealId: deal.dealId, level: command.level },
            "Sem destinatário para este nível de escalonamento (organograma ou papéis).",
          );
          return;
        }
        await this.event(updated, "escalated", {
          level: command.level,
          recipients,
          ...(superiorId ? { superiorId } : {}),
        });
        for (const recipient of recipients) {
          await this.notify(
            tenant,
            rule,
            updated,
            recipient,
            "escalation",
            `escalation:${updated.id}:${command.level}:${recipient === superiorId ? "superior" : recipient}`,
            engineMessages.escalationToSuperior(
              action,
              link,
              deal.responsibleName,
              updated.dueAt,
              command.level,
              calendar,
            ),
          );
        }
        await this.notify(
          tenant,
          rule,
          updated,
          updated.responsibleId,
          "escalation",
          `escalation:${updated.id}:${command.level}:responsible`,
          engineMessages.escalationToResponsible(action, link, command.level),
        );
        return;
      }
    }
  }
}
