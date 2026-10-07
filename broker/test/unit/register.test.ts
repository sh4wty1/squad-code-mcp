import { expect, test } from "bun:test";
import { NOW, setup } from "./helpers.ts";

type Broker = ReturnType<typeof setup>;

// A refusal names the error, carries a hint and leaves peers and events as they were
function expectRefusal(b: Broker, attempt: () => unknown, error: string) {
  const before = { peers: b.rows().length, events: b.events().length };
  const result = attempt() as { ok: boolean; error: string; hint: string };
  expect(result.ok).toBe(false);
  expect(result.error).toBe(error);
  expect(typeof result.hint).toBe("string");
  expect(result.hint.length).toBeGreaterThan(0);
  expect({ peers: b.rows().length, events: b.events().length }).toEqual(before);
}

test("PEER-01: a valid registration stores the peer and answers its id", () => {
  const b = setup();
  const result = b.join("mother", "mother", 100, { cwd: "/repo/main", git_root: "/repo/.git" }) as { id: string };
  expect(typeof result.id).toBe("string");
  expect(result.id.length).toBeGreaterThan(0);
  expect(b.rows()).toEqual([
    {
      id: result.id,
      name: "mother",
      role: "mother",
      pid: 100,
      cwd: "/repo/main",
      git_root: "/repo/.git",
      registered_at: NOW,
      last_seen: NOW,
    },
  ]);
});

test("PEER-01: a session outside a git repository registers with a null git_root", () => {
  const b = setup();
  b.join("judge", "judge", 100, { git_root: null });
  expect(b.rows()[0]!.git_root).toBeNull();
});

test("PEER-02: an accepted registration logs peer_joined authored by the broker", () => {
  const b = setup();
  b.join("worker-2", "worker", 100);
  expect(b.events()).toHaveLength(1);
  const event = b.events()[0]!;
  expect(event.kind).toBe("peer_joined");
  expect(event.from_name).toBe("broker");
  expect(event.role_from).toBe("broker");
  expect(event.to_name).toBeNull();
  expect(event.feature_id).toBeNull();
  expect(event.summary).toBe("");
  expect(event.data).toEqual({ peer: "worker-2", role: "worker" });
  expect(event.ts).toBe(NOW);
});

test("PEER-03: a role outside the four is refused with invalid_role", () => {
  const b = setup();
  expectRefusal(b, () => b.join("boss", "boss", 100), "invalid_role");
  expectRefusal(b, () => b.join("mother", "", 101), "invalid_role");
});

test("PEER-04: a name outside the roster is refused with invalid_name", () => {
  const b = setup();
  expectRefusal(b, () => b.join("bob", "worker", 100), "invalid_name");
  expectRefusal(b, () => b.join("worker-4", "worker", 101), "invalid_name");
  expectRefusal(b, () => b.join("worker", "worker", 102), "invalid_name");
});

test("PEER-04: a name that belongs to another role is refused with invalid_name", () => {
  const b = setup();
  expectRefusal(b, () => b.join("mother", "worker", 100), "invalid_name");
  expectRefusal(b, () => b.join("worker-1", "leader", 101), "invalid_name");
  expectRefusal(b, () => b.join("leader", "judge", 102), "invalid_name");
});

for (const role of ["mother", "leader", "judge"]) {
  test(`PEER-05: a second ${role} is refused with role_taken while the first is alive`, () => {
    const b = setup();
    b.join(role, role, 100);
    expectRefusal(b, () => b.join(role, role, 101), "role_taken");
  });
}

test("PEER-06: a fourth worker is refused with worker_limit", () => {
  const b = setup();
  b.join("worker-1", "worker", 100);
  b.join("worker-2", "worker", 101);
  expect(b.join("worker-3", "worker", 102)).toHaveProperty("id");
  expectRefusal(b, () => b.join("worker-1", "worker", 103), "worker_limit");
});

test("PEER-07: a name held by a live peer is refused with name_taken", () => {
  const b = setup();
  b.join("worker-1", "worker", 100);
  expectRefusal(b, () => b.join("worker-1", "worker", 101), "name_taken");
});

test("PEER-08: the name of a dead peer is registered again, after its peer_left", () => {
  const b = setup();
  const first = b.join("mother", "mother", 100) as { id: string };
  b.alive.delete(100);
  const second = b.join("mother", "mother", 101) as { id: string };
  expect(typeof second.id).toBe("string");
  expect(second.id).not.toBe(first.id);
  expect(b.rows().map((p) => [p.id, p.pid])).toEqual([[second.id, 101]]);
  expect(b.events().map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "mother", role: "mother" }],
    ["peer_left", { peer: "mother", reason: "died" }],
    ["peer_joined", { peer: "mother", role: "mother" }],
  ]);
});

test("PEER-06/08: with three workers and one dead, a new worker takes the name of the dead one", () => {
  const b = setup();
  b.join("worker-1", "worker", 100);
  b.join("worker-2", "worker", 101);
  b.join("worker-3", "worker", 102);
  b.alive.delete(101);
  expect(b.join("worker-2", "worker", 103)).toHaveProperty("id");
  expect(b.rows().map((p) => [p.name, p.pid]).sort()).toEqual([
    ["worker-1", 100],
    ["worker-2", 103],
    ["worker-3", 102],
  ]);
});

test("PEER-09: a pid that registers again loses its earlier registration first", () => {
  const b = setup();
  b.join("leader", "leader", 100);
  expect(b.join("judge", "judge", 100)).toHaveProperty("id");
  expect(b.rows().map((p) => p.name)).toEqual(["judge"]);
  expect(b.events().map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "leader", role: "leader" }],
    ["peer_left", { peer: "leader", reason: "died" }],
    ["peer_joined", { peer: "judge", role: "judge" }],
  ]);
});

test("PEER-10: a pid that is not an integer is refused with missing_field", () => {
  const b = setup();
  const body = { cwd: "/repo", git_root: null, name: "mother", role: "mother" };
  expectRefusal(b, () => b.peers.register({ ...body, pid: "100" as unknown as number }), "missing_field");
  expectRefusal(b, () => b.peers.register({ ...body, pid: 1.5 }), "missing_field");
  expectRefusal(b, () => b.peers.register(body as never), "missing_field");
});

test("PEER-10: a cwd that is not a non-empty string is refused with missing_field", () => {
  const b = setup();
  const body = { pid: 100, git_root: null, name: "mother", role: "mother" };
  expectRefusal(b, () => b.peers.register({ ...body, cwd: "" }), "missing_field");
  expectRefusal(b, () => b.peers.register(body as never), "missing_field");
});

test("refusals are evaluated in the order missing_field, invalid_role, invalid_name", () => {
  const b = setup();
  expectRefusal(
    b,
    () => b.peers.register({ pid: 1.5, cwd: "/repo", git_root: null, name: "bob", role: "boss" }),
    "missing_field"
  );
  expectRefusal(b, () => b.join("bob", "boss", 100), "invalid_role");
});
