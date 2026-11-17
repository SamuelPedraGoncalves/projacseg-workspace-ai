# Matriz de tarefas por pipeline e etapa

> Gerado por `tools/bitrix-automations` a partir das exportações `.bpt`. Não editar à mão: rode
> `pnpm --filter @projacseg/bitrix-automations analyze`. Dados anonimizados (USR-xx = usuário,
> HOST-xx = servidor externo); o mapa real fica em `data/private/` (fora do Git).

| Pipeline | Etapa | Arquivo | Habilitadas | Produção | Em laço | Tarefas distintas (prazo) |
| --- | --- | --- | --- | --- | --- | --- |
| Automóvel | Entrada do negócio | bp-7 | 2 | 2 | 0 | ➡️ Novo Negócio Criado - {=Document:CONTACT.NAME}{=Document:COMPANY.TITLE} (3 horas úteis); ➡️Nova Renovação - {=Document:CONTACT.NAME}{=Document:COMPANY.TITLE} (10 dias úteis antes de Data Início de Vigência *) |
| Demais Ramos | Entrada do negócio | bp-29 | 19 | 19 | 7 | 🆕Preencha o campo "Tipo de Pessoa"🆕 (1 hora útil); 🆕Preencha o campo "Tipo do Seguro"🆕 (1 hora útil); 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 (15 dias úteis antes de Data Início de Vigência *); 🆕Faça contato com o cliente: {=Document:CONTACT.NAME}🆕 (1 hora útil) |
| Demais Ramos | Elaborando Cotações | bp-35 | 9 | 9 | 3 | 🆕Preencha o campo "Tipo do Seguro"🆕 (1 hora útil); 🆕Elabore as cotações para o cliente: {=Document:CONTACT.NAME}🆕 (3 horas úteis) |
| Demais Ramos | Cotação enviada / Negociação | bp-37 | 2 | 2 | 2 | 🆕Follow-up com o cliente: {=Document:CONTACT.NAME}🆕 (2 dias úteis); 🆕Follow-up com o cliente: {=Document:CONTACT.UF_CRM_1743881743}🆕 (2 dias úteis) |
| Demais Ramos | Proposta Pendente | bp-39 | 1 | 1 | 1 | 🆕Acompanhe a pendencia gerada para o cliente: {=Document:UF_CRM_1725500605}🆕 (2 dias úteis) |
| Demais Ramos | Transmissão/Em Emissão | bp-41 | 28 | 10 | 2 | 🆕Realize o cadastro do negócio no Teleport {=Document:UF_CRM_1725500605}🆕 (30 minutos úteis); 🆕Realize o envio do boleto para o cliente: {=Document:CONTACT.NAME}🆕 (3 dias úteis); 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 (15 dias úteis); 🆕Realize o cadastro no Teleport da proposta {=Document:UF_CRM_1725500605}🆕 (30 minutos úteis); 🆕Realize o envio do boleto para o cliente: {=Document:CONTACT.NAME}🆕 (30 minutos úteis); 🆕Realize o acompanhamento da emissão da proposta: {=Document:UF_CRM_1725500605}🆕 (3 dias úteis) |
| Demais Ramos | Emitidos | bp-45 | 0 | 0 | 0 | — |
| Automóvel | Cotação enviada / Negociação | bp-71 | 4 | 4 | 4 | Negociação / {=Document:TITLE} (2 dias úteis); Negociação / {=Document:TITLE} (5 dias úteis) |
| Automóvel | Proposta Transmitida/Em Emissão | bp-75 | 4 | 4 | 0 | Acompanhar e concluir a emissão do cliente - {=Document:TITLE} (12 dias corridos); Acompanhar e concluir a emissão do cliente - {=Document:TITLE} (15 dias corridos) |
| Automóvel | Concluído | bp-79 | 1 | 1 | 1 | O card do cliente {=Document:CONTACT.NAME} não está completo. (1 dia útil) |
| Automóvel | Enviar cotação | bp-85 | 4 | 4 | 4 | Envie cotação deste cliente em até 24hrs / {=Document:TITLE} (1 dia útil); Envie cotação deste cliente em até 48hrs / {=Document:TITLE} (2 dias úteis) |
| Automóvel | Processo pendente | bp-245 | 1 | 1 | 0 | O cliente {=Document:TITLE} está pendente! (2 dias úteis) |
