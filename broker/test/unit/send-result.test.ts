import { expect, test } from "bun:test";
import { LEADER, NOW, setup, WORKER_1, WORKER_2 } from "./helpers.ts";

const A = { ticket_ref: "A", title: "the parser" };
const B = { ticket_ref: "B", title: "the writer" };

// A result of a worker to the judge
function result(ticket_ref: unknown, task_seq: unknown, fields: Record<string, unknown> = {}) {
  return {
    kind: "result",
    to: "judge",
    summary: "parser done",
    body: "what was done",
    ticket_ref,
    task_seq,
    branch: "squad/a",
    commit: "0f3c9aa",
    ...fields,
  };
}

// A broker with a feature open, A and B in its plan and A with worker-1: the task is seq 3
function working() {
  const b = setup();
  const feature = b.openFeature();
  b.given.plan([A, B]);
  b.given.task("A", "worker-1");
  return { ...b, feature };
}

const BLOCKED = { kind: "blocked", role_from: "worker", data: { reason: "r", detail: "", last_action: "" } } as const;

test("EVT-32: a result of the owner to the judge is stored with task_seq, branch and commit in data, and nothing else", () => {
  const b = working();
  b.clock.now = NOW + 90;
  const answer = b.send(WORKER_1, { ...result("A", 3), loadout: ["tdd"], result_seq: 1, outcome: "approve" });
  expect(answer).toEqual({ ok: true, seq: 4 });
  expect(b.events().slice(3)).toEqual([
    {
      seq: 4,
      ts: NOW + 90,
      kind: "result",
      feature_id: b.feature,
      from_name: "worker-1",
      role_from: "worker",
      to_name: "judge",
      summary: "parser done",
      body: "what was done",
      ticket_ref: "A",
      question_id: null,
      gate_id: null,
      data: { task_seq: 3, branch: "squad/a", commit: "0f3c9aa" },
    },
  ]);
  expect(b.deliveries().at(-1)).toEqual({ event_seq: 4, recipient: "judge", acked_at: null });
});

test("EVT-32: a second result for the same task, still without a verdict, is accepted", () => {
  const b = working();
  expect(b.send(WORKER_1, result("A", 3))).toEqual({ ok: true, seq: 4 });
  expect(b.send(WORKER_1, result("A", 3, { commit: "1111111" }))).toEqual({ ok: true, seq: 5 });
  expect(b.events().slice(3).map((e) => [e.kind, e.data])).toEqual([
    ["result", { task_seq: 3, branch: "squad/a", commit: "0f3c9aa" }],
    ["result", { task_seq: 3, branch: "squad/a", commit: "1111111" }],
  ]);
});

test("EVT-28: a result to the judge without ticket_ref, branch and commit as non-empty strings is refused with missing_field", () => {
  const b = working();
  for (const value of [undefined, null, "", 5]) {
    b.refusedWith(() => b.send(WORKER_1, result(value, 2)), "worker-1", "result", "missing_field");
    b.refusedWith(() => b.send(WORKER_1, result("A", 3, { branch: value })), "worker-1", "result", "missing_field");
    b.refusedWith(() => b.send(WORKER_1, result("A", 3, { commit: value })), "worker-1", "result", "missing_field");
  }
});

test("EVT-28: a result to the judge without task_seq as an integer is refused with missing_field", () => {
  const b = working();
  for (const task_seq of [undefined, null, "2", 2.5, [2]]) {
    b.refusedWith(() => b.send(WORKER_1, result("A", task_seq)), "worker-1", "result", "missing_field");
  }
});

test("EVT-29: a result of a worker that is not the owner of the ticket is refused with not_owner", () => {
  const b = working();
  b.refusedWith(() => b.send(WORKER_2, result("A", 3)), "worker-2", "result", "not_owner");
  // the ticket went to another worker: the previous owner is not the owner anymore
  const again = b.given.task("A", "worker-2");
  b.refusedWith(() => b.send(WORKER_1, result("A", 3)), "worker-1", "result", "not_owner");
  b.refusedWith(() => b.send(WORKER_1, result("A", again)), "worker-1", "result", "not_owner");
  expect(b.send(WORKER_2, result("A", again))).toEqual({ ok: true, seq: again + 3 });
});

test("EVT-29: a result of a ticket that received no task in the open feature is refused with not_owner", () => {
  const b = setup();
  b.openFeature();
  b.given.plan([A, B]);
  const before = b.given.task("B", "worker-1");
  b.closeFeature();
  b.openFeature();
  b.given.plan([A, B]);
  // planned and never started, not in the plan at all, and started only in a feature that closed
  b.refusedWith(() => b.send(WORKER_1, result("A", 1)), "worker-1", "result", "not_owner");
  b.refusedWith(() => b.send(WORKER_1, result("Z", 1)), "worker-1", "result", "not_owner");
  b.refusedWith(() => b.send(WORKER_1, result("B", before)), "worker-1", "result", "not_owner");
});

test("EVT-21: a result of a dropped ticket is refused with ticket_dropped", () => {
  const b = working();
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(WORKER_1, result("A", 3)), "worker-1", "result", "ticket_dropped");
});

test("EVT-30: a result whose task_seq is not the seq of the latest task of the ticket is refused with stale_reference", () => {
  const b = working();
  const latest = b.given.task("A", "worker-1");
  // an earlier task of the ticket, the plan, a seq that does not exist and the next one
  for (const task_seq of [3, 2, 0, 99, latest + 1, latest - 1]) {
    b.refusedWith(() => b.send(WORKER_1, result("A", task_seq)), "worker-1", "result", "stale_reference");
  }
  expect(b.send(WORKER_1, result("A", latest)).ok).toBe(true);
});

test("EVT-30: a result that cites the task of a feature that closed is refused with stale_reference", () => {
  const b = setup();
  b.openFeature();
  b.given.plan([A]);
  const before = b.given.task("A", "worker-1");
  b.closeFeature();
  b.openFeature();
  b.given.plan([A]);
  const now = b.given.task("A", "worker-1");
  b.refusedWith(() => b.send(WORKER_1, result("A", before)), "worker-1", "result", "stale_reference");
  expect(b.send(WORKER_1, result("A", now))).toEqual({ ok: true, seq: now + 2 });
});

test("EVT-31: a result that cites a task already judged is refused with stale_reference", () => {
  const b = working();
  b.given.verdict("A", b.given.result("A", "worker-1", 3), "rework");
  b.refusedWith(() => b.send(WORKER_1, result("A", 3)), "worker-1", "result", "stale_reference");
  // the task of the rework comes after the verdict and can be answered
  const rework = b.given.task("A", "worker-1");
  expect(b.send(WORKER_1, result("A", rework))).toEqual({ ok: true, seq: rework + 1 });
  b.given.verdict("A", rework + 1, "approve");
  b.refusedWith(() => b.send(WORKER_1, result("A", rework)), "worker-1", "result", "stale_reference");
});

test("EVT-31: the verdict of another ticket does not make the task stale", () => {
  const b = working();
  const other = b.given.task("B", "worker-2");
  b.given.verdict("B", b.given.result("B", "worker-2", other), "rework");
  expect(b.send(WORKER_1, result("A", 3)).ok).toBe(true);
});

test("EVT-29/21: not_owner comes before ticket_dropped", () => {
  const b = working();
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(WORKER_2, result("A", 3)), "worker-2", "result", "not_owner");
});

test("EVT-21/30: ticket_dropped comes before stale_reference", () => {
  const b = working();
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(WORKER_1, result("A", 1)), "worker-1", "result", "ticket_dropped");
});

test("EVT-29/30: not_owner comes before stale_reference", () => {
  const b = working();
  b.refusedWith(() => b.send(WORKER_2, result("A", 1)), "worker-2", "result", "not_owner");
});

test("EVT-10: no_open_feature comes before the missing_field of the result", () => {
  const b = setup();
  b.refusedWith(() => b.send(WORKER_1, { kind: "result", to: "judge", summary: "s" }), "worker-1", "result", "no_open_feature");
});

test("EVT-10: the missing_field of the result comes before the refusals of state", () => {
  const b = working();
  b.refusedWith(() => b.send(WORKER_2, result("A", 1, { branch: "" })), "worker-2", "result", "missing_field");
  b.refusedWith(() => b.send(WORKER_2, result("Z", "1")), "worker-2", "result", "missing_field");
});

test("EVT-54: the result of a blocked worker is followed by an unblocked of the broker", () => {
  const b = working();
  b.log.record({ ...BLOCKED, from: "worker-1", ticket_ref: "A" });
  b.clock.now = NOW + 20;
  expect(b.send(WORKER_1, result("A", 3))).toEqual({ ok: true, seq: 5 });
  expect(b.events().slice(4).map((e) => e.kind)).toEqual(["result", "unblocked"]);
  expect(b.events()[5]).toEqual({
    seq: 6,
    ts: NOW + 20,
    kind: "unblocked",
    feature_id: b.feature,
    from_name: "broker",
    role_from: "broker",
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: { peer: "worker-1" },
  });
  // the five of the feature_opened, the task and the result: the unblocked has no delivery
  expect(b.deliveries().map((d) => d.event_seq)).toEqual([1, 1, 1, 1, 1, 3, 5]);
  // and the next result finds the worker unblocked
  b.send(WORKER_1, result("A", 3));
  expect(b.events().slice(6).map((e) => e.kind)).toEqual(["result"]);
});

test("EVT-54: a blocked about another ticket, about none or from before the feature is closed by the result too", () => {
  for (const ticket_ref of ["B", null]) {
    const b = working();
    b.log.record({ ...BLOCKED, from: "worker-1", ticket_ref });
    b.send(WORKER_1, result("A", 3));
    expect(b.events().slice(4).map((e) => [e.kind, e.from_name, e.data.peer])).toEqual([
      ["result", "worker-1", undefined],
      ["unblocked", "broker", "worker-1"],
    ]);
  }

  const b = setup();
  b.log.record({ ...BLOCKED, from: "worker-1" });
  b.openFeature();
  b.given.plan([A]);
  const task = b.given.task("A", "worker-1");
  b.send(WORKER_1, result("A", task));
  expect(b.events().slice(4).map((e) => [e.kind, e.from_name, e.data.peer])).toEqual([
    ["result", "worker-1", undefined],
    ["unblocked", "broker", "worker-1"],
  ]);
});

test("EVT-54: the result of a worker that is not blocked writes no unblocked", () => {
  const b = working();
  // never blocked, with worker-2 blocked
  b.log.record({ ...BLOCKED, from: "worker-2" });
  expect(b.send(WORKER_1, result("A", 3))).toEqual({ ok: true, seq: 5 });
  expect(b.events().slice(4).map((e) => e.kind)).toEqual(["result"]);

  // blocked and already unblocked, by itself or by the broker
  b.log.record({ ...BLOCKED, from: "worker-1" });
  b.log.record({ kind: "unblocked", from: "worker-1", role_from: "worker", data: { peer: "worker-1" } });
  b.send(WORKER_1, result("A", 3));
  b.log.record({ ...BLOCKED, from: "worker-1" });
  b.log.record({ kind: "unblocked", from: "broker", role_from: "broker", data: { peer: "worker-1" } });
  b.send(WORKER_1, result("A", 3));
  expect(b.events().slice(5).map((e) => e.kind)).toEqual(["blocked", "unblocked", "result", "blocked", "unblocked", "result"]);
});

test("EVT-54: a refused result leaves the worker blocked, and the result of a blocked leader writes no unblocked", () => {
  const b = working();
  b.log.record({ ...BLOCKED, from: "worker-1" });
  b.refusedWith(() => b.send(WORKER_1, result("A", 1)), "worker-1", "result", "stale_reference");
  expect(b.log.blocked("worker-1")).toBe(true);

  b.log.record({ ...BLOCKED, from: "leader", role_from: "leader" });
  expect(b.send(LEADER, { kind: "result", to: "mother", summary: "batch" })).toEqual({ ok: true, seq: 7 });
  expect(b.events().slice(6).map((e) => e.kind)).toEqual(["result"]);
  expect(b.log.blocked("leader")).toBe(true);
});

test("EVT-54: the result and its unblocked are one transaction: without the unblocked there is no result", () => {
  const b = working();
  b.log.record({ ...BLOCKED, from: "worker-1" });
  b.db.run(
    "CREATE TRIGGER no_unblocked BEFORE INSERT ON events WHEN NEW.kind = 'unblocked' BEGIN SELECT RAISE(ABORT, 'no unblocked'); END"
  );
  expect(() => b.send(WORKER_1, result("A", 3))).toThrow("no unblocked");
  expect(b.events().map((e) => e.kind)).toEqual(["feature_opened", "plan", "task", "blocked"]);
  expect(b.deliveries().map((d) => d.event_seq)).toEqual([1, 1, 1, 1, 1, 3]);
});
