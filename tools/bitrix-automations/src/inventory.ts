import type { BpActivity, BptTemplate } from "./bpt";
import {
  formatDuration,
  parseDurationExpression,
  parseFixedDelay,
  type ParsedDuration,
} from "./expressions";
import type { PhpRecord, PhpValue } from "./php-unserialize";
import type { Redactor } from "./redact";

export interface StageRef {
  pipeline: string;
  stage: string;
  stageCode: string;
  confidence: "alta" | "média" | "a confirmar";
  evidence: string;
}

export interface Condition {
  field: string;
  fieldName: string;
  operator: string;
  value: string;
  joiner: "E" | "OU";
}

interface Common {
  /** Rastreabilidade: arquivo#nome-da-atividade. */
  id: string;
  file: string;
  activityName: string;
  robotTitle: string;
  enabled: boolean;
  /** Habilitada e fora do ramo de homologação. */
  production: boolean;
  homologationOnly: boolean;
  /** Título do laço "Enquanto…" que a contém, se houver. */
  loop: string | null;
  delaysBefore: string[];
  conditions: Condition[];
  path: string;
}

export interface TaskRecord extends Common {
  title: string;
  description: string;
  responsible: string[];
  participants: string[];
  observers: string[];
  createdBy: string[];
  deadline: ParsedDuration | null;
  deadlineText: string;
  /** Tarefa "segura" o fluxo até ser concluída (HoldToClose). Em laço = recriada após conclusão. */
  waitsForCompletion: boolean;
  allowChangeDeadline: boolean;
  taskControl: boolean;
  requiredResult: boolean;
  checklistItems: number;
}

export interface NotificationRecord extends Common {
  kind: string;
  recipients: string[];
  toSupervisor: boolean;
  message: string;
}

export interface FileInventory {
  file: string;
  originalNames: string[];
  sha256: string;
  templateId: string;
  version: number;
  stage: StageRef;
  activities: Record<string, { enabled: number; disabled: number }>;
  tasks: TaskRecord[];
  notifications: NotificationRecord[];
  webhooks: { id: string; robotTitle: string; host: string; production: boolean }[];
  emails: { id: string; robotTitle: string; subject: string; production: boolean }[];
  externalApps: { id: string; app: string; production: boolean }[];
  completions: { id: string; closesTasksOf: string[]; production: boolean }[];
  stageChanges: { id: string; to: string; production: boolean; conditions: Condition[] }[];
  workflowStarts: { id: string; templateId: string; production: boolean }[];
  dealCopies: { id: string; toPipeline: string; toStage: string; production: boolean }[];
  loops: { title: string; condition: string; production: boolean }[];
  fieldsUsed: { code: string; name: string; references: number }[];
}

interface Context {
  enabled: boolean;
  homologation: boolean;
  loop: string | null;
  delays: string[];
  conditions: Condition[];
  path: string[];
}

const str = (value: PhpValue | undefined): string => (typeof value === "string" ? value : "");
const yes = (value: PhpValue | undefined) => value === "Y" || value === true;

function fieldName(fields: PhpRecord, code: string): string {
  const meta = fields[code] ?? fields[code.replace(/_PRINTABLE$/, "")];
  return meta && typeof meta === "object" && !Array.isArray(meta) ? str(meta.Name) || code : code;
}

function optionLabel(fields: PhpRecord, code: string, value: string): string {
  const meta = fields[code];
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return value;
  const options = meta.Options;
  if (options && typeof options === "object" && !Array.isArray(options)) {
    const label = options[value];
    if (typeof label === "string") return label;
  }
  return value;
}

function parseConditions(
  properties: PhpRecord,
  fields: PhpRecord,
  redactor: Redactor,
): Condition[] {
  const raw =
    properties.fieldcondition ?? properties.propertyvariablecondition ?? properties.mixedcondition;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): Condition[] => {
    if (!Array.isArray(item)) return [];
    const [field, operator, value, joiner] = item.map((part) =>
      typeof part === "string" ? part : String(part ?? ""),
    );
    if (!field) return [];
    return [
      {
        field,
        fieldName: fieldName(fields, field),
        operator: operator || "=",
        value: redactor.text(optionLabel(fields, field, value ?? "")) || "(vazio)",
        joiner: joiner === "1" ? "OU" : "E",
      },
    ];
  });
}

export function describeConditions(conditions: Condition[]): string {
  return conditions
    .map((condition, index) => {
      if (condition.operator === "else") {
        return `${index === 0 ? "" : "E "}senão (${condition.value})`;
      }
      const op =
        condition.operator === "empty"
          ? "vazio"
          : condition.operator === "!empty"
            ? "preenchido"
            : condition.operator;
      const text = ["vazio", "preenchido"].includes(op)
        ? `${condition.fieldName} ${op}`
        : `${condition.fieldName} ${op} ${condition.value}`;
      return index === 0 ? text : `${condition.joiner} ${text}`;
    })
    .join(" ");
}

function delayOf(activity: BpActivity, fields: PhpRecord): string | null {
  const p = activity.Properties;
  const parsed =
    parseDurationExpression(p.TimeoutTime) ??
    parseFixedDelay(p.TimeoutDuration, p.TimeoutDurationType);
  if (parsed) {
    return formatDuration(
      parsed.anchor === "now" ? parsed : { ...parsed, anchor: fieldName(fields, parsed.anchor) },
    );
  }
  const raw = str(p.TimeoutTime);
  return raw ? `até ${raw.replace(/[{}=]/g, "").slice(0, 60)}` : null;
}

/** Inventário de um modelo (uma etapa). Somente leitura e anonimizado pelo `redactor`. */
export function buildInventory(input: {
  file: string;
  originalNames: string[];
  template: BptTemplate;
  stage: StageRef;
  redactor: Redactor;
}): FileInventory {
  const { file, template, redactor } = input;
  const fields = template.documentFields;
  const stageNames = (() => {
    const meta = fields.STAGE_ID;
    const options = meta && typeof meta === "object" && !Array.isArray(meta) ? meta.Options : null;
    return options && typeof options === "object" && !Array.isArray(options)
      ? (options as Record<string, PhpValue>)
      : {};
  })();
  const stageName = (code: string) => str(stageNames[code]) || code;
  const pipelineNames = (() => {
    const meta = fields.CATEGORY_ID;
    const options = meta && typeof meta === "object" && !Array.isArray(meta) ? meta.Options : null;
    return options && typeof options === "object" && !Array.isArray(options)
      ? (options as Record<string, PhpValue>)
      : {};
  })();

  const inventory: FileInventory = {
    file,
    originalNames: input.originalNames,
    sha256: template.sha256,
    templateId: file.replace(/^bp-|\.bpt$/g, ""),
    version: template.version,
    stage: input.stage,
    activities: {},
    tasks: [],
    notifications: [],
    webhooks: [],
    emails: [],
    externalApps: [],
    completions: [],
    stageChanges: [],
    workflowStarts: [],
    dealCopies: [],
    loops: [],
    fieldsUsed: [],
  };
  const fieldRefs = new Map<string, number>();
  const countField = (code: string) => fieldRefs.set(code, (fieldRefs.get(code) ?? 0) + 1);

  const walk = (activity: BpActivity, parent: BpActivity | null, context: Context) => {
    const p = activity.Properties;
    const title = redactor.text(p.Title);
    const enabled = context.enabled && activity.Activated !== "N";
    const isHomologBranch =
      activity.Type === "IfElseBranchActivity" &&
      /^sim$/i.test(str(p.Title).trim()) &&
      /homolog/i.test(str(parent?.Properties.Title));
    const here: Context = {
      ...context,
      enabled,
      homologation: context.homologation || isHomologBranch,
      path: ["IfElseBranchActivity", "EmptyBlockActivity", "WhileActivity"].includes(activity.Type)
        ? [...context.path, title]
        : context.path,
    };
    const stats = (inventory.activities[activity.Type] ??= { enabled: 0, disabled: 0 });
    stats[enabled ? "enabled" : "disabled"] += 1;

    for (const match of JSON.stringify(p).matchAll(/\b(UF_CRM_[A-Z0-9_]+?)(?:_PRINTABLE)?\b/g)) {
      countField(match[1]!);
    }

    if (activity.Type === "IfElseBranchActivity") {
      const conditions = parseConditions(p, fields, redactor);
      const otherwise: Condition = {
        field: "*",
        fieldName: "senão",
        operator: "else",
        value: title,
        joiner: "E",
      };
      here.conditions = [...context.conditions, ...(conditions.length ? conditions : [otherwise])];
    }
    if (activity.Type === "WhileActivity") {
      const condition = describeConditions(parseConditions(p, fields, redactor));
      here.loop = title || condition;
      inventory.loops.push({ title, condition, production: enabled && !here.homologation });
    }

    const common = (): Common => ({
      id: `${file}#${activity.Name}`,
      file,
      activityName: activity.Name,
      robotTitle: title,
      enabled,
      production: enabled && !here.homologation,
      homologationOnly: enabled && here.homologation,
      loop: here.loop,
      delaysBefore: [...context.delays],
      conditions: here.conditions,
      path: here.path.filter(Boolean).join(" › "),
    });

    switch (activity.Type) {
      case "Task2Activity": {
        const f = (
          p.Fields && typeof p.Fields === "object" && !Array.isArray(p.Fields) ? p.Fields : {}
        ) as PhpRecord;
        const parsed = parseDurationExpression(f.DEADLINE);
        const deadline =
          parsed && parsed.anchor !== "now"
            ? { ...parsed, anchor: fieldName(fields, parsed.anchor) }
            : parsed;
        inventory.tasks.push({
          ...common(),
          title: redactor.text(f.TITLE),
          description: redactor.text(f.DESCRIPTION).slice(0, 300),
          responsible: redactor.users(f.RESPONSIBLE_ID),
          participants: redactor.users(f.ACCOMPLICES),
          observers: redactor.users(f.AUDITORS),
          createdBy: redactor.users(f.CREATED_BY),
          deadline,
          deadlineText: deadline
            ? formatDuration(deadline)
            : str(f.DEADLINE)
              ? "expressão não reconhecida"
              : "sem prazo",
          waitsForCompletion: yes(p.HoldToClose),
          allowChangeDeadline: yes(f.ALLOW_CHANGE_DEADLINE),
          taskControl: yes(f.TASK_CONTROL),
          requiredResult: yes(f.REQUIRED_RESULT),
          checklistItems: Array.isArray(p.CheckListItems) ? p.CheckListItems.length : 0,
        });
        break;
      }
      case "CrmControlNotifyActivity":
      case "ImMessageActivity":
      case "IMNotifyActivity":
      case "SocNetMessageActivity": {
        const message =
          p.MessageText ??
          (p.MessageFields && typeof p.MessageFields === "object" && !Array.isArray(p.MessageFields)
            ? `${str(p.MessageFields.MessageTitle)} ${str(p.MessageFields.MessageText)}`
            : p.MessageSite);
        const toSupervisor = activity.Type === "CrmControlNotifyActivity" && yes(p.ToHead);
        inventory.notifications.push({
          ...common(),
          kind: activity.Type,
          recipients: [
            ...(toSupervisor ? ["SUPERIOR_DO_RESPONSÁVEL"] : []),
            ...redactor.users(p.ToUsers ?? p.MessageUserTo),
          ],
          toSupervisor,
          message: redactor.text(message).slice(0, 200),
        });
        break;
      }
      case "WebHookActivity":
        inventory.webhooks.push({
          id: common().id,
          robotTitle: title,
          host: str(p.Handler) ? redactor.host(str(p.Handler)) : "?",
          production: common().production,
        });
        break;
      case "MailActivity":
        inventory.emails.push({
          id: common().id,
          robotTitle: title,
          subject: redactor.text(p.MailSubject).slice(0, 120),
          production: common().production,
        });
        break;
      case "CrmCompleteTaskActivity": {
        const statuses = Array.isArray(p.TargetStatus)
          ? p.TargetStatus.map((s) => stageName(String(s)))
          : [];
        inventory.completions.push({
          id: common().id,
          closesTasksOf: statuses,
          production: common().production,
        });
        break;
      }
      case "SetFieldActivity": {
        const values =
          p.FieldValue && typeof p.FieldValue === "object" && !Array.isArray(p.FieldValue)
            ? p.FieldValue
            : {};
        if (typeof values.STAGE_ID === "string") {
          inventory.stageChanges.push({
            id: common().id,
            to: stageName(values.STAGE_ID),
            production: common().production,
            conditions: here.conditions,
          });
        }
        break;
      }
      case "CrmChangeStatusActivity":
        inventory.stageChanges.push({
          id: common().id,
          to: stageName(str(p.TargetStatus)),
          production: common().production,
          conditions: here.conditions,
        });
        break;
      case "StartWorkflowActivity":
        inventory.workflowStarts.push({
          id: common().id,
          templateId: str(p.TemplateId),
          production: common().production,
        });
        break;
      case "CrmCopyDealActivity":
        inventory.dealCopies.push({
          id: common().id,
          toPipeline: str(pipelineNames[str(p.CategoryId)]) || `pipeline ${str(p.CategoryId)}`,
          toStage: stageName(str(p.StageId)),
          production: common().production,
        });
        break;
      default:
        if (activity.Type.startsWith("rest_")) {
          inventory.externalApps.push({
            id: common().id,
            app: title,
            production: common().production,
          });
        }
    }

    // Numa sequência, uma pausa vale para as atividades seguintes.
    let delays = [...here.delays];
    for (const child of activity.Children) {
      const isDelay = child.Type === "DelayActivity" || child.Type === "RobotDelayActivity";
      if (isDelay && child.Activated !== "N" && activity.Type === "SequenceActivity") {
        const delay = delayOf(child, fields);
        if (delay) delays = [...delays, delay];
      }
      walk(child, activity, {
        ...here,
        delays: activity.Type === "SequenceActivity" ? delays : here.delays,
      });
    }
  };

  walk(template.root, null, {
    enabled: true,
    homologation: false,
    loop: null,
    delays: [],
    conditions: [],
    path: [],
  });

  inventory.fieldsUsed = [...fieldRefs]
    .map(([code, references]) => ({ code, name: fieldName(fields, code), references }))
    .sort((a, b) => b.references - a.references);
  return inventory;
}
