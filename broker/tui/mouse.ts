// What a mouse report does to the state of the screen. Every effect of the mouse is the one
// of a key, or of a sequence of keys, that already exists in that state (STATE AD-021). Pure:
// the clock is the one of the view, and a report is the item `keysOf` reads from the input.

import type { Hit } from "./grid.ts";
import type { Ui } from "./view.ts";

// The three integers of a report as the terminal sent them: the column and the line count from 1
export interface Report {
  button: number;
  x: number;
  y: number;
  pressed: boolean;
}

// The mouse of the TUI: whether the terminal was asked for reports, and when the last click came
export interface Pointer {
  on: boolean;
  clickedAt: number | null;
}

// The last drawing written to the terminal: its marks and the screen it was drawn from
export interface Drawn {
  hits: (Hit | null)[][];
  screen: Ui["screen"];
}

// The state of the screen with what is of the mouse, which stays outside `Ui`
export interface Entry {
  ui: Ui;
  pointer: Pointer;
}

const REPORT = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;

// The report of an item of the input; null for a key, for the old format and for a sequence
// that starts as a report and is not one whole. An integer with more digits than a number
// holds is one no grid has.
export function parse(item: string): Report | null {
  const found = REPORT.exec(item);
  return found && { button: Number(found[1]), x: Number(found[2]), y: Number(found[3]), pressed: found[4] === "M" };
}
