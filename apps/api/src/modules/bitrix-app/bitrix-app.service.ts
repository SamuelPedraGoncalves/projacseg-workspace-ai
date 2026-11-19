import type { FastifyBaseLogger } from "fastify";
import type { AssistantBot } from "../../integrations/bitrix24/bot-messenger";
import type { CrmReader } from "../../integrations/bitrix24/crm-reader";
import type { Bitrix24Portal } from "../../integrations/bitrix24/portal";
import type { Bitrix24RestClient } from "../../integrations/bitrix24/rest-client";
import type { SessionSigner } from "../../security/session";
import type { Store, TenantRecord } from "../../store/types";
import { inPilot } from "../tenants/pilot";
import { DEFAULT_TENANT_CONFIG, loadTenantFile, writeCatalogFile } from "../tenants/tenant-config";

/** Colaborador fora do modo piloto: o aplicativo mostra um aviso, sem sessão. */
export const PILOT_RESTRICTED = { restricted: true } as const;

/** Campos que o Bitrix24 envia no POST ao abrir ou instalar o aplicativo. */
export interface FrameRequest {
  domain: string | undefined;
  authId: string | undefined;
  refreshId: string | undefined;
  authExpires: string | undefined;
  memberId: string | undefined;
}

interface Deps {
  store: Store;
  rest: Bitrix24RestClient;
  portal: Bitrix24Portal;
  crm: CrmReader;
  signer: SessionSigner;
  allowedDomains: string[];
  /** Quando informado, o AUTH_ID precisa pertencer a este aplicativo (app.info → CODE). */
  clientId: string | undefined;
  tenantsDir: string;
  /** Bot do assistente (imbot.v2), registrado na instalação. */
  assistantBot?: AssistantBot;
  log: Pick<FastifyBaseLogger, "info" | "warn" | "error">;
  onInstalled?: (tenant: TenantRecord) => void;
}

const CRM_EVENTS = ["ONCRMDEALADD", "ONCRMDEALUPDATE", "ONCRMDEALDELETE"];

/**
 * Abertura e instalação do aplicativo. O AUTH_ID do POST é validado no próprio portal e nunca é
 * repassado ao navegador: o navegador recebe só uma sessão assinada do Workspace.
 */
export class BitrixAppService {
  constructor(private readonly deps: Deps) {}

  private async verifyFrame(domain: string, authId: string) {
    const endpoint = `https://${domain}/rest/`;
    const [app, user, admin] = await Promise.all([
      this.deps.rest.call<{ CODE?: string }>(endpoint, "app.info", {}, authId),
      this.deps.rest.call<{ ID: string; NAME?: string; LAST_NAME?: string }>(
        endpoint,
        "user.current",
        {},
        authId,
      ),
      this.deps.rest.call<boolean>(endpoint, "user.admin", {}, authId),
    ]);
    if (this.deps.clientId && app.result.CODE !== this.deps.clientId) {
      throw new Error("AUTH_ID não pertence a este aplicativo.");
    }
    return {
      endpoint,
      userId: String(user.result.ID),
      name: user.result.NAME?.trim() || "Colaborador",
      admin: admin.result === true,
    };
  }

  private allowed(domain: string | undefined): domain is string {
    return Boolean(domain && this.deps.allowedDomains.includes(domain.toLowerCase()));
  }

  /**
   * Abertura pelo menu do Bitrix24: devolve a sessão do colaborador, `PILOT_RESTRICTED` se ele está
   * fora do modo piloto, ou `null`.
   */
  async open(frame: FrameRequest): Promise<string | typeof PILOT_RESTRICTED | null> {
    if (!this.allowed(frame.domain) || !frame.authId || !frame.memberId) return null;
    const tenant = await this.deps.store.tenants.findByMemberId(frame.memberId);
    if (!tenant || tenant.domain !== frame.domain.toLowerCase()) return null;
    try {
      const who = await this.verifyFrame(tenant.domain, frame.authId);
      if (!inPilot(tenant, who.userId)) return PILOT_RESTRICTED;
      return this.deps.signer.issue({
        tenantId: tenant.id,
        userId: who.userId,
        name: who.name,
        admin: who.admin,
      });
    } catch (error) {
      this.deps.log.warn(
        { err: error, domain: frame.domain },
        "Abertura sem sessão: AUTH_ID não validado.",
      );
      return null;
    }
  }

  /**
   * Instalação: guarda os tokens do aplicativo (criptografados) para o motor trabalhar sem ninguém
   * logado, liga os eventos de negócios, carrega as regras da empresa e devolve a sessão do admin.
   */
  async install(frame: FrameRequest, publicUrl: string): Promise<string | null> {
    if (!this.allowed(frame.domain) || !frame.authId || !frame.refreshId || !frame.memberId) {
      this.deps.log.warn(
        {
          domain: frame.domain,
          allowedDomain: this.allowed(frame.domain),
          hasAuth: Boolean(frame.authId),
          hasRefresh: Boolean(frame.refreshId),
          hasMemberId: Boolean(frame.memberId),
        },
        "Instalação recusada: portal não autorizado ou autenticação incompleta.",
      );
      return null;
    }
    const domain = frame.domain.toLowerCase();
    const who = await this.verifyFrame(domain, frame.authId);
    if (!who.admin)
      throw new Error("A instalação precisa ser feita por um administrador do portal.");

    const existing = await this.deps.store.tenants.findByMemberId(frame.memberId);
    const file = await loadTenantFile(this.deps.tenantsDir, domain);
    const base = file?.config ?? existing?.config ?? DEFAULT_TENANT_CONFIG;
    // O que a corretora configurou pela tela (mapeamento, situações, primeiro acesso) sobrevive
    // à reinstalação, mesmo que exista arquivo da empresa.
    const configured = existing?.config;
    const config = {
      ...base,
      ...(configured?.setup?.mappingConfirmedAt
        ? {
            fieldMapping: configured.fieldMapping,
            ...(configured.situations ? { situations: configured.situations } : {}),
          }
        : {}),
      ...(configured?.setup ? { setup: configured.setup } : {}),
    };
    let tenant = await this.deps.store.tenants.upsert({
      domain,
      memberId: frame.memberId,
      clientEndpoint: who.endpoint,
      applicationToken: existing?.applicationToken ?? null,
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
      // Administrador do WorkSeg: quem instalou pela primeira vez.
      installedByUserId: existing?.installedByUserId ?? who.userId,
      config,
    });
    tenant = await this.deps.portal.saveTokens(tenant, {
      accessToken: frame.authId,
      refreshToken: frame.refreshId,
      expiresAt: new Date(Date.now() + Number(frame.authExpires ?? 3600) * 1000),
    });
    if (file) await this.deps.store.rules.replaceAll(tenant.id, file.rules);

    const handler = `${publicUrl}/bitrix24/events/crm`;
    for (const event of CRM_EVENTS) {
      try {
        await this.deps.portal.call(tenant, "event.bind", { event, handler });
      } catch (error) {
        // "Handler already binded" em reinstalações não é erro.
        if (!(error instanceof Error && /already/i.test(error.message))) throw error;
      }
    }

    // O Workspace funciona sem o assistente: falha no registro do bot não interrompe a instalação.
    let assistant: "ready" | "failed" = "failed";
    if (this.deps.assistantBot) {
      try {
        await this.deps.assistantBot.register(tenant, `${publicUrl}/bitrix24/events/assistant`);
        assistant = "ready";
      } catch (error) {
        this.deps.log.warn({ err: error, domain }, "Bot do assistente não registrado.");
      }
    }

    try {
      await writeCatalogFile(
        this.deps.tenantsDir,
        domain,
        await this.deps.crm.catalog(tenant, true),
      );
    } catch (error) {
      this.deps.log.warn({ err: error }, "Não foi possível gravar o catálogo de pipelines.");
    }

    this.deps.log.info(
      { domain, rules: file?.rules.length ?? 0, configFile: Boolean(file), assistant },
      "Aplicativo instalado no portal.",
    );
    this.deps.onInstalled?.(tenant);
    return this.deps.signer.issue({
      tenantId: tenant.id,
      userId: who.userId,
      name: who.name,
      admin: true,
    });
  }
}
