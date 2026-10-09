import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { topology } from "../../tui/screens/topology.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

const draw = (frame: string, change?: Change) => topology(frameView(frame, change));
// Columns `from` to `to` of a line, without the spaces at the right
const part = (line: string, from: number, to: number) => [...line.padEnd(120)].slice(from, to + 1).join("").trimEnd();
// The text of the panel of edges, lines `from` to `to`
const edges = (frame: string, from: number, to: number, change?: Change) =>
  draw(frame, change).text().slice(from, to + 1).map((line) => part(line, 88, 117));

// One more message, the latest of the log, between two names
const say =
  (from: string, to: string): Change =>
  (events) => [...events, { ...events.find((e) => e.seq === 406)!, seq: 9000, from, to }];

const THICK = ["┃", "━", "┏", "┓", "┗", "┛"];

test("TUI-44: the edge of the pair of the latest message takes the path of the prototype, bright and bold", () => {
  const pairs: [from: string, to: string, color: string, cells: [x: number, y: number, ch: string][]][] = [
    ["mother", "human", "bmagenta", [[43, 6, "▲"]]],
    ["human", "mother", "bwhite", [[43, 6, "▼"]]],
    ["mother", "leader", "bmagenta", [[43, 11, "┃"], [43, 12, "▼"]]],
    ["leader", "mother", "bcyan", [[43, 11, "▲"], [43, 12, "┃"]]],
    ["leader", "worker-1", "bcyan", [[43, 17, "┃"], [43, 18, "┃"], [43, 19, "┛"], [30, 19, "━"], [16, 19, "┏"], [16, 20, "▼"]]],
    ["leader", "worker-2", "bcyan", [[43, 17, "┃"], [43, 19, "┃"], [43, 20, "▼"]]],
    ["leader", "worker-3", "bcyan", [[43, 19, "┗"], [56, 19, "━"], [70, 19, "┓"], [70, 20, "▼"]]],
    ["worker-1", "judge", "bgreen", [[16, 26, "┃"], [16, 27, "┗"], [30, 27, "━"], [43, 27, "┓"], [43, 28, "┃"], [43, 29, "▼"]]],
    ["worker-2", "judge", "bgreen", [[43, 26, "┃"], [43, 27, "┃"], [43, 28, "┃"], [43, 29, "▼"]]],
    ["worker-3", "judge", "bgreen", [[70, 26, "┃"], [70, 27, "┛"], [56, 27, "━"], [43, 27, "┏"], [43, 29, "▼"]]],
    ["judge", "worker-1", "byellow", [[16, 26, "▲"], [16, 27, "┗"], [43, 29, "┃"]]],
    ["judge", "worker-2", "byellow", [[43, 26, "▲"], [43, 29, "┃"]]],
    ["judge", "worker-3", "byellow", [[70, 26, "▲"], [70, 27, "┛"], [43, 29, "┃"]]],
    ["judge", "leader", "byellow", [[56, 14, "◀"], [70, 14, "━"], [83, 14, "┓"], [83, 20, "┃"], [83, 31, "┛"], [70, 31, "━"]]],
  ];
  for (const [from, to, color, cells] of pairs) {
    const g = draw("02", say(from, to));
    const drawn = cells.map(([x, y]) => [x, y, g.rows[y]![x]!.ch, g.rows[y]![x]!.fg, g.rows[y]![x]!.bold]);
    expect([from, to, drawn]).toEqual([from, to, cells.map(([x, y, ch]) => [x, y, ch, color, true])]);
  }
});

test("TUI-44: the edges of the star are gray, and a pair the star does not have draws no thick edge", () => {
  const g = draw("02", say("human", "worker-1"));
  const star = g.rows.slice(3, 35).flatMap((row) => row.slice(1, 85));
  expect(star.filter((cell) => THICK.includes(cell.ch))).toEqual([]);
  const idle: [number, number, string][] = [[43, 6, "│"], [43, 11, "│"], [43, 17, "│"], [16, 19, "┌"], [43, 19, "┼"], [70, 20, "▼"], [16, 27, "└"], [43, 29, "▼"], [83, 20, "│"], [56, 14, "◀"]];
  expect(idle.map(([x, y]) => [x, y, g.rows[y]![x]!.ch, g.rows[y]![x]!.fg, g.rows[y]![x]!.bold])).toEqual(idle.map(([x, y, ch]) => [x, y, ch, "gray", false]));
});

test("TUI-44: with an open feature the edge is labelled as active, with the message that made it", () => {
  expect(part(draw("02").text()[35]!, 2, 83)).toBe("▶ ativa  w2 → jdg  [answer]  TKT-13 · Q-11: sim, via ETag · 14:31:48");
});

test("TUI-44: without an open feature the edge keeps the normal color, is not bold and is labelled as the last one", () => {
  const g = draw("29b");
  // The result of the leader to the mother
  expect([11, 12].map((y) => [g.rows[y]![43]!.ch, g.rows[y]![43]!.fg, g.rows[y]![43]!.bold])).toEqual([["▲", "cyan", false], ["┃", "cyan", false]]);
  expect(part(g.text()[35]!, 2, 83)).toBe("○ última  ldr → mot  [result]  3/3 tickets aprovados · 14:45:41");
  expect(g.rows[35]![2]!.fg).toBe("cyan");
});

test("TUI-44: the node of the dev says what waits for him, and each node the glyph, the name, the status and the activity", () => {
  const offline = draw("13b").text();
  expect(part(offline[4]!, 33, 52)).toBe("dev ? 1 p/ responder");
  expect(part(offline[8]!, 32, 53)).toBe("○ mother     [waiting]");
  expect(part(offline[9]!, 32, 53)).toBe("Q-07 → dev");
  // A status of more than nine columns takes the space around the glyph
  expect([22, 23, 24].map((y) => part(offline[y]!, 4, 27))).toEqual(["│? worker-1 [waiting ?]│", "│ TKT-12 ⟳1/2          │", "│ ? Q-07 aguarda o dev │"]);
  expect([22, 23, 24].map((y) => part(offline[y]!, 33, 52))).toEqual(["◌ worker-2 [offline]", "TKT-13 parado", "◌ morta há 2m10s"]);
  expect(part(offline[31]!, 32, 53)).toBe("○ judge         [idle]");

  expect(part(draw("23b").text()[4]!, 33, 52)).toBe("dev       via mother");
  expect(part(draw("23b").text()[24]!, 33, 52)).toBe("‖ deve result TKT-13");
  expect(part(draw("29b").text()[24]!, 33, 52)).toBe("⚠ RADIO_API_KEY aus…");
  expect(part(draw("14").text()[4]!, 33, 52)).toBe("dev    x 1 permissão");
  expect(part(draw("14").text()[24]!, 6, 25)).toBe("x Bash · bun test s…");
  expect(part(draw("19a").text()[4]!, 33, 52)).toBe("dev         ⚠ gate 2");

  const never = draw("28c").text();
  // As in frame 28c, the third line runs over the edge of the box
  expect([part(never[22]!, 6, 25), part(never[23]!, 6, 25), part(never[24]!, 6, 27)]).toEqual(["· worker-1", "[não lançado]", "nunca entrou no broker"]);
});

test("TUI-45: the panel of edges has the active edge, the last six messages, the questions with the dev, the volume and the reworks", () => {
  expect(edges("02", 3, 29)).toEqual([
    "ativa agora",
    "▶ w2 → jdg  [answer]",
    "  TKT-13 · 14:31:48",
    "",
    "últimas mensagens",
    "14:31 w2  → jdg [answer]",
    "14:31 ldr → mot [question]",
    "14:31 jdg → w2  [question]",
    "14:31 mot → hum [question]",
    "14:31 w2  → ldr [question]",
    "14:30 w2  → jdg [result]",
    "──────────────────────────────",
    "perguntas abertas · 2",
    "Q-07 w1  TKT-12 [BLOQ]",
    "Q-08 w2  TKT-13 3:08",
    "──────────────────────────────",
    "volume por aresta",
    "mot → hum  5 ━━━━━━━━━━",
    "ldr → mot  3 ━━━━━━",
    "w2  → ldr  3 ━━━━━━",
    "mot → ldr  2 ━━━━",
    "ldr → w1   2 ━━━━",
    "──────────────────────────────",
    "reworks",
    "TKT-12 ⟳ 1/2  worker-1",
    "TKT-13 ⟳ 0/2  worker-2",
    "TKT-14 ⟳ 0/2  worker-3",
  ]);
});

test("TUI-45: each part of the panel says so when it has nothing", () => {
  expect(edges("28c", 3, 15)).toEqual([
    "última aresta",
    "○ nenhuma",
    "",
    "últimas mensagens",
    "nenhuma",
    "──────────────────────────────",
    "perguntas abertas · 0",
    "nenhuma",
    "──────────────────────────────",
    "volume por aresta",
    "──────────────────────────────",
    "reworks",
    "sem feature aberta",
  ]);
  // A message without ticket is of the feature; a feature without plan has no ticket yet
  expect(edges("29b", 3, 5)).toEqual(["última aresta", "○ ldr → mot  [result]", "  feature · 14:45:41"]);
  expect(edges("26a", 3, 15).at(-1)).toBe("nenhum ticket ainda");
});
