import { expect, test } from "bun:test";
import { qid, type SquadEvent } from "../../shared/contract.ts";
import { waiting } from "../../tui/asked.ts";
import { clock, grid, len, type Grid } from "../../tui/grid.ts";
import { input, keysOf, press } from "../../tui/keys.ts";
import { parse, point, take, type Drawn, type Entry, type Pointer } from "../../tui/mouse.ts";
import { answer } from "../../tui/screens/answer.ts";
import { help } from "../../tui/screens/help.ts";
import { main } from "../../tui/screens/main.ts";
import { questions } from "../../tui/screens/questions.ts";
import { thread, threadTicket } from "../../tui/screens/thread.ts";
import { topology } from "../../tui/screens/topology.ts";
import type { Modal, Ui, View } from "../../tui/view.ts";
import { frameView } from "../frames/view.ts";

// What a mouse report does to the state of the screen. A report has its column and its line
// counted from 1: the cell (x, y) of the grid is column x + 1 of line y + 1. The cell of a
// click is found in the text the screen drew, and what the click does is compared with what
// `press` does with the key to the same state.

const UP = "\x1b[A";

// The view of a frame with the state of the screen changed. In frame 01 the feature is open,
// the selected line is 417, the verdict of TKT-12, Q-07 is open, blocking and with the dev,
// Q-08 is open with the dev and not blocking, and the plan has TKT-12, TKT-13 and TKT-14.
function view(frame: string, ui: Partial<Ui> = {}, change?: (events: SquadEvent[]) => SquadEvent[]): View {
  const v = frameView(frame, change);
  return { ...v, ui: { ...v.ui, ...ui } };
}

const SCREENS = { main, topology, thread, help, questions };
const ALL_SCREENS = ["main", "topology", "thread", "questions", "help"] as const;

// The screen of a view as the loop draws it, under the modal of answer when one is open, and
// what the loop keeps of that drawing
const screen = (v: View): Grid => answer(SCREENS[v.ui.screen](v), v);
const drawing = (v: View, g: Grid = screen(v)): Drawn => ({ hits: g.hits, screen: v.ui.screen });

// The columns where `text` starts on line y of a drawing, from one column to another
function find(g: Grid, y: number, text: string, from = 0, to = g.w - 1): number[] {
  const line = g.rows[y]!.map((cell) => cell.ch);
  const want = [...text];
  return line.flatMap((_, x) => (x >= from && x + want.length - 1 <= to && want.every((ch, i) => line[x + i] === ch) ? [x] : []));
}

// The column where `text` starts on line y of a drawing, which has it once
function at(g: Grid, y: number, text: string): number {
  const found = find(g, y, text);
  if (found.length !== 1) throw new Error(`line ${y} has "${text}" ${found.length} times: ${g.text()[y]}`);
  return found[0]!;
}

// The report of a button on the cell (x, y) of the grid, and the one of a click
const report = (button: number, x: number, y: number, end = "M"): string => `\x1b[<${button};${x + 1};${y + 1}${end}`;
const click = (x: number, y: number): string => report(0, x, y);

// The mouse turned on with no click before, and the state of a view with its mouse
const ON: Pointer = { on: true, clickedAt: null };
const entry = (v: View, pointer: Pointer = ON): Entry => ({ ui: v.ui, pointer });

// The state after a click on the cell (x, y) of the screen of the view, as it is drawn
const clicked = (v: View, x: number, y: number): Entry | null => point(entry(v), click(x, y), v, drawing(v));

// The state after the keys, one after the other, as `press` gives it
const keys = (v: View, ...list: string[]): Ui | null => list.reduce<Ui | null>((ui, key) => ui && press(ui, key, { ...v, ui }), v.ui);

test("CLK-03: a report gives its button, its column, its line and whether the button was pressed or released", () => {
  expect(parse("\x1b[<0;12;5M")).toEqual({ button: 0, x: 12, y: 5, pressed: true });
  expect(parse("\x1b[<0;12;5m")).toEqual({ button: 0, x: 12, y: 5, pressed: false });
  // The wheel, and the last cell of the grid
  expect(parse("\x1b[<64;1;1M")).toEqual({ button: 64, x: 1, y: 1, pressed: true });
  expect(parse("\x1b[<65;120;40M")).toEqual({ button: 65, x: 120, y: 40, pressed: true });
});

const BROKEN: [what: string, item: string][] = [
  ["two integers", "\x1b[<0;12M"],
  ["one integer", "\x1b[<0M"],
  ["no integer", "\x1b[<M"],
  ["four integers", "\x1b[<0;12;5;7M"],
  ["an empty first integer", "\x1b[<;12;5M"],
  ["an empty second integer", "\x1b[<0;;5M"],
  ["an empty third integer", "\x1b[<0;12;M"],
  ["an end that is neither M nor m", "\x1b[<0;12;5q"],
  ["no end", "\x1b[<0;12;5"],
  ["no end after the second integer", "\x1b[<0;1"],
];

for (const [what, item] of BROKEN) {
  test(`CLK-09: a sequence that starts as a report and has ${what} is no report`, () => {
    // The input reads it as one item, which is neither a key nor text
    expect(keysOf(item)).toEqual([item]);
    expect(parse(item)).toBeNull();
  });
}

test("CLK-10: the old format is no report, whole or cut", () => {
  for (const item of ["\x1b[M !!", "\x1b[M0<5", "\x1b[M !", "\x1b[M"]) {
    expect(keysOf(item)).toEqual([item]);
    expect(parse(item)).toBeNull();
  }
});

test("CLK-03: an item of the input that is a key, an escape sequence or a mark of a paste is no report", () => {
  for (const item of ["q", "0", "M", "<", "\r", "\x1b", UP, "\x1b[Z", "\x1b[3~", "\x1b[200~", "\x1b[201~", ""]) expect(parse(item)).toBeNull();
});

const HUGE = "9".repeat(400);

test("CLK-11: an integer of 400 digits does not throw, and gives a number no grid has", () => {
  const wide = parse(`\x1b[<0;${HUGE};5M`)!;
  expect([wide.button, wide.y, wide.pressed]).toEqual([0, 5, true]);
  expect(wide.x).toBeGreaterThan(120);
  const tall = parse(`\x1b[<0;12;${HUGE}M`)!;
  expect([tall.button, tall.x]).toEqual([0, 12]);
  expect(tall.y).toBeGreaterThan(40);
  // More digits than a safe integer holds, in the button too
  expect(parse(`\x1b[<${HUGE};12;5M`)!.button).toBeGreaterThan(65);
  expect(parse(`\x1b[<0;${"9".repeat(17)};5M`)!.x).toBeGreaterThan(120);
});

const TABS = [
  ["1", "1 principal", "main"],
  ["2", "2 topologia", "topology"],
  ["3", "3 thread", "thread"],
  ["4", "4 perguntas", "questions"],
  ["?", "? ajuda", "help"],
] as const;

for (const [key, label, to] of TABS) {
  test(`CLK-18: a click on the tab "${label}" does what the key ${key} does, from every screen and on the first and the last cell of the tab`, () => {
    for (const from of ALL_SCREENS) {
      // The thread of another ticket was open before, scrolled
      const v = view("01", { screen: from, threadTicket: "TKT-14", threadOffset: 5 });
      const x = at(screen(v), 1, label);
      // The space before the key, the key, and the space after the name
      for (const cell of [x - 1, x, x + len(label)]) {
        const next = clicked(v, cell, 1)!;
        expect(next.ui).toEqual(press(v.ui, key, v)!);
        expect(next.ui.screen).toBe(to);
      }
    }
  });
}

test("CLK-18: a click on the count of the tab of questions does what the key 4 does", () => {
  const v = view("01");
  const g = screen(v);
  const digit = at(g, 1, "4 perguntas 2") + len("4 perguntas 2") - 1;
  expect(g.rows[1]![digit]!.ch).toBe("2");
  for (const cell of [digit, digit + 1]) expect(clicked(v, cell, 1)!.ui).toEqual({ ...v.ui, screen: "questions" });
  expect(press(v.ui, "4", v)).toEqual({ ...v.ui, screen: "questions" });
});

test("edge case: a click on the tab the TUI is on does what its key does there: 3 on the thread goes back to the ticket of the selected line, on its latest entry", () => {
  // 417 is of TKT-12, and the thread shows TKT-14, scrolled
  const v = view("01", { screen: "thread", selected: 417, threadTicket: "TKT-14", threadOffset: 5 });
  expect(threadTicket(v)).toBe("TKT-14");
  const next = clicked(v, at(screen(v), 1, "3 thread"), 1)!;
  expect(next.ui).toEqual(press(v.ui, "3", v)!);
  expect([next.ui.screen, next.ui.threadOffset, threadTicket({ ...v, ui: next.ui })]).toEqual(["thread", 0, "TKT-12"]);
  // And 1 on the main screen leaves it as it is
  const home = view("01", { selected: 417 });
  expect(clicked(home, at(screen(home), 1, "1 principal"), 1)!.ui).toEqual(home.ui);
});

test("CLK-23: a click on the counter of line 0 does what the key 4 does, on its two spaces too", () => {
  for (const from of ALL_SCREENS) {
    const v = view("01", { screen: from, selected: 417 });
    const x = at(screen(v), 0, "? 2");
    for (const cell of [x - 1, x, x + 2, x + 3]) {
      const next = clicked(v, cell, 0)!;
      expect(next.ui).toEqual(press(v.ui, "4", v)!);
      expect(next.ui.screen).toBe("questions");
    }
  }
});

// The notice of the keys the slice Gate brings
const gate = (v: View) => ({ text: "chega com a fatia Gate", color: "gray" as const, until: v.squad.now + 4000 });

const SEALS = [
  ["CLK-36", "19a", "⚠ 2 gates pendentes · g", "g"],
  ["CLK-36", "18a", "⚠ gate G-01 pendente · g", "g"],
  ["CLK-37", "14", "⚠ permissão w1 · x", "x"],
  ["CLK-37", "22c", "⚠ 2 permissões · x", "x"],
] as const;

for (const [requirement, frame, seal, key] of SEALS) {
  test(`${requirement}: a click on the seal "${seal}" of frame ${frame} does what the key ${key} does`, () => {
    const v = view(frame);
    const x = at(screen(v), 1, seal);
    for (const cell of [x, x + len(seal) - 1]) {
      const next = clicked(v, cell, 1)!;
      expect(next.ui).toEqual(press(v.ui, key, v)!);
      expect(next.ui).toEqual({ ...v.ui, toast: gate(v) });
    }
  });
}

for (const [frame, seal] of [["10", "bloqueado"], ["13a", "offline"], ["23a", "parado"], ["15a", "escalado"]] as const) {
  test(`CLK-38: a click on the seal of who is ${seal}, in frame ${frame}, leaves the state as it is`, () => {
    const v = view(frame);
    const x = at(screen(v), 1, seal);
    for (const cell of [x, x + len(seal) - 1]) expect(clicked(v, cell, 1)!.ui).toBe(v.ui);
  });
}

test("CLK-39: a click on the cost of line 38 does what the key t does, from │ to the end of est.", () => {
  for (const [v, scope] of [[view("01"), "session"], [view("01", { scope: "session" }), "feature"]] as const) {
    const g = screen(v);
    for (const cell of [at(g, 38, "│"), at(g, 38, "≈$"), at(g, 38, "est.") + 3]) {
      const next = clicked(v, cell, 38)!;
      expect(next.ui).toEqual(press(v.ui, "t", v)!);
      expect(next.ui.scope).toBe(scope);
    }
  }
  // Without an open feature t says only the session exists
  const none = view("09a");
  const next = clicked(none, at(screen(none), 38, "│"), 38)!;
  expect(next.ui).toEqual(press(none.ui, "t", none)!);
  expect(next.ui.toast).toEqual({ text: "sem feature aberta · só a sessão", color: "gray", until: none.squad.now + 4000 });
});

// Each simple shortcut a screen with no modal draws, the key the terminal sends for it, a view
// whose screen draws it, and what the key does there
const SIMPLE: [label: string, does: string, key: string, v: View, check: (ui: Ui | null, v: View) => void][] = [
  ["tab", "painel", "\t", view("01"), (ui) => expect(ui!.focus).toBe(2)],
  ["enter", "abrir", "\r", view("01", { selected: 417 }), (ui) => expect(ui!.screen).toBe("thread")],
  ["esc", "voltar", "\x1b", view("01", { screen: "thread" }), (ui) => expect(ui!.screen).toBe("main")],
  ["b", "bloqueante", "b", view("01", { question: 8 }), (ui) => expect([ui!.screen, ui!.question]).toEqual(["questions", 7])],
  ["g", "gate", "g", view("01"), (ui, v) => expect(ui!.toast).toEqual(gate(v))],
  ["x", "permissão", "x", view("01"), (ui, v) => expect(ui!.toast).toEqual(gate(v))],
  ["p", "pausa", "p", view("01"), (ui) => expect(ui!.paused).toBe(true)],
  ["h", "histórico", "h", view("04"), (ui) => expect(ui!.qfocus).toBe("history")],
  ["?", "ajuda", "?", view("01"), (ui) => expect(ui!.screen).toBe("help")],
  ["q", "sair", "q", view("01"), (ui) => expect(ui).toBeNull()],
];

for (const [label, does, key, v, check] of SIMPLE) {
  test(`CLK-33: a click on the shortcut "${label} ${does}" does what the key ${JSON.stringify(key)} does, on its key and on what it does`, () => {
    const x = at(screen(v), 39, `${label} ${does}`);
    const described = x + len(label) + 1;
    for (const cell of [x, x + len(label) - 1, described, described + len(does) - 1]) {
      const next = clicked(v, cell, 39);
      expect(next?.ui ?? null).toEqual(press(v.ui, key, v));
      check(next?.ui ?? null, v);
    }
    // The space between the two and the one after them are of no shortcut
    for (const cell of [described - 1, described + len(does)]) expect(clicked(v, cell, 39)!.ui).toBe(v.ui);
  });
}

test("CLK-33: a click on a shortcut does what its key does on the screen that draws it: b on the tab goes to the next blocking question, esc on the help goes back", () => {
  const tab = view("04", { question: 8 });
  const next = clicked(tab, at(screen(tab), 39, "b próx. bloqueante"), 39)!;
  expect(next.ui).toEqual(press(tab.ui, "b", tab)!);
  expect(next.ui.question).toBe(7);
  const legend = view("01", { screen: "help" });
  expect(clicked(legend, at(screen(legend), 39, "esc voltar"), 39)!.ui).toEqual({ ...legend.ui, screen: "main" });
  expect(clicked(legend, at(screen(legend), 39, "q sair"), 39)).toBeNull();
});

test("CLK-34: a click on j or on k of the shortcut of the two moves the selection of the feed by one line, and one on their separator or on what they do changes nothing", () => {
  const v = view("01", { selected: 417 });
  const x = at(screen(v), 39, "j/k mover");
  const down = clicked(v, x, 39)!;
  expect(down.ui).toEqual(press(v.ui, "j", v)!);
  expect(down.ui.selected).toBe(418);
  const up = clicked(v, x + 2, 39)!;
  expect(up.ui).toEqual(press(v.ui, "k", v)!);
  expect(up.ui.selected).toBe(416);
  // The bar, the space after the keys and each cell of `mover`
  for (const cell of [x + 1, x + 3, x + 4, x + 5, x + 6, x + 7, x + 8]) expect(clicked(v, cell, 39)!.ui).toBe(v.ui);
});

test("CLK-34: a click on [ or on ] of the shortcut of the two shows the thread of the ticket before or after, and one on the space between them or on what they do changes nothing", () => {
  const v = view("01", { screen: "thread", threadTicket: "TKT-13", threadOffset: 4 });
  const label = "[ ] ticket ant/próx";
  const x = at(screen(v), 39, label);
  const before = clicked(v, x, 39)!;
  expect(before.ui).toEqual(press(v.ui, "[", v)!);
  expect([before.ui.threadTicket, before.ui.threadOffset]).toEqual(["TKT-12", 0]);
  const after = clicked(v, x + 2, 39)!;
  expect(after.ui).toEqual(press(v.ui, "]", v)!);
  expect([after.ui.threadTicket, after.ui.threadOffset]).toEqual(["TKT-14", 0]);
  expect(clicked(v, x + 1, 39)!.ui).toBe(v.ui);
  for (let cell = x + 3; cell < x + len(label); cell++) expect(clicked(v, cell, 39)!.ui).toBe(v.ui);
});

test("CLK-35: a click on the shortcut of a range changes nothing, on its keys or on what they do", () => {
  for (const v of [view("01", { selected: 417 }), view("01", { screen: "topology" }), view("04")]) {
    const x = at(screen(v), 39, "1-4 telas");
    for (let cell = x; cell < x + len("1-4 telas"); cell++) expect(clicked(v, cell, 39)!.ui).toBe(v.ui);
  }
});

// The first and the last column of each of the boxes a screen has side by side under the
// tabs, from left to right: the corners line 2 draws
function boxes(g: Grid): [left: number, right: number][] {
  const right = find(g, 2, "┐");
  return find(g, 2, "┌").map((left, i) => [left, right[i]!]);
}

// The cell where a box draws `text`, which it has once from line `top` to line `bottom`
function cellOf(g: Grid, [left, right]: [number, number], text: string, top = 2, bottom = 37): [x: number, y: number] {
  const found = g.rows.flatMap((_, y) => (y < top || y > bottom ? [] : find(g, y, text, left, right).map((x): [number, number] => [x, y])));
  if (found.length !== 1) throw new Error(`the box has "${text}" ${found.length} times`);
  return found[0]!;
}

// The cell where the feed of the main screen draws the hour of an event, which it has once
function feedCell(g: Grid, hour: string): [x: number, y: number] {
  const [x, y] = cellOf(g, boxes(g)[1]!, ` ${hour} `);
  return [x + 1, y];
}

// Three cells of the main screen of frame 01 where a click or the wheel does something: a tab,
// the shortcut that quits, and the line of the feed of 14:29:40, which is not the selected one
const live = (g: Grid): [x: number, y: number][] => [[at(g, 1, "2 topologia"), 1], [at(g, 39, "q sair"), 39], feedCell(g, "14:29:40")];

// What is neither a click nor the wheel up or down: the release of a button, the middle and
// the right button, the horizontal wheel, and every report with the bit of a movement
const OTHER: [what: string, button: number, end: string][] = [
  ["the release of the left button", 0, "m"],
  ["the release of the wheel", 64, "m"],
  ["the middle button", 1, "M"],
  ["the right button", 2, "M"],
  ["the release of the right button", 2, "m"],
  ["the wheel to the left", 66, "M"],
  ["the wheel to the right", 67, "M"],
  ["a movement with the left button held", 32, "M"],
  ["a movement with no button", 35, "M"],
  ["a movement over the wheel up", 96, "M"],
  ["a movement over the wheel down", 97, "M"],
];

for (const [what, button, end] of OTHER) {
  test(`CLK-06: ${what} changes nothing, where a click and the wheel do`, () => {
    const v = view("01", { selected: 417 });
    const g = screen(v);
    for (const [x, y] of live(g)) {
      const next = point(entry(v), report(button, x, y, end), v, drawing(v, g))!;
      expect(next.ui).toBe(v.ui);
      // It is no click: the next click is not the second of a double one
      expect(next.pointer).toEqual(ON);
    }
  });
}

test("CLK-06: shift, alt and ctrl held with the click do not change what it does", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  const [tab, quit] = live(g) as [[number, number], [number, number]];
  // The bits 4, 8 and 16 of the button, one by one and together
  for (const held of [4, 8, 16, 12, 20, 24, 28]) {
    const next = point(entry(v), report(held, ...tab), v, drawing(v, g))!;
    expect(next.ui).toEqual(press(v.ui, "2", v)!);
    expect(next.ui.screen).toBe("topology");
    expect(point(entry(v), report(held, ...quit), v, drawing(v, g))).toBeNull();
    // And they make no click of what is none: the middle button and a release
    expect(point(entry(v), report(held + 1, ...tab), v, drawing(v, g))!.ui).toBe(v.ui);
    expect(point(entry(v), report(held, ...tab, "m"), v, drawing(v, g))!.ui).toBe(v.ui);
  }
});

test("CLK-11: column 120 and line 40 are cells of the grid, and column 0, line 0, column 121, line 41 and an integer of 400 digits are not", () => {
  const v = view("01", { selected: 417 });
  // A drawing with the key of the pause in every cell: only where the cell is decides
  const g = grid();
  g.mark(0, 0, 120, 40, { key: "p" });
  const sent = (column: number | string, line: number | string) => point(entry(v), `\x1b[<0;${column};${line}M`, v, drawing(v, g))!;
  for (const [column, line] of [[1, 1], [120, 1], [1, 40], [120, 40]] as const) {
    expect(sent(column, line).ui).toEqual(press(v.ui, "p", v)!);
    expect(sent(column, line).ui.paused).toBe(true);
  }
  for (const [column, line] of [[0, 1], [1, 0], [0, 0], [121, 1], [121, 40], [1, 41], [120, 41], [121, 41], [HUGE, 1], [1, HUGE], [HUGE, HUGE]] as const) {
    expect(sent(column, line).ui).toBe(v.ui);
  }
  // An integer of 400 digits for the button is no click
  expect(point(entry(v), `\x1b[<${HUGE};1;1M`, v, drawing(v, g))!.ui).toBe(v.ui);
});

test("CLK-11: line 40 of the screen is clicked, and in a terminal larger than the grid a click outside it changes nothing", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  const x = at(g, 39, "p pausa");
  expect(point(entry(v), `\x1b[<0;${x + 1};40M`, v, drawing(v, g))!.ui).toEqual({ ...v.ui, paused: true });
  for (const [column, line] of [[x + 1, 41], [x + 1, 45], [121, 40], [130, 2], [130, 45]] as const) {
    expect(point(entry(v), `\x1b[<0;${column};${line}M`, v, drawing(v, g))!.ui).toBe(v.ui);
  }
});

test("CLK-51: with the mouse turned off a click and the wheel change neither the state nor the time of the last click", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  const off: Pointer = { on: false, clickedAt: 5 };
  for (const [x, y] of live(g)) {
    for (const button of [0, 64, 65]) {
      const next = point(entry(v, off), report(button, x, y), v, drawing(v, g))!;
      expect(next.ui).toBe(v.ui);
      expect(next.pointer).toEqual({ on: false, clickedAt: 5 });
    }
  }
  // The same click with the mouse on shows the topology
  expect(point(entry(v), click(...live(g)[0]!), v, drawing(v, g))!.ui.screen).toBe("topology");
});

test("CLK-13: with no drawing of the screen of the state, a click changes nothing and does not quit", () => {
  const v = view("01", { selected: 417 });
  for (const [x, y] of live(screen(v))) expect(point(entry(v), click(x, y), v, null)!.ui).toBe(v.ui);
});

test("CLK-14: a click over the drawing of another screen changes nothing: a key of its chunk changed the screen after the drawing", () => {
  // The main screen is the one drawn, and the state is on another one
  const drawn = view("01", { selected: 417 });
  const g = screen(drawn);
  const pause: [number, number] = [at(g, 39, "p pausa"), 39];
  for (const now of ["topology", "thread", "questions", "help"] as const) {
    const v = view("01", { selected: 417, screen: now });
    for (const [x, y] of [...live(g), pause]) expect(point(entry(v), click(x, y), v, drawing(drawn, g))!.ui).toBe(v.ui);
  }
  // Over its own drawing the click pauses the feed
  expect(point(entry(drawn), click(...pause), drawn, drawing(drawn, g))!.ui.paused).toBe(true);
});

test("CLK-14: the same cell does one thing with one drawing and another with another: what the last drawing has there", () => {
  // With two questions with the dev the tab of questions has its count, and the tab of the
  // help is drawn two cells to the right of where it is without one
  const v = view("01");
  const counted = screen(v);
  const plain = screen(view("23a"));
  const x = at(plain, 1, "? ajuda");
  expect(at(counted, 1, "? ajuda")).toBe(x + 2);
  // The cell of `?` in one drawing is the one between two tabs in the other
  expect(point(entry(v), click(x, 1), v, drawing(v, plain))!.ui).toEqual({ ...v.ui, screen: "help" });
  expect(point(entry(v), click(x, 1), v, drawing(v, counted))!.ui).toBe(v.ui);
  // And the last cell of the tab in the other is past the tab in the first
  const end = x + 2 + len("? ajuda");
  expect(point(entry(v), click(end, 1), v, drawing(v, counted))!.ui).toEqual({ ...v.ui, screen: "help" });
  expect(point(entry(v), click(end, 1), v, drawing(v, plain))!.ui).toBe(v.ui);
});

// The modal of answer over the tab of questions: 05 is Q-07 on the first of its three options
test("CLK-40: a mark the modal did not draw is not clicked with the modal open, and one it drew is not clicked without it", () => {
  // A key of the chunk opened the modal after the tab was drawn: the tab of the topology
  // would be the digit that marks the second option
  const tab = view("04");
  const open = view("05");
  const under = screen(tab);
  for (const [text, y] of [["2 topologia", 1], ["enter responder", 39], ["esc voltar", 39], ["? 2", 0]] as const) {
    expect(point(entry(open), click(at(under, y, text), y), open, drawing(tab, under))!.ui).toBe(open.ui);
  }
  // And one closed it after it was drawn: its enter would open it again, and its esc would leave the tab
  const over = screen(open);
  for (const [x, y] of [[at(over, 39, "enter confirmar"), 39], [at(over, 39, "esc cancelar"), 39], [0, 0], [at(over, 1, "2 topologia"), 1]] as const) {
    expect(point(entry(tab), click(x, y), tab, drawing(open, over))!.ui).toBe(tab.ui);
  }
});

test("CLK-46: every click read with the mouse on is the click before the next one, also the one that does nothing", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  const now = v.squad.now;
  // A tab, a cell with no mark, a cell outside the grid
  for (const [x, y] of [[at(g, 1, "2 topologia"), 1], [at(g, 0, "squad-tui"), 0], [120, 40]] as const) {
    expect(point(entry(v), click(x, y), v, drawing(v, g))!.pointer).toEqual({ on: true, clickedAt: now });
    expect(point(entry(v, { on: true, clickedAt: now - 60_000 }), click(x, y), v, drawing(v, g))!.pointer).toEqual({ on: true, clickedAt: now });
  }
  // With nothing drawn, and over the drawing of another screen
  expect(point(entry(v), click(at(g, 1, "2 topologia"), 1), v, null)!.pointer).toEqual({ on: true, clickedAt: now });
  const other = view("01", { screen: "help" });
  expect(point(entry(other), click(at(g, 39, "p pausa"), 39), other, drawing(v, g))!.pointer).toEqual({ on: true, clickedAt: now });
});

// The tabs that take the focus from one panel of the main screen to another, around the
// three: from the panel of the line to the one of the column
const TABS_TO = [
  [0, 1, 2],
  [2, 0, 1],
  [1, 2, 0],
] as const;
const tabs = (focus: 0 | 1 | 2, panel: 0 | 1 | 2): string[] => Array<string>(TABS_TO[focus][panel]).fill("\t");

// A text each panel draws in frame 01 with the line 417 selected, on a line with nothing to click
const PANELS = ["mother", "hora", "msg #0417"] as const;

for (const focus of [0, 1, 2] as const) {
  for (const panel of [0, 1, 2] as const) {
    test(`CLK-19: with the focus on panel ${focus}, a click on panel ${panel} gives it the focus, as ${TABS_TO[focus][panel]} tab does, on the border of its box too`, () => {
      const v = view("01", { selected: 417, focus });
      const g = screen(v);
      const [left, right] = boxes(g)[panel]!;
      // The four corners of the box, and a cell inside it
      for (const [x, y] of [[left, 2], [right, 2], [left, 37], [right, 37], cellOf(g, [left, right], PANELS[panel])] as const) {
        expect(g.rows[y]![x]!.ch).not.toBe(" ");
        const next = clicked(v, x, y)!;
        expect(next.ui).toEqual(keys(v, ...tabs(focus, panel))!);
        expect(next.ui).toEqual({ ...v.ui, focus: panel });
      }
    });
  }
}

test("CLK-11, CLK-19: column 120 of the screen is clicked, the border of the detail, and column 121 is not", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  expect([boxes(g)[2]![1], g.rows[2]![119]!.ch, g.rows[37]![119]!.ch]).toEqual([119, "┐", "┘"]);
  for (const line of [3, 20, 38]) {
    expect(point(entry(v), `\x1b[<0;120;${line}M`, v, drawing(v, g))!.ui).toEqual({ ...v.ui, focus: 2 });
    expect(point(entry(v), `\x1b[<0;121;${line}M`, v, drawing(v, g))!.ui).toBe(v.ui);
  }
});

// The line of the feed of an hour, which the log has once
function rowAt(v: View, hour: string) {
  const found = v.rows.filter((row) => clock(row.ts) === hour);
  if (found.length !== 1) throw new Error(`the log has ${found.length} lines of ${hour}`);
  return found[0]!;
}

// In frame 01, 14:26:47 is two lines above the selected one, 14:27:30 the line before it,
// 14:28:30 the line after it and 14:29:40 five lines below
const AROUND = [
  ["14:26:47", 415, ["k", "k"]],
  ["14:27:30", 416, ["k"]],
  ["14:28:30", 418, ["j"]],
  ["14:29:40", 422, ["j", "j", "j", "j", "j"]],
] as const;

for (const [what, paused] of [["live", false], ["paused", true]] as const) {
  test(`CLK-20: with the feed ${what}, a click on a line above or below the selected one selects it, as k or j until it, on the first and on the last cell of the line`, () => {
    const v = view("01", { selected: 417, paused });
    const g = screen(v);
    const [left, right] = boxes(g)[1]!;
    for (const [hour, seq, moves] of AROUND) {
      expect(rowAt(v, hour).seq).toBe(seq);
      const [x, y] = feedCell(g, hour);
      for (const cell of [left + 1, x, right - 1]) {
        const next = clicked(v, cell, y)!;
        expect(next.ui).toEqual(keys(v, ...moves)!);
        expect(next.ui).toEqual({ ...v.ui, selected: seq });
        expect([next.ui.selected, next.ui.focus, next.ui.paused]).toEqual([seq, 1, paused]);
      }
    }
  });
}

test("CLK-20: with no line selected, a click on a line of the feed selects it: the first k selects the last line, and the others go up to the clicked one", () => {
  const v = view("01", { selected: null });
  const g = screen(v);
  // 14:31:48 is the last line of the log, and 14:31:15 four lines above it
  expect(v.rows.at(-1)!.seq).toBe(rowAt(v, "14:31:48").seq);
  expect(v.rows.at(-5)!.seq).toBe(rowAt(v, "14:31:15").seq);
  const last = clicked(v, ...feedCell(g, "14:31:48"))!;
  expect(last.ui).toEqual(keys(v, "k")!);
  expect([last.ui.selected, last.ui.focus]).toEqual([432, 1]);
  const above = clicked(v, ...feedCell(g, "14:31:15"))!;
  expect(above.ui).toEqual(keys(v, "k", "k", "k", "k", "k")!);
  expect([above.ui.selected, above.ui.focus]).toEqual([428, 1]);
  // The first line drawn, the one that opened the feature
  const first = clicked(v, ...feedCell(g, "14:17:48"))!;
  expect(first.ui).toEqual({ ...v.ui, selected: 401 });
});

for (const focus of [0, 2] as const) {
  test(`CLK-19, CLK-20: with the focus on panel ${focus}, a click on a line of the feed gives the focus to the feed and selects the line`, () => {
    const v = view("01", { selected: 417, focus });
    const g = screen(v);
    for (const [hour, seq, moves] of AROUND) {
      const next = clicked(v, ...feedCell(g, hour))!;
      expect(next.ui).toEqual(keys(v, ...tabs(focus, 1), ...moves)!);
      expect(next.ui).toEqual({ ...v.ui, focus: 1, selected: seq });
    }
  });
}

test("CLK-20: a click on the border of the line of an event selects no line: it only gives the focus to the feed", () => {
  const v = view("01", { selected: 417, focus: 0 });
  const g = screen(v);
  const [left, right] = boxes(g)[1]!;
  const [, y] = feedCell(g, "14:29:40");
  for (const x of [left, right]) {
    expect(g.rows[y]![x]!.ch).toBe("│");
    expect(clicked(v, x, y)!.ui).toEqual({ ...v.ui, focus: 1 });
  }
});

test("CLK-21: a click on the selected line of the feed does what enter does: the thread of its ticket, on its latest entry", () => {
  // 417 is the verdict of TKT-12; the thread of another ticket was open before, scrolled
  const v = view("01", { selected: 417, threadTicket: "TKT-14", threadOffset: 5 });
  const g = screen(v);
  const [left, right] = boxes(g)[1]!;
  const [x, y] = feedCell(g, "14:28:03");
  expect(rowAt(v, "14:28:03").seq).toBe(417);
  expect(g.rows[y]![left + 1]!.ch).toBe("▶");
  for (const cell of [left + 1, x, right - 1]) {
    const next = clicked(v, cell, y)!;
    expect(next.ui).toEqual(press(v.ui, "\r", v)!);
    expect([next.ui.screen, next.ui.threadOffset, threadTicket({ ...v, ui: next.ui })]).toEqual(["thread", 0, "TKT-12"]);
  }
  // From another panel the focus goes to the feed first
  const far = view("01", { selected: 417, focus: 2 });
  const next = clicked(far, x, y)!;
  expect(next.ui).toEqual(keys(far, ...tabs(2, 1), "\r")!);
  expect([next.ui.screen, next.ui.focus]).toEqual(["thread", 1]);
});

test("edge case: a click on the selected line of the feed, the one of a question that waits for the dev, opens the modal of its answer and sends nothing", () => {
  // 422 is Q-07 where it reached the dev, with its three options; 428 is Q-08, which has none
  for (const [selected, hour, question, choice] of [[422, "14:29:40", 7, 0], [428, "14:31:15", 8, null]] as const) {
    const v = view("01", { selected });
    expect(rowAt(v, hour).seq).toBe(selected);
    const next = clicked(v, ...feedCell(screen(v), hour))!;
    expect(next.ui).toEqual(press(v.ui, "\r", v)!);
    expect(next.ui).toEqual({ ...v.ui, screen: "questions", question, qfocus: "list", modal: { question, choice, text: "", expanded: false, sending: false, refused: false } });
    expect(next.ui.send).toBeNull();
  }
});

// The same view at a later clock
const later = (v: View, ms: number): View => ({ ...v, squad: { ...v.squad, now: v.squad.now + ms } });

test("CLK-20, CLK-21: outside the modal a double click is two clicks: the first selects the line of the feed and the second opens it", () => {
  const v = view("01", { selected: 417 });
  const cell = feedCell(screen(v), "14:26:47");
  const first = clicked(v, ...cell)!;
  expect(first.ui.selected).toBe(415);
  // The screen is drawn again with the line selected, and the second click comes 100 ms after the first
  const then = later({ ...v, ui: first.ui }, 100);
  expect(feedCell(screen(then), "14:26:47")).toEqual(cell);
  const second = point(first, click(...cell), then, drawing(then))!;
  expect(second.ui).toEqual(press(first.ui, "\r", then)!);
  expect([second.ui.screen, threadTicket({ ...then, ui: second.ui })]).toEqual(["thread", "TKT-12"]);
});

test("CLK-14: a click on a line of the feed selects the event the last drawing has on that line", () => {
  // The feed has more lines than fit: with no line selected the last ones are drawn, and with
  // the first line selected the ones from it down
  const v = view("01", { selected: null });
  const end = screen(v);
  const start = screen(view("01", { selected: v.rows[0]!.seq }));
  const [left, right] = boxes(end)[1]!;
  const [x, y] = feedCell(end, "14:29:40");
  const drawnAt = (g: Grid): number => rowAt(v, /\d\d:\d\d:\d\d/.exec(g.rows[y]!.slice(left, right).map((cell) => cell.ch).join(""))![0]).seq;
  expect(drawnAt(end)).toBe(422);
  expect(drawnAt(start)).not.toBe(422);
  expect(point(entry(v), click(x, y), v, drawing(v, end))!.ui.selected).toBe(422);
  expect(point(entry(v), click(x, y), v, drawing(v, start))!.ui.selected).toBe(drawnAt(start));
});

// The cell where the panel of the tickets draws a text: below the separator of the tickets
function ticketCell(g: Grid, text: string): [x: number, y: number] {
  const [left, right] = boxes(g)[0]!;
  const sep = g.rows.findIndex((row) => row[left]!.ch === "├");
  return cellOf(g, [left, right], text, sep + 1);
}

// A plan with `n` tickets after the one of frame 24a
const planned = (n: number) => (events: SquadEvent[]): SquadEvent[] => {
  const plan = events.find((e) => e.kind === "plan")!;
  return [...events, { ...plan, seq: 900, tickets: Array.from({ length: n }, (_, i) => ({ ticket_ref: `TKT-${31 + i}`, title: `ticket ${i + 1}` })) } as SquadEvent];
};

test("CLK-22: a click on a ticket shows its thread on its latest entry, as 3 and then [ or ] until it: the ticket of the selected line, the one before it and the one after, on either of its two lines", () => {
  // 407 is the task of TKT-13, the second of the plan; the thread of another ticket was open before, scrolled
  const v = view("01", { selected: 407, threadTicket: "TKT-14", threadOffset: 5 });
  expect(rowAt(v, "14:20:12").event.ticket_ref).toBe("TKT-13");
  expect(v.squad.tickets.map((t) => t.ticket_ref)).toEqual(["TKT-12", "TKT-13", "TKT-14"]);
  const g = screen(v);
  const [left, right] = boxes(g)[0]!;
  for (const [ref, moves] of [["TKT-13", []], ["TKT-12", ["["]], ["TKT-14", ["]"]]] as const) {
    const [x, y] = ticketCell(g, ref);
    // The first and the last cell inside the box, on the line of the title and on the one of the status
    for (const [cx, cy] of [[x, y], [left + 1, y], [right - 1, y], [left + 1, y + 1], [right - 1, y + 1]] as const) {
      const next = clicked(v, cx, cy)!;
      expect(next.ui).toEqual(keys(v, ...tabs(1, 0), "3", ...moves)!);
      expect([next.ui.screen, threadTicket({ ...v, ui: next.ui }), next.ui.threadOffset, next.ui.focus]).toEqual(["thread", ref, 0, 0]);
    }
  }
});

test("CLK-22: the thread of the clicked ticket is the one shown from wherever 3 starts: the first of the plan with no line selected, and the last with a line of it", () => {
  // With no line selected 3 shows the first ticket of the plan
  const none = view("01", { selected: null, focus: 0 });
  const down = clicked(none, ...ticketCell(screen(none), "TKT-14"))!;
  expect(down.ui).toEqual(keys(none, "3", "]", "]")!);
  expect([down.ui.screen, threadTicket({ ...none, ui: down.ui }), down.ui.threadOffset]).toEqual(["thread", "TKT-14", 0]);
  // 408 is the task of TKT-14, the last one
  const last = view("01", { selected: 408, focus: 0 });
  const up = clicked(last, ...ticketCell(screen(last), "TKT-12"))!;
  expect(up.ui).toEqual(keys(last, "3", "[", "[")!);
  expect([up.ui.screen, threadTicket({ ...last, ui: up.ui }), up.ui.threadOffset]).toEqual(["thread", "TKT-12", 0]);
});

test("CLK-22: with one line for each ticket, a click on the line of a ticket shows its thread", () => {
  const v = view("24a", { focus: 0 }, planned(5));
  const refs = v.squad.tickets.map((t) => t.ticket_ref);
  expect(refs.length).toBe(5);
  // The selected line is of no ticket: 3 shows the first of the plan
  expect(threadTicket({ ...v, ui: keys(v, "3")! })).toBe(refs[0]!);
  const g = screen(v);
  refs.forEach((ref, i) => {
    const next = clicked(v, ...ticketCell(g, ref))!;
    expect(next.ui).toEqual(keys(v, "3", ...Array<string>(i).fill("]"))!);
    expect([next.ui.screen, threadTicket({ ...v, ui: next.ui }), next.ui.threadOffset]).toEqual(["thread", ref, 0]);
  });
});

test("CLK-22: a click on the border of the line of a ticket shows no thread: it only gives the focus to the panel", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  const [left, right] = boxes(g)[0]!;
  const [, y] = ticketCell(g, "TKT-13");
  for (const x of [left, right]) expect(clicked(v, x, y)!.ui).toEqual({ ...v.ui, focus: 0 });
});

test("CLK-27: a click on an agent, on the separator of the tickets or on the line that counts the tickets not drawn only gives the focus to their panel", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  for (const text of ["mother", "objetivo", "worker-2", " tickets "]) {
    const next = clicked(v, ...cellOf(g, boxes(g)[0]!, text))!;
    expect(next.ui).toEqual(keys(v, ...tabs(1, 0))!);
    expect(next.ui).toEqual({ ...v.ui, focus: 0 });
  }
  const many = view("24a", {}, planned(9));
  expect(clicked(many, ...ticketCell(screen(many), "+3 tickets"))!.ui).toEqual({ ...many.ui, focus: 0 });
});

test("CLK-27: a click on the panel of detail only gives it the focus", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  for (const text of ["msg #0417", "critérios da spec", "thread TKT-12"]) {
    const next = clicked(v, ...cellOf(g, boxes(g)[2]!, text))!;
    expect(next.ui).toEqual(keys(v, ...tabs(1, 2))!);
    expect(next.ui).toEqual({ ...v.ui, focus: 2 });
  }
});

test("CLK-27: a click on the header of the feed, on its ruler or on its band selects no line: it only gives the focus to the feed", () => {
  // Frame 01 has the ruler of what came before the feature, and frame 09a the band of the idle squad
  for (const [frame, text] of [["01", "hora"], ["01", "▲ antes da feature"], ["01", "● ao vivo"], ["09a", "hora"], ["09a", "squad ocioso desde"]] as const) {
    const v = view(frame, { focus: 2 });
    const g = screen(v);
    const next = clicked(v, ...cellOf(g, boxes(g)[1]!, text))!;
    expect(next.ui).toEqual(keys(v, ...tabs(2, 1))!);
    expect(next.ui).toEqual({ ...v.ui, focus: 1 });
  }
});

test("CLK-27: a click on line 0 outside the counter, on the tokens of line 38 or on its right side changes nothing", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  const counter = at(g, 0, "? 2");
  for (let x = 0; x < 120; x++) {
    if (x < counter - 1 || x > counter + 3) expect(clicked(v, x, 0)!.ui).toBe(v.ui);
  }
  const cost = at(g, 38, "│");
  const end = at(g, 38, "est.") + len("est.") - 1;
  // The right side of the line has the reworks of the ticket of the selected line
  expect(at(g, 38, "rework TKT-12")).toBeGreaterThan(end);
  for (let x = 0; x < 120; x++) {
    if (x < cost || x > end) expect(clicked(v, x, 38)!.ui).toBe(v.ui);
  }
});

for (const now of ["topology", "thread", "help"] as const) {
  test(`CLK-27: on the screen ${now} a click outside the tabs and the shortcuts changes nothing, in any cell of lines 2 to 37`, () => {
    const v = view("01", { selected: 417, screen: now, focus: 0 });
    const drawn = drawing(v);
    for (let y = 2; y <= 37; y++) {
      for (let x = 0; x < 120; x++) expect(point(entry(v), click(x, y), v, drawn)!.ui).toBe(v.ui);
    }
  });
}

// The modal of answer as it opens: on the first option, or on an empty text
const opened = (question: number, choice: number | null) => ({ question, choice, text: "", expanded: false, sending: false, refused: false });

// Ten more questions with the dev, as the mother forwarded Q-08 in 428: twelve with Q-07 and Q-08
const twelve = (events: SquadEvent[]): SquadEvent[] => [
  ...events,
  ...Array.from({ length: 10 }, (_, i) => ({ ...events.find((e) => e.seq === 428)!, seq: 900 + i, question_id: 20 + i }) as SquadEvent),
];

// The bottom line of the box whose top left corner is at (left, top)
const bottomOf = (g: Grid, left: number, top: number): number => g.rows.findIndex((row, y) => y > top && row[left]!.ch === "└");

// The box of the list of the tab of questions and the one of its detail: their columns and their last line
function tabBox(g: Grid, i: 0 | 1): { left: number; right: number; bottom: number } {
  const [left, right] = boxes(g)[i]!;
  return { left, right, bottom: bottomOf(g, left, 2) };
}

// The box of the history of the tab: the one whose top has its title
function historyBox(g: Grid): { left: number; right: number; top: number; bottom: number } {
  const top = g.rows.findIndex((_, y) => find(g, y, "─ histórico · ").length === 1);
  const left = find(g, top, "┌")[0]!;
  return { left, right: find(g, top, "┐")[0]!, top, bottom: bottomOf(g, left, top) };
}

// The lines of the list of the tab that draw a question: from its head, which has its label, to its route
function questionLines(g: Grid, id: number): number[] {
  const { left, right, bottom } = tabBox(g, 0);
  const lines = [cellOf(g, [left, right], ` ${qid(id)} `, 3, bottom)[1]];
  while (find(g, lines.at(-1)!, "   rota ", left, right).length === 0 && lines.at(-1)! < bottom) lines.push(lines.at(-1)! + 1);
  return lines;
}

// The list of frame 04 is Q-07, with two lines of text and its options, then Q-08, with one line and its default
for (const [question, id, choice, lines] of [[7, 7, 0, 5], [null, 7, 0, 5], [8, 8, null, 4]] as const) {
  test(`CLK-24: with the focus on the list and ${question === null ? "no question" : qid(question)} selected, a click on any line of ${qid(id)} does what enter does: its modal opens and nothing is sent`, () => {
    const v = view("04", { question });
    const g = screen(v);
    const { left, right } = tabBox(g, 0);
    const ys = questionLines(g, id);
    expect(ys.length).toBe(lines);
    for (const y of ys) {
      for (const x of [left + 1, right - 1]) {
        const next = clicked(v, x, y)!;
        expect(next.ui).toEqual(press(v.ui, "\r", v)!);
        expect(next.ui).toEqual({ ...v.ui, question: id, modal: opened(id, choice) });
        expect(next.ui.send).toBeNull();
      }
    }
  });
}

for (const [question, to, key] of [[7, 8, "j"], [null, 8, "j"], [8, 7, "k"]] as const) {
  test(`CLK-25: with ${question === null ? "no question" : qid(question)} selected, a click on any line of ${qid(to)} selects it, as ${key} does, and opens no modal`, () => {
    const v = view("04", { question });
    const g = screen(v);
    const { left, right } = tabBox(g, 0);
    for (const y of questionLines(g, to)) {
      for (const x of [left + 1, right - 1]) {
        const next = clicked(v, x, y)!;
        expect(next.ui).toEqual(keys(v, key)!);
        expect(next.ui).toEqual({ ...v.ui, question: to });
        expect([next.ui.qfocus, next.ui.modal]).toEqual(["list", null]);
      }
    }
  });
}

test("CLK-25: with more questions than fit, a click on a question some places from the selected one selects it, as k or j until it", () => {
  const first = view("04", { question: 7 }, twelve);
  const order = waiting(first.squad).map((q) => q.id);
  expect(order).toEqual([7, 8, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  const line = (v: View, id: number): [x: number, y: number] => [tabBox(screen(v), 0).left + 1, questionLines(screen(v), id)[0]!];
  // The third of the list, two places below the selected one
  const down = clicked(first, ...line(first, 20))!;
  expect(down.ui).toEqual(keys(first, "j", "j")!);
  expect(down.ui).toEqual({ ...first.ui, question: 20 });
  // And back from it to the first
  const third = view("04", { question: 20 }, twelve);
  const up = clicked(third, ...line(third, 7))!;
  expect(up.ui).toEqual(keys(third, "k", "k")!);
  expect(up.ui).toEqual({ ...third.ui, question: 7 });
  // With the fourth selected the list starts at the second: the first is not drawn
  const fourth = view("04", { question: 21 }, twelve);
  expect(find(screen(fourth), 3, "Q-07")).toEqual([]);
  const near = clicked(fourth, ...line(fourth, 20))!;
  expect(near.ui).toEqual(keys(fourth, "k")!);
  expect(near.ui).toEqual({ ...fourth.ui, question: 20 });
});

test("CLK-25: with the focus on the history, a click on a question gives the focus to the list and selects it, and on the selected one it opens no modal", () => {
  const v = view("04", { question: 7, qfocus: "history", historyOffset: 1 });
  const g = screen(v);
  const { left, right } = tabBox(g, 0);
  for (const y of questionLines(g, 7)) {
    for (const x of [left + 1, right - 1]) {
      const next = clicked(v, x, y)!;
      expect(next.ui).toEqual(keys(v, "h")!);
      expect(next.ui).toEqual({ ...v.ui, qfocus: "list" });
      expect(next.ui.modal).toBeNull();
    }
  }
  const other = clicked(v, left + 1, questionLines(g, 8)[0]!)!;
  expect(other.ui).toEqual(keys(v, "h", "j")!);
  expect(other.ui).toEqual({ ...v.ui, qfocus: "list", question: 8 });
  const second = view("04", { question: 8, qfocus: "history" });
  const up = clicked(second, left + 1, questionLines(screen(second), 7)[0]!)!;
  expect(up.ui).toEqual(keys(second, "h", "k")!);
  expect(up.ui).toEqual({ ...second.ui, qfocus: "list", question: 7 });
});

test("CLK-26: a click on the box of the history gives it the focus, as h does from the list, on its border too, and with the focus already on it changes nothing", () => {
  const v = view("04", { question: 8, historyOffset: 1 });
  const g = screen(v);
  const { left, right, top, bottom } = historyBox(g);
  expect(bottom).toBeGreaterThan(top);
  // The four corners of the box, and the label of a resolved question inside it
  const cells = [[left, top], [right, top], [left, bottom], [right, bottom], cellOf(g, [left, right], "Q-10", top, bottom)] as const;
  for (const [x, y] of cells) {
    const next = clicked(v, x, y)!;
    expect(next.ui).toEqual(press(v.ui, "h", v)!);
    expect(next.ui).toEqual({ ...v.ui, qfocus: "history" });
  }
  const there = view("04", { question: 8, qfocus: "history", historyOffset: 1 });
  for (const [x, y] of cells) expect(clicked(there, x, y)!.ui).toBe(there.ui);
});

// The line of the two keys the detail of a question ends with
const DETAIL_KEYS = "enter responder   b próxima bloqueante";

for (const qfocus of ["list", "history"] as const) {
  test(`CLK-27: with the focus on the ${qfocus}, a click on the detail of the tab outside its two keys, on the caption of the list, on its border or on the empty line between two questions changes nothing`, () => {
    const v = view("04", { question: 7, qfocus });
    const g = screen(v);
    const drawn = drawing(v, g);
    const same = (x: number, y: number) => expect(point(entry(v), click(x, y), v, drawn)!.ui).toBe(v.ui);
    const detail = tabBox(g, 1);
    const [kx, ky] = cellOf(g, [detail.left, detail.right], DETAIL_KEYS, 2, detail.bottom);
    for (let y = 2; y <= detail.bottom; y++) {
      for (let x = detail.left; x <= detail.right; x++) {
        if (y !== ky || x < kx || x >= kx + len(DETAIL_KEYS)) same(x, y);
      }
    }
    const list = tabBox(g, 0);
    const caption = "bloqueantes primeiro · depois por tempo restante";
    const [cx, cy] = cellOf(g, [list.left, list.right], caption, 2, list.bottom);
    for (let x = cx; x < cx + len(caption); x++) same(x, cy);
    // The line after the route of Q-07 is empty, and the one after it is the head of Q-08
    const between = questionLines(g, 7).at(-1)! + 1;
    expect(questionLines(g, 8)[0]).toBe(between + 1);
    for (let x = list.left; x <= list.right; x++) same(x, between);
    for (const y of [2, ...questionLines(g, 8), list.bottom]) {
      same(list.left, y);
      same(list.right, y);
    }
  });
}

test("CLK-33: a click on enter responder of the detail does what enter does, and one on b próxima bloqueante what b does", () => {
  const v = view("04", { question: 8 });
  const g = screen(v);
  const detail = tabBox(g, 1);
  const [x, y] = cellOf(g, [detail.left, detail.right], DETAIL_KEYS, 2, detail.bottom);
  // The first and the last cell of `enter` and of `responder`
  for (const cell of [x, x + 4, x + 6, x + 14]) {
    const next = clicked(v, cell, y)!;
    expect(next.ui).toEqual(press(v.ui, "\r", v)!);
    expect(next.ui).toEqual({ ...v.ui, modal: opened(8, null) });
    expect(next.ui.send).toBeNull();
  }
  // And of `b` and of `próxima bloqueante`: Q-07 is the only blocking one
  const b = x + len("enter responder   ");
  for (const cell of [b, b + 2, b + len("b próxima bloqueante") - 1]) {
    const next = clicked(v, cell, y)!;
    expect(next.ui).toEqual(press(v.ui, "b", v)!);
    expect(next.ui).toEqual({ ...v.ui, question: 7 });
  }
  // The spaces between them are of no key
  for (const cell of [x + 5, x + 15, x + 16, x + 17, b + 1]) expect(clicked(v, cell, y)!.ui).toBe(v.ui);
  // With the focus on the history enter takes it to the list with the modal
  const far = view("04", { question: 8, qfocus: "history" });
  expect(clicked(far, x, y)!.ui).toEqual({ ...far.ui, qfocus: "list", modal: opened(8, null) });
});

// The wheel up and the wheel down, with the key each one is
const WHEEL = [
  [64, "k", "up"],
  [65, "j", "down"],
] as const;

// The state after a report of a button on the cell (x, y) of the screen of the view, as it is drawn
const sent = (v: View, button: number, x: number, y: number, pointer: Pointer = ON): Entry | null => point(entry(v, pointer), report(button, x, y), v, drawing(v));

for (const [button, key, way] of WHEEL) {
  test(`CLK-28: the wheel ${way} over the feed does what three ${key} do, anywhere in its box`, () => {
    // 417 has three lines above it and three below it: 414 and 420 are the third ones
    const v = view("01", { selected: 417 });
    const to = key === "k" ? 414 : 420;
    expect(v.rows[v.rows.findIndex((row) => row.seq === 417) + (key === "k" ? -3 : 3)]!.seq).toBe(to);
    const g = screen(v);
    const [left, right] = boxes(g)[1]!;
    // The four corners of the box, its header, the selected line and another one
    for (const [x, y] of [[left, 2], [right, 2], [left, 37], [right, 37], cellOf(g, [left, right], "hora"), feedCell(g, "14:28:03"), feedCell(g, "14:19:05")] as const) {
      const next = sent(v, button, x, y)!;
      expect(next.ui).toEqual(keys(v, key, key, key)!);
      expect(next.ui).toEqual({ ...v.ui, selected: to });
    }
    // Two keys, or four, would stop on another line
    expect([keys(v, key, key)!.selected, keys(v, key, key, key, key)!.selected]).not.toContain(to);
  });

  test(`CLK-28: the wheel ${way} over the feed gives the focus to the feed from another panel, and shift, alt and ctrl do not change what it does`, () => {
    for (const focus of [0, 2] as const) {
      const v = view("01", { selected: 417, focus });
      const next = sent(v, button, ...feedCell(screen(v), "14:19:05"))!;
      expect(next.ui).toEqual(keys(v, ...tabs(focus, 1), key, key, key)!);
      expect(next.ui).toEqual({ ...v.ui, focus: 1, selected: key === "k" ? 414 : 420 });
    }
    const v = view("01", { selected: 417 });
    for (const held of [4, 8, 16, 28]) expect(sent(v, button + held, ...feedCell(screen(v), "14:19:05"))!.ui).toEqual(keys(v, key, key, key)!);
  });
}

test("edge case: the wheel up over the feed with no line selected does what three k do there: the first selects the last line", () => {
  const v = view("01", { selected: null });
  const cell = feedCell(screen(v), "14:19:05");
  const up = sent(v, 64, ...cell)!;
  expect(up.ui).toEqual(keys(v, "k", "k", "k")!);
  // The last line and two above it
  expect(up.ui.selected).toBe(v.rows.at(-3)!.seq);
  expect(up.ui.selected).toBe(430);
  // And down, the three j: the first selects the last line, where the others stay
  const down = sent(v, 65, ...cell)!;
  expect(down.ui).toEqual(keys(v, "j", "j", "j")!);
  expect(down.ui.selected).toBe(432);
});

for (const [button, key, way] of WHEEL) {
  test(`CLK-29: the wheel ${way} over the box of the thread does what one ${key} does: the entries scroll by one`, () => {
    const v = view("01", { screen: "thread", selected: 417, threadOffset: 2 });
    const g = screen(v);
    const [left, right] = boxes(g)[0]!;
    for (const [x, y] of [[left, 2], [right, 2], [left, 37], [right, 37], cellOf(g, [left, right], "[verdict]")] as const) {
      const next = sent(v, button, x, y)!;
      expect(next.ui).toEqual(press(v.ui, key, v)!);
      expect(next.ui).toEqual({ ...v.ui, threadOffset: key === "k" ? 3 : 1 });
    }
  });

  test(`CLK-30: the wheel ${way} over the box of the list does what one ${key} does with the focus on the list, and from the history the focus goes to the list first`, () => {
    // The list of frame 04 is Q-07, then Q-08
    const [from, to] = key === "j" ? [7, 8] : [8, 7];
    for (const qfocus of ["list", "history"] as const) {
      const v = view("04", { question: from, qfocus, historyOffset: 1 });
      const g = screen(v);
      const { left, right, bottom } = tabBox(g, 0);
      const cells = [[left, 2], [right, 2], [left, bottom], [right, bottom], [left + 1, questionLines(g, 7)[0]!], cellOf(g, [left, right], "bloqueantes primeiro", 2, bottom)] as const;
      for (const [x, y] of cells) {
        const next = sent(v, button, x, y)!;
        expect(next.ui).toEqual(keys(v, ...(qfocus === "history" ? ["h"] : []), key)!);
        expect(next.ui).toEqual({ ...v.ui, qfocus: "list", question: to });
      }
    }
  });

  test(`CLK-31: the wheel ${way} over the box of the history does what one ${key} does with the focus on it, and from the list the focus goes to the history first`, () => {
    // Frame 04 has six resolved questions: the history scrolls from 0 to 2
    for (const qfocus of ["history", "list"] as const) {
      const v = view("04", { question: 8, qfocus, historyOffset: 1 });
      const g = screen(v);
      const { left, right, top, bottom } = historyBox(g);
      for (const [x, y] of [[left, top], [right, top], [left, bottom], [right, bottom], cellOf(g, [left, right], "Q-10", top, bottom)] as const) {
        const next = sent(v, button, x, y)!;
        expect(next.ui).toEqual(keys(v, ...(qfocus === "list" ? ["h"] : []), key)!);
        expect(next.ui).toEqual({ ...v.ui, qfocus: "history", historyOffset: key === "k" ? 0 : 2 });
      }
    }
  });
}

// The cells of the 40 lines outside the boxes the wheel rolls on a screen
function outside(g: Grid, rolled: { left: number; right: number; top: number; bottom: number }[]): [x: number, y: number][] {
  const cells: [number, number][] = [];
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < 120; x++) {
      if (!rolled.some((box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)) cells.push([x, y]);
    }
  }
  return cells;
}

// What the wheel rolls on each screen: the feed, the thread, the list and the history
const ROLLED: [what: string, v: View, boxes: (g: Grid) => { left: number; right: number; top: number; bottom: number }[]][] = [
  ["the agents, the tickets, the detail and lines 0, 1, 38 and 39 of the main screen", view("01", { selected: 417, focus: 0 }), (g) => [{ left: boxes(g)[1]![0], right: boxes(g)[1]![1], top: 2, bottom: 37 }]],
  ["the topology", view("01", { selected: 417, screen: "topology" }), () => []],
  ["the help", view("01", { selected: 417, screen: "help" }), () => []],
  ["the box of the judge and lines 0, 1, 38 and 39 of the thread", view("01", { selected: 417, screen: "thread", threadOffset: 2 }), (g) => [{ left: boxes(g)[0]![0], right: boxes(g)[0]![1], top: 2, bottom: 37 }]],
  ["the detail of the tab of questions and its lines 0, 1, 38 and 39", view("04", { question: 7, historyOffset: 1 }), (g) => [{ ...tabBox(g, 0), top: 2 }, historyBox(g)]],
];

for (const [what, v, rolled] of ROLLED) {
  test(`CLK-32: the wheel over ${what} changes nothing`, () => {
    const g = screen(v);
    const cells = outside(g, rolled(g));
    // Every cell outside what the wheel rolls, which is not the whole screen
    expect(cells.length).toBeGreaterThan(4 * 120);
    for (const [x, y] of cells) {
      for (const [button] of WHEEL) expect(point(entry(v), report(button, x, y), v, drawing(v, g))!.ui).toBe(v.ui);
    }
  });
}

test("CLK-46: the wheel is no click: it leaves the time of the last click as it was", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  // Over the feed, where it moves the selection, and over the agents, where it does nothing
  for (const [x, y] of [feedCell(g, "14:19:05"), cellOf(g, boxes(g)[0]!, "mother")] as const) {
    for (const [button] of WHEEL) {
      expect(sent(v, button, x, y)!.pointer).toEqual({ on: true, clickedAt: null });
      expect(sent(v, button, x, y, { on: true, clickedAt: 5 })!.pointer).toEqual({ on: true, clickedAt: 5 });
    }
  }
});

test("CLK-11, CLK-13, CLK-14: the wheel changes nothing outside the grid, with nothing drawn and over the drawing of another screen", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  const [x, y] = feedCell(g, "14:19:05");
  for (const [button] of WHEEL) {
    expect(point(entry(v), report(button, x, y), v, null)!.ui).toBe(v.ui);
    const other = view("01", { selected: 417, screen: "thread", threadOffset: 2 });
    expect(point(entry(other), report(button, x, y), other, drawing(v, g))!.ui).toBe(other.ui);
    for (const [column, line] of [[0, y + 1], [121, y + 1], [x + 1, 0], [x + 1, 41], [HUGE, y + 1], [x + 1, HUGE]] as const) {
      expect(point(entry(v), `\x1b[<${button};${column};${line}M`, v, drawing(v, g))!.ui).toBe(v.ui);
    }
    // Over its own drawing it moves the selection
    expect(point(entry(v), report(button, x, y), v, drawing(v, g))!.ui.selected).not.toBe(417);
  }
});

// The view of a frame of the modal with its modal changed: 05 is Q-07 on the first of its three
// options, 20a is Q-09 on the first of its two, 06 and 07 are Q-08 with a text, 20b is Q-08 refused
function open(frame: string, modal: Partial<Modal> = {}): View {
  return view(frame, { modal: { ...frameView(frame).ui.modal!, ...modal } });
}
const m = (v: View): Modal => v.ui.modal!;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
const inside = (box: Box, x: number, y: number): boolean => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

// The box of the modal of answer: the one whose top has its title
function modalBox(g: Grid): Box {
  const top = g.rows.findIndex((_, y) => find(g, y, "┌─ ? responder Q-").length === 1);
  const left = find(g, top, "┌─ ? responder Q-")[0]!;
  return { left, right: find(g, top, "┐").find((x) => x > left)!, top, bottom: bottomOf(g, left, top) };
}

// The lines of the choice mode of each frame that has it, the last one being the other answer
const CHOICES = [
  ["05", 7, ["infinito com backoff", "5 tentativas", "configurável", "outra resposta…"]],
  ["20a", 9, ["pronto", "não vou fornecer", "outra resposta…"]],
] as const;

// The line of the modal that draws the option of an index, with its number before it
const optionLine = (g: Grid, box: Box, option: number, label: string): number => cellOf(g, [box.left, box.right], ` ${option + 1}  ${label}`, box.top, box.bottom)[1];

for (const [frame, question, labels] of CHOICES) {
  const other = labels.length - 1;

  test(`CLK-41: in the choice mode of frame ${frame} a click on the line of an option marks it and sends nothing, from any marked line and on the marked one too`, () => {
    for (let from = 0; from <= other; from++) {
      const v = open(frame, { choice: from });
      const g = screen(v);
      const box = modalBox(g);
      for (let option = 0; option < other; option++) {
        const y = optionLine(g, box, option, labels[option]!);
        // The first and the last of the 80 columns inside the box
        for (const x of [box.left + 1, box.right - 1]) {
          const next = clicked(v, x, y)!;
          expect(next.ui).toEqual(keys(v, ...Array<string>(Math.abs(option - from)).fill(option < from ? "k" : "j"))!);
          expect(next.ui).toEqual({ ...v.ui, modal: { ...m(v), choice: option } });
          expect(next.ui.send).toBeNull();
        }
        // The border of the line is of no option
        for (const x of [box.left, box.right]) expect(clicked(v, x, y)!.ui).toBe(v.ui);
      }
    }
  });

  test(`CLK-42: in the choice mode of frame ${frame} a click on outra resposta… goes to the text mode with the field empty, from any marked line, and sends nothing`, () => {
    for (let from = 0; from <= other; from++) {
      // A text left from before does not come back
      const v = open(frame, { choice: from, text: "antes" });
      const g = screen(v);
      const box = modalBox(g);
      const y = optionLine(g, box, other, labels[other]!);
      for (const x of [box.left + 1, box.right - 1]) {
        const next = clicked(v, x, y)!;
        expect(next.ui).toEqual(keys(v, ...Array<string>(other - from).fill("j"), "\r")!);
        expect(next.ui).toEqual({ ...v.ui, modal: { question, choice: null, text: "", expanded: false, sending: false, refused: false } });
        expect(next.ui.send).toBeNull();
      }
    }
  });
}

test("CLK-41: a click over the line an option had, after the modal went to the text mode, adds nothing to the text", () => {
  // The choice mode is the one drawn, and the state is on the text
  const drawn = open("05");
  const g = screen(drawn);
  const box = modalBox(g);
  const v = open("05", { choice: null, text: "abc" });
  CHOICES[0][2].forEach((label, option) => {
    expect(point(entry(v), click(box.left + 1, optionLine(g, box, option, label)), v, drawing(drawn, g))!.ui).toBe(v.ui);
  });
});

for (const frame of ["05", "06", "07", "20a"]) {
  test(`CLK-43: with the modal of frame ${frame} a click on any cell of lines 0 to 38 outside its box does what esc does: the modal closes and nothing is sent, also with a text typed`, () => {
    const v = open(frame);
    const g = screen(v);
    const box = modalBox(g);
    const closed = press(v.ui, "\x1b", v)!;
    expect(closed).toEqual({ ...v.ui, modal: null });
    expect(closed.send).toBeNull();
    // The margin around the box is empty, and is not of the box
    expect([g.rows[box.top - 1]![box.left - 1]!.ch, g.rows[box.bottom + 1]![box.right + 1]!.ch]).toEqual([" ", " "]);
    for (let y = 0; y <= 38; y++) {
      for (let x = 0; x < 120; x++) {
        if (!inside(box, x, y)) expect(point(entry(v), click(x, y), v, drawing(v, g))!.ui).toEqual(closed);
      }
    }
  });
}

// What the box of the modal has in each frame, and the lines of the choice mode it has
const BOXES = [
  ["05", ["contexto", "por quê ", "worker-1 pergunta", "Reconexão do stream", "efeito  "], CHOICES[0][2]],
  ["20a", ["contexto", "efeito  "], CHOICES[1][2]],
  ["06", ["contexto", "Setlist sem capa", "resposta  (uma linha", "█", "40 chars", "⚠ a resposta fica gravada no log", "efeito  "], []],
  ["07", ["contexto", "resposta  (expandido", "█", "⚠ a resposta fica gravada no log"], []],
] as const;

for (const [frame, parts, labels] of BOXES) {
  test(`CLK-44: in the modal of frame ${frame} a click on a cell of its box that is not inside a line of the choice mode changes nothing: the context, the text of the question, the field, the warning and the border`, () => {
    const v = open(frame);
    const g = screen(v);
    const box = modalBox(g);
    for (const text of parts) cellOf(g, [box.left, box.right], text, box.top, box.bottom);
    const lines = labels.map((label, option) => optionLine(g, box, option, label));
    for (let y = box.top; y <= box.bottom; y++) {
      for (let x = box.left; x <= box.right; x++) {
        if (!lines.includes(y) || x === box.left || x === box.right) expect(point(entry(v), click(x, y), v, drawing(v, g))!.ui).toBe(v.ui);
      }
    }
  });
}

// The first and the last cell of the key of a shortcut of line 39, and of what it does
function shortcut(g: Grid, label: string, does: string): number[] {
  const x = at(g, 39, `${label} ${does}`);
  return [x, x + len(label) - 1, x + len(label) + 1, x + len(label) + len(does)];
}

const DOWN = "\x1b[B";

test("CLK-45: in the choice mode a click on enter confirmar leaves the marked option to send, as enter does, and on the line of the other answer it goes to the text", () => {
  for (const [frame, choice, question_id, answer] of [["05", 0, 7, "infinito com backoff"], ["05", 1, 7, "5 tentativas"], ["20a", 1, 9, "não vou fornecer"]] as const) {
    const v = open(frame, { choice });
    for (const x of shortcut(screen(v), "enter", "confirmar")) {
      const next = clicked(v, x, 39)!;
      expect(next.ui).toEqual(press(v.ui, "\r", v)!);
      expect(next.ui).toEqual({ ...v.ui, modal: { ...m(v), sending: true }, send: { question_id, answer } });
    }
  }
  const other = open("05", { choice: 3 });
  for (const x of shortcut(screen(other), "enter", "confirmar")) {
    expect(clicked(other, x, 39)!.ui).toEqual({ ...other.ui, modal: { ...m(other), choice: null, text: "" } });
  }
});

test("CLK-45: in the text mode a click on enter enviar leaves the text to send, as enter does, and sends neither an empty text nor one of only spaces", () => {
  const v = open("06");
  for (const x of shortcut(screen(v), "enter", "enviar")) {
    const next = clicked(v, x, 39)!;
    expect(next.ui).toEqual(press(v.ui, "\r", v)!);
    expect(next.ui).toEqual({ ...v.ui, modal: { ...m(v), sending: true }, send: { question_id: 8, answer: "logo da 89, com o nome do programa no ar" } });
  }
  // The text goes without the spaces of its ends
  const padded = open("06", { text: "  logo da 89  " });
  expect(clicked(padded, at(screen(padded), 39, "enter enviar"), 39)!.ui.send).toEqual({ question_id: 8, answer: "logo da 89" });
  for (const text of ["", " ", "    "]) {
    const empty = open("06", { text });
    for (const x of shortcut(screen(empty), "enter", "enviar")) {
      const next = clicked(empty, x, 39)!;
      expect(next.ui).toBe(empty.ui);
      expect(next.ui.send).toBeNull();
    }
  }
});

test("CLK-45: a click on esc cancelar closes the modal with nothing sent, in the two modes", () => {
  for (const v of [open("05", { choice: 2 }), open("20a"), open("06"), open("07")]) {
    for (const x of shortcut(screen(v), "esc", "cancelar")) {
      const next = clicked(v, x, 39)!;
      expect(next.ui).toEqual(press(v.ui, "\x1b", v)!);
      expect(next.ui).toEqual({ ...v.ui, modal: null });
      expect(next.ui.send).toBeNull();
    }
  }
});

test("CLK-45: a click on ctrl+e changes the size of the field, and one on ctrl+u empties it", () => {
  const small = open("06");
  for (const x of shortcut(screen(small), "ctrl+e", "expandir")) {
    const next = clicked(small, x, 39)!;
    expect(next.ui).toEqual(press(small.ui, "\x05", small)!);
    expect(next.ui).toEqual({ ...small.ui, modal: { ...m(small), expanded: true } });
  }
  const large = open("07");
  for (const x of shortcut(screen(large), "ctrl+e", "recolher")) expect(clicked(large, x, 39)!.ui).toEqual({ ...large.ui, modal: { ...m(large), expanded: false } });
  for (const v of [small, large]) {
    expect(m(v).text).not.toBe("");
    for (const x of shortcut(screen(v), "ctrl+u", "limpar")) {
      const next = clicked(v, x, 39)!;
      expect(next.ui).toEqual(press(v.ui, "\x15", v)!);
      expect(next.ui).toEqual({ ...v.ui, modal: { ...m(v), text: "" } });
    }
  }
});

test("CLK-45: a click on ↑ or on ↓ moves the mark of the choice mode by one line, and one on what they do, on the range of the digits or on the rest of the line changes nothing", () => {
  const v = open("05", { choice: 1 });
  const g = screen(v);
  const x = at(g, 39, "↑↓ mover");
  const up = clicked(v, x, 39)!;
  expect(up.ui).toEqual(press(v.ui, UP, v)!);
  expect(up.ui).toEqual({ ...v.ui, modal: { ...m(v), choice: 0 } });
  const down = clicked(v, x + 1, 39)!;
  expect(down.ui).toEqual(press(v.ui, DOWN, v)!);
  expect(down.ui).toEqual({ ...v.ui, modal: { ...m(v), choice: 2 } });
  for (let cell = x + 2; cell < x + len("↑↓ mover"); cell++) expect(clicked(v, cell, 39)!.ui).toBe(v.ui);
  const range = at(g, 39, "1-4 escolher");
  for (let cell = range; cell < range + len("1-4 escolher"); cell++) expect(clicked(v, cell, 39)!.ui).toBe(v.ui);
  // Before the first shortcut, between two of them and after the last one
  const end = at(g, 39, "esc cancelar") + len("esc cancelar");
  for (const cell of [0, x - 1, end, end + 1, 119]) expect(clicked(v, cell, 39)!.ui).toBe(v.ui);
});

test("CLK-40: with the modal open a click hits nothing the tab drew before it, a question or the history, and without it nothing the modal drew, an option or its box", () => {
  // A key of the chunk opened the modal after the tab was drawn
  const tab = view("04", { question: 7 });
  const under = screen(tab);
  const state = open("05", { choice: 1 });
  const list = tabBox(under, 0);
  const history = historyBox(under);
  for (const [x, y] of [[list.left + 1, questionLines(under, 7)[0]!], [list.left + 1, questionLines(under, 8)[0]!], [history.left, history.top], [history.right, history.bottom]] as const) {
    expect(point(entry(state), click(x, y), state, drawing(tab, under))!.ui).toBe(state.ui);
  }
  // And one closed it after it was drawn
  const drawn = open("05");
  const over = screen(drawn);
  const box = modalBox(over);
  CHOICES[0][2].forEach((label, option) => {
    expect(point(entry(tab), click(box.left + 1, optionLine(over, box, option, label)), tab, drawing(drawn, over))!.ui).toBe(tab.ui);
  });
  for (const [x, y] of [[box.left, box.top], [box.left - 1, box.top - 1], [119, 38]] as const) expect(point(entry(tab), click(x, y), tab, drawing(drawn, over))!.ui).toBe(tab.ui);
});

// A cell of each thing a click does in the choice mode of frame 05: the line of its second
// option, the shortcut that confirms, the first cell of the screen and the margin of the box
function targets(g: Grid): { option: [number, number]; enter: [number, number]; corner: [number, number]; margin: [number, number] } {
  const box = modalBox(g);
  return { option: [box.left + 1, optionLine(g, box, 1, "5 tentativas")], enter: [at(g, 39, "enter confirmar"), 39], corner: [0, 0], margin: [box.left - 1, box.top - 1] };
}

test("CLK-46: with the modal open a click that comes 499 ms after the one before changes nothing and sends nothing, on an option, on enter confirmar and outside the box", () => {
  const v = open("05");
  const g = screen(v);
  for (const ms of [499, 250, 1, 0]) {
    for (const [x, y] of Object.values(targets(g))) {
      const next = point(entry(v, { on: true, clickedAt: v.squad.now - ms }), click(x, y), v, drawing(v, g))!;
      expect(next.ui).toBe(v.ui);
      expect(next.ui.send).toBeNull();
      // And it is the click before the next one
      expect(next.pointer).toEqual({ on: true, clickedAt: v.squad.now });
    }
  }
});

test("edge case: with the modal open a click that comes 500 ms or more after the one before is treated by the rules of the modal", () => {
  const v = open("05");
  const g = screen(v);
  const { option, enter, corner, margin } = targets(g);
  for (const ms of [500, 501, 60_000]) {
    const after = (cell: [number, number]) => point(entry(v, { on: true, clickedAt: v.squad.now - ms }), click(...cell), v, drawing(v, g))!.ui;
    expect(after(option)).toEqual({ ...v.ui, modal: { ...m(v), choice: 1 } });
    expect(after(enter)).toEqual({ ...v.ui, modal: { ...m(v), sending: true }, send: { question_id: 7, answer: "infinito com backoff" } });
    expect(after(corner)).toEqual({ ...v.ui, modal: null });
    expect(after(margin)).toEqual({ ...v.ui, modal: null });
  }
});

test("CLK-46: the third click of a triple one is ignored too: each click is measured from the one before it, also from one that did nothing", () => {
  const v = open("05");
  const { option, enter } = targets(screen(v));
  // The first click marks the second option
  const first = point(entry(v), click(...option), v, drawing(v))!;
  expect(first.ui.modal!.choice).toBe(1);
  // The second comes 300 ms after it and the third 300 ms after the second, on the shortcut that confirms
  const second = point(first, click(...enter), later({ ...v, ui: first.ui }, 300), drawing({ ...v, ui: first.ui }))!;
  expect(second.ui).toBe(first.ui);
  const third = point(second, click(...enter), later({ ...v, ui: first.ui }, 600), drawing({ ...v, ui: first.ui }))!;
  expect(third.ui).toBe(first.ui);
  expect(third.ui.send).toBeNull();
  expect(third.pointer.clickedAt).toBe(v.squad.now + 600);
  // One that comes 500 ms after the third confirms the option
  const fourth = point(third, click(...enter), later({ ...v, ui: first.ui }, 1100), drawing({ ...v, ui: first.ui }))!;
  expect(fourth.ui.send).toEqual({ question_id: 7, answer: "5 tentativas" });
});

test("CLK-46: the click that opens the modal counts when it comes 100 ms after another one", () => {
  // On the feed, the selected line of Q-07 where it reached the dev; on the tab, the selected question
  const home = view("01", { selected: 422 });
  const fast: Pointer = { on: true, clickedAt: home.squad.now - 100 };
  const feed = point(entry(home, fast), click(...feedCell(screen(home), "14:29:40")), home, drawing(home))!;
  expect(feed.ui).toEqual({ ...home.ui, screen: "questions", question: 7, qfocus: "list", modal: opened(7, 0) });
  const tab = view("04", { question: 8 });
  const g = screen(tab);
  const asked = point(entry(tab, fast), click(tabBox(g, 0).left + 1, questionLines(g, 8)[0]!), tab, drawing(tab, g))!;
  expect(asked.ui).toEqual({ ...tab.ui, modal: opened(8, null) });
});

// The cells of line 39 of the key of a shortcut and of what it does
function cellsOf(g: Grid, label: string, does: string): number[] {
  const x = at(g, 39, `${label} ${does}`);
  return Array.from({ length: len(label) + 1 + len(does) }, (_, i) => x + i).filter((cell) => cell !== x + len(label));
}

test("CLK-46: a double click on enter abrir over a question opens its modal and sends nothing: the second click, on enter confirmar, is ignored", () => {
  // 422 is Q-07 where it reached the dev: enter opens its modal on the first of its options
  const v = view("01", { selected: 422 });
  const opens = press(v.ui, "\r", v)!;
  expect(opens.modal).toEqual(opened(7, 0));
  // The cells where the main screen has enter abrir and the modal has enter confirmar
  const confirm = cellsOf(screen({ ...v, ui: opens }), "enter", "confirmar");
  const both = cellsOf(screen(v), "enter", "abrir").filter((x) => confirm.includes(x));
  expect(both.length).toBeGreaterThan(0);
  for (const x of both) {
    const first = clicked(v, x, 39)!;
    expect(first.ui).toEqual(opens);
    // The screen is drawn again with the modal before the second click
    for (const ms of [0, 100, 499]) {
      const then = later({ ...v, ui: first.ui }, ms);
      const second = point(first, click(x, 39), then, drawing(then))!;
      expect(second.ui).toBe(first.ui);
      expect(second.ui.send).toBeNull();
    }
    // What the rule holds back: the same click 500 ms later confirms the first option
    const slow = later({ ...v, ui: first.ui }, 500);
    expect(point(first, click(x, 39), slow, drawing(slow))!.ui.send).toEqual({ question_id: 7, answer: "infinito com backoff" });
  }
});

test("CLK-47: while the answer waits for the broker no click and no wheel changes the modal, in any cell of the screen", () => {
  for (const frame of ["05", "06"]) {
    const sending = open(frame, { sending: true });
    const v: View = { ...sending, ui: { ...sending.ui, send: { question_id: m(sending).question, answer: "x" } } };
    const drawn = drawing(v);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 120; x++) {
        for (const button of [0, 64, 65]) expect(point(entry(v), report(button, x, y), v, drawn)!.ui).toBe(v.ui);
      }
    }
  }
});

test("CLK-47: with the refused answer a click only closes the modal, outside its box or on the shortcut of esc, and no other cell does anything", () => {
  const v = open("20b");
  expect(m(v).refused).toBe(true);
  const g = screen(v);
  const box = modalBox(g);
  const esc = cellsOf(g, "esc", "fechar");
  expect(esc.length).toBe(9);
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < 120; x++) {
      const next = point(entry(v), click(x, y), v, drawing(v, g))!;
      if (y === 39 ? esc.includes(x) : !inside(box, x, y)) expect(next.ui).toEqual({ ...v.ui, modal: null });
      else expect(next.ui).toBe(v.ui);
    }
  }
});

for (const frame of ["05", "06", "07", "20a", "20b"]) {
  test(`CLK-48: with the modal of frame ${frame} the wheel changes nothing in any cell of the screen`, () => {
    const v = open(frame);
    const drawn = drawing(v);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 120; x++) {
        for (const [button] of WHEEL) expect(point(entry(v), report(button, x, y), v, drawn)!.ui).toBe(v.ui);
      }
    }
  });
}

test("CLK-48: with the modal open the wheel changes nothing whatever the cell has", () => {
  // A drawing no screen makes: the wheel of the list and the key of enter in every cell, marked as of the modal
  const v = open("05", { choice: 1 });
  for (const wheel of ["feed", "thread", "list", "history"] as const) {
    const g = grid();
    g.mark(0, 0, 120, 40, { modal: true, wheel, key: "\r" });
    for (const [button] of WHEEL) expect(point(entry(v), report(button, 10, 10), v, drawing(v, g))!.ui).toBe(v.ui);
  }
});

test("CLK-49: with the modal open, of the clicks on every cell of the screen only the ones on the shortcut of enter leave an answer to send", () => {
  for (const [frame, does] of [["05", "confirmar"], ["20a", "confirmar"], ["06", "enviar"], ["07", "enviar"]] as const) {
    const v = open(frame);
    const g = screen(v);
    const enter = cellsOf(g, "enter", does);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 120; x++) {
        const next = point(entry(v), click(x, y), v, drawing(v, g))!;
        expect(next.ui.send !== null).toBe(y === 39 && enter.includes(x));
      }
    }
  }
});

test("CLK-49: with no modal open no click and no wheel leaves an answer to send, in any cell of any screen", () => {
  // The selected line of the feed is the one of a question that waits for the dev, and the tab has its question selected
  const views = [...ALL_SCREENS.map((now) => view("01", { selected: 422, screen: now })), view("04", { question: 7 }), view("04", { question: 8, qfocus: "history" })];
  for (const v of views) {
    const drawn = drawing(v);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 120; x++) {
        for (const button of [0, 64, 65]) {
          // Null is the click on the shortcut that quits
          const next = point(entry(v), report(button, x, y), v, drawn);
          if (next) expect(next.ui.send).toBeNull();
        }
      }
    }
  }
});

// The state after one read of the input over the screen of the view, as it is drawn
const taken = (v: View, chunk: string, pointer: Pointer = ON, more = false): Entry | null => take(entry(v, pointer), chunk, v, more, drawing(v));

test("CLK-15: a key and a click of the same read are applied in the order they came: k and then the click is not the click and then k", () => {
  const v = view("01", { selected: 417 });
  const g = screen(v);
  // A click on the line the drawing has as the selected one
  const hit = click(...feedCell(g, "14:28:03"));
  // k selects the line above, and the click selects the clicked line again
  const keyFirst = taken(v, "k" + hit)!;
  const moved = input(v.ui, "k", v)!;
  expect(moved.selected).toBe(416);
  expect(keyFirst).toEqual(point({ ui: moved, pointer: ON }, hit, v, drawing(v, g))!);
  expect([keyFirst.ui.screen, keyFirst.ui.selected, keyFirst.ui.threadOffset]).toEqual(["main", 417, 0]);
  // The click opens the thread of the selected line, and k scrolls it
  const clickFirst = taken(v, hit + "k")!;
  const shown = point(entry(v), hit, v, drawing(v, g))!;
  expect(shown.ui.screen).toBe("thread");
  expect(clickFirst).toEqual({ ui: input(shown.ui, "k", { ...v, ui: shown.ui })!, pointer: shown.pointer });
  expect([clickFirst.ui.screen, clickFirst.ui.selected, clickFirst.ui.threadOffset]).toEqual(["thread", 417, 1]);
});

test("CLK-15: a key that changes the screen and a click of the same read: the click after it falls on the drawing of the screen that was, and does nothing", () => {
  const v = view("01", { selected: 417 });
  const pause = click(at(screen(v), 39, "p pausa"), 39);
  expect(taken(v, "2" + pause)!.ui).toEqual({ ...v.ui, screen: "topology" });
  expect(taken(v, pause + "2")!.ui).toEqual({ ...v.ui, screen: "topology", paused: true });
  // Three items: the click, the key and the click again
  expect(taken(v, pause + "2" + pause)!.ui).toEqual({ ...v.ui, screen: "topology", paused: true });
  expect(taken(v, pause + pause + "2")!.ui).toEqual({ ...v.ui, screen: "topology" });
});

test("CLK-15: three reports of the wheel in one read are three steps of it", () => {
  const v = view("01", { selected: 417 });
  const down = report(65, ...feedCell(screen(v), "14:19:05"));
  const next = taken(v, down + down + down)!;
  expect(next.ui).toEqual(keys(v, ...Array<string>(9).fill("j"))!);
  // Nine lines below the selected one
  expect(next.ui.selected).toBe(v.rows[v.rows.findIndex((row) => row.seq === 417) + 9]!.seq);
  expect(next.ui.selected).toBe(426);
  expect(next.pointer).toEqual(ON);
  // And up and down again in the same read
  const up = report(64, ...feedCell(screen(v), "14:19:05"));
  expect(taken(v, up + down + down)!.ui.selected).toBe(420);
});

test("CLK-15, CLK-49: enter that opens the modal and a click in the same read: the click falls on the drawing without the modal, does nothing, and nothing is sent", () => {
  // The tab with Q-07 selected: the shortcut of enter, the key of the detail, the line of the question and a tab
  const tab = view("04", { question: 7 });
  const g = screen(tab);
  const detail = tabBox(g, 1);
  const cells = [[at(g, 39, "enter responder"), 39], cellOf(g, [detail.left, detail.right], DETAIL_KEYS, 2, detail.bottom), [tabBox(g, 0).left + 1, questionLines(g, 7)[0]!], [at(g, 1, "2 topologia"), 1]] as const;
  for (const [x, y] of cells) {
    const next = taken(tab, "\r" + click(x, y))!;
    expect(next.ui).toEqual({ ...tab.ui, modal: opened(7, 0) });
    expect(next.ui.send).toBeNull();
    // Alone in its read each of those clicks does something
    expect(taken(tab, click(x, y))!.ui).not.toEqual(tab.ui);
  }
  // On the feed, over the line of Q-07 where it reached the dev: the screen changed too
  const home = view("01", { selected: 422 });
  const next = taken(home, "\r" + click(at(screen(home), 39, "enter abrir"), 39))!;
  expect(next.ui).toEqual({ ...home.ui, screen: "questions", question: 7, qfocus: "list", modal: opened(7, 0) });
  expect(next.ui.send).toBeNull();
});

// Three reports that do nothing with the modal open, over a cell of its box: a click on the
// line of its context, the release of the button and the wheel
function inert(v: View): string[] {
  const box = modalBox(screen(v));
  return [click(box.left + 1, box.top + 1), report(0, box.left + 1, box.top + 1, "m"), report(64, box.left + 1, box.top + 1)];
}

for (const [eol, name] of [["\r", "\\r"], ["\n", "\\n"]] as const) {
  test(`CLK-16: with the modal open, ${name} in the read of a report is a pasted line break, before or after the report: a space in the text mode, nothing in the choice mode, and nothing is sent`, () => {
    const text = open("06", { text: "logo" });
    const choice = open("05", { choice: 1 });
    for (const i of [0, 1, 2]) {
      for (const order of ["after", "before"] as const) {
        const read = (v: View): string => (order === "after" ? inert(v)[i]! + eol : eol + inert(v)[i]!);
        const typed = taken(text, read(text))!;
        expect(typed.ui).toEqual({ ...text.ui, modal: { ...m(text), text: "logo " } });
        expect(typed.ui.send).toBeNull();
        const chosen = taken(choice, read(choice))!;
        expect(chosen.ui).toEqual(choice.ui);
        expect(chosen.ui.send).toBeNull();
      }
    }
    // With the mouse off the report is still an item of its read
    const off: Pointer = { on: false, clickedAt: null };
    expect(taken(text, inert(text)[0]! + eol, off)!.ui).toEqual({ ...text.ui, modal: { ...m(text), text: "logo " } });
    expect(taken(choice, eol + inert(choice)[0]!, off)!.ui).toEqual(choice.ui);
  });
}

test("CLK-16: enter alone in its read still sends, and a report alone changes nothing", () => {
  const text = open("06", { text: "logo" });
  expect(taken(text, "\r")!.ui.send).toEqual({ question_id: 8, answer: "logo" });
  const choice = open("05", { choice: 1 });
  expect(taken(choice, "\r")!.ui.send).toEqual({ question_id: 7, answer: "5 tentativas" });
  for (const v of [text, choice]) {
    for (const item of inert(v)) expect(taken(v, item)!.ui).toBe(v.ui);
  }
});

test("CLK-50: m with the mouse on turns it off and says so for 4 s, and m again turns it on and says so, on every screen", () => {
  for (const now of ALL_SCREENS) {
    const v = view("01", { selected: 417, screen: now });
    const off = taken(v, "m", { on: true, clickedAt: 5 })!;
    expect(off.pointer).toEqual({ on: false, clickedAt: 5 });
    expect(off.ui.toast).toMatchObject({ text: "mouse desligado · o terminal seleciona texto", until: v.squad.now + 4000 });
    // Nothing else of the state changes
    expect<Ui>({ ...off.ui, toast: null }).toEqual(v.ui);
    const on = take(off, "m", later({ ...v, ui: off.ui }, 1000), false, drawing(v))!;
    expect(on.pointer).toEqual({ on: true, clickedAt: 5 });
    expect(on.ui.toast).toMatchObject({ text: "mouse ligado", until: v.squad.now + 1000 + 4000 });
    expect<Ui>({ ...on.ui, toast: null }).toEqual(v.ui);
  }
});

test("CLK-50, CLK-51: m and a click of the same read are applied in their order: turned off, the mouse does not click, and turned on it does", () => {
  const v = view("01", { selected: 417 });
  const tab = click(at(screen(v), 1, "2 topologia"), 1);
  const off = taken(v, "m" + tab)!;
  expect([off.ui.screen, off.pointer.on, off.pointer.clickedAt]).toEqual(["main", false, null]);
  const on = taken(v, "m" + tab, { on: false, clickedAt: null })!;
  expect([on.ui.screen, on.pointer.on, on.pointer.clickedAt]).toEqual(["topology", true, v.squad.now]);
  expect(on.ui.toast).toMatchObject({ text: "mouse ligado" });
  // The click before m counts, and m twice leaves the mouse as it was
  expect(taken(v, tab + "m")!.ui.screen).toBe("topology");
  const twice = taken(v, "mm")!;
  expect(twice.pointer).toEqual(ON);
  expect(twice.ui.toast).toMatchObject({ text: "mouse ligado", until: v.squad.now + 4000 });
});

test("CLK-50: m turns the mouse off and on while the broker does not answer the reads too: it is a key", () => {
  const up = view("01", { selected: 417 });
  const v: View = { ...up, down: { since: up.squad.now - 3000, attempt: 3 } };
  // The frozen screen is no drawing of the state
  const off = take(entry(v), "m", v, false, null)!;
  expect(off.pointer.on).toBe(false);
  expect(off.ui.toast).toMatchObject({ text: "mouse desligado · o terminal seleciona texto", until: v.squad.now + 4000 });
});

test("CLK-54: with the modal open m is text: in the text mode it goes to the text, in the choice mode and with the refused answer it does nothing, and the mouse stays as it was", () => {
  for (const pointer of [ON, { on: false, clickedAt: 5 }] as const) {
    const text = open("06", { text: "logo" });
    const typed = taken(text, "m", pointer)!;
    expect(typed.ui).toEqual({ ...text.ui, modal: { ...m(text), text: "logom" } });
    expect(typed.pointer).toEqual(pointer);
    expect(taken(text, "um", pointer)!.ui).toEqual({ ...text.ui, modal: { ...m(text), text: "logoum" } });
    for (const v of [open("05", { choice: 1 }), open("20b")]) {
      const next = taken(v, "m", pointer)!;
      expect(next.ui).toBe(v.ui);
      expect(next.pointer).toEqual(pointer);
    }
  }
});

test("CLK-54: m of a read whose enter opened the modal is text of the modal, and the mouse stays on", () => {
  // Q-08 has no options: enter on the tab opens its modal in the text mode
  const tab = view("04", { question: 8 });
  const next = taken(tab, "\rm")!;
  expect(next.ui).toEqual({ ...tab.ui, modal: { ...opened(8, null), text: "m" } });
  expect(next.pointer).toEqual(ON);
  // And esc before it closes the modal: m turns the mouse off
  const text = open("06", { text: "logo" });
  const closed = taken(text, "\x1bm")!;
  expect(closed.pointer.on).toBe(false);
  expect<Ui>({ ...closed.ui, toast: null }).toEqual({ ...text.ui, modal: null });
});

// The marks of a delimited paste
const PASTE = "\x1b[200~";
const PASTED = "\x1b[201~";

// Reads with no report and, outside the modal, with no m: the ones of the tests of the keys
const READS: [what: string, v: View, chunk: string, more?: boolean][] = [
  ["j, enter and an arrow on the tab of questions", view("04", { question: 7 }), "j\r" + DOWN],
  ["a pasted block with line breaks in the text mode", open("06", { text: "" }), "um\rdois\ntrês\r\n"],
  ["a pasted block that ends by a line break", open("06", { text: "" }), "logo da 89\r\nna versão quadrada\r"],
  ["enter on the tab and a text with a line break", view("04", { question: 8 }), "\rtexto\r\n"],
  ["enter on the feed over a question and a text", view("01", { selected: 428 }), "\rtexto\n"],
  ["4, enter and a text from the main screen", view("01", { selected: 417 }), "4\rtexto\r"],
  ["a digit and a line break in the choice mode", open("05"), "2\r\n"],
  ["enter alone in the choice mode", open("05", { choice: 1 }), "\r"],
  ["enter alone in the text mode", open("06"), "\r"],
  ["enter with keys held back in the text mode", open("06", { text: "logo" }), "\r", true],
  ["a line break with keys held back in the choice mode", open("05", { choice: 1 }), "\n", true],
  ["enter with keys held back and no modal", view("04", { question: 8 }), "\r", true],
  ["a delimited paste whole in one read", open("06", { text: "" }), PASTE + "um\rdois" + PASTED],
  ["the start of a delimited paste and enter with no modal", view("04", { question: 8 }), PASTE + "\r"],
  ["esc that ends a delimited paste, and a key", view("04", { question: 8, pasting: true }), "\x1b4"],
  ["a line break after a key with no modal", view("01", { selected: 428 }), "p\n"],
  ["2 and p", view("01", { selected: 417 }), "2p"],
  ["tab twice and shift+tab", view("01", { selected: 417 }), "\t\t\x1b[Z"],
  ["an empty read", view("01", { selected: 417 }), ""],
];

for (const [what, v, chunk, more] of READS) {
  test(`CLK-56: ${what} does what it did before the mouse, with the mouse on and off`, () => {
    const before = input(v.ui, chunk, v, more)!;
    for (const pointer of [ON, { on: false, clickedAt: 7 }] as const) {
      const next = take(entry(v, pointer), chunk, v, more ?? false, drawing(v))!;
      expect(next.ui).toEqual(before);
      expect(next.pointer).toEqual(pointer);
    }
  });
}

test("CLK-56: what those reads did before the mouse: the selection, the modal and the text they leave", () => {
  const tab = view("04", { question: 7 });
  expect(taken(tab, "j\r" + DOWN)!.ui).toEqual({ ...tab.ui, question: 8, modal: opened(8, null) });
  const text = open("06", { text: "" });
  expect(taken(text, "um\rdois\ntrês\r\n")!.ui).toEqual({ ...text.ui, modal: { ...m(text), text: "um dois três  " } });
  const home = view("01", { selected: 417 });
  expect(taken(home, "4\rtexto\r")!.ui).toEqual({ ...home.ui, screen: "questions", question: 7, qfocus: "list", modal: opened(7, 0) });
  const held = open("06", { text: "logo" });
  expect(taken(held, "\r", ON, true)!.ui).toEqual({ ...held.ui, modal: { ...m(held), text: "logo " } });
});

test("CLK-56: a delimited paste that comes in several reads is pasted as before the mouse: a line break alone in its read is a space, and sends nothing", () => {
  const v = open("06", { text: "" });
  const reads = [PASTE + "logo", "\r", "da 89", "\n", PASTED];
  const before = reads.reduce((ui, chunk) => input(ui, chunk, { ...v, ui })!, v.ui);
  const after = reads.reduce((at, chunk) => take(at, chunk, { ...v, ui: at.ui }, false, drawing(v))!, entry(v));
  expect(after.ui).toEqual(before);
  expect(after.ui).toEqual({ ...v.ui, modal: { ...m(v), text: "logo da 89 " } });
  expect(after.ui.send).toBeNull();
});

test("CLK-56: every key of every screen does what it did before the mouse, alone in its read", () => {
  const KEYS = ["1", "2", "3", "4", "?", "\x1b", "j", "k", UP, DOWN, "[", "]", "\t", "\x1b[Z", "p", "t", "b", "g", "x", "h", "\r", "\n", "z", " "];
  const views = [...ALL_SCREENS.map((now) => view("01", { selected: 422, screen: now, threadTicket: "TKT-13", threadOffset: 2 })), view("04", { question: 8, qfocus: "history", historyOffset: 1 }), open("05", { choice: 1 }), open("06"), open("20b")];
  for (const v of views) {
    for (const key of [...KEYS, "\x7f", "\x15", "\x05", "a"]) {
      for (const pointer of [ON, { on: false, clickedAt: 7 }] as const) {
        const next = take(entry(v, pointer), key, v, false, drawing(v))!;
        expect(next.ui).toEqual(press(v.ui, key, v)!);
        expect(next.pointer).toEqual(pointer);
      }
    }
  }
});

test("CLK-56: q and ctrl+c quit, alone, among other keys and after a report, with the mouse on and off", () => {
  const v = view("01", { selected: 417 });
  const tab = click(at(screen(v), 1, "2 topologia"), 1);
  for (const pointer of [ON, { on: false, clickedAt: null }] as const) {
    for (const chunk of ["q", "\x03", "jq", "j\x03k", tab + "q", "m\x03", tab + "\x03" + tab]) expect(taken(v, chunk, pointer)).toBeNull();
    // In the text of the modal q is a character, and ctrl+c still quits
    expect(taken(open("06"), "q\x03", pointer)).toBeNull();
    expect(taken(open("06"), "q", pointer)!.ui.modal!.text).toBe("logo da 89, com o nome do programa no ar" + "q");
  }
  // A click on the shortcut that quits ends the read: the key after it is not pressed
  expect(taken(v, click(at(screen(v), 39, "q sair"), 39) + "2")).toBeNull();
});
