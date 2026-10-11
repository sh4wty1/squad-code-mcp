import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import {
  ASKED, JUDGE, LEADER, MOTHER, NOW, questionRow, setup, storedOpened, storedQuestion, toOthers, WORKER_1, WORKER_2,
} from "./helpers.ts";

// A question of worker-1 with every field a question may carry
const FULL = {
  ...ASKED,
  body: "the test binds 8080 and the spec says 9090",
  blocking: false,
  options: ["8080", "9090"],
  default: "8080",
  timeout_s: 90,
  ticket_ref: "T-1",
};

// What every `question` of it stores, whoever passes it on
const CARRIED = {
  body: "the test binds 8080 and the spec says 9090",
  ticket_ref: "T-1",
  data: {
    question_id: 1,
    asked_by: "worker-1",
    blocking: false,
    why: "the spec gives two",
    options: ["8080", "9090"],
    default: "8080",
    timeout_s: 90,
  },
};

const FROM_LEADER = { from_name: "leader", role_from: "leader", to_name: "mother" };
const FROM_MOTHER = { from_name: "mother", role_from: "mother", to_name: "human" };

type Broker = ReturnType<typeof setup>;

// A broker with a feature open and the question 1 of worker-1 with the leader
function asked(fields: Record<string, unknown> = ASKED) {
  const b = setup();
  const feature_id = b.openFeature();
  b.question.ask(WORKER_1, fields);
  return { ...b, feature_id };
}

// A refused /escalate (QST-09): the trace with question as the attempted kind, and
// `questions` as it was
function refusedEscalate(b: Broker, peer: Caller, body: Record<string, unknown>, error: string) {
  const rows = b.questionRows();
  b.refusedWith(() => b.question.escalate(peer, body), peer.name, "question", error);
  expect(b.questionRows()).toEqual(rows);
}

test("QST-13: from the worker to the dev the question is stored three times with the same id and the fields of the first", () => {
  const b = asked(FULL);
  const id = b.feature_id;
  expect(b.question.escalate(LEADER, { question_id: 1 })).toEqual({ ok: true, seq: 3 });
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { ticket_ref: "T-1", holder: "mother", blocking: 0, default_answer: "8080", timeout_s: 90 }),
  ]);
  b.clock.now = NOW + 4000;
  expect(b.question.escalate(MOTHER, { question_id: 1 })).toEqual({ ok: true, seq: 4 });
  expect(b.events()).toEqual([
    storedOpened(1, id),
    storedQuestion(2, id, CARRIED),
    storedQuestion(3, id, { ...CARRIED, ...FROM_LEADER }),
    storedQuestion(4, id, { ...CARRIED, ...FROM_MOTHER, ts: NOW + 4000 }),
  ]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, {
      ticket_ref: "T-1",
      holder: "human",
      blocking: 0,
      default_answer: "8080",
      timeout_s: 90,
      deadline_ts: NOW + 4000 + 90000,
    }),
  ]);
});

test("QST-13: an escalation takes its fields from the first question, whatever its body says, and goes to the level above", () => {
  const b = asked(FULL);
  const answer = b.question.escalate(LEADER, {
    question_id: 1,
    to: "human",
    asked_by: "leader",
    blocking: true,
    why: "another reason",
    options: ["1", "2", "3"],
    default: "9090",
    timeout_s: 5,
    ticket_ref: "T-9",
    from: "mother",
    anything: { at: "all" },
  });
  expect(answer).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(storedQuestion(3, b.feature_id, { ...CARRIED, ...FROM_LEADER }));
});

test("QST-13: a question without options, default, timeout_s and ticket_ref is escalated without them", () => {
  const b = asked();
  b.question.escalate(LEADER, { question_id: 1 });
  b.question.escalate(MOTHER, { question_id: 1 });
  expect(b.events().slice(1)).toEqual([
    storedQuestion(2, b.feature_id),
    storedQuestion(3, b.feature_id, FROM_LEADER),
    storedQuestion(4, b.feature_id, FROM_MOTHER),
  ]);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id, { holder: "human" })]);
});

test("QST-13: the escalation moves only the question of its id", () => {
  const b = asked();
  b.question.ask(WORKER_2, ASKED);
  expect(b.question.escalate(LEADER, { question_id: 2 })).toEqual({ ok: true, seq: 4 });
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id),
    questionRow(2, b.feature_id, { asked_by: "worker-2", holder: "mother" }),
  ]);
  expect(b.events()[3]).toEqual(
    storedQuestion(4, b.feature_id, {
      ...FROM_LEADER,
      question_id: 2,
      data: { question_id: 2, asked_by: "worker-2", blocking: true, why: "the spec gives two" },
    })
  );
});

test("QST-14: summary and body that are sent replace the ones of the question in that event only", () => {
  const b = asked(FULL);
  b.question.escalate(LEADER, { question_id: 1, summary: "the port, for the dev", body: "the leader could not tell" });
  expect(b.events()[2]).toEqual(
    storedQuestion(3, b.feature_id, {
      ...CARRIED,
      ...FROM_LEADER,
      summary: "the port, for the dev",
      body: "the leader could not tell",
    })
  );
  // the first question is as it was
  expect(b.events()[1]).toEqual(storedQuestion(2, b.feature_id, CARRIED));
});

test("QST-14: summary and body that are not sent come from the latest question, not from the first", () => {
  const b = asked(FULL);
  b.question.escalate(LEADER, { question_id: 1, summary: "the port, for the dev", body: "the leader could not tell" });
  b.question.escalate(MOTHER, { question_id: 1 });
  expect(b.events()[3]).toEqual(
    storedQuestion(4, b.feature_id, {
      ...CARRIED,
      ...FROM_MOTHER,
      summary: "the port, for the dev",
      body: "the leader could not tell",
    })
  );
});

test("QST-14: each of summary and body comes from the latest question when only the other is sent", () => {
  const b = asked(FULL);
  b.question.escalate(LEADER, { question_id: 1, summary: "the port, for the dev" });
  b.question.escalate(MOTHER, { question_id: 1, body: "" });
  expect(b.events().slice(2)).toEqual([
    storedQuestion(3, b.feature_id, { ...CARRIED, ...FROM_LEADER, summary: "the port, for the dev" }),
    storedQuestion(4, b.feature_id, { ...CARRIED, ...FROM_MOTHER, summary: "the port, for the dev", body: "" }),
  ]);
});

test("QST-15: a question_id that is not an integer is refused with missing_field", () => {
  const b = asked();
  refusedEscalate(b, LEADER, {}, "missing_field");
  for (const question_id of ["1", 1.5, null, [1]]) {
    refusedEscalate(b, LEADER, { question_id }, "missing_field");
  }
});

test("QST-15: a summary that is present and not a non-empty string, or a body that is not a string, is refused with missing_field", () => {
  const b = asked();
  for (const summary of ["", 5, null, ["s"]]) refusedEscalate(b, LEADER, { question_id: 1, summary }, "missing_field");
  for (const body of [5, null, { text: "x" }]) refusedEscalate(b, LEADER, { question_id: 1, body }, "missing_field");
});

test("QST-15: a summary of more than 80 characters is refused with invalid_field, and one of 80 is stored", () => {
  const b = asked();
  refusedEscalate(b, LEADER, { question_id: 1, summary: "x".repeat(81) }, "invalid_field");
  expect(b.question.escalate(LEADER, { question_id: 1, summary: "x".repeat(80) })).toEqual({ ok: true, seq: 4 });
  expect(b.events()[3]).toEqual(storedQuestion(4, b.feature_id, { ...FROM_LEADER, summary: "x".repeat(80) }));
});

test("QST-15: a question_id no row has is refused with invalid_field", () => {
  const b = asked();
  for (const question_id of [2, 0, -1, 99]) refusedEscalate(b, LEADER, { question_id }, "invalid_field");
});

for (const status of ["answered", "defaulted", "merged", "discarded"]) {
  test(`QST-16: a question that is ${status} is refused with question_closed`, () => {
    const b = asked();
    b.db.run("UPDATE questions SET status = ? WHERE id = 1", [status]);
    refusedEscalate(b, LEADER, { question_id: 1 }, "question_closed");
  });
}

test("QST-16: who is not the holder of an open question is refused with not_holder", () => {
  const b = asked();
  for (const peer of [WORKER_1, WORKER_2, MOTHER, JUDGE]) refusedEscalate(b, peer, { question_id: 1 }, "not_holder");
  // and the leader, once the question is with the mother
  b.question.escalate(LEADER, { question_id: 1 });
  refusedEscalate(b, LEADER, { question_id: 1 }, "not_holder");
  // no peer holds the one that reached the dev
  b.question.escalate(MOTHER, { question_id: 1 });
  refusedEscalate(b, MOTHER, { question_id: 1 }, "not_holder");
});

test("QST-16: missing_field comes before invalid_field", () => {
  const b = asked();
  refusedEscalate(b, LEADER, { question_id: "1", summary: "x".repeat(81) }, "missing_field");
  refusedEscalate(b, LEADER, { question_id: 99, body: 5 }, "missing_field");
});

test("QST-16: invalid_field comes before question_closed", () => {
  const b = asked();
  b.db.run("UPDATE questions SET status = 'answered' WHERE id = 1");
  refusedEscalate(b, LEADER, { question_id: 1, summary: "x".repeat(81) }, "invalid_field");
});

test("QST-16: question_closed comes before not_holder", () => {
  const b = asked();
  b.db.run("UPDATE questions SET status = 'answered' WHERE id = 1");
  refusedEscalate(b, WORKER_2, { question_id: 1 }, "question_closed");
});

test("QST-17: the worker and the leader that escalate leave a pending delivery for the leader and for the mother", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(JUDGE, { ...ASKED, to: "worker-2" });
  expect(b.question.escalate(WORKER_2, { question_id: 1 })).toEqual({ ok: true, seq: 3 });
  expect(b.question.escalate(LEADER, { question_id: 1 })).toEqual({ ok: true, seq: 4 });
  const data = { question_id: 1, asked_by: "judge", blocking: true, why: "the spec gives two" };
  expect(b.events().slice(1)).toEqual([
    storedQuestion(2, id, { from_name: "judge", role_from: "judge", to_name: "worker-2", data }),
    storedQuestion(3, id, { from_name: "worker-2", role_from: "worker", to_name: "leader", data }),
    storedQuestion(4, id, { ...FROM_LEADER, data }),
  ]);
  expect(b.deliveries()).toEqual([
    ...toOthers(1),
    { event_seq: 2, recipient: "worker-2", acked_at: null },
    { event_seq: 3, recipient: "leader", acked_at: null },
    { event_seq: 4, recipient: "mother", acked_at: null },
  ]);
  expect(b.questionRows()).toEqual([questionRow(1, id, { asked_by: "judge", holder: "mother" })]);
});

test("QST-17: the mother that escalates sends the question to human, with no delivery", () => {
  const b = asked();
  b.question.escalate(LEADER, { question_id: 1 });
  const deliveries = b.deliveries();
  expect(b.question.escalate(MOTHER, { question_id: 1 })).toEqual({ ok: true, seq: 4 });
  expect(b.events()[3]).toEqual(storedQuestion(4, b.feature_id, FROM_MOTHER));
  expect(b.deliveries()).toEqual(deliveries);
});

test("QST-18: a non-blocking question that reaches the dev without timeout_s gets a deadline 240000 ms after that event", () => {
  const b = asked({ ...ASKED, blocking: false, default: "8080" });
  b.clock.now = NOW + 1000;
  b.question.escalate(LEADER, { question_id: 1 });
  b.clock.now = NOW + 6000;
  b.question.escalate(MOTHER, { question_id: 1 });
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, { holder: "human", blocking: 0, default_answer: "8080", deadline_ts: NOW + 6000 + 240000 }),
  ]);
});

test("QST-18: the deadline counts from the ts stored in the event that reached the dev", () => {
  const b = asked(FULL);
  b.question.escalate(LEADER, { question_id: 1 });
  // every reading of the clock is 7 s after the one before it
  let t = NOW;
  Object.defineProperty(b.clock, "now", { get: () => (t += 7000) });
  b.question.escalate(MOTHER, { question_id: 1 });
  expect(b.questionRows()[0]!.deadline_ts).toBe(b.events()[3]!.ts + 90000);
});

test("QST-18: a blocking question that reaches the dev has no deadline", () => {
  const b = asked();
  b.question.escalate(LEADER, { question_id: 1 });
  b.question.escalate(MOTHER, { question_id: 1 });
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id, { holder: "human" })]);
});

test("QST-19: a non-blocking question has no deadline while its holder is an agent", () => {
  const b = asked(FULL);
  expect(b.questionRows().map((q) => [q.holder, q.deadline_ts])).toEqual([["leader", null]]);
  b.question.escalate(LEADER, { question_id: 1 });
  expect(b.questionRows().map((q) => [q.holder, q.deadline_ts])).toEqual([["mother", null]]);
});

test("QST-12: when the write of the holder fails, the escalation leaves no event and no delivery", () => {
  const b = asked();
  const events = b.events();
  const deliveries = b.deliveries();
  b.db.run("CREATE TRIGGER broken BEFORE UPDATE ON questions BEGIN SELECT RAISE(ABORT, 'the disk is full'); END");
  expect(() => b.question.escalate(LEADER, { question_id: 1 })).toThrow("the disk is full");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id)]);
});

test("QST-95: the question stays open with the same holder when its holder leaves the broker", () => {
  const b = asked();
  const leader = b.join("leader", "leader", 11) as { id: string };
  b.peers.unregister(leader.id);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id)]);
  // and when its session dies
  b.join("leader", "leader", 12);
  b.alive.delete(12);
  b.peers.cleanStale();
  expect(b.events().map((e) => e.kind)).toEqual([
    "feature_opened", "question", "peer_joined", "peer_left", "peer_joined", "peer_left",
  ]);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id)]);
});
