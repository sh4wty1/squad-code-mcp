import { expect, test } from "bun:test";
import { createLog } from "../../log.ts";
import { createQuestion } from "../../question.ts";
import { ASKED, HUMAN_TOKEN, LEADER, MOTHER, NOW, questionRow, setup, WORKER_1, WORKER_2 } from "./helpers.ts";

const NON_BLOCKING = { ...ASKED, blocking: false, default: "8080" };

const DAY = 86400000;

// A broker with the question 1 of worker-1 with the dev: the leader and the mother
// escalated it, in the events 3 and 4, and it reached the dev at NOW
function atDev(fields: Record<string, unknown> = NON_BLOCKING) {
  const b = setup();
  const feature_id = b.openFeature();
  b.question.ask(WORKER_1, fields);
  b.question.escalate(LEADER, { question_id: 1 });
  b.question.escalate(MOTHER, { question_id: 1 });
  return { ...b, feature_id };
}

// The answer of the broker with the default "8080" of the question 1 of worker-1, as stored
function storedDefault(seq: number, feature_id: number, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "answer",
    feature_id,
    from_name: "broker",
    role_from: "broker",
    to_name: "worker-1",
    summary: "Q-01: 8080",
    body: "8080",
    ticket_ref: null,
    question_id: 1,
    gate_id: null,
    data: { question_id: 1, answer: "8080", resolved_by: "timeout_default" },
    ...fields,
  };
}

test("QST-33: one millisecond before the deadline nothing is written, and at the deadline the broker answers with the default", () => {
  const b = atDev({ ...NON_BLOCKING, ticket_ref: "T-1" });
  const events = b.events();
  const deliveries = b.deliveries();
  const rows = b.questionRows();
  expect(rows).toEqual([
    questionRow(1, b.feature_id, { ticket_ref: "T-1", holder: "human", blocking: 0, default_answer: "8080", deadline_ts: NOW + 240000 }),
  ]);

  b.clock.now = NOW + 239999;
  expect(b.question.expire()).toEqual([]);
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual(rows);

  b.clock.now = NOW + 240000;
  expect(b.question.expire()).toEqual([5]);
  expect(b.events()).toEqual([...events, storedDefault(5, b.feature_id, { ts: NOW + 240000, ticket_ref: "T-1" })]);
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, {
      ticket_ref: "T-1",
      holder: "human",
      blocking: 0,
      default_answer: "8080",
      deadline_ts: NOW + 240000,
      status: "defaulted",
      answer_seq: 5,
    }),
  ]);
  // who asked gets it, and the mother does not: the dev did not answer
  expect(b.deliveries()).toEqual([...deliveries, { event_seq: 5, recipient: "worker-1", acked_at: null }]);
});

test("QST-33: the deadline of a question with timeout_s 1 comes 1000 ms after it reached the dev", () => {
  const b = atDev({ ...NON_BLOCKING, timeout_s: 1 });
  b.clock.now = NOW + 999;
  expect(b.question.expire()).toEqual([]);
  expect(b.events()).toHaveLength(4);
  b.clock.now = NOW + 1000;
  expect(b.question.expire()).toEqual([5]);
  expect(b.events()[4]).toEqual(storedDefault(5, b.feature_id, { ts: NOW + 1000 }));
});

test("QST-33: a question whose deadline passed closes at the first check after it, once", () => {
  const b = atDev();
  b.clock.now = NOW + 240700;
  expect(b.question.expire()).toEqual([5]);
  expect(b.events()[4]).toEqual(storedDefault(5, b.feature_id, { ts: NOW + 240700 }));
  b.clock.now = NOW + DAY;
  expect(b.question.expire()).toEqual([]);
  expect(b.events().filter((e) => e.kind === "answer")).toEqual([storedDefault(5, b.feature_id, { ts: NOW + 240700 })]);
});

test("QST-33: the default of a question the mother asked the dev goes to the mother", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(MOTHER, { ...NON_BLOCKING, to: "human", default: "the cheaper one" });
  const deliveries = b.deliveries();
  b.clock.now = NOW + 240000;
  expect(b.question.expire()).toEqual([3]);
  expect(b.events()[2]).toEqual(
    storedDefault(3, id, {
      ts: NOW + 240000,
      to_name: "mother",
      summary: "Q-01: the cheaper one",
      body: "the cheaper one",
      data: { question_id: 1, answer: "the cheaper one", resolved_by: "timeout_default" },
    })
  );
  expect(b.deliveries()).toEqual([...deliveries, { event_seq: 3, recipient: "mother", acked_at: null }]);
});

test("QST-40: a blocking question with the dev stays open a day later", () => {
  const b = atDev(ASKED);
  const events = b.events();
  b.clock.now = NOW + DAY;
  expect(b.question.expire()).toEqual([]);
  expect(b.events()).toEqual(events);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id, { holder: "human" })]);
});

test("QST-19: a non-blocking question an agent holds has no deadline and stays open a day later", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, NON_BLOCKING);
  b.question.ask(WORKER_2, { ...NON_BLOCKING, timeout_s: 1 });
  b.question.escalate(LEADER, { question_id: 2 });
  const events = b.events();
  b.clock.now = NOW + DAY;
  expect(b.question.expire()).toEqual([]);
  expect(b.events()).toEqual(events);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { blocking: 0, default_answer: "8080" }),
    questionRow(2, id, { asked_by: "worker-2", holder: "mother", blocking: 0, default_answer: "8080", timeout_s: 1 }),
  ]);
});

test("QST-32: a merged question that reached the dev does not close by its own deadline a day later", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, NON_BLOCKING);
  b.question.ask(LEADER, { ...NON_BLOCKING, to: "mother", default: "9090" });
  b.question.escalate(MOTHER, { question_id: 2 });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const events = b.events();
  const deliveries = b.deliveries();
  b.clock.now = NOW + DAY;
  expect(b.question.expire()).toEqual([]);
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { blocking: 0, default_answer: "8080" }),
    questionRow(2, id, {
      asked_by: "leader",
      holder: "human",
      blocking: 0,
      default_answer: "9090",
      deadline_ts: NOW + 240000,
      status: "merged",
      merged_into: 1,
    }),
  ]);
});

test("QST-41: the deadline first and the answer of the dev at the same instant: the default is the one answer, and the dev gets question_closed", () => {
  const b = atDev();
  b.clock.now = NOW + 240000;
  expect(b.question.expire()).toEqual([5]);
  const late = b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: 1, answer: "9090" });
  expect(late).toMatchObject({ ok: false, error: "question_closed" });
  expect(b.events().filter((e) => e.question_id === 1 && e.kind === "answer")).toEqual([
    storedDefault(5, b.feature_id, { ts: NOW + 240000 }),
  ]);
  expect(b.events()).toHaveLength(5);
  expect(b.questionRows().map((q) => [q.status, q.answer_seq])).toEqual([["defaulted", 5]]);
});

test("QST-41: the answer of the dev first and the deadline at the same instant: the answer of the dev is the one answer, and the check writes nothing", () => {
  const b = atDev();
  b.clock.now = NOW + 240000;
  expect(b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: 1, answer: "9090" })).toEqual({ ok: true, seq: 5 });
  expect(b.question.expire()).toEqual([]);
  expect(b.events().filter((e) => e.question_id === 1 && e.kind === "answer")).toEqual([
    storedDefault(5, b.feature_id, {
      ts: NOW + 240000,
      from_name: "human",
      role_from: "human",
      summary: "Q-01: 9090",
      body: "9090",
      data: { question_id: 1, answer: "9090", resolved_by: "human" },
    }),
  ]);
  expect(b.events()).toHaveLength(5);
  expect(b.questionRows().map((q) => [q.status, q.answer_seq])).toEqual([["answered", 5]]);
});

test("QST-35: a module created over the same database closes the overdue question at its first check and keeps the stored deadline of the other", () => {
  const b = atDev({ ...NON_BLOCKING, timeout_s: 1 });
  b.question.ask(WORKER_2, { ...NON_BLOCKING, default: "9090" });
  b.question.escalate(LEADER, { question_id: 2 });
  b.question.escalate(MOTHER, { question_id: 2 });
  const second = { asked_by: "worker-2", holder: "human", blocking: 0, default_answer: "9090", deadline_ts: NOW + 240000 };

  // the broker comes back five seconds later
  b.clock.now = NOW + 5000;
  const restarted = createQuestion(b.db, createLog(b.db, () => b.clock.now), HUMAN_TOKEN, () => b.clock.now);
  expect(restarted.expire()).toEqual([8]);
  expect(b.events()[7]).toEqual(storedDefault(8, b.feature_id, { ts: NOW + 5000 }));
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, {
      holder: "human",
      blocking: 0,
      default_answer: "8080",
      timeout_s: 1,
      deadline_ts: NOW + 1000,
      status: "defaulted",
      answer_seq: 8,
    }),
    questionRow(2, b.feature_id, second),
  ]);

  // the deadline of the other is the stored one, not one counted again from the restart
  b.clock.now = NOW + 239999;
  expect(restarted.expire()).toEqual([]);
  expect(b.events()).toHaveLength(8);
  b.clock.now = NOW + 240000;
  expect(restarted.expire()).toEqual([9]);
  expect(b.events()[8]).toEqual(
    storedDefault(9, b.feature_id, {
      ts: NOW + 240000,
      to_name: "worker-2",
      summary: "Q-02: 9090",
      body: "9090",
      question_id: 2,
      data: { question_id: 2, answer: "9090", resolved_by: "timeout_default" },
    })
  );
  expect(b.questionRows()[1]).toEqual(questionRow(2, b.feature_id, { ...second, status: "defaulted", answer_seq: 9 }));
});

test("QST-31: the questions merged into one that expires close with it, by its default, and who asked each one gets it", () => {
  const b = atDev();
  b.question.ask(WORKER_2, { ...NON_BLOCKING, default: "9090" });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const deliveries = b.deliveries();
  b.clock.now = NOW + 240000;
  expect(b.question.expire()).toEqual([7]);
  expect(b.events().filter((e) => e.kind === "answer")).toEqual([storedDefault(7, b.feature_id, { ts: NOW + 240000 })]);
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, {
      holder: "human",
      blocking: 0,
      default_answer: "8080",
      deadline_ts: NOW + 240000,
      status: "defaulted",
      answer_seq: 7,
    }),
    questionRow(2, b.feature_id, {
      asked_by: "worker-2",
      blocking: 0,
      default_answer: "9090",
      status: "defaulted",
      merged_into: 1,
      answer_seq: 7,
    }),
  ]);
  expect(b.deliveries()).toEqual([
    ...deliveries,
    { event_seq: 7, recipient: "worker-1", acked_at: null },
    { event_seq: 7, recipient: "worker-2", acked_at: null },
  ]);
});
