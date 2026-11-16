# Decisões técnicas

Formato curto de ADR. Data de todas as decisões abaixo: 16/11/2026.

## D-001 — Projeto em pasta própria

O projeto fica em `IA_Makers/projacseg-workspace-ai/`, não na raiz `IA_Makers`, seguindo a regra
"um projeto, uma pasta". Sessões futuras devem ser abertas nesta pasta.

## D-002 — Pacotes do workspace exportam TypeScript

`@projacseg/theme`, `shared` e `ui` apontam `exports` para `src/*.ts`. Evita etapas de build por pacote;
Vite, esbuild e Vitest compilam. A API é empacotada com esbuild embutindo esses pacotes.

## D-003 — TypeScript 6.0 (não 7)

O TypeScript 7 já é o `latest`, mas o typescript-eslint 8.73 suporta só `< 6.1`. Fixado `~6.0.3`.
Revisar quando o typescript-eslint suportar o TS 7.

## D-004 — React Router 7 (não 8)

Fixada a linha 7 (`^7.18.5`), de API estável e conhecida. Migrar para a 8 em tarefa própria.

## D-005 — shadcn/ui como padrão, sem CLI

Os componentes seguem o padrão shadcn/ui (Radix + `cva` + `cn`) escritos à mão em `packages/ui`, pois
o CLI do shadcn é interativo e pensado para app único, não para pacote compartilhado de monorepo.

## D-006 — A rota é a fonte de verdade do filtro

Cada visão tem URL própria. Menu lateral, botões de filtro e cards de indicadores navegam para a rota;
breadcrumb, item ativo e filtro derivam dela. Permite link direto e botão voltar.

## D-007 — Tom 2 do tema institucional = #1D7ECD

O CSS estático da referência trazia `#1D7DCD`, mas a fórmula da própria referência, aplicada na carga
da página, produz `#1D7ECD` (73 + 105 × 0,5 = 125,5 → 126 = 0x7E). Como o que a referência renderiza é
o resultado da fórmula, seguimos a fórmula. Diferença visual imperceptível.

## D-008 — Fonte Poppins local

`@fontsource/poppins` (subconjunto latino) no lugar do Google Fonts, cumprindo "sem chamadas externas
desnecessárias".

## D-009 — Zod fora do bundle do navegador

O frontend importa apenas tipos de `@projacseg/shared` e a lógica pura de `@projacseg/shared/journey`.
Reduziu o bundle de 530 KB para 446 KB (141 KB gzip).

## D-010 — Ícones Lucide

Substituem os SVGs inline da referência: `CircleChevronRight` (Minha Jornada), `BriefcaseBusiness`,
`Clock`, `Hourglass` (Aguardando — no lugar do círculo com "+", mais claro), `Sparkles`, `CircleCheck`,
`Palette` (Temas — no lugar do ícone de engrenagem), `ArrowRight`.

## D-011 — Menu recolhível no celular

Abaixo de 650 px a sidebar vira barra superior com botão de menu (`aria-expanded`), em vez de exibir
sempre a grade 2×2 da referência. Atende "a sidebar poderá ser recolhida".

## D-012 — Validação do HEX inline

Erro do campo HEX exibido como texto com `role="alert"` e `aria-invalid`, no lugar de
`setCustomValidity`, para funcionar igual em todos os navegadores e leitores de tela.

## D-013 — Playwright com o Chrome instalado

`channel: "chrome"` evita baixar navegadores. Em CI, instalar o Chromium do Playwright.

## D-014 — Sem rota HTTP de tema por enquanto

A preferência de tema no backend só será exposta junto com a autenticação, para que a identidade venha
da sessão e um colaborador não consiga alterar o tema de outro.

## D-015 — Integração com o Bitrix24 pelo navegador via BX24 JS SDK

Pedido do Samuel (16/11/2026): avatar com a foto do Bitrix24, **Abrir** indo ao card do negócio e o
assistente usando o chat do Bitrix24. Feito com a SDK oficial dentro do iframe do aplicativo:
`user.current` (foto), `BX24.openPath` (card no slider) e `BX24.im.openMessenger` (chat). A SDK só é
carregada dentro de um portal (iframe + `DOMAIN` e `APP_SID` na URL); fora dele a aplicação continua no
modo demonstrativo, o que mantém desenvolvimento e testes sem chamadas externas.

## D-016 — Assistente como bot do Bitrix24, localizado pelo código

O chat do assistente é um bot `imbot` do portal. O frontend o encontra por `imbot.bot.list` e pelo
código `projacseg_assistant` (configurável), nunca por ID fixo — o ID muda a cada portal. Se o bot não
existir, mostra um aviso em vez do chat demonstrativo, para não exibir respostas simuladas dentro de
um portal real.

## D-017 — Tema inicializado depois de identificar o colaborador

O store do tema passou a ter `initialize(scope)`. Dentro do Bitrix24 o colaborador só é conhecido após
`user.current`; o tema dele é aplicado antes da primeira renderização.

## D-018 — A API serve o frontend no portal de testes

O Bitrix24 abre aplicativos com `POST`. Em vez de exigir uma hospedagem específica, a própria API
(Fastify + `@fastify/static`) serve o build e responde ao `POST` com o `index.html`. Um único processo
(`pnpm portal`) atende o app e os eventos do bot.

## D-019 — Bot registrado pelo navegador na instalação

`imbot.register` é chamado pela página `/install` com a BX24 JS SDK (o administrador que instala já
está autenticado). Evita guardar tokens OAuth no backend antes de existir banco e criptografia. A cada
reinstalação o bot é atualizado (`imbot.update`), o que acompanha a troca de URL do túnel.

## D-020 — Bot responde sem IA, de forma explícita

Até a IA ser conectada, o bot responde com mensagem fixa dizendo que está em implantação. Não há
respostas simuladas no chat do Bitrix24.

## D-021 — Negócios têm `origin`

`demo` (fictício) ou `crm` (lido do portal). Só `crm` abre o card no Bitrix24, para nunca abrir um
negócio inexistente (ou de outro cliente) a partir de um ID fictício.

## D-022 — Motor de regras como pacote puro (`packages/engine`)

Prazos, risco e escalonamento são funções puras com `now` como parâmetro: mesmas entradas, mesmo
resultado, testáveis sem banco, rede ou IA. O backend só persiste os comandos que o motor devolve.

## D-023 — Modelo "SLA de etapa"

Cada regra abre uma ocorrência quando o negócio entra numa etapa e a encerra quando ele sai dela (ou é
fechado). Corresponde às automações atuais que criam tarefas ao mudar de etapa. Prazos contam da
entrada na etapa (`MOVED_TIME`), não do momento da sincronização.

## D-024 — Fuso como deslocamento fixo

O calendário usa `utcOffsetMinutes` (Brasília = -180) em vez de banco de fusos: o Brasil não tem
horário de verão desde 2019 e o cálculo fica totalmente determinístico.

## D-025 — Regras em arquivo versionado por empresa

`apps/api/tenants/<domínio>.json` guarda calendário, campos e regras. Cada mudança é um commit
revisável (trilha de auditoria das regras) e nada fica fixo no código. Edição pela interface fica para
depois.

## D-026 — Sessão do Workspace no HTML, não cookie

Ao abrir o app, o backend valida o `AUTH_ID` no portal e injeta uma sessão HMAC na página. Evita
cookies de terceiros (bloqueados em iframes) e mantém os tokens do Bitrix24 fora do navegador.

## D-027 — Agendador em processo

Um `setInterval` com proteção contra sobreposição atende um servidor. A interface isolada permite
trocar por BullMQ/Redis quando houver várias instâncias.

## D-028 — IA: Claude Opus 5.5, desligada por padrão e sem nomes de segurados

Provedor desacoplado (`LlmProvider`); implementação com o SDK oficial da Anthropic, modelo
`claude-opus-5-5`, esforço `medium` e fallback do servidor (`fallbacks: "default"`) para recusas. A
IA só recebe a projeção do motor e não pode alterar prazos ou escalonamentos. Por padrão os títulos dos
negócios viram "Negócio #ID" antes de sair do servidor e são recolocados na resposta. Ligar exige
`AI_PROVIDER`, chave e `aiEnabled` na empresa — decisão de LGPD pendente.

## D-029 — PGlite para testar o PostgreSQL

Sem Docker disponível na máquina de desenvolvimento, o armazenamento Prisma é testado contra o PGlite
(PostgreSQL em WebAssembly servido pelo protocolo de rede), aplicando a migração versionada. O teste
encontrou um bug real que a versão em memória não acusava.
