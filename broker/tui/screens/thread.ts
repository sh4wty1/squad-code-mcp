// The thread of a ticket: what was said of it, in order, with the note the log gives each
// entry, the line of the flow and, at the right, what the judge said of each criterion.
// The layout is the one of `rThread` of the prototype; the content comes from the events.

import type { SquadEvent } from "../../shared/contract.ts";
import { REWORK_LIMIT, type SquadTicket } from "../../shared/derive.ts";
import { refs } from "../activity.ts";
import { label, qid } from "../feed.ts";
import { age, clock, cut, grid, len, pad, wrap, type Color, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { chrome, drawRows, KIND_TONE, TICKET_TONE, tone, type Keys, type Line } from "./chrome.ts";

const KEYS: Keys = [
  ["j/k", "rolar"],
  ["[ ]", "ticket ant/próx"],
  ["esc", "voltar"],
  ["b", "próx. bloqueante"],
  ["1-4", "telas"],
  ["?", "ajuda"],
  ["q", "sair"],
];

// The lines an entry may take, from line 5 to line 34
const ROOM = 30;

const who = (name: string) => (name === "human" ? "dev" : label(name));
const seconds = (from: number, to: number) => age(Math.floor((to - from) / 1000));

// The ticket the screen shows: the chosen one, or the one of the selected line of the
// feed, or the first of the plan; null without tickets
export function threadTicket(view: View): string | null {
  const { squad, rows, ui } = view;
  const chosen = rows.find((row) => row.seq === ui.selected);
  const ref = ui.threadTicket ?? chosen?.ticket ?? chosen?.event.ticket_ref;
  return (squad.tickets.find((t) => t.ticket_ref === ref) ?? squad.tickets[0])?.ticket_ref ?? null;
}

// An entry draws its lines from line y down
type Entry = ((y: number) => void)[];

export function thread(view: View): Grid {
  const { squad, rows, ui } = view;
  const g = grid();
  chrome(g, view, "thread", KEYS);
  const ticket = squad.tickets.find((t) => t.ticket_ref === threadTicket(view));
  g.box(0, 2, 76, 36, "bwhite", ticket ? `thread ${ticket.ticket_ref} · ${ticket.title}` : "thread", "bwhite");
  g.box(76, 2, 44, 36, "gray", "judge · nota por critério", "bwhite");
  if (!ticket) {
    g.put(2, 5, "○ nenhum ticket ainda", "gray", { bold: true });
    return g;
  }

  // The events of the open feature, one each: the line of the limit repeats its verdict
  const events = rows.filter((row) => row.seq === row.event.seq && row.event.feature_id === squad.feature?.id);
  const mine = events.map((row) => row.event).filter((e) => e.ticket_ref === ticket.ticket_ref);
  const plans = events.filter((row) => row.sys === "plan");
  const dropped = plans.find((row) => row.event.kind === "plan" && row.event.tickets.some((t) => t.ticket_ref === ticket.ticket_ref && t.dropped));
  const asked = squad.questions.filter((q) => q.ticket_ref === ticket.ticket_ref);

  const entries: Entry[] = [];
  const flow: Seg[] = [];
  const verdicts: Extract<SquadEvent, { kind: "verdict" }>[] = [];
  const seen = new Set<number>();
  let reworks = 0;

  function entry(e: SquadEvent, glyph: [string, Color], kind: Color, note: [text: string, color: Color, bold: boolean], strong = false) {
    const lines: Entry = [
      (y) => {
        g.put(2, y, clock(e.ts), "white");
        g.put(11, y, glyph[0], glyph[1], { bold: true });
        g.put(13, y, `[${e.kind}]`, kind);
        const x = g.put(g.put(24, y, label(e.from), tone(e.from), { bold: true }) + 1, y, "→", "gray");
        g.put(x + 1, y, label(e.to ?? ""), tone(e.to ?? ""), { bold: true });
        g.put(37, y, cut(note[0], 37), note[1], { bold: note[2] });
      },
    ];
    const body = (text: string, color: Color) =>
      lines.push((y) => {
        g.put(11, y, "│", "gray");
        g.put(13, y, text, color);
      });
    for (const line of wrap(e.summary, 60)) body(line, strong ? "bwhite" : "white");
    if (e.kind === "task" && e.loadout?.length) body(cut("loadout: " + e.loadout.join(" · "), 60), "gray");
    entries.push(lines);
  }

  for (const e of mine) {
    if (e.kind === "task") {
      entry(e, ["●", tone(e.from)], KIND_TONE.task!, [reworks ? `rework ${Math.min(reworks, 2)}/2` : "", "gray", false]);
      flow.push(["task", "bblue"]);
    } else if (e.kind === "result") {
      const task = events.find((row) => row.seq === e.task_seq);
      entry(e, ["●", tone(e.from)], KIND_TONE.result!, [task ? seconds(task.ts, e.ts) : "", "gray", false]);
      flow.push(["result", "white"]);
    } else if (e.kind === "verdict") {
      verdicts.push(e);
      const marks = `${e.criteria.filter((c) => c.pass).length}/${e.criteria.length}`;
      if (e.outcome === "approve") {
        entry(e, ["✓", "bgreen"], "bgreen", [`APPROVE · ${marks}`, "bgreen", true]);
        flow.push([`✓ v${verdicts.length}`, "bgreen", true]);
      } else {
        reworks++;
        const limit = reworks >= REWORK_LIMIT;
        entry(e, ["✗", "bred"], "bred", [limit ? `REPROVADO · ${marks} · limite atingido` : `REWORK ⟳ ${reworks}/2 · ${marks}`, "bred", true]);
        flow.push([`✗ v${verdicts.length}`, "bred", true]);
        if (limit) flow.push(["⚠ limite 2/2", "bred", true]);
      }
    } else if (e.kind === "question") {
      // One entry for a question, where it was asked: the route says how far it went
      if (seen.has(e.question_id)) continue;
      seen.add(e.question_id);
      const q = asked.find((q) => q.id === e.question_id);
      const route = (q?.route ?? [e.from, e.to ?? ""]).map(who).join(" → ");
      if (e.blocking) {
        entry(e, ["?", "bred"], "bred", [`${qid(e.question_id)} [BLOQUEANTE] · ${route}`, "bred", true], true);
        flow.push([`? ${qid(e.question_id)}`, "bred", true]);
      } else entry(e, ["●", tone(e.from)], KIND_TONE.question!, [`${qid(e.question_id)} · ${route}`, "gray", false]);
    } else if (e.kind === "answer") {
      const reached = asked.find((q) => q.id === e.question_id)?.reached_human_ts;
      const waited = e.resolved_by === "human" && reached ? ` · ${seconds(reached, e.ts)} no dev` : "";
      entry(e, ["●", tone(e.from)], KIND_TONE.answer!, [qid(e.question_id) + waited, "gray", false]);
      flow.push(["answer", "blue"]);
    }
  }
  if (dropped) {
    const owner = squad.agents.find((a) => a.name === ticket.owner);
    entries.push([
      (y) => {
        g.put(2, y, clock(dropped.ts), "white");
        g.put(11, y, "✗", "gray", { bold: true });
        g.put(13, y, "[dropped]", "gray", { bold: true });
        g.put(24, y, label(dropped.event.from), tone(dropped.event.from), { bold: true });
        g.put(37, y, cut(`plano v${dropped.version} · ${ticket.ticket_ref} saiu${owner ? ` · ${owner.short} liberado` : ""}`, 37), "gray");
      },
    ]);
    flow.push(["✗ dropped", "gray", true]);
  }

  g.segs(2, 3, head(view, ticket, plans.at(-1)?.ts, dropped?.ts, verdicts));
  if (ticket.status === "planned") {
    drawRows(g, 2, 5, 34, planned(view, ticket), 0, 76, "gray");
    flow.push([`▶ plano v${squad.planVersion}`, "cyan", true]);
    if (ticket.depends_on.length) flow.push([`aguarda ${refs(ticket.depends_on)}`, "gray"]);
    flow.push(["task", "gray"]);
  }

  // The latest entries that fit; the ones scrolled away say how many they are
  const end = entries.length - Math.max(0, Math.min(ui.threadOffset, entries.length - 1));
  const after = entries.length - end;
  const budget = ROOM - (after ? 2 : 0);
  let start = end;
  let used = 0;
  while (start > 0) {
    const need = Math.min(entries[start - 1]!.length, budget - (start > 1 ? 2 : 0)) + (used ? 1 : 0);
    if (used && used + need + (start > 1 ? 2 : 0) > budget) break;
    used += need;
    start--;
  }
  let y = 5;
  if (start > 0) {
    g.put(13, y++, `… ${start} eventos antes · k rola`, "gray");
    g.put(11, y++, "│", "gray");
  }
  entries.slice(start, end).forEach((lines, i) => {
    if (i) g.put(11, y++, "│", "gray");
    const room = 35 - (after ? 2 : 0) - y;
    const clipped = lines.length > room;
    for (const line of lines.slice(0, clipped ? room - 1 : room)) line(y++);
    if (clipped) g.put(13, y++, "… conteúdo cortado", "gray");
  });
  if (after) {
    g.put(11, y++, "│", "gray");
    g.put(13, y, `… ${after} eventos depois · j rola`, "gray");
  }

  // The flow, cut at the 72 columns of the panel
  let room = 72;
  const line: Seg[] = [["fluxo  ", "gray"], ...flow.flatMap((seg, i): Seg[] => (i ? [[" ▶ ", "gray"], seg] : [seg]))];
  g.segs(
    2,
    35,
    line.flatMap((seg): Seg[] => {
      if (!seg || room <= 0) return [];
      const text = cut(seg[0], room);
      room -= len(seg[0]);
      return [[text, seg[1], seg[2]]];
    })
  );

  // A column for each verdict, and a line for each criterion any of them has
  const col = (i: number) => 116 - (verdicts.length - 1 - i) * 5;
  g.put(78, 3, "critério da spec", "gray");
  verdicts.forEach((_, i) => g.put(col(i), 3, `v${i + 1}`, "gray"));
  const criteria = [...new Set(verdicts.flatMap((v) => v.criteria.map((c) => c.n)))].sort((a, b) => a - b);
  criteria.forEach((n, i) => {
    const marks = verdicts.map((v) => v.criteria.find((c) => c.n === n));
    g.put(78, 4 + i, n, "gray");
    g.put(79 + len(n), 4 + i, cut(marks.findLast((c) => c)!.text, col(0) - 82), marks.some((c) => c && !c.pass) ? "bred" : "white");
    marks.forEach((c, j) => c && g.put(col(j), 4 + i, c.pass ? "✓" : "✗", c.pass ? "bgreen" : "bred", { bold: true }));
  });
  let yy = 4 + criteria.length;
  g.sep(76, yy++, 44, "gray");

  const side: Line[] = [];
  if (verdicts.length) {
    let failed = 0;
    const outcomes = verdicts.map((v) => (v.outcome === "approve" ? "approve" : ++failed >= REWORK_LIMIT ? "reprovado" : "rework"));
    const width = Math.max(...outcomes.map(len)) + 2;
    verdicts.forEach((v, i) => {
      const ok = v.outcome === "approve";
      const marks = `${v.criteria.filter((c) => c.pass).length}/${v.criteria.length}`;
      side.push([[`v${i + 1} ${clock(v.ts)}  `, "gray"], [(ok ? "✓ " : "✗ ") + pad(outcomes[i]!, width) + marks, ok ? "bgreen" : "bred", true]]);
    });
    side.push("SEP", [["notas do judge", "gray"]]);
    const notes: Seg[][] = [];
    verdicts.forEach((v, i) => {
      for (const c of v.criteria) {
        if (c.note) wrap(c.note, 33).forEach((text, j) => notes.push([[j ? "       " : pad(`${c.n} v${i + 1}`, 7), c.pass ? "bgreen" : "bred", true], [text, "white"]]));
      }
    });
    side.push(...(notes.length ? notes : [[["nenhuma", "gray"]] satisfies Seg[]]));
  } else side.push([["judge", "gray"]], [["○ sem avaliação · nada entregue", "gray"]]);

  side.push("SEP", [["perguntas no thread", "gray"]]);
  if (!asked.length) side.push([["nenhuma", "gray"]]);
  for (const q of asked) {
    const answer = mine.find((e) => e.kind === "answer" && e.question_id === q.id);
    const how: Seg[] =
      q.merged_into !== null
        ? [[`▶ mesclada em ${qid(q.merged_into)}`, "white"]]
        : q.open
          ? [[`? aberta · com ${who(q.holder)}`, q.blocking ? "bred" : "byellow"]]
          : q.resolved_by === "human"
            ? [["✓ respondida pelo dev", "bgreen"], [answer && q.reached_human_ts ? ` em ${seconds(q.reached_human_ts, answer.ts)}` : "", "gray"]]
            : q.resolved_by === "agent"
              ? [["✓ respondida entre agentes", "bgreen"]]
              : [[`⟳ default aplicado · ${q.resolved_by === "timeout_default" ? "timeout" : "entregou antes"}`, "byellow"]];
    side.push([[qid(q.id) + " ", "bwhite", true], ...how]);
  }
  drawRows(g, 78, yy, 36, side, 76, 44, "gray");
  return g;
}

// Line 3: who has the ticket, when it opened, how it ended and its reworks
function head(view: View, ticket: SquadTicket, planTs: number | undefined, droppedTs: number | undefined, verdicts: SquadEvent[]): Seg[] {
  const { squad, rows } = view;
  if (ticket.status === "planned") {
    return [["sem dono", "gray"], [` · no plano v${squad.planVersion} desde ${clock(planTs ?? squad.now)} · `, "gray"], ["[planned]", "cyan", true]];
  }
  const task = rows.find((row) => !row.sys && row.event.kind === "task" && row.event.ticket_ref === ticket.ticket_ref && row.event.feature_id === squad.feature?.id);
  const n = Math.min(ticket.reworks, 2);
  const end =
    ticket.status === "dropped"
      ? `descartado ${clock(droppedTs ?? squad.now)} · `
      : ticket.status === "escalated"
        ? `escalado ${clock(verdicts.at(-1)!.ts)} · `
        : ticket.status === "done"
          ? `fechado ${clock(verdicts.at(-1)!.ts)} · `
          : "";
  return [
    [ticket.owner ?? "sem dono", ticket.dropped || !ticket.owner ? "gray" : tone(ticket.owner), !ticket.dropped],
    [` · ${task ? `aberto ${clock(task.ts)} · ` : ""}${end}`, "gray"],
    ticket.dropped ? ["[dropped]", "gray", true] : [`⟳ ${n}/2`, n >= 2 ? "bred" : n ? "byellow" : "gray", true],
  ];
}

// A ticket of the plan that got no task yet has no line of time: only what the plan says
function planned(view: View, ticket: SquadTicket): Line[] {
  const { squad } = view;
  const deps = ticket.depends_on.map((ref, i): Seg[] => {
    const dep = squad.tickets.find((t) => t.ticket_ref === ref);
    const owner = squad.agents.find((a) => a.name === dep?.owner);
    return [
      [i ? "           " : "depende de ", "gray"],
      [ref, "bwhite", true],
      [dep ? ` ${dep.title} · ` : "", "white"],
      dep && [`[${dep.status}]`, TICKET_TONE[dep.status]],
      owner && [" " + owner.short, "green"],
    ];
  });
  return [
    [["○ sem linha do tempo", "gray", true]],
    [],
    ...wrap(`O ${ticket.ticket_ref} está no plano mas ainda não recebeu task. A linha do tempo começa na primeira task do leader; até lá só existe o que o plano diz.`, 70).map((line): Seg[] => [[line, "white"]]),
    [],
    [[`no plano v${squad.planVersion}`, "gray"]],
    [["título     ", "gray"], [ticket.title, "bwhite", true]],
    ...(deps.length ? deps : [[["depende de ", "gray"], ["—", "gray"]] as Seg[]]),
    [["dono       ", "gray"], ["—", "gray"], ["  definido quando a task sair", "gray"]],
    [["rework     ", "gray"], ["⟳0/2", "gray"]],
    [],
    [["próximo evento esperado", "gray"]],
    [["ldr", "cyan", true], [" → ", "gray"], ["worker", "green", true], ["  [task]", "bblue"], [deps.length ? `  depois que o ${refs(ticket.depends_on)} for aprovado` : "", "gray"]],
  ];
}
