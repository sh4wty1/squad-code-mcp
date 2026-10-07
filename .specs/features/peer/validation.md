# Peer Validation

**Verdict**: FAIL

**Round**: 3 of 3 (re-verification after `48909ae`)
**Date**: 2026-10-07
**Spec**: `.specs/features/peer/spec.md` (41 requirements; PEER-10 and PEER-21 revised after round 2)
**Diff range**: `10e92d3..HEAD` (HEAD = `48909ae`, branch `feat/peer`), all under `broker/`
**Verifier**: independent sub-agent (author ≠ verifier)

The gate is green (82 tests, `tsc` clean). Every gap of round 2 is closed: both round 2
survivors (N28, N15) are killed, `/register` refuses a non-positive `pid` and a wrong-typed
`git_root`, and the PEER-41 test carries its id. No code defect was found on any input the
spec names.

The verdict is still FAIL by the sensor rule, on two test gaps over behavior the spec states:

1. **PEER-21, "`id` ausente"**. The clause was added to the spec in this round and has no
   assertion. A broker that refuses a heartbeat without an `id` passes all 82 tests (M12).
2. **Cleanup order in `/register`** (Assumptions row "rodam a limpeza", and "sem gravar
   evento" of PEER-03, PEER-04, PEER-10). A broker that runs the cleanup before the three
   input checks, and so writes a `peer_left` on an `invalid_role` refusal, passes all 82
   tests (M11).

In both cases the code on HEAD is right (probed by hand); nothing guards it. Two more
mutants survive on behavior the spec does not define, and one probe found a 500 on an input
the spec does not name; they are listed and do not count against the verdict.

Test paths below are relative to `broker/`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `shared/config.ts` |
| T2 | ✅ Done | `db.ts` |
| T3 | ⚠️ Partial | cleanup order against the input refusals is not pinned (M11) |
| T4 | ⚠️ Partial | PEER-21 "id ausente" has no assertion (M12) |
| T5 | ✅ Done | - |
| T6 | ✅ Done | - |
| T7 | ✅ Done | - |
| T8 | ✅ Done | - |
| T9 | ✅ Done | round 1 gaps closed |
| T10 | ✅ Done | N28 and N15 killed; the T10 Done-when is met as written |

All checkboxes in `tasks.md` are ticked; none blocked.

---

## Round 2 gaps

| # | Round 2 gap | Status | Evidence |
| - | ----------- | ------ | -------- |
| 1 | PEER-16 listed only by `mother` (mutant N28) | ✅ Closed | `test/unit/presence.test.ts:129-141` lists as `worker-1` and asserts the exact five items; N28 re-applied at `peers.ts:178` is killed by that test |
| 2 | Second heartbeat (mutant N15) | ✅ Closed | `test/unit/presence.test.ts:114-117` - second heartbeat at `NOW + 30000`, `expect(b.rows()[0]!.registered_at).toBe(NOW)`; N15 re-applied at `peers.ts:167` is killed by that test |
| 3 | Spec: wrong-typed register inputs (`pid` ≤ 0 accepted, `git_root` object answered 500) | ✅ Closed | PEER-10 and its Assumptions row reworded; `peers.ts:97-108`; `test/unit/register.test.ts:143-144,217-218,223`. Hand probe on HEAD: `pid` 0, -5, 1.5, `"12"`, `null`, `true` and `git_root` `{a:1}`, `7`, `false`, `[]` all answer 200 `missing_field` with a hint and write nothing. M1, M2, M3, M4 killed |
| 4 | Spec: heartbeat with an unknown id | ⚠️ Closed for "desconhecido", open for "ausente" | PEER-21 reworded; `test/unit/presence.test.ts:120-127`, `test/integration/broker.test.ts:75-77` (unknown id). No assertion sends a body without `id` (M12 survives) |
| 5 | PEER-41 test titled `PEER-09` | ✅ Closed | `test/unit/register.test.ts:181` - `test("PEER-41: a refused registration leaves the earlier registration of the pid in place"` |

No assertion was removed or weakened by `48909ae`: the diff of the three test files has no
deleted assertion line; the only changed lines are two test titles (`register.test.ts:140`,
`:181`), everything else is added.

---

## Spec-Anchored Acceptance Criteria

### P1: Registro com nome e papel

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-01 valid register | row with name, role, pid, cwd, git_root, `registered_at == last_seen` epoch ms; `{ id }` non-empty text | `test/unit/register.test.ts:20-33` - `expect(result.id.length).toBeGreaterThan(0)`, `expect(b.rows()).toEqual([{ id: result.id, name: "mother", role: "mother", pid: 100, cwd: "/repo/main", git_root: "/repo/.git", registered_at: NOW, last_seen: NOW }])`; `test/integration/broker.test.ts:42` - `expect(Object.keys(res.json)).toEqual(["id"])` | ✅ PASS |
| PEER-02 `peer_joined`, same transaction | kind, `from_name`/`role_from` `broker`, `to_name` null, `feature_id` null, `summary` `""`, data `{peer, role}`; peer not stored if the event fails | `test/unit/register.test.ts:47-54` - seven field assertions incl. `expect(event.data).toEqual({ peer: "worker-2", role: "worker" })`; `:195-196` - `expect(() => b.join("mother", "mother", 100)).toThrow()`, `expect(b.rows()).toEqual([])` | ✅ PASS |
| PEER-03 invalid role | `invalid_role`, hint, nothing written | `test/unit/register.test.ts:59-60` via `expectRefusal` (`:10-14` - `expect(result.error).toBe(error)`, `expect(result.hint.length).toBeGreaterThan(0)`, `expect({ peers, events }).toEqual(before)`) | ✅ PASS (with no dead peer present; see M11) |
| PEER-04 invalid name | `invalid_name`, nothing written | `test/unit/register.test.ts:65-67,72-74` - `expectRefusal(..., "invalid_name")` | ✅ PASS (same note) |
| PEER-05 single role taken | `role_taken`, nothing written | `test/unit/register.test.ts:81` - `expectRefusal(b, () => b.join(role, role, 101), "role_taken")` x3 | ✅ PASS (M25 killed) |
| PEER-06 three live workers | `worker_limit`, nothing written | `test/unit/register.test.ts:90` - `expectRefusal(b, () => b.join("worker-1", "worker", 103), "worker_limit")` | ✅ PASS |
| PEER-07 name of a live peer | `name_taken`, nothing written | `test/unit/register.test.ts:96` - `expectRefusal(..., "name_taken")` | ✅ PASS (M24 killed) |
| PEER-08 name of a dead peer | `peer_left {peer, reason:"died"}`, then register, new `id` differs | `test/unit/register.test.ts:105-111` - `expect(second.id).not.toBe(first.id)`; events `toEqual([joined, ["peer_left", { peer: "mother", reason: "died" }], joined])` | ✅ PASS (M28 killed) |
| PEER-09 same PID, accepted | earlier registration leaves with `peer_left` `died` before the `peer_joined`; it does not count as holder of name or role | `test/unit/register.test.ts:131-137` (leader→judge, event order); `:170-178` (mother→mother on pid 100) - `expect(second.id).not.toBe(first.id)`, `expect(b.rows().map((p) => p.id)).toEqual([second.id])` | ✅ PASS (R-P7b, M9 killed) |
| PEER-41 same PID, refused | earlier registration kept, no event | `test/unit/register.test.ts:185-189` - `expectRefusal(b, () => b.join("mother", "mother", 100), "role_taken")` and `expect(rows).toEqual([["mother", 101], ["worker-1", 100]])` | ✅ PASS |
| PEER-10 pid not a positive integer / cwd not non-empty text / git_root neither text nor null | `missing_field`, hint, nothing written | `test/unit/register.test.ts:143-147` - `expectRefusal(...)` for pid `0`, `-1`, `"100"`, `1.5`, absent; `:153-154` - cwd `""`, absent; `:217-218` - git_root `{ a: 1 }`, `7`; boundary `:223` - `expect(b.join("mother", "mother", 1)).toHaveProperty("id")` | ✅ PASS (M1, M2, M3, M4, M7, M8 killed). An absent `git_root` key is not pinned either way, see spec-precision gap 2 |
| PEER-37 refusal is HTTP 200 with hint | status 200, `hint` non-empty | `test/integration/broker.test.ts:54-58` - `expect(res.status).toBe(200)`, `expect(res.json.hint.length).toBeGreaterThan(0)`; `:97-100` (`unknown_peer`); `:184-188` (`missing_field`) | ✅ PASS |
| PEER-39 body is not a JSON object | `{ ok:false, error:"missing_field", hint }`, nothing written, four routes, five bodies (none, `xx`, `null`, `[]`, `"id"`) | `test/integration/broker.test.ts:184-190` - `expect(res.status).toBe(200)`, `expect(json.error).toBe("missing_field")`, `expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] })` | ✅ PASS (M14, M15 killed) |

### P1: Presença na saída

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-11 unregister known id | row deleted, `peer_left` from `broker`, data `{peer, reason:"unregistered"}`, `{ ok:true }` | `test/unit/presence.test.ts:9-16` - `expect(b.rows()).toEqual([])`, `expect(last.from_name).toBe("broker")`, `expect(last.data).toEqual({ peer: "leader", reason: "unregistered" })`; `test/integration/broker.test.ts:108` - `expect(res.json).toEqual({ ok: true })` | ✅ PASS |
| PEER-12 unregister unknown id | `{ ok:true }`, no event | `test/unit/presence.test.ts:24` - `expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"])`; `test/integration/broker.test.ts:111,114-117` | ✅ PASS |
| PEER-13 cleanup, dead PID | row deleted, `peer_left {peer, reason:"died"}` | `test/unit/presence.test.ts:32-37` - `expect(last.data).toEqual({ peer: "judge", reason: "died" })`; real dead PID `test/integration/broker.test.ts:164-168` | ✅ PASS |
| PEER-14 cleanup, live PID | row kept, no event | `test/unit/presence.test.ts:58-59` - `expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"])` | ✅ PASS |
| PEER-15 seq and ts | `seq` integer above every earlier one, `ts` epoch ms | `test/unit/db.test.ts:13-15` - `expect(second).toBeGreaterThan(first)`, `expect(third).toBeGreaterThan(second)`; `:24` - `expect(row.ts).toBe(1791331200123)` | ✅ PASS |
| PEER-38 cleanup on start and every 30 s | runs at startup; period 30 s | `test/integration/broker.test.ts:151-156` (startup); `:160-168` (interval, override 100 ms); `test/unit/config.test.ts:34-35` - `expect(cleanupIntervalMs({})).toBe(30000)` | ✅ PASS (M29 killed) |

### P1: Listagem sem credencial

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-16 list as a registered peer | the other five names for any caller, `{name, role, online}`, online only for a registered live PID | `test/unit/presence.test.ts:67-73` - as `mother`, `expect(b.peers.listPeers(mother.id)).toEqual([...five items...])`; `:134-140` - as `worker-1`: `mother`, `leader` offline, `judge` online, `worker-2` offline, `worker-3` online; `:82` - offline for a dead PID; `test/integration/broker.test.ts:87-93` | ✅ PASS (N28, M21 killed) |
| PEER-17 no other field | keys exactly `name`, `role`, `online` | `test/unit/presence.test.ts:91` - `expect(Object.keys(item).sort()).toEqual(["name", "online", "role"])`; `:94-95` - `expect(text).not.toContain(leader.id)` | ✅ PASS |
| PEER-18 unknown id | `{ ok:false, error:"unknown_peer", hint }` | `test/unit/presence.test.ts:102-104`; `test/integration/broker.test.ts:97-100` - `expect(unknown.json.error).toBe("unknown_peer")` | ✅ PASS |

### P1: Broker próprio e rodando no Windows

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-19 default DB | `<home>/.squad-code-mcp.db`, from the system, not `HOME` | `test/unit/config.test.ts:7,11` - `expect(dbPath({ HOME: "/not/the/home" })).toBe(join(homedir(), ".squad-code-mcp.db"))`; `test/integration/broker.test.ts:134` - `expect(existsSync(join(home, ".squad-code-mcp.db"))).toBe(true)` | ✅ PASS |
| PEER-20 port 7900, answers on `127.0.0.1` only | default port 7900; no answer on the machine's other addresses | `test/unit/config.test.ts:19-20` - `expect(port({})).toBe(7900)`; `test/integration/broker.test.ts:196,211` - `expect((await fetch("http://127.0.0.1:<port>/health")).status).toBe(200)`, `expect(reached.filter((address) => address !== null)).toEqual([])` | ✅ PASS (M16 killed) |
| PEER-21 heartbeat | known id: `last_seen` = current epoch ms, `registered_at` kept, `{ ok:true }`; unknown or absent id: `{ ok:true }`, no peer changed | known: `test/unit/presence.test.ts:112-113,116-117` - `expect(b.rows()[0]!.last_seen).toBe(NOW + 30000)`, `expect(b.rows()[0]!.registered_at).toBe(NOW)`; `test/integration/broker.test.ts:68-73`. Unknown: `test/unit/presence.test.ts:125-126` - `expect(b.rows().map((p) => [p.name, p.last_seen])).toEqual([["mother", NOW]])`; `test/integration/broker.test.ts:76-77` - `expect(unknown.json).toEqual({ ok: true })`. Absent: no evidence | ❌ GAP (partial): "id ausente" has no assertion; M12 survived. N15, M13, M22 killed |
| PEER-22 health | `{ status:"ok", peers:<n> }` | `test/integration/broker.test.ts:33,35` - `toEqual({ status: "ok", peers: 0 })`, `toEqual({ status: "ok", peers: 1 })` | ✅ PASS |
| PEER-23 POST to any other route | status 404, with any body or none | `test/integration/broker.test.ts:124` - `expect(res.status).toBe(404)` for four paths with a JSON body; `:175` - same with no body and with `xx` | ✅ PASS |
| PEER-34 broker started detached by the server | detached, `/health` keeps answering after the server exits; path with a space | `test/integration/server.test.ts:252` - `expect(await isUp(url)).toBe(true)`; `:265` - same after the server pid is gone | ✅ PASS. "Same executable" is an accepted assumption, see "Not verified" |
| PEER-35 `kill-broker` | broker process ends, `/health` stops answering | `test/integration/cli.test.ts:39-40` - `expect(proc.killed \|\| proc.exitCode !== null).toBe(true)`, `expect(await isUp(url)).toBe(false)` | ✅ PASS |
| PEER-36 `status` | prints `Broker: ok (<n> peer(s) registered)` | `test/integration/cli.test.ts:27,29` - `toContain("Broker: ok (0 peer(s) registered)")`, `toContain("Broker: ok (1 peer(s) registered)")` | ✅ PASS |

### P1: Repositório comum entre worktrees

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-24 worktree | absolute git common dir, equal to the main checkout's | `test/unit/git.test.ts:24-26` - `expect(isAbsolute(fromMain!)).toBe(true)`, `expect(fromMain!.endsWith("/main/.git")).toBe(true)`, `expect(fromWorktree).toBe(fromMain)` | ✅ PASS |
| PEER-25 outside a repository | `git_root` null | `test/unit/git.test.ts:35` - `expect(await getGitRoot(dir)).toBeNull()` | ✅ PASS |

### P1: Registro que prova o canal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-26 `SQUAD_ROLE` absent or empty | zero tools, no ping, no registration | `test/integration/server.test.ts:84,86,88` - `expect(await session.toolNames()).toEqual([])`, `expect(session.pings()).toEqual([])`, `expect(await isUp(url)).toBe(false)` | ✅ PASS for "absent". "Empty" has no assertion of its own, see "Not verified" |
| PEER-27 ping | channel method, integer 100000..999999 drawn in the process, in the text and in `meta.number`, only `ready`, not registered | `test/integration/server.test.ts:96-103` - `expect(ping.method).toBe("notifications/claude/channel")`, `toBeGreaterThanOrEqual(100000)`, `toBeLessThanOrEqual(999999)`, `expect(ping.params.meta.number).toBe(String(number))`, `expect(ping.params.content).toContain(String(number))`, `toEqual(["ready"])`, `toEqual({ events: [], peers: [] })`; `:275` - `expect(numbers.size).toBeGreaterThan(1)` over three processes | ✅ PASS |
| PEER-28 ping repeats | same number, every 10 s or `SQUAD_PING_INTERVAL_MS` | `test/integration/server.test.ts:110-114` - four pings, `expect(numbers.size).toBe(1)`; `:127` - one ping after 1.5 s with no override; `test/unit/config.test.ts:29-30` - `expect(pingIntervalMs({})).toBe(10000)` | ✅ PASS (M17 killed) |
| PEER-29 wrong number | error, not registered, only `ready` | `test/integration/server.test.ts:135-137` - `expect(result.isError).toBe(true)`, `toEqual(["ready"])`, `toEqual({ events: [], peers: [] })`; `:139` ping goes on | ✅ PASS |
| PEER-30 right number, accepted | registers pid, cwd, git_root, name, role; ping stops; `tools/list_changed`; `list_peers` without `ready` | `test/integration/server.test.ts:150-155` - `expect(peers[0]!.pid).toBe(session.transport.pid!)`, `.cwd).toBe(BROKER_DIR)`, `.git_root).toBe(await getGitRoot(BROKER_DIR))`; `:157-160` list_changed; `:161` - `toEqual(["list_peers"])`; `:165` - `expect(session.pings().length).toBe(sent)` | ✅ PASS (M19 killed) |
| PEER-31 right number, refused | error with broker `error` and `hint`, only `ready`, ping stops | `test/integration/server.test.ts:176-179` - `toContain("role_taken")`, `toContain(refusal.hint)`, `toEqual(["ready"])`; `:184` - `expect(session.pings().length).toBe(sent)` | ✅ PASS |
| PEER-32 `list_peers` tool | text with name, role, online/offline of the others, no `id` | `test/integration/server.test.ts:199-207` - `expect(lines).toContain("leader (leader): online")`, four offline lines, `not.toContain(leader.id)`, `not.toContain(mother.id)` | ✅ PASS |
| PEER-33 stdin closes | `/unregister` | `test/integration/server.test.ts:220-224` - `expect(peers).toEqual([])`, events `toEqual([joined, ["peer_left", { peer: "judge", reason: "unregistered" }]])` after `client.close()` | ✅ PASS (M20 killed) |
| PEER-40 unlisted tool | error `Unknown tool`, broker not called | `test/integration/server.test.ts:288-289` (no role: `ready`, `list_peers`), `:293-294` (`list_peers` before `ready`, DB empty), `:297-298` - `expect(await call(session, "ready", number)).toContain("Unknown tool: ready")`, `expect(readDb(broker.dbFile).events).toHaveLength(1)` | ✅ PASS |

**Status**: ❌ Gaps present. 40/41 ACs match the spec outcome with evidence; 1 gap (PEER-21, clause "ausente"); 1 spec'd Assumptions-row behavior without a test (cleanup order in `/register`); 2 spec-precision gaps.

### Spec-precision gaps

1. **`id` of a non-scalar type on `/heartbeat` answers 500.** Observed on HEAD: `POST /heartbeat` with `{"id":{"a":1}}` or `{"id":["x"]}` answers **500** `{"error":"Binding expected string, TypedArray, boolean, number, bigint or null"}`, no `hint`, nothing written. `{}`, `{"id":null}` and `{"id":5}` answer `{ ok: true }`. The same bodies on `/unregister` answer `{ ok: true }` and on `/list-peers` answer `unknown_peer`. PEER-21 says "id desconhecido ou ausente" answers `{ ok: true }`; it does not say whether an `id` that is not text is an unknown id. Read strictly it is one, and then this is a PEER-21 violation at `peers.ts:167` / `broker.ts:59`; it is the same class as the `git_root` 500 that round 2 reported and `48909ae` fixed for `/register` only. Left to the spec owner; not counted against the verdict.
2. **`git_root` key absent in `/register`.** `peers.ts:102` uses `!= null`, so a body without `git_root` registers and stores `NULL` (hand probe: 200 `{ id }`). PEER-10 refuses a `git_root` that "não é texto nem nulo"; the spec does not say whether an absent key is null. No test sends a body without the key (M5 survives).

---

## Discrimination Sensor

Scratch: temporary git worktree of HEAD outside the repo (`scratchpad/sensor3`), `node_modules` by junction. One mutation at a time, the full `bun test` after each, `git checkout -- .` and a clean `git status --porcelain` of the scratch confirmed after every mutant. Line numbers are HEAD.

### Round 2 survivors, re-applied

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| N28 | `peers.ts:178` | `ROSTER.filter((r) => r.name !== caller.name)` → `r.role !== caller.role` | ✅ Killed (`presence.test.ts:129`) |
| N15 | `peers.ts:167` | heartbeat `SET last_seen = ?` → `SET last_seen = ?, registered_at = last_seen` | ✅ Killed (`presence.test.ts:107`) |
| R-P7b | `peers.ts:130` | dropped `AND pid != ?` (round 1 survivor, re-checked because `peers.ts` changed) | ✅ Killed (`register.test.ts:167`) |

### New mutations

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `peers.ts:99` | removed `body.pid <= 0` | ✅ Killed (PEER-10 pid) |
| M2 | `peers.ts:99` | `body.pid <= 0` → `body.pid < 0` | ✅ Killed (PEER-10 pid) |
| M3 | `peers.ts:99` | `body.pid <= 0` → `body.pid <= 1` | ✅ Killed (`register.test.ts:221`) |
| M4 | `peers.ts:102` | removed the `git_root` type check | ✅ Killed (PEER-10 git_root) |
| M5 | `peers.ts:102` | `body.git_root != null` → `!== null` (an absent `git_root` is refused) | ❌ Survived. Behavior the spec does not define (spec-precision gap 2). Not counted |
| M7 | `peers.ts:100` | removed `typeof body.cwd !== "string"` | ✅ Killed (PEER-10 cwd) |
| M8 | `peers.ts:101` | removed `body.cwd === ""` | ✅ Killed (PEER-10 cwd) |
| M9 | `peers.ts:149` | removed `if (previous) remove(previous, "died")` | ✅ Killed (PEER-09 x2) |
| M11 | `peers.ts:110` | `cleanStale()` also run before `namesOf(body.role)`, i.e. before the `invalid_role` and `invalid_name` checks | ❌ Survived → Fix 2 |
| M12 | `broker.ts:59` | `/heartbeat` answers `{ ok:false, error:"missing_field" }` when `body.id` is not a string (absent included) | ❌ Survived → Fix 1 |
| M13 | `broker.ts:18` | `/heartbeat` dropped from `ROUTES` | ✅ Killed (PEER-21, PEER-39) |
| M14 | `broker.ts:52` | non-object refusal `error` `missing_field` → `invalid_body` | ✅ Killed (PEER-39 x4) |
| M15 | `broker.ts:51` | dropped `typeof body !== "object"` from the body check | ✅ Killed (PEER-39 x3) |
| M16 | `shared/config.ts:10` | default port `"7900"` → `"7901"` | ✅ Killed (PEER-20 unit) |
| M17 | `shared/config.ts:19` | `pingIntervalMs` reads `SQUAD_CLEANUP_INTERVAL_MS` | ✅ Killed (PEER-28 x2, PEER-29) |
| M19 | `server.ts:234` | registers `git_root: null` | ✅ Killed (PEER-30) |
| M20 | `server.ts:305` | `if (myId)` → `if (!myId)` in the exit cleanup | ✅ Killed (PEER-33) |
| M21 | `peers.ts:172` | no cleanup inside `listPeers` | ✅ Killed (PEER-16 dead pid) |
| M22 | `peers.ts:167` | heartbeat `WHERE id = ?` → `WHERE id = ? OR 1` | ✅ Killed (`presence.test.ts:120`) |
| M24 | `peers.ts:141` | `name_taken` check disabled | ✅ Killed (PEER-07) |
| M25 | `peers.ts:133` | `sameRole.length >= names.length` → `>` | ✅ Killed (PEER-05 x3, PEER-06, PEER-41, PEER-31) |
| M27 | `broker.ts:64` | `/unregister` answers `missing_field` when `body.id` is not a string | ❌ Survived. PEER-12 names an unknown id (tested with a string); an absent or non-text id on `/unregister` is not in the spec. Not counted |
| M28 | `peers.ts:125` | no cleanup inside `register` | ✅ Killed (PEER-08, two edge cases) |
| M29 | `shared/config.ts:24` | cleanup interval multiplied by 100 | ✅ Killed (PEER-38 x2) |

**Sensor depth**: P0-full by manual fault injection, 27 mutations (3 re-applied, 24 new)
**Result**: 23/27 killed, 4 survived (2 on spec'd behavior: M11, M12; 2 on behavior the spec does not define: M5, M27) - FAIL ❌

Isolation: `git status --porcelain` of the real tree before the sensor was `?? .specs/LESSONS.md`, `?? .specs/features/peer/validation.md`, `?? .specs/lessons.json`, and is identical after (compared with `diff`). The junction was removed with `rmdir` before `git worktree remove --force` and `git worktree prune`; `broker/node_modules` is intact (95 entries); `git worktree list` shows only the real tree. No `bun.exe` is running; no mutant of this round left a detached broker behind. `C:\Users\lucas\.squad-code-mcp.db` does not exist. The hand probes ran a broker with `SQUAD_DB` in a temp directory.

---

## History

| Round | HEAD | Gate | Sensor | Verdict | What failed | Fixed by |
| ----- | ---- | ---- | ------ | ------- | ----------- | -------- |
| 1 | `7dbf3c5` / `ced9ed9` | 63 passed | 6 survivors | FAIL | PEER-09 ordering, PEER-20 bind address, PEER-23 answering 500 without a body, PEER-27 number range, PEER-28 and PEER-38 defaults, PEER-33 signals, unlisted-tool guard, three spec contradictions or omissions | `ab6580b` (all 14 items closed, confirmed in round 2) |
| 2 | `ab6580b` | 78 passed | 41/43 killed | FAIL | PEER-16 listed only by `mother` (N28); second heartbeat (N15, minor); register input types not in the spec; PEER-41 test titled `PEER-09` | `48909ae` (all closed, see "Round 2 gaps"; "id ausente" of the reworded PEER-21 left without a test) |
| 3 | `48909ae` | 82 passed | 23/27 killed | FAIL | PEER-21 "id ausente" untested (M12); cleanup order in `/register` untested (M11) | open - Fix 1 and Fix 2 |

This is the third and last fix→re-verify round: the remaining gaps go to the user, not to another automatic loop.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`48909ae` touches `peers.ts:97-108` and three test files only) |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ❌ PEER-21 clause "id ausente" has no asserted value |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ❌ `peers.ts` "todos os ramos; todo edge case": no test has a dead peer present during a `missing_field`, `invalid_role` or `invalid_name` refusal |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (`db.test.ts:27,34` map to T2 Done-when; `register.test.ts:157` to the refusal-order assumption; `:199` to the fifth edge case; `:221` to the PEER-10 boundary) |
| Documented guidelines followed: none - strong defaults applied | ✅ |

Notes that are not gaps: the `default:` branches at `broker.ts:66-67` and `server.ts:272-273` are unreachable. `ROLE_TOOLS` (`server.ts:171-176`) has four identical entries; it is the ADR-010 seam. `parseInt` of `SQUAD_PORT` and of the two intervals has no NaN guard; the spec does not ask for one. A `pid` beyond the range of a real PID (probe: `1e20`) is a positive integer and registers; it is removed as `died` by the next cleanup. An empty-string `git_root` is text and registers. No `.skip`, `.only`, `.todo` or `SPEC_DEVIATION` in the diff.

---

## Edge Cases

- [x] Valid role with the name of another role → `invalid_name`: `test/unit/register.test.ts:72-74`
- [x] Three workers, one dead, a new worker takes the dead name: `test/unit/register.test.ts:120-125` - `expect(rows).toEqual([["worker-1", 100], ["worker-2", 103], ["worker-3", 102]])`
- [x] A refusal with no dead peer leaves `peers` and `events` unchanged: `test/unit/register.test.ts:14` in every `expectRefusal`, including the same-PID case at `:185`
- [x] Repository path with a space still starts the broker: `test/integration/server.test.ts:230-252,265`
- [x] A refused register keeps the `peer_left` of a dead peer found by the cleanup: `test/unit/register.test.ts:204-211` - `expect(result.error).toBe("role_taken")`, events end with `["peer_left", { peer: "worker-1", reason: "died" }]`
- [x] The event write fails → the peer is not stored: `test/unit/register.test.ts:195-196`
- [ ] Not a listed edge case, but stated in the Assumptions table: a `missing_field`, `invalid_role` or `invalid_name` refusal does not run the cleanup. No test (M11). The code is right: hand probe with a dead `mother` row, three refused registers, `peers` and `events` counts stay `[1, 1]`.

---

## Gate Check

- **Gate command**: `bun x tsc --noEmit && bun test` (from `broker/`, Bun 1.3.14)
- **Result**: `tsc` exit 0; 82 passed, 0 failed, 0 skipped, 415 `expect()` calls, 8 files, 16.0 s
- **Test count before feature**: 0 (`10e92d3` has no tests)
- **Test count after feature**: 82 (63 at round 1, 78 at round 2)
- **Delta**: +82 new tests (+4 since round 2)
- **Skipped tests**: none
- **Failures**: none

---

## Not verified

- `SIGINT`/`SIGTERM` in the MCP server (`server.ts:316-317`): accepted assumption, not deliverable on Windows.
- PEER-34 "same executable" (`server.ts:78`, `process.execPath`): accepted assumption; needs a machine with another `bun` on `PATH`.
- Survival of the broker when a real terminal window closes: accepted assumption.
- PEER-26 with `SQUAD_ROLE` set to an empty string: no assertion (the test helper drops empty variables, `test/integration/helpers.ts:54`). By reading, absent and empty are the same value from `server.ts:43` on.
- The heartbeat timer of the MCP server (`server.ts:247-253`, 15 s): no test waits for it; not a requirement of this slice.
- Non-Windows behavior: the `lsof` branch (`cli.ts:43-47`), `EPERM` in `pidAlive` (`peers.ts:74`), `os.homedir()` on POSIX.
- The PEER-20 integration assertion is vacuous on a machine with no non-internal IPv4 address.

---

## Fix Plans

### Fix 1: PEER-21 "id ausente" has no test (mutant M12)

- **Root cause**: `48909ae` added "com `id` desconhecido ou ausente" to PEER-21 and a test for the unknown id only (`presence.test.ts:120`, `broker.test.ts:75-77`). No test posts `/heartbeat` with a body that has no `id`.
- **Fix task**: in `test/integration/broker.test.ts`, inside the PEER-21 test, post `/heartbeat` with `{}` and assert status 200, `toEqual({ ok: true })`, and that `last_seen` of the registered peer did not change. Done when M12 (`broker.ts:59`, refuse when `typeof body.id !== "string"`) dies.
- **Priority**: Major by the rule (spec'd clause with no evidence); the code is right today.

### Fix 2: cleanup order in `/register` is not pinned (mutant M11)

- **Root cause**: every refusal test for `missing_field`, `invalid_role` and `invalid_name` runs with no dead peer in the table, so cleaning before or after those checks gives the same counts.
- **Fix task**: in `test/unit/register.test.ts`, register a peer, mark its pid dead, then call `expectRefusal` for one `missing_field`, one `invalid_role` and one `invalid_name` body (counts unchanged, the dead row still there). Done when M11 (`peers.ts:110`, `cleanStale()` before `namesOf`) dies.
- **Priority**: Major by the rule; the code is right today.

### Spec decision: `id` that is not text, and absent `git_root`

- **Fix task**: state in `spec.md` what `/heartbeat` answers for an `id` that is an object or a list (today 500 from `peers.ts:167`), and whether an absent `git_root` is null (today accepted) or a `missing_field`; then pin each with one assertion. The smallest code change for the first is a `typeof id === "string"` guard in `heartbeat`.
- **Priority**: Minor

---

## Requirement Traceability Update

Not applied to `spec.md` (the Verifier writes only this report). Proposed:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PEER-01 to PEER-20, PEER-22 to PEER-41 | Implementing | ✅ Verified |
| PEER-21 | Implementing | ❌ Needs Fix (test for "id ausente") |

---

## Summary

**Overall**: ❌ Not Ready (two tests away)

**Spec-anchored check**: 40/41 ACs matched spec outcome | 1 gap (PEER-21 "ausente") | 2 spec-precision gaps
**Sensor**: 23/27 mutations killed, 4 survived (M11 and M12 on spec'd behavior; M5 and M27 on undefined behavior)
**Gate**: 82 passed, 0 failed, `tsc` clean

**What works**: everything rounds 1 and 2 reported as working, plus: the listing asked by a worker, `registered_at` kept across heartbeats, a heartbeat with an unknown id changing nothing, `/register` refusing a `pid` that is not a positive integer and a `git_root` that is neither text nor null (no more 500 there).

**Issues found**: PEER-21 "id ausente" not asserted (Fix 1); cleanup order against the input refusals not asserted (Fix 2); `/heartbeat` answers 500 for an `id` that is an object or a list (spec decision).

**Next steps**: round 3 was the last automatic round - escalate to the user with Fix 1, Fix 2 and the spec decision.
