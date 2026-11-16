# Roadmap

Legenda: ✅ concluído · 🔜 próximo · ⏳ planejado

## ✅ Sprint 1 — Minha Jornada (frontend demonstrativo)

Dashboard, temas, filtros, detalhes, chat demonstrativo, responsividade, acessibilidade, testes e
documentação. API apenas como esqueleto.

## 🔜 Sprint 2 — Homologação e base de dados

- Homologar layout com a ProjacSeg (comparar com as imagens originais).
- Homologar os números do levantamento (75 configurações / 26 regras) com os arquivos das automações.
- Instalar Prisma + PostgreSQL; migrar o rascunho de `schema.prisma`.
- Docker Compose local (Postgres com pgvector).
- Validação de contraste WCAG por componente para temas personalizados.

## ⏳ Sprint 3 — Integração Bitrix24 (portal de testes)

- Aplicativo Bitrix24 com OAuth; identificação de portal e usuário.
- Leitura de negócios, tarefas, departamentos e superiores.
- Substituir `DemoJourneyRepository` pela API; persistir tema por `tenantId` + `bitrixUserId`.
- Abrir negócio dentro do CRM.

## ⏳ Sprint 4 — Motor operacional

- Catálogo das regras operacionais configurável por tenant.
- Cálculo determinístico de prazos (calendário útil).
- Ocorrências com histórico auditável; escalonamento automático e não bloqueável.
- Redis + BullMQ para agendamentos e filas; eventos `ONCRMDEALUPDATE`.

## ⏳ Sprint 5 — Assistente de IA

- Porta `LlmProvider` desacoplada; primeiro provedor.
- Resumo de prioridades e respostas sobre a carteira do colaborador, usando dados do motor.
- pgvector para contexto (base de conhecimento).

## ⏳ Depois

- Dashboard como página inicial no Bitrix24 (após homologação).
- Visões de gestor (equipe, escalonamentos recebidos).
- Deploy de produção (somente com autorização).
