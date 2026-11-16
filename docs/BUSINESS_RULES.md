# Regras de negócio

Status: **regras fundamentais aprovadas**; regras operacionais detalhadas **pendentes de homologação**.

## Regras fundamentais

1. O sistema trabalha para o colaborador e não pode aumentar sua burocracia.
2. A inteligência artificial **não** calcula prazos. Prazos são calculados por um motor de regras
   determinístico.
3. O motor de regras funciona independentemente da disponibilidade da IA.
4. O escalonamento de atrasos ao superior é **automático**.
5. O comercial **não pode** impedir, cancelar ou adiar escalonamentos.
6. Toda ocorrência operacional possui **histórico auditável** (somente inserção).
7. Nenhuma automação existente do Bitrix24 é desativada antes da homologação.
8. O sistema respeita a hierarquia e as permissões do Bitrix24.
9. O sistema é multiempresa (tenant = portal Bitrix24).
10. IDs de usuários, pipelines e campos personalizados não ficam fixos no código: são configuração por
    tenant (`TenantFieldMapping`).

## Levantamento operacional (a homologar)

- Pipelines: **Automóvel** e **Demais Ramos**.
- **75** configurações habilitadas de criação de tarefas, agrupadas em **26** regras operacionais
  propostas. Números a confirmar com os arquivos originais das automações.

## Regras já refletidas na interface (Sprint 1)

| Visão           | Regra                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| Para hoje (`/`) | Negócios com situação `today`                                                |
| Meus Negócios   | Todos os negócios não resolvidos                                             |
| Em risco        | Todo negócio com prioridade crítica (`danger`), qualquer que seja a situação |
| Aguardando      | Situação `waiting` (dependem de terceiros, ex.: seguradora)                  |
| Resolvidas      | Situação `resolved`                                                          |

Implementação única em `filterDealsByView` (`packages/shared/src/journey.ts`), testada.

Prioridade (barra lateral do card): crítica = vermelho, atenção = âmbar, sem urgência = cinza,
concluído = verde. Cores fixas, independentes do tema.

## Como o motor aplica as regras (implementado)

1. Quando um negócio entra numa etapa com regra, abre-se uma **ocorrência** com prazo contado da
   entrada na etapa: dias úteis (fim do expediente do N-ésimo dia útil), horas úteis ou tempo corrido.
2. Ao atingir a fração `riskAtRatio` do prazo, a ocorrência fica **em risco** e o responsável é
   alertado pelo bot.
3. No vencimento fica **em atraso**; se a regra escalona, o **superior imediato** (chefe do
   departamento no Bitrix24) é avisado; a cada intervalo, o nível acima.
4. A ocorrência só é **resolvida** quando o negócio sai da etapa ou é fechado. Não há como cancelar ou
   adiar o escalonamento.
5. Regras de espera (`kind: "waiting"`, ex.: seguradora) aparecem em "Aguardando" e, em geral, não
   escalonam.
6. Cada passo é gravado no histórico (somente inserção) com autor `engine`.

Indicadores reais: **Negócios ativos** (abertos do colaborador), **Ações de hoje** (ocorrências de ação
que vencem hoje ou já venceram), **Em risco** (em risco + em atraso), **Resolvidas hoje**.

## Pendente de definição

- Catálogo das 26 regras: gatilho, prazo (SLA), responsável, nível de escalonamento.
- Calendário útil (feriados, horário comercial) usado no cálculo de prazos.
- Cadeia de escalonamento: superior imediato, segundo nível, prazos entre níveis.
- Critério de "ação de hoje", "em risco" e "resolvida hoje" para os indicadores reais.
