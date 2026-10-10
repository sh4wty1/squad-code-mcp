import { expect, test } from "bun:test";
import type { QuestionRow } from "../../db.ts";
import type { Caller } from "../../send.ts";
import { questions, tickets } from "../../shared/derive.ts";
import { HUMAN_TOKEN, JUDGE, LEADER, MOTHER, OPENED, setup, WORKER_1, WORKER_2, WORKER_3 } from "./helpers.ts";

// The seed of the first sequence; the one of index i runs with SEED + i, so a failure is
// replayed alone by its seed
const SEED = 20261010;
const SEQUENCES = 200;
const STEPS = 40;

const PEERS = [MOTHER, LEADER, JUDGE, WORKER_1, WORKER_2, WORKER_3];
const WORKERS = [WORKER_1, WORKER_2, WORKER_3];
const TICKETS = ["T-1", "T-2", "T-3"];

// Who each role asks
const ABOVE: Record<string, string[]> = {
  worker: ["leader"],
  leader: ["mother"],
  mother: ["human"],
  judge: ["leader", "worker-1", "worker-2", "worker-3"],
};

// mulberry32: 32 bits of state, enough to choose the steps and to replay them from the seed
function prng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What the sequences did, all together: a generator that stopped reaching a route or a status
// would leave the comparison with nothing to compare
function tally() {
  return {
    accepted: {} as Record<string, number>,
    refused: {} as Record<string, number>,
    // refusals of a call on a question of a feature that closed (QST-44), by step
    afterClose: {} as Record<string, number>,
    statuses: new Set<unknown>(),
    resolutions: new Set<unknown>(),
  };
}

// One sequence of STEPS calls over a broker of its own, compared after each one. Throws with
// the seed and the steps when the table and the log say different things.
function run(seed: number, seen: ReturnType<typeof tally>) {
  const random = prng(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const chance = (p: number) => random() < p;
  const b = setup();
  const steps: string[] = [];
  let rowCount = 0;

  const count = (into: Record<string, number>, step: string) => (into[step] = (into[step] ?? 0) + 1);

  // Runs a call of a step and keeps what it was and what it answered
  function call(step: string, who: string, body: unknown, fn: () => unknown) {
    const answer = fn() as { ok: boolean; error?: string };
    steps.push(`${step} ${who} ${JSON.stringify(body)} → ${answer.ok ? "ok" : answer.error}`);
    count(answer.ok ? seen.accepted : seen.refused, step);
    return answer;
  }

  const rows = () => b.questionRows() as unknown as QuestionRow[];
  const byName = (name: string) => PEERS.find((p) => p.name === name);
  const owned = (worker: string) => [...tickets(b.log.featureEvents()).values()].find((t) => t.owner === worker);

  // The id of a question for a call: an open one most of the time, any one of any feature
  // otherwise, and now and then a value that is the id of none
  function anId(): unknown {
    const all = rows();
    if (all.length === 0 || chance(0.06)) return pick([0, 99, "1", null, 1.5]);
    const open = all.filter((q) => q.status === "open");
    return pick(open.length > 0 && chance(0.7) ? open : all).id;
  }

  // Who makes a call about the question: its holder most of the time
  function holderOr(question_id: unknown): Caller {
    const row = rows().find((q) => q.id === question_id);
    return (row && chance(0.8) && byName(row.holder)) || pick(PEERS);
  }

  // A refusal with question_closed of a question whose feature closed
  function closedWithItsFeature(step: string, question_id: unknown, answer: { ok: boolean; error?: string }) {
    const row = rows().find((q) => q.id === question_id);
    if (row && row.feature_id !== b.log.openFeature()?.id && answer.error === "question_closed") count(seen.afterClose, step);
  }

  function open() {
    const mother = { ...MOTHER, cwd: "/repo", git_root: "/repo/.git" };
    const answer = call("open", "mother", {}, () => b.feature.open(mother, OPENED));
    // with its plan, so that the tickets take tasks and results
    if (answer.ok) b.plan(LEADER, { tickets: TICKETS.map((ticket_ref) => ({ ticket_ref, title: ticket_ref })) });
  }

  function close() {
    const body = { outcome: pick(["delivered", "abandoned"]) };
    call("close", "mother", body, () => b.feature.close(MOTHER, body));
  }

  function ask() {
    const peer = pick(PEERS);
    const blocking = chance(0.4);
    const body: Record<string, unknown> = {
      to: chance(0.92) ? pick(ABOVE[peer.role]!) : pick(["human", "leader", "mother", "judge", "worker-2", "nobody"]),
      summary: chance(0.96) ? "which port?" : "x".repeat(81),
      why: "the spec gives two",
      blocking,
    };
    if (chance(0.3)) body.body = "8080 or 9090?";
    // a default on a blocking question is kept, even an empty one; a non-blocking one needs it
    if (blocking ? chance(0.3) : chance(0.96)) body.default = pick(blocking ? ["8080", ""] : ["8080", "9090"]);
    if (!blocking && chance(0.4)) body.timeout_s = pick([1, 2, 30]);
    else if (chance(0.04)) body.timeout_s = pick([0, 5]);
    if (chance(0.25)) body.options = pick([["a"], ["a", "b"], ["a", "b", "c"]]);
    else if (chance(0.04)) body.options = pick([[], ["a", "b", "c", "d"], ["a", ""]]);
    // about the ticket the worker has, most of the time: the one its result closes
    const mine = owned(peer.name)?.ticket_ref;
    if (chance(0.7)) body.ticket_ref = mine !== undefined && chance(0.7) ? mine : pick(TICKETS);
    call("ask", peer.name, body, () => b.question.ask(peer, body));
  }

  function escalate() {
    const question_id = anId();
    const peer = holderOr(question_id);
    const body = {
      question_id,
      ...(chance(0.2) && { summary: "which port, then?" }),
      ...(chance(0.2) && { body: "the level below does not know" }),
    };
    closedWithItsFeature("escalate", question_id, call("escalate", peer.name, body, () => b.question.escalate(peer, body)));
  }

  function answer() {
    const question_id = anId();
    const peer = holderOr(question_id);
    const body = { question_id, answer: chance(0.92) ? pick(["8080", "9090", "neither"]) : " " };
    closedWithItsFeature("answer", question_id, call("answer", peer.name, body, () => b.question.answer(peer, body)));
  }

  function answerAsHuman() {
    const atDev = rows().filter((q) => q.status === "open" && q.holder === "human");
    const body = {
      human_token: chance(0.92) ? HUMAN_TOKEN : "wrong",
      question_id: atDev.length > 0 && chance(0.75) ? pick(atDev).id : anId(),
      answer: chance(0.92) ? pick(["8080", "9090", "neither"]) : "",
    };
    const said = call("answerAsHuman", "human", { ...body, human_token: body.human_token === HUMAN_TOKEN ? "right" : "wrong" }, () =>
      b.question.answerAsHuman(body)
    );
    closedWithItsFeature("answerAsHuman", body.question_id, said);
  }

  function merge() {
    const peer = chance(0.92) ? MOTHER : pick(PEERS);
    const open = rows().filter((q) => q.status === "open");
    const first = open.length > 0 ? pick(open) : undefined;
    const alike = open.filter((q) => q.id !== first?.id && q.blocking === first?.blocking);
    // two open ones that can be merged, when there are such, most of the time
    const body = first && alike.length > 0 && chance(0.6) ? { question_id: first.id, into: pick(alike).id } : { question_id: anId(), into: anId() };
    closedWithItsFeature("merge", body.question_id, call("merge", peer.name, body, () => b.question.merge(peer, body)));
  }

  function expire() {
    const wait = pick([0, 400, 1000, 2000, 30000, 240000]);
    b.clock.now += wait;
    const closed = b.question.expire();
    steps.push(`expire +${wait} → ${JSON.stringify(closed)}`);
    count(closed.length > 0 ? seen.accepted : seen.refused, "expire");
  }

  function task() {
    if (chance(0.15)) {
      const body = { kind: "task", to: "leader", summary: "kick off" };
      call("task", "mother", body, () => b.send(MOTHER, body));
      return;
    }
    const body = { kind: "task", to: pick(WORKERS).name, summary: "do it", ticket_ref: pick(TICKETS), loadout: [] };
    call("task", "leader", body, () => b.send(LEADER, body));
  }

  function result() {
    if (chance(0.15)) {
      const body = { kind: "result", to: "mother", summary: "the batch" };
      call("result", "leader", body, () => b.send(LEADER, body));
      return;
    }
    // of a worker that has a ticket, most of the time, about its latest task
    const busy = WORKERS.filter((w) => owned(w.name));
    const peer = busy.length > 0 && chance(0.8) ? pick(busy) : pick(WORKERS);
    const own = owned(peer.name);
    const body = {
      kind: "result",
      to: "judge",
      summary: "done",
      ticket_ref: own && chance(0.9) ? own.ticket_ref : pick(TICKETS),
      task_seq: own?.taskSeq ?? 1,
      branch: "squad/x",
      commit: "abc1234",
    };
    call("result", peer.name, body, () => b.send(peer, body));
  }

  const STEP: [() => void, number][] = [
    [ask, 24],
    [escalate, 18],
    [answer, 9],
    [answerAsHuman, 8],
    [merge, 8],
    [expire, 8],
    [task, 9],
    [result, 9],
    [close, 4],
    [open, 3],
  ];
  const total = STEP.reduce((sum, [, weight]) => sum + weight, 0);

  function step() {
    // the clock moves between two calls
    b.clock.now += Math.floor(random() * 300);
    // with no feature open almost every call is refused: one opens soon
    if (!b.log.openFeature() && chance(0.5)) return open();
    let roll = random() * total;
    for (const [fn, weight] of STEP) {
      if ((roll -= weight) < 0) return fn();
    }
  }

  // QST-48: for each feature, the ten fields of each row are the ones `questions` gives over
  // the events of that feature, with no question on one side only
  function compare() {
    const table = rows();
    const events = b.log.after(0);
    const features = (b.db.query("SELECT id FROM features ORDER BY id").all() as { id: number }[]).map((f) => f.id);
    for (const feature of features) {
      const derived = questions(events.filter((e) => e.feature_id === feature)).map((q) => ({
        id: q.id,
        asked_by: q.asked_by,
        holder: q.holder,
        blocking: q.blocking,
        ticket_ref: q.ticket_ref,
        default_answer: q.default,
        status: q.status,
        merged_into: q.merged_into,
        deadline_ts: q.deadline,
        answer_seq: q.answer_seq,
      }));
      const stored = table
        .filter((row) => row.feature_id === feature)
        .map((row) => ({
          id: row.id,
          asked_by: row.asked_by,
          holder: row.holder,
          blocking: row.blocking === 1,
          ticket_ref: row.ticket_ref,
          default_answer: row.default_answer,
          status: row.status,
          merged_into: row.merged_into,
          deadline_ts: row.deadline_ts,
          answer_seq: row.answer_seq,
        }));
      expect(derived.sort((x, y) => x.id - y.id)).toEqual(stored);
    }
    // every row is of one of the features compared
    expect(table.filter((row) => !features.includes(row.feature_id))).toEqual([]);

    // QST-45: no row leaves the table, and no id is given twice
    expect(table.length).toBeGreaterThanOrEqual(rowCount);
    expect(table.map((row) => row.id)).toEqual(table.map((_, i) => i + 1));
    rowCount = table.length;

    // QST-38: no question has two answers
    const answers = events.filter((e) => e.kind === "answer");
    expect(new Set(answers.map((e) => e.question_id)).size).toBe(answers.length);

    for (const row of table) seen.statuses.add(row.status);
    for (const e of answers) seen.resolutions.add(e.resolved_by);
  }

  try {
    compare();
    for (let i = 0; i < STEPS; i++) {
      step();
      compare();
    }
  } catch (e) {
    throw new Error(
      `seed ${seed}: the table and the log differ after step ${steps.length}\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n${e instanceof Error ? e.message : String(e)}`
    );
  }
}

test("QST-48/45/38: after each step of 200 generated sequences of 40 calls, the table of each feature is what the log of that feature derives, no row is gone and no question has two answers", () => {
  const seen = tally();
  for (let i = 0; i < SEQUENCES; i++) run(SEED + i, seen);

  // The sequences went through every route, accepted and refused, and every way a question closes
  const steps = ["ask", "escalate", "answer", "answerAsHuman", "merge", "expire", "task", "result", "close", "open"];
  expect(steps.filter((s) => !seen.accepted[s])).toEqual([]);
  expect(steps.filter((s) => !seen.refused[s])).toEqual([]);
  expect(["answer", "answerAsHuman", "escalate", "merge"].filter((s) => !seen.afterClose[s])).toEqual([]);
  expect([...seen.statuses].sort()).toEqual(["answered", "defaulted", "discarded", "merged", "open"]);
  expect([...seen.resolutions].sort()).toEqual(["agent", "human", "result_default", "timeout_default"]);
});
