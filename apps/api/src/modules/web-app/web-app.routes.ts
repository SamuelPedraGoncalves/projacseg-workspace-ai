import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BitrixAppService, FrameRequest } from "../bitrix-app/bitrix-app.service";

/** Prefixos que nunca caem no fallback do SPA. */
const API_PREFIXES = ["/health", "/bitrix24/", "/api/"];

function frameFrom(request: FastifyRequest): FrameRequest {
  const query = (request.query ?? {}) as Record<string, string | undefined>;
  const body = (typeof request.body === "object" && request.body ? request.body : {}) as Record<
    string,
    string | undefined
  >;
  return {
    domain: query.DOMAIN,
    authId: body.AUTH_ID,
    refreshId: body.REFRESH_ID,
    authExpires: body.AUTH_EXPIRES,
    memberId: body.member_id,
  };
}

const escapeAttr = (value: string) =>
  value.replace(/[&"<>]/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Serve o build do frontend como aplicativo Bitrix24.
 *
 * O Bitrix24 abre o aplicativo (handler e instalação) com **POST**, enviando a autenticação no corpo.
 * O backend valida essa autenticação no portal e devolve o `index.html` com uma sessão assinada do
 * Workspace numa meta tag; os tokens do Bitrix24 nunca chegam ao navegador.
 */
export async function registerWebApp(
  app: FastifyInstance,
  options: { distDir: string; allowedDomains: string[]; bitrixApp?: BitrixAppService },
) {
  const indexFile = join(options.distDir, "index.html");
  if (!existsSync(indexFile)) {
    app.log.warn(`Frontend não encontrado em ${options.distDir}. Rode "pnpm build" antes.`);
    return;
  }
  const indexHtml = readFileSync(indexFile, "utf8");

  const frameAncestors = options.allowedDomains.map((domain) => `https://${domain}`).join(" ");
  app.addHook("onSend", async (_request, reply, payload) => {
    const type = String(reply.getHeader("content-type") ?? "");
    if (type.startsWith("text/html")) {
      reply.header("Cache-Control", "no-store");
      reply.header("Content-Security-Policy", `frame-ancestors 'self' ${frameAncestors}`.trim());
    }
    return payload;
  });

  await app.register(fastifyStatic, { root: options.distDir, prefix: "/", wildcard: true });

  const sendIndex = (reply: FastifyReply, session: string | null = null) => {
    const html = session
      ? indexHtml.replace(
          "</head>",
          `<meta name="workspace-session" content="${escapeAttr(session)}" />\n</head>`,
        )
      : indexHtml;
    return reply.type("text/html; charset=utf-8").send(html);
  };

  const handleFrame =
    (kind: "open" | "install") => async (request: FastifyRequest, reply: FastifyReply) => {
      let session: string | null = null;
      if (options.bitrixApp) {
        try {
          session =
            kind === "install"
              ? await options.bitrixApp.install(
                  frameFrom(request),
                  `${request.protocol}://${request.host}`,
                )
              : await options.bitrixApp.open(frameFrom(request));
        } catch (error) {
          request.log.error(
            { err: error },
            kind === "install" ? "Falha na instalação." : "Falha ao abrir.",
          );
        }
      }
      return sendIndex(reply, session);
    };

  app.post("/", handleFrame("open"));
  app.post("/install", handleFrame("install"));

  app.setNotFoundHandler(async (request, reply) => {
    const path = request.url.split("?")[0] ?? "/";
    const isApi = API_PREFIXES.some((prefix) => path.startsWith(prefix));
    const isAsset = /\.[a-z0-9]+$/i.test(path);
    if (request.method === "GET" && !isApi && !isAsset) return sendIndex(reply);
    if (request.method === "POST" && !isApi && !isAsset) return handleFrame("open")(request, reply);
    return reply.code(404).send({ error: "Não encontrado" });
  });
}
