import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config, credential, project, start, terminal } from "../../tui.ts";
import { ENTER, LEAVE } from "../../tui/ansi.ts";
import { BROKER_DIR, cleanEnv, FEATURE, get, openFeature, post, removeDir, startBroker, tempDir, waitFor } from "./helpers.ts";

test("TUI-59: the probe outside a terminal says it needs one and exits 1", async () => {
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "tui", "probe.ts")], {
    env: cleanEnv({}),
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  expect(await proc.exited).toBe(1);
  expect(err.trim()).toBe("probe needs a terminal on stdin and stdout");
  expect(out).toBe("");
});

// `bun tui.ts` outside a terminal, with the settings given
async function run(env: Record<string, string>) {
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "tui.ts")], { env: cleanEnv(env), stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { code: await proc.exited, out, err: err.trim() };
}

test("TUI-56: an invalid SQUAD_TUI_GLYPHS exits 1 with the pair, before the alternate screen", async () => {
  const { code, out, err } = await run({ SQUAD_TUI_GLYPHS: "⚠=!!" });
  expect(code).toBe(1);
  expect(err).toBe('SQUAD_TUI_GLYPHS: "⚠=!!" is not glyph=substitute with one character on each side');
  expect(out).toBe("");
});

test("TUI-57: a SQUAD_PRICES that is not there exits 1 with the path, before the alternate screen", async () => {
  const dir = tempDir();
  try {
    const path = join(dir, "no prices.json");
    const { code, out, err } = await run({ SQUAD_PRICES: path });
    expect(code).toBe(1);
    expect(err).toContain(`SQUAD_PRICES: could not read ${path}`);
    expect(out).toBe("");
  } finally {
    removeDir(dir);
  }
});

test("the TUI outside a terminal says it needs one and exits 1, without touching the screen", async () => {
  const { code, out, err } = await run({});
  expect(code).toBe(1);
  expect(err).toBe("tui needs a terminal on stdin and stdout");
  expect(out).toBe("");
});

function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
}

test("TUI-64: the project is the name of the repository of the directory, and null outside one", async () => {
  const dir = tempDir();
  try {
    const inside = join(dir, "portal 89fm", "src");
    git(dir, "init", "-q", "portal 89fm");
    git(dir, "init", "-q", "other");
    await Bun.write(join(inside, "keep"), "");
    expect(await project(inside)).toBe("portal 89fm");
    expect(await project(join(dir, "other"))).toBe("other");
    expect(await project(dir)).toBeNull();
  } finally {
    removeDir(dir);
  }
});

test("TUI-50, TUI-55, TUI-64: the loop over a real broker draws the feature opened by the route, and writes nothing to it", async () => {
  const broker = await startBroker();
  let out = "";
  const raw: boolean[] = [];
  const asked: string[] = [];
  let tui: ReturnType<typeof start> | undefined;
  try {
    const mother = await post(broker.url, "/register", { pid: process.pid, cwd: "/work/wt", git_root: "/work/importer/.git", name: "mother", role: "mother" });
    await openFeature(broker.url, mother.json.id);
    const before = (await (await fetch(`${broker.url}/events`)).json()) as { last_seq: number };

    tui = start(
      {
        fetch: (url, init) => {
          asked.push(`${init?.method ?? "GET"} ${url}`);
          return fetch(url, init);
        },
        now: Date.now,
        size: () => ({ cols: 120, rows: 40 }),
        write: (text) => (out += text),
        raw: (on) => raw.push(on),
        project: "importer",
        token: () => null,
      },
      { ...config({ SQUAD_PORT: String(broker.port) }), intervalMs: 50 }
    );
    // The colors split the line: the text is what is left without the escapes
    const text = () => out.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
    await waitFor(() => text().includes(`importer › ${FEATURE.title}`), "the title of the feature on the screen");
    expect(out.startsWith(ENTER)).toBe(true);
    expect(text()).toContain(`workflow ${FEATURE.workflow}`);
    expect(text()).toContain(`▶ feature aberta · ${FEATURE.title}`);
    expect(text()).toContain("broker ● conectado");

    // An event written after the first read reaches the screen
    await post(broker.url, "/blocked", { id: mother.json.id, reason: "sem acesso ao repositório", detail: "git fetch → 403", last_action: "git fetch" });
    await waitFor(() => text().includes("⚠ mot [blocked] sem acesso ao repositório"), "the new event on the screen");

    tui.key("q");
    await tui.done;
    expect(out.endsWith(LEAVE)).toBe(true);
    expect(raw).toEqual([true, false]);
    expect(asked.length).toBeGreaterThan(1);
    expect(asked[0]).toBe(`GET ${broker.url}/events?after=0`);
    for (const call of asked) expect(call).toMatch(/^GET http:\/\/127\.0\.0\.1:\d+\/events\?after=\d+$/);
    // The log has only what the test wrote
    const after = (await (await fetch(`${broker.url}/events`)).json()) as { last_seq: number };
    expect(after.last_seq).toBe(before.last_seq + 1);
  } finally {
    tui?.stop();
    await broker.stop();
  }
});

test("QST-83: the credential is what the file of SQUAD_TOKEN_FILE has when it is asked for, and null without the file or with an empty one", () => {
  const dir = tempDir();
  try {
    const env = { SQUAD_TOKEN_FILE: join(dir, "the token") };
    expect(credential(env)).toBeNull();
    writeFileSync(env.SQUAD_TOKEN_FILE, "");
    expect(credential(env)).toBeNull();
    writeFileSync(env.SQUAD_TOKEN_FILE, " \n");
    expect(credential(env)).toBeNull();
    // The broker writes it after the TUI started
    writeFileSync(env.SQUAD_TOKEN_FILE, "0f".repeat(32));
    expect(credential(env)).toBe("0f".repeat(32));
    writeFileSync(env.SQUAD_TOKEN_FILE, "1e".repeat(32) + "\n");
    expect(credential(env)).toBe("1e".repeat(32));
  } finally {
    removeDir(dir);
  }
});

test("QST-83: the token of the terminal entry is what the file of SQUAD_TOKEN_FILE has when it is asked for, and null without the file or with an empty one", () => {
  const dir = tempDir();
  try {
    const env = { SQUAD_TOKEN_FILE: join(dir, "the token") };
    const io = terminal("importer", env);
    expect(io.token()).toBeNull();
    writeFileSync(env.SQUAD_TOKEN_FILE, "");
    expect(io.token()).toBeNull();
    // The broker writes it after the entry was put together
    writeFileSync(env.SQUAD_TOKEN_FILE, "0f".repeat(32) + "\n");
    expect(io.token()).toBe("0f".repeat(32));
    expect(io.project).toBe("importer");
  } finally {
    removeDir(dir);
  }
});

test("QST-76, QST-80, QST-86: over a real broker the TUI, fed with keys, answers one question by an option and another by a text, and gets the refusal of one that closed", async () => {
  const broker = await startBroker();
  let out = "";
  const asked: string[] = [];
  // While set, a read of the TUI is answered with no news: the broker goes on without it
  let stale = false;
  let tui: ReturnType<typeof start> | undefined;
  try {
    // Three live pids a test has at hand
    const ids: Record<string, string> = {};
    for (const [name, pid] of [["mother", broker.proc.pid], ["leader", process.ppid], ["worker-1", process.pid]] as const) {
      ids[name] = (await post(broker.url, "/register", { pid, cwd: "/work/wt", git_root: "/work/importer/.git", name, role: name === "worker-1" ? "worker" : name })).json.id;
    }
    await openFeature(broker.url, ids.mother!);
    // Q-01 blocks worker-1 and goes up to the dev with two options; Q-02 of the mother goes on
    // with its default; Q-03 of the mother blocks and has no option
    expect((await post(broker.url, "/ask", { id: ids["worker-1"], to: "leader", summary: "which port?", body: "8080 or 9090?", why: "the spec gives two", blocking: true, options: ["8080", "9090"] })).json.question_id).toBe(1);
    for (const name of ["leader", "mother"]) expect((await post(broker.url, "/escalate", { id: ids[name], question_id: 1 })).json.ok).toBe(true);
    expect((await post(broker.url, "/ask", { id: ids.mother, to: "human", summary: "which host?", why: "the spec names none", blocking: false, default: "localhost" })).json.question_id).toBe(2);
    expect((await post(broker.url, "/ask", { id: ids.mother, to: "human", summary: "which region?", why: "the deploy needs one", blocking: true })).json.question_id).toBe(3);

    tui = start(
      {
        fetch: async (url, init) => {
          const method = init?.method ?? "GET";
          asked.push(`${method} ${url}`);
          if (stale && method === "GET") return Response.json({ events: [], last_seq: Number(new URL(url).searchParams.get("after")) });
          return fetch(url, init);
        },
        now: Date.now,
        size: () => ({ cols: 120, rows: 40 }),
        write: (text) => (out += text),
        raw: () => {},
        project: "importer",
        token: () => credential({ SQUAD_TOKEN_FILE: broker.tokenFile }),
      },
      { ...config({ SQUAD_PORT: String(broker.port) }), intervalMs: 50 }
    );
    const text = () => out.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
    const shows = (what: string) => waitFor(() => text().includes(what), `"${what}" on the screen`);
    const answers = async () =>
      ((await get(broker.url, "/events")).json.events as any[]).filter((e) => e.kind === "answer").map((e) => ({ from: e.from, to: e.to, question_id: e.question_id, answer: e.answer, resolved_by: e.resolved_by }));

    tui.key("4");
    // The two that block first, in the order they reached the dev
    await shows("perguntas abertas · 3");
    await shows("▶ Q-01 [BLOQUEANTE]");

    // Q-01 by the second of its options
    tui.key("\r");
    await shows("? responder Q-01 · BLOQUEANTE");
    tui.key("2");
    tui.key("\r");
    await shows("✓ Q-01 respondida");
    const first = { from: "human", to: "worker-1", question_id: 1, answer: "9090", resolved_by: "human" };
    expect(await answers()).toEqual([first]);

    // Q-02 by a text: it comes after Q-03, which blocks
    await shows("perguntas abertas · 2");
    tui.key("j");
    await shows("▶ Q-02 timeout");
    tui.key("\r");
    await shows("? responder Q-02 · timeout");
    tui.key(" 127.0.0.1, sem TLS ");
    tui.key("\r");
    await shows("✓ Q-02 respondida");
    const second = { from: "human", to: "mother", question_id: 2, answer: "127.0.0.1, sem TLS", resolved_by: "human" };
    expect(await answers()).toEqual([first, second]);

    // Q-03 closes with the feature while the dev writes, before the TUI reads it
    await shows("perguntas abertas · 1");
    tui.key("\r");
    await shows("? responder Q-03 · BLOQUEANTE");
    tui.key("sa-east-1");
    stale = true;
    await Bun.sleep(200);
    expect((await post(broker.url, "/close-feature", { id: ids.mother, outcome: "abandoned" })).json.ok).toBe(true);
    tui.key("\r");
    await shows("✗ recusada pelo broker: Q-03 já fechada");
    await shows(" esc fechar");
    // And the read that shows the feature closed takes the modal away
    stale = false;
    await shows("Q-03 fechada");

    tui.key("q");
    await tui.done;
    // The log has the two answers of the dev and no other
    expect(await answers()).toEqual([first, second]);
    const posts = asked.filter((call) => call.startsWith("POST"));
    expect(posts).toEqual([`POST ${broker.url}/answer`, `POST ${broker.url}/answer`, `POST ${broker.url}/answer`]);
    for (const call of asked) expect(call).toMatch(/^(GET http:\/\/127\.0\.0\.1:\d+\/events\?after=\d+|POST http:\/\/127\.0\.0\.1:\d+\/answer)$/);
    // The credential of the file went in the three and was never drawn
    const token = readFileSync(broker.tokenFile, "utf8").trim();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(text()).not.toContain(token.slice(0, 12));
  } finally {
    tui?.stop();
    await broker.stop();
  }
});
