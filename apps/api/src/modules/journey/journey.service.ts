import {
  atLocalTime,
  notifiedWhenActive,
  projectJourney,
  type JourneyProjection,
} from "@projacseg/engine";
import type { Store, TenantRecord } from "../../store/types";
import { pilotUsers } from "../tenants/pilot";

/** Dashboard "Minha Jornada" de um colaborador, calculado pelo motor (sem IA). */
export async function buildJourney(
  store: Store,
  tenant: TenantRecord,
  userId: string,
  now: Date,
): Promise<JourneyProjection> {
  const deals = await store.deals.listByAssignee(tenant.id, userId);
  const startOfDay = atLocalTime(now, "00:00", tenant.config.calendar);
  const [occurrences, rules] = await Promise.all([
    store.occurrences.listForDeals(
      tenant.id,
      deals.map((deal) => deal.dealId),
      startOfDay,
    ),
    store.rules.list(tenant.id),
  ]);
  return projectJourney({
    userId,
    deals,
    occurrences,
    rules,
    calendar: tenant.config.calendar,
    now,
    // No modo piloto o superior (fora do piloto) não recebe o aviso: só fica registrado.
    escalationNotified: (occurrence, rule) =>
      notifiedWhenActive(occurrence, rule) && !pilotUsers(tenant),
  });
}
