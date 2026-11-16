import { afterEach, describe, expect, it, vi } from "vitest";
import { readWorkspaceSession } from "../../platform/platform";
import { ApiJourneyRepository, JourneyApiError } from "./deals-repository";

afterEach(() => vi.unstubAllGlobals());

describe("ApiJourneyRepository", () => {
  it("lê o painel com a sessão do Workspace", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            deals: [],
            summary: {},
            briefing: "ok",
            generatedAt: "2026-11-16T10:00:00Z",
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const data = await new ApiJourneyRepository("sessao-123").getJourney();
    expect(data.briefing).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/journey", {
      headers: { Authorization: "Bearer sessao-123" },
    });
  });

  it("sessão expirada vira erro explicável", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    const error = await new ApiJourneyRepository("x")
      .getJourney()
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(JourneyApiError);
    expect((error as Error).message).toMatch(/Sessão expirada/);
  });
});

describe("readWorkspaceSession", () => {
  it("lê a meta tag injetada pelo backend", () => {
    const doc = document.implementation.createHTMLDocument();
    expect(readWorkspaceSession(doc)).toBeNull();
    const meta = doc.createElement("meta");
    meta.name = "workspace-session";
    meta.content = "abc.def";
    doc.head.appendChild(meta);
    expect(readWorkspaceSession(doc)).toBe("abc.def");
  });
});
