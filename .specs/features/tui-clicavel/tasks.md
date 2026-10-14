# TUI clicável Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/tui-clicavel/design.md`
**Status**: Approved

Regras do repositório que valem para toda tarefa:

- Comandos rodam de dentro de `broker/`. No Windows o `bun` é o 1.4.2 e o Python é `python`.
- Mensagem de commit: uma frase imperativa em inglês, em minúsculas, sem prefixo de Conventional Commits (veja `git log`), com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` no fim. `check_commit.py` não se aplica. O dev autorizou em 2026-10-13 o commit de cada tarefa sem pergunta; `git push` e o PR pedem o sim dele na hora.
- Um commit por tarefa, com a tarefa marcada aqui e os requisitos dela em `Implementing` na spec, no mesmo commit.
- Código, comentários e nomes em inglês, no estilo e na densidade de comentário dos arquivos vizinhos; o texto que aparece na tela é português.
- O nome de cada teste começa pelo requisito: `CLK-20: ...`.
- `test/unit/tui-keys.test.ts`, `test/frames/view.ts` e os `.txt` de `test/frames/` não são editados. `test/unit/tui-frames.test.ts` só muda na T22, nas duas afirmações que ela cita.
- O resultado esperado de um clique vem da spec: "como a tecla K" se afirma comparando com `press` aplicado ao mesmo estado, nunca com um `Ui` copiado do código do mouse. A célula clicada se acha no texto que a tela desenhou (por exemplo, a coluna de `pausa` na linha 39), não num número copiado da tela.
- Lições: L-001 (ordem de dois passos: cenário cujo resultado muda se trocam), L-004 (default da spec no módulo de config, com teste), L-010 (cada gatilho de um AC com a sua afirmação, ou o pulo de plataforma registrado), L-020 (limite da spec com o literal: 500 ms, 40 ms, 3 linhas, 4 s, 120×40), L-036 (o que o vazio significa), L-050 (cada função que a raiz do processo injeta é testada pelo processo real).
- Nunca subir `broker.ts` ou `server.ts` sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Não usar `bun x tsc`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `broker/CLAUDE.md` (comandos), `.specs/STATE.md` Handoff (como rodar a suíte), `.specs/LESSONS.md` (lições confirmadas acima). Sem limiar de cobertura configurado: valem os defaults fortes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Leitura da entrada (`tui/keys.ts`) | unit | Cada forma de relatório da spec, inteira, partida e malformada; nenhuma vira tecla nem texto | `broker/test/unit/tui-mouse-input.test.ts` | `bun test test/unit` |
| Configuração (`tui/config.ts`) | unit | Cada valor de `SQUAD_TUI_MOUSE`: ausente, vazio, `1`, `0`, inválido | `broker/test/unit/tui-config.test.ts` | `bun test test/unit` |
| Buffer (`tui/grid.ts`) | unit | `mark`, `clear` e os limites do grid | `broker/test/unit/tui-grid.test.ts` | `bun test test/unit` |
| Marcas das telas (`tui/screens/*.ts`) | unit | Cada elemento da tabela do design: a primeira e a última célula dele, e uma célula vizinha que não é dele | `broker/test/unit/tui-hits.test.ts` | `bun test test/unit` |
| Redutor do mouse (`tui/mouse.ts`) | unit | 1:1 com os ACs de CLK-05 a CLK-51 e CLK-54; cada edge case da spec; cada gatilho com a sua afirmação | `broker/test/unit/tui-mouse.test.ts` | `bun test test/unit` |
| Laço (`tui.ts` `start`) | unit | Sequências escritas e a ordem delas; tela pequena; broker sem responder; relatório partido; um `POST` por resposta | `broker/test/unit/tui-mouse-loop.test.ts` | `bun test test/unit` |
| Processo da TUI (o fim de `tui.ts`) | integration | A TUI num pseudo-terminal sobre um broker real: um clique troca de tela, o clique em `q` sai com 0 e desfaz o pedido; `SQUAD_TUI_MOUSE` inválida e `0` | `broker/test/integration/tui-mouse.test.ts` | `bun test` |
| Tela de ajuda e desvios (`tui/screens/help.ts`, `test/frames/deviations.ts`) | unit | O frame 11 com o desvio D4; os outros frames iguais | `broker/test/unit/tui-frames.test.ts` | `bun test test/unit` |
| Sonda (`tui/mouse-probe.ts`) | integration | Feita: `tui-mouse-probe.test.ts` e `test/integration/mouse-probe.test.ts` | — | `bun test` |
| Documentação e `.specs/` | none | - | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefa só com teste de unidade | `bun test test/unit` |
| Full | Depois de tarefa com teste de integração | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |
| Build | Última tarefa de cada fase, e tarefa sem teste | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |

O repositório não tem linter. A contagem de testes só cresce: no Windows, 1646 passam e 5 são pulados antes desta fatia, e 1662 com a sonda. Os testes instáveis conhecidos estão no Handoff de `.specs/STATE.md` (`EVT-43`, `PEER-28`, `PEER-29`, o caso de 2000 ms de PAP-38): rodar de novo antes de concluir que algo quebrou.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Sonda

O que o dev confere antes de tudo.

```
T1
```

### Phase 2: Leitura e alvos

A entrada reconhece o relatório, e cada tela diz o que há em cada célula.

```
T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10
```

### Phase 3: Redutor

`tui/mouse.ts`: do relatório às teclas.

```
T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18
```

### Phase 4: Laço

`tui.ts` pede os relatórios, guarda o desenho e entrega o chunk.

```
T19 → T20 → T21
```

### Phase 5: Ajuda, documentos e conferência

```
T22 → T23 → T24 → T25 → T26 → T27
```

---

## Task Breakdown

### T1: Sonda de mouse

**What**: `bun tui/mouse-probe.ts` liga os relatórios, escreve uma linha por relatório e desfaz o pedido ao sair; `MOUSE_ON` e `MOUSE_OFF` em `tui/ansi.ts`.
**Where**: `broker/tui/mouse-probe.ts`
**Depends on**: None
**Reuses**: a forma de `tui/probe.ts`
**Requirement**: CLK-17

**Done when**:

- [x] Uma linha por relatório com o botão, a coluna, a linha e `pressão` ou `soltura`; relatório partido entre leituras tem uma linha só
- [x] `q` e `ctrl+c` escrevem `ESC [ ? 1006 l` e `ESC [ ? 1000 l` e saem com 0; fora de um terminal sai com 1
- [x] Num pseudo-terminal, relatórios escritos na entrada chegam ao processo (`test/integration/mouse-probe.test.ts`)
- [x] Gate full passa: 1662 pass, 5 skip, 0 fail no Windows
- [x] RT-01: o dev roda a sonda num Windows Terminal e o resultado entra em `real-terminal.md` (T25). Entrou sem a versão e sem os quatro cantos

**Tests**: integration
**Gate**: full

Commit: `313d433`. O dev rodou a sonda num Windows Terminal em 2026-10-13 e disse que funcionou; a versão do terminal e o que ele viu entram em `real-terminal.md` na T25, e o item RT-01 fecha lá.

---

### T2: A entrada reconhece o relatório

**What**: `KEY` lê como um item só o relatório SGR (inteiro, sem os três inteiros, ou sem final) e o formato antigo; `isReport(item)`; `input` pula esses itens e continua contando-os como item do chunk; `notice` passa a ser exportada.
**Where**: `broker/tui/keys.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `KEY`, `keysOf`, `input`
**Requirement**: CLK-03, CLK-04, CLK-09, CLK-10, CLK-16, CLK-56

**Done when**:

- [x] `keysOf` devolve um item para `ESC [ < 0 ; 12 ; 5 M`, para o mesmo com `m`, para `ESC [ < 0 ; 12 M` (letra sem os três inteiros), para `ESC [ < 0 ; 1` no fim da entrada e para `ESC [ M` com três caracteres; as teclas antes e depois de cada um continuam sendo os itens que eram
- [x] CLK-04: `input` com o modal no modo texto e cada uma dessas formas não acrescenta caractere ao texto; sem modal, não troca de tela (o `1` e o `2` de dentro do relatório não são teclas)
- [x] CLK-10: os três caracteres depois de `ESC [ M` não são teclas, também quando um deles é `q`
- [x] CLK-16: `input` com um relatório e um `\r` no mesmo chunk, modal aberto: um espaço no modo texto, nada no modo escolha, `send` continua `null`
- [x] CLK-56: `test/unit/tui-keys.test.ts` passa sem alteração
- [x] Testes em `test/unit/tui-mouse-input.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T3: `SQUAD_TUI_MOUSE`

**What**: `mouseOn(env)`: verdadeiro para ausente, vazia e `1`; falso para `0`; outro valor lança com a variável e o valor.
**Where**: `broker/tui/config.ts`
**Depends on**: T2
**Reuses**: a forma de `readIntervalMs`
**Requirement**: CLK-52, CLK-53

**Done when**:

- [x] Cinco casos, um por valor: ausente, `""`, `"1"`, `"0"`, `"sim"`; o erro de `"sim"` cita `SQUAD_TUI_MOUSE` e `sim`
- [x] ` 0`, `00`, `true` e `off` também lançam
- [x] Testes em `test/unit/tui-config.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T4: Camada de alvos do grid

**What**: o tipo `Hit`, a camada `hits` de 40 × 120 e `mark(x, y, w, h, hit)`; `clear` apaga as marcas da região.
**Where**: `broker/tui/grid.ts`
**Depends on**: T3
**Reuses**: a forma de `bg` e `clear`
**Requirement**: CLK-14

**Done when**:

- [x] Um grid novo tem toda célula `null`; `mark` marca só o retângulo, e o que cai fora do grid não lança
- [x] Uma segunda marca sobre a mesma célula substitui a primeira
- [x] `clear` apaga as marcas da região e deixa as vizinhas
- [x] `Cell` não ganha campo: `text()` e `paint` dão o mesmo para um grid com e sem marcas
- [x] Testes em `test/unit/tui-grid.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T5: Marcas das linhas 0, 1 e 38

**What**: `chrome` marca cada aba, o contador ` ? N ` e o selo de gate e o de permissão; `stats` marca o rótulo de custo.
**Where**: `broker/tui/screens/chrome.ts`
**Depends on**: T4
**Reuses**: as colunas que `chrome` e `stats` já calculam
**Requirement**: CLK-18, CLK-23, CLK-36, CLK-37, CLK-38, CLK-39

**Done when**:

- [x] Cada aba: a primeira e a última célula dela têm a tecla dela (`1`, `2`, `3`, `4`, `?`), na aba ativa e nas outras; o contador da `4 perguntas` tem `4`; a célula entre duas abas não tem marca
- [x] ` ? N ` tem `4` nas células dele, com N de um e de dois dígitos; a célula antes e a depois não
- [x] Num frame com gate pendente e num com permissão pendente, o selo tem `g` ou `x` em todas as células dele; num frame com outro selo (bloqueado, offline, parado, escalado), ele não tem marca
- [x] De `│` até o fim de ` est.` tem `t`, com `feature` e com `sessão`; os tokens à esquerda e o lado direito da linha 38 não
- [x] Testes em `test/unit/tui-hits.test.ts`, com as `View` dos frames
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T6: Marcas dos atalhos

**What**: `drawKeys(g, y, keys, modal = false)` marca cada atalho: simples (tecla e descrição), de duas teclas (só o caractere de cada tecla), de faixa (nada).
**Where**: `broker/tui/screens/chrome.ts`
**Depends on**: T5
**Reuses**: `drawKeys`
**Requirement**: CLK-33, CLK-34, CLK-35

**Done when**:

- [x] Cada atalho simples da spec, um caso por rótulo: `tab`, `enter`, `esc`, `b`, `g`, `x`, `p`, `h`, `?`, `q`, `ctrl+e`, `ctrl+u`, com a tecla que o terminal manda (`\t`, `\r`, `\x1b`, `\x05`, `\x15` e a própria letra)
- [x] A primeira e a última célula da tecla e da descrição têm a marca; o espaço entre as duas e os três espaços depois não
- [x] `j/k`, `[ ]` e `↑↓`: cada caractere de tecla tem a tecla dele; o separador e a descrição não têm marca
- [x] `1-4` e `1-3` não têm marca em célula alguma; um rótulo que a tabela não conhece também não
- [x] Com `modal` verdadeiro toda marca tem `modal: true`
- [x] A linha inteira é apagada antes: um atalho mais curto desenhado por cima não deixa a marca do anterior
- [x] Testes em `test/unit/tui-hits.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T7: Marcas da tela principal

**What**: `main` marca as três caixas com o painel, a do feed com a roda, cada linha de evento do feed com o `seq` e cada linha de ticket com o `ticket_ref`.
**Where**: `broker/tui/screens/main.ts`
**Depends on**: T6
**Reuses**: as coordenadas de `agents`, `tickets` e `feedPanel`
**Requirement**: CLK-19, CLK-20, CLK-22, CLK-27, CLK-28

**Done when**:

- [x] Os quatro cantos de cada caixa têm o painel dela (0, 1, 2); as linhas 0, 1, 38 e 39 não têm `panel`
- [x] Toda célula da caixa do feed tem `wheel: "feed"`; as outras duas caixas não têm `wheel`
- [x] Cada linha de evento desenhada tem o `seq` dela nas colunas 29 a 84, com a seleção fora da janela e dentro dela; a régua, a faixa e o cabeçalho não têm `row`
- [x] Com três tickets, as duas linhas de cada um têm o `ticket_ref`; com quatro a sete, a linha única; com mais de sete, a linha `+N tickets` não tem `ticket`; sem ticket, nenhuma célula tem
- [x] Uma linha de agente tem só `panel: 0`
- [x] Testes em `test/unit/tui-hits.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T8: Marca da tela de thread

**What**: `thread` marca a caixa da esquerda com `wheel: "thread"`.
**Where**: `broker/tui/screens/thread.ts`
**Depends on**: T7
**Reuses**: a caixa que `thread` já desenha
**Requirement**: CLK-29

**Done when**:

- [x] Os quatro cantos da caixa da esquerda têm `wheel: "thread"`; a caixa da direita não tem `wheel`
- [x] Nenhuma célula da tela tem `row`, `ticket` ou `panel`
- [x] Testes em `test/unit/tui-hits.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T9: Marcas da aba Perguntas

**What**: `questions` marca a caixa da lista com a roda, cada linha desenhada de uma pergunta com o id, a caixa do histórico, e os dois atalhos da última linha do detalhe.
**Where**: `broker/tui/screens/questions.ts`
**Depends on**: T8
**Reuses**: o `y` que `list` já percorre
**Requirement**: CLK-24, CLK-25, CLK-26, CLK-30, CLK-31, CLK-33

**Done when**:

- [x] Cada pergunta desenhada tem o id dela na cabeça, em cada linha do texto, na linha de opções ou de default e na de rota, nas colunas 1 a 58; a linha vazia entre duas perguntas e a legenda da linha 24 não têm `question`
- [x] Com mais perguntas do que cabem, só as desenhadas têm marca
- [x] Toda célula da caixa da lista tem `wheel: "list"`; toda célula da caixa do histórico tem `history` e `wheel: "history"`; a caixa do detalhe não tem `wheel`
- [x] Na linha `enter responder   b próxima bloqueante`, `enter` e `responder` têm `\r`, `b` e `próxima bloqueante` têm `b`, e os espaços entre eles não têm marca; sem pergunta aberta a linha não existe e nada é marcado
- [x] Testes em `test/unit/tui-hits.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T10: Marcas do modal de resposta

**What**: `answer` marca, com `modal: true`, as linhas 0 a 38 fora da caixa como `esc`, a caixa sem tecla, cada linha de opção e a de `outra resposta…` com o índice, e os atalhos da linha 39.
**Where**: `broker/tui/screens/answer.ts`
**Depends on**: T9
**Reuses**: `drawModal`, `drawKeys`
**Requirement**: CLK-40, CLK-41, CLK-42, CLK-43, CLK-44, CLK-45

**Done when**:

- [x] Nenhuma célula das 40 linhas fica com marca sem `modal`: as abas, as perguntas da lista e o histórico por baixo do modal deixam de ter as marcas da aba
- [x] As células (0, 0), (119, 38) e a margem vazia de uma célula em volta da caixa têm `key: "\x1b"`; os quatro cantos da caixa não têm `key`
- [x] No modo escolha, cada opção tem o índice dela nas 80 colunas de dentro, e `outra resposta…` o índice seguinte; a borda dessas linhas não tem `option`
- [x] No modo texto e no recusado, nenhuma célula tem `option`
- [x] Linha 39: os atalhos de cada modo (escolha, texto, recusado) têm a tecla e `modal: true`; `1-3` não tem marca; o resto da linha não tem marca
- [x] Sem modal, ou com o modal de uma pergunta que não está na feature, `answer` devolve o grid com as marcas da aba
- [x] Testes em `test/unit/tui-hits.test.ts`, com os frames 05, 06, 20a e 20b
- [x] Gate build passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: unit
**Gate**: build

---

### T11: `parse`

**What**: `parse(item)`: o botão, a coluna, a linha e pressão ou soltura de um relatório; `null` para qualquer outro item. `Report`, `Pointer`, `Drawn` e `Entry`.
**Where**: `broker/tui/mouse.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `isReport`
**Requirement**: CLK-03, CLK-09, CLK-10

**Done when**:

- [x] `ESC [ < 0 ; 12 ; 5 M` dá botão 0, coluna 12, linha 5, pressão; com `m`, soltura
- [x] Dois inteiros, quatro inteiros, inteiro vazio, final que não é `M` nem `m`, sem final, e o formato antigo dão `null`
- [x] Um inteiro de 400 dígitos não lança e dá um número que nenhuma grade contém
- [x] Testes em `test/unit/tui-mouse.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T12: `point`: as guardas e a marca de tecla

**What**: `point(at, item, view, drawn)` com as sete guardas do design e o clique numa marca `key`.
**Where**: `broker/tui/mouse.ts`
**Depends on**: T11
**Reuses**: `press`
**Requirement**: CLK-05, CLK-06, CLK-11, CLK-13, CLK-14, CLK-18, CLK-23, CLK-33, CLK-34, CLK-35, CLK-36, CLK-37, CLK-38, CLK-39, CLK-51

**Done when**:

- [x] CLK-18: o clique em cada aba dá o estado de `press` com a tecla dela, um caso por aba; na aba em que a TUI já está também (o edge case do `3` no thread)
- [x] CLK-23, CLK-36, CLK-37, CLK-39: o clique em ` ? N `, no selo de gate, no de permissão e no custo dá o de `4`, `g`, `x` e `t`; CLK-38: num selo sem tecla, o estado é o mesmo objeto
- [x] CLK-33: um caso por atalho simples que as telas sem modal desenham (`tab`, `enter`, `esc`, `b`, `g`, `x`, `p`, `h`, `?`, `q`); o clique em `q` devolve `null`
- [x] CLK-34: `j`, `k`, `[` e `]`, um caso cada; o separador e a descrição não mudam nada. CLK-35: `1-4` não muda nada
- [x] CLK-06, um caso por gatilho: soltura do botão 0, botão do meio (1), direito (2), roda horizontal (66 e 67), e o bit 32 sobre o botão 0
- [x] Os bits 4, 8 e 16 no botão não mudam o que o clique faz
- [x] CLK-11: coluna 0, linha 0, coluna 121, linha 41 e o inteiro de 400 dígitos não mudam nada; coluna 120 e linha 40 valem
- [x] CLK-51: com o mouse desligado, clique e roda não mudam `ui` nem `clickedAt`
- [x] CLK-13 e a guarda de tela: com `drawn` nulo, e com o desenho de outra tela, nada muda
- [x] CLK-14: a mesma célula dá efeitos diferentes com dois desenhos diferentes
- [x] Todo clique lido com o mouse ligado põe o relógio da `View` em `clickedAt`
- [x] Testes em `test/unit/tui-mouse.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T13: `point`: painel, linha do feed e ticket

**What**: o clique numa marca `panel`, `row` e `ticket`.
**Where**: `broker/tui/mouse.ts`
**Depends on**: T12
**Reuses**: `press`, `threadTicket`
**Requirement**: CLK-19, CLK-20, CLK-21, CLK-22, CLK-27

**Done when**:

- [x] CLK-19: de cada foco para cada painel (nove casos), o estado é o de `press` com `tab` o número de vezes da tabela; a borda da caixa vale
- [x] CLK-20: linha acima e abaixo da selecionada, sem seleção, e com o feed pausado: `selected` é o `seq` clicado e o foco é 1
- [x] CLK-21: na linha selecionada, o de `enter`: a tela de thread; na linha de um `question` que espera o dev, o modal aberto com `send` nulo (edge case)
- [x] CLK-22: o ticket da linha selecionada, um antes e um depois dele: tela de thread, `threadTicket(view)` é o clicado, `threadOffset` 0; vale nas duas linhas da forma de duas linhas
- [x] CLK-27: agente, painel de detalhe, régua, faixa, cabeçalho do feed e `+N tickets` mudam só o foco; a linha 0 fora do contador e o lado direito da linha 38 não mudam nada; topologia, thread e ajuda fora das abas e dos atalhos não mudam nada
- [x] Testes em `test/unit/tui-mouse.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T14: `point`: aba Perguntas

**What**: o clique numa marca `question` e `history`.
**Where**: `broker/tui/mouse.ts`
**Depends on**: T13
**Reuses**: `press`, `selected`, `waiting`
**Requirement**: CLK-24, CLK-25, CLK-26

**Done when**:

- [x] CLK-24: na pergunta selecionada com o foco na lista, o de `enter`: o modal dela, `send` nulo
- [x] CLK-25: noutra pergunta, acima e abaixo: ela fica selecionada e o foco é a lista; na selecionada com o foco no histórico, o foco vai à lista e o modal não abre
- [x] CLK-26: na caixa do histórico com o foco na lista, o foco vai ao histórico; já com o foco nele, nada muda
- [x] O detalhe e a legenda da lista não mudam nada; o atalho `enter responder` do detalhe dá o de `enter`, e `b próxima bloqueante` o de `b`
- [x] Testes em `test/unit/tui-mouse.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T15: `point`: a roda

**What**: a roda para cima e para baixo sobre uma marca `wheel`.
**Where**: `broker/tui/mouse.ts`
**Depends on**: T14
**Reuses**: `press`
**Requirement**: CLK-28, CLK-29, CLK-30, CLK-31, CLK-32

**Done when**:

- [x] CLK-28: sobre o feed, o de `press` com `k` três vezes (cima) e `j` três vezes (baixo), com o foco 1; o literal é 3. Sem linha selecionada, a primeira das três seleciona a última (edge case). Com o foco em 0 e em 2, o foco vai a 1
- [x] CLK-29: sobre o thread, um `k` ou um `j`: `threadOffset` muda de 1
- [x] CLK-30: sobre a lista, um `k` ou um `j` com o foco na lista; partindo do foco no histórico, o foco vai à lista e a seleção anda
- [x] CLK-31: sobre o histórico, um `k` ou um `j` com o foco nele; partindo do foco na lista, o foco vai ao histórico e `historyOffset` anda
- [x] CLK-32: sobre agentes, detalhe, topologia, ajuda, a caixa da direita do thread, o detalhe da aba e as linhas 0, 1, 38 e 39, nada muda
- [x] A roda não põe nada em `clickedAt`
- [x] Testes em `test/unit/tui-mouse.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T16: `point`: o modal de resposta

**What**: com o modal aberto, o clique numa opção, em `outra resposta…`, fora da caixa, dentro dela e num atalho; o clique rápido; a roda.
**Where**: `broker/tui/mouse.ts`
**Depends on**: T15
**Reuses**: `press`
**Requirement**: CLK-40, CLK-41, CLK-42, CLK-43, CLK-44, CLK-45, CLK-46, CLK-47, CLK-48, CLK-49

**Done when**:

- [x] CLK-41: clique em cada opção marca essa opção e deixa `send` nulo, também na já marcada
- [x] CLK-42: clique em `outra resposta…` leva ao modo texto com o campo vazio, de qualquer marca de partida
- [x] CLK-43: clique na linha 0, na linha 38 e na margem em volta da caixa fecha o modal, também com texto digitado
- [x] CLK-44: contexto, texto da pergunta, campo de texto, aviso e borda não mudam nada
- [x] CLK-45, um caso por tecla: `enter` no modo escolha deixa em `send` a opção marcada; `enter` no modo texto envia o texto, e não envia o vazio nem o só de espaços; `esc` fecha; `ctrl+e` alterna; `ctrl+u` esvazia; `↑` e `↓` movem a marca; `1-N` não muda nada
- [x] CLK-40: uma marca sem `modal` com o modal aberto, e uma com `modal` sem modal aberto, não mudam nada
- [x] CLK-46: o clique 499 ms depois do anterior não muda nada, em opção, em `enter confirmar` e fora da caixa; o de 500 ms vale (edge case); o terceiro clique de um triplo também é ignorado; o clique que abre o modal 100 ms depois de outro vale
- [x] O clique duplo em `enter abrir` sobre uma pergunta: o modal abre e `send` continua nulo
- [x] CLK-47: com `sending`, nenhum clique muda o modal; com `refused`, só o de fora da caixa e o do atalho `esc`
- [x] CLK-48: a roda sobre qualquer célula não muda nada
- [x] CLK-49: de todos os cliques desta lista, só o do atalho `enter` deixa `send` diferente de nulo
- [x] Testes em `test/unit/tui-mouse.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T17: `take`

**What**: `take(at, chunk, view, more, drawn)`: os itens do chunk um a um, na ordem; `m` liga e desliga com o aviso.
**Where**: `broker/tui/mouse.ts`
**Depends on**: T16
**Reuses**: `input`, `keysOf`, `isReport`, `notice`
**Requirement**: CLK-15, CLK-16, CLK-50, CLK-54, CLK-56

**Done when**:

- [x] CLK-15: tecla e depois clique, e clique e depois tecla, no mesmo chunk, dão resultados diferentes, cada um igual ao das duas coisas aplicadas nessa ordem (L-001)
- [x] Três relatórios da roda num chunk valem os três
- [x] `enter` que abre o modal e um clique no mesmo chunk: o clique não faz nada e `send` continua nulo
- [x] CLK-16: relatório e `\r`, relatório e `\n`, nas duas ordens, com o modal aberto: espaço no modo texto, nada no modo escolha, `send` nulo
- [x] CLK-50: `m` com o mouse ligado dá `on` falso e o aviso `mouse desligado · o terminal seleciona texto` com `until` 4000 ms depois; de novo, `on` verdadeiro e `mouse ligado`
- [x] CLK-54: com o modal no modo texto, `m` entra no texto e `on` não muda; no modo escolha, nada muda
- [x] CLK-56: para cada chunk sem relatório e sem `m` dos casos de `tui-keys.test.ts` que esta tarefa reusa, `take` dá o mesmo `ui` que `input`; `q` e `ctrl+c` devolvem `null`
- [x] Testes em `test/unit/tui-mouse.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T18: AD-021 no `STATE.md`

**What**: a regra geral do clique como decisão nova: todo efeito do mouse é o de uma tecla que já existe, e `tui/mouse.ts` só muda o estado por `press`.
**Where**: `.specs/STATE.md`
**Depends on**: T17
**Reuses**: a forma de AD-014
**Requirement**: CLK-56

**Done when**:

- [x] AD-021 em `## Decisions` com decisão, razão, trade-off, escopo (a fatia Gate incluída), data e status
- [x] Gate build passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T19: O laço pede e desfaz os relatórios

**What**: `Settings.mouse`, lido por `config` com `mouseOn`; `start` escreve `MOUSE_ON` depois de `ENTER` quando ligado e `MOUSE_OFF` antes de `LEAVE` sempre.
**Where**: `broker/tui.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `end`, `config`
**Requirement**: CLK-01, CLK-02, CLK-52, CLK-53

**Done when**:

- [x] CLK-01: com o mouse ligado, o que `start` escreve começa por `ENTER` seguido de `ESC [ ? 1000 h` e `ESC [ ? 1006 h`, nessa ordem
- [x] CLK-52: com `mouse` falso, a saída inicial é só `ENTER`
- [x] CLK-02, um caso por saída: `q`, `ctrl+c`, `stop` (o que o `SIGTERM` chama) e um erro no laço: a saída termina em `ESC [ ? 1006 l`, `ESC [ ? 1000 l` e `LEAVE`, nessa ordem, com o mouse ligado e desligado
- [x] `config` com `SQUAD_TUI_MOUSE` `0` dá `mouse` falso, ausente e vazia dão verdadeiro, e `sim` lança
- [x] Pelo processo, fora da tela alternativa: `SQUAD_TUI_MOUSE=sim bun tui.ts` sai com 1, o stderr cita a variável e `sim`, e o stdout é vazio
- [x] Pelo processo, num pseudo-terminal: com `SQUAD_TUI_MOUSE=0` a saída não tem `ESC [ ? 1000 h`; sem a variável tem, depois de `ESC [ ? 1049 h`
- [x] `test/unit/tui-loop.test.ts` só muda no ajudante `launch`, que passa `mouse: false`
- [x] Testes em `test/unit/tui-mouse-loop.test.ts` e `test/integration/tui-mouse.test.ts`
- [x] Gate full passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: integration
**Gate**: full

---

### T20: O laço entrega o chunk ao mouse

**What**: `draw` guarda o último desenho (`null` na tela pequena e na congelada); `dispatch` chama `take` e escreve `MOUSE_ON` ou `MOUSE_OFF` quando `m` muda o mouse.
**Where**: `broker/tui.ts`
**Depends on**: T19
**Reuses**: `dispatch`, `draw`, `post`
**Requirement**: CLK-05, CLK-12, CLK-13, CLK-14, CLK-49, CLK-50, CLK-51, CLK-54

**Done when**:

- [x] CLK-05: um relatório de clique na aba `2 topologia` desenha a topologia; um na linha do feed muda o detalhe; a roda sobre o feed move a seleção
- [x] CLK-14: depois de uma leitura que acrescenta uma linha ao feed, o clique na mesma célula seleciona a linha que o desenho novo tem ali
- [x] CLK-12: com o terminal de 119×40 e de 120×39, clique, roda, clique na célula de `q sair` e `m` não mudam a tela que volta com 120×40, não saem e não fazem `POST`; de volta a 120×40 o clique vale sem `MOUSE_ON` novo (edge case)
- [x] CLK-13: com o broker sem responder, clique e roda não mudam a tela que volta, e o clique na célula de `q sair` não sai
- [x] CLK-50: `m` escreve `ESC [ ? 1006 l` e `ESC [ ? 1000 l` e o aviso aparece; de novo, `ESC [ ? 1000 h` e `ESC [ ? 1006 h`; CLK-51: entre os dois, um clique não muda a tela
- [x] Saindo depois de `m`, a saída ainda termina com as sequências de CLK-02 (edge case)
- [x] CLK-49: clique numa pergunta, numa opção e em `enter confirmar` faz um `POST /answer`, com a credencial lida na hora; um clique duplo em `enter abrir` não faz nenhum; nenhum outro clique do teste faz pedido além das leituras
- [x] CLK-54: com o modal no modo texto, `m` aparece no campo e nenhuma sequência de mouse é escrita
- [x] Pelo processo, num pseudo-terminal sobre um broker real com uma feature aberta: o clique na aba `2 topologia` desenha `topologia · estrela`, e o clique em `q sair` sai com 0 com `ESC [ ? 1000 l` antes de `ESC [ ? 1049 l` (L-050)
- [x] Testes em `test/unit/tui-mouse-loop.test.ts` e `test/integration/tui-mouse.test.ts`
- [x] Gate full passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: integration
**Gate**: full

---

### T21: O relatório partido entre leituras

**What**: `key` segura o começo de um relatório no fim do chunk (`ESC [ <` com dígitos e `;`, e `ESC [ M` com até dois caracteres) e o descarta se o resto não chega em 40 ms.
**Where**: `broker/tui.ts`
**Depends on**: T20
**Reuses**: `pending`, `escapeTimer`
**Requirement**: CLK-07, CLK-08, CLK-10

**Done when**:

- [x] CLK-07: o relatório do clique numa aba, cortado em cada posição entre dois caracteres (duas chamadas de `key`) e em três pedaços, troca de tela uma vez e nada mais
- [x] CLK-08: `ESC [ < 0 ; 1` sem o resto: 40 ms depois a tela é a mesma, sem modal o estado não mudou, e com o modal no modo texto o campo continua vazio; o literal é 40
- [x] CLK-10: `ESC [ M` e os três caracteres em duas leituras não viram tecla, também com `q` entre eles
- [x] Um `esc` sozinho ainda volta à tela principal depois de 40 ms, e uma seta partida ainda move a seleção (TUI-61 e os testes de `tui-loop.test.ts` passam sem alteração)
- [x] Testes em `test/unit/tui-mouse-loop.test.ts`
- [x] Gate build passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: unit
**Gate**: build

---

### T22: A linha `m` da ajuda

**What**: a linha 10 do painel de atalhos passa a ser `m` com `mouse liga / desliga · clique = tecla`; a classe D4 e o desvio do frame 11.
**Where**: `broker/tui/screens/help.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `key` de `help.ts`; `d` de `test/frames/deviations.ts`
**Requirement**: CLK-55, CLK-57

**Done when**:

- [x] A linha 10 da ajuda, colunas 62 a 117, é `m           mouse liga / desliga · clique = tecla`
- [x] `Deviation.class` aceita `D4`; o frame 11 tem um desvio D4 na linha 10, com o porquê citando CLK-55; nenhum outro frame tem D4
- [x] As linhas 25 a 28 e 30 a 33 da ajuda continuam vazias
- [x] `tui-frames.test.ts` muda em duas afirmações e em nenhuma outra: a lista de classes de TUI-43 ganha `D4`, e a lista de desvios do frame 11 em TUI-49 ganha a linha D4
- [x] CLK-57: todo outro frame desenha as 40 linhas de antes
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T23: `broker/CLAUDE.md`

**What**: `tui/mouse.ts`, a camada de alvos, `take` no laço e `SQUAD_TUI_MOUSE` na descrição da arquitetura.
**Where**: `broker/CLAUDE.md`
**Depends on**: T22
**Reuses**: as entradas de `tui.ts`, `tui/keys.ts` e `tui/grid.ts`
**Requirement**: CLK-50, CLK-52

**Done when**:

- [x] As entradas de `tui.ts`, `tui/keys.ts`, `tui/grid.ts` e `tui/screens/` dizem o que mudou; `tui/mouse.ts` tem a sua
- [x] Gate build passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T24: `broker/README.md`

**What**: o mouse na seção da TUI (o que é clicável, a tecla `m`, `shift` + arrasto) e `SQUAD_TUI_MOUSE` na tabela de variáveis.
**Where**: `broker/README.md`
**Depends on**: T23
**Reuses**: a tabela de variáveis e a seção da sonda de glifos
**Requirement**: CLK-50, CLK-52, CLK-53

**Done when**:

- [x] A tabela tem `SQUAD_TUI_MOUSE` com o default, o `0` e o que um valor inválido faz
- [x] A seção da TUI diz que o clique vale pela tecla do elemento, como desligar o mouse para selecionar texto, e como rodar a sonda
- [x] Gate build passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T25: Conferência em terminal real

**What**: `real-terminal.md` com o resultado de RT-01 a RT-08: o terminal, a versão e a data de cada item, e o que ficou sem conferir. O dev roda; o agente prepara o broker de teste e registra.
**Where**: `.specs/features/tui-clicavel/real-terminal.md`
**Depends on**: T24
**Reuses**: `tui/demo.ts`, que sobe um broker de teste com o log de um frame e a TUI sobre ele
**Requirement**: CLK-17, CLK-01, CLK-02

**Done when**:

- [x] RT-01 tem o resultado da sonda no Windows Terminal, com a versão. Sem a versão nem os quatro cantos: o dev disse que funcionou e não disse o que viu
- [x] RT-02 a RT-07 têm o resultado do dev, ou a linha "não conferido" com o motivo. Os seis estão "não conferido", por decisão do dev em 2026-10-14
- [x] RT-08 tem o resultado num terminal Linux, ou "não exercitado"
- [x] Um defeito que a conferência achar vira tarefa nova antes do fechamento. Nenhum: a conferência não rodou
- [x] Gate build passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T26: A suíte no Linux

**What**: `tsc` e `bun test` num contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps`, sobre um clone limpo do branch, com as contagens registradas na spec; de novo no Windows sobre o mesmo commit.
**Where**: `.specs/features/tui-clicavel/spec.md`
**Depends on**: T25
**Reuses**: o procedimento do Handoff de `.specs/STATE.md`
**Requirement**: CLK-56, CLK-57

**Done when**:

- [x] A seção "Success Criteria" da spec tem as contagens do Windows e do Linux com o commit, ou diz qual dos dois ficou sem rodar e por quê
- [x] Gate build passa nos dois: `bun node_modules/typescript/bin/tsc --noEmit && bun test`. Em `b63acf8`: Windows com Bun 1.3.14, porque o 1.4.2 não está mais instalado na máquina; Linux com o 1.4.2 do contêiner

**Tests**: none
**Gate**: build

---

### T27: Fechamento

**What**: o status dos 57 requisitos na spec, a fatia marcada em `ROADMAP.md` e o Handoff de `.specs/STATE.md` apontando para a Gate.
**Where**: `ROADMAP.md`
**Depends on**: T26
**Reuses**: o fechamento das fatias anteriores
**Requirement**: CLK-56

**Done when**:

- [x] A tabela de rastreabilidade da spec tem a tarefa e o status de cada requisito. Os 57 seguem `Implementing` até o Verifier
- [x] `ROADMAP.md` marca a fatia e atualiza o "Agora"
- [x] O Handoff diz o que a fatia deixa para a Gate e o que ficou sem conferir
- [x] Gate build passa: `bun node_modules/typescript/bin/tsc --noEmit && bun test`. `tsc` 0; `bun test` com 2072 pass, 5 skip e 1 fail, `EVT-43`, que falha igual na `main` em `36440a6` com o Bun 1.3.14 desta máquina (spec, "Success Criteria"). Nenhum teste da fatia falhou

**Tests**: none
**Gate**: build


---

### F1: CLK-10 no terminal pequeno

Da volta 1 do Verifier (`validation.md`, Fix 1): o mutante M31, que na tela pequena procura `q` caractere a caractere em vez de item a item de `keysOf`, sobreviveu.

**What**: um teste de CLK-10 no laço com o terminal menor que 120×40: o relatório antigo `ESC [ M q!`, inteiro e partido em duas leituras, não sai da TUI nem pede nada ao broker, e a tela que volta em 120×40 é a de antes.
**Where**: `broker/test/unit/tui-mouse-loop.test.ts`
**Depends on**: T27
**Requirement**: CLK-10

**Done when**:

- [ ] Em 119×40 e em 120×39, `t.raw` fica `[true]`, só há `GET`, e em 120×40 a tela principal é a de antes
- [ ] O teste mata o M31 (`broker/tui.ts:182`, `keysOf(chunk)` → `[...chunk]`)
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick
---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1
Phase 2:  T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18
Phase 4:  T19 → T20 → T21
Phase 5:  T22 → T23 → T24 → T25 → T26 → T27
```

Lotes de execução (fases inteiras, perto de 7 tarefas por worker): fase 2 (9 tarefas); fase 3 (8); fases 4 e 5 até a T24 ficam com o orquestrador, porque a fase 5 precisa do dev no terminal (T25) e do Docker (T26).

Depois da última tarefa, fora da lista: o Verifier numa cópia física com `bun install` próprio, até três voltas de correção; `validate_state.py tui-clicavel`; as lições. O `git push` e o PR pedem o sim do dev na hora.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Sonda | 1 arquivo, 1 comando | ✅ Granular |
| T2: A entrada reconhece o relatório | 1 expressão e o laço que a usa | ✅ Granular |
| T3: `SQUAD_TUI_MOUSE` | 1 função | ✅ Granular |
| T4: Camada de alvos | 1 camada e 2 funções do mesmo módulo | ✅ Granular |
| T5: Marcas das linhas 0, 1 e 38 | 2 funções do mesmo arquivo, coesas | ⚠️ OK |
| T6: Marcas dos atalhos | 1 função | ✅ Granular |
| T7: Marcas da tela principal | 1 tela | ✅ Granular |
| T8: Marca do thread | 1 marca | ✅ Granular |
| T9: Marcas da aba Perguntas | 1 tela | ✅ Granular |
| T10: Marcas do modal | 1 tela | ✅ Granular |
| T11: `parse` | 1 função e 4 tipos | ✅ Granular |
| T12: `point`: guardas e tecla | 1 função, o tronco dela | ✅ Granular |
| T13: `point`: painel, linha, ticket | 1 ramo da função | ✅ Granular |
| T14: `point`: aba Perguntas | 1 ramo | ✅ Granular |
| T15: `point`: a roda | 1 ramo | ✅ Granular |
| T16: `point`: o modal | 1 ramo | ✅ Granular |
| T17: `take` | 1 função | ✅ Granular |
| T18: AD-021 | 1 entrada | ✅ Granular |
| T19: O laço pede e desfaz | 1 campo e 2 escritas | ✅ Granular |
| T20: O laço entrega o chunk | `draw` e `dispatch` de `start`, coesos | ⚠️ OK |
| T21: O relatório partido | 1 função | ✅ Granular |
| T22: A linha `m` | 1 linha e o desvio dela | ✅ Granular |
| T23: `broker/CLAUDE.md` | 1 arquivo | ✅ Granular |
| T24: `broker/README.md` | 1 arquivo | ✅ Granular |
| T25: Conferência | 1 documento | ✅ Granular |
| T26: Suíte no Linux | 1 registro | ✅ Granular |
| T27: Fechamento | 3 documentos do fechamento, coesos | ⚠️ OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | None (a fase anterior inteira) | início da fase 2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | None (a fase anterior inteira) | início da fase 3 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | None (a fase anterior inteira) | início da fase 4 | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |
| T21 | T20 | T20 → T21 | ✅ Match |
| T22 | None (a fase anterior inteira) | início da fase 5 | ✅ Match |
| T23 | T22 | T22 → T23 | ✅ Match |
| T24 | T23 | T23 → T24 | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |
| T26 | T25 | T25 → T26 | ✅ Match |
| T27 | T26 | T26 → T27 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Sonda | integration | integration | ✅ OK |
| T2 | Leitura da entrada | unit | unit | ✅ OK |
| T3 | Configuração | unit | unit | ✅ OK |
| T4 | Buffer | unit | unit | ✅ OK |
| T5 a T10 | Marcas das telas | unit | unit | ✅ OK |
| T11 a T17 | Redutor do mouse | unit | unit | ✅ OK |
| T18 | `.specs/` | none | none | ✅ OK |
| T19 | Laço e processo da TUI | unit e integration | integration | ✅ OK |
| T20 | Laço e processo da TUI | unit e integration | integration | ✅ OK |
| T21 | Laço | unit | unit | ✅ OK |
| T22 | Tela de ajuda e desvios | unit | unit | ✅ OK |
| T23, T24 | Documentação | none | none | ✅ OK |
| T25 a T27 | `.specs/` e documentação | none | none | ✅ OK |
