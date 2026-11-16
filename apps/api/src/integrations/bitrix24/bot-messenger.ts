import type { TenantRecord } from "../../store/types";
import type { Bitrix24Portal } from "./portal";

interface Bot {
  ID: string | number;
  CODE: string;
}

/** Mensagens do bot do assistente para um colaborador (chat privado no Bitrix24). */
export interface Messenger {
  sendToUser(tenant: TenantRecord, userId: string, message: string): Promise<void>;
}

export class BotMessenger implements Messenger {
  private readonly botIds = new Map<string, string>();

  constructor(
    private readonly portal: Bitrix24Portal,
    private readonly botCode: string,
  ) {}

  private async botId(tenant: TenantRecord): Promise<string> {
    const cached = this.botIds.get(tenant.id);
    if (cached) return cached;
    const response = await this.portal.call<Record<string, Bot> | Bot[]>(tenant, "imbot.bot.list");
    const list = Array.isArray(response.result)
      ? response.result
      : Object.values(response.result ?? {});
    const bot = list.find((item) => item.CODE === this.botCode);
    if (!bot) throw new Error(`Bot ${this.botCode} não registrado no portal ${tenant.domain}.`);
    this.botIds.set(tenant.id, String(bot.ID));
    return String(bot.ID);
  }

  async sendToUser(tenant: TenantRecord, userId: string, message: string): Promise<void> {
    await this.portal.call(tenant, "imbot.message.add", {
      BOT_ID: await this.botId(tenant),
      DIALOG_ID: userId,
      MESSAGE: message,
    });
  }
}
