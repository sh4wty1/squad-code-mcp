#!/usr/bin/env bun
/**
 * squad tui demo
 *
 * Opens the TUI over the log of one test frame, without a broker and without a squad: it
 * serves the log at GET /events on a free port, with the times moved so that the clock
 * of the frame is now, and starts the TUI against it.
 *
 *   bun tui/demo.ts [frame]
 */

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOGS, PRICES } from "../test/frames/logs.ts";

const id = process.argv[2] ?? "01";
const log = LOGS[id];
if (!log) {
  console.error(`there is no frame "${id}". The frames: ${Object.keys(LOGS).sort().join(" ")}`);
  process.exit(1);
}

const shift = Date.now() - log.now;
const events = log.events.map((e) => ({ ...e, ts: e.ts + shift })).sort((a, b) => a.seq - b.seq);
// The frames have fractions as seq, and the reader of the TUI takes an integer as cursor
const last_seq = Math.ceil(events.at(-1)?.seq ?? 0);

const server = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname !== "/events") return new Response("not found", { status: 404 });
    const after = Number(url.searchParams.get("after") ?? 0);
    return Response.json({ events: events.filter((e) => e.seq > after), last_seq });
  },
});

// The frames count their tokens in a model of their own
const prices = join(tmpdir(), "squad-tui-demo-prices.json");
writeFileSync(prices, JSON.stringify(PRICES));

const tui = Bun.spawn(["bun", join(import.meta.dir, "..", "tui.ts")], {
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, SQUAD_PORT: String(server.port), SQUAD_PRICES: prices },
});
process.exit(await tui.exited);
