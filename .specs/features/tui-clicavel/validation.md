# TUI clicável Validation

**Date**: 2026-10-14
**Round**: Volta 2 de 3
**Spec**: `.specs/features/tui-clicavel/spec.md`
**Diff range**: `36440a6..923a71d` (branch `feat/tui-clicavel`)
**Verifier**: independent sub-agent (author ≠ verifier), numa cópia física (`git clone` + `bun install --frozen-lockfile`) em `923a71d`, Bun 1.3.14, Windows 11

**Overall**: ❌ FAIL

Um mutante novo sobrevive, e ele é de teste, não de produção: em `broker/tui/screens/questions.ts:216`, `ky <= 24` → `ky < 24` tira as marcas da linha `enter responder   b próxima bloqueante` do detalhe quando ela cai na última linha de dentro da caixa (linha 24). A linha continua desenhada, e um clique nela deixa de fazer `enter` ou `b`, contra CLK-33. Nenhum teste põe essa linha na linha 24: os testes usam Q-07 com 3 opções (linha 23) e com 8, 9, 21 e 22 (linha não desenhada). Com 4 opções a linha cai na 24, e o mutante a deixa sem marca. O M31 da volta 1 está morto pelos dois testes da T28. A suíte passa; 43 das 44 mutações morreram.

Volta 1 (`9928924`): FAIL por um mutante vivo, o M31 (`broker/tui.ts:182`, `keysOf(chunk)` → `[...chunk]` na tela pequena), porque nenhum teste mandava o formato antigo com um `q` dentro a um terminal menor que 120×40 (CLK-10, "em qualquer tamanho do terminal"). A T28 (`6b2f6cf`) acrescentou em `broker/test/unit/tui-mouse-loop.test.ts:251` um teste de CLK-10 para 119×40 e 120×39: `ESC [ M q!` inteiro e partido em duas leituras não sai da TUI, não faz pedido além de `GET`, e a tela que volta em 120×40 é a principal sem mudança.

---

## Task Completion

Conferido em `tasks.md`: nenhum item `- [ ]`; cada tarefa tem o commit no histórico de `36440a6..923a71d`.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Sonda. RT-01 registrada sem versão do terminal e sem os quatro cantos |
| T2 a T24 | ✅ Done | - |
| T25 | ⚠️ Done com conferência não feita | RT-02 a RT-07 "não conferido" e RT-08 "não exercitado", por decisão do dev em 2026-10-14. Não é lacuna de teste |
| T26 | ✅ Done | Linux registrado pelo orquestrador em `b63acf8` |
| T27 | ✅ Done | - |
| T28 | ✅ Done | `6b2f6cf`, `923a71d`. Mata o M31 (confirmado nesta volta) |

---

## Spec-Anchored Acceptance Criteria

Caminhos relativos a `broker/`. `M` = `test/unit/tui-mouse.test.ts`, `L` = `test/unit/tui-mouse-loop.test.ts`, `I` = `test/unit/tui-mouse-input.test.ts`, `H` = `test/unit/tui-hits.test.ts`, `G` = `test/unit/tui-grid.test.ts`, `IT` = `test/integration/tui-mouse.test.ts`, `MP` = `test/integration/mouse-probe.test.ts`, `P` = `test/unit/tui-mouse-probe.test.ts`, `C` = `test/unit/tui-config.test.ts`, `HE` = `test/unit/tui-mouse-help.test.ts`, `F` = `test/unit/tui-frames.test.ts`. Cada linha foi relida nesta volta; os números de `L` depois da linha 250 andaram com a T28.

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| CLK-01 | `ESC[?1000h` e `ESC[?1006h` depois de entrar na tela alternativa | `L:97` `expect(t.out).toBe(ENTER + "\x1b[?1000h" + "\x1b[?1006h")`; `IT:61` `expect(seen.text.indexOf(ON)).toBeGreaterThan(seen.text.indexOf(ALTERNATE))` | ✅ PASS |
| CLK-02 | `ESC[?1006l` e `ESC[?1000l` antes de deixar a tela alternativa, por `q`, `ctrl+c`, `SIGTERM`, erro e clique em `q`, mouse ligado ou não | `L:129` `expect(tui.t.out.endsWith("\x1b[?1006l" + "\x1b[?1000l" + LEAVE)).toBe(true)` (q, ctrl+c, `stop` que o SIGTERM chama, erro × ligado/desligado); `L:330` depois de `m`; `IT:117` `expect(seen.text.indexOf(BACK)).toBeGreaterThan(seen.text.lastIndexOf("\x1b[?1000l"))` (clique em `q sair`, processo real) | ✅ PASS |
| CLK-03 | `ESC [ < b ; x ; y` + `M`/`m` é relatório, em qualquer tamanho | `M:68` `expect(parse("\x1b[<0;12;5M")).toEqual({ button: 0, x: 12, y: 5, pressed: true })`; `I:35` `expect(keysOf(report)).toEqual([report])`; `I:56` `isReport`; tela pequena: `L:233` `expect(t.raw).toEqual([true])` | ✅ PASS |
| CLK-04 | Nenhum caractere de relatório vira tecla nem texto | `I:64` `expect(input(v.ui, report, v)).toBe(v.ui)`; `I:66` só `"ab"` entra no texto; `I:72` cinco telas | ✅ PASS |
| CLK-05 | Clique e roda fazem o que as histórias definem | `L:162` `expect(t.lines()).toEqual(topology(t.view(after(t, ["2"]))).text())`; `L:176`; `L:190`-`L:194`; `IT:111` | ✅ PASS |
| CLK-06 | Soltura, meio, direito, roda horizontal e bit 32: nada | `M:343` `expect(next.ui).toBe(v.ui)`, `M:345` `expect(next.pointer).toEqual(ON)` (12 gatilhos); `M:357`-`M:362` modificadores | ✅ PASS |
| CLK-07 | Relatório partido entre leituras é um só | `L:427` cada pedaço menos o último: tela principal; `L:430` `toEqual(help(...).text())`; `L:435` `expect(t.raw).toEqual([true])` (11 cortes) | ✅ PASS |
| CLK-08 | Começo sem resto em 40 ms: descartado, sem tecla nem texto | `L:461` `expect(delays(() => key("\x1b[<0;1"))).toEqual([40])`; `L:464`-`L:465`; `L:482`/`L:491` dentro e fora dos 40 ms; `L:507` campo vazio | ✅ PASS |
| CLK-09 | `ESC [ <` até uma letra sem os três inteiros: descartado inteiro | `M:91`-`M:92` `expect(parse(item)).toBeNull()`; `I:92`-`I:93` `toBe(main.ui)` / `toBe(text.ui)`, também com `q` | ✅ PASS |
| CLK-10 | `ESC [ M` + 3 caracteres: descartados, em qualquer tamanho do terminal | 120×40: `I:101`-`I:102`, `I:105` o `q` depois dos três sai; `L:527`-`L:529` partido de quatro jeitos; `L:543`-`L:546` começo que não termina. Terminal pequeno (T28): `L:261` `expect(t.raw).toEqual([true])`, `L:262` só `GET`, `L:266` tela principal de antes | ✅ PASS |
| CLK-11 | Coluna fora de 0..119 ou linha fora de 0..39: nada | `M:375` 120 e 40 valem; `M:379` `expect(sent(column, line).ui).toBe(v.ui)` para 0, 121, 41 e 400 dígitos; `M:391`; `M:511`-`M:512` | ✅ PASS |
| CLK-12 | Terminal pequeno: sem mudança, sem saída, sem `POST` | `L:233` `expect(t.raw).toEqual([true])`; `L:238` tela de antes; `L:239` `t.calls.every((call) => call.method === "GET")` | ✅ PASS |
| CLK-13 | Broker sem responder: sem mudança e sem saída por relatório | `L:283` `expect(t.raw).toEqual([true])`; `L:284`; `L:287`; `M:412` `point(entry(v), click(x, y), v, null)!.ui).toBe(v.ui)` | ✅ PASS |
| CLK-14 | O alvo é o do último desenho | `M:437`-`M:442`; `M:649`-`M:650`; `L:215`; `G:139`-`G:184` a camada | ✅ PASS |
| CLK-15 | Relatórios e teclas de uma leitura, na ordem | `M:1541` e `M:1547` (as duas ordens dão resultados diferentes); `M:1554`-`M:1558`; `M:1565` | ✅ PASS |
| CLK-16 | Relatório + `\r`/`\n` com modal: espaço no texto, nada na escolha, sem envio | `M:1610` `toEqual({ ...text.ui, modal: { ...m(text), text: "logo " } })`, `M:1611` `send` nulo, `M:1613`; `I:114`-`I:118` | ✅ PASS |
| CLK-17 | Sonda: liga, uma linha por relatório, `q`/`ctrl+c` desfazem e saem com 0; fora de terminal sai com 1 | `P:5`, `P:9`, `P:24`, `P:37`; `MP:36`-`MP:44` pressão, soltura, roda, `exited` 0, `OFF` depois de `ON`; `MP:55`-`MP:56`; `MP:23` `expect(await proc.exited).toBe(1)` | ✅ PASS |
| CLK-18 | Aba (e contador da `4 perguntas`) como `1`..`4`, `?` | `M:138` `expect(next.ui).toEqual(press(v.ui, key, v)!)` de cada tela, primeira e última célula; `M:150`; `M:159` | ✅ PASS |
| CLK-19 | Clique num painel: foco 0, 1 ou 2, borda incluída | `M:499` `toEqual(keys(v, ...tabs(focus, panel))!)` nos nove pares, quatro cantos; `M:500` | ✅ PASS |
| CLK-20 | Linha não selecionada do feed: selecionada, pausado ou não | `M:542`-`M:544` `toEqual(keys(v, ...moves)!)`, `[selected, focus, paused]`; `M:557`-`M:561` sem seleção | ✅ PASS |
| CLK-21 | Linha selecionada: como `enter` | `M:600` `toEqual(press(v.ui, "\r", v)!)`; `M:606` de outro painel; `M:616`-`M:618` edge case da pergunta, `send` nulo | ✅ PASS |
| CLK-22 | Ticket: thread dele, na entrada mais recente, nas duas linhas | `M:678`-`M:679` `["thread", ref, 0, 0]`; `M:688`, `M:693`, `M:706` | ✅ PASS |
| CLK-23 | `? N` como `4` | `M:172` `toEqual(press(v.ui, "4", v)!)` de cada tela, com os dois espaços | ✅ PASS |
| CLK-24 | Pergunta selecionada, foco na lista: como `enter`, sem envio | `M:822`-`M:824` `toEqual(press(v.ui, "\r", v)!)`, `send` nulo | ✅ PASS |
| CLK-25 | Outra pergunta: selecionada, foco na lista | `M:838`-`M:840`; `M:853`-`M:864`; `M:875`-`M:886` | ✅ PASS |
| CLK-26 | Caixa do histórico: foco no histórico | `M:898` `toEqual(press(v.ui, "h", v)!)`; `M:902` já com o foco: `toBe(there.ui)` | ✅ PASS |
| CLK-27 | Célula sem regra: no máximo o foco de CLK-19 | `M:724`-`M:748`; `M:757`, `M:764` `toBe(v.ui)`; `M:773` topologia, thread, ajuda; `M:913` | ✅ PASS |
| CLK-28 | Roda no feed: foco 1 e três `k`/`j` | `M:982` `toEqual(keys(v, key, key, key)!)`, `M:986` dois ou quatro dão outra linha; `M:993`; `M:1005` | ✅ PASS |
| CLK-29 | Roda no thread: um `k`/`j` | `M:1022` `toEqual(press(v.ui, key, v)!)`, `M:1023` `threadOffset` ±1 | ✅ PASS |
| CLK-30 | Roda na lista: foco na lista, um `k`/`j` | `M:1037`-`M:1038` | ✅ PASS |
| CLK-31 | Roda no histórico: foco nele, um `k`/`j` | `M:1051`-`M:1052` | ✅ PASS |
| CLK-32 | Roda fora das quatro caixas: nada | `M:1085` `toBe(v.ui)` em toda célula fora delas, cinco telas | ✅ PASS |
| CLK-33 | Atalho simples (tecla ou descrição): como a tecla, na linha 39 e no detalhe da aba Perguntas | Linha 39: `M:245` `expect(next?.ui ?? null).toEqual(press(v.ui, key, v))` (dez rótulos), `M:249`. Detalhe: `M:944`, `M:952` e `H:612`, só com a linha na linha 23 (Q-07 de 3 opções). **Linha do detalhe na última linha da caixa (24): nenhuma** — o mutante N30 sobrevive | ❌ GAP |
| CLK-34 | Duas teclas: o caractere da tecla; separador e descrição nada | `M:267`, `M:270`, `M:273`; `M:281`, `M:284`, `M:286`-`M:287`; `↑↓` em `M:1319`-`M:1324` | ✅ PASS |
| CLK-35 | Atalho de faixa: nada | `M:293` `toBe(v.ui)`; `M:1326` (`1-4 escolher`) | ✅ PASS |
| CLK-36 | Selo de gate: como `g` | `M:194`-`M:195` `toEqual(press(v.ui, key, v)!)` e o aviso `chega com a fatia Gate` (frames 19a, 18a) | ✅ PASS |
| CLK-37 | Selo de permissão: como `x` | `M:194`-`M:195` (frames 14 e 22c) | ✅ PASS |
| CLK-38 | Outro selo: nada | `M:204` `toBe(v.ui)` (bloqueado, offline, parado, escalado); `H:151` motivo que termina em `· g` | ✅ PASS |
| CLK-39 | Custo da linha 38: como `t` | `M:213` `toEqual(press(v.ui, "t", v)!)`, `M:214`; `M:220`-`M:221` | ✅ PASS |
| CLK-40 | Com modal só CLK-41..46 | `M:453`, `M:458`, `M:1340`, `M:1347`-`M:1349` `toBe(...)`; `H:666` | ✅ PASS |
| CLK-41 | Opção: marca, não envia, também a marcada | `M:1162`-`M:1164` `toEqual(keys(...))`, `choice: option`, `send` nulo, de toda marca de partida; `M:1196` | ✅ PASS |
| CLK-42 | `outra resposta…`: modo texto, campo vazio | `M:1181`-`M:1183` `modal: { question, choice: null, text: "", ... }`, `send` nulo | ✅ PASS |
| CLK-43 | Fora da caixa nas linhas 0..38: como `esc` | `M:1212` `toEqual(closed)` em toda célula fora da caixa, com texto digitado (06, 07) | ✅ PASS |
| CLK-44 | Dentro da caixa fora das linhas de opção: nada | `M:1235` `toBe(v.ui)` em toda célula da caixa | ✅ PASS |
| CLK-45 | Atalhos da linha 39 com as teclas do modal | `M:1254`-`M:1255` `send: { question_id, answer }`; `M:1268`-`M:1279` texto, vazio e só espaços; `M:1288`; `M:1299`-`M:1309`; `M:1319`-`M:1323` | ✅ PASS |
| CLK-46 | Clique < 500 ms após o anterior: nada, sem envio | `M:1365`-`M:1366` para 499, 250, 1, 0 ms em opção, `enter confirmar`, canto e margem; `M:1379`-`M:1382` 500 ms vale; `M:1394`-`M:1401`; `M:1438`-`M:1443`; `L:392` `expect(t.posts).toEqual([])` | ✅ PASS |
| CLK-47 | Enviando: nada; recusado: só fechar | `M:1454` `toBe(v.ui)` em toda célula, clique e roda; `M:1470`-`M:1471` | ✅ PASS |
| CLK-48 | Roda com modal: nada | `M:1482`, `M:1494` `toBe(v.ui)` | ✅ PASS |
| CLK-49 | Só o clique no atalho `enter` faz `POST /answer`, um, credencial lida na hora | `M:1506` `expect(next.ui.send !== null).toBe(y === 39 && enter.includes(x))`; `M:1522`; `L:358` corpo `{ human_token: TOKEN, question_id: 7, answer: "5 tentativas" }`, `L:359` `t.tokens` 1, `L:361` um único não-GET | ✅ PASS |
| CLK-50 | `m`: sequências e aviso de 4 s | `M:1638`-`M:1644` `until: v.squad.now + 4000` e os dois textos; `L:302` `toContain("\x1b[?1006l" + "\x1b[?1000l")`, `L:304`, `L:313`, `L:315` | ✅ PASS |
| CLK-51 | Mouse desligado: relatório descartado | `M:402`-`M:403` `toBe(v.ui)` e `clickedAt` intacto; `L:309` | ✅ PASS |
| CLK-52 | `0` desliga sem `CLK-01`; ausente, vazia, `1` ligam | `C:94` `expect(mouseOn({ SQUAD_TUI_MOUSE: value })).toBe(on)`; `L:106` `expect(t.out).toBe(ENTER)`; `L:140`; `IT:82` sem `\x1b[?1000h` | ✅ PASS |
| CLK-53 | Outro valor: sai com 1, mensagem com variável e valor | `C:100` `toThrow(\`SQUAD_TUI_MOUSE: "${value}" is not 0 or 1\`)`; `IT:37`-`IT:38` `exited` 1 e stderr; `IT:45`-`IT:48` | ✅ PASS |
| CLK-54 | `m` é texto com modal; nada com terminal pequeno | `M:1677` `text: "logom"`, `M:1682`; `M:1692`; `L:562`-`L:565`; pequeno: `L:233`, `L:240` `not.toContain(OFF)` | ✅ PASS |
| CLK-55 | Linha `m  mouse liga / desliga · clique = tecla`, desvio D4 | `HE:12` `expect(keys()[10]).toBe("m           mouse liga / desliga · clique = tecla")`; `HE:19`; `HE:24` só um D4 | ✅ PASS |
| CLK-56 | Toda tecla como antes, mouse ligado ou não | `M:1733` `take` igual a `input`; `M:1767` `toEqual(press(v.ui, key, v)!)` em toda tecla de nove estados; `M:1778`; `test/unit/tui-keys.test.ts` sem alteração no diff | ✅ PASS |
| CLK-57 | Frames iguais, fora a linha de CLK-55 | `F:40` cada frame igual a `expected(id)`; `test/frames/*.txt`, `test/frames/view.ts` e `tui-keys.test.ts` sem alteração no diff; `F` mudou só nas afirmações de TUI-43 e TUI-49; `deviations.ts` só com o D4 | ✅ PASS |

**Status**: ❌ uma lacuna (CLK-33, a linha de atalhos do detalhe na última linha da caixa); 56 de 57 com evidência que bate com a saída da spec; 9 spec-precision gaps sinalizados abaixo.

### ⚠️ Spec-precision gaps

O código decide o que a spec deixa aberto. Nenhum é defeito. Os oito primeiros vêm da volta 1 e continuam valendo; o último é novo.

| Req | O que a spec deixa aberto | O que o código e os testes fixam |
| --- | ------------------------- | -------------------------------- |
| CLK-01, CLK-02, CLK-50 | A ordem dentro de cada par ("`ESC [ ? 1006 l` e `ESC [ ? 1000 l`") | `1000h` depois `1006h`; `1006l` depois `1000l` (`L:97`, `L:129`) |
| CLK-46 | O que é "o clique anterior": se conta o clique que não fez nada (fora da grade, tela congelada, sem desenho, antes de o modal abrir) e por qual relógio | Todo clique lido com o mouse ligado, pelo relógio da leitura (`M:462`, `M:1386`) |
| CLK-41, CLK-44 | A borda numa linha de opção: CLK-41 diz "qualquer célula dela dentro da caixa", e a caixa inclui a borda; CLK-44 dá a borda como inerte | Borda inerte (`M:1167`) |
| CLK-09 | `ESC [ <` com dígitos que chega a um caractere que não é letra, dígito nem `;` | Descarta até ali; o caractere seguinte é tecla (`I:47`) |
| CLK-10 | Formato antigo partido, ou com menos de três caracteres | Descartado como o inteiro, também depois dos 40 ms (`L:519`, `L:539`) |
| CLK-14, CLK-15 | Com que desenho se compara o segundo relatório, ou o relatório depois de uma tecla, da mesma leitura | Todos com o último desenho escrito; o clique só vale se a tela e a presença do modal não mudaram (`M:1551`, `M:1575`) |
| CLK-17 | O que a sonda faz com entrada que não é relatório | Escreve `outra entrada: …` e sai em qualquer `q` dela, também um `q` dentro de um relatório no formato antigo (`P:32`, `P:37`) |
| CLK-50 | `m` na tela congelada (CLK-54 só cita modal e terminal pequeno) | `m` liga e desliga (`M:1664`) |
| CLK-46, CLK-50 | Se ligar ou desligar o mouse com `m` zera "o clique anterior" | `m` guarda a hora do último clique: `{ on: false, clickedAt: 5 }` (`M:1638`, `M:1643`); o mutante N04, que a zera, morre só por essa afirmação |

---

## Edge Cases

- [x] Roda para cima sem linha selecionada: a primeira das três seleciona a última (`M:1005`-`M:1008`)
- [x] Clique na linha selecionada de um `question` que espera o dev: modal, sem envio (`M:610`-`M:618`)
- [x] Clique na aba em que a TUI já está: `3` no thread volta ao ticket da linha selecionada (`M:154`-`M:163`)
- [x] Modal aberto por clique e clique seguinte a 500 ms ou mais: regras do modal (`M:1373`-`M:1383`, `L:395`-`L:398`)
- [x] `x` ou `y` igual a 0: fora da grade (`M:378`)
- [x] Inteiros maiores que um inteiro seguro: fora da grade (`M:109`, `M:378`)
- [x] Terminal maior que 120×40, clique fora da grade: nada (`M:385`)
- [x] Terminal volta a 120×40: cliques valem sem novo pedido (`L:243`-`L:245`)
- [x] `m` desliga e a TUI sai: sequências de CLK-02 (`L:324`-`L:330`)
- [x] Terminal que não manda relatório: teclado como antes (`M:1729`-`M:1772`)

---

## Gate Check

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit && bun test` (de `broker/`, na cópia física em `923a71d`)
- **Result**: `tsc` exit 0; **2075 pass, 5 skip, 0 fail**, 2080 testes em 83 arquivos, 144 s
- **Test count before feature**: 1646 pass, 5 skip (Windows, `36440a6`)
- **Test count after feature**: 2075 pass, 5 skip
- **Delta**: +429 testes (os 427 da volta 1 e os 2 da T28)
- **Skipped tests**: os 5 são anteriores à fatia: `cli.test.ts:355` (host isca), `cli.test.ts:390`, `server-credential.test.ts:57` e `presence.test.ts:6` (pulados no Windows), `tui-loop.test.ts:990` (QST-99 completo, só com `SQUAD_TEST_FULL`)
- **Failures**: nenhuma. `EVT-43`, instável nesta máquina com o Bun 1.3.14 também na `main`, passou nesta execução
- **Integridade**: nenhum teste removido; `tui-keys.test.ts`, `test/frames/view.ts` e os `.txt` de `test/frames/` sem alteração; `tui-loop.test.ts` mudou só no `mouse: false` do ajudante `launch`; `tui-frames.test.ts` só nas afirmações de TUI-43 e TUI-49 (desvio D4)

---

## Discrimination Sensor

Cada mutação aplicada na cópia com um script Python (substituição exata, uma ocorrência), rodada contra `bun test test/unit/tui` (26 arquivos) e, nas de `tui.ts`, `config.ts`, `ansi.ts` e da sonda, também contra `test/integration/tui-mouse` e `test/integration/mouse-probe`; desfeita com `git checkout -- <arquivo>` antes da seguinte, com `git status --porcelain` da cópia vazio depois de cada uma. Nenhuma morte dependeu de teste instável (`EVT-43`, `PEER-28/29`, `EVT-90/92`, PAP-38); N35 e N38, mortos por um teste só, foram rodados de novo e morreram de novo. As 43 mutações `N` são novas: nenhuma repete as M01 a M31 da volta 1.

| # | File:line | Mudança | Killed? |
| - | --------- | ------- | ------- |
| M31 | `broker/tui.ts:182` | Volta 1: na tela pequena, `q` procurado caractere a caractere (`keysOf(chunk)` → `[...chunk]`) | ✅ Killed (2: CLK-10 da T28, 119×40 e 120×39) |
| N01 | `broker/tui/mouse.ts:191` | `take` ignora `more` (`more \|\| items.length > 1` → `items.length > 1`) | ✅ Killed (4: QST-78 ×2, CLK-56 ×2) |
| N02 | `broker/tui/mouse.ts:183` | Itens do chunk aplicados de trás para a frente (`reduce` → `reduceRight`) | ✅ Killed (34) |
| N03 | `broker/tui/mouse.ts:187` | `m` liga e desliga o mouse também com o modal aberto | ✅ Killed (7: CLK-54 ×3, QST-99) |
| N04 | `broker/tui/mouse.ts:189` | `m` zera a hora do último clique (`{ ...pointer, on }` → `{ on, clickedAt: null }`) | ✅ Killed (1: CLK-50 `M:1638`) |
| N05 | `broker/tui/mouse.ts:138` | Guarda `modal.choice === null` tirada de `answered` | ✅ Killed (1: CLK-41 `M:1196`, um clique sobre a opção antiga escreveria `j` no texto) |
| N06 | `broker/tui/mouse.ts:124` | Clique na pergunta selecionada abre o modal com o foco no histórico | ✅ Killed (1: CLK-25 `M:868`) |
| N07 | `broker/tui/mouse.ts:110` | Sem linha selecionada, o primeiro `k` que seleciona a última linha some | ✅ Killed (5: CLK-20, CLK-05, CLK-14, CLK-49) |
| N08 | `broker/tui/mouse.ts:117` | `[` e `]` trocados no caminho até o ticket | ✅ Killed (3: CLK-22) |
| N09 | `broker/tui/mouse.ts:80` | Número de `tab` até o painel invertido (`panel - focus` → `focus - panel`) | ✅ Killed (18: CLK-19, CLK-20, CLK-21, CLK-22, CLK-28) |
| N10 | `broker/tui/mouse.ts:93` | Roda na lista e no histórico sem levar o foco antes (`h` tirado) | ✅ Killed (4: CLK-30, CLK-31) |
| N11 | `broker/tui/mouse.ts:158` | A roda conta como clique para a regra dos 500 ms | ✅ Killed (2: CLK-46 `M:1090`, CLK-15) |
| N12 | `broker/tui/mouse.ts:151` | Bits de `shift`, `alt` e `ctrl` deixam de ser tirados do botão | ✅ Killed (3: CLK-06, CLK-28 ×2) |
| N13 | `broker/tui/mouse.ts:152` | Soltura da roda (`64 m`) vale como roda | ✅ Killed (1: CLK-06 `M:343`) |
| N14 | `broker/tui/mouse.ts:170` | Guarda dos 500 ms vale também sem modal (`ui.modal && (wheel \|\| quick)` → `(ui.modal && wheel) \|\| quick`) | ✅ Killed (4: CLK-20/21 clique duplo fora do modal, CLK-46, CLK-15, CLK-49) |
| N15 | `broker/tui/mouse.ts:140` | Clique em `outra resposta…` só marca a linha, sem o `enter` | ✅ Killed (2: CLK-42) |
| N16 | `broker/tui/mouse.ts:107` | Linha selecionada abre sem dar antes o foco ao feed | ✅ Killed (1: CLK-21 `M:606`) |
| N17 | `broker/tui/mouse.ts:128` | Ramo do histórico tirado (o clique na caixa do histórico só cai em `focused`) | ✅ Killed (1: CLK-26 `M:898`) |
| N18 | `broker/tui/grid.ts:145` | `clear` deixa as marcas | ✅ Killed (12: CLK-14, CLK-33, CLK-40) |
| N19 | `broker/tui/grid.ts:155` | `mark` só confere a linha, não a coluna (`rows[y+j]?.[x+i]` → `hits[y+j]`) | ✅ Killed (1: CLK-14 `G:149`) |
| N20 | `broker/tui/screens/answer.ts:46` | A marca de `esc` do modal cobre as linhas 0 a 37, não 0 a 38 | ✅ Killed (15: CLK-40, CLK-43) |
| N21 | `broker/tui/screens/answer.ts:47` | A caixa do modal deixa de ser marcada (dentro dela vale `esc`) | ✅ Killed (20: CLK-44) |
| N22 | `broker/tui/screens/chrome.ts:72` | A descrição de um atalho simples deixa de ser marcada | ✅ Killed (37: CLK-33, CLK-45) |
| N23 | `broker/tui/screens/chrome.ts:142` | O selo de permissão deixa de ser marcado | ✅ Killed (6: CLK-37) |
| N24 | `broker/tui/screens/chrome.ts:130` | O espaço antes da tecla da aba deixa de ser da aba | ✅ Killed (12: CLK-18) |
| N25 | `broker/tui/screens/chrome.ts:168` | A marca do custo para antes de ` est.` | ✅ Killed (4: CLK-39) |
| N26 | `broker/tui/screens/main.ts:91` | Ticket de duas linhas marcado só na primeira | ✅ Killed (2: CLK-22) |
| N27 | `broker/tui/screens/main.ts:235` | A borda de baixo do detalhe deixa de ser do painel 2 | ✅ Killed (6: CLK-19, CLK-11) |
| N28 | `broker/tui/screens/questions.ts:126` | A linha de rota da pergunta deixa de ser dela | ✅ Killed (13: CLK-24, CLK-25, CLK-40) |
| N29 | `broker/tui/screens/questions.ts:187` | A caixa do histórico sem `wheel` | ✅ Killed (13: CLK-26, CLK-30, CLK-31) |
| N30 | `broker/tui/screens/questions.ts:216` | `if (chosen && ky <= 24)` → `ky < 24`: a linha `enter responder   b próxima bloqueante` desenhada na linha 24 fica sem marca | ❌ Survived → Fix 1 |
| N31 | `broker/tui/screens/questions.ts:221` | Espaço entre os dois atalhos do detalhe: 3 → 2 colunas | ✅ Killed (3: CLK-33) |
| N32 | `broker/tui/keys.ts:40` | `KEY` exige a letra final do relatório SGR (`[A-Za-z]?` → `[A-Za-z]`) | ✅ Killed (7: CLK-03, CLK-04, CLK-08, CLK-09, CLK-16) |
| N33 | `broker/tui/keys.ts:40` | `KEY` exige os três caracteres do formato antigo (`{0,3}` → `{3}`) | ✅ Killed (3: CLK-10) |
| N34 | `broker/tui/keys.ts:49` | `isReport` deixa de reconhecer o formato antigo | ✅ Killed (1: CLK-03 `I:56`) |
| N35 | `broker/tui.ts:206` | A espera segura `ESC [ M` com até 1 caractere, não 2 (`M[^]{0,2}` → `M[^]{0,1}`) | ✅ Killed (1: CLK-10 `L:543`, `delays` igual a `[40]`) |
| N36 | `broker/tui.ts:206` | A espera não segura o `;` do relatório SGR (`<[0-9;]*` → `<[0-9]*`) | ✅ Killed (9: CLK-07) |
| N37 | `broker/tui.ts:188` | `m` escreve a sequência trocada (`MOUSE_ON` ↔ `MOUSE_OFF`) | ✅ Killed (1: CLK-50/51 `L:302`) |
| N38 | `broker/tui.ts:124` | A tela congelada guarda o desenho como alvo (`\|\| down !== null` tirado) | ✅ Killed (1: CLK-13 `L:287`, duas execuções) |
| N39 | `broker/tui.ts:227` | `MOUSE_ON` escrito antes de `ENTER` | ✅ Killed (2: CLK-01 unidade e processo) |
| N40 | `broker/tui/config.ts:58` | `SQUAD_TUI_MOUSE=1` recusado | ✅ Killed (2: CLK-52) |
| N41 | `broker/tui/config.ts:57` | `SQUAD_TUI_MOUSE` aparado (`" 0"` aceito) | ✅ Killed (1: CLK-53 `C:100`) |
| N42 | `broker/tui/ansi.ts:34` | `MOUSE_ON` pede o modo 1002 (movimento com botão) em vez do 1000 | ✅ Killed (10: CLK-01, CLK-02, CLK-17) |
| N43 | `broker/tui/mouse-probe.ts:31` | A sonda deixa de sair por `ctrl+c` | ✅ Killed (2: CLK-17 unidade e processo) |

**Sensor depth**: P0 (integridade do dado: nenhum clique grava resposta por engano), 44 mutações manuais nesta volta (43 novas e o M31), sobre `take`, `point` em cada tela e no modal, as marcas de `grid.ts` e de `screens/*.ts`, `KEY`/`isReport` de `keys.ts`, a espera de 40 ms de `tui.ts`, `config.ts`, `ansi.ts` e a sonda
**Result**: 43 killed, 0 equivalentes, 1 survived (N30) - ❌ FAIL

Sobre o N30: com Q-07 de 4 opções (`frameView("04")` com `options` trocadas), a linha `enter responder` é desenhada na linha 24 e, no código, tem `key: "\r"`; com o mutante, a mesma linha desenhada tem marca `null`. Não é equivalente: o dev vê o atalho e o clique nele não faz nada, contra CLK-33. Os testes cobrem 3 opções (linha 23) e 8, 9, 21 e 22 (linha não desenhada, `H:633`), e nenhum o limite em que ela ainda cabe.

Sobre o N35: morreu só pela afirmação de que a espera foi armada (`L:543`). O caso partido `["\x1b[M q", "!"]` (`L:518`) não o distingue, porque `!` não é tecla na tela principal. Não é lacuna: a espera é o mecanismo que CLK-10 usa, e a afirmação a segura.

Isolamento: `git status --porcelain` da cópia vazio depois de cada mutação; o da árvore real vazio antes do sensor e, depois, só com este relatório.

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
| Minimum code | ✅ `tui/mouse.ts` com 194 linhas, `parse`, `point` e `take`; nenhuma camada além do design |
| Surgical changes | ✅ As telas ganham só chamadas `mark`; `drawKeys` só o parâmetro `modal`; `notice` só passou a ser exportada; a T28 tocou só um arquivo de teste |
| No scope creep | ✅ Nada de hover, arrasto ou rota nova; nenhum `POST` além do `/answer` (CLK-49) |
| Matches patterns | ✅ Estado do mouse fora de `Ui` (`Pointer`), como o AD-021 pede; comentários no estilo vizinho |
| Spec-anchored outcome check | ✅ "Como a tecla K" comparado com `press`/`keys` aplicados ao mesmo estado; células achadas no texto desenhado (`at`, `cellOf`, `feedCell`) |
| Per-layer Coverage Expectation | ⚠️ Marcas das telas: a linha de atalhos do detalhe não é testada no limite da caixa (Fix 1); o resto 1:1 |
| Every test maps to a spec requirement | ✅ Todo teste novo começa por `CLK-nn` |
| Documented guidelines followed: `tasks.md` (regras do topo), `broker/CLAUDE.md`, `.specs/LESSONS.md` (L-001, L-010, L-020, L-036, L-050) | ⚠️ L-020 (limite com o literal) falha só no limite da linha 24 do detalhe |

Observação sem tarefa (da volta 1, ainda vale): `broker/tui/screens/questions.ts:213`-`223` recalcula a linha (`ky = 2 + lines.length`) e as colunas dos dois atalhos à parte de `drawRows`, que os desenha. É essa duplicação que o N30 explora; o teste do Fix 1 a segura.

---

## Fix Plans

### Fix 1: CLK-33 sem afirmação com a linha de atalhos do detalhe na última linha da caixa

- **Root cause**: `questions.ts:216` marca `enter responder   b próxima bloqueante` só quando `ky <= 24`, a última linha de dentro da caixa do detalhe (2..25). Os testes põem essa linha na linha 23 (Q-07 de 3 opções, `M:936`, `H:602`) ou fora da caixa (8, 9, 21 e 22 opções, `H:633`), e nunca na 24. O mutante `ky < 24` deixa a linha desenhada e sem marca, e sobrevive (N30).
- **Fix task**:
  - **What**: um teste em que Q-07 tem 4 opções (a linha de atalhos cai na linha 24, a última de dentro da caixa): a linha é desenhada na 24; `enter` e `responder` têm `key: "\r"`, `b` e `próxima bloqueante` têm `key: "b"`; e um clique na primeira célula de `enter` faz como `press(v.ui, "\r", v)` e um em `b` como `press(v.ui, "b", v)`, com a célula achada no texto desenhado.
  - **Where**: `broker/test/unit/tui-hits.test.ts`, ao lado do teste de `H:633` (o de 8, 9, 21 e 22 opções), e `broker/test/unit/tui-mouse.test.ts`, ao lado de `M:936`; nomes começando por `CLK-33:`.
  - **Verify**: o teste passa no código atual e falha com `broker/tui/screens/questions.ts:216` `ky <= 24` → `ky < 24`.
  - **Done when**: o teste existe, passa, mata o N30, e `bun node_modules/typescript/bin/tsc --noEmit && bun test` passa.
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
| CLK-10 | Implementing | ✅ Verified |
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
| CLK-33 | Implementing | ❌ Needs Fix |
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

**Spec-anchored check**: 56/57 ACs com evidência que bate com a saída da spec; 1 lacuna (CLK-33, linha de atalhos do detalhe na linha 24); 9 spec-precision gaps sinalizados
**Sensor**: 43/44 killed, 0 equivalentes, 1 survived (N30)
**Gate**: `tsc` 0; 2075 pass, 5 skip, 0 fail

**What works**: a T28 fecha a lacuna da volta 1 (M31 morto). O leitor de relatórios, a espera de 40 ms, `take` (ordem, `more`, `m`), as guardas de `point`, o modal de resposta, a roda, as marcas de cada tela e da grade, `SQUAD_TUI_MOUSE` e as sequências de saída resistiram às 43 mutações novas menos uma. Toda mutação que poderia gravar uma resposta por engano morreu.

**Issues found**: Fix 1, um teste da linha de atalhos do detalhe da aba Perguntas quando ela é a última linha de dentro da caixa (CLK-33).

**Next steps**: aplicar o Fix 1 e rodar a Volta 3 do Verifier, a última antes de escalar ao dev. A conferência em terminal real (RT-02 a RT-08) continua aberta por decisão do dev e não bloqueia esta verificação.
