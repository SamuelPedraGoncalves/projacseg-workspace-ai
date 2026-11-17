# Projeto

## Contexto

A ProjacSeg opera sua área comercial e técnica de seguros no Bitrix24, com dois pipelines
principais: **Automóvel** e **Demais Ramos** (há também Benefícios/Saúde, fora do escopo inicial). O
Teleport já é integrado ao Bitrix24.

A análise das automações exportadas confirmou **75 configurações habilitadas de criação de
tarefas** (57 em produção), consolidadas em **24 regras** estritas (o levantamento anterior falava em
26). 24 robôs recriam tarefas em laço, a provável origem da sobrecarga. Ver
[BITRIX24_AUTOMATIONS.md](BITRIX24_AUTOMATIONS.md).

## Objetivo

Transformar o Bitrix24 numa plataforma de assistência operacional: organizar as obrigações de cada
colaborador, monitorar processos, identificar atrasos, escalonar automaticamente e dar controle à
gestão — sem substituir o Bitrix24 e sem aumentar a burocracia.

## Legenda de status

**Implementado** (código existe) · **Testado localmente** (testes automatizados com mocks/PGlite) ·
**Homologado** (validado com a ProjacSeg em portal) · **Planejado** · **Bloqueado** (depende de
terceiros) · **Aguardando validação**.

Nada neste repositório está **homologado** até agora.

## Estado real (16/11/2026)

| Área                                                                                   | Status                                                           |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Dashboard Minha Jornada, temas, filtros, responsividade, acessibilidade                | Testado localmente                                               |
| Integração do frontend com o Bitrix24 (foto, card do negócio, chat nativo, instalação) | Testado localmente · aguardando homologação em portal            |
| Proteção contra abrir negócios fictícios e respostas fictícias em portal real          | Testado localmente                                               |
| Backend: instalação, tokens criptografados, sessão assinada, leitura do CRM, eventos   | Testado localmente · aguardando portal de testes                 |
| Motor de regras genérico (calendário, risco, atraso, escalonamento, histórico)         | Testado localmente                                               |
| Regras reais da ProjacSeg no motor                                                     | **Bloqueado** — aguardando homologação                           |
| Condições por campo, prazo relativo a data, encerramento por campo, modo sombra        | Planejado                                                        |
| PostgreSQL/Prisma (schema + migração inicial)                                          | Testado localmente (PGlite); migração não revisada para produção |
| Bot do assistente (`imbot` v1)                                                         | Implementado · **API v1 descontinuada** → migrar para `imbot.v2` |
| IA no chat (Claude, desligada por padrão)                                              | Testado com mocks · aguardando decisão de LGPD                   |
| Análise das automações (`tools/bitrix-automations`) e relatórios                       | Testado localmente · interpretação aguardando validação          |
| Avaliação Alaio Vibecode / Hermes / Chatbots 2.0                                       | Pesquisa documental concluída · PoC planejada                    |
| MCP de documentação do Bitrix24 (`.mcp.json`)                                          | Configurado no projeto · testado (lista 8 ferramentas)           |
| Agentes multiagentes, ferramentas com ação, aprovação humana                           | Planejado                                                        |
| Imagens originais do dashboard em `docs/reference/design/`                             | Bloqueado — imagens não recebidas                                |
| Deploy de produção                                                                     | Não autorizado                                                   |

### Divergências em relação ao prompt de continuidade

O prompt descrevia o estado até o commit `97d6cd6`. O repositório já tinha mais três commits:
instalação em portal de testes (`5f8922c`), motor de regras + backend + bot + IA (`19387dd`) e a
primeira análise dos BPT (`326d760`). Esse trabalho foi preservado e está classificado acima; o motor
é genérico e **não contém regras da ProjacSeg**.

## Partes envolvidas

- **TechStone Consultoria** — desenvolvimento e implantação.
- **ProjacSeg** — cliente; homologa regras, números, layout e decisões de dados.
