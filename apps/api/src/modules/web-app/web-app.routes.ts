import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PILOT_RESTRICTED,
  type BitrixAppService,
  type FrameRequest,
} from "../bitrix-app/bitrix-app.service";

/** Prefixos que nunca caem no fallback do SPA. */
const API_PREFIXES = ["/health", "/bitrix24/", "/api/"];

const text = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

/**
 * Autenticação enviada pelo Bitrix24 ao abrir ou instalar o aplicativo, em dois formatos:
 * - navegador (iframe): `AUTH_ID`, `REFRESH_ID`, `AUTH_EXPIRES`, `member_id` no corpo e `DOMAIN` na URL;
 * - servidor do Bitrix24 (`event=ONAPPINSTALL`): bloco `auth[...]` com `access_token`,
 *   `refresh_token`, `expires_in`, `domain` e `member_id`.
 * Nos dois casos o token é conferido no próprio portal antes de qualquer uso (ver BitrixAppService).
 */
function frameFrom(request: FastifyRequest): FrameRequest {
  const query = (request.query ?? {}) as Record<string, unknown>;
  const body = (typeof request.body === "object" && request.body ? request.body : {}) as Record<
    string,
    unknown
  >;
  const auth = (typeof body.auth === "object" && body.auth ? body.auth : null) as Record<
    string,
    unknown
  > | null;
  if (!text(body.AUTH_ID) && auth) {
    return {
      domain: text(auth.domain),
      authId: text(auth.access_token),
      refreshId: text(auth.refresh_token),
      authExpires: text(auth.expires_in),
      memberId: text(auth.member_id),
    };
  }
  return {
    domain: text(query.DOMAIN),
    authId: text(body.AUTH_ID),
    refreshId: text(body.REFRESH_ID),
    authExpires: text(body.AUTH_EXPIRES),
    memberId: text(body.member_id),
  };
}

/** Só os nomes dos campos recebidos (nunca os valores), para diagnosticar formatos inesperados. */
function fieldNames(request: FastifyRequest): string[] {
  const names = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value
      ? Object.entries(value).flatMap(([key, inner]) => names(inner, `${prefix}${key}.`))
      : [prefix.slice(0, -1)];
  return [
    ...names(request.query, "query.").filter(Boolean),
    ...names(request.body, "body.").filter(Boolean),
  ];
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

  const sendIndex = (
    reply: FastifyReply,
    session: string | typeof PILOT_RESTRICTED | null = null,
  ) => {
    // Fora do modo piloto: aviso no lugar do Workspace, sem sessão.
    const meta =
      typeof session === "string"
        ? `<meta name="workspace-session" content="${escapeAttr(session)}" />`
        : session === PILOT_RESTRICTED
          ? `<meta name="workspace-access" content="restricted" />`
          : null;
    const html = meta ? indexHtml.replace("</head>", `${meta}\n</head>`) : indexHtml;
    return reply.type("text/html; charset=utf-8").send(html);
  };

  const handleFrame =
    (kind: "open" | "install") => async (request: FastifyRequest, reply: FastifyReply) => {
      let session: string | typeof PILOT_RESTRICTED | null = null;
      if (options.bitrixApp) {
        const frame = frameFrom(request);
        if (!frame.domain || !frame.authId || !frame.memberId) {
          request.log.warn(
            { kind, fields: fieldNames(request) },
            "Chamada do Bitrix24 sem autenticação reconhecida.",
          );
        }
        try {
          session =
            kind === "install"
              ? await options.bitrixApp.install(frame, `${request.protocol}://${request.host}`)
              : await options.bitrixApp.open(frame);
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
