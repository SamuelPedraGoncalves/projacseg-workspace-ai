import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  eventAuthSchema,
  type PortalEventVerifier,
} from "../../integrations/bitrix24/event-verifier";
import type { EngineService } from "./engine.service";

const DEAL_EVENTS = new Set(["ONCRMDEALADD", "ONCRMDEALUPDATE", "ONCRMDEALDELETE"]);

const eventSchema = z.object({
  event: z.string(),
  auth: eventAuthSchema,
  data: z.object({ FIELDS: z.object({ ID: z.coerce.string() }) }),
});

/**
 * Alterações de negócios no Bitrix24 (event.bind feito na instalação). Responde na hora e reavalia o
 * negócio em segundo plano — o dashboard e os alertas se atualizam sozinhos.
 */
export async function crmEventsRoutes(
  app: FastifyInstance,
  options: { verifier: PortalEventVerifier; engine: EngineService },
) {
  app.post("/bitrix24/events/crm", async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Evento inválido" });
    const { event, auth, data } = parsed.data;

    const verified = await options.verifier.verify(auth);
    if (!verified.ok) return reply.code(verified.status).send({ error: verified.error });
    if (!DEAL_EVENTS.has(event.toUpperCase()) || !verified.tenant) {
      return reply.send({ ok: true, ignored: true });
    }

    const tenant = verified.tenant;
    void options.engine.syncDeal(tenant, data.FIELDS.ID).catch((error: unknown) => {
      request.log.error({ err: error, dealId: data.FIELDS.ID }, "Falha ao reavaliar negócio.");
    });
    return reply.send({ ok: true });
  });
}
