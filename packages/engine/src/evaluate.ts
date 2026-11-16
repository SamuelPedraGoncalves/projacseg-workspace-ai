import { addDuration, type BusinessCalendar } from "./calendar";
import { ruleApplies, type RuleDefinition } from "./rules";

/** Estado do negócio no CRM, já normalizado. */
export interface DealState {
  dealId: string;
  categoryId: string;
  stageId: string;
  /** Quando entrou na etapa atual (MOVED_TIME do Bitrix24). Os prazos contam daqui. */
  stageEnteredAt: Date;
  assignedById: string;
  closed: boolean;
}

export type OccurrenceStatus = "open" | "at_risk" | "overdue" | "resolved";

export interface OccurrenceState {
  id: string;
  ruleCode: string;
  dealId: string;
  stageId: string;
  /** Identifica a passagem pela etapa: uma ocorrência por regra por entrada na etapa. */
  stageEnteredAt: Date;
  responsibleId: string;
  openedAt: Date;
  dueAt: Date;
  riskAt: Date;
  status: OccurrenceStatus;
  escalationLevel: number;
}

export type ResolveReason = "stage_changed" | "deal_closed" | "rule_disabled";

export type EngineCommand =
  | {
      type: "open";
      ruleCode: string;
      dealId: string;
      stageId: string;
      stageEnteredAt: Date;
      responsibleId: string;
      openedAt: Date;
      dueAt: Date;
      riskAt: Date;
    }
  | { type: "resolve"; occurrenceId: string; reason: ResolveReason }
  | { type: "reassign"; occurrenceId: string; responsibleId: string }
  | { type: "mark_at_risk"; occurrenceId: string }
  | { type: "mark_overdue"; occurrenceId: string }
  | { type: "escalate"; occurrenceId: string; level: number };

/** Momento em que a ocorrência atinge o nível de escalonamento `level` (1 = no vencimento). */
export function escalationDueAt(
  occurrence: Pick<OccurrenceState, "dueAt">,
  rule: RuleDefinition,
  level: number,
  calendar: BusinessCalendar,
): Date {
  let at = occurrence.dueAt;
  for (let step = 1; step < level; step += 1)
    at = addDuration(at, rule.escalation.interval, calendar);
  return at;
}

function sameInstant(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

/**
 * Avalia um negócio e devolve os comandos necessários. Função pura e determinística: mesma entrada,
 * mesma saída — não depende de IA, rede ou relógio do sistema (o `now` é parâmetro).
 *
 * Não existe comando para cancelar ou adiar escalonamento: a ocorrência só termina quando o negócio
 * realmente avança (sai da etapa) ou é fechado.
 */
export function evaluateDeal(
  deal: DealState,
  rules: readonly RuleDefinition[],
  openOccurrences: readonly OccurrenceState[],
  calendar: BusinessCalendar,
  now: Date,
): EngineCommand[] {
  const commands: EngineCommand[] = [];
  const rulesByCode = new Map(rules.map((rule) => [rule.code, rule]));
  const open = openOccurrences.filter(
    (item) => item.dealId === deal.dealId && item.status !== "resolved",
  );

  // 1. Encerrar o que deixou de valer.
  const stillOpen: OccurrenceState[] = [];
  for (const occurrence of open) {
    const rule = rulesByCode.get(occurrence.ruleCode);
    if (deal.closed) {
      commands.push({ type: "resolve", occurrenceId: occurrence.id, reason: "deal_closed" });
    } else if (
      occurrence.stageId !== deal.stageId ||
      !sameInstant(occurrence.stageEnteredAt, deal.stageEnteredAt)
    ) {
      commands.push({ type: "resolve", occurrenceId: occurrence.id, reason: "stage_changed" });
    } else if (!rule || !rule.enabled) {
      commands.push({ type: "resolve", occurrenceId: occurrence.id, reason: "rule_disabled" });
    } else {
      stillOpen.push(occurrence);
    }
  }
  if (deal.closed) return commands;

  // 2. Abrir ocorrências das regras que se aplicam à etapa atual.
  for (const rule of rules) {
    if (!ruleApplies(rule, deal)) continue;
    if (stillOpen.some((item) => item.ruleCode === rule.code)) continue;
    const openedAt = deal.stageEnteredAt;
    const dueAt = addDuration(openedAt, rule.deadline, calendar);
    const riskAt = new Date(
      openedAt.getTime() + (dueAt.getTime() - openedAt.getTime()) * rule.riskAtRatio,
    );
    commands.push({
      type: "open",
      ruleCode: rule.code,
      dealId: deal.dealId,
      stageId: deal.stageId,
      stageEnteredAt: deal.stageEnteredAt,
      responsibleId: deal.assignedById,
      openedAt,
      dueAt,
      riskAt,
    });
    // Recém-aberta mas já vencida/arriscada (ex.: sincronização tardia): avança no próximo ciclo,
    // quando já tiver ID. Mantém cada comando simples e auditável.
  }

  // 3. Transições por tempo e responsável.
  for (const occurrence of stillOpen) {
    const rule = rulesByCode.get(occurrence.ruleCode)!;
    if (occurrence.responsibleId !== deal.assignedById) {
      commands.push({
        type: "reassign",
        occurrenceId: occurrence.id,
        responsibleId: deal.assignedById,
      });
    }
    if (now >= occurrence.dueAt) {
      if (occurrence.status !== "overdue") {
        commands.push({ type: "mark_overdue", occurrenceId: occurrence.id });
      }
      let level = occurrence.escalationLevel;
      while (
        level < rule.escalation.maxLevels &&
        now >= escalationDueAt(occurrence, rule, level + 1, calendar)
      ) {
        level += 1;
        commands.push({ type: "escalate", occurrenceId: occurrence.id, level });
      }
    } else if (now >= occurrence.riskAt && occurrence.status === "open") {
      commands.push({ type: "mark_at_risk", occurrenceId: occurrence.id });
    }
  }

  return commands;
}

/** Aplica um comando a um estado (usado em memória e nos testes; o backend persiste o mesmo efeito). */
export function applyCommand(
  occurrence: OccurrenceState,
  command: Exclude<EngineCommand, { type: "open" }>,
): OccurrenceState {
  switch (command.type) {
    case "resolve":
      return { ...occurrence, status: "resolved" };
    case "reassign":
      return { ...occurrence, responsibleId: command.responsibleId };
    case "mark_at_risk":
      return { ...occurrence, status: "at_risk" };
    case "mark_overdue":
      return { ...occurrence, status: "overdue" };
    case "escalate":
      return { ...occurrence, escalationLevel: command.level };
  }
}
