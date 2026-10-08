/**
 * squad broker /send
 *
 * The door of the contract (ADR-004): a peer sends a task, a result or a verdict
 * along an edge of the star. The broker stamps who the sender is, refuses the
 * rest in a fixed order and leaves the trace of every refusal in the log.
 */

import type { Log } from "./log.ts";
import { ROSTER, type Refusal, type Role } from "./peers.ts";
import { EDGES } from "./shared/contract.ts";

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

export function createSend(log: Log) {
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

  function rule(kind: SentKind, peer: Caller, body: Record<string, unknown>): Ruling {
    if (kind === "task" && peer.role === "mother") return untracked(body);
    if (kind === "result" && peer.role === "leader") return untracked(body);
    throw new Error(`no rule for ${kind} from ${peer.role}`);
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

    const ruling = rule(kind as SentKind, peer, body);
    if ("error" in ruling) return no(ruling.error, ruling.hint);

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
    return { ok: true, seq };
  }

  return { send };
}
