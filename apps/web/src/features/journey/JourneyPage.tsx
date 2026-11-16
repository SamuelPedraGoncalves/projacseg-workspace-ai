import type { JourneyView } from "@projacseg/shared";
import { getCurrentUser } from "../../config/session";
import { PageHeader } from "../../layout/PageHeader";
import { DealFilters } from "../deals/DealFilters";
import { DealList } from "../deals/DealList";
import { AssistantBanner } from "./AssistantBanner";
import { MetricsGrid } from "./MetricsGrid";
import { VIEWS } from "./views";

export function JourneyPage({ view }: { view: JourneyView }) {
  const user = getCurrentUser();

  return (
    <>
      <PageHeader pageTitle={VIEWS[view].pageTitle} user={user} />
      <AssistantBanner />
      <MetricsGrid />
      <section aria-label="Negócios da jornada" className="mt-[66px] max-[900px]:mt-[35px]">
        <DealFilters view={view} />
        <DealList view={view} />
      </section>
      <p className="mt-[25px] text-[11px] text-(--text-muted)">
        Ambiente demonstrativo — Dados fictícios. Nenhuma conexão com o Bitrix24.
      </p>
    </>
  );
}
