# Inventário técnico das automações

> Gerado por `tools/bitrix-automations` a partir das exportações `.bpt`. Não editar à mão: rode
> `pnpm --filter @projacseg/bitrix-automations analyze`. Dados anonimizados (USR-xx = usuário,
> HOST-xx = servidor externo); o mapa real fica em `data/private/` (fora do Git).

| Indicador | Quantidade |
| --- | --- |
| Arquivos recebidos / distintos | 16 / 15 |
| Configurações de criação de tarefa habilitadas | 75 |
| … em produção | 57 |
| … só no ramo de homologação | 18 |
| Configurações desabilitadas | 46 |
| Configurações em produção recriadas em laço | 24 |
| Regras consolidadas | 24 |
| Avisos em produção / escalonamentos | 69 / 46 |

## bp-7 — Automóvel › Entrada do negócio

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-7.bpt |
| SHA-256 | 0c02ad012e1687e0… |
| ID do modelo (do nome do arquivo) | 7 |
| Etapa (código) | NEW — confiança alta |
| Evidência da etapa | Bloco 'Etapa Entrada do Negócio'; move o negócio para 'Enviar cotação' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 2 / 2 / 0 / 5 |
| Tarefas recriadas em laço (produção) | 0 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | HOST-01 |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | — |
| Muda etapa para | Enviar cotação |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmGetDataEntity 2/2 · CrmSetContactField 2/17 · SetField 5/17 · SetVariable 1/90 · CrmGetDynamicInfo 2/1 · CrmTimelineCommentAdd 2/27 · While 1/13 · Task2 2/5 · StartWorkflow 0/2 · Delay 1/13 · WebHook 1/18 · CrmControlNotify 0/4 · ImMessage 0/1 · rest_42f915caef25bbf8c1a78f858783e4ca 0/8 · Mail 0/4 · RobotDelay 0/1 · CrmChangeStatus 0/5 · CrmChangeResponsible 0/3 · CrmSendEmail 0/4 · rest_93bba66e59f5483ced8ee473c77596a2 0/3 · IMNotify 0/1 · Log 0/1 · SocNetMessage 0/1 · rest_21a880495fdbb67e9ed966c868bf7411 0/2 |
| Campos mais usados | Ramo de Seguro* (UF_CRM_1661178983241), Data Início de Vigência * (UF_CRM_1675339617), Tipo de Seguro (UF_CRM_1737579242776), Primeiro Nome* (UF_CRM_1749144954118), Data Término de Vigência* (UF_CRM_1663594360690), Placa* (UF_CRM_62F85C0A41BE4), UF_CRM_684C3B85C64F0 (UF_CRM_684C3B85C64F0), UF_CRM_684C3B85F209F (UF_CRM_684C3B85F209F) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A61358_70533_62741_25290 | produção | ➡️ Novo Negócio Criado - {=Document:CONTACT.NAME}{=Document:COMPANY.TITLE} | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A56846_59033_36806_64554 | produção | ➡️Nova Renovação - {=Document:CONTACT.NAME}{=Document:COMPANY.TITLE} | 10 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA |
| A5240_36967_65415_7303 | desabilitada | Você possui um novo cliente para seguro NOVO!! | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Entrada do Negócio | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = SEGURO NOVO |
| A73756_42814_59170_45796 | desabilitada | Você possui um novo cliente para seguro NOVO!! | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Entrada do Negócio | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A16323_95359_87035_11748 | desabilitada | 🟢Você possui uma nova renovação!🟢 | 10 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA |
| A91781_57757_80339_30936 | desabilitada | Cliente para renovação de seguro {=Document:ID} {=Document:TITLE} | 10 dias úteis antes de Data Término de Vigência* | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel OU Ramo de Seguro* = Automóvel - Inativo! |
| A97145_29135_25242_41561 | desabilitada | Cliente para renovação de seguro {=Document:ID} {=Document:TITLE} | expressão não reconhecida | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID = 1 |
## bp-9 — Automóvel › Processos Perdidos

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-9.bpt |
| SHA-256 | 48dd2cb056be7488… |
| ID do modelo (do nome do arquivo) | 9 |
| Etapa (código) | LOSE — confiança alta |
| Evidência da etapa | Bloco 'Etapa Processos Perdidos'; encerra tarefas de todas as etapas do Automóvel |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 0 / 0 / 0 / 0 |
| Tarefas recriadas em laço (produção) | 0 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Entrada do negócio, Enviar cotação, Cotação enviada / Negociação, Proposta Transmitida/Em Emissão, Processo pendente, Concluído |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | 625 |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 1/0 · SetVariable 5/0 · While 2/0 · CrmGetDynamicInfo 2/0 · StartWorkflow 2/0 · Delay 2/0 · CrmSetContactField 2/0 |
| Campos mais usados | Tipo de Seguro (UF_CRM_1737579242776), Homologação (UF_CRM_1730405724229), UF_CRM_QUOTE_ID_NEGOCIO (UF_CRM_QUOTE_ID_NEGOCIO) |

_Sem robôs de criação de tarefa._
## bp-29 — Demais Ramos › Entrada do negócio

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-29.bpt |
| SHA-256 | 926b33ca1d9af45a… |
| ID do modelo (do nome do arquivo) | 29 |
| Etapa (código) | C1:NEW — confiança alta |
| Evidência da etapa | Bloco 'Etapa Entrada do Negócio'; move o negócio para 'Elaborando Cotações' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 19 / 19 / 0 / 5 |
| Tarefas recriadas em laço (produção) | 7 |
| Avisos em produção | 34 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | — |
| Muda etapa para | Demais Ramos / Elaborando Cotações |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | SetField 16/15 · While 7/13 · Task2 19/5 · ImMessage 34/1 · Delay 20/13 · SetVariable 0/86 · CrmGetDynamicInfo 0/1 · CrmTimelineCommentAdd 0/26 · CrmGetDataEntity 0/2 · CrmSetContactField 0/17 · CrmControlNotify 0/4 · StartWorkflow 0/1 · WebHook 0/18 · rest_42f915caef25bbf8c1a78f858783e4ca 0/8 · Mail 0/4 · RobotDelay 0/1 · CrmChangeStatus 0/5 · CrmChangeResponsible 0/3 · CrmSendEmail 0/4 · rest_93bba66e59f5483ced8ee473c77596a2 0/3 · IMNotify 0/1 · Log 0/1 · SocNetMessage 0/1 · rest_21a880495fdbb67e9ed966c868bf7411 0/2 |
| Campos mais usados | Ramo de Seguro* (UF_CRM_1661178983241), Data Início de Vigência * (UF_CRM_1675339617), Tipo de Seguro (UF_CRM_1737579242776), UF_CRM_TASK (UF_CRM_TASK), Data Término de Vigência* (UF_CRM_1663594360690), Tipo de Pessoa (UF_CRM_6532BA4062343), Placa* (UF_CRM_62F85C0A41BE4), Primeiro Nome* (UF_CRM_1749144954118) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A89514_32610_18047_70714 | produção | 🆕Preencha o campo "Tipo de Pessoa"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Tipo de Pessoa = VAZIO | Tipo de Pessoa vazio |
| A57055_48778_96297_47336 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Tipo de Seguro = Vazio | Tipo de Pessoa = Pessoa Física E Tipo de Seguro vazio |
| A54753_66193_7993_74150 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Física E Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * preenchido |
| A98047_31913_22229_48318 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Início de Vigência = Vazio | Tipo de Pessoa = Pessoa Física E Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A52559_92835_18234_1738 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Física E Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A66869_35844_44941_117 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Física E Tipo de Seguro vazio E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A76360_18031_33508_66794 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Física E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * preenchido |
| A90158_37065_67136_53963 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Início de Vigência = Vazio | Tipo de Pessoa = Pessoa Física E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A37148_85385_50858_78089 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Física E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A32990_25872_86634_40007 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Física E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A66945_85491_19211_92906 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Tipo de Seguro = Vazio | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro vazio |
| A2834_19140_61527_46611 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * preenchido |
| A66910_61514_98067_14894 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Início de Vigência = Vazio | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A99881_19766_81175_41291 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A46721_34681_27098_42772 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro vazio E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A61978_40032_40788_68340 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * preenchido |
| A88444_52596_39675_41775 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Início de Vigência = Vazio | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A55207_22417_87688_98429 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 15 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A25244_63203_46528_55978 | produção | 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Pessoa = Pessoa Jurídica E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A30510_31950_69585_90963 | desabilitada | Você possui um novo cliente para seguro NOVO!! | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Entrada do Negócio | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = SEGURO NOVO |
| A58740_97216_26655_9399 | desabilitada | Você possui um novo cliente para seguro NOVO!! | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Entrada do Negócio | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A6667_73528_66149_13784 | desabilitada | 🟢Você possui uma nova renovação!🟢 | 10 dias úteis antes de Data Início de Vigência * | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA |
| A6909_95400_39558_10346 | desabilitada | Cliente para renovação de seguro {=Document:ID} {=Document:TITLE} | 10 dias úteis antes de Data Término de Vigência* | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel OU Ramo de Seguro* = Automóvel - Inativo! |
| A46991_7279_33088_66188 | desabilitada | Cliente para renovação de seguro {=Document:ID} {=Document:TITLE} | expressão não reconhecida | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID = 1 |
## bp-35 — Demais Ramos › Elaborando Cotações

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-35.bpt |
| SHA-256 | 1528ccd2c85a0661… |
| ID do modelo (do nome do arquivo) | 35 |
| Etapa (código) | C1:EXECUTING — confiança alta |
| Evidência da etapa | Bloco 'Etapa Elaborando Cotação'; encerra tarefas de 'Entrada'; move para 'Cotação enviada' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 9 / 9 / 0 / 8 |
| Tarefas recriadas em laço (produção) | 3 |
| Avisos em produção | 11 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Demais Ramos / Entrada do negócio |
| Muda etapa para | Demais Ramos / Cotação enviada / Negociação |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 1/4 · SetField 8/9 · ImMessage 11/3 · While 3/7 · Task2 9/8 · Delay 8/14 · CrmControlNotify 0/18 · SocNetMessage 0/2 · GetUserInfo 0/2 · RobotDelay 0/2 · rest_21a880495fdbb67e9ed966c868bf7411 0/2 |
| Campos mais usados | Data Início de Vigência * (UF_CRM_1675339617), Ramo de Seguro* (UF_CRM_1661178983241), Tipo de Seguro (UF_CRM_1737579242776), UF_CRM_TASK (UF_CRM_TASK), UF_CRM_652D51CBE44AD (UF_CRM_652D51CBE44AD), Placa* (UF_CRM_62F85C0A41BE4), Tipo de Pessoa (UF_CRM_6532BA4062343), Homologação (UF_CRM_1730405724229) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A39309_83884_30900_42850 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Tipo de Seguro = Vazio | Tipo de Seguro vazio |
| A40229_40352_53281_13720 | produção | 🆕Elabore as cotações para o cliente: {=Document:CONTACT.NAME}🆕 | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * preenchido |
| A72658_3766_59666_64491 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Início de Vigência = Vazio | Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A64993_49619_78302_98566 | produção | 🆕Elabore as cotações para o cliente: {=Document:CONTACT.NAME}🆕 | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro vazio E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A66693_48394_99071_37895 | produção | 🆕Elabore as cotações para o cliente: {=Document:CONTACT.NAME}🆕 | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro vazio E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A1370_52310_15041_41453 | produção | 🆕Elabore as cotações para o cliente: {=Document:CONTACT.NAME}🆕 | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * preenchido |
| A11983_26046_54750_44062 | produção | 🆕Preencha o campo "Tipo do Seguro"🆕 | 1 hora útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Início de Vigência = Vazio | Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A87719_44062_69489_20375 | produção | 🆕Elabore as cotações para o cliente: {=Document:CONTACT.NAME}🆕 | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Início de Vigência * vazio |
| A77807_2904_18092_79452 | produção | 🆕Elabore as cotações para o cliente: {=Document:CONTACT.NAME}🆕 | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A17474_32641_12106_88022 | desabilitada | Envie cotação deste cliente em até 24hrs / {=Document:TITLE} | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Elaborando cotação | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = SEGURO NOVO |
| A82785_50210_77142_33997 | desabilitada | Envie cotação deste cliente em até 24hrs / {=Document:TITLE} | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Elaborando cotação | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A70201_29974_83742_72941 | desabilitada | Enviar orçamento e acomapanhar retorno | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E ID = 1 |
| A62260_45896_78283_56994 | desabilitada | Enviar orçamento e acompanhar retorno {=Document:TITLE} | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A79358_46302_58921_1517 | desabilitada | Envie cotação deste cliente em até 48hrs / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Enviar Cotação | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel |
| A82332_40416_99822_3599 | desabilitada | Envie cotação deste cliente em até 48hrs / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Enviar Cotação | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E senão (Outros Ramos) |
| A47530_1591_23442_47153 | desabilitada | Envie cotação deste cliente em até 48hrs / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA |
| A86717_53632_74116_39884 | desabilitada | Enviar orçamento e acomapanhar retorno | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID do item CRM = 1 |
## bp-37 — Demais Ramos › Cotação enviada / Negociação

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-37.bpt |
| SHA-256 | 9e225472605b7f68… |
| ID do modelo (do nome do arquivo) | 37 |
| Etapa (código) | C1:UC_YDJH2K — confiança alta |
| Evidência da etapa | Encerra tarefas de 'Entrada' e 'Elaborando'; laço 'Enquanto Etapa = Cotação enviada' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 2 / 2 / 0 / 6 |
| Tarefas recriadas em laço (produção) | 2 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | — |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | While 2/8 · Task2 2/6 · SetField 0/10 · SetVariable 0/1 · CrmGetDynamicInfo 0/1 · CrmTimelineCommentAdd 0/1 · CrmCompleteTask 0/4 · CrmControlNotify 0/17 · ImMessage 0/3 · Delay 0/13 · SocNetMessage 0/2 · GetUserInfo 0/2 · RobotDelay 0/2 · rest_21a880495fdbb67e9ed966c868bf7411 0/2 |
| Campos mais usados | Data Início de Vigência * (UF_CRM_1675339617), Ramo de Seguro* (UF_CRM_1661178983241), UF_CRM_652D51CBE44AD (UF_CRM_652D51CBE44AD), UF_CRM_TASK (UF_CRM_TASK), Tipo de Seguro (UF_CRM_1737579242776), Placa* (UF_CRM_62F85C0A41BE4), UF_CRM_684C3B85C64F0 (UF_CRM_684C3B85C64F0), UF_CRM_684C3B85F209F (UF_CRM_684C3B85F209F) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A66693_48394_99071_37895 | produção | 🆕Follow-up com o cliente: {=Document:CONTACT.NAME}🆕 | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Etapa = Cotação enviada / Negociação | Tipo de Pessoa = Pessoa Física |
| A87230_86280_16137_50734 | produção | 🆕Follow-up com o cliente: {=Document:CONTACT.UF_CRM_1743881743}🆕 | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Etapa = Cotação enviada / Negociação | Tipo de Pessoa = Pessoa Jurídica |
| A28638_29958_772_25675 | desabilitada | Negociação / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotação enviada/Negociação | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = SEGURO NOVO |
| A9951_33760_49987_55977 | desabilitada | Negociação / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotação enviada/Negociação | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A25156_56665_11678_59071 | desabilitada | Retorno sobre orçamentos {=Document:TITLE} | 48 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A247_81655_79844_92108 | desabilitada | Negociação / {=Document:TITLE} | 5 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotaçao enviada / Negociação | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel |
| A40858_87272_41278_5183 | desabilitada | Negociação / {=Document:TITLE} | 5 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotaçao enviada / Negociação | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E senão (Outros Ramos) |
| A23670_48093_2222_84769 | desabilitada | Entre em contao com o cliente {=Document:TITLE} | 5 dias corridos | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID do item CRM = 1 |
## bp-39 — Demais Ramos › Proposta Pendente

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-39.bpt |
| SHA-256 | 09c599e8a7307cdf… |
| ID do modelo (do nome do arquivo) | 39 |
| Etapa (código) | C1:FINAL_INVOICE — confiança média |
| Evidência da etapa | Encerra tarefas de 'Transmissão/Em Emissão'; tarefa 'Proposta Pendente' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 1 / 1 / 0 / 4 |
| Tarefas recriadas em laço (produção) | 1 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | — |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | While 1/0 · Task2 1/4 · SetField 0/7 · GetUserInfo 0/2 · CrmCompleteTask 0/2 · Delay 0/8 · CrmControlNotify 0/8 · RobotDelay 0/4 · SocNetMessage 0/2 · IMNotify 0/1 · ImMessage 0/1 |
| Campos mais usados | Ramo de Seguro* (UF_CRM_1661178983241), UF_CRM_TASK (UF_CRM_TASK), Tipo de Seguro (UF_CRM_1737579242776), UF_CRM_652D51CBE44AD (UF_CRM_652D51CBE44AD), Número da Proposta* (UF_CRM_1725500605), Nome do segurado* (UF_CRM_1679494926820), Data Início de Vigência * (UF_CRM_1675339617), Homologação (UF_CRM_1730405724229) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A77106_98271_43304_39996 | produção | 🆕Acompanhe a pendencia gerada para o cliente: {=Document:UF_CRM_1725500605}🆕 | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Etapa = Processo Perdido | — |
| A96966_7635_55138_42755 | desabilitada | O cliente {=Document:TITLE} está pendente! | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A34617_42169_18808_18180 | desabilitada | O cliente {=Document:TITLE} está pendente! | 5 dias corridos | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E ID = 1 |
| A47530_1591_23442_47153 | desabilitada | O cliente {=Document:TITLE} está pendente! | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA |
| A990_77199_87007_69972 | desabilitada | O cliente {=Document:TITLE} está pendente! | 5 dias corridos | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID do item CRM = 1 |
## bp-41 — Demais Ramos › Transmissão/Em Emissão

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-41.bpt |
| SHA-256 | b82643e9584f66b1… |
| ID do modelo (do nome do arquivo) | 41 |
| Etapa (código) | C1:UC_N0RIBP — confiança alta |
| Evidência da etapa | Encerra tarefas das três etapas anteriores; move para 'Proposta Pendente' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 28 / 10 / 18 / 6 |
| Tarefas recriadas em laço (produção) | 2 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | HOST-02 |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Demais Ramos / Entrada do negócio, Demais Ramos / Elaborando Cotações, Demais Ramos / Cotação enviada / Negociação |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | 789 |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 1/2 · Task2 28/6 · While 12/2 · StartWorkflow 4/0 · WebHook 1/0 · SetField 0/15 · Delay 0/8 · CrmControlNotify 0/8 · CrmSetObserverField 0/1 · ImMessage 0/4 |
| Campos mais usados | Ramo de Seguro* (UF_CRM_1661178983241), UF_CRM_TASK (UF_CRM_TASK), Número da Proposta* (UF_CRM_1725500605), Controle de campos vazios (UF_CRM_1772815520248), Tipo de Pessoa (UF_CRM_6532BA4062343), UF_CRM_652D51CBE44AD (UF_CRM_652D51CBE44AD), Numero do calculo* (UF_CRM_1698093406), Tipo de Seguro (UF_CRM_1737579242776) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A66693_48394_99071_37895 | produção | 🆕Realize o cadastro do negócio no Teleport {=Document:UF_CRM_1725500605}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Pessoa = Pessoa Física |
| A49155_31040_72246_81807 | produção | 🆕Realize o cadastro do negócio no Teleport {=Document:UF_CRM_1725500605}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Número do Calculo Vazio | Homologação = N E Tipo de Pessoa = Pessoa Física E Numero do calculo* vazio |
| A7303_93194_3021_88554 | produção | 🆕Realize o envio do boleto para o cliente: {=Document:CONTACT.NAME}🆕 | 3 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Pessoa = Pessoa Física E Forma de pagamento* = Boleto Bancário |
| A3073_38071_50855_98010 | produção | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 15 dias úteis | USR-07 | — | — | Homologação = N E Tipo de Pessoa = Pessoa Física E Forma de pagamento* = Boleto Bancário |
| A62863_35731_1900_83831 | produção | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 15 dias úteis | USR-07 | — | — | Homologação = N E Tipo de Pessoa = Pessoa Física E senão (Outras Formas de Pagamento.) |
| A12762_30527_83133_46226 | produção | 🆕Realize o cadastro no Teleport da proposta {=Document:UF_CRM_1725500605}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Pessoa = Pessoa Jurídica |
| A12877_24834_23865_63942 | produção | 🆕Realize o cadastro do negócio no Teleport {=Document:UF_CRM_1725500605}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Número do Calculo Vazio | Homologação = N E Tipo de Pessoa = Pessoa Jurídica E Numero do calculo* vazio |
| A47329_56896_4451_56209 | produção | 🆕Realize o envio do boleto para o cliente: {=Document:CONTACT.NAME}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Pessoa = Pessoa Jurídica E Forma de pagamento* = Boleto Bancário |
| A45013_56850_94152_18905 | produção | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 15 dias úteis | USR-07 | — | — | Homologação = N E Tipo de Pessoa = Pessoa Jurídica E Forma de pagamento* = Boleto Bancário |
| A26261_99926_695_67138 | produção | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 3 dias úteis | USR-07 | — | — | Homologação = N E Tipo de Pessoa = Pessoa Jurídica E senão (Outras Formas de Pagamento.) |
| A79768_15465_30621_16623 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Bike OU Ramo de Seguro* = Equipamentos OU Ramo de Seguro* = Equipamentos Eletrônicos OU Ramo de Seguro* = Riscos Diversos OU Ramo de Seguro* = Seguro Celular |
| A72808_59178_34063_35280 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Residencial |
| A77470_84354_35068_64204 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Viagem |
| A38478_90413_26188_88719 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Empresarial |
| A57633_38572_41761_30144 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Acidentes Pessoais OU Ramo de Seguro* = Acidentes Pessoais (local De Risco) OU Ramo de Seguro* = Vida Individual |
| A63275_89521_87973_97660 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Capitalização |
| A56187_99115_44409_41995 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Fiança Locatícia |
| A52347_28113_25269_98556 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Vg/apc OU Ramo de Seguro* = Vida - Fatura Mensal OU Ramo de Seguro* = Vida Global OU Ramo de Seguro* = Vida Global (fatura) OU Ramo de Seguro* = Vida em Grupo |
| A43180_78350_97423_89803 | desabilitada | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Rc Geral OU Ramo de Seguro* = Rc Profissional |
| A23043_21456_67050_58864 | desabilitada | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Eventos Aleatórios- Vg |
| A66400_39453_15891_77705 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Condomínio |
| A98006_52484_90207_46189 | só homologação | 🆕Realize o preenchimento das informações do negócio🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto Campo Controle = Não | Homologação = Y E Ramo de Seguro* = Marítimos OU Ramo de Seguro* = Náutico |
| A61157_10645_56395_38908 | só homologação | 🆕Realize o cadastro no Teleport da proposta {=Document:UF_CRM_1725500605}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Física |
| A29360_19325_8829_50257 | só homologação | 🆕Realize o envio do boleto para o cliente: {=Document:CONTACT.NAME}🆕 | 3 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Física E Forma de pagamento* = Boleto Bancário |
| A70403_73491_20191_48103 | só homologação | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 15 dias úteis | USR-07 | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Física E Forma de pagamento* = Boleto Bancário |
| A84010_4185_48253_188 | só homologação | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 15 dias úteis | USR-07 | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Física E senão (Outras Formas de Pagamento.) |
| A8232_3350_27094_72872 | só homologação | 🆕Realize o cadastro no Teleport da proposta {=Document:UF_CRM_1725500605}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Jurídica |
| A60851_84705_88695_78854 | só homologação | 🆕Realize o envio do boleto para o cliente: {=Document:CONTACT.NAME}🆕 | 30 minutos úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Jurídica E Forma de pagamento* = Boleto Bancário |
| A67091_86831_41253_17925 | só homologação | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 15 dias úteis | USR-07 | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Jurídica E Forma de pagamento* = Boleto Bancário |
| A28768_69462_58749_52985 | só homologação | 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 | 3 dias úteis | USR-07 | — | — | Homologação = Y E Tipo de Pessoa = Pessoa Jurídica E senão (Outras Formas de Pagamento.) |
| A61028_83364_27963_76747 | desabilitada | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 12 dias corridos | USR-07 | — | — | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Ramo de Seguro* = Automóvel |
| A87896_2004_29225_16941 | desabilitada | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 15 dias corridos | USR-07 | — | — | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E senão (Outros Ramos) |
| A1176_21246_20287_54713 | desabilitada | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 12 dias corridos | USR-07 | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel |
| A12602_45662_99641_9613 | desabilitada | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 15 dias corridos | USR-07 | — | — | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E senão (Demais Ramos) |
## bp-45 — Demais Ramos › Emitidos

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-45.bpt |
| SHA-256 | 7331cca0f8a416ce… |
| ID do modelo (do nome do arquivo) | 45 |
| Etapa (código) | C1:WON — confiança alta |
| Evidência da etapa | Bloco 'Etapa Concluído'; encerra tarefas de todas as etapas abertas do Demais Ramos |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 0 / 0 / 0 / 3 |
| Tarefas recriadas em laço (produção) | 0 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | HOST-01, HOST-02 |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Demais Ramos / Entrada do negócio, Demais Ramos / Elaborando Cotações, Demais Ramos / Cotação enviada / Negociação, Demais Ramos / Transmissão/Em Emissão, Demais Ramos / Proposta Pendente |
| Muda etapa para | Demais Ramos / Perdidos |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 1/0 · Delay 1/5 · CrmSetContactField 1/2 · WebHook 2/50 · While 0/5 · SetVariable 0/13 · Task2 0/3 · CrmGetDynamicInfo 0/5 · SetField 0/33 · Mail 0/25 · RobotDelay 2/7 · CreateCrmDealDocument 1/0 · CrmTimelineCommentAdd 1/1 · CrmChangeStatus 1/1 · CrmCreateDynamic 1/1 · CrmUpdateDynamic 1/0 · StartWorkflow 0/2 · CrmCopyDeal 0/6 |
| Campos mais usados | Seguradora* (UF_CRM_1745001283), Ramo de Seguro* (UF_CRM_1661178983241), id Mautic (UF_CRM_67C99DC92505D), UF_CRM_67C99DC8D8981 (UF_CRM_67C99DC8D8981), UF_CRM_67D45002BE0AE (UF_CRM_67D45002BE0AE), Seg Possui App? (UF_CRM_1731505088754), Data Término de Vigência* (UF_CRM_1663594360690), Tipo de Seguro (UF_CRM_1737579242776) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A65869_85116_36976_73485 | desabilitada | O card do cliente {=Document:UF_CRM_1679494926820} não está completo. | expressão não reconhecida | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto houver Loop | Homologação = N E Homologação = N E Data Término de Vigência* vazio OU Seguradora* vazio OU Número de Apólice* vazio OU Ramo de Seguro* vazio |
| A84810_16490_17844_84697 | desabilitada | O card do cliente {=Document:UF_CRM_1679494926820} não está completo. | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto houver Loop | Homologação = Y E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Data Término de Vigência* vazio OU Seguradora* vazio OU Número de Apólice* vazio OU Ramo de Seguro* vazio |
| A18516_61133_24305_78242 | desabilitada | O card do cliente {=Document:UF_CRM_1679494926820} não está completo. | expressão não reconhecida | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto houver Loop | Homologação = Y E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Término de Vigência* vazio OU Seguradora* vazio OU Número de Apólice* vazio OU Ramo de Seguro* vazio |
## bp-47 — Demais Ramos › Perdidos (a confirmar)

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-47.bpt |
| SHA-256 | 0756c4661441b170… |
| ID do modelo (do nome do arquivo) | 47 |
| Etapa (código) | C1:LOSE? — confiança a confirmar |
| Evidência da etapa | Bloco 'Automações (Processos Perdidos)'; sem tarefas nem referência explícita de etapa |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 0 / 0 / 0 / 0 |
| Tarefas recriadas em laço (produção) | 0 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | — |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | 625 |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | SetField 5/0 · SetVariable 5/0 · While 2/0 · CrmGetDynamicInfo 2/0 · StartWorkflow 2/0 · Delay 2/0 · CrmSetContactField 2/0 |
| Campos mais usados | Ramo de Seguro* (UF_CRM_1661178983241), Tipo de Seguro (UF_CRM_1737579242776), UF_CRM_652D51CBE44AD (UF_CRM_652D51CBE44AD), Data Início de Vigência * (UF_CRM_1675339617), Placa* (UF_CRM_62F85C0A41BE4), UF_CRM_QUOTE_ID_NEGOCIO (UF_CRM_QUOTE_ID_NEGOCIO) |

_Sem robôs de criação de tarefa._
## bp-71 — Automóvel › Cotação enviada / Negociação

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-71.bpt |
| SHA-256 | 81f0814d60d7690c… |
| ID do modelo (do nome do arquivo) | 71 |
| Etapa (código) | UC_IYS6WC — confiança alta |
| Evidência da etapa | Encerra tarefas de 'Entrada' e 'Enviar cotação'; laços 'Enquanto etapa = Cotação enviada/Negociação' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 4 / 4 / 0 / 2 |
| Tarefas recriadas em laço (produção) | 4 |
| Avisos em produção | 9 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Entrada do negócio, Enviar cotação, PREPAYMENT_INVOICE, Demais Ramos / Entrada do negócio, C1:PREPARATION, Demais Ramos / Elaborando Cotações |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 4/1 · SetVariable 1/0 · CrmGetDynamicInfo 1/0 · CrmTimelineCommentAdd 1/0 · While 8/0 · SetField 5/0 · Task2 4/2 · CrmControlNotify 6/11 · ImMessage 3/0 · Delay 3/10 · SocNetMessage 0/2 · GetUserInfo 0/2 · RobotDelay 0/2 · rest_21a880495fdbb67e9ed966c868bf7411 0/2 |
| Campos mais usados | Data Início de Vigência * (UF_CRM_1675339617), Ramo de Seguro* (UF_CRM_1661178983241), UF_CRM_TASK (UF_CRM_TASK), Tipo de Seguro (UF_CRM_1737579242776), UF_CRM_684C3B85C64F0 (UF_CRM_684C3B85C64F0), UF_CRM_684C3B85F209F (UF_CRM_684C3B85F209F), UF_CRM_1749660011271 (UF_CRM_1749660011271), UF_CRM_68345E2C2EC7A (UF_CRM_68345E2C2EC7A) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A57640_32990_30141_57649 | produção | Negociação / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotação enviada/Negociação | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = SEGURO NOVO |
| A54134_49133_52767_52733 | produção | Negociação / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotação enviada/Negociação | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A12945_18603_79606_68376 | desabilitada | Retorno sobre orçamentos {=Document:TITLE} | 48 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A32530_77419_26142_29082 | produção | Negociação / {=Document:TITLE} | 5 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotaçao enviada / Negociação | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel |
| A73350_85366_15800_19466 | produção | Negociação / {=Document:TITLE} | 5 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Cotaçao enviada / Negociação | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E senão (Outros Ramos) |
| A36067_21744_74996_40389 | desabilitada | Entre em contao com o cliente {=Document:TITLE} | 5 dias corridos | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID do item CRM = 1 |
## bp-75 — Automóvel › Proposta Transmitida/Em Emissão

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-75.bpt |
| SHA-256 | 6ea59aa0f7d43718… |
| ID do modelo (do nome do arquivo) | 75 |
| Etapa (código) | UC_25DQ2X — confiança alta |
| Evidência da etapa | Bloco 'Etapa Proposta Transmitida/Em Emissão'; encerra tarefas das três etapas anteriores |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 4 / 4 / 0 / 0 |
| Tarefas recriadas em laço (produção) | 0 |
| Avisos em produção | 2 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Entrada do negócio, Enviar cotação, Cotação enviada / Negociação, Demais Ramos / Entrada do negócio, Demais Ramos / Elaborando Cotações, Demais Ramos / Cotação enviada / Negociação |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 3/0 · SetField 2/0 · Task2 4/0 · Delay 8/0 · CrmControlNotify 2/6 · CrmSetObserverField 1/0 |
| Campos mais usados | Ramo de Seguro* (UF_CRM_1661178983241), UF_CRM_TASK (UF_CRM_TASK), Tipo de Seguro (UF_CRM_1737579242776), Homologação (UF_CRM_1730405724229), Data Início de Vigência * (UF_CRM_1675339617), UF_CRM_652D51CBE44AD (UF_CRM_652D51CBE44AD), Placa* (UF_CRM_62F85C0A41BE4) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A15354_2967_51127_12842 | produção | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 12 dias corridos | USR-07 | — | — | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Ramo de Seguro* = Automóvel |
| A12945_18603_79606_68376 | produção | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 15 dias corridos | USR-07 | — | — | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E senão (Outros Ramos) |
| A24132_12924_6550_96873 | produção | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 12 dias corridos | USR-07 | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel |
| A4580_45406_67318_54649 | produção | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} | 15 dias corridos | USR-07 | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E senão (Demais Ramos) |
## bp-79 — Automóvel › Concluído

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-79.bpt |
| SHA-256 | 11f3c0392db0b38f… |
| ID do modelo (do nome do arquivo) | 79 |
| Etapa (código) | WON — confiança alta |
| Evidência da etapa | Bloco 'Etapa Concluído'; encerra tarefas de todas as etapas abertas do Automóvel |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 1 / 1 / 0 / 3 |
| Tarefas recriadas em laço (produção) | 1 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | HOST-01 |
| E-mails em produção | 4 |
| Apps externos (REST) em produção | [Fale Fácil Chat] #certificado_apolice_emissao; [Fale Fácil Chat] #avaliacao_google_d7_utd |
| Encerra tarefas de | Entrada do negócio, Enviar cotação, Cotação enviada / Negociação, Proposta Transmitida/Em Emissão, Processo pendente |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | 625 |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 1/1 · Delay 4/3 · SetVariable 7/8 · While 2/3 · CrmGetDynamicInfo 2/3 · StartWorkflow 1/1 · CrmCreateDynamic 2/1 · Mail 4/17 · WebHook 17/34 · CrmTimelineCommentAdd 2/1 · Task2 1/3 · SetField 9/19 · rest_88d2989835e3b8357c89e7c45ac1ee76 2/1 · CrmSendSms 0/2 · CrmSetContactField 1/1 · CrmUpdateDynamic 3/0 · RobotDelay 0/5 · CrmCopyDeal 0/3 · GetUserInfo 0/1 · SocNetMessage 0/1 · CrmControlNotify 0/1 |
| Campos mais usados | Seguradora* (UF_CRM_1745001283), id Mautic (UF_CRM_67C99DC92505D), UF_CRM_67C99DC8D8981 (UF_CRM_67C99DC8D8981), UF_CRM_67D45002BE0AE (UF_CRM_67D45002BE0AE), Ramo de Seguro* (UF_CRM_1661178983241), Seg Possui App? (UF_CRM_1731505088754), Tipo de Seguro (UF_CRM_1737579242776), UF_CRM_7_1713450229 (UF_CRM_7_1713450229) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A76608_31754_80251_36398 | produção | O card do cliente {=Document:CONTACT.NAME} não está completo. | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto houver Loop | Homologação = N E Seguro renovável? = Y OU Seguro renovável? = (vazio) E Data Término de Vigência* vazio OU Seguradora* vazio OU Número de Apólice* vazio OU Ramo de Seguro* vazio |
| A99633_7065_64016_77727 | desabilitada | O card do cliente {=Document:UF_CRM_1679494926820} não está completo. | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto houver Loop | Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Data Término de Vigência* vazio OU Seguradoras* (Campo descontinuado) vazio OU Número de Apólice* vazio OU Ramo de Seguro* vazio |
| A17592_40219_46530_92494 | desabilitada | O card do cliente {=Document:UF_CRM_1679494926820} não está completo. | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto houver Loop | Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Data Término de Vigência* vazio OU Seguradoras* (Campo descontinuado) vazio OU Número de Apólice* vazio OU Ramo de Seguro* vazio |
| A50802_35439_90709_295 | desabilitada | O cliente {=Document:TITLE} está pendente! | 5 dias corridos | RESPONSÁVEL_DO_NEGÓCIO | — | — | Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID do item CRM = 1 |
## bp-85 — Automóvel › Enviar cotação

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-85 (1).bpt, bp-85.bpt |
| SHA-256 | b7c7eb1ec3a5d60d… |
| ID do modelo (do nome do arquivo) | 85 |
| Etapa (código) | UC_YI2RCB — confiança alta |
| Evidência da etapa | Encerra tarefas de 'Entrada do negócio'; laços 'Enquanto etapa = Enviar Cotação' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 4 / 4 / 0 / 4 |
| Tarefas recriadas em laço (produção) | 4 |
| Avisos em produção | 9 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Entrada do negócio, PREPAYMENT_INVOICE, Demais Ramos / Entrada do negócio, C1:PREPARATION |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 4/1 · SetField 4/0 · While 7/0 · Task2 4/4 · CrmControlNotify 6/12 · ImMessage 3/0 · Delay 3/11 · SocNetMessage 0/2 · GetUserInfo 0/2 · RobotDelay 0/2 · rest_21a880495fdbb67e9ed966c868bf7411 0/2 |
| Campos mais usados | Data Início de Vigência * (UF_CRM_1675339617), Ramo de Seguro* (UF_CRM_1661178983241), UF_CRM_TASK (UF_CRM_TASK), Tipo de Seguro (UF_CRM_1737579242776), UF_CRM_652D51CBE44AD (UF_CRM_652D51CBE44AD), Homologação (UF_CRM_1730405724229), Placa* (UF_CRM_62F85C0A41BE4), Modelo* (UF_CRM_62F85C0A2EF29) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A57640_32990_30141_57649 | produção | Envie cotação deste cliente em até 24hrs / {=Document:TITLE} | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Elaborando cotação | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = SEGURO NOVO |
| A53715_29485_90359_72723 | produção | Envie cotação deste cliente em até 24hrs / {=Document:TITLE} | 1 dia útil | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Elaborando cotação | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A31524_32149_69038_53974 | desabilitada | Enviar orçamento e acomapanhar retorno | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA E ID = 1 |
| A12032_13704_42049_24742 | desabilitada | Enviar orçamento e acompanhar retorno {=Document:TITLE} | 3 horas úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = SEGURO NOVO OU Tipo de Seguro = RENOVAÇÃO DE OUTRA CORRETORA |
| A25004_4331_7051_90721 | produção | Envie cotação deste cliente em até 48hrs / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Enviar Cotação | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E Ramo de Seguro* = Automóvel |
| A31993_76129_92983_74015 | produção | Envie cotação deste cliente em até 48hrs / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | recriada: Enquanto etapa for = Enviar Cotação | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E senão (Outros Ramos) |
| A34581_8409_77940_11665 | desabilitada | Envie cotação deste cliente em até 48hrs / {=Document:TITLE} | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA |
| A61493_17297_26499_37223 | desabilitada | Enviar orçamento e acomapanhar retorno | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N E Tipo de Seguro = RENOVAÇÃO DA PRÓPRIA CORRETORA E ID do item CRM = 1 |
## bp-245 — Automóvel › Processo pendente

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-245.bpt |
| SHA-256 | 60392336207e0864… |
| ID do modelo (do nome do arquivo) | 245 |
| Etapa (código) | UC_LJGF76 — confiança média |
| Evidência da etapa | Encerra tarefas até 'Proposta Transmitida'; tarefa 'Emissão com Pendência' |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 1 / 1 / 0 / 0 |
| Tarefas recriadas em laço (produção) | 0 |
| Avisos em produção | 4 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | Entrada do negócio, Enviar cotação, Cotação enviada / Negociação, Proposta Transmitida/Em Emissão |
| Muda etapa para | Demais Ramos / Transmissão/Em Emissão |
| Inicia outros fluxos (ID) | — |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | CrmCompleteTask 2/0 · GetUserInfo 1/0 · Task2 1/0 · SetField 1/0 · Delay 4/0 · CrmControlNotify 4/0 |
| Campos mais usados | Homologação (UF_CRM_1730405724229), UF_CRM_TASK (UF_CRM_TASK) |

| Atividade | Situação | Tarefa | Prazo | Responsável | Observadores | Laço | Condições |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A12945_18603_79606_68376 | produção | O cliente {=Document:TITLE} está pendente! | 2 dias úteis | RESPONSÁVEL_DO_NEGÓCIO | — | — | Homologação = N |
## bp-285 — Automóvel? › Prospecção ou Perdidos (a confirmar)

| Item | Valor |
| --- | --- |
| Arquivos recebidos | bp-285.bpt |
| SHA-256 | c432454e0069ddad… |
| ID do modelo (do nome do arquivo) | 285 |
| Etapa (código) | UC_130IYL? — confiança a confirmar |
| Evidência da etapa | Bloco 'Automações (Processos Perdidos)'; sem tarefas; restam Prospecção (Automóvel) e Perdidos |
| Gatilho | Entrada do negócio na etapa (modelo de automação da etapa) |
| Tarefas: habilitadas / produção / só homologação / desabilitadas | 0 / 0 / 0 / 0 |
| Tarefas recriadas em laço (produção) | 0 |
| Avisos em produção | 0 |
| Webhooks em produção (hosts) | nenhum |
| E-mails em produção | 0 |
| Apps externos (REST) em produção | nenhum |
| Encerra tarefas de | — |
| Muda etapa para | — |
| Inicia outros fluxos (ID) | 625 |
| Copia negócio para | — |
| Atividades (habilitadas/desabilitadas) | SetField 0/2 · Delay 1/1 · CrmCopyDeal 0/3 · RobotDelay 0/1 · SetVariable 2/0 · While 1/0 · CrmGetDynamicInfo 1/0 · StartWorkflow 1/0 · CrmSetContactField 1/0 |
| Campos mais usados | Tipo de Seguro (UF_CRM_1737579242776), Homologação (UF_CRM_1730405724229), UF_CRM_635848D222978 (UF_CRM_635848D222978), Ramo de Seguro* (UF_CRM_1661178983241), UF_CRM_1705340688 (UF_CRM_1705340688), UF_CRM_1705943960 (UF_CRM_1705943960), UF_CRM_1661698522 (UF_CRM_1661698522), UF_CRM_QUOTE_ID_NEGOCIO (UF_CRM_QUOTE_ID_NEGOCIO) |

_Sem robôs de criação de tarefa._
