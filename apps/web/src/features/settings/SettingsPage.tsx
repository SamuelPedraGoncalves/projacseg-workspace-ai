import { cn } from "@projacseg/ui";
import { useId, useState } from "react";
import { Navigate } from "react-router";
import { useSetupApi, useSetupStatus } from "../setup/setup-api";
import { CalendarSettings } from "./CalendarSettings";
import { EditorsSettings } from "./EditorsSettings";
import { MappingSettings } from "./MappingSettings";
import { StructureSettings } from "./StructureSettings";

const TABS = [
  { id: "mapping", label: "Mapeamento" },
  { id: "calendar", label: "Calendário" },
  { id: "structure", label: "Estrutura da empresa" },
  { id: "editors", label: "Quem cria regras" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Configurações da corretora: só para o administrador e quem cria regras (a API também confere). */
export function SettingsPage() {
  const api = useSetupApi();
  const status = useSetupStatus();
  const [tab, setTab] = useState<TabId>("mapping");
  const id = useId();

  if (!api) return <Navigate to="/" replace />;
  if (!status.data) return <p role="status">Carregando…</p>;
  if (!status.data.access.settings) return <Navigate to="/" replace />;

  return (
    <>
      <header className="mb-8">
        <nav aria-label="Você está em" className="mb-1.5 text-sm text-(--text-secondary)">
          WorkSeg AI / <span aria-current="page">Configurações</span>
        </nav>
        <h1 className="text-[clamp(30px,3.2vw,52px)] leading-[1.2] font-extrabold tracking-[-1.5px]">
          Configurações
        </h1>
      </header>

      <div role="tablist" aria-label="Configurações" className="mb-8 flex flex-wrap gap-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${id}-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${id}-panel`}
            onClick={() => setTab(item.id)}
            className={cn(
              "cursor-pointer rounded-full px-6 py-3 text-sm font-semibold transition-colors",
              tab === item.id
                ? "bg-(image:--theme-gradient) text-(--theme-on-gradient)"
                : "bg-[#e9e9e9] text-(--text-primary) hover:brightness-95",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
        className="max-w-[1000px]"
      >
        {tab === "mapping" ? <MappingSettings api={api} /> : null}
        {tab === "calendar" ? <CalendarSettings api={api} /> : null}
        {tab === "structure" ? <StructureSettings api={api} /> : null}
        {tab === "editors" ? <EditorsSettings api={api} admin={status.data.access.admin} /> : null}
      </section>
    </>
  );
}
