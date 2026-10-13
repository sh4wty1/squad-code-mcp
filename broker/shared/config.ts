// Settings of the squad fork. Port and database differ from claude-peers
// (7899, ~/.claude-peers.db) so both can run on the same machine.

import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Env = Record<string, string | undefined>;

export function port(env: Env = process.env): number {
  return parseInt(env.SQUAD_PORT ?? "7900", 10);
}

export function brokerUrl(env: Env = process.env): string {
  return `http://127.0.0.1:${port(env)}`;
}

// How often a session without an answer to its ping is pinged again
export function pingIntervalMs(env: Env = process.env): number {
  return parseInt(env.SQUAD_PING_INTERVAL_MS ?? "10000", 10);
}

// How often a registered session tells the broker it is still there
export function heartbeatIntervalMs(env: Env = process.env): number {
  return parseInt(env.SQUAD_HEARTBEAT_INTERVAL_MS ?? "15000", 10);
}

// How often the broker removes peers whose process is gone
export function cleanupIntervalMs(env: Env = process.env): number {
  return parseInt(env.SQUAD_CLEANUP_INTERVAL_MS ?? "30000", 10);
}

// How often the broker checks the deadlines of the questions
export function expireIntervalMs(env: Env = process.env): number {
  return parseInt(env.SQUAD_EXPIRE_INTERVAL_MS ?? "1000", 10);
}

// How often a registered session asks the broker for what was sent to it
export function pollIntervalMs(env: Env = process.env): number {
  return parseInt(env.SQUAD_POLL_INTERVAL_MS ?? "1000", 10);
}

export function dbPath(env: Env = process.env): string {
  // os.homedir() instead of $HOME, which is not set on Windows
  return env.SQUAD_DB ?? join(homedir(), ".squad-code-mcp.db");
}

// The file of the human credential: next to the database, outside any worktree
export function tokenPath(env: Env = process.env): string {
  return env.SQUAD_TOKEN_FILE ?? join(homedir(), ".squad-code-mcp.token");
}

// The file of the credential of a session, which its hooks read: next to the database
export function idPath(name: string, env: Env = process.env): string {
  return `${dbPath(env)}.${name}.id`;
}

// The plugin, next to broker/ in the squad root
export function pluginDir(): string {
  return fileURLToPath(new URL("../../plugin", import.meta.url));
}

export function rolesPath(env: Env = process.env): string {
  return env.SQUAD_ROLES ?? join(pluginDir(), "roles.json");
}

// Where the worktrees of the roles go: outside the repository, next to its main checkout
export function worktreesDir(mainCheckout: string, env: Env = process.env): string {
  return env.SQUAD_WORKTREES ?? join(dirname(mainCheckout), `${basename(mainCheckout)}.squad`);
}

// The command that opens a session
export function claudeCommand(env: Env = process.env): string {
  return env.SQUAD_CLAUDE ?? "claude";
}

// How long a hook or the launcher waits for the broker
export const HOOK_TIMEOUT_MS = 2000;
