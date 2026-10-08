import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { closeSessions, openFeature, post, readDb, readDeliveries, startBroker, startSession, waitFor } from "./helpers.ts";

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

// The mother, registered over HTTP, to send the leader its tasks
async function mother(b: Broker): Promise<(summary: string, body?: string) => Promise<number>> {
  const { json } = await post(b.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "mother", role: "mother" });
  return async (summary, body) => (await post(b.url, "/send", { id: json.id, kind: "task", to: "leader", summary, body })).json.seq;
}

const pending = (b: Broker) => readDeliveries(b.dbFile).filter((d) => d.acked_at === null).map((d) => d.event_seq);

test("EVT-81/82/83: what was sent to the session is pushed through the channel with its seq, once, and then confirmed", async () => {
  broker = await startBroker();
  const b = broker;
  openFeature(b.dbFile);
  const send = await mother(b);
  const leader = await session(b, "leader");
  await leader.register();

  const seq = await send("kick off", "the spec is approved");
  expect(seq).toBe(3);
  // sooner than the second of the default interval: SQUAD_POLL_INTERVAL_MS is read
  await waitFor(() => leader.pushed().length > 0, "the push of the task", 700);
  const [push] = leader.pushed();
  expect(push!.method).toBe("notifications/claude/channel");
  expect(push!.params.meta).toEqual({ kind: "task", seq: "3", from: "mother" });
  expect(push!.params.content).toContain("kick off");
  expect(push!.params.content).toContain("the spec is approved");

  await waitFor(() => pending(b).length === 0, "the ack of the task");
  expect(readDeliveries(b.dbFile)).toEqual([{ event_seq: 3, recipient: "leader", acked_at: expect.any(Number) }]);
  // confirmed: the pollings that follow bring nothing, and it is not pushed again
  await Bun.sleep(POLL_MS * 6);
  expect(leader.pushed()).toHaveLength(1);
});

test("EVT-81: before ready the server does not ask the broker for anything, and what is pending arrives after it, in order", async () => {
  broker = await startBroker();
  const b = broker;
  openFeature(b.dbFile);
  const send = await mother(b);
  const first = await send("kick off");
  const second = await send("more scope", "one more page");

  const leader = await session(b, "leader");
  await leader.pingNumber();
  await Bun.sleep(POLL_MS * 8);
  expect(leader.pushed()).toEqual([]);
  expect(pending(b)).toEqual([first, second]);

  await leader.register();
  await waitFor(() => leader.pushed().length === 2, "the two pushes");
  expect(leader.pushed().map((p) => [p.params.meta.seq, p.params.meta.kind])).toEqual([
    [String(first), "task"],
    [String(second), "task"],
  ]);
  expect(leader.pushed()[1]!.params.content).toContain("more scope");
  expect(leader.pushed()[1]!.params.content).toContain("one more page");
  await waitFor(() => pending(b).length === 0, "the acks");
});

test("EVT-81: without SQUAD_POLL_INTERVAL_MS the server polls every second", async () => {
  broker = await startBroker();
  const b = broker;
  openFeature(b.dbFile);
  const send = await mother(b);
  const leader = await session(b, "leader", { SQUAD_POLL_INTERVAL_MS: "" });
  await leader.register();
  const registered = Date.now();
  await send("kick off");

  // the first polling comes one interval after the registration
  await Bun.sleep(500);
  expect(leader.pushed()).toEqual([]);
  await waitFor(() => leader.pushed().length === 1, "the push of the task", 2500);
  expect(Date.now() - registered).toBeGreaterThanOrEqual(900);
});

test("EVT-82: the push of an event of a ticket carries the fields of its kind and the ticket_ref", async () => {
  broker = await startBroker();
  const b = broker;
  openFeature(b.dbFile);
  const leader = await post(b.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "leader", role: "leader" });
  await post(b.url, "/plan", { id: leader.json.id, tickets: [{ ticket_ref: "T1", title: "first" }] });
  const task = { id: leader.json.id, kind: "task", to: "worker-1", ticket_ref: "T1", summary: "do the first", loadout: ["tdd"], criteria: [1, 2] };
  expect((await post(b.url, "/send", task)).json).toEqual({ ok: true, seq: 3 });

  const worker = await session(b, "worker-1");
  await worker.register();
  await waitFor(() => worker.pushed().length === 1, "the push of the task");
  const { meta, content } = worker.pushed()[0]!.params;
  expect(meta).toEqual({ kind: "task", seq: "3", from: "leader", ticket_ref: "T1" });
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

test("EVT-81: when its stdin closes the server stops polling and exits", async () => {
  broker = await startBroker();
  const b = broker;
  openFeature(b.dbFile);
  const send = await mother(b);
  const leader = await session(b, "leader");
  await leader.register();
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
  expect(readDb(b.dbFile).events.map((e) => e.kind)).toEqual(["peer_joined", "peer_joined", "peer_left"]);

  // Nobody asks for what is sent to the name from now on: it stays for its next session
  const seq = await send("kick off");
  await Bun.sleep(POLL_MS * 6);
  expect(pending(b)).toEqual([seq]);
});
