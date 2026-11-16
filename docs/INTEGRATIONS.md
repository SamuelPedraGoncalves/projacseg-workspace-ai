# Integrações

## Bitrix24 — status: **interfaces definidas, sem implementação**

Nenhuma chamada ao Bitrix24 é feita nesta etapa. Contratos em
`apps/api/src/integrations/bitrix24/` (`types.ts` e `ports.ts`).

| Necessidade              | Porta                                      | API Bitrix24 prevista                                            |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| Autenticação OAuth       | `Bitrix24OAuthPort`                        | OAuth 2.0 do aplicativo local/marketplace                        |
| Identificação do portal  | `PortalResolverPort`                       | `DOMAIN` / `member_id` da instalação                             |
| Identificação do usuário | `UserDirectoryPort`                        | `user.current`, `user.get`                                       |
| Consulta de negócios     | `DealGatewayPort`                          | `crm.deal.list`, `crm.deal.get`                                  |
| Consulta de tarefas      | `TaskGatewayPort`                          | `tasks.task.list` (vínculo `UF_CRM_TASK`)                        |
| Departamentos            | `DepartmentGatewayPort`                    | `department.get`                                                 |
| Superiores               | `HierarchyResolverPort`                    | `department.get` (`UF_HEAD`) + árvore de departamentos           |
| Eventos de negócios      | `EventSubscriptionPort`                    | `event.bind` (`ONCRMDEALUPDATE`, `ONCRMDEALADD`, `ONTASKUPDATE`) |
| Notificações             | `NotificationPort`                         | `im.notify.system.add`                                           |
| Abrir negócio no CRM     | `CrmLinkPort` (API) / `CrmNavigator` (web) | URL do portal ou `BX24.openPath`                                 |

### Princípios

- Tokens OAuth ficam **somente no backend**, criptografados em repouso; o navegador nunca os recebe.
- Leituras feitas com o token do próprio usuário, respeitando as permissões do Bitrix24.
- Tudo escopado por `tenantId`; pipelines e campos via `TenantFieldMapping` (configuração, não código).
- Eventos recebidos validam o `application_token` do portal.
- Desenvolvimento e homologação em **portal de testes**. Produção só com autorização.
- Nenhuma automação existente é alterada ou desativada.
- Uso do dashboard como página inicial automática no Bitrix24: **a homologar**.

## LLM — status: **não iniciado**

Será acessado por uma interface desacoplada de provedor (porta `LlmProvider`), chamada apenas pelo
backend. A IA auxilia o colaborador (resumos, explicações), mas não calcula prazos nem decide
escalonamentos. O chat atual é **demonstrativo**, com respostas predefinidas rotuladas.

## Banco de dados — status: **não iniciado**

PostgreSQL com pgvector via Prisma. Rascunho de modelagem em `apps/api/prisma/schema.prisma`.
