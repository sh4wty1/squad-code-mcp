// The buffer of cells every screen draws on, and the text helpers of the screens.
// Ported from the prototype: `Grid`, `L`, `tr`, `pad`, `wrap`, `mmss` and `ageS`.

// The sixteen colors of the prototype, and `bg`: text in the color of the background
export type Color =
  | "bg"
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "bred"
  | "bgreen"
  | "byellow"
  | "bblue"
  | "bmagenta"
  | "bcyan"
  | "bwhite";

export interface Cell {
  ch: string;
  fg: Color;
  bg: Color | null;
  bold: boolean;
}

// Text, color and bold. A missing or empty segment draws nothing.
export type Seg = [text: string | number, fg?: Color | null, bold?: boolean] | null | undefined | false;

// Characters, not UTF-16 units: one per cell
export const len = (s: string | number): number => [...String(s)].length;

export function cut(s: string | number, n: number): string {
  s = String(s);
  return len(s) <= n ? s : [...s].slice(0, Math.max(0, n - 1)).join("") + "…";
}

export function pad(s: string | number, n: number): string {
  s = cut(s, n);
  return s + " ".repeat(Math.max(0, n - len(s)));
}

// Breaks at spaces; a word longer than the width is split
export function wrap(text: string, w: number): string[] {
  const out: string[] = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if (!line) line = word;
      else if (len(line) + 1 + len(word) <= w) line += " " + word;
      else {
        out.push(line);
        line = word;
      }
      while (len(line) > w) {
        out.push([...line].slice(0, w).join(""));
        line = [...line].slice(w).join("");
      }
    }
    out.push(line);
  }
  return out;
}

// Seconds as `4:07`
export const mmss = (n: number): string => Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");

// Seconds as `42s` or `5m13s`
export const age = (n: number): string => (n < 60 ? n + "s" : Math.floor(n / 60) + "m" + String(n % 60).padStart(2, "0") + "s");

// Epoch ms as `HH:MM:SS` in the time zone of the machine
export const clock = (ts: number): string => new Date(ts).toTimeString().slice(0, 8);

export function grid(w = 120, h = 40) {
  const rows: Cell[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, (): Cell => ({ ch: " ", fg: "white", bg: null, bold: false }))
  );

  // Writes from column x and returns the column after the text. What falls outside the grid is
  // not written. The background of a cell stays unless `bg` is given.
  function put(x: number, y: number, s: string | number, fg: Color = "white", o: { bg?: Color | null; bold?: boolean } = {}): number {
    s = String(s);
    if (y < 0 || y >= h) return x + len(s);
    for (const ch of s) {
      if (x >= 0 && x < w) {
        const cell = rows[y]![x]!;
        cell.ch = ch;
        cell.fg = fg;
        if ("bg" in o) cell.bg = o.bg ?? null;
        cell.bold = !!o.bold;
      }
      x++;
    }
    return x;
  }

  function segs(x: number, y: number, list: Seg[]): number {
    for (const seg of list) {
      if (!seg || !seg.length) continue;
      x = put(x, y, seg[0], seg[1] || "white", { bold: seg[2] });
    }
    return x;
  }

  function bg(x: number, y: number, n: number, color: Color | null) {
    for (let i = 0; i < n; i++) {
      const cell = rows[y]?.[x + i];
      if (cell) cell.bg = color;
    }
  }

  function clear(x: number, y: number, bw: number, bh: number) {
    for (let j = 0; j < bh; j++) {
      for (let i = 0; i < bw; i++) {
        const cell = rows[y + j]?.[x + i];
        if (cell) Object.assign(cell, { ch: " ", fg: "white", bg: null, bold: false });
      }
    }
  }

  function box(x: number, y: number, bw: number, bh: number, fg: Color = "gray", title?: string, titleFg?: Color, o: { bold?: boolean } = {}) {
    put(x, y, "┌" + "─".repeat(bw - 2) + "┐", fg, { bold: o.bold });
    for (let j = 1; j < bh - 1; j++) {
      put(x, y + j, "│", fg, { bold: o.bold });
      put(x + bw - 1, y + j, "│", fg, { bold: o.bold });
    }
    put(x, y + bh - 1, "└" + "─".repeat(bw - 2) + "┘", fg, { bold: o.bold });
    if (title) put(x + 2, y, " " + title + " ", titleFg || fg, { bold: true });
  }

  const sep = (x: number, y: number, bw: number, fg?: Color): number => put(x, y, "├" + "─".repeat(bw - 2) + "┤", fg);

  // Gray, no background and no bold, from line y1 to line y2
  function dim(y1 = 0, y2 = h - 1) {
    for (let y = y1; y <= y2; y++) {
      for (const cell of rows[y]!) Object.assign(cell, { fg: "gray", bg: null, bold: false });
    }
  }

  // The lines without the spaces at the right, as the frames are stored
  const text = (): string[] => rows.map((row) => row.map((cell) => cell.ch).join("").replace(/\s+$/, ""));

  return { w, h, rows, put, segs, bg, clear, box, sep, dim, text };
}

export type Grid = ReturnType<typeof grid>;
