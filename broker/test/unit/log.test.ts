import { expect, test } from "bun:test";
import { appendEvent } from "../../db.ts";
import type { NewRecord } from "../../log.ts";
import { MOTHER, NOW, readOpened, setup, storedOpened, toOthers } from "./helpers.ts";

const TASK: NewRecord = {
  kind: "task",
  from: "leader",
  role_from: "leader",
  to: "worker-1",
  summary: "build the parser",
  body: "the whole brief",
  ticket_ref: "T-1",
  data: { loadout: ["tdd"] },
};

const OTHER_FIVE = ["judge", "leader", "worker-1", "worker-2", "worker-3"];

// The feature_closed of the helper, in the read format
function readClosed(seq: number, feature_id: number) {
  return {
    seq,
    ts: NOW,
    kind: "feature_closed",
    feature_id,
    from: "mother",
    role_from: "mother",
    to: "*",
    summary: "",
    body: "",
    ticket_ref: null,
    outcome: "delivered",
  };
}

test("openFeature is null while no feature is open", () => {
  const b = setup();
  expect(b.log.openFeature()).toBeNull();
  const id = b.openFeature();
  b.closeFeature();
  expect(b.log.openFeature()).toBeNull();
});

test("openFeature is the row with closed_seq null", () => {
  const b = setup();
  b.openFeature({ title: "the old one" });
  b.closeFeature();
  const id = b.openFeature({ title: "the open one", workflow: "matt-pocock", branch: "feat/y" });
  expect(b.log.openFeature()).toEqual({
    id,
    project: "repo",
    title: "the open one",
    workflow: "matt-pocock",
    branch: "feat/y",
    base_branch: "main",
    spec_ref: ".specs/features/x/spec.md",
    spec_commit: "abc1234",
    opened_seq: 3,
    closed_seq: null,
    outcome: null,
  });
});

test("featureEvents are the events of the open feature in ascending seq, in the read format", () => {
  const b = setup();
  // before any feature, and in a feature that closed
  b.log.record({ kind: "turn_started", from: "mother", role_from: "mother" });
  const old = b.openFeature();
  b.log.record(TASK);
  b.closeFeature();
  expect(b.log.featureEvents()).toEqual([]);

  const id = b.openFeature();
  const first = b.log.record(TASK);
  const second = b.log.record({ kind: "blocked", from: "worker-1", role_from: "worker", data: { reason: "r" } });
  expect(b.log.featureEvents() as object[]).toEqual([
    readOpened(5, id),
    {
      seq: first,
      ts: NOW,
      kind: "task",
      feature_id: id,
      from: "leader",
      role_from: "leader",
      to: "worker-1",
      summary: "build the parser",
      body: "the whole brief",
      ticket_ref: "T-1",
      loadout: ["tdd"],
    },
    {
      seq: second,
      ts: NOW,
      kind: "blocked",
      feature_id: id,
      from: "worker-1",
      role_from: "worker",
      to: null,
      summary: "",
      body: "",
      ticket_ref: null,
      reason: "r",
    },
  ]);
});

test("EVT-13/39: a task is recorded with a pending delivery to its recipient, who is offline", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 500;
  const seq = b.log.record(TASK);
  expect(b.rows()).toEqual([]);
  expect(b.events()).toEqual([
    storedOpened(1, id),
    {
      seq,
      ts: NOW + 500,
      kind: "task",
      feature_id: id,
      from_name: "leader",
      role_from: "leader",
      to_name: "worker-1",
      summary: "build the parser",
      body: "the whole brief",
      ticket_ref: "T-1",
      question_id: null,
      gate_id: null,
      data: { loadout: ["tdd"] },
    },
  ]);
  expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: seq, recipient: "worker-1", acked_at: null }]);
});

test("EVT-39: result, verdict and permission_decision get a pending delivery to their recipient", () => {
  const b = setup();
  b.openFeature();
  const result = b.log.record({ kind: "result", from: "worker-1", role_from: "worker", to: "judge", summary: "done" });
  const verdict = b.log.record({ kind: "verdict", from: "judge", role_from: "judge", to: "leader", summary: "ok" });
  const decision = b.log.record({ kind: "permission_decision", from: "human", role_from: "human", to: "worker-2" });
  expect(b.deliveries()).toEqual([
    ...toOthers(1),
    { event_seq: result, recipient: "judge", acked_at: null },
    { event_seq: verdict, recipient: "leader", acked_at: null },
    { event_seq: decision, recipient: "worker-2", acked_at: null },
  ]);
});

test("EVT-40: plan, blocked and permission_request are recorded without a delivery", () => {
  const b = setup();
  b.openFeature();
  b.log.record({ kind: "plan", from: "leader", role_from: "leader", data: { tickets: [] } });
  b.log.record({ kind: "blocked", from: "worker-1", role_from: "worker", data: { reason: "r" } });
  b.log.record({ kind: "permission_request", from: "worker-1", role_from: "worker", to: "human", summary: "Bash: ls" });
  expect(b.events().map((e) => [e.kind, e.to_name])).toEqual([
    ["feature_opened", "*"],
    ["plan", null],
    ["blocked", null],
    ["permission_request", "human"],
  ]);
  // only the deliveries of the feature_opened
  expect(b.deliveries()).toEqual(toOthers(1));
});

test("EVT-40: no other kind of record gets a delivery", () => {
  const b = setup();
  b.openFeature();
  for (const kind of ["unblocked", "usage", "turn_started", "refused"] as const) {
    b.log.record({ kind, from: "judge", role_from: "judge" });
  }
  expect(b.events()).toHaveLength(5);
  // only the deliveries of the feature_opened
  expect(b.deliveries()).toEqual(toOthers(1));
});

test("EVT-79: when the delivery cannot be written the event is not stored", () => {
  const b = setup();
  b.openFeature();
  const kept = b.log.record(TASK);
  b.db.run("CREATE TRIGGER deliveries_fail BEFORE INSERT ON deliveries BEGIN SELECT RAISE(ABORT, 'no delivery'); END");
  expect(() => b.log.record({ ...TASK, summary: "the second" })).toThrow("no delivery");
  expect(b.events().map((e) => [e.seq, e.summary])).toEqual([
    [1, ""],
    [kept, "build the parser"],
  ]);
  expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: kept, recipient: "worker-1", acked_at: null }]);
});

test("EVT-59: an event recorded without an open feature has feature_id null", () => {
  const b = setup();
  b.log.record({ kind: "turn_started", from: "mother", role_from: "mother" });
  const id = b.openFeature();
  b.closeFeature();
  b.log.record({ kind: "turn_started", from: "mother", role_from: "mother" });
  expect(b.events().map((e) => [e.kind, e.feature_id])).toEqual([
    ["turn_started", null],
    ["feature_opened", id],
    ["feature_closed", id],
    ["turn_started", null],
  ]);
});

test("EVT-47: refused records the trace with the broker as author and answers the refusal", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 900;
  const answer = b.log.refused("worker-1", "task", "edge_not_allowed", "Only the leader sends a task to a worker.");
  expect(answer).toEqual({ ok: false, error: "edge_not_allowed", hint: "Only the leader sends a task to a worker." });
  expect(b.events()).toEqual([
    storedOpened(1, id),
    {
      seq: 2,
      ts: NOW + 900,
      kind: "refused",
      feature_id: id,
      from_name: "broker",
      role_from: "broker",
      to_name: null,
      summary: "",
      body: "",
      ticket_ref: null,
      question_id: null,
      gate_id: null,
      data: { peer: "worker-1", attempted_kind: "task", error: "edge_not_allowed" },
    },
  ]);
  expect(b.deliveries()).toEqual(toOthers(1));
});

test("EVT-47: refused without an open feature has feature_id null", () => {
  const b = setup();
  const answer = b.log.refused("mother", "", "no_open_feature", "Open a feature first.");
  expect(answer).toEqual({ ok: false, error: "no_open_feature", hint: "Open a feature first." });
  const [refused] = b.events();
  expect(b.events()).toHaveLength(1);
  expect(refused!.kind).toBe("refused");
  expect(refused!.feature_id).toBeNull();
  expect(refused!.data).toEqual({ peer: "mother", attempted_kind: "", error: "no_open_feature" });
});

// The read format of TASK, recorded with the given seq in the given feature
function readTask(seq: number, feature_id: number | null, fields: Record<string, unknown> = {}) {
  return {
    seq,
    ts: NOW,
    kind: "task",
    feature_id,
    from: "leader",
    role_from: "leader",
    to: "worker-1",
    summary: "build the parser",
    body: "the whole brief",
    ticket_ref: "T-1",
    loadout: ["tdd"],
    ...fields,
  };
}

test("EVT-41: pending are the events still to be delivered to the name, in ascending seq and in the read format", () => {
  const b = setup();
  const id = b.openFeature();
  const first = b.log.record(TASK);
  b.log.record({ kind: "result", from: "worker-1", role_from: "worker", to: "judge", summary: "done" });
  b.log.record({ kind: "blocked", from: "worker-1", role_from: "worker", data: { reason: "r" } });
  const second = b.log.record({ ...TASK, summary: "the second", ticket_ref: "T-2" });
  expect(b.log.pending("worker-1") as object[]).toEqual([
    readOpened(1, id),
    readTask(first, id),
    readTask(second, id, { summary: "the second", ticket_ref: "T-2" }),
  ]);
  expect(b.log.pending("worker-2") as object[]).toEqual([readOpened(1, id)]);
});

test("EVT-42: without an ack a second pending answers the same events", () => {
  const b = setup();
  b.openFeature();
  b.log.record(TASK);
  b.log.record({ ...TASK, summary: "the second" });
  const first = b.log.pending("worker-1");
  expect(first.map((e) => e.seq)).toEqual([1, 2, 3]);
  expect(b.log.pending("worker-1")).toEqual(first);
  expect(b.deliveries().map((d) => d.acked_at)).toEqual([null, null, null, null, null, null, null]);
});

test("EVT-43: ack confirms the pending deliveries of the name with the current epoch ms, and only those in seqs", () => {
  const b = setup();
  b.openFeature();
  const first = b.log.record(TASK);
  const second = b.log.record({ ...TASK, summary: "the second" });
  b.clock.now = NOW + 4000;
  b.log.ack("worker-1", [first]);
  expect(b.deliveries()).toEqual([
    ...toOthers(1),
    { event_seq: first, recipient: "worker-1", acked_at: NOW + 4000 },
    { event_seq: second, recipient: "worker-1", acked_at: null },
  ]);
  expect(b.log.pending("worker-1").map((e) => e.seq)).toEqual([1, second]);
});

test("EVT-43: ack leaves the delivery of another name pending", () => {
  const b = setup();
  b.openFeature();
  const mine = b.log.record(TASK);
  const theirs = b.log.record({ ...TASK, to: "worker-2" });
  b.log.ack("worker-1", [mine, theirs]);
  expect(b.deliveries()).toEqual([
    ...toOthers(1),
    { event_seq: mine, recipient: "worker-1", acked_at: NOW },
    { event_seq: theirs, recipient: "worker-2", acked_at: null },
  ]);
  expect(b.log.pending("worker-2").map((e) => e.seq)).toEqual([1, theirs]);
});

test("EVT-43: ack leaves a delivery already confirmed as it was", () => {
  const b = setup();
  b.openFeature();
  const seq = b.log.record(TASK);
  b.clock.now = NOW + 1000;
  b.log.ack("worker-1", [seq]);
  b.clock.now = NOW + 9000;
  b.log.ack("worker-1", [seq]);
  expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: seq, recipient: "worker-1", acked_at: NOW + 1000 }]);
});

test("EVT-43: ack of a seq with no delivery, or of no seq, changes nothing", () => {
  const b = setup();
  b.openFeature();
  const seq = b.log.record(TASK);
  b.log.ack("worker-1", [seq + 50]);
  b.log.ack("worker-1", []);
  expect(b.deliveries()).toEqual([...toOthers(1), { event_seq: seq, recipient: "worker-1", acked_at: null }]);
});

test("EVT-67: after answers the events past the cursor, of any feature and of none, and lastSeq the greatest seq", () => {
  const b = setup();
  expect(b.log.lastSeq()).toBe(0);
  expect(b.log.after(0)).toEqual([]);

  // one event without a feature, one in a feature that closed, one in the open feature
  b.log.record({ kind: "turn_started", from: "mother", role_from: "mother" });
  const old = b.openFeature();
  b.log.record(TASK);
  b.closeFeature();
  const id = b.openFeature();
  b.log.record({ ...TASK, summary: "the third" });

  expect(b.log.lastSeq()).toBe(6);
  expect(b.log.after(1) as object[]).toEqual([
    readOpened(2, old),
    readTask(3, old),
    readClosed(4, old),
    readOpened(5, id),
    readTask(6, id, { summary: "the third" }),
  ]);
  expect(b.log.after(0).map((e) => [e.seq, e.kind, e.feature_id])).toEqual([
    [1, "turn_started", null],
    [2, "feature_opened", old],
    [3, "task", old],
    [4, "feature_closed", old],
    [5, "feature_opened", id],
    [6, "task", id],
  ]);
});

test("EVT-67: after a cursor past the last seq answers nothing, and lastSeq stays", () => {
  const b = setup();
  b.log.record({ kind: "turn_started", from: "mother", role_from: "mother" });
  expect(b.log.after(1)).toEqual([]);
  expect(b.log.after(99)).toEqual([]);
  expect(b.log.lastSeq()).toBe(1);
});

test("EVT-69: history by ticket_ref answers the events of the open feature with that ticket_ref, in ascending seq", () => {
  const b = setup();
  const old = b.openFeature();
  b.log.record(TASK);
  b.closeFeature();
  const id = b.openFeature();
  const task = b.log.record(TASK);
  b.log.record({ ...TASK, ticket_ref: "T-2" });
  b.log.record({ kind: "plan", from: "leader", role_from: "leader", data: { tickets: [] } });
  const blocked = b.log.record({ kind: "blocked", from: "worker-1", role_from: "worker", ticket_ref: "T-1" });
  expect(b.log.history({ ticket_ref: "T-1" }) as object[]).toEqual([
    readTask(task, id),
    {
      seq: blocked,
      ts: NOW,
      kind: "blocked",
      feature_id: id,
      from: "worker-1",
      role_from: "worker",
      to: null,
      summary: "",
      body: "",
      ticket_ref: "T-1",
    },
  ]);
  expect(b.log.history({ ticket_ref: "T-9" })).toEqual([]);
});

test("EVT-69: history by ticket_ref leaves out an event recorded with that ticket_ref while no feature was open", () => {
  const b = setup();
  b.log.record({ kind: "blocked", from: "worker-1", role_from: "worker", ticket_ref: "T-1" });
  b.openFeature();
  const task = b.log.record(TASK);
  expect(b.log.history({ ticket_ref: "T-1" }).map((e) => [e.seq, e.kind])).toEqual([[task, "task"]]);
});

test("EVT-69: history by ticket_ref is empty without an open feature", () => {
  const b = setup();
  const old = b.openFeature();
  b.log.record(TASK);
  b.closeFeature();
  expect(b.log.history({ ticket_ref: "T-1" })).toEqual([]);
});

test("EVT-69: history by question_id and by gate_id filters by the column, in any feature", () => {
  const b = setup();
  const event = { ts: NOW, from_name: "judge", role_from: "judge" };
  const old = b.openFeature();
  const asked = appendEvent(b.db, { ...event, kind: "question", feature_id: old, question_id: 5, ticket_ref: "T-1" });
  appendEvent(b.db, { ...event, kind: "question", feature_id: old, question_id: 6 });
  const gate = appendEvent(b.db, { ...event, kind: "gate", feature_id: old, gate_id: 5 });
  b.closeFeature();
  const answered = appendEvent(b.db, { ...event, kind: "answer", question_id: 5, data: { answer: "yes" } });

  expect(b.log.history({ question_id: 5 }).map((e) => [e.seq, e.kind])).toEqual([
    [asked, "question"],
    [answered, "answer"],
  ]);
  expect(b.log.history({ question_id: 5 })[1] as object).toEqual({
    seq: answered,
    ts: NOW,
    kind: "answer",
    feature_id: null,
    from: "judge",
    role_from: "judge",
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    answer: "yes",
  });
  expect(b.log.history({ gate_id: 5 }).map((e) => [e.seq, e.kind])).toEqual([[gate, "gate"]]);
  expect(b.log.history({ gate_id: 6 })).toEqual([]);
  expect(b.log.history({ question_id: 7 })).toEqual([]);
});

test("FEAT-07: an event of the mother to * gets a pending delivery for each of the other five, and none for her", () => {
  const b = setup();
  const seq = b.log.record({ kind: "feature_closed", from: "mother", role_from: "mother", to: "*" });
  expect(b.deliveries()).toEqual([
    { event_seq: seq, recipient: "judge", acked_at: null },
    { event_seq: seq, recipient: "leader", acked_at: null },
    { event_seq: seq, recipient: "worker-1", acked_at: null },
    { event_seq: seq, recipient: "worker-2", acked_at: null },
    { event_seq: seq, recipient: "worker-3", acked_at: null },
  ]);
});

const FIELDS = {
  title: "the feature",
  workflow: "matt-pocock",
  branch: "feat/x",
  base_branch: "main",
  spec_ref: ".specs/features/x/spec.md",
  spec_commit: "abc1234",
};

function featureRows(b: ReturnType<typeof setup>) {
  return b.db.query("SELECT * FROM features ORDER BY id").all() as Record<string, unknown>[];
}

test("FEAT-01: open stores the row with the six fields, the project and the seq of its event", () => {
  const b = setup();
  b.log.record({ kind: "turn_started", from: "mother", role_from: "mother" });
  const opened = b.log.open(MOTHER, "repo", FIELDS);
  expect(opened).toEqual({ feature_id: 1, seq: 2 });
  expect(featureRows(b)).toEqual([
    { id: 1, project: "repo", ...FIELDS, opened_seq: 2, closed_seq: null, outcome: null },
  ]);
});

test("FEAT-01: open records a feature_opened of the mother to *, with the id of the row and only the six fields in data", () => {
  const b = setup();
  b.clock.now = NOW + 300;
  const { feature_id, seq } = b.log.open(MOTHER, "repo", { ...FIELDS, project: "other", feature_id: 9 } as typeof FIELDS);
  expect(b.events()).toEqual([
    {
      seq,
      ts: NOW + 300,
      kind: "feature_opened",
      feature_id,
      from_name: "mother",
      role_from: "mother",
      to_name: "*",
      summary: "",
      body: "",
      ticket_ref: null,
      question_id: null,
      gate_id: null,
      data: FIELDS,
    },
  ]);
  expect(featureRows(b)[0]!.id).toBe(feature_id);
});

test("FEAT-07: open leaves a pending delivery of the feature_opened for each of the other five, and none for the mother", () => {
  const b = setup();
  const { seq } = b.log.open(MOTHER, "repo", FIELDS);
  expect(b.deliveries()).toEqual(OTHER_FIVE.map((recipient) => ({ event_seq: seq, recipient, acked_at: null })));
});

test("FEAT-12: a feature gets an id greater than every feature_id of the log, even after a row is deleted", () => {
  const b = setup();
  const first = b.log.open(MOTHER, "repo", FIELDS);
  b.db.run("UPDATE features SET closed_seq = ?, outcome = 'abandoned' WHERE id = ?", [first.seq, first.feature_id]);
  const second = b.log.open(MOTHER, "repo", FIELDS);
  b.db.run("UPDATE features SET closed_seq = ?, outcome = 'abandoned' WHERE id = ?", [second.seq, second.feature_id]);
  b.db.run("DELETE FROM features");
  const third = b.log.open(MOTHER, "repo", FIELDS);
  expect([first.feature_id, second.feature_id, third.feature_id]).toEqual([1, 2, 3]);
  expect(b.events().map((e) => e.feature_id)).toEqual([1, 2, 3]);
  expect(featureRows(b).map((f) => [f.id, f.opened_seq])).toEqual([[3, third.seq]]);
});

for (const table of ["features", "deliveries"]) {
  test(`FEAT-08: when the write in ${table} fails, open stores no event, row or delivery`, () => {
    const b = setup();
    const kept = b.log.record(TASK);
    b.db.run(`CREATE TRIGGER fail BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'no write'); END`);
    expect(() => b.log.open(MOTHER, "repo", FIELDS)).toThrow("no write");
    expect(b.events().map((e) => [e.seq, e.kind])).toEqual([[kept, "task"]]);
    expect(featureRows(b)).toEqual([]);
    expect(b.deliveries()).toEqual([{ event_seq: kept, recipient: "worker-1", acked_at: null }]);
  });
}

test("FEAT-09: with a feature open, open is aborted by the index and nothing is stored", () => {
  const b = setup();
  b.log.open(MOTHER, "repo", FIELDS);
  const events = b.events();
  const rows = featureRows(b);
  const deliveries = b.deliveries();
  expect(() => b.log.open(MOTHER, "repo", { ...FIELDS, title: "the second" })).toThrow("UNIQUE constraint failed");
  expect(b.events()).toEqual(events);
  expect(featureRows(b)).toEqual(rows);
  expect(b.deliveries()).toEqual(deliveries);
  expect(rows).toHaveLength(1);
});

test("FEAT-14: close records a feature_closed of the mother to *, with the id of the feature it closes, the body and the outcome", () => {
  const b = setup();
  const { feature_id } = b.log.open(MOTHER, "repo", FIELDS);
  b.clock.now = NOW + 700;
  const seq = b.log.close(MOTHER, "abandoned", "the spec was wrong");
  expect(b.events()[1]).toEqual({
    seq,
    ts: NOW + 700,
    kind: "feature_closed",
    feature_id,
    from_name: "mother",
    role_from: "mother",
    to_name: "*",
    summary: "",
    body: "the spec was wrong",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: { outcome: "abandoned" },
  });
  expect(b.events()).toHaveLength(2);
});

test("FEAT-14: close fills closed_seq with the seq of its event and the outcome, and no feature stays open", () => {
  const b = setup();
  const opened = b.log.open(MOTHER, "repo", FIELDS);
  const seq = b.log.close(MOTHER, "delivered", "");
  expect(seq).toBe(opened.seq + 1);
  expect(featureRows(b)).toEqual([
    { id: opened.feature_id, project: "repo", ...FIELDS, opened_seq: opened.seq, closed_seq: seq, outcome: "delivered" },
  ]);
  expect(b.log.openFeature()).toBeNull();
});

test("FEAT-21: close leaves a pending delivery of the feature_closed for each of the other five, and none for the mother", () => {
  const b = setup();
  b.log.open(MOTHER, "repo", FIELDS);
  const seq = b.log.close(MOTHER, "delivered", "");
  expect(b.deliveries().filter((d) => d.event_seq === seq)).toEqual(
    OTHER_FIVE.map((recipient) => ({ event_seq: seq, recipient, acked_at: null }))
  );
});

for (const [table, action] of [["features", "UPDATE"], ["deliveries", "INSERT"]]) {
  test(`FEAT-21: when the ${action} in ${table} fails, close stores no event or delivery and the feature stays open`, () => {
    const b = setup();
    b.log.open(MOTHER, "repo", FIELDS);
    const events = b.events();
    const rows = featureRows(b);
    const deliveries = b.deliveries();
    b.db.run(`CREATE TRIGGER fail BEFORE ${action} ON ${table} BEGIN SELECT RAISE(ABORT, 'no write'); END`);
    expect(() => b.log.close(MOTHER, "delivered", "")).toThrow("no write");
    expect(b.events()).toEqual(events);
    expect(featureRows(b)).toEqual(rows);
    expect(b.deliveries()).toEqual(deliveries);
    expect(rows[0]!.closed_seq).toBeNull();
  });
}

test("FEAT-22: close keeps the events and the deliveries of the feature, pending ones too, and adds one event", () => {
  const b = setup();
  const opened = b.log.open(MOTHER, "repo", FIELDS);
  const task = b.log.record(TASK);
  b.log.ack("leader", [opened.seq]);
  const events = b.events();
  const deliveries = b.deliveries();
  const seq = b.log.close(MOTHER, "abandoned", "");
  expect(b.events().slice(0, -1)).toEqual(events);
  expect(b.events().map((e) => [e.seq, e.kind])).toEqual([
    [opened.seq, "feature_opened"],
    [task, "task"],
    [seq, "feature_closed"],
  ]);
  expect(b.deliveries().filter((d) => d.event_seq !== seq)).toEqual(deliveries);
  expect(deliveries).toContainEqual({ event_seq: task, recipient: "worker-1", acked_at: null });
});
