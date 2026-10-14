import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { start } from "../../tui.ts";
import { feed } from "../../tui/feed.ts";
import type { Color } from "../../tui/grid.ts";
import { CLEAR } from "../../tui/ansi.ts";
import { START } from "../../tui/keys.ts";
import type { Fetch } from "../../tui/reader.ts";
import { gate } from "../../tui/screens/gate.ts";
import { main } from "../../tui/screens/main.ts";
import { permission } from "../../tui/screens/permission.ts";
import { small } from "../../tui/screens/small.ts";
import type { GateModal, PermissionModal, Ui, View } from "../../tui/view.ts";
import { LOGS, PRICES } from "../frames/logs.ts";

// The loop with the modals of gate and of permission: what it posts, to which route, with
// which credential, and what it draws. In the log of frame 08 G-01 is the only pending gate;
// in the one of 22c the request 459 of worker-1, of one line, and 460 of worker-2 are open.

const BROKER = "http://127.0.0.1:7900";
// The human credential of the tests: no screen has this text
const TOKEN = "c0ffee".repeat(10) + "beef";
const GATE = `${BROKER}/gate-decision`;
const PERMISSION = `${BROKER}/permission-decision`;

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
    else if (part === "\x1b[2J") lines.length = 0;
    else if (part && !part.startsWith("\x1b[")) lines[y] = (lines[y] ?? "") + part;
  }
  return Array.from(lines, (line) => (line ?? "").trimEnd());
}
const written = (out: string) => out.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

// The loop over the log of a frame, at its clock, with a broker that is a function and a
// terminal that is a string
function launch(frame: string) {
  const { events, now } = LOGS[frame]!;
  const t = {
    events: events as SquadEvent[],
    now,
    size: { cols: 120, rows: 40 },
    token: TOKEN as string | null,
    // what the broker answers to a decision of the dev
    reply: (async () => Response.json({ ok: true, seq: 999 })) as () => Promise<Response>,
    posts: [] as { url: string; body: unknown }[],
    calls: [] as { method: string; url: string }[],
    out: "",
    lines: () => screen(t.out),
    view: (ui: Partial<Ui> = {}): View => ({ squad: squad(t.events, t.now), rows: feed(t.events), ui: { ...START, ...ui }, project: "portal-89fm", down: null, prices: PRICES }),
    shows: (drawn: string[], what: string) => until(() => Bun.deepEquals(t.lines(), drawn), what),
    notice: (text: string, color: Color) => ({ text, color, until: now + 4000 }),
  };
  const fetch: Fetch = async (url, init) => {
    t.calls.push({ method: init?.method ?? "GET", url });
    if (init?.method === "POST") {
      t.posts.push({ url, body: JSON.parse(String(init.body)) });
      return t.reply();
    }
    const after = Number(new URL(url).searchParams.get("after"));
    return Response.json({ events: t.events.filter((e) => e.seq > after), last_seq: Math.max(0, ...t.events.map((e) => e.seq)) });
  };
  const tui = start(
    { fetch, now: () => t.now, size: () => t.size, write: (text) => (t.out += text), raw: () => {}, project: "portal-89fm", token: () => t.token },
    { url: BROKER, intervalMs: 5, glyphs: new Map(), prices: PRICES, mouse: false }
  );
  return { ...tui, t };
}

const gateModal = (more: Partial<GateModal> = {}): GateModal => ({ id: 1, mode: "view", text: "", expanded: false, empty: false, sending: false, version: 1, ...more });
const permissionModal = (more: Partial<PermissionModal> = {}): PermissionModal => ({ seq: 459, offset: 0, sending: false, ...more });
// The main screen with the modal over it, as the loop draws it
const gated = (v: View): string[] => gate(main(v), v).text();
const permitted = (v: View): string[] => permission(main(v), v).text();

// The broker answers only when the test lets it
function held(t: ReturnType<typeof launch>["t"]): (res: Response) => void {
  let reply!: (res: Response) => void;
  t.reply = () => new Promise((resolve) => (reply = resolve));
  return (res) => reply(res);
}

test("GAT-52, GAT-72: g a y makes one POST /gate-decision with the approve and the credential of io.token(), and the modal closes with the notice when the broker takes it", async () => {
  const { t, key, stop } = launch("08");
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    const reply = held(t);
    for (const k of ["g", "a"]) key(k);
    expect(t.posts).toEqual([]);
    key("y");
    expect(t.posts).toEqual([{ url: GATE, body: { human_token: TOKEN, gate_id: 1, decision: "approve" } }]);
    expect(t.lines()).toEqual(gated(t.view({ gate: gateModal({ mode: "confirm", sending: true }) })));
    reply(Response.json({ ok: true, seq: 500 }));
    await t.shows(main(t.view({ toast: t.notice("✓ G-01 aprovado", "bgreen") })).text(), "the main screen with the notice");
    expect(written(t.out)).not.toContain(TOKEN.slice(0, 12));
  } finally {
    stop();
  }
});

test("GAT-55, GAT-72: g r and g c with a text and enter make one POST /gate-decision each, with the decision of the mode and the text without the spaces of its ends", async () => {
  for (const [mode, decision, said] of [["r", "reject", "✓ G-01 rejeitado"], ["c", "comment", "✓ G-01 comentado · continua pendente"]] as const) {
    const { t, key, stop } = launch("08");
    try {
      await t.shows(main(t.view()).text(), "the main screen");
      for (const k of ["g", mode, " ", "d", "e", "p", "o", "i", "s", " ", "\r"]) key(k);
      expect(t.posts).toEqual([{ url: GATE, body: { human_token: TOKEN, gate_id: 1, decision, text: "depois" } }]);
      await until(() => t.lines()[38]!.includes(said), "the notice of the decision");
    } finally {
      stop();
    }
  }
});

test("GAT-66, GAT-67, GAT-72: x a and x d make one POST /permission-decision each, with the behavior and the seq of the request", async () => {
  for (const [k, behavior, said] of [["a", "allow", "✓ P-01 permitido"], ["d", "deny", "✓ P-01 negado"]] as const) {
    const { t, key, stop } = launch("22c");
    try {
      await t.shows(main(t.view()).text(), "the main screen");
      key("x");
      expect(t.posts).toEqual([]);
      key(k);
      expect(t.posts).toEqual([{ url: PERMISSION, body: { human_token: TOKEN, request_seq: 459, behavior } }]);
      await t.shows(main(t.view({ toast: t.notice(said, "bgreen") })).text(), "the main screen with the notice");
    } finally {
      stop();
    }
  }
});

test("GAT-74: without a credential no decision is sent, the modal stays in the mode it sent from and the footer says so; the credential is read again at the next send", async () => {
  const gating = launch("08");
  try {
    const { t, key } = gating;
    await t.shows(main(t.view()).text(), "the main screen");
    t.token = null;
    for (const k of ["g", "r", "x", "\r"]) key(k);
    expect(t.calls.every((call) => call.method === "GET")).toBe(true);
    expect(t.lines()).toEqual(gated(t.view({ gate: gateModal({ mode: "reject", text: "x" }), toast: t.notice("✗ credencial humana não encontrada", "bred") })));
    // The broker wrote the file meanwhile
    t.token = TOKEN;
    key("\r");
    expect(t.posts).toEqual([{ url: GATE, body: { human_token: TOKEN, gate_id: 1, decision: "reject", text: "x" } }]);
  } finally {
    gating.stop();
  }
  const permitting = launch("22c");
  try {
    const { t, key } = permitting;
    await t.shows(main(t.view()).text(), "the main screen");
    t.token = null;
    for (const k of ["x", "a"]) key(k);
    expect(t.calls.every((call) => call.method === "GET")).toBe(true);
    expect(t.lines()).toEqual(permitted(t.view({ permission: permissionModal(), toast: t.notice("✗ credencial humana não encontrada", "bred") })));
    t.token = TOKEN;
    key("a");
    expect(t.posts).toEqual([{ url: PERMISSION, body: { human_token: TOKEN, request_seq: 459, behavior: "allow" } }]);
  } finally {
    permitting.stop();
  }
});

test("GAT-73: while a decision waits for the broker no key makes another POST or changes the modal", async () => {
  const gating = launch("08");
  try {
    const { t, key } = gating;
    await t.shows(main(t.view()).text(), "the main screen");
    const reply = held(t);
    for (const k of ["g", "a", "y"]) key(k);
    const waiting = gated(t.view({ gate: gateModal({ mode: "confirm", sending: true }) }));
    for (const k of ["y", "\r", "a", "r", "x", "q", "\x1b"]) key(k);
    // A lone escape is a key 40 ms after it came
    await Bun.sleep(60);
    expect(t.posts).toHaveLength(1);
    expect(t.lines()).toEqual(waiting);
    // A refusal gives the modal back in the mode it sent from
    reply(Response.json({ ok: false, error: "invalid_field" }));
    await t.shows(gated(t.view({ gate: gateModal({ mode: "confirm" }), toast: t.notice("✗ decisão não enviada · invalid_field", "bred") })), "the modal to send again");
  } finally {
    gating.stop();
  }
  const permitting = launch("22c");
  try {
    const { t, key } = permitting;
    await t.shows(main(t.view()).text(), "the main screen");
    held(t);
    for (const k of ["x", "d"]) key(k);
    for (const k of ["d", "a", "j", "G", "\x1b"]) key(k);
    await Bun.sleep(60);
    expect(t.posts).toEqual([{ url: PERMISSION, body: { human_token: TOKEN, request_seq: 459, behavior: "deny" } }]);
    expect(t.lines()).toEqual(permitted(t.view({ permission: permissionModal({ sending: true }) })));
  } finally {
    permitting.stop();
  }
});

test("GAT-75: through the loop a paste never decides: ay pasted in the modal of gate, a pasted between the marks of a delimited paste split in two reads in the one of permission", async () => {
  const gating = launch("08");
  try {
    const { t, key } = gating;
    await t.shows(main(t.view()).text(), "the main screen");
    // The key that opens the modal first in the chunk, and the decision after it
    key("gay");
    key("ay");
    key("a");
    key("\x1b[200~y\x1b[201~");
    expect(t.posts).toEqual([]);
    expect(t.lines()).toEqual(gated(t.view({ gate: gateModal({ mode: "confirm" }) })));
    key("y");
    expect(t.posts).toEqual([{ url: GATE, body: { human_token: TOKEN, gate_id: 1, decision: "approve" } }]);
  } finally {
    gating.stop();
  }
  const permitting = launch("22c");
  try {
    const { t, key } = permitting;
    await t.shows(main(t.view()).text(), "the main screen");
    key("x");
    for (const k of ["\x1b[20", "0~a", "d\r\x1b[20", "1~"]) key(k);
    key("xa");
    expect(t.posts).toEqual([]);
    expect(t.lines()).toEqual(permitted(t.view({ permission: permissionModal() })));
    key("d");
    expect(t.posts).toEqual([{ url: PERMISSION, body: { human_token: TOKEN, request_seq: 459, behavior: "deny" } }]);
  } finally {
    permitting.stop();
  }
});

test("GAT-75: through the loop a pasted line break is a space in the text of a reject, and enter alone sends it", async () => {
  const { t, key, stop } = launch("08");
  try {
    await t.shows(main(t.view()).text(), "the main screen");
    for (const k of ["g", "r"]) key(k);
    key("sem\rchangelog\r\n");
    expect(t.posts).toEqual([]);
    expect(t.lines()).toEqual(gated(t.view({ gate: gateModal({ mode: "reject", text: "sem changelog  " }) })));
    key("\r");
    expect(t.posts).toEqual([{ url: GATE, body: { human_token: TOKEN, gate_id: 1, decision: "reject", text: "sem changelog" } }]);
  } finally {
    stop();
  }
});

const SMALL = [
  { cols: 119, rows: 40 },
  { cols: 120, rows: 39 },
];

test("GAT-78: in a terminal smaller than 120×40 the keys post nothing and leave the modal as it was, it comes back with its state at 120×40, and q quits", async () => {
  for (const size of SMALL) {
    for (const [frame, open, shown, decide, url] of [
      ["08", ["g", "a"], (v: ReturnType<typeof launch>["t"]) => gated(v.view({ gate: gateModal({ mode: "confirm" }) })), "y", GATE],
      ["22c", ["x"], (v: ReturnType<typeof launch>["t"]) => permitted(v.view({ permission: permissionModal() })), "a", PERMISSION],
    ] as const) {
      const { t, key, resize, stop, done } = launch(frame);
      try {
        await t.shows(main(t.view()).text(), "the main screen");
        for (const k of open) key(k);
        const drawn = shown(t);
        expect(t.lines()).toEqual(drawn);
        t.size = size;
        resize();
        for (const k of ["y", "a", "d", "\r", "G", "\x1b1"]) key(k);
        await Bun.sleep(60);
        expect(t.posts).toEqual([]);
        expect(t.lines()).toEqual(small(size.cols, size.rows).text());
        t.size = { cols: 120, rows: 40 };
        resize();
        expect(t.lines()).toEqual(drawn);
        key(decide);
        expect(t.posts).toHaveLength(1);
        expect(t.posts[0]!.url).toBe(url);
        // q, which the modal does not take, quits from the small terminal
        t.size = size;
        resize();
        key("q");
        await done;
      } finally {
        stop();
      }
    }
  }
});

test("GAT-72: in a session that decides a gate and a permission request and quits, every call of the loop is GET /events or the POST of y and of d", async () => {
  const { t, key, done } = launch("08");
  await until(() => t.calls.length >= 2, "two reads");
  // A permission request of worker-2 after the gate
  const request = LOGS["22a"]!.events.find((e) => e.seq === 459)!;
  t.events = [...t.events, { ...request, seq: 500, from: "worker-2", ts: t.now } as SquadEvent];
  await until(() => t.lines()[1]!.includes("permissão"), "the seal of the request");
  for (const k of ["g", "a", "y"]) key(k);
  await until(() => t.lines()[38]!.includes("✓ G-01 aprovado"), "the notice of the gate");
  for (const k of ["x", "d"]) key(k);
  await until(() => t.lines()[38]!.includes("negado"), "the notice of the request");
  for (const k of ["j", "1", "4", "1"]) key(k);
  key("q");
  await done;
  expect(t.posts).toEqual([
    { url: GATE, body: { human_token: TOKEN, gate_id: 1, decision: "approve" } },
    { url: PERMISSION, body: { human_token: TOKEN, request_seq: 500, behavior: "deny" } },
  ]);
  for (const call of t.calls.filter((call) => call.method === "GET")) expect(call.url).toMatch(/^http:\/\/127\.0\.0\.1:7900\/events\?after=\d+$/);
  expect(t.calls.filter((call) => call.method !== "GET")).toEqual([
    { method: "POST", url: GATE },
    { method: "POST", url: PERMISSION },
  ]);
});
