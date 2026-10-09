// The three texts the design leaves to the TUI, from the derived squad and the lines of
// the feed: what each agent is doing, the seals of line 1 and the right side of the footer.

import type { Agent, Squad, SquadTicket } from "../shared/derive.ts";
import { debt, gid, qid, type FeedRow } from "./feed.ts";
import { age, clock, type Color } from "./grid.ts";
import type { Ui } from "./view.ts";

export type Colored = [text: string, color: Color];

export interface Activity {
  text: string;
  // the reworks of the ticket in the text, up to 2; null when it has none
  rework: number | null;
  // the seconds until the default of a question of the agent that reached the dev
  left: number | null;
}

// `TKT-12/13` when all share what comes before the last `-`
export function refs(list: string[]): string {
  const prefix = (ref: string) => ref.slice(0, ref.lastIndexOf("-") + 1);
  const shared = prefix(list[0] ?? "");
  if (list.length < 2 || !shared || list.some((ref) => prefix(ref) !== shared)) return list.join(" ");
  return shared + list.map((ref) => ref.slice(shared.length)).join("/");
}

// The first rule of the table of the design that holds
export function activity(agent: Agent, squad: Squad, rows: FeedRow[]): Activity {
  const { name, role } = agent;
  const pending = squad.questions.find((q) => q.open && q.asked_by === name && q.deadline !== null);
  const left = pending ? Math.max(0, Math.floor((pending.deadline! - squad.now) / 1000)) : null;
  const say = (text: string, ticket?: SquadTicket): Activity => ({ text, rework: ticket?.reworks ? Math.min(ticket.reworks, 2) : null, left });

  if (agent.status === "never") return say("nunca entrou");
  if (!squad.feature) {
    if (squad.features.length === 0 || role === "mother") return say("sem feature");
    return say(role === "leader" ? "sem tickets" : role === "worker" ? "sem ticket" : "sem review");
  }

  const live = squad.tickets.filter((t) => !t.dropped);
  const own = live.find((t) => t.ticket_ref === agent.ticket);
  const stopped = (agent.status === "blocked" && agent.permission) || agent.blockingQuestion !== null || agent.status === "stalled";
  if (stopped && own) return say(own.ticket_ref, own);

  const open = squad.questions.filter((q) => q.open);
  const about = (q: { ticket_ref: string | null; id: number }) => q.ticket_ref ?? qid(q.id);
  // The events of the open feature that have a line
  const sent = rows.filter((row) => row.event.feature_id === squad.feature!.id).map((row) => row.event);
  const kickoff = sent.some((e) => e.kind === "task" && e.role_from === "mother");

  if (role === "mother") {
    const gate = squad.gates.find((g) => g.pending);
    if (gate) return say(`${gid(gate.id)} com o dev`);
    const dev = open.filter((q) => q.holder === "human");
    if (dev.length > 0) return say(dev.length === 1 ? `${qid(dev[0]!.id)} → dev` : `${dev.length} perguntas → dev`);
    const held = open.find((q) => q.holder === name);
    if (held) return say(`decide ${about(held)}`);
    return say(kickoff ? "aguarda squad" : "feature aberta");
  }

  if (role === "leader") {
    // Who asked and who passed it on are in the route before the holder
    const escalated = open.find((q) => q.route.slice(0, -1).includes(name));
    if (escalated) return say(`escalou ${about(escalated)}`);
    if (squad.planVersion === 0) return say(kickoff ? "planejando" : "sem tarefa ainda");
    if (live.every((t) => t.taskSeq === null)) return say(`plano v${squad.planVersion} · ${live.length} tickets`);
    const going = live.filter((t) => !t.approved);
    if (agent.status === "done" || going.length === 0) return say(`${live.length - going.length}/${live.length} tickets`);
    return say(refs(going.map((t) => t.ticket_ref)));
  }

  if (role === "worker") {
    // Read before the rules of the ticket, which hold for an offline worker too
    if (agent.status === "offline" && own) return say(`${own.ticket_ref} parado`, own);
    if (own?.last?.kind === "task") return say(own.ticket_ref, own);
    if (own?.last?.kind === "result") return say(`${own.ticket_ref} review`, own);
    if (own?.last?.kind === "verdict") return say(`${own.ticket_ref} aguarda ldr`, own);
    const approved = live.filter((t) => t.owner === name && t.approved).sort((a, b) => a.last!.seq - b.last!.seq).at(-1);
    return approved ? say(`${approved.ticket_ref} ✓`, approved) : say("sem ticket");
  }

  const review = live.filter((t) => t.last?.kind === "result");
  if (review.length > 0) return say(`rev ${refs(review.map((t) => t.ticket_ref))}`);
  if (agent.status === "done") {
    // The criteria of the latest verdict of each ticket
    const marks = live.flatMap((t) => {
      const verdict = sent.find((e) => e.seq === t.last?.seq);
      return verdict?.kind === "verdict" ? verdict.criteria : [];
    });
    return say(`${marks.filter((c) => c.pass).length}/${marks.length} critérios`);
  }
  return say("sem review");
}

// The seals of line 1, from left to right. One seal alone takes the long form.
export function seals(squad: Squad, rows: FeedRow[]): Colored[] {
  const all: { long: string; short: string; color: Color }[] = [];
  const of = (status: Agent["status"]) => squad.agents.filter((a) => a.status === status);

  for (const a of of("blocked")) {
    if (a.blockedReason !== null) all.push({ long: `⚠ ${a.short} bloqueado · ${a.blockedReason}`, short: `⚠ ${a.short} bloqueado`, color: "bred" });
  }
  for (const a of of("offline")) {
    const gone = rows.findLast((row) => row.event.kind === "peer_left" && row.event.peer === a.name)?.event;
    const how = gone?.kind === "peer_left" && gone.reason === "unregistered" ? "encerrada" : "morta";
    all.push({ long: `◌ ${a.short} offline · sessão ${how}`, short: `◌ ${a.short} offline`, color: "red" });
  }
  for (const a of of("stalled")) {
    all.push({ long: `‖ ${a.short} parado · deve ${debt(a.owes!)}`, short: `‖ ${a.short} parado`, color: "byellow" });
  }
  for (const t of squad.tickets.filter((t) => t.status === "escalated")) {
    all.push({ long: `⚠ ${t.ticket_ref} escalado à mother`, short: `⚠ ${t.ticket_ref} escalado`, color: "bred" });
  }
  const asked = squad.permissions;
  if (asked.length > 0) {
    const text = asked.length > 1 ? `⚠ ${asked.length} permissões · x` : `⚠ permissão ${squad.agents.find((a) => a.name === asked[0]!.from)?.short ?? asked[0]!.from} · x`;
    all.push({ long: text, short: text, color: "bcyan" });
  }
  const gates = squad.gates.filter((g) => g.pending);
  if (gates.length > 0) {
    const text = gates.length > 1 ? `⚠ ${gates.length} gates pendentes · g` : `⚠ gate ${gid(gates[0]!.id)} pendente · g`;
    all.push({ long: text, short: text, color: "bmagenta" });
  }
  return all.map((seal) => [all.length === 1 ? seal.long : seal.short, seal.color]);
}

const ALERT: Partial<Record<Agent["status"], [glyph: string, word: string, color: Color]>> = {
  blocked: ["⚠", "bloqueado", "bred"],
  offline: ["◌", "offline", "red"],
  stalled: ["‖", "parado", "byellow"],
};

// The right side of the footer: the first of the list of the design that exists
export function right(squad: Squad, rows: FeedRow[], ui: Pick<Ui, "toast" | "selected">): Colored[] {
  if (ui.toast && squad.now < ui.toast.until) return [[ui.toast.text, ui.toast.color]];

  const closed = rows.findLast((row) => row.sys === "closed");
  const idle = closed ? `○ ocioso desde ${clock(closed.ts).slice(0, 5)}` : "○ nenhuma feature ainda";
  const alerts = squad.agents.filter((a) => ALERT[a.status]);
  if (alerts.length > 0) {
    const tail: Colored[] = squad.feature ? [] : [[" · ", "gray"], [idle, "gray"]];
    const first = alerts[0]!;
    const [glyph, word, color] = ALERT[first.status]!;
    if (alerts.length === 1) return [[`${glyph} ${first.short} ${word} há ${age(Math.floor((squad.now - first.since!) / 1000))}`, color], ...tail];
    if (alerts.every((a) => a.permission && a.blockedReason === null)) return [[`⚠ ${alerts.length} bloqueados por permissão`, "bred"], ...tail];
    return [...alerts.map((a, i): Colored => [`${i ? " " : ""}${ALERT[a.status]![0]} ${a.short}`, ALERT[a.status]![2]]), ...tail];
  }

  const gate = squad.gates.find((g) => g.pending);
  if (gate) return [[`⚠ ${gid(gate.id)} aguarda você`, "bmagenta"]];
  if (!squad.feature) return [[idle, "gray"]];

  const ref = rows.find((row) => row.seq === ui.selected)?.event.ticket_ref;
  const ticket = squad.tickets.find((t) => t.ticket_ref === ref);
  if (!ticket) return [["rework —", "gray"]];
  const n = ticket.reworks;
  return [[`rework ${ticket.ticket_ref} ⟳ ${Math.min(n, 2)}/2${n > 2 ? " limite" : ""}`, n >= 2 ? "bred" : n ? "byellow" : "gray"]];
}
