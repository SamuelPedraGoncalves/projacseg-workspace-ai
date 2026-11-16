import type { JourneyView } from "@projacseg/shared";
import { PageHeader } from "../../layout/PageHeader";
import { usePlatform } from "../../platform/platform-context";
import { DealFilters } from "../deals/DealFilters";
import { DealList } from "../deals/DealList";
import { useJourney } from "../deals/queries";
import { AssistantBanner } from "./AssistantBanner";
import { MetricsGrid } from "./MetricsGrid";
import { VIEWS } from "./views";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function DataNotice() {
  const { mode, journey } = usePlatform();
  const { data } = useJourney();

  let text: string;
  if (journey.source === "crm") {
    text =
      "Dados do Bitrix24. Prazos, riscos e escalonamentos calculados pelo motor de regras" +
      (data ? ` · atualizado às ${formatTime(data.generatedAt)}.` : ".");
  } else if (mode === "bitrix24") {
    text =
      "Conectado ao Bitrix24, mas o portal ainda não foi instalado no servidor do Workspace — " +
      "mostrando dados demonstrativos.";
  } else {
    text = "Ambiente demonstrativo — Dados fictícios. Nenhuma conexão com o Bitrix24.";
  }
  return <p className="mt-[25px] text-[11px] text-(--text-muted)">{text}</p>;
}

export function JourneyPage({ view }: { view: JourneyView }) {
  const { user } = usePlatform();

  return (
    <>
      <PageHeader pageTitle={VIEWS[view].pageTitle} user={user} />
      <AssistantBanner />
      <MetricsGrid />
      <section aria-label="Negócios da jornada" className="mt-[66px] max-[900px]:mt-[35px]">
        <DealFilters view={view} />
        <DealList view={view} />
      </section>
      <DataNotice />
    </>
  );
}
