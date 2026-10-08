import { expect, test } from "bun:test";
import { LEADER, NOW, setup } from "./helpers.ts";

const A = { ticket_ref: "A", title: "the parser" };
const B = { ticket_ref: "B", title: "the writer" };

// A task of the leader to a worker
function task(ticket_ref: unknown, to = "worker-1", fields: Record<string, unknown> = {}) {
  return { kind: "task", to, summary: "build it", body: "the brief", ticket_ref, loadout: ["tdd"], ...fields };
}

// A broker with a feature open and A and B in its plan
function planned() {
  const b = setup();
  const feature = b.openFeature();
  b.given.plan([A, B]);
  return { ...b, feature };
}

test("EVT-27: a task of the leader to a worker is stored with loadout and criteria in data, and nothing else", () => {
  const b = planned();
  b.clock.now = NOW + 40;
  const answer = b.send(LEADER, { ...task("A", "worker-2", { loadout: ["tdd", "review"], criteria: [1, 4] }), extra: true, title: "x" });
  expect(answer).toEqual({ ok: true, seq: 2 });
  expect(b.events()[1]).toEqual({
    seq: 2,
    ts: NOW + 40,
    kind: "task",
    feature_id: b.feature,
    from_name: "leader",
    role_from: "leader",
    to_name: "worker-2",
    summary: "build it",
    body: "the brief",
    ticket_ref: "A",
    question_id: null,
    gate_id: null,
    data: { loadout: ["tdd", "review"], criteria: [1, 4] },
  });
  expect(b.deliveries()).toEqual([{ event_seq: 2, recipient: "worker-2", acked_at: null }]);
});

test("EVT-27: without criteria data has only loadout, which may be empty", () => {
  const b = planned();
  expect(b.send(LEADER, task("A", "worker-1", { loadout: [] }))).toEqual({ ok: true, seq: 2 });
  expect(b.send(LEADER, task("B", "worker-2", { criteria: [] }))).toEqual({ ok: true, seq: 3 });
  expect(b.events()[1]!.data).toEqual({ loadout: [] });
  expect(b.events()[2]!.data).toEqual({ loadout: ["tdd"], criteria: [] });
});

test("EVT-19: a task to a worker without ticket_ref as a non-empty string is refused with missing_field", () => {
  const b = planned();
  for (const ticket_ref of [undefined, null, "", 7, ["A"]]) {
    b.refusedWith(() => b.send(LEADER, task(ticket_ref)), "leader", "task", "missing_field");
  }
});

test("EVT-19: a task to a worker without loadout as a list of strings is refused with missing_field", () => {
  const b = planned();
  for (const loadout of [undefined, null, "tdd", ["tdd", 3], [null], { 0: "tdd" }]) {
    b.refusedWith(() => b.send(LEADER, task("A", "worker-1", { loadout })), "leader", "task", "missing_field");
  }
});

test("EVT-19: a task to a worker with criteria that is not a list of integers is refused with missing_field", () => {
  const b = planned();
  for (const criteria of [null, 1, "1", [1, 2.5], ["1"], [1, null]]) {
    b.refusedWith(() => b.send(LEADER, task("A", "worker-1", { criteria })), "leader", "task", "missing_field");
  }
});

test("EVT-20: a task for a ticket outside the current plan is refused with unplanned_ticket", () => {
  const b = planned();
  b.refusedWith(() => b.send(LEADER, task("Z")), "leader", "task", "unplanned_ticket");
  // in an earlier plan and not in the current one
  b.given.plan([B]);
  b.refusedWith(() => b.send(LEADER, task("A")), "leader", "task", "unplanned_ticket");
  expect(b.send(LEADER, task("B"))).toEqual({ ok: true, seq: 5 });
});

test("EVT-20: without a plan in the open feature a task is refused with unplanned_ticket", () => {
  const b = setup();
  const old = b.openFeature();
  b.given.plan([A]);
  b.closeFeature(old);
  b.openFeature();
  b.refusedWith(() => b.send(LEADER, task("A")), "leader", "task", "unplanned_ticket");
});

test("EVT-21: a task for a dropped ticket is refused with ticket_dropped", () => {
  const b = planned();
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(LEADER, task("A")), "leader", "task", "ticket_dropped");
  expect(b.send(LEADER, task("B"))).toEqual({ ok: true, seq: 4 });
});

test("EVT-22: a task for an approved ticket is refused with ticket_closed", () => {
  const b = planned();
  const first = b.given.task("A", "worker-1");
  b.given.verdict("A", b.given.result("A", "worker-1", first), "approve");
  b.refusedWith(() => b.send(LEADER, task("A")), "leader", "task", "ticket_closed");
  b.refusedWith(() => b.send(LEADER, task("A", "worker-2")), "leader", "task", "ticket_closed");
});

test("EVT-23: the task after the second rework is accepted and the one after the third is refused with rework_limit", () => {
  const b = planned();
  b.given.reworks("A", "worker-1", 2);
  const third = b.send(LEADER, task("A"));
  expect(third).toEqual({ ok: true, seq: 8 });
  b.given.verdict("A", b.given.result("A", "worker-1", 8), "rework");
  b.refusedWith(() => b.send(LEADER, task("A")), "leader", "task", "rework_limit");
  b.refusedWith(() => b.send(LEADER, task("A", "worker-2")), "leader", "task", "rework_limit");
  // the reworks are of the ticket: B is untouched
  expect(b.send(LEADER, task("B", "worker-2"))).toEqual({ ok: true, seq: 13 });
});

test("EVT-24: a task for a worker that has another ticket open is refused with worker_busy", () => {
  const b = planned();
  expect(b.send(LEADER, task("A", "worker-1"))).toEqual({ ok: true, seq: 2 });
  b.refusedWith(() => b.send(LEADER, task("B", "worker-1")), "leader", "task", "worker_busy");
  // in review and after a rework the ticket is still open for its worker
  const result = b.given.result("A", "worker-1", 2);
  b.refusedWith(() => b.send(LEADER, task("B", "worker-1")), "leader", "task", "worker_busy");
  b.given.verdict("A", result, "rework");
  b.refusedWith(() => b.send(LEADER, task("B", "worker-1")), "leader", "task", "worker_busy");
  // another worker is free
  expect(b.send(LEADER, task("B", "worker-2"))).toEqual({ ok: true, seq: 8 });
});

test("EVT-24: the approval of its ticket frees the worker", () => {
  const b = planned();
  const first = b.given.task("A", "worker-1");
  b.given.verdict("A", b.given.result("A", "worker-1", first), "approve");
  expect(b.send(LEADER, task("B", "worker-1"))).toEqual({ ok: true, seq: 5 });
});

test("EVT-24: a task for a ticket in working and in review is accepted", () => {
  const b = planned();
  b.given.task("A", "worker-1");
  // working: the latest event of the ticket is a task
  expect(b.send(LEADER, task("A", "worker-1"))).toEqual({ ok: true, seq: 3 });
  // review: the latest event of the ticket is a result
  b.given.result("A", "worker-1", 3);
  expect(b.send(LEADER, task("A", "worker-1"))).toEqual({ ok: true, seq: 5 });
  expect(b.events().map((e) => e.kind)).toEqual(["plan", "task", "task", "result", "task"]);
});

test("EVT-24: a task of the same ticket to another worker frees the previous owner", () => {
  const b = planned();
  b.given.task("A", "worker-1");
  expect(b.send(LEADER, task("A", "worker-2"))).toEqual({ ok: true, seq: 3 });
  expect(b.send(LEADER, task("B", "worker-1"))).toEqual({ ok: true, seq: 4 });
  // and the new owner is the busy one
  b.refusedWith(() => b.send(LEADER, task("B", "worker-2")), "leader", "task", "worker_busy");
});

test("EVT-24: the plan that drops the open ticket of a worker frees it", () => {
  const b = planned();
  b.given.task("A", "worker-1");
  b.refusedWith(() => b.send(LEADER, task("B", "worker-1")), "leader", "task", "worker_busy");
  b.given.plan([{ ...A, dropped: true }, B]);
  expect(b.send(LEADER, task("B", "worker-1"))).toEqual({ ok: true, seq: 5 });
});

test("EVT-20/22/23/24: the tickets of a feature that closed do not count, even with the same ticket_ref", () => {
  const b = setup();
  const old = b.openFeature();
  b.given.plan([A, B, { ticket_ref: "C", title: "c" }, { ticket_ref: "D", title: "d", dropped: true }]);
  // there A was approved, B had three reworks, C is open for worker-3 and D was dropped
  const first = b.given.task("A", "worker-1");
  b.given.verdict("A", b.given.result("A", "worker-1", first), "approve");
  b.given.reworks("B", "worker-2", 3);
  b.given.task("C", "worker-3");
  b.closeFeature(old);

  const id = b.openFeature();
  b.given.plan([A, B, { ticket_ref: "D", title: "d" }]);
  const answers = [
    b.send(LEADER, task("A", "worker-1")),
    b.send(LEADER, task("B", "worker-2")),
    b.send(LEADER, task("D", "worker-3")),
  ];
  expect(answers.map((a) => a.ok)).toEqual([true, true, true]);
  expect(b.events().slice(-3).map((e) => [e.feature_id, e.ticket_ref, e.to_name])).toEqual([
    [id, "A", "worker-1"],
    [id, "B", "worker-2"],
    [id, "D", "worker-3"],
  ]);
});

test("EVT-25: unplanned_ticket comes before ticket_closed, rework_limit and worker_busy", () => {
  // Z left the plan after being approved, with three reworks, and worker-1 is busy with A
  const b = planned();
  b.given.reworks("Z", "worker-2", 3);
  const last = b.given.task("Z", "worker-2");
  b.given.verdict("Z", b.given.result("Z", "worker-2", last), "approve");
  b.given.task("A", "worker-1");
  b.refusedWith(() => b.send(LEADER, task("Z", "worker-1")), "leader", "task", "unplanned_ticket");
});

test("EVT-25: ticket_dropped comes before ticket_closed", () => {
  const b = planned();
  const first = b.given.task("A", "worker-1");
  b.given.verdict("A", b.given.result("A", "worker-1", first), "approve");
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(LEADER, task("A")), "leader", "task", "ticket_dropped");
});

test("EVT-25: ticket_closed comes before rework_limit", () => {
  const b = planned();
  b.given.reworks("A", "worker-1", 3);
  const last = b.given.task("A", "worker-1");
  b.given.verdict("A", b.given.result("A", "worker-1", last), "approve");
  b.refusedWith(() => b.send(LEADER, task("A")), "leader", "task", "ticket_closed");
});

test("EVT-25: rework_limit comes before worker_busy", () => {
  const b = planned();
  b.given.reworks("A", "worker-1", 3);
  b.given.task("B", "worker-2");
  b.refusedWith(() => b.send(LEADER, task("A", "worker-2")), "leader", "task", "rework_limit");
});

test("EVT-10: no_open_feature comes before the missing_field of the task", () => {
  const b = setup();
  b.refusedWith(() => b.send(LEADER, { kind: "task", to: "worker-1", summary: "s" }), "leader", "task", "no_open_feature");
});

test("EVT-10: the missing_field of the task comes before the refusals of state", () => {
  const b = planned();
  b.refusedWith(() => b.send(LEADER, task("Z", "worker-1", { loadout: undefined })), "leader", "task", "missing_field");
  b.refusedWith(() => b.send(LEADER, task("Z", "worker-1", { criteria: "all" })), "leader", "task", "missing_field");
});
