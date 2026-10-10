import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import {
  ASKED, HUMAN_TOKEN, JUDGE, LEADER, MOTHER, NOW, questionRow, setup, WORKER_1, WORKER_2, WORKER_3,
} from "./helpers.ts";

type Broker = ReturnType<typeof setup>;

// A broker with a feature open, the question 1 of worker-1 with the leader and the
// question 2 of the leader with the mother, in the events 2 and 3
function two(first: Record<string, unknown> = ASKED, second: Record<string, unknown> = { ...ASKED, to: "mother" }) {
  const b = setup();
  const feature_id = b.openFeature();
  b.question.ask(WORKER_1, first);
  b.question.ask(LEADER, second);
  return { ...b, feature_id };
}

// The question_merged of the question 2 into the 1, as stored
function storedMerged(seq: number, feature_id: number, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "question_merged",
    feature_id,
    from_name: "mother",
    role_from: "mother",
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: 2,
    gate_id: null,
    data: { question_id: 2, into: 1 },
    ...fields,
  };
}

// The answer "8080" of the leader to the question 1 of worker-1, as stored
function storedAnswer(seq: number, feature_id: number, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "answer",
    feature_id,
    from_name: "leader",
    role_from: "leader",
    to_name: "worker-1",
    summary: "Q-01: 8080",
    body: "8080",
    ticket_ref: null,
    question_id: 1,
    gate_id: null,
    data: { question_id: 1, answer: "8080", resolved_by: "agent" },
    ...fields,
  };
}

// The names that wait for the event
function waiting(b: Broker, seq: number) {
  return b.deliveries().filter((d) => d.event_seq === seq).map((d) => d.recipient);
}

// A refused /merge-question (QST-09): the trace with question_merged as the attempted kind,
// and `questions` as it was
function refusedMerge(b: Broker, peer: Caller, body: Record<string, unknown>, error: string) {
  const rows = b.questionRows();
  b.refusedWith(() => b.question.merge(peer, body), peer.name, "question_merged", error);
  expect(b.questionRows()).toEqual(rows);
}

test("QST-29: who is not the mother is refused with edge_not_allowed", () => {
  const b = two();
  for (const peer of [LEADER, WORKER_1, JUDGE]) refusedMerge(b, peer, { question_id: 2, into: 1 }, "edge_not_allowed");
});

test("QST-29: a question_id or an into that is not an integer is refused with missing_field", () => {
  const b = two();
  refusedMerge(b, MOTHER, { into: 1 }, "missing_field");
  refusedMerge(b, MOTHER, { question_id: 2 }, "missing_field");
  for (const value of ["1", 1.5, null, [1]]) {
    refusedMerge(b, MOTHER, { question_id: value, into: 1 }, "missing_field");
    refusedMerge(b, MOTHER, { question_id: 2, into: value }, "missing_field");
  }
});

test("QST-29: a question merged into itself, or an id no row has, is refused with invalid_field", () => {
  const b = two();
  refusedMerge(b, MOTHER, { question_id: 1, into: 1 }, "invalid_field");
  refusedMerge(b, MOTHER, { question_id: 3, into: 1 }, "invalid_field");
  refusedMerge(b, MOTHER, { question_id: 2, into: 0 }, "invalid_field");
  refusedMerge(b, MOTHER, { question_id: 98, into: 99 }, "invalid_field");
});

for (const status of ["answered", "defaulted", "merged", "discarded"]) {
  test(`QST-29: a merge from or into a question that is ${status} is refused with question_closed`, () => {
    const b = two();
    b.db.run("UPDATE questions SET status = ? WHERE id = 1", [status]);
    refusedMerge(b, MOTHER, { question_id: 1, into: 2 }, "question_closed");
    refusedMerge(b, MOTHER, { question_id: 2, into: 1 }, "question_closed");
  });
}

test("QST-29: a blocking question and a non-blocking one are refused with merge_not_allowed, in both directions", () => {
  const b = two(ASKED, { ...ASKED, to: "mother", blocking: false, default: "8080" });
  refusedMerge(b, MOTHER, { question_id: 2, into: 1 }, "merge_not_allowed");
  refusedMerge(b, MOTHER, { question_id: 1, into: 2 }, "merge_not_allowed");
});

test("QST-29: edge_not_allowed comes before missing_field", () => {
  const b = two();
  refusedMerge(b, LEADER, { question_id: "2" }, "edge_not_allowed");
});

test("QST-29: missing_field comes before invalid_field", () => {
  const b = two();
  refusedMerge(b, MOTHER, { question_id: 99, into: "1" }, "missing_field");
  refusedMerge(b, MOTHER, { question_id: "1", into: "1" }, "missing_field");
});

test("QST-29: invalid_field comes before question_closed", () => {
  const b = two();
  b.db.run("UPDATE questions SET status = 'answered' WHERE id = 1");
  refusedMerge(b, MOTHER, { question_id: 1, into: 1 }, "invalid_field");
  refusedMerge(b, MOTHER, { question_id: 1, into: 99 }, "invalid_field");
});

test("QST-29: question_closed comes before merge_not_allowed", () => {
  const b = two(ASKED, { ...ASKED, to: "mother", blocking: false, default: "8080" });
  b.db.run("UPDATE questions SET status = 'answered' WHERE id = 1");
  refusedMerge(b, MOTHER, { question_id: 2, into: 1 }, "question_closed");
});

test("QST-30: the merge is stored from the mother to no one, with the ticket of the merged question, and its row follows the other", () => {
  const b = two({ ...ASKED, ticket_ref: "T-1" }, { ...ASKED, to: "mother", ticket_ref: "T-2" });
  const deliveries = b.deliveries();
  b.clock.now = NOW + 800;
  const answer = b.question.merge(MOTHER, { question_id: 2, into: 1, to: "leader", from: "leader", summary: "s", body: "b", ticket_ref: "T-9" });
  expect(answer).toEqual({ ok: true, seq: 4 });
  expect(b.events()[3]).toEqual(storedMerged(4, b.feature_id, { ts: NOW + 800, ticket_ref: "T-2" }));
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, { ticket_ref: "T-1" }),
    questionRow(2, b.feature_id, { ticket_ref: "T-2", asked_by: "leader", holder: "mother", status: "merged", merged_into: 1 }),
  ]);
  expect(b.deliveries()).toEqual(deliveries);
});

test("QST-30: two non-blocking questions are merged whoever holds each one, and the merged one keeps its deadline", () => {
  const nonBlocking = { ...ASKED, blocking: false, default: "8080" };
  const b = two(nonBlocking, { ...nonBlocking, to: "mother", default: "9090" });
  b.question.escalate(MOTHER, { question_id: 2 });
  expect(b.question.merge(MOTHER, { question_id: 2, into: 1 })).toEqual({ ok: true, seq: 5 });
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, { blocking: 0, default_answer: "8080" }),
    questionRow(2, b.feature_id, {
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

test("QST-31: the answer of the holder to a question closes the one merged into it with the same status and answer_seq, and who asked that one gets it", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_2, ASKED);
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  expect(b.question.answer(LEADER, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 5 });
  expect(b.events()[4]).toEqual(storedAnswer(5, id));
  expect(b.events().filter((e) => e.kind === "answer")).toHaveLength(1);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { status: "answered", answer_seq: 5 }),
    questionRow(2, id, { asked_by: "worker-2", status: "answered", merged_into: 1, answer_seq: 5 }),
  ]);
  expect(waiting(b, 5)).toEqual(["worker-1", "worker-2"]);
});

test("QST-31: the dev answers once, and who asked each question and the mother get the same answer", () => {
  const b = two();
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  b.question.escalate(LEADER, { question_id: 1 });
  b.question.escalate(MOTHER, { question_id: 1 });
  expect(b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 7 });
  expect(b.events()[6]).toEqual(
    storedAnswer(7, b.feature_id, {
      from_name: "human",
      role_from: "human",
      data: { question_id: 1, answer: "8080", resolved_by: "human" },
    })
  );
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, { holder: "human", status: "answered", answer_seq: 7 }),
    questionRow(2, b.feature_id, { asked_by: "leader", holder: "mother", status: "answered", merged_into: 1, answer_seq: 7 }),
  ]);
  expect(waiting(b, 7)).toEqual(["leader", "mother", "worker-1"]);
});

test("QST-31: when the row of the merged question cannot be written, the answer to the other leaves nothing", () => {
  const b = two();
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const events = b.events();
  const deliveries = b.deliveries();
  const rows = b.questionRows();
  b.db.run(
    "CREATE TRIGGER broken BEFORE UPDATE ON questions WHEN OLD.id = 2 BEGIN SELECT RAISE(ABORT, 'the disk is full'); END"
  );
  expect(() => b.question.answer(LEADER, { question_id: 1, answer: "8080" })).toThrow("the disk is full");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual(rows);
});

test("QST-31: a question that is not merged any more does not follow the answer, nor the ones merged into it", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_2, ASKED);
  b.question.ask(WORKER_3, ASKED);
  b.question.merge(MOTHER, { question_id: 3, into: 2 });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  // the question 2 closed on its own, as by the result of who asked it
  b.db.run("UPDATE questions SET status = 'defaulted', answer_seq = 4 WHERE id = 2");
  expect(b.question.answer(LEADER, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 7 });
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { status: "answered", answer_seq: 7 }),
    questionRow(2, id, { asked_by: "worker-2", status: "defaulted", merged_into: 1, answer_seq: 4 }),
    questionRow(3, id, { asked_by: "worker-3", status: "merged", merged_into: 2 }),
  ]);
  expect(waiting(b, 7)).toEqual(["worker-1"]);
});

test("QST-31: the answer to a question does not close the one merged into another", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_2, ASKED);
  b.question.ask(WORKER_3, ASKED);
  b.question.merge(MOTHER, { question_id: 3, into: 2 });
  b.question.answer(LEADER, { question_id: 1, answer: "8080" });
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { status: "answered", answer_seq: 6 }),
    questionRow(2, id, { asked_by: "worker-2" }),
    questionRow(3, id, { asked_by: "worker-3", status: "merged", merged_into: 2 }),
  ]);
  expect(waiting(b, 6)).toEqual(["worker-1"]);
});

test("QST-29: the answer, the escalation and the merge of a merged question are refused with question_closed", () => {
  const b = two();
  b.question.ask(WORKER_2, ASKED);
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const rows = b.questionRows();
  b.refusedWith(() => b.question.answer(MOTHER, { question_id: 2, answer: "8080" }), "mother", "answer", "question_closed");
  b.refusedWith(() => b.question.escalate(MOTHER, { question_id: 2 }), "mother", "question", "question_closed");
  refusedMerge(b, MOTHER, { question_id: 2, into: 3 }, "question_closed");
  refusedMerge(b, MOTHER, { question_id: 3, into: 2 }, "question_closed");
  expect(b.questionRows()).toEqual(rows);
});

test("QST-22: the dev that answers a merged question is refused with question_closed and leaves no event", () => {
  const b = two();
  b.question.escalate(MOTHER, { question_id: 2 });
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  const events = b.events();
  const rows = b.questionRows();
  const answer = b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: 2, answer: "8080" });
  expect(answer).toMatchObject({ ok: false, error: "question_closed" });
  expect(b.events()).toEqual(events);
  expect(b.questionRows()).toEqual(rows);
});

test("QST-92: the answer to the end of a chain of three closes the three with the same answer_seq, and each one that asked gets it", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_2, ASKED);
  b.question.ask(WORKER_3, ASKED);
  // 3 into 2, then 2 into 1: the question 3 leads to the 1 through the 2
  expect(b.question.merge(MOTHER, { question_id: 3, into: 2 })).toEqual({ ok: true, seq: 5 });
  expect(b.question.merge(MOTHER, { question_id: 2, into: 1 })).toEqual({ ok: true, seq: 6 });
  b.question.escalate(LEADER, { question_id: 1 });
  expect(b.question.answer(MOTHER, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 8 });
  expect(b.events().filter((e) => e.kind === "answer")).toEqual([
    storedAnswer(8, id, { from_name: "mother", role_from: "mother" }),
  ]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { holder: "mother", status: "answered", answer_seq: 8 }),
    questionRow(2, id, { asked_by: "worker-2", status: "answered", merged_into: 1, answer_seq: 8 }),
    questionRow(3, id, { asked_by: "worker-3", status: "answered", merged_into: 2, answer_seq: 8 }),
  ]);
  expect(waiting(b, 8)).toEqual(["worker-1", "worker-2", "worker-3"]);
});

test("QST-93: who asked the question and the one merged into it gets one delivery", () => {
  const b = setup();
  b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_1, ASKED);
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  expect(b.question.answer(LEADER, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 5 });
  expect(waiting(b, 5)).toEqual(["worker-1"]);
});

test("QST-93: who writes the answer gets no delivery for the merged question it asked", () => {
  const b = two();
  b.question.merge(MOTHER, { question_id: 2, into: 1 });
  expect(b.question.answer(LEADER, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 5 });
  expect(waiting(b, 5)).toEqual(["worker-1"]);
  expect(b.questionRows().map((q) => [q.id, q.status, q.answer_seq])).toEqual([
    [1, "answered", 5],
    [2, "answered", 5],
  ]);
});

test("QST-93: the mother that asked a merged question gets one delivery of the answer of the dev", () => {
  const b = two();
  b.question.escalate(LEADER, { question_id: 1 });
  b.question.escalate(MOTHER, { question_id: 1 });
  b.question.ask(MOTHER, { ...ASKED, to: "human" });
  b.question.merge(MOTHER, { question_id: 3, into: 1 });
  expect(b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 8 });
  expect(waiting(b, 8)).toEqual(["mother", "worker-1"]);
});
