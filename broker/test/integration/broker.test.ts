import { afterEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../db.ts";
import { createPeers } from "../../peers.ts";
import { post, readDb, startBroker, tempDir, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

function register(b: Broker, name: string, role: string, pid = process.pid) {
  return post(b.url, "/register", { pid, cwd: process.cwd(), git_root: null, name, role });
}

// The pid of a process that has already exited
async function deadPid(): Promise<number> {
  const child = Bun.spawn([process.execPath, "-e", ""], { stdio: ["ignore", "ignore", "ignore"] });
  await child.exited;
  return child.pid;
}

test("PEER-22: /health answers status ok and the number of registered peers", async () => {
  broker = await startBroker();
  const before = await fetch(`${broker.url}/health`);
  expect(before.status).toBe(200);
  expect(await before.json()).toEqual({ status: "ok", peers: 0 });
  await register(broker, "mother", "mother");
  expect(await (await fetch(`${broker.url}/health`)).json()).toEqual({ status: "ok", peers: 1 });
});

test("PEER-01/02: /register answers { id } and the broker stores peer and peer_joined", async () => {
  broker = await startBroker();
  const res = await register(broker, "leader", "leader");
  expect(res.status).toBe(200);
  expect(Object.keys(res.json)).toEqual(["id"]);
  expect(typeof res.json.id).toBe("string");
  const { peers, events } = readDb(broker.dbFile);
  expect(peers.map((p) => [p.id, p.name, p.role, p.pid])).toEqual([[res.json.id, "leader", "leader", process.pid]]);
  expect(events.map((e) => [e.kind, e.from_name, e.data])).toEqual([
    ["peer_joined", "broker", { peer: "leader", role: "leader" }],
  ]);
});

test("PEER-37: a refusal is a 200 with ok false, the error and a hint", async () => {
  broker = await startBroker();
  const res = await register(broker, "boss", "boss");
  expect(res.status).toBe(200);
  expect(res.json.ok).toBe(false);
  expect(res.json.error).toBe("invalid_role");
  expect(typeof res.json.hint).toBe("string");
  expect(res.json.hint.length).toBeGreaterThan(0);
  expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] });
});

test("PEER-21: /heartbeat answers ok and moves last_seen forward", async () => {
  broker = await startBroker();
  const { json } = await register(broker, "judge", "judge");
  const before = readDb(broker.dbFile).peers[0]!;
  await Bun.sleep(20);
  const res = await post(broker.url, "/heartbeat", { id: json.id });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true });
  const after = readDb(broker.dbFile).peers[0]!;
  expect(after.last_seen).toBeGreaterThan(before.last_seen);
  expect(after.last_seen).toBeLessThanOrEqual(Date.now());
  expect(after.registered_at).toBe(before.registered_at);

  const unknown = await post(broker.url, "/heartbeat", { id: "not-an-id" });
  expect(unknown.status).toBe(200);
  expect(unknown.json).toEqual({ ok: true });
});

test("PEER-16/17/18: /list-peers answers the other names without ids, and refuses an unknown id", async () => {
  broker = await startBroker();
  const mother = (await register(broker, "mother", "mother")).json;
  // a second live pid: one pid holds one registration
  const leader = (await register(broker, "leader", "leader", process.ppid)).json;
  const res = await post(broker.url, "/list-peers", { id: mother.id });
  expect(res.status).toBe(200);
  expect(res.json).toEqual([
    { name: "leader", role: "leader", online: true },
    { name: "judge", role: "judge", online: false },
    { name: "worker-1", role: "worker", online: false },
    { name: "worker-2", role: "worker", online: false },
    { name: "worker-3", role: "worker", online: false },
  ]);
  expect(JSON.stringify(res.json)).not.toContain(leader.id);

  const unknown = await post(broker.url, "/list-peers", { id: "not-an-id" });
  expect(unknown.status).toBe(200);
  expect(unknown.json.ok).toBe(false);
  expect(unknown.json.error).toBe("unknown_peer");
  expect(unknown.json.hint.length).toBeGreaterThan(0);
});

test("PEER-11/12: /unregister answers ok, logs peer_left once and accepts an unknown id", async () => {
  broker = await startBroker();
  const { json } = await register(broker, "worker-1", "worker");
  const res = await post(broker.url, "/unregister", { id: json.id });
  expect(res.status).toBe(200);
  expect(res.json).toEqual({ ok: true });
  const again = await post(broker.url, "/unregister", { id: json.id });
  expect(again.status).toBe(200);
  expect(again.json).toEqual({ ok: true });
  const { peers, events } = readDb(broker.dbFile);
  expect(peers).toEqual([]);
  expect(events.map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "worker-1", role: "worker" }],
    ["peer_left", { peer: "worker-1", reason: "unregistered" }],
  ]);
});

for (const path of ["/set-summary", "/send-message", "/poll-messages", "/nope"]) {
  test(`PEER-23: POST ${path} answers 404`, async () => {
    broker = await startBroker();
    const res = await post(broker.url, path, { id: "x", summary: "s", from_id: "a", to_id: "b", text: "t" });
    expect(res.status).toBe(404);
  });
}

test("PEER-19: without SQUAD_DB the database is created in the home directory the system reports", async () => {
  const home = tempDir();
  // os.homedir() reads USERPROFILE on Windows and HOME elsewhere
  const env: Record<string, string> =
    process.platform === "win32" ? { USERPROFILE: home, HOME: "" } : { HOME: home };
  broker = await startBroker({ SQUAD_DB: "", ...env }, home);
  expect(existsSync(join(home, ".squad-code-mcp.db"))).toBe(true);
  expect(existsSync(broker.dbFile)).toBe(false);
});

test("PEER-38: the cleanup runs when the broker starts", async () => {
  const dir = tempDir();
  const seeded = openDatabase(join(dir, "squad.db"));
  createPeers(seeded, () => true).register({
    pid: await deadPid(),
    cwd: "/repo",
    git_root: null,
    name: "mother",
    role: "mother",
  });
  seeded.close();

  broker = await startBroker({}, dir);
  const { peers, events } = readDb(broker.dbFile);
  expect(peers).toEqual([]);
  expect(events.map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "mother", role: "mother" }],
    ["peer_left", { peer: "mother", reason: "died" }],
  ]);
});

test("PEER-38/13: the cleanup runs again on its interval and logs the peer that died", async () => {
  broker = await startBroker({ SQUAD_CLEANUP_INTERVAL_MS: "100" });
  const res = await register(broker, "judge", "judge", await deadPid());
  expect(res.json).toHaveProperty("id");
  const b = broker;
  await waitFor(() => readDb(b.dbFile).peers.length === 0, "the cleanup to remove the dead peer");
  expect(readDb(b.dbFile).events.map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "judge", role: "judge" }],
    ["peer_left", { peer: "judge", reason: "died" }],
  ]);
});

for (const [what, body] of [["no body", undefined], ["a body that is not JSON", "xx"]] as const) {
  test(`PEER-23: POST to an unknown route with ${what} answers 404`, async () => {
    broker = await startBroker();
    const res = await fetch(`${broker.url}/send-message`, { method: "POST", body });
    expect(res.status).toBe(404);
  });
}

for (const path of ["/register", "/heartbeat", "/list-peers", "/unregister"]) {
  test(`PEER-39: POST ${path} without a JSON object is refused with missing_field`, async () => {
    broker = await startBroker();
    for (const body of [undefined, "xx", "null", "[]", JSON.stringify("id")]) {
      const res = await fetch(`${broker.url}${path}`, { method: "POST", body });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; error: string; hint: string };
      expect(json.ok).toBe(false);
      expect(json.error).toBe("missing_field");
      expect(json.hint.length).toBeGreaterThan(0);
    }
    expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] });
  });
}

test("PEER-20: the broker answers on 127.0.0.1 and not on the other addresses of the machine", async () => {
  broker = await startBroker();
  expect((await fetch(`http://127.0.0.1:${broker.port}/health`)).status).toBe(200);
  const others = Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && !a.internal)
    .map((a) => a!.address);
  // a machine with no network has nothing else to answer on
  const { port } = broker;
  const reached = await Promise.all(
    others.map((address) =>
      fetch(`http://${address}:${port}/health`, { signal: AbortSignal.timeout(3000) }).then(
        () => address,
        () => null
      )
    )
  );
  expect(reached.filter((address) => address !== null)).toEqual([]);
}, 10000);

test("PEER-12/18/21: an id that is missing or not text is treated as an unknown id", async () => {
  broker = await startBroker();
  await register(broker, "judge", "judge");
  const before = readDb(broker.dbFile);
  for (const body of [{}, { id: null }, { id: 5 }, { id: { a: 1 } }, { id: ["x"] }]) {
    const heartbeat = await post(broker.url, "/heartbeat", body);
    expect(heartbeat.status).toBe(200);
    expect(heartbeat.json).toEqual({ ok: true });
    const unregister = await post(broker.url, "/unregister", body);
    expect(unregister.status).toBe(200);
    expect(unregister.json).toEqual({ ok: true });
    const listed = await post(broker.url, "/list-peers", body);
    expect(listed.status).toBe(200);
    expect(listed.json.ok).toBe(false);
    expect(listed.json.error).toBe("unknown_peer");
    expect(listed.json.hint.length).toBeGreaterThan(0);
  }
  expect(readDb(broker.dbFile)).toEqual(before);
});
