/**
 * squad derivation
 *
 * The state of the tickets, computed from the events of the open feature and
 * from nothing else (ADR-002, ADR-006). Pure functions: no database, no clock.
 * The broker decides with them and the TUI shows the same thing.
 */

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
