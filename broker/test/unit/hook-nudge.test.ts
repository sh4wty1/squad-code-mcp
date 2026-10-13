import { expect, test } from "bun:test";
import type { PlannedTicket, SquadEvent } from "../../shared/contract.ts";
import { squad, SQUAD } from "../../shared/derive.ts";
import { nudge } from "../../../plugin/hooks/nudge.ts";

const T0 = 1791331200000;
const NOW = T0 + 3600 * 1000;

// The builders of test/unit/derive-squad.test.ts: an event in the read format, one second
// after the one of the seq before
function event(seq: number, fields: Record<string, unknown>): SquadEvent {
  return {
    seq,
    ts: T0 + seq * 1000,
    feature_id: null,
    role_from: SQUAD.find((a) => a.name === fields.from)?.role ?? fields.from,
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    ...fields,
  } as SquadEvent;
}

function joined(seq: number, peer: string): SquadEvent {
  return event(seq, { kind: "peer_joined", from: "broker", peer, role: SQUAD.find((a) => a.name === peer)?.role });
}

function turn(seq: number, from: string): SquadEvent {
  return event(seq, { kind: "turn_started", from });
}

function usage(seq: number, from: string): SquadEvent {
  return event(seq, { kind: "usage", from, session_id: "s1", model: "opus", input: 1, output: 1, cache_write: 1, cache_read: 1 });
}

function blocked(seq: number, from: string): SquadEvent {
  return event(seq, { kind: "blocked", from, reason: "missing credential", detail: "the detail", last_action: "the last action" });
}

function request(seq: number, from: string): SquadEvent {
  return event(seq, {
    kind: "permission_request", from, to: "human", summary: "Bash: Run the tests",
    request_id: `r${seq}`, tool_name: "Bash", description: "Run the tests", input_preview: "bun test",
  });
}

function opened(seq: number): SquadEvent {
  return event(seq, {
    kind: "feature_opened", feature_id: 1, from: "mother", to: "*", title: "the importer", workflow: "tlc",
    branch: "feat/importer", base_branch: "develop", spec_ref: ".specs/features/importer/spec.md", spec_commit: "9f8e7d6",
  });
}

function kickoff(seq: number): SquadEvent {
  return event(seq, { kind: "task", feature_id: 1, from: "mother", to: "leader", summary: "kickoff" });
}

function plan(seq: number, list: PlannedTicket[]): SquadEvent {
  return event(seq, { kind: "plan", feature_id: 1, from: "leader", tickets: list });
}

function task(seq: number, ticket_ref: string, to: string): SquadEvent {
  return event(seq, { kind: "task", feature_id: 1, from: "leader", to, summary: "do it", ticket_ref, loadout: [] });
}

function result(seq: number, ticket_ref: string, from: string): SquadEvent {
  return event(seq, {
    kind: "result", feature_id: 1, from, to: "judge", summary: "done", ticket_ref, task_seq: seq - 1, branch: "b", commit: "c",
  });
}

function verdict(seq: number, ticket_ref: string, outcome: "approve" | "rework"): SquadEvent {
  return event(seq, {
    kind: "verdict", feature_id: 1, from: "judge", to: "leader", summary: outcome, ticket_ref, result_seq: seq - 1, outcome,
    criteria: [{ n: 1, text: "works", pass: outcome === "approve" }],
  });
}

function question(seq: number, id: number, from: string, to: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, {
    kind: "question", feature_id: 1, from, to, summary: "which one?", question_id: id, asked_by: from, blocking: false,
    why: "the spec does not say", default: "the first", ...fields,
  });
}

function answer(seq: number, id: number, from: string, to: string): SquadEvent {
  return event(seq, { kind: "answer", feature_id: 1, from, to, summary: "the second", question_id: id, answer: "the second", resolved_by: "agent" });
}

// The six in the broker (seq 1 to 6), feature 1 open (seq 7) and the plan of TKT-13 and TKT-14 (seq 8)
const OPEN = [...SQUAD.map((agent, i) => joined(i + 1, agent.name)), opened(7)];
const PLANNED = [...OPEN, plan(8, [{ ticket_ref: "TKT-13", title: "the parser" }, { ticket_ref: "TKT-14", title: "the writer" }])];

function status(log: SquadEvent[], name: string): string {
  return squad(log, NOW).agents.find((a) => a.name === name)!.status;
}

test("PAP-29: who owes a result is told the ticket and the seq of the task, and to send it with send_result", () => {
  expect(nudge([...PLANNED, task(10, "TKT-13", "worker-1")], "worker-1", NOW)).toBe(
    "You are ending the turn and still owe the squad the result of ticket TKT-13, for the task of seq 10. Finish it and send it with send_result. If you cannot go on, ask a question with ask or call blocked."
  );
});

test("PAP-29: who owes a verdict is told the ticket and the seq of the result, and to send it with send_verdict", () => {
  expect(nudge([...PLANNED, task(10, "TKT-13", "worker-1"), result(11, "TKT-13", "worker-1")], "judge", NOW)).toBe(
    "You are ending the turn and still owe the squad the verdict of ticket TKT-13, for the result of seq 11. Judge it and send it with send_verdict. If you cannot go on, ask a question with ask or call blocked."
  );
});

test("PAP-29: who owes the task of a rework is told the ticket and the seq of the verdict, and to send it with send_task", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), result(11, "TKT-13", "worker-1"), verdict(12, "TKT-13", "rework")];
  expect(nudge(log, "leader", NOW)).toBe(
    "You are ending the turn and still owe the squad the rework task of ticket TKT-13, after the verdict of seq 12. Send it with send_task. If you cannot go on, ask a question with ask or call blocked."
  );
});

test("PAP-29: who owes the plan is told the seq of the kickoff, and to send it with plan", () => {
  expect(nudge([...OPEN, kickoff(9)], "leader", NOW)).toBe(
    "You are ending the turn and still owe the squad the plan of the feature, after the kickoff of seq 9. Send it with plan. If you cannot go on, ask a question with ask or call blocked."
  );
});

test("PAP-29: who owes an answer is told the question and the seq since which it holds it, and to answer or to escalate", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1"), question(12, 9, "worker-1", "leader", { ticket_ref: "TKT-13" })];
  expect(nudge(log, "leader", NOW)).toBe(
    "You are ending the turn and still owe the squad an answer to question 9, which you hold since seq 12. Answer it with answer or pass it on with escalate. If you cannot go on, ask a question with ask or call blocked."
  );
});

test("PAP-29: with two debts the reason is about the oldest", () => {
  const judged = [...PLANNED, task(10, "TKT-13", "worker-1"), result(11, "TKT-13", "worker-1"), verdict(12, "TKT-13", "rework")];
  // the rework came first, then a question of another worker
  expect(nudge([...judged, task(13, "TKT-14", "worker-2"), question(14, 9, "worker-2", "leader", { ticket_ref: "TKT-14" })], "leader", NOW)).toBe(
    "You are ending the turn and still owe the squad the rework task of ticket TKT-13, after the verdict of seq 12. Send it with send_task. If you cannot go on, ask a question with ask or call blocked."
  );
  // the question came first, then the rework
  const asked = [
    ...PLANNED,
    task(10, "TKT-13", "worker-1"),
    question(11, 9, "worker-1", "leader", { ticket_ref: "TKT-13" }),
    result(12, "TKT-13", "worker-1"),
    verdict(13, "TKT-13", "rework"),
  ];
  expect(nudge(asked, "leader", NOW)).toBe(
    "You are ending the turn and still owe the squad an answer to question 9, which you hold since seq 11. Answer it with answer or pass it on with escalate. If you cannot go on, ask a question with ask or call blocked."
  );
});

const RESULT_OF_13 =
  "You are ending the turn and still owe the squad the result of ticket TKT-13, for the task of seq 10. Finish it and send it with send_result. If you cannot go on, ask a question with ask or call blocked.";

test("PAP-28: a worker in turn with a task is told what it owes, as if the turn had ended", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1")];
  // in turn, the status rule over the log as it is gives working
  expect(status(log, "worker-1")).toBe("working");
  expect(nudge(log, "worker-1", NOW)).toBe(RESULT_OF_13);
  // and so after an earlier turn that ended
  expect(nudge([...log, usage(12, "worker-1"), turn(13, "worker-1")], "worker-1", NOW)).toBe(RESULT_OF_13);
});

test("PAP-28: the end of turn comes after the latest event, whatever the order of the list", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1")];
  expect(nudge([...log].reverse(), "worker-1", NOW)).toBe(RESULT_OF_13);
});

test("PAP-28: the events given are not changed", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1")];
  const before = structuredClone(log);
  for (const e of log) Object.freeze(e);
  Object.freeze(log);
  expect(nudge(log, "worker-1", NOW)).toBe(RESULT_OF_13);
  expect(log).toEqual(before);
});

test("PAP-32: an agent without a debt is not told anything", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1")];
  // the worker of no ticket, and the mother and the leader of a feature that goes on
  expect(nudge(log, "worker-2", NOW)).toBeNull();
  expect(nudge(log, "mother", NOW)).toBeNull();
  expect(nudge(log, "leader", NOW)).toBeNull();
  // and the worker that delivered
  expect(nudge([...log, result(12, "TKT-13", "worker-1")], "worker-1", NOW)).toBeNull();
});

test("PAP-32: an agent that only has something still to be delivered to it is not told anything", () => {
  // the answer to its question and the verdict of its ticket were sent and create no debt
  const log = [
    ...PLANNED,
    task(10, "TKT-13", "worker-1"),
    question(11, 9, "worker-1", "leader", { ticket_ref: "TKT-13" }),
    result(12, "TKT-13", "worker-1"),
    answer(13, 9, "leader", "worker-1"),
    verdict(14, "TKT-13", "approve"),
  ];
  expect(nudge(log, "worker-1", NOW)).toBeNull();
  expect(nudge(log, "leader", NOW)).toBeNull();
});

test("PAP-32: an agent that declared blocked is not told anything, with the task still owed", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1")];
  expect(nudge(log, "worker-1", NOW)).toBe(RESULT_OF_13);
  expect(nudge([...log, blocked(12, "worker-1")], "worker-1", NOW)).toBeNull();
});

test("PAP-28: a worker that owes the result with a permission request still open in the log is told what it owes", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1"), request(12, "worker-1")];
  // over the log as it is the request is open and the worker is blocked: the end of turn closes it
  expect(status(log, "worker-1")).toBe("blocked");
  expect(nudge(log, "worker-1", NOW)).toBe(
    "You are ending the turn and still owe the squad the result of ticket TKT-13, for the task of seq 10. Finish it and send it with send_result. If you cannot go on, ask a question with ask or call blocked."
  );
});

test("PAP-32: who asked a blocking question still open is not told anything, with the task still owed", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), turn(11, "worker-1")];
  expect(nudge(log, "worker-1", NOW)).toBe(RESULT_OF_13);
  const asked = [...log, question(12, 4, "worker-1", "leader", { blocking: true, ticket_ref: "TKT-13" })];
  expect(nudge(asked, "worker-1", NOW)).toBeNull();
  // still the one who asked when the leader passes it on
  const passed = [...asked, question(13, 4, "leader", "mother", { asked_by: "worker-1", blocking: true, ticket_ref: "TKT-13" })];
  expect(nudge(passed, "worker-1", NOW)).toBeNull();
  // and told again once it is answered
  expect(nudge([...asked, answer(13, 4, "leader", "worker-1")], "worker-1", NOW)).toBe(RESULT_OF_13);
});

test("PAP-22: a name that is not of the squad is not told anything", () => {
  const log = [...PLANNED, task(10, "TKT-13", "worker-1"), task(11, "TKT-14", "worker-4")];
  for (const name of ["worker-4", "worker", "human", "broker", ""]) {
    expect([name, nudge(log, name, NOW)]).toEqual([name, null]);
  }
});
