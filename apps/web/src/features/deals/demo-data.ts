import type { Deal, JourneySummary } from "@projacseg/shared";

/**
 * DADOS FICTÍCIOS para homologação visual. Nenhum segurado real.
 * Os prazos já vêm prontos porque, no produto, quem calcula prazo é o motor de regras
 * determinístico — nunca a interface e nunca a IA.
 */
export const DEMO_SUMMARY: JourneySummary = {
  activeDeals: 42,
  actionsToday: 12,
  atRisk: 3,
  resolvedToday: 8,
};

export const DEMO_BRIEFING =
  "Você tem 3 ações prioritárias. Comece pela renovação do Carlos, que vence amanhã. " +
  "Estou monitorando os negócios que aguardam terceiros.";

const RESPONSIBLE = "Lucas";

export const DEMO_DEALS: readonly Deal[] = [
  {
    id: "1001",
    clientName: "Carlos Almeida",
    branch: "Automóvel",
    insuranceType: "Renovação",
    nextAction: "Enviar cotação",
    deadlineLabel: "Vence amanhã",
    status: "today",
    priority: "danger",
    pipelineName: "Automóvel",
    stageName: "Elaborando cotação",
    responsibleName: RESPONSIBLE,
  },
  {
    id: "1002",
    clientName: "Empresa Martins",
    branch: "Empresarial",
    insuranceType: "Novo",
    nextAction: "Cadastrar no Teleport",
    deadlineLabel: "Em atraso",
    status: "risk",
    priority: "danger",
    pipelineName: "Demais Ramos",
    stageName: "Proposta transmitida",
    responsibleName: RESPONSIBLE,
  },
  {
    id: "1003",
    clientName: "Roberto Lima",
    branch: "Automóvel",
    insuranceType: "Novo",
    nextAction: "Realizar follow-up",
    deadlineLabel: "SLA vencido",
    status: "risk",
    priority: "danger",
    pipelineName: "Automóvel",
    stageName: "Negociação",
    responsibleName: RESPONSIBLE,
  },
  {
    id: "1004",
    clientName: "Juliana Santos",
    branch: "Residencial",
    insuranceType: "Renovação",
    nextAction: "Enviar boleto",
    deadlineLabel: "Hoje",
    status: "today",
    priority: "warning",
    pipelineName: "Demais Ramos",
    stageName: "Proposta transmitida",
    responsibleName: RESPONSIBLE,
  },
  {
    id: "1005",
    clientName: "Clínica Oliveira",
    branch: "RC Profissional",
    insuranceType: "Novo",
    nextAction: "Acompanhar emissão",
    deadlineLabel: "Aguardando seguradora",
    status: "waiting",
    priority: "neutral",
    pipelineName: "Demais Ramos",
    stageName: "Proposta transmitida",
    responsibleName: RESPONSIBLE,
  },
  {
    id: "1006",
    clientName: "Ana Souza",
    branch: "Automóvel",
    insuranceType: "Novo",
    nextAction: "Cotação enviada",
    deadlineLabel: "Concluído",
    status: "resolved",
    priority: "success",
    pipelineName: "Automóvel",
    stageName: "Negociação",
    responsibleName: RESPONSIBLE,
  },
];
