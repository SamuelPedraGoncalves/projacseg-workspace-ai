import { z } from "zod";

/** Situação do negócio na jornada do colaborador. */
/** `upcoming`: ação com prazo futuro (aparece só em Meus Negócios). */
export const dealStatusSchema = z.enum(["today", "risk", "waiting", "upcoming", "resolved"]);
export type DealStatus = z.infer<typeof dealStatusSchema>;

/** Prioridade visual (indicador lateral). Cores semânticas fixas, independentes do tema. */
export const dealPrioritySchema = z.enum(["danger", "warning", "neutral", "success"]);
export type DealPriority = z.infer<typeof dealPrioritySchema>;

export const dealSchema = z.object({
  id: z.string().min(1),
  /** `demo`: negócio fictício, não existe no Bitrix24. `crm`: lido do CRM do portal. */
  origin: z.enum(["demo", "crm"]),
  clientName: z.string().min(1),
  /** Ramo do seguro (Automóvel, Empresarial, Residencial…). */
  branch: z.string().min(1),
  /** Tipo do seguro (Novo, Renovação…). Opcional: nem todo ramo tem essa classificação. */
  insuranceType: z.string().min(1).optional(),
  nextAction: z.string().min(1),
  /** Prazo ou situação, já calculado pelo motor de regras (nunca pela IA). */
  deadlineLabel: z.string().min(1),
  status: dealStatusSchema,
  priority: dealPrioritySchema,
  pipelineName: z.string().min(1),
  stageName: z.string().min(1),
  /** Desde quando está na etapa atual ("10/11"). */
  stageSince: z.string().min(1).optional(),
  responsibleName: z.string().min(1),
});

export type Deal = z.infer<typeof dealSchema>;

export const journeySummarySchema = z.object({
  activeDeals: z.number().int().nonnegative(),
  actionsToday: z.number().int().nonnegative(),
  atRisk: z.number().int().nonnegative(),
  resolvedToday: z.number().int().nonnegative(),
});

export type JourneySummary = z.infer<typeof journeySummarySchema>;

/** Visões da jornada. `all` = Meus Negócios (todos os não resolvidos). */
export const journeyViewSchema = z.enum(["today", "all", "risk", "waiting", "resolved"]);
export type JourneyView = z.infer<typeof journeyViewSchema>;

/** Resposta de GET /api/v1/journey — o dashboard inteiro de um colaborador. */
export const journeyResponseSchema = z.object({
  deals: z.array(dealSchema),
  summary: journeySummarySchema,
  /** Resumo de prioridades gerado pelo motor de regras (texto determinístico, não é IA). */
  briefing: z.string(),
  generatedAt: z.iso.datetime(),
});

export type JourneyResponse = z.infer<typeof journeyResponseSchema>;
