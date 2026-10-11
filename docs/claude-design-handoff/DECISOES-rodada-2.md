# O que os frames 12 a 25 mostram e o que o Claude Design decidiu na segunda rodada

É a seção 7 de `DESIGN-NOTES.md` como foi escrita em 2026-10-07 no branch
`docs/design-rodada-2` (commit `3f78dd4`), que nunca foi mesclado. O texto abaixo está como
veio, sem edição. As marcas `[L]`, `[I]` e `[A]` e as seções 1 a 6 que ele cita são as de
`DESIGN-NOTES.md`.

O que mudou desde então:

- Os `(Lnnn)` são linhas do `Squad TUI.dc.html` de 938 linhas, e não valem para o de 1062
  linhas que está em `Handoff-Design.zip`, com os frames 01 a 30. O zip que a seção chama de
  "desta pasta" foi substituído por esse.
- A parte de leitura destes frames foi tratada na spec da fatia TUI leitura,
  `.specs/features/tui-leitura/spec.md`, que vale no lugar deste texto onde os dois
  diferem.
- Aquela spec deixa fora do escopo o modal de gate (frames 16 a 19) e o modal de pedido
  de permissão (7.2, com os ids `P-nn` de D2, a trava de D3 e a linha de D4). Para a
  fatia Gate, cada item é para adotar, cortar ou mudar na spec dela.
- A seção 7.7 compara com o design de 2026-10-07; a tabela da fatia TUI leitura de
  `.design/squad-mvp.md` mudou depois.

## 7. Rodadas de estados faltantes (frames 12 a 25)

Fonte: `Squad TUI.dc.html` (938 linhas) importado do projeto do Claude Design em 2026-10-07 e
gravado no zip desta pasta. As seções 1 a 6 descrevem a versão de 678 linhas, que continua no
zip como `Squad TUI (antes da spec).dc.html`; os `(Lnnn)` delas não valem para o arquivo novo.
Aqui `(Lnnn)` é a linha do arquivo novo. `support.js` não mudou.

Pedidos: `PROMPT-estados-faltantes.md` (frames 12 a 21) e `PROMPT-estados-faltantes-2.md`
(frames 22 a 25 e correções em 11, 12, 14 e 15). São 45 frames estáticos (L793-837) e o
interativo.

### 7.1 Frames

| # | Frame | O que mostra |
|---|---|---|
| 12 | broker desconectado | tela congelada; rodapé `○ broker inacessível · reconexão automática a cada 1s · tentativa N · responder, gate e permissão desabilitados` (L435) |
| 13a-c | agente offline / topologia / de volta | `◌ [offline]`, `◌ sessão morta há …`; linhas de sistema `○ w2 saiu` e `● w2 voltou` |
| 14 | pedido de permissão pendente | refeito: visão principal com `worker-1 [blocked x]` e o modal fechado |
| 15a-b | ticket escalado e seu thread | `[escalated] ⟳ 2/2`; thread com v1 v2 v3 terminando em `question ldr → mot` |
| 16a-c | gate: rejeitar, comentar, campo vazio | texto obrigatório em `r` e `c`; `enter` vazio não envia |
| 17 | gate: confirmar aprovação | `a` pede `y`; `esc` volta ao gate |
| 18a-b | gate comentado e reemitido | o selo continua; mesmo `G-01`, versão 2 |
| 19a-b | dois gates | selo com contagem; fila com `]` e `[` |
| 20a-b | Q-09 reescrita; resposta recusada | a pergunta pede ação no worktree, não a chave; prazo venceu antes do envio |
| 21 | terminal pequeno | 80×24: `atual 80 × 24 · necessário 120 × 40`, `q sair` |
| 22a | permissão: modal | ver 7.2 |
| 22b | respondida no terminal | aviso, `a` e `d` deixam de valer |
| 22c-d | dois pedidos | selo `⚠ 2 permissões · x`; fila `pedido 1 de 2` |
| 22e-f | comando longo | 8 linhas visíveis; `a` travado até o fim da prévia |
| 22g | três pendências | pergunta na aba 4 e no `? N`; permissão e gate como selos |
| 22h | permissão decidida | `hum → w1 [permission_decision] permitido` |
| 23a-b | agente `stalled`, painel e topologia | ver 7.3 |
| 24a-d | plano publicado, primeira task, plano republicado, thread de ticket planejado | ver 7.4 |
| 25a-b | ticket descartado, recusas e thread do descartado | ver 7.4 e 7.5 |

Mudanças nos frames antigos: a legenda (11) passa a ter 7 status de agente, 8 de ticket, 9
kinds e as linhas de sistema, e o texto final vira `a TUI escreve três coisas: respostas a
perguntas, decisões de gate e decisões de pedido de permissão` (L779-781). O kind `review` saiu.
O painel do feed se chama `feed · feature player ao vivo`, não mais `thread tlc`.

### 7.2 Pedido de permissão [L] (L710-736, L873-885)

- **Dados do pedido:** id `P-01`, agente, ticket, tool, descrição, entrada, hora (L173-176).
- **Status:** `[blocked x]`, com o `x` em branco, contra `[blocked]` da credencial. A terceira
  linha do agente mostra `x Bash · bun test src/player` (L401). A legenda separa os dois:
  `[blocked]` "impedimento externo · resolve fora", `[blocked x]` "permissão pendente · sai
  com tecla".
- **Selo:** `⚠ permissão w1 · x`, ou `⚠ 2 permissões · x`, em ciano claro, antes do selo de
  gate (L308-309). Rodapé `⚠ w1 bloqueado há 1m30s`.
- **Tecla global `x`:** abre o pedido mais antigo de qualquer tela; sem pedido, toast `nenhum
  pedido de permissão`.
- **Modal:** título `⚠ permissão P-01 · w1 · Bash`; agente, ticket, tool, descrição seguida de
  `texto do agente, não diz o que roda`; caixa `entrada · Bash` com a entrada inteira, numerada
  por linha, fundo preto e negrito. Abaixo, o efeito de cada tecla.
- **Comando longo:** a caixa mostra 8 linhas (`PV=8`), quebra em 70 colunas, rola com `j/k`,
  `G` vai ao fim, e marca `1–8 de 11 · ▼ mais abaixo` ou `· fim`. **`a` só vale depois de
  rolar até o fim**; antes disso o toast diz `role a prévia até o fim · G`. `d` vale sempre.
- **Fila:** `]` e `[` trocam de pedido sem decidir; decidir um passa ao seguinte.
- **Respondido no terminal:** a TUI descobre quando o agente volta a agir. O modal fica cinza
  com `⚠ já respondido no terminal do worker-1 · a TUI soube às 14:31:02 … Nada foi enviado`,
  e o feed ganha a linha de sistema `✓ P-01 fechado · respondido no terminal de w1`.
- **Feed:** `w1 → hum [permission_request] Bash · bun test src/player` em ciano claro e
  `hum → w1 [permission_decision] permitido`, verde se permitido e vermelho se negado (L96).
  A coluna do corpo começa na 66 ou depois do kind, o que for maior (L328): é assim que
  `[permission_decision]` cabe.
- **Escrita:** `permission_decision` com `out` `permitido` ou `negado` e o id do pedido, de
  `hum` para o agente que pediu, não para a mother.

### 7.3 `stalled` e mensagem sem reação [L] (L183, L344-348, L402-405)

- Glifo `‖` e amarelo claro: `‖ worker-2 [stalled]`, terceira linha `‖ deve result TKT-13`,
  nota `‖` no ticket. Nó da estrela com borda amarela e a mesma linha.
- Selo `‖ w2 parado · deve result TKT-13` e rodapé `‖ w2 parado há 5m13s`.
- Linha de sistema no feed: `‖ w2 [stalled] deve result TKT-13`, com hora.
- Detalhe: desde quando, ticket, o que deve, a instrução de ir ao terminal dele, e a tabela de
  quem deve o quê (worker `result`, judge `verdict`, leader `task` de rework ou plano, todos
  `answer` de pergunta sua).
- **Sem reação:** `sem reação há 3m10s` em amarelo na terceira linha do agente, no mock no
  leader `[working]`. Só aparece se o agente não tem outra coisa nessa linha (offline,
  permissão, stalled e bloqueio vêm antes, L400-405).

### 7.4 Plano, `planned` e `dropped` [L] (L108, L184-185, L350-354, L408-416, L534-553)

- **Linha de sistema do plano:** `▶ plano v1 de ldr · 3 tickets · 1 dependência`. Republicado:
  `▶ plano v2 de ldr · 4 tickets · + TKT-15`. Com descarte: `▶ plano v2 de ldr · ✗ TKT-12 · +
  TKT-15`. Detalhe: versão, hora, `evento do log, não mensagem entre peers: não tem de/para`,
  a lista de tickets com dependência, `sem dono até a task`.
- **Painel de tickets:** título `tickets · plano vN`. Até 3 tickets, duas linhas cada, com
  `dep TKT-12` em cinza e dono `—`. **Com 4 ou mais, uma linha por ticket, sem título**
  (`TKT-12 ⟳0/2 [planned] —`), e cabem 7 (L409-411).
- **Cores:** `[planned]` ciano, `[dropped]` cinza com o id também em cinza.
- **Thread de ticket planejado:** `○ sem linha do tempo`, e só o que o plano diz: título,
  depende de, dono `—`, `⟳0/2`. Fluxo `▶ plano v1 ▶ aguarda TKT-12 ▶ task`.
- **Thread do descartado:** termina na linha de sistema `plano v2 · TKT-12 saiu · w1
  liberado`. Painel `desfecho`: `saiu do plano: não conta em 3/3`, `w1 liberado · sem ticket`,
  `nova tentativa TKT-15 [planned] · ⟳ 0/2 próprio · sem dono ainda`.

### 7.5 Recusas do broker [L] (L191-192, L356-357)

- Linha vermelha `✗ w1 recusado · task · worker_busy`; agrupada, `✗ ldr recusado · task ·
  ticket_dropped ×3`.
- Detalhe: agente, o kind tentado e o destinatário, o erro, `×3 · 14:51:40–52:05`, um texto do
  que houve, a regra de agrupamento e `Só leitura: a TUI não reenvia nem corrige`.

### 7.6 O que o Claude Design decidiu por conta própria nesta rodada [I]

Lido do arquivo, comparado com o `PROMPT-estados-faltantes-2.md`. A lista que o próprio Claude
Design escreveu ficou na conversa de lá e não está no projeto.

| # | Decisão | Custo para a implementação |
|---|---|---|
| D1 | Tecla global `x` para permissão e a variante `[blocked x]` | uma tecla e um caso a mais no rótulo de status |
| D2 | Id de pedido `P-01` | `.design/squad-mvp.md` não define id curto para pedido de permissão; ou o broker gera, ou a TUI numera |
| D3 | `a` travado até o fim da prévia em comando longo | estado de rolagem no modal; é regra de segurança, não só de tela |
| D4 | Linha de sistema `✓ P-01 fechado · respondido no terminal` | a TUI gera a linha ao ver o evento seguinte do agente; não há evento de fechamento no log |
| D5 | Linha de sistema `‖ w2 [stalled] …` no feed, com hora | `stalled` é derivado, não é evento. A hora teria de ser a do fim do turno (`usage`), e a linha é sintetizada pela TUI |
| D6 | Glifo `‖` para stalled | já era usado em `‖ pausado`; entra no teste de largura de glifo junto com `⚠` e `⟳` |
| D7 | Plano com número de versão (`plano v2`) e marcas `+ TKT-15` / `✗ TKT-12` | a versão é a contagem de eventos `plan` da feature; as marcas são a diferença para o plano anterior |
| D8 | Painel de tickets compacto a partir de 4, limite de 7 | sem rolagem; o oitavo ticket não aparece |
| D9 | Permissão e gate como selos, pergunta só no `? N` e na aba 4 | ordem fixa: permissão, depois gate |
| D10 | `permission_decision` com a cor do desfecho, como `verdict` e `gate_decision` | nenhuma |
| D11 | Cenário `w` no frame interativo | é do protótipo, não da TUI |

### 7.7 Contra `.design/squad-mvp.md`

A fatia TUI leitura marca como "Não está no design" estas linhas, que agora têm frame:
`offline` (13), broker desconectado (12), `stalled` e mensagem sem reação (23), `refused` com
contador (25a), modal de permissão (22), `planned` (24), `dropped` (25), terminal pequeno (21).
Os códigos `worker_busy`, `ticket_dropped` e `permission_closed` usados no mock existem no
contrato.

**[A]** O exemplo `w1 recusado · task · worker_busy` mostra um worker mandando `task`, o que a
topologia já recusaria por outro motivo. Vale como exemplo de formato, não de regra.
