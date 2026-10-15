# squad broker

The broker of [squad-code-mcp](../README.md): a daemon on `127.0.0.1` with SQLite, and one MCP stdio server per Claude Code session. Sessions join it with a name and a role. What they send to each other, their presence and every refusal are events of one append-only log.

It is a fork of [louislva/claude-peers-mcp](https://github.com/louislva/claude-peers-mcp) at commit `640183f`, by Louis Arge, under the MIT license in [`LICENSE`](LICENSE). The first commit of this directory is that code unchanged; `git diff 10e92d3 -- broker` shows everything the fork changed.

> **Status:** the Peer, Event and Feature slices, and the reading TUI. Sessions register, the mother opens and closes the feature, and inside it the squad sends `task`, `result` and `verdict` along its edges, receives them through the channel and reads the log. The TUI shows the squad from that log and writes three things with the human credential: the answer of the dev to a question, the decision of a gate and the decision of a permission request.

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

## How a session receives

Once registered, the server asks the broker every second for what was sent to its name. It pushes each event through the channel, in order of `seq`, and only then confirms it with `/ack`. What is not confirmed comes back in the next polling, also to the next session of that name: a session that falls loses nothing.

The push carries the summary, the body and the fields of the kind as text, and `kind`, `seq`, `from` and `ticket_ref` as attributes. The `seq` is what the answer cites: `task_seq` in a result, `result_seq` in a verdict.

## Permission prompts

A session with a role declares `claude/channel/permission`. When Claude Code asks for a permission, the server records a `permission_request` addressed to `human`. The decision goes to `/permission-decision` with the human credential, and reaches the session as the verdict of that request, not as a message to the model. The dev decides it in the TUI, with `x`. A request is closed once it is decided, or once its session wrote another event or left.

The human credential is a token in a file, `~/.squad-code-mcp.token` by default. The broker creates it when it starts and it is in no answer and no event. Any process of the user can read the file: it keeps an agent from approving its own request by mistake, not on purpose.

## TUI

```bash
cd broker
bun tui.ts        # or: bun run tui
```

It needs a terminal of 120×40 or more, and shows only the size it has while the terminal is smaller. It reads `GET /events` every second and writes only the answer to a question (`/answer`), the decision of a gate (`/gate-decision`) and the decision of a permission request (`/permission-decision`), with the human credential read from its file at each send. It shows the feed, the agents and the tickets with the status derived from the log, the topology and the thread of a ticket. While the broker does not answer, the last state stays on the screen, frozen, and the TUI keeps trying. Launch it from the repository of the mother: the name of the project in the first line is the name of the repository of the directory it starts in.

| Key | What |
| --- | --- |
| `1` `2` `3` `?` | Main screen, topology, thread, legend |
| `esc` | Back to the main screen |
| `j` `k` `↑` `↓` | Move the selection of the feed, or scroll the thread |
| `enter` | Open the thread of the ticket of the selected line |
| `[` `]` | Ticket before and after, in the thread |
| `tab` `shift+tab` | Panel in focus |
| `p` | Pause and resume the feed |
| `b` | Go to the oldest blocking question that waits for you |
| `t` | Tokens of the feature or of the session, in the footer |
| `g` | The modal of the oldest pending gate: `a` asks to confirm and `y` approves, `r` rejects and `c` comments with a text, `]` `[` go along the queue, `esc` closes without deciding |
| `x` | The modal of the oldest open permission request: `j` `k` `G` scroll the command, `a` allows once its end is in view, `d` denies, `]` `[` go along the queue, `esc` closes and the request stays open |
| `m` | Turn the mouse off and on |
| `q` `ctrl+c` | Quit |

The mouse does what the keys do, and nothing else. A click on a tab, on a shortcut of the last line, on the counter of questions of the first line or on the cost of the footer is the key it shows. A click on a line of the feed selects it, and a click on the selected line opens it; a click on a ticket opens its thread. On the tab of questions a click selects a question, and a click on the selected one opens the modal of answer. The wheel moves the selection of the feed three lines at a time, and scrolls the thread, the list of questions and their history. In the modal of answer a click on an option only marks it: the answer is sent by `enter` or by a click on the shortcut of `enter` in the last line, and a click outside the box closes the modal like `esc`. The modals of gate and of permission follow the same rule: a click on an item of the queue goes to it, and the decision comes only from a shortcut of the last line; a click less than 500 ms after the one before it does nothing in a modal.

While the TUI asks for the mouse, dragging no longer selects text in the terminal. `m` turns the mouse off and on, and `SQUAD_TUI_MOUSE=0` starts the TUI with it off. Most terminals also select with `shift` + drag while a program asks for the mouse. If the TUI is killed without warning, the terminal keeps sending reports to the shell until `reset` or until the tab is closed.

The mouse probe shows what the terminal sends:

```bash
bun tui/mouse-probe.ts
```

It writes one line for each report of a button or of the wheel that reaches it, with the button, the column and the line, and exits 1 outside a terminal; `q` or ctrl+c leaves. A terminal where a click writes no line does not send reports, and the TUI works there by the keys alone.

To see it without a squad, the demo opens it over the log of one of the test frames, served by a broker of its own on a free port:

```bash
bun run demo          # or: bun run demo 22g
```

The frames are the keys of `LOGS` in `test/frames/logs.ts`; a name that is not one of them lists them all.

The screens assume every glyph outside ASCII takes one cell. The probe asks the terminal:

```bash
bun tui/probe.ts
```

It prints the width of each glyph and exits 0 if all are one cell, 2 if some is not, and 1 outside a terminal. A glyph the terminal counts as two goes in `SQUAD_TUI_GLYPHS` with what to write in its place.

## Settings

| Variable | Default | What |
| --- | --- | --- |
| `SQUAD_NAME` | none | Name of the session in the squad |
| `SQUAD_ROLE` | none | `mother`, `leader`, `worker` or `judge` |
| `SQUAD_PORT` | `7900` | Port of the broker |
| `SQUAD_DB` | `~/.squad-code-mcp.db` | SQLite database |
| `SQUAD_TOKEN_FILE` | `~/.squad-code-mcp.token` | File of the human credential. Created by the broker if it is not there |
| `SQUAD_PING_INTERVAL_MS` | `10000` | Interval of the channel ping |
| `SQUAD_HEARTBEAT_INTERVAL_MS` | `15000` | Interval of the heartbeat of a registered session |
| `SQUAD_CLEANUP_INTERVAL_MS` | `30000` | Interval of the dead-session cleanup |
| `SQUAD_EXPIRE_INTERVAL_MS` | `1000` | Interval at which the broker checks the deadlines of the questions |
| `SQUAD_POLL_INTERVAL_MS` | `1000` | Interval at which a registered session asks for what was sent to it, and at which the TUI reads the log. The TUI uses 1000 when it is not a positive integer |
| `SQUAD_TUI_GLYPHS` | none | Glyphs the TUI writes as another character: pairs `glyph=substitute` separated by commas, as in `⚠=!,⟳=~`. A pair without one character on each side stops the TUI with exit code 1 |
| `SQUAD_TUI_MOUSE` | `1` | `0` starts the TUI without asking the terminal for the reports of the mouse; `m` turns them on. Absent, empty or `1`, it asks for them. Any other value stops the TUI with exit code 1 |
| `SQUAD_PRICES` | `tui/prices.json` | JSON file of the price table of the TUI: `{ "<model>": { "input", "output", "cache_write", "cache_read" } }`, in dollars per million tokens. A model outside the table costs zero. A file that is missing or has another format stops the TUI with exit code 1 |

Port and database differ from claude-peers (`7899`, `~/.claude-peers.db`), so both can run on the same machine.

## Routes

Every route is a `POST` with a JSON body, except `/health` and `/events`. A refusal is a `200` with `{ ok: false, error, hint }`, where `hint` says the next valid step. A body that is not a JSON object is refused with `missing_field`.

### Peers

| Route | Body | Answer |
| --- | --- | --- |
| `/register` | `{ pid, cwd, git_root, name, role }` | `{ id }`, or a refusal: `missing_field`, `invalid_role`, `invalid_name`, `role_taken`, `worker_limit`, `name_taken` |
| `/list-peers` | `{ id }` | `[{ name, role, online }]` for the other five names, or `unknown_peer` |
| `/heartbeat` | `{ id }` | `{ ok: true }` |
| `/unregister` | `{ id }` | `{ ok: true }` |
| `GET /health` | | `{ status: "ok", peers }` |

The `id` is a credential: it comes back from `/register` and is never listed.

### Events

These routes take the `id` of a registered peer. An `id` that is unknown, absent or not a string is refused with `unknown_peer`, and nothing is written.

| Route | Body | Answer |
| --- | --- | --- |
| `/send` | `{ id, kind, to, summary, body?, ticket_ref?, ...fields of the kind }` | `{ ok: true, seq }`, or a refusal, in this order: `missing_field`, `invalid_kind`, `invalid_field`, `unknown_recipient`, `edge_not_allowed`, `no_open_feature`, then the ones of the kind |
| `/plan` | `{ id, tickets: [{ ticket_ref, title, depends_on?, dropped? }] }` | `{ ok: true, seq }`, or `edge_not_allowed`, `no_open_feature`, `missing_field`, `invalid_plan`, `plan_drops_started_ticket` |
| `/poll-messages` | `{ id }` | `{ events }`: what is still to be delivered to the name, in order of `seq` |
| `/ack` | `{ id, seqs }` | `{ ok: true }`, or `missing_field`. Confirms only the pending deliveries of the caller |
| `/history` | `{ id }` and exactly one of `ticket_ref`, `question_id`, `gate_id` | `{ events }`, or `missing_field`. By `ticket_ref` only the open feature is read |
| `/state` | `{ id }` | `{ feature, ticket, owed }` |
| `/blocked` | `{ id, reason, detail, last_action, ticket_ref? }` | `{ ok: true, seq }`, or `missing_field`, `invalid_field` |
| `/unblocked` | `{ id }` | `{ ok: true, seq }` |
| `/usage` | `{ id, session_id, model, input, output, cache_write, cache_read }` | `{ ok: true, seq }`, or `missing_field` |
| `/turn-started` | `{ id }` | `{ ok: true, seq }` |
| `/permission-request` | `{ id, request_id, tool_name, description, input_preview }` | `{ ok: true, seq }`, or `missing_field` |
| `/open-feature` | `{ id, title, workflow, branch, base_branch, spec_ref, spec_commit }`, `workflow` being `tlc` or `matt-pocock` | `{ ok: true, feature_id, seq }`, or a refusal, in this order: `edge_not_allowed`, `feature_already_open`, `missing_field`, `invalid_field` |
| `/close-feature` | `{ id, outcome, body? }`, `outcome` being `delivered` or `abandoned` | `{ ok: true, seq }`, or a refusal, in this order: `edge_not_allowed`, `no_open_feature`, `missing_field`, `invalid_field`, `gate_required` |
| `/gate` | `{ id, scope, summary, action, effect, body?, commit?, diffstat?, ticket_ref?, gate_id? }`, `scope` being `delivery` (with `commit`) or `action`; with `gate_id`, the pending gate asked again | `{ ok: true, gate_id, seq }`, or a refusal, in this order: `edge_not_allowed`, `missing_field`, `invalid_field`, `no_open_feature`, `invalid_field` of the `gate_id`, `gate_closed`, `tickets_open` |

Two routes take no `id`:

| Route | Body | Answer |
| --- | --- | --- |
| `/permission-decision` | `{ human_token, request_seq, behavior }`, `behavior` being `allow` or `deny` | `{ ok: true, seq }`, or `invalid_token`, `missing_field`, `invalid_field`, `permission_closed` |
| `/gate-decision` | `{ human_token, gate_id, request_seq, decision, text? }`, `request_seq` being the `seq` of the version of the gate the dev decides, `decision` being `approve`, `reject` or `comment`, the last two with a text | `{ ok: true, seq }`, or `invalid_token`, `missing_field`, `invalid_field`, `gate_closed`, `gate_reissued` |
| `GET /events?after=<seq>` | | `{ events, last_seq }`: every event after the cursor, the whole log without `after`. `invalid_field` if `after` is not an integer of zero or more |

An event is read as a flat object: `{ seq, ts, kind, feature_id, from, role_from, to, summary, body, ticket_ref }` plus the fields of its kind.

`/send` takes three kinds, each along its edges. Any other kind is refused with `invalid_kind`.

| Kind | Edge | Fields of the kind | Refusals of the kind |
| --- | --- | --- | --- |
| `task` | mother to leader | none, and no `ticket_ref` | `invalid_field` |
| `task` | leader to worker | `ticket_ref`, `loadout`, `criteria?` | `missing_field`, `unplanned_ticket`, `ticket_dropped`, `ticket_closed`, `rework_limit`, `worker_busy` |
| `result` | worker to judge | `ticket_ref`, `task_seq`, `branch`, `commit` | `missing_field`, `not_owner`, `ticket_dropped`, `stale_reference` |
| `result` | leader to mother | none, and no `ticket_ref` | `invalid_field` |
| `verdict` | judge to leader | `ticket_ref`, `result_seq`, `outcome`, `criteria` | `missing_field`, `invalid_field`, `ticket_dropped`, `stale_reference` |

`summary` takes up to 80 characters. The broker fills `from`, `role_from`, `seq`, `ts` and `feature_id` itself, whatever the body says.

`task`, `result`, `verdict` and `plan` need an open feature: without one the four are refused with `no_open_feature`. The other routes work without a feature and write their events with `feature_id` null.

Only the mother opens and closes a feature, and one is open at a time. `/open-feature` writes a `feature_opened` with the six fields and the row of `features`, with the project taken from the git directory of the mother. `/close-feature` writes a `feature_closed` with the outcome and closes the row; `delivered` needs a gate of scope `delivery` approved in the feature, or it is refused with `gate_required`. A gate has one final decision: `approve` or `reject` decide it, `comment` leaves it pending for the mother to ask it again with the same `gate_id`, and the `feature_closed` rejects the gates still pending, with no event of its own. `gates` can be rebuilt from the log: `gates()` in `shared/derive.ts` gives its rows. Closing writes nothing else: the tickets of a closed feature stop counting, a blocked peer stays blocked and what was pending stays pending. `features` can be rebuilt from the log alone: `features()` in `shared/derive.ts` gives its rows, without the project, from what `GET /events` answers.

A refusal of `/send`, `/plan`, `/blocked`, `/unblocked`, `/usage`, `/turn-started`, `/permission-request`, `/open-feature`, `/close-feature` or `/gate` to a registered peer writes a `refused` event with the peer, the kind it tried and the error. The other refusals write nothing.

`task`, `result`, `verdict`, `permission_decision` and `gate_decision` are delivered, the last one to the mother: each one waits for its recipient in `/poll-messages` until it is confirmed, whether the recipient is online or not. `feature_opened` and `feature_closed` are delivered to everyone: each waits for the five names that are not the mother. The other kinds are only recorded.

`events` is append-only. Two triggers abort any `UPDATE` or `DELETE` on it, from any connection. A unique index keeps a second open row out of `features`, from any connection too.

### Presence

A peer that registers writes a `peer_joined` event. One that unregisters writes `peer_left` with `unregistered`. One whose process is gone at the cleanup, or whose last heartbeat is more than 60 s old, writes `peer_left` with `died`. The 60 s count from the start of the broker for a peer that was registered before it. A peer that leaves while blocked also writes an `unblocked`. What was still to be delivered to its name stays pending.

## Tools

After `ready` a session lists `list_peers`, `state`, `history`, `blocked` and `unblocked`, and the tools that send for its role:

| Role | Tools |
| --- | --- |
| `mother` | `send_task`, `open_feature`, `close_feature`, `ask`, `answer`, `escalate`, `merge_question`, `gate` |
| `leader` | `plan`, `send_task`, `send_result`, `ask`, `answer`, `escalate` |
| `worker` | `send_result`, `ask`, `answer`, `escalate` |
| `judge` | `send_verdict`, `ask` |

Each tool calls the route of the same name with the `id` of the session; the three `send_*` call `/send` with their kind. `open_feature` answers the id of the feature, `ask` the id of the question and `gate` the id of the gate, along with the seq. A refusal comes back as an error with the `error` and the `hint` of the broker.

## CLI

```bash
bun cli.ts status        # broker state and number of registered peers
bun cli.ts kill-broker   # stop the broker
```

## Files

- `broker.ts`: the HTTP daemon and its routes
- `peers.ts`: registration, refusals, presence and listing
- `db.ts`: schema and the write path of the event log
- `log.ts`: writes an event with its delivery and the trace of a refusal, and reads
- `send.ts`, `plan.ts`, `feature.ts`, `question.ts`, `gate.ts`, `session.ts`, `permission.ts`, `state.ts`: the rules of the routes
- `server.ts`: the MCP server of a session
- `tools.ts`: the tools of each role
- `delivery.ts`: the loop of poll, push and ack of a session
- `cli.ts`: status and stop
- `tui.ts`, `tui/`: the TUI, its screens and modals, and the probes of the glyphs and of the mouse
- `shared/contract.ts`, `shared/derive.ts`: the event contract, and the state of the tickets and the features derived from the events
- `shared/config.ts`, `shared/git.ts`: settings and the git common directory
- `test/unit`, `test/integration`: `bun test`

The design is in [`.design/squad-mvp.md`](../.design/squad-mvp.md) and the decisions in [`docs/adr/`](../docs/adr/).
