import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { clock, grid, len, type Grid, type Hit } from "../../tui/grid.ts";
import { chrome, drawKeys, MAIN_KEYS, stats, type Keys } from "../../tui/screens/chrome.ts";
import { main } from "../../tui/screens/main.ts";
import { thread } from "../../tui/screens/thread.ts";
import type { Ui, View } from "../../tui/view.ts";
import { frameView } from "../frames/view.ts";

// The marks a screen leaves for the mouse. A cell is found in the text the screen drew: the
// column where a text starts on its line, never a number of the code of the screen.

// The column where `text` starts on line y of a drawing, which has it once
function at(g: Grid, y: number, text: string): number {
  const line = g.rows[y]!.map((cell) => cell.ch);
  const want = [...text];
  const found = line.flatMap((_, x) => (want.every((ch, i) => line[x + i] === ch) ? [x] : []));
  if (found.length !== 1) throw new Error(`line ${y} has "${text}" ${found.length} times: ${line.join("").trimEnd()}`);
  return found[0]!;
}

// The mark of a cell, and the marks of the cells of a line from one column to another
const hit = (g: Grid, x: number, y: number): Hit | null => g.hits[y]![x] ?? null;
const hits = (g: Grid, y: number, from: number, to: number): (Hit | null)[] => g.hits[y]!.slice(from, to + 1);

// The columns of a line that have a mark
const marked = (g: Grid, y: number): number[] => g.hits[y]!.flatMap((mark, x) => (mark ? [x] : []));

// `n` cells with the same mark
const all = (n: number, mark: Hit | null): (Hit | null)[] => Array(n).fill(mark);

// The view of a frame with the state of the screen changed
function view(frame: string, ui: Partial<Ui> = {}, change?: (events: SquadEvent[]) => SquadEvent[]): View {
  const v = frameView(frame, change);
  return { ...v, ui: { ...v.ui, ...ui } };
}

// Ten more questions with the dev, as the mother forwarded Q-08 in 428: twelve with Q-07 and Q-08
const twelve = (events: SquadEvent[]): SquadEvent[] => [
  ...events,
  ...Array.from({ length: 10 }, (_, i) => ({ ...events.find((e) => e.seq === 428)!, seq: 900 + i, question_id: 20 + i }) as SquadEvent),
];

// Lines 0, 1, 38 and 39 of a screen
type Tab = Parameters<typeof chrome>[2];
function bars(v: View, tab: Tab = "main"): Grid {
  const g = grid();
  chrome(g, v, tab, MAIN_KEYS);
  stats(g, v);
  return g;
}

const TABS = [
  ["1", "1 principal"],
  ["2", "2 topologia"],
  ["3", "3 thread"],
  ["4", "4 perguntas"],
  ["?", "? ajuda"],
] as const;

// A tab is its key and its name with a space at each side, and one empty cell between two tabs
for (const tab of ["main", "topology", "thread", "questions", "help"] as const) {
  test(`CLK-18: on the screen of the tab ${tab}, each tab has its key from its first cell to its last, and the cell between two tabs has no mark`, () => {
    // In frame 23a no question is with the dev: the fourth tab has no count
    const g = bars(view("23a"), tab);
    for (const [key, label] of TABS) {
      const first = at(g, 1, label) - 1;
      const last = at(g, 1, label) + len(label);
      expect(hits(g, 1, first, last)).toEqual(all(len(label) + 2, { key }));
      expect([hit(g, first - 1, 1), hit(g, last + 1, 1)]).toEqual([null, null]);
    }
  });
}

for (const [frame, change, label] of [["01", undefined, "4 perguntas 2"], ["01", twelve, "4 perguntas 12"]] as const) {
  test(`CLK-18: the count of "${label}" has the key of its tab, and the tab after it its own`, () => {
    for (const tab of ["main", "questions"] as const) {
      const g = bars(view(frame, {}, change), tab);
      const first = at(g, 1, label) - 1;
      const last = at(g, 1, label) + len(label);
      expect(hits(g, 1, first, last)).toEqual(all(len(label) + 2, { key: "4" }));
      // The last digit of the count
      expect(g.rows[1]![last - 1]!.ch).toBe(label.at(-1)!);
      expect([hit(g, first - 1, 1), hit(g, last + 1, 1)]).toEqual([null, null]);
      expect(hit(g, at(g, 1, "? ajuda") - 1, 1)).toEqual({ key: "?" });
      expect(at(g, 1, "? ajuda") - 1).toBe(last + 2);
    }
  });
}

for (const [frame, change, count] of [["01", undefined, "? 2"], ["23a", undefined, "? 0"], ["01", twelve, "? 12"]] as const) {
  test(`CLK-23: the counter "${count}" of line 0 has the key 4 in its cells, its two spaces too, and no other cell of the line has a mark`, () => {
    const g = bars(view(frame, {}, change));
    const first = at(g, 0, count) - 1;
    const last = at(g, 0, count) + len(count);
    expect(hits(g, 0, first, last)).toEqual(all(len(count) + 2, { key: "4" }));
    expect([hit(g, first - 1, 0), hit(g, last + 1, 0)]).toEqual([null, null]);
    expect(marked(g, 0)).toEqual(Array.from({ length: len(count) + 2 }, (_, i) => first + i));
  });
}

test("CLK-23: the cells of the counter are the ones line 0 draws on red when a question blocks", () => {
  const g = bars(view("01"));
  expect(marked(g, 0)).toEqual(g.rows[0]!.flatMap((cell, x) => (cell.bg === "red" ? [x] : [])));
});

// The cells of line 1 after the tabs: the ones of the seals
const afterTabs = (g: Grid): number[] => marked(g, 1).filter((x) => x > at(g, 1, "? ajuda") + len("? ajuda"));

for (const [frame, seal] of [["19a", "⚠ 2 gates pendentes · g"], ["18a", "⚠ gate G-01 pendente · g"], ["22g", "⚠ gate G-02 pendente · g"]] as const) {
  test(`CLK-36: in frame ${frame} the seal of the gate has the key g in every cell, and the cells at its sides have no mark`, () => {
    const g = bars(view(frame));
    const first = at(g, 1, seal);
    const last = first + len(seal) - 1;
    expect(hits(g, 1, first, last)).toEqual(all(len(seal), { key: "g" }));
    expect([hit(g, first - 1, 1), hit(g, last + 1, 1)]).toEqual([null, null]);
  });
}

for (const [frame, seal] of [["14", "⚠ permissão w1 · x"], ["22c", "⚠ 2 permissões · x"], ["22g", "⚠ permissão jdg · x"]] as const) {
  test(`CLK-37: in frame ${frame} the seal of the permission has the key x in every cell, and the cells at its sides have no mark`, () => {
    const g = bars(view(frame));
    const first = at(g, 1, seal);
    const last = first + len(seal) - 1;
    expect(hits(g, 1, first, last)).toEqual(all(len(seal), { key: "x" }));
    expect([hit(g, first - 1, 1), hit(g, last + 1, 1)]).toEqual([null, null]);
  });
}

test("CLK-36, CLK-37: with the two seals in frame 22g, the three cells between them have no mark", () => {
  const g = bars(view("22g"));
  const left = at(g, 1, "⚠ permissão jdg · x") + len("⚠ permissão jdg · x");
  expect(at(g, 1, "⚠ gate G-02 pendente · g")).toBe(left + 3);
  expect(hits(g, 1, left, left + 2)).toEqual([null, null, null]);
  expect(afterTabs(g).length).toBe(len("⚠ permissão jdg · x") + len("⚠ gate G-02 pendente · g"));
});

for (const [frame, seal] of [["10", "bloqueado"], ["13a", "offline"], ["23a", "parado"], ["15a", "escalado"]] as const) {
  test(`CLK-38: in frame ${frame} the seal of who is ${seal} has no mark in any cell`, () => {
    const g = bars(view(frame));
    // The seal is at the right of line 1, and no cell after the tabs has a mark
    expect(at(g, 1, seal)).toBeGreaterThan(66);
    expect(afterTabs(g)).toEqual([]);
  });
}

const COST = [
  ["feature", "the tokens of the feature", view("01")],
  ["sessão", "the tokens of the session", view("01", { scope: "session" })],
  ["sessão", "no feature open", view("09a")],
] as const;

for (const [scope, what, v] of COST) {
  test(`CLK-39: with ${what}, line 38 has the key t from │ to the end of est., and in no other cell`, () => {
    const g = bars(v);
    const first = at(g, 38, "│");
    const last = at(g, 38, "est.") + len("est.") - 1;
    expect(g.text()[38]!.slice(first, last + 1)).toMatch(new RegExp(`^│ ${scope} ≈\\$\\d+\\.\\d\\d est\\.$`));
    expect(hits(g, 38, first, last)).toEqual(all(last - first + 1, { key: "t" }));
    expect(marked(g, 38)).toEqual(Array.from({ length: last - first + 1 }, (_, i) => first + i));
    // The tokens at the left, the cells at the sides of the cost and the right side of the line
    const end = g.text()[38]!.length - 1;
    expect(end).toBeGreaterThan(last + 1);
    expect([hit(g, at(g, 38, "mot"), 38), hit(g, first - 1, 38), hit(g, last + 1, 38), hit(g, end, 38)]).toEqual([null, null, null, null]);
  });
}

const UP = "\x1b[A";
const DOWN = "\x1b[B";

// A line of keys alone on line 39
function keyLine(keys: Keys, modal?: boolean): Grid {
  const g = grid();
  drawKeys(g, 39, keys, modal);
  return g;
}

// Each simple shortcut the screens draw, and the key the terminal sends for it
const SIMPLE: [label: string, does: string, key: string][] = [
  ["tab", "painel", "\t"],
  ["enter", "abrir", "\r"],
  ["esc", "voltar", "\x1b"],
  ["b", "bloqueante", "b"],
  ["g", "gate", "g"],
  ["x", "permissão", "x"],
  ["p", "pausa", "p"],
  ["h", "histórico", "h"],
  ["?", "ajuda", "?"],
  ["q", "sair", "q"],
  ["ctrl+e", "expandir", "\x05"],
  ["ctrl+u", "limpar", "\x15"],
];

for (const [label, does, key] of SIMPLE) {
  test(`CLK-33: the shortcut "${label} ${does}" has the key ${JSON.stringify(key)} in the cells of its key and of its description, and not in the spaces around them`, () => {
    const g = keyLine([["1-4", "telas"], [label, does], ["j/k", "mover"]]);
    const first = at(g, 39, `${label} ${does}`);
    const space = first + len(label);
    const last = space + len(does);
    expect(hits(g, 39, first, space - 1)).toEqual(all(len(label), { key }));
    expect(hit(g, space, 39)).toBeNull();
    expect(hits(g, 39, space + 1, last)).toEqual(all(len(does), { key }));
    // The three spaces before the shortcut and the three after it
    expect(hits(g, 39, first - 3, first - 1)).toEqual([null, null, null]);
    expect(hits(g, 39, last + 1, last + 3)).toEqual([null, null, null]);
  });
}

for (const [label, does, keys] of [["j/k", "mover", ["j", null, "k"]], ["[ ]", "ticket ant/próx", ["[", null, "]"]], ["↑↓", "mover", [UP, DOWN]]] as const) {
  test(`CLK-34: in the shortcut "${label} ${does}" each character of a key has its key, and the separator and the description have no mark`, () => {
    const g = keyLine([["1-4", "telas"], [label, does], ["q", "sair"]]);
    const first = at(g, 39, `${label} ${does}`);
    expect(hits(g, 39, first, first + len(label) - 1)).toEqual(keys.map((key) => (key === null ? null : { key })));
    // The space after the keys, the description and the three spaces after it
    expect(hits(g, 39, first + len(label), first + len(label) + len(does) + 3)).toEqual(all(len(does) + 4, null));
    expect(hit(g, first - 1, 39)).toBeNull();
  });
}

test("CLK-35: a shortcut of a range has no mark in any cell, and neither has a label the screens do not have", () => {
  expect(marked(keyLine([["1-4", "telas"], ["1-3", "escolher"], ["1-9", "escolher"]]), 39)).toEqual([]);
  expect(marked(keyLine([["a", "aprovar"], ["shift+tab", "voltar"], ["k/j", "mover"], ["toString", "nada"]]), 39)).toEqual([]);
  // And it takes no mark from the shortcuts next to it
  const g = keyLine([["1-4", "telas"], ["q", "sair"]]);
  expect(marked(g, 39)).toEqual([at(g, 39, "q sair"), ...Array.from({ length: 4 }, (_, i) => at(g, 39, "sair") + i)]);
});

test("CLK-45: with the modal open every mark of the line of keys says so, and without it none does", () => {
  // The keys of the three modes of the modal of answer: choice, text and refused
  const choice = keyLine([["1-4", "escolher"], ["↑↓", "mover"], ["enter", "confirmar"], ["esc", "cancelar"]], true);
  expect(hits(choice, 39, at(choice, 39, "↑↓"), at(choice, 39, "↑↓") + 1)).toEqual([{ modal: true, key: UP }, { modal: true, key: DOWN }]);
  expect(hits(choice, 39, at(choice, 39, "enter"), at(choice, 39, "enter") + 4)).toEqual(all(5, { modal: true, key: "\r" }));
  expect(hits(choice, 39, at(choice, 39, "confirmar"), at(choice, 39, "confirmar") + 8)).toEqual(all(9, { modal: true, key: "\r" }));
  expect(hits(choice, 39, at(choice, 39, "cancelar"), at(choice, 39, "cancelar") + 7)).toEqual(all(8, { modal: true, key: "\x1b" }));
  const text = keyLine([["enter", "enviar"], ["ctrl+e", "expandir"], ["ctrl+u", "limpar"], ["esc", "cancelar"]], true);
  expect(hit(text, at(text, 39, "enviar"), 39)).toEqual({ modal: true, key: "\r" });
  expect(hit(text, at(text, 39, "ctrl+e"), 39)).toEqual({ modal: true, key: "\x05" });
  expect(hit(text, at(text, 39, "limpar") + 5, 39)).toEqual({ modal: true, key: "\x15" });
  const refused = keyLine([["esc", "fechar"]], true);
  expect(marked(refused, 39)).toEqual([1, 2, 3, 5, 6, 7, 8, 9, 10].map((i) => at(refused, 39, "esc fechar") - 1 + i));
  for (const g of [choice, text, refused]) expect(marked(g, 39).every((x) => hit(g, x, 39)!.modal === true)).toBe(true);
  // The same keys with no modal
  const plain = keyLine([["enter", "enviar"], ["esc", "cancelar"]]);
  expect(marked(plain, 39).map((x) => hit(plain, x, 39))).toEqual([...all(11, { key: "\r" }), ...all(11, { key: "\x1b" })]);
});

test("CLK-33: a line of keys drawn over another leaves no mark of the one before", () => {
  const g = bars(view("01"));
  const pause = at(g, 39, "p pausa");
  expect(hit(g, pause, 39)).toEqual({ key: "p" });
  expect(hit(g, at(g, 39, "pausa") + 4, 39)).toEqual({ key: "p" });
  drawKeys(g, 39, [["esc", "fechar"]], true);
  expect(marked(g, 39).map((x) => hit(g, x, 39))).toEqual(all(9, { modal: true, key: "\x1b" }));
  expect(hit(g, pause, 39)).toBeNull();
  // Only its own line
  expect(hit(g, at(g, 38, "│"), 38)).toEqual({ key: "t" });
});

// The columns of line y that draw a character
const cols = (g: Grid, y: number, ch: string): number[] => g.rows[y]!.flatMap((cell, x) => (cell.ch === ch ? [x] : []));

// The cells of a drawing whose mark has a field, as `x,y`
const having = (g: Grid, field: keyof Hit): string[] => g.hits.flatMap((row, y) => row.flatMap((mark, x) => (mark?.[field] !== undefined ? [`${x},${y}`] : [])));

// The cells of a rectangle, as `x,y`
const rect = (x1: number, x2: number, y1: number, y2: number): string[] =>
  Array.from({ length: y2 - y1 + 1 }, (_, j) => Array.from({ length: x2 - x1 + 1 }, (_, i) => `${x1 + i},${y1 + j}`)).flat();

// The text a line draws from one column to another
const textOf = (g: Grid, y: number, from: number, to: number): string => g.rows[y]!.slice(from, to + 1).map((cell) => cell.ch).join("");

// The first and the last column of each of the `n` boxes a screen has side by side between the
// tabs and the tokens, from left to right: the corners line 2 and line 37 draw. The main
// screen has three.
function boxes(g: Grid, n = 3): [left: number, right: number][] {
  const [left, right] = [cols(g, 2, "┌"), cols(g, 2, "┐")];
  expect([cols(g, 37, "└"), cols(g, 37, "┘")]).toEqual([left, right]);
  expect([left.length, right.length]).toEqual([n, n]);
  return left.map((x, i) => [x, right[i]!]);
}

for (const frame of ["01", "09a", "28a"]) {
  test(`CLK-19: in frame ${frame} every cell of each box of the main screen has its panel, its four corners too, and lines 0, 1, 38 and 39 have none`, () => {
    const g = main(view(frame));
    const [agents, feed, detail] = boxes(g);
    const corners = ([left, right]: [number, number]) => [hit(g, left, 2), hit(g, right, 2), hit(g, left, 37), hit(g, right, 37)];
    expect(corners(agents!)).toEqual(all(4, { panel: 0 }));
    expect(corners(feed!)).toEqual(all(4, { panel: 1, wheel: "feed" }));
    expect(corners(detail!)).toEqual(all(4, { panel: 2 }));
    boxes(g).forEach(([left, right], panel) => {
      for (let y = 2; y <= 37; y++) expect(hits(g, y, left, right).map((mark) => mark?.panel)).toEqual(Array(right - left + 1).fill(panel));
    });
    expect(having(g, "panel").length).toBe(120 * 36);
    for (const y of [0, 1, 38, 39]) expect(g.hits[y]!.filter((mark) => mark?.panel !== undefined)).toEqual([]);
  });

  test(`CLK-28: in frame ${frame} every cell of the box of the feed has the wheel of the feed, and no cell of the other two boxes has a wheel`, () => {
    const g = main(view(frame));
    const [left, right] = boxes(g)[1]!;
    expect(having(g, "wheel")).toEqual(rect(left, right, 2, 37));
    expect(g.hits.flat().filter((mark) => mark?.wheel !== undefined && mark.wheel !== "feed")).toEqual([]);
  });
}

// The lines of the feed that have an event, from the top down: inside the box they start by
// the mark of the selected line and the hour of the event
function eventLines(g: Grid): { y: number; hour: string; chosen: boolean }[] {
  const [left, right] = boxes(g)[1]!;
  return Array.from({ length: 34 }, (_, i) => i + 3).flatMap((y) => {
    const line = /^([▶ ]) (\d\d:\d\d:\d\d) /.exec(textOf(g, y, left + 1, right - 1));
    return line ? [{ y, hour: line[2]!, chosen: line[1] === "▶" }] : [];
  });
}

// Frame 01 has more lines of the feed than fit: with the selection in the window the last
// ones are drawn, and with it above the window the ones from it down
for (const [what, selected, from] of [["inside the window", 417, "end"], ["above the window", 1, "start"], ["of no line", null, "end"]] as const) {
  test(`CLK-20: with the selection ${what}, each line of an event has its seq in columns 29 to 84 and the border at its sides has not`, () => {
    const v = view("01", { selected });
    const g = main(v);
    const [left, right] = boxes(g)[1]!;
    expect([left + 1, right - 1]).toEqual([29, 84]);
    const lines = eventLines(g);
    expect(lines.length).toBeGreaterThan(20);
    expect(v.rows.length).toBeGreaterThan(lines.length);
    const rows = from === "end" ? v.rows.slice(-lines.length) : v.rows.slice(0, lines.length);
    // The lines drawn are those rows: each has the hour of its row, and the selected one its mark
    expect(lines.map((line) => line.hour)).toEqual(rows.map((row) => clock(row.ts)));
    expect(lines.flatMap((line, i) => (line.chosen ? [rows[i]!.seq] : []))).toEqual(selected === null ? [] : [selected]);
    lines.forEach(({ y }, i) => {
      expect(hits(g, y, 29, 84)).toEqual(all(56, { panel: 1, wheel: "feed", row: rows[i]!.seq }));
      expect([hit(g, 28, y), hit(g, 85, y)]).toEqual(all(2, { panel: 1, wheel: "feed" }));
    });
    // And no other cell of the screen has a line of the feed
    expect(having(g, "row").length).toBe(lines.length * 56);
  });
}

test("CLK-20: the header of the feed, its ruler and its band have no line of the feed in any cell", () => {
  // Frame 01 has the ruler of what came before the feature, and frame 09a the band of the idle squad
  for (const [frame, text] of [["01", "hora"], ["01", "▲ antes da feature"], ["09a", "hora"], ["09a", "squad ocioso desde"]] as const) {
    const g = main(view(frame));
    const [left, right] = boxes(g)[1]!;
    const ys = Array.from({ length: 36 }, (_, i) => i + 2).filter((y) => textOf(g, y, left, right).includes(text));
    expect(ys.length).toBe(1);
    expect(hits(g, ys[0]!, left, right)).toEqual(all(right - left + 1, { panel: 1, wheel: "feed" }));
  }
  // An empty log has no line to click
  expect(having(main(view("28a")), "row")).toEqual([]);
});

// The line of a ticket: the one that draws `text` in the panel of the left, below the
// separator of the tickets
function ticketLine(g: Grid, text: string): number {
  const [left, right] = boxes(g)[0]!;
  const lines = Array.from({ length: 36 }, (_, i) => i + 2);
  const sep = lines.filter((y) => g.rows[y]![left]!.ch === "├");
  expect(sep.length).toBe(1);
  const ys = lines.filter((y) => y > sep[0]! && textOf(g, y, left + 1, right - 1).includes(text));
  if (ys.length !== 1) throw new Error(`"${text}" is on ${ys.length} lines of the tickets`);
  return ys[0]!;
}

// A plan with `n` tickets after the one of frame 24a
const planned = (n: number) => (events: SquadEvent[]): SquadEvent[] => {
  const plan = events.find((e) => e.kind === "plan")!;
  return [...events, { ...plan, seq: 900, tickets: Array.from({ length: n }, (_, i) => ({ ticket_ref: `TKT-${31 + i}`, title: `ticket ${i + 1}` })) } as SquadEvent];
};

test("CLK-22: with three tickets, the two lines of each one have its ticket inside the box, and the border and the line after them have not", () => {
  const v = view("01");
  const g = main(v);
  const [left, right] = boxes(g)[0]!;
  expect([left + 1, right - 1]).toEqual([1, 26]);
  expect(v.squad.tickets.map((t) => t.ticket_ref)).toEqual(["TKT-12", "TKT-13", "TKT-14"]);
  for (const ref of ["TKT-12", "TKT-13", "TKT-14"]) {
    const y = ticketLine(g, ref);
    // The second line of the ticket has its reworks and its status
    expect(textOf(g, y + 1, 1, 26)).toMatch(/^ ⟳\d\/2 \[/);
    for (const line of [y, y + 1]) {
      expect(hits(g, line, 1, 26)).toEqual(all(26, { panel: 0, ticket: ref }));
      expect([hit(g, 0, line), hit(g, 27, line)]).toEqual(all(2, { panel: 0 }));
    }
  }
  expect(hits(g, ticketLine(g, "TKT-14") + 2, 0, 27)).toEqual(all(28, { panel: 0 }));
  expect(having(g, "ticket").length).toBe(3 * 2 * 26);
});

for (const n of [4, 7]) {
  test(`CLK-22: with ${n} tickets, the one line of each has its ticket`, () => {
    const v = view("24a", {}, planned(n));
    const g = main(v);
    const refs = v.squad.tickets.map((t) => t.ticket_ref);
    expect(refs.length).toBe(n);
    const ys = refs.map((ref) => ticketLine(g, ref));
    // One line each, one after the other
    expect(ys).toEqual(refs.map((_, i) => ys[0]! + i));
    refs.forEach((ref, i) => {
      expect(hits(g, ys[i]!, 1, 26)).toEqual(all(26, { panel: 0, ticket: ref }));
      expect([hit(g, 0, ys[i]!), hit(g, 27, ys[i]!)]).toEqual(all(2, { panel: 0 }));
    });
    expect(having(g, "ticket").length).toBe(n * 26);
  });
}

test("CLK-22, CLK-27: with more than seven tickets, the line that counts the ones not drawn has no ticket", () => {
  const v = view("24a", {}, planned(9));
  const g = main(v);
  const refs = v.squad.tickets.map((t) => t.ticket_ref);
  expect(refs.length).toBe(9);
  expect(hits(g, ticketLine(g, "+3 tickets"), 0, 27)).toEqual(all(28, { panel: 0 }));
  // The six drawn have theirs
  for (const ref of refs.slice(0, 6)) expect(hits(g, ticketLine(g, ref), 1, 26)).toEqual(all(26, { panel: 0, ticket: ref }));
  expect(having(g, "ticket").length).toBe(6 * 26);
});

test("CLK-22: without a ticket no cell has one", () => {
  // A feature with no plan yet, no feature open, and an empty log
  for (const frame of ["26a", "09a", "28a"]) {
    const v = view(frame);
    expect(v.squad.tickets).toEqual([]);
    expect(having(main(v), "ticket")).toEqual([]);
  }
});

test("CLK-27: a line of an agent and the separator of the tickets have only the panel", () => {
  const g = main(view("01"));
  const sep = Array.from({ length: 36 }, (_, i) => i + 2).filter((y) => g.rows[y]![0]!.ch === "├");
  expect(sep.length).toBe(1);
  expect(textOf(g, sep[0]!, 0, 27)).toContain(" tickets ");
  // From the top of the box to the separator: the lines of the six agents
  const above = Array.from({ length: sep[0]! - 1 }, (_, i) => i + 2);
  const drawn = above.map((y) => textOf(g, y, 0, 27)).join("\n");
  for (const name of ["mother", "leader", "worker-1", "worker-2", "worker-3", "judge"]) expect(drawn).toContain(` ${name} `);
  for (const y of above) expect(hits(g, y, 0, 27)).toEqual(all(28, { panel: 0 }));
});

// The thread of the ticket of the selected line in frames 03 and 15b, of the ticket of the
// frame in 24d, and the one of a feature with no ticket in 26a
for (const frame of ["03", "15b", "24d", "26a"]) {
  test(`CLK-29: in the thread of frame ${frame} every cell of the box of the left has the wheel of the thread, its four corners too, and the box of the right has no wheel`, () => {
    const g = thread(view(frame, { screen: "thread" }));
    const [[left, right], [otherLeft, otherRight]] = boxes(g, 2) as [[number, number], [number, number]];
    expect([hit(g, left, 2), hit(g, right, 2), hit(g, left, 37), hit(g, right, 37)]).toEqual(all(4, { wheel: "thread" }));
    expect(having(g, "wheel")).toEqual(rect(left, right, 2, 37));
    expect(g.hits.flat().filter((mark) => mark?.wheel !== undefined && mark.wheel !== "thread")).toEqual([]);
    // The box of the judge starts in the column after it
    expect(otherLeft).toBe(right + 1);
    expect([hit(g, otherLeft, 2), hit(g, otherRight, 2), hit(g, otherLeft, 37), hit(g, otherRight, 37)]).toEqual(all(4, null));
  });

  test(`CLK-27: in the thread of frame ${frame} no cell has a line of the feed, a ticket or a panel`, () => {
    const g = thread(view(frame, { screen: "thread" }));
    expect([having(g, "row"), having(g, "ticket"), having(g, "panel")]).toEqual([[], [], []]);
  });
}
