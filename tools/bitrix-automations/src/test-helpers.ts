import { deflateSync } from "node:zlib";

/** Serializador PHP mínimo, só para montar fixtures sintéticas nos testes. */
export function phpSerialize(value: unknown): string {
  if (value === null || value === undefined) return "N;";
  if (typeof value === "boolean") return `b:${value ? 1 : 0};`;
  if (typeof value === "number") return Number.isInteger(value) ? `i:${value};` : `d:${value};`;
  if (typeof value === "string") return `s:${Buffer.byteLength(value, "utf8")}:"${value}";`;
  const entries = Array.isArray(value)
    ? value.map((item, index) => [index, item] as const)
    : Object.entries(value as object);
  return `a:${entries.length}:{${entries.map(([key, item]) => `${phpSerialize(key)}${phpSerialize(item)}`).join("")}}`;
}

export const toBpt = (value: unknown) => deflateSync(Buffer.from(phpSerialize(value), "utf8"));

let counter = 0;
export function activity(
  type: string,
  properties: Record<string, unknown> = {},
  children: unknown[] = [],
  activated = "Y",
) {
  counter += 1;
  return {
    Type: type,
    Name: `A${counter}`,
    Activated: activated,
    Properties: properties,
    Children: children,
  };
}

export const task = (title: string, deadline: string, extra: Record<string, unknown> = {}) =>
  activity("Task2Activity", {
    Title: `Robô ${title}`,
    HoldToClose: "N",
    Fields: {
      TITLE: title,
      RESPONSIBLE_ID: "{=Document:ASSIGNED_BY_ID}",
      DEADLINE: deadline,
      AUDITORS: ["user_5"],
    },
    ...extra,
  });

export const branch = (title: string, condition: unknown[] | null, children: unknown[]) =>
  activity(
    "IfElseBranchActivity",
    condition ? { Title: title, fieldcondition: condition } : { Title: title, truecondition: "1" },
    children,
  );

export const sequence = (...children: unknown[]) => activity("SequenceActivity", {}, children);

export const FIELDS = {
  STAGE_ID: { Name: "Etapa", Options: { NEW: "Entrada do negócio", PREP: "Cotação" } },
  CATEGORY_ID: { Name: "Pipeline", Options: { "0": "Automóvel" } },
  UF_CRM_TIPO: { Name: "Tipo de Seguro", Options: { h1: "SEGURO NOVO", h2: "RENOVAÇÃO" } },
  UF_CRM_HOMOLOG: { Name: "Homologação" },
  UF_CRM_VIG: { Name: "Data Início de Vigência" },
};

export const template = (children: unknown[]) => ({
  VERSION: 2,
  TEMPLATE: [
    activity("SequentialWorkflowActivity", { Title: "Bizproc Automation template" }, children),
  ],
  PARAMETERS: [],
  VARIABLES: [],
  CONSTANTS: [],
  DOCUMENT_FIELDS: FIELDS,
});
