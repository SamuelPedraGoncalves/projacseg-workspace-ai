import { describe, expect, it, vi } from "vitest";
import { Bitrix24Host, dealPath, initialsOf } from "./host";
import { isInsideBitrix24, loadBitrix24Sdk, type Bx24Sdk } from "./sdk";

/** SDK falsa: responde `callMethod` a partir de um mapa método → dados (ou erro). */
function fakeSdk(responses: Record<string, unknown>, errors: Record<string, string> = {}) {
  const sdk: Bx24Sdk = {
    init: (callback) => callback(),
    callMethod: (method, _params, callback) =>
      callback({ error: () => errors[method] ?? null, data: () => responses[method] as never }),
    openPath: vi.fn(),
    getDomain: () => "projacseg-teste.bitrix24.com.br",
    im: { openMessenger: vi.fn() },
  };
  return sdk;
}

describe("Bitrix24Host", () => {
  it("lê o usuário logado com a foto do perfil", async () => {
    const host = new Bitrix24Host(
      fakeSdk({
        "user.current": {
          ID: "57",
          NAME: "Marina",
          LAST_NAME: "Costa",
          PERSONAL_PHOTO: "https://cdn.exemplo/foto.jpg",
        },
      }),
    );
    await expect(host.getCurrentUser()).resolves.toEqual({
      tenantId: "projacseg-teste.bitrix24.com.br",
      bitrixUserId: "57",
      name: "Marina",
      initials: "MC",
      avatarUrl: "https://cdn.exemplo/foto.jpg",
    });
  });

  it("sem foto no perfil, não define avatarUrl", async () => {
    const host = new Bitrix24Host(
      fakeSdk({ "user.current": { ID: "8", NAME: "João", PERSONAL_PHOTO: "" } }),
    );
    const user = await host.getCurrentUser();
    expect(user.avatarUrl).toBeUndefined();
    expect(user.initials).toBe("J");
  });

  it("abre o card do negócio no slider do Bitrix24", () => {
    const sdk = fakeSdk({});
    new Bitrix24Host(sdk).openDeal("1234");
    expect(sdk.openPath).toHaveBeenCalledWith("/crm/deal/details/1234/");
  });

  it("abre o chat do bot do assistente localizado pelo código", async () => {
    const sdk = fakeSdk({
      "imbot.bot.list": {
        "91": { ID: 91, CODE: "outro_bot" },
        "92": { ID: 92, CODE: "projacseg_assistant" },
      },
    });
    await expect(new Bitrix24Host(sdk).openAssistantChat("projacseg_assistant")).resolves.toBe(
      true,
    );
    expect(sdk.im.openMessenger).toHaveBeenCalledWith("92");
  });

  it("informa quando o bot não está registrado no portal", async () => {
    const sdk = fakeSdk({ "imbot.bot.list": {} });
    await expect(new Bitrix24Host(sdk).openAssistantChat("projacseg_assistant")).resolves.toBe(
      false,
    );
    expect(sdk.im.openMessenger).not.toHaveBeenCalled();
  });

  it("propaga erro da API do Bitrix24", async () => {
    const sdk = fakeSdk({}, { "imbot.bot.list": "insufficient_scope" });
    await expect(new Bitrix24Host(sdk).openAssistantChat("x")).rejects.toThrow(
      /insufficient_scope/,
    );
  });
});

describe("utilitários", () => {
  it("dealPath só aceita IDs numéricos", () => {
    expect(dealPath("77")).toBe("/crm/deal/details/77/");
    expect(() => dealPath("../admin")).toThrow();
  });

  it("initialsOf", () => {
    expect(initialsOf("Lucas", "Carvalho")).toBe("LC");
    expect(initialsOf("ana maria souza")).toBe("AS");
  });
});

describe("detecção do Bitrix24", () => {
  it("fora de iframe não carrega a SDK", async () => {
    expect(isInsideBitrix24(window)).toBe(false);
    await expect(loadBitrix24Sdk(window)).resolves.toBeNull();
    expect(document.querySelector("script[src*='bitrix24']")).toBeNull();
  });

  it("em iframe exige DOMAIN e APP_SID na URL", () => {
    const framed = (search: string) =>
      ({ self: {}, top: {}, location: { search } }) as unknown as Window;
    expect(isInsideBitrix24(framed("?DOMAIN=x.bitrix24.com&APP_SID=abc"))).toBe(true);
    expect(isInsideBitrix24(framed("?DOMAIN=x.bitrix24.com"))).toBe(false);
    expect(isInsideBitrix24(framed(""))).toBe(false);
  });
});
