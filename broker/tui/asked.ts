// What the tab of questions, the modal of answer and the keys have to know of the
// questions of the open feature, from the derived squad.

import { qid } from "../shared/contract.ts";
import type { Question, Squad } from "../shared/derive.ts";
import type { Seg } from "./grid.ts";

// The questions that wait for the dev: the blocking ones first, from the one that reached
// him first, then the others from the one whose default applies first
export function waiting(squad: Squad): Question[] {
  const open = squad.questions.filter((q) => q.open && q.holder === "human");
  return [
    ...open.filter((q) => q.blocking).sort((a, b) => a.reached_human_ts! - b.reached_human_ts!),
    ...open.filter((q) => !q.blocking).sort((a, b) => a.deadline! - b.deadline!),
  ];
}

// The history: every question that is not open, from the one that closed last
export function resolved(squad: Squad): Question[] {
  return squad.questions.filter((q) => q.status !== "open").sort((a, b) => (b.closed_ts ?? 0) - (a.closed_ts ?? 0));
}

// What an answer of the dev does: no event says it, the TUI writes it from who asked and the ticket
export function effect(q: Question, squad: Squad): string {
  if (!q.blocking) return `${q.asked_by} troca o default pela sua resposta; nada é refeito.`;
  const reworks = squad.tickets.find((t) => t.ticket_ref === q.ticket_ref)?.reworks ?? 0;
  const ticket = q.ticket_ref ? `o ${q.ticket_ref}${reworks ? ` (rework ${Math.min(reworks, 2)}/2)` : ""}` : "o trabalho";
  return `${q.asked_by} retoma ${ticket} assim que você confirmar.`;
}

// How a resolved question ended, as the second line of the history says it
export function outcome(q: Question): Seg[] {
  // A merged one without an answer of its own stays so after the one it follows closes
  if (q.merged_into !== null && q.answered_by === null) {
    return [["▶ mesclada em ", "white"], [qid(q.merged_into), "bwhite", true], [" pela mother · recebe a mesma resposta", "gray"]];
  }
  const answer: Seg = [q.answer ?? "", "bwhite", true];
  if (q.resolved_by === "human") return [["✓ respondida pelo dev: ", "bgreen"], answer];
  if (q.resolved_by === "agent") return [[`✓ respondida por ${q.answered_by}: `, "bgreen"], answer, ["  · rota curta, não chegou ao dev", "gray"]];
  if (q.resolved_by === "timeout_default") return [["⟳ default aplicado · timeout: ", "byellow"], answer];
  return [[`⟳ default aplicado · ${q.asked_by} entregou o ticket antes da resposta: `, "byellow"], answer];
}

// The seconds until the default of the question applies; 0 once the deadline passed
export function left(q: Question, now: number): number {
  return Math.max(0, Math.floor(((q.deadline ?? now) - now) / 1000));
}
