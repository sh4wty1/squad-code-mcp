import { expect, test } from "bun:test";
import { join } from "node:path";
import { config, project, start } from "../../tui.ts";
import { ENTER, LEAVE } from "../../tui/ansi.ts";
import { BROKER_DIR, cleanEnv, FEATURE, openFeature, post, removeDir, startBroker, tempDir, waitFor } from "./helpers.ts";

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
