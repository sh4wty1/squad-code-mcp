/**
 * squad broker session records
 *
 * What a session tells about itself, and the status of an agent is derived
 * from: that it is blocked, that it is not anymore, that a turn started and how
 * many tokens it used (ADR-006). None of them needs an open feature.
 */

import type { Log } from "./log.ts";
import { isText, SUMMARY_MAX, type Answer, type Caller } from "./send.ts";

const COUNTS = ["input", "output", "cache_write", "cache_read"] as const;

export function createSession(log: Log) {
  // In the four, `peer` is who the id of the request belongs to and `body` the JSON object received

  function blocked(peer: Caller, body: Record<string, unknown>): Answer {
    const no = (error: string, hint: string) => log.refused(peer.name, "blocked", error, hint);
    const { ticket_ref, reason, detail, last_action } = body;
    if (
      !isText(reason) ||
      typeof detail !== "string" ||
      typeof last_action !== "string" ||
      (ticket_ref != null && !isText(ticket_ref))
    ) {
      return no(
        "missing_field",
        "Send reason as a non-empty string, detail and last_action as strings and ticket_ref, if any, as a non-empty string."
      );
    }
    // reason is short, like a summary
    if (reason.length > SUMMARY_MAX) {
      return no("invalid_field", `reason takes up to ${SUMMARY_MAX} characters. Shorten it and put the rest in detail.`);
    }
    const seq = log.record({
      kind: "blocked",
      from: peer.name,
      role_from: peer.role,
      ticket_ref: (ticket_ref as string | null | undefined) ?? null,
      data: { reason, detail, last_action },
    });
    return { ok: true, seq };
  }

  // Accepted from a peer that is not blocked too: it changes nothing in the derivation
  function unblocked(peer: Caller): Answer {
    const seq = log.record({ kind: "unblocked", from: peer.name, role_from: peer.role, data: { peer: peer.name } });
    return { ok: true, seq };
  }

  // Each call is one record, even when it repeats the one before
  function usage(peer: Caller, body: Record<string, unknown>): Answer {
    const { session_id, model } = body;
    if (!isText(session_id) || !isText(model) || COUNTS.some((c) => !Number.isInteger(body[c]) || (body[c] as number) < 0)) {
      return log.refused(
        peer.name,
        "usage",
        "missing_field",
        "Send session_id and model as non-empty strings and input, output, cache_write and cache_read as integers of zero or more."
      );
    }
    const seq = log.record({
      kind: "usage",
      from: peer.name,
      role_from: peer.role,
      data: {
        session_id,
        model,
        input: body.input,
        output: body.output,
        cache_write: body.cache_write,
        cache_read: body.cache_read,
      },
    });
    return { ok: true, seq };
  }

  function turnStarted(peer: Caller): Answer {
    const seq = log.record({ kind: "turn_started", from: peer.name, role_from: peer.role, data: {} });
    return { ok: true, seq };
  }

  return { blocked, unblocked, usage, turnStarted };
}
