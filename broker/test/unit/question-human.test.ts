import { expect, test } from "bun:test";
import { ASKED, HUMAN_TOKEN, LEADER, MOTHER, NOW, questionRow, setup, WORKER_1 } from "./helpers.ts";

type Broker = ReturnType<typeof setup>;

// A broker with the question 1 of worker-1 with the dev: the leader and the mother
// escalated it, in the events 3 and 4
function atDev(fields: Record<string, unknown> = ASKED) {
  const b = setup();
  const feature_id = b.openFeature();
  b.question.ask(WORKER_1, fields);
  b.question.escalate(LEADER, { question_id: 1 });
  b.question.escalate(MOTHER, { question_id: 1 });
  return { ...b, feature_id };
}

function answerAsDev(b: Broker, question_id: unknown, answer: unknown = "8080", fields: Record<string, unknown> = {}) {
  return b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id, answer, ...fields });
}

// The answer "8080" of the dev to the question 1 of worker-1, as stored
function storedAnswer(seq: number, feature_id: number, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "answer",
    feature_id,
    from_name: "human",
    role_from: "human",
    to_name: "worker-1",
    summary: "Q-01: 8080",
    body: "8080",
    ticket_ref: null,
    question_id: 1,
    gate_id: null,
    data: { question_id: 1, answer: "8080", resolved_by: "human" },
    ...fields,
  };
}

// Runs an answer of the dev that has to be refused (QST-28): the answer is the refusal with a
// hint, and the log, the deliveries and `questions` do not change. The human is not a peer:
// no `refused`.
function refusedDev(b: Broker, call: () => unknown, error: string) {
  const events = b.events();
  const deliveries = b.deliveries();
  const rows = b.questionRows();
  const answer = call() as { ok: boolean; error: string; hint: string };
  expect({ ...answer, hint: typeof answer.hint }).toEqual({ ok: false, error, hint: "string" });
  expect(answer.hint).not.toBe("");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual(rows);
}

test("QST-24: the answer with the human credential is stored from human to who asked, resolved by human", () => {
  const b = atDev({ ...ASKED, ticket_ref: "T-1" });
  b.clock.now = NOW + 5000;
  const answer = answerAsDev(b, 1, "8080", {
    id: "the-id-of-a-peer",
    from: "mother",
    role_from: "mother",
    to: "leader",
    summary: "s",
    body: "b",
    ticket_ref: "T-9",
    resolved_by: "agent",
  });
  expect(answer).toEqual({ ok: true, seq: 5 });
  expect(b.events()[4]).toEqual(storedAnswer(5, b.feature_id, { ts: NOW + 5000, ticket_ref: "T-1" }));
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id, { ticket_ref: "T-1", holder: "human", status: "answered", answer_seq: 5 }),
  ]);
});

test("QST-25: the answer of the dev leaves a pending delivery for who asked and one for the mother", () => {
  const b = atDev();
  const before = b.deliveries();
  answerAsDev(b, 1);
  expect(b.deliveries()).toEqual([
    ...before,
    { event_seq: 5, recipient: "mother", acked_at: null },
    { event_seq: 5, recipient: "worker-1", acked_at: null },
  ]);
});

test("QST-25: the mother that asked the dev gets one delivery of the answer", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(MOTHER, { ...ASKED, to: "human" });
  const before = b.deliveries();
  expect(answerAsDev(b, 1)).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(storedAnswer(3, id, { to_name: "mother" }));
  expect(b.deliveries()).toEqual([...before, { event_seq: 3, recipient: "mother", acked_at: null }]);
});

test("QST-26: a human_token that is not the human credential is refused with invalid_token", () => {
  const b = atDev();
  for (const human_token of ["", "wrong", HUMAN_TOKEN + "0", HUMAN_TOKEN.slice(1), null, 7, [HUMAN_TOKEN], undefined]) {
    refusedDev(b, () => b.question.answerAsHuman({ human_token, question_id: 1, answer: "8080" }), "invalid_token");
  }
  // the question is still there to be answered
  expect(answerAsDev(b, 1)).toEqual({ ok: true, seq: 5 });
});

test("QST-26: invalid_token comes before every other rule, and with the id of a registered peer in the body", () => {
  const b = atDev();
  const leader = b.join("leader", "leader", 11) as { id: string };
  const wrong = { human_token: "wrong", id: leader.id };
  // missing_field, invalid_field, not_holder and question_closed
  refusedDev(b, () => b.question.answerAsHuman({ ...wrong }), "invalid_token");
  refusedDev(b, () => b.question.answerAsHuman({ ...wrong, question_id: "1", answer: " " }), "invalid_token");
  refusedDev(b, () => b.question.answerAsHuman({ ...wrong, question_id: 99, answer: "8080" }), "invalid_token");
  b.question.ask(WORKER_1, ASKED);
  refusedDev(b, () => b.question.answerAsHuman({ ...wrong, question_id: 2, answer: "8080" }), "invalid_token");
  answerAsDev(b, 1);
  refusedDev(b, () => b.question.answerAsHuman({ ...wrong, question_id: 1, answer: "8080" }), "invalid_token");
});

test("QST-27: the dev that answers an open question an agent holds is refused with not_holder", () => {
  const b = setup();
  b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  refusedDev(b, () => answerAsDev(b, 1), "not_holder");
  b.question.escalate(LEADER, { question_id: 1 });
  refusedDev(b, () => answerAsDev(b, 1), "not_holder");
  // and the mother does not answer the one that is with the dev
  b.question.escalate(MOTHER, { question_id: 1 });
  b.refusedWith(() => b.question.answer(MOTHER, { question_id: 1, answer: "8080" }), "mother", "answer", "not_holder");
});

test("QST-28: a question_id that is not an integer, or an answer that is absent, not a string or only spaces, is refused with missing_field and leaves no event", () => {
  const b = atDev();
  refusedDev(b, () => b.question.answerAsHuman({ human_token: HUMAN_TOKEN, answer: "8080" }), "missing_field");
  for (const question_id of ["1", 1.5, null]) refusedDev(b, () => answerAsDev(b, question_id), "missing_field");
  refusedDev(b, () => b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: 1 }), "missing_field");
  for (const answer of [8080, null, "", "  ", "\n"]) refusedDev(b, () => answerAsDev(b, 1, answer), "missing_field");
});

test("QST-28: a question_id no row has is refused with invalid_field and leaves no event", () => {
  const b = atDev();
  for (const question_id of [2, 0, 99]) refusedDev(b, () => answerAsDev(b, question_id), "invalid_field");
});

for (const status of ["answered", "defaulted", "merged", "discarded"]) {
  test(`QST-28: the dev that answers a question that is ${status} is refused with question_closed and leaves no event`, () => {
    const b = atDev();
    b.db.run("UPDATE questions SET status = ? WHERE id = 1", [status]);
    refusedDev(b, () => answerAsDev(b, 1), "question_closed");
  });
}

test("QST-22: for the dev missing_field comes before invalid_field", () => {
  const b = atDev();
  refusedDev(b, () => answerAsDev(b, 99, " "), "missing_field");
});

test("QST-22: for the dev question_closed comes before not_holder", () => {
  const b = setup();
  b.openFeature();
  b.question.ask(WORKER_1, ASKED);
  b.db.run("UPDATE questions SET status = 'answered' WHERE id = 1");
  refusedDev(b, () => answerAsDev(b, 1), "question_closed");
});

test("QST-38: the dev that answers a question a second time is refused with question_closed, and the log has one answer of it", () => {
  const b = atDev();
  expect(answerAsDev(b, 1, "8080")).toEqual({ ok: true, seq: 5 });
  refusedDev(b, () => answerAsDev(b, 1, "9090"), "question_closed");
  expect(b.events().filter((e) => e.kind === "answer")).toEqual([storedAnswer(5, b.feature_id)]);
});
