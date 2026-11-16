import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply } from "fastify";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Prefixos que nunca caem no fallback do SPA. */
const API_PREFIXES = ["/health", "/bitrix24/"];

/**
 * Serve o build do frontend como aplicativo Bitrix24.
 *
 * O Bitrix24 abre o aplicativo (handler e instalação) com **POST** na URL configurada, enviando a
 * autenticação no corpo. A aplicação ignora esse corpo (a BX24 JS SDK autentica no navegador) e só
 * devolve o `index.html`. GETs de rotas do SPA (/em-risco, /install…) também recebem o `index.html`.
 */
export async function registerWebApp(
  app: FastifyInstance,
  options: { distDir: string; allowedDomains: string[] },
) {
  const indexFile = join(options.distDir, "index.html");
  if (!existsSync(indexFile)) {
    app.log.warn(`Frontend não encontrado em ${options.distDir}. Rode "pnpm build" antes.`);
    return;
  }

  // Só os portais autorizados podem embutir a aplicação em iframe.
  const frameAncestors = options.allowedDomains.map((domain) => `https://${domain}`).join(" ");
  app.addHook("onSend", async (_request, reply, payload) => {
    const type = String(reply.getHeader("content-type") ?? "");
    if (type.startsWith("text/html")) {
      reply.header("Cache-Control", "no-cache");
      reply.header("Content-Security-Policy", `frame-ancestors 'self' ${frameAncestors}`.trim());
    }
    return payload;
  });

  await app.register(fastifyStatic, { root: options.distDir, prefix: "/", wildcard: true });

  const sendIndex = (reply: FastifyReply) =>
    reply.type("text/html; charset=utf-8").sendFile("index.html");

  app.post("/", async (_request, reply) => sendIndex(reply));

  app.setNotFoundHandler(async (request, reply) => {
    const path = request.url.split("?")[0] ?? "/";
    const isApi = API_PREFIXES.some((prefix) => path.startsWith(prefix));
    const isAsset = /\.[a-z0-9]+$/i.test(path);
    if ((request.method === "GET" || request.method === "POST") && !isApi && !isAsset) {
      return sendIndex(reply);
    }
    return reply.code(404).send({ error: "Não encontrado" });
  });
}
