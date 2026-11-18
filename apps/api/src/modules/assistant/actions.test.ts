import { describe, expect, it, vi } from "vitest";
import type { CrmCatalog, FieldInfo } from "../../integrations/bitrix24/crm-reader";
import type { LlmPlan, LlmProvider } from "../../integrations/llm/llm-provider";
import { createMemoryStore } from "../../store/memory-store";
import type { Store, TenantRecord } from "../../store/types";
import { at, seedTenant, snapshot } from "../../test/helpers";
import { AssistantActions, parseUserDate } from "./actions";
import { AssistantService } from "./assistant.service";

// Portal e campos sintéticos — nada da ProjacSeg.
const FIELDS = new Map<string, FieldInfo>([
  [
    "UF_CRM_TIPO",
    {
      type: "enumeration",
      label: "Tipo de Seguro",
      items: [
        { id: "9829", value: "SEGURO NOVO" },
        { id: "11123", value: "RENOVAÇÃO DA PRÓPRIA CORRETORA" },
      ],
    },
  ],
  ["UF_CRM_VIG", { type: "date", label: "Data Início de Vigência *" }],
  ["UF_CRM_OBS", { type: "string", label: "Observação" }],
  ["UF_CRM_ARQ", { type: "file", label: "Documentos" }],
  [
    "UF_CRM_MOTIVO",
    {
      type: "enumeration",
      label: "Motivo de perdido*",
      items: [
        { id: "501", value: "Sem retorno do cliente" },
        { id: "502", value: "Fechou com outro corretor" },
      ],
    },
  ],
]);

const CATALOG: CrmCatalog = {
  categories: new Map([["0", "Automóvel"]]),
  stages: new Map([
    ["PREPARATION", "Elaborando cotação"],
    ["NEGOTIATION", "Cotação enviada / Negociação"],
    ["WON", "Concluído"],
    ["LOSE", "Processos Perdidos"],
  ]),
  enums: new Map(),
  fieldTypes: new Map([...FIELDS].map(([code, info]) => [code, info.type])),
  fieldInfo: FIELDS,
};

interface World {
  store: Store;
  tenant: TenantRecord;
  actions: AssistantActions;
  calls: { method: string; params: Record<string, unknown> }[];
  changed: string[];
  clock: { now: Date };
}

async function world(failUpdate = false): Promise<World> {
  const store = createMemoryStore();
  const seeded = await seedTenant(store);
  const tenant = await store.tenants.update(seeded.id, {
    config: {
      ...seeded.config,
      pilotUserIds: ["7"],
      assistant: {
        actions: true,
        confirmMinutes: 10,
        stages: { "0": ["PREPARATION", "NEGOTIATION"] },
        fields: ["UF_CRM_TIPO", "UF_CRM_VIG", "UF_CRM_OBS", "UF_CRM_ARQ"],
        discard: { "0": { stage: "LOSE", reasonField: "UF_CRM_MOTIVO" } },
      },
    },
  });
  await store.deals.upsert(tenant.id, snapshot());
  await store.deals.upsert(tenant.id, snapshot({ dealId: "900", assignedById: "8" }));
  const calls: World["calls"] = [];
  const changed: string[] = [];
  const clock = { now: at("2026-11-18T10:00:00-03:00") };
  const actions = new AssistantActions({
    store,
    call: async (_tenant, method, params) => {
      calls.push({ method, params });
      if (failUpdate && method === "crm.deal.update") throw new Error("ACCESS_DENIED");
      return { result: true };
    },
    catalog: async () => CATALOG,
    onChanged: async (_tenant, dealId) => void changed.push(dealId),
    log: { warn: vi.fn(), error: vi.fn() },
    now: () => clock.now,
  });
  return { store, tenant, actions, calls, changed, clock };
}

const move = (negocio: number, etapa: string) => ({
  name: "mover_etapa",
  input: { negocio, etapa },
});
const fill = (negocio: number, campo: string, valor: string) => ({
  name: "preencher_campo",
  input: { negocio, campo, valor },
});

describe("ações do assistente no CRM", () => {
  it("descreve só as etapas e campos liberados (campos de arquivo ficam de fora)", async () => {
    const w = await world();
    const described = JSON.parse(await w.actions.describe(w.tenant));
    expect(described.moverEtapa).toEqual([
      { pipeline: "Automóvel", etapas: ["Elaborando cotação", "Cotação enviada / Negociação"] },
    ]);
    expect(described.preencherCampo.map((field: { campo: string }) => field.campo)).toEqual([
      "Tipo de Seguro",
      "Data Início de Vigência *",
      "Observação",
    ]);
  });

  it("nada é gravado na proposta; o SIM executa, comenta no card e reavalia", async () => {
    const w = await world();
    const { pending, problems } = await w.actions.propose(w.tenant, "7", [
      move(501, "cotação enviada / negociação"),
    ]);
    expect(problems).toEqual([]);
    expect(pending[0]?.summary).toBe(
      'Negócio #501: mover de "Elaborando cotação" para "Cotação enviada / Negociação".',
    );
    expect(w.calls).toEqual([]);

    const reply = await w.actions.confirm(w.tenant, "7", "Lucas");
    expect(reply).toMatch(/^✅ Feito: Negócio #501/);
    expect(w.calls[0]).toEqual({
      method: "crm.deal.update",
      params: { id: 501, fields: { STAGE_ID: "NEGOTIATION" } },
    });
    expect(w.calls[1]).toMatchObject({
      method: "crm.timeline.comment.add",
      params: { fields: { ENTITY_ID: 501, ENTITY_TYPE: "deal" } },
    });
    expect(String((w.calls[1]!.params.fields as { COMMENT: string }).COMMENT)).toMatch(
      /A pedido de Lucas/,
    );
    expect(w.changed).toEqual(["501"]);
    expect(await w.actions.hasPending(w.tenant, "7")).toBe(false);
  });

  it("converte valores: opção de lista sem acento, data brasileira, texto", async () => {
    const w = await world();
    const { pending } = await w.actions.propose(w.tenant, "7", [
      fill(501, "tipo de seguro", "renovacao da propria corretora"),
      fill(501, "Data Início de Vigência", "05/12/2026"),
      fill(501, "observação", "  Cliente pediu retorno  "),
    ]);
    expect(pending.map((action) => action.payload)).toEqual([
      { UF_CRM_TIPO: "11123", __comment: expect.any(String) },
      { UF_CRM_VIG: "2026-12-05", __comment: expect.any(String) },
      { UF_CRM_OBS: "Cliente pediu retorno", __comment: expect.any(String) },
    ]);
  });

  it("recusa o que não é permitido, explicando o motivo", async () => {
    const w = await world();
    const { pending, problems } = await w.actions.propose(w.tenant, "7", [
      move(900, "Cotação enviada / Negociação"),
      move(501, "Concluído"),
      move(501, "Elaborando cotação"),
      fill(501, "Documentos", "x"),
      fill(501, "Tipo de Seguro", "consórcio"),
      fill(501, "Data Início de Vigência", "31/02/2026"),
      { name: "apagar_negocio", input: { negocio: 501 } },
    ]);
    expect(pending).toEqual([]);
    expect(problems).toEqual([
      "O Negócio #900 não está entre os seus negócios.",
      'Não posso mover o Negócio #501 para "Concluído". Etapas que posso usar neste funil: Elaborando cotação, Cotação enviada / Negociação.',
      'O Negócio #501 já está em "Elaborando cotação".',
      'Não posso preencher "Documentos". Campos que posso preencher: Tipo de Seguro, Data Início de Vigência, Observação.',
      '"consórcio" não é uma opção de "Tipo de Seguro". Opções: SEGURO NOVO, RENOVAÇÃO DA PRÓPRIA CORRETORA.',
      '"31/02/2026" não é uma data válida (use DD/MM/AAAA).',
      "Não entendi uma das alterações pedidas.",
    ]);
    expect(w.calls).toEqual([]);
  });

  it("fora do piloto ou sem a seção assistant, nada é proposto", async () => {
    const w = await world();
    expect(
      (await w.actions.propose(w.tenant, "8", [move(900, "Elaborando cotação")])).pending,
    ).toEqual([]);
    const off = await w.store.tenants.update(w.tenant.id, {
      config: { ...w.tenant.config, assistant: undefined },
    });
    expect(w.actions.config(off)).toBeNull();
    expect(
      (await w.actions.propose(off, "7", [move(501, "Cotação enviada / Negociação")])).pending,
    ).toEqual([]);
  });

  it("NÃO cancela; confirmação vencida não executa", async () => {
    const w = await world();
    await w.actions.propose(w.tenant, "7", [move(501, "Cotação enviada / Negociação")]);
    expect(await w.actions.cancel(w.tenant, "7")).toBe("Combinado, não alterei nada.");
    await w.actions.propose(w.tenant, "7", [move(501, "Cotação enviada / Negociação")]);
    w.clock.now = at("2026-11-18T10:30:00-03:00");
    expect(await w.actions.confirm(w.tenant, "7", "Lucas")).toMatch(/^⏱ Expirou/);
    expect(w.calls).toEqual([]);
  });

  it("confere de novo na execução: negócio repassado a outra pessoa não é alterado", async () => {
    const w = await world();
    await w.actions.propose(w.tenant, "7", [move(501, "Cotação enviada / Negociação")]);
    await w.store.deals.upsert(w.tenant.id, snapshot({ assignedById: "8" }));
    expect(await w.actions.confirm(w.tenant, "7", "Lucas")).toMatch(/^⚠ Não fiz/);
    expect(w.calls).toEqual([]);
  });

  it("falha no Bitrix24 vira mensagem clara e fica registrada", async () => {
    const w = await world(true);
    await w.actions.propose(w.tenant, "7", [move(501, "Cotação enviada / Negociação")]);
    expect(await w.actions.confirm(w.tenant, "7", "Lucas")).toMatch(/^⚠ Não consegui alterar/);
    expect(w.calls.map((call) => call.method)).toEqual(["crm.deal.update"]);
  });

  it("datas digitadas", () => {
    expect(parseUserDate("5/1/27")).toBe("2027-01-05");
    expect(parseUserDate("2026-12-05")).toBe("2026-12-05");
    expect(parseUserDate("amanhã")).toBeNull();
  });
});

describe("descartar negócio pelo chat", () => {
  const discard = (negocio: number, motivo: string) => ({
    name: "descartar_negocio",
    input: { negocio, motivo },
  });

  it("descarta só com motivo válido: etapa de perdido + motivo gravados juntos", async () => {
    const w = await world();
    const { pending, problems } = await w.actions.propose(w.tenant, "7", [
      discard(501, "fechou com outro corretor"),
    ]);
    expect(problems).toEqual([]);
    expect(pending[0]?.summary).toBe(
      'Negócio #501: descartar (mover para "Processos Perdidos") com o motivo "Fechou com outro corretor".',
    );
    expect(await w.actions.confirm(w.tenant, "7", "Lucas")).toMatch(/^✅ Feito:/);
    expect(w.calls[0]).toEqual({
      method: "crm.deal.update",
      params: { id: 501, fields: { STAGE_ID: "LOSE", UF_CRM_MOTIVO: "502" } },
    });
  });

  it("sem motivo reconhecido, lista as opções e não propõe nada", async () => {
    const w = await world();
    const { pending, problems } = await w.actions.propose(w.tenant, "7", [
      discard(501, "não quero mais"),
      discard(900, "Sem retorno do cliente"),
    ]);
    expect(pending).toEqual([]);
    expect(problems).toEqual([
      "Para descartar o Negócio #501 preciso de um destes motivos: Sem retorno do cliente; Fechou com outro corretor.",
      "O Negócio #900 não está entre os seus negócios.",
    ]);
  });

  it("o contexto da IA mostra a etapa de perdido e os motivos", async () => {
    const w = await world();
    expect(JSON.parse(await w.actions.describe(w.tenant)).descartarNegocio).toEqual([
      {
        pipeline: "Automóvel",
        etapaDePerdido: "Processos Perdidos",
        motivos: ["Sem retorno do cliente", "Fechou com outro corretor"],
      },
    ]);
  });
});

describe("conversa: proposta e confirmação pelo chat", () => {
  it("a IA propõe, o servidor pede confirmação e o SIM executa sem chamar a IA de novo", async () => {
    const w = await world();
    const plan = vi.fn<NonNullable<LlmProvider["plan"]>>(async (): Promise<LlmPlan> => ({
      ok: true,
      text: "Claro!",
      calls: [move(501, "Cotação enviada / Negociação")],
    }));
    const provider: LlmProvider = { name: "fake", answer: vi.fn(), plan };
    const assistant = new AssistantService(w.store, provider, true, () => w.clock.now, w.actions);

    const proposal = await assistant.reply(w.tenant, "7", "Lucas", "move o 501 para negociação");
    expect(proposal).toContain("Vou fazer isto no Bitrix24:");
    expect(proposal).toContain("Responda [B]SIM[/B] para confirmar ou [B]NÃO[/B] para cancelar");
    // Formato do chat: título em negrito, nome do cliente recolocado pelo servidor, blocos separados.
    // O negócio vira link para o card no portal, com o nome do cliente ao lado.
    expect(proposal).toContain(
      "• [URL=https://projacseg-teste.bitrix24.com.br/crm/deal/details/501/]Negócio #501[/URL] (Carlos Almeida - Auto): mover de",
    );
    // A IA não recebe o nome do cliente; ele aparece só na confirmação montada pelo servidor.
    const input = plan.mock.calls[0]![0];
    expect(input.context).not.toContain("Carlos Almeida");
    expect(input.allowedActions).toContain("Cotação enviada / Negociação");
    expect(w.calls).toEqual([]);

    expect(await assistant.reply(w.tenant, "7", "Lucas", "Sim")).toMatch(/^✅ Feito:/);
    expect(plan).toHaveBeenCalledTimes(1);
    expect(w.calls[0]?.method).toBe("crm.deal.update");
  });

  it("sem pendência, 'sim' é uma pergunta comum para a IA", async () => {
    const w = await world();
    const plan = vi.fn<NonNullable<LlmProvider["plan"]>>(async () => ({
      ok: true as const,
      text: "Sobre o que você quer confirmar?",
      calls: [],
    }));
    const assistant = new AssistantService(
      w.store,
      { name: "fake", answer: vi.fn(), plan },
      true,
      () => w.clock.now,
      w.actions,
    );
    expect(await assistant.reply(w.tenant, "7", "Lucas", "sim")).toBe(
      "Sobre o que você quer confirmar?",
    );
    expect(w.calls).toEqual([]);
  });

  it("lembra a conversa: a resposta curta completa o pedido anterior (sem nomes de clientes)", async () => {
    const w = await world();
    const QUESTION = "Qual o motivo?\n1. Sem retorno do cliente\n2. Fechou com outro corretor";
    const plan = vi
      .fn<NonNullable<LlmProvider["plan"]>>()
      .mockResolvedValueOnce({ ok: true, text: QUESTION, calls: [] })
      .mockResolvedValueOnce({
        ok: true,
        text: "",
        calls: [
          {
            name: "descartar_negocio",
            input: { negocio: 501, motivo: "Fechou com outro corretor" },
          },
        ],
      });
    const assistant = new AssistantService(
      w.store,
      { name: "fake", answer: vi.fn(), plan },
      true,
      () => w.clock.now,
      w.actions,
    );
    await assistant.reply(w.tenant, "7", "Lucas", "descarta o Negócio #501");
    const second = await assistant.reply(w.tenant, "7", "Lucas", "2");
    expect(second).toContain("descartar");
    expect(plan.mock.calls[1]![0].history).toEqual([
      { role: "user", text: "descarta o Negócio #501" },
      { role: "assistant", text: QUESTION },
    ]);
    // A memória guarda só "Negócio #id": o nome do cliente não volta para a IA.
    expect(JSON.stringify(plan.mock.calls[1]![0].history)).not.toContain("Carlos Almeida");
  });
});
