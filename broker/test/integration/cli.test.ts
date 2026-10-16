import { afterAll, afterEach, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { BROKER_DIR, cleanEnv, freePort, isUp, post, removeDir, startBroker, tempDir, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

// A second loopback address to listen on. macOS has none unless one is configured.
const DECOY_HOST = "127.0.0.2";
const canListenOnDecoyHost = await new Promise<boolean>((resolve) => {
  const server = createServer();
  server.once("error", () => resolve(false));
  server.listen(0, DECOY_HOST, () => server.close(() => resolve(true)));
});

async function cli(b: Broker, command: string, extraEnv: Record<string, string> = {}) {
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "cli.ts"), command], {
    env: cleanEnv({ SQUAD_PORT: String(b.port), ...extraEnv }),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { out, err, code: await proc.exited };
}

// `bun cli.ts` with these arguments, outside a terminal, with the settings given. With an
// `input`, its standard input is a pipe that gets the text and is closed.
async function runCli(args: string[], env: Record<string, string> = {}, cwd = BROKER_DIR, input?: string) {
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "cli.ts"), ...args], {
    env: cleanEnv(env),
    cwd,
    stdin: input === undefined ? "ignore" : "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  if (input !== undefined) {
    proc.stdin!.write(input);
    await proc.stdin!.end();
  }
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { out, err, code: await proc.exited };
}

// The command each line of the usage is about, in the order they are written
function usageCommands(out: string): string[] {
  return out.split(/\r?\n/).flatMap((line) => line.match(/^\s+squad (\S+)/)?.[1] ?? []);
}

test("PAP-59: without a command the CLI writes the usage, one line for each of the four commands, and exits 0", async () => {
  const res = await runCli([]);
  expect(usageCommands(res.out)).toEqual(["start", "tui", "status", "kill-broker"]);
  expect(res.err).toBe("");
  expect(res.code).toBe(0);
});

test("PAP-59: with an unknown command the CLI writes the same usage and exits 1", async () => {
  const usage = (await runCli([])).out;
  const res = await runCli(["nada"]);
  expect(usageCommands(res.out)).toEqual(["start", "tui", "status", "kill-broker"]);
  expect(res.out).toBe(usage);
  expect(res.code).toBe(1);
});

test("PAP-59: start is the launcher: a role that is not one of the four is one line of squad: and the exit code 1", async () => {
  const res = await runCli(["start", "nada"]);
  expect(res.err).toMatch(/^squad: .*nada.*\r?\n$/);
  expect(res.out).toBe("");
  expect(res.code).toBe(1);
});

test("PAP-50: start with a session command that does not exist exits 1 and names the command", async () => {
  // the real path: the temporary directory may come in its short form on Windows
  const dir = realpathSync(tempDir());
  try {
    const git = (...args: string[]) => {
      const result = Bun.spawnSync(["git", "-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd: dir });
      if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
      return result.stdout.toString();
    };
    git("init", "-q", "the repo");
    git("-C", "the repo", "commit", "-q", "--allow-empty", "-m", "first");
    const main = join(dir, "the repo");
    const command = "squad-no-such-command-4f2a";
    const res = await runCli(
      ["start", "mother"],
      // a port with nobody listening, and a directory of worktrees of the test, which the mother never uses
      { SQUAD_CLAUDE: command, SQUAD_PORT: String(await freePort()), SQUAD_WORKTREES: join(dir, "trees") },
      main
    );
    expect(res.err).toMatch(/^squad: .*\r?\n$/);
    expect(res.err).toContain(command);
    expect(res.out).toBe("");
    expect(res.code).toBe(1);
    expect(existsSync(join(dir, "trees"))).toBe(false);
    expect(git("-C", "the repo", "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
  } finally {
    removeDir(dir);
  }
}, 30_000);

function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", "-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
  return result.stdout.toString();
}

// The working trees git lists for the repository `cwd` is in, as git writes their paths
function worktrees(cwd: string): string[] {
  const list = Bun.spawnSync(["git", "worktree", "list", "--porcelain"], { cwd }).stdout.toString();
  return [...list.matchAll(/^worktree (.+)$/gm)].map((line) => line[1]!);
}

type Started = { res: Awaited<ReturnType<typeof runCli>>; main: string; trees: string };

// `squad start <role>` run to the end, from a subdirectory of a repository of the test in a
// path with a space, with `command` in the place of the session command and `input`, when
// given, on the standard input of the CLI. `env` are settings of the test over the ones here.
async function startWith(command: string, role: string, check: (started: Started) => void, input?: string, env: Record<string, string> = {}) {
  // the real path: the temporary directory may come in its short form on Windows
  const dir = realpathSync(tempDir());
  try {
    const main = join(dir, "the repo");
    const trees = join(dir, "the trees");
    git(dir, "init", "-q", "the repo");
    git(main, "commit", "-q", "--allow-empty", "-m", "first");
    mkdirSync(join(main, "a dir"));
    const res = await runCli(
      ["start", role],
      {
        SQUAD_CLAUDE: command,
        // a port with nobody listening: no feature is open and nobody is online
        SQUAD_PORT: String(await freePort()),
        SQUAD_WORKTREES: trees,
        // git answers in English whatever the language of the machine
        LC_ALL: "C",
        // a launcher that took the directory of the broker for the current one finds no
        // repository there, instead of writing in the one of the squad
        GIT_CEILING_DIRECTORIES: join(BROKER_DIR, ".."),
        ...env,
      },
      join(main, "a dir"),
      input
    );
    check({ res, main, trees });
  } finally {
    removeDir(dir);
  }
}

// With git in the place of the session command: it refuses the first argument of a session
// on its standard error and exits 129
const startWithGit = (role: string, check: (started: Started) => void) => startWith("git", role, check);

// SQUAD_CLAUDE takes a command alone, with no arguments of its own, so a session command of
// the tests is a script compiled once into a directory of its own, by the bun that runs
// them: the same on Windows and on Linux.
const compiled = new Map<string, { dir: string; command: string }>();

function compile(source: string): string {
  let built = compiled.get(source);
  if (!built) {
    const dir = realpathSync(tempDir());
    writeFileSync(join(dir, "session.ts"), source);
    const build = Bun.spawnSync([process.execPath, "build", "--compile", "session.ts", "--outfile", "session"], { cwd: dir, env: cleanEnv({}) });
    if (build.exitCode !== 0) throw new Error(`bun build --compile: ${build.stderr.toString()}`);
    built = { dir, command: join(dir, process.platform === "win32" ? "session.exe" : "session") };
    compiled.set(source, built);
  }
  return built.command;
}

afterAll(() => {
  for (const { dir } of compiled.values()) removeDir(dir);
});

// A session command that takes the terminal: it ignores its arguments, copies its standard
// input to its standard output and exits 42
const echoCommand = () => compile("await Bun.write(Bun.stdout, await Bun.stdin.text());\nprocess.exitCode = 42;\n");

// A session command that says what it was opened with: its arguments, its directory and its
// environment, as JSON on its standard output
const reportCommand = () => compile("console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), env: process.env }));\n");

type Reported = { args: string[]; cwd: string; env: Record<string, string | undefined> };

test("PAP-37: start mother gives the session command the standard error of the launcher and exits with its code", async () => {
  await startWithGit("mother", ({ res }) => {
    expect(res.err).toContain("unknown option: --plugin-dir");
    expect(res.code).toBe(129);
  });
}, 30_000);

test("PAP-37: start worker opens the session command in a worktree of the repository it runs from and exits with its code", async () => {
  const squad = worktrees(BROKER_DIR);
  await startWithGit("worker", ({ res, main, trees }) => {
    expect(res.err).toContain("unknown option: --plugin-dir");
    expect(res.code).toBe(129);
    // of the repository of the test, under its SQUAD_WORKTREES
    expect(worktrees(main).map((tree) => realpathSync(tree))).toEqual([main, join(trees, "worker-1")]);
    // and the repository of the squad has the trees it had
    expect(worktrees(BROKER_DIR)).toEqual(squad);
  });
}, 60_000);

test("PAP-37: start gives the session command the standard input and the standard output of the launcher and exits with its code", async () => {
  const typed = "the first line typed\nand the second\n";
  await startWith(
    echoCommand(),
    "mother",
    ({ res }) => {
      expect(res.out).toBe(typed);
      expect(res.code).toBe(42);
    },
    typed
  );
}, 60_000);

test("PAP-37: with a broker that takes the connection and never answers, start exits with the code of the session soon after it, with the read of the log abandoned", async () => {
  const sockets = new Set<import("node:net").Socket>();
  const silent = createServer((socket) => void sockets.add(socket));
  await new Promise<void>((done) => silent.listen(0, "127.0.0.1", done));
  try {
    const port = String((silent.address() as { port: number }).port);
    const started = Date.now();
    await startWith(
      "git",
      "mother",
      ({ res }) => {
        expect(res.code).toBe(129);
        // 2000 ms of the read and the session, which exits at once; a read left waiting holds
        // the launcher for minutes
        expect(Date.now() - started).toBeLessThan(10_000);
      },
      undefined,
      { SQUAD_PORT: port }
    );
    // the launcher did reach the broker
    expect(sockets.size).toBeGreaterThan(0);
  } finally {
    for (const socket of sockets) socket.destroy();
    silent.close();
  }
}, 30_000);

test("PAP-45: start gives the launcher the platform it runs on: the session has the PowerShell rules on win32, and only there", async () => {
  await startWith(reportCommand(), "mother", ({ res }) => {
    const { args } = JSON.parse(res.out) as Reported;
    expect(args).toContain("Bash(git status:*)");
    expect(args.filter((arg) => arg.startsWith("PowerShell(")).length > 0).toBe(process.platform === "win32");
    expect(args.includes("PowerShell(git status:*)")).toBe(process.platform === "win32");
    expect(res.code).toBe(0);
  });
}, 60_000);

test("PAP-52: start worker opens the session command in its worktree, with its name and its role in the environment and, of the CLAUDE variables of the launcher, only the ones of the dev", async () => {
  await startWith(
    reportCommand(),
    "worker",
    ({ res, trees }) => {
      const { cwd, env } = JSON.parse(res.out) as Reported;
      expect(realpathSync(cwd)).toBe(join(trees, "worker-1"));
      // PAP-39
      expect(env.SQUAD_NAME).toBe("worker-1");
      expect(env.SQUAD_ROLE).toBe("worker");
      expect(env.CLAUDECODE).toBeUndefined();
      expect(env.CLAUDE_CODE_ENTRYPOINT).toBeUndefined();
      expect(env.CLAUDE_CONFIG_DIR).toBe("the config of the dev");
      expect(env.PAP_OF_THE_LAUNCHER).toBe("kept");
      expect(res.code).toBe(0);
    },
    undefined,
    { CLAUDECODE: "1", CLAUDE_CODE_ENTRYPOINT: "cli", CLAUDE_CONFIG_DIR: "the config of the dev", PAP_OF_THE_LAUNCHER: "kept" }
  );
}, 60_000);

test("PAP-38: start worker reads the log of the broker of SQUAD_PORT: with worker-1 online the session is worker-2", async () => {
  broker = await startBroker();
  await post(broker.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "worker-1", role: "worker" });
  await startWith(
    reportCommand(),
    "worker",
    ({ res, trees }) => {
      const { cwd, env } = JSON.parse(res.out) as Reported;
      expect(env.SQUAD_NAME).toBe("worker-2");
      expect(realpathSync(cwd)).toBe(join(trees, "worker-2"));
      expect(res.code).toBe(0);
    },
    undefined,
    { SQUAD_PORT: String(broker.port) }
  );
}, 60_000);

test("PAP-59: tui runs the TUI of the squad from another directory too", async () => {
  const dir = tempDir();
  try {
    const res = await runCli(["tui"], { SQUAD_PORT: String(await freePort()) }, dir);
    expect(res.err).toContain("tui needs a terminal");
    expect(res.out).toBe("");
    expect(res.code).toBe(1);
  } finally {
    removeDir(dir);
  }
});

test("PAP-59: on a terminal tui draws the TUI on it, takes the q typed on it and exits with the code 0 of the TUI", async () => {
  const decoder = new TextDecoder();
  let screen = "";
  // a terminal of 120×40 in the place of the standard input, output and error of the CLI
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "cli.ts"), "tui"], {
    env: cleanEnv({ SQUAD_PORT: String(await freePort()) }),
    terminal: { cols: 120, rows: 40, data: (_terminal, data) => void (screen += decoder.decode(data, { stream: true })) },
  });
  try {
    // the key of the footer of every screen: the TUI drew
    await waitFor(() => screen.includes("sair"), "the TUI to draw on the terminal");
    proc.terminal!.write("q");
    expect(await proc.exited).toBe(0);
    expect(screen).not.toContain("tui needs a terminal");
  } finally {
    proc.kill();
  }
}, 30_000);

test("PAP-59: tui runs the TUI on the same terminal and exits with its code", async () => {
  const env = { SQUAD_PORT: String(await freePort()) };
  // outside a terminal `bun tui.ts` refuses to start
  const tui = Bun.spawn([process.execPath, join(BROKER_DIR, "tui.ts")], { env: cleanEnv(env), stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const direct = { err: await new Response(tui.stderr).text(), code: await tui.exited };
  expect(direct.code).toBe(1);
  expect(direct.err).toContain("tui needs a terminal");

  const res = await runCli(["tui"], env);
  expect(res.code).toBe(direct.code);
  expect(res.err).toBe(direct.err);
  expect(res.out).toBe("");
});

test("PAP-59: the package of the broker gives the command squad, which is cli.ts", () => {
  const pkg = JSON.parse(readFileSync(join(BROKER_DIR, "package.json"), "utf8"));
  expect(pkg.bin).toEqual({ squad: "./cli.ts" });
});

test("PEER-36: status prints the broker state and the number of registered peers", async () => {
  broker = await startBroker();
  expect((await cli(broker, "status")).out.split(/\r?\n/)).toContain("Broker: ok (0 peer(s) registered)");
  await post(broker.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "mother", role: "mother" });
  expect((await cli(broker, "status")).out.split(/\r?\n/)).toContain("Broker: ok (1 peer(s) registered)");
});

test("PEER-35: kill-broker ends the broker process and /health stops answering", async () => {
  broker = await startBroker();
  const { url, proc } = broker;
  expect(await isUp(url)).toBe(true);
  await cli(broker, "kill-broker");
  await waitFor(async () => !(await isUp(url)), "the broker to stop answering");
  await proc.exited;
  expect(proc.killed || proc.exitCode !== null).toBe(true);
  expect(await isUp(url)).toBe(false);
});

test("PEER-44: kill-broker that cannot look up the broker process says it is still running and exits 1", async () => {
  broker = await startBroker();
  // lsof and netstat are found through the path, whatever the case of its name on Windows
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const empty = tempDir();
  const res = await cli(broker, "kill-broker", { [pathKey]: empty });
  removeDir(empty);
  expect(res.code).toBe(1);
  expect(res.err).toMatch(/^Could not stop the broker: .+\. It is still running\.$/m);
  expect(res.out + res.err).not.toContain("Broker is not running.");
  expect(await isUp(broker.url)).toBe(true);
});

test.skipIf(!canListenOnDecoyHost)(
  "PEER-45: kill-broker does not signal a process listening on the same port of another address",
  async () => {
    broker = await startBroker();
    const { url, port, proc } = broker;
    const decoyUrl = `http://${DECOY_HOST}:${port}`;
    const decoy = Bun.spawn(
      [
        process.execPath,
        "-e",
        `Bun.serve({ hostname: "${DECOY_HOST}", port: ${port}, fetch: () => new Response("decoy") })`,
      ],
      { stdio: ["ignore", "ignore", "ignore"] }
    );
    try {
      await waitFor(() => isUp(decoyUrl), "the decoy to listen");
      expect((await cli(broker, "kill-broker")).code).toBe(0);
      await waitFor(async () => !(await isUp(url)), "the broker to stop answering");
      await proc.exited;
      // A signal sent to the decoy went out together with the one that stopped the broker
      await Bun.sleep(300);
      expect(decoy.exitCode).toBeNull();
      expect(await (await fetch(decoyUrl)).text()).toBe("decoy");
    } finally {
      decoy.kill();
      await decoy.exited;
    }
  }
);

// A stand-in for lsof that answers what the test says. Windows looks the listener up with netstat.
for (const [what, script, reason] of [
  ["finds no listener", "exit 1", /no process found listening on 127\.0\.0\.1:\d+/],
  ["cannot signal the listener it found", "echo $DEAD_PID", /ESRCH|No such process/i],
] as const) {
  test.skipIf(process.platform === "win32")(
    `PEER-44: kill-broker that ${what} says the broker is still running and exits 1`,
    async () => {
      broker = await startBroker();
      const bin = tempDir();
      writeFileSync(join(bin, "lsof"), `#!/bin/sh\n${script}\n`);
      chmodSync(join(bin, "lsof"), 0o755);
      const dead = Bun.spawn([process.execPath, "-e", ""], { stdio: ["ignore", "ignore", "ignore"] });
      await dead.exited;
      const res = await cli(broker, "kill-broker", { PATH: bin, DEAD_PID: String(dead.pid) });
      removeDir(bin);
      expect(res.code).toBe(1);
      expect(res.err).toMatch(/^Could not stop the broker: .+\. It is still running\.$/m);
      expect(res.err).toMatch(reason);
      expect(res.out + res.err).not.toContain("Broker is not running.");
      expect(res.out).not.toContain("Broker stopped.");
      expect(await isUp(broker.url)).toBe(true);
    }
  );
}
