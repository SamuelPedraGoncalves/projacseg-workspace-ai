import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decodeBpt } from "./bpt";
import { consolidateRules, escalationMap, totals } from "./consolidate";
import { formatDuration, parseDurationExpression, parseFixedDelay } from "./expressions";
import { buildInventory, type StageRef } from "./inventory";
import { PhpUnserializeError, phpUnserialize } from "./php-unserialize";
import { createRedactor } from "./redact";
import { activity, branch, phpSerialize, sequence, task, template, toBpt } from "./test-helpers";

const STAGE: StageRef = {
  pipeline: "Automóvel",
  stage: "Entrada do negócio",
  stageCode: "NEW",
  confidence: "alta",
  evidence: "teste",
};

describe("phpUnserialize (somente dados)", () => {
  it("lê tipos básicos, listas e mapas com strings UTF-8 por bytes", () => {
    const value = phpUnserialize(
      Buffer.from(phpSerialize({ a: [1, 2.5, true, null, "ação"], b: { c: "d" } })),
    );
    expect(value).toEqual({ a: [1, 2.5, true, null, "ação"], b: { c: "d" } });
  });

  it("recusa objetos, referências e enums PHP", () => {
    for (const payload of [
      'O:8:"stdClass":0:{}',
      'C:3:"Foo":0:{}',
      "r:1;",
      "R:1;",
      'E:7:"Foo:Bar";',
    ]) {
      expect(() => phpUnserialize(Buffer.from(payload))).toThrow(PhpUnserializeError);
    }
  });

  it("não permite poluição de protótipo", () => {
    const value = phpUnserialize(
      Buffer.from(
        phpSerialize({ __proto__x: 1 }).replace("__proto__x", "__proto__").replace("s:10:", "s:9:"),
      ),
    ) as Record<string, unknown>;
    expect(Object.getPrototypeOf(value)).toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("recusa conteúdo truncado, extra ou profundo demais", () => {
    expect(() => phpUnserialize(Buffer.from('s:10:"abc";'))).toThrow();
    expect(() => phpUnserialize(Buffer.from("i:1;i:2;"))).toThrow(/extra/);
    const deep = "a:1:{i:0;".repeat(300) + "N;" + "}".repeat(300);
    expect(() => phpUnserialize(Buffer.from(deep))).toThrow(/profundidade/);
  });
});

describe("decodeBpt", () => {
  it("descompacta e valida a estrutura", () => {
    const decoded = decodeBpt(toBpt(template([])));
    expect(decoded.version).toBe(2);
    expect(decoded.root.Type).toBe("SequentialWorkflowActivity");
    expect(decoded.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("recusa o que não é modelo de processo", () => {
    expect(() => decodeBpt(deflateSync(Buffer.from(phpSerialize({ X: 1 }))))).toThrow(/TEMPLATE/);
  });
});

describe("expressões de prazo", () => {
  it("reconhece dias úteis, corridos, minutos e prazo relativo a campo", () => {
    expect(formatDuration(parseDurationExpression('{{=dateadd({=System:NowLocal},"12d")}}'))).toBe(
      "12 dias corridos",
    );
    expect(
      formatDuration(
        parseDurationExpression('=workdateadd({=System:Now},"1d",{=Document:ASSIGNED_BY_ID})'),
      ),
    ).toBe("1 dia útil");
    expect(
      formatDuration(parseDurationExpression('{{=workdateadd({=System:NowLocal},"30i")}}')),
    ).toBe("30 minutos úteis");
    expect(
      formatDuration(parseDurationExpression('{{=workdateadd({=Document:UF_CRM_VIG},"-15d")}}')),
    ).toBe("15 dias úteis antes de UF_CRM_VIG");
    expect(parseDurationExpression("")).toBeNull();
    expect(formatDuration(parseFixedDelay("24", "h"))).toBe("24 horas corridas");
  });
});

describe("anonimização", () => {
  it("troca URLs, e-mails, telefones, documentos, nomes e IDs de usuário", () => {
    const redactor = createRedactor({ personNames: ["Fulano"] });
    const text = redactor.text(
      "Avisar Fulano (user_37) em https://hooks.exemplo.com/secret/abc?k=1, contato x@empresa.com.br, (11) 98765-4321, CPF 123.456.789-09",
    );
    expect(text).toBe(
      "Avisar [pessoa] (USR-01) em [url HOST-01], contato [e-mail], [telefone], CPF [documento]",
    );
    expect(redactor.privateMap()).toEqual({
      users: { "USR-01": "user_37" },
      hosts: { "HOST-01": "hooks.exemplo.com" },
    });
    expect(redactor.users(["{=Document:ASSIGNED_BY_ID}", "user_37"])).toEqual([
      "RESPONSÁVEL_DO_NEGÓCIO",
      "USR-01",
    ]);
  });
});

function sample() {
  return template([
    activity("CrmCompleteTaskActivity", { Title: "Encerrar", TargetStatus: ["NEW"] }),
    activity("IfElseActivity", { Title: "HOMOLOGAÇÃO" }, [
      branch(
        "NÃO",
        [["UF_CRM_HOMOLOG", "=", "N", "0"]],
        [
          activity("IfElseActivity", { Title: "Tipo" }, [
            branch(
              "Novo",
              [["UF_CRM_TIPO", "=", "h1", "0"]],
              [task("Ligar para cliente", '{{=workdateadd({=System:NowLocal},"3h")}}')],
            ),
            branch("Outros", null, [
              task("Ligar para cliente", '{{=workdateadd({=System:NowLocal},"3h")}}'),
            ]),
          ]),
          activity(
            "WhileActivity",
            { Title: "Enquanto etapa = Entrada", fieldcondition: [["STAGE_ID", "=", "NEW", "0"]] },
            [
              sequence(
                task("Cobrar retorno", '{{=workdateadd({=System:NowLocal},"1d")}}', {
                  HoldToClose: "Y",
                }),
                activity("DelayActivity", {
                  Title: "Pausar",
                  TimeoutDuration: "24",
                  TimeoutDurationType: "h",
                }),
                activity("CrmControlNotifyActivity", {
                  Title: "Avisar supervisor",
                  ToHead: "Y",
                  ToUsers: ["user_1"],
                  MessageText: "Atraso",
                }),
              ),
            ],
          ),
          activity("ImMessageActivity", {
            Title: "Lembrete",
            MessageUserTo: ["{=Document:ASSIGNED_BY_ID}"],
            MessageFields: { MessageTitle: "Oi", MessageText: "Faça" },
          }),
          activity("WebHookActivity", {
            Title: "Webhook",
            Handler: "https://hooks.exemplo.com/x/y",
          }),
          activity("SetFieldActivity", { Title: "Mover", FieldValue: { STAGE_ID: "PREP" } }),
          task("Robô desligado", '{{=dateadd({=System:NowLocal},"2d")}}', {}),
        ],
      ),
      branch(
        "SIM",
        [["UF_CRM_HOMOLOG", "=", "", "0"]],
        [task("Só homologação", '{{=dateadd({=System:NowLocal},"2d")}}')],
      ),
    ]),
    activity("Task2Activity", { Title: "Desativado", Fields: { TITLE: "X" } }, [], "N"),
  ]);
}

describe("inventário, regras e escalonamentos", () => {
  const redactor = createRedactor();
  const inventory = buildInventory({
    file: "bp-1",
    originalNames: ["bp-1.bpt"],
    template: decodeBpt(toBpt(sample())),
    stage: STAGE,
    redactor,
  });

  it("separa habilitadas, produção, homologação e desabilitadas", () => {
    expect(inventory.tasks.filter((t) => t.enabled)).toHaveLength(5);
    expect(inventory.tasks.filter((t) => t.production)).toHaveLength(4);
    expect(inventory.tasks.filter((t) => t.homologationOnly).map((t) => t.title)).toEqual([
      "Só homologação",
    ]);
    expect(inventory.tasks.filter((t) => !t.enabled).map((t) => t.title)).toEqual(["X"]);
  });

  it("registra prazo, observadores anonimizados, condições, laço e ramos 'senão'", () => {
    const novo = inventory.tasks.find((t) => t.path.includes("Novo"))!;
    expect(novo).toMatchObject({
      deadlineText: "3 horas úteis",
      observers: ["USR-01"],
      responsible: ["RESPONSÁVEL_DO_NEGÓCIO"],
    });
    expect(novo.conditions.map((c) => `${c.fieldName}=${c.value}`)).toEqual([
      "Homologação=N",
      "Tipo de Seguro=SEGURO NOVO",
    ]);
    const outros = inventory.tasks.find((t) => t.path.includes("Outros"))!;
    expect(outros.conditions.at(-1)).toMatchObject({ operator: "else", value: "Outros" });
    const loop = inventory.tasks.find((t) => t.title === "Cobrar retorno")!;
    expect(loop).toMatchObject({ loop: "Enquanto etapa = Entrada", waitsForCompletion: true });
  });

  it("captura dependências, webhooks e avisos com a pausa anterior", () => {
    expect(inventory.completions[0]?.closesTasksOf).toEqual(["Entrada do negócio"]);
    expect(inventory.stageChanges[0]?.to).toBe("Cotação");
    expect(inventory.webhooks[0]?.host).toMatch(/^HOST-/);
    const supervisor = inventory.notifications.find((n) => n.toSupervisor)!;
    expect(supervisor).toMatchObject({
      delaysBefore: ["24 horas corridas"],
      recipients: ["SUPERIOR_DO_RESPONSÁVEL", "USR-02"],
    });
  });

  it("consolida cópias por ramificação e mantém a rastreabilidade", () => {
    const rules = consolidateRules([inventory]);
    const ligar = rules.find((r) => r.action === "Ligar para cliente")!;
    expect(ligar.configurations).toBe(2);
    expect(ligar.sources.every((s) => s.file === "bp-1" && s.activity.startsWith("A"))).toBe(true);
    expect(ligar.conditionVariants).toEqual(["Tipo de Seguro = SEGURO NOVO", "senão (Outros)"]);
    expect(rules.find((r) => r.action === "Cobrar retorno")).toMatchObject({
      recreatedInLoop: true,
    });
  });

  it("separa escalonamentos de lembretes e soma os totais", () => {
    const map = escalationMap([inventory]);
    expect(map.escalations).toHaveLength(1);
    expect(map.escalations[0]).toMatchObject({ repeats: true, toSupervisor: true });
    expect(map.reminders).toHaveLength(1);
    const sum = totals([inventory], consolidateRules([inventory]), 1);
    expect(sum).toMatchObject({
      taskConfigurationsEnabled: 5,
      taskConfigurationsProduction: 4,
      taskConfigurationsHomologationOnly: 1,
      tasksRecreatedInLoop: 1,
    });
  });
});
