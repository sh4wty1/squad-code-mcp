// What a mouse report does to the state of the screen, and what a chunk of the input does
// with its reports and its keys. Every effect of the mouse is the one of a key, or of a
// sequence of keys, that already exists in that state (STATE AD-021). Pure: the clock is the
// one of the view, and a report is the item `keysOf` reads from the input.

import { waiting } from "./asked.ts";
import type { Hit } from "./grid.ts";
import { input, isReport, keysOf, notice, press } from "./keys.ts";
import { selected } from "./screens/questions.ts";
import { threadTicket } from "./screens/thread.ts";
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

// The grid of the screens, the only cells a report hits
const COLS = 120;
const LINES = 40;

// The bits of the button that say shift, alt and ctrl were held
const MODIFIERS = 4 | 8 | 16;

// The key of each way of the wheel, up and down, and the lines of the feed one report of it
// moves the selection by
const WHEEL = new Map([
  [64, "k"],
  [65, "j"],
]);
const FEED_LINES = 3;

// With a modal open, a click that comes less than this after the one before it
// is the second of a double click
const DOUBLE_MS = 500;

// The state after the keys, pressed one after the other; null when one of them quits
function tap(ui: Ui | null, view: View, keys: string[]): Ui | null {
  return keys.reduce((next, key) => next && press(next, key, { ...view, ui: next }), ui);
}

const times = (n: number, key: string): string[] => Array<string>(n).fill(key);

// The keys that take a selection from one place of its list to another, one step each
const walk = (from: number, to: number, back = "k", on = "j"): string[] => times(Math.abs(to - from), to < from ? back : on);

// The tabs that take the focus of the main screen to a panel, and the `h` that takes the one
// of the tab of questions to its list or to its history
const toPanel = (panel: number, ui: Ui): string[] => times((panel - ui.focus + 3) % 3, "\t");
const toSide = (side: Ui["qfocus"], ui: Ui): string[] => (ui.qfocus === side ? [] : ["h"]);

// The keys of the wheel over a marked cell with no modal open: the focus on what it rolls,
// then `k` or `j`, three times on the feed
function rolled(hit: Hit, key: string, ui: Ui): string[] {
  switch (hit.wheel) {
    case "feed":
      return [...toPanel(1, ui), ...times(FEED_LINES, key)];
    case "thread":
      return [key];
    case "list":
    case "history":
      return [...toSide(hit.wheel, ui), key];
  }
  return [];
}

// The state after a click on a marked cell with no modal open: the key of the cell, or the
// focus on its panel and then what the cell has of it
function clicked(hit: Hit, ui: Ui, view: View): Ui | null {
  const { squad, rows } = view;
  if (hit.key !== undefined) return tap(ui, view, [hit.key]);
  const focused = hit.panel === undefined ? ui : tap(ui, view, toPanel(hit.panel, ui));
  if (hit.row !== undefined) {
    // The selected line is opened. Any other is selected: with none selected, the first `k`
    // selects the last line.
    if (hit.row === ui.selected) return tap(focused, view, ["\r"]);
    const from = rows.findIndex((row) => row.seq === ui.selected);
    const to = rows.findIndex((row) => row.seq === hit.row);
    return tap(focused, view, from < 0 ? ["k", ...walk(rows.length - 1, to)] : walk(from, to));
  }
  if (hit.ticket !== undefined) {
    // `3` shows the thread of the ticket of the selected line, on its latest entry, and `[`
    // and `]` go from that ticket to the clicked one
    const shown = tap(focused, view, ["3"]);
    const index = (ref: string | null) => squad.tickets.findIndex((t) => t.ticket_ref === ref);
    return shown && tap(shown, view, walk(index(threadTicket({ ...view, ui: shown })), index(hit.ticket), "[", "]"));
  }
  if (hit.question !== undefined) {
    // The selected question is opened, with the focus on the list. Otherwise the focus goes
    // to the list, and the selection to the question.
    const asked = waiting(squad);
    const chosen = selected({ ...view, ui })?.id;
    if (hit.question === chosen && ui.qfocus === "list") return tap(focused, view, ["\r"]);
    const index = (id: number | undefined) => asked.findIndex((q) => q.id === id);
    return tap(focused, view, [...toSide("list", ui), ...walk(index(chosen), index(hit.question))]);
  }
  if (hit.history) return tap(focused, view, toSide("history", ui));
  return focused;
}

// Whether a modal is open: the one of answer, of gate or of permission
const opened = (ui: Ui): boolean => ui.modal !== null || !!ui.gate || !!ui.permission;

// The keys that take a queue of a modal from the marked item to the clicked one; none when
// one of them is no longer in it
function queued(queue: number[], from: number, to: number): string[] {
  const [a, b] = [queue.indexOf(from), queue.indexOf(to)];
  return a < 0 || b < 0 ? [] : walk(a, b, "[", "]");
}

// The keys of a click on a cell a modal drew: the key of the cell; in the queue of the modal
// of gate or of permission, `[` or `]` from the marked item to the clicked one; in the modal
// of answer, `k` or `j` from the marked line of the choice mode to the clicked one, and enter
// on the line after the options, the other answer, which leads to the text. A click marks
// and never decides.
function answered(hit: Hit, ui: Ui, view: View): string[] {
  if (hit.key !== undefined) return [hit.key];
  const { squad } = view;
  if (ui.gate && hit.gate !== undefined) return queued(squad.gates.filter((g) => g.pending).map((g) => g.id), ui.gate.id, hit.gate);
  if (ui.permission && hit.request !== undefined) return queued(squad.permissions.map((p) => p.seq), ui.permission.seq, hit.request);
  const modal = ui.modal;
  if (!modal || hit.option === undefined || modal.choice === null) return [];
  const other = view.squad.questions.find((q) => q.id === modal.question)?.options.length;
  return [...walk(modal.choice, hit.option), ...(hit.option === other ? ["\r"] : [])];
}

// The state after a report, or null when it quits: a click on the shortcut of `q`. The mouse
// changes the state of the screen only by pressing keys, and what it hits is what the last
// drawing has in the cell of the report.
export function point(at: Entry, item: string, view: View, drawn: Drawn | null): Entry | null {
  const report = parse(item);
  if (!report || !at.pointer.on) return at;
  // A click is the press of the left button, and the wheel the one of the button 64 or 65,
  // with or without shift, alt and ctrl. With the bit of a movement the button is another one.
  const button = report.button - (report.button & MODIFIERS);
  const wheel = report.pressed ? WHEEL.get(button) : undefined;
  if (!wheel && !(report.pressed && button === 0)) return at;
  const { ui, pointer } = at;
  const now = view.squad.now;
  const quick = pointer.clickedAt !== null && now - pointer.clickedAt < DOUBLE_MS;
  // Every click is the one before the next, also the one that does nothing. The wheel is no click.
  const still: Entry = wheel ? at : { ui, pointer: { ...pointer, clickedAt: now } };
  // Nothing of the screen of the state is drawn on the small screen and on the frozen one,
  // nor after a key of the chunk of the report changed the screen
  if (!drawn || drawn.screen !== ui.screen) return still;
  // The cell of the report, from 0: one outside the grid is of no screen
  const [x, y] = [report.x - 1, report.y - 1];
  if (x < 0 || x >= COLS || y < 0 || y >= LINES) return still;
  const hit = drawn.hits[y]?.[x];
  // With a modal open only what it drew is clicked, and without one nothing of it
  const open = opened(ui);
  if (!hit || (hit.modal === true) !== open) return still;
  // In a modal the wheel rolls nothing, and the second click of a double one does nothing:
  // the click that opened the modal would decide with it, or close the modal
  if (open && (wheel || quick)) return still;
  const next = open ? tap(ui, view, answered(hit, ui, view)) : wheel ? tap(ui, view, rolled(hit, wheel, ui)) : clicked(hit, ui, view);
  return next && { ...still, ui: next };
}

// The state after the items of one chunk of the input, one by one in the order they came, or
// null when one of them quits. A report goes to `point`, over the same drawing as the others
// of its chunk: the last one written. `m` with no modal open turns the mouse off and on, and
// says so; with the modal open it is text, like any other key, which goes to `input` as one
// of the keys of its chunk: a line break that comes with a report is pasted, and sends nothing.
// `more` says the chunk had keys after these, which the loop holds back.
export function take(at: Entry, chunk: string, view: View, more: boolean, drawn: Drawn | null): Entry | null {
  const items = keysOf(chunk);
  return items.reduce<Entry | null>((next, item) => {
    if (!next) return null;
    if (isReport(item)) return point(next, item, view, drawn);
    const { ui, pointer } = next;
    if (item === "m" && !opened(ui)) {
      const on = !pointer.on;
      return { ui: { ...ui, toast: notice(view, on ? "mouse ligado" : "mouse desligado · o terminal seleciona texto") }, pointer: { ...pointer, on } };
    }
    const typed = input(ui, item, view, more || items.length > 1);
    return typed && { ui: typed, pointer };
  }, at);
}
