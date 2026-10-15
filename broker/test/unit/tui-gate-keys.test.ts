import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import type { Color } from "../../tui/grid.ts";
import { input, press, settle, sync } from "../../tui/keys.ts";
import type { GateModal, Ui, View } from "../../tui/view.ts";
import { LOGS } from "../frames/logs.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

// The view of a frame with the state of the screen changed. In frame 18a G-01 is pending, with
// a comment; in 19a G-01 and G-02 are pending; in 01 and 09b no gate is.
function view(frame: string, ui: Partial<Ui> = {}, change?: Change): View {
  const v = frameView(frame, change);
  return { ...v, ui: { ...v.ui, ...ui } };
}
const key = (k: string, v: View) => press(v.ui, k, v);

// The modal of the gate `id` in the view mode, unless the test says otherwise
const modal = (id: number, more: Partial<GateModal> = {}): GateModal => ({
  id,
  mode: "view",
  text: "",
  expanded: false,
  empty: false,
  sending: false,
  version: 1,
  ...more,
});
// The view of the frame with the modal of a gate open
const opened = (frame: string, m: GateModal, change?: Change): View => view(frame, { gate: m }, change);

// The comment of 18a with another seq and decision, and G-02 of 19a as G-03, asked after it
const COMMENT = LOGS["18a"]!.events.find((e) => e.kind === "gate_decision")!;
const decided = (seq: number, gate_id: number, decision: string) => ({ ...COMMENT, seq, gate_id, decision }) as SquadEvent;
const G02 = LOGS["19a"]!.events.find((e) => e.kind === "gate" && e.gate_id === 2)!;
const third: Change = (events) => [...events, { ...G02, seq: 500, gate_id: 3, summary: "G-03 rotacionar a chave" } as SquadEvent];

const UP = "\x1b[A";
const SCREENS = ["main", "topology", "thread", "questions", "help"] as const;

// Keys of no meaning in the view and the confirm modes: q, the digits, the keys of the screens,
// the other modals and enter among them
const INERT = ["q", "1", "2", "3", "4", "9", "?", "j", "k", "h", "t", "p", "b", "d", "n", "z", "g", "x", " ", "\t", "\r", UP];

test("GAT-40: g opens the modal of the pending gate in the view mode over the main screen, from every screen", () => {
  for (const screen of SCREENS) {
    const v = view("18a", { screen });
    expect(key("g", v)).toEqual({ ...v.ui, screen: "main", gate: modal(1) });
  }
});

test("GAT-40, GAT-90: g with no pending gate says nenhum gate pendente for 4 s and changes nothing else", () => {
  for (const frame of ["01", "09b"]) {
    for (const screen of SCREENS) {
      const v = view(frame, { screen });
      expect(key("g", v)).toEqual({ ...v.ui, toast: { text: "nenhum gate pendente", color: "gray", until: v.squad.now + 4000 } });
    }
  }
});

test("GAT-40, GAT-90: g with the broker not answering the reads says broker desconectado · gate desabilitado for 4 s and does not open", () => {
  const v = { ...view("18a"), down: { since: 0, attempt: 3 } };
  expect(key("g", v)).toEqual({ ...v.ui, toast: { text: "broker desconectado · gate desabilitado", color: "gray", until: v.squad.now + 4000 } });
});

test("GAT-91: with two gates pending g opens the oldest", () => {
  const v = view("19a");
  expect(key("g", v)).toEqual({ ...v.ui, screen: "main", gate: modal(1) });
});

test("GAT-92: with the gate of the modal decided and another pending, g opens the one left", () => {
  const v = view("19a", {}, (events) => [...events, decided(500, 1, "approve")]);
  expect(key("g", v)).toEqual({ ...v.ui, screen: "main", gate: modal(2) });
});

test("GAT-40: g opens the current version of the gate", () => {
  const v = view("19a", {}, (events) => [...events, { ...G02, seq: 501, gate_id: 1 } as SquadEvent]);
  expect(key("g", v)!.gate).toEqual(modal(1, { version: 2 }));
});

test("GAT-76: with the modal of answer open g goes into its text, or does nothing in its choice mode, and opens no gate", () => {
  const text = view("18a", { screen: "questions", modal: { question: 8, choice: null, text: "ab", expanded: false, sending: false, refused: false } });
  const typed = key("g", text)!;
  expect(typed.modal!.text).toBe("abg");
  expect(typed.gate).toBeNull();
  const choice = view("01", { screen: "questions", modal: { question: 7, choice: 0, text: "", expanded: false, sending: false, refused: false } });
  expect(key("g", choice)).toBe(choice.ui);
});

// ---- the view mode ----

test("GAT-50: in the view mode a goes to the confirm mode of the version on the screen, r and c to the text of a reject and of a comment, empty", () => {
  const v = opened("18a", modal(1));
  expect(key("a", v)).toEqual({ ...v.ui, gate: modal(1, { mode: "confirm" }) });
  expect(key("r", v)).toEqual({ ...v.ui, gate: modal(1, { mode: "reject" }) });
  expect(key("c", v)).toEqual({ ...v.ui, gate: modal(1, { mode: "comment" }) });
  // the version is that of the gate when a is pressed
  const two = opened("19a", modal(1), (events) => [...events, { ...G02, seq: 501, gate_id: 1 } as SquadEvent]);
  expect(key("a", two)!.gate).toEqual(modal(1, { mode: "confirm", version: 2 }));
});

test("GAT-50: a confirms the version of the gate of the modal, not that of another gate of the queue", () => {
  // G-01 asked again, in version 2; the modal is on G-02, in version 1
  const v = opened("19a", modal(2), (events) => [...events, { ...G02, seq: 501, gate_id: 1 } as SquadEvent]);
  expect(key("a", v)!.gate).toEqual(modal(2, { mode: "confirm", version: 1 }));
});

test("GAT-50: in the view mode esc closes the modal without sending", () => {
  const v = opened("18a", modal(1));
  expect(key("\x1b", v)).toEqual({ ...v.ui, gate: null });
  expect(key("\x1b", v)!.send).toBeNull();
});

test("GAT-50, GAT-76: in the view mode no other key changes the screen, not even q, g, x, 4 or enter, and ctrl+c quits", () => {
  const v = opened("18a", modal(1));
  for (const k of [...INERT, "y", "]", "["]) expect([k, key(k, v)]).toEqual([k, v.ui]);
  expect(key("\x03", v)).toBeNull();
});

test("GAT-50: ] and [ go to the next and the previous pending gate of the queue, oldest first, and stop at its ends", () => {
  // three pending: G-01, G-02 and G-03
  const views = [1, 2, 3].map((id) => opened("19a", modal(id), third));
  const at = (id: number) => views[id - 1]!;
  expect(key("]", at(1))!.gate).toEqual(modal(2));
  expect(key("[", at(1))).toBe(at(1).ui);
  expect(key("]", at(2))!.gate).toEqual(modal(3));
  expect(key("[", at(2))!.gate).toEqual(modal(1));
  expect(key("]", at(3))).toBe(at(3).ui);
  expect(key("[", at(3))!.gate).toEqual(modal(2));
  // nothing else of the screen changes
  expect(key("]", at(1))).toEqual({ ...at(1).ui, gate: modal(2) });
});

test("GAT-50: ] and [ skip a decided gate, which is out of the queue", () => {
  // G-01 approved, G-02 and G-03 pending: G-02 is the first of the queue
  const v = opened("19a", modal(2), (events) => [...third(events), decided(501, 1, "approve")]);
  expect(key("[", v)).toBe(v.ui);
  expect(key("]", v)!.gate).toEqual(modal(3));
});

// ---- the confirm mode ----

test("GAT-52: in the confirm mode y leaves the approve of the gate to send, without text, and the modal waits for the broker", () => {
  const v = opened("18a", modal(1, { mode: "confirm" }));
  expect(key("y", v)).toEqual({ ...v.ui, gate: modal(1, { mode: "confirm", sending: true }), send: { gate_id: 1, request_seq: 439, decision: "approve" } });
});

test("GAT-98: the approve and the text of a reject or a comment carry the request_seq of the version on the screen: 457 of G-01 asked again in 18b", () => {
  const v = opened("18b", modal(1, { mode: "confirm", version: 2 }));
  expect(key("y", v)!.send).toEqual({ gate_id: 1, request_seq: 457, decision: "approve" });
  for (const mode of ["reject", "comment"] as const) {
    expect(key("\r", opened("18b", modal(1, { mode, text: "falta", version: 2 })))!.send).toEqual({ gate_id: 1, request_seq: 457, decision: mode, text: "falta" });
  }
});

test("GAT-52: in the confirm mode esc goes back to the view mode, and no other key changes the screen", () => {
  const v = opened("18a", modal(1, { mode: "confirm" }));
  expect(key("\x1b", v)).toEqual({ ...v.ui, gate: modal(1) });
  for (const k of [...INERT, "a", "r", "c", "]", "["]) expect([k, key(k, v)]).toEqual([k, v.ui]);
  expect(key("\x03", v)).toBeNull();
});

// ---- the text modes ----

for (const mode of ["reject", "comment"] as const) {
  test(`GAT-54: in the text of a ${mode} a printable character goes to the end, the letters of command, the digits and q too`, () => {
    const v = opened("18a", modal(1, { mode, text: "ab" }));
    for (const k of ["a", "r", "c", "y", "d", "q", "g", "x", "4", "1", "]", "[", " ", "é", "?"]) {
      expect([k, key(k, v)]).toEqual([k, { ...v.ui, gate: modal(1, { mode, text: `ab${k}` }) }]);
    }
  });

  test(`GAT-54: in the text of a ${mode} backspace takes the last character, ctrl+u empties it and ctrl+e changes the size of the field`, () => {
    const v = opened("18a", modal(1, { mode, text: "abç" }));
    expect(key("\x7f", v)!.gate).toEqual(modal(1, { mode, text: "ab" }));
    expect(key("\x08", v)!.gate).toEqual(modal(1, { mode, text: "ab" }));
    expect(key("\x15", v)!.gate).toEqual(modal(1, { mode, text: "" }));
    expect(key("\x05", v)!.gate).toEqual(modal(1, { mode, text: "abç", expanded: true }));
    expect(key("\x05", opened("18a", modal(1, { mode, text: "abç", expanded: true })))!.gate).toEqual(modal(1, { mode, text: "abç" }));
    // an arrow is not text
    expect(key(UP, v)).toBe(v.ui);
    expect(key("\x03", v)).toBeNull();
  });

  test(`GAT-54: in the text of a ${mode} esc goes back to the view mode without the text`, () => {
    const v = opened("18a", modal(1, { mode, text: "falta o teste" }));
    expect(key("\x1b", v)).toEqual({ ...v.ui, gate: modal(1) });
  });

  test(`GAT-55: in the text of a ${mode} enter leaves the decision ${mode} to send with the text without the spaces of its ends`, () => {
    const v = opened("18a", modal(1, { mode, text: "  falta o teste do parser  " }));
    expect(key("\r", v)).toEqual({
      ...v.ui,
      gate: modal(1, { mode, text: "  falta o teste do parser  ", sending: true }),
      send: { gate_id: 1, request_seq: 439, decision: mode, text: "falta o teste do parser" },
    });
  });

  test(`GAT-56: in the text of a ${mode} enter with the field empty or with spaces alone sends nothing and marks the field, until a key changes the text`, () => {
    for (const text of ["", "   "]) {
      const v = opened("18a", modal(1, { mode, text }));
      const marked = key("\r", v)!;
      expect(marked).toEqual({ ...v.ui, gate: modal(1, { mode, text, empty: true }) });
      expect(marked.send).toBeNull();
      const after = { ...v, ui: marked };
      // a key that changes the text clears the mark
      expect(key("a", after)!.gate).toEqual(modal(1, { mode, text: `${text}a` }));
      // keys that do not change it keep it
      expect(key("\x05", after)!.gate).toEqual(modal(1, { mode, text, empty: true, expanded: true }));
      expect(key(UP, after)).toBe(marked);
    }
    // backspace and ctrl+u on an empty field change nothing; on spaces they change the text
    const empty = { ...opened("18a", modal(1, { mode })), ui: { ...opened("18a", modal(1, { mode })).ui, gate: modal(1, { mode, empty: true }) } };
    expect(key("\x7f", empty)).toBe(empty.ui);
    expect(key("\x15", empty)).toBe(empty.ui);
    const spaces = opened("18a", modal(1, { mode, text: "  ", empty: true }));
    expect(key("\x7f", spaces)!.gate).toEqual(modal(1, { mode, text: " " }));
    expect(key("\x15", spaces)!.gate).toEqual(modal(1, { mode }));
  });
}

// ---- what the broker says of a decision, and what a read does to the modal ----

// The view of 18a with the decision of the modal on its way
const sending = (m: GateModal, send: Ui["send"]): View => {
  const v = opened("18a", { ...m, sending: true });
  return { ...v, ui: { ...v.ui, send } };
};
const toast = (v: View, text: string, color: Color) => ({ text, color, until: v.squad.now + 4000 });

test("GAT-57: when the broker takes the decision the modal closes and says in green for 4 s what was decided", () => {
  for (const [decision, mode, text] of [
    ["approve", "confirm", "✓ G-01 aprovado"],
    ["reject", "reject", "✓ G-01 rejeitado"],
    ["comment", "comment", "✓ G-01 comentado · continua pendente"],
  ] as const) {
    const v = sending(modal(1, { mode, text: decision === "approve" ? "" : "falta" }), { gate_id: 1, request_seq: 439, decision, ...(decision !== "approve" && { text: "falta" }) });
    expect(settle(v.ui, { ok: true }, v)).toEqual({ ...v.ui, gate: null, send: null, toast: toast(v, text, "bgreen") });
  }
});

test("GAT-58: gate_closed closes the modal and says in red for 4 s that the gate was already decided", () => {
  const v = sending(modal(1, { mode: "reject", text: "falta" }), { gate_id: 1, request_seq: 439, decision: "reject", text: "falta" });
  expect(settle(v.ui, { ok: false, error: "gate_closed" }, v)).toEqual({ ...v.ui, gate: null, send: null, toast: toast(v, "✗ G-01 já decidido", "bred") });
});

test("GAT-58: another refusal, or the broker not answering, takes the modal back to the mode it sent from, with its text, and says in red for 4 s why", () => {
  for (const error of ["invalid_token", "missing_field", "invalid_field", "broker não respondeu"]) {
    for (const [m, send] of [
      [modal(1, { mode: "confirm" }), { gate_id: 1, request_seq: 439, decision: "approve" }],
      [modal(1, { mode: "reject", text: "  falta o teste  " }), { gate_id: 1, request_seq: 439, decision: "reject", text: "falta o teste" }],
      [modal(1, { mode: "comment", text: "e o iOS?", expanded: true }), { gate_id: 1, request_seq: 439, decision: "comment", text: "e o iOS?" }],
    ] as const) {
      const v = sending(m, send);
      expect(settle(v.ui, { ok: false, error }, v)).toEqual({ ...v.ui, gate: m, send: null, toast: toast(v, `✗ decisão não enviada · ${error}`, "bred") });
    }
  }
});

test("GAT-58, GAT-59: gate_reissued takes the confirm mode back to the view mode, so a second y does not approve the version asked again, and a text mode back as it was", () => {
  // y on G-01 in 18a, then the read of 18b, where the mother asked it again, while the approve is on its way
  const sent = key("y", opened("18a", modal(1, { mode: "confirm" })))!;
  expect(sent.send).toEqual({ gate_id: 1, request_seq: 439, decision: "approve" });
  const after = view("18b", sent);
  expect(sync(sent, after)).toBe(sent);
  const settled = settle(sent, { ok: false, error: "gate_reissued" }, after);
  expect(settled).toEqual({ ...sent, gate: modal(1), send: null, toast: toast(after, "✗ decisão não enviada · gate_reissued", "bred") });
  expect(press(settled, "y", { ...after, ui: settled })).toBe(settled);
  for (const [m, send] of [
    [modal(1, { mode: "reject", text: "falta" }), { gate_id: 1, request_seq: 439, decision: "reject", text: "falta" }],
    [modal(1, { mode: "comment", text: "e o iOS?" }), { gate_id: 1, request_seq: 439, decision: "comment", text: "e o iOS?" }],
  ] as const) {
    const v = sending(m, send);
    expect(settle(v.ui, { ok: false, error: "gate_reissued" }, v)).toEqual({ ...v.ui, gate: m, send: null, toast: toast(v, "✗ decisão não enviada · gate_reissued", "bred") });
  }
});

test("GAT-74: with no human credential nothing is sent, the modal goes back to the mode it sent from and says so", () => {
  const m = modal(1, { mode: "reject", text: "falta" });
  const v = sending(m, { gate_id: 1, request_seq: 439, decision: "reject", text: "falta" });
  expect(settle(v.ui, null, v)).toEqual({ ...v.ui, gate: m, send: null, toast: toast(v, "✗ credencial humana não encontrada", "bred") });
});

test("GAT-73: while a decision waits for the broker no key changes the modal, in any mode, but ctrl+c quits", () => {
  for (const mode of ["view", "confirm", "reject", "comment"] as const) {
    const v = opened("18a", modal(1, { mode, text: "falta", sending: true }));
    for (const k of ["\x1b", "y", "a", "r", "c", "\r", "]", "[", "q", "z", "\x7f", "\x15", "\x05", "g", "x"]) expect([mode, k, key(k, v)]).toEqual([mode, k, v.ui]);
    expect(key("\x03", v)).toBeNull();
  }
});

test("GAT-59: a read that shows the gate of the modal decided closes the modal, loses its text and says G-NN fechado for 4 s", () => {
  for (const decision of ["approve", "reject"]) {
    const v = opened("18a", modal(1, { mode: "reject", text: "falta" }), (events) => [...events, decided(500, 1, decision)]);
    expect(sync(v.ui, v)).toEqual({ ...v.ui, gate: null, toast: toast(v, "G-01 fechado", "gray") });
  }
});

test("GAT-97: a read that shows the feature closed with the modal open closes it as GAT-59", () => {
  const close = { ...COMMENT, seq: 500, kind: "feature_closed", to: "*", outcome: "abandoned" } as unknown as SquadEvent;
  for (const mode of ["view", "confirm", "comment"] as const) {
    const v = opened("18a", modal(1, { mode }), (events) => [...events, close]);
    expect(sync(v.ui, v)).toEqual({ ...v.ui, gate: null, toast: toast(v, "G-01 fechado", "gray") });
  }
});

test("GAT-59: a read that shows a new version of the gate takes the confirm mode back to the view mode, and leaves the other modes as they are", () => {
  const reissued: Change = (events) => [...events, { ...G02, seq: 501, gate_id: 1 } as SquadEvent];
  const confirm = opened("19a", modal(1, { mode: "confirm" }), reissued);
  expect(sync(confirm.ui, confirm)).toEqual({ ...confirm.ui, gate: modal(1) });
  for (const m of [modal(1), modal(1, { mode: "reject", text: "falta" }), modal(1, { mode: "comment", text: "e o iOS?" })]) {
    const v = opened("19a", m, reissued);
    expect(sync(v.ui, v)).toBe(v.ui);
  }
  // the version that was confirmed is the one on the screen
  const same = opened("19a", modal(1, { mode: "confirm", version: 2 }), reissued);
  expect(sync(same.ui, same)).toBe(same.ui);
});

test("GAT-59: a read changes nothing in a modal whose decision is on its way, nor in that of a gate still pending", () => {
  const decidedOnTheWay = opened("18a", modal(1, { mode: "confirm", sending: true }), (events) => [...events, decided(500, 1, "approve")]);
  expect(sync(decidedOnTheWay.ui, decidedOnTheWay)).toBe(decidedOnTheWay.ui);
  const pending = opened("18a", modal(1, { mode: "comment", text: "e o iOS?" }));
  expect(sync(pending.ui, pending)).toBe(pending.ui);
});

test("GAT-59: a read that shows another gate decided leaves the modal of a gate still pending open", () => {
  // G-01 approved, the modal on G-02
  const v = opened("19a", modal(2, { mode: "comment", text: "e o iOS?" }), (events) => [...events, decided(500, 1, "approve")]);
  expect(sync(v.ui, v)).toBe(v.ui);
});

// ---- a paste, and the broker not answering ----

const START_PASTE = "\x1b[200~";
const END_PASTE = "\x1b[201~";
// The state after each chunk, read one after the other
const chunks = (v: View, ...read: string[]) => read.reduce<Ui | null>((ui, chunk) => (ui ? input(ui, chunk, { ...v, ui }) : ui), v.ui);

test("GAT-75: a paste never decides the gate: y, a, d and a line break are no key with the modal reading or confirming, first, in the middle and last in the chunk", () => {
  for (const mode of ["view", "confirm"] as const) {
    const v = opened("18a", modal(1, { mode }));
    for (const chunk of ["ay", "ya", "yy", "\ry", "y\r", "a\n", "zyz", "zaz", "z\rz", "dz", "zd"]) {
      expect([mode, chunk, input(v.ui, chunk, v)]).toEqual([mode, chunk, v.ui]);
    }
  }
  // the keys around them still count: ] and [ walk the queue, and y does not confirm
  const queue = opened("19a", modal(1));
  expect(input(queue.ui, "]a", queue)!.gate).toEqual(modal(2));
  expect(input(queue.ui, "a]", queue)!.gate).toEqual(modal(2));
  expect(input(queue.ui, "]a[", queue)!.gate).toEqual(modal(1));
});

test("GAT-75: the g that opens the modal in a paste does not let the rest of the paste decide", () => {
  const v = view("18a");
  for (const chunk of ["ga", "gay", "g\r", "ga\ry"]) {
    const next = input(v.ui, chunk, v)!;
    expect([chunk, next.gate, next.send]).toEqual([chunk, modal(1), null]);
  }
});

test("GAT-75: between the marks of a delimited paste, split in two reads, y and a decide nothing, and y typed after the paste confirms", () => {
  const confirm = opened("18a", modal(1, { mode: "confirm" }));
  expect(chunks(confirm, `${START_PASTE}a`, `y\r${END_PASTE}`)).toEqual(confirm.ui);
  expect(chunks(confirm, START_PASTE, "y", END_PASTE)).toEqual(confirm.ui);
  expect(chunks(confirm, START_PASTE, "\r", END_PASTE)).toEqual(confirm.ui);
  expect(chunks(confirm, START_PASTE, "y", END_PASTE, "y")!.send).toEqual({ gate_id: 1, request_seq: 439, decision: "approve" });
  const reading = opened("18a", modal(1));
  expect(chunks(reading, START_PASTE, "a", END_PASTE)).toEqual(reading.ui);
});

for (const mode of ["reject", "comment"] as const) {
  test(`GAT-75: in the text of a ${mode} a pasted line break is a space and the letters go in, first, in the middle and last in the chunk, and nothing is sent`, () => {
    const v = opened("18a", modal(1, { mode, text: "x" }));
    for (const [chunk, text] of [["\rya", "x ya"], ["y\ra", "xy a"], ["ya\n", "xya "], ["a\r\nd", "xa  d"]] as const) {
      const next = input(v.ui, chunk, v)!;
      expect([chunk, next.gate, next.send]).toEqual([chunk, modal(1, { mode, text }), null]);
    }
    const split = chunks(v, `${START_PASTE}ad`, `\ry${END_PASTE}`)!;
    expect([split.gate, split.send]).toEqual([modal(1, { mode, text: "xad y" }), null]);
    const alone = chunks(v, START_PASTE, "\r", END_PASTE)!;
    expect([alone.gate, alone.send]).toEqual([modal(1, { mode, text: "x " }), null]);
  });
}

test("GAT-77: with the broker not answering the reads no key changes the modal of gate, in any mode, but ctrl+c quits", () => {
  for (const mode of ["view", "confirm", "reject", "comment"] as const) {
    const v = { ...opened("18a", modal(1, { mode, text: mode === "reject" || mode === "comment" ? "falta" : "" })), down: { since: 0, attempt: 2 } };
    for (const k of ["\x1b", "y", "a", "r", "c", "\r", "]", "[", "q", "z", "\x7f", "\x15", "\x05", "g", "x", "4"]) expect([mode, k, key(k, v)]).toEqual([mode, k, v.ui]);
    expect(input(v.ui, "y", v)).toBe(v.ui);
    expect(key("\x03", v)).toBeNull();
    expect(input(v.ui, "\x03", v)).toBeNull();
  }
});
