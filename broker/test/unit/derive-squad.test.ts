import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { blocks, openPermissions, presence, SQUAD } from "../../shared/derive.ts";

const T0 = 1791331200000;

// An event in the read format, one second after the one of the seq before. `at` is the
// number of seconds after T0 when it is not the seq.
function event(seq: number, fields: Record<string, unknown>, at = seq): SquadEvent {
  return {
    seq,
    ts: T0 + at * 1000,
    feature_id: null,
    role_from: SQUAD.find((a) => a.name === fields.from)?.role ?? fields.from,
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    ...fields,
  } as SquadEvent;
}

function joined(seq: number, peer: string): SquadEvent {
  return event(seq, { kind: "peer_joined", from: "broker", peer, role: SQUAD.find((a) => a.name === peer)?.role });
}

function left(seq: number, peer: string, reason = "died"): SquadEvent {
  return event(seq, { kind: "peer_left", from: "broker", peer, reason });
}

function blocked(seq: number, from: string, reason: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, { kind: "blocked", from, reason, detail: "the detail", last_action: "the last action", ...fields });
}

function unblocked(seq: number, peer: string, from = peer): SquadEvent {
  return event(seq, { kind: "unblocked", from, peer });
}

function request(seq: number, from: string, fields: Record<string, unknown> = {}): SquadEvent {
  return event(seq, {
    kind: "permission_request", from, to: "human", summary: "Bash: Run the tests",
    request_id: `r${seq}`, tool_name: "Bash", description: "Run the tests", input_preview: "bun test", ...fields,
  });
}

function decision(seq: number, to: string, request_seq: number, behavior = "allow"): SquadEvent {
  return event(seq, { kind: "permission_decision", from: "human", to, summary: behavior, request_seq, behavior });
}

function refused(seq: number, peer: string): SquadEvent {
  return event(seq, { kind: "refused", from: "broker", peer, attempted_kind: "task", error: "no_open_feature" });
}

function turn(seq: number, from: string): SquadEvent {
  return event(seq, { kind: "turn_started", from });
}

test("the squad is the six names in the order of the screens, each with its role and its short label", () => {
  expect(SQUAD).toEqual([
    { name: "mother", role: "mother", short: "mot" },
    { name: "leader", role: "leader", short: "ldr" },
    { name: "worker-1", role: "worker", short: "w1" },
    { name: "worker-2", role: "worker", short: "w2" },
    { name: "worker-3", role: "worker", short: "w3" },
    { name: "judge", role: "judge", short: "jdg" },
  ]);
});

test("TUI-01: a name without an event of presence has no entry", () => {
  expect(presence([]).size).toBe(0);
  const all = presence([joined(1, "leader"), turn(2, "worker-1"), refused(3, "worker-2")]);
  expect([...all.keys()]).toEqual(["leader"]);
  expect(all.get("leader")).toEqual({ online: true, since: T0 + 1000, joins: 1 });
});

test("TUI-02: a name whose latest event of presence is a peer_left is offline since the ts of it", () => {
  const all = presence([joined(1, "worker-2"), joined(2, "leader"), left(5, "worker-2")]);
  expect(all.get("worker-2")).toEqual({ online: false, since: T0 + 5000, joins: 1 });
  expect(all.get("leader")!.online).toBe(true);

  // the latest is the one of the greatest seq, whatever the order of the list
  expect(presence([left(5, "worker-2"), joined(1, "worker-2")]).get("worker-2")!.online).toBe(false);

  // and a name that came back is online again
  expect(presence([joined(1, "worker-2"), left(5, "worker-2"), joined(8, "worker-2")]).get("worker-2")).toEqual({
    online: true,
    since: T0 + 8000,
    joins: 2,
  });
});

test("two peer_joined of a name without a peer_left between them leave it online", () => {
  expect(presence([joined(1, "judge"), joined(4, "judge")]).get("judge")).toEqual({ online: true, since: T0 + 4000, joins: 2 });
});

test("TUI-04: a permission request is open until something closes it", () => {
  const open = openPermissions([joined(1, "worker-1"), turn(2, "worker-1"), request(3, "worker-1")]);
  expect(open.map((e) => e.seq)).toEqual([3]);
  expect(open[0]!.tool_name).toBe("Bash");
});

test("TUI-04: the permission_decision that cites a request closes it, and only it", () => {
  const log = [request(3, "worker-1"), request(4, "worker-2")];
  expect(openPermissions(log).map((e) => e.seq)).toEqual([3, 4]);
  expect(openPermissions([...log].reverse()).map((e) => e.seq)).toEqual([3, 4]);
  expect(openPermissions([...log, decision(5, "worker-1", 3)]).map((e) => e.seq)).toEqual([4]);
  expect(openPermissions([...log, decision(5, "worker-2", 4, "deny")]).map((e) => e.seq)).toEqual([3]);
});

test("TUI-04: any later event of the same peer closes the request, and one of another peer does not", () => {
  expect(openPermissions([request(3, "worker-1"), turn(4, "worker-1")])).toEqual([]);
  expect(openPermissions([request(3, "worker-1"), turn(4, "worker-2")]).map((e) => e.seq)).toEqual([3]);
  // an event of the peer before the request closes nothing
  expect(openPermissions([turn(2, "worker-1"), request(3, "worker-1")]).map((e) => e.seq)).toEqual([3]);
  // a second request is a later event of the peer: only the latest stays open
  expect(openPermissions([request(3, "worker-1"), request(6, "worker-1")]).map((e) => e.seq)).toEqual([6]);
});

test("TUI-04: a refused and an unblocked the broker wrote about the peer do not close its request", () => {
  const log = [request(3, "worker-1"), refused(4, "worker-1"), unblocked(5, "worker-1", "broker"), left(6, "worker-1")];
  expect(openPermissions(log).map((e) => e.seq)).toEqual([3]);
  // the unblocked the peer itself sent is an event of the peer
  expect(openPermissions([request(3, "worker-1"), unblocked(5, "worker-1")])).toEqual([]);
});

test("a permission_decision whose request_seq is not a permission_request is ignored", () => {
  // seq 9 does not exist and seq 2 is a turn_started
  const log = [turn(2, "worker-2"), request(3, "worker-1"), decision(5, "worker-1", 9), decision(6, "worker-2", 2)];
  expect(openPermissions(log).map((e) => e.seq)).toEqual([3]);
});

test("TUI-03: a blocked without a later unblocked with the name in peer gives the reason", () => {
  const all = blocks([joined(1, "worker-2"), blocked(4, "worker-2", "missing credential", { ticket_ref: "TKT-13" })]);
  expect([...all.keys()]).toEqual(["worker-2"]);
  expect(all.get("worker-2")!.reason).toBe("missing credential");
  expect(all.get("worker-2")!.seq).toBe(4);
  expect(all.get("worker-2")!.ts).toBe(T0 + 4000);
});

test("TUI-03: an unblocked with the name in peer closes the block, whoever wrote it", () => {
  expect(blocks([blocked(4, "worker-2", "r"), unblocked(6, "worker-2")]).size).toBe(0);
  expect(blocks([blocked(4, "worker-2", "r"), unblocked(6, "worker-2", "broker")]).size).toBe(0);
  // the unblocked of another name does not
  expect([...blocks([blocked(4, "worker-2", "r"), unblocked(6, "worker-3")]).keys()]).toEqual(["worker-2"]);
  // nor one that came before the blocked, whatever the order of the list
  expect([...blocks([unblocked(2, "worker-2"), blocked(4, "worker-2", "r")]).keys()]).toEqual(["worker-2"]);
  expect([...blocks([blocked(4, "worker-2", "r"), unblocked(2, "worker-2")]).keys()]).toEqual(["worker-2"]);
});

test("TUI-03: a name blocked again after an unblocked is blocked, with the reason of the latest blocked", () => {
  const all = blocks([blocked(4, "worker-2", "first"), unblocked(6, "worker-2"), blocked(8, "worker-2", "second")]);
  expect(all.get("worker-2")!.reason).toBe("second");
});
