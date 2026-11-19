import { describe, expect, it } from "vitest";
import { buildTree } from "./structure";

describe("árvore da estrutura da empresa", () => {
  it("monta níveis, ordena por nome e resolve o chefe", () => {
    const names = new Map([
      ["10", "Diretora"],
      ["20", "Gerente"],
    ]);
    const tree = buildTree(
      [
        { ID: "1", NAME: "Corretora", UF_HEAD: "10" },
        { ID: "3", NAME: "Vendas", PARENT: "1", UF_HEAD: "20" },
        { ID: "2", NAME: "Sinistros", PARENT: "1", UF_HEAD: "0" },
        { ID: "4", NAME: "Auto", PARENT: "3" },
        { ID: "5", NAME: "Avulso", PARENT: "99" },
      ],
      names,
    );
    expect(tree).toEqual([
      {
        id: "5",
        name: "Avulso",
        head: null,
        children: [],
      },
      {
        id: "1",
        name: "Corretora",
        head: { id: "10", name: "Diretora" },
        children: [
          { id: "2", name: "Sinistros", head: null, children: [] },
          {
            id: "3",
            name: "Vendas",
            head: { id: "20", name: "Gerente" },
            children: [{ id: "4", name: "Auto", head: null, children: [] }],
          },
        ],
      },
    ]);
  });

  it("chefe sem nome conhecido aparece pelo ID; departamento sem nome também", () => {
    expect(buildTree([{ ID: "7", UF_HEAD: "33" }], new Map())).toEqual([
      { id: "7", name: "Departamento 7", head: { id: "33", name: "Usuário 33" }, children: [] },
    ]);
  });
});
