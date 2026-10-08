import { afterEach, expect, test } from "bun:test";
import { FEATURE, closeSessions, openByRoute, post, readDb, readDeliveries, startBroker, startSession, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;
type Session = Awaited<ReturnType<typeof startSession>>;

let broker: Broker | undefined;

afterEach(async () => {
  await closeSessions();
  await broker?.stop();
  broker = undefined;
});

// A session of the name, registered: the model answered the ping
async function joined(b: Broker, name: string): Promise<Session> {
  const session = await startSession(b.port, { SQUAD_NAME: name, SQUAD_ROLE: name.startsWith("worker") ? "worker" : name });
  await session.register();
  return session;
}

// The id of a mother registered over HTTP, for the tests whose sessions are of other names
async function motherId(b: Broker): Promise<string> {
  return (await post(b.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "mother", role: "mother" })).json.id;
}

// The message of the error a call ends with, or "answered" if the server ran the tool
function attempt(session: Session, name: string): Promise<string> {
  return session.client.callTool({ name, arguments: {} }).then(
    () => "answered",
    (e) => String(e)
  );
}

// The seq a tool answered in its text
function seqOf(answer: { isError: boolean; text: string }): number {
  expect(answer.isError).toBe(false);
  const found = /\bseq (\d+)\b/.exec(answer.text);
  if (!found) throw new Error(`no seq in "${answer.text}"`);
  return Number(found[1]);
}

const COMMON = ["list_peers", "state", "history", "blocked", "unblocked"];
const SENDING = ["send_task", "send_result", "send_verdict", "plan", "open_feature", "close_feature"];

for (const [name, own] of [
  ["mother", ["send_task", "open_feature", "close_feature"]],
  ["leader", ["plan", "send_task", "send_result"]],
  ["worker-2", ["send_result"]],
  ["judge", ["send_verdict"]],
] as const) {
  test(`EVT-89: after ready ${name} lists the common tools and ${own.join(", ")}, and can call no other`, async () => {
    broker = await startBroker();
    const session = await joined(broker, name);
    expect(await session.toolNames()).toEqual([...COMMON, ...own]);

    const before = readDb(broker.dbFile);
    for (const other of SENDING.filter((tool) => !(own as readonly string[]).includes(tool))) {
      expect(await attempt(session, other)).toContain(`Unknown tool: ${other}`);
    }
    // not even a refused: the call never reached the broker
    expect(readDb(broker.dbFile)).toEqual(before);
  });
}

test("EVT-90: send_task of the mother with an open feature answers the seq, and the event is of the mother", async () => {
  broker = await startBroker();
  const mother = await joined(broker, "mother");
  const feature = await openByRoute(broker.url, readDb(broker.dbFile).peers[0]!.id);

  // The kind is the tool's and the id is the session's, whatever the arguments carry
  const answer = await mother.call("send_task", {
    to: "leader",
    summary: "kick off",
    body: "the spec is approved",
    kind: "verdict",
    id: "not-an-id",
  });
  expect(seqOf(answer)).toBe(3);
  expect(readDb(broker.dbFile).events[2]).toEqual({
    seq: 3,
    ts: expect.any(Number),
    kind: "task",
    feature_id: feature,
    from_name: "mother",
    role_from: "mother",
    to_name: "leader",
    summary: "kick off",
    body: "the spec is approved",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: {},
  });
  expect(readDeliveries(broker.dbFile)).toEqual([
    { event_seq: 2, recipient: "judge", acked_at: null },
    { event_seq: 2, recipient: "leader", acked_at: null },
    { event_seq: 2, recipient: "worker-1", acked_at: null },
    { event_seq: 2, recipient: "worker-2", acked_at: null },
    { event_seq: 2, recipient: "worker-3", acked_at: null },
    { event_seq: 3, recipient: "leader", acked_at: null },
  ]);
});

test("EVT-91: send_task of the mother without an open feature is an error with no_open_feature and the hint of the broker", async () => {
  broker = await startBroker();
  // The hint the broker gives for this refusal, asked over HTTP by another peer
  const leader = await post(broker.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "leader", role: "leader" });
  const refusal = (await post(broker.url, "/send", { id: leader.json.id, kind: "result", to: "mother", summary: "s" })).json;
  expect(refusal.error).toBe("no_open_feature");

  const mother = await joined(broker, "mother");
  const answer = await mother.call("send_task", { to: "leader", summary: "kick off" });
  expect(answer.isError).toBe(true);
  expect(answer.text).toContain("no_open_feature");
  expect(answer.text).toContain(refusal.hint);
  expect(readDb(broker.dbFile).events.at(-1)!.data).toEqual({ peer: "mother", attempted_kind: "task", error: "no_open_feature" });
});

test("EVT-90/92: plan, send_task, send_result and send_verdict take a ticket from the plan to the verdict, each one with its kind", async () => {
  broker = await startBroker();
  const feature = await openByRoute(broker.url, await motherId(broker));
  const leader = await joined(broker, "leader");
  const worker = await joined(broker, "worker-1");
  const judge = await joined(broker, "judge");

  const tickets = [{ ticket_ref: "T1", title: "first" }];
  const plan = seqOf(await leader.call("plan", { tickets }));
  const task = seqOf(
    await leader.call("send_task", { to: "worker-1", summary: "do the first", ticket_ref: "T1", loadout: ["tdd"], criteria: [1] })
  );
  const result = seqOf(
    await worker.call("send_result", {
      to: "judge",
      summary: "first done",
      ticket_ref: "T1",
      task_seq: task,
      branch: "squad/t1",
      commit: "abc1234",
    })
  );
  const criteria = [{ n: 1, text: "it works", pass: true }];
  const verdict = seqOf(
    await judge.call("send_verdict", { to: "leader", summary: "approved", ticket_ref: "T1", result_seq: result, outcome: "approve", criteria })
  );
  // 1 and 2 are the mother joining and the feature_opened, 3 to 5 the three sessions joining
  expect([plan, task, result, verdict]).toEqual([6, 7, 8, 9]);

  const stored = readDb(broker.dbFile).events.slice(5);
  expect(stored.map((e) => [e.seq, e.kind, e.feature_id, e.from_name, e.role_from, e.to_name, e.ticket_ref, e.summary, e.data])).toEqual([
    [6, "plan", feature, "leader", "leader", null, null, "", { tickets }],
    [7, "task", feature, "leader", "leader", "worker-1", "T1", "do the first", { loadout: ["tdd"], criteria: [1] }],
    [8, "result", feature, "worker-1", "worker", "judge", "T1", "first done", { task_seq: 7, branch: "squad/t1", commit: "abc1234" }],
    [9, "verdict", feature, "judge", "judge", "leader", "T1", "approved", { result_seq: 8, outcome: "approve", criteria }],
  ]);
});

test("EVT-91: plan refused by the broker is an error with the error and the hint", async () => {
  broker = await startBroker();
  await openByRoute(broker.url, await motherId(broker));
  const leader = await joined(broker, "leader");
  const answer = await leader.call("plan", { tickets: [] });
  expect(answer.isError).toBe(true);
  expect(answer.text).toContain("missing_field");
  // the hint of plan.ts for a list that is not one of tickets
  expect(answer.text).toContain("Send tickets as a non-empty list of");
  expect(readDb(broker.dbFile).events.map((e) => e.kind)).toEqual(["peer_joined", "feature_opened", "peer_joined", "refused"]);
});

test("EVT-92: blocked and unblocked call their routes with the id of the session and answer the seq", async () => {
  broker = await startBroker();
  const judge = await joined(broker, "judge");

  const blocked = await judge.call("blocked", { reason: "no result to judge", detail: "the branch is empty", last_action: "git log", ticket_ref: "T1" });
  expect(seqOf(blocked)).toBe(2);
  expect(seqOf(await judge.call("unblocked"))).toBe(3);

  const stored = readDb(broker.dbFile).events.slice(1);
  expect(stored.map((e) => [e.seq, e.kind, e.from_name, e.role_from, e.ticket_ref, e.data])).toEqual([
    [2, "blocked", "judge", "judge", "T1", { reason: "no result to judge", detail: "the branch is empty", last_action: "git log" }],
    [3, "unblocked", "judge", "judge", null, { peer: "judge" }],
  ]);

  // EVT-91: a refusal of blocked is an error with what the broker said
  const refused = await judge.call("blocked", { detail: "d", last_action: "a" });
  expect(refused.isError).toBe(true);
  expect(refused.text).toContain("missing_field");
  expect(refused.text).toContain("Send reason as a non-empty string");
});

test("EVT-92: state and history call their routes with the id of the session and answer the content", async () => {
  broker = await startBroker();
  const b = broker;
  const feature = await openByRoute(broker.url, await motherId(broker));
  const leader = await joined(broker, "leader");
  const worker = await joined(broker, "worker-1");
  await leader.call("plan", { tickets: [{ ticket_ref: "T1", title: "first" }] });
  const task = seqOf(await leader.call("send_task", { to: "worker-1", summary: "do the first", ticket_ref: "T1", loadout: [] }));
  expect(task).toBe(6);
  // What the worker reads does not depend on the delivery having been confirmed or not
  const owed = (answer: { text: string }) => JSON.parse(answer.text).owed.filter((o: any) => o.owes !== "delivery");

  const state = await worker.call("state");
  expect(state.isError).toBe(false);
  const said = JSON.parse(state.text);
  expect(Object.keys(said)).toEqual(["feature", "ticket", "owed"]);
  expect(said.feature).toEqual({ id: feature, ...FEATURE });
  expect(said.ticket).toEqual({ ticket_ref: "T1", title: "first", task_seq: 6, reworks: 0 });
  expect(owed(state)).toEqual([{ owes: "result", ticket_ref: "T1", seq: 6 }]);
  // the state is of who asks: the leader owes nothing once its session has read the feature_opened
  await waitFor(
    () => readDeliveries(b.dbFile).some((d) => d.recipient === "leader" && d.acked_at !== null),
    "the leader to confirm the feature_opened",
    3000
  );
  expect(JSON.parse((await leader.call("state")).text)).toEqual({ feature: { id: feature, ...FEATURE }, ticket: null, owed: [] });

  const history = await worker.call("history", { ticket_ref: "T1" });
  expect(history.isError).toBe(false);
  expect(JSON.parse(history.text)).toEqual({
    events: [
      {
        seq: 6,
        ts: expect.any(Number),
        kind: "task",
        feature_id: feature,
        from: "leader",
        role_from: "leader",
        to: "worker-1",
        summary: "do the first",
        body: "",
        ticket_ref: "T1",
        loadout: [],
      },
    ],
  });

  // EVT-91: a refusal of history is an error with what the broker said
  const refused = await worker.call("history", {});
  expect(refused.isError).toBe(true);
  expect(refused.text).toContain("missing_field");
  expect(refused.text).toContain("Send exactly one of ticket_ref");
});
