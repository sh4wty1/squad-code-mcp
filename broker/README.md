# squad broker

The broker of [squad-code-mcp](../README.md): a daemon on `127.0.0.1` with SQLite, and one MCP stdio server per Claude Code session. Sessions join it with a name and a role, and their presence is logged as events.

It is a fork of [louislva/claude-peers-mcp](https://github.com/louislva/claude-peers-mcp) at commit `640183f`, by Louis Arge, under the MIT license in [`LICENSE`](LICENSE). The first commit of this directory is that code unchanged; `git diff 10e92d3 -- broker` shows everything the fork changed.

> **Status:** the Peer slice. Sessions register and are listed. Sending and reading events comes with the Event slice.

## Requirements

- [Bun](https://bun.sh) 1.3 or newer
- git 2.31 or newer
- Claude Code with a claude.ai login, for the channel

Runs on Windows and Linux. macOS is untested.

## Run

```bash
cd broker
bun install
bun test
```

A session joins the squad when it is launched with a name and a role:

```bash
SQUAD_NAME=leader SQUAD_ROLE=leader claude --dangerously-load-development-channels server:squad
```

```powershell
$env:SQUAD_NAME = "leader"; $env:SQUAD_ROLE = "leader"
claude --dangerously-load-development-channels server:squad
```

`server:squad` is the entry in [`.mcp.json`](.mcp.json). The broker starts by itself the first time, and keeps running after the session ends.

The names are `mother`, `leader`, `judge` and `worker-1` to `worker-3`. A session without `SQUAD_ROLE` is a regular Claude Code session: the server exposes no tools and does not register.

## How a session joins

The server does not register when it starts. It pushes a ping with a number through the channel, every 10 s, and exposes one tool, `ready`. When the model calls `ready` with that number, the server registers with the broker and swaps `ready` for the tools of the role. A registered peer is therefore one whose channel works end to end; a session that cannot hear the channel never shows up as online.

## Settings

| Variable | Default | What |
| --- | --- | --- |
| `SQUAD_NAME` | none | Name of the session in the squad |
| `SQUAD_ROLE` | none | `mother`, `leader`, `worker` or `judge` |
| `SQUAD_PORT` | `7900` | Port of the broker |
| `SQUAD_DB` | `~/.squad-code-mcp.db` | SQLite database |
| `SQUAD_PING_INTERVAL_MS` | `10000` | Interval of the channel ping |
| `SQUAD_HEARTBEAT_INTERVAL_MS` | `15000` | Interval of the heartbeat of a registered session |
| `SQUAD_CLEANUP_INTERVAL_MS` | `30000` | Interval of the dead-session cleanup |

Port and database differ from claude-peers (`7899`, `~/.claude-peers.db`), so both can run on the same machine.

## Routes

Every route is a `POST` with a JSON body, except `/health`. A refusal is a `200` with `{ ok: false, error, hint }`, where `hint` says the next valid step.

| Route | Body | Answer |
| --- | --- | --- |
| `/register` | `{ pid, cwd, git_root, name, role }` | `{ id }`, or a refusal: `missing_field`, `invalid_role`, `invalid_name`, `role_taken`, `worker_limit`, `name_taken` |
| `/list-peers` | `{ id }` | `[{ name, role, online }]` for the other five names, or `unknown_peer` |
| `/heartbeat` | `{ id }` | `{ ok: true }` |
| `/unregister` | `{ id }` | `{ ok: true }` |
| `GET /health` | | `{ status: "ok", peers }` |

The `id` is a credential: it comes back from `/register` and is never listed.

A peer that registers writes a `peer_joined` event. One that unregisters writes `peer_left` with `unregistered`. One whose process is gone at the cleanup, or whose last heartbeat is more than 60 s old, writes `peer_left` with `died`. The 60 s count from the start of the broker for a peer that was registered before it.

## CLI

```bash
bun cli.ts status        # broker state and number of registered peers
bun cli.ts kill-broker   # stop the broker
```

## Files

- `broker.ts`: the HTTP daemon
- `peers.ts`: registration, refusals, presence and listing
- `db.ts`: schema and the write path of the event log
- `server.ts`: the MCP server of a session
- `cli.ts`: status and stop
- `shared/config.ts`, `shared/git.ts`: settings and the git common directory
- `test/unit`, `test/integration`: `bun test`

The design is in [`.design/squad-mvp.md`](../.design/squad-mvp.md) and the decisions in [`docs/adr/`](../docs/adr/).
