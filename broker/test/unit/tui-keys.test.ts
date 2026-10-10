import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { resolved, waiting } from "../../tui/asked.ts";
import { feed } from "../../tui/feed.ts";
import { keysOf, press, settle, START, sync, visible } from "../../tui/keys.ts";
import type { Modal, Ui, View } from "../../tui/view.ts";
import { LOGS } from "../frames/logs.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

// The view of a frame with the state of the screen changed. In frame 01 the feature is open,
// Q-07 is open, blocking and with the dev (its latest question is 422), Q-08 is open with the
// dev and not blocking (428), and the plan has TKT-12, TKT-13 and TKT-14.
function view(frame: string, ui: Partial<Ui> = {}, change?: Change): View {
  const v = frameView(frame, change);
  return { ...v, ui: { ...v.ui, ...ui } };
}
const key = (k: string, v: View) => press(v.ui, k, v)!;

const UP = "\x1b[A";
const DOWN = "\x1b[B";

test("the screen starts on the main one, with no line selected, the feed in focus and the tokens of the feature", () => {
  expect(START).toEqual({ screen: "main", selected: null, focus: 1, paused: false, scope: "feature", toast: null, threadTicket: null, threadOffset: 0, question: null, qfocus: "list", historyOffset: 0, modal: null, send: null });
});

test("TUI-62: 1, 2, 3 and ? change the screen and esc goes back to the main one", () => {
  const v = view("01", { screen: "help" });
  expect(key("1", v).screen).toBe("main");
  expect(key("2", v).screen).toBe("topology");
  expect(key("3", v).screen).toBe("thread");
  expect(key("?", view("01")).screen).toBe("help");
  for (const screen of ["topology", "thread", "help"] as const) expect(key("\x1b", view("01", { screen })).screen).toBe("main");
  // Nothing else of the state changes
  expect(key("2", v)).toEqual({ ...v.ui, screen: "topology" });
});

test("TUI-62: j, k and the arrows move the selection of the feed by one line, and stop at its ends", () => {
  const v = view("01", { selected: 417 });
  expect(key("j", v).selected).toBe(418);
  expect(key(DOWN, v).selected).toBe(418);
  expect(key("k", v).selected).toBe(416);
  expect(key(UP, v).selected).toBe(416);

  const first = v.rows[0]!.seq;
  const last = v.rows.at(-1)!.seq;
  expect(key("k", view("01", { selected: first })).selected).toBe(first);
  expect(key("j", view("01", { selected: last })).selected).toBe(last);
  // With no line selected the selection starts at the latest
  expect(key("k", view("01", { selected: null })).selected).toBe(last);
  expect(key("j", view("01", { selected: null })).selected).toBe(last);
  // An empty log has no line to select
  expect(key("j", view("28a")).selected).toBeNull();
});

test("TUI-62: in the thread j, k and the arrows scroll the entries and leave the selection of the feed", () => {
  const v = view("01", { screen: "thread", selected: 417, threadOffset: 2 });
  expect(key("k", v)).toEqual({ ...v.ui, threadOffset: 3 });
  expect(key(UP, v)).toEqual({ ...v.ui, threadOffset: 3 });
  expect(key("j", v)).toEqual({ ...v.ui, threadOffset: 1 });
  expect(key(DOWN, v)).toEqual({ ...v.ui, threadOffset: 1 });
  // The latest entry is the bottom
  expect(key("j", view("01", { screen: "thread", threadOffset: 0 })).threadOffset).toBe(0);
});

test("TUI-62: tab and shift+tab change the panel in focus, around the three", () => {
  expect(([0, 1, 2] as const).map((focus) => key("\t", view("01", { focus })).focus)).toEqual([1, 2, 0]);
  expect(([0, 1, 2] as const).map((focus) => key("\x1b[Z", view("01", { focus })).focus)).toEqual([2, 0, 1]);
});

test("TUI-62: enter opens the thread, from its latest entry, of the ticket of the selected line", () => {
  // 417 is the verdict of TKT-12; a thread of another ticket was open before
  const v = view("01", { selected: 417, threadTicket: "TKT-14", threadOffset: 5 });
  expect(key("\r", v)).toEqual({ ...v.ui, screen: "thread", threadTicket: null, threadOffset: 0 });
  expect(key("3", v)).toEqual({ ...v.ui, screen: "thread", threadTicket: null, threadOffset: 0 });
  // The question of a closed question is a line like any other: 412 is of Q-06, answered
  expect(key("\r", view("01", { selected: 412 })).screen).toBe("thread");
  // And so is an open one that did not reach the dev: in frame 15a, 455 is with the mother
  expect(key("\r", view("15a", { selected: 455 })).screen).toBe("thread");
});

test("TUI-62: [ and ] go to the ticket before and after in the thread, and stop at the ends of the plan", () => {
  // The thread of the selected line: 417 is of TKT-12, the first of the plan
  const first = view("01", { screen: "thread", selected: 417, threadOffset: 4 });
  expect(key("]", first)).toEqual({ ...first.ui, threadTicket: "TKT-13", threadOffset: 0 });
  expect(key("[", first).threadTicket).toBe("TKT-12");
  expect(key("[", view("01", { screen: "thread", threadTicket: "TKT-14" })).threadTicket).toBe("TKT-13");
  expect(key("]", view("01", { screen: "thread", threadTicket: "TKT-14" })).threadTicket).toBe("TKT-14");
  // Outside the thread, and without tickets, the keys do nothing
  const main = view("01", { selected: 417 });
  expect(key("]", main)).toBe(main.ui);
  const none = view("26a", { screen: "thread" });
  expect(key("]", none)).toBe(none.ui);
});

test("TUI-62: p pauses and resumes the feed", () => {
  const v = view("01");
  expect(key("p", v)).toEqual({ ...v.ui, paused: true });
  expect(key("p", view("01", { paused: true })).paused).toBe(false);
});

test("TUI-62: q and ctrl+c quit", () => {
  const v = view("01");
  expect(press(v.ui, "q", v)).toBeNull();
  expect(press(v.ui, "\x03", v)).toBeNull();
});

test("TUI-62: a key with no meaning leaves the state as it is", () => {
  const v = view("01", { screen: "topology" });
  for (const k of ["z", "G", " ", "\x1b[C", "\x1b[D"]) expect(key(k, v)).toBe(v.ui);
});

test("TUI-63, QST-91: g and x say for 4 s that the Gate slice brings them and do not change the screen", () => {
  for (const screen of ["main", "topology", "thread", "questions", "help"] as const) {
    const v = view("01", { screen });
    const until = v.squad.now + 4000;
    expect(key("g", v)).toEqual({ ...v.ui, toast: { text: "chega com a fatia Gate", color: "gray", until } });
    expect(key("x", v)).toEqual({ ...v.ui, toast: { text: "chega com a fatia Gate", color: "gray", until } });
  }
});

test("QST-91: 4 and enter never say that the Question slice brings them", () => {
  for (const screen of ["main", "topology", "thread", "questions", "help"] as const) {
    expect(key("4", view("01", { screen })).toast).toBeNull();
    for (const { seq } of view("01").rows) expect(key("\r", view("01", { screen, selected: seq })).toast).toBeNull();
  }
});

test("QST-64: 4 shows the tab of questions from any screen, and esc goes back from it to the main one", () => {
  for (const screen of ["main", "topology", "thread", "questions", "help"] as const) {
    const v = view("01", { screen, selected: 417 });
    expect(key("4", v)).toEqual({ ...v.ui, screen: "questions" });
  }
  const tab = view("04");
  expect(key("\x1b", tab)).toEqual({ ...tab.ui, screen: "main" });
});

test("QST-63: h moves the focus of the tab between the list and the history, and does nothing outside it", () => {
  const list = view("04");
  expect(key("h", list)).toEqual({ ...list.ui, qfocus: "history" });
  const history = view("04", { qfocus: "history" });
  expect(key("h", history)).toEqual({ ...history.ui, qfocus: "list" });
  const main = view("01", { selected: 417 });
  expect(key("h", main)).toBe(main.ui);
});

test("QST-63: with the focus on the list j, k and the arrows move the selection by one question, and stop at its ends", () => {
  // The list of frame 04 is Q-07, then Q-08
  const first = view("04", { question: 7, selected: 417 });
  expect(key("j", first)).toEqual({ ...first.ui, question: 8 });
  expect(key(DOWN, first)).toEqual({ ...first.ui, question: 8 });
  expect(key("k", first).question).toBe(7);
  expect(key(UP, first).question).toBe(7);
  const last = view("04", { question: 8 });
  expect(key("k", last)).toEqual({ ...last.ui, question: 7 });
  expect(key(UP, last)).toEqual({ ...last.ui, question: 7 });
  expect(key("j", last).question).toBe(8);
  expect(key(DOWN, last).question).toBe(8);
  // With no id selected the first of the list is the selected one
  expect(key("j", view("04", { question: null })).question).toBe(8);
  // An empty list has no question to select: in frame 15a none is with the dev
  const empty = view("15a", { screen: "questions" });
  expect(key("j", empty)).toBe(empty.ui);
});

test("QST-63: with the focus on the history j, k and the arrows move it by one question, not before its start and never leaving fewer than 4 on the screen", () => {
  // Frame 04 has 6 resolved questions: the last 4 are the ones from the third
  const top = view("04", { qfocus: "history", question: 7, selected: 417 });
  expect(key("j", top)).toEqual({ ...top.ui, historyOffset: 1 });
  expect(key(DOWN, top)).toEqual({ ...top.ui, historyOffset: 1 });
  expect(key("k", top).historyOffset).toBe(0);
  expect(key(UP, top).historyOffset).toBe(0);
  const middle = view("04", { qfocus: "history", historyOffset: 1 });
  expect(key("j", middle).historyOffset).toBe(2);
  expect(key("k", middle)).toEqual({ ...middle.ui, historyOffset: 0 });
  expect(key(UP, middle)).toEqual({ ...middle.ui, historyOffset: 0 });
  const bottom = view("04", { qfocus: "history", historyOffset: 2 });
  expect(key("j", bottom).historyOffset).toBe(2);
  expect(key(DOWN, bottom).historyOffset).toBe(2);
  // Five fit on the screen: without Q-04 there is nothing to move
  const five = view("04", { qfocus: "history" }, (events) => events.filter((e) => (e as { question_id?: number }).question_id !== 4));
  expect(resolved(five.squad)).toHaveLength(5);
  expect(key("j", five).historyOffset).toBe(0);
  // With the focus on the list the history stays where it is
  expect(key("j", view("04", { historyOffset: 1 })).historyOffset).toBe(1);
});

// The modal of answer as it opens: on the first option, or on an empty text
const opened = (question: number, choice: number | null) => ({ question, choice, text: "", expanded: false, sending: false, refused: false });

test("QST-66: enter on the feed over a question of an open question that is with the dev shows the tab with it selected and the modal of its answer", () => {
  // 422 is Q-07 where it reached the dev and 420 where it was asked, to the leader: it has options
  for (const selected of [422, 420]) {
    const v = view("01", { selected, qfocus: "history" });
    expect(key("\r", v)).toEqual({ ...v.ui, screen: "questions", question: 7, qfocus: "list", modal: opened(7, 0) });
  }
  // Q-08 has none: 428 and 427 are its questions
  for (const selected of [428, 427]) {
    const v = view("01", { selected });
    expect(key("\r", v)).toEqual({ ...v.ui, screen: "questions", question: 8, qfocus: "list", modal: opened(8, null) });
  }
});

test("QST-67: enter on the tab opens the modal of the selected question, and does nothing without a question in the list", () => {
  const first = view("04", { question: 7, selected: 417 });
  expect(key("\r", first)).toEqual({ ...first.ui, modal: opened(7, 0) });
  const second = view("04", { question: 8 });
  expect(key("\r", second)).toEqual({ ...second.ui, modal: opened(8, null) });
  // With no id selected, the first of the list
  expect(key("\r", view("04", { question: null })).modal).toEqual(opened(7, 0));
  // The line selected in the feed does not count on the tab: 428 is of Q-08
  expect(key("\r", view("04", { question: 7, selected: 428 })).modal).toEqual(opened(7, 0));
  const empty = view("15a", { screen: "questions", selected: 455 });
  expect(key("\r", empty)).toBe(empty.ui);
});

test("TUI-42: t switches the footer between the tokens of the feature and of the session", () => {
  const stale = { text: "nenhuma bloqueante", color: "gray" as const, until: LOGS["01"]!.now + 1000 };
  const v = view("01", { toast: stale });
  expect(key("t", v)).toEqual({ ...v.ui, scope: "session", toast: null });
  expect(key("t", view("01", { scope: "session" })).scope).toBe("feature");
});

test("TUI-42: without an open feature t says only the session exists, for 4 s", () => {
  // Frame 09a: the feature was delivered
  const v = view("09a");
  expect(key("t", v)).toEqual({ ...v.ui, toast: { text: "sem feature aberta · só a sessão", color: "gray", until: v.squad.now + 4000 } });
});

// Two more blocking questions reach the dev after Q-07: the list is Q-07, Q-20, Q-21, then Q-08
const q07 = LOGS["01"]!.events.find((e) => e.seq === 422)!;
const blockers: Change = (events) => [
  ...events,
  { ...q07, seq: 500, ts: q07.ts + 60_000, question_id: 20, asked_by: "worker-2", summary: "? Q-20 [BLOQUEANTE]" } as SquadEvent,
  { ...q07, seq: 501, ts: q07.ts + 120_000, question_id: 21, asked_by: "worker-3", summary: "? Q-21 [BLOQUEANTE]" } as SquadEvent,
];

test("QST-65: b outside the tab shows it with the first blocking question of the list selected and the focus on the list", () => {
  for (const screen of ["main", "topology", "thread", "help"] as const) {
    const v = view("01", { screen, selected: 417, question: 8, qfocus: "history" }, blockers);
    expect(key("b", v)).toEqual({ ...v.ui, screen: "questions", question: 7, qfocus: "list" });
  }
});

test("QST-65: b on the tab selects the blocking question after the selected one in the order of the list, and the first after the last", () => {
  const at = (question: number | null) => view("04", { question, selected: 417 }, blockers);
  expect(waiting(at(7).squad).map((q) => q.id)).toEqual([7, 20, 21, 8]);
  expect(key("b", at(7))).toEqual({ ...at(7).ui, question: 20 });
  expect(key("b", at(20)).question).toBe(21);
  expect(key("b", at(21)).question).toBe(7);
  // Q-08 does not block and comes after all that do
  expect(key("b", at(8)).question).toBe(7);
  // With no id selected the first of the list is the selected one
  expect(key("b", at(null)).question).toBe(20);
  // The only blocking one stays selected
  expect(key("b", view("04", { question: 7 })).question).toBe(7);
});

test("QST-65: b without a blocking question with the dev says so, for 4 s, and does not change the screen", () => {
  // Frame 15a: the blocking question of the leader is with the mother; frame 09a has no feature
  for (const frame of ["15a", "09a"]) {
    for (const screen of ["main", "topology", "questions"] as const) {
      const v = view(frame, { screen });
      expect(key("b", v)).toEqual({ ...v.ui, toast: { text: "nenhuma bloqueante", color: "gray", until: v.squad.now + 4000 } });
    }
  }
  // An open one with the dev that does not block is not one either
  const answered: Change = (events) => events.filter((e) => !(e.kind === "question" && e.question_id === 7));
  expect(key("b", view("01", {}, answered)).toast?.text).toBe("nenhuma bloqueante");
});

test("edge case: the selection stays on the same line when new lines arrive", () => {
  const events = LOGS["01"]!.events;
  const before = events.filter((e) => e.seq <= 422);
  const rows = (log: SquadEvent[]) => feed(log);
  const ui: Ui = { ...START, selected: 417 };
  const at = (log: SquadEvent[]): View => ({ ...frameView("01"), squad: squad(log, LOGS["01"]!.now), rows: rows(log), ui });

  expect(rows(events).length).toBeGreaterThan(rows(before).length);
  // The same line is selected in both, and a step from it lands on the same neighbour
  expect(rows(events).find((row) => row.seq === ui.selected)!.event).toBe(rows(before).find((row) => row.seq === ui.selected)!.event);
  expect(press(ui, "j", at(before))!.selected).toBe(418);
  expect(press(ui, "j", at(events))!.selected).toBe(418);
});

test("p freezes the lines of the feed and the selection, and resuming shows what arrived", () => {
  const events = LOGS["01"]!.events;
  const shown = feed(events.filter((e) => e.seq <= 422));
  const fresh = feed(events);
  const paused: Ui = { ...START, selected: 417, paused: true };

  expect(visible(paused, fresh, shown)).toBe(shown);
  expect(visible({ ...paused, paused: false }, fresh, shown)).toBe(fresh);
  // The keys move over the frozen lines: 422 is the latest of them
  const v: View = { ...frameView("01"), rows: visible(paused, fresh, shown), ui: { ...paused, selected: 422 } };
  expect(press(v.ui, "j", v)!.selected).toBe(422);
});

// The view of a frame of the modal with its modal changed: 05 is Q-07 on the first of its three
// options, 20a is Q-09 on the first of its two, 06 is Q-08 with a text, 20b is Q-08 refused
function open(frame: string, modal: Partial<Modal> = {}): View {
  return view(frame, { modal: { ...frameView(frame).ui.modal!, ...modal } });
}
const m = (v: View) => v.ui.modal!;

test("QST-72: in the choice mode a digit selects the line of its number, the last one being the other answer", () => {
  const three = open("05", { choice: 1 });
  expect(["1", "2", "3", "4"].map((k) => key(k, three))).toEqual([0, 1, 2, 3].map((choice) => ({ ...three.ui, modal: { ...m(three), choice } })));
  for (const k of ["5", "9", "0"]) expect(key(k, three)).toBe(three.ui);
  // Q-09 has two options: the third line is the other answer
  const two = open("20a");
  expect(["1", "2", "3"].map((k) => m({ ...two, ui: key(k, two) }).choice)).toEqual([0, 1, 2]);
  expect(key("4", two)).toBe(two.ui);
});

test("QST-72: in the choice mode j, k and the arrows move the selection by one line, and stop at the first and at the last", () => {
  const at = (choice: number) => open("05", { choice });
  expect(key("j", at(0))).toEqual({ ...at(0).ui, modal: { ...m(at(0)), choice: 1 } });
  expect(m({ ...at(2), ui: key(DOWN, at(2)) }).choice).toBe(3);
  expect(m({ ...at(3), ui: key("j", at(3)) }).choice).toBe(3);
  expect(m({ ...at(3), ui: key(DOWN, at(3)) }).choice).toBe(3);
  expect(key("k", at(3))).toEqual({ ...at(3).ui, modal: { ...m(at(3)), choice: 2 } });
  expect(m({ ...at(1), ui: key(UP, at(1)) }).choice).toBe(0);
  expect(m({ ...at(0), ui: key("k", at(0)) }).choice).toBe(0);
  expect(m({ ...at(0), ui: key(UP, at(0)) }).choice).toBe(0);
});

test("QST-72: enter over an option leaves its text to send, and over the other answer goes to the text mode with the field empty", () => {
  const second = open("05", { choice: 1 });
  expect(key("\r", second)).toEqual({ ...second.ui, modal: { ...m(second), sending: true }, send: { question_id: 7, answer: "5 tentativas" } });
  const first = open("20a");
  expect(key("\r", first).send).toEqual({ question_id: 9, answer: "pronto" });
  // A text left from before does not come back
  const other = open("05", { choice: 3, text: "antes" });
  expect(key("\r", other)).toEqual({ ...other.ui, modal: { question: 7, choice: null, text: "", expanded: false, sending: false, refused: false } });
  expect(key("\r", other).send).toBeNull();
});

test("QST-72: in the choice mode a letter does nothing: q does not quit and b does not leave the modal", () => {
  const v = open("05");
  for (const k of ["q", "b", "h", "g", "x", "p", "t", "?", "a", " ", "\t", "\x7f", "\x15", "\x05"]) expect(key(k, v)).toBe(v.ui);
});

test("QST-74: in the text mode a printable character goes to the end of the text, also the ones that are keys outside the modal", () => {
  const v = open("06");
  for (const k of ["q", "1", "2", "3", "4", "0", "b", "h", "g", "x", "p", "t", "?", "j", "k", "[", "]", " ", "é", "ã", "Ç", "ñ", "…", "𝄞"]) {
    expect(press(v.ui, k, v)).toEqual({ ...v.ui, modal: { ...m(v), text: "logo da 89, com o nome do programa no ar" + k } });
  }
  // Key after key, in the order they came
  const typed = [..."não, 5!"].reduce((ui, k) => press(ui, k, { ...v, ui })!, open("06", { text: "" }).ui);
  expect(typed.modal!.text).toBe("não, 5!");
});

test("QST-74: backspace erases the last character, ctrl+u empties the field and ctrl+e changes its size", () => {
  const v = open("06", { text: "capa é" });
  for (const backspace of ["\x7f", "\x08"]) expect(key(backspace, v)).toEqual({ ...v.ui, modal: { ...m(v), text: "capa " } });
  // One character, not one unit of UTF-16
  expect(m({ ...v, ui: key("\x7f", open("06", { text: "a𝄞" })) }).text).toBe("a");
  expect(m({ ...v, ui: key("\x7f", open("06", { text: "" })) }).text).toBe("");
  expect(key("\x15", v)).toEqual({ ...v.ui, modal: { ...m(v), text: "" } });
  expect(key("\x05", v)).toEqual({ ...v.ui, modal: { ...m(v), expanded: true } });
  const expanded = open("07");
  expect(key("\x05", expanded)).toEqual({ ...expanded.ui, modal: { ...m(expanded), expanded: false } });
});

test("QST-74: an arrow and any other key that is not a character leave the text as it is", () => {
  const v = open("06");
  for (const k of [UP, DOWN, "\x1b[C", "\x1b[D", "\x1b[Z", "\x1b[3~", "\t", "\n", "\x00", "\x01"]) expect(key(k, v)).toBe(v.ui);
});

test("QST-76: enter with a text leaves it to send without the spaces of its ends, and the modal waits", () => {
  const v = open("06", { text: "  logo da 89, quadrado   " });
  expect(key("\r", v)).toEqual({ ...v.ui, modal: { ...m(v), sending: true }, send: { question_id: 8, answer: "logo da 89, quadrado" } });
  // The text mode of a question with options: after the other answer
  const other = open("05", { choice: null, text: "depende do plano" });
  expect(key("\r", other)).toEqual({ ...other.ui, modal: { ...m(other), sending: true }, send: { question_id: 7, answer: "depende do plano" } });
});

test("QST-76: enter with the field empty or with only spaces changes nothing", () => {
  for (const text of ["", " ", "    "]) {
    const v = open("06", { text });
    expect(key("\r", v)).toBe(v.ui);
  }
});

test("QST-79: while the answer waits for the broker no key changes the state, and ctrl+c quits", () => {
  for (const v of [open("05", { sending: true }), open("06", { sending: true })]) {
    const waits: View = { ...v, ui: { ...v.ui, send: { question_id: m(v).question, answer: "x" } } };
    for (const k of ["\r", "\x1b", "a", "q", "1", "2", "j", "k", UP, DOWN, "\x7f", "\x08", "\x15", "\x05", "4", "b", "h"]) expect(key(k, waits)).toBe(waits.ui);
    expect(press(waits.ui, "\x03", waits)).toBeNull();
  }
});

test("QST-85: esc closes the modal without an answer to send, and the tab keeps its selection", () => {
  for (const v of [open("05", { choice: 2 }), open("06"), open("07")]) {
    expect(key("\x1b", v)).toEqual({ ...v.ui, modal: null });
    expect(key("\x1b", v).send).toBeNull();
    expect(key("\x1b", v).screen).toBe("questions");
    expect(key("\x1b", v).question).toBe(m(v).question);
  }
});

test("QST-85: ctrl+c quits in any mode of the modal", () => {
  for (const v of [open("05"), open("06"), open("07"), open("20b")]) expect(press(v.ui, "\x03", v)).toBeNull();
});

test("QST-80: only esc closes the modal of a refused answer", () => {
  const v = open("20b");
  expect(m(v).refused).toBe(true);
  for (const k of ["\r", "a", "q", "1", "\x7f", "\x08", "\x15", "\x05", UP, DOWN]) expect(key(k, v)).toBe(v.ui);
  expect(key("\x1b", v)).toEqual({ ...v.ui, modal: null });
});

test("QST-78: in a chunk of more than one key into the text mode a line break becomes a space, and one key alone stays as it came", () => {
  const text = open("06").ui;
  expect(keysOf("um\rdois\ntrês\r\n", text)).toEqual(["u", "m", " ", "d", "o", "i", "s", " ", "t", "r", "ê", "s", " ", " "]);
  expect(keysOf("a\r", text)).toEqual(["a", " "]);
  expect(keysOf("\r", text)).toEqual(["\r"]);
  // An escape sequence is one key
  expect(keysOf(UP + "\r", text)).toEqual([UP, " "]);
  expect(keysOf(UP, text)).toEqual([UP]);
  // Outside the text mode enter is enter: in the choice mode and with no modal
  expect(keysOf("2\r", open("05").ui)).toEqual(["2", "\r"]);
  expect(keysOf("j\r" + DOWN, START)).toEqual(["j", "\r", DOWN]);
  expect(keysOf("", text)).toEqual([]);
});

test("QST-78: a pasted block with line breaks goes into the text and sends nothing", () => {
  const v = open("06", { text: "" });
  const pasted = keysOf("logo da 89\r\nna versão quadrada\r", v.ui).reduce((ui, k) => press(ui, k, { ...v, ui })!, v.ui);
  expect(pasted).toEqual({ ...v.ui, modal: { ...m(v), text: "logo da 89  na versão quadrada " } });
  expect(pasted.send).toBeNull();
});

// The modal of a frame after enter: with its answer on the way to the broker
function sent(frame: string, modal: Partial<Modal> = {}): { before: View; after: View } {
  const before = open(frame, modal);
  return { before, after: { ...before, ui: key("\r", before) } };
}

test("QST-77: when the broker takes the answer the modal closes and the footer says so in green for 4 s", () => {
  // Q-08 by its text, Q-07 by its second option
  for (const [frame, modal, label] of [["06", {}, "Q-08"], ["05", { choice: 1 }, "Q-07"]] as const) {
    const { before, after } = sent(frame, modal);
    expect(after.ui.send).not.toBeNull();
    expect(settle(after.ui, { ok: true }, after)).toEqual({ ...before.ui, modal: null, send: null, toast: { text: `✓ ${label} respondida`, color: "bgreen", until: before.squad.now + 4000 } });
  }
});

test("QST-80: when the broker says the question closed the modal turns refused, in the text mode with what was sent", () => {
  const typed = sent("06", { text: "  logo da 89, quadrado  ", expanded: true });
  expect(settle(typed.after.ui, { ok: false, error: "question_closed" }, typed.after)).toEqual({
    ...typed.before.ui,
    send: null,
    modal: { question: 8, choice: null, text: "logo da 89, quadrado", expanded: true, sending: false, refused: true },
  });
  // An option that was refused: its text goes to the field
  const chose = sent("05", { choice: 1 });
  expect(settle(chose.after.ui, { ok: false, error: "question_closed" }, chose.after)).toEqual({
    ...chose.before.ui,
    send: null,
    modal: { question: 7, choice: null, text: "5 tentativas", expanded: false, sending: false, refused: true },
  });
});

test("QST-81: any other answer of the broker leaves the modal as it was before the send and says the error in red for 4 s", () => {
  for (const error of ["invalid_token", "not_holder", "missing_field", "invalid_field", "broker não respondeu"]) {
    for (const { before, after } of [sent("06", { text: "  logo da 89  " }), sent("07"), sent("05", { choice: 2 })]) {
      expect(settle(after.ui, { ok: false, error }, after)).toEqual({ ...before.ui, send: null, toast: { text: `✗ resposta não enviada · ${error}`, color: "bred", until: before.squad.now + 4000 } });
    }
  }
});

test("QST-83: without a credential to send the answer with, the modal stays as it was before the send and the footer says so for 4 s", () => {
  for (const { before, after } of [sent("06", { text: "  logo da 89  " }), sent("05", { choice: 2 })]) {
    expect(settle(after.ui, null, after)).toEqual({ ...before.ui, send: null, toast: { text: "✗ credencial humana não encontrada", color: "bred", until: before.squad.now + 4000 } });
  }
});

// The log of frame 04 with the answers that close Q-07 and Q-08, as frame 20b has them
const CLOSED = LOGS["20b"]!.events.filter((e) => e.kind === "answer" && (e.seq === 433 || e.seq === 434));
const closing: Change = (events) => [...events, ...CLOSED];
const typing = (question: number): Modal => ({ question, choice: null, text: "pela metade", expanded: false, sending: false, refused: false });

test("QST-82: a read that shows the question of the modal closed closes the modal, with the notice of the default in yellow or the one that it closed", () => {
  // Q-08 closed by its timeout
  const timeout = view("04", { question: null, modal: typing(8) }, closing);
  expect(sync(timeout.ui, timeout)).toEqual({ ...timeout.ui, modal: null, toast: { text: "⟳ default aplicado", color: "byellow", until: timeout.squad.now + 4000 } });
  // By the result of who asked it
  const result = view("04", { question: null, modal: typing(8) }, (events) => closing(events).map((e) => (e.seq === 434 ? ({ ...e, resolved_by: "result_default" } as SquadEvent) : e)));
  expect(sync(result.ui, result).toast).toEqual({ text: "⟳ default aplicado", color: "byellow", until: result.squad.now + 4000 });
  expect(sync(result.ui, result).modal).toBeNull();
  // Q-07 answered by another hand, in the choice mode
  const answered = view("04", { question: null, modal: { ...typing(7), choice: 1 } }, closing);
  expect(sync(answered.ui, answered)).toEqual({ ...answered.ui, modal: null, toast: { text: "Q-07 fechada", color: "gray", until: answered.squad.now + 4000 } });
  // And merged into another one by the mother
  const merged = view("04", { question: 7, modal: typing(8) }, (events) => [...events, { ...events.find((e) => e.kind === "question_merged")!, seq: 500, question_id: 8, into: 7 } as SquadEvent]);
  expect(sync(merged.ui, merged)).toEqual({ ...merged.ui, modal: null, toast: { text: "Q-08 fechada", color: "gray", until: merged.squad.now + 4000 } });
});

test("QST-82: the modal of an open question stays as it is after a read", () => {
  for (const frame of ["05", "06", "07", "20a"]) {
    const v = open(frame);
    expect(sync(v.ui, v)).toBe(v.ui);
  }
});

test("QST-80, QST-82: the modal of a refused answer stays after the read that shows its question closed", () => {
  // Frame 20b: Q-08 closed by its default, and the answer of the dev was refused
  const v = open("20b");
  expect(v.squad.questions.find((q) => q.id === 8)!.status).toBe("defaulted");
  expect(sync(v.ui, v)).toBe(v.ui);
});

test("QST-79, QST-80: the modal of an answer on its way waits for what the broker says, also when a read shows its question closed", () => {
  const v = view("04", { question: null, modal: { ...typing(8), sending: true }, send: { question_id: 8, answer: "pela metade" } }, closing);
  expect(sync(v.ui, v)).toBe(v.ui);
  // What the broker says then is the refusal
  expect(settle(v.ui, { ok: false, error: "question_closed" }, v).modal).toEqual({ ...typing(8), refused: true });
});

test("QST-82: a modal whose question is not among the ones of the open feature is closed, refused or not", () => {
  // Frame 09a: the feature was delivered, and the questions of the tab are the ones of the open one
  for (const refused of [false, true]) {
    const v = view("09a", { screen: "questions", modal: { ...typing(8), refused } });
    expect(v.squad.questions).toEqual([]);
    expect(sync(v.ui, v)).toEqual({ ...v.ui, modal: null, toast: { text: "Q-08 fechada", color: "gray", until: v.squad.now + 4000 } });
  }
});

test("QST-68: the selection follows its question when the order of the list changes", () => {
  // Q-08 is the second of the list, and the fourth with two more blocking questions
  const before = view("04", { question: 8 });
  const after = view("04", { question: 8 }, blockers);
  expect(waiting(before.squad).map((q) => q.id)).toEqual([7, 8]);
  expect(waiting(after.squad).map((q) => q.id)).toEqual([7, 20, 21, 8]);
  expect(sync(after.ui, after)).toBe(after.ui);
  // The first of the list, selected with no id, is held by its id: a question that comes before it does not take the selection
  const first = view("04", { question: null });
  expect(sync(first.ui, first)).toEqual({ ...first.ui, question: 7 });
});

test("QST-68: when the selected question leaves the list the selection goes to the first of the list", () => {
  // Q-20 is answered by the dev somewhere else: the list is Q-07, Q-21, Q-08
  const q20 = CLOSED[0]!;
  const left = view("04", { question: 20, selected: 417 }, (events) => [...blockers(events), { ...q20, seq: 502, question_id: 20 } as SquadEvent]);
  expect(waiting(left.squad).map((q) => q.id)).toEqual([7, 21, 8]);
  expect(sync(left.ui, left)).toEqual({ ...left.ui, question: 7 });
  // The two of frame 04 closed: there is no question to select
  const none = view("04", { question: 8 }, closing);
  expect(sync(none.ui, none)).toEqual({ ...none.ui, question: null });
});

test("QST-63: a read keeps the offset of the history from leaving fewer than 4 on the screen", () => {
  // Six resolved: the last offset is 2
  const past = view("04", { question: 7, historyOffset: 5 });
  expect(sync(past.ui, past)).toEqual({ ...past.ui, historyOffset: 2 });
  const within = view("04", { question: 7, historyOffset: 2 });
  expect(sync(within.ui, within)).toBe(within.ui);
});

const off = (v: View): View => ({ ...v, down: { since: v.squad.now - 3000, attempt: 3 } });

test("QST-84: while the broker does not answer, enter over a question says that answering is disabled and opens no modal", () => {
  // On the main screen over Q-07 and Q-08, and on the tab
  for (const v of [off(view("01", { selected: 422 })), off(view("01", { selected: 428 })), off(view("04")), off(view("04", { question: 8 }))]) {
    expect(key("\r", v)).toEqual({ ...v.ui, toast: { text: "broker desconectado · responder desabilitado", color: "gray", until: v.squad.now + 4000 } });
  }
  // Any other line opens its thread, as before, and the tab without a question does nothing
  expect(key("\r", off(view("01", { selected: 417 }))).screen).toBe("thread");
  const empty = off(view("15a", { screen: "questions" }));
  expect(key("\r", empty)).toBe(empty.ui);
});

test("QST-84: while the broker does not answer no key changes an open modal, and ctrl+c quits", () => {
  for (const v of [off(open("05")), off(open("06")), off(open("07")), off(open("20b"))]) {
    for (const k of ["\x1b", "\r", "a", "q", "1", "2", "j", "k", UP, DOWN, "\x7f", "\x08", "\x15", "\x05"]) expect(key(k, v)).toBe(v.ui);
    expect(press(v.ui, "\x03", v)).toBeNull();
  }
});
