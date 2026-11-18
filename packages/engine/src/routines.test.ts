import { describe, expect, it } from "vitest";
import { escalationDueAt, evaluateDeal, type OccurrenceState } from "./evaluate";
import { parseRules, ruleFieldNames, type RuleDefinition } from "./rules";
import { at, calendar, deal } from "./test-fixtures";

// Rotinas sintéticas no formato do secretário — NÃO são regras homologadas da ProjacSeg.
const VIGENCIA = "UF_CRM_INICIO_VIGENCIA";
const ATIVIDADE = "LAST_ACTIVITY_TIME";

const RADAR: RuleDefinition = {
  code: "radar_renovacao",
  name: "Radar de vigência",
  enabled: true,
  homologated: false,
  mode: "shadow",
  categoryIds: ["0"],
  stageIds: ["NEW", "QUOTE", "NEGOTIATION"],
  keepAcrossStages: true,
  action: "Renovação: cotar e negociar antes da vigência",
  kind: "action",
  deadline: { amount: 10, unit: "business_days" },
  deadlineFrom: { field: VIGENCIA, direction: "before" },
  riskAtRatio: 0.5,
  riskBefore: { amount: 5, unit: "business_days" },
  escalation: {
    maxLevels: 2,
    interval: { amount: 5, unit: "business_days" },
    firstAfter: { amount: 5, unit: "business_days" },
  },
};

const FOLLOW_UP: RuleDefinition = {
  code: "follow_up",
  name: "Follow-up de negociação",
  enabled: true,
  homologated: false,
  mode: "shadow",
  categoryIds: ["0"],
  stageIds: ["NEGOTIATION"],
  restartOn: { field: ATIVIDADE },
  action: "Fazer follow-up com o cliente",
  kind: "action",
  deadline: { amount: 2, unit: "business_days" },
  riskAtRatio: 0.75,
  escalation: { maxLevels: 1, interval: { amount: 1, unit: "business_days" } },
};

const occ = (overrides: Partial<OccurrenceState>): OccurrenceState => ({
  id: "occ-1",
  ruleCode: RADAR.code,
  dealId: "501",
  stageId: "NEW",
  stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
  responsibleId: "7",
  openedAt: at("2026-11-16T10:00:00-03:00"),
  dueAt: at("2026-11-30T18:00:00-03:00"),
  riskAt: at("2026-11-23T18:00:00-03:00"),
  status: "open",
  escalationLevel: 0,
  ...overrides,
});

describe("radar de vigência", () => {
  const renewal = (stageId: string, stageEnteredAt = "2026-11-16T10:00:00-03:00") =>
    deal({ stageId, stageEnteredAt: at(stageEnteredAt), fields: { [VIGENCIA]: ["2026-12-14"] } });

  it("faixas: atenção 15 dias úteis antes, prazo 10, crítica 5, vencida no dia", () => {
    const [open] = evaluateDeal(
      renewal("NEW"),
      [RADAR],
      [],
      calendar,
      at("2026-11-16T11:00:00-03:00"),
    );
    expect(open).toMatchObject({
      type: "open",
      riskAt: at("2026-11-23T18:00:00-03:00"),
      dueAt: at("2026-11-30T18:00:00-03:00"),
    });
    const o = occ({});
    expect(escalationDueAt(o, RADAR, 1, calendar)).toEqual(at("2026-12-07T18:00:00-03:00"));
    expect(escalationDueAt(o, RADAR, 2, calendar)).toEqual(at("2026-12-14T18:00:00-03:00"));
  });

  it("acompanha o negócio entre as etapas iniciais sem reiniciar o prazo", () => {
    const moved = renewal("QUOTE", "2026-11-20T09:00:00-03:00");
    expect(
      evaluateDeal(moved, [RADAR], [occ({})], calendar, at("2026-11-20T10:00:00-03:00")),
    ).toEqual([]);
  });

  it("sai do radar quando a proposta é transmitida", () => {
    const transmitted = renewal("TRANSMITTED", "2026-11-25T09:00:00-03:00");
    expect(
      evaluateDeal(transmitted, [RADAR], [occ({})], calendar, at("2026-11-25T10:00:00-03:00")),
    ).toEqual([{ type: "resolve", occurrenceId: "occ-1", reason: "stage_changed" }]);
  });

  it("no prazo avisa só o comercial; o superior entra na faixa crítica", () => {
    const now = at("2026-12-01T09:00:00-03:00");
    expect(
      evaluateDeal(renewal("QUOTE"), [RADAR], [occ({ status: "at_risk" })], calendar, now),
    ).toEqual([{ type: "mark_overdue", occurrenceId: "occ-1" }]);
    const critical = at("2026-12-07T18:30:00-03:00");
    expect(
      evaluateDeal(renewal("QUOTE"), [RADAR], [occ({ status: "overdue" })], calendar, critical),
    ).toEqual([{ type: "escalate", occurrenceId: "occ-1", level: 1 }]);
  });
});

describe("follow-up que recomeça a cada atividade real", () => {
  const negotiating = (activity?: string) =>
    deal({
      stageId: "NEGOTIATION",
      stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
      fields: { [ATIVIDADE]: activity ? [activity] : [] },
    });

  it("sem atividade depois da entrada, conta da entrada na etapa", () => {
    const [open] = evaluateDeal(
      negotiating("2026-11-10T09:00:00-03:00"),
      [FOLLOW_UP],
      [],
      calendar,
      at("2026-11-16T11:00:00-03:00"),
    );
    expect(open).toMatchObject({
      stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
      dueAt: at("2026-11-18T18:00:00-03:00"),
    });
  });

  it("atividade nova conclui o ciclo atual e abre o próximo a partir dela", () => {
    const current = occ({
      ruleCode: FOLLOW_UP.code,
      stageId: "NEGOTIATION",
      dueAt: at("2026-11-18T18:00:00-03:00"),
      status: "overdue",
    });
    const commands = evaluateDeal(
      negotiating("2026-11-19T15:00:00-03:00"),
      [FOLLOW_UP],
      [current],
      calendar,
      at("2026-11-19T15:05:00-03:00"),
    );
    expect(commands).toEqual([
      { type: "resolve", occurrenceId: "occ-1", reason: "activity" },
      expect.objectContaining({
        type: "open",
        stageEnteredAt: at("2026-11-19T15:00:00-03:00"),
        dueAt: at("2026-11-23T18:00:00-03:00"),
      }),
    ]);
  });

  it("sem atividade nova, nada muda além do tempo", () => {
    const current = occ({
      ruleCode: FOLLOW_UP.code,
      stageId: "NEGOTIATION",
      dueAt: at("2026-11-18T18:00:00-03:00"),
      riskAt: at("2026-11-18T10:00:00-03:00"),
    });
    expect(
      evaluateDeal(
        negotiating("2026-11-10T09:00:00-03:00"),
        [FOLLOW_UP],
        [current],
        calendar,
        at("2026-11-17T09:00:00-03:00"),
      ),
    ).toEqual([]);
  });

  it("lê o campo de atividade do CRM e valida a configuração", () => {
    expect(ruleFieldNames([FOLLOW_UP, RADAR])).toEqual([ATIVIDADE, VIGENCIA]);
    expect(parseRules([FOLLOW_UP, RADAR])).toHaveLength(2);
  });
});
