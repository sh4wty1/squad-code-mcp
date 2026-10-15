import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import { JUDGE, LEADER, MOTHER, NOW, setup, toOthers, WORKER_1 } from "./helpers.ts";

// What the mother asks the dev in these tests, unless the test gives others
const ASKED = {
  scope: "delivery",
  summary: "deliver the importer",
  action: "merge feat/x into main",
  effect: "main gets the importer",
  commit: "abc1234",
};

type Broker = ReturnType<typeof setup>;

// A broker with a feature open, without plan
function opened() {
  const b = setup();
  const feature_id = b.openFeature();
  return { ...b, feature_id };
}

// The gate of `ASKED`, as stored
function storedGate(seq: number, feature_id: number, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "gate",
    feature_id,
    from_name: "mother",
    role_from: "mother",
    to_name: "human",
    summary: "deliver the importer",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: 1,
    data: { gate_id: 1, scope: "delivery", action: "merge feat/x into main", effect: "main gets the importer", commit: "abc1234" },
    ...fields,
  };
}

// The row of `gates` it leaves
function gateRow(id: number, feature_id: number, fields: Record<string, unknown> = {}) {
  return {
    id,
    feature_id,
    requested_by: "mother",
    scope: "delivery",
    commit: "abc1234",
    status: "pending",
    request_seq: 2,
    decision_seq: null,
    ...fields,
  };
}

// A refused /gate (GAT-08): the trace with gate as the attempted kind, no other event, no
// delivery, and `gates` as it was
function refusedGate(b: Broker, body: Record<string, unknown>, error: string, peer: Caller = MOTHER) {
  const rows = b.gateRows();
  const answer = b.refusedWith(() => b.gate.request(peer, body), peer.name, "gate", error);
  expect(b.gateRows()).toEqual(rows);
  return answer;
}

test("GAT-01: a new gate leaves a pending row of the open feature, asked by the mother, and is answered with its id and the seq", () => {
  const b = opened();
  expect(b.gate.request(MOTHER, ASKED)).toEqual({ ok: true, gate_id: 1, seq: 2 });
  expect(b.gateRows()).toEqual([gateRow(1, b.feature_id)]);
});

test("GAT-01: a gate of action without commit leaves the commit null", () => {
  const b = opened();
  const { commit, ...action } = { ...ASKED, scope: "action" };
  expect(b.gate.request(MOTHER, action)).toEqual({ ok: true, gate_id: 1, seq: 2 });
  expect(b.gateRows()).toEqual([gateRow(1, b.feature_id, { scope: "action", commit: null })]);
});

test("GAT-01: the id is the greatest of the table plus one, also over a gap and in the next feature", () => {
  const b = opened();
  expect(b.gate.request(MOTHER, ASKED)).toEqual({ ok: true, gate_id: 1, seq: 2 });
  b.db.run(
    `INSERT INTO gates (id, feature_id, requested_by, scope, status, request_seq) VALUES (7, ?, 'mother', 'action', 'approved', 2)`,
    [b.feature_id]
  );
  expect(b.gate.request(MOTHER, { ...ASKED, scope: "action" })).toEqual({ ok: true, gate_id: 8, seq: 3 });
  b.feature.close(MOTHER, { outcome: "abandoned" });
  const next = b.openFeature();
  expect(b.gate.request(MOTHER, ASKED)).toEqual({ ok: true, gate_id: 9, seq: 6 });
  expect(b.gateRows().map((g) => [g.id, g.feature_id])).toEqual([
    [1, b.feature_id],
    [7, b.feature_id],
    [8, b.feature_id],
    [9, next],
  ]);
});

test("GAT-02: the gate is stored from the mother to human, with the id in the column, an empty body and data with only the fields of the kind", () => {
  const b = opened();
  b.clock.now = NOW + 300;
  b.gate.request(MOTHER, {
    ...ASKED,
    from: "leader",
    to: "leader",
    status: "approved",
    requested_by: "judge",
    feature_id: 9,
    seq: 1,
    anything: { at: "all" },
  });
  expect(b.events()).toEqual([expect.anything(), storedGate(2, b.feature_id, { ts: NOW + 300 })]);
});

test("GAT-02: body, diffstat and ticket_ref are stored when sent, diffstat in data", () => {
  const b = opened();
  b.gate.request(MOTHER, { ...ASKED, body: "two tickets, both approved", diffstat: " a.ts | 2 +\n 1 file changed", ticket_ref: "T-1" });
  expect(b.events()[1]).toEqual(
    storedGate(2, b.feature_id, {
      body: "two tickets, both approved",
      ticket_ref: "T-1",
      data: { ...storedGate(2, b.feature_id).data, diffstat: " a.ts | 2 +\n 1 file changed" },
    })
  );
});

test("GAT-02: a gate of action without commit has no commit in data", () => {
  const b = opened();
  const { commit, ...action } = { ...ASKED, scope: "action" };
  b.gate.request(MOTHER, action);
  expect(b.events()[1]!.data).toEqual({ gate_id: 1, scope: "action", action: "merge feat/x into main", effect: "main gets the importer" });
});

test("GAT-02: a gate leaves no delivery", () => {
  const b = opened();
  b.gate.request(MOTHER, ASKED);
  b.gate.request(MOTHER, { ...ASKED, gate_id: 1 });
  expect(b.deliveries()).toEqual(toOthers(1));
});

const REQUIRED = ["scope", "summary", "action", "effect"];
for (const field of REQUIRED) {
  for (const [what, value] of [
    ["absent", undefined],
    ["null", null],
    ["a number", 1],
    ["empty", ""],
  ] as [string, unknown][]) {
    test(`GAT-03: ${field} ${what} is refused with missing_field`, () => {
      const b = opened();
      const body: Record<string, unknown> = { ...ASKED, [field]: value };
      if (value === undefined) delete body[field];
      refusedGate(b, body, "missing_field");
    });
  }
}

for (const [what, value] of [
  ["null", null],
  ["a number", 5],
  ["an object", { text: "x" }],
] as [string, unknown][]) {
  test(`GAT-03: body ${what} is refused with missing_field`, () => {
    refusedGate(opened(), { ...ASKED, body: value }, "missing_field");
  });
}

test("GAT-03: an empty body is accepted and stored empty", () => {
  const b = opened();
  expect(b.gate.request(MOTHER, { ...ASKED, body: "" })).toEqual({ ok: true, gate_id: 1, seq: 2 });
  expect(b.events()[1]!.body).toBe("");
});

for (const field of ["commit", "diffstat", "ticket_ref"]) {
  for (const [what, value] of [
    ["null", null],
    ["a number", 7],
    ["empty", ""],
  ] as [string, unknown][]) {
    test(`GAT-03: ${field} ${what} is refused with missing_field`, () => {
      refusedGate(opened(), { ...ASKED, scope: "action", [field]: value }, "missing_field");
    });
  }
}

for (const [what, value] of [
  ["null", null],
  ["a text", "1"],
  ["a fraction", 1.5],
] as [string, unknown][]) {
  test(`GAT-03: gate_id ${what} is refused with missing_field`, () => {
    const b = opened();
    b.gate.request(MOTHER, ASKED);
    refusedGate(b, { ...ASKED, gate_id: value }, "missing_field");
  });
}

test("GAT-03: a delivery gate without commit is refused with missing_field", () => {
  const { commit, ...delivery } = ASKED;
  refusedGate(opened(), delivery, "missing_field");
});

for (const scope of ["deploy", "Delivery", "actions"]) {
  test(`GAT-04: the scope "${scope}" is refused with invalid_field`, () => {
    refusedGate(opened(), { ...ASKED, scope }, "invalid_field");
  });
}

test("GAT-04: a summary of 81 characters is refused with invalid_field, and one of exactly 80 is accepted", () => {
  const b = opened();
  refusedGate(b, { ...ASKED, summary: "x".repeat(81) }, "invalid_field");
  expect(b.gate.request(MOTHER, { ...ASKED, summary: "x".repeat(80) })).toEqual({ ok: true, gate_id: 1, seq: 3 });
  expect(b.events()[2]!.summary).toBe("x".repeat(80));
});

for (const peer of [LEADER, WORKER_1, JUDGE]) {
  test(`GAT-05: a ${peer.role} that asks a gate is refused with edge_not_allowed`, () => {
    refusedGate(opened(), ASKED, "edge_not_allowed", peer);
  });
}

test("GAT-05: without an open feature a gate is refused with no_open_feature", () => {
  refusedGate(setup(), ASKED, "no_open_feature");
});

// A feature with a plan of five tickets: A approved, B dropped, and C, D and E as each test leaves them
function planned() {
  const b = opened();
  b.given.plan([
    { ticket_ref: "A", title: "the parser" },
    { ticket_ref: "B", title: "the cache", dropped: true },
    { ticket_ref: "C", title: "the writer" },
    { ticket_ref: "D", title: "the reader" },
    { ticket_ref: "E", title: "the index" },
  ]);
  b.given.verdict("A", b.given.result("A", "worker-1", b.given.task("A", "worker-1")), "approve");
  return b;
}

test("GAT-06: a delivery with tickets working, in review and escalated is refused with tickets_open, and the hint names them", () => {
  const b = planned();
  // C working, D in review, E escalated after three reworks
  b.given.task("C", "worker-1");
  b.given.result("D", "worker-2", b.given.task("D", "worker-2"));
  b.given.reworks("E", "worker-3", 3);
  const { hint } = refusedGate(b, ASKED, "tickets_open");
  expect(["A", "B", "C", "D", "E"].filter((ref) => new RegExp(`\\b${ref}\\b`).test(hint))).toEqual(["C", "D", "E"]);
});

test("GAT-06: a delivery with a planned ticket that took no task is refused with tickets_open", () => {
  const b = planned();
  for (const ref of ["C", "D"]) b.given.verdict(ref, b.given.result(ref, "worker-1", b.given.task(ref, "worker-1")), "approve");
  const { hint } = refusedGate(b, ASKED, "tickets_open");
  expect(hint).toMatch(/\bE\b/);
});

test("GAT-06: a delivery is accepted with every ticket approved or dropped, and only the latest plan counts", () => {
  const b = planned();
  for (const ref of ["C", "D"]) b.given.verdict(ref, b.given.result(ref, "worker-1", b.given.task(ref, "worker-1")), "approve");
  b.given.plan([
    { ticket_ref: "A", title: "the parser" },
    { ticket_ref: "B", title: "the cache", dropped: true },
    { ticket_ref: "C", title: "the writer" },
    { ticket_ref: "D", title: "the reader" },
    { ticket_ref: "E", title: "the index", dropped: true },
  ]);
  expect(b.gate.request(MOTHER, ASKED)).toMatchObject({ ok: true, gate_id: 1 });
});

test("GAT-06: a delivery without plan is accepted", () => {
  expect(opened().gate.request(MOTHER, ASKED)).toEqual({ ok: true, gate_id: 1, seq: 2 });
});

test("GAT-06: a gate of action is accepted with tickets open", () => {
  const b = planned();
  b.given.task("C", "worker-1");
  expect(b.gate.request(MOTHER, { ...ASKED, scope: "action" })).toMatchObject({ ok: true, gate_id: 1 });
});

// GAT-07: each pair of neighbour refusals, in a call that fails both. unknown_peer is the
// broker's, before any rule: its pair is in test/integration/gate.test.ts.
test("GAT-07: edge_not_allowed comes before missing_field", () => {
  refusedGate(opened(), {}, "edge_not_allowed", LEADER);
});

test("GAT-07: missing_field comes before invalid_field of the fields", () => {
  refusedGate(opened(), { ...ASKED, scope: "deploy", effect: "" }, "missing_field");
});

test("GAT-07: invalid_field of the fields comes before no_open_feature", () => {
  refusedGate(setup(), { ...ASKED, summary: "x".repeat(81) }, "invalid_field");
});

test("GAT-07: no_open_feature comes before invalid_field of the gate_id", () => {
  refusedGate(setup(), { ...ASKED, gate_id: 99 }, "no_open_feature");
});

test("GAT-07: invalid_field of the gate_id comes before gate_closed: an approved gate of a closed feature", () => {
  const b = opened();
  b.gate.request(MOTHER, ASKED);
  b.db.run("UPDATE gates SET status = 'approved' WHERE id = 1");
  b.feature.close(MOTHER, { outcome: "abandoned" });
  b.openFeature();
  refusedGate(b, { ...ASKED, gate_id: 1 }, "invalid_field");
});

test("GAT-07: gate_closed comes before tickets_open", () => {
  const b = planned();
  b.gate.request(MOTHER, { ...ASKED, scope: "action" });
  b.db.run("UPDATE gates SET status = 'rejected' WHERE id = 1");
  refusedGate(b, { ...ASKED, gate_id: 1 }, "gate_closed");
});

test("GAT-09: a gate_id that is the id of no gate is refused with invalid_field", () => {
  const b = opened();
  b.gate.request(MOTHER, ASKED);
  for (const gate_id of [0, 2, 99]) refusedGate(b, { ...ASKED, gate_id }, "invalid_field");
});

test("GAT-09: a gate_id of a pending gate of another feature is refused with invalid_field", () => {
  const b = opened();
  b.gate.request(MOTHER, { ...ASKED, scope: "action" });
  b.feature.close(MOTHER, { outcome: "abandoned" });
  b.openFeature();
  b.db.run("UPDATE gates SET status = 'pending' WHERE id = 1");
  refusedGate(b, { ...ASKED, gate_id: 1 }, "invalid_field");
});

test("GAT-12: asking a pending gate again records a gate with its id and updates scope, commit and request_seq of the row", () => {
  const b = opened();
  b.gate.request(MOTHER, ASKED);
  b.clock.now = NOW + 900;
  const again = { ...ASKED, gate_id: 1, summary: "deliver the importer, split", commit: "def5678", diffstat: " 1 file changed" };
  expect(b.gate.request(MOTHER, again)).toEqual({ ok: true, gate_id: 1, seq: 3 });
  expect(b.events()[2]).toEqual(
    storedGate(3, b.feature_id, {
      ts: NOW + 900,
      summary: "deliver the importer, split",
      data: { ...storedGate(2, b.feature_id).data, commit: "def5678", diffstat: " 1 file changed" },
    })
  );
  expect(b.gateRows()).toEqual([gateRow(1, b.feature_id, { commit: "def5678", request_seq: 3 })]);
});

test("GAT-12: asked again as an action without commit, the row takes the scope action and the commit null", () => {
  const b = opened();
  b.gate.request(MOTHER, ASKED);
  const { commit, ...action } = { ...ASKED, scope: "action", gate_id: 1 };
  expect(b.gate.request(MOTHER, action)).toEqual({ ok: true, gate_id: 1, seq: 3 });
  expect(b.gateRows()).toEqual([gateRow(1, b.feature_id, { scope: "action", commit: null, request_seq: 3 })]);
});

for (const status of ["approved", "rejected"]) {
  test(`GAT-13: asking again a gate ${status} is refused with gate_closed and the row does not change`, () => {
    const b = opened();
    b.gate.request(MOTHER, ASKED);
    b.db.run("UPDATE gates SET status = ?, decision_seq = 2 WHERE id = 1", [status]);
    const { hint } = refusedGate(b, { ...ASKED, gate_id: 1 }, "gate_closed");
    // The hint has the mother ask a new gate, with no gate_id
    expect(hint).toMatch(/ask a new gate/i);
    expect(hint).toContain("without gate_id");
    expect(b.gateRows()).toEqual([gateRow(1, b.feature_id, { status, decision_seq: 2 })]);
  });
}

test("GAT-14: a delivery asked again with a ticket open is refused with tickets_open", () => {
  const b = planned();
  for (const ref of ["C", "D", "E"]) b.given.verdict(ref, b.given.result(ref, "worker-1", b.given.task(ref, "worker-1")), "approve");
  b.gate.request(MOTHER, ASKED);
  b.given.verdict("C", b.given.result("C", "worker-1", b.given.task("C", "worker-1")), "rework");
  const { hint } = refusedGate(b, { ...ASKED, gate_id: 1 }, "tickets_open");
  expect(hint).toMatch(/\bC\b/);
});

test("GAT-14: a delivery asked again without commit is refused with missing_field, and one with an invalid scope with invalid_field", () => {
  const b = opened();
  b.gate.request(MOTHER, ASKED);
  const { commit, ...delivery } = { ...ASKED, gate_id: 1 };
  refusedGate(b, delivery, "missing_field");
  refusedGate(b, { ...ASKED, gate_id: 1, scope: "deploy" }, "invalid_field");
});

test("GAT-10: a failure on the row of a new gate leaves neither the row nor the event", () => {
  const b = opened();
  b.db.run("CREATE TRIGGER fail BEFORE INSERT ON gates BEGIN SELECT RAISE(ABORT, 'forced'); END");
  const events = b.events();
  expect(() => b.gate.request(MOTHER, ASKED)).toThrow("forced");
  expect(b.events()).toEqual(events);
  expect(b.gateRows()).toEqual([]);
});

test("GAT-10: a failure on the row of a gate asked again leaves the row as it was and no event", () => {
  const b = opened();
  b.gate.request(MOTHER, ASKED);
  b.db.run("CREATE TRIGGER fail BEFORE UPDATE ON gates BEGIN SELECT RAISE(ABORT, 'forced'); END");
  const events = b.events();
  expect(() => b.gate.request(MOTHER, { ...ASKED, gate_id: 1, commit: "def5678" })).toThrow("forced");
  expect(b.events()).toEqual(events);
  expect(b.gateRows()).toEqual([gateRow(1, b.feature_id)]);
});
