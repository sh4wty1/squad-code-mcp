import { expect, test } from "bun:test";
import type { PlannedTicket, SquadEvent } from "../../shared/contract.ts";
import { features, owed, tickets } from "../../shared/derive.ts";

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

function kickoff(seq: number): SquadEvent {
  return event(seq, { kind: "task", from: "mother", role_from: "mother", to: "leader", summary: "kickoff" });
}

const ONE_TICKET = [plan(1, [{ ticket_ref: "A", title: "a" }]), task(2, "A", "worker-1")];

test("EVT-73: a worker whose ticket has a task as its latest event owes the result, with the seq of the task", () => {
  expect(owed("worker-1", "worker", ONE_TICKET, [])).toEqual([{ owes: "result", ticket_ref: "A", seq: 2 }]);
});

test("EVT-73: after the result the worker owes nothing, and owes again after the task of the rework", () => {
  const delivered = [...ONE_TICKET, result(3, "A", "worker-1", 2)];
  expect(owed("worker-1", "worker", delivered, [])).toEqual([]);
  const rework = [...delivered, verdict(4, "A", 3, "rework")];
  expect(owed("worker-1", "worker", rework, [])).toEqual([]);
  expect(owed("worker-1", "worker", [...rework, task(5, "A", "worker-1")], [])).toEqual([
    { owes: "result", ticket_ref: "A", seq: 5 },
  ]);
});

test("EVT-73: a worker owes no result for a ticket of another worker, a dropped one or one handed to another", () => {
  expect(owed("worker-2", "worker", ONE_TICKET, [])).toEqual([]);

  const dropped = [...ONE_TICKET, plan(3, [{ ticket_ref: "A", title: "a", dropped: true }])];
  expect(owed("worker-1", "worker", dropped, [])).toEqual([]);

  const handed = [...ONE_TICKET, task(3, "A", "worker-2")];
  expect(owed("worker-1", "worker", handed, [])).toEqual([]);
  expect(owed("worker-2", "worker", handed, [])).toEqual([{ owes: "result", ticket_ref: "A", seq: 3 }]);
});

test("EVT-74: the judge owes a verdict for each ticket not dropped whose latest event is a result, with the seq of the result", () => {
  const events = [
    plan(1, [
      { ticket_ref: "A", title: "a" },
      { ticket_ref: "B", title: "b" },
      { ticket_ref: "C", title: "c" },
      { ticket_ref: "D", title: "d" },
    ]),
    task(2, "A", "worker-1"),
    task(3, "B", "worker-2"),
    task(4, "C", "worker-3"),
    result(5, "B", "worker-2", 3),
    result(6, "A", "worker-1", 2),
    result(7, "A", "worker-1", 2),
  ];
  // C is still with its worker and D never started
  expect(owed("judge", "judge", events, [])).toEqual([
    { owes: "verdict", ticket_ref: "B", seq: 5 },
    { owes: "verdict", ticket_ref: "A", seq: 7 },
  ]);
});

test("EVT-74: the judge owes no verdict for a judged ticket nor for a dropped one", () => {
  const judged = [...ONE_TICKET, result(3, "A", "worker-1", 2), verdict(4, "A", 3, "approve")];
  expect(owed("judge", "judge", judged, [])).toEqual([]);

  const dropped = [
    ...ONE_TICKET,
    result(3, "A", "worker-1", 2),
    plan(4, [{ ticket_ref: "A", title: "a", dropped: true }]),
  ];
  expect(owed("judge", "judge", dropped, [])).toEqual([]);
});

// plan, then `rounds` times task, result and verdict of rework for ticket A
function reworked(rounds: number): SquadEvent[] {
  const events = [plan(1, [{ ticket_ref: "A", title: "a" }])];
  for (let i = 0; i < rounds; i++) {
    const seq = 2 + i * 3;
    events.push(task(seq, "A", "worker-1"), result(seq + 1, "A", "worker-1", seq), verdict(seq + 2, "A", seq + 1, "rework"));
  }
  return events;
}

test("EVT-75: the leader owes a task after a verdict of rework, with the seq of the verdict", () => {
  expect(owed("leader", "leader", reworked(1), [])).toEqual([{ owes: "task", ticket_ref: "A", seq: 4 }]);
  expect(owed("leader", "leader", reworked(2), [])).toEqual([{ owes: "task", ticket_ref: "A", seq: 7 }]);
});

test("EVT-75: the leader owes no task after the third rework", () => {
  expect(owed("leader", "leader", reworked(3), [])).toEqual([]);
});

test("EVT-75: the leader owes no task once it sent it, after an approve or for a dropped ticket", () => {
  expect(owed("leader", "leader", [...reworked(1), task(5, "A", "worker-1")], [])).toEqual([]);

  const approved = [...ONE_TICKET, result(3, "A", "worker-1", 2), verdict(4, "A", 3, "approve")];
  expect(owed("leader", "leader", approved, [])).toEqual([]);

  const dropped = [...reworked(1), plan(5, [{ ticket_ref: "A", title: "a", dropped: true }])];
  expect(owed("leader", "leader", dropped, [])).toEqual([]);
});

test("EVT-76: the leader owes the plan when the mother sent a task and the feature has no plan, with the seq of the first task", () => {
  expect(owed("leader", "leader", [kickoff(3)], [])).toEqual([{ owes: "plan", seq: 3 }]);
  expect(owed("leader", "leader", [kickoff(3), kickoff(6)], [])).toEqual([{ owes: "plan", seq: 3 }]);
});

test("EVT-76: with a plan in the feature the leader owes no plan, even for a later task of the mother", () => {
  expect(owed("leader", "leader", [kickoff(1), plan(2, [{ ticket_ref: "A", title: "a" }])], [])).toEqual([]);
  expect(owed("leader", "leader", [kickoff(1), plan(2, [{ ticket_ref: "A", title: "a" }]), kickoff(3)], [])).toEqual([]);
});

test("EVT-76: without a task of the mother the leader owes no plan, and nobody else owes it", () => {
  expect(owed("leader", "leader", [], [])).toEqual([]);
  expect(owed("mother", "mother", [kickoff(1)], [])).toEqual([]);
  expect(owed("judge", "judge", [kickoff(1)], [])).toEqual([]);
  expect(owed("worker-1", "worker", [kickoff(1)], [])).toEqual([]);
});

test("EVT-80: every pending delivery of the name is a debt of delivery, without ticket_ref", () => {
  const debts = owed("mother", "mother", [], [9, 4]);
  expect(debts).toEqual([
    { owes: "delivery", seq: 4 },
    { owes: "delivery", seq: 9 },
  ]);
  expect(debts.map((d) => Object.keys(d).sort())).toEqual([["owes", "seq"], ["owes", "seq"]]);
});

test("EVT-80: the debts of a peer come in ascending order of seq, deliveries among the others", () => {
  const events = [
    kickoff(1),
    ...reworked(1).map((e) => event(e.seq + 1, { ...e, seq: e.seq + 1 })),
  ];
  // seq 1 kickoff, 2 plan, 3 task, 4 result, 5 verdict of rework
  expect(owed("leader", "leader", events, [6, 1])).toEqual([
    { owes: "delivery", seq: 1 },
    { owes: "task", ticket_ref: "A", seq: 5 },
    { owes: "delivery", seq: 6 },
  ]);

  const two = [
    plan(1, [{ ticket_ref: "A", title: "a" }, { ticket_ref: "B", title: "b" }]),
    task(2, "B", "worker-2"),
    task(3, "A", "worker-1"),
    result(4, "A", "worker-1", 3),
    result(5, "B", "worker-2", 2),
  ];
  // A comes first in the plan and B first in the log
  expect(owed("judge", "judge", two, [5, 4])).toEqual([
    { owes: "delivery", seq: 4 },
    { owes: "verdict", ticket_ref: "A", seq: 4 },
    { owes: "delivery", seq: 5 },
    { owes: "verdict", ticket_ref: "B", seq: 5 },
  ]);
});

const SPEC = {
  title: "the importer",
  workflow: "tlc",
  branch: "feat/importer",
  base_branch: "develop",
  spec_ref: ".specs/features/importer/spec.md",
  spec_commit: "9f8e7d6",
};

function opened(seq: number, feature_id: number, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, { kind: "feature_opened", feature_id, from: "mother", role_from: "mother", to: "*", ...SPEC, ...fields });
}

function closed(seq: number, feature_id: number, outcome: string): SquadEvent {
  return event(seq, { kind: "feature_closed", feature_id, from: "mother", role_from: "mother", to: "*", outcome });
}

test("FEAT-26: an empty log has no feature", () => {
  expect(features([])).toEqual([]);
});

test("FEAT-26: a feature_opened is a feature with the id and the seq of the event, still open", () => {
  expect(features([opened(4, 2)])).toEqual([{ id: 2, ...SPEC, opened_seq: 4, closed_seq: null, outcome: null }]);
});

test("FEAT-26: a closed feature has the seq and the outcome of the feature_closed of its feature_id", () => {
  expect(features([opened(4, 2), task(5, "A", "worker-1"), closed(9, 2, "abandoned")])).toEqual([
    { id: 2, ...SPEC, opened_seq: 4, closed_seq: 9, outcome: "abandoned" },
  ]);
});

test("FEAT-26: the features come in ascending id, each closed by its own feature_closed", () => {
  const log = [
    opened(1, 1),
    closed(3, 1, "delivered"),
    opened(4, 2, { title: "the exporter", workflow: "matt-pocock" }),
    closed(7, 2, "abandoned"),
    opened(8, 3, { title: "the third" }),
  ];
  const expected = [
    { id: 1, ...SPEC, opened_seq: 1, closed_seq: 3, outcome: "delivered" },
    { id: 2, ...SPEC, title: "the exporter", workflow: "matt-pocock", opened_seq: 4, closed_seq: 7, outcome: "abandoned" },
    { id: 3, ...SPEC, title: "the third", opened_seq: 8, closed_seq: null, outcome: null },
  ];
  expect(features(log)).toEqual(expected);
  expect(features([...log].reverse())).toEqual(expected);
});

// A log the broker does not write: it tells the order by id from the order of opening,
// and the feature of the feature_id from the one opened last
test("FEAT-26: with a smaller id opened later, the order is still by id and the feature_closed closes the one of its feature_id", () => {
  expect(features([opened(1, 2), opened(2, 1), closed(3, 2, "delivered")])).toEqual([
    { id: 1, ...SPEC, opened_seq: 2, closed_seq: null, outcome: null },
    { id: 2, ...SPEC, opened_seq: 1, closed_seq: 3, outcome: "delivered" },
  ]);
});

test("FEAT-26: a refused and the other kinds are no feature", () => {
  const log = [
    event(1, { kind: "refused", feature_id: null, from: "broker", role_from: "broker", peer: "mother", attempted_kind: "feature_closed", error: "no_open_feature" }),
    opened(2, 1),
    event(3, { kind: "refused", from: "broker", role_from: "broker", peer: "mother", attempted_kind: "feature_opened", error: "feature_already_open" }),
    plan(4, [{ ticket_ref: "A", title: "the parser" }]),
    task(5, "A", "worker-1"),
    event(6, { kind: "turn_started", from: "leader", role_from: "leader" }),
  ];
  expect(features(log)).toEqual([{ id: 1, ...SPEC, opened_seq: 2, closed_seq: null, outcome: null }]);
});
