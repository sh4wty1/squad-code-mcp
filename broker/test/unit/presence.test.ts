import { expect, test } from "bun:test";
import { createPeers, pidAlive, STALE_AFTER_MS } from "../../peers.ts";
import { NOW, setup } from "./helpers.ts";

// pid 1 belongs to root, so the signal is refused with EPERM. Windows has no such pid.
test.skipIf(process.platform === "win32")("PEER-14: a pid that exists under another user is alive", () => {
  expect(pidAlive(1)).toBe(true);
});

test("PEER-11: unregister removes the peer and logs peer_left with unregistered", () => {
  const b = setup();
  const { id } = b.join("leader", "leader", 100) as { id: string };
  b.clock.now = NOW + 5000;
  b.peers.unregister(id);
  expect(b.rows()).toEqual([]);
  const last = b.events().at(-1)!;
  expect(b.events()).toHaveLength(2);
  expect(last.kind).toBe("peer_left");
  expect(last.from_name).toBe("broker");
  expect(last.role_from).toBe("broker");
  expect(last.data).toEqual({ peer: "leader", reason: "unregistered" });
  expect(last.ts).toBe(NOW + 5000);
});

test("PEER-12: unregister of an unknown id logs nothing", () => {
  const b = setup();
  b.join("leader", "leader", 100);
  b.peers.unregister("not-an-id");
  expect(b.rows().map((p) => p.name)).toEqual(["leader"]);
  expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"]);
});

test("PEER-13: the cleanup removes a peer whose pid is gone and logs peer_left with died", () => {
  const b = setup();
  b.join("judge", "judge", 100);
  b.alive.delete(100);
  b.peers.cleanStale();
  expect(b.rows()).toEqual([]);
  const last = b.events().at(-1)!;
  expect(b.events()).toHaveLength(2);
  expect(last.kind).toBe("peer_left");
  expect(last.from_name).toBe("broker");
  expect(last.data).toEqual({ peer: "judge", reason: "died" });
});

test("PEER-13/14: the cleanup removes only the dead peers", () => {
  const b = setup();
  b.join("mother", "mother", 100);
  b.join("worker-1", "worker", 101);
  b.join("worker-2", "worker", 102);
  b.alive.delete(101);
  b.peers.cleanStale();
  expect(b.rows().map((p) => p.name).sort()).toEqual(["mother", "worker-2"]);
  expect(b.events().slice(3).map((e) => [e.kind, e.data])).toEqual([
    ["peer_left", { peer: "worker-1", reason: "died" }],
  ]);
});

test("PEER-14: the cleanup keeps a peer whose pid exists and logs nothing", () => {
  const b = setup();
  b.join("judge", "judge", 100);
  b.peers.cleanStale();
  b.peers.cleanStale();
  expect(b.rows().map((p) => p.name)).toEqual(["judge"]);
  expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"]);
});

test("PEER-16: a peer lists the other five squad names with role and online", () => {
  const b = setup();
  const mother = b.join("mother", "mother", 100) as { id: string };
  b.join("leader", "leader", 101);
  b.join("worker-2", "worker", 102);
  expect(b.peers.listPeers(mother.id)).toEqual([
    { name: "leader", role: "leader", online: true },
    { name: "judge", role: "judge", online: false },
    { name: "worker-1", role: "worker", online: false },
    { name: "worker-2", role: "worker", online: true },
    { name: "worker-3", role: "worker", online: false },
  ]);
});

test("PEER-16: a registered name whose pid is gone is listed as offline", () => {
  const b = setup();
  const mother = b.join("mother", "mother", 100) as { id: string };
  b.join("leader", "leader", 101);
  b.alive.delete(101);
  const listed = b.peers.listPeers(mother.id) as { name: string; online: boolean }[];
  expect(listed.find((p) => p.name === "leader")!.online).toBe(false);
});

test("PEER-17: the listing carries name, role and online, and no id", () => {
  const b = setup();
  const mother = b.join("mother", "mother", 100) as { id: string };
  const leader = b.join("leader", "leader", 101) as { id: string };
  const listed = b.peers.listPeers(mother.id) as object[];
  for (const item of listed) {
    expect(Object.keys(item).sort()).toEqual(["name", "online", "role"]);
  }
  const text = JSON.stringify(listed);
  expect(text).not.toContain(leader.id);
  expect(text).not.toContain(mother.id);
});

test("PEER-18: listing with an unknown id is refused with unknown_peer", () => {
  const b = setup();
  b.join("mother", "mother", 100);
  const result = b.peers.listPeers("not-an-id") as { ok: boolean; error: string; hint: string };
  expect(result.ok).toBe(false);
  expect(result.error).toBe("unknown_peer");
  expect(result.hint.length).toBeGreaterThan(0);
});

test("PEER-21: heartbeat moves last_seen to the current epoch ms", () => {
  const b = setup();
  const { id } = b.join("mother", "mother", 100) as { id: string };
  b.clock.now = NOW + 15000;
  b.peers.heartbeat(id);
  expect(b.rows()[0]!.last_seen).toBe(NOW + 15000);
  expect(b.rows()[0]!.registered_at).toBe(NOW);
  b.clock.now = NOW + 30000;
  b.peers.heartbeat(id);
  expect(b.rows()[0]!.last_seen).toBe(NOW + 30000);
  expect(b.rows()[0]!.registered_at).toBe(NOW);
});

test("PEER-21: a heartbeat with an unknown id changes no peer", () => {
  const b = setup();
  b.join("mother", "mother", 100);
  b.clock.now = NOW + 15000;
  b.peers.heartbeat("not-an-id");
  expect(b.rows().map((p) => [p.name, p.last_seen])).toEqual([["mother", NOW]]);
  expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"]);
});

test("PEER-16: a worker lists the other workers and the three single roles, not itself", () => {
  const b = setup();
  const worker = b.join("worker-1", "worker", 100) as { id: string };
  b.join("worker-3", "worker", 101);
  b.join("judge", "judge", 102);
  expect(b.peers.listPeers(worker.id)).toEqual([
    { name: "mother", role: "mother", online: false },
    { name: "leader", role: "leader", online: false },
    { name: "judge", role: "judge", online: true },
    { name: "worker-2", role: "worker", online: false },
    { name: "worker-3", role: "worker", online: true },
  ]);
});

test("PEER-14/42: a peer with a live pid stays for 60 s without a heartbeat and leaves after that", () => {
  const b = setup();
  b.join("judge", "judge", 100);
  b.clock.now = NOW + 1;
  b.peers.cleanStale();
  b.clock.now = NOW + STALE_AFTER_MS;
  b.peers.cleanStale();
  expect(b.rows().map((p) => p.name)).toEqual(["judge"]);
  expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"]);

  b.clock.now = NOW + STALE_AFTER_MS + 1;
  b.peers.cleanStale();
  expect(b.rows()).toEqual([]);
  expect(b.events().map((e) => [e.kind, e.data, e.ts])).toEqual([
    ["peer_joined", { peer: "judge", role: "judge" }, NOW],
    ["peer_left", { peer: "judge", reason: "died" }, NOW + STALE_AFTER_MS + 1],
  ]);
});

test("PEER-14: a heartbeat within the last 60 s keeps the peer", () => {
  const b = setup();
  const { id } = b.join("judge", "judge", 100) as { id: string };
  for (const t of [30000, 60000, 90000]) {
    b.clock.now = NOW + t;
    if (t === 30000) b.peers.heartbeat(id);
    b.peers.cleanStale();
  }
  expect(b.rows().map((p) => [p.name, p.last_seen])).toEqual([["judge", NOW + 30000]]);
  expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"]);
});

test("PEER-42/05: a role held by a silent row with a live pid is free again after 60 s", () => {
  const b = setup();
  b.join("leader", "leader", 100);
  b.clock.now = NOW + 30000;
  b.peers.cleanStale();
  b.clock.now = NOW + STALE_AFTER_MS;
  expect((b.join("leader", "leader", 200) as { error: string }).error).toBe("role_taken");

  b.clock.now = NOW + STALE_AFTER_MS + 30000;
  expect(typeof (b.join("leader", "leader", 200) as { id: string }).id).toBe("string");
  expect(b.rows().map((p) => [p.name, p.pid])).toEqual([["leader", 200]]);
  expect(b.events().map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "leader", role: "leader" }],
    ["peer_left", { peer: "leader", reason: "died" }],
    ["peer_joined", { peer: "leader", role: "leader" }],
  ]);
});

test("PEER-43: a broker that starts over old rows counts the 60 s from its start", () => {
  const b = setup();
  const { id } = b.join("mother", "mother", 100) as { id: string };
  b.join("leader", "leader", 101);

  // The broker comes back an hour later over the same database
  const start = NOW + 3600000;
  b.clock.now = start;
  const restarted = createPeers(b.db, (pid) => b.alive.has(pid), () => b.clock.now);
  restarted.cleanStale();
  expect(b.rows().map((p) => p.name)).toEqual(["leader", "mother"]);

  b.clock.now = start + 30000;
  restarted.heartbeat(id);
  restarted.cleanStale();
  b.clock.now = start + STALE_AFTER_MS;
  restarted.cleanStale();
  expect(b.rows().map((p) => p.name)).toEqual(["leader", "mother"]);

  // leader never sent a heartbeat to the new broker
  b.clock.now = start + STALE_AFTER_MS + 1;
  restarted.cleanStale();
  expect(b.rows().map((p) => p.name)).toEqual(["mother"]);
  expect(b.events().slice(2).map((e) => [e.kind, e.data])).toEqual([
    ["peer_left", { peer: "leader", reason: "died" }],
  ]);
});

test("PEER-43: a cleanup more than 60 s after the previous one counts the 60 s from itself", () => {
  const b = setup();
  b.join("judge", "judge", 100);
  // The machine slept: no cleanup ran and no heartbeat could arrive
  const awake = NOW + STALE_AFTER_MS + 1;
  b.clock.now = awake;
  b.peers.cleanStale();
  b.clock.now = awake + STALE_AFTER_MS;
  b.peers.cleanStale();
  expect(b.rows().map((p) => p.name)).toEqual(["judge"]);
  expect(b.events().map((e) => e.kind)).toEqual(["peer_joined"]);

  b.clock.now = awake + STALE_AFTER_MS + 1;
  b.peers.cleanStale();
  expect(b.rows()).toEqual([]);
});
