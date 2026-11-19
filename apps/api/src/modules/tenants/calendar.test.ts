import { DEFAULT_CALENDAR } from "@projacseg/engine";
import { describe, expect, it } from "vitest";
import { DEFAULT_TENANT_CONFIG } from "./tenant-config";
import { effectiveCalendar, keepRecurringStillPresent } from "./calendar";

describe("calendário efetivo da corretora", () => {
  it("expande os feriados recorrentes para o ano corrente e os vizinhos, em qualquer ano", () => {
    const config = {
      ...DEFAULT_TENANT_CONFIG,
      calendar: { ...DEFAULT_CALENDAR, holidays: ["2026-11-20"] },
      recurringHolidays: ["12-25"],
    };
    const calendar = effectiveCalendar(config, new Date("2028-06-01T12:00:00Z"));
    expect(calendar.holidays).toEqual(["2026-11-20", "2027-12-25", "2028-12-25", "2029-12-25"]);
  });

  it("sem feriados recorrentes, devolve o calendário gravado", () => {
    const calendar = effectiveCalendar(DEFAULT_TENANT_CONFIG, new Date());
    expect(calendar).toBe(DEFAULT_TENANT_CONFIG.calendar);
  });

  it("ajuste manual: só continua recorrente o feriado que ficou na lista salva", () => {
    expect(
      keepRecurringStillPresent(
        ["01-01", "12-25"],
        ["2026-01-01", "2026-04-21"],
        new Date("2026-06-01T12:00:00Z"),
      ),
    ).toEqual(["01-01"]);
  });
});
