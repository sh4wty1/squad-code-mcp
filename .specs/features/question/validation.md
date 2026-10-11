# Question Validation

**Result**: PASS

**Round**: 8, restrita
**Date**: 2026-10-11
**Verifier**: agente novo e independente; não escreveu implementação, testes, planos de correção nem relatórios anteriores.
**Spec**: `.specs/features/question/spec.md:319`, QST-78 l; `spec.md:329`, QST-99 e. Escopo de `fix-round-7.md`, seção "Depois da tarefa", e Handoff de `STATE.md`.
**Diff range**: `832a1d7..0e49bfe68d00d05a9c8a71b72e5867b0a5808b6c`, branch `feat/question`, HEAD fixo.
**Environment**: Windows, Bun 1.4.2, TypeScript instalado localmente. Gate full fora do sandbox, com os DBs e tokens temporários do harness.

O resíduo I4 da rodada 7 está fechado. As duas cláusulas agora têm evidência discriminante no teste F37 comprometido. As outras 26 cláusulas e os outros 33 mutantes conservam a evidência da rodada 7, sem nova execução ou reavaliação nesta rodada. O full passa. Nenhum defeito de produção foi observado.

## Evidência por cláusula

Citações de testes são relativas a `broker/`. Os resultados esperados foram conferidos contra a spec, independentemente da evidência do autor.

| Cláusula | Resultado definido pela spec | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| QST-78 l | Cada marcador é reconhecido em quantas leituras vier, em qualquer tamanho; não acrescenta texto nem altera a tela. O início torna o próximo `\r` um espaço; o fim devolve o enter que envia | `test/unit/tui-loop.test.ts:825`, `expect(cases.length).toBe(256)`; `:839`, `expect(t.posts).toEqual([])`; `:843`, `expect(t.lines()).toEqual(tab(t.view(open)))`; `:846`, nenhum POST; `:847`, tela inteira com `text: "logo "`; `:849`, POST inteiro de Q-08 com `answer: "logo"` | PASS, F37 sozinho mata I4 |
| QST-99 e, resíduo de três ou mais leituras | Os marcadores começam/terminam a colagem também no terminal pequeno. Ao crescer, o modal/texto original retorna e a próxima quebra observa o estado de colagem correto | `test/unit/tui-loop.test.ts:835`, tamanho aplicado antes de `:838`, leituras consecutivas; `:839`, nenhum POST; `:840`–`:843`, crescimento e tela inteira com `logo`; `:846`–`:849`, nenhum envio/texto com espaço após início, POST exato após fim | PASS; os três tamanhos pequenos integram o produto |

O produto de `:811`–`:824` cruza dois marcadores de seis bytes, quatro tamanhos (120×40, 119×40, 120×39, 100×30) e os 32 subconjuntos dos cinco intervalos internos. Uma auditoria independente confirmou partições distintas, ordenadas e não vazias, distribuídas em 1/5/10/10/5/1 partições de uma/duas/três/quatro/cinco/seis leituras por marcador. São 256 casos. `:830`–`:834` abre Q-08 com `logo` e inicia a colagem antes do marcador final. `:838` entrega todos os pedaços consecutivamente, sem espera.

O oráculo escreve o estado esperado e textos literais, usa o desenho da tela para comparar o modal completo e observa a colagem pelo próximo enter. Não consulta `key`, `input`, `press` ou `marks` para calcular o resultado. O POST de `:849` fixa URL `/answer`, token, `question_id: 8` e `answer: "logo"`. Contagem/preparação, preservação da tela/texto, estado de colagem e payload exato são asserções necessárias para F37 e QST-78/99; o payload também respeita QST-76. Nenhuma asserção nova está sem âncora.

## Evidência histórica conservada

A rodada 7 abaixo permanece como história do HEAD `832a1d7`: seção "Spec-anchored acceptance criteria", QST-36 a–j (10), QST-78 a–k (11) e QST-99 a–d/f (5). São 26 cláusulas com evidência `file:line` e resultado definido pela spec. O complemento novo é QST-78 l e o resíduo de QST-99 e. Resultado acumulado: **28/28 cláusulas**, duas verificadas nesta rodada e 26 conservadas.

A seção "Discrimination sensor" da rodada 7 conserva os 33 mortos: X3/X5/X6/X7, N8/N11/N5, V1/V2/V3/V4/V5/V7/V7b/V8/V11/V13/V14/V15/V16, C2, Q5/Q6/Q6a/Q7, R2/R3/R15/R18, W4 e I1/I2/I3. Nenhum foi reinjetado. I4 foi o único sensor executado aqui. Evidência acumulada: **34/34 mutantes mortos**, 1/1 reavaliado nesta rodada e 33/33 conservados; isso não é uma nova execução de todos.

O completo da F35 permanece com o resultado independente da rodada 7: 1 pass, 0 fail, 33600 casos e 187862 asserções, 548,56 s. Não foi repetido: `smallCases`, `checkSmall`, `checkSmallCases`, consumidores e asserções estão byte a byte iguais nos blobs Git, salvo o deslocamento das linhas. A auditoria `verifier8-integrity.json` confirma isso. QST-37/QST-48 e os demais requisitos conservam suas disposições históricas sob o gate de regressão atual.

Apenas o rótulo do veredito da rodada 7 foi apresentado como `Historical verdict`, mantendo FAIL e todo o restante do conteúdo. `validate_state.py` agrega os rótulos `Result` do arquivo e confundiria PASS atual com FAIL histórico como placeholder. O script e a conclusão histórica não foram alterados.

## Gate no HEAD, integridade e qualidade

- De `broker/`: `bun node_modules/typescript/bin/tsc --noEmit`, exit 0; `bun test`, exit 0: **1303 pass, 4 skip, 0 fail**, 108438 asserções, 1307 testes em 63 arquivos, **94,18 s**.
- Skips: dois PEER-44 de busca/sinalização de listener no Windows; PEER-14 de pid de outro usuário; completo opcional F35 sem `SQUAD_TEST_FULL`, conforme decisão do dev. Os três primeiros são anteriores de plataforma; o quarto retém o completo histórico, pois nenhuma função autorizada a disparar sua repetição mudou.
- Antes da feature: 926 pass/3 skip; rodada 7: 1302 pass/4 skip; esta rodada: 1303 pass/4 skip. Um teste adicionado, sem remoções ou skips novos.
- O diff em `broker/test` é exatamente +50/−0, só em `test/unit/tui-loop.test.ts`. Retirar a adição F37 do blob HEAD reproduz integralmente o blob `832a1d7` do arquivo. Nenhuma asserção anterior mudou de valor esperado. Não há diff de produção, frames, dependências, manifestos ou lockfile.
- Mudança cirúrgica, conforme a matriz de `tasks.md` e `broker/CLAUDE.md`: F37 cobre a junção das leituras em `tui.ts:185`–`:200` com o laço real e fetch/terminal injetados. Sem flexibilidade, abstração ou comportamento extra de produção. As alterações documentais mantêm as regras QST-78/99; a referência F36 em QST-45 foi retirada conforme a disposição da rodada 7.

## Sensor e isolamento

Cópia física de `broker/`, com `node_modules` próprio, em `verifier8-scratch/broker` dentro do diretório de evidências abaixo. Sem worktree, junction, link ou stash. Auditoria de reparse points antes/depois da cópia: zero. Todos os **4316 arquivos** copiados tinham SHA-256 igual ao real antes do sensor.

| Execução | Mutação e teste | Resultado |
| --- | --- | --- |
| Controle | Original, `bun test test/unit/tui-loop.test.ts --test-name-pattern 'all 32 partitions'` | Exit 0, 1 pass, 39 filtrados, 0 fail, 1153 asserções, 256 casos, 5,67 s |
| I4 | Só `/u.exec(input)?.[0]` → `/u.exec(chunk)?.[0]` em `tui.ts:191`; F37 sozinho pelo mesmo comando | **Morto**, exit 1, 0 pass, 1 fail, 39 filtrados, 19 asserções, 181 ms. Diferença comportamental da tela em `tui-loop.test.ts:843`; sem timeout ou erro de sintaxe |

Nenhum mutante adicional foi criado. I4 já era o mutante comportamental definido na rodada 7; sua discriminação independente foi confirmada no teste comprometido.

`tui.ts` foi restaurado byte a byte e comparado com o arquivo real. Antes da remoção, os 4316 arquivos da cópia restaurada e da árvore real conferiram com os hashes anteriores. A remoção usou PowerShell `Remove-Item -LiteralPath`, após conferir o caminho absoluto dentro do scratch escolhido e zero reparse points. Depois da remoção, os 4316 arquivos reais, inclusive dependências ignoradas, continuavam idênticos ao baseline. Scratch removido. Porcelain real vazio antes e depois do sensor; HEAD fixo. A auditoria também cobre o estado ignorado que porcelain sozinho não detecta.

## Logs, limites e disposição

Evidências em `C:/Users/lucas/.codex/visualizations/2026/10/11/01a12cd7-55fd-7563-9df1-e47734f1ae61/`: `verifier8-tsc.log`, `verifier8-full.log`, `verifier8-F37-original.log`, `verifier8-I4.log`, `verifier8-integrity.json`, `verifier8-copy-hashes.json`, `verifier8-cleanup.log`, `verifier8-porcelain-before.txt`, `verifier8-porcelain-after-sensor.txt`, `verifier8-state.log`. O backup `verifier8-tui-original.bin` e a rodada 7 original `verifier8-validation-history.bin` conservam os bytes de referência.

Fragmentos consecutivos chegam antes do temporizador de escape de 40 ms. Intervalos maiores, terminal interativo real, modo 2004 real, macOS/Linux, sinais reais e conversa Claude Code continuam fora do exercício desta rodada; os limites históricos não foram reavaliados. O sensor termina no primeiro mismatch, suficiente para matar I4, e não mede separadamente cada contexto do mutante.

**Resíduos**: nenhum no escopo autorizado. QST-36/78/99 podem passar a Verified pelo orquestrador sob a evidência acumulada. Este Verifier não altera spec, STATE, produção ou testes; não faz commit/push/merge nem abre nova rodada. Nenhuma lição nova: PASS sem sinal de falha. `validate_state.py question`: exit 0, zero erros, após escrever o relatório; log acima.

---

# Question Validation

**Historical verdict**: FAIL

**Round**: 7
**Date**: 2026-10-11
**Verifier**: independent sub-agent, author ≠ verifier. It wrote no implementation, tests, fix plan or earlier report. Its only tracked real-tree changes are this report and the lessons script's output. Ignored dependencies were restored after the cleanup incident documented below.
**Spec**: `.specs/features/question/spec.md`, whole QST-36, QST-78 and QST-99 at the fixed HEAD; effects on QST-37/QST-48; the other 96 requirements retain their previous verification subject to regression and expectation-integrity checks here.
**Diff range**: `6cd28e2..832a1d74c5157fc885c93d3a4b7aaa5160a9c766`, branch `feat/question`, ten commits, F29–F36 and their preceding documentation. No production or frame diff. In `broker/test`, four files, +438 −40.
**Environment**: Windows 11, Bun 1.4.2; installed TypeScript via its local binary. Linux, macOS and a real interactive terminal were not exercised in this round.

All `broker/` citations below are relative to that directory. The previous round is retained below as history, not a second global verdict.

The six ranked gaps and SP4 of round 6 closed. All 20 mutants required by F35 die in its 800-case test alone, and all nine required by F36 die in its generated-chain test alone. The full gate and the 33,600-case product pass at HEAD. One independent mutant survives both: using the new chunk rather than the accumulated input to retain an unfinished escape. The tests divide a marker into at most two reads; the new QST-78 sentence requires recognition in however many reads it arrives. A scratch probe in three and six reads passes on production and fails on the mutant. This is a coverage gap, with no production failure found by that probe.

## Ranked residue and decision

| # | Gap | Criterion | Evidence | Consequence under the mutant |
| - | --- | --------- | -------- | ---------------------------- |
| 1 | No committed test retains a marker's prefix across a second incomplete read. Both F35 variants use only whole markers or one internal cut into two reads | QST-78, final sentence, `spec.md:319`; QST-99's markers in any terminal size, `spec.md:329` | `tui-loop.test.ts:830` constructs exactly two reads; `:943` invokes the same generator for the complete product. I4 at `tui.ts:191` survives full and complete | In a small terminal the start marker is lost, so after growing the next `\r` can send the text of a paste. If the end marker is lost, the next `\r` remains a space. At normal size the broken escape also closes the modal |

Priority: **Major**, because a missed start marker can send an answer the dev did not confirm. The predicate changed by I4 is an existing expression, not an invented condition: `exec(input)` → `exec(chunk)`. It compiles, passes the full suite, and is not equivalent to production.

The decision returns to the dev, as expressly required by `fix-round-6.md`, "Depois da última tarefa". No F37, new fix round, test change or production correction was created. If the dev chooses to close the residue, the proof is a committed test of a marker with at least two consecutive partial prefixes before its terminator, through `start(...).key`, for both markers and small/normal sizes. Its expected screen, paste state observed by the following enter, and exact POST must come from QST-78/QST-99. The scratch probe below is a concrete reviewable reproduction; it is not a committed test.

## Gate check

- Full, from `broker/`: `bun node_modules/typescript/bin/tsc --noEmit`, then `bun test`. TypeScript exit 0; **1302 pass, 4 skip, 0 fail**, 107286 `expect()` calls, 1306 tests in 63 files, 106.79 s.
- Complete, on the same fixed HEAD: `$env:SQUAD_TEST_FULL='1'; bun test test/unit/tui-loop.test.ts --test-name-pattern 'the full product'`. **1 pass, 0 fail, 38 filtered out, 187862 assertions, 33600 cases, 548521.82 ms for the test and 548.56 s total, exit 0**. Literal timeout: 1800000 ms (`tui-loop.test.ts:945`). No case or assertion was changed to get this result.
- Before the feature: 926 pass, 3 platform skips. Before this round, `6cd28e2`: 1295 pass, 3 skip. This round adds seven passing tests and one explicitly authorized optional complete test. No test count decreased.
- Skips: the two PEER-44 checks for finding/signalling a listener on this platform; PEER-14 for a pid owned by another user; F35 complete outside the ordinary gate, as explicitly authorized. The fourth was executed separately above.
- Logs: `%TEMP%/question-verifier7-full.log`, `%TEMP%/question-verifier7-complete.log`. The tests manage their own temporary DB/token settings; no broker/server was launched manually.

## Task completion and the generated oracles

All F29–F36 boxes are checked. Their done-when assertions match the defined outcomes. F29/F30 add complete event, row and delivery assertions for another asker on the same ticket and another asker two merges away. F31 adds the paste state and middle positions to the quit scenarios. F32 drives esc through the loop while small. F33 asserts both line breaks with held-back keys in both modes. F34 adds the explicit split-marker sentence and a two-read scenario. F35 and F36 add the requested generators. The task list itself is fulfilled; the whole new marker clause is broader than F35's two-read cases and leaves the residue above.

F35: 10 one-key inputs plus 10 cuts, in 30 contexts (three sizes × five UI states × two paste states), produce 600 cases. Its 100 two-key and 100 three-key cases rotate through contexts and assert each required marginal at each position (`tui-loop.test.ts:919`, `:921`, `:925`, `:930`, `:931`, `:932`, `:934`). The complete generator has 10 + 100 + 1000 = 1110 whole-key words and ten cuts, crossed with 30 contexts: 33600 (`:825`, `:942`). These arithmetic results follow the stated dimensions. Both variants call `checkSmallCases` and `checkSmall`; neither gets a weaker oracle.

The UI before shrinking is stated in `smallCases`, then compared before the action (`tui-loop.test.ts:860`). The oracle walks the generated marker list and changes only the paste boolean (`:884`); it does not call `input`, `marks`, `press` or `keysOf` to calculate that value. It compares complete screens and exact POST bodies. It observes paste state by the next enter, then ends the paste and confirms the exact answer (`:897`, `:900`, `:903`). This distinguishes no key action while small, state restoration, markers, and subsequent key handling.

F36: six independent asker/ticket classes; chains of two to four nodes; at least one own T-1 question and at least two askers; both creation orders. This gives 684 chains × two orders = 1368 sequences (`question-replay.test.ts:462`), with depths 1/2/3 and both orders asserted (`:463`, `:464`). Calls are accepted through ask/merge/send/answer, and parity is compared after each. Defaults are distinct by chain position. The oracle uses the generated calls: each own question gets its own answer in id order, and each follower walks toward the root to the nearest own question (`:402`). It compares whole events (`:420`), all rows (`:427`) and all deliveries (`:434`), rather than merely comparing two implementations that might share a bug. The later root answer preserves previous defaults and excludes their old merges from delivery (`:441`, `:447`, `:450`).

## Spec-anchored acceptance criteria

Evidence-or-zero, clause by clause. An assertion expression below targets the spec's value, not merely an existing test. There is one shared residual gap, appearing in the two linked marker clauses.

### QST-36 (`spec.md:225`)

| Clause | Defined outcome | `file:line` and assertion | Evaluation |
| ------ | --------------- | ------------------------- | ---------- |
| a | Full broker answer with the question's own default and `result_default`; row defaulted with its seq | `send-result.test.ts:288` `expect(b.events()[7]).toEqual({... body:"8080", data:{... resolved_by:"result_default"}})`; `question-replay.test.ts:420` whole events, `:427` whole rows | PASS |
| b | Same transaction; result, unblocked if any, then answers | `send-result.test.ts:283` exact `[[6,"result","worker-1"],[7,"unblocked","broker"],[8,"answer","broker"]]`; `:370` thrown write and `:371`, `:372`, `:373` exact old events/deliveries/rows | PASS |
| c | All and only the sender's non-blocking T questions in open/merged, id ascending | `question-result.test.ts:43` full two-answer list, `:98` merged closure; `send-result.test.ts:317` exact result/answer order; `question-result.test.ts:367`, `:368`, `:369` excluded cases; replay `:420` | PASS |
| d | Own questions merged directly into each other keep each answer/default in either direction | `question-result.test.ts:170` exact two `storedDefault` events, `:171` rows and `:181` parity; replay `:420`, `:427`, creation orders `:464` | PASS |
| e | Same through another merged question | `question-result.test.ts:226` exact answers, `:227` rows; replay `:420`, `:427` | PASS |
| f | Other asker directly follows the closed question, including same ticket | `question-result.test.ts:291` one exact answer, `:292` rows and `:296` exact recipients; replay `:427`, `:434` | PASS |
| g | Same asker on another ticket directly follows, without own answer | `question-result.test.ts:250` one answer, `:251` rows; replay `:420`, `:427` | PASS |
| h | Same asker without ticket does the same | `question-result.test.ts:241` includes undefined ticket, `:250`, `:251` exact one-answer/row outcome; replay `:427` null ticket | PASS |
| i | Every foregoing follower shape also works indirectly; nearest own closure wins | `question-result.test.ts:312` one answer, `:313` rows, `:318` recipients; `:336`, `:337`, `:342` both middle askers; replay `:420`, `:427`, `:434` over all six classes and depths | PASS |
| j | Followers have no own answer | `question-result.test.ts:291`, `:312`, `:336` exact singleton event arrays; replay `:420` only own answers, `:427` inherited seqs | PASS |

### QST-78 (`spec.md:319`)

| Clause | Defined outcome | `file:line` and assertion | Evaluation |
| ------ | --------------- | ------------------------- | ---------- |
| a | Multi-key r/n in text are spaces, no send, including a modal entered earlier in the block | `tui-keys.test.ts:441` exact character array; `:471` complete state, `:478`, `:480` complete state after entering; `:463` r/n with more; `tui-loop.test.ts:439`, `:440` no POST and exact screen | PASS |
| b | In choice, the breaks ignore rather than confirm/send | `tui-keys.test.ts:492`, `:495`, `:497` exact modal choice; `:464` with more; `tui-loop.test.ts:460`, `:461` no POST/whole screen | PASS |
| c | No modal: r is enter and can open it | `tui-keys.test.ts:454` exact opened modal; `:577` `input(...,"\r",...,true)`; `tui-loop.test.ts:482` opened screen | PASS |
| d | No modal: n does nothing | `tui-keys.test.ts:584`, `:585`, `:586`, `:588` exact identity/state, including paste and more | PASS |
| e | Mode 2004 requested at entry and released at exit | `tui-ansi.test.ts:8`, `:9` exact ENTER/LEAVE strings; `tui-loop.test.ts:494`, `:514` actual output contains request/release | PASS |
| f | A break alone in a delimited paste stays a space in text | `tui-keys.test.ts:513`, `:514` whole state/send null; `tui-loop.test.ts:499`, `:500` no POST/whole screen | PASS |
| g | Same break ignored in choice | `tui-keys.test.ts:523`, `:524`, `:525` unchanged/send null or exact send after end; `tui-loop.test.ts:508` one prior POST only | PASS |
| h | No modal in paste: r can open, n remains inert | `tui-keys.test.ts:550`, `:552`, `:553` exact state/send; `:586` exact paste state | PASS |
| i | End marker restores ordinary enter | `tui-keys.test.ts:516`, `:525` exact send; `tui-loop.test.ts:502` exact POST after end | PASS |
| j | Esc ends a paste at ordinary size, also beside another key and in every modal mode | `tui-keys.test.ts:559`, `:561`, `:567`, `:569`, `:572` exact send after esc | PASS |
| k | Whole markers enter no text and change no screen | `tui-keys.test.ts:531`, `:533`, `:536` complete state, including all screens; full screen assertions in `tui-loop.test.ts:879` | PASS |
| l | Each marker recognized in however many reads it comes, at every size | `tui-loop.test.ts:751`, `:752`, `:879`, `:897` assert outcomes for two reads; generator `:830` never makes three. Scratch `verifier-fragment.test.ts:110`, `:113` pins three/six reads and kills I4, but is absent from the committed suite | GAP, I4 |

### QST-99 (`spec.md:329`)

| Clause | Defined outcome | `file:line` and assertion | Evaluation |
| ------ | --------------- | ------------------------- | ---------- |
| a | q quits any small dimension, with/without either modal and with/without paste | `tui-loop.test.ts:638`, `:639`, `:640` raw `[true,false]`, LEAVE, zero POST; generator `:867`, `:868`, `:869`, including q in each word position | PASS |
| b | ctrl+c does the same | `tui-loop.test.ts:638` `expect(t.raw).toEqual([true,false])`, `:639` LEAVE, `:640` zero POST; `:867`, `:868`, `:869` likewise for ctrl+c in each position and an active paste | PASS |
| c | Other keys do not change the covered UI or POST while small | `tui-loop.test.ts:874`, `:875`, `:876` raw active, no POST, exact small screen; `:879` full screen of before | PASS |
| d | On growing, original screen/modal/text/choice returns and keys work | `tui-loop.test.ts:879`, `:897`, `:900`, `:903` exact prior screen, exact POST or retained text-space/choice, then exact POST | PASS |
| e | Markers start/end paste at every size, regardless of modal | `tui-loop.test.ts:897`, `:900`, `:903` observe last-marker result in all generated contexts; `:830` covers only two reads for fragmented markers | GAP only for three-or-more reads, same I4 as QST-78 l |
| f | Esc while small is ignored and cannot end paste | `tui-loop.test.ts:722`, `:724`, `:725`, `:728` retained logo, no POST, logo-space, then exact POST; generated oracle `:884`, `:897` includes esc in every word position | PASS |

**Status**: QST-36 10/10 clauses; QST-78 11/12; QST-99 5/6. **26 of 28 clauses have full discriminating evidence; two linked clauses share one residual coverage gap.** No new spec-precision gap: the new sentence explicitly decides the fragment rule.

QST-37: `question-replay.test.ts:441` asserts the later full root answer, `:447` changes only rows without an earlier answer_seq, and `:450` compares exactly the new recipients. QST-48: `:84` `expect(derived.sort((x,y)=>x.id-y.id)).toEqual(stored)` compares all ten named fields, and `:87` excludes unmatched rows. They run after every generated call; the earlier 200×40 generator and its assertions remain intact (`:302`, `:303`, `:308`, `:338`–`:344`).

## Discrimination sensor

Two detached temporary worktrees at the fixed HEAD, outside the real tree, with a shared node_modules junction for runtime resolution. Mutations were sequential within each scratch. Each file was restored byte-for-byte after its attempt. No stash. Real-tree porcelain before sensor was empty; empty again before report/lesson writes, HEAD unchanged; ignored dependencies required recovery, as documented below.

The targeted tests are themselves members of the ordinary gate. F35 rows below ran `bun test test/unit/tui-loop.test.ts --test-name-pattern '800 generated'`; F36 rows ran `bun test test/unit/question-replay.test.ts --test-name-pattern 'generated merge chains'`. Each reported one failed test with a behavioral expect mismatch, not timeout or syntax failure. W4 ran the F33 test alone. I4 alone survived the ordinary full gate and therefore also ran the required complete product. These results recheck the task authors' mutation claims independently.

| Id | Production citation | Exact behavioral mutation | Evidence |
| -- | ------------------- | ------------------------- | -------- |
| X3 | `tui.ts:171` | In some, ctrl+c allowed only when `keysOf(chunk).length === 1`; q unchanged | F35 killed |
| X5 | `tui.ts:171` | Prepend `io.size().cols < 120 && io.size().rows < 40 &&` to the quit predicate | F35 killed |
| X6 | `tui.ts:171` | Prepend only `io.size().cols < 120 &&` | F35 killed |
| X7 | `tui.ts:171` | Prepend only `io.size().rows < 40 &&` | F35 killed |
| N8 | `tui.ts:170` | `ui = marks(ui,chunk)` only `if (ui.modal)` | F35 killed |
| N11 | `tui.ts:170` | Same call only `if (keysOf(chunk).length === 1)` | F35 killed |
| N5 | `tui/keys.ts:53` | In marks, include `k === "\x1b"` among inputs passed to paste; esc makes it false | F35 killed |
| V1 | `tui.ts:171` | Quit predicate gated by `(!ui.modal || ui.modal.choice === null)` | F35 killed; corrected parentheses in the harness before recording this result |
| V2 | `tui.ts:171` | some over `[keysOf(chunk)[0],keysOf(chunk).at(-1)]` only | F35 killed |
| V3 | `tui.ts:171` | some over `[keysOf(chunk).at(-1)]` only | F35 killed |
| V4 | `tui.ts:171` | Prepend `!ui.pasting &&` to some | F35 killed |
| V5 | `tui.ts:170` | Call marks only `if (!ui.modal || ui.modal.choice === null)` | F35 killed |
| V7 | `tui.ts:170` | With no modal, remove every `"\x1b[201~"` from chunk before marks | F35 killed |
| V7b | `tui.ts:170` | With no modal, remove every `"\x1b[200~"` instead | F35 killed |
| V8 | `tui.ts:191` | Read cramped inside try/catch; when small set pending to `""` instead of the unfinished-escape regex result | F35 killed |
| V11 | `tui.ts:169` | Small branch requires `cramped(io.size()) && ui.modal` | F35 killed |
| V13 | `tui.ts:170` | After marks, `if (keysOf(chunk).includes("\x1b")) ui = {...ui,pasting:false}` | F35 killed |
| V14 | `tui.ts:171` | Quit predicate gated by `(!ui.modal || ui.modal.choice !== null)` | F35 killed |
| V15 | `tui.ts:171` | some over `[keysOf(chunk)[0]]` only | F35 killed |
| V16 | `tui.ts:171` | Predicate is any ctrl+c or only `keysOf(chunk).at(-1) === "q"` | F35 killed |
| C2 | `question.ts:74` | Remove recursive `AND q.id NOT IN (SELECT value FROM json_each(?2))` | F36 killed |
| Q5 | `question.ts:392` | Pass `[row.id]` instead of `own` to each resolve | F36 killed |
| Q6 | `question.ts:74` | Replace recursive id exclusion by `(?2 = '[]' OR q.asked_by != (SELECT asked_by FROM questions WHERE id = ?1))` | F36 killed |
| Q6a | `question.ts:71` | Same substitution in first step, unqualified asked_by | F36 killed |
| Q7 | `question.ts:74` | Remove `q.status = 'merged' AND` from recursive WHERE | F36 killed |
| R2 | `question.ts:74` | Replace recursive id exclusion by `(?2 = '[]' OR q.ticket_ref IS NOT (SELECT ticket_ref FROM questions WHERE id = ?1))` | F36 killed |
| R3 | `question.ts:71` | Same substitution in first step, unqualified ticket_ref | F36 killed |
| R15 | `question.ts:74` | Append `AND (?2 = '[]' OR m.asked_by != (SELECT asked_by FROM questions WHERE id = ?1))` | F36 killed |
| R18 | `question.ts:74` | Append `AND (?2 = '[]' OR q.asked_by = (SELECT asked_by FROM questions WHERE id = ?1))` | F36 killed |
| W4 | `tui/keys.ts:206` | Replace more by `(more && k === "\r")` in pasted predicate | F33 killed at `tui-keys.test.ts:463`, missing space for n |
| I1, independent | `question.ts:387` | Result selection `ORDER BY id` → `ORDER BY id DESC` | F36 killed at `question-replay.test.ts:420` |
| I2, independent | `question.ts:392` | `answer:row.default_answer` → `answer:"wrong default"` | F36 killed at `question-replay.test.ts:420` |
| I3, independent | `tui.ts:170` | Give marks only the first key equal to either marker (`keysOf(chunk).find(...) ?? ""`), rather than the whole chunk | F35 killed at `tui-loop.test.ts:897`; last marker must win |
| I4, independent | `tui.ts:191` | In pending's regex only, `/u.exec(input)?.[0]` → `/u.exec(chunk)?.[0]`; the preceding `const input = pending + chunk` stays | Survived: full tsc exit 0, 1302 pass/4 skip/0 fail, 107286 assertions, 97.52 s; complete exit 0, 1 pass/0 fail, 38 filtered out, 187862 assertions, 33600 cases, 504220.69 ms (504.27 s total) |

**Sensor depth**: manual P0 depth, 34 distinct behavioral faults, 33 killed and one survivor (I4). No mutants killed only by the complete test: zero. The original F35 list's corrected ids were honored; undefined X8/X9 and unrelated N16–N20/K1–K3 were not substituted.

Exact substitutions and targeted exits are in `%TEMP%/question-verifier7-evidence/sensor.json`, one `<id>.log` per mutation. I4 full and complete logs are `I4-full.log` and `I4-complete.log`. Mutation/probe harnesses are `%TEMP%/question-verifier7-sensor.py`, `question-verifier7-fix-v1.py` and `question-verifier7-probe.py`. An initial V1 harness expression had ternary precedence wrong; that attempt is excluded, and the reported V1 result is the correctly gated predicate above.

### Independent fragment probe

`%TEMP%/question-verifier7-evidence/verifier-fragment.test.ts` contains the scratch-only probe. It reuses the existing injected fake terminal but derives these expected outcomes directly from the spec. It opens Q-08 with `logo`. For start it begins with no paste; for end it starts a paste first. At 120×40, 119×40, 120×39 and 100×30 it sends the marker as `["ESC[2","0","0~"]` / `["ESC[2","0","1~"]`, and separately one byte per read. All fragments arrive synchronously, before the 40 ms escape timer, so this is not a timing ambiguity. It grows to 120×40, asserts the original complete screen (`:110`), then sends r and asserts the exact POST list (`:113`) and retained text-space for the start marker (`:114`).

- Production: **8 pass, 0 fail, 72 assertions**, both markers in three and six reads at all four sizes. `probe-original.log`.
- I4: **0 pass, 8 fail, 30 assertions**. Normal size fails the original-screen assertion; all three small sizes with start fail because the exact `logo` POST appears when zero is expected; with end they fail because zero POST appears when `logo` is expected. `probe-I4.log`. Each marker/size is a separate test, so the first failure does not hide other sizes.
- The probe was removed before scratch cleanup. It never entered the real suite or the real-tree report's gate counts.


### Cleanup incident and environment recovery

The mutation and probe results above were obtained before cleanup. The initial cleanup failed the ignored-file isolation condition: `git worktree remove` without `--force` traversed the Windows junction to the real `broker/node_modules` and removed installed dependencies. The real TypeScript binary became absent. Empty porcelain did not detect this, because node_modules is ignored. No tracked source, test, frame, manifest or lockfile changed; no other directory was targeted. Both scratch worktrees were removed, and this operation was not repeated after detecting the effect.

Dependencies were restored with `bun install --frozen-lockfile`, exit 0: 96 packages. Installed TypeScript is 5.9.3, SDK 1.32.1 and @types/bun 1.3.11. A separate audit compared every installed package.json name and version with all 96 lockfile entries: zero missing entries and zero mismatches (`%TEMP%/question-verifier7-dependency-audit.log`). The actual and HEAD Git blob hashes for `broker/bun.lock` are both `08fc3b66dc2ddc0d6f69c91fbf887fe2c454b15e`; `git diff --quiet` is exit 0 before this report. This proves recovery to the lockfile, not an unmeasured byte-for-byte equivalence of the prior ignored directory.

The full gate was then repeated on the real HEAD after restoring dependencies: TypeScript exit 0; **1302 pass, 4 skip, 0 fail**, 107285 assertions, 1306 tests in 63 files, 85.20 s; test exit 0 (`%TEMP%/question-verifier7-recovery-full.log`). This is the verification of the recovered environment. The complete HEAD and mutant executions above remain evidence from the pre-cleanup environment; they were not rerun or relabeled as post-recovery results. The scratch source mutations never entered the real code tree, but the cleanup was not fully isolated, and the report does not claim otherwise.

## Integrity, quality and limits

The original 200×40 replay's ten-field comparison moved verbatim into `compareQuestions`; field names, boolean conversion, feature filtering, sort and exact equality did not change. Row-count monotonicity, contiguous ids, uniqueness of answer ids, accepted/refused route coverage, all statuses/resolutions, and closed-alone checks remain (`question-replay.test.ts:302`, `:303`, `:308`, `:338`–`:344`). F36's generator is additive. The question-result and keys diffs add tests; their removed lines are import changes. The four changed loop lines only extend existing scenario lists. Their expected raw mode, LEAVE, screen and POST assertions are unchanged. No old expectation was weakened, test deleted, frame edited or additional production behavior introduced.

All new tests map to QST-36/37/48/78/99 or a named F29–F36 criterion. Shared test oracles have their two requested consumers. They follow `broker/CLAUDE.md` and the coverage matrix in `tasks.md`; routes still have the real-process happy/edge/error tests in the full gate. The quality shortfall is the single discrimination gap for successive marker fragments, not unrelated implementation changes.

The F36 reference added to QST-45's traceability row (`spec.md:412`) is broader than F36's declared QST-36/37/48 scope. QST-45's old assertions remain; its behavior regressed in no check. The orchestrator has identified and reserved removal of that extra reference for the subsequent documentary handoff. This verifier did not change the spec or its status table.

Not exercised here: a real terminal's mode 2004 behavior, real resize, macOS/Linux, real signals, an actual Claude Code conversation, or interactive UAT. Existing historical platform findings and known risks in STATE/earlier rounds remain. The fragment probe uses fetch injection, not a live terminal. No new production defect was observed.

## Requirement disposition and lessons

- QST-36: independently satisfies its entire scoped requirement; suitable for Verified if the orchestrator later closes the feature under the dev's decision. No spec edit by this verifier.
- QST-78/QST-99: remain Implementing under this FAIL, by the single residual coverage gap.
- QST-37/QST-48 and the other 96's prior status: no observed regression or weakened expectation.
- No further correction round opened. `validate_state.py question`: exit 1 after writing this report, as required for a FAIL report.
- Lesson: L-070, candidate (recurrence 1), signal surviving_mutant, script exit 0, grounded in I4 and QST-78's successive partial reads, via the skill's script only. No lesson for a killed mutant or a clean clause. The cleanup incident is documented above; no gate_fail lesson was fabricated because the build-level gate passed, and scratch-lifecycle guidance concerns verifier tooling rather than a project-local code rule.

---
## Round 6 (historical report)

**Verdict**: FAIL

**Round**: 6
**Date**: 2026-10-11
**Verifier**: independent sub-agent (author ≠ verifier). It did not write the code, the tests, any fix round or any earlier report. It wrote this file and, through `scripts/lessons.py`, the two lessons files. No code, no test, no spec, no task, no commit.
**Spec**: `.specs/features/question/spec.md`, 99 requirements. In scope, whole: QST-36, QST-78 and QST-99 as they read at `6cd28e2` (the three still `Implementing`), over the code of the third to fifth fix rounds. The other 96 were verified before and are checked here by the gate and by the expected values of existing tests that this round changed.
**Diff range**: `5fa9b80..6cd28e2` on `feat/question` (4 commits: the report of round 5 with `fix-round-5.md` `27f1ac3`, F26 `2cc0822`, F27 `7433101`, F28 `6cd28e2`; in `broker/`: three test files +144 −43 and no production code; in `spec.md`: one sentence of QST-36 rewritten and one added to QST-99). The task list is `fix-round-5.md`. The code the three requirements are judged over is `db27b7f..6cd28e2`.
**Environment**: Windows 11 Pro 10.0.26200, Bun 1.4.2, installed TypeScript 5.9.3, Python 3.12.9. Linux and macOS did not run here. No real interactive terminal was used.

All code and test citations below are relative to `broker/`.

The fifth fix round did what it was asked: the five ranked gaps of round 5, SP2 and SP3 are closed, each by an assertion on the value the spec defines, and the nine survivors of round 5 are all killed. The gate is green with 1295 tests, and in every one of ten probes the code of `6cd28e2` did what the spec says. The verdict is still FAIL, by the tests: **8 of 40 mutants survive the whole suite inside what the spec defines**, and a ninth on a point the spec leaves open. The ones that carry the verdict are in QST-36: every test that merges a question of another asker into one the `result` closes gives that asker another ticket, and none puts it two merges away, so a walk that filters by ticket, or that does not go past a first merge for another asker, passes 1295 tests. The other four are on QST-99 and QST-78 and are small. As in rounds 4 and 5, every mutant that drops, flips or swaps a construct that is in the code is killed; all nine survivors add a condition the code does not have. Nothing found here makes the broker write a wrong answer, and one survivor only (V13) has a path, a remote one, to the TUI sending an answer the dev did not send.

This is the third fix and re-verify iteration since the third fix round. The bound is reached: the decision goes to the dev. See "The decision for the dev".

## Ranked gaps

| # | Gap | Criterion | Where | Mutant |
| - | --- | --------- | ----- | ------ |
| 1 | A question of another `asked_by` merged into one the `result` closes is tested only when it is about another ticket. About the same ticket T, the commonest reason for the mother to merge two questions, no assertion says it closes with the `answer` of that one | QST-36, "uma pergunta que o `result` não fecha por si, de outro `asked_by` …, mesclada numa delas, direto ou por outra mesclada, SHALL fechar com o `answer` daquela" | `question.ts:71`, `:74` · `test/unit/question-result.test.ts:193`, `:219`, `:262` `b.question.ask(WORKER_3, { ...ON_TICKET, default: "7070", ticket_ref: "T-3" })` · `:84`, `:86` | R3, R2 |
| 2 | "Por outra mesclada" is tested for one shape: a question of the same worker behind the question of another worker. A question of another `asked_by` two merges away, behind a question of a third worker or behind one of the same worker about another ticket, has no assertion | QST-36, the same sentence | `question.ts:73`–`:74` · `test/unit/question-result.test.ts:260`–`:264` | R18, R15 |
| 3 | `q` and `ctrl+c` quit a small terminal in every test with no paste in course. With one in course, a state QST-99 itself gives to a small terminal, no assertion says they quit | QST-99, "`q` e `ctrl+c` SHALL sair da TUI, com ou sem modal aberto" with "a colagem começa e termina neles também enquanto o terminal é pequeno" | `tui.ts:170`–`:171` · `test/unit/tui-loop.test.ts:625` `const places = [[], ["4", "j", "\r", "logo"], ["4", "\r"]]` | V4 |
| 4 | The sentence this round added to QST-99 is asserted on `marks` and not on the loop: nothing presses `esc` in a small terminal with a paste in course and looks at the paste when the screen is back | QST-99, "`esc` é ali uma tecla como as outras: não encerra a colagem em curso" | `tui.ts:170` · `test/unit/tui-keys.test.ts:591` `expect(marks(pasting, "\x1b")).toBe(pasting)` | V13 |
| 5 | `\n` followed by keys the loop holds back, with the modal in the text mode: `\r` has that assertion through the loop, `\n` has none, and the reducer is called with `more` only with no modal open | QST-78, "IF um bloco de entrada com mais de uma tecla contém `\r` ou `\n` e … o modal está no modo texto THEN a TUI SHALL pôr um espaço no lugar dela" | `tui/keys.ts:206` · `test/unit/tui-loop.test.ts:432` `for (const chunk of ["\r\x1b", "\r\x1b["])` · `test/unit/tui-keys.test.ts:568`, `:579` | W4 |
| 6 | `q` and `ctrl+c` among other keys of a read quit a small terminal as the first or the last key; between two others, no assertion | QST-99, "`q` e `ctrl+c` SHALL sair" | `tui.ts:171` · `test/unit/tui-loop.test.ts:628` `for (const quit of ["q", "\x03", "aq", "a\x03", "qa", "\x03a"])` | V2 |

One spec-precision gap, SP4 (QST-78 with QST-99, a mark cut by a read). See "Spec-precision gaps".

## The survivors, plainly

For each: can an outcome the spec defines break with the suite green, and what would the dev see.

| Mutant | Can a defined outcome break unnoticed? | What it would look like | A wrong answer sent? |
| ------ | -------------------------------------- | ----------------------- | -------------------- |
| R3, R2 `question.ts:71`, `:74` | Yes | The judge, or another worker, asked about the ticket T what worker-1 also asked; the mother merged the two; worker-1 delivers T. The other question would stay `merged` in the table with no `answer_seq` until the feature closes, and who asked it would get no delivery of the `answer`. The TUI reads the log, where a merged question follows its destination, so the screen would show nothing wrong: the table and `questions()` would disagree | No |
| R18, R15 `question.ts:73`–`:74` | Yes | The same, for a question two merges away from the one the `result` closes | No |
| V4 `tui.ts:171` | Yes | In a terminal too small, after a paste whose mark of the end did not come, `q` and `ctrl+c` would do nothing. The screen says the terminal is small and offers `q`; the dev could not leave by it until the window grows, since `esc` does not end the paste there | No |
| V13 `tui.ts:170` | Yes | `esc` pressed in a small terminal would end the paste in course. Back at 120×40, a line break of that paste, alone in its read, would be an `enter`: it would send the text or confirm the option. It needs a paste that is still arriving after a resize, an `esc` and a resize back, which a paste of a few milliseconds does not do | Only in that sequence |
| W4 `tui/keys.ts:206` | Yes | A pasted `\n` that is the last whole key of a read ending in a cut escape would leave no space in the text. `\n` is never `enter` in the modal (`tui/keys.ts:76`, `:80`), so nothing can be sent by it | No |
| V2 `tui.ts:171` | Yes, by the words; the mutant is contrived | `q` or `ctrl+c` with a key before it and a key after it in one read would not quit a small terminal; pressed again alone it would | No |
| V8 `tui.ts:191` | The spec does not define it (SP4) | A mark of a paste cut in two by a read while the terminal is small would be lost: the paste would not start, or not end, there | Not ranked |

## How each gap of round 5 closed

| Round 5 | Closed by | `file:line` + assertion | The asserted value is what the spec defines? |
| ------- | --------- | ----------------------- | -------------------------------------------- |
| Gap 1, X5, X6, X7 · the quit at one size | F26 `2cc0822`, the test rewritten | `test/unit/tui-loop.test.ts:626` `for (const size of SMALL)` · `:633` `t.size = size` · `:635` `expect(t.raw).toEqual([true])` · `:638` `expect(t.raw).toEqual([true, false])` · `:639` `expect(t.out.endsWith(LEAVE)).toBe(true)` · `:640` `expect(t.posts).toEqual([])` | Yes: the terminal is given back and nothing is posted at 119×40, 120×39 and 100×30, with no modal, the modal in the text mode and the modal in the choice mode (`:625`) |
| Gap 4, X3 · `ctrl+c` among other keys | F26, the same test | `test/unit/tui-loop.test.ts:628` `for (const quit of ["q", "\x03", "aq", "a\x03", "qa", "\x03a"])` | Yes, as the first and as the last key of two. Between two keys it is gap 6 of this round |
| Gap 2, N8 · the marks with no modal | F26, the test of the marks rewritten as a table, and three lines in the test of `marks` | `test/unit/tui-loop.test.ts:717` the paste started on the tab, its end comes small: `:740` `expect(t.posts).toEqual(c.kept)` with `[post(8, "logo")]` · `:721` the start comes small on the tab: `:740` no post, `:741` the modal with `logo `, `:743` `expect(t.posts).toEqual(c.sent)` with `[post(8, "logo")]` after the mark of the end and `enter` · `:719`, `:723` the same two in the choice mode · `test/unit/tui-keys.test.ts:594` `expect(marks(other.ui, "um" + PASTE)).toEqual({ ...other.ui, pasting: true })` · `:595` `expect(marks({ ...other.ui, pasting: true }, PASTED + "um")).toEqual(other.ui)`, on the tab, the feed and the choice modal (`:593`) | Yes: a paste that ended small has ended and `enter` alone sends; one that started small is a paste and its break alone in a read sends nothing |
| Gap 3, N11 · a mark among other keys through the loop | F26, the same table | `test/unit/tui-loop.test.ts:717`–`:719` `small: [END_MARK, "fim\r" + END_MARK]` · `:721`–`:723` `small: [START_MARK, START_MARK + "logo\r"]` · `:727` `for (const small of c.small)` · `:738` `expect(t.lines()).toEqual(tab(t.view(c.back)))` | Yes: the mark is read and the keys beside it are not pressed, the field is as it was when the screen is back |
| Gap 5, L4 · `\n` with keys held back, no modal | F27 `7433101`, one line | `test/unit/tui-keys.test.ts:579` `expect(input(v.ui, "\n", v, true)).toBe(v.ui)`, on the tab and on the feed (`:573`) | Yes: the same state object |
| SP2 · a question of the same worker the `result` does not close, merged into one it closes | F28 `6cd28e2`: one sentence of QST-36 (`spec.md:225`) and one test | `test/unit/question-result.test.ts:250` `expect(b.events().slice(4)).toEqual([storedDefault(5, id)])` · `:251`–`:254` Q-02 `status: "defaulted", merged_into: 1, answer_seq: 5` · `:255` one delivery to worker-1 · `:267` `expect(c.events().slice(6)).toEqual([storedDefault(7, feature)])` · `:268`–`:272` · `:273`–`:277`, for `T-2` and for no ticket (`:241`) | Yes: one `answer`, the one of Q-01; Q-02 closes with it, straight and behind the question of another worker, with no `answer` of its own |
| SP3 · `esc` in a small terminal during a paste | F26: one sentence in QST-99 (`spec.md:329`); the test that was there | `test/unit/tui-keys.test.ts:591` `expect(marks(pasting, "\x1b")).toBe(pasting)` | Yes, on `marks`. Through the loop it is gap 4 of this round |

F27 also gave `esc` its cases in QST-78: `test/unit/tui-keys.test.ts:552` `expect(reads([PASTE, "\x1b4", "\r", "texto", "\r"], tab).send).toEqual({ question_id: 8, answer: "texto" })` · `:558` the choice mode · `:560` `esc` and `enter` in one read · `:563` the text mode with the two in one read.

## How each task ended

Every "done when" box of `fix-round-5.md` is ticked (12 boxes, none open). Each was checked against the diff, a test and a mutant.

| Task | Done when | Evidence | Ended |
| ---- | --------- | -------- | ----- |
| F26 | `q`, `ctrl+c` and each among other keys quit at the three sizes, with no modal, in the text mode and in the choice mode | `test/unit/tui-loop.test.ts:622`–`:647` · X5, X6, X7, X3, V1, V14, V3, V15, V16 killed | ✅ |
| F26 | the marks are read at the three sizes, in the three states, alone in a read and among other keys | `test/unit/tui-loop.test.ts:704`–`:750` · N8, N11, V5, V7, V7b killed | ✅ |
| F26 | `marks` over a state with no modal | `test/unit/tui-keys.test.ts:593`–`:596` | ✅ |
| F26 | QST-99 says `esc` is a key like the others in a small terminal; the test that pins it is `marks(pasting, "\x1b")` | `spec.md:329` · `test/unit/tui-keys.test.ts:591` · N5 killed | ✅ on `marks` · ❌ through the loop (gap 4) |
| F27 | `input(ui, "\n", view, true)` with no modal gives the same state, on the tab and on the feed | `test/unit/tui-keys.test.ts:579` · L4 killed | ✅ |
| F27 | `esc` ends the paste also beside another key in its read and in the choice mode | `test/unit/tui-keys.test.ts:552`, `:558`, `:560`, `:563` · W1, W2, W3 killed | ✅ |
| F28 | QST-36 says a question the `result` does not close by itself, merged into one it closes, follows the `answer` of that one | `spec.md:225` | ✅ |
| F28 | test: Q-02 of worker-1 about T-2 merged into Q-01 about T-1, straight and through the question of another worker | `test/unit/question-result.test.ts:240`–`:279` | ✅ |
| F28 | the test fails with the walk filtered by `asked_by` in the place of the ids | Q6, Q6a: killed by this test and no other | ✅ |
| all | the gates pass | see "Gate check" | ✅ |

## Gate check

- **Command**, from `broker/`: `bun node_modules/typescript/bin/tsc --noEmit` then `bun test`
- **Outcome**: `tsc` exit 0. **1295 pass, 3 skip, 0 fail**, 54472 `expect()` calls, 1298 tests in 63 files, 60.91 s. One run; `EVT-43` did not flake. `git status --porcelain` of the real tree was empty after it.
- **Round 5** (`5fa9b80`): 1292 pass, 3 skip. **Delta**: +3 tests, all of this fix round: F26 1 (the choice mode in a small terminal), F27 1 (`esc` in the choice mode), F28 1; F26 rewrote two tests in place. No count went down.
- **Skipped**: the same three platform conditions as before the feature.
- The whole suite also ran nine more times in the scratch worktree, once under each mutant that survived the unit tests, each with 1295 pass.

## Spec-anchored acceptance criteria

Clause by clause, the three requirements as they read at `6cd28e2`. ✅ an assertion pins what the spec defines and a mutant of it fails · ❌ a case inside the clause has no assertion that can fail · ⚠️ the spec leaves it open.

### QST-36 (`spec.md:225`)

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| a · the `result` writes one `answer` of `broker` with the `default_answer` and `resolved_by` `result_default` per question, and puts it in `defaulted` | the whole event; the row `defaulted` with its `answer_seq` | `test/unit/send-result.test.ts:288`–`:302` `expect(b.events()[7]).toEqual({ seq: 8, … from_name: "broker", … body: "8080", … data: { question_id: 1, answer: "8080", resolved_by: "result_default" } })` · `:303` · `test/unit/question-result.test.ts:43`–`:57` | ✅ |
| b · in the same transaction, after the `result` and the `unblocked` | `result`, `unblocked`, `answer`; no `result` without the `answer` | `test/unit/send-result.test.ts:283`–`:287` `…toEqual([[6, "result", "worker-1"], [7, "unblocked", "broker"], [8, "answer", "broker"]])` · `:370`–`:373` after a trigger that refuses the `answer` | ✅ |
| c · for each non-blocking question of who sends, about T, `open` or `merged`, in ascending id | Q-01 then Q-02; a merged one closes too; the others stay | `test/unit/question-result.test.ts:43`–`:53` · `:98`–`:112` · `:299`–`:301` (QST-39) | ✅ (R9, R4, R5 killed) |
| d · one of them merged straight into another of them: each by its own answer and default, whichever was merged | answers 5 `8080` and 6 `9090` in both directions | `test/unit/question-result.test.ts:170` `expect(b.events().slice(4)).toEqual([storedDefault(5, id), storedDefault(6, id, second)])` · `:171`–`:179` · `:181`–`:184` | ✅ |
| e · the same "por outra mesclada" | Q-01 by 7 `8080`, Q-02 by 8 `9090`, with Q-03 of another worker between them | `test/unit/question-result.test.ts:226` · `:227`–`:231` · `:232`–`:237` | ✅ (R16 killed) |
| f · a question of another `asked_by` merged straight into one of them closes with the `answer` of that one | Q-03 with the `answer_seq` of the one it was merged into; one delivery to who asked it | `test/unit/question-result.test.ts:204` `questionRow(3, id, { …, asked_by: "worker-3", ticket_ref: "T-3", …, merged_into: 2, answer_seq: 8 })` · `:210` · `:230` · `:235` | ✅ about another ticket (R17 killed) · ❌ about the same ticket T (gap 1; R3) |
| g · a question of the same `asked_by` about another ticket, merged straight into one of them, closes with the `answer` of that one | Q-02 `defaulted` with the `answer_seq` of Q-01 | `test/unit/question-result.test.ts:251`–`:254`, with `ticket_ref` `T-2` | ✅ (Q6a, R10 killed) |
| h · the same with no ticket | the same | the same lines with `ticket_ref` `undefined` (`:241`), the row with `ticket_ref: null` | ✅ |
| i · the same three "por outra mesclada" | every question behind one the `result` closes takes its `answer_seq`; one delivery each | `test/unit/question-result.test.ts:267` · `:268`–`:272` Q-02 of worker-1 behind Q-03 of worker-3 · `:273`–`:277` | ✅ for a question of the same worker behind the one of another (Q6 killed) · ❌ for a question of another worker two merges away (gap 2; R18, R2) · ❌ behind a question of the same worker about another ticket (gap 2; R15) |
| j · "sem `answer` próprio" | one `answer` only | `test/unit/question-result.test.ts:250` `expect(b.events().slice(4)).toEqual([storedDefault(5, id)])` · `:267` | ✅ |

### QST-78 (`spec.md:319`)

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| a · a chunk of more than one key, text mode: the break is a space and nothing is sent, also when a key of the same chunk took the modal there | the text with spaces, `send` null, no `POST` | `test/unit/tui-keys.test.ts:441` · `:462`–`:463` · `:469`, `:471` · `test/unit/tui-loop.test.ts:395`–`:396`, `:411`–`:412` · `:439`–`:440` `\r` with the escape held back | ✅ · ❌ `\n` with keys held back (gap 5; W4) |
| b · the same in the choice mode: ignored, no option confirmed | the modal on the option it was | `test/unit/tui-keys.test.ts:480`, `:483`, `:486`–`:488` · `test/unit/tui-loop.test.ts:424`–`:425`, `:460`–`:461` | ✅ (W4b, W6 killed) |
| c · with no modal open, `\r` does what `enter` does and may open the modal | the modal of the selected question | `test/unit/tui-keys.test.ts:454` · `:541` in a paste · `:568` with keys held back · `test/unit/tui-loop.test.ts:482` | ✅ |
| d · with no modal open, `\n` does nothing | the state unchanged | `test/unit/tui-keys.test.ts:575` `expect(chunk("\n", v)).toBe(v.ui)` · `:576` · `:577` · `:579` `expect(input(v.ui, "\n", v, true)).toBe(v.ui)`, on the tab and on the feed | ✅ (L4 killed) |
| e · asks for the delimited paste on entering and undoes it on leaving | `CSI ? 2004 h`, `CSI ? 2004 l` | `test/unit/tui-ansi.test.ts:8` `expect(ENTER).toBe("\x1b[?1049h\x1b[?25l\x1b[?2004h")` · `:9` · `test/unit/tui-loop.test.ts:494`, `:514` | ✅ |
| f · in a delimited paste the rule holds for a break alone in a read: text mode | text `logo da 89 `, `send` null | `test/unit/tui-keys.test.ts:504`–`:505` · `test/unit/tui-loop.test.ts:499`–`:500` | ✅ |
| g · the same in the choice mode | the state unchanged | `test/unit/tui-keys.test.ts:514`–`:515` · `test/unit/tui-loop.test.ts:508` | ✅ |
| h · the same with no modal open: `\r` is `enter`, `\n` nothing | the modal opens and what follows is pasted into it | `test/unit/tui-keys.test.ts:541`, `:543`–`:544` · `:577` | ✅ (W9 killed) |
| i · until the mark `ESC [ 201 ~` | `enter` alone sends again after it | `test/unit/tui-keys.test.ts:507`, `:516` · `test/unit/tui-loop.test.ts:498`, `:501`–`:502` | ✅ |
| j · or until an `esc` | `enter` alone sends again after it | `test/unit/tui-keys.test.ts:534`–`:535` · `:550` with no modal · `:552` with another key in its read · `:558`, `:560` the choice mode · `:563` | ✅ (W1, W2, W3 killed) |
| k · the two marks enter no text and change no screen | the state unchanged | `test/unit/tui-keys.test.ts:521`–`:528` | ✅ |

### QST-99 (`spec.md:329`)

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| a · `q` quits a terminal with less than 120 columns or less than 40 lines, with or without the modal | the terminal is given back, nothing posted | `test/unit/tui-loop.test.ts:638` `expect(t.raw).toEqual([true, false])` · `:639` · `:640` `expect(t.posts).toEqual([])`, at the three sizes, in the three states of the modal, `q` alone, first and last of two keys | ✅ (X5, X6, X7, V1, V14, V3, V15, V16 killed) · ❌ with a paste in course (gap 3; V4) · ❌ between two keys (gap 6; V2) |
| b · `ctrl+c` quits it, with or without the modal | the same | the same lines with `\x03`, `a\x03`, `\x03a` | ✅ (X3 killed) · ❌ the same two cases |
| c · no other key changes the state or posts | no `POST`; the screen of before when the size is back | `test/unit/tui-loop.test.ts:606`–`:608` · `:612` · `:662`–`:663` · `:690`–`:691`, each at the three sizes | ✅ (V11 killed) |
| d · when the size is back, the state of before with the modal and its text, and the keys count | the modal of Q-08 with `logo`, the modal of Q-07 on its second option; `enter` posts each | `test/unit/tui-loop.test.ts:667` `expect(t.lines()).toEqual(open)` · `:669` · `:695` · `:697` `…answer: "5 tentativas"` · `:615` | ✅ |
| e · the two marks are not keys: read at any size, and the paste starts and ends at them while the terminal is small | a paste that ended small has ended: `enter` sends. One that started small is a paste: the break alone in its read sends nothing | `test/unit/tui-loop.test.ts:737` `expect(t.posts).toEqual([])` · `:738` · `:740` · `:741` · `:743`, six cases (`:717`–`:723`) at the three sizes, the mark alone and among other keys · `test/unit/tui-keys.test.ts:585`–`:587`, `:589`, `:594`–`:595` | ✅ (N8, N11, V5, V7, V7b killed) |
| f · `esc` is there a key like the others: it does not end the paste in course | the paste goes on: a break alone in its read is still pasted when the screen is back | `test/unit/tui-keys.test.ts:591` `expect(marks(pasting, "\x1b")).toBe(pasting)` | ✅ on `marks` (N5 killed) · ❌ through the loop (gap 4; V13) |

**Status**: 27 clauses the spec defines. 21 hold in full; 6 have an assertion on the defined outcome and a case inside the clause with none: QST-36 f and i, QST-78 a, QST-99 a, b and f. No clause is without evidence. One point the spec leaves open (SP4).

Payload and conjunction rule: the tests of the round compare whole events, whole rows and the lists of deliveries (`storedDefault`, `questionRow`), the whole state of the reducer (`toEqual({ ...other.ui, pasting: true })`, `toBe(v.ui)`), the whole screen and the whole body of the `POST`. None only counts calls where the spec gives a value.

## What the code of `6cd28e2` does: probes

Ten tests written in the scratch worktree beside the three test files, through `start(...).key`, `input` and `createQuestion`, and deleted with it. All ten pass at `6cd28e2`: the code is right in each. Each survivor fails the probe named for it.

| # | Input | What came out | Spec |
| - | ----- | ------------- | ---- |
| P1 | 119×40, 120×39 and 100×30; no modal, the modal with `logo`, the modal on an option; the reads `aqa` and `a` `ctrl+c` `a` | each of the eighteen quits, nothing posted | QST-99: as defined, asserted by no test (gap 6; V2 fails it) |
| P2 | the three sizes; `ESC[200~` on the main screen, in the text modal and in the choice modal, then the terminal shrinks; `q`, `ctrl+c`. And `ESC[200~q` in one read while small | each quits | QST-99: as defined, asserted by no test (gap 3; V4) |
| P3 | the modal of Q-08, `ESC[200~logo`; the terminal shrinks; `esc` alone and 60 ms, or `esc` `1` in one read; it grows; `\r` | the modal with `logo` when the screen is back; after `\r` the text is `logo `, nothing posted; after `ESC[201~` and `\r`, `logo` is posted. At the three sizes | QST-99: as defined, asserted through the loop by no test (gap 4; V13) |
| P4 | `input(ui, "\n", view, true)` and the same with `\r`, over the modal of Q-08 with `logo`, and over the modal of Q-07 on its second option | the text is `logo `, `send` null; the choice modal unchanged | QST-78: as defined, asserted by no test (gap 5; W4) |
| P5 | the modal of Q-08 with `logo`; `\n ESC[` in one read, then `A` | the text is `logo `, nothing posted | the same |
| P6 | the modal of Q-08; the terminal shrinks; `ESC[20` and `0~` in two reads; it grows; `logo`, `\r` | the text is `logo `, nothing posted. At the three sizes | SP4 (V8) |
| P7 | worker-1 asks Q-01 about T-1; worker-3, and in a second run the judge, asks Q-02 about T-1 too; Q-02 merged into Q-01; the `result` of T-1 | one `answer`, 5, with `8080`; Q-02 `defaulted`, `answer_seq` 5; deliveries of 5 to worker-1 and to who asked Q-02; `questions()` says the same | QST-36: as defined, asserted by no test (gap 1; R3) |
| P8 | Q-01 of worker-1 about T-1, Q-02 of worker-2 about T-9, Q-03 of worker-3 about T-1; Q-03 merged into Q-02, Q-02 into Q-01; the `result` of T-1 | one `answer`, 7; the three rows `defaulted` with `answer_seq` 7; deliveries to the three workers; `questions()` the same | QST-36: as defined, asserted by no test (gaps 1 and 2; R2, R18) |
| P9 | Q-01 of worker-1 about T-1, Q-02 of worker-1 about T-2, Q-03 of worker-3 about T-3; Q-03 into Q-02, Q-02 into Q-01; the `result` of T-1 | one `answer`, 7; the three rows with it; deliveries to worker-1 and worker-3 | QST-36: as defined, asserted by no test (gap 2; R15, R18) |
| P10 | the same with Q-02 of worker-2 | the three rows with `answer_seq` 7; deliveries to the three workers | QST-36: as defined, asserted by no test (gap 2; R18) |

## Spec-precision gaps

| # | AC | What the spec leaves open | What the code does | Pinned by a test? |
| - | -- | ------------------------- | ------------------ | ----------------- |
| SP4 | QST-78 with QST-99 | QST-99 says the two marks are read at any size. Neither requirement says a mark, six bytes, may come cut by a read, nor what happens then. QST-78 counts keys by "bloco de entrada" and has no word for a sequence that crosses two of them | The loop joins an unfinished escape with the next read before it looks at the size (`tui.ts:188`–`:194`), so the mark is read at any size (P6) | At 120×40, `test/unit/tui-loop.test.ts:498` `"da 89\x1b[20", "1~"`. In a small terminal, no: with `cramped(io.size()) ? "" :` before the expression of `tui.ts:191` the first form of V8 fails `TUI-60: an error in the loop gives the terminal back…` and the test after it, only because TUI-60 sets the size to `null` and the mutant throws outside the `try`; with the size read inside a `try`, the whole suite passes |

SP2 and SP3 of round 5 are closed in the spec (`spec.md:225`, `:329`). QST-39 was left as it was: it says the `result` shall not close a non-blocking question of another ticket or of none, and the new sentence of QST-36 says such a question merged into one the `result` closes closes with that one. The words "que o `result` não fecha por si" of QST-36 are what makes the two read together; the outcome is defined and `test/unit/question-result.test.ts:240`–`:279` pins it.

One more reading worth the dev's word, though the text decides it: QST-99 says `q` quits a small terminal and that only the marks are not keys, so a `q` between the marks of a paste quits it too (P2). It is gap 3 and not a spec gap; a design where a pasted `q` does not quit is what V4 does, and no test tells the two apart.

## Test integrity: expectations of existing tests that changed

`git diff --numstat 5fa9b80..6cd28e2 -- broker/test`: 144 lines added, 43 removed or changed, in 3 files (`question-result.test.ts` 41 0, `tui-keys.test.ts` 20 0, `tui-loop.test.ts` 83 43). The two files with no line removed only gained tests and assertions. The 43 are two tests rewritten in `tui-loop.test.ts`, judged against the spec:

| Where | What the old assertion pinned | What pins it now | Judgement |
| ----- | ----------------------------- | ---------------- | --------- |
| `test/unit/tui-loop.test.ts:622`–`:647` (QST-99, the quit; before `:622`–`:643`) | At 100×30, with no modal and with the modal of Q-08 with `logo`, each of `q`, `ctrl+c` and `aq`, with nothing after it: `t.raw` `[true]` before and `[true, false]` after, the output ending in `LEAVE`, no `POST` | The same four assertions, word for word (`:635`, `:638`, `:639`, `:640`), in a loop over `SMALL` (`:626`), three places (`:625`) and six reads (`:628`). 100×30, the two places and the three reads of before are all among them | Stronger. No expected value changed; the name of the test says what it now covers |
| `test/unit/tui-loop.test.ts:704`–`:750` (QST-99 and QST-78, the marks; before `:672`–`:710`), the paste that ends small | The modal of Q-08, `ESC[200~logo`, the terminal shrinks, `ESC[201~`, it grows: the screen is the modal with `logo`; `\r` posts `logo` | The case of `:718` with the first of its `small`: the same keys; `:738` the same screen; `:740` the same `POST`. New before them: `:737` nothing posted when the screen is back | The same values, and one more |
| the same test, the paste that starts small | The modal of Q-08, the terminal shrinks, `ESC[200~`, it grows, then `logo`, `\r`, `ESC[201~`: nothing posted and the text is `logo ` | The case of `:722` with the first of its `small`: `:738` the empty field when the screen is back; `mais`, `\r`: `:740` nothing posted, `:741` the text is `mais `; then `ESC[201~`, `\r`: `:743` `mais` is posted | The same outcome with another word: no `POST` by the break, and the break is a space. The old test looked at the screen after the mark of the end; the new one looks before it and then at the body of the `POST` after it, `mais` with no character of a mark. Nothing weaker |

A third test was added between them (`:676`–`:702`, the choice mode in a small terminal) and is new, not a change. No test was deleted, no skip added, no expected value of a test of another requirement changed.

## Discrimination sensor

41 behaviour-level faults, one at a time, in a `git worktree` at `6cd28e2` under the scratchpad with a copy of `node_modules`, applied by a script that matches each line once and writes the file back after the run. Each ran `tsc --noEmit` and `bun test test/unit` (1137 tests, 6 s); the nine that survived ran again under the whole suite and survived it with 1295 pass. No stash. Two of the 41 are two forms of one fault (V8) and count as one.

**Of 40: 31 killed, 9 survived. 8 of the 9 are inside what the spec defines; the other sits on SP4.**

The nine survivors of round 5, as that report describes them:

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| X5 | `tui.ts:171` | `q` and `ctrl+c` quit only when both sides are small | ✅ Killed · `QST-99: in a terminal narrower than 120 columns or shorter than 40 lines, q, ctrl+c and a chunk with either among its keys quit, with no modal, with the modal in the text mode and with it in the choice mode, and nothing is posted` |
| X6 | `tui.ts:171` | they quit only when the columns are short | ✅ Killed · the same test |
| X7 | `tui.ts:171` | they quit only when the lines are short | ✅ Killed · the same test |
| X3 | `tui.ts:171` | `ctrl+c` quits only alone in its chunk | ✅ Killed · the same test |
| N8 | `tui.ts:170` | the marks are read in a small terminal only with the modal open | ✅ Killed · `QST-99, QST-78: the marks of a delimited paste are read in a terminal smaller than 120×40, alone in a read or among other keys, with no modal, in the text mode and in the choice mode: a paste that ends there has ended, and one that starts there sends nothing by its line break` |
| N11 | `tui.ts:170` | the marks are read there only when the chunk is one key | ✅ Killed · the same test |
| L4 | `tui/keys.ts:207` | `\n` is `enter` with no modal open when the loop holds back keys after it | ✅ Killed · `QST-78: with no modal open \n does nothing, alone, after another key and in a delimited paste, where \r opens the modal` |
| Q6 | `question.ts:74` | the recursive step keeps out every question of the same `asked_by`, not the ones of `own` | ✅ Killed · `QST-36: a question of the worker about another ticket, or about none, merged into one the result closes follows the answer of that one, straight or through the question of another worker` |
| Q6a | `question.ts:71` | the first step does the same | ✅ Killed · the same test |

New, on the keys that quit a small terminal, QST-99 (7):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| V1 | `tui.ts:171` | they do not quit with the modal in the choice mode | ✅ Killed · the test of X5 |
| V14 | `tui.ts:171` | they do not quit with the modal in the text mode | ✅ Killed · the same test |
| V3 | `tui.ts:171` | only the last key of the chunk can quit | ✅ Killed · the same test, by `qa` |
| V15 | `tui.ts:171` | only the first key of the chunk can quit | ✅ Killed · the same test, by `aq` |
| V16 | `tui.ts:171` | `q` quits only alone or as the last key | ✅ Killed · the same test |
| V2 | `tui.ts:171` | only the first or the last key of the chunk can quit | ❌ Survived · gap 6 |
| V4 | `tui.ts:171` | they do not quit while a paste is in course | ❌ Survived · gap 3 |

New, on the marks and on the keys a small terminal drops, QST-99 (7):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| V5 | `tui.ts:170` | the marks are not read with the modal in the choice mode | ✅ Killed · the test of N8 |
| V7 | `tui.ts:170` | with no modal the mark of the end is not read | ✅ Killed · the same test |
| V7b | `tui.ts:170` | with no modal the mark of the start is not read | ✅ Killed · the same test |
| V11 | `tui.ts:169` | the keys are dropped only with the modal open | ✅ Killed · `QST-99: in a terminal smaller than 120×40, b, enter and enter over a blocking question with options post nothing and change no state` and the test of N8 |
| N5 | `tui/keys.ts:53` | `esc` ends the paste in `marks` too (killed in round 5) | ✅ Killed · `QST-99: the marks of a chunk start and end the paste and press none of its keys` |
| V13 | `tui.ts:170` | after `marks`, the loop ends the paste when the chunk has an `esc` | ❌ Survived · gap 4 |
| V8 | `tui.ts:191` | in a small terminal the loop does not wait for the rest of an unfinished escape | ❌ Survived · SP4, not ranked |

New, on the line break and on `esc`, QST-78 (7):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| W1 | `tui/keys.ts:205` | `esc` ends a paste only alone in its read | ✅ Killed · `QST-78: esc ends a delimited paste with no modal open too` and `QST-78: esc ends a delimited paste in the choice mode, and with another key in its read` |
| W2 | `tui/keys.ts:205` | `esc` does not end a paste with the modal in the choice mode | ✅ Killed · the second of the two |
| W3 | `tui/keys.ts:205` | `esc` beside another key does not end a paste with the modal open | ✅ Killed · the same test |
| W4 | `tui/keys.ts:206` | with keys held back only `\r` is pasted, not `\n` | ❌ Survived · gap 5 |
| W4b | `tui/keys.ts:206` | with keys held back a break is pasted only in the text mode | ✅ Killed · `QST-78: a line break and an unfinished escape in one chunk confirm no option in the choice mode, the escape closes the modal after its wait, and enter alone still confirms` |
| W6 | `tui/keys.ts:206` | a pasted break is `enter` on the line of the other answer | ✅ Killed · `QST-78: in the choice mode a line break of a chunk of more than one key is ignored, and confirms no option` |
| W9 | `tui/keys.ts:202` | the mark of the start starts a paste only with the modal open | ✅ Killed · `QST-78: with no modal open a line break of a delimited paste, alone in its read, does what enter does, and what comes after it is pasted into the modal it opened` and the test of L4 |

New, on the `result` and the merged questions, QST-36 (10):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| R3 | `question.ts:71` | the first step keeps out every question about the ticket of the one that closes, not the ones of `own` | ❌ Survived · gap 1 |
| R2 | `question.ts:74` | the recursive step does the same | ❌ Survived · gap 1 |
| R18 | `question.ts:74` | past the first merge the walk takes only questions of who sends the `result` | ❌ Survived · gap 2 |
| R15 | `question.ts:73`–`:74` | the walk does not go on through a question of who sends the `result` | ❌ Survived · gap 2 |
| R16 | `question.ts:74` | one of `own` is kept out of the recursive step only when merged straight into another of `own` | ✅ Killed · `QST-36: a question of the worker merged into another of its own through the question of another worker closes by its own default, and the one between them by the answer of the end` |
| R10 | `question.ts:100` | a follower of the same `asked_by` is delivered and its row is not closed | ✅ Killed · the test of Q6 |
| R17 | `question.ts:83` | by a `result` the `answer` is not delivered to who asked the followers | ✅ Killed · four tests of `test/unit/question-result.test.ts` (`:81`, `:188`, `:214`, `:240`) |
| R9 | `question.ts:387` | the `result` closes the questions of any worker about the ticket | ✅ Killed · `QST-39: a blocking question of the ticket, a non-blocking one of another ticket, one without ticket and one of another worker stay open` and its twin in `test/unit/send-result.test.ts:325` |
| R4 | `question.ts:387` | it closes the blocking ones too | ✅ Killed · the same two |
| R5 | `question.ts:387` | in descending id | ✅ Killed · `QST-36: the result of a worker closes its two non-blocking questions of the ticket in ascending id, each by its own default` and three others |

**Sensor depth**: P0-full, by hand: no mutation tool is installed for Bun. The mutants of this round were kept to one added condition each, on what the words of the three requirements name: which side of the size, the state of the modal, which of the two keys, where the key is in its read, a paste in course or not, which mark, who asked, which ticket, straight or through another. Combinations of two of them, the screens other than the main one and the tab, and a broker that does not answer were not tried.

### The survivors

All nine add a condition the code does not have. Every mutant of a construct that is written, among them the `some` of the quit cut to the first or to the last key, `marks` reading an `esc`, the filter of `own` loosened, the order of the ids, the deliveries of the followers, is killed, most by more than one test.

- **R3, R2** are one hole, and an old one: the fixture of every test of QST-36 and QST-37 with a question of another worker gives it `ticket_ref` `T-3` or `T-2` (`test/unit/question-result.test.ts:84`, `:86`, `:129`, `:193`, `:219`, `:262`), so "of another `asked_by`" and "about another ticket" are the same questions in all of them. Round 5 tried the filter by `asked_by` (Q6, Q6a) and not the one by ticket. `own` is a list of ids; a walk that asks "is it about this ticket?" in its place is the nearest wrong way to write it, and it differs exactly where two agents asked the same thing about the same ticket.
- **R18, R15**: F28 put the new kind of question, the one of the same worker the `result` does not close, at the end of a chain behind the question of another worker. No test has a question of another worker behind another question that follows, which is the plain reading of "por outra mesclada", nor the new kind in the middle. The tests that reach the recursive step with a `result` reach it with a question of who sends it.
- **V4**: the three places of the quit test are states of the modal. F25 gave the small terminal a second state, a paste in course, and the quit is decided on the line after the one that reads it.
- **V13**: the same shape as gap 3 of round 5 (N11), which was closed for the marks: the sentence is asserted on `marks`, and the loop is what the sentence is about.
- **W4**: `more` reaches the reducer in two tests, both with no modal open (`test/unit/tui-keys.test.ts:568`, `:579`), and the loop holds an escape back after `\r` only (`test/unit/tui-loop.test.ts:432`, `:453`).
- **V2**: `aq` and `qa` are the two ends; `some` cut to either end is killed, cut to both is not. Nothing a person would write gives this mutant.
- **V8** is on SP4.

## The decision for the dev

Three verifications in a row (rounds 4, 5 and 6) ended the same way: the gate green, every probe of the code giving what the spec says, every mutant of a written construct killed, and a handful of mutants that add a condition on a combination no test visits. Each fix round closed exactly the survivors it was given, and the next verifier found the neighbours. The example tests of the small terminal now run 54 launches for the quit and 36 for the marks, and the space they sample (size, modal, key, place in the read, paste, mark) still has unvisited cells; one more round of the same kind would close six cells and leave others.

What is at stake, by weight:

1. **Gaps 1 and 2 (QST-36)** are the only ones on the state of the broker, and gap 1 is on the commonest merge there is. The outcome if the code ever broke there is a question left `merged` and one delivery not made, with nothing on the screen. Two tests close them (P7 to P10 are those tests).
2. **Gaps 3 and 4 (QST-99)** need a paste whose end did not come, or one that spans two resizes. One test each.
3. **Gaps 5 and 6** are cosmetic: a missing space, and a mutant nobody would write.

The choices are the dev's: close gaps 1 and 2, or all six, in one more round of tests only (see "Fix plans"; each was run in the scratch against its mutant); or accept the residue as known risk, with the list above as its record; or, for the small terminal, replace the lists of examples by one test that builds the cases from the product of the dimensions, as `test/unit/question-replay.test.ts` does for the table and the derivation. That generator did not reach gap 1 either with its seeds: a question of another asker about the ticket of the worker, merged into one its `result` closes, is a case to give it.

## Code quality

No production code changed in `5fa9b80..6cd28e2`. Over the tests of the round:

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ The test of the marks became a table of six cases run by one body; the quit test gained two loops |
| Surgical changes | ✅ Three test files and two sentences of the spec |
| No scope creep | ✅ |
| Matches patterns | ✅ `launch`, `tab`, `modal`, `reads`, `storedDefault` and `questionRow` as the files had them |
| Spec-anchored outcome check | ❌ 21 of 27 clauses in full |
| Per-layer coverage expectation | ❌ The walk of `resolve` has no case of another asker about the same ticket nor two merges away; the sentence on `esc` of QST-99 has no case in the loop |
| Every test maps to a requirement | ✅ The three new tests and the two rewritten name QST-36, QST-78 and QST-99 |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/LESSONS.md` | ⚠️ `broker/CLAUDE.md` is up to date. L-052 and L-051, candidates of this feature since round 1, are what gaps 1 and 2 repeat |

Smaller notes, none blocking:

- The table of `test/unit/tui-loop.test.ts:715`–`:724` has eight fields per case on one line each; it reads with the comment above it and not without.
- The three places of the quit test are not asserted before the terminal shrinks (`:632`); that `4`, `\r` opens the modal of Q-07 on its first option is asserted by the tests around it (`:461`, `:683`).
- The notes of round 5 on `dispatch` splitting the chunk twice and on the local `input` of `key` stand.

## Not exercised

Stated, not assumed:

- **A real interactive terminal.** Every test and probe drives `start(...).key`, `input` or `marks` with strings.
- **Whether a given terminal sends `ESC [ 200 ~` and `ESC [ 201 ~`** after `CSI ? 2004 h`, and in how many reads: Windows Terminal, conhost, or any terminal of Linux or macOS, and whether Bun in raw mode on Windows hands them to `stdin` unchanged. Where they do not arrive, the rule of the chunk is all there is.
- **A real resize.** `resize` and `size` are the injected ones; no window was resized.
- **Linux and macOS.** The suite ran on Windows only.
- **The real broker for the cases of gaps 1 and 2.** P7 to P10 call `createQuestion` over an in-memory database, as `test/unit/question-result.test.ts` does; `/send` over HTTP was not driven with them.
- The interactive UAT (step 7) is not this agent's.

The known risks rounds 3 to 5 listed stand, untouched by this round.

## Fix plans

Tests only. No code has to change. Each was written and run in the scratch: it passes at `6cd28e2` and fails under its mutant.

### Fix 1: another asker about the same ticket (gap 1; R3, R2)

- **Root cause**: every question of another worker in `test/unit/question-result.test.ts` is about `T-3` or `T-2`.
- **Fix task**: one test. Q-01 of worker-1 about T-1; Q-02 about T-1 too, of worker-3 and, in a second run, of the judge; Q-02 merged into Q-01; `delivered("worker-1", "T-1")`: `events().slice(4)` is `[storedDefault(5, id)]`, Q-02 is `defaulted` with `merged_into: 1, answer_seq: 5`, and 5 is delivered to worker-1 and to who asked Q-02. And Q-03 of worker-3 about T-1 merged into Q-02 of worker-2 about T-9, merged into Q-01: one `answer`, 7, the three rows with it, deliveries to the three.
- **Done when**: it fails with `ticket_ref IS NOT` the ticket of the row in the place of the `NOT IN` of `question.ts:71`, and of `:74`.
- **Priority**: Major.

### Fix 2: two merges away (gap 2; R18, R15)

- **Fix task**: in the same test or beside it, Q-03 of worker-3 about T-3 merged into Q-02, merged into Q-01, with Q-02 of worker-2 about T-2 and then of worker-1 about T-2: one `answer`, 7; the three rows `defaulted` with `answer_seq` 7; 7 delivered to each asker once.
- **Done when**: it fails with `AND q.asked_by =` who sends, and with `AND m.asked_by !=` who sends, added to the recursive step of `question.ts:73`–`:74` when `own` is given.
- **Priority**: Major.

### Fix 3: the quit with a paste in course (gap 3; V4)

- **Fix task**: in `test/unit/tui-loop.test.ts:625`, three more places: `["\x1b[200~"]`, `["4", "j", "\r", "\x1b[200~logo"]`, `["4", "\r", "\x1b[200~"]`. And `"\x1b[200~q"` among the reads of `:628`.
- **Done when**: it fails with `!ui.pasting &&` before the `some` of `tui.ts:171`.
- **Priority**: Minor.

### Fix 4: `esc` in a small terminal through the loop (gap 4; V13)

- **Fix task**: one test at the three sizes. The modal of Q-08, `ESC[200~logo`, the terminal shrinks, `esc` alone with its 40 ms and, in a second run, `esc` `1` in one read, it grows: the modal with `logo`; `\r`: nothing posted, the text is `logo `; `ESC[201~`, `\r`: `logo` is posted.
- **Done when**: it fails with `if (keysOf(chunk).includes("\x1b")) ui = { ...ui, pasting: false }` after the call of `tui.ts:170`.
- **Priority**: Minor.

### Fix 5: `\n` with keys held back, with the modal open (gap 5; W4)

- **Fix task**: in `test/unit/tui-keys.test.ts`, `input(v.ui, k, v, true)` for `\r` and `\n` over `open("06", { text: "logo" })`, equal to the modal with `logo `, and over `open("05", { choice: 1 })`, equal to its state. In the loop of `test/unit/tui-loop.test.ts:432`, `"\n\x1b["`.
- **Done when**: it fails with `(more && k === "\r")` in the place of `more` at `tui/keys.ts:206`.
- **Priority**: Cosmetic.

### Fix 6: the key between two others (gap 6; V2)

- **Fix task**: `"aqa"` and `"a\x03a"` in the list of `test/unit/tui-loop.test.ts:628`.
- **Priority**: Cosmetic.

### SP4

- One sentence in QST-78 saying a mark is a mark in however many reads it comes, and P6 as its test; or the line under "Not exercised" as it stands. **Priority**: Cosmetic.

This was the third fix and re-verify iteration since the third fix round. The bound of three is reached: what comes next is for the dev to say.

## Requirement traceability update

Not applied: this agent does not edit `spec.md`. Proposed:

| Requirement | Current status | Proposed |
| ----------- | -------------- | -------- |
| QST-36 | Implementing | ❌ stays Implementing until Fix 1 and Fix 2. Clauses a to e, g, h and j hold whole; f and i each have a case with no assertion. Round 5 proposed Verified: it did not try the filter by ticket |
| QST-78 | Implementing | ❌ stays Implementing by the rule, held by Fix 5 alone, which is cosmetic: ten of its eleven clauses hold whole, the delimited paste and `esc` among them, and nothing of gap 5 can send an answer. If the dev accepts gap 5 as a known risk it can go to Verified as it is |
| QST-99 | Implementing | ❌ stays Implementing until Fix 3 and Fix 4; Fix 6 is cosmetic |
| the other 96 | Verified | Verified: the gate is green and no expected value of their tests changed |

## Lessons recorded

Through `scripts/lessons.py add`, seven calls for seven signals. The script answered `UPDATED` for L-052, L-051 and L-065 (twice), each still a candidate with one feature, this one, and `ADDED` for L-067, L-068 and L-069; it changed `.specs/lessons.json` and `.specs/LESSONS.md`.

| Signal | Lesson | Effect |
| ------ | ------ | ------ |
| R3, R2 `question.ts:71`, `:74`, `test/unit/question-result.test.ts:193` (QST-36, gap 1) | Test a condition with a fixture where it differs from the conditions that coincide with it in every other fixture | L-052 reinforced: another asker and another ticket are the same questions in every fixture |
| R18, R15 `question.ts:73`–`:74` (QST-36, gap 2) | Test the filter of a recursive walk on a member reached through another member, not only on one reached directly | L-051 reinforced |
| V4 `tui.ts:171` (QST-99, gap 3) | When an AC names several inputs for one rule, assert the rule with each input in every state the AC gives | L-065 reinforced: the state is the paste in course |
| V13 `tui.ts:170`, `test/unit/tui-keys.test.ts:591` (QST-99, gap 4) | Assert a rule an AC states for an input loop through the loop, not only on the pure function the loop calls | New, L-067 |
| W4 `tui/keys.ts:206` (QST-78, gap 5) | the sentence of L-065 | L-065 reinforced |
| V2 `tui.ts:171` (QST-99, gap 6) | Test a rule that holds for any item of a list with the item first, last and between two others | New, L-068 |
| SP4, QST-78 with QST-99; V8 `tui.ts:191` | When an AC names an input of several bytes, state what happens when it arrives split across two reads | New, L-069 |

No lesson was penalized: none of the seven confirmed lessons is the one a gap of this round repeats. L-051 and L-052 are candidates of this feature alone and were not loaded as guidance; that the same two signals came back in rounds 1, 4 and 6 is said here and in "The decision for the dev".

## Summary

**Overall**: ❌ Not ready by the rule of the gate, and the decision is the dev's. The code holds in every probe of three rounds; the tests leave six cases of the words of the three requirements unvisited, two of them on the state of the broker.

**Spec-anchored check**: 21 of 27 clauses in full, 6 in part (QST-36 f, i; QST-78 a; QST-99 a, b, f); 1 spec-precision gap (SP4).
**Sensor**: 31 of 40 mutants killed. The nine of round 5 all killed. 9 survive: 8 inside the spec, R3, R2, R18, R15 (QST-36), V4, V13, V2 (QST-99) and W4 (QST-78), and V8 on SP4.
**Gate**: `tsc` exit 0; 1295 pass, 3 skip, 0 fail.

**What works**: `q`, `ctrl+c` and a read with either at its start or its end quit a terminal that is narrow, short or both, with no modal, in the text mode and in the choice mode; the marks of a paste are read there in the three states, alone or among other keys, so a paste that crosses a resize starts and ends where its marks say; `\n` with no modal does nothing also when the loop holds keys back; `esc` ends a paste in the choice mode and beside another key; a question of the worker about another ticket, or about none, merged into one its `result` closes, closes with the `answer` of that one, straight or behind the question of another worker, and the spec says so.

**Issues found**: the six ranked gaps and SP4, above.

**Next steps**: the dev decides between one more round of tests (Fix 1 and Fix 2 first), the residue accepted as known risk, or a generated test for the small terminal.

## Round 5

Kept for the history. The full report is in `git show 27f1ac3:.specs/features/question/validation.md`.

- **Verdict**: FAIL, at `5fa9b80` (`89007b8..5fa9b80`, 6 commits), the second verification since the third fix round.
- **Gate**: `tsc` exit 0; 1292 pass, 3 skip, 0 fail.
- **Spec-anchored check**: 18 of 22 clauses in full, 4 in part (QST-99 a, b, e; QST-78 d); QST-36 whole. The six gaps and SP1 of round 4 closed. Fourteen probes of the code, each giving what the spec says.
- **Sensor**: 32 of 41 mutants killed. The seven survivors of round 4 all killed. The nine survivors: X5, X6, X7 and X3 `tui.ts:171`, N8 and N11 `tui.ts:170`, L4 `tui/keys.ts:207`, inside the spec, and Q6 `question.ts:74` and Q6a `question.ts:71` on SP2.
- **Ranked gaps**: 1 `q` and `ctrl+c` quit a small terminal at 100×30 only · 2 the marks of a paste in a small terminal with the modal open only · 3 a mark alone in its read only, through the loop · 4 `ctrl+c` among other keys of a chunk · 5 `\n` with keys held back, no modal open.
- **Spec-precision gaps**: SP2 QST-36 with QST-31 and QST-39, a question of the same worker the `result` does not close, merged into one it closes · SP3 QST-78 with QST-99, `esc` in a small terminal during a paste.
- **Test integrity**: no test weakened; F22 rewrote one test in place, with the three expected values it had.
- **Lessons**: L-064, L-065 and L-066 new; L-060, L-061 and L-063 reinforced.

## Round 4

Kept for the history. The full report is in `git show 4aa5978:.specs/features/question/validation.md`.

- **Verdict**: FAIL, at `89007b8` (`db27b7f..89007b8`, 8 commits), the first verification of the third fix round.
- **Gate**: `tsc` exit 0; 1284 pass, 3 skip, 0 fail.
- **Spec-anchored check**: 16 of 23 clauses; QST-49 whole, and it went to Verified. Every probe of the code gave what the spec says but `\n` with no modal open.
- **Sensor**: 32 of 39 mutants killed. The seven survivors, all inside the spec: C2 `question.ts:74`, A3, A6 and A8 `tui.ts:168`, B5 and B14 `tui/keys.ts:198`–`:199`, B6 `tui/keys.ts:199`.
- **Ranked gaps**: 1 QST-36 through a third question · 2 `ctrl+c` in a small terminal, with `q` pressed after it · 3 the delimited paste with no modal open · 4 `q` in a small terminal with the modal open only, and alone in its read only · 5 a line break before an unfinished escape with no modal open · 6 `\n` with no modal open, where the text and the code disagreed.
- **Spec-precision gaps**: SP1 QST-78 with QST-99, the marks of a paste in a small terminal.
- **Test integrity**: no test weakened; 9 lines of existing tests changed, each backed by the spec or a fix of the emulated terminal of the test.
- **Lessons**: L-058 to L-063 new; L-051 and L-052 reinforced.

## Round 3

Kept for the history. The full report is in `git show 9447a5f:.specs/features/question/validation.md`.

- **Verdict**: PASS, at `2ac91fe` (`9a4d921..2ac91fe`, 61 commits).
- **Gate**: `tsc` exit 0; 1270 pass, 3 skip, 0 fail.
- **Spec-anchored check**: 98 of 98; QST-90 by command. 32 chunks given to `start(...).key`: only `\r` alone, with the modal open, sent an answer.
- **Sensor**: 36 of 38 mutants killed. Q16 and Q17 of round 2 killed. The two survivors: T11 `tui.ts:214`, outside the feature (TUI-54 of the TUI leitura), and K4 `tui/keys.ts:187`, then outside the spec.
- **Spec-precision gaps**: P3 QST-78, what a line break of a chunk does with no modal open.
- **Test integrity**: the second fix round only added tests (`42 0` and `34 0` in two files).
- **Known risks that can wait**: `expire` in a bare `setInterval` (`broker.ts:71`); `tui/demo.ts` with no automated test; a paste delivered in several reads; the members of `terminal()` that need a terminal; Linux not run in the verification.
- **Lessons**: L-057 new.

## Round 2

Kept for the history. The full report is in `git show e4ed6c7:.specs/features/question/validation.md`.

- **Verdict**: FAIL, at `7268928` (`9a4d921..7268928`, 58 commits).
- **Gate**: `tsc` exit 0; 1266 pass, 3 skip, 0 fail.
- **Spec-anchored check**: 96 of 98 in full; QST-78 not met for one input, QST-56 with one clause unasserted.
- **Sensor**: 48 of 51 mutants killed. The ten survivors of round 1 all killed. The three survivors: Q16 `tui/screens/questions.ts:118`, Q17 `tui/screens/questions.ts:147`, T11 `tui.ts:212`.
- **Ranked gaps**: 1 QST-78 at the entry of the loop, `tui.ts:180`–`:182`: a line break followed by an unfinished escape in one chunk sent the answer · 2 QST-56: a non-blocking question with options drawn by no test.
- **Spec-precision gaps**: P1 QST-58, options or default · P2 QST-78, which block of input the rule counts.
- **Test integrity**: no test weakened; the two tests of QST-78 rewritten by F8 kept every expected value, and two expectations F8 wrote changed with the sentence added to QST-78; the generator of `test/unit/question-replay.test.ts` was biased by F2 and gained one requirement.
- **Lessons**: L-056 new.

## Round 1

Kept for the history. The full report is in `git show 9db44f2:.specs/features/question/validation.md`.

- **Verdict**: FAIL, at `613da1c` (`9a4d921..613da1c`, 44 commits).
- **Gate**: `tsc` exit 0; 1248 pass, 3 skip, 0 fail.
- **Spec-anchored check**: 88 of 98 in full; ten with a clause unasserted (QST-10, 12, 16, 22, 29, 34, 36, 37, 73, 80).
- **Sensor**: 139 of 149 mutants killed. The ten survivors: B08 `broker.ts:57`, M10b `question.ts:73`, X01 `question.ts:351`, N01 `tui/screens/answer.ts:73`, B04 `broker.ts:71`, T07 `tui.ts:233`, B06 `broker.ts:190`, K08 `tui/keys.ts:207`, K21 `tui/keys.ts:132`, Q01 `tui/screens/questions.ts:105`.
- **Ranked gaps**: 1 QST-36 in the real broker · 2 QST-37 two merges away · 3 QST-12 on `/merge-question` · 4 a blocking question with a default in the modal (QST-73, QST-80) · 5 the period of the check of deadlines (QST-34) · 6 the credential of the terminal entry (QST-83) · 7 `unknown_peer` with a second failing rule (QST-10, 16, 22, 29).
- **Spec-precision gaps**: G1 QST-62 with none below · G2 QST-56 and QST-58, options or default · G3 QST-56, the mark and the focus · G4 QST-82, a send in course and the question gone · G5 QST-67 and QST-65 with the focus on the history · G6 QST-05, `null` and the empty default · G7 QST-78, when the mode is read.
- **Test integrity**: no test weakened; three changes in test support beyond the authorized list, each backed by the spec (`test/frames/logs.ts`, two in `test/frames/deviations.ts`).
- **Lessons**: L-050 to L-055 new; L-001, L-004, L-010, L-024, L-036, L-048 corroborated.
