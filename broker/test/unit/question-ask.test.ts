import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import {
  ASKED, JUDGE, LEADER, MOTHER, NOW, questionRow, setup, storedOpened, storedQuestion, toOthers, WORKER_1, WORKER_2,
} from "./helpers.ts";

// What the mother asks the dev, with the default the squad goes on with
const TO_DEV = { ...ASKED, to: "human", blocking: false, default: "8080" };

type Broker = ReturnType<typeof setup>;

// A refused /ask (QST-09): the trace with question as the attempted kind, and `questions`
// as it was
function refusedAsk(b: Broker, peer: Caller, body: Record<string, unknown>, error: string) {
  const rows = b.questionRows();
  b.refusedWith(() => b.question.ask(peer, body), peer.name, "question", error);
  expect(b.questionRows()).toEqual(rows);
}

test("QST-01: a question to the level above leaves an open row and is answered with its id and the seq", () => {
  const b = setup();
  const id = b.openFeature();
  expect(b.question.ask(WORKER_1, ASKED)).toEqual({ ok: true, question_id: 1, seq: 2 });
  expect(b.questionRows()).toEqual([questionRow(1, id)]);
});

test("QST-01: the row keeps ticket_ref, default and timeout_s as sent", () => {
  const b = setup();
  const id = b.openFeature();
  const answer = b.question.ask(WORKER_2, { ...ASKED, blocking: false, default: "8080", timeout_s: 90, ticket_ref: "T-2" });
  expect(answer).toEqual({ ok: true, question_id: 1, seq: 2 });
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { asked_by: "worker-2", ticket_ref: "T-2", blocking: 0, default_answer: "8080", timeout_s: 90 }),
  ]);
});

test("QST-01: a blocking question may carry a default, which is kept", () => {
  const b = setup();
  const id = b.openFeature();
  expect(b.question.ask(WORKER_1, { ...ASKED, default: "8080" })).toEqual({ ok: true, question_id: 1, seq: 2 });
  expect(b.questionRows()).toEqual([questionRow(1, id, { default_answer: "8080" })]);
});

test("QST-01: the id is the greatest of the table plus one, in the feature that is open", () => {
  const b = setup();
  const first = b.openFeature();
  expect(b.question.ask(WORKER_1, ASKED)).toEqual({ ok: true, question_id: 1, seq: 2 });
  expect(b.question.ask(LEADER, { ...ASKED, to: "mother" })).toEqual({ ok: true, question_id: 2, seq: 3 });
  // a row put by hand leaves a gap: the next id counts from it, not from the number of rows
  b.db.run(
    "INSERT INTO questions (id, feature_id, asked_by, holder, blocking, status) VALUES (7, ?, 'judge', 'leader', 1, 'answered')",
    [first]
  );
  b.closeFeature();
  const second = b.openFeature();
  expect(b.question.ask(WORKER_1, ASKED)).toEqual({ ok: true, question_id: 8, seq: 6 });
  expect(b.questionRows().map((q) => [q.id, q.feature_id])).toEqual([
    [1, first],
    [2, first],
    [7, first],
    [8, second],
  ]);
});

test("QST-02: the question is stored with who asks, the id in the column and data with only the fields of the kind", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 300;
  b.question.ask(WORKER_1, {
    ...ASKED,
    from: "leader",
    role_from: "leader",
    asked_by: "mother",
    question_id: 40,
    seq: 9,
    ts: 1,
    feature_id: id + 1,
    holder: "human",
    status: "answered",
    anything: { at: "all" },
  });
  expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id, { ts: NOW + 300 })]);
});

test("QST-02: body, ticket_ref, options, default and timeout_s are stored when sent", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(JUDGE, {
    to: "worker-2",
    summary: "is the port fixed?",
    body: "the test binds 8080 and the spec says 9090",
    why: "the criterion 2 depends on it",
    blocking: false,
    options: ["8080", "9090"],
    default: "8080",
    timeout_s: 90,
    ticket_ref: "T-2",
  });
  expect(b.events()[1]).toEqual(
    storedQuestion(2, id, {
      from_name: "judge",
      role_from: "judge",
      to_name: "worker-2",
      summary: "is the port fixed?",
      body: "the test binds 8080 and the spec says 9090",
      ticket_ref: "T-2",
      data: {
        question_id: 1,
        asked_by: "judge",
        blocking: false,
        why: "the criterion 2 depends on it",
        options: ["8080", "9090"],
        default: "8080",
        timeout_s: 90,
      },
    })
  );
});

test("QST-03: a question to a peer leaves one pending delivery, for that name", () => {
  const b = setup();
  b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: 2, recipient: "leader", acked_at: null }]);
});

test("QST-03: a question to human leaves no delivery", () => {
  const b = setup();
  const id = b.openFeature();
  expect(b.question.ask(MOTHER, { ...ASKED, to: "human" })).toEqual({ ok: true, question_id: 1, seq: 2 });
  expect(b.events()[1]).toEqual(
    storedQuestion(2, id, {
      from_name: "mother",
      role_from: "mother",
      to_name: "human",
      data: { question_id: 1, asked_by: "mother", blocking: true, why: "the spec gives two" },
    })
  );
  expect(b.deliveries()).toEqual(toOthers(1));
});

test("QST-04: a non-blocking question to human gets the deadline of its timeout_s after the ts of the event", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 500;
  b.question.ask(MOTHER, { ...TO_DEV, timeout_s: 30 });
  expect(b.events()[1]!.ts).toBe(NOW + 500);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, {
      asked_by: "mother",
      holder: "human",
      blocking: 0,
      default_answer: "8080",
      timeout_s: 30,
      deadline_ts: NOW + 500 + 30000,
    }),
  ]);
});

test("QST-04: without timeout_s the deadline is 240000 ms after the event, and timeout_s stays null", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 500;
  b.question.ask(MOTHER, TO_DEV);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, {
      asked_by: "mother",
      holder: "human",
      blocking: 0,
      default_answer: "8080",
      deadline_ts: NOW + 500 + 240000,
    }),
  ]);
  expect(b.events()[1]!.data).toEqual({ question_id: 1, asked_by: "mother", blocking: false, why: "the spec gives two", default: "8080" });
});

test("QST-04: the deadline counts from the ts stored in the event, not from a later reading of the clock", () => {
  const b = setup();
  b.openFeature();
  // every reading of the clock is 7 s after the one before it
  let t = NOW;
  Object.defineProperty(b.clock, "now", { get: () => (t += 7000) });
  b.question.ask(MOTHER, TO_DEV);
  expect(b.questionRows()[0]!.deadline_ts).toBe(b.events()[1]!.ts + 240000);
});

test("QST-04: a blocking question to human and a non-blocking one to a peer have no deadline", () => {
  const b = setup();
  b.openFeature();
  b.question.ask(MOTHER, { ...ASKED, to: "human" });
  b.question.ask(WORKER_1, { ...ASKED, blocking: false, default: "8080", timeout_s: 30 });
  b.question.ask(LEADER, { ...ASKED, to: "mother", blocking: false, default: "8080" });
  expect(b.questionRows().map((q) => [q.holder, q.blocking, q.deadline_ts])).toEqual([
    ["human", 1, null],
    ["leader", 0, null],
    ["mother", 0, null],
  ]);
});

test("QST-05: to, summary or why absent, not a string, or summary or why empty, is refused with missing_field", () => {
  const b = setup();
  b.openFeature();
  for (const field of ["to", "summary", "why"]) {
    const { [field]: _, ...without } = ASKED as Record<string, unknown>;
    refusedAsk(b, WORKER_1, without, "missing_field");
    refusedAsk(b, WORKER_1, { ...ASKED, [field]: 7 }, "missing_field");
    refusedAsk(b, WORKER_1, { ...ASKED, [field]: null }, "missing_field");
    refusedAsk(b, WORKER_1, { ...ASKED, [field]: ["leader"] }, "missing_field");
  }
  refusedAsk(b, WORKER_1, { ...ASKED, summary: "" }, "missing_field");
  refusedAsk(b, WORKER_1, { ...ASKED, why: "" }, "missing_field");
});

test("QST-05: a blocking that is not a boolean is refused with missing_field", () => {
  const b = setup();
  b.openFeature();
  const { blocking, ...without } = ASKED;
  refusedAsk(b, WORKER_1, without, "missing_field");
  for (const value of ["true", 1, 0, null]) {
    refusedAsk(b, WORKER_1, { ...ASKED, blocking: value }, "missing_field");
  }
});

test("QST-05: body, options, default, timeout_s or ticket_ref present and of another type is refused with missing_field", () => {
  const b = setup();
  b.openFeature();
  for (const body of [5, null, { text: "x" }]) refusedAsk(b, WORKER_1, { ...ASKED, body }, "missing_field");
  for (const options of ["8080", null, [8080, 9090], ["8080", null], { 1: "8080" }]) {
    refusedAsk(b, WORKER_1, { ...ASKED, options }, "missing_field");
  }
  for (const value of [8080, null, ["8080"]]) refusedAsk(b, WORKER_1, { ...ASKED, default: value }, "missing_field");
  for (const timeout_s of ["30", 1.5, null, [30]]) {
    refusedAsk(b, WORKER_1, { ...ASKED, blocking: false, default: "8080", timeout_s }, "missing_field");
  }
  for (const ticket_ref of [3, null, "", ["T-1"]]) refusedAsk(b, WORKER_1, { ...ASKED, ticket_ref }, "missing_field");
});

test("QST-05: a non-blocking question without a default, or with an empty one, is refused with missing_field", () => {
  const b = setup();
  b.openFeature();
  refusedAsk(b, WORKER_1, { ...ASKED, blocking: false }, "missing_field");
  refusedAsk(b, WORKER_1, { ...ASKED, blocking: false, default: "" }, "missing_field");
  expect(b.question.ask(WORKER_1, { ...ASKED, blocking: false, default: "8080" })).toEqual({ ok: true, question_id: 1, seq: 4 });
});

test("QST-05: an empty default is refused with missing_field on a blocking question too, which takes one that is not empty", () => {
  const b = setup();
  const id = b.openFeature();
  refusedAsk(b, WORKER_1, { ...ASKED, default: "" }, "missing_field");
  refusedAsk(b, WORKER_1, { ...ASKED, blocking: true, default: "", options: ["8080", "9090"] }, "missing_field");
  expect(b.question.ask(WORKER_1, { ...ASKED, default: "8080" })).toEqual({ ok: true, question_id: 1, seq: 4 });
  expect(b.questionRows()).toEqual([questionRow(1, id, { default_answer: "8080" })]);
});

test("QST-06: a summary of more than 80 characters is refused with invalid_field, and one of 80 is stored", () => {
  const b = setup();
  const id = b.openFeature();
  refusedAsk(b, WORKER_1, { ...ASKED, summary: "x".repeat(81) }, "invalid_field");
  expect(b.question.ask(WORKER_1, { ...ASKED, summary: "x".repeat(80) })).toEqual({ ok: true, question_id: 1, seq: 3 });
  expect(b.events()[2]).toEqual(storedQuestion(3, id, { summary: "x".repeat(80) }));
});

test("QST-06: an empty list of options, or one with an empty text, is refused with invalid_field", () => {
  const b = setup();
  b.openFeature();
  refusedAsk(b, WORKER_1, { ...ASKED, options: [] }, "invalid_field");
  refusedAsk(b, WORKER_1, { ...ASKED, options: ["8080", ""] }, "invalid_field");
  refusedAsk(b, WORKER_1, { ...ASKED, options: [""] }, "invalid_field");
});

test("QST-06: a timeout_s under 1, or on a blocking question, is refused with invalid_field, and 1 is accepted", () => {
  const b = setup();
  const id = b.openFeature();
  const nonBlocking = { ...ASKED, blocking: false, default: "8080" };
  refusedAsk(b, WORKER_1, { ...nonBlocking, timeout_s: 0 }, "invalid_field");
  refusedAsk(b, WORKER_1, { ...nonBlocking, timeout_s: -30 }, "invalid_field");
  refusedAsk(b, WORKER_1, { ...ASKED, timeout_s: 30 }, "invalid_field");
  refusedAsk(b, WORKER_1, { ...ASKED, default: "8080", timeout_s: 30 }, "invalid_field");
  expect(b.question.ask(WORKER_1, { ...nonBlocking, timeout_s: 1 })).toEqual({ ok: true, question_id: 1, seq: 6 });
  expect(b.questionRows()).toEqual([questionRow(1, id, { blocking: 0, default_answer: "8080", timeout_s: 1 })]);
});

test("QST-07: a question with 4 options is refused with too_many_options, and one with 3 is accepted", () => {
  const b = setup();
  const id = b.openFeature();
  refusedAsk(b, WORKER_1, { ...ASKED, options: ["a", "b", "c", "d"] }, "too_many_options");
  expect(b.question.ask(WORKER_1, { ...ASKED, options: ["a", "b", "c"] })).toEqual({ ok: true, question_id: 1, seq: 3 });
  expect(b.questionRows()).toEqual([questionRow(1, id)]);
  expect(b.events()[2]).toEqual(
    storedQuestion(3, id, {
      data: { question_id: 1, asked_by: "worker-1", blocking: true, why: "the spec gives two", options: ["a", "b", "c"] },
    })
  );
});

test("QST-08: a recipient that is not a name of the squad nor human is refused with unknown_recipient", () => {
  const b = setup();
  b.openFeature();
  for (const to of ["*", "worker-4", "worker", "Leader", "broker", "", "nobody"]) {
    refusedAsk(b, WORKER_1, { ...ASKED, to }, "unknown_recipient");
  }
});

test("QST-08: only worker to leader, judge to worker, judge to leader, leader to mother and mother to human pass the edge", () => {
  const allowed = [
    "worker-1 leader",
    "judge worker-1",
    "judge worker-2",
    "judge worker-3",
    "judge leader",
    "leader mother",
    "mother human",
  ];
  const passed: string[] = [];
  for (const sender of [MOTHER, LEADER, JUDGE, WORKER_1]) {
    for (const to of ["mother", "leader", "judge", "worker-1", "worker-2", "worker-3", "human"]) {
      const b = setup();
      const id = b.openFeature();
      const pair = `${sender.name} ${to}`;
      if (!allowed.includes(pair)) {
        refusedAsk(b, sender, { ...ASKED, to }, "edge_not_allowed");
        continue;
      }
      expect(b.question.ask(sender, { ...ASKED, to })).toEqual({ ok: true, question_id: 1, seq: 2 });
      expect(b.questionRows()).toEqual([questionRow(1, id, { asked_by: sender.name, holder: to })]);
      passed.push(pair);
    }
  }
  expect(passed.sort()).toEqual([...allowed].sort());
});

test("QST-08: without an open feature a question is refused with no_open_feature", () => {
  const b = setup();
  refusedAsk(b, WORKER_1, ASKED, "no_open_feature");
  b.openFeature();
  b.closeFeature();
  refusedAsk(b, MOTHER, { ...ASKED, to: "human" }, "no_open_feature");
});

test("QST-09: a refused /ask leaves a refused with question as the attempted kind, and no row, no other event and no delivery", () => {
  const b = setup();
  const id = b.openFeature();
  refusedAsk(b, WORKER_2, { ...ASKED, to: "mother" }, "edge_not_allowed");
  expect(b.events()).toEqual([
    storedOpened(1, id),
    {
      seq: 2,
      ts: NOW,
      kind: "refused",
      feature_id: id,
      from_name: "broker",
      role_from: "broker",
      to_name: null,
      summary: "",
      body: "",
      ticket_ref: null,
      question_id: null,
      gate_id: null,
      data: { peer: "worker-2", attempted_kind: "question", error: "edge_not_allowed" },
    },
  ]);
  expect(b.questionRows()).toEqual([]);
  expect(b.deliveries()).toEqual(toOthers(1));
});

test("QST-10: missing_field comes before invalid_field", () => {
  const b = setup();
  const { why, ...noWhy } = ASKED;
  refusedAsk(b, WORKER_1, { ...noWhy, summary: "x".repeat(81) }, "missing_field");
});

test("QST-10: invalid_field comes before too_many_options", () => {
  const b = setup();
  refusedAsk(b, WORKER_1, { ...ASKED, options: ["a", "b", "c", ""] }, "invalid_field");
  refusedAsk(b, WORKER_1, { ...ASKED, summary: "x".repeat(81), options: ["a", "b", "c", "d"] }, "invalid_field");
});

test("QST-10: too_many_options comes before unknown_recipient", () => {
  const b = setup();
  refusedAsk(b, WORKER_1, { ...ASKED, to: "nobody", options: ["a", "b", "c", "d"] }, "too_many_options");
});

test("QST-10: unknown_recipient comes before edge_not_allowed", () => {
  const b = setup();
  refusedAsk(b, WORKER_1, { ...ASKED, to: "nobody" }, "unknown_recipient");
});

test("QST-10: edge_not_allowed comes before no_open_feature", () => {
  const b = setup();
  refusedAsk(b, WORKER_1, { ...ASKED, to: "mother" }, "edge_not_allowed");
});

for (const table of ["questions", "events", "deliveries"]) {
  test(`QST-12: when the write in ${table} fails, the question leaves no row, no event and no delivery`, () => {
    const b = setup();
    const id = b.openFeature();
    b.db.run(`CREATE TRIGGER broken BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'the disk is full'); END`);
    expect(() => b.question.ask(WORKER_1, ASKED)).toThrow("the disk is full");
    expect(b.questionRows()).toEqual([]);
    expect(b.events()).toEqual([storedOpened(1, id)]);
    expect(b.deliveries()).toEqual(toOthers(1));
  });
}

test("QST-94: a question to a peer that is not registered is stored, and its delivery waits for a session of that name", () => {
  const b = setup();
  const id = b.openFeature();
  expect(b.rows()).toEqual([]);
  expect(b.question.ask(WORKER_1, ASKED)).toEqual({ ok: true, question_id: 1, seq: 2 });
  expect(b.events()).toEqual([storedOpened(1, id), storedQuestion(2, id)]);
  expect(b.questionRows()).toEqual([questionRow(1, id)]);
  expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: 2, recipient: "leader", acked_at: null }]);
  b.join("leader", "leader", 11);
  expect(b.log.pending("leader").map((e) => e.seq)).toEqual([1, 2]);
});
