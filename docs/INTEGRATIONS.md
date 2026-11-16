# Integrações

## Bitrix24

### No navegador (BX24 JS SDK) — status: **implementado, não homologado em portal**

Quando o Workspace é aberto **dentro de um portal Bitrix24** (aplicativo em iframe), o frontend
carrega a BX24 JS SDK (`https://api.bitrix24.com/api/v1/`) e passa ao modo `bitrix24`. Fora do
Bitrix24 nada é carregado e a aplicação fica no modo `demo`.

Detecção: página em iframe **e** URL com `DOMAIN` e `APP_SID` (parâmetros que o Bitrix24 acrescenta
ao abrir um aplicativo). Código em `apps/web/src/integrations/bitrix24/` e `apps/web/src/platform/`.

| Recurso                                          | Modo `bitrix24`                                                                                                   | Modo `demo`                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Avatar                                           | Foto do perfil (`user.current` → `PERSONAL_PHOTO`); iniciais se não houver foto ou se a imagem falhar             | Iniciais (ou `VITE_DEMO_USER_PHOTO_URL`) |
| Nome na saudação                                 | `user.current` → `NAME`                                                                                           | `VITE_DEMO_USER_NAME`                    |
| Botão **Abrir**                                  | `BX24.openPath('/crm/deal/details/<id>/')` — card do negócio no slider do Bitrix24                                | Diálogo de detalhes demonstrativo        |
| **Conversar com assistente** / **Assistente IA** | `imbot.bot.list` → bot com código `projacseg_assistant` → `BX24.im.openMessenger(<id do bot>)` — chat do Bitrix24 | Chat demonstrativo                       |
| Bot não registrado no portal                     | Aviso "assistente ainda não está instalado neste portal"                                                          | —                                        |

Regras:

- Nenhum ID do Bitrix24 fixo: o bot é encontrado pelo **código** (`VITE_BITRIX24_ASSISTANT_BOT_CODE`,
  identificador da própria aplicação); o portal vem de `BX24.getDomain()`; o usuário de `user.current`.
- O código nunca chama `BX24.getAuth()`; a SDK cuida da autenticação e o token não é lido nem
  armazenado pela aplicação.
- Provisório: `tenantId` = domínio do portal. O backend fará o mapeamento domínio/`member_id` → tenant.
- Escopos necessários no aplicativo: `user` (ou `user_brief`), `crm`, `im`, `imbot`.

**Pendente para funcionar num portal de testes** (ver ROADMAP):

1. **Registrar o bot do assistente** (`imbot.register`, código `projacseg_assistant`) — feito pelo
   backend na instalação do aplicativo, com a URL de eventos de mensagem (`ONIMBOTMESSAGEADD`) que
   levará as perguntas à IA. Até lá o botão mostra o aviso de "não instalado".
2. **Handler que aceite POST**: o Bitrix24 abre o aplicativo com `POST` na URL do handler. Um servidor
   estático puro pode recusar; o backend (ou a hospedagem) precisa responder ao `POST` com o
   `index.html`.
3. **Negócios reais**: a lista ainda é demonstrativa (IDs 1001–1006). Dentro de um portal, "Abrir"
   leva ao caminho do ID demonstrativo, que não corresponde a um negócio real até a leitura do CRM
   (`crm.deal.list`) substituir os dados fictícios.

### No backend — status: **interfaces definidas, sem implementação**

Contratos em `apps/api/src/integrations/bitrix24/` (`types.ts` e `ports.ts`).

| Necessidade              | Porta                   | API Bitrix24 prevista                                            |
| ------------------------ | ----------------------- | ---------------------------------------------------------------- |
| Autenticação OAuth       | `Bitrix24OAuthPort`     | OAuth 2.0 do aplicativo local/marketplace                        |
| Identificação do portal  | `PortalResolverPort`    | `DOMAIN` / `member_id` da instalação                             |
| Identificação do usuário | `UserDirectoryPort`     | `user.current`, `user.get`                                       |
| Consulta de negócios     | `DealGatewayPort`       | `crm.deal.list`, `crm.deal.get`                                  |
| Consulta de tarefas      | `TaskGatewayPort`       | `tasks.task.list` (vínculo `UF_CRM_TASK`)                        |
| Departamentos            | `DepartmentGatewayPort` | `department.get`                                                 |
| Superiores               | `HierarchyResolverPort` | `department.get` (`UF_HEAD`) + árvore de departamentos           |
| Eventos de negócios      | `EventSubscriptionPort` | `event.bind` (`ONCRMDEALUPDATE`, `ONCRMDEALADD`, `ONTASKUPDATE`) |
| Notificações             | `NotificationPort`      | `im.notify.system.add`                                           |
| Abrir negócio no CRM     | `CrmLinkPort`           | URL `https://<portal>/crm/deal/details/<id>/`                    |

### Princípios

- Tokens OAuth do backend ficam **somente no servidor**, criptografados em repouso.
- Leituras feitas com o token do próprio usuário, respeitando as permissões do Bitrix24.
- Tudo escopado por `tenantId`; pipelines e campos via `TenantFieldMapping` (configuração, não código).
- Eventos recebidos validam o `application_token` do portal.
- Desenvolvimento e homologação em **portal de testes**. Produção só com autorização.
- Nenhuma automação existente é alterada ou desativada.
- Uso do dashboard como página inicial automática no Bitrix24: **a homologar**.

## LLM — status: **não iniciado**

O assistente conversa pelo **chat do Bitrix24** (bot `imbot`). As mensagens chegam ao backend pelo
evento do bot, que consulta a IA por uma interface desacoplada de provedor (porta `LlmProvider`) e
responde no mesmo chat. A IA auxilia o colaborador, mas não calcula prazos nem decide escalonamentos.
Fora do Bitrix24 o chat é **demonstrativo**, com respostas predefinidas rotuladas.

## Banco de dados — status: **não iniciado**

PostgreSQL com pgvector via Prisma. Rascunho de modelagem em `apps/api/prisma/schema.prisma`.
