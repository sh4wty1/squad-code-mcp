import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { len, type Grid } from "../../tui/grid.ts";
import { press } from "../../tui/keys.ts";
import { point, take, type Drawn, type Entry, type Pointer } from "../../tui/mouse.ts";
import { gate } from "../../tui/screens/gate.ts";
import { main } from "../../tui/screens/main.ts";
import { permission } from "../../tui/screens/permission.ts";
import type { GateModal, PermissionModal, Ui, View } from "../../tui/view.ts";
import { LOGS } from "../frames/logs.ts";
import { frameView } from "../frames/view.ts";

// What a click does with the modal of gate or of permission open. The cell of a click is found
// in the text the modal drew, and what the click does is compared with what `press` does with
// the key to the same state. In frames 08, 16a, 16b, 16c and 17 G-01 is the only pending gate,
// in 19b G-01 and G-02 are; in 22a the request 459 of worker-1 is open, in 22b it was answered
// in the terminal, and in 22d, 22e and 22f 459 and 460, with a command of 13 lines, are open.

type Change = (events: SquadEvent[]) => SquadEvent[];

function view(frame: string, ui: Partial<Ui> = {}, change?: Change): View {
  const v = frameView(frame, change);
  return { ...v, ui: { ...v.ui, ...ui } };
}

// The screen as the loop draws it: the main screen under the modal of gate or of permission
const screen = (v: View): Grid => (v.ui.gate ? gate(main(v), v) : v.ui.permission ? permission(main(v), v) : main(v));
const drawing = (v: View, g: Grid = screen(v)): Drawn => ({ hits: g.hits, screen: v.ui.screen });

function find(g: Grid, y: number, text: string, from = 0, to = g.w - 1): number[] {
  const line = g.rows[y]!.map((cell) => cell.ch);
  const want = [...text];
  return line.flatMap((_, x) => (x >= from && x + want.length - 1 <= to && want.every((ch, i) => line[x + i] === ch) ? [x] : []));
}
function at(g: Grid, y: number, text: string): number {
  const found = find(g, y, text);
  if (found.length !== 1) throw new Error(`line ${y} has "${text}" ${found.length} times: ${g.text()[y]}`);
  return found[0]!;
}

const report = (button: number, x: number, y: number): string => `\x1b[<${button};${x + 1};${y + 1}M`;
const click = (x: number, y: number): string => report(0, x, y);
const ON: Pointer = { on: true, clickedAt: null };
const entry = (v: View, pointer: Pointer = ON): Entry => ({ ui: v.ui, pointer });
const clicked = (v: View, x: number, y: number): Entry => point(entry(v), click(x, y), v, drawing(v))!;
const keys = (v: View, ...list: string[]): Ui | null => list.reduce<Ui | null>((ui, key) => ui && press(ui, key, { ...v, ui }), v.ui);
const later = (v: View, ms: number): View => ({ ...v, squad: { ...v.squad, now: v.squad.now + ms } });

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
const inside = (box: Box, x: number, y: number): boolean => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

// The box of the modal: the one whose top has its title
function modalBox(g: Grid): Box {
  const title = (y: number) => [...find(g, y, "┌─ ⚠ gate G-"), ...find(g, y, "┌─ ⚠ permissão P-")];
  const top = g.rows.findIndex((_, y) => title(y).length === 1);
  const left = title(top)[0]!;
  const right = find(g, top, "┐").find((x) => x > left)!;
  const bottom = g.rows.findIndex((row, y) => y > top && row[left]!.ch === "└");
  return { left, right, top, bottom };
}

const gateModal = (id: number, more: Partial<GateModal> = {}): GateModal => ({ id, mode: "view", text: "", expanded: false, empty: false, sending: false, version: 1, ...more });
const permissionModal = (seq: number, more: Partial<PermissionModal> = {}): PermissionModal => ({ seq, offset: 0, sending: false, ...more });

// Three pending gates with short summaries, which fit whole in the line of the queue: G-02 of
// 19b asked again as G-03
const G02 = LOGS["19b"]!.events.find((e) => e.kind === "gate" && e.gate_id === 2)!;
const SHORT = ["G-01 entrega", "G-02 branch", "G-03 chave"];
const threeGates: Change = (events) =>
  [...events, { ...G02, seq: 500, gate_id: 3 } as SquadEvent].map((e) => (e.kind === "gate" ? ({ ...e, summary: SHORT[e.gate_id - 1] } as SquadEvent) : e));
const gates3 = (id: number): View => view("19b", { gate: gateModal(id) }, threeGates);

// Three open requests: a request of worker-3 after the two of 22d
const REQUEST = LOGS["22a"]!.events.find((e) => e.seq === 459)!;
const threeRequests: Change = (events) => [...events, { ...REQUEST, seq: 500, from: "worker-3", request_id: "r500" } as SquadEvent];
const requests3 = (seq: number): View => view("22d", { permission: permissionModal(seq) }, threeRequests);
const TAGS = [
  [459, "P-01 w1 Bash"],
  [460, "P-02 w2 Bash"],
  [500, "P-03 w3 Bash"],
] as const;

// The four modes of the modal of gate and the two states of the modal of permission, with the
// queues of two
const MODALS = [
  ["08", "the view mode"],
  ["16a", "the text of a reject"],
  ["16b", "the text of a comment, expanded"],
  ["17", "the confirm mode"],
  ["19b", "the view mode with two gates"],
  ["22a", "an open request"],
  ["22b", "a request answered in the terminal"],
  ["22d", "two open requests"],
] as const;

// The cells of the items of the queue of the modal, the marked one included
function queueCells(g: Grid, box: Box, texts: readonly string[]): [number, number][] {
  return texts.flatMap((text) => {
    const found = g.rows.flatMap((_, y) => (y < box.top || y > box.bottom ? [] : find(g, y, text, box.left, box.right).map((x): [number, number] => [x, y])));
    if (found.length !== 1) return [];
    const [x, y] = found[0]!;
    return Array.from({ length: 2 + len(text) }, (_, i): [number, number] => [x - 2 + i, y]);
  });
}

for (const [frame, what] of MODALS) {
  test(`GAT-81: with the modal of frame ${frame}, ${what}, a click on any cell of lines 0 to 38 outside its box does what esc does in that mode, and sends nothing`, () => {
    const v = frameView(frame);
    const g = screen(v);
    const box = modalBox(g);
    const drawn = drawing(v, g);
    const esc = press(v.ui, "\x1b", v)!;
    expect(esc.send).toBeNull();
    // The modal of permission and the view mode of gate close; the other modes of gate go back to the view mode, without the text
    if (v.ui.permission) expect(esc).toEqual({ ...v.ui, permission: null });
    else if (v.ui.gate!.mode === "view") expect(esc).toEqual({ ...v.ui, gate: null });
    else expect(esc).toEqual({ ...v.ui, gate: { ...v.ui.gate!, mode: "view", ...(v.ui.gate!.mode !== "confirm" && { text: "", empty: false }) } });
    // The margin around the box is empty, and is not of the box
    expect([g.rows[box.top - 1]![box.left - 1]!.ch, g.rows[box.bottom + 1]![box.right + 1]!.ch]).toEqual([" ", " "]);
    for (let y = 0; y <= 38; y++) {
      for (let x = 0; x < 120; x++) {
        if (!inside(box, x, y)) expect(point(entry(v), click(x, y), v, drawn)!.ui).toEqual(esc);
      }
    }
  });

  test(`GAT-83: with the modal of frame ${frame}, ${what}, a click on a cell of its box that is not an item of the queue changes nothing`, () => {
    const v = frameView(frame);
    const g = screen(v);
    const box = modalBox(g);
    const drawn = drawing(v, g);
    const queue = queueCells(g, box, frame === "19b" ? ["G-01 entrega final", "G-02 excluir branch antiga"] : frame === "22d" ? ["P-01 w1 Bash", "P-02 w2 Bash"] : []);
    expect(queue.length).toBe(frame === "19b" ? 48 : frame === "22d" ? 28 : 0);
    for (let y = box.top; y <= box.bottom; y++) {
      for (let x = box.left; x <= box.right; x++) {
        if (!queue.some(([qx, qy]) => qx === x && qy === y)) expect(point(entry(v), click(x, y), v, drawn)!.ui).toBe(v.ui);
      }
    }
  });

  test(`GAT-80: with the modal of frame ${frame}, ${what}, the wheel does nothing on any cell, and is no click`, () => {
    const v = frameView(frame);
    const drawn = drawing(v);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 120; x++) {
        for (const button of [64, 65]) {
          const next = point(entry(v, { on: true, clickedAt: 5 }), report(button, x, y), v, drawn)!;
          expect(next.ui).toBe(v.ui);
          expect(next.pointer).toEqual({ on: true, clickedAt: 5 });
        }
      }
    }
  });
}

// The first and the last cell of the key of a shortcut of line 39, and of what it does
function shortcut(g: Grid, label: string, does: string): number[] {
  const x = at(g, 39, `${label} ${does}`);
  return [x, x + len(label) - 1, x + len(label) + 1, x + len(label) + len(does)];
}

const TXT16A = "Sem changelog no PR, e não quero deploy no horário de pico. Refaça para depois das 22h.";
const TXT16B = "Antes do merge, confirme que o player não faz autoplay no iOS. Se precisar mexer no PlayerBar, reemita o G-01 com o diff novo; o resto está ok.";

// Each shortcut of line 39 of each mode, the key it stands for and the state that key gives
const SHORTCUTS: [View, label: string, does: string, key: string, expected: (v: View) => Partial<Ui>][] = [
  [frameView("08"), "a", "aprovar", "a", (v) => ({ gate: { ...v.ui.gate!, mode: "confirm" } })],
  [frameView("08"), "r", "rejeitar", "r", (v) => ({ gate: { ...v.ui.gate!, mode: "reject" } })],
  [frameView("08"), "c", "comentar", "c", (v) => ({ gate: { ...v.ui.gate!, mode: "comment" } })],
  [frameView("08"), "esc", "fechar sem decidir", "\x1b", () => ({ gate: null })],
  [gates3(2), "]", "próximo gate", "]", () => ({ gate: gateModal(3) })],
  [gates3(2), "[", "anterior", "[", () => ({ gate: gateModal(1) })],
  [frameView("17"), "y", "confirmar", "y", (v) => ({ gate: { ...v.ui.gate!, sending: true }, send: { gate_id: 1, decision: "approve" } })],
  [frameView("17"), "esc", "voltar ao gate", "\x1b", (v) => ({ gate: { ...v.ui.gate!, mode: "view" } })],
  [frameView("16a"), "enter", "enviar", "\r", (v) => ({ gate: { ...v.ui.gate!, sending: true }, send: { gate_id: 1, decision: "reject", text: TXT16A } })],
  [frameView("16a"), "ctrl+e", "expandir", "\x05", (v) => ({ gate: { ...v.ui.gate!, expanded: true } })],
  [frameView("16a"), "ctrl+u", "limpar", "\x15", (v) => ({ gate: { ...v.ui.gate!, text: "" } })],
  [frameView("16a"), "esc", "voltar ao gate", "\x1b", (v) => ({ gate: { ...v.ui.gate!, mode: "view", text: "" } })],
  [frameView("16b"), "enter", "enviar", "\r", (v) => ({ gate: { ...v.ui.gate!, sending: true }, send: { gate_id: 1, decision: "comment", text: TXT16B } })],
  [frameView("16b"), "ctrl+e", "recolher", "\x05", (v) => ({ gate: { ...v.ui.gate!, expanded: false } })],
  // An empty text is not sent, and the field stays red
  [frameView("16c"), "enter", "enviar", "\r", (v) => ({ gate: { ...v.ui.gate!, empty: true } })],
  [frameView("22a"), "a", "permitir", "a", (v) => ({ permission: { ...v.ui.permission!, sending: true }, send: { request_seq: 459, behavior: "allow" } })],
  [frameView("22a"), "d", "negar", "d", (v) => ({ permission: { ...v.ui.permission!, sending: true }, send: { request_seq: 459, behavior: "deny" } })],
  [frameView("22a"), "esc", "fechar sem decidir", "\x1b", () => ({ permission: null })],
  // Without the end of the preview in view a does nothing; d denies in any position
  [frameView("22e"), "a", "permitir (veja o fim)", "a", () => ({})],
  [frameView("22e"), "d", "negar", "d", (v) => ({ permission: { ...v.ui.permission!, sending: true }, send: { request_seq: 460, behavior: "deny" } })],
  [frameView("22e"), "G", "fim", "G", (v) => ({ permission: { ...v.ui.permission!, offset: 5 } })],
  [frameView("22e"), "[", "anterior", "[", () => ({ permission: permissionModal(459) })],
  [frameView("22f"), "a", "permitir", "a", (v) => ({ permission: { ...v.ui.permission!, sending: true }, send: { request_seq: 460, behavior: "allow" } })],
  [requests3(460), "]", "próximo", "]", () => ({ permission: permissionModal(500) })],
  [requests3(460), "[", "anterior", "[", () => ({ permission: permissionModal(459) })],
  [frameView("22b"), "esc", "fechar", "\x1b", () => ({ permission: null })],
];

test("GAT-82: a click on a shortcut of line 39, on its key or on what it does, does what its key does in that mode", () => {
  for (const [v, label, does, key, expected] of SHORTCUTS) {
    for (const x of shortcut(screen(v), label, does)) {
      const next = clicked(v, x, 39).ui;
      expect(next).toEqual(press(v.ui, key, v)!);
      expect(next).toEqual({ ...v.ui, ...expected(v) });
    }
  }
});

test("GAT-82: a click on j or on k of j/k rolar scrolls the preview by one line, each by its letter, and the rest of that shortcut changes nothing", () => {
  const v = view("22f", { permission: permissionModal(460, { offset: 3 }) });
  const g = screen(v);
  const x = at(g, 39, "j/k rolar");
  const down = clicked(v, x, 39).ui;
  expect(down).toEqual(press(v.ui, "j", v)!);
  expect(down.permission).toEqual(permissionModal(460, { offset: 4 }));
  const up = clicked(v, x + 2, 39).ui;
  expect(up).toEqual(press(v.ui, "k", v)!);
  expect(up.permission).toEqual(permissionModal(460, { offset: 2 }));
  for (let cell = x + 1; cell < x + len("j/k rolar"); cell++) if (cell !== x + 2) expect(clicked(v, cell, 39).ui).toBe(v.ui);
});

test("GAT-82: a click on line 39 before the first shortcut, between two of them or after the last one changes nothing", () => {
  for (const v of [frameView("08"), frameView("17"), frameView("16a"), frameView("22a"), frameView("22b")]) {
    const g = screen(v);
    const line = g.rows[39]!.map((cell) => cell.ch).join("");
    const end = line.trimEnd().length;
    const gap = line.indexOf("   ", 1) + 1;
    for (const cell of [0, gap, end, 119]) expect(clicked(v, cell, 39).ui).toBe(v.ui);
  }
});

test("GAT-83: a click on an item of the queue of gates does ] or [ as many times as take the marked one to it, from the first, the middle and the last, and on the marked one nothing", () => {
  for (const [from, start] of [[0, 1], [1, 2], [2, 3]] as const) {
    const v = gates3(start);
    const g = screen(v);
    const box = modalBox(g);
    SHORT.forEach((text, to) => {
      const cells = queueCells(g, box, [text]);
      expect(cells.length).toBe(2 + len(text));
      for (const [x, y] of [cells[0]!, cells.at(-1)!]) {
        const next = clicked(v, x, y).ui;
        if (to === from) expect(next).toBe(v.ui);
        else {
          expect(next).toEqual(keys(v, ...Array<string>(Math.abs(to - from)).fill(to < from ? "[" : "]"))!);
          expect(next).toEqual({ ...v.ui, gate: gateModal(to + 1) });
        }
      }
    });
  }
});

test("GAT-83: a click on an item of the queue of requests does ] or [ as many times as take the marked one to it, from the first, the middle and the last, and on the marked one nothing", () => {
  TAGS.forEach(([start], from) => {
    // The marked request scrolled: the one clicked opens on the first line of its preview
    const v = view("22d", { permission: permissionModal(start, { offset: start === 460 ? 2 : 0 }) }, threeRequests);
    const g = screen(v);
    const box = modalBox(g);
    TAGS.forEach(([seq, text], to) => {
      const cells = queueCells(g, box, [text]);
      expect(cells.length).toBe(2 + len(text));
      for (const [x, y] of [cells[0]!, cells.at(-1)!]) {
        const next = clicked(v, x, y).ui;
        if (to === from) expect(next).toBe(v.ui);
        else {
          expect(next).toEqual(keys(v, ...Array<string>(Math.abs(to - from)).fill(to < from ? "[" : "]"))!);
          expect(next).toEqual({ ...v.ui, permission: permissionModal(seq) });
        }
      }
    });
  });
});

// A cell of each thing a click does in a modal: a shortcut that changes it, and one outside its box
function targets(v: View, label: string, does: string): [number, number][] {
  const g = screen(v);
  return [[at(g, 39, `${label} ${does}`), 39], [0, 0]];
}

test("GAT-84: with the modal of gate or of permission open a click that comes 499 ms after the one before changes nothing and sends nothing, and is the click before the next one", () => {
  for (const [v, label, does] of [[frameView("08"), "a", "aprovar"], [frameView("17"), "y", "confirmar"], [frameView("22a"), "d", "negar"], [frameView("22a"), "a", "permitir"]] as const) {
    for (const ms of [499, 250, 0]) {
      for (const cell of targets(v, label, does)) {
        const next = point(entry(v, { on: true, clickedAt: v.squad.now - ms }), click(...cell), v, drawing(v))!;
        expect(next.ui).toBe(v.ui);
        expect(next.pointer).toEqual({ on: true, clickedAt: v.squad.now });
      }
    }
  }
});

test("GAT-84: edge case: a click that comes 500 ms or more after the one before is treated by the rules of the modal", () => {
  for (const [v, label, does, key] of [[frameView("08"), "a", "aprovar", "a"], [frameView("17"), "y", "confirmar", "y"], [frameView("22a"), "d", "negar", "d"]] as const) {
    for (const ms of [500, 501, 60_000]) {
      const [shortcutCell, outside] = targets(v, label, does);
      const after = (cell: [number, number]) => point(entry(v, { on: true, clickedAt: v.squad.now - ms }), click(...cell), v, drawing(v))!.ui;
      expect(after(shortcutCell!)).toEqual(press(v.ui, key, v)!);
      expect(after(outside!)).toEqual(press(v.ui, "\x1b", v)!);
    }
  }
});

test("GAT-84: a click on a aprovar and another on y confirmar 600 ms later leave the approve to send; the same pair 300 ms apart does not", () => {
  const v = frameView("08");
  const first = point(entry(v), click(at(screen(v), 39, "a aprovar"), 39), v, drawing(v))!;
  expect(first.ui.gate!.mode).toBe("confirm");
  const confirm = { ...v, ui: first.ui };
  const y = at(screen(confirm), 39, "y confirmar");
  for (const [ms, send] of [[600, { gate_id: 1, decision: "approve" }], [300, null]] as const) {
    const then = later(confirm, ms);
    const second = point(first, click(y, 39), then, drawing(then))!;
    expect(second.ui.send).toEqual(send);
  }
});

test("GAT-80: with the modal of gate or of permission open a click hits nothing the main screen drew before it, and without it nothing the modal drew", () => {
  for (const frame of ["08", "22a"]) {
    const open = frameView(frame);
    const shut: View = { ...open, ui: { ...open.ui, gate: null, permission: null } };
    const under = screen(shut);
    // A key of the chunk opened the modal after the main screen was drawn: a tab, the seal of the modal, p pausa
    for (const [text, y] of [["2 topologia", 1], ["p pausa", 39]] as const) {
      expect(point(entry(open), click(at(under, y, text), y), open, drawing(shut, under))!.ui).toBe(open.ui);
    }
    // And one closed it after it was drawn: its esc would leave the main screen, a its shortcut
    const over = screen(open);
    const box = modalBox(over);
    for (const [x, y] of [[0, 0], [box.left + 1, box.top + 1], [at(over, 39, "esc fechar sem decidir"), 39]] as const) {
      expect(point(entry(shut), click(x, y), shut, drawing(open, over))!.ui).toBe(shut.ui);
    }
  }
});

test("GAT-80, GAT-73: while a decision waits for the broker no click and no wheel changes the modal, in any cell of the screen", () => {
  const gating = frameView("17");
  const permitting = frameView("22a");
  for (const v of [
    { ...gating, ui: { ...gating.ui, gate: { ...gating.ui.gate!, sending: true }, send: { gate_id: 1, decision: "approve" as const } } },
    { ...permitting, ui: { ...permitting.ui, permission: { ...permitting.ui.permission!, sending: true }, send: { request_seq: 459, behavior: "deny" as const } } },
  ]) {
    const drawn = drawing(v);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 120; x++) {
        for (const button of [0, 64, 65]) expect(point(entry(v), report(button, x, y), v, drawn)!.ui).toBe(v.ui);
      }
    }
  }
});

test("GAT-54, GAT-50: with the modal of gate open m is a key of the modal and not the mouse: it goes to the text of a reject, and changes nothing in the view mode", () => {
  const writing = frameView("16a");
  const typed = take(entry(writing), "m", writing, false, drawing(writing))!;
  expect(typed.ui).toEqual(press(writing.ui, "m", writing)!);
  expect(typed.ui.gate!.text).toBe(TXT16A + "m");
  expect(typed.pointer).toEqual(ON);
  for (const frame of ["08", "22a"]) {
    const v = frameView(frame);
    const next = take(entry(v), "m", v, false, drawing(v))!;
    expect(next.ui).toBe(v.ui);
    expect(next.pointer).toEqual(ON);
  }
});
