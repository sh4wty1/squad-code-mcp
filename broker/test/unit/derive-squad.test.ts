import { expect, test } from "bun:test";
import type { PlannedTicket, SquadEvent } from "../../shared/contract.ts";
import { blocks, gates, openPermissions, presence, questions, squad, SQUAD, usageTotals } from "../../shared/derive.ts";

const T0 = 1791331200000;

// An event in the read format, one second after the one of the seq before. `at` is the
// number of seconds after T0 when it is not the seq.
function event(seq: number, fields: Record<string, unknown>, at = seq): SquadEvent {
  return {
    seq,
    ts: T0 + at * 1000,
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

function left(seq: number, peer: string, reason = "died"): SquadEvent {
  return event(seq, { kind: "peer_left", from: "broker", peer, reason });
}

function blocked(seq: number, from: string, reason: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, { kind: "blocked", from, reason, detail: "the detail", last_action: "the last action", ...fields });
}

function unblocked(seq: number, peer: string, from = peer): SquadEvent {
  return event(seq, { kind: "unblocked", from, peer });
}

function request(seq: number, from: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, {
    kind: "permission_request", from, to: "human", summary: "Bash: Run the tests",
    request_id: `r${seq}`, tool_name: "Bash", description: "Run the tests", input_preview: "bun test", ...fields,
  });
}

function decision(seq: number, to: string, request_seq: number, behavior = "allow"): SquadEvent {
  return event(seq, { kind: "permission_decision", from: "human", to, summary: behavior, request_seq, behavior });
}

function refused(seq: number, peer: string): SquadEvent {
  return event(seq, { kind: "refused", from: "broker", peer, attempted_kind: "task", error: "no_open_feature" });
}

function turn(seq: number, from: string): SquadEvent {
  return event(seq, { kind: "turn_started", from });
}

test("the squad is the six names in the order of the screens, each with its role and its short label", () => {
  expect(SQUAD).toEqual([
    { name: "mother", role: "mother", short: "mot" },
    { name: "leader", role: "leader", short: "ldr" },
    { name: "worker-1", role: "worker", short: "w1" },
    { name: "worker-2", role: "worker", short: "w2" },
    { name: "worker-3", role: "worker", short: "w3" },
    { name: "judge", role: "judge", short: "jdg" },
  ]);
});

test("TUI-01: a name without an event of presence has no entry", () => {
  expect(presence([]).size).toBe(0);
  const all = presence([joined(1, "leader"), turn(2, "worker-1"), refused(3, "worker-2")]);
  expect([...all.keys()]).toEqual(["leader"]);
  expect(all.get("leader")).toEqual({ online: true, since: T0 + 1000, joins: 1 });
});

test("TUI-02: a name whose latest event of presence is a peer_left is offline since the ts of it", () => {
  const all = presence([joined(1, "worker-2"), joined(2, "leader"), left(5, "worker-2")]);
  expect(all.get("worker-2")).toEqual({ online: false, since: T0 + 5000, joins: 1 });
  expect(all.get("leader")!.online).toBe(true);

  // the latest is the one of the greatest seq, whatever the order of the list
  expect(presence([left(5, "worker-2"), joined(1, "worker-2")]).get("worker-2")!.online).toBe(false);

  // and a name that came back is online again
  expect(presence([joined(1, "worker-2"), left(5, "worker-2"), joined(8, "worker-2")]).get("worker-2")).toEqual({
    online: true,
    since: T0 + 8000,
    joins: 2,
  });
});

test("two peer_joined of a name without a peer_left between them leave it online", () => {
  expect(presence([joined(1, "judge"), joined(4, "judge")]).get("judge")).toEqual({ online: true, since: T0 + 4000, joins: 2 });
});

test("TUI-04: a permission request is open until something closes it", () => {
  const open = openPermissions([joined(1, "worker-1"), turn(2, "worker-1"), request(3, "worker-1")]);
  expect(open.map((e) => e.seq)).toEqual([3]);
  expect(open[0]!.tool_name).toBe("Bash");
});

test("TUI-04: the permission_decision that cites a request closes it, and only it", () => {
  const log = [request(3, "worker-1"), request(4, "worker-2")];
  expect(openPermissions(log).map((e) => e.seq)).toEqual([3, 4]);
  expect(openPermissions([...log].reverse()).map((e) => e.seq)).toEqual([3, 4]);
  expect(openPermissions([...log, decision(5, "worker-1", 3)]).map((e) => e.seq)).toEqual([4]);
  expect(openPermissions([...log, decision(5, "worker-2", 4, "deny")]).map((e) => e.seq)).toEqual([3]);
});

test("TUI-04: any later event of the same peer closes the request, and one of another peer does not", () => {
  expect(openPermissions([request(3, "worker-1"), turn(4, "worker-1")])).toEqual([]);
  expect(openPermissions([request(3, "worker-1"), turn(4, "worker-2")]).map((e) => e.seq)).toEqual([3]);
  // an event of the peer before the request closes nothing
  expect(openPermissions([turn(2, "worker-1"), request(3, "worker-1")]).map((e) => e.seq)).toEqual([3]);
  // a second request is a later event of the peer: only the latest stays open
  expect(openPermissions([request(3, "worker-1"), request(6, "worker-1")]).map((e) => e.seq)).toEqual([6]);
});

test("TUI-04: a refused and an unblocked the broker wrote about the peer do not close its request", () => {
  const log = [request(3, "worker-1"), refused(4, "worker-1"), unblocked(5, "worker-1", "broker"), left(6, "worker-1")];
  expect(openPermissions(log).map((e) => e.seq)).toEqual([3]);
  // the unblocked the peer itself sent is an event of the peer
  expect(openPermissions([request(3, "worker-1"), unblocked(5, "worker-1")])).toEqual([]);
});

test("a permission_decision whose request_seq is not a permission_request is ignored", () => {
  // seq 9 does not exist and seq 2 is a turn_started
  const log = [turn(2, "worker-2"), request(3, "worker-1"), decision(5, "worker-1", 9), decision(6, "worker-2", 2)];
  expect(openPermissions(log).map((e) => e.seq)).toEqual([3]);
});

test("TUI-03: a blocked without a later unblocked with the name in peer gives the reason", () => {
  const all = blocks([joined(1, "worker-2"), blocked(4, "worker-2", "missing credential", { ticket_ref: "TKT-13" })]);
  expect([...all.keys()]).toEqual(["worker-2"]);
  expect(all.get("worker-2")!.reason).toBe("missing credential");
  expect(all.get("worker-2")!.seq).toBe(4);
  expect(all.get("worker-2")!.ts).toBe(T0 + 4000);
});

test("TUI-03: an unblocked with the name in peer closes the block, whoever wrote it", () => {
  expect(blocks([blocked(4, "worker-2", "r"), unblocked(6, "worker-2")]).size).toBe(0);
  expect(blocks([blocked(4, "worker-2", "r"), unblocked(6, "worker-2", "broker")]).size).toBe(0);
  // the unblocked of another name does not
  expect([...blocks([blocked(4, "worker-2", "r"), unblocked(6, "worker-3")]).keys()]).toEqual(["worker-2"]);
  // nor one that came before the blocked, whatever the order of the list
  expect([...blocks([unblocked(2, "worker-2"), blocked(4, "worker-2", "r")]).keys()]).toEqual(["worker-2"]);
  expect([...blocks([blocked(4, "worker-2", "r"), unblocked(2, "worker-2")]).keys()]).toEqual(["worker-2"]);
});

test("TUI-03: a name blocked again after an unblocked is blocked, with the reason of the latest blocked", () => {
  const all = blocks([blocked(4, "worker-2", "first"), unblocked(6, "worker-2"), blocked(8, "worker-2", "second")]);
  expect(all.get("worker-2")!.reason).toBe("second");
});

// From here on the events are those of feature 1
function question(seq: number, id: number, from: string, to: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, {
    kind: "question", feature_id: 1, from, to, summary: "which one?", question_id: id, asked_by: from, blocking: false,
    why: "the spec does not say", default: "the first", ...fields,
  });
}

function answer(seq: number, id: number, from: string, to: string, resolved_by: string, text = "the second"): SquadEvent {
  return event(seq, { kind: "answer", feature_id: 1, from, to, summary: text, question_id: id, answer: text, resolved_by });
}

function merged(seq: number, id: number, into: number): SquadEvent {
  return event(seq, { kind: "question_merged", feature_id: 1, from: "mother", question_id: id, into });
}

function gate(seq: number, id: number): SquadEvent {
  return event(seq, {
    kind: "gate", feature_id: 1, from: "mother", to: "human", summary: "deliver", gate_id: id, scope: "delivery",
    commit: "9f8e7d6", action: "merge", effect: "the feature goes to develop",
  });
}

function gateDecision(seq: number, id: number, decision: string): SquadEvent {
  return event(seq, { kind: "gate_decision", feature_id: 1, from: "human", to: "mother", summary: decision, gate_id: id, decision });
}

test("TUI-06: a question without answer is open, held by the recipient of its latest question", () => {
  const all = questions([question(3, 9, "worker-2", "leader", { ticket_ref: "TKT-13" })]);
  expect(all).toEqual([
    {
      id: 9,
      asked_by: "worker-2",
      holder: "leader",
      blocking: false,
      ticket_ref: "TKT-13",
      open: true,
      merged_into: null,
      default: "the first",
      deadline: null,
      reached_human_ts: null,
      route: ["worker-2", "leader"],
      resolved_by: null,
      answer: null,
      first_seq: 3,
      last_seq: 3,
    },
  ]);
});

test("TUI-06: an escalation moves the holder and extends the route, and who asked stays", () => {
  const log = [
    question(3, 9, "worker-2", "leader", { ticket_ref: "TKT-13" }),
    question(5, 9, "leader", "mother", { asked_by: "worker-2", ticket_ref: "TKT-13" }),
  ];
  const [q] = questions(log);
  expect(q!.asked_by).toBe("worker-2");
  expect(q!.holder).toBe("mother");
  expect(q!.route).toEqual(["worker-2", "leader", "mother"]);
  expect(q!.first_seq).toBe(3);
  expect(q!.last_seq).toBe(5);
  expect(q!.reached_human_ts).toBeNull();
  expect(q!.deadline).toBeNull();
  // the latest question is the one of the greatest seq, whatever the order of the list
  expect(questions([...log].reverse())).toEqual(questions(log));
});

test("the deadline of a non-blocking question is 240 s after the first question to the dev", () => {
  const [q] = questions([
    question(3, 9, "worker-2", "leader"),
    question(5, 9, "leader", "mother", { asked_by: "worker-2" }),
    question(8, 9, "mother", "human", { asked_by: "worker-2" }),
  ]);
  expect(q!.holder).toBe("human");
  expect(q!.route).toEqual(["worker-2", "leader", "mother", "human"]);
  expect(q!.reached_human_ts).toBe(T0 + 8000);
  expect(q!.deadline).toBe(T0 + 8000 + 240000);
});

test("the deadline uses the timeout_s of the question, and counts from the first question to the dev only", () => {
  const [q] = questions([
    question(3, 9, "mother", "human", { timeout_s: 60 }),
    question(7, 9, "mother", "human", { timeout_s: 60 }),
  ]);
  expect(q!.reached_human_ts).toBe(T0 + 3000);
  expect(q!.deadline).toBe(T0 + 3000 + 60000);
  expect(q!.last_seq).toBe(7);
});

test("a blocking question has no deadline and no default, even with the dev", () => {
  const [q] = questions([question(3, 4, "mother", "human", { blocking: true, default: undefined })]);
  expect(q!.blocking).toBe(true);
  expect(q!.reached_human_ts).toBe(T0 + 3000);
  expect(q!.deadline).toBeNull();
  expect(q!.default).toBeNull();
});

test("TUI-06: an answer with the question_id closes the question, and one with another id does not", () => {
  const log = [question(3, 9, "worker-2", "leader"), question(4, 10, "worker-1", "leader")];
  const [nine, ten] = questions([...log, answer(6, 9, "leader", "worker-2", "agent")]);
  expect(nine!.open).toBe(false);
  expect(nine!.resolved_by).toBe("agent");
  expect(nine!.answer).toBe("the second");
  expect(ten!.open).toBe(true);
  expect(ten!.resolved_by).toBeNull();
  expect(ten!.answer).toBeNull();
});

test("the first answer of a question is the one that counts, and an answer to no question is no question", () => {
  const all = questions([
    question(3, 9, "mother", "human"),
    answer(6, 9, "broker", "mother", "timeout_default", "the first"),
    answer(7, 9, "human", "mother", "human", "late"),
    answer(8, 77, "human", "mother", "human"),
  ]);
  expect(all.map((q) => q.id)).toEqual([9]);
  expect(all[0]!.resolved_by).toBe("timeout_default");
  expect(all[0]!.answer).toBe("the first");
});

test("TUI-06: a merged question leaves the open ones and closes with the one it was merged into", () => {
  const log = [question(3, 9, "worker-2", "leader"), question(4, 10, "mother", "human"), merged(5, 9, 10)];
  const [nine, ten] = questions(log);
  expect(nine!.open).toBe(false);
  expect(nine!.merged_into).toBe(10);
  // not closed yet: the one it follows is open
  expect(nine!.resolved_by).toBeNull();
  expect(nine!.answer).toBeNull();
  expect(ten!.open).toBe(true);
  expect(ten!.merged_into).toBeNull();

  const [closed, target] = questions([...log, answer(8, 10, "human", "mother", "human", "use both")]);
  expect(closed!.open).toBe(false);
  expect(closed!.resolved_by).toBe("human");
  expect(closed!.answer).toBe("use both");
  expect(target!.open).toBe(false);
  expect(target!.answer).toBe("use both");
});

test("a merged question with an answer of its own closes alone", () => {
  const [nine, ten] = questions([
    question(3, 9, "worker-2", "leader"),
    question(4, 10, "mother", "human"),
    merged(5, 9, 10),
    answer(6, 9, "broker", "worker-2", "result_default", "the first"),
  ]);
  expect(nine!.resolved_by).toBe("result_default");
  expect(nine!.answer).toBe("the first");
  expect(ten!.open).toBe(true);
});

test("the questions come in the order they were asked", () => {
  const all = questions([question(7, 2, "worker-1", "leader"), question(3, 9, "worker-2", "leader"), question(8, 9, "leader", "mother")]);
  expect(all.map((q) => q.id)).toEqual([9, 2]);
});

test("TUI-06: a gate without a decision is pending", () => {
  expect(gates([gate(4, 1)])).toEqual([{ id: 1, pending: true, request_seq: 4, decision: null }]);
  expect(gates([question(3, 9, "mother", "human")])).toEqual([]);
});

test("TUI-06: a gate with a decision of comment is still pending", () => {
  expect(gates([gate(4, 1), gateDecision(6, 1, "comment")])).toEqual([{ id: 1, pending: true, request_seq: 4, decision: null }]);
});

test("TUI-06: a decision of approve or of reject closes the gate, and only the one of its gate_id", () => {
  const log = [gate(4, 1), gate(5, 2), gateDecision(6, 1, "comment")];
  expect(gates([...log, gateDecision(7, 1, "approve")])).toEqual([
    { id: 1, pending: false, request_seq: 4, decision: "approve" },
    { id: 2, pending: true, request_seq: 5, decision: null },
  ]);
  expect(gates([...log, gateDecision(7, 2, "reject")])).toEqual([
    { id: 1, pending: true, request_seq: 4, decision: null },
    { id: 2, pending: false, request_seq: 5, decision: "reject" },
  ]);
});

// [input, output, cache_write, cache_read], accumulated by the session for the model
function usage(seq: number, from: string, session_id: string, model: string, counts: number[]): SquadEvent {
  const [input, output, cache_write, cache_read] = counts;
  return event(seq, { kind: "usage", from, session_id, model, input, output, cache_write, cache_read });
}

test("TUI-17: the total of an agent is the sum of its latest usage of each session_id and model", () => {
  const totals = usageTotals([
    usage(1, "worker-1", "s1", "opus", [100, 10, 5, 1]),
    usage(2, "worker-1", "s1", "opus", [300, 30, 15, 3]),
    usage(3, "worker-1", "s1", "haiku", [7, 6, 5, 4]),
    usage(4, "worker-1", "s2", "opus", [1000, 100, 50, 10]),
    usage(5, "judge", "s3", "opus", [9, 8, 7, 6]),
  ]);
  expect([...totals.keys()]).toEqual(["worker-1", "judge"]);
  expect(totals.get("worker-1")).toEqual({
    opus: { input: 1300, output: 130, cache_write: 65, cache_read: 13 },
    haiku: { input: 7, output: 6, cache_write: 5, cache_read: 4 },
  });
  expect(totals.get("judge")).toEqual({ opus: { input: 9, output: 8, cache_write: 7, cache_read: 6 } });
});

test("TUI-17: a repeated usage does not change the total, and the latest is the one of the greatest seq", () => {
  const log = [usage(1, "worker-1", "s1", "opus", [100, 10, 5, 1]), usage(2, "worker-1", "s1", "opus", [300, 30, 15, 3])];
  const expected = { opus: { input: 300, output: 30, cache_write: 15, cache_read: 3 } };
  expect(usageTotals(log).get("worker-1")).toEqual(expected);
  expect(usageTotals([...log, usage(3, "worker-1", "s1", "opus", [300, 30, 15, 3])]).get("worker-1")).toEqual(expected);
  expect(usageTotals([...log].reverse()).get("worker-1")).toEqual(expected);
});

test("TUI-17: an agent without usage has no total", () => {
  expect(usageTotals([]).size).toBe(0);
  expect(usageTotals([turn(1, "leader"), joined(2, "leader")]).has("leader")).toBe(false);
});

test("TUI-17: the total of the feature takes out the latest usage of each session_id and model before the feature_opened", () => {
  const log = [
    usage(1, "worker-1", "s1", "opus", [100, 10, 5, 1]),
    usage(4, "worker-1", "s1", "opus", [300, 30, 15, 3]),
    // the feature opens at seq 5
    usage(6, "worker-1", "s1", "opus", [450, 70, 15, 43]),
    usage(7, "worker-1", "s1", "opus", [1000, 100, 20, 50]),
  ];
  // 1000 - 300, 100 - 30, 20 - 15, 50 - 3: the usage of seq 4 is the one taken out, not the one of seq 1
  expect(usageTotals(log, 5).get("worker-1")).toEqual({ opus: { input: 700, output: 70, cache_write: 5, cache_read: 47 } });
  // and without the seq the total is the one of the session
  expect(usageTotals(log).get("worker-1")).toEqual({ opus: { input: 1000, output: 100, cache_write: 20, cache_read: 50 } });
});

test("TUI-17: a session or a model that started after the feature_opened counts whole in the total of the feature", () => {
  const totals = usageTotals(
    [
      usage(1, "worker-1", "s1", "opus", [100, 10, 5, 1]),
      // the feature opens at seq 5
      usage(6, "worker-1", "s1", "opus", [150, 20, 5, 2]),
      usage(7, "worker-1", "s1", "haiku", [7, 6, 5, 4]),
      usage(8, "worker-1", "s2", "opus", [1000, 100, 50, 10]),
    ],
    5
  );
  // opus: (150 - 100) + 1000, (20 - 10) + 100, (5 - 5) + 50, (2 - 1) + 10
  expect(totals.get("worker-1")).toEqual({
    opus: { input: 1050, output: 110, cache_write: 50, cache_read: 11 },
    haiku: { input: 7, output: 6, cache_write: 5, cache_read: 4 },
  });
});

test("TUI-17: an agent that used nothing since the feature_opened has a total of zero in the feature", () => {
  const totals = usageTotals([usage(4, "judge", "s3", "opus", [9, 8, 7, 6])], 5);
  expect(totals.get("judge")).toEqual({ opus: { input: 0, output: 0, cache_write: 0, cache_read: 0 } });
});

const NOW = T0 + 3600 * 1000;

// The six in the broker (seq 1 to 6) and feature 1 open (seq 7)
const UP = SQUAD.map((agent, i) => joined(i + 1, agent.name));

function opened(seq: number, feature_id = 1): SquadEvent {
  return event(seq, {
    kind: "feature_opened", feature_id, from: "mother", to: "*", title: "the importer", workflow: "tlc",
    branch: "feat/importer", base_branch: "develop", spec_ref: ".specs/features/importer/spec.md", spec_commit: "9f8e7d6",
  });
}

function closed(seq: number, feature_id = 1, outcome = "delivered"): SquadEvent {
  return event(seq, { kind: "feature_closed", feature_id, from: "mother", to: "*", outcome });
}

const OPEN = [...UP, opened(7)];

function plan(seq: number, list: PlannedTicket[], feature_id = 1): SquadEvent {
  return event(seq, { kind: "plan", feature_id, from: "leader", tickets: list });
}

function task(seq: number, ticket_ref: string, to: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, { kind: "task", feature_id: 1, from: "leader", to, summary: "do it", ticket_ref, loadout: [], ...fields });
}

function result(seq: number, ticket_ref: string, from: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, {
    kind: "result", feature_id: 1, from, to: "judge", summary: "done", ticket_ref, task_seq: seq - 1, branch: "b", commit: "c", ...fields,
  });
}

function verdict(seq: number, ticket_ref: string, outcome: "approve" | "rework", fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, {
    kind: "verdict", feature_id: 1, from: "judge", to: "leader", summary: outcome, ticket_ref, result_seq: seq - 1, outcome,
    criteria: [{ n: 1, text: "works", pass: outcome === "approve" }], ...fields,
  });
}

const A = { ticket_ref: "A", title: "the parser" };
const B = { ticket_ref: "B", title: "the writer" };

// The plan of A and B (seq 8) in the open feature
const PLANNED = [...OPEN, plan(8, [A, B])];

// task, result and verdict of rework for ticket A of worker-1, `rounds` times from seq 10
function reworked(rounds: number): SquadEvent[] {
  const events: SquadEvent[] = [];
  for (let i = 0; i < rounds; i++) {
    const seq = 10 + i * 3;
    events.push(task(seq, "A", "worker-1"), result(seq + 1, "A", "worker-1"), verdict(seq + 2, "A", "rework"));
  }
  return events;
}

function ticketStatus(log: SquadEvent[], ticket_ref: string): string | undefined {
  return squad(log, NOW).tickets.find((t) => t.ticket_ref === ticket_ref)?.status;
}

test("TUI-14: a ticket the current plan marks as dropped is dropped", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), plan(12, [{ ...A, dropped: true }, B])];
  expect(ticketStatus(log, "A")).toBe("dropped");
  // what an earlier plan marked does not count
  expect(ticketStatus([...log, plan(13, [A, B])], "A")).toBe("working");
});

test("TUI-14: a ticket that never received a task is planned, with the dependencies of the plan", () => {
  const log = [...OPEN, plan(8, [A, { ...B, depends_on: ["A"] }]), task(10, "A", "worker-1")];
  const [a, b] = squad(log, NOW).tickets;
  expect(b!.status).toBe("planned");
  expect(b!.depends_on).toEqual(["A"]);
  expect(b!.title).toBe("the writer");
  expect(b!.owner).toBeNull();
  expect(a!.status).toBe("working");
  expect(a!.depends_on).toEqual([]);
});

test("TUI-14: a ticket whose latest event is a task is working", () => {
  const [a] = squad([...PLANNED, task(10, "A", "worker-1")], NOW).tickets;
  expect(a!.status).toBe("working");
  expect(a!.owner).toBe("worker-1");
  expect(a!.last).toEqual({ kind: "task", seq: 10 });
});

test("TUI-14: a ticket whose latest event is a result is in review", () => {
  expect(ticketStatus([...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1")], "A")).toBe("review");
});

test("TUI-14: a ticket whose latest event is a verdict of approve is done", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1"), verdict(12, "A", "approve")];
  expect(ticketStatus(log, "A")).toBe("done");
  // and it is not anymore when a result comes after the approve
  expect(ticketStatus([...log, result(13, "A", "worker-1")], "A")).toBe("review");
});

test("TUI-14: a ticket with a verdict of rework as its latest event, below the limit, is working", () => {
  expect(ticketStatus([...PLANNED, ...reworked(1)], "A")).toBe("working");
  expect(ticketStatus([...PLANNED, ...reworked(2)], "A")).toBe("working");
});

test("TUI-14: a ticket with three verdicts of rework is escalated", () => {
  const log = [...PLANNED, ...reworked(3)];
  expect(ticketStatus(log, "A")).toBe("escalated");
  expect(squad(log, NOW).tickets[0]!.reworks).toBe(3);
});

test("TUI-14: the ticket a blocked owner is working on is blocked", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), task(11, "B", "worker-2")];
  const declared = [...log, blocked(12, "worker-1", "missing credential", { ticket_ref: "A" })];
  expect(ticketStatus(declared, "A")).toBe("blocked");
  // the ticket of another worker is not
  expect(ticketStatus(declared, "B")).toBe("working");
  // nor is it after the unblocked
  expect(ticketStatus([...declared, unblocked(13, "worker-1")], "A")).toBe("working");

  // an open permission request blocks the owner too
  const asking = [...log, request(12, "worker-1")];
  expect(ticketStatus(asking, "A")).toBe("blocked");
  expect(ticketStatus([...asking, decision(13, "worker-1", 12)], "A")).toBe("working");
});

test("TUI-14: a ticket is not blocked when its owner is offline, nor when the owner already delivered it", () => {
  const log = [...PLANNED, task(10, "A", "worker-1")];
  // an offline agent is offline, not blocked
  expect(ticketStatus([...log, blocked(12, "worker-1", "r"), left(13, "worker-1")], "A")).toBe("working");
  // delivered: it is not the ticket the owner is working on
  expect(ticketStatus([...log, result(11, "A", "worker-1"), blocked(12, "worker-1", "r")], "A")).toBe("review");
});

test("TUI-14: a ticket whose owner asked an open blocking question about it is waiting", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), task(11, "B", "worker-2")];
  const asked = [...log, question(12, 4, "worker-1", "leader", { blocking: true, ticket_ref: "A" })];
  expect(ticketStatus(asked, "A")).toBe("waiting");
  expect(ticketStatus(asked, "B")).toBe("working");
  // still waiting when the leader escalates it
  const escalated = [...asked, question(13, 4, "leader", "mother", { asked_by: "worker-1", blocking: true, ticket_ref: "A" })];
  expect(ticketStatus(escalated, "A")).toBe("waiting");
  // and working again when it is answered
  expect(ticketStatus([...asked, answer(13, 4, "leader", "worker-1", "agent")], "A")).toBe("working");
});

test("TUI-14: a non-blocking question, one about another ticket and one somebody else asked do not leave the ticket waiting", () => {
  const log = [...PLANNED, task(10, "A", "worker-1")];
  expect(ticketStatus([...log, question(12, 4, "worker-1", "leader", { ticket_ref: "A" })], "A")).toBe("working");
  expect(ticketStatus([...log, question(12, 4, "worker-1", "leader", { blocking: true, ticket_ref: "B" })], "A")).toBe("working");
  expect(ticketStatus([...log, question(12, 4, "worker-1", "leader", { blocking: true })], "A")).toBe("working");
  expect(ticketStatus([...log, question(12, 4, "judge", "worker-1", { blocking: true, ticket_ref: "A" })], "A")).toBe("working");
});

test("TUI-14: dropped comes before planned", () => {
  expect(ticketStatus([...OPEN, plan(8, [{ ...A, dropped: true }, B])], "A")).toBe("dropped");
});

test("TUI-14: planned comes before escalated", () => {
  // a log the broker does not write: three verdicts of rework for a ticket that never received a task
  const log = [...PLANNED, verdict(10, "A", "rework"), verdict(11, "A", "rework"), verdict(12, "A", "rework")];
  expect(ticketStatus(log, "A")).toBe("planned");
});

test("TUI-14: escalated comes before done", () => {
  // a log the broker does not write: a fourth round after the third rework
  const log = [...PLANNED, ...reworked(3), task(19, "A", "worker-1"), result(20, "A", "worker-1"), verdict(21, "A", "approve")];
  expect(ticketStatus(log, "A")).toBe("escalated");
});

test("TUI-14: blocked comes before waiting", () => {
  const log = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    question(11, 4, "worker-1", "leader", { blocking: true, ticket_ref: "A" }),
    blocked(12, "worker-1", "missing credential", { ticket_ref: "A" }),
  ];
  expect(ticketStatus(log, "A")).toBe("blocked");
});

test("TUI-14: waiting comes before review", () => {
  const log = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    result(11, "A", "worker-1"),
    question(12, 4, "worker-1", "leader", { blocking: true, ticket_ref: "A" }),
  ];
  expect(ticketStatus(log, "A")).toBe("waiting");
});

test("TUI-15: a question, an answer and a blocked with the ticket_ref do not change the latest event of the ticket", () => {
  const review = [...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1")];
  const others = (seq: number, ticket_ref: string) => [
    question(seq, 4, "judge", "worker-1", { ticket_ref }),
    { ...answer(seq + 1, 4, "worker-1", "judge", "agent"), ticket_ref },
    blocked(seq + 2, "judge", "cannot check out the branch", { ticket_ref }),
  ];
  expect(ticketStatus([...review, ...others(12, "A")], "A")).toBe("review");
  expect(squad([...review, ...others(12, "A")], NOW).tickets[0]!.last).toEqual({ kind: "result", seq: 11 });

  const done = [...review, verdict(12, "A", "approve")];
  expect(ticketStatus([...done, ...others(13, "A")], "A")).toBe("done");
  // and a ticket_ref seen only in them is not a ticket
  expect(squad([...done, ...others(13, "Z")], NOW).tickets.map((t) => t.ticket_ref)).toEqual(["A", "B"]);
});

test("TUI-14: every ticket of the current plan and every one with an event of ticket has a status, the planned ones first", () => {
  const log = [...OPEN, task(9, "X", "worker-3"), plan(10, [B, A]), task(11, "A", "worker-1")];
  expect(squad(log, NOW).tickets.map((t) => [t.ticket_ref, t.status])).toEqual([
    ["B", "planned"],
    ["A", "working"],
    ["X", "working"],
  ]);
});

test("TUI-14: only the events of the open feature count", () => {
  const before = [...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1"), verdict(12, "A", "approve"), closed(13)];
  // without an open feature there is no ticket
  expect(squad(before, NOW).tickets).toEqual([]);
  // and the A of the next feature starts over
  const next = [...before, opened(14, 2), plan(15, [A], 2)];
  expect(squad(next, NOW).tickets.map((t) => [t.ticket_ref, t.status])).toEqual([["A", "planned"]]);
});

function kickoff(seq: number): SquadEvent {
  return event(seq, { kind: "task", feature_id: 1, from: "mother", to: "leader", summary: "kickoff" });
}

function agent(log: SquadEvent[], name: string) {
  return squad(log, NOW).agents.find((a) => a.name === name)!;
}

function statuses(log: SquadEvent[]): Record<string, string> {
  return Object.fromEntries(squad(log, NOW).agents.map((a) => [a.short, a.status]));
}

// A and B approved, each by its worker (seq 10 to 15)
const APPROVED = [
  ...PLANNED,
  task(10, "A", "worker-1"),
  result(11, "A", "worker-1"),
  verdict(12, "A", "approve"),
  task(13, "B", "worker-2"),
  result(14, "B", "worker-2"),
  verdict(15, "B", "approve"),
];

test("TUI-01: a name of the squad without an event of presence is never, whatever else the log has of it", () => {
  const log = [joined(1, "mother"), joined(2, "leader"), turn(3, "worker-1"), blocked(4, "worker-1", "r")];
  expect(agent(log, "worker-1")).toEqual({
    name: "worker-1",
    role: "worker",
    short: "w1",
    status: "never",
    since: null,
    blockingQuestion: null,
    permission: null,
    blockedReason: null,
    owes: null,
    ticket: null,
    inTurn: true,
    noReactionSince: null,
    tokens: null,
    featureTokens: null,
  });
  expect(statuses(log)).toEqual({ mot: "idle", ldr: "idle", w1: "never", w2: "never", w3: "never", jdg: "never" });
  expect(statuses([])).toEqual({ mot: "never", ldr: "never", w1: "never", w2: "never", w3: "never", jdg: "never" });
});

test("TUI-02: an agent whose latest event of presence is a peer_left is offline since the ts of it", () => {
  const log = [...UP, left(9, "worker-2")];
  expect(agent(log, "worker-2").status).toBe("offline");
  expect(agent(log, "worker-2").since).toBe(T0 + 9000);
  expect(agent(log, "worker-3").status).toBe("idle");
  // and it is not anymore when it comes back
  const back = agent([...log, joined(10, "worker-2")], "worker-2");
  expect(back.status).toBe("idle");
  expect(back.since).toBeNull();
});

test("TUI-03: an agent with a blocked and no unblocked after it is blocked, with the reason", () => {
  const log = [...UP, blocked(9, "worker-2", "missing credential")];
  const a = agent(log, "worker-2");
  expect(a.status).toBe("blocked");
  expect(a.blockedReason).toBe("missing credential");
  expect(a.since).toBe(T0 + 9000);
  expect(a.permission).toBeNull();
  expect(agent(log, "worker-1").status).toBe("idle");

  const free = agent([...log, unblocked(10, "worker-2", "broker")], "worker-2");
  expect(free.status).toBe("idle");
  expect(free.blockedReason).toBeNull();
  expect(free.since).toBeNull();
});

test("TUI-04: an agent with an open permission request is blocked, with the seq of the request", () => {
  const log = [...UP, request(9, "worker-1")];
  const a = agent(log, "worker-1");
  expect(a.status).toBe("blocked");
  expect(a.permission!.seq).toBe(9);
  expect(a.since).toBe(T0 + 9000);
  expect(a.blockedReason).toBeNull();

  const decided = agent([...log, decision(10, "worker-1", 9)], "worker-1");
  expect(decided.status).toBe("idle");
  expect(decided.permission).toBeNull();
});

test("TUI-03, TUI-04: an agent with a declared block and an open request has both, since the earlier", () => {
  const a = agent([...UP, blocked(9, "worker-1", "missing credential"), request(12, "worker-1")], "worker-1");
  expect(a.status).toBe("blocked");
  expect(a.blockedReason).toBe("missing credential");
  expect(a.permission!.seq).toBe(12);
  expect(a.since).toBe(T0 + 9000);
});

test("TUI-05: an agent that asked an open blocking question is waiting, with the question_id", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), question(11, 4, "worker-1", "leader", { blocking: true, ticket_ref: "A" })];
  const a = agent(log, "worker-1");
  expect(a.status).toBe("waiting");
  expect(a.blockingQuestion).toBe(4);
  // still the one who asked when the leader passes it on
  const passed = [...log, question(12, 4, "leader", "mother", { asked_by: "worker-1", blocking: true, ticket_ref: "A" })];
  expect(agent(passed, "worker-1").blockingQuestion).toBe(4);
  expect(agent(passed, "leader").blockingQuestion).toBeNull();

  // with the answer it is back to what it owes
  const answered = agent([...log, answer(12, 4, "leader", "worker-1", "agent")], "worker-1");
  expect(answered.status).toBe("stalled");
  expect(answered.blockingQuestion).toBeNull();
});

test("TUI-05: the leader that escalated a ticket at the limit with a blocking question is waiting for it", () => {
  const log = [...PLANNED, ...reworked(3), question(19, 6, "leader", "mother", { blocking: true, ticket_ref: "A" })];
  expect(agent(log, "leader").status).toBe("waiting");
  expect(agent(log, "leader").blockingQuestion).toBe(6);
});

test("TUI-05: with two open blocking questions the agent waits for the one asked first", () => {
  const log = [
    ...OPEN,
    question(9, 7, "mother", "human", { blocking: true }),
    question(10, 3, "mother", "human", { blocking: true }),
  ];
  expect(agent(log, "mother").blockingQuestion).toBe(7);
  expect(agent([...log, answer(11, 7, "human", "mother", "human")], "mother").blockingQuestion).toBe(3);
});

test("TUI-06: the worker that asked a question still open and already delivered the result is waiting", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), question(11, 9, "worker-1", "leader", { ticket_ref: "A" }), result(12, "A", "worker-1")];
  const a = agent(log, "worker-1");
  expect(a.status).toBe("waiting");
  expect(a.blockingQuestion).toBeNull();
  // and idle when the question is answered
  expect(agent([...log, answer(13, 9, "leader", "worker-1", "agent")], "worker-1").status).toBe("idle");
});

test("TUI-06: who passed a question on is waiting like who asked it", () => {
  const log = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    question(11, 9, "worker-1", "leader", { ticket_ref: "A" }),
    result(12, "A", "worker-1"),
    verdict(13, "A", "approve"),
    plan(14, [A]),
    question(15, 9, "leader", "mother", { asked_by: "worker-1", ticket_ref: "A" }),
    question(16, 9, "mother", "human", { asked_by: "worker-1", ticket_ref: "A" }),
  ];
  // the leader has no ticket left to conclude, the mother never has one
  expect(statuses(log)).toEqual({ mot: "waiting", ldr: "waiting", w1: "waiting", w2: "done", w3: "done", jdg: "done" });
  expect(agent(log, "mother").blockingQuestion).toBeNull();
  expect(agent(log, "leader").blockingQuestion).toBeNull();
});

test("TUI-06: the mother that asked for a gate still pending is waiting, and a comment does not decide it", () => {
  const log = [...APPROVED, gate(16, 1)];
  expect(agent(log, "mother").status).toBe("waiting");
  expect(agent([...log, gateDecision(17, 1, "comment")], "mother").status).toBe("waiting");
  expect(agent([...log, gateDecision(17, 1, "approve")], "mother").status).toBe("working");
  expect(agent([...log, gateDecision(17, 1, "reject")], "mother").status).toBe("working");
});

test("TUI-06: an agent with a ticket in progress is not waiting for the question it sent", () => {
  // worker: it owns a ticket whose latest event is a task
  const asking = [...PLANNED, task(10, "A", "worker-1"), question(11, 9, "worker-1", "leader", { ticket_ref: "A" }), turn(12, "worker-1")];
  expect(agent(asking, "worker-1").status).toBe("working");

  // leader: some ticket of the plan is neither approved nor dropped
  const passed = [...asking, question(13, 9, "leader", "mother", { asked_by: "worker-1", ticket_ref: "A" })];
  expect(agent(passed, "leader").status).toBe("working");

  // judge: a result without verdict
  const judging = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    result(11, "A", "worker-1"),
    question(12, 9, "judge", "worker-1", { ticket_ref: "A" }),
    turn(13, "judge"),
  ];
  expect(agent(judging, "judge").status).toBe("working");
  // and it is waiting once nothing is left to judge
  const judged = [...judging, verdict(14, "A", "rework"), usage(15, "judge", "s1", "opus", [1, 1, 1, 1])];
  expect(agent(judged, "judge").status).toBe("waiting");
});

test("TUI-07, TUI-08: a worker out of turn owes the result of its ticket in working", () => {
  const log = [...PLANNED, task(10, "A", "worker-1")];
  const a = agent(log, "worker-1");
  expect(a.status).toBe("stalled");
  expect(a.owes).toEqual({ owes: "result", ticket_ref: "A", seq: 10 });
  expect(a.ticket).toBe("A");
  expect(statuses(log)).toEqual({ mot: "working", ldr: "working", w1: "stalled", w2: "idle", w3: "idle", jdg: "idle" });
});

test("TUI-07, TUI-08: the judge out of turn owes the verdict of a result without verdict", () => {
  const a = agent([...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1")], "judge");
  expect(a.status).toBe("stalled");
  expect(a.owes).toEqual({ owes: "verdict", ticket_ref: "A", seq: 11 });
});

test("TUI-07, TUI-08: the leader out of turn owes the task after a verdict of rework below the limit", () => {
  const a = agent([...PLANNED, ...reworked(2)], "leader");
  expect(a.status).toBe("stalled");
  expect(a.owes).toEqual({ owes: "task", ticket_ref: "A", seq: 15 });
  // at the limit there is no task to owe: the ticket is still not concluded
  const limit = agent([...PLANNED, ...reworked(3)], "leader");
  expect(limit.status).toBe("working");
  expect(limit.owes).toBeNull();
});

test("TUI-07, TUI-08: the leader out of turn owes the plan after the kickoff", () => {
  const a = agent([...OPEN, kickoff(8)], "leader");
  expect(a.status).toBe("stalled");
  expect(a.owes).toEqual({ owes: "plan", seq: 8 });
  expect(agent([...OPEN, kickoff(8), plan(9, [A])], "leader").status).toBe("working");
});

test("TUI-07, TUI-08: any agent out of turn owes the answer of an open question it holds", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), turn(11, "worker-1"), question(12, 9, "worker-1", "leader", { ticket_ref: "A" })];
  const leader = agent(log, "leader");
  expect(leader.status).toBe("stalled");
  expect(leader.owes).toEqual({ owes: "answer", question_id: 9, seq: 12 });

  // passed on, the debt goes with it: the seq is the one of the question that made the holder
  const passed = [...log, question(14, 9, "leader", "mother", { asked_by: "worker-1", ticket_ref: "A" })];
  expect(agent(passed, "leader").owes).toBeNull();
  expect(agent(passed, "mother").status).toBe("stalled");
  expect(agent(passed, "mother").owes).toEqual({ owes: "answer", question_id: 9, seq: 14 });

  // a worker holds the question the judge asks it
  const judge = [...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1"), question(12, 5, "judge", "worker-1", { ticket_ref: "A" })];
  expect(agent(judge, "worker-1").status).toBe("stalled");
  expect(agent(judge, "worker-1").owes).toEqual({ owes: "answer", question_id: 5, seq: 12 });

  // and nobody owes the answer of a closed one
  expect(agent([...log, answer(13, 9, "leader", "worker-1", "agent")], "leader").owes).toBeNull();
});

test("TUI-07: of two debts the agent is stalled with the oldest", () => {
  const log = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    question(11, 9, "worker-1", "leader", { ticket_ref: "A" }),
    result(12, "A", "worker-1"),
    verdict(13, "A", "rework"),
  ];
  expect(agent(log, "leader").owes).toEqual({ owes: "answer", question_id: 9, seq: 11 });
  expect(agent([...log, answer(14, 9, "leader", "worker-1", "agent")], "leader").owes).toEqual({ owes: "task", ticket_ref: "A", seq: 13 });
});

test("TUI-07: an agent in turn is not stalled: in turn is the latest of its turn_started and usage being a turn_started", () => {
  const log = [...PLANNED, task(10, "A", "worker-1")];
  const spent = usage(13, "worker-1", "s1", "opus", [1, 1, 1, 1]);
  expect(agent(log, "worker-1").inTurn).toBe(false);

  const started = agent([...log, turn(11, "worker-1")], "worker-1");
  expect(started.inTurn).toBe(true);
  expect(started.status).toBe("working");
  expect(started.owes).toBeNull();

  const ended = agent([...log, turn(11, "worker-1"), spent], "worker-1");
  expect(ended.inTurn).toBe(false);
  expect(ended.status).toBe("stalled");

  const again = agent([...log, turn(11, "worker-1"), spent, turn(14, "worker-1")], "worker-1");
  expect(again.inTurn).toBe(true);
  expect(again.status).toBe("working");
  // the latest is the one of the greatest seq, whatever the order of the list
  expect(agent([turn(14, "worker-1"), spent, ...log], "worker-1").inTurn).toBe(true);

  // the turn of another agent is not its turn
  const other = agent([...log, turn(11, "worker-2")], "worker-1");
  expect(other.inTurn).toBe(false);
  expect(other.status).toBe("stalled");
});

test("TUI-07: an agent is stalled since its turn ended, or since the debt came if it came later", () => {
  const spent = (seq: number) => usage(seq, "worker-1", "s1", "opus", [1, 1, 1, 1]);
  // the task came and no turn started
  expect(agent([...PLANNED, task(10, "A", "worker-1")], "worker-1").since).toBe(T0 + 10000);
  expect(agent([...PLANNED, turn(8, "worker-1"), spent(9), task(10, "A", "worker-1")], "worker-1").since).toBe(T0 + 10000);
  // the turn ended without the result
  expect(agent([...PLANNED, task(10, "A", "worker-1"), turn(11, "worker-1"), spent(13)], "worker-1").since).toBe(T0 + 13000);
});

test("TUI-09: a worker with a ticket in progress, the judge with a result without verdict, the leader with a ticket to conclude and the mother with an open feature are working", () => {
  const log = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    task(11, "B", "worker-2"),
    result(12, "B", "worker-2"),
    turn(13, "worker-1"),
    turn(14, "judge"),
  ];
  expect(statuses(log)).toEqual({ mot: "working", ldr: "working", w1: "working", w2: "idle", w3: "idle", jdg: "working" });
  // the mother is working with the feature open and nothing else in it
  expect(statuses(OPEN)).toEqual({ mot: "working", ldr: "idle", w1: "idle", w2: "idle", w3: "idle", jdg: "idle" });
});

test("TUI-10: with every ticket of the current plan that is not dropped approved, the agents are done", () => {
  expect(statuses(APPROVED)).toEqual({ mot: "working", ldr: "done", w1: "done", w2: "done", w3: "done", jdg: "done" });
  expect(agent(APPROVED, "worker-1").ticket).toBeNull();

  // a dropped ticket does not count, approved or not
  const dropped = [...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1"), verdict(12, "A", "approve"), task(13, "B", "worker-2")];
  expect(statuses([...dropped, plan(14, [A, { ...B, dropped: true }])])).toEqual({
    mot: "working", ldr: "done", w1: "done", w2: "done", w3: "done", jdg: "done",
  });
  expect(agent([...dropped, plan(14, [A, { ...B, dropped: true }])], "worker-2").ticket).toBeNull();
});

test("TUI-10: nobody is done while a ticket of the plan is not approved, nor in a feature without plan", () => {
  // A approved and B still planned: the worker of A is idle
  const log = [...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1"), verdict(12, "A", "approve")];
  expect(statuses(log)).toEqual({ mot: "working", ldr: "working", w1: "idle", w2: "idle", w3: "idle", jdg: "idle" });
  // only the current plan counts: without B in it, all is approved
  expect(statuses([...log, plan(13, [A])]).w1).toBe("done");
  expect(statuses(OPEN).w1).toBe("idle");
});

test("TUI-11: the worker whose ticket got a verdict of rework below the limit is idle and owes nothing", () => {
  const a = agent([...PLANNED, ...reworked(1)], "worker-1");
  expect(a.status).toBe("idle");
  expect(a.owes).toBeNull();
  expect(a.ticket).toBe("A");
  // and stalled again with the task of the rework
  expect(agent([...PLANNED, ...reworked(1), task(13, "A", "worker-1")], "worker-1").status).toBe("stalled");
});

test("TUI-11: a worker without ticket and the worker and the judge of a ticket in review or dropped are idle", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1"), turn(12, "judge")];
  expect(agent(log, "worker-1").status).toBe("idle");
  expect(agent(log, "worker-3").status).toBe("idle");
  // a dropped ticket frees its worker, and the judge of its result
  const dropped = [...PLANNED, task(10, "A", "worker-1"), task(11, "B", "worker-2"), result(12, "B", "worker-2"), plan(13, [A, { ...B, dropped: true }])];
  expect(statuses(dropped)).toEqual({ mot: "working", ldr: "working", w1: "stalled", w2: "idle", w3: "idle", jdg: "idle" });
  const both = [...PLANNED, task(10, "A", "worker-1"), turn(11, "worker-1"), plan(13, [{ ...A, dropped: true }, B])];
  expect(agent(both, "worker-1").status).toBe("idle");
  expect(agent(both, "worker-1").ticket).toBeNull();
});

test("TUI-12: offline comes before blocked", () => {
  const a = agent([...UP, blocked(9, "worker-2", "missing credential"), request(10, "worker-2"), left(11, "worker-2")], "worker-2");
  expect(a.status).toBe("offline");
  expect(a.since).toBe(T0 + 11000);
  expect(a.blockedReason).toBeNull();
  expect(a.permission).toBeNull();
});

test("TUI-12: blocked comes before waiting with a blocking question", () => {
  const log = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    question(11, 4, "worker-1", "leader", { blocking: true, ticket_ref: "A" }),
    blocked(12, "worker-1", "missing credential"),
  ];
  expect(agent(log, "worker-1").status).toBe("blocked");
  expect(agent(log, "worker-1").blockingQuestion).toBeNull();
});

test("TUI-12: waiting with a blocking question comes before waiting", () => {
  // the mother sent the question and has no ticket in progress: both rules hold
  const a = agent([...OPEN, question(9, 3, "mother", "human", { blocking: true })], "mother");
  expect(a.status).toBe("waiting");
  expect(a.blockingQuestion).toBe(3);
});

test("TUI-12: waiting comes before stalled", () => {
  // the leader owes the plan and asked the mother, who holds the question out of turn
  const log = [...OPEN, kickoff(8), question(9, 5, "leader", "mother")];
  expect(agent(log, "leader").status).toBe("waiting");
  expect(agent(log, "leader").owes).toBeNull();
  expect(agent(log, "mother").status).toBe("stalled");

  // the mother asked for a gate and holds a question
  const gated = [...log, gate(10, 1)];
  expect(agent(gated, "mother").status).toBe("waiting");
  expect(agent(gated, "mother").owes).toBeNull();
});

test("TUI-12: stalled comes before working", () => {
  // a ticket in progress and its result owed, out of turn
  expect(agent([...PLANNED, task(10, "A", "worker-1")], "worker-1").status).toBe("stalled");
  expect(agent([...PLANNED, task(10, "A", "worker-1"), result(11, "A", "worker-1")], "judge").status).toBe("stalled");
});

test("TUI-12: working comes before done", () => {
  // every ticket approved and the feature open
  expect(agent(APPROVED, "mother").status).toBe("working");
});

test("TUI-13: without an open feature the agents are only never, offline, blocked or idle", () => {
  const none = [...UP.slice(0, 5), left(8, "worker-2"), blocked(9, "worker-3", "missing credential"), turn(10, "leader")];
  expect(statuses(none)).toEqual({ mot: "idle", ldr: "idle", w1: "idle", w2: "offline", w3: "blocked", jdg: "never" });

  // what a closed feature left behind gives no status
  const left_behind = [
    ...PLANNED,
    task(10, "A", "worker-1"),
    question(11, 4, "worker-1", "leader", { blocking: true, ticket_ref: "A" }),
    task(12, "B", "worker-2"),
    result(13, "B", "worker-2"),
    gate(14, 1),
    closed(15, 1, "abandoned"),
  ];
  expect(statuses(left_behind)).toEqual({ mot: "idle", ldr: "idle", w1: "idle", w2: "idle", w3: "idle", jdg: "idle" });
  expect(agent(left_behind, "worker-1").ticket).toBeNull();
  expect(agent(left_behind, "worker-1").blockingQuestion).toBeNull();
});

// The ts of the message without reaction of the agent, `ms` after the event of seq 10
function noReaction(log: SquadEvent[], name: string, ms: number): number | null {
  return squad(log, T0 + 10000 + ms).agents.find((a) => a.name === name)!.noReactionSince;
}

test("TUI-16: a message to an agent without an event of it after is without reaction from 120000 ms on", () => {
  const log = [...PLANNED, task(10, "A", "worker-1")];
  expect(noReaction(log, "worker-1", 119999)).toBeNull();
  expect(noReaction(log, "worker-1", 120000)).toBe(T0 + 10000);
  expect(noReaction(log, "worker-1", 500000)).toBe(T0 + 10000);
  // the message is to worker-1 and to nobody else
  expect(noReaction(log, "worker-2", 500000)).toBeNull();
  expect(noReaction(log, "leader", 500000)).toBeNull();
});

test("TUI-16: an event of the agent with a greater seq is a reaction, and one before the message is not", () => {
  const log = [...PLANNED, turn(9, "worker-1"), task(10, "A", "worker-1")];
  expect(noReaction(log, "worker-1", 120000)).toBe(T0 + 10000);
  expect(noReaction([...log, turn(11, "worker-1")], "worker-1", 500000)).toBeNull();
  expect(noReaction([turn(11, "worker-1"), ...log], "worker-1", 500000)).toBeNull();
  // the event of another agent is no reaction
  expect(noReaction([...log, turn(11, "worker-2")], "worker-1", 120000)).toBe(T0 + 10000);
});

test("TUI-16: a refused with the name of the agent in peer is no reaction", () => {
  const log = [...PLANNED, task(10, "A", "worker-1"), refused(11, "worker-1"), unblocked(12, "worker-1", "broker")];
  expect(noReaction(log, "worker-1", 120000)).toBe(T0 + 10000);
});

test("TUI-16: of the messages without reaction the oldest with 120000 ms counts", () => {
  // seq 10 and seq 70, one minute apart, both without reaction
  const two = [...PLANNED, task(10, "A", "worker-1"), task(70, "B", "worker-1")];
  expect(noReaction(two, "worker-1", 119999)).toBeNull();
  expect(noReaction(two, "worker-1", 120000)).toBe(T0 + 10000);
  expect(noReaction(two, "worker-1", 500000)).toBe(T0 + 10000);

  // the agent reacted to the first: only the second counts, when it is old enough
  const reacted = [...PLANNED, task(10, "A", "worker-1"), turn(11, "worker-1"), task(70, "B", "worker-1")];
  expect(noReaction(reacted, "worker-1", 60000 + 119999)).toBeNull();
  expect(noReaction(reacted, "worker-1", 60000 + 120000)).toBe(T0 + 70000);
});

test("TUI-16: an agent that is not in the broker has no message without reaction", () => {
  const log = [...PLANNED, task(10, "A", "worker-1")];
  expect(noReaction([...log, left(11, "worker-1")], "worker-1", 500000)).toBeNull();
  // back in the broker, the message is still without reaction
  expect(noReaction([...log, left(11, "worker-1"), joined(12, "worker-1")], "worker-1", 500000)).toBe(T0 + 10000);
  // and one that never entered has none
  const never = [joined(1, "leader"), opened(7), plan(8, [A]), task(10, "A", "worker-1")];
  expect(noReaction(never, "worker-1", 500000)).toBeNull();
});

// Feature 1 abandoned (seq 7 and 8), then feature 2 open (seq 10) with a second plan, a
// ticket with its worker asking for a permission, a question with the dev and a gate
const WHOLE = [
  ...UP,
  opened(7),
  closed(8, 1, "abandoned"),
  usage(9, "mother", "m1", "opus", [1000, 100, 10, 1]),
  ...[
    opened(10, 2),
    kickoff(11),
    plan(12, [A]),
    plan(13, [A, { ...B, depends_on: ["A"] }]),
    task(14, "A", "worker-1"),
    turn(15, "worker-1"),
    usage(16, "mother", "m1", "opus", [3000, 300, 30, 3]),
    usage(17, "mother", "m1", "haiku", [40, 4, 0, 0]),
    question(18, 9, "mother", "human"),
    gate(19, 1),
    request(20, "worker-1"),
  ].map((e) => ({ ...e, feature_id: 2 }) as SquadEvent),
];

test("TUI-18: the squad has the open feature, the one closed last, the version of the plan and the state of everything in it", () => {
  const s = squad(WHOLE, NOW);
  expect(s.now).toBe(NOW);
  expect(s.features.map((f) => [f.id, f.opened_seq, f.closed_seq, f.outcome])).toEqual([
    [1, 7, 8, "abandoned"],
    [2, 10, null, null],
  ]);
  expect(s.feature).toEqual(s.features[1]!);
  expect(s.feature!.title).toBe("the importer");
  expect(s.lastClosed).toEqual(s.features[0]!);
  expect(s.planVersion).toBe(2);

  expect(s.agents.map((a) => a.name)).toEqual(["mother", "leader", "worker-1", "worker-2", "worker-3", "judge"]);
  expect(s.agents.map((a) => a.status)).toEqual(["waiting", "working", "blocked", "idle", "idle", "idle"]);
  expect(s.tickets.map((t) => [t.ticket_ref, t.status, t.depends_on])).toEqual([
    ["A", "blocked", []],
    ["B", "planned", ["A"]],
  ]);
  expect(s.questions.map((q) => [q.id, q.holder, q.open])).toEqual([[9, "human", true]]);
  expect(s.gates).toEqual([{ id: 1, pending: true, request_seq: 19, decision: null }]);
  expect(s.permissions.map((p) => [p.seq, p.from])).toEqual([[20, "worker-1"]]);
});

test("TUI-17: the squad has the tokens of each agent, in the session and since the feature opened", () => {
  const s = squad(WHOLE, NOW);
  expect([...s.usage.session.keys()]).toEqual(["mother"]);
  expect(s.usage.session.get("mother")).toEqual({
    opus: { input: 3000, output: 300, cache_write: 30, cache_read: 3 },
    haiku: { input: 40, output: 4, cache_write: 0, cache_read: 0 },
  });
  // the usage of seq 9 came before the feature_opened of seq 10
  expect(s.usage.feature.get("mother")).toEqual({
    opus: { input: 2000, output: 200, cache_write: 20, cache_read: 2 },
    haiku: { input: 40, output: 4, cache_write: 0, cache_read: 0 },
  });
  const [mother, leader] = s.agents;
  expect(mother!.tokens).toBe(3333 + 44);
  expect(mother!.featureTokens).toBe(2222 + 44);
  expect(leader!.tokens).toBeNull();
  expect(leader!.featureTokens).toBeNull();
});

test("TUI-18: without an open feature the squad has no ticket, question, gate nor tokens of feature", () => {
  const s = squad([...WHOLE, { ...closed(21, 2), feature_id: 2 } as SquadEvent], NOW);
  expect(s.feature).toBeNull();
  // the one closed last is the one of the greatest closed_seq
  expect(s.lastClosed!.id).toBe(2);
  expect(s.lastClosed!.outcome).toBe("delivered");
  expect(s.planVersion).toBe(0);
  expect(s.tickets).toEqual([]);
  expect(s.questions).toEqual([]);
  expect(s.gates).toEqual([]);
  // the whole log still gives the permission request and the tokens of the session
  expect(s.permissions.map((p) => p.seq)).toEqual([20]);
  expect(s.usage.feature.size).toBe(0);
  expect(s.agents[0]!.tokens).toBe(3333 + 44);
  expect(s.agents[0]!.featureTokens).toBeNull();
  expect(s.agents.map((a) => a.status)).toEqual(["idle", "idle", "blocked", "idle", "idle", "idle"]);
});

test("TUI-18: an empty log is a squad that never entered, with no feature", () => {
  const s = squad([], NOW);
  expect(s.features).toEqual([]);
  expect(s.feature).toBeNull();
  expect(s.lastClosed).toBeNull();
  expect(s.planVersion).toBe(0);
  expect(s.agents.map((a) => a.status)).toEqual(["never", "never", "never", "never", "never", "never"]);
  expect(s.permissions).toEqual([]);
  expect(s.usage.session.size).toBe(0);
});

test("TUI-18: the same events and the same now give the same squad, and the events are not changed", () => {
  const log = structuredClone(WHOLE);
  for (const e of log) {
    Object.freeze(e);
    if (e.kind === "plan") Object.freeze(e.tickets).forEach((t) => Object.freeze(t));
  }
  Object.freeze(log);

  const first = squad(log, NOW);
  expect(squad(log, NOW)).toEqual(first);
  expect(log).toEqual(WHOLE);
  // the status depends on the now it was given, not on a clock
  expect(squad(log, NOW + 1).now).toBe(NOW + 1);
});

test("TUI-18: the events out of the order of seq give the same squad", () => {
  const expected = squad(WHOLE, NOW);
  expect(squad([...WHOLE].reverse(), NOW)).toEqual(expected);
  const odd = WHOLE.filter((e) => e.seq % 2 === 1);
  const even = WHOLE.filter((e) => e.seq % 2 === 0);
  expect(squad([...even, ...odd], NOW)).toEqual(expected);
});

test("an event of a kind the derivation does not know is ignored", () => {
  // of worker-1, after its permission request, to worker-2, with every field another rule reads
  const unknown = {
    ...event(21, { kind: "mystery", feature_id: 2, from: "worker-1", to: "worker-2", ticket_ref: "A" }),
    peer: "worker-3",
    question_id: 9,
    gate_id: 1,
    request_seq: 20,
  } as unknown as SquadEvent;
  expect(squad([...WHOLE, unknown], NOW + 500000)).toEqual(squad(WHOLE, NOW + 500000));
});
