# Testes

## Comandos

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript em todos os pacotes
pnpm test          # Vitest em todos os pacotes
pnpm test:e2e      # Playwright (desktop 1649×928 e mobile; usa o Chrome instalado)
pnpm build         # build de produção
```

## Cobertura atual (16/11/2026)

| Pacote                     | Testes | O que cobre                                                                                                                         |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `packages/theme`           | 44     | Cores, paleta de 5 tons, tokens, persistência isolada por colaborador                                                               |
| `packages/shared`          | 7      | Schemas e filtros das visões                                                                                                        |
| `packages/engine`          | 35     | Calendário útil, regras, risco/atraso/escalonamento, projeção do dashboard                                                          |
| `apps/api`                 | 48     | Sessão, criptografia, instalação, eventos (domínio, endpoint, token), bot, IA com mocks, motor ponta a ponta, PostgreSQL via PGlite |
| `apps/web`                 | 57     | Dashboard, filtros, temas, assistente, modo Bitrix24 (foto, card, chat, instalação, proteções)                                      |
| `tools/bitrix-automations` | 13     | Leitura segura de PHP serialize, `.bpt`, prazos, anonimização, inventário, consolidação                                             |
| Playwright                 | 6      | Fluxos principais em desktop e mobile                                                                                               |

## Regras

- Fixtures **sintéticas ou anonimizadas**; nunca dados reais de segurados.
- Integrações testadas com mocks ou PGlite. **Nenhum teste usa portal Bitrix24 real.** "Testado
  localmente" não é "homologado".
- Prioridades a cobrir quando as funcionalidades existirem: condições por campo, prazo relativo a
  data, modo sombra, ferramentas de agente, aprovação humana, isolamento entre tenants nas
  ferramentas, eventos duplicados com `imbot.v2`.
