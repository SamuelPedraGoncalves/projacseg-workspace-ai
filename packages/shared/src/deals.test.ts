import { describe, expect, it } from "vitest";
import { dealSchema, type Deal } from "./deals";
import { filterDealsByView } from "./journey";

const base: Omit<Deal, "id" | "status" | "priority"> = {
  origin: "demo",
  clientName: "Cliente",
  branch: "Automóvel",
  nextAction: "Ação",
  deadlineLabel: "Hoje",
  pipelineName: "Automóvel",
  stageName: "Etapa",
  responsibleName: "Lucas",
};

const deals: Deal[] = [
  { ...base, id: "1", status: "today", priority: "danger" },
  { ...base, id: "2", status: "risk", priority: "danger" },
  { ...base, id: "3", status: "today", priority: "warning" },
  { ...base, id: "4", status: "waiting", priority: "neutral" },
  { ...base, id: "5", status: "resolved", priority: "success" },
];

const ids = (list: Deal[]) => list.map((deal) => deal.id);

describe("filterDealsByView", () => {
  it("Para hoje", () => expect(ids(filterDealsByView(deals, "today"))).toEqual(["1", "3"]));
  it("Em risco inclui qualquer prioridade crítica", () =>
    expect(ids(filterDealsByView(deals, "risk"))).toEqual(["1", "2"]));
  it("Aguardando", () => expect(ids(filterDealsByView(deals, "waiting"))).toEqual(["4"]));
  it("Resolvidas", () => expect(ids(filterDealsByView(deals, "resolved"))).toEqual(["5"]));
  it("Meus Negócios exclui resolvidos", () =>
    expect(ids(filterDealsByView(deals, "all"))).toEqual(["1", "2", "3", "4"]));
});

describe("dealSchema", () => {
  it("valida um negócio completo", () => {
    expect(dealSchema.safeParse(deals[0]).success).toBe(true);
  });

  it("rejeita situação desconhecida", () => {
    expect(dealSchema.safeParse({ ...deals[0], status: "archived" }).success).toBe(false);
  });
});
