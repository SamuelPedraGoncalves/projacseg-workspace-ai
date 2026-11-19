import { businessCalendarSchema, type BusinessCalendar } from "@projacseg/engine";
import type { TenantRecord } from "../../store/types";
import type { Bitrix24Portal } from "./portal";

/** Campos usados de `calendar.settings.get` (configurações gerais do calendário do portal). */
export interface CalendarSettings {
  /** Início do expediente: número (9) ou texto ("9", "9.30", "9:30"). */
  work_time_start?: string | number;
  work_time_end?: string | number;
  /** Folgas da semana: MO, TU, WE, TH, FR, SA, SU. */
  week_holidays?: string[];
  /** Feriados que se repetem todo ano: "DD.MM,DD.MM". */
  year_holidays?: string;
  /** Dias úteis extras no mesmo formato (desfazem um feriado). */
  year_workdays?: string;
}

const DEFAULT_START = "08:00";
const DEFAULT_END = "18:00";
const DEFAULT_WORKDAYS = [1, 2, 3, 4, 5];
const WEEKDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** "9", 9, "9.30", "9:30" → "09:00"/"09:30"; inválido → `null`. */
function toTime(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const match = /^(\d{1,2})(?:[.:](\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "01.01,25.12" → ["01-01", "12-25"] (mês-dia), ignorando itens inválidos. */
function monthDays(list: string | undefined): string[] {
  return (list ?? "")
    .split(",")
    .map((item) => /^(\d{1,2})\.(\d{1,2})$/.exec(item.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(([, day, month]) => `${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`);
}

/**
 * Converte as configurações do calendário do Bitrix24 no calendário útil do motor. Pura e
 * determinística: o que faltar ou vier estranho cai no padrão (seg–sex, 8h–18h, sem feriados).
 */
export function toBusinessCalendar(
  settings: CalendarSettings,
  years: number[],
  utcOffsetMinutes: number,
): BusinessCalendar {
  let workStart = toTime(settings.work_time_start) ?? DEFAULT_START;
  let workEnd = toTime(settings.work_time_end) ?? DEFAULT_END;
  if (workEnd <= workStart) {
    workStart = DEFAULT_START;
    workEnd = DEFAULT_END;
  }

  const off = new Set(
    (settings.week_holidays ?? [])
      .map((code) => WEEKDAY[code.toUpperCase()])
      .filter((day): day is number => day !== undefined),
  );
  const workdays =
    off.size === 0 ? DEFAULT_WORKDAYS : [0, 1, 2, 3, 4, 5, 6].filter((day) => !off.has(day));

  const extraWorkdays = new Set(monthDays(settings.year_workdays));
  const holidays = years.flatMap((year) =>
    monthDays(settings.year_holidays)
      .filter((monthDay) => !extraWorkdays.has(monthDay))
      .map((monthDay) => `${year}-${monthDay}`),
  );

  return businessCalendarSchema.parse({
    utcOffsetMinutes,
    workdays: workdays.length > 0 ? workdays : DEFAULT_WORKDAYS,
    workStart,
    workEnd,
    holidays: [...new Set(holidays)].sort(),
  });
}

/** Lê o calendário do portal (escopo `calendar`). Feriados do ano corrente e do seguinte. */
export async function readCompanyCalendar(
  portal: Bitrix24Portal,
  tenant: TenantRecord,
  now: Date,
): Promise<BusinessCalendar> {
  const response = await portal.call<CalendarSettings>(tenant, "calendar.settings.get", {});
  const year = now.getUTCFullYear();
  return toBusinessCalendar(
    response.result ?? {},
    [year, year + 1],
    tenant.config.calendar.utcOffsetMinutes,
  );
}
