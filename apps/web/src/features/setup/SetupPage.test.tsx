import type { MappingView, SetupStatus } from "@projacseg/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeApi, sessionPlatform } from "../../test/fake-api";
import { renderApp } from "../../test/render-app";

afterEach(() => vi.restoreAllMocks());

const TERMS = {
  version: "2026-11-19-provisorio",
  provisional: true,
  title: "Termos de uso, privacidade e LGPD — versão provisória",
  body: "Primeiro parágrafo.\n\nSegundo parágrafo.",
};

function status(step: SetupStatus["step"], patch: Partial<SetupStatus> = {}): SetupStatus {
  const admin = step !== "waiting_admin";
  return {
    step,
    access: { admin, ruleEditor: admin, settings: admin },
    terms: { version: TERMS.version, provisional: true, accepted: step !== "terms" },
    privacyNoticePending: false,
    canClaimAdmin: false,
    ...patch,
  };
}

const MAPPING: MappingView = {
  catalog: {
    categories: [{ id: "0", name: "Automóvel" }],
    fields: [
      {
        code: "UF_CRM_TIPO",
        label: "Tipo do seguro",
        type: "enumeration",
        items: [
          { id: "1", value: "Seguro novo" },
          { id: "2", value: "Renovação" },
        ],
      },
      { code: "UF_CRM_RAMO", label: "Ramo", type: "enumeration", items: [] },
    ],
  },
  current: null,
  suggestion: {
    fieldMapping: { insuranceType: "UF_CRM_TIPO", branch: "UF_CRM_RAMO" },
    situations: { categoryIds: ["0"], newBusinessValues: ["1"], renewalValues: ["2"] },
  },
  confirmed: false,
};

describe("primeiro acesso", () => {
  it("termos: mostra que é provisório e, ao aceitar, envia a versão e avança", async () => {
    let step: SetupStatus["step"] = "terms";
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({ body: status(step) }),
      "GET /api/v1/setup/terms": () => ({ body: TERMS }),
      "POST /api/v1/setup/terms/accept": () => {
        step = "editors";
        return { body: { ok: true } };
      },
    });
    const user = userEvent.setup();
    renderApp("/configurar", sessionPlatform());

    expect(await screen.findByText("Versão provisória")).toBeInTheDocument();
    expect(screen.getByText("Segundo parágrafo.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Li e aceito" }));

    expect(await screen.findByRole("heading", { name: "Bem-vindo ao WorkSeg AI" })).toBeVisible();
    expect(calls).toContainEqual({
      method: "POST",
      url: "/api/v1/setup/terms/accept",
      body: { version: TERMS.version },
    });
  });

  it("quem não é administrador só vê o aviso de espera", async () => {
    fakeApi({ "GET /api/v1/setup": () => ({ body: status("waiting_admin") }) });
    renderApp("/configurar", sessionPlatform());
    expect(
      await screen.findByText(
        "O administrador ainda está configurando o WorkSeg AI. Volte em breve.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("boas-vindas: escolhe quem cria regras pelo seletor do Bitrix24 e salva", async () => {
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({ body: status("editors") }),
      "PUT /api/v1/setup/editors": () => ({ body: { ok: true } }),
    });
    const pickUsers = vi.fn(async () => [{ id: "51", name: "Ana" }]);
    const user = userEvent.setup();
    renderApp("/configurar", sessionPlatform({ pickUsers }));

    await user.click(
      await screen.findByRole("button", { name: "Definir usuários que podem criar regras" }),
    );
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PUT",
        url: "/api/v1/setup/editors",
        body: { editors: [{ id: "51", name: "Ana" }] },
      }),
    );
  });

  it("mapeamento: pré-preenche a sugestão automática e mostra os erros do servidor", async () => {
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({ body: status("mapping") }),
      "GET /api/v1/setup/mapping": () => ({ body: MAPPING }),
      "PUT /api/v1/setup/mapping": () => ({
        status: 400,
        body: { errors: ['Campo "UF_CRM_9" não existe neste portal.'] },
      }),
    });
    const user = userEvent.setup();
    renderApp("/configurar", sessionPlatform());

    const typeSelect = await screen.findByLabelText("Tipo do seguro");
    expect(typeSelect).toHaveValue("UF_CRM_TIPO");
    expect(screen.getAllByText("Sugestão automática").length).toBeGreaterThan(0);
    expect(screen.queryByText(/IA/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salvar e começar" }));
    expect(
      await screen.findByText('Campo "UF_CRM_9" não existe neste portal.'),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
      fieldMapping: { insuranceType: "UF_CRM_TIPO", branch: "UF_CRM_RAMO" },
      situations: { categoryIds: ["0"], newBusinessValues: ["1"], renewalValues: ["2"] },
    });
    expect(screen.getByRole("heading", { name: "Mapeamento dos campos" })).toBeVisible();
  });

  it("com sessão e primeiro acesso pendente, abrir o app leva ao primeiro acesso", async () => {
    fakeApi({
      "GET /api/v1/setup": () => ({ body: status("terms") }),
      "GET /api/v1/setup/terms": () => ({ body: TERMS }),
    });
    const { router } = renderApp("/", sessionPlatform());
    await waitFor(() => expect(router.state.location.pathname).toBe("/configurar"));
  });

  it("aviso de privacidade aparece uma vez e é marcado como visto", async () => {
    let pending = true;
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({
        body: status("done", {
          access: { admin: false, ruleEditor: false, settings: false },
          privacyNoticePending: pending,
        }),
      }),
      "GET /api/v1/setup/privacy-notice": () => ({
        body: { ...TERMS, title: "Como o WorkSeg AI usa os seus dados" },
      }),
      "POST /api/v1/setup/privacy-notice/seen": () => {
        pending = false;
        return { body: { ok: true } };
      },
    });
    const user = userEvent.setup();
    renderApp("/", sessionPlatform());

    const dialog = await screen.findByRole("dialog", {
      name: "Como o WorkSeg AI usa os seus dados",
    });
    await user.click(within(dialog).getByRole("button", { name: "Entendi" }));
    await waitFor(() =>
      expect(calls.some((call) => call.url === "/api/v1/setup/privacy-notice/seen")).toBe(true),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("mapeamento sem campos obrigatórios", () => {
  it("corretora sem campo de ramo consegue salvar; dicas não prometem funções futuras", async () => {
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({ body: status("mapping") }),
      "GET /api/v1/setup/mapping": () => ({
        body: {
          ...MAPPING,
          suggestion: {
            fieldMapping: { insuranceType: "UF_CRM_TIPO" },
            situations: { categoryIds: ["0"], newBusinessValues: ["1"] },
          },
        },
      }),
      "PUT /api/v1/setup/mapping": () => ({ body: { ok: true } }),
    });
    const user = userEvent.setup();
    renderApp("/configurar", sessionPlatform());

    expect(await screen.findByLabelText("Ramo")).toHaveValue("");
    expect(screen.queryByText("(obrigatório)")).not.toBeInTheDocument();
    expect(screen.queryByText(/busca de negócios|assistente/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar e começar" }));
    await waitFor(() =>
      expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
        fieldMapping: { insuranceType: "UF_CRM_TIPO" },
        situations: { categoryIds: ["0"], newBusinessValues: ["1"], renewalValues: [] },
      }),
    );
  });
});

describe("aguardando o administrador", () => {
  it("administrador do portal pode assumir a administração", async () => {
    let claimed = false;
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({
        body: claimed ? status("terms") : status("waiting_admin", { canClaimAdmin: true }),
      }),
      "GET /api/v1/setup/terms": () => ({ body: TERMS }),
      "POST /api/v1/setup/claim-admin": () => {
        claimed = true;
        return { body: { ok: true } };
      },
    });
    const user = userEvent.setup();
    renderApp("/configurar", sessionPlatform());
    await user.click(await screen.findByRole("button", { name: "Assumir a administração" }));
    expect(await screen.findByText("Versão provisória")).toBeInTheDocument();
    expect(calls.some((call) => call.url === "/api/v1/setup/claim-admin")).toBe(true);
  });

  it("sem poder assumir, não aparece o botão", async () => {
    fakeApi({
      "GET /api/v1/setup": () => ({ body: status("waiting_admin", { canClaimAdmin: false }) }),
    });
    renderApp("/configurar", sessionPlatform());
    expect(
      await screen.findByText(
        "O administrador ainda está configurando o WorkSeg AI. Volte em breve.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Assumir a administração" }),
    ).not.toBeInTheDocument();
  });
});
