import type { Deal, DealPriority, DealStatus, JourneySummary } from "@projacseg/shared";
import {
  localDateKey,
  localDayDiff,
  localTime,
  parseFieldDate,
  type BusinessCalendar,
} from "./calendar";
import type { OccurrenceState } from "./evaluate";
import { ruleMode, type DealFields, type RuleDefinition } from "./rules";

/** Negócio como guardado na sincronização, com nomes já resolvidos. */
export interface DealView {
  dealId: string;
  title: string;
  categoryId: string;
  categoryName: string;
  stageId: string;
  stageName: string;
  assignedById: string;
  responsibleName: string;
  branch?: string;
  insuranceType?: string;
  closed: boolean;
  /** Entrada na etapa atual. */
  stageEnteredAt?: Date;
  /** Campos usados pelas regras (ex.: data de vigência das renovações). */
  fields?: DealFields;
}

export interface ProjectedOccurrence extends OccurrenceState {
  resolvedAt?: Date;
}

export interface JourneyProjection {
  deals: Deal[];
  summary: JourneySummary;
  briefing: string;
}

const SEVERITY: Record<DealStatus, number> = {
  risk: 0,
  today: 1,
  waiting: 2,
  upcoming: 3,
  resolved: 4,
};

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Prazo da próxima ação ("Prazo hoje às 18:00", "Em atraso há 2 dias"…). Diz "prazo", nunca "vence":
 * é o prazo da tarefa (contato, cotação, follow-up), não o vencimento da apólice.
 */
export function deadlineLabel(dueAt: Date, now: Date, calendar: BusinessCalendar): string {
  const days = localDayDiff(now, dueAt, calendar);
  if (dueAt <= now) {
    const late = -days;
    if (late <= 0) return "Em atraso";
    return `Em atraso há ${plural(late, "dia", "dias")}`;
  }
  if (days === 0) return `Prazo hoje às ${localTime(dueAt, calendar)}`;
  if (days === 1) return "Prazo amanhã";
  return `Prazo em ${days} dias`;
}

/** "30/11" no fuso da empresa. */
function shortDate(date: Date, calendar: BusinessCalendar): string {
  const [, month, day] = localDateKey(date, calendar).split("-");
  return `${day}/${month}`;
}

/**
 * Data do negócio que ancora uma regra (`deadlineFrom.label`): "Vigência em 12 dias (30/11)",
 * "Vigência hoje (30/11)", "Agendamento passou há 2 dias (30/11)".
 */
export function dateFieldLabel(
  name: string,
  date: Date,
  now: Date,
  calendar: BusinessCalendar,
): string {
  const when = shortDate(date, calendar);
  const days = localDayDiff(now, date, calendar);
  if (days > 1) return `${name} em ${days} dias (${when})`;
  if (days === 1) return `${name} amanhã (${when})`;
  if (days === 0) return `${name} hoje (${when})`;
  return `${name} passou há ${plural(-days, "dia", "dias")} (${when})`;
}

interface Classified {
  status: DealStatus;
  priority: DealPriority;
  label: string;
  action: string;
  sortKey: number;
  occurrence?: ProjectedOccurrence;
}

/**
 * Data ancorada a mostrar no card (ex.: vigência de uma renovação): a da ação em destaque ou, se ela
 * não tiver, a da ocorrência aberta mais próxima que tenha. Só regras com `deadlineFrom.label`.
 */
function anchorText(
  open: readonly ProjectedOccurrence[],
  chosen: ProjectedOccurrence | undefined,
  rulesByCode: Map<string, RuleDefinition>,
  fields: DealFields | undefined,
  now: Date,
  calendar: BusinessCalendar,
): string | null {
  const candidates = [...open].sort(
    (a, b) => Number(b === chosen) - Number(a === chosen) || a.dueAt.getTime() - b.dueAt.getTime(),
  );
  for (const occurrence of candidates) {
    const from = rulesByCode.get(occurrence.ruleCode)?.deadlineFrom;
    if (!from?.label) continue;
    const date = parseFieldDate(fields?.[from.field]?.[0], calendar);
    if (date) return dateFieldLabel(from.label, date, now, calendar);
  }
  return null;
}

/**
 * O superior foi avisado de fato? Regra em sombra registra o escalonamento sem mandar mensagem. A API
 * troca este padrão quando há outras restrições (ex.: modo piloto, que não avisa quem está fora dele).
 */
export type EscalationNotified = (
  occurrence: ProjectedOccurrence,
  rule: RuleDefinition | undefined,
) => boolean;

export const notifiedWhenActive: EscalationNotified = (_occurrence, rule) =>
  Boolean(rule && ruleMode(rule) === "active");

function classify(
  occurrence: ProjectedOccurrence,
  rule: RuleDefinition | undefined,
  now: Date,
  calendar: BusinessCalendar,
  notified: EscalationNotified,
  stageEnteredAt: Date | undefined,
): Classified {
  // Follow-up que recomeça a cada atividade: diz de quando conta, senão o prazo parece sem motivo.
  const sinceActivity =
    rule?.restartOn && stageEnteredAt && occurrence.stageEnteredAt > stageEnteredAt
      ? ` · última atividade ${shortDate(occurrence.stageEnteredAt, calendar)}`
      : "";
  const action = (rule?.action ?? occurrence.ruleCode) + sinceActivity;
  // Nunca dizer que o superior foi avisado quando o aviso só foi registrado.
  const escalated =
    occurrence.escalationLevel === 0
      ? ""
      : notified(occurrence, rule)
        ? " · superior notificado"
        : " · escalonamento registrado, superior não avisado";
  // O texto é o prazo da ação; a data ancorada (vigência) entra depois, em projectJourney — um
  // seguro novo nunca aparece como "vencendo".
  const label = deadlineLabel(occurrence.dueAt, now, calendar) + escalated;
  const base = { action, occurrence, sortKey: occurrence.dueAt.getTime() };

  if (occurrence.status === "overdue" || occurrence.status === "at_risk") {
    return { ...base, status: "risk", priority: "danger", label };
  }
  if (rule?.kind === "waiting") {
    return {
      ...base,
      status: "waiting",
      priority: "neutral",
      label: `Aguardando terceiros · ${deadlineLabel(occurrence.dueAt, now, calendar).toLowerCase()}`,
    };
  }
  if (localDayDiff(now, occurrence.dueAt, calendar) <= 0) {
    return { ...base, status: "today", priority: "warning", label };
  }
  return { ...base, status: "upcoming", priority: "neutral", label };
}

/** Junta a data ancorada e o prazo: "Vigência em 12 dias (30/11) · prazo amanhã". */
function withAnchor(anchor: string | null, label: string): string {
  if (!anchor) return label;
  return `${anchor} · ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

/**
 * Monta o dashboard "Minha Jornada" de um colaborador a partir dos negócios e das ocorrências do
 * motor. Determinístico: a IA não participa.
 */
export function projectJourney(input: {
  userId: string;
  deals: readonly DealView[];
  occurrences: readonly ProjectedOccurrence[];
  rules: readonly RuleDefinition[];
  calendar: BusinessCalendar;
  now: Date;
  /** Diz se o aviso ao superior saiu de fato (padrão: só regras ativas). */
  escalationNotified?: EscalationNotified;
}): JourneyProjection {
  const { userId, deals, occurrences, rules, calendar, now } = input;
  const notified = input.escalationNotified ?? notifiedWhenActive;
  const rulesByCode = new Map(rules.map((rule) => [rule.code, rule]));
  const mine = deals.filter((deal) => deal.assignedById === userId);

  const rows: (Deal & { sortKey: number })[] = [];
  let actionsToday = 0;
  let atRisk = 0;
  let resolvedToday = 0;
  let waiting = 0;

  for (const deal of mine) {
    const dealOccurrences = occurrences.filter((item) => item.dealId === deal.dealId);
    const open = dealOccurrences.filter((item) => item.status !== "resolved");
    const resolvedTodayHere = dealOccurrences.filter(
      (item) =>
        item.status === "resolved" &&
        item.resolvedAt &&
        localDayDiff(item.resolvedAt, now, calendar) === 0,
    );
    resolvedToday += resolvedTodayHere.length;

    for (const occurrence of open) {
      const rule = rulesByCode.get(occurrence.ruleCode);
      if (occurrence.status === "overdue" || occurrence.status === "at_risk") atRisk += 1;
      if (rule?.kind === "waiting") waiting += 1;
      else if (localDayDiff(now, occurrence.dueAt, calendar) <= 0) actionsToday += 1;
    }

    let chosen: Classified | null = null;
    for (const occurrence of open) {
      const candidate = classify(
        occurrence,
        rulesByCode.get(occurrence.ruleCode),
        now,
        calendar,
        notified,
        deal.stageEnteredAt,
      );
      if (
        !chosen ||
        SEVERITY[candidate.status] < SEVERITY[chosen.status] ||
        (SEVERITY[candidate.status] === SEVERITY[chosen.status] &&
          candidate.sortKey < chosen.sortKey)
      ) {
        chosen = candidate;
      }
    }
    if (!chosen && resolvedTodayHere.length > 0) {
      const last = resolvedTodayHere[resolvedTodayHere.length - 1]!;
      chosen = {
        status: "resolved",
        priority: "success",
        label: "Concluído hoje",
        action: rulesByCode.get(last.ruleCode)?.action ?? last.ruleCode,
        sortKey: last.resolvedAt?.getTime() ?? 0,
      };
    }
    if (!chosen && deal.closed) continue;
    chosen ??= {
      status: "upcoming",
      priority: "neutral",
      label: "Sem prazo pendente",
      action: "Nenhuma ação do comercial nesta etapa",
      sortKey: Number.MAX_SAFE_INTEGER,
    };
    const anchor =
      chosen.status === "resolved"
        ? null
        : anchorText(open, chosen.occurrence, rulesByCode, deal.fields, now, calendar);

    rows.push({
      id: deal.dealId,
      origin: "crm",
      clientName: deal.title,
      branch: deal.branch ?? deal.categoryName,
      ...(deal.insuranceType ? { insuranceType: deal.insuranceType } : {}),
      ...(deal.stageEnteredAt ? { stageSince: shortDate(deal.stageEnteredAt, calendar) } : {}),
      nextAction: chosen.action,
      deadlineLabel: withAnchor(anchor, chosen.label),
      status: chosen.status,
      priority: chosen.priority,
      pipelineName: deal.categoryName,
      stageName: deal.stageName,
      responsibleName: deal.responsibleName,
      sortKey: chosen.sortKey,
    });
  }

  rows.sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || a.sortKey - b.sortKey);
  const result = rows.map(({ sortKey: _sortKey, ...deal }) => deal);

  return {
    deals: result,
    summary: {
      activeDeals: mine.filter((deal) => !deal.closed).length,
      actionsToday,
      atRisk,
      resolvedToday,
    },
    briefing: buildBriefing(result, atRisk, actionsToday, waiting),
  };
}

function buildBriefing(
  deals: Deal[],
  atRisk: number,
  actionsToday: number,
  waiting: number,
): string {
  const parts: string[] = [];
  const first = deals[0];
  if (atRisk > 0 && first) {
    parts.push(
      `Você tem ${plural(atRisk, "ação em risco", "ações em risco")}. Comece por ` +
        `"${first.nextAction}" em ${first.clientName} (${first.deadlineLabel.toLowerCase()}).`,
    );
  } else if (actionsToday > 0 && first) {
    parts.push(
      `Você tem ${plural(actionsToday, "ação para hoje", "ações para hoje")}. A primeira é ` +
        `"${first.nextAction}" em ${first.clientName} (${first.deadlineLabel.toLowerCase()}).`,
    );
  } else {
    parts.push("Nenhuma ação vence hoje.");
  }
  if (waiting > 0) {
    parts.push(
      `${plural(waiting, "negócio aguarda", "negócios aguardam")} terceiros e ` +
        `${waiting === 1 ? "está sendo monitorado" : "estão sendo monitorados"}.`,
    );
  }
  return parts.join(" ");
}
