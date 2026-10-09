// The lines of the feed, from the log: one per message, and the system lines of the
// records that have one. Text only; the screen gives the columns and the colors.

import { KINDS, type SquadEvent } from "../shared/contract.ts";
import { REWORK_LIMIT, squad, SQUAD, tickets, type Owed, type Squad } from "../shared/derive.ts";

export type SysKind = "opened" | "closed" | "plan" | "joined" | "left" | "blocked" | "stalled" | "limit" | "refused" | "default" | "merged";

export interface FeedRow {
  // of the event. The line of the rework limit is no event: it takes the half after its verdict.
  seq: number;
  ts: number;
  event: SquadEvent;
  // absent in the line of a message
  sys?: SysKind;
  // the first line of the summary of a message, or the whole system line
  text: string;
  // refusals joined in the line, and the ts of the last one
  count?: number;
  lastTs?: number;
  // in the line of a feature_closed: the squad right before it closed
  squad?: Squad;
}

// `w2` for worker-2, `hum` for the dev; the first three characters of any other name
export function label(name: string): string {
  if (name === "human") return "hum";
  return SQUAD.find((a) => a.name === name)?.short ?? [...name].slice(0, 3).join("");
}

export const qid = (id: number): string => "Q-" + String(id).padStart(2, "0");
export const gid = (id: number): string => "G-" + String(id).padStart(2, "0");

// `result TKT-13`, `plan`, `answer Q-07`
export function debt(owes: Owed): string {
  return owes.owes + (owes.ticket_ref ? " " + owes.ticket_ref : owes.question_id !== undefined ? " " + qid(owes.question_id) : "");
}

const MESSAGES = ["task", "result", "verdict", "question", "answer", "gate", "gate_decision", "permission_request", "permission_decision"];

export function feed(log: SquadEvent[]): FeedRow[] {
  const events = log.filter((e) => KINDS.includes(e.kind)).sort((a, b) => a.seq - b.seq);
  const rows: FeedRow[] = [];
  const gone = new Set<string>();
  const asked = new Map<number, string>();
  // The events of the feature that is open at the event being read
  let own: SquadEvent[] = [];

  events.forEach((e, i) => {
    const row = (sys: SysKind, text: string): FeedRow => ({ seq: e.seq, ts: e.ts, event: e, sys, text });
    if (e.kind === "feature_opened") own = [];
    own.push(e);

    if (e.kind === "answer" && (e.resolved_by === "timeout_default" || e.resolved_by === "result_default")) {
      rows.push(
        row(
          "default",
          e.resolved_by === "timeout_default"
            ? `⟳ ${qid(e.question_id)} timeout · default aplicado: ${e.answer}`
            : `⟳ ${qid(e.question_id)} fechada · ${label(asked.get(e.question_id) ?? "")} entregou antes da resposta`
        )
      );
    } else if (MESSAGES.includes(e.kind)) {
      if (e.kind === "question" && !asked.has(e.question_id)) asked.set(e.question_id, e.asked_by);
      rows.push({ seq: e.seq, ts: e.ts, event: e, text: e.summary.split("\n")[0]! });
      // The third rework is one more than the ticket takes
      if (e.kind === "verdict" && e.outcome === "rework" && tickets(own).get(e.ticket_ref ?? "")?.reworks === REWORK_LIMIT) {
        rows.push({ ...row("limit", `⚠ ${e.ticket_ref} no limite ⟳ 2/2 · sem 3º rework`), seq: e.seq + 0.5 });
      }
    } else if (e.kind === "blocked") {
      rows.push(row("blocked", `⚠ ${label(e.from)} [blocked] ${e.reason}`));
    } else if (e.kind === "refused") {
      const text = `✗ ${label(e.peer)} recusado · ${e.attempted_kind} · ${e.error}`;
      const last = rows.at(-1);
      const before = last?.event;
      if (last && before?.kind === "refused" && before.peer === e.peer && before.attempted_kind === e.attempted_kind && before.error === e.error) {
        last.count = (last.count ?? 1) + 1;
        last.lastTs = e.ts;
        last.text = `${text} ×${last.count}`;
      } else rows.push(row("refused", text));
    } else if (e.kind === "feature_opened") {
      rows.push(row("opened", `▶ feature aberta · ${e.title}`));
    } else if (e.kind === "feature_closed") {
      const text = e.outcome === "delivered" ? "✓ feature encerrada · entregue" : "✗ feature encerrada · abandonada";
      rows.push({ ...row("closed", text), squad: squad(events.slice(0, i), e.ts) });
      own = [];
    } else if (e.kind === "plan") {
      const version = own.filter((x) => x.kind === "plan").length;
      rows.push(row("plan", `▶ plano v${version} de ${label(e.from)} · ${e.tickets.filter((t) => !t.dropped).length} tickets`));
    } else if (e.kind === "peer_joined") {
      const ticket = [...tickets(own).values()].findLast((t) => t.owner === e.peer && !t.approved && !t.dropped);
      rows.push(
        row("joined", gone.has(e.peer) ? `● ${label(e.peer)} voltou${ticket ? " · retoma " + ticket.ticket_ref : ""}` : `● ${label(e.peer)} entrou`)
      );
    } else if (e.kind === "peer_left") {
      gone.add(e.peer);
      rows.push(row("left", `○ ${label(e.peer)} saiu · sessão ${e.reason === "died" ? "morta" : "encerrada"}`));
    } else if (e.kind === "question_merged") {
      rows.push(row("merged", `⟳ ${qid(e.question_id)} mesclada em ${qid(e.into)} pela mother`));
    } else if (e.kind === "usage") {
      // ponytail: O(usage × n), the derivation runs again for each end of turn; keep the
      // lines already computed by seq when the log passes a few thousand events
      const agent = squad(events.slice(0, i + 1), e.ts).agents.find((a) => a.name === e.from);
      if (agent?.status === "stalled" && agent.owes) rows.push(row("stalled", `‖ ${agent.short} [stalled] deve ${debt(agent.owes)}`));
    }
  });
  return rows;
}
