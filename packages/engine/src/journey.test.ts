import { describe, expect, it } from "vitest";
import { deadlineLabel, projectJourney, type DealView, type ProjectedOccurrence } from "./journey";
import { RULE_COTACAO, RULE_SEGURADORA, at, calendar, occurrence } from "./test-fixtures";

const now = at("2026-11-17T11:00:00-03:00");

function dealView(id: string, overrides: Partial<DealView> = {}): DealView {
  return {
    dealId: id,
    title: `Cliente ${id}`,
    categoryId: "0",
    categoryName: "Automóvel",
    stageId: "PREPARATION",
    stageName: "Elaborando cotação",
    assignedById: "7",
    responsibleName: "Lucas",
    closed: false,
    ...overrides,
  };
}

const occ = (id: string, dealId: string, overrides: Partial<ProjectedOccurrence> = {}) =>
  occurrence({ id, dealId, ...overrides });

describe("deadlineLabel", () => {
  it("descreve prazos de forma determinística", () => {
    expect(deadlineLabel(at("2026-11-17T18:00:00-03:00"), now, calendar)).toBe(
      "Prazo hoje às 18:00",
    );
    expect(deadlineLabel(at("2026-11-18T18:00:00-03:00"), now, calendar)).toBe("Prazo amanhã");
    expect(deadlineLabel(at("2026-11-20T18:00:00-03:00"), now, calendar)).toBe("Prazo em 3 dias");
    expect(deadlineLabel(at("2026-11-17T09:00:00-03:00"), now, calendar)).toBe("Em atraso");
    expect(deadlineLabel(at("2026-11-15T18:00:00-03:00"), now, calendar)).toBe(
      "Em atraso há 2 dias",
    );
  });
});

describe("projectJourney", () => {
  const deals = [
    dealView("1"),
    dealView("2"),
    dealView("3", { stageId: "EXECUTING", stageName: "Emissão" }),
    dealView("4"),
    dealView("5", { closed: true }),
    dealView("6"),
    dealView("99", { assignedById: "8" }), // de outro colaborador
  ];
  const occurrences: ProjectedOccurrence[] = [
    occ("a", "1", {
      status: "overdue",
      escalationLevel: 1,
      dueAt: at("2026-11-16T18:00:00-03:00"),
    }),
    occ("b", "2", { dueAt: at("2026-11-17T18:00:00-03:00") }),
    occ("c", "3", { ruleCode: "aguardar_emissao", dueAt: at("2026-11-21T18:00:00-03:00") }),
    occ("d", "4", { dueAt: at("2026-11-19T18:00:00-03:00") }),
    occ("e", "5", { status: "resolved", resolvedAt: at("2026-11-17T09:00:00-03:00") }),
    occ("f", "99", { status: "overdue" }),
  ];

  const result = projectJourney({
    userId: "7",
    deals,
    occurrences,
    rules: [RULE_COTACAO, RULE_SEGURADORA],
    calendar,
    now,
  });

  it("mostra só os negócios do colaborador, ordenados por gravidade", () => {
    expect(result.deals.map((deal) => [deal.id, deal.status])).toEqual([
      ["1", "risk"],
      ["2", "today"],
      ["3", "waiting"],
      ["4", "upcoming"],
      ["6", "upcoming"],
      ["5", "resolved"],
    ]);
  });

  it("descreve prazo, ação e escalonamento", () => {
    expect(result.deals[0]).toMatchObject({
      origin: "crm",
      clientName: "Cliente 1",
      nextAction: "Enviar cotação",
      deadlineLabel: "Em atraso há 1 dia · superior notificado",
      priority: "danger",
    });
    expect(result.deals[2]?.deadlineLabel).toBe("Aguardando terceiros · prazo em 4 dias");
    expect(result.deals.find((deal) => deal.id === "6")?.deadlineLabel).toBe("Sem prazo pendente");
  });

  it("calcula os indicadores", () => {
    expect(result.summary).toEqual({
      activeDeals: 5,
      actionsToday: 2,
      atRisk: 1,
      resolvedToday: 1,
    });
  });

  it("gera o resumo sem IA", () => {
    expect(result.briefing).toBe(
      'Você tem 1 ação em risco. Comece por "Enviar cotação" em Cliente 1 (em atraso há 1 dia · ' +
        "superior notificado). 1 negócio aguarda terceiros e está sendo monitorado.",
    );
  });

  it("dia tranquilo", () => {
    const calm = projectJourney({
      userId: "7",
      deals: [dealView("1")],
      occurrences: [],
      rules: [RULE_COTACAO],
      calendar,
      now,
    });
    expect(calm.briefing).toBe("Nenhuma ação vence hoje.");
  });
});
