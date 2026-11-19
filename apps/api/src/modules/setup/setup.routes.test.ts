import { describe, expect, it } from "vitest";
import { SessionSigner } from "../../security/session";
import type { Store, TenantRecord } from "../../store/types";
import { SESSION_SECRET, fakeRest, seedTenant, testApp } from "../../test/helpers";
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

describe("quem pode criar regras", () => {
  async function accepted(store: Store) {
    const tenant = await setup(store);
    await store.consents.append({
      tenantId: tenant.id,
      userId: ADMIN,
      kind: "terms",
      version: CURRENT_TERMS.version,
      provisional: true,
      acceptedAt: new Date(),
    });
    return tenant;
  }

  it("só o administrador escolhe; a escolha avança o primeiro acesso", async () => {
    const { app, store } = await testApp();
    const tenant = await accepted(store);
    const save = (userId: string, editors: unknown) =>
      app.inject({
        method: "PUT",
        url: "/api/v1/setup/editors",
        headers: bearer(tenant, userId),
        payload: { editors },
      });

    expect((await save("51", [])).statusCode).toBe(403);
    expect((await save(ADMIN, [{ id: "abc", name: "X" }])).statusCode).toBe(400);
    expect((await save(ADMIN, [{ id: "51", name: "" }])).statusCode).toBe(400);
    expect((await save(ADMIN, [{ id: "51", name: "Ana" }])).statusCode).toBe(200);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/setup/editors",
      headers: bearer(tenant, "51"),
    });
    expect(list.json()).toEqual({ editors: [{ id: "51", name: "Ana" }] });

    const status = await app.inject({
      method: "GET",
      url: "/api/v1/setup",
      headers: bearer(tenant, ADMIN),
    });
    expect(status.json().step).toBe("mapping");
    // Ana passou a ver Configurações.
    const ana = await app.inject({
      method: "GET",
      url: "/api/v1/setup",
      headers: bearer(tenant, "51"),
    });
    expect(ana.json().access).toEqual({ admin: false, ruleEditor: true, settings: true });
    await app.close();
  });

  it("lista vazia é válida: só o administrador cria regras", async () => {
    const { app, store } = await testApp();
    const tenant = await accepted(store);
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/setup/editors",
      headers: bearer(tenant, ADMIN),
      payload: { editors: [] },
    });
    expect(response.statusCode).toBe(200);
    expect(
      (await store.tenants.findById(tenant.id))?.config.setup?.editorsConfirmedAt,
    ).toBeTruthy();
    await app.close();
  });

  it("sem acesso a Configurações, a lista de quem cria regras é recusada", async () => {
    const { app, store } = await testApp();
    const tenant = await accepted(store);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/setup/editors",
      headers: bearer(tenant, "51"),
    });
    expect(list.statusCode).toBe(403);
    await app.close();
  });

  it("administrador do portal assume quando o instalador saiu (fora do piloto)", async () => {
    const { app, store } = await testApp();
    const tenant = await accepted(store);
    const claim = (userId: string, portalAdmin: boolean) =>
      app.inject({
        method: "POST",
        url: "/api/v1/setup/claim-admin",
        headers: bearer(tenant, userId, portalAdmin),
      });

    expect((await claim("88", false)).statusCode).toBe(403);
    expect((await claim("88", true)).statusCode).toBe(200);
    expect((await store.tenants.findById(tenant.id))?.installedByUserId).toBe("88");

    const pilot = await setup(store, { pilotUserIds: ["88"] });
    await store.tenants.update(tenant.id, { config: pilot.config });
    expect((await claim("88", true)).statusCode).toBe(403);
    await app.close();
  });
});

describe("mapeamento dos campos", () => {
  const portal = () =>
    fakeRest({
      "crm.category.list": { categories: [{ id: 4, name: "Demais Ramos" }] },
      "crm.status.list": [],
      "crm.deal.fields": {
        TITLE: { type: "string", title: "Nome" },
        UF_CRM_TIPO: {
          type: "enumeration",
          formLabel: "Tipo do seguro",
          items: [
            { ID: "1", VALUE: "Seguro novo" },
            { ID: "2", VALUE: "Renovação" },
          ],
        },
        UF_CRM_RAMO: {
          type: "enumeration",
          formLabel: "Ramo",
          items: [{ ID: "7", VALUE: "Auto" }],
        },
      },
    });

  async function ready(store: Store) {
    const tenant = await setup(store, {
      setup: { editorsConfirmedAt: "2026-11-19T10:00:00.000Z" },
    });
    await store.consents.append({
      tenantId: tenant.id,
      userId: ADMIN,
      kind: "terms",
      version: CURRENT_TERMS.version,
      provisional: true,
      acceptedAt: new Date(),
    });
    return tenant;
  }

  it("mostra o catálogo do portal (só campos personalizados) e a sugestão automática", async () => {
    const { app, store } = await testApp({}, { restClient: portal().client });
    const tenant = await ready(store);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/setup/mapping",
      headers: bearer(tenant, ADMIN),
    });
    expect(response.statusCode).toBe(200);
    const view = response.json();
    expect(view.catalog.fields.map((field: { code: string }) => field.code)).toEqual([
      "UF_CRM_TIPO",
      "UF_CRM_RAMO",
    ]);
    expect(view.catalog.categories).toEqual([
      { id: "4", name: "Demais Ramos" },
      { id: "0", name: "Geral" },
    ]);
    expect(view.suggestion).toMatchObject({
      fieldMapping: { insuranceType: "UF_CRM_TIPO", branch: "UF_CRM_RAMO" },
      situations: { newBusinessValues: ["1"], renewalValues: ["2"] },
    });
    expect(view).toMatchObject({ current: null, confirmed: false });
    await app.close();
  });

  it("inválido → 400 com os erros e nada gravado; válido → grava e conclui o primeiro acesso", async () => {
    const { app, store } = await testApp({}, { restClient: portal().client });
    const tenant = await ready(store);
    const save = (payload: unknown, userId = ADMIN) =>
      app.inject({
        method: "PUT",
        url: "/api/v1/setup/mapping",
        headers: bearer(tenant, userId),
        payload: payload as Record<string, unknown>,
      });
    const valid = {
      fieldMapping: { insuranceType: "UF_CRM_TIPO", branch: "UF_CRM_RAMO" },
      situations: { categoryIds: ["4"], newBusinessValues: ["1"], renewalValues: ["2"] },
    };

    const invalid = await save({
      ...valid,
      fieldMapping: { ...valid.fieldMapping, branch: "UF_CRM_9" },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().errors).toEqual(['Campo "UF_CRM_9" não existe neste portal.']);
    expect((await store.tenants.findById(tenant.id))?.config.situations).toBeUndefined();

    expect((await save(valid, "51")).statusCode).toBe(403);
    expect((await save(valid)).statusCode).toBe(200);
    const saved = (await store.tenants.findById(tenant.id))!.config;
    expect(saved.fieldMapping).toEqual(valid.fieldMapping);
    expect(saved.situations).toEqual(valid.situations);

    const status = await app.inject({
      method: "GET",
      url: "/api/v1/setup",
      headers: bearer(tenant, ADMIN),
    });
    expect(status.json().step).toBe("done");

    const view = await app.inject({
      method: "GET",
      url: "/api/v1/setup/mapping",
      headers: bearer(tenant, ADMIN),
    });
    expect(view.json()).toMatchObject({ current: valid, confirmed: true });
    await app.close();
  });

  it("salvar o mapeamento relê o catálogo e pede nova sincronização do CRM", async () => {
    const rest = portal();
    const { app, store } = await testApp({}, { restClient: rest.client });
    const tenant = await ready(store);
    const before = rest.calls.filter((call) => call.method === "crm.deal.fields").length;
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/setup/mapping",
      headers: bearer(tenant, ADMIN),
      payload: {
        fieldMapping: { insuranceType: "UF_CRM_TIPO", branch: "UF_CRM_RAMO" },
        situations: { categoryIds: ["4"], newBusinessValues: ["1"], renewalValues: ["2"] },
      },
    });
    expect(response.statusCode).toBe(200);
    // Uma leitura para validar e outra, já com o mapeamento novo, para o catálogo usado no CRM.
    await new Promise((done) => setTimeout(done, 10));
    expect(rest.calls.filter((call) => call.method === "crm.deal.fields").length - before).toBe(2);
    await app.close();
  });

  it("sem acesso a Configurações → 403", async () => {
    const { app, store } = await testApp({}, { restClient: portal().client });
    const tenant = await ready(store);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/setup/mapping",
      headers: bearer(tenant, "51"),
    });
    expect(response.statusCode).toBe(403);
    await app.close();
  });
});

describe("calendário em Configurações", () => {
  const CALENDAR = {
    utcOffsetMinutes: -180,
    workdays: [1, 2, 3, 4, 5],
    workStart: "08:00",
    workEnd: "18:00",
    holidays: ["2026-12-25"],
  };

  it("mostra o calendário e a origem; relê do Bitrix24; ajuste manual valida e grava", async () => {
    const rest = fakeRest({
      "calendar.settings.get": { work_time_start: "9", year_holidays: "01.01,25.12" },
    });
    const { app, store } = await testApp(
      {},
      { restClient: rest.client, now: () => new Date("2026-11-19T12:00:00Z") },
    );
    const tenant = await setup(store, { setup: { calendarSource: "default" } });
    const call = (method: "GET" | "POST" | "PUT", url: string, payload?: unknown, userId = ADMIN) =>
      app.inject({
        method,
        url,
        headers: bearer(tenant, userId),
        ...(payload ? { payload: payload as Record<string, unknown> } : {}),
      });

    expect((await call("GET", "/api/v1/setup/calendar")).json()).toMatchObject({
      source: "default",
      calendar: { workStart: "08:00" },
    });

    const imported = await call("POST", "/api/v1/setup/calendar/import");
    expect(imported.statusCode).toBe(200);
    expect(imported.json()).toMatchObject({ source: "bitrix24", calendar: { workStart: "09:00" } });

    expect(
      (await call("PUT", "/api/v1/setup/calendar", { ...CALENDAR, workStart: "8h" })).statusCode,
    ).toBe(400);
    const saved = await call("PUT", "/api/v1/setup/calendar", CALENDAR);
    expect(saved.statusCode).toBe(200);
    const config = (await store.tenants.findById(tenant.id))!.config;
    expect(config.calendar).toEqual(CALENDAR);
    expect(config.setup?.calendarSource).toBe("manual");
    // A data de 2026-12-25 ficou na lista salva; 01/01 não: só o Natal continua recorrente.
    expect(config.recurringHolidays).toEqual(["12-25"]);

    expect((await call("GET", "/api/v1/setup/calendar", undefined, "51")).statusCode).toBe(403);
    expect((await call("PUT", "/api/v1/setup/calendar", CALENDAR, "51")).statusCode).toBe(403);
    await app.close();
  });

  it("falha do Bitrix24 ao reler → 502 e nada muda", async () => {
    const rest = fakeRest({ "calendar.settings.get": new Error("insufficient_scope") });
    const { app, store } = await testApp({}, { restClient: rest.client });
    const tenant = await setup(store, { setup: { calendarSource: "default" } });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/setup/calendar/import",
      headers: bearer(tenant, ADMIN),
    });
    expect(response.statusCode).toBe(502);
    expect(response.json().error).toMatch(/calendário/i);
    expect((await store.tenants.findById(tenant.id))?.config.setup?.calendarSource).toBe("default");
    await app.close();
  });
});

describe("estrutura da empresa em Configurações", () => {
  it("devolve a árvore lida do Bitrix24, com o nome dos chefes", async () => {
    const rest = fakeRest({
      "department.get": [
        { ID: "1", NAME: "Corretora", UF_HEAD: "10" },
        { ID: "3", NAME: "Vendas", PARENT: "1" },
      ],
      "user.get": (params: Record<string, unknown>) =>
        params.ID === "10" ? [{ ID: "10", NAME: "Marta", LAST_NAME: "Lima" }] : [],
    });
    const { app, store } = await testApp({}, { restClient: rest.client });
    const tenant = await setup(store);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/setup/structure",
      headers: bearer(tenant, ADMIN),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      source: "bitrix24",
      departments: [
        {
          id: "1",
          name: "Corretora",
          head: { id: "10", name: "Marta Lima" },
          children: [{ id: "3", name: "Vendas", head: null, children: [] }],
        },
      ],
    });
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/v1/setup/structure",
          headers: bearer(tenant, "51"),
        })
      ).statusCode,
    ).toBe(403);
    await app.close();
  });

  it("falha do portal → 502 com mensagem clara", async () => {
    const rest = fakeRest({ "department.get": new Error("ACCESS_DENIED") });
    const { app, store } = await testApp({}, { restClient: rest.client });
    const tenant = await setup(store);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/setup/structure",
      headers: bearer(tenant, ADMIN),
    });
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: "Não foi possível ler a estrutura da empresa no Bitrix24.",
    });
    await app.close();
  });
});
