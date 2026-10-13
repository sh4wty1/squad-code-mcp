import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { config, start } from "../../tui.ts";
import { ENTER, LEAVE } from "../../tui/ansi.ts";
import { feed } from "../../tui/feed.ts";
import { press, START } from "../../tui/keys.ts";
import type { Fetch } from "../../tui/reader.ts";
import { answer } from "../../tui/screens/answer.ts";
import { main } from "../../tui/screens/main.ts";
import { questions } from "../../tui/screens/questions.ts";
import { topology } from "../../tui/screens/topology.ts";
import type { Ui, View } from "../../tui/view.ts";
import { LOGS, PRICES } from "../frames/logs.ts";
import { cellOf, click, screen, wheelDown, wheelUp } from "../terminal.ts";

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

// The state of the screen after keys pressed one after the other on the view of the loop
function after(t: ReturnType<typeof launch>["t"], keys: string[], from: Partial<Ui> = {}): Ui {
  return keys.reduce<Ui>((ui, key) => press(ui, key, t.view(ui))!, { ...START, ...from });
}

// The tab of questions as the loop draws it, under the modal of answer when one is open
const tab = (v: View): string[] => answer(questions(v), v).text();

test("CLK-05: a click on the tab 2 topologia draws the topology, like the key 2", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    key(click(cellOf(t.lines(), "2 topologia")));
    expect(after(t, ["2"]).screen).toBe("topology");
    expect(t.lines()).toEqual(topology(t.view(after(t, ["2"]))).text());
    expect(t.lines().some((line) => line.includes("topologia · estrela"))).toBe(true);
  } finally {
    stop();
  }
});

test("CLK-05: a click on a line of the feed selects it and the detail shows its message", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    expect(t.lines()[3]).toContain("nenhuma mensagem selecionada");
    const row = feed(t.events).find((r) => r.event.kind === "task" && r.event.to === "worker-1")!;
    key(click(cellOf(t.lines(), "14:20:11")));
    expect(t.lines()).toEqual(main(t.view({ selected: row.seq, focus: 1 })).text());
    expect(t.lines()[3]).not.toContain("nenhuma mensagem selecionada");
  } finally {
    stop();
  }
});

test("CLK-05: one step of the wheel over the feed moves the selection by three lines, up and down", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    const rows = feed(t.events);
    // With no line selected the first of the three selects the last line
    key(wheelUp(cellOf(t.lines(), "14:20:11")));
    expect(t.lines()).toEqual(main(t.view({ selected: rows.at(-3)!.seq, focus: 1 })).text());
    key(wheelUp(cellOf(t.lines(), "14:20:11")));
    expect(t.lines()).toEqual(main(t.view({ selected: rows.at(-6)!.seq, focus: 1 })).text());
    key(wheelDown(cellOf(t.lines(), "14:20:11")));
    expect(t.lines()).toEqual(main(t.view({ selected: rows.at(-3)!.seq, focus: 1 })).text());
  } finally {
    stop();
  }
});

test("CLK-14: after a read that adds a line to the feed, a click on the same cell selects the line the new drawing has there", async () => {
  const all = LOGS["01"]!.events;
  const { t, key, stop } = launch();
  try {
    // The log without its last event: the last line of the feed is the one before it
    t.events = all.slice(0, -1);
    const [older, newer] = [feed(all).at(-2)!, feed(all).at(-1)!];
    await t.shows(main(t.view()).text(), "the main screen without the last event");
    const cell = cellOf(t.lines(), "14:31:36");

    t.events = all;
    await t.shows(main(t.view()).text(), "the main screen with the new line");
    expect(cellOf(t.lines(), "14:31:48")).toEqual(cell);
    key(click(cell));
    expect(newer.seq).not.toBe(older.seq);
    expect(t.lines()).toEqual(main(t.view({ selected: newer.seq, focus: 1 })).text());
  } finally {
    stop();
  }
});

for (const size of [{ cols: 119, rows: 40 }, { cols: 120, rows: 39 }]) {
  test(`CLK-12, CLK-54: on a terminal of ${size.cols}×${size.rows} a click, the wheel, a click on the cell of q sair and m change nothing, do not quit and send nothing`, async () => {
    const { t, key, resize, stop } = launch();
    try {
      await t.shows(main(t.view()).text(), "the main screen");
      const [tab2, line, quit] = [cellOf(t.lines(), "2 topologia"), cellOf(t.lines(), "14:20:11"), cellOf(t.lines(), "q sair")];
      const asked = t.out.length;

      t.size = size;
      resize();
      for (const chunk of [click(tab2), wheelUp(line), click(line), click(quit), "m"]) key(chunk);
      await Bun.sleep(30);
      expect(t.raw).toEqual([true]);

      // The screen that comes back is the one that was there, with no notice
      t.size = { cols: 120, rows: 40 };
      resize();
      expect(t.lines()).toEqual(main(t.view()).text());
      expect(t.calls.every((call) => call.method === "GET")).toBe(true);
      expect(t.out.slice(asked)).not.toContain(OFF);

      // edge case: back at 120×40 the click counts, and the terminal is not asked again
      key(click(tab2));
      expect(t.lines()).toEqual(topology(t.view({ screen: "topology" })).text());
      expect(t.out.split(ON)).toHaveLength(2);
    } finally {
      stop();
    }
  });
}

test("CLK-13: while the broker does not answer, a click and the wheel change nothing and a click on the cell of q sair does not quit", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    const [tab2, line, quit] = [cellOf(t.lines(), "2 topologia"), cellOf(t.lines(), "14:20:11"), cellOf(t.lines(), "q sair")];

    t.answer = () => Promise.reject(new Error("ConnectionRefused"));
    await until(() => t.lines()[3]!.includes("○ congelado"), "the frozen screen");
    for (const chunk of [click(tab2), wheelUp(line), click(line), click(quit)]) key(chunk);
    await Bun.sleep(30);
    expect(t.raw).toEqual([true]);
    expect(t.lines()[3]).toContain("○ congelado");

    t.answer = null;
    await t.shows(main(t.view()).text(), "the main screen as it was");
    expect(t.calls.every((call) => call.method === "GET")).toBe(true);
  } finally {
    stop();
  }
});

test("CLK-50, CLK-51: m takes the request for the reports back and says so, a click then changes nothing, and m again asks for them and says so", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    const tab2 = cellOf(t.lines(), "2 topologia");

    let from = t.out.length;
    key("m");
    expect(t.out.slice(from)).toContain("\x1b[?1006l" + "\x1b[?1000l");
    expect(t.out.slice(from)).not.toContain(ON);
    expect(t.lines()[38]).toContain("mouse desligado · o terminal seleciona texto");

    // A report that still comes is no key and changes no screen
    const off = t.lines();
    key(click(tab2));
    expect(t.lines()).toEqual(off);

    from = t.out.length;
    key("m");
    expect(t.out.slice(from)).toContain("\x1b[?1000h" + "\x1b[?1006h");
    expect(t.out.slice(from)).not.toContain(OFF);
    expect(t.lines()[38]).toContain("mouse ligado");

    key(click(tab2));
    expect(t.lines().slice(0, 38)).toEqual(topology(t.view({ screen: "topology" })).text().slice(0, 38));
  } finally {
    stop();
  }
});

test("CLK-02: edge case: leaving after m turned the mouse off still takes the request back before leaving the alternate screen", async () => {
  const { t, key, done } = launch();
  await t.shows(main(t.view()).text(), "the main screen");
  key("m");
  key("q");
  await done;
  expect(t.out.endsWith("\x1b[?1006l" + "\x1b[?1000l" + LEAVE)).toBe(true);
});

test("CLK-49: a click on a question, on an option and on enter confirmar sends one POST /answer with the credential read at that moment, and no other click asks the broker for anything", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    key(click(cellOf(t.lines(), "4 perguntas")));
    expect(t.lines()).toEqual(tab(t.view(after(t, ["4"]))));

    // The selected question, with the focus on the list: the click opens its modal
    key(click(cellOf(t.lines(), "▶ Q-07 [BLOQUEANTE]")));
    const open = after(t, ["4", "\r"]);
    expect(open.modal).toMatchObject({ question: 7, choice: 0 });
    expect(t.lines()).toEqual(tab(t.view(open)));

    // A click on an option marks it, and sends nothing
    t.now += 500;
    key(click(cellOf(t.lines(), "2  5 tentativas")));
    const marked = after(t, ["4", "\r", "j"]);
    expect(marked.modal).toMatchObject({ question: 7, choice: 1 });
    expect(t.lines()).toEqual(tab(t.view(marked)));
    expect(t.tokens).toBe(0);
    expect(t.posts).toEqual([]);

    t.now += 500;
    key(click(cellOf(t.lines(), "enter confirmar")));
    await until(() => t.posts.length > 0, "the answer to reach the broker");
    expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 7, answer: "5 tentativas" } }]);
    expect(t.tokens).toBe(1);
    await until(() => t.lines()[38]!.includes("✓ Q-07 respondida"), "the answer to be settled");
    expect(t.calls.filter((call) => call.method !== "GET")).toEqual([{ method: "POST", url: "http://127.0.0.1:7900/answer" }]);
    expect(t.calls.filter((call) => call.method === "GET").every((call) => /^http:\/\/127\.0\.0\.1:7900\/events\?after=\d+$/.test(call.url))).toBe(true);
  } finally {
    stop();
  }
});

test("CLK-49: a double click on enter abrir over a question opens its modal and sends nothing; the same click 500 ms later confirms", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    // The line of the question that waits for the dev, selected by a click
    const row = feed(t.events).find((r) => r.text.includes("? Q-07 [BLOQUEANTE]"))!;
    key(click(cellOf(t.lines(), "? Q-07 [BLOQUEANTE]")));
    expect(t.lines()).toEqual(main(t.view({ selected: row.seq, focus: 1 })).text());

    // A cell that enter abrir and enter confirmar both have on line 39
    const twice = cellOf(t.lines(), "enter abrir", 1);
    t.now += 500;
    key(click(twice) + click(twice));
    const open = after(t, ["\r"], { selected: row.seq });
    expect(open.modal).toMatchObject({ question: 7, choice: 0 });
    expect(t.lines()).toEqual(tab(t.view(open)));
    const [x, y] = cellOf(t.lines(), "enter confirmar");
    expect(y).toBe(twice[1]);
    expect(twice[0]).toBeGreaterThanOrEqual(x);
    expect(twice[0]).toBeLessThan(x + "enter".length);

    t.now += 499;
    key(click(twice));
    await Bun.sleep(30);
    expect(t.posts).toEqual([]);
    expect(t.tokens).toBe(0);

    t.now += 500;
    key(click(twice));
    await until(() => t.posts.length > 0, "the answer to reach the broker");
    expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 7, answer: "infinito com backoff" } }]);
  } finally {
    stop();
  }
});

test("CLK-54: with the modal in the text mode m goes to the field, and the terminal is told nothing about the mouse", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    // The line after the options is the other answer: enter on it leads to the text
    const text = ["4", "\r", "j", "j", "j", "\r"];
    for (const k of text) key(k);
    const from = t.out.length;
    key("m");
    const typed = after(t, [...text, "m"]);
    expect(typed.modal).toMatchObject({ question: 7, choice: null, text: "m" });
    expect(t.lines()).toEqual(tab(t.view(typed)));
    expect(t.out.slice(from)).not.toContain(OFF);
    expect(t.out.slice(from)).not.toContain(ON);

    // The mouse is still on: a click outside the box closes the modal
    key(click([0, 0]));
    expect(t.lines()).toEqual(tab(t.view(after(t, ["4"]))));
  } finally {
    stop();
  }
});
