import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { grid, len, type Grid, type Hit } from "../../tui/grid.ts";
import { chrome, drawKeys, MAIN_KEYS, stats, type Keys } from "../../tui/screens/chrome.ts";
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
