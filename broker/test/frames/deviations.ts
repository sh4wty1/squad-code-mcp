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

export const DEVIATIONS: Record<string, Deviation[]> = {
  "01": [...skills(MOT, LDR, W2, JDG), ...doing(8, "tech lead · escalou TK…", ESCALATED)],
  "10": [...skills(MOT, LDR, W1, JDG), ...LEADER_WORKING],
  "13a": [...skills(MOT, LDR, JDG), ...doing(8, "tech lead · escalou TK…", ESCALATED)],
  "14": [
    ...MOTHER,
    ...W2_IDLE,
    ...skills(MOT, LDR, W2, JDG),
    ...doing(8, "tech lead · TKT-12/13", "table of activity of the design: the leader shows every ticket neither approved nor dropped, and TKT-12 is one"),
  ],
  "23a": [
    ...MOTHER,
    ...W1_IDLE,
    ...skills(MOT, W1, JDG),
    ...d("D1", "the prototype counts the reworks of a ticket it calls `TKT-12 aguarda ldr` and finds none; TKT-12 has one verdict of rework, as the panel of tickets shows", [12, 23, 4, "⟳1/2"]),
  ],
  "24a": [...MOTHER, ...skills(MOT, LDR, W1, W2, JDG)],
  "24c": [...MOTHER, ...skills(MOT, LDR, W1, W2, JDG)],
  "25a": [
    ...MOTHER,
    ...skills(MOT, LDR, W1, W2, JDG),
    ...doing(8, "tech lead · TKT-15", "table of activity of the design: the tickets neither approved nor dropped, without the count the prototype adds"),
    ...doing(12, "worker · sem ticket", "table of activity of the design: a worker without ticket is `sem ticket`, without the note the prototype adds"),
  ],
  "26a": skills(MOT, LDR, W1, W2, JDG),
  "28b": skills(MOT, LDR),
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
