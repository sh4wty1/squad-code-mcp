import { expect, test } from "bun:test";
import { input, isReport, keysOf } from "../../tui/keys.ts";
import type { Modal, Ui, View } from "../../tui/view.ts";
import { frameView } from "../frames/view.ts";

// The view of a frame with the state of the screen changed, and with its modal changed: 06 is
// Q-08 in the text mode, 05 is Q-07 on the first of its three options
function view(frame: string, ui: Partial<Ui> = {}): View {
  const v = frameView(frame);
  return { ...v, ui: { ...v.ui, ...ui } };
}
const open = (frame: string, modal: Partial<Modal> = {}): View => view(frame, { modal: { ...frameView(frame).ui.modal!, ...modal } });

const UP = "\x1b[A";

// A click on column 12 of line 5 and its release; the same with a letter before the three
// integers; and the old format, whose three characters are the button, the column and the line
const PRESS = "\x1b[<0;12;5M";
const RELEASE = "\x1b[<0;12;5m";
const SHORT = "\x1b[<0;12M";
const OLD = "\x1b[M !q";
// A report whose end did not come
const OPEN = "\x1b[<0;1";

const WHOLE: [what: string, report: string][] = [
  ["a press", PRESS],
  ["a release", RELEASE],
  ["a letter before the three integers", SHORT],
  ["the old format", OLD],
];
const ALL: [what: string, report: string][] = [...WHOLE, ["a report without its end", OPEN]];

for (const [what, report] of WHOLE) {
  test(`CLK-03: ${what} is one item of the input, and the keys before and after it are the items they were`, () => {
    expect(keysOf(report)).toEqual([report]);
    expect(keysOf("j" + report + "k")).toEqual(["j", report, "k"]);
    expect(keysOf(UP + report + "\r")).toEqual([UP, report, "\r"]);
    expect(keysOf("2" + report + report + "q")).toEqual(["2", report, report, "q"]);
  });
}

test("CLK-03: a report without its end is one item at the end of the input, and the key before it is the item it was", () => {
  expect(keysOf(OPEN)).toEqual([OPEN]);
  expect(keysOf("j" + OPEN)).toEqual(["j", OPEN]);
  expect(keysOf(UP + PRESS + OPEN)).toEqual([UP, PRESS, OPEN]);
  // What comes after it and is neither a digit, a `;` nor a letter is a key
  expect(keysOf(OPEN + "\r")).toEqual([OPEN, "\r"]);
});

test("CLK-10: the old format cut before its three characters is one item", () => {
  expect(keysOf("j\x1b[M")).toEqual(["j", "\x1b[M"]);
  expect(keysOf("j\x1b[M !")).toEqual(["j", "\x1b[M !"]);
});

test("CLK-03: a report is told from a key by how it starts", () => {
  for (const [, report] of ALL) expect(isReport(report)).toBe(true);
  expect(isReport("\x1b[M")).toBe(true);
  for (const key of ["\x1b", UP, "\x1b[Z", "\x1b[3~", "\x1b[200~", "\x1b[201~", "M", "<", "1", "\r", "q"]) expect(isReport(key)).toBe(false);
});

for (const [what, report] of ALL) {
  test(`CLK-04: ${what} adds no character to the text of the modal`, () => {
    const v = open("06", { text: "" });
    expect(input(v.ui, report, v)).toBe(v.ui);
    // What is typed before it in the same read is in the text, and nothing of the report
    expect(input(v.ui, "ab" + report, v)).toEqual({ ...v.ui, modal: { ...v.ui.modal!, text: "ab" } });
  });

  test(`CLK-04: ${what} presses no key with no modal open: its digits change no screen and its start is no esc`, () => {
    for (const screen of ["main", "topology", "thread", "questions", "help"] as const) {
      const v = view("01", { screen, selected: 417 });
      expect(input(v.ui, report, v)).toBe(v.ui);
    }
  });
}

for (const [what, report] of WHOLE) {
  test(`CLK-04: the keys around ${what} are pressed, in their order`, () => {
    const text = open("06", { text: "" });
    expect(input(text.ui, "a" + report + "b", text)).toEqual({ ...text.ui, modal: { ...text.ui.modal!, text: "ab" } });
    // 2 shows the topology and p pauses the feed
    const main = view("01", { selected: 417 });
    expect(input(main.ui, "2" + report + "p", main)).toEqual({ ...main.ui, screen: "topology", paused: true });
  });
}

test("CLK-09: a sequence that starts by ESC [ < and reaches a letter without the three integers is discarded whole, also when the letter is q", () => {
  const main = view("01", { selected: 417 });
  const text = open("06", { text: "" });
  for (const report of ["\x1b[<M", "\x1b[<0M", "\x1b[<0;12M", "\x1b[<;;M", "\x1b[<0;12;5;7M", "\x1b[<0;12;5q", "\x1b[<0;1q", "\x1b[<2j"]) {
    expect(keysOf(report)).toEqual([report]);
    expect(input(main.ui, report, main)).toBe(main.ui);
    expect(input(text.ui, report, text)).toBe(text.ui);
  }
});

test("CLK-10: the three characters after ESC [ M are no keys, also when one of them is q", () => {
  const main = view("01", { selected: 417 });
  const text = open("06", { text: "" });
  for (const report of ["\x1b[Mq !", "\x1b[M q!", "\x1b[M !q", "\x1b[Mqqq", "\x1b[M124"]) {
    expect(input(main.ui, report, main)).toBe(main.ui);
    expect(input(text.ui, report, text)).toBe(text.ui);
  }
  // The key after the three is a key: q quits
  expect(input(main.ui, "\x1b[M !!q", main)).toBeNull();
});

for (const [what, report] of ALL) {
  test(`CLK-16: a line break in the read of ${what} is a space in the text mode and nothing in the choice mode, and sends nothing`, () => {
    const text = open("06", { text: "logo" });
    const choice = open("05", { choice: 1 });
    for (const eol of ["\r", "\n"]) {
      const typed = input(text.ui, report + eol, text)!;
      expect(typed).toEqual({ ...text.ui, modal: { ...text.ui.modal!, text: "logo " } });
      expect(typed.send).toBeNull();
      const chosen = input(choice.ui, report + eol, choice)!;
      expect(chosen).toEqual(choice.ui);
      expect(chosen.send).toBeNull();
    }
  });
}

for (const [what, report] of WHOLE) {
  test(`CLK-16: a line break that comes before ${what} in its read is pasted too`, () => {
    const text = open("06", { text: "logo" });
    const choice = open("05", { choice: 1 });
    for (const eol of ["\r", "\n"]) {
      expect(input(text.ui, eol + report, text)).toEqual({ ...text.ui, modal: { ...text.ui.modal!, text: "logo " } });
      expect(input(choice.ui, eol + report, choice)).toEqual(choice.ui);
    }
  });
}

test("CLK-16: enter alone in its read still sends, in the two modes", () => {
  const text = open("06", { text: "logo" });
  expect(input(text.ui, "\r", text)!.send).toEqual({ question_id: 8, answer: "logo" });
  const choice = open("05", { choice: 1 });
  expect(input(choice.ui, "\r", choice)!.send).toEqual({ question_id: 7, answer: "5 tentativas" });
});
