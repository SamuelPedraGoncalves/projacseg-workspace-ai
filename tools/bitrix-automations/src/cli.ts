/**
 * Uso (a partir da raiz do repositório):
 *   pnpm --filter @projacseg/bitrix-automations analyze
 * Opções por variável de ambiente:
 *   BPT_DIR      pasta com os .bpt originais     (padrão: data/private/automations/raw)
 *   STAGE_MAP    mapa arquivo → etapa            (padrão: docs/reference/automations/stage-map.json)
 *   REDACTION    nomes a anonimizar (privado)    (padrão: data/private/automations/redaction.json)
 *   OUT_DIR      relatórios versionáveis         (padrão: docs/reference/automations)
 *   PRIVATE_DIR  mapa de pseudônimos (privado)   (padrão: data/private/automations)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodeBpt } from "./bpt";
import { consolidateRules, escalationMap, totals } from "./consolidate";
import { buildInventory, type StageRef } from "./inventory";
import { createRedactor } from "./redact";
import {
  dependencyReport,
  escalationReport,
  inventoryReport,
  rulesReport,
  taskMatrix,
} from "./report";

const root = resolve(process.cwd(), "../..");
const path = (env: string, fallback: string) => resolve(root, process.env[env] ?? fallback);
const bptDir = path("BPT_DIR", "data/private/automations/raw");
const stageMapFile = path("STAGE_MAP", "docs/reference/automations/stage-map.json");
const redactionFile = path("REDACTION", "data/private/automations/redaction.json");
const outDir = path("OUT_DIR", "docs/reference/automations");
const privateDir = path("PRIVATE_DIR", "data/private/automations");

const stageMap = JSON.parse(readFileSync(stageMapFile, "utf8")) as Record<string, StageRef>;
const redaction = existsSync(redactionFile)
  ? (JSON.parse(readFileSync(redactionFile, "utf8")) as { personNames?: string[] })
  : {};
const redactor = createRedactor(redaction);

const files = readdirSync(bptDir)
  .filter((name) => name.endsWith(".bpt"))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
const byHash = new Map<string, { file: string; names: string[]; raw: Buffer }>();
for (const name of files) {
  const raw = readFileSync(join(bptDir, name));
  const hash = createHash("sha256").update(raw).digest("hex");
  const entry = byHash.get(hash);
  if (entry) entry.names.push(name);
  else byHash.set(hash, { file: name.replace(/\s*\(\d+\)/, ""), names: [name], raw });
}

const inventories = [...byHash.values()].map(({ file, names, raw }) => {
  const key = file.replace(/\.bpt$/, "");
  const stage = stageMap[key] ?? {
    pipeline: "?",
    stage: "?",
    stageCode: "?",
    confidence: "a confirmar",
    evidence: "sem mapeamento",
  };
  return buildInventory({
    file: key,
    originalNames: names,
    template: decodeBpt(raw),
    stage,
    redactor,
  });
});

const rules = consolidateRules(inventories);
const escalations = escalationMap(inventories);
const summary = totals(inventories, rules, files.length);

mkdirSync(outDir, { recursive: true });
mkdirSync(privateDir, { recursive: true });
const json = (file: string, value: unknown) =>
  writeFileSync(join(outDir, file), `${JSON.stringify(value, null, 2)}\n`);
json("inventory.json", { generatedFrom: files.length, totals: summary, files: inventories });
json("rules.catalog.json", { status: "consolidado, não homologado", rules });
json("escalations.json", escalations);
writeFileSync(join(outDir, "INVENTARIO.md"), `${inventoryReport(inventories, summary)}\n`);
writeFileSync(join(outDir, "MATRIZ_TAREFAS.md"), `${taskMatrix(inventories)}\n`);
writeFileSync(join(outDir, "CATALOGO_REGRAS.md"), `${rulesReport(rules)}\n`);
writeFileSync(join(outDir, "ESCALONAMENTOS.md"), `${escalationReport(escalations)}\n`);
writeFileSync(join(outDir, "DEPENDENCIAS.md"), `${dependencyReport(inventories)}\n`);
writeFileSync(
  join(privateDir, "pseudonyms.json"),
  `${JSON.stringify(redactor.privateMap(), null, 2)}\n`,
);

console.log(JSON.stringify(summary, null, 2));
