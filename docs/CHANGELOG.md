# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
