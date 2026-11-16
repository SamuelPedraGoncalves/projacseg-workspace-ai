import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Bitrix24RestClient } from "../../integrations/bitrix24/rest-client";

/**
 * Mensagens do bot enquanto a IA não está conectada. São honestas: nunca simulam uma resposta de IA.
 */
export const BOT_MESSAGES = {
  welcome:
    "Olá! Sou o assistente ProjacSeg. Estou em fase de testes: a inteligência artificial ainda não " +
    "está conectada, então por enquanto não respondo perguntas.",
  reply:
    "Recebi sua mensagem. O assistente de IA ainda está em implantação neste portal de testes e não " +
    "responde perguntas por enquanto. Em breve vou ajudar com suas prioridades e pendências.",
} as const;

const authSchema = z.object({
  access_token: z.string().min(1),
  domain: z.string().min(1),
  client_endpoint: z.string().min(1),
  member_id: z.string().min(1),
  application_token: z.string().min(1),
});

const botSchema = z.object({ BOT_ID: z.coerce.string(), BOT_CODE: z.string() });

const eventSchema = z.object({
  event: z.string(),
  auth: authSchema,
  data: z
    .object({
      BOT: z.record(z.string(), botSchema).optional(),
      PARAMS: z.object({ DIALOG_ID: z.coerce.string() }).partial().optional(),
    })
    .optional(),
});

interface AssistantBotOptions {
  allowedDomains: string[];
  applicationToken: string | undefined;
  botCode: string;
  restClient: Bitrix24RestClient;
}

/**
 * Recebe os eventos do bot do assistente (registrado no portal pela página /install).
 *
 * Proteções:
 * - aceita apenas portais listados em BITRIX24_ALLOWED_DOMAINS;
 * - só responde para `https://<domínio>/rest/` (evita usar o servidor para chamar outros endereços);
 * - confere o `application_token` (fixo por variável ou memorizado no primeiro evento do portal).
 */
export async function assistantBotRoutes(app: FastifyInstance, options: AssistantBotOptions) {
  const knownTokens = new Map<string, string>();

  app.post("/bitrix24/events/assistant", async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Evento inválido" });

    const { event, auth, data } = parsed.data;
    const domain = auth.domain.toLowerCase();

    if (!options.allowedDomains.includes(domain)) {
      request.log.warn({ domain }, "Evento de portal não autorizado recusado.");
      return reply.code(403).send({ error: "Portal não autorizado" });
    }
    if (auth.client_endpoint !== `https://${domain}/rest/`) {
      return reply.code(403).send({ error: "Endpoint inválido" });
    }

    const expected = options.applicationToken ?? knownTokens.get(auth.member_id);
    if (expected && expected !== auth.application_token) {
      return reply.code(403).send({ error: "Token da aplicação inválido" });
    }
    if (!expected) knownTokens.set(auth.member_id, auth.application_token);

    if (event === "ONIMBOTDELETE") return reply.send({ ok: true });

    const bot = Object.values(data?.BOT ?? {}).find((item) => item.BOT_CODE === options.botCode);
    const dialogId = data?.PARAMS?.DIALOG_ID;
    const message =
      event === "ONIMBOTJOINCHAT"
        ? BOT_MESSAGES.welcome
        : event === "ONIMBOTMESSAGEADD"
          ? BOT_MESSAGES.reply
          : null;

    if (!bot || !dialogId || !message) return reply.send({ ok: true, ignored: true });

    try {
      await options.restClient.call(
        auth.client_endpoint,
        "imbot.message.add",
        { BOT_ID: bot.BOT_ID, DIALOG_ID: dialogId, MESSAGE: message },
        auth.access_token,
      );
    } catch (error) {
      request.log.error({ err: error, event, domain }, "Falha ao responder no chat do Bitrix24.");
      return reply.code(502).send({ error: "Falha ao responder no Bitrix24" });
    }
    return reply.send({ ok: true });
  });
}
