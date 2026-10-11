import { expect, test } from "bun:test";
import { questions } from "../../shared/derive.ts";
import { ASKED, JUDGE, LEADER, MOTHER, NOW, questionRow, setup, WORKER_1, WORKER_2, WORKER_3 } from "./helpers.ts";

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

test("QST-37: a question closed by its own result two merges away from the end of the chain keeps its default when the end is answered, and the one between them follows the answer", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_2, { ...ON_TICKET, ticket_ref: "T-2" });
  b.question.ask(WORKER_3, { ...ON_TICKET, default: "7070", ticket_ref: "T-3" });
  b.question.ask(WORKER_1, { ...ON_TICKET, default: "9090" });
  b.question.merge(MOTHER, { question_id: 3, into: 2 });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });

  b.question.delivered("worker-1", "T-1");
  const own = questionRow(3, id, { ...ROW, default_answer: "9090", status: "defaulted", merged_into: 2, answer_seq: 7 });
  expect(b.questionRows()[2]).toEqual(own);

  expect(b.question.answer(LEADER, { question_id: 1, answer: "3000" })).toEqual({ ok: true, seq: 8 });
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { ...ROW, asked_by: "worker-2", ticket_ref: "T-2", status: "answered", answer_seq: 8 }),
    questionRow(2, id, {
      ...ROW,
      asked_by: "worker-3",
      ticket_ref: "T-3",
      default_answer: "7070",
      status: "answered",
      merged_into: 1,
      answer_seq: 8,
    }),
    own,
  ]);
  // the answer is for who asked the two that closed by it, not for who went on with its default
  expect(b.deliveries().filter((d) => d.event_seq === 8)).toEqual([
    { event_seq: 8, recipient: "worker-2", acked_at: null },
    { event_seq: 8, recipient: "worker-3", acked_at: null },
  ]);
});

test("QST-36: two questions of the worker about the ticket, one merged into the other, close each by its own default in ascending id, whichever was merged", () => {
  for (const [merged, into] of [[2, 1], [1, 2]] as const) {
    const b = setup();
    const id = b.openFeature();
    b.question.ask(WORKER_1, ON_TICKET);
    b.question.ask(WORKER_1, { ...ON_TICKET, default: "9090" });
    b.question.merge(MOTHER, { question_id: merged, into });
    const deliveries = b.deliveries();

    b.question.delivered("worker-1", "T-1");
    const second = { summary: "Q-02: 9090", body: "9090", question_id: 2, data: { question_id: 2, answer: "9090", resolved_by: "result_default" } };
    expect(b.events().slice(4)).toEqual([storedDefault(5, id), storedDefault(6, id, second)]);
    expect(b.questionRows()).toEqual([
      questionRow(1, id, { ...ROW, status: "defaulted", merged_into: merged === 1 ? 2 : null, answer_seq: 5 }),
      questionRow(2, id, { ...ROW, default_answer: "9090", status: "defaulted", merged_into: merged === 2 ? 1 : null, answer_seq: 6 }),
    ]);
    expect(b.deliveries()).toEqual([
      ...deliveries,
      { event_seq: 5, recipient: "worker-1", acked_at: null },
      { event_seq: 6, recipient: "worker-1", acked_at: null },
    ]);
    // The log says the same of each one
    expect(questions(b.log.after(0)).map((q) => [q.id, q.status, q.answer, q.answer_seq])).toEqual([
      [1, "defaulted", "8080", 5],
      [2, "defaulted", "9090", 6],
    ]);
  }
});

test("QST-36, QST-37: a question of another worker merged into one of the two follows that one, and not the one at the end of the chain", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ON_TICKET);
  b.question.ask(WORKER_1, { ...ON_TICKET, default: "9090" });
  b.question.ask(WORKER_3, { ...ON_TICKET, default: "7070", ticket_ref: "T-3" });
  b.question.merge(MOTHER, { question_id: 3, into: 2 });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const deliveries = b.deliveries();

  b.question.delivered("worker-1", "T-1");
  const second = { summary: "Q-02: 9090", body: "9090", question_id: 2, data: { question_id: 2, answer: "9090", resolved_by: "result_default" } };
  expect(b.events().slice(6)).toEqual([storedDefault(7, id), storedDefault(8, id, second)]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { ...ROW, status: "defaulted", answer_seq: 7 }),
    questionRow(2, id, { ...ROW, default_answer: "9090", status: "defaulted", merged_into: 1, answer_seq: 8 }),
    questionRow(3, id, { ...ROW, asked_by: "worker-3", ticket_ref: "T-3", default_answer: "7070", status: "defaulted", merged_into: 2, answer_seq: 8 }),
  ]);
  expect(b.deliveries()).toEqual([
    ...deliveries,
    { event_seq: 7, recipient: "worker-1", acked_at: null },
    { event_seq: 8, recipient: "worker-1", acked_at: null },
    { event_seq: 8, recipient: "worker-3", acked_at: null },
  ]);
});

test("QST-36: a question of the worker merged into another of its own through the question of another worker closes by its own default, and the one between them by the answer of the end", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ON_TICKET);
  b.question.ask(WORKER_1, { ...ON_TICKET, default: "9090" });
  b.question.ask(WORKER_3, { ...ON_TICKET, default: "7070", ticket_ref: "T-3" });
  b.question.merge(MOTHER, { question_id: 2, into: 3 });
  b.question.merge(MOTHER, { question_id: 3, into: 1 });
  const deliveries = b.deliveries();

  b.question.delivered("worker-1", "T-1");
  const second = { summary: "Q-02: 9090", body: "9090", question_id: 2, data: { question_id: 2, answer: "9090", resolved_by: "result_default" } };
  expect(b.events().slice(6)).toEqual([storedDefault(7, id), storedDefault(8, id, second)]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { ...ROW, status: "defaulted", answer_seq: 7 }),
    questionRow(2, id, { ...ROW, default_answer: "9090", status: "defaulted", merged_into: 3, answer_seq: 8 }),
    questionRow(3, id, { ...ROW, asked_by: "worker-3", ticket_ref: "T-3", default_answer: "7070", status: "defaulted", merged_into: 1, answer_seq: 7 }),
  ]);
  expect(b.deliveries()).toEqual([
    ...deliveries,
    { event_seq: 7, recipient: "worker-1", acked_at: null },
    { event_seq: 7, recipient: "worker-3", acked_at: null },
    { event_seq: 8, recipient: "worker-1", acked_at: null },
  ]);
});

test("QST-36: a question of the worker about another ticket, or about none, merged into one the result closes follows the answer of that one, straight or through the question of another worker", () => {
  for (const ticket_ref of ["T-2", undefined]) {
    // Q-02, which the result of T-1 does not close by itself, merged straight into Q-01
    const b = setup();
    const id = b.openFeature();
    b.question.ask(WORKER_1, ON_TICKET);
    b.question.ask(WORKER_1, { ...ON_TICKET, default: "9090", ticket_ref });
    b.question.merge(MOTHER, { question_id: 2, into: 1 });
    const deliveries = b.deliveries();
    b.question.delivered("worker-1", "T-1");
    expect(b.events().slice(4)).toEqual([storedDefault(5, id)]);
    expect(b.questionRows()).toEqual([
      questionRow(1, id, { ...ROW, status: "defaulted", answer_seq: 5 }),
      questionRow(2, id, { ...ROW, ticket_ref: ticket_ref ?? null, default_answer: "9090", status: "defaulted", merged_into: 1, answer_seq: 5 }),
    ]);
    expect(b.deliveries()).toEqual([...deliveries, { event_seq: 5, recipient: "worker-1", acked_at: null }]);

    // And merged into Q-03 of worker-3, which is merged into Q-01
    const c = setup();
    const feature = c.openFeature();
    c.question.ask(WORKER_1, ON_TICKET);
    c.question.ask(WORKER_1, { ...ON_TICKET, default: "9090", ticket_ref });
    c.question.ask(WORKER_3, { ...ON_TICKET, default: "7070", ticket_ref: "T-3" });
    c.question.merge(MOTHER, { question_id: 2, into: 3 });
    c.question.merge(MOTHER, { question_id: 3, into: 1 });
    const before = c.deliveries();
    c.question.delivered("worker-1", "T-1");
    expect(c.events().slice(6)).toEqual([storedDefault(7, feature)]);
    expect(c.questionRows()).toEqual([
      questionRow(1, feature, { ...ROW, status: "defaulted", answer_seq: 7 }),
      questionRow(2, feature, { ...ROW, ticket_ref: ticket_ref ?? null, default_answer: "9090", status: "defaulted", merged_into: 3, answer_seq: 7 }),
      questionRow(3, feature, { ...ROW, asked_by: "worker-3", ticket_ref: "T-3", default_answer: "7070", status: "defaulted", merged_into: 1, answer_seq: 7 }),
    ]);
    expect(c.deliveries()).toEqual([
      ...before,
      { event_seq: 7, recipient: "worker-1", acked_at: null },
      { event_seq: 7, recipient: "worker-3", acked_at: null },
    ]);
  }
});

test("QST-36: another asker about the same ticket follows the default, straight or through a question about another ticket", () => {
  for (const peer of [WORKER_3, JUDGE]) {
    const b = setup();
    const id = b.openFeature();
    b.question.ask(WORKER_1, ON_TICKET);
    b.question.ask(peer, { ...ON_TICKET, default: "7070" });
    b.question.merge(MOTHER, { question_id: 2, into: 1 });
    const deliveries = b.deliveries();

    b.question.delivered("worker-1", "T-1");
    expect(b.events().slice(4)).toEqual([storedDefault(5, id)]);
    expect(b.questionRows()).toEqual([
      questionRow(1, id, { ...ROW, status: "defaulted", answer_seq: 5 }),
      questionRow(2, id, { ...ROW, asked_by: peer.name, default_answer: "7070", status: "defaulted", merged_into: 1, answer_seq: 5 }),
    ]);
    expect(b.deliveries()).toEqual([
      ...deliveries,
      ...[peer.name, "worker-1"].sort().map((recipient) => ({ event_seq: 5, recipient, acked_at: null })),
    ]);
  }

  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ON_TICKET);
  b.question.ask(WORKER_2, { ...ON_TICKET, ticket_ref: "T-9", default: "9090" });
  b.question.ask(WORKER_3, { ...ON_TICKET, default: "7070" });
  b.question.merge(MOTHER, { question_id: 3, into: 2 });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const deliveries = b.deliveries();

  b.question.delivered("worker-1", "T-1");
  expect(b.events().slice(6)).toEqual([storedDefault(7, id)]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { ...ROW, status: "defaulted", answer_seq: 7 }),
    questionRow(2, id, { ...ROW, asked_by: "worker-2", ticket_ref: "T-9", default_answer: "9090", status: "defaulted", merged_into: 1, answer_seq: 7 }),
    questionRow(3, id, { ...ROW, asked_by: "worker-3", default_answer: "7070", status: "defaulted", merged_into: 2, answer_seq: 7 }),
  ]);
  expect(b.deliveries()).toEqual([
    ...deliveries,
    ...["worker-1", "worker-2", "worker-3"].map((recipient) => ({ event_seq: 7, recipient, acked_at: null })),
  ]);
});

test("QST-36: another worker two merges away follows the answer through a third worker or through the sender about another ticket", () => {
  for (const middle of [WORKER_2, WORKER_1]) {
    const b = setup();
    const id = b.openFeature();
    b.question.ask(WORKER_1, ON_TICKET);
    b.question.ask(middle, { ...ON_TICKET, ticket_ref: "T-2", default: "9090" });
    b.question.ask(WORKER_3, { ...ON_TICKET, ticket_ref: "T-3", default: "7070" });
    b.question.merge(MOTHER, { question_id: 3, into: 2 });
    b.question.merge(MOTHER, { question_id: 2, into: 1 });
    const deliveries = b.deliveries();

    b.question.delivered("worker-1", "T-1");
    expect(b.events().slice(6)).toEqual([storedDefault(7, id)]);
    expect(b.questionRows()).toEqual([
      questionRow(1, id, { ...ROW, status: "defaulted", answer_seq: 7 }),
      questionRow(2, id, { ...ROW, asked_by: middle.name, ticket_ref: "T-2", default_answer: "9090", status: "defaulted", merged_into: 1, answer_seq: 7 }),
      questionRow(3, id, { ...ROW, asked_by: "worker-3", ticket_ref: "T-3", default_answer: "7070", status: "defaulted", merged_into: 2, answer_seq: 7 }),
    ]);
    expect(b.deliveries()).toEqual([
      ...deliveries,
      ...[...new Set(["worker-1", middle.name, "worker-3"])].sort().map((recipient) => ({ event_seq: 7, recipient, acked_at: null })),
    ]);
  }
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
