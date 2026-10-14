/**
 * squad broker /gate and /gate-decision
 *
 * The mother asks the dev to approve an irreversible action before she runs it, and
 * the dev approves, rejects or comments with the human credential (ADR-008). A gate
 * has one final decision; a comment leaves it pending until the mother asks again
 * with the same id. The table `gates` is the state the rules decide over: its row,
 * the event and the deliveries are written together or not at all.
 */

import type { Database } from "bun:sqlite";
import type { GateRow } from "./db.ts";
import type { Log } from "./log.ts";
import { refuse, type Refusal } from "./peers.ts";
import { isText, SUMMARY_MAX, type Answer, type Caller } from "./send.ts";
import { gid } from "./shared/contract.ts";
import { tickets } from "./shared/derive.ts";

const SCOPES: readonly string[] = ["delivery", "action"];

const DECISIONS: readonly string[] = ["approve", "reject", "comment"];

// What the broker writes in the summary of each decision
const SAID: Record<string, string> = { approve: "aprovado", reject: "rejeitado", comment: "comentado" };

export function createGate(db: Database, log: Log, token: string) {
  function find(id: number): GateRow | null {
    return db.query("SELECT * FROM gates WHERE id = ?").get(id) as GateRow | null;
  }

  // `peer` is who the id of the request belongs to and `body` the JSON object received.
  // Without gate_id it asks a new gate; with it, it asks the pending one again.
  function request(peer: Caller, body: Record<string, unknown>): { ok: true; gate_id: number; seq: number } | Refusal {
    const no = (error: string, hint: string) => log.refused(peer.name, "gate", error, hint);

    if (peer.role !== "mother") {
      return no("edge_not_allowed", "Only the mother asks the dev for a gate. Ask the mother for what needs approval.");
    }
    const { scope, summary, action, effect, commit, diffstat, ticket_ref, gate_id } = body;
    // null counts as sent: an optional field is absent or a value of its type
    const optional = (value: unknown) => value === undefined || isText(value);
    if (
      !isText(scope) ||
      !isText(summary) ||
      !isText(action) ||
      !isText(effect) ||
      (body.body !== undefined && typeof body.body !== "string") ||
      !optional(commit) ||
      !optional(diffstat) ||
      !optional(ticket_ref) ||
      (gate_id !== undefined && !Number.isInteger(gate_id)) ||
      (scope === "delivery" && commit === undefined)
    ) {
      return no(
        "missing_field",
        "Send scope, summary, action and effect as non-empty strings; body, if any, as a string; commit, diffstat and ticket_ref, if any, as non-empty strings; gate_id, if any, as an integer. A delivery gate takes the commit of the branch of the feature."
      );
    }
    if (!SCOPES.includes(scope) || summary.length > SUMMARY_MAX) {
      return no("invalid_field", `scope must be delivery or action, and summary takes up to ${SUMMARY_MAX} characters.`);
    }
    const feature = log.openFeature();
    if (!feature) {
      return no("no_open_feature", "No feature is open. A gate belongs to the open feature.");
    }
    const asked = gate_id === undefined ? null : find(gate_id as number);
    if (gate_id !== undefined && asked?.feature_id !== feature.id) {
      return no("invalid_field", "gate_id is the id of a gate of the open feature: the one you asked and the dev commented.");
    }
    if (asked && asked.status !== "pending") {
      return no("gate_closed", `${gid(asked.id)} is ${asked.status} and takes no new version. Ask a new gate, without gate_id.`);
    }
    if (scope === "delivery") {
      const open = [...tickets(log.featureEvents()).values()].filter((t) => t.planned && !t.dropped && !t.approved);
      if (open.length > 0) {
        return no(
          "tickets_open",
          `The delivery waits for every ticket of the plan to be approved or dropped. Still open: ${open.map((t) => t.ticket_ref).join(", ")}.`
        );
      }
    }

    return log.transaction(() => {
      const id =
        asked?.id ?? (db.query("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM gates").get() as { id: number }).id;
      // A gate to the dev waits for no one: the TUI reads it from the log
      const seq = log.record({
        kind: "gate",
        from: peer.name,
        role_from: peer.role,
        to: "human",
        summary,
        body: body.body as string | undefined,
        ticket_ref: ticket_ref as string | undefined,
        gate_id: id,
        recipients: [],
        // Only the fields of the contract, and the optional ones only when sent
        data: {
          gate_id: id,
          scope,
          action,
          effect,
          ...(commit !== undefined && { commit }),
          ...(diffstat !== undefined && { diffstat }),
        },
      });
      if (asked) {
        db.run('UPDATE gates SET scope = ?, "commit" = ?, request_seq = ? WHERE id = ?', [scope, commit ?? null, seq, id]);
      } else {
        db.run(
          `INSERT INTO gates (id, feature_id, requested_by, scope, "commit", status, request_seq)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [id, feature.id, peer.name, scope, (commit as string | undefined) ?? null, seq]
        );
      }
      return { ok: true, gate_id: id, seq };
    });
  }

  // The human is not a peer: the credential comes first, and no refusal here leaves a trace
  // in the log
  function decide(body: Record<string, unknown>): Answer {
    if (body.human_token !== token) {
      return refuse("invalid_token", "human_token is not the human credential. Only the dev decides a gate.");
    }
    const { gate_id, decision, text } = body;
    if (
      !Number.isInteger(gate_id) ||
      typeof decision !== "string" ||
      (text !== undefined && typeof text !== "string") ||
      ((decision === "reject" || decision === "comment") && (typeof text !== "string" || text.trim() === ""))
    ) {
      return refuse(
        "missing_field",
        "Send gate_id as the integer id of the gate, decision as a string and text, if any, as a string. reject and comment take a text with the reason in it."
      );
    }
    if (!DECISIONS.includes(decision) || !find(gate_id as number)) {
      return refuse("invalid_field", "decision must be approve, reject or comment, and gate_id the id of a gate.");
    }

    // The row is read and the decision written in one transaction, so a gate has one final
    // decision, the first to come (GAT-24). A pending gate of a feature that is not open has
    // no one to decide it.
    const seq = log.transaction(() => {
      const row = find(gate_id as number)!;
      if (row.status !== "pending" || row.feature_id !== log.openFeature()?.id) return null;
      const said = decision === "approve" ? "" : `: ${text}`;
      const seq = log.record({
        kind: "gate_decision",
        from: "human",
        role_from: "human",
        to: row.requested_by,
        summary: `${gid(row.id)} ${SAID[decision]}${said}`.slice(0, SUMMARY_MAX),
        body: (text as string | undefined) ?? "",
        gate_id: row.id,
        recipients: [row.requested_by],
        data: { gate_id: row.id, decision, ...(text !== undefined && { text }) },
      });
      // A comment decides nothing: the gate waits for the mother to ask again
      if (decision !== "comment") {
        db.run("UPDATE gates SET status = ?, decision_seq = ? WHERE id = ?", [
          decision === "approve" ? "approved" : "rejected",
          seq,
          row.id,
        ]);
      }
      return seq;
    });
    if (seq === null) {
      return refuse("gate_closed", `${gid(gate_id as number)} is already decided, or its feature closed. Nothing was recorded.`);
    }
    return { ok: true, seq };
  }

  return { request, decide };
}
