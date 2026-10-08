/**
 * squad broker permission relay
 *
 * A permission prompt of any session becomes an event addressed to the human,
 * and the decision the dev takes in the TUI goes back to that session as a
 * delivery (ADR-011). The decision is authorized by the human credential: a
 * token in a file outside any worktree, which no answer and no event carries.
 */

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Log } from "./log.ts";
import { refuse } from "./peers.ts";
import { isText, SUMMARY_MAX, type Answer, type Caller } from "./send.ts";

// The human credential of the file, created with a random token when the file is not
// there or is empty
export function loadHumanToken(path: string): string {
  if (existsSync(path)) {
    const token = readFileSync(path, "utf8").trim();
    if (token !== "") return token;
  }
  const token = randomBytes(32).toString("hex");
  // Only the user reads it, where the system has such a thing
  writeFileSync(path, token, { mode: 0o600 });
  return token;
}

export function createPermission(log: Log, token: string) {
  // `peer` is who the id of the request belongs to and `body` the JSON object received
  function request(peer: Caller, body: Record<string, unknown>): Answer {
    const { request_id, tool_name, description, input_preview } = body;
    if (!isText(request_id) || !isText(tool_name) || typeof description !== "string" || typeof input_preview !== "string") {
      return log.refused(
        peer.name,
        "permission_request",
        "missing_field",
        "Send request_id and tool_name as non-empty strings and description and input_preview as strings."
      );
    }
    const seq = log.record({
      kind: "permission_request",
      from: peer.name,
      role_from: peer.role,
      to: "human",
      summary: `${tool_name}: ${description}`.slice(0, SUMMARY_MAX),
      body: input_preview,
      data: { request_id, tool_name, description, input_preview },
    });
    return { ok: true, seq };
  }

  // The human is not a peer: there is no id, and no refusal here leaves a trace in the log
  function decision(body: Record<string, unknown>): Answer {
    if (body.human_token !== token) {
      return refuse("invalid_token", "human_token is not the human credential. Only the dev decides a permission.");
    }
    const { request_seq, behavior } = body;
    if (!Number.isInteger(request_seq) || typeof behavior !== "string") {
      return refuse("missing_field", "Send request_seq as the integer seq of the permission_request and behavior as a string.");
    }
    // The request may be of any feature or of none
    const [asked, ...later] = log.after((request_seq as number) - 1);
    if (
      (behavior !== "allow" && behavior !== "deny") ||
      asked === undefined ||
      asked.seq !== request_seq ||
      asked.kind !== "permission_request"
    ) {
      return refuse("invalid_field", "behavior must be allow or deny, and request_seq the seq of a permission_request.");
    }

    // Closed once decided, or once its peer went on or left: the session that knew the
    // request_id is past the prompt. A refused about the peer is the broker's, not its.
    const peer = asked.from;
    const closed = later.some(
      (e) =>
        (e.kind === "permission_decision" && e.request_seq === request_seq) ||
        e.from === peer ||
        (e.kind === "peer_left" && e.peer === peer)
    );
    if (closed) {
      return refuse("permission_closed", `The request ${request_seq} is closed: it was decided, or ${peer} went on without it.`);
    }

    const seq = log.record({
      kind: "permission_decision",
      from: "human",
      role_from: "human",
      to: peer,
      summary: `${behavior}: ${asked.tool_name}`.slice(0, SUMMARY_MAX),
      data: { request_seq, behavior },
    });
    return { ok: true, seq };
  }

  return { request, decision };
}
