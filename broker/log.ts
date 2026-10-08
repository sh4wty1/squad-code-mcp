/**
 * squad broker event log
 *
 * Writes an event together with its delivery, writes the trace of a refusal,
 * and reads. Every rule of the broker gets the events of the open feature from
 * here and decides over them: there is no other state of a ticket.
 */

import type { Database } from "bun:sqlite";
import { appendEvent } from "./db.ts";
import { refuse, type Refusal } from "./peers.ts";
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

  // Event and delivery in one transaction: if the delivery fails, the event is not
  // stored. The recipient does not have to be registered. Returns the seq.
  const record = db.transaction((event: NewRecord): number => {
    const seq = appendEvent(db, {
      ts: now(),
      kind: event.kind,
      feature_id: openFeature()?.id ?? null,
      from_name: event.from,
      role_from: event.role_from,
      to_name: event.to,
      summary: event.summary,
      body: event.body,
      ticket_ref: event.ticket_ref,
      data: event.data,
    });
    if (DELIVERED.includes(event.kind)) {
      db.run("INSERT INTO deliveries (event_seq, recipient) VALUES (?, ?)", [seq, event.to ?? null]);
    }
    return seq;
  });

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

  return { openFeature, featureEvents, record, refused };
}
