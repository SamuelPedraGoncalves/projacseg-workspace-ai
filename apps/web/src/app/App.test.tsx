import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "../features/theme/theme-store";
import { renderApp } from "../test/render-app";
import { useUiStore } from "./ui-store";

const dealNames = () =>
  within(screen.getByRole("list", { name: "Negócios" }))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);

beforeEach(() => {
  useUiStore.setState({ themeOpen: false, assistantOpen: false, selectedDealId: null });
  useThemeStore.getState().resetTheme();
});

describe("Minha Jornada", () => {
  it("exibe saudação, breadcrumb e indicadores", async () => {
    renderApp("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/, Lucas!$/);
    expect(screen.getByRole("navigation", { name: "Você está em" })).toHaveTextContent(
      "Workspace / Minha Jornada",
    );
    const metrics = screen.getByRole("region", { name: "Indicadores operacionais" });
    expect(await within(metrics).findByText("42")).toBeInTheDocument();
    for (const value of ["12", "3", "8"])
      expect(within(metrics).getByText(value)).toBeInTheDocument();
  });

  it("filtra os negócios e sincroniza breadcrumb e menu", async () => {
    const user = userEvent.setup();
    const { router } = renderApp("/");

    expect(await screen.findByText("Carlos Almeida")).toBeInTheDocument();
    expect(dealNames()).toEqual(["Carlos Almeida", "Juliana Santos"]);
    expect(screen.getByRole("button", { name: "Para hoje" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Em risco" }));
    expect(router.state.location.pathname).toBe("/em-risco");
    expect(dealNames()).toEqual(["Carlos Almeida", "Empresa Martins", "Roberto Lima"]);
    expect(screen.getByRole("link", { name: "Em Risco" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Você está em" })).toHaveTextContent("Em Risco");

    await user.click(screen.getByRole("button", { name: "Aguardando" }));
    expect(dealNames()).toEqual(["Clínica Oliveira"]);

    await user.click(screen.getByRole("button", { name: "Resolvidas" }));
    expect(dealNames()).toEqual(["Ana Souza"]);
  });

  it("Meus Negócios mostra todos os não resolvidos", async () => {
    renderApp("/negocios");
    await screen.findByText("Carlos Almeida");
    expect(dealNames()).toHaveLength(5);
    expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument();
  });

  it("cards de indicadores levam à visão correspondente", async () => {
    const user = userEvent.setup();
    const { router } = renderApp("/");
    await user.click(await screen.findByRole("button", { name: /Resolvidas hoje/ }));
    expect(router.state.location.pathname).toBe("/resolvidos");
  });

  it("abre os detalhes demonstrativos do negócio", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(
      await screen.findByRole("button", { name: "Abrir negócio de Carlos Almeida" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Carlos Almeida" });
    expect(within(dialog).getByText("Negócio #1001")).toBeInTheDocument();
    expect(within(dialog).getByText("Elaborando cotação")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Abrir no Bitrix24/ })).toBeDisabled();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("abre o assistente demonstrativo e responde com texto predefinido", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(screen.getByRole("button", { name: "Conversar com assistente" }));

    const dialog = await screen.findByRole("dialog", { name: "Assistente Projacseg" });
    expect(within(dialog).getByText(/Nenhuma IA conectada/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Mensagem ao assistente"), "teleport");
    await user.click(within(dialog).getByRole("button", { name: "Enviar" }));

    const conversation = within(dialog).getByRole("list", { name: "Conversa" });
    expect(within(conversation).getByText("teleport")).toBeInTheDocument();
    expect(within(conversation).getByText(/cadastro no Teleport em atraso/)).toBeInTheDocument();
  });

  it("o menu lateral também abre o assistente", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(screen.getByRole("button", { name: "Assistente IA" }));
    expect(await screen.findByRole("dialog", { name: "Assistente Projacseg" })).toBeInTheDocument();
  });
});

describe("Temas", () => {
  const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name);

  it("aplica tema predefinido, cor HEX e restaura o padrão", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(screen.getByRole("button", { name: "Temas" }));
    const dialog = await screen.findByRole("dialog", { name: "Personalizar tema" });

    await user.click(within(dialog).getByRole("button", { name: "Verde" }));
    expect(rootVar("--theme-base")).toBe("#137849");
    expect(within(dialog).getByRole("button", { name: "Verde" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const hex = within(dialog).getByLabelText("Cor personalizada");
    expect(hex).toHaveValue("#137849".toUpperCase());

    await user.clear(hex);
    await user.type(hex, "xyz");
    await user.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("HEX válida");
    expect(rootVar("--theme-base")).toBe("#137849");

    await user.clear(hex);
    await user.type(hex, "#6534AE");
    await user.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    expect(rootVar("--theme-base")).toBe("#6534ae");
    expect(window.localStorage.getItem("workspace-theme:projacseg-demo:demo-lucas")).toBe(
      "#6534ae",
    );

    await user.click(within(dialog).getByRole("button", { name: "Restaurar padrão" }));
    expect(rootVar("--theme-base")).toBe("#0649a8");
    expect(rootVar("--theme-tone-4")).toBe("#33b2f2");
  });
});
