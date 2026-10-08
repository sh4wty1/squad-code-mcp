import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { FEATURE, openFeature, post, readDb, readDeliveries, startBroker } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

// One pid holds one registration, and these are the two live pids a test has at hand
const PIDS = [process.pid, process.ppid];

// Registers the names, at most two, and returns the id of each one
async function join(b: Broker, ...names: string[]): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const [i, name] of names.entries()) {
    const role = name.startsWith("worker") ? "worker" : name;
    const res = await post(b.url, "/register", { pid: PIDS[i], cwd: "/repo", git_root: null, name, role });
    ids[name] = res.json.id;
  }
  return ids;
}

// A row of `events` as the broker stores it, with the defaults of a record
function row(fields: Record<string, unknown>) {
  return {
    ts: expect.any(Number),
    feature_id: null,
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: {},
    ...fields,
  };
}

// An event in the read format: the envelope and the fields of the kind at the same level
function read(fields: Record<string, unknown>) {
  return { ts: expect.any(Number), feature_id: null, to: null, summary: "", body: "", ticket_ref: null, ...fields };
}

// EVT-11: a refusal is a 200 with ok false, the error and a hint that says something
function expectRefusal(res: { status: number; json: any }, error: string) {
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: false, error, hint: expect.any(String) });
  expect(res.json.hint).not.toBe("");
}

// EVT-47: the log gained the trace of the refusal and nothing else, and no delivery changed
function expectRefused(b: Broker, before: ReturnType<typeof snapshot>, peer: string, attempted_kind: string, error: string) {
  const { events } = readDb(b.dbFile);
  expect(events).toEqual([
    ...before.events,
    row({
      seq: before.events.length + 1,
      kind: "refused",
      feature_id: before.feature,
      from_name: "broker",
      role_from: "broker",
      data: { peer, attempted_kind, error },
    }),
  ]);
  expect(readDeliveries(b.dbFile)).toEqual(before.deliveries);
}

function snapshot(b: Broker, feature: number | null = null) {
  return { ...readDb(b.dbFile), deliveries: readDeliveries(b.dbFile), feature };
}

// A valid body of each route with credential, without the id
const ROUTES: Record<string, Record<string, unknown>> = {
  "/send": { kind: "task", to: "leader", summary: "kick off" },
  "/plan": { tickets: [{ ticket_ref: "T1", title: "first" }] },
  "/poll-messages": {},
  "/ack": { seqs: [1] },
  "/history": { ticket_ref: "T1" },
  "/state": {},
  "/blocked": { reason: "waiting", detail: "for the spec", last_action: "read the ticket" },
  "/unblocked": {},
  "/usage": { session_id: "s-1", model: "opus", input: 1, output: 2, cache_write: 3, cache_read: 4 },
  "/turn-started": {},
  "/permission-request": { request_id: "abcde", tool_name: "Bash", description: "list files", input_preview: "ls" },
};

for (const [path, valid] of Object.entries(ROUTES)) {
  test(`EVT-03: POST ${path} with an id that is unknown, absent or not text answers unknown_peer and stores nothing`, async () => {
    broker = await startBroker();
    const feature = openFeature(broker.dbFile);
    // A pending delivery and live peers: the request would be accepted from any of them
    const ids = await join(broker, "mother", "leader");
    await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "kick off" });
    const before = snapshot(broker, feature);

    for (const id of [{ id: "not-an-id" }, {}, { id: null }, { id: 5 }, { id: { a: 1 } }, { id: ["x"] }]) {
      expectRefusal(await post(broker.url, path, { ...valid, ...id }), "unknown_peer");
    }
    expect(snapshot(broker, feature)).toEqual(before);
  });

  test(`EVT-12: POST ${path} without a JSON object is refused with missing_field and stores nothing`, async () => {
    broker = await startBroker();
    for (const body of [undefined, "xx", "null", "[]", JSON.stringify("id")]) {
      const res = await fetch(`${broker.url}${path}`, { method: "POST", body });
      expectRefusal({ status: res.status, json: await res.json() }, "missing_field");
    }
    expect(snapshot(broker)).toEqual({ events: [], peers: [], deliveries: [], feature: null });
  });
}

test("EVT-12: a POST to a route that does not exist still answers 404", async () => {
  broker = await startBroker();
  for (const path of ["/send-task", "/poll", "/turn_started"]) {
    expect((await post(broker.url, path, { id: "x" })).status).toBe(404);
  }
});

test("EVT-01/02/13: /send stores the event with the sender of the id and its delivery, with the recipient offline", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const { mother } = await join(broker, "mother");
  const res = await post(broker.url, "/send", {
    id: mother,
    kind: "task",
    to: "leader",
    summary: "kick off",
    body: "the spec is approved",
    from: "judge",
    role_from: "judge",
    seq: 99,
    ts: 1,
    feature_id: 42,
  });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 2 });
  expect(readDb(broker.dbFile).events[1]).toEqual(
    row({
      seq: 2,
      kind: "task",
      feature_id: feature,
      from_name: "mother",
      role_from: "mother",
      to_name: "leader",
      summary: "kick off",
      body: "the spec is approved",
    })
  );
  expect(readDb(broker.dbFile).events[1]!.ts).toBeGreaterThan(1);
  expect(readDeliveries(broker.dbFile)).toEqual([{ event_seq: 2, recipient: "leader", acked_at: null }]);
});

test("EVT-11/47: a refusal of /send adds one row to events, the refused, and changes no delivery", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const ids = await join(broker, "mother", "worker-1");
  await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "kick off" });
  const before = snapshot(broker, feature);
  expect(before.deliveries).toHaveLength(1);

  const res = await post(broker.url, "/send", { id: ids["worker-1"], kind: "task", to: "worker-2", summary: "do it" });
  expectRefusal(res, "edge_not_allowed");
  expectRefused(broker, before, "worker-1", "task", "edge_not_allowed");
});

test("EVT-09/47: /send without an open feature is refused with no_open_feature and leaves a refused without feature", async () => {
  broker = await startBroker();
  const { mother } = await join(broker, "mother");
  const before = snapshot(broker);
  expectRefusal(await post(broker.url, "/send", { id: mother, kind: "task", to: "leader", summary: "kick off" }), "no_open_feature");
  expectRefused(broker, before, "mother", "task", "no_open_feature");
});

test("EVT-15: /plan stores the plan of the leader and answers its seq", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const { leader } = await join(broker, "leader");
  const tickets = [
    { ticket_ref: "T1", title: "first" },
    { ticket_ref: "T2", title: "second", depends_on: ["T1"], dropped: false },
  ];
  const res = await post(broker.url, "/plan", { id: leader, tickets });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 2 });
  expect(readDb(broker.dbFile).events[1]).toEqual(
    row({ seq: 2, kind: "plan", feature_id: feature, from_name: "leader", role_from: "leader", data: { tickets } })
  );
  expect(readDeliveries(broker.dbFile)).toEqual([]);
});

test("EVT-16/47: /plan from who is not the leader is refused with edge_not_allowed and leaves a refused of plan", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const { mother } = await join(broker, "mother");
  const before = snapshot(broker, feature);
  expectRefusal(await post(broker.url, "/plan", { id: mother, ...ROUTES["/plan"] }), "edge_not_allowed");
  expectRefused(broker, before, "mother", "plan", "edge_not_allowed");
});

test("EVT-41/42: /poll-messages answers what is pending for the name in ascending seq, again while it is not confirmed", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const ids = await join(broker, "mother", "leader");
  await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "kick off" });
  await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "more scope", body: "one more page" });
  const before = snapshot(broker, feature);

  const task = { kind: "task", feature_id: feature, from: "mother", role_from: "mother", to: "leader" };
  const pending = {
    events: [
      read({ ...task, seq: 3, summary: "kick off" }),
      read({ ...task, seq: 4, summary: "more scope", body: "one more page" }),
    ],
  };
  const first = await post(broker.url, "/poll-messages", { id: ids.leader });
  expect(first.status).toBe(200);
  expect(first.json).toEqual(pending);
  expect((await post(broker.url, "/poll-messages", { id: ids.leader })).json).toEqual(pending);
  // nothing was sent to the mother
  expect((await post(broker.url, "/poll-messages", { id: ids.mother })).json).toEqual({ events: [] });
  // reading confirms nothing
  expect(snapshot(broker, feature)).toEqual(before);
});

test("EVT-43: /ack confirms the pending deliveries of the caller among seqs, and no other", async () => {
  broker = await startBroker();
  openFeature(broker.dbFile);
  const ids = await join(broker, "mother", "leader");
  await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "kick off" });
  await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "more scope" });
  await post(broker.url, "/send", { id: ids.leader, kind: "result", to: "mother", summary: "delivered" });

  // The seq of a delivery of another name: it stays pending
  const stranger = await post(broker.url, "/ack", { id: ids.mother, seqs: [3, 4] });
  expect(stranger.json).toEqual({ ok: true });
  expect(readDeliveries(broker.dbFile).map((d) => d.acked_at)).toEqual([null, null, null]);

  const started = Date.now();
  const res = await post(broker.url, "/ack", { id: ids.leader, seqs: [3] });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true });
  const [acked, ...others] = readDeliveries(broker.dbFile);
  expect(acked).toEqual({ event_seq: 3, recipient: "leader", acked_at: expect.any(Number) });
  expect(acked!.acked_at).toBeGreaterThanOrEqual(started);
  expect(acked!.acked_at).toBeLessThanOrEqual(Date.now());
  expect(others).toEqual([
    { event_seq: 4, recipient: "leader", acked_at: null },
    { event_seq: 5, recipient: "mother", acked_at: null },
  ]);
  expect((await post(broker.url, "/poll-messages", { id: ids.leader })).json.events.map((e: any) => e.seq)).toEqual([4]);

  // A delivery already confirmed keeps the moment of its confirmation
  await Bun.sleep(5);
  await post(broker.url, "/ack", { id: ids.leader, seqs: [3, 4] });
  const again = readDeliveries(broker.dbFile);
  expect(again[0]).toEqual(acked!);
  expect(again[1]!.acked_at).toBeGreaterThan(acked!.acked_at!);
  expect((await post(broker.url, "/poll-messages", { id: ids.leader })).json).toEqual({ events: [] });
});

test("EVT-44/49: /ack with seqs that is not a list of integers is refused with missing_field, with no refused and no delivery changed", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const ids = await join(broker, "mother", "leader");
  await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "kick off" });
  const before = snapshot(broker, feature);
  for (const seqs of [undefined, null, 3, "3", { 0: 3 }, [3, "4"], [3.5], ["3"], [null]]) {
    expectRefusal(await post(broker.url, "/ack", { id: ids.leader, seqs }), "missing_field");
  }
  expect(snapshot(broker, feature)).toEqual(before);
});

test("EVT-42/45: a session that falls between the polling and the ack leaves the same events to the next id of the name", async () => {
  broker = await startBroker();
  openFeature(broker.dbFile);
  const ids = await join(broker, "mother", "leader");
  await post(broker.url, "/send", { id: ids.mother, kind: "task", to: "leader", summary: "kick off" });
  const polled = (await post(broker.url, "/poll-messages", { id: ids.leader })).json;
  expect(polled.events.map((e: any) => [e.seq, e.kind, e.summary])).toEqual([[3, "task", "kick off"]]);

  await post(broker.url, "/unregister", { id: ids.leader });
  expectRefusal(await post(broker.url, "/poll-messages", { id: ids.leader }), "unknown_peer");
  const again = await post(broker.url, "/register", { pid: PIDS[1], cwd: "/repo", git_root: null, name: "leader", role: "leader" });
  expect(again.json.id).not.toBe(ids.leader);
  expect((await post(broker.url, "/poll-messages", { id: again.json.id })).json).toEqual(polled);
});

// A feature with a plan of T1 and T2 and the task of T1 to worker-1: the plan is the
// event 3 and the task the event 4
async function planned(b: Broker) {
  const feature = openFeature(b.dbFile);
  const ids = await join(b, "leader", "worker-1");
  await post(b.url, "/plan", {
    id: ids.leader,
    tickets: [
      { ticket_ref: "T1", title: "first" },
      { ticket_ref: "T2", title: "second" },
    ],
  });
  const task = await post(b.url, "/send", {
    id: ids.leader,
    kind: "task",
    to: "worker-1",
    summary: "do the first",
    ticket_ref: "T1",
    loadout: ["tdd"],
    criteria: [1, 2],
  });
  expect(task.json).toEqual({ ok: true, seq: 4 });
  return { feature, leader: ids.leader!, worker: ids["worker-1"]! };
}

test("EVT-69: /history by ticket_ref answers the events of the ticket in the open feature, in the read format", async () => {
  broker = await startBroker();
  const { feature, leader, worker } = await planned(broker);
  await post(broker.url, "/send", { id: leader, kind: "task", to: "worker-2", summary: "do the second", ticket_ref: "T2", loadout: [] });
  await post(broker.url, "/send", {
    id: worker,
    kind: "result",
    to: "judge",
    summary: "first done",
    ticket_ref: "T1",
    task_seq: 4,
    branch: "squad/t1",
    commit: "abc1234",
  });
  const before = snapshot(broker, feature);

  const res = await post(broker.url, "/history", { id: worker, ticket_ref: "T1" });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({
    events: [
      read({
        seq: 4,
        kind: "task",
        feature_id: feature,
        from: "leader",
        role_from: "leader",
        to: "worker-1",
        summary: "do the first",
        ticket_ref: "T1",
        loadout: ["tdd"],
        criteria: [1, 2],
      }),
      read({
        seq: 6,
        kind: "result",
        feature_id: feature,
        from: "worker-1",
        role_from: "worker",
        to: "judge",
        summary: "first done",
        ticket_ref: "T1",
        task_seq: 4,
        branch: "squad/t1",
        commit: "abc1234",
      }),
    ],
  });
  expect((await post(broker.url, "/history", { id: leader, ticket_ref: "T9" })).json).toEqual({ events: [] });
  // a filter sent as null was not sent
  expect((await post(broker.url, "/history", { id: leader, ticket_ref: "T2", question_id: null })).json.events).toHaveLength(1);
  expect(snapshot(broker, feature)).toEqual(before);

  // Once the feature is closed its tickets are of no open feature
  const db = new Database(broker.dbFile);
  db.run("UPDATE features SET closed_seq = 6, outcome = 'delivered'");
  db.close();
  expect((await post(broker.url, "/history", { id: worker, ticket_ref: "T1" })).json).toEqual({ events: [] });
});

test("EVT-69: /history by question_id and by gate_id answers the events with that value in the column", async () => {
  broker = await startBroker();
  const { leader } = await join(broker, "leader");
  // Questions and gates come with later slices: their events are put straight in the log
  const db = new Database(broker.dbFile);
  const insert = (kind: string, column: string, id: number) =>
    db.run(
      `INSERT INTO events (ts, kind, from_name, role_from, summary, body, ${column}, data) VALUES (1, ?, 'leader', 'leader', 's', '', ?, ?)`,
      [kind, id, JSON.stringify({ [column]: id })]
    );
  insert("question", "question_id", 7);
  insert("gate", "gate_id", 7);
  insert("question", "question_id", 8);
  insert("answer", "question_id", 7);
  db.close();

  const question = { feature_id: null, from: "leader", role_from: "leader", to: null, summary: "s", ts: 1, question_id: 7 };
  const byQuestion = await post(broker.url, "/history", { id: leader, question_id: 7 });
  expect(byQuestion.status).toBe(200);
  expect(byQuestion.json).toEqual({
    events: [read({ ...question, seq: 2, kind: "question" }), read({ ...question, seq: 5, kind: "answer" })],
  });
  expect((await post(broker.url, "/history", { id: leader, gate_id: 7 })).json).toEqual({
    events: [read({ seq: 3, ts: 1, kind: "gate", from: "leader", role_from: "leader", summary: "s", gate_id: 7 })],
  });
  expect((await post(broker.url, "/history", { id: leader, gate_id: 8 })).json).toEqual({ events: [] });
});

test("EVT-70/49: /history with no filter, more than one or one of the wrong type is refused with missing_field, with no refused", async () => {
  broker = await startBroker();
  const { feature, leader } = await planned(broker);
  const before = snapshot(broker, feature);
  for (const filter of [
    {},
    { ticket_ref: "T1", question_id: 1 },
    { ticket_ref: "T1", gate_id: 1 },
    { question_id: 1, gate_id: 1 },
    { ticket_ref: "T1", question_id: 1, gate_id: 1 },
    { ticket_ref: 5 },
    { ticket_ref: ["T1"] },
    { question_id: "1" },
    { question_id: 1.5 },
    { gate_id: "1" },
    { gate_id: 1.5 },
    { gate_id: true },
  ]) {
    expectRefusal(await post(broker.url, "/history", { id: leader, ...filter }), "missing_field");
  }
  expect(snapshot(broker, feature)).toEqual(before);
});

test("EVT-71/72/73/80: /state answers the open feature, the ticket of the worker and what it owes", async () => {
  broker = await startBroker();
  const { feature, leader, worker } = await planned(broker);
  const before = snapshot(broker, feature);

  const res = await post(broker.url, "/state", { id: worker });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({
    feature: { id: feature, ...FEATURE },
    ticket: { ticket_ref: "T1", title: "first", task_seq: 4, reworks: 0 },
    owed: [
      { owes: "delivery", seq: 4 },
      { owes: "result", ticket_ref: "T1", seq: 4 },
    ],
  });
  expect((await post(broker.url, "/state", { id: leader })).json).toEqual({
    feature: { id: feature, ...FEATURE },
    ticket: null,
    owed: [],
  });
  expect(snapshot(broker, feature)).toEqual(before);
});

test("EVT-71: /state without an open feature answers feature null, ticket null and nothing owed", async () => {
  broker = await startBroker();
  const { judge } = await join(broker, "judge");
  const res = await post(broker.url, "/state", { id: judge });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ feature: null, ticket: null, owed: [] });
});

test("EVT-50: /blocked stores the blocked of the peer with its ticket and answers its seq", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const ids = await join(broker, "worker-2");
  const res = await post(broker.url, "/blocked", { id: ids["worker-2"], ticket_ref: "T1", ...ROUTES["/blocked"] });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 2 });
  expect(readDb(broker.dbFile).events[1]).toEqual(
    row({
      seq: 2,
      kind: "blocked",
      feature_id: feature,
      from_name: "worker-2",
      role_from: "worker",
      ticket_ref: "T1",
      data: { reason: "waiting", detail: "for the spec", last_action: "read the ticket" },
    })
  );
  expect(readDeliveries(broker.dbFile)).toEqual([]);
});

test("EVT-51/47: /blocked without reason is refused with missing_field and leaves a refused of blocked", async () => {
  broker = await startBroker();
  const { judge } = await join(broker, "judge");
  const before = snapshot(broker);
  expectRefusal(await post(broker.url, "/blocked", { id: judge, detail: "d", last_action: "a" }), "missing_field");
  expectRefused(broker, before, "judge", "blocked", "missing_field");
});

test("EVT-53/59: /unblocked stores the unblocked of the peer, with no feature open", async () => {
  broker = await startBroker();
  const { judge } = await join(broker, "judge");
  const res = await post(broker.url, "/unblocked", { id: judge });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 2 });
  expect(readDb(broker.dbFile).events[1]).toEqual(
    row({ seq: 2, kind: "unblocked", from_name: "judge", role_from: "judge", data: { peer: "judge" } })
  );
});

test("EVT-57/59: /usage stores the six fields of the usage of the peer, with no feature open", async () => {
  broker = await startBroker();
  const { leader } = await join(broker, "leader");
  const res = await post(broker.url, "/usage", { id: leader, ...ROUTES["/usage"] });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 2 });
  expect(readDb(broker.dbFile).events[1]).toEqual(
    row({
      seq: 2,
      kind: "usage",
      from_name: "leader",
      role_from: "leader",
      data: { session_id: "s-1", model: "opus", input: 1, output: 2, cache_write: 3, cache_read: 4 },
    })
  );
});

test("EVT-56/47: /usage with a count that is not an integer is refused with missing_field and leaves a refused of usage", async () => {
  broker = await startBroker();
  const { leader } = await join(broker, "leader");
  const before = snapshot(broker);
  expectRefusal(await post(broker.url, "/usage", { id: leader, ...ROUTES["/usage"], output: "2" }), "missing_field");
  expectRefused(broker, before, "leader", "usage", "missing_field");
});

test("EVT-58: /turn-started stores the turn_started of the peer with the open feature", async () => {
  broker = await startBroker();
  const feature = openFeature(broker.dbFile);
  const { mother } = await join(broker, "mother");
  const res = await post(broker.url, "/turn-started", { id: mother });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 2 });
  expect(readDb(broker.dbFile).events[1]).toEqual(
    row({ seq: 2, kind: "turn_started", feature_id: feature, from_name: "mother", role_from: "mother" })
  );
});

test("EVT-60: /permission-request stores the request of the peer to the human, with no delivery", async () => {
  broker = await startBroker();
  const ids = await join(broker, "worker-3");
  const res = await post(broker.url, "/permission-request", { id: ids["worker-3"], ...ROUTES["/permission-request"] });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 2 });
  expect(readDb(broker.dbFile).events[1]).toEqual(
    row({
      seq: 2,
      kind: "permission_request",
      from_name: "worker-3",
      role_from: "worker",
      to_name: "human",
      summary: "Bash: list files",
      body: "ls",
      data: { request_id: "abcde", tool_name: "Bash", description: "list files", input_preview: "ls" },
    })
  );
  expect(readDeliveries(broker.dbFile)).toEqual([]);
});

test("EVT-61/47: /permission-request without tool_name is refused with missing_field and leaves a refused of permission_request", async () => {
  broker = await startBroker();
  const { judge } = await join(broker, "judge");
  const before = snapshot(broker);
  const res = await post(broker.url, "/permission-request", { id: judge, ...ROUTES["/permission-request"], tool_name: "" });
  expectRefusal(res, "missing_field");
  expectRefused(broker, before, "judge", "permission_request", "missing_field");
});
