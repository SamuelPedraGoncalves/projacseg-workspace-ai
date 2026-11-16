# CLAUDE.md — ProjacSeg Workspace AI

Instruções para o Claude Code (e qualquer agente) neste repositório. Leia também `AGENTS.md`.

## Antes de implementar qualquer alteração

1. Leia a documentação relevante em `docs/`:
   - `docs/PROJECT.md` — objetivo, escopo e o que está (e não está) implementado.
   - `docs/BUSINESS_RULES.md` — regras inegociáveis (IA não calcula prazo, escalonamento automático…).
   - `docs/ARCHITECTURE.md` — pacotes, camadas e fluxo de dados.
   - `docs/DESIGN_SYSTEM.md` — tokens, motor de temas, o que muda e o que não muda de cor.
   - `docs/INTEGRATIONS.md` e `docs/SECURITY.md` — antes de tocar em Bitrix24, LLM, tokens ou dados.
   - `docs/DECISIONS.md` — decisões já tomadas (não reabra sem motivo).
2. Confira `docs/ROADMAP.md` para não antecipar etapas fora do escopo da sprint.

## Ao terminar

- Rode `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`. Para UI, também `pnpm test:e2e`.
- Atualize `docs/CHANGELOG.md` e, se for o caso, `docs/DECISIONS.md` e o doc da área.
- **Nunca** descreva como implementado algo que é apenas planejado.

## Regras do projeto (resumo)

- O sistema trabalha para o colaborador: não crie burocracia nem telas desnecessárias.
- Prazos são calculados pelo motor de regras determinístico, nunca pela IA. O motor funciona sem IA.
- Escalonamento ao superior é automático; o comercial não pode impedir, cancelar ou adiar.
- Toda ocorrência operacional tem histórico auditável.
- Não desative nem altere automações do Bitrix24. Nada de produção sem autorização.
- Multiempresa: tudo escopado por `tenantId`. Nada de IDs de usuários, pipelines ou campos fixos em código.
- Sem tokens no frontend, sem credenciais no Git (use `.env.example`), sem dados reais de segurados.
- Respostas simuladas nunca podem parecer produzidas por uma IA conectada.

## Comandos

```bash
pnpm install        # dependências
pnpm dev            # frontend em http://localhost:5173
pnpm dev:api        # API esqueleto em http://127.0.0.1:3333/health
pnpm test           # Vitest em todos os pacotes
pnpm test:e2e       # Playwright (usa o Google Chrome instalado)
pnpm build          # build de produção
```
