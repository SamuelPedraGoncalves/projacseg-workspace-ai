# WorkSeg AI — desenho do produto

Data: 19/11/2026 · Status: **aguardando aprovação do Samuel** (revisado por leitor independente) ·
Nada aqui está implementado.

Base: conversa de 18–19/11/2026 e as 9 telas enviadas pelo Samuel (`Corretora.zip`). O que foi dito
por ele aparece como decisão; o que é escolha minha aparece marcado como **[minha escolha]**, para ele
conferir.

## 1. Intenção

O Workspace deixa de ser um sistema feito para a ProjacSeg e vira um produto para **qualquer corretora
de seguros que usa o Bitrix24**: o **WorkSeg AI**.

Hoje as corretoras controlam o trabalho comercial com dezenas de robôs que criam tarefas no Bitrix24
(na ProjacSeg, 75 robôs, 24 deles recriando a tarefa em laço). O comercial se afoga em tarefas e o
supervisor não sabe o que está atrasado. O WorkSeg substitui essas tarefas: **a corretora escreve as
regras do seu negócio em português, a IA traduz cada regra para uma regra estruturada que a pessoa
confere, o motor determinístico dispara os lembretes na hora certa, e a IA usa cada regra como
ferramenta** para dizer ao comercial o que está pendente e sugerir a mensagem ao cliente.

A experiência da ProjacSeg é a base das regras sugeridas e continua sendo a corretora de testes.

O produto vai, mais tarde, aparecer também como uma aba dentro do Connectex (app da TechStone na loja
do Bitrix24 que integra Bitrix24 e Teleporte); clientes do Connectex terão um diferencial. **Primeiro se
constrói o WorkSeg sozinho.**

## 2. Objetivos, não objetivos e antiobjetivos

### Objetivos da primeira versão

1. Funcionar em qualquer portal Bitrix24 de corretora, sem código ou arquivo específico por empresa.
2. Primeiro acesso guiado: termos e LGPD → quem pode criar regras → mapeamento dos campos → regras.
3. Regras de **Seguros Novos** e **Renovações** escritas em texto livre, traduzidas pela IA e
   conferidas por quem as criou antes de valer.
4. **Meus Afazeres** e o chat do Bitrix24 substituindo as tarefas, conforme a preferência de cada
   usuário.
5. Escalonamento automático ao supervisor quando o afazer não é resolvido.
6. Supervisor com **Ver como**: o painel do colaborador exatamente como ele vê.
7. Minha Jornada, Meus negócios, Assistente IA e Temas conforme as telas do Samuel.

### Não objetivos (ficam para depois)

- Regras de **Endossos, Sinistros e Pós-venda**: as abas existem com o selo **"Em breve"**, sem
  funcionalidade.
- **Cobrança**: teste de 7 dias, Asaas, preço (provavelmente por usuário) e desconto do Connectex.
- **Aba no Connectex.**
- Publicação na loja do Bitrix24 e produção em qualquer corretora. Os testes continuam no portal da
  ProjacSeg, restritos ao usuário 13 (modo piloto), sem autorização para produção.

### Antiobjetivos (seria um fracasso mesmo funcionando)

- A IA decidir prazo, horário ou escalonamento. Ela só traduz texto em regra; quem calcula é o motor.
- Uma regra valer sem que a pessoa que a criou tenha conferido a tradução.
- Criar burocracia para o comercial: mais cliques que as tarefas que estamos substituindo.
- Enviar dados da corretora à IA antes do aceite dos termos.
- Alterar ou desligar automações do Bitrix24, ou alterar a estrutura da empresa no Bitrix24.
- Uma resposta fixa parecer produzida por uma IA conectada.

## 3. Restrições que continuam valendo

Todas as regras de `CLAUDE.md`, `docs/BUSINESS_RULES.md` e `docs/SECURITY.md`, em especial:

- Motor determinístico, funciona sem IA; IA não calcula prazos.
- Tudo escopado por `tenantId`; nenhum ID de usuário, funil, etapa ou campo fixo no código.
- Autorização aplicada pelo servidor, nunca pelo prompt.
- Histórico auditável (somente inserção) de regras, afazeres e escalonamentos.
- Sem tokens no frontend, sem credenciais no Git, sem dados reais de segurados no repositório.
- Não mexer em automações do Bitrix24; nada de produção sem autorização.
- Manter a arquitetura atual (monorepo, `packages/engine`, `apps/api` Fastify/Prisma, `apps/web`
  React). O desenho abaixo estende o que existe; não reinicia o projeto.

### Mudança numa regra de negócio existente

`BUSINESS_RULES.md` diz hoje que a ocorrência só é resolvida quando o negócio sai da etapa e que o
comercial não pode impedir o escalonamento. O Samuel decidiu que **o comercial pode marcar um afazer
como feito**, e isso o encerra. Fica assim:

- Afazer encerra quando o card muda de etapa **ou** o comercial marca como feito (com registro de
  quem e quando).
- Se nenhum dos dois acontecer até o prazo, o supervisor é avisado automaticamente.
- O comercial continua sem poder cancelar, adiar ou desfazer um escalonamento que já saiu.

`BUSINESS_RULES.md` e `DECISIONS.md` precisam registrar essa mudança quando for implementada.

## 4. Papéis

| Papel | Quem é | O que pode |
| --- | --- | --- |
| Administrador | Quem instalou o app (gravado na instalação). **[minha escolha]** Se ele sair da empresa, um administrador do portal Bitrix24 pode assumir | Tudo, inclusive escolher quem cria regras |
| Criador de regras | Escolhidos pelo administrador na tela de boas-vindas (ou depois, em Configurações) | Ver Configurações, criar, editar e excluir regras, ajustar mapeamento, horário e estrutura |
| Supervisor | Chefe de departamento na estrutura da empresa | Recebe escalonamentos da equipe; usa "Ver como" com quem está abaixo dele |
| Comercial | Qualquer usuário do portal com acesso ao app | Minha Jornada, Meus Afazeres, Meus negócios, Assistente, Temas, preferências pessoais |

- A aba **Configurações** só aparece para administrador e criadores de regras, e a API recusa as rotas
  de configuração para os demais (autorização no servidor).
- **[minha escolha]** "Ver como" alcança quem está abaixo do supervisor na estrutura, incluindo
  subdepartamentos. Administrador e criadores de regras podem ver qualquer pessoa.
- **[minha escolha]** "Ver como" é somente leitura (não marca feito, não conversa como o outro), com
  faixa no topo dizendo de quem é o painel; cada uso fica registrado. É a evolução do modo observação
  atual (D-054), que hoje depende de configuração manual.
- **[minha escolha]** Se o supervisor também tem negócios, o painel dele mostra os dele normalmente.

## 5. Primeiro acesso

1. **Termos de uso, política de privacidade e LGPD.** Obrigatória no primeiro acesso de quem instalou;
   sem aceite, nada mais abre e nenhum dado vai à IA. O aceite é gravado (quem, quando, versão do
   texto). **[minha escolha]** Os demais usuários veem um aviso curto de privacidade no primeiro acesso
   deles, sem precisar aceitar o contrato da empresa. O texto jurídico é da TechStone; o sistema só
   exibe a versão vigente. **Ainda não existe** (decisão do Samuel, 19/11): a primeira versão usa um
   texto provisório, com a marca "versão provisória" visível na tela e no registro do aceite, a ser
   trocado pelo definitivo antes de qualquer corretora fora do piloto. **[minha escolha]** O texto diz
   que os dados são processados por IA de terceiro (Anthropic), e o aceite é o que libera a IA para a
   corretora; na ProjacSeg vale a autorização já dada para o usuário 13.
2. **Boas-vindas** (tela 9): "Bem-vindo ao WorkSeg AI". Seleção de usuários que podem criar regras;
   sem seleção, só o administrador.
3. **Mapeamento dos campos** (ver seção 6).
4. **Regras** (seção 7). **[minha escolha]** Para não começar do zero, a tela oferece regras sugeridas,
   tiradas da experiência da ProjacSeg (sem nada que identifique a ProjacSeg), que passam pela mesma
   conferência antes de valer.

## 6. Dados que vêm do Bitrix24

### Mapeamento (feito uma vez, editável em Configurações)

A IA sugere a partir da lista de campos do negócio (`crm.deal.fields`) e dos funis e etapas; a pessoa
confere e salva. Pede só o que Seguros Novos e Renovações usam:

- **Funis** em que o WorkSeg trabalha.
- **Tipo do seguro**: o campo personalizado e quais valores são Seguro Novo e quais são Renovação
  (pode haver vários, ex.: "Renovação própria" e "Renovação de outra corretora").
- **Ramo**: o campo; os valores dele são as opções de ramo nas regras e nos filtros.
- **Vigência**, **CPF** e **número do cálculo**: os campos usados em Meus negócios e nas regras.

As etapas não entram no mapeamento: quando uma regra cita uma etapa pelo nome, a IA acha a etapa na
conferência da regra. Se um campo não existir no portal, a funcionalidade que depende dele fica
desligada e o app diz qual.

**[minha escolha]** O mapeamento já prevê, sem implementar, que endossos, sinistros e pós-venda
poderão vir de funil próprio ou de valor do tipo do seguro, conforme a corretora.

### Calendário da empresa

Lido do Bitrix24 com `calendar.settings.get` (escopo `calendar`): início e fim do expediente, dias de
folga da semana, feriados do ano e dias úteis extras. Sem dados cadastrados, vale segunda a sexta e
início às 8h. Ajustável em Configurações. (Conferido na documentação oficial; ainda não testado num
portal.)

### Estrutura da empresa (tela 8)

Lida do Bitrix24 com `department.get` (escopo `department`): departamentos, hierarquia e chefe de cada
um. O supervisor de um comercial é o chefe do departamento dele (o `HierarchyResolver` atual já faz
isso). **[minha escolha]** Sem chefe cadastrado em nenhum nível acima, o aviso vai ao administrador.

Quando a leitura funciona, o botão **Atualizar estrutura da empresa** leva à própria estrutura da
empresa no Bitrix24 (é lá que se atualiza) e o WorkSeg relê na próxima sincronização. A estrutura
local é **só plano B**, para portal em que `department.get` falhe ou não devolva departamentos: montar
a estrutura na própria tela, no mesmo layout do Bitrix24, com um aviso antes de salvar dizendo que
**isso não altera a estrutura da empresa no Bitrix24**. Existindo estrutura local, ela é usada no lugar
da leitura.

O app precisa dos escopos novos `calendar` e `department`, o que exige reinstalar o app no portal.

## 7. Regras

### Tela (tela 7)

Configurações → **Definir regras de negócio**. Abas por situação: **Seguros Novos**, **Renovações**,
**Endossos**, **Sinistros** e **Pós-venda** (as três últimas com "Em breve"). Cada regra tem:

- nome;
- ramos em que vale (todos ou alguns, a partir do mapeamento);
- detalhes em texto livre.

Abaixo, "Regras criadas" com busca e, em cada regra: nome, criada em/por, ramos, detalhes, **Editar** e
**Excluir**. (A tela 7 mostra "Renovações" duas vezes; trato como as cinco situações acima.)

### Ciclo de uma regra

1. **Escrever** o texto e clicar em salvar.
2. **Traduzir**: a IA transforma o texto numa regra estruturada (situação, ramos, etapas em que vale,
   prazo ou intervalo, horário do lembrete, quem recebe, o que o lembrete mostra, quem avisar se
   ninguém agir).
3. **Conferir**, na hora, por quem criou a regra (rascunho em `.superpowers/brainstorm/.../regra-conferencia.html`):
   - a IA mostra "entendi assim" em linguagem simples, não em JSON;
   - quando o texto é ambíguo, a IA **pergunta** antes de salvar. Exemplo obrigatório: "48 horas"
     conta em horas corridas ou em dias úteis?;
   - se o texto não diz quem avisar quando ninguém agir, a conferência destaca isso e sugere **o
     supervisor** como padrão; a pessoa pode trocar;
   - a pessoa confirma ou volta para corrigir o texto.
4. **Valer**: só depois da confirmação. A regra estruturada é validada pelo servidor (esquema do motor)
   antes de gravar; se a IA produzir algo inválido, nada é salvo e a pessoa é avisada.
5. **Editar** passa pelo mesmo ciclo; a versão anterior continua valendo até a nova ser confirmada.
6. **Excluir** desliga a regra; os afazeres abertos dela são encerrados com motivo "regra excluída".

Cada versão de regra fica no histórico: texto original, tradução, quem confirmou e quando.

Se a IA estiver indisponível, não dá para criar ou editar regras, mas as regras já confirmadas
continuam funcionando (o motor não depende da IA).

### O que o motor precisa ganhar

O esquema atual (`packages/engine/src/rules.ts`) já cobre etapas, condições por campo, prazo a partir
de uma data do negócio (vigência), ciclos que recomeçam e escalonamento. Faltam:

- **Situação e ramo** como condições sobre os campos mapeados (sem códigos de campo na regra
  escrita pelo usuário; o servidor resolve pelo mapeamento).
- **Repetição**: "a cada 48 horas enquanto estiver nas etapas X, Y, Z", contando a partir da entrada
  na etapa ou do último "feito".
- **Horário do lembrete**: hora programada pela regra ou, por padrão, o início do expediente.
- **Conclusão manual** ("feito") como forma de encerrar a ocorrência.
- **O que o lembrete mostra**: lista fechada de itens (nome do cliente, data de entrada no Bitrix24,
  vigência, ramo, etapa, último follow-up, sugestão de mensagem).

**[minha escolha]** Regras deixam de vir de `apps/api/tenants/<domínio>.json` e passam a ser criadas
pela interface e gravadas no banco (a tabela `Rule` já existe). O arquivo da ProjacSeg vira semente de
teste e fonte das regras sugeridas. O modo sombra (D-038) deixa de ser padrão para regras criadas pela
interface: a corretora que cria uma regra quer que ela valha. Para a ProjacSeg, onde os robôs do
Bitrix24 continuam ligados, o modo piloto (usuário 13) segue limitando quem recebe.

## 8. Afazeres e notificações

### Meus Afazeres (nova aba)

Rascunho em `.superpowers/brainstorm/.../meus-afazeres.html`. No menu, abaixo de Minha Jornada, com o
número de pendentes. Separado em **Hoje**, **Atrasados** e **Próximos dias**. Cada afazer mostra a
regra, o cliente, o ramo, a situação do card e os itens que a regra pediu; quando pedido, a sugestão
de mensagem com botão **Copiar**; e **Abrir negócio** (abre o card no Bitrix24). Botão **Feito**.

Supervisores têm uma seção **Atrasos da equipe**, que esvazia quando o comercial resolve.
**[minha escolha]**

### Quando um afazer sai

- O card muda de etapa (percebido pela sincronização com o Bitrix24), ou
- o comercial marca como feito.

Atividades registradas no Bitrix24 (ligação, e-mail, comentário) **não** contam como feito: só o botão
ou a mudança de etapa (decisão do Samuel, 19/11). Isso substitui, nas regras criadas pela interface, o
recomeço por atividade de D-047; o "último follow-up" mostrado no afazer é o último "feito".

Se nada disso acontecer até o prazo, o supervisor é avisado. **[minha escolha]** O prazo é o da
própria regra (ex.: o dia do contato na renovação); para lembretes que se repetem sem prazo explícito,
o fim do expediente do dia em que o lembrete caiu. Numa regra que se repete, "feito" encerra só aquele
lembrete; o próximo vem depois do intervalo, enquanto o card seguir nas etapas da regra.

### Onde chega

Cada usuário escolhe, para si: **só em Meus Afazeres**, **em Meus Afazeres e no chat do Bitrix24**, ou
**só no chat**. O chat é o bot que já existe (`imbot.v2`). **[minha escolha]** Padrão: os dois. A
escolha fica numa área pessoal (menu do avatar), porque Configurações é só para criadores de regras. O
supervisor recebe escalonamentos seguindo a escolha dele.

## 9. Telas (as do Samuel, telas 1 a 6)

Identidade: "WorkSeg AI". **[minha escolha]** No lugar de "CORRETORA", o nome da empresa do portal,
editável em Configurações. Os nomes internos do código (`@projacseg/*`) não mudam agora.

- **Minha Jornada** (tela 1): saudação; card do assistente com uma observação sobre a carteira (ex.:
  "46 seguros novos em negociação, alguns parados há mais de 15 dias") e o botão **Conversar com meu
  assistente**; quatro números com **Ver negócios** (renovações em andamento, seguros novos em
  andamento, renovações convertidas, seguros novos convertidos); gráfico mensal empilhado de
  renovações, seguros novos e perdas. **[minha escolha]** O texto do card é montado pelo servidor a
  partir dos números (não é resposta de IA); "convertido" é negócio ganho e "perda" é negócio perdido,
  pela semântica das etapas do Bitrix24; o gráfico cobre os últimos 12 meses.
- **Meus negócios** (telas 2 a 4): abas Renovações e Seguros Novos; colunas cliente, início de vigência
  (Renovações) ou data de entrada (Seguros Novos), ramo, status e **Ver negócio**. Busca por **nome,
  CPF e número do cálculo**. **Filtrar por** abre um painel com período, ramo, status e etapa, no mesmo
  visual. **[minha escolha]** O status é só informativo (não muda a etapa do card).
- **Assistente IA** (tela 5): o chat como hoje.
- **Temas** (tela 6): o que já existe, mais a escolha das **3 cores do gráfico** de Minha Jornada.
- **Configurações** (telas 7 e 8): Definir regras de negócio; Atualizar estrutura da empresa; e
  **[minha escolha]** Mapeamento, Calendário e Usuários que criam regras.

## 10. A IA

- Modelo e cuidados de D-028 continuam (Claude, provedor desacoplado, títulos dos negócios trocados
  por "Negócio #ID" antes de sair do servidor).
- **Tradução de regra**: a IA recebe o texto, o mapeamento (nomes de funis, etapas, valores de ramo) e
  devolve uma regra estruturada por ferramenta com esquema fixo; o servidor valida.
- **Cada regra confirmada vira uma ferramenta** do assistente, com o nome da regra, que devolve os
  afazeres pendentes daquela regra para o usuário (ou para quem ele pode ver) e os dados de que a
  sugestão de mensagem precisa. A ferramenta é só leitura; autorização no servidor.
- **Sugestão de mensagem**: **[minha escolha]** a IA escreve o texto com marcadores (`{cliente}`), e o
  servidor coloca o nome do cliente; assim o nome não vai para a IA.
- Sem aceite dos termos, nenhuma chamada à IA para aquela corretora.
- As ações pelo chat que já existem (mover etapa, preencher campo, descartar com motivo, sempre com
  confirmação — D-049, D-051) continuam.

### Destinatários que uma regra pode citar

**[minha escolha]** O responsável do card, o supervisor (chefe do departamento) ou uma pessoa
específica do portal, escolhida na conferência. Um nível de escalonamento por padrão; se o texto
pedir ("se continuar, avisar o gerente"), o nível acima na estrutura. Os `roles` do arquivo atual
deixam de existir para regras criadas pela interface.

### Configurações por empresa que hoje estão no arquivo

**[minha escolha]**
- Ações do assistente pelo chat: as etapas permitidas são as dos funis mapeados; o descarte usa a
  etapa de perda do funil e um campo de motivo de perda, que entra no mapeamento como opcional (sem
  ele, o chat não propõe descarte). Os campos que o chat pode preencher ficam desligados para novas
  corretoras até alguém pedir.
- Horário do resumo diário: o início do expediente.
- Modo piloto: continua existindo como configuração interna da TechStone, fora da interface.

## 11. Ponto de entrada da cobrança

**[minha escolha]** Um único ponto no servidor diz se a corretora está liberada. Na primeira versão
responde sempre "sim". É onde o teste de 7 dias e a assinatura (Asaas, provavelmente por usuário) vão
entrar depois, sem mexer no resto.

## 12. Deixado para quem construir

- Ordem das entregas e divisão em etapas.
- Formato exato das tabelas novas (aceite de termos, papéis, preferências, versões de regra, afazer
  marcado como feito) e das rotas.
- Texto dos prompts de tradução e sugestão, desde que a saída seja validada pelo esquema do motor.
- Biblioteca do gráfico e detalhes visuais, desde que mantenham o layout das telas do Samuel e o
  sistema de temas.
- Como sincronizar negócios fechados para os números e o gráfico de Minha Jornada.

## 13. Testes na ProjacSeg

**[minha escolha]**
- **Transição:** as 11 regras do arquivo atual são desligadas (não apagadas); ocorrências e histórico
  ficam. As rotinas da ProjacSeg voltam como regras sugeridas e passam pelo fluxo novo. Nada roda em
  paralelo, para não duplicar lembretes ao usuário 13.
- **Piloto:** o usuário 13 faz o papel de administrador e de supervisor do usuário 51 (que ele já
  observa). Nenhuma mensagem sai para quem está fora do piloto: escalonamentos que iriam ao supervisor
  real do 51 vão ao 13, marcados como teste.
- **Reinstalação** com os escopos novos: feita pelo Samuel no portal, como das outras vezes.
- **Telas de referência:** `Corretora.zip` do Samuel (fora do repositório).

## 14. Como saberemos que deu certo

No portal da ProjacSeg, com o usuário 13:

1. Instalar do zero passa por termos → boas-vindas → mapeamento → regras, sem editar arquivo.
2. A regra de follow-up da tela 7, escrita em texto livre, é traduzida, a IA pergunta sobre horas
   corridas ou dias úteis, a pessoa confirma, e os lembretes aparecem em Meus Afazeres e no chat no
   horário certo.
3. Mover o card ou marcar feito tira o afazer; não fazer nada avisa o supervisor.
4. O supervisor usa "Ver como" e vê o painel do usuário 51 igual ao dele.
5. Perguntar ao assistente "quem está pendente no follow-up de seguros novos?" usa a ferramenta da
   regra e devolve a lista com sugestões de mensagem.
