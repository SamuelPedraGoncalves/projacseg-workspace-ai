import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TENANT_CONFIG, loadTenantFile } from "./tenant-config";

describe("configuração por empresa", () => {
  it("o arquivo de exemplo versionado é válido", async () => {
    const file = await loadTenantFile(
      resolve(__dirname, "../../../tenants"),
      "exemplo.bitrix24.com.br",
    );
    expect(file?.rules.map((rule) => rule.code)).toEqual([
      "exemplo_enviar_cotacao",
      "exemplo_aguardar_emissao",
    ]);
    expect(file?.rules.every((rule) => !rule.homologated)).toBe(true);
    expect(file?.config.calendar.holidays).toContain("2026-12-25");
  });

  it("aplica padrões e devolve null quando não há arquivo", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tenants-"));
    writeFileSync(join(dir, "a.bitrix24.com.json"), "{}");
    expect(await loadTenantFile(dir, "a.bitrix24.com")).toEqual({
      config: DEFAULT_TENANT_CONFIG,
      rules: [],
    });
    expect(await loadTenantFile(dir, "b.bitrix24.com")).toBeNull();
  });

  it("recusa regra inválida com erro claro", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tenants-"));
    writeFileSync(join(dir, "a.bitrix24.com.json"), JSON.stringify({ rules: [{ code: "X Y" }] }));
    await expect(loadTenantFile(dir, "a.bitrix24.com")).rejects.toThrow();
  });

  it("papéis usados nas regras precisam estar definidos", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tenants-"));
    const rule = {
      code: "r",
      name: "R",
      enabled: true,
      homologated: false,
      categoryIds: null,
      stageIds: ["NEW"],
      action: "Fazer",
      kind: "action",
      deadline: { amount: 1, unit: "business_days" },
      riskAtRatio: 0.5,
      escalation: { maxLevels: 0, interval: { amount: 1, unit: "business_days" } },
      responsible: { from: "role", role: "emissao" },
    };
    writeFileSync(join(dir, "a.bitrix24.com.json"), JSON.stringify({ rules: [rule] }));
    await expect(loadTenantFile(dir, "a.bitrix24.com")).rejects.toThrow(/emissao/);
    writeFileSync(
      join(dir, "a.bitrix24.com.json"),
      JSON.stringify({ roles: { emissao: "15" }, rules: [rule] }),
    );
    expect((await loadTenantFile(dir, "a.bitrix24.com"))?.config.roles).toEqual({ emissao: "15" });
  });
});
