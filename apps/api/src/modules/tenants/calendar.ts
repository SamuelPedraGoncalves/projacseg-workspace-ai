import type { BusinessCalendar } from "@projacseg/engine";
import type { TenantConfig } from "../../store/types";

/**
 * Calendário usado pelo motor e pelo painel: o gravado mais os feriados que se repetem todo ano,
 * expandidos para o ano anterior, o corrente e o seguinte. Assim o calendário lido do Bitrix24 não
 * "congela" nos anos em que foi importado.
 */
export function effectiveCalendar(config: TenantConfig, now: Date): BusinessCalendar {
  const recurring = config.recurringHolidays ?? [];
  if (recurring.length === 0) return config.calendar;
  const year = now.getUTCFullYear();
  const expanded = [year - 1, year, year + 1].flatMap((item) =>
    recurring.map((monthDay) => `${item}-${monthDay}`),
  );
  return {
    ...config.calendar,
    holidays: [...new Set([...config.calendar.holidays, ...expanded])].sort(),
  };
}

/**
 * Ajuste manual na tela: o feriado recorrente continua recorrente só se a data dele no ano corrente
 * ficou na lista salva (se a pessoa o removeu, ele deixa de valer).
 */
export function keepRecurringStillPresent(
  recurring: string[],
  savedHolidays: string[],
  now: Date,
): string[] {
  const year = now.getUTCFullYear();
  return recurring.filter((monthDay) => savedHolidays.includes(`${year}-${monthDay}`));
}
