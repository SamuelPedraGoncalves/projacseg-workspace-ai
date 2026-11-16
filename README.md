# ProjacSeg Workspace AI

Aplicação de inteligência operacional desenvolvida pela **TechStone Consultoria** para a corretora
**ProjacSeg**, sobre o Bitrix24. O objetivo é organizar o trabalho do colaborador, monitorar processos,
identificar atrasos e escalonar descumprimentos automaticamente — sem aumentar a burocracia.

> **Estado atual:** dashboard, motor de regras, integração com o Bitrix24, comunicação ativa pelo bot e
> assistente de IA prontos e testados, **ainda sem homologação num portal real** e sem as regras
> homologadas da ProjacSeg. Detalhes em [docs/PROJECT.md](docs/PROJECT.md).

## Requisitos

- Node.js 22+ (desenvolvido com Node 24)
- pnpm 12 (`npm install -g pnpm`)
- Google Chrome instalado (apenas para `pnpm test:e2e`)

## Como rodar

```bash
pnpm install
pnpm dev
```

Abra http://localhost:5173.

## Scripts

| Comando           | O que faz                                                          |
| ----------------- | ------------------------------------------------------------------ |
| `pnpm dev`        | Frontend em modo desenvolvimento (porta 5173)                      |
| `pnpm dev:api`    | API esqueleto (porta 3333, rota `/health`)                         |
| `pnpm lint`       | ESLint em todo o monorepo                                          |
| `pnpm typecheck`  | TypeScript em todos os pacotes                                     |
| `pnpm test`       | Testes unitários e de componentes (Vitest + Testing Library)       |
| `pnpm test:e2e`   | Testes de interface (Playwright, desktop 1649×928 e mobile)        |
| `pnpm build`      | Build de produção (web em `apps/web/dist`, api em `apps/api/dist`) |
| `pnpm format`     | Prettier                                                           |
| `pnpm portal`     | Build + API servindo o app para o Bitrix24 (porta 3333)            |
| `pnpm db:up`      | PostgreSQL + pgvector local (Docker)                               |
| `pnpm db:migrate` | Aplica as migrações do banco                                       |

## Estrutura

```
apps/web          Frontend React
apps/api          Backend Fastify (Bitrix24, motor, bot, IA, PostgreSQL)
packages/engine   Motor de regras (prazos, risco, escalonamento) — sem IA
packages/theme    Motor de temas
packages/shared   Tipos, schemas e regras compartilhadas
packages/ui       Componentes no padrão shadcn/ui
docs/             Documentação
infrastructure/   Infraestrutura (futuro)
```

## Documentação

[Projeto](docs/PROJECT.md) · [Arquitetura](docs/ARCHITECTURE.md) ·
[Design system](docs/DESIGN_SYSTEM.md) · [Regras de negócio](docs/BUSINESS_RULES.md) · [Automações atuais](docs/AUTOMACOES_ATUAIS.md) ·
[Integrações](docs/INTEGRATIONS.md) · [Instalar no Bitrix24](docs/BITRIX24_SETUP.md) · [Segurança](docs/SECURITY.md) · [Roadmap](docs/ROADMAP.md) ·
[Decisões](docs/DECISIONS.md) · [Changelog](docs/CHANGELOG.md)
