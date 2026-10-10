import { expect, test } from "bun:test";
import { ASKED, LEADER, MOTHER, NOW, questionRow, setup, WORKER_1, WORKER_2, WORKER_3 } from "./helpers.ts";

// What worker-1 asks about the ticket T-1 and goes on without waiting
const ON_TICKET = { ...ASKED, blocking: false, default: "8080", ticket_ref: "T-1" };

// The row it leaves
const ROW = { ticket_ref: "T-1", blocking: 0, default_answer: "8080" };

// The answer of the broker with the default "8080" of the question 1 of worker-1 about T-1, as stored
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
    ticket_ref: "T-1",
    question_id: 1,
    gate_id: null,
    data: { question_id: 1, answer: "8080", resolved_by: "result_default" },
    ...fields,
  };
}

test("QST-36: the result of a worker closes its two non-blocking questions of the ticket in ascending id, each by its own default", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ON_TICKET);
  b.question.ask(WORKER_1, { ...ON_TICKET, default: "9090" });
  // the second went up to the mother: who holds a question does not matter
  b.question.escalate(LEADER, { question_id: 2 });
  const events = b.events();
  const deliveries = b.deliveries();

  b.clock.now = NOW + 300;
  b.question.delivered("worker-1", "T-1");
  expect(b.events()).toEqual([
    ...events,
    storedDefault(5, id, { ts: NOW + 300 }),
    storedDefault(6, id, {
      ts: NOW + 300,
      summary: "Q-02: 9090",
      body: "9090",
      question_id: 2,
      data: { question_id: 2, answer: "9090", resolved_by: "result_default" },
    }),
  ]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { ...ROW, status: "defaulted", answer_seq: 5 }),
    questionRow(2, id, { ...ROW, holder: "mother", default_answer: "9090", status: "defaulted", answer_seq: 6 }),
  ]);
  expect(b.deliveries()).toEqual([
    ...deliveries,
    { event_seq: 5, recipient: "worker-1", acked_at: null },
    { event_seq: 6, recipient: "worker-1", acked_at: null },
  ]);
});

test("QST-36: a question with the dev closes by the result, and its deadline writes nothing afterwards", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ON_TICKET);
  b.question.escalate(LEADER, { question_id: 1 });
  b.question.escalate(MOTHER, { question_id: 1 });
  b.question.delivered("worker-1", "T-1");
  expect(b.events()[4]).toEqual(storedDefault(5, id));
  b.clock.now = NOW + 240000;
  expect(b.question.expire()).toEqual([]);
  expect(b.events().filter((e) => e.kind === "answer")).toEqual([storedDefault(5, id)]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { ...ROW, holder: "human", deadline_ts: NOW + 240000, status: "defaulted", answer_seq: 5 }),
  ]);
});

test("QST-37: the result closes a merged question and the ones merged into it, and the question it followed stays open", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_2, { ...ON_TICKET, ticket_ref: "T-2" });
  b.question.ask(WORKER_1, { ...ON_TICKET, default: "9090" });
  b.question.ask(WORKER_3, { ...ON_TICKET, default: "7070", ticket_ref: "T-3" });
  b.question.merge(MOTHER, { question_id: 3, into: 2 });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const deliveries = b.deliveries();

  b.question.delivered("worker-1", "T-1");
  const closed = storedDefault(7, id, {
    summary: "Q-02: 9090",
    body: "9090",
    question_id: 2,
    data: { question_id: 2, answer: "9090", resolved_by: "result_default" },
  });
  expect(b.events().slice(6)).toEqual([closed]);
  const rows = [
    questionRow(1, id, { ...ROW, asked_by: "worker-2", ticket_ref: "T-2" }),
    questionRow(2, id, { ...ROW, default_answer: "9090", status: "defaulted", merged_into: 1, answer_seq: 7 }),
    questionRow(3, id, {
      ...ROW,
      asked_by: "worker-3",
      ticket_ref: "T-3",
      default_answer: "7070",
      status: "defaulted",
      merged_into: 2,
      answer_seq: 7,
    }),
  ];
  expect(b.questionRows()).toEqual(rows);
  expect(b.deliveries()).toEqual([
    ...deliveries,
    { event_seq: 7, recipient: "worker-1", acked_at: null },
    { event_seq: 7, recipient: "worker-3", acked_at: null },
  ]);

  // the answer to the question it followed is not for who asked it any more, and its row stays
  expect(b.question.answer(LEADER, { question_id: 1, answer: "3000" })).toEqual({ ok: true, seq: 8 });
  expect(b.deliveries().filter((d) => d.event_seq === 8)).toEqual([{ event_seq: 8, recipient: "worker-2", acked_at: null }]);
  expect(b.questionRows()).toEqual([{ ...rows[0], status: "answered", answer_seq: 8 }, rows[1]!, rows[2]!]);
});

test("QST-39: a blocking question of the ticket, a non-blocking one of another ticket, one without ticket and one of another worker stay open", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, { ...ASKED, ticket_ref: "T-1" });
  b.question.ask(WORKER_1, { ...ON_TICKET, ticket_ref: "T-2" });
  b.question.ask(WORKER_1, { ...ON_TICKET, ticket_ref: undefined });
  b.question.ask(WORKER_2, ON_TICKET);
  const events = b.events();
  const deliveries = b.deliveries();
  const rows = [
    questionRow(1, id, { ticket_ref: "T-1" }),
    questionRow(2, id, { ...ROW, ticket_ref: "T-2" }),
    questionRow(3, id, { ...ROW, ticket_ref: null }),
    questionRow(4, id, { ...ROW, asked_by: "worker-2" }),
  ];
  expect(b.questionRows()).toEqual(rows);

  b.question.delivered("worker-1", "T-1");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual(rows);

  // and with one of the ticket among them, only that one closes
  b.question.ask(WORKER_1, ON_TICKET);
  b.question.delivered("worker-1", "T-1");
  expect(b.events().slice(6)).toEqual([
    storedDefault(7, id, { summary: "Q-05: 8080", question_id: 5, data: { question_id: 5, answer: "8080", resolved_by: "result_default" } }),
  ]);
  expect(b.questionRows()).toEqual([...rows, questionRow(5, id, { ...ROW, status: "defaulted", answer_seq: 7 })]);
});

test("QST-38: a question already answered takes no default by the result", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ON_TICKET);
  b.question.answer(LEADER, { question_id: 1, answer: "3000" });
  const events = b.events();
  b.question.delivered("worker-1", "T-1");
  expect(b.events()).toEqual(events);
  expect(b.questionRows()).toEqual([questionRow(1, id, { ...ROW, status: "answered", answer_seq: 3 })]);
});
