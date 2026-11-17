# Questionário de homologação das automações (ProjacSeg)

Perguntas que só a ProjacSeg pode responder, derivadas da análise de 16/11/2026
([BITRIX24_AUTOMATIONS.md](../../BITRIX24_AUTOMATIONS.md)). Complementa o questionário geral enviado
em documento compartilhado (ficha das regras, calendário, campos, organograma, IA/LGPD, piloto).
Referências `Rxx` = [catálogo de regras](CATALOGO_REGRAS.md).

## 1. Contagens e escopo

1. O levantamento falava em 26 regras; a análise encontrou 24 combinações distintas (cerca de 19 por
   finalidade). Podem enviar a lista das 26 para compararmos regra a regra?
2. As 18 tarefas do ramo "Homologação = SIM" (Demais Ramos › Transmissão) são só de teste? Devem ser
   ignoradas?
3. Confirmar a etapa de `bp-47` e `bp-285` (Perdidos do Demais Ramos? Prospecção do Automóvel?).
4. O pipeline Benefícios/Saúde entra no projeto? Se sim, exportar os modelos dele.
5. Exportar também os fluxos iniciados pelas automações: modelos `611`, `625` e `789`.

## 2. Tarefas recriadas em laço

6. Hoje 24 robôs recriam a tarefa a cada conclusão enquanto o negócio não avança (ex.: "Negociação" a
   cada 2 ou 5 dias úteis; "Enviar cotação" a cada dia útil). A intenção é cobrar o colaborador
   continuamente? O Workspace propõe **uma pendência por etapa**, com risco, atraso e escalonamento.
   Pode substituir a recriação?
7. Tarefas de "Preencha o campo…" (R13, R16, R17) e "Cadastro no Teleport" (R21) repetem a cada 1 h
   ou 30 min até o campo ser preenchido. Podem virar alerta único com prazo, em vez de tarefa?

## 3. Prazos inconsistentes

8. Emissão no Automóvel (R09/R10): tarefa em 12/15 dias **corridos**, controle ao superior em 16 dias
   **úteis**. Qual vale?
9. Boleto (R23/R24): 3 dias úteis para PF e 30 minutos para PJ. Correto?
10. Acompanhamento de emissão no Demais Ramos (R19/R20): 15 dias úteis com boleto e 3 com outras formas
    de pagamento (PJ). Correto?
11. Renovações: contato 10 (Automóvel) ou 15 (Demais Ramos) dias úteis antes do início de vigência.
    Manter a diferença?

## 4. Responsáveis e escalonamento

12. Quem é o responsável fixo das tarefas de emissão (`USR-07`)? É um papel ("setor de emissão")?
13. No Demais Ramos o escalonamento vai para dois usuários fixos (`USR-04`, depois `USR-05`), e no
    Automóvel para o superior do responsável. Unificar pelo organograma?
14. Quem é o usuário fixo avisado em 4 e 11 dias no Processo pendente (`USR-03`) e o de renovações em
    Cotação enviada (`USR-06`)? São papéis de gestão?
15. Os avisos a cada 24 h ao responsável e ao superior (Automóvel › cotação) devem continuar
    diários, ou um aviso por nível de atraso basta?

## 5. Encerramento e exceções

16. Além de mudar de etapa, alguma tarefa deve encerrar quando um campo é preenchido (número do cálculo,
    tipo de seguro)?
17. "Proposta pendente" (R18) está num laço chamado "Enquanto Etapa = Processo Perdido". O título está
    certo ou é herança de cópia?
18. Há casos em que o prazo pode ser suspenso (ex.: aguardando seguradora)? Quem autoriza? (Aguardar
    terceiros não suspende prazo automaticamente sem regra homologada.)

## 6. Convivência durante a homologação

19. Concordam com o **modo sombra**: o Workspace calcula e mostra prazos, mas não envia avisos que
    dupliquem os robôs atuais até a homologação?
20. Quem aprova o desligamento de cada automação antiga, e em que ordem?
