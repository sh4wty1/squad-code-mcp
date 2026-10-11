import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { get, openFeature, post, readDb, readDeliveries, startBroker, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

// The mother, the leader and worker-1, each registered with one of the three live pids a
// test has at hand, and a feature open. Returns the id of each one and the one of the feature.
async function squad(b: Broker) {
  const ids: Record<string, string> = {};
  for (const [name, pid] of [["mother", b.proc.pid], ["leader", process.ppid], ["worker-1", process.pid]] as const) {
    const role = name === "worker-1" ? "worker" : name;
    ids[name] = (await post(b.url, "/register", { pid, cwd: "/repo", git_root: null, name, role })).json.id;
  }
  return { mother: ids.mother!, leader: ids.leader!, worker: ids["worker-1"]!, feature: await openFeature(b.url, ids.mother!) };
}

// What worker-1 asks the leader
const ASKED = { to: "leader", summary: "which port?", body: "8080 or 9090?", why: "the spec gives two", blocking: true };

// What the mother asks the dev and goes on without waiting, for one second
const BRIEF = { to: "human", summary: "which port?", why: "the spec gives two", blocking: false, default: "8080", timeout_s: 1 };

// The rows of `questions`, read straight from the database file of the broker
function questionRows(b: Broker) {
  const db = new Database(b.dbFile, { readonly: true });
  try {
    return db.query("SELECT * FROM questions ORDER BY id").all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}

function snapshot(b: Broker) {
  return { ...readDb(b.dbFile), deliveries: readDeliveries(b.dbFile), questions: questionRows(b) };
}

const humanToken = (b: Broker) => readFileSync(b.tokenFile, "utf8").trim();

// EVT-11: a refusal is a 200 with ok false, the error and a hint that says something
function expectRefusal(res: { status: number; json: any }, error: string) {
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: false, error, hint: expect.any(String) });
  expect(res.json.hint).not.toBe("");
}

const polled = async (b: Broker, id: string) => (await post(b.url, "/poll-messages", { id })).json.events as any[];

test("QST-13/24: a question of a worker goes up by two escalations to the dev, and the answer with the credential of the file comes back to the worker in its polling", async () => {
  broker = await startBroker();
  const b = broker;
  const { mother, leader, worker, feature } = await squad(b);

  expect((await post(b.url, "/ask", { id: worker, ...ASKED })).json).toEqual({ ok: true, question_id: 1, seq: 5 });
  const question = {
    ts: expect.any(Number),
    kind: "question",
    feature_id: feature,
    summary: "which port?",
    body: "8080 or 9090?",
    ticket_ref: null,
    question_id: 1,
    asked_by: "worker-1",
    blocking: true,
    why: "the spec gives two",
  };
  expect((await polled(b, leader)).at(-1)).toEqual({ ...question, seq: 5, from: "worker-1", role_from: "worker", to: "leader" });
  expect((await post(b.url, "/escalate", { id: leader, question_id: 1 })).json).toEqual({ ok: true, seq: 6 });
  expect(await polled(b, mother)).toEqual([{ ...question, seq: 6, from: "leader", role_from: "leader", to: "mother" }]);
  expect((await post(b.url, "/escalate", { id: mother, question_id: 1 })).json).toEqual({ ok: true, seq: 7 });

  const events = async () => ((await get(b.url, "/events")).json.events as any[]).slice(4);
  expect(await events()).toEqual([
    { ...question, seq: 5, from: "worker-1", role_from: "worker", to: "leader" },
    { ...question, seq: 6, from: "leader", role_from: "leader", to: "mother" },
    { ...question, seq: 7, from: "mother", role_from: "mother", to: "human" },
  ]);
  // nobody waits for the question that is with the dev
  expect(readDeliveries(b.dbFile).filter((d) => d.event_seq === 7)).toEqual([]);

  const answered = await post(b.url, "/answer", { human_token: humanToken(b), question_id: 1, answer: "8080" });
  expect(answered).toEqual({ status: 200, json: { ok: true, seq: 8 } });
  const answer = {
    seq: 8,
    ts: expect.any(Number),
    kind: "answer",
    feature_id: feature,
    from: "human",
    role_from: "human",
    to: "worker-1",
    summary: "Q-01: 8080",
    body: "8080",
    ticket_ref: null,
    question_id: 1,
    answer: "8080",
    resolved_by: "human",
  };
  expect((await polled(b, worker)).at(-1)).toEqual(answer);
  expect((await polled(b, mother)).at(-1)).toEqual(answer);
  expect((await events()).at(-1)).toEqual(answer);
  expect(questionRows(b)).toEqual([
    {
      id: 1,
      feature_id: feature,
      ticket_ref: null,
      asked_by: "worker-1",
      holder: "human",
      blocking: 1,
      default_answer: null,
      timeout_s: null,
      deadline_ts: null,
      status: "answered",
      merged_into: null,
      answer_seq: 8,
    },
  ]);
});

test("QST-26/28: /answer without human_token and with an unknown id answers unknown_peer, and with a wrong human_token and a registered id invalid_token, and the log does not change", async () => {
  broker = await startBroker();
  const b = broker;
  const { leader, worker } = await squad(b);
  await post(b.url, "/ask", { id: worker, ...ASKED });
  const before = snapshot(b);
  const body = { question_id: 1, answer: "8080" };

  for (const id of [{ id: "not-an-id" }, {}, { id: null }, { id: 5 }]) {
    expectRefusal(await post(b.url, "/answer", { ...body, ...id }), "unknown_peer");
  }
  // the key is what counts: with it the id of the holder is not read, whatever the value
  for (const human_token of ["wrong", "", null, 7, humanToken(b) + "0"]) {
    expectRefusal(await post(b.url, "/answer", { ...body, id: leader, human_token }), "invalid_token");
  }
  expectRefusal(await post(b.url, "/answer", { id: leader, human_token: "wrong" }), "invalid_token");
  // and with the credential the dev does not answer what the leader holds, with no trace of it
  expectRefusal(await post(b.url, "/answer", { ...body, id: leader, human_token: humanToken(b) }), "not_holder");
  expect(snapshot(b)).toEqual(before);

  // the holder answers with its id, and its refusal leaves its trace
  expect((await post(b.url, "/answer", { ...body, id: leader })).json).toEqual({ ok: true, seq: 6 });
  expectRefusal(await post(b.url, "/answer", { ...body, id: leader }), "question_closed");
  expect(readDb(b.dbFile).events.slice(5).map((e) => [e.seq, e.kind, e.from_name, e.data])).toEqual([
    [6, "answer", "leader", { question_id: 1, answer: "8080", resolved_by: "agent" }],
    [7, "refused", "broker", { peer: "leader", attempted_kind: "answer", error: "question_closed" }],
  ]);
});

for (const [path, body] of [
  ["/ask", ASKED],
  ["/escalate", { question_id: 1 }],
  ["/merge-question", { question_id: 2, into: 1 }],
  ["/answer", { question_id: 1, answer: "8080" }],
] as [string, Record<string, unknown>][]) {
  test(`QST-28: ${path} with an id that is not registered, or a body that is not a JSON object, stores nothing`, async () => {
    broker = await startBroker();
    const b = broker;
    const { worker } = await squad(b);
    await post(b.url, "/ask", { id: worker, ...ASKED });
    await post(b.url, "/ask", { id: worker, ...ASKED });
    const before = snapshot(b);
    expectRefusal(await post(b.url, path, { id: "not-an-id", ...body }), "unknown_peer");
    expectRefusal(await post(b.url, path, body), "unknown_peer");
    expectRefusal(await post(b.url, path, [body]), "missing_field");
    expect(snapshot(b)).toEqual(before);
  });
}

test("QST-10/16/22/29: an id that is not registered is refused with unknown_peer on the four routes, also when the body lacks the fields of the route", async () => {
  broker = await startBroker();
  const b = broker;
  const { mother, worker } = await squad(b);
  await post(b.url, "/ask", { id: worker, ...ASKED });
  const before = snapshot(b);
  const routes = ["/ask", "/escalate", "/merge-question", "/answer"];
  for (const path of routes) {
    expectRefusal(await post(b.url, path, { id: "not-an-id" }), "unknown_peer");
    expectRefusal(await post(b.url, path, { id: "not-an-id", question_id: "1" }), "unknown_peer");
  }
  expect(snapshot(b)).toEqual(before);
  // the same bodies with the id of the mother fail the next rule of each route
  for (const path of routes) {
    expectRefusal(await post(b.url, path, { id: mother }), "missing_field");
    expectRefusal(await post(b.url, path, { id: mother, question_id: "1" }), "missing_field");
  }
});

test("QST-09/30: the mother merges a question through /merge-question, and the refusal of the leader leaves a refused of a question_merged", async () => {
  broker = await startBroker();
  const b = broker;
  const { mother, leader, worker } = await squad(b);
  await post(b.url, "/ask", { id: worker, ...ASKED });
  await post(b.url, "/ask", { id: worker, ...ASKED });

  expectRefusal(await post(b.url, "/merge-question", { id: leader, question_id: 2, into: 1 }), "edge_not_allowed");
  expectRefusal(await post(b.url, "/escalate", { id: worker, question_id: 1 }), "not_holder");
  expect((await post(b.url, "/merge-question", { id: mother, question_id: 2, into: 1 })).json).toEqual({ ok: true, seq: 9 });
  expect(readDb(b.dbFile).events.slice(6).map((e) => [e.seq, e.kind, e.data])).toEqual([
    [7, "refused", { peer: "leader", attempted_kind: "question_merged", error: "edge_not_allowed" }],
    [8, "refused", { peer: "worker-1", attempted_kind: "question", error: "not_holder" }],
    [9, "question_merged", { question_id: 2, into: 1 }],
  ]);
  expect(questionRows(b).map((q) => [q.id, q.status, q.merged_into])).toEqual([
    [1, "open", null],
    [2, "merged", 1],
  ]);
});

test("QST-36: the result a worker sends through /send closes by its default the non-blocking question it asked about the ticket, which takes no answer afterwards", async () => {
  broker = await startBroker();
  const b = broker;
  const { leader, worker, feature } = await squad(b);
  await post(b.url, "/plan", { id: leader, tickets: [{ ticket_ref: "T1", title: "first" }] });
  const task = { kind: "task", to: "worker-1", summary: "do the first", ticket_ref: "T1", loadout: [] };
  expect((await post(b.url, "/send", { id: leader, ...task })).json).toEqual({ ok: true, seq: 6 });
  const asked = { ...ASKED, blocking: false, default: "8080", ticket_ref: "T1" };
  expect((await post(b.url, "/ask", { id: worker, ...asked })).json).toEqual({ ok: true, question_id: 1, seq: 7 });

  const result = { kind: "result", to: "judge", summary: "first done", ticket_ref: "T1", task_seq: 6, branch: "squad/t1", commit: "abc1234" };
  expect((await post(b.url, "/send", { id: worker, ...result })).json).toEqual({ ok: true, seq: 8 });
  const answer = {
    seq: 9,
    ts: expect.any(Number),
    kind: "answer",
    feature_id: feature,
    from: "broker",
    role_from: "broker",
    to: "worker-1",
    summary: "Q-01: 8080",
    body: "8080",
    ticket_ref: "T1",
    question_id: 1,
    answer: "8080",
    resolved_by: "result_default",
  };
  expect(((await get(b.url, "/events")).json.events as any[]).slice(7)).toEqual([
    { ...result, seq: 8, ts: expect.any(Number), feature_id: feature, from: "worker-1", role_from: "worker", body: "" },
    answer,
  ]);
  expect(questionRows(b).map((q) => [q.id, q.status, q.answer_seq])).toEqual([[1, "defaulted", 9]]);
  expect((await polled(b, worker)).at(-1)).toEqual(answer);

  // the leader that held it answers too late
  expectRefusal(await post(b.url, "/answer", { id: leader, question_id: 1, answer: "9090" }), "question_closed");
  expect(readDb(b.dbFile).events.slice(9).map((e) => [e.seq, e.kind, e.data])).toEqual([
    [10, "refused", { peer: "leader", attempted_kind: "answer", error: "question_closed" }],
  ]);
});

test("QST-12: when the row of the question cannot be written the broker answers 500 and stores no event and no delivery", async () => {
  broker = await startBroker();
  const b = broker;
  const { worker } = await squad(b);
  const before = snapshot(b);
  const db = new Database(b.dbFile);
  db.run("CREATE TRIGGER broken BEFORE INSERT ON questions BEGIN SELECT RAISE(ABORT, 'the disk is full'); END");
  db.close();

  const res = await post(b.url, "/ask", { id: worker, ...ASKED });
  expect(res.status).toBe(500);
  expect(res.json.error).toContain("the disk is full");
  expect(snapshot(b)).toEqual(before);
});

test("QST-34: a non-blocking question with timeout_s 1 that reaches the dev has the answer of the broker in the log within 3 s", async () => {
  broker = await startBroker();
  const b = broker;
  const { mother, feature } = await squad(b);
  expect((await post(b.url, "/ask", { id: mother, ...BRIEF })).json).toEqual({ ok: true, question_id: 1, seq: 5 });

  await waitFor(() => readDb(b.dbFile).events.length > 5, "the answer of the default", 3000);
  const [asked, answer] = readDb(b.dbFile).events.slice(4);
  expect(answer).toEqual({
    seq: 6,
    ts: expect.any(Number),
    kind: "answer",
    feature_id: feature,
    from_name: "broker",
    role_from: "broker",
    to_name: "mother",
    summary: "Q-01: 8080",
    body: "8080",
    ticket_ref: null,
    question_id: 1,
    gate_id: null,
    data: { question_id: 1, answer: "8080", resolved_by: "timeout_default" },
  });
  // not before the deadline: 1000 ms after the question reached the dev
  expect(answer!.ts).toBeGreaterThanOrEqual(asked!.ts + 1000);
  expect(questionRows(b).map((q) => [q.deadline_ts, q.status, q.answer_seq])).toEqual([[asked!.ts + 1000, "defaulted", 6]]);
  expect(await polled(b, mother)).toHaveLength(1);

  // and the dev that answers now comes too late
  expectRefusal(await post(b.url, "/answer", { human_token: humanToken(b), question_id: 1, answer: "9090" }), "question_closed");
  expect(readDb(b.dbFile).events).toHaveLength(6);
});

test("QST-34: the broker checks the deadlines every SQUAD_EXPIRE_INTERVAL_MS: with 60000 a question 1500 ms past its deadline is still open", async () => {
  broker = await startBroker({ SQUAD_EXPIRE_INTERVAL_MS: "60000" });
  const b = broker;
  const { mother } = await squad(b);
  expect((await post(b.url, "/ask", { id: mother, ...BRIEF })).json).toEqual({ ok: true, question_id: 1, seq: 5 });

  // the check of every 1000 ms would have closed it within 1000 ms of its deadline
  await Bun.sleep(2500);
  expect(readDb(b.dbFile).events).toHaveLength(5);
  expect(questionRows(b).map((q) => q.status)).toEqual(["open"]);
});

test("QST-35: a broker that comes up again over a question whose deadline passed has the answer of the default in the first reading of /events", async () => {
  const first = await startBroker();
  broker = first;
  // The mother with the pid of the test, which outlives the broker: she is still registered after it
  const mother = (await post(first.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "mother", role: "mother" })).json.id;
  await openFeature(first.url, mother);
  await post(first.url, "/ask", { id: mother, ...BRIEF });

  // the process stops before the deadline, and another one comes up after it over the same file
  first.proc.kill();
  await first.proc.exited;
  const asked = readDb(first.dbFile).events;
  expect(asked.map((e) => e.kind)).toEqual(["peer_joined", "feature_opened", "question"]);
  await Bun.sleep(asked[2]!.ts + 1000 - Date.now() + 50);
  const second = await startBroker({}, first.dir);
  broker = second;

  const { events } = (await get(second.url, "/events")).json;
  expect(events.slice(2).map((e: any) => [e.seq, e.kind, e.from, e.resolved_by, e.answer])).toEqual([
    [3, "question", "mother", undefined, undefined],
    [4, "answer", "broker", "timeout_default", "8080"],
  ]);
  expect(questionRows(second).map((q) => [q.deadline_ts, q.status, q.answer_seq])).toEqual([
    [asked[2]!.ts + 1000, "defaulted", 4],
  ]);
});
