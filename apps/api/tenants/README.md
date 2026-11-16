# Configuração por empresa

Cada portal Bitrix24 tem um arquivo `<domínio>.json` nesta pasta (ex.:
`projacseg.bitrix24.com.br.json`). Ele é lido na **instalação** do aplicativo e define:

| Campo          | O que é                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `calendar`     | Calendário útil: fuso (`utcOffsetMinutes`, Brasília = -180), dias úteis, expediente e feriados |
| `fieldMapping` | Campos personalizados do CRM com o ramo e o tipo do seguro (`UF_CRM_...`)                      |
| `digestTime`   | Horário do resumo diário no chat (`"08:00"`; `null` desliga)                                   |
| `aiEnabled`    | Liga a IA no chat do assistente (também exige `AI_PROVIDER` no servidor)                       |
| `rules`        | Regras operacionais (formato em `packages/engine/src/rules.ts`)                                |

Regras ficam versionadas no Git: toda mudança é um commit revisável, o que dá trilha de auditoria.
Para aplicar uma alteração, reinstale o aplicativo no portal (ou reinicie com banco persistente e
reinstale).

## Descobrindo IDs de pipelines e etapas

Na instalação, o servidor grava `<domínio>.catalog.json` aqui com todos os pipelines e etapas do
portal (não versionado). Use esses IDs em `categoryIds` e `stageIds`.

## Exemplo

`exemplo.bitrix24.com.br.json` mostra o formato com regras **fictícias e não homologadas**. As 26
regras reais dependem do levantamento das automações da ProjacSeg (ver docs/BUSINESS_RULES.md).
