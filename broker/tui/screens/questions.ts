// The tab of questions: the ones that wait for the dev, in the order he should answer them.
// The layout is the one of `rQs` of the prototype; the questions come from the derived squad.

import { qid } from "../../shared/contract.ts";
import { SQUAD, type Question, type Squad } from "../../shared/derive.ts";
import { left, waiting } from "../asked.ts";
import { label } from "../feed.ts";
import { age, cut, grid, len, mmss, wrap, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { chrome, stats, tone, type Keys } from "./chrome.ts";

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

// The lines of the text of a question in the list: two at most, the second saying there is more
function text(q: Question): string[] {
  const lines = wrap(q.text, 54);
  return lines.length > 2 ? [lines[0]!, cut(`${lines[1]} …`, 54)] : lines;
}

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

export function questions(view: View): Grid {
  const g = grid();
  chrome(g, view, "questions", KEYS);
  list(g, view, waiting(view.squad));
  // No line of the feed is on this screen: the footer has no ticket to count the reworks of
  stats(g, { ...view, ui: { ...view.ui, selected: null } });
  return g;
}
