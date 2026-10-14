import { expect, test } from "bun:test";
import { read } from "../../tui/mouse-probe.ts";

test("CLK-17: the probe writes one line for a report, with the button, the column, the line and pressão", () => {
  expect(read("\x1b[<0;12;5M")).toEqual({ lines: ["botão 0 · coluna 12 · linha 5 · pressão"], rest: "", quit: false });
});

test("CLK-17: a report that ends in m is a soltura", () => {
  expect(read("\x1b[<0;12;5m").lines).toEqual(["botão 0 · coluna 12 · linha 5 · soltura"]);
});

test("CLK-17: each report of one read has its line, in the order of arrival", () => {
  expect(read("\x1b[<0;1;1M\x1b[<0;1;1m\x1b[<64;120;40M\x1b[<65;7;39M").lines).toEqual([
    "botão 0 · coluna 1 · linha 1 · pressão",
    "botão 0 · coluna 1 · linha 1 · soltura",
    "botão 64 · coluna 120 · linha 40 · pressão",
    "botão 65 · coluna 7 · linha 39 · pressão",
  ]);
});

test("CLK-17: a report cut by the read waits for its end and has one line", () => {
  const first = read("\x1b[<0;12");
  expect(first).toEqual({ lines: [], rest: "\x1b[<0;12", quit: false });
  expect(read(first.rest + ";5M")).toEqual({ lines: ["botão 0 · coluna 12 · linha 5 · pressão"], rest: "", quit: false });
});

test.each(["\x1b", "\x1b[", "\x1b[<", "\x1b[<0;", "\x1b[<0;12;5"])("CLK-17: %j at the end of a read is kept for the next one", (start) => {
  expect(read("\x1b[<0;1;1M" + start)).toEqual({ lines: ["botão 0 · coluna 1 · linha 1 · pressão"], rest: start, quit: false });
});

test("CLK-17: what is not a report is written as it came, the old format of a report too", () => {
  expect(read("\x1b[M !!").lines).toEqual(['outra entrada: "\\u001b[M !!"']);
  expect(read("a\x1b[<0;2;3Mb").lines).toEqual(['outra entrada: "a"', "botão 0 · coluna 2 · linha 3 · pressão", 'outra entrada: "b"']);
});

test.each(["q", "\x03"])("CLK-17: the key %j leaves the probe", (key) => {
  expect(read(key).quit).toBe(true);
  expect(read("\x1b[<0;2;3M" + key).quit).toBe(true);
});

test("CLK-17: no other key and no report leaves the probe", () => {
  expect(read("x\x1b[<0;2;3M\r").quit).toBe(false);
});
