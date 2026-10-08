/**
 * squad broker /plan
 *
 * The leader hands over the whole list of tickets of the open feature. The plan
 * of the greatest seq is the current one: it says which tickets exist, their
 * titles and which were dropped.
 */

import type { Log } from "./log.ts";
import type { Answer, Caller } from "./send.ts";
import type { PlannedTicket } from "./shared/contract.ts";
import { tickets as ticketsOf } from "./shared/derive.ts";

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

// A list with at least one ticket, each with the types of the contract
function isTicketList(value: unknown): value is PlannedTicket[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        typeof t.ticket_ref === "string" &&
        t.ticket_ref !== "" &&
        typeof t.title === "string" &&
        t.title !== "" &&
        (t.depends_on === undefined || isStrings(t.depends_on)) &&
        (t.dropped === undefined || typeof t.dropped === "boolean")
    )
  );
}

export function createPlan(log: Log) {
  // `peer` is who the id of the request belongs to and `body` the JSON object received
  function plan(peer: Caller, body: Record<string, unknown>): Answer {
    const no = (error: string, hint: string) => log.refused(peer.name, "plan", error, hint);

    if (peer.role !== "leader") {
      return no("edge_not_allowed", "Only the leader plans. Ask the leader for what you need.");
    }
    if (!log.openFeature()) {
      return no("no_open_feature", "No feature is open. Wait for the mother to open one before planning.");
    }
    const list = body.tickets;
    if (!isTicketList(list)) {
      return no(
        "missing_field",
        "Send tickets as a non-empty list of { ticket_ref, title, depends_on?, dropped? }: ticket_ref and title non-empty strings, depends_on a list of strings and dropped a boolean."
      );
    }

    const refs = list.map((t) => t.ticket_ref);
    const current = ticketsOf(log.featureEvents());
    for (const t of list) {
      if (refs.indexOf(t.ticket_ref) !== refs.lastIndexOf(t.ticket_ref)) {
        return no("invalid_plan", `${t.ticket_ref} appears more than once. Send each ticket once.`);
      }
      const unresolved = (t.depends_on ?? []).find((d) => d === t.ticket_ref || !refs.includes(d));
      if (unresolved !== undefined) {
        return no(
          "invalid_plan",
          `${t.ticket_ref} depends on ${unresolved}, which is itself or is not in the list. A ticket depends only on other tickets of the plan.`
        );
      }
      if (current.get(t.ticket_ref)?.dropped && t.dropped !== true) {
        return no(
          "invalid_plan",
          `${t.ticket_ref} was dropped and does not come back. Keep it with dropped true and plan a new ticket.`
        );
      }
    }
    const started = [...current.values()].find((t) => t.taskSeq !== null && !refs.includes(t.ticket_ref));
    if (started) {
      return no(
        "plan_drops_started_ticket",
        `${started.ticket_ref} already received a task. Keep it in the plan, with dropped true if it is to be abandoned.`
      );
    }

    // Only the keys of the contract are stored, and only those that came
    const stored = list.map((t) => ({
      ticket_ref: t.ticket_ref,
      title: t.title,
      ...(t.depends_on !== undefined && { depends_on: t.depends_on }),
      ...(t.dropped !== undefined && { dropped: t.dropped }),
    }));
    const seq = log.record({ kind: "plan", from: peer.name, role_from: peer.role, data: { tickets: stored } });
    return { ok: true, seq };
  }

  return { plan };
}
