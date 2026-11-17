import type { TenantRecord } from "../../store/types";
import { pilotUsers } from "../../modules/tenants/pilot";
import type { Bitrix24Portal } from "./portal";

/** Bot como devolvido pelos métodos `imbot.v2.Bot.*`. */
interface BotV2 {
  id: number | string;
  code: string;
}

/** Propriedades exibidas no messenger do Bitrix24. */
export const ASSISTANT_BOT_PROPERTIES = {
  name: "Assistente ProjacSeg",
  workPosition: "Assistente operacional (em testes)",
} as const;

/** Mensagens do bot do assistente para um colaborador (chat privado no Bitrix24). */
export interface Messenger {
  sendToUser(tenant: TenantRecord, userId: string, message: string): Promise<void>;
}

const MAX_LIST_PAGES = 20;

/**
 * Bot do assistente na API de chatbots 2.0 (`imbot.v2`; a v1 está descontinuada).
 *
 * O bot é identificado pelo **código** da aplicação (`projacseg_assistant`, configurável); o ID
 * numérico é descoberto em cada portal e nunca fixado no código. As chamadas usam os tokens OAuth do
 * aplicativo guardados na instalação — o bot pertence ao aplicativo.
 */
export class AssistantBot implements Messenger {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly portal: Bitrix24Portal,
    readonly code: string,
  ) {}

  /**
   * Registra o bot (ou reaproveita o existente) e aponta os eventos para `webhookUrl`.
   * `Bot.register` com o mesmo código devolve o bot existente **sem atualizar**; por isso o
   * `Bot.update` em seguida mantém a URL certa quando o endereço público muda (ex.: túnel de testes).
   */
  async register(tenant: TenantRecord, webhookUrl: string): Promise<string> {
    const fields = {
      properties: ASSISTANT_BOT_PROPERTIES,
      eventMode: "webhook",
      webhookUrl,
      // Modo piloto: bot fora das listas e da busca do messenger para os demais colaboradores.
      isHidden: pilotUsers(tenant) !== null,
    };
    const registered = await this.portal.call<{ bot?: BotV2 }>(tenant, "imbot.v2.Bot.register", {
      fields: { code: this.code, type: "bot", ...fields },
    });
    const id = registered.result?.bot?.id;
    if (id === undefined || id === null) {
      throw new Error("imbot.v2.Bot.register não devolveu o bot registrado.");
    }
    await this.portal.call(tenant, "imbot.v2.Bot.update", { botId: Number(id), fields });
    this.ids.set(tenant.id, String(id));
    return String(id);
  }

  /** ID do bot neste portal (é também o diálogo com ele), ou `null` se não estiver registrado. */
  async botId(tenant: TenantRecord): Promise<string | null> {
    const cached = this.ids.get(tenant.id);
    if (cached) return cached;
    const limit = 50;
    for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
      const response = await this.portal.call<{ bots?: BotV2[]; hasNextPage?: boolean }>(
        tenant,
        "imbot.v2.Bot.list",
        { limit, offset: page * limit },
      );
      const bot = response.result?.bots?.find((item) => item.code === this.code);
      if (bot) {
        this.ids.set(tenant.id, String(bot.id));
        return String(bot.id);
      }
      if (!response.result?.hasNextPage) return null;
    }
    return null;
  }

  /** Envia como o bot para um diálogo (`"<userId>"` = chat privado; `"chat<ID>"` = grupo). */
  async send(
    tenant: TenantRecord,
    dialogId: string,
    message: string,
    botId?: string,
  ): Promise<void> {
    const id = botId ?? (await this.botId(tenant));
    if (!id) throw new Error(`Bot ${this.code} não registrado no portal ${tenant.domain}.`);
    await this.portal.call(tenant, "imbot.v2.Chat.Message.send", {
      botId: Number(id),
      dialogId,
      fields: { message },
    });
  }

  sendToUser(tenant: TenantRecord, userId: string, message: string): Promise<void> {
    return this.send(tenant, userId, message);
  }

  /** O bot foi removido do portal (evento `ONIMBOTV2DELETE`). */
  forget(tenantId: string): void {
    this.ids.delete(tenantId);
  }
}
