import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import { JUDGE, LEADER, MOTHER, NOW, setup, WORKER_1 } from "./helpers.ts";

const KICKOFF = { kind: "task", to: "leader", summary: "build the importer", body: "the whole brief" };
const BATCH = { kind: "result", to: "mother", summary: "the batch is done", body: "three tickets approved" };

// A stored event, with the columns a /send of the mother to the leader leaves by default
function stored(seq: number, feature_id: number | null, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "task",
    feature_id,
    from_name: "mother",
    role_from: "mother",
    to_name: "leader",
    summary: "build the importer",
    body: "the whole brief",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: {},
    ...fields,
  };
}

test("EVT-01: a task of the mother to the leader is stored with its envelope and answered with its seq", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 700;
  const answer = b.send(MOTHER, KICKOFF);
  expect(answer).toEqual({ ok: true, seq: 1 });
  expect(b.events()).toEqual([stored(1, id, { ts: NOW + 700 })]);
  expect(b.deliveries()).toEqual([{ event_seq: 1, recipient: "leader", acked_at: null }]);
});

test("EVT-01: a result of the leader to the mother is stored with its envelope and answered with its seq", () => {
  const b = setup();
  const id = b.openFeature();
  b.send(MOTHER, KICKOFF);
  const answer = b.send(LEADER, BATCH);
  expect(answer).toEqual({ ok: true, seq: 2 });
  expect(b.events()[1]).toEqual(
    stored(2, id, {
      kind: "result",
      from_name: "leader",
      role_from: "leader",
      to_name: "mother",
      summary: "the batch is done",
      body: "three tickets approved",
    })
  );
  expect(b.deliveries()[1]).toEqual({ event_seq: 2, recipient: "mother", acked_at: null });
});

test("EVT-01: an absent body is stored empty and an absent ticket_ref null", () => {
  const b = setup();
  const id = b.openFeature();
  expect(b.send(MOTHER, { kind: "task", to: "leader", summary: "go" })).toEqual({ ok: true, seq: 1 });
  expect(b.send(MOTHER, { kind: "task", to: "leader", summary: "go on", body: "", ticket_ref: null })).toEqual({
    ok: true,
    seq: 2,
  });
  expect(b.events()).toEqual([
    stored(1, id, { summary: "go", body: "" }),
    stored(2, id, { summary: "go on", body: "" }),
  ]);
});

test("EVT-01: data holds only the fields of the kind, and these two edges have none", () => {
  const b = setup();
  const id = b.openFeature();
  const extra = { loadout: ["tdd"], criteria: [1], task_seq: 1, branch: "b", commit: "c", anything: { at: "all" } };
  expect(b.send(MOTHER, { ...KICKOFF, ...extra })).toEqual({ ok: true, seq: 1 });
  expect(b.send(LEADER, { ...BATCH, ...extra })).toEqual({ ok: true, seq: 2 });
  expect(b.events().map((e) => e.data)).toEqual([{}, {}]);
  expect(b.events()[0]).toEqual(stored(1, id));
});

test("EVT-02: from, role_from, seq, ts and feature_id of the body are ignored: the broker stamps its own", () => {
  const b = setup();
  b.closeFeature(b.openFeature());
  const id = b.openFeature();
  b.send(MOTHER, KICKOFF);
  b.clock.now = NOW + 60;
  const answer = b.send(LEADER, {
    ...BATCH,
    from: "worker-2",
    from_name: "worker-2",
    role_from: "worker",
    seq: 900,
    ts: 5,
    feature_id: id - 1,
  });
  expect(answer).toEqual({ ok: true, seq: 2 });
  expect(b.events()[1]).toEqual(
    stored(2, id, {
      ts: NOW + 60,
      kind: "result",
      from_name: "leader",
      role_from: "leader",
      to_name: "mother",
      summary: "the batch is done",
      body: "three tickets approved",
    })
  );
});

test("EVT-04: kind or to absent or not a string is refused with missing_field", () => {
  const b = setup();
  b.openFeature();
  const { kind, ...noKind } = KICKOFF;
  const { to, ...noTo } = KICKOFF;
  b.refusedWith(() => b.send(MOTHER, noKind), "mother", "", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind: 7 }), "mother", "", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind: null }), "mother", "", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind: ["task"] }), "mother", "", "missing_field");
  b.refusedWith(() => b.send(MOTHER, noTo), "mother", "task", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, to: 3 }), "mother", "task", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, to: null }), "mother", "task", "missing_field");
  expect(b.events().map((e) => e.kind)).toEqual(Array(7).fill("refused"));
});

test("EVT-04: summary absent, not a string or empty is refused with missing_field", () => {
  const b = setup();
  b.openFeature();
  const { summary, ...noSummary } = KICKOFF;
  b.refusedWith(() => b.send(MOTHER, noSummary), "mother", "task", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, summary: 12 }), "mother", "task", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, summary: null }), "mother", "task", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, summary: "" }), "mother", "task", "missing_field");
});

test("EVT-04: a body that is present and not a string is refused with missing_field", () => {
  const b = setup();
  b.openFeature();
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, body: 5 }), "mother", "task", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, body: { text: "x" } }), "mother", "task", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, body: null }), "mother", "task", "missing_field");
});

test("EVT-05: a kind that is not task, result or verdict is refused with invalid_kind", () => {
  const b = setup();
  b.openFeature();
  for (const kind of ["question", "answer", "gate", "plan", "blocked", "refused", "peer_joined", "nonsense", "", "Task"]) {
    b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind }), "mother", kind, "invalid_kind");
  }
});

test("EVT-05: the hint of invalid_kind points to the route of a kind that has one", () => {
  const b = setup();
  const routes = {
    plan: "/plan",
    blocked: "/blocked",
    unblocked: "/unblocked",
    usage: "/usage",
    turn_started: "/turn-started",
    permission_request: "/permission-request",
    permission_decision: "/permission-decision",
  };
  for (const [kind, route] of Object.entries(routes)) {
    const answer = b.refusedWith(() => b.send(LEADER, { ...KICKOFF, kind }), "leader", kind, "invalid_kind");
    expect(answer.hint).toContain(route);
  }
});

test("EVT-06: a summary of more than 80 characters is refused with invalid_field, and one of 80 is stored", () => {
  const b = setup();
  const id = b.openFeature();
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, summary: "x".repeat(81) }), "mother", "task", "invalid_field");
  expect(b.send(MOTHER, { ...KICKOFF, summary: "x".repeat(80) })).toEqual({ ok: true, seq: 2 });
  expect(b.events()[1]).toEqual(stored(2, id, { summary: "x".repeat(80) }));
});

test("EVT-07: a recipient that is not a name of the squad nor human is refused with unknown_recipient", () => {
  const b = setup();
  b.openFeature();
  for (const to of ["*", "worker-4", "worker", "Leader", "broker", "", "nobody"]) {
    b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, to }), "mother", "task", "unknown_recipient");
  }
});

test("EVT-07: the six names of the squad and human are known recipients", () => {
  const b = setup();
  b.openFeature();
  // known, and a task of the mother only goes to the leader
  for (const to of ["mother", "judge", "worker-1", "worker-2", "worker-3", "human"]) {
    b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, to }), "mother", "task", "edge_not_allowed");
  }
  expect(b.send(MOTHER, KICKOFF)).toEqual({ ok: true, seq: 7 });
});

test("EVT-08: only the five trios of kind, sender and recipient pass the edge", () => {
  const allowed = [
    "task mother leader",
    "task leader worker-1",
    "task leader worker-2",
    "task leader worker-3",
    "result worker-1 judge",
    "result leader mother",
    "verdict judge leader",
  ];
  const passed: string[] = [];
  const senders: Caller[] = [MOTHER, LEADER, JUDGE, WORKER_1];
  for (const kind of ["task", "result", "verdict"]) {
    for (const sender of senders) {
      for (const to of ["mother", "leader", "judge", "worker-1", "worker-2", "worker-3", "human"]) {
        // No feature is open: a trio that passes the edge stops at the rule after it
        const b = setup();
        const trio = `${kind} ${sender.name} ${to}`;
        const error = allowed.includes(trio) ? "no_open_feature" : "edge_not_allowed";
        b.refusedWith(() => b.send(sender, { kind, to, summary: "s" }), sender.name, kind, error);
        if (error === "no_open_feature") passed.push(trio);
      }
    }
  }
  expect(passed.sort()).toEqual([...allowed].sort());
});

test("EVT-09: without an open feature a send is refused with no_open_feature", () => {
  const b = setup();
  b.refusedWith(() => b.send(MOTHER, KICKOFF), "mother", "task", "no_open_feature");
  b.closeFeature(b.openFeature());
  b.refusedWith(() => b.send(LEADER, BATCH), "leader", "result", "no_open_feature");
  expect(b.events().map((e) => e.feature_id)).toEqual([null, null]);
});

test("EVT-10: a missing field of the envelope comes before invalid_kind", () => {
  const b = setup();
  b.refusedWith(() => b.send(WORKER_1, { kind: "question", to: "leader" }), "worker-1", "question", "missing_field");
  b.refusedWith(
    () => b.send(WORKER_1, { kind: "question", to: "leader", summary: "s", body: 1 }),
    "worker-1",
    "question",
    "missing_field"
  );
});

test("EVT-10: invalid_kind comes before the invalid_field of the summary", () => {
  const b = setup();
  b.refusedWith(
    () => b.send(WORKER_1, { kind: "question", to: "nobody", summary: "x".repeat(81) }),
    "worker-1",
    "question",
    "invalid_kind"
  );
});

test("EVT-10: the invalid_field of the summary comes before unknown_recipient", () => {
  const b = setup();
  b.refusedWith(
    () => b.send(WORKER_1, { kind: "task", to: "nobody", summary: "x".repeat(81) }),
    "worker-1",
    "task",
    "invalid_field"
  );
});

test("EVT-10: unknown_recipient comes before edge_not_allowed", () => {
  const b = setup();
  b.refusedWith(() => b.send(WORKER_1, { kind: "task", to: "nobody", summary: "s" }), "worker-1", "task", "unknown_recipient");
});

test("EVT-10: edge_not_allowed comes before no_open_feature", () => {
  const b = setup();
  b.refusedWith(() => b.send(WORKER_1, { kind: "task", to: "leader", summary: "s" }), "worker-1", "task", "edge_not_allowed");
});

test("EVT-10: no_open_feature comes before the invalid_field of the fields of the kind", () => {
  const b = setup();
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, ticket_ref: "T-1" }), "mother", "task", "no_open_feature");
});

test("EVT-13: a send to a name of the squad with no registered session is stored", () => {
  const b = setup();
  const id = b.openFeature();
  expect(b.rows()).toEqual([]);
  expect(b.send(MOTHER, KICKOFF)).toEqual({ ok: true, seq: 1 });
  expect(b.events()).toEqual([stored(1, id)]);
  expect(b.log.pending("leader").map((e) => e.seq)).toEqual([1]);
});

test("EVT-26: a task of the mother to the leader with a ticket_ref is refused with invalid_field", () => {
  const b = setup();
  b.openFeature();
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, ticket_ref: "T-1" }), "mother", "task", "invalid_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, ticket_ref: "" }), "mother", "task", "invalid_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, ticket_ref: 4 }), "mother", "task", "invalid_field");
});

test("EVT-26: a result of the leader to the mother with a ticket_ref is refused with invalid_field", () => {
  const b = setup();
  b.openFeature();
  b.refusedWith(() => b.send(LEADER, { ...BATCH, ticket_ref: "T-1" }), "leader", "result", "invalid_field");
});

test("EVT-48: the refused keeps a kind of up to 40 characters, and is empty for a longer one or one that is not a string", () => {
  const b = setup();
  b.openFeature();
  const kept = "k".repeat(40);
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind: kept }), "mother", kept, "invalid_kind");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind: "k".repeat(41) }), "mother", "", "invalid_kind");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind: 40 }), "mother", "", "missing_field");
  b.refusedWith(() => b.send(MOTHER, { ...KICKOFF, kind: { kind: "task" } }), "mother", "", "missing_field");
  // a refusal of any other rule keeps the kind received too
  b.refusedWith(() => b.send(JUDGE, { ...KICKOFF, kind: "result" }), "judge", "result", "edge_not_allowed");
});
