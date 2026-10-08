import { expect, test } from "bun:test";
import { JUDGE, LEADER, MOTHER, NOW, setup, WORKER_1, WORKER_2 } from "./helpers.ts";

const BLOCKED = { reason: "the test database is down", detail: "connection refused on 5432", last_action: "ran bun test" };
const USAGE = { session_id: "s-123", model: "opus", input: 1200, output: 340, cache_write: 50, cache_read: 9000 };

// A stored record of worker-1, with the columns a record without recipient has by default
function stored(seq: number, kind: string, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind,
    feature_id: null,
    from_name: "worker-1",
    role_from: "worker",
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: {},
    ...fields,
  };
}

test("EVT-50: a blocked is stored with its ticket_ref and reason, detail and last_action in data", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 10;
  const answer = b.session.blocked(WORKER_1, { ...BLOCKED, ticket_ref: "A", peer: "worker-2", to: "leader", summary: "s" });
  expect(answer).toEqual({ ok: true, seq: 1 });
  expect(b.events()).toEqual([stored(1, "blocked", { ts: NOW + 10, feature_id: id, ticket_ref: "A", data: BLOCKED })]);
  expect(b.deliveries()).toEqual([]);
});

test("EVT-50: a blocked without ticket_ref is stored with ticket_ref null, and detail and last_action may be empty", () => {
  const b = setup();
  expect(b.session.blocked(LEADER, { reason: "r", detail: "", last_action: "" })).toEqual({ ok: true, seq: 1 });
  expect(b.session.blocked(LEADER, { ...BLOCKED, ticket_ref: null })).toEqual({ ok: true, seq: 2 });
  expect(b.events()).toEqual([
    stored(1, "blocked", { from_name: "leader", role_from: "leader", data: { reason: "r", detail: "", last_action: "" } }),
    stored(2, "blocked", { from_name: "leader", role_from: "leader", data: BLOCKED }),
  ]);
});

test("EVT-51: a blocked without reason as a non-empty string, or detail and last_action as strings, is refused with missing_field", () => {
  const b = setup();
  for (const reason of [undefined, null, "", 4, ["r"]]) {
    b.refusedWith(() => b.session.blocked(WORKER_1, { ...BLOCKED, reason }), "worker-1", "blocked", "missing_field");
  }
  for (const value of [undefined, null, 4, { text: "x" }]) {
    b.refusedWith(() => b.session.blocked(WORKER_1, { ...BLOCKED, detail: value }), "worker-1", "blocked", "missing_field");
    b.refusedWith(() => b.session.blocked(WORKER_1, { ...BLOCKED, last_action: value }), "worker-1", "blocked", "missing_field");
  }
});

test("EVT-51: a blocked with a ticket_ref that is not a string is refused with missing_field", () => {
  const b = setup();
  for (const ticket_ref of [7, ["A"], true, { ref: "A" }]) {
    b.refusedWith(() => b.session.blocked(WORKER_1, { ...BLOCKED, ticket_ref }), "worker-1", "blocked", "missing_field");
  }
});

test("EVT-52: a reason of more than 80 characters is refused with invalid_field, and one of 80 is stored", () => {
  const b = setup();
  b.refusedWith(() => b.session.blocked(WORKER_1, { ...BLOCKED, reason: "r".repeat(81) }), "worker-1", "blocked", "invalid_field");
  expect(b.session.blocked(WORKER_1, { ...BLOCKED, reason: "r".repeat(80) })).toEqual({ ok: true, seq: 2 });
  expect(b.events()[1]!.data.reason).toBe("r".repeat(80));
});

test("EVT-51/52: the missing_field of a blocked comes before the invalid_field of its reason", () => {
  const b = setup();
  const { detail, ...noDetail } = BLOCKED;
  b.refusedWith(() => b.session.blocked(WORKER_1, { ...noDetail, reason: "r".repeat(81) }), "worker-1", "blocked", "missing_field");
});

test("EVT-53: an unblocked is stored with the name of the peer in data", () => {
  const b = setup();
  const id = b.openFeature();
  b.session.blocked(WORKER_1, BLOCKED);
  b.clock.now = NOW + 30;
  expect(b.session.unblocked(WORKER_1)).toEqual({ ok: true, seq: 2 });
  expect(b.events()[1]).toEqual(stored(2, "unblocked", { ts: NOW + 30, feature_id: id, data: { peer: "worker-1" } }));
  expect(b.log.blocked("worker-1")).toBe(false);
});

test("EVT-53: an unblocked of a peer that is not blocked is stored too", () => {
  const b = setup();
  b.session.blocked(WORKER_2, BLOCKED);
  expect(b.session.unblocked(JUDGE)).toEqual({ ok: true, seq: 2 });
  expect(b.session.unblocked(JUDGE)).toEqual({ ok: true, seq: 3 });
  expect(b.events().slice(1)).toEqual([
    stored(2, "unblocked", { from_name: "judge", role_from: "judge", data: { peer: "judge" } }),
    stored(3, "unblocked", { from_name: "judge", role_from: "judge", data: { peer: "judge" } }),
  ]);
  // and it unblocks nobody else
  expect(b.log.blocked("worker-2")).toBe(true);
});

test("EVT-56: a usage without session_id and model as non-empty strings is refused with missing_field", () => {
  const b = setup();
  for (const value of [undefined, null, "", 9]) {
    b.refusedWith(() => b.session.usage(WORKER_1, { ...USAGE, session_id: value }), "worker-1", "usage", "missing_field");
    b.refusedWith(() => b.session.usage(WORKER_1, { ...USAGE, model: value }), "worker-1", "usage", "missing_field");
  }
});

test("EVT-56: a usage with a count that is not an integer of zero or more is refused with missing_field", () => {
  const b = setup();
  for (const count of ["input", "output", "cache_write", "cache_read"]) {
    for (const value of [undefined, null, -1, 1.5, "10", [1]]) {
      b.refusedWith(() => b.session.usage(WORKER_1, { ...USAGE, [count]: value }), "worker-1", "usage", "missing_field");
    }
  }
});

test("EVT-57: a usage is stored with its six fields in data, zeros included", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 77;
  expect(b.session.usage(WORKER_1, { ...USAGE, cost: 3, ticket_ref: "A", to: "leader", summary: "s" })).toEqual({ ok: true, seq: 1 });
  const zeros = { session_id: "s", model: "m", input: 0, output: 0, cache_write: 0, cache_read: 0 };
  expect(b.session.usage(MOTHER, zeros)).toEqual({ ok: true, seq: 2 });
  expect(b.events()).toEqual([
    stored(1, "usage", { ts: NOW + 77, feature_id: id, data: USAGE }),
    stored(2, "usage", { ts: NOW + 77, feature_id: id, from_name: "mother", role_from: "mother", data: zeros }),
  ]);
  expect(b.deliveries()).toEqual([]);
});

test("EVT-57: a usage that repeats the one before is stored again", () => {
  const b = setup();
  expect(b.session.usage(WORKER_1, USAGE)).toEqual({ ok: true, seq: 1 });
  expect(b.session.usage(WORKER_1, USAGE)).toEqual({ ok: true, seq: 2 });
  expect(b.events()).toEqual([stored(1, "usage", { data: USAGE }), stored(2, "usage", { data: USAGE })]);
});

test("EVT-58: a turn_started is stored with empty data", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 5;
  expect(b.session.turnStarted(WORKER_1)).toEqual({ ok: true, seq: 1 });
  expect(b.session.turnStarted(JUDGE)).toEqual({ ok: true, seq: 2 });
  expect(b.events()).toEqual([
    stored(1, "turn_started", { ts: NOW + 5, feature_id: id }),
    stored(2, "turn_started", { ts: NOW + 5, feature_id: id, from_name: "judge", role_from: "judge" }),
  ]);
});

test("EVT-59: without an open feature the four records are stored with feature_id null, and with one, with its id", () => {
  const b = setup();
  const record = () => [
    b.session.blocked(WORKER_1, BLOCKED),
    b.session.unblocked(WORKER_1),
    b.session.usage(WORKER_1, USAGE),
    b.session.turnStarted(WORKER_1),
  ];
  expect(record().map((a) => a.ok)).toEqual([true, true, true, true]);
  b.closeFeature(b.openFeature());
  expect(record().map((a) => a.ok)).toEqual([true, true, true, true]);
  const id = b.openFeature();
  expect(record().map((a) => a.ok)).toEqual([true, true, true, true]);

  const kinds = ["blocked", "unblocked", "usage", "turn_started"];
  expect(b.events().map((e) => [e.kind, e.feature_id])).toEqual([
    ...kinds.map((k) => [k, null]),
    ...kinds.map((k) => [k, null]),
    ...kinds.map((k) => [k, id]),
  ]);
});

test("EVT-48: a refused blocked or usage is traced with its kind, with and without an open feature", () => {
  const b = setup();
  b.refusedWith(() => b.session.blocked(JUDGE, {}), "judge", "blocked", "missing_field");
  b.refusedWith(() => b.session.usage(JUDGE, {}), "judge", "usage", "missing_field");
  b.openFeature();
  b.refusedWith(() => b.session.blocked(LEADER, { ...BLOCKED, reason: "r".repeat(200) }), "leader", "blocked", "invalid_field");
  b.refusedWith(() => b.session.usage(LEADER, { ...USAGE, input: -5 }), "leader", "usage", "missing_field");
});
