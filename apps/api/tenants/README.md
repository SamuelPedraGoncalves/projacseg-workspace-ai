# Configuração por empresa

Cada portal Bitrix24 tem um arquivo `<domínio>.json` nesta pasta (ex.:
`projacseg.bitrix24.com.br.json`). Ele é lido na **instalação** do aplicativo e define:

| Campo          | O que é                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `calendar`     | Calendário útil: fuso (`utcOffsetMinutes`, Brasília = -180), dias úteis, expediente e feriados |
| `fieldMapping` | Campos personalizados do CRM com o ramo e o tipo do seguro (`UF_CRM_...`)                      |
| `digestTime`   | Horário do resumo diário no chat (`"08:00"`; `null` desliga)                                   |
| `aiEnabled`    | Liga a IA no chat do assistente (também exige `AI_PROVIDER` no servidor)                       |
| `roles`        | Papéis usados pelas regras: código do papel → ID do usuário no Bitrix24 (`"emissao": "15"`)    |
| `rules`        | Regras operacionais (formato em `packages/engine/src/rules.ts` e docs/OPERATIONAL_ENGINE.md)   |

Os IDs de usuário ficam **só aqui**, na configuração da empresa — nunca no código. Um papel citado
por uma regra e ausente em `roles` impede o carregamento do arquivo (erro na instalação).

## Modo sombra

Toda regra sem `"mode"` roda em **sombra**: o motor calcula prazos, risco, atraso e escalonamento,
mostra no dashboard e registra no histórico, mas **não envia mensagens**. Use `"mode": "active"`
só quando a automação equivalente do Bitrix24 estiver desligada (com autorização) ou no portal de
testes.

Regras ficam versionadas no Git: toda mudança é um commit revisável, o que dá trilha de auditoria.
Para aplicar uma alteração, reinstale o aplicativo no portal (ou reinicie com banco persistente e
reinstale).

## Descobrindo IDs de pipelines e etapas

Na instalação, o servidor grava `<domínio>.catalog.json` aqui com todos os pipelines e etapas do
portal (não versionado). Use esses IDs em `categoryIds` e `stageIds`.

## Exemplo

`exemplo.bitrix24.com.br.json` mostra o formato com regras **fictícias e não homologadas**: uma
ativa, com escalonamento ao superior e depois a um papel; outra em sombra, concluída por campo
preenchido. As 26
regras reais dependem do levantamento das automações da ProjacSeg (ver docs/BUSINESS_RULES.md).
