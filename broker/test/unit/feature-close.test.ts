import { expect, test } from "bun:test";
import { createFeature } from "../../feature.ts";
import { JUDGE, LEADER, MOTHER, NOW, setup, WORKER_1 } from "./helpers.ts";

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
  return { ...b, feature: createFeature(b.log) };
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
    b.clock.now = NOW + 600;
    expect(b.feature.close(MOTHER, { outcome, body: "what was left out" })).toEqual({ ok: true, seq: 2 });
    expect(b.events()[1]).toEqual({
      seq: 2,
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
      { id: b.feature_id, project: "importer", ...FIELDS, opened_seq: 1, closed_seq: 2, outcome },
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
  b.feature.close(MOTHER, { outcome: "delivered" });
  expect(b.session.blocked(WORKER_1, BLOCKED)).toEqual({ ok: true, seq: 3 });
  expect(b.session.usage(WORKER_1, USAGE)).toEqual({ ok: true, seq: 4 });
  expect(b.session.turnStarted(WORKER_1)).toEqual({ ok: true, seq: 5 });
  expect(b.events().slice(2).map((e) => [e.kind, e.feature_id])).toEqual([
    ["blocked", null],
    ["usage", null],
    ["turn_started", null],
  ]);
});

test("FEAT-23: delivered is accepted with no gate in the log", () => {
  const b = opened();
  b.given.task("T", "worker-1");
  expect(b.feature.close(MOTHER, { outcome: "delivered" })).toEqual({ ok: true, seq: 3 });
  expect(b.events().map((e) => e.kind)).toEqual(["feature_opened", "task", "feature_closed"]);
  expect(featureRows(b).map((f) => f.outcome)).toEqual(["delivered"]);
});

test("FEAT-24: after the close, /send and /plan are refused with no_open_feature", () => {
  const b = opened();
  b.feature.close(MOTHER, { outcome: "delivered" });
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
