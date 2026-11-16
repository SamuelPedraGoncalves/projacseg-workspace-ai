import { describe, expect, it } from "vitest";
import { getDemoReply, getDemoWelcome } from "./demo-responses";

describe("respostas demonstrativas", () => {
  it("cumprimenta pelo nome e se identifica como demonstração", () => {
    expect(getDemoWelcome("Lucas")).toMatch(/^Olá, Lucas!.*demonstração/);
  });

  it("responde sobre o Teleport", () => {
    expect(getDemoReply("Como está o TELEPORT?")).toMatch(/Empresa Martins/);
  });

  it("responde sobre risco e atraso, com ou sem acento", () => {
    expect(getDemoReply("o que está em risco?")).toMatch(/três negócios/);
    expect(getDemoReply("negócios atrasados")).toMatch(/três negócios/);
  });

  it("responde sobre negócios aguardando", () => {
    expect(getDemoReply("Quem está aguardando?")).toMatch(/Clínica Oliveira/);
  });

  it("devolve as prioridades por padrão", () => {
    expect(getDemoReply("bom dia")).toMatch(/prioridades demonstrativas/);
  });

  it("toda resposta deixa claro que é demonstração", () => {
    for (const question of ["teleport", "risco", "aguardando", "oi"]) {
      expect(getDemoReply(question)).toMatch(/demonstra/i);
    }
  });
});
