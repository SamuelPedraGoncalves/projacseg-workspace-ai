# Avaliação: Alaio Vibecode, Hermes e Chatbots 2.0

Status: **pesquisa documental concluída (16/11/2026); nenhuma prova de conceito executada.** Fontes
oficiais lidas nesta data. Nada abaixo foi homologado. Decisão arquitetural: **pendente** (ver fim).

## Fontes consultadas (16/11/2026)

| Fonte                                                                                                 | URL                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vibecode (home, docs, MCP, IA, preços, confiança, agentes, bots, escopos, OAuth, consumo, Black Hole) | https://vibecode.bitrix24.com/ · /pt-br/docs · /docs/mcp · /docs/ai · /pricing · /trust · /ai-agents · /docs/agents · /docs/bots · /docs/scopes · /docs/keys-auth/oauth · /docs/ai/consumption · /blackhole |
| Página Bitrix24 de agentes                                                                            | https://www.bitrix24.com/tools/vibecode/ai-agents.php                                                                                                                                                       |
| Hermes (repositório e docs)                                                                           | https://github.com/NousResearch/hermes-agent · https://hermes-agent.nousresearch.com/docs                                                                                                                   |
| Chatbots 2.0                                                                                          | https://apidocs.bitrix24.com/api-reference/chat-bots/chat-bots-v2/index.html (+ Bot.register, Chat.Message.send, events, change log)                                                                        |
| npm                                                                                                   | `@bitrix24/mcp-docs` 0.2.0 · `@bitrix24/mcp-vibecode-api` 3.4.5                                                                                                                                             |

Não lido: `llms-full.txt` (passa de 10 MB, limite da ferramenta), política de privacidade
(redireciona para bitrix24.com/privacy), limites de taxa da IA, termos.

## Capacidades confirmadas

| Tema                      | Confirmado                                                                                                                                                                                                                       | Limitação / não encontrado                                                                                                                                                                                                                                                           | Impacto                                                                              | Testar                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Vibecode                  | Plataforma oficial de apps Bitrix24; "Alaio Vibecode — a Bitrix24 ecosystem project"; exige plano Vibe+                                                                                                                          | Entidade jurídica da Alaio não identificada                                                                                                                                                                                                                                          | Fornecedor do ecossistema, não terceiro avulso                                       | —                                                    |
| Hermes gerenciado         | Cria servidor, registra bot, conecta modelo; aparece como bot no chat; memória; anexos/voz; log de auditoria                                                                                                                     | **Por padrão fala só com o criador**; permissões = conta do criador; até 3 agentes/usuário; **API só lista agentes** (criação só pelo painel); ferramentas próprias, MCP próprio e chamadas ao nosso backend **não documentados**; preço contraditório (grátis × cobrado por minuto) | Não atende hoje "um agente para todos os colaboradores com as permissões de cada um" | PoC: compartilhar agente, MCP próprio, código do bot |
| Hermes open source        | MIT; Python; auto-hospedável (Docker); cliente MCP (stdio/HTTP, OAuth 2.1); ferramentas e plugins; cron; subagentes; aprovações (`smart`/`manual`); logs; qualquer provedor (inclui Anthropic)                                   | **Sem conector Bitrix24**; isolamento por usuário dentro de um perfil não documentado; shell no host por padrão (usar backend Docker)                                                                                                                                                | Viável só com gateway Bitrix24 nosso                                                 | PoC isolada, sem produção                            |
| Chatbots 2.0 (`imbot.v2`) | `imbot.v2.Bot.register` com `code` escolhido pelo app, idempotente, devolve o ID; eventos `ONIMBOTV2*` por `fetch` ou `webhook`; verificar `auth.application_token`; 100 bots/app; 2 req/s por app; REST só em planos comerciais | v1 (`imbot.register`) **descontinuada** ("development halted"), sem data de desligamento; mensagem proativa a quem nunca falou com o bot não confirmada na API v2 (o Vibecode diz que funciona)                                                                                      | **Nosso backend usa a v1: migrar**                                                   | Registro + envio proativo em portal de testes        |
| AI Router / créditos      | API compatível com OpenAI; BitrixGPT + BYOK (OpenAI, Anthropic, OpenRouter); cota mensal por conta; 402 ao esgotar; "paid scenarios pause"                                                                                       | Valores de cota e retenção não encontrados                                                                                                                                                                                                                                           | Motor não pode depender de créditos                                                  | —                                                    |
| MCP                       | `@bitrix24/mcp-docs` (8 ferramentas, sem chave); `@bitrix24/mcp-vibecode-api` (53 ferramentas, exige chave `vibe_api_`/`vibe_app_`)                                                                                              | —                                                                                                                                                                                                                                                                                    | Docs: pode ser configurado; operacional: só com autorização e portal de testes       | —                                                    |

## Matriz comparativa (preliminar)

| Critério                               | Hermes gerenciado (Alaio)       | Hermes próprio    | Agentes TechStone                  | Híbrido (motor + ferramentas TechStone; agente plugável) |
| -------------------------------------- | ------------------------------- | ----------------- | ---------------------------------- | -------------------------------------------------------- |
| Custo                                  | Créditos/minuto (contraditório) | Servidor + modelo | Modelo + nosso servidor            | Modelo + nosso servidor                                  |
| Segurança / permissões por colaborador | Permissões do criador           | A construir       | Já no backend (sessão por usuário) | Backend autoriza toda ferramenta                         |
| Controle                               | Baixo (painel)                  | Alto              | Alto                               | Alto                                                     |
| Integração com nosso backend           | Não documentada                 | MCP/ferramentas   | Nativa                             | Nativa                                                   |
| Manutenção                             | Baixa                           | Alta              | Média                              | Média                                                    |
| Dependência de fornecedor              | Alta                            | Baixa             | Baixa                              | Baixa                                                    |

**Recomendação preliminar (não decidida):** arquitetura híbrida — motor e ferramentas autorizadas no
backend TechStone, bot próprio via `imbot.v2`, provedor de IA atrás de interface. Reavaliar o Hermes
gerenciado se a PoC mostrar acesso multiusuário com permissões individuais e ferramentas próprias.

## MCP de documentação

Pacote confirmado: `@bitrix24/mcp-docs` (mantenedores do escopo `@bitrix24`, os mesmos do
`@bitrix24/b24jssdk`). Comando oficial: `claude mcp add bitrix24-docs -- mcp-docs` após
`npm install -g @bitrix24/mcp-docs`; no Windows, sem instalação global:
`claude mcp add --scope project bitrix24-docs -- cmd /c npx -y @bitrix24/mcp-docs`.
**Configurado** no escopo do projeto (`.mcp.json`, sem chaves) e testado em 16/11/2026: o servidor
responde como `bitrix24-docs` 0.2.0 e lista 8 ferramentas (`search_docs`, `get_method_detail`,
`get_rest_methods`, `get_scopes`, `get_placements`, `get_placement_detail`, `get_app_types`,
`get_categories`). O MCP operacional (`@bitrix24/mcp-vibecode-api`) **não** foi configurado.
