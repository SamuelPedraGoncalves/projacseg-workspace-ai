import { describe, expect, it } from "vitest";
import { getGreeting } from "./greeting";

describe("getGreeting", () => {
  it.each([
    [5, "Bom dia"],
    [11, "Bom dia"],
    [12, "Boa tarde"],
    [17, "Boa tarde"],
    [18, "Boa noite"],
    [23, "Boa noite"],
    [0, "Boa noite"],
    [4, "Boa noite"],
  ])("%ih → %s", (hour, expected) => {
    expect(getGreeting(hour)).toBe(expected);
  });
});
