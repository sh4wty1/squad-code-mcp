import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { get, openFeature, post, readDb, readDeliveries, startBroker } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

// The mother and the leader, each registered with one of the two live pids a test has at hand,
// and a feature open, without plan. Returns the id of each one and the one of the feature.
async function squad(b: Broker) {
  const ids: Record<string, string> = {};
  for (const [name, pid] of [["mother", b.proc.pid], ["leader", process.ppid]] as const) {
    ids[name] = (await post(b.url, "/register", { pid, cwd: "/repo", git_root: null, name, role: name })).json.id;
  }
  return { mother: ids.mother!, leader: ids.leader!, feature: await openFeature(b.url, ids.mother!) };
}

const DELIVERY = {
  scope: "delivery",
  summary: "deliver the importer",
  body: "two tickets, both approved",
  action: "merge feat/x into main",
  effect: "main gets the importer",
  commit: "abc1234",
  diffstat: " 2 files changed, 40 insertions(+)",
};

// The rows of `gates`, read straight from the database file of the broker
function gateRows(b: Broker) {
  const db = new Database(b.dbFile, { readonly: true });
  try {
    return db.query("SELECT * FROM gates ORDER BY id").all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}

function snapshot(b: Broker) {
  return { ...readDb(b.dbFile), deliveries: readDeliveries(b.dbFile), gates: gateRows(b) };
}

const humanToken = (b: Broker) => readFileSync(b.tokenFile, "utf8").trim();

// EVT-11: a refusal is a 200 with ok false, the error and a hint that says something
function expectRefusal(res: { status: number; json: any }, error: string) {
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: false, error, hint: expect.any(String) });
  expect(res.json.hint).not.toBe("");
}

test("GAT-26/05/20: delivered is refused with gate_required until the mother asks the gate by /gate and the dev approves it by /gate-decision", async () => {
  broker = await startBroker();
  const b = broker;
  const { mother, feature } = await squad(b);

  expectRefusal(await post(b.url, "/close-feature", { id: mother, outcome: "delivered" }), "gate_required");
  expect(readDb(b.dbFile).events.at(-1)!.data).toEqual({ peer: "mother", attempted_kind: "feature_closed", error: "gate_required" });

  // 5: the gate, 6: its decision; 4 is the refused
  expect((await post(b.url, "/gate", { id: mother, ...DELIVERY })).json).toEqual({ ok: true, gate_id: 1, seq: 5 });
  const gate = ((await get(b.url, "/events?after=4")).json.events as any[])[0];
  expect(gate).toEqual({
    seq: 5,
    ts: expect.any(Number),
    kind: "gate",
    feature_id: feature,
    from: "mother",
    role_from: "mother",
    to: "human",
    summary: "deliver the importer",
    body: "two tickets, both approved",
    ticket_ref: null,
    gate_id: 1,
    scope: "delivery",
    action: "merge feat/x into main",
    effect: "main gets the importer",
    commit: "abc1234",
    diffstat: " 2 files changed, 40 insertions(+)",
  });
  expect(gateRows(b)).toEqual([
    { id: 1, feature_id: feature, requested_by: "mother", scope: "delivery", commit: "abc1234", status: "pending", request_seq: 5, decision_seq: null },
  ]);
  expectRefusal(await post(b.url, "/close-feature", { id: mother, outcome: "delivered" }), "gate_required");

  // the id of a peer that comes along makes no difference: the human credential decides
  const decided = await post(b.url, "/gate-decision", { id: mother, human_token: humanToken(b), gate_id: 1, decision: "approve" });
  expect(decided.json).toEqual({ ok: true, seq: 7 });
  const polled = (await post(b.url, "/poll-messages", { id: mother })).json.events as any[];
  expect(polled).toEqual([
    {
      seq: 7,
      ts: expect.any(Number),
      kind: "gate_decision",
      feature_id: feature,
      from: "human",
      role_from: "human",
      to: "mother",
      summary: "G-01 aprovado",
      body: "",
      ticket_ref: null,
      gate_id: 1,
      decision: "approve",
    },
  ]);
  expect(gateRows(b)[0]).toMatchObject({ status: "approved", decision_seq: 7 });
  expectRefusal(await post(b.url, "/gate-decision", { human_token: humanToken(b), gate_id: 1, decision: "approve" }), "gate_closed");

  expect((await post(b.url, "/close-feature", { id: mother, outcome: "delivered" })).json).toEqual({ ok: true, seq: 8 });
  expect(readDb(b.dbFile).events.at(-1)).toMatchObject({ seq: 8, kind: "feature_closed", data: { outcome: "delivered" } });
});

test("GAT-07: an id nobody has is refused with unknown_peer on /gate before any rule, and leaves no event", async () => {
  broker = await startBroker();
  const b = broker;
  await squad(b);
  const before = snapshot(b);
  // a body that every other rule would refuse too
  expectRefusal(await post(b.url, "/gate", { id: "not-an-id" }), "unknown_peer");
  expectRefusal(await post(b.url, "/gate", { ...DELIVERY }), "unknown_peer");
  expect(snapshot(b)).toEqual(before);
});

test("GAT-05/08: the leader that asks a gate by the route is refused with edge_not_allowed and its refused", async () => {
  broker = await startBroker();
  const b = broker;
  const { leader, feature } = await squad(b);
  expectRefusal(await post(b.url, "/gate", { id: leader, ...DELIVERY }), "edge_not_allowed");
  expect(readDb(b.dbFile).events.at(-1)).toMatchObject({
    kind: "refused",
    feature_id: feature,
    data: { peer: "leader", attempted_kind: "gate", error: "edge_not_allowed" },
  });
  expect(gateRows(b)).toEqual([]);
});

test("GAT-20: /gate-decision with a wrong, an absent or a peer credential is refused with invalid_token and records nothing", async () => {
  broker = await startBroker();
  const b = broker;
  const { mother, leader } = await squad(b);
  await post(b.url, "/gate", { id: mother, ...DELIVERY });
  const before = snapshot(b);
  for (const body of [
    { human_token: "not-the-token", gate_id: 1, decision: "approve" },
    { gate_id: 1, decision: "approve" },
    { id: mother, human_token: leader, gate_id: 1, decision: "approve" },
    // the order of GAT-25: the credential before the fields
    { human_token: "not-the-token", gate_id: "1" },
  ]) {
    expectRefusal(await post(b.url, "/gate-decision", body), "invalid_token");
  }
  expect(snapshot(b)).toEqual(before);
});

test("GAT-11: /send with the kind gate or gate_decision is refused with invalid_kind, and the hint names the route of each", async () => {
  broker = await startBroker();
  const b = broker;
  const { mother } = await squad(b);
  const gate = await post(b.url, "/send", { id: mother, kind: "gate", to: "human", summary: "deliver" });
  expectRefusal(gate, "invalid_kind");
  expect(gate.json.hint).toContain("/gate");
  expect(gate.json.hint).not.toContain("/gate-decision");
  const decision = await post(b.url, "/send", { id: mother, kind: "gate_decision", to: "mother", summary: "ok" });
  expectRefusal(decision, "invalid_kind");
  expect(decision.json.hint).toContain("/gate-decision");
  expect(gateRows(b)).toEqual([]);
});
