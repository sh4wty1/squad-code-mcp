import { expect } from "bun:test";
import { openDatabase } from "../../db.ts";
import { createLog, type FeatureRow } from "../../log.ts";
import { createPeers, type RegisterRequest } from "../../peers.ts";
import { createPlan } from "../../plan.ts";
import { createSend, type Caller } from "../../send.ts";

export const NOW = 1791331200000;

// What `find` answers for the id of each position of the squad
export const MOTHER: Caller = { name: "mother", role: "mother" };
export const LEADER: Caller = { name: "leader", role: "leader" };
export const JUDGE: Caller = { name: "judge", role: "judge" };
export const WORKER_1: Caller = { name: "worker-1", role: "worker" };
export const WORKER_2: Caller = { name: "worker-2", role: "worker" };
export const WORKER_3: Caller = { name: "worker-3", role: "worker" };

// A broker over an in-memory database, with fake liveness and a fixed clock
export function setup() {
  const db = openDatabase(":memory:");
  const alive = new Set<number>();
  const clock = { now: NOW };
  const peers = createPeers(db, (pid) => alive.has(pid), () => clock.now);
  const log = createLog(db, () => clock.now);
  const { send } = createSend(log);
  const { plan } = createPlan(log);

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

  // Runs a call that has to be refused (EVT-47): the answer is the refusal with a hint, the
  // log gains its `refused` and nothing else, and no delivery changes. Returns the answer.
  function refusedWith(call: () => unknown, peer: string, attempted_kind: string, error: string) {
    const before = events();
    const deliveriesBefore = deliveries();
    const answer = call() as { ok: boolean; error: string; hint: string };
    expect({ ...answer, hint: typeof answer.hint }).toEqual({ ok: false, error, hint: "string" });
    expect(answer.hint).not.toBe("");
    expect(events()).toEqual([
      ...before,
      {
        seq: before.length + 1,
        ts: clock.now,
        kind: "refused",
        feature_id: log.openFeature()?.id ?? null,
        from_name: "broker",
        role_from: "broker",
        to_name: null,
        summary: "",
        body: "",
        ticket_ref: null,
        question_id: null,
        gate_id: null,
        data: { peer, attempted_kind, error },
      },
    ]);
    expect(deliveries()).toEqual(deliveriesBefore);
    return answer;
  }

  return {
    db, peers, log, send, plan, alive, clock, join, events, rows, openFeature, closeFeature, deliveries, refusedWith,
  };
}
