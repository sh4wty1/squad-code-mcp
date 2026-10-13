// What a test of the mouse reads from the terminal of the TUI and writes to its input.

import { CLEAR } from "../tui/ansi.ts";

// What the escapes written so far leave on a terminal: its lines, without colors
export function screen(out: string): string[] {
  const lines: string[] = [];
  let y = 0;
  for (const part of out.split(/(\x1b\[[0-9;?]*[A-Za-z])/)) {
    const at = /^\x1b\[(\d+);1H$/.exec(part);
    if (at) lines[(y = Number(at[1]) - 1)] = "";
    else if (part === CLEAR) lines.length = 0;
    // No text between two escapes writes no line: after an erase, the cursor is still where it was
    else if (part && !part.startsWith("\x1b[")) lines[y] = (lines[y] ?? "") + part;
  }
  return Array.from(lines, (line) => (line ?? "").trimEnd());
}

// The cell where `text` starts on the lines of a screen, which have it once: its column and
// its line, from 0. `plus` is a number of cells to the right of it.
export function cellOf(lines: string[], text: string, plus = 0): [x: number, y: number] {
  const found = lines.flatMap((line, y) => {
    const at = line.indexOf(text);
    if (at < 0) return [];
    if (line.indexOf(text, at + 1) >= 0) throw new Error(`line ${y} has "${text}" more than once: ${line}`);
    return [[[...line.slice(0, at)].length + plus, y] as [number, number]];
  });
  if (found.length !== 1) throw new Error(`the screen has "${text}" on ${found.length} lines`);
  return found[0]!;
}

// The report the terminal sends for a button on a cell: the column and the line count from 1
export const report = (button: number, [x, y]: [number, number], pressed = true): string => `\x1b[<${button};${x + 1};${y + 1}${pressed ? "M" : "m"}`;

// The press of the left button, and one step of the wheel up and down
export const click = (cell: [number, number]): string => report(0, cell);
export const wheelUp = (cell: [number, number]): string => report(64, cell);
export const wheelDown = (cell: [number, number]): string => report(65, cell);
