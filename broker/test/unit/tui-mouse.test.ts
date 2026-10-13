import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { grid, len, type Grid } from "../../tui/grid.ts";
import { keysOf, press } from "../../tui/keys.ts";
import { parse, point, type Drawn, type Entry, type Pointer } from "../../tui/mouse.ts";
import { answer } from "../../tui/screens/answer.ts";
import { help } from "../../tui/screens/help.ts";
import { main } from "../../tui/screens/main.ts";
import { questions } from "../../tui/screens/questions.ts";
import { thread, threadTicket } from "../../tui/screens/thread.ts";
import { topology } from "../../tui/screens/topology.ts";
import type { Ui, View } from "../../tui/view.ts";
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

// The cell where the feed of the main screen draws the hour of an event, which it has once
function feedCell(g: Grid, hour: string): [x: number, y: number] {
  const [left, right] = boxes(g)[1]!;
  const found = g.rows.flatMap((_, y) => find(g, y, ` ${hour} `, left, right).map((x): [number, number] => [x + 1, y]));
  if (found.length !== 1) throw new Error(`the feed has ${hour} ${found.length} times`);
  return found[0]!;
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
