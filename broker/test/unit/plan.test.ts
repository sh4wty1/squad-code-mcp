import { expect, test } from "bun:test";
import { JUDGE, LEADER, MOTHER, NOW, setup, storedOpened, toOthers, WORKER_1 } from "./helpers.ts";

const A = { ticket_ref: "A", title: "the parser" };
const B = { ticket_ref: "B", title: "the writer" };

// A task of the leader to a worker, recorded as /send will record it
function task(b: ReturnType<typeof setup>, ticket_ref: string, to = "worker-1") {
  return b.log.record({
    kind: "task",
    from: "leader",
    role_from: "leader",
    to,
    summary: "do it",
    ticket_ref,
    data: { loadout: [] },
  });
}

test("EVT-15: a plan of the leader is stored as a record without recipient and answered with its seq", () => {
  const b = setup();
  const id = b.openByRule();
  b.clock.now = NOW + 300;
  const tickets = [
    { ticket_ref: "A", title: "the parser", depends_on: [], dropped: false },
    { ticket_ref: "B", title: "the writer", depends_on: ["A", "C"], dropped: true },
    { ticket_ref: "C", title: "the reader" },
  ];
  expect(b.plan(LEADER, { tickets })).toEqual({ ok: true, seq: 2 });
  expect(b.events()).toEqual([
    storedOpened(1, id),
    {
      seq: 2,
      ts: NOW + 300,
      kind: "plan",
      feature_id: id,
      from_name: "leader",
      role_from: "leader",
      to_name: null,
      summary: "",
      body: "",
      ticket_ref: null,
      question_id: null,
      gate_id: null,
      data: { tickets },
    },
  ]);
  // only the deliveries of the feature_opened
  expect(b.deliveries()).toEqual(toOthers(1));
});

test("EVT-15: only ticket_ref, title, depends_on and dropped of each item are stored, and nothing of the rest of the body", () => {
  const b = setup();
  b.openByRule();
  const answer = b.plan(LEADER, {
    tickets: [
      { ticket_ref: "A", title: "the parser", depends_on: ["B"], dropped: false, owner: "worker-1", estimate: 3 },
      { ticket_ref: "B", title: "the writer", seq: 9, criteria: [1] },
    ],
    summary: "the plan",
    body: "text",
    ticket_ref: "A",
    to: "worker-1",
    from: "mother",
    note: "ignored",
  });
  expect(answer).toEqual({ ok: true, seq: 2 });
  const [, plan] = b.events();
  expect(plan!.data).toEqual({
    tickets: [
      { ticket_ref: "A", title: "the parser", depends_on: ["B"], dropped: false },
      { ticket_ref: "B", title: "the writer" },
    ],
  });
  expect([plan!.from_name, plan!.to_name, plan!.summary, plan!.body, plan!.ticket_ref]).toEqual(["leader", null, "", "", null]);
});

test("EVT-14: tickets that is not a non-empty list is refused with missing_field", () => {
  const b = setup();
  b.openByRule();
  for (const tickets of [undefined, null, [], "A", { ticket_ref: "A", title: "t" }, 3]) {
    b.refusedWith(() => b.plan(LEADER, { tickets }), "leader", "plan", "missing_field");
  }
});

test("EVT-14: an item without ticket_ref and title as non-empty strings is refused with missing_field", () => {
  const b = setup();
  b.openByRule();
  const items = [
    { title: "the parser" },
    { ticket_ref: "", title: "the parser" },
    { ticket_ref: 1, title: "the parser" },
    { ticket_ref: "A" },
    { ticket_ref: "A", title: "" },
    { ticket_ref: "A", title: 2 },
    "A",
    null,
    ["A", "the parser"],
  ];
  for (const item of items) {
    // the bad item anywhere in the list refuses the whole plan
    b.refusedWith(() => b.plan(LEADER, { tickets: [B, item] }), "leader", "plan", "missing_field");
  }
  expect(b.events().map((e) => e.kind)).toEqual(["feature_opened", ...Array(items.length).fill("refused")]);
});

test("EVT-14: depends_on that is not a list of strings or dropped that is not a boolean is refused with missing_field", () => {
  const b = setup();
  b.openByRule();
  for (const depends_on of ["B", ["B", 2], [null], null, { 0: "B" }]) {
    b.refusedWith(() => b.plan(LEADER, { tickets: [{ ...A, depends_on }, B] }), "leader", "plan", "missing_field");
  }
  for (const dropped of ["true", 1, 0, null, []]) {
    b.refusedWith(() => b.plan(LEADER, { tickets: [{ ...A, dropped }, B] }), "leader", "plan", "missing_field");
  }
});

test("EVT-16: whoever is not the leader is refused with edge_not_allowed, even without a feature and with an invalid body", () => {
  for (const peer of [MOTHER, JUDGE, WORKER_1]) {
    const b = setup();
    // no feature and no tickets
    b.refusedWith(() => b.plan(peer, {}), peer.name, "plan", "edge_not_allowed");
    b.openByRule();
    // an invalid plan
    b.refusedWith(() => b.plan(peer, { tickets: [A, A] }), peer.name, "plan", "edge_not_allowed");
    // and a plan the leader could send
    b.refusedWith(() => b.plan(peer, { tickets: [A] }), peer.name, "plan", "edge_not_allowed");
  }
});

test("EVT-09: without an open feature a plan is refused with no_open_feature", () => {
  const b = setup();
  b.refusedWith(() => b.plan(LEADER, { tickets: [A] }), "leader", "plan", "no_open_feature");
  b.openByRule();
  b.closeByRule();
  b.refusedWith(() => b.plan(LEADER, { tickets: [A] }), "leader", "plan", "no_open_feature");
});

test("EVT-09: no_open_feature comes before the missing_field of the tickets", () => {
  const b = setup();
  b.refusedWith(() => b.plan(LEADER, { tickets: [] }), "leader", "plan", "no_open_feature");
});

test("EVT-17: a plan that repeats a ticket_ref is refused with invalid_plan", () => {
  const b = setup();
  b.openByRule();
  b.refusedWith(() => b.plan(LEADER, { tickets: [A, B, { ...A, title: "again" }] }), "leader", "plan", "invalid_plan");
});

test("EVT-17: a depends_on outside the list or on the ticket itself is refused with invalid_plan", () => {
  const b = setup();
  b.openByRule();
  b.refusedWith(() => b.plan(LEADER, { tickets: [A, { ...B, depends_on: ["A", "Z"] }] }), "leader", "plan", "invalid_plan");
  b.refusedWith(() => b.plan(LEADER, { tickets: [A, { ...B, depends_on: ["B"] }] }), "leader", "plan", "invalid_plan");
  // on another ticket of the list, before or after it, the plan is accepted
  expect(b.plan(LEADER, { tickets: [{ ...A, depends_on: ["B"] }, { ...B, depends_on: [] }] })).toEqual({ ok: true, seq: 4 });
  expect(b.plan(LEADER, { tickets: [A, { ...B, depends_on: ["A"] }] })).toEqual({ ok: true, seq: 5 });
});

test("EVT-17: a ticket dropped in the current plan that comes back without dropped true is refused with invalid_plan", () => {
  const b = setup();
  b.openByRule();
  expect(b.plan(LEADER, { tickets: [{ ...A, dropped: true }, B] })).toEqual({ ok: true, seq: 2 });
  b.refusedWith(() => b.plan(LEADER, { tickets: [A, B] }), "leader", "plan", "invalid_plan");
  b.refusedWith(() => b.plan(LEADER, { tickets: [{ ...A, dropped: false }, B] }), "leader", "plan", "invalid_plan");
  // still dropped, or left out without ever having started, the plan is accepted
  expect(b.plan(LEADER, { tickets: [{ ...A, dropped: true }, B] })).toEqual({ ok: true, seq: 5 });
  expect(b.plan(LEADER, { tickets: [B] })).toEqual({ ok: true, seq: 6 });
});

test("EVT-17: only the current plan says which tickets are dropped", () => {
  const b = setup();
  // dropped in a feature that closed, and in an earlier plan of the open one
  b.openByRule();
  b.log.record({ kind: "plan", from: "leader", role_from: "leader", data: { tickets: [{ ...B, dropped: true }] } });
  b.closeByRule();
  b.openByRule();
  b.log.record({ kind: "plan", from: "leader", role_from: "leader", data: { tickets: [{ ...A, dropped: true }] } });
  b.log.record({ kind: "plan", from: "leader", role_from: "leader", data: { tickets: [A] } });
  expect(b.plan(LEADER, { tickets: [A, B] })).toEqual({ ok: true, seq: 7 });
});

test("EVT-18: a plan that leaves out a ticket that already received a task is refused with plan_drops_started_ticket", () => {
  const b = setup();
  b.openByRule();
  expect(b.plan(LEADER, { tickets: [A, B] })).toEqual({ ok: true, seq: 2 });
  task(b, "A");
  b.refusedWith(() => b.plan(LEADER, { tickets: [B] }), "leader", "plan", "plan_drops_started_ticket");
  b.refusedWith(
    () => b.plan(LEADER, { tickets: [B, { ticket_ref: "C", title: "new" }] }),
    "leader",
    "plan",
    "plan_drops_started_ticket"
  );
  // kept, even as dropped, the plan is accepted; B never started and may leave
  expect(b.plan(LEADER, { tickets: [{ ...A, dropped: true }] })).toEqual({ ok: true, seq: 6 });
  // and a started ticket that is dropped still cannot be left out
  b.refusedWith(() => b.plan(LEADER, { tickets: [B] }), "leader", "plan", "plan_drops_started_ticket");
});

test("EVT-18: a task of a feature that closed, for the same ticket_ref, does not count", () => {
  const b = setup();
  b.openByRule();
  task(b, "A");
  b.closeByRule();
  b.openByRule();
  expect(b.plan(LEADER, { tickets: [B] })).toEqual({ ok: true, seq: 5 });
});

test("EVT-14/17: the missing_field of the tickets comes before invalid_plan", () => {
  const b = setup();
  b.openByRule();
  b.refusedWith(() => b.plan(LEADER, { tickets: [A, A, { ticket_ref: "C" }] }), "leader", "plan", "missing_field");
});

test("EVT-17/18: invalid_plan comes before plan_drops_started_ticket", () => {
  const b = setup();
  b.openByRule();
  b.plan(LEADER, { tickets: [A, B] });
  task(b, "A");
  b.refusedWith(() => b.plan(LEADER, { tickets: [B, B] }), "leader", "plan", "invalid_plan");
  b.refusedWith(() => b.plan(LEADER, { tickets: [{ ...B, depends_on: ["A"] }] }), "leader", "plan", "invalid_plan");
});
