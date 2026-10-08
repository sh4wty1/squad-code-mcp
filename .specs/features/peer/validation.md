# Peer Validation

**Verdict**: FAIL

**Round**: 6 (re-verification after `f5dd547` and the seven commits of the PR 2 review; second round on Linux)
**Date**: 2026-10-07
**Spec**: `.specs/features/peer/spec.md` (45 requirements: PEER-14, PEER-16 and PEER-19 reworded, PEER-42 to PEER-45 new, two new edge cases)
**Diff range**: `b22f83a..HEAD`, code under `broker/`; verified at `ec2aba6`. In the range only `broker/peers.ts`, `broker/cli.ts`, `broker/package.json`, `broker/bun.lock`, four test files and docs changed; `broker/broker.ts`, `broker/server.ts`, `broker/db.ts` and `broker/shared/` are byte-identical to round 5
**Verifier**: independent sub-agent (author ≠ verifier)
**Machine**: Linux 7.0.0, Bun 1.3.14, MCP SDK 1.32.1, `lsof` present, uid 1000 (not root), `127.0.0.2` can be listened on

The gate is green (92 tests, `tsc` clean). The three round 5 gaps are closed: the `EPERM` branch
(L2), the stdin close (L3) and the detachment (L6) are each killed by the test that names the
requirement. The hand probe of the real broker, the real MCP server and the CLI found **no
answer that contradicts an acceptance criterion**: the code on HEAD is right in every case below.

The verdict is FAIL by the sensor rule. Five behavior-level faults in what this range introduced
pass all 92 tests:

1. **The MCP server heartbeat** (`server.ts:247-253`). PEER-42 made it load-bearing: with the
   `/heartbeat` call removed (S3), all 92 tests pass and a real session leaves the squad with
   `peer_left` `died` 60 s after `ready` and never comes back (run). No AC says the server sends
   heartbeats; the only mention is the Assumptions row "quatro heartbeats de 15 s".
2. **PEER-44 "não consegue achar"** (`cli.ts:78`). With the empty-lookup check removed (C3),
   `kill-broker` prints `Broker stopped.` and exits 0 with the broker up. The one PEER-44 test
   only takes the lookup tool off the `PATH`.
3. **PEER-44 "ou sinalizar"** (`cli.ts:80`). With a failed signal swallowed (C5), same result.
   No test makes the signal fail.
4. **PEER-16 as reworded** (`peers.ts:190`). With `/list-peers` judging liveness by PID alone
   (P13, the behavior before this range), a name whose heartbeat stopped is listed `online`. The
   only "listed offline" test kills the PID.
5. **The 60 s of PEER-14, PEER-42 and PEER-43** (`peers.ts:79`). With the limit at 120 s (P11)
   all tests pass: every assertion on the limit imports `STALE_AFTER_MS` from the code under test.

For 2 to 5 a closing assertion was run in the scratch: it passes on HEAD and fails on its mutant.

Test paths below are relative to `broker/`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 to T13 | ✅ Done | Verified in rounds 1 to 5; the code they cover outside `peers.ts` and `cli.ts` did not change |
| T14 | ✅ Done | L2, L3 and L6 re-applied are killed (P10, S1, S2); the address filter is killed (C1) |
| T15 | ⚠️ Partial | Done-when met. The limit is not pinned to 60 s (P11), the listing is not tested against the heartbeat rule (P13), and the heartbeat the rule depends on has no test (S3) |
| T16 | ⚠️ Partial | Done-when met (lookup tool off the `PATH`). The empty lookup and the failed signal have no test (C3, C5) |
| T17 | ✅ Done | Done-when confirmed: `tcp:<porta>` re-applied (C1) is killed by `test/integration/cli.test.ts:85` |
| T18 | ✅ Done | One unit test of the default, one integration test with the home redirected; see "Not verified" for what Linux cannot tell |
| T19 | ✅ Done | Lockfile resolves 1.32.1; ping and `ready` tests pass unchanged |
| T20 | ✅ Done | Docs only; not part of the coverage check |

---

## Round 5 gaps

| # | Round 5 gap | Status | Evidence |
| - | ----------- | ------ | -------- |
| 1 | PEER-34 detachment not asserted on Linux (L6) | ✅ Closed | `test/integration/server.test.ts:262` - `expect(text(["ps", "-o", "pgid=", "-p", brokerPid])).toBe(brokerPid)`. S2 (`detached: false`) is killed by that test |
| 2 | PEER-14 `EPERM` branch untested (L2) | ✅ Closed | `test/unit/presence.test.ts:7` - `expect(pidAlive(1)).toBe(true)`. P10 is killed by that test (holds only when the suite does not run as root) |
| 3 | PEER-33 passed through the client's `SIGTERM` (L3) | ✅ Closed | `test/integration/server.test.ts:222` waits at most 1500 ms for `peer_left`, before the 2 s `SIGTERM` of the SDK. S1 (both stdin handlers removed) is killed by the PEER-33 test itself |
| 4 | `kill-broker` signals listeners on other addresses | ✅ Closed | PEER-45, `cli.ts:45`, `test/integration/cli.test.ts:85-86`; C1 killed |
| 5 | `kill-broker` says `Broker is not running.` without `lsof` | ✅ Closed for the missing tool | PEER-44, `cli.ts:76-86`, `test/integration/cli.test.ts:58-61`; C4 and C6 killed. The other two ways to fail are gaps 2 and 3 of this round |

---

## Hand probe (run, real processes, own port and temp database)

| Probe | Result |
| ----- | ------ |
| Real `server.ts` session, `ready`, then 80 s idle with the broker cleaning every 1 s | Still registered; `last_seen` moved by 75 025 ms (five heartbeats); only `peer_joined` in the log |
| Same, with the heartbeat call removed (mutant S3) | Row gone at 80 s; log is `peer_joined`, `peer_left` `died` |
| Broker started over two rows an hour old with live PIDs | Both kept at +3 s and listed `online` (PEER-43); the one that got heartbeats stays at +64 s; the silent one is kept at +58 s and gone at +64 s with `peer_left` `died` (PEER-42), listed `offline`, and its role registers again |
| `kill-broker`, `lsof` on the `PATH` prints nothing | `Could not stop the broker: no process found listening on 127.0.0.1:<port>. It is still running.` on stderr, exit 1, broker up |
| `kill-broker`, `lsof` names a PID that no longer exists | `Could not stop the broker: kill() failed: ESRCH: No such process. It is still running.`, exit 1, broker up |
| `kill-broker`, no `lsof` on the `PATH` | `Could not stop the broker: Executable not found in $PATH: "lsof". It is still running.`, exit 1, broker up |
| `kill-broker`, normal | `Broker stopped.`, exit 0, broker ended by `SIGTERM`, `/health` silent |
| `kill-broker` and `status` with the broker down | `Broker is not running.`, exit 0 |
| `~/.squad-code-mcp.db` | Absent before and after the round |

---

## Spec-Anchored Acceptance Criteria

Every row was re-derived from the test files at `ec2aba6`.

### P1: Registro com nome e papel

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-01 | row with name, role, pid, cwd, git_root, `registered_at` = `last_seen` in epoch ms; `{ id }` non-empty text | `test/unit/register.test.ts:22-33` - `expect(b.rows()).toEqual([{ id: result.id, name: "mother", role: "mother", pid: 100, cwd: "/repo/main", git_root: "/repo/.git", registered_at: NOW, last_seen: NOW }])`; `:21` id length; `test/integration/broker.test.ts:42` - `expect(Object.keys(res.json)).toEqual(["id"])` | ✅ PASS |
| PEER-02 | same transaction; `peer_joined`, `from_name`/`role_from` `broker`, `to_name` and `feature_id` null, `summary` empty, `data` `{ peer, role }` | `test/unit/register.test.ts:47-54` - six `toBe`/`toBeNull` plus `expect(event.data).toEqual({ peer: "worker-2", role: "worker" })`; transaction: `:197-198` - `expect(() => b.join(...)).toThrow()`, `expect(b.rows()).toEqual([])` | ✅ PASS |
| PEER-03 | `{ ok: false, error: "invalid_role", hint }`, nothing written | `test/unit/register.test.ts:59-60` through `expectRefusal` (`:9-14`: `ok` false, `error`, `hint` non-empty, row and event counts unchanged) | ✅ PASS |
| PEER-04 | `invalid_name`, nothing written | `test/unit/register.test.ts:65-67`, `:72-74` (name of another role) | ✅ PASS |
| PEER-05 | `role_taken` for `mother`, `leader`, `judge` | `test/unit/register.test.ts:81` - `expectRefusal(b, () => b.join(role, role, 101), "role_taken")`, one test per role | ✅ PASS |
| PEER-06 | `worker_limit` with three live workers | `test/unit/register.test.ts:90` | ✅ PASS |
| PEER-07 | `name_taken` | `test/unit/register.test.ts:96` | ✅ PASS |
| PEER-08 | `peer_left` `{ peer, reason: "died" }`, then the new registration, different `id` | `test/unit/register.test.ts:105` - `expect(second.id).not.toBe(first.id)`; `:107-111` - the three events in order | ✅ PASS |
| PEER-09 | earlier row leaves with `died` before the new `peer_joined`, and does not count as occupant | `test/unit/register.test.ts:133-137` and `:176-180` (same name: would be `role_taken` if the earlier row counted) | ✅ PASS |
| PEER-41 | refused: earlier registration stays, no event | `test/unit/register.test.ts:187-191` - `expectRefusal(..., "role_taken")`, `expect(rows).toEqual([["mother", 101], ["worker-1", 100]])` | ✅ PASS |
| PEER-10 | `missing_field` for bad `pid`, `cwd`, `git_root` | `test/unit/register.test.ts:143-147` (pid 0, -1, `"100"`, 1.5, absent), `:153-156` (cwd `""`, absent, 5, object), `:219-220` (git_root object, number) | ✅ PASS |
| PEER-37 | every refusal is HTTP 200 with non-empty text `hint` | `test/integration/broker.test.ts:54-58` - `expect(res.status).toBe(200)`, `typeof hint`, length; `:97-100`, `:184-188`, `:226-229` for the other refusals over HTTP | ✅ PASS |
| PEER-39 | non-object body on the four routes: `missing_field`, nothing written | `test/integration/broker.test.ts:182-190` - five bodies per route, `expect(json.error).toBe("missing_field")`, `expect(readDb(...)).toEqual({ events: [], peers: [] })` | ✅ PASS |

### P1: Presença na saída

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-11 | row deleted, `peer_left` from `broker` with `{ peer, reason: "unregistered" }`, `{ ok: true }` | `test/unit/presence.test.ts:15-22`; `test/integration/broker.test.ts:108` - `expect(res.json).toEqual({ ok: true })`, `:113-117` | ✅ PASS |
| PEER-12 | unknown, absent or non-text `id`: `{ ok: true }`, no event | `test/unit/presence.test.ts:29-30`; `test/integration/broker.test.ts:111`, `:224`, `:231` | ✅ PASS |
| PEER-13 | PID gone: row deleted, `peer_left` `{ peer, reason: "died" }` | `test/unit/presence.test.ts:38-43` - `expect(last.data).toEqual({ peer: "judge", reason: "died" })`; `:53-56`; real process: `test/integration/broker.test.ts:164-168` | ✅ PASS |
| PEER-14 | PID exists and `last_seen` 60 s old or less: row kept, no event | `test/unit/presence.test.ts:64-65`; at 60 s exact `:156-157` - `expect(rows).toEqual(["judge"])`, `expect(kinds).toEqual(["peer_joined"])`; heartbeat `:176-177`; `EPERM` `:7` | ⚠️ PASS, the 60 is not pinned (P11) |
| PEER-42 | `last_seen` older than 60 s: row deleted, `peer_left` `died`, even with a live PID | `test/unit/presence.test.ts:161-165` - `expect(b.rows()).toEqual([])`, events equal `peer_joined` then `["peer_left", { peer: "judge", reason: "died" }, NOW + STALE_AFTER_MS + 1]` | ⚠️ PASS, the 60 is not pinned (P11) |
| PEER-43 | broker start, or cleanup more than 60 s after the previous one, restarts the 60 s for every peer with an older `last_seen` | start: `test/unit/presence.test.ts:208` (both kept at start), `:215` (kept at start + 60 s), `:220-223` (silent one leaves at + 60 s + 1, the one with a heartbeat stays); pause: `:235-236` (kept), `:240` (leaves 60 s + 1 after the late cleanup) | ⚠️ PASS, the 60 is not pinned (P11) |
| PEER-15 | `seq` integer greater than every earlier one; `ts` epoch ms | `test/unit/db.test.ts:13-17`, `:24` - `expect(row.ts).toBe(1791331200123)`; `ts` of real events: `test/unit/register.test.ts:55`, `test/unit/presence.test.ts:22` | ✅ PASS |
| PEER-38 | cleanup at start and every 30 s | start: `test/integration/broker.test.ts:152-156`; interval: `:164-168`; default: `test/unit/config.test.ts:30` - `expect(cleanupIntervalMs({})).toBe(30000)` | ✅ PASS |

### P1: Listagem sem credencial

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-16 | the other five names, `{ name, role, online }`, `online` true only for a registered name the cleanup keeps (PEER-14) | `test/unit/presence.test.ts:73-79`, `:140-146` (worker caller), `:88` - `expect(leader.online).toBe(false)` after the PID is gone; `test/integration/broker.test.ts:87-93` | ❌ GAP: no listing of a name with a live PID and a `last_seen` older than 60 s (P13 survives) |
| PEER-17 | no field besides `name`, `role`, `online` | `test/unit/presence.test.ts:97` - `expect(Object.keys(item).sort()).toEqual(["name", "online", "role"])`; `:100-101`; `test/integration/broker.test.ts:94` | ✅ PASS |
| PEER-18 | unknown, absent, non-text `id`: `{ ok: false, error: "unknown_peer", hint }` | `test/unit/presence.test.ts:108-110`; `test/integration/broker.test.ts:98-100`, `:227-229` | ✅ PASS |

### P1: Broker próprio e rodando no Windows

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-19 | without `SQUAD_DB`, `<os.homedir()>/.squad-code-mcp.db` | `test/unit/config.test.ts:7` - `expect(dbPath({})).toBe(join(homedir(), ".squad-code-mcp.db"))`; real broker: `test/integration/broker.test.ts:134-135` | ✅ PASS on Linux. "Não depende de `HOME` no Windows" cannot be told here (G1) |
| PEER-20 | default port 7900; only `127.0.0.1` | `test/unit/config.test.ts:15`; `test/integration/broker.test.ts:196`, `:211` - `expect(reached.filter(...)).toEqual([])` | ✅ PASS |
| PEER-21 | `last_seen` to now, `registered_at` kept, `{ ok: true }`; unknown `id` changes nothing | `test/unit/presence.test.ts:118-119`, `:131`; `test/integration/broker.test.ts:69-73`, `:77`, `:221` | ✅ PASS |
| PEER-22 | `{ status: "ok", peers: n }` | `test/integration/broker.test.ts:33`, `:35` | ✅ PASS |
| PEER-23 | 404 on any other `POST`, any body or none | `test/integration/broker.test.ts:124`, `:175` | ✅ PASS |
| PEER-34 | broker started detached with the same executable; answers after the server exits | `test/integration/server.test.ts:257`, `:262` (own process group), `:276` | ✅ PASS ("same executable" stays the Assumptions row) |
| PEER-35 | broker process ends, `/health` stops, no `lsof` on Windows | `test/integration/cli.test.ts:45-48` - `waitFor(!isUp)`, `await proc.exited`, `expect(await isUp(url)).toBe(false)` | ✅ PASS on Linux; the Windows branch (`cli.ts:31-41`) was read, not run |
| PEER-36 | `Broker: ok (<n> peer(s) registered)` | `test/integration/cli.test.ts:35`, `:37` | ✅ PASS |
| PEER-44 | `/health` answers and the CLI cannot find **or** signal the process: `Could not stop the broker: <motivo>. It is still running.`, no `Broker is not running.`, exit 1 | `test/integration/cli.test.ts:58-61` - `expect(res.code).toBe(1)`, `expect(res.err).toMatch(/^Could not stop the broker: .+\. It is still running\.$/m)`, `not.toContain("Broker is not running.")`, broker up | ❌ GAP: one of three ways covered (lookup tool missing). Lookup that finds nothing (C3) and failed signal (C5) have no evidence |
| PEER-45 | only the listener on `127.0.0.1` is signalled | `test/integration/cli.test.ts:80-86` - exit 0, broker stops, `expect(decoy.exitCode).toBeNull()`, `expect(await (await fetch(decoyUrl)).text()).toBe("decoy")` | ✅ PASS on Linux; skipped where `127.0.0.2` cannot be listened on (macOS); the `netstat` filter (`cli.ts:37`) was read, not run |

### P1: Repositório comum entre worktrees

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-24 | absolute git common directory, same as the main checkout | `test/unit/git.test.ts:24-26` - `isAbsolute`, `endsWith("/main/.git")`, `expect(fromWorktree).toBe(fromMain)` | ✅ PASS |
| PEER-25 | `null` outside a repository | `test/unit/git.test.ts:35` | ✅ PASS |

### P1: Registro que prova o canal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PEER-26 | no role: zero tools, no ping, no registration | `test/integration/server.test.ts:84`, `:86`, `:88` | ✅ PASS (`SQUAD_ROLE` empty is still not asserted: `helpers.ts:54` drops empty variables) |
| PEER-27 | channel ping, integer 100000 to 999999 drawn in the process, in the text and in `meta.number`; only `ready`; not registered | `test/integration/server.test.ts:96-103`, `:286` | ✅ PASS |
| PEER-28 | same ping every 10 s or `SQUAD_PING_INTERVAL_MS` | `test/integration/server.test.ts:110-114`, `:127`; `test/unit/config.test.ts:25` | ✅ PASS |
| PEER-29 | wrong number: error, no registration, only `ready` | `test/integration/server.test.ts:135`, `:138-140` | ✅ PASS |
| PEER-30 | registers with pid, cwd, git_root, name, role; ping stops; `list_changed`; role tools without `ready` | `test/integration/server.test.ts:152-158`, `:160-164`, `:168` | ✅ PASS |
| PEER-31 | refusal: error with `error` and `hint`, only `ready`, ping stops | `test/integration/server.test.ts:179-183`, `:187` | ✅ PASS |
| PEER-32 | text with name, role, `online`/`offline` of the others, no `id` | `test/integration/server.test.ts:202-210` | ✅ PASS |
| PEER-33 | stdin closes while registered: `/unregister` | `test/integration/server.test.ts:222` (within 1500 ms, before the SDK's `SIGTERM`), `:225-229` | ✅ PASS |
| PEER-40 | unlisted tool: `Unknown tool`, broker not called | `test/integration/server.test.ts:299-300`, `:304-305`, `:308-309` | ✅ PASS |

**Status**: ❌ Gaps present. 43/45 ACs matched on every clause; PEER-16 and PEER-44 have a clause without evidence; the 60 s limit of PEER-14, PEER-42 and PEER-43 is asserted only relative to the constant in the code.

### Spec-precision gaps

1. **No AC says the MCP server sends heartbeats** (new, run). Before this range the heartbeat changed a column nobody read. PEER-42 now removes any peer silent for 60 s, so the 15 s timer of `server.ts:247-253` is what keeps a squad together. It appears only in the Assumptions row ("quatro heartbeats de 15 s"). A server without it passes the suite (S3) and breaks every session after a minute. The spec needs an AC such as "WHILE registrado the servidor MCP SHALL chamar `/heartbeat` a cada 15 s", and the interval needs an override like `SQUAD_PING_INTERVAL_MS` to be testable.
2. **PEER-44 does not say where the message is printed**. The test pins stderr (`cli.test.ts:59` reads `res.err`); "imprimir" in PEER-36 means stdout. Harmless, but the stream is decided by the test, not by the spec.
3. **`SIGINT` / `SIGTERM` in the MCP server** (carried from round 5, read). The Assumptions row still leaves them out of the requirements; they are testable on Linux.
4. **`ready` with the number as text or a one-item list, `POST //register`, non-POST methods on the four routes** (carried from round 5, not re-run: `server.ts` and `broker.ts` did not change in this range).

Round 5 gaps 4 (PEER-19 wording) and 6 (`kill-broker` scope) are closed by the amendments.

---

## Discrimination Sensor

Scratch: a copy of the tracked files of `broker/` at `ec2aba6` with `node_modules` symlinked, under the session scratchpad. One fresh copy per mutant, `bun x tsc --noEmit` then the full `bun test`. Every mutant type-checks. The scratch baseline is 92 pass.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| P1 | `peers.ts:110` | `silentFor > STALE_AFTER_MS` → `>=` | ✅ Killed by `PEER-14/42: a peer with a live pid stays for 60 s...` and 4 more |
| P2 | `peers.ts:109` | silence counted from `last_seen` only (PEER-43 off) | ✅ Killed by both PEER-43 tests |
| P3 | `peers.ts:109` | silence counted from `listeningSince` only (heartbeats ignored) | ✅ Killed by `PEER-14: a heartbeat within the last 60 s keeps the peer` |
| P4 | `peers.ts:102` | pause detection removed | ✅ Killed by `PEER-43: a cleanup more than 60 s after the previous one...` |
| P5 | `peers.ts:102` | `t - lastCleanup > STALE_AFTER_MS` → `>=` | ✅ Killed by the same test |
| P6 | `peers.ts:103` | `lastCleanup = t` removed | ✅ Killed by `PEER-14/42` and 3 more |
| P7 | `peers.ts:94` | `listeningSince = 0` (and with it `lastCleanup = 0`) | ⚪ Survived, equivalent: the first cleanup is then always a "return from pause" and sets `listeningSince`. Not counted |
| P7b | `peers.ts:94-95` | `listeningSince = 0`, `lastCleanup = now()` | ✅ Killed by `PEER-43: a broker that starts over old rows...` |
| P8 | `peers.ts:110` | heartbeat rule removed (PID only) | ✅ Killed by `PEER-14/42`, `PEER-42/05`, both PEER-43 |
| P9 | `peers.ts:110` | PID rule removed (heartbeat only) | ✅ Killed by 8 tests (PEER-13, PEER-38, PEER-08, PEER-16) |
| P10 | `peers.ts:74` | `EPERM` counts as dead (round 5 L2) | ✅ Killed by `PEER-14: a pid that exists under another user is alive` |
| P11 | `peers.ts:79` | `STALE_AFTER_MS` 60 000 → 120 000 | ❌ Survived |
| P11b | `peers.ts:79` | `STALE_AFTER_MS` 60 000 → 45 000 | ✅ Killed by `PEER-14: a heartbeat within the last 60 s keeps the peer` (the one test with literal times) |
| P12 | `peers.ts:190` | `cleanStale()` removed from `listPeers` | ✅ Killed by `PEER-16: a registered name whose pid is gone is listed as offline` |
| P13 | `peers.ts:190` | `listPeers` removes only peers whose PID is gone, as before this range | ❌ Survived |
| P14 | `peers.ts:143` | `register` removes only peers whose PID is gone | ✅ Killed by `PEER-42/05: a role held by a silent row...` |
| P15 | `peers.ts:185` | heartbeat does not write `last_seen` | ✅ Killed by both PEER-21 tests and 2 more |
| C1 | `cli.ts:45` | `tcp@127.0.0.1:<port>` → `tcp:<port>` | ✅ Killed by `PEER-45` |
| C3 | `cli.ts:78` | empty-lookup check removed | ❌ Survived |
| C4 | `cli.ts:85` | `process.exitCode = 1` removed | ✅ Killed by `PEER-44` |
| C5 | `cli.ts:80` | error of `process.kill` swallowed | ❌ Survived |
| C6 | `cli.ts:84` | failure prints `Broker is not running.` (behavior before F2) | ✅ Killed by `PEER-44` |
| C7 | `cli.ts:80` | no signal sent | ✅ Killed by `PEER-35`, `PEER-45`, `PEER-34` |
| S1 | `server.ts:318-319` | both stdin handlers removed (round 5 L3) | ✅ Killed by `PEER-33` |
| S2 | `server.ts:79` | `detached: false` (round 5 L6) | ✅ Killed by `PEER-34` |
| S3 | `server.ts:249` | `/heartbeat` call removed | ❌ Survived |
| G1 | `shared/config.ts:29` | `homedir()` → `process.env.HOME ?? ""` | ⚪ Survived on Linux, where the two are the same value whenever `HOME` is set. Not counted; see "Not verified" |

**Sensor depth**: expanded (27 mutants; liveness is data integrity of the presence log)
**Result**: 20 killed, 5 survived on spec'd behavior (P11, P13, C3, C5, S3), 2 not counted (P7 equivalent, G1 not discriminable on Linux) - FAIL ❌

**Isolation**: `git status --porcelain -- broker .specs` before and after the sensor is identical (other people's edits outside those paths ignored, as instructed). The scratch was deleted. One broker left running by mutant C7 (its PEER-34 cleanup could not stop it) was stopped by PID, and the seven `squad-test-*` temp directories this round left in the system temp directory were removed.

### Closing assertions (run in the scratch, pass on HEAD, fail on the mutant)

- **P13**: register `mother` and `leader`; at +30 s heartbeat `mother` and run the cleanup; at +60 001 ms `listPeers(mother.id)`; `expect(leader.online).toBe(false)`.
- **P11**: `expect(STALE_AFTER_MS).toBe(60000)` (or literal times in the PEER-42 and PEER-43 tests).
- **C3**: a `PATH` holding only an `lsof` script that prints nothing; `expect(res.code).toBe(1)`, the PEER-44 message, `not.toContain("Broker stopped.")`, broker up. POSIX only.
- **C5**: same with an `lsof` script that prints the PID of a process that already exited. POSIX only.
- **S3**: none run. The 15 s interval is a constant in `server.ts:38`; a test needs an override or 16 s of wall time.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `peers.ts` +24 lines, `cli.ts` +24 lines for four requirements |
| Surgical changes | ✅ Only `peers.ts`, `cli.ts`, tests, the SDK version and docs |
| No scope creep | ✅ |
| Matches patterns | ✅ Injected clock and liveness, as before |
| Spec-anchored outcome check (asserted values match spec) | ❌ The 60 s limit is asserted through the code's own constant (P11) |
| Per-layer Coverage Expectation met | ❌ PEER-44 covers one of its failure paths; PEER-16 does not cover its new clause |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Each test names its PEER id, a listed edge case or an Assumptions row (refusal order) |
| Documented guidelines followed: none - strong defaults applied | ✅ |

---

## Edge Cases

- [x] Valid role, name of another role → `invalid_name`: `test/unit/register.test.ts:72-74`
- [x] Three workers, one dead, new worker takes the name: `test/unit/register.test.ts:120-125`
- [x] Refusal with no dead peer leaves `peers` and `events` counts unchanged: `test/unit/register.test.ts:14`
- [x] Path with a space: `test/integration/server.test.ts:235`, `:257`
- [x] Refusal after the cleanup keeps the `peer_left` of the dead peer: `test/unit/register.test.ts:207-213`
- [x] **New**: stale row whose PID now belongs to another process frees the role after 60 s: `test/unit/presence.test.ts:186` (`role_taken` at 60 s), `:189-195` (accepted after, `peer_left` `died` then `peer_joined`). Killed P14
- [x] **New**: a live peer that heartbeats after the broker returns from more than 60 s is kept: `test/unit/presence.test.ts:215`, `:220`; also run against the real broker
- [x] Event write fails → peer not stored: `test/unit/register.test.ts:197-198`
- [x] Refusal decided before the cleanup does not log a dead peer: `test/unit/register.test.ts:232-236`

---

## Gate Check

- **Gate command**: `bun x tsc --noEmit && bun test` in `broker/`
- **Result**: 92 passed, 0 failed, 0 skipped on this machine, 511 `expect()` calls, 10.6 s; `tsc` clean
- **Test count in round 5**: 85
- **Test count now**: 92
- **Delta**: +7 (one PEER-19 unit test removed by T18 with its reason in the commit and in `tasks.md`: it could not fail)
- **Skipped tests**: none here. `presence.test.ts:6` skips on Windows; `cli.test.ts:64` skips where `127.0.0.2` cannot be listened on
- **Failures**: none

---

## Not verified

- Windows: nothing was run there in this round. `cli.ts:31-41` (`netstat`, including the `127.0.0.1` filter of PEER-45) and PEER-35 "sem depender de `lsof` no Windows" were read only.
- PEER-19 "não depende da variável `HOME` no Windows": on Linux `os.homedir()` is `HOME` whenever it is set, so G1 cannot be told apart here. By reading, `broker.test.ts:131-135` kills G1 on Windows (it removes `HOME` and sets `USERPROFILE`); not run.
- PEER-45 on macOS: the test skips itself there.
- P10 as root: pid 1 would answer the signal without `EPERM` and the mutant would survive.
- The default port 7900 and the default database were never opened by a real process.
- Round 5 spec-precision gaps on `server.ts` and `broker.ts` were carried by reading that the files did not change, not re-run.

---

## Fix Plans

Ranked. Fixes 2 to 5 are test-only.

### Fix 1: the heartbeat the liveness rule depends on has no requirement and no test (S3)

- **Root cause**: PEER-42 turned the 15 s timer of `server.ts:247-253` into a requirement without writing it down.
- **Fix task**: add the AC to `spec.md`; make the interval overridable (`SQUAD_HEARTBEAT_INTERVAL_MS`, default 15000, unit test of the default); integration test: session registers, `last_seen` in the database moves forward without the test calling `/heartbeat`.
- **Priority**: Major

### Fix 2: PEER-44 with a lookup that finds nothing (C3)

- **Fix task**: the C3 closing assertion in `test/integration/cli.test.ts`, skipped on Windows.
- **Priority**: Major

### Fix 3: PEER-44 with a signal that fails (C5)

- **Fix task**: the C5 closing assertion.
- **Priority**: Major

### Fix 4: PEER-16 against the heartbeat rule (P13)

- **Fix task**: the P13 closing assertion in `test/unit/presence.test.ts`.
- **Priority**: Minor

### Fix 5: pin the 60 s (P11)

- **Fix task**: `expect(STALE_AFTER_MS).toBe(60000)`, or literal times in the PEER-42 and PEER-43 tests.
- **Priority**: Minor

---

## Requirement Traceability Update

Not applied to `spec.md` (the Verifier writes only this report). Proposed:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PEER-01 to PEER-13, PEER-15, PEER-17 to PEER-41, PEER-43, PEER-45 | Implementing | ✅ Verified (PEER-19, PEER-35 and PEER-45: on Linux) |
| PEER-14, PEER-42 | Implementing | ❌ Needs Fix (pin the 60 s; add the heartbeat requirement they depend on) |
| PEER-16 | Implementing | ❌ Needs Fix (list a name whose heartbeat stopped) |
| PEER-44 | Implementing | ❌ Needs Fix (empty lookup and failed signal) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 43/45 ACs matched spec outcome on every clause | 2 with a clause without evidence (PEER-16, PEER-44) | 60 s limit not pinned (PEER-14, PEER-42, PEER-43) | 4 spec-precision gaps (1 new and serious, 1 new and harmless, 2 carried)
**Sensor**: 20/27 mutations killed; 5 survived on spec'd behavior (S3, C3, C5, P13, P11); 2 not counted (P7, G1)
**Gate**: 92 passed, 0 failed, `tsc` clean, on Linux

**What works**: the code. Every probe of the real broker, server and CLI matched the spec: liveness by PID and heartbeat, the restart and pause rule, the three failure messages of `kill-broker`, the address filter, the detached broker, unregister on stdin close. The three round 5 gaps are closed.

**Issues found**: four test gaps on what this range added (Fix 2 to 5) and one missing requirement with its test (Fix 1).

**Next steps**: Fix 1 needs a spec decision (new AC and an interval override); Fix 2 to 5 are four assertions already shown to pass on HEAD and fail on their mutants.
