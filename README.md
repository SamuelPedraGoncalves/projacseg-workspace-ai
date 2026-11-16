# ProjacSeg Workspace AI

Aplicação de inteligência operacional desenvolvida pela **TechStone Consultoria** para a corretora
**ProjacSeg**, sobre o Bitrix24. O objetivo é organizar o trabalho do colaborador, monitorar processos,
identificar atrasos e escalonar descumprimentos automaticamente — sem aumentar a burocracia.

> **Estado atual (Sprint 1):** frontend demonstrativo do dashboard **Minha Jornada**, com dados
> fictícios e sem conexão com o Bitrix24 ou com IA. Detalhes em [docs/PROJECT.md](docs/PROJECT.md).

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

| Comando          | O que faz                                                          |
| ---------------- | ------------------------------------------------------------------ |
| `pnpm dev`       | Frontend em modo desenvolvimento (porta 5173)                      |
| `pnpm dev:api`   | API esqueleto (porta 3333, rota `/health`)                         |
| `pnpm lint`      | ESLint em todo o monorepo                                          |
| `pnpm typecheck` | TypeScript em todos os pacotes                                     |
| `pnpm test`      | Testes unitários e de componentes (Vitest + Testing Library)       |
| `pnpm test:e2e`  | Testes de interface (Playwright, desktop 1649×928 e mobile)        |
| `pnpm build`     | Build de produção (web em `apps/web/dist`, api em `apps/api/dist`) |
| `pnpm format`    | Prettier                                                           |

## Estrutura

```
apps/web          Frontend React
apps/api          Backend Fastify (esqueleto)
packages/theme    Motor de temas
packages/shared   Tipos, schemas e regras compartilhadas
packages/ui       Componentes no padrão shadcn/ui
docs/             Documentação
infrastructure/   Infraestrutura (futuro)
```

## Documentação

[Projeto](docs/PROJECT.md) · [Arquitetura](docs/ARCHITECTURE.md) ·
[Design system](docs/DESIGN_SYSTEM.md) · [Regras de negócio](docs/BUSINESS_RULES.md) ·
[Integrações](docs/INTEGRATIONS.md) · [Segurança](docs/SECURITY.md) · [Roadmap](docs/ROADMAP.md) ·
[Decisões](docs/DECISIONS.md) · [Changelog](docs/CHANGELOG.md)
