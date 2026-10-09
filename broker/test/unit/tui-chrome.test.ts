import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { grid } from "../../tui/grid.ts";
import { chrome, MAIN_KEYS, stats, tone } from "../../tui/screens/chrome.ts";
import type { View } from "../../tui/view.ts";
import { frame, frameView } from "../frames/view.ts";

function drawn(view: View) {
  const g = grid();
  chrome(g, view, "main", MAIN_KEYS);
  stats(g, view);
  return g;
}

const LONG = "player ao vivo com setlist, histórico das últimas 24 horas e integração com os apps de iOS e Android";
const long = (events: SquadEvent[]) => events.map((e) => (e.kind === "feature_opened" ? { ...e, title: LONG } : e));

test("TUI-33, TUI-34: line 0 in the nine states of frame 26c", () => {
  const main = frameView("01");
  const titled = frameView("01", long);
  const idle = frameView("09a");
  const never = frameView("28a");
  const views: View[] = [
    main,
    { ...main, project: null },
    titled,
    { ...titled, project: null },
    { ...titled, down: { since: titled.squad.now - 12_000, attempt: 12 } },
    idle,
    { ...idle, project: null },
    never,
    { ...never, project: null },
  ];
  const lines = frame("26c");
  expect(views.map((view) => drawn(view).text()[0])).toEqual(views.map((_, i) => lines[i * 2 + 1]!));
});

test("TUI-34: the counter has only the open questions the dev holds, on red when one of them is blocking", () => {
  const counter = (view: View) => {
    const row = drawn(view).rows[0]!;
    const x = drawn(view).text()[0]!.indexOf(" ? ") + 1;
    return [row[x]!.ch + row[x + 1]!.ch + row[x + 2]!.ch, row[x]!.fg, row[x]!.bg, row[x]!.bold];
  };
  // Q-07, blocking, and Q-08
  expect(counter(frameView("01"))).toEqual(["? 2", "bwhite", "red", true]);
  // Only Q-08 once the dev answers Q-07
  const answered = (events: SquadEvent[]) => [...events, { ...events.find((e) => e.seq === 422)!, seq: 900, kind: "answer", question_id: 7, answer: "a", resolved_by: "human" } as SquadEvent];
  expect(counter(frameView("01", answered))).toEqual(["? 1", "byellow", "black", true]);
  // Q-13 is open with the mother, not with the dev
  expect(frameView("15a").squad.questions.filter((q) => q.open).map((q) => q.holder)).toEqual(["mother"]);
  expect(counter(frameView("15a"))).toEqual(["? 0", "gray", "black", false]);
});

test("TUI-34: without the broker the indicator counts the seconds and line 0 loses the colors of the right", () => {
  const view = frameView("01");
  const g = drawn({ ...view, down: { since: view.squad.now - 75_000, attempt: 75 } });
  const line = g.text()[0]!;
  expect(line.endsWith("? 2   broker ○ desconectado · 75s  14:32:07")).toBe(true);
  expect(g.rows[0]![line.indexOf("○")]).toEqual({ ch: "○", fg: "bred", bg: "black", bold: true });
  expect(g.rows[0]![118]!.fg).toBe("gray");
});

test("TUI-41, TUI-42: line 38 in the six states of tokens and scope of frame 30", () => {
  const session = (view: View): View => ({ ...view, ui: { ...view.ui, scope: "session" } });
  const views = [frameView("01"), session(frameView("01")), frameView("26b"), session(frameView("26b")), frameView("09a"), frameView("28b")];
  const lines = frame("30");
  expect(views.map((view) => drawn(view).text()[38])).toEqual(views.map((_, i) => lines[i * 2 + 1]!));
});

test("TUI-41: the tokens of an agent in its color, a dash in gray for who has none, the cost in bold", () => {
  const g = drawn(frameView("26b"));
  const cell = (text: string) => g.rows[38]![g.text()[38]!.indexOf(text)]!;
  expect(cell("mot")).toEqual({ ch: "m", fg: "magenta", bg: null, bold: true });
  expect(cell("1k")).toEqual({ ch: "1", fg: "white", bg: null, bold: false });
  expect(cell("—")).toEqual({ ch: "—", fg: "gray", bg: null, bold: false });
  expect(cell("≈$0.02")).toEqual({ ch: "≈", fg: "bwhite", bg: null, bold: true });
  expect(["mother", "leader", "worker-3", "judge", "human", "someone"].map(tone)).toEqual(["magenta", "cyan", "green", "yellow", "bwhite", "white"]);
});

test("TUI-33: the tabs, the count of questions next to the fourth and the keys, as in frame 01", () => {
  const g = drawn(frameView("01"));
  const lines = frame("01");
  expect(g.text()[1]).toBe(lines[1]!);
  expect(g.text()[39]).toBe(lines[39]!);
  // The tab of the screen is dark on white
  expect(g.rows[1]![2]).toEqual({ ch: "1", fg: "bg", bg: "white", bold: true });
  expect(g.rows[1]![g.text()[1]!.indexOf("2 topologia")]).toEqual({ ch: "2", fg: "bwhite", bg: null, bold: true });
  expect(g.rows[1]![g.text()[1]!.indexOf("perguntas 2") + 10]).toEqual({ ch: "2", fg: "bred", bg: null, bold: true });
  expect(g.rows[39]![1]).toEqual({ ch: "j", fg: "bwhite", bg: "black", bold: true });
});

test("TUI-41: the seals at the right of line 1, as in frames 15a and 22g", () => {
  expect(drawn(frameView("15a")).text()[1]).toBe(frame("15a")[1]!);
  const g = drawn(frameView("22g"));
  expect(g.text()[1]).toBe(frame("22g")[1]!);
  expect(g.rows[1]![g.text()[1]!.indexOf("⚠ permissão")]).toEqual({ ch: "⚠", fg: "bcyan", bg: null, bold: true });
  expect(g.rows[1]![119 - "⚠ gate G-02 pendente · g".length]).toEqual({ ch: "⚠", fg: "bmagenta", bg: null, bold: true });
});

test("TUI-41: a seal that would not start after column 66 is not drawn", () => {
  const extra = (fields: Record<string, unknown>, i: number) => (events: SquadEvent[]) => ({ ...events.at(-1)!, seq: 900 + i, to: null, ticket_ref: null, summary: "", ...fields }) as SquadEvent;
  const crowded = (events: SquadEvent[]) => [
    ...events,
    extra({ kind: "peer_left", from: "broker", role_from: "broker", peer: "worker-3", reason: "died" }, 0)(events),
    extra({ kind: "blocked", from: "worker-1", role_from: "worker", reason: "sem rede", detail: "", last_action: "" }, 1)(events),
    extra({ kind: "gate", from: "mother", role_from: "mother", to: "human", gate_id: 1, scope: "delivery", action: "a", effect: "e" }, 2)(events),
  ];
  // Four seals: the second from the left would start at column 66
  const line = drawn(frameView("23a", crowded)).text()[1]!;
  expect(line.slice(67)).toBe("              ‖ w2 parado   ⚠ gate G-01 pendente · g");
  expect(line.includes("bloqueado") || line.includes("offline")).toBe(false);
});
