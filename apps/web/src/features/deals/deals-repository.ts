import type { Deal, JourneySummary } from "@projacseg/shared";
import { DEMO_BRIEFING, DEMO_DEALS, DEMO_SUMMARY } from "./demo-data";

export interface JourneyData {
  deals: Deal[];
  summary: JourneySummary;
  /** Resumo de prioridades calculado pelo motor de regras (não é IA). */
  briefing: string;
  generatedAt: string;
}

/**
 * Fonte de dados da jornada. A interface só conhece este contrato: demonstração fora do Bitrix24,
 * API do backend (motor de regras + CRM) dentro dele.
 */
export interface JourneyRepository {
  readonly source: "demo" | "crm";
  getJourney(): Promise<JourneyData>;
}

export class DemoJourneyRepository implements JourneyRepository {
  readonly source = "demo";

  async getJourney(): Promise<JourneyData> {
    return {
      deals: DEMO_DEALS.map((deal) => ({ ...deal })),
      summary: { ...DEMO_SUMMARY },
      briefing: DEMO_BRIEFING,
      generatedAt: new Date().toISOString(),
    };
  }
}

export class JourneyApiError extends Error {
  constructor(readonly status: number) {
    super(status === 401 ? "Sessão expirada. Abra o aplicativo novamente." : "Falha ao carregar.");
  }
}

/** Lê GET /api/v1/journey com a sessão assinada pelo backend (não é token do Bitrix24). */
export class ApiJourneyRepository implements JourneyRepository {
  readonly source = "crm";

  constructor(
    private readonly session: string,
    private readonly baseUrl = "",
  ) {}

  async getJourney(): Promise<JourneyData> {
    const response = await fetch(`${this.baseUrl}/api/v1/journey`, {
      headers: { Authorization: `Bearer ${this.session}` },
    });
    if (!response.ok) throw new JourneyApiError(response.status);
    return (await response.json()) as JourneyData;
  }
}
