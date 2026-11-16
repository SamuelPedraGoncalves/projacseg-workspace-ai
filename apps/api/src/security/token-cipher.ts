import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Criptografia de tokens OAuth em repouso (AES-256-GCM). Formato: v1.<iv>.<tag>.<dados> (base64url).
 * A chave vem de TOKEN_ENCRYPTION_KEY (32 bytes em base64) e nunca é versionada.
 */
export class TokenCipher {
  private readonly key: Buffer;

  constructor(keyBase64: string) {
    this.key = Buffer.from(keyBase64, "base64");
    if (this.key.length !== 32) {
      throw new Error("TOKEN_ENCRYPTION_KEY deve ter 32 bytes em base64.");
    }
  }

  static generateKey(): string {
    return randomBytes(32).toString("base64");
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return ["v1", iv, cipher.getAuthTag(), data]
      .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
      .join(".");
  }

  decrypt(sealed: string): string {
    const [version, iv, tag, data] = sealed.split(".");
    if (version !== "v1" || !iv || !tag || !data) throw new Error("Token criptografado inválido.");
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
