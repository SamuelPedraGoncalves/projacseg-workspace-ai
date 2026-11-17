import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sessão do colaborador no Workspace. Emitida pelo backend quando o Bitrix24 abre o aplicativo
 * (depois de validar o AUTH_ID no próprio portal) e entregue ao navegador dentro do HTML. Não contém
 * nenhum token do Bitrix24 — só a identidade, assinada com HMAC-SHA256.
 */
export interface SessionClaims {
  tenantId: string;
  userId: string;
  name: string;
  admin: boolean;
  /** Expiração em segundos (epoch). */
  exp: number;
}

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

export class SessionSigner {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds = 8 * 60 * 60,
  ) {
    if (secret.length < 32) throw new Error("SESSION_SECRET deve ter ao menos 32 caracteres.");
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret).update(payload).digest("base64url");
  }

  issue(claims: Omit<SessionClaims, "exp">, now = new Date()): string {
    const payload = encode({ ...claims, exp: Math.floor(now.getTime() / 1000) + this.ttlSeconds });
    return `${payload}.${this.sign(payload)}`;
  }

  verify(token: string, now = new Date()): SessionClaims | null {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = Buffer.from(this.sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const claims = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as SessionClaims;
      if (typeof claims.exp !== "number" || claims.exp * 1000 <= now.getTime()) return null;
      return claims;
    } catch {
      return null;
    }
  }
}

/** Sessão do cabeçalho `Authorization: Bearer <sessão>` (nunca de parâmetros do navegador). */
export function sessionFromRequest(
  request: { headers: { authorization?: string | undefined } },
  signer: SessionSigner,
): SessionClaims | null {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token ? signer.verify(token) : null;
}
