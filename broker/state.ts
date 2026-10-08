/**
 * squad broker /state
 *
 * What a session asks when it starts or is relaunched: the open feature, the
 * ticket it has and what it owes. All of it derived from the log at each call.
 */

import type { Log } from "./log.ts";
import type { Caller } from "./send.ts";
import { owed, tickets, type Owed } from "./shared/derive.ts";

export interface State {
  feature: {
    id: number;
    title: string;
    workflow: string;
    branch: string;
    base_branch: string;
    spec_ref: string;
    spec_commit: string;
  } | null;
  // the ticket open for a worker; null for the other roles, whose tickets are in `owed`
  ticket: { ticket_ref: string; title: string; task_seq: number; reworks: number } | null;
  owed: Owed[];
}

export function createState(log: Log) {
  // `peer` is who the id of the request belongs to
  function state(peer: Caller): State {
    const feature = log.openFeature();
    const events = log.featureEvents();

    // Open for a worker: it owns the ticket, not approved and not dropped. Only a
    // worker owns a ticket, so the other roles find none.
    const open = [...tickets(events).values()].find((t) => t.owner === peer.name && !t.approved && !t.dropped);

    return {
      feature: feature && {
        id: feature.id,
        title: feature.title,
        workflow: feature.workflow,
        branch: feature.branch,
        base_branch: feature.base_branch,
        spec_ref: feature.spec_ref,
        spec_commit: feature.spec_commit,
      },
      ticket: open
        ? { ticket_ref: open.ticket_ref, title: open.title, task_seq: open.taskSeq as number, reworks: open.reworks }
        : null,
      owed: owed(
        peer.name,
        peer.role,
        events,
        log.pending(peer.name).map((e) => e.seq)
      ),
    };
  }

  return { state };
}
