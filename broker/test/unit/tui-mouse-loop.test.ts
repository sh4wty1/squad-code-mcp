import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { config, start } from "../../tui.ts";
import { CLEAR, ENTER, LEAVE } from "../../tui/ansi.ts";
import { feed } from "../../tui/feed.ts";
import { START } from "../../tui/keys.ts";
import type { Fetch } from "../../tui/reader.ts";
import type { Ui, View } from "../../tui/view.ts";
import { LOGS, PRICES } from "../frames/logs.ts";

// The mouse in the loop of the TUI: what it asks of the terminal, and what a report that
// reaches the input does to the screen.

const BROKER = "http://127.0.0.1:7900";
// The sequences of the spec, as the terminal gets them
const ON = "\x1b[?1000h\x1b[?1006h";
const OFF = "\x1b[?1006l\x1b[?1000l";
// The human credential of the tests: no screen has this text
const TOKEN = "c0ffee".repeat(10) + "beef";

async function until(check: () => boolean, what: string) {
  const deadline = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await Bun.sleep(2);
  }
}

// What the escapes written so far leave on a terminal: its lines, without colors
function screen(out: string): string[] {
  const lines: string[] = [];
  let y = 0;
  for (const part of out.split(/(\x1b\[[0-9;?]*[A-Za-z])/)) {
    const at = /^\x1b\[(\d+);1H$/.exec(part);
    if (at) lines[(y = Number(at[1]) - 1)] = "";
    else if (part === CLEAR) lines.length = 0;
    // No text between two escapes writes no line: after an erase, the cursor is still where it was
    else if (part && !part.startsWith("\x1b[")) lines[y] = (lines[y] ?? "") + part;
  }
  return Array.from(lines, (line) => (line ?? "").trimEnd());
}

// The loop over a broker that is a function, a clock that is a variable and a terminal
// that is a string, with the mouse on unless the test turns it off
function launch(frame = "01", settings: { mouse?: boolean; intervalMs?: number } = {}) {
  const state = {
    events: LOGS[frame]!.events as SquadEvent[],
    now: LOGS[frame]!.now,
    size: { cols: 120, rows: 40 },
    // what reading the size of the terminal throws, when set: an error in the loop
    broken: null as Error | null,
    // what the broker answers instead of the log, when set
    answer: null as (() => Promise<Response>) | null,
    // the human credential of the file; null without the file
    token: TOKEN as string | null,
    // how many times the credential was read
    tokens: 0,
    // the body of each POST
    posts: [] as { url: string; body: unknown }[],
    out: "",
    raw: [] as boolean[],
    calls: [] as { method: string; url: string }[],
  };
  const lines = () => screen(state.out);
  const t = Object.assign(state, {
    lines,
    // The view of the screens the loop draws, at the clock of now
    view: (ui: Partial<Ui> = {}, log = state.events): View => ({ squad: squad(log, state.now), rows: feed(log), ui: { ...START, ...ui }, project: "portal-89fm", down: null, prices: PRICES }),
    reads: (n: number) => until(() => state.calls.length >= n, `read ${n}`),
    shows: (drawn: string[], what: string) => until(() => Bun.deepEquals(lines(), drawn), what),
  });
  const fetch: Fetch = async (url, init) => {
    t.calls.push({ method: init?.method ?? "GET", url });
    if (t.answer) return t.answer();
    if (init?.method === "POST") {
      t.posts.push({ url, body: JSON.parse(String(init.body)) });
      return Response.json({ ok: true, seq: 999 });
    }
    const after = Number(new URL(url).searchParams.get("after"));
    return Response.json({ events: t.events.filter((e) => e.seq > after), last_seq: Math.max(0, ...t.events.map((e) => e.seq)) });
  };
  const tui = start(
    {
      fetch,
      now: () => t.now,
      size: () => {
        if (t.broken) throw t.broken;
        return t.size;
      },
      write: (text) => (t.out += text),
      raw: (on) => t.raw.push(on),
      project: "portal-89fm",
      token: () => (t.tokens++, t.token),
    },
    { url: BROKER, intervalMs: 5, glyphs: new Map(), prices: PRICES, mouse: true, ...settings }
  );
  return { ...tui, t };
}

test("CLK-01: with the mouse on the loop asks for the reports of button and then for the SGR coordinates, right after it enters the alternate screen", () => {
  const { t, stop } = launch();
  try {
    expect(ENTER.startsWith("\x1b[?1049h")).toBe(true);
    expect(t.out).toBe(ENTER + "\x1b[?1000h" + "\x1b[?1006h");
  } finally {
    stop();
  }
});

test("CLK-52: with the mouse off the loop enters the alternate screen and asks for no report", () => {
  const { t, stop } = launch("01", { mouse: false });
  try {
    expect(t.out).toBe(ENTER);
  } finally {
    stop();
  }
});

// Each way out of the loop, and whether it ends in an error
const EXITS: [how: string, quit: (tui: ReturnType<typeof launch>) => void, fails: boolean][] = [
  ["q", (tui) => tui.key("q"), false],
  ["ctrl+c", (tui) => tui.key("\x03"), false],
  ["stop, what SIGTERM calls", (tui) => tui.stop(), false],
  ["an error in the loop", (tui) => ((tui.t.broken = new Error("the terminal is gone")), tui.resize()), true],
];

for (const mouse of [true, false]) {
  for (const [how, quit, fails] of EXITS) {
    test(`CLK-02: leaving by ${how} with the mouse ${mouse ? "on" : "off"} takes the request for the reports back before leaving the alternate screen`, async () => {
      const tui = launch("01", { mouse });
      await until(() => tui.t.lines().length === 40, "the first drawing");
      quit(tui);
      if (fails) await expect(tui.done).rejects.toThrow("the terminal is gone");
      else await tui.done;
      expect(LEAVE.endsWith("\x1b[?1049l")).toBe(true);
      expect(tui.t.out.endsWith("\x1b[?1006l" + "\x1b[?1000l" + LEAVE)).toBe(true);
      // Once, and nothing asks for the reports again after it
      expect(tui.t.out.split(OFF)).toHaveLength(2);
      expect(tui.t.out.split(ON)).toHaveLength(mouse ? 2 : 1);
      expect(tui.t.raw).toEqual([true, false]);
    });
  }
}

for (const [value, on] of [[undefined, true], ["", true], ["1", true], ["0", false]] as const) {
  test(`CLK-52: config with SQUAD_TUI_MOUSE ${JSON.stringify(value)} gives the mouse ${on ? "on" : "off"}`, () => {
    expect(config({ SQUAD_TUI_MOUSE: value }).mouse).toBe(on);
  });
}

test("CLK-53: config with SQUAD_TUI_MOUSE sim throws with the variable and the value", () => {
  expect(() => config({ SQUAD_TUI_MOUSE: "sim" })).toThrow('SQUAD_TUI_MOUSE: "sim" is not 0 or 1');
});
