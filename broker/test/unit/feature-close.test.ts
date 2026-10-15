import { expect, test } from "bun:test";
import { createFeature } from "../../feature.ts";
import { HUMAN_TOKEN, JUDGE, LEADER, MOTHER, NOW, setup, WORKER_1 } from "./helpers.ts";

const FIELDS = {
  title: "the importer",
  workflow: "tlc",
  branch: "feat/importer",
  base_branch: "develop",
  spec_ref: ".specs/features/importer/spec.md",
  spec_commit: "9f8e7d6",
};

const mother = { ...MOTHER, cwd: "/work/wt", git_root: "/work/importer/.git" };

const BLOCKED = { reason: "the test database is down", detail: "connection refused on 5432", last_action: "ran bun test" };
const USAGE = { session_id: "s-123", model: "opus", input: 1200, output: 340, cache_write: 50, cache_read: 9000 };

function start() {
  const b = setup();
  return { ...b, feature: createFeature(b.log, b.gate.approved) };
}

// What the mother asks to deliver the feature
const DELIVERY = { scope: "delivery", summary: "deliver", action: "merge feat/importer", effect: "develop gets it", commit: "abc1234" };

// Asks a gate and decides it as the dev; returns the gate_id
function decided(b: ReturnType<typeof setup>, decision: string | null, fields: Record<string, unknown> = {}): number {
  const asked = b.gate.request(MOTHER, { ...DELIVERY, ...fields }) as { gate_id: number; seq: number };
  if (decision) b.gate.decide({ human_token: HUMAN_TOKEN, gate_id: asked.gate_id, request_seq: asked.seq, decision, text: "because" });
  return asked.gate_id;
}

function gateRows(b: ReturnType<typeof setup>) {
  return b.db.query("SELECT id, status, decision_seq FROM gates ORDER BY id").all();
}

// A broker with a feature opened by the rule
function opened() {
  const b = start();
  const { feature_id } = b.feature.open(mother, FIELDS) as { feature_id: number };
  return { ...b, feature_id };
}

function featureRows(b: ReturnType<typeof setup>) {
  return b.db.query("SELECT * FROM features ORDER BY id").all() as Record<string, unknown>[];
}

// A refused /close-feature (FEAT-20): the trace with feature_closed as the attempted kind,
// and `features` as it was
function refusedClose(b: ReturnType<typeof start>, peer: typeof MOTHER, body: Record<string, unknown>, error: string) {
  const rows = featureRows(b);
  b.refusedWith(() => b.feature.close(peer, body), peer.name, "feature_closed", error);
  expect(featureRows(b)).toEqual(rows);
}

for (const outcome of ["delivered", "abandoned"]) {
  test(`FEAT-14: the mother closes the feature as ${outcome} and gets the seq of the feature_closed`, () => {
    const b = opened();
    // delivered after the dev approved the delivery (GAT-26): the gate and its decision are 2 and 3
    if (outcome === "delivered") decided(b, "approve");
    const seq = b.events().length + 1;
    b.clock.now = NOW + 600;
    expect(b.feature.close(MOTHER, { outcome, body: "what was left out" })).toEqual({ ok: true, seq });
    expect(b.events()[seq - 1]).toEqual({
      seq,
      ts: NOW + 600,
      kind: "feature_closed",
      feature_id: b.feature_id,
      from_name: "mother",
      role_from: "mother",
      to_name: "*",
      summary: "",
      body: "what was left out",
      ticket_ref: null,
      question_id: null,
      gate_id: null,
      data: { outcome },
    });
    expect(featureRows(b)).toEqual([
      { id: b.feature_id, project: "importer", ...FIELDS, opened_seq: 1, closed_seq: seq, outcome },
    ]);
  });
}

test("FEAT-14: without a body the feature_closed is stored with an empty one, and nothing of the rest of the body", () => {
  const b = opened();
  expect(b.feature.close(MOTHER, { outcome: "abandoned", feature_id: 9, from: "leader", note: "ignored" })).toEqual({
    ok: true,
    seq: 2,
  });
  const closed = b.events()[1]!;
  expect([closed.body, closed.feature_id, closed.from_name]).toEqual(["", b.feature_id, "mother"]);
  expect(closed.data).toEqual({ outcome: "abandoned" });
});

for (const peer of [LEADER, WORKER_1, JUDGE]) {
  test(`FEAT-15: a ${peer.role} that closes the feature is refused with edge_not_allowed`, () => {
    const b = opened();
    refusedClose(b, peer, { outcome: "delivered" }, "edge_not_allowed");
    expect(b.log.openFeature()!.id).toBe(b.feature_id);
  });
}

test("FEAT-16: without an open feature the close is refused with no_open_feature", () => {
  const b = start();
  refusedClose(b, MOTHER, { outcome: "delivered" }, "no_open_feature");
});

test("FEAT-16: a second close in a row is refused with no_open_feature and the first one stays", () => {
  const b = opened();
  b.feature.close(MOTHER, { outcome: "abandoned" });
  refusedClose(b, MOTHER, { outcome: "delivered" }, "no_open_feature");
  expect(featureRows(b).map((f) => [f.closed_seq, f.outcome])).toEqual([[2, "abandoned"]]);
});

for (const [what, body] of [
  ["an absent outcome", {}],
  ["an outcome null", { outcome: null }],
  ["an outcome that is not a text", { outcome: 1 }],
  ["a body that is a number", { outcome: "delivered", body: 5 }],
  ["a body that is an object", { outcome: "delivered", body: { text: "x" } }],
  ["a body null", { outcome: "delivered", body: null }],
] as [string, Record<string, unknown>][]) {
  test(`FEAT-17: ${what} is refused with missing_field`, () => {
    const b = opened();
    refusedClose(b, MOTHER, body, "missing_field");
    expect(b.log.openFeature()!.id).toBe(b.feature_id);
  });
}

for (const outcome of ["done", "approve", "Delivered", ""]) {
  test(`FEAT-18: the outcome "${outcome}" is refused with invalid_field`, () => {
    const b = opened();
    refusedClose(b, MOTHER, { outcome }, "invalid_field");
    expect(b.log.openFeature()!.id).toBe(b.feature_id);
  });
}

test("FEAT-19: a leader that closes without an open feature is refused by the role, not by the state", () => {
  const b = start();
  refusedClose(b, LEADER, { outcome: "delivered" }, "edge_not_allowed");
});

test("FEAT-19: the mother without an open feature and without outcome is refused by the state, not by the field", () => {
  const b = start();
  refusedClose(b, MOTHER, {}, "no_open_feature");
});

test("FEAT-19: an invalid outcome and a body that is not a text are refused with missing_field", () => {
  const b = opened();
  refusedClose(b, MOTHER, { outcome: "done", body: 5 }, "missing_field");
});

test("FEAT-22: closing with a peer blocked records no unblocked for it", () => {
  const b = opened();
  b.session.blocked(WORKER_1, BLOCKED);
  b.feature.close(MOTHER, { outcome: "abandoned" });
  expect(b.events().map((e) => e.kind)).toEqual(["feature_opened", "blocked", "feature_closed"]);
  expect(b.log.blocked("worker-1")).toBe(true);
});

test("FEAT-22: blocked, usage and turn_started after the close are recorded with feature_id null", () => {
  const b = opened();
  b.feature.close(MOTHER, { outcome: "abandoned" });
  expect(b.session.blocked(WORKER_1, BLOCKED)).toEqual({ ok: true, seq: 3 });
  expect(b.session.usage(WORKER_1, USAGE)).toEqual({ ok: true, seq: 4 });
  expect(b.session.turnStarted(WORKER_1)).toEqual({ ok: true, seq: 5 });
  expect(b.events().slice(2).map((e) => [e.kind, e.feature_id])).toEqual([
    ["blocked", null],
    ["usage", null],
    ["turn_started", null],
  ]);
});

test("FEAT-24: after the close, /send and /plan are refused with no_open_feature", () => {
  const b = opened();
  b.feature.close(MOTHER, { outcome: "abandoned" });
  b.refusedWith(() => b.send(MOTHER, { kind: "task", to: "leader", summary: "go" }), "mother", "task", "no_open_feature");
  b.refusedWith(
    () => b.plan(LEADER, { tickets: [{ ticket_ref: "A", title: "the parser" }] }),
    "leader",
    "plan",
    "no_open_feature"
  );
});

test("FEAT-24: after the close the state has no feature, no ticket and no debt but the deliveries", () => {
  const b = opened();
  // the leader owes the plan and a task, the judge a verdict and worker-1 a result
  b.send(MOTHER, { kind: "task", to: "leader", summary: "go" });
  b.given.reworks("V", "worker-3", 1);
  b.given.result("U", "worker-2", b.given.task("U", "worker-2"));
  const task = b.given.task("T", "worker-1");
  const debts = (peer: typeof MOTHER) => b.state(peer).owed.map((o) => o.owes).filter((owes) => owes !== "delivery");
  expect(debts(LEADER)).toEqual(["plan", "task"]);
  expect(debts(JUDGE)).toEqual(["verdict"]);
  expect(debts(WORKER_1)).toEqual(["result"]);
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "T", title: "", task_seq: task, reworks: 0 });

  const closed = (b.feature.close(MOTHER, { outcome: "abandoned" }) as { seq: number }).seq;
  expect(b.state(WORKER_1)).toEqual({
    feature: null,
    ticket: null,
    owed: [
      { owes: "delivery", seq: 1 },
      { owes: "delivery", seq: task },
      { owes: "delivery", seq: closed },
    ],
  });
  for (const peer of [LEADER, JUDGE]) {
    const state = b.state(peer);
    expect([state.feature, state.ticket]).toEqual([null, null]);
    expect(debts(peer)).toEqual([]);
  }
});

test("FEAT-25: after the close a new feature is opened, and the tickets of the earlier one do not count in it", () => {
  const b = opened();
  b.plan(LEADER, { tickets: [{ ticket_ref: "T", title: "the parser" }, { ticket_ref: "U", title: "the writer" }] });
  const other = { kind: "task", to: "worker-1", summary: "do it", ticket_ref: "U", loadout: [] };
  b.given.task("T", "worker-1");
  // worker-1 has T open: it takes no other ticket in this feature
  b.refusedWith(() => b.send(LEADER, other), "leader", "task", "worker_busy");
  b.feature.close(MOTHER, { outcome: "abandoned" });

  const next = b.feature.open(mother, { ...FIELDS, title: "the next one" }) as { ok: true; feature_id: number };
  expect(next.ok).toBe(true);
  expect(next.feature_id).toBeGreaterThan(b.feature_id);
  // T is a new ticket here: the task it received belongs to the earlier feature
  const plan =b.plan(LEADER, { tickets: [{ ticket_ref: "T", title: "the new parser" }, { ticket_ref: "U", title: "the writer" }] });
  expect(plan.ok).toBe(true);
  const sent = b.send(LEADER, other) as { ok: true; seq: number };
  expect(sent.ok).toBe(true);
  expect(b.events().filter((e) => e.seq >= (plan as { seq: number }).seq).map((e) => [e.kind, e.feature_id, e.ticket_ref])).toEqual([
    ["plan", next.feature_id, null],
    ["task", next.feature_id, "U"],
  ]);
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "U", title: "the writer", task_seq: sent.seq, reworks: 0 });
});

test("GAT-26: delivered without any gate is refused with gate_required and the feature stays open", () => {
  const b = opened();
  b.given.task("T", "worker-1");
  refusedClose(b, MOTHER, { outcome: "delivered" }, "gate_required");
  expect(b.log.openFeature()!.id).toBe(b.feature_id);
});

for (const [what, given] of [
  ["a delivery gate pending", (b: ReturnType<typeof setup>) => decided(b, null)],
  ["a delivery gate commented", (b: ReturnType<typeof setup>) => decided(b, "comment")],
  ["a delivery gate rejected", (b: ReturnType<typeof setup>) => decided(b, "reject")],
  ["only an action gate approved", (b: ReturnType<typeof setup>) => decided(b, "approve", { scope: "action" })],
] as [string, (b: ReturnType<typeof setup>) => void][]) {
  test(`GAT-26: delivered with ${what} is refused with gate_required`, () => {
    const b = opened();
    given(b);
    refusedClose(b, MOTHER, { outcome: "delivered" }, "gate_required");
    expect(b.log.openFeature()!.id).toBe(b.feature_id);
  });
}

test("GAT-26: the delivery approved in a feature that closed does not deliver the next one", () => {
  const b = opened();
  decided(b, "approve");
  expect(b.feature.close(MOTHER, { outcome: "delivered" })).toMatchObject({ ok: true });
  b.feature.open(mother, { ...FIELDS, title: "the next one" });
  refusedClose(b, MOTHER, { outcome: "delivered" }, "gate_required");
});

test("GAT-27: delivered with a delivery gate approved closes the feature, beside a rejected one and an action", () => {
  const b = opened();
  decided(b, "reject");
  decided(b, "approve", { scope: "action" });
  decided(b, "approve");
  const seq = b.events().length + 1;
  expect(b.feature.close(MOTHER, { outcome: "delivered" })).toEqual({ ok: true, seq });
  expect(featureRows(b).map((f) => [f.closed_seq, f.outcome])).toEqual([[seq, "delivered"]]);
});

test("GAT-27: abandoned closes the feature with a delivery gate pending", () => {
  const b = opened();
  decided(b, null);
  expect(b.feature.close(MOTHER, { outcome: "abandoned" })).toEqual({ ok: true, seq: 3 });
  expect(featureRows(b).map((f) => [f.closed_seq, f.outcome])).toEqual([[3, "abandoned"]]);
});

for (const outcome of ["delivered", "abandoned"]) {
  test(`GAT-28: closing as ${outcome} rejects the pending gates with decision_seq null, leaves the decided ones and writes no other event`, () => {
    const b = opened();
    // 1 pending, 2 commented, 3 rejected by 6, 4 approved by 8: a delivery
    decided(b, null, { scope: "action" });
    decided(b, "comment", { scope: "action" });
    decided(b, "reject", { scope: "action" });
    decided(b, "approve");
    const events = b.events();
    expect(gateRows(b)).toEqual([
      { id: 1, status: "pending", decision_seq: null },
      { id: 2, status: "pending", decision_seq: null },
      { id: 3, status: "rejected", decision_seq: 6 },
      { id: 4, status: "approved", decision_seq: 8 },
    ]);
    expect(b.feature.close(MOTHER, { outcome })).toEqual({ ok: true, seq: 9 });
    expect(gateRows(b)).toEqual([
      { id: 1, status: "rejected", decision_seq: null },
      { id: 2, status: "rejected", decision_seq: null },
      { id: 3, status: "rejected", decision_seq: 6 },
      { id: 4, status: "approved", decision_seq: 8 },
    ]);
    expect(b.events().slice(0, 8)).toEqual(events);
    expect(b.events().slice(8).map((e) => e.kind)).toEqual(["feature_closed"]);
  });
}

test("GAT-28: closing a feature does not touch a pending gate of another feature", () => {
  const b = opened();
  decided(b, null, { scope: "action" });
  b.feature.close(MOTHER, { outcome: "abandoned" });
  b.db.run("UPDATE gates SET status = 'pending' WHERE id = 1");
  b.feature.open(mother, { ...FIELDS, title: "the next one" });
  b.feature.close(MOTHER, { outcome: "abandoned" });
  expect(gateRows(b)).toEqual([{ id: 1, status: "pending", decision_seq: null }]);
});

test("GAT-10/28: the feature_closed and its gates are one transaction: when a gate cannot be closed the feature stays open", () => {
  const b = opened();
  decided(b, null);
  const events = b.events();
  b.db.run("CREATE TRIGGER broken BEFORE UPDATE ON gates BEGIN SELECT RAISE(ABORT, 'the disk is full'); END");
  expect(() => b.feature.close(MOTHER, { outcome: "abandoned" })).toThrow("the disk is full");
  expect(b.events()).toEqual(events);
  expect(gateRows(b)).toEqual([{ id: 1, status: "pending", decision_seq: null }]);
  expect(b.log.openFeature()?.id).toBe(b.feature_id);
});

// GAT-29: each rule before gate_required, in a call to deliver without a gate
test("GAT-29: edge_not_allowed comes before no_open_feature, and both before gate_required", () => {
  refusedClose(start(), LEADER, { outcome: "delivered" }, "edge_not_allowed");
  refusedClose(opened(), LEADER, { outcome: "delivered" }, "edge_not_allowed");
  refusedClose(start(), MOTHER, { outcome: "delivered" }, "no_open_feature");
});

test("GAT-29: missing_field comes before invalid_field and before gate_required", () => {
  refusedClose(opened(), MOTHER, { outcome: "delivered", body: 5 }, "missing_field");
  refusedClose(opened(), MOTHER, { outcome: "done", body: null }, "missing_field");
});

test("GAT-29: invalid_field comes before gate_required, and gate_required is the last", () => {
  const b = opened();
  decided(b, null);
  refusedClose(b, MOTHER, { outcome: "Delivered" }, "invalid_field");
  refusedClose(b, MOTHER, { outcome: "delivered", body: "all done" }, "gate_required");
});
