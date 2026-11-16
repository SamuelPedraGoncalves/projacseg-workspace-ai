/**
 * Chamada à REST API do Bitrix24 com o token recebido num evento do próprio portal.
 * O token é usado só nesta chamada: não é armazenado nem registrado em log.
 */
export interface Bitrix24RestClient {
  call(
    clientEndpoint: string,
    method: string,
    params: Record<string, string>,
    accessToken: string,
  ): Promise<unknown>;
}

export class FetchBitrix24RestClient implements Bitrix24RestClient {
  async call(
    clientEndpoint: string,
    method: string,
    params: Record<string, string>,
    accessToken: string,
  ): Promise<unknown> {
    const body = new URLSearchParams({ ...params, auth: accessToken });
    const response = await fetch(`${clientEndpoint}${method}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await response.json().catch(() => null)) as {
      result?: unknown;
      error?: string;
    } | null;
    if (!response.ok || !json || json.error) {
      throw new Error(
        `Bitrix24 ${method} falhou (${response.status}): ${json?.error ?? "sem corpo"}`,
      );
    }
    return json.result;
  }
}
