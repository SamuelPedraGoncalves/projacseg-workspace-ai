import type { FastifyPluginAsync } from "fastify";

/** Mostra se há portal Bitrix24 autorizado. A IA ainda não está conectada. */
export const healthRoutes: FastifyPluginAsync<{ bitrix24Configured: boolean }> = async (
  app,
  options,
) => {
  app.get("/health", async () => ({
    status: "ok" as const,
    service: "projacseg-workspace-api",
    integrations: {
      bitrix24: options.bitrix24Configured ? ("configured" as const) : ("not-configured" as const),
      llm: "not-configured" as const,
    },
  }));
};
