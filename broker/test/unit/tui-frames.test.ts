import { expect, test } from "bun:test";
import type { Grid } from "../../tui/grid.ts";
import { help } from "../../tui/screens/help.ts";
import { main } from "../../tui/screens/main.ts";
import { small } from "../../tui/screens/small.ts";
import { thread } from "../../tui/screens/thread.ts";
import { topology } from "../../tui/screens/topology.ts";
import type { View } from "../../tui/view.ts";
import { DEVIATIONS, expected } from "../frames/deviations.ts";
import { frame, frameView } from "../frames/view.ts";

// The frames of the main screen: each one drawn from its log is the frame of the
// prototype, line by line, but for the deviations declared for it
const MAIN = ["01", "09a", "09b", "10", "13a", "13c", "14", "15a", "18a", "19a", "22c", "22g", "22h", "23a", "24a", "24b", "24c", "25a", "26a", "26b", "27a", "27b", "27c", "28a", "28b", "29a", "29c"];

const TOPOLOGY = ["02", "13b", "23b", "28c", "29b"];

const SCREENS: [name: string, ids: string[], draw: (view: View) => Grid][] = [
  ["main screen", MAIN, main],
  ["topology", TOPOLOGY, topology],
  ["thread", ["03", "15b", "24d", "25b"], thread],
  ["legend", ["11"], help],
];

for (const [name, ids, draw] of SCREENS) {
  for (const id of ids) {
    test(`TUI-43: frame ${id} of the ${name}`, () => {
      const drawn = draw(frameView(id)).text();
      expect(drawn.length).toBe(40);
      expect(drawn.map((line, y) => `${y} ${line}`)).toEqual(expected(id).lines.map((line, y) => `${y} ${line}`));
    });
  }
}

test("TUI-43: every deviation is of a declared frame, has a class and says why", () => {
  expect(Object.keys(DEVIATIONS).every((id) => frame(id).length === 40)).toBe(true);
  const all = Object.values(DEVIATIONS).flat();
  expect(all.length).toBeGreaterThan(0);
  expect(all.filter((dev) => !["D1", "D2", "D3"].includes(dev.class) || dev.why.trim().length < 20)).toEqual([]);
});

test("TUI-43: a deviation of the status of an agent cites the line of the design that contradicts the prototype", () => {
  // The status is at the right of the first line of each agent: in the panel of agents of
  // the main screen, and in the box of each node of the topology
  const head = (id: string, dev: { line: number; col: number }) =>
    TOPOLOGY.includes(id) ? [8, 14, 22, 31].includes(dev.line) : MAIN.includes(id) && [3, 7, 11, 15, 19, 23].includes(dev.line) && dev.col < 28;
  const statuses = Object.entries(DEVIATIONS).flatMap(([id, list]) => list.filter((dev) => head(id, dev)).map((dev) => ({ id, ...dev })));
  expect(statuses.map((dev) => dev.id + " " + dev.text.replace(/ +/g, " "))).toEqual([
    "10 ● leader [working]",
    "14 ● mother [working]",
    "14 ○ worker-2 [idle]",
    "15a ? leader [waiting ?]",
    "18a ○ mother [waiting]",
    "22c ● mother [working]",
    "22h ● mother [working]",
    "22h ○ worker-2 [idle]",
    "23a ● mother [working]",
    "23a ○ worker-1 [idle]",
    "24a ● mother [working]",
    "24b ● mother [working]",
    "24c ● mother [working]",
    "25a ● mother [working]",
    "23b ● mother [working]",
    "23b ○ worker-1 [idle]",
  ]);
  expect(statuses.filter((dev) => dev.class !== "D1" || !/\.design\/squad-mvp\.md line 3\d\d/.test(dev.why))).toEqual([]);
});

test("TUI-49: the legend leaves frame 11 only where it cites a key or a screen of another slice", () => {
  const lines = frame("11").map((line) => [...line.padEnd(120)]);
  const cut = DEVIATIONS["11"]!.map((dev) => [dev.class, dev.text, lines[dev.line]!.slice(dev.col, dev.col + dev.width).join("").trim()]);
  expect(cut).toEqual(
    [
      "h           foco no histórico",
      "modal de resposta",
      "1–4 enter   escolher · enviar · esc cancela",
      "ctrl+e · u  expandir o texto · limpar",
      "gate (modal)",
      "a           aprovar → pede confirmação (y)",
      "r · c       rejeitar · comentar, texto obrigatório",
      "] [ · esc   fila de gates · fechar sem decidir",
      "permissão (modal)",
      "a · d       permitir (após ver o fim) · negar",
      "j k · G     rolar a prévia · ir ao fim",
      "] [ · esc   fila · fechar, o pedido segue",
      "✓ P-01 fechado no terminal",
    ].map((text) => ["D3", "", text])
  );
});

test("TUI-54: a terminal of 80 by 24 shows frame 21", () => {
  expect(small(80, 24).text()).toEqual(frame("21"));
});

test("TUI-54: the message has the size of the terminal and is in the middle of its grid", () => {
  const g = small(100, 30);
  expect([g.w, g.h, g.text().length]).toEqual([100, 30, 30]);
  const drawn = g.text();
  // Eleven lines from line 9 down, each one centered in the 100 columns
  expect([drawn[8], drawn[9], drawn[13], drawn[14], drawn[19], drawn[20]]).toEqual(["", " ".repeat(45) + "squad-tui", " ".repeat(40) + "atual       100 × 30", " ".repeat(40) + "necessário  120 × 40", " ".repeat(47) + "q sair", ""]);
});

test("TUI-43: no deviation is dead: each one changes the line of its frame", () => {
  for (const id of Object.keys(DEVIATIONS)) {
    const { lines, dead } = expected(id);
    expect(dead.map((dev) => `${id} line ${dev.line} "${dev.text}"`)).toEqual([]);
    // And no line with a deviation ends up as the frame has it
    const original = frame(id);
    const same = [...new Set(DEVIATIONS[id]!.map((dev) => dev.line))].filter((y) => lines[y] === original[y]);
    expect(same.map((y) => `${id} line ${y}`)).toEqual([]);
  }
});

test("TUI-43: a deviation that repeats what the frame already has is reported as dead", () => {
  const line = frame("09a")[3]!;
  const repeated = { line: 3, col: 2, width: 8, text: [...line].slice(2, 10).join(""), class: "D1" as const, why: "the frame already has this text" };
  DEVIATIONS["09a"]!.push(repeated);
  try {
    expect(expected("09a").dead).toEqual([repeated]);
  } finally {
    DEVIATIONS["09a"]!.pop();
  }
  expect(expected("09a").dead).toEqual([]);
});
