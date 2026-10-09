// The lines of the panel of detail, for the selected line of the feed: a message, or the
// block of its kind of system line. Ported from `detailLines` of the prototype and its
// helpers, with what the prototype writes by hand taken from the events. Without a
// selected line and without an open feature, the summary of the last feature.

import type { SquadEvent } from "../../shared/contract.ts";
import type { SquadTicket } from "../../shared/derive.ts";
import { refs } from "../activity.ts";
import { cost } from "../config.ts";
import { debt, gid, label, type FeedRow } from "../feed.ts";
import { age, clock, cut, len, pad, wrap, type Color, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { KIND_TONE, kindTone, STATUS, statusSegs, TICKET_TONE, tone, type Line } from "./chrome.ts";

const W = 30;

const text = (body: string, color: Color = "white"): Line[] => wrap(body, W).map((line): Seg[] => [[line, color]]);
const full = (name: string) => (name === "human" ? "dev" : name);
const who = (name: string): Seg[] => [[pad(label(name), 4), tone(name), true], [full(name), tone(name)]];
const since = (view: View, ts: number) => `${clock(ts)} · há ${age(Math.floor((view.squad.now - ts) / 1000))}`;
const SAY_ALL = text("aviso da mother a todos: sem destinatário, não acende aresta.", "gray");

// The tickets of the feature of an event: the open one, or as they were when it closed
function ticketsOf(view: View, feature_id: number | null): SquadTicket[] {
  if (view.squad.feature?.id === feature_id) return view.squad.tickets;
  return view.rows.find((row) => row.sys === "closed" && row.event.feature_id === feature_id)?.squad?.tickets ?? [];
}

const ticketLine = (ticket: SquadTicket): Seg[] => [["ticket ", "gray"], [ticket.ticket_ref, "bwhite", true], [" " + ticket.title, "white"]];

// The loadout of the latest task of the ticket the agent has open
function loadout(view: View, name: string, ref?: string | null): Line[] {
  const open = ref ?? view.squad.agents.find((a) => a.name === name)?.ticket ?? null;
  const task = open === null ? undefined : view.rows.findLast((row) => row.event.kind === "task" && row.event.ticket_ref === open)?.event;
  const skills = task?.kind === "task" ? (task.loadout ?? []) : [];
  return [[["loadout ", "gray"], [full(name), tone(name), true]], ...text(skills.join(" · ") || "sem loadout", tone(name))];
}

// One line per approved ticket, two for one that stopped before
export function ticketSummary(view: View, t: SquadTicket): Line[] {
  const owner = view.squad.agents.find((a) => a.name === t.owner)?.short ?? "—";
  const lines: Line[] = [[[t.approved ? "✓ " : "○ ", t.approved ? "bgreen" : "byellow", true], [t.ticket_ref + " ", "bwhite"], [`⟳${Math.min(t.reworks, 2)}/2 `, t.reworks ? "byellow" : "gray"], [owner, "green"]]];
  if (!t.approved) lines.push([["  parou em ", "gray"], [`[${t.status}]`, TICKET_TONE[t.status]]]);
  return lines;
}

// The approved ones first, as the summary lists them
export const closing = (tickets: SquadTicket[]) => [...tickets.filter((t) => t.approved), ...tickets.filter((t) => !t.approved)];

// A path broken at its slashes
function pathLines(path: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  path.split("/").forEach((part, i, parts) => {
    const piece = part + (i < parts.length - 1 ? "/" : "");
    if (line && len(line + piece) > width) {
      out.push(line);
      line = piece;
    } else line += piece;
  });
  out.push(line);
  return out;
}

function opened(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "feature_opened" }>): Line[] {
  const before = view.rows.slice(0, view.rows.indexOf(row)).findLast((r) => r.sys === "closed");
  const delivered = before?.event.kind === "feature_closed" && before.event.outcome === "delivered";
  return [
    [["▶ feature aberta", "bmagenta", true], [" · " + e.from, tone(e.from)]],
    [["às       ", "gray"], [clock(e.ts), "white"]],
    ...SAY_ALL,
    "SEP",
    [["título", "gray"]],
    ...wrap(e.title, W).map((line): Seg[] => [[line, "bwhite", true]]),
    [["workflow ", "gray"], [e.workflow, "bwhite", true]],
    [["branch   ", "gray"], [e.branch, "white"]],
    [["base     ", "gray"], [e.base_branch, "white"]],
    [["spec", "gray"]],
    ...pathLines(e.spec_ref, W - 2).map((line): Seg[] => [["  " + line, "white"]]),
    [["commit   ", "gray"], [e.spec_commit, "white"]],
    ...(before
      ? ([
          "SEP",
          [["feature anterior", "gray"]],
          [[delivered ? "✓ " : "✗ ", delivered ? "bgreen" : "byellow", true], [cut(before.squad?.feature?.title ?? "", W - 2), "white"]],
          [[`  ${delivered ? "entregue" : "abandonada"} ${clock(before.ts)}`, "gray"]],
        ] satisfies Line[])
      : []),
    "SEP",
    ...loadout(view, e.from),
  ];
}

function closed(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "feature_closed" }>): Line[] {
  const abandoned = e.outcome === "abandoned";
  const color: Color = abandoned ? "byellow" : "bgreen";
  const start = view.rows.find((r) => r.sys === "opened" && r.event.feature_id === e.feature_id);
  return [
    [[abandoned ? "✗ feature encerrada" : "✓ feature encerrada", color, true]],
    [["desfecho ", "gray"], [abandoned ? "abandonada" : "entregue", color, true]],
    [["às       ", "gray"], [clock(e.ts), "white"]],
    ...(start ? ([[["duração  ", "gray"], [`${Math.round((e.ts - start.ts) / 60000)} min · desde ${clock(start.ts).slice(0, 5)}`, "white"]]] satisfies Line[]) : []),
    ...SAY_ALL,
    "SEP",
    [["título", "gray"]],
    ...wrap(row.squad?.feature?.title ?? "", W).map((line): Seg[] => [[line, "bwhite", true]]),
    ...(abandoned ? (["SEP", [["motivo · texto da mother", "gray"]], ...(e.body ? text(`"${e.body}"`) : ([[["— não registrado · é opcional", "gray"]]] satisfies Line[]))] satisfies Line[]) : []),
    "SEP",
    [["tickets no encerramento", "gray"]],
    ...closing(row.squad?.tickets ?? []).flatMap((t) => ticketSummary(view, t)),
    "SEP",
    ...text("Quem não está [blocked] nem [offline] passa a [idle]; esses dois continuam. Os tickets saem do painel e ficam no resumo.", "gray"),
  ];
}

function entered(view: View, row: FeedRow, peer: string): Line[] {
  const here = view.squad.agents.filter((a) => a.status !== "never").length;
  return [
    [[`● ${peer} entrou`, "bgreen", true]],
    [["às      ", "gray"], [clock(row.ts), "white"]],
    ...text("primeira entrada deste nome no log deste broker.", "gray"),
    "SEP",
    [[`squad · ${here} de 6 entraram`, "gray"]],
    ...view.squad.agents.map((a): Seg[] => {
      const never = a.status === "never";
      return [[STATUS[a.status][1] + " ", never ? "gray" : STATUS[a.status][0], true], [pad(a.name, 9), never ? "gray" : tone(a.name), !never], ...statusSegs(a)];
    }),
    "SEP",
    ...text("[não lançado] não é [offline]: offline é sessão que entrou e morreu.", "gray"),
    "SEP",
    ...loadout(view, peer),
  ];
}

function back(view: View, row: FeedRow, peer: string, gone: FeedRow): Line[] {
  return [
    [[`● ${peer} voltou`, "bgreen", true]],
    [["às     ", "gray"], [clock(row.ts), "white"]],
    [["offline ", "gray"], [age(Math.floor((row.ts - gone.ts) / 1000)), "white"]],
    ...(row.ticket ? ([[["ticket ", "gray"], [row.ticket, "bwhite", true], [" retomado", "bgreen"]]] satisfies Line[]) : []),
    "SEP",
    ...text(`${peer} reapareceu no broker com o mesmo nome.${row.ticket ? ` O ${row.ticket} continua com ele e segue de onde parou.` : ""}`),
    "SEP",
    ...loadout(view, peer, row.ticket),
  ];
}

function left(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "peer_left" }>): Line[] {
  const peer = e.peer;
  const how = e.reason === "died" ? "morreu" : "foi encerrada";
  return [
    [[`◌ ${peer} [offline]`, "red", true]],
    [["desde  ", "gray"], [since(view, row.ts), "white"]],
    ...(row.ticket ? ([[["ticket ", "gray"], [row.ticket, "bwhite", true], [` parado, com ${label(peer)}`, "red"]]] satisfies Line[]) : []),
    "SEP",
    [["o que houve", "gray"]],
    ...text(`A sessão do Claude Code do ${peer} ${how}: o peer sumiu do broker${row.ticket ? ` no meio do ${row.ticket}` : ""}.`),
    "SEP",
    [["o que fazer", "gray"]],
    ...text(`Relance a sessão no terminal do ${peer} com o mesmo nome:`),
    [["  " + peer, tone(peer), true]],
    ...(row.ticket ? text(`O ${row.ticket} continua atribuído a ele e segue de onde parou.`) : []),
    [],
    [["a TUI não relança sessões;", "gray"]],
    [["isto é só instrução.", "gray"]],
    "SEP",
    [["ao voltar", "gray"]],
    [[`● ${label(peer)} voltou`, "bgreen"], [" aparece no feed", "gray"]],
    "SEP",
    ...loadout(view, peer, row.ticket),
  ];
}

function stalled(view: View, row: FeedRow): Line[] {
  const name = row.event.from;
  const ref = row.owes?.ticket_ref;
  const ticket = ticketsOf(view, row.event.feature_id).find((t) => t.ticket_ref === ref);
  return [
    [[`‖ ${name} [stalled]`, "byellow", true]],
    [["desde  ", "gray"], [since(view, row.ts), "white"]],
    ...(ticket ? [ticketLine(ticket)] : []),
    [["deve   ", "gray"], [row.owes ? debt(row.owes) : "", "bwhite", true]],
    "SEP",
    [["o que houve", "gray"]],
    ...text(`O turno do ${name} acabou sem a entrega. A sessão está viva, não há pergunta nem bloqueio: só parou devendo.`),
    "SEP",
    [["o que fazer", "gray"]],
    ...text(`Vá ao terminal do ${name} e peça que ${ref ? `termine o ${ref}` : "ele entregue o que deve"}.`),
    [["a TUI não tem ação para isso.", "gray"]],
    "SEP",
    [["quem fica stalled, devendo", "gray"]],
    [["worker ", "green"], ["result do ticket", "white"]],
    [["judge  ", "yellow"], ["verdict", "white"]],
    [["leader ", "cyan"], ["task de rework, plano", "white"]],
    [["todos  ", "white"], ["answer de pergunta sua", "white"]],
    "SEP",
    ...loadout(view, name, ref),
  ];
}

function plan(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "plan" }>): Line[] {
  const before = view.rows.slice(0, view.rows.indexOf(row)).findLast((r) => r.sys === "plan" && r.event.feature_id === e.feature_id)?.event;
  const known = before?.kind === "plan" ? before.tickets : null;
  const owners = ticketsOf(view, e.feature_id);
  return [
    [[`▶ plano v${row.version}`, "cyan", true], [" · " + e.from, tone(e.from)]],
    [["publicado ", "gray"], [clock(e.ts), "white"]],
    ...text("evento do log, não mensagem entre peers: não tem de/para.", "gray"),
    "SEP",
    [[`tickets · ${e.tickets.filter((t) => !t.dropped).length} no plano`, "gray"]],
    ...e.tickets.flatMap((t): Line[] => {
      const added = known !== null && !known.some((k) => k.ticket_ref === t.ticket_ref);
      const dropped = t.dropped === true;
      const owner = owners.find((o) => o.ticket_ref === t.ticket_ref)?.owner;
      const lines: Line[] = [[[added ? "+ " : dropped ? "✗ " : "  ", added ? "bgreen" : "gray", true], [t.ticket_ref, dropped ? "gray" : "bwhite", !dropped], [" " + cut(t.title, 21), dropped ? "gray" : "white"]]];
      if (dropped) lines.push([[`    descartado${owner ? ` · ${label(owner)} liberado` : ""}`, "gray"]]);
      else if (t.depends_on?.length) lines.push([["    depende de ", "gray"], [refs(t.depends_on), "bwhite"]]);
      return lines;
    }),
    "SEP",
    [["sem dono até a task", "gray"]],
    ...text(
      row.version === 1
        ? "Nenhuma task saiu ainda. Cada ticket ganha dono quando o leader mandar a primeira task dele."
        : "Republicar o plano não muda o que já está em andamento; os novos entram em [planned]."
    ),
    "SEP",
    ...loadout(view, e.from),
  ];
}

function refused(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "refused" }>): Line[] {
  const times = row.count ? `×${row.count} · ${clock(row.ts)}–${clock(row.lastTs!).slice(3)}` : `1 · ${clock(row.ts)}`;
  return [
    [["✗ recusa do broker", "bred", true]],
    [["agente ", "gray"], ...who(e.peer)],
    [["tentou ", "gray"], [`[${e.attempted_kind}]`, KIND_TONE[e.attempted_kind] ?? "white"]],
    [["erro   ", "gray"], [e.error, "bred", true]],
    [["vezes  ", "gray"], [times, "white"]],
    "SEP",
    [["agrupamento", "gray"]],
    ...text("Recusas seguidas do mesmo agente com o mesmo erro viram uma linha só; o contador sobe a cada nova."),
    "SEP",
    ...text("Só leitura: a TUI não reenvia nem corrige.", "gray"),
    "SEP",
    ...loadout(view, e.peer),
  ];
}

function blocked(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "blocked" }>): Line[] {
  const ticket = ticketsOf(view, e.feature_id).find((t) => t.ticket_ref === e.ticket_ref);
  // The questions of the ticket after the block: how it went up
  const asked = view.rows.filter((r) => r.event.kind === "question" && r.seq > row.seq && ticket && r.event.ticket_ref === ticket.ticket_ref && r.event.feature_id === e.feature_id);
  return [
    [[`⚠ ${e.from} [blocked]`, "bred", true]],
    [["desde  ", "gray"], [since(view, row.ts), "white"]],
    ...(ticket ? [ticketLine(ticket)] : []),
    "SEP",
    [["motivo", "gray"]],
    ...wrap(e.reason, W).map((line): Seg[] => [[line, "bred", true]]),
    ...text(e.detail),
    [["última ação", "gray"]],
    ...text(e.last_action),
    ...(asked.length
      ? ([
          "SEP",
          [["escalação", "gray"]],
          ...asked.map((r): Seg[] => [[` ${clock(r.ts).slice(0, 5)} `, "gray"], [label(r.event.from), tone(r.event.from)], ["→", "gray"], [pad(label(r.event.to ?? ""), 4), tone(r.event.to ?? "")], ["[question]", "bwhite"]]),
        ] satisfies Line[])
      : []),
    ...(ticket ? (["SEP", [["enter ", "bwhite", true], [`thread ${ticket.ticket_ref}`, "gray"]]] satisfies Line[]) : []),
  ];
}

// The input as it is, each line broken at the width
const pre = (input: string, width: number) => input.split("\n").flatMap((line) => line.match(new RegExp(`.{1,${width}}`, "gu")) ?? [""]);

function permission(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "permission_request" }>): Line[] {
  const ticket = ticketsOf(view, e.feature_id).find((t) => t.ticket_ref === e.ticket_ref);
  const pending = view.squad.permissions.some((p) => p.seq === e.seq);
  return [
    [[`msg #${String(e.seq).padStart(4, "0")}  `, "bwhite", true], ["[permission_request]", "bcyan", true]],
    [["de    ", "gray"], ...who(e.from)],
    [["para  ", "gray"], ["hum dev", "bwhite", true], ["  pela TUI", "gray"]],
    [["hora  ", "gray"], [clock(e.ts), "white"]],
    ticket ? ticketLine(ticket) : [["ticket ", "gray"], ["— sem feature aberta", "gray"]],
    "SEP",
    [["tool  ", "gray"], [e.tool_name, "bwhite", true]],
    [["descrição · texto do agente", "gray"]],
    ...text(`"${e.description}"`),
    [["vai executar", "gray"]],
    ...pre(e.input_preview, W)
      .slice(0, 4)
      .map((line): Seg[] => [[line, "bwhite", true]]),
    "SEP",
    ...(pending
      ? ([
          [[`⚠ ${e.from} `, "bred", true], ["[blocked ", "bred", true], ["x", "bwhite", true], ["]", "bred", true]],
          [["parado há " + age(Math.floor((view.squad.now - e.ts) / 1000)), "white"]],
          [["x ", "bwhite", true], ["abre, de qualquer tela", "gray"]],
          [["a ", "bwhite", true], ["permite   ", "gray"], ["d ", "bwhite", true], ["nega", "gray"]],
        ] satisfies Line[])
      : ([[["✓ pedido fechado", "bgreen", true]]] satisfies Line[])),
    "SEP",
    [["os dois bloqueios", "gray"]],
    [["declarado  ", "white"], ["→ pergunta ao dev", "gray"]],
    [["permissão  ", "white"], ["→ tecla, aqui", "gray"]],
    "SEP",
    ...loadout(view, e.from),
  ];
}

function message(view: View, row: FeedRow): Line[] {
  const e = row.event;
  const to = e.to ?? "";
  const id = `msg #${String(e.seq).padStart(4, "0")}`;
  const ticket = ticketsOf(view, e.feature_id).find((t) => t.ticket_ref === e.ticket_ref);
  const head: Line[] = [
    [[id, "bwhite", true], [" ".repeat(Math.max(1, W - len(id) - len(e.kind) - 2)), "white"], [`[${e.kind}]`, kindTone(e), true]],
    [["de    ", "gray"], ...who(e.from)],
    [["para  ", "gray"], ...who(to)],
    [["hora  ", "gray"], [clock(e.ts), "white"]],
  ];
  if (ticket) {
    const n = ticket.reworks;
    head.push(ticketLine(ticket));
    head.push([["rework ", "gray"], [`⟳ ${Math.min(n, 2)}/2`, n >= 2 ? "bred" : n ? "byellow" : "gray", true], [n > 2 ? "  limite · sem 3º" : "", "bred"]]);
  } else head.push([["escopo ", "gray"], ["feature (sem ticket)", "white"]]);

  const criteria: Line[] =
    e.kind === "verdict"
      ? [[], [["critérios da spec", "gray"]], ...e.criteria.map((c): Seg[] => [[c.pass ? "✓ " : "✗ ", c.pass ? "bgreen" : "bred", true], [cut(c.text, W - 2), c.pass ? "white" : "bred"]])]
      : [];

  // The five last messages of the ticket, or of the feature outside a ticket
  const same = view.rows.filter((r) => !r.sys && r.event.feature_id === e.feature_id && r.event.ticket_ref === e.ticket_ref);
  const thread: Line[] = [
    [[`thread ${ticket ? ticket.ticket_ref : "da feature"} · ${same.length} msgs`, "gray"]],
    ...same.slice(-5).map((r): Seg[] => [
      [r === row ? "▶" : " ", "bwhite", true],
      [clock(r.ts).slice(0, 5) + " ", r === row ? "bwhite" : "gray"],
      [label(r.event.from), tone(r.event.from)],
      ["→", "gray"],
      [pad(label(r.event.to ?? ""), 4), tone(r.event.to ?? "")],
      [`[${r.event.kind}]`, kindTone(r.event)],
    ]),
  ];
  const owner = ticket ? (ticket.owner ?? "leader") : to === "human" || e.from === "human" ? "mother" : to;
  const load = loadout(view, owner, ticket?.ticket_ref);

  // The body takes what is left of the 34 lines of the panel
  let body = wrap(e.body, W);
  const room = 34 - (head.length + 1 + criteria.length + 1 + thread.length + 1 + load.length);
  if (body.length > room) {
    body = body.slice(0, Math.max(1, room));
    body[body.length - 1] = cut(`${body.at(-1)} …`, W);
  }
  return [...head, "SEP", ...body.map((line): Seg[] => [[line, "white"]]), ...criteria, "SEP", ...thread, "SEP", ...load];
}

// The last feature that closed: how it ended, its tickets, its questions and what it cost
function summary(view: View, row: FeedRow, e: Extract<SquadEvent, { kind: "feature_closed" }>): Line[] {
  const then = row.squad!;
  const abandoned = e.outcome === "abandoned";
  const own = view.rows.filter((r) => r.event.feature_id === e.feature_id);
  const approval = own.findLast((r) => r.event.kind === "gate_decision" && r.event.decision === "approve");
  const by = (how: string) => then.questions.filter((q) => q.merged_into === null && q.resolved_by?.includes(how)).length;
  const merged = then.questions.filter((q) => q.merged_into !== null).length;
  const dollars = [...then.usage.feature.values()].reduce((sum, totals) => sum + cost(totals, view.prices), 0);
  return [
    [["nenhuma mensagem selecionada", "gray"]],
    [],
    [["última feature", "gray"]],
    [[abandoned ? "✗ abandonada" : "✓ entregue", abandoned ? "byellow" : "bgreen", true], [" · " + clock(row.ts), "white"]],
    ...wrap(then.feature?.title ?? "", W - 2).map((line): Seg[] => [["  " + line, "bwhite", true]]),
    ...(approval?.event.kind === "gate_decision" ? ([[[`  ${gid(approval.event.gate_id)} aprovado ${clock(approval.ts)}`, "white"]]] satisfies Line[]) : []),
    ...(!abandoned ? [] : e.body ? ([[["  motivo", "gray"]], ...wrap(e.body, W - 2).map((line): Seg[] => [["  " + line, "white"]])] satisfies Line[]) : ([[["  sem motivo registrado", "gray"]]] satisfies Line[])),
    "SEP",
    [[`tickets · ${then.tickets.filter((t) => t.approved).length} de ${then.tickets.length} aprovados`, "gray"]],
    ...closing(then.tickets).flatMap((t) => ticketSummary(view, t)),
    "SEP",
    [["perguntas", "gray"]],
    [[`✓ ${by("human")} pelo dev · ${by("agent")} entre agentes`, "white"]],
    [[`⟳ ${by("default")} com default aplicado`, "byellow"]],
    [[`▶ ${merged} ${merged === 1 ? "mesclada" : "mescladas"}`, "white"]],
    "SEP",
    [["feature", "gray"]],
    [["duração   ", "gray"], [`${Math.round((row.ts - (own[0]?.ts ?? row.ts)) / 60000)} min`, "white"]],
    [["mensagens ", "gray"], [String(own.filter((r) => !r.sys).length), "white"]],
    [["custo     ", "gray"], ["≈$" + dollars.toFixed(2), "bwhite", true], [" est.", "gray"]],
    "SEP",
    [["j/k navega o histórico", "gray"]],
  ];
}

// A log without any feature: what there is to say of the broker
function nothing(view: View): Line[] {
  const here = view.squad.agents.filter((a) => a.status !== "never").length;
  const first = view.rows[0];
  return [
    [["nenhuma feature ainda", "gray"]],
    [],
    ...text("O log deste broker não tem feature aberta nem encerrada: não há resumo, última entrega nem ocioso desde."),
    "SEP",
    [["sessão", "gray"]],
    [["broker no ar ", "gray"], first ? [since(view, first.ts), "white"] : ["—", "gray"]],
    [["agentes      ", "gray"], [`${here} de 6 entraram`, here ? "white" : "gray"]],
    [["mensagens    ", "gray"], [String(view.rows.filter((r) => !r.sys).length), "white"]],
    "SEP",
    ...text("A mother abre a feature quando a spec estiver pronta; a linha 0 passa a mostrá-la.", "gray"),
  ];
}

const GLYPH_TONE: Record<string, Color> = { default: "byellow", merged: "byellow", limit: "bred" };

export function detailLines(view: View, row: FeedRow | undefined): Line[] {
  if (!row) {
    if (view.squad.feature) return [[["nenhuma mensagem selecionada", "gray"]]];
    const last = view.rows.findLast((r) => r.sys === "closed");
    return last?.event.kind === "feature_closed" ? summary(view, last, last.event) : nothing(view);
  }
  const e = row.event;
  if (!row.sys) return e.kind === "permission_request" ? permission(view, row, e) : message(view, row);
  if (e.kind === "feature_opened") return opened(view, row, e);
  if (e.kind === "feature_closed") return closed(view, row, e);
  if (e.kind === "peer_joined") {
    const gone = view.rows.slice(0, view.rows.indexOf(row)).findLast((r) => r.event.kind === "peer_left" && r.event.peer === e.peer);
    return gone ? back(view, row, e.peer, gone) : entered(view, row, e.peer);
  }
  if (e.kind === "peer_left") return left(view, row, e);
  if (e.kind === "plan") return plan(view, row, e);
  if (e.kind === "refused") return refused(view, row, e);
  if (e.kind === "blocked") return blocked(view, row, e);
  if (row.sys === "stalled") return stalled(view, row);
  // A default applied, a merge or the limit of rework: the line and what the event says
  return [[["evento do broker", "gray"]], [[`${[...row.text][0]} ${clock(row.ts)}`, GLYPH_TONE[row.sys] ?? "white", true]], "SEP", ...text(row.sys !== "limit" && e.body ? e.body : row.text)];
}
