import { describe, expect, it } from "vitest";
import { cleanTitle, highlightDeals, toBitrixChat } from "./chat-format";

describe("formato do chat do Bitrix24", () => {
  it("limpa títulos com barras", () => {
    expect(cleanTitle("Seguro Novo: 198599 | Thais | Automóvel | 09/09/2026 |")).toBe(
      "Seguro Novo: 198599 · Thais · Automóvel · 09/09/2026",
    );
    expect(cleanTitle("Carlos Almeida - Auto")).toBe("Carlos Almeida - Auto");
  });

  it("destaca negócios e recoloca o nome, sem confundir #12 com #123", () => {
    const titles = new Map([
      ["Negócio #12", "Ana | Auto |"],
      ["Negócio #123", "Bruno"],
    ]);
    expect(highlightDeals("Veja o Negócio #123 e o [B]Negócio #12[/B].", titles)).toBe(
      "Veja o [B]Negócio #123[/B] (Bruno) e o [B]Negócio #12[/B] (Ana · Auto).",
    );
    expect(highlightDeals("Negócio #999", titles)).toBe("[B]Negócio #999[/B]");
  });

  it("com o domínio do portal, o negócio vira link para o card", () => {
    const titles = new Map([["Negócio #123", "Bruno | Auto |"]]);
    expect(highlightDeals("Abra o [B]Negócio #123[/B].", titles, "empresa.bitrix24.com.br")).toBe(
      "Abra o [URL=https://empresa.bitrix24.com.br/crm/deal/details/123/]Negócio #123[/URL] (Bruno · Auto).",
    );
  });

  it("converte resquícios de Markdown e arruma linhas", () => {
    expect(toBitrixChat("## Hoje\n\n\n\n- **Cotação** vencida\n* `ok`  \n")).toBe(
      "[B]Hoje[/B]\n\n• [B]Cotação[/B] vencida\n• ok",
    );
  });
});
