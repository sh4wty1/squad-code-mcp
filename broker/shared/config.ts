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

// How often the broker removes peers whose process is gone
export function cleanupIntervalMs(env: Env = process.env): number {
  return parseInt(env.SQUAD_CLEANUP_INTERVAL_MS ?? "30000", 10);
}

export function dbPath(env: Env = process.env): string {
  // os.homedir() instead of $HOME, which is not set on Windows
  return env.SQUAD_DB ?? join(homedir(), ".squad-code-mcp.db");
}
