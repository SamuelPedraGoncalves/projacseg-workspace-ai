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
