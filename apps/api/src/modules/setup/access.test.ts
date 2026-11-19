import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../../store/memory-store";
import { at, seedTenant } from "../../test/helpers";
import { resolveAccess } from "./access";
import { licensed } from "./license";

describe("quem é quem no WorkSeg", () => {
  it("sem piloto: o instalador é administrador; criadores de regras vêm dos papéis", async () => {
    const store = createMemoryStore();
    const tenant = await seedTenant(store, { installedByUserId: "1" });

    expect(await resolveAccess(store, tenant, "1")).toEqual({
      admin: true,
      ruleEditor: true,
      settings: true,
    });
    expect(await resolveAccess(store, tenant, "51")).toEqual({
      admin: false,
      ruleEditor: false,
      settings: false,
    });

    await store.roles.replace(
      tenant.id,
      "rule_editor",
      [{ userId: "51", userName: "Ana" }],
      "1",
      at("2026-11-19T10:00:00Z"),
    );
    expect(await resolveAccess(store, tenant, "51")).toEqual({
      admin: false,
      ruleEditor: true,
      settings: true,
    });
  });

  it("no piloto, os usuários do piloto são administradores (o instalador fica de fora)", async () => {
    const store = createMemoryStore();
    const base = await seedTenant(store, { installedByUserId: "1" });
    const tenant = await store.tenants.update(base.id, {
      config: { ...base.config, pilotUserIds: ["13"] },
    });

    expect((await resolveAccess(store, tenant, "13")).admin).toBe(true);
    expect((await resolveAccess(store, tenant, "1")).admin).toBe(false);
  });

  it("sem instalador gravado, ninguém é administrador fora do piloto", async () => {
    const store = createMemoryStore();
    const tenant = await seedTenant(store);
    expect((await resolveAccess(store, tenant, "1")).admin).toBe(false);
  });

  it("nesta versão toda corretora está liberada (a cobrança entra depois)", async () => {
    const store = createMemoryStore();
    expect(licensed(await seedTenant(store))).toBe(true);
  });
});
