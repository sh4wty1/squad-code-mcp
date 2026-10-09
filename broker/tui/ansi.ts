// Turns a grid into the escapes that change the terminal: the sixteen ANSI colors and bold,
// one cursor position per line written.

import type { Cell, Color, Grid } from "./grid.ts";

// SGR of the foreground; the background is the same plus 10. `bg` is text in the color of the
// background, drawn over a colored one.
const FG: Record<Color, number> = {
  bg: 30,
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  bred: 91,
  bgreen: 92,
  byellow: 93,
  bblue: 94,
  bmagenta: 95,
  bcyan: 96,
  bwhite: 97,
};

function line(row: Cell[], glyphs: Map<string, string>): string {
  let out = "";
  let last = "";
  for (const cell of row) {
    const sgr = `\x1b[0${cell.bold ? ";1" : ""};${FG[cell.fg]}${cell.bg ? ";" + (FG[cell.bg] + 10) : ""}m`;
    if (sgr !== last) out += last = sgr;
    out += glyphs.get(cell.ch) ?? cell.ch;
  }
  return out + "\x1b[0m";
}

function same(a: Cell[], b: Cell[] | undefined): boolean {
  return (
    !!b &&
    a.length === b.length &&
    a.every((cell, i) => {
      const other = b[i]!;
      return cell.ch === other.ch && cell.fg === other.fg && cell.bg === other.bg && cell.bold === other.bold;
    })
  );
}

// The lines of `next` that differ from `prev`, each after the cursor position of its line.
// Without `prev`, every line.
export function paint(next: Grid, prev: Grid | null, glyphs: Map<string, string> = new Map()): string {
  let out = "";
  next.rows.forEach((row, y) => {
    if (!prev || !same(row, prev.rows[y])) out += `\x1b[${y + 1};1H` + line(row, glyphs);
  });
  return out;
}

// `⚠=!,⟳=~`: the glyph and what the terminal gets in its place
export function parseGlyphs(text: string | undefined): Map<string, string> {
  const glyphs = new Map<string, string>();
  if (!text) return glyphs;
  for (const pair of text.split(",")) {
    const chars = [...pair];
    if (chars.length !== 3 || chars[1] !== "=") {
      throw new Error(`SQUAD_TUI_GLYPHS: "${pair}" is not glyph=substitute with one character on each side`);
    }
    glyphs.set(chars[0]!, chars[2]!);
  }
  return glyphs;
}
