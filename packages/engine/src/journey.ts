import type { Deal, DealPriority, DealStatus, JourneySummary } from "@projacseg/shared";
import { localDayDiff, localTime, type BusinessCalendar } from "./calendar";
import type { OccurrenceState } from "./evaluate";
import type { RuleDefinition } from "./rules";

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

/** Texto de prazo determinístico ("Vence hoje às 18:00", "Em atraso há 2 dias"…). */
export function deadlineLabel(dueAt: Date, now: Date, calendar: BusinessCalendar): string {
  const days = localDayDiff(now, dueAt, calendar);
  if (dueAt <= now) {
    const late = -days;
    if (late <= 0) return "Em atraso";
    return `Em atraso há ${plural(late, "dia", "dias")}`;
  }
  if (days === 0) return `Vence hoje às ${localTime(dueAt, calendar)}`;
  if (days === 1) return "Vence amanhã";
  return `Vence em ${days} dias`;
}

interface Classified {
  status: DealStatus;
  priority: DealPriority;
  label: string;
  action: string;
  sortKey: number;
}

function classify(
  occurrence: ProjectedOccurrence,
  rule: RuleDefinition | undefined,
  now: Date,
  calendar: BusinessCalendar,
): Classified {
  const action = rule?.action ?? occurrence.ruleCode;
  const escalated = occurrence.escalationLevel > 0 ? " · superior notificado" : "";
  const label = deadlineLabel(occurrence.dueAt, now, calendar) + escalated;

  if (occurrence.status === "overdue" || occurrence.status === "at_risk") {
    return {
      status: "risk",
      priority: "danger",
      label,
      action,
      sortKey: occurrence.dueAt.getTime(),
    };
  }
  if (rule?.kind === "waiting") {
    return {
      status: "waiting",
      priority: "neutral",
      label: `Aguardando terceiros · ${deadlineLabel(occurrence.dueAt, now, calendar).toLowerCase()}`,
      action,
      sortKey: occurrence.dueAt.getTime(),
    };
  }
  if (localDayDiff(now, occurrence.dueAt, calendar) <= 0) {
    return {
      status: "today",
      priority: "warning",
      label,
      action,
      sortKey: occurrence.dueAt.getTime(),
    };
  }
  return {
    status: "upcoming",
    priority: "neutral",
    label,
    action,
    sortKey: occurrence.dueAt.getTime(),
  };
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
}): JourneyProjection {
  const { userId, deals, occurrences, rules, calendar, now } = input;
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
      const candidate = classify(occurrence, rulesByCode.get(occurrence.ruleCode), now, calendar);
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
      action: "Nenhuma ação pendente",
      sortKey: Number.MAX_SAFE_INTEGER,
    };

    rows.push({
      id: deal.dealId,
      origin: "crm",
      clientName: deal.title,
      branch: deal.branch ?? deal.categoryName,
      ...(deal.insuranceType ? { insuranceType: deal.insuranceType } : {}),
      nextAction: chosen.action,
      deadlineLabel: chosen.label,
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
