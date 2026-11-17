import { addDuration, parseFieldDate, subtractDuration, type BusinessCalendar } from "./calendar";
import { conditionsHold, ruleApplies, type DealFields, type RuleDefinition } from "./rules";

/** Estado do negócio no CRM, já normalizado. */
export interface DealState {
  dealId: string;
  categoryId: string;
  stageId: string;
  /** Quando entrou na etapa atual (MOVED_TIME do Bitrix24). Os prazos contam daqui. */
  stageEnteredAt: Date;
  assignedById: string;
  closed: boolean;
  /** Campos usados pelas regras (condições, datas, responsável por campo). */
  fields?: DealFields;
}

/** Configuração da empresa usada na avaliação. */
export interface EngineContext {
  /** Papel → ID do usuário no Bitrix24 (`tenants/<domínio>.json`). */
  roles?: Readonly<Record<string, string>>;
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

export type ResolveReason = "stage_changed" | "deal_closed" | "rule_disabled" | "completed";

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

/** Responsável pela ocorrência segundo a regra (padrão: responsável do negócio). */
export function responsibleFor(
  rule: RuleDefinition,
  deal: Pick<DealState, "assignedById" | "fields">,
  context: EngineContext = {},
): string {
  const source = rule.responsible;
  if (source?.from === "role") return context.roles?.[source.role] ?? deal.assignedById;
  if (source?.from === "field") {
    const value = deal.fields?.[source.field]?.[0];
    if (value && /^\d+$/.test(value)) return value;
  }
  return deal.assignedById;
}

/** Vencimento da regra para a passagem atual pela etapa; `null` se a data de referência falta. */
function dueDateFor(
  rule: RuleDefinition,
  deal: DealState,
  calendar: BusinessCalendar,
): Date | null {
  if (!rule.deadlineFrom) return addDuration(deal.stageEnteredAt, rule.deadline, calendar);
  const anchor = parseFieldDate(deal.fields?.[rule.deadlineFrom.field]?.[0], calendar);
  if (!anchor) return null;
  return rule.deadlineFrom.direction === "after"
    ? addDuration(anchor, rule.deadline, calendar)
    : subtractDuration(anchor, rule.deadline, calendar);
}

function sameInstant(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

/**
 * Avalia um negócio e devolve os comandos necessários. Função pura e determinística: mesma entrada,
 * mesma saída — não depende de IA, rede ou relógio do sistema (o `now` é parâmetro).
 *
 * Não existe comando para cancelar ou adiar escalonamento: a ocorrência só termina quando o negócio
 * realmente avança (sai da etapa), é fechado ou cumpre a condição de conclusão da regra. Condições de
 * abertura e datas de referência são lidas só na abertura — editá-las depois não encerra nem adia.
 */
export function evaluateDeal(
  deal: DealState,
  rules: readonly RuleDefinition[],
  openOccurrences: readonly OccurrenceState[],
  calendar: BusinessCalendar,
  now: Date,
  context: EngineContext = {},
): EngineCommand[] {
  const commands: EngineCommand[] = [];
  const fields = deal.fields ?? {};
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
    } else if (rule.completeWhen && conditionsHold(rule.completeWhen, fields)) {
      commands.push({ type: "resolve", occurrenceId: occurrence.id, reason: "completed" });
    } else {
      stillOpen.push(occurrence);
    }
  }
  if (deal.closed) return commands;

  // 2. Abrir ocorrências das regras que se aplicam à etapa atual.
  for (const rule of rules) {
    if (!ruleApplies(rule, deal)) continue;
    if (stillOpen.some((item) => item.ruleCode === rule.code)) continue;
    // Já cumprida ao entrar na etapa: nada a cobrar.
    if (rule.completeWhen && conditionsHold(rule.completeWhen, fields)) continue;
    const dueAt = dueDateFor(rule, deal, calendar);
    if (!dueAt) continue;
    const openedAt = deal.stageEnteredAt;
    const span = Math.max(0, dueAt.getTime() - openedAt.getTime());
    const riskAt = new Date(
      Math.min(dueAt.getTime(), openedAt.getTime() + span * rule.riskAtRatio),
    );
    commands.push({
      type: "open",
      ruleCode: rule.code,
      dealId: deal.dealId,
      stageId: deal.stageId,
      stageEnteredAt: deal.stageEnteredAt,
      responsibleId: responsibleFor(rule, deal, context),
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
    const responsibleId = responsibleFor(rule, deal, context);
    if (occurrence.responsibleId !== responsibleId) {
      commands.push({ type: "reassign", occurrenceId: occurrence.id, responsibleId });
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
