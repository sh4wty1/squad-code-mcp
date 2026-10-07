import { expect, test } from "bun:test";
import { NOW, setup } from "./helpers.ts";

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
