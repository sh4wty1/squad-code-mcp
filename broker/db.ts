/**
 * squad broker storage
 *
 * SQLite schema and the single write path of the event log.
 * `events` is append-only: nothing here updates or deletes a row of it.
 */

import { Database } from "bun:sqlite";

export function openDatabase(path: string): Database {
  const db = new Database(path);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 3000");

  // id is the peer's credential, name is its address
  db.run(`
    CREATE TABLE IF NOT EXISTS peers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      pid INTEGER NOT NULL,
      cwd TEXT NOT NULL,
      git_root TEXT,
      registered_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      kind TEXT NOT NULL,
      feature_id INTEGER REFERENCES features(id),
      from_name TEXT NOT NULL,
      role_from TEXT NOT NULL,
      to_name TEXT,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      ticket_ref TEXT,
      question_id INTEGER REFERENCES questions(id),
      gate_id INTEGER REFERENCES gates(id),
      data TEXT NOT NULL
    )
  `);

  return db;
}

// Records an event authored by the broker itself. Returns its seq.
export function appendBrokerEvent(
  db: Database,
  kind: "peer_joined" | "peer_left",
  data: Record<string, string>,
  ts: number
): number {
  const result = db.run(
    `INSERT INTO events (ts, kind, from_name, role_from, summary, body, data)
     VALUES (?, ?, 'broker', 'broker', '', '', ?)`,
    [ts, kind, JSON.stringify(data)]
  );
  return Number(result.lastInsertRowid);
}
