import { useQuery } from "@tanstack/react-query";
import { usePlatform } from "../../platform/platform-context";
import { JourneyApiError, type JourneyData } from "./deals-repository";

/** Com dados reais, o painel se atualiza sozinho (o motor reavalia prazos a cada minuto). */
const REFRESH_MS = 60_000;

function useJourneyQuery<T>(select: (data: JourneyData) => T) {
  const { journey } = usePlatform();
  return useQuery({
    queryKey: ["journey", journey.source],
    queryFn: () => journey.getJourney(),
    select,
    refetchInterval: journey.source === "crm" ? REFRESH_MS : false,
    refetchOnWindowFocus: journey.source === "crm",
    retry: (count, error) =>
      !(error instanceof JourneyApiError && error.status === 401) && count < 2,
  });
}

export const useJourney = () => useJourneyQuery((data) => data);
export const useDeals = () => useJourneyQuery((data) => data.deals);
export const useJourneySummary = () => useJourneyQuery((data) => data.summary);
export const useBriefing = () => useJourneyQuery((data) => data.briefing);
