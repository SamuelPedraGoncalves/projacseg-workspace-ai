import type { JourneyView } from "@projacseg/shared";
import { PageHeader } from "../../layout/PageHeader";
import { usePlatform } from "../../platform/platform-context";
import { DealFilters } from "../deals/DealFilters";
import { DealList } from "../deals/DealList";
import { AssistantBanner } from "./AssistantBanner";
import { MetricsGrid } from "./MetricsGrid";
import { VIEWS } from "./views";

const NOTICE = {
  demo: "Ambiente demonstrativo — Dados fictícios. Nenhuma conexão com o Bitrix24.",
  bitrix24:
    "Conectado ao Bitrix24. Negócios e indicadores ainda são demonstrativos — a leitura dos " +
    "negócios do CRM entra na próxima etapa.",
} as const;

export function JourneyPage({ view }: { view: JourneyView }) {
  const { user, mode } = usePlatform();

  return (
    <>
      <PageHeader pageTitle={VIEWS[view].pageTitle} user={user} />
      <AssistantBanner />
      <MetricsGrid />
      <section aria-label="Negócios da jornada" className="mt-[66px] max-[900px]:mt-[35px]">
        <DealFilters view={view} />
        <DealList view={view} />
      </section>
      <p className="mt-[25px] text-[11px] text-(--text-muted)">{NOTICE[mode]}</p>
    </>
  );
}
