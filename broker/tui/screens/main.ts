// The main screen: the agents and the tickets at the left, the feed in the middle and the
// detail of the selected line at the right. Ported from `rMain` of the prototype.

import type { Agent } from "../../shared/derive.ts";
import { activity, refs } from "../activity.ts";
import { debt, qid } from "../feed.ts";
import { age, cut, grid, len, mmss, type Color, type Grid } from "../grid.ts";
import type { View } from "../view.ts";
import { chrome, MAIN_KEYS, segLen, stats, STATUS, statusSegs, TICKET_TONE, tone } from "./chrome.ts";

const ROLES = { mother: "objetivo", leader: "tech lead", worker: "worker", judge: "judge" };

const seconds = (view: View, since: number) => Math.floor((view.squad.now - since) / 1000);

// Three lines per agent: the status, the role with the activity, and the first thing to say of it
function agents(g: Grid, view: View, frame: Color) {
  const { squad, rows } = view;
  const here = squad.agents.filter((a) => a.status !== "never").length;
  g.box(0, 2, 28, 36, frame, "agentes · " + (here < 6 ? here + "/6 no ar" : "6"), "bwhite");

  squad.agents.forEach((a: Agent, i) => {
    const y = 3 + i * 4;
    const asking = a.status === "waiting" && a.blockingQuestion !== null;
    const quiet = a.status === "idle" || a.status === "offline" || a.status === "never";
    const alert = a.status === "blocked" || a.status === "offline" || a.status === "stalled";
    const glyph: Color = alert ? STATUS[a.status][0] : asking ? "bred" : quiet ? "gray" : tone(a.name);
    g.put(2, y, asking ? "?" : STATUS[a.status][1], glyph, { bold: true });
    g.put(4, y, a.name, a.status === "never" ? "gray" : quiet ? "white" : tone(a.name), { bold: !quiet });
    const status = statusSegs(a);
    g.segs(27 - segLen(status), y, status);

    let x = g.put(4, y + 1, ROLES[a.role], "gray");
    x = g.put(x, y + 1, " · ", "gray");
    const doing = activity(a, squad, rows);
    const rework = doing.rework !== null ? `⟳${doing.rework}/2` : null;
    const left = doing.left !== null ? "? " + mmss(doing.left) : null;
    x = g.put(x, y + 1, cut(doing.text, 27 - x - (rework ? len(rework) + 1 : 0) - (left ? len(left) + 1 : 0)), "white");
    if (rework) x = g.put(x + 1, y + 1, rework, doing.rework! >= 2 ? "bred" : "byellow");
    if (left) g.put(x + 1, y + 1, left, "byellow");

    const ticket = squad.tickets.find((t) => t.ticket_ref === a.ticket);
    const task = rows.find((row) => row.seq === ticket?.taskSeq)?.event;
    const loadout = task?.kind === "task" ? (task.loadout ?? []) : [];
    if (a.status === "never") g.put(4, y + 2, "sem sessão no broker", "gray");
    else if (a.status === "offline") g.put(4, y + 2, cut("◌ sessão morta há " + age(seconds(view, a.since!)), 23), "red");
    else if (a.permission) {
      g.segs(4, y + 2, [["x", "bwhite", true], [" " + cut(`${a.permission.tool_name} · ${a.permission.input_preview.split("\n")[0]}`, 21), "bred"]]);
    } else if (a.status === "stalled") g.put(4, y + 2, cut("‖ deve " + debt(a.owes!), 23), "byellow", { bold: true });
    else if (a.blockedReason !== null) g.put(4, y + 2, cut("⚠ " + a.blockedReason, 23), "bred", { bold: true });
    else if (a.blockingQuestion !== null) g.put(4, y + 2, cut(`? ${qid(a.blockingQuestion)} bloqueante · dev`, 23), "bred");
    else if (a.noReactionSince !== null) g.put(4, y + 2, "sem reação há " + age(seconds(view, a.noReactionSince)), "byellow");
    else g.put(4, y + 2, loadout.length ? cut(loadout.join(" "), 23) : "sem loadout", "gray");
  });
}

// Two lines per ticket up to three tickets, one line from four to seven, and a count of the rest
function tickets(g: Grid, view: View, frame: Color) {
  const { squad } = view;
  const all = squad.tickets;
  g.sep(0, 29, 28, frame);
  g.put(2, 29, ` tickets${all.some((t) => t.status === "planned") ? " · plano v" + squad.planVersion : ""} `, "gray");

  if (all.length === 0) {
    const empty: [string, Color][] = squad.feature
      ? [["○ nenhum ticket ainda", "gray"], ["o leader publica o", "white"], ["plano ao receber a spec", "white"]]
      : squad.features.length > 0
        ? [["○ sem feature aberta", "gray"], ["os da última feature", "white"], ["ficam no resumo →", "white"]]
        : [["○ sem feature aberta", "gray"], ["aparecem com o plano", "white"], ["da primeira feature", "white"]];
    empty.forEach(([text, color], i) => g.put(i ? 4 : 2, 31 + i, cut(text, i ? 23 : 25), color));
  }

  const compact = all.length > 3;
  const shown = all.length > 7 ? all.slice(0, 6) : all;
  let y = 30;
  for (const t of shown) {
    const n = t.reworks;
    const reworks: Color = t.dropped ? "gray" : n >= 2 ? "bred" : n ? "byellow" : "gray";
    const strong = t.status === "escalated" || t.status === "blocked";
    // A dropped ticket frees who had it
    const owner = squad.agents.find((a) => a.name === t.owner && !t.dropped);
    const short = owner?.short ?? "—";
    g.put(2, y, t.ticket_ref, t.dropped ? "gray" : "bwhite", { bold: !t.dropped });
    if (compact) {
      g.put(9, y, `⟳${Math.min(n, 2)}/2`, reworks);
      g.put(14, y, `[${t.status}]`, TICKET_TONE[t.status], { bold: strong });
      g.put(27 - len(short), y, short, owner ? "green" : "gray");
      y++;
      continue;
    }
    g.put(9, y, cut(t.title, 15), "gray");
    g.put(27 - len(short), y, short, owner ? "green" : "gray");
    let x = g.put(2, y + 1, `⟳${Math.min(n, 2)}/2`, reworks, { bold: n >= 2 && !t.dropped });
    x = g.put(x + 1, y + 1, `[${t.status}]`, TICKET_TONE[t.status], { bold: strong });
    const going = t.status !== "planned" && t.status !== "done" && t.status !== "dropped";
    const note: [string, Color] | null =
      t.status === "planned" && t.depends_on.length > 0
        ? ["dep " + refs(t.depends_on), "gray"]
        : going && owner?.status === "offline"
          ? ["◌ parado", "red"]
          : going && owner?.status === "stalled"
            ? ["‖ parado", "byellow"]
            : t.status === "escalated"
              ? ["→ mot", "bred"]
              : t.status === "waiting"
                ? ["? dev", "bred"]
                : null;
    if (note) g.put(x + 1, y + 1, cut(note[0], 27 - x - 1), note[1], { bold: note[1] !== "gray" });
    y += 2;
  }
  if (all.length > 7) g.put(2, 36, `+${all.length - 6} tickets`, "gray");
}

export function main(view: View): Grid {
  const g = grid();
  const frame = (panel: number): Color => (view.ui.focus === panel ? "bwhite" : "gray");
  chrome(g, view, "main", MAIN_KEYS);
  agents(g, view, frame(0));
  tickets(g, view, frame(0));
  stats(g, view);
  return g;
}
