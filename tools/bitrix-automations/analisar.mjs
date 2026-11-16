#!/usr/bin/env node
// Analisa modelos de automação exportados do Bitrix24 (.bpt = PHP serialize comprimido com zlib).
// Somente leitura de dados: nada é executado. Uso:
//   node tools/bitrix-automations/analisar.mjs <pasta-com-bpt> [saida.json]
// Imprime, por arquivo: robôs de tarefa habilitados, em produção (fora do ramo "Homologação = SIM"),
// em laço, pistas da etapa; e grava a lista de tarefas em JSON.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

function unserialize(buf) {
  let i = 0;
  const until = (ch) => {
    const j = buf.indexOf(ch, i);
    const s = buf.toString("latin1", i, j);
    i = j + 1;
    return s;
  };
  const parse = () => {
    const t = String.fromCharCode(buf[i]);
    i += 2;
    switch (t) {
      case "N":
        return null;
      case "b":
        return until(";") === "1";
      case "i":
      case "d":
        return Number(until(";"));
      case "s": {
        const len = Number(until(":"));
        i += 1;
        const s = buf.toString("utf8", i, i + len);
        i += len + 2;
        return s;
      }
      case "a": {
        const n = Number(until(":"));
        i += 1;
        const obj = {};
        const keys = [];
        for (let k = 0; k < n; k += 1) {
          const key = parse();
          keys.push(key);
          obj[key] = parse();
        }
        i += 1;
        return keys.every((key, idx) => key === idx) ? keys.map((key) => obj[key]) : obj;
      }
      default:
        throw new Error(`Tipo PHP não suportado: ${t}`);
    }
  };
  return parse();
}

const clean = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
const [dir, out] = process.argv.slice(2);
if (!dir) {
  console.error("Uso: node analisar.mjs <pasta-com-bpt> [saida.json]");
  process.exit(1);
}

const seen = new Set();
const tasks = [];
const totals = { habilitadas: 0, producao: 0, emLaco: 0 };
for (const name of readdirSync(dir)
  .filter((file) => file.endsWith(".bpt"))
  .sort()) {
  const raw = readFileSync(join(dir, name));
  const hash = createHash("sha256").update(raw).digest("hex");
  if (seen.has(hash)) {
    console.log(`${name}: duplicado, ignorado`);
    continue;
  }
  seen.add(hash);
  const data = unserialize(inflateSync(raw));
  const fields = data.DOCUMENT_FIELDS ?? {};
  const stageNames = fields.STAGE_ID?.Options ?? {};
  const clues = new Set();
  const counts = { habilitadas: 0, producao: 0, emLaco: 0 };

  const walk = (a, off, homolog, loop, path) => {
    if (!a || typeof a !== "object") return;
    const p = a.Properties ?? {};
    const title = clean(p.Title);
    const isOff = off || a.Activated === "N";
    const isHomolog = homolog || (a.Type === "IfElseBranchActivity" && title === "SIM");
    const isLoop = loop || a.Type === "WhileActivity";
    const here =
      a.Type === "IfElseBranchActivity" || a.Type === "EmptyBlockActivity"
        ? [...path, title]
        : path;
    if (a.Type === "CrmCompleteTaskActivity") {
      clues.add(
        `encerra tarefas de: ${(p.TargetStatus ?? []).map((s) => stageNames[s] ?? s).join(", ")}`,
      );
    }
    if (a.Type === "Task2Activity" && !isOff) {
      counts.habilitadas += 1;
      if (!isHomolog) {
        counts.producao += 1;
        if (isLoop) counts.emLaco += 1;
        tasks.push({
          arquivo: name,
          robo: title,
          tarefa: clean(p.Fields?.TITLE),
          prazo: clean(p.Fields?.DEADLINE),
          responsavel: clean(p.Fields?.RESPONSIBLE_ID),
          recriadaEmLaco: isLoop && p.HoldToClose === "Y",
          caminho: here.filter(Boolean).join(" > "),
        });
      }
    }
    for (const child of a.Children ?? []) walk(child, isOff, isHomolog, isLoop, here);
  };
  walk(data.TEMPLATE?.[0], false, false, false, []);
  for (const key of Object.keys(totals)) totals[key] += counts[key];
  console.log(
    `${name}: ${counts.habilitadas} habilitadas, ${counts.producao} em produção, ${counts.emLaco} em laço` +
      (clues.size ? `\n  ${[...clues].join("\n  ")}` : ""),
  );
}
console.log(
  `\nTotal: ${totals.habilitadas} habilitadas, ${totals.producao} em produção, ${totals.emLaco} em laço`,
);
if (out) writeFileSync(out, `${JSON.stringify(tasks, null, 2)}\n`);
