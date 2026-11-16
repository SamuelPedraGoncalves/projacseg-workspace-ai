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
