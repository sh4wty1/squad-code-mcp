# Design: estados que faltam na TUI do squad

## Contexto
Anexo vai o `Squad TUI.dc.html` que você desenhou: 12 frames estáticos e um interativo, em
120×40. Fechei a spec do projeto depois disso e ela mudou algumas coisas que a tela mostra
e criou estados que não têm desenho. Quero que você altere o mesmo arquivo: corrija os
frames existentes onde eu indicar e acrescente os frames novos, numerados a partir de 12.

Continue usando o mesmo `Grid`, as mesmas funções de desenho e os mesmos dados mock
(projeto `portal-89fm`, feature `player ao vivo com setlist`, TKT-12 a TKT-14, Q-05 a Q-09).
Vou portar essas funções para a TUI real, então cada frame novo precisa ser uma função
que recebe o contexto e devolve um `Grid`, como os atuais.

## Restrições (as mesmas de antes)
- Grid monospace de 120 colunas × 40 linhas
- Bordas só com `┌─┐│└┘├┤┬┴┼`
- 16 cores ANSI sobre fundo escuro; Mother magenta, Leader ciano, Workers verde, Judge
  amarelo, dev branco, erro vermelho
- Glifos: `● ○ ▶ ✓ ✗ ⟳ ⚠`. Se precisar de mais algum, use um que ocupe uma célula e me
  diga qual
- Tudo por teclado, nada que dependa de mouse

## O que mudou e vale para todos os frames
1. **O nível de cima se chama feature, não thread.** Onde hoje aparece `thread tlc`
   (`feed · thread tlc`, `thread: tlc · 3 tickets`, `Thread tlc encerrado`), mostre a
   feature. "Thread" fica só para a troca de um ticket (`thread TKT-12`).
2. **São sete kinds de mensagem, não cinco:** `task`, `result`, `verdict`, `question`,
   `answer`, `gate`, `gate_decision`. `review` deixou de existir. Dê uma cor a `answer`,
   `gate` e `gate_decision`, e resolva a coluna de kind do feed, que hoje não comporta
   `gate_decision`.
3. **`result` é só entrega e relatório.** As linhas do mock mudam assim:
   - `hum → mot [result] Q-07: …` vira `hum → w1 [answer] Q-07: …`. A resposta do dev vai
     para quem perguntou.
   - Resposta de um agente a outro (`mot → ldr`, `w2 → jdg`) vira `[answer]`.
   - `mot → hum [question] gate: aprovar entrega final?` vira `mot → hum [gate] G-01 …`.
   - `hum → mot [verdict] entrega aprovada` vira `hum → mot [gate_decision] aprovado`.
   - `jdg → ldr [review] parcial: 4/5 checados` sai. Enquanto o judge avalia, ele aparece
     como `[working] rev TKT-13` e não há aresta ativa nova.
   - `mot → ldr [result] merge feito · thread encerrado` sai. O encerramento é uma linha
     de sistema: `feature encerrada · entregue`.
4. **Gates têm id** (`G-01`), como as perguntas têm `Q-07`.
5. **Saem da tela:** a topologia órbita e a tecla `v`, os filtros `f` `t` `/`, e os
   controles de esquema de cor e de estilo de seleção.

Atualize a tela de legenda e atalhos (11) com tudo isso.

## Frames novos

### 12. Broker desconectado
A visão principal quando a TUI perde o broker. Hoje só existe `broker ● conectado`.
- O indicador da linha 0 no estado desconectado, com há quanto tempo
  (`broker ○ desconectado · 12s`).
- A tela continua mostrando o último estado conhecido. Preciso que fique evidente que
  aquilo está parado: o feed não pode parecer `● ao vivo`, e os relógios e contagens
  regressivas não podem parecer que estão andando.
- O que o rodapé diz. A TUI tenta de novo sozinha a cada segundo; não há tecla de
  reconectar.

### 13. Agente offline
A sessão do worker-2 morreu no meio do TKT-13. É um sexto status, `[offline]`, além dos
cinco atuais.
- worker-2 no painel de agentes, com cor e glifo próprios, e desde quando.
- O TKT-13 no painel de tickets: ele continua atribuído ao worker-2 e fica parado.
- As linhas de sistema no feed para a saída e para a volta do peer
  (`○ w2 saiu · sessão morta` e `● w2 voltou`), no mesmo estilo das linhas de sistema que
  já existem.
- O nó do worker-2 na topologia estrela.
- O selo de alerta da linha de abas.
- Painel de detalhe com essa linha selecionada: o que o dev precisa fazer é relançar a
  sessão com o mesmo nome. A TUI não tem ação para isso; mostre como instrução.

### 14. Bloqueado por permissão pendente
Variante do estado de erro (frame 10). O worker-1 parou porque o Claude Code está
esperando uma confirmação no terminal dele. Não há pergunta para responder na TUI.
- Linha de sistema: `⚠ w1 [blocked] permissão pendente no terminal`.
- Painel de detalhe: motivo, desde quando, e que a saída é ir ao terminal do worker-1.
  Não pode aparecer `b responder`, porque não há pergunta.
- Compare com o frame 10 para que os dois tipos de bloqueio fiquem distinguíveis de
  relance.

### 15. Ticket escalado
O TKT-12 foi reprovado pela terceira vez. O limite de dois reworks foi atingido, o leader
não pode mandar outro, e escalou à mother com uma pergunta bloqueante.
- Status novo de ticket: `[escalated]`, no painel de tickets.
- O contador `⟳ 2/2` em vermelho e o que aparece no lugar de um terceiro rework.
- A tela de detalhe do ticket (03) com três rodadas: colunas `v1 v2 v3` na tabela de
  critérios e a linha do tempo terminando em `question ldr → mot`.
- worker-1 fica livre (`[idle]`), leader fica `[waiting]`.

### 16. Gate: rejeitar e comentar com texto
O modal do gate (08) hoje não tem onde escrever. Agora:
- `r` abre um campo de texto para o motivo, obrigatório.
- `c` abre um campo de texto para o comentário, obrigatório.
- `enter` com o campo vazio não envia; mostre como a recusa aparece.
- Use o mesmo campo dos modais de resposta (06 e 07), com `ctrl+e` para expandir.
Desenhe o modal nos dois modos e o estado de campo vazio recusado.

### 17. Gate: confirmar a aprovação
`a` não aprova de imediato. Pede uma confirmação, porque a ação é irreversível.
- O passo de confirmação dentro do modal, repetindo a ação e o efeito
  (`merge feat/player-ao-vivo → main` · `deploy automático em produção`).
- As teclas: uma para confirmar, `esc` para voltar ao modal sem decidir.

### 18. Gate comentado e reemitido
Comentar não decide o gate: ele continua pendente e a mother responde reemitindo o mesmo
gate (`G-01`) com o conteúdo atualizado.
- A visão principal logo depois do comentário: o selo `⚠ gate pendente` continua, e
  preciso ver que a bola está com a mother, não comigo.
- O modal do gate reemitido: como ele mostra que é o mesmo `G-01` atualizado, o meu
  comentário anterior e o que a mother mudou.
- As linhas do feed: `hum → mot [gate_decision] comentário: …` e
  `mot → hum [gate] G-01 atualizado`.

### 19. Dois gates pendentes
O contrato permite mais de um gate aberto. A TUI mostra um por vez, o mais antigo primeiro.
- O selo da linha de abas com a contagem.
- O modal indicando a posição na fila (`gate 1 de 2`) e como passar para o próximo sem
  decidir o atual.

### 20. Perguntas: o que mudou
Na aba Perguntas (04) e nos modais (05 a 07):
- **Aviso fixo no modal de texto:** a resposta fica gravada no log e não pode ser
  apagada. Uma linha, sempre visível, sem empurrar o campo.
- **Q-09 reescrita.** Ela não pede mais o valor da chave. Passa a ser: "A RADIO_API_KEY
  não está no worktree do worker-2. Coloque-a no `.env` de lá e confirme." com as opções
  `1 pronto` e `2 não vou fornecer`, mais `outra resposta`. O efeito deixa de mencionar
  "cofre do projeto".
- **Resposta recusada.** Eu envio a resposta de uma pergunta cujo prazo acabou de vencer.
  O broker recusa. Mostre o aviso (`Q-08 já fechada · default aplicado: logo da 89`).
- **Pergunta mesclada.** Na lista, a pergunta que absorveu outra mostra de quem era a
  duplicata. No histórico, a duplicata aparece como mesclada, apontando para a que ficou.
- **Terceiro tipo de resolução no histórico.** Além de `✓ respondida pelo dev` e
  `⟳ default aplicado · timeout`, existe `⟳ default aplicado · worker-2 entregou o
  ticket antes da resposta`.
- **Rota real.** A rota mostrada (`w1 → ldr → mot → dev`) é a sequência real de
  encaminhamentos, então pode ser mais curta: uma pergunta do judge ao worker é
  `jdg → w2` e não chega ao dev. Mostre uma dessas no histórico.

### 21. Terminal pequeno
O que a TUI mostra quando o terminal tem menos de 120×40: só uma mensagem com o tamanho
atual e o necessário. Desenhe num frame de 80×24.

## Regras que você precisa saber para desenhar certo
- **`[blocked]` contra `[waiting ?]`:** `blocked` é o agente declarando um impedimento
  externo depois de tentar (credencial ausente, permissão pendente). `waiting ?` é quem
  fez uma pergunta bloqueante e espera a resposta. Se os dois valem, mostra `blocked`.
- **`[idle]` contra `[done]`:** worker com o ticket aprovado enquanto outros ainda
  trabalham fica `[idle] TKT-14 ✓`. Todos passam a `[done]` quando o último ticket da
  feature é aprovado.
- **Timeout:** a contagem regressiva começa quando a pergunta chega ao dev, não quando o
  agente pergunta. Corrija a Q-05 do mock, que conta da pergunta do worker.
- **Aresta ativa:** é sempre o par `de → para` da mensagem mais recente.
- **Tokens no rodapé:** antes do primeiro relatório de uso de um agente, mostre um traço
  no lugar do número, não zero.
- **Custo:** o dólar é uma estimativa calculada pela TUI. Marque-o como estimado.

## Entregáveis
- O `Squad TUI.dc.html` atualizado, com os frames 01 a 11 corrigidos (sem o 02b) e os
  frames 12 a 21 novos.
- O frame interativo aceitando as teclas novas do gate (`r` e `c` com texto, `a` com
  confirmação).
- A legenda (11) com os seis status de agente, os seis de ticket, os sete kinds e as
  linhas de sistema.
- Uma lista curta do que você teve de decidir por conta própria, para eu conferir.
