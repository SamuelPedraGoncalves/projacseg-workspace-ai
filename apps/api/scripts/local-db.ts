/**
 * PostgreSQL local sem Docker, para testes nesta máquina: PGlite (Postgres em WebAssembly) servido
 * pelo protocolo de rede em 127.0.0.1, com os dados gravados em disco (`data/private/pglite`, fora do
 * Git). Aplica as migrações versionadas que ainda não foram aplicadas.
 *
 * Uso: pnpm --filter @projacseg/api db:local   → DATABASE_URL do .env.example não muda (porta 5432),
 * mas use `postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable`.
 *
 * Não é para produção: um processo, poucas conexões, sem backup.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const dataDir = resolve(root, process.env.LOCAL_DB_DIR ?? "data/private/pglite");
const migrationsDir = resolve(import.meta.dirname, "../prisma/migrations");
const port = Number(process.env.LOCAL_DB_PORT ?? 5432);

mkdirSync(dataDir, { recursive: true });
const db = new PGlite(dataDir);
await db.exec(
  `CREATE TABLE IF NOT EXISTS "_local_migrations" (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
);
const applied = new Set(
  (await db.query<{ name: string }>(`SELECT name FROM "_local_migrations"`)).rows.map(
    (row) => row.name,
  ),
);
for (const name of readdirSync(migrationsDir)
  .filter((item) => /^\d{14}_/.test(item))
  .sort()) {
  if (applied.has(name)) continue;
  await db.transaction(async (tx) => {
    await tx.exec(readFileSync(resolve(migrationsDir, name, "migration.sql"), "utf8"));
    await tx.query(`INSERT INTO "_local_migrations" (name) VALUES ($1)`, [name]);
  });
  console.log(`Migração aplicada: ${name}`);
}

const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port, maxConnections: 10 });
await server.start();
console.log(`PostgreSQL local (PGlite) pronto em 127.0.0.1:${port} — dados em ${dataDir}`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
