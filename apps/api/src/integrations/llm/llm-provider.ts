/**
 * Interface desacoplada de provedor de IA. A aplicação só conhece este contrato; trocar de provedor
 * é escrever outra implementação. A IA nunca calcula prazos nem decide escalonamentos.
 */
export interface LlmProvider {
  readonly name: string;
  answer(input: {
    system: string;
    context: string;
    question: string;
    history?: ChatTurn[];
  }): Promise<LlmAnswer>;
  /**
   * Como `answer`, mas o modelo pode **propor** ações pelas ferramentas. As chamadas voltam para a
   * aplicação, que valida, autoriza e pede confirmação — nada é executado aqui.
   */
  plan?(input: {
    system: string;
    context: string;
    /** O que o modelo pode propor (etapas e campos liberados), em bloco próprio. */
    allowedActions: string;
    question: string;
    tools: ToolSpec[];
    history?: ChatTurn[];
  }): Promise<LlmPlan>;
}

/**
 * Trecho recente da conversa (sem nomes de clientes), para o modelo entender respostas curtas como
 * "o segundo" ou "sem retorno do cliente" a uma pergunta que ele mesmo fez.
 */
export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** Ferramenta oferecida ao modelo (JSON Schema estrito nos parâmetros). */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  input: unknown;
}

export type LlmPlan =
  | { ok: true; text: string; calls: ToolCall[] }
  | { ok: false; reason: "refused" | "rate_limited" | "unavailable" };

export type LlmAnswer =
  { ok: true; text: string } | { ok: false; reason: "refused" | "rate_limited" | "unavailable" };
