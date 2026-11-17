import { describe, expect, it } from "vitest";
import { parseFieldDate, subtractDuration, type BusinessCalendar } from "./calendar";
import { evaluateDeal, responsibleFor } from "./evaluate";
import {
  conditionHolds,
  parseRules,
  ruleApplies,
  ruleFieldNames,
  ruleMode,
  ruleRoles,
  type RuleDefinition,
} from "./rules";
import { RULE_COTACAO, at, calendar, deal, occurrence } from "./test-fixtures";

// Regras sintéticas — NÃO são regras homologadas da ProjacSeg.
const FIELD = "UF_CRM_NUMERO_CALCULO";
const DATE = "UF_CRM_FIM_VIGENCIA";
const now = at("2026-11-16T11:00:00-03:00");

describe("condições por campo do negócio", () => {
  const fields = { UF_CRM_RAMO: ["45"], UF_CRM_TAGS: ["1", "3"], [FIELD]: [] };

  it("avalia os operadores", () => {
    expect(conditionHolds({ field: "UF_CRM_RAMO", operator: "equals", value: "45" }, fields)).toBe(
      true,
    );
    expect(
      conditionHolds({ field: "UF_CRM_RAMO", operator: "not_equals", value: "45" }, fields),
    ).toBe(false);
    expect(
      conditionHolds({ field: "UF_CRM_TAGS", operator: "in", values: ["3", "9"] }, fields),
    ).toBe(true);
    expect(conditionHolds({ field: FIELD, operator: "empty" }, fields)).toBe(true);
    expect(conditionHolds({ field: "UF_CRM_AUSENTE", operator: "not_empty" }, fields)).toBe(false);
  });

  it("a regra só abre quando todas as condições valem", () => {
    const rule: RuleDefinition = {
      ...RULE_COTACAO,
      conditions: [{ field: "UF_CRM_RAMO", operator: "equals", value: "45" }],
    };
    expect(ruleApplies(rule, deal({ fields: { UF_CRM_RAMO: ["45"] } }))).toBe(true);
    expect(ruleApplies(rule, deal({ fields: { UF_CRM_RAMO: ["12"] } }))).toBe(false);
    expect(ruleApplies(rule, deal())).toBe(false);
  });

  it("mudar o campo depois da abertura não encerra a ocorrência", () => {
    const rule: RuleDefinition = {
      ...RULE_COTACAO,
      conditions: [{ field: "UF_CRM_RAMO", operator: "equals", value: "45" }],
    };
    const changed = deal({ fields: { UF_CRM_RAMO: ["12"] } });
    expect(evaluateDeal(changed, [rule], [occurrence()], calendar, now)).toEqual([]);
  });

  it("lista campos e papéis usados pelas regras", () => {
    const rules: RuleDefinition[] = [
      {
        ...RULE_COTACAO,
        conditions: [{ field: "UF_CRM_RAMO", operator: "not_empty" }],
        deadlineFrom: { field: DATE, direction: "before" },
        completeWhen: [{ field: FIELD, operator: "not_empty" }],
        responsible: { from: "field", field: "UF_CRM_EMISSOR" },
        escalation: {
          maxLevels: 1,
          interval: { amount: 1, unit: "business_days" },
          levels: [{ superior: true, roles: ["supervisao_auto"] }],
        },
      },
      { ...RULE_COTACAO, code: "outra", responsible: { from: "role", role: "emissao" } },
    ];
    expect(ruleFieldNames(rules)).toEqual([DATE, "UF_CRM_EMISSOR", FIELD, "UF_CRM_RAMO"].sort());
    expect(ruleRoles(rules)).toEqual(["emissao", "supervisao_auto"]);
  });
});

describe("prazo relativo a uma data do negócio", () => {
  const renewal: RuleDefinition = {
    ...RULE_COTACAO,
    code: "renovacao",
    deadline: { amount: 5, unit: "business_days" },
    deadlineFrom: { field: DATE, direction: "before" },
  };

  it("conta dias úteis antes da data (data sem hora = dia local)", () => {
    const [open] = evaluateDeal(
      deal({ fields: { [DATE]: ["2026-11-30"] } }),
      [renewal],
      [],
      calendar,
      now,
    );
    expect(open).toMatchObject({
      type: "open",
      dueAt: at("2026-11-23T18:00:00-03:00"),
      openedAt: at("2026-11-16T10:00:00-03:00"),
    });
  });

  it("conta depois da data quando configurado", () => {
    const after: RuleDefinition = {
      ...renewal,
      deadline: { amount: 0, unit: "business_days" },
      deadlineFrom: { field: DATE, direction: "after" },
    };
    const [open] = evaluateDeal(
      deal({ fields: { [DATE]: ["2026-11-20T09:00:00-03:00"] } }),
      [after],
      [],
      calendar,
      now,
    );
    expect(open).toMatchObject({ dueAt: at("2026-11-20T18:00:00-03:00") });
  });

  it("sem a data preenchida (ou inválida) não abre", () => {
    expect(evaluateDeal(deal(), [renewal], [], calendar, now)).toEqual([]);
    expect(
      evaluateDeal(deal({ fields: { [DATE]: ["30/11/2026"] } }), [renewal], [], calendar, now),
    ).toEqual([]);
  });

  it("data já passada: vence na abertura e o risco não fica depois do vencimento", () => {
    const [open] = evaluateDeal(
      deal({ fields: { [DATE]: ["2026-11-17"] } }),
      [renewal],
      [],
      calendar,
      now,
    );
    expect(open).toMatchObject({ type: "open" });
    if (open?.type !== "open") throw new Error("esperava abertura");
    expect(open.dueAt.getTime()).toBeLessThan(open.openedAt.getTime());
    expect(open.riskAt).toEqual(open.dueAt);
  });

  it("editar a data depois da abertura não adia a ocorrência", () => {
    const opened = occurrence({ ruleCode: "renovacao", dueAt: at("2026-11-23T18:00:00-03:00") });
    const postponed = deal({ fields: { [DATE]: ["2027-01-30"] } });
    expect(
      evaluateDeal(postponed, [renewal], [opened], calendar, at("2026-11-23T18:30:00-03:00")),
    ).toEqual([
      { type: "mark_overdue", occurrenceId: "occ-1" },
      { type: "escalate", occurrenceId: "occ-1", level: 1 },
    ]);
  });
});

describe("conclusão por campo preenchido", () => {
  const calc: RuleDefinition = {
    ...RULE_COTACAO,
    completeWhen: [{ field: FIELD, operator: "not_empty" }],
  };

  it("resolve como concluída quando o campo é preenchido", () => {
    expect(
      evaluateDeal(deal({ fields: { [FIELD]: ["98765"] } }), [calc], [occurrence()], calendar, now),
    ).toEqual([{ type: "resolve", occurrenceId: "occ-1", reason: "completed" }]);
  });

  it("não abre se já está cumprida ao entrar na etapa", () => {
    expect(
      evaluateDeal(deal({ fields: { [FIELD]: ["98765"] } }), [calc], [], calendar, now),
    ).toEqual([]);
  });

  it("campo vazio mantém a cobrança", () => {
    expect(evaluateDeal(deal(), [calc], [], calendar, now)).toHaveLength(1);
  });
});

describe("responsável configurável", () => {
  it("por papel da empresa", () => {
    const rule: RuleDefinition = {
      ...RULE_COTACAO,
      responsible: { from: "role", role: "emissao" },
    };
    const [open] = evaluateDeal(deal(), [rule], [], calendar, now, { roles: { emissao: "33" } });
    expect(open).toMatchObject({ type: "open", responsibleId: "33" });
  });

  it("por campo de usuário do negócio, com o responsável do negócio como reserva", () => {
    const rule: RuleDefinition = {
      ...RULE_COTACAO,
      responsible: { from: "field", field: "UF_CRM_EMISSOR" },
    };
    expect(responsibleFor(rule, { assignedById: "7", fields: { UF_CRM_EMISSOR: ["44"] } })).toBe(
      "44",
    );
    expect(responsibleFor(rule, { assignedById: "7", fields: {} })).toBe("7");
    expect(responsibleFor(rule, { assignedById: "7", fields: { UF_CRM_EMISSOR: ["x"] } })).toBe(
      "7",
    );
  });

  it("reatribui quando o campo muda", () => {
    const rule: RuleDefinition = {
      ...RULE_COTACAO,
      responsible: { from: "field", field: "UF_CRM_EMISSOR" },
    };
    expect(
      evaluateDeal(
        deal({ fields: { UF_CRM_EMISSOR: ["44"] } }),
        [rule],
        [occurrence()],
        calendar,
        now,
      ),
    ).toEqual([{ type: "reassign", occurrenceId: "occ-1", responsibleId: "44" }]);
  });
});

describe("validação da configuração", () => {
  const { mode: _mode, ...base } = RULE_COTACAO;

  it("modo sombra é o padrão", () => {
    expect(ruleMode(base)).toBe("shadow");
    expect(ruleMode({ ...base, mode: "active" })).toBe("active");
  });

  it("níveis de escalonamento precisam cobrir maxLevels e ter destinatário", () => {
    expect(() =>
      parseRules([
        {
          ...base,
          escalation: {
            maxLevels: 2,
            interval: { amount: 1, unit: "business_days" },
            levels: [{ superior: true, roles: [] }],
          },
        },
      ]),
    ).toThrow(/cobrir/);
    expect(() =>
      parseRules([
        {
          ...base,
          escalation: {
            maxLevels: 1,
            interval: { amount: 1, unit: "business_days" },
            levels: [{ superior: false, roles: [] }],
          },
        },
      ]),
    ).toThrow(/destinatário/);
  });

  it("recusa código de campo inválido", () => {
    expect(() =>
      parseRules([{ ...base, conditions: [{ field: "uf_crm;drop", operator: "empty" }] }]),
    ).toThrow();
  });
});

describe("calendário para trás", () => {
  const withHoliday: BusinessCalendar = { ...calendar, holidays: ["2026-11-24"] };

  it("dias úteis antes pulam fim de semana e feriado", () => {
    expect(
      subtractDuration(
        at("2026-11-30T00:00:00-03:00"),
        { amount: 5, unit: "business_days" },
        withHoliday,
      ),
    ).toEqual(at("2026-11-20T18:00:00-03:00"));
  });

  it("horas úteis antes consomem só o expediente", () => {
    expect(
      subtractDuration(
        at("2026-11-17T10:00:00-03:00"),
        { amount: 4, unit: "business_hours" },
        calendar,
      ),
    ).toEqual(at("2026-11-16T16:00:00-03:00"));
    expect(
      subtractDuration(
        at("2026-11-21T12:00:00-03:00"),
        { amount: 1, unit: "business_hours" },
        calendar,
      ),
    ).toEqual(at("2026-11-20T17:00:00-03:00"));
  });

  it("lê datas de campo do Bitrix24", () => {
    expect(parseFieldDate("2026-11-30", calendar)).toEqual(at("2026-11-30T00:00:00-03:00"));
    expect(parseFieldDate("2026-11-30T15:00:00+03:00", calendar)).toEqual(
      at("2026-11-30T12:00:00Z"),
    );
    expect(parseFieldDate("30/11/2026", calendar)).toBeNull();
    expect(parseFieldDate(undefined, calendar)).toBeNull();
  });
});
