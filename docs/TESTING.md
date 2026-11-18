# Testes

## Comandos

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript em todos os pacotes
pnpm test          # Vitest em todos os pacotes
pnpm test:e2e      # Playwright (desktop 1649×928 e mobile; usa o Chrome instalado)
pnpm build         # build de produção
```

## Cobertura atual (17/11/2026)

| Pacote                     | Testes | O que cobre                                                                                                                                                                                                  |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/theme`           | 44     | Cores, paleta de 5 tons, tokens, persistência isolada por colaborador                                                                                                                                        |
| `packages/shared`          | 7      | Schemas e filtros das visões                                                                                                                                                                                 |
| `packages/engine`          | 64     | Calendário útil (para frente e para trás), regras, condições, prazo relativo a data, conclusão por campo, papéis, modo sombra, radar entre etapas, follow-up reiniciado por atividade, projeção do dashboard |
| `apps/api`                 | 69     | Sessão, criptografia, instalação (navegador e notificação do servidor), bot v2, modo piloto, IA com mocks, motor ponta a ponta, campos de data, PostgreSQL via PGlite com todas as migrações                 |
| `apps/web`                 | 58     | Dashboard, filtros, temas, assistente, modo Bitrix24 (foto, card, chat via backend, instalação, piloto)                                                                                                      |
| `tools/bitrix-automations` | 13     | Leitura segura de PHP serialize, `.bpt`, prazos, anonimização, inventário, consolidação                                                                                                                      |
| Playwright                 | 6      | Fluxos principais em desktop e mobile                                                                                                                                                                        |

## Regras

- Fixtures **sintéticas ou anonimizadas**; nunca dados reais de segurados.
- Integrações testadas com mocks ou PGlite. **Nenhum teste usa portal Bitrix24 real.** "Testado
  localmente" não é "homologado".
- Prioridades a cobrir quando as funcionalidades existirem: ferramentas de agente, aprovação humana,
  isolamento entre tenants nas ferramentas, eventos repetidos do `imbot.v2` no portal real.
