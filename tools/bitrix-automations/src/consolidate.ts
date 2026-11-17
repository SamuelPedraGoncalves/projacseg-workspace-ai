import { describeConditions, type FileInventory, type TaskRecord } from "./inventory";

/** Finalidade aproximada, para achar tarefas de títulos diferentes e propósito semelhante. */
const FAMILIES: [string, RegExp][] = [
  [
    "Preencher dados obrigatórios",
    /preench|informa[çc][õo]es (faltantes|obrigat)|n[ãa]o est[áa] completo/i,
  ],
  ["Cadastro no Teleport", /teleport/i],
  ["Envio de boleto", /boleto/i],
  ["Pendência", /pend[eê]n/i],
  ["Emissão / acompanhamento de emissão", /emiss/i],
  ["Negociação / follow-up", /negocia|follow/i],
  ["Cotação (elaborar/enviar)", /cota[çc]/i],
  ["Renovação (contato)", /renova/i],
  ["Novo negócio (primeiro contato)", /novo|contato/i],
];

export function familyOf(text: string): string {
  return FAMILIES.find(([, pattern]) => pattern.test(text))?.[0] ?? "Outros";
}

const normalize = (text: string) =>
  text
    .replace(/\{=[^}]*\}/g, "")
    .replace(/[|:\-–.!]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export interface ConsolidatedRule {
  id: string;
  pipeline: string;
  stage: string;
  family: string;
  action: string;
  deadline: string;
  responsible: string;
  /** Recriada após conclusão enquanto a condição do laço continuar. */
  recreatedInLoop: boolean;
  loopCondition: string | null;
  /** Condições distintas das cópias (ex.: PF e PJ). */
  conditionVariants: string[];
  configurations: number;
  sources: { file: string; activity: string; path: string }[];
}

/**
 * Agrupa as tarefas em produção em regras: mesmo pipeline, etapa, ação (título normalizado), prazo e
 * responsável. Cópias que só diferem pela ramificação (PF/PJ, campo vazio/preenchido) viram uma regra.
 */
export function consolidateRules(inventories: FileInventory[]): ConsolidatedRule[] {
  const groups = new Map<string, { inventory: FileInventory; tasks: TaskRecord[] }>();
  for (const inventory of inventories) {
    for (const task of inventory.tasks.filter((item) => item.production)) {
      const key = [
        inventory.stage.pipeline,
        inventory.stage.stage,
        normalize(task.title || task.robotTitle),
        task.deadlineText,
        task.responsible.join(","),
      ].join("|");
      const group = groups.get(key) ?? { inventory, tasks: [] };
      group.tasks.push(task);
      groups.set(key, group);
    }
  }

  const order = (rule: ConsolidatedRule) => `${rule.pipeline}|${rule.stage}|${rule.action}`;
  const rules = [...groups.values()].map(({ inventory, tasks }): ConsolidatedRule => {
    const first = tasks[0]!;
    const loops = tasks.filter((task) => task.loop && task.waitsForCompletion);
    return {
      id: "",
      pipeline: inventory.stage.pipeline,
      stage: inventory.stage.stage,
      family: familyOf(`${first.robotTitle} ${first.title}`),
      action: first.title.replace(/\s*\|\s*\{=Document:TITLE\}\s*$/, "") || first.robotTitle,
      deadline: first.deadlineText,
      responsible: first.responsible.join(", ") || "—",
      recreatedInLoop: loops.length > 0,
      loopCondition: loops[0]?.loop ?? null,
      conditionVariants: [
        ...new Set(
          tasks.map(
            (task) =>
              describeConditions(task.conditions.filter((c) => !/homolog/i.test(c.fieldName))) ||
              "sem condição",
          ),
        ),
      ],
      configurations: tasks.length,
      sources: tasks.map((task) => ({
        file: task.file,
        activity: task.activityName,
        path: task.path,
      })),
    };
  });
  rules.sort((a, b) => order(a).localeCompare(order(b), "pt-BR"));
  rules.forEach((rule, index) => (rule.id = `R${String(index + 1).padStart(2, "0")}`));
  return rules;
}

export interface Escalation {
  pipeline: string;
  stage: string;
  after: string;
  recipients: string[];
  toSupervisor: boolean;
  repeats: boolean;
  robot: string;
  source: string;
}

/** Avisos em produção dirigidos a alguém além do responsável do negócio = escalonamentos atuais. */
export function escalationMap(inventories: FileInventory[]): {
  escalations: Escalation[];
  reminders: Escalation[];
} {
  const escalations: Escalation[] = [];
  const reminders: Escalation[] = [];
  for (const inventory of inventories) {
    for (const notice of inventory.notifications.filter((item) => item.production)) {
      const entry: Escalation = {
        pipeline: inventory.stage.pipeline,
        stage: inventory.stage.stage,
        after:
          notice.delaysBefore.join(" + ") ||
          (notice.loop ? "a cada volta do laço" : "na entrada da etapa"),
        recipients: notice.recipients,
        toSupervisor: notice.toSupervisor,
        repeats: Boolean(notice.loop),
        robot: notice.robotTitle,
        source: notice.id,
      };
      const onlyResponsible = notice.recipients.every(
        (recipient) => recipient === "RESPONSÁVEL_DO_NEGÓCIO",
      );
      (onlyResponsible ? reminders : escalations).push(entry);
    }
  }
  return { escalations, reminders };
}

export interface Totals {
  files: number;
  distinctFiles: number;
  taskConfigurationsEnabled: number;
  taskConfigurationsProduction: number;
  taskConfigurationsHomologationOnly: number;
  taskConfigurationsDisabled: number;
  tasksRecreatedInLoop: number;
  consolidatedRules: number;
  notificationsProduction: number;
  escalationsProduction: number;
}

export function totals(
  inventories: FileInventory[],
  rules: ConsolidatedRule[],
  receivedFiles: number,
): Totals {
  const tasks = inventories.flatMap((inventory) => inventory.tasks);
  const notices = inventories
    .flatMap((inventory) => inventory.notifications)
    .filter((n) => n.production);
  return {
    files: receivedFiles,
    distinctFiles: inventories.length,
    taskConfigurationsEnabled: tasks.filter((task) => task.enabled).length,
    taskConfigurationsProduction: tasks.filter((task) => task.production).length,
    taskConfigurationsHomologationOnly: tasks.filter((task) => task.homologationOnly).length,
    taskConfigurationsDisabled: tasks.filter((task) => !task.enabled).length,
    tasksRecreatedInLoop: tasks.filter(
      (task) => task.production && task.loop && task.waitsForCompletion,
    ).length,
    consolidatedRules: rules.length,
    notificationsProduction: notices.length,
    escalationsProduction: escalationMap(inventories).escalations.length,
  };
}
