import { expect, test } from "bun:test";
import {
  ASKED, HUMAN_TOKEN, LEADER, MOTHER, NOW, questionRow, setup, toOthers, WORKER_1, WORKER_2, WORKER_3,
} from "./helpers.ts";

const NON_BLOCKING = { ...ASKED, blocking: false, default: "8080" };

// A broker with a feature open and seven questions in it: one open with no default, one open
// non-blocking, one open blocking with a default, one answered, one merged with a default, one
// merged with none and one closed by its deadline
function seven() {
  const b = setup();
  const feature_id = b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_2, NON_BLOCKING);
  b.question.ask(WORKER_3, { ...ASKED, default: "9090" });
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_2, { ...NON_BLOCKING, default: "7070" });
  b.question.ask(WORKER_3, ASKED);
  b.question.ask(MOTHER, { ...NON_BLOCKING, to: "human", timeout_s: 1 });
  b.question.answer(LEADER, { question_id: 4, answer: "3000" });
  b.question.merge(MOTHER, { question_id: 5, into: 2 });
  b.question.merge(MOTHER, { question_id: 6, into: 1 });
  b.clock.now = NOW + 1000;
  b.question.expire();
  return { ...b, feature_id };
}

for (const outcome of ["delivered", "abandoned"]) {
  test(`QST-43: a feature closed as ${outcome} closes its open and merged questions by their default or discards them, with no answer`, () => {
    const b = seven();
    const events = b.events();
    const deliveries = b.deliveries();
    const closed = [
      questionRow(4, b.feature_id, { status: "answered", answer_seq: 9 }),
      questionRow(7, b.feature_id, {
        asked_by: "mother",
        holder: "human",
        blocking: 0,
        default_answer: "8080",
        timeout_s: 1,
        deadline_ts: NOW + 1000,
        status: "defaulted",
        answer_seq: 12,
      }),
    ];
    expect(b.questionRows()).toEqual([
      questionRow(1, b.feature_id),
      questionRow(2, b.feature_id, { asked_by: "worker-2", blocking: 0, default_answer: "8080" }),
      questionRow(3, b.feature_id, { asked_by: "worker-3", default_answer: "9090" }),
      closed[0]!,
      questionRow(5, b.feature_id, { asked_by: "worker-2", blocking: 0, default_answer: "7070", status: "merged", merged_into: 2 }),
      questionRow(6, b.feature_id, { asked_by: "worker-3", status: "merged", merged_into: 1 }),
      closed[1]!,
    ]);

    expect(b.feature.close(MOTHER, { outcome })).toEqual({ ok: true, seq: 13 });
    expect(b.questionRows()).toEqual([
      questionRow(1, b.feature_id, { status: "discarded" }),
      questionRow(2, b.feature_id, { asked_by: "worker-2", blocking: 0, default_answer: "8080", status: "defaulted" }),
      questionRow(3, b.feature_id, { asked_by: "worker-3", default_answer: "9090", status: "defaulted" }),
      closed[0]!,
      questionRow(5, b.feature_id, { asked_by: "worker-2", blocking: 0, default_answer: "7070", status: "defaulted", merged_into: 2 }),
      questionRow(6, b.feature_id, { asked_by: "worker-3", status: "discarded", merged_into: 1 }),
      closed[1]!,
    ]);
    // the feature_closed and its deliveries, and nothing else
    expect(b.events().slice(0, 12)).toEqual(events);
    expect(b.events().slice(12).map((e) => [e.seq, e.kind, e.data])).toEqual([[13, "feature_closed", { outcome }]]);
    expect(b.deliveries()).toEqual([...deliveries, ...toOthers(13)]);
  });
}

test("QST-44: a question the closing of the feature closed takes no answer, no escalation and no merge", () => {
  const b = seven();
  b.closeFeature();
  const rows = b.questionRows();
  // discarded, closed by its default, and the two that were merged
  for (const question_id of [1, 2, 5, 6]) {
    b.refusedWith(() => b.question.answer(LEADER, { question_id, answer: "8080" }), "leader", "answer", "question_closed");
    b.refusedWith(() => b.question.escalate(LEADER, { question_id }), "leader", "question", "question_closed");
  }
  b.refusedWith(() => b.question.merge(MOTHER, { question_id: 1, into: 3 }), "mother", "question_merged", "question_closed");
  b.refusedWith(() => b.question.merge(MOTHER, { question_id: 2, into: 5 }), "mother", "question_merged", "question_closed");
  expect(b.questionRows()).toEqual(rows);
});

test("QST-44: the dev that answers a question the closing of the feature closed is refused with question_closed and leaves no event", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(MOTHER, { ...ASKED, to: "human" });
  b.closeFeature();
  const events = b.events();
  const answer = b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: 1, answer: "8080" });
  expect(answer).toMatchObject({ ok: false, error: "question_closed" });
  expect(b.events()).toEqual(events);
  expect(b.questionRows()).toEqual([questionRow(1, id, { asked_by: "mother", holder: "human", status: "discarded" })]);
});

test("QST-44: the deadline of a question the closing of the feature closed writes no answer", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(MOTHER, { ...NON_BLOCKING, to: "human" });
  b.closeFeature();
  const events = b.events();
  const row = questionRow(1, id, {
    asked_by: "mother",
    holder: "human",
    blocking: 0,
    default_answer: "8080",
    deadline_ts: NOW + 240000,
    status: "defaulted",
  });
  expect(b.questionRows()).toEqual([row]);
  b.clock.now = NOW + 86400000;
  expect(b.question.expire()).toEqual([]);
  expect(b.events()).toEqual(events);
  expect(b.questionRows()).toEqual([row]);
});

test("QST-43: the closing of a feature does not touch the questions of the one closed before it", () => {
  const b = setup();
  const first = b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.question.ask(WORKER_2, NON_BLOCKING);
  b.question.ask(WORKER_3, ASKED);
  b.question.answer(LEADER, { question_id: 3, answer: "3000" });
  b.closeFeature();
  const before = [
    questionRow(1, first, { status: "discarded" }),
    questionRow(2, first, { asked_by: "worker-2", blocking: 0, default_answer: "8080", status: "defaulted" }),
    questionRow(3, first, { asked_by: "worker-3", status: "answered", answer_seq: 5 }),
  ];
  expect(b.questionRows()).toEqual(before);

  const second = b.openFeature();
  b.question.ask(WORKER_1, NON_BLOCKING);
  b.closeFeature();
  expect(b.questionRows()).toEqual([
    ...before,
    questionRow(4, second, { blocking: 0, default_answer: "8080", status: "defaulted" }),
  ]);

  // only the questions of the feature that closes: one of another feature, were it still
  // open, would stay as it is
  b.db.run("UPDATE questions SET status = 'open' WHERE id = 1");
  b.openFeature();
  b.closeFeature();
  expect(b.questionRows()[0]).toEqual(questionRow(1, first));
});

test("QST-43: the feature_closed and its questions are one transaction: when a question cannot be closed the feature stays open", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  const events = b.events();
  const deliveries = b.deliveries();
  b.db.run("CREATE TRIGGER broken BEFORE UPDATE ON questions BEGIN SELECT RAISE(ABORT, 'the disk is full'); END");
  expect(() => b.feature.close(MOTHER, { outcome: "delivered" })).toThrow("the disk is full");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual([questionRow(1, id)]);
  expect(b.log.openFeature()?.id).toBe(id);
});
