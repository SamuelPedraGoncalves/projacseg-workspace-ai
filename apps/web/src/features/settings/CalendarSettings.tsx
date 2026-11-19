import type { CalendarSource, CalendarView, CompanyCalendar } from "@projacseg/shared";
import { Button } from "@projacseg/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useId, useState } from "react";
import type { SetupApi } from "../setup/setup-api";

const SOURCE_LABEL: Record<CalendarSource, string> = {
  bitrix24: "Lido do Bitrix24",
  default: "Padrão (seg–sex, 8h–18h)",
  manual: "Ajustado aqui",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

export function CalendarSettings({ api }: { api: SetupApi }) {
  const query = useQuery({ queryKey: ["setup", "calendar"], queryFn: () => api.calendar() });
  if (query.isError) return <p role="alert">{query.error.message}</p>;
  if (!query.data) return <p>Carregando o calendário…</p>;
  // O formulário recomeça do calendário gravado sempre que ele muda (salvar ou reler do Bitrix24).
  return <CalendarForm key={query.dataUpdatedAt} api={api} view={query.data} />;
}

function CalendarForm({ api, view }: { api: SetupApi; view: CalendarView }) {
  const client = useQueryClient();
  const id = useId();
  const [draft, setDraft] = useState<CompanyCalendar>(view.calendar);
  const [newHoliday, setNewHoliday] = useState("");

  const onSaved = (saved: CalendarView) => client.setQueryData(["setup", "calendar"], saved);
  const save = useMutation({
    mutationFn: (calendar: CompanyCalendar) => api.saveCalendar(calendar),
    onSuccess: onSaved,
  });
  const reload = useMutation({ mutationFn: () => api.importCalendar(), onSuccess: onSaved });

  const update = (patch: Partial<CompanyCalendar>) => setDraft({ ...draft, ...patch });
  const error = save.error ?? reload.error;

  return (
    <div className="grid gap-6">
      <p className="text-sm">
        Origem: <strong>{SOURCE_LABEL[view.source]}</strong>. Os prazos das regras contam só os dias
        úteis e o expediente abaixo.
      </p>

      <div className="flex flex-wrap gap-6">
        <label className="grid gap-1 text-sm font-medium">
          Início do expediente
          <input
            type="time"
            value={draft.workStart}
            onChange={(event) => update({ workStart: event.target.value })}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Fim do expediente
          <input
            type="time"
            value={draft.workEnd}
            onChange={(event) => update({ workEnd: event.target.value })}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-2"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Dias úteis</legend>
        <div className="flex flex-wrap gap-4">
          {WEEKDAYS.map((label, day) => (
            <label key={label} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={draft.workdays.includes(day)}
                onChange={(event) =>
                  update({
                    workdays: event.target.checked
                      ? [...draft.workdays, day].sort()
                      : draft.workdays.filter((item) => item !== day),
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="mb-2 text-sm font-medium">Feriados</p>
        {draft.holidays.length === 0 ? (
          <p className="mb-3 text-sm text-(--text-secondary)">Nenhum feriado cadastrado.</p>
        ) : (
          <ul aria-label="Feriados" className="mb-3 flex flex-wrap gap-2">
            {draft.holidays.map((holiday) => (
              <li
                key={holiday}
                className="flex items-center gap-1 rounded-full bg-[#eef2f8] py-1 pr-1 pl-3 text-sm"
              >
                {formatDate(holiday)}
                <button
                  type="button"
                  aria-label={`Remover feriado ${formatDate(holiday)}`}
                  className="grid size-6 cursor-pointer place-items-center rounded-full hover:bg-black/5"
                  onClick={() =>
                    update({ holidays: draft.holidays.filter((item) => item !== holiday) })
                  }
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <label htmlFor={`${id}-holiday`} className="text-sm">
              Novo feriado
            </label>
            <input
              id={`${id}-holiday`}
              type="date"
              value={newHoliday}
              onChange={(event) => setNewHoliday(event.target.value)}
              className="rounded-[10px] border border-[#d6d6d6] px-3 py-2"
            />
          </div>
          <Button
            variant="secondary"
            disabled={!/^\d{4}-\d{2}-\d{2}$/.test(newHoliday)}
            onClick={() => {
              update({ holidays: [...new Set([...draft.holidays, newHoliday])].sort() });
              setNewHoliday("");
            }}
          >
            Adicionar feriado
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button size="md" disabled={save.isPending} onClick={() => save.mutate(draft)}>
          Salvar calendário
        </Button>
        <Button
          size="md"
          variant="secondary"
          disabled={reload.isPending}
          onClick={() => reload.mutate()}
        >
          Ler do Bitrix24
        </Button>
      </div>
    </div>
  );
}
