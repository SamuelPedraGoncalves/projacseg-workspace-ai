import type { JourneyProjection } from "@projacseg/engine";
import { describe, expect, it } from "vitest";
import { buildContext, restoreNames } from "./assistant.service";

const journey: JourneyProjection = {
  summary: { activeDeals: 2, actionsToday: 1, atRisk: 1, resolvedToday: 0 },
  briefing: 'Você tem 1 ação em risco. Comece por "Enviar cotação" em Carlos Almeida (em atraso).',
  deals: [
    {
      id: "12",
      origin: "crm",
      clientName: "Carlos Almeida",
      branch: "Automóvel",
      nextAction: "Enviar cotação",
      deadlineLabel: "Em atraso",
      status: "risk",
      priority: "danger",
      pipelineName: "Automóvel",
      stageName: "Cotação",
      responsibleName: "Lucas",
    },
    {
      id: "123",
      origin: "crm",
      clientName: "Empresa Martins",
      branch: "Empresarial",
      nextAction: "Cadastrar no Teleport",
      deadlineLabel: "Vence amanhã",
      status: "upcoming",
      priority: "neutral",
      pipelineName: "Demais Ramos",
      stageName: "Proposta",
      responsibleName: "Lucas",
    },
  ],
};

describe("contexto enviado à IA", () => {
  it("com redação, não envia nomes de clientes nem do colaborador", () => {
    const { context } = buildContext(journey, "Lucas Carvalho", true);
    expect(context).not.toContain("Carlos Almeida");
    expect(context).not.toContain("Empresa Martins");
    expect(context).not.toContain("Lucas Carvalho");
    expect(context).toContain("Negócio #12");
    expect(context).toContain("em Negócio #12 (em atraso)");
  });

  it("sem redação, envia os nomes", () => {
    expect(buildContext(journey, "Lucas", false).context).toContain("Carlos Almeida");
  });

  it("recoloca os nomes sem confundir #12 com #123", () => {
    const { names } = buildContext(journey, "Lucas", true);
    expect(restoreNames("Priorize o Negócio #12 e depois o Negócio #123.", names)).toBe(
      "Priorize o Negócio #12 (Carlos Almeida) e depois o Negócio #123 (Empresa Martins).",
    );
    expect(restoreNames("Negócio #999 não existe.", names)).toBe("Negócio #999 não existe.");
  });
});
