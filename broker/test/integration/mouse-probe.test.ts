import { expect, test } from "bun:test";
import { join } from "node:path";
import { BROKER_DIR, cleanEnv, waitFor } from "./helpers.ts";

const PROBE = join(BROKER_DIR, "tui", "mouse-probe.ts");
const ON = "\x1b[?1000h\x1b[?1006h";
const OFF = "\x1b[?1006l\x1b[?1000l";

// The probe on a terminal of 120×40 in the place of its standard input and output
function onTerminal() {
  const decoder = new TextDecoder();
  const seen = { text: "" };
  const proc = Bun.spawn([process.execPath, PROBE], {
    env: cleanEnv({}),
    terminal: { cols: 120, rows: 40, data: (_terminal, data) => void (seen.text += decoder.decode(data, { stream: true })) },
  });
  return { proc, seen };
}

test("CLK-17: outside a terminal the probe exits with 1 and asks the terminal for nothing", async () => {
  const proc = Bun.spawn([process.execPath, PROBE], { env: cleanEnv({}), stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  expect(await proc.exited).toBe(1);
  expect(err).toContain("mouse probe needs a terminal");
  expect(out).toBe("");
});

test("CLK-17: on a terminal the probe asks for the reports, writes the line of each one it gets, and q takes the request back and exits with 0", async () => {
  const { proc, seen } = onTerminal();
  try {
    await waitFor(() => seen.text.includes("ctrl+c sai"), "the probe to ask for the reports");
    expect(seen.text).toContain(ON);
    expect(seen.text).not.toContain(OFF);

    proc.terminal!.write("\x1b[<0;12;5M");
    await waitFor(() => seen.text.includes("botão 0 · coluna 12 · linha 5 · pressão"), "the line of the press");
    proc.terminal!.write("\x1b[<0;12;5m");
    await waitFor(() => seen.text.includes("botão 0 · coluna 12 · linha 5 · soltura"), "the line of the release");
    proc.terminal!.write("\x1b[<65;120;40M");
    await waitFor(() => seen.text.includes("botão 65 · coluna 120 · linha 40 · pressão"), "the line of the wheel");

    proc.terminal!.write("q");
    expect(await proc.exited).toBe(0);
    expect(seen.text.indexOf(OFF)).toBeGreaterThan(seen.text.indexOf(ON));
  } finally {
    proc.kill();
  }
}, 30_000);

test("CLK-17: ctrl+c takes the request back and exits with 0 too", async () => {
  const { proc, seen } = onTerminal();
  try {
    await waitFor(() => seen.text.includes("ctrl+c sai"), "the probe to ask for the reports");
    proc.terminal!.write("\x03");
    expect(await proc.exited).toBe(0);
    expect(seen.text).toContain(OFF);
  } finally {
    proc.kill();
  }
}, 30_000);
