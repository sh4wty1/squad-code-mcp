import { expect } from "bun:test";
import { openDatabase } from "../../db.ts";
import { createLog, type FeatureRow } from "../../log.ts";
import { createPeers, type RegisterRequest } from "../../peers.ts";
import { createPermission } from "../../permission.ts";
import { createPlan } from "../../plan.ts";
import { createSend, type Caller } from "../../send.ts";
import { createSession } from "../../session.ts";
import { createState } from "../../state.ts";
import type { PlannedTicket } from "../../shared/contract.ts";

export const NOW = 1791331200000;

// The human credential of the broker under test. No file is read or written for it.
export const HUMAN_TOKEN = "0123456789abcdef0123456789abcdef";

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
  const session = createSession(log);
  const permission = createPermission(log, HUMAN_TOKEN);
  const { state } = createState(log);

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

  // Events of the cycle of a ticket put straight in the log, as the rules would leave
  // them: the state a test starts from. Each one returns its seq.
  const given = {
    plan(tickets: PlannedTicket[]) {
      return log.record({ kind: "plan", from: "leader", role_from: "leader", data: { tickets } });
    },
    task(ticket_ref: string, to: string) {
      return log.record({
        kind: "task", from: "leader", role_from: "leader", to, summary: "do it", ticket_ref, data: { loadout: [] },
      });
    },
    result(ticket_ref: string, from: string, task_seq: number) {
      return log.record({
        kind: "result", from, role_from: "worker", to: "judge", summary: "done", ticket_ref,
        data: { task_seq, branch: "squad/x", commit: "abc1234" },
      });
    },
    verdict(ticket_ref: string, result_seq: number, outcome: "approve" | "rework") {
      return log.record({
        kind: "verdict", from: "judge", role_from: "judge", to: "leader", summary: outcome, ticket_ref,
        data: { result_seq, outcome, criteria: [{ n: 1, text: "works", pass: outcome === "approve" }] },
      });
    },
    // `rounds` times task, result and verdict of rework for the ticket
    reworks(ticket_ref: string, worker: string, rounds: number) {
      for (let i = 0; i < rounds; i++) {
        const task = given.task(ticket_ref, worker);
        given.verdict(ticket_ref, given.result(ticket_ref, worker, task), "rework");
      }
    },
  };

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
    db, peers, log, send, plan, session, permission, state, alive, clock, join, events, rows, openFeature, closeFeature, deliveries, refusedWith, given,
  };
}
