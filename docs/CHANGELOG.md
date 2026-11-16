# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
