/**
 * squad derivation
 *
 * The state of the tickets and what each peer owes, computed from the events of
 * the open feature and from nothing else (ADR-002, ADR-006). Pure functions: no
 * database, no clock. The broker decides with them and the TUI shows the same thing.
 */

import type { FeatureFields } from "../log.ts";
import type { Role } from "../peers.ts";
import type { SquadEvent } from "./contract.ts";

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
