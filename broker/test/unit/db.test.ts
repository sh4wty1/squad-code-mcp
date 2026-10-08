import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBrokerEvent, appendEvent, openDatabase } from "../../db.ts";

function columns(db: ReturnType<typeof openDatabase>, table: string): string[] {
  return (db.query(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

test("PEER-15: each event gets a seq greater than every earlier one", () => {
  const db = openDatabase(":memory:");
  const first = appendBrokerEvent(db, "peer_joined", { peer: "mother", role: "mother" }, 1000);
  const second = appendBrokerEvent(db, "peer_left", { peer: "mother", reason: "died" }, 1000);
  const third = appendBrokerEvent(db, "peer_joined", { peer: "mother", role: "mother" }, 999);
  expect(Number.isInteger(first)).toBe(true);
  expect(second).toBeGreaterThan(first);
  expect(third).toBeGreaterThan(second);
  const stored = db.query("SELECT seq FROM events ORDER BY seq").all() as { seq: number }[];
  expect(stored.map((e) => e.seq)).toEqual([first, second, third]);
});

test("PEER-15: ts is stored as the epoch ms given", () => {
  const db = openDatabase(":memory:");
  const seq = appendBrokerEvent(db, "peer_joined", { peer: "judge", role: "judge" }, 1791331200123);
  const row = db.query("SELECT ts FROM events WHERE seq = ?").get(seq) as { ts: number };
  expect(row.ts).toBe(1791331200123);
});

test("peers has the columns of the Peer slice, without tty and summary", () => {
  const db = openDatabase(":memory:");
  expect(columns(db, "peers")).toEqual([
    "id", "name", "role", "pid", "cwd", "git_root", "registered_at", "last_seen",
  ]);
});

test("the upstream messages table is not created", () => {
  const db = openDatabase(":memory:");
  const tables = (db.query("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[])
    .map((t) => t.name);
  expect(tables).toContain("peers");
  expect(tables).toContain("events");
  expect(tables).not.toContain("messages");
});

function stored(db: ReturnType<typeof openDatabase>): Record<string, unknown>[] {
  return db.query("SELECT * FROM events ORDER BY seq").all() as Record<string, unknown>[];
}

test("EVT-77: an UPDATE on events is aborted and the row stays as it was", () => {
  const db = openDatabase(":memory:");
  const seq = appendBrokerEvent(db, "peer_joined", { peer: "mother", role: "mother" }, 1000);
  const before = stored(db);
  expect(() => db.run("UPDATE events SET summary = 'changed' WHERE seq = ?", [seq])).toThrow("events is append-only");
  expect(() => db.run("UPDATE events SET data = '{}'")).toThrow("events is append-only");
  expect(stored(db)).toEqual(before);
  expect(before).toHaveLength(1);
});

test("EVT-77: a DELETE on events is aborted and the row stays as it was", () => {
  const db = openDatabase(":memory:");
  const seq = appendBrokerEvent(db, "peer_joined", { peer: "mother", role: "mother" }, 1000);
  const before = stored(db);
  expect(() => db.run("DELETE FROM events WHERE seq = ?", [seq])).toThrow("events is append-only");
  expect(() => db.run("DELETE FROM events")).toThrow("events is append-only");
  expect(stored(db)).toEqual(before);
  expect(before).toHaveLength(1);
});

test("EVT-77: a connection that is not the broker's is aborted too, and the file opens again", () => {
  const dir = mkdtempSync(join(tmpdir(), "squad-db-"));
  const file = join(dir, "squad.db");
  const db = openDatabase(file);
  appendBrokerEvent(db, "peer_joined", { peer: "mother", role: "mother" }, 1000);
  const before = stored(db);
  db.close();

  const other = new Database(file);
  expect(() => other.run("UPDATE events SET summary = 'changed'")).toThrow("events is append-only");
  expect(() => other.run("DELETE FROM events")).toThrow("events is append-only");
  other.close();

  const again = openDatabase(file);
  expect(stored(again)).toEqual(before);
  expect(before).toHaveLength(1);
  again.close();
  rmSync(dir, { recursive: true, force: true });
});

test("features has exactly the columns of the design", () => {
  const db = openDatabase(":memory:");
  expect(columns(db, "features")).toEqual([
    "id", "project", "title", "workflow", "branch", "base_branch", "spec_ref", "spec_commit", "opened_seq",
    "closed_seq", "outcome",
  ]);
});

test("deliveries has exactly the columns of the design, keyed by event and recipient", () => {
  const db = openDatabase(":memory:");
  expect(columns(db, "deliveries")).toEqual(["event_seq", "recipient", "acked_at"]);
  db.run("INSERT INTO deliveries (event_seq, recipient) VALUES (1, 'leader')");
  expect(db.query("SELECT * FROM deliveries").all()).toEqual([{ event_seq: 1, recipient: "leader", acked_at: null }]);
  expect(() => db.run("INSERT INTO deliveries (event_seq, recipient) VALUES (1, 'leader')")).toThrow();
  expect(() => db.run("INSERT INTO deliveries (event_seq, recipient) VALUES (1, 'judge')")).not.toThrow();
});

test("events is indexed by feature and ticket, by question and by gate", () => {
  const db = openDatabase(":memory:");
  const indexed = (db.query("PRAGMA index_list(events)").all() as { name: string }[])
    .map((i) => (db.query(`PRAGMA index_info(${i.name})`).all() as { name: string }[]).map((c) => c.name).join(","))
    .sort();
  expect(indexed).toEqual(["feature_id,ticket_ref", "gate_id", "question_id"]);
});

test("appendEvent stores every field it receives and returns the seq", () => {
  const db = openDatabase(":memory:");
  const first = appendBrokerEvent(db, "peer_joined", { peer: "leader", role: "leader" }, 1000);
  const seq = appendEvent(db, {
    ts: 2000,
    kind: "task",
    feature_id: 4,
    from_name: "leader",
    role_from: "leader",
    to_name: "worker-1",
    summary: "build the parser",
    body: "the whole brief",
    ticket_ref: "T-1",
    data: { loadout: ["tdd"], criteria: [1, 2] },
  });
  expect(seq).toBe(first + 1);
  expect(db.query("SELECT * FROM events WHERE seq = ?").get(seq) as object).toEqual({
    seq,
    ts: 2000,
    kind: "task",
    feature_id: 4,
    from_name: "leader",
    role_from: "leader",
    to_name: "worker-1",
    summary: "build the parser",
    body: "the whole brief",
    ticket_ref: "T-1",
    question_id: null,
    gate_id: null,
    data: '{"loadout":["tdd"],"criteria":[1,2]}',
  });
});

test("appendEvent stores question_id and gate_id in their columns", () => {
  const db = openDatabase(":memory:");
  const seq = appendEvent(db, { ts: 1, kind: "question", from_name: "judge", role_from: "judge", question_id: 5, gate_id: 6 });
  expect(db.query("SELECT question_id, gate_id FROM events WHERE seq = ?").get(seq) as object).toEqual({
    question_id: 5,
    gate_id: 6,
  });
});

test("appendEvent without the optional fields stores no recipient, feature or ticket, and empty texts", () => {
  const db = openDatabase(":memory:");
  const seq = appendEvent(db, { ts: 1, kind: "turn_started", from_name: "judge", role_from: "judge" });
  expect(db.query("SELECT * FROM events WHERE seq = ?").get(seq) as object).toEqual({
    seq,
    ts: 1,
    kind: "turn_started",
    feature_id: null,
    from_name: "judge",
    role_from: "judge",
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: "{}",
  });
});

test("PEER-15: a broker event is stored with broker as author, no recipient and its data", () => {
  const db = openDatabase(":memory:");
  const seq = appendBrokerEvent(db, "peer_left", { peer: "judge", reason: "died" }, 1234);
  expect(db.query("SELECT * FROM events WHERE seq = ?").get(seq) as object).toEqual({
    seq,
    ts: 1234,
    kind: "peer_left",
    feature_id: null,
    from_name: "broker",
    role_from: "broker",
    to_name: null,
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: '{"peer":"judge","reason":"died"}',
  });
});

function feature(db: ReturnType<typeof openDatabase>, closed_seq: number | null) {
  db.run(
    `INSERT INTO features (project, title, workflow, branch, base_branch, spec_ref, spec_commit, opened_seq, closed_seq)
     VALUES ('repo', 'the feature', 'tlc', 'feat/x', 'main', 'spec.md', 'abc1234', 1, ?)`,
    [closed_seq]
  );
}

function features(db: ReturnType<typeof openDatabase>) {
  return db.query("SELECT id, closed_seq FROM features ORDER BY id").all() as { id: number; closed_seq: number | null }[];
}

test("FEAT-09: a second INSERT of an open feature is aborted and the table keeps one row", () => {
  const db = openDatabase(":memory:");
  feature(db, null);
  expect(() => feature(db, null)).toThrow("UNIQUE constraint failed");
  expect(features(db)).toEqual([{ id: 1, closed_seq: null }]);
});

test("FEAT-09: an UPDATE that reopens a closed feature beside an open one is aborted and the row stays as it was", () => {
  const db = openDatabase(":memory:");
  feature(db, 5);
  feature(db, null);
  expect(() => db.run("UPDATE features SET closed_seq = NULL WHERE id = 1")).toThrow("UNIQUE constraint failed");
  expect(features(db)).toEqual([
    { id: 1, closed_seq: 5 },
    { id: 2, closed_seq: null },
  ]);
});

test("FEAT-09: two closed features and an open one are accepted", () => {
  const db = openDatabase(":memory:");
  feature(db, 5);
  feature(db, 9);
  feature(db, null);
  expect(features(db)).toEqual([
    { id: 1, closed_seq: 5 },
    { id: 2, closed_seq: 9 },
    { id: 3, closed_seq: null },
  ]);
});

test("FEAT-09: a database without the index gains it at the next openDatabase and refuses the second open feature", () => {
  const dir = mkdtempSync(join(tmpdir(), "squad-db-"));
  const file = join(dir, "squad.db");
  const old = openDatabase(file);
  old.run("DROP INDEX features_one_open");
  feature(old, null);
  old.close();

  const db = openDatabase(file);
  expect(() => feature(db, null)).toThrow("UNIQUE constraint failed");
  expect(features(db)).toEqual([{ id: 1, closed_seq: null }]);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
