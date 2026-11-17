# Motor operacional

Pacote `packages/engine` (puro, determinístico, sem IA nem rede) + orquestração em
`apps/api/src/modules/engine`.

## Estado

| Capacidade                                                           | Status                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Calendário útil (fuso por empresa, dias úteis, expediente, feriados) | Implementado · testado localmente                                                |
| Regras "SLA de etapa" (pipeline + etapa → ocorrência com prazo)      | Implementado · testado localmente                                                |
| Risco, atraso, escalonamento em níveis pelo organograma              | Implementado · testado localmente (mocks e PostgreSQL via PGlite)                |
| Encerramento só quando o negócio sai da etapa ou é fechado           | Implementado · testado localmente                                                |
| Histórico somente inserção, deduplicação de avisos                   | Implementado · testado localmente                                                |
| Regras reais da ProjacSeg                                            | **Bloqueado** — aguardando homologação (só exemplos não homologados)             |
| Condições por campo do negócio                                       | Planejado (necessário para R02–R24)                                              |
| Prazo relativo a data do negócio (ex.: antes do início de vigência)  | Planejado (R05, R14)                                                             |
| Encerramento por campo preenchido                                    | Planejado (R13, R16, R17, R21)                                                   |
| Responsáveis e destinatários por papel configurável                  | Planejado                                                                        |
| Modo sombra (calcula e mostra, sem avisar)                           | Planejado — obrigatório antes de rodar ao lado dos robôs atuais                  |
| Versionamento de regras (`OperationalRuleVersion`)                   | Parcial: regras em arquivo versionado no Git; sem versão no banco                |
| Suspensão autorizada de prazo                                        | Planejado (precisa de regra homologada; aguardar terceiros não suspende sozinho) |

## Regras fundamentais (inegociáveis)

O comercial não impede, cancela nem adia escalonamentos ou ocorrências. A indisponibilidade da IA
não interrompe o motor. Toda ocorrência tem histórico auditável. Escalonamentos já feitos pelo
Bitrix24 são considerados para não duplicar avisos (modo sombra até a homologação).

## Correspondência com as automações atuais

| Automação atual                             | No motor                                              |
| ------------------------------------------- | ----------------------------------------------------- |
| Robô cria tarefa ao entrar na etapa         | Abre ocorrência na entrada da etapa                   |
| "Encerrar tarefas das etapas anteriores"    | Resolve ao mudar de etapa                             |
| Tarefa recriada em laço até mudar de etapa  | **Uma** ocorrência com risco → atraso → escalonamento |
| "Controle de inatividade" após N dias úteis | Escalonamento por nível, com intervalo                |
| Destinatários fixos                         | Papéis por empresa ou superior pelo organograma       |

## Entidades

Já no banco (rascunho aplicado em migração inicial, **não revisada para produção**): `Tenant`, `Rule`,
`DealSnapshot`, `Occurrence`, `OccurrenceEvent`, `NotificationLog`, `ThemePreference`. Avaliar antes da
modelagem definitiva: `OperationalRuleVersion`, `EscalationPolicy`, `BusinessCalendar` próprio,
`IntegrationEvent`, `AuditLog`, `AgentExecution`, `ToolExecution`, `HumanApproval`. Nenhuma migração
definitiva antes da homologação das regras.
