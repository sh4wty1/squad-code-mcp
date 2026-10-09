// Settings of the TUI: the price table and how often it reads the broker.

import { readFileSync } from "node:fs";
import { join } from "node:path";

type Env = Record<string, string | undefined>;

// One number per kind of token: tokens in a total, dollars per million tokens in a price
export interface Amounts {
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
}

export type PriceTable = Record<string, Amounts>;

const KINDS = ["input", "output", "cache_write", "cache_read"] as const;

// The table of the file SQUAD_PRICES points at, or the one next to this module: first-party
// rates, the cache write at the 5-minute rate. A model outside the table costs nothing.
export function prices(env: Env = process.env): PriceTable {
  const path = env.SQUAD_PRICES || join(import.meta.dir, "prices.json");
  let table: unknown;
  try {
    table = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`SQUAD_PRICES: could not read ${path}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const isPrice = (price: any) => price !== null && typeof price === "object" && KINDS.every((kind) => typeof price[kind] === "number");
  if (table === null || typeof table !== "object" || Array.isArray(table) || !Object.values(table).every(isPrice)) {
    throw new Error(`SQUAD_PRICES: ${path} is not a JSON object of model to { input, output, cache_write, cache_read } numbers`);
  }
  return table as PriceTable;
}

// Dollars of the tokens of each model
export function cost(totals: Record<string, Amounts>, table: PriceTable): number {
  let dollars = 0;
  for (const [model, tokens] of Object.entries(totals)) {
    const price = table[model];
    if (price) for (const kind of KINDS) dollars += (tokens[kind] * price[kind]) / 1_000_000;
  }
  return dollars;
}

// How often the TUI reads the broker: SQUAD_POLL_INTERVAL_MS when it is a positive integer
export function readIntervalMs(env: Env = process.env): number {
  const value = env.SQUAD_POLL_INTERVAL_MS ?? "";
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : 1000;
}
