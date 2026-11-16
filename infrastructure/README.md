# Infraestrutura

Nada desta pasta está em uso na Sprint 1. A primeira entrega roda só com `pnpm dev` (frontend Vite).

## Previsto (ver docs/ROADMAP.md)

| Componente            | Uso                                                      | Quando                      |
| --------------------- | -------------------------------------------------------- | --------------------------- |
| PostgreSQL + pgvector | Dados de tenants, preferências, ocorrências e embeddings | Sprint do motor operacional |
| Redis + BullMQ        | Filas do motor de regras e do escalonamento              | Sprint do motor operacional |
| Docker Compose        | Ambiente local com Postgres e Redis                      | Junto com o banco           |

## Regras

- Nenhum deploy em produção sem autorização expressa da TechStone e da ProjacSeg.
- Segredos só em variáveis de ambiente ou cofre — nunca no Git.
- Integração com Bitrix24 apenas em portal de testes até a homologação.
