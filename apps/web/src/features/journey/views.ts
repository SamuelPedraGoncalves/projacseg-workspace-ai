import type { JourneyView } from "@projacseg/shared";

export interface ViewConfig {
  view: JourneyView;
  path: string;
  /** Rótulo no menu lateral e no breadcrumb. */
  pageTitle: string;
}

/** Cada visão da jornada tem sua URL: a rota é a única fonte de verdade do filtro ativo. */
export const VIEWS: Record<JourneyView, ViewConfig> = {
  today: { view: "today", path: "/", pageTitle: "Minha Jornada" },
  all: { view: "all", path: "/negocios", pageTitle: "Meus Negócios" },
  risk: { view: "risk", path: "/em-risco", pageTitle: "Em Risco" },
  waiting: { view: "waiting", path: "/aguardando", pageTitle: "Aguardando" },
  resolved: { view: "resolved", path: "/resolvidos", pageTitle: "Resolvidos" },
};

/** Botões de filtro acima da lista, na ordem da referência. */
export const FILTERS: { view: JourneyView; label: string }[] = [
  { view: "today", label: "Para hoje" },
  { view: "risk", label: "Em risco" },
  { view: "waiting", label: "Aguardando" },
  { view: "resolved", label: "Resolvidas" },
];
