import Fastify, { type FastifyInstance } from "fastify";
import type { Env } from "./config/env";
import { healthRoutes } from "./modules/health/health.routes";

/**
 * Monta a aplicação sem abrir porta (facilita testes com `app.inject`).
 * Nesta sprint expõe apenas o health check; módulos de domínio entram nas próximas etapas.
 */
export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : { level: env.LOG_LEVEL },
  });

  await app.register(healthRoutes);

  return app;
}
