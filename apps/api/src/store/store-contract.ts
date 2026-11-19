import { expect } from "vitest";
import { at, seedTenant } from "../test/helpers";
import type { Store } from "./types";

/**
 * Casos de papéis, aceites e instalador que as duas implementações do armazenamento (memória e
 * PostgreSQL) precisam cumprir do mesmo jeito.
 */
export async function checkRolesConsentsAndInstaller(store: Store, memberId: string) {
  const tenant = await seedTenant(store, { memberId, domain: `${memberId}.bitrix24.com.br` });
  const other = await seedTenant(store, {
    memberId: `${memberId}-outra`,
    domain: `${memberId}-outra.bitrix24.com.br`,
  });

  // Papéis: substituir mantém quem continua (com a data original) e remove quem saiu.
  await store.roles.replace(
    tenant.id,
    "rule_editor",
    [
      { userId: "13", userName: "Teste" },
      { userId: "51", userName: "Ana" },
    ],
    "1",
    at("2026-11-19T10:00:00Z"),
  );
  await store.roles.replace(
    tenant.id,
    "rule_editor",
    [
      { userId: "51", userName: "Ana" },
      { userId: "77", userName: "Bruno" },
    ],
    "1",
    at("2026-11-20T10:00:00Z"),
  );
  const roles = (await store.roles.list(tenant.id)).sort((a, b) =>
    a.userId.localeCompare(b.userId),
  );
  expect(roles.map((role) => role.userId)).toEqual(["51", "77"]);
  expect(roles[0]?.grantedAt.toISOString()).toBe("2026-11-19T10:00:00.000Z");
  expect(roles[1]).toMatchObject({ userName: "Bruno", role: "rule_editor", grantedBy: "1" });
  expect(await store.roles.list(other.id)).toEqual([]);

  // Aceites: somente inserção; o mais recente vale.
  await store.consents.append({
    tenantId: tenant.id,
    userId: "1",
    kind: "terms",
    version: "a",
    provisional: true,
    acceptedAt: at("2026-11-19T10:00:00Z"),
  });
  await store.consents.append({
    tenantId: tenant.id,
    userId: "1",
    kind: "terms",
    version: "b",
    provisional: false,
    acceptedAt: at("2026-11-20T10:00:00Z"),
  });
  await store.consents.append({
    tenantId: tenant.id,
    userId: "51",
    kind: "privacy_notice",
    version: "aviso-1",
    provisional: true,
    acceptedAt: at("2026-11-20T11:00:00Z"),
  });
  expect(await store.consents.latest(tenant.id, "terms")).toMatchObject({
    version: "b",
    provisional: false,
  });
  expect(await store.consents.latest(tenant.id, "privacy_notice", "51")).toMatchObject({
    userId: "51",
    version: "aviso-1",
  });
  expect(await store.consents.latest(tenant.id, "privacy_notice", "77")).toBeNull();
  expect(await store.consents.latest(other.id, "terms")).toBeNull();

  // Instalador.
  expect((await store.tenants.findById(tenant.id))?.installedByUserId ?? null).toBeNull();
  await store.tenants.update(tenant.id, { installedByUserId: "13" });
  expect((await store.tenants.findById(tenant.id))?.installedByUserId).toBe("13");
  // Reinstalação sem informar o instalador não o apaga.
  await seedTenant(store, { memberId, domain: `${memberId}.bitrix24.com.br` });
  expect((await store.tenants.findById(tenant.id))?.installedByUserId).toBe("13");
}
