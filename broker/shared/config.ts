// Settings of the squad fork. Port and database differ from claude-peers
// (7899, ~/.claude-peers.db) so both can run on the same machine.

import { homedir } from "node:os";
import { join } from "node:path";

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
