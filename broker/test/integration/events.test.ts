import { afterEach, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import { FEATURE, get, openFeature, post, readDb, readDeliveries, startBroker, tempDir } from "./helpers.ts";

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

// An event in the read format: the envelope and the fields of the kind at the same level
function read(fields: Record<string, unknown>) {
  return { ts: expect.any(Number), feature_id: null, to: null, summary: "", body: "", ticket_ref: null, ...fields };
}

function expectRefusal(res: { status: number; json: any }, error: string) {
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: false, error, hint: expect.any(String) });
  expect(res.json.hint).not.toBe("");
}

const REQUEST = { request_id: "abcde", tool_name: "Bash", description: "list files", input_preview: "ls" };

test("EVT-67: GET /events on an empty log answers no events and last_seq 0", async () => {
  broker = await startBroker();
  const res = await get(broker.url, "/events");
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ events: [], last_seq: 0 });
  expect((await get(broker.url, "/events?after=0")).json).toEqual({ events: [], last_seq: 0 });
});

test("EVT-67: GET /events answers the events after the cursor, of any feature and of none, and the last seq of the log", async () => {
  broker = await startBroker();
  // 1 with no feature open, 2 and 3 in the feature
  const { mother } = await join(broker, "mother");
  const feature = openFeature(broker.dbFile);
  await post(broker.url, "/turn-started", { id: mother });
  await post(broker.url, "/send", { id: mother, kind: "task", to: "leader", summary: "kick off", body: "go" });

  const joined = read({ seq: 1, kind: "peer_joined", from: "broker", role_from: "broker", peer: "mother", role: "mother" });
  const turn = read({ seq: 2, kind: "turn_started", feature_id: feature, from: "mother", role_from: "mother" });
  const task = read({
    seq: 3,
    kind: "task",
    feature_id: feature,
    from: "mother",
    role_from: "mother",
    to: "leader",
    summary: "kick off",
    body: "go",
  });

  const afterOne = await get(broker.url, "/events?after=1");
  expect(afterOne.status).toBe(200);
  expect(afterOne.json).toEqual({ events: [turn, task], last_seq: 3 });
  // without after the cursor is 0
  expect((await get(broker.url, "/events")).json).toEqual({ events: [joined, turn, task], last_seq: 3 });
  expect((await get(broker.url, "/events?after=0")).json).toEqual({ events: [joined, turn, task], last_seq: 3 });
  expect((await get(broker.url, "/events?after=2")).json).toEqual({ events: [task], last_seq: 3 });
  // at the last seq and beyond it there is nothing to read, and the cursor is still the last seq
  expect((await get(broker.url, "/events?after=3")).json).toEqual({ events: [], last_seq: 3 });
  expect((await get(broker.url, "/events?after=50")).json).toEqual({ events: [], last_seq: 3 });
  // reading writes nothing
  expect(readDb(broker.dbFile).events).toHaveLength(3);
});

test("EVT-68/49: GET /events with after that is not an integer of zero or more answers 200 invalid_field, with no refused", async () => {
  broker = await startBroker();
  await join(broker, "mother");
  for (const after of ["-1", "1.5", "abc", "", "1e2", "0x1", "1,2"]) {
    expectRefusal(await get(broker.url, `/events?after=${after}`), "invalid_field");
  }
  expect(readDb(broker.dbFile).events).toHaveLength(1);
});

test("EVT-12: a POST to /events answers 404", async () => {
  broker = await startBroker();
  expect((await post(broker.url, "/events", { after: 0 })).status).toBe(404);
});

test("EVT-62/66: the broker creates the human credential when it starts, and the decision with it is stored and reaches the peer", async () => {
  broker = await startBroker();
  expect(existsSync(broker.tokenFile)).toBe(true);
  const token = readFileSync(broker.tokenFile, "utf8").trim();
  expect(token.length).toBeGreaterThanOrEqual(32);

  const ids = await join(broker, "worker-1");
  const worker = ids["worker-1"]!;
  const asked = await post(broker.url, "/permission-request", { id: worker, ...REQUEST });
  expect(asked.json).toEqual({ ok: true, seq: 2 });

  const decided = await post(broker.url, "/permission-decision", { human_token: token, request_seq: 2, behavior: "allow" });
  expect(decided.status).toBe(200);
  expect(decided.json).toEqual({ ok: true, seq: 3 });
  const { events } = readDb(broker.dbFile);
  expect(events[2]).toEqual({
    seq: 3,
    ts: expect.any(Number),
    kind: "permission_decision",
    feature_id: null,
    from_name: "human",
    role_from: "human",
    to_name: "worker-1",
    summary: "allow: Bash",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: { request_seq: 2, behavior: "allow" },
  });
  expect(readDeliveries(broker.dbFile)).toEqual([{ event_seq: 3, recipient: "worker-1", acked_at: null }]);

  const polled = await post(broker.url, "/poll-messages", { id: worker });
  expect(polled.json).toEqual({
    events: [
      read({
        seq: 3,
        kind: "permission_decision",
        from: "human",
        role_from: "human",
        to: "worker-1",
        summary: "allow: Bash",
        request_seq: 2,
        behavior: "allow",
      }),
    ],
  });

  // The credential is in no answer and in no event
  const log = await (await fetch(`${broker.url}/events`)).text();
  const state = await post(broker.url, "/state", { id: worker });
  for (const said of [asked.json, decided.json, polled.json, state.json, events, log]) {
    expect(typeof said === "string" ? said : JSON.stringify(said)).not.toContain(token);
  }
});

test("EVT-62: the broker reuses the human credential of a file that is already there", async () => {
  const dir = tempDir();
  const token = "a-credential-the-dev-already-has-0123456789";
  writeFileSync(joinPath(dir, "squad.token"), token);
  broker = await startBroker({}, dir);
  expect(readFileSync(broker.tokenFile, "utf8")).toBe(token);

  const { judge } = await join(broker, "judge");
  await post(broker.url, "/permission-request", { id: judge, ...REQUEST });
  const decided = await post(broker.url, "/permission-decision", { human_token: token, request_seq: 2, behavior: "deny" });
  expect(decided.json).toEqual({ ok: true, seq: 3 });
  expect(readDb(broker.dbFile).events[2]!.summary).toBe("deny: Bash");
});

test("EVT-65/49: /permission-decision with a wrong or absent credential answers invalid_token before anything else and stores nothing", async () => {
  broker = await startBroker();
  const token = readFileSync(broker.tokenFile, "utf8").trim();
  const { judge } = await join(broker, "judge");
  await post(broker.url, "/permission-request", { id: judge, ...REQUEST });
  const before = readDb(broker.dbFile);

  const valid = { request_seq: 2, behavior: "allow" };
  for (const body of [
    { ...valid },
    { ...valid, human_token: "not-the-token" },
    { ...valid, human_token: token + "x" },
    { ...valid, human_token: null },
    { ...valid, human_token: 5 },
    // the id of a peer is not the credential of the human
    { ...valid, human_token: judge, id: judge },
    // and the token comes before the rest of the body
    { human_token: "not-the-token" },
    { human_token: "not-the-token", request_seq: 99, behavior: "maybe" },
  ]) {
    const res = await post(broker.url, "/permission-decision", body);
    expectRefusal(res, "invalid_token");
    expect(JSON.stringify(res.json)).not.toContain(token);
  }
  expect(readDb(broker.dbFile)).toEqual(before);
  expect(readDeliveries(broker.dbFile)).toEqual([]);
});

test("EVT-63/64/49: the other refusals of /permission-decision answer their error and leave no refused", async () => {
  broker = await startBroker();
  const human_token = readFileSync(broker.tokenFile, "utf8").trim();
  const { judge } = await join(broker, "judge");
  await post(broker.url, "/permission-request", { id: judge, ...REQUEST });
  const before = readDb(broker.dbFile);

  const decide = (body: Record<string, unknown>) => post(broker!.url, "/permission-decision", { human_token, ...body });
  expectRefusal(await decide({ request_seq: "2", behavior: "allow" }), "missing_field");
  expectRefusal(await decide({ request_seq: 2 }), "missing_field");
  expectRefusal(await decide({ request_seq: 2, behavior: "maybe" }), "invalid_field");
  // the seq 1 is the peer_joined of the judge, not a request
  expectRefusal(await decide({ request_seq: 1, behavior: "allow" }), "invalid_field");
  expect(readDb(broker.dbFile)).toEqual(before);

  expect((await decide({ request_seq: 2, behavior: "deny" })).json).toEqual({ ok: true, seq: 3 });
  const decided = readDb(broker.dbFile);
  expectRefusal(await decide({ request_seq: 2, behavior: "allow" }), "permission_closed");
  expect(readDb(broker.dbFile)).toEqual(decided);
  expect(readDeliveries(broker.dbFile)).toHaveLength(1);
});

test("EVT-12: POST /permission-decision without a JSON object is refused with missing_field and stores nothing", async () => {
  broker = await startBroker();
  for (const body of [undefined, "xx", "null", "[]", JSON.stringify("id")]) {
    const res = await fetch(`${broker.url}/permission-decision`, { method: "POST", body });
    expectRefusal({ status: res.status, json: await res.json() }, "missing_field");
  }
  expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] });
});

test("EVT-78: a broker started again over the same database answers the same and applies the same refusals of state", async () => {
  const first = await startBroker();
  broker = first;
  const feature = openFeature(first.dbFile);
  const ids = await join(first, "leader", "worker-1");
  const leader = ids.leader!;
  const worker = ids["worker-1"]!;
  await post(first.url, "/plan", { id: leader, tickets: [{ ticket_ref: "T1", title: "first" }] });
  const task = { id: leader, kind: "task", to: "worker-1", ticket_ref: "T1", loadout: [] };
  // 4 is the task and 5 the task that replaces it
  await post(first.url, "/send", { ...task, summary: "do the first" });
  await post(first.url, "/send", { ...task, summary: "do the first, and the page too" });

  const answers = async (b: Broker) => ({
    state: (await post(b.url, "/state", { id: worker })).json,
    polled: (await post(b.url, "/poll-messages", { id: worker })).json,
    log: (await get(b.url, "/events")).json,
  });
  const before = await answers(first);
  expect(before.state).toEqual({
    feature: { id: feature, ...FEATURE },
    ticket: { ticket_ref: "T1", title: "first", task_seq: 5, reworks: 0 },
    owed: [
      { owes: "delivery", seq: 4 },
      { owes: "delivery", seq: 5 },
      { owes: "result", ticket_ref: "T1", seq: 5 },
    ],
  });
  expect(before.polled.events.map((e: any) => e.seq)).toEqual([4, 5]);
  expect(before.log.last_seq).toBe(5);

  // Stops the process and keeps its files
  first.proc.kill();
  await first.proc.exited;
  const second = await startBroker({}, first.dir);
  broker = second;
  expect(second.port).not.toBe(first.port);
  expect(await answers(second)).toEqual(before);

  const result = { id: worker, kind: "result", to: "judge", summary: "done", ticket_ref: "T1", branch: "squad/t1", commit: "abc1234" };
  expectRefusal(await post(second.url, "/send", { ...result, task_seq: 4 }), "stale_reference");
  expect((await post(second.url, "/send", { ...result, task_seq: 5 })).json).toEqual({ ok: true, seq: 7 });
});
