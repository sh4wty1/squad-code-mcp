import { openDatabase } from "../../db.ts";
import { createPeers, type RegisterRequest } from "../../peers.ts";

export const NOW = 1791331200000;

// A broker over an in-memory database, with fake liveness and a fixed clock
export function setup() {
  const db = openDatabase(":memory:");
  const alive = new Set<number>();
  const clock = { now: NOW };
  const peers = createPeers(db, (pid) => alive.has(pid), () => clock.now);

  // Registers a live session and returns what the broker answered
  function join(name: string, role: string, pid: number, extra: Partial<RegisterRequest> = {}) {
    alive.add(pid);
    return peers.register({ pid, cwd: "/repo", git_root: "/repo/.git", name, role, ...extra });
  }

  function events(): Record<string, any>[] {
    return (db.query("SELECT * FROM events ORDER BY seq").all() as Record<string, any>[]).map((e) => ({
      ...e,
      data: JSON.parse(e.data),
    }));
  }

  function rows() {
    return db.query("SELECT * FROM peers ORDER BY registered_at, name").all() as Record<string, unknown>[];
  }

  return { db, peers, alive, clock, join, events, rows };
}
