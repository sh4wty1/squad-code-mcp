import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { main } from "../../tui/screens/main.ts";
import { expected } from "../frames/deviations.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

const lines = (frame: string, change?: Change) => main(frameView(frame, change)).text();
// Columns `from` to `to` of a line, without the spaces at the right
const part = (line: string, from: number, to: number) => [...line.padEnd(120)].slice(from, to + 1).join("").trimEnd();
// The third line of the agent at position `i` of the squad
const third = (frame: string, i: number, change?: Change) => part(lines(frame, change)[5 + i * 4]!, 4, 26);

// The columns of the frame, with its declared deviations, against what the screen draws
function columns(frame: string, from: number, to: number) {
  const drawn = lines(frame);
  const want = expected(frame).lines;
  const rows = Array.from({ length: 36 }, (_, i) => i + 2);
  expect(rows.map((y) => `${y} ${part(drawn[y]!, from, to)}`)).toEqual(rows.map((y) => `${y} ${part(want[y]!, from, to)}`));
}

test("TUI-35: the third line of an agent is the first thing there is to say of it", () => {
  expect(third("28a", 0)).toBe("sem sessão no broker");
  expect(third("13a", 3)).toBe("◌ sessão morta há 2m10s");
  // The tool and the first line of the input, cut to the panel as in frame 14
  expect(third("14", 2)).toBe("x Bash · bun test src/…");
  expect(third("23a", 3)).toBe("‖ deve result TKT-13");
  expect(third("10", 3)).toBe("⚠ RADIO_API_KEY ausente");
  expect(third("01", 2)).toBe("? Q-07 bloqueante · dev");
  // The holder is the mother: the question of the leader did not reach the dev
  expect(third("15a", 1)).toBe("? Q-13 bloqueante · mot");
  expect(third("23a", 1)).toBe("sem reação há 3m10s");
  const loadout: Change = (events) => events.map((e) => (e.seq === 406 ? { ...e, loadout: ["tlc-implement", "ponytail", "react-best-practices"] } : e));
  expect(third("24b", 2, loadout)).toBe("tlc-implement ponytail…");
  expect(third("24b", 2)).toBe("sem loadout");
});

test("TUI-35: the status with its glyph, the role and the activity with the reworks and the time left", () => {
  const drawn = lines("01");
  expect(part(drawn[11]!, 2, 26)).toBe("? worker-1    [waiting ?]");
  expect(part(drawn[12]!, 4, 26)).toBe("worker · TKT-12 ⟳1/2");
  expect(part(drawn[15]!, 2, 26)).toBe("○ worker-2      [waiting]");
  expect(part(drawn[16]!, 4, 26)).toBe("worker · TKT-13… ? 3:08");
  expect(part(lines("14")[11]!, 2, 26)).toBe("⚠ worker-1    [blocked x]");
  expect(part(lines("28b")[11]!, 2, 26)).toBe("· worker-1  [não lançado]");
});

test("TUI-35: an open permission takes precedence over a declared block on the third line", () => {
  const view = frameView("14", (events) => {
    const request = events.find((e) => e.kind === "permission_request")!;
    const block: SquadEvent = { ...request, kind: "blocked", seq: request.seq - 0.1, ts: request.ts - 1000,
      to: null, reason: "missing credential", detail: "credential unavailable", last_action: "read configuration" };
    return [...events.filter((e) => e.seq < request.seq), block, request];
  });
  const agent = view.squad.agents.find((a) => a.name === "worker-1")!;
  expect(agent.status).toBe("blocked");
  expect(agent.blockedReason).toBe("missing credential");
  expect(agent.permission?.tool_name).toBe("Bash");
  expect(part(main(view).text()[13]!, 4, 26)).toBe("x Bash · bun test src/…");
});

test("TUI-36: the title counts who is in the broker when someone never entered", () => {
  expect(part(lines("01")[2]!, 0, 27)).toBe("┌─ agentes · 6 ────────────┐");
  expect(part(lines("28b")[2]!, 0, 27)).toBe("┌─ agentes · 2/6 no ar ────┐");
});

test("TUI-37: up to three tickets take two lines each, with the note of each", () => {
  const tickets = (frame: string) => lines(frame).slice(29, 37).map((line) => part(line, 0, 27));
  expect(tickets("01")).toEqual([
    "├─ tickets ────────────────┤",
    "│ TKT-12 player de áudio w1│",
    "│ ⟳1/2 [waiting] ? dev     │",
    "│ TKT-13 API da setlist  w2│",
    "│ ⟳0/2 [review]            │",
    "│ TKT-14 data na setlist w3│",
    "│ ⟳0/2 [done]              │",
    "│                          │",
  ]);
  // The version of the plan while a ticket of it is planned, and what a planned one depends on
  expect(tickets("24a").slice(0, 5)).toEqual([
    "├─ tickets · plano v1 ─────┤",
    "│ TKT-12 player de áudio  —│",
    "│ ⟳0/2 [planned]           │",
    "│ TKT-13 API da setlist   —│",
    "│ ⟳0/2 [planned] dep TKT-12│",
  ]);
  expect(tickets("13a")[4]).toBe("│ ⟳0/2 [working] ◌ parado  │");
  expect(tickets("23a")[4]).toBe("│ ⟳0/2 [working] ‖ parado  │");
  // Three reworks show as the two the ticket takes
  expect(tickets("15a")[2]).toBe("│ ⟳2/2 [escalated] → mot   │");
});

test("TUI-37: from four to seven tickets take one line each", () => {
  expect(lines("25a").slice(29, 35).map((line) => part(line, 0, 27))).toEqual([
    "├─ tickets · plano v2 ─────┤",
    "│ TKT-12 ⟳2/2 [dropped]   —│",
    "│ TKT-13 ⟳0/2 [done]     w2│",
    "│ TKT-14 ⟳0/2 [done]     w3│",
    "│ TKT-15 ⟳0/2 [planned]   —│",
    "│                          │",
  ]);
});

test("TUI-37: more than seven tickets are six lines and the count of the others", () => {
  const plan = (n: number): Change => (events) =>
    events.map((e) => (e.kind === "plan" ? { ...e, tickets: Array.from({ length: n }, (_, i) => ({ ticket_ref: `TKT-${i + 1}`, title: "t" })) } : e));
  const seven = lines("24a", plan(7)).slice(30, 37).map((line) => part(line, 2, 26));
  expect(seven[6]).toBe("TKT-7  ⟳0/2 [planned]   —");
  const nine = lines("24a", plan(9)).slice(30, 37).map((line) => part(line, 2, 26));
  expect(nine).toEqual([
    "TKT-1  ⟳0/2 [planned]   —",
    "TKT-2  ⟳0/2 [planned]   —",
    "TKT-3  ⟳0/2 [planned]   —",
    "TKT-4  ⟳0/2 [planned]   —",
    "TKT-5  ⟳0/2 [planned]   —",
    "TKT-6  ⟳0/2 [planned]   —",
    "+3 tickets",
  ]);
});

test("TUI-38: the panel without tickets says why, with and without a feature", () => {
  const empty = (frame: string) => lines(frame).slice(31, 34).map((line) => part(line, 2, 26));
  expect(empty("26a")).toEqual(["○ nenhum ticket ainda", "  o leader publica o", "  plano ao receber a spec"]);
  expect(empty("09a")).toEqual(["○ sem feature aberta", "  os da última feature", "  ficam no resumo →"]);
  expect(empty("28a")).toEqual(["○ sem feature aberta", "  aparecem com o plano", "  da primeira feature"]);
});

test("TUI-37: exactly eight tickets show six rows and two more", () => {
  const drawn = lines("24a", (events) => events.map((e) => e.kind === "plan"
    ? { ...e, tickets: Array.from({ length: 8 }, (_, i) => ({ ticket_ref: `TKT-${i + 1}`, title: "t" })) } : e));
  expect(drawn.slice(30, 37).map((line) => part(line, 2, 26))).toEqual([
    "TKT-1  ⟳0/2 [planned]   —", "TKT-2  ⟳0/2 [planned]   —", "TKT-3  ⟳0/2 [planned]   —",
    "TKT-4  ⟳0/2 [planned]   —", "TKT-5  ⟳0/2 [planned]   —", "TKT-6  ⟳0/2 [planned]   —", "+2 tickets",
  ]);
});

for (const frame of ["01", "10", "13a", "14", "23a", "24a", "24c", "25a", "26a", "28a", "28b"]) {
  test(`TUI-43: the agents and the tickets of frame ${frame}, columns 0 to 27`, () => columns(frame, 0, 27));
}

// The cell where `text` starts in the first line of the screen that has it
function cell(view: ReturnType<typeof frameView>, text: string) {
  const g = main(view);
  const y = g.text().findIndex((line) => line.includes(text));
  return g.rows[y]![[...g.text()[y]!].join("").indexOf(text)]!;
}
const more = (...fields: Record<string, unknown>[]): Change => (events) => [
  ...events,
  ...fields.map((f, i) => ({ ...events.at(-1)!, seq: 900 + i, to: null, ticket_ref: null, summary: "", ...f }) as SquadEvent),
];

test("TUI-20: a message is the hour, who sent it, who it is for, the kind and the summary cut at column 84", () => {
  const stranger = more({ kind: "task", from: "reviewer-9", role_from: "reviewer", to: "human", summary: "a summary long enough to be cut at the edge" });
  const drawn = lines("24a", stranger);
  expect(part(drawn[16]!, 29, 84)).toBe("  14:19:51 rev → hum [task]          a summary long eno…");
  expect(part(lines("01")[21]!, 29, 84)).toBe("▶ 14:28:03 jdg → ldr [verdict]       rework: reconexão …");
});

test("TUI-28: the color of the kind of an answer, a gate, a verdict and a permission decision", () => {
  expect(cell(frameView("01"), "[answer]").fg).toBe("blue");
  expect(cell(frameView("19a"), "[gate]").fg).toBe("bmagenta");
  expect(cell(frameView("18a"), "[gate_decision]").fg).toBe("bmagenta");
  expect(cell(frameView("01"), "[verdict]       rework").fg).toBe("bred");
  expect(cell(frameView("01"), "[verdict]       approve").fg).toBe("bgreen");
  expect(cell(frameView("22h"), "[permission_decision]").fg).toBe("bgreen");
  const denied: Change = (events) => events.map((e) => (e.kind === "permission_decision" ? { ...e, behavior: "deny" } : e));
  expect(cell(frameView("22h", denied), "[permission_decision]").fg).toBe("bred");
  // A system line has the color of what it tells
  expect(cell(frameView("01"), "⟳ Q-05 timeout")).toEqual({ ch: "⟳", fg: "byellow", bg: null, bold: false });
  expect(cell(frameView("10"), "⚠ w2 [blocked]")).toEqual({ ch: "⚠", fg: "bred", bg: "black", bold: true });
});

test("TUI-29: what came before the open feature is gray, above a ruler that says what it was", () => {
  const second = frameView("26b");
  expect(lines("26b").some((line) => part(line, 29, 84) === "─ ▲ anterior · player ao vivo com setlist · ✓ entregue ─")).toBe(true);
  expect(cell(second, "✓ feature encerrada").fg).toBe("gray");
  expect(cell(second, "[verdict]").fg).toBe("gray");
  expect(cell(second, "▶ feature aberta · busca").fg).toBe("bmagenta");
  const reopened: Change = (events) => [...events, { ...events.find((e) => e.kind === "feature_opened")!, seq: 900, feature_id: 2, title: "busca" }];
  expect(lines("27a", reopened).some((line) => part(line, 29, 84) === " ▲ anterior · player ao vivo com setlist · ✗ abandonada")).toBe(true);
  expect(part(lines("26a")[10]!, 29, 84)).toBe("─────── ▲ antes da feature · entradas no broker ────────");
  expect(cell(frameView("26a"), "● mot entrou").fg).toBe("gray");
});

test("TUI-30: without an open feature, the band under the closing line says since when", () => {
  expect(part(lines("09a")[36]!, 29, 84)).toBe("─── squad ocioso desde 14:53:31 · sem feature ativa ────");
  expect(part(lines("29a")[36]!, 29, 84)).toBe("─ squad sem feature desde 14:53:31 · 2 fora de [idle] ──");
  // Gray before the closing line; that line and the ones after keep their color
  const after = frameView("29c");
  after.ui.selected = null;
  expect(cell(after, "[verdict]").fg).toBe("gray");
  expect(cell(after, "✓ feature encerrada")).toEqual({ ch: "✓", fg: "bgreen", bg: null, bold: true });
  // worker-1, blocked by its permission request, is the one out of idle
  expect(part(main(after).text()[35]!, 29, 84)).toBe("─ squad sem feature desde 14:53:31 · 1 fora de [idle] ──");
  expect(cell(after, "[permission_request]").fg).toBe("bcyan");
  expect(cell(frameView("27a"), "✗ feature encerrada").fg).toBe("byellow");
});

test("TUI-31: without any feature the band has the hour of the first event, and an empty log says so", () => {
  expect(part(lines("28b")[6]!, 29, 84)).toBe("─ broker no ar desde 15:02:24 · nenhuma feature ainda ──");
  const empty = lines("28a");
  expect(part(empty[6]!, 29, 84)).toBe("  ○ log vazio");
  expect(part(empty[7]!, 29, 84)).toBe("  o feed começa quando o primeiro agente entrar");
});

test("TUI-32: the feed shows its last 33 lines, or goes up to keep the selected one in sight", () => {
  const view = frameView("09a");
  const last = main(view).text();
  expect(part(last[4]!, 29, 84)).toBe("  14:20:13 ldr → w3  [task]          formato de data da…");
  expect(part(last[36]!, 29, 84)).toBe("─── squad ocioso desde 14:53:31 · sem feature ativa ────");
  view.ui.selected = 401;
  const up = main(view).text();
  expect(part(up[4]!, 29, 84)).toBe("▶ 14:17:48 ▶ feature aberta · player ao vivo com setlist");
  // The 32 lines of the feature until the answer of worker-2, and the one after
  expect(part(up[36]!, 29, 84)).toBe("  14:33:02 hum → w1  [answer]        Q-07: infinito com…");
});

test("TUI-29, TUI-30: the title of the feed says live, idle or paused", () => {
  const title = (view: ReturnType<typeof frameView>) => part(main(view).text()[2]!, 28, 85);
  expect(title(frameView("01"))).toBe("┌─ feed · player ao vivo com setlist ──────── ● ao vivo ─┐");
  expect(title(frameView("09a"))).toBe("┌─ feed · sem feature aberta ───────────────── ○ ocioso ─┐");
  expect(title(frameView("28a"))).toBe("┌─ feed · sem feature aberta ──────────────── ● ao vivo ─┐");
  const paused = frameView("01");
  paused.ui.paused = true;
  expect(title(paused)).toBe("┌─ feed · player ao vivo com setlist ──────── ○ pausado ─┐");
});

for (const frame of ["01", "09a", "26b", "27a", "28a", "29a", "29c"]) {
  test(`TUI-43: the feed of frame ${frame}, columns 28 to 85`, () => columns(frame, 28, 85));
}
