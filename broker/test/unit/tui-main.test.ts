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

for (const frame of ["01", "10", "13a", "14", "23a", "24a", "24c", "25a", "26a", "28a", "28b"]) {
  test(`TUI-43: the agents and the tickets of frame ${frame}, columns 0 to 27`, () => columns(frame, 0, 27));
}
