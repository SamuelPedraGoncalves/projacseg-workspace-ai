# Arquitetura

## Visão geral

Monorepo **pnpm workspaces**. Pacotes internos exportam TypeScript diretamente; quem consome (Vite,
esbuild, Vitest) compila.

```
apps/web ──► packages/ui, packages/theme, packages/shared (só tipos + lógica pura)
apps/api ──► packages/engine ──► packages/shared
```

```
Bitrix24 ──POST handler/install──► API (Fastify) ──► index.html + sessão assinada ──► React
Bitrix24 ──eventos de negócio───► /bitrix24/events/crm ──► EngineService ──► PostgreSQL
Agendador (1 min) ─► prazos, escalonamento, resumo ─► bot (imbot.v2.Chat.Message.send) ─► chat do Bitrix24
Colaborador escreve ao bot ─► /bitrix24/events/assistant ─► AssistantService ─► Claude (opcional)
React ──GET /api/v1/journey (Bearer sessão)──► projeção do motor
```

## packages/engine — motor de regras (puro, sem IA, sem rede)

| Módulo        | Função                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `calendar.ts` | Calendário útil (fuso fixo, dias úteis, expediente, feriados); soma tempo corrido, horas úteis e dias úteis                       |
| `rules.ts`    | Esquema das regras (SLA de etapa), validação, aplicação por pipeline/etapa                                                        |
| `evaluate.ts` | `evaluateDeal(negócio, regras, ocorrências, calendário, agora)` → comandos: abrir, risco, atraso, escalonar, reatribuir, resolver |
| `journey.ts`  | `projectJourney` → negócios do dashboard, indicadores e resumo de prioridades (texto determinístico)                              |

Não existe comando para cancelar ou adiar escalonamento: a ocorrência só termina quando o negócio sai
da etapa ou é fechado.

## apps/api — backend

| Pasta                      | Responsabilidade                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store/`                   | Contrato `Store`; `memory-store` (testes/sem banco) e `prisma-store` (PostgreSQL)                                                                  |
| `security/`                | `TokenCipher` (AES-256-GCM) e `SessionSigner` (HMAC-SHA256)                                                                                        |
| `integrations/bitrix24/`   | REST client, `Bitrix24Portal` (tokens, renovação, paginação), `CrmReader`, `HierarchyResolver`, `AssistantBot` (`imbot.v2`), `PortalEventVerifier` |
| `integrations/llm/`        | `LlmProvider` (interface) e `AnthropicProvider` (SDK oficial, fallback do servidor)                                                                |
| `modules/bitrix-app/`      | Instalação (tokens, eventos, regras, catálogo) e abertura (sessão)                                                                                 |
| `modules/engine/`          | `EngineService`, `DigestService`, `DedupNotifier`, `EngineScheduler`, eventos do CRM                                                               |
| `modules/journey/`         | Projeção do dashboard, `GET /api/v1/journey`, histórico do negócio                                                                                 |
| `modules/assistant(-bot)/` | Chat do bot: IA com contexto do motor, ou mensagem fixa                                                                                            |
| `modules/tenants/`         | Configuração por empresa (`tenants/<domínio>.json`)                                                                                                |
| `modules/setup/`           | WorkSeg: acesso (administrador, criadores de regras, licença), termos e aceites, mapeamento, calendário e estrutura (`/api/v1/setup/*`)            |
| `modules/web-app/`         | Serve o build e responde ao POST do Bitrix24                                                                                                       |
| `prisma/`                  | Schema e migrações (`migrations/20261116000000_init`)                                                                                              |

### Dados (PostgreSQL)

`Tenant` (tokens criptografados, config, `installedByUserId`), `Rule`, `DealSnapshot`, `Occurrence`
(única por negócio + regra + entrada na etapa), `OccurrenceEvent` (somente inserção),
`NotificationLog` (deduplicação), `ThemePreference`, `AssistantAction`, `TenantRole` (quem cria
regras) e `ConsentRecord` (aceites de termos e avisos, somente inserção).

### Agendamento

`EngineScheduler` em processo: a cada `ENGINE_TICK_SECONDS` avança prazos e envia resumos; a cada
`ENGINE_FULL_SYNC_MINUTES` ressincroniza o CRM (rede de segurança para eventos perdidos). Para mais de
uma instância, trocar por BullMQ/Redis (interface já isolada).

## apps/web — frontend

React 19, Vite 8, Tailwind 4, componentes no padrão shadcn (`packages/ui`), Zustand, TanStack Query,
React Router 7, Poppins local.

- `platform/`: detecta o ambiente (Bitrix24 ou demonstração), lê a sessão injetada no HTML e escolhe o
  repositório de dados (`ApiJourneyRepository` ou `DemoJourneyRepository`).
- `features/deals/queries.ts`: uma consulta (`/api/v1/journey`) alimenta lista, indicadores e banner;
  atualização automática a cada 60 s com dados reais.
- `integrations/bitrix24/`: BX24 JS SDK (foto, card do negócio, chat do bot, instalação).

## Qualidade

ESLint 10, Prettier, Vitest 5 (engine, api — inclusive integração com PostgreSQL via PGlite —, web,
theme, shared), Testing Library, Playwright (desktop 1649×928 e mobile).
