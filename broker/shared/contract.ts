/**
 * squad event contract
 *
 * The envelope every event carries, the twenty kinds, the edges of the star and
 * the read format: what /poll-messages, /history and GET /events answer.
 * No database and no HTTP here: the TUI imports this file too.
 */

import type { Role } from "../peers.ts";

export const KINDS = [
  // messages
  "task",
  "result",
  "verdict",
  "question",
  "answer",
  "gate",
  "gate_decision",
  "permission_request",
  "permission_decision",
  // records
  "feature_opened",
  "feature_closed",
  "peer_joined",
  "peer_left",
  "plan",
  "turn_started",
  "blocked",
  "unblocked",
  "usage",
  "question_merged",
  "refused",
] as const;

export type Kind = (typeof KINDS)[number];

// The only (kind, role of the sender, role of the recipient) trios /send accepts
export const EDGES: { kind: "task" | "result" | "verdict"; from: Role; to: Role }[] = [
  { kind: "task", from: "mother", to: "leader" },
  { kind: "task", from: "leader", to: "worker" },
  { kind: "result", from: "worker", to: "judge" },
  { kind: "result", from: "leader", to: "mother" },
  { kind: "verdict", from: "judge", to: "leader" },
];

// A row of `events`, as stored
export interface EventRow {
  seq: number;
  ts: number;
  kind: string;
  feature_id: number | null;
  from_name: string;
  role_from: string;
  to_name: string | null;
  summary: string;
  body: string;
  ticket_ref: string | null;
  question_id: number | null;
  gate_id: number | null;
  // JSON of the fields of the kind
  data: string;
}

export interface Envelope {
  seq: number;
  ts: number;
  feature_id: number | null;
  // peer name, "human" or "broker"
  from: string;
  role_from: string;
  // peer name, "human", "*" or null in a record without recipient
  to: string | null;
  summary: string;
  body: string;
  ticket_ref: string | null;
}

export interface Criterion {
  n: number;
  text: string;
  pass: boolean;
  note?: string;
}

export interface PlannedTicket {
  ticket_ref: string;
  title: string;
  depends_on?: string[];
  dropped?: boolean;
}

// The fields of each kind, at the same level as the envelope
interface KindFields {
  // loadout and criteria only from leader to worker
  task: { loadout?: string[]; criteria?: number[] };
  // task_seq, branch and commit only from worker to judge
  result: { task_seq?: number; branch?: string; commit?: string };
  verdict: { result_seq: number; outcome: "approve" | "rework"; criteria: Criterion[] };
  question: {
    question_id: number;
    asked_by: string;
    blocking: boolean;
    why: string;
    options?: string[];
    default?: string;
    timeout_s?: number;
  };
  answer: {
    question_id: number;
    answer: string;
    resolved_by: "human" | "agent" | "timeout_default" | "result_default";
  };
  gate: {
    gate_id: number;
    scope: "delivery" | "action";
    commit?: string;
    action: string;
    effect: string;
    diffstat?: string;
  };
  gate_decision: { gate_id: number; decision: "approve" | "reject" | "comment"; text?: string };
  permission_request: { request_id: string; tool_name: string; description: string; input_preview: string };
  permission_decision: { request_seq: number; behavior: "allow" | "deny" };
  feature_opened: {
    title: string;
    workflow: "tlc" | "matt-pocock";
    branch: string;
    base_branch: string;
    spec_ref: string;
    spec_commit: string;
  };
  feature_closed: { outcome: "delivered" | "abandoned" };
  peer_joined: { peer: string; role: string };
  peer_left: { peer: string; reason: "unregistered" | "died" };
  plan: { tickets: PlannedTicket[] };
  turn_started: {};
  blocked: { reason: string; detail: string; last_action: string };
  unblocked: { peer: string };
  usage: {
    session_id: string;
    model: string;
    input: number;
    output: number;
    cache_write: number;
    cache_read: number;
  };
  question_merged: { question_id: number; into: number };
  refused: { peer: string; attempted_kind: string; error: string };
}

// The read format: a flat object, discriminated by `kind`
export type SquadEvent = { [K in Kind]: Envelope & { kind: K } & KindFields[K] }[Kind];

// The envelope goes last: no field of `data` can pass for one of the broker's
export function toRead(row: EventRow): SquadEvent {
  return {
    ...JSON.parse(row.data),
    seq: row.seq,
    ts: row.ts,
    kind: row.kind,
    feature_id: row.feature_id,
    from: row.from_name,
    role_from: row.role_from,
    to: row.to_name,
    summary: row.summary,
    body: row.body,
    ticket_ref: row.ticket_ref,
  } as SquadEvent;
}
