import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import qs from "qs";
import { describe, expect, it } from "vitest";
import { TokenCipher } from "../../security/token-cipher";
import {
  DOMAIN,
  ENCRYPTION_KEY,
  RULE,
  fakeRest,
  seedTenant,
  snapshot,
  testApp,
} from "../../test/helpers";

function webDist() {
  const dir = mkdtempSync(join(tmpdir(), "web-"));
  writeFileSync(
    join(dir, "index.html"),
    "<!doctype html><html><head><title>W</title></head></html>",
  );
  return dir;
}

function tenantsDir() {
  const dir = mkdtempSync(join(tmpdir(), "tenants-"));
  writeFileSync(
    join(dir, `${DOMAIN}.json`),
    JSON.stringify({ digestTime: "08:30", aiEnabled: true, rules: [RULE] }),
  );
  return dir;
}

const portalApi = (admin = true) =>
  fakeRest({
    "app.info": { CODE: "local.app.1" },
    "user.current": { ID: "7", NAME: "Lucas", LAST_NAME: "Carvalho" },
    "user.admin": admin,
    "event.bind": true,
    "crm.category.list": { categories: [{ id: 0, name: "Automóvel" }] },
    "crm.status.list": [{ STATUS_ID: "PREPARATION", NAME: "Elaborando cotação" }],
  });

const sessionFrom = (html: string) => /name="workspace-session" content="([^"]+)"/.exec(html)?.[1];

const frame = (body: Record<string, string>) => ({
  method: "POST" as const,
  headers: { "content-type": "application/x-www-form-urlencoded" },
  payload: qs.stringify(body),
});

describe("instalação e abertura no Bitrix24", () => {
  it("instala: valida o admin, guarda tokens criptografados, liga eventos e carrega regras", async () => {
    const rest = portalApi();
    const dist = webDist();
    const tenants = tenantsDir();
    const { app, store } = await testApp(
      { WEB_DIST_DIR: dist, TENANTS_DIR: tenants, BITRIX24_CLIENT_ID: "local.app.1" },
      { restClient: rest.client },
    );

    const response = await app.inject({
      ...frame({
        AUTH_ID: "access-x",
        REFRESH_ID: "refresh-x",
        AUTH_EXPIRES: "3600",
        member_id: "membro-1",
      }),
      url: `/install?DOMAIN=${DOMAIN}&APP_SID=abc`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("access-x");
    expect(sessionFrom(response.body)).toBeTruthy();

    const tenant = await store.tenants.findByMemberId("membro-1");
    expect(tenant).toMatchObject({
      domain: DOMAIN,
      config: { digestTime: "08:30", aiEnabled: true },
    });
    expect(tenant?.accessTokenEnc).not.toContain("access-x");
    expect(new TokenCipher(ENCRYPTION_KEY).decrypt(tenant!.refreshTokenEnc!)).toBe("refresh-x");
    expect(await store.rules.list(tenant!.id)).toEqual([RULE]);

    const binds = rest.calls
      .filter((call) => call.method === "event.bind")
      .map((call) => call.params);
    expect(binds).toEqual([
      { event: "ONCRMDEALADD", handler: "http://localhost:80/bitrix24/events/crm" },
      { event: "ONCRMDEALUPDATE", handler: "http://localhost:80/bitrix24/events/crm" },
      { event: "ONCRMDEALDELETE", handler: "http://localhost:80/bitrix24/events/crm" },
    ]);
    const catalog = JSON.parse(readFileSync(join(tenants, `${DOMAIN}.catalog.json`), "utf8"));
    expect(catalog.etapas).toEqual({ PREPARATION: "Elaborando cotação" });
    await app.close();
  });

  it("recusa instalação por quem não é administrador", async () => {
    const { app, store } = await testApp(
      { WEB_DIST_DIR: webDist() },
      { restClient: portalApi(false).client },
    );
    const response = await app.inject({
      ...frame({ AUTH_ID: "a", REFRESH_ID: "r", member_id: "membro-1" }),
      url: `/install?DOMAIN=${DOMAIN}&APP_SID=abc`,
    });
    expect(sessionFrom(response.body)).toBeUndefined();
    expect(await store.tenants.findByMemberId("membro-1")).toBeNull();
    await app.close();
  });

  it("recusa AUTH_ID de outro aplicativo", async () => {
    const { app } = await testApp(
      { WEB_DIST_DIR: webDist(), BITRIX24_CLIENT_ID: "local.outro" },
      { restClient: portalApi().client },
    );
    const response = await app.inject({
      ...frame({ AUTH_ID: "a", REFRESH_ID: "r", member_id: "membro-1" }),
      url: `/install?DOMAIN=${DOMAIN}&APP_SID=abc`,
    });
    expect(sessionFrom(response.body)).toBeUndefined();
    await app.close();
  });

  it("abre: emite sessão e o dashboard só mostra os negócios do colaborador", async () => {
    const { app, store } = await testApp(
      { WEB_DIST_DIR: webDist() },
      { restClient: portalApi(false).client },
    );
    const tenant = await seedTenant(store);
    await store.rules.replaceAll(tenant.id, [RULE]);
    await store.deals.upsert(tenant.id, snapshot());
    await store.deals.upsert(
      tenant.id,
      snapshot({ dealId: "900", title: "De outro", assignedById: "8" }),
    );

    const opened = await app.inject({
      ...frame({ AUTH_ID: "a", member_id: "membro-1" }),
      url: `/?DOMAIN=${DOMAIN}&APP_SID=abc`,
    });
    const session = sessionFrom(opened.body);
    expect(session).toBeTruthy();

    const journey = await app.inject({
      method: "GET",
      url: "/api/v1/journey",
      headers: { authorization: `Bearer ${session}` },
    });
    expect(journey.statusCode).toBe(200);
    expect(journey.json().deals.map((deal: { id: string }) => deal.id)).toEqual(["501"]);

    const history = await app.inject({
      method: "GET",
      url: "/api/v1/deals/900/history",
      headers: { authorization: `Bearer ${session}` },
    });
    expect(history.statusCode).toBe(404);
    await app.close();
  });

  it("abertura de portal sem cadastro não emite sessão", async () => {
    const { app } = await testApp({ WEB_DIST_DIR: webDist() }, { restClient: portalApi().client });
    const opened = await app.inject({
      ...frame({ AUTH_ID: "a", member_id: "desconhecido" }),
      url: `/?DOMAIN=${DOMAIN}&APP_SID=abc`,
    });
    expect(opened.statusCode).toBe(200);
    expect(sessionFrom(opened.body)).toBeUndefined();
    await app.close();
  });

  it("API recusa sessão ausente ou adulterada", async () => {
    const { app } = await testApp();
    expect((await app.inject({ method: "GET", url: "/api/v1/journey" })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/v1/journey",
          headers: { authorization: "Bearer eyJ0ZW5hbnRJZCI6IngifQ.assinatura" },
        })
      ).statusCode,
    ).toBe(401);
    await app.close();
  });
});

describe("eventos do CRM", () => {
  it("reavaliam o negócio alterado", async () => {
    const deals = new Map([["501", snapshot()]]);
    const { app, store } = await testApp(
      {},
      {
        restClient: fakeRest().client,
        dealSource: {
          listOpenDeals: async () => [...deals.values()],
          getDeal: async (_tenant, id) => deals.get(id) ?? null,
        },
      },
    );
    const tenant = await seedTenant(store);
    await store.rules.replaceAll(tenant.id, [RULE]);

    const response = await app.inject({
      method: "POST",
      url: "/bitrix24/events/crm",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: qs.stringify({
        event: "ONCRMDEALUPDATE",
        data: { FIELDS: { ID: "501" } },
        auth: {
          access_token: "t",
          domain: DOMAIN,
          client_endpoint: `https://${DOMAIN}/rest/`,
          member_id: "membro-1",
          application_token: "app-token-1",
        },
      }),
    });
    expect(response.statusCode).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await store.occurrences.listOpen(tenant.id)).toHaveLength(1);
    expect(await store.deals.get(tenant.id, "501")).toMatchObject({
      title: "Carlos Almeida - Auto",
    });
    await app.close();
  });
});
