import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { config, start } from "../../tui.ts";
import { CLEAR, ENTER, LEAVE, paint } from "../../tui/ansi.ts";
import { feed } from "../../tui/feed.ts";
import type { Color } from "../../tui/grid.ts";
import { START } from "../../tui/keys.ts";
import type { Fetch } from "../../tui/reader.ts";
import { answer } from "../../tui/screens/answer.ts";
import { down } from "../../tui/screens/down.ts";
import { main } from "../../tui/screens/main.ts";
import { questions } from "../../tui/screens/questions.ts";
import { small } from "../../tui/screens/small.ts";
import { topology } from "../../tui/screens/topology.ts";
import type { Modal, Ui, View } from "../../tui/view.ts";
import { LOGS, PRICES } from "../frames/logs.ts";

const BROKER = "http://127.0.0.1:7900";
const NOW = LOGS["01"]!.now;
const EVENTS = LOGS["01"]!.events;
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
    else if (!part.startsWith("\x1b[")) lines[y] = (lines[y] ?? "") + part;
  }
  return Array.from(lines, (line) => (line ?? "").trimEnd());
}

// The loop over a broker that is a function, a clock that is a variable and a terminal
// that is a string
function launch(events: SquadEvent[] = EVENTS, settings: { intervalMs?: number; glyphs?: Map<string, string> } = {}) {
  const state = {
    events,
    now: NOW,
    size: { cols: 120, rows: 40 },
    // what the broker answers instead of the log, when set
    answer: null as (() => Promise<Response>) | null,
    // the human credential of the file; null without the file
    token: TOKEN as string | null,
    // what the broker answers to an answer of the dev
    reply: (async () => Response.json({ ok: true, seq: 999 })) as () => Promise<Response>,
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
      return t.reply();
    }
    const after = Number(new URL(url).searchParams.get("after"));
    return Response.json({ events: t.events.filter((e) => e.seq > after), last_seq: Math.max(0, ...t.events.map((e) => e.seq)) });
  };
  const tui = start(
    { fetch, now: () => t.now, size: () => t.size, write: (text) => (t.out += text), raw: (on) => t.raw.push(on), project: "portal-89fm", token: () => t.token },
    { url: BROKER, intervalMs: 5, glyphs: new Map(), prices: PRICES, ...settings }
  );
  return { ...tui, t };
}

test("TUI-61: selecting a feed line repaints only changed rows", async () => {
  const { t, key, stop } = launch(EVENTS, { intervalMs: 60000 });
  try {
    await t.shows(main(t.view()).text(), "the first drawing");
    const before = t.out.length;
    const first = main(t.view());
    const selected = main(t.view({ selected: feed(EVENTS).at(-1)!.seq }));
    const changed = selected.rows.flatMap((row, y) => Bun.deepEquals(row, first.rows[y]) ? [] : [y + 1]);
    key("j");
    const positions = [...t.out.slice(before).matchAll(/\x1b\[(\d+);1H/g)].map((m) => Number(m[1]));
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.length).toBeLessThan(40);
    expect(positions).toEqual(changed);
  } finally {
    stop();
  }
});

test("TUI-56: the loop writes the configured glyph substitute", async () => {
  const { t, stop } = launch(LOGS["10"]!.events, { glyphs: new Map([["⚠", "!"]]) });
  try {
    await until(() => t.lines().length === 40, "the substituted drawing");
    expect(t.out).toContain("!");
    expect(t.out).not.toContain("⚠");
  } finally {
    stop();
  }
});

test("TUI-58: the loop waits for the configured interval before reading again", async () => {
  const { t, stop } = launch(EVENTS, { intervalMs: 60000 });
  try {
    await t.shows(main(t.view()).text(), "the first drawing");
    await Bun.sleep(60);
    expect(t.calls).toHaveLength(1);
  } finally {
    stop();
  }
});

test("TUI-60: the loop takes the terminal, draws what the broker answers and gives the terminal back on q", async () => {
  const { t, key, done } = launch();
  expect(t.out).toBe(ENTER);
  expect(t.raw).toEqual([true]);
  await t.shows(main(t.view()).text(), "the main screen");
  expect(t.lines()[0]).toContain("portal-89fm › player ao vivo");

  key("q");
  await done;
  expect(t.out.endsWith(LEAVE)).toBe(true);
  expect(t.raw).toEqual([true, false]);
  // Nothing is read nor written after it
  const { length } = t.calls;
  const { out } = t;
  await Bun.sleep(30);
  key("2");
  expect(t.calls).toHaveLength(length);
  expect(t.out).toBe(out);
});

test("TUI-60: ctrl+c and the stop of a SIGTERM give the terminal back", async () => {
  for (const quit of [(tui: ReturnType<typeof launch>) => tui.key("\x03"), (tui: ReturnType<typeof launch>) => tui.stop()]) {
    const tui = launch();
    await tui.t.reads(1);
    quit(tui);
    await tui.done;
    expect(tui.t.out.endsWith(LEAVE)).toBe(true);
    expect(tui.t.out.split(LEAVE)).toHaveLength(2);
    expect(tui.t.raw).toEqual([true, false]);
  }
});

test("TUI-60: an error in the loop gives the terminal back before the loop ends with it", async () => {
  const { t, key, done } = launch();
  await t.shows(main(t.view()).text(), "the main screen");
  t.size = null as never;
  key("j");

  const error = await done.then(
    () => null,
    (e) => e
  );
  expect(error).toBeInstanceOf(TypeError);
  expect(t.out.endsWith(LEAVE)).toBe(true);
  expect(t.raw).toEqual([true, false]);
});

test("TUI-62: the keys of a chunk of the input are pressed in order, an escape sequence as one key", async () => {
  const { t, key, stop } = launch();
  await t.shows(main(t.view()).text(), "the main screen");

  // Two arrows up: the latest line, then the one above it
  key("\x1b[A\x1b[A");
  expect(t.lines()).toEqual(main(t.view({ selected: feed(EVENTS).at(-2)!.seq })).text());
  key("2");
  expect(t.lines()).toEqual(topology(t.view({ selected: feed(EVENTS).at(-2)!.seq, screen: "topology" })).text());
  key("\x1b");
  await t.shows(main(t.view({ selected: feed(EVENTS).at(-2)!.seq })).text(), "standalone Escape");
  stop();
});

test("TUI-63: the notice of a key stays 4 s in the footer", async () => {
  const { t, key, stop } = launch();
  await t.shows(main(t.view()).text(), "the main screen");

  key("g");
  expect(t.lines()[38]).toContain("chega com a fatia Gate");
  t.now += 3999;
  await t.reads(t.calls.length + 2);
  expect(t.lines()[38]).toContain("chega com a fatia Gate");
  t.now += 1;
  await until(() => !t.lines()[38]!.includes("chega com a fatia Gate"), "the notice to leave");
  stop();
});

test("TUI-62: a chunk with 3]] advances to the third ticket", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the plan of three tickets");
    key("3]]");
    expect(t.lines()[2]).toContain("TKT-14");
    expect(t.lines()[2]).not.toContain("TKT-13");
  } finally {
    stop();
  }
});

test("the paused feed keeps its lines while the read goes on, and shows what arrived when it resumes", async () => {
  const before = EVENTS.filter((e) => e.seq <= 422);
  const { t, key, stop } = launch(before);
  await t.shows(main(t.view()).text(), "the main screen");

  key("p");
  expect(t.lines()[2]).toContain("○ pausado");
  t.events = EVENTS;
  await t.reads(t.calls.length + 2);
  // The squad is the one of the whole log; the lines are the ones of before
  await t.shows(main({ ...t.view({ paused: true }), rows: feed(before) }).text(), "the paused screen");

  key("p");
  expect(t.lines()).toEqual(main(t.view()).text());
  stop();
});

test("TUI-54: a terminal smaller than 120×40 shows only its size, and the screen comes back when it grows", async () => {
  const tui = launch();
  const { t } = tui;
  t.size = { cols: 100, rows: 30 };
  await t.shows(small(100, 30).text(), "the small screen");
  t.size = { cols: 120, rows: 39 };
  tui.resize();
  expect(t.lines()).toEqual(small(120, 39).text());

  t.size = { cols: 120, rows: 40 };
  await t.shows(main(t.view()).text(), "the main screen");
  // A terminal larger than the grid has the screen at its top left
  t.size = { cols: 200, rows: 60 };
  tui.resize();
  expect(t.lines()).toEqual(main(t.view()).text());
  tui.stop();
});

test("edge case: a resize erases the terminal and draws the whole screen again", async () => {
  const { t, resize, stop } = launch();
  await t.shows(main(t.view()).text(), "the main screen");
  const { length } = t.out;

  resize();
  const written = t.out.slice(length);
  expect(written.startsWith(CLEAR)).toBe(true);
  expect([...(written.match(/\x1b\[\d+;1H/g) ?? [])]).toEqual(Array.from({ length: 40 }, (_, y) => `\x1b[${y + 1};1H`));
  expect(t.lines()).toEqual(main(t.view()).text());
  stop();
});

test("TUI-51, TUI-53: while the broker does not answer the last state is frozen with the seconds and the attempt, and the screen comes back from the same cursor", async () => {
  const { t, stop } = launch();
  await t.shows(main(t.view()).text(), "the main screen");
  const last = Math.max(...EVENTS.map((e) => e.seq));

  const since = (t.now += 7000);
  t.answer = () => Promise.reject(new Error("ConnectionRefused"));
  await until(() => t.lines()[3]!.includes("○ congelado"), "the frozen screen");
  t.now += 12000;
  await until(() => t.lines()[0]!.includes("broker ○ desconectado · 12s"), "the seconds since the first failure");
  const attempt = Number(/tentativa (\d+)/.exec(t.lines()[38]!)![1]);
  expect(attempt).toBeGreaterThan(1);
  await until(() => t.lines()[38]!.includes(`tentativa ${attempt + 1}`), "one more attempt");
  // The whole screen is the one of the frame 12, from the state of before the failure
  t.answer = () => Promise.resolve(new Response("oops", { status: 500 }));
  await until(() => {
    const n = Number(/tentativa (\d+)/.exec(t.lines()[38] ?? "")?.[1]);
    return Bun.deepEquals(t.lines(), down({ ...t.view(), down: { since, attempt: n } }).text());
  }, "the frozen screen of the attempt");

  t.answer = null;
  await t.shows(main(t.view()).text(), "the main screen again");
  expect(t.calls.slice(1).every((call) => call.url === `${BROKER}/events?after=${last}`)).toBe(true);
  stop();
});

test("TUI-55: the loop asks the broker for nothing but GET /events?after=", async () => {
  const { t, key, resize, stop } = launch();
  await t.reads(3);
  for (const k of ["j", "\r", "]", "b", "g", "x", "4", "t", "p", "?", "\x1b"]) key(k);
  resize();
  t.answer = () => Promise.reject(new Error("down"));
  await t.reads(t.calls.length + 3);
  stop();

  expect(t.calls.length).toBeGreaterThanOrEqual(6);
  for (const call of t.calls) {
    expect(call.method).toBe("GET");
    expect(call.url).toMatch(/^http:\/\/127\.0\.0\.1:7900\/events\?after=\d+$/);
  }
});

// The tab of questions with the modal of the state over it, as the loop draws it
const tab = (view: View): string[] => answer(questions(view), view).text();
const modal = (question: number, more: Partial<Modal> = {}): Modal => ({ question, choice: null, text: "", expanded: false, sending: false, refused: false, ...more });
const notice = (text: string, color: Color) => ({ text, color, until: NOW + 4000 });
// What was written to the terminal, without the escapes that split it
const written = (out: string) => out.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

test("QST-76, QST-79: enter in the modal makes one POST /answer with the credential of io.token(), and a second enter before the broker answers makes no other", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    // The broker answers only when the test lets it
    let reply!: (res: Response) => void;
    t.reply = () => new Promise((resolve) => (reply = resolve));

    key("4");
    expect(t.lines()).toEqual(questions(t.view({ screen: "questions" })).text());
    // Q-08, its modal, a text with spaces at its ends and enter
    for (const k of ["j", "\r", " logo da 89 ", "\r"]) key(k);
    expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 8, answer: "logo da 89" } }]);
    const waiting = tab(t.view({ screen: "questions", question: 8, modal: modal(8, { text: " logo da 89 ", sending: true }) }));
    expect(t.lines()).toEqual(waiting);

    for (const k of ["\r", "x", "\x7f", "\r", "\x1b"]) key(k);
    // A lone escape is a key 40 ms after it came
    await Bun.sleep(60);
    expect(t.posts).toHaveLength(1);
    expect(t.lines()).toEqual(waiting);

    reply(Response.json({ ok: true, seq: 500 }));
    await t.shows(questions(t.view({ screen: "questions", question: 8, toast: notice("✓ Q-08 respondida", "bgreen") })).text(), "the tab without the modal");
    expect(t.lines()[38]).toContain("✓ Q-08 respondida");
    expect(written(t.out)).not.toContain(TOKEN.slice(0, 12));
  } finally {
    stop();
  }
});

test("QST-83: without a credential nothing is sent, the modal stays and the footer says so; the credential is read again at the next send and never written to the terminal", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    t.token = null;
    for (const k of ["4", "j", "\r", "logo", "\r"]) key(k);
    expect(t.calls.every((call) => call.method === "GET")).toBe(true);
    expect(t.lines()).toEqual(tab(t.view({ screen: "questions", question: 8, modal: modal(8, { text: "logo" }), toast: notice("✗ credencial humana não encontrada", "bred") })));
    expect(t.lines()[38]).toContain("✗ credencial humana não encontrada");

    // The broker wrote the file meanwhile
    t.token = TOKEN;
    key("\r");
    expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 8, answer: "logo" } }]);
    await until(() => t.lines()[38]!.includes("✓ Q-08 respondida"), "the notice of the answer");
    await t.reads(t.calls.length + 2);
    expect(written(t.out)).not.toContain(TOKEN.slice(0, 12));
    expect(t.lines().join("\n")).not.toContain(TOKEN.slice(0, 12));
  } finally {
    stop();
  }
});

test("QST-86: in a session that opens the tab, answers and quits, every call of the loop is GET /events or the POST /answer of the enter of the modal", async () => {
  const { t, key, done } = launch();
  await t.reads(2);
  // Q-07 by the second of its options
  for (const k of ["4", "\r", "2"]) key(k);
  expect(t.calls.every((call) => call.method === "GET")).toBe(true);
  key("\r");
  await until(() => t.lines()[38]?.includes("✓ Q-07 respondida") ?? false, "the notice of the answer");
  await t.reads(t.calls.length + 2);
  for (const k of ["j", "h", "j", "b", "1", "4"]) key(k);
  key("q");
  await done;

  expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 7, answer: "5 tentativas" } }]);
  expect(t.calls.filter((call) => call.method !== "GET")).toEqual([{ method: "POST", url: "http://127.0.0.1:7900/answer" }]);
  const reads = t.calls.filter((call) => call.method === "GET");
  expect(reads.length).toBeGreaterThanOrEqual(4);
  for (const call of reads) expect(call.url).toMatch(/^http:\/\/127\.0\.0\.1:7900\/events\?after=\d+$/);
});

test("QST-78: a pasted chunk with line breaks goes into the text of the modal and sends nothing; enter alone sends it", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    for (const k of ["4", "j", "\r"]) key(k);
    key("logo da 89\rquadrado\r\n");
    expect(t.posts).toEqual([]);
    expect(t.lines()).toEqual(tab(t.view({ screen: "questions", question: 8, modal: modal(8, { text: "logo da 89 quadrado  " }) })));
    key("\r");
    expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 8, answer: "logo da 89 quadrado" } }]);
  } finally {
    stop();
  }
});

test("QST-80, QST-81: a broker that fails leaves the modal to send again with the error in the footer, and the refusal of a closed question leaves it refused until esc", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    t.reply = async () => Response.json({ error: "database is locked" }, { status: 500 });
    for (const k of ["4", "j", "\r", "logo", "\r"]) key(k);
    const failed = notice("✗ resposta não enviada · broker não respondeu", "bred");
    await t.shows(tab(t.view({ screen: "questions", question: 8, modal: modal(8, { text: "logo" }), toast: failed })), "the modal with the error");
    expect(t.lines()[38]).toContain("✗ resposta não enviada · broker não respondeu");

    t.reply = async () => Response.json({ ok: false, error: "question_closed", hint: "The question is closed." });
    key("\r");
    const refused = tab(t.view({ screen: "questions", question: 8, modal: modal(8, { text: "logo", refused: true }), toast: failed }));
    await t.shows(refused, "the refused modal");
    expect(t.lines()[39]).toBe(" esc fechar");
    for (const k of ["\r", "x", "\x7f"]) key(k);
    expect(t.lines()).toEqual(refused);
    expect(t.posts).toHaveLength(2);
    key("\x1b");
    await t.shows(questions(t.view({ screen: "questions", question: 8, toast: failed })).text(), "the tab without the modal");
  } finally {
    stop();
  }
});

test("QST-68, QST-82: the read that shows the question of the modal closed by its default closes the modal, says so and selects the first of the list", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    for (const k of ["4", "j", "\r", "logo"]) key(k);
    expect(t.lines()).toEqual(tab(t.view({ screen: "questions", question: 8, modal: modal(8, { text: "logo" }) })));
    // The broker applies the default of Q-08, as in frame 20b
    t.events = [...EVENTS, LOGS["20b"]!.events.find((e) => e.seq === 434)!];
    await t.shows(questions(t.view({ screen: "questions", question: 7, toast: notice("⟳ default aplicado", "byellow") })).text(), "the tab without the modal");
    expect(t.lines()[38]).toContain("⟳ default aplicado");
    expect(t.posts).toEqual([]);
  } finally {
    stop();
  }
});

test("QST-84: while the broker does not answer the reads, enter over a question opens no modal, and an open modal is covered, changed by no key and drawn again with its text", async () => {
  const { t, key, stop } = launch();
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    for (const k of ["4", "j", "\r", "logo"]) key(k);
    const open = tab(t.view({ screen: "questions", question: 8, modal: modal(8, { text: "logo" }) }));
    expect(t.lines()).toEqual(open);

    t.answer = () => Promise.reject(new Error("ConnectionRefused"));
    await until(() => t.lines()[3]!.includes("○ congelado"), "the frozen screen");
    for (const k of [" da 89", "\x7f", "\x15", "\x05", "\r", "\x1b"]) key(k);
    // A lone escape is a key 40 ms after it came
    await Bun.sleep(60);
    expect(t.lines()[3]).toContain("○ congelado");
    expect(t.calls.every((call) => call.method === "GET")).toBe(true);
    t.answer = null;
    await t.shows(open, "the modal again");

    // Without a modal: enter on the tab says that answering is disabled
    key("\x1b");
    await t.shows(questions(t.view({ screen: "questions", question: 8 })).text(), "the tab without the modal");
    t.answer = () => Promise.reject(new Error("ConnectionRefused"));
    await until(() => t.lines()[3]!.includes("○ congelado"), "the frozen screen again");
    key("\r");
    t.answer = null;
    await t.shows(questions(t.view({ screen: "questions", question: 8, toast: notice("broker desconectado · responder desabilitado", "gray") })).text(), "the tab with no modal");
    expect(t.calls.every((call) => call.method === "GET")).toBe(true);
  } finally {
    stop();
  }
});

test("TUI-56, TUI-57, TUI-58: the settings come from the environment, and an invalid one throws before the loop starts", () => {
  const settings = config({ SQUAD_PORT: "7911", SQUAD_POLL_INTERVAL_MS: "250", SQUAD_TUI_GLYPHS: "⚠=!" });
  expect(settings.url).toBe("http://127.0.0.1:7911");
  expect(settings.intervalMs).toBe(250);
  expect([...settings.glyphs]).toEqual([["⚠", "!"]]);
  expect(config({}).intervalMs).toBe(1000);
  expect(() => config({ SQUAD_TUI_GLYPHS: "⚠=!!" })).toThrow('"⚠=!!"');
  expect(() => config({ SQUAD_PRICES: "no-such-prices.json" })).toThrow("no-such-prices.json");
});

test("F3 / TUI-62: arrows and shift-tab survive every escape sequence chunk boundary", async () => {
  for (const sequence of ["\x1b[A", "\x1b[B", "\x1b[Z"]) {
    for (let split = 1; split < sequence.length; split++) {
      const whole = launch(EVENTS, { intervalMs: 60000 });
      const divided = launch(EVENTS, { intervalMs: 60000 });
      try {
        await whole.t.shows(main(whole.t.view()).text(), "whole input");
        await divided.t.shows(main(divided.t.view()).text(), "divided input");
        whole.key("2");
        divided.key("2");
        const before = divided.t.lines();
        whole.key(sequence);
        divided.key(sequence.slice(0, split));
        expect(divided.t.lines()).toEqual(before);
        divided.key(sequence.slice(split));
        expect(divided.t.lines()).toEqual(whole.t.lines());
        expect(divided.t.lines()[2]).toContain("topologia");
        const written = divided.t.out.length;
        divided.key("1");
        const expected = sequence === "\x1b[Z" ? { focus: 0 as const } : { selected: feed(EVENTS).at(-1)!.seq };
        const next = main(divided.t.view(expected));
        expect(divided.t.lines()).toEqual(next.text());
        expect(divided.t.out.slice(written)).toBe(paint(next, topology(divided.t.view({ screen: "topology" })), new Map()));
      } finally {
        whole.stop();
        divided.stop();
      }
    }
  }
});

test("F3 / TUI-60: stopping cancels a pending Escape", async () => {
  const { t, key, stop, done } = launch();
  await t.shows(main(t.view()).text(), "main before stop");
  key("\x1b");
  stop();
  await done;
  const out = t.out;
  await Bun.sleep(80);
  expect(t.out).toBe(out);
  expect(t.raw).toEqual([true, false]);
});
