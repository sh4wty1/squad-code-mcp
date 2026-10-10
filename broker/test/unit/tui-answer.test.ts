import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import { clock } from "../../tui/grid.ts";
import { START } from "../../tui/keys.ts";
import { answer } from "../../tui/screens/answer.ts";
import { questions } from "../../tui/screens/questions.ts";
import type { Modal, Ui, View } from "../../tui/view.ts";
import { LOGS, PRICES } from "../frames/logs.ts";
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

// The field of the text in the box of the modal: 76 columns, a line for each of the text and the count at the bottom
const field = (lines: string[], chars: number) => [
  boxed("┌" + "─".repeat(74) + "┐"),
  ...lines.map((line) => boxed("│ " + line.padEnd(73) + "│")),
  boxed("└" + ` ${chars} chars ─┘`.padStart(75, "─")),
];
const WARNING = boxed("⚠ a resposta fica gravada no log e não pode ser apagada");
const TEXT_KEYS = " enter enviar   ctrl+e expandir   ctrl+u limpar   esc cancelar";
// The modal of Q-08 over the log of frame 06, in the text mode
const typed = (more: Partial<Modal>) => over(withModal("06", modal(8, { choice: null, ...more }))).text();

test("QST-73: the modal of a non-blocking question in the text mode is the one of frame 06, with its default and the field of one line", () => {
  const drawn = over(frameView("06")).text();
  // The box takes lines 10 to 28. The route is the sequence of the `question` of the log
  // (.design/squad-mvp.md line 490): the prototype writes by hand a hop of the leader to the mother.
  const expected = box(frame("06"), 10, 28);
  expect(expected[4]).toBe(boxed("rota    w2 → ldr → mot → você"));
  expected[4] = boxed("rota    w2 → ldr → você");
  expect(box(drawn, 10, 28)).toEqual(expected);
  expect(box(drawn, 19, 28)).toEqual([
    boxed(""),
    boxed("default logo da 89  · aplicado em 3:08 se você não responder"),
    boxed("resposta  (uma linha · ctrl+e expande)"),
    ...field(["logo da 89, com o nome do programa no ar█"], 40),
    WARNING,
    SEP,
    boxed("efeito  worker-2 troca o default pela sua resposta; nada é refeito."),
    BOTTOM,
  ]);
  expect(drawn[39]).toBe(TEXT_KEYS);
  expect(drawn[39]).toBe(frame("06")[39]!);
});

test("QST-73: the expanded field of frame 07 has 8 lines, and the warning stays right below it", () => {
  const drawn = over(frameView("07")).text();
  // The box takes lines 8 to 31; its route has the hop the prototype writes by hand
  const expected = box(frame("07"), 8, 31);
  expect(expected[4]).toBe(boxed("rota    w2 → ldr → mot → você"));
  expected[4] = boxed("rota    w2 → ldr → você");
  expect(box(drawn, 8, 31)).toEqual(expected);
  expect(box(drawn, 18, 31)).toEqual([
    boxed("default logo da 89  · aplicado em 3:08 se você não responder"),
    boxed("resposta  (expandido · ctrl+e recolhe)"),
    ...field(
      [
        "Logo da 89 por enquanto, na versão quadrada para caber no card do",
        "mobile. Abra um ticket separado para buscar capas no Discogs/MusicBrainz",
        "depois da entrega; não bloqueia esta feature.█",
        "",
        "",
        "",
      ],
      184
    ),
    WARNING,
    SEP,
    boxed("efeito  worker-2 troca o default pela sua resposta; nada é refeito."),
    BOTTOM,
  ]);
  expect(drawn[39]).toBe(" enter enviar   ctrl+e recolher   ctrl+u limpar   esc cancelar");
  expect(drawn[39]).toBe(frame("07")[39]!);
});

test("QST-73: an empty field has the cursor at its start and counts 0 characters, in both sizes", () => {
  // The field of one line is in lines 22 to 24; expanded, the box starts at line 8 and the field at line 20
  expect(box(typed({}), 22, 25)).toEqual([...field(["█"], 0), WARNING]);
  expect(box(typed({ expanded: true }), 20, 28)).toEqual([...field(["█", "", "", "", "", ""], 0), WARNING]);
});

test("QST-75: a text that does not fit the line of the field shows `…` and its end", () => {
  // The line has 72 columns: 71 characters and the cursor fill it
  const fits = "x".repeat(61) + "0123456789";
  expect(box(typed({ text: fits }), 22, 24)).toEqual(field([fits + "█"], 71));
  // With one more, `…` and the last 70
  const end = "…" + "x".repeat(60) + "0123456789█";
  expect(box(typed({ text: "y" + fits }), 22, 24)).toEqual(field([end], 72));
  expect(box(typed({ text: "y".repeat(200) + fits }), 22, 24)).toEqual(field([end], 271));
});

test("QST-75: the expanded field breaks the text at its width and shows its last six lines", () => {
  const words = ["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => n.repeat(70));
  const lines = (text: string) => box(typed({ text, expanded: true }), 20, 27);
  expect(lines("a".repeat(40) + " " + "b".repeat(40))).toEqual(field(["a".repeat(40), "b".repeat(40) + "█", "", "", "", ""], 81));
  // Six lines fit; of eight, the first two leave
  expect(lines(words.slice(0, 6).join(" "))).toEqual(field([...words.slice(0, 5), words[5] + "█"], 425));
  expect(lines(words.join(" "))).toEqual(field([...words.slice(2, 7), words[7] + "█"], 567));
});

test("QST-71, QST-73: a blocking question has no line of default, and one without options is in the text mode", () => {
  // Q-07 of frame 05 after `outra resposta…`: 19 lines, from line 10
  const drawn = over(withModal("05", modal(7, { choice: null }))).text();
  expect(box(drawn, 19, 26)).toEqual([
    boxed("Reconexão do stream: retry infinito ou desistir após 5 tentativas?"),
    boxed(""),
    boxed("resposta  (uma linha · ctrl+e expande)"),
    ...field(["█"], 0),
    WARNING,
    SEP,
  ]);
  expect(drawn[39]).toBe(TEXT_KEYS);

  // A question without options has no line to choose from, whatever the choice of the modal: 18 lines, from line 11
  const b = open();
  const id = b.ask(WORKER_1);
  for (const choice of [null, 0]) {
    const lines = b.lines(modal(id, { choice }));
    expect(box(lines, 19, 26)).toEqual([boxed("which port?"), boxed(""), boxed("resposta  (uma linha · ctrl+e expande)"), ...field(["█"], 0), WARNING, SEP]);
    expect(lines[39]).toBe(TEXT_KEYS);
  }
});

test("QST-98: the title of the modal shows `timeout 0:00` once the deadline of the question passed", () => {
  // Q-08 reached the dev at 14:31:15 with 240 s: at 14:36:07 the answer of the broker was not read yet
  const drawn = over({ ...frameView("06"), squad: squad(LOGS["06"]!.events, LOGS["06"]!.now + 240_000) }).text();
  expect(box(drawn, 10, 10)).toEqual([top("? responder Q-08 · timeout 0:00")]);
  expect(box(drawn, 13, 13)).toEqual([boxed("thread  TKT-13 · chegou ao dev 14:31:15 · há 4m52s")]);
  expect(box(drawn, 20, 20)).toEqual([boxed("default logo da 89  · aplicado em 0:00 se você não responder")]);
});

test("QST-96: a text, a reason, an option and a ticket that do not fit are broken or cut with `…` inside the box of the modal", () => {
  const b = open();
  const id = b.ask(WORKER_1, { ...BLOCKING, body: "x".repeat(300), why: "y".repeat(300), options: ["a".repeat(100), "b"], ticket_ref: "T".repeat(100) });
  // 24 lines, from line 8: the text is broken at 76 columns and the reason at 68
  expect(box(b.lines(modal(id)), 8, 31)).toEqual([
    top("? responder Q-01 · BLOQUEANTE"),
    boxed("contexto"),
    boxed("ticket  " + "T".repeat(68) + "…"),
    boxed("thread  " + "T".repeat(68) + "…"),
    boxed("rota    w1 → ldr → mot → você"),
    boxed("por quê " + "y".repeat(68)),
    ...Array.from({ length: 3 }, () => boxed("        " + "y".repeat(68))),
    boxed("        " + "y".repeat(28)),
    SEP,
    boxed("worker-1 pergunta   [BLOQUEANTE] só worker-1 está pausado"),
    ...Array.from({ length: 3 }, () => boxed("x".repeat(76))),
    boxed("x".repeat(72)),
    boxed(""),
    boxed("▶ 1  " + "a".repeat(71) + "…"),
    boxed("  2  b"),
    boxed("  3  outra resposta…"),
    SEP,
    boxed("efeito  worker-1 retoma o"),
    boxed("        " + "T".repeat(67) + "…"),
    BOTTOM,
  ]);
});

test("QST-96: a text and a reason too long for the screen are cut with `…`, and the modal stays between the tabs and the tokens", () => {
  const b = open();
  const id = b.ask(WORKER_2, { ...DEFAULT, body: "x".repeat(3000), why: "y".repeat(3000) });
  const drawn = b.lines(modal(id, { choice: null, text: "8080" }));
  // 34 lines, from line 3 to line 36: the text takes the lines the rest leaves, but for one of the reason
  expect(box(drawn, 3, 10)).toEqual([
    top("? responder Q-01 · timeout 4:00"),
    boxed("contexto"),
    boxed("ticket  —"),
    boxed("thread  chegou ao dev " + clock(NOW) + " · há 0s"),
    boxed("rota    w2 → ldr → mot → você"),
    boxed("por quê " + "y".repeat(67) + "…"),
    SEP,
    boxed("worker-2 pergunta   não-bloqueante · worker-2 segue com o default"),
  ]);
  expect(box(drawn, 11, 26)).toEqual([...Array.from({ length: 15 }, () => boxed("x".repeat(76))), boxed("x".repeat(75) + "…")]);
  expect(box(drawn, 27, 36)).toEqual([
    boxed(""),
    boxed("default 9090  · aplicado em 4:00 se você não responder"),
    boxed("resposta  (uma linha · ctrl+e expande)"),
    ...field(["8080█"], 4),
    WARNING,
    SEP,
    boxed("efeito  worker-2 troca o default pela sua resposta; nada é refeito."),
    BOTTOM,
  ]);
  // Its margin takes lines 2 and 37; the tabs and the tokens are the ones of the tab under it
  expect(cols(drawn, 18, 101, 2, 2).concat(cols(drawn, 18, 101, 37, 37))).toEqual([" ".repeat(84), " ".repeat(84)]);
  const under = questions(b.view()).text();
  expect(under[1]).toBe("  1 principal   2 topologia   3 thread   4 perguntas 1   ? ajuda");
  expect([drawn[1], drawn[38]]).toEqual([under[1]!, under[38]!]);
});

test("QST-80: the refused modal of frame 20b keeps the text that was sent, and says the default applied below the fixed warning", () => {
  const drawn = over(frameView("20b")).text();
  // The box takes lines 10 to 29; its route has the hop the prototype writes by hand
  const expected = box(frame("20b"), 10, 29);
  expect(expected[4]).toBe(boxed("rota    w2 → ldr → mot → você"));
  expected[4] = boxed("rota    w2 → ldr → você");
  expect(box(drawn, 10, 29)).toEqual(expected);
  // Q-08 closed by its deadline two seconds before
  expect(box(drawn, 10, 10)).toEqual([top("? responder Q-08 · timeout 0:00")]);
  expect(box(drawn, 20, 29)).toEqual([
    boxed("default logo da 89  · aplicado (o prazo venceu)"),
    boxed("resposta  (uma linha · ctrl+e expande)"),
    ...field(["logo da 89, com o nome do programa no ar█"], 40),
    WARNING,
    boxed("✗ recusada pelo broker: Q-08 já fechada · default aplicado: logo da 89"),
    SEP,
    boxed("efeito  worker-2 troca o default pela sua resposta; nada é refeito."),
    BOTTOM,
  ]);
  expect(drawn[39]).toBe(" esc fechar");
  expect(drawn[39]).toBe(frame("20b")[39]!);
});

test("QST-80: the field of a refused answer has the red border, and the one of any other does not", () => {
  // The field of frames 06 and 20b takes lines 22 to 24, columns 22 to 97: its corners and its sides
  const border = (id: string) => {
    const g = over(frameView(id));
    return [[22, 22], [22, 97], [23, 22], [23, 97], [24, 22], [24, 97]].map(([y, x]) => g.rows[y!]![x!]!.fg);
  };
  expect(border("20b")).toEqual(["bred", "bred", "bred", "bred", "bred", "bred"]);
  expect(border("06")).not.toContain("bred");
});

test("QST-80: a refused option is drawn in the text mode with its text in the field, and without default the refusal names only the question", () => {
  // In the log of frame 20b the dev answered Q-07, a blocking question with three options, at 14:33:02
  const drawn = over(withModal("20b", modal(7, { choice: null, text: "5 tentativas", refused: true }))).text();
  // 20 lines, from line 10
  expect(box(drawn, 10, 10)).toEqual([top("? responder Q-07 · BLOQUEANTE")]);
  expect(box(drawn, 19, 29)).toEqual([
    boxed("Reconexão do stream: retry infinito ou desistir após 5 tentativas?"),
    boxed(""),
    boxed("resposta  (uma linha · ctrl+e expande)"),
    ...field(["5 tentativas█"], 12),
    WARNING,
    boxed("✗ recusada pelo broker: Q-07 já fechada"),
    SEP,
    boxed("efeito  worker-1 retoma o TKT-12 (rework 1/2) assim que você confirmar."),
    BOTTOM,
  ]);
  expect(drawn[39]).toBe(" esc fechar");
});

test("QST-80: the refusal comes below the fixed warning in the expanded field too", () => {
  // The modal of frame 07 refused: 25 lines, from line 7, with the field in lines 19 to 26
  const g = over(withModal("20b", { ...frameView("07").ui.modal!, refused: true }));
  const drawn = g.text();
  expect(box(drawn, 17, 19)).toEqual([boxed("default logo da 89  · aplicado (o prazo venceu)"), boxed("resposta  (expandido · ctrl+e recolhe)"), boxed("┌" + "─".repeat(74) + "┐")]);
  expect(box(drawn, 26, 29)).toEqual([
    boxed("└" + " 184 chars ─┘".padStart(75, "─")),
    WARNING,
    boxed("✗ recusada pelo broker: Q-08 já fechada · default aplicado: logo da 89"),
    SEP,
  ]);
  expect([g.rows[19]![22]!.fg, g.rows[26]![97]!.fg]).toEqual(["bred", "bred"]);
  expect(drawn[39]).toBe(" esc fechar");
});
