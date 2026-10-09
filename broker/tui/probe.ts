#!/usr/bin/env bun
/**
 * squad tui glyph probe
 *
 * Asks the terminal how many cells each glyph of the TUI takes: writes the glyph at
 * column 1 and reads the cursor column back (DSR). The buffer treats every glyph as
 * one cell, so a glyph the terminal counts as two shifts the rest of its line.
 *
 * It measures what the terminal counts, not what the font draws: a glyph counted as
 * one cell may still be drawn wider than the cell by a fallback font.
 *
 *   bun tui/probe.ts [--out <file.json>]
 */

import { writeFileSync } from "node:fs";
import { GLYPHS } from "./glyphs.ts";

function cursorColumn(): Promise<number> {
  return new Promise((resolve, reject) => {
    let seen = "";
    const timer = setTimeout(() => reject(new Error("the terminal did not answer the cursor query")), 2000);
    function onData(chunk: Buffer) {
      seen += chunk.toString("latin1");
      const match = /\x1b\[\d+;(\d+)R/.exec(seen);
      if (!match) return;
      clearTimeout(timer);
      process.stdin.off("data", onData);
      resolve(parseInt(match[1]!, 10));
    }
    process.stdin.on("data", onData);
    process.stdout.write("\x1b[6n");
  });
}

export async function measure(glyphs: string[]): Promise<Record<string, number>> {
  const widths: Record<string, number> = {};
  for (const glyph of glyphs) {
    process.stdout.write("\r\x1b[2K" + glyph);
    widths[glyph] = (await cursorColumn()) - 1;
  }
  process.stdout.write("\r\x1b[2K");
  return widths;
}

if (import.meta.main) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("probe needs a terminal on stdin and stdout");
    process.exit(1);
  }
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let widths: Record<string, number>;
  try {
    widths = await measure(GLYPHS);
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
  const wide = Object.entries(widths).filter(([, w]) => w !== 1);
  for (const [glyph, w] of Object.entries(widths)) console.log(`${glyph}  U+${glyph.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}  ${w}`);
  console.log(wide.length === 0 ? "every glyph takes one cell" : `not one cell: ${wide.map(([g]) => g).join(" ")}`);
  const out = process.argv.indexOf("--out");
  if (out > 0) {
    writeFileSync(process.argv[out + 1]!, JSON.stringify({ term: process.env.WT_SESSION ? "windows-terminal" : (process.env.TERM ?? "unknown"), widths }, null, 2));
  }
  process.exit(wide.length === 0 ? 0 : 2);
}
