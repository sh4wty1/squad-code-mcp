# Design: segunda rodada de estados da TUI do squad

## Contexto
Continuo no mesmo `Squad TUI.dc.html`, que hoje tem os frames 01 a 21. Depois da primeira
rodada eu estressei a spec e testei com sessões reais, e isso criou estados que ainda não
têm desenho e mudou um que você já desenhou. Altere o mesmo arquivo: corrija os frames
que eu indicar e acrescente os novos, numerados a partir de 22.

Valem as mesmas regras de antes: o mesmo `Grid`, as mesmas funções de desenho, os mesmos
dados mock (`portal-89fm`, `player ao vivo com setlist`, TKT-12 a TKT-14, Q-05 a Q-09,
G-01), e cada frame novo como uma função que recebe o contexto e devolve um `Grid`.

## Restrições (as mesmas)
- Grid monospace de 120 colunas × 40 linhas
- Bordas só com `┌─┐│└┘├┤┬┴┼`
- 16 cores ANSI sobre fundo escuro; Mother magenta, Leader ciano, Workers verde, Judge
  amarelo, dev branco, erro vermelho
- Glifos: `● ○ ▶ ✓ ✗ ⟳ ⚠`, mais os que você introduziu na primeira rodada (`◌` e `≈`).
  Se precisar de outro, use um que ocupe uma célula e me diga qual
- Tudo por teclado

## O que mudou e vale para todos os frames
1. **A TUI agora escreve três coisas, não duas:** respostas a perguntas, decisões de gate
   e decisões de pedido de permissão. Corrija o texto da legenda (11) que diz que são duas.
2. **São nove kinds de mensagem.** Aos sete atuais somam-se `permission_request` e
   `permission_decision`. Dê cor aos dois e resolva a coluna de kind do feed, que precisa
   comportar `permission_decision`.
3. **São sete status de agente.** Entra `[stalled]`. A precedência, do mais forte ao mais
   fraco: `offline`, `blocked`, `waiting ?`, `waiting`, `stalled`, `working`, `done`, `idle`.
4. **São oito status de ticket.** Aos seis atuais somam-se `[planned]` e `[dropped]`.
5. **Os tickets nascem de um plano.** O leader publica a lista de tickets, com título e
   dependências, antes de mandar a primeira tarefa. É um evento do log, não uma mensagem
   entre peers: aparece no feed como linha de sistema. Proponha o texto dessa linha.
6. **O frame 14 muda de sentido.** Ele mostrava o worker-1 bloqueado por um pedido de
   permissão que só se resolvia no terminal dele. Agora o pedido chega à TUI e eu respondo
   por aqui (frame 22). Refaça o 14 como a visão principal com um pedido de permissão
   pendente e o modal ainda fechado.
7. **O frame 12 (broker desconectado)** diz "responder e gate desabilitados". Inclua a
   decisão de permissão nessa lista.
8. **O frame 15 (ticket escalado) ganha um desfecho.** Depois da resposta da mother, o
   leader descarta o ticket no plano e, se eu pedi outra tentativa, planeja um ticket novo.
   O desfecho é o frame 25.

Atualize a legenda e os atalhos (11) com tudo isso.

## Frames novos

### 22. Pedido de permissão
O Claude Code do worker-1 parou pedindo permissão para rodar um comando. O pedido chega à
TUI com quatro dados: a tool (`Bash`), uma descrição escrita pelo próprio agente
(`Rodar os testes do player`), a prévia da entrada (o comando de fato, `bun test
src/player`) e o agente que pediu.
- O modal: agente, ticket, tool, descrição e a prévia. **A prévia precisa aparecer
  inteira e em destaque**: a descrição é texto do agente e não diz o que vai rodar. Mostre
  também um comando longo, de várias linhas, e como ele cabe ou rola.
- Teclas: `a` permite, `d` nega, `esc` fecha sem decidir e o pedido continua pendente.
- O worker-1 aparece `[blocked]`, mas de um jeito que eu distinga de relance do bloqueio
  por credencial do frame 10: aqui a saída é uma tecla.
- O selo da linha de abas e a tecla que abre o modal a partir de qualquer tela.
- As linhas do feed: `w1 → hum [permission_request] Bash · bun test src/player` e
  `hum → w1 [permission_decision] permitido`.
- **Pedido já resolvido em outro lugar.** Eu posso ter respondido no terminal do worker-1.
  A TUI só descobre quando o agente faz qualquer coisa depois. Mostre o modal aberto no
  momento em que isso acontece: um aviso de que o pedido já foi respondido no terminal, e
  as teclas `a` e `d` deixam de valer.
- **Dois pedidos pendentes**, de agentes diferentes: a fila, como você fez para os gates
  no frame 19.
- Um pedido de permissão, uma pergunta bloqueante e um gate pendentes ao mesmo tempo: como
  os três selos convivem na linha de abas.

### 23. Agente parado sem motivo (`stalled`)
O worker-2 recebeu o TKT-13, trabalhou e encerrou o turno sem entregar. Ele não está
bloqueado, não fez pergunta e a sessão está viva: só parou devendo.
- O status `[stalled]` no painel de agentes e no nó da estrela, com cor e glifo próprios,
  distinguível de relance de `[blocked]`, `[offline]` e `[idle]`.
- O que ele deve, em texto: `deve result TKT-13`. Os casos possíveis são o worker devendo
  a entrega, o judge devendo o veredito, o leader devendo a tarefa de rework ou o plano, e
  qualquer agente devendo a resposta de uma pergunta que está com ele.
- O painel de detalhe com o worker-2 selecionado: desde quando, o que deve, e a instrução
  de que a saída é ir ao terminal dele. A TUI não tem ação para isso.
- O selo da linha de abas.
- **Mensagem sem reação.** Vale para qualquer agente, em qualquer status: se uma mensagem
  endereçada a ele está há mais de 2 minutos sem nenhum evento dele depois, o painel de
  agentes mostra a idade (`sem reação há 3m10s`). Mostre isso num agente que está
  `[working]`, para ficar claro que não é o mesmo que `[stalled]`.

### 24. Tickets planejados
O leader acabou de publicar o plano e ainda não mandou nenhuma tarefa.
- O painel de tickets com os três em `[planned]`, sem worker dono, e a dependência
  (`TKT-13 depende de TKT-12`).
- A linha de sistema do plano no feed.
- O momento seguinte: TKT-12 em `[working]` com o worker-1, TKT-13 e TKT-14 ainda
  `[planned]`.
- O plano republicado com um ticket a mais (TKT-15). O painel de tickets hoje comporta
  três; mostre como ele se comporta com quatro ou cinco.
- A tela de detalhe (03) de um ticket que ainda está `[planned]`: não tem linha do tempo.

### 25. Ticket descartado e recusas do broker
Continuação do frame 15. A mother respondeu a pergunta do leader, o leader descartou o
TKT-12 e planejou o TKT-15 para uma nova tentativa.
- O TKT-12 em `[dropped]` no painel de tickets, distinguível de `[done]` e de
  `[escalated]`. Um ticket descartado libera o worker dono e não conta nos `3/3 tickets`.
- O TKT-15 em `[planned]`, com contador de rework próprio, zerado.
- A tela de detalhe (03) do TKT-12 terminando no descarte.
- **Linha de recusa.** Quando um agente tenta mandar algo que o broker não aceita, o feed
  ganha uma linha de sistema com o agente, o que ele tentou e o erro:
  `✗ w1 recusado · task · worker_busy`. Recusas repetidas do mesmo agente com o mesmo erro
  viram uma linha só, com contador (`×3`). Mostre as duas formas e o painel de detalhe com
  uma delas selecionada.

## Regras que você precisa saber para desenhar certo
- **`[stalled]` contra `[working]`:** o agente está `working` enquanto está em turno. Fica
  `stalled` quando deve alguma coisa e o turno acabou.
- **`[blocked]` por permissão:** um pedido de permissão aberto deixa o agente `[blocked]`.
  O pedido fecha com a minha decisão ou com qualquer evento posterior do mesmo agente.
- **`[done]`:** todos os tickets não descartados do plano mais recente estão aprovados.
- **Status de ticket, por precedência:** `dropped` antes de qualquer outra regra;
  `planned` se está no plano e ainda não recebeu tarefa; depois `working`, `review`,
  `done`, `escalated`; `waiting` e `blocked` quando o worker dono está assim por causa do
  ticket.
- **O que não vai para o feed:** início de turno e relatório de uso acontecem a cada turno
  de cada agente e encheriam a tela. Eles só alimentam o status e o rodapé de tokens.

## Entregáveis
- O `Squad TUI.dc.html` atualizado: frames 11, 12, 14 e 15 corrigidos e frames 22 a 25
  novos.
- O frame interativo aceitando `a` e `d` no modal de permissão.
- A legenda (11) com os sete status de agente, os oito de ticket, os nove kinds e as
  linhas de sistema, incluindo plano e recusa.
- Uma lista curta do que você decidiu por conta própria nesta rodada. E me mande também a
  lista da primeira rodada, que eu não guardei.
