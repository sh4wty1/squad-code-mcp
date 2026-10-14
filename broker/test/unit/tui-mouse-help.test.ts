import { expect, test } from "bun:test";
import { help } from "../../tui/screens/help.ts";
import { DEVIATIONS } from "../frames/deviations.ts";
import { frameView } from "../frames/view.ts";

// The line of the key of the mouse on the help screen, and its place in the table of deviations.

// The text of the panel of the keys, inside its box: columns 62 to 117 of each line
const keys = (): string[] => help(frameView("11")).text().map((line) => [...line.padEnd(120)].slice(62, 118).join("").trimEnd());

test("CLK-55: line 10 of the help screen has the key m and what it does, in the panel of the keys", () => {
  expect(keys()[10]).toBe("m           mouse liga / desliga · clique = tecla");
  // After the global keys and before the ones of navigation
  expect(keys()[9]).toBe("? · q       ajuda · sair (o broker segue rodando)");
  expect(keys()[11]).toBe("navegação");
});

test("CLK-55: the lines frame 11 gives to the modals of gate and of permission are still empty", () => {
  for (const line of [25, 26, 27, 28, 30, 31, 32, 33]) expect(`${line} ${keys()[line]}`).toBe(`${line} `);
});

test("CLK-55: the line of m is the only deviation of class D4, declared on line 10 of frame 11 with its requirement", () => {
  const d4 = Object.entries(DEVIATIONS).flatMap(([id, devs]) => devs.filter((dev) => dev.class === "D4").map((dev) => ({ id, line: dev.line, col: dev.col, text: dev.text })));
  expect(d4).toEqual([{ id: "11", line: 10, col: 62, text: "m           mouse liga / desliga · clique = tecla" }]);
  expect(DEVIATIONS["11"]!.find((dev) => dev.class === "D4")!.why).toContain("CLK-55");
});
