import type { JourneyResponse } from "@projacseg/shared";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest, type SessionSigner } from "../../security/session";
import type { Store } from "../../store/types";
import { inPilot, subjectOf } from "../tenants/pilot";
import { buildJourney } from "./journey.service";

/**
 * API do dashboard. A identidade vem da sessão assinada pelo backend (nunca de parâmetros do
 * navegador): cada colaborador só vê os próprios negócios.
 */
export async function journeyRoutes(
  app: FastifyInstance,
  options: { store: Store; signer: SessionSigner; now?: () => Date },
) {
  const now = options.now ?? (() => new Date());

  app.get("/api/v1/journey", async (request, reply) => {
    const session = sessionFromRequest(request, options.signer);
    if (!session) return reply.code(401).send({ error: "Sessão inválida ou expirada" });
    const tenant = await options.store.tenants.findById(session.tenantId);
    if (!tenant) return reply.code(401).send({ error: "Empresa não encontrada" });
    if (!inPilot(tenant, session.userId)) {
      return reply.code(403).send({ error: "Workspace em piloto: indisponível para este usuário" });
    }

    const generatedAt = now();
    // No modo de observação, o usuário do piloto vê os negócios do colaborador observado.
    const journey = await buildJourney(
      options.store,
      tenant,
      subjectOf(tenant, session.userId),
      generatedAt,
    );
    const response: JourneyResponse = { ...journey, generatedAt: generatedAt.toISOString() };
    return reply.header("Cache-Control", "no-store").send(response);
  });

  /** Histórico auditável de uma ocorrência (só do próprio colaborador ou de admin). */
  app.get<{ Params: { dealId: string } }>(
    "/api/v1/deals/:dealId/history",
    async (request, reply) => {
      const session = sessionFromRequest(request, options.signer);
      if (!session) return reply.code(401).send({ error: "Sessão inválida ou expirada" });
      const tenant = await options.store.tenants.findById(session.tenantId);
      if (!tenant || !inPilot(tenant, session.userId)) {
        return reply
          .code(403)
          .send({ error: "Workspace em piloto: indisponível para este usuário" });
      }
      const deal = await options.store.deals.get(session.tenantId, request.params.dealId);
      if (!deal || (!session.admin && deal.assignedById !== subjectOf(tenant, session.userId))) {
        return reply.code(404).send({ error: "Negócio não encontrado" });
      }
      const occurrences = await options.store.occurrences.listForDeals(
        session.tenantId,
        [deal.dealId],
        new Date(0),
      );
      const history = await Promise.all(
        occurrences.map(async (occurrence) => ({
          occurrence,
          events: await options.store.occurrences.listEvents(occurrence.id),
        })),
      );
      return reply.header("Cache-Control", "no-store").send({ dealId: deal.dealId, history });
    },
  );
}
