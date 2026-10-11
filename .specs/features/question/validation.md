# Question Validation

**Result**: FAIL

**Round**: 4
**Date**: 2026-10-11
**Verifier**: independent sub-agent (author ≠ verifier). It did not write the code, the tests, any fix round or any earlier report. It wrote this file and, through `scripts/lessons.py`, the two lessons files. No code, no test, no spec, no task, no commit.
**Spec**: `.specs/features/question/spec.md`, 99 requirements. In scope: QST-99 (new), QST-36, QST-49 and QST-78 as reworded in this fix round (all four `Implementing`), and the task-level criteria of F18 (QST-87), F19 (QST-04, QST-18) and F20 (QST-80). The other requirements were verified at `2ac91fe` (round 3) and are checked here for regression only.
**Diff range**: `db27b7f..89007b8` on `feat/question` (8 commits: F14 `487ac06`, F17 `b525fce`, F18 `4baef4a`, F19 `faf7ab1`, F20 `3dc3c77`, the handoff `a76bdaa`, F16 `d565f97`, F15 `89007b8`; 22 files, +392 −90). The task list is `fix-round-3.md`.
**Environment**: Windows 11, Bun 1.4.2, installed TypeScript 5.9.3, Python 3.12.9. Linux and macOS did not run here. No real interactive terminal was used.

All code and test citations below are relative to `broker/`.

The gate is green with 1284 tests, and every probe of the code of `89007b8` gave what the spec says, with one exception of wording (`\n` with no modal open, gap 6). The verdict is FAIL because of the tests: **7 of 39 mutants survive the whole suite, all seven inside what the spec defines**, on QST-36, QST-78 and QST-99. QST-49 is the only one of the four requirements whose every clause has an assertion that can fail. Nothing found here makes the TUI send an answer the dev did not send in a terminal that delivers the marks of the paste.

## Ranked gaps

| # | Gap | Criterion | Where | Mutant |
| - | --- | --------- | ----- | ------ |
| 1 | No test has a question of the `result` merged into another of them **through a third question**. Removing the filter from the recursive step of the walk makes that question close by the default of the other one, in the append-only log, and nothing fails. The code is right (probe P1) | QST-36, "direto ou por outra mesclada" | `question.ts:74` · the two new tests at `test/unit/question-result.test.ts:159`, `:188` only have the direct merge | C2 |
| 2 | `ctrl+c` in a small terminal has no assertion that can fail: the test presses `q` right after it, and `q` alone quits | QST-99, "`q` e `ctrl+c` SHALL sair" | `test/unit/tui-loop.test.ts:613` `for (const k of [quit, "q", "\r"]) key(k)` · `tui.ts:168` | A3 |
| 3 | The rule of the delimited paste is asserted with the modal open only. With no modal open, a line break alone in a read between the marks must do what `enter` does, and `esc` must end the paste: neither is asserted | QST-78, "a regra SHALL valer para todo `\r` e `\n`" and "até um `esc`" | `tui/keys.ts:198`–`:199` · `test/unit/tui-keys.test.ts:501`–`:536` open a modal before every paste | B5, B14 |
| 4 | `q` in a small terminal is asserted with the modal open only, and alone in its read only | QST-99, "com ou sem modal aberto" | `tui.ts:168` · `test/unit/tui-loop.test.ts:604`–`:621` | A6, A8 |
| 5 | A line break followed by an unfinished escape, with no modal open, still has no test. It was K4 of round 3, then outside the spec; `d867b57` wrote the sentence that defines it into QST-78 and not the test the round-3 report proposed | QST-78, "Sem modal aberto na vez dela, a tecla faz o que `enter` faz" | `tui/keys.ts:199` | B6 |
| 6 | The same sentence says `\r` **or `\n`** does what `enter` does with no modal open. The code does nothing with `\n` there (probe P8), and no test says either | QST-78 | `tui/keys.ts:132` is the only `enter` of `press`; `:199`–`:200` hand `\n` over unchanged | none: the code and the text disagree |

One spec-precision gap, SP1: what the two marks of a paste do in a small terminal (QST-78 with QST-99). See "Spec-precision gaps".

## How each task ended

Every "done when" box of `fix-round-3.md` is ticked (26 boxes, none open). Each was checked against the diff and a test.

| Task | Done when | Evidence | Ended |
| ---- | --------- | -------- | ----- |
| F14 | below 120×40 `dispatch` lets through only `q` and ctrl+c; no other key changes the state or posts | `tui.ts:168` · `test/unit/tui-loop.test.ts:587`–`:590`, `:635`–`:637` at 119×40, 120×39 and 100×30 | ✅ for the other keys · ❌ for ctrl+c (gap 2) and for no modal (gap 4) |
| F14 | 100×30, blocking with options, `b`, `enter`, `enter`: no `POST`, question still open | `test/unit/tui-loop.test.ts:588` `expect(t.posts).toEqual([])`, `:589` `expect(t.calls.every((call) => call.method === "GET")).toBe(true)`, `:594`–`:597` Q-07 still in the list and its modal opens | ✅ |
| F14 | modal in the text mode, window shrunk, `q` quits and nothing is written | `test/unit/tui-loop.test.ts:614` `expect(t.raw).toEqual([true, false])`, `:615` `expect(t.out.endsWith(LEAVE)).toBe(true)`, `:616` `expect(t.posts).toEqual([])` | ✅ for `q` |
| F14 | back at 120×40 the keys count again, with the state of before | `test/unit/tui-loop.test.ts:641` `expect(t.lines()).toEqual(open)`, `:643` the answer `logo` posted | ✅ |
| F15 | the spec says the delimited paste counts for QST-78 and stays out for the editing of the field | `spec.md:37`, `:79`, `:319` | ✅ |
| F15 | `ENTER` and `LEAVE` turn mode 2004 on and off | `tui/ansi.ts:30`–`:31` · `test/unit/tui-ansi.test.ts:8`–`:9` · `test/unit/tui-loop.test.ts:476`, `:496` | ✅ |
| F15 | `input` makes a space of the breaks between the marks in the text mode and ignores them in the choice mode, also alone in a read; `Ui.pasting` | `tui/keys.ts:191`–`:200`, `tui/view.ts:46` · `test/unit/tui-keys.test.ts:503`–`:505`, `:514`–`:516` · `test/unit/tui-loop.test.ts:480`–`:484`, `:489`–`:492` | ✅ with the modal open · ❌ with none (gap 3) |
| F15 | `esc` ends a paste whose end mark did not come | `tui/keys.ts:198` · `test/unit/tui-keys.test.ts:534`–`:535` | ✅ with the modal open · ❌ with none (gap 3) |
| F15 | the rule of the chunk still holds; the old tests of QST-78 pass with no expected value changed | `git diff db27b7f..89007b8 -- broker/test/unit/tui-keys.test.ts`: 43 lines added, 1 changed (the fixture `START`) | ✅ |
| F15 | the risk of the paste in `STATE.md` is updated | `.specs/STATE.md:144` | ✅ |
| F16 | QST-36 says each question closes by its own answer and default | `spec.md:225` | ✅ |
| F16 | each closes by its own default in both directions, in ascending id; the walk stops at a question the same `result` closes | `question.ts:60`–`:78`, `:390`–`:393` · `test/unit/question-result.test.ts:170`–`:184` | ✅ direct · ❌ through a third (gap 1) |
| F16 | test: both directions give two answers, and a question of another worker merged into one of the two closes by the answer of that one | `test/unit/question-result.test.ts:160`–`:185`, `:200`–`:211` | ✅ |
| F17 | `absorbed` keeps only the ids whose `answered_by` is null | `shared/derive.ts:358` · `test/unit/derive.test.ts:743`, `:745` | ✅ |
| F17 | test: Q-02 no longer shows `absorveu Q-01` in the list, the detail or the modal | `test/unit/tui-questions.test.ts:292`, `:293` · `test/unit/tui-answer.test.ts:146` | ✅ |
| F18 | line 108 leaves; 107 already pins the class and the text | `test/unit/tui-frames.test.ts:107` · `test/frames/deviations.ts:86`, `:161`, `:392`: both frames spread `KEY_SEAL` | ✅ |
| F19 | `shared/contract.ts` exports the constant and the two files import it | `shared/contract.ts:42` · `question.ts:16`, `:53` · `shared/derive.ts:12`, `:330` · `test/unit/contract.test.ts:89` `expect(TIMEOUT_S).toBe(240)` | ✅ |
| F20 | the test waits for a `GET` registered in `asked` after `stale = true`, with no `Bun.sleep` | `test/integration/tui.test.ts:239`–`:242`; the file has no `Bun.sleep` left | ✅ |
| all | the full gate passes | see "Gate check" | ✅ |

Two notes on the papers, neither a gap of the code: the opening paragraph of `fix-round-3.md:5`–`:6` still says the round "ainda não começou", and the handoff of `.specs/STATE.md:124`–`:128` still says F15 and F16 have no code written. Both are from before `d565f97` and `89007b8`.

## Gate check

- **Command**, from `broker/`: `bun node_modules/typescript/bin/tsc --noEmit` then `bun test`
- **Outcome**: `tsc` exit 0. **1284 pass, 3 skip, 0 fail**, 54034 `expect()` calls, 1287 tests in 63 files, 60.05 s. One run; `EVT-43` did not flake.
- **Round 3** (`2ac91fe`): 1270 pass, 3 skip. **Delta**: +14 tests, all in this fix round: F14 3, F15 5, F16 2, F17 3, F19 1. No count went down.
- **Skipped**: the same three platform conditions as before the feature.
- The whole suite also ran seven more times in the scratch worktree, once under each surviving mutant, each with 1284 pass.

## Spec-anchored acceptance criteria

Each clause the round wrote or reworded, with the assertion that targets it. ✅ the assertion pins what the spec defines and a mutant of it fails · ❌ no assertion that can fail · ⚠️ the spec leaves it open.

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| QST-99 a · `q` quits a small terminal, modal open | the terminal is given back, nothing posted | `test/unit/tui-loop.test.ts:614` `expect(t.raw).toEqual([true, false])` · `:615` · `:616` `expect(t.posts).toEqual([])` | ✅ (A2, A7 killed) |
| QST-99 b · `ctrl+c` quits a small terminal | the same | the same lines, but `:613` presses `q` after `\x03`: the assertions hold without `ctrl+c` | ❌ A3 survives |
| QST-99 c · `q` and `ctrl+c` quit "com ou sem modal aberto" | the same with no modal open | none: `:604`–`:621` open the modal first; `:131`–`:161` (TUI-60) quit at 120×40 | ❌ A6 survives |
| QST-99 d · no other key changes the state or posts | no `POST`; the screen of before when the size is back | `test/unit/tui-loop.test.ts:588` `expect(t.posts).toEqual([])`, `:589`, `:590` `expect(t.lines()).toEqual(small(size.cols, size.rows).text())`, `:594` `expect(t.lines()).toEqual(main(t.view()).text())` · `:636`–`:637` for a text, backspace, `ctrl+u`, `ctrl+e`, `enter` and `esc` with `1`; each at 119×40, 120×39 and 100×30 | ✅ (A1, A4, A5, A9, A10, A11 killed) |
| QST-99 e · when the size is back, the state of before with the modal and its text, and the keys count | the modal of Q-08 with `logo`; `enter` posts it | `test/unit/tui-loop.test.ts:641` `expect(t.lines()).toEqual(open)` · `:643` `expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 8, answer: "logo" } }])` · `:597` | ✅ |
| QST-78 f · asks for the delimited paste on entering and undoes it on leaving | `CSI ? 2004 h`, `CSI ? 2004 l` | `test/unit/tui-ansi.test.ts:8` `expect(ENTER).toBe("\x1b[?1049h\x1b[?25l\x1b[?2004h")` · `:9` `expect(LEAVE).toBe("\x1b[?2004l\x1b[?25h\x1b[?1049l")` · `test/unit/tui-loop.test.ts:476`, `:496` what the loop writes | ✅ (B10, B11 killed) |
| QST-78 g · in a delimited paste a break alone in a read is a space in the text mode and sends nothing | text `logo da 89 `, `send` null | `test/unit/tui-keys.test.ts:504` `expect(pasted).toEqual({ ...v.ui, modal: { ...m(v), text: "logo da 89 " } })` · `:505` · `test/unit/tui-loop.test.ts:481` `expect(t.posts).toEqual([])`, `:482` | ✅ (B1, B4, B8, B9, B12 killed) |
| QST-78 h · the same in the choice mode: ignored, no option confirmed | the state unchanged | `test/unit/tui-keys.test.ts:514` `expect(reads([PASTE, "\r", "\n", PASTED], v)).toEqual(v.ui)` · `:515` · `test/unit/tui-loop.test.ts:490` `expect(t.posts).toHaveLength(1)` | ✅ (B7 killed) |
| QST-78 i · until the mark `ESC [ 201 ~` | `enter` alone sends again after it | `test/unit/tui-keys.test.ts:507` `…toEqual({ question_id: 8, answer: "logo da 89" })` · `:516` · `test/unit/tui-loop.test.ts:480` the end mark split in two reads, `:484`, `:492` | ✅ (B2 killed) |
| QST-78 j · or until an `esc` | `enter` alone sends again after it | `test/unit/tui-keys.test.ts:534`–`:535` `expect(sent.send).toEqual({ question_id: 8, answer: "texto" })`, with the modal open at the `esc` | ✅ modal open (B3, B15 killed) · ❌ no modal: B14 survives |
| QST-78 k · the two marks enter no text and change no screen | the state unchanged | `test/unit/tui-keys.test.ts:521` `expect(chunk(PASTE + PASTED, text)).toEqual(text.ui)` · `:522` · `:524` · `:525`–`:528` on the five screens | ✅ (B13 killed) |
| QST-78 l · in a delimited paste, with no modal open, the break does what `enter` does | the modal opens; what follows goes into its text | none | ❌ B5 survives |
| QST-78 m · the rule of the chunk, as before | space in the text mode, ignored in the choice mode, `enter` with no modal | `test/unit/tui-keys.test.ts:441`–`:493` and `test/unit/tui-loop.test.ts:389`–`:471`, no expected value changed | ✅ for a chunk of whole keys · ❌ with keys held back and no modal: B6 survives |
| QST-78 n · `\n` of a chunk with no modal open does what `enter` does | the modal opens | none; the code does nothing with it (P8) | ❌ text and code disagree |
| QST-36 o · two of the `result`, one merged straight into the other: each by its own answer and default, whichever was merged, ascending id | answers 5 `8080` for Q-01 and 6 `9090` for Q-02 in both directions | `test/unit/question-result.test.ts:170` `expect(b.events().slice(4)).toEqual([storedDefault(5, id), storedDefault(6, id, second)])` · `:171`–`:174` whole rows · `:175`–`:179` deliveries · `:181`–`:184` the derivation | ✅ (C1, C3, C4, C5, C6 killed) |
| QST-36 p · the same "por outra mesclada" | the same with a question of another worker between the two | none | ❌ C2 survives |
| QST-36 q · a question of another `asked_by` merged into one of them closes by the answer of that one | Q-03 with `answer_seq` 8, the answer of Q-02, and one delivery to `worker-3` | `test/unit/question-result.test.ts:200` · `:201`–`:205` `questionRow(3, id, { …, status: "defaulted", merged_into: 2, answer_seq: 8 })` · `:206`–`:211` | ✅ |
| QST-49 r · a question that closed by an answer of its own after the merge leaves `absorbed`; the ones merged into it stay in its own | `[7, [9]]`, `[8, [10]]` | `test/unit/derive.test.ts:743` `expect(absorbed(left)).toEqual(after)` · `:745` a question that closes by the answer of the other is still absorbed | ✅ (D1, D2, D3, D4 killed) |
| QST-49 s · and with it the `absorveu` of QST-56, QST-58 and QST-70 | the list, the detail and the modal no longer name it | `test/unit/tui-questions.test.ts:292` `expect(row(b.lines(), 6)).toBe("  rota w2 → ldr → mot → dev")` · `:293` `…toEqual(["rota    w2 → ldr → mot → dev", SEP])` · `test/unit/tui-answer.test.ts:146` `expect(route()).toEqual([boxed("rota    w2 → ldr → mot → você")])`, each after the same assertion with `absorveu Q-01 (worker)` at `:286`, `:287`, `:142` | ✅ |
| QST-04, QST-18 (F19) · 240 s without `timeout_s`, one constant | 240 | `test/unit/contract.test.ts:89` `expect(TIMEOUT_S).toBe(240)` · the literals of `test/unit/question-ask.test.ts` and `test/unit/question-escalate.test.ts` unchanged | ✅ (E1, E2, E3 killed) |
| QST-87 (F18) · the seal of frame 20a | class D1 and its text | `test/unit/tui-frames.test.ts:107` `expect(seal.map((dev) => [dev.class, dev.text.trim()])).toEqual([["D1", "⚠ w2 bloqueado · RADIO_API_KEY ausente"]])` | ✅ |
| QST-80 (F20) · the refusal over a real broker | the refused modal after a read with no news | `test/integration/tui.test.ts:242` `await waitFor(() => asked.length > reads, …)` · `:245` | ✅ |

**Status**: 16 of 23 clauses hold. QST-49 holds whole, and so do the three task-level criteria. QST-36 has one clause with no assertion, QST-78 four, QST-99 two.

Payload and conjunction rule: the new tests of QST-36 compare whole events, whole rows and the deliveries (`storedDefault`, `questionRow`), and the ones of QST-99 compare the whole screen and the whole body of the `POST`. No new assertion only counts calls where the spec gives a value, but for `:490` (`toHaveLength(1)`), which `:492` completes with the body.

## What the code of `89007b8` does: probes

Run in the scratch worktree, through `createQuestion`, `input` and `start(...).key`, and deleted with it.

| # | Input | What came out | Spec |
| - | ----- | ------------- | ---- |
| P1 | Q-02 of worker-1 merged into Q-03 of worker-3, Q-03 merged into Q-01 of worker-1; `delivered("worker-1", "T-1")` | answers `[7, Q-01, 8080]`, `[8, Q-02, 9090]`; rows Q-01 `answer_seq` 7, Q-02 8, Q-03 7; the derivation the same; deliveries 7 to worker-1 and worker-3, 8 to worker-1 | QST-36: as defined. Under mutant C2, Q-02 closes by 7 |
| P2 | three of worker-1 in a chain, Q-03 into Q-02 into Q-01 | three answers, `8080`, `9090`, `7070`, each its own | QST-36: as defined |
| P3 | Q-01 and Q-02 of worker-1 both merged into the open Q-03 of worker-3 | two answers, Q-03 stays `open` and its `absorbed` is empty | QST-36, QST-37, QST-49: as defined |
| P7 | the tab, no modal: reads `ESC[200~`, `\r` | the modal of Q-08 opens; with `texto`, `\r`, `ESC[201~` after it the text is `texto ` and nothing is sent | QST-78: as defined, asserted by no test (gap 3) |
| P8 | the tab, no modal: `\n` alone, `j\n`, and `\n` inside a delimited paste | no modal opens in any of the three; `\r` alone opens it | QST-78 says "a tecla faz o que `enter` faz" of `\r` and of `\n` (gap 6) |
| P9 | the tab, no modal: `ESC[200~`, `esc`, then `4`, `j`, `enter`, `texto`, `enter` | `{ question_id: 8, answer: "texto" }` is sent | QST-78: as defined, asserted by no test (gap 3) |
| P5 | modal of Q-08, `ESC[200~logo`, the terminal shrinks, `ESC[201~`, the terminal grows, `enter` | nothing is posted: the paste never ended for the TUI. After `esc`, `enter`, `x`, `enter` the answer `x` is posted | SP1 |
| P5b | modal of Q-08, the terminal shrinks, `ESC[200~`, the terminal grows, `logo`, `\r`, `ESC[201~` in three reads | `logo` is posted by the pasted line break | SP1 |
| P6 | small terminal: `aq` in one chunk, `ctrl+c` alone, `q` with no modal, a delimited paste of `quero` | each one quits | QST-99: as defined; the first three asserted by no test (gaps 2 and 4) |

## Spec-precision gaps

| # | AC | What the spec leaves open | What the code does | Pinned by a test? |
| - | -- | ------------------------- | ------------------ | ----------------- |
| SP1 | QST-78 with QST-99 | What the two marks of a delimited paste do when they arrive in a small terminal. QST-99 says no key but `q` and `ctrl+c` changes the state there; QST-78 says a paste lasts from one mark to the other | `dispatch` returns before `input` (`tui.ts:168`), so a mark that arrives in a small terminal is lost. An end mark lost leaves `Ui.pasting` on: after the terminal grows, `enter` writes a space and sends nothing until an `esc`, which closes the modal with its text (P5). A start mark lost leaves the rest of the paste to the rule of the chunk: a break alone in a read sends (P5b) | No |

It takes a resize between the two marks of one paste, a window of milliseconds, so it is not ranked. P5b is the same exposure the spec already accepts for a terminal that sends no marks. The honest choices are a sentence in QST-99 that the marks are not keys and are read at any size, or a sentence that says a paste that crosses a resize is not delimited.

P3 of round 3 is closed in the spec (`spec.md:319`, since `d867b57`) and open in the tests (gap 5).

## Test integrity: expectations of existing tests that changed

`git diff --numstat db27b7f..89007b8 -- broker/test`: 277 lines added, 9 removed or changed, in 11 files. Each of the 9, judged against the spec:

| Where | Change | Judgement |
| ----- | ------ | --------- |
| `test/unit/tui-ansi.test.ts:7`–`:9` (TUI-60) | the literals of `ENTER` and `LEAVE` gain `\x1b[?2004h` at the end and `\x1b[?2004l` at the start; the name of the test gains QST-78 | Backed by QST-78 as reworded (`spec.md:319`). What TUI-60 pinned, the cursor and the alternate screen, is still in the literals, in the same order |
| `test/unit/tui-keys.test.ts:26` | the expected `START` gains `pasting: false` | A new field of the state with its neutral value; every other field as before |
| `test/frames/view.ts:26` | the fixture of every frame gains `pasting: false` | Same field; no frame, log or deviation changed, and the 47 frame cases pass |
| `test/unit/tui-frames.test.ts` (line 108 removed) | `expect(seal).toEqual(DEVIATIONS["10"]!.filter(…))` leaves | Not a weakening: frames `10` and `20a` spread the same `KEY_SEAL` (`test/frames/deviations.ts:86`, `:161`, `:392`), so the line compared a constant with itself. `:107` pins the class and the text by their literals |
| `test/integration/tui.test.ts:240`–`:242` | `await Bun.sleep(200)` becomes a wait for the next `GET` of the loop | Stronger, not weaker: the loop reads one at a time, so a `GET` registered after `stale = true` means every read from before was answered, and each later one is stale. The assertions after it are the same |
| `test/unit/tui-loop.test.ts:42` | the helper `screen` no longer writes a line for an empty string between two escapes | A fix of the terminal the test emulates, not of an expectation. With the old line, a `CLEAR` followed by a smaller drawing kept one phantom line at the row the cursor was on. Checked in the scratch with the line put back: of the 32 tests of the file, the 28 that existed and three of the four new ones pass either way, and only the new test of QST-99 that goes from the main screen to 120×39 fails, by that one line |
| `test/unit/contract.test.ts:2` | the import gains `TIMEOUT_S` | For the new test at `:88`–`:90` |

No test was deleted and no skip added. The old tests of QST-78, QST-36, QST-37 and QST-49 have every expected value they had.

## Discrimination sensor

39 behaviour-level mutants of my own, one at a time, in a `git worktree` at `89007b8` under the scratchpad with a copy of `node_modules`. Each ran `bun test test/unit` (1126 tests, 5 s) and the file was restored with `git checkout`; the seven that survived ran again under the whole suite and survived it with 1284 pass. No stash. The worktree was removed with `git worktree remove --force`; `git status --porcelain` of the real tree was empty before the sensor and is empty after it, but for this file and the two lessons files.

**32 killed, 7 survived.** All seven are inside what the spec defines.

F14, `tui.ts` (11):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| A1 | `tui.ts:168` | no guard in `dispatch`, the code of `db27b7f` | ✅ Killed · the three tests of QST-99 |
| A2 | `tui.ts:168` | in a small terminal only `ctrl+c` quits | ✅ Killed · `QST-99: in a terminal smaller than 120×40, q and ctrl+c quit with the modal in the text mode, and nothing is posted` |
| A3 | `tui.ts:168` | in a small terminal only `q` quits | ❌ Survived · gap 2 |
| A4 | `tui.ts:168` | the keys stop only when both sides are small (`&&`) | ✅ Killed · `QST-99: …b, enter and enter…` and `QST-99: the keys pressed in a terminal smaller than 120×40 leave the modal and its text as they were…` |
| A5 | `tui.ts:168` | any key quits a small terminal | ✅ Killed · the same two |
| A6 | `tui.ts:168` | in a small terminal `q` quits only with the modal open | ❌ Survived · gap 4 |
| A7 | `tui.ts:168` | in a small terminal `q` quits only without a modal | ✅ Killed · `QST-99: …q and ctrl+c quit with the modal in the text mode…` |
| A8 | `tui.ts:168` | in a small terminal `q` quits only when its chunk has no other key (`every`) | ❌ Survived · gap 4 |
| A9 | `tui.ts:168` | the keys stop only with the modal open | ✅ Killed · `QST-99: …b, enter and enter…` |
| A10 | `tui.ts:168` | the keys stop only without a modal | ✅ Killed · the other two tests of QST-99 |
| A11 | `tui.ts:168` | the keys stop by the rows of the last drawing, not by the size of now | ✅ Killed · two tests of QST-99, at 119×40 |

F15, `tui/keys.ts` and `tui/ansi.ts` (15):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| B1 | `tui/keys.ts:195` | the mark of the start starts no paste | ✅ Killed · the three tests of the delimited paste, text mode, choice mode and the loop |
| B2 | `tui/keys.ts:195` | the mark of the end does not end the paste | ✅ Killed · four tests, the first `QST-78: between the marks of a delimited paste a line break that comes alone in a read is a space in the text mode, and sends nothing` |
| B3 | `tui/keys.ts:198` | `esc` does not end a paste | ✅ Killed · `QST-78: esc ends a delimited paste whose mark of the end did not come, and enter alone sends again` |
| B4 | `tui/keys.ts:199` | the rule does not read the paste in course | ✅ Killed · the three tests of B1 |
| B5 | `tui/keys.ts:199` | in a delimited paste a break is a space also with no modal open | ❌ Survived · gap 3 |
| B6 | `tui/keys.ts:199` | K4 of round 3 again: with keys held back a break is a space also with no modal open | ❌ Survived · gap 5 |
| B7 | `tui/keys.ts:199` | in a delimited paste a break alone still confirms in the choice mode | ✅ Killed · `QST-78: between the marks of a delimited paste a line break that comes alone in a read confirms no option in the choice mode` and the test of the loop |
| B8 | `tui/keys.ts:199` | in a delimited paste a break alone still sends in the text mode | ✅ Killed · the test of the text mode and the test of the loop |
| B9 | `tui/keys.ts:192` | the paste does not cross reads | ✅ Killed · the three tests of B1 |
| B10 | `tui/ansi.ts:30` | the delimited paste is not asked for | ✅ Killed · `TUI-60, QST-78: entering hides the cursor and turns the delimited paste on, and leaving undoes both` and the test of the loop |
| B11 | `tui/ansi.ts:31` | the delimited paste is not turned off on leaving | ✅ Killed · the same two |
| B12 | `tui/keys.ts:198` | any key but a break ends the paste | ✅ Killed · the test of the text mode and the test of the loop |
| B13 | `tui/keys.ts:195` | a mark of the paste leaves a space in the text | ✅ Killed · three tests, among them `QST-78: the marks of a delimited paste put nothing in the text and change no screen` |
| B14 | `tui/keys.ts:198` | `esc` ends a paste only with the modal open | ❌ Survived · gap 3 |
| B15 | `tui/keys.ts:198` | `esc` ends a paste only with no modal open | ✅ Killed · the test of B3 |

F16, `question.ts` (6):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| C1 | `question.ts:71` | a question of the `result` merged straight into another of them follows it | ✅ Killed · `QST-36: two questions of the worker about the ticket, one merged into the other, close each by its own default in ascending id, whichever was merged` and `QST-36, QST-37: a question of another worker merged into one of the two follows that one, and not the one at the end of the chain` |
| C2 | `question.ts:74` | a question of the `result` merged into another of them through a third follows it | ❌ Survived · gap 1 |
| C3 | `question.ts:78` | no question of the `result` is kept out of the followers | ✅ Killed · the two tests of C1 |
| C4 | `question.ts:387` | the questions of the `result` close in descending id | ✅ Killed · four tests, the first `QST-36: the result of a worker closes its two non-blocking questions of the ticket in ascending id, each by its own default` |
| C5 | `question.ts:63` | a merged question of the `result` does not close by it | ✅ Killed · eight tests, among them `QST-48/45/38: after each step of 200 generated sequences of 40 calls…` |
| C6 | `question.ts:390` | only the first question of the `result` is kept out of the followers | ✅ Killed · the two tests of C1 |

F17, `shared/derive.ts` (4):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| D1 | `shared/derive.ts:358` | a question that left the merge stays in `absorbed` | ✅ Killed · `QST-49: a merged question that closed by an answer of its own leaves the absorbed…`, `QST-70: the route of the modal no longer names a question that left the merge…`, `QST-56, QST-58: a question that left the merge by the result of who asked it is no longer named…` |
| D2 | `shared/derive.ts:358` | `absorbed` keeps only the ones that left | ✅ Killed · 14 tests, the first `QST-49: absorbed has the ids of the questions merged straight into it, in the order they were merged` |
| D3 | `shared/derive.ts:358` | the filter runs after the walk, on the answer a merged one follows | ✅ Killed · `QST-49: a merged question that closed by an answer of its own leaves the absorbed…`, by its last assertion (`test/unit/derive.test.ts:745`) |
| D4 | `shared/derive.ts:358` | `absorbed` is emptied of every merged question | ✅ Killed · 14 tests, the same first as D2 |

F19, `shared/contract.ts`, `shared/derive.ts`, `question.ts` (3):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| E1 | `shared/contract.ts:42` | the constant is 241 | ✅ Killed · 20 tests, the first `QST-04, QST-18: a non-blocking question without timeout_s waits 240 s for the dev` |
| E2 | `shared/derive.ts:330` | the derivation counts 300 s of its own | ✅ Killed · 7 tests, among them the generated sequences of QST-48 |
| E3 | `question.ts:53` | the table counts 300 s of its own | ✅ Killed · 14 tests, the first `QST-04: without timeout_s the deadline is 240000 ms after the event, and timeout_s stays null` |

One fault was thought of and not applied because it is equivalent: without the `continue` at `tui/keys.ts:196` a mark goes to `press`, which has no branch for it in any screen or mode.

**Sensor depth**: P0-full, by hand: no mutation tool is installed for Bun.

### The survivors

- **C2** is the one that matters. The walk of `resolve` has the filter `id NOT IN (own)` twice, in its first step (`question.ts:71`) and in its recursive step (`:74`). Both new tests of QST-36 put the two questions of the worker one merge apart, so only the first is exercised. With the second removed, in the chain of P1 the answer of Q-01 also closes Q-02, which then has no answer of its own and the default of Q-01 in the log. The table and the derivation still agree with each other, so the generated sequences of QST-48 do not see it. It is the fault round 1 found on the line before the change (M10b, lesson L-051), on the new condition.
- **A3**: the loop of the test over `["q", "\x03"]` sends `[quit, "q", "\r"]`. The `q` is there to show that it is not typed into the answer; it also quits when `ctrl+c` did not.
- **A6**, **A8**: every test that quits a small terminal has the modal open and the key alone in its read.
- **B5**, **B14**: every test of the delimited paste opens the modal before the mark of the start. The third branch of the rule of QST-78, no modal open, is never under the new trigger.
- **B6**: K4 of round 3. Then the spec did not say what a line break does with no modal open; now `spec.md:319` does. The follow-up test that report wrote out was not added.

Each of the seven fails an assertion written in the scratch that passes at `89007b8` (see "Fix plans"); the assertions were deleted with the worktree.

## Code quality

Over what the round touched: `tui.ts`, `tui/keys.ts`, `tui/ansi.ts`, `tui/view.ts`, `shared/derive.ts`, `shared/contract.ts`, `question.ts`.

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ F14 is one predicate and one line in `dispatch`; F15 one field of `Ui`, two constants and four lines in `input`; F16 one parameter and two conditions in one query; F17 one line; F19 one export |
| Surgical changes | ✅ `draw` uses the same predicate as `dispatch` (`tui.ts:38`, `:117`, `:168`); nothing else of the loop moved |
| No scope creep | ✅ No setting, no new route, no new event. The delimited paste is used for the rule of QST-78 only, as `spec.md:37` says |
| Matches patterns | ✅ `pasting` is state of the reducer, kept by `sync` and `settle` through the spread (AD-014); `own` goes to `resolve` as an argument |
| Spec-anchored outcome check | ❌ 16 of 23 clauses |
| Per-layer coverage expectation | ❌ The domain rule of QST-36 has no 1:1 case for "por outra mesclada"; the reducer has no case of the delimited paste with no modal |
| Every test maps to a requirement | ✅ The 14 new tests name QST-99, QST-78, QST-36, QST-37, QST-49, QST-56, QST-58, QST-70, QST-04, QST-18 |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/LESSONS.md` | ⚠️ `broker/CLAUDE.md` is up to date with the round. L-010 (each trigger of an AC its own assertion) does not hold for `ctrl+c` in QST-99; L-020 holds for F19 (`toBe(240)`, the literal) |

Smaller notes, none blocking:

- While the terminal is small the read still runs `sync` (`tui.ts:140`): a question that closes meanwhile closes its modal (QST-82), so "the state it had before shrinking" holds for what the keys could have changed, not for what the log changed. That is the right reading and the spec could say it.
- In a small terminal a paste that has a `q` in it quits the TUI (P6). It is what QST-99 says of `q`.
- `key` still has a local `input` (`tui.ts:184`) with the name of the reducer `dispatch` calls (`:170`), as round 3 noted.

## Not exercised

Stated, not assumed:

- **A real interactive terminal.** Every test and probe drives `start(...).key` or `input` with strings.
- **Whether a given terminal sends `ESC [ 200 ~` and `ESC [ 201 ~`** after `CSI ? 2004 h`: Windows Terminal, conhost, or any terminal of Linux or macOS, and whether Bun in raw mode on Windows hands them to `stdin` unchanged. Where they do not arrive, the rule of the chunk is all there is, and a paste delivered in several reads with `\r` alone in one of them sends the answer. `STATE.md:144` says so.
- **Linux and macOS.** The suite ran on Windows only in this round.
- The interactive UAT (step 7) is not this agent's.

The known risks round 3 listed (the bare `setInterval` of `expire`, `tui/demo.ts` without a test, the members of `terminal()` that need a terminal) stand, untouched by this round.

## Fix plans

Five tests and one decision. No code of the round has to change for gaps 1 to 5.

### Fix 1: QST-36 through a third question (gap 1, C2)

- **Root cause**: both new tests merge the two questions of the worker straight into each other.
- **Fix task**: in `test/unit/question-result.test.ts`, worker-1 asks Q-01 and Q-02 about T-1, worker-3 asks Q-03 about T-3; merge Q-02 into Q-03 and Q-03 into Q-01; `delivered("worker-1", "T-1")`. Expect the answers `[7, Q-01, 8080]` and `[8, Q-02, 9090]`, the rows Q-01 `answer_seq` 7, Q-02 `merged_into` 3 and `answer_seq` 8, Q-03 `merged_into` 1 and `answer_seq` 7, and the deliveries 7 to worker-1 and worker-3 and 8 to worker-1.
- **Done when**: it fails with `AND q.id NOT IN (SELECT value FROM json_each(?2))` removed from `question.ts:74`.
- **Priority**: Major.

### Fix 2: `ctrl+c` and `q` in a small terminal (gaps 2 and 4; A3, A6, A8)

- **Root cause**: `test/unit/tui-loop.test.ts:613` presses `q` after the key under test, and no test quits a small terminal without a modal or with the key among others.
- **Fix task**: one test that, for no modal and for the modal in the text mode, and for each of `q`, `\x03` and the chunk `aq`, shrinks the terminal, checks `t.raw` is still `[true]`, gives that one input and nothing after it, and expects `t.raw` `[true, false]` and no `POST`. The line that shows `q` is not typed can stay in its own test.
- **Done when**: it fails with `k === "q"` alone, with `ui.modal !== null &&` and with `every` at `tui.ts:168`.
- **Priority**: Major for `ctrl+c`, Minor for the other two.

### Fix 3: the delimited paste with no modal open (gaps 3 and 5; B5, B14, B6)

- **Root cause**: the rule of QST-78 has three branches and the new trigger was tested on two.
- **Fix task**: in `test/unit/tui-keys.test.ts`, from the tab on Q-08 with no modal: the reads `PASTE`, `"\r"` open its modal; `PASTE`, `"\r"`, `"texto"`, `"\r"`, `PASTED` leave the modal with the text `texto ` and `send` null; `PASTE`, `"\x1b"`, `"4"`, `"j"`, `"\r"`, `"texto"`, `"\r"` send `{ question_id: 8, answer: "texto" }`. In `test/unit/tui-loop.test.ts`, the follow-up of round 3: on the tab with no modal, `key("\r\x1b")` shows the modal of the selected question, posts nothing, and after the wait shows the tab without it.
- **Done when**: the three fail, each under its mutant: `(next.pasting || ((more || keys.length > 1) && next.modal !== null))`, `k === "\x1b" && next.modal !== null`, and `(more || ((next.pasting || keys.length > 1) && next.modal !== null))` at `tui/keys.ts:198`–`:199`.
- **Priority**: Minor: nothing is sent in either reading.

### Fix 4: `\n` with no modal open (gap 6)

- **Root cause**: the sentence `d867b57` added to QST-78 speaks of "a tecla", which the criterion defines as `\r` or `\n`; `press` knows `\r` as `enter` and has no branch for `\n`.
- **Fix task**: a decision of the dev, then one line and one test. Either the spec says that with no modal open `\r` is `enter` and `\n` does nothing, or `input` hands `\r` to `press` in the place of a `\n` whose turn comes with no modal open.
- **Priority**: Cosmetic.

### SP1: the marks of a paste in a small terminal

- One sentence in QST-99 or in QST-78, by the dev. If the marks are to be read at any size, `dispatch` lets them through to `input` before it returns, and a test shrinks the terminal between the two marks.
- **Priority**: Cosmetic.

This is the first verification of the third fix round. The bound of three fix and re-verify iterations counts from here.

## Requirement traceability update

Not applied: this agent does not edit `spec.md`. Proposed:

| Requirement | Current status | Proposed |
| ----------- | -------------- | -------- |
| QST-49 | Implementing | ✅ Verified |
| QST-36 | Implementing | ❌ stays Implementing until Fix 1 |
| QST-99 | Implementing | ❌ stays Implementing until Fix 2 |
| QST-78 | Implementing | ❌ stays Implementing until Fix 3 and the decision of Fix 4 |
| QST-04, QST-18, QST-80, QST-87 | Verified | Verified: F19, F20 and F18 hold |
| the other 91 | Verified | Verified: the gate is green and no expected value of their tests changed, but for the ones judged in "Test integrity" |

## Lessons recorded

Through `scripts/lessons.py add`, nine calls for eight signals. The script answered `UPDATED` for L-051 and L-052 (each still a candidate with one feature, this one) and `ADDED` for L-058 to L-063; it changed `.specs/lessons.json` and `.specs/LESSONS.md`.

| Signal | Lesson | Effect |
| ------ | ------ | ------ |
| C2 `question.ts:74` (QST-36) | Test the filter of a recursive walk on a member reached through another member, not only on one reached directly | L-051 reinforced: the same fault, on the condition this round added |
| A3 `tui.ts:168`, `test/unit/tui-loop.test.ts:613` (QST-99) | In a test that loops over alternative triggers, send after each trigger no other input that alone produces the asserted outcome | New, L-058 |
| A6 `tui.ts:168` (QST-99) | When an AC says a rule holds with or without a state, assert it in both | New, L-059 |
| A8 `tui.ts:168` (QST-99) | Test a key rule of an input loop with the key inside a chunk of several keys, not only alone in its read | New, L-060 |
| B5, B14 `tui/keys.ts:198`–`:199` (QST-78) | When a rule gains a new trigger, test every branch of the rule under the new trigger, not only the branches the change was made for | New, L-061 |
| B6 `tui/keys.ts:199` (QST-78) | Test a condition with a fixture where it differs from the conditions that coincide with it in every other fixture | L-052 reinforced, as round 3 attributed K4 |
| Gap 6, QST-78 `tui/keys.ts:132` | When an AC names several inputs for one rule, assert the rule with each input in every state the AC gives | New, L-062 |
| SP1, QST-78 with QST-99 `tui.ts:168` | When an AC makes a state ignore input, state what happens to an input sequence that starts in one state and ends in the other | New, L-063 |

No lesson was penalized. L-010 is confirmed and A3 is near it, but the trigger did have its assertion: what failed is that the assertion could not tell the trigger from the key after it, which is L-058.

## Summary

**Overall**: ❌ Not ready. The code holds in every probe; the tests of three requirements leave clauses of the spec free to break.

**Spec-anchored check**: 16 of 23 clauses match what the spec defines; QST-49 whole, QST-36, QST-78 and QST-99 in part; 1 spec-precision gap (SP1).
**Sensor**: 32 of 39 mutants killed; 7 survive, all inside the spec: A3, A6, A8 (QST-99), B5, B6, B14 (QST-78), C2 (QST-36).
**Gate**: `tsc` exit 0; 1284 pass, 3 skip, 0 fail.

**What works**: a small terminal takes no key but `q` and `ctrl+c`, at 119×40, 120×39 and 100×30, and the modal comes back with its text; a line break alone in a read between the marks of a paste sends nothing in the text mode and in the choice mode, and `enter` sends again after the end mark or an `esc`; two questions of a worker merged into each other close each by its own default in both directions, also through a third question and in a chain of three (probes); a question that left the merge is no longer named by the one it followed, in the list, the detail and the modal; one `TIMEOUT_S`; the integration test waits for a read.

**Issues found**: the six ranked gaps and SP1, above.

**Next steps**: Fix 1 to Fix 3 are tests only, and each was tried in the scratch against its mutant; Fix 4 and SP1 wait for a word of the dev. Then verify again over the new commits.

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
