import { atLocalTime, isBusinessDay, localDateKey, ruleMode } from "@projacseg/engine";
import type { Store, TenantRecord } from "../../store/types";
import { buildJourney } from "../journey/journey.service";
import type { Notifier } from "./ports";

/**
 * Resumo diário enviado pelo bot a cada colaborador com pendências, no horário configurado da
 * empresa (dias úteis). Texto do motor — não é IA. Uma vez por dia por colaborador.
 *
 * Só recebe resumo quem tem ocorrência aberta de regra **ativa**: com todas as regras em modo sombra,
 * nenhum resumo é enviado (o Workspace não manda mensagens enquanto as automações do Bitrix24 cuidam
 * dos avisos).
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

    const rules = await this.store.rules.list(tenant.id);
    const active = new Set(
      rules.filter((rule) => ruleMode(rule) === "active").map((rule) => rule.code),
    );
    const open = await this.store.occurrences.listOpen(tenant.id);
    const users = [
      ...new Set(
        open.filter((item) => active.has(item.ruleCode)).map((item) => item.responsibleId),
      ),
    ];
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
