import type { TokenCipher } from "../../security/token-cipher";
import type { Store, TenantRecord } from "../../store/types";
import { Bitrix24ApiError, type Bitrix24Response, type Bitrix24RestClient } from "./rest-client";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/** Renovação de tokens no servidor OAuth do Bitrix24 (oauth.bitrix.info). */
export interface Bitrix24OAuthClient {
  refresh(refreshToken: string): Promise<OAuthTokens>;
}

export class HttpBitrix24OAuthClient implements Bitrix24OAuthClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async refresh(refreshToken: string): Promise<OAuthTokens> {
    const url = new URL("https://oauth.bitrix.info/oauth/token/");
    url.search = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const json = (await response.json().catch(() => null)) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    } | null;
    if (!response.ok || !json?.access_token || !json.refresh_token) {
      throw new Error(`Renovação de token falhou: ${json?.error ?? response.status}`);
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    };
  }
}

/**
 * Acesso à REST API do portal de uma empresa com os tokens do aplicativo guardados no banco
 * (criptografados). Renova o token quando expira. Usado pelo motor (sincronização, hierarquia,
 * mensagens do bot) — nunca exposto ao navegador.
 */
export class Bitrix24Portal {
  private readonly refreshing = new Map<string, Promise<TenantRecord>>();

  constructor(
    private readonly store: Store,
    private readonly cipher: TokenCipher,
    private readonly rest: Bitrix24RestClient,
    private readonly oauth: Bitrix24OAuthClient | null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async saveTokens(tenant: TenantRecord, tokens: OAuthTokens): Promise<TenantRecord> {
    return this.store.tenants.update(tenant.id, {
      accessTokenEnc: this.cipher.encrypt(tokens.accessToken),
      refreshTokenEnc: this.cipher.encrypt(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
    });
  }

  private async refresh(tenant: TenantRecord): Promise<TenantRecord> {
    const pending = this.refreshing.get(tenant.id);
    if (pending) return pending;
    const task = (async () => {
      if (!this.oauth) {
        throw new Error("BITRIX24_CLIENT_ID/BITRIX24_CLIENT_SECRET não configurados.");
      }
      if (!tenant.refreshTokenEnc)
        throw new Error("Portal sem refresh token: reinstale o aplicativo.");
      const tokens = await this.oauth.refresh(this.cipher.decrypt(tenant.refreshTokenEnc));
      return this.saveTokens(tenant, tokens);
    })().finally(() => this.refreshing.delete(tenant.id));
    this.refreshing.set(tenant.id, task);
    return task;
  }

  async call<T>(
    tenantInput: TenantRecord,
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<Bitrix24Response<T>> {
    let tenant = tenantInput;
    if (!tenant.accessTokenEnc) throw new Error(`Portal ${tenant.domain} sem token: reinstale.`);
    const expiresSoon =
      !tenant.tokenExpiresAt || tenant.tokenExpiresAt.getTime() - this.now().getTime() < 60_000;
    if (expiresSoon && tenant.refreshTokenEnc && this.oauth) tenant = await this.refresh(tenant);

    try {
      return await this.rest.call<T>(
        tenant.clientEndpoint,
        method,
        params,
        this.cipher.decrypt(tenant.accessTokenEnc!),
      );
    } catch (error) {
      if (error instanceof Bitrix24ApiError && error.isExpiredToken && this.oauth) {
        const renewed = await this.refresh(tenant);
        return this.rest.call<T>(
          renewed.clientEndpoint,
          method,
          params,
          this.cipher.decrypt(renewed.accessTokenEnc!),
        );
      }
      throw error;
    }
  }

  /** Percorre todas as páginas (50 itens por página na REST do Bitrix24). */
  async callAll<T>(
    tenant: TenantRecord,
    method: string,
    params: Record<string, unknown>,
    extract: (result: unknown) => T[] = (result) => result as T[],
    maxPages = 400,
  ): Promise<T[]> {
    const items: T[] = [];
    let start: number | undefined = 0;
    for (let page = 0; page < maxPages && start !== undefined; page += 1) {
      const response: Bitrix24Response<unknown> = await this.call(tenant, method, {
        ...params,
        start,
      });
      items.push(...extract(response.result));
      start = response.next;
    }
    return items;
  }
}
