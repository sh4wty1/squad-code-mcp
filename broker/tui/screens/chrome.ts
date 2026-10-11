// What every screen has around it: line 0, the tabs and the seals of line 1, the tokens
// of line 38 and the keys of line 39. Ported from `chrome`, `stats` and `drawKeys`.

import type { SquadEvent } from "../../shared/contract.ts";
import { SQUAD, type Agent, type AgentStatus, type TicketStatus, type Totals } from "../../shared/derive.ts";
import { right, seals } from "../activity.ts";
import { cost } from "../config.ts";
import { clock, cut, len, type Color, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";

export type Keys = [key: string, does: string][];

export const MAIN_KEYS: Keys = [
  ["j/k", "mover"],
  ["tab", "painel"],
  ["enter", "abrir"],
  ["b", "bloqueante"],
  ["1-4", "telas"],
  ["g", "gate"],
  ["x", "permissão"],
  ["p", "pausa"],
  ["?", "ajuda"],
  ["q", "sair"],
];

const TABS = [
  ["1", "principal", "main"],
  ["2", "topologia", "topology"],
  ["3", "thread", "thread"],
  ["4", "perguntas", "questions"],
  ["?", "ajuda", "help"],
] as const;

const TONES: Record<string, Color> = { mother: "magenta", leader: "cyan", worker: "green", judge: "yellow" };

// The color of a name: of its role, bright white for the dev
export function tone(name: string): Color {
  if (name === "human") return "bwhite";
  return TONES[SQUAD.find((a) => a.name === name)?.role ?? ""] ?? "white";
}

export const segLen = (segs: Seg[]): number => segs.reduce((n, seg) => n + (seg && seg.length ? len(seg[0]) : 0), 0);

// The line of keys; returns the column after the last one
export function drawKeys(g: Grid, y: number, keys: Keys): number {
  g.clear(0, y, g.w, 1);
  g.bg(0, y, g.w, "black");
  let x = 1;
  for (const [key, does] of keys) {
    x = g.put(x, y, key, "bwhite", { bold: true });
    x = g.put(x + 1, y, does, "gray");
    x += 3;
  }
  return x;
}

export function chrome(g: Grid, view: View, tab: (typeof TABS)[number][2], keys: Keys) {
  const { squad, project, down } = view;
  g.bg(0, 0, 120, "black");
  let x = g.put(1, 0, "squad-tui", "bwhite", { bold: true }) + 2;

  // From the right: the clock, the broker and the questions waiting for the dev
  const now = clock(squad.now);
  const cx = 119 - len(now);
  g.put(cx, 0, now, down ? "gray" : "bwhite");
  const broker: Seg[] = down
    ? [["broker ", "gray"], ["○", "bred", true], [` desconectado · ${Math.floor((squad.now - down.since) / 1000)}s`, "bred", true]]
    : [["broker ", "gray"], ["●", "green"], [" conectado", "white"]];
  const bx = cx - 2 - segLen(broker);
  g.segs(bx, 0, broker);
  const asked = squad.questions.filter((q) => q.open && q.holder === "human");
  const blocking = asked.some((q) => q.blocking);
  const count = ` ? ${asked.length} `;
  const qx = bx - 2 - len(count);
  if (down) g.put(qx, 0, count, "gray");
  else if (blocking) g.put(qx, 0, count, "bwhite", { bg: "red", bold: true });
  else g.put(qx, 0, count, asked.length ? "byellow" : "gray", { bold: asked.length > 0 });

  // The title takes what is left
  const limit = qx - 2;
  if (project) {
    x = g.put(x, 0, project, "bwhite");
    x = g.put(x, 0, " › ", "gray");
  }
  if (squad.feature) {
    if (!project) x = g.put(x, 0, "feature ", "gray");
    const workflow = "   workflow " + squad.feature.workflow;
    x = g.put(x, 0, cut(squad.feature.title, Math.max(8, limit - x - len(workflow))), "white");
    x = g.put(x, 0, "   workflow ", "gray");
    g.put(x, 0, squad.feature.workflow, "bwhite", { bold: true });
  } else {
    g.put(x, 0, cut(squad.features.length > 0 ? "○ sem feature aberta" : "○ nenhuma feature ainda", limit - x), "gray");
  }

  x = 1;
  for (const [key, name, id] of TABS) {
    if (id === tab) x = g.put(x, 1, ` ${key} ${name} `, "bg", { bg: "white", bold: true });
    else {
      x = g.put(x, 1, " " + key, "bwhite", { bold: true });
      x = g.put(x, 1, ` ${name} `, "gray");
    }
    if (id === "questions" && asked.length) x = g.put(x - 1, 1, ` ${asked.length} `, blocking ? "bred" : "byellow", { bold: true });
    x += 1;
  }

  // The seals from the right; one that would reach the tabs is not drawn
  let rx = 119;
  for (const [text, color] of seals(squad, view.rows).reverse()) {
    rx -= len(text);
    if (rx <= 66) break;
    g.put(rx, 1, text, color, { bold: true });
    rx -= 3;
  }
  drawKeys(g, 39, keys);
}

// Line 38: the tokens of each agent, the cost and the right side
export function stats(g: Grid, view: View) {
  const { squad, ui } = view;
  const y = 38;
  const session = ui.scope === "session" || !squad.feature;
  let x = 1;
  for (const a of squad.agents) {
    const tokens = session ? a.tokens : a.featureTokens;
    x = g.put(x, y, a.short, tone(a.name), { bold: true });
    x = g.put(x + 1, y, tokens ? Math.round(tokens / 1000) + "k" : "—", tokens ? "white" : "gray");
    x += 2;
  }
  const used: Map<string, Totals> = session ? squad.usage.session : squad.usage.feature;
  const dollars = [...used.values()].reduce((sum, totals) => sum + cost(totals, view.prices), 0);
  x = g.put(x, y, `│ ${session ? "sessão" : "feature"} `, "gray");
  x = g.put(x, y, "≈$" + dollars.toFixed(2), "bwhite", { bold: true });
  g.put(x, y, " est.", "gray");

  const side: Seg[] = right(squad, view.rows, ui).map(([text, color]) => [text, color, true]);
  g.segs(119 - segLen(side), y, side);
}

// The color and the glyph of each status of an agent, and the color of each status of a ticket
export const STATUS: Record<AgentStatus, [color: Color, glyph: string]> = {
  idle: ["gray", "○"],
  working: ["bblue", "●"],
  waiting: ["white", "○"],
  blocked: ["bred", "⚠"],
  offline: ["red", "◌"],
  done: ["bgreen", "✓"],
  stalled: ["byellow", "‖"],
  never: ["gray", "·"],
};

export const TICKET_TONE: Record<TicketStatus, Color> = {
  working: "bblue",
  review: "blue",
  waiting: "white",
  blocked: "bred",
  escalated: "bred",
  done: "bgreen",
  planned: "cyan",
  dropped: "gray",
};

// `[blocked x]` with a permission request, `[waiting ?]` with a blocking question of its own
export function statusSegs(a: Agent): Seg[] {
  if (a.status === "blocked" && a.permission) return [["[blocked ", "bred", true], ["x", "bwhite", true], ["]", "bred", true]];
  if (a.status === "waiting" && a.blockingQuestion !== null) return [["[waiting ", "white"], ["?", "bred", true], ["]", "white"]];
  return [[`[${a.status === "never" ? "não lançado" : a.status}]`, STATUS[a.status][0], a.status === "blocked"]];
}

export const KIND_TONE: Record<string, Color> = {
  task: "bblue",
  result: "white",
  verdict: "byellow",
  question: "bwhite",
  answer: "blue",
  gate: "bmagenta",
  gate_decision: "bmagenta",
  permission_request: "bcyan",
  permission_decision: "cyan",
};

// The color of the kind of a message: red and green for what was refused and accepted
export function kindTone(e: SquadEvent): Color {
  if (e.kind === "verdict") return e.outcome === "rework" ? "bred" : "bgreen";
  if (e.kind === "permission_decision") return e.behavior === "deny" ? "bred" : "bgreen";
  return KIND_TONE[e.kind] ?? "white";
}

// A line of a panel: its segments, or a separator across the panel
export type Line = Seg[] | "SEP";

// Draws the lines from (x, y) down to line maxY; a separator spans the box at sx, sw wide
export function drawRows(g: Grid, x: number, y: number, maxY: number, lines: Line[], sx: number, sw: number, color: Color): number {
  for (const line of lines) {
    if (y > maxY) break;
    if (line === "SEP") g.sep(sx, y, sw, color);
    else g.segs(x, y, line);
    y++;
  }
  return y;
}
