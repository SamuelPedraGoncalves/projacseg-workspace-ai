import type { SetupStatus } from "@projacseg/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeApi, sessionPlatform } from "../../test/fake-api";
import { renderApp } from "../../test/render-app";

afterEach(() => vi.restoreAllMocks());

function done(access: SetupStatus["access"]): SetupStatus {
  return {
    step: "done",
    access,
    terms: { version: "v", provisional: true, accepted: true },
    privacyNoticePending: false,
  };
}

const ADMIN = { admin: true, ruleEditor: true, settings: true };
const EDITOR = { admin: false, ruleEditor: true, settings: true };
const SELLER = { admin: false, ruleEditor: false, settings: false };

const CALENDAR = {
  utcOffsetMinutes: -180,
  workdays: [1, 2, 3, 4, 5],
  workStart: "08:00",
  workEnd: "18:00",
  holidays: ["2026-12-25"],
};

describe("Configurações", () => {
  it("só aparece no menu para quem tem acesso", async () => {
    fakeApi({ "GET /api/v1/setup": () => ({ body: done(SELLER) }) });
    renderApp("/", sessionPlatform());
    expect(await screen.findByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Configurações" })).not.toBeInTheDocument();
    vi.restoreAllMocks();

    fakeApi({
      "GET /api/v1/setup": () => ({ body: done(ADMIN) }),
      "GET /api/v1/setup/mapping": () => ({ status: 503, body: { error: "x" } }),
    });
    renderApp("/", sessionPlatform());
    expect(await screen.findByRole("link", { name: "Configurações" })).toBeInTheDocument();
  });

  it("sem acesso, o endereço de Configurações volta para o início", async () => {
    fakeApi({ "GET /api/v1/setup": () => ({ body: done(SELLER) }) });
    const { router } = renderApp("/configuracoes", sessionPlatform());
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it("calendário: mostra a origem e salva um feriado novo", async () => {
    let source = "bitrix24";
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({ body: done(ADMIN) }),
      "GET /api/v1/setup/calendar": () => ({ body: { calendar: CALENDAR, source } }),
      "PUT /api/v1/setup/calendar": (body) => {
        source = "manual";
        return { body: { calendar: body, source } };
      },
    });
    const user = userEvent.setup();
    renderApp("/configuracoes", sessionPlatform());

    await user.click(await screen.findByRole("tab", { name: "Calendário" }));
    expect(await screen.findByText("Lido do Bitrix24")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Novo feriado"), "2027-04-21");
    await user.click(screen.getByRole("button", { name: "Adicionar feriado" }));
    await user.click(screen.getByRole("button", { name: "Salvar calendário" }));

    await waitFor(() =>
      expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
        ...CALENDAR,
        holidays: ["2026-12-25", "2027-04-21"],
      }),
    );
    expect(await screen.findByText("Ajustado aqui")).toBeInTheDocument();
  });

  it("estrutura: mostra os níveis e o chefe; o botão abre a estrutura no Bitrix24", async () => {
    fakeApi({
      "GET /api/v1/setup": () => ({ body: done(ADMIN) }),
      "GET /api/v1/setup/structure": () => ({
        body: {
          source: "bitrix24",
          departments: [
            {
              id: "1",
              name: "Corretora",
              head: { id: "10", name: "Marta Lima" },
              children: [
                {
                  id: "3",
                  name: "Vendas",
                  head: null,
                  children: [{ id: "4", name: "Auto", head: null, children: [] }],
                },
              ],
            },
          ],
        },
      }),
    });
    const openCompanyStructure = vi.fn();
    const user = userEvent.setup();
    renderApp("/configuracoes", sessionPlatform({ openCompanyStructure }));

    await user.click(await screen.findByRole("tab", { name: "Estrutura da empresa" }));
    const tree = await screen.findByRole("tree", { name: "Estrutura da empresa" });
    expect(within(tree).getByText("Corretora")).toBeInTheDocument();
    expect(within(tree).getByText("Chefe: Marta Lima")).toBeInTheDocument();
    expect(within(tree).getByText("Auto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Atualizar estrutura da empresa" }));
    expect(openCompanyStructure).toHaveBeenCalled();
  });

  it("quem cria regras: o administrador edita; o criador só consulta", async () => {
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({ body: done(EDITOR) }),
      "GET /api/v1/setup/editors": () => ({ body: { editors: [{ id: "51", name: "Ana" }] } }),
    });
    const user = userEvent.setup();
    renderApp("/configuracoes", sessionPlatform());
    await user.click(await screen.findByRole("tab", { name: "Quem cria regras" }));
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument();
    expect(screen.getByText("Só o administrador altera esta lista.")).toBeInTheDocument();
    expect(calls.some((call) => call.method === "PUT")).toBe(false);
  });

  it("quem cria regras: o administrador adiciona pelo seletor do Bitrix24 e salva", async () => {
    const calls = fakeApi({
      "GET /api/v1/setup": () => ({ body: done(ADMIN) }),
      "GET /api/v1/setup/editors": () => ({ body: { editors: [{ id: "51", name: "Ana" }] } }),
      "PUT /api/v1/setup/editors": () => ({ body: { ok: true } }),
    });
    const pickUsers = vi.fn(async () => [{ id: "77", name: "Bruno" }]);
    const user = userEvent.setup();
    renderApp("/configuracoes", sessionPlatform({ pickUsers }));
    await user.click(await screen.findByRole("tab", { name: "Quem cria regras" }));
    await user.click(await screen.findByRole("button", { name: "Adicionar pessoas" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
        editors: [
          { id: "51", name: "Ana" },
          { id: "77", name: "Bruno" },
        ],
      }),
    );
  });
});
