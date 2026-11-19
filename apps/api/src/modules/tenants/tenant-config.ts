import {
  DEFAULT_CALENDAR,
  businessCalendarSchema,
  parseRules,
  ruleRoles,
  type RuleDefinition,
} from "@projacseg/engine";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { TenantConfig } from "../../store/types";

/**
 * Configuração de cada empresa em `tenants/<domínio>.json`, versionada no Git: mudar uma regra é um
 * commit revisável (trilha de auditoria das regras). Nada de IDs de pipeline, etapa ou campo no código.
 */
const fieldCode = z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Código de campo do Bitrix24 inválido");

const tenantFileSchema = z.object({
  calendar: businessCalendarSchema.optional(),
  fieldMapping: z
    .object({
      insuranceType: fieldCode.optional(),
      branch: fieldCode.optional(),
      validity: fieldCode.optional(),
      cpf: fieldCode.optional(),
      quoteNumber: fieldCode.optional(),
      lossReason: fieldCode.optional(),
    })
    .optional(),
  /** Quais negócios são Seguro Novo e Renovação (normalmente definido pela tela de mapeamento). */
  situations: z
    .object({
      categoryIds: z.array(z.string()).min(1),
      newBusinessValues: z.array(z.string()).min(1),
      renewalValues: z.array(z.string()).min(1),
    })
    .optional(),
  digestTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  aiEnabled: z.boolean().optional(),
  /** Papel → ID do usuário no Bitrix24 (ex.: "emissao": "15"). Usado por responsável e escalonamento. */
  roles: z
    .record(z.string().regex(/^[a-z0-9_]+$/), z.string().regex(/^\d+$/, "ID de usuário numérico"))
    .optional(),
  /**
   * Modo piloto: só estes usuários usam o Workspace (leitura do CRM, mensagens, chat, aplicativo).
   * Para testar num portal real sem afetar os demais colaboradores.
   */
  pilot: z
    .object({
      userIds: z.array(z.string().regex(/^\d+$/, "ID de usuário numérico")).min(1),
      /**
       * Modo de observação: usuário do piloto → colaborador cujos negócios ele vê (só leitura). O
       * colaborador observado continua fora do piloto: não acessa nada e não recebe mensagens.
       */
      viewAs: z.record(z.string().regex(/^\d+$/), z.string().regex(/^\d+$/)).optional(),
    })
    .refine((pilot) => Object.keys(pilot.viewAs ?? {}).every((id) => pilot.userIds.includes(id)), {
      message: "pilot.viewAs: só usuários do piloto podem observar outro colaborador",
      path: ["viewAs"],
    })
    .optional(),
  /**
   * Ações do assistente pelo chat. Só etapas e campos listados aqui; o servidor confere tudo antes de
   * executar e pede confirmação ao colaborador.
   */
  assistant: z
    .object({
      actions: z.boolean(),
      confirmMinutes: z.number().int().min(1).max(60).optional(),
      stages: z.record(z.string(), z.array(z.string()).min(1)),
      fields: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)),
      discard: z
        .record(
          z.string(),
          z.object({ stage: z.string(), reasonField: z.string().regex(/^[A-Z][A-Z0-9_]*$/) }),
        )
        .optional(),
    })
    .optional(),
  rules: z.unknown().optional(),
});

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  calendar: DEFAULT_CALENDAR,
  fieldMapping: {},
  digestTime: "08:00",
  aiEnabled: false,
  roles: {},
};

export interface TenantFile {
  config: TenantConfig;
  rules: RuleDefinition[];
  /** O arquivo define o calendário (vale como ajuste manual: não é importado do Bitrix24). */
  calendarDeclared: boolean;
}

const safeName = (domain: string) => domain.toLowerCase().replace(/[^a-z0-9.-]/g, "_");

export async function loadTenantFile(dir: string, domain: string): Promise<TenantFile | null> {
  const path = join(dir, `${safeName(domain)}.json`);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  const file = tenantFileSchema.parse(raw);
  const rules = parseRules(file.rules ?? []);
  const roles = file.roles ?? {};
  const missing = ruleRoles(rules).filter((role) => !roles[role]);
  if (missing.length > 0) {
    throw new Error(`Papéis usados nas regras sem usuário em "roles": ${missing.join(", ")}`);
  }
  return {
    config: {
      calendar: file.calendar ?? DEFAULT_TENANT_CONFIG.calendar,
      fieldMapping: file.fieldMapping ?? {},
      ...(file.situations ? { situations: file.situations } : {}),
      digestTime:
        file.digestTime === undefined ? DEFAULT_TENANT_CONFIG.digestTime : file.digestTime,
      aiEnabled: file.aiEnabled ?? false,
      roles,
      ...(file.pilot ? { pilotUserIds: file.pilot.userIds } : {}),
      ...(file.pilot?.viewAs ? { pilotViewAs: file.pilot.viewAs } : {}),
      ...(file.assistant ? { assistant: file.assistant } : {}),
    },
    rules,
    calendarDeclared: file.calendar !== undefined,
  };
}

/** Grava pipelines e etapas do portal para ajudar a preencher as regras (metadados, sem dados pessoais). */
export async function writeCatalogFile(
  dir: string,
  domain: string,
  catalog: { categories: Map<string, string>; stages: Map<string, string> },
): Promise<void> {
  if (!existsSync(dir)) return;
  const content = {
    aviso: "Gerado automaticamente. Use estes IDs em categoryIds e stageIds das regras.",
    pipelines: Object.fromEntries(catalog.categories),
    etapas: Object.fromEntries(catalog.stages),
  };
  await writeFile(
    join(dir, `${safeName(domain)}.catalog.json`),
    `${JSON.stringify(content, null, 2)}\n`,
  );
}
