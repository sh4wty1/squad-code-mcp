# Question Validation

**Result**: FAIL

**Round**: 5
**Date**: 2026-10-11
**Verifier**: independent sub-agent (author ≠ verifier). It did not write the code, the tests, any fix round or any earlier report. It wrote this file and, through `scripts/lessons.py`, the two lessons files. No code, no test, no spec, no task, no commit.
**Spec**: `.specs/features/question/spec.md`, 99 requirements. In scope, whole: QST-36, QST-78 and QST-99 as they read at `5fa9b80` (the three still `Implementing`), over the code of the third and fourth fix rounds. The other 96 were verified before and are checked here by the gate and by the expected values of existing tests that this round changed.
**Diff range**: `89007b8..5fa9b80` on `feat/question` (6 commits: the report of round 4 `4aa5978`, F21 `f0ec599`, F22 `0390797`, F23 `e2bd84d`, F24 `6a9a115`, F25 `5fa9b80`; in `broker/`: `tui.ts` +7 −3, `tui/keys.ts` +8 −1, three test files +145 −16, `CLAUDE.md` 1 line). The task list is `fix-round-4.md`. The code the three requirements are judged over is `db27b7f..5fa9b80`.
**Environment**: Windows 11 Pro 10.0.26200, Bun 1.4.2, installed TypeScript 5.9.3, Python 3.12.9. Linux and macOS did not run here. No real interactive terminal was used.

All code and test citations below are relative to `broker/`.

The fourth fix round did what it was asked: the six ranked gaps of round 4 and SP1 are closed, each by an assertion on the value the spec defines, and the seven survivors of round 4 are all killed. The gate is green with 1292 tests, and in every probe the code of `5fa9b80` did what the spec says. The verdict is still FAIL, by the tests of QST-99 and one input of QST-78: **7 of 41 mutants survive the whole suite inside what the spec defines**. The first of them is the one that carries the verdict: nothing asserts that `q` or `ctrl+c` quits a terminal that is small on one side only (119×40, 120×39), the commonest shape of a terminal that is too small. All seven add a branch the code does not have; no mutant that drops, flips or swaps a construct that is in the code survives. Nothing found here makes the TUI send an answer the dev did not send. QST-36 holds whole.

## Ranked gaps

| # | Gap | Criterion | Where | Mutant |
| - | --- | --------- | ----- | ------ |
| 1 | `q` and `ctrl+c` quit a small terminal at 100×30 only. At 119×40 and at 120×39, the two sizes where one side of the "ou" of the requirement holds, no assertion says they quit. The three other tests of QST-99 run at the three sizes of `SMALL`; this one does not | QST-99, "WHILE o terminal tem menos de 120 colunas ou menos de 40 linhas `q` e `ctrl+c` SHALL sair" | `tui.ts:171` · `test/unit/tui-loop.test.ts:630` `t.size = { cols: 100, rows: 30 }` | X5, X6, X7 |
| 2 | The marks of a paste in a small terminal are asserted with the modal open in the text mode only. A paste that starts or ends there with no modal open has no assertion, in the loop or in the reducer | QST-99, "a TUI SHALL lê-los em qualquer tamanho do terminal, e a colagem começa e termina neles também enquanto o terminal é pequeno" | `tui.ts:170` · `test/unit/tui-loop.test.ts:679`, `:697` open the modal before the terminal shrinks · `test/unit/tui-keys.test.ts:569` `const v = open("06")` | N8 |
| 3 | Through the loop, a mark reaches a small terminal alone in its read only. A terminal sends the mark of the start with the pasted text after it, and the mark of the end with the text before it; that shape is asserted on `marks` and not on the loop that calls it | QST-99, the same sentence | `tui.ts:170` · `test/unit/tui-loop.test.ts:682` `key("\x1b[201~")`, `:700` `key("\x1b[200~")` | N11 |
| 4 | `ctrl+c` among other keys of a chunk in a small terminal: the test has `aq` and no chunk with `ctrl+c` | QST-99, "`q` e `ctrl+c` SHALL sair" | `tui.ts:171` · `test/unit/tui-loop.test.ts:625` `for (const quit of ["q", "\x03", "aq"])` | X3 |
| 5 | With no modal open, `\n` followed by keys the loop holds back: `\r` has that assertion since F23, `\n` does not | QST-78, "Sem modal aberto na vez dela … `\n` não faz nada" | `tui/keys.ts:207` · `test/unit/tui-keys.test.ts:562`–`:564` (alone, after another key, in a paste) against `:555` (`\r` with `more`) | L4 |

Two spec-precision gaps, SP2 (QST-36 with QST-31 and QST-39) and SP3 (QST-78 with QST-99). See "Spec-precision gaps".

## How each gap of round 4 closed

| Round 4 | Closed by | `file:line` + assertion | The asserted value is what the spec defines? |
| ------- | --------- | ----------------------- | -------------------------------------------- |
| Gap 1, C2 · QST-36 through a third question | F21 `f0ec599`, one test | `test/unit/question-result.test.ts:226` `expect(b.events().slice(6)).toEqual([storedDefault(7, id), storedDefault(8, id, second)])` · `:227`–`:231` the three rows: Q-01 `answer_seq: 7`, Q-02 `merged_into: 3, answer_seq: 8`, Q-03 `merged_into: 1, answer_seq: 7` · `:232`–`:237` the deliveries: 7 to worker-1 and worker-3, 8 to worker-1 | Yes. Q-01 and Q-02 close each by its own `answer` and `default_answer` (`8080`, `9090`), in ascending id; Q-03 of another `asked_by`, merged into Q-01, closes by the `answer` of Q-01. Whole events, whole rows. C2 fails this test and no other |
| Gap 2, A3 · `ctrl+c` in a small terminal | F22 `0390797`, the test rewritten | `test/unit/tui-loop.test.ts:632` `expect(t.raw).toEqual([true])` · `:634` `key(quit)` with nothing after it · `:635` `expect(t.raw).toEqual([true, false])` · `:636` `expect(t.out.endsWith(LEAVE)).toBe(true)` · `:637` `expect(t.posts).toEqual([])` | Yes: the terminal is given back and nothing is posted, by the key under test alone |
| Gap 4, A6, A8 · `q` with no modal, and among other keys | F22, the same test | `test/unit/tui-loop.test.ts:624` `for (const before of [[], ["4", "j", "\r", "logo"]])` · `:625` `for (const quit of ["q", "\x03", "aq"])` | Yes, at 100×30. The size is gap 1 of this round |
| Gap 3, B5, B14 · the delimited paste with no modal open | F23 `e2bd84d`, two tests | `test/unit/tui-keys.test.ts:541` `expect(reads([PASTE, "\r"], tab)).toEqual({ ...tab.ui, modal: opened(8, null), pasting: true })` · `:543` `expect(pasted).toEqual({ ...tab.ui, modal: { ...opened(8, null), text: "texto " } })` · `:544` `expect(pasted.send).toBeNull()` · `:550` `expect(reads([PASTE, "\x1b", "4", "\r", "texto", "\r"], tab).send).toEqual({ question_id: 8, answer: "texto" })` | Yes: with no modal the break does what `enter` does and opens the modal; the break after it is a space and sends nothing; after `esc`, `enter` alone sends |
| Gap 5, B6 · a line break before a held back escape, no modal | F23, one test of the reducer and one of the loop | `test/unit/tui-keys.test.ts:555` `expect(input(tab.ui, "\r", tab, true)).toEqual({ ...tab.ui, modal: opened(8, null) })` · `test/unit/tui-loop.test.ts:481` `expect(t.posts).toEqual([])` · `:482` `expect(t.lines()).toEqual(tab(t.view({ screen: "questions", question: 8, modal: modal(8) })))` · `:483` the tab without the modal after the wait | Yes: the modal opens, nothing is posted, the escape closes it. For `\r\x1b` and `\r\x1b[` |
| Gap 6 · `\n` with no modal open | F24 `6a9a115`: the dev decided (`fix-round-4.md:16`–`:17`), the spec says what the code does, one test | `spec.md:319` "`\r` faz o que `enter` faz naquela tela, e pode abrir o modal, e `\n` não faz nada" · `test/unit/tui-keys.test.ts:561` `expect(chunk("\r", v).modal).toEqual(opened(8, null))` · `:562` `expect(chunk("\n", v)).toBe(v.ui)` · `:563` `expect(chunk("p\n", v)).toEqual({ ...v.ui, paused: true })` · `:564` `expect(reads([PASTE, "\n"], v)).toEqual({ ...v.ui, pasting: true })`, on the tab and on the feed | Yes: text and code agree, and the state is the same object after `\n` |
| SP1 · the marks of a paste in a small terminal | F25 `5fa9b80`: the dev decided (`fix-round-4.md:18`–`:19`), one sentence in QST-99 (`spec.md:329`), `marks` (`tui/keys.ts:52`–`:54`) called before the keys are dropped (`tui.ts:170`), two tests | `test/unit/tui-loop.test.ts:685` the modal with `logo` after the mark of the end came small · `:687` `expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 8, answer: "logo" } }])` · `:704` `expect(t.posts).toEqual([])` · `:705` the modal with `logo ` after the mark of the start came small · `test/unit/tui-keys.test.ts:570`–`:572`, `:574`, `:576` | Yes: the paste ends and starts at its marks while the terminal is small, at 119×40, 120×39 and 100×30, with the modal open. With no modal it is gap 2 |

## How each task ended

Every "done when" box of `fix-round-4.md` is ticked (16 boxes, none open). Each was checked against the diff, a test and a mutant.

| Task | Done when | Evidence | Ended |
| ---- | --------- | -------- | ----- |
| F21 | the chain Q-02 into Q-03 into Q-01 writes `Q-01: 8080` and `Q-02: 9090`, Q-03 closes by the answer of Q-01, the deliveries are 7 to worker-1 and worker-3 and 8 to worker-1 | `test/unit/question-result.test.ts:226`–`:237` | ✅ |
| F21 | the test fails without the `NOT IN` of the recursive step | C2 at `question.ts:74`: killed by this test | ✅ |
| F22 | with no modal and with the modal in the text mode, each of `q`, `ctrl+c` and a chunk with `q`, alone and with no key after it, gives the terminal back and posts nothing | `test/unit/tui-loop.test.ts:624`–`:637` | ✅ at 100×30 · ❌ at the other two sizes (gap 1) |
| F22 | the test fails with `q` as the only key that quits, with the quit of an open modal only, and with the quit of a key alone in its chunk only | A3, A6, A6b, A8 at `tui.ts:171`: killed | ✅ |
| F23 | on the tab, no modal, in a delimited paste: `\r` alone opens the modal; the text and the break after it stay in the field and nothing is sent | `test/unit/tui-keys.test.ts:541`–`:544` | ✅ |
| F23 | with no modal, `esc` ends the paste: the next `enter` in the modal sends | `test/unit/tui-keys.test.ts:550` | ✅ |
| F23 | in the loop, `key("\r\x1b")` shows the modal, posts nothing and, after the wait, shows the tab without it | `test/unit/tui-loop.test.ts:480`–`:484` | ✅ |
| F23 | each test fails under its mutant | B5, B14, B6: killed | ✅ |
| F24 | the spec says `\r` is the `enter` and `\n` does nothing with no modal, and a test pins it on the tab and on the feed: alone, after another key and in a delimited paste | `spec.md:319` · `test/unit/tui-keys.test.ts:560`–`:565` | ✅ · with keys held back it is gap 5 |
| F25 | QST-99 says the marks are not keys and are read at any size | `spec.md:329` | ✅ |
| F25 | in a small terminal the loop applies `marks` to the chunk before it drops its keys | `tui.ts:169`–`:172` | ✅ |
| F25 | test: the paste that ends small has ended and the next `enter` sends; the one that starts small does not send by the break alone in a read | `test/unit/tui-loop.test.ts:672`–`:710` | ✅ with the modal in the text mode · ❌ with none (gap 2) |
| all | the gates pass | see "Gate check" | ✅ |

`fix-round-3.md:5`–`:6` no longer says the round did not start; `broker/CLAUDE.md` describes `marks`.

## Gate check

- **Command**, from `broker/`: `bun node_modules/typescript/bin/tsc --noEmit` then `bun test`
- **Outcome**: `tsc` exit 0. **1292 pass, 3 skip, 0 fail**, 54091 `expect()` calls, 1295 tests in 63 files, 79.39 s. One run; `EVT-43` did not flake. `git status --porcelain` of the real tree was empty after it.
- **Round 4** (`89007b8`): 1284 pass, 3 skip. **Delta**: +8 tests, all of this fix round: F21 1, F23 4, F24 1, F25 2; F22 rewrote one test in place. No count went down.
- **Skipped**: the same three platform conditions as before the feature.
- The whole suite also ran nine more times in the scratch worktree, once under each mutant that survived the unit tests, each with 1292 pass.

## Spec-anchored acceptance criteria

Clause by clause, the three requirements as they read at `5fa9b80`. ✅ an assertion pins what the spec defines and a mutant of it fails · ❌ no assertion that can fail · ⚠️ the spec leaves it open.

### QST-36 (`spec.md:225`)

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| a · the `result` writes one `answer` of `broker` with the `default_answer` and `resolved_by` `result_default` per question, and puts it in `defaulted` | the whole event; the row `defaulted` with its `answer_seq` | `test/unit/send-result.test.ts:289`–`:303` `expect(b.events()[7]).toEqual({ seq: 8, … from_name: "broker", … body: "8080", … data: { question_id: 1, answer: "8080", resolved_by: "result_default" } })` · `:304` · `test/unit/question-result.test.ts:43`–`:57` | ✅ |
| b · in the same transaction, after the `result` and the `unblocked` | `result`, `unblocked`, `answer`; no `result` without the `answer` | `test/unit/send-result.test.ts:284`–`:288` `…toEqual([[6, "result", "worker-1"], [7, "unblocked", "broker"], [8, "answer", "broker"]])` · `:370`–`:374` after a trigger that refuses the `answer`: events, deliveries and rows as before | ✅ |
| c · for each non-blocking question of who sends, about T, `open` or `merged`, in ascending id | Q-01 then Q-02; a merged one closes too | `test/unit/send-result.test.ts:317`–`:321` · `test/unit/question-result.test.ts:43`–`:53` · `:98`–`:112` a merged one · `:258`–`:260` the ones it does not close (QST-39) | ✅ (C4, C5 of round 4) |
| d · one of them merged straight into another of them: each by its own answer and default, whichever was merged | answers 5 `8080` and 6 `9090` in both directions | `test/unit/question-result.test.ts:170` `expect(b.events().slice(4)).toEqual([storedDefault(5, id), storedDefault(6, id, second)])` · `:171`–`:174` · `:175`–`:179` · `:181`–`:184` | ✅ (Q5 killed) |
| e · the same "por outra mesclada" | Q-01 by 7 `8080`, Q-02 by 8 `9090`, with Q-03 of another worker between them | `test/unit/question-result.test.ts:226` · `:227`–`:231` · `:232`–`:237` | ✅ (C2 killed). The chain in the other direction, Q-01 into Q-03 into Q-02, gave the same in probe G8 and is asserted by no test; no mutant of the code tells the two apart |
| f · a question of another `asked_by` merged into one of them closes by the answer of that one | Q-03 with `answer_seq` 8 when merged into Q-02, 7 when merged into Q-01; one delivery to worker-3 | `test/unit/question-result.test.ts:204` `questionRow(3, id, { …, merged_into: 2, answer_seq: 8 })` · `:210` · `:230` · `:235` | ✅ (Q7 killed) |
| g · a question of the same `asked_by` that the `result` does not close (another ticket, or none), merged into one of them | not defined: QST-31 says it follows, QST-39 says the `result` does not close it | none | ⚠️ SP2 (Q6, Q6a survive) |

### QST-78 (`spec.md:319`)

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| a · a chunk of more than one key, text mode: the break is a space and nothing is sent, also when a key of the same chunk took the modal there | the text with spaces, `send` null, no `POST` | `test/unit/tui-keys.test.ts:441` · `:462`–`:463` · `:469`, `:471` · `test/unit/tui-loop.test.ts:395`–`:396`, `:411`–`:412` · `:439`–`:440` with the escape held back | ✅ |
| b · the same in the choice mode: ignored, no option confirmed | the modal on the option it was | `test/unit/tui-keys.test.ts:480`, `:483`, `:486`–`:488` · `test/unit/tui-loop.test.ts:424`–`:425`, `:460`–`:461` | ✅ |
| c · with no modal open, `\r` does what `enter` does and may open the modal | the modal of the selected question | `test/unit/tui-keys.test.ts:454` `expect(chunk("j\r" + DOWN, tab)).toEqual({ ...tab.ui, question: 8, modal: opened(8, null) })` · `:541` in a paste · `:555` with keys held back · `test/unit/tui-loop.test.ts:482` | ✅ (B5, B6 killed) |
| d · with no modal open, `\n` does nothing | the state unchanged | `test/unit/tui-keys.test.ts:562` `expect(chunk("\n", v)).toBe(v.ui)` · `:563` · `:564`, on the tab and on the feed | ✅ alone, after a key and in a paste (L1, L2, L3 killed) · ❌ with keys held back (gap 5, L4) |
| e · asks for the delimited paste on entering and undoes it on leaving | `CSI ? 2004 h`, `CSI ? 2004 l` | `test/unit/tui-ansi.test.ts:8` `expect(ENTER).toBe("\x1b[?1049h\x1b[?25l\x1b[?2004h")` · `:9` `expect(LEAVE).toBe("\x1b[?2004l\x1b[?25h\x1b[?1049l")` · `test/unit/tui-loop.test.ts:494`, `:514` | ✅ |
| f · in a delimited paste the rule holds for a break alone in a read: text mode | text `logo da 89 `, `send` null | `test/unit/tui-keys.test.ts:504` `expect(pasted).toEqual({ ...v.ui, modal: { ...m(v), text: "logo da 89 " } })` · `:505` · `test/unit/tui-loop.test.ts:499`–`:500` | ✅ |
| g · the same in the choice mode | the state unchanged | `test/unit/tui-keys.test.ts:514` `expect(reads([PASTE, "\r", "\n", PASTED], v)).toEqual(v.ui)` · `:515` · `test/unit/tui-loop.test.ts:508` | ✅ |
| h · the same with no modal open: `\r` is `enter`, `\n` nothing | the modal opens and what follows is pasted into it; `\n` leaves the state | `test/unit/tui-keys.test.ts:541`, `:543`–`:544` · `:564` | ✅ (B5 killed) |
| i · until the mark `ESC [ 201 ~` | `enter` alone sends again after it | `test/unit/tui-keys.test.ts:507` `…toEqual({ question_id: 8, answer: "logo da 89" })` · `:516` · `test/unit/tui-loop.test.ts:498`, `:501`–`:502` the mark in two reads | ✅ |
| j · or until an `esc` | `enter` alone sends again after it | `test/unit/tui-keys.test.ts:534`–`:535` with the modal · `:550` with none | ✅ (B14 killed) |
| k · the two marks enter no text and change no screen | the state unchanged | `test/unit/tui-keys.test.ts:521` `expect(chunk(PASTE + PASTED, text)).toEqual(text.ui)` · `:522` · `:524` · `:525`–`:528` on the five screens | ✅ |

### QST-99 (`spec.md:329`)

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| a · `q` quits a terminal with less than 120 columns or less than 40 lines, with or without the modal | the terminal is given back, nothing posted | `test/unit/tui-loop.test.ts:635` `expect(t.raw).toEqual([true, false])` · `:636` · `:637` `expect(t.posts).toEqual([])`, for no modal and the modal in the text mode, `q` and `aq` | ✅ at 100×30 (A2, A6, A6b, A7, A8, X4 killed) · ❌ at 119×40 and 120×39 (gap 1; X5, X6, X7) |
| b · `ctrl+c` quits it, with or without the modal | the same | the same lines with `\x03` | ✅ at 100×30, alone in its read (A3, X1, X2 killed) · ❌ at the other two sizes (gap 1) · ❌ among other keys (gap 4, X3) |
| c · no other key changes the state or posts | no `POST`; the screen of before when the size is back | `test/unit/tui-loop.test.ts:606` `expect(t.posts).toEqual([])` · `:607` · `:608` · `:612` `expect(t.lines()).toEqual(main(t.view()).text())` · `:658`–`:659`, each at the three sizes | ✅ (N10 killed) |
| d · when the size is back, the state of before with the modal and its text, and the keys count | the modal of Q-08 with `logo`; `enter` posts it | `test/unit/tui-loop.test.ts:663` `expect(t.lines()).toEqual(open)` · `:665` · `:615` | ✅ (N9 killed) |
| e · the two marks are not keys: read at any size, and the paste starts and ends at them while the terminal is small | a paste that ended small has ended: `enter` sends. One that started small is a paste: the break alone in its read is a space | `test/unit/tui-loop.test.ts:685`, `:687` · `:704`, `:705`, each at the three sizes · `test/unit/tui-keys.test.ts:570` `expect(marks(v.ui, PASTE + "um\rq")).toEqual({ ...v.ui, pasting: true })` · `:571` · `:572` · `:574` `expect(marks(v.ui, "um\rq\x03")).toBe(v.ui)` | ✅ with the modal in the text mode, the mark alone in its read (N1 to N7, N12a, N12b, N13, N14, N15 killed) · ❌ with no modal (gap 2, N8) · ❌ the mark among other keys through the loop (gap 3, N11) |
| f · `esc` in a small terminal during a paste | QST-78 ends the paste at an `esc`; QST-99 lets no key change the state there | `test/unit/tui-keys.test.ts:576` `expect(marks(pasting, "\x1b")).toBe(pasting)` pins what the code does | ⚠️ SP3 |

**Status**: 22 clauses the spec defines, and 2 it leaves open. 18 of the 22 hold in full; 4 have an assertion on the defined outcome and a case inside the clause with none: QST-99 a, b and e, QST-78 d. QST-36 holds whole.

Payload and conjunction rule: the tests of the round compare whole events, whole rows and the lists of deliveries (`storedDefault`, `questionRow`), the whole state of the reducer (`toEqual({ ...tab.ui, … })`, `toBe(v.ui)`), the whole screen and the whole body of the `POST`. None only counts calls where the spec gives a value.

## What the code of `5fa9b80` does: probes

Fourteen tests written in a second scratch, a copy of `broker/` outside the repository, through `start(...).key`, `input`, `marks` and `createQuestion`, and deleted with it. All fourteen pass at `5fa9b80`: the code is right in each.

| # | Input | What came out | Spec |
| - | ----- | ------------- | ---- |
| G1a | 119×40, 120×39 and 100×30; no modal and the modal with `logo`; `q` alone, `ctrl+c` alone | each of the twelve quits, nothing posted | QST-99: as defined; at the first two sizes asserted by no test (gap 1) |
| G1b | 100×30; no modal and the modal; the chunks `a` `ctrl+c` and `ctrl+c` `a` | each of the four quits | QST-99: as defined, asserted by no test (gap 4) |
| G2a | the tab on Q-08, no modal; the terminal shrinks; `ESC[200~`; it grows; `\r`, `logo`, `\r`, `ESC[201~` | the modal opens, the text is `logo `, nothing posted; `enter` then posts `logo`. At the three sizes | QST-99, QST-78: as defined, asserted by no test (gap 2) |
| G2b | the tab, no modal, `ESC[200~`; the terminal shrinks; `ESC[201~`; it grows; `\r`, `logo`, `\r` | `logo` is posted. At the three sizes | the same |
| G2c | the modal of Q-07 on its first option; 120×39; `ESC[200~`; it grows; `\r` | nothing posted, the option still selected; after `ESC[201~`, `enter` posts it | QST-99, QST-78: as defined, asserted by no test |
| G3a | the modal of Q-08; 119×40; `ESC[200~logo\r` in one read; it grows; `mais`, `\r` | the field empty when the screen is back, then `mais `, nothing posted; after `ESC[201~`, `enter` posts `mais` | QST-99: as defined, asserted through the loop by no test (gap 3) |
| G3b | the modal of Q-08, `ESC[200~logo`; 119×40; `fim\r ESC[201~` in one read; it grows; `\r` | `logo` is posted | the same |
| G4 | the tab, no modal: `input(ui, "\n", view, true)`; in the loop `\n\x1b` and `\n\x1b[` | the same state object; no modal opens, nothing posted | QST-78: as defined, asserted by no test (gap 5) |
| G5 | the modal of Q-08; 100×30; the mark of the start in two reads, `ESC[20` and `0~`; it grows; `logo`, `\r` | the text is `logo `, nothing posted | QST-99: as defined. The loop joins the two halves before it looks at the size |
| G6 | the modal of Q-08, `ESC[200~`; 100×30; `esc`; it grows; `x`, `\r` | the modal is still open, the text is `x `, nothing posted: the paste did not end | SP3 |
| G7 | 100×30; `ESC[200~quero ESC[201~` in one read | the TUI quits | QST-99 says it of `q`; a pasted `q` is a key at any size (TUI-62) |
| G8 | worker-1 asks Q-01 about T-1 and Q-02 about T-2; Q-02 merged into Q-01; the `result` of T-1. Then the same with Q-02 merged into Q-03 of worker-3 and Q-03 into Q-01 | one `answer`, the one of Q-01 with `8080`; Q-02 `defaulted` with the `answer_seq` of Q-01, in the table and in the derivation | SP2 |
| G8 reverse | Q-01 and Q-02 of worker-1 about T-1, Q-03 of worker-3; Q-01 merged into Q-03 and Q-03 into Q-02; the `result` | answers 7 `8080` for Q-01 and 8 `9090` for Q-02; Q-03 by 8; deliveries 7 to worker-1, 8 to worker-1 and worker-3 | QST-36: as defined |
| G9 | `marks` over a state with no modal: the mark of the start, then the one of the end | `pasting` on, then the state of before | QST-99: as defined |

## Spec-precision gaps

| # | AC | What the spec leaves open | What the code does | Pinned by a test? |
| - | -- | ------------------------- | ------------------ | ----------------- |
| SP2 | QST-36 with QST-31 and QST-39 | QST-36 names two kinds of merged question: one of the questions the `result` closes, which keeps its own answer, and one of another `asked_by`, which closes by the answer of the one it was merged into. A question of the **same** `asked_by` that the `result` does not close, about another ticket or about none, merged into one it closes, is neither. QST-31 says a merged question takes the status and the `answer_seq` of its destination; QST-39 says the `result` shall not close a non-blocking question of another ticket | It follows: Q-02 about T-2 closes `defaulted` by the `answer` of Q-01, straight or through a third question (G8). The filter of the walk is by id (`question.ts:71`, `:74`) | No. With the filter by `asked_by` in the place of the id, on either line, the whole suite passes (Q6, Q6a) |
| SP3 | QST-78 with QST-99 | QST-78 says a paste lasts until its mark of the end "ou até um `esc`"; QST-99 says no key but `q` and `ctrl+c` changes the state in a small terminal, and takes only the two marks out of the keys. An `esc` pressed in a small terminal during a paste is under both | The paste does not end (G6): `marks` reads the two marks and nothing else (`tui/keys.ts:53`) | Yes, `test/unit/tui-keys.test.ts:576` |

SP2 is the reading that leaves no question merged into a closed one, and it is what QST-31 says; one sentence in QST-36 or in QST-39 settles it, and probe G8 is its test. SP3 takes an `esc` in a small terminal in the middle of a paste whose mark of the end never comes; the reading of the code is the one that keeps QST-99 whole. Neither is ranked.

SP1 of round 4 is closed in the spec (`spec.md:329`) and in the code; what is left of it in the tests is gaps 2 and 3.

## Test integrity: expectations of existing tests that changed

`git diff --numstat 89007b8..5fa9b80 -- broker/test`: 145 lines added, 16 removed or changed, in 3 files (`question-result.test.ts` 26 0, `tui-keys.test.ts` 42 1, `tui-loop.test.ts` 77 15). The 16, judged against the spec:

| Where | Change | Judgement |
| ----- | ------ | --------- |
| `test/unit/tui-keys.test.ts:6` | the import gains `marks` | For the new test at `:568`–`:577`. No expectation |
| `test/unit/tui-loop.test.ts:622`–`:643` (QST-99) | the name of the test; the loop gains no modal beside the modal in the text mode, and the chunk `aq` beside `q` and `ctrl+c`; `for (const k of [quit, "q", "\r"]) key(k)` becomes `key(quit)`, with `expect(t.raw).toEqual([true])` before it | Stronger. The three expected values are the ones of before: `t.raw` `[true, false]`, the output ending in `LEAVE`, no `POST`. The `q` and the `enter` that came after the key under test are what let A3 survive round 4; what they showed, that a key after the quit does nothing, is still asserted at `:143`–`:148` (TUI-60) |

No test was deleted, no skip added, no expected value of a test of another requirement changed. The tests of QST-78, QST-36 and QST-37 that existed have every expected value they had.

## Discrimination sensor

42 behaviour-level mutants, one at a time, in a `git worktree` at `5fa9b80` under the scratchpad with a copy of `node_modules`. Each ran `bun test test/unit` (1135 tests, 5 s) and the file was restored with `git checkout`; the nine that survived ran again under the whole suite and survived it with 1292 pass. No stash. One of the 42 is equivalent and is not counted.

**Of 41: 32 killed, 9 survived. 7 of the 9 are inside what the spec defines; the other 2 sit on SP2.**

The seven survivors of round 4, as that report describes them (8, with a second form of A6):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| C2 | `question.ts:74` | no `NOT IN` in the recursive step of the walk | ✅ Killed · `QST-36: a question of the worker merged into another of its own through the question of another worker closes by its own default, and the one between them by the answer of the end` |
| A3 | `tui.ts:171` | in a small terminal only `q` quits | ✅ Killed · `QST-99: in a terminal smaller than 120×40, q, ctrl+c and a chunk with q among its keys quit, with no modal and with the modal in the text mode, and nothing is posted` |
| A6 | `tui.ts:171` | in a small terminal `q` quits only with the modal open | ✅ Killed · the same test |
| A6b | `tui.ts:171` | in a small terminal `q` and `ctrl+c` quit only with the modal open | ✅ Killed · the same test |
| A8 | `tui.ts:171` | `every` in the place of `some`: the key quits only when its chunk has no other | ✅ Killed · the same test |
| B5 | `tui/keys.ts:206` | in a delimited paste a break is a space also with no modal open | ✅ Killed · `QST-78: with no modal open a line break of a delimited paste, alone in its read, does what enter does, and what comes after it is pasted into the modal it opened` |
| B14 | `tui/keys.ts:205` | `esc` ends a paste only with the modal open | ✅ Killed · `QST-78: esc ends a delimited paste with no modal open too` |
| B6 | `tui/keys.ts:206` | with keys held back a break is a space also with no modal open | ✅ Killed · `QST-78: with no modal open a line break does what enter does also when the loop holds back keys that came after it` and `QST-78: with no modal open a line break and an unfinished escape in one chunk do what enter and esc do…` |

New, on `marks` and its call (16):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| N1 | `tui.ts:170` | the call of `marks` removed, the code of `89007b8` | ✅ Killed · `QST-99, QST-78: the marks of a delimited paste are read in a terminal smaller than 120×40: a paste that ends there has ended, and one that starts there sends nothing by its line break` |
| N2 | `tui/keys.ts:53` | `marks` reads only the mark of the start | ✅ Killed · the test of N1 and `QST-99: the marks of a chunk start and end the paste and press none of its keys` |
| N3 | `tui/keys.ts:53` | `marks` reads only the mark of the end | ✅ Killed · the same two |
| N4 | `tui/keys.ts:53` | the two marks swapped | ✅ Killed · the same two |
| N5 | `tui/keys.ts:53` | `esc` ends the paste in `marks` too | ✅ Killed · `QST-99: the marks of a chunk…` |
| N6 | `tui/keys.ts:53` | `marks` reads only the first key of the chunk | ✅ Killed · `QST-99: the marks of a chunk…` |
| N7 | `tui/keys.ts:53` | `marks` reads only the last key of the chunk | ✅ Killed · `QST-99: the marks of a chunk…` |
| N8 | `tui.ts:170` | the marks are read in a small terminal only with the modal open | ❌ Survived · gap 2 |
| N9 | `tui.ts:170` | `marks` starts from the initial state: a mark in a small terminal loses the screen | ✅ Killed · the test of N1 and `QST-99: the keys pressed in a terminal smaller than 120×40 leave the modal and its text as they were…` |
| N10 | `tui.ts:170` | the chunk goes to `input`: the small terminal takes its keys | ✅ Killed · `QST-99: …b, enter and enter…` and `QST-99: the keys pressed in a terminal smaller than 120×40…` |
| N11 | `tui.ts:170` | the marks are read in a small terminal only when the chunk is one key | ❌ Survived · gap 3 |
| N12a | `tui.ts:170` | the marks are read only when the columns are short | ✅ Killed · the test of N1, at 120×39 |
| N12b | `tui.ts:170` | the marks are read only when the lines are short | ✅ Killed · the test of N1, at 119×40 |
| N13 | `tui.ts:170` | the marks are read in a small terminal only with no modal | ✅ Killed · the test of N1 |
| N14 | `tui.ts:170` | only a mark of the start is read there (no paste in course) | ✅ Killed · the test of N1 |
| N15 | `tui.ts:170` | only a mark of the end is read there (a paste in course) | ✅ Killed · the test of N1 |

New, on the line feed with no modal open, QST-78 (5):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| L1 | `tui/keys.ts:140` | `\n` is `enter` with no modal open | ✅ Killed · `QST-78: with no modal open \n does nothing, alone, after another key and in a delimited paste, where \r opens the modal` |
| L2 | `tui/keys.ts:207` | `\n` is `enter` with no modal open in a delimited paste | ✅ Killed · the same test |
| L3 | `tui/keys.ts:207` | `\n` is `enter` with no modal open in a chunk of several keys | ✅ Killed · the same test |
| L4 | `tui/keys.ts:207` | `\n` is `enter` with no modal open when the loop holds back keys after it | ❌ Survived · gap 5 |
| L5 | `tui/keys.ts:206` | a pasted `\n` becomes a space also with no modal open | Equivalent, not counted: a space is a key of no screen, as `\n` is |

New, on the keys that quit a small terminal, QST-99 (9):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| A2 | `tui.ts:171` | only `ctrl+c` quits (killed in round 4 by the test F22 rewrote) | ✅ Killed · `QST-99: in a terminal smaller than 120×40, q, ctrl+c and a chunk with q among its keys quit…` |
| A7 | `tui.ts:171` | `q` quits only with no modal (the same) | ✅ Killed · the same test |
| X1 | `tui.ts:171` | `ctrl+c` quits only with no modal | ✅ Killed · the same test |
| X2 | `tui.ts:171` | `ctrl+c` quits only with the modal open | ✅ Killed · the same test |
| X3 | `tui.ts:171` | `ctrl+c` quits only alone in its chunk | ❌ Survived · gap 4 |
| X4 | `tui.ts:171` | only the first key of the chunk can quit | ✅ Killed · the same test, by `aq` |
| X5 | `tui.ts:171` | `q` and `ctrl+c` quit only when both sides are small | ❌ Survived · gap 1 |
| X6 | `tui.ts:171` | `q` and `ctrl+c` quit only when the columns are short | ❌ Survived · gap 1 |
| X7 | `tui.ts:171` | `q` and `ctrl+c` quit only when the lines are short | ❌ Survived · gap 1 |

New, on the `result` and the merged questions, QST-36 (4):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| Q5 | `question.ts:392` | each question of the `result` is resolved with itself alone as `own` | ✅ Killed · the three tests of QST-36 with a merge (`:159`, `:188`, `:214` of `test/unit/question-result.test.ts`) |
| Q6 | `question.ts:74` | the recursive step keeps out every question of the same `asked_by`, not the ones of `own` | ❌ Survived · SP2, not ranked |
| Q6a | `question.ts:71` | the first step does the same | ❌ Survived · SP2, not ranked |
| Q7 | `question.ts:74` | the recursive step no longer asks for `status = 'merged'` | ✅ Killed · `QST-37: a question closed by its own result two merges away from the end of the chain keeps its default when the end is answered…` |

**Sensor depth**: P0-full, by hand: no mutation tool is installed for Bun.

### The survivors

What kind of mutant survives matters for how much weight to give them. Every mutant that changes a construct the round wrote, the call of `marks` removed, its two marks swapped or cut to one, `some` turned into `every`, one of the two quit keys dropped, the `NOT IN` removed, is killed, most by more than one test. The seven that survive each add a condition the code does not have, on a case the requirement covers and no test visits. That is the same kind as A6, A8, B5 and B14 of round 4, and the reason they are ranked is the same: the spec defines the outcome and nothing would notice it break.

- **X5, X6, X7** are one hole. QST-99 starts with "menos de 120 colunas ou menos de 40 linhas", and the quit is tested where both hold. A terminal of 120×30 is short and not narrow; it is the default window of Windows Terminal, and the one a dev is most likely to open the TUI in before reading that it needs 40 lines. The other three tests of QST-99 loop over `SMALL`; this one sets `{ cols: 100, rows: 30 }` at `test/unit/tui-loop.test.ts:630`.
- **N8**: the two cases of the new test open the modal of Q-08 before the terminal shrinks (`:679`, `:697`), and the test of `marks` starts from `open("06")`. It is the shape of gap 3 of round 4, on the trigger this round added.
- **N11**: the test of `marks` has the marks among other keys (`test/unit/tui-keys.test.ts:570`–`:572`); the tests of the loop hand it each mark alone. The call passes the whole chunk, so the two halves do compose (G3a, G3b); no assertion says so.
- **X3**: `aq` is in the list of F22 and its twin with `ctrl+c` is not.
- **L4**: F23 gave `\r` its case with keys held back (`:555`); F24 gave `\n` the three cases of its task and not that one.
- **Q6, Q6a** differ from the code only for a question of the worker that the `result` does not close and that was merged into one it closes. The spec does not say what closes it (SP2), so they are not ranked.

Each of the seven fails an assertion written in the scratch that passes at `5fa9b80`: G1a for X5, X6 and X7, G1b for X3, G2a and G2b for N8, G3a and G3b for N11, G4 for L4. The assertions were deleted with the scratch.

## Code quality

Over what the round touched: `tui.ts`, `tui/keys.ts`.

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `marks` is one reduction over `keysOf`; `paste` moved from inside `input` to the module so both use it; the loop gained one assignment |
| Surgical changes | ✅ `input` is as it was but for the helper it lost; `dispatch` still returns before `input` in a small terminal |
| No scope creep | ✅ No setting, no new state: `Ui.pasting` is the field of F15 |
| Matches patterns | ✅ `marks` is pure and takes and gives a `Ui`, as `sync` and `settle`; the same object comes back when no mark is in the chunk |
| Spec-anchored outcome check | ❌ 18 of 22 clauses in full |
| Per-layer coverage expectation | ❌ The rule of the loop for a small terminal has no case per side of its "ou" for the quit, and the reducer has no case of `marks` with no modal |
| Every test maps to a requirement | ✅ The 8 new tests name QST-36, QST-78 and QST-99 |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/LESSONS.md` | ⚠️ `broker/CLAUDE.md` is up to date. L-010, confirmed (each trigger of an AC its own assertion), does not hold for the two sides of the size in the quit of QST-99 |

Smaller notes, none blocking:

- In a small terminal `dispatch` splits the chunk twice, once in `marks` and once for the quit (`tui.ts:170`–`:171`).
- A pasted `q` quits a small terminal (G7), now also when the TUI knows it is inside a paste. It is what QST-99 says of `q` and what TUI-62 says of a chunk with `q` at any size.
- `key` still has a local `input` (`tui.ts:188`) with the name of the reducer `dispatch` calls (`:174`), as rounds 3 and 4 noted.

## Not exercised

Stated, not assumed:

- **A real interactive terminal.** Every test and probe drives `start(...).key`, `input` or `marks` with strings.
- **Whether a given terminal sends `ESC [ 200 ~` and `ESC [ 201 ~`** after `CSI ? 2004 h`, and in how many reads: Windows Terminal, conhost, or any terminal of Linux or macOS, and whether Bun in raw mode on Windows hands them to `stdin` unchanged. Where they do not arrive, the rule of the chunk is all there is.
- **A real resize.** `resize` and `size` are the injected ones; no window was resized.
- **Linux and macOS.** The suite ran on Windows only.
- The interactive UAT (step 7) is not this agent's.

The known risks rounds 3 and 4 listed stand, untouched by this round.

## Fix plans

Three edits of tests and two sentences. No code has to change.

### Fix 1: the quit at each small size, and `ctrl+c` in a chunk (gaps 1 and 4; X5, X6, X7, X3)

- **Root cause**: `test/unit/tui-loop.test.ts:630` sets 100×30 where its three neighbours loop over `SMALL`, and `:625` has `aq` without its twin.
- **Fix task**: in that test, loop over `SMALL` in the place of the fixed size, and add `"a\x03"` to the list of `:625`.
- **Done when**: it fails with `io.size().cols < 120 &&` and with `io.size().rows < 40 &&` before the `some` of `tui.ts:171`, and with `keysOf(chunk).some((k) => k === "q") || chunk === "\x03"` in its place.
- **Priority**: Minor for the sizes, Cosmetic for the chunk.

### Fix 2: the marks in a small terminal with no modal, and among other keys (gaps 2 and 3; N8, N11)

- **Root cause**: both cases of `test/unit/tui-loop.test.ts:672`–`:710` open the modal first and hand the loop each mark alone.
- **Fix task**: in that test, two more cases. No modal: the tab on Q-08, the terminal shrinks, `ESC[200~`, it grows, then `\r`, `logo`, `\r`, `ESC[201~`: no `POST`, the modal with `logo `; and the tab, `ESC[200~`, shrink, `ESC[201~`, grow, `\r`, `logo`, `\r`: `logo` posted. Among other keys: the modal of Q-08, shrink, `ESC[200~logo\r` in one read, grow: the field empty, then `mais`, `\r`: no `POST`, the text `mais `; and the modal with `ESC[200~logo`, shrink, `fim\r ESC[201~` in one read, grow, `\r`: `logo` posted. In `test/unit/tui-keys.test.ts`, `marks` over a state with no modal.
- **Done when**: the first two fail with `if (ui.modal)` before the call of `tui.ts:170`, and the other two with `if (keysOf(chunk).length === 1)` there.
- **Priority**: Minor.

### Fix 3: `\n` with keys held back (gap 5; L4)

- **Fix task**: in the loop of `test/unit/tui-keys.test.ts:560`–`:565`, `expect(input(v.ui, "\n", v, true)).toBe(v.ui)`.
- **Done when**: it fails with `more && next.modal === null && k === "\n" ? "\r" : k` as the key of `tui/keys.ts:207`.
- **Priority**: Cosmetic.

### SP2 and SP3

- SP2: one sentence, by the dev, in QST-36 or QST-39, for a question of the same worker that the `result` does not close and that is merged into one it closes, and then the test of probe G8, direct and through a third. If the answer is "it follows", no code changes.
- SP3: one sentence in QST-99 for `esc` during a paste in a small terminal. If it is "it is a key like the others", `test/unit/tui-keys.test.ts:576` already pins it.
- **Priority**: Cosmetic, both.

This is the second verification since the third fix round. One more fix and re-verify iteration is left before the bound of three sends it to the user.

## Requirement traceability update

Not applied: this agent does not edit `spec.md`. Proposed:

| Requirement | Current status | Proposed |
| ----------- | -------------- | -------- |
| QST-36 | Implementing | ✅ Verified. Every clause the spec defines has its assertion and no mutant inside the spec survives; SP2 is a sentence the spec lacks, not a failure of the requirement |
| QST-78 | Implementing | ❌ stays Implementing until Fix 3, one line. Everything else of it holds, the delimited paste whole |
| QST-99 | Implementing | ❌ stays Implementing until Fix 1 and Fix 2 |
| the other 96 | Verified | Verified: the gate is green and no expected value of their tests changed |

## Lessons recorded

Through `scripts/lessons.py add`, seven calls for seven signals. The script answered `ADDED` for L-064, L-065 and L-066, and `UPDATED` for L-061, L-060 (twice) and L-063, each still a candidate with one feature, this one; it changed `.specs/lessons.json` and `.specs/LESSONS.md`.

| Signal | Lesson | Effect |
| ------ | ------ | ------ |
| X5, X6, X7 `tui.ts:171`, `test/unit/tui-loop.test.ts:630` (QST-99, gap 1) | When the condition of an AC is an or, assert each outcome of the AC with a fixture where only one side of the or holds | New, L-064 |
| N8 `tui.ts:170` (QST-99, gap 2) | When a rule gains a new trigger, test every branch of the rule under the new trigger, not only the branches the change was made for | L-061 reinforced: the shape of B5 of round 4, on the trigger this round added |
| N11 `tui.ts:170` (QST-99, gap 3) | Test a key rule of an input loop with the key inside a chunk of several keys, not only alone in its read | L-060 reinforced |
| X3 `tui.ts:171` (QST-99, gap 4) | the same sentence | L-060 reinforced |
| L4 `tui/keys.ts:207` (QST-78, gap 5) | When an AC names several inputs for one rule, assert the rule with each input in every state the AC gives | L-065. It is the sentence of L-062 word for word, meant to reinforce it; the script keeps the two apart because the signal differs (`surviving_mutant` here, `ac_gap` there). Left as the script wrote it |
| SP2, QST-36 with QST-31 and QST-39; Q6, Q6a `question.ts:74`, `:71` | When an AC says what happens to the items a rule acts on and to linked items of another owner, state what happens to a linked item of the same owner the rule does not act on | New, L-066 |
| SP3, QST-78 with QST-99 `tui/keys.ts:53` | When an AC makes a state ignore input, state what happens to an input sequence that starts in one state and ends in the other | L-063 reinforced: SP1 of round 4 was settled for the marks and not for `esc` |

No lesson was penalized. L-010 is confirmed and gap 1 is near it, two alternatives of one condition asserted together; the sentence of L-064 says what was missing more exactly than a penalty on L-010 would.

## Summary

**Overall**: ❌ Not ready, by a short distance. The code holds in every probe; the tests of QST-99 leave four cases of its own words unvisited, and the tests of QST-78 one.

**Spec-anchored check**: 18 of 22 clauses in full, 4 in part (QST-99 a, b, e; QST-78 d); QST-36 whole; 2 spec-precision gaps (SP2, SP3).
**Sensor**: 32 of 41 mutants killed. The seven of round 4 all killed. 9 survive: 7 inside the spec, X5, X6, X7, X3, N8, N11 (QST-99) and L4 (QST-78), and 2 on SP2, Q6 and Q6a (QST-36).
**Gate**: `tsc` exit 0; 1292 pass, 3 skip, 0 fail.

**What works**: two questions of a worker merged into each other through the question of another worker close each by its own default, and the one between them by the answer of the end; `q`, `ctrl+c` and a chunk with `q` quit a terminal of 100×30 each by itself, with and without the modal; a line break of a delimited paste with no modal open does what `enter` does, and `esc` ends the paste there too; a line break before a held back escape opens the modal and sends nothing; `\n` with no modal does nothing, and the spec says so; the marks of a paste are read in a small terminal, so a paste that crosses a resize starts and ends where its marks say, at the three sizes.

**Issues found**: the five ranked gaps, SP2 and SP3, above.

**Next steps**: Fix 1 to Fix 3 are tests only, about thirty lines, and each was tried in the scratch against its mutant; SP2 and SP3 wait for a word of the dev. Then verify again over the new commits.

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
