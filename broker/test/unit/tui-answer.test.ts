import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import { clock } from "../../tui/grid.ts";
import { START } from "../../tui/keys.ts";
import { answer } from "../../tui/screens/answer.ts";
import { questions } from "../../tui/screens/questions.ts";
import type { Modal, Ui, View } from "../../tui/view.ts";
import { PRICES } from "../frames/logs.ts";
import { frame, frameView } from "../frames/view.ts";
import { LEADER, MOTHER, NOW, setup, WORKER_1, WORKER_2 } from "./helpers.ts";

// The modal over the tab of questions
const over = (view: View) => answer(questions(view), view);
// The modal of a question: in the choice mode, on its first line, unless the test gives another
const modal = (question: number, more: Partial<Modal> = {}): Modal => ({ question, choice: 0, text: "", expanded: false, sending: false, refused: false, ...more });
// The View of a frame with another modal
const withModal = (id: string, m: Modal): View => ({ ...frameView(id), ui: { ...frameView(id).ui, modal: m } });

// Columns `from` to `to` of the lines y1 to y2
const cols = (lines: string[], from: number, to: number, y1: number, y2: number) =>
  lines.slice(y1, y2 + 1).map((line) => [...line.padEnd(120)].slice(from, to + 1).join(""));
// The 82 columns of the box, from column 19
const box = (lines: string[], y1: number, y2: number) => cols(lines, 19, 100, y1, y2);
// The lines of the box: its top with the title, a line of text, a separator and its bottom
const top = (title: string) => `┌─ ${title} `.padEnd(81, "─") + "┐";
const boxed = (text: string) => "│  " + text.padEnd(78) + "│";
const SEP = "├" + "─".repeat(80) + "┤";
const BOTTOM = "└" + "─".repeat(80) + "┘";

const BLOCKING = { to: "leader", summary: "which port?", why: "the spec gives two", blocking: true };
const DEFAULT = { ...BLOCKING, blocking: false, default: "9090" };

// A broker with a feature open; `ask` leaves a question with the dev and gives its id
function open() {
  const b = setup();
  b.openFeature();
  const ask = (who: Caller, fields: Record<string, unknown> = BLOCKING): number => {
    const asked = b.question.ask(who, fields);
    if (!asked.ok) throw new Error(`the question was not asked: ${asked.error}`);
    b.question.escalate(LEADER, { question_id: asked.question_id });
    b.question.escalate(MOTHER, { question_id: asked.question_id });
    return asked.question_id;
  };
  const view = (ui: Partial<Ui> = {}): View => {
    const events = b.log.after(0);
    return { squad: squad(events, b.clock.now), rows: feed(events), ui: { ...START, screen: "questions", ...ui }, project: null, down: null, prices: PRICES };
  };
  return { ...b, ask, view, lines: (m: Modal) => over(view({ modal: m })).text() };
}

test("QST-70, QST-71: the modal of a blocking question with three options is the one of frame 05", () => {
  const drawn = over(frameView("05")).text();
  // The box takes lines 11 to 28: the last option is `outra resposta…`, with the number after theirs
  const expected = [
    top("? responder Q-07 · BLOQUEANTE"),
    boxed("contexto"),
    boxed("ticket  TKT-12 player de áudio · rework 1/2"),
    boxed("thread  TKT-12 · chegou ao dev 14:29:40 · há 2m27s"),
    boxed("rota    w1 → ldr → mot → você   (absorveu Q-12 (leader))"),
    boxed('por quê A spec exige "reconexão após queda" mas não define limite; o judge'),
    boxed("        reprovou a v1 nesse critério."),
    SEP,
    boxed("worker-1 pergunta   [BLOQUEANTE] só worker-1 está pausado"),
    boxed("Reconexão do stream: retry infinito ou desistir após 5 tentativas?"),
    boxed(""),
    boxed("▶ 1  infinito com backoff"),
    boxed("  2  5 tentativas"),
    boxed("  3  configurável"),
    boxed("  4  outra resposta…"),
    SEP,
    boxed("efeito  worker-1 retoma o TKT-12 (rework 1/2) assim que você confirmar."),
    BOTTOM,
  ];
  expect(box(frame("05"), 11, 28)).toEqual(expected);
  expect(box(drawn, 11, 28)).toEqual(expected);
  expect(drawn[39]).toBe(" 1-4 escolher   ↑↓ mover   enter confirmar   esc cancelar");
  expect(drawn[39]).toBe(frame("05")[39]!);
});

test("QST-70, QST-71: the modal of a question with two options has three lines to choose from, and its effect is the one the TUI writes", () => {
  const drawn = over(frameView("20a")).text();
  // The effect of QST-59 takes one line where frame 20a writes two by hand: the box has 18 lines, from line 11
  expect(box(drawn, 11, 28)).toEqual([
    top("? responder Q-09 · BLOQUEANTE"),
    boxed("contexto"),
    boxed("ticket  TKT-13 API da setlist"),
    boxed("thread  TKT-13 · chegou ao dev 14:30:20 · há 45s"),
    boxed("rota    w2 → ldr → mot → você"),
    boxed("por quê /v1/setlist responde 401; a chave não está no .env do worktree do"),
    boxed("        worker-2."),
    SEP,
    boxed("worker-2 pergunta   [BLOQUEANTE] só worker-2 está pausado"),
    boxed("A RADIO_API_KEY não está no worktree do worker-2. Coloque-a no .env de lá e"),
    boxed("confirme."),
    boxed(""),
    boxed("▶ 1  pronto"),
    boxed("  2  não vou fornecer"),
    boxed("  3  outra resposta…"),
    SEP,
    boxed("efeito  worker-2 retoma o TKT-13 assim que você confirmar."),
    BOTTOM,
  ]);
  // Down to the separator above the effect the lines are the ones of the frame, which start a line above
  expect(box(drawn, 11, 26)).toEqual(box(frame("20a"), 10, 25));
  expect(drawn[39]).toBe(" 1-3 escolher   ↑↓ mover   enter confirmar   esc cancelar");
  expect(drawn[39]).toBe(frame("20a")[39]!);
});

test("QST-70: a non-blocking question has the time left in the title and says who goes on with the default", () => {
  const b = open();
  const id = b.ask(WORKER_2, { ...DEFAULT, options: ["8080", "9090"], timeout_s: 300 });
  b.clock.now = NOW + 75_000;
  // No ticket: the line of the ticket has none and the thread only the arrival
  expect(box(b.lines(modal(id, { choice: 1 })), 12, 27)).toEqual([
    top("? responder Q-01 · timeout 3:45"),
    boxed("contexto"),
    boxed("ticket  —"),
    boxed("thread  chegou ao dev " + clock(NOW) + " · há 1m15s"),
    boxed("rota    w2 → ldr → mot → você"),
    boxed("por quê the spec gives two"),
    SEP,
    boxed("worker-2 pergunta   não-bloqueante · worker-2 segue com o default"),
    boxed("which port?"),
    boxed(""),
    boxed("  1  8080"),
    boxed("▶ 2  9090"),
    boxed("  3  outra resposta…"),
    SEP,
    boxed("efeito  worker-2 troca o default pela sua resposta; nada é refeito."),
    BOTTOM,
  ]);
});

test("QST-71: only the selected line of the choice mode has the mark, on a black background", () => {
  // The four lines of the choice of frame 05 are lines 22 to 25
  for (const choice of [0, 2, 3]) {
    const g = over(withModal("05", modal(7, { choice })));
    expect(cols(g.text(), 22, 22, 22, 25)).toEqual([0, 1, 2, 3].map((line) => (line === choice ? "▶" : " ")));
    // The background goes from one side of the box to the other, and no other line of the modal has one
    const lit = g.rows.flatMap((row, y) => (y > 10 && y < 29 && row.some((cell) => cell.bg !== null) ? [y] : []));
    expect(lit).toEqual([22 + choice]);
    expect(g.rows[22 + choice]!.flatMap((cell, x) => (cell.bg === "black" ? [x] : []))).toEqual(Array.from({ length: 80 }, (_, i) => 20 + i));
  }
});

test("QST-70: the modal is drawn over the tab of questions in gray, with an empty margin around its box", () => {
  const g = over(frameView("05"));
  const drawn = g.text();
  // The box of lines 11 to 28 and its margin: lines 10 to 29, columns 18 to 101, as the frame has them
  expect(cols(drawn, 18, 101, 10, 29)).toEqual(cols(frame("05"), 18, 101, 10, 29));
  expect(cols(drawn, 18, 101, 10, 10)).toEqual([" ".repeat(84)]);
  expect(cols(drawn, 18, 101, 29, 29)).toEqual([" ".repeat(84)]);
  expect(cols(drawn, 18, 18, 11, 28).join("") + cols(drawn, 101, 101, 11, 28).join("")).toBe(" ".repeat(36));
  // The tab is under it: the lines above the modal are the ones of the frame
  expect(drawn.slice(0, 10)).toEqual(frame("05").slice(0, 10));
  // Outside the modal no cell keeps its color, its background or its bold, down to the line of the tokens
  const lit = g.rows.slice(0, 39).flatMap((row, y) => row.flatMap((cell, x) => ((y < 10 || y > 29 || x < 18 || x > 101) && (cell.fg !== "gray" || cell.bg !== null || cell.bold) ? [`${y}:${x}`] : [])));
  expect(lit).toEqual([]);
});

test("QST-70: the box has 82 columns from column 19 and is centered in the 40 lines, whatever the lines of the reason", () => {
  const b = open();
  // Without the reason the modal of this question has 15 lines: the four of the context, who
  // asks, the text, an empty one, the three of the choice, the effect, two separators and
  // the border. Each word of 68 columns is a line of the reason.
  for (const [reason, first, last] of [[1, 12, 27], [2, 11, 27], [3, 11, 28], [4, 10, 28], [9, 8, 31]] as const) {
    const id = b.ask(WORKER_1, { ...BLOCKING, why: Array.from({ length: reason }, () => "y".repeat(68)).join(" "), options: ["a", "b"] });
    const drawn = b.lines(modal(id));
    expect(box(drawn, first, first)).toEqual([top(`? responder Q-0${id} · BLOQUEANTE`)]);
    expect(box(drawn, first + 5, first + 4 + reason)).toEqual(Array.from({ length: reason }, (_, i) => boxed((i ? "        " : "por quê ") + "y".repeat(68))));
    expect(box(drawn, last, last)).toEqual([BOTTOM]);
    // Every line between them is a line of the box, with nothing at its sides
    const sides = cols(drawn, 18, 101, first + 1, last - 1).filter((line) => !/^ [│├].{80}[│┤] $/u.test(line));
    expect(sides).toEqual([]);
    expect(cols(drawn, 18, 101, first - 1, first - 1).concat(cols(drawn, 18, 101, last + 1, last + 1))).toEqual([" ".repeat(84), " ".repeat(84)]);
  }
});
