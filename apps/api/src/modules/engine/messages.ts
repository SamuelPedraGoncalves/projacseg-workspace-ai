import { localDateKey, localTime, type BusinessCalendar } from "@projacseg/engine";

/** Textos das mensagens do motor. Fixos e determinísticos — não são gerados por IA. */

function when(date: Date, calendar: BusinessCalendar): string {
  const [year, month, day] = localDateKey(date, calendar).split("-");
  return `${day}/${month}/${year} às ${localTime(date, calendar)}`;
}

export function dealLink(domain: string, dealId: string, title: string): string {
  return `[URL=https://${domain}/crm/deal/details/${dealId}/]${title}[/URL]`;
}

export const engineMessages = {
  atRisk: (action: string, deal: string, dueAt: Date, calendar: BusinessCalendar) =>
    `Atenção: "${action}" em ${deal} vence em ${when(dueAt, calendar)}.`,

  overdue: (
    action: string,
    deal: string,
    dueAt: Date,
    escalates: boolean,
    calendar: BusinessCalendar,
  ) =>
    `O prazo de "${action}" em ${deal} venceu em ${when(dueAt, calendar)}.` +
    (escalates ? " Pela regra, seu superior será notificado automaticamente." : ""),

  escalationToSuperior: (
    action: string,
    deal: string,
    responsibleName: string,
    dueAt: Date,
    level: number,
    calendar: BusinessCalendar,
  ) =>
    `Escalonamento automático (nível ${level}): "${action}" em ${deal}, responsável ` +
    `${responsibleName}, está em atraso desde ${when(dueAt, calendar)}.`,

  escalationToResponsible: (action: string, deal: string, level: number) =>
    `Escalonamento automático (nível ${level}) registrado para "${action}" em ${deal}. ` +
    "A ocorrência só é encerrada quando o negócio avançar de etapa.",
};
