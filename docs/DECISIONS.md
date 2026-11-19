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

> **Atualizada por D-040 (17/11/2026):** o bot é localizado pelo backend com `imbot.v2.Bot.list`; o
> frontend recebe o diálogo de `/api/v1/assistant`. O código continua configurável e nunca há ID fixo.

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

> **Substituída por D-040 (17/11/2026):** com banco e tokens criptografados no servidor, o bot passou a
> ser registrado pelo backend com `imbot.v2` (a v1 está descontinuada).

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

## D-030 — Analisador de BPT seguro, testado e reprodutível

`tools/bitrix-automations` (pacote do workspace) lê `.bpt` sem executar nada: leitor de PHP
`serialize` que recusa objetos, referências e enums, sem protótipo, com limites de profundidade,
tamanho e descompressão. Os relatórios são gerados, nunca editados à mão.

## D-031 — Originais do cliente fora do Git; material versionado anonimizado

Exportações, lista de nomes a anonimizar e mapa de pseudônimos ficam em `data/private/` (ignorado).
O versionado usa `USR-xx` e `HOST-xx`, sem URLs, e-mails, telefones, documentos ou nomes.

## D-032 — Regras contadas de três formas

Configurações (75 habilitadas / 57 em produção), tarefas geradas em execução (maiores, por causa dos
laços) e regras consolidadas (24 estritas). O número 26 do levantamento fica como "a comparar" até
recebermos a lista original.

## D-033 — Migrar o bot para `imbot.v2`

A documentação oficial declara `imbot.*` (v1) descontinuado ("development halted") e recomenda
`imbot.v2` para desenvolvimento novo. O backend atual usa v1; a migração entra na próxima sprint.
O código lógico `projacseg_assistant` continua; o ID numérico nunca é fixo.

## D-034 — Hermes: avaliação antes de decisão

Pela documentação oficial, o Hermes gerenciado atende por padrão só o criador, com as permissões
dele, sem API para criar agentes e sem ferramentas próprias documentadas. Não é adotado como base até
uma PoC em portal de desenvolvimento. Recomendação preliminar: arquitetura híbrida
([HERMES_EVALUATION.md](HERMES_EVALUATION.md)).

## D-035 — MCP de documentação do Bitrix24 no escopo do projeto

`@bitrix24/mcp-docs` (oficial, sem chave) configurado em `.mcp.json`. O MCP operacional
(`@bitrix24/mcp-vibecode-api`) só com autorização, chave de portal de desenvolvimento e nunca em
produção.

## D-036 — Sem RAG por enquanto

A base de conhecimento é a documentação versionada e a busca textual. Banco vetorial só quando houver
necessidade comprovada.

## D-037 — Portal real nunca mostra conteúdo fictício

Dentro do Bitrix24, negócios demonstrativos não abrem card, o banner não exibe o resumo de
demonstração e o assistente distingue "não instalado" de "indisponível".

## D-038 — Modo sombra é o padrão das regras

Regra sem `mode` roda em sombra: calcula e mostra, registra `notification_suppressed`, não envia
mensagens (nem o resumo diário, se não houver regra ativa). Ativar é uma decisão explícita na
configuração, para não duplicar os avisos das automações atuais.

## D-039 — Condições e datas lidas só na abertura da ocorrência

Mudar um campo ou adiar a data de referência depois não encerra nem adia a ocorrência — senão bastaria
editar o negócio para escapar do prazo e do escalonamento. Saídas: mudar de etapa, fechar, cumprir
`completeWhen` ou a regra ser desativada na configuração. A validar com a ProjacSeg (questionário).

## D-040 — Bot registrado pelo servidor; navegador pergunta ao backend

O `imbot.v2` pertence ao aplicativo: registro e envio com os tokens do aplicativo, no servidor. O
frontend não chama mais a API de bots; recebe o diálogo do bot de `/api/v1/assistant`.

## D-041 — Assistente responde sobre negócios só no chat privado

Num grupo, responder com prioridades e prazos exporia a carteira de alguém a outras pessoas.

## D-042 — Papéis por empresa no lugar de usuários fixos

Responsáveis e destinatários de escalonamento por papel (`roles` em `tenants/<domínio>.json`). Papel
citado sem usuário impede o carregamento da configuração.

## D-043 — Modo piloto aplicado pelo software

Para testar no portal real da ProjacSeg com um único usuário, `pilot.userIds` restringe leitura do
CRM (filtro na própria consulta), mensagens, chat, aplicativo e API. Escalonamento a chefe fora do piloto
fica só no histórico. Bot oculto nas listas do messenger.

## D-044 — Página inicial: recurso nativo, sem widget por enquanto

A página inicial Vibe aceita widgets de aplicativos (`landing.repowidget.register`, Vue restrito, sem
JS próprio, resposta em até 5 s). Para o objetivo — o colaborador acessar fácil e usar sempre — o widget
não melhora o acesso e tem visual mais pobre que o aplicativo. Acesso pelo menu lateral + página
inicial nativa; o uso contínuo vem do bot (alertas e resumo) e da utilidade da lista.

## D-045 — Instalação aceita a notificação do servidor do Bitrix24

O portal chamou o caminho de instalação pelo servidor (`ONAPPINSTALL`, bloco `auth`), não pelo
navegador. Os dois formatos são aceitos, com as mesmas verificações (domínio autorizado, token do
próprio aplicativo conferido no portal, administrador).

## D-046 — Rotinas do secretário são regras configuradas, não código

Cada rotina (radar de vigência, cotação, follow-up, pendência, prospecção) é uma regra do motor no arquivo
da empresa. Isso mantém o produto reaproveitável em outros portais: pipelines, etapas, campos e prazos
mudam por configuração.

## D-047 — Follow-up recomeça com atividade real

Nas regras com `restartOn`, uma atividade registrada no negócio (`LAST_ACTIVITY_TIME`) conclui o ciclo e
abre o próximo. Diferente de editar uma data (D-039), registrar uma atividade é trabalho feito com o
cliente. A confirmar no modo sombra: se tarefas criadas por robôs também mudam `LAST_ACTIVITY_TIME`, o
follow-up seria reiniciado sem contato real.

## D-048 — Campos de data lidos como dia, não como horário

O Bitrix24 devolve campos do tipo data como meia-noite UTC (`2025-09-09T03:00:00+03:00`), que em
Brasília cairia no dia anterior. O leitor do CRM guarda só a data (`2025-09-09`) para campos que o
portal declara como `date`; campos `datetime` ficam com a hora.

## D-049 — A IA propõe, o servidor decide e o colaborador confirma

Mover etapa e preencher campo pelo chat: o modelo usa ferramentas só para propor; a autorização
(negócio do próprio colaborador, lista de etapas e campos, valor válido) é código, a confirmação é um SIM
explícito e tudo é registrado e comentado no card. A IA não altera prazos nem escalonamentos.

## D-050 — Banco local na porta 5544

O PostgreSQL local de testes (PGlite) usa a porta 5544 para não colidir com outros PostgreSQL da
máquina (havia um container de outro projeto em 5432).

## D-051 — Descartar pelo chat exige motivo

O descarte move o negócio para a etapa de perdido do funil e grava, junto, uma opção do campo de motivo
de perda. Sem motivo reconhecido, nada é proposto; a etapa de perdido não entra na lista comum de
etapas.

## D-052 — "Superior notificado" só quando o aviso saiu

O dashboard e o contexto da IA diziam "superior notificado" para qualquer escalonamento, inclusive os
só registrados (regra em sombra, modo piloto). Agora o rótulo diz "escalonamento registrado, superior
não avisado" nesses casos.

## D-053 — Formato próprio do chat e memória curta sem nomes

O messenger do Bitrix24 não renderiza Markdown; o assistente escreve com os códigos do chat ([B]) e o
servidor converte o que escapar. A conversa recente fica em memória do servidor por 30 minutos (no
máximo 10 mensagens), com os negócios só como "Negócio #id": os nomes de clientes continuam sem ir para
a IA. Reiniciar o servidor apaga essa memória.

## D-054 — Observação no piloto é só leitura e não fala com o observado

Para testar com uma carteira maior, um usuário do piloto pode observar outro colaborador
(`pilot.viewAs`). O CRM passa a ler os negócios dele, mas: as ações pelo chat ficam desligadas, os
alertas e o resumo vão para quem observa (marcados) e nada é enviado ao observado nem aos superiores
dele.

## D-055 — Termos provisórios; o aceite libera a IA

O WorkSeg mostra os termos de uso, privacidade e LGPD no primeiro acesso do administrador. Enquanto o
texto definitivo da TechStone não existe, a versão é provisória e marcada assim na tela e no registro
(`ConsentRecord`, somente inserção). O aceite da versão vigente é o que libera a IA para a corretora;
trocar a versão exige novo aceite.

## D-056 — Administrador é quem instalou; no piloto, os usuários do piloto

A autorização é calculada no servidor a cada pedido: administrador = `Tenant.installedByUserId`
(mantido nas reinstalações); no modo piloto, os usuários do piloto. Criadores de regras são escolhidos
pelo administrador (`TenantRole`). Um administrador do portal Bitrix24 pode assumir a administração
fora do piloto.

## D-057 — Mapeamento e situações na configuração da corretora

Funis, campo e valores do tipo do seguro, ramo, vigência, CPF, número do cálculo e motivo de perda
ficam em `TenantConfig` (`fieldMapping` só com códigos de campo; `situations` à parte). A sugestão
deste passo é por regras de texto sobre os rótulos, apresentada como "sugestão automática"; a sugestão
pela IA vem com a tradução de regras. Mapeamento confirmado na tela sobrevive à reinstalação.

## D-058 — Calendário do Bitrix24, salvo ajuste ou arquivo

O calendário útil vem de `calendar.settings.get` (expediente, folgas, feriados que se repetem). Um
calendário ajustado na tela ou declarado no arquivo da empresa prevalece e não é sobrescrito. Sem a
permissão `calendar`, a instalação continua com o calendário atual.
