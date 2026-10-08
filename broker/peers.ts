/**
 * squad broker peer registry
 *
 * Who is in the squad. A peer is addressed by its name and role, which are
 * given at launch and stay the same across relaunches. Its id is a credential:
 * it is returned once, by register, and never listed.
 *
 * Every row that enters or leaves `peers` writes a presence event in the
 * same transaction.
 */

import type { Database } from "bun:sqlite";
import { appendBrokerEvent } from "./db.ts";

export type Role = "mother" | "leader" | "worker" | "judge";

// The squad is a star with fixed positions (ADR-003)
export const ROSTER: { name: string; role: Role }[] = [
  { name: "mother", role: "mother" },
  { name: "leader", role: "leader" },
  { name: "judge", role: "judge" },
  { name: "worker-1", role: "worker" },
  { name: "worker-2", role: "worker" },
  { name: "worker-3", role: "worker" },
];

export interface Refusal {
  ok: false;
  error: string;
  // the next valid step for the caller
  hint: string;
}

export interface RegisterRequest {
  pid: number;
  cwd: string;
  git_root: string | null;
  name: string;
  role: string;
}

export interface RegisterResponse {
  id: string;
}

export interface ListedPeer {
  name: string;
  role: Role;
  online: boolean;
}

interface PeerRow {
  id: string;
  name: string;
  role: Role;
  pid: number;
}

export function refuse(error: string, hint: string): Refusal {
  return { ok: false, error, hint };
}

function namesOf(role: string): string[] {
  return ROSTER.filter((r) => r.role === role).map((r) => r.name);
}

export function pidAlive(pid: number): boolean {
  try {
    // Signal 0 doesn't kill, just checks
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM: the process exists but belongs to someone else
    return (e as { code?: string }).code === "EPERM";
  }
}

// Four heartbeats of the MCP server, which sends one every 15 s
export const STALE_AFTER_MS = 60_000;

export function createPeers(
  db: Database,
  isAlive: (pid: number) => boolean = pidAlive,
  now: () => number = Date.now
) {
  function remove(peer: PeerRow, reason: "unregistered" | "died") {
    db.run("DELETE FROM peers WHERE id = ?", [peer.id]);
    appendBrokerEvent(db, "peer_left", { peer: peer.name, reason }, now());
  }

  // A heartbeat can only arrive while the broker is there to take it. The silence of a
  // peer is counted from here when its last_seen is older: the start of the broker, or
  // its return from a pause.
  let listeningSince = now();
  let lastCleanup = listeningSince;

  // Remove peers whose process no longer exists, or whose heartbeat stopped: a pid alone
  // can be a stale row whose pid the system gave to another process
  const cleanStale = db.transaction(() => {
    const t = now();
    // A cleanup this late means the broker itself was stopped, as when the machine sleeps
    if (t - lastCleanup > STALE_AFTER_MS) listeningSince = t;
    lastCleanup = t;

    const peers = db.query("SELECT id, name, role, pid, last_seen FROM peers").all() as (PeerRow & {
      last_seen: number;
    })[];
    for (const peer of peers) {
      const silentFor = t - Math.max(peer.last_seen, listeningSince);
      if (!isAlive(peer.pid) || silentFor > STALE_AFTER_MS) remove(peer, "died");
    }
  });

  const register = db.transaction((body: RegisterRequest): RegisterResponse | Refusal => {
    if (
      !Number.isInteger(body.pid) ||
      body.pid <= 0 ||
      typeof body.cwd !== "string" ||
      body.cwd === "" ||
      (body.git_root != null && typeof body.git_root !== "string")
    ) {
      return refuse(
        "missing_field",
        "Send pid as a positive integer, cwd as a non-empty string and git_root as a string or null."
      );
    }

    const names = namesOf(body.role);
    if (names.length === 0) {
      return refuse(
        "invalid_role",
        "role must be mother, leader, worker or judge. Relaunch the session with SQUAD_ROLE set to one of them."
      );
    }
    if (!names.includes(body.name)) {
      return refuse(
        "invalid_name",
        `The name of a ${body.role} must be ${names.join(" or ")}. Relaunch the session with SQUAD_NAME set to it.`
      );
    }

    // From here on every row left in peers belongs to a live session
    cleanStale();
    // A pid holds one registration. Its earlier one does not count against the new
    // one, and only leaves if the new one is accepted.
    const previous = db.query("SELECT id, name, role, pid FROM peers WHERE pid = ?").get(body.pid) as PeerRow | null;

    const sameRole = db.query("SELECT name FROM peers WHERE role = ? AND pid != ?").all(body.role, body.pid) as {
      name: string;
    }[];
    if (sameRole.length >= names.length) {
      return body.role === "worker"
        ? refuse("worker_limit", "Three workers are already registered. Close one of them before launching another.")
        : refuse(
            "role_taken",
            `A live ${body.role} is already registered. Close that session before launching another ${body.role}.`
          );
    }
    if (sameRole.some((p) => p.name === body.name)) {
      const free = names.filter((n) => !sameRole.some((p) => p.name === n));
      return refuse(
        "name_taken",
        `${body.name} is registered by a live session. Relaunch this one with SQUAD_NAME set to ${free.join(" or ")}.`
      );
    }

    if (previous) remove(previous, "died");
    const id = crypto.randomUUID();
    const ts = now();
    db.run(
      `INSERT INTO peers (id, name, role, pid, cwd, git_root, registered_at, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.name, body.role, body.pid, body.cwd, body.git_root ?? null, ts, ts]
    );
    appendBrokerEvent(db, "peer_joined", { peer: body.name, role: body.role }, ts);
    return { id };
  });

  const unregister = db.transaction((id: string) => {
    const peer = db.query("SELECT id, name, role, pid FROM peers WHERE id = ?").get(id) as PeerRow | null;
    if (peer) remove(peer, "unregistered");
  });

  function heartbeat(id: string) {
    db.run("UPDATE peers SET last_seen = ? WHERE id = ?", [now(), id]);
  }

  // The other positions of the squad, alive or not. Never the id of anyone.
  function listPeers(id: string): ListedPeer[] | Refusal {
    cleanStale();
    const peers = db.query("SELECT id, name, role, pid FROM peers").all() as PeerRow[];
    const caller = peers.find((p) => p.id === id);
    if (!caller) {
      return refuse("unknown_peer", "This id is not registered. Register again and use the id that comes back.");
    }
    return ROSTER.filter((r) => r.name !== caller.name).map((r) => ({
      name: r.name,
      role: r.role,
      online: peers.some((p) => p.name === r.name),
    }));
  }

  function count(): number {
    return (db.query("SELECT COUNT(*) AS n FROM peers").get() as { n: number }).n;
  }

  return { register, unregister, heartbeat, listPeers, cleanStale, count };
}
