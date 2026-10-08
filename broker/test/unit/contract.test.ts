import { expect, test } from "bun:test";
import { EDGES, KINDS, toRead, type EventRow } from "../../shared/contract.ts";

const TASK_ROW: EventRow = {
  seq: 7,
  ts: 1791331200000,
  kind: "task",
  feature_id: 3,
  from_name: "leader",
  role_from: "leader",
  to_name: "worker-1",
  summary: "build the parser",
  body: "the whole brief",
  ticket_ref: "T-1",
  question_id: null,
  gate_id: null,
  data: JSON.stringify({ loadout: ["tdd"], criteria: [1, 2] }),
};

test("EVT-41/67: the read format of a task is the envelope with from and to, and the fields of the kind at the same level", () => {
  expect(toRead(TASK_ROW) as object).toEqual({
    seq: 7,
    ts: 1791331200000,
    kind: "task",
    feature_id: 3,
    from: "leader",
    role_from: "leader",
    to: "worker-1",
    summary: "build the parser",
    body: "the whole brief",
    ticket_ref: "T-1",
    loadout: ["tdd"],
    criteria: [1, 2],
  });
});

test("EVT-41/67: the read format has no from_name, to_name or data", () => {
  expect(Object.keys(toRead(TASK_ROW)).sort()).toEqual([
    "body", "criteria", "feature_id", "from", "kind", "loadout", "role_from", "seq", "summary", "ticket_ref", "to", "ts",
  ]);
});

test("EVT-41/67: a record without recipient, feature or ticket reads with the three as null", () => {
  const read = toRead({
    ...TASK_ROW,
    kind: "peer_joined",
    feature_id: null,
    from_name: "broker",
    role_from: "broker",
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    data: JSON.stringify({ peer: "judge", role: "judge" }),
  });
  expect(read as object).toEqual({
    seq: 7,
    ts: 1791331200000,
    kind: "peer_joined",
    feature_id: null,
    from: "broker",
    role_from: "broker",
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    peer: "judge",
    role: "judge",
  });
});

test("EVT-08: the edges are the five trios of the star and no other", () => {
  expect(EDGES.map((e) => [e.kind, e.from, e.to])).toEqual([
    ["task", "mother", "leader"],
    ["task", "leader", "worker"],
    ["result", "worker", "judge"],
    ["result", "leader", "mother"],
    ["verdict", "judge", "leader"],
  ]);
});

test("the contract has the twenty kinds", () => {
  expect([...KINDS].sort()).toEqual([
    "answer", "blocked", "feature_closed", "feature_opened", "gate", "gate_decision", "peer_joined", "peer_left",
    "permission_decision", "permission_request", "plan", "question", "question_merged", "refused", "result", "task",
    "turn_started", "unblocked", "usage", "verdict",
  ]);
});
