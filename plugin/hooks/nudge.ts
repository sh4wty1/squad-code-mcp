/**
 * squad hook nudge
 *
 * Whether a session that is ending its turn goes back to work, and what it is told.
 * The status rule of the contract decides (`squad`, ADR-006), applied to the log as
 * if the turn had ended: only who would come out of it stalled is sent back
 * (AD-017). Pure: no broker and no clock.
 */

import type { SquadEvent } from "../../broker/shared/contract.ts";
import { squad, SQUAD, type Owed } from "../../broker/shared/derive.ts";

// What is said of a debt. A delivery is not one the status rule gives.
function sentence(debt: Owed): string | null {
  const { ticket_ref, question_id, seq } = debt;
  switch (debt.owes) {
    case "result":
      return `the result of ticket ${ticket_ref}, for the task of seq ${seq}. Finish it and send it with send_result.`;
    case "verdict":
      return `the verdict of ticket ${ticket_ref}, for the result of seq ${seq}. Judge it and send it with send_verdict.`;
    case "task":
      return `the rework task of ticket ${ticket_ref}, after the verdict of seq ${seq}. Send it with send_task.`;
    case "plan":
      return `the plan of the feature, after the kickoff of seq ${seq}. Send it with plan.`;
    case "answer":
      return `an answer to question ${question_id}, which you hold since seq ${seq}. Answer it with answer or pass it on with escalate.`;
    default:
      return null;
  }
}

// The reason to give a session of `name` that is ending its turn, or null when it may end.
// `events` are the whole log.
export function nudge(events: SquadEvent[], name: string, now: number): string | null {
  const role = SQUAD.find((agent) => agent.name === name)?.role;
  if (!role) return null;

  // The end of the turn that has not been recorded: a usage of the name after everything else
  const ended = {
    seq: events.reduce((last, e) => Math.max(last, e.seq), 0) + 1,
    ts: events.reduce((last, e) => Math.max(last, e.ts), 0) + 1,
    kind: "usage",
    feature_id: null,
    from: name,
    role_from: role,
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    session_id: "",
    model: "",
    input: 0,
    output: 0,
    cache_write: 0,
    cache_read: 0,
  } satisfies SquadEvent;

  const agent = squad([...events, ended], now).agents.find((a) => a.name === name);
  const owed = agent?.status === "stalled" && agent.owes ? sentence(agent.owes) : null;
  return owed && `You are ending the turn and still owe the squad ${owed} If you cannot go on, ask a question with ask or call blocked.`;
}
