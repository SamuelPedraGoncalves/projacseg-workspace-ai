import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { loadEnv } from "./config/env";

describe("API", () => {
  it("responde ao health check sem integrações ativas", async () => {
    const app = await buildApp(loadEnv({ NODE_ENV: "test" }));
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "projacseg-workspace-api",
      database: "memory",
      integrations: { bitrix24: "not-configured", llm: "not-configured" },
    });
    await app.close();
  });

  it("rejeita configuração inválida", () => {
    expect(() => loadEnv({ API_PORT: "porta" })).toThrow(/Configuração inválida/);
  });
});
