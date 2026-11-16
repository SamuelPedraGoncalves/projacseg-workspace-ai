import { THEME_PRESETS, buildGradient, generatePalette, normalizeHex } from "@projacseg/theme";
import { Button, DialogClose, DialogContent, cn } from "@projacseg/ui";
import { useId, useState, type FormEvent } from "react";
import { useThemeStore } from "./theme-store";

const presetSwatches = THEME_PRESETS.map((preset) => ({
  ...preset,
  gradient: buildGradient(generatePalette(preset.color)),
}));

const sectionLabel = "mb-3 block text-[13px] font-semibold";

/** Conteúdo do diálogo "Personalizar tema". O estado de abertura fica com quem o renderiza. */
export function ThemeDialogContent() {
  const baseColor = useThemeStore((state) => state.baseColor);
  const palette = useThemeStore((state) => state.palette);
  const setTheme = useThemeStore((state) => state.setTheme);
  const resetTheme = useThemeStore((state) => state.resetTheme);

  // O campo HEX é editável livremente; quando o tema muda por outro controle, ele é ressincronizado
  // (padrão "ajustar estado durante a renderização" recomendado pelo React).
  const [hexDraft, setHexDraft] = useState(baseColor.toUpperCase());
  const [syncedColor, setSyncedColor] = useState(baseColor);
  const [hexError, setHexError] = useState<string | null>(null);
  if (syncedColor !== baseColor) {
    setSyncedColor(baseColor);
    setHexDraft(baseColor.toUpperCase());
    setHexError(null);
  }

  const hexId = useId();
  const hexErrorId = useId();
  const presetsLabelId = useId();
  const paletteLabelId = useId();

  const applyHex = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeHex(hexDraft);
    if (!normalized) {
      setHexError("Informe uma cor HEX válida, como #0649A8.");
      return;
    }
    setTheme(normalized);
  };

  return (
    <DialogContent
      title="Personalizar tema"
      description="Deixe seu workspace com a sua identidade."
    >
      <span id={presetsLabelId} className={sectionLabel}>
        Temas predefinidos
      </span>
      <div
        role="group"
        aria-labelledby={presetsLabelId}
        className="mb-[25px] grid grid-cols-4 gap-3 max-[650px]:grid-cols-2"
      >
        {presetSwatches.map((preset) => {
          const selected = baseColor === preset.color;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(preset.color)}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-transparent bg-[#f7f7f7] p-[7px] text-xs text-(--text-primary)",
                "transition-[filter] hover:brightness-[0.96]",
                selected && "border-(--theme-base)",
              )}
            >
              <span
                aria-hidden="true"
                className="mb-[7px] block h-[52px] w-full rounded-[7px]"
                style={{ background: preset.gradient }}
              />
              {preset.name}
            </button>
          );
        })}
      </div>

      <label htmlFor={hexId} className={sectionLabel}>
        Cor personalizada
      </label>
      <form className="mb-[22px] flex items-center gap-2.5" onSubmit={applyHex} noValidate>
        <input
          type="color"
          aria-label="Selecionar cor no seletor"
          value={baseColor}
          onChange={(event) => setTheme(event.target.value)}
          className="h-[45px] w-12 shrink-0 cursor-pointer rounded-[9px] border border-(--border-color) bg-white p-[3px]"
        />
        <input
          id={hexId}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          placeholder="#0649A8"
          value={hexDraft}
          aria-invalid={hexError ? true : undefined}
          aria-describedby={hexError ? hexErrorId : undefined}
          onChange={(event) => {
            setHexDraft(event.target.value);
            setHexError(null);
          }}
          className={cn(
            "w-full min-w-0 rounded-[9px] border border-(--border-color) p-[11px] uppercase",
            hexError && "border-(--color-danger)",
          )}
        />
        <Button type="submit">Aplicar</Button>
      </form>
      {hexError ? (
        <p id={hexErrorId} role="alert" className="-mt-4 mb-5 text-xs text-(--color-danger)">
          {hexError}
        </p>
      ) : null}

      <span id={paletteLabelId} className={sectionLabel}>
        Escala de cinco tons
      </span>
      <ul aria-labelledby={paletteLabelId} className="mb-[25px] grid grid-cols-5 gap-[5px]">
        {palette.map((tone, index) => (
          <li key={index} className="text-center text-[10px] text-(--text-secondary)">
            <span
              aria-hidden="true"
              className="mb-[5px] block h-[42px] rounded-[7px]"
              style={{ background: tone }}
            />
            <span className="sr-only">Tom {index}: </span>
            {tone.toUpperCase()}
          </li>
        ))}
      </ul>

      <div className="flex justify-between gap-2.5">
        <Button variant="secondary" onClick={resetTheme}>
          Restaurar padrão
        </Button>
        <DialogClose asChild>
          <Button>Concluir</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
