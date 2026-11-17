import { describe, expect, it, vi } from "vitest";
import { TokenCipher } from "../../security/token-cipher";
import { createMemoryStore } from "../../store/memory-store";
import { DOMAIN, ENCRYPTION_KEY, at, fakeRest, seedTenant } from "../../test/helpers";
import { CrmReader, pickFields } from "./crm-reader";
import { Bitrix24Portal } from "./portal";
import { Bitrix24ApiError } from "./rest-client";

const cipher = new TokenCipher(ENCRYPTION_KEY);

describe("Bitrix24Portal", () => {
  it("renova o token vencido antes de chamar e guarda o novo criptografado", async () => {
    const store = createMemoryStore();
    const tenant = await seedTenant(store, { tokenExpiresAt: at("2026-11-16T09:00:00Z") });
    const rest = fakeRest({ "crm.deal.get": { ID: "1" } });
    const oauth = {
      refresh: vi.fn(async () => ({
        accessToken: "novo-access",
        refreshToken: "novo-refresh",
        expiresAt: at("2026-11-16T11:00:00Z"),
      })),
    };
    const portal = new Bitrix24Portal(store, cipher, rest.client, oauth, () =>
      at("2026-11-16T10:00:00Z"),
    );

    await portal.call(tenant, "crm.deal.get", { id: 1 });
    expect(oauth.refresh).toHaveBeenCalledWith("refresh-1");
    expect(rest.calls[0]?.token).toBe("novo-access");
    const saved = await store.tenants.findById(tenant.id);
    expect(cipher.decrypt(saved!.accessTokenEnc!)).toBe("novo-access");
  });

  it("renova e repete uma vez quando o portal diz que o token expirou", async () => {
    const store = createMemoryStore();
    const tenant = await seedTenant(store);
    let first = true;
    const rest = fakeRest({
      "user.get": () => {
        if (first) {
          first = false;
          return new Bitrix24ApiError("user.get", "expired_token", 401);
        }
        return [{ NAME: "Ok" }];
      },
    });
    const oauth = {
      refresh: vi.fn(async () => ({
        accessToken: "a2",
        refreshToken: "r2",
        expiresAt: at("2030-01-01T00:00:00Z"),
      })),
    };
    const portal = new Bitrix24Portal(store, cipher, rest.client, oauth);
    const response = await portal.call(tenant, "user.get", {});
    expect(response.result).toEqual([{ NAME: "Ok" }]);
    expect(oauth.refresh).toHaveBeenCalledTimes(1);
  });

  it("percorre todas as páginas", async () => {
    const store = createMemoryStore();
    const tenant = await seedTenant(store);
    const pages: Record<number, { items: number[]; next?: number }> = {
      0: { items: [1, 2], next: 2 },
      2: { items: [3] },
    };
    const portal = new Bitrix24Portal(
      store,
      cipher,
      {
        call: async <T>(_e: string, _m: string, params: Record<string, unknown>) => {
          const page = pages[Number(params.start)]!;
          return { result: page.items as T, ...(page.next ? { next: page.next } : {}) };
        },
      },
      null,
    );
    expect(await portal.callAll(tenant, "crm.deal.list", {})).toEqual([1, 2, 3]);
  });
});

describe("CrmReader.toSnapshot", () => {
  it("resolve nomes de pipeline, etapa, responsável e campos de lista mapeados", async () => {
    const store = createMemoryStore();
    const tenant = await seedTenant(store, {
      config: {
        calendar: (await seedTenant(createMemoryStore())).config.calendar,
        fieldMapping: { branch: "UF_CRM_RAMO", insuranceType: "UF_CRM_TIPO" },
        digestTime: "08:00",
        aiEnabled: false,
      },
    });
    const rest = fakeRest({
      "crm.category.list": {
        categories: [
          { id: 0, name: "Automóvel" },
          { id: 3, name: "Demais Ramos" },
        ],
      },
      "crm.status.list": (params: Record<string, unknown>) =>
        (params.filter as { ENTITY_ID: string }).ENTITY_ID === "DEAL_STAGE_3"
          ? [{ STATUS_ID: "C3:PREPARATION", NAME: "Proposta transmitida" }]
          : [{ STATUS_ID: "NEW", NAME: "Novo" }],
      "crm.deal.fields": {
        UF_CRM_RAMO: { type: "enumeration", items: [{ ID: "45", VALUE: "Empresarial" }] },
        UF_CRM_TIPO: { type: "string" },
      },
      "user.get": [{ NAME: "Lucas", LAST_NAME: "Carvalho" }],
    });
    const reader = new CrmReader(new Bitrix24Portal(store, cipher, rest.client, null));
    const deal = await reader.toSnapshot(tenant, {
      ID: "77",
      TITLE: "Empresa Martins",
      CATEGORY_ID: "3",
      STAGE_ID: "C3:PREPARATION",
      ASSIGNED_BY_ID: "7",
      CLOSED: "N",
      MOVED_TIME: "2026-11-16T10:00:00-03:00",
      UF_CRM_RAMO: "45",
      UF_CRM_TIPO: "Novo",
    });
    expect(deal).toEqual({
      dealId: "77",
      title: "Empresa Martins",
      categoryId: "3",
      categoryName: "Demais Ramos",
      stageId: "C3:PREPARATION",
      stageName: "Proposta transmitida",
      stageEnteredAt: at("2026-11-16T10:00:00-03:00"),
      assignedById: "7",
      responsibleName: "Lucas Carvalho",
      branch: "Empresarial",
      insuranceType: "Novo",
      closed: false,
    });
    expect(rest.calls.every((call) => call.endpoint === `https://${DOMAIN}/rest/`)).toBe(true);
  });

  it("lê só os campos das regras, com valores crus normalizados", () => {
    expect(
      pickFields(
        {
          ID: "1",
          UF_CRM_LISTA: ["3", 5],
          UF_CRM_DATA: "2026-11-30T00:00:00+03:00",
          UF_CRM_VAZIO: "",
          UF_CRM_ARQUIVO: { id: 9 },
          UF_CRM_NAO_PEDIDO: "x",
        },
        ["UF_CRM_LISTA", "UF_CRM_DATA", "UF_CRM_VAZIO", "UF_CRM_ARQUIVO", "UF_CRM_AUSENTE"],
      ),
    ).toEqual({
      UF_CRM_LISTA: ["3", "5"],
      UF_CRM_DATA: ["2026-11-30T00:00:00+03:00"],
      UF_CRM_VAZIO: [],
      UF_CRM_ARQUIVO: [],
      UF_CRM_AUSENTE: [],
    });
  });
});
