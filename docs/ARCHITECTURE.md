# Arquitetura

## Visão geral

Monorepo **pnpm workspaces**. Pacotes internos exportam TypeScript diretamente (sem build por pacote);
quem consome (Vite no web, esbuild na API, Vitest nos testes) compila.

```
apps/web ──► packages/ui ──► (Radix, cva, tailwind-merge, lucide)
   │   └───► packages/theme   (puro, sem React)
   └───────► packages/shared  (tipos; runtime Zod só na API)
apps/api ──► packages/shared
```

## Frontend (`apps/web`)

| Tecnologia                           | Uso                                                         |
| ------------------------------------ | ----------------------------------------------------------- |
| React 19 + TypeScript strict         | Interface                                                   |
| Vite 8                               | Dev server e build                                          |
| Tailwind CSS 4 (`@tailwindcss/vite`) | Estilos utilitários sobre os tokens CSS                     |
| shadcn/ui (padrão)                   | Componentes em `packages/ui` (Radix Dialog + cva + `cn`)    |
| Lucide React                         | Ícones                                                      |
| Zustand                              | Estado de interface (diálogos) e do tema                    |
| TanStack Query                       | Acesso a dados via `JourneyRepository` (hoje demonstrativo) |
| React Router 7                       | Uma URL por visão da jornada                                |
| @fontsource/poppins                  | Poppins servida localmente (sem chamada ao Google Fonts)    |

### Organização

```
src/
  app/            providers, rotas, query client, store de UI
  config/         sessão do colaborador (demo, via variáveis VITE_)
  layout/         AppShell, Sidebar, PageHeader, saudação
  features/
    journey/      página Minha Jornada, banner, indicadores, configuração das visões
    deals/        dados demo, repositório, queries, cards, filtros, diálogo de detalhes
    assistant/    chat demonstrativo e respostas predefinidas
    theme/        store do tema e diálogo "Personalizar tema"
  integrations/   portas do lado do navegador (abrir negócio no CRM)
  test/           setup e utilitário de renderização
```

### Fluxo de dados

1. A **rota** define a visão (`today`, `all`, `risk`, `waiting`, `resolved`) — fonte única de verdade
   do filtro, do item ativo no menu e do breadcrumb.
2. `useDeals()` / `useJourneySummary()` / `useBriefing()` (TanStack Query) chamam o
   `JourneyRepository`. Hoje: `DemoJourneyRepository`. Futuro: implementação HTTP para a API.
3. `filterDealsByView` (em `@projacseg/shared/journey`) aplica a regra de filtragem.
4. Diálogos abertos ficam no `useUiStore` (Zustand).

### Tema

`packages/theme` é puro: gera paleta e tokens. No web, `createThemeStore` liga o motor ao DOM
(`document.documentElement`) e a um `ThemePreferenceRepository`. O store é criado na importação em
`main.tsx`, antes da primeira renderização, evitando "piscar" o tema padrão. Detalhes em
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Backend (`apps/api`) — esqueleto

| Tecnologia | Uso                                                                      |
| ---------- | ------------------------------------------------------------------------ |
| Fastify 5  | Servidor HTTP (`buildApp` separado de `listen` para testes com `inject`) |
| Zod 4      | Validação da configuração e dos contratos                                |
| esbuild    | Build em arquivo único (`dist/index.js`), embutindo pacotes do workspace |
| tsx        | Execução em desenvolvimento                                              |

```
src/
  app.ts, index.ts          montagem e inicialização
  config/env.ts             variáveis de ambiente validadas
  modules/health            GET /health
  modules/theme-preferences contrato + repositório em memória (sem rota HTTP ainda)
  integrations/bitrix24     tipos e portas (interfaces) — sem implementação
prisma/schema.prisma        RASCUNHO de modelagem, Prisma não instalado
```

Camadas previstas por módulo: **domínio** (regras puras), **aplicação** (casos de uso), **infra**
(Prisma, Bitrix24, LLM) e **interface** (rotas Fastify).

## Preparado para depois (não instalado)

- **PostgreSQL + pgvector + Prisma** — ver rascunho em `apps/api/prisma/schema.prisma`.
- **Redis + BullMQ** — filas do motor de regras e do escalonamento.
- **Docker Compose** — ambiente local (`infrastructure/`).
- **LLM** — interface desacoplada de provedor (porta `LlmProvider` a criar na sprint do assistente).

## Qualidade

ESLint 10 (flat config, typescript-eslint, react-hooks, react-refresh), Prettier, Vitest 5 +
Testing Library + jsdom, Playwright (projetos desktop 1649×928 e mobile Pixel 7).
