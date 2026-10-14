import { expect, test } from "bun:test";
import { HUMAN_TOKEN, MOTHER, NOW, setup, toOthers } from "./helpers.ts";

const ASKED = { scope: "action", summary: "drop the old table", action: "DROP TABLE legacy", effect: "the rows of legacy are gone" };

type Broker = ReturnType<typeof setup>;

// A broker with the gate 1 of the mother pending, asked in the event 2
function pending() {
  const b = setup();
  const feature_id = b.openFeature();
  b.gate.request(MOTHER, ASKED);
  return { ...b, feature_id };
}

function decide(b: Broker, decision: unknown, fields: Record<string, unknown> = {}) {
  return b.gate.decide({ human_token: HUMAN_TOKEN, gate_id: 1, decision, ...fields });
}

// The decision of the dev on the gate 1, as stored
function storedDecision(seq: number, feature_id: number, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "gate_decision",
    feature_id,
    from_name: "human",
    role_from: "human",
    to_name: "mother",
    summary: "G-01 aprovado",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: 1,
    data: { gate_id: 1, decision: "approve" },
    ...fields,
  };
}

function gateRow(fields: Record<string, unknown> = {}) {
  return {
    id: 1,
    feature_id: 1,
    requested_by: "mother",
    scope: "action",
    commit: null,
    status: "pending",
    request_seq: 2,
    decision_seq: null,
    ...fields,
  };
}

// A refused decision (GAT-20): the refusal with a hint, and the log, the deliveries and
// `gates` as they were. The human is not a peer: no `refused`.
function refusedDecision(b: Broker, body: Record<string, unknown>, error: string) {
  const events = b.events();
  const deliveries = b.deliveries();
  const rows = b.gateRows();
  const answer = b.gate.decide(body) as { ok: boolean; error: string; hint: string };
  expect({ ...answer, hint: typeof answer.hint }).toEqual({ ok: false, error, hint: "string" });
  expect(answer.hint).not.toBe("");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.gateRows()).toEqual(rows);
}

const valid = (fields: Record<string, unknown>): Record<string, unknown> => ({ human_token: HUMAN_TOKEN, gate_id: 1, decision: "approve", ...fields });

test("GAT-15: approve is stored from human to who asked, with the id in the column, and the row is approved by its seq", () => {
  const b = pending();
  b.clock.now = NOW + 4000;
  const answer = decide(b, "approve", {
    id: "the-id-of-a-peer",
    from: "mother",
    to: "leader",
    summary: "s",
    body: "b",
    ticket_ref: "T-9",
    status: "rejected",
  });
  expect(answer).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(storedDecision(3, b.feature_id, { ts: NOW + 4000 }));
  expect(b.gateRows()).toEqual([gateRow({ status: "approved", decision_seq: 3 })]);
});

test("GAT-15/19: approve with a text keeps it in data and in the body, and the summary is only G-NN aprovado", () => {
  const b = pending();
  expect(decide(b, "approve", { text: "go ahead" })).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(
    storedDecision(3, b.feature_id, { body: "go ahead", data: { gate_id: 1, decision: "approve", text: "go ahead" } })
  );
});

test("GAT-15: approve with an empty text is accepted and the text is kept empty", () => {
  const b = pending();
  expect(decide(b, "approve", { text: "" })).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(storedDecision(3, b.feature_id, { data: { gate_id: 1, decision: "approve", text: "" } }));
  expect(b.gateRows()).toEqual([gateRow({ status: "approved", decision_seq: 3 })]);
});

test("GAT-16/19: reject with a text is stored and the row is rejected by its seq", () => {
  const b = pending();
  expect(decide(b, "reject", { text: "not now" })).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(
    storedDecision(3, b.feature_id, {
      summary: "G-01 rejeitado: not now",
      body: "not now",
      data: { gate_id: 1, decision: "reject", text: "not now" },
    })
  );
  expect(b.gateRows()).toEqual([gateRow({ status: "rejected", decision_seq: 3 })]);
});

test("GAT-17/19: comment is stored and the row does not change: pending, with decision_seq null", () => {
  const b = pending();
  expect(decide(b, "comment", { text: "split it in two" })).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(
    storedDecision(3, b.feature_id, {
      summary: "G-01 comentado: split it in two",
      body: "split it in two",
      data: { gate_id: 1, decision: "comment", text: "split it in two" },
    })
  );
  expect(b.gateRows()).toEqual([gateRow()]);
});

for (const [decision, text] of [
  ["approve", undefined],
  ["reject", "no"],
  ["comment", "why?"],
] as [string, string | undefined][]) {
  test(`GAT-18: a ${decision} leaves one pending delivery, for who asked the gate`, () => {
    const b = pending();
    decide(b, decision, text === undefined ? {} : { text });
    expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: 3, recipient: "mother", acked_at: null }]);
  });
}

test("GAT-19: the summary is cut at 80 characters, and one of exactly 80 is whole", () => {
  const b = pending();
  // "G-01 comentado: " has 16 characters
  const exact = "x".repeat(64);
  decide(b, "comment", { text: exact });
  expect(b.events()[2]!.summary).toBe(`G-01 comentado: ${exact}`);
  expect(b.events()[2]!.summary).toHaveLength(80);
  const long = "y".repeat(70);
  decide(b, "reject", { text: long });
  expect(b.events()[3]!.summary).toBe(`G-01 rejeitado: ${long}`.slice(0, 80));
  expect(b.events()[3]!.summary).toHaveLength(80);
  expect(b.events()[3]!.body).toBe(long);
});

test("GAT-19: the label has the id with two digits", () => {
  const b = pending();
  b.db.run("UPDATE gates SET id = 12 WHERE id = 1");
  expect(b.gate.decide(valid({ gate_id: 12 }))).toEqual({ ok: true, seq: 3 });
  expect([b.events()[2]!.summary, b.events()[2]!.gate_id]).toEqual(["G-12 aprovado", 12]);
});

for (const [what, human_token] of [
  ["a wrong", "not-the-token"],
  ["an absent", undefined],
  ["a null", null],
] as [string, unknown][]) {
  test(`GAT-20: ${what} human_token is refused with invalid_token and nothing is recorded`, () => {
    const b = pending();
    const body: Record<string, unknown> = valid({ human_token });
    if (human_token === undefined) delete body.human_token;
    refusedDecision(b, body, "invalid_token");
  });
}

for (const [what, fields] of [
  ["gate_id absent", { gate_id: undefined }],
  ["gate_id null", { gate_id: null }],
  ["gate_id as a text", { gate_id: "1" }],
  ["gate_id a fraction", { gate_id: 1.5 }],
  ["decision absent", { decision: undefined }],
  ["decision null", { decision: null }],
  ["decision a number", { decision: 1 }],
  ["text null on approve", { text: null }],
  ["text a number on approve", { text: 5 }],
] as [string, Record<string, unknown>][]) {
  test(`GAT-21: ${what} is refused with missing_field`, () => {
    const body = valid(fields);
    for (const key of Object.keys(fields)) if (fields[key] === undefined) delete body[key];
    refusedDecision(pending(), body, "missing_field");
  });
}

for (const decision of ["reject", "comment"]) {
  for (const [what, text] of [
    ["absent", undefined],
    ["null", null],
    ["empty", ""],
    ["only spaces", "   "],
  ] as [string, unknown][]) {
    test(`GAT-21: ${decision} with the text ${what} is refused with missing_field`, () => {
      const body = valid({ decision, text });
      if (text === undefined) delete body.text;
      refusedDecision(pending(), body, "missing_field");
    });
  }
}

for (const decision of ["approved", "APPROVE", "deny", ""]) {
  test(`GAT-22: the decision "${decision}" is refused with invalid_field`, () => {
    refusedDecision(pending(), valid({ decision, text: "x" }), "invalid_field");
  });
}

test("GAT-22: a gate_id that is the id of no row is refused with invalid_field", () => {
  const b = pending();
  for (const gate_id of [0, 2, 99]) refusedDecision(b, valid({ gate_id }), "invalid_field");
});

test("GAT-23/24: after an approve, a second approve, a reject and a comment are refused with gate_closed", () => {
  const b = pending();
  expect(decide(b, "approve")).toEqual({ ok: true, seq: 3 });
  refusedDecision(b, valid({}), "gate_closed");
  refusedDecision(b, valid({ decision: "reject", text: "no" }), "gate_closed");
  refusedDecision(b, valid({ decision: "comment", text: "and?" }), "gate_closed");
  expect(b.gateRows()).toEqual([gateRow({ status: "approved", decision_seq: 3 })]);
  expect(b.events().filter((e) => e.kind === "gate_decision")).toHaveLength(1);
});

test("GAT-23/24: after a reject, an approve is refused with gate_closed", () => {
  const b = pending();
  decide(b, "reject", { text: "no" });
  refusedDecision(b, valid({}), "gate_closed");
  expect(b.gateRows()).toEqual([gateRow({ status: "rejected", decision_seq: 3 })]);
});

test("GAT-17/24: comments leave the gate pending, and an approve after them decides it", () => {
  const b = pending();
  expect(decide(b, "comment", { text: "split it" })).toEqual({ ok: true, seq: 3 });
  expect(decide(b, "comment", { text: "and the tests" })).toEqual({ ok: true, seq: 4 });
  expect(decide(b, "approve")).toEqual({ ok: true, seq: 5 });
  expect(b.gateRows()).toEqual([gateRow({ status: "approved", decision_seq: 5 })]);
});

for (const outcome of ["delivered", "abandoned"]) {
  test(`GAT-23: a gate of a feature closed as ${outcome} is refused with gate_closed in the three decisions`, () => {
    const b = pending();
    if (outcome === "delivered") {
      b.gate.request(MOTHER, { ...ASKED, scope: "delivery", commit: "abc1234" });
      decide(b, "approve", { gate_id: 2 });
    }
    b.feature.close(MOTHER, { outcome });
    for (const fields of [{}, { decision: "reject", text: "no" }, { decision: "comment", text: "and?" }]) {
      refusedDecision(b, valid(fields), "gate_closed");
    }
  });
}

test("GAT-25: invalid_token comes before missing_field", () => {
  refusedDecision(pending(), { human_token: "wrong", gate_id: "1" }, "invalid_token");
});

test("GAT-25: missing_field comes before invalid_field", () => {
  refusedDecision(pending(), valid({ gate_id: 99, decision: "reject" }), "missing_field");
  refusedDecision(pending(), valid({ gate_id: "99", decision: "bogus" }), "missing_field");
});

test("GAT-25: invalid_field comes before gate_closed", () => {
  const b = pending();
  decide(b, "approve");
  refusedDecision(b, valid({ decision: "bogus" }), "invalid_field");
});

test("GAT-10: a failure on the delivery leaves neither the event nor the change of the row", () => {
  const b = pending();
  b.db.run("CREATE TRIGGER fail BEFORE INSERT ON deliveries BEGIN SELECT RAISE(ABORT, 'forced'); END");
  const events = b.events();
  expect(() => decide(b, "approve")).toThrow("forced");
  expect(b.events()).toEqual(events);
  expect(b.gateRows()).toEqual([gateRow()]);
});

test("GAT-10: a failure on the row leaves neither the event nor its delivery", () => {
  const b = pending();
  b.db.run("CREATE TRIGGER fail BEFORE UPDATE ON gates BEGIN SELECT RAISE(ABORT, 'forced'); END");
  const events = b.events();
  const deliveries = b.deliveries();
  expect(() => decide(b, "reject", { text: "no" })).toThrow("forced");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.gateRows()).toEqual([gateRow()]);
});
