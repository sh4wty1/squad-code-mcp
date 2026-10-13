import { expect, test } from "bun:test";
import { join } from "node:path";
import { BROKER_DIR, cleanEnv, freePort, waitFor } from "./helpers.ts";

// The mouse through the process of the TUI: what `bun tui.ts` asks of a real terminal.

const TUI = join(BROKER_DIR, "tui.ts");
const ON = "\x1b[?1000h\x1b[?1006h";
const OFF = "\x1b[?1006l\x1b[?1000l";
const ALTERNATE = "\x1b[?1049h";
const BACK = "\x1b[?1049l";

// `bun tui.ts` on a terminal of 120×40 in the place of its standard input and output, with
// the settings given. `seen.text` is what it wrote to the terminal.
function onTerminal(env: Record<string, string>) {
  const decoder = new TextDecoder();
  const seen = { text: "" };
  const proc = Bun.spawn([process.execPath, TUI], {
    env: cleanEnv(env),
    terminal: { cols: 120, rows: 40, data: (_terminal, data) => void (seen.text += decoder.decode(data, { stream: true })) },
  });
  return { proc, seen };
}

test("CLK-53: SQUAD_TUI_MOUSE sim exits 1 with the variable and the value, before the alternate screen", async () => {
  const proc = Bun.spawn([process.execPath, TUI], { env: cleanEnv({ SQUAD_TUI_MOUSE: "sim" }), stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  expect(await proc.exited).toBe(1);
  expect(err.trim()).toBe('SQUAD_TUI_MOUSE: "sim" is not 0 or 1');
  expect(out).toBe("");
});

test("CLK-53: on a terminal SQUAD_TUI_MOUSE sim exits 1 without entering the alternate screen nor asking for a report", async () => {
  const { proc, seen } = onTerminal({ SQUAD_TUI_MOUSE: "sim", SQUAD_PORT: String(await freePort()) });
  try {
    expect(await proc.exited).toBe(1);
    await waitFor(() => seen.text.includes("SQUAD_TUI_MOUSE"), "the message on the terminal");
    expect(seen.text).toContain('SQUAD_TUI_MOUSE: "sim" is not 0 or 1');
    expect(seen.text).not.toContain(ALTERNATE);
    expect(seen.text).not.toContain("\x1b[?1000h");
  } finally {
    proc.kill();
  }
}, 30_000);

test("CLK-01, CLK-02: without SQUAD_TUI_MOUSE the TUI asks the terminal for the reports after it enters the alternate screen, and q takes the request back before it leaves", async () => {
  const { proc, seen } = onTerminal({ SQUAD_PORT: String(await freePort()) });
  try {
    // the key of the footer of every screen: the TUI drew
    await waitFor(() => seen.text.includes("sair"), "the TUI to draw on the terminal");
    expect(seen.text.indexOf(ALTERNATE)).toBeGreaterThanOrEqual(0);
    expect(seen.text.indexOf(ON)).toBeGreaterThan(seen.text.indexOf(ALTERNATE));
    expect(seen.text).not.toContain(OFF);

    proc.terminal!.write("q");
    expect(await proc.exited).toBe(0);
    await waitFor(() => seen.text.includes(BACK), "the terminal to get the alternate screen back");
    expect(seen.text.indexOf(OFF)).toBeGreaterThan(seen.text.indexOf(ON));
    expect(seen.text.indexOf(BACK)).toBeGreaterThan(seen.text.indexOf(OFF));
  } finally {
    proc.kill();
  }
}, 30_000);

test("CLK-52, CLK-02: with SQUAD_TUI_MOUSE 0 the TUI asks for no report, and q still takes the request back before it leaves the alternate screen", async () => {
  const { proc, seen } = onTerminal({ SQUAD_TUI_MOUSE: "0", SQUAD_PORT: String(await freePort()) });
  try {
    await waitFor(() => seen.text.includes("sair"), "the TUI to draw on the terminal");
    proc.terminal!.write("q");
    expect(await proc.exited).toBe(0);
    await waitFor(() => seen.text.includes(BACK), "the terminal to get the alternate screen back");
    expect(seen.text).toContain(ALTERNATE);
    expect(seen.text).not.toContain("\x1b[?1000h");
    expect(seen.text).not.toContain("\x1b[?1006h");
    expect(seen.text.indexOf(OFF)).toBeGreaterThanOrEqual(0);
    expect(seen.text.indexOf(BACK)).toBeGreaterThan(seen.text.indexOf(OFF));
  } finally {
    proc.kill();
  }
}, 30_000);
