# Referência: automações do Bitrix24

Material gerado a partir das exportações `.bpt` da ProjacSeg (16/11/2026). **Anonimizado**: usuários
viram `USR-xx`, servidores externos `HOST-xx`; sem URLs, e-mails, telefones, documentos ou nomes.

| Arquivo | Conteúdo | Origem |
| --- | --- | --- |
| `stage-map.json` | Arquivo → pipeline/etapa, com evidência e confiança | Mantido à mão |
| `INVENTARIO.md`, `inventory.json` | Inventário técnico por arquivo e atividade | Gerado |
| `MATRIZ_TAREFAS.md` | Tarefas por pipeline e etapa | Gerado |
| `CATALOGO_REGRAS.md`, `rules.catalog.json` | Regras consolidadas com rastreabilidade (`arquivo#atividade`) | Gerado |
| `ESCALONAMENTOS.md`, `escalations.json` | Escalonamentos e lembretes atuais | Gerado |
| `DEPENDENCIAS.md` | Encerramentos, mudanças de etapa, laços, fluxos | Gerado |
| `QUESTIONARIO_HOMOLOGACAO.md` | Perguntas para a ProjacSeg | Mantido à mão |

Regerar (a partir da raiz): `pnpm --filter @projacseg/bitrix-automations analyze`.
Os originais (`data/private/automations/raw/`), a lista de nomes a anonimizar
(`redaction.json`) e o mapa de pseudônimos (`pseudonyms.json`) ficam fora do Git.
