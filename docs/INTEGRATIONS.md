# Integrações

## Bitrix24

### No navegador (BX24 JS SDK) — status: **implementado, não homologado em portal**

Quando o Workspace é aberto **dentro de um portal Bitrix24** (aplicativo em iframe), o frontend
carrega a BX24 JS SDK (`https://api.bitrix24.com/api/v1/`) e passa ao modo `bitrix24`. Fora do
Bitrix24 nada é carregado e a aplicação fica no modo `demo`.

Detecção: página em iframe **e** URL com `DOMAIN` e `APP_SID` (parâmetros que o Bitrix24 acrescenta
ao abrir um aplicativo). Código em `apps/web/src/integrations/bitrix24/` e `apps/web/src/platform/`.

| Recurso                                          | Modo `bitrix24`                                                                                                                              | Modo `demo`                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Avatar                                           | Foto do perfil (`user.current` → `PERSONAL_PHOTO`); iniciais se não houver foto ou se a imagem falhar                                        | Iniciais (ou `VITE_DEMO_USER_PHOTO_URL`) |
| Nome na saudação                                 | `user.current` → `NAME`                                                                                                                      | `VITE_DEMO_USER_NAME`                    |
| Botão **Abrir**                                  | `BX24.openPath('/crm/deal/details/<id>/')` — card do negócio no slider do Bitrix24                                                           | Diálogo de detalhes demonstrativo        |
| **Conversar com assistente** / **Assistente IA** | `GET /api/v1/assistant` (backend localiza o bot pelo código via `imbot.v2.Bot.list`) → `BX24.im.openMessenger(<diálogo>)` — chat do Bitrix24 | Chat demonstrativo                       |
| Bot não registrado no portal                     | Aviso "assistente ainda não está instalado neste portal"                                                                                     | —                                        |

Regras:

- Nenhum ID do Bitrix24 fixo: o bot é encontrado pelo **código** (`BITRIX24_ASSISTANT_BOT_CODE`, só no
  servidor; identificador da própria aplicação); o portal vem de `BX24.getDomain()`; o usuário de `user.current`.
- O código nunca chama `BX24.getAuth()`; a SDK cuida da autenticação e o token não é lido nem
  armazenado pela aplicação.
- Provisório: `tenantId` = domínio do portal. O backend fará o mapeamento domínio/`member_id` → tenant.
- Escopos necessários no aplicativo: `user` (ou `user_brief`), `crm`, `im`, `imbot`.

**Instalação num portal de testes:** roteiro completo em [BITRIX24_SETUP.md](BITRIX24_SETUP.md).

- **Bot do assistente**: registrado pelo **servidor** durante a instalação (`imbot.v2.Bot.register`
  idempotente + `imbot.v2.Bot.update` para manter a URL, código `projacseg_assistant`), com eventos em
  modo webhook em `/bitrix24/events/assistant`. O navegador não chama mais a API de bots. Enquanto a IA não está conectada, o backend responde com uma
  mensagem fixa e honesta ("a IA ainda está em implantação").
- **Handler com POST**: a API serve o build do frontend e responde ao `POST` do Bitrix24 no handler
  e na instalação com o `index.html`; o iframe só é liberado para os domínios autorizados
  (`Content-Security-Policy: frame-ancestors`).
- **Negócios**: com o portal instalado no servidor, vêm do CRM (`origin: "crm"`) e abrem o card do
  Bitrix24. Negócios demonstrativos (`origin: "demo"`) nunca abrem card no portal.

### Bot do assistente (`imbot.v2`) — status: **implementado · testado com mocks · aguardando portal de testes**

Migrado da API v1 (descontinuada) para a API de chatbots 2.0 em 17/11/2026
(`apps/api/src/integrations/bitrix24/bot-messenger.ts` e `apps/api/src/modules/assistant-bot/`).

- **Registro** na instalação, pelo servidor, com os tokens do aplicativo: `imbot.v2.Bot.register`
  (`code`, `type: "bot"`, `eventMode: "webhook"`, `webhookUrl`) e `imbot.v2.Bot.update` (o registro
  repetido devolve o bot existente sem atualizar). Falha no registro não interrompe a instalação.
- **Eventos** `ONIMBOTV2JOINCHAT` (boas-vindas), `ONIMBOTV2MESSAGEADD` (resposta) e
  `ONIMBOTV2DELETE` em `POST /bitrix24/events/assistant`, como formulário (valores em texto).
- **Resposta** com `imbot.v2.Chat.Message.send` (`botId` do evento, `dialogId`, `fields.message`) e os
  tokens do aplicativo guardados na instalação — o `access_token` não vem nos eventos v2.
- **Privacidade**: dados de negócios só no chat privado (`dialogId` = ID do autor). Em grupo, o bot
  pede para conversar no privado e não consulta a IA.
- **Avisos do motor** (risco, atraso, escalonamento, resumo) também saem por `Chat.Message.send`.
- **Proteções**: domínios autorizados, `client_endpoint` = `https://<domínio>/rest/`,
  `application_token` do bloco `auth` de nível superior conferido; portal sem instalação concluída é
  ignorado.
- **Aguardando validação no portal**: se o ID do bot serve como diálogo no `BX24.im.openMessenger`;
  o formato real do corpo do webhook (a documentação diz formulário, mas um exemplo usa JSON — o
  servidor aceita os dois); o valor de `chat.type` em conversas privadas (não usamos para decidir).

### Demais portas do backend — status: **interfaces definidas, sem implementação**

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

## Avisos da pesquisa de 16/11/2026

- **Chatbots:** `imbot` v1 está oficialmente descontinuado; o Workspace já usa `imbot.v2` (ver acima).
  Limites: 2 requisições/s por aplicativo, 100 bots por aplicativo, REST só em planos comerciais.
- **Alaio Vibecode:** plataforma oficial de apps do ecossistema Bitrix24 (API keys, auth keys, AI Router,
  servidores Black Hole, Hermes gerenciado, créditos). Avaliação em [HERMES_EVALUATION.md](HERMES_EVALUATION.md).
- **Teleport:** os modelos de automação mostram tarefas de cadastro no Teleport e laços à espera do
  "Número do cálculo"; a integração Teleport ↔ Bitrix24 não aparece nos modelos. Antes de qualquer
  integração direta, analisar payloads e documentação existentes (eventos AUTO_GRAVA, EMISSAO,
  ERROEMISSAO, a confirmar). O Workspace consome primeiro os dados já integrados ao Bitrix24.

## LLM — status: **implementado · testado com mocks · desligado por padrão**

O assistente conversa pelo **chat do Bitrix24** (bot `imbot.v2`). As mensagens chegam ao backend pelo
evento do bot, que consulta a IA por uma interface desacoplada de provedor (porta `LlmProvider`) e
responde no mesmo chat. A IA auxilia o colaborador, mas não calcula prazos nem decide escalonamentos.
Fora do Bitrix24 o chat é **demonstrativo**, com respostas predefinidas rotuladas.

## Banco de dados — status: **implementado · testado localmente (PGlite) · migrações não revisadas para produção**

PostgreSQL com pgvector via Prisma. Rascunho de modelagem em `apps/api/prisma/schema.prisma`.
