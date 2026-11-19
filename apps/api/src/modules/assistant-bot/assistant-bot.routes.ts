import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AssistantBot } from "../../integrations/bitrix24/bot-messenger";
import {
  eventAuthSchema,
  type PortalEventVerifier,
} from "../../integrations/bitrix24/event-verifier";
import { sessionFromRequest, type SessionSigner } from "../../security/session";
import type { Store } from "../../store/types";
import { ASSISTANT_MESSAGES, type AssistantService } from "../assistant/assistant.service";
import { inPilot } from "../tenants/pilot";

// No modo webhook o Bitrix24 envia tudo como texto (formulário); no modo fetch, como JSON.
const id = z.coerce.string().min(1);

/** Evento `ONIMBOTV2*` (API de chatbots 2.0). Só os campos usados aqui. */
const eventSchema = z.object({
  event: z.string(),
  auth: eventAuthSchema,
  data: z
    .object({
      bot: z.object({ id, code: z.string() }),
      dialogId: id,
      chat: z.object({ dialogId: id, type: z.string() }).partial(),
      message: z.object({ text: z.string(), authorId: id }).partial(),
      user: z.object({ id, name: z.string() }).partial(),
    })
    .partial()
    .optional(),
});

interface AssistantBotOptions {
  verifier: PortalEventVerifier;
  bot: AssistantBot;
  assistant: AssistantService;
  store: Store;
  signer: SessionSigner;
}

/**
 * Bot do assistente no chat nativo do Bitrix24 (`imbot.v2`, eventos em modo webhook).
 *
 * - Responde com IA quando ativada para a empresa; senão, com mensagem fixa e honesta.
 * - Dados de negócios só no **chat privado** com o próprio colaborador: em grupo, o bot pede para
 *   conversar no privado (evita expor a carteira de alguém para outras pessoas).
 * - Responde com os tokens do aplicativo guardados na instalação; portal sem instalação concluída é
 *   ignorado.
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

    const tenant = verified.tenant;
    if (!tenant || data?.bot?.code !== options.bot.code) {
      return reply.send({ ok: true, ignored: true });
    }
    if (event === "ONIMBOTV2DELETE") {
      options.bot.forget(tenant.id);
      return reply.send({ ok: true });
    }

    const dialogId = data.chat?.dialogId ?? data.dialogId;
    if (!dialogId) return reply.send({ ok: true, ignored: true });

    let message: string | null = null;
    const authorId = data.user?.id ?? data.message?.authorId;
    if (
      (event === "ONIMBOTV2JOINCHAT" || event === "ONIMBOTV2MESSAGEADD") &&
      !inPilot(tenant, authorId)
    ) {
      message = ASSISTANT_MESSAGES.pilotOnly;
    } else if (event === "ONIMBOTV2JOINCHAT") {
      message = (await options.assistant.aiAvailable(tenant))
        ? ASSISTANT_MESSAGES.welcome
        : ASSISTANT_MESSAGES.notConnected;
    } else if (event === "ONIMBOTV2MESSAGEADD") {
      const userId = authorId;
      if (!userId) return reply.send({ ok: true, ignored: true });
      // No chat privado, o diálogo com o bot é o próprio ID do colaborador.
      const isPrivate = dialogId === userId;
      message = isPrivate
        ? await options.assistant.reply(
            tenant,
            userId,
            data.user?.name ?? "colaborador",
            data.message?.text ?? "",
          )
        : ASSISTANT_MESSAGES.privateOnly;
    }
    if (!message) return reply.send({ ok: true, ignored: true });

    try {
      await options.bot.send(tenant, dialogId, message, data.bot.id);
    } catch (error) {
      request.log.error({ err: error, event, domain: auth.domain }, "Falha ao responder no chat.");
      return reply.code(502).send({ error: "Falha ao responder no Bitrix24" });
    }
    return reply.send({ ok: true });
  });

  /**
   * Situação do bot para o colaborador logado: o frontend abre o chat com o `dialogId` devolvido.
   * `not-installed` quando o bot não está registrado neste portal.
   */
  app.get("/api/v1/assistant", async (request, reply) => {
    const session = sessionFromRequest(request, options.signer);
    if (!session) return reply.code(401).send({ error: "Sessão inválida ou expirada" });
    const tenant = await options.store.tenants.findById(session.tenantId);
    if (!tenant) return reply.code(401).send({ error: "Empresa não encontrada" });
    try {
      const botId = await options.bot.botId(tenant);
      return reply
        .header("Cache-Control", "no-store")
        .send(botId ? { status: "ready", dialogId: botId } : { status: "not-installed" });
    } catch (error) {
      request.log.warn({ err: error, domain: tenant.domain }, "Falha ao consultar o bot.");
      return reply.code(503).send({ status: "unavailable" });
    }
  });
}
