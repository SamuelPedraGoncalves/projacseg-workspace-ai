# Roadmap

Status por etapa (legenda em [PROJECT.md](PROJECT.md)).

| #   | Etapa                                         | Status                                                                                                               |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Dashboard Minha Jornada                       | Testado localmente                                                                                                   |
| 2   | Integração visual com o Bitrix24              | Testado localmente · aguardando homologação em portal                                                                |
| 3   | Levantamento operacional (BPT)                | Análise concluída · interpretação aguardando validação da ProjacSeg                                                  |
| 4   | Pesquisa e PoC Alaio/Hermes                   | Pesquisa concluída · PoC planejada (portal de desenvolvimento, com autorização)                                      |
| 5   | Integração real de leitura                    | Implementada · aguardando portal de testes                                                                           |
| 6   | Motor operacional                             | Genérico + condições, datas, conclusão por campo, papéis e modo sombra testados localmente · regras reais bloqueadas |
| 7   | Primeiro agente de IA (somente leitura)       | Planejado (base: assistente com Claude, desligado)                                                                   |
| 8   | Ferramentas de execução com aprovação         | Mover etapa e preencher campo com confirmação: testado com mocks · ligado no piloto                                  |
| 9   | Orquestração multiagentes                     | Planejado, se a necessidade for confirmada                                                                           |
| 10  | Homologação com a ProjacSeg                   | Planejado — nenhuma automação desligada sem autorização                                                              |
| 11  | Produção                                      | Somente com autorização expressa                                                                                     |
| 12  | Produto comercial (multiempresa, Marketplace) | WorkSeg AI: plano 1 (base multiempresa) testado localmente · planos 2–4 planejados                                   |

## Secretário comercial — sprint 1 (17/11/2026)

Seis rotinas em sombra no piloto (usuário 13): radar de vigência, primeiro contato, cotações, follow-up,
pendência da seguradora, prospecção. Próximos: conversa e campos faltando (2), Demais Ramos com REPEx e
emissão (3), transição dos robôs (4), conferência final no Teleport (5).

## Sprint anterior — "Integração confiável e motor em sombra"

Andamento em 17/11/2026: itens 1, 2 e 3 **testados localmente** (aguardando portal de testes); 4, 5 e 6
pendentes de insumos.

Objetivo: deixar o Workspace pronto para rodar ao lado das automações atuais num portal de testes,
sem enviar avisos duplicados.

1. ✅ **Migrar o bot para `imbot.v2`** (v1 descontinuada): `imbot.v2.Bot.register` (código
   `projacseg_assistant`, idempotente), eventos `ONIMBOTV2*` em modo `fetch` ou webhook com
   verificação de `auth.application_token`, `imbot.v2.Chat.Message.send`; mapa código → ID por empresa.
2. ✅ **Motor: três recursos que faltam** — condições por campo do negócio, prazo relativo a data do
   negócio e encerramento por campo preenchido; responsáveis por papel configurável.
3. ✅ **Modo sombra**: o motor calcula ocorrências e mostra no dashboard, mas não envia avisos enquanto
   a regra equivalente do Bitrix24 estiver ativa (flag por regra).
4. **Rascunho das regras** em `tenants/<domínio>.json` a partir do catálogo, marcado `homologated:
false`, para comparar resultados do motor × robôs no portal de testes.
5. **PoC Hermes (2 dias, portal de desenvolvimento):** compartilhamento com outros funcionários,
   permissões por usuário, MCP/ferramentas próprias, mensagem proativa. Decidir a camada de agentes
   depois.
6. **Pré-requisitos com a ProjacSeg:** portal de testes, respostas do questionário
   ([QUESTIONARIO_HOMOLOGACAO.md](reference/automations/QUESTIONARIO_HOMOLOGACAO.md)), modelos `611`,
   `625`, `789` e decisão de LGPD.

Fora desta sprint: agentes com acesso a produção, alteração de automações, migrações definitivas,
multiagentes, deploy.

## WorkSeg AI (19/11/2026)

O Workspace vira o **WorkSeg AI**, produto para qualquer corretora no Bitrix24 (desenho em
`docs/superpowers/specs/2026-11-19-workseg-ai-design.md`). Quatro planos:

1. **Base multiempresa** — testado localmente: termos provisórios, papéis, boas-vindas, mapeamento,
   calendário e estrutura do Bitrix24, Configurações.
2. **Regras pela tela** — planejado: texto livre traduzido pela IA, conferência por quem criou,
   extensões do motor (repetição, horário, "feito", situação e ramo), sugestão de mapeamento pela IA.
3. **Meus Afazeres** — planejado: afazeres, "feito", canais (afazeres e/ou chat), escalonamento ao
   supervisor, ferramenta da IA por regra.
4. **Telas** — planejado: Minha Jornada nova, Meus negócios (busca e filtros), Temas com cores do
   gráfico, "Ver como", identidade WorkSeg, estrutura local de plano B.

Fora do escopo agora: endossos, sinistros e pós-venda ("Em breve"), cobrança (teste de 7 dias,
Asaas), aba no Connectex.
