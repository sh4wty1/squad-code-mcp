/**
 * squad broker /ask, /escalate and /answer
 *
 * An agent asks the level above what the spec does not settle, and the question
 * keeps its id until it closes (ADR-005): who holds it answers who asked, or
 * passes it one level up. The table `questions` is the state the rules decide
 * over: its row, the event and the delivery are written together or not at all.
 */

import type { Database } from "bun:sqlite";
import type { QuestionRow } from "./db.ts";
import type { Log } from "./log.ts";
import { ROSTER, type Refusal, type Role } from "./peers.ts";
import { isText, SUMMARY_MAX, type Answer, type Caller } from "./send.ts";
import { qid, type SquadEvent } from "./shared/contract.ts";

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

// The level above, where a holder escalates to. The judge holds no question: none goes to it.
const NEXT: Record<Role, string> = { worker: "leader", leader: "mother", mother: "human", judge: "leader" };

function isTexts(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Who closes a question, and with what
interface Resolution {
  from: string;
  role_from: string;
  answer: string;
  resolved_by: "human" | "agent" | "timeout_default" | "result_default";
}

export function createQuestion(db: Database, log: Log, token: string, now: () => number = Date.now) {
  function find(id: number): QuestionRow | null {
    return db.query("SELECT * FROM questions WHERE id = ?").get(id) as QuestionRow | null;
  }

  // When the default applies: only to a non-blocking question that reached the dev, counted
  // from the ts of the `question` that took it there
  function deadline(seq: number, to: string, blocking: boolean, timeout_s: number | null): number | null {
    if (to !== "human" || blocking) return null;
    return log.after(seq - 1)[0]!.ts + (timeout_s ?? TIMEOUT_S) * 1000;
  }

  // The only place a question closes by an `answer`. The status is read and the answer
  // written in one transaction, so a question has one answer, the first to come (QST-38).
  // Returns the seq of the answer, or null when the question is not open.
  function resolve(id: number, by: Resolution): number | null {
    return log.transaction(() => {
      const row = find(id)!;
      if (row.status !== "open") return null;
      const seq = log.record({
        kind: "answer",
        from: by.from,
        role_from: by.role_from,
        to: row.asked_by,
        summary: `${qid(id)}: ${by.answer}`.slice(0, SUMMARY_MAX),
        body: by.answer,
        ticket_ref: row.ticket_ref,
        question_id: id,
        // Who asked waits for it, unless it is who answers
        recipients: [row.asked_by].filter((name) => name !== by.from),
        data: { question_id: id, answer: by.answer, resolved_by: by.resolved_by },
      });
      const status = by.resolved_by === "human" || by.resolved_by === "agent" ? "answered" : "defaulted";
      db.run("UPDATE questions SET status = ?, answer_seq = ? WHERE id = ?", [status, seq, id]);
      return seq;
    });
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

  // The holder passes the question to the level above. The route takes no `to`.
  function escalate(peer: Caller, body: Record<string, unknown>): Answer {
    const no = (error: string, hint: string) => log.refused(peer.name, "question", error, hint);

    const { question_id, summary } = body;
    if (
      !Number.isInteger(question_id) ||
      (summary !== undefined && !isText(summary)) ||
      (body.body !== undefined && typeof body.body !== "string")
    ) {
      return no(
        "missing_field",
        "Send question_id as the integer id of the question, summary, if any, as a non-empty string and body, if any, as a string."
      );
    }
    const row = find(question_id as number);
    if ((summary !== undefined && summary.length > SUMMARY_MAX) || !row) {
      return no(
        "invalid_field",
        `summary takes up to ${SUMMARY_MAX} characters, and question_id is the id of a question: the one of the question you received.`
      );
    }
    if (row.status !== "open") {
      return no("question_closed", `${qid(row.id)} is closed. Go on without escalating it.`);
    }
    if (row.holder !== peer.name) {
      return no("not_holder", `${qid(row.id)} is with ${row.holder}. Only who holds a question escalates it.`);
    }

    // What the question is comes from who asked it; the text, when not sent, from who held it last
    const asked = log
      .history({ question_id: row.id })
      .filter((e): e is Extract<SquadEvent, { kind: "question" }> => e.kind === "question");
    const first = asked[0]!;
    const latest = asked.at(-1)!;
    const to = NEXT[peer.role];

    return log.transaction(() => {
      const seq = log.record({
        kind: "question",
        from: peer.name,
        role_from: peer.role,
        to,
        summary: summary ?? latest.summary,
        body: (body.body as string | undefined) ?? latest.body,
        ticket_ref: row.ticket_ref,
        question_id: row.id,
        recipients: to === "human" ? [] : [to],
        data: {
          question_id: row.id,
          asked_by: first.asked_by,
          blocking: first.blocking,
          why: first.why,
          ...(first.options !== undefined && { options: first.options }),
          ...(first.default !== undefined && { default: first.default }),
          ...(first.timeout_s !== undefined && { timeout_s: first.timeout_s }),
        },
      });
      db.run("UPDATE questions SET holder = ?, deadline_ts = ? WHERE id = ?", [
        to,
        deadline(seq, to, row.blocking === 1, row.timeout_s),
        row.id,
      ]);
      return { ok: true, seq };
    });
  }

  // The holder answers who asked. The answer is stored as it came.
  function answer(peer: Caller, body: Record<string, unknown>): Answer {
    const no = (error: string, hint: string) => log.refused(peer.name, "answer", error, hint);

    const { question_id, answer: text } = body;
    if (!Number.isInteger(question_id) || typeof text !== "string" || text.trim() === "") {
      return no(
        "missing_field",
        "Send question_id as the integer id of the question and answer as a string with the answer in it."
      );
    }
    const row = find(question_id as number);
    if (!row) {
      return no("invalid_field", "question_id is the id of a question: the one of the question you received.");
    }
    if (row.status === "open" && row.holder !== peer.name) {
      return no("not_holder", `${qid(row.id)} is with ${row.holder}. Only who holds a question answers it.`);
    }
    // Whether it is closed is for `resolve` to say, in the transaction of the answer
    const seq = resolve(row.id, { from: peer.name, role_from: peer.role, answer: text, resolved_by: "agent" });
    if (seq === null) {
      return no("question_closed", `${qid(row.id)} is closed and takes no answer. Go on without it.`);
    }
    return { ok: true, seq };
  }

  return { ask, escalate, answer };
}
