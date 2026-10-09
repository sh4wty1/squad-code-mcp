# squad broker

Broker and MCP channel server of squad-code-mcp. A fork of claude-peers-mcp at `640183f`; see `README.md`.

## Architecture

- `broker.ts` — Singleton HTTP daemon on 127.0.0.1:7900 + SQLite. Auto-launched by the MCP server. Finds the peer of the `id` and hands the request to the module of the route.
- `peers.ts` — Peer registry: registration with refusals, presence events, listing. The peer id is a credential and is never listed.
- `db.ts` — Schema and the single write path of the append-only `events` table.
- `log.ts` — The event log: writes an event with its delivery in one transaction, opens and closes the row of `features` with its event, writes the `refused` of a refusal, and reads (pending, cursor, history).
- `send.ts` — `/send`: the envelope, the edges and the rules of `task`, `result` and `verdict`.
- `plan.ts` — `/plan`: the list of tickets of the leader.
- `feature.ts` — `/open-feature` and `/close-feature`: the mother opens the feature and closes it, one at a time.
- `session.ts` — `/blocked`, `/unblocked`, `/usage` and `/turn-started`.
- `permission.ts` — `/permission-request`, `/permission-decision` and the file of the human credential.
- `state.ts` — `/state`: the open feature, the ticket of a worker and what the peer owes.
- `server.ts` — MCP stdio server, one per Claude Code session. Pings through the channel and registers only when the model calls `ready`. Then lists the tools of the role, runs the delivery loop and relays permission prompts.
- `delivery.ts` — The loop of a session: poll, push in order, ack after the push. No MCP and no HTTP: the calls are injected.
- `tools.ts` — The MCP tools of each role and the route each one calls.
- `shared/contract.ts` — The event envelope, the twenty kinds, the edges and the read format.
- `shared/derive.ts` — The state of the tickets, what each peer owes and the features, from the events alone. Pure functions. `squad(events, now)` is the status rule of the contract (ADR-006): from the whole log it gives the open feature, the status of each agent and of each ticket by precedence, the questions, the gates, the open permission requests and the tokens. `presence`, `blocks`, `openPermissions`, `questions`, `gates` and `usageTotals` are its parts.
- `shared/config.ts`, `shared/git.ts` — Settings (`SQUAD_*`) and the git common directory.
- `cli.ts` — CLI utility for the broker.

The design is in `../.design/squad-mvp.md`, the decisions in `../docs/adr/` and `../.specs/STATE.md`.

## Running

```bash
# Start Claude Code as a squad member, with the channel:
SQUAD_NAME=leader SQUAD_ROLE=leader claude --dangerously-load-development-channels server:squad

# CLI:
bun cli.ts status
bun cli.ts kill-broker

# Tests and types:
bun test
bun x tsc --noEmit
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
