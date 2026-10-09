import { expect, test } from "bun:test";
import { ENTER, LEAVE, paint, parseGlyphs } from "../../tui/ansi.ts";
import { grid, type Color } from "../../tui/grid.ts";

const ESC = "\x1b";

test("TUI-60: entering hides the cursor and leaving shows it again", () => {
  expect(ENTER).toBe("\x1b[?1049h\x1b[?25l");
  expect(LEAVE).toBe("\x1b[?25h\x1b[?1049l");
});

function scene() {
  const g = grid(4, 3);
  g.put(0, 0, "ab", "red");
  g.put(0, 1, "cd", "green", { bold: true });
  g.put(0, 2, "ef", "bwhite", { bg: "blue" });
  return g;
}

test("TUI-61: the first paint writes every line, each after the cursor position of its line", () => {
  expect(paint(scene(), null)).toBe(
    `${ESC}[1;1H${ESC}[0;31mab${ESC}[0;37m  ${ESC}[0m` +
      `${ESC}[2;1H${ESC}[0;1;32mcd${ESC}[0;37m  ${ESC}[0m` +
      `${ESC}[3;1H${ESC}[0;97;44mef${ESC}[0;37m  ${ESC}[0m`
  );
});

test("TUI-61: a paint over the previous one writes only the lines that differ", () => {
  expect(paint(scene(), scene())).toBe("");

  const char = scene();
  char.put(1, 1, "x", "green", { bold: true });
  expect(paint(char, scene())).toBe(`${ESC}[2;1H${ESC}[0;1;32mcx${ESC}[0;37m  ${ESC}[0m`);

  const color = scene();
  color.put(0, 0, "ab", "yellow");
  expect(paint(color, scene())).toBe(`${ESC}[1;1H${ESC}[0;33mab${ESC}[0;37m  ${ESC}[0m`);

  const bold = scene();
  bold.put(0, 0, "ab", "red", { bold: true });
  expect(paint(bold, scene())).toBe(`${ESC}[1;1H${ESC}[0;1;31mab${ESC}[0;37m  ${ESC}[0m`);

  const background = scene();
  background.bg(3, 2, 1, "red");
  expect(paint(background, scene())).toBe(`${ESC}[3;1H${ESC}[0;97;44mef${ESC}[0;37m ${ESC}[0;37;41m ${ESC}[0m`);

  const two = scene();
  two.put(3, 0, "!");
  two.put(3, 2, "?");
  expect(paint(two, scene())).toBe(
    `${ESC}[1;1H${ESC}[0;31mab${ESC}[0;37m !${ESC}[0m` + `${ESC}[3;1H${ESC}[0;97;44mef${ESC}[0;37m ?${ESC}[0m`
  );
});

// The sixteen colors of the prototype as SGR 30-37 and 90-97; gray is 90 and `bg` is 30
const SGR: [Color, number][] = [
  ["bg", 30],
  ["black", 30],
  ["red", 31],
  ["green", 32],
  ["yellow", 33],
  ["blue", 34],
  ["magenta", 35],
  ["cyan", 36],
  ["white", 37],
  ["gray", 90],
  ["bred", 91],
  ["bgreen", 92],
  ["byellow", 93],
  ["bblue", 94],
  ["bmagenta", 95],
  ["bcyan", 96],
  ["bwhite", 97],
];

for (const [color, code] of SGR) {
  test(`TUI-61: ${color} is SGR ${code}, ${code + 10} as background, with 1 for bold`, () => {
    const g = grid(1, 1);
    g.put(0, 0, "x", color);
    expect(paint(g, null)).toBe(`${ESC}[1;1H${ESC}[0;${code}mx${ESC}[0m`);
    g.put(0, 0, "x", color, { bold: true });
    expect(paint(g, null)).toBe(`${ESC}[1;1H${ESC}[0;1;${code}mx${ESC}[0m`);
    g.put(0, 0, "x", "white", { bg: color, bold: true });
    expect(paint(g, null)).toBe(`${ESC}[1;1H${ESC}[0;1;37;${code + 10}mx${ESC}[0m`);
  });
}

test("TUI-56: a glyph with a substitute is written as the substitute", () => {
  const g = grid(5, 1);
  g.put(0, 0, "⚠ ⟳ ●", "yellow");
  expect(paint(g, null, parseGlyphs("⚠=!,⟳=~"))).toBe(`${ESC}[1;1H${ESC}[0;33m! ~ ●${ESC}[0m`);
  expect(paint(g, null)).toBe(`${ESC}[1;1H${ESC}[0;33m⚠ ⟳ ●${ESC}[0m`);
});

test("TUI-56: SQUAD_TUI_GLYPHS is a list of glyph=substitute pairs", () => {
  expect([...parseGlyphs("⚠=!,⟳=~")]).toEqual([
    ["⚠", "!"],
    ["⟳", "~"],
  ]);
  // One character, even when it takes two UTF-16 units
  expect([...parseGlyphs("𝄞=x")]).toEqual([["𝄞", "x"]]);
  expect(parseGlyphs(undefined).size).toBe(0);
});

for (const [text, pair] of [
  ["⚠=", "⚠="],
  ["=!", "=!"],
  ["⚠", "⚠"],
  ["⚠=!!", "⚠=!!"],
  ["ab=c", "ab=c"],
  ["⚠=!,⟳~", "⟳~"],
  ["⚠=!,", ""],
] as const) {
  test(`TUI-56: "${text}" is refused with the pair "${pair}" in the message`, () => {
    expect(() => parseGlyphs(text)).toThrow(`"${pair}"`);
  });
}
