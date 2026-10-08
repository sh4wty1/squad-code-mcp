import { openDatabase } from "../../db.ts";
import { createLog, type FeatureRow } from "../../log.ts";
import { createPeers, type RegisterRequest } from "../../peers.ts";

export const NOW = 1791331200000;

// A broker over an in-memory database, with fake liveness and a fixed clock
export function setup() {
  const db = openDatabase(":memory:");
  const alive = new Set<number>();
  const clock = { now: NOW };
  const peers = createPeers(db, (pid) => alive.has(pid), () => clock.now);
  const log = createLog(db, () => clock.now);

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

  // Opens a feature the way the Feature slice will: a row with closed_seq NULL. Returns its id.
  function openFeature(fields: Partial<FeatureRow> = {}): number {
    const f = {
      project: "/repo",
      title: "the feature",
      workflow: "tlc",
      branch: "feat/x",
      base_branch: "main",
      spec_ref: ".specs/features/x/spec.md",
      spec_commit: "abc1234",
      opened_seq: 0,
      ...fields,
    };
    const result = db.run(
      `INSERT INTO features (project, title, workflow, branch, base_branch, spec_ref, spec_commit, opened_seq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.project, f.title, f.workflow, f.branch, f.base_branch, f.spec_ref, f.spec_commit, f.opened_seq]
    );
    return Number(result.lastInsertRowid);
  }

  function closeFeature(id: number) {
    db.run(
      "UPDATE features SET closed_seq = (SELECT COALESCE(MAX(seq), 0) FROM events), outcome = 'delivered' WHERE id = ?",
      [id]
    );
  }

  function deliveries() {
    return db.query("SELECT * FROM deliveries ORDER BY event_seq, recipient").all() as {
      event_seq: number;
      recipient: string;
      acked_at: number | null;
    }[];
  }

  return { db, peers, log, alive, clock, join, events, rows, openFeature, closeFeature, deliveries };
}
