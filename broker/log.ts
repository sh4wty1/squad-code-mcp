/**
 * squad broker event log
 *
 * Writes an event together with its delivery, writes the trace of a refusal,
 * and reads. Every rule of the broker gets the events of the open feature from
 * here and decides over them: there is no other state of a ticket.
 */

import type { Database } from "bun:sqlite";
import { appendEvent, isBlocked } from "./db.ts";
import { refuse, ROSTER, type Refusal } from "./peers.ts";
import type { Caller } from "./send.ts";
import { toRead, type EventRow, type Kind, type SquadEvent } from "./shared/contract.ts";

export interface FeatureRow {
  id: number;
  project: string;
  title: string;
  workflow: string;
  branch: string;
  base_branch: string;
  spec_ref: string;
  spec_commit: string;
  opened_seq: number;
  closed_seq: number | null;
  outcome: string | null;
}

// What the mother sends to open a feature, already validated
export interface FeatureFields {
  title: string;
  workflow: string;
  branch: string;
  base_branch: string;
  spec_ref: string;
  spec_commit: string;
}

// What a rule hands over to be recorded. seq, ts and feature_id are the log's.
export interface NewRecord {
  kind: Kind;
  from: string;
  role_from: string;
  to?: string | null;
  summary?: string;
  body?: string;
  ticket_ref?: string | null;
  // the fields of the kind
  data?: Record<string, unknown>;
}

// Exactly one filter per reading
export type HistoryFilter = { ticket_ref: string } | { question_id: number } | { gate_id: number };

// The kinds that wait for their recipient until it confirms them (ADR-009)
const DELIVERED: Kind[] = ["task", "result", "verdict", "permission_decision"];

export function createLog(db: Database, now: () => number = Date.now) {
  // The open feature is the row with closed_seq NULL. There is at most one.
  function openFeature(): FeatureRow | null {
    return db.query("SELECT * FROM features WHERE closed_seq IS NULL").get() as FeatureRow | null;
  }

  // The events of the open feature in ascending seq, in the read format
  function featureEvents(): SquadEvent[] {
    const feature = openFeature();
    if (!feature) return [];
    const rows = db.query("SELECT * FROM events WHERE feature_id = ? ORDER BY seq").all(feature.id) as EventRow[];
    return rows.map(toRead);
  }

  // An event to "*" waits for every position of the squad but its author. Without a
  // feature_id from the caller, the event takes the one of the open feature.
  function write(event: NewRecord, feature_id?: number): number {
    const seq = appendEvent(db, {
      ts: now(),
      kind: event.kind,
      feature_id: feature_id ?? openFeature()?.id ?? null,
      from_name: event.from,
      role_from: event.role_from,
      to_name: event.to,
      summary: event.summary,
      body: event.body,
      ticket_ref: event.ticket_ref,
      data: event.data,
    });
    const recipients =
      event.to === "*"
        ? ROSTER.map((r) => r.name).filter((name) => name !== event.from)
        : DELIVERED.includes(event.kind)
          ? [event.to ?? null]
          : [];
    for (const recipient of recipients) {
      db.run("INSERT INTO deliveries (event_seq, recipient) VALUES (?, ?)", [seq, recipient]);
    }
    return seq;
  }

  // Event and delivery in one transaction: if the delivery fails, the event is not
  // stored. The recipient does not have to be registered. Returns the seq.
  const record = db.transaction((event: NewRecord): number => write(event));

  // Opens a feature: the feature_opened, its row and the deliveries, together or not at
  // all. The event needs the id of the feature and the row needs the seq of the event,
  // so the id is reserved first. It comes from `events`, which is append-only: an id
  // an event already carries is never given to another feature.
  const open = db.transaction((by: Caller, project: string, fields: FeatureFields) => {
    const { title, workflow, branch, base_branch, spec_ref, spec_commit } = fields;
    const { id } = db.query("SELECT COALESCE(MAX(feature_id), 0) + 1 AS id FROM events").get() as { id: number };
    const seq = write(
      {
        kind: "feature_opened",
        from: by.name,
        role_from: by.role,
        to: "*",
        data: { title, workflow, branch, base_branch, spec_ref, spec_commit },
      },
      id
    );
    db.run(
      `INSERT INTO features (id, project, title, workflow, branch, base_branch, spec_ref, spec_commit, opened_seq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project, title, workflow, branch, base_branch, spec_ref, spec_commit, seq]
    );
    return { feature_id: id, seq };
  });

  // What `write` records is stored together or not at all
  function transaction<T>(write: () => T): T {
    return db.transaction(write)();
  }

  // The name has a blocked with no unblocked for it afterwards, in any feature or in none
  function blocked(name: string): boolean {
    return isBlocked(db, name);
  }

  // The trace of a refusal to a registered peer (ADR-010): the attempted event is not
  // stored, this one is. Returns the refusal to answer with.
  function refused(peer: string, attemptedKind: string, error: string, hint: string): Refusal {
    record({
      kind: "refused",
      from: "broker",
      role_from: "broker",
      data: { peer, attempted_kind: attemptedKind, error },
    });
    return refuse(error, hint);
  }

  // What the name still has to receive, in ascending seq. An event stays here, whatever
  // session asks, until ack confirms it.
  function pending(name: string): SquadEvent[] {
    const rows = db
      .query(
        `SELECT e.* FROM events e JOIN deliveries d ON d.event_seq = e.seq
         WHERE d.recipient = ? AND d.acked_at IS NULL ORDER BY e.seq`
      )
      .all(name) as EventRow[];
    return rows.map(toRead);
  }

  // Confirms the pending deliveries of the name among `seqs`. The delivery of another
  // name and the one already confirmed stay as they were.
  const ack = db.transaction((name: string, seqs: number[]) => {
    const at = now();
    for (const seq of seqs) {
      db.run("UPDATE deliveries SET acked_at = ? WHERE recipient = ? AND event_seq = ? AND acked_at IS NULL", [
        at,
        name,
        seq,
      ]);
    }
  });

  // The whole log after a cursor: every feature, and the events of none
  function after(n: number): SquadEvent[] {
    return (db.query("SELECT * FROM events WHERE seq > ? ORDER BY seq").all(n) as EventRow[]).map(toRead);
  }

  // The greatest seq of the log, 0 while it is empty
  function lastSeq(): number {
    return (db.query("SELECT COALESCE(MAX(seq), 0) AS seq FROM events").get() as { seq: number }).seq;
  }

  // A ticket_ref is unique inside a feature, so it is looked up in the open one only.
  // question_id and gate_id are ids of the database and need no feature.
  function history(filter: HistoryFilter): SquadEvent[] {
    let rows: EventRow[];
    if ("ticket_ref" in filter) {
      const feature = openFeature();
      if (!feature) return [];
      rows = db
        .query("SELECT * FROM events WHERE feature_id = ? AND ticket_ref = ? ORDER BY seq")
        .all(feature.id, filter.ticket_ref) as EventRow[];
    } else if ("question_id" in filter) {
      rows = db.query("SELECT * FROM events WHERE question_id = ? ORDER BY seq").all(filter.question_id) as EventRow[];
    } else {
      rows = db.query("SELECT * FROM events WHERE gate_id = ? ORDER BY seq").all(filter.gate_id) as EventRow[];
    }
    return rows.map(toRead);
  }

  return { openFeature, featureEvents, record, open, transaction, blocked, refused, pending, ack, after, lastSeq, history };
}

export type Log = ReturnType<typeof createLog>;
