/**
 * Recarrega `tenants/<domínio>.json` (configuração e regras) no banco das empresas já instaladas,
 * sem reinstalar o aplicativo no portal. Depois, reinicie o servidor para uma sincronização completa.
 *
 * Uso: pnpm --filter @projacseg/api tenants:reload
 */
import { loadTenantFile } from "../src/modules/tenants/tenant-config";
import { createPrismaStore } from "../src/store/prisma-store";

try {
  process.loadEnvFile();
} catch {
  // Sem .env: usa o ambiente atual.
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definido.");
const dir = process.env.TENANTS_DIR ?? "./tenants";
const store = createPrismaStore(url);
for (const tenant of await store.tenants.list()) {
  const file = await loadTenantFile(dir, tenant.domain);
  if (!file) {
    console.log(`${tenant.domain}: sem arquivo de configuração, nada alterado.`);
    continue;
  }
  await store.tenants.update(tenant.id, { config: file.config });
  await store.rules.replaceAll(tenant.id, file.rules);
  const shadow = file.rules.filter((rule) => (rule.mode ?? "shadow") === "shadow").length;
  console.log(`${tenant.domain}: ${file.rules.length} regras (${shadow} em sombra) recarregadas.`);
}
await store.close();
