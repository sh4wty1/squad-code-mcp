/**
 * squad derivation
 *
 * The state of the tickets and what each peer owes, computed from the events of
 * the open feature and from nothing else (ADR-002, ADR-006). Pure functions: no
 * database, no clock. The broker decides with them and the TUI shows the same thing.
 */

import type { FeatureFields } from "../log.ts";
import type { Role } from "../peers.ts";
import type { Kind, SquadEvent } from "./contract.ts";

export interface Ticket {
  ticket_ref: string;
  // from the current plan; empty when the plan does not have the ticket
  title: string;
  // the current plan has the ticket
  planned: boolean;
  dropped: boolean;
  // the `to` of the latest task
  owner: string | null;
  taskSeq: number | null;
  resultSeq: number | null;
  // the latest event of the ticket
  last: { kind: "task" | "result" | "verdict"; seq: number; outcome?: "approve" | "rework" } | null;
  reworks: number;
  approved: boolean;
}

// One ticket for each ticket_ref of the current plan or with an event of the ticket.
// `events` are those of the open feature.
export function tickets(events: SquadEvent[]): Map<string, Ticket> {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  const all = new Map<string, Ticket>();

  function ticket(ref: string): Ticket {
    let t = all.get(ref);
    if (!t) {
      t = {
        ticket_ref: ref,
        title: "",
        planned: false,
        dropped: false,
        owner: null,
        taskSeq: null,
        resultSeq: null,
        last: null,
        reworks: 0,
        approved: false,
      };
      all.set(ref, t);
    }
    return t;
  }

  // The current plan is the whole list: an earlier one says nothing anymore
  const plan = ordered.findLast((e) => e.kind === "plan");
  if (plan?.kind === "plan") {
    for (const planned of plan.tickets) {
      const t = ticket(planned.ticket_ref);
      t.title = planned.title;
      t.planned = true;
      t.dropped = planned.dropped === true;
    }
  }

  // Only task, result and verdict are events of a ticket: a question, an answer or a
  // blocked may carry its ticket_ref and change nothing here
  for (const e of ordered) {
    if (e.ticket_ref === null) continue;
    if (e.kind === "task") {
      const t = ticket(e.ticket_ref);
      t.owner = e.to;
      t.taskSeq = e.seq;
      t.last = { kind: "task", seq: e.seq };
    } else if (e.kind === "result") {
      const t = ticket(e.ticket_ref);
      t.resultSeq = e.seq;
      t.last = { kind: "result", seq: e.seq };
    } else if (e.kind === "verdict") {
      const t = ticket(e.ticket_ref);
      if (e.outcome === "rework") t.reworks++;
      t.last = { kind: "verdict", seq: e.seq, outcome: e.outcome };
    }
  }

  for (const t of all.values()) {
    t.approved = t.last?.kind === "verdict" && t.last.outcome === "approve";
  }
  return all;
}

export interface Owed {
  owes: "result" | "verdict" | "task" | "plan" | "delivery";
  ticket_ref?: string;
  // the event that created the debt
  seq: number;
}

// A ticket takes two reworks: the third verdict of rework leaves it to the leader to drop
export const REWORK_LIMIT = 3;

// What a peer owes, in ascending order of seq. `events` are those of the open feature
// and `pendingSeqs` the events still to be delivered to the name.
export function owed(name: string, role: Role, events: SquadEvent[], pendingSeqs: number[]): Owed[] {
  // A delivery comes before the debt its own event creates: the peer has to read the
  // task before it can owe the result
  const debts: Owed[] = pendingSeqs.map((seq) => ({ owes: "delivery", seq }));

  for (const t of tickets(events).values()) {
    if (t.dropped || !t.last) continue;
    const { kind, seq, outcome } = t.last;
    if (role === "worker" && t.owner === name && kind === "task") {
      debts.push({ owes: "result", ticket_ref: t.ticket_ref, seq });
    }
    if (role === "judge" && kind === "result") {
      debts.push({ owes: "verdict", ticket_ref: t.ticket_ref, seq });
    }
    if (role === "leader" && kind === "verdict" && outcome === "rework" && t.reworks < REWORK_LIMIT) {
      debts.push({ owes: "task", ticket_ref: t.ticket_ref, seq });
    }
  }

  // The plan after the kickoff. With a plan in the feature, a later task of the mother
  // adds scope and does not oblige the leader to plan again.
  if (role === "leader" && !events.some((e) => e.kind === "plan")) {
    const kickoffs = events.filter((e) => e.kind === "task" && e.role_from === "mother").map((e) => e.seq);
    if (kickoffs.length > 0) debts.push({ owes: "plan", seq: Math.min(...kickoffs) });
  }

  return debts.sort((a, b) => a.seq - b.seq);
}

// A row of `features` without `project`, which is not a field of the event
export interface DerivedFeature extends FeatureFields {
  id: number;
  opened_seq: number;
  closed_seq: number | null;
  outcome: string | null;
}

// Every feature of the log, in ascending id. `events` are the whole log, not only those
// of the open feature.
export function features(events: SquadEvent[]): DerivedFeature[] {
  const all = new Map<number, DerivedFeature>();
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    if (e.kind === "feature_opened") {
      const id = e.feature_id as number;
      all.set(id, {
        id,
        title: e.title,
        workflow: e.workflow,
        branch: e.branch,
        base_branch: e.base_branch,
        spec_ref: e.spec_ref,
        spec_commit: e.spec_commit,
        opened_seq: e.seq,
        closed_seq: null,
        outcome: null,
      });
    } else if (e.kind === "feature_closed") {
      const feature = all.get(e.feature_id as number);
      if (feature) {
        feature.closed_seq = e.seq;
        feature.outcome = e.outcome;
      }
    }
  }
  return [...all.values()].sort((a, b) => a.id - b.id);
}

type EventOf<K extends Kind> = Extract<SquadEvent, { kind: K }>;

function bySeq(events: SquadEvent[]): SquadEvent[] {
  return [...events].sort((a, b) => a.seq - b.seq);
}

// The six positions of the star, in the order the screens list them
export const SQUAD: { name: string; role: Role; short: string }[] = [
  { name: "mother", role: "mother", short: "mot" },
  { name: "leader", role: "leader", short: "ldr" },
  { name: "worker-1", role: "worker", short: "w1" },
  { name: "worker-2", role: "worker", short: "w2" },
  { name: "worker-3", role: "worker", short: "w3" },
  { name: "judge", role: "judge", short: "jdg" },
];

export interface Presence {
  online: boolean;
  // the ts of the latest event of presence
  since: number;
  joins: number;
}

// Whether each name is in the broker. A name that never had an event of presence has
// no entry. `events` are the whole log, here and in the two functions below.
export function presence(events: SquadEvent[]): Map<string, Presence> {
  const all = new Map<string, Presence>();
  for (const e of bySeq(events)) {
    if (e.kind !== "peer_joined" && e.kind !== "peer_left") continue;
    const joined = e.kind === "peer_joined";
    all.set(e.peer, { online: joined, since: e.ts, joins: (all.get(e.peer)?.joins ?? 0) + (joined ? 1 : 0) });
  }
  return all;
}

// The permission requests still open, in ascending seq. A request closes with the
// decision that cites it and with any later event of its peer: the dev may have answered
// in the terminal. What the broker writes about the peer has `from` "broker" and closes nothing.
export function openPermissions(events: SquadEvent[]): EventOf<"permission_request">[] {
  const decided = new Set<number>();
  const latest = new Map<string, number>();
  for (const e of events) {
    if (e.kind === "permission_decision") decided.add(e.request_seq);
    latest.set(e.from, Math.max(latest.get(e.from) ?? 0, e.seq));
  }
  return bySeq(events).filter(
    (e): e is EventOf<"permission_request"> =>
      e.kind === "permission_request" && !decided.has(e.seq) && latest.get(e.from) === e.seq
  );
}

// The block each name declared: its latest `blocked` with no `unblocked` of the name after it
export function blocks(events: SquadEvent[]): Map<string, EventOf<"blocked">> {
  const all = new Map<string, EventOf<"blocked">>();
  for (const e of bySeq(events)) {
    if (e.kind === "blocked") all.set(e.from, e);
    else if (e.kind === "unblocked") all.delete(e.peer);
  }
  return all;
}

export interface Question {
  id: number;
  asked_by: string;
  // the `to` of the latest question
  holder: string;
  blocking: boolean;
  ticket_ref: string | null;
  // no answer of its own and not merged into another. A merged one is not open and has
  // `resolved_by` null until the one it was merged into closes.
  open: boolean;
  merged_into: number | null;
  default: string | null;
  // when the default applies: only for a non-blocking one that reached the dev
  deadline: number | null;
  // the ts of the first question to "human"
  reached_human_ts: number | null;
  // who asked, then each holder in order
  route: string[];
  resolved_by: EventOf<"answer">["resolved_by"] | null;
  answer: string | null;
  // of the first and of the latest question
  first_seq: number;
  last_seq: number;
}

// A non-blocking question without timeout_s waits this long for the dev
const TIMEOUT_S = 240;

// Every question with at least one `question`, in the order they were asked. `events`
// are those of the open feature, here and in `gates`.
export function questions(events: SquadEvent[]): Question[] {
  const ordered = bySeq(events);
  const all = new Map<number, Question>();

  for (const e of ordered) {
    if (e.kind !== "question") continue;
    let q = all.get(e.question_id);
    if (!q) {
      // What the question is comes from who asked it; an escalation only moves the holder
      q = {
        id: e.question_id,
        asked_by: e.asked_by,
        holder: e.to as string,
        blocking: e.blocking,
        ticket_ref: e.ticket_ref,
        open: true,
        merged_into: null,
        default: e.default ?? null,
        deadline: null,
        reached_human_ts: null,
        route: [e.from],
        resolved_by: null,
        answer: null,
        first_seq: e.seq,
        last_seq: e.seq,
      };
      all.set(q.id, q);
    }
    q.holder = e.to as string;
    q.route.push(q.holder);
    q.last_seq = e.seq;
    if (q.holder === "human" && q.reached_human_ts === null) {
      q.reached_human_ts = e.ts;
      if (!q.blocking) q.deadline = e.ts + (e.timeout_s ?? TIMEOUT_S) * 1000;
    }
  }

  for (const e of ordered) {
    if (e.kind === "answer") {
      // The first answer to be written is the one that counts
      const q = all.get(e.question_id);
      if (q && q.resolved_by === null) {
        q.open = false;
        q.resolved_by = e.resolved_by;
        q.answer = e.answer;
      }
    } else if (e.kind === "question_merged") {
      const q = all.get(e.question_id);
      if (q) {
        q.open = false;
        q.merged_into = e.into;
      }
    }
  }

  // A merged question without an answer of its own closes with the one it was merged
  // into. The walk stops after as many steps as there are questions: a cycle closes nothing.
  for (const q of all.values()) {
    let into = q;
    for (let steps = 0; steps < all.size && into.resolved_by === null && into.merged_into !== null; steps++) {
      into = all.get(into.merged_into) ?? into;
    }
    if (into !== q) {
      q.resolved_by = into.resolved_by;
      q.answer = into.answer;
    }
  }
  return [...all.values()];
}

export interface Gate {
  id: number;
  // no gate_decision of approve or reject: a comment does not decide
  pending: boolean;
  // the seq of the gate
  request_seq: number;
  decision: "approve" | "reject" | null;
}

// Every gate, in the order they were asked
export function gates(events: SquadEvent[]): Gate[] {
  const ordered = bySeq(events);
  const all = new Map<number, Gate>();
  for (const e of ordered) {
    if (e.kind === "gate" && !all.has(e.gate_id)) {
      all.set(e.gate_id, { id: e.gate_id, pending: true, request_seq: e.seq, decision: null });
    }
  }
  for (const e of ordered) {
    if (e.kind !== "gate_decision" || e.decision === "comment") continue;
    const gate = all.get(e.gate_id);
    if (gate?.pending) {
      gate.pending = false;
      gate.decision = e.decision;
    }
  }
  return [...all.values()];
}

const COUNTS = ["input", "output", "cache_write", "cache_read"] as const;

// The tokens of each model
export type Totals = Record<string, Record<(typeof COUNTS)[number], number>>;

// The tokens each name used: the sum of its latest `usage` of each session_id and model,
// which is accumulated. With `sinceSeq`, only what was used after that event: the latest
// `usage` before it is taken out, and a session that started later counts whole. A name
// without `usage` has no entry. `events` are the whole log.
export function usageTotals(events: SquadEvent[], sinceSeq?: number): Map<string, Totals> {
  const latest = new Map<string, EventOf<"usage">>();
  const before = new Map<string, EventOf<"usage">>();
  for (const e of bySeq(events)) {
    if (e.kind !== "usage") continue;
    const key = JSON.stringify([e.from, e.session_id, e.model]);
    latest.set(key, e);
    if (sinceSeq !== undefined && e.seq < sinceSeq) before.set(key, e);
  }

  const all = new Map<string, Totals>();
  for (const [key, e] of latest) {
    const models = all.get(e.from) ?? {};
    all.set(e.from, models);
    const total = (models[e.model] ??= { input: 0, output: 0, cache_write: 0, cache_read: 0 });
    for (const count of COUNTS) total[count] += e[count] - (before.get(key)?.[count] ?? 0);
  }
  return all;
}
