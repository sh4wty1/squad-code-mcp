# squad-code-mcp

Run Claude Code sessions as a squad (mother, leader, workers, judge) over a shared MCP broker, with a terminal UI to watch them work and answer their open questions.

> **Status: design phase.** There is no code yet. The spec is being closed from [`docs/start-document/START.md`](docs/start-document/START.md); nothing here is installable.

## How it works

Each Claude Code session joins the broker with a role. Messages flow in a star: workers never talk to each other.

```text
dev ⇄ Mother ⇄ Leader ⇄ Worker 1..N
                  ⇅
                Judge
```

| Role | Job |
| --- | --- |
| **Mother** | Owns the goal and talks to the dev. Filters and deduplicates questions, approves the final delivery. |
| **Leader** | Cuts the spec into tickets, picks each worker's skill loadout per ticket, answers what it can before escalating. |
| **Worker 1..N** | Generic. One ticket at a time, in its own git worktree, with the loadout it was given. |
| **Judge** | Scores the delivery against the spec and returns approve or rework to the Leader. |

- **Work:** Mother → Leader → Workers → Judge → (rework) Leader → Mother → dev. At most 2 reworks per ticket, then it escalates to the Mother.
- **Questions:** Worker → Leader → Mother → dev. Each level tries to answer before escalating.

## Architecture

- **Broker (MCP):** an extended fork of [claude-peers-mcp](https://github.com/louislva/claude-peers-mcp). Adds a role per peer, threads, questions and an append-only event log. It is the only writer of state.
- **Role skills:** the instructions and protocol of each role. They live outside the broker and are referenced by name from the [fassi-skills](https://github.com/sh4wty1/fassi-skills) registry.
- **TUI:** a separate process that reads the event log. It writes only answers to questions and human-gate decisions, always through the broker. It does not need any Claude session to be alive.

## Roadmap

1. **Broker:** fork, roles, threads, event log.
2. **TUI (read-only):** feed, agent list, topology, thread detail.
3. **Open questions:** `question` / `answer` events, routing through the Mother, blocking vs. timeout with a default.
4. **Role skills + `roles.json`:** role → skills mapping.
5. **Human gate:** the Mother pauses before irreversible actions and the final delivery; the TUI approves, rejects or comments.
6. **After the MVP:** a second brain, graph search over a markdown vault.

Out of scope for the MVP: worker-to-worker mesh, embeddings, remote or multi-machine execution, a web UI.

## Contributing

Skills are personal to each dev and git-ignored. Run `/setup-fassi-skills` from the [fassi-skills](https://github.com/sh4wty1/fassi-skills) plugin to install the set this project uses.
