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

export const DEVIATIONS: Record<string, Deviation[]> = {
  "01": [...skills(MOT, LDR, W2, JDG), ...doing(8, "tech lead · escalou TK…", ESCALATED), ...entered("01"), ...plan(9), ...loadout(33, 2)],
  "09a": [...skills(MOT, LDR, W1, W2, JDG), ...counts(15)],
  "09b": [...skills(MOT, LDR, W1, W2, JDG), ...counts(16)],
  "10": [
    ...skills(MOT, LDR, W1, JDG),
    ...LEADER_WORKING,
    ...entered("10"),
    ...plan(15),
    ...seal("⚠ w2 bloqueado · RADIO_API_KEY ausente", "table of seals of the design: the long form of a block has its reason, not the question the prototype writes by hand"),
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
  "29c": [...skills(MOT, LDR, W2, JDG), ...doing(12, "worker · sem ticket", NO_TICKET), ...body(36, "Bash: Apagar …"), ...declared(23), ...loadout(27, 2)],
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
