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
> de exemplo apenas para testar (ver passo 3).

## Pré-requisitos

- Portal Bitrix24 de testes e usuário **administrador**.
- Node.js 22+ e pnpm 12.
- PostgreSQL: `pnpm db:up` (Docker) ou um banco gerenciado. Sem banco, a API roda em memória e perde
  tudo ao reiniciar — serve só para um teste rápido.
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

Em outro terminal, inicie o túnel. Confira `https://<url-pública>/health`: deve mostrar
`"database": "postgresql"` e `"bitrix24": "configured"`.

## 5. Instalar

Abra o aplicativo no portal (ou **Reinstalar**). A instalação:

1. valida que quem instala é administrador e que o acesso é deste aplicativo;
2. guarda os tokens do aplicativo **criptografados** no banco (o motor trabalha sem ninguém logado);
3. liga os eventos de negócios (`ONCRMDEALADD`, `ONCRMDEALUPDATE`, `ONCRMDEALDELETE`);
4. carrega as regras de `tenants/<domínio>.json` e grava o catálogo de pipelines;
5. registra o bot "Assistente ProjacSeg" e conclui a instalação;
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
6. Escreva ao bot: sem IA ligada, ele avisa que a IA não está ativada.

## 7. Ligar a IA no chat (opcional)

1. Decida sobre LGPD (ver docs/SECURITY.md): por padrão, os **títulos dos negócios não saem do
   servidor** (`AI_REDACT_CLIENT_NAMES=true`).
2. No `.env`: `AI_PROVIDER=anthropic` e `ANTHROPIC_API_KEY=...` (ou `ant auth login` no servidor).
3. Em `tenants/<domínio>.json`: `"aiEnabled": true` e reinstale.
4. Pergunte ao bot "o que faço primeiro hoje?". A resposta usa os dados do motor; a IA não altera
   prazos nem escalonamentos.

## Quando a URL mudar

Com túnel rápido, a URL muda a cada execução: atualize os caminhos no aplicativo local e use
**Reinstalar** (o bot e os eventos passam a apontar para a URL nova).

## Problemas comuns

| Sintoma                                      | Causa provável                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tela em branco no Bitrix24                   | Domínio fora de `BITRIX24_ALLOWED_DOMAINS` (iframe bloqueado) ou servidor/túnel parado         |
| "Ambiente demonstrativo" dentro do portal    | A página não recebeu `DOMAIN`/`APP_SID` ou a BX24 JS SDK não carregou                          |
| "Portal ainda não foi instalado no servidor" | Instalação não concluída no backend: veja o log de `pnpm portal` e reinstale                   |
| Nenhum prazo aparece                         | Sem regras para a etapa: confira `tenants/<domínio>.json` e o catálogo                         |
| Nenhum escalonamento                         | Responsável sem departamento/chefe no organograma (o log registra `escalation_target_missing`) |
| Motor para depois de ~1 h                    | `BITRIX24_CLIENT_ID`/`SECRET` ausentes: o token não é renovado                                 |

## Segurança

- Eventos só dos domínios autorizados; respostas só para `https://<domínio>/rest/`; `application_token`
  conferido.
- O `AUTH_ID` que o Bitrix24 envia ao abrir o app é validado no portal e **não** chega ao navegador; o
  navegador recebe uma sessão assinada do Workspace (8 h).
- Tokens do aplicativo criptografados (AES-256-GCM) no banco.
- O túnel expõe esta máquina na internet: encerre-o ao terminar os testes.
