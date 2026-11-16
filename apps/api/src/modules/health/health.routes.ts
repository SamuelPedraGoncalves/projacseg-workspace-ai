import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok" as const,
    service: "projacseg-workspace-api",
    integrations: { bitrix24: "not-configured" as const, llm: "not-configured" as const },
  }));
};
