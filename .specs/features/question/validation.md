# Question Validation

**Result**: FAIL

**Date**: 2026-10-10
**Verifier**: independent sub-agent (author ≠ verifier). This agent wrote this file and, through `scripts/lessons.py`, the two lessons files. No code, no test, no spec, no task, no commit.
**Spec**: `.specs/features/question/spec.md`, 98 requirements `QST-01` to `QST-98`, with its Assumptions and STATE AD-010, AD-012, AD-013, AD-014.
**Diff range**: `9a4d921..613da1c` on `feat/question` (44 commits, 73 files, +9005 −195).
**Environment**: Windows 11, Bun 1.4.2, installed TypeScript 5.9.3, Python 3.12.9. Linux did not run here.

All code and test citations below are relative to `broker/`.

The gate is green and 88 of the 98 criteria have an assertion that pins the outcome the spec defines. The verdict is FAIL because the discrimination sensor left ten mutants alive out of 149, seven of them on behaviour the spec defines. The two that matter:

1. **`broker.ts:57` hands `question.delivered` to `/send`, and no test notices when it does not.** With `createSend(log)` the whole suite passes (1248 pass) and the real broker never closes a question by the `result` of who asked it. QST-36 is proven only through the wiring of the test helper.
2. **`question.ts:73` keeps a question that already closed out of the followers of an answer, and only the direct case is tested.** Without the filter of the recursive step, a question two merges away that closed by its own `result` is closed again and delivered again by the answer of the end of the chain. QST-37 forbids it; the suite passes.

The other five are narrower: `/merge-question` has no test of a failed write (QST-12), no fixture has a blocking question with a default in the modal (QST-73, QST-80), the period of the check of deadlines is bounded at 3 s and not at 1000 ms (QST-34), `unknown_peer` is never sent together with a second failing rule on the four routes (QST-10, QST-16, QST-22, QST-29), and the terminal entry of the TUI may lose its credential without a test failing (QST-83). Three more mutants survive where the spec says nothing. No pre-existing test was weakened, removed or skipped. The six new frames are byte-identical to the extraction.

## Task completion

T1 to T38 are ticked in `tasks.md`: 194 Done-when boxes checked, none open. Each task has its own commit in the range, in order:

| Tasks | Commits |
| ----- | ------- |
| T1–T5 | `e29d887` `cd5d489` `9d366ec` `106e556` `d5d4fe2` |
| T6–T10 | `1ff8fe7` `0e7c5c9` `ffba76d` `cd241c3` `64398a4` |
| T11–T15 | `5bef402` `70f2895` `dc34583` `3b54c83` `e96ae41` |
| T16–T20 | `74b8fcf` `2749411` `cf15716` `362569c` `de68348` |
| T21–T25 | `cb45c9c` `963c3c6` `74b6c23` `760a2b8` `7e57c9f` |
| T26–T30 | `7859b5d` `980fe00` `5e0776b` `58a7faf` `b9d6ba9` |
| T31–T35 | `d11ccb6` `a661931` `325166d` `35ecd2c` `3bd3e9c` |
| T36–T38 | `9cbaecc` `dcc3e63` `446e1a9` |

Six commits are not a task: `ba6916a`, `b6e1db5`, `6ee9fc1` (handoff, spec, design and tasks) and `3c3f898`, `9845b79`, `613da1c`, which reword the spec after code was written. The rewordings touch QST-58 (two spaces after `default`), QST-80 (the default named only for a non-blocking question), QST-82 (a send in course, a question that is gone) and QST-84 (the notice hidden by the frozen screen). QST-37, QST-38 and QST-46 were reworded in `6ee9fc1`, before the code. This report judges the code against the spec as it is at `613da1c`.

No `SPEC_DEVIATION` marker is in the diff.

## Gate check

- **Command**, from `broker/`: `bun node_modules/typescript/bin/tsc --noEmit && bun test`
- **Result**: `tsc` exit 0. **1248 pass, 3 skip, 0 fail**, 53974 `expect()` calls, 1251 tests in 63 files, 52.6 s. One run, no re-run needed; `EVT-43` did not flake.
- **Before the feature**: 926 pass, 3 skip. **Delta**: +322 tests. No count went down.
- **Skipped**, the same three as before the feature, all platform conditions: `test/integration/cli.test.ts:65` (no decoy host to listen on), `test/integration/cli.test.ts:100` (`win32`), `test/unit/presence.test.ts:6` (`win32`). `git grep` finds 3 skip markers at `9a4d921` and 3 at `HEAD`.
- The whole suite also ran ten more times in the scratch worktree, once under each surviving mutant, with the same 1248 pass.

## Spec-anchored acceptance criteria

Re-derived from the spec, the code and the assertions. A whole-object `toEqual` is what covers an AC that lists the fields of an event, a row or a delivery: `storedQuestion`, `storedAnswer`, `storedMerged`, `storedDefault` and `questionRow` in the tests give every column, and `refusedWith` (`test/unit/helpers.ts:221`) compares the whole `refused` event and the deliveries.

Result: ✅ the assertion pins the outcome of the spec · ❌ a clause of the AC has no assertion that would fail (see the gap number) · ⚠️ the spec leaves an outcome open (see "Spec-precision gaps").

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| QST-01 `/ask` writes the row and answers | row of 12 columns, `id` = max+1, `{ ok, question_id, seq }` | `test/unit/question-ask.test.ts:23` `expect(b.question.ask(WORKER_1, ASKED)).toEqual({ ok: true, question_id: 1, seq: 2 })` · `:24` `expect(b.questionRows()).toEqual([questionRow(1, id)])` · `:56` id 8 after a hand-made gap at 7 | ✅ |
| QST-02 the `question` event | from, role, to, summary, body `""`, ticket, column, `data` with only the fields of the kind | `test/unit/question-ask.test.ts:82` `expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id, { ts: NOW + 300 })])` with ten foreign keys in the body · `:99` every optional field | ✅ |
| QST-03 delivery to a peer, none to `human` | one pending row / none | `test/unit/question-ask.test.ts:124` `expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: 2, recipient: "leader", acked_at: null }])` · `:139` `toEqual(toOthers(1))` · `test/unit/log.test.ts:699`, `:718` | ✅ |
| QST-04 `deadline_ts` of `/ask` | `ts` + `timeout_s`×1000, or + 240000; else null | `test/unit/question-ask.test.ts:155` `deadline_ts: NOW + 500 + 30000` · `:171` `NOW + 500 + 240000` · `:184` from the stored `ts` · `:193` `["human", 1, null], ["leader", 0, null], ["mother", 0, null]` | ✅ |
| QST-05 `missing_field` | each wrong type, empty text, non-blocking without default | `test/unit/question-ask.test.ts:205`–`:211`, `:218`–`:220`, `:227`–`:235`, `:241`–`:242` `refusedAsk(b, WORKER_1, …, "missing_field")` | ✅ ⚠️ G6 |
| QST-06 `invalid_field` | summary 81, empty options, empty option, `timeout_s` < 1 or blocking | `test/unit/question-ask.test.ts:249` (81 refused), `:250` (80 stored), `:257`–`:259`, `:266`–`:270` | ✅ |
| QST-07 `too_many_options` | 4 refused, 3 accepted | `test/unit/question-ask.test.ts:277` `refusedAsk(…, { ...ASKED, options: ["a", "b", "c", "d"] }, "too_many_options")` · `:278` 3 accepted | ✅ |
| QST-08 recipient, edge, feature | `unknown_recipient`, `edge_not_allowed`, `no_open_feature` | `test/unit/question-ask.test.ts:291` · `:312` every pair of 4 senders × 7 recipients, `:320` `expect(passed.sort()).toEqual([...allowed].sort())` · `:325`, `:328` | ✅ |
| QST-09 `refused` of the four routes | `peer`, `attempted_kind` `question`/`question`/`question_merged`/`answer`, `error`; nothing else | `test/unit/question-ask.test.ts:335` whole event · `test/unit/question-escalate.test.ts:50` · `test/unit/question-merge.test.ts:68` · `test/unit/question-answer.test.ts:39` · `test/integration/question.test.ts:186` | ✅ |
| QST-10 order of the refusals of `/ask` | `unknown_peer`, `missing_field`, `invalid_field`, `too_many_options`, `unknown_recipient`, `edge_not_allowed`, `no_open_feature` | `test/unit/question-ask.test.ts:360`, `:365`–`:366`, `:371`, `:376`, `:381` one pair each · `test/integration/question.test.ts:169`–`:170` `unknown_peer` with a body that fails no other rule | ❌ gap 7 (first pair) |
| QST-11 `/send` points to the routes | `invalid_kind`, hint names `/ask`, `/answer`, `/merge-question` | `test/unit/send.test.ts:180` `expect(answer.hint).toContain(route)` · `:182` not the other two | ✅ |
| QST-12 all or nothing | no row, no event, no delivery | `test/unit/question-ask.test.ts:389`–`:392` (three tables) · `test/unit/question-escalate.test.ts:301`–`:304` · `test/unit/question-answer.test.ts:204`–`:207` · `test/integration/question.test.ts:207`–`:209` (500) · none for `/merge-question` | ❌ gap 3 |
| QST-13 `/escalate` | same id, level above, fields of the first question, holder moved | `test/unit/question-escalate.test.ts:63` `expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id, CARRIED), storedQuestion(3, id, { ...CARRIED, ...FROM_LEADER }), storedQuestion(4, id, { ...CARRIED, ...FROM_MOTHER, ts: NOW + 4000 })])` · `:97` body ignored | ✅ |
| QST-14 summary and body of an escalation | of the latest question, or the ones sent | `test/unit/question-escalate.test.ts:132`, `:148`, `:162` | ✅ |
| QST-15 refusals of `/escalate` | `missing_field`, `invalid_field` | `test/unit/question-escalate.test.ts:170`–`:172`, `:178`–`:179`, `:184`–`:185`, `:191` | ✅ |
| QST-16 `question_closed`, `not_holder`, order | closed first, then holder | `test/unit/question-escalate.test.ts:198` (four statuses), `:204`–`:210`, `:215`–`:216`, `:222`, `:228` | ❌ gap 7 (first pair) |
| QST-17 destination of an escalation | `human` with no delivery; `leader`, `mother` with one | `test/unit/question-escalate.test.ts:243` · `:257`–`:258` | ✅ |
| QST-18 deadline when it reaches the dev | `ts` + `timeout_s`×1000 or + 240000; null if blocking | `test/unit/question-escalate.test.ts:76` `deadline_ts: NOW + 4000 + 90000` · `:268` `NOW + 6000 + 240000` · `:279` · `:286` | ✅ |
| QST-19 no deadline with an agent | null, not closed | `test/unit/question-escalate.test.ts:291`, `:293` · `test/unit/question-expire.test.ts:130`–`:132` a day later | ✅ |
| QST-20 `/answer` of the holder | whole `answer` event, row `answered`, `answer_seq` | `test/unit/question-answer.test.ts:57`–`:59` · `:69`–`:74` summary of 80 by the literal · `:80` as it came · `test/unit/contract.test.ts:83` `qid` | ✅ |
| QST-21 refusals of `/answer` | `missing_field`, `invalid_field` | `test/unit/question-answer.test.ts:126`–`:128`, `:134`–`:136`, `:142` | ✅ |
| QST-22 order of the refusals of `/answer` | `unknown_peer` or `invalid_token`, `missing_field`, `invalid_field`, `question_closed`, `not_holder` | `test/unit/question-answer.test.ts:149`, `:156`, `:165`, `:170`–`:172`, `:178` · `test/unit/question-human.test.ts:155`, `:163` · `test/integration/question.test.ts:136`, `:142` | ❌ gap 7 (first pair, `unknown_peer`) |
| QST-23 deliveries of an answer | `asked_by` and each merged one, once, never the author | `test/unit/question-answer.test.ts:184` · `test/unit/question-merge.test.ts:180` `expect(waiting(b, 5)).toEqual(["worker-1", "worker-2"])` | ✅ |
| QST-24 the dev answers | `human`, `human`, `resolved_by` `human`, row `answered` | `test/unit/question-human.test.ts:69`–`:71` · `test/integration/question.test.ts:89`–`:109` with the credential of the file | ✅ |
| QST-25 deliveries of the answer of the dev | `asked_by`, merged ones, `mother`, once each | `test/unit/question-human.test.ts:80` · `:92`–`:94` | ✅ |
| QST-26 `invalid_token` first | before any rule, with a registered `id` in the body | `test/unit/question-human.test.ts:100`, `:111`–`:117` · `test/integration/question.test.ts:140`, `:142` | ✅ |
| QST-27 the dev is not the holder | `not_holder` | `test/unit/question-human.test.ts:124`, `:126` · `test/integration/question.test.ts:144` | ✅ |
| QST-28 no trace of a refusal to the dev; `unknown_peer` | no event; `unknown_peer` | `test/unit/question-human.test.ts:51`–`:53` (`refusedDev`), `:134`–`:149` · `test/integration/question.test.ts:136`, `:145`, `:169`–`:172` | ✅ |
| QST-29 refusals of `/merge-question` and order | `edge_not_allowed`, `missing_field`, `invalid_field`, `question_closed`, `merge_not_allowed` | `test/unit/question-merge.test.ts:74`, `:79`–`:83`, `:89`–`:92`, `:99`–`:100`, `:106`–`:107`, `:112`, `:117`–`:118`, `:124`–`:125`, `:131` | ❌ gap 7 (first pair) |
| QST-30 `/merge-question` | whole `question_merged`, row `merged`, no delivery | `test/unit/question-merge.test.ts:139`–`:145` · `test/integration/question.test.ts:185`–`:194` | ✅ |
| QST-31 the merged ones close with the destination | same status, same `answer_seq`, one transaction | `test/unit/question-merge.test.ts:176`–`:180`, `:196`–`:200`, `:212`–`:215` · `test/unit/question-expire.test.ts:249`–`:271` | ✅ |
| QST-32 a merged one has no deadline of its own | nothing written | `test/unit/question-expire.test.ts:148`–`:151` | ✅ |
| QST-33 the deadline | whole `answer` of `broker`, `timeout_default`, row `defaulted`, deliveries | `test/unit/question-expire.test.ts:51` (1 ms before: `[]`), `:57`–`:58`, `:59`, `:71` | ✅ |
| QST-34 when the deadlines are checked | at startup before serving, then every 1000 ms | `test/integration/question.test.ts:218` `waitFor(…, 3000)`, `:236` `toBeGreaterThanOrEqual(asked!.ts + 1000)` · `:262`–`:266` first reading after a restart | ❌ gap 5 (the period) |
| QST-35 restart | overdue closes at startup; the stored deadline of the other holds | `test/unit/question-expire.test.ts:207`–`:220`, `:224`–`:227` · `test/integration/question.test.ts:263`–`:268` | ✅ |
| QST-36 default by the `result` | after the `result` and the `unblocked`, ascending id, one transaction | `test/unit/send-result.test.ts:283` `[[6, "result", …], [7, "unblocked", …], [8, "answer", …]]`, `:288`, `:318`, `:370`–`:374` · `test/unit/question-result.test.ts:42`–`:57` · none through the real broker | ❌ gap 1 |
| QST-37 the `result` closes a merged question | it and its merged ones; the destination unchanged and not followed again | `test/unit/question-result.test.ts:97`, `:111`–`:112`, `:119`–`:121` · `test/unit/question-merge.test.ts:228`–`:234` · direct merge only | ❌ gap 2 |
| QST-38 one answer per question | status read and written in one transaction; `question_closed` after | `test/unit/question-answer.test.ts:193`–`:196` · `test/unit/question-human.test.ts:168`–`:170` · `test/unit/question-result.test.ts:162` · `test/unit/question-replay.test.ts:280` | ✅ |
| QST-39 what the `result` does not close | blocking, other ticket, no ticket, other worker, leader → mother | `test/unit/question-result.test.ts:142`–`:144`, `:149` · `test/unit/send-result.test.ts:332`–`:333`, `:346`–`:347` | ✅ |
| QST-40 a blocking question has no deadline | open a day later | `test/unit/question-expire.test.ts:117`–`:119` | ✅ |
| QST-41 deadline and answer at once | exactly one `answer`, the first | `test/unit/question-expire.test.ts:168`–`:175`, `:181`–`:194` | ✅ |
| QST-42 the table | twelve columns; old rows and events kept | `test/unit/db.test.ts:263` `expect(info.map((c) => c.name)).toEqual(QUESTION_COLUMNS)` · `:284`–`:285` | ✅ |
| QST-43 the feature closes its questions | `defaulted` or `discarded`, `answer_seq` null, no `answer` | `test/unit/question-close.test.ts:58` whole rows of seven questions · `:68`–`:70` · `:134`–`:149` · `:159`–`:163` | ✅ |
| QST-44 closed by the feature | `question_closed` on the three routes; no default by deadline | `test/unit/question-close.test.ts:80`–`:84`, `:95`–`:97`, `:116`–`:118` | ✅ |
| QST-45 no row is deleted | never | `test/unit/question-replay.test.ts:274`–`:275` after each of 8000 steps; no `DELETE` on `questions` in the diff | ✅ |
| QST-46 status of a derived question | first rule that holds, of six | `test/unit/derive.test.ts:453`, `:467`, `:482`, `:486`, `:503`, `:513`, `:520`, `:533`, `:557`, `:559`, `:581`–`:582` | ✅ |
| QST-47 `open` | false unless the status is `open` | `test/unit/derive.test.ts:596`, `:603` | ✅ |
| QST-48 parity of the table and the log | ten fields, per feature, no question on one side only | `test/unit/question-replay.test.ts:268` `expect(derived.sort((x, y) => x.id - y.id)).toEqual(stored)` · `:271` · `:305`–`:309` what the sequences reached | ✅ (see "QST-48") |
| QST-49 what a derived question carries | text, why, options, default, timeout_s, arrival, answer, merge, absorbed | `test/unit/derive.test.ts:619`, `:632`–`:633`, `:646`, `:653`, `:657`, `:673`, `:683`, `:693`, `:709` | ✅ |
| QST-50 `/history` by `question_id` | every `question`, `answer`, `question_merged`, by `seq` | `test/unit/log.test.ts:665`, `:670`, `:674` · `test/integration/routes.test.ts:416`–`:418` (the route, since the Event slice) | ✅ |
| QST-51 `owed` | `{ owes: "answer", question_id, seq }` of the latest question, in order | `test/unit/state.test.ts:263`, `:277`, `:307`–`:309` · `test/unit/derive.test.ts:724`, `:731`, `:747` | ✅ |
| QST-52 tools by role | `ask` for four; `answer`, `escalate` for three; `merge_question` for the mother | `test/unit/tools.test.ts:15`, `:47`, `:51`, `:55`, `:60`, `:64` · `test/integration/server-tools.test.ts:57` | ✅ |
| QST-53 a tool calls its route | id of the session; `question_id` and `seq`, or `error` and `hint` | `test/integration/server-question.test.ts:71`–`:73`, `:103`, `:114`–`:116`, `:135`–`:144`, `:147`–`:153` · `test/unit/tools.test.ts:70`–`:99` | ✅ |
| QST-54 the push | summary, body, fields; `kind`, `seq`, `from` in `meta` | `test/integration/server-question.test.ts:90` `expect(question.meta).toEqual({ kind: "question", seq: "5", from: "worker-1" })`, `:100`, `:105`–`:110` | ✅ |
| QST-55 the list and its order | title, seal, blocking first by arrival, then by deadline; line 24 | `test/unit/tui-asked.test.ts:53` `expect(ids(waiting(derived(b)))).toEqual([early, late, fast, slow])`, `:69` · `test/unit/tui-questions.test.ts:55`, `:78`, `:110` | ✅ |
| QST-56 a question in the list | head, two lines of 54, options at 47 or default, route, absorbed, empty line | `test/unit/tui-questions.test.ts:55`, `:63`, `:86`–`:87`, `:95`, `:131`–`:136` | ✅ ⚠️ G2, G3 |
| QST-57 the empty list | the four texts and `perguntas abertas · 0` | `test/unit/tui-questions.test.ts:107`–`:110`, `:260`–`:262` | ✅ |
| QST-58 the detail | title and the lines in order | `test/unit/tui-questions.test.ts:179`, `:190`–`:206`, `:215`–`:231`, `:245`–`:253` · `test/unit/tui-frames.test.ts:124` | ✅ ⚠️ G2 |
| QST-59 the effect | the three texts of a blocking one, the one of a non-blocking one | `test/unit/tui-asked.test.ts:108`–`:110`, `:121`–`:122` | ✅ |
| QST-60 the history | count, order, two lines, text at 66 | `test/unit/tui-asked.test.ts:93` · `test/unit/tui-questions.test.ts:321`, `:326`, `:358` | ✅ |
| QST-61 the outcome line | the five texts; merged before and after | `test/unit/tui-asked.test.ts:133`–`:134`, `:146`–`:147`, `:157`, `:161`, `:172` | ✅ |
| QST-62 five, or four and the count below | all up to 5; 4 and `+<n> mais antigas · h e j/k para rolar` | `test/unit/tui-questions.test.ts:321`, `:327`, `:331`, `:334`–`:335` | ✅ ⚠️ G1 |
| QST-63 focus and movement | `h`; white and gray borders; history by one, never fewer than 4; selection by one | `test/unit/tui-keys.test.ts:142`–`:146`, `:152`–`:153`, `:171`–`:178`, `:559` · `test/unit/tui-questions.test.ts:372`–`:373` | ✅ |
| QST-64 `4` and `esc` | the tab, its footer, back to the main one | `test/unit/tui-keys.test.ts:134`, `:137` · `test/unit/tui-questions.test.ts:117`, `:119`, `:121` | ✅ |
| QST-65 `b` | first blocking, focus on the list; next and around; `nenhuma bloqueante` for 4 s | `test/unit/tui-keys.test.ts:243`, `:250`–`:258`, `:266` `until: v.squad.now + 4000` | ✅ ⚠️ G5 |
| QST-66 `enter` on the feed | the tab, the question, the modal; any other line, the thread | `test/unit/tui-keys.test.ts:197`, `:202`, `:572` · mutant K11 killed by `TUI-62: enter opens the thread…` | ✅ |
| QST-67 `enter` on the tab | the modal of the selected one; nothing on an empty list | `test/unit/tui-keys.test.ts:208`–`:216` | ✅ ⚠️ G5 |
| QST-68 the selection follows the question | by id; the first when it left | `test/unit/tui-keys.test.ts:539`, `:542`, `:550`, `:553` · `test/unit/tui-loop.test.ts:436` | ✅ |
| QST-69 frame 04 | the 40 lines, but for D1 and D2 | `test/unit/tui-frames.test.ts:40` `expect(drawn.map((line, y) => \`${y} ${line}\`)).toEqual(expected(id).lines.map(…))`, `:89`–`:94` | ✅ |
| QST-70 the modal | over the gray tab, title, lines in order | `test/unit/tui-answer.test.ts:76`–`:77`, `:116`, `:152`–`:160`, `:171`–`:177` | ✅ |
| QST-71 the mode it opens in | choice with `outra resposta…` and its footer; text without options | `test/unit/tui-answer.test.ts:78`, `:107`, `:140`–`:144`, `:287`–`:288` · `test/unit/tui-keys.test.ts:197`, `:202` | ✅ |
| QST-72 keys of the choice mode | digit, `j`/`k`/arrows, `enter` | `test/unit/tui-keys.test.ts:310`–`:315`, `:332`–`:338`, `:343` | ✅ |
| QST-73 the text mode | default line of a non-blocking one, field of 3 or 8, count, warning, footer | `test/unit/tui-answer.test.ts:199`–`:211`, `:220`–`:241`, `:246`–`:247`, `:272` · no blocking question with a default | ❌ gap 4 |
| QST-74 keys of the text mode | character, backspace, `ctrl+u`, `ctrl+e`; `q` and the others are text | `test/unit/tui-keys.test.ts:349`, `:353`, `:358`–`:365`, `:370` | ✅ |
| QST-75 a text that does not fit | `…` and the end; the last 6 lines | `test/unit/tui-answer.test.ts:253`, `:256`–`:257`, `:263`–`:266` | ✅ |
| QST-76 `enter` sends | `POST /answer` `{ human_token, question_id, answer }` trimmed; nothing if blank | `test/unit/tui-keys.test.ts:375`, `:384` · `test/unit/tui-writer.test.ts:25` · `test/unit/tui-loop.test.ts:326` | ✅ |
| QST-77 accepted | modal closed, `✓ Q-NN respondida`, green, 4 s | `test/unit/tui-keys.test.ts:448` · `test/unit/tui-loop.test.ts:337`–`:338` | ✅ |
| QST-78 a pasted line break | a space, nothing sent | `test/unit/tui-keys.test.ts:418`–`:427`, `:433`–`:434` · `test/unit/tui-loop.test.ts:394`–`:397` | ✅ ⚠️ G7 |
| QST-79 one send at a time | no other `POST`, no key changes the modal | `test/unit/tui-keys.test.ts:391`–`:392` · `test/unit/tui-loop.test.ts:333`–`:334` | ✅ |
| QST-80 the refused modal | text sent, red border, the two lines of the default for a non-blocking one, `esc fechar`, only `esc` | `test/unit/tui-answer.test.ts:370`–`:381`, `:390`, `:399`–`:410`, `:417`–`:425` · `test/unit/tui-keys.test.ts:412`–`:413`, `:454`, `:461` · no blocking question with a default | ❌ gap 4 |
| QST-81 any other failure | modal kept, `✗ resposta não enviada · <erro>`, red, 4 s; 2000 ms | `test/unit/tui-keys.test.ts:471` · `test/unit/tui-writer.test.ts:38`, `:57`, `:98`–`:101` (1999 ms no, 2000 ms yes) · `test/unit/tui-loop.test.ts:410`–`:411` | ✅ |
| QST-82 a read closes the modal | `⟳ default aplicado` yellow, or `Q-NN fechada`; waits a send; gone closes even refused | `test/unit/tui-keys.test.ts:490`, `:493`, `:497`, `:500`, `:506`, `:514`, `:519`, `:529` · `test/unit/tui-loop.test.ts:436`–`:438` · `test/integration/tui.test.ts:230` | ✅ ⚠️ G4 |
| QST-83 the credential | read at the send; without it no send and the notice; never drawn | `test/unit/tui-keys.test.ts:478` · `test/unit/tui-loop.test.ts:351`–`:353`, `:358`, `:361`–`:362` · `test/integration/tui.test.ts:133`–`:142`, `:242` · `test/unit/config.test.ts:49` | ✅ (gap 6 on the terminal entry) |
| QST-84 the broker does not answer | no modal and the notice; an open modal unchanged, drawn again | `test/unit/tui-keys.test.ts:569`, `:572`, `:574`, `:579`–`:580` · `test/unit/tui-loop.test.ts:457`–`:460`, `:469` | ✅ |
| QST-85 `esc` and `ctrl+c` | closed without sending, same selection; quits | `test/unit/tui-keys.test.ts:398`–`:401`, `:406` | ✅ |
| QST-86 the only `POST` | `/answer`, by the `enter` of the modal | `test/unit/tui-writer.test.ts:112`–`:114` · `test/unit/tui-loop.test.ts:373`, `:381`–`:385` · `test/integration/tui.test.ts:237`–`:238` | ✅ |
| QST-87 frames 05, 06, 07, 20a, 20b | the 40 lines, but for D1 and D2 | `test/unit/tui-frames.test.ts:40` (five cases), `:107`–`:118` | ✅ |
| QST-88 the legend | the four lines of Question; gate and permission empty | `test/unit/tui-frames.test.ts:151`–`:153`, `:132` | ✅ |
| QST-89 the table of deviations | no D3 in the six frames; no reason of the slice Question | `test/unit/tui-frames.test.ts:82`, `:100`, `:157`, `:160`–`:161` | ✅ |
| QST-90 the frame files | output of `extract.ts`; the 41 identical to `main` | no test. By command: the extraction of `Squad TUI.dc.html` into an empty directory gives 47 files equal to the repository's modulo line endings, the six new ones byte-identical; `git diff --stat 9a4d921..HEAD -- 'broker/test/frames/*.txt'` and the same against `main` show six added files and no other. `test/unit/tui-glyphs.test.ts:10` counts 47 | ✅ by command |
| QST-91 `g`, `x`, `4`, `enter` | `chega com a fatia Gate`; never `chega com a fatia Question` | `test/unit/tui-keys.test.ts:119`–`:120`, `:126`–`:127` | ✅ |
| QST-92 a chain of three | the three with the same `answer_seq`, one delivery each | `test/unit/question-merge.test.ts:288`–`:296` | ✅ |
| QST-93 one delivery per name, none for the author | once | `test/unit/question-merge.test.ts:306`, `:313`, `:327` | ✅ |
| QST-94 a recipient that is offline | stored; delivery pending until it registers | `test/unit/question-ask.test.ts:400`–`:405` | ✅ |
| QST-95 the holder leaves | `open`, same holder | `test/unit/question-escalate.test.ts:311`, `:319` | ✅ |
| QST-96 what does not fit | broken or cut with `…` inside the box | `test/unit/tui-questions.test.ts:131`–`:140`, `:276`–`:293` · `test/unit/tui-answer.test.ts:304`–`:325`, `:333`–`:358` | ✅ |
| QST-97 more questions than lines | whole questions, the selected one visible | `test/unit/tui-questions.test.ts:154`–`:167` | ✅ |
| QST-98 after the deadline | `timeout 0:00` in the list, the detail and the title | `test/unit/tui-asked.test.ts:185`–`:187` · `test/unit/tui-questions.test.ts:100`, `:267`–`:268` · `test/unit/tui-answer.test.ts:295` | ✅ |

**Status**: 88 of 98 match the outcome of the spec in full. Ten have one clause that no assertion would catch: QST-10, QST-12, QST-16, QST-22, QST-29, QST-34, QST-36, QST-37, QST-73, QST-80. Eight carry a spec-precision gap that is not a functional hole: QST-05, QST-56, QST-58, QST-62, QST-65, QST-67, QST-78, QST-82. QST-90 holds by command and has no test, as the coverage matrix says.

## Edge cases

- [x] QST-92: a chain of three closes with one `answer_seq` and one delivery each.
- [x] QST-93: one delivery per name, none for the author, in the three cases the AC names.
- [x] QST-94: a question to an offline peer is stored and waits.
- [x] QST-95: the question stays with a holder that left, by `unregister` and by a dead pid.
- [x] QST-96: list, detail, history and modal break or cut inside their boxes.
- [x] QST-97: seven questions, the selected one drawn whole at the three positions.
- [x] QST-98: `timeout 0:00` in the list, the detail and the title of the modal.

## Spec-precision gaps

None of these is a functional hole. Each is an outcome the spec does not state, which the code decides.

| # | AC | What the spec leaves open | What the code does | Pinned by a test? |
| - | -- | ------------------------- | ------------------ | ----------------- |
| G1 | QST-62 | What the line after the four shows when none is below (`n` = 0) | Nothing | Yes, `test/unit/tui-questions.test.ts:334` |
| G2 | QST-56, QST-58 | Which of `opções …` and `default …` a blocking question without options, or a non-blocking one with options, shows | Options when it blocks or has options; default otherwise | Yes, `test/unit/tui-questions.test.ts:87`, `:225` |
| G3 | QST-56 | Whether the `▶` of the selected question depends on the focus | Only with the focus on the list, as the prototype | No (mutant Q01 survives) |
| G4 | QST-82 | A send in course whose question is gone from the open feature: the second and the third sentence both apply | The modal waits for the broker | No (mutant K08 survives) |
| G5 | QST-67, QST-65 | `enter` with the focus on the history; `b` inside the tab with the focus on the history | `enter` opens the modal of the selected question; `b` moves the focus to the list | No (mutant K21 survives) |
| G6 | QST-05, QST-43 | Whether `null` in an optional field is absent; what an empty `default` on a blocking question means | `null` is present and refused with `missing_field`; `""` is stored and closes the question as `defaulted` at the end of the feature | `null` yes, `test/unit/question-ask.test.ts:207`, `:227`–`:235`; `""` only inside the generated sequences |
| G7 | QST-78 | At which moment of a chunk the mode is read | At its start: `4\rtexto\r` in the choice mode, or `\rtexto\r` on the tab, sends `texto` | Partly, `test/unit/tui-keys.test.ts:425` |

## Test integrity

`git diff 9a4d921..HEAD -- broker/test` touches 21 files that existed. No test was deleted, no assertion weakened, no skip added. The nine titles that left pre-existing files are the ones the orchestrator authorized:

| Change | Where | Verdict |
| ------ | ----- | ------- |
| Whole-object literals gain the keys of new fields | `test/unit/derive-squad.test.ts:192` (TUI-06, nine keys), `test/unit/tui-keys.test.ts:26` (`START`), `test/frames/view.ts:26`, `test/unit/tui-loop.test.ts:84` and `test/integration/tui.test.ts:97` (`token`) | As claimed |
| Counts and lists updated to new true values | `test/unit/tui-glyphs.test.ts:10` (41 → 47); `test/unit/tools.test.ts:15`, `:47`, `:51`, `:55`, `:190`; `test/integration/server-tools.test.ts:44`–`:52`; `test/integration/server-feature.test.ts:59`; `test/integration/server.test.ts:123`, `:209` (`question.ts`) | As claimed. Four titles of `tools.test.ts` gained `QST-52` |
| TUI-63 for `4` and `enter` superseded | `test/unit/tui-keys.test.ts:115` keeps `g` and `x` and adds the screen `questions`; `:193` is QST-66 | As claimed |
| The tests of `b` superseded | `test/unit/tui-keys.test.ts:240`, `:247`, `:261` (QST-65) | As claimed. The third keeps its two frames and adds three screens |
| TUI-49 loses the four lines of Question | `test/unit/tui-frames.test.ts:132` | As claimed |
| `TUI-43: frame …` title built from a parameter | `test/unit/tui-frames.test.ts:25`, `:35` | Same title for the 38 old cases |
| Frame files | `test/frames/*.txt` | Six added, none changed |

Three changes go beyond the list the orchestrator gave. None weakens a test; all three are in test support, and each is backed by the spec:

1. **`test/frames/logs.ts:207`–`:228`, `:249`–`:251`: the `body` of eight `question` events of the scenarios that the 41 old frames read was rewritten, and `why` and `options` were added to seven.** Example: seq 420 lost `A spec não define. Pausando TKT-12 até a resposta.` The Assumptions row "Logs dos frames novos" and T21 ask for it. The 41 old frame files and their deviations did not move, and the old frame tests pass on the new input.
2. **`test/frames/deviations.ts:164`: the reason of the D2 panel of frame 10 lost `or of the slice Question`.** The lines it deviates are the same. QST-89 forbids a reason of the slice Question and the Out of Scope row keeps this D2. The regex at `test/unit/tui-frames.test.ts:161` would fail on the old wording.
3. **`test/frames/deviations.ts:371`–`:372`: the D3 of frame 11 went from twelve lines to eight and its reason was rewritten** (QST-88, which TUI-49 covers), and the seal of frame 10 became the constant `KEY_SEAL` with the same text.

## Frames

Extraction: `bun test/frames/extract.ts` over the copy of `Squad TUI.dc.html`, into a new empty directory under the scratchpad. Exit 0, 61 files. The 47 of the repository are equal to it modulo line endings; `04`, `05`, `06`, `07`, `20a` and `20b` are byte-identical.

Every difference between each drawn frame and the prototype was printed and read:

| Frame | Deviations | What they are | Holds? |
| ----- | ---------- | ------------- | ------ |
| 04 | 6, D1 | Route of Q-08 in the list, of Q-10 and Q-05 in the history, without `mot`; count 5 → 6; the fifth entry gives way to `+2 mais antigas …` | Yes |
| 05 | 5, D1 | The same history | Yes |
| 06 | 7, D1 | The same, and the route of Q-08 in the detail and in the modal | Yes |
| 07 | 5, D1 | The same; the modal covers the rest | Yes |
| 20a | 25, D1 and D2 | The seal of frame 10 (D1); the effect of Q-09 written by hand (D2), one line where the frame has two, so the box is one line shorter and starts one line below; Q-04 in the history (D1) | Yes |
| 20b | 3, D1 | Route of Q-08 in the modal; count 7 → 8; `+3` → `+4` | Yes |

The route without `mot` is not a bug in the drawing. The log of the scenario has `w2 → ldr` and `mot → hum` for Q-08, Q-10 and Q-05 and no `ldr → mot`; `.design/squad-mvp.md` line 490 says the route shown is the sequence of the `question` events and calls the missing hop an omission of the mock. Q-07, whose three `question` events are in the log, is drawn `w1 → ldr → mot → dev` with no deviation in the same frames, and every test over a real broker draws the full route (`test/unit/tui-questions.test.ts:87`). The block of frame 20a is built from the frame's own lines 9 to 25 moved one line down (`test/frames/deviations.ts:391`–`:404`), so the content of the modal is still compared with the prototype; `test/unit/tui-answer.test.ts:106` asserts the same shift on its own.

## Discrimination sensor

Critical-path depth: 149 behaviour-level mutations, one at a time, in a `git worktree` at `HEAD` under the scratchpad, with `bun install --frozen-lockfile` run once in it. Each mutation ran the test files of its layer and was reverted. The ten survivors were run again under the whole suite, and survived it. No stash. The worktree was removed with `git worktree remove --force`. `git status --porcelain` of the real tree was empty before and empty after.

**Result: 139 killed, 10 survived. FAIL.**

| File | Mutations | Killed | Survived |
| ---- | --------- | ------ | -------- |
| `question.ts` | 38 | 36 | 2 (M10b, X01) |
| `log.ts` | 6 | 6 | 0 |
| `send.ts` | 3 | 3 | 0 |
| `broker.ts` | 9 | 6 | 3 (B04, B06, B08) |
| `shared/derive.ts` | 14 | 14 | 0 |
| `tools.ts`, `server.ts` | 3 | 3 | 0 |
| `tui/keys.ts` | 27 | 25 | 2 (K08, K21) |
| `tui/writer.ts` | 5 | 5 | 0 |
| `tui.ts` | 7 | 6 | 1 (T07) |
| `tui/asked.ts` | 9 | 9 | 0 |
| `tui/screens/questions.ts` | 16 | 15 | 1 (Q01) |
| `tui/screens/answer.ts` | 11 | 10 | 1 (N01) |
| `tui/screens/help.ts` | 1 | 1 | 0 |

The survivors:

| Id | `file:line` | Fault | Spec | Class |
| -- | ----------- | ----- | ---- | ----- |
| B08 | `broker.ts:57` | `createSend(log)`: `/send` never calls `delivered` | QST-36 | Defined behaviour. Gap 1 |
| M10b | `question.ts:73` | The recursive step of the followers takes a question that already closed | QST-37 | Defined behaviour. Gap 2 |
| X01 | `question.ts:351` | `/merge-question` writes its event and its row outside one transaction | QST-12 | Defined behaviour. Gap 3 |
| N01 | `tui/screens/answer.ts:73` | A blocking question with a default shows the default line and `default aplicado` | QST-73, QST-80 | Defined behaviour. Gap 4 |
| B04 | `broker.ts:71` | The deadlines are checked every 2000 ms | QST-34 | Defined behaviour. Gap 5 |
| T07 | `tui.ts:233` | The TUI started from the terminal gets `token: () => null` | QST-83 | Defined behaviour, in the block no test reaches without a terminal. Gap 6 |
| B06 | `broker.ts:190` | `/ask` answers `missing_field` before it looks for the peer | QST-10 | Defined order. Inserted check, not a change of a line. Gap 7 |
| K08 | `tui/keys.ts:207` | A question that is gone closes the modal of an answer on its way | QST-82 | Unspecified, G4 |
| K21 | `tui/keys.ts:132` | `enter` with the focus on the history opens no modal | QST-67 | Unspecified, G5 |
| Q01 | `tui/screens/questions.ts:105` | The `▶` stays with the focus on the history | QST-56 | Unspecified, G3 |

Every mutation, with the first test that failed:

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| M01 | `question.ts:131` | ask: too_many_options checked before invalid_field (QST-10) | ✅ Killed · `QST-10: invalid_field comes before too_many_options` |
| M02 | `question.ts:227` | escalate: not_holder before question_closed (QST-16) | ✅ Killed · `QST-16: question_closed comes before not_holder` |
| M03 | `question.ts:290` | answer: not_holder before question_closed (QST-22) | ✅ Killed · `QST-22: question_closed comes before not_holder` |
| M04 | `question.ts:290` | answer: holder check removed (QST-22, QST-27) | ✅ Killed · `QST-22: who is not the holder of an open question is refused with not_holder` |
| M05 | `question.ts:66` | resolve: re-read of the status removed (QST-38) | ✅ Killed · `QST-22: a question that is answered is refused with question_closed` |
| M05b | `question.ts:66` | resolve: only an answered question is closed (QST-38, QST-44) | ✅ Killed · `QST-22: a question that is defaulted is refused with question_closed` |
| M06 | `question.ts:85` | resolve: the author of the answer gets a delivery (QST-23, QST-93) | ✅ Killed · `QST-93: who writes the answer gets no delivery for the merged question it asked` |
| M07 | `question.ts:83` | resolve: mother not told of the answer of the dev (QST-25) | ✅ Killed · `QST-25: the answer of the dev leaves a pending delivery for who asked and one for the mother` |
| M08 | `question.ts:83` | resolve: mother told of every answer (QST-23, QST-33) | ✅ Killed · `QST-23: the answer leaves one pending delivery, for who asked, and none for who wrote it` |
| M09 | `question.ts:73` | followers: not recursive (QST-92) | ✅ Killed · `QST-92: the answer to the end of a chain of three closes the three with the same answer_seq,…` |
| M10 | `question.ts:71` | followers: a merged question already closed follows again (QST-37) | ✅ Killed · `QST-31: a question that is not merged any more does not follow the answer, nor the ones merg…` |
| M10b | `question.ts:73` | followers: an indirect one already closed follows again (QST-37) | ❌ Survived |
| M11 | `question.ts:98` | resolve: a default leaves the row answered (QST-33) | ✅ Killed · `QST-43: a feature closed as delivered closes its open and merged questions by their default …` |
| M12 | `question.ts:369` | expire: off by one at the deadline (QST-33) | ✅ Killed · `QST-43: a feature closed as delivered closes its open and merged questions by their default …` |
| M13 | `question.ts:369` | expire: a merged question closes by its own deadline (QST-32) | ✅ Killed · `QST-32: a merged question that reached the dev does not close by its own deadline a day later` |
| M14 | `question.ts:385` | delivered: a blocking question closes by the result (QST-39) | ✅ Killed · `QST-39: a blocking question of the ticket, a non-blocking one of another ticket, one without…` |
| M15 | `question.ts:385` | delivered: a merged question is not closed by the result (QST-36, QST-37) | ✅ Killed · `QST-37: the result closes a merged question and the ones merged into it, and the question it…` |
| M16 | `question.ts:385` | delivered: descending id (QST-36) | ✅ Killed · `QST-36: the result of a worker closes its two non-blocking questions of the ticket in ascend…` |
| M16b | `question.ts:385` | delivered: questions of another ticket close too (QST-39) | ✅ Killed · `QST-48/45/38: after each step of 200 generated sequences of 40 calls, the table of each feat…` |
| M16c | `question.ts:385` | delivered: questions of another worker close too (QST-39) | ✅ Killed · `QST-48/45/38: after each step of 200 generated sequences of 40 calls, the table of each feat…` |
| M17 | `question.ts:55` | deadline: a blocking question gets one (QST-04, QST-18, QST-40) | ✅ Killed · `QST-04: a blocking question to human and a non-blocking one to a peer have no deadline` |
| M18 | `question.ts:174` | ask: a delivery for human (QST-03) | ✅ Killed · `QST-03: a question to human leaves no delivery` |
| M18b | `question.ts:252` | escalate: a delivery for human (QST-17) | ✅ Killed · `QST-17: the mother that escalates sends the question to human, with no delivery` |
| M19 | `question.ts:340` | merge: merge_not_allowed before question_closed (QST-29) | ✅ Killed · `QST-29: question_closed comes before merge_not_allowed` |
| M20 | `question.ts:248` | escalate: summary of the first question, not of the latest (QST-14) | ✅ Killed · `QST-14: summary and body that are not sent come from the latest question, not from the first` |
| M21 | `question.ts:314` | answerAsHuman: token not checked (QST-26) | ✅ Killed · `QST-26/28: /answer without human_token and with an unknown id answers unknown_peer, and with…` |
| M22 | `question.ts:91` | resolve: summary not cut at 80 (QST-20) | ✅ Killed · `QST-20: the summary is the label of the question and the answer, cut at 80 characters, and t…` |
| M23 | `question.ts:337` | merge: a question merged into itself (QST-29) | ✅ Killed · `QST-29: a question merged into itself, or an id no row has, is refused with invalid_field` |
| M24 | `question.ts:33` | escalate: the leader escalates straight to human (QST-13) | ✅ Killed · `QST-20: the answer of a holder the question was escalated to goes to who asked, not to who e…` |
| M25 | `question.ts:265` | escalate: no deadline when it reaches the dev (QST-18) | ✅ Killed · `QST-13: from the worker to the dev the question is stored three times with the same id and t…` |
| M26 | `question.ts:163` | ask: id by count, not by the greatest (QST-01) | ✅ Killed · `QST-01: the id is the greatest of the table plus one, in the feature that is open` |
| M27 | `question.ts:21` | ask: default timeout 241 s (QST-04) | ✅ Killed · `QST-04: without timeout_s the deadline is 240000 ms after the event, and timeout_s stays null` |
| M28 | `question.ts:18` | ask: 4 options accepted (QST-07) | ✅ Killed · `QST-07: a question with 4 options is refused with too_many_options, and one with 3 is accepted` |
| M29 | `question.ts:83` | resolve: mother told of every answer but the one of the dev (QST-25) | ✅ Killed · `QST-23: the answer leaves one pending delivery, for who asked, and none for who wrote it` |
| M30 | `question.ts:298` | answer: the dev resolves as agent (QST-24) | ✅ Killed · `QST-13/24: a question of a worker goes up by two escalations to the dev, and the answer with…` |
| L01 | `log.ts:142` | close: questions not closed with the feature (QST-43) | ✅ Killed · `QST-43: a feature closed as delivered closes its open and merged questions by their default …` |
| L02 | `log.ts:142` | close: merged questions not closed (QST-43) | ✅ Killed · `QST-43: a feature closed as delivered closes its open and merged questions by their default …` |
| L03 | `log.ts:142` | close: questions of another feature closed too (QST-43) | ✅ Killed · `QST-43: the closing of a feature does not touch the questions of the one closed before it` |
| L04 | `log.ts:141` | close: every question discarded (QST-43) | ✅ Killed · `QST-43: a feature closed as delivered closes its open and merged questions by their default …` |
| L05 | `log.ts:94` | write: explicit recipients ignored (QST-03, QST-23) | ✅ Killed · `QST-03: with recipients the event leaves one pending delivery for each of those names, whate…` |
| L06 | `log.ts:90` | write: column question_id not filled (QST-02, QST-50) | ✅ Killed · `QST-50: a record with question_id fills the column, and history by question_id answers every…` |
| S01 | `send.ts:282` | send: afterResult not called (QST-36) | ✅ Killed · `QST-48/45/38: after each step of 200 generated sequences of 40 calls, the table of each feat…` |
| S02 | `send.ts:282` | send: afterResult before the unblocked (QST-36 order) | ✅ Killed · `QST-36: the result of a blocked worker with a non-blocking question open is followed by the …` |
| S03 | `send.ts:41` | send: hint of an answer names /ask (QST-11) | ✅ Killed · `QST-11: a question, an answer and a question_merged sent here are refused with invalid_kind,…` |
| B01 | `broker.ts:184` | broker: a human_token that is not a string falls to the path of the peer (QST-26) | ✅ Killed · `QST-26/28: /answer without human_token and with an unknown id answers unknown_peer, and with…` |
| B02 | `broker.ts:71` | broker: no periodic check of the deadlines (QST-34) | ✅ Killed · `QST-34: a non-blocking question with timeout_s 1 that reaches the dev has the answer of the …` |
| B03 | `broker.ts:70` | broker: no check of the deadlines at startup (QST-34, QST-35) | ✅ Killed · `QST-35: a broker that comes up again over a question whose deadline passed has the answer of…` |
| B04 | `broker.ts:71` | broker: deadlines checked every 2000 ms (QST-34) | ❌ Survived |
| B05 | `broker.ts:188` | broker: /answer of a peer not served (QST-20) | ✅ Killed · `QST-26/28: /answer without human_token and with an unknown id answers unknown_peer, and with…` |
| B06 | `broker.ts:190` | broker: /ask answers missing_field before unknown_peer (QST-10 order) | ❌ Survived |
| B07 | `broker.ts:45` | broker: /merge-question is no route (QST-30) | ✅ Killed · `QST-28: /merge-question with an id that is not registered, or a body that is not a JSON obje…` |
| B08 | `broker.ts:57` | broker: /send not wired to delivered (QST-36 in the real process) | ❌ Survived |
| B09 | `broker.ts:56` | broker: the question module gets another credential (QST-24) | ✅ Killed · `QST-13/24: a question of a worker goes up by two escalations to the dev, and the answer with…` |
| D01 | `shared/derive.ts:341` | questions: every own answer is answered (QST-46) | ✅ Killed · `QST-46: a question with an answer of its own of timeout_default or of result_default is defa…` |
| D02 | `shared/derive.ts:362` | questions: a chain of merges is followed one step (QST-46) | ✅ Killed · `QST-46: in a chain of three merged questions the two above take the status and the answer_se…` |
| D03 | `shared/derive.ts:362` | questions: a merged question with its own answer takes the one of its destination (QST-46) | ✅ Killed · `a merged question with an answer of its own closes alone` |
| D04 | `shared/derive.ts:378` | questions: merged wins over feature_closed (QST-46 order) | ✅ Killed · `QST-46: with the feature_closed of the feature, a question without an answer is defaulted wh…` |
| D05 | `shared/derive.ts:136` | owed: a closed question is owed (QST-51) | ✅ Killed · `TUI-07, TUI-08: any agent out of turn owes the answer of an open question it holds` |
| D06 | `shared/derive.ts:136` | owed: seq of the first question (QST-51) | ✅ Killed · `TUI-07, TUI-08: any agent out of turn owes the answer of an open question it holds` |
| D07 | `shared/derive.ts:304` | questions: text is the summary (QST-49) | ✅ Killed · `QST-49: the text is the body of the first question, or its summary when the body is empty, w…` |
| D08 | `shared/derive.ts:331` | questions: timeout_s not read (QST-49) | ✅ Killed · `QST-49: timeout_s and the arrival come from the first question to human` |
| D09 | `shared/derive.ts:353` | questions: absorbed not filled (QST-49) | ✅ Killed · `QST-49: absorbed has the ids of the questions merged straight into it, in the order they wer…` |
| D10 | `shared/derive.ts:369` | questions: a merged one does not take the answer_seq (QST-46) | ✅ Killed · `QST-46: a merged question without an answer of its own takes the status and the answer_seq o…` |
| D11 | `shared/derive.ts:380` | questions: open true for merged and discarded (QST-47) | ✅ Killed · `TUI-06: a merged question leaves the open ones and closes with the one it was merged into` |
| D12 | `shared/derive.ts:375` | questions: feature_closed ignored (QST-46) | ✅ Killed · `QST-46: with the feature_closed of the feature, a question without an answer is defaulted wh…` |
| D13 | `shared/derive.ts:345` | questions: author of the answer not kept (QST-49) | ✅ Killed · `QST-49: closed_ts is the ts of its own answer, or of the question_merged without one, and an…` |
| D14 | `shared/derive.ts:352` | questions: hour of the merge not kept (QST-49) | ✅ Killed · `QST-49: closed_ts is the ts of its own answer, or of the question_merged without one, and an…` |
| K01 | `tui/keys.ts:90` | press: q quits with the modal open (QST-74) | ✅ Killed · `QST-72: in the choice mode a letter does nothing: q does not quit and b does not leave the m…` |
| K02 | `tui/keys.ts:53` | modal: keys work while an answer is on its way (QST-79) | ✅ Killed · `QST-79: while the answer waits for the broker no key changes the state, and ctrl+c quits` |
| K03 | `tui/keys.ts:53` | modal: keys work while the broker is down (QST-84) | ✅ Killed · `QST-84: while the broker does not answer no key changes an open modal, and ctrl+c quits` |
| K04 | `tui/keys.ts:191` | settle: question_closed is any other error (QST-80) | ✅ Killed · `QST-80: when the broker says the question closed the modal turns refused, in the text mode w…` |
| K05 | `tui/keys.ts:189` | settle: the modal stays after an accepted answer (QST-77) | ✅ Killed · `QST-77: when the broker takes the answer the modal closes and the footer says so in green fo…` |
| K06 | `tui/keys.ts:207` | sync: closes the modal of an answer on its way (QST-82) | ✅ Killed · `QST-79, QST-80: the modal of an answer on its way waits for what the broker says, also when …` |
| K07 | `tui/keys.ts:207` | sync: a refused modal stays when its question is gone (QST-82) | ✅ Killed · `QST-82: a modal whose question is not among the ones of the open feature is closed, refused …` |
| K08 | `tui/keys.ts:207` | sync: a question that is gone closes the modal of an answer on its way (QST-82, unspecified) | ❌ Survived |
| K09 | `tui/keys.ts:44` | keysOf: enter alone becomes a space (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and…` |
| K10 | `tui/keys.ts:44` | keysOf: line breaks become spaces in the choice mode too (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and…` |
| K11 | `tui/keys.ts:135` | press: enter on the question of a question that is not with the dev opens its modal (QST-66) | ✅ Killed · `TUI-62: enter opens the thread, from its latest entry, of the ticket of the selected line` |
| K12 | `tui/keys.ts:173` | press: b stays on the selected blocking question (QST-65) | ✅ Killed · `QST-65: b on the tab selects the blocking question after the selected one in the order of th…` |
| K13 | `tui/keys.ts:173` | press: b does not go around (QST-65) | ✅ Killed · `QST-65: b on the tab selects the blocking question after the selected one in the order of th…` |
| K14 | `tui/keys.ts:28` | history: five resolved scroll (QST-62, QST-63) | ✅ Killed · `QST-63: with the focus on the history j, k and the arrows move it by one question, not befor…` |
| K14b | `tui/keys.ts:28` | history: the offset leaves three on the screen (QST-63) | ✅ Killed · `QST-63: with the focus on the history j, k and the arrows move it by one question, not befor…` |
| K15 | `tui/keys.ts:73` | modal: the answer is sent with the spaces of its ends (QST-76) | ✅ Killed · `QST-76: enter with a text leaves it to send without the spaces of its ends, and the modal waits` |
| K16 | `tui/keys.ts:64` | modal: the digit of the other answer does nothing (QST-72) | ✅ Killed · `QST-72: in the choice mode a digit selects the line of its number, the last one being the ot…` |
| K17 | `tui/keys.ts:100` | press: enter opens the modal with the broker down (QST-84) | ✅ Killed · `QST-84: while the broker does not answer, enter over a question says that answering is disab…` |
| K18 | `tui/keys.ts:56` | modal: keys change a refused modal (QST-80) | ✅ Killed · `QST-80: only esc closes the modal of a refused answer` |
| K19 | `tui/keys.ts:202` | sync: the selection does not leave a question that left the list (QST-68) | ✅ Killed · `QST-68: the selection follows its question when the order of the list changes` |
| K20 | `tui/keys.ts:211` | sync: every closing says default applied (QST-82) | ✅ Killed · `QST-82: a read that shows the question of the modal closed closes the modal, with the notice…` |
| K21 | `tui/keys.ts:132` | press: enter with the focus on the history opens no modal (no AC) | ❌ Survived |
| K22 | `tui/keys.ts:174` | press: b leaves the focus where it was (QST-65) | ✅ Killed · `QST-65: b outside the tab shows it with the first blocking question of the list selected and…` |
| K23 | `tui/keys.ts:18` | notice lasts 5 s (QST-65, QST-77, QST-81) | ✅ Killed · `TUI-63, QST-91: g and x say for 4 s that the Gate slice brings them and do not change the sc…` |
| K24 | `tui/keys.ts:67` | modal: the other answer keeps a text left from before (QST-72) | ✅ Killed · `QST-72: enter over an option leaves its text to send, and over the other answer goes to the …` |
| K25 | `tui/keys.ts:130` | press: h moves the focus outside the tab (QST-63) | ✅ Killed · `QST-63: h moves the focus of the tab between the list and the history, and does nothing outs…` |
| W01 | `tui/writer.ts:28` | writer: a status that is not 200 is read as an answer (QST-81) | ✅ Killed · `QST-81: status 500 with a body that says ok is the broker not answering` |
| W02 | `tui/writer.ts:12` | writer: gives up after 3000 ms (QST-81) | ✅ Killed · `QST-81: with no answer in 2000 ms the writer gives up and says the broker did not answer` |
| W03 | `tui/writer.ts:25` | writer: the credential goes as id (QST-76) | ✅ Killed · `QST-76, QST-79: enter in the modal makes one POST /answer with the credential of io.token(),…` |
| W04 | `tui/writer.ts:36` | writer: the error of a refusal is lost (QST-80, QST-81) | ✅ Killed · `QST-80, QST-81: a broker that fails leaves the modal to send again with the error in the foo…` |
| W05 | `tui/writer.ts:35` | writer: an ok that is not true is taken (QST-81) | ✅ Killed · `QST-81: an ok that is not a boolean is the broker not answering` |
| T01 | `tui.ts:170` | loop: a key while an answer is on its way posts again (QST-79) | ✅ Killed · `QST-76, QST-79: enter in the modal makes one POST /answer with the credential of io.token(),…` |
| T02 | `tui.ts:137` | loop: sync not applied after a read (QST-68, QST-82) | ✅ Killed · `QST-76, QST-80, QST-86: over a real broker the TUI, fed with keys, answers one question by a…` |
| T03 | `tui.ts:148` | loop: sends without a credential (QST-83) | ✅ Killed · `QST-83: without a credential nothing is sent, the modal stays and the footer says so` |
| T04 | `tui.ts:109` | loop: the modal is not drawn (QST-70) | ✅ Killed · `QST-76, QST-80, QST-86: over a real broker the TUI, fed with keys, answers one question by a…` |
| T05 | `tui.ts:58` | credential: an empty file is a credential (QST-83) | ✅ Killed · `QST-83: the credential is what the file of SQUAD_TOKEN_FILE has when it is asked for, and nu…` |
| T06 | `tui.ts:164` | loop: keysOf not applied to the input (QST-78) | ✅ Killed · `QST-78: a pasted chunk with line breaks goes into the text of the modal and sends nothing` |
| T07 | `tui.ts:233` | entry: the TUI started from the terminal has no credential (wiring, QST-83) | ❌ Survived |
| A01 | `tui/asked.ts:13` | waiting: blocking ones from the latest arrival (QST-55) | ✅ Killed · `QST-55: waiting has the blocking ones from the oldest arrival, then the others from the near…` |
| A02 | `tui/asked.ts:14` | waiting: non-blocking ones by arrival, not by deadline (QST-55) | ✅ Killed · `QST-55: waiting has the blocking ones from the oldest arrival, then the others from the near…` |
| A03 | `tui/asked.ts:11` | waiting: questions an agent holds are listed (QST-55) | ✅ Killed · `QST-55: a question with an agent, a closed one and a merged one are not in waiting` |
| A04 | `tui/asked.ts:20` | resolved: oldest first (QST-60) | ✅ Killed · `QST-60: resolved has every question that is not open, from the latest resolution to the oldest` |
| A05 | `tui/asked.ts:46` | left: negative after the deadline (QST-98) | ✅ Killed · `QST-98: the title of the modal shows `timeout 0:00` once the deadline of the question passed` |
| A06 | `tui/asked.ts:34` | outcome: a merged one closed by its own result says merged (QST-61) | ✅ Killed · `QST-61: a merged question closed by the result of who asked it shows its own default` |
| A07 | `tui/asked.ts:20` | resolved: a merged one without answer is left out (QST-60) | ✅ Killed · `QST-69: frame 04 of the tab of questions` |
| A08 | `tui/asked.ts:13` | waiting: blocking ones left out (QST-55) | ✅ Killed · `QST-70: the modal is drawn over the tab of questions in gray, with an empty margin around it…` |
| A09 | `tui/asked.ts:25` | effect: a non-blocking question with ticket says the ticket is taken again (QST-59) | ✅ Killed · `QST-73: the modal of a non-blocking question in the text mode is the one of frame 06, with i…` |
| Q01 | `tui/screens/questions.ts:105` | list: the mark stays with the focus on the history (QST-56, unspecified) | ❌ Survived |
| Q02 | `tui/screens/questions.ts:175` | history: five resolved show four (QST-62) | ✅ Killed · `QST-60, QST-61, QST-62: with five resolved questions the history shows the five, as frame 04…` |
| Q03 | `tui/screens/questions.ts:189` | history: +0 mais antigas at the end (QST-62, unspecified) | ✅ Killed · `QST-60, QST-61, QST-62: with five resolved questions the history shows the five, as frame 04…` |
| Q04 | `tui/screens/questions.ts:99` | list: the selected one may be cut (QST-97) | ✅ Killed · `QST-97: with seven open questions the selected one is always drawn whole` |
| Q05 | `tui/screens/questions.ts:76` | list: three lines of text (QST-56) | ✅ Killed · `QST-96: a text of 300 characters and an option of 100 are broken or cut with `…` inside the box` |
| Q06 | `tui/screens/questions.ts:119` | list: options cut at 48 (QST-56) | ✅ Killed · `QST-70: the modal is drawn over the tab of questions in gray, with an empty margin around it…` |
| Q07 | `tui/screens/questions.ts:184` | history: text cut at 67 (QST-60) | ✅ Killed · `QST-87: frame 20a of the modal of answer` |
| Q08 | `tui/screens/questions.ts:174` | history: border never white (QST-63) | ✅ Killed · `QST-63: the panel in focus has the white border and the other the gray one` |
| Q09 | `tui/screens/questions.ts:28` | selected: always the first (QST-56, QST-67) | ✅ Killed · `QST-87: frame 06 of the modal of answer` |
| Q10 | `tui/screens/questions.ts:177` | history: offset not clamped (QST-62) | ✅ Killed · `QST-62: the history starts at its offset, and never leaves fewer than four on the screen` |
| Q11 | `tui/screens/questions.ts:118` | list: a blocking question without options shows a default line (QST-56) | ✅ Killed · `QST-56: a question without ticket has no ticket after the name, and a blocking one without o…` |
| Q12 | `tui/screens/questions.ts:40` | absorbed: the name instead of the role (QST-56, QST-58) | ✅ Killed · `QST-56: the route names each question merged into this one, with the role of who asked it` |
| Q13 | `tui/screens/questions.ts:76` | list: text broken at 55 (QST-56) | ✅ Killed · `QST-96: a text of 300 characters and an option of 100 are broken or cut with `…` inside the box` |
| Q14 | `tui/screens/questions.ts:103` | list: a question drawn over the last lines (QST-97) | ✅ Killed · `QST-97: with seven open questions the selected one is always drawn whole` |
| Q15 | `tui/screens/questions.ts:189` | history: n counts all but the ones shown, not the ones below (QST-62) | ✅ Killed · `QST-62: the history starts at its offset, and never leaves fewer than four on the screen` |
| N01 | `tui/screens/answer.ts:73` | modal: a blocking question with a default shows the default line (QST-73, QST-80) | ❌ Survived |
| N02 | `tui/screens/answer.ts:29` | field: the first six lines, not the last (QST-75) | ✅ Killed · `QST-75: the expanded field breaks the text at its width and shows its last six lines` |
| N03 | `tui/screens/answer.ts:112` | modal: footer of a refused answer (QST-80) | ✅ Killed · `QST-80: the refused modal of frame 20b keeps the text that was sent, and says the default ap…` |
| N04 | `tui/screens/answer.ts:90` | field: 7 lines expanded (QST-73) | ✅ Killed · `QST-73: the expanded field of frame 07 has 8 lines, and the warning stays right below it` |
| N05 | `tui/screens/answer.ts:71` | modal: choice mode without options (QST-71) | ✅ Killed · `QST-71, QST-73: a blocking question has no line of default, and one without options is in th…` |
| N06 | `tui/screens/answer.ts:49` | field: border of a refused answer not red (QST-80) | ✅ Killed · `QST-80: the field of a refused answer has the red border, and the one of any other does not` |
| N07 | `tui/screens/answer.ts:101` | modal: the tab under it is not grayed (QST-70) | ✅ Killed · `QST-70: the modal is drawn over the tab of questions in gray, with an empty margin around it…` |
| N08 | `tui/screens/answer.ts:29` | field: off by one at the width of the line (QST-75) | ✅ Killed · `QST-75: a text that does not fit the line of the field shows `…` and its end` |
| N09 | `tui/screens/answer.ts:91` | modal: the refusal above the fixed warning (QST-80) | ✅ Killed · `QST-80: the refused modal of frame 20b keeps the text that was sent, and says the default ap…` |
| N10 | `tui/screens/answer.ts:83` | modal: the default of a refused answer still counts down (QST-80) | ✅ Killed · `QST-80: the refused modal of frame 20b keeps the text that was sent, and says the default ap…` |
| H01 | `tui/screens/help.ts:72` | legend: the line of h is empty (QST-88) | ✅ Killed · `TUI-43: frame 11 of the legend` |
| TL01 | `tools.ts:299` | tools: the judge sees answer (QST-52) | ✅ Killed · `EVT-89/QST-52: the judge has the common tools, send_verdict and ask, and no other` |
| TL02 | `tools.ts:322` | tools: escalate calls /ask (QST-53) | ✅ Killed · `QST-53: escalate and merge_question call their routes with the id of the session and answer …` |
| SV01 | `server.ts:333` | server: ask does not give the question_id to the model (QST-53) | ✅ Killed · `QST-53/54: ask of a worker answers the question_id and the seq, the leader gets the question…` |
| X01 | `question.ts:351` | merge: event and row not in one transaction (QST-12) | ❌ Survived |
| X02 | `tui/screens/questions.ts:147` | detail: a blocking question without options shows a default line (QST-58) | ✅ Killed · `QST-58, QST-59: a question without ticket keeps the lines of the ticket and of the thread, a…` |
| X03 | `question.ts:340` | merge: into a question that is not open (QST-29) | ✅ Killed · `QST-29: a merge from or into a question that is answered is refused with question_closed` |
| X04 | `tui/screens/answer.ts:42` | modal: no empty margin around the box (QST-70) | ✅ Killed · `QST-70, QST-71: the modal of a blocking question with three options is the one of frame 05` |
| X05 | `tui/keys.ts:107` | press: the modal of a question with options opens in the text mode (QST-71) | ✅ Killed · `QST-66: enter on the feed over a question of an open question that is with the dev shows the…` |
| X06 | `question.ts:242` | escalate: event and row not in one transaction (QST-12) | ✅ Killed · `QST-12: when the write of the holder fails, the escalation leaves no event and no delivery` |

**Sensor depth**: P0-full, by hand: no mutation tool is installed for Bun.

### QST-48: what the generated sequences reach

`test/unit/question-replay.test.ts` runs 200 sequences of 40 calls from a fixed seed, over `/ask`, `/escalate`, `/answer` of a peer and of the dev, `/merge-question`, the check of deadlines with the clock moved, `task` and `result` through `/send`, `/close-feature` and `/open-feature`. After each call it compares, for each feature, the ten fields the AC names (`:243`–`:252` against `:257`–`:266`), with `toEqual` over the whole list, so a question on one side only fails. It asserts at the end that each of the ten steps was accepted and refused at least once, that the four routes were refused on a question of a closed feature, and that the five statuses and the four `resolved_by` were seen (`:305`–`:309`).

Run alone against a set of mutants, it kills what parity can see: the second answer to a question (M05), followers that are not recursive (M09), the status of a default (M11), the deadline of a blocking question (M17) and of an escalation (M25), 241 s (M27), the closing by the feature (L01, L02, L04), the `result` that is not wired inside `/send` (S01), and four mutants of `questions()` (D01, D04, D10, D12). So it reaches chains of merges, deadlines, both defaults and the end of a feature.

It does not reach one state: **a merged question that closed by its own `result`, whose destination is answered afterwards.** M10 (direct) and M10b (indirect) in `question.ts` and D03 in `derive.ts` survive it. This is the second half of QST-37, the one place where the table and the derivation can part. M10 and D03 are killed by unit tests (`test/unit/question-merge.test.ts:218`, with a row edited by hand, and `test/unit/derive.test.ts:532`). M10b is killed by nothing. The tally at `:305`–`:309` does not ask for this state, so nothing says it when the generator stops reaching a state.

Parity cannot see a fault that writes the wrong event and the matching row: M12 to M16 survive it by construction and are killed by the unit tests of each rule. That is the right split.

## Judged items

| Item the authors flagged | Judgment |
| ------------------------ | -------- |
| `sync` leaves a modal alone while `sending`, and closes a refused modal whose question is gone | The code matches the reworded QST-82. Both branches are asserted: `test/unit/tui-keys.test.ts:519` (sending, question closed: stays) and `:529` (gone, refused or not: closes). The mix of the two, sending and gone, has no test and no stated outcome (G4, K08) |
| `enter` on the tab with the focus on the history opens the modal; `b` inside the tab moves the focus to the list | No AC covers either and no test pins the first (K21 survives). The behaviour is reasonable. The spec should say it (G5) |
| `keysOf` decides the text mode from the state at the start of the chunk | Safe in the text mode, which is what QST-78 names. A chunk that enters the text mode and then carries a line break sends (G7). Low risk: it takes a paste that starts with the key that opens the text mode |
| The modal draws the `default` line and `default aplicado` only for a non-blocking question | Matches QST-73 and the reworded QST-80. No fixture tells "non-blocking" from "has a default": N01 survives (gap 4) |
| A blocking question with `default: ""` is accepted; `null` counts as present in `/ask` | Both follow the letter of QST-05. `null` is pinned by tests. The empty default closes the question as `defaulted` with an empty answer at the end of the feature, which no AC states (G6) |
| `expire` runs in a bare `setInterval` in `broker.ts` | Same shape as `peers.cleanStale` two lines above. In Bun 1.4.2 an exception in a timer ends the process with exit 1 (checked). So one failed write in the check of deadlines takes the broker down, and a failure that persists takes it down again at startup, before it serves. No AC covers it. Accept for now and record the risk. The literal 1000 beside `cleanupIntervalMs()` is gap 5 |
| `tui/demo.ts` was restructured, exports `serve`, and has no test | The matrix says none. `serve` is exported and imported by nothing: the `export` and the `import.meta.main` guard buy a testability nobody uses. Its `/answer` knows `invalid_token`, `invalid_field` and `question_closed` only, which is enough for a demo |
| The route of Q-05, Q-08 and Q-10 in the new frames is D1 | Holds. See "Frames" |
| Every deviation of the six frames is D1 or D2 with a reason that holds | Holds. `test/unit/tui-frames.test.ts:82`, `:100`, `:157` assert the classes; the reasons were read one by one |
| QST-48: does the generator reach the interesting states and compare the ten fields? | It compares the ten fields and reaches most states. It does not reach a merged question closed by its own `result` whose destination closes later, and its tally would not notice. See "QST-48" |

## Code quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ One `resolve` closes a question for the four ways it closes; `/answer` of a peer and of the dev share `answered` |
| Surgical changes | ✅ `squad()` lost its own copy of the debt of `answer` when `owed` gained it; the only comment removed, the one above `TABS` in `tui/screens/chrome.ts:26`, was made false by the change |
| No scope creep | ⚠️ `export function serve` in `tui/demo.ts:21` has no importer |
| Matches patterns | ✅ Factories with injected clock, refusals through `log.refused`, comments that say why, at the density of the neighbours |
| Spec-anchored outcome check | ❌ Ten ACs with a clause unasserted |
| Per-layer coverage expectation | ❌ `broker.ts` "Processo real: rotas, credenciais, prazo e reinício": the route `/send` with a question open is not exercised in the real process (gap 1) |
| Every test maps to a requirement | ✅ Every new test title starts with its `QST-NN` |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/LESSONS.md` L-001, L-020 | ⚠️ L-020 holds everywhere it was checked (80, 3, 240000, 2000, 4000 by the literal; M22, M27, M28, W02, K23 killed). L-001 holds for every pair of refusals but the first of each route (gap 7) |

Smaller notes, none blocking:

- `question.ts:21` and `shared/derive.ts:285` each define `TIMEOUT_S = 240`. The replay test ties them (M27 killed), but the value has two homes.
- `question.ts:33` maps `judge` to `leader` in `NEXT` for a case its own comment says cannot happen. The `Record<Role, string>` asks for the key.
- `question.ts:56` reads the event back with `log.after(seq - 1)[0]!.ts` to learn its `ts`. Correct inside the transaction, and roundabout.
- `tui/screens/questions.ts:105` and `tui/screens/answer.ts:73` encode two rules the ACs word differently (G3, gap 4).

## Fix plans

Ranked. Each is a task for an implementer; this agent fixed nothing.

### Fix 1: QST-36 is not proven in the real broker (B08)

- **Root cause**: the unit tests reach `delivered` through `createSend(log, question.delivered)` in `test/unit/helpers.ts:133`. The same wiring in `broker.ts:57` has no test.
- **Fix task**: in `test/integration/question.test.ts`, a worker with a task of a ticket asks a non-blocking question with that `ticket_ref` and sends its `result` through `POST /send`. Assert that `/events` has the `result` and then the `answer` of `broker` with `resolved_by` `result_default`, that the row is `defaulted` with that `answer_seq`, and that the worker gets the `answer` in its polling.
- **Done when**: the test fails with `createSend(log)` in `broker.ts:57`.
- **Priority**: Major.

### Fix 2: QST-37 holds only one merge away (M10b)

- **Root cause**: `test/unit/question-result.test.ts:80` and `test/unit/question-merge.test.ts:218` close the question merged straight into the destination. Nothing closes a question further down the chain.
- **Fix task**: a unit test with Q3 merged into Q2 and Q2 into Q1, where the `result` of who asked Q3 closes Q3. Then Q1 is answered: Q2 follows, the row of Q3 keeps its status and its `answer_seq`, and who asked Q3 gets no delivery of that answer. Also add to the tally of `test/unit/question-replay.test.ts:305` that some sequence had a merged question with its own answer whose destination closed later, and tune the generator until it does.
- **Done when**: the test fails without `WHERE q.status = 'merged'` in `question.ts:73`.
- **Priority**: Major.

### Fix 3: QST-12 has no test for `/merge-question` (X01)

- **Fix task**: in `test/unit/question-merge.test.ts`, a trigger that aborts `UPDATE` on `questions`; `merge` throws; events, deliveries and rows are as before.
- **Done when**: the test fails with the `log.transaction` of `question.ts:351` removed.
- **Priority**: Major.

### Fix 4: no fixture has a blocking question with a default (N01)

- **Fix task**: in `test/unit/tui-answer.test.ts`, a blocking question asked with `default`: in the text mode no `default …` line; refused, the line is `✗ recusada pelo broker: Q-NN já fechada` with no `default aplicado`.
- **Done when**: the test fails with `const fallback = q.default` in `tui/screens/answer.ts:73`.
- **Priority**: Minor.

### Fix 5: the period of the check of deadlines is not pinned (B04)

- **Fix task**: give the 1000 ms a home in `shared/config.ts`, beside `cleanupIntervalMs`, and assert the literal 1000 in `test/unit/config.test.ts`. A tighter bound in `test/integration/question.test.ts:218` would flake under load.
- **Done when**: 2000 in its place fails a test.
- **Priority**: Minor.

### Fix 6: the terminal entry of the TUI can lose its credential (T07)

- **Root cause**: the block under `import.meta.main` in `tui.ts:208` needs a terminal, and no test reaches it. It has been so since the TUI leitura; `token: credential` at `:233` is the first line of it that the feature cannot work without.
- **Fix task**: move the construction of `Io` to an exported function and assert that its `token` is `credential`, or record the check in the UAT of this feature: answer one question with `bun tui.ts` over a real broker.
- **Priority**: Minor.

### Fix 7: `unknown_peer` is never sent with a second failing rule (B06)

- **Root cause**: `test/integration/question.test.ts:169`–`:170` and `:136` send a body that fails no other rule. The order is structural: `broker.ts:190` looks for the peer before any module runs, and every earlier route is tested the same way.
- **Fix task**: in the loop at `test/integration/question.test.ts:162`, add `post(b.url, path, { id: "not-an-id" })`, a body that also fails `missing_field`, and expect `unknown_peer`.
- **Priority**: Minor.

### For the spec, not for the code

G1 to G7. Each needs one sentence in the AC it names. G3, G4 and G5 then need one test each.

## Requirement traceability update

Not applied: this agent does not edit `spec.md`. Proposed:

| Requirement | Current status | Proposed |
| ----------- | -------------- | -------- |
| QST-10, QST-12, QST-16, QST-22, QST-29, QST-34, QST-36, QST-37, QST-73, QST-80 | Implementing | ❌ Needs Fix |
| The other 88 | Implementing | ✅ Verified |

## Lessons recorded

Through `scripts/lessons.py add`, one per signal. The script changed `.specs/lessons.json` and `.specs/LESSONS.md`.

| Signal | Lesson | Effect |
| ------ | ------ | ------ |
| B08, T07 | Test through the real process each callback the composition root injects into a module, not only through the wiring of the test helper | New, L-050 |
| M10b | Test the filter of a recursive walk on a member reached through another member, not only on one reached directly | New, L-051 |
| N01 | Test a condition with a fixture where it differs from the conditions that coincide with it in every other fixture | New, L-052 |
| X01 | When an AC lists several triggers, give each trigger its own assertion or a recorded platform skip | L-010, now confirmed |
| B04 | Put every spec-defined default in the config module and unit-test the default value | L-004, now confirmed |
| B06 | When an AC fixes the order of two steps, test a scenario whose result differs if the steps are swapped | L-001, third feature |
| G2, G4 | When an AC lists alternatives that can hold together, state which one wins | L-048, now confirmed |
| G6 | State for every optional field whether null counts as absent or as a present value of the wrong type | L-024, now confirmed |
| G6 | State for every optional text field what the empty string means: refused, absent or stored as sent | L-036, now confirmed |
| G1 | State what a line that carries a count shows when the count is zero | New, L-053 |
| G3, G5 | State for each key and each mark of a screen with more than one focus what it does in every focus | New, L-054 |
| G7 | State at which moment of a multi-key input a rule that depends on the mode reads the mode | New, L-055 |

L-001 was loaded for this feature and one pair of refusals still has no test that a swap would fail. It was not penalized: every other pair of the four routes has one, and B06 is an inserted check on an order the structure of `broker.ts` already gives.

`scripts/validate_state.py question` exits 1 with `validation.md verdict is FAIL`, as it should.

## Summary

**Overall**: ❌ Not ready.

**Spec-anchored check**: 88/98 ACs match the outcome of the spec in full; 10 have a clause unasserted; 8 carry a spec-precision gap (G1 to G7).
**Sensor**: 139/149 mutations killed; 10 survive, 7 on behaviour the spec defines.
**Gate**: `tsc` exit 0; 1248 pass, 3 skip, 0 fail.

**What works**: the life of a question in the broker, with one resolution proven under generated sequences; the refusals and their order within each route; the derivation; the tab, the modal and its keys; the writer and its failures; the six frames; the tools. No pre-existing test was weakened.

**Issues found**: fixes 1 to 7 above. Fixes 1 to 3 are on the path that resolves a question exactly once.

**Next steps**: route fixes 1 to 7 to an implementer, settle G1 to G7 in the spec, then verify again. The interactive UAT (step 7) was not this agent's.
