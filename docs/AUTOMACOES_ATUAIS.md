# Automações atuais da ProjacSeg (análise dos modelos exportados)

Análise de 16 arquivos `.bpt` exportados do Bitrix24 em 16/11/2026 (`bp-85` veio duplicado: 15 modelos
distintos). Cada arquivo é o modelo de automação de **uma etapa** ("Bizproc Automation template"),
editado no designer de processos. Ferramenta usada: `tools/bitrix-automations/analisar.mjs`.

## Conclusão

- **75 robôs de criação de tarefa habilitados** — confere com o levantamento ("75 configurações").
- **57 criam tarefas em produção**; 18 estão no ramo **Homologação = SIM** (só negócios de teste),
  todos em Demais Ramos › Transmissão/Em Emissão.
- Os 57 se resumem a **19 regras distintas** (o mesmo robô é duplicado por PF/PJ, ramo e "campo vazio").
  O levantamento falava em 26; a diferença provavelmente está nos controles de inatividade, listados à
  parte abaixo.
- **Origem do excesso de tarefas:** 24 dos 57 robôs em produção estão dentro de laços "Enquanto…" e
  esperam a tarefa ser concluída (`HoldToClose`) para **criá-la de novo** enquanto o negócio não muda de
  etapa ou o campo continua vazio. Em Automóvel › Enviar cotação e Cotação enviada, além da tarefa recriada, um
  laço envia **a cada 24 h** aviso ao responsável e ao supervisor.
- **Já existe escalonamento**, mas por robô fixo: "Controle de inatividade" notifica o superior do
  responsável (`ToHead`) e/ou usuários fixos (`user_1`, `user_13`, `user_39`, `user_9`) após N horas/dias.

## Mapa de arquivos × etapas (inferido)

Inferido pelas tarefas que cada modelo encerra ("encerrar tarefas das etapas anteriores") e pelos
títulos dos blocos. **Confirmar com a ProjacSeg** os dois últimos.

| Arquivo   | Pipeline                             | Etapa                                         | Tarefas habilitadas / em produção |
| --------- | ------------------------------------ | --------------------------------------------- | --------------------------------- |
| bp-7      | Automóvel                            | Entrada do negócio (`NEW`)                    | 2 / 2                             |
| bp-85     | Automóvel                            | Enviar cotação (`UC_YI2RCB`)                  | 4 / 4                             |
| bp-71     | Automóvel                            | Cotação enviada / Negociação (`UC_IYS6WC`)    | 4 / 4                             |
| bp-75     | Automóvel                            | Proposta Transmitida/Em Emissão (`UC_25DQ2X`) | 4 / 4                             |
| bp-245    | Automóvel                            | Processo pendente (`UC_LJGF76`)               | 1 / 1                             |
| bp-79     | Automóvel                            | Concluído (`WON`)                             | 1 / 1                             |
| bp-9      | Automóvel                            | Processos Perdidos (`LOSE`)                   | 0                                 |
| bp-29     | Demais Ramos                         | Entrada do negócio (`C1:NEW`)                 | 19 / 19                           |
| bp-35     | Demais Ramos                         | Elaborando Cotações (`C1:EXECUTING`)          | 9 / 9                             |
| bp-37     | Demais Ramos                         | Cotação enviada / Negociação (`C1:UC_YDJH2K`) | 2 / 2                             |
| bp-41     | Demais Ramos                         | Transmissão/Em Emissão (`C1:UC_N0RIBP`)       | 28 / 10                           |
| bp-39     | Demais Ramos                         | Proposta Pendente (`C1:FINAL_INVOICE`)        | 1 / 1                             |
| bp-45     | Demais Ramos                         | Emitidos (`C1:WON`)                           | 0                                 |
| bp-47     | a confirmar (Perdidos ou Prospecção) | —                                             | 0                                 |
| bp-285    | a confirmar (Perdidos ou Prospecção) | —                                             | 0                                 |
| **Total** |                                      |                                               | **75 / 57**                       |

Os modelos também listam o pipeline **Benefícios/Saúde** (`C21`), sem arquivo exportado.

## As 19 regras em produção

Prazo "úteis" = `workdateadd` (calendário do responsável); "corridos" = `dateadd`. "Laço" = tarefa
recriada após conclusão enquanto a condição continuar.

| #   | Pipeline     | Etapa                  | Condição                                    | Tarefa                            | Prazo                                              | Responsável      | Laço |
| --- | ------------ | ---------------------- | ------------------------------------------- | --------------------------------- | -------------------------------------------------- | ---------------- | ---- |
| 1   | Automóvel    | Entrada                | Seguro novo                                 | Novo negócio (primeiro contato)   | 3 h úteis                                          | Responsável      | Não  |
| 2   | Automóvel    | Entrada                | Renovação                                   | Contato de renovação              | 10 dias úteis **antes** do início de vigência      | Responsável      | Não  |
| 3   | Automóvel    | Enviar cotação         | Seguro novo ou renovação de outra corretora | Enviar cotação                    | 1 dia útil                                         | Responsável      | Sim  |
| 4   | Automóvel    | Enviar cotação         | Renovação da própria corretora              | Enviar cotação                    | 2 dias úteis                                       | Responsável      | Sim  |
| 5   | Automóvel    | Cotação enviada        | Seguro novo ou renovação de outra corretora | Negociação (follow-up)            | 2 dias úteis                                       | Responsável      | Sim  |
| 6   | Automóvel    | Cotação enviada        | Renovação da própria corretora              | Negociação (follow-up)            | 5 dias úteis                                       | Responsável      | Sim  |
| 7   | Automóvel    | Proposta transmitida   | Ramo Automóvel                              | Acompanhar e concluir a emissão   | 12 dias **corridos**                               | `user_37` (fixo) | Não  |
| 8   | Automóvel    | Proposta transmitida   | Outros ramos                                | Acompanhar e concluir a emissão   | 15 dias **corridos**                               | `user_37` (fixo) | Não  |
| 9   | Automóvel    | Processo pendente      | —                                           | Emissão com pendência             | 2 dias úteis                                       | Responsável      | Não  |
| 10  | Automóvel    | Concluído              | Campos obrigatórios vazios                  | Preencher informações faltantes   | 1 dia útil                                         | Responsável      | Sim  |
| 11  | Demais Ramos | Entrada e Elaborando   | "Tipo de Seguro" vazio                      | Preencher Tipo do Seguro          | 1 h útil                                           | Responsável      | Sim  |
| 12  | Demais Ramos | Entrada e Elaborando   | Renovação sem "Início de Vigência"          | Preencher Data Início de Vigência | 1 h útil                                           | Responsável      | Sim  |
| 13  | Demais Ramos | Entrada                | Seguro novo                                 | Entrar em contato                 | 1 h útil                                           | Responsável      | Não  |
| 14  | Demais Ramos | Entrada                | Renovação                                   | Entrar em contato (renovação)     | 15 dias úteis **antes** do início de vigência      | Responsável      | Não  |
| 15  | Demais Ramos | Elaborando Cotações    | —                                           | Elaborar as cotações              | 3 h úteis                                          | Responsável      | Não  |
| 16  | Demais Ramos | Cotação enviada        | PF e PJ                                     | Follow-up com o cliente           | 2 dias úteis                                       | Responsável      | Sim  |
| 17  | Demais Ramos | Transmissão/Em Emissão | "Número do cálculo" vazio                   | Cadastro no Teleport              | 30 min úteis                                       | Responsável      | Sim  |
| 18  | Demais Ramos | Transmissão/Em Emissão | Pagamento por boleto                        | Enviar o boleto                   | PF 3 dias úteis · PJ 30 min úteis                  | Responsável      | Não  |
| 19  | Demais Ramos | Transmissão/Em Emissão | —                                           | Acompanhamento de emissão         | 15 dias úteis (PJ com outra forma de pagamento: 3) | `user_37` (fixo) | Não  |

Também em produção, sem consolidar (1 robô cada): Demais Ramos › Proposta Pendente cria "Proposta
pendente" em 2 dias úteis, dentro de um laço intitulado "Enquanto Etapa = Processo Perdido" (título
provavelmente herdado de cópia — conferir).

## Controles de inatividade e avisos (escalonamento atual)

69 avisos habilitados fora da homologação. Os principais:

| Pipeline › etapa                             | Quando                                           | Para quem                                                              |
| -------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Automóvel › Enviar cotação / Cotação enviada | A cada 24 h enquanto o negócio não muda de etapa | Responsável + superior (e `user_13` nas renovações em Cotação enviada) |
| Automóvel › Proposta transmitida             | 16 dias úteis                                    | Superior                                                               |
| Automóvel › Processo pendente                | 50 h úteis · 4 · 10 · 11 dias úteis              | Superior; `user_1` em 4 e 11 dias                                      |
| Demais Ramos › Entrada e Elaborando          | 2 h / 4 h e depois +3 h / +6 h úteis             | `user_39`, depois `user_9` (fixos)                                     |
| Demais Ramos › Entrada (renovação)           | 1 e 2 dias úteis após o início de vigência       | `user_39`, depois `user_9`                                             |
| Demais Ramos › Entrada e Elaborando          | Na hora (campo vazio)                            | Responsável                                                            |

## O que isso muda no Workspace

O motor atual cobre o modelo "prazo por etapa + escalonamento" e substitui os laços: **uma pendência
por passagem na etapa**, com risco, atraso e escalonamento, em vez de recriar tarefas e avisos todo dia.
Para representar fielmente as 19 regras faltam três recursos no motor:

1. **Condições por campo do negócio** — Tipo de Seguro, Ramo, Tipo de Pessoa, forma de pagamento,
   campo vazio (regras 3–8, 10–14, 16–19).
2. **Prazo relativo a uma data do negócio** — "10/15 dias úteis antes do início de vigência" (regras 2
   e 14).
3. **Pendência que termina quando um campo é preenchido**, e não só quando o negócio muda de etapa
   (regras 10–12 e 17).

Responsáveis e destinatários fixos (`user_37` emissão; `user_1`, `user_13`, `user_39`, `user_9`)
devem virar papéis configuráveis por empresa ("setor de emissão", "gestor nível 2") ou vir do
organograma — nunca IDs no código.

## Inconsistências para a ProjacSeg decidir

- Emissão em Automóvel: tarefa em **dias corridos** (12/15) e controle em **dias úteis** (16).
- Envio de boleto: 3 dias úteis para PF e 30 minutos para PJ.
- Acompanhamento de emissão PJ: 15 dias úteis com boleto e 3 com outras formas de pagamento.
- Tarefas de "preencher campo" recriadas em laço de 1 h: talvez melhor como validação ou alerta.
- Escalonamento parte pelo organograma (Automóvel) e parte por usuários fixos (Demais Ramos).

## Campos personalizados usados nas regras

| Informação                   | Campo                                     | Tipo                                                                                         |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Ramo de Seguro               | `UF_CRM_1661178983241`                    | lista (Automóvel, Automóvel Frota, Acidentes Pessoais…)                                      |
| Tipo de Seguro               | `UF_CRM_1737579242776`                    | lista: Seguro novo · Renovação de outra corretora · Renovação da própria corretora · Endosso |
| Data Início de Vigência      | `UF_CRM_1675339617`                       | data                                                                                         |
| Data Término de Vigência     | `UF_CRM_1663594360690`                    | data                                                                                         |
| Seguradora                   | `UF_CRM_1745001283`                       | lista                                                                                        |
| Tipo de Pessoa               | `UF_CRM_6532BA4062343`                    | lista: PF · PJ                                                                               |
| Homologação                  | `UF_CRM_1730405724229`                    | sim/não                                                                                      |
| Nome do segurado             | `UF_CRM_1679494926820`                    | texto                                                                                        |
| Número do cálculo            | `UF_CRM_1698093406`                       | texto                                                                                        |
| Número da proposta / apólice | `UF_CRM_1725500605` / `UF_CRM_1725500732` | texto                                                                                        |
