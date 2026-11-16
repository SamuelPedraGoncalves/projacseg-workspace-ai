import type { FastifyPluginAsync } from "fastify";

interface HealthOptions {
  bitrix24Configured: boolean;
  database: "postgresql" | "memory";
  ai: string;
}

/** Estado do serviço (sem dados sensíveis). */
export const healthRoutes: FastifyPluginAsync<HealthOptions> = async (app, options) => {
  app.get("/health", async () => ({
    status: "ok" as const,
    service: "projacseg-workspace-api",
    database: options.database,
    integrations: {
      bitrix24: options.bitrix24Configured ? ("configured" as const) : ("not-configured" as const),
      llm: options.ai === "none" ? ("not-configured" as const) : options.ai,
    },
  }));
};
