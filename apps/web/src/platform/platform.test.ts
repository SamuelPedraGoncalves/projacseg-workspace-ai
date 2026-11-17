import { afterEach, describe, expect, it, vi } from "vitest";
import { Bitrix24Host } from "../integrations/bitrix24/host";
import type { Bx24Sdk } from "../integrations/bitrix24/sdk";
import { createBitrix24Platform } from "./platform";

const user = { tenantId: "t", bitrixUserId: "7", name: "Lucas", initials: "LC" };

function host() {
  const sdk = {
    init: (callback: () => void) => callback(),
    callMethod: vi.fn(),
    openPath: vi.fn(),
    getDomain: () => "projacseg-teste.bitrix24.com.br",
    installFinish: vi.fn(),
    im: { openMessenger: vi.fn() },
  } as unknown as Bx24Sdk;
  return { sdk, host: new Bitrix24Host(sdk) };
}

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

afterEach(() => vi.restoreAllMocks());

describe("assistente dentro do Bitrix24", () => {
  it("abre o diálogo do bot informado pelo backend, com a sessão do Workspace", async () => {
    const fetchSpy = respond(200, { status: "ready", dialogId: "92" });
    const { sdk, host: bitrix } = host();
    const platform = createBitrix24Platform(bitrix, user, "sessao-assinada");
    await expect(platform.openAssistant()).resolves.toBe("opened");
    expect(sdk.im.openMessenger).toHaveBeenCalledWith("92");
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/assistant", {
      headers: { Authorization: "Bearer sessao-assinada" },
    });
    // O navegador não chama a API de bots do Bitrix24.
    expect(sdk.callMethod).not.toHaveBeenCalled();
  });

  it("bot não registrado ou portal sem instalação no servidor", async () => {
    respond(200, { status: "not-installed" });
    const { sdk, host: bitrix } = host();
    await expect(createBitrix24Platform(bitrix, user, "s").openAssistant()).resolves.toBe(
      "not-installed",
    );
    await expect(createBitrix24Platform(bitrix, user, null).openAssistant()).resolves.toBe(
      "not-installed",
    );
    expect(sdk.im.openMessenger).not.toHaveBeenCalled();
  });

  it("falha do servidor ou resposta inesperada vira 'indisponível'", async () => {
    const { sdk, host: bitrix } = host();
    respond(503, { status: "unavailable" });
    await expect(createBitrix24Platform(bitrix, user, "s").openAssistant()).resolves.toBe(
      "unavailable",
    );
    respond(200, { status: "ready", dialogId: "../../admin" });
    await expect(createBitrix24Platform(bitrix, user, "s").openAssistant()).resolves.toBe(
      "unavailable",
    );
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("rede"));
    await expect(createBitrix24Platform(bitrix, user, "s").openAssistant()).resolves.toBe(
      "unavailable",
    );
    expect(sdk.im.openMessenger).not.toHaveBeenCalled();
  });

  it("instalação consulta a situação do assistente", async () => {
    respond(200, { status: "ready", dialogId: "92" });
    const { host: bitrix } = host();
    await expect(
      createBitrix24Platform(bitrix, user, "s").installer?.assistantStatus(),
    ).resolves.toBe("ready");
    await expect(
      createBitrix24Platform(bitrix, user, null).installer?.assistantStatus(),
    ).resolves.toBe("not-installed");
  });
});

describe("modo piloto", () => {
  it("reconhece o aviso do backend para quem está fora do piloto", async () => {
    const { isPilotRestricted } = await import("./platform");
    const doc = document.implementation.createHTMLDocument("x");
    expect(isPilotRestricted(doc)).toBe(false);
    const meta = doc.createElement("meta");
    meta.name = "workspace-access";
    meta.content = "restricted";
    doc.head.append(meta);
    expect(isPilotRestricted(doc)).toBe(true);
  });
});
