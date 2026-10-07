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

function refuse(error: string, hint: string): Refusal {
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

export function createPeers(
  db: Database,
  isAlive: (pid: number) => boolean = pidAlive,
  now: () => number = Date.now
) {
  function remove(peer: PeerRow, reason: "unregistered" | "died") {
    db.run("DELETE FROM peers WHERE id = ?", [peer.id]);
    appendBrokerEvent(db, "peer_left", { peer: peer.name, reason }, now());
  }

  // Remove peers whose process no longer exists
  const cleanStale = db.transaction(() => {
    const peers = db.query("SELECT id, name, role, pid FROM peers").all() as PeerRow[];
    for (const peer of peers) {
      if (!isAlive(peer.pid)) remove(peer, "died");
    }
  });

  const register = db.transaction((body: RegisterRequest): RegisterResponse | Refusal => {
    if (!Number.isInteger(body.pid) || typeof body.cwd !== "string" || body.cwd === "") {
      return refuse("missing_field", "Send pid as an integer and cwd as a non-empty string.");
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
    const previous = db.query("SELECT id, name, role, pid FROM peers WHERE pid = ?").get(body.pid) as PeerRow | null;
    if (previous) remove(previous, "died");

    const sameRole = db.query("SELECT name FROM peers WHERE role = ?").all(body.role) as { name: string }[];
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
