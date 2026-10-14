import { expect, test } from "bun:test";
import { grid } from "../../tui/grid.ts";
import { drawModal, type Item } from "../../tui/screens/modal.ts";
import { preview } from "../../tui/screens/permission.ts";

// A modal of `n` lines of text in the box of the gate: 80 columns from column 20
function gateBox(n: number, tag?: string) {
  const g = grid();
  const items: Item[] = Array.from({ length: n }, (_, i): Item => [[`linha ${i}`]]);
  const at = drawModal(g, 20, 80, items, "⚠ gate G-01", "bmagenta", "bmagenta", tag);
  return { g, at, lines: g.text() };
}

test("GAT-41: the box takes 80 columns from column 20, centered in the 40 lines", () => {
  // 10 lines of text and the two borders: 12 lines, from line 14
  const { g, at, lines } = gateBox(10);
  expect(at).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
  expect([...lines[14]!].slice(20, 100).join("")).toBe(("┌─ ⚠ gate G-01 ").padEnd(79, "─") + "┐");
  expect([...lines[25]!].slice(20, 100).join("")).toBe("└" + "─".repeat(78) + "┘");
  expect([...lines[15]!].slice(20, 100).join("")).toBe("│  linha 0".padEnd(79) + "│");
  expect(g.rows[14]![20]!.fg).toBe("bmagenta");
  // The margin around the box is empty
  expect([lines[13], lines[26]].map((line) => [...(line ?? "").padEnd(120)].slice(19, 101).join("").trim())).toEqual(["", ""]);
});

test("GAT-41: a box of more than 36 lines starts at line 2, never above it", () => {
  // 36 lines of text: 38 with the borders, which centered would start at line 1
  expect(gateBox(36).at[0]).toBe(3);
  expect([...gateBox(36).lines[2]!].slice(20, 23).join("")).toBe("┌─ ");
  // 32 lines: 34 with the borders, centered from line 3
  expect(gateBox(32).at[0]).toBe(4);
});

test("GAT-41: the tag is on the top border, ending two columns before the corner", () => {
  const { lines } = gateBox(10, " gate 1 de 2 ");
  expect([...lines[14]!].slice(20, 100).join("")).toBe(("┌─ ⚠ gate G-01 ").padEnd(64, "─") + " gate 1 de 2 ──┐");
});

test("GAT-63: the box of the preview has the number of each line in 3 columns, `·` on a continuation, and which lines are in view on its bottom border", () => {
  const text = Array.from({ length: 9 }, (_, i) => (i === 1 ? "x".repeat(75) : `linha ${i + 1}`)).join("\n");
  const draw = (offset: number) => {
    const g = grid();
    drawModal(g, 19, 82, [{ pre: preview(text), rows: 10, offset, dim: false, title: "entrada · Bash" }], "⚠ permissão", "bcyan", "bcyan");
    return g.text().map((line) => [...line.padEnd(120)].slice(22, 98).join(""));
  };
  const top = draw(0);
  const y = top.findIndex((line) => line.startsWith("┌─ entrada · Bash "));
  expect(top.slice(y + 1, y + 4)).toEqual(["│  1 linha 1".padEnd(75) + "│", "│  2 " + "x".repeat(70) + "│", "│  · xxxxx".padEnd(75) + "│"]);
  expect(top[y + 9]).toBe("└".padEnd(47, "─") + " 1–8 de 10 · ▼ mais abaixo ─┘");
  const end = draw(2);
  expect(end[y + 1]).toBe("│  · xxxxx".padEnd(75) + "│");
  expect(end[y + 9]).toBe("└".padEnd(56, "─") + " 3–10 de 10 · fim ─┘");
});
