# Roadmap

Legenda: ✅ concluído · 🔜 próximo · ⏳ planejado

## ✅ Sprint 1 — Minha Jornada (frontend demonstrativo)

Dashboard, temas, filtros, detalhes, chat demonstrativo, responsividade, acessibilidade, testes e
documentação. API apenas como esqueleto.

Incluído depois, na mesma entrega: integração pelo navegador com o Bitrix24 (foto do perfil no
avatar, botão Abrir indo ao card do negócio, assistente abrindo o chat do Bitrix24).

## 🔜 Sprint 2 — Homologação e base de dados

- Homologar layout com a ProjacSeg (comparar com as imagens originais).
- Homologar os números do levantamento (75 configurações / 26 regras) com os arquivos das automações.
- Instalar Prisma + PostgreSQL; migrar o rascunho de `schema.prisma`.
- Docker Compose local (Postgres com pgvector).
- Validação de contraste WCAG por componente para temas personalizados.

## ⏳ Sprint 3 — Integração Bitrix24 (portal de testes)

- Instalar o aplicativo num **portal de testes** e homologar foto, card do negócio e chat.
- Handler do aplicativo aceitando `POST` (servir o `index.html`).
- Registrar o bot do assistente (`imbot.register`, código `projacseg_assistant`) na instalação.
- OAuth no backend; mapeamento domínio/`member_id` → `tenantId`.
- Leitura de negócios, tarefas, departamentos e superiores.
- Substituir `DemoJourneyRepository` pela API; persistir tema por `tenantId` + `bitrixUserId`.

## ⏳ Sprint 4 — Motor operacional

- Catálogo das regras operacionais configurável por tenant.
- Cálculo determinístico de prazos (calendário útil).
- Ocorrências com histórico auditável; escalonamento automático e não bloqueável.
- Redis + BullMQ para agendamentos e filas; eventos `ONCRMDEALUPDATE`.

## ⏳ Sprint 5 — Assistente de IA

- Porta `LlmProvider` desacoplada; primeiro provedor.
- Bot do assistente respondendo no chat do Bitrix24 (evento `ONIMBOTMESSAGEADD` → backend → IA).
- Resumo de prioridades e respostas sobre a carteira do colaborador, usando dados do motor.
- pgvector para contexto (base de conhecimento).

## ⏳ Depois

- Dashboard como página inicial no Bitrix24 (após homologação).
- Visões de gestor (equipe, escalonamentos recebidos).
- Deploy de produção (somente com autorização).
