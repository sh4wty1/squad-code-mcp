import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import type { Color } from "../../tui/grid.ts";
import { input, press, settle, sync } from "../../tui/keys.ts";
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

// ---- what the broker says of a decision, and what a read does to the modal ----

// The view of a frame with the decision of the modal on its way
const sending = (frame: string, m: PermissionModal, send: Ui["send"], change?: Change): View => view(frame, { permission: { ...m, sending: true }, send }, change);
const toast = (v: View, text: string, color: Color) => ({ text, color, until: v.squad.now + 4000 });
// The decision of another TUI on the request 459
const DECIDED = later("permission_decision", { from: "human", role_from: "human", to: "worker-1", request_seq: 459, behavior: "deny" });

test("GAT-68: when the broker takes the decision the modal closes and says in green for 4 s P-NN permitido or P-NN negado", () => {
  const allow = sending("22c", modal(459, { offset: 0 }), { request_seq: 459, behavior: "allow" });
  expect(settle(allow.ui, { ok: true }, allow)).toEqual({ ...allow.ui, permission: null, send: null, toast: toast(allow, "✓ P-01 permitido", "bgreen") });
  // 460 is the second request of the log
  const deny = sending("22c", modal(460, { offset: 2 }), { request_seq: 460, behavior: "deny" });
  expect(settle(deny.ui, { ok: true }, deny)).toEqual({ ...deny.ui, permission: null, send: null, toast: toast(deny, "✓ P-02 negado", "bgreen") });
});

test("GAT-69: permission_closed leaves the modal open, waiting for no answer, with no notice", () => {
  const v = sending("14", modal(459, { offset: 0 }), { request_seq: 459, behavior: "allow" }, later("turn_started"));
  expect(settle(v.ui, { ok: false, error: "permission_closed" }, v)).toEqual({ ...v.ui, permission: modal(459), send: null });
});

test("GAT-69: another refusal, or the broker not answering, leaves the modal as it was and says in red for 4 s why", () => {
  for (const error of ["invalid_token", "missing_field", "invalid_field", "broker não respondeu"]) {
    const v = sending("22c", modal(460, { offset: 5 }), { request_seq: 460, behavior: "allow" });
    expect(settle(v.ui, { ok: false, error }, v)).toEqual({ ...v.ui, permission: modal(460, { offset: 5 }), send: null, toast: toast(v, `✗ decisão não enviada · ${error}`, "bred") });
  }
});

test("GAT-74: with no human credential nothing is sent, the modal stays as it was and says so", () => {
  const v = sending("14", modal(459), { request_seq: 459, behavior: "deny" });
  expect(settle(v.ui, null, v)).toEqual({ ...v.ui, permission: modal(459), send: null, toast: toast(v, "✗ credencial humana não encontrada", "bred") });
});

test("GAT-73: while a decision waits for the broker no key changes the modal, but ctrl+c quits", () => {
  const v = view("22c", { permission: modal(460, { offset: 2, sending: true }) });
  for (const k of [...INERT, "\x1b", "a", "d", "j", "k", "G", "]", "[", UP, DOWN]) expect([k, key(k, v)]).toEqual([k, v.ui]);
  expect(key("\x03", v)).toBeNull();
});

test("GAT-70: a read that shows the request of the modal decided by another decision closes the modal and says P-NN decidido for 4 s", () => {
  const v = view("14", { permission: modal(459, { offset: 0 }) }, DECIDED);
  expect(sync(v.ui, v)).toEqual({ ...v.ui, permission: null, toast: toast(v, "P-01 decidido", "gray") });
});

test("GAT-71, GAT-96: a read that shows the request closed by its peer or by its peer_left leaves the modal open, to say it was answered in the terminal", () => {
  for (const change of [later("turn_started"), LEFT]) {
    const v = view("14", { permission: modal(459) }, change);
    expect(sync(v.ui, v)).toBe(v.ui);
  }
});

test("GAT-70: a read changes nothing in a modal whose decision is on its way, nor in that of a request still open", () => {
  const onTheWay = view("14", { permission: modal(459, { sending: true }) }, DECIDED);
  expect(sync(onTheWay.ui, onTheWay)).toBe(onTheWay.ui);
  const open = view("22c", { permission: modal(460, { offset: 3 }) });
  expect(sync(open.ui, open)).toBe(open.ui);
});

// ---- a paste, and the broker not answering ----

const START_PASTE = "\x1b[200~";
const END_PASTE = "\x1b[201~";
// The state after each chunk, read one after the other
const chunks = (v: View, ...read: string[]) => read.reduce<Ui | null>((ui, chunk) => (ui ? input(ui, chunk, { ...v, ui }) : ui), v.ui);

test("GAT-75: a paste never decides a permission request: y, a, d and a line break are no key with the modal open, first, in the middle and last in the chunk", () => {
  // one line: the end of the preview is in view, and a typed alone would allow
  const v = at(lines(1), 0);
  for (const chunk of ["ad", "da", "a\r", "\ra", "d\n", "zaz", "zdz", "\ryd", "yy"]) {
    expect([chunk, input(v.ui, chunk, v)]).toEqual([chunk, v.ui]);
  }
  // the keys around them still count: j and k scroll
  const long = at(LONG, 4);
  expect(input(long.ui, "ja", long)!.permission).toEqual(modal(459, { offset: 5 }));
  expect(input(long.ui, "aj", long)!.permission).toEqual(modal(459, { offset: 5 }));
  expect(input(long.ui, "jak", long)!.permission).toEqual(modal(459, { offset: 4 }));
  expect(input(long.ui, "Gd", long)).toEqual({ ...long.ui, permission: modal(459, { offset: 5 }) });
});

test("GAT-75: the x that opens the modal in a paste does not let the rest of the paste decide", () => {
  const v = view("14");
  for (const chunk of ["xa", "xd", "x\r", "xGa"]) {
    const next = input(v.ui, chunk, v)!;
    expect([chunk, next.permission, next.send]).toEqual([chunk, modal(459), null]);
  }
});

test("GAT-75: between the marks of a delimited paste, split in two reads, a and d decide nothing, and a typed after the paste allows", () => {
  const v = at(lines(1), 0);
  expect(chunks(v, `${START_PASTE}a`, `d\r${END_PASTE}`)).toEqual(v.ui);
  expect(chunks(v, START_PASTE, "a", END_PASTE)).toEqual(v.ui);
  expect(chunks(v, START_PASTE, "d", END_PASTE)).toEqual(v.ui);
  expect(chunks(v, START_PASTE, "a", END_PASTE, "a")!.send).toEqual({ request_seq: 459, behavior: "allow" });
});

test("GAT-77: with the broker not answering the reads no key changes the modal of permission, but ctrl+c quits", () => {
  for (const change of [undefined, later("turn_started")]) {
    const v = { ...view("22c", { permission: modal(460, { offset: 5 }) }, change), down: { since: 0, attempt: 2 } };
    for (const k of [...INERT, "\x1b", "a", "d", "j", "k", "G", "]", "[", UP, DOWN]) expect([k, key(k, v)]).toEqual([k, v.ui]);
    expect(input(v.ui, "a", v)).toBe(v.ui);
    expect(key("\x03", v)).toBeNull();
    expect(input(v.ui, "\x03", v)).toBeNull();
  }
});
