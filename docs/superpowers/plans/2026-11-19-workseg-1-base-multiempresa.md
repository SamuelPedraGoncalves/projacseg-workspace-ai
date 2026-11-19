# WorkSeg AI · Plano 1 — Base multiempresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma corretora instala o app e, sem editar arquivo, passa por termos (provisórios) → quem cria regras → mapeamento dos campos; administrador e criadores de regras ganham a área Configurações (mapeamento, calendário, estrutura, quem cria regras), com autorização aplicada pelo servidor.

**Architecture:** Estende o que existe: `TenantConfig` (JSON no `Tenant`) ganha mapeamento ampliado, situações e marcos do primeiro acesso; duas tabelas novas (`TenantRole`, `ConsentRecord`) e uma coluna (`Tenant.installedByUserId`). Um módulo novo `apps/api/src/modules/setup/` concentra acesso, termos, editores, mapeamento, calendário e estrutura, com rotas `/api/v1/setup/*`. No frontend, `features/setup/` (primeiro acesso) e `features/settings/` (Configurações), com o `AppShell` redirecionando para o primeiro acesso enquanto ele não termina.

**Tech Stack:** TypeScript 6, Fastify 5, Prisma 7 + PostgreSQL (PGlite nos testes), zod, React 19, React Router 7, TanStack Query, Vitest 5, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-workseg-ai-design.md` (seções 4, 5, 6 e 11). Este é o 1º de 4 planos: 2 = regras pela tela (tradução por IA, conferência, motor; inclui a sugestão de mapeamento pela IA), 3 = Meus Afazeres, feito, canais, escalonamento e ferramenta por regra, 4 = telas (Minha Jornada, Meus negócios, Temas, Ver como, identidade WorkSeg, estrutura local de plano B).

## Global Constraints

- Ler `CLAUDE.md` e `AGENTS.md` antes de começar. Trabalhar num branch novo `feat/workseg-base` criado a partir do HEAD atual.
- **Commits só depois que o Samuel autorizar commits deste plano.** Sem autorização, os passos "Commit" viram "deixar as mudanças prontas, sem commit".
- Nada de ID de usuário, funil, etapa ou campo fixo no código; tudo escopado por `tenantId`.
- Autorização sempre no servidor (rotas recusam com 401/403); o frontend só esconde o que a API já recusa.
- Toda rota nova de `/api/v1/setup/*` respeita o modo piloto: usuário fora do piloto recebe 403, como em `journey.routes.ts`.
- Histórico somente inserção: `ConsentRecord` nunca é atualizado nem apagado.
- Texto dos termos: **versão provisória**, marcada como tal na tela e no registro (`provisional: true`). Versão: `"2026-11-19-provisorio"`.
- Sem aceite dos termos da versão vigente pelo administrador, nenhuma chamada à IA para a corretora.
- Sugestão automática de mapeamento deste plano é por regras de texto, **não** IA; a tela diz "Sugestão automática", nunca "a IA sugeriu" (a sugestão por IA é do plano 2).
- Não alterar automações do Bitrix24 nem a estrutura da empresa no Bitrix24. Novo escopo do app: `calendar` (o `department` já existe). A reinstalação no portal é feita pelo Samuel.
- Textos visíveis em português do Brasil. Nome visível do produto nas telas novas: "WorkSeg AI".
- Ao final de cada tarefa: `pnpm lint` e `pnpm typecheck` limpos e os testes do pacote tocado passando.

## Review Focus

1. **Usuário comum abre o app antes do administrador terminar o primeiro acesso** → vê "O administrador ainda está configurando o WorkSeg AI", nunca o assistente de configuração; rotas de administrador respondem 403. (Teste na Tarefa 3 e na Tarefa 8.)
2. **Mapeamento com código de campo que não existe no portal, ou valor de lista que não pertence ao campo** → 400 com mensagem dizendo qual, nada gravado. (Tarefa 5.)
3. **`calendar.settings.get` com formatos variados** (`work_time_start` número `9` ou texto `"9.30"`, `week_holidays` vazio, `year_holidays` vazio ou ausente) → calendário válido, com os padrões no que faltar. (Tarefa 6.)
4. **Reinstalação** (inclusive por outro administrador) → mantém instalador original, papéis, aceites e mapeamento. (Tarefa 2.)
5. **Nova versão dos termos** → o administrador precisa aceitar de novo e a IA fica desligada até lá. (Tarefa 3.)

---

### Task 1: Dados — papéis, aceites, instalador e configuração ampliada

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model `Tenant`: coluna `installedByUserId String?`; models novos `TenantRole`, `ConsentRecord`)
- Create: `apps/api/prisma/migrations/20261119000000_workseg_base/migration.sql` (aditiva; gerar com `pnpm --filter @projacseg/api db:migrate:dev --create-only --name workseg_base` e renomear a pasta para a data acima)
- Modify: `apps/api/src/store/types.ts`, `apps/api/src/store/memory-store.ts`, `apps/api/src/store/prisma-store.ts`
- Modify: `apps/api/src/modules/tenants/tenant-config.ts` (`DEFAULT_TENANT_CONFIG` e o esquema do arquivo aceitam os campos novos como opcionais)
- Test: `apps/api/src/store/memory-store.test.ts` (criar se não existir), `apps/api/src/store/prisma-store.integration.test.ts`

**Interfaces:**
- Produces (em `store/types.ts`):

```ts
export interface FieldMapping {            // códigos de campo do Bitrix24 (UF_CRM_*), todos opcionais
  insuranceType?: string; branch?: string; validity?: string;
  cpf?: string; quoteNumber?: string; lossReason?: string;
}
export interface SituationMapping {        // quais negócios são Seguro Novo / Renovação
  categoryIds: string[];                   // funis em que o WorkSeg trabalha
  newBusinessValues: string[];             // IDs de item do campo insuranceType
  renewalValues: string[];
}
export interface SetupMilestones {
  editorsConfirmedAt?: string;             // ISO
  mappingConfirmedAt?: string;
  calendarSource?: "bitrix24" | "default" | "manual";
}
// TenantConfig: fieldMapping: FieldMapping; situations?: SituationMapping; setup?: SetupMilestones
// TenantRecord: installedByUserId: string | null
export type TenantRoleName = "rule_editor";
export interface TenantRoleRecord { tenantId: string; userId: string; userName: string; role: TenantRoleName; grantedBy: string; grantedAt: Date }
export type ConsentKind = "terms" | "privacy_notice";
export interface ConsentRecord { tenantId: string; userId: string; kind: ConsentKind; version: string; provisional: boolean; acceptedAt: Date }
// Store ganha:
roles: {
  list(tenantId: string): Promise<TenantRoleRecord[]>;
  /** Substitui todos os usuários do papel (grava grantedBy/grantedAt para os novos; mantém os antigos que continuam). */
  replace(tenantId: string, role: TenantRoleName, users: { userId: string; userName: string }[], grantedBy: string, at: Date): Promise<void>;
};
consents: {
  append(record: ConsentRecord): Promise<void>;
  latest(tenantId: string, kind: ConsentKind, userId?: string): Promise<ConsentRecord | null>;
};
```

- `fieldMapping` continua `Record` de **strings** (o `CrmReader` faz `Object.values(fieldMapping)` para escolher campos lidos); situações ficam fora dele.

- [ ] **Step 1: Write the failing tests** (memória e PGlite, mesmos casos)
  - `roles.replace` com `[13, 51]` e depois `[51, 77]` → `list` devolve 51 (com `grantedAt` original) e 77; 13 some.
  - `consents.append` duas vezes (versões `"a"` e `"b"`) → `latest(tenant, "terms")` devolve `"b"`; `latest(tenant, "privacy_notice", "51")` só considera o usuário 51.
  - `tenants.update(id, { installedByUserId: "13" })` persiste e `findById` devolve.
  - Dados de um tenant não aparecem em consultas de outro.
- [ ] **Step 2: Run** `pnpm --filter @projacseg/api test -- store` → FAIL (métodos inexistentes).
- [ ] **Step 3: Implement** schema, migração aditiva (comentário no topo: "Aditiva. Não revisada para produção."), contrato e as duas implementações. `ConsentRecord` com índice `(tenantId, kind, userId, acceptedAt)`; `TenantRole` único em `(tenantId, role, userId)`. Atualizar `prisma-store` (mapear `installedByUserId`).
- [ ] **Step 4: Run** `pnpm --filter @projacseg/api test -- store` → PASS. Rodar `pnpm db:local` + `pnpm --filter @projacseg/api db:migrate` no banco local e conferir que as tabelas existem (P3005 é esperado no `migrate deploy`; o `scripts/local-db.ts` aplica a migração).
- [ ] **Step 5: Commit** `feat(api): papéis, aceites e configuração ampliada da corretora`

### Task 2: Quem é quem — instalador, administrador e criador de regras

**Files:**
- Create: `apps/api/src/modules/setup/access.ts`, `apps/api/src/modules/setup/license.ts`
- Modify: `apps/api/src/modules/bitrix-app/bitrix-app.service.ts` (grava `installedByUserId` na instalação)
- Test: `apps/api/src/modules/setup/access.test.ts`, `apps/api/src/modules/bitrix-app/bitrix-app.test.ts`

**Interfaces:**
- Consumes: `Store.roles`, `TenantRecord.installedByUserId`, `inPilot` / `TenantConfig.pilotUserIds` (`modules/tenants/pilot.ts`).
- Produces:

```ts
export interface Access { admin: boolean; ruleEditor: boolean; settings: boolean } // settings = admin || ruleEditor
export async function resolveAccess(store: Store, tenant: TenantRecord, userId: string): Promise<Access>;
/** 401/403 prontos para as rotas: devolve { tenant, session, access } ou já respondeu. */
export async function requireSession(request: FastifyRequest, reply: FastifyReply, deps: { store: Store; signer: SessionSigner }): Promise<{ tenant: TenantRecord; session: SessionClaims; access: Access } | null>;
```

- `license.ts`: `export function licensed(tenant: TenantRecord): boolean` — sempre `true` nesta versão; é o ponto único onde a cobrança entra depois (desenho, seção 11). `requireSession` responde 402 `{ error: "Assinatura pendente" }` quando for `false`.

Regras de `resolveAccess`:
- Com modo piloto (`pilotUserIds` definido): administrador = qualquer usuário do piloto. Decisão do desenho (seção 13): no piloto, o usuário 13 faz o papel de administrador.
- Sem piloto: administrador = `installedByUserId`.
- `ruleEditor` = administrador ou presente em `roles.list` com `rule_editor`.

- [ ] **Step 1: Write the failing tests**
  - Sem piloto, `installedByUserId: "1"` → usuário 1 `{admin:true, ruleEditor:true, settings:true}`, usuário 51 sem papel `{false,false,false}`, 51 com `rule_editor` `{admin:false, ruleEditor:true, settings:true}`.
  - Com `pilotUserIds: ["13"]` e `installedByUserId: "1"` → 13 é admin.
  - `bitrix-app.test.ts`: primeira instalação pelo admin `"1"` grava `installedByUserId: "1"`; reinstalação pelo admin `"9"` **mantém** `"1"` e não apaga papéis, aceites nem `config.fieldMapping`/`situations`/`setup` já gravados (o arquivo da empresa, se existir, não sobrescreve esses três).
- [ ] **Step 2: Run** `pnpm --filter @projacseg/api test -- access bitrix-app` → FAIL.
- [ ] **Step 3: Implement** `access.ts` e o ajuste da instalação (no `upsert`, `installedByUserId: existing?.installedByUserId ?? who.userId`; config = arquivo ou existente, preservando `fieldMapping`, `situations` e `setup` existentes).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): instalador, administrador e criador de regras`

### Task 3: Termos, aviso de privacidade e situação do primeiro acesso

**Files:**
- Create: `apps/api/src/modules/setup/terms.ts`, `apps/api/src/modules/setup/setup.routes.ts`, `packages/shared/src/setup.ts` (exportar em `packages/shared/src/index.ts`)
- Modify: `apps/api/src/app.ts` (registrar `setupRoutes`), `apps/api/src/modules/assistant/assistant.service.ts:177` e `apps/api/src/modules/assistant-bot/assistant-bot.routes.ts:82` (os dois pontos que leem `aiEnabled` passam a usar `aiAllowed`), `apps/api/src/test/helpers.ts` (`acceptTerms(store, tenantId)` para os testes que já usam IA)
- Test: `apps/api/src/modules/setup/setup.routes.test.ts`, `apps/api/src/modules/assistant/assistant.service.test.ts`, `apps/api/src/modules/assistant-bot/assistant-bot.routes.test.ts`

**Interfaces:**
- Produces (`packages/shared/src/setup.ts`):

```ts
export type SetupStep = "terms" | "editors" | "mapping" | "done" | "waiting_admin";
export interface SetupStatus {
  step: SetupStep;
  access: { admin: boolean; ruleEditor: boolean; settings: boolean };
  terms: { version: string; provisional: boolean; accepted: boolean };
  privacyNoticePending: boolean;   // usuário comum ainda não viu o aviso curto
}
export interface TermsDocument { version: string; provisional: boolean; title: string; body: string } // body em parágrafos separados por "\n\n"
```

- `terms.ts`: `export const CURRENT_TERMS: TermsDocument` (versão `"2026-11-19-provisorio"`, `provisional: true`, título "Termos de uso, privacidade e LGPD — versão provisória") e `export const PRIVACY_NOTICE: TermsDocument` (aviso curto). O texto provisório precisa dizer: que é provisório e será substituído; que o WorkSeg lê dados do CRM do Bitrix24 da corretora para lembretes e painéis; que trechos são processados por IA de terceiro (Anthropic) para traduzir regras e responder no chat; que a corretora é a controladora dos dados; que dados não são vendidos nem usados para treinar modelos pela TechStone; contato da TechStone para direitos do titular. Não inventar CNPJ, endereço ou nome de encarregado: deixar `[a preencher pela TechStone]`.
- `export async function termsAccepted(store: Store, tenant: TenantRecord): Promise<boolean>` — última aceitação `kind:"terms"` da corretora tem `version === CURRENT_TERMS.version`.
- Rotas (todas via `requireSession`):
  - `GET /api/v1/setup` → `SetupStatus`. `step`: sem aceite → `"terms"` para admin, `"waiting_admin"` para os demais; aceite sem `setup.editorsConfirmedAt` → `"editors"`/`"waiting_admin"`; sem `setup.mappingConfirmedAt` → `"mapping"`/`"waiting_admin"`; senão `"done"`.
  - `GET /api/v1/setup/terms` → `CURRENT_TERMS`; `GET /api/v1/setup/privacy-notice` → `PRIVACY_NOTICE`.
  - `POST /api/v1/setup/terms/accept` body `{ version }` → só admin (403); versão diferente da vigente → 409; grava `ConsentRecord` e liga `config.aiEnabled = true`.
  - `POST /api/v1/setup/privacy-notice/seen` → qualquer usuário; grava `kind:"privacy_notice"` com `userId`.
- `export async function aiAllowed(store: Store, tenant: TenantRecord): Promise<boolean>` (em `terms.ts`) = `tenant.config.aiEnabled && await termsAccepted(store, tenant)`. Os dois pontos que hoje leem `aiEnabled` usam essa função; sem aceite, o assistente se comporta como IA desligada (mensagem fixa já existente, D-020). Os testes atuais que usam IA chamam `acceptTerms` do helper.

- [ ] **Step 1: Write the failing tests**
  - Sessão de admin sem aceite → `GET /api/v1/setup` = `step:"terms"`; usuário comum → `"waiting_admin"`.
  - Usuário comum `POST /terms/accept` → 403; admin com versão antiga → 409; admin com versão vigente → 200, depois `step:"editors"` e `config.aiEnabled === true`.
  - Trocar `CURRENT_TERMS.version` no teste (via injeção do documento nas opções da rota) depois do aceite → `step:"terms"` de novo e o assistente responde sem IA. *(Review Focus 5)*
  - Usuário fora do piloto → 403 em todas as rotas `/api/v1/setup/*`; sem sessão → 401.
  - `privacyNoticePending` vira `false` depois de `POST /privacy-notice/seen`.
- [ ] **Step 2: Run** `pnpm --filter @projacseg/api test -- setup assistant` → FAIL.
- [ ] **Step 3: Implement** os arquivos acima. `setupRoutes(app, { store, signer, terms?: TermsDocument, now? })` — `terms` opcional só para o teste de versão nova.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): termos provisórios e situação do primeiro acesso`

### Task 4: Quem pode criar regras

**Files:**
- Modify: `apps/api/src/modules/setup/setup.routes.ts`, `packages/shared/src/setup.ts`
- Test: `apps/api/src/modules/setup/setup.routes.test.ts`

**Interfaces:**
- Produces: `export interface PortalUserRef { id: string; name: string }` (shared). Rotas:
  - `GET /api/v1/setup/editors` → `{ editors: PortalUserRef[] }` (quem tem `settings`).
  - `PUT /api/v1/setup/editors` body `{ editors: PortalUserRef[] }` → só admin; IDs `^\d+$`, nomes 1–120 caracteres, até 50 usuários; chama `roles.replace` e grava `setup.editorsConfirmedAt` (lista vazia é válida: só o administrador cria regras).
  - `POST /api/v1/setup/claim-admin` → só quando a sessão tem `admin` do portal Bitrix24 (`session.admin`) e o modo piloto está desligado; troca `installedByUserId` pelo usuário da sessão e registra no log (`app.log.info` com tenant, administrador anterior e novo). (Desenho, seção 4: "se ele sair da empresa, um administrador do portal pode assumir".)

- [ ] **Step 1: Write the failing tests**: PUT por não admin → 403; PUT com `[{id:"51",name:"Ana"}]` → GET devolve Ana e `GET /api/v1/setup` avança para `"mapping"`; PUT com ID `"abc"` → 400; claim-admin com `session.admin=false` → 403, com piloto ligado → 403, com `session.admin=true` → 200 e `resolveAccess` passa a tratar o novo usuário como admin.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): escolha de quem cria regras`

### Task 5: Mapeamento dos campos com sugestão automática

**Files:**
- Create: `apps/api/src/modules/setup/mapping.ts`
- Modify: `apps/api/src/modules/setup/setup.routes.ts`, `packages/shared/src/setup.ts`
- Test: `apps/api/src/modules/setup/mapping.test.ts`, `apps/api/src/modules/setup/setup.routes.test.ts`

**Interfaces:**
- Consumes: `CrmReader.catalog(tenant)` → `categories`, `fieldInfo` (`label`, `type`, `items`). Passar o `CrmReader` para `setupRoutes`.
- Produces (shared):

```ts
export interface MappingCatalog {
  categories: { id: string; name: string }[];
  fields: { code: string; label: string; type: string; items?: { id: string; value: string }[] }[]; // só UF_CRM_* e campos de lista/texto/data
}
export interface MappingInput {
  fieldMapping: { insuranceType: string; branch: string; validity?: string; cpf?: string; quoteNumber?: string; lossReason?: string };
  situations: { categoryIds: string[]; newBusinessValues: string[]; renewalValues: string[] };
}
export interface MappingView { catalog: MappingCatalog; current: MappingInput | null; suggestion: Partial<MappingInput>; confirmed: boolean }
```

- `mapping.ts`:
  - `export function suggestMapping(catalog: MappingCatalog): Partial<MappingInput>` — compara rótulos normalizados (minúsculas, sem acento, sem pontuação) com palavras-chave: `insuranceType` ← "tipo do seguro", "tipo de seguro", "tipo seguro"; `branch` ← "ramo"; `validity` ← "vigencia"; `cpf` ← "cpf"; `quoteNumber` ← "numero do calculo", "n do calculo", "calculo"; `lossReason` ← "motivo da perda", "motivo de perda". Primeiro campo cujo rótulo contém a palavra-chave; nenhum → ausente. Valores do tipo do seguro: item com "novo" → `newBusinessValues`; com "renov" → `renewalValues`. `categoryIds` sugerido = todos.
  - `export function validateMapping(input: unknown, catalog: MappingCatalog): { ok: true; value: MappingInput } | { ok: false; errors: string[] }` — zod para o formato; depois: todo código de campo existe no catálogo; `insuranceType` é campo de lista; cada valor de `newBusinessValues`/`renewalValues` é item desse campo; os dois conjuntos não se cruzam e nenhum é vazio; `categoryIds` não vazio e todos existem. Mensagens dizem o campo e o valor (ex.: `Campo "UF_CRM_9" não existe neste portal.`).
- Rotas: `GET /api/v1/setup/mapping` → `MappingView` (precisa de `settings`); `PUT /api/v1/setup/mapping` → só `settings`; inválido → 400 `{ errors }` sem gravar; válido → grava `config.fieldMapping`, `config.situations`, `setup.mappingConfirmedAt`.

- [ ] **Step 1: Write the failing tests**
  - `suggestMapping` com campos "Tipo do Seguro" (itens "Seguro Novo", "Renovação Própria", "Renovação Outra Corretora"), "Ramo", "Fim de Vigência", "CPF/CNPJ", "Nº do Cálculo" → sugere os cinco e separa os valores; com rótulos sem correspondência → objeto sem essas chaves.
  - `validateMapping`: código inexistente → erro com o código; valor que não é item do campo → erro com o valor; mesmo item nos dois conjuntos → erro; caso válido → `ok`. *(Review Focus 2)*
  - Rotas: usuário sem `settings` → 403 no GET e no PUT; PUT inválido → 400 e `config` inalterado; PUT válido → `GET /api/v1/setup` avança para `"done"`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): mapeamento de campos com sugestão automática`

### Task 6: Calendário da empresa lido do Bitrix24

**Files:**
- Create: `apps/api/src/integrations/bitrix24/company-calendar.ts`
- Modify: `apps/api/src/modules/setup/setup.routes.ts`, `apps/api/src/modules/bitrix-app/bitrix-app.service.ts` (importar na instalação), `docs/BITRIX24_SETUP.md` (escopo `calendar` na tabela de permissões)
- Test: `apps/api/src/integrations/bitrix24/company-calendar.test.ts`, `setup.routes.test.ts`, `bitrix-app.test.ts`

**Interfaces:**
- Consumes: `BusinessCalendar`, `DEFAULT_CALENDAR`, `businessCalendarSchema` de `@projacseg/engine`.
- Produces:

```ts
export interface CalendarSettings { work_time_start?: string | number; work_time_end?: string | number; week_holidays?: string[]; year_holidays?: string; year_workdays?: string }
/** Pura. `years`: anos a expandir os feriados "DD.MM" (ano corrente e o seguinte). */
export function toBusinessCalendar(settings: CalendarSettings, years: number[], utcOffsetMinutes: number): BusinessCalendar;
export async function readCompanyCalendar(portal: Bitrix24Portal, tenant: TenantRecord, now: Date): Promise<BusinessCalendar>; // chama calendar.settings.get
```

Conversões: hora `9`, `"9"`, `"9.30"`, `"9:30"` → `"09:00"`/`"09:30"`; ausente ou inválida → `"08:00"` (início) e `"18:00"` (fim); `week_holidays` (`MO`…`SU`) → `workdays` = dias da semana que **não** estão na lista (0 = domingo), vazio → seg–sex; `year_holidays` `"01.01,25.12"` → `"AAAA-01-01"` etc. para cada ano em `years`; `year_workdays` remove essas datas dos feriados; fuso = `utcOffsetMinutes` recebido (o atual, -180, vem de `DEFAULT_CALENDAR`). O resultado passa por `businessCalendarSchema.parse`.

- Instalação: tenta `readCompanyCalendar`; sucesso → `config.calendar` + `setup.calendarSource = "bitrix24"`; falha → mantém o calendário atual, `calendarSource = "default"` (se ainda não houver um `"manual"`), aviso no log. **Não** sobrescrever um calendário `"manual"`.
- Rotas (`settings`): `GET /api/v1/setup/calendar` → `{ calendar, source }`; `POST /api/v1/setup/calendar/import` → relê do Bitrix24 (erro do portal → 502 com mensagem, nada gravado); `PUT /api/v1/setup/calendar` body `BusinessCalendar` validado pelo esquema do motor → grava com `source = "manual"`.

- [ ] **Step 1: Write the failing tests** — os casos de conversão acima, um teste por formato *(Review Focus 3)*; instalação com `fakeRest({ "calendar.settings.get": {...} })` grava o calendário; com erro, mantém o padrão e não falha a instalação; calendário manual sobrevive à reinstalação; rotas 403 sem `settings`, PUT inválido → 400.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): calendário da empresa lido do Bitrix24`

### Task 7: Estrutura da empresa (leitura)

**Files:**
- Create: `apps/api/src/modules/setup/structure.ts`
- Modify: `apps/api/src/integrations/bitrix24/hierarchy.ts` (expor `departments(tenant)` como público, devolvendo `ID`, `NAME`, `PARENT`, `UF_HEAD`), `setup.routes.ts`, `packages/shared/src/setup.ts`
- Test: `apps/api/src/modules/setup/structure.test.ts`, `setup.routes.test.ts`

**Interfaces:**
- Produces (shared): `export interface DepartmentNode { id: string; name: string; head: PortalUserRef | null; children: DepartmentNode[] }`
- `export function buildTree(departments: { ID: string; NAME?: string; PARENT?: string; UF_HEAD?: string }[], names: Map<string, string>): DepartmentNode[]` — pura; raiz = sem `PARENT` ou com `PARENT` inexistente; `UF_HEAD` `"0"`/vazio → `head: null`; ordena filhos por nome.
- `GET /api/v1/setup/structure` (`settings`) → `{ source: "bitrix24", departments: DepartmentNode[] }`; nomes dos chefes via `CrmReader.userName`; falha do portal → 502 `{ error: "Não foi possível ler a estrutura da empresa no Bitrix24." }` (o plano B local é do plano 4).

- [ ] **Step 1: Write the failing tests** — `buildTree` com três níveis, chefe ausente e pai inexistente; rota devolve a árvore; 403 sem `settings`; 502 quando `department.get` falha.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): estrutura da empresa em Configurações`

### Task 8: Primeiro acesso no navegador

**Files:**
- Modify: `apps/web/src/platform/platform.ts` (Platform ganha `session: string | null` e `pickUsers: (() => Promise<PortalUserRef[]>) | null`), `apps/web/src/integrations/bitrix24/sdk.ts` (`selectUsers(callback: (users: { id: string | number; name: string }[]) => void): void` no `Bx24Sdk`), `apps/web/src/integrations/bitrix24/host.ts` (`selectUsers(): Promise<PortalUserRef[]>`), `apps/web/src/layout/AppShell.tsx` (redireciona para `/configurar` quando `step !== "done"`), `apps/web/src/app/routes.tsx`
- Create: `apps/web/src/features/setup/setup-api.ts`, `apps/web/src/features/setup/SetupPage.tsx`, `TermsStep.tsx`, `EditorsStep.tsx`, `MappingStep.tsx`, `WaitingAdmin.tsx`, `PrivacyNotice.tsx`
- Test: `apps/web/src/features/setup/SetupPage.test.tsx`, `apps/web/src/app/App.test.tsx`

**Interfaces:**
- Consumes: tipos de `@projacseg/shared` (`SetupStatus`, `TermsDocument`, `PortalUserRef`, `MappingView`, `MappingInput`); rotas das Tarefas 3–5.
- Produces: `setup-api.ts` com `createSetupApi(session: string, baseUrl = "")` → `{ status(), terms(), acceptTerms(version), privacyNotice(), markPrivacyNoticeSeen(), editors(), saveEditors(editors), mapping(), saveMapping(input), calendar(), importCalendar(), saveCalendar(calendar), structure() }`, cada um `fetch` com `Authorization: Bearer`, erro HTTP → `SetupApiError(status, body)`. Hook `useSetupStatus()` (TanStack Query, chave `["setup"]`).

Comportamento:
- Modo demonstração (`session === null`): sem redirecionamento e sem primeiro acesso.
- `/configurar` mostra o passo de `status.step`: **Termos** (texto, faixa "Versão provisória", botão "Li e aceito"); **Boas-vindas** (layout da tela 9 do Samuel: "Bem-vindo ao WorkSeg AI", texto da tela, botão "Definir usuários que podem criar regras" que chama `pickUsers`, lista dos escolhidos com remover, botão "Continuar" que salva mesmo vazio); **Mapeamento** (funis com caixas de seleção; um seletor por campo com o catálogo; valores do tipo do seguro divididos em Seguro Novo / Renovação; selo "Sugestão automática" nos campos pré-preenchidos pela sugestão; erros 400 mostrados no campo correspondente; "Salvar e começar"); **Aguardando** (`waiting_admin`: "O administrador ainda está configurando o WorkSeg AI. Volte em breve.").
- Usuário comum com `privacyNoticePending` vê o aviso curto uma vez (modal com "Entendi").

- [ ] **Step 1: Write the failing tests** (Testing Library, API falsa por `fetch` mockado)
  - `step:"terms"` → mostra "Versão provisória" e, ao aceitar, chama `POST /terms/accept` com a versão e avança.
  - `step:"waiting_admin"` → mostra a mensagem de espera e nenhum botão de configuração. *(Review Focus 1)*
  - Boas-vindas: `pickUsers` devolve Ana → aparece na lista; "Continuar" envia `[{id:"51",name:"Ana"}]`.
  - Mapeamento: 400 `{errors:['Campo "UF_CRM_9" não existe neste portal.']}` → mensagem visível, sem avançar.
  - `App.test.tsx`: com sessão e `step !== "done"`, abrir `/` leva a `/configurar`; em demonstração, `/` abre Minha Jornada.
- [ ] **Step 2: Run** `pnpm --filter @projacseg/web test -- setup App` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): primeiro acesso do WorkSeg AI`

### Task 9: Configurações

**Files:**
- Create: `apps/web/src/features/settings/SettingsPage.tsx`, `MappingSettings.tsx` (reaproveita o formulário de `MappingStep`; extrair o formulário para `features/setup/MappingForm.tsx`), `CalendarSettings.tsx`, `StructureSettings.tsx`, `EditorsSettings.tsx`
- Modify: `apps/web/src/layout/Sidebar.tsx` (item "Configurações", ícone `Settings` do Lucide, só com `access.settings`), `apps/web/src/app/routes.tsx` (`/configuracoes`), `apps/web/src/integrations/bitrix24/host.ts` (`openCompanyStructure()` → `openPath("/company/vis_structure.php")`)
- Test: `apps/web/src/features/settings/SettingsPage.test.tsx`, `apps/web/src/app/App.test.tsx`, `apps/web/e2e/settings.spec.ts` (no padrão de `apps/web/e2e/journey.spec.ts`)

**Interfaces:**
- Consumes: `createSetupApi` (Tarefa 8), `MappingForm`.

Comportamento: abas **Mapeamento**, **Calendário** (expediente, dias úteis, feriados do ano; botões "Ler do Bitrix24" e "Salvar"; mostra a origem: "lido do Bitrix24", "padrão" ou "ajustado aqui"), **Estrutura da empresa** (árvore em lista recuada com o chefe de cada departamento; botão "Atualizar estrutura da empresa" abre a estrutura no Bitrix24; 502 → mensagem do servidor), **Quem cria regras** (só o administrador edita; os demais veem a lista). A aba "Regras de negócio" entra no plano 2.

- [ ] **Step 1: Write the failing tests** — Sidebar sem "Configurações" para `settings:false` e com para `true`; acessar `/configuracoes` sem `settings` volta para `/`; Calendário mostra "lido do Bitrix24" e, ao salvar um feriado, envia `PUT` com o calendário; Estrutura renderiza três níveis; "Quem cria regras" desabilitado para criador que não é admin. E2E: com API falsa, abrir Configurações e trocar de aba.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS, incluindo `pnpm test:e2e`.
- [ ] **Step 5: Commit** `feat(web): Configurações com mapeamento, calendário, estrutura e quem cria regras`

### Task 10: Documentação e verificação completa

**Files:**
- Modify: `docs/CHANGELOG.md` (seção nova, "testado localmente"), `docs/DECISIONS.md` (D-055 termos provisórios e aceite liga a IA; D-056 administrador = instalador, piloto = usuários do piloto; D-057 mapeamento e situações na configuração, sugestão automática sem IA), `docs/ARCHITECTURE.md` (módulo `setup`, tabelas novas), `docs/SECURITY.md` (rotas de configuração autorizadas no servidor), `docs/ROADMAP.md` (WorkSeg plano 1)

- [ ] **Step 1:** Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` → tudo limpo.
- [ ] **Step 2:** Subir `pnpm db:local`, `pnpm --filter @projacseg/api db:migrate` e a API; com o app ainda com os escopos atuais, conferir no log que a instalação segue funcionando e que, sem o escopo `calendar`, o calendário cai no padrão sem quebrar a instalação.
- [ ] **Step 3:** Atualizar os documentos acima. Nada descrito como homologado: o estado é "testado localmente".
- [ ] **Step 4:** Pedir ao Samuel que acrescente o escopo `calendar` no app 151 e reinstale; depois, com o usuário 13, percorrer termos → boas-vindas → mapeamento → Configurações e registrar o resultado no CHANGELOG.
- [ ] **Step 5: Commit** `docs: WorkSeg AI plano 1`
