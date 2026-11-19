import type { MappingCatalog } from "@projacseg/shared";
import { describe, expect, it } from "vitest";
import { suggestMapping, validateMapping } from "./mapping";

const CATALOG: MappingCatalog = {
  categories: [
    { id: "0", name: "Automóvel" },
    { id: "4", name: "Demais Ramos" },
  ],
  fields: [
    {
      code: "UF_CRM_TIPO",
      label: "Tipo do Seguro",
      type: "enumeration",
      items: [
        { id: "9829", value: "Seguro Novo" },
        { id: "11123", value: "Renovação Própria" },
        { id: "9831", value: "Renovação Outra Corretora" },
        { id: "9900", value: "Endosso" },
      ],
    },
    {
      code: "UF_CRM_RAMO",
      label: "Ramo",
      type: "enumeration",
      items: [{ id: "1", value: "Automóvel" }],
    },
    { code: "UF_CRM_VIG", label: "Fim de Vigência", type: "date" },
    { code: "UF_CRM_DOC", label: "CPF/CNPJ", type: "string" },
    { code: "UF_CRM_CALC", label: "Nº do Cálculo", type: "string" },
    {
      code: "UF_CRM_MOTIVO",
      label: "Motivo da perda",
      type: "enumeration",
      items: [{ id: "5", value: "Preço" }],
    },
  ],
};

const VALID = {
  fieldMapping: {
    insuranceType: "UF_CRM_TIPO",
    branch: "UF_CRM_RAMO",
    validity: "UF_CRM_VIG",
    cpf: "UF_CRM_DOC",
    quoteNumber: "UF_CRM_CALC",
  },
  situations: {
    categoryIds: ["0", "4"],
    newBusinessValues: ["9829"],
    renewalValues: ["11123", "9831"],
  },
};

describe("sugestão automática do mapeamento (pelos rótulos, sem IA)", () => {
  it("reconhece os campos e separa os valores de seguro novo e renovação", () => {
    expect(suggestMapping(CATALOG)).toEqual({
      fieldMapping: {
        insuranceType: "UF_CRM_TIPO",
        branch: "UF_CRM_RAMO",
        validity: "UF_CRM_VIG",
        cpf: "UF_CRM_DOC",
        quoteNumber: "UF_CRM_CALC",
        lossReason: "UF_CRM_MOTIVO",
      },
      situations: {
        categoryIds: ["0", "4"],
        newBusinessValues: ["9829"],
        renewalValues: ["11123", "9831"],
      },
    });
  });

  it("sem rótulos reconhecíveis, não sugere esses campos", () => {
    const suggestion = suggestMapping({
      categories: [{ id: "0", name: "Geral" }],
      fields: [{ code: "UF_CRM_X", label: "Observações", type: "string" }],
    });
    expect(suggestion.fieldMapping).toEqual({});
    expect(suggestion.situations).toEqual({ categoryIds: ["0"] });
  });
});

describe("validação do mapeamento", () => {
  it("aceita um mapeamento coerente com o portal", () => {
    expect(validateMapping(VALID, CATALOG)).toEqual({ ok: true, value: VALID });
  });

  it("campo que não existe no portal", () => {
    const result = validateMapping(
      { ...VALID, fieldMapping: { ...VALID.fieldMapping, branch: "UF_CRM_9" } },
      CATALOG,
    );
    expect(result).toEqual({ ok: false, errors: ['Campo "UF_CRM_9" não existe neste portal.'] });
  });

  it("valor que não é opção do tipo do seguro", () => {
    const result = validateMapping(
      { ...VALID, situations: { ...VALID.situations, renewalValues: ["777"] } },
      CATALOG,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual([
      'O valor "777" não é uma opção do campo "Tipo do Seguro".',
    ]);
  });

  it("mesmo valor como seguro novo e renovação", () => {
    const result = validateMapping(
      { ...VALID, situations: { ...VALID.situations, renewalValues: ["9829"] } },
      CATALOG,
    );
    expect(!result.ok && result.errors).toContain(
      'O valor "Seguro Novo" não pode ser seguro novo e renovação ao mesmo tempo.',
    );
  });

  it("tipo do seguro precisa ser campo de lista; funis e valores não podem faltar", () => {
    const result = validateMapping(
      {
        fieldMapping: { insuranceType: "UF_CRM_DOC", branch: "UF_CRM_RAMO" },
        situations: { categoryIds: [], newBusinessValues: [], renewalValues: [] },
      },
      CATALOG,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual(
      expect.arrayContaining([
        'O campo "CPF/CNPJ" precisa ser uma lista para indicar o tipo do seguro.',
        "Escolha ao menos um funil.",
        "Escolha ao menos um valor de seguro novo ou de renovação.",
      ]),
    );
  });

  it("funil inexistente e formato inválido", () => {
    const funnel = validateMapping(
      { ...VALID, situations: { ...VALID.situations, categoryIds: ["99"] } },
      CATALOG,
    );
    expect(!funnel.ok && funnel.errors).toEqual(['O funil "99" não existe neste portal.']);
    expect(validateMapping({ fieldMapping: "x" }, CATALOG).ok).toBe(false);
  });
});

describe("corretora sem algum campo não fica travada no primeiro acesso", () => {
  it("sem ramo e só com seguro novo é válido", () => {
    const input = {
      fieldMapping: { insuranceType: "UF_CRM_TIPO" },
      situations: { categoryIds: ["0"], newBusinessValues: ["9829"], renewalValues: [] },
    };
    expect(validateMapping(input, CATALOG)).toEqual({ ok: true, value: input });
  });

  it("sem campo de tipo do seguro é válido, desde que não haja valores", () => {
    const input = {
      fieldMapping: {},
      situations: { categoryIds: ["0"], newBusinessValues: [], renewalValues: [] },
    };
    expect(validateMapping(input, CATALOG).ok).toBe(true);
    expect(
      validateMapping(
        { ...input, situations: { ...input.situations, renewalValues: ["9831"] } },
        CATALOG,
      ),
    ).toEqual({
      ok: false,
      errors: ["Escolha o campo do tipo do seguro antes de indicar os valores."],
    });
  });
});
