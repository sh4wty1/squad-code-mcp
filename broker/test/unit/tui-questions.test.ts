import { expect, test } from "bun:test";
import type { Caller } from "../../send.ts";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import { clock, type Color } from "../../tui/grid.ts";
import { START } from "../../tui/keys.ts";
import { questions } from "../../tui/screens/questions.ts";
import type { Ui, View } from "../../tui/view.ts";
import { LOGS, PRICES } from "../frames/logs.ts";
import { frame, frameView } from "../frames/view.ts";
import { HUMAN_TOKEN, LEADER, MOTHER, NOW, setup, WORKER_1, WORKER_2, WORKER_3 } from "./helpers.ts";

// The tab drawn from the log of a frame, with the state of its screen changed, the clock
// `later` ms ahead and, with `change`, another log
function draw(id: string, ui: Partial<Ui> = {}, later = 0, change: (events: SquadEvent[]) => SquadEvent[] = (events) => events) {
  const view = frameView(id, change);
  return questions({ ...view, squad: squad(change(LOGS[id]!.events), LOGS[id]!.now + later), ui: { ...view.ui, ...ui } });
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

test("QST-56: with the focus on the history the selected question of the list has no mark, and nothing else of the list changes", () => {
  const list = draw("04", { question: 8 });
  const history = draw("04", { question: 8, qfocus: "history" });
  const heads = (lines: string[]) => [row(lines, 3).slice(0, 6), row(lines, 9).slice(0, 6)];
  expect(heads(list.text())).toEqual(["  Q-07", "▶ Q-08"]);
  expect(heads(history.text())).toEqual(["  Q-07", "  Q-08"]);
  // The mark is in column 2, on the black background of its line: Q-08 starts in line 9
  const lit = (g: typeof list) => g.rows.flatMap((cells, y) => (y > 2 && y < 25 && cells.slice(0, 60).some((cell) => cell.bg !== null) ? [y] : []));
  expect(lit(list)).toEqual([9]);
  expect(lit(history)).toEqual([]);
  expect(cols(history.text(), 3, 58, 3, 24)).toEqual(cols(list.text(), 3, 58, 3, 24));
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

// The text of the detail: columns 62 to 116 of a line
const side = (lines: string[], y: number) => cols(lines, 62, 116, y, y)[0]!.trimEnd();
const sides = (lines: string[], y1: number, y2: number) => Array.from({ length: y2 - y1 + 1 }, (_, i) => side(lines, y1 + i));
// A line of a panel of 60 columns, and its separator
const boxed = (text: string) => "│ " + text.padEnd(57) + "│";
const SEP = "─".repeat(55);
const HINT = "enter responder   b próxima bloqueante";

test("QST-58: the detail of the log of frame 04, with Q-07 selected, is the one of the frame", () => {
  expect(cols(draw("04").text(), 60, 119, 2, 25)).toEqual(cols(frame("04"), 60, 119, 2, 25));
});

test("QST-58, QST-59: the detail of a non-blocking question has its timeout, its default and what an answer changes", () => {
  const drawn = draw("04", { question: 8 }).text();
  // Frame 06 has Q-08 selected and the modal from line 9 down. Its route has the hop the
  // prototype writes by hand (.design/squad-mvp.md line 490).
  const expected = cols(frame("06"), 60, 119, 2, 8);
  expect(expected[5]).toBe(boxed("rota    w2 → ldr → mot → dev"));
  expected[5] = boxed("rota    w2 → ldr → dev");
  expect(cols(drawn, 60, 119, 2, 8)).toEqual(expected);
  expect(sides(drawn, 3, 6)).toEqual([
    "Q-08  timeout 3:08" + " ".repeat(24) + "no dev há 52s",
    "ticket  TKT-13 API da setlist",
    "thread  TKT-13 · chegou ao dev 14:31:15",
    "origem  w2 worker-2  (segue com o default)",
  ]);
  expect(sides(drawn, 9, 24)).toEqual([
    "Setlist sem capa: placeholder genérico ou logo da 89?",
    "por quê ~12% das faixas do upstream chegam sem capa.",
    SEP,
    "default  logo da 89  · aplicado em 3:08 sem resposta",
    SEP,
    "efeito  worker-2 troca o default pela sua resposta;",
    "        nada é refeito.",
    HINT,
    ...Array.from({ length: 8 }, () => ""),
  ]);
});

test("QST-58, QST-59: a question without ticket keeps the lines of the ticket and of the thread, and its effect is on the work", () => {
  const b = open();
  b.ask(WORKER_1);
  b.clock.now = NOW + 75_000;
  const drawn = b.lines();
  expect(cols(drawn, 60, 119, 2, 2)).toEqual(["┌─ Q-01 · detalhe " + "─".repeat(41) + "┐"]);
  expect(sides(drawn, 3, 17)).toEqual([
    "Q-01  [BLOQUEANTE]" + " ".repeat(22) + "no dev há 1m15s",
    "ticket  —",
    "thread  chegou ao dev " + clock(NOW),
    "origem  w1 worker-1  (só ele pausa)",
    "rota    w1 → ldr → mot → dev",
    SEP,
    "which port?",
    "por quê the spec gives two",
    SEP,
    " 1  outra resposta (texto livre)",
    SEP,
    "efeito  worker-1 retoma o trabalho assim que você",
    "        confirmar.",
    HINT,
    "",
  ]);
  // The box is whole
  expect(cols(drawn, 60, 119, 4, 7)).toEqual(sides(drawn, 4, 7).map(boxed));
  expect(cols(drawn, 60, 119, 25, 25)).toEqual(["└" + "─".repeat(58) + "┘"]);
});

test("QST-58: a ticket without rework has none in its line, and the questions merged are named after the route", () => {
  const b = open();
  b.given.plan([{ ticket_ref: "T-1", title: "the player" }]);
  b.given.task("T-1", "worker-1");
  const kept = b.ask(WORKER_1, { ...BLOCKING, ticket_ref: "T-1" });
  const merged = b.ask(WORKER_2);
  b.question.merge(MOTHER, { question_id: merged, into: kept });
  const drawn = b.lines();
  expect(sides(drawn, 4, 9)).toEqual([
    "ticket  T-1 the player",
    "thread  T-1 · chegou ao dev " + clock(NOW),
    "origem  w1 worker-1  (só ele pausa)",
    "rota    w1 → ldr → mot → dev",
    "dedup   absorveu Q-02 (worker) · mesclada pela mother",
    SEP,
  ]);
  expect(sides(drawn, 15, 16)).toEqual(["efeito  worker-1 retoma o T-1 assim que você confirmar.", HINT]);
});

test("QST-57: without open question the detail says the agents go on without the dev", () => {
  const drawn = draw("20b").text();
  // Frame 20b has the modal from line 9 down
  expect(cols(drawn, 60, 119, 2, 8)).toEqual(cols(frame("20b"), 60, 119, 2, 8));
  expect(cols(drawn, 60, 119, 2, 2)).toEqual(["┌─ detalhe " + "─".repeat(48) + "┐"]);
  expect(sides(drawn, 3, 5)).toEqual(["nenhuma pergunta aberta", "", "os agentes seguem sem depender do dev."]);
  expect(cols(drawn, 60, 119, 6, 25)).toEqual([...Array.from({ length: 19 }, () => boxed("")), "└" + "─".repeat(58) + "┘"]);
});

test("QST-98: the detail shows `timeout 0:00` and a default applied in 0:00 once the deadline passed", () => {
  const drawn = draw("04", { question: 8 }, 240_000).text();
  expect(side(drawn, 3)).toBe("Q-08  timeout 0:00" + " ".repeat(22) + "no dev há 4m52s");
  expect(side(drawn, 12)).toBe("default  logo da 89  · aplicado em 0:00 sem resposta");
});

test("QST-96: a text, a reason, an option and a ticket that do not fit are broken or cut with `…` inside the detail", () => {
  const b = open();
  b.ask(WORKER_1, { ...BLOCKING, body: "x".repeat(400), why: "y".repeat(300), options: ["a".repeat(100), "b", "c"], ticket_ref: "T".repeat(60) });
  const drawn = b.lines();

  expect(sides(drawn, 4, 5)).toEqual(["ticket  " + "T".repeat(46) + "…", "thread  " + "T".repeat(46) + "…"]);
  // The text and the reason take the lines the rest of the panel leaves: six and one here
  expect(sides(drawn, 9, 15)).toEqual([...Array.from({ length: 5 }, () => "x".repeat(55)), "x".repeat(54) + "…", "por quê " + "y".repeat(46) + "…"]);
  expect(sides(drawn, 16, 24)).toEqual([
    SEP,
    " 1  " + "a".repeat(50) + "…",
    " 2  b",
    " 3  c",
    " 4  outra resposta (texto livre)",
    SEP,
    "efeito  worker-1 retoma o",
    "        " + "T".repeat(46) + "…",
    HINT,
  ]);
  // Every line is a line of the box or a separator of it
  const lines = cols(drawn, 60, 119, 3, 24);
  expect(lines.filter((line, i) => line !== boxed(side(drawn, 3 + i)) && line !== "├" + "─".repeat(58) + "┤")).toEqual([]);
  expect(cols(drawn, 60, 119, 25, 25)).toEqual(["└" + "─".repeat(58) + "┘"]);
});

// The text of the history: columns 2 to 117 of a line
const past = (lines: string[], y1: number, y2: number) => cols(lines, 2, 117, y1, y2).map((line) => line.trimEnd());
// The two lines of a resolved question: the hour, the label, the route, the ticket and the text, then how it ended
const entry = (hour: string, id: string, route: string, ticket: string, text: string, ended: string) => [hour.padEnd(10) + id.padEnd(6) + route.padEnd(26) + ticket.padEnd(8) + text, " ".repeat(10) + ended];
const MORE = " mais antigas · h e j/k para rolar";
// The main scenario without the question the leader asked the mother at 14:18:40: the five of the history of the prototype
const five = (events: SquadEvent[]) => events.filter((e) => e.seq !== 403 && e.seq !== 404);

const Q11 = entry("14:31:48", "Q-11", "jdg → w2", "TKT-13", "O cache invalida quando a música muda antes dos 30s?", "✓ respondida por worker-2: sim, via ETag do upstream  · rota curta, não chegou ao dev");
const Q12 = entry("14:31:36", "Q-12", "ldr → mot", "TKT-12", "Até quando o player deve tentar reconectar?", "▶ mesclada em Q-07 pela mother · recebe a mesma resposta");
const Q10 = entry("14:30:56", "Q-10", "w2 → ldr → dev", "TKT-13", "Nomes de artista: caixa alta ou como vêm do upstream?", "⟳ default aplicado · worker-2 entregou o ticket antes da resposta: como vêm do upstream");
const Q05 = entry("14:25:30", "Q-05", "w3 → ldr → dev", "TKT-14", "Formato de data na setlist?", "⟳ default aplicado · timeout: HH:mm");
const Q06 = entry("14:24:10", "Q-06", "w2 → ldr → dev", "TKT-13", "Endpoint /api/setlist público ou autenticado?", "✓ respondida pelo dev: público, só leitura");
const Q04 = entry("14:19:05", "Q-04", "ldr → mot", "", "A setlist vem da API da rádio ou é cadastrada no CMS? Isso muda o…", "✓ respondida por mother: API /v1/setlist, polling 30s  · rota curta, não chegou ao dev");

test("QST-60, QST-61, QST-62: with five resolved questions the history shows the five, as frame 04 has them", () => {
  const drawn = draw("04", {}, 0, five).text();
  // The routes are the sequence of the `question` of the log (.design/squad-mvp.md line 490):
  // the prototype writes by hand a hop of the leader to the mother in three of them
  const expected = cols(frame("04"), 0, 119, 26, 37).map((line, i) => {
    const hop = /(w\d → ldr) → mot → dev/.exec(line);
    expect(hop !== null).toBe([5, 7, 9].includes(i));
    return hop ? line.replace(hop[0], `${hop[1]} → dev`.padEnd(20)) : line;
  });
  expect(cols(drawn, 0, 119, 26, 37)).toEqual(expected);
  expect(past(drawn, 27, 36)).toEqual([...Q11, ...Q12, ...Q10, ...Q05, ...Q06]);
});

test("QST-60, QST-62: with six the history shows four and how many are below, and its title counts them all", () => {
  const drawn = draw("04").text();
  expect(cols(drawn, 0, 30, 26, 26)).toEqual(["┌─ histórico · 6 resolvidas ───"]);
  expect(past(drawn, 27, 36)).toEqual([...Q11, ...Q12, ...Q10, ...Q05, "+2" + MORE, ""]);
});

test("QST-62: the history starts at its offset, and never leaves fewer than four on the screen", () => {
  expect(past(draw("04", { historyOffset: 1 }).text(), 27, 36)).toEqual([...Q12, ...Q10, ...Q05, ...Q06, "+1" + MORE, ""]);
  // The last four have none below: the offset stops there
  const last = [...Q10, ...Q05, ...Q06, ...Q04, "", ""];
  expect(past(draw("04", { historyOffset: 2 }).text(), 27, 36)).toEqual(last);
  expect(past(draw("04", { historyOffset: 9 }).text(), 27, 36)).toEqual(last);
  expect(cols(draw("04", { historyOffset: 9 }).text(), 0, 30, 26, 26)).toEqual(["┌─ histórico · 6 resolvidas ───"]);
});

test("QST-60, QST-61: a merged question keeps its hour and its line after the one it follows is answered", () => {
  // In the log of frame 20b the dev answered Q-07 at 14:33:02 and the deadline of Q-08 came at 14:35:15
  const drawn = draw("20b").text();
  expect(cols(drawn, 0, 119, 31, 34)).toEqual(cols(frame("20b"), 0, 119, 31, 34));
  expect(past(drawn, 27, 36)).toEqual([
    ...entry("14:35:15", "Q-08", "w2 → ldr → dev", "TKT-13", "Setlist sem capa: placeholder genérico ou logo da 89?", "⟳ default aplicado · timeout: logo da 89"),
    ...entry("14:33:02", "Q-07", "w1 → ldr → mot → dev", "TKT-12", "Reconexão do stream: retry infinito ou desistir após 5 tentativas?", "✓ respondida pelo dev: infinito com backoff"),
    ...Q11,
    ...Q12,
    "+4" + MORE,
    "",
  ]);
});

test("QST-60: the text of a resolved question is cut at 66 columns, and nothing is written outside the box", () => {
  const b = open();
  const id = b.ask(WORKER_1, { ...BLOCKING, body: "x".repeat(300), ticket_ref: "T".repeat(60) });
  b.question.answerAsHuman({ human_token: HUMAN_TOKEN, question_id: id, answer: "r".repeat(300) });
  const drawn = b.lines();
  expect(past(drawn, 27, 28)).toEqual(entry(clock(NOW), "Q-01", "w1 → ldr → mot → dev", "T".repeat(6) + "…", "x".repeat(65) + "…", "✓ respondida pelo dev: " + "r".repeat(82) + "…"));
  expect(cols(drawn, 0, 1, 27, 36)).toEqual(Array.from({ length: 10 }, () => "│ "));
  expect(cols(drawn, 118, 119, 27, 36)).toEqual(Array.from({ length: 10 }, () => " │"));
});

test("QST-63: the panel in focus has the white border and the other the gray one", () => {
  // A corner, a side and the bottom of each box; the title is white in both
  const borders = (qfocus: Ui["qfocus"]) => {
    const g = draw("04", { qfocus });
    const at = (cells: [x: number, y: number][]) => cells.map(([x, y]) => g.rows[y]![x]!.fg);
    return { list: at([[0, 2], [0, 10], [59, 25], [30, 25]]), history: at([[0, 26], [0, 30], [119, 37], [60, 37]]) };
  };
  const white: Color[] = ["bwhite", "bwhite", "bwhite", "bwhite"];
  const gray: Color[] = ["gray", "gray", "gray", "gray"];
  expect(borders("list")).toEqual({ list: white, history: gray });
  expect(borders("history")).toEqual({ list: gray, history: white });
});
