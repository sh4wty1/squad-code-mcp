#!/usr/bin/env bun
/**
 * squad tui demo
 *
 * Opens the TUI over the log of one test frame, without a broker and without a squad: it
 * serves the log at GET /events on a free port, with the times moved so that the clock
 * of the frame is now, takes the answers of the dev at POST /answer, and starts the TUI
 * against it with a credential of its own.
 *
 *   bun tui/demo.ts [frame]
 */

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qid, type SquadEvent } from "../shared/contract.ts";
import { LOGS, PRICES, type FrameLog } from "../test/frames/logs.ts";

// The broker of the demo, on a free port: the log of the frame in memory, and the answers
// of who has `token` added to it
export function serve(log: FrameLog, token: string) {
  const shift = Date.now() - log.now;
  const events = log.events.map((e) => ({ ...e, ts: e.ts + shift })).sort((a, b) => a.seq - b.seq);
  // The frames have fractions as seq, and the reader of the TUI takes an integer as cursor
  const last = () => Math.ceil(events.at(-1)?.seq ?? 0);

  // What the broker answers to the answer of the dev. No deadline runs here: a question is
  // closed when the log has an answer to it.
  function answer(body: any) {
    if (body.human_token !== token) return { ok: false, error: "invalid_token" };
    const asked = events.find((e): e is Extract<SquadEvent, { kind: "question" }> => e.kind === "question" && e.question_id === body.question_id);
    if (!asked) return { ok: false, error: "invalid_field" };
    if (events.some((e) => e.kind === "answer" && e.question_id === asked.question_id)) return { ok: false, error: "question_closed" };
    const seq = last() + 1;
    events.push({
      seq,
      ts: Date.now(),
      feature_id: asked.feature_id,
      from: "human",
      role_from: "human",
      to: asked.asked_by,
      summary: `${qid(asked.question_id)}: ${body.answer}`.slice(0, 80),
      body: body.answer,
      ticket_ref: asked.ticket_ref,
      kind: "answer",
      question_id: asked.question_id,
      answer: body.answer,
      resolved_by: "human",
    });
    return { ok: true, seq };
  }

  return Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/answer") return Response.json(answer(await req.json()));
      if (url.pathname !== "/events") return new Response("not found", { status: 404 });
      const after = Number(url.searchParams.get("after") ?? 0);
      return Response.json({ events: events.filter((e) => e.seq > after), last_seq: last() });
    },
  });
}

if (import.meta.main) {
  const id = process.argv[2] ?? "01";
  const log = LOGS[id];
  if (!log) {
    console.error(`there is no frame "${id}". The frames: ${Object.keys(LOGS).sort().join(" ")}`);
    process.exit(1);
  }

  // The frames count their tokens in a model of their own
  const prices = join(tmpdir(), "squad-tui-demo-prices.json");
  writeFileSync(prices, JSON.stringify(PRICES));
  // The credential of the demo, in a file of its own: the one of the user is not read
  const token = crypto.randomUUID();
  const tokenFile = join(tmpdir(), "squad-tui-demo.token");
  writeFileSync(tokenFile, token);

  const server = serve(log, token);
  const tui = Bun.spawn(["bun", join(import.meta.dir, "..", "tui.ts")], {
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, SQUAD_PORT: String(server.port), SQUAD_PRICES: prices, SQUAD_TOKEN_FILE: tokenFile },
  });
  process.exit(await tui.exited);
}
