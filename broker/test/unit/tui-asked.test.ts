import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import { squad, type Question } from "../../shared/derive.ts";
import { effect, left, outcome, resolved, waiting } from "../../tui/asked.ts";
import type { Seg } from "../../tui/grid.ts";
import { HUMAN_TOKEN, LEADER, MOTHER, NOW, setup, WORKER_1, WORKER_2, WORKER_3 } from "./helpers.ts";

type Broker = ReturnType<typeof setup>;

const BLOCKING = { to: "leader", summary: "which port?", why: "the spec gives two", blocking: true };
const DEFAULT = { ...BLOCKING, blocking: false, default: "9090" };

// A broker with a feature open, and its questions as the routes write them. `ask` gives the id.
function open() {
  const b = setup();
  b.openFeature();
  const ask = (who: Caller, fields: Record<string, unknown> = BLOCKING): number => {
    const answer = b.question.ask(who, fields);
    if (!answer.ok) throw new Error(`the question was not asked: ${answer.error}`);
    return answer.question_id;
  };
  // The leader and the mother pass the question on: it reaches the dev at the clock of the broker
  const toDev = (id: number) => {
    b.question.escalate(LEADER, { question_id: id });
    b.question.escalate(MOTHER, { question_id: id });
  };
  const asDev = (id: number, answer = "8080") => b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: id, answer });
  return { ...b, ask, toDev, asDev };
}

const derived = (b: Broker) => squad(b.log.after(0), b.clock.now);
const question = (b: Broker, id: number): Question => derived(b).questions.find((q) => q.id === id)!;
const said = (segs: Seg[]) => segs.map((seg) => (seg ? seg[0] : "")).join("");
const ids = (list: Question[]) => list.map((q) => q.id);

test("QST-55: waiting has the blocking ones from the oldest arrival, then the others from the nearest deadline", () => {
  const b = open();
  // 1 has ten minutes and 4 one: the deadline orders them, not the id nor the arrival
  const slow = b.ask(WORKER_1, { ...DEFAULT, timeout_s: 600 });
  b.toDev(slow);
  // 2 was asked before 3 and reaches the dev after it
  const late = b.ask(WORKER_2);
  const early = b.ask(WORKER_3);
  b.clock.now = NOW + 10_000;
  b.toDev(early);
  b.clock.now = NOW + 20_000;
  const fast = b.ask(WORKER_2, { ...DEFAULT, timeout_s: 60 });
  b.toDev(fast);
  b.clock.now = NOW + 30_000;
  b.toDev(late);

  expect([slow, late, early, fast]).toEqual([1, 2, 3, 4]);
  expect(ids(waiting(derived(b)))).toEqual([early, late, fast, slow]);
});

test("QST-55: a question with an agent, a closed one and a merged one are not in waiting", () => {
  const b = open();
  const withLeader = b.ask(WORKER_1);
  const answered = b.ask(WORKER_2);
  b.toDev(answered);
  b.asDev(answered);
  const merged = b.ask(WORKER_3);
  b.toDev(merged);
  const kept = b.ask(WORKER_1);
  b.toDev(kept);
  b.question.merge(MOTHER, { question_id: merged, into: kept });

  expect(question(b, withLeader).status).toBe("open");
  expect(ids(waiting(derived(b)))).toEqual([kept]);
});

test("QST-60: resolved has every question that is not open, from the latest resolution to the oldest", () => {
  const b = open();
  const byDev = b.ask(WORKER_1);
  const byLeader = b.ask(WORKER_2);
  const byTimeout = b.ask(WORKER_3, { ...DEFAULT, timeout_s: 60 });
  const merged = b.ask(LEADER, { ...BLOCKING, to: "mother" });
  const stillOpen = b.ask(WORKER_2);
  b.toDev(byDev);
  b.toDev(byTimeout);

  b.clock.now = NOW + 10_000;
  b.question.merge(MOTHER, { question_id: merged, into: byDev });
  b.clock.now = NOW + 20_000;
  b.question.answer(LEADER, { question_id: byLeader, answer: "8080" });
  // The one the merged follows closes after it: the merged keeps the hour of its merge
  b.clock.now = NOW + 30_000;
  b.asDev(byDev);
  b.clock.now = NOW + 60_000;
  expect(b.question.expire().length).toBe(1);

  expect([byDev, byLeader, byTimeout, merged, stillOpen]).toEqual([1, 2, 3, 4, 5]);
  expect(ids(resolved(derived(b)))).toEqual([byTimeout, byDev, byLeader, merged]);
  expect(question(b, merged).status).toBe("answered");
  // Open and with the leader: in neither list
  expect(ids(waiting(derived(b)))).toEqual([]);
});

test("QST-59: the effect of a blocking question is that who asked takes the ticket again, with its reworks", () => {
  const b = open();
  b.given.reworks("T-1", "worker-1", 1);
  const reworked = b.ask(WORKER_1, { ...BLOCKING, ticket_ref: "T-1" });
  const clean = b.ask(WORKER_2, { ...BLOCKING, ticket_ref: "T-2" });
  const loose = b.ask(WORKER_3);

  const s = derived(b);
  const of = (id: number) => effect(s.questions.find((q) => q.id === id)!, s);
  expect(of(reworked)).toBe("worker-1 retoma o T-1 (rework 1/2) assim que você confirmar.");
  expect(of(clean)).toBe("worker-2 retoma o T-2 assim que você confirmar.");
  expect(of(loose)).toBe("worker-3 retoma o trabalho assim que você confirmar.");
});

test("QST-59: the effect of a non-blocking question is that who asked changes the default, with or without ticket", () => {
  const b = open();
  b.given.reworks("T-1", "worker-2", 1);
  const onTicket = b.ask(WORKER_2, { ...DEFAULT, ticket_ref: "T-1" });
  const loose = b.ask(WORKER_3, DEFAULT);

  const s = derived(b);
  const of = (id: number) => effect(s.questions.find((q) => q.id === id)!, s);
  expect(of(onTicket)).toBe("worker-2 troca o default pela sua resposta; nada é refeito.");
  expect(of(loose)).toBe("worker-3 troca o default pela sua resposta; nada é refeito.");
});

test("QST-61: the outcome of a question answered by the dev and of one answered by an agent", () => {
  const b = open();
  const byDev = b.ask(WORKER_1);
  b.toDev(byDev);
  b.asDev(byDev, "público, só leitura");
  const byLeader = b.ask(WORKER_2);
  b.question.answer(LEADER, { question_id: byLeader, answer: "sim, via ETag" });

  expect(said(outcome(question(b, byDev)))).toBe("✓ respondida pelo dev: público, só leitura");
  expect(said(outcome(question(b, byLeader)))).toBe("✓ respondida por leader: sim, via ETag  · rota curta, não chegou ao dev");
});

test("QST-61: the outcome of a question closed by its default says whether the deadline came or the ticket was delivered", () => {
  const b = open();
  const expired = b.ask(WORKER_1, { ...DEFAULT, default: "HH:mm", timeout_s: 60 });
  b.toDev(expired);
  const delivered = b.ask(WORKER_2, { ...DEFAULT, default: "como vêm", ticket_ref: "T-2" });
  b.question.delivered("worker-2", "T-2");
  b.clock.now = NOW + 60_000;
  b.question.expire();

  expect(said(outcome(question(b, expired)))).toBe("⟳ default aplicado · timeout: HH:mm");
  expect(said(outcome(question(b, delivered)))).toBe("⟳ default aplicado · worker-2 entregou o ticket antes da resposta: como vêm");
});

test("QST-61: a merged question says where it went, before and after the one it follows closes", () => {
  const b = open();
  const kept = b.ask(WORKER_1);
  b.toDev(kept);
  const merged = b.ask(LEADER, { ...BLOCKING, to: "mother" });
  b.question.merge(MOTHER, { question_id: merged, into: kept });
  expect(question(b, merged).status).toBe("merged");
  expect(said(outcome(question(b, merged)))).toBe("▶ mesclada em Q-01 pela mother · recebe a mesma resposta");

  b.asDev(kept);
  expect(question(b, merged).status).toBe("answered");
  expect(said(outcome(question(b, merged)))).toBe("▶ mesclada em Q-01 pela mother · recebe a mesma resposta");
});

test("QST-61: a merged question closed by the result of who asked it shows its own default", () => {
  const b = open();
  const merged = b.ask(WORKER_1, { ...DEFAULT, ticket_ref: "T-1" });
  const kept = b.ask(WORKER_2, { ...DEFAULT, default: "7070", ticket_ref: "T-2" });
  b.question.merge(MOTHER, { question_id: merged, into: kept });
  b.question.delivered("worker-1", "T-1");

  expect(question(b, merged).merged_into).toBe(kept);
  expect(said(outcome(question(b, merged)))).toBe("⟳ default aplicado · worker-1 entregou o ticket antes da resposta: 9090");
});

test("QST-98: left is the seconds until the deadline, 240 without timeout_s, and 0 once it passed", () => {
  const b = open();
  const short = b.ask(WORKER_1, { ...DEFAULT, timeout_s: 60 });
  const plain = b.ask(WORKER_2, DEFAULT);
  b.toDev(short);
  b.toDev(plain);

  expect(left(question(b, short), NOW)).toBe(60);
  expect(left(question(b, short), NOW + 12_000)).toBe(48);
  expect(left(question(b, plain), NOW)).toBe(240);
  expect(left(question(b, short), NOW + 60_000)).toBe(0);
  expect(left(question(b, short), NOW + 61_000)).toBe(0);
  expect(left(question(b, short), NOW + 600_000)).toBe(0);
});
