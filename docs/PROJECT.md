# Projeto

## Contexto

A ProjacSeg opera sua área comercial de seguros no Bitrix24, com dois pipelines principais:
**Automóvel** e **Demais Ramos**. O levantamento operacional anterior identificou **75 configurações
habilitadas de criação de tarefas**, agrupadas em **26 regras operacionais propostas** — números a
serem homologados com os arquivos originais das automações.

O excesso de tarefas gera sobrecarga, dificulta a priorização e cria resistência ao uso do CRM.

## Objetivo

Transformar o Bitrix24 em uma plataforma de assistência operacional inteligente que organiza o
trabalho de cada colaborador, monitora os processos, identifica atrasos, auxilia o colaborador e
escalona automaticamente descumprimentos aos superiores.

## Estado atual (16/11/2026)

### Implementado e testado (sem homologação em portal real)

- **Dashboard Minha Jornada** fiel à referência, com temas por colaborador, filtros por URL,
  responsividade e acessibilidade.
- **Motor de regras determinístico** (`packages/engine`): prazos em dias/horas úteis com feriados,
  risco, atraso, escalonamento em níveis, resolução só quando o negócio avança; projeção do dashboard e
  resumo de prioridades — tudo sem IA.
- **Backend** (`apps/api`): instalação do aplicativo com tokens criptografados, sessão assinada do
  colaborador, leitura do CRM (negócios, pipelines, etapas, campos de lista, usuários, departamentos),
  eventos de negócios em tempo real, sincronização completa periódica, histórico auditável (somente
  inserção) e PostgreSQL via Prisma.
- **Comunicação ativa pelo bot** no chat do Bitrix24: alerta de risco, aviso de atraso, aviso ao
  superior no escalonamento e resumo diário, sem mensagens duplicadas.
- **Assistente de IA** no chat (Claude, opcional e desligado por padrão): responde usando os dados do
  motor; não altera prazos nem escalonamentos; por padrão não envia nomes de segurados à IA.
- **Dashboard com dados reais** dentro do Bitrix24, atualizado a cada minuto; demonstração fora dele.

### Depende de terceiros para funcionar de verdade

- **Regras homologadas** da ProjacSeg (as 26 regras, calendário, campos do CRM). Hoje só há regras de
  exemplo, marcadas como não homologadas.
- **Portal de testes**, aplicativo local (client_id/secret) e servidor HTTPS com PostgreSQL.
- **Decisão de LGPD e provedor/chave de IA** para ligar o chat inteligente.

### Não implementado

- Visão do gestor (equipe e escalonamentos recebidos) no dashboard.
- Edição de regras pela interface (hoje: arquivo versionado por empresa).
- Fila distribuída (BullMQ/Redis) — o agendador atual roda em um único processo.
- Uso do dashboard como página inicial automática do Bitrix24 (homologação posterior).

## Dados demonstrativos

Fora do Bitrix24: usuário **Lucas**; indicadores 42 / 12 / 3 / 8; negócios Carlos Almeida, Empresa
Martins, Roberto Lima, Juliana Santos, Clínica Oliveira e Ana Souza — todos fictícios.

## Partes envolvidas

- **TechStone Consultoria** — desenvolvimento e implantação.
- **ProjacSeg** — cliente; homologa regras, números e layout.
