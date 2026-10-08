import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { features } from "../../shared/derive.ts";
import { get, post, readDb, readDeliveries, startBroker } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

const FIELDS = {
  title: "the importer",
  workflow: "tlc",
  branch: "feat/importer",
  base_branch: "develop",
  spec_ref: ".specs/features/importer/spec.md",
  spec_commit: "9f8e7d6",
};

const OTHER_FIVE = ["judge", "leader", "worker-1", "worker-2", "worker-3"];

// One pid holds one registration, and these are the two live pids a test has at hand
async function register(b: Broker, name: string, pid = process.pid): Promise<string> {
  const res = await post(b.url, "/register", { pid, cwd: "/work/wt", git_root: "/work/importer/.git", name, role: name });
  return res.json.id;
}

function featureRows(b: Broker) {
  const db = new Database(b.dbFile, { readonly: true });
  try {
    return db.query("SELECT * FROM features ORDER BY id").all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}

// A refusal is a 200 with ok false, the error and a hint that says something
function expectRefusal(res: { status: number; json: any }, error: string) {
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: false, error, hint: expect.any(String) });
  expect(res.json.hint).not.toBe("");
}

function toOthers(seq: number) {
  return OTHER_FIVE.map((recipient) => ({ event_seq: seq, recipient, acked_at: null }));
}

test("FEAT-01/07: /open-feature stores the row, the feature_opened and its five deliveries, and answers the id and the seq", async () => {
  broker = await startBroker();
  const id = await register(broker, "mother");
  const res = await post(broker.url, "/open-feature", { id, ...FIELDS, project: "other", feature_id: 9 });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, feature_id: 1, seq: 2 });
  expect(featureRows(broker)).toEqual([
    { id: 1, project: "importer", ...FIELDS, opened_seq: 2, closed_seq: null, outcome: null },
  ]);
  expect(readDb(broker.dbFile).events[1]).toEqual({
    seq: 2,
    ts: expect.any(Number),
    kind: "feature_opened",
    feature_id: 1,
    from_name: "mother",
    role_from: "mother",
    to_name: "*",
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: FIELDS,
  });
  expect(readDeliveries(broker.dbFile)).toEqual(toOthers(2));
});

test("FEAT-03/10: /open-feature with a feature open is refused with feature_already_open and leaves a refused in that feature", async () => {
  broker = await startBroker();
  const id = await register(broker, "mother");
  await post(broker.url, "/open-feature", { id, ...FIELDS });
  const rows = featureRows(broker);
  const before = readDb(broker.dbFile).events;

  expectRefusal(await post(broker.url, "/open-feature", { id, ...FIELDS, title: "the second" }), "feature_already_open");
  expect(readDb(broker.dbFile).events).toEqual([
    ...before,
    {
      seq: 3,
      ts: expect.any(Number),
      kind: "refused",
      feature_id: 1,
      from_name: "broker",
      role_from: "broker",
      to_name: null,
      summary: "",
      body: "",
      ticket_ref: null,
      question_id: null,
      gate_id: null,
      data: { peer: "mother", attempted_kind: "feature_opened", error: "feature_already_open" },
    },
  ]);
  expect(featureRows(broker)).toEqual(rows);
  expect(readDeliveries(broker.dbFile)).toEqual(toOthers(2));
});

test("FEAT-14/21: /close-feature stores the feature_closed, its five deliveries and the outcome in the row, and answers the seq", async () => {
  broker = await startBroker();
  const id = await register(broker, "mother");
  await post(broker.url, "/open-feature", { id, ...FIELDS });
  const res = await post(broker.url, "/close-feature", { id, outcome: "abandoned", body: "the spec was wrong" });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true, seq: 3 });
  expect(featureRows(broker)).toEqual([
    { id: 1, project: "importer", ...FIELDS, opened_seq: 2, closed_seq: 3, outcome: "abandoned" },
  ]);
  expect(readDb(broker.dbFile).events[2]).toEqual({
    seq: 3,
    ts: expect.any(Number),
    kind: "feature_closed",
    feature_id: 1,
    from_name: "mother",
    role_from: "mother",
    to_name: "*",
    summary: "",
    body: "the spec was wrong",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: { outcome: "abandoned" },
  });
  expect(readDeliveries(broker.dbFile)).toEqual([...toOthers(2), ...toOthers(3)]);
});

test("FEAT-16/20: /close-feature without an open feature is refused with no_open_feature and leaves a refused without feature", async () => {
  broker = await startBroker();
  const id = await register(broker, "mother");
  expectRefusal(await post(broker.url, "/close-feature", { id, outcome: "delivered" }), "no_open_feature");
  expect(readDb(broker.dbFile).events[1]).toEqual({
    seq: 2,
    ts: expect.any(Number),
    kind: "refused",
    feature_id: null,
    from_name: "broker",
    role_from: "broker",
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: { peer: "mother", attempted_kind: "feature_closed", error: "no_open_feature" },
  });
  expect(readDb(broker.dbFile).events).toHaveLength(2);
  expect(featureRows(broker)).toEqual([]);
  expect(readDeliveries(broker.dbFile)).toEqual([]);
});

for (const [path, body] of [
  ["/open-feature", FIELDS],
  ["/close-feature", { outcome: "delivered" }],
] as [string, Record<string, unknown>][]) {
  test(`EVT-03: ${path} with an id that is not registered is refused with unknown_peer and leaves no refused`, async () => {
    broker = await startBroker();
    await register(broker, "mother");
    const before = readDb(broker.dbFile).events;
    expectRefusal(await post(broker.url, path, { id: "not-an-id", ...body }), "unknown_peer");
    expectRefusal(await post(broker.url, path, body), "unknown_peer");
    expect(readDb(broker.dbFile).events).toEqual(before);
    expect(featureRows(broker)).toEqual([]);
  });

  test(`EVT-11: ${path} with a body that is not a JSON object is refused with missing_field and leaves no refused`, async () => {
    broker = await startBroker();
    const id = await register(broker, "mother");
    const before = readDb(broker.dbFile).events;
    expectRefusal(await post(broker.url, path, [{ id, ...body }]), "missing_field");
    expectRefusal(await post(broker.url, path, "text"), "missing_field");
    expect(readDb(broker.dbFile).events).toEqual(before);
    expect(featureRows(broker)).toEqual([]);
  });
}

test("FEAT-13: the task of the mother to the leader, refused before, is accepted after /open-feature", async () => {
  broker = await startBroker();
  const id = await register(broker, "mother");
  const kickoff = { id, kind: "task", to: "leader", summary: "build the importer" };
  expectRefusal(await post(broker.url, "/send", kickoff), "no_open_feature");

  const opened = await post(broker.url, "/open-feature", { id, ...FIELDS });
  expect(opened.json.ok).toBe(true);
  expect((await post(broker.url, "/send", kickoff)).json).toEqual({ ok: true, seq: 4 });
  const { events } = (await get(broker.url, "/events")).json;
  expect(events.map((e: any) => [e.seq, e.kind, e.feature_id])).toEqual([
    [1, "peer_joined", null],
    [2, "refused", null],
    [3, "feature_opened", opened.json.feature_id],
    [4, "task", opened.json.feature_id],
  ]);
  expect((await post(broker.url, "/state", { id })).json.feature).toEqual({ id: opened.json.feature_id, ...FIELDS });
});

test("FEAT-07/21: a leader that was offline gets the feature_opened at its first polling, and the mother gets neither of her two", async () => {
  broker = await startBroker();
  const mother = await register(broker, "mother");
  const opened = await post(broker.url, "/open-feature", { id: mother, ...FIELDS });
  const leader = await register(broker, "leader", process.ppid);

  const polled = (await post(broker.url, "/poll-messages", { id: leader })).json.events;
  expect(polled).toEqual([
    {
      seq: opened.json.seq,
      ts: expect.any(Number),
      kind: "feature_opened",
      feature_id: opened.json.feature_id,
      from: "mother",
      role_from: "mother",
      to: "*",
      summary: "",
      body: "",
      ticket_ref: null,
      ...FIELDS,
    },
  ]);

  const closed = await post(broker.url, "/close-feature", { id: mother, outcome: "delivered" });
  expect((await post(broker.url, "/poll-messages", { id: mother })).json).toEqual({ events: [] });
  const again = (await post(broker.url, "/poll-messages", { id: leader })).json.events;
  expect(again.map((e: any) => [e.seq, e.kind])).toEqual([
    [opened.json.seq, "feature_opened"],
    [closed.json.seq, "feature_closed"],
  ]);
  expect(again[1].outcome).toBe("delivered");
});

test("FEAT-27: the features derived from GET /events are the rows of the table without project", async () => {
  broker = await startBroker();
  const id = await register(broker, "mother");
  expect((await post(broker.url, "/open-feature", { id, ...FIELDS })).json.ok).toBe(true);
  expect((await post(broker.url, "/close-feature", { id, outcome: "abandoned" })).json.ok).toBe(true);
  expectRefusal(await post(broker.url, "/close-feature", { id, outcome: "delivered" }), "no_open_feature");
  expect((await post(broker.url, "/open-feature", { id, ...FIELDS, title: "the next one" })).json.ok).toBe(true);

  const { events } = (await get(broker.url, "/events")).json;
  const table = featureRows(broker).map(({ project, ...row }) => row);
  expect(features(events) as object[]).toEqual(table);
  expect(table).toEqual([
    { id: 1, ...FIELDS, opened_seq: 2, closed_seq: 3, outcome: "abandoned" },
    { id: 2, ...FIELDS, title: "the next one", opened_seq: 5, closed_seq: null, outcome: null },
  ]);
});

test("FEAT-28: a broker that comes up again over the same database has the same open feature, or none", async () => {
  const first = await startBroker();
  broker = first;
  const id = await register(first, "mother");
  await post(first.url, "/open-feature", { id, ...FIELDS });

  // the process stops and another one comes up over the same file
  async function restart(b: Broker): Promise<Broker> {
    b.proc.kill();
    await b.proc.exited;
    return (broker = await startBroker({}, b.dir));
  }

  const second = await restart(first);
  expectRefusal(await post(second.url, "/open-feature", { id, ...FIELDS, title: "the second" }), "feature_already_open");
  expect((await post(second.url, "/state", { id })).json.feature).toEqual({ id: 1, ...FIELDS });
  expect((await post(second.url, "/close-feature", { id, outcome: "delivered" })).json.ok).toBe(true);

  const third = await restart(second);
  expectRefusal(await post(third.url, "/close-feature", { id, outcome: "delivered" }), "no_open_feature");
  expect((await post(third.url, "/state", { id })).json.feature).toBeNull();
  expect(featureRows(third).map((f) => [f.id, f.closed_seq === null])).toEqual([[1, false]]);
});
