# Question Validation

**Result**: FAIL

**Round**: 2
**Date**: 2026-10-10
**Verifier**: independent sub-agent (author ≠ verifier). It did not write the code, the tests, the fix round or the round-1 report. It wrote this file and, through `scripts/lessons.py`, the two lessons files. No code, no test, no spec, no task, no commit.
**Spec**: `.specs/features/question/spec.md`, 98 requirements `QST-01` to `QST-98`, as reworded for the fix round in QST-05, QST-34, QST-56, QST-62, QST-65, QST-67, QST-78 and the Assumptions row of `default` on a blocking question.
**Diff range**: `9a4d921..7268928` on `feat/question` (58 commits, 80 files, +10269 −280). The fix round is `613da1c..7268928` (14 commits).
**Environment**: Windows 11, Bun 1.4.2, installed TypeScript 5.9.3, Python 3.12.9. Linux did not run here.

All code and test citations below are relative to `broker/`.

The fix round closed the seven ranked gaps of round 1: each of its ten surviving mutants was applied again by this verifier and each one now fails a test. The gate is green, no pre-existing test was weakened, the frames did not move. The verdict is FAIL for two things round 1 did not find:

1. **One chunk of two keys still sends an answer (QST-78).** `tui.ts:180`–`:182` holds back an unfinished escape sequence at the end of what stdin sent and dispatches the rest. A chunk that is a line break followed by `\x1b` or by `\x1b[` reaches the reducer as the one key `\r`, and the loop does the `POST`. Reproduced in the text mode (the typed text is sent) and in the choice mode (the selected option is sent). The reducer `input` alone is sound: no chunk of more than one key makes it leave an answer to send.
2. **One clause the fix round wrote into QST-56 has no test.** The list draws the line of options for a question that "has options or is blocking". No fixture draws a non-blocking question with options: with `if (q.blocking)` at `tui/screens/questions.ts:118` the whole suite passes (1266 pass). Round 1 called this half pinned; it was not.

Both are minor in reach and cheap to close. 96 of the 98 criteria hold in full.

## What round 1 found, and how each gap ended

Round 1 verified `613da1c`: 139 of 149 mutants killed, seven ranked gaps, seven spec-precision gaps. Each surviving mutant was applied again in a scratch worktree at `7268928`.

| Round-1 gap | Mutant | What closed it | Applied again | Ended |
| ----------- | ------ | -------------- | ------------- | ----- |
| 1. QST-36 not proven in the real broker | B08 `broker.ts:57` | F1: `test/integration/question.test.ts:216`–`:255`, the `result` through `POST /send` | Killed | Closed |
| 2. QST-37 only one merge away | M10b `question.ts:73` | F2: `test/unit/question-result.test.ts:124`–`:156`; the generated sequences must reach a merged question closed by its own `result` (`test/unit/question-replay.test.ts:338`) | Killed | Closed. The generated sequences alone still do not reach the state two merges away; the unit test does |
| 3. QST-12 without a failed write on `/merge-question` | X01 `question.ts:351` | F3: `test/unit/question-merge.test.ts:148`–`:158` | Killed | Closed |
| 4. No blocking question with a default in the modal | N01 `tui/screens/answer.ts:73` | F4: `test/unit/tui-answer.test.ts:413`–`:440` | Killed | Closed |
| 5. The period of the check of deadlines | B04 `broker.ts:71` | F5: `expireIntervalMs` in `shared/config.ts:33`, `test/unit/config.test.ts:45`, `test/integration/question.test.ts:305`–`:315` | Killed, as the literal 2000 in `broker.ts` and as the default 2000 in the config | Closed |
| 6. The terminal entry may lose its credential | T07, now `tui.ts:220` | F6: `terminal()` in `tui.ts:207`, `test/integration/tui.test.ts:148`–`:163` | Killed | Closed. The one line of the entry block that calls it, `tui.ts:237`, needs a terminal and has no test |
| 7. `unknown_peer` never sent with a second failing rule | B06 `broker.ts:190` | F7: `test/integration/question.test.ts:176`–`:193` | Killed on each of the four routes | Closed |
| G1. QST-62, the line with none below | (Q03 killed) | The spec says it; `test/unit/tui-questions.test.ts:346`–`:348` | Killed | Closed |
| G2. QST-56 and QST-58, options or default | none in round 1 | The spec says it for the list (QST-56), not for the detail (QST-58) | Q16 and Q17, new, survive | **Open.** The blocking question without options is pinned (`test/unit/tui-questions.test.ts:99`–`:100`, `:238`). The non-blocking one with options is drawn by no test: gap 2 below |
| G3. QST-56, the mark and the focus | Q01 `tui/screens/questions.ts:105` | The spec says it; F10: `test/unit/tui-questions.test.ts:71`–`:82` | Killed | Closed |
| G4. QST-82, a send in course and the question gone | K08 `tui/keys.ts:220` | The spec says it; F10: `test/unit/tui-keys.test.ts:600`–`:611` | Killed | Closed |
| G5. QST-67 and QST-65, the focus on the history | K21 `tui/keys.ts:129` | The spec says it; F10: `test/unit/tui-keys.test.ts:219`–`:227`, `:271`–`:277` | Killed | Closed |
| G6. QST-05, `null` and the empty default | none | The spec says it; F9: `question.ts:121`, `test/unit/question-ask.test.ts:246`–`:253` | A1 and A3, new, killed | Closed |
| G7. QST-78, when the mode is read | none | The spec says it; F8 and F11: `input` in `tui/keys.ts:182`–`:191` | K31 and K32, new, killed | Closed in the reducer. **Open at the entry of the loop**: gap 1 below |

## Task completion

T1 to T38 are ticked in `tasks.md` (194 Done-when boxes, none open) and F1 to F11 in `fix-round-1.md` (32 boxes, none open). Each fix task has its commit, in order: `8bc9f25` F1, `baa9671` F2, `b8ffb7a` F3, `76642ab` F4, `cfaa2d4` F5, `005c5a9` F6, `f44c7ee` F7, `460248d` F8, `a402e06` F9, `e3dc961` F10, `7268928` F11. `9db44f2`, `9b91475` and `e151717` touch only `.specs/`. No `SPEC_DEVIATION` marker is in the diff.

## Gate check

- **Command**, from `broker/`: `bun node_modules/typescript/bin/tsc --noEmit && bun test`
- **Outcome**: `tsc` exit 0. **1266 pass, 3 skip, 0 fail**, 53933 `expect()` calls, 1269 tests in 63 files, 56.4 s. One run, no re-run needed; `EVT-43` did not flake.
- **Before the feature**: 926 pass, 3 skip. **Round 1**: 1248 pass. **Delta**: +18 tests in the fix round, +340 in the feature. No count went down.
- **Skipped**, the same three as before the feature, all platform conditions: `test/integration/cli.test.ts:65`, `test/integration/cli.test.ts:100`, `test/unit/presence.test.ts:6`. `git grep` finds 3 skip markers at `613da1c` and 3 at `7268928`.
- The `expect()` calls went from 53974 to 53933 with 18 more tests. Measured: `test/unit/question-replay.test.ts` alone makes 45639 at `613da1c` and 45472 at `7268928`, because it compares once for each feature of each generated sequence and F2 changed which sequences are generated. The rest of the suite went from 8335 to 8461.
- The whole suite also ran three more times in the scratch worktree, once under each surviving mutant, with the same 1266 pass.

## Spec-anchored acceptance criteria

Every row was derived from the spec and from the test files as they are at `7268928`: each cited line was opened and read, not carried over from round 1. The nineteen criteria the rewording or a fix task touched (QST-05, 10, 12, 16, 22, 29, 34, 36, 37, 48, 56, 62, 65, 67, 73, 78, 80, 82, 83) were derived from the code too, and so were these, across all the stories: QST-01, 04, 09, 13, 18, 20, 24, 26, 31, 33, 38, 43, 46, 51, 53, 55, 58, 61, 63, 70, 76, 81, 86, 92, 97.

A whole-object `toEqual` is what covers a criterion that lists the fields of an event, a row or a delivery: `storedQuestion`, `storedAnswer`, `storedMerged`, `storedDefault` and `questionRow` give every column, and `refusedWith` (`test/unit/helpers.ts:221`) compares the whole `refused` event and the deliveries.

Outcome: ✅ the assertion pins what the spec defines · ❌ a clause of the criterion is not met or has no assertion that would fail (see the gap) · ⚠️ the spec leaves an outcome open (see "Spec-precision gaps").

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| QST-01 `/ask` writes the row and answers | row of 12 columns, `id` = max+1, `{ ok, question_id, seq }` | `test/unit/question-ask.test.ts:23` `expect(b.question.ask(WORKER_1, ASKED)).toEqual({ ok: true, question_id: 1, seq: 2 })` · `:24` `expect(b.questionRows()).toEqual([questionRow(1, id)])` · `:32` as sent · `:56` id 8 after a hand-made gap at 7 | ✅ |
| QST-02 the `question` event | from, role, to, summary, body `""`, ticket, column, `data` with only the fields of the kind | `test/unit/question-ask.test.ts:82` `expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id, { ts: NOW + 300 })])` with ten foreign keys in the body · `:99` every optional field | ✅ |
| QST-03 delivery to a peer, none to `human` | one pending row / none | `test/unit/question-ask.test.ts:124` `expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: 2, recipient: "leader", acked_at: null }])` · `:139` `toEqual(toOthers(1))` · `test/unit/log.test.ts:699`, `:718` | ✅ |
| QST-04 `deadline_ts` of `/ask` | `ts` + `timeout_s`×1000, or + 240000; else null | `test/unit/question-ask.test.ts:148`–`:157` `deadline_ts: NOW + 500 + 30000` · `:165`–`:173` `NOW + 500 + 240000` · `:184` `expect(b.questionRows()[0]!.deadline_ts).toBe(b.events()[1]!.ts + 240000)` · `:193` | ✅ |
| QST-05 `missing_field` | each wrong type, empty text, a default that is not a non-empty text, non-blocking without default | `test/unit/question-ask.test.ts:205`–`:211`, `:218`–`:220`, `:227`–`:235`, `:241`–`:242` `refusedAsk(b, WORKER_1, …, "missing_field")` · `:249` `refusedAsk(b, WORKER_1, { ...ASKED, default: "" }, "missing_field")` on a blocking question, `:250`, and `:251`–`:252` a non-empty one kept | ✅ |
| QST-06 `invalid_field` | summary 81, empty options, empty option, `timeout_s` < 1 or blocking | `test/unit/question-ask.test.ts:258` (81 refused), `:259` (80 stored), `:266`–`:268`, `:275`–`:278`, `:279` (1 accepted) | ✅ |
| QST-07 `too_many_options` | 4 refused, 3 accepted | `test/unit/question-ask.test.ts:286` `refusedAsk(…, { ...ASKED, options: ["a", "b", "c", "d"] }, "too_many_options")` · `:287` | ✅ |
| QST-08 recipient, edge, feature | `unknown_recipient`, `edge_not_allowed`, `no_open_feature` | `test/unit/question-ask.test.ts:300` · `:321` every pair of 4 senders × 7 recipients, `:329` `expect(passed.sort()).toEqual([...allowed].sort())` · `:334`, `:337` | ✅ |
| QST-09 `refused` of the four routes | `peer`, `attempted_kind` `question`/`question`/`question_merged`/`answer`, `error`; nothing else | `test/unit/question-ask.test.ts:343`–`:361` whole event · `test/unit/question-escalate.test.ts:50` · `test/unit/question-merge.test.ts:68` · `test/unit/question-answer.test.ts:39` · `test/integration/question.test.ts:205`–`:209`, `:252`–`:254` | ✅ |
| QST-10 order of the refusals of `/ask` | `unknown_peer`, `missing_field`, `invalid_field`, `too_many_options`, `unknown_recipient`, `edge_not_allowed`, `no_open_feature` | `test/unit/question-ask.test.ts:369`, `:374`–`:375`, `:380`, `:385`, `:390` · `test/integration/question.test.ts:184` `expectRefusal(await post(b.url, path, { id: "not-an-id" }), "unknown_peer")`, `:190` the same body with a registered id is `missing_field` | ✅ |
| QST-11 `/send` points to the routes | `invalid_kind`, hint names `/ask`, `/answer`, `/merge-question` | `test/unit/send.test.ts:179`–`:180` `expect(answer.hint).toContain(route)` · `:182` not the other two | ✅ |
| QST-12 all or nothing | no row, no event, no delivery, on each route | `test/unit/question-ask.test.ts:398`–`:401` (three tables) · `test/unit/question-escalate.test.ts:301`–`:304` · `test/unit/question-answer.test.ts:204`–`:207` · `test/unit/question-merge.test.ts:154` `expect(() => b.question.merge(MOTHER, { question_id: 2, into: 1 })).toThrow("the disk is full")`, `:155`–`:157` · `test/integration/question.test.ts:266`–`:269` (500) | ✅ |
| QST-13 `/escalate` | same id, level above, fields of the first question, holder moved | `test/unit/question-escalate.test.ts:57` · `:63`–`:68` `expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id, CARRIED), storedQuestion(3, id, { ...CARRIED, ...FROM_LEADER }), storedQuestion(4, id, { ...CARRIED, ...FROM_MOTHER, ts: NOW + 4000 })])` · `:96`–`:97` body ignored | ✅ |
| QST-14 summary and body of an escalation | of the latest question, or the ones sent | `test/unit/question-escalate.test.ts:132`, `:148`, `:162` | ✅ |
| QST-15 refusals of `/escalate` | `missing_field`, `invalid_field` | `test/unit/question-escalate.test.ts:170`–`:172`, `:178`–`:179`, `:184`–`:185`, `:191` | ✅ |
| QST-16 `question_closed`, `not_holder`, order | `unknown_peer`, `missing_field`, `invalid_field`, `question_closed`, `not_holder` | `test/unit/question-escalate.test.ts:198` (four statuses), `:204`–`:210`, `:215`–`:216`, `:222`, `:228` · `test/integration/question.test.ts:184`–`:185` | ✅ |
| QST-17 destination of an escalation | `human` with no delivery; `leader`, `mother` with one | `test/unit/question-escalate.test.ts:243`–`:248` · `:256`–`:258` | ✅ |
| QST-18 deadline when it reaches the dev | `ts` + `timeout_s`×1000 or + 240000; null if blocking | `test/unit/question-escalate.test.ts:69`–`:78` `deadline_ts: NOW + 4000 + 90000` · `:267`–`:269` `NOW + 6000 + 240000` · `:279` · `:286` | ✅ |
| QST-19 no deadline with an agent | null, not closed | `test/unit/question-escalate.test.ts:291`, `:293` · `test/unit/question-expire.test.ts:130`–`:135` a day later | ✅ |
| QST-20 `/answer` of the holder | whole `answer` event, row `answered`, `answer_seq` | `test/unit/question-answer.test.ts:57`–`:59` · `:69`–`:74` summary of 80 by the literal · `:80` as it came · `:109`–`:111` to who asked · `test/unit/contract.test.ts:83`–`:85` `qid` | ✅ |
| QST-21 refusals of `/answer` | `missing_field`, `invalid_field` | `test/unit/question-answer.test.ts:126`–`:128`, `:134`–`:136`, `:142` | ✅ |
| QST-22 order of the refusals of `/answer` | `unknown_peer` or `invalid_token`, `missing_field`, `invalid_field`, `question_closed`, `not_holder` | `test/unit/question-answer.test.ts:149`, `:156`, `:160`, `:165`, `:170`–`:172`, `:178` · `test/unit/question-human.test.ts:155`, `:163` · `test/unit/question-merge.test.ts:284` · `test/integration/question.test.ts:136`, `:140`, `:184`–`:185` | ✅ |
| QST-23 deliveries of an answer | `asked_by` and each merged one, once, never the author | `test/unit/question-answer.test.ts:184`–`:188` · `test/unit/question-merge.test.ts:192` `expect(waiting(b, 5)).toEqual(["worker-1", "worker-2"])` | ✅ |
| QST-24 the dev answers | `human`, `human`, `resolved_by` `human`, row `answered` | `test/unit/question-human.test.ts:69`–`:73` · `test/integration/question.test.ts:89`–`:124` with the credential of the file | ✅ |
| QST-25 deliveries of the answer of the dev | `asked_by`, merged ones, `mother`, once each | `test/unit/question-human.test.ts:80`–`:84` · `:92`–`:94` · `test/unit/question-merge.test.ts:212` | ✅ |
| QST-26 `invalid_token` first | before any rule, with a registered `id` in the body | `test/unit/question-human.test.ts:100`, `:111`–`:117` · `test/integration/question.test.ts:140`, `:142` | ✅ |
| QST-27 the dev is not the holder | `not_holder` | `test/unit/question-human.test.ts:124`, `:126` · `test/integration/question.test.ts:144` | ✅ |
| QST-28 no trace of a refusal to the dev; `unknown_peer` | no event; `unknown_peer` | `test/unit/question-human.test.ts:51`–`:53` (`refusedDev`), `:134`–`:149` · `test/integration/question.test.ts:136`, `:145`, `:169`–`:172` | ✅ |
| QST-29 refusals of `/merge-question` and order | `unknown_peer`, `edge_not_allowed`, `missing_field`, `invalid_field`, `question_closed`, `merge_not_allowed` | `test/unit/question-merge.test.ts:74`, `:79`–`:83`, `:89`–`:92`, `:99`–`:100`, `:106`–`:107`, `:112`, `:117`–`:118`, `:124`–`:125`, `:131` · `test/integration/question.test.ts:184`–`:185`, `:202` | ✅ |
| QST-30 `/merge-question` | whole `question_merged`, row `merged`, no delivery | `test/unit/question-merge.test.ts:139`–`:145` · `:164`–`:176` · `test/integration/question.test.ts:204`–`:213` | ✅ |
| QST-31 the merged ones close with the destination | same status, same `answer_seq`, one transaction | `test/unit/question-merge.test.ts:185`–`:192`, `:200`–`:212`, `:224`–`:227`, `:240`–`:246` · `test/unit/question-expire.test.ts:247`–`:271` | ✅ |
| QST-32 a merged one has no deadline of its own | nothing written | `test/unit/question-expire.test.ts:148`–`:162` | ✅ |
| QST-33 the deadline | whole `answer` of `broker`, `timeout_default`, row `defaulted`, deliveries | `test/unit/question-expire.test.ts:51` `expect(b.question.expire()).toEqual([])` 1 ms before · `:57`–`:58` · `:59`–`:69` · `:71` | ✅ |
| QST-34 when the deadlines are checked | at startup before serving, then every 1000 ms, the default of `SQUAD_EXPIRE_INTERVAL_MS` | `test/unit/config.test.ts:45` `expect(expireIntervalMs({})).toBe(1000)` · `test/integration/question.test.ts:278` within 3 s, `:296` `expect(answer!.ts).toBeGreaterThanOrEqual(asked!.ts + 1000)` · `:306`–`:314` with 60000 the question is still open 1500 ms past its deadline · `:334`–`:338` first reading after a restart | ✅ |
| QST-35 restart | overdue closes at startup; the stored deadline of the other holds | `test/unit/question-expire.test.ts:207`–`:220`, `:224`–`:227` · `test/integration/question.test.ts:334`–`:341` | ✅ |
| QST-36 default by the `result` | after the `result` and the `unblocked`, ascending id, one transaction | `test/unit/send-result.test.ts:282`–`:287` `[[6, "result", …], [7, "unblocked", …], [8, "answer", …]]`, `:288`–`:303`, `:318`–`:322`, `:370`–`:374` · `test/unit/question-result.test.ts:42`–`:61` · `test/integration/question.test.ts:227`, `:243`–`:248`, `:251` through the real broker | ✅ |
| QST-37 the `result` closes a merged question | it and its merged ones; the destination unchanged and not followed again | `test/unit/question-result.test.ts:97`, `:111`–`:116`, `:119`–`:121` · `:135`, `:137`–`:155` two merges away · `test/unit/question-merge.test.ts:240`–`:246` · `test/unit/question-replay.test.ts:338` `expect(seen.closedAlone.size).toBeGreaterThan(0)` | ✅ |
| QST-38 one answer per question | status read and written in one transaction; `question_closed` after | `test/unit/question-answer.test.ts:193`–`:196` · `test/unit/question-human.test.ts:168`–`:170` · `test/unit/question-result.test.ts:196`–`:197` · `test/unit/question-replay.test.ts:302` | ✅ |
| QST-39 what the `result` does not close | blocking, other ticket, no ticket, other worker, leader → mother | `test/unit/question-result.test.ts:176`–`:178`, `:183`–`:186` · `test/unit/send-result.test.ts:331`–`:338`, `:345`–`:350` | ✅ |
| QST-40 a blocking question has no deadline | open a day later | `test/unit/question-expire.test.ts:117`–`:119` | ✅ |
| QST-41 deadline and answer at once | exactly one `answer`, the first | `test/unit/question-expire.test.ts:168`–`:175`, `:181`–`:194` | ✅ |
| QST-42 the table | twelve columns; old rows and events kept | `test/unit/db.test.ts:263` `expect(info.map((c) => c.name)).toEqual(QUESTION_COLUMNS)` · `:284`–`:285` | ✅ |
| QST-43 the feature closes its questions | `defaulted` or `discarded`, `answer_seq` null, no `answer` | `test/unit/question-close.test.ts:57`–`:66` whole rows of seven questions · `:68`–`:70` · `:134`–`:149` · `:159`–`:163` | ✅ |
| QST-44 closed by the feature | `question_closed` on the three routes; no default by deadline | `test/unit/question-close.test.ts:80`–`:85`, `:94`–`:97`, `:116`–`:118` | ✅ |
| QST-45 no row is deleted | never | `test/unit/question-replay.test.ts:296`–`:297` after each of 8000 steps; `git grep` finds one `DELETE` in the code, on `peers` (`peers.ts:99`) | ✅ |
| QST-46 status of a derived question | first rule that holds, of six | `test/unit/derive.test.ts:453`, `:467`, `:482`, `:486`, `:503`, `:513`, `:520`, `:533`, `:557`, `:559`, `:581`–`:582` | ✅ |
| QST-47 `open` | false unless the status is `open` | `test/unit/derive.test.ts:596`, `:603` | ✅ |
| QST-48 parity of the table and the log | ten fields, per feature, no question on one side only | `test/unit/question-replay.test.ts:290` `expect(derived.sort((x, y) => x.id - y.id)).toEqual(stored)` · `:293` · `:331`–`:338` what the sequences reached | ✅ (see "QST-48") |
| QST-49 what a derived question carries | text, why, options, default, timeout_s, arrival, answer, merge, absorbed | `test/unit/derive.test.ts:619`, `:632`–`:633`, `:646`, `:653`, `:657`, `:673`, `:683`, `:693`, `:709` | ✅ |
| QST-50 `/history` by `question_id` | every `question`, `answer`, `question_merged`, by `seq` | `test/unit/log.test.ts:657`, `:665`, `:670`, `:674` · `test/integration/routes.test.ts:416`–`:420` (the route, since the Event slice) | ✅ |
| QST-51 `owed` | `{ owes: "answer", question_id, seq }` of the latest question, in order | `test/unit/state.test.ts:263`, `:277`, `:307`–`:309` · `test/unit/derive.test.ts:724`, `:731`, `:747` | ✅ |
| QST-52 tools by role | `ask` for four; `answer`, `escalate` for three; `merge_question` for the mother | `test/unit/tools.test.ts:15`, `:47`, `:51`, `:55`, `:59`–`:64` · `test/integration/server-tools.test.ts:57`, `:61` | ✅ |
| QST-53 a tool calls its route | id of the session; `question_id` and `seq`, or `error` and `hint` | `test/integration/server-question.test.ts:71`–`:73`, `:103`, `:113`–`:116`, `:135`–`:144`, `:146`–`:153` · `test/unit/tools.test.ts:70`–`:99` | ✅ |
| QST-54 the push | summary, body, fields; `kind`, `seq`, `from` in `meta` | `test/integration/server-question.test.ts:90` `expect(question.meta).toEqual({ kind: "question", seq: "5", from: "worker-1" })`, `:100`, `:105`–`:110` | ✅ |
| QST-55 the list and its order | title, seal, blocking first by arrival, then by deadline; line 24 | `test/unit/tui-asked.test.ts:53` `expect(ids(waiting(derived(b)))).toEqual([early, late, fast, slow])`, `:69` · `test/unit/tui-questions.test.ts:55`, `:91`, `:123` | ✅ |
| QST-56 a question in the list | head with the mark only with the focus on the list, two lines of 54, options at 47 when it has options or blocks, else default, route, absorbed, empty line | `test/unit/tui-questions.test.ts:55`, `:63`, `:67`, `:75`–`:81` no mark with the focus on the history, `:99`–`:100` `"  opções 1 texto"` for a blocking one without options, `:108`, `:144`–`:149` · no non-blocking question with options is drawn in the list by any test | ❌ gap 2 |
| QST-57 the empty list | the four texts and `perguntas abertas · 0` | `test/unit/tui-questions.test.ts:119`–`:123`, `:272`–`:275` | ✅ |
| QST-58 the detail | title and the lines in order | `test/unit/tui-questions.test.ts:192`, `:202`–`:219`, `:227`–`:247`, `:258`–`:266` · `test/unit/tui-frames.test.ts:124`–`:125` | ✅ ⚠️ P1 |
| QST-59 the effect | the three texts of a blocking one, the one of a non-blocking one | `test/unit/tui-asked.test.ts:108`–`:110`, `:121`–`:122` | ✅ |
| QST-60 the history | count, order, two lines, text at 66 | `test/unit/tui-asked.test.ts:93` · `test/unit/tui-questions.test.ts:339`–`:340`, `:356`–`:363`, `:371` | ✅ |
| QST-61 the outcome line | the five texts; merged before and after | `test/unit/tui-asked.test.ts:133`–`:134`, `:146`–`:147`, `:157`, `:161`, `:172` | ✅ |
| QST-62 five, or four and the count below | all up to 5; 4 and `+<n> mais antigas · h e j/k para rolar`; empty with none below | `test/unit/tui-questions.test.ts:333`–`:334` five shown, `:340` `"+2" + MORE`, `:344` `"+1" + MORE`, `:346`–`:348` `[...Q10, ...Q05, ...Q06, ...Q04, "", ""]` | ✅ |
| QST-63 focus and movement | `h`; white and gray borders; history by one, never fewer than 4; selection by one | `test/unit/tui-keys.test.ts:142`–`:146`, `:152`–`:165`, `:171`–`:187`, `:639`–`:641` · `test/unit/tui-questions.test.ts:385`–`:386` | ✅ |
| QST-64 `4` and `esc` | the tab, its footer, back to the main one | `test/unit/tui-keys.test.ts:134`, `:137` · `test/unit/tui-questions.test.ts:129`–`:134` | ✅ |
| QST-65 `b` | first blocking, focus on the list; next and around, focus to the list; `nenhuma bloqueante` for 4 s | `test/unit/tui-keys.test.ts:253`, `:259`–`:268`, `:273` `expect(key("b", v)).toEqual({ ...v.ui, question: 20, qfocus: "list" })`, `:276`, `:284` `until: v.squad.now + 4000`, `:289` | ✅ |
| QST-66 `enter` on the feed | the tab, the question, the modal; any other line, the thread | `test/unit/tui-keys.test.ts:197`, `:202` · `:76`, `:79`, `:81` | ✅ |
| QST-67 `enter` on the tab | the modal of the selected one; from the history the same modal and the focus to the list; nothing on an empty list | `test/unit/tui-keys.test.ts:208`–`:216` · `:221` `expect(key("\r", second)).toEqual({ ...second.ui, qfocus: "list", modal: opened(8, null) })`, `:224`, `:226` | ✅ |
| QST-68 the selection follows the question | by id; the first when it left | `test/unit/tui-keys.test.ts:619`, `:622`, `:630`, `:633` · `test/unit/tui-loop.test.ts:463` | ✅ |
| QST-69 frame 04 | the 40 lines, but for D1 and D2 | `test/unit/tui-frames.test.ts:40` `expect(drawn.map((line, y) => \`${y} ${line}\`)).toEqual(expected(id).lines.map(…))`, `:89`–`:94` | ✅ |
| QST-70 the modal | over the gray tab, title, lines in order | `test/unit/tui-answer.test.ts:76`–`:77`, `:116`–`:133`, `:152`–`:160`, `:171`–`:177` | ✅ |
| QST-71 the mode it opens in | choice with `outra resposta…` and its footer; text without options | `test/unit/tui-answer.test.ts:78`, `:107`, `:140`–`:144`, `:287`–`:288` · `test/unit/tui-keys.test.ts:197`, `:202` | ✅ |
| QST-72 keys of the choice mode | digit, `j`/`k`/arrows, `enter` | `test/unit/tui-keys.test.ts:328`–`:333`, `:338`–`:345`, `:350`–`:356`, `:361` | ✅ |
| QST-73 the text mode | default line of a non-blocking one, field of 3 or 8, count, warning, footer | `test/unit/tui-answer.test.ts:199`–`:211`, `:220`–`:241`, `:246`–`:247`, `:272`–`:280` · `:431` a blocking question asked with a default has no line of default | ✅ |
| QST-74 keys of the text mode | character, backspace, `ctrl+u`, `ctrl+e`; `q` and the others are text | `test/unit/tui-keys.test.ts:367`, `:371`, `:376`–`:383`, `:388` | ✅ |
| QST-75 a text that does not fit | `…` and the end; the last 6 lines | `test/unit/tui-answer.test.ts:253`, `:256`–`:257`, `:263`–`:266` | ✅ |
| QST-76 `enter` sends | `POST /answer` `{ human_token, question_id, answer }` trimmed; nothing if blank | `test/unit/tui-keys.test.ts:393`, `:396`, `:402` · `test/unit/tui-writer.test.ts:25` · `test/unit/tui-loop.test.ts:326` | ✅ |
| QST-77 accepted | modal closed, `✓ Q-NN respondida`, green, 4 s | `test/unit/tui-keys.test.ts:515` · `test/unit/tui-writer.test.ts:32` · `test/unit/tui-loop.test.ts:337`–`:338` | ✅ |
| QST-78 a pasted line break | a space in the text mode, also when a key of the chunk opened it; ignored in the choice mode; a pasted chunk never sends | `test/unit/tui-keys.test.ts:441`–`:442`, `:445` one key alone sends, `:462`–`:463`, `:469`, `:471`, `:474`, `:480` `expect(chunk("\rtexto\r", tab)).toEqual({ ...tab.ui, modal: opened(7, 0) })`, `:483`, `:486`–`:488`, `:491`, `:493` · `test/unit/tui-loop.test.ts:394`–`:397`, `:410`–`:411`, `:423`–`:424` · nothing at the entry of the loop with a chunk that ends in an unfinished escape, and that chunk sends | ❌ gap 1 |
| QST-79 one send at a time | no other `POST`, no key changes the modal | `test/unit/tui-keys.test.ts:409`–`:410` · `test/unit/tui-loop.test.ts:333`–`:334` | ✅ |
| QST-80 the refused modal | text sent, red border, the two lines of the default for a non-blocking one, `esc fechar`, only `esc` | `test/unit/tui-answer.test.ts:367`–`:381`, `:390`–`:391`, `:399`–`:410`, `:433`–`:439` a blocking question with a default names only the question, `:446`–`:454` · `test/unit/tui-keys.test.ts:430`–`:431`, `:521`–`:532` · `test/unit/tui-loop.test.ts:442`–`:447` | ✅ |
| QST-81 any other failure | modal kept, `✗ resposta não enviada · <erro>`, red, 4 s; 2000 ms | `test/unit/tui-keys.test.ts:538` · `test/unit/tui-writer.test.ts:38`, `:57`, `:96`–`:101` (1999 ms no, 2000 ms yes) · `test/unit/tui-loop.test.ts:437`–`:438` | ✅ |
| QST-82 a read closes the modal | `⟳ default aplicado` yellow, or `Q-NN fechada`; waits a send, also with the question gone; gone closes even refused | `test/unit/tui-keys.test.ts:557`, `:560`–`:561`, `:564`, `:567`, `:573`, `:581`, `:586`, `:596`, `:604` `expect(sync(v.ui, v)).toBe(v.ui)`, `:606`–`:610` · `test/unit/tui-loop.test.ts:463`–`:465` · `test/integration/tui.test.ts:243`–`:247` | ✅ |
| QST-83 the credential | read at the send; without it no send and the notice; never drawn | `test/unit/tui-keys.test.ts:545` · `test/unit/tui-loop.test.ts:351`–`:353`, `:358`, `:361`–`:362` · `test/integration/tui.test.ts:133`–`:142`, `:153`–`:158` `expect(io.token()).toBe("0f".repeat(32))` on the terminal entry, `:259` · `test/unit/config.test.ts:55` | ✅ |
| QST-84 the broker does not answer | no modal and the notice; an open modal unchanged, drawn again | `test/unit/tui-keys.test.ts:649`, `:652`, `:654`, `:659`–`:660` · `test/unit/tui-loop.test.ts:480`–`:487`, `:496` | ✅ |
| QST-85 `esc` and `ctrl+c` | closed without sending, same selection; quits | `test/unit/tui-keys.test.ts:416`–`:419`, `:424` | ✅ |
| QST-86 the only `POST` | `/answer`, by the `enter` of the modal | `test/unit/tui-writer.test.ts:112`–`:114` · `test/unit/tui-loop.test.ts:373`, `:381`–`:385` · `test/integration/tui.test.ts:253`–`:255` | ✅ |
| QST-87 frames 05, 06, 07, 20a, 20b | the 40 lines, but for D1 and D2 | `test/unit/tui-frames.test.ts:40` (five cases), `:107`–`:118` | ✅ |
| QST-88 the legend | the four lines of Question; gate and permission empty | `test/unit/tui-frames.test.ts:151`–`:153`, `:132`–`:144` | ✅ |
| QST-89 the table of deviations | no D3 in the six frames; no reason of the slice Question | `test/unit/tui-frames.test.ts:82`, `:100`, `:157`, `:160`–`:161` | ✅ |
| QST-90 the frame files | output of `extract.ts`; the 41 identical to `main` | no test. By command, in this round: `bun test/frames/extract.ts` over `Squad TUI.dc.html`, into an empty directory, exit 0, 61 files; the 47 of the repository are equal to it modulo line endings and the six new ones byte-identical to the committed blobs; `git diff --name-status main..HEAD -- 'broker/test/frames/*.txt'` shows six added files and no other. `test/unit/tui-glyphs.test.ts:10` counts 47 | ✅ by command |
| QST-91 `g`, `x`, `4`, `enter` | `chega com a fatia Gate`; never `chega com a fatia Question` | `test/unit/tui-keys.test.ts:119`–`:120`, `:126`–`:127` | ✅ |
| QST-92 a chain of three | the three with the same `answer_seq`, one delivery each | `test/unit/question-merge.test.ts:296`–`:308` | ✅ |
| QST-93 one delivery per name, none for the author | once | `test/unit/question-merge.test.ts:318`, `:325`, `:339` | ✅ |
| QST-94 a recipient that is offline | stored; delivery pending until it registers | `test/unit/question-ask.test.ts:409`–`:414` | ✅ |
| QST-95 the holder leaves | `open`, same holder | `test/unit/question-escalate.test.ts:311`, `:319` | ✅ |
| QST-96 what does not fit | broken or cut with `…` inside the box | `test/unit/tui-questions.test.ts:144`–`:153`, `:289`–`:306` · `test/unit/tui-answer.test.ts:304`–`:325`, `:333`–`:358` | ✅ |
| QST-97 more questions than lines | whole questions, the selected one visible | `test/unit/tui-questions.test.ts:164`–`:180` | ✅ |
| QST-98 after the deadline | `timeout 0:00` in the list, the detail and the title | `test/unit/tui-asked.test.ts:182`–`:187` · `test/unit/tui-questions.test.ts:113`, `:280`–`:281` · `test/unit/tui-answer.test.ts:295`–`:297` | ✅ |

**Status**: 96 of 98 hold in full. QST-78 is not met for one input, which no assertion targets. QST-56 has one clause no assertion would catch. QST-58 carries a spec-precision gap. QST-90 holds by command and has no test, as the coverage matrix says.

## Edge cases

- [x] QST-92: a chain of three closes with one `answer_seq` and one delivery each.
- [x] QST-93: one delivery per name, none for the author, in the three cases the criterion names.
- [x] QST-94: a question to an offline peer is stored and waits.
- [x] QST-95: the question stays with a holder that left, by `unregister` and by a dead pid.
- [x] QST-96: list, detail, history and modal break or cut inside their boxes.
- [x] QST-97: seven questions, the selected one drawn whole at the three positions.
- [x] QST-98: `timeout 0:00` in the list, the detail and the title of the modal.

## QST-78: a pasted chunk and the answer it may send

The question asked of this round: is there a path by which one pasted chunk makes the TUI `POST` an answer?

**From the reducer, none.** `Ui.send` is set in one place, `answering` (`tui/keys.ts:55`), on the key `\r` (`:64` an option, `:70` a text). `answering` runs only with a modal open (`:87`). `input` (`:182`–`:191`) never hands `\r` or `\n` to `press` when the chunk has more than one key and a modal is open at the turn of that key (`:186`): it hands a space, which the text mode appends and the choice mode ignores (`:65`). A key of the chunk that closes the modal (`esc`) lets a later `\r` open it again, and every line break after that is a space again. Nine mutants on these two lines were killed (K30 to K37 below).

**From the loop, one.** `key` (`tui.ts:174`–`:188`) joins what stdin sent to an escape held back before, cuts an unfinished escape sequence off its end (`:180`), and dispatches the rest (`:182`). So the reducer counts the keys of what is left, not of what came. Probed in the scratch worktree through `start(...).key`:

| State before | One chunk given to `key` | `POST /answer` |
| ------------ | ------------------------ | -------------- |
| Modal of Q-08, text mode, `logo` typed | `"\r\x1b"` | `{ question_id: 8, answer: "logo" }` |
| Modal of Q-08, text mode, `logo` typed | `"\r\x1b["` | `{ question_id: 8, answer: "logo" }` |
| Modal of Q-07, choice mode, first option | `"\r\x1b"` | `{ question_id: 7, answer: "infinito com backoff" }` |
| Modal of Q-08, text mode, `logo` typed | `"\rx"` | none |
| Modal of Q-08, text mode, `logo` typed | `"x\r\x1b"` | none |
| Modal of Q-07, choice mode, first option | `"\r\x1b[A"` (a whole sequence) | none |

The same chunk `"\r\x1b"` given to `input` sends nothing. QST-78 says a block of more than one key that has `\r` puts a space and does not send, and that a pasted block never sends an answer. A chunk of a line break and an escape is two keys, and it sends.

Reach: narrow. It takes a chunk that is exactly one `\r` and then `\x1b` or the start of a sequence. A terminal that strips control characters from a paste never produces it. Enter and then `esc` or an arrow typed fast enough to arrive in one read does, and there the dev did press Enter. It is still the one input for which the code and the criterion disagree, on the rule that exists because an answer cannot be erased.

Outside the spec, and not counted: a paste that the terminal delivers in more than one read, with `\r` alone in one of them, is a chunk of one key by the definition the spec chose. Bracketed paste is in Out of Scope.

## Spec-precision gaps

| # | AC | What the spec leaves open | What the code does | Pinned by a test? |
| - | -- | ------------------------- | ------------------ | ----------------- |
| P1 | QST-58 | Which of the numbered options and the line `default  …` the detail shows for a non-blocking question with options. QST-56 now says it for the list; QST-58 still says "or" | Options when it blocks or has options, as the list (`tui/screens/questions.ts:147`) | No (mutant Q17 survives) |
| P2 | QST-78 | Whether the block of input is what the terminal delivered or what the loop hands the reducer after it holds back an unfinished escape | The second | No. If the answer is the first, this is gap 1; if it is the second, the spec has to say it and a test has to pin that `\r` and an escape send |

Round 1's G1, G3, G4, G5, G6 and G7 are closed in the spec and each has its test. G2 is closed in the spec for QST-56 only.

## Test integrity

`git diff 613da1c..7268928 -- broker/test` touches eleven files, all of which existed. Eight only gained lines: `test/integration/question.test.ts` (+66), `test/unit/config.test.ts` (+5), `test/unit/question-ask.test.ts` (+8), `test/unit/question-merge.test.ts` (+11), `test/unit/question-result.test.ts` (+31), `test/unit/tui-answer.test.ts` (+28), `test/unit/tui-loop.test.ts` (+25), `test/unit/tui-questions.test.ts` (+12). `test/integration/tui.test.ts` gained a test and the name `terminal` in its import. No test was deleted, no skip added.

Lines that left a pre-existing test:

| Change | Where | Verdict |
| ------ | ----- | ------- |
| F8: the two tests of QST-78 rewritten, because `keysOf` lost its `Ui` and `input` reduces the chunk | `test/unit/tui-keys.test.ts:437`–`:464`, commit `460248d` | As claimed. Each old expected value is still asserted: the list of keys of `um\rdois\ntrês\r\n` is now what the chunk leaves in the field (`:441`), `["a", " "]` (`:442`), `["\r"]` (`:443`) with the state that sends (`:445`), `[UP, " "]` as the split `[UP, "\r"]` (`:447`) and the field `[" "]` (`:448`), `[UP]`, `["2", "\r"]`, `["j", "\r", DOWN]`, `[]`, and the pasted text `"logo da 89  na versão quadrada "` (`:462`) |
| F11: two expectations written in F8 changed | `test/unit/tui-keys.test.ts:486`, `:488`, commit `7268928` | As claimed. `chunk("2\r", open("05")).send` equal to the option 2 became the modal on line 2 with nothing to send; `chunk("4\rtexto\r", choosing)` in the text mode with `texto ` became the modal on line 4. Both follow the sentence `9b91475` added to QST-78. Nothing else of that file left in that commit |
| F9: the comment of the generator | `test/unit/question-replay.test.ts:128`, commit `a402e06` | As claimed: one comment line |

One change goes beyond the three the orchestrator listed. It is declared in `fix-round-1.md` (F2) and it strengthens the test:

- **`test/unit/question-replay.test.ts`, commit `baa9671`: the generator was biased and the tally gained one requirement.** Three expressions changed: `answer` picks most of the time the question a closed merged one followed (`:153`–`:154`), `merge` prefers a question the `result` of its worker would close (`:178`–`:179`), `result` prefers a worker with such a merged question (`:213`–`:214`); `step` runs those two first with chance 0.4 (`:249`–`:250`). The test now also requires `closedAlone` (`:338`). Every earlier requirement is still there (`:332`–`:336`) and still met. The generated sequences are other sequences than at `613da1c`: the file makes 45472 `expect()` calls where it made 45639. Against the new sequences, three mutants were run with this file alone: M10 `question.ts:71` killed (round 1 had it surviving the generated sequences), F6 `log.ts:141` killed, M10b `question.ts:73` survives.

Nothing under `broker/test/frames/` changed in `613da1c..7268928`: `git diff --name-status` over the directory is empty, text frames, logs, deviations and the extractor included.

## Frames

The extraction was run again in this round, into an empty directory under the scratchpad (see QST-90). The six frames, their logs and their deviations are the ones round 1 read line by line and judged to hold; none of those files changed since.

## Discrimination sensor

51 behaviour-level mutations, one at a time, in a `git worktree` at `7268928` under the scratchpad, with `bun install --frozen-lockfile` run once in it. Each mutation ran the test files of its layer and was reverted; the worktree was clean after each batch. The three survivors were run again under the whole suite, and survived it. No stash. The worktree was removed with `git worktree remove --force`. `git status --porcelain` of the real tree was empty before and is empty after but for this file and the two lessons files.

**48 killed, 3 survived.** One survivor is on behaviour the spec defines (Q16), one on behaviour the spec leaves open (Q17), one outside this feature (T11).

The ten survivors of round 1, applied again (13 mutations: B04 and B06 in each of their forms):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| B08 | `broker.ts:57` | `/send` not wired to `delivered` (QST-36, real process) | ✅ Killed · `QST-36: the result a worker sends through /send closes by its default the non-blocking question…` |
| M10b | `question.ts:73` | followers: an indirect one already closed follows again (QST-37) | ✅ Killed · `QST-37: a question closed by its own result two merges away from the end of the chain keeps its…` |
| X01 | `question.ts:351` | merge: event and row not in one transaction (QST-12) | ✅ Killed · `QST-12: when the row of the merged question cannot be written, the merge leaves no event and no…` |
| N01 | `tui/screens/answer.ts:73` | modal: a blocking question with a default shows the default line (QST-73, QST-80) | ✅ Killed · `QST-73, QST-80: a blocking question asked with a default has no line of default in the text mod…` |
| B04 | `broker.ts:71` | deadlines checked every 2000 ms, as a literal in `broker.ts` (QST-34) | ✅ Killed · `QST-34: the broker checks the deadlines every SQUAD_EXPIRE_INTERVAL_MS: with 60000 a question 1…` |
| B04c | `shared/config.ts:34` | the default of `SQUAD_EXPIRE_INTERVAL_MS` is 2000 (QST-34) | ✅ Killed · `QST-34: the deadlines are checked every 1000 ms unless SQUAD_EXPIRE_INTERVAL_MS says otherwise` |
| T07 | `tui.ts:220` | the terminal entry has no credential (QST-83) | ✅ Killed · `QST-83: the token of the terminal entry is what the file of SQUAD_TOKEN_FILE has when it is ask…` |
| B06 | `broker.ts:190` | `/ask` answers `missing_field` before `unknown_peer` (QST-10) | ✅ Killed · `QST-10/16/22/29: an id that is not registered is refused with unknown_peer on the four routes, …` |
| B06b | `broker.ts:190` | `/escalate` and `/merge-question` answer `missing_field` before `unknown_peer` (QST-16, QST-29) | ✅ Killed · `QST-10/16/22/29: an id that is not registered is refused with unknown_peer on the four routes, …` |
| B06c | `broker.ts:190` | `/answer` of a peer answers `missing_field` before `unknown_peer` (QST-22) | ✅ Killed · `QST-10/16/22/29: an id that is not registered is refused with unknown_peer on the four routes, …` |
| K08 | `tui/keys.ts:220` | sync: a question that is gone closes the modal of an answer on its way (QST-82) | ✅ Killed · `QST-82: with an answer on its way, a modal whose question is not among the ones of the open fea…` |
| K21 | `tui/keys.ts:129` | `enter` with the focus on the history opens no modal (QST-67) | ✅ Killed · `QST-67: enter with the focus on the history opens the modal of the selected question and takes …` |
| Q01 | `tui/screens/questions.ts:105` | list: the mark stays with the focus on the history (QST-56) | ✅ Killed · `QST-56: with the focus on the history the selected question of the list has no mark, and nothin…` |

On the code the fix round added or changed (20):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| C2 | `shared/config.ts:34` | `expireIntervalMs` reads another variable (QST-34) | ✅ Killed · `QST-34: the deadlines are checked every 1000 ms unless SQUAD_EXPIRE_INTERVAL_MS says otherwise` |
| B10 | `broker.ts:71` | `broker.ts` ignores `SQUAD_EXPIRE_INTERVAL_MS` (QST-34) | ✅ Killed · `QST-34: the broker checks the deadlines every SQUAD_EXPIRE_INTERVAL_MS: with 60000 a question 1…` |
| B11 | `broker.ts:71` | the deadlines are checked at the interval of the cleanup, 30 s (QST-34) | ✅ Killed · `QST-34: a non-blocking question with timeout_s 1 that reaches the dev has the answer of the bro…` |
| T08 | `tui.ts:220` | terminal: the token ignores the env it was given (QST-83) | ✅ Killed · `QST-83: the token of the terminal entry is what the file of SQUAD_TOKEN_FILE has when it is ask…` |
| T09 | `tui.ts:219` | terminal: the token is read once, when the entry is put together (QST-83) | ✅ Killed · `QST-83: the token of the terminal entry is what the file of SQUAD_TOKEN_FILE has when it is ask…` |
| T11 | `tui.ts:212` | terminal: columns and rows of the terminal swapped | ❌ Survived. Outside this feature |
| T12 | `tui.ts:219` | terminal: the project it was given is dropped | ✅ Killed · `QST-83: the token of the terminal entry is what the file of SQUAD_TOKEN_FILE has when it is ask…` |
| T10 | `tui.ts:163` | loop: each key of a chunk goes to the reducer as a chunk of its own, so no line break is pasted (QST-78) | ✅ Killed · `QST-78: a pasted chunk with line breaks goes into the text of the modal and sends nothing; ente…` |
| K30 | `tui/keys.ts:186` | input: a chunk of two keys is not a paste (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and on…` |
| K31 | `tui/keys.ts:186` | input: the modal is read at the start of the chunk (QST-78) | ✅ Killed · `QST-78: a line break of a chunk becomes a space also when a key before it in the same chunk too…` |
| K32 | `tui/keys.ts:186` | input: in the choice mode a pasted line break is `enter` (QST-78, F11) | ✅ Killed · `QST-78: in the choice mode a line break of a chunk of more than one key is ignored, and confirm…` |
| K33 | `tui/keys.ts:186` | input: only `\r` of a paste is a space, not `\n` (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and on…` |
| K33b | `tui/keys.ts:186` | input: only `\n` of a paste is a space, and `\r` sends (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and on…` |
| K34 | `tui/keys.ts:187` | input: each key sees the view of the start of the chunk (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and on…` |
| K35 | `tui/keys.ts:187` | input: a pasted line break is dropped from the text, not a space (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and on…` |
| K36 | `tui/keys.ts:186` | input: `enter` alone in the modal is a space too, and nothing is ever sent (QST-76, QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and on…` |
| K37 | `tui/keys.ts:186` | input: a line break of a chunk is a space with no modal open too (QST-78) | ✅ Killed · `QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and on…` |
| A1 | `question.ts:121` | ask: an empty default is accepted on a blocking question (QST-05, F9) | ✅ Killed · `QST-05: a non-blocking question without a default, or with an empty one, is refused with missin…` |
| A2 | `question.ts:124` | ask: a non-blocking question without a default is accepted (QST-05) | ✅ Killed · `QST-05: a non-blocking question without a default, or with an empty one, is refused with missin…` |
| A3 | `question.ts:121` | ask: the default of a blocking question is not checked (QST-05) | ✅ Killed · `QST-05: body, options, default, timeout_s or ticket_ref present and of another type is refused …` |

Elsewhere in the feature, none of them tried in round 1 (18):

| Id | `file:line` | Fault | Outcome |
| -- | ----------- | ----- | ------- |
| F1 | `question.ts:66` | resolve: a merged question takes an answer of a holder or of the dev (QST-22, Assumptions) | ✅ Killed · `QST-22: a question that is merged is refused with question_closed` |
| F2 | `question.ts:221` | escalate: a summary of 80 characters is refused (QST-15) | ✅ Killed · `QST-15: a summary of more than 80 characters is refused with invalid_field, and one of 80 is st…` |
| F3 | `question.ts:280` | answer: an answer of only spaces is accepted (QST-21) | ✅ Killed · `QST-21: an answer that is absent, not a string or only spaces is refused with missing_field` |
| F4 | `question.ts:134` | ask: an empty option is accepted (QST-06) | ✅ Killed · `QST-06: an empty list of options, or one with an empty text, is refused with invalid_field` |
| F5 | `question.ts:135` | ask: `timeout_s` 0 is accepted (QST-06) | ✅ Killed · `QST-06: a timeout_s under 1, or on a blocking question, is refused with invalid_field, and 1 is…` |
| F6 | `log.ts:141` | close: the questions the feature closes get the seq of the `feature_closed` as `answer_seq` (QST-43) | ✅ Killed · `QST-43: a feature closed as delivered closes its open and merged questions by their default or …` |
| F7 | `shared/derive.ts:285` | `questions()`: the deadline without `timeout_s` is 241 s after the arrival (QST-49, QST-48) | ✅ Killed · `QST-49: timeout_s and the arrival come from the first question to human` |
| F8 | `tui/asked.ts:39` | outcome: the answer of an agent does not say the route was short (QST-61) | ✅ Killed · `QST-61: the outcome of a question answered by the dev and of one answered by an agent` |
| F9 | `tui/screens/answer.ts:84` | modal: the refusal of a non-blocking question does not name the default applied (QST-80) | ✅ Killed · `QST-80: the refused modal of frame 20b keeps the text that was sent, and says the default appli…` |
| F10 | `tui/keys.ts:204` | settle: a refused option stays in the choice mode (QST-80, Assumptions) | ✅ Killed · `QST-80: when the broker says the question closed the modal turns refused, in the text mode with…` |
| F12 | `tui/screens/questions.ts:142` | detail: the two texts of the origin are swapped (QST-58) | ✅ Killed · `QST-69: frame 04 of the tab of questions` |
| F13 | `tui/keys.ts:103` | `enter` opens the modal and leaves the focus on the history (QST-66, QST-67) | ✅ Killed · `QST-66: enter on the feed over a question of an open question that is with the dev shows the ta…` |
| F15 | `question.ts:174` | ask: a question to a peer leaves no delivery (QST-03) | ✅ Killed · `QST-03: a question to a peer leaves one pending delivery, for that name` |
| F16 | `tui/keys.ts:170` | `b`: with no blocking question after the selected one, the first of the list, blocking or not (QST-65) | ✅ Killed · `QST-65: b without a blocking question with the dev says so, for 4 s, and does not change the sc…` |
| F17 | `tui/keys.ts:70` | modal: a field of only spaces is sent as an empty answer (QST-76) | ✅ Killed · `QST-76: enter with the field empty or with only spaces changes nothing` |
| K38 | `tui/keys.ts:171` | `b` on the tab leaves the focus on the history (QST-65, reworded) | ✅ Killed · `QST-65: b on the tab with the focus on the history selects the next blocking question and takes…` |
| Q16 | `tui/screens/questions.ts:118` | list: a non-blocking question with options shows its default line, not its options (QST-56) | ❌ Survived. Defined behaviour: gap 2 |
| Q17 | `tui/screens/questions.ts:147` | detail: a non-blocking question with options shows its default line, not its options (QST-58) | ❌ Survived. Unspecified: P1 |

Two more were run and are not counted, because round 1 had them in another wording: the author of an answer kept among who waits for it (`question.ts:83`, round 1's M06) and `+0 mais antigas` with none below (`tui/screens/questions.ts:189`, round 1's Q03). Both killed.

The survivors:

- **Q16** is on a sentence of QST-56: the line of options is drawn "when the question has options or is blocking". Every fixture with options is of a blocking question (Q-07 and Q-09 of the frames), and the one non-blocking question with options in the suite (`test/unit/tui-answer.test.ts:113`) is asserted only inside the box of its modal. Not equivalent, not outside the spec.
- **Q17** is the same fault in the detail. QST-58 says "the numbered options and `outra resposta (texto livre)`, or `default  …`" and not when. Unspecified: P1.
- **T11** swaps the columns and the rows `terminal()` reads from stdout. It is outside this spec: the line came verbatim from the entry block, where it has been since the TUI leitura, the size of the terminal is TUI-54 of that slice, and no criterion of Question names it. F6 moved the six members of the `Io` into `terminal()` to test one, `token`; `fetch`, `now`, `size`, `write` and `raw` need a terminal and have no test, as before the move.

**Sensor depth**: P0-full, by hand: no mutation tool is installed for Bun.

### QST-48: what the generated sequences reach now

`test/unit/question-replay.test.ts` compares the ten fields of QST-48 after each of 40 calls of 200 sequences, per feature, with `toEqual` over the whole list (`:264`–`:290`), and requires at the end every step accepted and refused, the four routes refused on a question of a closed feature, the five statuses, the four `resolved_by` (`:332`–`:336`) and, since F2, a merged question closed by its own `result` whose destination closed later (`:338`).

Run alone: it kills M10 (`question.ts:71`, the direct follower closed twice), which round 1 had surviving it, and F6 and F7. It does not kill M10b (`question.ts:73`, the follower two merges away): the sequences do not reach that state, and `:338` does not ask for it. The unit test `test/unit/question-result.test.ts:124` does. That is enough for QST-37; the tally of the generator is one state short of what F2's unit test covers.

## Judged items

| Item | Judgment |
| ---- | -------- |
| The paste rule of QST-78 as written and implemented | The reducer is sound: no chunk of more than one key leaves an answer to send, by the argument and the mutants above. The loop has one path, a line break followed by an unfinished escape (`tui.ts:180`–`:182`), reproduced: gap 1. The rule also leans on the choice mode ignoring a space (`tui/keys.ts:65`): a space that gains a meaning there changes what a paste does. `test/unit/tui-keys.test.ts:361` and `:486` pin it |
| `expire` in a bare `setInterval` in `broker.ts:71` | Agreed, it can wait. Checked again: in Bun 1.4.2 an exception in a timer ends the process with exit 1. No criterion covers it. `peers.cleanStale` has had the same shape since the Peers slice. The broker is the only writer of a database in WAL with `busy_timeout` 3000 (`db.ts:13`–`:14`), so a throw takes a failing disk or a damaged file; a session that calls a tool brings the broker up again (`server.ts:78`), and the startup closes what came due meanwhile (QST-35). What the feature adds is exposure: the timer that can throw now runs every second and not every 30 s, and `question.expire()` at `broker.ts:70` runs before the broker serves, so a failure that persists keeps it from coming up. Name both in the PR. A guard that logs and goes on belongs to both timers and to a change of its own |
| `tui/demo.ts` exports `serve` and has no test | Acceptable. The matrix of `tasks.md` (`:45`) says none for the demo, the fix round did not touch it, and it reads neither the database nor the credential of the user. The `export` at `tui/demo.ts:21` has no importer: drop the keyword, or keep it and give `serve` one test of `POST /answer`. Neither blocks |

## Code quality

Over the files the fix round touched: `broker.ts`, `question.ts`, `shared/config.ts`, `tui.ts`, `tui/keys.ts`, `CLAUDE.md`, `README.md` and the eleven test files.

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ F5 is five lines beside `cleanupIntervalMs`; F9 two conditions; F8 and F11 one function of ten lines that took the place of a loop in `tui.ts` |
| Surgical changes | ✅ `terminal()` is the object of the entry block moved whole, with `credential` given the env; nothing else of the block changed |
| No scope creep | ✅ in the fix round. The `export` of `serve` in `tui/demo.ts:21`, from T37, still has no importer |
| Matches patterns | ✅ `expireIntervalMs(env)` reads like its three neighbours; the new setting is in the table of `README.md` |
| Spec-anchored outcome check | ❌ QST-78 for one input, QST-56 for one clause |
| Per-layer coverage expectation | ✅ `broker.ts` now has `/send` with a question open in the real process (F1), the setting of the interval (F5) and `unknown_peer` before the fields on the four routes (F7) |
| Every test maps to a requirement | ✅ Each of the 18 new tests starts with its `QST-NN`; `TUI-62: a chunk with q or ctrl+c among its keys quits` (`test/unit/tui-keys.test.ts:496`) is of the reducer F8 added, under the requirement of the key |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/LESSONS.md` L-001, L-004, L-010, L-020 | ⚠️ L-004 holds now (the default 1000 is in the config module and its test asserts the literal). L-001 holds for the first pair of each route. L-010 does not hold for QST-56: two conditions draw the line of options and one has its assertion |

Smaller notes, none blocking:

- `broker.ts:68`–`:69` still says "at the check of every second"; the interval is a setting now.
- A value of `SQUAD_EXPIRE_INTERVAL_MS` that is not a number gives `NaN` to `setInterval`, as in the three settings beside it.
- `keysOf` (`tui/keys.ts:40`) is exported and has no importer but `input` and the tests since `tui.ts` stopped using it.
- The notes of round 1 on `TIMEOUT_S` in two files, `NEXT.judge` and the read-back of the `ts` in `deadline` stand; the fix round did not touch them.

## Fix plans

Ranked. Each is a task for an implementer; this agent fixed nothing.

### Fix 1: a line break followed by an unfinished escape sends (QST-78)

- **Root cause**: `tui.ts:180`–`:182`. `key` holds back the unfinished escape at the end of the chunk and dispatches what is before it; `input` (`tui/keys.ts:186`) decides what a paste is by the number of keys it was handed.
- **Fix task**, one of two, for the orchestrator to choose:
  - In the code: when `key` holds a tail back, what it dispatches is part of a chunk of more than one key, and the reducer is told so. In `test/unit/tui-loop.test.ts`: with the modal of Q-08 open and `logo` typed, `key("\r\x1b")` and `key("\r\x1b[")` leave `t.posts` empty; with the modal of Q-07 on its first option, `key("\r\x1b")` leaves `t.posts` empty; `key("\r")` alone still posts.
  - In the spec: QST-78 says the block is what the loop hands the reducer once an unfinished escape sequence at its end is held back, and a test pins that `\r` followed by an escape sends.
- **Done when**: the test fails on `tui.ts` as it is at `7268928`.
- **Priority**: Minor in reach, on the rule that guards a log nothing erases.

### Fix 2: a non-blocking question with options in the list (QST-56)

- **Root cause**: QST-56 gained "when the question has options or is blocking" after round 1, and F10 tested the other sentence it gained. Round 1 had this half as pinned.
- **Fix task**: in `test/unit/tui-questions.test.ts`, a non-blocking question asked with two options and a default, with the dev: its third line in the list is `  opções 1 <a> · 2 <b> · 3 texto`, and the list has no `default` line.
- **Done when**: the test fails with `if (q.blocking)` at `tui/screens/questions.ts:118`.
- **Priority**: Minor. The code does what the spec says.

### For the spec

- P1: QST-58 says which of the two blocks the detail shows, as QST-56 does. Then the fixture of fix 2 asserts it in the detail too: the numbered options and `outra resposta (texto livre)`, failing with `q.blocking` alone at `tui/screens/questions.ts:147`.
- P2: only if fix 1 is done in the spec.

### Known, outside the spec, for the PR

- `expire` and `cleanStale` run in bare timers: an exception in one ends the broker.
- A paste the terminal delivers in more than one read may leave `\r` alone in one of them, which sends. Bracketed paste is in Out of Scope.
- `tui.ts:237`, the line of the entry block that calls `terminal()`, and five of the six members of `terminal()` need a terminal and have no test.
- The interactive UAT (step 7) was not this agent's.

## Requirement traceability update

Not applied: this agent does not edit `spec.md`. Proposed:

| Requirement | Current status | Proposed |
| ----------- | -------------- | -------- |
| QST-56, QST-78 | Implementing | ❌ Needs Fix |
| The other 96 | Implementing | ✅ Verified |

## Lessons recorded

Through `scripts/lessons.py add`, one per new signal. The script changed `.specs/lessons.json` and `.specs/LESSONS.md`.

| Signal | Lesson | Effect |
| ------ | ------ | ------ |
| Gap 1, QST-78 at `tui.ts:182` | When a layer reshapes its input before a rule about that input applies, test the rule at the entry of the layer with an input the reshaping changes | New, L-056 |

Not recorded again, because round 1 recorded them for this feature: Q16 is L-010 (each trigger of an AC its own assertion) and L-052 (a fixture where the condition differs from the ones that coincide with it); Q17 and P1 are L-048 (state which alternative wins). No lesson was penalized: L-010 was confirmed by round 1 of this same feature, and the half that stayed without a test is one round 1 reported as pinned.

`scripts/validate_state.py question` exits 1 with `validation.md verdict is FAIL`, as it should.

## Summary

**Overall**: ❌ Not ready, by two minor gaps.

**Spec-anchored check**: 96/98 ACs match what the spec defines in full; QST-78 is not met for one input and QST-56 has one clause without an assertion; 2 spec-precision gaps (P1, P2).
**Sensor**: 48/51 mutations killed; 3 survive: one on defined behaviour (Q16), one unspecified (Q17), one outside the feature (T11). The ten survivors of round 1 are all killed.
**Gate**: `tsc` exit 0; 1266 pass, 3 skip, 0 fail.

**What works**: everything round 1 listed, and the seven gaps it ranked: the `result` through the real broker, the merged question two merges away, the failed write of a merge, the blocking question with a default in the modal, the interval of the deadlines as a setting, the credential of the terminal entry, `unknown_peer` before the fields. The reducer of a chunk of input. No pre-existing test was weakened; the frames did not move.

**Issues found**: fix 1 (QST-78 at the entry of the loop) and fix 2 (QST-56, a non-blocking question with options).

**Next steps**: route fixes 1 and 2 to an implementer, settle P1 in the spec, then verify again. This was the second of at most three rounds.

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
