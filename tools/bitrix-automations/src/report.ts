import type { ConsolidatedRule, Escalation, Totals } from "./consolidate";
import { describeConditions, type FileInventory } from "./inventory";

const cell = (value: unknown) =>
  String(value ?? "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim() || "—";
const row = (values: unknown[]) => `| ${values.map(cell).join(" | ")} |`;
const table = (header: string[], rows: unknown[][]) =>
  [row(header), `| ${header.map(() => "---").join(" | ")} |`, ...rows.map(row)].join("\n");

const NOTE =
  "> Gerado por `tools/bitrix-automations` a partir das exportações `.bpt`. Não editar à mão: rode\n" +
  "> `pnpm --filter @projacseg/bitrix-automations analyze`. Dados anonimizados (USR-xx = usuário,\n" +
  "> HOST-xx = servidor externo); o mapa real fica em `data/private/` (fora do Git).";

export function inventoryReport(inventories: FileInventory[], totals: Totals): string {
  const sections = inventories.map((inv) => {
    const tasks = inv.tasks;
    const kinds = Object.entries(inv.activities)
      .filter(
        ([type]) =>
          !/^(Sequence|EmptyBlock|IfElse|IfElseBranch|Parallel|SequentialWorkflow)Activity$/.test(
            type,
          ),
      )
      .map(([type, count]) => `${type.replace(/Activity$/, "")} ${count.enabled}/${count.disabled}`)
      .join(" · ");
    return [
      `## ${inv.file} — ${inv.stage.pipeline} › ${inv.stage.stage}`,
      "",
      table(
        ["Item", "Valor"],
        [
          ["Arquivos recebidos", inv.originalNames.join(", ")],
          ["SHA-256", inv.sha256.slice(0, 16) + "…"],
          ["ID do modelo (do nome do arquivo)", inv.templateId],
          ["Etapa (código)", `${inv.stage.stageCode} — confiança ${inv.stage.confidence}`],
          ["Evidência da etapa", inv.stage.evidence],
          ["Gatilho", "Entrada do negócio na etapa (modelo de automação da etapa)"],
          [
            "Tarefas: habilitadas / produção / só homologação / desabilitadas",
            `${tasks.filter((t) => t.enabled).length} / ${tasks.filter((t) => t.production).length} / ${tasks.filter((t) => t.homologationOnly).length} / ${tasks.filter((t) => !t.enabled).length}`,
          ],
          [
            "Tarefas recriadas em laço (produção)",
            tasks.filter((t) => t.production && t.loop && t.waitsForCompletion).length,
          ],
          ["Avisos em produção", inv.notifications.filter((n) => n.production).length],
          [
            "Webhooks em produção (hosts)",
            [...new Set(inv.webhooks.filter((w) => w.production).map((w) => w.host))].join(", ") ||
              "nenhum",
          ],
          ["E-mails em produção", inv.emails.filter((e) => e.production).length],
          [
            "Apps externos (REST) em produção",
            [...new Set(inv.externalApps.filter((a) => a.production).map((a) => a.app))].join(
              "; ",
            ) || "nenhum",
          ],
          [
            "Encerra tarefas de",
            [
              ...new Set(
                inv.completions.filter((c) => c.production).flatMap((c) => c.closesTasksOf),
              ),
            ].join(", ") || "—",
          ],
          [
            "Muda etapa para",
            [...new Set(inv.stageChanges.filter((c) => c.production).map((c) => c.to))].join(
              ", ",
            ) || "—",
          ],
          [
            "Inicia outros fluxos (ID)",
            [
              ...new Set(inv.workflowStarts.filter((w) => w.production).map((w) => w.templateId)),
            ].join(", ") || "—",
          ],
          [
            "Copia negócio para",
            [
              ...new Set(
                inv.dealCopies
                  .filter((c) => c.production)
                  .map((c) => `${c.toPipeline} › ${c.toStage}`),
              ),
            ].join(", ") || "—",
          ],
          ["Atividades (habilitadas/desabilitadas)", kinds],
          [
            "Campos mais usados",
            inv.fieldsUsed
              .slice(0, 8)
              .map((f) => `${f.name} (${f.code})`)
              .join(", "),
          ],
        ],
      ),
      "",
      tasks.length
        ? table(
            [
              "Atividade",
              "Situação",
              "Tarefa",
              "Prazo",
              "Responsável",
              "Observadores",
              "Laço",
              "Condições",
            ],
            tasks.map((t) => [
              t.activityName,
              t.production ? "produção" : t.homologationOnly ? "só homologação" : "desabilitada",
              t.title || t.robotTitle,
              t.deadlineText,
              t.responsible.join(", "),
              t.observers.join(", "),
              t.loop && t.waitsForCompletion ? `recriada: ${t.loop}` : "—",
              describeConditions(t.conditions),
            ]),
          )
        : "_Sem robôs de criação de tarefa._",
    ].join("\n");
  });
  return [
    "# Inventário técnico das automações",
    "",
    NOTE,
    "",
    table(
      ["Indicador", "Quantidade"],
      [
        ["Arquivos recebidos / distintos", `${totals.files} / ${totals.distinctFiles}`],
        ["Configurações de criação de tarefa habilitadas", totals.taskConfigurationsEnabled],
        ["… em produção", totals.taskConfigurationsProduction],
        ["… só no ramo de homologação", totals.taskConfigurationsHomologationOnly],
        ["Configurações desabilitadas", totals.taskConfigurationsDisabled],
        ["Configurações em produção recriadas em laço", totals.tasksRecreatedInLoop],
        ["Regras consolidadas", totals.consolidatedRules],
        [
          "Avisos em produção / escalonamentos",
          `${totals.notificationsProduction} / ${totals.escalationsProduction}`,
        ],
      ],
    ),
    "",
    ...sections,
  ].join("\n");
}

export function taskMatrix(inventories: FileInventory[]): string {
  const rows = inventories
    .filter((inv) => inv.tasks.length)
    .map((inv) => {
      const prod = inv.tasks.filter((t) => t.production);
      return [
        inv.stage.pipeline,
        inv.stage.stage,
        inv.file,
        inv.tasks.filter((t) => t.enabled).length,
        prod.length,
        prod.filter((t) => t.loop && t.waitsForCompletion).length,
        [...new Set(prod.map((t) => `${t.title || t.robotTitle} (${t.deadlineText})`))].join("; "),
      ];
    });
  return [
    "# Matriz de tarefas por pipeline e etapa",
    "",
    NOTE,
    "",
    table(
      [
        "Pipeline",
        "Etapa",
        "Arquivo",
        "Habilitadas",
        "Produção",
        "Em laço",
        "Tarefas distintas (prazo)",
      ],
      rows,
    ),
  ].join("\n");
}

export function rulesReport(rules: ConsolidatedRule[]): string {
  return [
    "# Catálogo de regras operacionais (consolidado, NÃO homologado)",
    "",
    NOTE,
    "",
    "Agrupamento automático: mesmo pipeline, etapa, ação, prazo e responsável. Cada regra lista as",
    "atividades de origem (arquivo#atividade). Regras de finalidade semelhante compartilham a família.",
    "",
    table(
      [
        "ID",
        "Pipeline",
        "Etapa",
        "Família",
        "Ação",
        "Prazo",
        "Responsável",
        "Recriada em laço",
        "Variantes de condição",
        "Config.",
      ],
      rules.map((r) => [
        r.id,
        r.pipeline,
        r.stage,
        r.family,
        r.action,
        r.deadline,
        r.responsible,
        r.recreatedInLoop ? `sim — ${r.loopCondition}` : "não",
        r.conditionVariants.join(" ‖ "),
        r.configurations,
      ]),
    ),
    "",
    "## Rastreabilidade",
    "",
    ...rules.map(
      (r) => `- **${r.id}** — ${r.sources.map((s) => `\`${s.file}#${s.activity}\``).join(", ")}`,
    ),
  ].join("\n");
}

export function escalationReport(map: {
  escalations: Escalation[];
  reminders: Escalation[];
}): string {
  const rows = (items: Escalation[]) =>
    items.map((e) => [
      e.pipeline,
      e.stage,
      e.after,
      e.recipients.join(", "),
      e.repeats ? "sim (laço)" : "não",
      e.robot,
      e.source,
    ]);
  const header = ["Pipeline", "Etapa", "Quando", "Para", "Repete", "Robô", "Origem"];
  return [
    "# Mapa de escalonamentos e avisos atuais",
    "",
    NOTE,
    "",
    "## Escalonamentos (avisam alguém além do responsável)",
    "",
    table(header, rows(map.escalations)),
    "",
    "## Lembretes ao próprio responsável",
    "",
    table(header, rows(map.reminders)),
  ].join("\n");
}

export function dependencyReport(inventories: FileInventory[]): string {
  const rows = inventories.map((inv) => {
    const prod = <T extends { production: boolean }>(items: T[]) =>
      items.filter((item) => item.production);
    return [
      `${inv.stage.pipeline} › ${inv.stage.stage}`,
      [...new Set(prod(inv.completions).flatMap((c) => c.closesTasksOf))].join(", "),
      [
        ...new Set(
          prod(inv.stageChanges).map(
            (c) => `${c.to}${c.conditions.length ? ` se ${describeConditions(c.conditions)}` : ""}`,
          ),
        ),
      ].join("; "),
      [...new Set(prod(inv.loops).map((l) => l.title))].join("; "),
      [...new Set(prod(inv.workflowStarts).map((w) => w.templateId))].join(", "),
      [...new Set(prod(inv.dealCopies).map((c) => `${c.toPipeline} › ${c.toStage}`))].join(", "),
    ];
  });
  return [
    "# Matriz de dependências",
    "",
    NOTE,
    "",
    table(
      [
        "Etapa",
        "Encerra tarefas de",
        "Move o negócio para",
        "Laços (esperam conclusão/condição)",
        "Inicia fluxos (ID)",
        "Copia negócio para",
      ],
      rows,
    ),
  ].join("\n");
}
