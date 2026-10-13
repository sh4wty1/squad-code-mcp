import { expect, test } from "bun:test";
import { keysOf } from "../../tui/keys.ts";
import { parse } from "../../tui/mouse.ts";

// What a mouse report does to the state of the screen. A report has its column and its line
// counted from 1: the cell (x, y) of the grid is column x + 1 of line y + 1.

const UP = "\x1b[A";

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

test("CLK-11: an integer of 400 digits does not throw, and gives a number no grid has", () => {
  const huge = "9".repeat(400);
  const wide = parse(`\x1b[<0;${huge};5M`)!;
  expect([wide.button, wide.y, wide.pressed]).toEqual([0, 5, true]);
  expect(wide.x).toBeGreaterThan(120);
  const tall = parse(`\x1b[<0;12;${huge}M`)!;
  expect([tall.button, tall.x]).toEqual([0, 12]);
  expect(tall.y).toBeGreaterThan(40);
  // More digits than a safe integer holds, in the button too
  expect(parse(`\x1b[<${huge};12;5M`)!.button).toBeGreaterThan(65);
  expect(parse(`\x1b[<0;${"9".repeat(17)};5M`)!.x).toBeGreaterThan(120);
});
