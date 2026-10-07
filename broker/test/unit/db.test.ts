import { expect, test } from "bun:test";
import { appendBrokerEvent, openDatabase } from "../../db.ts";

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
