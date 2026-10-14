import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { press } from "../../tui/keys.ts";
import { preview } from "../../tui/screens/permission.ts";
import type { PermissionModal, Ui, View } from "../../tui/view.ts";
import { LOGS } from "../frames/logs.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

// The view of a frame with the state of the screen changed. In frame 14 the request 459 of
// worker-1 is open; in 22c 459 and 460, of worker-2, with a command of 13 lines; in 29c 487,
// with no feature open; in 01 and 18a none is.
function view(frame: string, ui: Partial<Ui> = {}, change?: Change): View {
  const v = frameView(frame, change);
  return { ...v, ui: { ...v.ui, ...ui } };
}
const key = (k: string, v: View) => press(v.ui, k, v);

const modal = (seq: number, more: Partial<PermissionModal> = {}): PermissionModal => ({ seq, offset: 0, sending: false, ...more });

// The request 459 of frame 14 with another input_preview
const REQUEST = LOGS["14"]!.events.find((e) => e.seq === 459)!;
const LONG = (LOGS["22c"]!.events.find((e) => e.seq === 460)! as { input_preview: string }).input_preview;
const withPreview = (text: string): Change => (events) => events.map((e) => (e.seq === 459 ? ({ ...e, input_preview: text } as SquadEvent) : e));
const lines = (n: number) => Array.from({ length: n }, (_, i) => `echo ${i + 1}`).join("\n");
// The modal of 459 open at `offset`, with the preview `text`
const at = (text: string, offset: number) => view("14", { permission: modal(459, { offset }) }, withPreview(text));

// An event of worker-1 after its request, and its peer_left
const later = (kind: string, fields: Record<string, unknown> = {}): Change => (events) => [
  ...events,
  { ...REQUEST, seq: 600, ts: REQUEST.ts + 52_000, kind, summary: "", body: "", to: null, ...fields } as SquadEvent,
];
const LEFT = later("peer_left", { from: "broker", role_from: "broker", peer: "worker-1", reason: "died" });
// a third request, of worker-3, after the two of 22c
const third: Change = (events) => [...events, { ...REQUEST, seq: 500, from: "worker-3", request_id: "r500" } as SquadEvent];

const UP = "\x1b[A";
const DOWN = "\x1b[B";
const SCREENS = ["main", "topology", "thread", "questions", "help"] as const;
// Keys of no meaning in the modal: q, the digits, the keys of the screens, the other modals and enter among them
const INERT = ["q", "1", "2", "3", "4", "?", "h", "t", "p", "b", "y", "r", "c", "n", "g", "x", " ", "\t", "\r", "\x7f"];

test("GAT-63, GAT-94: the preview has the lines of the text in pieces of 70 characters, and an empty text is one line", () => {
  expect(preview("")).toEqual([{ n: 1, t: "" }]);
  expect(preview("x".repeat(70))).toEqual([{ n: 1, t: "x".repeat(70) }]);
  expect(preview(`${"x".repeat(71)}\n\nls`)).toEqual([
    { n: 1, t: "x".repeat(70) },
    { n: null, t: "x" },
    { n: 2, t: "" },
    { n: 3, t: "ls" },
  ]);
  // the command of frame 22c: ten lines, two of them longer than 70
  expect(preview(LONG)).toHaveLength(13);
});

test("GAT-60: x opens the modal of the open request with the preview on its first line, over the main screen, from every screen", () => {
  for (const screen of SCREENS) {
    const v = view("14", { screen });
    expect(key("x", v)).toEqual({ ...v.ui, screen: "main", permission: modal(459) });
  }
});

test("GAT-60: with two requests open x opens the oldest", () => {
  const v = view("22c");
  expect(key("x", v)).toEqual({ ...v.ui, screen: "main", permission: modal(459) });
});

test("GAT-95: x opens the modal of a request that came with no feature open", () => {
  const v = view("29c");
  expect(key("x", v)).toEqual({ ...v.ui, screen: "main", permission: modal(487) });
});

test("GAT-60, GAT-90: x with no open request says nenhum pedido de permissão for 4 s and changes nothing else", () => {
  for (const frame of ["01", "18a"]) {
    for (const screen of SCREENS) {
      const v = view(frame, { screen });
      expect(key("x", v)).toEqual({ ...v.ui, toast: { text: "nenhum pedido de permissão", color: "gray", until: v.squad.now + 4000 } });
    }
  }
  // a request answered in the terminal is not open
  const closed = view("14", {}, later("turn_started"));
  expect(key("x", closed)!.toast!.text).toBe("nenhum pedido de permissão");
});

test("GAT-60, GAT-90: x with the broker not answering the reads says broker desconectado · permissão desabilitada for 4 s and does not open", () => {
  const v = { ...view("14"), down: { since: 0, attempt: 3 } };
  expect(key("x", v)).toEqual({ ...v.ui, toast: { text: "broker desconectado · permissão desabilitada", color: "gray", until: v.squad.now + 4000 } });
});

test("GAT-76: with the modal of gate open x does nothing, and with the modal of answer in its text mode x goes into the text", () => {
  const gate = view("14", { gate: { id: 1, mode: "view", text: "", expanded: false, empty: false, sending: false, version: 1 } });
  expect(key("x", gate)).toBe(gate.ui);
  const answer = view("14", { screen: "questions", modal: { question: 8, choice: null, text: "ab", expanded: false, sending: false, refused: false } });
  expect(key("x", answer)!.modal!.text).toBe("abx");
  expect(key("x", answer)!.permission).toBeUndefined();
});

test("GAT-65, GAT-76: with the request open esc closes the modal without sending, no other key changes the screen, not even q, g, x, 4 or enter, and ctrl+c quits", () => {
  const v = view("14", { permission: modal(459) });
  expect(key("\x1b", v)).toEqual({ ...v.ui, permission: null });
  for (const k of INERT) expect([k, key(k, v)]).toEqual([k, v.ui]);
  expect(key("\x03", v)).toBeNull();
});

test("GAT-65: j and ↓ scroll the preview down one line, k and ↑ up one, and they stop at its end and at its start", () => {
  // 13 lines: the end is in view from the offset 5
  const top = at(LONG, 0);
  expect(key("j", top)).toEqual({ ...top.ui, permission: modal(459, { offset: 1 }) });
  expect(key(DOWN, top)!.permission).toEqual(modal(459, { offset: 1 }));
  expect(key("k", top)).toBe(top.ui);
  expect(key(UP, top)).toBe(top.ui);
  const middle = at(LONG, 3);
  expect(key("k", middle)!.permission).toEqual(modal(459, { offset: 2 }));
  expect(key(UP, middle)!.permission).toEqual(modal(459, { offset: 2 }));
  expect(key("j", middle)!.permission).toEqual(modal(459, { offset: 4 }));
  const bottom = at(LONG, 5);
  expect(key("j", bottom)).toBe(bottom.ui);
  expect(key(DOWN, bottom)).toBe(bottom.ui);
  // 9 lines: one step; 8, 1 and none: nothing to scroll
  expect(key("j", at(lines(9), 0))!.permission).toEqual(modal(459, { offset: 1 }));
  const nine = at(lines(9), 1);
  expect(key("j", nine)).toBe(nine.ui);
  for (const text of [lines(8), lines(1), ""]) {
    const v = at(text, 0);
    for (const k of ["j", "k", DOWN, UP, "G"]) expect([text, k, key(k, v)]).toEqual([text, k, v.ui]);
  }
});

test("GAT-65: G goes to the end of the preview", () => {
  expect(key("G", at(LONG, 0))!.permission).toEqual(modal(459, { offset: 5 }));
  expect(key("G", at(LONG, 2))!.permission).toEqual(modal(459, { offset: 5 }));
  expect(key("G", at(lines(9), 0))!.permission).toEqual(modal(459, { offset: 1 }));
  const end = at(LONG, 5);
  expect(key("G", end)).toBe(end.ui);
});

test("GAT-66: a leaves the allow of the request to send with the end of the preview in view, and the modal waits for the broker", () => {
  for (const [text, end] of [[LONG, 5], [lines(9), 1], [lines(8), 0], [lines(1), 0], ["", 0]] as const) {
    const v = at(text, end);
    expect([text, key("a", v)]).toEqual([text, { ...v.ui, permission: modal(459, { offset: end, sending: true }), send: { request_seq: 459, behavior: "allow" } }]);
  }
});

test("GAT-66: a without the end of the preview in view sends nothing and changes nothing, at the line before the end too", () => {
  for (const [text, offset] of [[LONG, 4], [LONG, 0], [lines(9), 0]] as const) {
    const v = at(text, offset);
    expect([text, offset, key("a", v)]).toEqual([text, offset, v.ui]);
  }
});

test("GAT-67: d leaves the deny of the request to send at any place of the preview", () => {
  for (const offset of [0, 3, 5]) {
    const v = at(LONG, offset);
    expect(key("d", v)).toEqual({ ...v.ui, permission: modal(459, { offset, sending: true }), send: { request_seq: 459, behavior: "deny" } });
  }
});

test("GAT-65: ] and [ go to the next and the previous open request, oldest first, with the preview on its first line, and stop at the ends of the queue", () => {
  // three open: 459, 460 and 500
  const views = Object.fromEntries([459, 460, 500].map((seq) => [seq, view("22c", { permission: modal(seq, { offset: seq === 460 ? 3 : 0 }) }, third)]));
  const on = (seq: number) => views[seq]!;
  expect(key("]", on(459))).toEqual({ ...on(459).ui, permission: modal(460) });
  expect(key("[", on(459))).toBe(on(459).ui);
  expect(key("]", on(460))!.permission).toEqual(modal(500));
  expect(key("[", on(460))!.permission).toEqual(modal(459));
  expect(key("]", on(500))).toBe(on(500).ui);
  expect(key("[", on(500))!.permission).toEqual(modal(460));
});

for (const [what, change] of [
  ["a later event of its peer", later("turn_started")],
  ["the peer_left of its peer", LEFT],
] as const) {
  test(`GAT-71: with the request closed by ${what} only esc changes the screen`, () => {
    const v = view("14", { permission: modal(459) }, change);
    for (const k of [...INERT, "a", "d", "j", "k", "G", "]", "[", UP, DOWN]) expect([k, key(k, v)]).toEqual([k, v.ui]);
    expect(key("\x1b", v)).toEqual({ ...v.ui, permission: null });
    expect(key("\x03", v)).toBeNull();
  });
}
