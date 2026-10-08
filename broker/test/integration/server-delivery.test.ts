import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { closeSessions, openByRoute, post, readDb, readDeliveries, startBroker, startSession, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

const POLL_MS = 50;
const PERMISSION = "notifications/claude/channel/permission";
const REQUEST = { request_id: "abcde", tool_name: "Bash", description: "list files", input_preview: "ls" };

let broker: Broker | undefined;

afterEach(async () => {
  await closeSessions();
  await broker?.stop();
  broker = undefined;
});

// A session of the name that polls on a short interval. It is not registered yet.
function session(b: Broker, name: string, env: Record<string, string> = {}) {
  return startSession(b.port, {
    SQUAD_NAME: name,
    SQUAD_ROLE: name.startsWith("worker") ? "worker" : name,
    SQUAD_POLL_INTERVAL_MS: String(POLL_MS),
    ...env,
  });
}

// The mother, registered over HTTP: her id, to open the feature, and the task she sends the leader
async function mother(b: Broker, pid = process.pid) {
  const { json } = await post(b.url, "/register", { pid, cwd: "/repo", git_root: null, name: "mother", role: "mother" });
  const send = async (summary: string, body?: string): Promise<number> =>
    (await post(b.url, "/send", { id: json.id, kind: "task", to: "leader", summary, body })).json.seq;
  return { id: json.id as string, send };
}

// The deliveries of a feature_opened: confirmed by the names with a session in the test,
// pending for the others
function opening(seq: number, confirmedBy: string[]) {
  return ["judge", "leader", "worker-1", "worker-2", "worker-3"].map((recipient) => ({
    event_seq: seq,
    recipient,
    acked_at: confirmedBy.includes(recipient) ? expect.any(Number) : null,
  }));
}

const REFUSED = { ok: false, error: "unknown_peer", hint: "-" };

// A stand-in broker: answers /health, so the server starts none, and records the path of every POST
function standIn(answer: (path: string) => unknown) {
  const posts: string[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      const path = new URL(req.url).pathname;
      if (req.method !== "POST") return Response.json({ status: "ok", peers: 0 });
      posts.push(path);
      return Response.json(answer(path));
    },
  });
  return { port: server.port!, posts, stop: () => server.stop(true) };
}

const pending = (b: Broker) => readDeliveries(b.dbFile).filter((d) => d.acked_at === null).map((d) => d.event_seq);

test("EVT-81/82/83: what was sent to the session is pushed through the channel with its seq, once, and then confirmed", async () => {
  broker = await startBroker();
  const b = broker;
  const { id, send } = await mother(b);
  await openByRoute(b.url, id);
  const leader = await session(b, "leader");
  await leader.register();

  const seq = await send("kick off", "the spec is approved");
  expect(seq).toBe(4);
  // sooner than the second of the default interval: SQUAD_POLL_INTERVAL_MS is read
  await waitFor(() => leader.pushed().length > 1, "the push of the task", 700);
  const [opened, push] = leader.pushed();
  expect(opened!.params.meta).toEqual({ kind: "feature_opened", seq: "2", from: "mother" });
  expect(push!.method).toBe("notifications/claude/channel");
  expect(push!.params.meta).toEqual({ kind: "task", seq: "4", from: "mother" });
  expect(push!.params.content).toContain("kick off");
  expect(push!.params.content).toContain("the spec is approved");

  // what is left pending is the feature_opened of the four names with no session
  await waitFor(() => pending(b).length === 4, "the ack of the task");
  expect(readDeliveries(b.dbFile)).toEqual([
    ...opening(2, ["leader"]),
    { event_seq: 4, recipient: "leader", acked_at: expect.any(Number) },
  ]);
  // confirmed: the pollings that follow bring nothing, and it is not pushed again
  await Bun.sleep(POLL_MS * 6);
  expect(leader.pushed()).toHaveLength(2);
});

test("EVT-81: before ready the server does not ask the broker for anything, and what is pending arrives after it, in order", async () => {
  broker = await startBroker();
  const b = broker;
  const { id, send } = await mother(b);
  await openByRoute(b.url, id);
  const first = await send("kick off");
  const second = await send("more scope", "one more page");

  const leader = await session(b, "leader");
  await leader.pingNumber();
  await Bun.sleep(POLL_MS * 8);
  expect(leader.pushed()).toEqual([]);
  expect(pending(b)).toEqual([2, 2, 2, 2, 2, first, second]);

  await leader.register();
  await waitFor(() => leader.pushed().length === 3, "the three pushes");
  expect(leader.pushed().map((p) => [p.params.meta.seq, p.params.meta.kind])).toEqual([
    ["2", "feature_opened"],
    [String(first), "task"],
    [String(second), "task"],
  ]);
  expect(leader.pushed()[2]!.params.content).toContain("more scope");
  expect(leader.pushed()[2]!.params.content).toContain("one more page");
  await waitFor(() => pending(b).length === 4, "the acks");
  expect(readDeliveries(b.dbFile).filter((d) => d.acked_at === null)).toEqual(opening(2, []).filter((d) => d.recipient !== "leader"));
});

test("EVT-81: without SQUAD_POLL_INTERVAL_MS the server polls every second", async () => {
  broker = await startBroker();
  const b = broker;
  const { id, send } = await mother(b);
  await openByRoute(b.url, id);
  const leader = await session(b, "leader", { SQUAD_POLL_INTERVAL_MS: "" });
  await leader.register();
  const registered = Date.now();
  await send("kick off");

  // the first polling comes one interval after the registration
  await Bun.sleep(500);
  expect(leader.pushed()).toEqual([]);
  await waitFor(() => leader.pushed().length === 2, "the push of the task", 2500);
  expect(leader.pushed().map((p) => p.params.meta.kind)).toEqual(["feature_opened", "task"]);
  expect(Date.now() - registered).toBeGreaterThanOrEqual(900);
});

test("EVT-82: the push of an event of a ticket carries the fields of its kind and the ticket_ref", async () => {
  broker = await startBroker();
  const b = broker;
  await openByRoute(b.url, (await mother(b, process.ppid)).id);
  const leader = await post(b.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "leader", role: "leader" });
  await post(b.url, "/plan", { id: leader.json.id, tickets: [{ ticket_ref: "T1", title: "first" }] });
  const task = { id: leader.json.id, kind: "task", to: "worker-1", ticket_ref: "T1", summary: "do the first", loadout: ["tdd"], criteria: [1, 2] };
  expect((await post(b.url, "/send", task)).json).toEqual({ ok: true, seq: 5 });

  const worker = await session(b, "worker-1");
  await worker.register();
  await waitFor(() => worker.pushed().length === 2, "the push of the task");
  expect(worker.pushed()[0]!.params.meta).toEqual({ kind: "feature_opened", seq: "2", from: "mother" });
  const { meta, content } = worker.pushed()[1]!.params;
  expect(meta).toEqual({ kind: "task", seq: "5", from: "leader", ticket_ref: "T1" });
  expect(content).toContain("do the first");
  expect(content).toContain('loadout: ["tdd"]');
  expect(content).toContain("criteria: [1,2]");
});

test("EVT-85: a session with a role declares the permission relay of the channel, and one without a role declares no channel", async () => {
  broker = await startBroker();
  const judge = await session(broker, "judge");
  expect(judge.client.getServerCapabilities()?.experimental).toEqual({
    "claude/channel": {},
    "claude/channel/permission": {},
  });
  const plain = await startSession(broker.port, {});
  expect(plain.client.getServerCapabilities()?.experimental).toBeUndefined();
});

test("EVT-86/87: a permission request of the session is recorded, and the decision comes back as its verdict and not as a push", async () => {
  broker = await startBroker();
  const b = broker;
  const worker = await session(b, "worker-1");
  await worker.register();

  await worker.client.notification({ method: "notifications/claude/channel/permission_request", params: REQUEST });
  await waitFor(() => readDb(b.dbFile).events.length === 2, "the permission_request");
  const asked = readDb(b.dbFile).events[1]!;
  expect([asked.seq, asked.kind, asked.from_name, asked.role_from, asked.to_name, asked.data]).toEqual([
    2,
    "permission_request",
    "worker-1",
    "worker",
    "human",
    REQUEST,
  ]);

  const human_token = readFileSync(b.tokenFile, "utf8").trim();
  const decided = await post(b.url, "/permission-decision", { human_token, request_seq: 2, behavior: "deny" });
  expect(decided.json).toEqual({ ok: true, seq: 3 });

  const verdicts = () => worker.notifications.filter((n) => n.method === PERMISSION);
  await waitFor(() => verdicts().length > 0, "the verdict of the permission");
  expect(verdicts()[0]!.params).toEqual({ request_id: "abcde", behavior: "deny" });
  await waitFor(() => pending(b).length === 0, "the ack of the decision");
  expect(readDeliveries(b.dbFile)).toEqual([{ event_seq: 3, recipient: "worker-1", acked_at: expect.any(Number) }]);

  // once, and never through the channel of the model
  await Bun.sleep(POLL_MS * 6);
  expect(verdicts()).toHaveLength(1);
  expect(worker.pushed()).toEqual([]);
});

test("EVT-88: the decision of a request this process did not record is confirmed with no verdict and no push", async () => {
  broker = await startBroker();
  const b = broker;
  const worker = await session(b, "worker-1");
  await worker.register();
  // The request of a session before this one: recorded with the id, not by this process
  const { id } = readDb(b.dbFile).peers[0]!;
  expect((await post(b.url, "/permission-request", { id, ...REQUEST })).json).toEqual({ ok: true, seq: 2 });

  const human_token = readFileSync(b.tokenFile, "utf8").trim();
  await post(b.url, "/permission-decision", { human_token, request_seq: 2, behavior: "allow" });
  expect(pending(b)).toEqual([3]);
  await waitFor(() => pending(b).length === 0, "the ack of the decision");
  await Bun.sleep(POLL_MS * 4);
  expect(worker.notifications.filter((n) => n.method === PERMISSION)).toEqual([]);
  expect(worker.pushed()).toEqual([]);
});

test("EVT-86: a permission request that arrives before the registration is ignored", async () => {
  broker = await startBroker();
  const b = broker;
  const judge = await session(b, "judge");
  await judge.pingNumber();
  await judge.client.notification({ method: "notifications/claude/channel/permission_request", params: REQUEST });
  await Bun.sleep(300);
  expect(readDb(b.dbFile)).toEqual({ events: [], peers: [] });

  // and it is not kept for later
  await judge.register();
  await Bun.sleep(300);
  expect(readDb(b.dbFile).events.map((e) => e.kind)).toEqual(["peer_joined"]);
});

test("EVT-81/86: before ready the server sends the broker no request, with or without a permission request", async () => {
  const fake = standIn(() => REFUSED);
  try {
    const judge = await startSession(fake.port, { SQUAD_NAME: "judge", SQUAD_ROLE: "judge", SQUAD_POLL_INTERVAL_MS: String(POLL_MS) });
    await judge.pingNumber();
    await judge.client.notification({ method: "notifications/claude/channel/permission_request", params: REQUEST });
    await Bun.sleep(POLL_MS * 8);
    expect(fake.posts).toEqual([]);
  } finally {
    await closeSessions();
    await fake.stop();
  }
});

test("EVT-81: a session whose registration was refused asks the broker for nothing else", async () => {
  const fake = standIn(() => ({ ok: false, error: "role_taken", hint: "Close the other judge." }));
  try {
    const judge = await startSession(fake.port, { SQUAD_NAME: "judge", SQUAD_ROLE: "judge", SQUAD_POLL_INTERVAL_MS: String(POLL_MS) });
    const answer = await judge.ready(await judge.pingNumber());
    expect(answer.isError).toBe(true);
    await Bun.sleep(POLL_MS * 8);
    expect(fake.posts).toEqual(["/register"]);
  } finally {
    await closeSessions();
    await fake.stop();
  }
});

test("EVT-84: an ack the broker refuses is a failed ack: the cycle stops there and the seq is not pushed again", async () => {
  const event = (seq: number) => ({
    seq,
    ts: 1,
    kind: "task",
    feature_id: 1,
    from: "mother",
    role_from: "mother",
    to: "leader",
    summary: `task ${seq}`,
    body: "",
    ticket_ref: null,
  });
  const fake = standIn((path) => {
    if (path === "/register") return { id: "the-id" };
    if (path === "/poll-messages") return { events: [event(3), event(4)] };
    return REFUSED;
  });
  try {
    const leader = await startSession(fake.port, { SQUAD_NAME: "leader", SQUAD_ROLE: "leader", SQUAD_POLL_INTERVAL_MS: String(POLL_MS) });
    await leader.register();
    await waitFor(() => fake.posts.filter((p) => p === "/ack").length >= 3, "three refused acks");
    expect(leader.pushed().map((p) => p.params.meta.seq)).toEqual(["3"]);
  } finally {
    await closeSessions();
    await fake.stop();
  }
});

test("EVT-86: a notification that is not a permission request is not relayed to the broker", async () => {
  broker = await startBroker();
  const b = broker;
  const worker = await session(b, "worker-1");
  await worker.register();
  await worker.client.notification({ method: "notifications/claude/channel/other", params: REQUEST });
  await Bun.sleep(300);
  expect(readDb(b.dbFile).events.map((e) => e.kind)).toEqual(["peer_joined"]);
});

test("EVT-81: what was already pending at the registration waits for the first interval", async () => {
  broker = await startBroker();
  const b = broker;
  const { id, send } = await mother(b);
  await openByRoute(b.url, id);
  await send("kick off");
  const leader = await session(b, "leader", { SQUAD_POLL_INTERVAL_MS: "" });
  await leader.register();

  await Bun.sleep(500);
  expect(leader.pushed()).toEqual([]);
  await waitFor(() => leader.pushed().length === 2, "the push of the task", 2500);
  expect(leader.pushed().map((p) => p.params.meta.kind)).toEqual(["feature_opened", "task"]);
});

test("EVT-81: when its stdin closes the server stops polling and exits", async () => {
  broker = await startBroker();
  const b = broker;
  const { id, send } = await mother(b);
  await openByRoute(b.url, id);
  const leader = await session(b, "leader");
  await leader.register();
  await waitFor(() => pending(b).length === 4, "the ack of the feature_opened");
  const pid = leader.transport.pid!;

  // close() sends SIGTERM 2 s after closing stdin; the exit has to come from the stdin close alone
  const closing = leader.client.close();
  await waitFor(
    () => {
      try {
        process.kill(pid, 0);
        return false;
      } catch {
        return true;
      }
    },
    "the server process to exit",
    1500
  );
  await closing;
  expect(readDb(b.dbFile).events.map((e) => e.kind)).toEqual(["peer_joined", "feature_opened", "peer_joined", "peer_left"]);

  // Nobody asks for what is sent to the name from now on: it stays for its next session
  const seq = await send("kick off");
  await Bun.sleep(POLL_MS * 6);
  expect(pending(b)).toEqual([2, 2, 2, 2, seq]);
});
