import { resolve } from "node:path";
import { z } from "zod";

/** Build do frontend. Os scripts da API rodam com cwd = apps/api. */
const DEFAULT_WEB_DIST = resolve(process.cwd(), "../web/dist");

const commaList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );

/**
 * Configuração validada na inicialização. Segredos vêm apenas do ambiente (.env local, cofre em
 * produção) — nunca do Git.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  /** Build do frontend servido pela API (aplicativo Bitrix24). */
  WEB_DIST_DIR: z.string().default(DEFAULT_WEB_DIST),

  /**
   * Portais Bitrix24 autorizados (ex.: "projacseg-teste.bitrix24.com.br"). Eventos de outros
   * portais são recusados. Vazio = nenhum evento aceito.
   */
  BITRIX24_ALLOWED_DOMAINS: commaList,
  /**
   * Opcional: fixa o `application_token` esperado nos eventos. Sem ele, o primeiro token recebido de
   * cada portal é memorizado (até o banco de dados entrar).
   */
  BITRIX24_APPLICATION_TOKEN: z.string().optional(),
  /** Código do bot do assistente (igual ao VITE_BITRIX24_ASSISTANT_BOT_CODE do frontend). */
  BITRIX24_ASSISTANT_BOT_CODE: z.string().default("projacseg_assistant"),

  // Futuro (ver docs/INTEGRATIONS.md).
  DATABASE_URL: z.string().optional(),
  BITRIX24_CLIENT_ID: z.string().optional(),
  BITRIX24_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
