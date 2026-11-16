import type { JourneyView } from "@projacseg/shared";
import { cn } from "@projacseg/ui";
import { useNavigate } from "react-router";
import { FILTERS, VIEWS } from "../journey/views";

export function DealFilters({ view }: { view: JourneyView }) {
  const navigate = useNavigate();

  return (
    <div
      role="group"
      aria-label="Filtros de negócios"
      className="mb-[27px] flex flex-wrap gap-[11px] max-[650px]:grid max-[650px]:grid-cols-2"
    >
      {FILTERS.map((filter) => {
        const active = filter.view === view;
        return (
          <button
            key={filter.view}
            type="button"
            aria-pressed={active}
            onClick={() => navigate(VIEWS[filter.view].path)}
            className={cn(
              "min-w-[150px] cursor-pointer rounded-[11px] px-6 py-[17px] text-[clamp(13px,1.2vw,20px)] transition-[filter] duration-200 hover:brightness-[0.96]",
              "max-[1200px]:min-w-[120px] max-[650px]:min-w-0 max-[650px]:p-3",
              active
                ? "bg-(image:--theme-gradient) text-(--theme-on-gradient)"
                : "bg-[#eeeeee] text-(--text-secondary)",
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
