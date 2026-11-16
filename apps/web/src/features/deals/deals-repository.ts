import type { Deal, JourneySummary } from "@projacseg/shared";
import { DEMO_BRIEFING, DEMO_DEALS, DEMO_SUMMARY } from "./demo-data";

/**
 * Fonte de dados da jornada. A interface só conhece este contrato; trocar a demonstração pela API
 * (que consulta o Bitrix24 no backend) não exige mudar componentes.
 */
export interface JourneyRepository {
  listDeals(): Promise<Deal[]>;
  getSummary(): Promise<JourneySummary>;
  /** Resumo de prioridades exibido no banner. Hoje: texto fixo de demonstração. */
  getBriefing(): Promise<string>;
}

export class DemoJourneyRepository implements JourneyRepository {
  async listDeals(): Promise<Deal[]> {
    return DEMO_DEALS.map((deal) => ({ ...deal }));
  }

  async getSummary(): Promise<JourneySummary> {
    return { ...DEMO_SUMMARY };
  }

  async getBriefing(): Promise<string> {
    return DEMO_BRIEFING;
  }
}

export const journeyRepository: JourneyRepository = new DemoJourneyRepository();
