# Peer Validation

**Verdict**: FAIL

**Round**: 5 (re-verification after `5582b22` and `b22f83a`; first round on Linux, rounds 1-4 ran on Windows)
**Date**: 2026-10-07
**Spec**: `.specs/features/peer/spec.md` (41 requirements, unchanged since round 4)
**Diff range**: `10e92d3..HEAD`, code under `broker/`; verified at `b22f83a`. Two docs-only commits landed on the branch while this round ran (`2dfec38`, `8dfb5ae`: `ROADMAP.md`, `RUN_FATIAS.md`, `docs/tasks/`); `git diff b22f83a 8dfb5ae -- broker .specs/features/peer` is empty
**Verifier**: independent sub-agent (author ≠ verifier)
**Machine**: Linux 7.0.0, Bun 1.3.14, `lsof` present, `netstat` absent, four non-internal IPv4 addresses

The gate is green on Linux (85 tests, `tsc` clean). Both round 4 survivors are closed: X5 and X1
re-applied are killed, and `ready` with no arguments answers the normal wrong-number error. The
hand probe of the real broker, CLI and MCP server on Linux found **no 5xx and no answer that
contradicts an acceptance criterion**: a pid of another user counts as alive, no pid wraps onto a
live one, the broker listens on `127.0.0.1` only, the server unregisters on stdin close, `SIGTERM`
and `SIGINT`, and the broker it starts is a session leader that outlives it.

The verdict is FAIL by the sensor rule, on behavior the spec states that the suite cannot tell
apart **on Linux**. All three were pinned on Windows only by how Windows behaves:

1. **PEER-34 "processo destacado"**. `detached: false` (N20, killed on Windows in round 4) passes
   all 85 tests on Linux (L6): a Linux child outlives its parent either way, so "still answers
   after the server exits" does not prove detachment. What detachment buys on Linux is a session
   of its own, so a Ctrl-C in the terminal does not take the broker down with the session.
2. **PEER-14 "WHILE o PID de um peer existe"**, the `EPERM` branch. A `pidAlive` that treats
   `EPERM` as dead passes all 85 tests (L2). No test asks about a pid of another user.
3. **PEER-33 "WHEN a entrada padrão fecha"**. With both stdin handlers removed (L3) the PEER-33
   test still passes: the MCP client sends `SIGTERM` 2 s after closing stdin and the signal
   handler unregisters. The suite kills L3 only by accident, through the 5 s timeout of an
   unrelated test (`server.test.ts:271`).

In the three cases the code on HEAD is right (probed by hand); nothing guards it. Each closing
assertion below was run in the scratch: it passes on HEAD and fails on its mutant.

Two Linux-only **code findings** in `kill-broker`, neither against the letter of an AC, are in
"Linux-only findings": it signals every process listening on the port number on any address, and
without `lsof` it prints `Broker is not running.` with the broker up.

Test paths below are relative to `broker/`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `shared/config.ts` |
| T2 | ✅ Done | `db.ts` |
| T3 | ✅ Done | X5 closed by T13 |
| T4 | ⚠️ Partial | PEER-14: the `EPERM` branch of `pidAlive` has no test (L2) |
| T5 | ✅ Done | - |
| T6 | ✅ Done | - |
| T7 | ✅ Done | - |
| T8 | ⚠️ Partial | PEER-34 detachment and PEER-33 stdin close are not discriminated on Linux (L6, L3) |
| T9 | ✅ Done | - |
| T10 | ✅ Done | - |
| T11 | ✅ Done | X1 closed by T13; its third checkbox (independent verification) is rounds 4 and 5 |
| T12 | ✅ Done | Done-when met: the PEER-35 and PEER-34 tests end and pass on Linux; reverting it (L1) terminates the test runner. See the code finding on the address |
| T13 | ✅ Done | Three Done-when items confirmed: X5, X1 and H1 are killed |

---

## Round 4 gaps

| # | Round 4 gap | Status | Evidence |
| - | ----------- | ------ | -------- |
| 1 | PEER-10 wrong-typed `cwd` untested (X5) | ✅ Closed | `test/unit/register.test.ts:155-156` - `expectRefusal(b, () => b.peers.register({ ...body, cwd: 5 } as never), "missing_field")`, same for `cwd: { a: 1 }`. X5 re-applied at `peers.ts:100` is killed by that test |
| 2 | PEER-18 `hint` for an absent / non-text `id` untested (X1) | ✅ Closed | `test/integration/broker.test.ts:229` - `expect(listed.json.hint.length).toBeGreaterThan(0)`. X1 re-applied at `broker.ts:65` is killed by that test |
| 3 | `ready` with no `arguments` ended in a JSON-RPC internal error (spec-precision gap 1) | ✅ Closed | `server.ts:220` reads `args?.number`; `test/integration/server.test.ts:137-138` - `expect(bare.isError).toBe(true)`, then `:139-140` only `ready`, database empty. H1 (guard removed) is killed by that test |

No assertion was removed or weakened: `git diff ff009d0 b22f83a -- broker/test` only adds lines
(6 added, 0 deleted). The test count stays 85; `expect()` calls went from 470 to 486.

---

## Hand probe on Linux

Real processes from a byte-identical scratch copy of HEAD, every one with `SQUAD_DB` in a temp
directory and `SQUAD_PORT` on a free port. Everything in this section was **run**, not read.

| Area | What was done | Result |
| ---- | ------------- | ------ |
| Listen address | `ss -ltn` on the broker port | `127.0.0.1:<port>` only |
| pid liveness (`peers.ts:67-76`) | register with pid 1 (root's, `EPERM`), 2^31, 2^32, 2^32 + a live pid, 2^32 - 1, 2^53; cleanup every 200 ms | pid 1 stays `online`; every other one is accepted, listed offline and removed as `died`. No wrap-around onto a live pid, no 500 |
| Input types, four POST routes | 156 checks: 14 value types plus absent on `id` (three routes) and on each of `pid`, `cwd`, `git_root`, `role`, `name`; 9 non-object bodies on the four routes | all 200 with the spec answer and a hint; no 5xx; nothing left in `peers` |
| Routing | `POST` to `/nope`, the three upstream routes, `/register/`, `/REGISTER`, `/health` | 404. `POST //register` registers (spec-precision gap 2). `GET`/`PUT`/`DELETE`/`PATCH /register` answer `200 squad broker` (gap 3) |
| Default database (`shared/config.ts:29`) | `dbPath()` with `HOME` unset, empty, and set to another directory; no broker started | unset or empty: `/home/<user>/.squad-code-mcp.db` from the password database. Set: `<HOME>/.squad-code-mcp.db` (spec-precision gap 4) |
| CLI `status` | broker up, then down | `Broker: ok (0 peer(s) registered)` and the URL; then `Broker is not running.` |
| CLI `kill-broker` | broker up, with a client of mine holding a connection open | broker gone, `/health` down, the client survives (the T12 fix holds) |
| CLI `kill-broker`, other listeners | two processes of mine listening on `127.0.0.2:<port>` and `[::1]:<port>` | **both killed with the broker** (code finding 1) |
| CLI `kill-broker`, no `lsof` on `PATH` | broker up | prints `Broker has 0 peer(s). Shutting down...` then `Broker is not running.`, exit 0, **broker still up** (code finding 2) |
| Server, stdin closed with no signal | MCP client over stdio, `ready`, then only `stdin.end()` | `peer_left` `unregistered` 28 ms later; server exits; broker still up |
| Server, `SIGTERM` and `SIGINT` (`server.ts:316-317`) | signal sent to the server pid after `ready` | `peer_left` `unregistered` 28 ms later in both; broker still up |
| Server, `SIGKILL` | after `ready` | no unregister; the broker cleanup logs `peer_left` `died` |
| Detachment (`server.ts:78-85`) | `ps -o pgid,sid,ppid` of the broker the server started | broker is leader of its own session and process group (`pgid == sid == pid`), not the client's; reparented to the user's systemd after the server exits |
| "Same executable" | server run with `PATH=/usr/bin:/bin` (no `bun` there) | broker comes up: it is started by `process.execPath` |
| `ready` argument shapes | none, `{}`, float, other number | `isError`, nothing registered. The number as text and as `[n]` **register** (gap 1) |
| Empty `SQUAD_ROLE` | variable delivered empty to the child | no tools, no ping, no broker started |

---

## Spec-Anchored Acceptance Criteria

### P1: Registro com nome e papel

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-01 valid register | row with name, role, pid, cwd, git_root, `registered_at == last_seen` epoch ms; `{ id }` non-empty text | `test/unit/register.test.ts:20-33` - `expect(result.id.length).toBeGreaterThan(0)`, `expect(b.rows()).toEqual([{ id: result.id, name: "mother", role: "mother", pid: 100, cwd: "/repo/main", git_root: "/repo/.git", registered_at: NOW, last_seen: NOW }])`; `test/integration/broker.test.ts:42` - `expect(Object.keys(res.json)).toEqual(["id"])`; absent `git_root`: `test/unit/register.test.ts:243-244` | ✅ PASS |
| PEER-02 `peer_joined`, same transaction | kind, `from_name`/`role_from` `broker`, `to_name` null, `feature_id` null, `summary` `""`, data `{peer, role}`; peer not stored if the event fails | `test/unit/register.test.ts:47-54` - seven field assertions incl. `expect(event.summary).toBe("")`, `expect(event.data).toEqual({ peer: "worker-2", role: "worker" })`; `:197-198` - `expect(() => b.join("mother", "mother", 100)).toThrow()`, `expect(b.rows()).toEqual([])` | ✅ PASS (D1, P5 killed) |
| PEER-03 invalid role | `invalid_role`, hint, nothing written | `test/unit/register.test.ts:59-60` via `expectRefusal` (`:10-14` - `expect(result.error).toBe(error)`, `expect(result.hint.length).toBeGreaterThan(0)`, `expect({ peers, events }).toEqual(before)`); with a dead peer present `:233` | ✅ PASS |
| PEER-04 invalid name | `invalid_name`, nothing written | `test/unit/register.test.ts:65-67,72-74` - `expectRefusal(..., "invalid_name")`; with a dead peer present `:234` | ✅ PASS |
| PEER-05 single role taken | `role_taken`, nothing written | `test/unit/register.test.ts:81` - `expectRefusal(b, () => b.join(role, role, 101), "role_taken")` x3 | ✅ PASS |
| PEER-06 three live workers | `worker_limit`, nothing written | `test/unit/register.test.ts:90` - `expectRefusal(b, () => b.join("worker-1", "worker", 103), "worker_limit")` | ✅ PASS |
| PEER-07 name of a live peer | `name_taken`, nothing written | `test/unit/register.test.ts:96` - `expectRefusal(..., "name_taken")` | ✅ PASS |
| PEER-08 name of a dead peer | `peer_left {peer, reason:"died"}`, then register, new `id` differs | `test/unit/register.test.ts:105-111` - `expect(second.id).not.toBe(first.id)`; events `toEqual([joined, ["peer_left", { peer: "mother", reason: "died" }], joined])` | ✅ PASS |
| PEER-09 same PID, accepted | earlier registration leaves with `peer_left` `died` before the `peer_joined`; it does not count as holder of name or role | `test/unit/register.test.ts:131-137` (leader→judge, event order and reason); `:172-180` (mother→mother on pid 100) - `expect(b.rows().map((p) => p.id)).toEqual([second.id])` | ✅ PASS (P1, P2 killed) |
| PEER-41 same PID, refused | earlier registration kept, no event | `test/unit/register.test.ts:187-191` - `expectRefusal(b, () => b.join("mother", "mother", 100), "role_taken")`, `expect(rows).toEqual([["mother", 101], ["worker-1", 100]])` | ✅ PASS |
| PEER-10 pid not a positive integer / cwd not non-empty text / git_root neither text nor null | `missing_field`, hint, nothing written | pid: `test/unit/register.test.ts:143-147` - `0`, `-1`, `"100"`, `1.5`, absent; boundary `:225`. cwd: `:153-156` - `""`, absent, `5`, `{ a: 1 }`. git_root: `:219-220` - `{ a: 1 }`, `7`. With a dead peer present `:232` | ✅ PASS (X5 killed) |
| PEER-37 refusal is HTTP 200 with hint | status 200, `hint` non-empty | `test/integration/broker.test.ts:54-58` - `expect(res.status).toBe(200)`, `expect(res.json.hint.length).toBeGreaterThan(0)`; `:97-100`, `:226-229` (`unknown_peer`); `:184-188` (`missing_field`) | ✅ PASS |
| PEER-39 body is not a JSON object | `{ ok:false, error:"missing_field", hint }`, nothing written, four routes, five bodies | `test/integration/broker.test.ts:182-190` - `expect(res.status).toBe(200)`, `expect(json.error).toBe("missing_field")`, `expect(json.hint.length).toBeGreaterThan(0)`, `expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] })` | ✅ PASS (B1 killed) |

### P1: Presença na saída

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-11 unregister known id | row deleted, `peer_left` from `broker`, data `{peer, reason:"unregistered"}`, `{ ok:true }` | `test/unit/presence.test.ts:9-16` - `expect(b.rows()).toEqual([])`, `expect(last.from_name).toBe("broker")`, `expect(last.data).toEqual({ peer: "leader", reason: "unregistered" })`; `test/integration/broker.test.ts:107-108` - `expect(res.json).toEqual({ ok: true })` | ✅ PASS |
| PEER-12 unregister with an unknown, absent or non-text id | `{ ok:true }`, no event | `test/unit/presence.test.ts:22-24`; `test/integration/broker.test.ts:109-117`; absent / non-text `:222-224` - `expect(unregister.json).toEqual({ ok: true })`, `:231` - `expect(readDb(broker.dbFile)).toEqual(before)` | ✅ PASS |
| PEER-13 cleanup, dead PID | row deleted, `peer_left {peer, reason:"died"}` | `test/unit/presence.test.ts:32-37` - `expect(last.data).toEqual({ peer: "judge", reason: "died" })`; `:47-50`; real dead PID `test/integration/broker.test.ts:164-168` | ✅ PASS (B2 killed) |
| PEER-14 cleanup, live PID | row kept, no event, **while the PID exists** | `test/unit/presence.test.ts:58-59` - `expect(b.rows().map((p) => p.name)).toEqual(["judge"])`, `expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"])` (fake liveness); real pids of the test's own user at `test/integration/broker.test.ts:87-88` | ❌ GAP (partial): a PID that exists and belongs to another user (`EPERM`, `peers.ts:74`) has no assertion; L2 survives. Own-user live PID: ✅ |
| PEER-15 seq and ts | `seq` integer above every earlier one, `ts` epoch ms | `test/unit/db.test.ts:13-15` - `expect(second).toBeGreaterThan(first)`, `expect(third).toBeGreaterThan(second)`; `:24` - `expect(row.ts).toBe(1791331200123)` | ✅ PASS |
| PEER-38 cleanup on start and every 30 s | runs at startup; period 30 s | `test/integration/broker.test.ts:150-156` (startup); `:160-168` (interval, override 100 ms); `test/unit/config.test.ts:34-35` - `expect(cleanupIntervalMs({})).toBe(30000)` | ✅ PASS (B2 killed) |

### P1: Listagem sem credencial

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-16 list as a registered peer | the other five names for any caller, `{name, role, online}`, online only for a registered live PID | `test/unit/presence.test.ts:67-73` - as `mother`, `expect(b.peers.listPeers(mother.id)).toEqual([...five items...])`; `:134-140` - as `worker-1`; `:82` - offline for a dead PID; `test/integration/broker.test.ts:85-93` | ✅ PASS (P3 killed) |
| PEER-17 no other field | keys exactly `name`, `role`, `online` | `test/unit/presence.test.ts:91` - `expect(Object.keys(item).sort()).toEqual(["name", "online", "role"])`; `:94-95`; `test/integration/broker.test.ts:94` | ✅ PASS |
| PEER-18 unknown, absent or non-text id | `{ ok:false, error:"unknown_peer", hint }` | `test/unit/presence.test.ts:102-104`; `test/integration/broker.test.ts:97-100`; absent / non-text `:226-229` - `expect(listed.json.error).toBe("unknown_peer")`, `expect(listed.json.hint.length).toBeGreaterThan(0)` | ✅ PASS (X1 killed) |

### P1: Broker próprio e rodando no Windows

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-19 default DB | `<home>/.squad-code-mcp.db`, from the system, not `HOME` | `test/unit/config.test.ts:7,11` - `expect(dbPath({ HOME: "/not/the/home" })).toBe(join(homedir(), ".squad-code-mcp.db"))`; `test/integration/broker.test.ts:134` - `expect(existsSync(join(home, ".squad-code-mcp.db"))).toBe(true)` | ✅ PASS for the file name and for a home taken from `os.homedir()` (C2 killed). ⚠️ Spec-precision gap 4: on POSIX `os.homedir()` **is** `HOME` when it is set, and the integration test redirects the home through `HOME` (`:132`) |
| PEER-20 port 7900, answers on `127.0.0.1` only | default port 7900; no answer on the machine's other addresses | `test/unit/config.test.ts:19-20` - `expect(port({})).toBe(7900)`; `test/integration/broker.test.ts:196,211` - `expect(reached.filter((address) => address !== null)).toEqual([])` (four other addresses on this machine) | ✅ PASS |
| PEER-21 heartbeat | known id: `last_seen` = current epoch ms, `registered_at` kept, `{ ok:true }`; unknown, absent or non-text id: `{ ok:true }`, no peer changed | `test/unit/presence.test.ts:112-113,116-117`; `test/integration/broker.test.ts:68-73`; unknown `presence.test.ts:125-126`, `broker.test.ts:76-77`; absent / non-text `broker.test.ts:220-221,231` | ✅ PASS |
| PEER-22 health | `{ status:"ok", peers:<n> }` | `test/integration/broker.test.ts:33,35` - `toEqual({ status: "ok", peers: 0 })`, `toEqual({ status: "ok", peers: 1 })` | ✅ PASS |
| PEER-23 POST to any other route | status 404, with any body or none | `test/integration/broker.test.ts:124` - `expect(res.status).toBe(404)` for four paths; `:175` - no body and `xx` | ✅ PASS |
| PEER-34 broker started detached by the server | started when the server comes up, **detached**, same executable, `/health` keeps answering after the server exits; path with a space | `test/integration/server.test.ts:255` - `expect(await isUp(url)).toBe(true)`; `:268` - same after the server pid is gone | ❌ GAP (partial): "destacado" has no assertion that holds on Linux; L6 survives. Started at startup, path with a space, outlives the server: ✅ (H6 killed). "Same executable": accepted assumption, L5 survives, not counted |
| PEER-35 `kill-broker` | broker process ends, `/health` stops answering | `test/integration/cli.test.ts:37` - `waitFor(async () => !(await isUp(url)), ...)`, `:40` - `expect(await isUp(url)).toBe(false)` | ✅ PASS (L1, L7 killed). `:39` is true by construction after `await proc.exited`; the evidence is `:37` and `:40` |
| PEER-36 `status` | prints `Broker: ok (<n> peer(s) registered)` | `test/integration/cli.test.ts:27,29` - `toContain("Broker: ok (0 peer(s) registered)")`, `toContain("Broker: ok (1 peer(s) registered)")` | ✅ PASS |

### P1: Repositório comum entre worktrees

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-24 worktree | absolute git common dir, equal to the main checkout's | `test/unit/git.test.ts:24-26` - `expect(isAbsolute(fromMain!)).toBe(true)`, `expect(fromMain!.endsWith("/main/.git")).toBe(true)`, `expect(fromWorktree).toBe(fromMain)` | ✅ PASS (G1 killed) |
| PEER-25 outside a repository | `git_root` null | `test/unit/git.test.ts:35` - `expect(await getGitRoot(dir)).toBeNull()` | ✅ PASS (G2 killed) |

### P1: Registro que prova o canal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-26 `SQUAD_ROLE` absent or empty | zero tools, no ping, no registration | `test/integration/server.test.ts:84,86,88` - `expect(await session.toolNames()).toEqual([])`, `expect(session.pings()).toEqual([])`, `expect(await isUp(url)).toBe(false)` | ✅ PASS for "absent". "Empty" has no assertion of its own (probed by hand on Linux, see "Not verified") |
| PEER-27 ping | channel method, integer 100000..999999 drawn in the process, in the text and in `meta.number`, only `ready`, not registered | `test/integration/server.test.ts:96-103`; `:278` - `expect(numbers.size).toBeGreaterThan(1)` | ✅ PASS |
| PEER-28 ping repeats | same number, every 10 s or `SQUAD_PING_INTERVAL_MS` | `test/integration/server.test.ts:110-114` - `expect(numbers.size).toBe(1)`; `:127` - `expect(session.pings()).toHaveLength(1)`; `test/unit/config.test.ts:29-30` | ✅ PASS |
| PEER-29 wrong number | error, not registered, only `ready` | `test/integration/server.test.ts:135` - `expect(result.isError).toBe(true)`; `:138` - `expect(bare.isError).toBe(true)`; `:139-140` - `toEqual(["ready"])`, `toEqual({ events: [], peers: [] })`; `:142` ping goes on | ✅ PASS (H1 killed) |
| PEER-30 right number, accepted | registers pid, cwd, git_root, name, role; ping stops; `tools/list_changed`; `list_peers` without `ready` | `test/integration/server.test.ts:152-158` - `expect(peers[0]!.pid).toBe(session.transport.pid!)`, `.cwd).toBe(BROKER_DIR)`, `.git_root).toBe(await getGitRoot(BROKER_DIR))`; `:160-164`; `:168` - `expect(session.pings().length).toBe(sent)` | ✅ PASS (H8 killed) |
| PEER-31 right number, refused | error with broker `error` and `hint`, only `ready`, ping stops | `test/integration/server.test.ts:179-182` - `toContain("role_taken")`, `toContain(refusal.hint)`, `toEqual(["ready"])`; `:187` | ✅ PASS (H8 killed) |
| PEER-32 `list_peers` tool | text with name, role, online/offline of the others, no `id` | `test/integration/server.test.ts:202-210` - `expect(lines).toContain("leader (leader): online")`, four offline lines, `not.toContain(leader.id)`, `not.toContain(mother.id)` | ✅ PASS |
| PEER-33 stdin closes | `/unregister` **when stdin closes** | `test/integration/server.test.ts:219-227` - `await session.client.close()`, `expect(peers).toEqual([])`, events `toEqual([joined, ["peer_left", { peer: "judge", reason: "unregistered" }]])` | ❌ GAP (partial): on Linux `client.close()` falls back to `SIGTERM` after 2 s and the `waitFor` allows 8 s, so the outcome is reached with the stdin handlers removed (L3 passes this test in 2.5 s). The outcome itself: ✅ |
| PEER-40 unlisted tool | error `Unknown tool`, broker not called | `test/integration/server.test.ts:291-292`, `:296-297`, `:300-301` - `expect(await call(session, "ready", number)).toContain("Unknown tool: ready")`, `expect(readDb(broker.dbFile).events).toHaveLength(1)` | ✅ PASS |

**Status**: ❌ Gaps present. 38/41 ACs match the spec outcome with evidence on every clause; 3 partial gaps, all Linux-only discrimination (PEER-14 `EPERM`, PEER-33 stdin close, PEER-34 detachment); 6 spec-precision gaps.

### Spec-precision gaps (listed, not counted)

1. **`ready` with the number as text or as a one-item list** (still holds, run). `server.ts:220` compares `String(...)`: `"<n>"` and `[n]` register. PEER-30 says "chamada com o número do ping" and not which JSON types count. The no-arguments case of round 4 is closed.
2. **`POST //register`** is routed as `/register` and registers a peer (still holds, run). PEER-23 does not say.
3. **Non-POST methods** on the four routes answer `200 squad broker` with no effect (`broker.ts:40`; still holds, run). The spec defines `GET /health` and `POST` only.
4. **PEER-19 "obtido do sistema e não da variável `HOME`" is not true on POSIX** (new, run). `os.homedir()` returns `HOME` when it is set and falls back to the password database only when it is unset or empty. What holds on Linux is the goal behind the clause: the broker does not *need* `HOME`. The integration test redirects the home through `HOME` (`broker.test.ts:132`) under a title that says "without SQUAD_DB and HOME", and `config.test.ts:11` passes `HOME` in an object `dbPath` never reads for the home. The clause needs a per-platform wording.
5. **`SIGINT` / `SIGTERM` in the MCP server** (new). The Assumptions row leaves them out "porque no Windows não há como testar". On Linux they are testable and they work (probed); removing both handlers passes all 85 tests (L4). They are also what makes PEER-33 pass when the stdin path is broken. The spec should say whether they are a requirement on POSIX.
6. **PEER-35 does not say that only the broker is stopped**, nor what `kill-broker` does where `lsof` is missing (new; see the two code findings). The Assumptions row for PEER-34 is also inexact: "same executable" does not need a machine with another `bun`, a `PATH` without `bun` proves it (run: passes on HEAD, fails on L5).

---

## Linux-only findings

Verified by running the real CLI from a scratch copy of HEAD.

1. **`kill-broker` signals every process listening on the port number, on any address** (code
   finding, `cli.ts:44`). `lsof -ti tcp:<port> -sTCP:LISTEN` matches by port only. With the broker
   on `127.0.0.1:<port>` and two unrelated listeners of mine on `127.0.0.2:<port>` and
   `[::1]:<port>`, `SQUAD_PORT=<port> bun cli.ts kill-broker` sent `SIGTERM` to the three. The
   Windows branch filters on `127.0.0.1:<port>` (`cli.ts:37`), and T12 is titled "signal only the
   process listening on the port". `lsof -ti tcp@127.0.0.1:<port> -sTCP:LISTEN` returned only the
   broker in the same setup. No AC forbids it, so it is not counted in the verdict.
2. **Without `lsof`, `kill-broker` says the broker is not running** (code finding, minor,
   `cli.ts:29,74-75`). `Bun.spawnSync` throws, the `catch` meant for a dead broker prints
   `Broker is not running.` after `Shutting down...`, exit 0, broker still up. Reproduced with
   `PATH=/nonexistent`. `lsof` is not installed by default on several distributions and images.
3. `-sTCP:LISTEN` does what `5582b22` says: a client with an open connection to the broker
   survives `kill-broker`; without the flag (L1) the suite's own runner is terminated.
4. `pidAlive`: `EPERM` is alive, `ESRCH` is dead, and pids above 2^31 are dead rather than
   wrapped. Correct, and unguarded for `EPERM` (L2).
5. Spawn of the broker: `detached: true` gives it its own session and process group; it survives
   stdin close, `SIGTERM`, `SIGINT` and `SIGKILL` of the server. Correct, and unguarded (L6).
6. `SIGINT`/`SIGTERM` handlers unregister in about 30 ms. Correct, outside the spec (gap 5).
7. `homedir`: see spec-precision gap 4. `~/.squad-code-mcp.db` was never created in this round.
8. `getGitRoot`: G1 and G2 killed; the PEER-24 assertions hold with `/tmp` paths.

---

## Discrimination Sensor

Scratch: temporary git worktree of `b22f83a` under the session scratchpad with its own
`bun install`. One mutation at a time by a runner that requires exactly one match per edit, runs
`tsc --noEmit` (exit 0 for every mutant, so none is killed by the type check alone) and the full
`bun test` under `timeout`, then `git checkout -- .` and a clean `git status --porcelain` of the
scratch after every mutant. Line numbers are `b22f83a`.

### Round 4 survivors, re-applied

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| X5 | `peers.ts:100` | `typeof body.cwd !== "string"` → `body.cwd == null` | ✅ Killed (`register.test.ts:150`) |
| X1 | `broker.ts:65` | hint-less `unknown_peer` for an empty id | ✅ Killed (`broker.test.ts:214`) |

### Linux-only paths

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| L1 | `cli.ts:44` | `lsof` without `-sTCP:LISTEN` (reverts `5582b22`) | ✅ Killed: the test runner itself gets `SIGTERM`, exit 15, no summary |
| L2 | `peers.ts:74` | `return code === "EPERM"` → `return false`: a pid of another user counts as dead | ❌ Survived → Fix 2 (PEER-14) |
| L3 | `server.ts:318-319` | both `process.stdin.on(...)` handlers removed | ✅ Killed, by accident: `server.test.ts:271` (PEER-27, three sessions) times out at 5 s because each close now takes 2 s. The PEER-33 test **passes** on this mutant → Fix 3 |
| L4 | `server.ts:316-317` | both signal handlers removed | ⚪ Survived, outside the spec (Assumptions row; spec-precision gap 5). Not counted |
| L5 | `server.ts:78` | `spawn(process.execPath, ...)` → `spawn("bun", ...)` | ⚪ Survived, accepted assumption in the spec ("same executable"). Not counted; closing line under Fix 4 |
| L6 | `server.ts:79` | `detached: true` → `false` (round 4's N20, killed on Windows) | ❌ Survived on Linux → Fix 1 (PEER-34) |
| L7 | `cli.ts:31` | `process.platform === "win32"` → `!==`: the `netstat` branch on Linux | ✅ Killed (PEER-35, PEER-34) |
| L8 | `server.ts:80` | `stdio: "ignore"` → `"inherit"` | ⚪ Survived, no spec'd outcome changes. Not counted |
| L10 | `server.ts:85` | `proc.unref()` removed | ⚪ Survived, equivalent: the exit path calls `process.exit(0)`. Not counted |

### Other new mutations

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| B1 | `broker.ts:50` | a malformed body is read as `{}` | ✅ Killed (PEER-39 x3) |
| B2 | `broker.ts:25` | no periodic cleanup | ✅ Killed (PEER-38/13) |
| P1 | `peers.ts:149` | the earlier registration of the pid leaves as `unregistered` | ✅ Killed (PEER-09 x2) |
| P2 | `peers.ts:130` | `AND pid != ?` dropped: the pid's own registration counts as holder | ✅ Killed (PEER-09) |
| P3 | `peers.ts:181` | `online` decided by role, not by name | ✅ Killed (PEER-16 x2) |
| P5 | `peers.ts:96` | `register` not wrapped in `db.transaction` | ✅ Killed (PEER-02) |
| D1 | `db.ts:59` | event `summary` `''` → `'presence'` | ✅ Killed (PEER-02) |
| C2 | `shared/config.ts:29` | default file name `.claude-peers.db` | ✅ Killed (PEER-19 x3) |
| G1 | `shared/git.ts:6` | `--git-common-dir` → `--absolute-git-dir` | ✅ Killed (PEER-24) |
| G2 | `shared/git.ts:13` | exit code of `git` ignored | ✅ Killed (PEER-25) |
| H1 | `server.ts:220` | `args?.number` → `args.number` (reverts `b22f83a`) | ✅ Killed (PEER-29) |
| H6 | `server.ts:287-292` | broker not started when the server comes up | ✅ Killed (PEER-34) |
| H8 | `server.ts:227` | the ping is not stopped by a right `ready` | ✅ Killed (PEER-30, PEER-31) |

**Sensor depth**: expanded, manual fault injection: 24 mutations (21 new, 3 re-applied) over `peers.ts`, `broker.ts`, `server.ts`, `cli.ts`, `db.ts`, `shared/config.ts`, `shared/git.ts`; 9 on Linux-only paths
**Result**: 18/24 killed, 6 survived (2 on spec'd behavior: L6, L2; 2 on behavior the spec sets aside: L4, L5; 2 equivalent: L8, L10); 1 of the 18 killed only by accident (L3) - FAIL ❌

Isolation: the real tree was never written by the sensor. `git status --porcelain` was
`?? docs/tasks/` before it. After cleanup it is empty: the orchestrator committed `docs/tasks/`,
`ROADMAP.md` and `RUN_FATIAS.md` meanwhile (`2dfec38`, `8dfb5ae`); `git diff --stat HEAD -- broker`
is empty and `broker/node_modules` is intact (95 entries). The scratch worktree is removed and
pruned; `git worktree list` shows only the real tree. Six `squad-test-*` temp directories and one
broker left behind by mutant runs (pid started by this session, on a temp db) were removed and
stopped by pid. The `claude-peers` broker and servers were not touched. `~/.squad-code-mcp.db`
does not exist.

---

## History

| Round | HEAD | Gate | Sensor | Verdict | What failed | Fixed by |
| ----- | ---- | ---- | ------ | ------- | ----------- | -------- |
| 1 | `7dbf3c5` / `ced9ed9` | 63 passed | 6 survivors | FAIL | PEER-09 ordering, PEER-20 bind address, PEER-23 answering 500 without a body, PEER-27 number range, PEER-28 and PEER-38 defaults, PEER-33 signals, unlisted-tool guard, three spec contradictions or omissions | `ab6580b` |
| 2 | `ab6580b` | 78 passed | 41/43 killed | FAIL | PEER-16 listed only by `mother` (N28); second heartbeat (N15); register input types not in the spec; PEER-41 test titled `PEER-09` | `48909ae` |
| 3 | `48909ae` | 82 passed | 23/27 killed | FAIL | PEER-21 "id ausente" untested (M12); cleanup order in `/register` untested (M11); `/heartbeat` 500 for a non-scalar `id`; absent `git_root` and non-text `id` on `/unregister` undefined (M5, M27) | `2f50812` |
| 4 | `ff009d0` (code `2f50812`) | 85 passed | 33/36 killed | FAIL | PEER-10 wrong-typed `cwd` untested (X5); PEER-18 `hint` for the absent / non-text `id` untested (X1) | `b22f83a` (both closed, confirmed in this round) |
| 5 | `b22f83a` | 85 passed (Linux) | 18/24 killed | FAIL | On Linux: PEER-34 detachment (L6), PEER-14 `EPERM` (L2), PEER-33 stdin close (L3) are not discriminated; two `kill-broker` code findings | open - Fix 1 to Fix 5 |

Rounds 1-4 closed every gap found on Windows. Round 5 is a different class: the same tests give
weaker evidence on Linux, because Linux reaches the asserted outcome by another road (a child
outlives its parent without being detached; the client's `SIGTERM` covers for a dead stdin path).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`5582b22`: `cli.ts:43-44`; `b22f83a`: `server.ts:220` and six test lines) |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ❌ PEER-34 "destacado", PEER-33 "stdin fecha" and PEER-14 `EPERM` are not what the assertions measure on Linux |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ❌ `peers.ts` "todos os ramos": the `EPERM` branch at `:74` is never taken by a test |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: none - strong defaults applied | ✅ |

Notes that are not gaps: `cli.test.ts:39` asserts nothing after `await proc.exited`. `parseInt`
of `SQUAD_PORT` has no NaN guard (`SQUAD_PORT=abc` gives `http://127.0.0.1:NaN`); an empty
`SQUAD_DB` is used as given (`""`, a temporary SQLite database), not as absent. `kill-broker`
prints `Broker stopped.` right after the signal, without waiting, and also when `lsof` finds
nobody. The `default:` branches at `broker.ts:69-70` and `server.ts:272-273` are unreachable. No
`.skip`, `.only`, `.todo`, `TODO` or `SPEC_DEVIATION` in the diff.

---

## Edge Cases

- [x] Valid role with the name of another role → `invalid_name`: `test/unit/register.test.ts:72-74`
- [x] Three workers, one dead, a new worker takes the dead name: `test/unit/register.test.ts:120-125`
- [x] A refusal with no dead peer leaves `peers` and `events` unchanged: `test/unit/register.test.ts:14` in every `expectRefusal`
- [x] Repository path with a space still starts the broker: `test/integration/server.test.ts:233-255,268`
- [x] A register refused by `role_taken`, `worker_limit` or `name_taken` keeps the `peer_left` of a dead peer: `test/unit/register.test.ts:206-213` (asserted for `role_taken`; one code path for the three)
- [x] The event write fails → the peer is not stored: `test/unit/register.test.ts:197-198` (P5 killed)
- [x] A register refused by `missing_field`, `invalid_role` or `invalid_name` does not log the `peer_left` of a dead peer: `test/unit/register.test.ts:232-236`

---

## Gate Check

- **Gate command**: `bun x tsc --noEmit && bun test` (from `broker/`, Bun 1.3.14, Linux)
- **Gate outcome**: `tsc` exit 0; 85 passed, 0 failed, 0 skipped, 486 `expect()` calls, 8 files, 9.8 s
- **Test count before feature**: 0 (`10e92d3` has no tests)
- **Test count after feature**: 85 (63 at round 1, 78 at round 2, 82 at round 3, 85 at round 4)
- **Delta**: +85 new tests (+0 tests, +16 `expect()` calls since round 4)
- **Skipped tests**: none
- **Failures**: none

---

## Not verified

- Windows: nothing was re-run there in this round. `cli.ts:31-41` (`netstat`) and `windowsHide` were read only.
- The default port 7900 and the default database path were never opened by a real process (every process ran with `SQUAD_PORT` and `SQUAD_DB` set); `dbPath()` was evaluated without starting a broker.
- `kill-broker` against a broker owned by another user, and `lsof` builds other than the one installed here.
- Survival of the broker when a real terminal window closes or on a real Ctrl-C in a terminal: inferred from the measured session and process group, not performed.
- PEER-26 with `SQUAD_ROLE` empty: probed by hand on Linux, no automated assertion (`helpers.ts:54` drops empty variables).
- The 15 s heartbeat timer of the MCP server (`server.ts:247-253`): no test waits for it; not a requirement.
- macOS and other POSIX systems.
- Read, not run: `kill-broker` aimed at a port where something else answers `/health` stops that process (`SQUAD_PORT=7899` would stop the `claude-peers` broker). Deliberately not tried.

---

## Fix Plans

Fixes 1 to 4 are test-only and each was run in the scratch: passes on `b22f83a`, fails on its mutant.

### Fix 1: PEER-34 detachment is not asserted on Linux (mutant L6)

- **Root cause**: `server.test.ts:268` proves the broker answers after the server exits. On Linux that holds for any child; only Windows ties it to `detached`.
- **Fix task**: in `test/integration/server.test.ts`, after line 255, add:
  `if (process.platform !== "win32") { const brokerPid = Bun.spawnSync(["lsof", "-ti", `tcp@127.0.0.1:${port}`, "-sTCP:LISTEN"]).stdout.toString().trim(); expect(Bun.spawnSync(["ps", "-o", "pgid=", "-p", brokerPid]).stdout.toString().trim()).toBe(brokerPid); }`
  Done when L6 (`server.ts:79`, `detached: false`) dies on Linux.
- **Priority**: Major (a spec-named property with no evidence on a supported platform; the regression is a broker that dies with the terminal's Ctrl-C).

### Fix 2: PEER-14 `EPERM` branch has no test (mutant L2)

- **Root cause**: unit tests inject liveness; integration tests use pids of the test's own user.
- **Fix task**: in `test/unit/presence.test.ts`, import `pidAlive` from `../../peers.ts` and add `test.skipIf(process.platform === "win32")("PEER-14: a pid of another user is alive", () => { expect(pidAlive(1)).toBe(true); });`. Done when L2 (`peers.ts:74`, `return false`) dies.
- **Priority**: Minor in impact (the squad runs as one user), counted by the rule.

### Fix 3: PEER-33 does not tell stdin close from the client's `SIGTERM` (mutant L3)

- **Root cause**: `client.close()` ends stdin, waits 2 s, then sends `SIGTERM`; the test waits up to 8 s.
- **Fix task**: in `test/integration/server.test.ts`, replace line 219 with `const closing = session.client.close();`, give the `waitFor` of line 221 a third argument `1500`, and add `await closing;` after it. Done when L3 (`server.ts:318-319` removed) fails the PEER-33 test itself.
- **Priority**: Major (the AC's trigger is not what the test exercises on Linux).

### Fix 4 (optional, spec decision): pin "same executable" and the signals

- **Fix task**: `PATH: "/usr/bin:/bin"` (any `PATH` without `bun`) in the `startSession` env of `server.test.ts:254` kills L5. If the owner makes `SIGTERM`/`SIGINT` a requirement on POSIX, one test sending the signal to `session.transport.pid` and waiting for `peer_left` `unregistered` kills L4.
- **Priority**: Minor

### Fix 5: `kill-broker` on Linux (code)

- **Root cause**: `cli.ts:44` selects by port number; `cli.ts:74` treats any throw as "broker not running".
- **Fix task**: use `tcp@127.0.0.1:${BROKER_PORT}` in the `lsof` call; let a failure to run `lsof` print its own message instead of `Broker is not running.`. Verify with a second listener on `127.0.0.2:<port>` that survives `kill-broker`.
- **Priority**: Major for the address (signals an unrelated process); Minor for the message.

### Spec decisions

- PEER-19 wording on POSIX (gap 4); `SIGINT`/`SIGTERM` on POSIX (gap 5); "only the broker" and a missing `lsof` in PEER-35 (gap 6); the three undecided since round 4 (gaps 1 to 3).

---

## Requirement Traceability Update

Not applied to `spec.md` (the Verifier writes only this report). Proposed:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PEER-01 to PEER-13, PEER-15 to PEER-32, PEER-35 to PEER-41 | Implementing | ✅ Verified |
| PEER-14 | Implementing | ❌ Needs Fix (assert the `EPERM` branch) |
| PEER-33 | Implementing | ❌ Needs Fix (assert the unregister before the client's `SIGTERM`) |
| PEER-34 | Implementing | ❌ Needs Fix (assert the detachment on POSIX) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 38/41 ACs matched spec outcome on every clause | 3 partial gaps (PEER-14, PEER-33, PEER-34, all Linux-only discrimination) | 6 spec-precision gaps
**Sensor**: 18/24 mutations killed; 2 survived on spec'd behavior (L6, L2), 1 killed only by accident (L3), 4 not counted (L4, L5, L8, L10)
**Gate**: 85 passed, 0 failed, `tsc` clean, on Linux

**What works**: everything rounds 1 to 4 reported, now also on Linux: the gate, the `lsof` listener lookup, liveness with `EPERM`, the default home, the git common directory, the detached broker, and unregister on stdin close and on signals. Round 4's two survivors and the `ready` no-arguments error are closed.

**Issues found**: three assertions that do not discriminate on Linux (Fix 1 to 3); `kill-broker` signals listeners on other addresses of the same port and misreports a missing `lsof` (Fix 5); six spec decisions.

**Next steps**: escalate to the owner (rounds are past the three automatic iterations) with Fix 1 to 3 (test-only), Fix 5 (two lines in `cli.ts`) and the spec decisions.
