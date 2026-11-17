import { z } from "zod";
import type { Store, TenantRecord } from "../../store/types";

/**
 * Bloco `auth` dos eventos. Eventos de CRM trazem `access_token`; os do bot v2 (`ONIMBOTV2*`) não —
 * o servidor nunca usa esse token: responde com os tokens do aplicativo guardados na instalação.
 */
export const eventAuthSchema = z.object({
  access_token: z.string().min(1).optional(),
  domain: z.string().min(1),
  client_endpoint: z.string().min(1),
  member_id: z.string().min(1),
  application_token: z.string().min(1),
});

export type EventAuth = z.infer<typeof eventAuthSchema>;

export type VerifyResult =
  { ok: true; tenant: TenantRecord | null } | { ok: false; status: 403; error: string };

/**
 * Confere eventos enviados pelo Bitrix24 (bot e CRM):
 * - portal na lista BITRIX24_ALLOWED_DOMAINS;
 * - `client_endpoint` exatamente `https://<domínio>/rest/` (o servidor nunca chama outro endereço);
 * - `application_token` igual ao fixado por variável ou ao memorizado no primeiro evento do portal
 *   (gravado no cadastro da empresa quando ela existe).
 */
export class PortalEventVerifier {
  private readonly firstSeen = new Map<string, string>();

  constructor(
    private readonly store: Store,
    private readonly allowedDomains: string[],
    private readonly pinnedToken: string | undefined,
  ) {}

  async verify(auth: EventAuth): Promise<VerifyResult> {
    const domain = auth.domain.toLowerCase();
    if (!this.allowedDomains.includes(domain)) {
      return { ok: false, status: 403, error: "Portal não autorizado" };
    }
    if (auth.client_endpoint !== `https://${domain}/rest/`) {
      return { ok: false, status: 403, error: "Endpoint inválido" };
    }
    const tenant = await this.store.tenants.findByMemberId(auth.member_id);
    if (tenant && tenant.domain !== domain) {
      return { ok: false, status: 403, error: "Portal não corresponde ao cadastro" };
    }

    const expected =
      this.pinnedToken ?? tenant?.applicationToken ?? this.firstSeen.get(auth.member_id);
    if (expected && expected !== auth.application_token) {
      return { ok: false, status: 403, error: "Token da aplicação inválido" };
    }
    if (!expected) {
      if (tenant) {
        return {
          ok: true,
          tenant: await this.store.tenants.update(tenant.id, {
            applicationToken: auth.application_token,
          }),
        };
      }
      this.firstSeen.set(auth.member_id, auth.application_token);
    }
    return { ok: true, tenant };
  }
}
