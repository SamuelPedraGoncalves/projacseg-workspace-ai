import type { JourneyView } from "@projacseg/shared";
import { filterDealsByView } from "@projacseg/shared/journey";
import { useUiStore } from "../../app/ui-store";
import { DealCard } from "./DealCard";
import { useDeals } from "./queries";

const emptyClass = "rounded-(--radius-large) bg-[#f5f5f5] p-10 text-center text-(--text-secondary)";

export function DealList({ view }: { view: JourneyView }) {
  const { data: deals, isPending, isError } = useDeals();
  const openDeal = useUiStore((state) => state.openDeal);

  if (isPending) {
    return <p className={emptyClass}>Carregando negócios…</p>;
  }

  if (isError) {
    return (
      <p role="alert" className={emptyClass}>
        Não foi possível carregar os negócios.
      </p>
    );
  }

  const filtered = filterDealsByView(deals, view);

  return (
    <>
      {/* Anuncia apenas a contagem ao trocar de filtro, sem reler a lista inteira. */}
      <p role="status" className="sr-only">
        {filtered.length === 1 ? "1 negócio exibido" : `${filtered.length} negócios exibidos`}
      </p>
      {filtered.length === 0 ? (
        <p className={emptyClass}>Nenhum negócio encontrado nesta categoria.</p>
      ) : (
        <ul aria-label="Negócios" className="flex flex-col gap-3.5">
          {filtered.map((deal) => (
            <li key={deal.id}>
              <DealCard deal={deal} onOpen={(selected) => openDeal(selected.id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
