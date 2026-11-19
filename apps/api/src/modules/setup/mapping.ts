import type { MappingCatalog, MappingInput, MappingSuggestion } from "@projacseg/shared";
import { z } from "zod";
import type { CrmCatalog } from "../../integrations/bitrix24/crm-reader";

type MappedField = keyof MappingInput["fieldMapping"];

/** Palavras procuradas no rótulo de cada campo, na ordem de preferência. */
const KEYWORDS: Record<MappedField, string[]> = {
  insuranceType: ["tipo do seguro", "tipo de seguro", "tipo seguro"],
  branch: ["ramo"],
  validity: ["vigencia"],
  cpf: ["cpf"],
  quoteNumber: ["numero do calculo", "n do calculo", "calculo"],
  lossReason: ["motivo da perda", "motivo de perda"],
};

/** Minúsculas, sem acento e sem pontuação, com espaços nas pontas para casar palavras inteiras. */
function normalize(text: string): string {
  const plain = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${plain} `;
}

const contains = (text: string, keyword: string) => normalize(text).includes(` ${keyword} `);

/** Só campos personalizados do negócio entram no mapeamento. */
export function toMappingCatalog(catalog: CrmCatalog): MappingCatalog {
  return {
    categories: [...catalog.categories].map(([id, name]) => ({ id, name })),
    fields: [...catalog.fieldInfo]
      .filter(([code]) => code.startsWith("UF_CRM_"))
      .map(([code, info]) => ({
        code,
        label: info.label,
        type: info.type,
        ...(info.items ? { items: info.items } : {}),
      })),
  };
}

/**
 * Sugestão automática pelos rótulos dos campos (regras de texto, sem IA). Só o que for reconhecido
 * aparece; a pessoa sempre confere antes de salvar.
 */
export function suggestMapping(catalog: MappingCatalog): MappingSuggestion {
  const fieldMapping: MappingSuggestion["fieldMapping"] = {};
  for (const [name, keywords] of Object.entries(KEYWORDS) as [MappedField, string[]][]) {
    for (const keyword of keywords) {
      const field = catalog.fields.find((item) => contains(item.label, keyword));
      if (field) {
        fieldMapping[name] = field.code;
        break;
      }
    }
  }

  const situations: MappingSuggestion["situations"] = {
    categoryIds: catalog.categories.map((category) => category.id),
  };
  const typeField = catalog.fields.find((field) => field.code === fieldMapping.insuranceType);
  if (typeField?.items) {
    const ids = (word: string) =>
      typeField
        .items!.filter((item) => normalize(item.value).includes(word))
        .map((item) => item.id);
    const newBusiness = ids("novo");
    const renewal = ids("renov");
    if (newBusiness.length > 0) situations.newBusinessValues = newBusiness;
    if (renewal.length > 0) situations.renewalValues = renewal;
  }
  return { fieldMapping, situations };
}

const fieldCode = z.string().regex(/^UF_CRM_[A-Z0-9_]+$/);

const mappingSchema = z.object({
  fieldMapping: z.object({
    insuranceType: fieldCode,
    branch: fieldCode,
    validity: fieldCode.optional(),
    cpf: fieldCode.optional(),
    quoteNumber: fieldCode.optional(),
    lossReason: fieldCode.optional(),
  }),
  situations: z.object({
    categoryIds: z.array(z.string()),
    newBusinessValues: z.array(z.string()),
    renewalValues: z.array(z.string()),
  }),
});

export type MappingValidation = { ok: true; value: MappingInput } | { ok: false; errors: string[] };

/** Confere o formato e se tudo existe neste portal. Mensagens dizem qual campo ou valor. */
export function validateMapping(input: unknown, catalog: MappingCatalog): MappingValidation {
  const parsed = mappingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: ["Mapeamento em formato inválido."] };
  }
  const value = parsed.data as MappingInput;
  const errors: string[] = [];
  const fields = new Map(catalog.fields.map((field) => [field.code, field]));

  for (const code of Object.values(value.fieldMapping)) {
    if (code && !fields.has(code)) errors.push(`Campo "${code}" não existe neste portal.`);
  }

  const { categoryIds, newBusinessValues, renewalValues } = value.situations;
  if (categoryIds.length === 0) errors.push("Escolha ao menos um funil.");
  const categories = new Set(catalog.categories.map((category) => category.id));
  for (const id of categoryIds) {
    if (!categories.has(id)) errors.push(`O funil "${id}" não existe neste portal.`);
  }
  if (newBusinessValues.length === 0) errors.push("Escolha ao menos um valor de seguro novo.");
  if (renewalValues.length === 0) errors.push("Escolha ao menos um valor de renovação.");

  const typeField = fields.get(value.fieldMapping.insuranceType);
  if (typeField && !typeField.items) {
    errors.push(
      `O campo "${typeField.label}" precisa ser uma lista para indicar o tipo do seguro.`,
    );
  } else if (typeField?.items) {
    const items = new Map(typeField.items.map((item) => [item.id, item.value]));
    for (const id of [...newBusinessValues, ...renewalValues]) {
      if (!items.has(id)) {
        errors.push(`O valor "${id}" não é uma opção do campo "${typeField.label}".`);
      }
    }
    for (const id of newBusinessValues.filter((item) => renewalValues.includes(item))) {
      errors.push(
        `O valor "${items.get(id) ?? id}" não pode ser seguro novo e renovação ao mesmo tempo.`,
      );
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}
