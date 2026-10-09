import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cost, prices, readIntervalMs } from "../../tui/config.ts";

const dir = mkdtempSync(join(tmpdir(), "squad-prices-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function file(name: string, content: string): string {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

test("TUI-57: without SQUAD_PRICES the table is the built-in one, in dollars per million tokens", () => {
  const table = prices({});
  expect(table["claude-opus-5-5"]).toEqual({ input: 4, output: 20, cache_write: 5, cache_read: 0.2 });
  expect(table["claude-haiku-4-5"]).toEqual({ input: 1, output: 5, cache_write: 1.25, cache_read: 0.1 });
  for (const price of Object.values(table)) {
    expect(Object.keys(price).sort()).toEqual(["cache_read", "cache_write", "input", "output"]);
    expect(Object.values(price).every((dollars) => typeof dollars === "number" && dollars > 0)).toBe(true);
  }
});

test("TUI-57: SQUAD_PRICES points at the table to use", () => {
  const table = { "model-x": { input: 1, output: 2, cache_write: 3, cache_read: 4 } };
  expect(prices({ SQUAD_PRICES: file("ok.json", JSON.stringify(table)) })).toEqual(table);
});

test("TUI-57: a SQUAD_PRICES file that does not exist is refused with its path", () => {
  const path = join(dir, "missing.json");
  expect(() => prices({ SQUAD_PRICES: path })).toThrow(path);
});

test("TUI-57: a price table mixing valid and invalid models is refused", () => {
  const path = file("mixed.json", JSON.stringify({
    valid: { input: 1, output: 2, cache_write: 3, cache_read: 4 },
    invalid: { input: 1, output: 2, cache_write: 3, cache_read: "4" },
  }));
  expect(() => prices({ SQUAD_PRICES: path })).toThrow(path);
});

for (const [what, content] of [
  ["not JSON", "{ input: 1"],
  ["a list", "[]"],
  ["a number", "7"],
  ["null", "null"],
  ["a model that is not an object", '{ "model-x": 3 }'],
  ["a model that is null", '{ "model-x": null }'],
  ["a model without cache_read", '{ "model-x": { "input": 1, "output": 2, "cache_write": 3 } }'],
  ["a price that is a string", '{ "model-x": { "input": "1", "output": 2, "cache_write": 3, "cache_read": 4 } }'],
] as const) {
  test(`TUI-57: a SQUAD_PRICES file that is ${what} is refused with its path`, () => {
    const path = file("bad.json", content);
    expect(() => prices({ SQUAD_PRICES: path })).toThrow(path);
  });
}

test("TUI-57: the cost adds every kind of token of every model at the price of the model", () => {
  const table = {
    a: { input: 1, output: 10, cache_write: 100, cache_read: 1000 },
    b: { input: 3, output: 5, cache_write: 7, cache_read: 11 },
  };
  const totals = {
    a: { input: 1_000_000, output: 2_000_000, cache_write: 3_000_000, cache_read: 4_000_000 },
    b: { input: 500_000, output: 0, cache_write: 0, cache_read: 2_000_000 },
  };
  // a: 1 + 20 + 300 + 4000; b: 1.5 + 22
  expect(cost(totals, table)).toBeCloseTo(4344.5, 9);
  expect(cost({}, table)).toBe(0);
});

test("TUI-57: a model outside the table costs zero", () => {
  const table = { a: { input: 1, output: 1, cache_write: 1, cache_read: 1 } };
  const tokens = { input: 1_000_000, output: 1_000_000, cache_write: 1_000_000, cache_read: 1_000_000 };
  expect(cost({ unknown: tokens }, table)).toBe(0);
  expect(cost({ unknown: tokens, a: tokens }, table)).toBeCloseTo(4, 9);
});

test("TUI-58: the TUI reads every SQUAD_POLL_INTERVAL_MS when it is a positive integer", () => {
  expect(readIntervalMs({ SQUAD_POLL_INTERVAL_MS: "250" })).toBe(250);
  expect(readIntervalMs({ SQUAD_POLL_INTERVAL_MS: "1" })).toBe(1);
});

for (const value of [undefined, "", "abc", "0", "-5", "1.5"]) {
  test(`TUI-58: the TUI reads every 1000 ms when SQUAD_POLL_INTERVAL_MS is ${JSON.stringify(value)}`, () => {
    expect(readIntervalMs({ SQUAD_POLL_INTERVAL_MS: value })).toBe(1000);
  });
}
