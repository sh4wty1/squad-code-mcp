# TUI leitura Validation - FAIL ❌

**Result**: FAIL

**Date**: 2026-10-09
**Spec**: `.specs/features/tui-leitura/spec.md`
**Diff range**: `main..1f377d5` (35 commits, T1..T30, branch `feat/tui-leitura`; merge-base `2fe4622`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Environment**: Windows 11, Bun 1.3.14, TypeScript from `broker/node_modules`

All paths below are relative to `broker/` unless they start with `.specs/`, `.design/` or `docs/`.
Baseline before any work: `git status --porcelain` empty, `HEAD` = `1f377d537cd5ed7c9a13a209c8cc680b3271b4a0`.
After the scratch was removed the porcelain output was empty again (byte-identical to the baseline);
the tree now shows only this file and the lessons files.

**Why FAIL, in one paragraph.** The code does what the spec asks in every case this
verification could reach: the gate passes, the 41 frames are compared, the derivation matches the
design table and AD-008/AD-011, and no behaviour was found that contradicts an AC. The tests are
what fails the bar. Of 210 behaviour-level mutations, 24 survived; 6 are equivalent and 18 are
not. Eight ACs (TUI-35, TUI-40, TUI-45, TUI-56, TUI-57, TUI-59, TUI-60, TUI-61) have a clause of
their text that a plausible wrong implementation passes, and four settled Assumptions have no
discriminating test. Two of the 18 survivors sit inside limits the orchestrator had already
declared (probe inside a terminal, read interval by wall clock) and would not fail the feature
alone; the other 16 do.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T30 | ✅ Done | 30 task headings in `.specs/features/tui-leitura/tasks.md`; all 124 "Done when" boxes are checked, none open; 35 commits in `main..1f377d5` |

`spec.md` still shows every requirement as `Implementing` and "64 total, 0 mapped to tasks"
(`.specs/features/tui-leitura/spec.md:334`). Not changed by the Verifier.

---

## Spec-Anchored Acceptance Criteria

Evidence is one representative assertion per AC; the frame tests (`test/unit/tui-frames.test.ts:32-36`)
back most of the screen ACs as well. "Sensor" names the mutations of the table further down.

### P1: Status derivado do log

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| TUI-01 no presence event → `never` | status `never` | `test/unit/derive-squad.test.ts:648` - `expect(agent(log, "worker-1")).toEqual({ ..., status: "never", ... })`; `:664` - `expect(statuses(log)).toEqual({ mot: "idle", ldr: "idle", w1: "never", ... })` | ✅ PASS (D02 killed) |
| TUI-02 last presence is `peer_left` → `offline`, `ts` as start | `offline`, `since` = ts of the `peer_left` | `test/unit/derive-squad.test.ts:670` - `expect(agent(log, "worker-2").status).toBe("offline")`; `:671` - `expect(agent(log, "worker-2").since).toBe(T0 + 9000)` | ✅ PASS |
| TUI-03 `blocked` without later `unblocked` of the name | `blocked` with the `reason` | `test/unit/derive-squad.test.ts:682` - `expect(a.status).toBe("blocked")`; `:683` - `expect(a.blockedReason).toBe("missing credential")`; `:689` - unblocked by the broker → `idle` | ✅ PASS (D34 killed) |
| TUI-04 open permission request | `blocked` with the `seq` of the request | `test/unit/derive-squad.test.ts:697` - `expect(a.status).toBe("blocked")`; `:698` - `expect(a.permission!.seq).toBe(9)`; closing: `:106`, `:111`, `:121` | ✅ PASS (D09, D10 killed) |
| TUI-05 `asked_by` of an open blocking question | `waiting` + blocking mark + `question_id` | `test/unit/derive-squad.test.ts:718` - `expect(a.status).toBe("waiting")`; `:719` - `expect(a.blockingQuestion).toBe(4)` | ✅ PASS (D03 killed) |
| TUI-06 sent a `question` of an open question (asker or forwarder) or a pending `gate`, no ticket in progress | `waiting` | `test/unit/derive-squad.test.ts:750` (asker that delivered); `:768` - `expect(statuses(log)).toEqual({ mot: "waiting", ldr: "waiting", w1: "waiting", ... })`; `:775-778` (gate, comment, approve, reject); `:784`, `:788`, `:798` (not waiting with a ticket in progress) | ✅ PASS (D04, D05, D20 killed) |
| TUI-07 owes an event and is out of turn | `stalled` with the oldest debt | `test/unit/derive-squad.test.ts:807` - `expect(a.status).toBe("stalled")`; `:865` oldest of two debts; `:876` in turn → `working` | ✅ PASS (D16, D25 killed) |
| TUI-08 what counts as a debt | result / verdict / task after rework / plan after kickoff / answer of the holder | `test/unit/derive-squad.test.ts:808`, `:816`, `:822`, `:832`, `:840` - `expect(leader.owes).toEqual({ owes: "answer", question_id: 9, seq: 12 })` | ✅ PASS (D28 killed) |
| TUI-09 `working` per role | worker / judge / leader / mother with open feature | `test/unit/derive-squad.test.ts:913` - `expect(statuses(log)).toEqual({ mot: "working", ldr: "working", w1: "working", w2: "idle", w3: "idle", jdg: "working" })`; `:915` | ✅ PASS (D29 killed) |
| TUI-10 every non-dropped ticket of the latest plan approved | `done` | `test/unit/derive-squad.test.ts:919` - `expect(statuses(APPROVED)).toEqual({ mot: "working", ldr: "done", w1: "done", ... })`; `:924` with a dropped ticket | ✅ PASS for the AC; the Assumption "all tickets dropped is `done`" has no test (D17 survived) |
| TUI-11 the rest | `idle` | `test/unit/derive-squad.test.ts:941` - `expect(a.status).toBe("idle")` (after a rework); `:950-956` | ✅ PASS (D07 killed) |
| TUI-12 precedence | `never`, `offline`, `blocked`, `waiting ?`, `waiting`, `stalled`, `working`, `done`, `idle` | one test per neighbouring pair: `test/unit/derive-squad.test.ts:962`, `:975`, `:982-983`, `:989`, `:1001`, `:1007` | ✅ PASS (D01 killed) |
| TUI-13 no open feature | only `never`, `offline`, `blocked`, `idle` | `test/unit/derive-squad.test.ts:1012` - `expect(statuses(none)).toEqual({ mot: "idle", ldr: "idle", w1: "idle", w2: "offline", w3: "blocked", jdg: "never" })`; `:1024` | ✅ PASS |
| TUI-14 ticket status in order | `dropped`, `planned`, `escalated`, `done`, `blocked`, `waiting`, `review`, `working` | one test per status `test/unit/derive-squad.test.ts:465-542`, per pair `:554-586` - e.g. `expect(ticketStatus(log, "A")).toBe("escalated")` (`:566`) | ✅ PASS (D06, D23, D24, D27, D33 killed) |
| TUI-15 only `task`, `result`, `verdict` are events of a ticket | `last` unchanged by question/answer/blocked | `test/unit/derive-squad.test.ts:597` - `expect(squad(...).tickets[0]!.last).toEqual({ kind: "result", seq: 11 })`; `:602` | ✅ PASS |
| TUI-16 message 120000 ms old with no later event of the agent | age of the oldest one | `test/unit/derive-squad.test.ts:1036` - `expect(noReaction(log, "worker-1", 119999)).toBeNull()`; `:1037` - `expect(noReaction(log, "worker-1", 120000)).toBe(T0 + 10000)` | ✅ PASS for the AC (D11, D12, D13 killed); the Assumption "the whole log" has no test (D19 survived) |
| TUI-17 token totals | sum by `session_id` and `model` of the latest `usage`; feature = that minus the last before `feature_opened` | `test/unit/derive-squad.test.ts:347` - `expect(totals.get("worker-1")).toEqual({ opus: { input: 1300, ... }, haiku: {...} })`; `:376` - `{ input: 700, output: 70, cache_write: 5, cache_read: 47 }` | ✅ PASS (D14, D15, D30 killed) |
| TUI-18 pure | same events and now → same result | `test/unit/derive-squad.test.ts:1183` - `expect(squad(log, NOW)).toEqual(first)` over a frozen log; `:1184` - `expect(log).toEqual(WHOLE)`; `:1191` out of order | ✅ PASS |

### P1: Feed e tela principal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| TUI-19 grid | 120×40 cells of character, colour, background, bold | `test/unit/tui-grid.test.ts:6` - `expect(g.rows.length).toBe(40)`; `:14` - `expect(g.put(2, 1, "⚠ok", "bred", { bg: "red", bold: true })).toBe(5)` | ✅ PASS (L24, L25, L26 killed) |
| TUI-20 message line | hour, short `from`, `→`, short `to`, `[kind]`, `summary` cut with `…` at column 84 | `test/unit/tui-feed.test.ts:52` - `expect(rows.map((row) => [row.seq, row.ts, row.sys, row.text])).toEqual([...])`; `test/unit/tui-main.test.ts:133` - `expect(part(drawn[16]!, 29, 84)).toBe("  14:19:51 rev → hum [task]          a summary long eno…")` | ✅ PASS (S18, F15 killed) |
| TUI-21 default applied | yellow `⟳ Q-<id> timeout · default aplicado: <answer>` / `⟳ Q-<id> fechada · <rótulo> entregou antes da resposta` | `test/unit/tui-feed.test.ts:83` - `expect(rows.slice(2).map((row) => [row.sys, row.text])).toEqual([...])`; colour `test/unit/tui-main.test.ts:147` - `toEqual({ ch: "⟳", fg: "byellow", bg: null, bold: false })` | ✅ PASS (F09 killed) |
| TUI-22 `blocked` line | red `⚠ <rótulo> [blocked] <reason>` | `test/unit/tui-feed.test.ts:91` - `expect(rows.map((row) => [row.sys, row.text])).toEqual([["blocked", "⚠ w2 [blocked] RADIO_API_KEY ausente"]])`; colour `test/unit/tui-main.test.ts:148` | ✅ PASS (L09 killed) |
| TUI-23 grouped refusals | one line, ` ×N` from the second, hour of the first | `test/unit/tui-feed.test.ts:96` - `expect(rows.map((row) => [row.seq, row.ts, row.sys, row.text, row.count, row.lastTs])).toEqual([...])`; `:104` kept apart | ✅ PASS (F01, F02, F11, F12 killed) |
| TUI-24 system lines | the eight texts | `test/unit/tui-feed.test.ts:124`, `:144`, `:166`, `:179` - `toEqual([["merged", "⟳ Q-12 mesclada em Q-07 pela mother"]])` | ✅ PASS (F05, F06, F08d, F10 killed) |
| TUI-25 stalled line | `‖ <rótulo> [stalled] deve <dívida>` at the hour of the `usage` | `test/unit/tui-feed.test.ts:186` - `expect(rows.map((row) => [row.seq, row.ts, row.sys, row.text])).toEqual([[7, T0 + 7000, "stalled", "‖ w2 [stalled] deve result TKT-13"]])` | ✅ PASS (F03, F13 killed) · ⚠️ Spec-precision gap 1 |
| TUI-26 limit line | right after the third `verdict` of `rework` | `test/unit/tui-feed.test.ts:198` - `expect(feed(two).some((row) => row.sys === "limit")).toBe(false)`, then the rows of the third | ✅ PASS (F04, F14 killed) |
| TUI-27 no line for `turn_started`, `unblocked`, ordinary `usage` | no row | `test/unit/tui-feed.test.ts:215` - `expect(rows.map((row) => row.text)).toEqual(["● w1 entrou"])` | ✅ PASS |
| TUI-28 colours of the kind | `answer` blue; `gate`, `gate_decision` bright magenta; rework / deny bright red; approve / allow bright green | `test/unit/tui-main.test.ts:138-144` - `expect(cell(frameView("01"), "[answer]").fg).toBe("blue")`, `"bmagenta"`, `"bred"`, `"bgreen"`, deny → `"bred"` | ✅ PASS (S01..S05 killed) |
| TUI-29 lines before the open feature | gray, above the ruler (three texts) | `test/unit/tui-main.test.ts:153`, `:158`, `:159` - `toBe("─────── ▲ antes da feature · entradas no broker ────────")`; `:154` - `.fg).toBe("gray")` | ✅ PASS (S19, L05, L18 killed) |
| TUI-30 no open feature | gray before the last `feature_closed`; band `squad ocioso desde…` / `squad sem feature desde… · N fora de [idle]` | `test/unit/tui-main.test.ts:164`, `:165` - `toBe("─ squad sem feature desde 14:53:31 · 2 fora de [idle] ──")`; `:170` colour kept | ✅ PASS (S15, S16, L04 killed) |
| TUI-31 no feature in the log | band with the hour of the first event; `○ log vazio` | `test/unit/tui-main.test.ts:178` - `toBe("─ broker no ar desde 15:02:24 · nenhuma feature ainda ──")`; `:180` - `toBe("  ○ log vazio")` | ✅ PASS (L02 killed) |
| TUI-32 last 33 lines, or the selected one in sight | window of 33 | `test/unit/tui-main.test.ts:187`, `:188`, `:191`, `:193` | ✅ PASS (S10, S17 killed) |
| TUI-33 line 0 | project `›` title cut, `workflow`; `○ sem feature aberta`; `○ nenhuma feature ainda` | `test/unit/tui-chrome.test.ts:35` - `expect(views.map((view) => drawn(view).text()[0])).toEqual(views.map((_, i) => lines[i * 2 + 1]!))` (the nine lines of frame 26c) | ✅ PASS (L01, Y04, S25 killed) |
| TUI-34 counter, indicator, clock | `? N` of open questions held by `human`, red background when one blocks | `test/unit/tui-chrome.test.ts:45` - `expect(counter(frameView("01"))).toEqual(["? 2", "bwhite", "red", true])` | ✅ PASS (S11, S24 killed) |
| TUI-35 agents panel | glyph, status, role, activity and the first third line that exists, in the order of the AC | `test/unit/tui-main.test.ts:24-36` - one `expect(third(...)).toBe(...)` per alternative; `:41-46` | ❌ GAP (test): each alternative is asserted alone; nothing fails when `⚠ <reason>` is drawn before `x <tool>` for an agent with both (S14 survived) |
| TUI-36 title | `agentes · 6` / `agentes · <n>/6 no ar` | `test/unit/tui-main.test.ts:50`, `:51` - `toBe("┌─ agentes · 2/6 no ar ────┐")` | ✅ PASS (S12 killed) |
| TUI-37 tickets panel | ref, title, owner, `⟳n/2` capped at 2, status, note | `test/unit/tui-main.test.ts:56`, `:81`, `:95` - `expect(seven[6]).toBe("TKT-7  ⟳0/2 [planned]   —")` | ✅ PASS for what is asserted (S20, S21, L07, Y01, Y02 killed) · ⚠️ Spec-precision gap 2 (L06 survived) · the boundary of exactly eight tickets has no test (L08 survived) |
| TUI-38 empty panel | the three texts | `test/unit/tui-main.test.ts:110` - `expect(empty("26a")).toEqual(["○ nenhum ticket ainda", "  o leader publica o", "  plano ao receber a spec"])` and the two others | ✅ PASS (L03 killed) |
| TUI-39 detail panel | message block; one block per kind of system line | `test/unit/tui-detail.test.ts:21`, `:66` - `expect(lines.length).toBe(34)`, `:75`, `:85`, `:109`, `:119`, `:132`, `:137`, `:166`, `:171`, `:195`, `:217`, `:243` | ✅ PASS (X01, X06, X09, X10 killed) |
| TUI-40 summary of the last closed feature | outcome, title, the gate decision of `approve`, reason, tickets, questions, duration, messages, cost | `test/unit/tui-detail.test.ts:263`, `:295` - `expect(detail("09b").slice(3, 7)).toEqual(["✓ entregue · 14:53:31", "  player ao vivo com setlist", "  G-01 aprovado 14:53:20", "---"])`, `:299` | ❌ GAP (test): "última" and "de `approve`" are not discriminated - the first closed feature (X11) and any gate decision (X02) both pass |
| TUI-41 footer | tokens of each agent, `│ feature ≈$…` / `│ sessão ≈$…`, right side | `test/unit/tui-chrome.test.ts:67` (six lines of frame 30), `:73`; `test/unit/tui-activity.test.ts:102-160` | ✅ PASS for the AC (S06, S07, S09, S26, S27, L19, L20 killed); the Assumption "milhares arredondados" has no test (S23 survived) |
| TUI-42 key `t` | toggles feature / session; without feature shows the session and warns | `test/unit/tui-keys.test.ts:135` - `expect(key("t", v)).toEqual({ ...v.ui, scope: "session", toast: null })`; `:142` | ✅ PASS (S08, K06, K13 killed) |
| TUI-43 frames as tests | equal to the frame on every line outside the deviations; each deviation D1, D2 or D3 | `test/unit/tui-frames.test.ts:35` - `expect(drawn.map((line, y) => ...)).toEqual(expected(id).lines.map(...))` for 38 frames; `:44`; `:71`; `:125-129`; `:97` (frame 21); `test/unit/tui-chrome.test.ts:35` (26c), `:67` (30) | ✅ PASS (see "Frames as tests") |

### P1: Topologia, thread, legenda e estados da tela

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| TUI-44 topology | nodes, gray star, bright thick edge of the latest message; without feature normal colour and `○ última` | `test/unit/tui-topology.test.ts:42` - `expect([from, to, drawn]).toEqual([from, to, cells.map(([x, y, ch]) => [x, y, ch, color, true])])`; `:49`; `:55`; `:61` | ✅ PASS (S28, S29, S32, L15, Y09 killed) |
| TUI-45 panel `arestas` | active edge, six last messages, open questions **held by `human`**, five edges, reworks per ticket | `test/unit/tui-topology.test.ts:89` - `expect(edges("02", 3, 29)).toEqual([...])`; `:121` | ❌ GAP (test): listing every open question, whoever holds it, passes (L16 survived); the rest is discriminated (S30, S31, L14 killed) |
| TUI-46 thread | header, entries in order, flow, criteria matrix, verdicts, notes, questions | `test/unit/tui-thread.test.ts:24`, `:33`, `:56` - `toBe("fluxo  task ▶ result ▶ ✗ v1 ▶ task ▶ ? Q-07 ▶ answer ▶ result ▶ ✓ v2")`, `:98`, `:128`, `:177` | ✅ PASS (S38, L10, Y07, Y08 killed) |
| TUI-47 notes of an entry | time since the task; `REWORK ⟳ n/2 · p/t`, `APPROVE · p/t`, `REPROVADO · p/t · limite atingido`; `rework n/2`; `Q-<id>` `[BLOQUEANTE]` route; `Q-<id>` and time with the dev | `test/unit/tui-thread.test.ts:66` - `toBe("6m36s")`; `:71` - `toBe("REWORK ⟳ 1/2 · 4/5")`; `:84` - `toBe("Q-13 [BLOQUEANTE] · ldr → mot")`; `:92` - `toBe("Q-07 · 3m22s no dev")` | ✅ PASS (S33, S34, S35, L11, L12 killed) |
| TUI-48 planned and dropped tickets | `○ sem linha do tempo`…; ends with the `[dropped]` entry | `test/unit/tui-thread.test.ts:136`; `:163` - `toBe("worker-1 · aberto 14:20:11 · descartado 14:51:10 · [dropped]")` | ✅ PASS (S36, L13 killed) |
| TUI-49 legend | frame 11 on every line that cites no key or screen of another slice | `test/unit/tui-frames.test.ts:77` - `expect(cut).toEqual([...13 texts...].map((text) => ["D3", "", text]))` plus frame 11 in `:35` | ✅ PASS · ⚠️ Spec-precision gap 3 |
| TUI-50 read by cursor | events with `seq` above the cursor, in order; cursor to `last_seq` | `test/unit/tui-reader.test.ts:25-28` - `expect(calls.map((c) => c.url)).toEqual([".../events?after=0", ".../events?after=2", ".../events?after=4"])`; `:36` | ✅ PASS (R02, R07 killed; R01 equivalent) |
| TUI-51 failed read | last state kept, frame 12 with `broker ○ desconectado · <N>s` and the attempt, retry each interval | `test/unit/tui-reader.test.ts:54` - `expect(await reader.poll()).toEqual({ ok: false, events: [event(1), event(2)] })`; `test/unit/tui-frames.test.ts:111-112`; `test/unit/tui-loop.test.ts:206-216` | ✅ PASS (R05, R09, T05, T06, S39, S41, L30 killed) |
| TUI-52 status 200, wrong body | treated as a failed read, log unchanged | `test/unit/tui-reader.test.ts:49-56` for "a body that is not JSON", "events that is not a list", "last_seq that is not an integer", "last_seq with a fraction" | ✅ PASS (R04, R10 killed) |
| TUI-53 read answers again | normal screen, same cursor | `test/unit/tui-reader.test.ts:55-56`; `test/unit/tui-loop.test.ts:219-220` - `expect(t.calls.slice(1).every((call) => call.url === ...after=${last})).toBe(true)` | ✅ PASS (T10 killed) |
| TUI-54 terminal below 120×40 | only the message of frame 21 with the current size; back when it fits | `test/unit/tui-frames.test.ts:97` - `expect(small(80, 24).text()).toEqual(frame("21"))`; `test/unit/tui-loop.test.ts:174` | ✅ PASS (T04, S40 killed) |
| TUI-55 nothing but `GET /events` | every request is `GET …/events?after=<n>` | recording fakes: `test/unit/tui-reader.test.ts:83-86` and `test/unit/tui-loop.test.ts:233-237` - `expect(call.method).toBe("GET"); expect(call.url).toMatch(/^http:\/\/127\.0\.0\.1:7900\/events\?after=\d+$/)`; real broker: `test/integration/tui.test.ts:116-120` - `expect(after.last_seq).toBe(before.last_seq + 1)` | ✅ PASS (R06 killed); code path: the only `fetch` of the TUI is `tui/reader.ts:19`, wired at `tui.ts:164` |

### P1: Rodar no terminal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| TUI-56 `SQUAD_TUI_GLYPHS` | substitute written in place of the glyph; invalid pair → exit 1 with the pair | `test/unit/tui-ansi.test.ts:86` - `expect(paint(g, null, parseGlyphs("⚠=!,⟳=~"))).toBe(...! ~ ●...)`; `:110`; `test/integration/tui.test.ts:29-31` - `expect(code).toBe(1)`, exact message, `expect(out).toBe("")` | ❌ GAP (test): the exit and `paint` are covered (A03, A04, T01, T15, T16 killed), but no test runs the loop with a substitute, so a loop that never hands the glyphs to `paint` passes (T17 survived) |
| TUI-57 `SQUAD_PRICES` | cost from that table; missing or malformed file → exit 1 with the path | `test/unit/tui-config.test.ts:28`, `:33`, `:48` - `expect(() => prices({ SQUAD_PRICES: path })).toThrow(path)`; `test/integration/tui.test.ts:39-41` | ❌ GAP (test): a table with one valid and one invalid model is accepted by the mutant C03 and no test has one (C02, C05 killed) |
| TUI-58 invalid interval → 1000 ms | 1000 | `test/unit/tui-config.test.ts:74` - `toBe(250)`; `:80` - `expect(readIntervalMs({ SQUAD_POLL_INTERVAL_MS: value })).toBe(1000)` for absent, empty, `abc`, `0`, `-5`, `1.5`; `test/unit/tui-loop.test.ts:245` | ✅ PASS for the value (C01, C04 killed); that the loop waits `settings.intervalMs` is not asserted (L29 survived; declared limit) |
| TUI-59 probe | widths written; exit 0 if all are 1, exit 2 otherwise; exit 1 outside a terminal | `test/integration/tui.test.ts:15-17` - `expect(await proc.exited).toBe(1)`, message, empty stdout; `test/unit/tui-glyphs.test.ts:10` | ❌ GAP (test): only the third clause has evidence; exit 0 / exit 2 and the output are in `tui/probe.ts:47-66` behind a TTY check and no test reaches them (P01 survived). Run by hand once per the spec's Assumptions; declared limit |
| TUI-60 take and give back the terminal | alternate screen, hidden cursor, raw mode; all three restored on `q`, `ctrl+c`, `SIGTERM`, error | `test/unit/tui-loop.test.ts:77-78` - `expect(t.out).toBe(ENTER); expect(t.raw).toEqual([true])`; `:84-85`; `:101-103`; `:117-119`; real broker `test/integration/tui.test.ts:102`, `:113-114` | ❌ GAP (test): every assertion compares with the constants imported from `tui/ansi.ts`; `ENTER` without `\x1b[?25l` (A07) and `LEAVE` without `\x1b[?25h` (A06) pass. Raw mode and the order are discriminated (T02, T03, T08, T12, T14 killed) |
| TUI-61 only the lines that changed, 16 colours and bold | diff by line | `test/unit/tui-ansi.test.ts:24` - `expect(paint(scene(), scene())).toBe("")`; `:75` per colour | ❌ GAP (test): `paint` is discriminated (A01, A02, A05, A08 killed); the loop is not - `paint(next, null, …)` on every drawing passes (T13 survived) |
| TUI-62 keys | screens, esc, selection, focus, enter, `[` `]`, `p`, `b`, `q` | `test/unit/tui-keys.test.ts:30`, `:41`, `:59`, `:68`, `:75`, `:86`, `:99`, `:105`, `:147`; `test/unit/tui-loop.test.ts:128` | ✅ PASS (K01, K02, K07..K12, K14, K15, K17, T11 killed); a chunk with two `]` is not covered (L28 survived) |
| TUI-63 keys of other slices | 4 s notice `chega com a fatia Gate` / `Question`, same screen | `test/unit/tui-keys.test.ts:118` - `expect(key("g", v)).toEqual({ ...v.ui, toast: { text: "chega com a fatia Gate", color: "gray", until } })`; `:128`; `test/unit/tui-loop.test.ts:141` | ✅ PASS (K03, K04, K05, K16 killed) |
| TUI-64 project name | repository of the directory by `projectOf`; `feature` label outside one | `test/integration/tui.test.ts:66` - `expect(await project(inside)).toBe("portal 89fm")` and null outside; `test/unit/tui-chrome.test.ts:35` (label `feature`) | ✅ PASS (T09, S25 killed) |

**Status**: ❌ Gaps present - 56/64 ACs matched the spec outcome with discriminating assertions; 8 have a clause without one (TUI-35, TUI-40, TUI-45, TUI-56, TUI-57, TUI-59, TUI-60, TUI-61). ⚠️ 4 spec-precision gaps flagged.

### Spec-precision gaps

1. **TUI-25, a `usage` sent again.** The AC says "WHEN um `usage` encerra um turno". The contract says the hook may resend a `usage` (`.design/squad-mvp.md` line 200) and the feed treats every `usage` as the end of a turn (`tui/feed.ts:106-110`). Measured in the scratch: the log of frame 23a plus a second `usage` of worker-2 draws `‖ w2 [stalled] deve result TKT-13` twice. The spec does not say which is right.
2. **TUI-37, `◌ parado` and `‖ parado`.** The AC gives the note "com o dono `offline`" / "`stalled`" with no condition on the ticket; the code draws it only for a ticket that is not `planned`, `done` or `dropped` (`tui/screens/main.ts:98-105`). Neither reading is in a test (L06).
3. **TUI-49, legend lines about keys of other slices that stay.** The AC allows a difference on such lines and does not say what they show. The implementation blanks the modal blocks and keeps `g abrir o gate pendente mais antigo`, `x abrir o pedido de permissão mais antigo`, `enter responder a selecionada` and "a TUI escreve três coisas: respostas a perguntas, decisões de gate e decisões de pedido de permissão" (`tui/screens/help.ts:70-76`), while in this slice `g` and `x` only show a notice and the TUI writes nothing (TUI-55). The same holds for `x abre` / `a permite   d nega` in the detail of a permission request (`tui/screens/detail.ts:300-301`).
4. **Assumption "Texto de atividade", countdown after the deadline.** Nothing says what `? m:ss` shows when the deadline has passed and the broker has not written the default yet; the code clamps at `0:00` (`tui/activity.ts:31`) and no test pins it (L22).

---

## Frames as tests (TUI-43, AD-010)

- **All 41 reading frames of the Assumptions row are exercised.** 38 through `test/unit/tui-frames.test.ts:15-28` (27 main, 5 topology, 4 thread, legend 11, frozen 12), compared line by line at `:35`; frame 21 at `:97`; the nine lines of 26c and the six of 30 at `test/unit/tui-chrome.test.ts:35` and `:67`. The set is exactly the one of the spec.
- **The `.txt` files are the untouched extraction.** `docs/claude-design-handoff/Handoff-Design.zip` was unzipped into a new empty directory outside the repository, `test/frames/extract.ts` was run on `Squad TUI.dc.html`, and the 41 blobs of `HEAD` (`git cat-file`) are byte-identical to its output: 41 compared, 0 differing. `git log main..HEAD -- 'broker/test/frames/*.txt'` shows one commit, `4657be1`, which adds them.
- **Every deviation has a class and a reason**: 0 without (`test/unit/tui-frames.test.ts:44` asserts it; recounted in the scratch). No deviation is dead (`:125-129`), and the dead-deviation detector is itself tested (`:138`).
- **How much is compared.** Over the 38 full-screen frames, declared deviations replace 34572 of 182400 cells (19.0%). The largest: 10 (52.7%), 03 (49.7%), 22h (49.3%), 25b (48.9%), 15a (44.3%), 12 (42.9%), 01 (42.8%), 13c (40.9%). Most of it is `entered()` (`test/frames/deviations.ts:48-56`), which moves the feed of the frame down under the six `peer_joined` lines and the ruler: its expected text is computed from the frame, not written by hand. 28c has no deviation; 13b, 02, 28a and 23b have under 2%.

### Agent-status deviations

- The test pins the list: `test/unit/tui-frames.test.ts:53-70` - 16 entries - and `:71` requires class D1 and `/\.design\/squad-mvp\.md line 3\d\d/` in the reason of each.
- The 16 entries are exactly the design table "Desvios de status conhecidos nos painéis de agentes" (9 mother, 2 worker-2, 1 leader in 10, 1 leader in 15a, 1 mother in 18a, 2 worker-1). The cited lines exist and say what the reason claims: 355, 356, 358, 360 and 364 of `.design/squad-mvp.md` (read), plus 425 and 560.
- **Independent recount** (scratch script, without `deviations.ts`): for the 28 main-screen logs, the status drawn in the agents panel of each `.txt` was compared with `squad(log, now)`. 14 differences, all in the table: `10 leader`, `14 mother`, `14 worker-2`, `15a leader`, `18a mother`, `22c mother`, `22h mother`, `22h worker-2`, `23a mother`, `23a worker-1`, `24a`, `24b`, `24c`, `25a mother`. The two of 23b are the topology of the log of 23a. Nothing outside the table.
- **Read by hand**: 01 (all six match the prototype: mother `waiting` for Q-07 and Q-08, leader `working` with Q-12 merged, worker-1 `waiting ?`, worker-2 `waiting` with `? 3:08` = 14:35:15 − 14:32:07, judge `working` in turn), 10 (leader derived `working`: it forwarded Q-09 but TKT-12 and TKT-13 are not concluded), 14 (mother `working` with worker-1's request open: the fourth reading of AD-011; worker-2 `idle` after its result) and 23a (mother `working`, worker-1 `idle` after the rework, worker-2 `stalled` since 14:26:00, leader `working` in turn with `sem reação há 3m10s` = 14:31:13 − 14:28:03).
- **Ticket status, frame 22h, TKT-12**: `test/frames/deviations.ts:207` - class D1, cites ".design/squad-mvp.md line 364". The recount finds it as the only ticket-status difference. Its citation is not enforced by a test (the pinned list covers agent lines only).

### Honesty of the logs (`test/frames/logs.ts`)

No base skill is stuffed anywhere: no `task` of the logs carries a `loadout` (`test/frames/logs.ts:38-41`), and the third line of the agents is declared `sem loadout` (D2). Every event was checked against `shared/contract.ts` and `.design/squad-mvp.md` lines 139-205 by a scratch script. What it found:

| Events | Finding | Weight |
| ------ | ------- | ------ |
| seq 470 (`test/frames/logs.ts:263`) | `refused` with `peer: worker-1`, `attempted_kind: "task"`, `error: "worker_busy"`. The broker writes `worker_busy` to the leader that sent the task (`send.ts:116`); a worker cannot attempt a `task`. The event is bent to reproduce the prototype's line `✗ w1 recusado · task · worker_busy` instead of declaring a D1 deviation | Suspicious |
| seq 410, 412, 424, 428 | the mother sends Q-05, Q-06, Q-10 and Q-08 to `human` while the holder is the leader: the hop leader → mother is missing. Inherited from the prototype's `MAIN` array; each edge is allowed, the sequence is not one the Question slice would write. No status depends on it | Note |
| seq 467, 468 | Q-13 was asked by the leader; the dev's `answer` goes to the mother, and the mother sends a second `answer` to the leader. The contract has holder → `asked_by` and one answer. Inherited from the prototype; the derivation takes the first | Note |
| seq 403, 429, 430 | non-blocking questions without `default`, which line 192 makes mandatory | Note |
| seq 439 | `gate` of scope `delivery` without `commit`, which line 169 makes mandatory | Note |
| seq 6.1, 402.1, 405.1 … 476.1 | the inserted `usage`, `turn_started`, `peer_left` and `blocked` take a fractional `seq`; four of them have a feed line (414.5 in 23a/23b, 436.5 and 438.5 in 29a/29b). Declared at the top of the file; a real `seq` is an integer | Note |
| `usage` of mother, worker-2, worker-3, judge | they end a turn no `turn_started` began. Allowed by line 186; see spec-precision gap 1 | Note |

The `turn_started` placed to reproduce `working` against `stalled` are declared in the design ("isso não é desvio").

---

## The derivation against the design table and AD-008 / AD-011

- **Precedence** (`shared/derive.ts:545-585`): `never` (:545), `offline` (:546), `blocked` (:550), `waiting ?` (:560-561), `waiting` (:570), `stalled` (:577), `working` (:583), `done` (:584), `idle` (:585) - the order of `.design/squad-mvp.md` lines 351-360 with `never` on top (AD-008).
- **AD-011, four readings**: ticket in progress per role (`shared/derive.ts:517-522`; tests `:784`, `:788`, `:798`; D04 killed); "escalou" includes who asked (`:564-569`; test `:750`; D05 killed); a ticket after a rework below the limit is `working` and its owner `idle` (`:414`, `:519`; tests `:500`, `:941`; D06, D07 killed); the mother's "nada pendente" is only her questions and gates (`:564-570`; frames 14 and 22c draw her `working` with a request open; D08 killed).
- **Settled gaps of the Assumptions**: leader between kickoff and plan (`:832`; D18 killed), dropped ticket (`:954-957`), merged question (`:275` and frame 01; D22 killed), permission closing (`:106-123`), "evento do peer" (`:1055`). **Not discriminated**: `done` with every ticket dropped (D17) and the whole-log reach of "sem reação" (D19).

---

## Discrimination Sensor

Expanded tier, in a temporary `git worktree` at `C:\tmp\tui-verify-scratch` (outside the repository), with `bun install --frozen-lockfile` in its `broker/`. One mutation at a time, `bun test test/unit` (plus `test/integration/tui.test.ts` for `tui.ts` and the probe), file restored after each. Baseline of the scratch: 750 pass, 1 skip, 0 fail. `git stash` was not used. The worktree was removed and pruned; `git status --porcelain` of the real tree was empty before and after.

| # | Area | File:line | Mutation | Outcome (failing tests: first one) |
| - | ---- | --------- | -------- | ---------------------------------- |
| D01 | derivation | `shared/derive.ts:546` | <code>if (!here.online) return { ...base, status: "offline", since: here.since };</code> → <code>if (!here.online && !declared.get(name)) return { ...base, status: "offline", since: here…</code> | ✅ Killed (1): TUI-12: offline comes before blocked |
| D02 | derivation | `shared/derive.ts:545` | <code>if (!here) return { ...base, status: "never" };</code> → <code>if (!here) return { ...base, status: "idle" };</code> | ✅ Killed (15): TUI-01: a name of the squad without an event of presence is never, whatever else the log has of it |
| D03 | derivation | `shared/derive.ts:560` | <code>const blocking = open.find((q) => q.blocking && q.asked_by === name);</code> → <code>const blocking = open.find((q) => q.asked_by === name);</code> | ✅ Killed (9): TUI-06: the worker that asked a question still open and already delivered the result is waiting |
| D04 | derivation | `shared/derive.ts:570` | <code>if (sent && !busy) return { ...base, status: "waiting" };</code> → <code>if (sent) return { ...base, status: "waiting" };</code> | ✅ Killed (12): TUI-06: an agent with a ticket in progress is not waiting for the question it sent |
| D05 | derivation | `shared/derive.ts:567` | <code>((e.kind === "question" && open.some((q) => q.id === e.question_id)) ¦¦</code> → <code>((e.kind === "question" && e.asked_by !== name && open.some((q) => q.id === e.question_id…</code> | ✅ Killed (10): TUI-06: the worker that asked a question still open and already delivered the result is waiting |
| D06 | derivation | `shared/derive.ts:412` | <code>if (t.last?.kind === "result") return "review";</code> → <code>if (t.last?.kind === "result" ¦¦ t.last?.kind === "verdict") return "review";</code> | ✅ Killed (3): TUI-14: a ticket with a verdict of rework as its latest event, below the limit, is working |
| D07 | derivation | `shared/derive.ts:519` | <code>? owned.some((t) => t.last?.kind === "task")</code> → <code>? owned.some((t) => t.last?.kind === "task" ¦¦ t.last?.kind === "verdict")</code> | ✅ Killed (5): TUI-11: the worker whose ticket got a verdict of rework below the limit is idle and owes nothing |
| D08 | derivation | `shared/derive.ts:570` | <code>if (sent && !busy) return { ...base, status: "waiting" };</code> → <code>if ((sent ¦¦ (role === "mother" && permissions.length > 0)) && !busy) return { ...base, s…</code> | ✅ Killed (5): TUI-18: without an open feature the squad has no ticket, question, gate nor tokens of feature |
| D09 | derivation | `shared/derive.ts:222` | <code>e.kind === "permission_request" && !decided.has(e.seq) && latest.get(e.from) === e.seq</code> → <code>e.kind === "permission_request" && !decided.has(e.seq)</code> | ✅ Killed (2): TUI-04: any later event of the same peer closes the request, and one of another peer does not |
| D10 | derivation | `shared/derive.ts:217` | <code>if (e.kind === "permission_decision") decided.add(e.request_seq);</code> → <code>if (e.kind === "permission_decision") decided.add(e.seq);</code> | ✅ Killed (5): TUI-04: the permission_decision that cites a request closes it, and only it |
| D11 | derivation | `shared/derive.ts:527` | <code>now - e.ts >= NO_REACTION_MS</code> → <code>now - e.ts > NO_REACTION_MS</code> | ✅ Killed (4): TUI-16: a message to an agent without an event of it after is without reaction from 120000 ms on |
| D12 | derivation | `shared/derive.ts:446` | <code>const NO_REACTION_MS = 120_000;</code> → <code>const NO_REACTION_MS = 119_999;</code> | ✅ Killed (2): TUI-16: a message to an agent without an event of it after is without reaction from 120000 ms on |
| D13 | derivation | `shared/derive.ts:540` | <code>noReactionSince: here?.online ? (unanswered?.ts ?? null) : null,</code> → <code>noReactionSince: unanswered?.ts ?? null,</code> | ✅ Killed (1): TUI-16: an agent that is not in the broker has no message without reaction |
| D14 | derivation | `shared/derive.ts:379` | <code>const key = JSON.stringify([e.from, e.session_id, e.model]);</code> → <code>const key = JSON.stringify([e.from, e.session_id]);</code> | ✅ Killed (4): TUI-17: the total of an agent is the sum of its latest usage of each session_id and model |
| D15 | derivation | `shared/derive.ts:389` | <code>total[count] += e[count] - (before.get(key)?.[count] ?? 0);</code> → <code>total[count] += e[count];</code> | ✅ Killed (30): TUI-17: the total of the feature takes out the latest usage of each session_id and model before the… |
| D16 | derivation | `shared/derive.ts:577` | <code>if (debt && !inTurn) {</code> → <code>if (debt) {</code> | ✅ Killed (29): TUI-06: an agent with a ticket in progress is not waiting for the question it sent |
| D17 | derivation | `shared/derive.ts:584` | <code>if (plan && live.filter((t) => t.planned).every((t) => t.approved))</code> → <code>if (plan && live.some((t) => t.planned) && live.filter((t) => t.planned).every((t) => t.a…</code> | ❌ **Survived.** Assumption "`done` com todos os tickets do plano descartados: vale `done`" has no test: with the mutant such a squad is `idle` |
| D18 | derivation | `shared/derive.ts:522` | <code>: role === "leader" && live.some((t) => t.planned && !t.approved);</code> → <code>: role === "leader" && (live.some((t) => t.planned && !t.approved) ¦¦ (feature !== null &…</code> | ✅ Killed (1): TUI-12: waiting comes before stalled |
| D19 | derivation | `shared/derive.ts:527` | <code>const unanswered = ordered.find((e) => e.to === name && e.seq > latest && now - e.ts >= N…</code> → <code>const unanswered = own.find((e) => e.to === name && e.seq > latest && now - e.ts >= NO_RE…</code> | ❌ **Survived.** Assumption "Alcance de sem reação: o log inteiro" has no test: every no-reaction case is inside the open feature |
| D20 | derivation | `shared/derive.ts:355` | <code>if (e.kind !== "gate_decision" ¦¦ e.decision === "comment") continue;</code> → <code>if (e.kind !== "gate_decision") continue;</code> | ✅ Killed (6): TUI-06: a gate with a decision of comment is still pending |
| D21 | derivation | `shared/derive.ts:262` | <code>const TIMEOUT_S = 240;</code> → <code>const TIMEOUT_S = 300;</code> | ✅ Killed (1): the deadline of a non-blocking question is 240 s after the first question to the dev |
| D22 | derivation | `shared/derive.ts:315` | <code>q.open = false; ⏎         q.merged_into = e.into;</code> → <code>q.merged_into = e.into;</code> | ✅ Killed (5): TUI-06: a merged question leaves the open ones and closes with the one it was merged into |
| D23 | derivation | `shared/derive.ts:410` | <code>if (ownerBlocked && t.last?.kind === "task") return "blocked";</code> → <code>if (ownerBlocked) return "blocked";</code> | ✅ Killed (1): TUI-14: a ticket is not blocked when its owner is offline, nor when the owner already delivered it |
| D24 | derivation | `shared/derive.ts:407` | <code>if (t.reworks >= REWORK_LIMIT) return "escalated";</code> → <code>if (t.reworks > REWORK_LIMIT) return "escalated";</code> | ✅ Killed (9): TUI-14: a ticket with three verdicts of rework is escalated |
| D25 | derivation | `shared/derive.ts:580` | <code>since: Math.max(turn?.ts ?? 0, owedAt) };</code> → <code>since: Math.min(turn?.ts ?? Infinity, owedAt) };</code> | ✅ Killed (3): TUI-07: an agent is stalled since its turn ended, or since the debt came if it came later |
| D26 | derivation | `shared/derive.ts:554` | <code>since: Math.min(block?.ts ?? Infinity, permission?.ts ?? Infinity),</code> → <code>since: Math.max(block?.ts ?? 0, permission?.ts ?? 0),</code> | ✅ Killed (1): TUI-03, TUI-04: an agent with a declared block and an open request has both, since the earlier |
| D27 | derivation | `shared/derive.ts:502` | <code>const all = [...tickets(own).values()];</code> → <code>const all = [...tickets(events).values()];</code> | ✅ Killed (13): TUI-14: only the events of the open feature count |
| D28 | derivation | `shared/derive.ts:574` | <code>...open.filter((q) => q.holder === name).map(</code> → <code>...open.filter((q) => q.asked_by === name).map(</code> | ✅ Killed (3): TUI-07, TUI-08: any agent out of turn owes the answer of an open question it holds |
| D29 | derivation | `shared/derive.ts:583` | <code>if (busy ¦¦ (role === "mother" && feature)) return { ...base, status: "working" };</code> → <code>if (busy) return { ...base, status: "working" };</code> | ✅ Killed (25): TUI-06: the mother that asked for a gate still pending is waiting, and a comment does not decide it |
| D30 | derivation | `shared/derive.ts:381` | <code>if (sinceSeq !== undefined && e.seq < sinceSeq) before.set(key, e);</code> → <code>if (sinceSeq !== undefined && e.seq < sinceSeq && !before.has(key)) before.set(key, e);</code> | ✅ Killed (4): TUI-17: the total of the feature takes out the latest usage of each session_id and model before the… |
| D31 | derivation | `shared/derive.ts:297` | <code>if (q.holder === "human" && q.reached_human_ts === null) {</code> → <code>if (q.holder === "human") {</code> | ✅ Killed (1): the deadline uses the timeout_s of the question, and counts from the first question to the dev only |
| D32 | derivation | `shared/derive.ts:478` | <code>const events = log.filter((e) => KINDS.includes(e.kind)); ⏎   const every</code> → <code>const events = log; ⏎   const every</code> | ✅ Killed (1): an event of a kind the derivation does not know is ignored |
| D33 | derivation | `shared/derive.ts:411` | <code>if (asked.some((q) => q.open && q.blocking && q.asked_by === t.owner && q.ticket_ref === …</code> → <code>if (asked.some((q) => q.open && q.blocking && q.ticket_ref === t.ticket_ref)) return "wai…</code> | ✅ Killed (1): TUI-14: a non-blocking question, one about another ticket and one somebody else asked do not leave … |
| D34 | derivation | `shared/derive.ts:231` | <code>else if (e.kind === "unblocked") all.delete(e.peer);</code> → <code>else if (e.kind === "unblocked") all.delete(e.from);</code> | ✅ Killed (2): TUI-03: an unblocked with the name in peer closes the block, whoever wrote it |
| F01 | feed | `tui/feed.ts:82` | <code>before.attempted_kind === e.attempted_kind && before.error === e.error) {</code> → <code>before.attempted_kind === e.attempted_kind) {</code> | ✅ Killed (1): TUI-23: a different line between two refusals keeps them apart, and so does another peer, kind or e… |
| F02 | feed | `tui/feed.ts:84` | <code>last.lastTs = e.ts;</code> → <code>last.lastTs = e.ts; ⏎         last.ts = e.ts;</code> | ✅ Killed (3): TUI-39: a refusal has the agent, what it tried, the error, how many times and from when to when |
| F03 | feed | `tui/feed.ts:109` | <code>const agent = squad(events.slice(0, i + 1), e.ts).agents.find((a) => a.name === e.from);</code> → <code>const agent = squad(events, e.ts).agents.find((a) => a.name === e.from);</code> | ✅ Killed (1): TUI-25: the usage that ends a turn of an agent that owes is the line of stalled, at the hour of tha… |
| F04 | feed | `tui/feed.ts:73` | <code>?.reworks === REWORK_LIMIT) {</code> → <code>?.reworks === REWORK_LIMIT - 1) {</code> | ✅ Killed (4): TUI-39: a default applied, a merge and the limit of rework show the line and what the event says |
| F05 | feed | `tui/feed.ts:101` | <code>} else if (gone.has(e.peer)) {</code> → <code>} else if (false) {</code> | ✅ Killed (4): TUI-39: who left and who came back, with the ticket and the time away |
| F06 | feed | `tui/feed.ts:100` | <code>e.reason === "died" ? "morta" : "encerrada"</code> → <code>e.reason === "died" ? "encerrada" : "morta"</code> | ✅ Killed (5): TUI-24: a peer enters, leaves dead or closed, and comes back to its open ticket |
| F07 | feed | `tui/feed.ts:71` | <code>text: e.summary.split("\n")[0]! });</code> → <code>text: e.summary });</code> | ✅ Killed (1): TUI-20: every kind of message has a line with its event and the first line of the summary |
| F08 | feed | `tui/feed.ts:57` | <code>if (e.kind === "feature_opened") own = [];</code> → <code>(removed)</code> | ❌ Survived - equivalent: `own` is also emptied at `feature_closed` (`tui/feed.ts:92`) and the broker opens one feature at a time |
| F09 | feed | `tui/feed.ts:64` | <code>e.resolved_by === "timeout_default" ⏎             ? '</code> → <code>e.resolved_by !== "timeout_default" ⏎             ? '</code> | ✅ Killed (30): TUI-21: an answer by default is a system line without from and to |
| F10 | feed | `tui/feed.ts:95` | <code>${e.tickets.filter((t) => !t.dropped).length} tickets</code> → <code>${e.tickets.length} tickets</code> | ✅ Killed (2): TUI-24: a plan is a line with its version in the feature and the tickets it keeps |
| F11 | feed | `tui/feed.ts:82` | <code>if (last && before?.kind === "refused" && before.peer === e.peer &&</code> → <code>if (last && before?.kind === "refused" &&</code> | ✅ Killed (1): TUI-23: a different line between two refusals keeps them apart, and so does another peer, kind or e… |
| F12 | feed | `tui/feed.ts:80` | <code>const last = rows.at(-1);</code> → <code>const last = rows.findLast((r) => r.sys === "refused");</code> | ✅ Killed (1): TUI-23: a different line between two refusals keeps them apart, and so does another peer, kind or e… |
| F13 | feed | `tui/feed.ts:110` | <code>if (agent?.status === "stalled" && agent.owes) rows.push</code> → <code>if (agent?.status === "working" ¦¦ (agent?.status === "stalled" && agent.owes)) rows.push</code> | ✅ Killed (148): TUI-35: who never entered and who has no feature |
| F14 | feed | `tui/feed.ts:74` | <code>rows.push({ ...row("limit", '⚠ ${e.ticket_ref} no limite ⟳ 2/2 · sem 3º rework'), seq: e.…</code> → <code>rows.splice(rows.length - 1, 0, { ...row("limit", '⚠ ${e.ticket_ref} no limite ⟳ 2/2 · se…</code> | ✅ Killed (3): TUI-26: the line of the limit comes right after the third verdict of rework, and not after the seco… |
| F15 | feed | `tui/feed.ts:69` | <code>} else if (MESSAGES.includes(e.kind)) {</code> → <code>} else if (MESSAGES.includes(e.kind) ¦¦ e.kind === "turn_started") {</code> | ✅ Killed (39): TUI-40: without a selected line and without an open feature, the summary of the last feature |
| F16 | feed | `tui/feed.ts:34` | <code>return SQUAD.find((a) => a.name === name)?.short ?? [...name].slice(0, 3).join("");</code> → <code>return SQUAD.find((a) => a.name === name)?.short ?? name;</code> | ✅ Killed (2): TUI-20: the short labels of the six, of the dev, and the first three characters of a name outside t… |
| S01 | screens | `tui/screens/chrome.ts:175` | <code>answer: "blue",</code> → <code>answer: "bblue",</code> | ✅ Killed (1): TUI-28: the color of the kind of an answer, a gate, a verdict and a permission decision |
| S02 | screens | `tui/screens/chrome.ts:177` | <code>gate_decision: "bmagenta",</code> → <code>gate_decision: "magenta",</code> | ✅ Killed (1): TUI-28: the color of the kind of an answer, a gate, a verdict and a permission decision |
| S03 | screens | `tui/screens/chrome.ts:185` | <code>return e.behavior === "deny" ? "bred" : "bgreen";</code> → <code>return e.behavior === "deny" ? "bgreen" : "bred";</code> | ✅ Killed (1): TUI-28: the color of the kind of an answer, a gate, a verdict and a permission decision |
| S04 | screens | `tui/screens/chrome.ts:184` | <code>return e.outcome === "rework" ? "bred" : "bgreen";</code> → <code>return e.outcome === "rework" ? "byellow" : "bgreen";</code> | ✅ Killed (1): TUI-28: the color of the kind of an answer, a gate, a verdict and a permission decision |
| S05 | screens | `tui/screens/chrome.ts:176` | <code>gate: "bmagenta",</code> → <code>gate: "magenta",</code> | ✅ Killed (1): TUI-28: the color of the kind of an answer, a gate, a verdict and a permission decision |
| S06 | screens | `tui/activity.ts:124` | <code>return all.map((seal) => [all.length === 1 ? seal.long : seal.short, seal.color]);</code> → <code>return all.map((seal) => [seal.short, seal.color]);</code> | ✅ Killed (9): TUI-41: one seal alone takes the long form |
| S07 | screens | `tui/screens/chrome.ts:111` | <code>if (rx <= 66) break;</code> → <code>if (rx <= 60) break;</code> | ✅ Killed (1): TUI-41: a seal that would not start after column 66 is not drawn |
| S08 | screens | `tui/screens/chrome.ts:122` | <code>const session = ui.scope === "session" ¦¦ !squad.feature;</code> → <code>const session = !squad.feature;</code> | ✅ Killed (1): TUI-41, TUI-42: line 38 in the six states of tokens and scope of frame 30 |
| S09 | screens | `tui/screens/chrome.ts:130` | <code>const used: Map<string, Totals> = session ? squad.usage.session : squad.usage.feature;</code> → <code>const used: Map<string, Totals> = squad.usage.session;</code> | ✅ Killed (20): TUI-41, TUI-42: line 38 in the six states of tokens and scope of frame 30 |
| S10 | screens | `tui/screens/main.ts:198` | <code>let start = Math.max(0, list.length - 33);</code> → <code>let start = Math.max(0, list.length - 32);</code> | ✅ Killed (24): TUI-43: frame 01 of the main screen |
| S11 | screens | `tui/screens/chrome.ts:77` | <code>else if (blocking) g.put(qx, 0, count, "bwhite", { bg: "red", bold: true });</code> → <code>else if (blocking) g.put(qx, 0, count, "bwhite", { bold: true });</code> | ✅ Killed (1): TUI-34: the counter has only the open questions the dev holds, on red when one of them is blocking |
| S12 | screens | `tui/screens/main.ts:20` | <code>(here < 6 ? here + "/6 no ar" : "6")</code> → <code>"6"</code> | ✅ Killed (5): TUI-43: frame 28a of the main screen |
| S13 | screens | `tui/screens/main.ts:114` | <code>'+${all.length - 6} tickets'</code> → <code>'+${all.length - 7} tickets'</code> | ✅ Killed (1): TUI-37: more than seven tickets are six lines and the count of the others |
| S14 | screens | `tui/screens/main.ts:47` | <code>else if (a.permission) {</code> → <code>else if (a.permission && a.blockedReason === null) {</code> | ❌ **Survived.** TUI-35 order `x <tool>` before `⚠ <reason>` is not asserted for an agent that has both a declared block and an open request |
| S15 | screens | `tui/screens/main.ts:194` | <code>list.push({ row, dim: feature ? i < lastOpen : i < lastEnd });</code> → <code>list.push({ row, dim: feature ? i < lastOpen : i <= lastEnd });</code> | ✅ Killed (1): TUI-30: without an open feature, the band under the closing line says since when |
| S16 | screens | `tui/screens/main.ts:184` | <code>const out = squad.agents.filter((a) => a.status === "blocked" ¦¦ a.status === "offline").…</code> → <code>const out = squad.agents.filter((a) => a.status === "blocked").length;</code> | ✅ Killed (3): TUI-43: frame 29a of the main screen |
| S17 | screens | `tui/screens/main.ts:200` | <code>if (selected >= 0 && selected < start) start = selected;</code> → <code>(removed)</code> | ✅ Killed (1): TUI-32: the feed shows its last 33 lines, or goes up to keep the selected one in sight |
| S18 | screens | `tui/screens/main.ts:156` | <code>g.put(x, y, cut(row.text, 85 - x), C(body), { bold: hot });</code> → <code>g.put(x, y, cut(row.text, 84 - x), C(body), { bold: hot });</code> | ✅ Killed (33): TUI-43: frame 01 of the main screen |
| S19 | screens | `tui/screens/main.ts:134` | <code>const C = (color: Color): Color => (dim ? "gray" : color);</code> → <code>const C = (color: Color): Color => color;</code> | ✅ Killed (2): TUI-29: what came before the open feature is gray, above a ruler that says what it was |
| S20 | screens | `tui/screens/main.ts:88` | <code>g.put(9, y, '⟳${Math.min(n, 2)}/2', reworks);</code> → <code>g.put(9, y, '⟳${n}/2', reworks);</code> | ✅ Killed (3): TUI-43: frame 25a of the main screen |
| S21 | screens | `tui/screens/main.ts:104` | <code>: going && owner?.status === "stalled" ⏎             ? ["‖ parado", "byellow"]</code> → <code>: false ⏎             ? ["‖ parado", "byellow"]</code> | ✅ Killed (3): TUI-43: frame 23a of the main screen |
| S22 | screens | `tui/screens/main.ts:55` | <code>else if (a.noReactionSince !== null) g.put</code> → <code>else if (false) g.put</code> | ✅ Killed (3): TUI-43: frame 23a of the main screen |
| S23 | screens | `tui/screens/chrome.ts:127` | <code>x = g.put(x + 1, y, tokens ? Math.round(tokens / 1000) + "k" : "—", tokens ? "white" : "g…</code> → <code>x = g.put(x + 1, y, tokens ? Math.floor(tokens / 1000) + "k" : "—", tokens ? "white" : "g…</code> | ❌ **Survived.** Assumption "milhares arredondados": no token total in any test has a fraction of .5 or more, so truncating passes |
| S24 | screens | `tui/screens/chrome.ts:72` | <code>const asked = squad.questions.filter((q) => q.open && q.holder === "human");</code> → <code>const asked = squad.questions.filter((q) => q.open);</code> | ✅ Killed (4): TUI-34: the counter has only the open questions the dev holds, on red when one of them is blocking |
| S25 | screens | `tui/screens/chrome.ts:87` | <code>if (!project) x = g.put(x, 0, "feature ", "gray");</code> → <code>(removed)</code> | ✅ Killed (1): TUI-33, TUI-34: line 0 in the nine states of frame 26c |
| S26 | screens | `tui/activity.ts:135` | <code>if (ui.toast && squad.now < ui.toast.until) return [[ui.toast.text, ui.toast.color]];</code> → <code>if (ui.toast) return [[ui.toast.text, ui.toast.color]];</code> | ✅ Killed (2): TUI-41: the right side of the footer is the first of the list that exists |
| S28 | screens | `tui/screens/topology.ts:187` | <code>const color = idle ? tone(e.from) : bright(tone(e.from));</code> → <code>const color = bright(tone(e.from));</code> | ✅ Killed (1): TUI-44: without an open feature the edge keeps the normal color, is not bold and is labelled as the… |
| S29 | screens | `tui/screens/topology.ts:192` | <code>[idle ? "○ última  " : "▶ ativa  ", color, true],</code> → <code>["▶ ativa  ", color, true],</code> | ✅ Killed (2): TUI-43: frame 29b of the topology |
| S30 | screens | `tui/screens/topology.ts:204` | <code>messages.slice(-6).reverse()</code> → <code>messages.slice(-5).reverse()</code> | ✅ Killed (5): TUI-43: frame 02 of the topology |
| S31 | screens | `tui/screens/topology.ts:222` | <code>.sort((a, b) => b.n - a.n).slice(0, 5)</code> → <code>.sort((a, b) => b.n - a.n).slice(0, 6)</code> | ✅ Killed (5): TUI-43: frame 02 of the topology |
| S32 | screens | `tui/screens/topology.ts:180` | <code>const last = messages.at(-1);</code> → <code>const last = messages.at(0);</code> | ✅ Killed (10): TUI-43: frame 02 of the topology |
| S33 | screens | `tui/screens/thread.ts:104` | <code>limit ? 'REPROVADO · ${marks} · limite atingido' : 'REWORK ⟳ ${reworks}/2 · ${marks}'</code> → <code>'REWORK ⟳ ${reworks}/2 · ${marks}'</code> | ✅ Killed (3): TUI-43: frame 15b of the thread |
| S34 | screens | `tui/screens/thread.ts:120` | <code>const waited = e.resolved_by === "human" && reached ?</code> → <code>const waited = reached ?</code> | ✅ Killed (2): TUI-43: frame 25b of the thread |
| S35 | screens | `tui/screens/thread.ts:93` | <code>[task ? seconds(task.ts, e.ts) : "", "gray", false]</code> → <code>["", "gray", false]</code> | ✅ Killed (5): TUI-43: frame 03 of the thread |
| S36 | screens | `tui/screens/thread.ts:125` | <code>if (dropped) { ⏎     const owner</code> → <code>if (false) { ⏎     const owner</code> | ✅ Killed (3): TUI-43: frame 25b of the thread |
| S37 | screens | `tui/screens/thread.ts:34` | <code>const ref = ui.threadTicket ?? chosen?.ticket ?? chosen?.event.ticket_ref;</code> → <code>const ref = ui.threadTicket;</code> | ✅ Killed (1): Assumptions: the thread is of the chosen ticket, or of the one of the selected line, or of the firs… |
| S38 | screens | `tui/screens/thread.ts:174` | <code>let room = 72;</code> → <code>let room = 74;</code> | ✅ Killed (3): TUI-43: frame 15b of the thread |
| S39 | screens | `tui/screens/down.ts:18` | <code>· tentativa " + attempt</code> → <code>· tentativa " + (attempt + 1)</code> | ✅ Killed (3): TUI-43: frame 12 of the frozen screen |
| S40 | screens | `tui/screens/small.ts:14` | <code>['${cols} × ${rows}', "bred", true]</code> → <code>['${rows} × ${cols}', "bred", true]</code> | ✅ Killed (2): TUI-54: a terminal of 80 by 24 shows frame 21 |
| S41 | screens | `tui/screens/chrome.ts:68` | <code>Math.floor((squad.now - down.since) / 1000)}s'</code> → <code>Math.ceil((squad.now - down.since) / 1000) + 1}s'</code> | ✅ Killed (5): TUI-33, TUI-34: line 0 in the nine states of frame 26c |
| S42 | screens | `tui/activity.ts:108` | <code>for (const a of of("stalled")) { ⏎     all.push</code> → <code>for (const a of of("working")) { ⏎     if (a.owes) all.push</code> | ✅ Killed (5): TUI-41: one seal alone takes the long form |
| R01 | reader | `tui/reader.ts:37` | <code>cursor = body.last_seq;</code> → <code>cursor = Math.max(cursor, ...fresh.map((e) => e.seq));</code> | ❌ Survived - equivalent under the broker: `last_seq` is always the `seq` of the last event it returns (`broker.ts:77`); no test answers a `last_seq` above the events it carries |
| R02 | reader | `tui/reader.ts:34` | <code>.filter((e) => e.seq > cursor).sort(</code> → <code>.sort(</code> | ✅ Killed (1): TUI-50: a seq already seen does not enter twice |
| R03 | reader | `tui/reader.ts:28` | <code>if (body.last_seq < cursor) {</code> → <code>if (false) {</code> | ✅ Killed (1): edge case: last_seq smaller than the cursor empties the log and reads from cursor 0 |
| R04 | reader | `tui/reader.ts:27` | <code>if (!Array.isArray(body?.events) ¦¦ !Number.isInteger(body.last_seq)) return</code> → <code>if (!Array.isArray(body?.events)) return</code> | ✅ Killed (2): TUI-51, TUI-52, TUI-53: last_seq that is not an integer is a failed read, the log stays and the nex… |
| R05 | reader | `tui/reader.ts:20` | <code>if (res.status !== 200) return { ok: false, events: log };</code> → <code>if (res.status >= 500 && res.status !== 500) return { ok: false, events: log };</code> | ✅ Killed (1): TUI-51, TUI-52, TUI-53: status 500 is a failed read, the log stays and the next read uses the same … |
| R06 | reader | `tui/reader.ts:19` | <code>const res = await fetch('${url}/events?after=${cursor}', { signal: abort.signal });</code> → <code>void fetch('${url}/poll-messages', { method: "POST", signal: abort.signal }).catch(() => …</code> | ✅ Killed (12): TUI-51, TUI-53: while the broker does not answer the last state is frozen with the seconds and the … |
| R07 | reader | `tui/reader.ts:34` | <code>.sort((a, b) => a.seq - b.seq); ⏎     // A new list</code> → <code>; ⏎     // A new list</code> | ✅ Killed (1): TUI-50: the events of each read are added in order of seq and the cursor goes to last_seq |
| R08 | reader | `tui/reader.ts:30` | <code>log = []; ⏎       cursor = 0;</code> → <code>cursor = 0;</code> | ✅ Killed (1): edge case: last_seq smaller than the cursor empties the log and reads from cursor 0 |
| R09 | reader | `tui/reader.ts:17` | <code>const timer = setTimeout(() => abort.abort(), timeoutMs);</code> → <code>const timer = setTimeout(() => undefined, timeoutMs);</code> | ✅ Killed (0): (timeout) |
| R10 | reader | `tui/reader.ts:27` | <code>if (!Array.isArray(body?.events) ¦¦ !Number.isInteger(body.last_seq)) return</code> → <code>if (!Number.isInteger(body?.last_seq)) return</code> | ✅ Killed (1): TUI-51, TUI-52, TUI-53: events that is not a list is a failed read, the log stays and the next read… |
| K01 | keys | `tui/keys.ts:37` | <code>case "2": ⏎       return { ...ui, screen: "topology" };</code> → <code>case "2": ⏎       return { ...ui, screen: "help" };</code> | ✅ Killed (2): TUI-62: 1, 2, 3 and ? change the screen and esc goes back to the main one |
| K02 | keys | `tui/keys.ts:43` | <code>case "\x1b": ⏎       return { ...ui, screen: "main" };</code> → <code>case "\x1b": ⏎       return ui;</code> | ✅ Killed (2): TUI-62: 1, 2, 3 and ? change the screen and esc goes back to the main one |
| K03 | keys | `tui/keys.ts:13` | <code>const TOAST_MS = 4000;</code> → <code>const TOAST_MS = 3999;</code> | ✅ Killed (5): TUI-63: g, x and 4 say for 4 s which slice brings them and do not change the screen |
| K04 | keys | `tui/keys.ts:49` | <code>return toast("chega com a fatia Gate");</code> → <code>return toast("chega com a fatia Question");</code> | ✅ Killed (2): TUI-63: g, x and 4 say for 4 s which slice brings them and do not change the screen |
| K05 | keys | `tui/keys.ts:52` | <code>return e?.kind === "question" && waiting.some((q) => q.id === e.question_id) ? toast("che…</code> → <code>return e?.kind === "question" ? toast("chega com a fatia Question") : thread();</code> | ✅ Killed (1): TUI-62: enter opens the thread, from its latest entry, of the ticket of the selected line |
| K06 | keys | `tui/keys.ts:80` | <code>: toast("sem feature aberta · só a sessão");</code> → <code>: ui;</code> | ✅ Killed (1): TUI-42: without an open feature t says only the session exists, for 4 s |
| K07 | keys | `tui/keys.ts:83` | <code>.sort((a, b) => a.first_seq - b.first_seq)[0];</code> → <code>.sort((a, b) => a.first_seq - b.first_seq).at(-1);</code> | ✅ Killed (1): b selects, on the main screen, the latest question of the oldest blocking question that is with the… |
| K08 | keys | `tui/keys.ts:84` | <code>const row = q && rows.findLast((row) => row.event.kind === "question"</code> → <code>const row = q && rows.find((row) => row.event.kind === "question"</code> | ✅ Killed (1): b selects, on the main screen, the latest question of the oldest blocking question that is with the… |
| K09 | keys | `tui/keys.ts:63` | <code>Math.max(0, Math.min(rows.length - 1, at + step));</code> → <code>(at + step + rows.length) % rows.length;</code> | ✅ Killed (2): TUI-62: j, k and the arrows move the selection of the feed by one line, and stop at its ends |
| K10 | keys | `tui/keys.ts:76` | <code>return { ...ui, focus: ((ui.focus + 2) % 3) as Ui["focus"] };</code> → <code>return { ...ui, focus: ((ui.focus + 1) % 3) as Ui["focus"] };</code> | ✅ Killed (1): TUI-62: tab and shift+tab change the panel in focus, around the three |
| K11 | keys | `tui/keys.ts:20` | <code>return ui.paused ? shown : fresh;</code> → <code>return fresh;</code> | ✅ Killed (2): p freezes the lines of the feed and the selection, and resuming shows what arrived |
| K12 | keys | `tui/keys.ts:70` | <code>at + (key === "]" ? 1 : -1)</code> → <code>at + (key === "]" ? -1 : 1)</code> | ✅ Killed (1): TUI-62: [ and ] go to the ticket before and after in the thread, and stop at the ends of the plan |
| K13 | keys | `tui/keys.ts:80` | <code>? { ...ui, scope: ui.scope === "feature" ? "session" : "feature", toast: null }</code> → <code>? { ...ui, scope: "session", toast: null }</code> | ✅ Killed (1): TUI-42: t switches the footer between the tokens of the feature and of the session |
| K14 | keys | `tui/keys.ts:27` | <code>const thread = (): Ui => ({ ...ui, screen: "thread", threadTicket: null, threadOffset: 0 …</code> → <code>const thread = (): Ui => ({ ...ui, screen: "thread", threadOffset: 0 });</code> | ✅ Killed (1): TUI-62: enter opens the thread, from its latest entry, of the ticket of the selected line |
| K15 | keys | `tui/keys.ts:60` | <code>if (ui.screen === "thread") return { ...ui, threadOffset: Math.max(0, ui.threadOffset - s…</code> → <code>(removed)</code> | ✅ Killed (1): TUI-62: in the thread j, k and the arrows scroll the entries and leave the selection of the feed |
| K16 | keys | `tui/keys.ts:29` | <code>const waiting = squad.questions.filter((q) => q.open && q.holder === "human");</code> → <code>const waiting = squad.questions.filter((q) => q.open);</code> | ✅ Killed (2): TUI-62: enter opens the thread, from its latest entry, of the ticket of the selected line |
| K17 | keys | `tui/keys.ts:85` | <code>return row ? { ...ui, screen: "main", selected: row.seq } : toast("nenhuma bloqueante");</code> → <code>return row ? { ...ui, selected: row.seq } : toast("nenhuma bloqueante");</code> | ✅ Killed (1): b selects, on the main screen, the latest question of the oldest blocking question that is with the… |
| T01 | tui.ts | `tui.ts:152` | <code>  try { ⏎     settings = config();</code> → <code>  process.stdout.write(ENTER); ⏎   try { ⏎     settings = config();</code> | ✅ Killed (3): TUI-56: an invalid SQUAD_TUI_GLYPHS exits 1 with the pair, before the alternate screen |
| T02 | tui.ts | `tui.ts:101` | <code>    io.write(LEAVE); ⏎     io.raw(false);</code> → <code>    io.raw(false);</code> | ✅ Killed (3): TUI-60: the loop takes the terminal, draws what the broker answers and gives the terminal back on q |
| T03 | tui.ts | `tui.ts:102` | <code>    io.raw(false); ⏎     settle();</code> → <code>    settle();</code> | ✅ Killed (3): TUI-60: the loop takes the terminal, draws what the broker answers and gives the terminal back on q |
| T04 | tui.ts | `tui.ts:92` | <code>cols < 120 ¦¦ lines < 40 ? small(cols, lines)</code> → <code>cols < 120 ? small(cols, lines)</code> | ✅ Killed (1): TUI-54: a terminal smaller than 120�40 shows only its size, and the screen comes back when it grows |
| T05 | tui.ts | `tui.ts:114` | <code>attempt: (down?.attempt ?? 0) + 1 };</code> → <code>attempt: 1 };</code> | ✅ Killed (1): TUI-51, TUI-53: while the broker does not answer the last state is frozen with the seconds and the … |
| T06 | tui.ts | `tui.ts:114` | <code>since: down?.since ?? io.now(),</code> → <code>since: io.now(),</code> | ✅ Killed (1): TUI-51, TUI-53: while the broker does not answer the last state is frozen with the seconds and the … |
| T07 | tui.ts | `tui.ts:137` | <code>      draw(true);</code> → <code>      draw();</code> | ✅ Killed (1): edge case: a resize erases the terminal and draws the whole screen again |
| T08 | tui.ts | `tui.ts:128` | <code>      draw(); ⏎     } catch (error) { ⏎       fail(error);</code> → <code>      draw(); ⏎     } catch (error) { ⏎       throw error;</code> | ✅ Killed (1): TUI-60: an error in the loop gives the terminal back before the loop ends with it |
| T09 | tui.ts | `tui.ts:50` | <code>return root === null ? null : projectOf(root, cwd);</code> → <code>return null;</code> | ✅ Killed (1): TUI-64: the project is the name of the repository of the directory, and null outside one |
| T10 | tui.ts | `tui.ts:112` | <code>      log = read.events; ⏎       down = null;</code> → <code>      log = read.events;</code> | ✅ Killed (1): TUI-51, TUI-53: while the broker does not answer the last state is frozen with the seconds and the … |
| T11 | tui.ts | `tui.ts:33` | <code>const KEY = /\x1b\[[0-9;]*[A-Za-z~]¦[\s\S]/gu;</code> → <code>const KEY = /[\s\S]/gu;</code> | ✅ Killed (1): TUI-62: the keys of a chunk of the input are pressed in order, an escape sequence as one key |
| T12 | tui.ts | `tui.ts:143` | <code>  io.raw(true); ⏎   io.write(ENTER);</code> → <code>  io.raw(true);</code> | ✅ Killed (1): TUI-60: the loop takes the terminal, draws what the broker answers and gives the terminal back on q |
| T13 | tui.ts | `tui.ts:93` | <code>io.write((whole ? CLEAR : "") + paint(next, whole ? null : prev, settings.glyphs));</code> → <code>io.write((whole ? CLEAR : "") + paint(next, null, settings.glyphs));</code> | ❌ **Survived.** TUI-61 at the loop: `paint` is unit-tested with a previous grid, but no test notices a loop that repaints all 40 lines on every drawing |
| T14 | tui.ts | `tui.ts:125` | <code>if (!next) return stop();</code> → <code>if (!next) return;</code> | ✅ Killed (2): TUI-60: the loop takes the terminal, draws what the broker answers and gives the terminal back on q |
| T15 | tui.ts | `tui.ts:156` | <code>    process.exit(1); ⏎   } ⏎   if (!stdin.isTTY</code> → <code>    process.exit(0); ⏎   } ⏎   if (!stdin.isTTY</code> | ✅ Killed (2): TUI-56: an invalid SQUAD_TUI_GLYPHS exits 1 with the pair, before the alternate screen |
| T16 | tui.ts | `tui.ts:44` | <code>glyphs: parseGlyphs(env.SQUAD_TUI_GLYPHS), prices: prices(env) };</code> → <code>glyphs: new Map(), prices: prices(env) };</code> | ✅ Killed (2): TUI-56: an invalid SQUAD_TUI_GLYPHS exits 1 with the pair, before the alternate screen |
| T17 | tui.ts | `tui.ts:93` | <code>io.write((whole ? CLEAR : "") + paint(next, whole ? null : prev, settings.glyphs));</code> → <code>io.write((whole ? CLEAR : "") + paint(next, whole ? null : prev));</code> | ❌ **Survived.** TUI-56 at the loop: the loop of the tests runs with `glyphs: new Map()`; no test notices a loop that never passes the substitutes to `paint` |
| C01 | config | `tui/config.ts:50` | <code>return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : 1000;</code> → <code>return Number(value) > 0 ? Number(value) : 1000;</code> | ✅ Killed (1): TUI-58: the TUI reads every 1000 ms when SQUAD_POLL_INTERVAL_MS is "1.5" |
| C02 | config | `tui/config.ts:42` | <code>/ 1_000_000;</code> → <code>/ 1_000;</code> | ✅ Killed (32): TUI-41, TUI-42: line 38 in the six states of tokens and scope of frame 30 |
| C03 | config | `tui/config.ts:31` | <code>!Object.values(table).every(isPrice)</code> → <code>!Object.values(table).some(isPrice)</code> | ❌ **Survived.** TUI-57: no test has a table with one valid and one invalid model |
| C04 | config | `tui/config.ts:50` | <code>return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : 1000;</code> → <code>return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : 500;</code> | ✅ Killed (7): TUI-58: the TUI reads every 1000 ms when SQUAD_POLL_INTERVAL_MS is undefined |
| C05 | config | `tui/config.ts:31` | <code>¦¦ Array.isArray(table) ¦¦</code> → <code>¦¦</code> | ✅ Killed (1): TUI-57: a SQUAD_PRICES file that is a list is refused with its path |
| A01 | ansi | `tui/ansi.ts:61` | <code>if (!prev ¦¦ !same(row, prev.rows[y])) out +=</code> → <code>if (true) out +=</code> | ✅ Killed (1): TUI-61: a paint over the previous one writes only the lines that differ |
| A02 | ansi | `tui/ansi.ts:51` | <code>cell.bg === other.bg && cell.bold === other.bold;</code> → <code>cell.bg === other.bg;</code> | ✅ Killed (1): TUI-61: a paint over the previous one writes only the lines that differ |
| A03 | ansi | `tui/ansi.ts:40` | <code>out += glyphs.get(cell.ch) ?? cell.ch;</code> → <code>out += cell.ch;</code> | ✅ Killed (1): TUI-56: a glyph with a substitute is written as the substitute |
| A04 | ansi | `tui/ansi.ts:72` | <code>if (chars.length !== 3 ¦¦ chars[1] !== "=") {</code> → <code>if (chars[1] !== "=") {</code> | ✅ Killed (3): TUI-56: "⚠=" is refused with the pair "⚠=" in the message |
| A05 | ansi | `tui/ansi.ts:18` | <code>gray: 90,</code> → <code>gray: 37,</code> | ✅ Killed (1): TUI-61: gray is SGR 90, 100 as background, with 1 for bold |
| A06 | ansi | `tui/ansi.ts:30` | <code>export const LEAVE = "\x1b[?25h\x1b[?1049l";</code> → <code>export const LEAVE = "\x1b[?1049l";</code> | ❌ **Survived.** TUI-60: every assertion compares with the imported `LEAVE`; a `LEAVE` that does not show the cursor again passes |
| A07 | ansi | `tui/ansi.ts:29` | <code>export const ENTER = "\x1b[?1049h\x1b[?25l";</code> → <code>export const ENTER = "\x1b[?1049h";</code> | ❌ **Survived.** TUI-60: every assertion compares with the imported `ENTER`; an `ENTER` that does not hide the cursor passes |
| A08 | ansi | `tui/ansi.ts:38` | <code>${cell.bold ? ";1" : ""}</code> → <code>(removed)</code> | ✅ Killed (19): TUI-61: the first paint writes every line, each after the cursor position of its line |
| P01 | probe | `tui/probe.ts:66` | <code>process.exit(wide.length === 0 ? 0 : 2);</code> → <code>process.exit(0);</code> | ❌ **Survived.** TUI-59: exit 0 / exit 2 of the probe inside a terminal has no test (declared limit: no pseudo-terminal in the suite) |
| P02 | probe | `tui/probe.ts:47` | <code>console.error("probe needs a terminal on stdin and stdout"); ⏎     process.exit(1);</code> → <code>console.error("probe needs a terminal on stdin and stdout"); ⏎     process.exit(0);</code> | ✅ Killed (1): TUI-59: the probe outside a terminal says it needs one and exits 1 |
| P03 | probe | `tui/glyphs.ts:5` | <code>"⚠", "⟳",</code> → <code>"⚠",</code> | ✅ Killed (1): TUI-59: every character above U+024F in a frame is a glyph the probe measures |
| S27 | screens | `tui/activity.ts:155` | <code>const gate = squad.gates.find((g) => g.pending); ⏎   if (gate) return [['⚠ ${gid(gate.id)…</code> → <code>if (!squad.feature) return [[idle, "gray"]]; ⏎   const gate = squad.gates.find((g) => g.p…</code> | ✅ Killed (3): TUI-41: the right side of the footer is the first of the list that exists |
| F08c | feed | `tui/feed.ts:91` | <code>rows.push({ ...row("closed", text), squad: squad(events.slice(0, i), e.ts) }); ⏎       ow…</code> → <code>rows.push({ ...row("closed", text), squad: squad(events.slice(0, i), e.ts) });</code> | ❌ Survived - equivalent: `own` is also emptied at `feature_opened` (`tui/feed.ts:57`); with both resets gone (F08d) the tests fail |
| X01 | detail | `tui/screens/detail.ts:339` | <code>...same.slice(-5).map((r): Seg[] => [</code> → <code>...same.slice(-4).map((r): Seg[] => [</code> | ✅ Killed (9): TUI-39: a message has its header, the body in 30 columns, the criteria, the thread of the ticket an… |
| X02 | detail | `tui/screens/detail.ts:366` | <code>const approval = own.findLast((r) => r.event.kind === "gate_decision" && r.event.decision…</code> → <code>const approval = own.findLast((r) => r.event.kind === "gate_decision");</code> | ❌ **Survived.** TUI-40 "a decisão de gate de `approve`": a `comment` or a `reject` as the last decision would be drawn as `G-01 aprovado` |
| X03 | detail | `tui/screens/detail.ts:367` | <code>const by = (how: string) => then.questions.filter((q) => q.merged_into === null && q.reso…</code> → <code>const by = (how: string) => then.questions.filter((q) => q.resolved_by?.includes(how)).le…</code> | ✅ Killed (5): TUI-40: without a selected line and without an open feature, the summary of the last feature |
| X04 | detail | `tui/screens/detail.ts:389` | <code>[["mensagens ", "gray"], [String(own.filter((r) => !r.sys).length), "white"]],</code> → <code>[["mensagens ", "gray"], [String(own.length), "white"]],</code> | ✅ Killed (6): TUI-40: without a selected line and without an open feature, the summary of the last feature |
| X05 | detail | `tui/screens/detail.ts:369` | <code>const dollars = [...then.usage.feature.values()]</code> → <code>const dollars = [...then.usage.session.values()]</code> | ✅ Killed (6): TUI-40: without a selected line and without an open feature, the summary of the last feature |
| X06 | detail | `tui/screens/detail.ts:355` | <code>body = body.slice(0, Math.max(1, room));</code> → <code>body = body.slice(0, Math.max(1, room + 1));</code> | ✅ Killed (1): TUI-39: a body that does not fit is cut so that the panel keeps its 34 lines |
| X07 | detail | `tui/screens/detail.ts:379` | <code>['tickets · ${then.tickets.filter((t) => t.approved).length} de ${then.tickets.length} ap…</code> → <code>['tickets · ${then.tickets.length} de ${then.tickets.length} aprovados', "gray"]</code> | ✅ Killed (2): TUI-40: an abandoned feature shows the reason, or that none was given, and where each ticket stopped |
| X08 | detail | `tui/screens/detail.ts:418` | <code>if (view.squad.feature) return [[["nenhuma mensagem selecionada", "gray"]]];</code> → <code>(removed)</code> | ✅ Killed (1): TUI-39: without a selected line the panel says so |
| X09 | detail | `tui/screens/detail.ts:316` | <code>const id = 'msg #${String(e.seq).padStart(4, "0")}';</code> → <code>const id = 'msg #${String(e.seq % 10000).padStart(4, "0")}';</code> | ✅ Killed (1): TUI-39: a message outside a ticket shows the scope and the messages of the feature; a seq above 999… |
| X10 | detail | `tui/screens/detail.ts:253` | <code>const asked = view.rows.filter((r) => r.event.kind === "question" && r.seq > row.seq &&</code> → <code>const asked = view.rows.filter((r) => r.event.kind === "question" &&</code> | ✅ Killed (2): TUI-39: a blocked has since when, the ticket, the reason, the detail, the last action and how it we… |
| X11 | detail | `tui/screens/detail.ts:419` | <code>const last = view.rows.findLast((r) => r.sys === "closed");</code> → <code>const last = view.rows.find((r) => r.sys === "closed");</code> | ❌ **Survived.** TUI-40 "última feature fechada": no test has two closed features and no selection |
| X12 | detail | `tui/screens/detail.ts:384` | <code>[['⟳ ${by("default")} com default aplicado', "byellow"]],</code> → <code>[['⟳ ${by("timeout")} com default aplicado', "byellow"]],</code> | ✅ Killed (5): TUI-40: without a selected line and without an open feature, the summary of the last feature |
| L01 | screens / loop | `tui/screens/chrome.ts:89` | <code>cut(squad.feature.title, Math.max(8, limit - x - len(workflow)))</code> → <code>cut(squad.feature.title, Math.max(8, limit - x))</code> | ✅ Killed (1): TUI-33, TUI-34: line 0 in the nine states of frame 26c |
| L02 | screens / loop | `tui/screens/main.ts:212` | <code>if (rows.length === 0) {</code> → <code>if (false) {</code> | ✅ Killed (3): TUI-43: frame 28a of the main screen |
| L03 | screens / loop | `tui/screens/main.ts:70` | <code>: squad.features.length > 0</code> → <code>: squad.features.length === 0</code> | ✅ Killed (12): TUI-43: frame 09a of the main screen |
| L04 | screens / loop | `tui/screens/main.ts:186` | <code>band = out ? ' squad sem feature desde</code> → <code>band = false ? ' squad sem feature desde</code> | ✅ Killed (5): TUI-43: frame 29a of the main screen |
| L05 | screens / loop | `tui/screens/main.ts:179` | <code>before.event.outcome === "delivered" ? "✓ entregue" : "✗ abandonada"</code> → <code>before.event.outcome === "delivered" ? "✗ abandonada" : "✓ entregue"</code> | ✅ Killed (3): TUI-43: frame 26b of the main screen |
| L06 | screens / loop | `tui/screens/main.ts:102` | <code>: going && owner?.status === "offline"</code> → <code>: owner?.status === "offline"</code> | ❌ **Survived.** TUI-37 does not say whether a ticket `done`, `planned` or `dropped` of an offline owner shows `◌ parado`; the code says no, no test says either |
| L07 | screens / loop | `tui/screens/main.ts:76` | <code>const compact = all.length > 3;</code> → <code>const compact = all.length > 4;</code> | ✅ Killed (5): TUI-43: frame 24c of the main screen |
| L08 | screens / loop | `tui/screens/main.ts:77` | <code>const shown = all.length > 7 ? all.slice(0, 6) : all;</code> → <code>const shown = all.length > 8 ? all.slice(0, 6) : all;</code> | ❌ **Survived.** Assumption "com mais de sete, seis linhas e `+N tickets`": the test uses more than eight tickets, never exactly eight |
| L09 | screens / loop | `tui/feed.ts:77` | <code>[blocked] ${e.reason}'</code> → <code>[blocked] ${e.detail}'</code> | ✅ Killed (4): TUI-22: a blocked is the line of the agent with the reason |
| L10 | screens / loop | `tui/screens/thread.ts:110` | <code>if (seen.has(e.question_id)) continue;</code> → <code>(removed)</code> | ✅ Killed (7): TUI-43: frame 03 of the thread |
| L11 | screens / loop | `tui/screens/thread.ts:89` | <code>[reworks ? 'rework ${Math.min(reworks, 2)}/2' : "", "gray", false]</code> → <code>["", "gray", false]</code> | ✅ Killed (5): TUI-43: frame 03 of the thread |
| L12 | screens / loop | `tui/screens/thread.ts:114` | <code>if (e.blocking) {</code> → <code>if (false) {</code> | ✅ Killed (6): TUI-43: frame 03 of the thread |
| L13 | screens / loop | `tui/screens/thread.ts:141` | <code>drawRows(g, 2, 5, 34, planned(view, ticket), 0, 76, "gray");</code> → <code>(removed)</code> | ✅ Killed (2): TUI-43: frame 24d of the thread |
| L14 | screens / loop | `tui/screens/topology.ts:228` | <code>for (const t of squad.tickets) {</code> → <code>for (const t of squad.tickets.filter((t) => t.reworks > 0)) {</code> | ✅ Killed (4): TUI-43: frame 02 of the topology |
| L15 | screens / loop | `tui/screens/topology.ts:39` | <code>v(43, 11, 12);</code> → <code>v(43, 11, 11);</code> | ✅ Killed (3): TUI-43: frame 29b of the topology |
| L16 | screens / loop | `tui/screens/topology.ts:144` | <code>const asked = squad.questions.filter((q) => q.open && q.holder === "human").sort(</code> → <code>const asked = squad.questions.filter((q) => q.open).sort(</code> | ❌ **Survived.** TUI-45 "perguntas abertas com holder `human`": every open question of the topology tests is with the dev |
| L17 | screens / loop | `tui/screens/main.ts:46` | <code>g.put(4, y + 2, cut("◌ sessão morta há " + age(seconds(view, a.since!)), 23), "red");</code> → <code>g.put(4, y + 2, cut("◌ sessão morta há " + age(seconds(view, a.since!) + 1), 23), "red");</code> | ✅ Killed (3): TUI-43: frame 13a of the main screen |
| L18 | screens / loop | `tui/screens/main.ts:174` | <code>const lastOpen = feature ? rows.findIndex((row) => row.seq === feature.opened_seq) : -1;</code> → <code>const lastOpen = -1;</code> | ✅ Killed (19): TUI-43: frame 01 of the main screen |
| L19 | screens / loop | `tui/activity.ts:150` | <code>if (alerts.every((a) => a.permission && a.blockedReason === null)) return</code> → <code>if (false) return</code> | ✅ Killed (2): TUI-41: the right side of the footer is the first of the list that exists |
| L20 | screens / loop | `tui/activity.ts:147` | <code>const since = squad.feature ? ' há ${age(Math.floor((squad.now - first.since!) / 1000))}'…</code> → <code>const since = ' há ${age(Math.floor((squad.now - first.since!) / 1000))}';</code> | ✅ Killed (2): TUI-41: the right side of the footer is the first of the list that exists |
| L21 | screens / loop | `tui/activity.ts:65` | <code>if (squad.planVersion === 0) return say(kickoff ? "planejando" : "sem tarefa ainda");</code> → <code>if (squad.planVersion === 0) return say("sem tarefa ainda");</code> | ✅ Killed (1): TUI-35: the leader |
| L22 | screens / loop | `tui/activity.ts:31` | <code>const left = pending ? Math.max(0, Math.floor((pending.deadline! - squad.now) / 1000)) : …</code> → <code>const left = pending ? Math.floor((pending.deadline! - squad.now) / 1000) : null;</code> | ❌ **Survived.** Not defined by the spec: what the countdown shows after the deadline and before the broker writes the default |
| L23 | screens / loop | `tui/screens/help.ts:78` | <code>export function help(view: View): Grid {</code> → <code>export function help(view: View): Grid { ⏎   if (view.squad.feature) view = { ...view, ui…</code> | ❌ Survived - equivalent: the legend does not draw line 38, the only reader of `ui.scope` |
| L24 | screens / loop | `tui/grid.ts:39` | <code>return len(s) <= n ? s : [...s].slice(0, Math.max(0, n - 1)).join("") + "…";</code> → <code>return len(s) < n ? s : [...s].slice(0, Math.max(0, n - 1)).join("") + "…";</code> | ✅ Killed (62): TUI-43: frame 01 of the main screen |
| L25 | screens / loop | `tui/grid.ts:54` | <code>else if (len(line) + 1 + len(word) <= w) line += " " + word;</code> → <code>else if (len(line) + 1 + len(word) < w) line += " " + word;</code> | ✅ Killed (20): TUI-39: a blocked has since when, the ticket, the reason, the detail, the last action and how it we… |
| L26 | screens / loop | `tui/grid.ts:73` | <code>export const age = (n: number): string => (n < 60 ?</code> → <code>export const age = (n: number): string => (n <= 60 ?</code> | ✅ Killed (1): TUI-19: age and mmss format seconds as the prototype does |
| L27 | screens / loop | `tui.ts:86` | <code>rows = visible(ui, fresh, rows);</code> → <code>rows = fresh;</code> | ✅ Killed (1): the paused feed keeps its lines while the read goes on, and shows what arrived when it resumes |
| L28 | screens / loop | `tui.ts:124` | <code>const next = press(ui, k, { ...seen, ui });</code> → <code>const next = press(ui, k, seen);</code> | ❌ **Survived.** A chunk with `]]` or `[[` advances one ticket instead of two; the chunk test presses keys that do not read `view.ui` |
| L29 | screens / loop | `tui.ts:116` | <code>timer = setTimeout(() => tick().catch(fail), settings.intervalMs);</code> → <code>timer = setTimeout(() => tick().catch(fail), 5);</code> | ❌ **Survived.** TUI-58 at the loop: every loop test runs at 5 ms or 50 ms, so a loop that ignores `settings.intervalMs` passes (declared limit: the interval is not tested by wall clock) |
| L30 | screens / loop | `tui.ts:92` | <code>? small(cols, lines) : down ? frozen(view())</code> → <code>? small(cols, lines) : false ? frozen(view())</code> | ✅ Killed (1): TUI-51, TUI-53: while the broker does not answer the last state is frozen with the seconds and the … |
| F08d | feed | `tui/feed.ts:58` | <code>    own.push(e);</code> → <code>    own = events.slice(0, i + 1);</code> | ✅ Killed (1): TUI-24: a plan is a line with its version in the feature and the tickets it keeps |
| Y01 | derivation / screens | `tui/screens/main.ts:97` | <code>g.put(x + 1, y + 1, '[${t.status}]', TICKET_TONE[t.status], { bold: strong });</code> → <code>g.put(x + 1, y + 1, '[${t.status === "review" ? "working" : t.status}]', TICKET_TONE[t.st…</code> | ✅ Killed (8): TUI-43: frame 01 of the main screen |
| Y02 | derivation / screens | `tui/screens/main.ts:84` | <code>const owner = squad.agents.find((a) => a.name === t.owner && !t.dropped);</code> → <code>const owner = squad.agents.find((a) => a.name === t.owner);</code> | ✅ Killed (3): TUI-43: frame 25a of the main screen |
| Y03 | derivation / screens | `tui/screens/main.ts:166` | <code>const live: [string, Color] = ui.paused ? ["○ pausado", "byellow"] :</code> → <code>const live: [string, Color] = false ? ["○ pausado", "byellow"] :</code> | ✅ Killed (2): the paused feed keeps its lines while the read goes on, and shows what arrived when it resumes |
| Y04 | derivation / screens | `tui/screens/chrome.ts:93` | <code>g.put(x, 0, cut(squad.features.length > 0 ? "○ sem feature aberta" : "○ nenhuma feature a…</code> → <code>g.put(x, 0, cut("○ sem feature aberta", limit - x), "gray");</code> | ✅ Killed (4): TUI-33, TUI-34: line 0 in the nine states of frame 26c |
| Y05 | derivation / screens | `tui/activity.ts:105` | <code>const how = gone?.kind === "peer_left" && gone.reason === "unregistered" ? "encerrada" : …</code> → <code>const how = "morta";</code> | ✅ Killed (1): TUI-41: one seal alone takes the long form |
| Y06 | derivation / screens | `tui/activity.ts:101` | <code>if (a.blockedReason !== null) all.push({ long: '⚠ ${a.short} bloqueado · ${a.blockedReaso…</code> → <code>all.push({ long: '⚠ ${a.short} bloqueado · ${a.blockedReason}'</code> | ✅ Killed (5): TUI-41: one seal alone takes the long form |
| Y07 | derivation / screens | `tui/screens/thread.ts:148` | <code>const end = entries.length - Math.max(0, Math.min(ui.threadOffset, entries.length - 1));</code> → <code>const end = entries.length;</code> | ✅ Killed (1): TUI-46: the entries that do not fit in the 30 lines fold into a count, and the thread scrolls |
| Y08 | derivation / screens | `tui/screens/thread.ts:35` | <code>return (squad.tickets.find((t) => t.ticket_ref === ref) ?? squad.tickets[0])?.ticket_ref …</code> → <code>return (squad.tickets.find((t) => t.ticket_ref === ref) ?? squad.tickets.at(-1))?.ticket_…</code> | ✅ Killed (15): TUI-43: frame 03 of the thread |
| Y09 | derivation / screens | `tui/screens/topology.ts:188` | <code>for (const [x, y, ch] of edgePath(from, to)) g.put(x, y, ch, color, { bold: !idle });</code> → <code>for (const [x, y, ch] of edgePath(from, to)) g.put(x, y, ch, color, { bold: true });</code> | ✅ Killed (1): TUI-44: without an open feature the edge keeps the normal color, is not bold and is labelled as the… |
| Y10 | derivation / screens | `shared/derive.ts:480` | <code>const feature = every.findLast((f) => f.closed_seq === null) ?? null;</code> → <code>const feature = every.find((f) => f.closed_seq === null) ?? null;</code> | ❌ Survived - equivalent: the broker never has two open features (Out of Scope) |
| Y11 | derivation / screens | `shared/derive.ts:482` | <code>(last, f) => (f.closed_seq !== null && f.closed_seq > (last?.closed_seq ?? 0) ? f : last),</code> → <code>(last, f) => (f.closed_seq !== null && last === null ? f : last),</code> | ✅ Killed (1): TUI-18: without an open feature the squad has no ticket, question, gate nor tokens of feature |
| Y12 | derivation / screens | `shared/derive.ts:538` | <code>ticket: owned.at(-1)?.ticket_ref ?? null,</code> → <code>ticket: owned.at(0)?.ticket_ref ?? null,</code> | ❌ Survived - equivalent: the broker refuses a second open ticket for a worker (`worker_busy`) |
| Y13 | derivation / screens | `tui/screens/main.ts:38` | <code>g.put(x, y + 1, cut(doing.text, 27 - x - (rework ? len(rework) + 1 : 0) - (left ? len(lef…</code> → <code>g.put(x, y + 1, cut(doing.text, 27 - x), "white");</code> | ✅ Killed (9): TUI-43: frame 01 of the main screen |
| Y14 | derivation / screens | `tui/screens/detail.ts:377` | <code>...(!abandoned ? [] : e.body ? ([[["  motivo", "gray"]]</code> → <code>...(!e.body ? [] : e.body ? ([[["  motivo", "gray"]]</code> | ✅ Killed (6): TUI-40: without a selected line and without an open feature, the summary of the last feature |

**Sensor depth**: expanded (P0-full by hand: 210 mutations over the derivation, the feed, the screens, the reader, the keys, `tui.ts`, the settings, the escapes and the probe)
**Sensor outcome**: 186/210 killed, 24 survived - 6 equivalent, 18 not

Survivors that are not equivalent: D17, D19, S14, S23, T13, T17, C03, A06, A07, P01, X02, X11, L06, L08, L16, L22, L28, L29. P01 and L29 are inside limits already declared; L22 is a behaviour the spec does not define; L06 is spec-precision gap 2.

---

## Interactive UAT Results

Not performed: the Verifier has no interactive terminal. See "Not verified".

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ No terminal library; three escape sequences; one `fetch` |
| Surgical changes | ✅ Pre-existing files touched: `shared/derive.ts` (+439, the three existing functions unchanged but for the `answer` debt in `Owed`), `package.json` (script `tui`), `CLAUDE.md`, `README.md`, and one stale comment in `db.ts` (:48), which the Handoff had flagged |
| No scope creep | ✅ Nothing of the Out of Scope table is implemented; no `POST`; no read of `SQUAD_TOKEN_FILE` |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 56/64; 8 ACs with a clause not discriminated |
| Per-layer Coverage Expectation met | ⚠️ Derivation 1:1 with TUI-01..18; entry layer (`tui.ts`, `tui/probe.ts`) misses the seams listed above |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Tests without an AC id map to an edge case or an Assumption (`test/unit/derive-squad.test.ts:92`, `:126`, `:1197`; `test/unit/tui-keys.test.ts:145`, `:166`, `:180`; `test/unit/tui-thread.test.ts:187`) |
| Documented guidelines followed: `broker/CLAUDE.md`, `.specs/STATE.md` Handoff | ✅ |

Notes, none of them a failure:

- `tui/activity.ts:144-145` keeps a `// SPEC_DEVIATION` marker for the footer without the age, which the spec has since adopted (Assumptions, "Um só alerta de agente sem feature aberta"). The marker is stale.
- `tui/screens/down.ts:17-18` writes "reconexão automática a cada 1s" whatever `SQUAD_POLL_INTERVAL_MS` is; a `ponytail:` comment says so.
- `tui/feed.ts:107-109`: the derivation runs once per `usage` of the log on every new read; a `ponytail:` comment names the ceiling.

---

## Edge Cases

- [x] Unknown kind ignored in the feed and in the derivation - `test/unit/derive-squad.test.ts:1206` - `expect(squad([...WHOLE, unknown], NOW + 500000)).toEqual(squad(WHOLE, NOW + 500000))`; `test/unit/tui-feed.test.ts:215` (D32 killed)
- [x] `from` or `to` outside the known names → first three characters - `test/unit/tui-feed.test.ts:68-71`; `test/unit/tui-main.test.ts:133` - `"  14:19:51 rev → hum [task] …"` (F16 killed)
- [x] `summary` with a line break → first line only - `test/unit/tui-feed.test.ts:52` (F07 killed)
- [x] Title longer than line 0 → cut with `…`, the rest in place - `test/unit/tui-chrome.test.ts:35` (frame 26c; L01 killed)
- [x] Selection stays on its line when events arrive - `test/unit/tui-keys.test.ts:173-177`
- [x] Broker back on a new database (`last_seq` below the cursor) → log emptied, read from 0 - `test/unit/tui-reader.test.ts:73-75` - `expect(calls.map((c) => c.url)).toEqual([...after=0, ...after=3, ...after=0])` (R03, R08 killed)
- [x] `permission_decision` citing a `seq` that is not a request → ignored - `test/unit/derive-squad.test.ts:129` (D10 killed)
- [x] Two `peer_joined` without a `peer_left` → online - `test/unit/derive-squad.test.ts:93`
- [x] Resize → whole screen drawn again - `test/unit/tui-loop.test.ts:192` - `expect(written.startsWith(CLEAR)).toBe(true)` (T07 killed); the wiring to `stdout.on("resize")` (`tui.ts:178`) is not exercised

9/9.

---

## Gate Check

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit && bun test` (from `broker/`)
- **tsc**: exit 0
- **Tests, run 1**: 889 passed, 1 failed, 3 skipped (893 tests, 47 files, 57.5 s). The failure is `EVT-43: /ack confirms the pending deliveries of the caller among seqs, and no other` (`test/integration/routes.test.ts:268`, off by 1 ms), the pre-existing flaky test recorded in `tasks.md` and in the STATE Handoff; not in this diff.
- **Tests, run 2**: 890 passed, 0 failed, 3 skipped (893 tests, 47 files, 56.6 s). The gate holds on the rerun.
- **Test count before feature**: 540 (STATE Handoff, `main`)
- **Test count after feature**: 893
- **Delta**: +353 new tests; `git diff --name-status main...HEAD` shows no test file modified or deleted
- **Skipped tests**: `test/integration/cli.test.ts:65` (decoy host cannot be bound), `test/integration/cli.test.ts:100` and `test/unit/presence.test.ts:6` (Windows). All pre-existing and platform-bound
- **Failures**: none on the rerun

---

## Fix Plans

All are tests; no code change is required by this report except where a fix test shows one.

### Fix 1: the terminal sequences are asserted with the code's own constants (TUI-60; A06, A07)

- **Root cause**: `test/unit/tui-loop.test.ts:77`, `:84`, `:101` and `test/integration/tui.test.ts:102`, `:113` compare with `ENTER` / `LEAVE` imported from `tui/ansi.ts`.
- **Fix task**: assert the literals once - `ENTER` is `\x1b[?1049h\x1b[?25l`, `LEAVE` is `\x1b[?25h\x1b[?1049l` - in `test/unit/tui-ansi.test.ts`. Done when A06 and A07 fail it.
- **Priority**: Major

### Fix 2: the loop's wiring of `prev`, glyphs and interval (TUI-61, TUI-56, TUI-58; T13, T17, L29)

- **Root cause**: `test/unit/tui-loop.test.ts:68-71` always launches with `glyphs: new Map()` and never looks at how much a second drawing writes.
- **Fix task**: in `test/unit/tui-loop.test.ts`, (a) after the first drawing press `j` and assert that the text written since has the cursor positions of the changed lines only; (b) launch with `glyphs: new Map([["⚠", "!"]])` over the log of frame 10 and assert `!` and no `⚠` in the output; (c) launch with a long interval and assert that one read happened after a short wait. Done when T13, T17 and L29 fail.
- **Priority**: Major

### Fix 3: summary of the last feature (TUI-40; X02, X11)

- **Fix task**: in `test/unit/tui-detail.test.ts`, a log with two closed features (the summary is of the second) and a log whose only gate decision is a `comment` or a `reject` (no `aprovado` line). Done when X02 and X11 fail.
- **Priority**: Major

### Fix 4: open questions of the topology (TUI-45; L16)

- **Fix task**: in `test/unit/tui-topology.test.ts`, a log with an open question still held by the leader: it is neither in `perguntas abertas` nor in the count of the dev node. Done when L16 fails.
- **Priority**: Major

### Fix 5: order of the third line (TUI-35; S14)

- **Fix task**: in `test/unit/tui-main.test.ts`, an agent with a declared block and a later open request shows `x <tool> · …`. Done when S14 fails.
- **Priority**: Minor

### Fix 6: two Assumptions of the derivation (D17, D19)

- **Fix task**: in `test/unit/derive-squad.test.ts`, a plan whose tickets are all dropped gives `done`; a message to an agent before `feature_closed`, with no later event of the agent, is still "sem reação" after the feature closes. Done when D17 and D19 fail.
- **Priority**: Major

### Fix 7: boundaries (S23, L08, C03, L28)

- **Fix task**: a token total of 1600 draws `2k` (`test/unit/tui-chrome.test.ts`); exactly eight tickets draw six lines and `+2 tickets` (`test/unit/tui-main.test.ts`); a price table with one valid and one invalid model throws (`test/unit/tui-config.test.ts`); the chunk `3]]` on a plan of three tickets ends on the third (`test/unit/tui-loop.test.ts`). Done when the four mutants fail.
- **Priority**: Minor

### Fix 8: probe exit code (TUI-59; P01)

- **Fix task**: move the decision "0 if every width is 1, else 2" and the printed lines of `tui/probe.ts:59-66` into an exported pure function and unit-test it with a map that has a width of 2. Done when P01 fails.
- **Priority**: Minor

### Fix 9: the refusal of worker-1 in the log of 25a

- **Fix task**: write seq 470 as the broker would (`peer: "leader"`) and declare the line of frame 25a as a D1 deviation, or record in the spec that the event is kept as the prototype has it.
- **Priority**: Minor

### For the spec owner

Decide spec-precision gaps 1 to 4 (a resent `usage`; `◌ parado` on a concluded ticket; the legend lines about `g`, `x`, `enter responder` and "a TUI escreve três coisas"; the countdown after the deadline), then pin each with a test.

---

## Requirement Traceability Update

Proposed; `spec.md` was not edited by the Verifier.

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| TUI-01..TUI-34, TUI-36..TUI-39, TUI-41..TUI-44, TUI-46..TUI-55, TUI-58, TUI-62..TUI-64 (56) | Implementing | ✅ Verified |
| TUI-35, TUI-40, TUI-45, TUI-56, TUI-57, TUI-59, TUI-60, TUI-61 (8) | Implementing | ❌ Needs Fix (tests) |

---

## Not verified

- **A real interactive terminal.** Nothing ran on one beyond the start-up smoke check the author reported: the colours as drawn, the glyph widths as drawn by the font, the keys as a real terminal sends them, the resize event (`tui.ts:178`), and the probe's exit 0 / exit 2 (`tui/probe.ts:47-66`).
- **Real signals.** `SIGINT`, `SIGTERM` (`tui.ts:180`) and the `uncaughtException` handler (`tui.ts:181-185`) are tested only by calling `stop()` and by throwing inside the injected loop (`test/unit/tui-loop.test.ts:95-119`).
- **The 1000 ms default by wall clock.** Tested as a value (`test/unit/tui-config.test.ts:80`); every loop test runs at 5 ms or 50 ms.
- **Linux.** This verification ran on Windows only. The orchestrator reports 893 pass, 0 fail, 0 skip in a Linux container at `1f377d5`; not rerun here.
- **A real Claude Code session** feeding the screen (Out of Scope in the spec).
- **`question`, `answer`, `gate`, `gate_decision` written by the broker.** No route writes them before the Question and Gate slices; the derivation and the feed were only exercised with logs built by the tests.
- **Colour cell by cell.** By the spec's Assumptions the frames compare characters; colour and bold are asserted per requirement only.

---

## Summary

**Overall**: ❌ Not Ready - the implementation shows no contradiction with the spec; the tests leave 8 ACs and 4 Assumptions with a clause any wrong implementation would pass.

**Spec-anchored check**: 56/64 ACs matched the spec outcome | 4 spec-precision gaps
**Edge cases**: 9/9
**Sensor**: 186/210 mutations killed; 24 survived (6 equivalent, 18 not)
**Gate**: 890 passed, 0 failed, 3 skipped on the rerun (first run: 1 pre-existing flaky failure, `EVT-43`)

**What works**: the derivation and its precedence, AD-008 and the four readings of AD-011; the 41 frames as tests over an untouched extraction, with every deviation classified and the status deviations pinned to the approved table; the feed lines; the reader (cursor, failed read, wrong body, new database); the keys; the settings validated before the alternate screen; the terminal given back on quit, stop and error; TUI-55 asserted with recording fakes and against a real broker.

**Issues found**: 16 survivors outside the declared limits (Fix 1 to Fix 7; two of them, L06 and L22, wait for the spec owner), one probe clause without a test (Fix 8), one bent event in the frame logs (Fix 9), four points for the spec owner.

**Next steps**: route Fix 1 to Fix 9 to an implementer, then re-verify (iteration 1 of 3).

---

## Lessons distilled

Recorded with `lessons.py add` (feature `tui-leitura`): L-020 and L-001 recurred and were promoted to
confirmed (A06/A07; S14); new candidates L-037 to L-045 (loop wiring T13/T17/L29; settled
Assumptions D17/D19; excluded items X11/X02/L16; boundaries L08/S23; mixed collection C03; probe
exit code TUI-59; spec-precision gaps TUI-25, TUI-37, TUI-49). Not recorded: the stale
`// SPEC_DEVIATION` marker of `tui/activity.ts:144`, because the spec adopted that behaviour and
it is no longer a deviation; L22 and L28, which have no general rule beyond the ones above.
