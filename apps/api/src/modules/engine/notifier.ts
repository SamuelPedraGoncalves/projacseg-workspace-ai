import type { FastifyBaseLogger } from "fastify";
import type { Messenger } from "../../integrations/bitrix24/bot-messenger";
import type { Store, TenantRecord } from "../../store/types";
import { inPilot } from "../tenants/pilot";
import type { Notifier } from "./ports";

/**
 * Envia pelo bot, uma única vez por `dedupeKey`. Se o envio falhar, libera a chave para nova
 * tentativa no próximo ciclo — o motor nunca para por causa de uma mensagem.
 */
export class DedupNotifier implements Notifier {
  constructor(
    private readonly store: Store,
    private readonly messenger: Messenger,
    private readonly log: Pick<FastifyBaseLogger, "warn">,
  ) {}

  async notify(
    tenant: TenantRecord,
    userId: string,
    kind: string,
    dedupeKey: string,
    message: string,
  ): Promise<boolean> {
    // Última barreira do modo piloto: nada sai para quem está fora dele.
    if (!inPilot(tenant, userId)) return false;
    if (!(await this.store.notifications.claim(tenant.id, userId, kind, dedupeKey))) return false;
    try {
      await this.messenger.sendToUser(tenant, userId, message);
      return true;
    } catch (error) {
      await this.store.notifications.release(tenant.id, dedupeKey);
      this.log.warn(
        { err: error, kind, tenant: tenant.domain },
        "Mensagem não enviada; nova tentativa no próximo ciclo.",
      );
      return false;
    }
  }
}
