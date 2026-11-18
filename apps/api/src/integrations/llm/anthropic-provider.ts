import Anthropic from "@anthropic-ai/sdk";
import type { ChatTurn, LlmAnswer, LlmPlan, LlmProvider, ToolCall, ToolSpec } from "./llm-provider";

/**
 * Turnos anteriores da conversa, antes da mensagem atual (que traz os dados do painel atualizados).
 * A conversa precisa começar pelo colaborador.
 */
function previousTurns(history: ChatTurn[] = []): Anthropic.Beta.BetaMessageParam[] {
  const start = history.findIndex((turn) => turn.role === "user");
  if (start < 0) return [];
  return history.slice(start).map((turn) => ({ role: turn.role, content: turn.text }));
}

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
    history,
  }: {
    system: string;
    context: string;
    question: string;
    history?: ChatTurn[];
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
          ...previousTurns(history),
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

  /**
   * Uma chamada com ferramentas: o modelo responde em texto e/ou **propõe** ações (blocos tool_use).
   * Não há execução nem segunda volta aqui: as propostas voltam para a aplicação, que valida,
   * autoriza e pede a confirmação do colaborador antes de qualquer alteração.
   */
  async plan({
    system,
    context,
    allowedActions,
    question,
    tools,
    history,
  }: {
    system: string;
    context: string;
    allowedActions: string;
    question: string;
    tools: ToolSpec[];
    history?: ChatTurn[];
  }): Promise<LlmPlan> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system,
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters as Anthropic.Beta.BetaTool.InputSchema,
          strict: true,
        })),
        tool_choice: { type: "auto" },
        messages: [
          ...previousTurns(history),
          {
            role: "user",
            content:
              `<dados_do_painel>\n${context}\n</dados_do_painel>\n\n` +
              `<acoes_permitidas>\n${allowedActions}\n</acoes_permitidas>\n\n` +
              `<pedido_do_colaborador>\n${question}\n</pedido_do_colaborador>`,
          },
        ],
      });

      if (response.stop_reason === "refusal") return { ok: false, reason: "refused" };
      // Resposta cortada no limite: uma chamada de ferramenta pode estar incompleta — não usar.
      if (response.stop_reason === "max_tokens") return { ok: false, reason: "unavailable" };
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("\n")
        .trim();
      const calls: ToolCall[] = response.content.flatMap((block) =>
        block.type === "tool_use" ? [{ name: block.name, input: block.input }] : [],
      );
      return text || calls.length > 0
        ? { ok: true, text, calls }
        : { ok: false, reason: "unavailable" };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: "rate_limited" };
      if (error instanceof Anthropic.APIError) return { ok: false, reason: "unavailable" };
      throw error;
    }
  }
}
