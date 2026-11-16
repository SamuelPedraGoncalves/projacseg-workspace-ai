import { DEFAULT_CALENDAR } from "./calendar";
import type { DealState, OccurrenceState } from "./evaluate";
import type { RuleDefinition } from "./rules";

/** Regra de exemplo para testes — NÃO é uma regra homologada da ProjacSeg. */
export const RULE_COTACAO: RuleDefinition = {
  code: "enviar_cotacao",
  name: "Enviar cotação",
  enabled: true,
  homologated: false,
  categoryIds: ["0"],
  stageIds: ["PREPARATION"],
  action: "Enviar cotação",
  kind: "action",
  deadline: { amount: 1, unit: "business_days" },
  riskAtRatio: 0.75,
  escalation: { maxLevels: 2, interval: { amount: 1, unit: "business_days" } },
};

export const RULE_SEGURADORA: RuleDefinition = {
  code: "aguardar_emissao",
  name: "Aguardar emissão",
  enabled: true,
  homologated: false,
  categoryIds: null,
  stageIds: ["EXECUTING"],
  action: "Acompanhar emissão",
  kind: "waiting",
  deadline: { amount: 5, unit: "business_days" },
  riskAtRatio: 0.8,
  escalation: { maxLevels: 0, interval: { amount: 1, unit: "business_days" } },
};

export const calendar = DEFAULT_CALENDAR;

export const at = (iso: string) => new Date(iso);

export function deal(overrides: Partial<DealState> = {}): DealState {
  return {
    dealId: "501",
    categoryId: "0",
    stageId: "PREPARATION",
    stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
    assignedById: "7",
    closed: false,
    ...overrides,
  };
}

export function occurrence(overrides: Partial<OccurrenceState> = {}): OccurrenceState {
  return {
    id: "occ-1",
    ruleCode: RULE_COTACAO.code,
    dealId: "501",
    stageId: "PREPARATION",
    stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
    responsibleId: "7",
    openedAt: at("2026-11-16T10:00:00-03:00"),
    dueAt: at("2026-11-17T18:00:00-03:00"),
    riskAt: at("2026-11-17T09:30:00-03:00"),
    status: "open",
    escalationLevel: 0,
    ...overrides,
  };
}
