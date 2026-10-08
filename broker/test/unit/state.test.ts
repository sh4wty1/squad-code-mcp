import { expect, test } from "bun:test";
import type { Owed } from "../../shared/derive.ts";
import { HUMAN_TOKEN, JUDGE, LEADER, MOTHER, setup, WORKER_1, WORKER_2, WORKER_3 } from "./helpers.ts";

const A = { ticket_ref: "A", title: "the parser" };
const B = { ticket_ref: "B", title: "the writer" };

const EVERYONE = [MOTHER, LEADER, JUDGE, WORKER_1, WORKER_2, WORKER_3];

test("EVT-71: without an open feature the state has feature null, no ticket and nothing owed", () => {
  const b = setup();
  for (const peer of EVERYONE) {
    expect(b.state(peer)).toEqual({ feature: null, ticket: null, owed: [] });
  }
  b.openByRule();
  b.closeByRule();
  expect(b.state(LEADER)).toEqual({
    feature: null,
    ticket: null,
    owed: [
      { owes: "delivery", seq: 1 },
      { owes: "delivery", seq: 2 },
    ],
  });
  expect(b.state(MOTHER)).toEqual({ feature: null, ticket: null, owed: [] });
});

test("EVT-71: with an open feature the state has exactly its seven fields", () => {
  const b = setup();
  b.openByRule({ title: "the old one" });
  b.closeByRule();
  const id = b.openByRule({
    title: "the importer",
    workflow: "matt-pocock",
    branch: "feat/importer",
    base_branch: "develop",
    spec_ref: ".specs/features/importer/spec.md",
    spec_commit: "9f8e7d6",
  });
  const unread: Owed[] = [
    { owes: "delivery", seq: 1 },
    { owes: "delivery", seq: 2 },
    { owes: "delivery", seq: 3 },
  ];
  for (const peer of EVERYONE) {
    expect(b.state(peer)).toEqual({
      feature: {
        id,
        title: "the importer",
        workflow: "matt-pocock",
        branch: "feat/importer",
        base_branch: "develop",
        spec_ref: ".specs/features/importer/spec.md",
        spec_commit: "9f8e7d6",
      },
      ticket: null,
      owed: peer === MOTHER ? [] : unread,
    });
  }
});

test("EVT-72: a worker with a ticket open has it in the state, with the title of the current plan and the seq of its latest task", () => {
  const b = setup();
  b.openByRule();
  b.given.plan([A, B]);
  const first = b.given.task("A", "worker-1");
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "A", title: "the parser", task_seq: first, reworks: 0 });

  // in review and after the rework it is still the ticket of the worker
  const result = b.given.result("A", "worker-1", first);
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "A", title: "the parser", task_seq: first, reworks: 0 });
  b.given.verdict("A", result, "rework");
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "A", title: "the parser", task_seq: first, reworks: 1 });

  // a new plan and a new task: the title and the task_seq are the latest
  b.given.plan([{ ...A, title: "the parser, again" }, B]);
  const second = b.given.task("A", "worker-1");
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "A", title: "the parser, again", task_seq: second, reworks: 1 });
  b.given.verdict("A", b.given.result("A", "worker-1", second), "rework");
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "A", title: "the parser, again", task_seq: second, reworks: 2 });
});

test("EVT-72: each worker has its own ticket, and the other roles have none", () => {
  const b = setup();
  b.openByRule();
  b.given.plan([A, B]);
  const a = b.given.task("A", "worker-1");
  const second = b.given.task("B", "worker-2");
  b.given.result("A", "worker-1", a);
  expect(b.state(WORKER_1).ticket).toEqual({ ticket_ref: "A", title: "the parser", task_seq: a, reworks: 0 });
  expect(b.state(WORKER_2).ticket).toEqual({ ticket_ref: "B", title: "the writer", task_seq: second, reworks: 0 });
  expect(b.state(WORKER_3).ticket).toBeNull();
  expect(b.state(MOTHER).ticket).toBeNull();
  expect(b.state(LEADER).ticket).toBeNull();
  expect(b.state(JUDGE).ticket).toBeNull();
});

test("EVT-72: an approved ticket, a dropped one, one handed to another worker and one of a feature that closed are not open for the worker", () => {
  const approved = setup();
  approved.openByRule();
  approved.given.plan([A]);
  const task = approved.given.task("A", "worker-1");
  approved.given.verdict("A", approved.given.result("A", "worker-1", task), "approve");
  expect(approved.state(WORKER_1).ticket).toBeNull();

  const dropped = setup();
  dropped.openByRule();
  dropped.given.plan([A]);
  dropped.given.task("A", "worker-1");
  dropped.given.plan([{ ...A, dropped: true }]);
  expect(dropped.state(WORKER_1).ticket).toBeNull();

  const handed = setup();
  handed.openByRule();
  handed.given.plan([A]);
  handed.given.task("A", "worker-1");
  const again = handed.given.task("A", "worker-2");
  expect(handed.state(WORKER_1).ticket).toBeNull();
  expect(handed.state(WORKER_2).ticket).toEqual({ ticket_ref: "A", title: "the parser", task_seq: again, reworks: 0 });

  const closed = setup();
  closed.openByRule();
  closed.given.plan([A]);
  closed.given.task("A", "worker-1");
  closed.closeByRule();
  expect(closed.state(WORKER_1).ticket).toBeNull();
  closed.openByRule();
  expect(closed.state(WORKER_1).ticket).toBeNull();
});

test("EVT-76: the leader owes the plan after the task of the mother, with the seq of that task, until it plans", () => {
  const b = setup();
  b.openByRule();
  b.session.turnStarted(MOTHER);
  expect(b.send(MOTHER, { kind: "task", to: "leader", summary: "kickoff" })).toEqual({ ok: true, seq: 3 });
  expect(b.send(MOTHER, { kind: "task", to: "leader", summary: "one more thing" })).toEqual({ ok: true, seq: 4 });
  expect(b.state(LEADER).owed).toEqual([
    { owes: "delivery", seq: 1 },
    { owes: "delivery", seq: 3 },
    { owes: "plan", seq: 3 },
    { owes: "delivery", seq: 4 },
  ]);
  expect(b.state(MOTHER).owed).toEqual([]);

  expect(b.plan(LEADER, { tickets: [A] })).toEqual({ ok: true, seq: 5 });
  expect(b.state(LEADER).owed).toEqual([
    { owes: "delivery", seq: 1 },
    { owes: "delivery", seq: 3 },
    { owes: "delivery", seq: 4 },
  ]);
});

test("EVT-73/74/75/80: what each role owes along a plan, a task, a result and a verdict of rework", () => {
  const b = setup();
  b.openByRule();
  const criteria = [{ n: 1, text: "works", pass: false }];
  const result = { kind: "result", to: "judge", summary: "done", branch: "squad/x", commit: "abc1234" };

  // the feature_opened is seq 1: the five that are not the mother owe its reading from here on
  const opened: Owed = { owes: "delivery", seq: 1 };
  expect(b.send(MOTHER, { kind: "task", to: "leader", summary: "kickoff" })).toEqual({ ok: true, seq: 2 });
  expect(b.plan(LEADER, { tickets: [A, B] })).toEqual({ ok: true, seq: 3 });
  expect(b.send(LEADER, { kind: "task", to: "worker-1", summary: "a", ticket_ref: "A", loadout: [] })).toEqual({ ok: true, seq: 4 });
  expect(b.send(LEADER, { kind: "task", to: "worker-2", summary: "b", ticket_ref: "B", loadout: [] })).toEqual({ ok: true, seq: 5 });

  // each worker owes the result of its task, and the reading of it
  expect(b.state(WORKER_1).owed).toEqual([
    opened,
    { owes: "delivery", seq: 4 },
    { owes: "result", ticket_ref: "A", seq: 4 },
  ]);
  expect(b.state(WORKER_2).owed).toEqual([
    opened,
    { owes: "delivery", seq: 5 },
    { owes: "result", ticket_ref: "B", seq: 5 },
  ]);
  expect(b.state(WORKER_3).owed).toEqual([opened]);
  expect(b.state(JUDGE).owed).toEqual([opened]);
  expect(b.state(LEADER).owed).toEqual([opened, { owes: "delivery", seq: 2 }]);

  // the results: the workers owe nothing but their reading, the judge a verdict for each
  expect(b.send(WORKER_2, { ...result, ticket_ref: "B", task_seq: 5 })).toEqual({ ok: true, seq: 6 });
  expect(b.send(WORKER_1, { ...result, ticket_ref: "A", task_seq: 4 })).toEqual({ ok: true, seq: 7 });
  expect(b.state(WORKER_1).owed).toEqual([opened, { owes: "delivery", seq: 4 }]);
  expect(b.state(JUDGE).owed).toEqual([
    opened,
    { owes: "delivery", seq: 6 },
    { owes: "verdict", ticket_ref: "B", seq: 6 },
    { owes: "delivery", seq: 7 },
    { owes: "verdict", ticket_ref: "A", seq: 7 },
  ]);

  // the verdict of rework: the judge owes one verdict less, the leader a task
  const verdict = { kind: "verdict", to: "leader", summary: "rework", ticket_ref: "A", result_seq: 7, outcome: "rework", criteria };
  expect(b.send(JUDGE, verdict)).toEqual({ ok: true, seq: 8 });
  expect(b.state(JUDGE).owed).toEqual([
    opened,
    { owes: "delivery", seq: 6 },
    { owes: "verdict", ticket_ref: "B", seq: 6 },
    { owes: "delivery", seq: 7 },
  ]);
  expect(b.state(LEADER).owed).toEqual([
    opened,
    { owes: "delivery", seq: 2 },
    { owes: "delivery", seq: 8 },
    { owes: "task", ticket_ref: "A", seq: 8 },
  ]);
  expect(b.state(WORKER_1).owed).toEqual([opened, { owes: "delivery", seq: 4 }]);
  expect(b.state(MOTHER).owed).toEqual([]);

  // a confirmed delivery is not owed anymore; the debts of the ticket stay
  b.log.ack("leader", [1, 2, 8]);
  b.log.ack("judge", [1, 6]);
  expect(b.state(LEADER).owed).toEqual([{ owes: "task", ticket_ref: "A", seq: 8 }]);
  expect(b.state(JUDGE).owed).toEqual([
    { owes: "verdict", ticket_ref: "B", seq: 6 },
    { owes: "delivery", seq: 7 },
  ]);

  // the task of the rework pays the debt of the leader and the worker owes again
  expect(b.send(LEADER, { kind: "task", to: "worker-1", summary: "again", ticket_ref: "A", loadout: [] })).toEqual({ ok: true, seq: 9 });
  expect(b.state(LEADER).owed).toEqual([]);
  expect(b.state(WORKER_1)).toEqual({
    feature: b.state(MOTHER).feature,
    ticket: { ticket_ref: "A", title: "the parser", task_seq: 9, reworks: 1 },
    owed: [
      opened,
      { owes: "delivery", seq: 4 },
      { owes: "delivery", seq: 9 },
      { owes: "result", ticket_ref: "A", seq: 9 },
    ],
  });
});

test("EVT-80: a pending delivery is owed without an open feature too, and only by its recipient", () => {
  const b = setup();
  b.permission.request(WORKER_1, { request_id: "abcde", tool_name: "Bash", description: "ls", input_preview: "{}" });
  expect(b.permission.decision({ human_token: HUMAN_TOKEN, request_seq: 1, behavior: "allow" })).toEqual({ ok: true, seq: 2 });
  expect(b.state(WORKER_1)).toEqual({ feature: null, ticket: null, owed: [{ owes: "delivery", seq: 2 }] });
  expect(b.state(WORKER_2)).toEqual({ feature: null, ticket: null, owed: [] });
  b.log.ack("worker-1", [2]);
  expect(b.state(WORKER_1).owed).toEqual([]);
});
