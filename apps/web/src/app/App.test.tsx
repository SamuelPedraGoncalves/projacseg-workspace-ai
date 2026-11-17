import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoJourneyRepository, type JourneyRepository } from "../features/deals/deals-repository";
import { DEMO_DEALS } from "../features/deals/demo-data";
import { useThemeStore } from "../features/theme/theme-store";
import { createDemoPlatform, type AssistantOpenResult, type Platform } from "../platform/platform";
import { renderApp } from "../test/render-app";
import { useUiStore } from "./ui-store";

const dealNames = () =>
  within(screen.getByRole("list", { name: "Negócios" }))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);

beforeEach(() => {
  useUiStore.setState({
    themeOpen: false,
    assistantOpen: false,
    assistantFallback: "demo",
    selectedDealId: null,
  });
  useThemeStore.getState().initialize({ tenantId: "projacseg-demo", bitrixUserId: "demo-lucas" });
  useThemeStore.getState().resetTheme();
});

afterEach(() => vi.restoreAllMocks());

function bitrixPlatform(
  assistantResult: AssistantOpenResult = "opened",
  journey: JourneyRepository = new DemoJourneyRepository(),
) {
  const platform: Platform = {
    mode: "bitrix24",
    user: {
      tenantId: "projacseg-teste.bitrix24.com.br",
      bitrixUserId: "57",
      name: "Marina",
      initials: "MC",
      avatarUrl: "https://cdn.exemplo/marina.jpg",
    },
    openDealInCrm: vi.fn(),
    openAssistant: vi.fn(async () => assistantResult),
    installer: { assistantStatus: vi.fn(async () => "ready" as const), finish: vi.fn() },
    journey,
  };
  return platform;
}

describe("Dentro do Bitrix24", () => {
  it("mostra a foto do perfil do Bitrix24 no avatar", () => {
    const { container } = renderApp("/", bitrixPlatform());
    expect(screen.getByRole("img", { name: "Foto de Marina" })).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.exemplo/marina.jpg");
    expect(screen.queryByText("MC")).not.toBeInTheDocument();
  });

  it("Abrir leva ao card do negócio do CRM no Bitrix24, sem diálogo", async () => {
    const crm: JourneyRepository = {
      source: "crm",
      getJourney: async () => ({
        ...(await new DemoJourneyRepository().getJourney()),
        deals: DEMO_DEALS.map((deal) => ({ ...deal, origin: "crm" as const })),
      }),
    };
    const user = userEvent.setup();
    const platform = bitrixPlatform("opened", crm);
    renderApp("/", platform);
    expect(
      await screen.findByText(/Dados do Bitrix24\. Prazos, riscos e escalonamentos/),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "Abrir negócio de Carlos Almeida no Bitrix24" }),
    );
    expect(platform.openDealInCrm).toHaveBeenCalledWith("1001");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("negócio fictício não abre card inexistente no portal", async () => {
    const user = userEvent.setup();
    const platform = bitrixPlatform();
    renderApp("/", platform);
    await user.click(
      await screen.findByRole("button", { name: "Abrir negócio de Carlos Almeida" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Carlos Almeida" });
    expect(
      within(dialog).getByText("Negócio fictício: não existe no Bitrix24."),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Abrir no Bitrix24/ })).toBeDisabled();
    expect(platform.openDealInCrm).not.toHaveBeenCalled();
  });

  it("página de instalação confere o assistente registrado pelo servidor e conclui", async () => {
    const platform = bitrixPlatform();
    renderApp("/install", platform);
    expect(await screen.findByText("Instalação concluída.")).toBeInTheDocument();
    expect(platform.installer?.assistantStatus).toHaveBeenCalledTimes(1);
    expect(platform.installer?.finish).toHaveBeenCalledTimes(1);
  });

  it("assistente não registrado permite concluir sem ele", async () => {
    const user = userEvent.setup();
    const platform = bitrixPlatform();
    vi.mocked(platform.installer!.assistantStatus).mockResolvedValue("not-installed");
    renderApp("/install", platform);
    expect(
      await screen.findByText("O assistente não foi registrado neste portal."),
    ).toBeInTheDocument();
    expect(platform.installer?.finish).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Concluir sem o assistente" }));
    expect(platform.installer?.finish).toHaveBeenCalledTimes(1);
  });

  it("o assistente abre o chat do Bitrix24, sem o chat demonstrativo", async () => {
    const user = userEvent.setup();
    const platform = bitrixPlatform("opened");
    renderApp("/", platform);
    await user.click(screen.getByRole("button", { name: "Conversar com assistente" }));
    await user.click(screen.getByRole("button", { name: "Assistente IA" }));
    expect(platform.openAssistant).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("avisa quando o bot do assistente não está instalado no portal", async () => {
    const user = userEvent.setup();
    renderApp("/", bitrixPlatform("not-installed"));
    await user.click(screen.getByRole("button", { name: "Conversar com assistente" }));
    const dialog = await screen.findByRole("dialog", { name: "Assistente Projacseg" });
    expect(within(dialog).getByText(/ainda não está instalado neste portal/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Mensagem ao assistente")).not.toBeInTheDocument();
  });

  it("distingue falha ao abrir o chat de bot não instalado", async () => {
    const user = userEvent.setup();
    renderApp("/", bitrixPlatform("unavailable"));
    await user.click(screen.getByRole("button", { name: "Conversar com assistente" }));
    const dialog = await screen.findByRole("dialog", { name: "Assistente Projacseg" });
    expect(within(dialog).getByText(/Não foi possível abrir o chat/)).toBeInTheDocument();
  });

  it("no portal real não mostra o resumo fictício da demonstração", () => {
    renderApp("/", bitrixPlatform());
    expect(screen.queryByText(/Você tem 3 ações prioritárias/)).not.toBeInTheDocument();
    expect(screen.getByText(/assim que o Workspace for instalado/)).toBeInTheDocument();
  });
});

describe("Instalação fora do Bitrix24", () => {
  it("explica que só funciona dentro do portal", () => {
    renderApp("/install");
    expect(screen.getByText(/só funciona dentro do portal/)).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("sem foto mostra as iniciais", () => {
    renderApp("/");
    expect(screen.getByRole("img", { name: "Foto de Lucas" })).toHaveTextContent("LC");
  });

  it("se a foto falhar ao carregar, volta para as iniciais", async () => {
    const platform = createDemoPlatform({
      tenantId: "t",
      bitrixUserId: "1",
      name: "Lucas",
      initials: "LC",
      avatarUrl: "https://cdn.exemplo/quebrada.jpg",
    });
    const { container } = renderApp("/", platform);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    img?.dispatchEvent(new Event("error"));
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Foto de Lucas" })).toHaveTextContent("LC"),
    );
  });
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
