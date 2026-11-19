import { describe, expect, it } from "vitest";
import { SessionSigner } from "../../security/session";
import type { Store, TenantRecord } from "../../store/types";
import { SESSION_SECRET, seedTenant, testApp } from "../../test/helpers";
import { CURRENT_TERMS, aiAllowed } from "./terms";

const signer = new SessionSigner(SESSION_SECRET);
const ADMIN = "1";

function bearer(tenant: TenantRecord, userId: string, portalAdmin = false) {
  return {
    authorization: `Bearer ${signer.issue({
      tenantId: tenant.id,
      userId,
      name: `Usuário ${userId}`,
      admin: portalAdmin,
    })}`,
  };
}

async function setup(store: Store, configPatch: Partial<TenantRecord["config"]> = {}) {
  const base = await seedTenant(store, { installedByUserId: ADMIN });
  return store.tenants.update(base.id, {
    config: { ...base.config, aiEnabled: false, ...configPatch },
  });
}

describe("primeiro acesso: termos e situação", () => {
  it("sem aceite: o administrador vai aos termos; os demais aguardam", async () => {
    const { app, store } = await testApp();
    const tenant = await setup(store);

    const admin = await app.inject({
      method: "GET",
      url: "/api/v1/setup",
      headers: bearer(tenant, ADMIN),
    });
    expect(admin.statusCode).toBe(200);
    expect(admin.json()).toMatchObject({
      step: "terms",
      access: { admin: true, ruleEditor: true, settings: true },
      terms: { version: CURRENT_TERMS.version, provisional: true, accepted: false },
    });

    const other = await app.inject({
      method: "GET",
      url: "/api/v1/setup",
      headers: bearer(tenant, "51"),
    });
    expect(other.json()).toMatchObject({
      step: "waiting_admin",
      access: { admin: false, settings: false },
    });
    await app.close();
  });

  it("só o administrador aceita, e só a versão vigente; o aceite liga a IA", async () => {
    const { app, store } = await testApp();
    const tenant = await setup(store);
    const accept = (userId: string, version: string) =>
      app.inject({
        method: "POST",
        url: "/api/v1/setup/terms/accept",
        headers: bearer(tenant, userId),
        payload: { version },
      });

    expect((await accept("51", CURRENT_TERMS.version)).statusCode).toBe(403);
    expect((await accept(ADMIN, "versao-antiga")).statusCode).toBe(409);
    expect(await aiAllowed(store, (await store.tenants.findById(tenant.id))!)).toBe(false);

    expect((await accept(ADMIN, CURRENT_TERMS.version)).statusCode).toBe(200);
    const updated = (await store.tenants.findById(tenant.id))!;
    expect(updated.config.aiEnabled).toBe(true);
    expect(await aiAllowed(store, updated)).toBe(true);
    expect(await store.consents.latest(tenant.id, "terms")).toMatchObject({
      userId: ADMIN,
      version: CURRENT_TERMS.version,
      provisional: true,
    });

    const status = await app.inject({
      method: "GET",
      url: "/api/v1/setup",
      headers: bearer(tenant, ADMIN),
    });
    expect(status.json()).toMatchObject({ step: "editors", terms: { accepted: true } });
    await app.close();
  });

  it("termos com versão nova: precisa aceitar de novo e a IA fica desligada até lá", async () => {
    const { app, store } = await testApp();
    const tenant = await setup(store, { aiEnabled: true });
    await store.consents.append({
      tenantId: tenant.id,
      userId: ADMIN,
      kind: "terms",
      version: CURRENT_TERMS.version,
      provisional: true,
      acceptedAt: new Date(),
    });
    const next = { ...CURRENT_TERMS, version: "2027-01-01-definitivo", provisional: false };

    expect(await aiAllowed(store, tenant)).toBe(true);
    expect(await aiAllowed(store, tenant, next)).toBe(false);
    await app.close();

    const withNewTerms = await testApp({}, { store, terms: next });
    const status = await withNewTerms.app.inject({
      method: "GET",
      url: "/api/v1/setup",
      headers: bearer(tenant, ADMIN),
    });
    expect(status.json()).toMatchObject({ step: "terms", terms: { accepted: false } });
    await withNewTerms.app.close();
  });

  it("aviso de privacidade: pendente até o usuário marcar como visto", async () => {
    const { app, store } = await testApp();
    const tenant = await setup(store);
    const status = async () =>
      (
        await app.inject({
          method: "GET",
          url: "/api/v1/setup",
          headers: bearer(tenant, "51"),
        })
      ).json();

    expect((await status()).privacyNoticePending).toBe(true);
    const notice = await app.inject({
      method: "GET",
      url: "/api/v1/setup/privacy-notice",
      headers: bearer(tenant, "51"),
    });
    expect(notice.json().title).toBeTruthy();
    const seen = await app.inject({
      method: "POST",
      url: "/api/v1/setup/privacy-notice/seen",
      headers: bearer(tenant, "51"),
    });
    expect(seen.statusCode).toBe(200);
    expect((await status()).privacyNoticePending).toBe(false);
    await app.close();
  });

  it("termos: texto provisório disponível para quem tem sessão", async () => {
    const { app, store } = await testApp();
    const tenant = await setup(store);
    const terms = await app.inject({
      method: "GET",
      url: "/api/v1/setup/terms",
      headers: bearer(tenant, "51"),
    });
    expect(terms.json()).toMatchObject({ version: CURRENT_TERMS.version, provisional: true });
    expect(terms.json().body).toMatch(/provisória/i);
    expect(terms.json().body).toMatch(/Anthropic/);
    await app.close();
  });

  it("sem sessão → 401; fora do piloto → 403", async () => {
    const { app, store } = await testApp();
    const tenant = await setup(store, { pilotUserIds: ["13"] });
    expect((await app.inject({ method: "GET", url: "/api/v1/setup" })).statusCode).toBe(401);
    for (const [method, url] of [
      ["GET", "/api/v1/setup"],
      ["GET", "/api/v1/setup/terms"],
      ["POST", "/api/v1/setup/terms/accept"],
      ["POST", "/api/v1/setup/privacy-notice/seen"],
    ] as const) {
      const response = await app.inject({ method, url, headers: bearer(tenant, "51") });
      expect(response.statusCode, `${method} ${url}`).toBe(403);
    }
    await app.close();
  });
});
