# Motor operacional

Pacote `packages/engine` (puro, determinístico, sem IA nem rede) + orquestração em
`apps/api/src/modules/engine`.

## Estado

| Capacidade                                                                             | Status                                                                           |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Calendário útil (fuso por empresa, dias úteis, expediente, feriados), também para trás | Implementado · testado localmente                                                |
| Regras "SLA de etapa" (pipeline + etapa → ocorrência com prazo)                        | Implementado · testado localmente                                                |
| Risco, atraso, escalonamento em níveis                                                 | Implementado · testado localmente (mocks e PostgreSQL via PGlite)                |
| Condições por campo do negócio (`conditions`)                                          | Implementado · testado localmente                                                |
| Prazo relativo a data do negócio, antes ou depois (`deadlineFrom`)                     | Implementado · testado localmente                                                |
| Encerramento por campo preenchido (`completeWhen`)                                     | Implementado · testado localmente                                                |
| Responsável por papel ou por campo de usuário (`responsible`)                          | Implementado · testado localmente                                                |
| Destinatários do escalonamento por nível: superior e/ou papéis (`escalation.levels`)   | Implementado · testado localmente                                                |
| Modo sombra por regra (`mode`; padrão `shadow`)                                        | Implementado · testado localmente                                                |
| Histórico somente inserção, deduplicação de avisos                                     | Implementado · testado localmente                                                |
| Leitura dos campos usados pelas regras no CRM (`crm.deal.list` com `select`)           | Implementado · testado com mocks · aguardando portal de testes                   |
| Regras reais da ProjacSeg                                                              | **Bloqueado** — aguardando homologação (só exemplos não homologados)             |
| Versionamento de regras (`OperationalRuleVersion`)                                     | Parcial: regras em arquivo versionado no Git; sem versão no banco                |
| Suspensão autorizada de prazo                                                          | Planejado (precisa de regra homologada; aguardar terceiros não suspende sozinho) |

## Formato das regras

Definido e validado em `packages/engine/src/rules.ts`; configurado em `apps/api/tenants/<domínio>.json`
(ver o README da pasta). Resumo:

| Campo                   | Para quê                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`                  | `shadow` (padrão): calcula, mostra no dashboard e registra `notification_suppressed` no histórico, **sem enviar mensagens**. `active`: envia alertas e escalonamentos pelo bot |
| `conditions`            | Condições sobre campos do negócio (`equals`, `not_equals`, `in`, `empty`, `not_empty`). Campos de lista comparam o **ID do item**                                              |
| `deadlineFrom`          | Conta o prazo a partir de uma data do negócio, `before` ou `after`. Sem a data preenchida, a ocorrência não abre                                                               |
| `completeWhen`          | Conclui a ocorrência quando as condições valem (ex.: "Número do cálculo" preenchido); se já valem na entrada da etapa, nada é aberto                                           |
| `responsible`           | `assignee` (padrão), `role` (papel da empresa) ou `field` (campo de usuário; vazio → responsável do negócio)                                                                   |
| `keepAcrossStages`      | Uma ocorrência acompanha o negócio por todas as etapas da regra (radar de vigência); só sai quando ele deixa essas etapas                                                      |
| `restartOn`             | Ciclo que recomeça a cada atividade real (`LAST_ACTIVITY_TIME`): a atividade nova conclui a ocorrência (`activity`) e abre a próxima (follow-up)                               |
| `riskBefore`            | Risco a partir de um tempo fixo antes do vencimento (no lugar da fração `riskAtRatio`)                                                                                         |
| `escalation.firstAfter` | Primeiro escalonamento só depois deste tempo vencido (ex.: faixa crítica do radar)                                                                                             |
| `escalation.levels`     | Destinatários de cada nível: `superior` (organograma) e/ou `roles`. Sem a lista, cada nível vai ao superior                                                                    |

Decisões que protegem a regra "o comercial não adia nem cancela" (D-039): condições e data de
referência são lidas **só na abertura**; editar um campo depois não encerra nem adia a ocorrência. As
saídas continuam sendo: mudar de etapa, fechar o negócio, cumprir `completeWhen` ou a regra ser
desativada pela configuração.

## Rotinas do secretário (sprint 1, piloto)

As rotinas são regras do motor configuradas em `apps/api/tenants/projacseg.bitrix24.com.br.json`, todas
`homologated: false` e em **sombra**: radar de vigência das renovações, primeiro contato do seguro novo,
cotações (24 h, 48 h e Demais Ramos), follow-up (2 ou 5 dias úteis, reiniciado por atividade),
pendência da seguradora e lembrete de prospecção — 11 regras. Proposta e faixas no documento
"Secretário comercial — rotinas por etapa". Para aplicar mudanças no arquivo sem reinstalar:
`pnpm --filter @projacseg/api tenants:reload` e reinicie o servidor.

## Regras fundamentais (inegociáveis)

O comercial não impede, cancela nem adia escalonamentos ou ocorrências. A indisponibilidade da IA
não interrompe o motor. Toda ocorrência tem histórico auditável. Escalonamentos já feitos pelo
Bitrix24 são considerados para não duplicar avisos: toda regra começa em **modo sombra** e só passa a
`active` quando a automação equivalente for desligada, com autorização da ProjacSeg. Com todas as
regras em sombra, nem o resumo diário é enviado.

## Correspondência com as automações atuais

| Automação atual                             | No motor                                              |
| ------------------------------------------- | ----------------------------------------------------- |
| Robô cria tarefa ao entrar na etapa         | Abre ocorrência na entrada da etapa                   |
| "Encerrar tarefas das etapas anteriores"    | Resolve ao mudar de etapa                             |
| Tarefa recriada em laço até mudar de etapa  | **Uma** ocorrência com risco → atraso → escalonamento |
| "Controle de inatividade" após N dias úteis | Escalonamento por nível, com intervalo                |
| Destinatários fixos                         | Papéis por empresa ou superior pelo organograma       |

## Entidades

Já no banco (rascunho em duas migrações, **não revisadas para produção**): `Tenant`, `Rule`,
`DealSnapshot` (com `fields` JSON: só os campos usados pelas regras, migração aditiva
`20261117000000_deal_fields`), `Occurrence`, `OccurrenceEvent`, `NotificationLog`, `ThemePreference`. Avaliar antes da
modelagem definitiva: `OperationalRuleVersion`, `EscalationPolicy`, `BusinessCalendar` próprio,
`IntegrationEvent`, `AuditLog`, `AgentExecution`, `ToolExecution`, `HumanApproval`. Nenhuma migração
definitiva antes da homologação das regras.
