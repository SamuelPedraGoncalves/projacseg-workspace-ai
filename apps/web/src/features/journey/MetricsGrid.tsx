import type { JourneySummary, JourneyView } from "@projacseg/shared";
import { useNavigate } from "react-router";
import { useJourneySummary } from "../deals/queries";
import { VIEWS } from "./views";

const METRICS: { key: keyof JourneySummary; label: string; view: JourneyView }[] = [
  { key: "activeDeals", label: "Negócios ativos", view: "all" },
  { key: "actionsToday", label: "Ações de hoje", view: "today" },
  { key: "atRisk", label: "Em risco", view: "risk" },
  { key: "resolvedToday", label: "Resolvidas hoje", view: "resolved" },
];

export function MetricsGrid() {
  const { data: summary } = useJourneySummary();
  const navigate = useNavigate();

  return (
    <section
      aria-label="Indicadores operacionais"
      className="mt-[15px] grid grid-cols-4 gap-[15px] max-[900px]:grid-cols-2"
    >
      {METRICS.map(({ key, label, view }) => (
        <button
          key={key}
          type="button"
          onClick={() => navigate(VIEWS[view].path)}
          className="min-h-32 cursor-pointer rounded-(--radius-large) bg-(image:--theme-gradient-soft) px-[30px] py-[18px] text-left text-(--text-primary) transition-[filter] duration-200 hover:brightness-[0.96] max-[1200px]:p-[18px] max-[650px]:min-h-[110px]"
        >
          <span className="block text-[clamp(12px,1vw,17px)]">{label}</span>
          <strong className="mt-2 block text-[clamp(34px,3.6vw,60px)] leading-[1.15] font-extrabold">
            {summary ? summary[key] : "–"}
          </strong>
        </button>
      ))}
    </section>
  );
}
