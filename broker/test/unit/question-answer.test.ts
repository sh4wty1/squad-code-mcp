import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import { ASKED, JUDGE, LEADER, MOTHER, NOW, questionRow, setup, toOthers, WORKER_1, WORKER_2 } from "./helpers.ts";

type Broker = ReturnType<typeof setup>;

// A broker with a feature open and the question 1 of worker-1 with the leader
function asked(fields: Record<string, unknown> = ASKED) {
  const b = setup();
  const feature_id = b.openFeature();
  b.question.ask(WORKER_1, fields);
  return { ...b, feature_id };
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

// A refused /answer of a peer (QST-09): the trace with answer as the attempted kind, and
// `questions` as it was
function refusedAnswer(b: Broker, peer: Caller, body: Record<string, unknown>, error: string) {
  const rows = b.questionRows();
  b.refusedWith(() => b.question.answer(peer, body), peer.name, "answer", error);
  expect(b.questionRows()).toEqual(rows);
}

test("QST-20: the answer of the holder is stored from it to who asked, and the row is answered with its seq", () => {
  const b = asked({ ...ASKED, ticket_ref: "T-1" });
  b.clock.now = NOW + 900;
  const answer = b.question.answer(LEADER, {
    question_id: 1,
    answer: "8080",
    to: "mother",
    from: "mother",
    summary: "s",
    body: "b",
    ticket_ref: "T-9",
    resolved_by: "human",
    anything: { at: "all" },
  });
  expect(answer).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(storedAnswer(3, b.feature_id, { ts: NOW + 900, ticket_ref: "T-1" }));
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id, { ticket_ref: "T-1", status: "answered", answer_seq: 3 })]);
});

test("QST-20: the summary is the label of the question and the answer, cut at 80 characters, and the body the whole answer", () => {
  const b = asked();
  b.question.ask(WORKER_2, ASKED);
  // "Q-01: " and 74 characters make 80, kept whole; one more is cut
  const exact = "a".repeat(74);
  b.question.answer(LEADER, { question_id: 1, answer: exact });
  b.question.answer(LEADER, { question_id: 2, answer: exact + "b" });
  expect(b.events().slice(3).map((e) => [e.summary, e.body, e.data.answer])).toEqual([
    [`Q-01: ${exact}`, exact, exact],
    [`Q-02: ${exact}`, exact + "b", exact + "b"],
  ]);
  expect(b.events()[3]!.summary).toHaveLength(80);
  expect(b.events()[4]!.summary).toHaveLength(80);
});

test("QST-20: the answer is stored as it came, with the spaces around it", () => {
  const b = asked();
  expect(b.question.answer(LEADER, { question_id: 1, answer: "  8080\n" })).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(
    storedAnswer(3, b.feature_id, {
      summary: "Q-01:   8080\n",
      body: "  8080\n",
      data: { question_id: 1, answer: "  8080\n", resolved_by: "agent" },
    })
  );
});

test("QST-20: a worker answers the judge, and the question never goes to human", () => {
  const b = setup();
  const id = b.openFeature();
  b.question.ask(JUDGE, { ...ASKED, to: "worker-2" });
  expect(b.question.answer(WORKER_2, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 3 });
  expect(b.events()[2]).toEqual(storedAnswer(3, id, { from_name: "worker-2", role_from: "worker", to_name: "judge" }));
  expect(b.events().map((e) => [e.kind, e.to_name])).toEqual([
    ["feature_opened", "*"],
    ["question", "worker-2"],
    ["answer", "judge"],
  ]);
  expect(b.questionRows()).toEqual([
    questionRow(1, id, { asked_by: "judge", holder: "worker-2", status: "answered", answer_seq: 3 }),
  ]);
});

test("QST-20: the answer of a holder the question was escalated to goes to who asked, not to who escalated", () => {
  const b = asked();
  b.question.escalate(LEADER, { question_id: 1 });
  expect(b.question.answer(MOTHER, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 4 });
  expect(b.events()[3]).toEqual(storedAnswer(4, b.feature_id, { from_name: "mother", role_from: "mother" }));
  expect(b.deliveries().filter((d) => d.event_seq === 4)).toEqual([{ event_seq: 4, recipient: "worker-1", acked_at: null }]);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id, { holder: "mother", status: "answered", answer_seq: 4 })]);
});

test("QST-20: the answer closes only the question of its id", () => {
  const b = asked();
  b.question.ask(WORKER_2, ASKED);
  expect(b.question.answer(LEADER, { question_id: 2, answer: "8080" })).toEqual({ ok: true, seq: 4 });
  expect(b.questionRows()).toEqual([
    questionRow(1, b.feature_id),
    questionRow(2, b.feature_id, { asked_by: "worker-2", status: "answered", answer_seq: 4 }),
  ]);
});

test("QST-21: a question_id that is not an integer is refused with missing_field", () => {
  const b = asked();
  refusedAnswer(b, LEADER, { answer: "8080" }, "missing_field");
  for (const question_id of ["1", 1.5, null, [1]]) {
    refusedAnswer(b, LEADER, { question_id, answer: "8080" }, "missing_field");
  }
});

test("QST-21: an answer that is absent, not a string or only spaces is refused with missing_field", () => {
  const b = asked();
  refusedAnswer(b, LEADER, { question_id: 1 }, "missing_field");
  for (const answer of [8080, null, ["8080"], "", " ", "   ", "\n\t "]) {
    refusedAnswer(b, LEADER, { question_id: 1, answer }, "missing_field");
  }
});

test("QST-21: a question_id no row has is refused with invalid_field", () => {
  const b = asked();
  for (const question_id of [2, 0, -1, 99]) refusedAnswer(b, LEADER, { question_id, answer: "8080" }, "invalid_field");
});

for (const status of ["answered", "defaulted", "merged", "discarded"]) {
  test(`QST-22: a question that is ${status} is refused with question_closed`, () => {
    const b = asked();
    b.db.run("UPDATE questions SET status = ? WHERE id = 1", [status]);
    refusedAnswer(b, LEADER, { question_id: 1, answer: "8080" }, "question_closed");
  });
}

test("QST-22: who is not the holder of an open question is refused with not_holder", () => {
  const b = asked();
  for (const peer of [WORKER_1, WORKER_2, MOTHER, JUDGE]) {
    refusedAnswer(b, peer, { question_id: 1, answer: "8080" }, "not_holder");
  }
  // and the leader, once the question is with the mother
  b.question.escalate(LEADER, { question_id: 1 });
  refusedAnswer(b, LEADER, { question_id: 1, answer: "8080" }, "not_holder");
});

test("QST-22: missing_field comes before invalid_field", () => {
  const b = asked();
  refusedAnswer(b, LEADER, { question_id: 99, answer: " " }, "missing_field");
});

test("QST-22: missing_field comes before question_closed and before not_holder", () => {
  const b = asked();
  refusedAnswer(b, WORKER_2, { question_id: 1, answer: " " }, "missing_field");
  b.db.run("UPDATE questions SET status = 'answered' WHERE id = 1");
  refusedAnswer(b, LEADER, { question_id: 1, answer: " " }, "missing_field");
});

test("QST-22: question_closed comes before not_holder", () => {
  const b = asked();
  b.db.run("UPDATE questions SET status = 'answered' WHERE id = 1");
  refusedAnswer(b, WORKER_2, { question_id: 1, answer: "8080" }, "question_closed");
});

test("QST-23: the answer leaves one pending delivery, for who asked, and none for who wrote it", () => {
  const b = asked();
  b.question.answer(LEADER, { question_id: 1, answer: "8080" });
  expect(b.deliveries()).toEqual([
    ...toOthers(1),
    { event_seq: 2, recipient: "leader", acked_at: null },
    { event_seq: 3, recipient: "worker-1", acked_at: null },
  ]);
});

test("QST-38: the second answer to a question is refused with question_closed, and the log has one answer of it", () => {
  const b = asked();
  expect(b.question.answer(LEADER, { question_id: 1, answer: "8080" })).toEqual({ ok: true, seq: 3 });
  refusedAnswer(b, LEADER, { question_id: 1, answer: "9090" }, "question_closed");
  expect(b.events().filter((e) => e.kind === "answer")).toEqual([storedAnswer(3, b.feature_id)]);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id, { status: "answered", answer_seq: 3 })]);
});

test("QST-12: when the write of the row fails, the answer leaves no event and no delivery", () => {
  const b = asked();
  const events = b.events();
  const deliveries = b.deliveries();
  b.db.run("CREATE TRIGGER broken BEFORE UPDATE ON questions BEGIN SELECT RAISE(ABORT, 'the disk is full'); END");
  expect(() => b.question.answer(LEADER, { question_id: 1, answer: "8080" })).toThrow("the disk is full");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
  expect(b.questionRows()).toEqual([questionRow(1, b.feature_id)]);
});
