import { describe, expect, it } from "vitest";
import { SessionSigner } from "./session";
import { TokenCipher } from "./token-cipher";

describe("TokenCipher", () => {
  const cipher = new TokenCipher(TokenCipher.generateKey());

  it("criptografa e descriptografa sem expor o texto", () => {
    const sealed = cipher.encrypt("token-secreto");
    expect(sealed).not.toContain("token-secreto");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(cipher.decrypt(sealed)).toBe("token-secreto");
  });

  it("detecta adulteração e chave errada", () => {
    const sealed = cipher.encrypt("token");
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("A") ? "BB" : "AA");
    expect(() => cipher.decrypt(tampered)).toThrow();
    expect(() => new TokenCipher(TokenCipher.generateKey()).decrypt(sealed)).toThrow();
  });

  it("exige chave de 32 bytes", () => {
    expect(() => new TokenCipher("curta")).toThrow(/32 bytes/);
  });
});

describe("SessionSigner", () => {
  const signer = new SessionSigner("x".repeat(40), 60);
  const claims = { tenantId: "t1", userId: "7", name: "Lucas", admin: false };

  it("emite e verifica", () => {
    expect(signer.verify(signer.issue(claims))).toMatchObject(claims);
  });

  it("recusa assinatura alterada, outro segredo e expiração", () => {
    const token = signer.issue(claims, new Date("2026-11-16T10:00:00Z"));
    const [payload] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, userId: "8", exp: 9e9 })).toString(
      "base64url",
    );
    expect(signer.verify(`${forged}.${token.split(".")[1]}`)).toBeNull();
    expect(new SessionSigner("y".repeat(40)).verify(token)).toBeNull();
    expect(signer.verify(token, new Date("2026-11-16T10:02:00Z"))).toBeNull();
    expect(payload).toBeTruthy();
  });

  it("exige segredo forte", () => {
    expect(() => new SessionSigner("curto")).toThrow();
  });
});
