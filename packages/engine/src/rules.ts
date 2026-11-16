import { z } from "zod";
import { durationSchema } from "./calendar";

/**
 * Regra operacional (configuração por empresa, nunca código). Modelo "SLA de etapa": quando o
 * negócio entra numa das etapas da regra, abre-se uma ocorrência com prazo; ela é resolvida quando o
 * negócio sai da etapa ou é fechado. Corresponde às automações atuais que criam tarefas ao mudar de
 * etapa.
 */
export const ruleDefinitionSchema = z.object({
  code: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  enabled: z.boolean(),
  /** `false` até a ProjacSeg homologar a regra. */
  homologated: z.boolean(),
  /** Pipelines (CATEGORY_ID) onde vale; `null` = todos. */
  categoryIds: z.array(z.string()).nullable(),
  /** Etapas (STAGE_ID) que disparam a regra. */
  stageIds: z.array(z.string()).min(1),
  /** Próxima ação mostrada ao colaborador. */
  action: z.string().min(1),
  /** `waiting`: depende de terceiros (seguradora, cliente). */
  kind: z.enum(["action", "waiting"]),
  deadline: durationSchema,
  /** Fração do prazo a partir da qual a ocorrência entra em risco (0.75 = 75% do tempo). */
  riskAtRatio: z.number().gt(0).lt(1),
  escalation: z.object({
    /** Quantos níveis hierárquicos acima do responsável (0 = não escalona). */
    maxLevels: z.number().int().min(0).max(5),
    /** Intervalo entre níveis, contado a partir do vencimento. */
    interval: durationSchema,
  }),
});

export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;

/** Valida e devolve as regras; lança erro descritivo se houver configuração inválida ou duplicada. */
export function parseRules(input: unknown): RuleDefinition[] {
  const rules = z.array(ruleDefinitionSchema).parse(input);
  const codes = new Set<string>();
  for (const rule of rules) {
    if (codes.has(rule.code)) throw new Error(`Regra duplicada: ${rule.code}`);
    codes.add(rule.code);
  }
  return rules;
}

export function ruleApplies(
  rule: RuleDefinition,
  deal: { categoryId: string; stageId: string },
): boolean {
  return (
    rule.enabled &&
    rule.stageIds.includes(deal.stageId) &&
    (rule.categoryIds === null || rule.categoryIds.includes(deal.categoryId))
  );
}
