/**
 * Contratos da API de primeiro acesso e Configurações (`/api/v1/setup/*`). Só tipos: a validação
 * fica no servidor.
 */

/** Passo do primeiro acesso em que o usuário está. `waiting_admin`: só o administrador avança. */
export type SetupStep = "terms" | "editors" | "mapping" | "done" | "waiting_admin";

export interface SetupAccess {
  admin: boolean;
  ruleEditor: boolean;
  /** Vê a área Configurações. */
  settings: boolean;
}

export interface SetupStatus {
  step: SetupStep;
  access: SetupAccess;
  terms: { version: string; provisional: boolean; accepted: boolean };
  /** O usuário ainda não viu o aviso curto de privacidade. */
  privacyNoticePending: boolean;
}

/** Termos ou aviso. `body`: parágrafos separados por linha em branco. */
export interface TermsDocument {
  version: string;
  provisional: boolean;
  title: string;
  body: string;
}

/** Usuário do portal Bitrix24 (ID e nome para exibição). */
export interface PortalUserRef {
  id: string;
  name: string;
}

/** Funis e campos do negócio disponíveis no portal, para o mapeamento. */
export interface MappingCatalog {
  categories: { id: string; name: string }[];
  fields: { code: string; label: string; type: string; items?: { id: string; value: string }[] }[];
}

/** O que a corretora confirma no mapeamento. */
export interface MappingInput {
  fieldMapping: {
    insuranceType: string;
    branch: string;
    validity?: string;
    cpf?: string;
    quoteNumber?: string;
    lossReason?: string;
  };
  situations: { categoryIds: string[]; newBusinessValues: string[]; renewalValues: string[] };
}

/** Sugestão parcial (só o que foi reconhecido pelos rótulos). */
export interface MappingSuggestion {
  fieldMapping: Partial<MappingInput["fieldMapping"]>;
  situations: Partial<MappingInput["situations"]>;
}

export interface MappingView {
  catalog: MappingCatalog;
  current: MappingInput | null;
  suggestion: MappingSuggestion;
  confirmed: boolean;
}

/** Calendário útil da corretora (mesmo formato do motor de regras). */
export interface CompanyCalendar {
  utcOffsetMinutes: number;
  /** 0 = domingo … 6 = sábado. */
  workdays: number[];
  workStart: string;
  workEnd: string;
  /** "AAAA-MM-DD". */
  holidays: string[];
}

export type CalendarSource = "bitrix24" | "default" | "manual" | "file";

export interface CalendarView {
  calendar: CompanyCalendar;
  source: CalendarSource;
}

/** Departamento da estrutura da empresa, com o chefe e os subdepartamentos. */
export interface DepartmentNode {
  id: string;
  name: string;
  head: PortalUserRef | null;
  children: DepartmentNode[];
}
