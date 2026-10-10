# squad broker

Broker and MCP channel server of squad-code-mcp. A fork of claude-peers-mcp at `640183f`; see `README.md`.

## Architecture

- `broker.ts` — Singleton HTTP daemon on 127.0.0.1:7900 + SQLite. Auto-launched by the MCP server. Finds the peer of the `id` and hands the request to the module of the route; `/answer` goes to the dev path when its body has `human_token`. Checks the deadlines of the questions before serving and every second.
- `peers.ts` — Peer registry: registration with refusals, presence events, listing. The peer id is a credential and is never listed.
- `db.ts` — Schema, with the `questions` table, and the single write path of the append-only `events` table.
- `log.ts` — The event log: writes an event with its deliveries in one transaction, to the recipient of its kind or to the `recipients` it is given, opens and closes the row of `features` with its event, closes the open and merged questions of a feature with its `feature_closed`, writes the `refused` of a refusal, and reads (pending, cursor, history by ticket, question or gate).
- `send.ts` — `/send`: the envelope, the edges and the rules of `task`, `result` and `verdict`. The `result` of a worker closes, in its transaction, the non-blocking questions it asked about the ticket.
- `plan.ts` — `/plan`: the list of tickets of the leader.
- `feature.ts` — `/open-feature` and `/close-feature`: the mother opens the feature and closes it, one at a time.
- `question.ts` — `/ask`, `/escalate`, `/merge-question` and `/answer`: the life of a question in the `questions` table, which is the state the routes decide by. A question has one resolution: the answer of its holder or of the dev (with the human credential), its deadline (`expire`), the `result` of who asked it (`delivered`) or the end of the feature. Row, event and deliveries go in one transaction.
- `session.ts` — `/blocked`, `/unblocked`, `/usage` and `/turn-started`.
- `permission.ts` — `/permission-request`, `/permission-decision` and the file of the human credential.
- `state.ts` — `/state`: the open feature, the ticket of a worker and what the peer owes.
- `server.ts` — MCP stdio server, one per Claude Code session. Pings through the channel and registers only when the model calls `ready`. Then lists the tools of the role, runs the delivery loop and relays permission prompts.
- `delivery.ts` — The loop of a session: poll, push in order, ack after the push. No MCP and no HTTP: the calls are injected.
- `tools.ts` — The MCP tools of each role and the route each one calls. Of a question: `ask` for the four roles, `answer` and `escalate` for worker, leader and mother, `merge_question` for the mother.
- `shared/contract.ts` — The event envelope, the twenty kinds, the edges, the read format and the label `Q-NN` of a question.
- `shared/derive.ts` — The state of the tickets, what each peer owes and the features, from the events alone. Pure functions. `squad(events, now)` is the status rule of the contract (ADR-006): from the whole log it gives the open feature, the status of each agent and of each ticket by precedence, the questions, the gates, the open permission requests and the tokens. `presence`, `blocks`, `openPermissions`, `questions`, `gates` and `usageTotals` are its parts. `questions(events)` gives each question its text, its route, the status the `questions` table has for it and how it closed, reading the `feature_closed` too; a test compares the two after generated sequences of calls. `owed` includes the answer the holder of an open question owes.
- `shared/config.ts`, `shared/git.ts` — Settings (`SQUAD_*`) and the git common directory.
- `cli.ts` — CLI utility for the broker.
- `tui.ts` — The TUI, a process of its own that reads the log and writes one thing, the answer of the dev to a question: `config` validates the settings, `credential` reads the human credential from its file, `start` is the loop of read, keys, send and drawing with `fetch`, clock, size, input, output and credential injected, and the bottom of the file wires it to the terminal. After each read the loop applies `sync`; after the keys it sends the answer they left in `Ui.send`, with the credential read at that moment, and applies `settle` (STATE AD-014). Imported by neither `broker.ts` nor `server.ts`.
- `tui/reader.ts` — `GET /events?after=<cursor>`, the only read of the TUI: the log by cursor, kept on a failed read and emptied when the broker comes back on a new database.
- `tui/writer.ts` — `POST /answer` with the human credential, the only write of the TUI: it gives the error of a refusal, and `broker não respondeu` for anything else or after 2 s.
- `tui/keys.ts` — `press(ui, key, view)`: what a key does to the state of the screen, the keys of the modal of answer before the global ones; an answer to send is left in `Ui.send`, not sent. `settle` is what the answer of the broker does to the modal, `sync` what a read does to the selection of the tab and to the modal, `input` what the keys of one chunk of input do, key by key, where a pasted line break that comes with the modal open is a space in the text mode and nothing in the choice mode: a paste sends no answer. Pure; null quits.
- `tui/view.ts` — `Ui`, the state of the screen, with the tab of questions, the `Modal` of answer and the answer to send, and `View`, what a screen draws from.
- `tui/asked.ts` — The questions of the tab, from the derived squad: the ones that wait for the dev and the resolved ones, in their order, the effect of an answer, how a question ended and the seconds left to its default.
- `tui/feed.ts` — The lines of the feed from the log: one per message and the system lines.
- `tui/activity.ts` — The text of activity of an agent, the seals of line 1 and the right side of the footer.
- `tui/grid.ts`, `tui/ansi.ts` — The buffer of 120×40 cells and its primitives; the escapes that paint the lines that changed, the glyph substitutes and the alternate screen.
- `tui/screens/` — One pure function of a `View` per screen: `main.ts` with `detail.ts`, `topology.ts`, `thread.ts`, `questions.ts`, `help.ts`, `small.ts` and `down.ts`; `chrome.ts` draws lines 0, 1, 38 and 39 of all of them.
- `tui/screens/questions.ts` — The tab of questions: the list of the ones that wait for the dev, the detail of the selected one and the history of the resolved ones.
- `tui/screens/answer.ts` — The modal of answer, drawn over the tab in gray: the context of the question, its options or the field of the text, and the refusal of an answer that came after the question closed.
- `tui/config.ts`, `tui/prices.json` — The price table and the interval of read.
- `tui/glyphs.ts`, `tui/probe.ts` — The glyphs outside ASCII the screens draw, and the probe that measures them in the terminal.
- `test/frames/` — The frames of the prototype as text, the tool that extracts them and the logs that reproduce them, with the state of the screen of each frame of the tab of questions and of its modal; `deviations.ts` declares where a drawn frame leaves the prototype, and none is left for the slice Question. `test/unit/tui-frames.test.ts` draws each one.

The design is in `../.design/squad-mvp.md`, the decisions in `../docs/adr/` and `../.specs/STATE.md`.

## Running

```bash
# Start Claude Code as a squad member, with the channel:
SQUAD_NAME=leader SQUAD_ROLE=leader claude --dangerously-load-development-channels server:squad

# CLI:
bun cli.ts status
bun cli.ts kill-broker

# The TUI, in a terminal of 120×40 or more, and the probe of its glyphs:
bun tui.ts
bun tui/probe.ts

# Tests and types. Not `bun x tsc`: it downloads another tsc instead of the installed one.
bun test
bun node_modules/typescript/bin/tsc --noEmit
```

It has to run on Windows: no `HOME`, `ps` or `lsof`, and paths may have spaces.

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.
