import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { press } from "../../tui/keys.ts";
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
  expect(typed.gate).toBeUndefined();
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

// ---- the confirm mode ----

test("GAT-52: in the confirm mode y leaves the approve of the gate to send, without text, and the modal waits for the broker", () => {
  const v = opened("18a", modal(1, { mode: "confirm" }));
  expect(key("y", v)).toEqual({ ...v.ui, gate: modal(1, { mode: "confirm", sending: true }), send: { gate_id: 1, decision: "approve" } });
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
      send: { gate_id: 1, decision: mode, text: "falta o teste do parser" },
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
