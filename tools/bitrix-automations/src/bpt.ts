import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { phpUnserialize, type PhpRecord, type PhpValue } from "./php-unserialize";

/** Atividade de processo do Bitrix24 (forma relevante para a análise). */
export interface BpActivity {
  Type: string;
  Name: string;
  Activated?: string;
  Properties: PhpRecord;
  Children: BpActivity[];
}

export interface BptTemplate {
  version: number;
  root: BpActivity;
  /** Campos do documento (negócio): nome, tipo, opções. */
  documentFields: PhpRecord;
  sha256: string;
}

/** Limite de descompressão: protege contra "zip bomb". */
const MAX_INFLATED_BYTES = 64 * 1024 * 1024;

function asRecord(value: PhpValue | undefined): PhpRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : (Object.create(null) as PhpRecord);
}

function toActivity(value: PhpValue | undefined): BpActivity {
  const record = asRecord(value);
  const children = Array.isArray(record.Children) ? record.Children : [];
  return {
    Type: typeof record.Type === "string" ? record.Type : "?",
    Name: typeof record.Name === "string" ? record.Name : "",
    ...(typeof record.Activated === "string" ? { Activated: record.Activated } : {}),
    Properties: asRecord(record.Properties),
    Children: children.map(toActivity),
  };
}

/** Decodifica um .bpt (zlib + PHP serialize). Somente leitura; nada do arquivo é executado. */
export function decodeBpt(raw: Buffer): BptTemplate {
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const inflated = inflateSync(raw, { maxOutputLength: MAX_INFLATED_BYTES });
  const data = asRecord(phpUnserialize(inflated));
  const template = data.TEMPLATE;
  if (!Array.isArray(template) || template.length === 0) {
    throw new Error("Arquivo não parece um modelo de processo do Bitrix24 (sem TEMPLATE).");
  }
  return {
    version: typeof data.VERSION === "number" ? data.VERSION : 0,
    root: toActivity(template[0]),
    documentFields: asRecord(data.DOCUMENT_FIELDS),
    sha256,
  };
}
