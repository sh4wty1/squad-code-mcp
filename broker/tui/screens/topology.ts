// The topology screen: the star, with the edge of the latest message drawn thick, and the
// panel of edges at the right. Ported from `rTopo`, `node` and `edgePath` of the prototype.

import type { Agent } from "../../shared/derive.ts";
import { activity } from "../activity.ts";
import { debt, label, qid } from "../feed.ts";
import { age, clock, cut, grid, len, mmss, pad, type Color, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { chrome, drawRows, kindTone, segLen, STATUS, statusSegs, tone, type Keys, type Line } from "./chrome.ts";

const KEYS: Keys = [
  ["1-4", "telas"],
  ["tab", "próx. nó"],
  ["enter", "thread do nó"],
  ["b", "próx. bloqueante"],
  ["?", "ajuda"],
  ["q", "sair"],
];

const bright = (color: Color): Color => (color[0] === "b" && color !== "blue" && color !== "black" ? color : (("b" + color) as Color));

// The column of each worker
const WX: Record<string, number> = { w1: 16, w2: 43, w3: 70 };

// The cells of the edge between two short labels, in the direction of the message; no
// cell for a pair the star does not have
export function edgePath(from: string, to: string): [x: number, y: number, ch: string][] {
  const cells: [number, number, string][] = [];
  const v = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) cells.push([x, y, "┃"]);
  };
  const h = (x1: number, x2: number, y: number) => {
    for (let x = x1; x <= x2; x++) cells.push([x, y, "━"]);
  };
  const between = (a: string, b: string) => (from === a && to === b) || (from === b && to === a);

  if (between("mot", "hum")) cells.push([43, 6, to === "hum" ? "▲" : "▼"]);
  else if (between("mot", "ldr")) {
    v(43, 11, 12);
    cells.push([43, to === "ldr" ? 12 : 11, to === "ldr" ? "▼" : "▲"]);
  } else if (from === "ldr" && WX[to]) {
    const wx = WX[to]!;
    v(43, 17, 18);
    if (wx < 43) {
      cells.push([wx, 19, "┏"]);
      h(wx + 1, 42, 19);
      cells.push([43, 19, "┛"]);
    } else if (wx > 43) {
      cells.push([43, 19, "┗"]);
      h(44, wx - 1, 19);
      cells.push([wx, 19, "┓"]);
    } else cells.push([43, 19, "┃"]);
    cells.push([wx, 20, "▼"]);
  } else if ((WX[from] && to === "jdg") || (from === "jdg" && WX[to])) {
    const wx = (WX[from] ?? WX[to])!;
    cells.push([wx, 26, "┃"]);
    if (wx < 43) {
      cells.push([wx, 27, "┗"]);
      h(wx + 1, 42, 27);
      cells.push([43, 27, "┓"]);
    } else if (wx > 43) {
      cells.push([43, 27, "┏"]);
      h(44, wx - 1, 27);
      cells.push([wx, 27, "┛"]);
    } else cells.push([43, 27, "┃"]);
    cells.push([43, 28, "┃"]);
    if (from === "jdg") cells.push([43, 29, "┃"], [wx, 26, "▲"]);
    else cells.push([43, 29, "▼"]);
  } else if (from === "jdg" && to === "ldr") {
    h(56, 82, 31);
    cells.push([83, 31, "┛"]);
    v(83, 15, 30);
    cells.push([83, 14, "┓"]);
    h(57, 82, 14);
    cells.push([56, 14, "◀"]);
  }
  return cells;
}

// The box of an agent: the status, the activity and, for a worker, what there is to say of it
function node(g: Grid, view: View, x: number, y: number, w: number, a: Agent, extra: boolean) {
  const { squad, rows } = view;
  if (a.status === "never") {
    g.box(x, y, w, extra ? 5 : 4, "gray");
    g.put(x + 2, y + 1, "·", "gray", { bold: true });
    g.put(x + 4, y + 1, a.name, "gray");
    g.put(x + 2, y + 2, "[não lançado]", "gray");
    if (extra) g.put(x + 2, y + 3, "nunca entrou no broker", "gray");
    return;
  }
  const mine = tone(a.name);
  const alert = a.status === "blocked" || a.status === "offline" || a.status === "stalled";
  const frame: Color = alert ? STATUS[a.status][0] : a.status === "idle" ? "gray" : mine;
  g.box(x, y, w, extra ? 5 : 4, frame, undefined, undefined, { bold: a.status === "working" });

  const status = statusSegs(a);
  const tight = segLen(status) > 9;
  const asking = a.status === "waiting" && a.blockingQuestion !== null;
  g.put(x + (tight ? 1 : 2), y + 1, asking ? "?" : STATUS[a.status][1], asking ? "bred" : frame, { bold: true });
  g.put(x + (tight ? 3 : 4), y + 1, a.name, mine, { bold: true });
  g.segs(x + w - (tight ? 1 : 2) - segLen(status), y + 1, status);

  const doing = activity(a, squad, rows);
  g.put(x + 2, y + 2, cut(doing.text + (doing.rework !== null ? ` ⟳${doing.rework}/2` : ""), w - 4), "white");
  if (!extra) return;

  const ticket = squad.tickets.find((t) => t.ticket_ref === a.ticket);
  const task = rows.find((row) => row.seq === ticket?.taskSeq)?.event;
  let text = (task?.kind === "task" ? (task.loadout ?? []) : []).join(" ") || "sem loadout";
  let color: Color = "gray";
  if (a.status === "offline") [text, color] = ["◌ morta há " + age(Math.floor((squad.now - a.since!) / 1000)), "red"];
  else if (a.permission) [text, color] = [`x ${a.permission.tool_name} · ${a.permission.input_preview.split("\n")[0]}`, "bred"];
  else if (a.status === "stalled") [text, color] = ["‖ deve " + debt(a.owes!), "byellow"];
  else if (a.blockedReason !== null) [text, color] = ["⚠ " + a.blockedReason, "bred"];
  else if (a.blockingQuestion !== null) {
    const holder = squad.questions.find((q) => q.id === a.blockingQuestion)!.holder;
    [text, color] = [`? ${qid(a.blockingQuestion)} aguarda ${holder === "human" ? "o dev" : label(holder)}`, "bred"];
  }
  g.put(x + 2, y + 3, cut(text, w - 4), color);
}

export function topology(view: View): Grid {
  const { squad } = view;
  const g = grid();
  chrome(g, view, "topology", KEYS);
  g.box(0, 2, 86, 36, "bwhite", "topologia · estrela", "bwhite");
  g.box(86, 2, 34, 36, "gray", "arestas", "bwhite");

  // The edges of the star, idle
  for (const y of [6, 11, 12, 17, 18]) g.put(43, y, "│", "gray");
  g.put(16, 19, "┌" + "─".repeat(53) + "┐", "gray");
  g.put(43, 19, "┼", "gray");
  for (const x of [16, 43, 70]) g.put(x, 20, "▼", "gray");
  for (const x of [16, 43, 70]) g.put(x, 26, "│", "gray");
  g.put(16, 27, "└" + "─".repeat(53) + "┘", "gray");
  g.put(43, 27, "┼", "gray");
  g.put(43, 28, "│", "gray");
  g.put(43, 29, "▼", "gray");
  g.put(56, 31, "─".repeat(27) + "┘", "gray");
  for (let y = 15; y <= 30; y++) g.put(83, y, "│", "gray");
  g.put(56, 14, "◀" + "─".repeat(26) + "┐", "gray");

  // The questions waiting for the dev, the blocking ones first
  const asked = squad.questions.filter((q) => q.open && q.holder === "human").sort((a, b) => Number(b.blocking) - Number(a.blocking));
  const blocking = asked.some((q) => q.blocking);
  const hot: Color = blocking ? "bred" : "byellow";
  g.put(45, 6, "gate · perguntas ", "gray");
  if (asked.length) g.put(62, 6, "? " + asked.length, hot, { bold: true });
  g.put(45, 11, "task ▼  ▲ result · question", "gray");
  g.put(45, 12, "▲ escala após rework 2/2", "gray");
  g.put(45, 18, "task + loadout", "gray");
  g.put(45, 28, "result · answer", "gray");
  g.put(62, 13, "verdict", "gray");
  g.put(62, 32, "rework ⟳ · approve ✓", "gray");
  ["workers nunca se falam", "máx 2 reworks/ticket", "perguntas sobem até a", "mother, que deduplica"].forEach((text, i) => g.put(59, 8 + i, text, "gray"));

  // What waits for the dev, in his box
  const gates = squad.gates.filter((gate) => gate.pending).length;
  const waits: [string, Color] = squad.permissions.length
    ? [`x ${squad.permissions.length} permissão`, "bcyan"]
    : gates
      ? [`⚠ gate ${gates}`, "bmagenta"]
      : asked.length
        ? [`? ${asked.length} p/ responder`, hot]
        : ["via mother", "gray"];
  g.box(31, 3, 24, 3, "bwhite");
  g.put(33, 4, "dev", "bwhite", { bold: true });
  g.put(53 - len(waits[0]), 4, waits[0], waits[1], { bold: waits[1] !== "gray" });

  const [mot, ldr, w1, w2, w3, jdg] = squad.agents as [Agent, Agent, Agent, Agent, Agent, Agent];
  node(g, view, 30, 7, 26, mot, false);
  node(g, view, 30, 13, 26, ldr, false);
  node(g, view, 4, 21, 24, w1, true);
  node(g, view, 31, 21, 24, w2, true);
  node(g, view, 58, 21, 24, w3, true);
  node(g, view, 30, 30, 26, jdg, false);

  // The active edge is the pair of the latest message; without a feature it is only the last one
  const messages = view.rows.filter((row) => !row.sys);
  const last = messages.at(-1);
  const idle = !squad.feature;
  const lines: Line[] = [[[idle ? "última aresta" : "ativa agora", "gray"]]];
  if (!last) lines.push([["○ nenhuma", "gray"]]);
  else {
    const e = last.event;
    const [from, to] = [label(e.from), label(e.to ?? "")];
    const color = idle ? tone(e.from) : bright(tone(e.from));
    for (const [x, y, ch] of edgePath(from, to)) g.put(x, y, ch, color, { bold: !idle });
    const head: Seg[] = [[from, color, true], [" → ", color], [to, color, true]];
    const at = clock(last.ts);
    g.segs(2, 35, [
      [idle ? "○ última  " : "▶ ativa  ", color, true],
      ...head,
      [`  [${e.kind}]  `, color],
      [(e.ticket_ref ? e.ticket_ref + " · " : "") + cut(last.text, 30) + " · " + at, "white"],
    ]);
    lines.push([[idle ? "○ " : "▶ ", color, true], ...head, [`  [${e.kind}]`, color]]);
    lines.push([[`  ${e.ticket_ref ?? "feature"} · ${at}`, "white"]]);
  }
  g.segs(2, 36, [["━━ ", "bcyan", true], ["ativa = par da última mensagem   ", "gray"], ["── ", "gray"], ["ociosa   ", "gray"], ["▼ ◀ ", "gray"], ["direção", "gray"]]);

  lines.push([], [["últimas mensagens", "gray"]]);
  if (!last) lines.push([["nenhuma", "gray"]]);
  for (const { event: e, ts } of messages.slice(-6).reverse()) {
    lines.push([[clock(ts).slice(0, 5) + " ", "gray"], [pad(label(e.from), 3), tone(e.from)], [" → ", "gray"], [pad(label(e.to ?? ""), 4), tone(e.to ?? "")], [cut(`[${e.kind}]`, 14), kindTone(e)]]);
  }

  lines.push("SEP", [["perguntas abertas · ", "gray"], [String(asked.length), blocking ? "bred" : "white", true]]);
  if (!asked.length) lines.push([["nenhuma", "gray"]]);
  for (const q of asked) {
    const left = Math.max(0, Math.floor(((q.deadline ?? squad.now) - squad.now) / 1000));
    lines.push([[qid(q.id) + " ", "bwhite", true], [pad(label(q.asked_by), 3), tone(q.asked_by)], [` ${q.ticket_ref ?? "—"} `, "white"], q.blocking ? ["[BLOQ]", "bred", true] : [mmss(left), "byellow"]]);
  }

  // The five edges with most messages, the first to appear first among equals
  lines.push("SEP", [["volume por aresta", "gray"]]);
  const volume = new Map<string, { from: string; to: string; n: number }>();
  for (const { event: e } of messages) {
    const key = e.from + ">" + e.to;
    volume.set(key, { from: e.from, to: e.to ?? "", n: (volume.get(key)?.n ?? 0) + 1 });
  }
  for (const { from, to, n } of [...volume.values()].sort((a, b) => b.n - a.n).slice(0, 5)) {
    lines.push([[pad(label(from), 3), tone(from)], [" → ", "gray"], [pad(label(to), 4), tone(to)], [String(n).padStart(2, " ") + " ", "bwhite", true], ["━".repeat(Math.min(14, n * 2)), tone(from)]]);
  }

  lines.push("SEP", [["reworks", "gray"]]);
  if (!squad.tickets.length) lines.push([[squad.feature ? "nenhum ticket ainda" : "sem feature aberta", "gray"]]);
  for (const t of squad.tickets) {
    const owner = t.dropped ? null : t.owner;
    lines.push([[t.ticket_ref + " ", "bwhite"], [`⟳ ${Math.min(t.reworks, 2)}/2`, t.reworks >= 2 ? "bred" : t.reworks ? "byellow" : "gray"], ["  " + (owner ?? "—"), owner ? "green" : "gray"]]);
  }
  drawRows(g, 88, 3, 36, lines, 86, 34, "gray");
  return g;
}
