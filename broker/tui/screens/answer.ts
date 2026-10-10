// The modal of answer of a question, over the tab of questions in gray: the context, what
// was asked, the options to choose from and what an answer does. Ported from `qModal` and
// `drawModal` of the prototype; the question comes from the derived squad.

import { qid } from "../../shared/contract.ts";
import { effect, left } from "../asked.ts";
import { mmss, wrap, type Color, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { drawKeys, type Line } from "./chrome.ts";
import { absorbed, arrived, fit, labeled, route, ticket, waited } from "./questions.ts";

// The box of the modal: 82 columns from column 19, with 76 of text
const X = 19;
const BOX = 82;
const W = 76;

// What the modal has from the top down: a line, a separator or a line of the choice mode
type Item = Line | { option: number; label: string; chosen: boolean; other: boolean };

// The box centered in the 40 lines, over an empty margin, and its items
function drawModal(g: Grid, items: Item[], title: string, tone: Color) {
  const h = items.length + 2;
  let y = Math.max(2, Math.floor((40 - h) / 2));
  g.clear(X - 1, y - 1, BOX + 2, h + 2);
  g.box(X, y, BOX, h, "bwhite", title, tone);
  const x = X + 3;
  for (const item of items) {
    y++;
    if (item === "SEP") g.sep(X, y, BOX, "bwhite");
    else if (Array.isArray(item)) g.segs(x, y, fit(item, BOX - 5));
    else {
      if (item.chosen) {
        g.bg(X + 1, y, BOX - 2, "black");
        g.put(x, y, "▶", "bwhite", { bold: true });
      }
      g.put(x + 2, y, item.option + 1, "bwhite", { bold: true });
      g.put(x + 5, y, item.label, item.chosen ? "bwhite" : item.other ? "gray" : "white", { bold: item.chosen });
    }
  }
}

// Draws over `g`, the tab of questions, the modal of `view.ui.modal`, and the keys of its mode
export function answer(g: Grid, view: View): Grid {
  const { squad, ui } = view;
  const q = squad.questions.find((other) => other.id === ui.modal?.question);
  // Any question of the open feature, not only the ones that wait: a closed one has the modal of its refusal
  if (!ui.modal || !q) return g;
  const who = q.asked_by;
  const merged = absorbed(q, squad);
  const { choice } = ui.modal;
  const choosing = choice !== null && q.options.length > 0;

  const items: Item[] = [
    [["contexto", "gray"]],
    ticket(q, squad),
    [["thread  ", "gray"], [`${arrived(q, squad.now)} · há ${waited(q, squad.now)}`, "white"]],
    [["rota    ", "gray"], ...route(q, "você"), merged.length > 0 && [`   (${merged.join(" · ")})`, "gray"]],
    ...labeled("por quê ", wrap(q.why, W - 8)),
    "SEP",
    [[who + " pergunta", "gray"], ["   "], q.blocking ? [`[BLOQUEANTE] só ${who} está pausado`, "bred", true] : [`não-bloqueante · ${who} segue com o default`, "byellow"]],
    ...wrap(q.text, W).map((line): Seg[] => [[line, "bwhite", true]]),
    [],
    ...(choosing ? [...q.options, "outra resposta…"].map((label, i) => ({ option: i, label, chosen: i === choice, other: i === q.options.length })) : []),
    "SEP",
    ...labeled("efeito  ", wrap(effect(q, squad), W - 8)),
  ];
  g.dim();
  drawModal(g, items, `? responder ${qid(q.id)} · ${q.blocking ? "BLOQUEANTE" : "timeout " + mmss(left(q, squad.now))}`, q.blocking ? "bred" : "byellow");
  if (choosing) drawKeys(g, 39, [[`1-${q.options.length + 1}`, "escolher"], ["↑↓", "mover"], ["enter", "confirmar"], ["esc", "cancelar"]]);
  return g;
}
