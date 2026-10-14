# TUI clicável Validation

**Date**: 2026-10-14
**Round**: Volta 3 de 3
**Spec**: `.specs/features/tui-clicavel/spec.md`
**Diff range**: `36440a6..b0468be` (branch `feat/tui-clicavel`)
**Verifier**: independent sub-agent (author ≠ verifier), numa cópia física (`git clone` + `bun install --frozen-lockfile`) em `b0468be`, Bun 1.3.14, Windows 11

**Overall**: ❌ FAIL

Dois mutantes novos sobrevivem, os dois de teste e não de produção, e os dois no mesmo padrão das voltas anteriores: um limite que nenhum teste usa.

1. `broker/tui/keys.ts:40`, `\x1b\[<[0-9;]*[A-Za-z]?` → `\x1b\[<[0-9;]{0,24}[A-Za-z]?`. Um relatório cujo inteiro tem mais dígitos do que um inteiro seguro comporta (o edge case da spec) deixa de ser um item da entrada: `keysOf` o parte em 382 itens, os dígitos viram teclas, o `2` troca a tela principal pela topologia e, no modo texto do modal, os `9` entram no texto. Contra CLK-03, CLK-04 e o edge case de CLK-11. Os testes do relatório de 400 dígitos (`M:109`, `M:366`) chamam `parse` e `point` direto e nunca passam por `keysOf`, `input` ou `take`.
2. `broker/tui/mouse.ts:110`, `from < 0` → `from <= 0`. Com a primeira linha do log selecionada, um clique em outra linha do feed não a seleciona: o mutante toma o caminho do "nada selecionado" e a seleção fica na primeira linha. Contra CLK-20. Os testes de CLK-20 partem da linha 417 ou de nenhuma seleção, nunca do índice 0 de `rows`.

Os dois foram confirmados por um teste descartável na cópia (o código atual passa, o mutante falha) e sobrevivem às 1863 provas de `test/unit`, `test/integration/tui-mouse` e `test/integration/mouse-probe`. O M31 e o N30 estão mortos. A suíte passa (só `EVT-43`, ambiental, falhou, e passa sozinha). 34 das 36 mutações morreram.

Esta é a última volta. Pelo limite de três voltas, as duas lacunas vão ao dev em vez de a uma quarta volta automática.

Volta 1 (`9928924`): FAIL pelo M31 (`broker/tui.ts:182`, `keysOf(chunk)` → `[...chunk]` na tela pequena), sem teste do formato antigo com `q` num terminal menor que 120×40. A T28 (`6b2f6cf`) pôs o teste de CLK-10 em 119×40 e 120×39. Volta 2 (`23d399f`): M31 morto, 43 mutantes novos (N01–N43), FAIL pelo N30 (`broker/tui/screens/questions.ts:216`, `ky <= 24` → `ky < 24`), sem teste da linha `enter responder   b próxima bloqueante` na última linha da caixa do detalhe. A T29 (`b0468be`) pôs os dois testes com Q-07 de 4 opções (`H:630`, `M:962`).

---

## Task Completion

Conferido em `tasks.md`: nenhum item `- [ ]`; T1 a T29 têm commit em `36440a6..b0468be` (38 commits).

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Sonda. RT-01 registrada sem versão do terminal e sem os quatro cantos |
| T2 a T24 | ✅ Done | - |
| T25 | ⚠️ Done com conferência não feita | RT-02 a RT-07 "não conferido" e RT-08 "não exercitado", por decisão do dev em 2026-10-14. Não é lacuna de teste |
| T26 | ✅ Done | Linux registrado pelo orquestrador em `b63acf8` |
| T27 | ✅ Done | - |
| T28 | ✅ Done | Mata o M31 (confirmado nesta volta) |
| T29 | ✅ Done | `b0468be`. Mata o N30 (confirmado nesta volta: os dois testes da T29 falham com ele) |

---

## Spec-Anchored Acceptance Criteria

Caminhos relativos a `broker/`. `M` = `test/unit/tui-mouse.test.ts`, `L` = `test/unit/tui-mouse-loop.test.ts`, `I` = `test/unit/tui-mouse-input.test.ts`, `H` = `test/unit/tui-hits.test.ts`, `G` = `test/unit/tui-grid.test.ts`, `IT` = `test/integration/tui-mouse.test.ts`, `MP` = `test/integration/mouse-probe.test.ts`, `P` = `test/unit/tui-mouse-probe.test.ts`, `C` = `test/unit/tui-config.test.ts`, `HE` = `test/unit/tui-mouse-help.test.ts`, `F` = `test/unit/tui-frames.test.ts`. Linhas relidas em `b0468be`: a T29 andou `M` em +11 depois da linha 959 e `H` em +13 depois da 626.

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| CLK-01 | `ESC[?1000h` e `ESC[?1006h` depois de entrar na tela alternativa | `L:97` `expect(t.out).toBe(ENTER + "\x1b[?1000h" + "\x1b[?1006h")`; `IT:61` `expect(seen.text.indexOf(ON)).toBeGreaterThan(seen.text.indexOf(ALTERNATE))` | ✅ PASS |
| CLK-02 | `ESC[?1006l` e `ESC[?1000l` antes de deixar a tela alternativa, por `q`, `ctrl+c`, `SIGTERM`, erro e clique em `q`, mouse ligado ou não | `L:129` `expect(tui.t.out.endsWith("\x1b[?1006l" + "\x1b[?1000l" + LEAVE)).toBe(true)` (q, ctrl+c, `stop`, erro × ligado/desligado); `L:330` depois de `m`; `IT:117` `expect(seen.text.indexOf(BACK)).toBeGreaterThan(seen.text.lastIndexOf("\x1b[?1000l"))` (clique em `q sair`, processo real) | ✅ PASS |
| CLK-03 | Toda sequência `ESC [ < b ; x ; y` + `M`/`m` é relatório, em qualquer tamanho | `M:68` `expect(parse("\x1b[<0;12;5M")).toEqual({ button: 0, x: 12, y: 5, pressed: true })`; `I:35` `expect(keysOf(report)).toEqual([report])`; `I:56` `isReport`; tela pequena `L:233`. **Relatório com inteiro de mais dígitos que um inteiro seguro: nenhum teste por `keysOf`** — o mutante S1 sobrevive | ❌ GAP |
| CLK-04 | Nenhum caractere de relatório vira tecla nem texto | `I:64` `expect(input(v.ui, report, v)).toBe(v.ui)`; `I:66` só `"ab"` no texto; `I:72`. Só relatórios curtos: **com um inteiro de 400 dígitos os dígitos viram teclas e texto sob o mutante S1, e nenhum teste vê** | ❌ GAP |
| CLK-05 | Clique e roda fazem o que as histórias definem | `L:162` `expect(t.lines()).toEqual(topology(t.view(after(t, ["2"]))).text())`; `L:176`; `L:190`-`L:192`; `IT:111` | ✅ PASS |
| CLK-06 | Soltura, meio, direito, roda horizontal e bit 32: nada | `M:343` `expect(next.ui).toBe(v.ui)`, `M:345` `expect(next.pointer).toEqual(ON)`; `M:357`-`M:362` modificadores | ✅ PASS |
| CLK-07 | Relatório partido entre leituras é um só | `L:422`-`L:435` (11 cortes, tela e `t.raw`) | ✅ PASS |
| CLK-08 | Começo sem resto em 40 ms: descartado | `L:461` `expect(delays(() => key("\x1b[<0;1"))).toEqual([40])`; `L:464`; `L:482`/`L:486`; `L:504`-`L:507` | ✅ PASS |
| CLK-09 | `ESC [ <` até uma letra sem os três inteiros: descartado inteiro | `M:91`-`M:92` `expect(parse(item)).toBeNull()`; `I:91`-`I:92` `toBe(main.ui)` | ✅ PASS |
| CLK-10 | `ESC [ M` + 3 caracteres: descartados, em qualquer tamanho | `I:101`-`I:102`; `L:527`-`L:528` partido; `L:543`-`L:545`; pequeno (T28) `L:261` `expect(t.raw).toEqual([true])`, `L:262` só `GET` | ✅ PASS |
| CLK-11 | Coluna fora de 0..119 ou linha fora de 0..39: nada | `M:375` 120 e 40 valem; `M:379` `toBe(v.ui)` para 0, 121, 41 e 400 dígitos (por `point`); `M:391`; `M:511` | ✅ PASS |
| CLK-12 | Terminal pequeno: sem mudança, sem saída, sem `POST` | `L:233` `expect(t.raw).toEqual([true])`; `L:238`; `L:239` só `GET` | ✅ PASS |
| CLK-13 | Broker sem responder: sem mudança e sem saída | `L:283`; `L:284` `○ congelado`; `M:412` `point(entry(v), click(x, y), v, null)!.ui).toBe(v.ui)` | ✅ PASS |
| CLK-14 | O alvo é o do último desenho | `M:437`; `M:647`-`M:648`; `L:212`-`L:214`; `G:142`-`G:195` | ✅ PASS |
| CLK-15 | Relatórios e teclas de uma leitura, na ordem | `M:1551`-`M:1552`; `M:1565`-`M:1566` (as duas ordens dão estados diferentes); `M:1576` | ✅ PASS |
| CLK-16 | Relatório + `\r`/`\n` com modal: espaço no texto, nada na escolha, sem envio | `M:1621` `toEqual({ ...text.ui, modal: { ...m(text), text: "logo " } })`, `M:1622` `send` nulo; `I:114`-`I:115`; `I:128`-`I:129` | ✅ PASS |
| CLK-17 | Sonda: liga, uma linha por relatório, `q`/`ctrl+c` desfazem e saem com 0; fora de terminal, 1 | `P:5`, `P:9`, `P:24`; `MP:32`-`MP:33`; `MP:55`-`MP:56`; `MP:23` `expect(await proc.exited).toBe(1)` | ✅ PASS |
| CLK-18 | Aba (e contador da `4 perguntas`) como `1`..`4`, `?` | `M:138` `expect(next.ui).toEqual(press(v.ui, key, v)!)` de cada tela, primeira e última célula; `M:150`; `M:159`; `H:71`, `H:83` | ✅ PASS |
| CLK-19 | Clique num painel: foco 0, 1 ou 2, borda incluída | `M:499` `toEqual(keys(v, ...tabs(focus, panel))!)`; `M:511`; `H:299` quatro cantos | ✅ PASS |
| CLK-20 | Linha não selecionada do feed: selecionada, pausado ou não | `M:542`-`M:544` `toEqual(keys(v, ...moves)!)` a partir da 417; `M:557`-`M:561` sem seleção; `M:573`. **Com a primeira linha de `rows` selecionada: nenhum teste** — o mutante S2 sobrevive | ❌ GAP |
| CLK-21 | Linha selecionada: como `enter` | `M:600` `toEqual(press(v.ui, "\r", v)!)`; `M:606`; `M:616`-`M:618` | ✅ PASS |
| CLK-22 | Ticket: thread dele, na entrada mais recente, nas duas linhas | `M:678`-`M:679` `["thread", ref, 0, 0]`; `M:688`-`M:689`; `M:702`; `M:716`; `H:386`, `H:406`, `H:422` | ✅ PASS |
| CLK-23 | `? N` como `4` | `M:172` `toEqual(press(v.ui, "4", v)!)`; `H:98`, `H:106` | ✅ PASS |
| CLK-24 | Pergunta selecionada, foco na lista: como `enter`, sem envio | `M:822` `toEqual(press(v.ui, "\r", v)!)`, `M:824` `send` nulo | ✅ PASS |
| CLK-25 | Outra pergunta: selecionada, foco na lista | `M:838`-`M:839`; `M:853`; `M:875`-`M:876` | ✅ PASS |
| CLK-26 | Caixa do histórico: foco no histórico | `M:898` `toEqual(press(v.ui, "h", v)!)`; `M:902` `toBe(there.ui)`; `H:519` quatro cantos | ✅ PASS |
| CLK-27 | Célula sem regra: no máximo o foco de CLK-19 | `M:724`-`M:748`; `M:757` `toBe(v.ui)`; `M:773` topologia, thread, ajuda; `M:913` | ✅ PASS |
| CLK-28 | Roda no feed: foco 1 e três `k`/`j` | `M:993` `toEqual(keys(v, key, key, key)!)`; `M:1004`-`M:1005`; `M:1016` | ✅ PASS |
| CLK-29 | Roda no thread: um `k`/`j` | `M:1033` `toEqual(press(v.ui, key, v)!)`, `M:1034` `threadOffset` ±1; `H:456` quatro cantos | ✅ PASS |
| CLK-30 | Roda na lista: foco na lista, um `k`/`j` | `M:1048`-`M:1049`; `H:509` toda célula | ✅ PASS |
| CLK-31 | Roda no histórico: foco nele, um `k`/`j` | `M:1062`-`M:1063`; `H:509` | ✅ PASS |
| CLK-32 | Roda fora das quatro caixas: nada | `M:1096` `toBe(v.ui)`, cinco telas | ✅ PASS |
| CLK-33 | Atalho simples: como a tecla, na linha 39 e no detalhe | `M:245` `expect(next?.ui ?? null).toEqual(press(v.ui, key, v))`, `M:249`; detalhe `M:944`, `H:612`; última linha da caixa (T29) `M:968` `expect(y).toBe(detail.bottom - 1)`, `M:969` `toEqual(press(v.ui, "\r", v)!)`, `M:970` `b`; `H:639` marcas de `enter` e `b` célula a célula | ✅ PASS |
| CLK-34 | Duas teclas: o caractere da tecla; separador e descrição nada | `M:267`, `M:281`; `H:225`; `↑↓` `M:1330`-`M:1331` | ✅ PASS |
| CLK-35 | Atalho de faixa: nada | `M:293` `toBe(v.ui)`; `H:233` | ✅ PASS |
| CLK-36 | Selo de gate: como `g` | `M:194`-`M:195` (19a, 18a); `H:117` (19a, 18a, 22g) | ✅ PASS |
| CLK-37 | Selo de permissão: como `x` | `M:194`-`M:195` (14, 22c); `H:127` (14, 22c, 22g) | ✅ PASS |
| CLK-38 | Outro selo: nada | `M:204` `toBe(v.ui)`; `H:144`, `H:154` | ✅ PASS |
| CLK-39 | Custo da linha 38: como `t` | `M:213` `toEqual(press(v.ui, "t", v)!)`, `M:214`; `H:170` de `│` ao fim de `est.` | ✅ PASS |
| CLK-40 | Com modal só CLK-41..46 | `M:453`, `M:458`, `M:1351`, `M:1358` `toBe(...)`; `H:683` | ✅ PASS |
| CLK-41 | Opção: marca, não envia, também a marcada | `M:1173`-`M:1175` `toEqual(keys(...))`, `choice: option`, `send` nulo; `M:1207` | ✅ PASS |
| CLK-42 | `outra resposta…`: modo texto, campo vazio | `M:1192`-`M:1194` `modal: { question, choice: null, text: "", ... }`, `send` nulo | ✅ PASS |
| CLK-43 | Fora da caixa nas linhas 0..38: como `esc` | `M:1223` `toEqual(closed)` em toda célula fora da caixa; `H:698` | ✅ PASS |
| CLK-44 | Dentro da caixa fora das linhas de opção: nada | `M:1246` `toBe(v.ui)` em toda célula da caixa; `H:718` | ✅ PASS |
| CLK-45 | Atalhos da linha 39 com as teclas do modal | `M:1265`-`M:1266` `send: { question_id, answer }`; `M:1279`-`M:1290`; `M:1299`-`M:1301`; `M:1310`-`M:1311`; `M:1330`-`M:1331` | ✅ PASS |
| CLK-46 | Clique < 500 ms após o anterior: nada, sem envio | `M:1376`-`M:1377`; `M:1390`-`M:1391` 500 ms vale; `M:1405`; `L:392` `expect(t.posts).toEqual([])` | ✅ PASS |
| CLK-47 | Enviando: nada; recusado: só fechar | `M:1465` `toBe(v.ui)` em toda célula, clique e roda; `M:1477`-`M:1482` | ✅ PASS |
| CLK-48 | Roda com modal: nada | `M:1493`, `M:1505` `toBe(v.ui)` | ✅ PASS |
| CLK-49 | Só o clique no atalho `enter` faz `POST /answer`, um, credencial lida na hora | `M:1517` `expect(next.ui.send !== null).toBe(y === 39 && enter.includes(x))`; `M:1533`; `L:358` corpo `{ human_token: TOKEN, question_id: 7, answer: "5 tentativas" }`, `L:359` `t.tokens` 1, `L:361` um único não-GET | ✅ PASS |
| CLK-50 | `m`: sequências e aviso de 4 s | `M:1649`-`M:1650` `until: v.squad.now + 4000`; `M:1672` `mouse ligado`; `L:302` `toContain("\x1b[?1006l" + "\x1b[?1000l")` | ✅ PASS |
| CLK-51 | Mouse desligado: relatório descartado | `M:402`-`M:403` `toBe(v.ui)` e `clickedAt` intacto; `M:1664` | ✅ PASS |
| CLK-52 | `0` desliga sem CLK-01; ausente, vazia, `1` ligam | `C:94` `expect(mouseOn({ SQUAD_TUI_MOUSE: value })).toBe(on)`; `L:106` `expect(t.out).toBe(ENTER)`; `L:140`; `IT:82` `expect(seen.text).not.toContain("\x1b[?1000h")` | ✅ PASS |
| CLK-53 | Outro valor: sai com 1, mensagem com variável e valor | `C:100` `toThrow(\`SQUAD_TUI_MOUSE: "${value}" is not 0 or 1\`)`; `IT:37`-`IT:38`; `IT:45`-`IT:47` | ✅ PASS |
| CLK-54 | `m` é texto com modal; nada com terminal pequeno | `M:1688` `text: "logom"`; `M:1693`; `M:1703`; `L:562`; pequeno `L:233` | ✅ PASS |
| CLK-55 | Linha `m  mouse liga / desliga · clique = tecla`, desvio D4 | `HE:12` `expect(keys()[10]).toBe("m           mouse liga / desliga · clique = tecla")`; `HE:19`; `HE:24` | ✅ PASS |
| CLK-56 | Toda tecla como antes, mouse ligado ou não | `M:1744`-`M:1745`; `M:1778` `toEqual(press(v.ui, key, v)!)` em toda tecla de nove estados; `M:1789`; `tui-keys.test.ts` sem alteração no diff | ✅ PASS |
| CLK-57 | Frames iguais, fora a linha de CLK-55 | `F:40` cada frame igual a `expected(id)`; `test/frames/*.txt`, `test/frames/view.ts` e `tui-keys.test.ts` sem alteração em `36440a6..b0468be` | ✅ PASS |

**Status**: ❌ três ACs com lacuna (CLK-03 e CLK-04 pelo S1, CLK-20 pelo S2); 54 de 57 com evidência que bate com a saída da spec; 9 spec-precision gaps sinalizados (os da volta 2, reconferidos no código; nenhum novo).

### ⚠️ Spec-precision gaps

Nenhum é defeito; o código decide o que a spec deixa aberto. Cada um foi reconferido no código desta volta.

| Req | O que a spec deixa aberto | O que o código e os testes fixam |
| --- | ------------------------- | -------------------------------- |
| CLK-01, CLK-02, CLK-50 | A ordem dentro de cada par | `1000h` depois `1006h`; `1006l` depois `1000l` (`tui/ansi.ts:34`-`35`; `L:97`, `L:129`) |
| CLK-46 | O que é "o clique anterior": se conta o clique que não fez nada, e por qual relógio | Todo clique lido com o mouse ligado, pelo relógio da leitura (`tui/mouse.ts:158`; `M:462`) |
| CLK-41, CLK-44 | A borda numa linha de opção: CLK-41 diz "qualquer célula dela dentro da caixa", e a caixa inclui a borda | Borda inerte (`tui/screens/answer.ts:62`; `M:1246`) |
| CLK-09 | `ESC [ <` com dígitos que chega a um caractere que não é letra, dígito nem `;` | Descarta até ali; o caractere seguinte é tecla (`I:43`-`I:44`) |
| CLK-10 | Formato antigo partido, ou com menos de três caracteres | Descartado como o inteiro, também depois dos 40 ms (`L:519`, `L:539`) |
| CLK-14, CLK-15 | Com que desenho se compara o segundo relatório, ou o relatório depois de uma tecla, da mesma leitura | O último desenho escrito; o clique só vale se a tela e a presença do modal não mudaram (`tui/mouse.ts:161`, `167`; `M:1565`) |
| CLK-17 | O que a sonda faz com entrada que não é relatório | `outra entrada: …`, e sai em qualquer `q` dela, também dentro do formato antigo (`P:32`) |
| CLK-50 | `m` na tela congelada (CLK-54 só cita modal e terminal pequeno) | `m` liga e desliga (`M:1675`-`M:1681`) |
| CLK-46, CLK-50 | Se `m` zera "o clique anterior" | `m` guarda a hora do último clique (`tui/mouse.ts:189`; `M:1649`) |

---

## Edge Cases

- [x] Roda para cima sem linha selecionada: a primeira das três seleciona a última (`M:1016`-`M:1018`)
- [x] Clique na linha selecionada de um `question` que espera o dev: modal, sem envio (`M:616`-`M:618`)
- [x] Clique na aba em que a TUI já está: `3` no thread volta ao ticket da linha selecionada (`M:157`-`M:159`)
- [x] Modal aberto por clique e clique seguinte a 500 ms ou mais: regras do modal (`M:1390`-`M:1391`, `L:392`-`L:398`)
- [x] `x` ou `y` igual a 0: fora da grade (`M:379`)
- [ ] Inteiros maiores que um inteiro seguro: fora da grade só por `point` (`M:109`, `M:379`); pela entrada (`keysOf`/`input`/`take`) nenhum teste, e o S1 sobrevive → Fix 1
- [x] Terminal maior que 120×40, clique fora da grade: nada (`M:391`)
- [x] Terminal volta a 120×40: cliques valem sem novo pedido (`L:243`-`L:245`)
- [x] `m` desliga e a TUI sai: sequências de CLK-02 (`L:330`)
- [x] Terminal que não manda relatório: teclado como antes (`M:1744`-`M:1789`)

---

## Gate Check

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit && bun test` (de `broker/`, na cópia física em `b0468be`)
- **Result**: `tsc` exit 0; **2076 pass, 5 skip, 1 fail**, 2082 testes em 83 arquivos, 162 s. A única falha é `EVT-43` (`test/integration/routes.test.ts:268`, `acked_at` 1 ms antes do `Date.now()` do teste: 1791992215329 contra 1791992215330), anterior à fatia e instável nesta máquina com o Bun 1.3.14 também na `main`. Rodado sozinho na mesma cópia: 1 pass, 0 fail. Conta como gate passado.
- **Test count before feature**: 1646 pass, 5 skip (Windows, `36440a6`)
- **Test count after feature**: 2077 pass com `EVT-43` (2076 + 1), 5 skip
- **Delta**: +431 testes (os 427 da volta 1, os 2 da T28 e os 2 da T29)
- **Skipped tests**: os 5 são anteriores à fatia: `cli.test.ts:355`, `cli.test.ts:390`, `server-credential.test.ts:57` e `presence.test.ts:6` (pulados no Windows), `tui-loop.test.ts:990` (QST-99 completo, só com `SQUAD_TEST_FULL`)
- **Integridade**: nenhum teste removido; a T29 só acrescentou dois testes; `tui-keys.test.ts`, `test/frames/view.ts` e os `.txt` de `test/frames/` sem alteração no diff

---

## Discrimination Sensor

Cada mutação aplicada na cópia com um script Python (substituição exata de uma ocorrência), rodada contra `bun test test/unit/tui` (26 arquivos, 873-878 testes) e, nas de `keys.ts`, `tui.ts` e da sonda, também contra `test/integration/tui-mouse` e `test/integration/mouse-probe`; desfeita com `git checkout -- <arquivo>` antes da seguinte, com `git status --porcelain` da cópia vazio depois de cada uma. As duas sobreviventes foram rodadas de novo contra `test/unit` inteiro e as duas integrações (1863 testes) e sobreviveram de novo. Nenhuma morte dependeu de teste instável. As 34 mutações `R` são novas: nenhuma repete as M01 a M31 da volta 1 nem as N01 a N43 da volta 2. Foco desta volta: limites de cada caixa e lista (última coluna, última linha, borda de baixo), contagens, singular e plural, as telas menos amostradas (thread, histórico, modal, sonda) e a roda no modal.

| # | File:line | Mudança | Killed? |
| - | --------- | ------- | ------- |
| M31 | `broker/tui.ts:182` | Volta 1: na tela pequena, `keysOf(chunk)` → `[...chunk]` | ✅ Killed (2: CLK-10 em 119×40 e 120×39) |
| N30 | `broker/tui/screens/questions.ts:216` | Volta 2: `ky <= 24` → `ky < 24` | ✅ Killed (2: os testes da T29, `H:630` e `M:962`) |
| R01 | `broker/tui/screens/questions.ts:126` | Marca da pergunta sem a última coluna de dentro da lista (58 → 57) | ✅ Killed (13: CLK-24/25, CLK-40) |
| R02 | `broker/tui/screens/questions.ts:83` | Caixa da lista sem a borda de baixo para a roda (24 → 23 linhas) | ✅ Killed (10: CLK-30/31, CLK-40) |
| R03 | `broker/tui/screens/questions.ts:187` | Caixa do histórico sem a borda de baixo (12 → 11) | ✅ Killed (14: CLK-26, CLK-30/31) |
| R04 | `broker/tui/screens/thread.ts:48` | Caixa do thread sem a borda da direita (76 → 75) | ✅ Killed (6: CLK-29) |
| R05 | `broker/tui/screens/main.ts:91` | Ticket sem a última coluna de dentro (26 → 25) | ✅ Killed (5: CLK-22) |
| R06 | `broker/tui/screens/main.ts:218` | Linha do feed sem a coluna 84 (56 → 55) | ✅ Killed (6: CLK-20, CLK-21) |
| R07 | `broker/tui/screens/answer.ts:62` | Linha de opção sem a última coluna de dentro da caixa (`BOX - 2` → `BOX - 3`) | ✅ Killed (6: CLK-41, CLK-42) |
| R08 | `broker/tui/screens/answer.ts:46` | Marca de `esc` do modal sem a coluna 119 (120 → 119) | ✅ Killed (15: CLK-40, CLK-43) |
| R09 | `broker/tui/screens/chrome.ts:142` | Selo de gate só no plural (`gate \S+ pendente` tirado) | ✅ Killed (4: CLK-36, frames 18a e 22g) |
| R10 | `broker/tui/screens/chrome.ts:142` | Selo de permissão só no plural (`permissão \S+` tirado) | ✅ Killed (4: CLK-37, frames 14 e 22g) |
| R11 | `broker/tui/screens/questions.ts:216` | `chosen &&` tirado: sem pergunta, a terceira linha do detalhe ganha as marcas de `enter` e `b` | ✅ Killed (1: CLK-33 `H:620`) |
| R12 | `broker/tui/mouse.ts:81` | `toSide` sempre dá `h`, também com o foco já do lado | ✅ Killed (9: CLK-25, CLK-26, CLK-30/31) |
| R13 | `broker/tui/mouse.ts:153` | A soltura do botão esquerdo vale como clique | ✅ Killed (2: CLK-06) |
| R14 | `broker/tui/mouse.ts:110` | Sem seleção, a caminhada parte da penúltima linha (`rows.length - 1` → `- 2`) | ✅ Killed (4: CLK-20, CLK-05, CLK-14) |
| R15 | `broker/tui/mouse.ts:122` | Índices da pergunta tomados em `squad.questions`, não na lista ordenada de `waiting` | ✅ Killed (1: CLK-25 `M:846`) |
| R16 | `broker/tui/screens/chrome.ts:168` | Marca do custo sem o `│` | ✅ Killed (10: CLK-39) |
| R17 | `broker/tui/screens/chrome.ts:102` | Contador `? N` sem a última célula | ✅ Killed (5: CLK-23) |
| R18 | `broker/tui/screens/chrome.ts:130` | Aba sem a última célula | ✅ Killed (13: CLK-18, CLK-14) |
| R19 | `broker/tui/screens/chrome.ts:73` | Atalho de duas teclas sem a marca do último caractere (`k`, `]`, `↓`) | ✅ Killed (9: CLK-34) |
| **R20** | `broker/tui/keys.ts:40` | `\x1b\[<[0-9;]*[A-Za-z]?` → `\x1b\[<[0-9;]{0,24}[A-Za-z]?`: um relatório com mais de 24 dígitos e `;` deixa de ser um item | ❌ **Survived** → Fix 1 |
| R21 | `broker/tui/screens/answer.ts:47` | Borda de baixo da caixa do modal vira `esc` (`h` → `h - 1`) | ✅ Killed (15: CLK-44, CLK-41/42) |
| R22 | `broker/tui/screens/main.ts:23` | Caixa dos agentes sem a borda de baixo | ✅ Killed (5: CLK-19) |
| R23 | `broker/tui/screens/questions.ts:220` | `próxima bloqueante` sem a última célula | ✅ Killed (4: CLK-33) |
| R24 | `broker/tui/screens/chrome.ts:72` | Descrição de atalho da linha 39 sem a última célula | ✅ Killed (37: CLK-33, CLK-45) |
| R25 | `broker/tui/screens/main.ts:91` | Ticket da forma compacta marcado em duas linhas: a linha depois do último ganha o ticket | ✅ Killed (5: CLK-22, CLK-27 `+N tickets`) |
| R26 | `broker/tui/mouse.ts:124` | Pergunta selecionada abre o modal também com o foco no histórico | ✅ Killed (1: CLK-25 `M:868`) |
| R27 | `broker/tui/mouse.ts:170` | Com o modal, a roda deixa de ser barrada (`(wheel \|\| quick)` → `quick`): fora da caixa ela fecha o modal | ✅ Killed (6: CLK-48) |
| R28 | `broker/tui/keys.ts:40` | Formato antigo com dois caracteres, não três (`{0,3}` → `{0,2}`) | ✅ Killed (8: CLK-03, CLK-04, CLK-10) |
| R29 | `broker/tui/mouse-probe.ts:19` | A sonda não segura o `;` de um relatório partido | ✅ Killed (3: CLK-17) |
| R30 | `broker/tui/mouse-probe.ts:36` | A sonda troca `pressão` e `soltura` | ✅ Killed (11: CLK-17) |
| R31 | `broker/tui.ts:188` | O laço pede os relatórios de novo a cada leitura com o mouse ligado | ✅ Killed (3: CLK-12/54, CLK-54) |
| **R32** | `broker/tui/mouse.ts:110` | `from < 0` → `from <= 0`: com a primeira linha do log selecionada, o clique toma o caminho de "nada selecionado" | ❌ **Survived** → Fix 2 |
| R33 | `broker/tui/screens/questions.ts:126` | Marca da pergunta uma linha além da rota (`y - top + 1` → `+ 2`) | ✅ Killed (8: CLK-24/25) |
| R34 | `broker/tui/mouse.ts:117` | Caminho até o ticket parte do thread do estado antes de `3` | ✅ Killed (1: CLK-22 `M:666`) |

**Sensor depth**: P0 (integridade do dado: nenhum clique grava resposta por engano), 36 mutações manuais nesta volta (34 novas, M31 e N30)
**Result**: 34 killed, 0 equivalentes, 2 survived (R20, R32) - ❌ FAIL

Sobre o R20 (não equivalente): com o mutante, `keysOf("\x1b[<0;" + "9".repeat(400) + ";5M")` dá 382 itens em vez de 1; `take` desse relatório no modo texto do modal deixa `"999…"` no campo, e na tela principal o mesmo relatório com `2`s troca para a topologia. O código atual dá um item e não muda nada. Os testes do inteiro de 400 dígitos (`M:109` com `parse`, `M:379` com `point`) não passam por `keysOf`, e os de `I` só usam relatórios curtos.

Sobre o R32 (não equivalente): com o mutante, no frame 01 com a linha de `seq` 1 (a primeira de `rows`) selecionada, um clique na linha de `seq` 2 deixa a seleção em 1; o código atual a passa para 2, como `j`. Os testes de CLK-20 partem da linha 417 (`M:533`) ou de nenhuma seleção (`M:550`), nunca do índice 0.

Isolamento: `git status --porcelain` da cópia vazio depois de cada mutação e depois do teste descartável (`test/unit/zz-probe.test.ts`, criado e apagado na cópia); o da árvore real vazio antes do sensor e, depois, só com este relatório.

---

## Interactive UAT Results

Não feito: o dev decidiu em 2026-10-14 fechar sem a conferência em terminal real (`real-terminal.md`). Não conta como lacuna de teste. O que depende dela:

| Critério | Depende de |
| -------- | ---------- |
| Goal 1 e Success Criterion 1: o percurso só com o mouse num terminal de 120×40 | RT-02 a RT-05 |
| Goal 4 e Success Criterion 4: o shell não recebe relatório depois de `q`, `ctrl+c` e erro | RT-07 (os testes provam as sequências e a ordem, não o terminal) |
| CLK-28 no uso real: quantos relatórios o terminal manda por passo da roda | RT-04 |
| A suposição de `shift` + arrasto selecionar com o mouse ligado | RT-06 |
| Coluna e linha certas nos quatro cantos | RT-01 (registrada sem os cantos) |
| Linux interativo | RT-08 (não exercitado) |

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `tui/mouse.ts` com 194 linhas (`parse`, `point`, `take`); nenhuma camada além do design |
| Surgical changes | ✅ As telas ganham só chamadas `mark`; `drawKeys` só o parâmetro `modal`; a T29 tocou só dois arquivos de teste |
| No scope creep | ✅ Nada de hover, arrasto ou rota nova; nenhum `POST` além do `/answer` (CLK-49) |
| Matches patterns | ✅ Estado do mouse fora de `Ui` (`Pointer`), como o AD-021 pede; comentários no estilo vizinho |
| Spec-anchored outcome check | ✅ "Como a tecla K" comparado com `press`/`keys` no mesmo estado; células achadas no texto desenhado |
| Per-layer Coverage Expectation | ⚠️ Marcas das telas: primeira e última célula de cada elemento, testadas (R01-R25 morreram). Leitura da entrada: relatório longo só pelo `parse` (Fix 1). Redutor: CLK-20 sem a seleção no índice 0 (Fix 2) |
| Every test maps to a spec requirement | ✅ Todo teste novo começa por `CLK-nn` |
| Documented guidelines followed: `tasks.md` (regras do topo), `broker/CLAUDE.md`, `.specs/LESSONS.md` (L-001, L-010, L-020, L-036, L-050) | ⚠️ L-010 (cada gatilho com a sua afirmação): o gatilho "mais dígitos que um inteiro seguro" tem afirmação em `point` e não na entrada |

Payload/conjunction: os `POST /answer` são afirmados no corpo inteiro (`L:358` `{ human_token: TOKEN, question_id: 7, answer: "5 tentativas" }`, `L:398`), não só na chamada; os `send` do redutor, em `question_id` e `answer` (`M:1266`, `M:1280`).

Observação sem tarefa (das voltas 1 e 2, ainda vale): `broker/tui/screens/questions.ts:213`-`223` recalcula a linha e as colunas dos dois atalhos à parte de `drawRows`. Os testes da T29 a seguram.

---

## Fix Plans

### Fix 1: CLK-03/CLK-04 sem afirmação de um relatório longo pela entrada

- **Root cause**: o edge case "inteiros com mais dígitos do que um inteiro seguro comporta" só é afirmado em `parse` (`M:109`) e em `point` (`M:379`), que recebem o relatório já inteiro. Nenhum teste dá esse relatório a `keysOf`, `input` ou `take`, e o limite `{0,24}` em `broker/tui/keys.ts:40` (R20) parte o relatório em dígitos que viram teclas e texto sem que nada falhe.
- **Fix task**:
  - **What**: um teste em que um relatório com um inteiro de 400 dígitos (na coluna e, à parte, na linha) é um item só de `keysOf`; `take` dele não muda a tela principal (com `2`s nos dígitos, a tela continua `main`) e não acrescenta nada ao texto do modo texto do modal.
  - **Where**: `broker/test/unit/tui-mouse-input.test.ts`, ao lado dos testes de CLK-04 (`I:62`-`I:83`); nome começando por `CLK-04:`.
  - **Verify**: o teste passa no código atual e falha com `broker/tui/keys.ts:40` `\x1b\[<[0-9;]*[A-Za-z]?` → `\x1b\[<[0-9;]{0,24}[A-Za-z]?`.
  - **Done when**: o teste existe, passa, mata o R20, e `bun node_modules/typescript/bin/tsc --noEmit && bun test` passa.
- **Priority**: Minor (lacuna de teste; o código está correto)

### Fix 2: CLK-20 sem a seleção na primeira linha do log

- **Root cause**: os testes de CLK-20 partem da linha 417 (`M:533`) ou de nenhuma seleção (`M:550`). Com a primeira linha de `rows` selecionada, `from` é 0, e o mutante `from <= 0` em `broker/tui/mouse.ts:110` (R32) trata o caso como "nada selecionado": a seleção fica na primeira linha.
- **Fix task**:
  - **What**: um teste em que a linha de `seq` 1, a primeira do log do frame 01, está selecionada (a janela do feed desce até ela), e um clique numa linha abaixo, achada no texto desenhado, dá o mesmo `Ui` que `j` repetido até ela por `keys(v, ...)`, com o foco no feed.
  - **Where**: `broker/test/unit/tui-mouse.test.ts`, ao lado do teste de `M:550`; nome começando por `CLK-20:`.
  - **Verify**: o teste passa no código atual e falha com `broker/tui/mouse.ts:110` `from < 0` → `from <= 0`.
  - **Done when**: o teste existe, passa, mata o R32, e `bun node_modules/typescript/bin/tsc --noEmit && bun test` passa.
- **Priority**: Minor (lacuna de teste; o código está correto)

Esta foi a terceira volta: pelo limite de `validate.md`, as duas tarefas vão ao dev, que decide se as aplica e pede uma verificação a mais ou se fecha com elas registradas.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CLK-01 | Implementing | ✅ Verified |
| CLK-02 | Implementing | ✅ Verified |
| CLK-03 | Implementing | ❌ Needs Fix |
| CLK-04 | Implementing | ❌ Needs Fix |
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
| CLK-20 | Implementing | ❌ Needs Fix |
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

**Spec-anchored check**: 54/57 ACs com evidência que bate com a saída da spec; 3 lacunas (CLK-03 e CLK-04 pelo relatório longo na entrada, CLK-20 pela seleção na primeira linha); 9 spec-precision gaps sinalizados, nenhum novo
**Sensor**: 34/36 killed, 0 equivalentes, 2 survived (R20, R32); M31 e N30 mortos
**Gate**: `tsc` 0; 2076 pass, 5 skip, 1 fail (`EVT-43`, ambiental, passa sozinho)

**What works**: a T29 fecha a lacuna da volta 2 (N30 morto) e a T28 continua matando o M31. As marcas de todas as telas resistem a toda mutação de limite tentada (última coluna, borda de baixo, primeira e última célula, singular e plural dos selos); a roda no modal, a sonda, o pedido dos relatórios e o caminho até o ticket e até a pergunta também. Toda mutação que poderia gravar uma resposta por engano morreu nas três voltas.

**Issues found**: Fix 1 (um teste de CLK-04 com um relatório de 400 dígitos por `keysOf`/`take`) e Fix 2 (um teste de CLK-20 com a primeira linha do log selecionada). Os dois são testes; o código está correto.

**Next steps**: levar as duas tarefas ao dev, já que esta foi a terceira e última volta. A conferência em terminal real (RT-02 a RT-08) continua aberta por decisão do dev e não bloqueia esta verificação.

---

## Nota de fechamento (2026-10-14, depois da volta 3)

Escrita pelo orquestrador, não pelo Verifier. O veredito da volta 3 acima continua **FAIL** e não foi mudado.

- O dev decidiu em 2026-10-14 aplicar o Fix 1 e o Fix 2 como T30 e T31 e fechar a fatia **sem uma quarta volta do Verifier**, como fez com a Papéis.
- **T30** (`85f3860`) fecha o Fix 1: dois casos de CLK-04 em `broker/test/unit/tui-mouse-input.test.ts`, um relatório com um inteiro de 400 dígitos `2` na coluna e outro na linha. Cada um é um item só de `keysOf`, e `input` e `take` dele deixam a tela `main` e o texto do modal vazio. Numa cópia física do branch (`git clone` + `bun install --frozen-lockfile`), com o R20 (`broker/tui/keys.ts:40`, `[0-9;]*` → `[0-9;]{0,24}`) os dois falham e o resto do arquivo passa; sem ele passam.
- **T31** (`dafa7f1`) fecha o Fix 2: um caso de CLK-20 em `broker/test/unit/tui-mouse.test.ts` com a linha de `seq` 1, a primeira do log do frame 01, selecionada; o clique em 14:03:01 e em 14:17:48 dá o `Ui` de `j` duas e seis vezes. Na mesma cópia, com o R32 (`broker/tui/mouse.ts:110`, `from < 0` → `from <= 0`) ele falha e os outros 196 casos do arquivo passam.
- A cópia foi descartada sem tocar a árvore real; nenhum código de produção mudou.
- A suíte em `dafa7f1`: Windows, Bun 1.3.14, `tsc` 0 e 2080 pass, 5 skip, 0 fail, 83 arquivos; Linux, contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps` sobre um clone `core.autocrlf=false` montado só para leitura, `tsc` 0 e 3 de 3 execuções com 2084 pass, 1 skip, 0 fail.
- Na spec, CLK-03, CLK-04 e CLK-20 passam a `Verified` por essa evidência, e as nove lacunas de precisão da tabela "Spec-precision gaps" acima estão em "Assumptions" como decisão do dev de 2026-10-14: ficam como o código faz.
- **O que ficou sem cobrir**, por não haver quarta volta: nenhuma varredura de mutantes nova sobre `b0468be..dafa7f1`, nem uma releitura independente dos dois testes novos. Eles só acrescentam casos de teste. `validate_state.py tui-clicavel` continua saindo com 1, porque o veredito acima é FAIL: é o estado aceito.
