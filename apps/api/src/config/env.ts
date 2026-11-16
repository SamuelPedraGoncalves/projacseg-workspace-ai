import { z } from "zod";

/**
 * Configuração validada na inicialização. Segredos vêm apenas do ambiente (.env local, cofre em
 * produção) — nunca do Git. Variáveis do Bitrix24 são opcionais nesta etapa: a integração ainda não
 * está ativa.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // Futuro (ver docs/INTEGRATIONS.md). Mantidos opcionais até a homologação.
  DATABASE_URL: z.string().optional(),
  BITRIX24_CLIENT_ID: z.string().optional(),
  BITRIX24_CLIENT_SECRET: z.string().optional(),
  BITRIX24_APP_BASE_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
