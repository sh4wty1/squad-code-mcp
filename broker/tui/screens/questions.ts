// The tab of questions: the ones that wait for the dev, in the order he should answer them,
// and the detail of the selected one. The layout is the one of `rQs` and `qDetailRows` of
// the prototype; the questions come from the derived squad.

import { qid } from "../../shared/contract.ts";
import { SQUAD, type Question, type Squad } from "../../shared/derive.ts";
import { effect, left, waiting } from "../asked.ts";
import { label } from "../feed.ts";
import { age, clock, cut, grid, len, mmss, wrap, type Color, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { chrome, drawRows, stats, tone, type Keys, type Line } from "./chrome.ts";

const KEYS: Keys = [
  ["j/k", "mover"],
  ["enter", "responder"],
  ["b", "próx. bloqueante"],
  ["h", "histórico"],
  ["esc", "voltar"],
  ["1-4", "telas"],
  ["?", "ajuda"],
  ["q", "sair"],
];

// The question the tab has selected: the one of `ui.question`, or the first of the list
export function selected(view: View): Question | undefined {
  const asked = waiting(view.squad);
  return asked.find((q) => q.id === view.ui.question) ?? asked[0];
}

// The route of a question in short labels, with the name the dev has at its end
export function route(q: Question, dev = "dev"): Seg[] {
  return q.route.flatMap((name, i): Seg[] => [i ? [" → ", "gray"] : null, [name === "human" ? dev : label(name), tone(name), true]]);
}

// `absorveu Q-12 (leader)` for each question merged into this one, with the role of who asked it
export function absorbed(q: Question, squad: Squad): string[] {
  return q.absorbed.map((id) => {
    const by = squad.questions.find((other) => other.id === id)?.asked_by;
    return `absorveu ${qid(id)} (${SQUAD.find((a) => a.name === by)?.role ?? by})`;
  });
}

// For how long the question is with the dev, as `2m27s`
export const waited = (q: Question, now: number): string => age(Math.max(0, Math.floor((now - (q.reached_human_ts ?? now)) / 1000)));

// The segments cut at `room` columns
function fit(segs: Seg[], room: number): Seg[] {
  return segs.flatMap((seg): Seg[] => {
    if (!seg || room <= 0) return [];
    const text = cut(seg[0], room);
    room -= len(seg[0]);
    return [[text, seg[1], seg[2]]];
  });
}

// At most `room` lines of `w` columns, the last one saying there is more
function clip(lines: string[], room: number, w: number): string[] {
  return lines.length > room ? [...lines.slice(0, room - 1), cut(`${lines[room - 1]} …`, w)] : lines;
}

// The lines of the text of a question in the list
const text = (q: Question) => clip(wrap(q.text, 54), 2, 54);

function list(g: Grid, view: View, asked: Question[]) {
  const { squad, ui } = view;
  const blocking = asked.filter((q) => q.blocking).length;
  g.box(0, 2, 60, 24, ui.qfocus === "list" ? "bwhite" : "gray", `perguntas abertas · ${asked.length}`, "bwhite");
  if (blocking) {
    const seal = ` ${blocking} bloqueante `;
    g.put(58 - len(seal), 2, seal, "bwhite", { bg: "red", bold: true });
  }
  g.put(2, 24, "bloqueantes primeiro · depois por tempo restante", "gray");
  if (!asked.length) {
    g.put(2, 4, "○ nenhuma pergunta aberta", "gray");
    g.put(4, 5, "o squad não depende de você agora.", "white");
    return;
  }

  // A question that starts by line 19 fits whole above line 24: its head, its text, its
  // options or its default, its route and an empty line. With more questions than fit, the
  // first one drawn is the earliest from which the selected one still starts by line 19.
  const chosen = selected(view);
  const at = asked.findIndex((q) => q === chosen);
  let from = 0;
  while (asked.slice(from, at).reduce((y, q) => y + text(q).length + 4, 3) > 19) from++;

  let y = 3;
  for (const q of asked.slice(from)) {
    if (y > 19) break;
    const who = q.asked_by;
    if (q === chosen && ui.qfocus === "list") {
      g.bg(1, y, 58, "black");
      g.put(2, y, "▶", "bwhite", { bold: true });
    }
    g.put(4, y, qid(q.id), "bwhite", { bold: true });
    if (q.blocking) g.put(9, y, "[BLOQUEANTE]", "bred", { bold: true });
    else g.put(9, y, "timeout " + mmss(left(q, squad.now)), "byellow", { bold: true });
    const since = "há " + waited(q, squad.now);
    const head: Seg[] = [[label(who), tone(who), true], [" " + who, tone(who)], q.ticket_ref !== null && [" · ", "gray"], q.ticket_ref !== null && [q.ticket_ref, "white"]];
    g.segs(23, y, fit(head, 58 - len(since) - 24));
    g.put(58 - len(since), y++, since, "gray");
    for (const line of text(q)) g.put(4, y++, line, "bwhite");
    // Only a non-blocking question goes on with its default; any other waits for an option or a text
    if (q.blocking || q.options.length) {
      g.segs(4, y++, [["opções ", "gray"], [cut([...q.options.map((option, i) => `${i + 1} ${option}`), `${q.options.length + 1} texto`].join(" · "), 47), "white"]]);
    } else g.segs(4, y++, fit([["default ", "gray"], [q.default ?? "", "byellow", true], [`  · ${who} segue com ele`, "gray"]], 54));
    g.segs(4, y, fit([["rota ", "gray"], ...route(q), ...absorbed(q, squad).map((merged): Seg => [`  · ${merged}`, "white"])], 54));
    y += 2;
  }
}

// The columns of the text of the detail
const W = 55;

// The lines of the panel of detail: of the selected question, or of the empty list
function detail(view: View, q: Question | undefined): Line[] {
  if (!q) return [[["nenhuma pergunta aberta", "gray"]], [], [["os agentes seguem sem depender do dev.", "white"]]];
  const { squad } = view;
  const who = q.asked_by;
  const ticket = squad.tickets.find((t) => t.ticket_ref === q.ticket_ref);
  const badge: [string, Color, boolean] = q.blocking ? ["[BLOQUEANTE]", "bred", true] : ["timeout " + mmss(left(q, squad.now)), "byellow", true];
  const since = "no dev há " + waited(q, squad.now);
  const arrived = "chegou ao dev " + clock(q.reached_human_ts ?? squad.now);
  const merged = absorbed(q, squad);
  const labeled = (name: string, lines: string[]): Line[] => lines.map((line, i): Seg[] => [[i ? "        " : name, "gray"], [line, "white"]]);

  const head: Line[] = [
    [[qid(q.id) + "  ", "bwhite", true], badge, [" ".repeat(Math.max(1, W - len(qid(q.id)) - 2 - len(badge[0]) - len(since))), "white"], [since, "gray"]],
    q.ticket_ref === null
      ? [["ticket  ", "gray"], ["—", "gray"]]
      : fit([["ticket  ", "gray"], [q.ticket_ref, "bwhite", true], [(ticket?.title ? " " + ticket.title : "") + (ticket?.reworks ? ` · rework ${Math.min(ticket.reworks, 2)}/2` : ""), "white"]], W),
    fit([["thread  ", "gray"], [q.ticket_ref === null ? arrived : `${q.ticket_ref} · ${arrived}`, "white"]], W),
    [["origem  ", "gray"], [label(who) + " ", tone(who), true], [who, tone(who)], [q.blocking ? "  (só ele pausa)" : "  (segue com o default)", "gray"]],
    [["rota    ", "gray"], ...route(q)],
    ...(merged.length ? [fit([["dedup   ", "gray"], [[...merged, "mesclada pela mother"].join(" · "), "white"]], W)] : []),
  ];
  // One space after `default`, as QST-58 writes the line: the prototype has two
  const answers: Line[] =
    q.blocking || q.options.length
      ? [...q.options, null].map((option, i): Seg[] => [[` ${i + 1}  `, "bwhite", true], option === null ? ["outra resposta (texto livre)", "gray"] : [cut(option, W - 4), "white"]])
      : [fit([["default ", "gray"], [q.default ?? "", "byellow", true], [`  · aplicado em ${mmss(left(q, squad.now))} sem resposta`, "gray"]], W)];
  const does = clip(wrap(effect(q, squad), W - 8), 2, W - 8);
  // The text and the reason take what the other lines leave of the 22 of the panel
  const room = 22 - head.length - 3 - answers.length - does.length - 1;
  const said = clip(wrap(q.text, W), room - 1, W);
  const why = clip(wrap(q.why, W - 8), room - said.length, W - 8);

  return [
    ...head,
    "SEP",
    ...said.map((line): Seg[] => [[line, "bwhite", true]]),
    ...labeled("por quê ", why),
    "SEP",
    ...answers,
    "SEP",
    ...labeled("efeito  ", does),
    [["enter ", "bwhite", true], ["responder", "gray"], ["   b ", "bwhite", true], ["próxima bloqueante", "gray"]],
  ];
}

export function questions(view: View): Grid {
  const g = grid();
  chrome(g, view, "questions", KEYS);
  list(g, view, waiting(view.squad));
  const chosen = selected(view);
  g.box(60, 2, 60, 24, "gray", chosen ? `${qid(chosen.id)} · detalhe` : "detalhe", "bwhite");
  drawRows(g, 62, 3, 24, detail(view, chosen), 60, 60, "gray");
  // No line of the feed is on this screen: the footer has no ticket to count the reworks of
  stats(g, { ...view, ui: { ...view.ui, selected: null } });
  return g;
}
