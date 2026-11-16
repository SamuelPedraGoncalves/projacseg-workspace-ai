import Anthropic from "@anthropic-ai/sdk";
import type { LlmAnswer, LlmProvider } from "./llm-provider";

/**
 * Claude via SDK oficial. Usa o fallback do servidor ("default"): se o modelo recusar por política,
 * a própria API tenta de novo num modelo de reserva na mesma chamada.
 * A chave fica só no servidor (ANTHROPIC_API_KEY ou perfil `ant auth login`).
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(
    private readonly model: string,
    apiKey?: string,
  ) {
    this.client = new Anthropic(apiKey ? { apiKey } : {});
  }

  async answer({
    system,
    context,
    question,
  }: {
    system: string;
    context: string;
    question: string;
  }): Promise<LlmAnswer> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        // Respostas curtas de chat; o limite real de tamanho é dado no prompt.
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system,
        messages: [
          {
            role: "user",
            content:
              `<dados_do_painel>\n${context}\n</dados_do_painel>\n\n` +
              `<pergunta_do_colaborador>\n${question}\n</pergunta_do_colaborador>`,
          },
        ],
      });

      if (response.stop_reason === "refusal") return { ok: false, reason: "refused" };
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("\n")
        .trim();
      return text ? { ok: true, text } : { ok: false, reason: "unavailable" };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: "rate_limited" };
      if (error instanceof Anthropic.APIError) return { ok: false, reason: "unavailable" };
      throw error;
    }
  }
}
