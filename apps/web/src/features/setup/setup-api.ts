import type {
  CalendarView,
  CompanyCalendar,
  DepartmentNode,
  MappingInput,
  MappingView,
  PortalUserRef,
  SetupStatus,
  TermsDocument,
} from "@projacseg/shared";
import { useQuery } from "@tanstack/react-query";
import { usePlatform } from "../../platform/platform-context";

/** Erro HTTP da API, com o corpo devolvido (ex.: `{ errors: [...] }` do mapeamento). */
export class SetupApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `Erro ${status} na API do WorkSeg.`,
    );
  }

  /** Mensagens de validação devolvidas pelo servidor. */
  get errors(): string[] {
    const body = this.body as { errors?: unknown } | null;
    return Array.isArray(body?.errors) ? body.errors.map(String) : [this.message];
  }
}

/** Cliente das rotas `/api/v1/setup/*`. A sessão vai no cabeçalho, nunca na URL. */
export function createSetupApi(session: string, baseUrl = "") {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${baseUrl}/api/v1/setup${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${session}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) throw new SetupApiError(response.status, data);
    return data as T;
  }

  return {
    status: () => request<SetupStatus>("GET", ""),
    terms: () => request<TermsDocument>("GET", "/terms"),
    acceptTerms: (version: string) => request<{ ok: true }>("POST", "/terms/accept", { version }),
    privacyNotice: () => request<TermsDocument>("GET", "/privacy-notice"),
    markPrivacyNoticeSeen: () => request<{ ok: true }>("POST", "/privacy-notice/seen"),
    claimAdmin: () => request<{ ok: true }>("POST", "/claim-admin"),
    editors: () => request<{ editors: PortalUserRef[] }>("GET", "/editors"),
    saveEditors: (editors: PortalUserRef[]) =>
      request<{ ok: true }>("PUT", "/editors", { editors }),
    mapping: () => request<MappingView>("GET", "/mapping"),
    saveMapping: (input: MappingInput) => request<{ ok: true }>("PUT", "/mapping", input),
    calendar: () => request<CalendarView>("GET", "/calendar"),
    importCalendar: () => request<CalendarView>("POST", "/calendar/import"),
    saveCalendar: (calendar: CompanyCalendar) =>
      request<CalendarView>("PUT", "/calendar", calendar),
    structure: () =>
      request<{ source: "bitrix24"; departments: DepartmentNode[] }>("GET", "/structure"),
  };
}

export type SetupApi = ReturnType<typeof createSetupApi>;

/** Cliente da API para a sessão atual; `null` na demonstração. */
export function useSetupApi(): SetupApi | null {
  const { session } = usePlatform();
  return session ? createSetupApi(session) : null;
}

export const SETUP_STATUS_KEY = ["setup"] as const;

/** Situação do primeiro acesso e acesso do usuário. Desligado na demonstração. */
export function useSetupStatus() {
  const api = useSetupApi();
  return useQuery({
    queryKey: SETUP_STATUS_KEY,
    queryFn: () => api!.status(),
    enabled: api !== null,
    staleTime: 30_000,
  });
}
