import { useQuery } from "@tanstack/react-query";
import { journeyRepository } from "./deals-repository";

export const journeyKeys = {
  deals: ["journey", "deals"] as const,
  summary: ["journey", "summary"] as const,
  briefing: ["journey", "briefing"] as const,
};

export function useDeals() {
  return useQuery({ queryKey: journeyKeys.deals, queryFn: () => journeyRepository.listDeals() });
}

export function useJourneySummary() {
  return useQuery({ queryKey: journeyKeys.summary, queryFn: () => journeyRepository.getSummary() });
}

export function useBriefing() {
  return useQuery({
    queryKey: journeyKeys.briefing,
    queryFn: () => journeyRepository.getBriefing(),
  });
}
