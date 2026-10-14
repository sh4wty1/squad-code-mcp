# TUI clicável Validation

**Date**: 2026-10-14
**Round**: Volta 1 de 3
**Spec**: `.specs/features/tui-clicavel/spec.md`
**Diff range**: `36440a6..5441e1c` (branch `feat/tui-clicavel`)
**Verifier**: independent sub-agent (author ≠ verifier), numa cópia física (`git clone` + `bun install --frozen-lockfile`), Bun 1.3.14, Windows 11

**Overall**: ❌ FAIL

Uma lacuna só, de teste e não de produção: CLK-10 diz "em qualquer tamanho do terminal", e nenhum teste manda um relatório no formato antigo com um `q` dentro a um terminal menor que 120×40. O mutante M31 (a tela pequena lendo o chunk caractere a caractere) sobrevive. O código de hoje faz o certo, porque `keysOf` agrupa `ESC [ M` e os três caracteres; falta a afirmação que segura isso. Os outros 56 requisitos têm evidência que bate com a saída da spec, a suíte passa, e 31 dos 33 mutantes morreram (os dois vivos além do M31 são equivalentes, ver o sensor).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `313d433`. RT-01 registrada sem versão do terminal e sem os quatro cantos |
| T2 | ✅ Done | `e0cc06e` |
| T3 | ✅ Done | `053576b` |
| T4 | ✅ Done | `8d153e2` |
| T5 | ✅ Done | `c6e46fe`, `2622949` |
| T6 | ✅ Done | `e377bab` |
| T7 | ✅ Done | `0c4e473` |
| T8 | ✅ Done | `a426ae3` |
| T9 | ✅ Done | `2eabd05` |
| T10 | ✅ Done | `726f1e6` |
| T11 | ✅ Done | `0fd0088` |
| T12 | ✅ Done | `889a268`, `0ae5896` |
| T13 | ✅ Done | `6965f6b` |
| T14 | ✅ Done | `5966934` |
| T15 | ✅ Done | `5e2b8e2` |
| T16 | ✅ Done | `bc7f11d` |
| T17 | ✅ Done | `f0cb767` |
| T18 | ✅ Done | `9d5f345`; AD-021 em `.specs/STATE.md:167` |
| T19 | ✅ Done | `b958711` |
| T20 | ✅ Done | `8b68837` |
| T21 | ✅ Done | `87739b1` |
| T22 | ✅ Done | `ba3eb25` |
| T23 | ✅ Done | `18eed8d` |
| T24 | ✅ Done | `5744614` |
| T25 | ⚠️ Done com conferência não feita | `08f3c88`. RT-02 a RT-07 "não conferido" e RT-08 "não exercitado", por decisão do dev em 2026-10-14. Não é lacuna de teste |
| T26 | ✅ Done | `4b9b0eb` |
| T27 | ✅ Done | `5441e1c` |

---

## Spec-Anchored Acceptance Criteria

Caminhos relativos a `broker/`. `M` = `test/unit/tui-mouse.test.ts`, `L` = `test/unit/tui-mouse-loop.test.ts`, `I` = `test/unit/tui-mouse-input.test.ts`, `H` = `test/unit/tui-hits.test.ts`, `IT` = `test/integration/tui-mouse.test.ts`, `MP` = `test/integration/mouse-probe.test.ts`, `P` = `test/unit/tui-mouse-probe.test.ts`, `C` = `test/unit/tui-config.test.ts`, `HE` = `test/unit/tui-mouse-help.test.ts`.

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| CLK-01 | `ESC[?1000h` e `ESC[?1006h` depois de entrar na tela alternativa | `L:97` `expect(t.out).toBe(ENTER + "\x1b[?1000h" + "\x1b[?1006h")`; `IT:61` `expect(seen.text.indexOf(ON)).toBeGreaterThan(seen.text.indexOf(ALTERNATE))` | ✅ PASS |
| CLK-02 | `ESC[?1006l` e `ESC[?1000l` antes de deixar a tela alternativa, por `q`, `ctrl+c`, `SIGTERM`, erro e clique em `q`, mouse ligado ou não | `L:129` `expect(tui.t.out.endsWith("\x1b[?1006l" + "\x1b[?1000l" + LEAVE)).toBe(true)` (q, ctrl+c, `stop`, erro × ligado/desligado); `IT:117` `expect(seen.text.indexOf(BACK)).toBeGreaterThan(seen.text.lastIndexOf("\x1b[?1000l"))` (clique em `q sair`, processo real) | ✅ PASS |
| CLK-03 | `ESC [ < b ; x ; y` + `M`/`m` é relatório, em qualquer tamanho | `M:68` `expect(parse("\x1b[<0;12;5M")).toEqual({ button: 0, x: 12, y: 5, pressed: true })`; `I:35` `expect(keysOf(report)).toEqual([report])`; tela pequena: `L:233` `expect(t.raw).toEqual([true])` | ✅ PASS |
| CLK-04 | Nenhum caractere de relatório vira tecla nem texto | `I:64` `expect(input(v.ui, report, v)).toBe(v.ui)`; `I:72` (cinco telas); `I:80` só `"ab"` entra no texto | ✅ PASS |
| CLK-05 | Clique e roda fazem o que as histórias definem | `L:162` `expect(t.lines()).toEqual(topology(...).text())`; `L:176`; `L:190`; `IT:111` `waitFor(() => text().includes("topologia · estrela"))` | ✅ PASS |
| CLK-06 | Soltura, meio, direito, roda horizontal e bit 32: nada | `M:343` `expect(next.ui).toBe(v.ui)` e `M:345` `expect(next.pointer).toEqual(ON)` (11 gatilhos) | ✅ PASS |
| CLK-07 | Relatório partido entre leituras é um só | `L:406`/`L:409` cortado em cada posição e em três: tela principal até o último pedaço, depois `help(...)`; `L:414` `expect(t.raw).toEqual([true])` | ✅ PASS |
| CLK-08 | Começo sem resto em 40 ms: descartado, sem tecla nem texto | `L:440` `expect(delays(() => key("\x1b[<0;1"))).toEqual([40])`; `L:443`; `L:486` campo vazio | ✅ PASS |
| CLK-09 | `ESC [ <` até uma letra sem os três inteiros: descartado inteiro | `M:92` `expect(parse(item)).toBeNull()`; `I:92`-`I:93` `toBe(main.ui)` / `toBe(text.ui)`, também com `q` | ✅ PASS |
| CLK-10 | `ESC [ M` + 3 caracteres: descartados, **em qualquer tamanho do terminal** | 120×40: `I:101`, `L:506` `expect(t.raw).toEqual([true])` com `q` dentro. Terminal pequeno: **nenhuma** (M31 sobrevive) | ❌ GAP |
| CLK-11 | Coluna fora de 0..119 ou linha fora de 0..39: nada | `M:379` `expect(sent(column, line).ui).toBe(v.ui)` para 0, 121, 41 e 400 dígitos; `M:375` 120 e 40 valem; `M:391` | ✅ PASS |
| CLK-12 | Terminal pequeno: sem mudança, sem saída, sem `POST` | `L:233` `expect(t.raw).toEqual([true])`; `L:238`; `L:239` `t.calls.every(call => call.method === "GET")` | ✅ PASS |
| CLK-13 | Broker sem responder: sem mudança e sem saída por relatório | `L:262`-`L:263`; `M:412` `point(..., null)!.ui).toBe(v.ui)` | ✅ PASS |
| CLK-14 | O alvo é o do último desenho | `M:437`-`M:442`; `M:649`-`M:650`; `L:215` | ✅ PASS |
| CLK-15 | Relatórios e teclas de uma leitura, na ordem | `M:1541`, `M:1547` (L-001: as duas ordens dão resultados diferentes); `M:1554`-`M:1558`; `M:1565` | ✅ PASS |
| CLK-16 | Relatório + `\r`/`\n` com modal: espaço no texto, nada na escolha, sem envio | `M:1610` `toEqual({... text: "logo " })`, `M:1611` `send` nulo, `M:1613`; `I:114`-`I:118` | ✅ PASS |
| CLK-17 | Sonda: liga, uma linha por relatório, `q`/`ctrl+c` desfazem e saem com 0; fora de terminal sai com 1 | `P:5`, `P:9`, `P:24`; `MP:32`-`MP:44` linha de pressão, soltura e roda, `exited` 0, `OFF` depois de `ON`; `MP:56`; `MP:23` `expect(await proc.exited).toBe(1)` | ✅ PASS |
| CLK-18 | Aba (e contador da `4 perguntas`) como `1`..`4`, `?` | `M:138` `expect(next.ui).toEqual(press(v.ui, key, v)!)` de cada tela, primeira e última célula; `M:150`; `H:65` | ✅ PASS |
| CLK-19 | Clique num painel: foco 0, 1 ou 2, borda incluída | `M:499` `toEqual(keys(v, ...tabs(focus, panel))!)` nos nove pares, quatro cantos; `M:511` | ✅ PASS |
| CLK-20 | Linha não selecionada do feed: selecionada, pausado ou não | `M:542`-`M:544` `toEqual(keys(v, ...moves)!)`, `[selected, focus, paused]`; `M:557` sem seleção | ✅ PASS |
| CLK-21 | Linha selecionada: como `enter` | `M:600` `toEqual(press(v.ui, "\r", v)!)`; `M:616` edge case da pergunta, `send` nulo | ✅ PASS |
| CLK-22 | Ticket: thread dele, na entrada mais recente, nas duas linhas | `M:678`-`M:679` `["thread", ref, 0, 0]`; `M:688`, `M:693`, `M:706` | ✅ PASS |
| CLK-23 | `? N` como `4` | `M:172` `toEqual(press(v.ui, "4", v)!)` de cada tela, com os dois espaços | ✅ PASS |
| CLK-24 | Pergunta selecionada, foco na lista: como `enter`, sem envio | `M:822`-`M:824` `toEqual(press(v.ui, "\r", v)!)`, `send` nulo | ✅ PASS |
| CLK-25 | Outra pergunta: selecionada, foco na lista | `M:838`-`M:840`; `M:853`-`M:864`; `M:875`-`M:886` | ✅ PASS |
| CLK-26 | Caixa do histórico: foco no histórico | `M:898` `toEqual(press(v.ui, "h", v)!)`; `M:902` já com o foco: `toBe(there.ui)` | ✅ PASS |
| CLK-27 | Célula sem regra: no máximo o foco de CLK-19 | `M:724`-`M:748`; `M:757`, `M:764` `toBe(v.ui)`; `M:773` (topologia, thread, ajuda, linhas 2..37); `M:913` | ✅ PASS |
| CLK-28 | Roda no feed: foco 1 e três `k`/`j` | `M:982` `toEqual(keys(v, key, key, key)!)`, `M:986` dois ou quatro dão outra linha; `M:993`; `M:1005`; `L:190` | ✅ PASS |
| CLK-29 | Roda no thread: um `k`/`j` | `M:1022` `toEqual(press(v.ui, key, v)!)`, `M:1023` `threadOffset` ±1 | ✅ PASS |
| CLK-30 | Roda na lista: foco na lista, um `k`/`j` | `M:1037`-`M:1038` | ✅ PASS |
| CLK-31 | Roda no histórico: foco nele, um `k`/`j` | `M:1051`-`M:1052` | ✅ PASS |
| CLK-32 | Roda fora das quatro caixas: nada | `M:1085` `toBe(v.ui)` em toda célula fora delas, cinco telas | ✅ PASS |
| CLK-33 | Atalho simples (tecla ou descrição): como a tecla | `M:245` `expect(next?.ui ?? null).toEqual(press(v.ui, key, v))` (dez rótulos), `M:249` espaços inertes; `M:944`, `M:952` (detalhe); `ctrl+e`/`ctrl+u` em `M:1299`, `M:1308` | ✅ PASS |
| CLK-34 | Duas teclas: o caractere da tecla; separador e descrição nada | `M:267`, `M:270`, `M:273`; `M:281`, `M:284`, `M:286`-`M:287`; `↑↓` em `M:1319`-`M:1324` | ✅ PASS |
| CLK-35 | Atalho de faixa: nada | `M:293` `toBe(v.ui)`; `M:1326` (`1-4 escolher`) | ✅ PASS |
| CLK-36 | Selo de gate: como `g` | `M:194`-`M:195` `toEqual(press(v.ui, key, v)!)` e o aviso `chega com a fatia Gate` | ✅ PASS |
| CLK-37 | Selo de permissão: como `x` | `M:194`-`M:195` (frames 14 e 22c) | ✅ PASS |
| CLK-38 | Outro selo: nada | `M:204` `toBe(v.ui)` (bloqueado, offline, parado, escalado); `H:151` motivo que termina em `· g` | ✅ PASS |
| CLK-39 | Custo da linha 38: como `t` | `M:213` `toEqual(press(v.ui, "t", v)!)`, `M:214`; `M:220`-`M:221` | ✅ PASS |
| CLK-40 | Com modal só CLK-41..46 | `M:453`, `M:458`, `M:1340`, `M:1347`-`M:1349` `toBe(...)`; `H:666` | ✅ PASS |
| CLK-41 | Opção: marca, não envia, também a marcada | `M:1162`-`M:1164` `toEqual(keys(...))`, `choice: option`, `send` nulo, de toda marca de partida | ✅ PASS |
| CLK-42 | `outra resposta…`: modo texto, campo vazio | `M:1181`-`M:1183` `modal: { ..., choice: null, text: "" }`, `send` nulo | ✅ PASS |
| CLK-43 | Fora da caixa nas linhas 0..38: como `esc` | `M:1212` `toEqual(closed)` em toda célula fora da caixa, com texto digitado (frames 06, 07) | ✅ PASS |
| CLK-44 | Dentro da caixa fora das linhas de opção: nada | `M:1235` `toBe(v.ui)` em toda célula da caixa | ✅ PASS |
| CLK-45 | Atalhos da linha 39 com as teclas do modal | `M:1254`-`M:1255` `send: { question_id, answer }`; `M:1268`-`M:1278` texto, vazio e só espaços não enviam; `M:1288`; `M:1299`-`M:1309`; `M:1319`-`M:1323` | ✅ PASS |
| CLK-46 | Clique < 500 ms após o anterior: nada, sem envio | `M:1365`-`M:1366` para 499, 250, 1, 0 ms em opção, `enter confirmar`, canto e margem; `M:1379`-`M:1382` com 500 ms vale; `M:1394`-`M:1401`; `M:1438`-`M:1443`; `L:371` `expect(t.posts).toEqual([])` | ✅ PASS |
| CLK-47 | Enviando: nada; recusado: só fechar | `M:1454` `toBe(v.ui)` em toda célula, clique e roda; `M:1470`-`M:1471` | ✅ PASS |
| CLK-48 | Roda com modal: nada | `M:1482`, `M:1494` `toBe(v.ui)` | ✅ PASS |
| CLK-49 | Só o clique no atalho `enter` faz `POST /answer`, um, credencial lida na hora | `M:1506` `expect(next.ui.send !== null).toBe(y === 39 && enter.includes(x))` em toda célula; `M:1522`; `L:337` corpo `{ human_token: TOKEN, question_id: 7, answer: "5 tentativas" }`, `L:338` `t.tokens` 1, `L:340` um único não-GET | ✅ PASS |
| CLK-50 | `m`: sequências e aviso de 4 s | `M:1638`-`M:1644` `until: now + 4000` e os dois textos; `L:281` `toContain("\x1b[?1006l" + "\x1b[?1000l")`, `L:283`, `L:292`, `L:294` | ✅ PASS |
| CLK-51 | Mouse desligado: relatório descartado | `M:402`-`M:403` `toBe(v.ui)` e `clickedAt` intacto; `L:288` | ✅ PASS |
| CLK-52 | `0` desliga sem `CLK-01`; ausente, vazia, `1` ligam | `C:93` `expect(mouseOn(...)).toBe(on)`; `L:106` `expect(t.out).toBe(ENTER)`; `L:140`; `IT:83` sem `\x1b[?1000h` | ✅ PASS |
| CLK-53 | Outro valor: sai com 1, mensagem com variável e valor | `C:99` `toThrow('SQUAD_TUI_MOUSE: "<v>" is not 0 or 1')`; `IT:37`-`IT:38` `exited` 1 e stderr; `IT:45` | ✅ PASS |
| CLK-54 | `m` é texto com modal; nada com terminal pequeno | `M:1677` `text: "logom"`, `M:1682`; `M:1692`; `L:541`-`L:544`; pequeno: `L:231`, `L:240` `not.toContain(OFF)` | ✅ PASS |
| CLK-55 | Linha `m  mouse liga / desliga · clique = tecla`, desvio D4 | `HE:12` `expect(keys()[10]).toBe("m           mouse liga / desliga · clique = tecla")`; `HE:19`; `HE:24` só um D4 | ✅ PASS |
| CLK-56 | Toda tecla como antes, mouse ligado ou não | `M:1733` `take` igual a `input`; `M:1767` `toEqual(press(v.ui, key, v)!)` em toda tecla de nove estados; `M:1778`; `tui-keys.test.ts` sem alteração no diff | ✅ PASS |
| CLK-57 | Frames iguais, fora a linha de CLK-55 | `test/unit/tui-frames.test.ts` mudou só nas duas afirmações de TUI-43 e TUI-49; `test/frames/*.txt` e `test/frames/view.ts` sem alteração no diff | ✅ PASS |

**Status**: ❌ uma lacuna (CLK-10, gatilho "em qualquer tamanho do terminal"); 56 de 57 com evidência que bate com a saída da spec; 8 spec-precision gaps sinalizados abaixo.

### ⚠️ Spec-precision gaps

O código decide o que a spec deixa aberto. Nenhum é defeito; cada um é uma linha que a spec poderia fixar.

| Req | O que a spec deixa aberto | O que o código e os testes fixam |
| --- | ------------------------- | -------------------------------- |
| CLK-01, CLK-02, CLK-50 | A ordem entre as duas sequências de cada par ("`ESC [ ? 1006 l` e `ESC [ ? 1000 l`") | `1000h` depois `1006h`; `1006l` depois `1000l` (`L:97`, `L:129`) |
| CLK-46 | O que é "o clique anterior": se conta o clique que não fez nada (fora da grade, na tela congelada, sem desenho, antes de o modal abrir) e por qual relógio | Todo clique lido com o mouse ligado, pelo relógio da leitura (`M:462`, `M:1386`) |
| CLK-41, CLK-44 | A borda numa linha de opção: CLK-41 diz "qualquer célula dela dentro da caixa", e a caixa inclui a borda; CLK-44 dá a borda como inerte | Borda inerte (`M:1167`) |
| CLK-09 | `ESC [ <` com dígitos que chega a um caractere que não é letra, dígito nem `;` | Descarta até ali; o caractere seguinte é tecla (`I:47`) |
| CLK-10 | Formato antigo partido ou com menos de três caracteres | Descartado como o inteiro, também depois dos 40 ms (`L:498`, `L:518`) |
| CLK-14, CLK-15 | Com que desenho se compara o segundo relatório, ou o relatório depois de uma tecla, da mesma leitura | Todos com o último desenho escrito; o clique só vale se a tela e a presença do modal não mudaram (`M:1551`, `M:1575`) |
| CLK-17 | O que a sonda faz com entrada que não é relatório | Escreve `outra entrada: …` e sai em qualquer `q` dela, também um `q` dentro de um relatório no formato antigo (`P:32`, `P:37`) |
| CLK-50 | `m` na tela congelada (CLK-54 só cita modal e terminal pequeno) | `m` liga e desliga (`M:1664`) |

---

## Edge Cases

- [x] Roda para cima sem linha selecionada: a primeira das três seleciona a última (`M:1005`-`M:1008`)
- [x] Clique na linha selecionada de um `question` que espera o dev: modal, sem envio (`M:610`)
- [x] Clique na aba em que a TUI já está: `3` no thread volta ao ticket da linha selecionada (`M:154`)
- [x] Modal aberto por clique e clique seguinte a 500 ms ou mais: regras do modal (`M:1373`, `L:374`-`L:377`)
- [x] `x` ou `y` igual a 0: fora da grade (`M:378`)
- [x] Inteiros maiores que um inteiro seguro: fora da grade (`M:109`, `M:378`)
- [x] Terminal maior que 120×40, clique fora da grade: nada (`M:385`)
- [x] Terminal volta a 120×40: cliques valem sem novo pedido (`L:243`-`L:245`)
- [x] `m` desliga e a TUI sai: sequências de CLK-02 (`L:303`)
- [x] Terminal que não manda relatório: teclado como antes (`M:1729`-`M:1772`)

---

## Gate Check

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit && bun test` (de `broker/`, na cópia física em `5441e1c`)
- **Result**: `tsc` exit 0; **2073 pass, 5 skip, 0 fail**, 83 arquivos, 141 s
- **Test count before feature**: 1646 pass, 5 skip (Windows, `36440a6`)
- **Test count after feature**: 2073 pass, 5 skip
- **Delta**: +427 testes
- **Skipped tests**: os 5 são anteriores à fatia: `cli.test.ts:355` (host isca), `cli.test.ts:390`, `server-credential.test.ts:57` e `presence.test.ts:6` (pulados no Windows), `tui-loop.test.ts:990` (QST-99 completo, só com `SQUAD_TEST_FULL`)
- **Failures**: nenhuma. `EVT-43`, que o orquestrador deu como falha constante nesta máquina com o Bun 1.3.14, passou nesta execução; se falhar sozinho numa próxima, vale o critério combinado (2072 pass, 5 skip, 1 fail só com `EVT-43`)
- **Integridade**: nenhum teste removido; `tui-keys.test.ts`, `test/frames/view.ts` e os `.txt` de `test/frames/` sem alteração; `tui-loop.test.ts` mudou só no `mouse: false` do ajudante `launch`; `tui-frames.test.ts` só nas duas afirmações do desvio D4

---

## Discrimination Sensor

Cada mutação aplicada na cópia, rodada contra os testes que a cobrem, e desfeita com `git checkout -- <arquivo>` antes da seguinte. Nenhuma morte dependeu só de teste instável (`EVT-43`, `PEER-28/29`, `EVT-90/92`, PAP-38).

| # | File:line | Mudança | Killed? |
| - | --------- | ------- | ------- |
| M01 | `broker/tui/mouse.ts:170` | Guarda de 500 ms tirada: `(wheel \|\| quick)` → `wheel` | ✅ Killed (4: CLK-46 ×3, CLK-49 no laço) |
| M02 | `broker/tui/mouse.ts:156` | Limite `< DOUBLE_MS` → `<= DOUBLE_MS` | ✅ Killed (5: edge case de 500 ms, CLK-49) |
| M03 | `broker/tui/mouse.ts:140` | Clique numa opção também confirma (`"\r"` sempre) | ✅ Killed (6: CLK-41, CLK-49) |
| M04 | `broker/tui/screens/answer.ts:46` | Fora da caixa do modal vale `enter` em vez de `esc` | ✅ Killed (18: CLK-40, CLK-43, CLK-49) |
| M05 | `broker/tui/mouse.ts:164` | Guarda de coluna `x >= COLS` → `x > COLS` | ✅ Killed (CLK-11) |
| M06 | `broker/tui/mouse.ts:164` | Guarda `y < 0` tirada | ⚪ Survived, equivalente: `drawn.hits[-1]?.[x]` é `undefined` e a guarda `!hit` devolve o mesmo estado; `M:378` já afirma o resultado de `y = 0` |
| M06b | `broker/tui/mouse.ts:164` | Guarda de linha `y >= LINES` → `y > LINES` | ✅ Killed (CLK-11) |
| M07 | `broker/tui/mouse.ts:148` | Guarda do mouse desligado tirada | ✅ Killed (3: CLK-51, CLK-50) |
| M08 | `broker/tui/mouse.ts:161` | Guarda da tela do desenho tirada (`drawn.screen !== ui.screen`) | ✅ Killed (3: CLK-14, CLK-15) |
| M09 | `broker/tui/mouse.ts:167` | Guarda de marca do modal × estado sem modal tirada | ✅ Killed (3: CLK-40, CLK-15/49) |
| M10 | `broker/tui/mouse.ts:39` | `parse` aceita inteiro vazio (`\d+` → `\d*`) | ✅ Killed (3: CLK-09) |
| M11 | `broker/tui/mouse.ts:46` | `parse` lê soltura como pressão | ✅ Killed (4: CLK-03, CLK-06) |
| M12 | `broker/tui/keys.ts:40` | `KEY` deixa de ler o formato antigo como um item | ✅ Killed (14: CLK-03, CLK-04, CLK-10) |
| M13 | `broker/tui.ts:206` | `key` deixa de segurar o relatório SGR partido | ✅ Killed (11: CLK-07) |
| M14 | `broker/tui.ts:213` | Espera de 40 ms → 400 ms | ✅ Killed (7: CLK-08 ×3, QST-84, QST-99) |
| M15 | `broker/tui/mouse.ts:62` | Passo da roda no feed 3 → 2 | ✅ Killed (7: CLK-28, CLK-05) |
| M16 | `broker/tui.ts:138` | `MOUSE_OFF` depois de `LEAVE` na saída | ✅ Killed (18: CLK-02 unidade e processo, TUI-60) |
| M17 | `broker/tui/ansi.ts:35` | Ordem dentro de `MOUSE_OFF` trocada (`1000l` antes de `1006l`) | ✅ Killed (14: CLK-02, CLK-17) |
| M18 | `broker/tui/config.ts:59` | `SQUAD_TUI_MOUSE=0` liga o mouse | ✅ Killed (3: CLK-52, unidade e processo) |
| M19 | `broker/tui/config.ts:58` | `SQUAD_TUI_MOUSE` vazia recusada | ✅ Killed (6: CLK-52, CLK-01) |
| M20 | `broker/tui.ts:227` | `MOUSE_ON` escrito com o mouse desligado | ✅ Killed (7: CLK-52, CLK-02) |
| M21 | `broker/tui/screens/answer.ts:62` | Marca da linha de opção uma célula à direita | ✅ Killed (10: CLK-41/42/44) |
| M22 | `broker/tui/screens/chrome.ts:130` | Marca da aba uma célula à direita | ✅ Killed (20: CLK-18, CLK-14) |
| M23 | `broker/tui/screens/main.ts:218` | Marca da linha do feed uma célula à esquerda | ✅ Killed (7: CLK-20) |
| M24 | `broker/tui/screens/questions.ts:221` | Espaço entre os dois atalhos do detalhe uma célula a menos | ✅ Killed (3: CLK-33) |
| M25 | `broker/tui/mouse.ts:191` | Relatório deixa de contar como item do chunk (`more \|\| items.length > 1` → `more`) | ✅ Killed (9: CLK-16) |
| M26 | `broker/tui.ts:188` | `m` muda o `Pointer` mas o laço não escreve as sequências | ✅ Killed (CLK-50) |
| M27 | `broker/tui/keys.ts:214` | `input` deixa de pular o relatório | ⚪ Survived, equivalente: `press` ignora tecla de mais de um caractere (`tui/keys.ts:101`) e nenhuma tela tem tecla igual a um relatório; `take` nunca passa relatório a `input` |
| M28 | `broker/tui.ts:128` | `drawn` guardado também na tela congelada e na pequena | ✅ Killed (CLK-13) |
| M29 | `broker/tui/mouse-probe.ts:58` | Sonda sai sem `MOUSE_OFF` | ✅ Killed (2: CLK-17) |
| M30 | `broker/tui/mouse.ts:189` | Texto do aviso de `m` encurtado | ✅ Killed (3: CLK-50) |
| M31 | `broker/tui.ts:182` | Na tela pequena, `q` procurado caractere a caractere (`keysOf(chunk)` → `[...chunk]`): `ESC [ M q!` sai da TUI | ❌ Survived → Fix 1 |

**Sensor depth**: P0 (integridade do dado: nenhum clique grava resposta por engano), 33 mutações manuais, todas as exigidas pelo orquestrador incluídas
**Result**: 30 killed, 2 equivalentes, 1 survived (M31) - ❌ FAIL

As mutações que guardam o envio (M01, M02, M03, M04, M09, M25) morreram todas, a maioria por mais de um teste, incluindo o laço com broker falso que conta os `POST`.

Isolamento: `git status --porcelain` da cópia vazio depois de cada mutação; o da árvore real vazio antes e depois do sensor.

---

## Interactive UAT Results

Não feito: o dev decidiu em 2026-10-14 fechar sem a conferência em terminal real (`real-terminal.md`). Não conta como lacuna de teste. O que depende dela:

| Critério | Depende de |
| -------- | ---------- |
| Goal 1 e Success Criterion 1: o percurso só com o mouse num terminal de 120×40 | RT-02 a RT-05 |
| Goal 4 e Success Criterion 4: o shell não recebe relatório depois de `q`, `ctrl+c` e erro | RT-07 (os testes provam as sequências e a ordem, não o terminal) |
| CLK-28 no uso real: quantos relatórios o terminal manda por passo da roda (cada um anda três linhas) | RT-04 |
| A suposição de `shift` + arrasto selecionar com o mouse ligado | RT-06 |
| Coluna e linha certas nos quatro cantos | RT-01 (registrada sem os cantos) |
| Linux interativo | RT-08 (não exercitado) |

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `tui/mouse.ts` tem 194 linhas e duas funções exportadas além de `parse`; nenhum tipo ou camada além do design |
| Surgical changes | ✅ As telas ganham só chamadas `mark`; `drawKeys` só o parâmetro `modal`; `notice` só passou a ser exportada |
| No scope creep | ✅ Nada de hover, arrasto ou rota nova; nenhum `POST` além do `/answer` (CLK-49) |
| Matches patterns | ✅ Estado novo fora de `Ui` (`Pointer`), como o design pede; comentários no estilo vizinho |
| Spec-anchored outcome check | ✅ "Como a tecla K" sempre comparado com `press`/`keys` aplicados ao mesmo estado; células achadas no texto desenhado (`at`, `cellOf`, `feedCell`) |
| Per-layer Coverage Expectation | ⚠️ Domínio 1:1 com os ACs; no laço falta o gatilho do terminal pequeno de CLK-10 (Fix 1) |
| Every test maps to a spec requirement | ✅ Todo teste novo começa por `CLK-nn` |
| Documented guidelines followed: `tasks.md` (regras do topo), `broker/CLAUDE.md`, `.specs/LESSONS.md` (L-001, L-010, L-020, L-036, L-050) | ⚠️ L-010 (cada gatilho com a sua afirmação) falha só em CLK-10 |

Observações sem tarefa:

- `broker/tui/screens/questions.ts:215`-`223` recalcula as colunas dos dois atalhos do detalhe à parte dos segmentos que os desenham (`questions.ts:176`). Se o texto mudar, a marca se desloca; `H:602` e o M24 seguram isso.
- `broker/tui/keys.ts:214` (`if (isReport(k)) continue;`) é defensivo: hoje `press` já ignora o relatório (M27 equivalente). Vale manter, porque protege CLK-04 se `press` passar a aceitar texto de mais de um caractere.
- `broker/tui/mouse.ts:164`: a guarda `y < 0` é redundante com o `?.` de `hits[y]?.[x]` (M06 equivalente). Inofensiva.

---

## Fix Plans

### Fix 1: CLK-10 sem afirmação no terminal pequeno

- **Root cause**: CLK-10 (e CLK-04 por tabela) vale "em qualquer tamanho do terminal". No terminal menor que 120×40, `dispatch` não chama `take`: só procura `q` e `ctrl+c` entre os itens de `keysOf(chunk)` (`broker/tui.ts:180`-`182`). O formato antigo com um `q` dentro só é inofensivo ali porque `KEY` o agrupa num item, e nenhum teste exercita esse caminho: o teste de CLK-12 (`L:222`) manda só relatórios SGR, que não têm `q`. O mutante M31 sobrevive.
- **Fix task**:
  - **What**: um teste de laço que, num terminal de 119×40 e de 120×39, manda o formato antigo com `q` entre os três caracteres, inteiro (`"\x1b[M q!"`) e partido entre duas leituras (`"\x1b[M "` e `"q!"`), e afirma que a TUI não sai (`t.raw` igual a `[true]`), não faz pedido além das leituras, e que de volta a 120×40 a tela é a principal sem mudança.
  - **Where**: `broker/test/unit/tui-mouse-loop.test.ts`, ao lado do teste de CLK-12 (`:221`); nome começando por `CLK-10:`.
  - **Verify**: o teste passa no código atual e falha com o M31 (`broker/tui.ts:182`, `keysOf(chunk)` → `[...chunk]`).
  - **Done when**: o teste existe, passa, mata o M31, e `bun node_modules/typescript/bin/tsc --noEmit && bun test` passa.
- **Priority**: Minor (lacuna de teste; o código está correto)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CLK-01 | Implementing | ✅ Verified |
| CLK-02 | Implementing | ✅ Verified |
| CLK-03 | Implementing | ✅ Verified |
| CLK-04 | Implementing | ✅ Verified |
| CLK-05 | Implementing | ✅ Verified |
| CLK-06 | Implementing | ✅ Verified |
| CLK-07 | Implementing | ✅ Verified |
| CLK-08 | Implementing | ✅ Verified |
| CLK-09 | Implementing | ✅ Verified |
| CLK-10 | Implementing | ❌ Needs Fix |
| CLK-11 | Implementing | ✅ Verified |
| CLK-12 | Implementing | ✅ Verified |
| CLK-13 | Implementing | ✅ Verified |
| CLK-14 | Implementing | ✅ Verified |
| CLK-15 | Implementing | ✅ Verified |
| CLK-16 | Implementing | ✅ Verified |
| CLK-17 | Implementing | ✅ Verified |
| CLK-18 | Implementing | ✅ Verified |
| CLK-19 | Implementing | ✅ Verified |
| CLK-20 | Implementing | ✅ Verified |
| CLK-21 | Implementing | ✅ Verified |
| CLK-22 | Implementing | ✅ Verified |
| CLK-23 | Implementing | ✅ Verified |
| CLK-24 | Implementing | ✅ Verified |
| CLK-25 | Implementing | ✅ Verified |
| CLK-26 | Implementing | ✅ Verified |
| CLK-27 | Implementing | ✅ Verified |
| CLK-28 | Implementing | ✅ Verified |
| CLK-29 | Implementing | ✅ Verified |
| CLK-30 | Implementing | ✅ Verified |
| CLK-31 | Implementing | ✅ Verified |
| CLK-32 | Implementing | ✅ Verified |
| CLK-33 | Implementing | ✅ Verified |
| CLK-34 | Implementing | ✅ Verified |
| CLK-35 | Implementing | ✅ Verified |
| CLK-36 | Implementing | ✅ Verified |
| CLK-37 | Implementing | ✅ Verified |
| CLK-38 | Implementing | ✅ Verified |
| CLK-39 | Implementing | ✅ Verified |
| CLK-40 | Implementing | ✅ Verified |
| CLK-41 | Implementing | ✅ Verified |
| CLK-42 | Implementing | ✅ Verified |
| CLK-43 | Implementing | ✅ Verified |
| CLK-44 | Implementing | ✅ Verified |
| CLK-45 | Implementing | ✅ Verified |
| CLK-46 | Implementing | ✅ Verified |
| CLK-47 | Implementing | ✅ Verified |
| CLK-48 | Implementing | ✅ Verified |
| CLK-49 | Implementing | ✅ Verified |
| CLK-50 | Implementing | ✅ Verified |
| CLK-51 | Implementing | ✅ Verified |
| CLK-52 | Implementing | ✅ Verified |
| CLK-53 | Implementing | ✅ Verified |
| CLK-54 | Implementing | ✅ Verified |
| CLK-55 | Implementing | ✅ Verified |
| CLK-56 | Implementing | ✅ Verified |
| CLK-57 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ❌ FAIL

**Spec-anchored check**: 56/57 ACs com evidência que bate com a saída da spec; 1 lacuna (CLK-10 no terminal pequeno); 8 spec-precision gaps sinalizados
**Sensor**: 30/33 killed, 2 equivalentes (M06, M27), 1 survived (M31)
**Gate**: `tsc` 0; 2073 pass, 5 skip, 0 fail

**What works**: o leitor de relatórios (inteiro, partido, malformado, formato antigo), as guardas de `point`, o modal de resposta (a guarda de 500 ms, só o atalho `enter` envia, um `POST` com a credencial lida na hora), a roda, as marcas de cada tela, `SQUAD_TUI_MOUSE`, `m`, e as sequências de saída na ordem certa em toda saída. Toda mutação que poderia gravar uma resposta por engano foi morta.

**Issues found**: Fix 1, um teste de laço para o formato antigo com `q` num terminal pequeno (CLK-10).

**Next steps**: aplicar o Fix 1 e rodar a Volta 2 do Verifier. A conferência em terminal real (RT-02 a RT-08) continua aberta por decisão do dev e não bloqueia esta verificação.
