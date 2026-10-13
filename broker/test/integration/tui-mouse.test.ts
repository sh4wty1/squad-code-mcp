import { expect, test } from "bun:test";
import { join } from "node:path";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import { START } from "../../tui/keys.ts";
import { main } from "../../tui/screens/main.ts";
import { topology } from "../../tui/screens/topology.ts";
import type { View } from "../../tui/view.ts";
import { PRICES } from "../frames/logs.ts";
import { cellOf, click } from "../terminal.ts";
import { BROKER_DIR, cleanEnv, FEATURE, freePort, openFeature, post, startBroker, waitFor } from "./helpers.ts";

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

test("CLK-05, CLK-02: on a terminal over a real broker, a click on the tab 2 topologia draws the topology and a click on q sair exits with 0, the request taken back before the alternate screen is left", async () => {
  const broker = await startBroker();
  let tui: ReturnType<typeof onTerminal> | undefined;
  try {
    const mother = await post(broker.url, "/register", { pid: process.pid, cwd: "/work/wt", git_root: "/work/importer/.git", name: "mother", role: "mother" });
    await openFeature(broker.url, mother.json.id);
    const { events } = (await (await fetch(`${broker.url}/events`)).json()) as { events: SquadEvent[] };
    // The screens the TUI draws from this log: where the tab and the shortcut are on them
    const view = (screen: View["ui"]["screen"]): View => ({ squad: squad(events, Date.now()), rows: feed(events), ui: { ...START, screen }, project: null, down: null, prices: PRICES });
    const tab = cellOf(main(view("main")).text(), "2 topologia");
    const quit = cellOf(topology(view("topology")).text(), "q sair");

    tui = onTerminal({ SQUAD_PORT: String(broker.port) });
    const { proc, seen } = tui;
    // The colors split the line: the text is what is left without the escapes
    const text = () => seen.text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
    await waitFor(() => text().includes(FEATURE.title), "the title of the feature on the terminal");
    expect(text()).not.toContain("topologia · estrela");

    proc.terminal!.write(click(tab));
    await waitFor(() => text().includes("topologia · estrela"), "the topology on the terminal");

    proc.terminal!.write(click(quit));
    expect(await proc.exited).toBe(0);
    await waitFor(() => seen.text.includes(BACK), "the terminal to get the alternate screen back");
    expect(seen.text.lastIndexOf("\x1b[?1000l")).toBeGreaterThan(seen.text.indexOf(ON));
    expect(seen.text.indexOf(BACK)).toBeGreaterThan(seen.text.lastIndexOf("\x1b[?1000l"));
    // The broker got nothing from the TUI: the log is the one the test wrote
    const after = (await (await fetch(`${broker.url}/events`)).json()) as { events: SquadEvent[] };
    expect(after.events.map((e) => e.seq)).toEqual(events.map((e) => e.seq));
  } finally {
    tui?.proc.kill();
    await broker.stop();
  }
}, 30_000);
