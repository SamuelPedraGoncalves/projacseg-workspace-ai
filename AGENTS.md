# AGENTS.md

Guia para agentes de código (Claude Code, Codex, Cursor etc.) no ProjacSeg Workspace AI.

## Fluxo obrigatório

1. **Consulte a documentação antes de alterar código** (`CLAUDE.md` lista a ordem de leitura).
2. Inspecione o código existente e preserve o trabalho já feito.
3. Implemente em passos pequenos, com testes.
4. Valide: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (+ `pnpm test:e2e` para UI).
5. Atualize `docs/CHANGELOG.md` e os documentos afetados.

## Base de conhecimento (fonte de verdade)

Antes de implementar, consulte `docs/` — ela distingue **Implementado · Testado localmente ·
Homologado · Planejado · Bloqueado · Aguardando validação** (legenda em `docs/PROJECT.md`). Nunca
descreva como homologado o que só foi testado com mocks.

| Assunto                       | Documento                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Estado real e status          | `docs/PROJECT.md`, `docs/ROADMAP.md`                                          |
| Regras de negócio e motor     | `docs/BUSINESS_RULES.md`, `docs/OPERATIONAL_ENGINE.md`                        |
| Automações atuais do Bitrix24 | `docs/BITRIX24_AUTOMATIONS.md`, `docs/reference/automations/`                 |
| Integrações, IA e agentes     | `docs/INTEGRATIONS.md`, `docs/AI_INTEGRATION.md`, `docs/HERMES_EVALUATION.md` |
| Segurança e testes            | `docs/SECURITY.md`, `docs/TESTING.md`                                         |
| Decisões                      | `docs/DECISIONS.md`                                                           |

Métodos do Bitrix24: use o MCP `bitrix24-docs` (configurado em `.mcp.json`) antes de implementar
chamadas. Não use o MCP operacional nem portal de produção sem autorização.

## Mapa do monorepo

| Caminho                    | Responsabilidade                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/web`                 | Frontend React (Vite, Tailwind v4, Zustand, TanStack Query, React Router)                       |
| `apps/api`                 | Backend Fastify: instalação Bitrix24, motor em segundo plano, bot, IA, API do dashboard, Prisma |
| `packages/engine`          | Motor de regras puro e determinístico (prazos, risco, escalonamento, projeção do dashboard)     |
| `tools/bitrix-automations` | Analisador seguro dos modelos de automação exportados (.bpt)                                    |
| `packages/theme`           | Motor de temas puro (paleta de 5 tons, tokens CSS, persistência por colaborador)                |
| `packages/shared`          | Tipos, schemas Zod e regras puras compartilhadas                                                |
| `packages/ui`              | Componentes no padrão shadcn/ui (Radix + cva + Tailwind)                                        |
| `docs/`                    | Documentação técnica e operacional                                                              |
| `infrastructure/`          | Docker Compose (PostgreSQL + pgvector) para desenvolvimento; deploy futuro                      |

## Convenções

- TypeScript `strict`, `noUncheckedIndexedAccess`, imports de tipo com `import type`.
- Cores: só via CSS custom properties (`--theme-*` para tema, tokens fixos para semântica). Nunca HEX
  de tema solto em componentes.
- Componentes pequenos, um por arquivo; lógica pura fora de componentes (e testada).
- Texto da interface em português do Brasil.
- Pacotes do workspace exportam TypeScript direto (`exports: ./src/index.ts`); não há etapa de build
  por pacote.
- O frontend não deve importar runtime do Zod (pesa ~85 KB). Use `import type` de `@projacseg/shared`
  e as funções puras de `@projacseg/shared/journey`.

## Limites

- Não conecte ao Bitrix24 de produção, não altere automações, não faça deploy sem autorização.
- Não implemente o agente de IA real nem o motor operacional fora da sprint correspondente.
