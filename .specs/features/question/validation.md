# Question Validation

**Result**: PASS

**Round**: 3
**Date**: 2026-10-10
**Verifier**: independent sub-agent (author ≠ verifier). It did not write the code, the tests, either fix round or either earlier report. It wrote this file and, through `scripts/lessons.py`, the two lessons files. No code, no test, no spec, no task, no commit.
**Spec**: `.specs/features/question/spec.md`, 98 requirements `QST-01` to `QST-98`, with QST-58 as reworded in `e4ed6c7` ("quando a pergunta tem opções ou é bloqueante, senão").
**Diff range**: `9a4d921..2ac91fe` on `feat/question` (61 commits, 81 files, +10281 −282). The second fix round is `7268928..2ac91fe` (3 commits: `e4ed6c7` in `.specs/` only, `272154f` F12, `2ac91fe` F13).
**Environment**: Windows 11, Bun 1.4.2, installed TypeScript 5.9.3, Python 3.12.9. Linux did not run here.

All code and test citations below are relative to `broker/`.

The two ranked gaps of round 2 are closed, and so are its two spec-precision gaps. Q16 and Q17 were applied again and each one fails a test. The gate is green with 1270 tests. The second fix round only added tests. 98 of 98 criteria have an assertion at `2ac91fe` that targets what the spec defines. No chunk of input given to `start(...).key` makes the TUI send an answer but `\r` alone: 32 chunks were tried.

Two of the 38 mutants survive, and neither is a hole in what the spec defines:

1. **T11**, the columns and the rows of the real terminal swapped in `terminal()` (`tui.ts:214`). Outside this feature: the line is the one `main` has at `tui.ts:185`, and its criterion is TUI-54 of the TUI leitura.
2. **K4**, new in this round, on the code F12 changed (`tui/keys.ts:187`): with the mutant, a line break followed by an unfinished escape in one chunk is a space also when no modal is open. Nothing is sent either way; what changes is whether `enter` then `esc`, read as one chunk on the tab, opens the modal for 40 ms or leaves the tab. QST-78 says what a line break of a chunk does with the modal in each of its two modes and not with no modal open, and the Assumptions row reads the other way from the code. It is the one remaining spec-precision gap, P3, with a follow-up of one sentence and one test that does not block.

## How each round-2 item ended

| Round-2 item | What closed it | Checked in this round | Ended |
| ------------ | -------------- | --------------------- | ----- |
| Gap 1. QST-78 at the entry of the loop: `"\r\x1b"` and `"\r\x1b["` sent the answer | F12, `272154f`: `key` tells `dispatch` that it held keys back (`tui.ts:184`), and `input` takes that as a chunk of more than one key (`tui/keys.ts:187`). Tests at `test/unit/tui-loop.test.ts:430`–`:470` | The four inputs of round 2 given again to `start(...).key`: nothing posted in the text mode and in the choice mode, and `key("\r")` alone posts. Ten mutants on the two lines killed (L1 to L7, K1 to K3, K5, K6) | Closed |
| Gap 2. QST-56: a non-blocking question with options drawn by no test | F13, `2ac91fe`: `test/unit/tui-questions.test.ts:105`–`:112` | Q16 applied again: killed by that test | Closed |
| Q16 `tui/screens/questions.ts:118` | the same test | `if (q.blocking)` in the scratch: 1 fail, `QST-56: a non-blocking question with options shows them and the number of the free text, and no line of its default` | Killed |
| Q17 `tui/screens/questions.ts:147` | F13: `test/unit/tui-questions.test.ts:280`–`:301` | `q.blocking` alone in the scratch: 1 fail, `QST-58: the detail of a non-blocking question with options has them numbered and the other answer, and no line of its default` | Killed |
| T11 `tui.ts:214` (was `:212`) | nothing, by decision | Applied again: survives the whole suite, 1270 pass | Survives, outside this feature. Agreed, see "The survivors" |
| P1. QST-58 said "or" and not when | `e4ed6c7`: `spec.md:286` now says "quando a pergunta tem opções ou é bloqueante, senão", as QST-56 | The sentence read in the spec; its assertion is `test/unit/tui-questions.test.ts:285`–`:300` | Closed |
| P2. QST-78: which block of input the rule counts | F12 settled it in the code: the block is what the terminal delivered, with what was held back before it. The spec did not have to change: that is its plain reading | `test/unit/tui-loop.test.ts:438`, `:459` fail on the code of `7268928` (mutant L1) | Closed |

## QST-78: one chunk and the answer it may send

The question asked of this round: is there a path left by which one chunk of input makes the TUI `POST` an answer?

**By the code, one, the intended one.** `Ui.send` is set in one place, `send` inside `answering` (`tui/keys.ts:55`), on the key `\r` (`:64` an option, `:70` a text), and `answering` runs only with a modal open (`:87`). `input` hands `\r` to `press` unchanged only when the chunk has one key and the loop held nothing back (`:187`), or when no modal is open at the turn of that key, where `\r` opens a modal and sends nothing. `key` (`tui.ts:175`–`:190`) dispatches `complete` with `more` true exactly when a tail was held back (`:184`); a tail held back by an earlier read is joined to the next chunk (`:178`), so it is a key of that chunk; the tail dispatched alone after 40 ms (`:188`) is `\x1b` and what follows it, never a line break. `\n` alone sends nothing: no branch of `answering` takes it. So a chunk sends if and only if it is exactly `\r`, nothing is pending, and the modal is open with a text or on an option.

**By probe, the same.** 32 chunks through `start(...).key`, over a fake broker that counts each `POST`, in the scratch worktree:

| State before | Chunk or chunks given to `key` | `POST /answer` |
| ------------ | ------------------------------ | -------------- |
| Modal of Q-08, text mode, `logo` typed | `"\r\x1b"` · `"\r\x1b["` · `"\r\x1b[1;"` · `"\n\x1b"` | none |
| the same | `"\r"` | `{ question_id: 8, answer: "logo" }` |
| the same | `"\n"` · `"\r\n"` · `"\r\r"` · `"x\r\x1b"` · `"\r\x1b[A"` · `"\r\x1b\x1b"` · `"\x1b\r"` · `"\x1b\r\r"` · `""` | none |
| the same | `"\r"` and a NUL · `"\r"` and a lone surrogate · `"\r"` and a zero width joiner | none |
| the same | two reads: `"\x1b"` then `"\r"` · `"\x1b["` then `"A\r"` · `"\x1b["` then `"\r"` · `"x\x1b"` then `"\r"` | none |
| Modal of Q-07, choice mode, first option | `"\r\x1b"` · `"\r\x1b["` · `"2\r"` · `" \r"` · `"\x1b\r\r"` · `"3\rtexto\r"` · `"\r\x1b[A"` | none |
| the same | `"\r"` | `{ question_id: 7, answer: "infinito com backoff" }` |
| The tab, no modal | `"\r\r"` · `"\r\x1b"` | none |
| The main screen | `"4\r\r\x1b"` | none |

What F12 costs, and it is the right side to fail on: `enter` and `esc` (or the start of an arrow) that arrive in one read with the modal open are a paste. In the text mode the break is a space and the escape then closes the modal with its text; in the choice mode the break does nothing. The dev pressed `enter` and nothing was sent. Round 2 said it and the fix chose it: a paste must not send.

Outside the spec, and not counted: a paste that the terminal delivers in more than one read, with `\r` alone in one of them, is a chunk of one key by the definition the spec chose. Bracketed paste is in Out of Scope.

## Task completion

T1 to T38 are ticked in `tasks.md` (194 Done-when boxes, none open), F1 to F11 in `fix-round-1.md` (32, none open) and F12 and F13 in `fix-round-2.md` (7, none open). Each task of the second fix round has its commit: `272154f` F12 (`tui.ts`, `tui/keys.ts`, `test/unit/tui-loop.test.ts`), `2ac91fe` F13 (`test/unit/tui-questions.test.ts`). No `SPEC_DEVIATION` marker is in the diff of the feature: the one in the code, `tui/activity.ts:145`, is of the TUI leitura.

## Gate check

- **Command**, from `broker/`: `bun node_modules/typescript/bin/tsc --noEmit && bun test`
- **Outcome**: `tsc` exit 0. **1270 pass, 3 skip, 0 fail**, 53955 `expect()` calls, 1273 tests in 63 files, 69.6 s. One run, no re-run needed; `EVT-43` did not flake.
- **Before the feature**: 926 pass, 3 skip. **Round 1**: 1248 pass. **Round 2**: 1266 pass. **Delta**: +4 tests in the second fix round, +344 in the feature. No count went down.
- **Skipped**, the same three as before the feature, all platform conditions: `test/integration/cli.test.ts:65`, `test/integration/cli.test.ts:100`, `test/unit/presence.test.ts:6`.
- The whole suite also ran twice more in the scratch worktree, once under each surviving mutant, with the same 1270 pass.

## Spec-anchored acceptance criteria

Every cited line was opened at `2ac91fe` and its assertion read. The two files the second fix round changed, `test/unit/tui-loop.test.ts` and `test/unit/tui-questions.test.ts`, were read whole and every citation into them is located again: the lines moved by +42 after `:429` in the first and by +2, +11 and +34 in the second. `test/unit/tui-keys.test.ts` did not change.

Derived again from scratch in this round, from the text of the spec, the code and the whole body of each test, are the rows marked †: QST-56, QST-58 and QST-78; every criterion with evidence in the two changed files (QST-55, 57, 60, 62, 63, 64, 68, 76, 77, 79, 80, 81, 82, 83, 84, 86, 96, 97, 98); and 33 more across all the stories, none of them among the ones round 2 says it derived again: QST-02, 03, 06, 07, 08 · 14, 15, 17, 19 · 21, 23 · 25, 27, 28 · 30, 32 · 35, 39, 40, 41 · 44, 47, 49, 50 · 52 · 66 · 72, 74, 85 · 91 · 93, 94, 95.

A whole-object `toEqual` is what covers a criterion that lists the fields of an event, a row or a delivery: `storedQuestion`, `storedAnswer`, `storedMerged`, `storedDefault` and `questionRow` give every column, and `refusedWith` (`test/unit/helpers.ts:221`) compares the whole `refused` event and the deliveries.

Outcome: ✅ the assertion pins what the spec defines · ⚠️ the spec leaves an outcome open (see "Spec-precision gaps").

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| QST-01 `/ask` writes the row and answers | row of 12 columns, `id` = max+1, `{ ok, question_id, seq }` | `test/unit/question-ask.test.ts:23` `expect(b.question.ask(WORKER_1, ASKED)).toEqual({ ok: true, question_id: 1, seq: 2 })` · `:24` `expect(b.questionRows()).toEqual([questionRow(1, id)])` · `:32` as sent · `:56` id 8 after a hand-made gap at 7 | ✅ |
| QST-02 † the `question` event | from, role, to, summary, body `""`, ticket, column, `data` with only the fields of the kind | `test/unit/question-ask.test.ts:82` `expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id, { ts: NOW + 300 })])` with ten foreign keys in the body · `:99` every optional field | ✅ |
| QST-03 † delivery to a peer, none to `human` | one pending row / none | `test/unit/question-ask.test.ts:124` `expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: 2, recipient: "leader", acked_at: null }])` · `:139` `toEqual(toOthers(1))` · `test/unit/log.test.ts:699`, `:718` | ✅ |
| QST-04 `deadline_ts` of `/ask` | `ts` + `timeout_s`×1000, or + 240000; else null | `test/unit/question-ask.test.ts:148`–`:157` `deadline_ts: NOW + 500 + 30000` · `:165`–`:173` `NOW + 500 + 240000` · `:184` `expect(b.questionRows()[0]!.deadline_ts).toBe(b.events()[1]!.ts + 240000)` · `:193` | ✅ |
| QST-05 `missing_field` | each wrong type, empty text, a default that is not a non-empty text, non-blocking without default | `test/unit/question-ask.test.ts:205`–`:211`, `:218`–`:220`, `:227`–`:235`, `:241`–`:242` `refusedAsk(b, WORKER_1, …, "missing_field")` · `:249` `refusedAsk(b, WORKER_1, { ...ASKED, default: "" }, "missing_field")` on a blocking question, `:250`, and `:251`–`:252` a non-empty one kept | ✅ |
| QST-06 † `invalid_field` | summary 81, empty options, empty option, `timeout_s` < 1 or blocking | `test/unit/question-ask.test.ts:258` (81 refused), `:259` (80 stored), `:266`–`:268`, `:275`–`:278`, `:279` (1 accepted) | ✅ |
| QST-07 † `too_many_options` | 4 refused, 3 accepted | `test/unit/question-ask.test.ts:286` `refusedAsk(…, { ...ASKED, options: ["a", "b", "c", "d"] }, "too_many_options")` · `:287` | ✅ |
| QST-08 † recipient, edge, feature | `unknown_recipient`, `edge_not_allowed`, `no_open_feature` | `test/unit/question-ask.test.ts:300` · `:321` every pair of 4 senders × 7 recipients, `:329` `expect(passed.sort()).toEqual([...allowed].sort())` · `:334`, `:337` | ✅ |
| QST-09 `refused` of the four routes | `peer`, `attempted_kind` `question`/`question`/`question_merged`/`answer`, `error`; nothing else | `test/unit/question-ask.test.ts:343`–`:361` whole event · `test/unit/question-escalate.test.ts:50` · `test/unit/question-merge.test.ts:68` · `test/unit/question-answer.test.ts:39` · `test/integration/question.test.ts:205`–`:209`, `:252`–`:254` | ✅ |
| QST-10 order of the refusals of `/ask` | `unknown_peer`, `missing_field`, `invalid_field`, `too_many_options`, `unknown_recipient`, `edge_not_allowed`, `no_open_feature` | `test/unit/question-ask.test.ts:369`, `:374`–`:375`, `:380`, `:385`, `:390` · `test/integration/question.test.ts:184` `expectRefusal(await post(b.url, path, { id: "not-an-id" }), "unknown_peer")`, `:190` the same body with a registered id is `missing_field` | ✅ |
| QST-11 `/send` points to the routes | `invalid_kind`, hint names `/ask`, `/answer`, `/merge-question` | `test/unit/send.test.ts:179`–`:180` `expect(answer.hint).toContain(route)` · `:182` not the other two | ✅ |
| QST-12 all or nothing | no row, no event, no delivery, on each route | `test/unit/question-ask.test.ts:398`–`:401` (three tables) · `test/unit/question-escalate.test.ts:301`–`:304` · `test/unit/question-answer.test.ts:204`–`:207` · `test/unit/question-merge.test.ts:154` `expect(() => b.question.merge(MOTHER, { question_id: 2, into: 1 })).toThrow("the disk is full")`, `:155`–`:157` · `test/integration/question.test.ts:266`–`:269` (500) | ✅ |
| QST-13 `/escalate` | same id, level above, fields of the first question, holder moved | `test/unit/question-escalate.test.ts:57` · `:63`–`:68` `expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id, CARRIED), storedQuestion(3, id, { ...CARRIED, ...FROM_LEADER }), storedQuestion(4, id, { ...CARRIED, ...FROM_MOTHER, ts: NOW + 4000 })])` · `:96`–`:97` body ignored | ✅ |
| QST-14 † summary and body of an escalation | of the latest question, or the ones sent | `test/unit/question-escalate.test.ts:132`, `:148`, `:162` | ✅ |
| QST-15 † refusals of `/escalate` | `missing_field`, `invalid_field` | `test/unit/question-escalate.test.ts:170`–`:172`, `:178`–`:179`, `:184`–`:185`, `:191` | ✅ |
| QST-16 `question_closed`, `not_holder`, order | `unknown_peer`, `missing_field`, `invalid_field`, `question_closed`, `not_holder` | `test/unit/question-escalate.test.ts:198` (four statuses), `:204`–`:210`, `:215`–`:216`, `:222`, `:228` · `test/integration/question.test.ts:184`–`:185` | ✅ |
| QST-17 † destination of an escalation | `human` with no delivery; `leader`, `mother` with one | `test/unit/question-escalate.test.ts:243`–`:248` · `:256`–`:258` | ✅ |
| QST-18 deadline when it reaches the dev | `ts` + `timeout_s`×1000 or + 240000; null if blocking | `test/unit/question-escalate.test.ts:69`–`:78` `deadline_ts: NOW + 4000 + 90000` · `:267`–`:269` `NOW + 6000 + 240000` · `:279` · `:286` | ✅ |
| QST-19 † no deadline with an agent | null, not closed | `test/unit/question-escalate.test.ts:291`, `:293` · `test/unit/question-expire.test.ts:130`–`:135` a day later | ✅ |
| QST-20 `/answer` of the holder | whole `answer` event, row `answered`, `answer_seq` | `test/unit/question-answer.test.ts:57`–`:59` · `:69`–`:74` summary of 80 by the literal · `:80` as it came · `:109`–`:111` to who asked · `test/unit/contract.test.ts:83`–`:85` `qid` | ✅ |
| QST-21 † refusals of `/answer` | `missing_field`, `invalid_field` | `test/unit/question-answer.test.ts:126`–`:128`, `:134`–`:136`, `:142` | ✅ |
| QST-22 order of the refusals of `/answer` | `unknown_peer` or `invalid_token`, `missing_field`, `invalid_field`, `question_closed`, `not_holder` | `test/unit/question-answer.test.ts:149`, `:156`, `:160`, `:165`, `:170`–`:172`, `:178` · `test/unit/question-human.test.ts:155`, `:163` · `test/unit/question-merge.test.ts:284` · `test/integration/question.test.ts:136`, `:140`, `:184`–`:185` | ✅ |
| QST-23 † deliveries of an answer | `asked_by` and each merged one, once, never the author | `test/unit/question-answer.test.ts:184`–`:188` · `test/unit/question-merge.test.ts:192` `expect(waiting(b, 5)).toEqual(["worker-1", "worker-2"])` | ✅ |
| QST-24 the dev answers | `human`, `human`, `resolved_by` `human`, row `answered` | `test/unit/question-human.test.ts:69`–`:73` · `test/integration/question.test.ts:89`–`:124` with the credential of the file | ✅ |
| QST-25 † deliveries of the answer of the dev | `asked_by`, merged ones, `mother`, once each | `test/unit/question-human.test.ts:80`–`:84` · `:92`–`:94` · `test/unit/question-merge.test.ts:212` | ✅ |
| QST-26 `invalid_token` first | before any rule, with a registered `id` in the body | `test/unit/question-human.test.ts:100`, `:111`–`:117` · `test/integration/question.test.ts:140`, `:142` | ✅ |
| QST-27 † the dev is not the holder | `not_holder` | `test/unit/question-human.test.ts:124`, `:126` · `test/integration/question.test.ts:144` | ✅ |
| QST-28 † no trace of a refusal to the dev; `unknown_peer` | no event; `unknown_peer` | `test/unit/question-human.test.ts:51`–`:53` (`refusedDev`), `:134`–`:149` · `test/integration/question.test.ts:136`, `:145`, `:169`–`:172` | ✅ |
| QST-29 refusals of `/merge-question` and order | `unknown_peer`, `edge_not_allowed`, `missing_field`, `invalid_field`, `question_closed`, `merge_not_allowed` | `test/unit/question-merge.test.ts:74`, `:79`–`:83`, `:89`–`:92`, `:99`–`:100`, `:106`–`:107`, `:112`, `:117`–`:118`, `:124`–`:125`, `:131` · `test/integration/question.test.ts:184`–`:185`, `:202` | ✅ |
| QST-30 † `/merge-question` | whole `question_merged`, row `merged`, no delivery | `test/unit/question-merge.test.ts:139`–`:145` · `:164`–`:176` · `test/integration/question.test.ts:204`–`:213` | ✅ |
| QST-31 the merged ones close with the destination | same status, same `answer_seq`, one transaction | `test/unit/question-merge.test.ts:185`–`:192`, `:200`–`:212`, `:224`–`:227`, `:240`–`:246` · `test/unit/question-expire.test.ts:247`–`:271` | ✅ |
| QST-32 † a merged one has no deadline of its own | nothing written | `test/unit/question-expire.test.ts:148`–`:162` | ✅ |
| QST-33 the deadline | whole `answer` of `broker`, `timeout_default`, row `defaulted`, deliveries | `test/unit/question-expire.test.ts:51` `expect(b.question.expire()).toEqual([])` 1 ms before · `:57`–`:58` · `:59`–`:69` · `:71` | ✅ |
| QST-34 when the deadlines are checked | at startup before serving, then every 1000 ms, the default of `SQUAD_EXPIRE_INTERVAL_MS` | `test/unit/config.test.ts:45` `expect(expireIntervalMs({})).toBe(1000)` · `test/integration/question.test.ts:278` within 3 s, `:296` `expect(answer!.ts).toBeGreaterThanOrEqual(asked!.ts + 1000)` · `:306`–`:314` with 60000 the question is still open 1500 ms past its deadline · `:334`–`:338` first reading after a restart | ✅ |
| QST-35 † restart | overdue closes at startup; the stored deadline of the other holds | `test/unit/question-expire.test.ts:207`–`:220`, `:224`–`:227` · `test/integration/question.test.ts:334`–`:341` | ✅ |
| QST-36 default by the `result` | after the `result` and the `unblocked`, ascending id, one transaction | `test/unit/send-result.test.ts:282`–`:287` `[[6, "result", …], [7, "unblocked", …], [8, "answer", …]]`, `:288`–`:303`, `:318`–`:322`, `:370`–`:374` · `test/unit/question-result.test.ts:42`–`:61` · `test/integration/question.test.ts:227`, `:243`–`:248`, `:251` through the real broker | ✅ |
| QST-37 the `result` closes a merged question | it and its merged ones; the destination unchanged and not followed again | `test/unit/question-result.test.ts:97`, `:111`–`:116`, `:119`–`:121` · `:135`, `:137`–`:155` two merges away · `test/unit/question-merge.test.ts:240`–`:246` · `test/unit/question-replay.test.ts:338` `expect(seen.closedAlone.size).toBeGreaterThan(0)` | ✅ |
| QST-38 one answer per question | status read and written in one transaction; `question_closed` after | `test/unit/question-answer.test.ts:193`–`:196` · `test/unit/question-human.test.ts:168`–`:170` · `test/unit/question-result.test.ts:196`–`:197` · `test/unit/question-replay.test.ts:302` | ✅ |
| QST-39 † what the `result` does not close | blocking, other ticket, no ticket, other worker, leader → mother | `test/unit/question-result.test.ts:176`–`:178`, `:183`–`:186` · `test/unit/send-result.test.ts:331`–`:338`, `:345`–`:350` | ✅ |
| QST-40 † a blocking question has no deadline | open a day later | `test/unit/question-expire.test.ts:117`–`:119` | ✅ |
| QST-41 † deadline and answer at once | exactly one `answer`, the first | `test/unit/question-expire.test.ts:168`–`:175`, `:181`–`:194` | ✅ |
| QST-42 the table | twelve columns; old rows and events kept | `test/unit/db.test.ts:263` `expect(info.map((c) => c.name)).toEqual(QUESTION_COLUMNS)` · `:284`–`:285` | ✅ |
| QST-43 the feature closes its questions | `defaulted` or `discarded`, `answer_seq` null, no `answer` | `test/unit/question-close.test.ts:57`–`:66` whole rows of seven questions · `:68`–`:70` · `:134`–`:149` · `:159`–`:163` | ✅ |
| QST-44 † closed by the feature | `question_closed` on the three routes; no default by deadline | `test/unit/question-close.test.ts:80`–`:85`, `:94`–`:97`, `:116`–`:118` | ✅ |
| QST-45 no row is deleted | never | `test/unit/question-replay.test.ts:296`–`:297` after each of 8000 steps; `git grep` finds one `DELETE FROM` in the code, on `peers` (`peers.ts:99`) | ✅ |
| QST-46 status of a derived question | first rule that holds, of six | `test/unit/derive.test.ts:453`, `:467`, `:482`, `:486`, `:503`, `:513`, `:520`, `:533`, `:557`, `:559`, `:581`–`:582` | ✅ |
| QST-47 † `open` | false unless the status is `open` | `test/unit/derive.test.ts:596`, `:603` | ✅ |
| QST-48 parity of the table and the log | ten fields, per feature, no question on one side only | `test/unit/question-replay.test.ts:290` `expect(derived.sort((x, y) => x.id - y.id)).toEqual(stored)` · `:293` · `:331`–`:338` what the sequences reached | ✅ |
| QST-49 † what a derived question carries | text, why, options, default, timeout_s, arrival, answer, merge, absorbed | `test/unit/derive.test.ts:619`, `:632`–`:633`, `:646`, `:653`, `:657`, `:673`, `:683`, `:693`, `:709` | ✅ |
| QST-50 † `/history` by `question_id` | every `question`, `answer`, `question_merged`, by `seq` | `test/unit/log.test.ts:657`, `:665`, `:670`, `:674` · `test/integration/routes.test.ts:416`–`:420` (the route, since the Event slice) | ✅ |
| QST-51 `owed` | `{ owes: "answer", question_id, seq }` of the latest question, in order | `test/unit/state.test.ts:263`, `:277`, `:307`–`:309` · `test/unit/derive.test.ts:724`, `:731`, `:747` | ✅ |
| QST-52 † tools by role | `ask` for four; `answer`, `escalate` for three; `merge_question` for the mother | `test/unit/tools.test.ts:15`, `:47`, `:51`, `:55`, `:59`–`:64` · `test/integration/server-tools.test.ts:57`, `:61` | ✅ |
| QST-53 a tool calls its route | id of the session; `question_id` and `seq`, or `error` and `hint` | `test/integration/server-question.test.ts:71`–`:73`, `:103`, `:113`–`:116`, `:135`–`:144`, `:146`–`:153` · `test/unit/tools.test.ts:70`–`:99` | ✅ |
| QST-54 the push | summary, body, fields; `kind`, `seq`, `from` in `meta` | `test/integration/server-question.test.ts:90` `expect(question.meta).toEqual({ kind: "question", seq: "5", from: "worker-1" })`, `:91`–`:100`, `:105`–`:110` | ✅ |
| QST-55 † the list and its order | title, seal, blocking first by arrival, then by deadline; line 24 | `test/unit/tui-asked.test.ts:53` `expect(ids(waiting(derived(b)))).toEqual([early, late, fast, slow])`, `:69` · `test/unit/tui-questions.test.ts:57` the 24 lines of the list of frame 04, `:93` no seal, `:134` | ✅ |
| QST-56 † a question in the list | head with the mark only with the focus on the list, two lines of 54, options at 47 when it has options or blocks, else default, route, absorbed, empty line | `test/unit/tui-questions.test.ts:57`, `:65`, `:69`, `:77`–`:83` no mark with the focus on the history, `:87`, `:101`–`:102` `"  opções 1 texto"` for a blocking one without options, `:109`–`:110` `expect([row(drawn, 4), row(drawn, 5), row(drawn, 6), row(drawn, 7)]).toEqual(["  which port?", "  opções 1 8080 · 2 9090 · 3 texto", "  rota w2 → ldr → mot → dev", ""])` for a non-blocking one with options, `:111` no line with `default`, `:119`, `:155`–`:160` | ✅ |
| QST-57 † the empty list | the four texts and `perguntas abertas · 0` | `test/unit/tui-questions.test.ts:130`–`:134`, `:306`–`:309` | ✅ |
| QST-58 † the detail | title and the lines in order; options when it has options or blocks, else the default | `test/unit/tui-questions.test.ts:203` the 24 lines of the detail of frame 04, `:213`–`:230` `"default  logo da 89  · aplicado em 3:08 sem resposta"`, `:238`–`:255`, `:269`–`:277`, `:285`–`:299` `" 1  8080"`, `" 2  9090"`, `" 3  outra resposta (texto livre)"` for a non-blocking one with options, `:300` no line that starts with `default` · `test/unit/tui-frames.test.ts:124`–`:125` | ✅ |
| QST-59 the effect | the three texts of a blocking one, the one of a non-blocking one | `test/unit/tui-asked.test.ts:108`–`:110`, `:121`–`:122` | ✅ |
| QST-60 † the history | count, order, two lines, text at 66 | `test/unit/tui-asked.test.ts:93` · `test/unit/tui-questions.test.ts:367`–`:368`, `:373`–`:374`, `:389`–`:397`, `:405` | ✅ |
| QST-61 the outcome line | the five texts; merged before and after | `test/unit/tui-asked.test.ts:133`–`:134`, `:146`–`:147`, `:157`, `:161`, `:172` | ✅ |
| QST-62 † five, or four and the count below | all up to 5; 4 and `+<n> mais antigas · h e j/k para rolar`; empty with none below | `test/unit/tui-questions.test.ts:367`–`:368` five shown, `:374` `"+2" + MORE`, `:378` `"+1" + MORE`, `:380`–`:382` `[...Q10, ...Q05, ...Q06, ...Q04, "", ""]` | ✅ |
| QST-63 † focus and movement | `h`; white and gray borders; history by one, never fewer than 4; selection by one | `test/unit/tui-keys.test.ts:142`–`:146`, `:152`–`:165`, `:171`–`:187`, `:639`–`:641` · `test/unit/tui-questions.test.ts:419`–`:420` | ✅ |
| QST-64 † `4` and `esc` | the tab, its footer, back to the main one | `test/unit/tui-keys.test.ts:134`, `:137` · `test/unit/tui-questions.test.ts:140`–`:145` | ✅ |
| QST-65 `b` | first blocking, focus on the list; next and around, focus to the list; `nenhuma bloqueante` for 4 s | `test/unit/tui-keys.test.ts:253`, `:259`–`:268`, `:273` `expect(key("b", v)).toEqual({ ...v.ui, question: 20, qfocus: "list" })`, `:276`, `:284` `until: v.squad.now + 4000`, `:289` | ✅ |
| QST-66 † `enter` on the feed | the tab, the question, the modal; any other line, the thread | `test/unit/tui-keys.test.ts:197`, `:202` · `:76`, `:79`, `:81` | ✅ |
| QST-67 `enter` on the tab | the modal of the selected one; from the history the same modal and the focus to the list; nothing on an empty list | `test/unit/tui-keys.test.ts:208`–`:216` · `:221` `expect(key("\r", second)).toEqual({ ...second.ui, qfocus: "list", modal: opened(8, null) })`, `:224`, `:226` | ✅ |
| QST-68 † the selection follows the question | by id; the first when it left | `test/unit/tui-keys.test.ts:619`, `:622`, `:630`, `:633` · `test/unit/tui-loop.test.ts:505` | ✅ |
| QST-69 frame 04 | the 40 lines, but for D1 and D2 | `test/unit/tui-frames.test.ts:40` `expect(drawn.map((line, y) => \`${y} ${line}\`)).toEqual(expected(id).lines.map(…))`, `:89`–`:94` | ✅ |
| QST-70 the modal | over the gray tab, title, lines in order | `test/unit/tui-answer.test.ts:76`–`:77`, `:116`–`:133`, `:152`–`:160`, `:171`–`:177` | ✅ |
| QST-71 the mode it opens in | choice with `outra resposta…` and its footer; text without options | `test/unit/tui-answer.test.ts:78`, `:107`, `:140`–`:144`, `:287`–`:288` · `test/unit/tui-keys.test.ts:197`, `:202` | ✅ |
| QST-72 † keys of the choice mode | digit, `j`/`k`/arrows, `enter` | `test/unit/tui-keys.test.ts:328`–`:333`, `:338`–`:345`, `:350`–`:356`, `:361` | ✅ |
| QST-73 the text mode | default line of a non-blocking one, field of 3 or 8, count, warning, footer | `test/unit/tui-answer.test.ts:199`–`:211`, `:220`–`:241`, `:246`–`:247`, `:272`–`:280` · `:431` a blocking question asked with a default has no line of default | ✅ |
| QST-74 † keys of the text mode | character, backspace, `ctrl+u`, `ctrl+e`; `q` and the others are text | `test/unit/tui-keys.test.ts:367`, `:371`, `:376`–`:383`, `:388` | ✅ |
| QST-75 a text that does not fit | `…` and the end; the last 6 lines | `test/unit/tui-answer.test.ts:253`, `:256`–`:257`, `:263`–`:266` | ✅ |
| QST-76 † `enter` sends | `POST /answer` `{ human_token, question_id, answer }` trimmed; nothing if blank | `test/unit/tui-keys.test.ts:393`, `:396`, `:402` · `test/unit/tui-writer.test.ts:25` · `test/unit/tui-loop.test.ts:326` · `test/integration/tui.test.ts:232` | ✅ |
| QST-77 † accepted | modal closed, `✓ Q-NN respondida`, green, 4 s | `test/unit/tui-keys.test.ts:515` · `test/unit/tui-writer.test.ts:32` · `test/unit/tui-loop.test.ts:337`–`:338` | ✅ |
| QST-78 † a pasted line break | a space in the text mode, also when a key of the chunk opened it; ignored in the choice mode; a pasted chunk never sends | `test/unit/tui-keys.test.ts:441`–`:442`, `:445` one key alone sends, `:462`–`:463`, `:469`, `:471`, `:474`, `:480` `expect(chunk("\rtexto\r", tab)).toEqual({ ...tab.ui, modal: opened(7, 0) })`, `:483`, `:486`–`:488`, `:491`, `:493` · `test/unit/tui-loop.test.ts:394`–`:397`, `:410`–`:411`, `:423`–`:424` · at the entry of the loop, for `"\r\x1b"` and `"\r\x1b["`: `:438` `expect(t.posts).toEqual([])` and `:439` the field with `logo ` in the text mode, `:441`, `:444` enter alone still posts; `:459`–`:460` no option confirmed in the choice mode, `:462`, `:465` | ✅ ⚠️ P3 |
| QST-79 † one send at a time | no other `POST`, no key changes the modal | `test/unit/tui-keys.test.ts:409`–`:410` · `test/unit/tui-loop.test.ts:333`–`:334` | ✅ |
| QST-80 † the refused modal | text sent, red border, the two lines of the default for a non-blocking one, `esc fechar`, only `esc` | `test/unit/tui-answer.test.ts:367`–`:381`, `:390`–`:391`, `:399`–`:410`, `:433`–`:439` a blocking question with a default names only the question, `:446`–`:454` · `test/unit/tui-keys.test.ts:430`–`:431`, `:521`–`:532` · `test/unit/tui-loop.test.ts:484`–`:489` | ✅ |
| QST-81 † any other failure | modal kept, `✗ resposta não enviada · <erro>`, red, 4 s; 2000 ms | `test/unit/tui-keys.test.ts:538` · `test/unit/tui-writer.test.ts:38`, `:57`, `:96`–`:101` (1999 ms no, 2000 ms yes) · `test/unit/tui-loop.test.ts:479`–`:480` | ✅ |
| QST-82 † a read closes the modal | `⟳ default aplicado` yellow, or `Q-NN fechada`; waits a send, also with the question gone; gone closes even refused | `test/unit/tui-keys.test.ts:557`, `:560`–`:561`, `:564`, `:567`, `:573`, `:581`, `:586`, `:596`, `:604` `expect(sync(v.ui, v)).toBe(v.ui)`, `:606`–`:610` · `test/unit/tui-loop.test.ts:505`–`:507` · `test/integration/tui.test.ts:243`–`:247` | ✅ |
| QST-83 † the credential | read at the send; without it no send and the notice; never drawn | `test/unit/tui-keys.test.ts:545` · `test/unit/tui-loop.test.ts:351`–`:353`, `:358`, `:361`–`:362` · `test/integration/tui.test.ts:133`–`:142`, `:153`–`:158` `expect(io.token()).toBe("0f".repeat(32))` on the terminal entry, `:259` · `test/unit/config.test.ts:55` | ✅ |
| QST-84 † the broker does not answer | no modal and the notice; an open modal unchanged, drawn again | `test/unit/tui-keys.test.ts:649`, `:652`, `:654`, `:659`–`:660` · `test/unit/tui-loop.test.ts:522`–`:529`, `:538` | ✅ |
| QST-85 † `esc` and `ctrl+c` | closed without sending, same selection; quits | `test/unit/tui-keys.test.ts:416`–`:419`, `:424` | ✅ |
| QST-86 † the only `POST` | `/answer`, by the `enter` of the modal | `test/unit/tui-writer.test.ts:112`–`:114` · `test/unit/tui-loop.test.ts:373`, `:381`–`:385` · `test/integration/tui.test.ts:254`–`:255` | ✅ |
| QST-87 frames 05, 06, 07, 20a, 20b | the 40 lines, but for D1 and D2 | `test/unit/tui-frames.test.ts:40` (five cases), `:107`–`:118` | ✅ |
| QST-88 the legend | the four lines of Question; gate and permission empty | `test/unit/tui-frames.test.ts:151`–`:153`, `:132`–`:144` | ✅ |
| QST-89 the table of deviations | no D3 in the six frames; no reason of the slice Question | `test/unit/tui-frames.test.ts:82`, `:100`, `:157`, `:160`–`:161` | ✅ |
| QST-90 the frame files | output of `extract.ts`; the 41 identical to `main` | It has no assertion of its own, as `tasks.md` declares for T19 ("Tests: none"); `test/unit/tui-glyphs.test.ts:10` counts 47 and `test/unit/tui-frames.test.ts:40` draws each one. By command, run again in this round: `bun test/frames/extract.ts` over `Squad TUI.dc.html` into an empty directory, exit 0; the 47 files of the repository are equal to its output modulo line endings, and the six new ones have the SHA-1 of the committed blobs; `git diff --name-status main..HEAD -- 'broker/test/frames/*.txt'` shows six added files and no other | ✅ by command |
| QST-91 † `g`, `x`, `4`, `enter` | `chega com a fatia Gate`; never `chega com a fatia Question` | `test/unit/tui-keys.test.ts:119`–`:120`, `:126`–`:127` | ✅ |
| QST-92 a chain of three | the three with the same `answer_seq`, one delivery each | `test/unit/question-merge.test.ts:296`–`:308` | ✅ |
| QST-93 † one delivery per name, none for the author | once | `test/unit/question-merge.test.ts:318`, `:325`, `:339` | ✅ |
| QST-94 † a recipient that is offline | stored; delivery pending until it registers | `test/unit/question-ask.test.ts:409`–`:414` | ✅ |
| QST-95 † the holder leaves | `open`, same holder | `test/unit/question-escalate.test.ts:311`, `:319` | ✅ |
| QST-96 † what does not fit | broken or cut with `…` inside the box | `test/unit/tui-questions.test.ts:155`–`:164`, `:323`–`:340` · `test/unit/tui-answer.test.ts:304`–`:325`, `:333`–`:358` | ✅ |
| QST-97 † more questions than lines | whole questions, the selected one visible | `test/unit/tui-questions.test.ts:175`–`:191` | ✅ |
| QST-98 † after the deadline | `timeout 0:00` in the list, the detail and the title | `test/unit/tui-asked.test.ts:182`–`:187` · `test/unit/tui-questions.test.ts:124`, `:314`–`:315` · `test/unit/tui-answer.test.ts:295`–`:297` | ✅ |

**Status**: 98 of 98 hold. QST-78 carries the one spec-precision gap, P3. QST-90 holds by command and has no assertion of its own, as the coverage matrix says.

## Edge cases

- [x] QST-92: a chain of three closes with one `answer_seq` and one delivery each.
- [x] QST-93: one delivery per name, none for the author, in the three cases the criterion names.
- [x] QST-94: a question to an offline peer is stored and waits.
- [x] QST-95: the question stays with a holder that left, by `unregister` and by a dead pid.
- [x] QST-96: list, detail, history and modal break or cut inside their boxes.
- [x] QST-97: seven questions, the selected one drawn whole at the three positions.
- [x] QST-98: `timeout 0:00` in the list, the detail and the title of the modal.

## Spec-precision gaps

| # | AC | What the spec leaves open | What the code does | Pinned by a test? |
| - | -- | ------------------------- | ------------------ | ----------------- |
| P3 | QST-78, and the Assumptions row "Colagem com quebra de linha" | What a line break of a chunk of more than one key does when no modal is open at its turn. QST-78 gives the text mode and the choice mode. The Assumptions row says that in such a chunk `\r` and `\n` become a space, with no condition | `enter`: it opens the modal, as QST-66 and QST-67 say of the key (`tui/keys.ts:187`, the `next.modal !== null` of the rule) | For a chunk of whole keys, yes: `test/unit/tui-keys.test.ts:454`, `:469`, `:480`, `test/unit/tui-loop.test.ts:411`, `:424`. For a chunk that ends in an escape the loop holds back, no: mutant K4 survives |

Not a functional hole: with no modal open no answer can be sent, and no text exists to lose. P1 and P2 of round 2 are closed.

## Test integrity

`git diff 7268928..HEAD -- broker/test` touches two files, both of which existed, and removes no line: `git diff --numstat` gives `42 0` for `test/unit/tui-loop.test.ts` and `34 0` for `test/unit/tui-questions.test.ts`.

- `test/unit/tui-loop.test.ts`: two tests added after `:429`, each over the two chunks `"\r\x1b"` and `"\r\x1b["`.
- `test/unit/tui-questions.test.ts`: the fixture `CHOICES` (`:29`–`:30`) and two tests (`:105`–`:112`, `:280`–`:301`).

No expectation of a test that existed at `7268928` changed or left. No test was deleted, no skip added: the three skip markers are the ones of before the feature.

Nothing under `broker/test/frames/*.txt` changed since `9a4d921` but the six added files: `git diff --name-status 9a4d921..HEAD -- 'broker/test/frames/*.txt'` lists `04.txt`, `05.txt`, `06.txt`, `07.txt`, `20a.txt`, `20b.txt`, all `A`. In the directory, `deviations.ts`, `logs.ts` and `view.ts` are modified, as round 1 reported and judged backed by the spec; none of the three changed in either fix round.

## Frames

The extraction was run again in this round (see QST-90). The six frames, their logs and their deviations are the ones round 1 read line by line and judged to hold; none of those files changed since.

## Discrimination sensor

38 behaviour-level mutations, one at a time, in a `git worktree` at `2ac91fe` under the scratchpad, with `bun install --frozen-lockfile` run once in it. Each mutation ran the test files of its layer and the file was restored; the worktree was clean after each batch. The two survivors were run again under the whole suite, and survived it with 1270 pass. No stash. The worktree was removed with `git worktree remove --force`. `git status --porcelain` of the real tree was empty before and is empty after but for this file and the two lessons files.

**36 killed, 2 survived.** One survivor is outside this feature (T11), one on behaviour the spec leaves open (K4).

The three survivors of round 2, applied again:

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| Q16 | `tui/screens/questions.ts:118` | list: a non-blocking question with options shows its default line, not its options (QST-56) | ✅ Killed · `QST-56: a non-blocking question with options shows them and the number of the free text, and no line of its default` |
| Q17 | `tui/screens/questions.ts:147` | detail: a non-blocking question with options shows its default line, not its options (QST-58) | ✅ Killed · `QST-58: the detail of a non-blocking question with options has them numbered and the other answer, and no line of its default` |
| T11 | `tui.ts:214` | terminal: columns and rows of the terminal swapped | ❌ Survived. Outside this feature |

On what F12 changed (12):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| L1 | `tui.ts:184` | loop: the flag is not passed, the code of `7268928` (QST-78) | ✅ Killed · `QST-78: a line break and an unfinished escape in one chunk send nothing in the text mode: the break is a space, the escape closes the modal after its wait…` and the one of the choice mode |
| L2 | `tui.ts:184` | loop: the flag is inverted, `pending === ""` (QST-78, QST-76) | ✅ Killed · 8 fail, the first `QST-76, QST-80, QST-86: over a real broker the TUI, fed with keys, answers one question by an option and another by a text…` |
| L3 | `tui.ts:184` | loop: every chunk had more keys, so enter alone never sends (QST-76) | ✅ Killed · 8 fail, the same first |
| L4 | `tui.ts:164` | loop: `dispatch` drops the flag before the keys (QST-78) | ✅ Killed · the two tests of L1 |
| L6 | `tui.ts:184` | loop: a lone escape held back is not more keys, only an open sequence, so `"\r\x1b"` sends (QST-78) | ✅ Killed · the two tests of L1 |
| L7 | `tui.ts:184` | loop: an open sequence held back is not more keys, only a lone escape, so `"\r\x1b["` sends (QST-78) | ✅ Killed · the two tests of L1 |
| K1 | `tui/keys.ts:187` | input: `more` is ignored (QST-78) | ✅ Killed · the two tests of L1 |
| K2 | `tui/keys.ts:187` | input: a paste needs `more` and two keys (QST-78) | ✅ Killed · 9 fail, the first `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and one key alone stays as it came` |
| K3 | `tui/keys.ts:183` | input: `more` is true unless said otherwise, so enter alone sends nothing (QST-76) | ✅ Killed · 3 fail, the same first |
| K4 | `tui/keys.ts:187` | input: with `more` a line break is a space also with no modal open | ❌ Survived. Unspecified: P3 |
| K5 | `tui/keys.ts:187` | input: with `more` a line break still confirms in the choice mode (QST-78) | ✅ Killed · `QST-78: a line break and an unfinished escape in one chunk confirm no option in the choice mode…` |
| K6 | `tui/keys.ts:187` | input: with `more` a line break still sends in the text mode (QST-78) | ✅ Killed · `QST-78: a line break and an unfinished escape in one chunk send nothing in the text mode…` |

Elsewhere in the feature, none of them tried in round 1 or in round 2 (23):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| N1 | `question.ts:99` | resolve: the merged ones are not closed with the destination (QST-31) | ✅ Killed · 9 fail, the first `QST-31: the questions merged into one that expires close with it, by its default, and who asked each one gets it` |
| N2 | `question.ts:82` | resolve: who asked a merged one gets no delivery of the answer (QST-23, QST-92) | ✅ Killed · 6 fail, the same first |
| N3 | `question.ts:90` | resolve: the answer is addressed to its author, not to who asked (QST-20) | ✅ Killed · 27 fail, the first `QST-13/24: a question of a worker goes up by two escalations to the dev, and the answer with the credential of the file comes back to the worker in its polling` |
| N5 | `question.ts:250` | escalate: the `question` of the escalation has no `ticket_ref` (QST-13) | ✅ Killed · `QST-13: from the worker to the dev the question is stored three times with the same id and the fields of the first` |
| N6 | `question.ts:260` | escalate: `timeout_s` of the first question is not carried (QST-13) | ✅ Killed · the same |
| N7 | `question.ts:265` | escalate: the deadline ignores `timeout_s` and counts 240 s (QST-18) | ✅ Killed · the same |
| N10 | `question.ts:344` | merge: a blocking and a non-blocking question are merged (QST-29) | ✅ Killed · `QST-29: a blocking question and a non-blocking one are refused with merge_not_allowed, in both directions` |
| N11 | `question.ts:356` | merge: the event carries the ticket of the destination (QST-30) | ✅ Killed · `QST-30: the merge is stored from the mother to no one, with the ticket of the merged question, and its row follows the other` |
| N16 | `question.ts:196` | ask: the default of a blocking question is not stored in the row (QST-01, Assumptions) | ✅ Killed · `QST-01: a blocking question may carry a default, which is kept` |
| N17 | `question.ts:197` | ask: the row stores 240 when `timeout_s` was not sent (QST-01, Assumptions) | ✅ Killed · 47 fail, the first `QST-13/24: a question of a worker goes up by two escalations to the dev…` |
| N18 | `question.ts:373` | expire: the default by the deadline says `result_default` (QST-33) | ✅ Killed · 11 fail, the first `QST-34: a non-blocking question with timeout_s 1 that reaches the dev has the answer of the broker in the log within 3 s` |
| N19 | `question.ts:389` | delivered: the default by the `result` says `timeout_default` (QST-36) | ✅ Killed · 9 fail, the first `QST-36: the result a worker sends through /send closes by its default the non-blocking question it asked about the ticket…` |
| N20 | `log.ts:141` | close: a blocking question with a default is discarded, by `blocking` and not by the default (QST-43) | ✅ Killed · `QST-43: a feature closed as delivered closes its open and merged questions by their default or discards them, with no answer` |
| N21 | `log.ts:216` | history by `question_id` in descending `seq` (QST-50) | ✅ Killed · `EVT-69: history by question_id and by gate_id filters by the column, in any feature` |
| N25 | `shared/derive.ts:332` | `questions()`: a blocking question that reached the dev gets a deadline (QST-48, QST-40) | ✅ Killed · 8 fail, the first `a blocking question has no deadline and no default, even with the dev` |
| N26 | `shared/derive.ts:340` | `questions()`: the last answer of a question counts, not the first (QST-41, QST-46) | ✅ Killed · `the first answer of a question is the one that counts, and an answer to no question is no question` |
| N29 | `shared/derive.ts:378` | `questions()`: at the `feature_closed`, `defaulted` and `discarded` are swapped (QST-46) | ✅ Killed · `QST-46: with the feature_closed of the feature, a question without an answer is defaulted when it has a default and discarded when it has none` |
| N32 | `tui/keys.ts:202` | settle: without a credential the modal closes and the text is lost (QST-83) | ✅ Killed · `QST-83: without a credential to send the answer with, the modal stays as it was before the send and the footer says so for 4 s` |
| N33 | `tui/keys.ts:198` | settle: the answer stays in `send` after the broker answered (QST-79, AD-014) | ✅ Killed · 5 fail, the first `QST-77: when the broker takes the answer the modal closes and the footer says so in green for 4 s` |
| N34 | `tui/keys.ts:201` | settle: after a failed send the modal stays waiting and takes no key (QST-81) | ✅ Killed · `QST-81: any other answer of the broker leaves the modal as it was before the send and says the error in red for 4 s` |
| N35 | `tui/keys.ts:205` | settle: the refused modal keeps the field as typed, not the text sent (QST-80) | ✅ Killed · `QST-80: when the broker says the question closed the modal turns refused, in the text mode with what was sent` |
| N36 | `tui/keys.ts:217` | sync: a read does not bring the offset of the history back (QST-63) | ✅ Killed · `QST-63: a read keeps the offset of the history from leaving fewer than 4 on the screen` |
| N38 | `tui/keys.ts:225` | sync: a question closed by the `result` of who asked says `fechada`, not the default (QST-82) | ✅ Killed · `QST-82: a read that shows the question of the modal closed closes the modal, with the notice of the default in yellow or the one that it closed` |

Two faults were thought of and not applied, because no input reaches them: `dispatch(tail, true)` at `tui.ts:188` and `more = true` as the default at `tui.ts:160`. The tail the timer dispatches never has a line break, so the flag changes nothing there.

### The survivors

- **T11** swaps the columns and the rows `terminal()` reads from stdout. I agree with round 2 that it is outside this feature, for three reasons. The line is the one `main` has: `git show 9a4d921:broker/tui.ts` has `size: () => ({ cols: stdout.columns, rows: stdout.rows })` at `:185`, in the entry block; F6 moved the block into `terminal()` to test one member of it, `token`. No criterion of Question names the size of the terminal: it is TUI-54 of the TUI leitura, verified there. And what TUI-54 defines is tested with the size injected (`test/unit/tui-loop.test.ts:234`–`:250`); the wiring to the real stdout needs a terminal, as before the move.
- **K4** makes `more` enough for a line break to be a space, modal or no modal. On the tab with no modal open, `key("\r\x1b")` then leaves the tab for the main screen, where the code at `2ac91fe` opens the modal and the escape closes it 40 ms later, the tab still on (probed through `start(...).key`, for `"\r\x1b"` and `"\r\x1b["`). Not equivalent. Outside what the spec defines: QST-78 states the rule for a line break "na vez dessa tecla" with the modal in the text mode and in the choice mode, and stops there; the Assumptions row says a line break of such a chunk becomes a space, with no condition, which is what the mutant does; QST-66 and QST-67 speak of `enter` pressed, and QST-78 is the criterion that says when a `\r` of a chunk is not that. The code chose "with no modal, enter is enter" and its tests pin the choice for a chunk of whole keys. They do not pin it for the chunk F12 added. Nothing is sent in either reading, and no text is lost: P3.

**Sensor depth**: P0-full, by hand: no mutation tool is installed for Bun.

### QST-48: what the generated sequences reach

Unchanged since round 2: `test/unit/question-replay.test.ts` compares the ten fields of QST-48 after each of 40 calls of 200 sequences, per feature (`:264`–`:290`), and requires at the end every step accepted and refused, the four routes refused on a question of a closed feature, the five statuses, the four `resolved_by` (`:332`–`:336`) and a merged question closed by its own `result` whose destination closed later (`:338`). It was not run alone in this round: it ran with the unit tests of the routes under each mutant of `question.ts`, `log.ts` and `shared/derive.ts`, and with the whole suite. What round 2 measured of it alone stands: it kills the direct follower closed twice (`question.ts:71`) and not the one two merges away (`question.ts:73`), which `test/unit/question-result.test.ts:124` covers.

## Code quality

Over what the second fix round touched: `tui.ts`, `tui/keys.ts` and the two test files.

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ F12 is one parameter with a default in two functions and one argument at one call: 8 lines changed in `tui.ts`, 7 in `tui/keys.ts`, comments included. F13 is tests only |
| Surgical changes | ✅ Nothing else of `key`, `dispatch` or `input` moved. The regular expression that holds the escape back is the one of the TUI leitura |
| No scope creep | ✅ No setting, no new export, no new state in the loop |
| Matches patterns | ✅ The reducer takes what it needs as arguments, as `press`, `settle` and `sync` do (AD-014) |
| Spec-anchored outcome check | ✅ 98 of 98; P3 flagged |
| Per-layer coverage expectation | ✅ The rule of QST-78 is now asserted in the reducer and at the entry of the loop, where round 2 found it missing (L-056) |
| Every test maps to a requirement | ✅ The four new tests start with `QST-78`, `QST-78`, `QST-56`, `QST-58` |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/LESSONS.md` L-001, L-004, L-010, L-020 | ✅ L-010 holds for QST-56 and QST-58 now: each of the two conditions that draw the line of options has its assertion, in the list and in the detail |

On F12, the three questions asked of this round:

- **Is the flag the smallest honest way to carry "this chunk had more keys"?** Yes. The loop is the only place that knows it held a tail back, and the reducer the only place that knows what a paste is. The other ways are larger or wrong: handing the tail to `input` would press the escape at once and end the 40 ms wait that lets a split arrow arrive; counting the keys in `key` would put half of the paste rule in the loop. The name says what is true and no more: `more` is "keys after these", not "this is a paste".
- **Is `input` still pure?** Yes. `more` is an argument with a default; `input` reads no clock and no state outside its arguments, and the same four arguments give the same `Ui` (`tui/keys.ts:183`–`:192`).
- **Is there a path left by which one chunk sends?** One, `\r` alone with the modal open: see "QST-78: one chunk and the answer it may send".

Smaller notes, none blocking:

- `key` has a local `input` (`tui.ts:178`, there since the TUI leitura) with the name of the reducer `dispatch` calls (`tui.ts:164`, imported since F8). Two scopes, no bug; the next edit of `key` should not reach for the reducer by that name.
- No unit test of `tui/keys.ts` gives `more` to `input`: the flag is tested through the loop only. That is where the rule failed in round 2, and the ten mutants on it were killed there. P3 is the one case it leaves.
- The notes of round 2 stand, untouched by this round: `broker.ts:68`–`:69` still says "every second" of an interval that is a setting; `keysOf` (`tui/keys.ts:40`) is exported for `input` and the tests only; `TIMEOUT_S` is in two files (`question.ts:21`, `shared/derive.ts:285`).

## Known risks that can wait

The earlier rounds agreed on these, and this round found no reason to change that. None is in the spec. Name them in the PR.

- **`expire` in a bare `setInterval`** (`broker.ts:71`), and `question.expire()` before the broker serves (`broker.ts:70`). An exception in the timer ends the process, as in `peers.cleanStale` beside it since the Peers slice. The feature adds exposure: the timer runs every second, and a failure that persists keeps the broker from coming up. A guard that logs and goes on belongs to both timers and to a change of its own.
- **`tui/demo.ts` has no automated test.** The matrix of `tasks.md` (`:45`) says so: checked by hand in a terminal. It reads neither the database nor the credential of the user. Its `export` of `serve` has no importer.
- **A paste the terminal delivers in several reads**, with `\r` alone in one of them, sends: by the definition the spec chose that read is a chunk of one key. Bracketed paste is in Out of Scope.
- **The members of `terminal()` that need a terminal** (`fetch`, `now`, `size`, `write`, `raw`) and the line of the entry block that calls it have no test, as before the feature. T11 is one of them.
- **Linux did not run in this verification.** The spec asks for both or for a note of which did not run.
- The interactive UAT (step 7) was not this agent's.

## Follow-up, not a gap

For P3, one sentence and one test, whenever the file is next touched:

- **In the spec**: QST-78 and the Assumptions row say what a line break of a chunk of more than one key does with no modal open at its turn: it is `enter`, and opens the modal.
- **In `test/unit/tui-loop.test.ts`**: on the tab with no modal, `key("\r\x1b")` shows the modal of the selected question, posts nothing, and after the wait shows the tab without the modal. It fails with `(more || (keys.length > 1 && next.modal !== null))` at `tui/keys.ts:187`.

## Requirement traceability update

Not applied: this agent does not edit `spec.md`. Proposed:

| Requirement | Current status | Proposed |
| ----------- | -------------- | -------- |
| QST-01 to QST-98 | Implementing | ✅ Verified |

## Lessons recorded

Through `scripts/lessons.py add`, one for the one new signal. The script changed `.specs/lessons.json` and `.specs/LESSONS.md`.

| Signal | Lesson | Effect |
| ------ | ------ | ------ |
| P3, QST-78 and its Assumptions row; mutant K4 `tui/keys.ts:187` | When an AC states a rule for each mode of a component, state what the same input does when the component is in none of them | New, L-057 |

Not recorded again: K4 as a surviving mutant is L-052, which round 1 recorded for this feature (a fixture where the condition differs from the ones that coincide with it: in every test that gives `more`, a modal is open). T11 is outside the feature. No lesson was penalized: L-052 is a candidate, not guidance that was loaded.

## Summary

**Overall**: ✅ Ready, with one follow-up that does not block.

**Spec-anchored check**: 98/98 ACs match what the spec defines; 1 spec-precision gap (P3), not a functional hole. QST-90 holds by command.
**Sensor**: 36/38 mutations killed; 2 survive: one outside the feature (T11), one on behaviour the spec leaves open (K4). Q16 and Q17 of round 2 are killed.
**Gate**: `tsc` exit 0; 1270 pass, 3 skip, 0 fail.

**What works**: everything rounds 1 and 2 listed, and the two gaps round 2 ranked: a line break followed by an unfinished escape in one chunk sends nothing, in the text mode and in the choice mode, and enter alone still sends; a non-blocking question with options shows its options in the list and in the detail, and the spec says so for both. The second fix round only added tests; the frames did not move.

**Issues found**: none that blocks. P3 and its mutant K4, with the follow-up above.

**Next steps**: the interactive UAT, the run on Linux or the note that it did not run, and the PR with the known risks named. This was the third of at most three rounds.

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
