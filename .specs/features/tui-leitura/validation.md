# TUI leitura Validation - round 2 - FAIL ❌

**Result**: FAIL

**Round**: 2 (re-verification after fix round 1). This file replaces the round 1 report, which is in git at `fe9c4bd:.specs/features/tui-leitura/validation.md`.
**Date**: 2026-10-09
**Spec**: `.specs/features/tui-leitura/spec.md`
**Diff range**: `main..fb41991` (48 commits, branch `feat/tui-leitura`, merge-base `2fe4622`); the fix round is `872fe2f..fb41991` (10 commits)
**Verifier**: independent sub-agent (author ≠ verifier, and not the author of the fix round)
**Environment**: Windows 11, Bun 1.3.14, TypeScript from `broker/node_modules`

All paths below are relative to `broker/` unless they start with `.specs/`, `.design/` or `docs/`.
Baseline before any work: `git status --porcelain` empty, `HEAD` = `fb41991b0f5ae0890eebb46acd618034dbef7c5a`.
After the scratch was removed the porcelain output shows only this file and the lessons files.

**Why FAIL, in one paragraph.** Everything round 1 asked for is done: the 18 survivors are all
killed, each by a test that fails with the mutation and passes without it, no test was weakened,
the gate passes on the first run, and the four points the spec did not define are now rows of its
Assumptions with a test each. No behaviour was found that contradicts the spec. The verdict is
FAIL because the sensor of this round, with 46 mutations that round 1 had not tried, found 8 more
that are not equivalent and that no test notices. Five are one gap, on the AC round 1 had already
flagged: TUI-35 fixes the order of the third line of an agent, and the fix round pinned one pair
of that order (`x <tool>` before `⚠ <reason>`); `sem reação há <idade>` drawn before the debt,
before the reason of the block, before the permission request or before the blocking question,
or after the loadout, still passes every test. Two are the condition of `· retoma <ticket>`
(Assumption "Volta de um peer": only a ticket still open). One is in the code this round wrote:
`report()` of the probe exits 0 for a glyph the terminal counts as zero cells (TUI-59: "2 se
alguma não é"). Each was confirmed not equivalent in the scratch with a test of the spec outcome
that passes on the real code and fails on the mutant.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T30 | ✅ Done | 30 task headings in `.specs/features/tui-leitura/tasks.md`; 124 "Done when" boxes checked, 0 open |
| Fix round 1, gaps 1 to 9 and the four spec points | ✅ Done | 10 commits `d2c21a1`..`fb41991`; outside `test/` they touch `tui/feed.ts` (+8 −1) and `tui/probe.ts` (+10 −4), and add four rows to the Assumptions of the spec |

`spec.md` still shows every requirement as `Implementing`. Not changed by the Verifier.

---

## Round 1 survivors and their fate

Each of the 18 was applied again, alone, in the scratch, at its place in `HEAD`. All 18 are killed.

| Id | File:line in `HEAD` | Mutation | Killed by |
| -- | ------------------- | -------- | --------- |
| A06 | `tui/ansi.ts:30` | `LEAVE` without `\x1b[?25h` | `test/unit/tui-ansi.test.ts:9` - `expect(LEAVE).toBe("\x1b[?25h\x1b[?1049l")` |
| A07 | `tui/ansi.ts:29` | `ENTER` without `\x1b[?25l` | `test/unit/tui-ansi.test.ts:8` - `expect(ENTER).toBe("\x1b[?1049h\x1b[?25l")` |
| T13 | `tui.ts:93` | `paint(next, null, …)` on every drawing | `test/unit/tui-loop.test.ts:87` - `expect(positions).toEqual(changed)` after `key("j")`, with `changed.length` between 1 and 39 (`:85-86`) |
| T17 | `tui.ts:93` | the glyphs not handed to `paint` | `test/unit/tui-loop.test.ts:98` - `expect(t.out).not.toContain("⚠")` over the log of frame 10 with `⚠=!` |
| L29 | `tui.ts:116` | `setTimeout(…, 5)` | `test/unit/tui-loop.test.ts:109` - `expect(t.calls).toHaveLength(1)` 60 ms after the first drawing, interval 60000 |
| X02 | `tui/screens/detail.ts:366` | any `gate_decision` drawn as `aprovado` | `test/unit/tui-detail.test.ts:317-318` (two tests, `comment` and `reject`) |
| X11 | `tui/screens/detail.ts:419` | `find` in place of `findLast` | `test/unit/tui-detail.test.ts:311` - `toEqual(["✗ abandonada · 14:54:32", "  segunda feature", "  motivo", "  prioridade mudou"])` |
| L16 | `tui/screens/topology.ts:144` | every open question, whoever holds it | `test/unit/tui-topology.test.ts:145-148` - `"dev       via mother"`, `"perguntas abertas · 0"`, no line starting `Q-07` |
| S14 | `tui/screens/main.ts:47` | `⚠ <reason>` before `x <tool>` | `test/unit/tui-main.test.ts:60` - `toBe("x Bash · bun test src/…")` for an agent the derivation gives both (`:57-59`) |
| D17 | `shared/derive.ts:584` | `done` needs a ticket not dropped | `test/unit/derive-squad.test.ts:942` - `toEqual({ mot: "working", ldr: "done", w1: "done", … })` |
| D19 | `shared/derive.ts:527` | "sem reação" only inside the open feature | `test/unit/derive-squad.test.ts:1044` - `expect(noReaction(log, "worker-1", 120000)).toBe(T0 + 10000)` after the `feature_closed` |
| S23 | `tui/screens/chrome.ts:127` | `Math.floor` | `test/unit/tui-chrome.test.ts:21` - `toContain("mot 2k")` for 1600 tokens (`:20`) |
| L08 | `tui/screens/main.ts:77` | `all.length > 8` | `test/unit/tui-main.test.ts:132` - six lines and `"+2 tickets"` for eight tickets |
| C03 | `tui/config.ts:31` | `some(isPrice)` | `test/unit/tui-config.test.ts:41` - `expect(() => prices({ SQUAD_PRICES: path })).toThrow(path)` for one valid and one invalid model |
| L28 | `tui.ts:124` | `press(ui, k, seen)` | `test/unit/tui-loop.test.ts:195-196` - line 2 has `TKT-14` and not `TKT-13` after the chunk `3]]` |
| P01 | `tui/probe.ts:49` | exit code always 0 | `test/unit/tui-probe.test.ts:11` - `toEqual({ lines: ["⚠  U+26A0  2", "⟳  U+27F3  1", "not one cell: ⚠"], exitCode: 2 })`. The decision moved into `report()`; the line that hands it to `process.exit` is N08 below |
| L06 | `tui/screens/main.ts:102` | `◌ parado` on any ticket of an offline owner | `test/unit/tui-main.test.ts:158` - `expect(panel).not.toContain("parado")` (the `done` case; in the `planned` and `dropped` cases the panel has no owner to read, so they hold by construction) |
| L22 | `tui/activity.ts:31` | the countdown below zero | `test/unit/tui-activity.test.ts:96` - `.left).toBe(0)` one second after the deadline, and `:97` - `toContain("? 0:00")` |

**The one assertion removed since `1f377d5`.** `test/unit/tui-detail.test.ts` had
`expect(detail("25a", 470).slice(1, 5)).toEqual(["agente w1  worker-1", "tentou [task]", "erro   worker_busy", "vezes  1 · 14:51:25"])`.
It is now `:167`, the same four lines with `"agente ldr leader"`, and `:168-171` adds what it did
not have: that the feed keeps the `worker_busy` refusal and the three `ticket_dropped` refusals of
the same peer as two lines. The replacement is at least as strong: same shape, same number of
values pinned, the one value that changed follows the event of the log, and one assertion more.

**Nothing weakened, skipped or deleted** in `git diff 1f377d5..HEAD -- broker/test`: the only
other removed lines are the import of `tui-ansi.test.ts` (it gained `ENTER`, `LEAVE`), the
signature of `launch` in `tui-loop.test.ts` (it gained the settings) and seq 470 of `logs.ts`.
No `.skip`, `.todo` or `.only` in the tests of the feature. `expect(` calls per changed file all
went up (derive-squad 325 → 329, activity 74 → 77, ansi 16 → 18, chrome 26 → 28, config 14 → 15,
detail 54 → 58, feed 29 → 30, loop 36 → 44, main 66 → 75, probe 0 → 2, topology 24 → 28).

---

## Spec-Anchored Acceptance Criteria

Evidence is one or two representative assertions per AC; the frame tests
(`test/unit/tui-frames.test.ts:32-36`) back most of the screen ACs as well. "Sensor" names the
mutations of the table further down (ids of round 1 are in its report).

### P1: Status derivado do log

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| TUI-01 no presence event → `never` | status `never` | `test/unit/derive-squad.test.ts:648` - `expect(agent(log, "worker-1")).toEqual({ …, status: "never", … })`; `:664` - `toEqual({ mot: "idle", ldr: "idle", w1: "never", … })` | ✅ PASS |
| TUI-02 last presence is `peer_left` → `offline`, its `ts` as start | `offline`, `since` = ts of the `peer_left` | `test/unit/derive-squad.test.ts:670` - `.status).toBe("offline")`; `:671` - `.since).toBe(T0 + 9000)` | ✅ PASS |
| TUI-03 `blocked` without later `unblocked` of the name | `blocked` with the `reason` | `test/unit/derive-squad.test.ts:682-683` - `toBe("blocked")`, `toBe("missing credential")`; `:689` unblocked by the broker → `idle` | ✅ PASS |
| TUI-04 open permission request | `blocked` with the `seq` of the request | `test/unit/derive-squad.test.ts:697-698` - `toBe("blocked")`, `expect(a.permission!.seq).toBe(9)`; closing `:106`, `:111`, `:121` | ✅ PASS |
| TUI-05 `asked_by` of an open blocking question | `waiting` + blocking mark + `question_id` | `test/unit/derive-squad.test.ts:718-719` - `toBe("waiting")`, `expect(a.blockingQuestion).toBe(4)`; `:723` the forwarder has none | ✅ PASS (N20 killed) |
| TUI-06 sent a `question` of an open question or a pending `gate`, no ticket in progress | `waiting` | `test/unit/derive-squad.test.ts:750`; `:768` - `toEqual({ mot: "waiting", ldr: "waiting", w1: "waiting", w2: "done", … })`; `:775-778`; `:784`, `:788`, `:798` | ✅ PASS (N15, N16 killed) |
| TUI-07 owes an event and is out of turn | `stalled` with the oldest debt | `test/unit/derive-squad.test.ts:807`; `:865` oldest of two; `:876` in turn → `working`; `:898-901` since when | ✅ PASS (N11 killed) |
| TUI-08 what counts as a debt | result / verdict / task after rework / plan after kickoff / answer of the holder | `test/unit/derive-squad.test.ts:808`, `:816`, `:822`, `:832`, `:840` - `toEqual({ owes: "answer", question_id: 9, seq: 12 })`; `:846` the seq of the question that made the holder | ✅ PASS (N13 killed) |
| TUI-09 `working` per role | worker / judge / leader / mother with open feature | `test/unit/derive-squad.test.ts:913` - `toEqual({ mot: "working", ldr: "working", w1: "working", w2: "idle", w3: "idle", jdg: "working" })`; `:915` | ✅ PASS |
| TUI-10 every non-dropped ticket of the latest plan approved | `done` | `test/unit/derive-squad.test.ts:919`, `:924`, `:933-936`; all dropped: `:942` | ✅ PASS (D17, N12, N18 killed) |
| TUI-11 the rest | `idle` | `test/unit/derive-squad.test.ts:947` - `toBe("idle")` after a rework; `:956-963` | ✅ PASS |
| TUI-12 precedence | `never`, `offline`, `blocked`, `waiting ?`, `waiting`, `stalled`, `working`, `done`, `idle` | one test per neighbouring pair: `test/unit/derive-squad.test.ts:968`, `:981`, `:988-989`, `:995`, `:1007`, `:1013` | ✅ PASS |
| TUI-13 no open feature | only `never`, `offline`, `blocked`, `idle` | `test/unit/derive-squad.test.ts:1018` - `toEqual({ mot: "idle", ldr: "idle", w1: "idle", w2: "offline", w3: "blocked", jdg: "never" })`; `:1030` | ✅ PASS |
| TUI-14 ticket status in order | `dropped`, `planned`, `escalated`, `done`, `blocked`, `waiting`, `review`, `working` | one test per status `test/unit/derive-squad.test.ts:465-542`, per pair `:554-586`, e.g. `:566` - `toBe("escalated")` | ✅ PASS (N14 killed) |
| TUI-15 only `task`, `result`, `verdict` are events of a ticket | `last` unchanged by question/answer/blocked | `test/unit/derive-squad.test.ts:597` - `toEqual({ kind: "result", seq: 11 })`; `:602` | ✅ PASS |
| TUI-16 message 120000 ms old with no later event of the agent | the ts of the oldest one | `test/unit/derive-squad.test.ts:1050` - `toBeNull()` at 119999; `:1051` - `toBe(T0 + 10000)` at 120000; whole log `:1044` | ✅ PASS (D19 killed) |
| TUI-17 token totals | latest `usage` per `session_id` and `model`; feature = that minus the last before `feature_opened` | `test/unit/derive-squad.test.ts:347`; `:376` - `toEqual({ opus: { input: 700, output: 70, cache_write: 5, cache_read: 47 } })`; `:393`; `:1153-1154` | ✅ PASS |
| TUI-18 pure | same events and now → same squad | `test/unit/derive-squad.test.ts:1197` - `expect(squad(log, NOW)).toEqual(first)` over a frozen log; `:1198`; `:1205` out of order | ✅ PASS |

### P1: Feed e tela principal

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| TUI-19 grid | 120×40 cells of character, colour, background, bold | `test/unit/tui-grid.test.ts:6-8` - `expect(g.rows.length).toBe(40)`, every row 120; `:14-15` | ✅ PASS |
| TUI-20 message line | hour, short `from`, `→`, short `to`, `[kind]`, `summary` cut with `…` at column 84 | `test/unit/tui-feed.test.ts:52`; `test/unit/tui-main.test.ts:181` - `toBe("  14:19:51 rev → hum [task]          a summary long eno…")` | ✅ PASS |
| TUI-21 default applied | yellow `⟳ Q-<id> timeout · default aplicado: <answer>` / `⟳ Q-<id> fechada · <rótulo> entregou antes da resposta` | `test/unit/tui-feed.test.ts:83-86`; colour `test/unit/tui-main.test.ts:195` | ✅ PASS (N23 killed) |
| TUI-22 `blocked` line | red `⚠ <rótulo> [blocked] <reason>` | `test/unit/tui-feed.test.ts:91`; colour `test/unit/tui-main.test.ts:196` | ✅ PASS |
| TUI-23 grouped refusals | one line, ` ×N` from the second, hour of the first | `test/unit/tui-feed.test.ts:96-99`, `:104`, `:109`; `test/unit/tui-detail.test.ts:168-171` | ✅ PASS |
| TUI-24 system lines | the texts of the AC | `test/unit/tui-feed.test.ts:124`, `:144`, `:150`, `:166`, `:179` | ✅ PASS for the AC. The Assumption "Volta de um peer" (`· retoma <ticket>` only for a ticket still open) is not discriminated: N21 and N22 survived |
| TUI-25 stalled line | `‖ <rótulo> [stalled] deve <dívida>` at the hour of the `usage`; one line per agent and debt (Assumptions) | `test/unit/tui-feed.test.ts:186`; `:200-203` - `toEqual([[5, T0 + 5000, 4, "‖ w2 [stalled] deve result TKT-13"], [10, T0 + 10000, 9, "‖ w2 [stalled] deve result TKT-13"]])` | ✅ PASS (N01..N04 killed) |
| TUI-26 limit line | right after the third `verdict` of `rework` | `test/unit/tui-feed.test.ts:209`, `:211-215` | ✅ PASS |
| TUI-27 no line for `turn_started`, `unblocked`, ordinary `usage` | no row | `test/unit/tui-feed.test.ts:226` - `toEqual(["● w1 entrou"])` | ✅ PASS |
| TUI-28 colours of the kind | `answer` blue; `gate`, `gate_decision` bright magenta; rework / deny bright red; approve / allow bright green | `test/unit/tui-main.test.ts:186-193` | ✅ PASS |
| TUI-29 lines before the open feature | gray, above the ruler (three texts) | `test/unit/tui-main.test.ts:201-208` | ✅ PASS |
| TUI-30 no open feature | gray before the last `feature_closed`; the two bands | `test/unit/tui-main.test.ts:212-213`, `:217-222` | ✅ PASS |
| TUI-31 no feature in the log | band with the hour of the first event; `○ log vazio` | `test/unit/tui-main.test.ts:226`, `:228` | ✅ PASS |
| TUI-32 last 33 lines, or the selected one in sight | window of 33 | `test/unit/tui-main.test.ts:235-241` | ✅ PASS |
| TUI-33 line 0 | project `›` title cut, `workflow`; `○ sem feature aberta`; `○ nenhuma feature ainda` | `test/unit/tui-chrome.test.ts:42` (the nine lines of frame 26c); `:90` | ✅ PASS (N36 killed) |
| TUI-34 counter, indicator, clock | `? N` of open questions held by `human`, red background when one blocks | `test/unit/tui-chrome.test.ts:52` - `toEqual(["? 2", "bwhite", "red", true])`; `:55`, `:58`, `:65` | ✅ PASS |
| TUI-35 agents panel | glyph, status, role, activity and the **first** third line that exists, in the order of the AC | `test/unit/tui-main.test.ts:24-36` (each alternative alone), `:41-46`, `:60` (`x <tool>` before `⚠ <reason>`); `test/unit/tui-activity.test.ts:27-97` | ❌ GAP (test): the place of `sem reação há <idade>` in the order is not asserted. Drawn before `‖ deve`, before `⚠ <reason>`, before `x <tool>`, before `? Q-<id> bloqueante`, or after the loadout, every test passes (N25..N29 survived). The first of these is the common case: a worker that never reacted to its task is `stalled` and "sem reação" at once |
| TUI-36 title | `agentes · 6` / `agentes · <n>/6 no ar` | `test/unit/tui-main.test.ts:64-65` | ✅ PASS |
| TUI-37 tickets panel | ref, title, owner, `⟳n/2` capped at 2, status, note | `test/unit/tui-main.test.ts:70-91`, `:95`, `:109-119`, `:132`, `:157-158` | ✅ PASS (L06, L08, N31 killed) · ⚠️ Spec-precision gap 1 |
| TUI-38 empty panel | the three texts | `test/unit/tui-main.test.ts:124-126` | ✅ PASS |
| TUI-39 detail panel | message block; one block per kind of system line | `test/unit/tui-detail.test.ts:21`, `:66` - `expect(lines.length).toBe(34)`, `:75`, `:85`, `:109`, `:119`, `:132`, `:137`, `:166-171`, `:175`, `:199`, `:221`, `:247` | ✅ PASS (N24 killed) |
| TUI-40 summary of the last closed feature | outcome, title, the gate decision of `approve`, reason, tickets, questions, duration, messages, cost | `test/unit/tui-detail.test.ts:267`, `:299`, `:311`, `:317-318`, `:323`, `:342` | ✅ PASS (X02, X11, N32, N33 killed) |
| TUI-41 footer | tokens of each agent in rounded thousands, `│ feature ≈$…` / `│ sessão ≈$…`, right side | `test/unit/tui-chrome.test.ts:21`, `:74`, `:117`; `test/unit/tui-activity.test.ts:112-170` | ✅ PASS (S23 killed) |
| TUI-42 key `t` | toggles feature / session; without feature shows the session and warns | `test/unit/tui-keys.test.ts:135-136`, `:142` | ✅ PASS |
| TUI-43 frames as tests | equal to the frame on every line outside the deviations; each deviation D1, D2 or D3 | `test/unit/tui-frames.test.ts:35` for 38 frames; `:44`; `:53-71`; `:125-129`; `:97` (frame 21); `test/unit/tui-chrome.test.ts:42` (26c), `:74` (30) | ✅ PASS (see "Frames as tests") |

### P1: Topologia, thread, legenda e estados da tela

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| TUI-44 topology | nodes, gray star, bright thick edge of the latest message; without feature normal colour and `○ última` | `test/unit/tui-topology.test.ts:42`, `:49-51`, `:55`, `:61-63`, `:68-85` | ✅ PASS (N35 killed) · ⚠️ Spec-precision gap 2 |
| TUI-45 panel `arestas` | active edge, six last messages, open questions held by `human`, five edges, reworks per ticket | `test/unit/tui-topology.test.ts:89`, `:121`, `:145-148` | ✅ PASS (L16 killed) |
| TUI-46 thread | header, entries in order, flow, criteria matrix, verdicts, notes, questions | `test/unit/tui-thread.test.ts:24-28`, `:33`, `:56` - `toBe("fluxo  task ▶ result ▶ ✗ v1 ▶ task ▶ ? Q-07 ▶ answer ▶ result ▶ ✓ v2")`, `:98`, `:128`, `:177` | ✅ PASS (N34 killed) |
| TUI-47 notes of an entry | the five notes of the AC | `test/unit/tui-thread.test.ts:66` - `toBe("6m36s")`; `:71` - `toBe("REWORK ⟳ 1/2 · 4/5")`; `:74`; `:79`; `:84` - `toBe("Q-13 [BLOQUEANTE] · ldr → mot")`; `:92` - `toBe("Q-07 · 3m22s no dev")` | ✅ PASS |
| TUI-48 planned and dropped tickets | `○ sem linha do tempo`…; ends with the `[dropped]` entry | `test/unit/tui-thread.test.ts:137-153`; `:163-164` | ✅ PASS |
| TUI-49 legend | frame 11 on every line that cites no key or screen of another slice | `test/unit/tui-frames.test.ts:77` plus frame 11 at `:35` | ✅ PASS (the lines that stay are now settled in Assumptions, "Textos de escrita mantidos") |
| TUI-50 read by cursor | events with `seq` above the cursor, in order; cursor to `last_seq` | `test/unit/tui-reader.test.ts:25-28`, `:36`; real broker `test/integration/tui.test.ts:109` | ✅ PASS (N38 killed) |
| TUI-51 failed read | last state kept, frame 12 with `broker ○ desconectado · <N>s` and the attempt, retry each interval | `test/unit/tui-reader.test.ts:54`, `:65`; `test/unit/tui-frames.test.ts:111-112`; `test/unit/tui-loop.test.ts:257-268` | ✅ PASS |
| TUI-52 status 200, wrong body | a failed read, log unchanged | `test/unit/tui-reader.test.ts:54-56` for "a body that is not JSON", "events that is not a list", "last_seq that is not an integer", "last_seq with a fraction" (`:42-45`) | ✅ PASS |
| TUI-53 read answers again | normal screen, same cursor | `test/unit/tui-reader.test.ts:55-56`; `test/unit/tui-loop.test.ts:271-272` | ✅ PASS (N39 killed) |
| TUI-54 terminal below 120×40 | only the message of frame 21 with the current size; back when it fits | `test/unit/tui-frames.test.ts:97`, `:102-105`; `test/unit/tui-loop.test.ts:223-233` | ✅ PASS |
| TUI-55 nothing but `GET /events` | every request is `GET …/events?after=<n>` | recording fakes: `test/unit/tui-reader.test.ts:83-86` and `test/unit/tui-loop.test.ts:285-289` - `expect(call.method).toBe("GET"); expect(call.url).toMatch(/^http:\/\/127\.0\.0\.1:7900\/events\?after=\d+$/)`; real broker `test/integration/tui.test.ts:116-120` - `expect(after.last_seq).toBe(before.last_seq + 1)` | ✅ PASS; code path: the only `fetch` of the TUI is `tui/reader.ts:19`, wired at `tui.ts:164`; no `POST`, no `SQUAD_TOKEN_FILE`, no database in `tui.ts` or `tui/` (searched) |

### P1: Rodar no terminal

| Criterion | Spec-defined outcome | `file:line` + assertion | Outcome |
| --------- | -------------------- | ----------------------- | ------- |
| TUI-56 `SQUAD_TUI_GLYPHS` | substitute written in place of the glyph; invalid pair → exit 1 with the pair | `test/unit/tui-ansi.test.ts:91`, `:115`; loop `test/unit/tui-loop.test.ts:97-98`; `test/integration/tui.test.ts:29-31` | ✅ PASS (T17 killed) |
| TUI-57 `SQUAD_PRICES` | cost from that table; missing or malformed file → exit 1 with the path | `test/unit/tui-config.test.ts:28`, `:33`, `:41`, `:56`, `:70`; `test/integration/tui.test.ts:39-41` | ✅ PASS (C03 killed) |
| TUI-58 invalid interval → 1000 ms | 1000 | `test/unit/tui-config.test.ts:82-83`, `:88` for absent, empty, `abc`, `0`, `-5`, `1.5`; loop `test/unit/tui-loop.test.ts:109` | ✅ PASS (L29 killed) |
| TUI-59 probe | widths written; exit 0 if all are 1, exit 2 **if any is not**; exit 1 outside a terminal | `test/unit/tui-probe.test.ts:5`, `:11`; `test/integration/tui.test.ts:15-17`; `test/unit/tui-glyphs.test.ts:10`, `:17` | ❌ GAP (test): "not 1" is only tested with a width of 2. `report()` with `w > 1` in place of `w !== 1` exits 0 for a glyph the terminal counts as zero cells, and passes (N05 survived). P01 and N06, N07 are killed |
| TUI-60 take and give back the terminal | alternate screen, hidden cursor, raw mode; all three restored on `q`, `ctrl+c`, `SIGTERM`, error | literals `test/unit/tui-ansi.test.ts:8-9`; `test/unit/tui-loop.test.ts:117-118`, `:124-125`, `:141-143`, `:157-159`; real broker `test/integration/tui.test.ts:102`, `:113-114` | ✅ PASS (A06, A07, N43 killed) |
| TUI-61 only the lines that changed, 16 colours and bold | diff by line | `test/unit/tui-ansi.test.ts:21`, `:29-51`, `:80-84`; loop `test/unit/tui-loop.test.ts:87` | ✅ PASS (T13 killed) |
| TUI-62 keys | screens, esc, selection, focus, enter, `[` `]`, `p`, `b`, `q` | `test/unit/tui-keys.test.ts:30-36`, `:41-54`, `:59-64`, `:68-69`, `:75`, `:86-94`, `:99`, `:105-106`, `:147`; `test/unit/tui-loop.test.ts:168`, `:195-196` | ✅ PASS (L28, N40, N41, N42 killed) |
| TUI-63 keys of other slices | 4 s notice `chega com a fatia Gate` / `Question`, same screen | `test/unit/tui-keys.test.ts:118-120` - `toEqual({ ...v.ui, toast: { text: "chega com a fatia Gate", color: "gray", until } })` with `until = now + 4000`; `:128`; `test/unit/tui-loop.test.ts:181-186` | ✅ PASS |
| TUI-64 project name | repository of the directory by `projectOf`; `feature` label outside one | `test/integration/tui.test.ts:66-68`; `test/unit/tui-chrome.test.ts:42` (label `feature`) | ✅ PASS |

**Status**: ❌ Gaps present - 62/64 ACs matched the spec outcome with discriminating assertions; TUI-35 and TUI-59 have a clause without one, and the Assumption "Volta de um peer" (under TUI-24) has a condition without one. ⚠️ 2 spec-precision gaps flagged.

### Spec-precision gaps

The four of round 1 are closed: rows "`usage` reenviado e linha de `stalled`", "Nota `◌ parado` ou `‖ parado` do ticket", "Textos de escrita mantidos na legenda e no detalhe de permissão" and "Prazo de pergunta vencido antes do default" of the Assumptions (`.specs/features/tui-leitura/spec.md:104-107`), each with a test but the third, which is text of frames 11 and 14 already compared. New in this round:

1. **TUI-37, which note when two apply.** The AC lists the notes of a ticket and does not say which one is drawn when more than one holds: an `escalated` ticket whose owner is `offline` (`◌ parado` or `→ mot`), a `waiting` ticket whose owner is `offline` (`◌ parado` or `? dev`). The code takes them in the order of the AC (`tui/screens/main.ts:99-110`); no test has such a ticket, and the spec gives nothing to anchor one to.
2. **TUI-44, what the node of the dev shows.** The AC only says the node is drawn. Frames 13b, 14, 19a and 23b each show one thing (`? 1 p/ responder`, `x 1 permissão`, `⚠ gate 2`, `via mother`) and the tests pin those four (`test/unit/tui-topology.test.ts:68-81`). With a permission request, a gate and a question waiting at once the code shows the permission (`tui/screens/topology.ts:159-165`); nothing in the spec says so.

---

## Frames as tests (TUI-43, AD-010)

- **All 41 reading frames of the Assumptions row are exercised**, and the set is exactly the one of the spec: 38 through `test/unit/tui-frames.test.ts:15-28` (27 main, 5 topology, 4 thread, legend 11, frozen 12), compared line by line at `:35`; frame 21 at `:97`; the nine lines of 26c and the six of 30 at `test/unit/tui-chrome.test.ts:42` and `:74`.
- **The `.txt` files are the untouched extraction.** `docs/claude-design-handoff/Handoff-Design.zip` was unzipped into a new empty directory outside the repository (`C:\tmp\tuiv2-zip`), a copy of `test/frames/extract.ts` was run on `Squad TUI.dc.html`, and the 41 blobs of `HEAD` (`git cat-file blob`) were compared byte by byte with its output: 41 compared, 0 differing. `git log main..HEAD -- 'broker/test/frames/*.txt'` shows one commit, `4657be1`.
- **Every deviation has a class and a reason**: 781 deviations over 37 frames (D1 451, D2 307, D3 23), 0 without a reason (`test/unit/tui-frames.test.ts:44`; recounted in the scratch). None is dead (`:125-129`), and the detector of dead deviations is itself tested (`:138`).
- **How much is compared.** Declared deviations replace 34617 of the 182400 cells of the 38 full-screen frames (19.0%); 45 more than in round 1, the line of the refusal of frame 25a.

### Agent-status deviations

- The test pins the list: `test/unit/tui-frames.test.ts:53-70`, 16 entries, and `:71` requires class D1 and `/\.design\/squad-mvp\.md line 3\d\d/` in the reason of each.
- The 16 entries are exactly the table "Desvios de status conhecidos nos painéis de agentes" of `.specs/features/tui-leitura/design.md:198-205` (9 mother, 2 worker-2, 1 leader in 10, 1 leader in 15a, 1 mother in 18a, 2 worker-1). Lines 355, 356, 358, 360 and 364 of `.design/squad-mvp.md` were read and say what the reasons claim.
- **Independent recount** (scratch script that does not read `deviations.ts`): for the 28 main-screen logs, the status drawn in the agents panel of each `.txt` against `squad(log, now)`. 14 differences, all in the table: `10 leader`, `14 mother`, `14 worker-2`, `15a leader`, `18a mother`, `22c mother`, `22h mother`, `22h worker-2`, `23a mother`, `23a worker-1`, `24a`, `24b`, `24c`, `25a mother`. The two of 23b are the topology of the log of 23a.
- **Read by hand**, the panel of the frame next to the derived fields: **01** (all six match: mother `waiting` with Q-07 and Q-08 open with the dev; leader `working`, in turn, Q-12 merged; worker-1 `waiting ?` on Q-07; worker-2 `waiting` on Q-08 after its result; worker-3 `idle`; judge `working`, in turn, with the result of TKT-13); **10** (leader derived `working`: it forwarded Q-09 but TKT-12 and TKT-13 are not concluded; worker-2 `blocked` since 14:29:41 with `RADIO_API_KEY ausente`); **14** (mother `working` with the request of worker-1 open, the fourth reading of AD-011; worker-2 `idle` after its result; worker-1 `blocked x`, request 459); **23a** (mother `working`; worker-1 `idle` after the rework; worker-2 `stalled` since 14:26:00 owing `result TKT-13` of seq 407; leader `working` with "sem reação" since 14:28:03, 3m10s at 14:31:13); **22h** (as 14 with the request decided).
- **Ticket status, frame 22h, TKT-12**: the recount finds it as the only ticket-status difference (prototype `blocked`, derived `working`). `test/frames/deviations.ts:207` declares it D1 and cites ".design/squad-mvp.md line 364".

### Honesty of the logs (`test/frames/logs.ts`)

No base skill is stuffed anywhere: no `task` of the logs carries a `loadout` (`test/frames/logs.ts:38-41`). Every event of every log was checked by a scratch script against `shared/contract.ts` and `.design/squad-mvp.md` lines 139-205.

| Events | Finding | Weight |
| ------ | ------- | ------ |
| seq 470 (`test/frames/logs.ts:263`) | **Half fixed.** The event is now `peer: "leader"`, `attempted_kind: "task"`, `error: "worker_busy"`: the shape `send.ts:113-119` writes, and the line of frame 25a is declared D1 (`test/frames/deviations.ts:232`). But `send.ts:113` returns `worker_busy` only when the recipient owns another ticket that is neither approved nor dropped, and in the log of 25a, right before seq 470, no worker does: TKT-12 is dropped (worker-1), TKT-13 and TKT-14 are approved (worker-2, worker-3), TKT-15 has no owner. A broker in that state accepts the task; it cannot write this refusal. Nothing drawn depends on it but its own line and its detail | Minor |
| seq 410, 412, 424, 428 | the mother sends Q-05, Q-06, Q-10 and Q-08 to `human` while the holder is the leader: the hop leader → mother is missing. Inherited from the prototype; each edge is allowed | Note |
| seq 467, 468 | Q-13 was asked by the leader; the answer of the dev goes to the mother and the mother sends a second `answer` to the leader. Inherited from the prototype; the derivation takes the first | Note |
| seq 403, 429, 430 | non-blocking questions without `default` (line 192 makes it mandatory) | Note |
| seq 439 | `gate` of scope `delivery` without `commit` (line 169) | Note |
| 27 events with a fractional `seq` | the `usage`, `turn_started`, `peer_left` and `blocked` the prototype does not have; declared at the top of the file. Three have a feed line (414.5, 436.5, 438.5) | Note |

Unchanged from round 1 but for seq 470. The `turn_started` placed to reproduce `working` against `stalled` are declared in the design ("isso não é desvio").

---

## The derivation against the design table and AD-008 / AD-011

- **Precedence** (`shared/derive.ts:545-585`): `never` (:545), `offline` (:546), `blocked` (:550), `waiting ?` (:560-561), `waiting` (:570), `stalled` (:577), `working` (:583), `done` (:584), `idle` (:585): the order of `.design/squad-mvp.md` lines 351-360 with `never` on top (AD-008).
- **AD-011, four readings**: ticket in progress per role (`shared/derive.ts:517-522`; tests `:784`, `:788`, `:798`); "escalou" includes who asked (`:564-569`; test `:750`); a ticket after a rework below the limit is `working` and its owner `idle` (`:414`, `:519`; tests `:500`, `:947`); the mother's "nada pendente" is only her questions and gates (`:564-570`; frames 14 and 22c draw her `working` with a request open).
- **Settled gaps of the Assumptions**: leader between kickoff and plan (`:832`), dropped ticket (`:959-963`), merged question (`:275`), `done` with every ticket dropped (`:942`), whole-log reach of "sem reação" (`:1044`), deadline 240 s and `timeout_s` (`:231`, `:240`).

---

## Discrimination Sensor

Expanded tier, in a temporary `git worktree` at `C:\tmp\tuiv2` (outside the repository), detached at `fb41991`, with `bun install --frozen-lockfile` in its `broker/`. One mutation at a time, `bun test test/unit test/integration/tui.test.ts`, the file restored after each. Baseline of the scratch: 781 pass, 1 skip, 0 fail (782 tests, 39 files). `git stash` was not used. The worktree was removed and pruned.

The 18 mutations of round 1 are in the section above: 18 injected, 18 killed. The 46 below are new; none is in the table of round 1.

| # | Area | File:line | Mutation | Outcome (first failing test) |
| - | ---- | --------- | -------- | ---------------------------- |
| N01 | feed (changed) | `tui/feed.ts:112` | the key of the line of stalled is the agent alone, without the seq of the debt | ✅ Killed: TUI-25: resent usage emits one stalled line per agent and debt origin |
| N02 | feed (changed) | `tui/feed.ts:113` | `if (!stalled.has(key))` → `if (true)` | ✅ Killed: same test |
| N03 | feed (changed) | `tui/feed.ts:112` | the key takes the `ticket_ref` of the debt in place of its seq | ✅ Killed: same test (the second debt of the same ticket has its line) |
| N04 | feed (changed) | `tui/feed.ts:115` | `stalled.add(key)` removed | ✅ Killed: same test |
| N05 | probe (changed) | `tui/probe.ts:46` | `filter(([, w]) => w !== 1)` → `w > 1` | ❌ **Survived.** TUI-59 "2 se alguma não é": no test has a width below 1 |
| N06 | probe (changed) | `tui/probe.ts:49` | exit code 1 in place of 2 | ✅ Killed: TUI-59: the probe reports a double width and exits two |
| N07 | probe (changed) | `tui/probe.ts:47` | the width left out of the line of each glyph | ✅ Killed: TUI-59: the probe reports widths and exits zero when every glyph takes one cell |
| N08 | probe (changed) | `tui/probe.ts:72` | `process.exit(result.exitCode)` → `process.exit(0)` | ❌ Survived - declared limit: the line is inside the block that needs a terminal on stdin and stdout (`tui/probe.ts:52-56`) |
| N09 | probe (changed) | `tui/probe.ts:67` | the loop that prints the lines removed | ❌ Survived - declared limit: same block |
| N10 | derivation | `shared/derive.ts:299` | `timeout_s` of the question ignored | ✅ Killed: the deadline uses the timeout_s of the question, and counts from the first question to the dev only |
| N11 | derivation | `shared/derive.ts:510` | a `usage` does not end a turn | ✅ Killed (6): TUI-07: an agent in turn is not stalled |
| N12 | derivation | `shared/derive.ts:515` | an approved ticket still counts as the ticket of its owner | ✅ Killed (25): TUI-10: with every ticket of the current plan that is not dropped approved, the agents are done |
| N13 | derivation | `shared/derive.ts:574` | the seq of the answer owed is the one of the first question, not of the latest | ✅ Killed: TUI-07, TUI-08: any agent out of turn owes the answer of an open question it holds |
| N14 | derivation | `shared/derive.ts:498` | a ticket is `blocked` with its owner offline | ✅ Killed: TUI-14: a ticket is not blocked when its owner is offline |
| N15 | derivation | `shared/derive.ts:328` | a merged question does not close with the one it was merged into | ✅ Killed: TUI-06: a merged question leaves the open ones and closes with the one it was merged into |
| N16 | derivation | `shared/derive.ts:307` | the last answer of a question counts, not the first | ✅ Killed (2): the first answer of a question is the one that counts |
| N17 | derivation | `shared/derive.ts:593` | the version of the plan counts the plans of the whole log | ✅ Killed (2): TUI-18: without an open feature the squad has no ticket, question, gate nor tokens of feature |
| N18 | derivation | `shared/derive.ts:584` | `done` without a `plan` | ✅ Killed (23): TUI-01 and others |
| N19 | derivation | `shared/derive.ts:350` | a second `gate` with the same `gate_id` replaces the entry | ❌ Survived - equivalent for this slice: only `Gate.request_seq` differs, and nothing in `tui.ts` or `tui/` reads it (searched); `pending` and `decision` come out the same |
| N20 | derivation | `shared/derive.ts:560` | `waiting ?` for the holder, not for `asked_by` | ✅ Killed (39): TUI-05: an agent that asked an open blocking question is waiting, with the question_id |
| N21 | feed | `tui/feed.ts:98` | the ticket of who left or came back may be an approved one | ❌ **Survived.** Assumption "Volta de um peer": no test has a peer that leaves or comes back owning an approved ticket; the mutant writes `● w3 voltou · retoma TKT-14` |
| N22 | feed | `tui/feed.ts:98` | the ticket of who left or came back may be a dropped one | ❌ **Survived.** Same Assumption, for a dropped ticket |
| N23 | feed | `tui/feed.ts:71` | who asked a question is the sender of its latest `question` | ✅ Killed (20): TUI-21: an answer by default is a system line without from and to |
| N24 | feed | `tui/feed.ts:92` | the squad of the closing line includes the `feature_closed` | ✅ Killed (18): TUI-39: the opening of a feature has what the event has, and the feature before it |
| N25 | screens | `tui/screens/main.ts:49` | `sem reação` before `‖ deve <dívida>` | ❌ **Survived.** TUI-35 order: no screen test has a stalled agent with a message without reaction |
| N26 | screens | `tui/screens/main.ts:51` | `sem reação` before `? Q-<id> bloqueante` | ❌ **Survived.** TUI-35 order |
| N27 | screens | `tui/screens/main.ts:55` | the loadout before `sem reação` | ❌ **Survived.** TUI-35 order |
| N28 | screens | `tui/screens/main.ts:50` | `sem reação` before `⚠ <reason>` | ❌ **Survived.** TUI-35 order |
| N29 | screens | `tui/screens/main.ts:47` | `sem reação` before `x <tool>` | ❌ **Survived.** TUI-35 order |
| N30 | screens | `tui/screens/main.ts:53` | the holder of the blocking question always `dev` | ✅ Killed (2): TUI-43: frame 15a of the main screen |
| N31 | screens | `tui/screens/main.ts:104` | `‖ parado` on any ticket of a stalled owner (the sibling of L06) | ✅ Killed: TUI-37: a done ticket has no stopped note when its agent is stalled |
| N32 | screens | `tui/screens/detail.ts:388` | the duration of the feature rounded down | ✅ Killed (4): TUI-40: without a selected line and without an open feature, the summary of the last feature |
| N33 | screens | `tui/screens/detail.ts:377` | the body of a delivered feature drawn as `motivo` | ✅ Killed (7): same test |
| N34 | screens | `tui/screens/thread.ts:54` | the line of the limit counted as an event of the thread | ✅ Killed (6): TUI-43: frame 15b of the thread |
| N35 | screens | `tui/screens/topology.ts:179` | system lines counted as messages of the topology | ✅ Killed (8): TUI-43: frame 02 of the topology |
| N36 | screens | `tui/screens/chrome.ts:103` | the count next to the tab of questions never red | ✅ Killed: TUI-33: the tabs, the count of questions next to the fourth and the keys, as in frame 01 |
| N37 | screens | `tui/activity.ts:30` | the countdown of a question already closed | ✅ Killed (23): TUI-35: the worker, with the reworks of the ticket in the text |
| N38 | reader | `tui/reader.ts:36` | a seq repeated inside one read enters twice | ✅ Killed: TUI-50: a seq already seen does not enter twice |
| N39 | reader | `tui/reader.ts:28` | `last_seq < cursor` → `<=`: a read with nothing new empties the log | ✅ Killed (2): TUI-51, TUI-53: while the broker does not answer the last state is frozen… |
| N40 | keys | `tui/keys.ts:63` | with no line selected the selection starts at the first | ✅ Killed (3): TUI-62: j, k and the arrows move the selection of the feed by one line, and stop at its ends |
| N41 | keys | `tui/keys.ts:83` | `b` goes to a question that does not block | ✅ Killed: b without a blocking question with the dev says so, for 4 s |
| N42 | keys | `tui/keys.ts:69` | `[` and `]` change the ticket outside the thread | ✅ Killed: TUI-62: [ and ] go to the ticket before and after in the thread, and stop at the ends of the plan |
| N43 | tui.ts | `tui.ts:100` | `clearTimeout(timer)` removed from the stop | ✅ Killed: TUI-60: the loop takes the terminal, draws what the broker answers and gives the terminal back on q |
| N44 | tui.ts | `tui.ts:110` | `if (stopped) return;` after the read removed | ❌ Survived - equivalent in the shipped process: `tui.ts:186-192` calls `process.exit` in the continuation of `done`, before a read in flight can resolve; the difference only shows through the injected loop, with a read pending at the stop, which no test sets up |
| N45 | tui.ts | `tui.ts:85` | the feed computed once and never again | ✅ Killed (2): TUI-50, TUI-55, TUI-64: the loop over a real broker draws the feature opened by the route |
| N46 | tui.ts | `tui.ts:178` | `stdout.on("resize", tui.resize)` removed | ❌ Survived - declared limit: the wiring to the real terminal (`tui.ts:149-193`) only runs with a terminal on stdin and stdout |

**Sensor depth**: expanded (18 survivors of round 1 re-applied, 46 new mutations over the code changed since `1f377d5`, the derivation, the feed, the screens, the reader, the keys and `tui.ts`)
**Sensor outcome**: 64 injected, 51 killed, 13 survived - 8 not equivalent, 2 equivalent, 3 inside a declared limit

Survivors that are not equivalent: N05, N21, N22, N25, N26, N27, N28, N29.

**Each was checked for equivalence, not assumed.** A scratch-only test file (never in the real tree) asserted the outcome the spec gives for the state each mutant gets wrong. All seven tests pass on the code of `HEAD`, and with the file present each of the eight mutants fails its test:

| Mutant | State built from a frame log | Spec outcome asserted (passes on `HEAD`) |
| ------ | ---------------------------- | ---------------------------------------- |
| N25 | frame 23a without the `usage` of seq 414.5: worker-2 `stalled`, last message to it at 14:24:10 | third line `‖ deve result TKT-13` |
| N26 | frame 01 plus a question of the judge to worker-1 written at 14:29:30: `waiting ?` on Q-07 | third line `? Q-07 bloqueante · dev` |
| N28 | frame 10 plus a question of the judge to worker-2 written at 14:29:00: `blocked` | third line `⚠ RADIO_API_KEY ausente` |
| N29 | frame 14 plus a question of the judge to worker-1 written at 14:29:30: `blocked x` | third line `x Bash · bun test src/…` |
| N27 | frame 24b, a loadout in the task of seq 406, plus a question to worker-1 written at 14:18:00: `working` | third line `sem reação há 2m20s` |
| N21, N22 | worker-3 leaves and comes back owning TKT-14, approved in one log and dropped in the other | `○ w3 saiu · sessão morta` and `● w3 voltou`, both with no ticket |
| N05 | `report({ "⚠": 0, "⟳": 1 })` | `exitCode` 2 |

---

## Interactive UAT Results

Not performed: the Verifier has no interactive terminal. See "Not verified".

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ The fix round adds a `Set` and a key to the feed (`tui/feed.ts:52`, `:111-117`) and one pure function to the probe (`tui/probe.ts:45-50`) |
| Surgical changes | ✅ Outside `test/`, the ten commits touch `tui/feed.ts`, `tui/probe.ts` and four rows of the Assumptions of the spec; one commit per gap |
| No scope creep | ✅ Nothing of the Out of Scope table is implemented; no `POST`; no read of `SQUAD_TOKEN_FILE` |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 62/64; TUI-35 and TUI-59 with a clause not discriminated |
| Per-layer Coverage Expectation met | ⚠️ Derivation 1:1 with TUI-01..18, every survivor of round 1 closed; the screen layer misses the order of one alternative of TUI-35 and the feed one condition of an Assumption |
| Every test maps to a spec requirement - no unclaimed tests | ✅ The 25 new tests each name an AC or an Assumption |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/features/tui-leitura/fix-round-1.md` "O que não fazer" | ✅ No frame `.txt` edited, no status deviation added (the pinned list still has 16), no dependency added, no comparison with a constant of the code where the spec gives the value |

Notes, none of them a failure:

- `tui/activity.ts:144-145` keeps a `// SPEC_DEVIATION` marker for the footer without the age, which the spec has adopted (Assumptions, "Um só alerta de agente sem feature aberta"). The marker is stale; noted in round 1 too.
- `tui/screens/down.ts:17-18` writes "reconexão automática a cada 1s" whatever `SQUAD_POLL_INTERVAL_MS` is; a `ponytail:` comment says so.
- The three `planned` and three `dropped` cases of `test/unit/tui-main.test.ts:138-161` cannot fail for the reason their name gives: such a ticket has no owner in the panel (`tui/screens/main.ts:84`), so no note is drawn with or without the rule. The two `done` cases are the ones that discriminate, and they do.

---

## Edge Cases

- [x] Unknown kind ignored in the feed and in the derivation - `test/unit/derive-squad.test.ts:1220` - `expect(squad([...WHOLE, unknown], NOW + 500000)).toEqual(squad(WHOLE, NOW + 500000))`; `test/unit/tui-feed.test.ts:226`
- [x] `from` or `to` outside the known names → first three characters - `test/unit/tui-feed.test.ts:70-71`; `test/unit/tui-main.test.ts:181`
- [x] `summary` with a line break → first line only - `test/unit/tui-feed.test.ts:53` - `[1, T0 + 1000, undefined, "player HLS"]` from `"player HLS\nsecond line"`
- [x] Title longer than line 0 → cut with `…`, the rest in place - `test/unit/tui-chrome.test.ts:42` (frame 26c)
- [x] Selection stays on its line when events arrive - `test/unit/tui-keys.test.ts:175-177`
- [x] Broker back on a new database (`last_seq` below the cursor) → log emptied, read from 0 - `test/unit/tui-reader.test.ts:73-75`
- [x] `permission_decision` citing a `seq` that is not a request → ignored - `test/unit/derive-squad.test.ts:129`
- [x] Two `peer_joined` without a `peer_left` → online - `test/unit/derive-squad.test.ts:93`
- [x] Resize → whole screen drawn again - `test/unit/tui-loop.test.ts:244-246`; the wiring to `stdout.on("resize")` (`tui.ts:178`) is not exercised (N46, declared limit)

9/9.

---

## Gate Check

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit && bun test` (from `broker/`, on the real tree)
- **tsc**: exit 0
- **Tests, one run**: 915 passed, 0 failed, 3 skipped (918 tests, 48 files, 57.3 s, 5577 `expect()` calls). No rerun was needed: `EVT-43` did not fail this time.
- **Test count before feature**: 540 (STATE Handoff, `main`)
- **Test count at round 1**: 893
- **Test count now**: 918
- **Delta**: +25 tests since round 1, +378 since `main`; no test file deleted, none weakened (see "Round 1 survivors and their fate")
- **Skipped tests**: `test/integration/cli.test.ts:65` (decoy host cannot be bound), `test/integration/cli.test.ts:100` and `test/unit/presence.test.ts:6` (Windows). All pre-existing and platform-bound
- **Failures**: none

---

## Fix Plans

All are tests; the code does what the spec says in every one of these cases (shown in the scratch).

### Fix 1: the place of `sem reação` in the third line of an agent (TUI-35; N25..N29)

- **Root cause**: `test/unit/tui-main.test.ts:24-36` asserts each alternative of the third line in a state where it is the only one that holds; `:49-61`, added in the fix round, pins one pair. `noReactionSince` is filled for every agent in the broker whatever its status (`shared/derive.ts:540`), so it holds together with the debt, the reason, the request, the blocking question and the loadout.
- **Fix task**: in `test/unit/tui-main.test.ts`, one case per pair, each built from a frame log by adding a message to the agent that is 120 s old with no event of the agent after it: `stalled` → `‖ deve …`; declared block → `⚠ …`; open request → `x …`; blocking question → `? Q-… bloqueante · …`; a task with a loadout, in turn → `sem reação há …`. Assert the status and `noReactionSince !== null` first, as `:56-59` does, so the case cannot pass on a state that has only one of the two. The table "Each was checked for equivalence" gives a log that works for each.
- **Done when**: N25, N26, N27, N28 and N29 each fail a test.
- **Priority**: Major (N25 is the ordinary state of a worker that never picked up its task)

### Fix 2: `· retoma <ticket>` only for a ticket still open (Assumption "Volta de um peer"; N21, N22)

- **Root cause**: `test/unit/tui-feed.test.ts:153-175` has a peer that comes back to an open ticket and one that has none; never one whose ticket is approved or dropped.
- **Fix task**: in `test/unit/tui-feed.test.ts`, a worker that leaves and comes back after its ticket was approved, and another after its ticket was dropped by a new plan: both lines are `○ … saiu · …` and `● … voltou`, with `row.ticket` undefined.
- **Done when**: N21 and N22 each fail it.
- **Priority**: Minor

### Fix 3: a width that is not 1 from below (TUI-59; N05)

- **Fix task**: in `test/unit/tui-probe.test.ts`, `report` over a map with a width of 0: `exitCode` 2 and the glyph in the last line.
- **Done when**: N05 fails it.
- **Priority**: Minor

### Fix 4: the refusal of seq 470 in a state that cannot produce it (frame 25a)

- **Root cause**: `test/frames/logs.ts:263` has the right peer now, but at that point of the log no worker owns an open ticket, and `send.ts:113` only answers `worker_busy` when the recipient does.
- **Fix task**: either take the event out and declare line 35 of frame 25a (and what moves with it) as a deviation, or record in the spec that the line of the prototype is kept with an event the log of that scenario could not hold. Do not bend the tickets of the scenario to make it true.
- **Priority**: Minor

### For the spec owner

Decide spec-precision gaps 1 and 2 (which note of a ticket wins when two apply; what the node of the dev shows when more than one thing waits for him), then pin each with a test.

---

## Requirement Traceability Update

Proposed; `spec.md` was not edited by the Verifier.

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| TUI-01..TUI-34, TUI-36..TUI-58, TUI-60..TUI-64 (62) | Implementing | ✅ Verified (TUI-24 with the Assumption of Fix 2 open) |
| TUI-35, TUI-59 (2) | Implementing | ❌ Needs Fix (tests) |

---

## Not verified

- **A real interactive terminal.** Nothing ran on one in this verification: the colours as drawn, the glyph widths as drawn by the font, the keys as a real terminal sends them, the resize event (`tui.ts:178`, N46), and the probe from the measure to the exit (`tui/probe.ts:52-73`, N08, N09). The decision of the exit code is now tested as a pure function.
- **Real signals.** `SIGINT`, `SIGTERM` (`tui.ts:180`) and the `uncaughtException` handler (`tui.ts:181-185`) are tested only by calling `stop()` and by throwing inside the injected loop (`test/unit/tui-loop.test.ts:135-160`).
- **The 1000 ms default by wall clock.** Tested as a value (`test/unit/tui-config.test.ts:88`) and, through the loop, as "no second read within 60 ms of a 60000 ms interval" (`test/unit/tui-loop.test.ts:109`); no test waits a real second.
- **Linux.** This verification ran on Windows only.
- **A real Claude Code session** feeding the screen (Out of Scope in the spec).
- **`question`, `answer`, `gate`, `gate_decision` written by the broker.** No route writes them before the Question and Gate slices; the derivation and the feed were only exercised with logs built by the tests.
- **Colour cell by cell.** By the Assumptions the frames compare characters; colour and bold are asserted per requirement only.

---

## Summary

**Overall**: ❌ Not Ready - the fix round did all it was asked and broke nothing; three more test gaps came out of mutations round 1 had not tried.

**Spec-anchored check**: 62/64 ACs matched the spec outcome | 2 spec-precision gaps
**Edge cases**: 9/9
**Sensor**: 64 injected, 51 killed, 13 survived (8 not equivalent, 2 equivalent, 3 inside a declared limit); the 18 survivors of round 1 are all killed
**Gate**: 915 passed, 0 failed, 3 skipped, first run

**What works**: everything in the summary of round 1, plus the terminal sequences pinned as literals, the wiring of the loop (changed lines, glyphs, interval, a chunk of keys), the summary of the last feature, the open questions of the topology, the two Assumptions of the derivation, the boundaries, the exit code of the probe as a pure function, and one line of stalled per agent and debt.

**Issues found**: the order of `sem reação` in the third line of an agent (Fix 1, five survivors); the condition of `· retoma` (Fix 2, two); the probe with a width of zero (Fix 3, one); seq 470 still an event its log could not hold (Fix 4); two points for the spec owner.

**Next steps**: route Fix 1 to Fix 4 to an implementer, then re-verify (iteration 2 of 3).

---

## Lessons distilled

Recorded with `lessons.py add` (feature `tui-leitura`): L-046, new candidate, from N25..N29
(every pair of ordered alternatives that can hold together); L-039, already a candidate from round
1, grounded again by N21 (an item that fails the condition the AC names); L-047, new candidate,
from N05 (a value on each side of an is-not-equal rule); L-048, new candidate, from the
spec-precision gaps of TUI-37 and TUI-44 (which alternative wins when two hold). L-001, confirmed
in round 1 from S14 of this same AC, describes the gap of Fix 1; it was not penalized, because it
became confirmed during this feature and was not guidance loaded when the tests were written.
Not recorded: Fix 4 (no signal of the table fits a finding about a test log) and the stale
`// SPEC_DEVIATION` marker (the spec adopted the behaviour).
