import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { loadEnv } from "../../config/env";

let dist: string;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), "web-dist-"));
  mkdirSync(join(dist, "assets"));
  writeFileSync(join(dist, "index.html"), "<!doctype html><title>Workspace</title>");
  writeFileSync(join(dist, "assets", "app.js"), "console.log(1)");
  app = await buildApp(
    loadEnv({
      NODE_ENV: "test",
      WEB_DIST_DIR: dist,
      BITRIX24_ALLOWED_DOMAINS: "projacseg-teste.bitrix24.com.br",
    }),
  );
});

afterAll(() => app.close());

describe("frontend servido pela API", () => {
  it("responde ao POST do Bitrix24 no handler com o index.html", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/?DOMAIN=projacseg-teste.bitrix24.com.br&APP_SID=abc",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "AUTH_ID=segredo&member_id=m",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("<title>Workspace</title>");
    expect(response.body).not.toContain("segredo");
  });

  it("responde ao POST da página de instalação", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/install?DOMAIN=x&APP_SID=y",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "AUTH_ID=a",
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
  });

  it("restringe o iframe aos portais autorizados", async () => {
    const response = await app.inject({ method: "GET", url: "/" });
    expect(response.headers["content-security-policy"]).toBe(
      "frame-ancestors 'self' https://projacseg-teste.bitrix24.com.br",
    );
  });

  it("rotas do SPA recebem o index.html; arquivos estáticos são servidos", async () => {
    expect((await app.inject({ method: "GET", url: "/em-risco" })).body).toContain("Workspace");
    expect((await app.inject({ method: "GET", url: "/assets/app.js" })).body).toBe(
      "console.log(1)",
    );
    expect((await app.inject({ method: "GET", url: "/assets/nao-existe.js" })).statusCode).toBe(
      404,
    );
  });

  it("não mascara rotas da API", async () => {
    expect((await app.inject({ method: "GET", url: "/health" })).json()).toMatchObject({
      status: "ok",
    });
    expect((await app.inject({ method: "GET", url: "/bitrix24/qualquer" })).statusCode).toBe(404);
  });
});
