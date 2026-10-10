// The modal of answer of a question, over the tab of questions in gray: the context, what
// was asked, the options to choose from or the field of the text, and what an answer does.
// Ported from `qModal`, `drawModal` and `drawInput` of the prototype; the question comes
// from the derived squad.

import { qid } from "../../shared/contract.ts";
import { effect, left } from "../asked.ts";
import { cut, len, mmss, wrap, type Color, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { drawKeys, type Line } from "./chrome.ts";
import { absorbed, arrived, clip, fit, labeled, route, ticket, waited } from "./questions.ts";

// The box of the modal: 82 columns from column 19, with 76 of text
const X = 19;
const BOX = 82;
const W = 76;

// What the modal has from the top down: a line, a separator, a line of the choice mode or
// the field of the text, which takes `rows` lines
type Item = Line | { option: number; label: string; chosen: boolean; other: boolean } | { field: string; rows: number };

const rows = (item: Item): number => (item !== "SEP" && "rows" in item ? item.rows : 1);

// The field of `w` columns: with 3 rows, one line with the end of the text; with more, its
// last lines. The cursor comes after the text, and the count of characters on the border.
function drawInput(g: Grid, x: number, y: number, w: number, h: number, text: string) {
  g.box(x, y, w, h, "bcyan");
  const inner = w - 4;
  const lines = h > 3 ? wrap(text, inner).slice(2 - h) : [len(text) + 1 > inner ? "…" + [...text].slice(2 - inner).join("") : text];
  lines.forEach((line, i) => {
    const end = g.put(x + 2, y + 1 + i, line, "bwhite");
    if (i === lines.length - 1) g.put(end, y + 1 + i, "█", "bwhite");
  });
  const count = ` ${len(text)} chars `;
  g.put(x + w - 2 - len(count), y + h - 1, count, "gray");
}

// The box centered in the 40 lines, over an empty margin, and its items
function drawModal(g: Grid, items: Item[], title: string, tone: Color) {
  const h = items.reduce((sum, item) => sum + rows(item), 2);
  let y = Math.floor((40 - h) / 2);
  g.clear(X - 1, y - 1, BOX + 2, h + 2);
  g.box(X, y, BOX, h, "bwhite", title, tone);
  y++;
  const x = X + 3;
  for (const item of items) {
    if (item === "SEP") g.sep(X, y, BOX, "bwhite");
    else if (Array.isArray(item)) g.segs(x, y, fit(item, BOX - 5));
    else if ("field" in item) drawInput(g, x, y, BOX - 6, item.rows, item.field);
    else {
      if (item.chosen) {
        g.bg(X + 1, y, BOX - 2, "black");
        g.put(x, y, "▶", "bwhite", { bold: true });
      }
      g.put(x + 2, y, item.option + 1, "bwhite", { bold: true });
      g.put(x + 5, y, cut(item.label, W - 4), item.chosen ? "bwhite" : item.other ? "gray" : "white", { bold: item.chosen });
    }
    y += rows(item);
  }
}

// Draws over `g`, the tab of questions, the modal of `view.ui.modal`, and the keys of its mode
export function answer(g: Grid, view: View): Grid {
  const { squad, ui } = view;
  const q = squad.questions.find((other) => other.id === ui.modal?.question);
  // Any question of the open feature, not only the ones that wait: a closed one has the modal of its refusal
  if (!ui.modal || !q) return g;
  const { choice, text, expanded } = ui.modal;
  const who = q.asked_by;
  const merged = absorbed(q, squad);
  const choosing = choice !== null && q.options.length > 0;
  // Only a non-blocking question has a deadline, after which its default applies
  const fallback = q.blocking ? null : q.default;

  const context: Item[] = [
    [["contexto", "gray"]],
    ticket(q, squad),
    [["thread  ", "gray"], [`${arrived(q, squad.now)} · há ${waited(q, squad.now)}`, "white"]],
    [["rota    ", "gray"], ...route(q, "você"), merged.length > 0 && [`   (${merged.join(" · ")})`, "gray"]],
  ];
  const asks: Seg[] = [[who + " pergunta", "gray"], ["   "], q.blocking ? [`[BLOQUEANTE] só ${who} está pausado`, "bred", true] : [`não-bloqueante · ${who} segue com o default`, "byellow"]];
  const applies: Item[] = fallback === null ? [] : [[["default ", "gray"], [fallback, "byellow", true], [`  · aplicado em ${mmss(left(q, squad.now))} se você não responder`, "gray"]]];
  const body: Item[] = choosing
    ? [...q.options, "outra resposta…"].map((label, i) => ({ option: i, label, chosen: i === choice, other: i === q.options.length }))
    : [
        ...applies,
        [["resposta", "gray"], [expanded ? "  (expandido · ctrl+e recolhe)" : "  (uma linha · ctrl+e expande)", "gray"]],
        { field: text, rows: expanded ? 8 : 3 },
        [["⚠ a resposta fica gravada no log e não pode ser apagada", "byellow"]],
      ];
  const does = clip(wrap(effect(q, squad), W - 8), 2, W - 8);
  // The modal and its margin have the 36 lines between the tabs and the tokens: the text and
  // the reason take what the other lines leave of the 32 inside the box
  const room = 32 - context.length - 4 - body.reduce((sum, item) => sum + rows(item), 0) - does.length;
  const said = clip(wrap(q.text, W), room - 1, W);
  const why = clip(wrap(q.why, W - 8), room - said.length, W - 8);

  g.dim();
  drawModal(
    g,
    [...context, ...labeled("por quê ", why), "SEP", asks, ...said.map((line): Seg[] => [[line, "bwhite", true]]), [], ...body, "SEP", ...labeled("efeito  ", does)],
    `? responder ${qid(q.id)} · ${q.blocking ? "BLOQUEANTE" : "timeout " + mmss(left(q, squad.now))}`,
    q.blocking ? "bred" : "byellow"
  );
  drawKeys(
    g,
    39,
    choosing
      ? [[`1-${q.options.length + 1}`, "escolher"], ["↑↓", "mover"], ["enter", "confirmar"], ["esc", "cancelar"]]
      : [["enter", "enviar"], ["ctrl+e", expanded ? "recolher" : "expandir"], ["ctrl+u", "limpar"], ["esc", "cancelar"]]
  );
  return g;
}
