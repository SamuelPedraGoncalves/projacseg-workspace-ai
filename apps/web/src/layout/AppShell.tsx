import { Dialog } from "@projacseg/ui";
import { Outlet } from "react-router";
import { useUiStore } from "../app/ui-store";
import { usePlatform } from "../platform/platform-context";
import { AssistantDialogContent } from "../features/assistant/AssistantDialog";
import { DealDetailsDialogContent } from "../features/deals/DealDetailsDialog";
import { ThemeDialogContent } from "../features/theme/ThemeDialog";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const { user } = usePlatform();
  const {
    themeOpen,
    assistantOpen,
    assistantFallback,
    selectedDealId,
    setThemeOpen,
    setAssistantOpen,
    closeDeal,
  } = useUiStore();

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-screen gap-10 px-2 py-2.5 max-[1200px]:gap-6 max-[650px]:flex-col max-[650px]:gap-0">
        <Sidebar />
        <main
          id="conteudo"
          tabIndex={-1}
          className="min-w-0 flex-1 pt-[26px] pr-[38px] pb-[30px] focus:outline-none max-[1200px]:pr-5 max-[650px]:px-2.5 max-[650px]:py-[22px]"
        >
          <Outlet />
        </main>
      </div>

      <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
        <ThemeDialogContent />
      </Dialog>
      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <AssistantDialogContent userName={user.name} fallback={assistantFallback} />
      </Dialog>
      <Dialog
        open={selectedDealId !== null}
        onOpenChange={(open) => (open ? undefined : closeDeal())}
      >
        <DealDetailsDialogContent />
      </Dialog>
    </>
  );
}
