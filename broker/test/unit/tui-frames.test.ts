import { expect, test } from "bun:test";
import type { Grid } from "../../tui/grid.ts";
import { answer } from "../../tui/screens/answer.ts";
import { down } from "../../tui/screens/down.ts";
import { help } from "../../tui/screens/help.ts";
import { main } from "../../tui/screens/main.ts";
import { questions } from "../../tui/screens/questions.ts";
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

// The broker of frame 12 does not answer for 12 s, in 12 reads
const frozen = (view: View, seconds = 12): View => ({ ...view, down: { since: view.squad.now - seconds * 1000, attempt: seconds } });

// The requirement of a screen of the slice that reads is TUI-43
const SCREENS: [name: string, ids: string[], draw: (view: View) => Grid, requirement?: string][] = [
  ["main screen", MAIN, main],
  ["topology", TOPOLOGY, topology],
  ["thread", ["03", "15b", "24d", "25b"], thread],
  ["legend", ["11"], help],
  ["frozen screen", ["12"], (view) => down(frozen(view))],
  ["tab of questions", ["04"], questions, "QST-69"],
  ["modal of answer", ["05", "06", "07", "20a", "20b"], (view) => answer(questions(view), view), "QST-87"],
];

for (const [name, ids, draw, requirement = "TUI-43"] of SCREENS) {
  for (const id of ids) {
    test(`${requirement}: frame ${id} of the ${name}`, () => {
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
    TOPOLOGY.includes(id) ? [8, 14, 22, 31].includes(dev.line) : [...MAIN, "12"].includes(id) && [3, 7, 11, 15, 19, 23].includes(dev.line) && dev.col < 28;
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

test("QST-89: every deviation of frame 04 is D1 or D2 and cites the spec or the design", () => {
  const all = DEVIATIONS["04"]!;
  expect(all.length).toBeGreaterThan(0);
  expect(all.filter((dev) => !["D1", "D2"].includes(dev.class) || !/QST-\d\d|Assumptions, `|\.design\/squad-mvp\.md line \d+/.test(dev.why))).toEqual([]);
});

test("QST-69: the history of frame 04 has the question the mother answered at 14:19:05, and its deviation says the prototype leaves it out", () => {
  const view = frameView("04");
  // The oldest of the six, at the end of the history
  const drawn = questions({ ...view, ui: { ...view.ui, historyOffset: 2 } }).text();
  expect([...drawn[33]!].slice(2, 27).join("")).toBe("14:19:05  Q-04  ldr → mot");
  expect([...drawn[34]!].slice(12, 65).join("")).toBe("✓ respondida por mother: API /v1/setlist, polling 30s");
  const counted = DEVIATIONS["04"]!.filter((dev) => dev.line === 26);
  expect(counted.map((dev) => [dev.class, dev.text])).toEqual([["D1", "6"]]);
  expect(counted[0]!.why).toContain("answered by her at 14:19:05");
  expect(counted[0]!.why).toContain("the history the prototype writes by hand leaves it out");
});

test("QST-89: no deviation of the frames of the modal is D3", () => {
  for (const id of ["05", "06", "07", "20a", "20b"]) {
    expect(DEVIATIONS[id]!.length).toBeGreaterThan(0);
    expect(DEVIATIONS[id]!.filter((dev) => !["D1", "D2"].includes(dev.class)).map((dev) => `${id} line ${dev.line}`)).toEqual([]);
  }
});

test("QST-87: in frame 20a the effect of Q-09 written by hand is a D2 deviation, and the seal of line 1 the D1 one of frame 10", () => {
  const all = DEVIATIONS["20a"]!;
  const seal = all.filter((dev) => dev.line === 1);
  expect(seal.map((dev) => [dev.class, dev.text.trim()])).toEqual([["D1", "⚠ w2 bloqueado · RADIO_API_KEY ausente"]]);
  expect(seal).toEqual(DEVIATIONS["10"]!.filter((dev) => dev.line === 1));
  // The frame has the effect in lines 26 and 27 of the modal; the one the TUI writes takes one
  expect(frame("20a").slice(26, 28).map((line) => [...line].slice(22, 99).join("").trim())).toEqual([
    "efeito  pronto: worker-2 relê o .env e retoma o TKT-13. Não vou fornecer: o",
    "leader replaneja o ticket sem a API.",
  ]);
  const effect = all.filter((dev) => dev.text.includes("efeito  "));
  expect(effect.map((dev) => [dev.class, dev.line, [...dev.text].slice(4, 81).join("").trim()])).toEqual([["D2", 27, "efeito  worker-2 retoma o TKT-13 assim que você confirmar."]]);
  expect(effect[0]!.why).toContain('Assumptions, `Linha "efeito"`');
  // Behind the modal, the end of the two lines of the effect in the detail
  expect(all.filter((dev) => dev.col === 102).map((dev) => [dev.class, dev.line, dev.text])).toEqual([["D2", 18, "ue você"], ["D2", 19, ""]]);
});

test("QST-58: the default of the detail behind the modal of frames 06 and 07 is the one of the frame, with no deviation", () => {
  // The end of `default  logo da 89  · aplicado em 3:08 sem resposta`, at the right of the modal
  for (const [id, line] of [["06", 12], ["07", 12]] as const) {
    expect([...frame(id)[line]!].slice(102, 114).join("")).toBe("sem resposta");
    expect(DEVIATIONS[id]!.filter((dev) => dev.line === line && dev.col + dev.width > 102)).toEqual([]);
  }
});

test("TUI-49: the legend leaves frame 11 only where it cites a key or a screen of another slice", () => {
  const lines = frame("11").map((line) => [...line.padEnd(120)]);
  const cut = DEVIATIONS["11"]!.map((dev) => [dev.class, dev.text, lines[dev.line]!.slice(dev.col, dev.col + dev.width).join("").trim()]);
  expect(cut).toEqual(
    [
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

test("QST-88: the legend has the four lines of Question where frame 11 has them, and the lines of gate and of permission empty", () => {
  const drawn = help(frameView("11")).text();
  // The text of the panel of the keys, inside its box
  const keys = drawn.map((line) => [...line.padEnd(120)].slice(62, 118).join("").trimEnd());
  expect(keys.slice(19, 25)).toEqual(["h           foco no histórico", "", "modal de resposta", "1–4 enter   escolher · enviar · esc cancela", "ctrl+e · u  expandir o texto · limpar", ""]);
  for (const y of [19, 21, 22, 23]) expect(drawn[y]).toBe(frame("11")[y]!);
  expect([25, 26, 27, 28, 30, 31, 32, 33].map((y) => keys[y])).toEqual(["", "", "", "", "", "", "", ""]);
});

test("QST-89: no frame of Question has a D3 deviation, and no deviation is there for a screen or a key of the slice Question", () => {
  for (const id of ["04", "05", "06", "07", "20a", "20b"]) expect(DEVIATIONS[id]!.filter((dev) => dev.class === "D3").map((dev) => `${id} line ${dev.line}`)).toEqual([]);
  const all = Object.entries(DEVIATIONS).flatMap(([id, list]) => list.map((dev) => ({ id, ...dev })));
  // What the spec cut is of the slices to come, and Question is not one of them
  expect(all.filter((dev) => dev.class === "D3" && /Question/.test(dev.why)).map((dev) => `${dev.id} line ${dev.line}`)).toEqual([]);
  expect(all.filter((dev) => /of the slices? Question/.test(dev.why)).map((dev) => `${dev.id} line ${dev.line}`)).toEqual([]);
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

test("TUI-51: the frozen screen is the last state in gray, with the seconds and the attempt of `view.down`", () => {
  const g = down(frozen(frameView("12"), 75));
  const drawn = g.text();
  expect(drawn[0]!.slice(-37)).toBe("broker ○ desconectado · 75s  14:32:07");
  expect(drawn[38]).toBe(" ○ broker inacessível · reconexão automática a cada 1s · tentativa 75  · responder, gate e permissão desabilitados");
  expect(drawn[39]).toBe(" j/k mover   enter abrir   1-4 telas   ? ajuda   q sair       sem tecla de reconectar: a TUI tenta sozinha");
  expect([...drawn[2]!].slice(71, 86).join("")).toBe(" ○ congelado ─┐");
  // Frozen 75 s before the clock
  expect([...drawn[3]!].slice(30, 84).join("").trimEnd()).toBe("○ congelado em 14:30:52 · último estado conhecido");
  // Nothing of the state keeps its color or its background: only the two notices of the freeze
  const lit = g.rows.slice(2, 38).flatMap((row, i) => row.flatMap((cell, x) => (cell.bg !== null || (cell.ch !== " " && cell.fg !== "gray") ? [`${i + 2}:${x}:${cell.fg}`] : [])));
  expect(new Set(lit.map((at) => at.split(":")[0] + ":" + at.split(":")[2]))).toEqual(new Set(["2:byellow", "3:byellow"]));
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
