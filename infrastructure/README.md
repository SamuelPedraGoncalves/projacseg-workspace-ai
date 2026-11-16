# Infraestrutura

## Em uso

| Arquivo              | Uso                                                                    |
| -------------------- | ---------------------------------------------------------------------- |
| `docker-compose.yml` | PostgreSQL 17 + pgvector local: `pnpm db:up`, depois `pnpm db:migrate` |

As credenciais do Compose são só locais. Em servidor, use um banco gerenciado e segredos próprios.

## Previsto

| Componente       | Uso                                                    | Quando                          |
| ---------------- | ------------------------------------------------------ | ------------------------------- |
| Redis + BullMQ   | Agendamento distribuído (mais de uma instância da API) | Ao escalar horizontalmente      |
| Hospedagem HTTPS | API + frontend acessíveis pelo Bitrix24                | Homologação no portal de testes |
| Observabilidade  | Logs e alertas do motor                                | Antes da produção               |

## Regras

- Nenhum deploy em produção sem autorização expressa da TechStone e da ProjacSeg.
- Segredos só em variáveis de ambiente ou cofre — nunca no Git.
- Integração com Bitrix24 apenas em portal de testes até a homologação.
