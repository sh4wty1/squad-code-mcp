# squad broker

Broker and MCP channel server of squad-code-mcp. A fork of claude-peers-mcp at `640183f`; see `README.md`.

## Architecture

- `broker.ts` — Singleton HTTP daemon on 127.0.0.1:7900 + SQLite. Auto-launched by the MCP server.
- `peers.ts` — Peer registry: registration with refusals, presence events, listing. The peer id is a credential and is never listed.
- `db.ts` — Schema and the single write path of the append-only `events` table.
- `server.ts` — MCP stdio server, one per Claude Code session. Pings through the channel and registers only when the model calls `ready`.
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
