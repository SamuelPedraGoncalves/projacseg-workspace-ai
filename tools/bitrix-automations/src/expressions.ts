/**
 * Interpretação das expressões de prazo e pausa do Bitrix24, por exemplo:
 *   {{=dateadd({=System:NowLocal},"12d")}}
 *   =workdateadd({=System:Now},"2d",{=Document:ASSIGNED_BY_ID})
 *   {{=workdateadd({=Document:UF_CRM_1675339617},"-15d")}}
 * Nada é avaliado: só reconhecemos o padrão e extraímos quantidade, unidade, calendário e âncora.
 */

export type DurationUnit = "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";

export interface ParsedDuration {
  amount: number;
  unit: DurationUnit;
  /** `business` = workdateadd (calendário de trabalho do usuário); `calendar` = dateadd. */
  calendar: "business" | "calendar";
  /** "now" ou o campo do negócio usado como ponto de partida. */
  anchor: string;
  raw: string;
}

const UNITS: Record<string, DurationUnit> = {
  s: "seconds",
  i: "minutes",
  h: "hours",
  d: "days",
  w: "weeks",
  m: "months",
  y: "years",
};

const LABEL: Record<DurationUnit, [string, string]> = {
  seconds: ["segundo", "segundos"],
  minutes: ["minuto", "minutos"],
  hours: ["hora", "horas"],
  days: ["dia", "dias"],
  weeks: ["semana", "semanas"],
  months: ["mês", "meses"],
  years: ["ano", "anos"],
};

const PATTERN = /(workdateadd|dateadd)\(\s*\{=([^}]+)\}\s*,\s*"(-?\d+(?:\.\d+)?)\s*([a-z])"/i;

export function parseDurationExpression(expression: unknown): ParsedDuration | null {
  if (typeof expression !== "string" || !expression.trim()) return null;
  const match = PATTERN.exec(expression);
  if (!match) return null;
  const unit = UNITS[match[4]!.toLowerCase()];
  if (!unit) return null;
  const source = match[2]!;
  return {
    amount: Number(match[3]),
    unit,
    calendar: match[1]!.toLowerCase() === "workdateadd" ? "business" : "calendar",
    anchor: /^System:(Now|NowLocal|Date)$/.test(source) ? "now" : source.replace(/^Document:/, ""),
    raw: expression.trim(),
  };
}

/** Pausa fixa (TimeoutDuration + TimeoutDurationType: s, m=minutos, h, d). */
export function parseFixedDelay(duration: unknown, type: unknown): ParsedDuration | null {
  const amount = Number(duration);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const map: Record<string, DurationUnit> = { s: "seconds", m: "minutes", h: "hours", d: "days" };
  const unit = map[String(type ?? "s").toLowerCase()] ?? "seconds";
  return {
    amount,
    unit,
    calendar: "calendar",
    anchor: "now",
    raw: `${amount}${String(type ?? "")}`,
  };
}

const FEMININE = new Set<DurationUnit>(["hours", "weeks"]);

export function formatDuration(duration: ParsedDuration | null): string {
  if (!duration) return "sem prazo";
  const amount = Math.abs(duration.amount);
  const [one, many] = LABEL[duration.unit];
  const plural = amount !== 1;
  const calendar =
    duration.calendar === "business"
      ? plural
        ? " úteis"
        : " útil"
      : `${FEMININE.has(duration.unit) ? " corrida" : " corrido"}${plural ? "s" : ""}`;
  const anchor =
    duration.anchor === "now"
      ? ""
      : duration.amount < 0
        ? ` antes de ${duration.anchor}`
        : ` após ${duration.anchor}`;
  return `${amount} ${plural ? many : one}${calendar}${anchor}`;
}
