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
const tenantFileSchema = z.object({
  calendar: businessCalendarSchema.optional(),
  fieldMapping: z
    .object({ branch: z.string().optional(), insuranceType: z.string().optional() })
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
      digestTime:
        file.digestTime === undefined ? DEFAULT_TENANT_CONFIG.digestTime : file.digestTime,
      aiEnabled: file.aiEnabled ?? false,
      roles,
    },
    rules,
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
