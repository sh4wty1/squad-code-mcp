#!/usr/bin/env bun
/**
 * squad tui
 *
 * Reads the log of the broker every second and draws the squad in the terminal: the feed,
 * the agents, the tickets, the topology, the thread of a ticket and the questions that wait
 * for the dev. It writes one thing: the answer of the dev to a question.
 *
 *   bun tui.ts
 */

import { readFileSync } from "node:fs";
import { projectOf } from "./feature.ts";
import { brokerUrl, tokenPath } from "./shared/config.ts";
import type { SquadEvent } from "./shared/contract.ts";
import { squad } from "./shared/derive.ts";
import { getGitRoot } from "./shared/git.ts";
import { CLEAR, ENTER, LEAVE, paint, parseGlyphs } from "./tui/ansi.ts";
import { prices, readIntervalMs, type PriceTable } from "./tui/config.ts";
import { feed, type FeedRow } from "./tui/feed.ts";
import type { Grid } from "./tui/grid.ts";
import { keysOf, press, settle, START, sync, visible } from "./tui/keys.ts";
import { createReader, type Fetch } from "./tui/reader.ts";
import { answer } from "./tui/screens/answer.ts";
import { down as frozen } from "./tui/screens/down.ts";
import { help } from "./tui/screens/help.ts";
import { main } from "./tui/screens/main.ts";
import { questions } from "./tui/screens/questions.ts";
import { small } from "./tui/screens/small.ts";
import { thread } from "./tui/screens/thread.ts";
import { topology } from "./tui/screens/topology.ts";
import type { Ui, View } from "./tui/view.ts";
import { createWriter } from "./tui/writer.ts";

const SCREENS = { main, topology, thread, help, questions };

export interface Settings {
  url: string;
  intervalMs: number;
  glyphs: Map<string, string>;
  prices: PriceTable;
}

// Throws with the message of the setting that is not valid
export function config(env: Record<string, string | undefined> = process.env): Settings {
  return { url: brokerUrl(env), intervalMs: readIntervalMs(env), glyphs: parseGlyphs(env.SQUAD_TUI_GLYPHS), prices: prices(env) };
}

// The name of the repository of the directory, by the rule of the broker; null outside one
export async function project(cwd: string): Promise<string | null> {
  const root = await getGitRoot(cwd);
  return root === null ? null : projectOf(root, cwd);
}

// The human credential as its file has it now; null when the file is not there or is empty
export function credential(env: Record<string, string | undefined> = process.env): string | null {
  try {
    return readFileSync(tokenPath(env), "utf8").trim() || null;
  } catch {
    return null;
  }
}

// The world the loop touches
export interface Io {
  fetch: Fetch;
  now: () => number;
  size: () => { cols: number; rows: number };
  write: (text: string) => void;
  // puts the input in raw mode, and takes it out
  raw: (on: boolean) => void;
  project: string | null;
  // the human credential, read when an answer is sent; null without one
  token: () => string | null;
}

// Takes the terminal, reads the broker at each interval and draws. `key` takes what the
// input sent, `resize` draws everything again, `stop` gives the terminal back. `done`
// settles after the terminal is back: it rejects with the error that stopped the loop.
export function start(io: Io, settings: Settings) {
  const reader = createReader({ fetch: io.fetch, url: settings.url });
  const writer = createWriter({ fetch: io.fetch, url: settings.url });
  let ui: Ui = START;
  let log: SquadEvent[] = [];
  // The lines of `fed`, and the ones on the screen: they differ while the feed is paused
  let fed: SquadEvent[] | null = null;
  let fresh: FeedRow[] = [];
  let rows: FeedRow[] = [];
  let down: View["down"] = null;
  let prev: Grid | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let pending = "";
  let escapeTimer: ReturnType<typeof setTimeout> | undefined;
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const done = new Promise<void>((yes, no) => ((resolve = yes), (reject = no)));

  function view(): View {
    // The reader gives another list when the log changes
    if (fed !== log) fresh = feed((fed = log));
    rows = visible(ui, fresh, rows);
    return { squad: squad(log, io.now()), rows, ui, project: io.project, down, prices: settings.prices };
  }

  // The screen of the state, under the modal of answer when one is open
  function screen(): Grid {
    const seen = view();
    return answer(SCREENS[ui.screen](seen), seen);
  }

  function draw(whole = false) {
    const { cols, rows: lines } = io.size();
    const next = cols < 120 || lines < 40 ? small(cols, lines) : down ? frozen(view()) : screen();
    io.write((whole ? CLEAR : "") + paint(next, whole ? null : prev, settings.glyphs));
    prev = next;
  }

  function end(settle: () => void) {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    clearTimeout(escapeTimer);
    io.write(LEAVE);
    io.raw(false);
    settle();
  }
  const stop = () => end(resolve);
  const fail = (error: unknown) => end(() => reject(error));

  async function tick() {
    const read = await reader.poll();
    if (stopped) return;
    if (read.ok) {
      log = read.events;
      down = null;
      ui = sync(ui, view());
    } else down = { since: down?.since ?? io.now(), attempt: (down?.attempt ?? 0) + 1 };
    draw();
    timer = setTimeout(() => tick().catch(fail), settings.intervalMs);
  }

  // Sends the answer the keys left in `send`, with the credential as its file has it now:
  // the broker may have written it after the TUI started. The token goes nowhere else.
  function post() {
    const sent = ui.send!;
    const token = io.token();
    if (token === null) return void (ui = settle(ui, null, view()));
    writer
      .answer(token, sent.question_id, sent.answer)
      .then((result) => {
        if (stopped) return;
        ui = settle(ui, result, view());
        draw();
      })
      .catch(fail);
  }

  function dispatch(chunk: string) {
    if (stopped) return;
    try {
      const seen = view();
      const sending = ui.send;
      for (const k of keysOf(chunk, ui)) {
        const next = press(ui, k, { ...seen, ui });
        if (!next) return stop();
        ui = next;
      }
      // One POST for each answer: the one on its way stays in `send` until it is settled
      if (ui.send && ui.send !== sending) post();
      draw();
    } catch (error) {
      fail(error);
    }
  }

  function key(chunk: string) {
    if (stopped) return;
    clearTimeout(escapeTimer);
    const input = pending + chunk;
    // stdin chunks can end inside a CSI sequence. Wait briefly for its remaining bytes;
    // a lone Escape must still navigate back when no more input arrives.
    pending = /\x1b(?:\[[0-9;]*)?$/u.exec(input)?.[0] ?? "";
    const complete = input.slice(0, input.length - pending.length);
    if (complete) dispatch(complete);
    if (pending && !stopped) escapeTimer = setTimeout(() => {
      const tail = pending;
      pending = "";
      dispatch(tail);
    }, 40);
  }

  function resize() {
    if (stopped) return;
    try {
      draw(true);
    } catch (error) {
      fail(error);
    }
  }

  io.raw(true);
  io.write(ENTER);
  tick().catch(fail);
  return { key, resize, stop, done };
}

if (import.meta.main) {
  const { stdin, stdout } = process;
  let settings: Settings;
  try {
    settings = config();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  if (!stdin.isTTY || !stdout.isTTY) {
    console.error("tui needs a terminal on stdin and stdout");
    process.exit(1);
  }
  const tui = start(
    {
      fetch: (url, init) => fetch(url, init),
      now: Date.now,
      size: () => ({ cols: stdout.columns, rows: stdout.rows }),
      write: (text) => void stdout.write(text),
      raw: (on) => {
        stdin.setRawMode(on);
        if (on) stdin.resume();
        else stdin.pause();
      },
      project: await project(process.cwd()),
      token: credential,
    },
    settings
  );
  stdin.on("data", (chunk) => tui.key(chunk.toString()));
  stdout.on("resize", tui.resize);
  // In raw mode ctrl+c is a key. SIGTERM never fires on Windows, where listening is harmless.
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => tui.stop());
  process.on("uncaughtException", (error) => {
    tui.stop();
    console.error(error);
    process.exit(1);
  });
  try {
    await tui.done;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
  process.exit(0);
}
