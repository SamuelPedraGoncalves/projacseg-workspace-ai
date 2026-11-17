/** Situação do bot do assistente no portal, segundo o backend. */
export type AssistantStatus =
  { status: "ready"; dialogId: string } | { status: "not-installed" } | { status: "unavailable" };

/**
 * Lê GET /api/v1/assistant com a sessão assinada pelo backend. O backend localiza o bot pelo código
 * da aplicação (`imbot.v2`); o navegador não chama a API de bots do Bitrix24.
 */
export async function fetchAssistantStatus(
  session: string,
  baseUrl = "",
): Promise<AssistantStatus> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/assistant`, {
      headers: { Authorization: `Bearer ${session}` },
    });
    if (!response.ok) return { status: "unavailable" };
    const body = (await response.json()) as { status?: unknown; dialogId?: unknown };
    if (
      body.status === "ready" &&
      typeof body.dialogId === "string" &&
      /^\d+$/.test(body.dialogId)
    ) {
      return { status: "ready", dialogId: body.dialogId };
    }
    if (body.status === "not-installed") return { status: "not-installed" };
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
