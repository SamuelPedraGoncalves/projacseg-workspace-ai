import { atLocalTime, isBusinessDay, localDateKey } from "@projacseg/engine";
import type { Store, TenantRecord } from "../../store/types";
import { buildJourney } from "../journey/journey.service";
import type { Notifier } from "./ports";

/**
 * Resumo diário enviado pelo bot a cada colaborador com pendências, no horário configurado da
 * empresa (dias úteis). Texto do motor — não é IA. Uma vez por dia por colaborador.
 */
export class DigestService {
  constructor(
    private readonly store: Store,
    private readonly notifier: Notifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(tenant: TenantRecord): Promise<number> {
    const { digestTime, calendar } = tenant.config;
    const now = this.now();
    if (!digestTime || !isBusinessDay(now, calendar)) return 0;
    if (now < atLocalTime(now, digestTime, calendar)) return 0;

    const open = await this.store.occurrences.listOpen(tenant.id);
    const users = [...new Set(open.map((item) => item.responsibleId))];
    const day = localDateKey(now, calendar);
    let sent = 0;

    for (const userId of users) {
      const journey = await buildJourney(this.store, tenant, userId, now);
      const waiting = journey.deals.filter((deal) => deal.status === "waiting").length;
      const { atRisk, actionsToday } = journey.summary;
      if (atRisk + actionsToday + waiting === 0) continue;
      const message =
        `Resumo do dia: ${atRisk} em risco, ${actionsToday} para hoje, ${waiting} aguardando ` +
        `terceiros. ${journey.briefing}`;
      if (
        await this.notifier.notify(tenant, userId, "digest", `digest:${userId}:${day}`, message)
      ) {
        sent += 1;
      }
    }
    return sent;
  }
}
