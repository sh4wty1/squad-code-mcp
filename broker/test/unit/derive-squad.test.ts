import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { blocks, gates, openPermissions, presence, questions, SQUAD, usageTotals } from "../../shared/derive.ts";

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
