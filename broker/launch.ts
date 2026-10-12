/**
 * squad launcher
 *
 * What `squad start <role> [name] [--skip-permissions]` does: opens one Claude Code
 * session as a member of the squad, with its name and role in the environment, the
 * plugin loaded as a channel, the allowed list of the role and the skill of the role
 * as its first instruction (AD-015, AD-019).
 */

import { namesOf, type Role } from "./peers.ts";
import type { RoleEntry } from "./roles.ts";
import { pluginDir } from "./shared/config.ts";
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
