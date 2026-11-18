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

export type ResolveReason =
  | "stage_changed"
  | "deal_closed"
  | "rule_disabled"
  | "completed"
  /** Atividade nova registrada no negócio: o ciclo (ex.: follow-up) recomeça. */
  | "activity";

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
  let at = rule.escalation.firstAfter
    ? addDuration(occurrence.dueAt, rule.escalation.firstAfter, calendar)
    : occurrence.dueAt;
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

/**
 * Início do ciclo da regra: a entrada na etapa ou, em regras com `restartOn`, a atividade mais recente
 * registrada depois dela. É também a identidade da ocorrência (uma por regra por ciclo).
 */
export function cycleStart(
  rule: RuleDefinition,
  deal: DealState,
  calendar: BusinessCalendar,
): Date {
  if (!rule.restartOn) return deal.stageEnteredAt;
  const activity = parseFieldDate(deal.fields?.[rule.restartOn.field]?.[0], calendar);
  return activity && activity > deal.stageEnteredAt ? activity : deal.stageEnteredAt;
}

/** A regra cobre a etapa e o pipeline atuais (sem olhar condições, lidas só na abertura). */
function inScope(rule: RuleDefinition, deal: DealState): boolean {
  return (
    rule.stageIds.includes(deal.stageId) &&
    (rule.categoryIds === null || rule.categoryIds.includes(deal.categoryId))
  );
}

/** Vencimento da regra para o ciclo atual; `null` se a data de referência falta. */
function dueDateFor(
  rule: RuleDefinition,
  deal: DealState,
  calendar: BusinessCalendar,
  start: Date,
): Date | null {
  if (!rule.deadlineFrom) return addDuration(start, rule.deadline, calendar);
  const anchor = parseFieldDate(deal.fields?.[rule.deadlineFrom.field]?.[0], calendar);
  if (!anchor) return null;
  return rule.deadlineFrom.direction === "after"
    ? addDuration(anchor, rule.deadline, calendar)
    : subtractDuration(anchor, rule.deadline, calendar);
}

function sameInstant(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

/** Por que uma ocorrência aberta deixou de valer (sem olhar a regra desativada nem a conclusão). */
function closingReason(
  occurrence: OccurrenceState,
  rule: RuleDefinition | undefined,
  deal: DealState,
  calendar: BusinessCalendar,
): ResolveReason | null {
  if (deal.closed) return "deal_closed";
  if (rule?.keepAcrossStages) return inScope(rule, deal) ? null : "stage_changed";
  if (occurrence.stageId !== deal.stageId) return "stage_changed";
  if (rule?.restartOn) {
    // Reentrou na etapa depois da abertura → nova passagem; atividade nova → novo ciclo.
    if (deal.stageEnteredAt > occurrence.stageEnteredAt) return "stage_changed";
    return sameInstant(occurrence.stageEnteredAt, cycleStart(rule, deal, calendar))
      ? null
      : "activity";
  }
  return sameInstant(occurrence.stageEnteredAt, deal.stageEnteredAt) ? null : "stage_changed";
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
    const reason = closingReason(occurrence, rule, deal, calendar);
    if (reason) {
      commands.push({ type: "resolve", occurrenceId: occurrence.id, reason });
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
    const openedAt = cycleStart(rule, deal, calendar);
    const dueAt = dueDateFor(rule, deal, calendar, openedAt);
    if (!dueAt) continue;
    const span = Math.max(0, dueAt.getTime() - openedAt.getTime());
    const riskAt = rule.riskBefore
      ? new Date(
          Math.min(
            dueAt.getTime(),
            Math.max(
              openedAt.getTime(),
              subtractDuration(dueAt, rule.riskBefore, calendar).getTime(),
            ),
          ),
        )
      : new Date(Math.min(dueAt.getTime(), openedAt.getTime() + span * rule.riskAtRatio));
    commands.push({
      type: "open",
      ruleCode: rule.code,
      dealId: deal.dealId,
      stageId: deal.stageId,
      // Identidade do ciclo: entrada na etapa ou a última atividade (restartOn).
      stageEnteredAt: openedAt,
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
