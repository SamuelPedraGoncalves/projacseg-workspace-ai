import { Button, DialogContent } from "@projacseg/ui";
import { ExternalLink } from "lucide-react";
import { useId } from "react";
import { useUiStore } from "../../app/ui-store";
import { usePlatform } from "../../platform/platform-context";
import { canOpenInCrm } from "../../platform/use-workspace-actions";
import { useDeals } from "./queries";

/** Conteúdo do diálogo de detalhes do negócio selecionado. */
export function DealDetailsDialogContent() {
  const selectedDealId = useUiStore((state) => state.selectedDealId);
  const { data: deals } = useDeals();
  const crmHintId = useId();
  const platform = usePlatform();
  const deal = deals?.find((item) => item.id === selectedDealId);

  if (!deal) {
    return <DialogContent title="Negócio não encontrado">{null}</DialogContent>;
  }

  const rows: [string, string][] = [
    ["Responsável", deal.responsibleName],
    ["Pipeline", deal.pipelineName],
    ["Etapa", deal.stageName],
    ["Ramo", deal.branch],
    ["Tipo", deal.insuranceType ?? "—"],
    ["Próxima ação", deal.nextAction],
    ["Prazo", deal.deadlineLabel],
  ];
  const crmAvailable = canOpenInCrm(platform, deal);
  const crmHint =
    deal.origin === "demo"
      ? "Negócio fictício: não existe no Bitrix24."
      : "Disponível quando o Workspace é aberto dentro do Bitrix24.";

  return (
    <DialogContent title={deal.clientName} description={`Negócio #${deal.id}`}>
      <dl>
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-5 border-b border-(--border-color) py-3.5 text-[13px]"
          >
            <dt className="text-(--text-secondary)">{label}</dt>
            <dd className="text-right font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 rounded-xl bg-(--theme-surface) p-4 text-[13px] leading-[1.6]">
        O monitoramento de prazos e o escalonamento automático serão realizados pelo motor
        operacional nas próximas etapas do projeto.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={!crmAvailable}
          aria-describedby={crmAvailable ? undefined : crmHintId}
          onClick={() => platform.openDealInCrm?.(deal.id)}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Abrir no Bitrix24
        </Button>
        {crmAvailable ? null : (
          <span id={crmHintId} className="text-[11px] text-(--text-muted)">
            {crmHint}
          </span>
        )}
      </div>

      {deal.origin === "demo" ? (
        <p className="mt-6 text-[11px] text-(--text-muted)">
          Negócio fictício para homologação visual.
        </p>
      ) : null}
    </DialogContent>
  );
}
