import { businessCalendarSchema } from "@projacseg/engine";
import type {
  CalendarView,
  CompanyCalendar,
  DepartmentNode,
  MappingCatalog,
  MappingInput,
  MappingView,
  PortalUserRef,
  SetupStatus,
  SetupStep,
  TermsDocument,
} from "@projacseg/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SessionSigner } from "../../security/session";
import type { Store, TenantRecord } from "../../store/types";
import { keepRecurringStillPresent } from "../tenants/calendar";
import { pilotUsers } from "../tenants/pilot";
import { requireSession, type Access } from "./access";
import { suggestMapping, validateMapping } from "./mapping";
import { CURRENT_TERMS, PRIVACY_NOTICE, termsAccepted } from "./terms";

const editorsSchema = z.object({
  editors: z
    .array(
      z.object({
        id: z.string().regex(/^\d+$/),
        name: z.string().trim().min(1).max(120),
      }),
    )
    .max(50),
});

export interface SetupRoutesOptions {
  store: Store;
  signer: SessionSigner;
  /** Termos vigentes (os testes injetam uma versão nova). */
  terms?: TermsDocument;
  now?: () => Date;
  /** Funis e campos do portal, lidos na hora (o mapeamento precisa ver campos recém-criados). */
  catalog?: (tenant: TenantRecord) => Promise<MappingCatalog>;
  /** Mapeamento salvo: recarregar o catálogo do CRM e ressincronizar os negócios. */
  onMappingSaved?: (tenant: TenantRecord) => void;
  /** Lê o calendário da empresa no Bitrix24. */
  readCalendar?: (
    tenant: TenantRecord,
  ) => Promise<{ calendar: CompanyCalendar; recurringHolidays: string[] }>;
  /** Lê a estrutura da empresa no Bitrix24. */
  readStructure?: (tenant: TenantRecord) => Promise<DepartmentNode[]>;
}

function currentMapping(tenant: TenantRecord): MappingInput | null {
  const { fieldMapping, situations } = tenant.config;
  if (!situations || !fieldMapping.insuranceType || !fieldMapping.branch) return null;
  return {
    fieldMapping: {
      ...fieldMapping,
      insuranceType: fieldMapping.insuranceType,
      branch: fieldMapping.branch,
    },
    situations,
  };
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

  /** Quem o administrador escolheu para criar regras (o próprio administrador fica implícito). */
  app.get("/api/v1/setup/editors", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.settings)
      return reply.code(403).send({ error: "Sem acesso a Configurações." });
    const editors: PortalUserRef[] = (await options.store.roles.list(auth.tenant.id))
      .filter((role) => role.role === "rule_editor")
      .map((role) => ({ id: role.userId, name: role.userName }));
    return reply.header("Cache-Control", "no-store").send({ editors });
  });

  app.put<{ Body: unknown }>("/api/v1/setup/editors", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.admin) {
      return reply.code(403).send({ error: "Só o administrador escolhe quem cria regras." });
    }
    const parsed = editorsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Lista de usuários inválida." });
    }
    const at = now();
    await options.store.roles.replace(
      auth.tenant.id,
      "rule_editor",
      parsed.data.editors.map((user) => ({ userId: user.id, userName: user.name })),
      auth.session.userId,
      at,
    );
    await options.store.tenants.update(auth.tenant.id, {
      config: {
        ...auth.tenant.config,
        setup: { ...auth.tenant.config.setup, editorsConfirmedAt: at.toISOString() },
      },
    });
    return reply.send({ ok: true });
  });

  /**
   * Um administrador do portal Bitrix24 assume a administração do WorkSeg (quando quem instalou
   * saiu da empresa). Fora do modo piloto, onde os administradores são os usuários do piloto.
   */
  app.post("/api/v1/setup/claim-admin", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.session.admin || pilotUsers(auth.tenant)) {
      return reply
        .code(403)
        .send({ error: "Só um administrador do portal Bitrix24 pode assumir a administração." });
    }
    await options.store.tenants.update(auth.tenant.id, { installedByUserId: auth.session.userId });
    request.log.info(
      {
        tenantId: auth.tenant.id,
        from: auth.tenant.installedByUserId ?? null,
        to: auth.session.userId,
      },
      "Administração do WorkSeg assumida por administrador do portal.",
    );
    return reply.send({ ok: true });
  });

  app.get("/api/v1/setup/mapping", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.settings)
      return reply.code(403).send({ error: "Sem acesso a Configurações." });
    if (!options.catalog) return reply.code(503).send({ error: "Leitura do CRM indisponível." });
    const catalog = await options.catalog(auth.tenant);
    const view: MappingView = {
      catalog,
      current: currentMapping(auth.tenant),
      suggestion: suggestMapping(catalog),
      confirmed: Boolean(auth.tenant.config.setup?.mappingConfirmedAt),
    };
    return reply.header("Cache-Control", "no-store").send(view);
  });

  app.put<{ Body: unknown }>("/api/v1/setup/mapping", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.settings)
      return reply.code(403).send({ error: "Sem acesso a Configurações." });
    if (!options.catalog) return reply.code(503).send({ error: "Leitura do CRM indisponível." });
    const result = validateMapping(request.body, await options.catalog(auth.tenant));
    if (!result.ok) return reply.code(400).send({ errors: result.errors });
    const updated = await options.store.tenants.update(auth.tenant.id, {
      config: {
        ...auth.tenant.config,
        fieldMapping: result.value.fieldMapping,
        situations: result.value.situations,
        setup: { ...auth.tenant.config.setup, mappingConfirmedAt: now().toISOString() },
      },
    });
    options.onMappingSaved?.(updated);
    return reply.send({ ok: true });
  });

  const calendarView = (tenant: TenantRecord): CalendarView => ({
    calendar: tenant.config.calendar,
    source: tenant.config.setup?.calendarSource ?? "default",
  });

  app.get("/api/v1/setup/calendar", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.settings)
      return reply.code(403).send({ error: "Sem acesso a Configurações." });
    return reply.header("Cache-Control", "no-store").send(calendarView(auth.tenant));
  });

  /** Relê o calendário do Bitrix24 (expediente, folgas e feriados). */
  app.post("/api/v1/setup/calendar/import", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.settings)
      return reply.code(403).send({ error: "Sem acesso a Configurações." });
    if (!options.readCalendar)
      return reply.code(503).send({ error: "Leitura do portal indisponível." });
    let read: { calendar: CompanyCalendar; recurringHolidays: string[] };
    try {
      read = await options.readCalendar(auth.tenant);
    } catch (error) {
      request.log.warn({ err: error }, "Calendário não lido do Bitrix24.");
      return reply.code(502).send({
        error:
          "Não foi possível ler o calendário da empresa no Bitrix24. Confira se o app tem a permissão de calendário.",
      });
    }
    const updated = await options.store.tenants.update(auth.tenant.id, {
      config: {
        ...auth.tenant.config,
        calendar: read.calendar,
        recurringHolidays: read.recurringHolidays,
        setup: { ...auth.tenant.config.setup, calendarSource: "bitrix24" },
      },
    });
    return reply.send(calendarView(updated));
  });

  /** Ajuste manual: passa a valer no lugar do calendário do Bitrix24. */
  app.put<{ Body: unknown }>("/api/v1/setup/calendar", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.settings)
      return reply.code(403).send({ error: "Sem acesso a Configurações." });
    const parsed = businessCalendarSchema.safeParse(request.body);
    if (!parsed.success || parsed.data.workEnd <= parsed.data.workStart) {
      return reply.code(400).send({ error: "Calendário inválido." });
    }
    const updated = await options.store.tenants.update(auth.tenant.id, {
      config: {
        ...auth.tenant.config,
        calendar: parsed.data,
        recurringHolidays: keepRecurringStillPresent(
          auth.tenant.config.recurringHolidays ?? [],
          parsed.data.holidays,
          now(),
        ),
        setup: { ...auth.tenant.config.setup, calendarSource: "manual" },
      },
    });
    return reply.send(calendarView(updated));
  });

  app.get("/api/v1/setup/structure", async (request, reply) => {
    const auth = await requireSession(request, reply, deps);
    if (!auth) return reply;
    if (!auth.access.settings)
      return reply.code(403).send({ error: "Sem acesso a Configurações." });
    if (!options.readStructure)
      return reply.code(503).send({ error: "Leitura do portal indisponível." });
    try {
      const departments = await options.readStructure(auth.tenant);
      return reply.header("Cache-Control", "no-store").send({ source: "bitrix24", departments });
    } catch (error) {
      request.log.warn({ err: error }, "Estrutura da empresa não lida do Bitrix24.");
      return reply
        .code(502)
        .send({ error: "Não foi possível ler a estrutura da empresa no Bitrix24." });
    }
  });

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
