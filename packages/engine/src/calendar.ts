import { z } from "zod";

/**
 * Calendário útil de uma empresa. O fuso é um deslocamento fixo em minutos (Brasília = -180; o
 * Brasil não tem horário de verão desde 2019), o que mantém o cálculo 100% determinístico.
 */
export const businessCalendarSchema = z.object({
  utcOffsetMinutes: z.number().int().min(-720).max(840),
  /** Dias úteis: 0 = domingo … 6 = sábado. */
  workdays: z.array(z.number().int().min(0).max(6)).min(1),
  workStart: z.string().regex(/^\d{2}:\d{2}$/),
  workEnd: z.string().regex(/^\d{2}:\d{2}$/),
  /** Feriados em data local, "AAAA-MM-DD". */
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export type BusinessCalendar = z.infer<typeof businessCalendarSchema>;

export const durationSchema = z.object({
  amount: z.number().nonnegative(),
  unit: z.enum(["minutes", "hours", "calendar_days", "business_hours", "business_days"]),
});

export type Duration = z.infer<typeof durationSchema>;

/** Padrão inicial (a confirmar com a ProjacSeg): seg–sex, 8h–18h, horário de Brasília. */
export const DEFAULT_CALENDAR: BusinessCalendar = {
  utcOffsetMinutes: -180,
  workdays: [1, 2, 3, 4, 5],
  workStart: "08:00",
  workEnd: "18:00",
  holidays: [],
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * 60 + minutes;
}

/** Data/hora local representada como um `Date` "deslocado" (campos UTC = campos locais). */
function toLocal(date: Date, calendar: BusinessCalendar): Date {
  return new Date(date.getTime() + calendar.utcOffsetMinutes * MINUTE);
}

function fromLocal(local: Date, calendar: BusinessCalendar): Date {
  return new Date(local.getTime() - calendar.utcOffsetMinutes * MINUTE);
}

/** "AAAA-MM-DD" da data local. */
export function localDateKey(date: Date, calendar: BusinessCalendar): string {
  return toLocal(date, calendar).toISOString().slice(0, 10);
}

function startOfLocalDay(local: Date): Date {
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function isBusinessDay(date: Date, calendar: BusinessCalendar): boolean {
  const local = toLocal(date, calendar);
  return (
    calendar.workdays.includes(local.getUTCDay()) &&
    !calendar.holidays.includes(local.toISOString().slice(0, 10))
  );
}

/** Dias úteis locais entre duas datas (diferença de calendário útil; 0 = mesmo dia). */
function isBusinessLocalDay(localDay: Date, calendar: BusinessCalendar): boolean {
  return (
    calendar.workdays.includes(localDay.getUTCDay()) &&
    !calendar.holidays.includes(localDay.toISOString().slice(0, 10))
  );
}

function nextBusinessLocalDay(localDay: Date, calendar: BusinessCalendar): Date {
  let day = new Date(localDay.getTime() + DAY);
  for (let guard = 0; guard < 3660 && !isBusinessLocalDay(day, calendar); guard += 1) {
    day = new Date(day.getTime() + DAY);
  }
  return day;
}

/**
 * Soma uma duração a partir de `start`.
 * - minutes / hours / calendar_days: tempo corrido.
 * - business_hours: consome apenas minutos dentro do expediente dos dias úteis.
 * - business_days: fim do expediente do N-ésimo dia útil após a data de início
 *   (N = 0: fim do expediente do próprio dia, ou do próximo dia útil).
 */
export function addDuration(start: Date, duration: Duration, calendar: BusinessCalendar): Date {
  const { amount, unit } = duration;
  switch (unit) {
    case "minutes":
      return new Date(start.getTime() + amount * MINUTE);
    case "hours":
      return new Date(start.getTime() + amount * 60 * MINUTE);
    case "calendar_days":
      return new Date(start.getTime() + amount * DAY);
    case "business_days":
      return addBusinessDays(start, Math.floor(amount), calendar);
    case "business_hours":
      return addBusinessMinutes(start, Math.round(amount * 60), calendar);
  }
}

function addBusinessDays(start: Date, days: number, calendar: BusinessCalendar): Date {
  let day = startOfLocalDay(toLocal(start, calendar));
  if (!isBusinessLocalDay(day, calendar)) day = nextBusinessLocalDay(day, calendar);
  for (let count = 0; count < days; count += 1) day = nextBusinessLocalDay(day, calendar);
  return fromLocal(new Date(day.getTime() + toMinutes(calendar.workEnd) * MINUTE), calendar);
}

function addBusinessMinutes(start: Date, minutes: number, calendar: BusinessCalendar): Date {
  const open = toMinutes(calendar.workStart);
  const close = toMinutes(calendar.workEnd);
  let local = toLocal(start, calendar);
  let remaining = minutes;

  for (let guard = 0; guard < 100_000; guard += 1) {
    const day = startOfLocalDay(local);
    const minuteOfDay = (local.getTime() - day.getTime()) / MINUTE;

    if (!isBusinessLocalDay(day, calendar) || minuteOfDay >= close) {
      local = new Date(nextBusinessLocalDay(day, calendar).getTime() + open * MINUTE);
      continue;
    }
    const from = Math.max(minuteOfDay, open);
    const available = close - from;
    if (remaining <= available) {
      return fromLocal(new Date(day.getTime() + (from + remaining) * MINUTE), calendar);
    }
    remaining -= available;
    local = new Date(nextBusinessLocalDay(day, calendar).getTime() + open * MINUTE);
  }
  throw new Error("Calendário sem dias úteis suficientes.");
}

/** Diferença em dias de calendário locais (b - a). */
export function localDayDiff(a: Date, b: Date, calendar: BusinessCalendar): number {
  const dayA = startOfLocalDay(toLocal(a, calendar)).getTime();
  const dayB = startOfLocalDay(toLocal(b, calendar)).getTime();
  return Math.round((dayB - dayA) / DAY);
}

/** "HH:MM" local. */
export function localTime(date: Date, calendar: BusinessCalendar): string {
  return toLocal(date, calendar).toISOString().slice(11, 16);
}

/** Momento do dia local (ex.: 08:00) para uma data — usado no agendamento do resumo diário. */
export function atLocalTime(date: Date, time: string, calendar: BusinessCalendar): Date {
  const day = startOfLocalDay(toLocal(date, calendar));
  return fromLocal(new Date(day.getTime() + toMinutes(time) * MINUTE), calendar);
}
