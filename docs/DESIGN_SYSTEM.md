# Design System

Fonte visual: HTML de referência "Minha Jornada" (resolução de referência **1649 × 928**) e as imagens
originais. A conversão para React preservou medidas, raios, espaçamentos e breakpoints da referência.

## Tipografia

**Poppins** (400, 500, 600, 700, 800), servida localmente via `@fontsource/poppins` (subconjunto
latino). Tamanhos fluidos com `clamp()` iguais aos da referência.

## Tokens

Todas as cores vivem em CSS custom properties (`apps/web/src/index.css`).

### Variáveis de tema (mudam com o tema)

| Variável                            | Uso                                                   |
| ----------------------------------- | ----------------------------------------------------- |
| `--theme-base`                      | Tom 0 — cor base                                      |
| `--theme-tone-1` … `--theme-tone-3` | Tons intermediários                                   |
| `--theme-tone-4`                    | Extremidade mais clara do degradê                     |
| `--theme-gradient`                  | Degradê vertical de 5 pontos (0/25/50/75/100%)        |
| `--theme-gradient-soft`             | Degradê suavizado (cards de indicadores)              |
| `--theme-surface`                   | Fundo dos cards de negócios e mensagens do assistente |
| `--theme-on-gradient`               | Cor do texto sobre o degradê                          |

### Tokens fixos (não mudam com o tema)

`--background` (#FDFDFD), `--text-primary` (#403933), `--text-secondary` (#797979),
`--text-muted` (#969696), `--color-danger` (#FF5058), `--color-warning` (#E5A33C),
`--color-success` (#21966B), `--color-neutral` (#9CA3AF), `--border-color` (#E9E9E9),
`--radius-large` (22px), `--radius-medium` (12px).

### O que muda de cor

Sidebar, contorno do avatar, banner do assistente, cards de indicadores, filtro ativo, fundo dos cards
de negócios, destaques de navegação, botões primários e foco.

### O que não muda

Alertas críticos, indicadores de atraso, indicadores de sucesso, textos neutros e fundo da aplicação.

## Motor de temas (`packages/theme`)

### Tema institucional

Base **#0649A8**, extremidade **#33B2F2** (fixa, para fidelidade à referência).

| Tom 0   | Tom 1   | Tom 2   | Tom 3   | Tom 4   |
| ------- | ------- | ------- | ------- | ------- |
| #0649A8 | #1163BB | #1D7ECD | #2898E0 | #33B2F2 |

> O CSS estático da referência trazia `#1D7DCD` no tom 2, mas a própria fórmula da referência (aplicada
> ao carregar a página) gera `#1D7ECD`. Seguimos a fórmula — ver DECISIONS.md, D-007.

### Fórmula

1. **Extremidade clara** — tema institucional: `#33B2F2`. Demais: `mix(base, branco, 0,40)`.
2. **Cinco tons** — interpolação linear RGB entre base e extremidade em 0; 0,25; 0,5; 0,75; 1.
   Como a extremidade é a própria base clareada, o matiz se mantém e cada tom fica mais claro.
3. **Degradê suave** — `mix(tom0, branco, 0,68)` → `mix(tom4, branco, 0,68)`.
4. **Superfície** — `mix(tom4, branco, 0,84)`.
5. **Texto sobre o degradê** — compara o pior contraste WCAG do branco e de `#171717` em todos os
   tons e escolhe o melhor. O institucional mantém branco.

Funções: `generatePalette`, `buildTheme`, `applyThemeTokens`, `normalizeHex`, `contrastRatio`.

### Temas predefinidos

Azul #0649A8 · Roxo #6534AE · Verde #137849 · Rosa #B52B77 · Laranja #BD5210 · Vermelho #B52B38 ·
Turquesa #087D85 · Grafite #354052.

### Persistência

`ThemePreferenceRepository` com escopo `{ tenantId, bitrixUserId }`. Hoje:
`LocalStorageThemeRepository`, chave `workspace-theme:<tenantId>:<bitrixUserId>`. Valores inválidos no
armazenamento são ignorados; falhas de armazenamento não quebram a interface. Futuro: repositório HTTP
gravando na tabela `theme_preferences` com identidade vinda da sessão (nunca do navegador).

## Componentes (`packages/ui`)

- `Button` — variantes `gradient`, `secondary`, `white`, `ghost`; tamanhos `sm`, `md`, `icon`.
- `Dialog` / `DialogContent` — Radix: foco preso, Esc fecha, foco retorna ao gatilho, título e descrição
  ligados por ARIA.
- `cn` — `clsx` + `tailwind-merge`.

## Breakpoints

Desktop-first, iguais à referência: `≤1200px`, `≤900px` (indicadores em 2 colunas), `≤650px` (sidebar
vira barra superior com menu recolhível; filtros em grade 2×2).

## Acessibilidade

- Foco visível em 3px com `--theme-tone-2`; sobre degradê usa `--theme-on-gradient`.
- Link "Pular para o conteúdo"; `aria-current="page"` no menu e no breadcrumb.
- Filtros e temas com `aria-pressed`; barra de prioridade com texto alternativo para leitor de tela.
- Troca de filtro anuncia a contagem (`role="status"`); chat com `aria-live`.
- `prefers-reduced-motion` desativa transições.

### Limitação conhecida

Temas personalizados de luminância média (ex.: Laranja) podem não atingir 4,5:1 em todo o degradê com
nenhuma das duas cores de texto. A referência já previa validar contraste WCAG por componente na versão
de produção — ver ROADMAP.
