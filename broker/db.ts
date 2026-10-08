/**
 * squad broker storage
 *
 * SQLite schema and the single write path of the event log.
 * `events` is append-only: nothing here updates or deletes a row of it, and
 * two triggers abort whoever tries.
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

  // Created here and read by this slice; the Feature slice is the one that fills it.
  // The open feature is the row with closed_seq NULL.
  db.run(`
    CREATE TABLE IF NOT EXISTS features (
      id INTEGER PRIMARY KEY,
      project TEXT NOT NULL,
      title TEXT NOT NULL,
      workflow TEXT NOT NULL,
      branch TEXT NOT NULL,
      base_branch TEXT NOT NULL,
      spec_ref TEXT NOT NULL,
      spec_commit TEXT NOT NULL,
      opened_seq INTEGER NOT NULL REFERENCES events(seq),
      closed_seq INTEGER REFERENCES events(seq),
      outcome TEXT
    )
  `);

  // What each name still has to receive. Pending while acked_at is NULL (ADR-009).
  db.run(`
    CREATE TABLE IF NOT EXISTS deliveries (
      event_seq INTEGER NOT NULL REFERENCES events(seq),
      recipient TEXT NOT NULL,
      acked_at INTEGER,
      PRIMARY KEY (event_seq, recipient)
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS events_feature_ticket ON events (feature_id, ticket_ref)");
  db.run("CREATE INDEX IF NOT EXISTS events_question ON events (question_id)");
  db.run("CREATE INDEX IF NOT EXISTS events_gate ON events (gate_id)");

  // Append-only for every connection, not only for this code (ADR-002)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
    BEGIN SELECT RAISE(ABORT, 'events is append-only'); END
  `);
  db.run(`
    CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
    BEGIN SELECT RAISE(ABORT, 'events is append-only'); END
  `);

  return db;
}

export interface NewEvent {
  ts: number;
  kind: string;
  feature_id?: number | null;
  from_name: string;
  role_from: string;
  to_name?: string | null;
  summary?: string;
  body?: string;
  ticket_ref?: string | null;
  question_id?: number | null;
  gate_id?: number | null;
  // the fields of the kind
  data?: Record<string, unknown>;
}

// The single write path of `events`. Returns the seq of the new row.
export function appendEvent(db: Database, event: NewEvent): number {
  const result = db.run(
    `INSERT INTO events
       (ts, kind, feature_id, from_name, role_from, to_name, summary, body, ticket_ref, question_id, gate_id, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.ts,
      event.kind,
      event.feature_id ?? null,
      event.from_name,
      event.role_from,
      event.to_name ?? null,
      event.summary ?? "",
      event.body ?? "",
      event.ticket_ref ?? null,
      event.question_id ?? null,
      event.gate_id ?? null,
      JSON.stringify(event.data ?? {}),
    ]
  );
  return Number(result.lastInsertRowid);
}

// Blocked is the agent's: a blocked of the name with no unblocked for it afterwards
export function isBlocked(db: Database, name: string): boolean {
  const last = db
    .query(
      `SELECT kind FROM events
       WHERE (kind = 'blocked' AND from_name = ?) OR (kind = 'unblocked' AND json_extract(data, '$.peer') = ?)
       ORDER BY seq DESC LIMIT 1`
    )
    .get(name, name) as { kind: string } | null;
  return last?.kind === "blocked";
}

// Records an event authored by the broker itself. Returns its seq.
export function appendBrokerEvent(
  db: Database,
  kind: "peer_joined" | "peer_left",
  data: Record<string, string>,
  ts: number
): number {
  return appendEvent(db, { ts, kind, from_name: "broker", role_from: "broker", data });
}
