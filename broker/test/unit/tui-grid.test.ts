import { expect, test } from "bun:test";
import { paint } from "../../tui/ansi.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import { START } from "../../tui/keys.ts";
import { main } from "../../tui/screens/main.ts";
import { PRICES } from "../frames/logs.ts";
import { setup } from "./helpers.ts";
import { age, clock, cut, grid, len, mmss, pad, wrap, type Grid } from "../../tui/grid.ts";

test("TUI-19: the grid is 120 by 40 cells of character, color, background and bold", () => {
  const g = grid();
  expect(g.rows.length).toBe(40);
  expect(g.rows.every((row) => row.length === 120)).toBe(true);
  expect(g.rows[39]![119]).toEqual({ ch: " ", fg: "white", bg: null, bold: false });
  expect(g.text()).toEqual(Array(40).fill(""));
});

test("TUI-19: put writes the character, the color, the background and the bold of each cell", () => {
  const g = grid(10, 2);
  expect(g.put(2, 1, "⚠ok", "bred", { bg: "red", bold: true })).toBe(5);
  expect(g.rows[1]![2]).toEqual({ ch: "⚠", fg: "bred", bg: "red", bold: true });
  expect(g.rows[1]![4]).toEqual({ ch: "k", fg: "bred", bg: "red", bold: true });
  expect(g.rows[1]![5]).toEqual({ ch: " ", fg: "white", bg: null, bold: false });
  // White by default; the background stays unless one is given, the bold does not
  expect(g.put(3, 1, 7)).toBe(4);
  expect(g.rows[1]![3]).toEqual({ ch: "7", fg: "white", bg: "red", bold: false });
});

test("TUI-19: put cuts what falls outside the grid and still returns the next column", () => {
  const g = grid(6, 2);
  expect(g.put(4, 0, "abcd", "yellow")).toBe(8);
  expect(g.put(-2, 1, "wxyz")).toBe(2);
  expect(g.put(1, 2, "below")).toBe(6);
  expect(g.put(1, -1, "above")).toBe(6);
  expect(g.text()).toEqual(["    ab", "yz"]);
});

// What the `Grid` of the prototype gives for the same calls
test("TUI-19: box, sep, segs, bg, clear and dim draw what the prototype draws", () => {
  const g = grid(24, 8);
  g.box(0, 0, 24, 6, "gray", "agentes", "bwhite");
  g.sep(0, 2, 24, "gray");
  expect(g.put(2, 1, "● w1 [working]", "green", { bold: true })).toBe(16);
  expect(g.segs(2, 3, [["⚠ ", "bred"], null, ["TKT-12", "white", true], [""], [" ok"]])).toBe(13);
  g.bg(2, 3, 5, "red");
  g.put(20, 4, "cortado aqui", "yellow", { bg: "blue" });
  g.put(-2, 7, "abcdef");
  g.box(1, 6, 6, 2, "cyan", undefined, undefined, { bold: true });
  g.put(10, 6, "claro", "bgreen", { bold: true, bg: "black" });
  g.clear(1, 1, 3, 1);
  g.clear(22, 4, 5, 9);
  g.dim(7, 7);
  g.bg(22, 7, 9, "magenta");

  expect(g.text()).toEqual([
    "┌─ agentes ────────────┐",
    "│   w1 [working]       │",
    "├──────────────────────┤",
    "│ ⚠ TKT-12 ok          │",
    "│                   co",
    "└─────────────────────",
    " ┌────┐   claro",
    "c└────┘",
  ]);
  const cell = (x: number, y: number) => g.rows[y]![x]!;
  // box: the frame in its color, the title in its own color and bold
  expect(cell(0, 0)).toEqual({ ch: "┌", fg: "gray", bg: null, bold: false });
  expect(cell(3, 0)).toEqual({ ch: "a", fg: "bwhite", bg: null, bold: true });
  expect(cell(1, 6)).toEqual({ ch: "┌", fg: "cyan", bg: null, bold: true });
  // sep
  expect(cell(0, 2)).toEqual({ ch: "├", fg: "gray", bg: null, bold: false });
  // clear: the cell goes back to an empty one; the next one is untouched
  expect(cell(2, 1)).toEqual({ ch: " ", fg: "white", bg: null, bold: false });
  expect(cell(4, 1)).toEqual({ ch: "w", fg: "green", bg: null, bold: true });
  expect(cell(23, 4)).toEqual({ ch: " ", fg: "white", bg: null, bold: false });
  // segs: one color and one bold per segment; bg: only the background, only n cells
  expect(cell(2, 3)).toEqual({ ch: "⚠", fg: "bred", bg: "red", bold: false });
  expect(cell(4, 3)).toEqual({ ch: "T", fg: "white", bg: "red", bold: true });
  expect(cell(7, 3)).toEqual({ ch: "-", fg: "white", bg: null, bold: true });
  expect(cell(10, 3)).toEqual({ ch: " ", fg: "white", bg: null, bold: false });
  // dim: gray, no background and no bold, only on its lines
  expect(cell(0, 7)).toEqual({ ch: "c", fg: "gray", bg: null, bold: false });
  expect(cell(2, 7)).toEqual({ ch: "─", fg: "gray", bg: null, bold: false });
  expect(cell(10, 6)).toEqual({ ch: "c", fg: "bgreen", bg: "black", bold: true });
  expect(cell(22, 7)).toEqual({ ch: " ", fg: "gray", bg: "magenta", bold: false });
});

test("TUI-19: dim without lines grays the whole grid", () => {
  const g = grid(4, 3);
  g.put(0, 0, "ab", "red", { bg: "blue", bold: true });
  g.put(0, 2, "cd", "green");
  g.dim();
  expect(g.rows[0]![0]).toEqual({ ch: "a", fg: "gray", bg: null, bold: false });
  expect(g.rows[2]![1]).toEqual({ ch: "d", fg: "gray", bg: null, bold: false });
});

test("TUI-19: cut ends a text that does not fit with …, counting characters", () => {
  expect(len("⚠ ação")).toBe(6);
  expect(cut("TKT-12 player", 6)).toBe("TKT-1…");
  expect(cut("abc", 3)).toBe("abc");
  expect(cut("⚠ ação", 5)).toBe("⚠ aç…");
  expect(cut(1234, 3)).toBe("12…");
  expect(pad("ab", 5)).toBe("ab   ");
  expect(pad("abcdefgh", 5)).toBe("abcd…");
});

test("TUI-19: wrap breaks at words, splits a word longer than the width and keeps the line breaks", () => {
  expect(wrap("uma frase curta de teste", 10)).toEqual(["uma frase", "curta de", "teste"]);
  expect(wrap("supercalifragilistico fim", 8)).toEqual(["supercal", "ifragili", "stico", "fim"]);
  expect(wrap("a\n\nb c", 5)).toEqual(["a", "", "b c"]);
});

test("TUI-19: age and mmss format seconds as the prototype does", () => {
  expect(age(0)).toBe("0s");
  expect(age(59)).toBe("59s");
  expect(age(60)).toBe("1m00s");
  expect(age(313)).toBe("5m13s");
  expect(mmss(59)).toBe("0:59");
  expect(mmss(247)).toBe("4:07");
  expect(mmss(3600)).toBe("60:00");
});

test("TUI-19: clock is the local time as HH:MM:SS", () => {
  expect(clock(new Date(2026, 9, 7, 14, 5, 9).getTime())).toBe("14:05:09");
  expect(clock(new Date(2026, 9, 7, 0, 0, 0).getTime())).toBe("00:00:00");
});

// The cells of a grid that have a mark, as `x,y`
const marked = (g: Grid): string[] => g.hits.flatMap((row, y) => row.flatMap((hit, x) => (hit ? [`${x},${y}`] : [])));

test("CLK-14: a new grid has no mark in any of its 40 by 120 cells", () => {
  const g = grid();
  expect(g.hits.length).toBe(40);
  expect(g.hits.every((row) => row.length === 120)).toBe(true);
  expect(g.hits.flat().every((hit) => hit === null)).toBe(true);
});

test("CLK-14: mark marks the cells of its rectangle and no other", () => {
  const g = grid();
  g.mark(3, 5, 4, 2, { key: "p" });
  expect(marked(g)).toEqual(["3,5", "4,5", "5,5", "6,5", "3,6", "4,6", "5,6", "6,6"]);
  expect(g.hits[5]![3]).toEqual({ key: "p" });
  expect(g.hits[6]![6]).toEqual({ key: "p" });
  // The cells around the rectangle
  expect([g.hits[4]![3], g.hits[7]![3], g.hits[5]![2], g.hits[5]![7]]).toEqual([null, null, null, null]);
});

test("CLK-14: what a mark has outside the grid is not marked, and does not throw", () => {
  const g = grid(6, 3);
  g.mark(-2, -1, 4, 3, { panel: 0 });
  g.mark(4, 2, 5, 5, { panel: 2 });
  g.mark(9, 9, 2, 2, { panel: 1 });
  g.mark(-9, 1, 3, 1, { panel: 1 });
  expect(marked(g)).toEqual(["0,0", "1,0", "0,1", "1,1", "4,2", "5,2"]);
  expect(g.hits[1]![1]).toEqual({ panel: 0 });
  expect(g.hits[2]![5]).toEqual({ panel: 2 });
  // The layer is still of 3 lines of 6 cells
  expect(g.hits.map((row) => row.length)).toEqual([6, 6, 6]);
  expect(Object.keys(g.hits[1]!)).toEqual(["0", "1", "2", "3", "4", "5"]);
});

test("CLK-14: a second mark on a cell replaces the first, with nothing left of it", () => {
  const g = grid();
  g.mark(10, 10, 4, 1, { panel: 1, wheel: "feed" });
  g.mark(12, 10, 4, 1, { key: "\x1b", modal: true });
  expect(g.hits[10]!.slice(10, 16)).toEqual([{ panel: 1, wheel: "feed" }, { panel: 1, wheel: "feed" }, { key: "\x1b", modal: true }, { key: "\x1b", modal: true }, { key: "\x1b", modal: true }, { key: "\x1b", modal: true }]);
});

test("CLK-14: clear erases the marks of its region and leaves the ones around it", () => {
  const g = grid();
  g.mark(0, 0, 120, 40, { panel: 2 });
  g.clear(18, 3, 84, 30);
  expect(g.hits.slice(3, 33).every((row) => row.slice(18, 102).every((hit) => hit === null))).toBe(true);
  expect(marked(g).length).toBe(120 * 40 - 84 * 30);
  // The cells around the four corners of the region
  for (const [x, y] of [[17, 3], [18, 2], [102, 3], [101, 2], [17, 32], [18, 33], [102, 32], [101, 33]] as const) expect(g.hits[y]![x]).toEqual({ panel: 2 });
  // A region that leaves the grid erases what it has inside
  g.clear(110, 38, 50, 50);
  expect(g.hits[38]!.slice(108, 120)).toEqual([{ panel: 2 }, { panel: 2 }, ...Array(10).fill(null)]);
  expect(g.hits[37]![119]).toEqual({ panel: 2 });
});

test("CLK-14: a mark is no field of a cell: the text and the escapes of a grid are the same with and without marks", () => {
  const draw = (g: Grid) => {
    g.box(0, 2, 28, 10, "bwhite", "agentes", "bwhite");
    g.put(1, 39, "p", "bwhite", { bold: true, bg: "black" });
    g.put(3, 39, "pausa", "gray", { bg: "black" });
    return g;
  };
  const plain = draw(grid());
  const hit = draw(grid());
  hit.mark(0, 2, 28, 10, { panel: 0 });
  hit.mark(1, 39, 7, 1, { key: "p" });
  expect(hit.text()).toEqual(plain.text());
  expect(hit.rows).toEqual(plain.rows);
  expect(Object.keys(hit.rows[39]![1]!)).toEqual(["ch", "fg", "bg", "bold"]);
  expect(paint(hit, null)).toBe(paint(plain, null));
  // And no line of one differs from the other
  expect(paint(hit, plain)).toBe("");
});

test("F4 / TUI-19: controls never become cells, including a title accepted by the broker", () => {
  const b = setup();
  try {
    b.openFeature({ title: "first\nsecond" });
    const events = b.log.after(0);
    const g = main({ squad: squad(events, b.clock.now), rows: feed(events), ui: START, project: null, down: null, prices: PRICES });
    expect(g.text()[0]).toContain("first second");
    expect(paint(g, null, new Map())).not.toContain("\n");
    expect(g.rows.flat().every((cell) => !/[\x00-\x1f\x7f-\x9f]/u.test(cell.ch))).toBe(true);
  } finally {
    b.db.close();
  }
  const controls = Array.from({ length: 160 }, (_, n) => String.fromCodePoint(n)).filter((c) => /[\x00-\x1f\x7f-\x9f]/u.test(c)).join("");
  const g = grid(controls.length + 2, 1);
  expect(g.put(0, 0, "a" + controls + "b")).toBe(controls.length + 2);
  expect(g.rows[0]!.map((c) => c.ch).join("")).toBe("a" + " ".repeat(controls.length) + "b");
});
