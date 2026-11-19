import type { SetupStatus, SetupStep, TermsDocument } from "@projacseg/shared";
import type { FastifyInstance } from "fastify";
import type { SessionSigner } from "../../security/session";
import type { Store, TenantRecord } from "../../store/types";
import { requireSession, type Access } from "./access";
import { CURRENT_TERMS, PRIVACY_NOTICE, termsAccepted } from "./terms";

export interface SetupRoutesOptions {
  store: Store;
  signer: SessionSigner;
  /** Termos vigentes (os testes injetam uma versão nova). */
  terms?: TermsDocument;
  now?: () => Date;
}

function nextStep(tenant: TenantRecord, access: Access, accepted: boolean): SetupStep {
  const pending: SetupStep | null = !accepted
    ? "terms"
    : !tenant.config.setup?.editorsConfirmedAt
      ? "editors"
      : !tenant.config.setup?.mappingConfirmedAt
        ? "mapping"
        : null;
  if (!pending) return "done";
  return access.admin ? pending : "waiting_admin";
}

/**
 * Primeiro acesso e Configurações. A identidade vem da sessão assinada; a autorização (quem é
 * administrador, quem cria regras) é decidida aqui, nunca pelo navegador.
 */
export async function setupRoutes(app: FastifyInstance, options: SetupRoutesOptions) {
  const terms = options.terms ?? CURRENT_TERMS;
  const now = options.now ?? (() => new Date());
  const deps = { store: options.store, signer: options.signer };

  app.get("/api/v1/setup", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    const accepted = await termsAccepted(options.store, auth.tenant, terms);
    const notice = await options.store.consents.latest(
      auth.tenant.id,
      "privacy_notice",
      auth.session.userId,
    );
    const status: SetupStatus = {
      step: nextStep(auth.tenant, auth.access, accepted),
      access: auth.access,
      terms: { version: terms.version, provisional: terms.provisional, accepted },
      privacyNoticePending: !auth.access.admin && notice?.version !== PRIVACY_NOTICE.version,
    };
    return reply.header("Cache-Control", "no-store").send(status);
  });

  app.get("/api/v1/setup/terms", async (request, reply) => {
    if (!(await requireSession(request, reply, deps))) return reply;
    return reply.send(terms);
  });

  app.get("/api/v1/setup/privacy-notice", async (request, reply) => {
    if (!(await requireSession(request, reply, deps))) return reply;
    return reply.send(PRIVACY_NOTICE);
  });

  app.post<{ Body: { version?: unknown } }>(
    "/api/v1/setup/terms/accept",
    async (request, reply) => {
      const auth = await requireSession(request, reply, deps);
      if (!auth) return reply;
      if (!auth.access.admin) {
        return reply.code(403).send({ error: "Só o administrador aceita os termos." });
      }
      if (request.body?.version !== terms.version) {
        return reply
          .code(409)
          .send({ error: "Os termos mudaram. Leia a versão atual antes de aceitar." });
      }
      await options.store.consents.append({
        tenantId: auth.tenant.id,
        userId: auth.session.userId,
        kind: "terms",
        version: terms.version,
        provisional: terms.provisional,
        acceptedAt: now(),
      });
      // O aceite é o que autoriza a IA para a corretora.
      await options.store.tenants.update(auth.tenant.id, {
        config: { ...auth.tenant.config, aiEnabled: true },
      });
      request.log.info(
        { tenantId: auth.tenant.id, userId: auth.session.userId, version: terms.version },
        "Termos aceitos.",
      );
      return reply.send({ ok: true });
    },
  );

  app.post("/api/v1/setup/privacy-notice/seen", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    await options.store.consents.append({
      tenantId: auth.tenant.id,
      userId: auth.session.userId,
      kind: "privacy_notice",
      version: PRIVACY_NOTICE.version,
      provisional: PRIVACY_NOTICE.provisional,
      acceptedAt: now(),
    });
    return reply.send({ ok: true });
  });
}
