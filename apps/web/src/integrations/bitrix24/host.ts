import type { UserContext } from "@projacseg/shared";
import { callBx24, type Bx24Sdk } from "./sdk";

/** Campos de `user.current` usados pela aplicação. */
interface Bx24CurrentUser {
  ID: string;
  NAME?: string;
  LAST_NAME?: string;
  PERSONAL_PHOTO?: string | null;
}

/** Item de `imbot.bot.list` (bots registrados pelo próprio aplicativo). */
interface Bx24Bot {
  ID: string | number;
  CODE: string;
}

export function initialsOf(name: string, lastName = ""): string {
  const parts = `${name} ${lastName}`.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Caminho do card do negócio dentro do portal. */
export function dealPath(dealId: string): string {
  if (!/^\d+$/.test(dealId)) throw new Error(`ID de negócio inválido: ${dealId}`);
  return `/crm/deal/details/${dealId}/`;
}

/**
 * Operações da aplicação sobre o portal Bitrix24 em que ela está aberta.
 * Tudo passa pela BX24 JS SDK, com as permissões do próprio usuário logado.
 */
export class Bitrix24Host {
  constructor(private readonly sdk: Bx24Sdk) {}

  /** Usuário logado no portal, com a foto do perfil (`PERSONAL_PHOTO`). */
  async getCurrentUser(): Promise<UserContext> {
    const user = await callBx24<Bx24CurrentUser>(this.sdk, "user.current");
    const name = [user.NAME, user.LAST_NAME].filter(Boolean).join(" ") || "Colaborador";
    const photo = user.PERSONAL_PHOTO?.trim();
    return {
      // Provisório: o portal identifica a empresa. O backend mapeará domínio → tenantId.
      tenantId: this.sdk.getDomain(),
      bitrixUserId: String(user.ID),
      name: user.NAME?.trim() || name,
      initials: initialsOf(user.NAME ?? name, user.LAST_NAME),
      ...(photo ? { avatarUrl: photo } : {}),
    };
  }

  /** Abre o card do negócio no slider do Bitrix24. */
  openDeal(dealId: string): void {
    this.sdk.openPath(dealPath(dealId));
  }

  /**
   * Abre o chat do assistente no messenger do Bitrix24. O bot é localizado pelo código (definido
   * pela aplicação ao registrá-lo), nunca por um ID fixo. Retorna `false` se o bot não estiver
   * registrado no portal.
   */
  async openAssistantChat(botCode: string): Promise<boolean> {
    const bot = await this.findBot(botCode);
    if (!bot) return false;
    this.sdk.im.openMessenger(String(bot.ID));
    return true;
  }

  /**
   * Registra (ou atualiza) o bot do assistente no portal. As mensagens enviadas a ele vão para
   * `eventsUrl` no backend. Atualizar a cada instalação mantém a URL certa quando o endereço público
   * muda (ex.: túnel de testes). Requer o escopo `imbot` e um administrador instalando.
   */
  async registerAssistantBot(botCode: string, eventsUrl: string): Promise<{ botId: string }> {
    const handlers = {
      EVENT_MESSAGE_ADD: eventsUrl,
      EVENT_WELCOME_MESSAGE: eventsUrl,
      EVENT_BOT_DELETE: eventsUrl,
    };
    const properties = {
      NAME: "Assistente ProjacSeg",
      WORK_POSITION: "Assistente operacional (em testes)",
      COLOR: "AZURE",
    };

    const existing = await this.findBot(botCode);
    if (existing) {
      await callBx24(this.sdk, "imbot.update", {
        BOT_ID: existing.ID,
        FIELDS: { ...handlers, PROPERTIES: properties },
      });
      return { botId: String(existing.ID) };
    }

    const botId = await callBx24<number | string>(this.sdk, "imbot.register", {
      CODE: botCode,
      TYPE: "B",
      OPENLINE: "N",
      ...handlers,
      PROPERTIES: properties,
    });
    return { botId: String(botId) };
  }

  /** Conclui a instalação; o Bitrix24 passa a abrir o aplicativo pelo handler. */
  finishInstall(): void {
    this.sdk.installFinish();
  }

  private async findBot(botCode: string): Promise<Bx24Bot | undefined> {
    const bots = await callBx24<Record<string, Bx24Bot> | Bx24Bot[]>(this.sdk, "imbot.bot.list");
    const list = Array.isArray(bots) ? bots : Object.values(bots ?? {});
    return list.find((item) => item.CODE === botCode);
  }
}
