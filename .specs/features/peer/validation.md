# Peer Validation

**Verdict**: FAIL

**Round**: 4 (requested by the repo owner after three FAIL rounds; re-verification after `2f50812`)
**Date**: 2026-10-07
**Spec**: `.specs/features/peer/spec.md` (41 requirements; PEER-12, PEER-18, PEER-21, two assumption rows and one edge case revised after round 3)
**Diff range**: `10e92d3..HEAD` (HEAD = `ff009d0`, branch `feat/peer`), code under `broker/`; the last code commit is `2f50812`
**Verifier**: independent sub-agent (author ≠ verifier)

The gate is green (85 tests, `tsc` clean). Every gap of round 3 is closed: the four round 3
survivors (M12, M11, M5, M27) are all killed, the `/heartbeat` 500 is gone, and the spec now
states what an absent or non-text `id` and an absent `git_root` mean. A hand probe of the real
broker with 346 checks (every JSON type on every field of the four POST routes) found **no 5xx
and no answer that contradicts the spec**. No code defect was found.

The verdict is still FAIL by the sensor rule, on two test gaps over behavior the spec states.
Both are siblings of gaps closed earlier for a neighboring field:

1. **PEER-10, "`cwd` não é texto"**. The only "not text" `cwd` any test sends is an absent one.
   A broker that refuses only an absent or null `cwd` passes all 85 tests (X5); it stores a
   number as `cwd` and answers **500** for an object or a list. Round 2 pinned this class for
   `git_root` (`{ a: 1 }`, `7`) and not for `cwd`.
2. **PEER-18 / PEER-37, `hint` on an absent or non-text `id`**. The new test of `2f50812` asserts
   status, `ok` and `error` for that input, not `hint`. A broker that answers
   `{ ok: false, error: "unknown_peer" }` with no hint for it passes all 85 tests (X1).

In both cases the code on HEAD is right (probed by hand); nothing guards it. Each closes with
one or two assertion lines.

Test paths below are relative to `broker/`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `shared/config.ts` |
| T2 | ✅ Done | `db.ts` |
| T3 | ⚠️ Partial | PEER-10: a wrong-typed `cwd` is not pinned (X5) |
| T4 | ✅ Done | - |
| T5 | ✅ Done | - |
| T6 | ✅ Done | - |
| T7 | ✅ Done | - |
| T8 | ✅ Done | - |
| T9 | ✅ Done | - |
| T10 | ✅ Done | - |
| T11 | ⚠️ Partial | M11 and M12 have tests (Done-when met as written); the `hint` of the non-text `id` refusal is not asserted (X1). The third checkbox is this verification |

---

## Round 3 gaps

| # | Round 3 gap | Status | Evidence |
| - | ----------- | ------ | -------- |
| 1 | PEER-21 "id ausente" had no assertion (M12) | ✅ Closed | `test/integration/broker.test.ts:218-221` - bodies `{}`, `{ id: null }`, `{ id: 5 }`, `{ id: { a: 1 } }`, `{ id: ["x"] }`: `expect(heartbeat.status).toBe(200)`, `expect(heartbeat.json).toEqual({ ok: true })`; `:230` - `expect(readDb(broker.dbFile)).toEqual(before)`. M12 re-applied at `broker.ts:62` is killed by that test |
| 2 | Cleanup order in `/register` not pinned (M11) | ✅ Closed | `test/unit/register.test.ts:226-235` - a dead `worker-1` row, then `expectRefusal` for `missing_field`, `invalid_role`, `invalid_name`, `expect(b.rows().map((p) => p.name)).toEqual(["worker-1"])`, `expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"])`. M11 re-applied at `peers.ts:110` is killed; so is the variant with the cleanup between the two checks (S3). The spec now lists it as an edge case |
| 3 | `/heartbeat` answered 500 for an `id` object or list (spec-precision gap 1) | ✅ Closed | Spec: PEER-12, PEER-18, PEER-21 and a new Assumptions row. Code: `broker.ts:56`. Test: `broker.test.ts:214-231`. Hand probe: 15 value types plus absent on the three routes, all 200 with the spec answer, database unchanged. S2 (guard removed) killed |
| 4 | Absent `git_root` undefined by the spec (spec-precision gap 2, M5) | ✅ Closed | New Assumptions row "vale como nulo"; `test/unit/register.test.ts:237-243` - `expect(result).toHaveProperty("id")`, `expect(b.rows()[0]!.git_root).toBeNull()`. M5 re-applied at `peers.ts:102` is killed |
| 5 | Absent or non-text `id` on `/unregister` undefined by the spec (M27) | ✅ Closed | PEER-12 reworded; `broker.test.ts:222-224,230`. M27 re-applied at `broker.ts:67` is killed |

No assertion was removed or weakened by `2f50812`: `git diff 48909ae 2f50812 -- broker/test` has
zero deleted lines; the two test files only gain three tests (82 → 85). In `broker.ts` the only
changed lines are the three `(body as { id: string }).id` reads, replaced by the guarded `id`.

---

## Hand probe of the real broker (step 3)

A real `broker.ts` on a free port with `SQUAD_DB` in a temp directory; 346 checks; script kept
outside the repo.

| Area | Inputs | Result |
| ---- | ------ | ------ |
| `id` on `/heartbeat`, `/unregister`, `/list-peers` | number, 0, negative, float, null, object, list, empty list, true, false, `""`, 1 MB string, nested object, string with NUL, lone surrogate, absent; also `ID`/`Id`/`peer_id` keys, `[validId]`, the valid id upper-cased or with a space, SQL-looking text, `__proto__`, duplicate keys | all 200; `{ ok: true }` on the first two, `unknown_peer` with a hint on the listing; database byte-identical before and after every case |
| Non-object bodies, four routes | none, malformed, truncated, `null`, `[]`, `[{…}]`, `"id"`, `5`, `true`, empty, 200 000 nested `[` | all 200 `missing_field` with a hint |
| `/register`, each of `pid`, `cwd`, `git_root`, `role`, `name` | the same 15 types plus absent, the other fields valid | `pid`: `missing_field` for all but a positive integer. `cwd`: `missing_field` for all but a non-empty string. `git_root`: accepted for null, absent and any string, else `missing_field`. `role`: `invalid_role`. `name`: `invalid_name`. Every refusal 200 with a hint, counts unchanged |
| `/register` pid edges | `-0`, `1e400`, `-1e400` refused; 2^31, 2^32, 2^32 + a live pid, 2^53, `1e20`, `1e300` accepted | no 500; each is listed offline and removed as `died` by the next cleanup (no wrap-around onto a live pid) |
| `/register` extras | all five wrong at once, `{}`, role `__proto__` / `constructor` / wrong case / trailing space, extra fields including a caller-chosen `id`, `registered_at`, `last_seen`; 1 MB `cwd` and `git_root` | refusal order as in the spec; extra fields ignored; the id is the broker's |
| Other routes | 11 paths × with and without a body | 404, except `POST //register`, which Bun routes as `/register` (note 3 below) |

**No 5xx on any input. No answer contradicts the spec.**

`server.ts`, real process over stdio with an MCP client: `ready` with `{}`, `null`, a float,
a negative, a string of another number, a padded or zero-padded string, `true`, an object, an
empty string, a 100 000-character string, an empty list, a wrong key - each answers `isError`,
registers nothing, keeps only `ready`, and the same ping keeps repeating. An empty `SQUAD_ROLE`
behaves as an absent one (no tools, no ping, `Unknown tool: ready`). `SQUAD_ROLE` of `boss`,
`constructor`, or a worker with no name answer the broker's refusal and keep only `ready`.
Three findings the spec does not settle are under "Spec-precision gaps".

---

## Spec-Anchored Acceptance Criteria

### P1: Registro com nome e papel

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-01 valid register | row with name, role, pid, cwd, git_root, `registered_at == last_seen` epoch ms; `{ id }` non-empty text | `test/unit/register.test.ts:20-33` - `expect(result.id.length).toBeGreaterThan(0)`, `expect(b.rows()).toEqual([{ id: result.id, name: "mother", role: "mother", pid: 100, cwd: "/repo/main", git_root: "/repo/.git", registered_at: NOW, last_seen: NOW }])`; `test/integration/broker.test.ts:42` - `expect(Object.keys(res.json)).toEqual(["id"])`; absent `git_root` (assumption): `test/unit/register.test.ts:241-242` | ✅ PASS (N5, M5 killed) |
| PEER-02 `peer_joined`, same transaction | kind, `from_name`/`role_from` `broker`, `to_name` null, `feature_id` null, `summary` `""`, data `{peer, role}`; peer not stored if the event fails | `test/unit/register.test.ts:47-53` - seven field assertions incl. `expect(event.data).toEqual({ peer: "worker-2", role: "worker" })`; `:195-196` - `expect(() => b.join("mother", "mother", 100)).toThrow()`, `expect(b.rows()).toEqual([])` | ✅ PASS (N7 killed) |
| PEER-03 invalid role | `invalid_role`, hint, nothing written | `test/unit/register.test.ts:59-60` via `expectRefusal` (`:10-14` - `expect(result.error).toBe(error)`, `expect(result.hint.length).toBeGreaterThan(0)`, `expect({ peers, events }).toEqual(before)`); with a dead peer present `:231` | ✅ PASS |
| PEER-04 invalid name | `invalid_name`, nothing written | `test/unit/register.test.ts:65-67,72-74` - `expectRefusal(..., "invalid_name")`; with a dead peer present `:232` | ✅ PASS |
| PEER-05 single role taken | `role_taken`, nothing written | `test/unit/register.test.ts:81` - `expectRefusal(b, () => b.join(role, role, 101), "role_taken")` x3 | ✅ PASS (N2 killed) |
| PEER-06 three live workers | `worker_limit`, nothing written | `test/unit/register.test.ts:90` - `expectRefusal(b, () => b.join("worker-1", "worker", 103), "worker_limit")` | ✅ PASS (N2 killed) |
| PEER-07 name of a live peer | `name_taken`, nothing written | `test/unit/register.test.ts:96` - `expectRefusal(..., "name_taken")` | ✅ PASS |
| PEER-08 name of a dead peer | `peer_left {peer, reason:"died"}`, then register, new `id` differs | `test/unit/register.test.ts:105-111` - `expect(second.id).not.toBe(first.id)`; events `toEqual([joined, ["peer_left", { peer: "mother", reason: "died" }], joined])` | ✅ PASS |
| PEER-09 same PID, accepted | earlier registration leaves with `peer_left` `died` before the `peer_joined`; it does not count as holder of name or role | `test/unit/register.test.ts:131-137` (leader→judge, event order); `:170-178` (mother→mother on pid 100) - `expect(second.id).not.toBe(first.id)`, `expect(b.rows().map((p) => p.id)).toEqual([second.id])` | ✅ PASS |
| PEER-41 same PID, refused | earlier registration kept, no event | `test/unit/register.test.ts:185-189` - `expectRefusal(b, () => b.join("mother", "mother", 100), "role_taken")`, `expect(rows).toEqual([["mother", 101], ["worker-1", 100]])` | ✅ PASS (N1 killed) |
| PEER-10 pid not a positive integer / cwd not non-empty text / git_root neither text nor null | `missing_field`, hint, nothing written | pid: `test/unit/register.test.ts:143-147` - `0`, `-1`, `"100"`, `1.5`, absent; boundary `:223`. cwd: `:153-154` - `""` and absent only. git_root: `:217-218` - `{ a: 1 }`, `7`. With a dead peer present `:230` | ❌ GAP (partial): the clause "`cwd` não é texto" is evidenced by an absent `cwd` only; a `cwd` of another type has no assertion and X5 survives. pid and git_root: ✅ (N3, N4, M5 killed) |
| PEER-37 refusal is HTTP 200 with hint | status 200, `hint` non-empty | `test/integration/broker.test.ts:54-58` - `expect(res.status).toBe(200)`, `expect(res.json.hint.length).toBeGreaterThan(0)`; `:97-100` (`unknown_peer`); `:184-188` (`missing_field`) | ✅ PASS for the cited refusals (N12 killed); see PEER-18 for the non-text `id` |
| PEER-39 body is not a JSON object | `{ ok:false, error:"missing_field", hint }`, nothing written, four routes, five bodies | `test/integration/broker.test.ts:182-190` - `expect(res.status).toBe(200)`, `expect(json.error).toBe("missing_field")`, `expect(json.hint.length).toBeGreaterThan(0)`, `expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] })` | ✅ PASS (X6 killed) |

### P1: Presença na saída

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-11 unregister known id | row deleted, `peer_left` from `broker`, data `{peer, reason:"unregistered"}`, `{ ok:true }` | `test/unit/presence.test.ts:9-16` - `expect(b.rows()).toEqual([])`, `expect(last.from_name).toBe("broker")`, `expect(last.data).toEqual({ peer: "leader", reason: "unregistered" })`; `test/integration/broker.test.ts:107-108` - `expect(res.json).toEqual({ ok: true })` | ✅ PASS |
| PEER-12 unregister with an unknown, absent or non-text id | `{ ok:true }`, no event | unknown: `test/unit/presence.test.ts:22-24` - `expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"])`; `test/integration/broker.test.ts:109-117`. Absent / non-text: `broker.test.ts:222-224` - `expect(unregister.status).toBe(200)`, `expect(unregister.json).toEqual({ ok: true })`; `:230` - `expect(readDb(broker.dbFile)).toEqual(before)` | ✅ PASS (M27, S6, N6 killed) |
| PEER-13 cleanup, dead PID | row deleted, `peer_left {peer, reason:"died"}` | `test/unit/presence.test.ts:32-37` - `expect(last.data).toEqual({ peer: "judge", reason: "died" })`; `:47-50`; real dead PID `test/integration/broker.test.ts:164-168` | ✅ PASS |
| PEER-14 cleanup, live PID | row kept, no event | `test/unit/presence.test.ts:58-59` - `expect(b.rows().map((p) => p.name)).toEqual(["judge"])`, `expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"])` | ✅ PASS |
| PEER-15 seq and ts | `seq` integer above every earlier one, `ts` epoch ms | `test/unit/db.test.ts:13-15` - `expect(second).toBeGreaterThan(first)`, `expect(third).toBeGreaterThan(second)`; `:24` - `expect(row.ts).toBe(1791331200123)` | ✅ PASS |
| PEER-38 cleanup on start and every 30 s | runs at startup; period 30 s | `test/integration/broker.test.ts:150-156` (startup); `:160-168` (interval, override 100 ms); `test/unit/config.test.ts:34-35` - `expect(cleanupIntervalMs({})).toBe(30000)` | ✅ PASS (N11 killed) |

### P1: Listagem sem credencial

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-16 list as a registered peer | the other five names for any caller, `{name, role, online}`, online only for a registered live PID | `test/unit/presence.test.ts:67-73` - as `mother`, `expect(b.peers.listPeers(mother.id)).toEqual([...five items...])`; `:134-140` - as `worker-1`; `:82` - offline for a dead PID; `test/integration/broker.test.ts:85-93` | ✅ PASS |
| PEER-17 no other field | keys exactly `name`, `role`, `online` | `test/unit/presence.test.ts:91` - `expect(Object.keys(item).sort()).toEqual(["name", "online", "role"])`; `:94-95` - `expect(text).not.toContain(leader.id)`; `test/integration/broker.test.ts:94` | ✅ PASS |
| PEER-18 unknown, absent or non-text id | `{ ok:false, error:"unknown_peer", hint }` | unknown: `test/unit/presence.test.ts:102-104`; `test/integration/broker.test.ts:97-100` - `expect(unknown.json.error).toBe("unknown_peer")`, `expect(unknown.json.hint.length).toBeGreaterThan(0)`. Absent / non-text: `broker.test.ts:226-228` - `expect(listed.status).toBe(200)`, `expect(listed.json.ok).toBe(false)`, `expect(listed.json.error).toBe("unknown_peer")` | ❌ GAP (partial): for the absent / non-text `id` the `hint` is not asserted; X1 survives. Status, `ok`, `error`: ✅ (S1, S5 killed) |

### P1: Broker próprio e rodando no Windows

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-19 default DB | `<home>/.squad-code-mcp.db`, from the system, not `HOME` | `test/unit/config.test.ts:7,11` - `expect(dbPath({ HOME: "/not/the/home" })).toBe(join(homedir(), ".squad-code-mcp.db"))`; `test/integration/broker.test.ts:134` - `expect(existsSync(join(home, ".squad-code-mcp.db"))).toBe(true)` | ✅ PASS (N8 killed) |
| PEER-20 port 7900, answers on `127.0.0.1` only | default port 7900; no answer on the machine's other addresses | `test/unit/config.test.ts:19-20` - `expect(port({})).toBe(7900)`; `test/integration/broker.test.ts:196,211` - `expect((await fetch(...)).status).toBe(200)`, `expect(reached.filter((address) => address !== null)).toEqual([])` | ✅ PASS (N13 killed on this machine) |
| PEER-21 heartbeat | known id: `last_seen` = current epoch ms, `registered_at` kept, `{ ok:true }`; unknown, absent or non-text id: `{ ok:true }`, no peer changed | known: `test/unit/presence.test.ts:112-113,116-117` - `expect(b.rows()[0]!.last_seen).toBe(NOW + 30000)`, `expect(b.rows()[0]!.registered_at).toBe(NOW)`; `test/integration/broker.test.ts:68-73`. Unknown: `presence.test.ts:125-126`; `broker.test.ts:76-77`. Absent / non-text: `broker.test.ts:220-221` - `expect(heartbeat.json).toEqual({ ok: true })`; `:230` - `expect(readDb(broker.dbFile)).toEqual(before)` | ✅ PASS (M12, S2, S4 killed) |
| PEER-22 health | `{ status:"ok", peers:<n> }` | `test/integration/broker.test.ts:33,35` - `toEqual({ status: "ok", peers: 0 })`, `toEqual({ status: "ok", peers: 1 })` | ✅ PASS |
| PEER-23 POST to any other route | status 404, with any body or none | `test/integration/broker.test.ts:124` - `expect(res.status).toBe(404)` for four paths with a JSON body; `:175` - same with no body and with `xx` | ✅ PASS |
| PEER-34 broker started detached by the server | detached, `/health` keeps answering after the server exits; path with a space | `test/integration/server.test.ts:252` - `expect(await isUp(url)).toBe(true)`; `:265` - same after the server pid is gone | ✅ PASS (N20 `detached: false` killed). "Same executable" is an accepted assumption, see "Not verified" |
| PEER-35 `kill-broker` | broker process ends, `/health` stops answering | `test/integration/cli.test.ts:39-40` - `expect(proc.killed \|\| proc.exitCode !== null).toBe(true)`, `expect(await isUp(url)).toBe(false)` | ✅ PASS (N10 killed) |
| PEER-36 `status` | prints `Broker: ok (<n> peer(s) registered)` | `test/integration/cli.test.ts:27,29` - `toContain("Broker: ok (0 peer(s) registered)")`, `toContain("Broker: ok (1 peer(s) registered)")` | ✅ PASS |

### P1: Repositório comum entre worktrees

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-24 worktree | absolute git common dir, equal to the main checkout's | `test/unit/git.test.ts:24-26` - `expect(isAbsolute(fromMain!)).toBe(true)`, `expect(fromMain!.endsWith("/main/.git")).toBe(true)`, `expect(fromWorktree).toBe(fromMain)` | ✅ PASS (N9 killed) |
| PEER-25 outside a repository | `git_root` null | `test/unit/git.test.ts:35` - `expect(await getGitRoot(dir)).toBeNull()` | ✅ PASS |

### P1: Registro que prova o canal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-26 `SQUAD_ROLE` absent or empty | zero tools, no ping, no registration | `test/integration/server.test.ts:84,86,88` - `expect(await session.toolNames()).toEqual([])`, `expect(session.pings()).toEqual([])`, `expect(await isUp(url)).toBe(false)` | ✅ PASS for "absent" (N21 killed). "Empty" has no assertion of its own; probed by hand, see "Not verified" |
| PEER-27 ping | channel method, integer 100000..999999 drawn in the process, in the text and in `meta.number`, only `ready`, not registered | `test/integration/server.test.ts:96-103` - `expect(ping.method).toBe("notifications/claude/channel")`, `toBeGreaterThanOrEqual(100000)`, `toBeLessThanOrEqual(999999)`, `expect(ping.params.meta.number).toBe(String(number))`, `expect(ping.params.content).toContain(String(number))`, `toEqual(["ready"])`, `toEqual({ events: [], peers: [] })`; `:275` - `expect(numbers.size).toBeGreaterThan(1)` | ✅ PASS (N16, N17 killed) |
| PEER-28 ping repeats | same number, every 10 s or `SQUAD_PING_INTERVAL_MS` | `test/integration/server.test.ts:110-114` - four pings, `expect(numbers.size).toBe(1)`; `:127` - `expect(session.pings()).toHaveLength(1)` after 1.5 s with no override; `test/unit/config.test.ts:29-30` - `expect(pingIntervalMs({})).toBe(10000)` | ✅ PASS |
| PEER-29 wrong number | error, not registered, only `ready` | `test/integration/server.test.ts:135-137` - `expect(result.isError).toBe(true)`, `toEqual(["ready"])`, `toEqual({ events: [], peers: [] })`; `:139` ping goes on | ✅ PASS |
| PEER-30 right number, accepted | registers pid, cwd, git_root, name, role; ping stops; `tools/list_changed`; `list_peers` without `ready` | `test/integration/server.test.ts:150-155` - `expect(peers[0]!.pid).toBe(session.transport.pid!)`, `.cwd).toBe(BROKER_DIR)`, `.git_root).toBe(await getGitRoot(BROKER_DIR))`; `:157-160` list_changed; `:161` - `toEqual(["list_peers"])`; `:165` - `expect(session.pings().length).toBe(sent)` | ✅ PASS (N15, N19 killed) |
| PEER-31 right number, refused | error with broker `error` and `hint`, only `ready`, ping stops | `test/integration/server.test.ts:176-179` - `toContain("role_taken")`, `toContain(refusal.hint)`, `toEqual(["ready"])`; `:184` - `expect(session.pings().length).toBe(sent)` | ✅ PASS (N14, N18 killed) |
| PEER-32 `list_peers` tool | text with name, role, online/offline of the others, no `id` | `test/integration/server.test.ts:199-207` - `expect(lines).toContain("leader (leader): online")`, four offline lines, `not.toContain(leader.id)`, `not.toContain(mother.id)` | ✅ PASS (N22 killed) |
| PEER-33 stdin closes | `/unregister` | `test/integration/server.test.ts:220-224` - `expect(peers).toEqual([])`, events `toEqual([joined, ["peer_left", { peer: "judge", reason: "unregistered" }]])` after `client.close()` | ✅ PASS |
| PEER-40 unlisted tool | error `Unknown tool`, broker not called | `test/integration/server.test.ts:288-289` (no role), `:293-294` (`list_peers` before `ready`, DB empty), `:297-298` - `expect(await call(session, "ready", number)).toContain("Unknown tool: ready")`, `expect(readDb(broker.dbFile).events).toHaveLength(1)` | ✅ PASS |

**Status**: ❌ Gaps present. 39/41 ACs match the spec outcome with evidence on every clause; 2 partial gaps (PEER-10 clause "`cwd` não é texto", PEER-18 `hint` for the absent / non-text `id`); 3 spec-precision gaps.

### Spec-precision gaps (listed, not counted)

1. **`ready` with no `arguments`.** `server.ts:220` reads `args.number` with `args` undefined; the call ends in a JSON-RPC error `-32603: undefined is not an object (evaluating 'args.number')` instead of the `isError` text. The observable PEER-29 outcome holds (an error, nothing registered, only `ready`, the ping goes on), but by accident; PEER-29 names only "um número diferente do ping". It is the MCP-side sibling of the uncaught 500.
2. **`ready` with a value that is not a number but prints like the ping number.** `server.ts:220` compares `String(...)`: the number as a string registers (reasonable for a model), and so does a one-item list `[n]`. PEER-30 says "chamada com o número do ping" and does not say which JSON types count.
3. **`POST //register`** is routed as `/register` (Bun normalizes the path before `broker.ts:34`); PEER-23 does not say. **Non-POST methods** on the four routes answer 200 `squad broker` with no effect (`broker.ts:40`); the spec defines `GET /health` and `POST` only.

---

## Discrimination Sensor

Scratch: temporary git worktree of HEAD outside the repo (`scratchpad/sensor4`), `node_modules` by junction. One mutation at a time by a runner that requires exactly one match per edit, runs `tsc --noEmit` (exit 0 for every mutant, so none is killed by the type check alone) and the full `bun test`, then `git checkout -- .` and a clean `git status --porcelain` of the scratch after every mutant. Line numbers are HEAD.

### Round 3 survivors, re-applied

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M12 | `broker.ts:62` | `/heartbeat` answers `missing_field` when `body.id` is not a string (absent included) | ✅ Killed (`broker.test.ts:214`) |
| M11 | `peers.ts:110` | `cleanStale()` also run before `namesOf(body.role)` | ✅ Killed (`register.test.ts:226`) |
| M5 | `peers.ts:102` | `body.git_root != null` → `!== null` | ✅ Killed (`register.test.ts:237`) |
| M27 | `broker.ts:67` | `/unregister` answers `missing_field` when `body.id` is not a string | ✅ Killed (`broker.test.ts:214`) |

### New mutations

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| S1 | `broker.ts:65` | `/list-peers` answers `missing_field` instead of `unknown_peer` for a non-string id | ✅ Killed (PEER-12/18/21) |
| S2 | `broker.ts:56` | the id guard removed, raw `body.id` goes to SQLite (the 500 returns) | ✅ Killed (PEER-12/18/21) |
| S3 | `peers.ts:117` | `cleanStale()` between the `invalid_role` and `invalid_name` checks | ✅ Killed (`register.test.ts:226`) |
| S4 | `peers.ts:167` | heartbeat with an empty id refreshes every peer (`WHERE id = ?2 OR ?2 = ''`) | ✅ Killed (PEER-12/18/21) |
| S5 | `peers.ts:174` | listing with an empty id is served as the first registered peer | ✅ Killed (PEER-12/18/21) |
| S6 | `peers.ts:162` | unregister with an empty id removes a registered peer | ✅ Killed (PEER-12/18/21) |
| S7 | `peers.ts:155` | `body.git_root ?? null` → `body.git_root` | ⚪ Survived, equivalent: `bun:sqlite` binds `undefined` as NULL, so the stored row is the same. Not counted |
| N1 | `peers.ts:149` | earlier registration of the pid removed before the refusals | ✅ Killed (PEER-41) |
| N2 | `peers.ts:133` | `name_taken` decided before `role_taken` / `worker_limit` | ✅ Killed (7 tests) |
| N3 | `peers.ts:98` | `!Number.isInteger(body.pid)` → `typeof body.pid !== "number"` | ✅ Killed (PEER-10 pid) |
| N4 | `peers.ts:102` | `typeof body.git_root !== "string"` → `=== "object"` | ✅ Killed (PEER-10 git_root) |
| N5 | `peers.ts:155` | `last_seen` = `ts + 1` at registration | ✅ Killed (PEER-01) |
| N6 | `peers.ts:163` | unregister of an unknown id writes a `peer_left` | ✅ Killed (PEER-12 x3) |
| N7 | `db.ts:59` | `role_from` `'broker'` → `'system'` | ✅ Killed (PEER-02, PEER-11) |
| N8 | `shared/config.ts:29` | default DB path from `HOME` when set | ✅ Killed (PEER-19) |
| N9 | `shared/git.ts:6` | dropped `--path-format=absolute` | ✅ Killed (PEER-24) |
| N10 | `cli.ts:70` | `kill-broker` does not kill | ✅ Killed (PEER-35) |
| N11 | `broker.ts:24` | no cleanup at startup | ✅ Killed (PEER-38) |
| N12 | `broker.ts:60` | a `/register` refusal answers status 400 | ✅ Killed (PEER-37) |
| N13 | `broker.ts:31` | `hostname: "0.0.0.0"` | ✅ Killed (PEER-20) |
| N14 | `server.ts:227` | `stopPing()` only after an accepted registration | ✅ Killed (PEER-31) |
| N15 | `server.ts:255` | no `sendToolListChanged()` | ✅ Killed (PEER-30) |
| N16 | `server.ts:117` | ping number constant `123456` | ✅ Killed (PEER-27 `:275`) |
| N17 | `server.ts:192` | ping without `meta.number` | ✅ Killed (7 tests) |
| N18 | `server.ts:239` | refusal text without the broker hint | ✅ Killed (PEER-31) |
| N19 | `server.ts:232` | registers `process.ppid` | ✅ Killed (PEER-30) |
| N20 | `server.ts:79` | `detached: false` | ✅ Killed (PEER-34) |
| N21 | `server.ts:179` | a session without a role lists `ready` | ✅ Killed (PEER-26, PEER-40) |
| N22 | `server.ts:265` | `list_peers` prints `online` for everyone | ✅ Killed (PEER-32) |
| X1 | `broker.ts:65` | added `if (id === "") return Response.json({ ok: false, error: "unknown_peer" });` before the listing: an absent / non-text id is refused **without a hint** | ❌ Survived → Fix 2 (PEER-18, PEER-37) |
| X5 | `peers.ts:100` | `typeof body.cwd !== "string"` → `body.cwd == null`: only an absent or null `cwd` is refused | ❌ Survived → Fix 1 (PEER-10). Confirmed by hand on the mutant: `cwd: 5` and `cwd: true` register, `cwd: {"a":1}` and `cwd: ["x"]` answer 500 |
| X6 | `broker.ts:51` | dropped `Array.isArray(body)` | ✅ Killed (PEER-39 x3) |

**Sensor depth**: P0-full by manual fault injection, 36 mutations (4 re-applied, 32 new) over `broker.ts`, `peers.ts`, `db.ts`, `server.ts`, `cli.ts`, `shared/config.ts`, `shared/git.ts`
**Result**: 33/36 killed, 3 survived (2 on spec'd behavior: X5, X1; 1 equivalent: S7) - FAIL ❌

Isolation: `git status --porcelain` of the real tree before the sensor was empty and is empty after it (compared with `diff`), before this report was written. The junction was removed with `cmd /c rmdir` before `git worktree remove --force` and `git worktree prune`; `broker/node_modules` is intact (95 entries); `git worktree list` shows only the real tree. One mutant (N10) left its broker running by design and the runner killed it; no `bun.exe` is running now. `C:\Users\lucas\.squad-code-mcp.db` does not exist. Every broker started by hand had `SQUAD_DB` in a temp directory.

---

## History

| Round | HEAD | Gate | Sensor | Verdict | What failed | Fixed by |
| ----- | ---- | ---- | ------ | ------- | ----------- | -------- |
| 1 | `7dbf3c5` / `ced9ed9` | 63 passed | 6 survivors | FAIL | PEER-09 ordering, PEER-20 bind address, PEER-23 answering 500 without a body, PEER-27 number range, PEER-28 and PEER-38 defaults, PEER-33 signals, unlisted-tool guard, three spec contradictions or omissions | `ab6580b` (confirmed in round 2) |
| 2 | `ab6580b` | 78 passed | 41/43 killed | FAIL | PEER-16 listed only by `mother` (N28); second heartbeat (N15); register input types not in the spec; PEER-41 test titled `PEER-09` | `48909ae` (confirmed in round 3) |
| 3 | `48909ae` | 82 passed | 23/27 killed | FAIL | PEER-21 "id ausente" untested (M12); cleanup order in `/register` untested (M11); `/heartbeat` 500 for a non-scalar `id`; absent `git_root` and non-text `id` on `/unregister` undefined (M5, M27) | `2f50812` (all closed, confirmed in this round) |
| 4 | `ff009d0` (code `2f50812`) | 85 passed | 33/36 killed | FAIL | PEER-10 wrong-typed `cwd` untested (X5); PEER-18 `hint` for the absent / non-text `id` untested (X1) | open - Fix 1 and Fix 2 |

The pattern across rounds is the same: a class is fixed and pinned for the instance the report named, and a sibling stays unpinned. In round 4 no sibling is broken in the code - the hand probe of the whole class is clean - but two are unguarded by tests.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`2f50812` touches `broker.ts:55-67` and two test files; later commits only `.specs/` and the root `README.md`) |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ❌ PEER-18: `hint` not asserted for the absent / non-text `id` |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ❌ `peers.ts` "todos os ramos": the `typeof body.cwd !== "string"` branch is only exercised by an absent `cwd` |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (`db.test.ts:27,34` map to T2 Done-when; `register.test.ts:157` to the refusal-order assumption; `:199` and `:226` to edge cases; `:221` to the PEER-10 boundary; `:237` to the `git_root` assumption) |
| Documented guidelines followed: none - strong defaults applied | ✅ |

Notes that are not gaps: the `default:` branches at `broker.ts:69-70` and `server.ts:272-273` are unreachable. `ROLE_TOOLS` (`server.ts:171-176`) has four identical entries; it is the ADR-010 seam. `parseInt` of `SQUAD_PORT` and of the two intervals has no NaN guard. Two `ready` calls racing with the right number would start two heartbeat timers; not a requirement. No `.skip`, `.only`, `.todo`, `TODO` or `SPEC_DEVIATION` in the diff. Commit messages follow the repo's convention by instruction of the owner.

---

## Edge Cases

- [x] Valid role with the name of another role → `invalid_name`: `test/unit/register.test.ts:72-74`
- [x] Three workers, one dead, a new worker takes the dead name: `test/unit/register.test.ts:120-125` - `expect(rows).toEqual([["worker-1", 100], ["worker-2", 103], ["worker-3", 102]])`
- [x] A refusal with no dead peer leaves `peers` and `events` unchanged: `test/unit/register.test.ts:14` in every `expectRefusal`
- [x] Repository path with a space still starts the broker: `test/integration/server.test.ts:229-252,265`
- [x] A register refused by `role_taken`, `worker_limit` or `name_taken` keeps the `peer_left` of a dead peer found by the cleanup: `test/unit/register.test.ts:204-211` - `expect(result.error).toBe("role_taken")`, events end with `["peer_left", { peer: "worker-1", reason: "died" }]` (asserted for `role_taken`; one code path for the three)
- [x] The event write fails → the peer is not stored: `test/unit/register.test.ts:195-196`
- [x] A register refused by `missing_field`, `invalid_role` or `invalid_name` does not log the `peer_left` of a dead peer: `test/unit/register.test.ts:230-234` - three `expectRefusal`, `expect(b.rows().map((p) => p.name)).toEqual(["worker-1"])`, `expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"])` (M11, S3 killed)

---

## Gate Check

- **Gate command**: `bun x tsc --noEmit && bun test` (from `broker/`, Bun 1.3.14)
- **Gate outcome**: `tsc` exit 0; 85 passed, 0 failed, 0 skipped, 470 `expect()` calls, 8 files, 22.2 s
- **Test count before feature**: 0 (`10e92d3` has no tests)
- **Test count after feature**: 85 (63 at round 1, 78 at round 2, 82 at round 3)
- **Delta**: +85 new tests (+3 since round 3)
- **Skipped tests**: none
- **Failures**: none

---

## Not verified

- `SIGINT`/`SIGTERM` in the MCP server (`server.ts:316-317`): accepted assumption, not deliverable on Windows.
- PEER-34 "same executable" (`server.ts:78`, `process.execPath`): accepted assumption; needs a machine with another `bun` on `PATH`.
- Survival of the broker when a real terminal window closes: accepted assumption.
- PEER-26 with `SQUAD_ROLE` set to an empty string: no automated assertion (the test helper drops empty variables, `test/integration/helpers.ts:54`). Hand probe with the variable passed empty: no tools, no ping, `Unknown tool: ready`; whether Windows delivers an empty variable to the child as empty or as absent was not checked.
- The heartbeat timer of the MCP server (`server.ts:247-253`, 15 s): no test waits for it; not a requirement of this slice.
- Non-Windows behavior: the `lsof` branch (`cli.ts:43-47`), `EPERM` in `pidAlive` (`peers.ts:74`), `os.homedir()` on POSIX.
- The PEER-20 integration assertion is vacuous on a machine with no non-internal IPv4 address (this machine has one: N13 was killed).
- The default port 7900 and the default database path were never opened by a real process in this round (every process ran with `SQUAD_PORT` and `SQUAD_DB` set); they are covered at the config unit level only, plus the PEER-19 test with a redirected home.

---

## Fix Plans

### Fix 1: PEER-10 wrong-typed `cwd` has no test (mutant X5)

- **Root cause**: `register.test.ts:150-155` sends `cwd: ""` and a body without `cwd`. An absent field is the only "not text" value, so a null check passes where a type check is required. `48909ae` added wrong-typed values for `git_root` only.
- **Fix task**: in `test/unit/register.test.ts`, in the PEER-10 `cwd` test, add `expectRefusal` for `cwd: 5` and `cwd: { a: 1 }` (cast as the `git_root` test does at `:217`). Optionally one integration post of `cwd: { a: 1 }` asserting status 200. Done when X5 (`peers.ts:100`, `typeof body.cwd !== "string"` → `body.cwd == null`) dies.
- **Priority**: Major by the rule (a spec-named input class with no evidence; the unguarded regression is a 500); the code is right today.

### Fix 2: PEER-18 `hint` not asserted for the absent / non-text `id` (mutant X1)

- **Root cause**: `broker.test.ts:225-228` asserts `status`, `ok` and `error` of the listing refusal and stops there; `:100` asserts the hint only for a string id.
- **Fix task**: add `expect(listed.json.hint.length).toBeGreaterThan(0)` after `broker.test.ts:228`. Done when X1 (`broker.ts:65`, hint-less `unknown_peer` for an empty id) dies.
- **Priority**: Minor in impact, counted by the rule (PEER-18 and PEER-37 name the hint); the code is right today.

### Spec decision: `ready` arguments

- **Fix task**: say in PEER-29 what `ready` answers with no argument or a non-number (today a JSON-RPC internal error for no `arguments`, registration for `"n"` and `[n]`), then pin it. The smallest code change is reading `args?.number` at `server.ts:220`.
- **Priority**: Minor

---

## Requirement Traceability Update

Not applied to `spec.md` (the Verifier writes only this report). Proposed:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PEER-01 to PEER-09, PEER-11 to PEER-17, PEER-19 to PEER-41 | Implementing | ✅ Verified |
| PEER-10 | Implementing | ❌ Needs Fix (test for a wrong-typed `cwd`) |
| PEER-18 | Implementing | ❌ Needs Fix (assert the `hint` for the absent / non-text `id`) |

---

## Summary

**Overall**: ❌ Not Ready (three assertion lines away)

**Spec-anchored check**: 39/41 ACs matched spec outcome on every clause | 2 partial gaps (PEER-10 `cwd` type, PEER-18 `hint`) | 3 spec-precision gaps
**Sensor**: 33/36 mutations killed, 3 survived (X5 and X1 on spec'd behavior; S7 equivalent)
**Gate**: 85 passed, 0 failed, `tsc` clean

**What works**: everything rounds 1 to 3 reported as working, plus: an absent or non-text `id` treated as unknown on the three routes (no 500 left on any route for any input type probed), the cleanup order in `/register` pinned from both sides, an absent `git_root` stored as null.

**Issues found**: PEER-10 wrong-typed `cwd` not asserted (Fix 1); PEER-18 `hint` for the absent / non-text `id` not asserted (Fix 2); `ready` with no arguments ends in an internal error (spec decision).

**Next steps**: escalate to the owner with Fix 1 and Fix 2 (test-only, no code change needed) and the `ready` spec decision.
