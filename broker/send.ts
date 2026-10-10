/**
 * squad broker /send
 *
 * The door of the contract (ADR-004): a peer sends a task, a result or a verdict
 * along an edge of the star. The broker stamps who the sender is, refuses the
 * rest in a fixed order and leaves the trace of every refusal in the log.
 */

import type { Log } from "./log.ts";
import { ROSTER, type Refusal, type Role } from "./peers.ts";
import { EDGES, type Criterion } from "./shared/contract.ts";
import { REWORK_LIMIT, tickets } from "./shared/derive.ts";

// Who holds the credential of the request: what `find` of the peer registry answers
export interface Caller {
  name: string;
  role: Role;
}

export type Answer = { ok: true; seq: number } | Refusal;

type SentKind = (typeof EDGES)[number]["kind"];

const SENT: readonly string[] = ["task", "result", "verdict"];

export const SUMMARY_MAX = 80;

// An attempted kind longer than this is not kept in the trace of the refusal
const ATTEMPTED_KIND_MAX = 40;

// The kinds that are not sent here and have a route of their own
const ROUTE_OF: Record<string, string> = {
  plan: "/plan",
  blocked: "/blocked",
  unblocked: "/unblocked",
  usage: "/usage",
  turn_started: "/turn-started",
  permission_request: "/permission-request",
  permission_decision: "/permission-decision",
};

// What the rule of an edge decides: the refusal, or what is stored besides the envelope
type Ruling = { error: string; hint: string } | { ticket_ref: string | null; data: Record<string, unknown> };

function isListOf(value: unknown, isItem: (item: unknown) => boolean): boolean {
  return Array.isArray(value) && value.every(isItem);
}

const isString = (value: unknown) => typeof value === "string";

export function isText(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

function isCriterion(value: unknown): value is Criterion {
  if (typeof value !== "object" || value === null) return false;
  const { n, text, pass, note } = value as Record<string, unknown>;
  return (
    Number.isInteger(n) &&
    typeof text === "string" &&
    typeof pass === "boolean" &&
    (note === undefined || typeof note === "string")
  );
}

// `afterResult` runs inside the transaction of the result of a worker, with its name and the
// ticket delivered: what it records is stored with the result or not at all
export function createSend(log: Log, afterResult?: (worker: string, ticket_ref: string) => void) {
  // task mother → leader and result leader → mother: no ticket and no field of their own
  function untracked(body: Record<string, unknown>): Ruling {
    if (body.ticket_ref != null) {
      return {
        error: "invalid_field",
        hint: "This message is about the feature, not about a ticket. Send it without ticket_ref.",
      };
    }
    return { ticket_ref: null, data: {} };
  }

  // task leader → worker: a ticket of the current plan, still open, for a free worker
  function assignment(to: string, body: Record<string, unknown>): Ruling {
    const { ticket_ref, loadout, criteria } = body;
    if (
      !isText(ticket_ref) ||
      !isListOf(loadout, isString) ||
      (criteria !== undefined && !isListOf(criteria, Number.isInteger))
    ) {
      return {
        error: "missing_field",
        hint: "A task to a worker takes ticket_ref as a non-empty string, loadout as a list of strings, which may be empty, and criteria, if any, as a list of integers.",
      };
    }

    const all = tickets(log.featureEvents());
    const ticket = all.get(ticket_ref);
    if (!ticket?.planned) {
      return {
        error: "unplanned_ticket",
        hint: `${ticket_ref} is not in the current plan. Send a plan that has it before the task.`,
      };
    }
    if (ticket.dropped) {
      return { error: "ticket_dropped", hint: `${ticket_ref} was dropped and takes no task. Plan a new ticket.` };
    }
    if (ticket.approved) {
      return { error: "ticket_closed", hint: `${ticket_ref} was approved and is closed. Plan a new ticket.` };
    }
    if (ticket.reworks >= REWORK_LIMIT) {
      return {
        error: "rework_limit",
        hint: `${ticket_ref} had ${REWORK_LIMIT} verdicts of rework. Drop it in a new plan and plan another ticket, or escalate.`,
      };
    }
    // Open for the worker: it owns the ticket, not approved and not dropped
    const open = [...all.values()].find((t) => t.ticket_ref !== ticket_ref && t.owner === to && !t.approved && !t.dropped);
    if (open) {
      return {
        error: "worker_busy",
        hint: `${to} has ${open.ticket_ref} open. Send the task to a free worker, or wait for the verdict of ${open.ticket_ref}.`,
      };
    }
    return { ticket_ref, data: { loadout, ...(criteria !== undefined && { criteria }) } };
  }

  // result worker → judge: from the owner of the ticket, about its latest task
  function delivery(peer: Caller, body: Record<string, unknown>): Ruling {
    const { ticket_ref, task_seq, branch, commit } = body;
    if (!isText(ticket_ref) || !isText(branch) || !isText(commit) || !Number.isInteger(task_seq)) {
      return {
        error: "missing_field",
        hint: "A result to the judge takes ticket_ref, branch and commit as non-empty strings and task_seq as the integer seq of the task it answers.",
      };
    }

    const events = log.featureEvents();
    const ticket = tickets(events).get(ticket_ref);
    if (!ticket || ticket.owner !== peer.name) {
      return {
        error: "not_owner",
        hint: `${ticket_ref} is not yours: its latest task did not come to you. Call state to see the ticket you have.`,
      };
    }
    if (ticket.dropped) {
      return { error: "ticket_dropped", hint: `${ticket_ref} was dropped. Stop working on it and wait for the next task.` };
    }
    // The task cited has to be the latest, and not judged yet
    const judged = events.some((e) => e.kind === "verdict" && e.ticket_ref === ticket_ref && e.seq > (task_seq as number));
    if (task_seq !== ticket.taskSeq || judged) {
      return {
        error: "stale_reference",
        hint: judged
          ? `The task ${task_seq} of ${ticket_ref} already has a verdict. Wait for the next task of the ticket.`
          : `The latest task of ${ticket_ref} is ${ticket.taskSeq}. Deliver what it asks and cite it in task_seq.`,
      };
    }
    return { ticket_ref, data: { task_seq, branch, commit } };
  }

  // verdict judge → leader: about the latest result of the ticket, with nothing after it
  function judgement(body: Record<string, unknown>): Ruling {
    const { ticket_ref, result_seq, outcome, criteria } = body;
    if (
      !isText(ticket_ref) ||
      !Number.isInteger(result_seq) ||
      typeof outcome !== "string" ||
      !Array.isArray(criteria) ||
      criteria.length === 0 ||
      !criteria.every(isCriterion)
    ) {
      return {
        error: "missing_field",
        hint: "A verdict takes ticket_ref as a non-empty string, result_seq as the integer seq of the result it judges, outcome as a string and criteria as a non-empty list of { n: integer, text: string, pass: boolean, note?: string }.",
      };
    }
    if (outcome !== "approve" && outcome !== "rework") {
      return { error: "invalid_field", hint: "outcome must be approve or rework." };
    }

    const events = log.featureEvents();
    const ticket = tickets(events).get(ticket_ref);
    if (ticket?.dropped) {
      return { error: "ticket_dropped", hint: `${ticket_ref} was dropped and takes no verdict. There is nothing to judge.` };
    }
    // The result cited has to be the latest, with no verdict and no task after it
    const seq = result_seq as number;
    const judged = events.some((e) => e.kind === "verdict" && e.ticket_ref === ticket_ref && e.seq > seq);
    const superseded = ticket != null && ticket.taskSeq !== null && ticket.taskSeq > seq;
    if (!ticket || seq !== ticket.resultSeq || judged || superseded) {
      return {
        error: "stale_reference",
        hint: judged
          ? `The result ${seq} of ${ticket_ref} already has a verdict. Wait for the next result of the ticket.`
          : superseded
            ? `A task came for ${ticket_ref} after the result ${seq}. Wait for the result of that task.`
            : `${seq} is not the latest result of ${ticket_ref}. Call history with the ticket_ref and judge its latest result.`,
      };
    }
    // Only the keys of the contract are stored
    const stored = (criteria as Criterion[]).map((c) => ({
      n: c.n,
      text: c.text,
      pass: c.pass,
      ...(c.note !== undefined && { note: c.note }),
    }));
    return { ticket_ref, data: { result_seq, outcome, criteria: stored } };
  }

  function rule(kind: SentKind, peer: Caller, to: string, body: Record<string, unknown>): Ruling {
    if (kind === "task" && peer.role === "mother") return untracked(body);
    if (kind === "result" && peer.role === "leader") return untracked(body);
    if (kind === "task") return assignment(to, body);
    if (kind === "result") return delivery(peer, body);
    return judgement(body);
  }

  // `peer` is who the id of the request belongs to and `body` the JSON object received.
  // Whatever the body says about from, role_from, seq, ts or feature_id is not read.
  function send(peer: Caller, body: Record<string, unknown>): Answer {
    const { kind, to, summary } = body;
    const attempted = typeof kind === "string" && kind.length <= ATTEMPTED_KIND_MAX ? kind : "";
    const no = (error: string, hint: string) => log.refused(peer.name, attempted, error, hint);

    if (
      typeof kind !== "string" ||
      typeof to !== "string" ||
      typeof summary !== "string" ||
      summary === "" ||
      (body.body !== undefined && typeof body.body !== "string")
    ) {
      return no("missing_field", "Send kind and to as strings, summary as a non-empty string and body, if any, as a string.");
    }
    if (!SENT.includes(kind)) {
      const route = ROUTE_OF[kind];
      return no(
        "invalid_kind",
        route ? `A ${kind} is not sent here: call ${route}.` : "kind must be task, result or verdict."
      );
    }
    if (summary.length > SUMMARY_MAX) {
      return no("invalid_field", `summary takes up to ${SUMMARY_MAX} characters. Shorten it and put the rest in body.`);
    }

    const recipient = to === "human" ? null : ROSTER.find((r) => r.name === to);
    if (recipient === undefined) {
      return no("unknown_recipient", `to must be ${ROSTER.map((r) => r.name).join(", ")} or human.`);
    }
    if (!recipient || !EDGES.some((e) => e.kind === kind && e.from === peer.role && e.to === recipient.role)) {
      const mine = EDGES.filter((e) => e.from === peer.role).map((e) => `${e.kind} to the ${e.to}`);
      return no(
        "edge_not_allowed",
        mine.length > 0
          ? `A ${peer.role} sends only ${mine.join(" and ")}.`
          : `A ${peer.role} sends nothing through /send.`
      );
    }
    if (!log.openFeature()) {
      return no("no_open_feature", "No feature is open. Wait for the mother to open one before sending.");
    }

    const ruling = rule(kind as SentKind, peer, to, body);
    if ("error" in ruling) return no(ruling.error, ruling.hint);

    return log.transaction(() => {
      const seq = log.record({
        kind: kind as SentKind,
        from: peer.name,
        role_from: peer.role,
        to,
        summary,
        body: body.body as string | undefined,
        ticket_ref: ruling.ticket_ref,
        data: ruling.data,
      });
      // A worker that delivers is no longer blocked, whatever its blocked was about
      if (kind === "result" && peer.role === "worker" && log.blocked(peer.name)) {
        log.record({ kind: "unblocked", from: "broker", role_from: "broker", data: { peer: peer.name } });
      }
      // After the unblocked: what else the delivery of a ticket settles
      if (kind === "result" && peer.role === "worker") afterResult?.(peer.name, ruling.ticket_ref!);
      return { ok: true, seq };
    });
  }

  return { send };
}
