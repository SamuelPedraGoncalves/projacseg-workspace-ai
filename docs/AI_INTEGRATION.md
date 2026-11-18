# Integração de inteligência artificial

## Princípios

- Três camadas independentes: **Workspace** (interface) · **motor operacional TechStone** (regras,
  prazos, escalonamento, auditoria) · **IA** (conversa, resumo, explicação, sugestões, ferramentas
  autorizadas). O motor **não depende** da IA.
- Autorização é feita pelo software, nunca pelo prompt. Uma mensagem no chat não é autorização
  administrativa.
- A IA não calcula prazos, não cancela ocorrências e não altera escalonamentos.
- Dados reais só vão a um provedor de IA depois da decisão de LGPD e da autorização da ProjacSeg.
- O chat de produção é o **mensageiro nativo do Bitrix24** (bot com código lógico
  `projacseg_assistant`, mapeável por empresa). O chat próprio existe só na demonstração.

## Estado atual

| Item                                                                                                                     | Status                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `LlmProvider` + `AnthropicProvider` (Claude Opus 5.5, fallback do servidor)                                              | Implementado · testado com mocks · desligado por padrão          |
| Contexto mínimo (projeção do motor) e redação de nomes de segurados                                                      | Implementado · testado localmente                                |
| Bot no chat via `imbot.v2` (`Bot.register`, `Chat.Message.send`, `ONIMBOTV2MESSAGEADD`), dados só no chat privado        | Implementado · testado com mocks · aguardando portal de testes   |
| Ações pelo chat: mover etapa e preencher campo (tool use), com confirmação do colaborador e registro (`AssistantAction`) | Implementado · testado com mocks · ligado no piloto (usuário 13) |
| Hermes (gerenciado ou próprio)                                                                                           | Em avaliação — [HERMES_EVALUATION.md](HERMES_EVALUATION.md)      |
| Multiagentes (Atena, Íris, Clara — nomes provisórios)                                                                    | Planejado · só depois de um agente de leitura homologado         |

## Ações no CRM pelo chat (piloto)

O colaborador pede no chat ("move o 123 para negociação", "o tipo de seguro do 456 é seguro novo",
"descarta o 789, fechou com outro corretor"). O modelo só **propõe** pelas ferramentas `mover_etapa`,
`preencher_campo` e `descartar_negocio` (motivo de perda obrigatório); quem decide é o servidor
(`apps/api/src/modules/assistant/actions.ts`):

1. Autorização no código: negócio do próprio colaborador, aberto, dentro do modo piloto; etapa e campo
   na lista de `tenants/<domínio>.json` → `assistant`; valor válido (opção de lista existente, data
   DD/MM/AAAA, texto curto).
2. O servidor monta a mensagem de confirmação com o que será gravado e pede SIM (vale 10 minutos).
3. Com SIM: confere tudo de novo, chama `crm.deal.update`, comenta no card (`crm.timeline.comment.add`)
   "a pedido de <nome>", reavalia o negócio no motor e registra o resultado em `AssistantAction`.

Mover etapa pelo assistente dispara as automações daquela etapa no Bitrix24, como uma mudança manual.
Etapas movidas por integração (proposta transmitida, processo pendente no Automóvel) e de fechamento
(concluído, perdido) ficam fora da lista.

## Contratos propostos (AI Gateway)

Evoluem a partir do `LlmProvider` atual, conforme as capacidades confirmadas. Nenhum adaptador é
criado antes de haver uso real.

| Contrato                                 | Responsabilidade                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ModelProvider`                          | Chamada a um modelo (hoje: `LlmProvider`)                                                         |
| `AgentProvider`                          | Executa um turno de agente com ferramentas (modelo próprio, Hermes…)                              |
| `AgentTool`                              | Ferramenta interna: nome, esquema de entrada e saída (Zod), escopo exigido, timeout, idempotência |
| `AuthorizationContext`                   | `tenantId`, `bitrixUserId`, papéis e departamentos — vindos da sessão, nunca do modelo            |
| `AgentExecution` / `ToolExecutionResult` | Registro auditável de cada turno e chamada (entrada resumida, resultado, duração, erro)           |
| `HumanApprovalRequest`                   | Pedido de aprovação para ações que alteram dados, com expiração e negação por padrão              |
| `AgentRegistry`                          | Mapeia o código lógico do agente para o bot do portal (ID numérico nunca fixo)                    |

Adaptadores possíveis (só quando confirmados): `AnthropicAdapter` (existe como `AnthropicProvider`),
`MockAgentAdapter` (testes), `HermesSelfHostedAdapter`, `HermesManagedAdapter`.

## Ferramentas internas propostas (somente leitura no primeiro agente)

`listMyDeals`, `listOperationalObligations`, `getDealDetails`, `listUpcomingRenewals`,
`listOverdueObligations`, `getOperationalSummary`, `getEscalationHistory`, `suggestPriority`
(sugestão, não decisão) e, depois, `requestApprovedAction`. São nomes internos, não métodos do
Bitrix24.

Cada ferramenta: valida entrada e saída, aplica o `AuthorizationContext` (o colaborador só vê o que já
vê no Bitrix24; gestor vê a equipe), escopa por `tenantId`, registra a execução, tem timeout e
política de retry, e nunca dá ao modelo acesso a banco, shell ou API administrativa.

## Riscos e defesas

- **Prompt injection** (títulos de negócios, comentários e mensagens são dados): conteúdo delimitado e
  tratado como dado; ferramentas com escopo fixo; nenhuma ação com efeito sem aprovação.
- **Exfiltração:** minimização (só a projeção do motor), redação de nomes por padrão, sem dados de
  outros tenants no contexto.
- **Alucinação:** respostas citam registros consultados; o agente não afirma ação executada sem
  confirmação da ferramenta.
- **Custo e disponibilidade:** limite por usuário e por empresa; falha da IA vira mensagem honesta; o
  motor segue funcionando.
