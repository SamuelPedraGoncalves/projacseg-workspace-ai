// Lógica pura (sem Zod): pode ser importada pelo frontend sem levar os schemas para o bundle.
import type { Deal, JourneyView } from "./deals";

/**
 * Regra única de filtragem usada pela interface (e, no futuro, pela API).
 * - `all`: tudo que não está resolvido.
 * - `risk`: qualquer negócio com prioridade crítica, independentemente da situação.
 * - demais: correspondência direta com a situação.
 */
export function filterDealsByView(deals: readonly Deal[], view: JourneyView): Deal[] {
  switch (view) {
    case "all":
      return deals.filter((deal) => deal.status !== "resolved");
    case "risk":
      return deals.filter((deal) => deal.priority === "danger");
    default:
      return deals.filter((deal) => deal.status === view);
  }
}
