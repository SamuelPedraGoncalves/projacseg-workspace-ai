import type { Deal, DealPriority } from "@projacseg/shared";
import { cn } from "@projacseg/ui";
import { ArrowRight } from "lucide-react";

/** Cores semânticas fixas: não mudam com o tema. */
const PRIORITY_BAR: Record<DealPriority, string> = {
  danger: "bg-(--color-danger)",
  warning: "bg-(--color-warning)",
  neutral: "bg-(--color-neutral)",
  success: "bg-(--color-success)",
};

const DEADLINE_TEXT: Record<DealPriority, string> = {
  danger: "text-(--color-danger)",
  warning: "text-(--text-secondary)",
  neutral: "text-(--text-secondary)",
  success: "text-(--color-success)",
};

/** Texto para leitores de tela, já que a barra lateral é só visual. */
const PRIORITY_LABEL: Record<DealPriority, string> = {
  danger: "Prioridade crítica",
  warning: "Atenção",
  neutral: "Sem urgência",
  success: "Concluído",
};

interface DealCardProps {
  deal: Deal;
  onOpen: (deal: Deal) => void;
}

export function DealCard({ deal, onOpen }: DealCardProps) {
  const category = [deal.branch, deal.insuranceType].filter(Boolean).join(" · ");

  return (
    <article
      aria-label={deal.clientName}
      className={cn(
        "flex min-h-[116px] items-center gap-[22px] rounded-(--radius-large) bg-(--theme-surface) py-5 pr-[30px] pl-9",
        "max-[900px]:gap-3 max-[900px]:p-[18px] max-[650px]:flex-wrap",
      )}
    >
      <div
        aria-hidden="true"
        className={cn("h-[76px] w-1 shrink-0", PRIORITY_BAR[deal.priority])}
      />

      <div className="min-w-0 flex-1 max-[650px]:basis-3/4">
        <p className="text-[clamp(12px,1.1vw,18px)] text-(--text-secondary) uppercase">
          {category}
        </p>
        <h3 className="mt-[3px] text-[clamp(15px,1.25vw,21px)] font-bold">{deal.clientName}</h3>
        <p className="mt-[3px] text-xs text-(--text-secondary)">{deal.nextAction}</p>
      </div>

      <p
        className={cn(
          "text-right text-[15px] max-[900px]:text-xs max-[650px]:ml-auto",
          DEADLINE_TEXT[deal.priority],
        )}
      >
        <span className="sr-only">{PRIORITY_LABEL[deal.priority]}. Prazo: </span>
        {deal.deadlineLabel}
      </p>

      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Abrir negócio de ${deal.clientName}`}
        onClick={() => onOpen(deal)}
        className="flex cursor-pointer items-center gap-2 rounded-[11px] bg-white/80 px-[23px] py-[17px] text-lg whitespace-nowrap text-(--text-secondary) transition-[filter] duration-200 hover:brightness-[0.96] max-[900px]:p-3 max-[900px]:text-sm"
      >
        Abrir
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </article>
  );
}
