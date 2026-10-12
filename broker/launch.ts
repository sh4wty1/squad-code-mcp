/**
 * squad launcher
 *
 * What `squad start <role> [name] [--skip-permissions]` does: opens one Claude Code
 * session as a member of the squad, with its name and role in the environment, the
 * plugin loaded as a channel, the allowed list of the role and the skill of the role
 * as its first instruction (AD-015, AD-019). Every role but the mother works in a
 * worktree of its own, outside the repository (ADR-012, AD-020).
 */

import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { namesOf, type Role } from "./peers.ts";
import type { RoleEntry } from "./roles.ts";
import { pluginDir, worktreesDir } from "./shared/config.ts";
import { toolsFor } from "./tools.ts";

type Env = Record<string, string | undefined>;

export interface Start {
  role: Role;
  // absent when the launcher picks it
  name?: string;
  skip: boolean;
}

const USAGE = "squad start <role> [name] [--skip-permissions]";

// What comes after `start`. The option is taken in any position.
export function parseStart(argv: string[]): Start | { error: string } {
  const options = argv.filter((arg) => arg.startsWith("-"));
  const unknown = options.find((arg) => arg !== "--skip-permissions");
  if (unknown !== undefined) return { error: `unknown option ${unknown}. Usage: ${USAGE}` };

  const [role, name, ...rest] = argv.filter((arg) => !arg.startsWith("-"));
  if (role === undefined) return { error: `missing role. Usage: ${USAGE}` };
  const names = namesOf(role);
  if (names.length === 0) return { error: `${role} is not a role: it must be mother, leader, worker or judge` };
  if (rest.length > 0) return { error: `unexpected argument ${rest[0]}. Usage: ${USAGE}` };
  if (name !== undefined && !names.includes(name)) {
    return { error: `${name} is not a name of a ${role}: it must be ${names.join(" or ")}` };
  }
  return { role: role as Role, name, skip: options.length > 0 };
}

// How a tool of the MCP server of the plugin is called in the session (AD-015)
const TOOL_PREFIX = "mcp__plugin_squad_squad__";

// The local git of each role. Never push, reset, checkout or rm, and the merge of the
// delivery, which is of the mother, asks for permission in her terminal (AD-019).
function gitCommands(role: string): string[] {
  return [
    "git status",
    "git diff",
    "git log",
    "git show",
    "git rev-parse",
    ...(role === "judge" ? ["git switch"] : ["git switch", "git add", "git commit"]),
    ...(role === "leader" ? ["git merge"] : []),
  ];
}

// What the session runs without asking: the squad tools of the role, then its git
// commands. On Windows the session has two shell tools.
export function allowed(role: string, platform: string): string[] {
  const tools = ["ready", ...toolsFor(role).map((tool) => tool.name)].map((name) => TOOL_PREFIX + name);
  const shells = platform === "win32" ? ["Bash", "PowerShell"] : ["Bash"];
  return [...tools, ...shells.flatMap((shell) => gitCommands(role).map((command) => `${shell}(${command}:*)`))];
}

// Who the session is and the skills of its role. A line of an empty list is left out.
export function systemPrompt(name: string, entry: RoleEntry): string {
  const list = (skills: string[] | undefined) => (skills ?? []).join(", ");
  const tlc = list(entry.workflows?.tlc);
  const mattPocock = list(entry.workflows?.["matt-pocock"]);
  return [
    `Squad name: ${name}. Squad role: ${entry.name}.`,
    entry.skills.length > 0 ? `Base skills of your role: ${list(entry.skills)}.` : "",
    tlc ? `With the tlc workflow, also: ${tlc}.` : "",
    mattPocock ? `With the matt-pocock workflow, also: ${mattPocock}.` : "",
    tlc || mattPocock ? "Use only the skills of the workflow of the open feature." : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// The environment of the session: that of the launcher without what a Claude Code session
// around it left there, with the name and the role
export function sessionEnv(env: Env, name: string, role: string): Env {
  const kept = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("CLAUDE")));
  return { ...kept, SQUAD_NAME: name, SQUAD_ROLE: role };
}

// The arguments of the session. The skill of the role is the prompt, and comes last:
// --allowedTools takes every argument up to the next option.
export function sessionArgs(name: string, entry: RoleEntry, platform: string, skip: boolean): string[] {
  return [
    "--plugin-dir",
    pluginDir(),
    "--dangerously-load-development-channels",
    "plugin:squad@inline",
    ...(skip
      ? ["--dangerously-skip-permissions"]
      : ["--permission-mode", "acceptEdits", "--allowedTools", ...allowed(entry.name, platform)]),
    "--append-system-prompt",
    systemPrompt(name, entry),
    `/squad:${entry.name}`,
  ];
}

// git for real, in `cwd`. Each path goes as an argument of its own.
function git(cwd: string, ...args: string[]): { ok: boolean; out: string; err: string } {
  const result = Bun.spawnSync(["git", ...args], { cwd });
  return { ok: result.exitCode === 0, out: result.stdout.toString(), err: result.stderr.toString() };
}

// The main checkout of the repository `cwd` is in: the first working tree git lists, the
// same from the main checkout and from any worktree of it
export function mainCheckout(cwd: string): string {
  const list = git(cwd, "worktree", "list", "--porcelain");
  const first = list.out.split(/\r?\n/)[0] ?? "";
  if (!list.ok || !first.startsWith("worktree ")) throw new Error(`${cwd} is not inside a git repository`);
  // git writes the path with / on Windows too
  return resolve(first.slice("worktree ".length));
}

// The directory of the session of a name: its worktree, created when it is not there yet.
// With an open feature whose branch exists, the leader is born on the branch and the
// others detached at its tip; otherwise all are born detached at the HEAD of the main
// checkout. Throws an Error with the message of git when the worktree cannot be added.
export function worktree(main: string, name: string, role: Role, branch: string | null, env: Env): string {
  const dir = join(worktreesDir(main, env), name);
  // A relaunched session: the worktree may have work without a commit, and stays as it is
  if (existsSync(dir) && statSync(dir).isDirectory()) return dir;

  const ref = `refs/heads/${branch}`;
  const at =
    branch !== null && git(main, "rev-parse", "--verify", "--quiet", ref).ok
      ? role === "leader"
        ? [dir, branch]
        : ["--detach", dir, ref]
      : ["--detach", dir, "HEAD"];
  const added = git(main, "worktree", "add", "--quiet", ...at);
  if (!added.ok) throw new Error(added.err.trim().replace(/\s*\n\s*/g, " "));

  // The credentials of the project: what git does not track did not come with the checkout
  const tracked = new Set(git(main, "ls-files", "-z", "--", ".env*").out.split("\0"));
  for (const file of readdirSync(main, { withFileTypes: true })) {
    if (!file.isFile() || !file.name.startsWith(".env") || tracked.has(file.name)) continue;
    const to = join(dir, file.name);
    if (!existsSync(to)) copyFileSync(join(main, file.name), to);
  }
  return dir;
}
