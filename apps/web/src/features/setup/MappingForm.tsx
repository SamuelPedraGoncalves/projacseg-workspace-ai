import type { MappingInput, MappingView } from "@projacseg/shared";
import { Button } from "@projacseg/ui";
import { useId, useState, type FormEvent } from "react";
import { SetupApiError } from "./setup-api";

type FieldKey = keyof MappingInput["fieldMapping"];
type Situation = "none" | "new" | "renewal";

/**
 * Nenhum campo é obrigatório: se o portal não tiver um deles, a função que depende dele fica
 * desligada e o primeiro acesso não trava.
 */
const FIELDS: { key: FieldKey; label: string; hint: string }[] = [
  {
    key: "insuranceType",
    label: "Tipo do seguro",
    hint: "Campo de lista que diz se o negócio é seguro novo ou renovação. Sem ele, o WorkSeg não separa as duas situações.",
  },
  { key: "branch", label: "Ramo", hint: "Automóvel, residencial, vida…" },
  { key: "validity", label: "Vigência", hint: "Data de vigência da apólice." },
  { key: "cpf", label: "CPF", hint: "CPF ou CNPJ do cliente." },
  { key: "quoteNumber", label: "Número do cálculo", hint: "Número do cálculo da cotação." },
  {
    key: "lossReason",
    label: "Motivo de perda",
    hint: "Motivo registrado quando o negócio é perdido.",
  },
];

interface FormState {
  fields: Partial<Record<FieldKey, string>>;
  categoryIds: string[];
  situations: Record<string, Situation>;
}

function initialState(view: MappingView): FormState {
  const source = view.current ?? {
    fieldMapping: view.suggestion.fieldMapping,
    situations: {
      categoryIds: view.suggestion.situations.categoryIds ?? [],
      newBusinessValues: view.suggestion.situations.newBusinessValues ?? [],
      renewalValues: view.suggestion.situations.renewalValues ?? [],
    },
  };
  const situations: Record<string, Situation> = {};
  for (const id of source.situations.newBusinessValues) situations[id] = "new";
  for (const id of source.situations.renewalValues) situations[id] = "renewal";
  return {
    fields: { ...source.fieldMapping },
    categoryIds: [...source.situations.categoryIds],
    situations,
  };
}

function toInput(state: FormState): MappingInput {
  const fieldMapping = Object.fromEntries(
    Object.entries(state.fields).filter(([, code]) => Boolean(code)),
  ) as MappingInput["fieldMapping"];
  const ids = (kind: Situation) =>
    Object.entries(state.situations)
      .filter(([, value]) => value === kind)
      .map(([id]) => id);
  return {
    fieldMapping,
    situations: {
      categoryIds: state.categoryIds,
      newBusinessValues: ids("new"),
      renewalValues: ids("renewal"),
    },
  };
}

const selectClass =
  "w-full rounded-[10px] border border-[#d6d6d6] bg-white px-3 py-2.5 text-sm text-(--text-primary)";

function SuggestionBadge() {
  return (
    <span className="ml-2 rounded-full bg-(--theme-surface) px-2 py-0.5 text-[11px] font-medium text-(--text-secondary)">
      Sugestão automática
    </span>
  );
}

/**
 * Formulário do mapeamento (primeiro acesso e Configurações). Pré-preenche com o mapeamento salvo
 * ou, na primeira vez, com a sugestão automática pelos rótulos dos campos.
 */
export function MappingForm({
  view,
  submitLabel,
  onSubmit,
}: {
  view: MappingView;
  submitLabel: string;
  onSubmit: (input: MappingInput) => Promise<void>;
}) {
  const [state, setState] = useState<FormState>(() => initialState(view));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const id = useId();

  const typeField = view.catalog.fields.find((field) => field.code === state.fields.insuranceType);
  const suggested = (key: FieldKey) =>
    !view.current &&
    Boolean(state.fields[key]) &&
    state.fields[key] === view.suggestion.fieldMapping[key];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      await onSubmit(toInput(state));
    } catch (error) {
      setErrors(error instanceof SetupApiError ? error.errors : ["Não foi possível salvar."]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-6">
      {errors.length > 0 ? (
        <div role="alert" className="rounded-xl bg-[#fdecec] p-4 text-sm text-(--color-danger)">
          <p className="mb-1 font-semibold">Confira o mapeamento:</p>
          <ul className="list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">Funis em que o WorkSeg trabalha</legend>
        {view.catalog.categories.map((category) => (
          <label key={category.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.categoryIds.includes(category.id)}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  categoryIds: event.target.checked
                    ? [...current.categoryIds, category.id]
                    : current.categoryIds.filter((item) => item !== category.id),
                }))
              }
            />
            {category.name}
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 font-semibold">Campos do negócio</legend>
        {FIELDS.map((field) => (
          <div key={field.key} className="grid gap-1">
            <div className="flex items-center text-sm font-medium">
              <label htmlFor={`${id}-${field.key}`}>{field.label}</label>
              {suggested(field.key) ? <SuggestionBadge /> : null}
            </div>
            <select
              id={`${id}-${field.key}`}
              className={selectClass}
              value={state.fields[field.key] ?? ""}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  fields: { ...current.fields, [field.key]: event.target.value },
                  ...(field.key === "insuranceType" ? { situations: {} } : {}),
                }))
              }
            >
              <option value="">Não usar (o portal não tem este campo)</option>
              {view.catalog.fields.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-(--text-secondary)">{field.hint}</p>
          </div>
        ))}
      </fieldset>

      {typeField?.items && typeField.items.length > 0 ? (
        <fieldset className="grid gap-3">
          <legend className="mb-2 font-semibold">O que cada tipo de seguro significa</legend>
          {typeField.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_200px] items-center gap-3">
              <label htmlFor={`${id}-type-${item.id}`} className="text-sm">
                {item.value}
              </label>
              <select
                id={`${id}-type-${item.id}`}
                className={selectClass}
                value={state.situations[item.id] ?? "none"}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    situations: {
                      ...current.situations,
                      [item.id]: event.target.value as Situation,
                    },
                  }))
                }
              >
                <option value="none">Não considerar</option>
                <option value="new">Seguro novo</option>
                <option value="renewal">Renovação</option>
              </select>
            </div>
          ))}
        </fieldset>
      ) : null}

      <div>
        <Button type="submit" size="md" disabled={saving}>
          {saving ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
