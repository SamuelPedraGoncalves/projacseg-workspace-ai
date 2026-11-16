# Roadmap

Legenda: ✅ concluído · 🔜 próximo · ⏳ planejado

## ✅ Sprint 1 — Minha Jornada (frontend)

Dashboard, temas, filtros, responsividade, acessibilidade, integração do frontend com o Bitrix24
(foto, card do negócio, chat do bot) e preparação da instalação.

## ✅ Motor operacional e integração (código pronto, sem homologação em portal)

- Motor de regras determinístico, ocorrências auditáveis, escalonamento automático.
- Backend com PostgreSQL/Prisma, tokens criptografados, sessão assinada, eventos do CRM, agendador.
- Comunicação ativa pelo bot e resumo diário.
- Dashboard com dados reais e atualização automática.
- Assistente de IA no chat (opcional).

## 🔜 Homologação (depende da ProjacSeg e do ambiente)

- Levantar e homologar as 26 regras (gatilho, prazo, responsável, escalonamento) e o calendário.
- Mapear os campos do CRM (ramo, tipo, vigência) em `tenants/<domínio>.json`.
- Conferir o organograma do Bitrix24 (chefes de departamento) — base do escalonamento.
- Portal de testes + servidor HTTPS + PostgreSQL; instalar e rodar o roteiro de BITRIX24_SETUP.md.
- Decisão de LGPD e do provedor de IA; ligar a IA para usuários piloto.
- Piloto em paralelo às automações atuais; só depois desligar automações antigas.

## ⏳ Depois

- Visão do gestor: equipe, ocorrências escalonadas recebidas, histórico por negócio.
- Edição de regras pela interface (com trilha de auditoria).
- BullMQ/Redis para várias instâncias; observabilidade.
- Base de conhecimento (pgvector) para o assistente.
- Validação de contraste WCAG por componente para temas personalizados.
- Dashboard como página inicial no Bitrix24 (após homologação).
- Deploy de produção (somente com autorização).
