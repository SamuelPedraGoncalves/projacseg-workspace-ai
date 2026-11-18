import { z } from "zod";
import { durationSchema } from "./calendar";

/** Código de campo do negócio no Bitrix24 (`UF_CRM_123`, `OPPORTUNITY`, `TYPE_ID`…). */
const fieldCode = z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Código de campo do Bitrix24 inválido");
/** Papel configurado por empresa (`tenants/<domínio>.json` → `roles`), nunca um ID de usuário. */
const roleCode = z.string().regex(/^[a-z0-9_]+$/, "Código de papel inválido");

/**
 * Condição sobre um campo do negócio. Valores de campos de lista são comparados pelo **ID do item**
 * (ver `crm.deal.fields`), não pelo texto exibido.
 */
export const fieldConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    field: fieldCode,
    operator: z.enum(["equals", "not_equals"]),
    value: z.string(),
  }),
  z.object({ field: fieldCode, operator: z.literal("in"), values: z.array(z.string()).min(1) }),
  z.object({ field: fieldCode, operator: z.enum(["empty", "not_empty"]) }),
]);

export type FieldCondition = z.infer<typeof fieldConditionSchema>;

/** Quem responde pela ocorrência. Padrão: o responsável do negócio. */
export const responsibleSchema = z.discriminatedUnion("from", [
  z.object({ from: z.literal("assignee") }),
  z.object({ from: z.literal("role"), role: roleCode }),
  /** Campo de usuário do negócio; vazio → responsável do negócio. */
  z.object({ from: z.literal("field"), field: fieldCode }),
]);

/** Destinatários de um nível de escalonamento. */
export const escalationLevelSchema = z
  .object({
    /** Superior do responsável no organograma do Bitrix24 (do nível correspondente). */
    superior: z.boolean(),
    roles: z.array(roleCode),
  })
  .refine((level) => level.superior || level.roles.length > 0, {
    message: "Cada nível de escalonamento precisa de um destinatário",
  });

/**
 * Regra operacional (configuração por empresa, nunca código). Modelo "SLA de etapa": quando o
 * negócio entra numa das etapas da regra, abre-se uma ocorrência com prazo; ela é resolvida quando o
 * negócio sai da etapa, é fechado ou cumpre a condição de conclusão. Corresponde às automações
 * atuais que criam tarefas ao mudar de etapa.
 */
export const ruleDefinitionSchema = z
  .object({
    code: z.string().regex(/^[a-z0-9_]+$/),
    name: z.string().min(1),
    enabled: z.boolean(),
    /** `false` até a ProjacSeg homologar a regra. */
    homologated: z.boolean(),
    /**
     * `shadow` (padrão): o motor calcula e mostra no dashboard, mas **não envia mensagens** — usado
     * enquanto a automação equivalente do Bitrix24 estiver ligada, para não duplicar avisos.
     * `active`: envia alertas e escalonamentos pelo bot.
     */
    mode: z.enum(["active", "shadow"]).optional(),
    /** Pipelines (CATEGORY_ID) onde vale; `null` = todos. */
    categoryIds: z.array(z.string()).nullable(),
    /** Etapas (STAGE_ID) que disparam a regra. */
    stageIds: z.array(z.string()).min(1),
    /**
     * `true`: uma única ocorrência acompanha o negócio enquanto ele estiver em **qualquer** das
     * etapas da regra (ex.: radar de vigência da entrada à negociação). Mudar entre essas etapas não
     * encerra nem reinicia o prazo; sair delas, sim.
     */
    keepAcrossStages: z.boolean().optional(),
    /**
     * Ciclo que recomeça a cada atividade real registrada (ex.: follow-up): o prazo conta da data
     * mais recente entre a entrada na etapa e o campo informado (`LAST_ACTIVITY_TIME`). Uma
     * atividade nova conclui a ocorrência atual e abre a próxima.
     */
    restartOn: z.object({ field: fieldCode }).optional(),
    /** Todas precisam valer **na abertura**; mudanças depois não encerram a ocorrência. */
    conditions: z.array(fieldConditionSchema).optional(),
    /** Próxima ação mostrada ao colaborador. */
    action: z.string().min(1),
    /** `waiting`: depende de terceiros (seguradora, cliente). */
    kind: z.enum(["action", "waiting"]),
    deadline: durationSchema,
    /**
     * Conta o prazo a partir de uma data do negócio (ex.: fim de vigência), antes ou depois dela, em
     * vez da entrada na etapa. Sem a data preenchida a ocorrência não abre. O prazo é fixado na
     * abertura: editar a data depois não adia a ocorrência.
     */
    deadlineFrom: z.object({ field: fieldCode, direction: z.enum(["after", "before"]) }).optional(),
    /** Conclui a ocorrência quando todas valem (ex.: "Número do cálculo" preenchido). */
    completeWhen: z.array(fieldConditionSchema).min(1).optional(),
    responsible: responsibleSchema.optional(),
    /** Fração do prazo a partir da qual a ocorrência entra em risco (0.75 = 75% do tempo). */
    riskAtRatio: z.number().gt(0).lt(1),
    /** Risco a partir de um tempo fixo antes do vencimento (substitui `riskAtRatio`). */
    riskBefore: durationSchema.optional(),
    escalation: z.object({
      /** Quantos níveis acima (0 = não escalona). */
      maxLevels: z.number().int().min(0).max(5),
      /** Intervalo entre níveis, contado a partir do vencimento. */
      interval: durationSchema,
      /** Primeiro nível só depois deste tempo vencido (padrão: no vencimento). */
      firstAfter: durationSchema.optional(),
      /** Destinatários por nível; sem esta lista, cada nível vai ao superior no organograma. */
      levels: z.array(escalationLevelSchema).optional(),
    }),
  })
  .refine(
    (rule) => !rule.escalation.levels || rule.escalation.levels.length >= rule.escalation.maxLevels,
    {
      message: "escalation.levels precisa cobrir todos os níveis de maxLevels",
      path: ["escalation", "levels"],
    },
  );

export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;

/** Campos do negócio usados pelas regras, já normalizados: lista de valores não vazios. */
export type DealFields = Readonly<Record<string, readonly string[]>>;

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

export const ruleMode = (rule: RuleDefinition): "active" | "shadow" => rule.mode ?? "shadow";

export function conditionHolds(condition: FieldCondition, fields: DealFields): boolean {
  const values = fields[condition.field] ?? [];
  switch (condition.operator) {
    case "equals":
      return values.includes(condition.value);
    case "not_equals":
      return !values.includes(condition.value);
    case "in":
      return values.some((value) => condition.values.includes(value));
    case "empty":
      return values.length === 0;
    case "not_empty":
      return values.length > 0;
  }
}

export function conditionsHold(
  conditions: readonly FieldCondition[] | undefined,
  fields: DealFields,
): boolean {
  return (conditions ?? []).every((condition) => conditionHolds(condition, fields));
}

/** Campos do negócio que precisam ser lidos do CRM para avaliar as regras. */
export function ruleFieldNames(rules: readonly RuleDefinition[]): string[] {
  const names = new Set<string>();
  for (const rule of rules) {
    for (const condition of [...(rule.conditions ?? []), ...(rule.completeWhen ?? [])]) {
      names.add(condition.field);
    }
    if (rule.deadlineFrom) names.add(rule.deadlineFrom.field);
    if (rule.restartOn) names.add(rule.restartOn.field);
    if (rule.responsible?.from === "field") names.add(rule.responsible.field);
  }
  return [...names].sort();
}

/** Papéis citados pelas regras (precisam estar definidos na configuração da empresa). */
export function ruleRoles(rules: readonly RuleDefinition[]): string[] {
  const roles = new Set<string>();
  for (const rule of rules) {
    if (rule.responsible?.from === "role") roles.add(rule.responsible.role);
    for (const level of rule.escalation.levels ?? [])
      for (const role of level.roles) roles.add(role);
  }
  return [...roles].sort();
}

export function ruleApplies(
  rule: RuleDefinition,
  deal: { categoryId: string; stageId: string; fields?: DealFields },
): boolean {
  return (
    rule.enabled &&
    rule.stageIds.includes(deal.stageId) &&
    (rule.categoryIds === null || rule.categoryIds.includes(deal.categoryId)) &&
    conditionsHold(rule.conditions, deal.fields ?? {})
  );
}
