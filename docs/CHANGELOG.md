# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.6.0] — 17/11/2026 — Bot imbot.v2 e motor em sombra

### Adicionado

- Motor: condições por campo do negócio, prazo antes/depois de uma data do negócio, conclusão por
  campo preenchido, responsável por papel ou campo, destinatários de escalonamento por nível e modo
  sombra por regra (padrão). Calendário útil para trás (`subtractDuration`) e leitura de datas de
  campo.
- `roles` na configuração da empresa, validado contra as regras.
- `DealSnapshot.fields` (migração aditiva `20261117000000_deal_fields`, não revisada para produção):
  só os campos citados pelas regras, lidos do CRM.
- `GET /api/v1/assistant`: situação do bot e diálogo para abrir o chat.

### Alterado

- Bot do assistente migrado para `imbot.v2`: registro pelo servidor na instalação, eventos
  `ONIMBOTV2*` em modo webhook, respostas e avisos por `Chat.Message.send` com os tokens do
  aplicativo. Dados de negócios só no chat privado.
- Frontend: deixa de chamar `imbot.*` pela BX24; a instalação confere o bot no backend.
- Resumo diário só para quem tem ocorrência de regra ativa.
- Teste de PostgreSQL aplica todas as migrações em ordem.

### Removido

- `VITE_BITRIX24_ASSISTANT_BOT_CODE` (o código do bot fica só no servidor).

## [0.5.0] — 16/11/2026 — Levantamento operacional e avaliação de IA

### Adicionado

- `tools/bitrix-automations`: analisador seguro e testado (13 testes) de modelos `.bpt`, com
  inventário, matriz de tarefas, catálogo de regras rastreável, escalonamentos, dependências e JSON
  anonimizado em `docs/reference/automations/`.
- Questionário de homologação das automações.
- `docs/HERMES_EVALUATION.md`, `docs/AI_INTEGRATION.md`, `docs/OPERATIONAL_ENGINE.md`,
  `docs/TESTING.md`.
- MCP de documentação do Bitrix24 no projeto (`.mcp.json`).

### Alterado

- `docs/AUTOMACOES_ATUAIS.md` → `docs/BITRIX24_AUTOMATIONS.md`, com 24 regras estritas (antes 19
  consolidadas à mão) e classificação das divergências.
- Portal real: banner sem resumo fictício; assistente diferencia "não instalado" de "indisponível".
- PROJECT e ROADMAP com status explícito e proposta da próxima sprint.

### Removido

- `tools/bitrix-automations/analisar.mjs` (substituído pelo pacote).

## [0.4.1] — 16/11/2026 — Análise das automações atuais

### Adicionado

- `docs/AUTOMACOES_ATUAIS.md`: análise dos 15 modelos de automação exportados (75 robôs de tarefa
  habilitados, 57 em produção, 19 regras, laços de recriação, controles de inatividade, campos).
- `tools/bitrix-automations/analisar.mjs`: lê `.bpt` (zlib + PHP serialize) e reproduz a contagem.

## [0.4.0] — 16/11/2026 — Motor operacional, comunicação ativa e IA

### Adicionado

- `packages/engine`: calendário útil, regras (SLA de etapa), avaliação determinística (risco, atraso,
  escalonamento em níveis, reatribuição, resolução) e projeção do dashboard com resumo.
- Backend: PostgreSQL/Prisma (schema e migração), versão em memória, tokens criptografados, sessão
  assinada, renovação de tokens OAuth, leitura do CRM, hierarquia por departamentos.
- Instalação guarda tokens, liga eventos de negócios, carrega `tenants/<domínio>.json` e grava o
  catálogo de pipelines.
- `POST /bitrix24/events/crm` (tempo real) e agendador (prazos a cada minuto, sincronização completa
  periódica).
- Bot: alertas de risco e atraso, aviso ao superior no escalonamento, resumo diário — sem duplicar.
- Assistente com IA no chat (Claude Opus 5.5, opcional), com redação de nomes de segurados.
- `GET /api/v1/journey` e histórico do negócio; dashboard com dados reais e atualização automática.
- Docker Compose (Postgres + pgvector), `.env.example` completo, exemplo de regras.
- Testes: engine 35, API 48 (inclui PostgreSQL via PGlite), web 55, theme 44, shared 7.

### Corrigido

- Criação de ocorrência enviava o campo `type` do comando ao banco (detectado no teste com
  PostgreSQL).

## [0.3.0] — 16/11/2026 — Preparação para portal de testes

### Adicionado

- API serve o build do frontend e aceita o `POST` do Bitrix24 no handler e na instalação
  (`pnpm portal`).
- Página `/install`: registra ou atualiza o bot do assistente e conclui a instalação.
- `POST /bitrix24/events/assistant`: boas-vindas e resposta honesta do bot (IA ainda não conectada),
  com validação de domínio, endpoint e `application_token`.
- `origin` nos negócios (`demo` | `crm`): negócios fictícios nunca abrem card no portal.
- Guia [BITRIX24_SETUP.md](BITRIX24_SETUP.md).
- Testes: API 17, web 52.

### Corrigido

- Formulários do Bitrix24 com IDs numéricos pequenos (`data[BOT][9]`) viravam arrays no parser.

## [0.2.0] — 16/11/2026 — Integração com o Bitrix24 pelo navegador

### Adicionado

- Detecção do ambiente (dentro de um portal Bitrix24 ou demonstração) e carregamento da BX24 JS SDK
  apenas dentro do portal.
- Avatar com a foto do perfil do Bitrix24 (`user.current`), com volta às iniciais se não houver foto
  ou se a imagem falhar.
- Botão **Abrir** abre o card do negócio no Bitrix24 (`BX24.openPath`).
- **Conversar com assistente** e **Assistente IA** abrem o chat do bot do assistente no messenger do
  Bitrix24; aviso quando o bot não está instalado no portal.
- Testes do adaptador BX24 e do comportamento no modo Bitrix24 (web: 45 testes).

### Alterado

- Store do tema com `initialize(scope)`; `getCurrentUser` virou `getDemoUser`.
- `.gitattributes` fixando fim de linha LF.

### Removido

- `integrations/crm-navigator.ts`, substituído pela camada `platform/`.

## [0.1.0] — 16/11/2026 — Sprint 1: Minha Jornada

### Adicionado

- Monorepo pnpm com `apps/web`, `apps/api`, `packages/theme`, `packages/shared`, `packages/ui`,
  `docs` e `infrastructure`.
- Dashboard **Minha Jornada** convertido do HTML de referência para React: sidebar, cabeçalho,
  avatar, banner do assistente, indicadores, filtros e cards de negócios.
- Rotas `/`, `/negocios`, `/em-risco`, `/aguardando`, `/resolvidos`.
- Diálogo de detalhes do negócio e chat demonstrativo (respostas predefinidas, rotuladas).
- Motor de temas: paleta de cinco tons, 8 temas predefinidos, cor personalizada (seletor e HEX),
  prévia, persistência por colaborador e restauração do padrão.
- Menu recolhível no celular, foco visível, link "Pular para o conteúdo", anúncios para leitor de tela.
- API esqueleto Fastify com `/health`, configuração validada por Zod e portas da integração Bitrix24.
- Rascunho de modelagem Prisma (não aplicado).
- Testes: 44 do motor de temas, 7 de regras compartilhadas, 27 do frontend, 4 da API e 6 de interface
  (Playwright, desktop e mobile).
- Documentação: README, AGENTS, CLAUDE e `docs/*`.
