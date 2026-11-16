import { buildApp } from "./app";
import { loadEnv } from "./config/env";

// Carrega apps/api/.env quando existir (Node 22+). Variáveis já definidas no ambiente prevalecem.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: segue com o ambiente atual.
}

const env = loadEnv();
const app = await buildApp(env);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
