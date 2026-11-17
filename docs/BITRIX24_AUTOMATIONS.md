# Automações atuais do Bitrix24 (ProjacSeg)

Status: **análise concluída sobre as exportações de 16/11/2026 · interpretação NÃO homologada.**
Nenhuma automação do Bitrix24 foi alterada.

Relatórios gerados (anonimizados) em [`reference/automations/`](reference/automations/):
[inventário](reference/automations/INVENTARIO.md) ·
[matriz de tarefas](reference/automations/MATRIZ_TAREFAS.md) ·
[catálogo de regras](reference/automations/CATALOGO_REGRAS.md) ·
[escalonamentos](reference/automations/ESCALONAMENTOS.md) ·
[dependências](reference/automations/DEPENDENCIAS.md) ·
[questionário de homologação](reference/automations/QUESTIONARIO_HOMOLOGACAO.md) ·
JSON: `inventory.json`, `rules.catalog.json`, `escalations.json`.
Regerar: `pnpm --filter @projacseg/bitrix-automations analyze` (originais em `data/private/`).

## Números confirmados

| Indicador                                      | Resultado | Levantamento anterior | Classificação                                                        |
| ---------------------------------------------- | --------- | --------------------- | -------------------------------------------------------------------- |
| Arquivos recebidos / distintos                 | 16 / 15   | —                     | `bp-85.bpt` e `bp-85 (1).bpt` idênticos (mesmo SHA-256)              |
| Configurações de criação de tarefa habilitadas | **75**    | 75                    | **Confirmado**                                                       |
| … em produção                                  | 57        | —                     | 18 só rodam no ramo "Homologação = SIM" (Demais Ramos › Transmissão) |
| Configurações desabilitadas                    | 46        | —                     | Não contadas no levantamento (correto)                               |
| Em produção recriadas em laço                  | 24        | —                     | Não citado no levantamento                                           |
| Regras consolidadas (agrupamento estrito)      | **24**    | 26                    | **Divergência de critério** (ver abaixo)                             |
| Regras por finalidade (proposta)               | ~19       | 26                    | Depende de homologação                                               |
| Avisos em produção / escalonamentos            | 69 / 46   | —                     | Não citado                                                           |

Três quantidades diferentes, que não devem ser confundidas:

- **Configurações:** robôs de criação de tarefa (75 habilitados, 57 em produção).
- **Tarefas geradas em execução:** maiores que as configurações, porque 24 robôs recriam a tarefa
  após cada conclusão enquanto a condição continuar (sem limite de repetições).
- **Regras:** o que a operação quer garantir (24 estritas; cerca de 19 agrupando por finalidade).

## Modelos × etapas

Cada `.bpt` é o modelo de automação de uma etapa ("Bizproc Automation template", versão 2, editado no
designer). Gatilho: entrada do negócio na etapa. Mapa em
[`stage-map.json`](reference/automations/stage-map.json), com a evidência de cada etapa.

| Pipeline     | Etapas com modelo                                                                                      | Confiança                       |
| ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Automóvel    | Entrada, Enviar cotação, Cotação enviada, Proposta transmitida, Processo pendente, Concluído, Perdidos | alta (Processo pendente: média) |
| Demais Ramos | Entrada, Elaborando cotações, Cotação enviada, Transmissão/Em emissão, Proposta pendente, Emitidos     | alta (Proposta pendente: média) |
| A confirmar  | `bp-47` e `bp-285` (Perdidos do Demais Ramos e Prospecção do Automóvel, provavelmente)                 | sem tarefas                     |

## Por que 24 e não 26

O agrupamento estrito junta cópias que só diferem pela ramificação (PF/PJ, campo vazio ou
preenchido). Restam 24 combinações distintas de etapa, ação, prazo e responsável. O critério do
levantamento anterior não está documentado; a lista das 26 é necessária para comparar regra a regra.
Hipóteses: contar controles de inatividade como regras, ou separar por tipo de seguro.

### Duplicidades e finalidades semelhantes

| Grupo                      | Regras                                       | Observação                                                               |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| Preencher "Tipo do Seguro" | R13 (Elaborando) e R17 (Entrada)             | Mesma tarefa em duas etapas, ambas em laço de 1 h útil                   |
| Cadastro no Teleport       | R21 e R22                                    | Títulos diferentes ("do negócio" × "da proposta"), mesmo prazo           |
| Acompanhamento de emissão  | R09/R10 (Automóvel) e R19/R20 (Demais Ramos) | Títulos diferentes; prazos 12/15 dias **corridos** × 15/3 dias **úteis** |
| Envio de boleto            | R23 (PF) e R24 (PJ)                          | 3 dias úteis × 30 minutos úteis                                          |
| Negociação / follow-up     | R02/R03 (Automóvel) e R11 (Demais Ramos)     | Títulos diferentes; todos recriados em laço                              |
| Cotação                    | R06/R07 (Automóvel)                          | 24 h × 48 h conforme tipo de seguro                                      |

### Condições que impedem ou adiam a criação

- Ramo "Homologação = SIM": 18 tarefas só para negócios de teste.
- Laços que esperam campo preenchido (Tipo do Seguro, Tipo de Pessoa, Número do cálculo) ou mudança de
  etapa antes de seguir o fluxo.
- Condições por Tipo de Seguro, Ramo, Tipo de Pessoa, Forma de pagamento e "Seguro renovável?".

## Escalonamentos atuais

Detalhe em [ESCALONAMENTOS.md](reference/automations/ESCALONAMENTOS.md). Resumo:

| Pipeline › etapa                             | Quando                                     | Para quem                                  | Repete |
| -------------------------------------------- | ------------------------------------------ | ------------------------------------------ | ------ |
| Automóvel › Enviar cotação e Cotação enviada | A cada 24 h enquanto não muda de etapa     | Superior (e um usuário fixo em renovações) | Sim    |
| Automóvel › Proposta transmitida             | 16 dias úteis                              | Superior                                   | Não    |
| Automóvel › Processo pendente                | 50 h úteis · 4 · 10 · 11 dias úteis        | Superior; usuário fixo em 4 e 11 dias      | Não    |
| Demais Ramos › Entrada e Elaborando          | 2 h ou 4 h; depois +3 h ou +6 h            | Dois usuários fixos, em sequência          | Não    |
| Demais Ramos › Entrada (renovação)           | 1 e 3 dias úteis após o início de vigência | Dois usuários fixos                        | Não    |

Implicação: em **modo sombra**, o motor não deve enviar avisos que dupliquem estes.

## Dependências

Detalhe em [DEPENDENCIAS.md](reference/automations/DEPENDENCIAS.md). Pontos principais:

- Cada etapa **encerra as tarefas das etapas anteriores** — mesmo comportamento do motor (resolver
  ao mudar de etapa).
- Robôs movem o negócio de etapa (Entrada → Cotação; Transmissão → Proposta pendente).
- Fluxos externos iniciados: modelos `611`, `625` ("Concluir orçamentos") e `789`, **não exportados**.
- Tarefas em laço dependem da conclusão da tarefa anterior (`HoldToClose`).

## Fora do escopo principal

- Pipeline **Benefícios/Saúde** (`C21`) presente nos metadados; sem modelo exportado.
- Cópia de negócio para o pipeline `13` (robô desabilitado).
- Integrações externas: 21 webhooks em produção para servidores próprios da corretora (hosts
  anonimizados como `HOST-xx`), 4 e-mails no Concluído, apps de WhatsApp (Fale Fácil em produção;
  Whatcrm e PowerZap desabilitados).
- Teleport: tarefas de cadastro e laço "Enquanto Número do cálculo vazio" indicam dependência do
  número do cálculo; a integração em si não aparece nos modelos (ver INTEGRATIONS.md).

## Lacunas do motor para representar as regras

1. Condições por campo do negócio (Tipo de Seguro, Ramo, Tipo de Pessoa, forma de pagamento, vazio).
2. Prazo relativo a uma data do negócio (10/15 dias úteis antes do início de vigência).
3. Pendência encerrada por campo preenchido, e não só por mudança de etapa.
4. Responsáveis por **papel** configurável (setor de emissão, gestor nível 2) em vez de usuários fixos.

## Segurança do material

Arquivos tratados como não confiáveis: leitura sem executar nada, sem objetos PHP, com limites de
tamanho e profundidade. Originais e mapa de pseudônimos em `data/private/` (ignorado pelo Git). Material
versionado sem URLs, e-mails, telefones, documentos, nomes de pessoas nem IDs reais de usuários.
