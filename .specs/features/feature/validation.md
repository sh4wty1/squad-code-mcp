# Feature Validation - PASS ✅

**Date**: 2026-10-08
**Spec**: `.specs/features/feature/spec.md`
**Diff range**: `93e36f7..ae14f01` (31 commits, T1..T31, branch `feat/feature`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Environment**: Windows 11, Bun 1.3.14, TypeScript from `broker/node_modules`

All paths below are relative to `broker/`. Baseline before any work: `git status --porcelain` empty,
`HEAD` = `ae14f014f115ea12f9e1fcb23c5523b0a1f7b425`. After cleanup the tree shows only this file.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T31 | ✅ Done | One commit per task in `93e36f7..ae14f01`; all 139 "Done when" boxes of `tasks.md` are checked, none open |

---

## Spec-Anchored Acceptance Criteria

`refusedOpen` / `refusedClose` (`test/unit/feature-open.test.ts:47-51`, `test/unit/feature-close.test.ts:37-41`)
wrap `refusedWith` (`test/unit/helpers.ts:173-199`), which asserts the whole refusal by value:
`expect({ ...answer, hint: typeof answer.hint }).toEqual({ ok: false, error, hint: "string" })` (:177),
the log equal to the previous log plus exactly one `refused` row compared field by field (:179-196,
`data: { peer, attempted_kind, error }`), and `expect(deliveries()).toEqual(deliveriesBefore)` (:197);
the wrappers add `expect(featureRows(b)).toEqual(rows)`. Every "refused with X" row below relies on it.

### P1: Abrir a feature

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| FEAT-01 open by the mother | row with six fields, `project`, `opened_seq` = seq, `closed_seq`/`outcome` null; `feature_opened` from `mother`/`mother` to `*`, empty `summary`/`body`, `ticket_ref` null, `feature_id` = id, `data` only the six; answer `{ ok: true, feature_id, seq }` | `test/unit/feature-open.test.ts:57` `expect(b.feature.open(mother, FIELDS)).toEqual({ ok: true, feature_id: 1, seq: 2 })`; `:58-60` `expect(featureRows(b)).toEqual([{ id: 1, project: "importer", ...FIELDS, opened_seq: 2, closed_seq: null, outcome: null }])`; `:61-75` `expect(b.events()[1]).toEqual({ seq: 2, ts: NOW + 200, kind: "feature_opened", feature_id: 1, from_name: "mother", role_from: "mother", to_name: "*", summary: "", body: "", ticket_ref: null, question_id: null, gate_id: null, data: FIELDS })`; same three by HTTP at `test/integration/feature.test.ts:57`, `:58-60`, `:61-75`; `test/unit/log.test.ts:477-480`, `:487-503` | ✅ PASS |
| FEAT-02 non-mother | `edge_not_allowed` | `test/unit/feature-open.test.ts:87` `refusedOpen(b, { ...peer, ...AT }, FIELDS, "edge_not_allowed")` for leader, worker, judge; `:88` `expect(featureRows(b)).toEqual([])` | ✅ PASS |
| FEAT-03 already open | `feature_already_open` before the fields | `test/unit/feature-open.test.ts:95` `refusedOpen(b, mother, { ...FIELDS, title: "the second" }, "feature_already_open")`; `:141` same error with `title: ""`; `test/integration/feature.test.ts:86` | ✅ PASS |
| FEAT-04 field absent, null, not text, empty | `missing_field` | `test/unit/feature-open.test.ts:101-116` six fields × four cases, `:112` `refusedOpen(b, mother, body, "missing_field")`, `:113` `expect(featureRows(b)).toEqual([])` (24 tests) | ✅ PASS |
| FEAT-05 workflow outside the list | `invalid_field`; `tlc` and `matt-pocock` accepted | `test/unit/feature-open.test.ts:120` `refusedOpen(b, mother, { ...FIELDS, workflow: "scrum" }, "invalid_field")`; `:127` `expect(b.feature.open(mother, { ...FIELDS, workflow })).toEqual({ ok: true, feature_id: 1, seq: 1 })` for both | ✅ PASS |
| FEAT-06 order | `unknown_peer` → `edge_not_allowed` → `feature_already_open` → `missing_field` → `invalid_field` | `test/unit/feature-open.test.ts:135` (leader, feature open → `edge_not_allowed`), `:141` (open + empty title → `feature_already_open`), `:146` (`workflow: "scrum", spec_commit: null` → `missing_field`); `unknown_peer` first: `test/integration/feature.test.ts:169-171` `expectRefusal(..., "unknown_peer")` and `expect(readDb(broker.dbFile).events).toEqual(before)` | ✅ PASS |
| FEAT-07 five deliveries, none for the mother | one pending row per `judge`, `leader`, `worker-1..3` | `test/unit/log.test.ts:510` `expect(b.deliveries()).toEqual(OTHER_FIVE.map((recipient) => ({ event_seq: seq, recipient, acked_at: null })))`; `:451-457` literal five rows; `test/integration/feature.test.ts:76` `expect(readDeliveries(broker.dbFile)).toEqual(toOthers(2))` | ✅ PASS |
| FEAT-08 atomic open | no event, row or delivery when a write fails | `test/unit/log.test.ts:531-534` (trigger on `features` and on `deliveries`): `toThrow("no write")`, `expect(b.events().map((e) => [e.seq, e.kind])).toEqual([[kept, "task"]])`, `expect(featureRows(b)).toEqual([])`, `expect(b.deliveries()).toEqual([{ event_seq: kept, recipient: "worker-1", acked_at: null }])` | ✅ PASS |
| FEAT-09 the database refuses a second open row | `INSERT` or `UPDATE` aborted with error | `test/unit/db.test.ts:213` `expect(() => feature(db, null)).toThrow("UNIQUE constraint failed")`, `:214`; `:221` `expect(() => db.run("UPDATE features SET closed_seq = NULL WHERE id = 1")).toThrow("UNIQUE constraint failed")`, `:222-225`; `:228-238` two closed and one open accepted; `test/unit/log.test.ts:544-548` | ✅ PASS |
| FEAT-10 refused of `/open-feature` | `refused` with `attempted_kind` `feature_opened`, no row, no delivery | `test/unit/feature-open.test.ts:49-50` via `helpers.ts:179-197`; literal row at `test/integration/feature.test.ts:87-104` (`data: { peer: "mother", attempted_kind: "feature_opened", error: "feature_already_open" }`, `feature_id: 1`), `:105-106` | ✅ PASS |
| FEAT-11 `project` | parent of `.git`; else last segment of `git_root`; `cwd` last segment when null | `test/unit/feature-open.test.ts:6-7` `expect(projectOf("/repo/.git", "/repo/wt")).toBe("repo")`, `:11` `toBe("repo.git")`, `:15-16` `toBe("proj")`, `:81` row `project` `["proj"]`; source of the two fields: `test/unit/presence.test.ts:417`, `:424`; end to end `test/integration/feature.test.ts:59` (`project: "importer"` from the registered `git_root`) | ✅ PASS |
| FEAT-12 id greater than every earlier one | increasing, never reused | `test/unit/log.test.ts:521-523` `expect([first.feature_id, second.feature_id, third.feature_id]).toEqual([1, 2, 3])` after `DELETE FROM features`; `test/unit/feature-close.test.ts:220` `expect(next.feature_id).toBeGreaterThan(b.feature_id)` | ✅ PASS |
| FEAT-13 work accepted in the feature, `/state` | task and plan stored with its `feature_id`; `feature` = seven fields | `test/unit/feature-open.test.ts:165-166` (refused before), `:169-170` `toEqual({ ok: true, seq: 4 })` / `seq: 5`, `:171-174` `[["task", feature_id], ["plan", feature_id]]`, `:180` `expect(b.state(MOTHER).feature).toEqual({ id: feature_id, ...FIELDS })`; `test/integration/feature.test.ts:190-202` | ✅ PASS |

### P1: Encerrar a feature

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| FEAT-14 close by the mother | `feature_closed` from `mother`/`mother` to `*`, empty `summary`, `body` received (empty if absent), `ticket_ref` null, `feature_id` of the feature, `data` `{ outcome }`; row gets `closed_seq` and `outcome`; answer `{ ok: true, seq }` | `test/unit/feature-close.test.ts:47` `toEqual({ ok: true, seq: 2 })`, `:48-62` whole event (`body: "what was left out"`, `data: { outcome }`), `:63-65` row with `closed_seq: 2, outcome`, for both outcomes; `:76-77` `expect([closed.body, closed.feature_id, closed.from_name]).toEqual(["", b.feature_id, "mother"])`, `expect(closed.data).toEqual({ outcome: "abandoned" })`; HTTP `test/integration/feature.test.ts:115-133` | ✅ PASS |
| FEAT-15 non-mother | `edge_not_allowed` | `test/unit/feature-close.test.ts:83` `refusedClose(b, peer, { outcome: "delivered" }, "edge_not_allowed")` ×3, `:84` | ✅ PASS |
| FEAT-16 no open feature | `no_open_feature` before the fields | `test/unit/feature-close.test.ts:90`; `:96-97` second close refused and `expect(featureRows(b).map((f) => [f.closed_seq, f.outcome])).toEqual([[2, "abandoned"]])`; `:130` with `{}` | ✅ PASS |
| FEAT-17 outcome absent/null/not text, body not text | `missing_field` | `test/unit/feature-close.test.ts:100-113` six cases, `:110` `refusedClose(b, MOTHER, body, "missing_field")`, `:111` | ✅ PASS |
| FEAT-18 outcome text outside the list | `invalid_field` | `test/unit/feature-close.test.ts:115-121` `"done"`, `"approve"`, `"Delivered"`, `""`, `:118` | ✅ PASS |
| FEAT-19 order | `unknown_peer` → `edge_not_allowed` → `no_open_feature` → `missing_field` → `invalid_field` | `test/unit/feature-close.test.ts:125`, `:130`, `:135`; `unknown_peer`: `test/integration/feature.test.ts:169-171` | ✅ PASS |
| FEAT-20 refused of `/close-feature` | `refused` with `attempted_kind` `feature_closed`, row unchanged | `test/unit/feature-close.test.ts:39-40`; literal row `test/integration/feature.test.ts:141-155` (`feature_id: null`, `data: { peer: "mother", attempted_kind: "feature_closed", error: "no_open_feature" }`), `:156-158` | ✅ PASS |
| FEAT-21 event, row and five deliveries together | all three or none | `test/unit/log.test.ts:589-591` five pending rows of the `feature_closed`; `:602-606` (trigger on `UPDATE features` and on `INSERT deliveries`): `toThrow("no write")`, events, rows and deliveries equal to before, `expect(rows[0]!.closed_seq).toBeNull()`; `test/integration/feature.test.ts:134` | ✅ PASS |
| FEAT-22 nothing else changes | earlier events and deliveries kept, pending included; only the `feature_closed` added | `test/unit/log.test.ts:618-625` `expect(b.events().slice(0, -1)).toEqual(events)`, kinds list, `expect(b.deliveries().filter((d) => d.event_seq !== seq)).toEqual(deliveries)`, pending task delivery present; `test/unit/feature-close.test.ts:142-143` | ✅ PASS |
| FEAT-23 no gate | `delivered` accepted, never `gate_required` | `test/unit/feature-close.test.ts:162-164` `toEqual({ ok: true, seq: 3 })`, kinds `["feature_opened", "task", "feature_closed"]`, outcome `["delivered"]` | ✅ PASS |
| FEAT-24 after the close | `/send` and `/plan` → `no_open_feature`; `/state` `feature` null, `ticket` null, no debt of result, verdict, task, plan | `test/unit/feature-close.test.ts:170-176`; `:187-190` debts exist before; `:193-201` `expect(b.state(WORKER_1)).toEqual({ feature: null, ticket: null, owed: [three deliveries] })`; `:204-205` leader and judge | ✅ PASS |
| FEAT-25 next feature | a new open accepted; events of the earlier one ignored | `test/unit/feature-close.test.ts:215` (`worker_busy` in the first), `:219-220`, `:223`, `:225`, `:226-229` `[["plan", next.feature_id, null], ["task", next.feature_id, "U"]]`, `:230` | ✅ PASS |

### P1: Features reconstruíveis do log

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| FEAT-26 derivation | one item per `feature_opened`, ascending id, the ten fields, closed by the `feature_closed` of its id | `test/unit/derive.test.ts:378`, `:382` `toEqual([{ id: 2, ...SPEC, opened_seq: 4, closed_seq: null, outcome: null }])`, `:386-388`, `:403-404` three features and the same from the reversed log, `:417` | ✅ PASS |
| FEAT-27 table equals the replay | `features` without `project` = function over the log, after opens, closes and refusals | `test/unit/replay.test.ts:23-34` `expect(replayed()).toEqual(table())` after each step, `:35-38` literal two rows; `test/integration/feature.test.ts:248` `expect(features(events) as object[]).toEqual(table)`, `:249-252` | ✅ PASS |
| FEAT-28 restart | same open feature or none; same refusals | `test/integration/feature.test.ts:269` `feature_already_open` after restart, `:270` `/state` feature, `:274` `no_open_feature` after the second restart, `:275-276` | ✅ PASS |

### P1: Tools da mother e entrega pelo canal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| FEAT-29 tool lists | mother: EVT-89 tools plus the two; no other role | `test/unit/tools.test.ts:15` `expect(names("mother")).toEqual([...COMMON, "send_task", "open_feature", "close_feature"])`, `:20-21`, schemas `:25-42`; `test/integration/server-feature.test.ts:57-62`; `test/integration/server-tools.test.ts:47` | ✅ PASS |
| FEAT-30 `open_feature` | calls `/open-feature` with the session id and the arguments; text `Feature <id> opened with seq <seq>.` | `test/integration/server-feature.test.ts:69-70` (arguments carry `id: "not-an-id"`) `expect(opened).toEqual({ isError: false, text: "Feature 1 opened with seq 2." })`, `:71-78` row and event `data` equal `FIELDS` | ✅ PASS |
| FEAT-31 `close_feature` | text `Recorded with seq <seq>.` | `test/integration/server-feature.test.ts:81` `toEqual({ isError: false, text: "Recorded with seq 3." })`, `:82-86` | ✅ PASS |
| FEAT-32 refusal | error with the `error` and the `hint` of the broker | `test/integration/server-feature.test.ts:97-100` `toEqual({ isError: true, text: `close_feature refused: no_open_feature. ${noFeature.hint}` })`, `:105-108`, `:109` | ✅ PASS |
| FEAT-33 channel | pushed and confirmed, with the fields of the kind in `content` | `test/integration/server-feature.test.ts:124` `expect(opened!.params.meta).toEqual({ kind: "feature_opened", seq: "3", from: "mother" })`, `:125-134` exact six-line content, `:135-136` ack and empty polling, `:143-144` `"all tickets approved\n\noutcome: delivered"`, `:150-155` pushed once each, nothing to the mother, both deliveries acked; a worker too: `test/integration/server-delivery.test.ts:80` | ✅ PASS |

**Status**: ✅ All 33 ACs covered, each assertion on the value the spec defines. No spec-precision gap flagged.

---

## Edge Cases

- [x] Leader offline gets the `feature_opened` at its first polling: `test/integration/feature.test.ts:211-226` (whole event by value).
- [x] The mother polls neither of her two events: `test/integration/feature.test.ts:229` `toEqual({ events: [] })`; `test/integration/server-feature.test.ts:151`.
- [x] Non-mother with a feature open gets `edge_not_allowed`: `test/unit/feature-open.test.ts:135` (leader). Note: the worker is only exercised without a feature open (`:87`); same branch of `feature.ts:35`.
- [x] `feature_already_open` leaves a `refused` with the id of the open feature and the row as it was: `test/unit/feature-open.test.ts:95-98`; `test/integration/feature.test.ts:87-105`.
- [x] Second `/close-feature`: `test/unit/feature-close.test.ts:96-97`.
- [x] Ticket `T` open in the closed feature, other ticket and new `T` in the next: `test/unit/feature-close.test.ts:223-230`.
- [x] Closing with a blocked peer writes no `unblocked`: `test/unit/feature-close.test.ts:142-143`.
- [x] `/blocked`, `/usage`, `/turn-started` after the close have `feature_id` null: `test/unit/feature-close.test.ts:149-156`.
- [x] `feature_id`, `project`, `from`, `opened_seq` of the body ignored: `test/unit/feature-open.test.ts:151-158`; `test/integration/feature.test.ts:55-60`.
- [x] Database of the Event slice without the index gains it: `test/unit/db.test.ts:240-253`.

Success criterion 1 (open → task → plan → close with two MCP clients, nothing written in `features` from outside): `test/integration/server-feature.test.ts:164-193`.

---

## Migration audit (T11–T21, T26–T30) and the two changed expectations

Compared each migrated file commit by commit (`git diff <commit>^ <commit> -- <file>`).

| File | Tests before → after | Finding |
| ---- | -------------------- | ------- |
| `test/unit/log.test.ts` (5832c43) | 35 → 35 | Every `toEqual` stays exact; lists gain `storedOpened(1, id)` / `readOpened` and `...toOthers(1)` |
| `test/unit/send.test.ts` (65ec627) | 25 → 25 | `expect(b.deliveries()[1]).toEqual(...)` became the whole list (`:54-58`): stricter |
| `test/unit/send-task.test.ts` (3ec07fc) | 22 → 22 | seq +1, deliveries `[...toOthers(1), ...]` |
| `test/unit/send-result.test.ts` (438ef01) | 21 → 21 | seq +1; delivery seqs `[1, 1, 1, 1, 1, 3, 5]` |
| `test/unit/send-verdict.test.ts` (5da7e04) | 18 → 18 | seq +1; the EVT-10 test keeps its two refusals (stale seq, then dropped ticket) |
| `test/unit/plan.test.ts` (cf964b2) | 16 → 16 | `every(kind === "refused") toBe(true)` became the exact list of kinds: stricter |
| `test/unit/state.test.ts` (c160ac7) | 8 → 8 | `owed` gains `{ owes: "delivery", seq }` of the opening and of the closing for the five; the mother stays `[]` (new assertion) |
| `test/unit/session.test.ts` (1c5c346) | 16 → 16 | exact lists with the opening |
| `test/unit/presence.test.ts` (64fe651) | 31 → 31 | exact lists with the opening |
| `test/unit/permission.test.ts` (8fbcd39) | 24 → 24 | exact lists with the opening |
| `test/integration/routes.test.ts` (ff17d27) | 25 → 25 | EVT-69 closes by `/close-feature` and asserts `{ ok: true, seq: 9 }` instead of a raw `UPDATE`; EVT-43 keeps every row compared |
| `test/integration/events.test.ts` (c8d2d5e) | 10 → 10 | exact |
| `test/integration/server-delivery.test.ts` (2cee76d) | 14 → 14 | five assertions added on the pushed `feature_opened`; pending counts 0 → 4 are the four names with no session |
| `test/integration/server-tools.test.ts` (96cd9ac) | 7 → 7 | the leader state stays `owed: []`, now after waiting for its ack of the opening |

- No test deleted or skipped: the only `skipIf` in the tree are the three pre-existing ones (`test/integration/cli.test.ts:65`, `:100`, `test/unit/presence.test.ts:6`).
- No exact comparison loosened: per commit, the count of `toContain`/`toMatchObject`/`expect.any`/`toHaveLength` never rises in a migrated file except the one `expect.any(Number)` of the new `opening` helper in `server-delivery.test.ts:43` for an ack time, which the old assertion used too.
- Expected values re-derived here from the spec (opening = one seq and five pending deliveries; closing = the same; the five owe `delivery`): all match. None needs the output to be explained.
- No old helper left: the only raw writes to `features` in tests are the FEAT-09 and FEAT-12 probes (`test/unit/db.test.ts:200`, `:221`, `test/unit/log.test.ts:516-519`), which have to bypass the rule.
- `test/unit/presence.test.ts:413-419` (T5): `find` now answers `{ name, role, cwd, git_root }` and the key set is still asserted exactly. Supported by FEAT-11 and `design.md:126`.
- `test/integration/server-tools.test.ts:47` (T23): the exact list of the mother gains `open_feature` and `close_feature`. Supported by FEAT-29.

---

## Discrimination Sensor

Scratch: temporary `git worktree` outside the repository, `node_modules` linked by a junction (removed before
the worktree). One mutation at a time. Unit run first; a mutant alive after it goes to the full suite.
Mutations of `broker.ts` and `server.ts` ran against `test/integration/feature.test.ts` and `server-feature.test.ts`.

| # | File:line | Mutation | Killed? (first failing test) |
| - | --------- | -------- | ---------------------------- |
| 1 | `feature.ts:21` | `.git` branch dropped: `return last` | ✅ FEAT-14 row `project` (6 fail) |
| 2 | `feature.ts:19` | `basename(cwd)` → `cwd` | ✅ FEAT-11 without a git_root |
| 3 | `feature.ts:35` | open: role check → `if (false)` | ✅ FEAT-02 leader |
| 4 | `feature.ts:38` | open: already-open check → `if (false)` | ✅ FEAT-03 |
| 5 | `feature.ts:38` | open: state checked only when `title` is text | ✅ FEAT-06 state before field |
| 6 | `feature.ts:47` | `!isText(spec_ref) \|\|` removed | ✅ FEAT-04 spec_ref absent |
| 7 | `feature.ts:43` | `!isText(title)` → `typeof title !== "string"` | ✅ FEAT-04 title an empty text |
| 8 | `feature.ts:55` | workflow check → `if (false)` | ✅ FEAT-05 |
| 9 | `feature.ts:24` | `WORKFLOWS` = `["tlc"]` | ✅ FEAT-05 matt-pocock accepted |
| 10 | `feature.ts:60` | `projectOf(null, peer.cwd)` | ✅ FEAT-14 / FEAT-01 row |
| 11 | `feature.ts:33` | open refusals traced as `feature_closed` | ✅ FEAT-02 (32 fail) |
| 12 | `feature.ts:75` | close: role check → `if (false)` | ✅ FEAT-15 |
| 13 | `feature.ts:78` | close: no-feature check → `if (false)` | ✅ FEAT-16 |
| 14 | `feature.ts:78` | close: state checked only when `outcome` is text | ✅ FEAT-19 state before field |
| 15 | `feature.ts:82` | `body !== undefined` → `body != null` | ✅ FEAT-17 a body null |
| 16 | `feature.ts:82` | `typeof outcome !== "string"` → `!isText(outcome)` | ✅ FEAT-18 outcome `""` |
| 17 | `feature.ts:85` | outcome list check → `if (false)` | ✅ FEAT-18 |
| 18 | `feature.ts:88` | body dropped: `log.close(peer, outcome, "")` | ✅ FEAT-14 |
| 19 | `feature.ts:82` | body type checked only for a valid outcome | ✅ FEAT-19 missing before invalid |
| 20 | `log.ts:89` | author not filtered out of `*` | ✅ EVT-13/39 and 29 others |
| 21 | `log.ts:89` | `worker-3` left out of `*` | ✅ 28 fail |
| 22 | `log.ts:78` | reserved `feature_id` ignored by `write` | ✅ FEAT-01 |
| 23 | `log.ts:109` | id from `MAX(id) FROM features` | ✅ FEAT-12 |
| 24 | `log.ts:123` | `spec_ref` and `spec_commit` swapped in the row | ✅ 10 fail |
| 25 | `log.ts:116` | `data: fields` (whole object) | ✅ FEAT-01 only the six fields |
| 26 | `log.ts:107` | `open` without `db.transaction` | ✅ FEAT-08 |
| 27 | `log.ts:130` | `close` without `db.transaction` | ✅ FEAT-21 |
| 28 | `log.ts:132` | row outcome always `"delivered"` | ✅ FEAT-14 abandoned |
| 29 | `log.ts:131` | `feature_closed` without `body` | ✅ FEAT-14 |
| 30 | `log.ts:131` | `feature_closed` with `data: {}` | ✅ FEAT-14 |
| 31 | `log.ts:125` | answer `feature_id: seq` | ✅ 15 fail |
| 32 | `db.ts:81` | unique index removed | ✅ FEAT-09 second INSERT |
| 33 | `db.ts:81` | index not partial | ✅ FEAT-09 (20 fail) |
| 34 | `db.ts:81` | index `WHERE outcome IS NULL` | ✅ FEAT-09 |
| 35 | `peers.ts:210` | `find` answers `git_root` NULL | ✅ EVT-45, FEAT-11 |
| 36 | `shared/derive.ts:146` | events not sorted by seq | ✅ FEAT-26 ascending id |
| 37 | `shared/derive.ts:165` | `outcome` not copied from the `feature_closed` | ✅ FEAT-26 |
| 38 | `shared/derive.ts:169` | final sort by id removed | ⚪ Survived, equivalent (below) |
| 39 | `shared/derive.ts:162` | `feature_closed` closes the feature opened last, not the one of its `feature_id` | ⚪ Survived, equivalent (below) |
| 40 | `tools.ts:225` | leader gets `close_feature` | ✅ FEAT-29 |
| 41 | `tools.ts:246` | `open_feature` routed to `/close-feature` | ✅ EVT-90/92 routes |
| 42 | `tools.ts:215` | `close_feature` requires `body` | ✅ FEAT-29 schema |
| 43 | `broker.ts:41` | `/close-feature` out of the credential routes | ✅ FEAT-14/21 (11 fail) |
| 44 | `broker.ts:121` | `/close-feature` handled by `feature.open` | ✅ FEAT-14/21 |
| 45 | `broker.ts:119` | `git_root` of the peer dropped before `feature.open` | ✅ FEAT-01/07 `project` |
| 46 | `server.ts:329` | `Feature … opened` text never used | ✅ FEAT-30/31 |
| 47 | `server.ts:329` | text carries the seq as the id | ✅ FEAT-30/31 |
| 48 | `server.ts:320` | arguments may override the session id | ✅ FEAT-30/31 |
| 49 | `server.ts:149` | instructions no longer name `feature_opened` | ✅ FEAT-33 |
| 50 | `log.ts:131` | `feature_closed` written after the row is closed | ✅ FEAT-14 `feature_id` |
| 51 | `tools.ts:224` | mother without `close_feature` | ✅ EVT-89/FEAT-29 |
| 52 | `broker.ts:40` | `/open-feature` out of the credential routes | ✅ FEAT-01/07 (13 fail) |
| 53 | `shared/derive.ts:162` | `feature_closed` closes the first feature | ✅ FEAT-26 |
| 54 | `log.ts:131` | close confirms every pending delivery | ✅ FEAT-24, FEAT-22 |
| 55 | `feature.ts:56` | `invalid_field` of open answered without the `refused` | ✅ FEAT-05 |
| 56 | `shared/derive.ts:157` | `opened_seq: id` | ✅ FEAT-26 |
| 57 | `feature.ts:79` | `no_open_feature` of close answered without the `refused` | ✅ FEAT-16 |

**Survivors, both classified equivalent** (full suite green with each):

- **38** `shared/derive.ts:169`: `return [...all.values()].sort((a, b) => a.id - b.id);` → `return [...all.values()];`.
  The map is filled in ascending `seq`, and `log.ts:109` gives every feature `MAX(feature_id) + 1`, so on any log the
  broker writes the insertion order already is the ascending id (FEAT-12, killed by mutant 23 when broken).
  The two orders differ only for a log where a later `feature_opened` has a smaller id, which the broker cannot write.
- **39** `shared/derive.ts:162`: `const feature = all.get(e.feature_id as number);` → `const feature = [...all.values()].at(-1);`.
  A `feature_closed` always carries the id of the open feature (FEAT-14, mutants 22 and 50), and the open feature is always
  the one opened last (FEAT-09, mutants 32–34). The two lookups differ only for a log with two features open at once.

  Both would be killed by a synthetic log that breaks those invariants. FEAT-26 defines the function over "os eventos do
  log", so such a log is outside its input; if the function should also be pinned for malformed logs, one unit case in
  `test/unit/derive.test.ts` does it. Not a fix task.

**Sensor depth**: P0-full (expanded, manual fault injection)
**Result**: 57 injected, 55 killed, 2 survived and equivalent, 0 real survivors - PASS ✅

Isolation: after removing the junction and the worktree, `git status --porcelain` of the real tree was empty and `HEAD` unchanged.

---

## Gate Check

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit` and `bun test` (from `broker/`)
- **Result**: types exit 0; 539 tests in 30 files, 536 passed, 0 failed, 3 skipped (4303 `expect()` calls, 40.85 s). Unit only: 403 tests, 402 passed, 1 skipped.
- **Test count before feature**: 424 (421 passed, 3 skipped), measured at `93e36f7` in the scratch worktree
- **Test count after feature**: 539
- **Delta**: +115 new tests, none removed
- **Skipped tests**: the three pre-existing platform skips, `test/integration/cli.test.ts:65`, `test/integration/cli.test.ts:100` and `test/unit/presence.test.ts:6` (decoy host, and two POSIX-only cases on Windows)
- **Failures**: none. The timing-flaky `EVT-43: /ack confirms…` of `test/integration/routes.test.ts` did not fail in this run.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `feature.ts` is 92 lines; the two rules reuse `log.refused`, `isText`, `Caller` |
| Surgical changes | ✅ production diff limited to the eight files of the design |
| No scope creep | ✅ no gate, no git check, no CLI command |
| Matches patterns | ✅ same shape as `plan.ts` and `session.ts` |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ each route: happy path, a rule refusal, `unknown_peer`, invalid body (`test/integration/feature.test.ts:52-184`) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ every new test carries a FEAT or EVT id |
| Documented guidelines followed: none - strong defaults applied (`broker/CLAUDE.md` only fixes the commands) | ✅ |

---

## Observations (not blocking)

1. Edge case "a worker or the leader with a feature open": only the leader is exercised with a feature open (`test/unit/feature-open.test.ts:135`). The worker hits the same `peer.role !== "mother"` branch.
2. FEAT-09 "por qualquer conexão": proven by raw SQL on the handle and on a reopened file (`test/unit/db.test.ts:210-253`), not by two simultaneous connections. A unique index is a schema object, so the handle does not matter.
3. `refusedWith` computes the expected `feature_id` of the `refused` from `log.openFeature()` (`test/unit/helpers.ts:185`). The two cases the spec names are pinned by literal in `test/integration/feature.test.ts:93` and `:145`, and in `test/unit/feature-open.test.ts:97`.
4. `project` empty for a `cwd` at the root of a disk (`test/unit/feature-open.test.ts:20`) is not in the spec; it is an accepted risk of `design.md:211`.
5. Success criterion 4 asks the spec to record whether Linux ran. `spec.md` does not say yet; `tasks.md:755` lists it as a closing step. Linux did not run here.
6. `broker/CLAUDE.md` still shows `bun x tsc --noEmit` under "Running", which `.specs/STATE.md` says downloads another TypeScript.

---

## Requirement Traceability Update

`spec.md` was not edited by the Verifier.

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FEAT-01 … FEAT-33 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 33/33 ACs matched the spec outcome, 10/10 edge cases, 0 spec-precision gaps
**Sensor**: 55/57 mutations killed, 2 equivalent, 0 real survivors
**Gate**: 536 passed, 0 failed, 3 skipped; types clean

**What works**: opening and closing by the route and by the tools, one open feature enforced by rule and by index, the five deliveries, atomic writes, the replay equal to the table, restart, channel delivery.

**Issues found**: none blocking. See Observations.

**Next steps**: the closing steps of `tasks.md:755` (traceability in `spec.md`, the Linux note, roadmap, PR with the owner's approval).
