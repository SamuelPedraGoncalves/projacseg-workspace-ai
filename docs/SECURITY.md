# Segurança

## Regras

- **Nenhum token ou segredo no frontend.** Tudo com prefixo `VITE_` é público; hoje só o usuário
  demonstrativo usa essas variáveis.
- **Nenhuma credencial no Git.** `.env` e variantes estão no `.gitignore`; use os `.env.example`
  (`apps/web/.env.example`, `apps/api/.env.example`).
- **Nenhum dado real de segurados** em código, testes, fixtures ou capturas de tela.
- **Nenhuma alteração em automações do Bitrix24**, nenhum acesso ao portal de produção sem autorização.
- **Nenhuma chamada externa desnecessária**: a fonte Poppins é servida localmente; a BX24 JS SDK
  (`api.bitrix24.com`) só é baixada quando a página está aberta dentro de um portal Bitrix24.
- **BX24 JS SDK**: a aplicação nunca chama `BX24.getAuth()` nem lê, guarda ou envia o token do
  iframe; chamadas usam `BX24.callMethod`, com as permissões do usuário logado.
- **Caminhos do CRM**: `dealPath` só aceita IDs numéricos antes de chamar `BX24.openPath`.
- **Nenhum deploy em produção sem autorização.**

## Isolamento entre colaboradores e empresas

- Preferências (como o tema) são escopadas por `tenantId` + `bitrixUserId`.
- No backend, a identidade virá da sessão autenticada (OAuth Bitrix24), nunca de parâmetros enviados
  pelo navegador. Por isso ainda **não** existe rota HTTP de preferência de tema.
- Testes garantem que salvar ou restaurar o tema de um colaborador não altera o de outro.

## Entrada de dados

- Cores digitadas são normalizadas e validadas (`#RRGGBB`) antes de aplicar ou salvar; valores
  inválidos no `localStorage` são descartados.
- O chat demonstrativo renderiza texto puro (React escapa o conteúdo); não há HTML dinâmico.
- Configuração da API validada com Zod na inicialização.

## Cadeia de suprimentos

- O pnpm 12 aplica política de idade mínima de versões; exceções registradas em
  `pnpm-workspace.yaml` (`minimumReleaseAgeExclude`) foram adicionadas automaticamente pelo pnpm na
  instalação.
- Scripts de instalação bloqueados por padrão; apenas `esbuild` foi aprovado (`pnpm approve-builds`).

## Aplicativo no portal de testes

- Eventos do bot aceitos só de `BITRIX24_ALLOWED_DOMAINS`; resposta só para `https://<domínio>/rest/`
  (impede usar o servidor para chamar outros endereços).
- `application_token` memorizado no primeiro evento de cada portal (em memória até o banco existir)
  ou fixado por `BITRIX24_APPLICATION_TOKEN`.
- O corpo do `POST` do Bitrix24 no handler (com `AUTH_ID`) é ignorado e nunca devolvido nem registrado.
- Iframe liberado só para os portais autorizados (`frame-ancestors`).
- Túnel de testes expõe a máquina na internet: encerrar ao fim dos testes.

## Motor, banco e IA

- Tokens OAuth do aplicativo: AES-256-GCM com `TOKEN_ENCRYPTION_KEY` (obrigatória com banco).
- Sessão do Workspace: HMAC-SHA256 com `SESSION_SECRET` (obrigatório em produção), 8 h; a API só
  devolve os negócios do próprio colaborador (histórico: dono ou admin).
- Instalação exige administrador do portal e, com `BITRIX24_CLIENT_ID`, que o acesso seja deste app.
- Histórico de ocorrências é somente inserção; a aplicação não expõe edição nem exclusão.
- IA desligada por padrão. Quando ligada, recebe só a projeção do motor e, por padrão, sem nomes de
  segurados (`AI_REDACT_CLIENT_NAMES=true`). **Pendente:** decisão de LGPD (base legal e contrato de
  tratamento de dados com o provedor) antes de enviar qualquer dado pessoal.
- O conteúdo enviado à IA é delimitado e tratado como dado, não instrução.

## Pendências

- Política de retenção e criptografia dos tokens OAuth.
- Verificação de contraste WCAG por componente para temas personalizados.
- Cabeçalhos de segurança no deploy: CSP liberando `api.bitrix24.com` (script), o domínio do portal
  (imagens de perfil) e `frame-ancestors` restrito aos portais autorizados; HSTS.
