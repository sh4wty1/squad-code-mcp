# Design: terceira rodada, o squad sem feature aberta

## Contexto
Continuo no mesmo `Squad TUI.dc.html`, que hoje tem os frames 01 a 25. Implementei no
broker a abertura e o encerramento de feature, e isso mostrou estados que o frame 09
(tudo idle) não cobre. Ele desenha um caso só: a feature entregue, com gate aprovado e os
seis agentes `[idle]`. Altere o mesmo arquivo: corrija os frames que eu indicar e
acrescente os novos, numerados a partir de 26.

Valem as mesmas regras: o mesmo `Grid`, as mesmas funções de desenho, os mesmos dados mock
(`portal-89fm`, `player ao vivo com setlist`, TKT-12 a TKT-15, Q-05 a Q-09, G-01, P-01), e
cada frame novo como uma função que recebe o contexto e devolve um `Grid`.

## Restrições (as mesmas)
- Grid monospace de 120 colunas × 40 linhas
- Bordas só com `┌─┐│└┘├┤┬┴┼`
- 16 cores ANSI sobre fundo escuro; Mother magenta, Leader ciano, Workers verde, Judge
  amarelo, dev branco, erro vermelho
- Glifos: os que o arquivo já usa. Se precisar de outro, use um que ocupe uma célula e me
  diga qual
- Tudo por teclado

## O que mudou e vale para todos os frames
1. **A feature tem começo e fim no log.** A mother abre a feature quando a spec está
   pronta e a encerra como `entregue` ou `abandonada`. Só existe uma aberta por vez. Entre
   uma e outra o squad fica sem feature, e é assim também antes da primeira.
2. **A linha 0 hoje é fixa.** `portal-89fm › player ao vivo com setlist · workflow tlc`
   aparece igual em todos os frames, inclusive no 09, onde a feature já foi encerrada.
   Ela passa a depender do estado: com feature aberta mostra a feature; sem feature aberta
   não pode mostrar a anterior como se fosse a atual. Proponha o que ela mostra.
3. **O título da feature não tem limite de tamanho.** Mostre como a linha 0 corta um
   título longo sem empurrar o contador `? N`, o indicador do broker e o relógio.
4. **O nome do projeto pode faltar.** Ele não vem no log de eventos, e ainda não decidi de
   onde a TUI o tira. Desenhe a linha 0 nas duas formas, com e sem o projeto, para eu ver
   se ela se sustenta sem ele.
5. **Encerrar a feature não limpa mais nada.** Um agente `[blocked]` continua bloqueado,
   um `[offline]` continua offline e um pedido de permissão aberto continua aberto. "Sem
   feature" deixou de ser sinônimo de "todos `[idle]`".
6. **O frame 09 perde a linha do gate por enquanto.** O resumo dele diz
   `G-01 aprovado 14:53:20`. A TUI de leitura fica pronta antes de o gate existir: faça o
   resumo funcionar sem essa linha, e com ela quando houver gate.

Atualize a legenda (11) com as linhas de sistema novas.

## Frames novos

### 26. Feature aberta
O momento em que a mother abre a feature. Hoje o feed tem a linha de sistema do
encerramento (`feature encerrada · entregue`) e nenhuma para a abertura.
- A linha de sistema da abertura no feed, no mesmo estilo da de encerramento. Proponha o
  texto.
- O painel de detalhe com essa linha selecionada. A abertura traz seis dados: título
  (`player ao vivo com setlist`), workflow (`tlc`), branch (`feat/player-ao-vivo`), branch
  base (`main`), caminho da spec (`.specs/features/player-ao-vivo/spec.md`) e o commit da
  spec (`a3f9c21`).
- O estado dos agentes nesse instante: a feature existe, não há plano nem ticket. A mother
  está `[working]`, o leader ainda não recebeu a primeira tarefa e o painel de tickets
  está vazio. Mostre o painel de tickets vazio de um jeito que não pareça defeito.
- A linha 0 passando a mostrar a feature.
- **Segunda feature do dia.** O log guarda as features anteriores. Mostre o feed logo
  depois da abertura de uma segunda feature (`busca de programas`): o que separa as linhas
  da feature nova das da anterior, e se as antigas continuam visíveis ou só por `j/k`.

### 27. Feature abandonada
A mother encerrou a feature como abandonada, com dois tickets aprovados e um em
`[working]`. Ela pode escrever um motivo, que é opcional
(`o dev trocou a prioridade; a busca de programas entra antes`).
- A linha de sistema `feature encerrada · abandonada`, distinguível de relance da
  `entregue`, que é verde.
- O painel de detalhe com essa linha selecionada, com o motivo e sem ele.
- A tela "tudo idle" (09) para esse desfecho. O resumo de hoje abre com `última entrega ✓`,
  que não serve: diga o que ele mostra para uma feature abandonada, incluindo o ticket
  que ficou pelo meio.
- A faixa `squad ocioso desde 14:53:31 · sem feature ativa` e o `○ ocioso desde` do
  rodapé valem igual: contam do encerramento, qualquer que seja o desfecho.

### 28. Nenhuma feature ainda
O broker acabou de subir e o log não tem nenhuma feature. Não existe "ocioso desde",
porque nunca houve encerramento, nem "última entrega".
- A visão principal: linha 0, feed vazio, painel de tickets vazio e o painel de detalhe
  sem resumo para mostrar. Preciso distinguir de relance este estado do broker
  desconectado (12).
- O que ocupa o lugar da faixa `squad ocioso desde …`.
- **Só parte do squad no ar.** A mother e o leader já entraram, os três workers e o judge
  ainda não foram lançados. Eles nunca estiveram online, então não são `[offline]` no
  sentido do frame 13, que é sessão que morreu. Mostre como aparecem no painel de agentes
  e na topologia (02).
- As linhas de sistema de entrada de peer (`● ldr entrou`) num feed que só tem isso.
- O rodapé de tokens: a mother já gastou conversando comigo antes de abrir a feature, os
  outros têm traço.

### 29. Sem feature, mas não tudo idle
A feature foi encerrada com o worker-2 ainda `[blocked]` pela credencial (o caso do
frame 10) e o worker-3 `[offline]`. É o frame 09 com dois agentes que não voltaram a
`[idle]`.
- O painel de agentes e a topologia: os quatro `[idle]`, o worker-2 `[blocked]` e o
  worker-3 `[offline]`, com o ticket que cada um tinha, que não existe mais.
- O que o selo da linha de abas e o rodapé dizem. Hoje o rodapé mostra ou o alerta do
  agente ou o `○ ocioso desde`; aqui valem os dois.
- O feed: no 09 ele fica inteiro em cinza. Diga se continua assim quando ainda há um
  alerta ativo.
- **Pedido de permissão que sobrou.** Variante com o worker-1 `[blocked]` por um pedido de
  permissão (P-01) aberto depois do encerramento: o selo e a tecla `x` continuam valendo
  sem feature aberta.

### 30. Tokens: sessão e feature
O rodapé mostra tokens e custo por agente e um total. São dois totais diferentes: o da
feature aberta e o da sessão inteira, que inclui a conversa da mother comigo antes da
abertura e tudo o que aconteceu entre uma feature e outra.
- Onde cada um aparece, com feature aberta e sem feature. O dólar continua marcado como
  estimado.
- No resumo da tela "tudo idle", o custo da feature encerrada ao lado de `duração` e
  `mensagens`.

## Regras que você precisa saber para desenhar certo
- **`[idle]`:** sem feature aberta, todo agente que não está `[offline]` nem `[blocked]`
  fica `[idle]`, mesmo a mother em conversa comigo. Não existe `[working]` nem `[stalled]`
  sem feature.
- **`[done]` não sobrevive ao encerramento:** no instante em que a feature fecha, quem
  estava `[done]` passa a `[idle]`.
- **Tickets:** o painel de tickets é da feature aberta. Sem feature ele está vazio; os
  tickets da última feature só aparecem no resumo da tela "tudo idle".
- **Nome nunca lançado:** o squad tem seis nomes fixos (mother, leader, judge, worker-1 a
  worker-3). Um nome pode nunca ter entrado; isso é diferente de ter entrado e caído.
- **Quem recebe a abertura e o encerramento:** os dois são avisos da mother para todos os
  outros, não uma mensagem para um agente. Não há aresta ativa por causa deles.
- **Ocioso desde:** é a hora do último encerramento. Sem nenhum encerramento no log, não
  há hora para mostrar.

## Entregáveis
- O `Squad TUI.dc.html` atualizado: a linha 0 dependente do estado em todos os frames, os
  frames 09 e 11 corrigidos e os frames 26 a 30 novos.
- A legenda (11) com as linhas de sistema de abertura e de encerramento nos dois desfechos,
  e com o agente nunca lançado, se você lhe der glifo ou rótulo próprio.
- Uma lista curta do que você decidiu por conta própria nesta rodada.
