/**
 * Formatação das mensagens no chat do Bitrix24. O messenger não entende Markdown: usa códigos próprios
 * ([B]negrito[/B]) e quebras de linha. Todas as respostas do assistente passam por aqui.
 */

/**
 * Títulos de negócio do Bitrix24 costumam vir com barras ("Seguro Novo: 198599 | Thais | Automóvel |").
 * Vira "Seguro Novo: 198599 · Thais · Automóvel".
 */
export function cleanTitle(title: string): string {
  return title
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

/**
 * Destaca as referências a negócios e recoloca o nome do cliente (que não vai para a IA):
 * "Negócio #123" → "[B]Negócio #123[/B] (Seguro Novo: 123 · Thais)". Com o domínio do portal, a
 * referência vira link para o card no próprio Bitrix24 (mesmo formato dos alertas do motor):
 * "[URL=https://<portal>/crm/deal/details/123/]Negócio #123[/URL] (…)".
 * Numa única passada, para "Negócio #12" nunca casar dentro de "Negócio #123"; aceita a referência
 * já em negrito.
 */
export function highlightDeals(
  text: string,
  titles: Map<string, string>,
  portalDomain?: string,
): string {
  return text.replace(
    /(\[B\])?Negócio #(\d+)(?!\d)(\[\/B\])?/g,
    (_match, _open: string | undefined, id: string) => {
      const reference = portalDomain
        ? `[URL=https://${portalDomain}/crm/deal/details/${id}/]Negócio #${id}[/URL]`
        : `[B]Negócio #${id}[/B]`;
      const title = titles.get(`Negócio #${id}`);
      return title ? `${reference} (${cleanTitle(title)})` : reference;
    },
  );
}

/** Converte resquícios de Markdown para o formato do chat e arruma espaços e linhas em branco. */
export function toBitrixChat(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.+?)\*\*/g, "[B]$1[/B]")
    .replace(/__(.+?)__/g, "[B]$1[/B]")
    .replace(/^#{1,6}[ \t]+(.+)$/gm, "[B]$1[/B]")
    .replace(/^[ \t]*[-*][ \t]+/gm, "• ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Regras de formato para o modelo (entram no prompt). */
export const FORMAT_RULES = `Formato da resposta — chat do Bitrix24, que NÃO entende Markdown:
- Comece pelo essencial, em uma frase.
- Uma informação por linha. Em listas, comece cada linha com "• ".
- Quando o colaborador tiver de escolher entre opções, numere ("1. …"), uma opção por linha, para ele poder responder só com o número.
- Destaque só o que importa com [B]texto[/B] (ex.: um prazo vencido). Nunca use **, #, tabelas ou blocos de código.
- Ao citar um negócio, escreva só "Negócio #123": o sistema acrescenta o nome do cliente e o destaque.
- Separe blocos de assunto com uma linha em branco. No máximo 12 linhas.`;
