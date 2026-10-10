/**
 * squad broker /ask
 *
 * An agent asks the level above what the spec does not settle, and the question
 * keeps its id until it closes (ADR-005). The table `questions` is the state the
 * rules decide over: its row, the event and the delivery are written together or
 * not at all.
 */

import type { Database } from "bun:sqlite";
import type { Log } from "./log.ts";
import { ROSTER, type Refusal, type Role } from "./peers.ts";
import { isText, SUMMARY_MAX, type Caller } from "./send.ts";

const OPTIONS_MAX = 3;

// A non-blocking question without timeout_s waits this long for the dev
const TIMEOUT_S = 240;

// Who asks whom, by role: each one the level above, and the judge a worker or the leader
const ASK_EDGES: { from: Role; to: Role | "human" }[] = [
  { from: "worker", to: "leader" },
  { from: "judge", to: "worker" },
  { from: "judge", to: "leader" },
  { from: "leader", to: "mother" },
  { from: "mother", to: "human" },
];

function isTexts(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function createQuestion(db: Database, log: Log, token: string, now: () => number = Date.now) {
  // When the default applies: only to a non-blocking question that reached the dev, counted
  // from the ts of the `question` that took it there
  function deadline(seq: number, to: string, blocking: boolean, timeout_s: number | null): number | null {
    if (to !== "human" || blocking) return null;
    return log.after(seq - 1)[0]!.ts + (timeout_s ?? TIMEOUT_S) * 1000;
  }

  // `peer` is who the id of the request belongs to and `body` the JSON object received
  function ask(
    peer: Caller,
    body: Record<string, unknown>
  ): { ok: true; question_id: number; seq: number } | Refusal {
    const no = (error: string, hint: string) => log.refused(peer.name, "question", error, hint);

    const { to, summary, why, blocking, options, default: fallback, ticket_ref } = body;
    if (
      typeof to !== "string" ||
      !isText(summary) ||
      !isText(why) ||
      typeof blocking !== "boolean" ||
      (body.body !== undefined && typeof body.body !== "string") ||
      (options !== undefined && !isTexts(options)) ||
      (fallback !== undefined && typeof fallback !== "string") ||
      (body.timeout_s !== undefined && !Number.isInteger(body.timeout_s)) ||
      (ticket_ref !== undefined && !isText(ticket_ref)) ||
      (!blocking && !isText(fallback))
    ) {
      return no(
        "missing_field",
        "Send to as a string, summary and why as non-empty strings and blocking as a boolean; body and default, if any, as strings, options as a list of strings, timeout_s as an integer and ticket_ref as a non-empty string. A non-blocking question takes a non-empty default."
      );
    }
    const timeout_s = body.timeout_s as number | undefined;
    if (
      summary.length > SUMMARY_MAX ||
      (options !== undefined && (options.length === 0 || options.includes(""))) ||
      (timeout_s !== undefined && (timeout_s < 1 || blocking))
    ) {
      return no(
        "invalid_field",
        `summary takes up to ${SUMMARY_MAX} characters, options at least one item and no empty one, and timeout_s 1 or more, on a non-blocking question only.`
      );
    }
    if (options !== undefined && options.length > OPTIONS_MAX) {
      return no(
        "too_many_options",
        `A question takes up to ${OPTIONS_MAX} options. Keep the ${OPTIONS_MAX} that matter: the answer may always be another text.`
      );
    }

    const recipient = to === "human" ? "human" : ROSTER.find((r) => r.name === to)?.role;
    if (recipient === undefined) {
      return no("unknown_recipient", `to must be ${ROSTER.map((r) => r.name).join(", ")} or human.`);
    }
    if (!ASK_EDGES.some((e) => e.from === peer.role && e.to === recipient)) {
      const mine = ASK_EDGES.filter((e) => e.from === peer.role).map((e) => (e.to === "human" ? "human" : `the ${e.to}`));
      return no("edge_not_allowed", `A ${peer.role} asks only ${mine.join(" or ")}.`);
    }
    const feature = log.openFeature();
    if (!feature) {
      return no("no_open_feature", "No feature is open. Wait for the mother to open one before asking.");
    }

    return log.transaction(() => {
      const { id } = db.query("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM questions").get() as { id: number };
      // A question to the dev waits for no one: the TUI reads it from the log
      const seq = log.record({
        kind: "question",
        from: peer.name,
        role_from: peer.role,
        to,
        summary,
        body: body.body as string | undefined,
        ticket_ref,
        question_id: id,
        recipients: to === "human" ? [] : [to],
        // Only the fields of the contract, and the optional ones only when sent
        data: {
          question_id: id,
          asked_by: peer.name,
          blocking,
          why,
          ...(options !== undefined && { options }),
          ...(fallback !== undefined && { default: fallback }),
          ...(timeout_s !== undefined && { timeout_s }),
        },
      });
      db.run(
        `INSERT INTO questions (id, feature_id, ticket_ref, asked_by, holder, blocking, default_answer, timeout_s, deadline_ts, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
        [
          id,
          feature.id,
          ticket_ref ?? null,
          peer.name,
          to,
          blocking ? 1 : 0,
          fallback ?? null,
          timeout_s ?? null,
          deadline(seq, to, blocking, timeout_s ?? null),
        ]
      );
      return { ok: true, question_id: id, seq };
    });
  }

  return { ask };
}
