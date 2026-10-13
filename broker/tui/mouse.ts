// What a mouse report does to the state of the screen. Every effect of the mouse is the one
// of a key, or of a sequence of keys, that already exists in that state (STATE AD-021). Pure:
// the clock is the one of the view, and a report is the item `keysOf` reads from the input.

import type { Hit } from "./grid.ts";
import { press } from "./keys.ts";
import type { Ui, View } from "./view.ts";

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

// The bits of the button that say shift, alt and ctrl were held
const MODIFIERS = 4 | 8 | 16;

// The state after a report, or null when it quits: a click on the shortcut of `q`. The mouse
// changes the state of the screen only by pressing keys, and what it hits is what the last
// drawing has in the cell of the report.
export function point(at: Entry, item: string, view: View, drawn: Drawn | null): Entry | null {
  const report = parse(item);
  if (!report || !at.pointer.on) return at;
  // A click is the press of the left button, with or without shift, alt and ctrl. With the
  // bit of a movement the button is another one.
  if (!report.pressed || report.button - (report.button & MODIFIERS) !== 0) return at;
  // Every click is the one before the next, also the one that does nothing
  const still: Entry = { ui: at.ui, pointer: { ...at.pointer, clickedAt: view.squad.now } };
  // Nothing of the screen of the state is drawn on the small screen and on the frozen one,
  // nor after a key of the chunk of the report changed the screen
  if (!drawn || drawn.screen !== at.ui.screen) return still;
  // A cell outside the grid has no mark
  const hit = drawn.hits[report.y - 1]?.[report.x - 1];
  // With the modal of answer open only what it drew is clicked, and without it nothing of it
  if (!hit || (hit.modal === true) !== (at.ui.modal !== null)) return still;
  if (hit.key === undefined) return still;
  const ui = press(at.ui, hit.key, { ...view, ui: at.ui });
  return ui && { ...still, ui };
}
