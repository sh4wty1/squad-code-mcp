# squad-code-mcp

Run Claude Code sessions as a squad (mother, leader, workers, judge) over a shared MCP broker, with a terminal UI to watch them work and answer their open questions.

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

## Running a squad

You need [Bun](https://bun.sh), git and Claude Code with a claude.ai login, which the channel requires. Install the `squad` command once:

```bash
bun add -g github:sh4wty1/squad-code-mcp
```

Bun puts `squad` in its folder of global commands. If your shell does not find `squad`, add that folder to your `PATH`: `bun pm bin -g` prints it.

Then open one terminal for each session, inside the repository the squad will work on, and start one role in each:

```bash
squad start mother
squad start leader
squad start worker    # worker-1; once it is online, run it again for worker-2 and worker-3
squad start judge
```

In one more terminal, of 120×40 or more, open the TUI:

```bash
squad tui
```

Each `squad start` opens one Claude Code session with its name and role in the environment, the plugin of [`plugin/`](plugin) loaded from that directory as a channel, and the protocol skill of the role as its first instruction. The plugin is not installed in Claude Code: the launcher points the session at the `plugin/` directory of the package.

- **Names.** `mother`, `leader` and `judge` are one each. `squad start worker` takes the first of `worker-1`, `worker-2` and `worker-3` that is not online, and `squad start worker worker-2` relaunches that one. A session is online only after you answer its two dialogs and it registers, which the TUI shows: a second `squad start worker` before that takes `worker-1` too, with the same worktree, and is refused when it registers. Wait until the previous worker is online, or give each one its name.
- **Environment.** The session gets the environment of your terminal with `SQUAD_NAME` and `SQUAD_ROLE` set. The `CLAUDE*` variables are left out, because a `squad start` run from inside another Claude Code session would inherit that session's own, except the three you set for Claude Code yourself: `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_OAUTH_TOKEN` and `CLAUDE_CODE_GIT_BASH_PATH`.
- **Worktrees.** The mother stays in the main checkout. The leader, each worker and the judge work in a worktree of their own, outside the repository: `<parent of the repository>/<name of the repository>.squad/<name>`, or `<SQUAD_WORKTREES>/<name>` when that variable is set. A new worktree gets the untracked `.env*` files of the main checkout. One that already exists is used as it is.
- **Two dialogs.** Claude Code shows two dialogs when a session starts, and the launcher does not answer them: you do. The first asks whether you trust the folder, the first time in each directory, and the option it comes with is "No, exit". The second is the warning of the development channel, at every start: choose "I am using this for local development".
- **Permissions.** By default a session starts with `--permission-mode acceptEdits` and a list of what it runs without asking: it edits files, calls the squad tools of its role and runs the local git of its role (`status`, `diff`, `log`, `show` and `rev-parse` for all; `switch`, `add` and `commit` for the mother, the leader and the workers; `switch` for the judge; `merge` for the leader). Everything else asks for permission in the terminal of the session: a `git push`, the merge of the delivery, and the tests and the build of your project unless its `.claude/settings.json` allows them. `squad start <role> --skip-permissions` replaces the mode and the list with `--dangerously-skip-permissions`: the session asks for nothing.
- **Base skills.** [`plugin/roles.json`](plugin/roles.json) names the base skills of each role, as the registry calls them. Set `SQUAD_ROLES` to the path of another file to change them.

The broker starts by itself with the first session and keeps running after it: `squad status` shows it and `squad kill-broker` stops it.

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
