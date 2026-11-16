# Instalação num portal Bitrix24 de testes

Roteiro para instalar o Workspace como **aplicativo local** num portal Bitrix24 **de testes**.
Não use o portal de produção da ProjacSeg sem autorização.

## O que vai funcionar

- Menu lateral do Bitrix24 abrindo o Workspace (dashboard Minha Jornada).
- **Foto e nome do usuário logado** no cabeçalho.
- **Conversar com assistente** / **Assistente IA** abrindo o chat do bot "Assistente ProjacSeg" no
  messenger do Bitrix24. O bot responde com uma mensagem fixa avisando que a IA **ainda não está
  conectada** — não há respostas simuladas.
- **Abrir** em negócios: os negócios da lista ainda são **fictícios**, então abrem o diálogo de detalhes
  (com o aviso "Negócio fictício: não existe no Bitrix24"). Quando a leitura do CRM entrar, negócios
  reais abrirão o card do Bitrix24 — o mecanismo já está pronto e testado.

## Pré-requisitos

- Portal Bitrix24 de testes e usuário **administrador**.
- Node.js 22+ e pnpm 12 nesta máquina.
- Um **endereço HTTPS público** apontando para esta máquina (o Bitrix24 na nuvem precisa alcançar o
  servidor). Para testes, um túnel resolve:
  - Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:3333`
  - ou ngrok: `ngrok http 3333`

  O túnel mostra uma URL como `https://algo.trycloudflare.com`. Túneis rápidos mudam de URL a cada
  execução — veja "Quando a URL mudar".

## 1. Configurar e subir o servidor

```bash
cp apps/api/.env.example apps/api/.env
```

Em `apps/api/.env`, informe o domínio do portal de testes:

```
BITRIX24_ALLOWED_DOMAINS=seu-portal-de-testes.bitrix24.com.br
```

Depois:

```bash
pnpm install
pnpm portal
```

`pnpm portal` gera o build e sobe a API em `http://127.0.0.1:3333`, servindo o Workspace. Em outro
terminal, inicie o túnel. Confira `https://<url-do-túnel>/health` — deve mostrar
`"bitrix24": "configured"`.

## 2. Criar o aplicativo local no Bitrix24

No portal: **Aplicativos → Recursos para desenvolvedores → Outros → Aplicativo local**
(os nomes podem variar um pouco conforme a versão e o idioma).

| Campo                            | Valor                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tipo                             | Aplicativo com interface (não marcar "usa apenas API")                                         |
| Caminho do manipulador (handler) | `https://<url-do-túnel>/`                                                                      |
| Caminho de instalação inicial    | `https://<url-do-túnel>/install`                                                               |
| Nome do item de menu             | `Minha Jornada`                                                                                |
| Permissões (escopos)             | **CRM** (`crm`), **Usuários** (`user`), **Chat e notificações** (`im`), **Chatbots** (`imbot`) |

Salve. O Bitrix24 mostra `client_id` e `client_secret`: **não** são necessários nesta etapa; se quiser
guardá-los, use apenas o `apps/api/.env` (nunca o Git).

## 3. Instalar

Abra o aplicativo (ou use **Reinstalar**). A página de instalação:

1. registra o bot **Assistente ProjacSeg** (`imbot.register`, código `projacseg_assistant`) apontando
   para `https://<url-do-túnel>/bitrix24/events/assistant`;
2. conclui a instalação (`BX24.installFinish`).

Se o registro do bot falhar (ex.: escopo `imbot` ausente), a página mostra o erro e o botão
**Concluir sem o assistente**.

## 4. Roteiro de teste

1. Abra **Minha Jornada** no menu esquerdo do Bitrix24.
2. Confira **sua foto** no círculo do canto superior direito e **seu nome** na saudação. Sem foto no
   perfil, aparecem as iniciais.
3. Clique em **Conversar com assistente**: deve abrir o chat do "Assistente ProjacSeg".
4. Escreva qualquer mensagem: o bot responde que a IA ainda está em implantação.
5. Clique em **Abrir** num negócio: abre o diálogo de detalhes com o aviso de negócio fictício.
6. Troque o tema e recarregue: a preferência é só sua (outro usuário do portal mantém o tema dele).

## Quando a URL mudar

Com túnel rápido, a URL muda a cada execução. Atualize os dois caminhos no aplicativo local e use
**Reinstalar**: a instalação atualiza o endereço de eventos do bot (`imbot.update`).

## Problemas comuns

| Sintoma                                              | Causa provável                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Tela em branco dentro do Bitrix24                    | `BITRIX24_ALLOWED_DOMAINS` sem o domínio do portal (o iframe é bloqueado) ou servidor/túnel parado         |
| Aparece "Ambiente demonstrativo" dentro do portal    | A página não recebeu `DOMAIN`/`APP_SID` na URL ou a BX24 JS SDK não carregou — veja o console do navegador |
| "O assistente ainda não está instalado neste portal" | Bot não registrado: confira o escopo `imbot` e reinstale                                                   |
| Bot não responde                                     | Eventos recusados (domínio fora da lista) ou túnel parado; veja o log do `pnpm portal`                     |

## Segurança

- O servidor só aceita eventos dos domínios em `BITRIX24_ALLOWED_DOMAINS` e só responde para
  `https://<domínio>/rest/`.
- O `application_token` do portal é memorizado no primeiro evento (fixe-o com
  `BITRIX24_APPLICATION_TOKEN` se preferir); eventos com outro token são recusados.
- Tokens recebidos nos eventos são usados só para a resposta e não são armazenados nem registrados.
- O túnel expõe esta máquina na internet enquanto estiver aberto: encerre-o ao terminar os testes.
