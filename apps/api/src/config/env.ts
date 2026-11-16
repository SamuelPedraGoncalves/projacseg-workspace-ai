import { resolve } from "node:path";
import { z } from "zod";

/** Os scripts da API rodam com cwd = apps/api. */
const DEFAULT_WEB_DIST = resolve(process.cwd(), "../web/dist");
const DEFAULT_TENANTS_DIR = resolve(process.cwd(), "tenants");

const commaList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );

const bool = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => (value === undefined ? fallback : value === "true" || value === "1"));

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
  /** Configuração e regras de cada empresa: <dir>/<domínio>.json. */
  TENANTS_DIR: z.string().default(DEFAULT_TENANTS_DIR),

  /** PostgreSQL. Sem ele, os dados ficam em memória e somem ao reiniciar (só para testes). */
  DATABASE_URL: z.string().optional(),
  /** 32 bytes em base64 para criptografar tokens OAuth. Obrigatória com DATABASE_URL. */
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  /** Segredo das sessões do Workspace (≥ 32 caracteres). Obrigatório em produção. */
  SESSION_SECRET: z.string().optional(),

  /** Portais Bitrix24 autorizados. Vazio = nenhum evento aceito e nenhuma instalação. */
  BITRIX24_ALLOWED_DOMAINS: commaList,
  /** Opcional: fixa o `application_token` esperado nos eventos. */
  BITRIX24_APPLICATION_TOKEN: z.string().optional(),
  /** Código do bot do assistente (igual ao VITE_BITRIX24_ASSISTANT_BOT_CODE do frontend). */
  BITRIX24_ASSISTANT_BOT_CODE: z.string().default("projacseg_assistant"),
  /** Credenciais do aplicativo local (renovação de tokens). Só no servidor. */
  BITRIX24_CLIENT_ID: z.string().optional(),
  BITRIX24_CLIENT_SECRET: z.string().optional(),

  /** Motor de regras em segundo plano. */
  ENGINE_ENABLED: bool(true),
  ENGINE_TICK_SECONDS: z.coerce.number().int().min(10).default(60),
  ENGINE_FULL_SYNC_MINUTES: z.coerce.number().int().min(1).default(30),

  /** IA no chat do assistente: "none" ou "anthropic". Também precisa de aiEnabled na empresa. */
  AI_PROVIDER: z.enum(["none", "anthropic"]).default("none"),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  /** A chave pode vir daqui ou do perfil `ant auth login`. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Não envia títulos de negócios (nomes de segurados) à IA; recoloca na resposta. */
  AI_REDACT_CLIENT_NAMES: bool(true),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(parsed.error)}`);
  }
  const env = parsed.data;
  if (env.DATABASE_URL && !env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("Configuração inválida: TOKEN_ENCRYPTION_KEY é obrigatória com DATABASE_URL.");
  }
  if (env.NODE_ENV === "production" && !env.SESSION_SECRET) {
    throw new Error("Configuração inválida: SESSION_SECRET é obrigatório em produção.");
  }
  return env;
}
