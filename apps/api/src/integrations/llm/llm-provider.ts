/**
 * Interface desacoplada de provedor de IA. A aplicação só conhece este contrato; trocar de provedor
 * é escrever outra implementação. A IA nunca calcula prazos nem decide escalonamentos.
 */
export interface LlmProvider {
  readonly name: string;
  answer(input: { system: string; context: string; question: string }): Promise<LlmAnswer>;
}

export type LlmAnswer =
  { ok: true; text: string } | { ok: false; reason: "refused" | "rate_limited" | "unavailable" };
