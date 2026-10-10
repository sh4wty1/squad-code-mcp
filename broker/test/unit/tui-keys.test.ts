import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import { press, START, visible } from "../../tui/keys.ts";
import type { Ui, View } from "../../tui/view.ts";
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

test("TUI-63: g, x and 4 say for 4 s which slice brings them and do not change the screen", () => {
  for (const screen of ["main", "topology", "thread", "help"] as const) {
    const v = view("01", { screen });
    const until = v.squad.now + 4000;
    expect(key("g", v)).toEqual({ ...v.ui, toast: { text: "chega com a fatia Gate", color: "gray", until } });
    expect(key("x", v)).toEqual({ ...v.ui, toast: { text: "chega com a fatia Gate", color: "gray", until } });
    expect(key("4", v)).toEqual({ ...v.ui, toast: { text: "chega com a fatia Question", color: "gray", until } });
  }
});

test("TUI-63: enter on the question of an open question that is with the dev says the Question slice brings it", () => {
  // Blocking or not: 422 is of Q-07 and 428 of Q-08. 420 is Q-07 where it was asked, to the leader.
  for (const selected of [422, 428, 420]) {
    const v = view("01", { selected });
    expect(key("\r", v)).toEqual({ ...v.ui, toast: { text: "chega com a fatia Question", color: "gray", until: v.squad.now + 4000 } });
  }
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

test("b selects, on the main screen, the latest question of the oldest blocking question that is with the dev", () => {
  const v = view("01", { screen: "topology", selected: 417 });
  expect(key("b", v)).toEqual({ ...v.ui, screen: "main", selected: 422 });

  // A second blocking one reaches the dev later: Q-07 is still the oldest
  const q07 = LOGS["01"]!.events.find((e) => e.seq === 422)!;
  const later: Change = (events) => [...events, { ...q07, seq: 500, ts: q07.ts + 600_000, question_id: 20, asked_by: "worker-2", summary: "? Q-20 [BLOQUEANTE]" } as SquadEvent];
  expect(key("b", view("01", { selected: null }, later)).selected).toBe(422);
});

test("b without a blocking question with the dev says so, for 4 s", () => {
  // Frame 15a: the blocking question of the leader is with the mother; frame 09a has no feature
  for (const frame of ["15a", "09a"]) {
    const v = view(frame);
    expect(key("b", v)).toEqual({ ...v.ui, toast: { text: "nenhuma bloqueante", color: "gray", until: v.squad.now + 4000 } });
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
