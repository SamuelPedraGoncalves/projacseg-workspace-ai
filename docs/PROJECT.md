# Projeto

## Contexto

A ProjacSeg opera sua área comercial de seguros no Bitrix24, com dois pipelines principais:
**Automóvel** e **Demais Ramos**. O levantamento operacional anterior identificou **75 configurações
habilitadas de criação de tarefas**, agrupadas em **26 regras operacionais propostas** — números a
serem homologados com os arquivos originais das automações.

O excesso de tarefas gera sobrecarga, dificulta a priorização e cria resistência ao uso do CRM.

## Objetivo

Transformar o Bitrix24 em uma plataforma de assistência operacional inteligente que:

- organiza o trabalho de cada colaborador;
- monitora os processos e identifica atrasos;
- auxilia o colaborador (assistente de IA);
- escalona automaticamente descumprimentos aos superiores.

## Escopo da Sprint 1 — Minha Jornada

Somente o **frontend funcional do dashboard**, com dados fictícios.

### Implementado

- Layout fiel ao HTML de referência (resolução de referência 1649 × 928): sidebar em degradê,
  cabeçalho com breadcrumb, saudação por horário e avatar com contorno em degradê, banner do
  assistente, quatro indicadores, filtros e cards de negócios.
- Navegação por URL: `/` (Minha Jornada / Para hoje), `/negocios`, `/em-risco`, `/aguardando`,
  `/resolvidos`. Menu lateral, filtros e cards de indicadores apontam para a mesma rota.
- Filtros funcionando sobre seis negócios demonstrativos.
- Diálogo de detalhes do negócio (botão **Abrir**), com botão "Abrir no Bitrix24" desabilitado até a
  integração.
- Chat demonstrativo (**Conversar com assistente** e item **Assistente IA**), com respostas
  predefinidas sempre rotuladas como demonstrativas.
- Motor de temas: 8 temas predefinidos, seletor de cor, campo HEX com validação, prévia da escala de
  cinco tons, aplicação imediata, persistência por colaborador (localStorage) e restauração do padrão.
- Responsividade (desktop, notebook, tablet e celular, com menu recolhível abaixo de 650 px) e
  acessibilidade (teclado, foco visível, link "Pular para o conteúdo", rótulos e anúncios para leitor
  de tela).
- API esqueleto (Fastify) com `/health`, configuração validada por Zod e **interfaces** (sem
  implementação) da integração com o Bitrix24.

### Não implementado (por decisão de escopo)

- Agente de IA real, motor operacional de regras, escalonamento, banco de dados, autenticação OAuth e
  qualquer chamada ao Bitrix24.
- Uso do dashboard como página inicial automática do Bitrix24 (homologação posterior).

## Dados demonstrativos

Usuário **Lucas**; indicadores 42 / 12 / 3 / 8; negócios Carlos Almeida, Empresa Martins, Roberto Lima,
Juliana Santos, Clínica Oliveira e Ana Souza. Todos fictícios (`apps/web/src/features/deals/demo-data.ts`).

## Partes envolvidas

- **TechStone Consultoria** — desenvolvimento e implantação.
- **ProjacSeg** — cliente; homologa regras, números e layout.
