import { describe, expect, it } from "vitest";
import { applyCommand, evaluateDeal, type OccurrenceState } from "./evaluate";
import { parseRules } from "./rules";
import { RULE_COTACAO, RULE_SEGURADORA, at, calendar, deal, occurrence } from "./test-fixtures";

const rules = [RULE_COTACAO, RULE_SEGURADORA];

describe("abertura de ocorrências", () => {
  it("abre ao entrar na etapa, com prazo contado da entrada", () => {
    const commands = evaluateDeal(deal(), rules, [], calendar, at("2026-11-16T11:00:00-03:00"));
    expect(commands).toEqual([
      {
        type: "open",
        ruleCode: "enviar_cotacao",
        dealId: "501",
        stageId: "PREPARATION",
        stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
        responsibleId: "7",
        openedAt: at("2026-11-16T10:00:00-03:00"),
        dueAt: at("2026-11-17T18:00:00-03:00"),
        // 75% entre 16/11 10:00 e 17/11 18:00 (32h) = +24h
        riskAt: at("2026-11-17T10:00:00-03:00"),
      },
    ]);
  });

  it("não reabre se já existe ocorrência para a mesma passagem pela etapa", () => {
    expect(
      evaluateDeal(deal(), rules, [occurrence()], calendar, at("2026-11-16T11:00:00-03:00")),
    ).toEqual([]);
  });

  it("respeita pipeline e etapa", () => {
    expect(
      evaluateDeal(deal({ categoryId: "3" }), rules, [], calendar, at("2026-11-16T11:00:00-03:00")),
    ).toEqual([]);
    expect(
      evaluateDeal(deal({ stageId: "NEW" }), rules, [], calendar, at("2026-11-16T11:00:00-03:00")),
    ).toEqual([]);
  });

  it("ignora regra desativada", () => {
    const disabled = [{ ...RULE_COTACAO, enabled: false }];
    expect(evaluateDeal(deal(), disabled, [], calendar, at("2026-11-16T11:00:00-03:00"))).toEqual(
      [],
    );
  });
});

describe("transições por tempo", () => {
  it("entra em risco a partir de riskAt", () => {
    expect(
      evaluateDeal(deal(), rules, [occurrence()], calendar, at("2026-11-17T09:30:00-03:00")),
    ).toEqual([{ type: "mark_at_risk", occurrenceId: "occ-1" }]);
  });

  it("vence e escalona ao superior imediato no vencimento", () => {
    expect(
      evaluateDeal(
        deal(),
        rules,
        [occurrence({ status: "at_risk" })],
        calendar,
        at("2026-11-17T18:00:00-03:00"),
      ),
    ).toEqual([
      { type: "mark_overdue", occurrenceId: "occ-1" },
      { type: "escalate", occurrenceId: "occ-1", level: 1 },
    ]);
  });

  it("sobe ao segundo nível após o intervalo", () => {
    const overdue = occurrence({ status: "overdue", escalationLevel: 1 });
    expect(
      evaluateDeal(deal(), rules, [overdue], calendar, at("2026-11-18T17:59:00-03:00")),
    ).toEqual([]);
    expect(
      evaluateDeal(deal(), rules, [overdue], calendar, at("2026-11-18T18:00:00-03:00")),
    ).toEqual([{ type: "escalate", occurrenceId: "occ-1", level: 2 }]);
  });

  it("recupera níveis perdidos de uma vez e para no máximo configurado", () => {
    const commands = evaluateDeal(
      deal(),
      rules,
      [occurrence()],
      calendar,
      at("2026-12-01T12:00:00-03:00"),
    );
    expect(commands).toEqual([
      { type: "mark_overdue", occurrenceId: "occ-1" },
      { type: "escalate", occurrenceId: "occ-1", level: 1 },
      { type: "escalate", occurrenceId: "occ-1", level: 2 },
    ]);
  });

  it("regra de espera (terceiros) não escalona", () => {
    const waiting = occurrence({
      ruleCode: "aguardar_emissao",
      stageId: "EXECUTING",
      dueAt: at("2026-11-23T18:00:00-03:00"),
      riskAt: at("2026-11-20T00:00:00-03:00"),
    });
    const commands = evaluateDeal(
      deal({ stageId: "EXECUTING" }),
      rules,
      [waiting],
      calendar,
      at("2026-11-30T12:00:00-03:00"),
    );
    expect(commands).toEqual([{ type: "mark_overdue", occurrenceId: "occ-1" }]);
  });
});

describe("encerramento", () => {
  it("resolve quando o negócio muda de etapa", () => {
    const commands = evaluateDeal(
      deal({ stageId: "NEW", stageEnteredAt: at("2026-11-17T09:00:00-03:00") }),
      rules,
      [occurrence({ status: "overdue", escalationLevel: 1 })],
      calendar,
      at("2026-11-18T09:00:00-03:00"),
    );
    expect(commands).toEqual([{ type: "resolve", occurrenceId: "occ-1", reason: "stage_changed" }]);
  });

  it("voltar para a mesma etapa abre nova ocorrência (nova passagem)", () => {
    const reentered = at("2026-11-18T09:00:00-03:00");
    const commands = evaluateDeal(
      deal({ stageEnteredAt: reentered }),
      rules,
      [occurrence()],
      calendar,
      at("2026-11-18T09:05:00-03:00"),
    );
    expect(commands.map((command) => command.type)).toEqual(["resolve", "open"]);
  });

  it("resolve tudo quando o negócio é fechado", () => {
    expect(
      evaluateDeal(
        deal({ closed: true }),
        rules,
        [occurrence()],
        calendar,
        at("2026-11-16T12:00:00-03:00"),
      ),
    ).toEqual([{ type: "resolve", occurrenceId: "occ-1", reason: "deal_closed" }]);
  });

  it("resolve quando a regra é desativada", () => {
    expect(
      evaluateDeal(
        deal(),
        [{ ...RULE_COTACAO, enabled: false }],
        [occurrence()],
        calendar,
        at("2026-11-16T12:00:00-03:00"),
      ),
    ).toEqual([{ type: "resolve", occurrenceId: "occ-1", reason: "rule_disabled" }]);
  });

  it("acompanha a troca de responsável", () => {
    expect(
      evaluateDeal(
        deal({ assignedById: "9" }),
        rules,
        [occurrence()],
        calendar,
        at("2026-11-16T12:00:00-03:00"),
      ),
    ).toEqual([{ type: "reassign", occurrenceId: "occ-1", responsibleId: "9" }]);
  });
});

describe("determinismo e aplicação", () => {
  it("mesma entrada, mesma saída", () => {
    const now = at("2026-11-17T19:00:00-03:00");
    const first = evaluateDeal(deal(), rules, [occurrence()], calendar, now);
    const second = evaluateDeal(deal(), rules, [occurrence()], calendar, now);
    expect(second).toEqual(first);
  });

  it("aplicar os comandos leva a um estado estável (sem novos comandos)", () => {
    const now = at("2026-11-18T19:00:00-03:00");
    let state: OccurrenceState = occurrence();
    for (const command of evaluateDeal(deal(), rules, [state], calendar, now)) {
      if (command.type !== "open") state = applyCommand(state, command);
    }
    expect(state).toMatchObject({ status: "overdue", escalationLevel: 2 });
    expect(evaluateDeal(deal(), rules, [state], calendar, now)).toEqual([]);
  });
});

describe("validação de regras", () => {
  it("aceita regras válidas", () => {
    expect(parseRules([RULE_COTACAO, RULE_SEGURADORA])).toHaveLength(2);
  });

  it("recusa código duplicado e configuração inválida", () => {
    expect(() => parseRules([RULE_COTACAO, RULE_COTACAO])).toThrow(/duplicada/);
    expect(() => parseRules([{ ...RULE_COTACAO, riskAtRatio: 1.5 }])).toThrow();
    expect(() => parseRules([{ ...RULE_COTACAO, stageIds: [] }])).toThrow();
  });
});
