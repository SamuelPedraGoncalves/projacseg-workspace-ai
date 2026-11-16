import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALENDAR,
  addDuration,
  atLocalTime,
  isBusinessDay,
  localDateKey,
  localDayDiff,
  localTime,
  type BusinessCalendar,
} from "./calendar";

// 16/11/2026 é uma segunda-feira. Horários em Brasília (-03:00).
const at = (iso: string) => new Date(iso);
const cal: BusinessCalendar = { ...DEFAULT_CALENDAR, holidays: ["2026-11-20"] }; // sexta: feriado

describe("calendário útil", () => {
  it("reconhece dias úteis, fins de semana e feriados", () => {
    expect(isBusinessDay(at("2026-11-16T10:00:00-03:00"), cal)).toBe(true);
    expect(isBusinessDay(at("2026-11-20T10:00:00-03:00"), cal)).toBe(false);
    expect(isBusinessDay(at("2026-11-21T10:00:00-03:00"), cal)).toBe(false);
  });

  it("usa a data local, não a UTC", () => {
    // 23h de segunda em Brasília = 02h de terça em UTC
    expect(localDateKey(at("2026-11-16T23:00:00-03:00"), cal)).toBe("2026-11-16");
    expect(localTime(at("2026-11-16T23:00:00-03:00"), cal)).toBe("23:00");
  });

  it("tempo corrido", () => {
    expect(addDuration(at("2026-11-16T10:00:00-03:00"), { amount: 2, unit: "hours" }, cal)).toEqual(
      at("2026-11-16T12:00:00-03:00"),
    );
    expect(
      addDuration(at("2026-11-16T10:00:00-03:00"), { amount: 1, unit: "calendar_days" }, cal),
    ).toEqual(at("2026-11-17T10:00:00-03:00"));
  });

  it("dias úteis terminam no fim do expediente", () => {
    const monday = at("2026-11-16T10:00:00-03:00");
    expect(addDuration(monday, { amount: 0, unit: "business_days" }, cal)).toEqual(
      at("2026-11-16T18:00:00-03:00"),
    );
    expect(addDuration(monday, { amount: 2, unit: "business_days" }, cal)).toEqual(
      at("2026-11-18T18:00:00-03:00"),
    );
  });

  it("dias úteis pulam feriado e fim de semana", () => {
    const thursday = at("2026-11-19T10:00:00-03:00");
    // sexta é feriado, sábado e domingo não contam → segunda 23/11
    expect(addDuration(thursday, { amount: 1, unit: "business_days" }, cal)).toEqual(
      at("2026-11-23T18:00:00-03:00"),
    );
  });

  it("início em fim de semana conta a partir do próximo dia útil", () => {
    expect(
      addDuration(at("2026-11-22T10:00:00-03:00"), { amount: 0, unit: "business_days" }, cal),
    ).toEqual(at("2026-11-23T18:00:00-03:00"));
  });

  it("horas úteis dentro do mesmo dia", () => {
    expect(
      addDuration(at("2026-11-16T10:00:00-03:00"), { amount: 4, unit: "business_hours" }, cal),
    ).toEqual(at("2026-11-16T14:00:00-03:00"));
  });

  it("horas úteis atravessam a noite", () => {
    expect(
      addDuration(at("2026-11-16T16:00:00-03:00"), { amount: 4, unit: "business_hours" }, cal),
    ).toEqual(at("2026-11-17T10:00:00-03:00"));
  });

  it("horas úteis começam no expediente quando o início é de madrugada", () => {
    expect(
      addDuration(at("2026-11-16T06:00:00-03:00"), { amount: 1, unit: "business_hours" }, cal),
    ).toEqual(at("2026-11-16T09:00:00-03:00"));
  });

  it("horas úteis atravessam feriado e fim de semana", () => {
    expect(
      addDuration(at("2026-11-19T17:00:00-03:00"), { amount: 2, unit: "business_hours" }, cal),
    ).toEqual(at("2026-11-23T09:00:00-03:00"));
  });

  it("diferença de dias locais e horário fixo do dia", () => {
    expect(
      localDayDiff(at("2026-11-16T23:30:00-03:00"), at("2026-11-17T00:30:00-03:00"), cal),
    ).toBe(1);
    expect(atLocalTime(at("2026-11-16T15:00:00-03:00"), "08:00", cal)).toEqual(
      at("2026-11-16T08:00:00-03:00"),
    );
  });
});
