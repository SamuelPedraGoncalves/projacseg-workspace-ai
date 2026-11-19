# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.10.0] — 19/11/2026 — WorkSeg AI, base multiempresa (testado localmente)

Primeira parte do WorkSeg AI, o produto para qualquer corretora (desenho em
`docs/superpowers/specs/2026-11-19-workseg-ai-design.md`, plano 1 de 4). Testado localmente com dados
falsos; **ainda não conferido no portal**.

### Adicionado

- Primeiro acesso: termos de uso, privacidade e LGPD (**versão provisória**, a ser trocada pelo texto
  definitivo da TechStone), boas-vindas com a escolha de quem cria regras pelo seletor de usuários do
  Bitrix24 e mapeamento dos campos (funis, tipo do seguro e seus valores, ramo, vigência, CPF, número
  do cálculo, motivo de perda) com sugestão automática pelos rótulos (sem IA).
- Papéis: administrador (quem instalou; no piloto, os usuários do piloto), criadores de regras e o
  ponto único de licença (sempre liberado por enquanto). Um administrador do portal pode assumir a
  administração quando o instalador sai (fora do piloto).
- Configurações (só administrador e criadores de regras): mapeamento, calendário, estrutura da
  empresa e quem cria regras.
- Calendário da empresa lido do Bitrix24 (`calendar.settings.get`, permissão nova `calendar`) na
  instalação e sob demanda; ajuste manual na tela.
- Estrutura da empresa lida do Bitrix24 (`department.get`), com o chefe de cada departamento.
- Aviso curto de privacidade, mostrado uma vez a quem não é administrador.
- Tabelas `TenantRole` e `ConsentRecord` (somente inserção) e coluna `Tenant.installedByUserId`
  (migração aditiva `20261119000000_workseg_base`, não revisada para produção).

### Alterado

- A IA só responde depois que o administrador aceita a versão vigente dos termos; aceitar liga a IA
  da corretora. Termos com versão nova desligam a IA até o novo aceite.
- Reinstalar mantém instalador, papéis, aceites, mapeamento confirmado e calendário ajustado na tela
  (que vale mais que o calendário do arquivo da empresa).
- Feriados que se repetem todo ano ficam guardados como mês-dia e são somados ao calendário em cada
  ano pelo motor e pelo painel (não "congelam" nos anos importados).
- Nenhum campo do mapeamento é obrigatório: corretora sem ramo ou tipo do seguro conclui o primeiro
  acesso, e a função que depende do campo fica desligada.
- Administrador do portal Bitrix24 pode assumir a administração pela tela de espera (fora do piloto).
- O teste do PostgreSQL (PGlite) usa uma porta livre escolhida pelo sistema.

## [0.9.0] — 18/11/2026 — Assistente age no CRM pelo chat

### Adicionado

- Ferramentas da IA `mover_etapa` e `preencher_campo` (proposta), com autorização no servidor,
  confirmação SIM/NÃO, comentário no card e registro em `AssistantAction` (migração aditiva
  `20261118000000_assistant_actions`, não revisada para produção).
- Seção `assistant` na configuração da empresa; ligada no piloto da ProjacSeg.
- Metadados dos campos do negócio (rótulo, tipo, opções) no catálogo do CRM.
- Ferramenta `descartar_negocio`: move para a etapa de perdido do funil com o motivo obrigatório
  (opção do campo de motivo de perda); seção `assistant.discard` na configuração.

### Alterado

- Banco local de testes na porta 5544.
- Mensagens do assistente no formato do chat do Bitrix24: negrito com [B], listas uma por linha,
  opções numeradas, títulos de negócio limpos (sem barras), confirmações em blocos. Markdown que a IA
  escreva é convertido.
- Negócios citados pelo assistente viram link para o card (`[URL=…/crm/deal/details/<id>/]`), no
  mesmo formato dos alertas do motor.
- Dashboard: prazos de ação dizem "Prazo…" (nunca "vence"); renovações mostram a vigência
  ("Vigência em 12 dias (30/11) · prazo …"). Seguro novo não aparece como vencendo. A IA recebe o tipo
  de seguro e a regra de que vigência só importa em renovações. Piloto: Tipo de Seguro e Ramo mapeados.
- Card do dashboard mostra a etapa atual e desde quando ("Cotação enviada / Negociação desde
  10/11"); follow-up diz a última atividade que reiniciou a contagem. Renovação mostra a vigência no
  card mesmo quando outra ação (follow-up, cotação) está em destaque. A data exibida vem do novo
  `deadlineFrom.label` da regra ("Vigência", "Agendamento"); regra sem rótulo não mostra data. Etapa
  sem rotina do comercial: "Nenhuma ação do comercial nesta etapa".
- Bitrix24: chamadas espaçadas por portal (~1,8/s) e nova tentativa em QUERY_LIMIT_EXCEEDED.
- Modo de observação no piloto (`pilot.viewAs`): o usuário do piloto vê no dashboard e no chat os
  negócios de outro colaborador, só leitura, e recebe os alertas e o resumo dele marcados como
  observação; o observado continua sem acesso e sem mensagens.
- Memória curta da conversa (30 minutos, 10 mensagens, sem nomes de clientes): respostas como "2" ou
  "sem retorno do cliente" completam a pergunta anterior.
- Dashboard e IA não dizem mais "superior notificado" quando o aviso só foi registrado (sombra ou
  piloto): o rótulo passa a ser "escalonamento registrado, superior não avisado".
- Rotinas do piloto ativas para o usuário 13 (correção: a versão 0.8.0 as descrevia em sombra).

## [0.8.0] — 17/11/2026 — Secretário comercial, sprint 1 (sombra)

### Adicionado

- Motor: `keepAcrossStages`, `restartOn` (motivo de encerramento `activity`), `riskBefore` e
  `escalation.firstAfter`.
- 11 regras de rotina do secretário no piloto da ProjacSeg, em sombra e não homologadas.
- `tenants:reload`: recarrega a configuração da empresa sem reinstalar.

### Corrigido

- Campos de data do Bitrix24 lidos como dia local (antes, um dia antes em Brasília).

## [0.7.0] — 17/11/2026 — Primeira instalação no portal (modo piloto)

### Adicionado

- Modo piloto (`pilot.userIds`): CRM, mensagens, chat, aplicativo e API restritos aos usuários do
  piloto; tela "Em fase de testes" para os demais; bot oculto durante o piloto.
- Instalação pela notificação do servidor do Bitrix24 (`ONAPPINSTALL`), além do navegador.
- `db:local`: PostgreSQL local sem Docker (PGlite em disco, fora do Git) para testes.
- Logs de diagnóstico: instalação recusada (motivo) e chamada sem autenticação reconhecida (só nomes
  dos campos).

### Testado em portal real

- Instalação, registro do bot `imbot.v2`, leitura dos negócios do usuário do piloto, abertura dentro
  do Bitrix24, dashboard com dados reais e chat do bot — em modo piloto, sem regras.

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
