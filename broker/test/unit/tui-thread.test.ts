import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { thread } from "../../tui/screens/thread.ts";
import type { Ui } from "../../tui/view.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

function draw(frame: string, ui: Partial<Ui> = {}, change?: Change) {
  const view = frameView(frame, change);
  return thread({ ...view, ui: { ...view.ui, ...ui } });
}
const lines = (frame: string, ui?: Partial<Ui>, change?: Change) => draw(frame, ui, change).text();
// Columns `from` to `to` of a line, without the spaces at the right
const part = (line: string, from: number, to: number) => [...line.padEnd(120)].slice(from, to + 1).join("").trimEnd();
const left = (line: string) => part(line, 2, 73);
const right = (line: string) => part(line, 78, 117);
// The first line of each entry: the hour, the glyph, the kind, from and to, and the note
const heads = (drawn: string[]) => drawn.slice(5, 35).map(left).filter((line) => /^\d\d:\d\d:\d\d /.test(line));
// The note of the entry of an hour
const note = (drawn: string[], hour: string) => part(drawn.find((line) => left(line).startsWith(hour))!, 37, 73);

test("TUI-46: the header has the owner, the opening, the outcome and the reworks of the ticket", () => {
  expect(part(lines("03")[2]!, 0, 36)).toBe("┌─ thread TKT-12 · player de áudio ──");
  expect(left(lines("03")[3]!)).toBe("worker-1 · aberto 14:20:11 · fechado 14:43:50 · ⟳ 1/2");
  expect(left(lines("15b")[3]!)).toBe("worker-1 · aberto 14:20:11 · escalado 14:47:30 · ⟳ 2/2");
  // A ticket still going has no outcome
  expect(left(lines("01", { threadTicket: "TKT-13" })[3]!)).toBe("worker-2 · aberto 14:20:12 · ⟳ 0/2");
});

test("TUI-46: the entries are the task, result, verdict, question and answer of the ticket, in order, each with its summary", () => {
  const drawn = lines("03");
  expect(heads(drawn).map((line) => line.slice(0, 31).trimEnd())).toEqual([
    "14:20:11 ● [task]     ldr → w1",
    "14:26:47 ● [result]   w1 → jdg",
    "14:28:03 ✗ [verdict]  jdg → ldr",
    "14:28:30 ● [task]     ldr → w1",
    "14:29:10 ? [question] w1 → ldr",
    "14:31:34 ● [question] ldr → mot",
    "14:33:02 ● [answer]   hum → w1",
    "14:39:52 ● [result]   w1 → jdg",
    "14:43:50 ✓ [verdict]  jdg → ldr",
  ]);
  expect(drawn.slice(5, 9).map(left)).toEqual(["14:20:11 ● [task]     ldr → w1", "         │ player de áudio HLS", "         │", "14:26:47 ● [result]   w1 → jdg     6m36s"]);
  // The question that waits stands out, as the verdicts do
  const g = draw("03");
  expect([g.rows[17]![11]!.fg, g.rows[11]![11]!.fg, g.rows[29]![11]!.fg]).toEqual(["bred", "bred", "bgreen"]);
});

test("TUI-46: a task shows its loadout under its summary", () => {
  const loadout: Change = (events) => events.map((e) => (e.seq === 406 ? { ...e, loadout: ["tlc-implement", "ponytail"] } : e));
  expect(lines("03", {}, loadout).slice(5, 8).map(left)).toEqual(["14:20:11 ● [task]     ldr → w1", "         │ player de áudio HLS", "         │ loadout: tlc-implement · ponytail"]);
});

test("TUI-46: the line of the flow is the events of the ticket in short form, cut at 72 columns", () => {
  expect(left(lines("03")[35]!)).toBe("fluxo  task ▶ result ▶ ✗ v1 ▶ task ▶ ? Q-07 ▶ answer ▶ result ▶ ✓ v2");
  const long = left(lines("15b")[35]!);
  expect(long).toBe("fluxo  task ▶ result ▶ ✗ v1 ▶ task ▶ result ▶ ✗ v2 ▶ task ▶ result ▶ ✗ …");
  expect([...long].length).toBe(72);
  // The third verdict of rework is the limit
  const verdicts: Change = (events) => events.filter((e) => e.ticket_ref !== "TKT-12" || [406, 417, 449, 452, 453, 455].includes(e.seq));
  expect(left(lines("15b", {}, verdicts)[35]!)).toBe("fluxo  task ▶ ✗ v1 ▶ ✗ v2 ▶ result ▶ ✗ v3 ▶ ⚠ limite 2/2 ▶ ? Q-13");
});

test("TUI-47: the note of a result is the time since the task it cites", () => {
  expect(note(lines("03"), "14:26:47")).toBe("6m36s");
  expect(note(lines("03"), "14:39:52")).toBe("11m22s");
});

test("TUI-47: the note of a verdict is its outcome with the criteria that passed, and the limit at the third rework", () => {
  expect(note(lines("03"), "14:28:03")).toBe("REWORK ⟳ 1/2 · 4/5");
  expect(note(lines("03"), "14:43:50")).toBe("APPROVE · 5/5");
  expect(note(lines("15b"), "14:38:40")).toBe("REWORK ⟳ 2/2 · 4/5");
  expect(note(lines("15b"), "14:47:30")).toBe("REPROVADO · 4/5 · limite atingido");
});

test("TUI-47: the note of a task after a rework is the rework it is", () => {
  expect(note(lines("15b"), "14:20:11")).toBe("");
  expect(note(lines("15b"), "14:28:30")).toBe("rework 1/2");
  expect(note(lines("15b"), "14:39:05")).toBe("rework 2/2");
});

test("TUI-47: the note of a question is its id, whether it blocks and its route", () => {
  expect(note(lines("15b"), "14:47:55")).toBe("Q-13 [BLOQUEANTE] · ldr → mot");
  // The route goes on to the dev once the question reaches him, in the one entry of the question
  expect(note(lines("25b", { threadOffset: 1 }), "14:47:55")).toBe("Q-13 [BLOQUEANTE] · ldr → mot → dev");
  expect(note(lines("03"), "14:29:10")).toBe("Q-07 [BLOQUEANTE] · w1 → ldr → mot →…");
  expect(note(lines("03"), "14:31:34")).toBe("Q-12 · ldr → mot");
});

test("TUI-47: the note of an answer is the id of the question, with the time it was with the dev when he answered", () => {
  expect(note(lines("03"), "14:33:02")).toBe("Q-07 · 3m22s no dev");
  expect(note(lines("25b"), "14:50:02")).toBe("Q-13 · 1m52s no dev");
  expect(note(lines("25b"), "14:50:20")).toBe("Q-13");
});

test("TUI-46: the right side has a column per verdict, the verdicts with what passed, the notes of the judge and the questions", () => {
  expect(lines("15b").slice(3, 24).map(right)).toEqual([
    "critério da spec            v1   v2   v3",
    "1 play/pause e volume       ✓    ✓    ✓",
    "2 metadados da faixa        ✓    ✓    ✓",
    "3 reconexão após queda      ✗    ✗    ✓",
    "4 acessível por teclado     ✓    ✓    ✓",
    "6 funciona no iOS           ✓    ✓    ✗",
    "────────────────────────────────────────",
    "v1 14:28:03  ✗ rework     4/5",
    "v2 14:38:40  ✗ rework     4/5",
    "v3 14:47:30  ✗ reprovado  4/5",
    "────────────────────────────────────────",
    "notas do judge",
    "3 v1   player fica em erro ao derrubar o",
    "       HLS; nenhuma tentativa de",
    "       reconexão.",
    "3 v2   volta ~40s atrás do ao vivo.",
    "6 v3   no iOS o áudio não volta a tocar",
    "       depois de reconectar.",
    "────────────────────────────────────────",
    "perguntas no thread",
    "Q-13 ? aberta · com mot",
  ]);
  expect(lines("03").slice(10, 12).map(right)).toEqual(["v1 14:28:03  ✗ rework   4/5", "v2 14:43:50  ✓ approve  5/5"]);
  // A criterion that failed in some verdict is red, and its note has the color of its mark
  const g = draw("03");
  expect([g.rows[6]![80]!.fg, g.rows[4]![80]!.fg, g.rows[6]![111]!.fg, g.rows[6]![116]!.fg, g.rows[14]![78]!.fg, g.rows[17]![78]!.fg]).toEqual(["bred", "white", "bred", "bgreen", "bred", "bgreen"]);
});

test("TUI-46: each question of the ticket says how it ended", () => {
  expect(lines("03").slice(22, 25).map(right)).toEqual(["perguntas no thread", "Q-07 ✓ respondida pelo dev em 3m22s", "Q-12 ▶ mesclada em Q-07"]);
  const setlist = lines("03", { threadTicket: "TKT-13" }).map(right);
  const at = setlist.indexOf("perguntas no thread");
  expect(setlist.slice(at + 1, at + 5)).toEqual(["Q-06 ✓ respondida pelo dev em 18s", "Q-10 ⟳ default aplicado · entregou antes", "Q-08 ⟳ default aplicado · timeout", "Q-11 ✓ respondida entre agentes"]);
});

test("TUI-48: a planned ticket has no line of time: the title, what it depends on and no owner", () => {
  const drawn = lines("24d");
  expect(part(drawn[2]!, 0, 35)).toBe("┌─ thread TKT-13 · API da setlist ──");
  expect(drawn.slice(3, 18).map(left)).toEqual([
    "sem dono · no plano v1 desde 14:19:50 · [planned]",
    "",
    "○ sem linha do tempo",
    "",
    "O TKT-13 está no plano mas ainda não recebeu task. A linha do tempo",
    "começa na primeira task do leader; até lá só existe o que o plano diz.",
    "",
    "no plano v1",
    "título     API da setlist",
    "depende de TKT-12 player de áudio · [working] w1",
    "dono       —  definido quando a task sair",
    "rework     ⟳0/2",
    "",
    "próximo evento esperado",
    "ldr → worker  [task]  depois que o TKT-12 for aprovado",
  ]);
  expect(left(drawn[35]!)).toBe("fluxo  ▶ plano v1 ▶ aguarda TKT-12 ▶ task");
  expect(drawn.slice(4, 10).map(right)).toEqual(["────────────────────────────────────────", "judge", "○ sem avaliação · nada entregue", "────────────────────────────────────────", "perguntas no thread", "nenhuma"]);
  // TKT-14 depends on nothing
  const free = lines("24d", { threadTicket: "TKT-14" });
  expect([left(free[12]!), left(free[17]!), left(free[35]!)]).toEqual(["depende de —", "ldr → worker  [task]", "fluxo  ▶ plano v1 ▶ task"]);
});

test("TUI-48: a dropped ticket ends with the entry of the plan that dropped it", () => {
  const drawn = lines("25b");
  expect(left(drawn[3]!)).toBe("worker-1 · aberto 14:20:11 · descartado 14:51:10 · [dropped]");
  expect(heads(drawn).at(-1)).toBe("14:51:10 ✗ [dropped]  ldr          plano v2 · TKT-12 saiu · w1 liberado");
  // A ticket dropped before any task has that entry alone
  const plan: Change = (events) => {
    const first = events.find((e) => e.seq === 405)!;
    if (first.kind !== "plan") throw new Error("405 is the plan");
    return [...events, { ...first, seq: 9000, ts: first.ts + 60_000, tickets: first.tickets.map((t) => (t.ticket_ref === "TKT-14" ? { ...t, dropped: true } : t)) }];
  };
  const never = lines("24d", { threadTicket: "TKT-14" }, plan);
  expect([left(never[3]!), left(never[5]!), left(never[6]!), left(never[35]!)]).toEqual(["sem dono · descartado 14:20:50 · [dropped]", "14:20:50 ✗ [dropped]  ldr          plano v2 · TKT-14 saiu", "", "fluxo  ✗ dropped"]);
});

test("TUI-46: the entries that do not fit in the 30 lines fold into a count, and the thread scrolls", () => {
  const drawn = lines("25b").map(left);
  expect(drawn.slice(5, 8)).toEqual(["           … 3 eventos antes · k rola", "         │", "14:28:30 ● [task]     ldr → w1     rework 1/2"]);
  expect(drawn[34]).toBe("14:51:10 ✗ [dropped]  ldr          plano v2 · TKT-12 saiu · w1 liberado");
  // Two entries up: the two latest fold below, and one more of the oldest shows
  const up = lines("25b", { threadOffset: 2 }).map(left);
  expect(up.slice(5, 8)).toEqual(["           … 2 eventos antes · k rola", "         │", "14:28:03 ✗ [verdict]  jdg → ldr    REWORK ⟳ 1/2 · 4/5"]);
  expect(up.slice(31, 35)).toEqual(["14:50:02 ● [answer]   hum → mot    Q-13 · 1m52s no dev", "         │ Q-13: descartar, tentar de novo", "         │", "           … 2 eventos depois · j rola"]);
  // A thread that fits has no fold
  expect(lines("15b").map(left).filter((line) => line.includes("eventos"))).toEqual([]);
});

test("Assumptions: the thread is of the chosen ticket, or of the one of the selected line, or of the first of the plan", () => {
  const title = (drawn: string[]) => part(drawn[2]!, 3, 18);
  expect(title(lines("01", { selected: 425 }))).toBe("thread TKT-13 ·");
  expect(title(lines("01", { selected: 425, threadTicket: "TKT-14" }))).toBe("thread TKT-14 ·");
  // The selected line of 25b is a refusal, which has no ticket
  expect(title(lines("25b"))).toBe("thread TKT-12 ·");
  expect(title(lines("03", { selected: null }))).toBe("thread TKT-12 ·");
  const none = lines("26a");
  expect([part(none[2]!, 0, 11), left(none[5]!)]).toEqual(["┌─ thread ──", "○ nenhum ticket ainda"]);
});
