import qs from "qs";

export interface Bitrix24Response<T = unknown> {
  result: T;
  next?: number;
  total?: number;
}

export class Bitrix24ApiError extends Error {
  constructor(
    readonly method: string,
    readonly code: string,
    readonly status: number,
    readonly description = "",
  ) {
    super(
      `Bitrix24 ${method} falhou (${status}): ${code}${description ? ` — ${description}` : ""}`,
    );
  }

  get isExpiredToken(): boolean {
    return this.code === "expired_token" || this.code === "invalid_token";
  }
}

/**
 * Chamada à REST API do Bitrix24. O token é usado só na chamada: não é armazenado nem registrado
 * em log. Parâmetros aninhados (filter, select, FIELDS) são enviados no formato do PHP.
 */
export interface Bitrix24RestClient {
  call<T = unknown>(
    clientEndpoint: string,
    method: string,
    params: Record<string, unknown>,
    accessToken: string,
  ): Promise<Bitrix24Response<T>>;
}

export class FetchBitrix24RestClient implements Bitrix24RestClient {
  async call<T>(
    clientEndpoint: string,
    method: string,
    params: Record<string, unknown>,
    accessToken: string,
  ): Promise<Bitrix24Response<T>> {
    const response = await fetch(`${clientEndpoint}${method}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: qs.stringify({ ...params, auth: accessToken }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json().catch(() => null)) as
      (Bitrix24Response<T> & { error?: string; error_description?: string }) | null;
    if (!response.ok || !json || json.error) {
      throw new Bitrix24ApiError(
        method,
        json?.error ?? "sem_corpo",
        response.status,
        json?.error_description ?? "",
      );
    }
    return json;
  }
}
