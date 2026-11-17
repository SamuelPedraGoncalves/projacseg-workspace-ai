import { ArrowRight, Sparkles } from "lucide-react";
import { usePlatform } from "../../platform/platform-context";
import { useWorkspaceActions } from "../../platform/use-workspace-actions";
import { useBriefing } from "../deals/queries";

export function AssistantBanner() {
  const { data: briefing } = useBriefing();
  const { openAssistant } = useWorkspaceActions();
  const { mode, journey } = usePlatform();
  // Dentro de um portal real, o resumo fictício da demonstração nunca é exibido.
  const text =
    mode === "bitrix24" && journey.source === "demo"
      ? "Seus negócios aparecerão aqui assim que o Workspace for instalado no servidor deste portal."
      : (briefing ?? "Carregando suas prioridades…");

  return (
    <section
      aria-labelledby="assistant-banner-title"
      data-surface="gradient"
      className="flex min-h-[230px] flex-col justify-center rounded-(--radius-large) bg-(image:--theme-gradient) px-9 py-[30px] text-(--theme-on-gradient) max-[900px]:p-6 max-[650px]:min-h-0 max-[650px]:p-[22px]"
    >
      <h2
        id="assistant-banner-title"
        className="mb-3 flex items-center gap-2 text-xl font-bold max-[650px]:text-base"
      >
        <Sparkles className="size-[18px]" aria-hidden="true" />
        Seu assistente Projacseg
      </h2>
      <p className="mb-5 max-w-[850px] text-[clamp(14px,1.15vw,18px)] leading-[1.55] max-[650px]:text-[13px]">
        {text}
      </p>
      <button
        type="button"
        onClick={() => void openAssistant()}
        className="flex cursor-pointer items-center gap-3.5 self-start rounded-[13px] bg-white px-[23px] py-[17px] text-[clamp(14px,1.2vw,20px)] text-(--text-secondary) transition-[filter] duration-200 hover:brightness-[0.96] max-[650px]:p-[13px] max-[650px]:text-xs"
      >
        Conversar com assistente
        <ArrowRight className="size-[18px]" aria-hidden="true" />
      </button>
    </section>
  );
}
