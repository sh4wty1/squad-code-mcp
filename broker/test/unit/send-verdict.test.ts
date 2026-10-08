import { expect, test } from "bun:test";
import { JUDGE, LEADER, NOW, setup, WORKER_1 } from "./helpers.ts";

const A = { ticket_ref: "A", title: "the parser" };
const B = { ticket_ref: "B", title: "the writer" };

const CRITERIA = [
  { n: 1, text: "parses a list", pass: true },
  { n: 2, text: "reports the line of an error", pass: false, note: "the line is off by one" },
];

// A verdict of the judge to the leader
function verdict(ticket_ref: unknown, result_seq: unknown, fields: Record<string, unknown> = {}) {
  return {
    kind: "verdict",
    to: "leader",
    summary: "one criterion fails",
    body: "the review",
    ticket_ref,
    result_seq,
    outcome: "rework",
    criteria: CRITERIA,
    ...fields,
  };
}

// A broker with a feature open, A and B in its plan and A in review: task 2, result 3
function inReview() {
  const b = setup();
  const feature = b.openFeature();
  b.given.plan([A, B]);
  b.given.result("A", "worker-1", b.given.task("A", "worker-1"));
  return { ...b, feature };
}

test("EVT-38: a verdict of the judge is stored with result_seq, outcome and criteria in data, and nothing else", () => {
  const b = inReview();
  b.clock.now = NOW + 15;
  const answer = b.send(JUDGE, { ...verdict("A", 3), task_seq: 2, branch: "b", loadout: [], extra: 1 });
  expect(answer).toEqual({ ok: true, seq: 4 });
  expect(b.events().slice(3)).toEqual([
    {
      seq: 4,
      ts: NOW + 15,
      kind: "verdict",
      feature_id: b.feature,
      from_name: "judge",
      role_from: "judge",
      to_name: "leader",
      summary: "one criterion fails",
      body: "the review",
      ticket_ref: "A",
      question_id: null,
      gate_id: null,
      data: { result_seq: 3, outcome: "rework", criteria: CRITERIA },
    },
  ]);
  expect(b.deliveries().at(-1)).toEqual({ event_seq: 4, recipient: "leader", acked_at: null });
});

test("EVT-38: a verdict of approve is stored, and each criterion keeps only n, text, pass and note", () => {
  const b = inReview();
  const criteria = [
    { n: 1, text: "", pass: true, weight: 3, seq: 9 },
    { n: 0, text: "x", pass: false, note: "", by: "judge" },
  ];
  expect(b.send(JUDGE, verdict("A", 3, { outcome: "approve", criteria }))).toEqual({ ok: true, seq: 4 });
  expect(b.events()[3]!.data).toEqual({
    result_seq: 3,
    outcome: "approve",
    criteria: [
      { n: 1, text: "", pass: true },
      { n: 0, text: "x", pass: false, note: "" },
    ],
  });
});

test("EVT-33: a verdict without ticket_ref as a non-empty string, result_seq as an integer or outcome as a string is refused with missing_field", () => {
  const b = inReview();
  for (const ticket_ref of [undefined, null, "", 3]) {
    b.refusedWith(() => b.send(JUDGE, verdict(ticket_ref, 3)), "judge", "verdict", "missing_field");
  }
  for (const result_seq of [undefined, null, "3", 3.5, [3]]) {
    b.refusedWith(() => b.send(JUDGE, verdict("A", result_seq)), "judge", "verdict", "missing_field");
  }
  for (const outcome of [undefined, null, 1, true, ["approve"]]) {
    b.refusedWith(() => b.send(JUDGE, verdict("A", 3, { outcome })), "judge", "verdict", "missing_field");
  }
});

test("EVT-33: a verdict whose criteria is not a non-empty list of criteria is refused with missing_field", () => {
  const b = inReview();
  const ok = { n: 1, text: "works", pass: true };
  const lists = [
    undefined,
    null,
    [],
    ok,
    "all pass",
    [ok, null],
    [ok, "works"],
    [{ text: "works", pass: true }],
    [{ ...ok, n: "1" }],
    [{ ...ok, n: 1.5 }],
    [{ n: 1, pass: true }],
    [{ ...ok, text: 7 }],
    [{ n: 1, text: "works" }],
    [{ ...ok, pass: "true" }],
    [{ ...ok, pass: 1 }],
    [{ ...ok, note: 3 }],
    [{ ...ok, note: null }],
    // one bad criterion after a good one
    [ok, { ...ok, pass: null }],
  ];
  for (const criteria of lists) {
    b.refusedWith(() => b.send(JUDGE, verdict("A", 3, { criteria })), "judge", "verdict", "missing_field");
  }
});

test("EVT-34: an outcome that is not approve nor rework is refused with invalid_field", () => {
  const b = inReview();
  for (const outcome of ["reject", "", "Approve", "approved", "comment"]) {
    b.refusedWith(() => b.send(JUDGE, verdict("A", 3, { outcome })), "judge", "verdict", "invalid_field");
  }
});

test("EVT-21: a verdict of a dropped ticket is refused with ticket_dropped", () => {
  const b = inReview();
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(JUDGE, verdict("A", 3)), "judge", "verdict", "ticket_dropped");
});

test("EVT-35: a verdict whose result_seq is not the seq of the latest result of the ticket is refused with stale_reference", () => {
  const b = inReview();
  const latest = b.given.result("A", "worker-1", 2);
  // the earlier result, the task, the plan, a seq that does not exist and the neighbours
  for (const result_seq of [3, 2, 1, 0, 99, latest + 1, latest - 1]) {
    b.refusedWith(() => b.send(JUDGE, verdict("A", result_seq)), "judge", "verdict", "stale_reference");
  }
  expect(b.send(JUDGE, verdict("A", latest)).ok).toBe(true);
});

test("EVT-35: a verdict of a ticket without a result is refused with stale_reference", () => {
  const b = inReview();
  const task = b.given.task("B", "worker-2");
  // with a task only, planned and never started, and not a ticket at all
  b.refusedWith(() => b.send(JUDGE, verdict("B", task)), "judge", "verdict", "stale_reference");
  b.refusedWith(() => b.send(JUDGE, verdict("B", 3)), "judge", "verdict", "stale_reference");
  b.given.plan([A, B, { ticket_ref: "C", title: "c" }]);
  b.refusedWith(() => b.send(JUDGE, verdict("C", 3)), "judge", "verdict", "stale_reference");
  b.refusedWith(() => b.send(JUDGE, verdict("Z", 3)), "judge", "verdict", "stale_reference");
});

test("EVT-35: a verdict that cites the result of a feature that closed is refused with stale_reference", () => {
  const b = inReview();
  b.closeFeature(b.feature);
  b.openFeature();
  b.given.plan([A]);
  b.refusedWith(() => b.send(JUDGE, verdict("A", 3)), "judge", "verdict", "stale_reference");
  b.given.task("A", "worker-1");
  b.refusedWith(() => b.send(JUDGE, verdict("A", 3)), "judge", "verdict", "stale_reference");
});

test("EVT-36: a second verdict for the same result is refused with stale_reference", () => {
  for (const outcome of ["rework", "approve"]) {
    const b = inReview();
    expect(b.send(JUDGE, verdict("A", 3, { outcome }))).toEqual({ ok: true, seq: 4 });
    b.refusedWith(() => b.send(JUDGE, verdict("A", 3)), "judge", "verdict", "stale_reference");
    b.refusedWith(() => b.send(JUDGE, verdict("A", 3, { outcome: "approve" })), "judge", "verdict", "stale_reference");
  }
});

test("EVT-36: the verdict of another ticket does not make the result stale", () => {
  const b = inReview();
  const other = b.given.result("B", "worker-2", b.given.task("B", "worker-2"));
  b.given.verdict("B", other, "rework");
  expect(b.send(JUDGE, verdict("A", 3)).ok).toBe(true);
});

test("EVT-37: a verdict of a result that a later task replaced is refused with stale_reference", () => {
  const b = inReview();
  const again = b.given.task("A", "worker-1");
  b.refusedWith(() => b.send(JUDGE, verdict("A", 3)), "judge", "verdict", "stale_reference");
  // the result of the new task is the one that can be judged
  const result = b.given.result("A", "worker-1", again);
  b.refusedWith(() => b.send(JUDGE, verdict("A", 3)), "judge", "verdict", "stale_reference");
  expect(b.send(JUDGE, verdict("A", result))).toEqual({ ok: true, seq: result + 2 });
});

test("EVT-37: the later task of another ticket does not make the result stale", () => {
  const b = inReview();
  b.given.task("B", "worker-2");
  expect(b.send(JUDGE, verdict("A", 3)).ok).toBe(true);
});

test("EVT-21/35: ticket_dropped comes before stale_reference", () => {
  const b = inReview();
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(JUDGE, verdict("A", 2)), "judge", "verdict", "ticket_dropped");
});

test("EVT-10: no_open_feature comes before the missing_field of the verdict", () => {
  const b = setup();
  b.refusedWith(() => b.send(JUDGE, { kind: "verdict", to: "leader", summary: "s" }), "judge", "verdict", "no_open_feature");
});

test("EVT-10: the missing_field of the fields of the kind comes before their invalid_field", () => {
  const b = inReview();
  b.refusedWith(() => b.send(JUDGE, verdict("A", 3, { outcome: "maybe", criteria: [] })), "judge", "verdict", "missing_field");
  b.refusedWith(() => b.send(JUDGE, verdict("A", "3", { outcome: "maybe" })), "judge", "verdict", "missing_field");
});

test("EVT-10: the invalid_field of the fields of the kind comes before the refusals of state", () => {
  const b = inReview();
  b.refusedWith(() => b.send(JUDGE, verdict("A", 2, { outcome: "maybe" })), "judge", "verdict", "invalid_field");
  b.given.plan([{ ...A, dropped: true }, B]);
  b.refusedWith(() => b.send(JUDGE, verdict("A", 3, { outcome: "maybe" })), "judge", "verdict", "invalid_field");
});

test("EVT-23: the whole cycle: the task after the second rework is accepted and the one after the third gets rework_limit", () => {
  const b = setup();
  const id = b.openFeature();
  const task = { kind: "task", to: "worker-1", summary: "build the parser", ticket_ref: "A", loadout: [] };
  const result = { kind: "result", to: "judge", summary: "done", ticket_ref: "A", branch: "squad/a", commit: "0f3c9aa" };

  expect(b.plan(LEADER, { tickets: [A] })).toEqual({ ok: true, seq: 1 });
  // three rounds of task, result and verdict of rework: seqs 2 to 10
  for (const seq of [2, 5, 8]) {
    expect(b.send(LEADER, task)).toEqual({ ok: true, seq });
    expect(b.send(WORKER_1, { ...result, task_seq: seq })).toEqual({ ok: true, seq: seq + 1 });
    expect(b.send(JUDGE, verdict("A", seq + 1))).toEqual({ ok: true, seq: seq + 2 });
  }
  b.refusedWith(() => b.send(LEADER, task), "leader", "task", "rework_limit");

  expect(b.events().map((e) => e.kind)).toEqual([
    "plan",
    "task", "result", "verdict",
    "task", "result", "verdict",
    "task", "result", "verdict",
    "refused",
  ]);
  expect(b.events().every((e) => e.feature_id === id)).toBe(true);
  expect(b.events().filter((e) => e.kind === "verdict").map((e) => e.data.outcome)).toEqual(["rework", "rework", "rework"]);
});
