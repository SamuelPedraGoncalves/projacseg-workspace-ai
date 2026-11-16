/**
 * Respostas PREDEFINIDAS da demonstração. Não há IA conectada: o texto é escolhido por palavras-chave
 * e a interface sempre identifica essas mensagens como demonstrativas.
 */
export function getDemoWelcome(userName: string): string {
  return (
    `Olá, ${userName}! Esta é a demonstração do seu assistente operacional. Posso apresentar ` +
    "suas prioridades e pendências fictícias."
  );
}

const RULES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ["teleport"],
    reply:
      "Na demonstração, a Empresa Martins possui um cadastro no Teleport em atraso. Na versão " +
      "integrada, o superior seria notificado automaticamente.",
  },
  {
    keywords: ["atraso", "atrasad", "risco", "vencid"],
    reply:
      "Na demonstração, existem três negócios classificados como risco: Carlos Almeida, Empresa " +
      "Martins e Roberto Lima.",
  },
  {
    keywords: ["aguardando", "seguradora", "terceiro"],
    reply: "Na demonstração, a Clínica Oliveira está aguardando a emissão pela seguradora.",
  },
];

const DEFAULT_REPLY =
  "Suas prioridades demonstrativas são: enviar a cotação de Carlos Almeida, cadastrar a Empresa " +
  "Martins no Teleport e realizar o follow-up de Roberto Lima.";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function getDemoReply(message: string): string {
  const text = normalize(message);
  const rule = RULES.find(({ keywords }) => keywords.some((keyword) => text.includes(keyword)));
  return rule?.reply ?? DEFAULT_REPLY;
}
