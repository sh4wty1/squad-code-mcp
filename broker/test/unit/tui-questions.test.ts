import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import { START } from "../../tui/keys.ts";
import { questions } from "../../tui/screens/questions.ts";
import type { Ui, View } from "../../tui/view.ts";
import { LOGS, PRICES } from "../frames/logs.ts";
import { frame, frameView } from "../frames/view.ts";
import { LEADER, MOTHER, NOW, setup, WORKER_1, WORKER_2, WORKER_3 } from "./helpers.ts";

// The tab drawn from the log of a frame, with the state of its screen changed and the clock `later` ms ahead
function draw(id: string, ui: Partial<Ui> = {}, later = 0) {
  const view = frameView(id);
  return questions({ ...view, squad: squad(LOGS[id]!.events, LOGS[id]!.now + later), ui: { ...view.ui, ...ui } });
}

// Columns `from` to `to` of the lines y1 to y2
const cols = (lines: string[], from: number, to: number, y1: number, y2: number) =>
  lines.slice(y1, y2 + 1).map((line) => [...line.padEnd(120)].slice(from, to + 1).join(""));
// The text of the list: columns 2 to 57 of a line
const row = (lines: string[], y: number) => cols(lines, 2, 57, y, y)[0]!.trimEnd();

const BLOCKING = { to: "leader", summary: "which port?", why: "the spec gives two", blocking: true };
const DEFAULT = { ...BLOCKING, blocking: false, default: "9090" };

// A broker with a feature open; `ask` leaves a question with the dev and gives its id
function open() {
  const b = setup();
  b.openFeature();
  const ask = (who: Caller, fields: Record<string, unknown> = BLOCKING): number => {
    const answer = b.question.ask(who, fields);
    if (!answer.ok) throw new Error(`the question was not asked: ${answer.error}`);
    b.question.escalate(LEADER, { question_id: answer.question_id });
    b.question.escalate(MOTHER, { question_id: answer.question_id });
    return answer.question_id;
  };
  const view = (ui: Partial<Ui> = {}): View => {
    const events = b.log.after(0);
    return { squad: squad(events, b.clock.now), rows: feed(events), ui: { ...START, screen: "questions", ...ui }, project: null, down: null, prices: PRICES };
  };
  return { ...b, ask, view, lines: (ui?: Partial<Ui>) => questions(view(ui)).text() };
}

test("QST-55, QST-56: the list of the log of frame 04 is the one of the frame", () => {
  const expected = cols(frame("04"), 0, 59, 2, 25);
  // The route is the sequence of the `question` of the log (.design/squad-mvp.md line 490):
  // Q-08 has one of worker-2 to the leader and one of the mother to the dev, and the
  // prototype writes by hand a hop of the leader to the mother that its scenario does not have
  expect(expected[10]).toBe("│   rota w2 → ldr → mot → dev                              │");
  expected[10] = "│   rota w2 → ldr → dev                                    │";
  expect(cols(draw("04").text(), 0, 59, 2, 25)).toEqual(expected);
});

test("QST-56: the selected question is the one of `ui.question`, and only it has the mark", () => {
  // Frames 06 and 07 have Q-08 selected, and the modal from line 9 down
  const drawn = draw("06").text();
  expect(cols(drawn, 0, 59, 2, 8)).toEqual(cols(frame("06"), 0, 59, 2, 8));
  expect(cols(drawn, 0, 16, 9, 12)).toEqual(cols(frame("06"), 0, 16, 9, 12));
  expect([row(drawn, 3).slice(0, 6), row(drawn, 9).slice(0, 6)]).toEqual(["  Q-07", "▶ Q-08"]);
  // An id that is not in the list, or none: the first of the list
  for (const question of [null, 11, 99]) {
    const first = draw("04", { question }).text();
    expect([row(first, 3).slice(0, 6), row(first, 9).slice(0, 6)]).toEqual(["▶ Q-07", "  Q-08"]);
  }
});

test("QST-56: a question of two options shows them whole, with the number of the free text", () => {
  expect(cols(draw("20a").text(), 0, 59, 2, 8)).toEqual(cols(frame("20a"), 0, 59, 2, 8));
});

test("QST-55: without a blocking question the title has no seal", () => {
  const b = open();
  b.ask(WORKER_2, DEFAULT);
  expect(cols(b.lines(), 0, 59, 2, 2)).toEqual(["┌─ perguntas abertas · 1 " + "─".repeat(34) + "┐"]);
});

test("QST-56: a question without ticket has no ticket after the name, and a blocking one without options only the free text", () => {
  const b = open();
  b.ask(WORKER_1);
  b.clock.now = NOW + 75_000;
  const drawn = b.lines();
  expect(row(drawn, 3)).toBe("▶ Q-01 [BLOQUEANTE]  w1 worker-1" + " ".repeat(16) + "há 1m15s");
  expect([row(drawn, 4), row(drawn, 5), row(drawn, 6), row(drawn, 7)]).toEqual(["  which port?", "  opções 1 texto", "  rota w1 → ldr → mot → dev", ""]);
});

test("QST-56: the route names each question merged into this one, with the role of who asked it", () => {
  const b = open();
  const kept = b.ask(WORKER_1);
  const merged = b.ask(WORKER_2);
  b.question.merge(MOTHER, { question_id: merged, into: kept });
  expect(row(b.lines(), 6)).toBe("  rota w1 → ldr → mot → dev  · absorveu Q-02 (worker)");
});

test("QST-98: the list shows `timeout 0:00` once the deadline of a question passed", () => {
  // Q-08 reached the dev at 14:31:15 with 240 s: at 14:36:07 the answer of the broker was not read yet
  expect(row(draw("04", {}, 240_000).text(), 9)).toBe("  Q-08 timeout 0:00  w2 worker-2 · TKT-13" + " ".repeat(7) + "há 4m52s");
});

test("QST-57: without open question the list says the squad does not depend on the dev", () => {
  const drawn = draw("20b").text();
  // Frame 20b has the modal from line 9 down
  expect(cols(drawn, 0, 59, 2, 8)).toEqual(cols(frame("20b"), 0, 59, 2, 8));
  expect(cols(drawn, 0, 59, 2, 2)).toEqual(["┌─ perguntas abertas · 0 " + "─".repeat(34) + "┐"]);
  expect([row(drawn, 3), row(drawn, 4), row(drawn, 5)]).toEqual(["", "○ nenhuma pergunta aberta", "  o squad não depende de você agora."]);
  expect(cols(drawn, 0, 59, 6, 23)).toEqual(Array.from({ length: 18 }, () => "│" + " ".repeat(58) + "│"));
  expect(cols(drawn, 0, 59, 24, 25)).toEqual(["│ bloqueantes primeiro · depois por tempo restante" + " ".repeat(9) + "│", "└" + "─".repeat(58) + "┘"]);
});

test("QST-64: the tab `4 perguntas` is the highlighted one, and lines 0, 1, 38 and 39 are the ones of frame 04", () => {
  const g = draw("04");
  const drawn = g.text();
  expect([drawn[0], drawn[1], drawn[38], drawn[39]]).toEqual([frame("04")[0]!, frame("04")[1]!, frame("04")[38]!, frame("04")[39]!]);
  expect(drawn[39]).toBe(" j/k mover   enter responder   b próx. bloqueante   h histórico   esc voltar   1-4 telas   ? ajuda   q sair");
  const tab = drawn[1]!.indexOf(" 4 perguntas ");
  expect(g.rows[1]!.slice(tab, tab + 13).map((cell) => cell.bg)).toEqual(Array.from({ length: 13 }, () => "white"));
  // And no other tab
  expect(g.rows[1]!.filter((cell) => cell.bg !== null).length).toBe(13);
});

test("QST-96: a text of 300 characters and an option of 100 are broken or cut with `…` inside the box", () => {
  const b = open();
  b.ask(WORKER_1, { ...BLOCKING, body: "palavra ".repeat(37) + "fim!", options: ["a".repeat(100), "b"], ticket_ref: "T".repeat(60) });
  b.ask(WORKER_2, { ...DEFAULT, body: "x".repeat(300), default: "d".repeat(200) });
  const drawn = b.lines();

  // The two lines of the text are 54 columns at most, and the second says there is more
  expect([row(drawn, 4), row(drawn, 5)]).toEqual(["  " + "palavra ".repeat(5) + "palavra", "  " + "palavra ".repeat(6) + "…"]);
  expect([row(drawn, 10), row(drawn, 11)]).toEqual(["  " + "x".repeat(54), "  " + "x".repeat(53) + "…"]);
  // The options are cut at 47 columns, and the ticket and the default where the line ends
  expect(row(drawn, 6)).toBe("  opções 1 " + "a".repeat(44) + "…");
  expect(row(drawn, 3)).toBe("▶ Q-01 [BLOQUEANTE]  w1 worker-1 · " + "T".repeat(14) + "… há 0s");
  expect(row(drawn, 12)).toBe("  default " + "d".repeat(45) + "…");
  // Nothing is written on the edges of the box nor outside it
  expect(cols(drawn, 0, 1, 3, 24)).toEqual(Array.from({ length: 22 }, () => "│ "));
  expect(cols(drawn, 58, 59, 3, 24)).toEqual(Array.from({ length: 22 }, () => " │"));
  expect(cols(drawn, 0, 59, 25, 25)).toEqual(["└" + "─".repeat(58) + "┘"]);
});

test("QST-97: with seven open questions the selected one is always drawn whole", () => {
  const b = open();
  const ids = [WORKER_1, WORKER_2, WORKER_3, WORKER_1, WORKER_2, WORKER_3, WORKER_1].map((who, i) => {
    b.clock.now = NOW + i * 1000;
    return b.ask(who);
  });
  expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7]);

  for (const question of [1, 4, 7]) {
    const drawn = b.lines({ question });
    const list = Array.from({ length: 21 }, (_, i) => row(drawn, 3 + i));
    const at = list.findIndex((line) => line.startsWith(`▶ Q-0${question} [BLOQUEANTE]`));
    // Its four lines, between lines 3 and 23
    expect(at).toBeGreaterThanOrEqual(0);
    expect(list.slice(at + 1, at + 5)).toEqual(["  which port?", "  opções 1 texto", "  rota w" + (((question - 1) % 3) + 1) + " → ldr → mot → dev", ""]);
    // Every question that is drawn is drawn whole: as many routes as heads, and the line of the order stays
    expect(list.filter((line) => /^. Q-\d\d /.test(line)).length).toBe(4);
    expect(list.filter((line) => line.startsWith("  rota ")).length).toBe(4);
    expect(row(drawn, 24)).toBe("bloqueantes primeiro · depois por tempo restante");
  }
  // The first ones while the selected one is among them, then the ones that end in it
  const heads = (question: number) => b.lines({ question }).flatMap((line) => /Q-0\d(?= \[)/.exec(line.slice(0, 12))?.[0] ?? []);
  expect(heads(1)).toEqual(["Q-01", "Q-02", "Q-03", "Q-04"]);
  expect(heads(4)).toEqual(["Q-01", "Q-02", "Q-03", "Q-04"]);
  expect(heads(7)).toEqual(["Q-04", "Q-05", "Q-06", "Q-07"]);
});
