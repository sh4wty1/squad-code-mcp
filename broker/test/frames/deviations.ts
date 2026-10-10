// Where the screen drawn from a log may differ from the frame of the prototype, and why.
// A deviation replaces `width` columns of a line of the frame with `text`; what a line is
// expected to be is the frame with its deviations applied in order. Classes (spec,
// Assumptions): D1, the derivation gives a status or a text other than the one written by
// hand in the prototype; D2, the frame shows what no event has; D3, cut by the spec.

import { len, pad } from "../../tui/grid.ts";
import { frame } from "./view.ts";

export interface Deviation {
  line: number;
  col: number;
  width: number;
  text: string;
  class: "D1" | "D2" | "D3";
  why: string;
}

type At = [line: number, col: number, width: number, text: string];

const d = (cls: Deviation["class"], why: string, ...at: At[]): Deviation[] =>
  at.map(([line, col, width, text]) => ({ line, col, width, text, class: cls, why }));

// The third line of an agent, columns 4 to 26
const SKILLS = "the base skills of a role come from roles.json (slice Papéis), not from an event: the line shows the loadout of the task, and no task of these logs has one";
const skills = (...lines: number[]) => d("D2", SKILLS, ...lines.map((line): At => [line, 4, 23, "sem loadout"]));
// The lines of the third line of mother, leader, worker-1, worker-2 and judge
const [MOT, LDR, W1, W2, JDG] = [5, 9, 13, 17, 25];


// The first line of an agent, columns 2 to 26: the glyph, the name and the status at the right
const status = (line: number, glyph: string, name: string, label: string, why: string) =>
  d("D1", why, [line, 2, 25, `${glyph} ${name}`.padEnd(25 - label.length - 2) + `[${label}]`]);
// A deviation of status cites the line of .design/squad-mvp.md that contradicts the prototype
const MOTHER = status(3, "●", "mother", "working", ".design/squad-mvp.md line 356: `waiting` takes an open question she escalated or a pending gate of hers, and there is none; line 358: the mother with an open feature and nothing pending with the dev is `working`");
const W2_IDLE = status(15, "○", "worker-2", "idle", ".design/squad-mvp.md line 356: no open question is his; line 360: the rest is `idle`");
const W1_IDLE = status(11, "○", "worker-1", "idle", ".design/squad-mvp.md line 364 gives the ticket no status of its own after the rework; line 356 does not cover him; line 360: the rest is `idle`");
const LEADER_WORKING = status(7, "●", "leader", "working", ".design/squad-mvp.md line 356, second condition, with line 358: TKT-12 and TKT-13 are not concluded, so he has tickets in progress. The prototype draws `working` in this same state in 01, 13a and 13c");

// The second line of an agent, columns 4 to 26: the role and the activity
const doing = (line: number, text: string, why: string) => d("D1", why, [line, 4, 23, text]);
const ESCALATED = "table of activity of the design: a leader that passed on a question still open shows `escalou <ticket>` before its tickets (Q-07)";

// The feed, columns 29 to 84. The scenarios of the prototype that start at the opening of
// the feature get the six entries and the ruler above it: with them the feed is the last
// 33 of its lines, each one where the frame has the one before.
const ENTERED = "the prototype draws the six agents in the broker with no entry in the feed; by TUI-01 the log needs their peer_joined, TUI-24 gives each a line and TUI-29 the ruler above the feature, so the lines of the feature go down";
function entered(id: string): Deviation[] {
  const feed = frame(id).map((line) => [...line.padEnd(120)].slice(29, 85).join("").trimEnd());
  const drawn = feed.slice(4, 37).filter((line) => line !== "");
  const rule = " ▲ antes da feature · entradas no broker ";
  const side = Math.floor((56 - len(rule)) / 2);
  const entries = ["14:02:10 ● mot", "14:02:18 ● ldr", "14:03:01 ● w1", "14:03:02 ● w2", "14:03:04 ● w3", "14:03:30 ● jdg"].map((who) => `  ${who} entrou`);
  const all = [...entries, "─".repeat(side) + rule + "─".repeat(56 - side - len(rule)), ...drawn].slice(-33);
  return d("D1", ENTERED, ...all.flatMap((text, i): At[] => (text === feed[4 + i] ? [] : [[4 + i, 29, 56, text]])));
}
// The text of a system line, columns 40 to 84
const PLAN = "TUI-24 fixes the line of a plan as `▶ plano v<N> de ldr · <n> tickets`; the prototype writes more by hand";
const plan = (line: number, text = "▶ plano v1 de ldr · 3 tickets") => d("D1", PLAN, [line, 40, 45, text]);
// The body of a permission line, columns 71 to 84
const SUMMARY = "the body of a line is the summary of the event, and the broker writes the one of a permission as the tool and the description or the decision (Assumptions, `Corpo da linha de mensagem`)";
const body = (line: number, text: string) => d("D1", SUMMARY, [line, 71, 14, text]);

// The reworks next to the activity of worker-1: after `TKT-12 a…` and after `TKT-12 ✓`
const REWORKS = "the prototype counts the reworks of a ticket it calls by the whole text of the activity and finds none; TKT-12 has one verdict of rework, as the panel of tickets shows";
const W1_REWORK = d("D1", REWORKS, [12, 23, 4, "⟳1/2"]);
const W1_APPROVED = d("D1", REWORKS, [12, 22, 4, "⟳1/2"]);
const NO_TICKET = "table of activity of the design: without an open feature a worker is `sem ticket`; the log does not keep what it had";
const LEADER_TICKETS = "table of activity of the design: the leader shows every ticket neither approved nor dropped";

// The panel of detail. Its text is in columns 88 to 117; a whole line takes 86 to 119.
const LOADOUT = "the block of the loadout shows the one of the task (TUI-39); the base skills of a role come from roles.json (slice Papéis), not from an event";
const loadout = (line: number, more: number) => d("D2", LOADOUT, [line, 88, 30, "sem loadout"], ...Array.from({ length: more }, (_, i): At => [line + 1 + i, 88, 30, ""]));
// Whole lines from `line` down: a text, `---` for a separator. A text of more than 30 runs to the edge.
const panel = (cls: Deviation["class"], why: string, line: number, ...texts: string[]) =>
  d(cls, why, ...texts.map((t, i): At => [line + i, 86, 34, t === "---" ? "├" + "─".repeat(32) + "┤" : len(t) > 30 ? `│ ${t}` : `│ ${pad(t, 30)} │`]));
const DECLARED = d("D2", "the prototype names the question of another scenario (Q-09); the line says where a declared block is solved", [0, 88, 30, "declarado  → pergunta ao dev"]);
const declared = (line: number) => DECLARED.map((dev) => ({ ...dev, line }));
const COUNTS = "the prototype writes the counts of questions by hand and leaves out the one of the leader to the mother at 14:18:40, which she answered";
const counts = (line: number) => d("D2", COUNTS, [line, 88, 30, "✓ 2 pelo dev · 2 entre agentes"]);

// Line 1, the seals at the right, and line 38, the right side of the footer
const seal = (text: string, why: string) => d("D1", why, [1, 66, 53, text.padStart(53)]);
const footer = (cls: Deviation["class"], why: string, text: string) => d(cls, why, [38, 85, 34, text.padStart(34)]);
// The seal of the scenario of the missing key, where the prototype writes `Q-09 é sua`
const KEY_SEAL = seal("⚠ w2 bloqueado · RADIO_API_KEY ausente", "table of seals of the design: the long form of a block has its reason, not the question the prototype writes by hand");
const LIMIT = "the line of the limit is no event: it takes the hour of the third verdict of rework (TUI-26), not one second after";

// The topology. The box of a worker takes lines 21 to 25 at columns 4, 31 and 58, with 20
// columns of text; the ones of mother, leader and judge start at lines 7, 13 and 30, with
// 22 columns of text from column 32. The panel of edges has its text in columns 88 to 117.
const WORKER = { w1: 6, w2: 33, w3: 60 };
const nodeStatus = (line: number, col: number, width: number, glyph: string, name: string, label: string, why: string) =>
  d("D1", why, [line, col, width, `${glyph} ${name}`.padEnd(width - label.length - 2) + `[${label}]`]);
const nodeSkills = (...workers: (keyof typeof WORKER)[]) => d("D2", SKILLS, ...workers.map((w): At => [24, WORKER[w], 20, "sem loadout"]));
const REWORKS_ALL = "the prototype lists the reworks of TKT-12 and TKT-13 by name; TUI-45 asks the reworks of each ticket, and the plan has TKT-14 too";
const reworksAll = (line: number) => d("D1", REWORKS_ALL, [line, 88, 30, "TKT-14 ⟳ 0/2  worker-3"]);
const nodeEscalated = d("D1", ESCALATED, [15, 32, 22, "escalou TKT-12"]);

// The thread. The line of time is in columns 2 to 73 of lines 5 to 34 and the right side
// in columns 78 to 117. Both are given whole, from a line down, and only the lines that
// differ from the frame become deviations.
function block(cls: Deviation["class"], why: string, id: string, line: number, col: number, texts: string[]): Deviation[] {
  const drawn = frame(id).map((text) => [...text.padEnd(120)]);
  return d(cls, why, ...texts.flatMap((text, i): At[] => (drawn[line + i]!.slice(col, col + len(text)).join("") === text ? [] : [[line + i, col, len(text), text]])));
}
// An entry is its line and the line of its summary; a line of the thread alone between two entries
const steps = (...entries: [head: string, body?: string][]) =>
  entries.flatMap(([head, body], i) => [...(i ? ["         │"] : []), head, ...(body === undefined ? [] : ["         │ " + body])]);
// The line of time takes the edge of its box too: the frame 03 writes over it
const timeline = (cls: Deviation["class"], why: string, id: string, ...texts: string[]) =>
  block(cls, why, id, 5, 2, texts.map((text) => pad(text, 73) + "│"));
const side = (cls: Deviation["class"], why: string, id: string, line: number, ...texts: string[]) =>
  block(cls, why, id, line, 76, texts.map((text) => (text === "---" ? "├" + "─".repeat(42) + "┤" : `│ ${pad(text, 40)} │`)));
const SUMMARIES = "TUI-46: the body of an entry is the summary of its event, and TUI-47 the note of a result the time since its task; the prose the prototype writes for each step and the tokens per step are in no event (Out of Scope)";
const FLOW = "design, `Anotações e fluxo do thread`: the flow is every event of the ticket in its short form, cut at the 72 columns of the panel; the prototype writes a summary of it by hand";
const flow = (text: string) => d("D1", FLOW, [35, 2, 72, text]);
const FLOW_ESCALATED = "fluxo  task ▶ result ▶ ✗ v1 ▶ task ▶ result ▶ ✗ v2 ▶ task ▶ result ▶ ✗ …";
const NOTES = ["notas do judge", "3 v1   player fica em erro ao derrubar o", "       HLS; nenhuma tentativa de", "       reconexão.", "3 v2   volta ~40s atrás do ao vivo.", "6 v3   no iOS o áudio não volta a tocar", "       depois de reconectar."];
// The first three events of TKT-12, and the six that follow where it is reproved three times
const STARTED: [string, string][] = [
  ["14:20:11 ● [task]     ldr → w1", "player de áudio HLS"],
  ["14:26:47 ● [result]   w1 → jdg     6m36s", "player + controles, 4 arquivos"],
  ["14:28:03 ✗ [verdict]  jdg → ldr    REWORK ⟳ 1/2 · 4/5", "rework: reconexão após queda"],
];
const REPROVED: [string, string][] = [
  ["14:28:30 ● [task]     ldr → w1     rework 1/2", "rework 1/2: retry c/ backoff"],
  ["14:36:10 ● [result]   w1 → jdg     7m40s", "v2: backoff + retomada"],
  ["14:38:40 ✗ [verdict]  jdg → ldr    REWORK ⟳ 2/2 · 4/5", "rework 2/2: retoma atrasado"],
  ["14:39:05 ● [task]     ldr → w1     rework 2/2", "rework 2/2 (último): borda"],
  ["14:46:20 ● [result]   w1 → jdg     7m15s", "v3: liveSyncPosition"],
  ["14:47:30 ✗ [verdict]  jdg → ldr    REPROVADO · 4/5 · limite atingido", "reprovado 3ª vez: iOS"],
];

// The tab of questions. A route takes 20 columns: from column 9 in the list, from column 70
// in the detail and from column 18 in the history.
const HOPS = ".design/squad-mvp.md line 490: the route shown is the sequence of the `question` of the log, and a question of the mock without a hop is an omission of the mock; the scenario has no `question` of the leader to the mother for this one, and the prototype writes that hop by hand";
const hops = (line: number, col: number, route: string, width = 20) => d("D1", HOPS, [line, col, width, route]);
const ASKED_MOTHER = "Assumptions, `Logs dos frames novos`: the question the leader asked the mother at 14:18:40, answered by her at 14:19:05, is a resolved question of the feature (QST-60), and the history the prototype writes by hand leaves it out";
// The history of the main scenario at 14:32:07, the one of frames 04 to 07: its count, the
// line of the ones below where the frame has the fifth, and the routes of Q-10 and of Q-05
const SIX = d("D1", ASKED_MOTHER + "; with six the history shows four and how many are below (QST-62)", [26, 15, 1, "6"], [35, 2, 116, "+2 mais antigas · h e j/k para rolar"], [36, 2, 116, ""]);
const Q10_HOPS = hops(31, 18, "w2 → ldr → dev");
const Q05_HOPS = hops(33, 18, "w3 → ldr → dev");

// The modal of answer, over the tab. The route of Q-08 in it ends in `você`: 21 columns
// from column 30. Its box and the margin around it take columns 18 to 101 of each line.
const Q08_HOPS = (line: number) => hops(line, 30, "w2 → ldr → você", 21);
const modalOf = (id: string, from: number, to: number) => frame(id).slice(from, to + 1).map((line) => [...line.padEnd(120)].slice(18, 102).join(""));
const EFFECT = 'Assumptions, `Linha "efeito"`: the TUI writes the effect from who asked and the ticket (QST-59), and the one the prototype writes by hand for Q-09 is in no event';

export const DEVIATIONS: Record<string, Deviation[]> = {
  "01": [...skills(MOT, LDR, W2, JDG), ...doing(8, "tech lead · escalou TK…", ESCALATED), ...entered("01"), ...plan(9), ...loadout(33, 2)],
  "09a": [...skills(MOT, LDR, W1, W2, JDG), ...counts(15)],
  "09b": [...skills(MOT, LDR, W1, W2, JDG), ...counts(16)],
  "10": [
    ...skills(MOT, LDR, W1, JDG),
    ...LEADER_WORKING,
    ...entered("10"),
    ...plan(15),
    ...KEY_SEAL,
    ...panel(
      "D2",
      "Assumptions, `Detalhe de um blocked`: the reason, the detail and the last action of the event, then the questions of the ticket after it; `tipo`, `resolver em` and the key that answers are prose of the scenario or of the slice Question",
      6,
      "---", "motivo", "RADIO_API_KEY ausente", "GET /v1/setlist → 401. A", "RADIO_API_KEY não está no .env", "do worktree do worker-2.", "última ação", "bun test src/api, 3 tentativas",
      "---", "escalação", " 14:29 w2→ldr [question]", " 14:30 ldr→mot [question]", " 14:30 mot→hum [question]", "---", "enter thread TKT-13", "", "", "", "", ""
    ),
  ],
  "13a": [...skills(MOT, LDR, JDG), ...doing(8, "tech lead · escalou TK…", ESCALATED), ...entered("13a"), ...plan(15), ...loadout(26, 2)],
  "13c": [
    ...skills(MOT, LDR, W2, JDG),
    ...doing(8, "tech lead · escalou TK…", ESCALATED),
    ...doing(16, "worker · TKT-13", "table of activity of the design: a worker with a task shows the ticket, without the note the prototype adds"),
    ...entered("13c"),
    ...plan(15),
    ...loadout(14, 2),
  ],
  "14": [
    ...MOTHER,
    ...W2_IDLE,
    ...skills(MOT, LDR, W2, JDG),
    ...doing(8, "tech lead · TKT-12/13", LEADER_TICKETS),
    ...entered("14"),
    ...plan(15),
    ...body(30, "Bash: Rodar o…"),
    ...declared(21),
    ...loadout(25, 2),
  ],
  "15a": [
    ...status(7, "?", "leader", "waiting ?", ".design/squad-mvp.md line 355: he is `asked_by` of the blocking question of the escalation, still open (slice Question, line 425)"),
    ...d("D1", "the third line of who waits for a blocking question of its own is the question and who holds it, here the mother (TUI-35); see the status of the leader, .design/squad-mvp.md line 355", [9, 4, 23, "? Q-13 bloqueante · mot"]),
    ...skills(MOT, W1, W2, JDG),
    ...doing(8, "tech lead · escalou TK…", "table of activity of the design: a leader that asked a question still open shows `escalou <ticket>`"),
    ...doing(12, "worker · TKT-12 a… ⟳2/2", "table of activity of the design: a worker whose ticket ended in a verdict of rework shows `<ticket> aguarda ldr`; the ticket is still his"),
    ...entered("15a"),
    ...plan(13),
    ...d("D2", LIMIT, [35, 31, 8, "14:47:30"]),
    ...loadout(25, 2),
  ],
  "18a": [
    ...status(3, "○", "mother", "waiting", ".design/squad-mvp.md line 356: the gate she asked is still pending; a comment does not decide it (line 560)"),
    ...doing(4, "objetivo · G-01 com o …", "table of activity of the design: the mother with a pending gate shows it; see her status, .design/squad-mvp.md line 356"),
    ...skills(MOT, LDR, W1, W2, JDG),
    ...W1_APPROVED,
    ...seal("⚠ gate G-01 pendente · g", "table of seals of the design: a pending gate has one text, and a comment leaves it pending"),
    ...footer("D1", "right side of the footer in the design: a pending gate is `⚠ G-01 aguarda você`", "⚠ G-01 aguarda você"),
    ...loadout(24, 1),
  ],
  "19a": [...skills(MOT, LDR, W1, W2, JDG), ...W1_APPROVED, ...loadout(21, 1)],
  "22c": [...MOTHER, ...skills(MOT, LDR, JDG), ...entered("22c"), ...plan(15), ...body(30, "Bash: Rodar o…"), ...body(31, "Bash: Atualiz…"), ...declared(21), ...loadout(25, 2)],
  "22g": [
    ...skills(MOT, LDR, W2),
    ...doing(4, "objetivo · G-02 com o …", "table of activity of the design: a pending gate of the mother comes before the questions with the dev"),
    ...doing(8, "tech lead · escalou TK…", ESCALATED),
    ...plan(7),
    ...body(35, "Bash: Rodar a…"),
    ...footer("D1", "right side of the footer in the design: the alert of an agent comes before the reworks of the selected line", "⚠ jdg bloqueado há 17s"),
    ...loadout(20, 1),
  ],
  "22h": [
    ...MOTHER,
    ...W2_IDLE,
    ...skills(MOT, LDR, W1, W2, JDG),
    ...doing(8, "tech lead · TKT-12/13", LEADER_TICKETS),
    ...d("D1", ".design/squad-mvp.md line 364: a ticket is `blocked` while the worker that owns it is; the request was decided and the frame itself draws worker-1 `working`", [31, 7, 9, "[working]"]),
    ...entered("22h"),
    ...plan(15),
    ...body(30, "Bash: Rodar o…"),
    ...d("D1", SUMMARY, [32, 72, 13, "allow: Bash"]),
    ...panel(
      "D2",
      "the broker writes a permission_decision without body: the text of the frame is prose of the scenario, with the id P-01 of the modal (out of scope), so the thread and the loadout come four lines up",
      10,
      "", "---", "thread TKT-12 · 6 msgs", " 14:26 w1→jdg [result]", " 14:28 jdg→ldr [verdict]", " 14:28 ldr→w1  [task]", " 14:30 w1→hum [permission_reques", "▶14:31 hum→w1  [permission_decis",
      "---", "loadout worker-1", "sem loadout", "", "", "", "", ""
    ),
  ],
  "23a": [...MOTHER, ...W1_IDLE, ...skills(MOT, W1, JDG), ...W1_REWORK, ...entered("23a"), ...plan(15), ...loadout(26, 2)],
  "24a": [...MOTHER, ...skills(MOT, LDR, W1, W2, JDG), ...entered("24a"), ...plan(15), ...loadout(21, 0)],
  "24b": [...MOTHER, ...skills(MOT, LDR, W1, W2, JDG), ...doing(8, "tech lead · TKT-12/13/…", LEADER_TICKETS), ...entered("24b"), ...plan(15), ...loadout(20, 2)],
  "24c": [...MOTHER, ...skills(MOT, LDR, W1, W2, JDG), ...entered("24c"), ...plan(15), ...plan(16, "▶ plano v2 de ldr · 4 tickets"), ...loadout(22, 0)],
  "25a": [
    ...MOTHER,
    ...skills(MOT, LDR, W1, W2, JDG),
    ...doing(8, "tech lead · TKT-15", "table of activity of the design: the tickets neither approved nor dropped, without the count the prototype adds"),
    ...doing(12, "worker · sem ticket", "table of activity of the design: a worker without ticket is `sem ticket`, without the note the prototype adds"),
    ...plan(7),
    ...d("D2", LIMIT, [29, 31, 8, "14:47:30"]),
    ...plan(34, "▶ plano v2 de ldr · 3 tickets"),
    ...d("D1", "send.ts refuses the leader that attempted the task, not its worker, and answers worker_busy only when the recipient owns an open ticket, which no worker does here; the log has a refusal the broker can write in this state", [35, 40, 45, "✗ ldr recusado · task · unplanned_ticket"]),
    ...d("D2", "a refused keeps who tried, the kind and the error, not who the message was for", [5, 88, 30, "tentou [task]"]),
    ...panel(
      "D2",
      "Assumptions, `Detalhe de uma recusa`: the refused does not keep the hint, so the prose `o que houve` of the frame leaves and the rest comes up",
      9,
      "agrupamento", "Recusas seguidas do mesmo", "agente com o mesmo erro viram", "uma linha só; o contador sobe", "a cada nova.", "---", "Só leitura: a TUI não reenvia", "nem corrige.",
      "---", "loadout leader", "sem loadout", "", "", "", "", "", "", ""
    ),
    ...footer("D3", "Out of Scope: the log does not say that a ticket replaces another; the selected line, a refusal, has no ticket", "rework —"),
  ],
  "26a": [...skills(MOT, LDR, W1, W2, JDG), ...loadout(20, 1)],
  "26b": [...skills(MOT, LDR, W1, W2, JDG), ...loadout(24, 1)],
  "27a": [...skills(MOT, LDR, W1, W2, JDG), ...plan(4)],
  "27b": [...skills(MOT, LDR, W1, W2, JDG), ...plan(4)],
  "27c": [...skills(MOT, LDR, W1, W2, JDG), ...plan(4), ...counts(20)],
  "28a": [
    ...d("D2", "an empty log has no first event to give the hour of the band (TUI-31)", [4, 29, 56, ""]),
    ...d("D2", "an empty log has no first event to say since when the broker is up", [11, 88, 30, "broker no ar —"]),
  ],
  "28b": [
    ...skills(MOT, LDR),
    ...d("D2", "the log does not say when the broker went up: the band has the hour of its first event (TUI-31)", [6, 50, 8, "15:02:24"]),
    ...d("D1", "AD-008: who never entered is so in the whole log, not in a session of the broker", [5, 88, 30, "primeira entrada deste nome no"], [6, 88, 30, "log deste broker."]),
    ...loadout(21, 0),
  ],
  "29a": [
    ...skills(MOT, LDR, W1, JDG),
    ...doing(16, "worker · sem ticket", NO_TICKET),
    ...doing(20, "worker · sem ticket", NO_TICKET),
    ...seal("⚠ w2 bloqueado   ◌ w3 offline", "table of seals of the design: more than one seal take the short form"),
    ...counts(15),
  ],
  "02": [...nodeEscalated, ...nodeSkills("w2"), ...reworksAll(29)],
  "13b": [...nodeEscalated, ...reworksAll(28)],
  "23b": [
    ...nodeStatus(8, 32, 22, "●", "mother", "working", MOTHER[0]!.why),
    ...nodeStatus(22, 6, 20, "○", "worker-1", "idle", W1_IDLE[0]!.why),
    ...nodeSkills("w1"),
    ...reworksAll(28),
  ],
  "29b": [
    ...seal("⚠ w2 bloqueado   ◌ w3 offline", "table of seals of the design: more than one seal take the short form"),
    ...d("D1", NO_TICKET, [23, WORKER.w2, 20, "sem ticket"], [23, WORKER.w3, 20, "sem ticket"]),
    ...nodeSkills("w1"),
  ],
  "03": [
    ...d("D2", "Assumptions, `Entrada result do leader no thread`: the result of the leader at 14:44:02 has no ticket and leaves, so the ticket closes with its verdict of approve", [3, 39, 8, "14:43:50"]),
    ...d("D1", "the prototype writes two criteria of TKT-12 with more words here than in 01 and 15b; the verdicts of the log have one text for each", [5, 80, 29, "metadados da faixa"], [8, 80, 29, "funciona no iOS"]),
    ...timeline(
      "D2",
      SUMMARIES + "; the line of the loadout shows the one of the task, and no task of these logs has one (roles.json, slice Papéis); the entry of the leader at 14:44:02 leaves (Assumptions); and Q-12, a question of the ticket (TUI-46) the prototype only lists at the right, has its entry, so the lines move",
      "03",
      ...steps(
        ...STARTED,
        ["14:28:30 ● [task]     ldr → w1     rework 1/2", "rework 1/2: retry c/ backoff"],
        ["14:29:10 ? [question] w1 → ldr     Q-07 [BLOQUEANTE] · w1 → ldr → mot →…", "Q-07 retry infinito ou 5?"],
        ["14:31:34 ● [question] ldr → mot    Q-12 · ldr → mot", "Q-12 limite de reconexão?"],
        ["14:33:02 ● [answer]   hum → w1     Q-07 · 3m22s no dev", "Q-07: infinito com backoff"],
        ["14:39:52 ● [result]   w1 → jdg     11m22s", "backoff + retomada automática"],
        ["14:43:50 ✓ [verdict]  jdg → ldr    APPROVE · 5/5", "approve 5/5"]
      ),
      ""
    ),
    ...side("D3", "Out of Scope: `avaliado com` are the skills of the judge (roles.json, slice Papéis) and the cost of the thread is outside the TUI; the questions of the ticket come up", "03", 22, "perguntas no thread", "Q-07 ✓ respondida pelo dev em 3m22s", "Q-12 ▶ mesclada em Q-07", "", "", "", "", "", ""),
  ],
  "15b": [
    ...seal("⚠ TKT-12 escalado à mother", "table of seals of the design: an escalated ticket has its seal on every screen; the prototype takes it out of this frame by hand and draws it in 15a, the same state"),
    ...d("D1", "TUI-14: the ticket is `escalated` by its third verdict of rework, at 14:47:30; the prototype writes the hour of the question of the leader", [3, 40, 8, "14:47:30"]),
    ...timeline(
      "D2",
      SUMMARIES + "; and by TUI-47 the note of a task after a rework is `rework n/2` and the one of a question its id, `[BLOQUEANTE]` and its route, where the prototype writes `o último` and `ESCALADO` by hand",
      "15b",
      ...steps(...STARTED, ...REPROVED, ["14:47:55 ? [question] ldr → mot    Q-13 [BLOQUEANTE] · ldr → mot", "escalado: reprovado 3x"])
    ),
    ...flow(FLOW_ESCALATED),
    ...side(
      "D2",
      "TUI-46 gives the right side the criteria, the verdicts, the notes of the judge and the questions of the ticket: the block of the limit is prose of the scenario, the note of v1 is the one of the verdict of the log (the prototype writes it shorter here than in 03) and the cost of the thread is Out of Scope",
      "15b",
      14,
      ...NOTES, "---", "perguntas no thread", "Q-13 ? aberta · com mot", "", "", ""
    ),
  ],
  "24d": [
    ...side(
      "D2",
      "the criteria of a ticket come in its verdicts: the plan has none for a ticket without a result, so the rest comes one line up; and the cost of the thread is Out of Scope",
      "24d",
      4,
      "---", "judge", "○ sem avaliação · nada entregue", "---", "perguntas no thread", "nenhuma", "", "", "", ""
    ),
  ],
  "25b": [
    ...timeline(
      "D1",
      "design, `Anotações e fluxo do thread`: the oldest entries fold when the thread does not fit in its 30 lines, and here three do; the prototype folds seven by hand, with prose. A question has one entry, where it was asked, with its route (TUI-47), and not one for each hop; " + SUMMARIES,
      "25b",
      "           … 3 eventos antes · k rola",
      "         │",
      ...steps(
        ...REPROVED,
        ["14:47:55 ? [question] ldr → mot    Q-13 [BLOQUEANTE] · ldr → mot → dev", "escalado: reprovado 3x"],
        ["14:50:02 ● [answer]   hum → mot    Q-13 · 1m52s no dev", "Q-13: descartar, tentar de novo"],
        ["14:50:20 ● [answer]   mot → ldr    Q-13", "descartar · nova tentativa"],
        ["14:51:10 ✗ [dropped]  ldr          plano v2 · TKT-12 saiu · w1 liberado"]
      )
    ),
    ...flow(FLOW_ESCALATED),
    ...side(
      "D2",
      "TUI-46 gives the right side the criteria, the verdicts, the notes of the judge and the questions of the ticket: `desfecho` and `caminho da decisão` are prose of the scenario, with a ticket that replaces another (Out of Scope), and the cost of the thread is Out of Scope",
      "25b",
      14,
      ...NOTES, "---", "perguntas no thread", "Q-13 ✓ respondida pelo dev em 1m52s", "", "", ""
    ),
  ],
  "11": [
    ...d(
      "D3",
      "TUI-49, Out of Scope: the focus on the history is a key of the tab of questions (slice Question), and the modals of answer, of gate and of permission are screens of the slices Question and Gate; their keys do nothing here",
      ...[19, 21, 22, 23, 25, 26, 27, 28, 30, 31, 32, 33].map((line): At => [line, 62, 56, ""])
    ),
    ...d("D3", "Out of Scope: the ids `P-nn` and the line of a request answered in the terminal only exist in the modal of permission (slice Gate); the feed of this slice never draws it", [30, 29, 29, ""]),
  ],
  // The main screen of 01, frozen
  "12": [
    ...skills(MOT, LDR, W2, JDG),
    ...doing(8, "tech lead · escalou TK…", ESCALATED),
    ...entered("12"),
    ...plan(9),
    ...loadout(33, 2),
    ...d("D1", "the screen is frozen since the broker stopped answering, the 12 s of line 0 before the clock (TUI-51, `view.down`); the prototype writes the clock itself", [3, 45, 8, "14:31:55"]),
  ],
  "29c": [...skills(MOT, LDR, W2, JDG), ...doing(12, "worker · sem ticket", NO_TICKET), ...body(36, "Bash: Apagar …"), ...declared(23), ...loadout(27, 2)],
  "04": [...hops(12, 9, "w2 → ldr → dev"), ...SIX, ...Q10_HOPS, ...Q05_HOPS],
  // The modal covers the route of Q-08 in the list, and in 07 the one of the detail and the one of Q-10 in the history
  "05": [...SIX, ...Q10_HOPS, ...Q05_HOPS],
  "06": [...hops(7, 70, "w2 → ldr → dev"), ...Q08_HOPS(14), ...SIX, ...Q10_HOPS, ...Q05_HOPS],
  "07": [...Q08_HOPS(12), ...SIX, ...Q05_HOPS],
  "20a": [
    ...KEY_SEAL,
    ...block(
      "D2",
      EFFECT + "; it takes one line where the frame has two, so the box has a line less and, centered, starts a line below, where the frame has its margin over the text of the detail",
      "20a",
      9,
      18,
      [
        " ".repeat(41) + "││ A RADIO_API_KEY não está no worktree do ",
        ...modalOf("20a", 9, 25),
        " │  " + pad("efeito  worker-2 retoma o TKT-13 assim que você confirmar.", 78) + "│ ",
      ]
    ),
    ...d("D2", EFFECT + "; the detail behind the modal has it too, in its 47 columns", [18, 102, 15, "ue você"], [19, 102, 15, ""]),
    ...d(
      "D1",
      ASKED_MOTHER + "; with three the history shows the three (QST-62)",
      [26, 15, 1, "3"],
      [31, 2, 116, "14:19:05  Q-04  " + pad("ldr → mot", 34) + "A setlist vem da API da rádio ou é cadastrada no CMS? Isso muda o…"],
      [32, 12, 106, "✓ respondida por mother: API /v1/setlist, polling 30s  · rota curta, não chegou ao dev"]
    ),
  ],
  "20b": [...Q08_HOPS(14), ...d("D1", ASKED_MOTHER + "; it is one more in the count and one more below the four (QST-62)", [26, 15, 1, "8"], [35, 3, 1, "4"])],
};

// The lines the screen has to draw for the frame, and the deviations that change nothing
export function expected(id: string): { lines: string[]; dead: Deviation[] } {
  const lines = frame(id).map((line) => [...line.padEnd(120)]);
  const dead: Deviation[] = [];
  for (const dev of DEVIATIONS[id] ?? []) {
    if (len(dev.text) > dev.width) throw new Error(`${id} line ${dev.line}: "${dev.text}" does not fit ${dev.width} columns`);
    const text = [...pad(dev.text, dev.width)];
    const now = lines[dev.line]!.slice(dev.col, dev.col + dev.width);
    if (now.join("") === text.join("")) dead.push(dev);
    lines[dev.line]!.splice(dev.col, dev.width, ...text);
  }
  return { lines: lines.map((line) => line.join("").replace(/\s+$/, "")), dead };
}
