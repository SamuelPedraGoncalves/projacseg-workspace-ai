import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  eventAuthSchema,
  type PortalEventVerifier,
} from "../../integrations/bitrix24/event-verifier";
import type { Bitrix24RestClient } from "../../integrations/bitrix24/rest-client";
import { ASSISTANT_MESSAGES, type AssistantService } from "../assistant/assistant.service";

const botSchema = z.object({ BOT_ID: z.coerce.string(), BOT_CODE: z.string() });

const eventSchema = z.object({
  event: z.string(),
  auth: eventAuthSchema,
  data: z
    .object({
      BOT: z.record(z.string(), botSchema).optional(),
      PARAMS: z
        .object({
          DIALOG_ID: z.coerce.string(),
          MESSAGE: z.string(),
          FROM_USER_ID: z.coerce.string(),
        })
        .partial()
        .optional(),
      USER: z.object({ NAME: z.string() }).partial().optional(),
    })
    .optional(),
});

interface AssistantBotOptions {
  verifier: PortalEventVerifier;
  botCode: string;
  restClient: Bitrix24RestClient;
  assistant: AssistantService;
}

/**
 * Eventos do bot do assistente (registrado no portal pela página /install). Responde no próprio chat
 * do Bitrix24: com IA quando ativada para a empresa; senão, com mensagem fixa e honesta.
 */
export async function assistantBotRoutes(app: FastifyInstance, options: AssistantBotOptions) {
  app.post("/bitrix24/events/assistant", async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Evento inválido" });

    const { event, auth, data } = parsed.data;
    const verified = await options.verifier.verify(auth);
    if (!verified.ok) {
      request.log.warn({ domain: auth.domain, reason: verified.error }, "Evento do bot recusado.");
      return reply.code(verified.status).send({ error: verified.error });
    }
    if (event === "ONIMBOTDELETE") return reply.send({ ok: true });

    const bot = Object.values(data?.BOT ?? {}).find((item) => item.BOT_CODE === options.botCode);
    const dialogId = data?.PARAMS?.DIALOG_ID;
    if (!bot || !dialogId) return reply.send({ ok: true, ignored: true });

    let message: string | null = null;
    if (event === "ONIMBOTJOINCHAT") {
      message =
        options.assistant.aiConfigured && verified.tenant?.config.aiEnabled
          ? ASSISTANT_MESSAGES.welcome
          : ASSISTANT_MESSAGES.notConnected;
    } else if (event === "ONIMBOTMESSAGEADD") {
      message = await options.assistant.reply(
        verified.tenant,
        data?.PARAMS?.FROM_USER_ID ?? dialogId,
        data?.USER?.NAME ?? "colaborador",
        data?.PARAMS?.MESSAGE ?? "",
      );
    }
    if (!message) return reply.send({ ok: true, ignored: true });

    try {
      await options.restClient.call(
        auth.client_endpoint,
        "imbot.message.add",
        { BOT_ID: bot.BOT_ID, DIALOG_ID: dialogId, MESSAGE: message },
        auth.access_token,
      );
    } catch (error) {
      request.log.error({ err: error, event, domain: auth.domain }, "Falha ao responder no chat.");
      return reply.code(502).send({ error: "Falha ao responder no Bitrix24" });
    }
    return reply.send({ ok: true });
  });
}
