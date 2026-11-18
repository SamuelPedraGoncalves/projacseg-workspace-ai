import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";
import type { CrmCatalog, FieldInfo } from "../../integrations/bitrix24/crm-reader";
import type { ToolCall, ToolSpec } from "../../integrations/llm/llm-provider";
import type {
  AssistantActionRecord,
  AssistantConfig,
  DealSnapshotRecord,
  Store,
  TenantRecord,
} from "../../store/types";
import { inPilot } from "../tenants/pilot";

/** Ferramentas que o modelo pode usar para **propor** ações. Nada é executado sem confirmação. */
export const ACTION_TOOLS: ToolSpec[] = [
  {
    name: "mover_etapa",
    description:
      "Propõe mover um negócio do colaborador para outra etapa do funil. Use só quando o " +
      "colaborador pedir claramente. O sistema pede a confirmação dele antes de executar.",
    parameters: {
      type: "object",
      properties: {
        negocio: { type: "integer", description: "Número do negócio, como em 'Negócio #123'." },
        etapa: {
          type: "string",
          description: "Nome da etapa de destino, exatamente como em <acoes_permitidas>.",
        },
      },
      required: ["negocio", "etapa"],
      additionalProperties: false,
    },
  },
  {
    name: "preencher_campo",
    description:
      "Propõe preencher um campo de um negócio do colaborador. Use só quando o colaborador " +
      "informar o valor. O sistema pede a confirmação dele antes de executar.",
    parameters: {
      type: "object",
      properties: {
        negocio: { type: "integer", description: "Número do negócio, como em 'Negócio #123'." },
        campo: {
          type: "string",
          description: "Nome do campo, exatamente como em <acoes_permitidas>.",
        },
        valor: {
          type: "string",
          description: "Valor informado pelo colaborador. Datas no formato DD/MM/AAAA.",
        },
      },
      required: ["negocio", "campo", "valor"],
      additionalProperties: false,
    },
  },
  {
    name: "descartar_negocio",
    description:
      "Propõe descartar (marcar como perdido) um negócio do colaborador, com o motivo. Use só quando " +
      "ele pedir claramente para descartar ou perder o negócio E informar o motivo; sem motivo, " +
      "pergunte qual é, mostrando as opções de <acoes_permitidas>. O sistema pede a confirmação dele.",
    parameters: {
      type: "object",
      properties: {
        negocio: { type: "integer", description: "Número do negócio, como em 'Negócio #123'." },
        motivo: {
          type: "string",
          description: "Motivo de perda, exatamente uma das opções de <acoes_permitidas>.",
        },
      },
      required: ["negocio", "motivo"],
      additionalProperties: false,
    },
  },
];

const discardInput = z.object({ negocio: z.number().int().positive(), motivo: z.string().min(1) });
const moveInput = z.object({ negocio: z.number().int().positive(), etapa: z.string().min(1) });
const fillInput = z.object({
  negocio: z.number().int().positive(),
  campo: z.string().min(1),
  valor: z.string().min(1).max(200),
});

/** Campos com estes tipos podem ser preenchidos pelo chat; os demais ficam de fora. */
const SUPPORTED_TYPES = new Set(["enumeration", "date", "string", "double", "integer"]);

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[*:]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

/** "17/11/2026", "17/11/26" ou "2026-11-17" → "2026-11-17" (data válida), senão `null`. */
export function parseUserDate(value: string): string | null {
  const text = value.trim();
  let year: number, month: number, day: number;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (br) {
    day = Number(br[1]);
    month = Number(br[2]);
    year = Number(br[3]!.length === 2 ? `20${br[3]}` : br[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type Resolved =
  | {
      ok: true;
      deal: DealSnapshotRecord;
      kind: AssistantActionRecord["kind"];
      payload: Record<string, string>;
      summary: string;
      comment: string;
    }
  | { ok: false; problem: string };

interface ActionsDeps {
  store: Store;
  /** Chamada REST ao portal com os tokens do aplicativo (Bitrix24Portal.call). */
  call: (tenant: TenantRecord, method: string, params: Record<string, unknown>) => Promise<unknown>;
  catalog: (tenant: TenantRecord) => Promise<CrmCatalog>;
  /** Depois de alterar o negócio: reavaliar no motor (prazos, dashboard). */
  onChanged?: (tenant: TenantRecord, dealId: string) => Promise<void>;
  log: Pick<FastifyBaseLogger, "warn" | "error">;
  now?: () => Date;
}

/**
 * Ações do assistente no CRM, com a autorização **no software** (não no prompt):
 * - só negócios do próprio colaborador (responsável), abertos, e só no modo piloto quando ativo;
 * - só etapas e campos liberados em `tenants/<domínio>.json` → `assistant`;
 * - valores conferidos (opção de lista existente, data válida, texto curto);
 * - nada é gravado sem o colaborador responder SIM; tudo fica registrado (AssistantAction) e o card
 *   recebe um comentário dizendo o que mudou e a pedido de quem.
 */
export class AssistantActions {
  private readonly now: () => Date;

  constructor(private readonly deps: ActionsDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  config(tenant: TenantRecord): AssistantConfig | null {
    const config = tenant.config.assistant;
    return config?.actions ? config : null;
  }

  /** O que o assistente pode fazer, para o contexto do modelo (sem dados de clientes). */
  async describe(tenant: TenantRecord): Promise<string> {
    const config = this.config(tenant);
    if (!config) return "";
    const catalog = await this.deps.catalog(tenant);
    const etapas = Object.entries(config.stages).map(([categoryId, stageIds]) => ({
      pipeline: catalog.categories.get(categoryId) ?? `Pipeline ${categoryId}`,
      etapas: stageIds.map((id) => catalog.stages.get(id) ?? id),
    }));
    const campos = config.fields.flatMap((code) => {
      const info = catalog.fieldInfo.get(code);
      if (!info || !SUPPORTED_TYPES.has(info.type)) return [];
      return [
        {
          campo: info.label,
          tipo: info.type === "enumeration" ? "lista" : info.type === "date" ? "data" : "texto",
          ...(info.items ? { opcoes: info.items.map((item) => item.value) } : {}),
        },
      ];
    });
    const descartar = Object.entries(config.discard ?? {}).map(([categoryId, discard]) => ({
      pipeline: catalog.categories.get(categoryId) ?? `Pipeline ${categoryId}`,
      etapaDePerdido: catalog.stages.get(discard.stage) ?? discard.stage,
      motivos: (catalog.fieldInfo.get(discard.reasonField)?.items ?? []).map((item) => item.value),
    }));
    return JSON.stringify(
      { moverEtapa: etapas, preencherCampo: campos, descartarNegocio: descartar },
      null,
      2,
    );
  }

  /** Valida as propostas do modelo e grava as que passarem como pendentes de confirmação. */
  async propose(
    tenant: TenantRecord,
    userId: string,
    calls: ToolCall[],
  ): Promise<{ pending: AssistantActionRecord[]; problems: string[] }> {
    const config = this.config(tenant);
    if (!config) return { pending: [], problems: [] };
    const now = this.now();
    // Um pedido novo substitui o que ainda esperava confirmação.
    for (const old of await this.deps.store.assistantActions.listPending(tenant.id, userId)) {
      await this.deps.store.assistantActions.update(old.id, {
        status: "cancelled",
        decidedAt: now,
        result: "Substituída por um pedido novo.",
      });
    }
    const pending: AssistantActionRecord[] = [];
    const problems: string[] = [];
    const catalog = await this.deps.catalog(tenant);
    for (const call of calls) {
      const resolved = await this.resolve(tenant, userId, config, catalog, call);
      if (!resolved.ok) {
        problems.push(resolved.problem);
        continue;
      }
      pending.push(
        await this.deps.store.assistantActions.create({
          tenantId: tenant.id,
          userId,
          dealId: resolved.deal.dealId,
          kind: resolved.kind,
          payload: { ...resolved.payload, __comment: resolved.comment },
          summary: resolved.summary,
          expiresAt: new Date(now.getTime() + (config.confirmMinutes ?? 10) * 60_000),
        }),
      );
    }
    return { pending, problems };
  }

  async hasPending(tenant: TenantRecord, userId: string): Promise<boolean> {
    return (await this.deps.store.assistantActions.listPending(tenant.id, userId)).length > 0;
  }

  /** Executa as ações pendentes do colaborador (resposta SIM). */
  async confirm(tenant: TenantRecord, userId: string, userName: string): Promise<string> {
    const config = this.config(tenant);
    const now = this.now();
    const lines: string[] = [];
    for (const action of await this.deps.store.assistantActions.listPending(tenant.id, userId)) {
      if (action.expiresAt < now) {
        await this.deps.store.assistantActions.update(action.id, {
          status: "expired",
          decidedAt: now,
          result: "Prazo de confirmação vencido.",
        });
        lines.push(`⏱ Expirou (peça de novo): ${action.summary}`);
        continue;
      }
      lines.push(await this.execute(tenant, userId, userName, config, action));
    }
    return lines.length > 0 ? lines.join("\n") : "Não há nenhuma alteração esperando confirmação.";
  }

  async cancel(tenant: TenantRecord, userId: string): Promise<string> {
    const now = this.now();
    const pending = await this.deps.store.assistantActions.listPending(tenant.id, userId);
    for (const action of pending) {
      await this.deps.store.assistantActions.update(action.id, {
        status: "cancelled",
        decidedAt: now,
        result: "Cancelada pelo colaborador.",
      });
    }
    return pending.length > 0
      ? "Combinado, não alterei nada."
      : "Não há nenhuma alteração esperando confirmação.";
  }

  private async execute(
    tenant: TenantRecord,
    userId: string,
    userName: string,
    config: AssistantConfig | null,
    action: AssistantActionRecord,
  ): Promise<string> {
    const finish = async (status: "executed" | "failed", result: string, line: string) => {
      await this.deps.store.assistantActions.update(action.id, {
        status,
        decidedAt: this.now(),
        result,
      });
      return line;
    };
    // A autorização é conferida de novo na hora de executar: o negócio pode ter mudado.
    const deal = await this.deps.store.deals.get(tenant.id, action.dealId);
    const { __comment: comment, ...fields } = action.payload;
    const stillAllowed =
      config !== null &&
      deal !== null &&
      !deal.closed &&
      deal.assignedById === userId &&
      inPilot(tenant, userId) &&
      (action.kind !== "stage" ||
        (config.stages[deal.categoryId] ?? []).includes(fields.STAGE_ID ?? "")) &&
      (action.kind !== "field" ||
        Object.keys(fields).every((code) => config.fields.includes(code))) &&
      (action.kind !== "discard" || config.discard?.[deal.categoryId]?.stage === fields.STAGE_ID);
    if (!stillAllowed) {
      return finish(
        "failed",
        "Não autorizada na execução.",
        `⚠ Não fiz (o negócio mudou ou não está mais com você): ${action.summary}`,
      );
    }
    try {
      await this.deps.call(tenant, "crm.deal.update", { id: Number(action.dealId), fields });
    } catch (error) {
      this.deps.log.error({ err: error, dealId: action.dealId }, "Falha ao alterar negócio.");
      return finish(
        "failed",
        error instanceof Error ? error.message.slice(0, 300) : "erro",
        `⚠ Não consegui alterar no Bitrix24: ${action.summary}`,
      );
    }
    try {
      await this.deps.call(tenant, "crm.timeline.comment.add", {
        fields: {
          ENTITY_ID: Number(action.dealId),
          ENTITY_TYPE: "deal",
          COMMENT: `Assistente ProjacSeg: ${comment ?? action.summary} A pedido de ${userName} (chat).`,
        },
      });
    } catch (error) {
      this.deps.log.warn({ err: error, dealId: action.dealId }, "Comentário no card não gravado.");
    }
    try {
      await this.deps.onChanged?.(tenant, action.dealId);
    } catch (error) {
      this.deps.log.warn({ err: error, dealId: action.dealId }, "Reavaliação após ação falhou.");
    }
    return finish("executed", "ok", `✅ Feito: ${action.summary}`);
  }

  private async resolve(
    tenant: TenantRecord,
    userId: string,
    config: AssistantConfig,
    catalog: CrmCatalog,
    call: ToolCall,
  ): Promise<Resolved> {
    const parsed =
      call.name === "mover_etapa"
        ? moveInput.safeParse(call.input)
        : call.name === "preencher_campo"
          ? fillInput.safeParse(call.input)
          : call.name === "descartar_negocio"
            ? discardInput.safeParse(call.input)
            : null;
    if (!parsed || !parsed.success) {
      return { ok: false, problem: "Não entendi uma das alterações pedidas." };
    }
    const dealId = String(parsed.data.negocio);
    const deal = await this.deps.store.deals.get(tenant.id, dealId);
    if (!deal || deal.assignedById !== userId || !inPilot(tenant, userId)) {
      return { ok: false, problem: `O Negócio #${dealId} não está entre os seus negócios.` };
    }
    if (deal.closed) return { ok: false, problem: `O Negócio #${dealId} já está fechado.` };
    // Só o número: o nome do cliente e o destaque entram na formatação do chat (highlightDeals).
    const label = `Negócio #${dealId}`;

    if ("motivo" in parsed.data) {
      const discard = config.discard?.[deal.categoryId];
      if (!discard) {
        return { ok: false, problem: `Não descarto negócios do funil "${deal.categoryName}".` };
      }
      const reasons = catalog.fieldInfo.get(discard.reasonField)?.items ?? [];
      const wanted = parsed.data.motivo;
      const reason = reasons.find((item) => normalize(item.value) === normalize(wanted));
      if (!reason) {
        return {
          ok: false,
          problem:
            `Para descartar o Negócio #${dealId} preciso de um destes motivos: ` +
            `${reasons.map((item) => item.value).join("; ")}.`,
        };
      }
      const lost = catalog.stages.get(discard.stage) ?? discard.stage;
      return {
        ok: true,
        deal,
        kind: "discard",
        payload: { STAGE_ID: discard.stage, [discard.reasonField]: reason.id },
        summary: `${label}: descartar (mover para "${lost}") com o motivo "${reason.value}".`,
        comment: `negócio descartado ("${lost}"), motivo "${reason.value}".`,
      };
    }

    if ("etapa" in parsed.data) {
      const wanted = parsed.data.etapa;
      const allowed = config.stages[deal.categoryId] ?? [];
      const target = allowed.find(
        (id) => normalize(catalog.stages.get(id) ?? id) === normalize(wanted),
      );
      const names = allowed.map((id) => catalog.stages.get(id) ?? id).join(", ");
      if (!target) {
        return {
          ok: false,
          problem:
            `Não posso mover o Negócio #${dealId} para "${wanted}". ` +
            (names
              ? `Etapas que posso usar neste funil: ${names}.`
              : "Neste funil não movo etapas."),
        };
      }
      if (target === deal.stageId) {
        return { ok: false, problem: `O Negócio #${dealId} já está em "${deal.stageName}".` };
      }
      const to = catalog.stages.get(target) ?? target;
      return {
        ok: true,
        deal,
        kind: "stage",
        payload: { STAGE_ID: target },
        summary: `${label}: mover de "${deal.stageName}" para "${to}".`,
        comment: `etapa alterada de "${deal.stageName}" para "${to}".`,
      };
    }

    const { campo, valor } = parsed.data;
    const fieldEntries = config.fields
      .map((code) => [code, catalog.fieldInfo.get(code)] as const)
      .filter((entry): entry is readonly [string, FieldInfo] =>
        Boolean(entry[1] && SUPPORTED_TYPES.has(entry[1].type)),
      );
    const field = fieldEntries.find(([, info]) => normalize(info.label) === normalize(campo));
    if (!field) {
      return {
        ok: false,
        problem:
          `Não posso preencher "${campo}". Campos que posso preencher: ` +
          `${fieldEntries.map(([, info]) => info.label.replace(/\*/g, "").trim()).join(", ")}.`,
      };
    }
    const [code, info] = field;
    const name = info.label.replace(/\*/g, "").trim();
    let stored: string;
    let shown: string;
    if (info.type === "enumeration") {
      const item = (info.items ?? []).find(
        (option) => normalize(option.value) === normalize(valor),
      );
      if (!item) {
        return {
          ok: false,
          problem: `"${valor}" não é uma opção de "${name}". Opções: ${(info.items ?? []).map((o) => o.value).join(", ")}.`,
        };
      }
      stored = item.id;
      shown = item.value;
    } else if (info.type === "date") {
      const date = parseUserDate(valor);
      if (!date)
        return { ok: false, problem: `"${valor}" não é uma data válida (use DD/MM/AAAA).` };
      stored = date;
      shown = date.split("-").reverse().join("/");
    } else if (info.type === "double" || info.type === "integer") {
      const number = Number(valor.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(number)) return { ok: false, problem: `"${valor}" não é um número.` };
      stored = String(number);
      shown = valor.trim();
    } else {
      stored = valor.trim();
      shown = stored;
    }
    return {
      ok: true,
      deal,
      kind: "field",
      payload: { [code]: stored },
      summary: `${label}: preencher "${name}" com "${shown}".`,
      comment: `campo "${name}" preenchido com "${shown}".`,
    };
  }
}
