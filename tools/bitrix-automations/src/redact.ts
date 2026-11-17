/**
 * Anonimização para o material versionado: URLs viram rótulos de host, e-mails, telefones e documentos
 * são removidos, nomes de pessoas configurados viram "[pessoa]" e IDs de usuário viram pseudônimos
 * estáveis. O mapa real (pseudônimo → ID, rótulo → host) fica só no material privado.
 */
export interface RedactorOptions {
  /** Nomes de pessoas que aparecem em títulos e mensagens (lista privada). */
  personNames?: string[];
}

export interface Redactor {
  text(value: unknown): string;
  user(id: string): string;
  users(values: unknown): string[];
  host(url: string): string;
  privateMap(): { users: Record<string, string>; hosts: Record<string, string> };
}

const URL_PATTERN = /https?:\/\/([^\s/"'?#,;)]+)[^\s"'<>,;)\]]*/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE_PATTERN = /\(?\b\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/g;
const DOC_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const USER_PATTERN = /\buser_(\d+)\b/g;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function createRedactor(options: RedactorOptions = {}): Redactor {
  const users = new Map<string, string>();
  const hosts = new Map<string, string>();
  const names = (options.personNames ?? []).filter(Boolean);
  const namePattern = names.length
    ? new RegExp(`\\b(${names.map(escapeRegex).join("|")})\\b`, "gi")
    : null;

  const user = (id: string): string => {
    const key = id.trim();
    let alias = users.get(key);
    if (!alias) {
      alias = `USR-${String(users.size + 1).padStart(2, "0")}`;
      users.set(key, alias);
    }
    return alias;
  };

  const host = (url: string): string => {
    const name = /^https?:\/\/([^\s/"'?#]+)/i.exec(url)?.[1]?.toLowerCase() ?? "desconhecido";
    let alias = hosts.get(name);
    if (!alias) {
      alias = `HOST-${String(hosts.size + 1).padStart(2, "0")}`;
      hosts.set(name, alias);
    }
    return alias;
  };

  const text = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    let result = typeof value === "string" ? value : JSON.stringify(value);
    result = result.replace(URL_PATTERN, (url) => `[url ${host(url)}]`);
    result = result.replace(EMAIL_PATTERN, "[e-mail]");
    result = result.replace(DOC_PATTERN, "[documento]");
    result = result.replace(PHONE_PATTERN, "[telefone]");
    result = result.replace(USER_PATTERN, (match) => user(match));
    if (namePattern) result = result.replace(namePattern, "[pessoa]");
    return result.replace(/\s+/g, " ").trim();
  };

  const usersOf = (values: unknown): string[] => {
    const list = Array.isArray(values) ? values : values ? [values] : [];
    return list
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .map((item) =>
        /^user_\d+$/.test(item)
          ? user(item)
          : item === "{=Document:ASSIGNED_BY_ID}"
            ? "RESPONSÁVEL_DO_NEGÓCIO"
            : text(item),
      );
  };

  return {
    text,
    user,
    users: usersOf,
    host,
    privateMap: () => ({
      users: Object.fromEntries([...users].map(([id, alias]) => [alias, id])),
      hosts: Object.fromEntries([...hosts].map(([name, alias]) => [alias, name])),
    }),
  };
}
