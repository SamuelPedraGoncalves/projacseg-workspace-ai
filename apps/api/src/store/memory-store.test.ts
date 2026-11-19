import { describe, it } from "vitest";
import { createMemoryStore } from "./memory-store";
import { checkRolesConsentsAndInstaller } from "./store-contract";

describe("armazenamento em memória", () => {
  it("papéis, aceites e instalador", async () => {
    await checkRolesConsentsAndInstaller(createMemoryStore(), "membro-contrato");
  });
});
