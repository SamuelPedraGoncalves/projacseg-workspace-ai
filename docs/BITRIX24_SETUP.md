# Instalação num portal Bitrix24 de testes

Roteiro para instalar o Workspace como **aplicativo local** num portal Bitrix24 **de testes**.
Não use o portal de produção da ProjacSeg sem autorização.

## O que funciona depois da instalação

- **Dashboard com os negócios reais** do colaborador logado, atualizado sozinho a cada minuto.
- **Motor de regras** (sem IA): abre ocorrências quando um negócio entra numa etapa com regra, calcula
  o prazo em dias/horas úteis, marca risco e atraso, e **escalona automaticamente** ao superior pelo
  organograma do Bitrix24. A ocorrência só termina quando o negócio avança de etapa.
- **Mensagens ativas pelo bot** "Assistente ProjacSeg": alerta de risco, aviso de atraso, aviso ao
  superior no escalonamento e **resumo diário** no horário configurado.
- **Abrir** em negócios reais abre o card no Bitrix24.
- **Chat com IA** (opcional): o bot responde perguntas usando os dados do motor (Claude). Desligado
  por padrão.
- Foto e nome do usuário no cabeçalho.

> O motor só age sobre **regras configuradas**. Sem as regras homologadas da ProjacSeg, use as regras
> de exemplo apenas para testar (ver passo 3). Regras sem `"mode": "active"` rodam em **modo sombra**:
> aparecem no dashboard, mas o bot não envia mensagens — é o modo para o portal real enquanto as
> automações atuais estiverem ligadas.

## Pré-requisitos

- Portal Bitrix24 de testes e usuário **administrador**.
- Node.js 22+ e pnpm 12.
- PostgreSQL: `pnpm db:up` (Docker), `pnpm --filter @projacseg/api db:local` (PGlite, sem Docker —
  dados em `data/private/pglite`, fora do Git; só para testes nesta máquina) ou um banco gerenciado.
  Sem banco, a API roda em memória e perde tudo ao reiniciar.
- Endereço **HTTPS público** para esta máquina (o Bitrix24 na nuvem precisa alcançá-la). Para testes:
  `cloudflared tunnel --url http://localhost:3333` ou `ngrok http 3333`.

## 1. Criar o aplicativo local no Bitrix24

**Aplicativos → Recursos para desenvolvedores → Outros → Aplicativo local** (os nomes podem variar).

| Campo                         | Valor                                                  |
| ----------------------------- | ------------------------------------------------------ |
| Tipo                          | Aplicativo com interface (não marcar "usa apenas API") |
| Caminho do manipulador        | `https://<url-pública>/`                               |
| Caminho de instalação inicial | `https://<url-pública>/install`                        |
| Nome do item de menu          | `Minha Jornada`                                        |
| Permissões                    | `crm`, `user`, `department`, `im`, `imbot`             |

Salve e anote o **client_id** e o **client_secret** (vão só para o `.env` do servidor).

## 2. Configurar o servidor

```bash
cp apps/api/.env.example apps/api/.env
```

Preencha em `apps/api/.env`:

- `DATABASE_URL` (o padrão serve para `pnpm db:up`);
- `TOKEN_ENCRYPTION_KEY` e `SESSION_SECRET` (comandos para gerar estão no arquivo);
- `BITRIX24_ALLOWED_DOMAINS` = domínio do portal de testes;
- `BITRIX24_CLIENT_ID` e `BITRIX24_CLIENT_SECRET` do passo 1.

## 3. Configurar a empresa (regras)

Crie `apps/api/tenants/<domínio-do-portal>.json` a partir de
`apps/api/tenants/exemplo.bitrix24.com.br.json`: calendário, campos de ramo/tipo, horário do resumo
diário e as regras. Na primeira instalação, o servidor grava `<domínio>.catalog.json` com os IDs de
pipelines e etapas do portal — use-os nas regras e **reinstale** para aplicar.

## 4. Subir

```bash
pnpm install
pnpm db:up        # se for usar o Postgres local via Docker
pnpm db:migrate
pnpm portal       # build + API em http://127.0.0.1:3333
```

Sem Docker: `pnpm --filter @projacseg/api db:local` (aplica as migrações e serve em 127.0.0.1:5432) e,
no `.env`, `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable`.

Em outro terminal, inicie o túnel. Confira `https://<url-pública>/health`: deve mostrar
`"database": "postgresql"` e `"bitrix24": "configured"`.

## 5. Instalar

Abra o aplicativo no portal (ou **Reinstalar**). O Bitrix24 pode chamar o caminho de instalação de
dois jeitos — pelo navegador (iframe) ou **pelo servidor dele** (`event=ONAPPINSTALL`, bloco `auth`) —
e o Workspace aceita os dois com as mesmas verificações. No segundo caso nada aparece na tela: a
reinstalação acontece no servidor (confira o log: "Aplicativo instalado no portal").

Para abrir o aplicativo: `https://<portal>/marketplace/app/<ID>/` (o ID aparece na lista de
aplicativos locais) ou pelo item de menu. Abrir a URL pública do túnel diretamente mostra só o modo
demonstrativo.

A instalação:

1. valida que quem instala é administrador e que o acesso é deste aplicativo;
2. guarda os tokens do aplicativo **criptografados** no banco (o motor trabalha sem ninguém logado);
3. liga os eventos de negócios (`ONCRMDEALADD`, `ONCRMDEALUPDATE`, `ONCRMDEALDELETE`);
4. carrega as regras de `tenants/<domínio>.json` e grava o catálogo de pipelines;
5. registra o bot "Assistente ProjacSeg" pela API de chatbots 2.0 (`imbot.v2`), com eventos em modo
   webhook — se falhar, a instalação continua sem o assistente;
6. dispara a primeira sincronização completa do CRM.

## 6. Roteiro de teste

1. Abra **Minha Jornada** no menu: sua foto, seu nome e **seus negócios reais** devem aparecer, com o
   aviso "Dados do Bitrix24 … atualizado às HH:MM".
2. Mova um negócio para uma etapa que tenha regra: em até alguns segundos ele aparece com prazo.
3. Clique em **Abrir**: abre o card do negócio no Bitrix24.
4. Para ver risco/atraso/escalonamento rapidamente, crie uma regra de teste com prazo curto
   (ex.: `{ "amount": 5, "unit": "minutes" }`, `riskAtRatio: 0.5`) e reinstale.
5. Confira as mensagens do bot no chat: alerta, atraso e o aviso ao superior (o chefe do departamento
   do responsável no organograma do Bitrix24).
6. Escreva ao bot no chat privado: sem IA ligada, ele avisa que a IA não está ativada. Num grupo,
   mencionado, ele pede para conversar no privado.
7. Mude uma regra para `"mode": "shadow"` e reinstale: as ocorrências continuam no dashboard e no
   histórico (`notification_suppressed`), sem mensagens.

## Modo piloto (portal real, poucos usuários)

Para testar num portal com dados reais sem afetar os demais colaboradores, defina no arquivo da empresa:

```json
{ "pilot": { "userIds": ["13"] }, "digestTime": null, "aiEnabled": false, "rules": [] }
```

O software garante: CRM lido só com filtro pelo responsável do piloto; mensagens só para usuários do
piloto (escalonamento a chefes fora dele fica no histórico, sem envio); no chat e no aplicativo, quem
está fora do piloto vê só "em fase de testes", sem dados; bot oculto nas listas do messenger. Remova
`pilot` e reinstale para liberar a todos — **só com autorização**.

## Página inicial do colaborador

O acesso recomendado é nativo, sem código: fixar **Minha Jornada** no menu lateral e defini-lo como
**página inicial** (no piloto, só na conta do usuário do piloto; na implantação, verificar com o
administrador se o menu permite aplicar para todos). Um widget na página inicial Vibe
(`landing.repowidget.register`) foi avaliado e adiado: visual mais limitado que o aplicativo, sem ganho
de acesso (decisão D-044).

## 7. Ligar a IA no chat (opcional)

1. Decida sobre LGPD (ver docs/SECURITY.md): por padrão, os **títulos dos negócios não saem do
   servidor** (`AI_REDACT_CLIENT_NAMES=true`).
2. No `.env`: `AI_PROVIDER=anthropic` e `ANTHROPIC_API_KEY=...` (ou `ant auth login` no servidor).
3. Em `tenants/<domínio>.json`: `"aiEnabled": true` e reinstale.
4. Pergunte ao bot "o que faço primeiro hoje?". A resposta usa os dados do motor; a IA não altera
   prazos nem escalonamentos.

## Quando a URL mudar

O túnel rápido pode cair e voltar com outro endereço (aconteceu em 17/11/2026). Para testes longos, use um
túnel nomeado (endereço fixo, conta Cloudflare) ou um servidor com domínio próprio.

Com túnel rápido, a URL muda a cada execução: atualize os caminhos no aplicativo local e use
**Reinstalar** (o bot e os eventos passam a apontar para a URL nova).

## Problemas comuns

| Sintoma                                                | Causa provável                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Tela em branco no Bitrix24                             | Domínio fora de `BITRIX24_ALLOWED_DOMAINS` (iframe bloqueado) ou servidor/túnel parado         |
| "Ambiente demonstrativo" dentro do portal              | A página não recebeu `DOMAIN`/`APP_SID` ou a BX24 JS SDK não carregou                          |
| "Portal ainda não foi instalado no servidor"           | Instalação não concluída no backend: veja o log de `pnpm portal` e reinstale                   |
| Nenhum prazo aparece                                   | Sem regras para a etapa: confira `tenants/<domínio>.json` e o catálogo                         |
| Nenhum escalonamento                                   | Responsável sem departamento/chefe no organograma (o log registra `escalation_target_missing`) |
| Motor para depois de ~1 h                              | `BITRIX24_CLIENT_ID`/`SECRET` ausentes: o token não é renovado                                 |
| "Reinstalar" não abre nada                             | Normal: a reinstalação veio pelo servidor do Bitrix24. Abra `/marketplace/app/<ID>/`           |
| "Em fase de testes" dentro do portal                   | Usuário fora de `pilot.userIds`                                                                |
| Log "Chamada do Bitrix24 sem autenticação reconhecida" | Formato de chamada novo: o log lista só os nomes dos campos recebidos                          |

## Segurança

- Eventos só dos domínios autorizados; respostas só para `https://<domínio>/rest/`; `application_token`
  conferido.
- O `AUTH_ID` que o Bitrix24 envia ao abrir o app é validado no portal e **não** chega ao navegador; o
  navegador recebe uma sessão assinada do Workspace (8 h).
- Tokens do aplicativo criptografados (AES-256-GCM) no banco.
- O túnel expõe esta máquina na internet: encerre-o ao terminar os testes.
