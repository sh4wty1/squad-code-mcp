import { expect, test } from "bun:test";
import type { PlannedTicket, SquadEvent } from "../../shared/contract.ts";
import { tickets } from "../../shared/derive.ts";

// Events of the open feature in the read format, with the seq given
function event(seq: number, fields: Record<string, unknown>): SquadEvent {
  return {
    seq,
    ts: 1791331200000 + seq,
    feature_id: 1,
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    ...fields,
  } as SquadEvent;
}

function plan(seq: number, list: PlannedTicket[]): SquadEvent {
  return event(seq, { kind: "plan", from: "leader", role_from: "leader", tickets: list });
}

function task(seq: number, ticket_ref: string, to: string): SquadEvent {
  return event(seq, { kind: "task", from: "leader", role_from: "leader", to, summary: "do it", ticket_ref, loadout: [] });
}

function result(seq: number, ticket_ref: string, from: string, task_seq: number): SquadEvent {
  return event(seq, {
    kind: "result", from, role_from: "worker", to: "judge", summary: "done", ticket_ref, task_seq, branch: "b", commit: "c",
  });
}

function verdict(seq: number, ticket_ref: string, result_seq: number, outcome: "approve" | "rework"): SquadEvent {
  return event(seq, {
    kind: "verdict", from: "judge", role_from: "judge", to: "leader", summary: outcome, ticket_ref, result_seq, outcome,
    criteria: [{ n: 1, text: "works", pass: outcome === "approve" }],
  });
}

test("EVT-20: the current plan is the plan of the greatest seq", () => {
  const state = tickets([
    plan(1, [{ ticket_ref: "A", title: "first title" }, { ticket_ref: "B", title: "gone" }]),
    plan(2, [{ ticket_ref: "A", title: "second title" }, { ticket_ref: "C", title: "new" }]),
  ]);
  expect([...state.keys()]).toEqual(["A", "C"]);
  expect(state.get("A")!.title).toBe("second title");
  expect(state.get("A")!.planned).toBe(true);
  expect(state.get("C")!.title).toBe("new");
  expect(state.has("B")).toBe(false);
});

test("EVT-20: the current plan is the one of the greatest seq whatever the order of the list", () => {
  const state = tickets([
    plan(5, [{ ticket_ref: "A", title: "current" }]),
    plan(2, [{ ticket_ref: "A", title: "old" }, { ticket_ref: "B", title: "old too" }]),
  ]);
  expect([...state.keys()]).toEqual(["A"]);
  expect(state.get("A")!.title).toBe("current");
});

test("EVT-20: without a plan there is no planned ticket", () => {
  expect(tickets([]).size).toBe(0);
  const state = tickets([task(1, "A", "worker-1")]);
  expect(state.get("A")).toEqual({
    ticket_ref: "A",
    title: "",
    planned: false,
    dropped: false,
    owner: "worker-1",
    taskSeq: 1,
    resultSeq: null,
    last: { kind: "task", seq: 1 },
    reworks: 0,
    approved: false,
  });
});

test("EVT-20: a planned ticket without events has a title and nothing else", () => {
  const state = tickets([plan(1, [{ ticket_ref: "A", title: "the parser", depends_on: [] }])]);
  expect(state.get("A")).toEqual({
    ticket_ref: "A",
    title: "the parser",
    planned: true,
    dropped: false,
    owner: null,
    taskSeq: null,
    resultSeq: null,
    last: null,
    reworks: 0,
    approved: false,
  });
});

test("EVT-24: the owner is the recipient of the latest task of the ticket", () => {
  const state = tickets([
    plan(1, [{ ticket_ref: "A", title: "a" }, { ticket_ref: "B", title: "b" }]),
    task(2, "A", "worker-1"),
    task(3, "B", "worker-2"),
    task(4, "A", "worker-3"),
  ]);
  expect(state.get("A")!.owner).toBe("worker-3");
  expect(state.get("A")!.taskSeq).toBe(4);
  expect(state.get("B")!.owner).toBe("worker-2");
  expect(state.get("B")!.taskSeq).toBe(3);
});

test("EVT-22: a ticket is approved only while its latest event is a verdict of approve", () => {
  const base = [plan(1, [{ ticket_ref: "A", title: "a" }]), task(2, "A", "worker-1"), result(3, "A", "worker-1", 2)];
  expect(tickets(base).get("A")!.approved).toBe(false);

  const approved = tickets([...base, verdict(4, "A", 3, "approve")]).get("A")!;
  expect(approved.approved).toBe(true);
  expect(approved.last).toEqual({ kind: "verdict", seq: 4, outcome: "approve" });

  const rework = tickets([...base, verdict(4, "A", 3, "rework")]).get("A")!;
  expect(rework.approved).toBe(false);
  expect(rework.last).toEqual({ kind: "verdict", seq: 4, outcome: "rework" });

  // An approve that is no longer the latest event of the ticket does not count
  const after = tickets([...base, verdict(4, "A", 3, "approve"), result(5, "A", "worker-1", 2)]).get("A")!;
  expect(after.approved).toBe(false);
  expect(after.last).toEqual({ kind: "result", seq: 5 });
});

test("EVT-23: reworks counts the verdicts of rework of the ticket", () => {
  const state = tickets([
    plan(1, [{ ticket_ref: "A", title: "a" }, { ticket_ref: "B", title: "b" }]),
    task(2, "A", "worker-1"),
    result(3, "A", "worker-1", 2),
    verdict(4, "A", 3, "rework"),
    task(5, "A", "worker-1"),
    result(6, "A", "worker-1", 5),
    verdict(7, "A", 6, "rework"),
    task(8, "A", "worker-1"),
    result(9, "A", "worker-1", 8),
    verdict(10, "A", 9, "approve"),
    task(11, "B", "worker-2"),
    result(12, "B", "worker-2", 11),
    verdict(13, "B", 12, "rework"),
  ]);
  expect(state.get("A")!.reworks).toBe(2);
  expect(state.get("A")!.approved).toBe(true);
  expect(state.get("B")!.reworks).toBe(1);
});

test("EVT-21: dropped comes from the current plan", () => {
  const dropped = tickets([
    plan(1, [{ ticket_ref: "A", title: "a" }, { ticket_ref: "B", title: "b" }]),
    task(2, "A", "worker-1"),
    plan(3, [{ ticket_ref: "A", title: "a", dropped: true }, { ticket_ref: "B", title: "b", dropped: false }]),
  ]);
  expect(dropped.get("A")!.dropped).toBe(true);
  expect(dropped.get("A")!.owner).toBe("worker-1");
  expect(dropped.get("B")!.dropped).toBe(false);

  // What an earlier plan said does not count
  const earlier = tickets([
    plan(1, [{ ticket_ref: "A", title: "a", dropped: true }]),
    plan(2, [{ ticket_ref: "A", title: "a" }]),
  ]);
  expect(earlier.get("A")!.dropped).toBe(false);
});

test("the ticket carries the seq of its latest task and of its latest result, and its latest event", () => {
  const events = [
    plan(1, [{ ticket_ref: "A", title: "a" }]),
    task(2, "A", "worker-1"),
    result(3, "A", "worker-1", 2),
    result(4, "A", "worker-1", 2),
  ];
  const reviewed = tickets(events).get("A")!;
  expect(reviewed.taskSeq).toBe(2);
  expect(reviewed.resultSeq).toBe(4);
  expect(reviewed.last).toEqual({ kind: "result", seq: 4 });

  const again = tickets([...events, task(5, "A", "worker-1")]).get("A")!;
  expect(again.taskSeq).toBe(5);
  expect(again.resultSeq).toBe(4);
  expect(again.last).toEqual({ kind: "task", seq: 5 });
});

test("a question, an answer and a blocked with the ticket_ref are not events of the ticket", () => {
  const events = [
    plan(1, [{ ticket_ref: "A", title: "a" }]),
    task(2, "A", "worker-1"),
    result(3, "A", "worker-1", 2),
    verdict(4, "A", 3, "approve"),
  ];
  const before = tickets(events).get("A")!;
  const state = tickets([
    ...events,
    event(5, { kind: "question", from: "worker-1", role_from: "worker", to: "leader", ticket_ref: "A", question_id: 1 }),
    event(6, { kind: "answer", from: "leader", role_from: "leader", to: "worker-1", ticket_ref: "A", question_id: 1 }),
    event(7, { kind: "blocked", from: "worker-1", role_from: "worker", ticket_ref: "A", reason: "r", detail: "", last_action: "" }),
    event(8, { kind: "blocked", from: "worker-2", role_from: "worker", ticket_ref: "Z", reason: "r", detail: "", last_action: "" }),
  ]);
  expect(state.get("A")).toEqual(before);
  expect(state.get("A")!.approved).toBe(true);
  expect(state.get("A")!.last).toEqual({ kind: "verdict", seq: 4, outcome: "approve" });
  // and a ticket_ref seen only in one of them is not a ticket
  expect([...state.keys()]).toEqual(["A"]);
});

test("a task and a result without ticket_ref belong to no ticket", () => {
  const state = tickets([
    event(1, { kind: "task", from: "mother", role_from: "mother", to: "leader", summary: "kickoff" }),
    event(2, { kind: "result", from: "leader", role_from: "leader", to: "mother", summary: "batch" }),
  ]);
  expect(state.size).toBe(0);
});
