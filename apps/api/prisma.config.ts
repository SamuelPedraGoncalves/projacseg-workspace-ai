import { defineConfig } from "prisma/config";

// DATABASE_URL vem do ambiente (apps/api/.env). O fallback só permite `prisma generate` sem banco.
try {
  process.loadEnvFile();
} catch {
  // sem .env
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
});
