import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { gates, type Gate } from "../../shared/derive.ts";

const T0 = 1791331200000;

// An event of the feature 1 in the read format, `seq` seconds after T0
function event(seq: number, fields: Record<string, unknown>): SquadEvent {
  return {
    seq,
    ts: T0 + seq * 1000,
    feature_id: 1,
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    ...fields,
  } as SquadEvent;
}

// The version `n` of the gate `id`: its summary, body and diffstat say which version it is
function gate(seq: number, id: number, n: number, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, {
    kind: "gate",
    from: "mother",
    role_from: "mother",
    to: "human",
    summary: `deliver v${n}`,
    body: `what changed in v${n}`,
    gate_id: id,
    scope: "delivery",
    commit: `c0mm1t${n}`,
    action: `merge v${n}`,
    effect: `develop gets v${n}`,
    diffstat: ` broker/gate.ts | ${n} +\n ${n} file changed`,
    ...fields,
  });
}

function decision(seq: number, id: number, decision: string, text?: string): SquadEvent {
  return event(seq, {
    kind: "gate_decision",
    from: "human",
    role_from: "human",
    to: "mother",
    summary: decision,
    body: text ?? "",
    gate_id: id,
    decision,
    ...(text !== undefined && { text }),
  });
}

function closed(seq: number, outcome = "abandoned"): SquadEvent {
  return event(seq, { kind: "feature_closed", from: "mother", role_from: "mother", to: "*", outcome });
}

// The gate 1 pending at the version `n`, whose latest gate is the event `seq`, the first one the event 2
function pendingAt(n: number, seq: number, fields: Partial<Gate> = {}): Gate {
  return {
    id: 1,
    requested_by: "mother",
    scope: "delivery",
    commit: `c0mm1t${n}`,
    status: "pending",
    pending: true,
    request_seq: seq,
    decision_seq: null,
    decision: null,
    version: n,
    summary: `deliver v${n}`,
    body: `what changed in v${n}`,
    action: `merge v${n}`,
    effect: `develop gets v${n}`,
    diffstat: ` broker/gate.ts | ${n} +\n ${n} file changed`,
    previous: n === 1 ? null : ` broker/gate.ts | ${n - 1} +\n ${n - 1} file changed`,
    first_ts: T0 + 2000,
    ts: T0 + seq * 1000,
    comment: null,
    text: null,
    ...fields,
  };
}

test("GAT-31: a gate with one version has its fields, no previous diffstat, no comment and no decision", () => {
  expect(gates([gate(2, 1, 1)])).toEqual([pendingAt(1, 2)]);
});

test("GAT-31: with two and three versions the fields are those of the latest, the diffstat before it is the previous, and first_ts stays", () => {
  expect(gates([gate(2, 1, 1), gate(4, 1, 2)])).toEqual([pendingAt(2, 4)]);
  expect(gates([gate(2, 1, 1), gate(4, 1, 2), gate(7, 1, 3)])).toEqual([pendingAt(3, 7)]);
});

test("GAT-31: a version without commit and diffstat has them null, and the next one has null as the previous diffstat", () => {
  const action = gate(4, 1, 2, { scope: "action", commit: undefined, diffstat: undefined });
  expect(gates([gate(2, 1, 1), action])).toEqual([
    pendingAt(2, 4, { scope: "action", commit: null, diffstat: null }),
  ]);
  expect(gates([gate(2, 1, 1), action, gate(6, 1, 3)])).toEqual([pendingAt(3, 6, { previous: null })]);
});

test("GAT-31: without a comment it is null; with two, the latest one counts, with its text and ts", () => {
  expect(gates([gate(2, 1, 1), decision(3, 1, "comment", "split it"), gate(4, 1, 2)])).toEqual([
    pendingAt(2, 4, { comment: { text: "split it", ts: T0 + 3000 } }),
  ]);
  expect(
    gates([gate(2, 1, 1), decision(3, 1, "comment", "split it"), gate(4, 1, 2), decision(5, 1, "comment", "now the tests")])
  ).toEqual([pendingAt(2, 4, { comment: { text: "now the tests", ts: T0 + 5000 } })]);
});

test("GAT-30/31: approve after a comment decides it, with the seq and the text of the decision", () => {
  const log = [gate(2, 1, 1), decision(3, 1, "comment", "split it"), gate(4, 1, 2), decision(5, 1, "approve", "go")];
  expect(gates(log)).toEqual([
    pendingAt(2, 4, {
      status: "approved",
      pending: false,
      decision_seq: 5,
      decision: "approve",
      comment: { text: "split it", ts: T0 + 3000 },
      text: "go",
    }),
  ]);
});

test("GAT-30/31: an approve without text has the text null", () => {
  expect(gates([gate(2, 1, 1), decision(3, 1, "approve")])).toEqual([
    pendingAt(1, 2, { status: "approved", pending: false, decision_seq: 3, decision: "approve" }),
  ]);
});

test("GAT-30/31: reject decides it as rejected with its text", () => {
  expect(gates([gate(2, 1, 1), decision(3, 1, "reject", "not now")])).toEqual([
    pendingAt(1, 2, { status: "rejected", pending: false, decision_seq: 3, decision: "reject", text: "not now" }),
  ]);
});

test("GAT-30: a reject after an approve does not count, nor a comment after it", () => {
  const log = [gate(2, 1, 1), decision(3, 1, "approve"), decision(4, 1, "reject", "too late"), decision(5, 1, "comment", "late")];
  expect(gates(log)).toEqual([
    pendingAt(1, 2, { status: "approved", pending: false, decision_seq: 3, decision: "approve" }),
  ]);
});

test("GAT-30: each gate is decided by the decisions of its own gate_id, in the order they were asked", () => {
  const two = gate(3, 2, 1, { summary: "drop the table" });
  const all = gates([decision(5, 2, "reject", "no"), two, gate(2, 1, 1)]);
  expect(all.map((g) => [g.id, g.status, g.decision_seq, g.request_seq])).toEqual([
    [1, "pending", null, 2],
    [2, "rejected", 5, 3],
  ]);
});

for (const outcome of ["delivered", "abandoned"]) {
  test(`GAT-32: a pending gate of a feature with a feature_closed ${outcome} is rejected without decision_seq`, () => {
    expect(gates([gate(2, 1, 1), decision(3, 1, "comment", "split it"), closed(4, outcome)])).toEqual([
      pendingAt(1, 2, { status: "rejected", pending: false, comment: { text: "split it", ts: T0 + 3000 } }),
    ]);
  });
}

test("GAT-32: a gate decided before the feature_closed keeps its decision, and a decision after it does not count", () => {
  const log = [gate(2, 1, 1), gate(3, 2, 1, { scope: "action" }), decision(4, 1, "approve"), closed(5, "delivered"), decision(6, 2, "approve")];
  expect(gates(log).map((g) => [g.id, g.status, g.pending, g.decision_seq, g.decision])).toEqual([
    [1, "approved", false, 4, "approve"],
    [2, "rejected", false, null, null],
  ]);
});

test("GAT-33: pending is true only for the gate whose status is pending", () => {
  const log = [gate(2, 1, 1), gate(3, 2, 1), gate(4, 3, 1), decision(5, 1, "approve"), decision(6, 2, "reject", "no"), decision(7, 3, "comment", "and?")];
  expect(gates(log).map((g) => [g.id, g.status, g.pending])).toEqual([
    [1, "approved", false],
    [2, "rejected", false],
    [3, "pending", true],
  ]);
  expect(gates([...log, closed(8)]).map((g) => [g.id, g.status, g.pending])).toEqual([
    [1, "approved", false],
    [2, "rejected", false],
    [3, "rejected", false],
  ]);
});
