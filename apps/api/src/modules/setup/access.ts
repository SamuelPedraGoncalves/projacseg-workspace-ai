import type { FastifyReply, FastifyRequest } from "fastify";
import { sessionFromRequest, type SessionClaims, type SessionSigner } from "../../security/session";
import type { Store, TenantRecord } from "../../store/types";
import { inPilot, pilotUsers } from "../tenants/pilot";
import { licensed } from "./license";

/** O que o usuário pode fazer no WorkSeg. `settings`: vê a área Configurações. */
export interface Access {
  admin: boolean;
  ruleEditor: boolean;
  settings: boolean;
}

/**
 * Administrador: quem instalou o app. No modo piloto, os usuários do piloto (é com eles que se
 * testa num portal real). Criador de regras: o administrador e quem ele escolheu.
 */
export async function resolveAccess(
  store: Store,
  tenant: TenantRecord,
  userId: string,
): Promise<Access> {
  const pilot = pilotUsers(tenant);
  const admin = pilot
    ? pilot.includes(userId)
    : Boolean(tenant.installedByUserId) && tenant.installedByUserId === userId;
  const ruleEditor =
    admin ||
    (await store.roles.list(tenant.id)).some(
      (role) => role.role === "rule_editor" && role.userId === userId,
    );
  return { admin, ruleEditor, settings: ruleEditor };
}

export interface AuthorizedRequest {
  tenant: TenantRecord;
  session: SessionClaims;
  access: Access;
}

/**
 * Sessão válida, empresa existente, usuário no piloto e corretora liberada. Se algo falhar, já
 * responde (401, 402 ou 403) e devolve `null`.
 */
export async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: { store: Store; signer: SessionSigner },
): Promise<AuthorizedRequest | null> {
  const session = sessionFromRequest(request, deps.signer);
  if (!session) {
    await reply.code(401).send({ error: "Sessão inválida ou expirada" });
    return null;
  }
  const tenant = await deps.store.tenants.findById(session.tenantId);
  if (!tenant) {
    await reply.code(401).send({ error: "Empresa não encontrada" });
    return null;
  }
  if (!inPilot(tenant, session.userId)) {
    await reply.code(403).send({ error: "WorkSeg em piloto: indisponível para este usuário" });
    return null;
  }
  if (!licensed(tenant)) {
    await reply.code(402).send({ error: "Assinatura pendente" });
    return null;
  }
  return { tenant, session, access: await resolveAccess(deps.store, tenant, session.userId) };
}
