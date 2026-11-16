import { describe, expect, it } from "vitest";
import { InMemoryThemePreferenceRepository } from "./theme-preference.repository";

const now = new Date("2026-11-16T12:00:00Z").toISOString();

describe("InMemoryThemePreferenceRepository", () => {
  it("isola preferências por empresa e colaborador", async () => {
    const repo = new InMemoryThemePreferenceRepository();
    await repo.upsert({ tenantId: "a", bitrixUserId: "1", baseColor: "#137849", updatedAt: now });
    await repo.upsert({ tenantId: "a", bitrixUserId: "2", baseColor: "#B52B77", updatedAt: now });

    expect((await repo.find("a", "1"))?.baseColor).toBe("#137849");
    expect((await repo.find("a", "2"))?.baseColor).toBe("#b52b77");
    expect(await repo.find("b", "1")).toBeNull();
  });

  it("remover a preferência de um colaborador não afeta outro", async () => {
    const repo = new InMemoryThemePreferenceRepository();
    await repo.upsert({ tenantId: "a", bitrixUserId: "1", baseColor: "#137849", updatedAt: now });
    await repo.upsert({ tenantId: "a", bitrixUserId: "2", baseColor: "#b52b77", updatedAt: now });
    await repo.remove("a", "1");

    expect(await repo.find("a", "1")).toBeNull();
    expect(await repo.find("a", "2")).not.toBeNull();
  });
});
