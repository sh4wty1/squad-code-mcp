#!/usr/bin/env bun
/**
 * squad tui mouse probe
 *
 * Asks the terminal for the mouse reports the TUI reads and writes one line for each one
 * that reaches the standard input: the button, the column, the line, and whether it was
 * pressed or released. What arrives and is not a report is written as it came, so that a
 * terminal that answers in another format shows it.
 *
 * It says what reaches the process, which no test can: an agent does not click.
 *
 *   bun tui/mouse-probe.ts        q or ctrl+c leaves
 */

import { MOUSE_OFF, MOUSE_ON } from "./ansi.ts";

const REPORT = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
// The start of a report whose end has not arrived
const UNFINISHED = /\x1b(?:\[(?:<[0-9;]*)?)?$/;

// The lines of what the input brought, the end of it that may be a report cut by the read,
// and whether a key that leaves the probe came
export function read(input: string): { lines: string[]; rest: string; quit: boolean } {
  const rest = UNFINISHED.exec(input)?.[0] ?? "";
  const whole = input.slice(0, input.length - rest.length);
  const lines: string[] = [];
  let quit = false;
  let at = 0;
  const other = (text: string) => {
    if (!text) return;
    if (/[q\x03]/.test(text)) quit = true;
    lines.push(`outra entrada: ${JSON.stringify(text)}`);
  };
  for (const match of whole.matchAll(REPORT)) {
    other(whole.slice(at, match.index));
    lines.push(`botão ${match[1]} · coluna ${match[2]} · linha ${match[3]} · ${match[4] === "M" ? "pressão" : "soltura"}`);
    at = match.index + match[0].length;
  }
  other(whole.slice(at));
  return { lines, rest, quit };
}

if (import.meta.main) {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || !stdout.isTTY) {
    console.error("mouse probe needs a terminal on stdin and stdout");
    process.exit(1);
  }
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(MOUSE_ON + "clique, solte e role a roda nesta janela · q ou ctrl+c sai\r\n");
  let pending = "";
  stdin.on("data", (chunk) => {
    const { lines, rest, quit } = read(pending + chunk.toString());
    pending = rest;
    for (const line of lines) stdout.write(line + "\r\n");
    if (!quit) return;
    stdout.write(MOUSE_OFF);
    stdin.setRawMode(false);
    stdin.pause();
    process.exit(0);
  });
}
