// What the three modals share: the box over the dimmed screen, with its items from the top
// down, the field of a text and the box of the preview of a command. Ported from
// `drawModal`, `drawInput` and `drawPre` of the prototype.

import { cut, len, wrap, type Color, type Grid } from "../grid.ts";
import type { Line } from "./chrome.ts";
import { fit } from "./questions.ts";

// A line of the preview: the number of its line of the text, none for a continuation
export type PreLine = { n: number | null; t: string };

// What a modal has from the top down: a line, a separator, a line of the choice mode of the
// modal of answer, the field of a text, or the box of a preview. The last two take `rows` lines.
export type Item =
  | Line
  | { option: number; label: string; chosen: boolean; other: boolean }
  | { field: string; rows: number; red: boolean }
  | { pre: PreLine[]; rows: number; offset: number; dim: boolean; title: string };

export const rows = (item: Item): number => (item !== "SEP" && "rows" in item ? item.rows : 1);

// The field of `w` columns: with 3 rows, one line with the end of the text; with more, its
// last lines. The cursor comes after the text, and the count of characters on the border.
export function drawInput(g: Grid, x: number, y: number, w: number, h: number, text: string, color: Color) {
  g.box(x, y, w, h, color);
  const inner = w - 4;
  const lines = h > 3 ? wrap(text, inner).slice(2 - h) : [len(text) + 1 > inner ? "…" + [...text].slice(2 - inner).join("") : text];
  lines.forEach((line, i) => {
    const end = g.put(x + 2, y + 1 + i, line, "bwhite");
    if (i === lines.length - 1) g.put(end, y + 1 + i, "█", "bwhite");
  });
  const count = ` ${len(text)} chars `;
  g.put(x + w - 2 - len(count), y + h - 1, count, "gray");
}

// The box of the preview: the lines from `offset` on a black background, each with the number
// of its line in 3 columns or `·` for a continuation, and, when not all fit, which ones are
// in view on the bottom border, in yellow while there is more below.
function drawPre(g: Grid, x: number, y: number, w: number, item: Extract<Item, { pre: PreLine[] }>) {
  const color: Color = item.dim ? "gray" : "bwhite";
  g.box(x, y, w, item.rows, color, item.title, color);
  const shown = item.rows - 2;
  for (let j = 0; j < shown; j++) {
    g.bg(x + 1, y + 1 + j, w - 2, "black");
    const line = item.pre[item.offset + j];
    if (!line) continue;
    g.put(x + 1, y + 1 + j, line.n ? String(line.n).padStart(3) + " " : "  · ", "gray", { bg: "black" });
    g.put(x + 5, y + 1 + j, line.t, color, { bold: !item.dim, bg: "black" });
  }
  if (item.pre.length > shown) {
    const end = item.offset + shown;
    const more = end < item.pre.length;
    const label = ` ${item.offset + 1}–${end} de ${item.pre.length}${more ? " · ▼ mais abaixo " : " · fim "}`;
    g.put(x + w - 2 - len(label), y + item.rows - 1, label, more ? "byellow" : "bgreen", { bold: true });
  }
}

// The box of `w` columns from column `x`, centered in the 40 lines and never above line 2,
// over an empty margin, with its title, the color of its border and the tag on its top
// border. Returns the line of each item. With the modal open every mark is of the modal,
// over the ones of the screen: a click outside the box is esc, also on the empty margin
// around it, and inside it only a line of the choice mode is clicked.
export function drawModal(g: Grid, x: number, w: number, items: Item[], title: string, tone: Color, border: Color, tag?: string): number[] {
  const h = items.reduce((sum, item) => sum + rows(item), 2);
  let y = Math.max(2, Math.floor((40 - h) / 2));
  g.clear(x - 1, y - 1, w + 2, h + 2);
  g.mark(0, 0, 120, 39, { modal: true, key: "\x1b" });
  g.mark(x, y, w, h, { modal: true });
  g.box(x, y, w, h, border, title, tone, { bold: border !== "bwhite" });
  if (tag) g.put(x + w - 3 - len(tag), y, tag, "bwhite", { bg: "black", bold: true });
  y++;
  const tx = x + 3;
  const at: number[] = [];
  for (const item of items) {
    at.push(y);
    if (item === "SEP") g.sep(x, y, w, border);
    else if (Array.isArray(item)) g.segs(tx, y, fit(item, w - 5));
    else if ("field" in item) drawInput(g, tx, y, w - 6, item.rows, item.field, item.red ? "bred" : "bcyan");
    else if ("pre" in item) drawPre(g, tx, y, w - 6, item);
    else {
      if (item.chosen) {
        g.bg(x + 1, y, w - 2, "black");
        g.put(tx, y, "▶", "bwhite", { bold: true });
      }
      g.put(tx + 2, y, item.option + 1, "bwhite", { bold: true });
      g.put(tx + 5, y, cut(item.label, w - 10), item.chosen ? "bwhite" : item.other ? "gray" : "white", { bold: item.chosen });
      g.mark(x + 1, y, w - 2, 1, { modal: true, option: item.option });
    }
    y += rows(item);
  }
  return at;
}
