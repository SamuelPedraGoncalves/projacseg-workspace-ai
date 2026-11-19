import { describe, expect, it } from "vitest";
import { toBusinessCalendar } from "./company-calendar";

const YEARS = [2026, 2027];

describe("calendário da empresa a partir de calendar.settings.get", () => {
  it("expediente, folgas da semana e feriados do ano", () => {
    expect(
      toBusinessCalendar(
        {
          work_time_start: "9",
          work_time_end: "18.30",
          week_holidays: ["SA", "SU"],
          year_holidays: "01.01,25.12",
        },
        YEARS,
        -180,
      ),
    ).toEqual({
      utcOffsetMinutes: -180,
      workdays: [1, 2, 3, 4, 5],
      workStart: "09:00",
      workEnd: "18:30",
      holidays: ["2026-01-01", "2026-12-25", "2027-01-01", "2027-12-25"],
    });
  });

  it("hora como número e com dois-pontos", () => {
    const calendar = toBusinessCalendar(
      { work_time_start: 8, work_time_end: "17:45" },
      YEARS,
      -180,
    );
    expect(calendar).toMatchObject({ workStart: "08:00", workEnd: "17:45" });
  });

  it("sem dados: segunda a sexta, 8h às 18h, sem feriados", () => {
    expect(toBusinessCalendar({}, YEARS, -180)).toEqual({
      utcOffsetMinutes: -180,
      workdays: [1, 2, 3, 4, 5],
      workStart: "08:00",
      workEnd: "18:00",
      holidays: [],
    });
  });

  it("listas vazias ou valores estranhos caem nos padrões", () => {
    const calendar = toBusinessCalendar(
      {
        work_time_start: "abc",
        work_time_end: "25",
        week_holidays: [],
        year_holidays: "",
      },
      YEARS,
      -180,
    );
    expect(calendar).toMatchObject({
      workdays: [1, 2, 3, 4, 5],
      workStart: "08:00",
      workEnd: "18:00",
      holidays: [],
    });
  });

  it("sábado de trabalho e dia útil extra num feriado", () => {
    const calendar = toBusinessCalendar(
      { week_holidays: ["SU"], year_holidays: "01.01,02.11", year_workdays: "02.11" },
      [2026],
      -180,
    );
    expect(calendar.workdays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(calendar.holidays).toEqual(["2026-01-01"]);
  });

  it("fim antes do início volta ao padrão", () => {
    const calendar = toBusinessCalendar({ work_time_start: "19", work_time_end: "9" }, YEARS, -180);
    expect(calendar).toMatchObject({ workStart: "08:00", workEnd: "18:00" });
  });
});
