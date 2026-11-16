import type { FastifyBaseLogger } from "fastify";
import type { Store, TenantRecord } from "../../store/types";
import type { DigestService } from "./digest.service";
import type { EngineService } from "./engine.service";

interface SchedulerOptions {
  tickMs: number;
  fullSyncMs: number;
}

/**
 * Agendador em processo: a cada `tickMs` avança prazos/escalonamentos e envia resumos; a cada
 * `fullSyncMs` ressincroniza o CRM inteiro (rede de segurança caso um evento se perca).
 * Interface simples para trocar por BullMQ/Redis quando houver mais de uma instância.
 */
export class EngineScheduler {
  private timer: NodeJS.Timeout | undefined;
  private readonly running = new Set<string>();
  private readonly lastFullSync = new Map<string, number>();

  constructor(
    private readonly store: Store,
    private readonly engine: EngineService,
    private readonly digest: DigestService,
    private readonly log: Pick<FastifyBaseLogger, "info" | "error">,
    private readonly options: SchedulerOptions,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.runOnce(), this.options.tickMs);
    this.timer.unref();
    void this.runOnce();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce(now = Date.now()): Promise<void> {
    const tenants = await this.store.tenants.list();
    await Promise.all(
      tenants
        .filter((tenant) => tenant.accessTokenEnc)
        .map((tenant) => this.runTenant(tenant, now)),
    );
  }

  private async runTenant(tenant: TenantRecord, now: number): Promise<void> {
    if (this.running.has(tenant.id)) return;
    this.running.add(tenant.id);
    try {
      const last = this.lastFullSync.get(tenant.id) ?? 0;
      if (now - last >= this.options.fullSyncMs) {
        const { deals } = await this.engine.fullSync(tenant);
        this.lastFullSync.set(tenant.id, now);
        this.log.info({ tenant: tenant.domain, deals }, "Sincronização completa do CRM.");
      } else {
        await this.engine.tick(tenant);
      }
      await this.digest.run(tenant);
    } catch (error) {
      this.log.error({ err: error, tenant: tenant.domain }, "Falha no ciclo do motor.");
    } finally {
      this.running.delete(tenant.id);
    }
  }

  /** Força nova sincronização completa no próximo ciclo (ex.: após instalação). */
  requestFullSync(tenantId: string): void {
    this.lastFullSync.delete(tenantId);
  }
}
