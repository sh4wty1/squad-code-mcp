import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { launch, type Deps } from "../../launch.ts";
import type { SquadEvent } from "../../shared/contract.ts";
import { SQUAD } from "../../shared/derive.ts";

// git for real, in temporary repositories. On Windows each call takes a while.
const SLOW = 60_000;

const FEATURE = "feat/importer";
const PLUGIN = resolve(import.meta.dir, "..", "..", "..", "plugin");

function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", "-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
  return result.stdout.toString().trim();
}

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

// A temporary directory by its real path: it may come in its short form on Windows
function temp(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "squad-launch-")));
  dirs.push(dir);
  return dir;
}

function commit(main: string, file: string, text: string) {
  writeFileSync(join(main, file), text);
  git(main, "add", "--", file);
  git(main, "commit", "-q", "-m", `add ${file}`);
}

// A repository in a path with a space, on main with one commit, an untracked .env, and the
// branch of the feature one commit ahead. Nothing else in its parent: the default directory
// of worktrees lands there.
function repo() {
  const parent = temp();
  const main = join(parent, "the repo");
  git(parent, "init", "-q", "-b", "main", "the repo");
  commit(main, "README.md", "the project\n");
  git(main, "switch", "-q", "-c", FEATURE);
  commit(main, "importer.txt", "the importer\n");
  git(main, "switch", "-q", "main");
  writeFileSync(join(main, ".env"), "KEY=1\n");
  return { parent, main, worktrees: join(parent, "the repo.squad") };
}

const head = (dir: string) => git(dir, "rev-parse", "HEAD");
const tip = (main: string) => git(main, "rev-parse", `refs/heads/${FEATURE}`);
const branch = (dir: string) => git(dir, "branch", "--show-current");
const trees = (main: string) => git(main, "worktree", "list", "--porcelain");
const same = (a: string, b: string) => expect(realpathSync(a)).toBe(realpathSync(b));

// ---- the log the launcher reads ----

const T0 = 1791331200000;

function event(seq: number, fields: Record<string, unknown>): SquadEvent {
  return {
    seq,
    ts: T0 + seq * 1000,
    feature_id: null,
    role_from: SQUAD.find((a) => a.name === fields.from)?.role ?? fields.from,
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    ...fields,
  } as SquadEvent;
}

function joined(seq: number, peer: string): SquadEvent {
  return event(seq, { kind: "peer_joined", from: "broker", peer, role: SQUAD.find((a) => a.name === peer)?.role });
}

function left(seq: number, peer: string): SquadEvent {
  return event(seq, { kind: "peer_left", from: "broker", peer, reason: "unregistered" });
}

function opened(seq: number, name = FEATURE, id = 1): SquadEvent {
  return event(seq, {
    kind: "feature_opened", feature_id: id, from: "mother", to: "*", title: "the importer", workflow: "tlc",
    branch: name, base_branch: "main", spec_ref: ".specs/features/importer/spec.md", spec_commit: "9f8e7d6",
  });
}

function closed(seq: number, id = 1): SquadEvent {
  return event(seq, { kind: "feature_closed", feature_id: id, from: "mother", to: "*", outcome: "delivered" });
}

// A broker that answers the log with these events
function logOf(events: SquadEvent[]): Deps["fetch"] {
  return async () => Response.json({ events });
}

// ---- launch, with a spawn that only records ----

const ENV = { PATH: "/usr/bin", HOME: "/home/dev", CLAUDECODE: "1", CLAUDE_CODE_ENTRYPOINT: "cli", CLAUDE_PLUGIN_ROOT: "/x/plugin" };

type Spawned = { command: string; args: string[]; cwd: string; env: Record<string, string | undefined> };

async function run(argv: string[], cwd: string, over: Partial<Deps> = {}) {
  const spawned: Spawned[] = [];
  const lines: string[] = [];
  const code = await launch(argv, {
    env: ENV,
    cwd,
    platform: "linux",
    fetch: logOf([]),
    spawn: async (command, args, options) => {
      spawned.push({ command, args, ...options });
      return 7;
    },
    stderr: (line) => lines.push(line),
    ...over,
  });
  return { code, spawned, lines };
}

// The name and the role a session was opened with
const session = (s: Spawned | undefined) => [s?.env.SQUAD_NAME, s?.env.SQUAD_ROLE];

// A roles file of the test
function rolesFile(content: unknown): string {
  const path = join(temp(), "roles.json");
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content));
  return path;
}

const WORKER_TOOLS = [
  "mcp__plugin_squad_squad__ready",
  "mcp__plugin_squad_squad__list_peers",
  "mcp__plugin_squad_squad__state",
  "mcp__plugin_squad_squad__history",
  "mcp__plugin_squad_squad__blocked",
  "mcp__plugin_squad_squad__unblocked",
  "mcp__plugin_squad_squad__send_result",
  "mcp__plugin_squad_squad__ask",
  "mcp__plugin_squad_squad__answer",
  "mcp__plugin_squad_squad__escalate",
];

const WORKER_BASH = [
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git show:*)",
  "Bash(git rev-parse:*)",
  "Bash(git switch:*)",
  "Bash(git add:*)",
  "Bash(git commit:*)",
];

// The system prompt of worker-1 from the roles file of the plugin (PAP-34)
const WORKER_PROMPT =
  "Squad name: worker-1. Squad role: worker.\n" +
  "Base skills of your role: coding-guidelines, ponytail, write-commit, codenavi.\n" +
  "With the tlc workflow, also: tlc-implement.\n" +
  "With the matt-pocock workflow, also: implement.\n" +
  "Use only the skills of the workflow of the open feature.";

test("PAP-37: start worker opens one process, claude, with the arguments, the environment and the worktree of the session, and gives its exit code", async () => {
  const { main, worktrees } = repo();
  const { code, spawned, lines } = await run(["worker"], main);

  expect(spawned).toHaveLength(1);
  expect(spawned[0]!.command).toBe("claude");
  expect(spawned[0]!.args).toEqual([
    "--plugin-dir",
    PLUGIN,
    "--dangerously-load-development-channels",
    "plugin:squad@inline",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    ...WORKER_TOOLS,
    ...WORKER_BASH,
    "--append-system-prompt",
    WORKER_PROMPT,
    "/squad:worker",
  ]);
  expect(spawned[0]!.env).toEqual({ PATH: "/usr/bin", HOME: "/home/dev", SQUAD_NAME: "worker-1", SQUAD_ROLE: "worker" });
  same(spawned[0]!.cwd, join(worktrees, "worker-1"));
  expect(code).toBe(7);
  expect(lines).toEqual([]);
}, SLOW);

test("PAP-37: the command of the session is the one of SQUAD_CLAUDE when it is set", async () => {
  const { main } = repo();
  const { code, spawned } = await run(["mother"], main, { env: { ...ENV, SQUAD_CLAUDE: "my-claude" } });
  expect(spawned.map((s) => s.command)).toEqual(["my-claude"]);
  expect(spawned[0]!.env).toEqual({
    PATH: "/usr/bin",
    HOME: "/home/dev",
    SQUAD_CLAUDE: "my-claude",
    SQUAD_NAME: "mother",
    SQUAD_ROLE: "mother",
  });
  expect(code).toBe(7);
}, SLOW);

test("PAP-45: the allowed list of the session follows the platform the launcher is given", async () => {
  const { main } = repo();
  const { spawned } = await run(["worker"], main, { platform: "win32" });
  expect(spawned[0]!.args.slice(7, -3)).toEqual([
    ...WORKER_TOOLS,
    ...WORKER_BASH,
    "PowerShell(git status:*)",
    "PowerShell(git diff:*)",
    "PowerShell(git log:*)",
    "PowerShell(git show:*)",
    "PowerShell(git rev-parse:*)",
    "PowerShell(git switch:*)",
    "PowerShell(git add:*)",
    "PowerShell(git commit:*)",
  ]);
}, SLOW);

test("PAP-47: start with --skip-permissions opens the session without the mode and the allowed list", async () => {
  const { main } = repo();
  const { spawned } = await run(["worker", "--skip-permissions"], main);
  expect(spawned.map((s) => s.args)).toEqual([
    [
      "--plugin-dir",
      PLUGIN,
      "--dangerously-load-development-channels",
      "plugin:squad@inline",
      "--dangerously-skip-permissions",
      "--append-system-prompt",
      WORKER_PROMPT,
      "/squad:worker",
    ],
  ]);
}, SLOW);

// ---- the name ----

// One repository for the tests that only say which name a session takes: its worktrees pile up
let names: ReturnType<typeof repo> | undefined;
const namesRepo = () => (names ??= repo());

for (const role of ["mother", "leader", "judge"] as const) {
  test(`PAP-38: without a name the ${role} takes its role as its name, whoever is online`, async () => {
    const { main } = namesRepo();
    const { spawned } = await run([role], main, { fetch: logOf([joined(1, role)]) });
    expect(spawned.map(session)).toEqual([[role, role]]);
    expect(spawned[0]!.args.at(-2)).toStartWith(`Squad name: ${role}. Squad role: ${role}.\n`);
  }, SLOW);
}

test("PAP-38: without a name a worker is worker-1 when the log is empty", async () => {
  const { spawned } = await run(["worker"], namesRepo().main, { fetch: logOf([]) });
  expect(spawned.map(session)).toEqual([["worker-1", "worker"]]);
}, SLOW);

test("PAP-38: without a name a worker is worker-2 when worker-1 is online", async () => {
  const { worktrees, main } = namesRepo();
  const { spawned } = await run(["worker"], main, { fetch: logOf([joined(1, "worker-1")]) });
  expect(spawned.map(session)).toEqual([["worker-2", "worker"]]);
  same(spawned[0]!.cwd, join(worktrees, "worker-2"));
  expect(spawned[0]!.args.at(-2)).toStartWith("Squad name: worker-2. Squad role: worker.\n");
}, SLOW);

test("PAP-38: without a name a worker is worker-1 again after the peer_left of worker-1", async () => {
  const log = [joined(1, "worker-1"), joined(2, "worker-2"), left(3, "worker-1")];
  const { spawned } = await run(["worker"], namesRepo().main, { fetch: logOf(log) });
  expect(spawned.map(session)).toEqual([["worker-1", "worker"]]);
}, SLOW);

test("PAP-38: without a name a worker is worker-3 when worker-1 and worker-2 are online", async () => {
  const log = [joined(1, "worker-2"), joined(2, "worker-1"), joined(3, "leader")];
  const { spawned } = await run(["worker"], namesRepo().main, { fetch: logOf(log) });
  expect(spawned.map(session)).toEqual([["worker-3", "worker"]]);
}, SLOW);

test("PAP-38: the log is read from GET /events?after=0 of the broker of the environment", async () => {
  const urls: string[] = [];
  const fetch: Deps["fetch"] = async (url) => {
    urls.push(String(url));
    return Response.json({ events: [joined(1, "worker-1")] });
  };
  const { spawned } = await run(["worker"], namesRepo().main, { env: { ...ENV, SQUAD_PORT: "7955" }, fetch });
  expect(urls).toEqual(["http://127.0.0.1:7955/events?after=0"]);
  expect(spawned.map(session)).toEqual([["worker-2", "worker"]]);
}, SLOW);

for (const [what, fetch] of [
  ["fails", async () => Promise.reject(new Error("connection refused"))],
  ["answers with another status", async () => Response.json({ events: [joined(1, "worker-1")] }, { status: 500 })],
  ["answers something without a list of events", async () => Response.json({ ok: true, events: "none" })],
] as [string, Deps["fetch"]][]) {
  test(`PAP-38: without a name a worker is worker-1 when the read of the log ${what}`, async () => {
    const { code, spawned, lines } = await run(["worker"], namesRepo().main, { fetch });
    expect(spawned.map(session)).toEqual([["worker-1", "worker"]]);
    expect(code).toBe(7);
    expect(lines).toEqual([]);
  }, SLOW);
}

test("PAP-38: without a name a worker is worker-1 when the broker does not answer in 2000 ms", async () => {
  const { main } = namesRepo();
  // neither an answer nor a failure, whatever the signal says
  const fetch: Deps["fetch"] = () => new Promise<Response>(() => {});
  const started = performance.now();
  const { code, spawned } = await run(["worker"], main, { fetch });
  const ms = performance.now() - started;
  expect(spawned.map(session)).toEqual([["worker-1", "worker"]]);
  expect(code).toBe(7);
  expect(ms).toBeGreaterThanOrEqual(2000);
  // the deadline, and the git of a start that adds no worktree
  expect(ms).toBeLessThan(5000);
}, SLOW);

test("PAP-49: a name that is given and is online in the log opens the session all the same", async () => {
  const { main, worktrees } = namesRepo();
  const log = [joined(1, "worker-1"), joined(2, "worker-2"), joined(3, "worker-3")];
  const { code, spawned, lines } = await run(["worker", "worker-2"], main, { fetch: logOf(log) });
  expect(spawned.map(session)).toEqual([["worker-2", "worker"]]);
  same(spawned[0]!.cwd, join(worktrees, "worker-2"));
  expect(code).toBe(7);
  expect(lines).toEqual([]);
}, SLOW);

// ---- where the session opens ----

test("PAP-51: the mother opens in the main checkout, also from inside a worktree, and nothing is created", async () => {
  const { parent, main, worktrees } = repo();
  const other = join(parent, "another tree");
  git(main, "worktree", "add", "-q", "--detach", other);
  const before = { trees: trees(main), parent: readdirSync(parent).sort(), main: readdirSync(main).sort(), status: git(main, "status", "--porcelain") };

  const fromMain = await run(["mother"], main, { fetch: logOf([opened(1)]) });
  const fromTree = await run(["mother"], other, { fetch: logOf([opened(1)]) });

  expect(fromMain.spawned).toHaveLength(1);
  expect(fromTree.spawned).toHaveLength(1);
  same(fromMain.spawned[0]!.cwd, main);
  same(fromTree.spawned[0]!.cwd, main);
  expect(trees(main)).toBe(before.trees);
  expect(readdirSync(parent).sort()).toEqual(before.parent);
  expect(readdirSync(main).sort()).toEqual(before.main);
  expect(readdirSync(other).sort()).toEqual([".git", "README.md"]);
  expect(git(main, "status", "--porcelain")).toBe(before.status);
  expect(existsSync(worktrees)).toBe(false);
}, SLOW);

test("PAP-52: leader, worker and judge open in the directory of worktrees, under their name", async () => {
  const { main, worktrees } = repo();
  for (const [role, name] of [["leader", "leader"], ["worker", "worker-1"], ["judge", "judge"]] as const) {
    const { spawned } = await run([role], main);
    expect(spawned).toHaveLength(1);
    same(spawned[0]!.cwd, join(worktrees, name));
    // a worktree of the repository, with the credentials of the project
    same(git(spawned[0]!.cwd, "rev-parse", "--show-toplevel"), join(worktrees, name));
    expect(readdirSync(spawned[0]!.cwd).sort()).toEqual([".env", ".git", "README.md"]);
  }
  expect(readdirSync(worktrees).sort()).toEqual(["judge", "leader", "worker-1"]);
}, SLOW);

test("PAP-52: with SQUAD_WORKTREES the sessions open under that directory, and not next to the repository", async () => {
  const { main, worktrees } = repo();
  const elsewhere = join(temp(), "all the trees");
  for (const [role, name] of [["leader", "leader"], ["worker", "worker-1"], ["judge", "judge"]] as const) {
    const { spawned } = await run([role], main, { env: { ...ENV, SQUAD_WORKTREES: elsewhere } });
    expect(spawned).toHaveLength(1);
    same(spawned[0]!.cwd, join(elsewhere, name));
  }
  expect(readdirSync(elsewhere).sort()).toEqual(["judge", "leader", "worker-1"]);
  expect(existsSync(worktrees)).toBe(false);
}, SLOW);

test("PAP-58: from inside a worktree the sessions open in the directory of worktrees of the main checkout", async () => {
  const { main, worktrees } = repo();
  const first = await run(["worker"], main);
  const inside = first.spawned[0]!.cwd;
  same(inside, join(worktrees, "worker-1"));

  for (const [role, name] of [["leader", "leader"], ["worker", "worker-1"], ["judge", "judge"]] as const) {
    const { spawned } = await run([role], inside);
    expect(spawned).toHaveLength(1);
    same(spawned[0]!.cwd, join(worktrees, name));
  }
  expect(readdirSync(worktrees).sort()).toEqual(["judge", "leader", "worker-1"]);
  expect(existsSync(`${inside}.squad`)).toBe(false);
}, SLOW);

test("PAP-53: with a feature open in the log the worktree of the worker is born at the tip of its branch, and a second start changes nothing", async () => {
  const { main, worktrees } = repo();
  const log = [joined(1, "mother"), opened(2)];
  const first = await run(["worker"], main, { fetch: logOf(log) });
  const dir = first.spawned[0]!.cwd;
  same(dir, join(worktrees, "worker-1"));
  const born = head(dir);
  expect(born).toBe(tip(main));
  expect(born).not.toBe(head(main));
  expect(branch(dir)).toBe("");

  // PAP-55: the feature goes ahead and the main checkout gains another .env file
  git(main, "switch", "-q", FEATURE);
  commit(main, "more.txt", "more\n");
  git(main, "switch", "-q", "main");
  writeFileSync(join(main, ".env.new"), "NEW=1\n");
  const before = trees(main);

  const second = await run(["worker"], main, { fetch: logOf(log) });
  expect(second.spawned).toHaveLength(1);
  same(second.spawned[0]!.cwd, dir);
  expect(second.code).toBe(7);
  expect(head(dir)).toBe(born);
  expect(tip(main)).not.toBe(born);
  expect(readdirSync(dir).sort()).toEqual([".env", ".git", "README.md", "importer.txt"]);
  expect(trees(main)).toBe(before);
}, SLOW);

test("PAP-54: with a feature open in the log the worktree of the leader is born on its branch", async () => {
  const { main } = repo();
  const { spawned } = await run(["leader"], main, { fetch: logOf([opened(1)]) });
  expect(branch(spawned[0]!.cwd)).toBe(FEATURE);
  expect(head(spawned[0]!.cwd)).toBe(tip(main));
}, SLOW);

test("PAP-53: a feature the log closed is not open: the worktree is born at the HEAD of the main checkout", async () => {
  const { main } = repo();
  const { spawned } = await run(["judge"], main, { fetch: logOf([opened(1), closed(2)]) });
  expect(head(spawned[0]!.cwd)).toBe(head(main));
  expect(head(spawned[0]!.cwd)).not.toBe(tip(main));
  expect(branch(spawned[0]!.cwd)).toBe("");
}, SLOW);

// The log of a squad on its second feature: the first was opened and closed, and the second
// is open on a branch of its own, born from main with one commit
const SECOND = "feat/exporter";
const SECOND_LOG = [joined(1, "mother"), opened(2), closed(3), opened(4, SECOND, 2)];

// The repository with the branch of the second feature, and the three commits there are to
// be born at, none equal to another
function secondFeature() {
  const { main } = repo();
  git(main, "switch", "-q", "-c", SECOND);
  commit(main, "exporter.txt", "the exporter\n");
  git(main, "switch", "-q", "main");
  const second = git(main, "rev-parse", `refs/heads/${SECOND}`);
  expect(new Set([head(main), tip(main), second]).size).toBe(3);
  return { main, second };
}

test("PAP-53: with a feature closed and a second one open, the worktree of the worker is born detached at the tip of the branch of the second", async () => {
  const { main, second } = secondFeature();
  const { spawned } = await run(["worker"], main, { fetch: logOf(SECOND_LOG) });
  expect(head(spawned[0]!.cwd)).toBe(second);
  expect(branch(spawned[0]!.cwd)).toBe("");
}, SLOW);

test("PAP-54: with a feature closed and a second one open, the worktree of the leader is born on the branch of the second", async () => {
  const { main, second } = secondFeature();
  const { spawned } = await run(["leader"], main, { fetch: logOf(SECOND_LOG) });
  expect(branch(spawned[0]!.cwd)).toBe(SECOND);
  expect(head(spawned[0]!.cwd)).toBe(second);
}, SLOW);

test("PAP-53: when the read of the log fails no feature is open: the worktree is born at the HEAD of the main checkout", async () => {
  const { main } = repo();
  const { spawned } = await run(["leader"], main, { fetch: async () => Promise.reject(new Error("connection refused")) });
  expect(head(spawned[0]!.cwd)).toBe(head(main));
  expect(branch(spawned[0]!.cwd)).toBe("");
}, SLOW);

// ---- the roles file ----

const JUDGE_ONLY = { roles: [{ name: "judge", when_to_use: "To judge.", skills: ["only-this", "and-this"] }] };

test("PAP-35: with SQUAD_ROLES the roles file read is the one of that path", async () => {
  const { main } = repo();
  const { spawned } = await run(["judge"], main, { env: { ...ENV, SQUAD_ROLES: rolesFile(JUDGE_ONLY) } });
  expect(spawned.map((s) => s.args.at(-2))).toEqual(["Squad name: judge. Squad role: judge.\nBase skills of your role: only-this, and-this."]);
}, SLOW);

// ---- what fails before the session opens ----

// One repository for every start that must write nothing in it
let quiet: ReturnType<typeof repo> | undefined;

// A start that fails: one line that starts with `squad: `, no process, exit code 1, and no
// directory of worktrees afterwards
async function refused(argv: string[], over: Partial<Deps> = {}, cwd?: string): Promise<string> {
  quiet ??= repo();
  const before = trees(quiet.main);
  const { code, spawned, lines } = await run(argv, cwd ?? quiet.main, over);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toStartWith("squad: ");
  expect(lines[0]).not.toContain("\n");
  expect(spawned).toEqual([]);
  expect(code).toBe(1);
  expect(existsSync(quiet.worktrees)).toBe(false);
  expect(trees(quiet.main)).toBe(before);
  return lines[0]!;
}

test("PAP-42: start without a role fails before anything is written", async () => {
  expect(await refused([])).toContain("role");
}, SLOW);

test("PAP-42: start with a role that is not one of the four fails before anything is written", async () => {
  expect(await refused(["boss"])).toContain("boss");
}, SLOW);

test("PAP-42: start with a positional argument too many fails before anything is written", async () => {
  expect(await refused(["worker", "worker-1", "worker-2"])).toContain("worker-2");
}, SLOW);

test("PAP-42: start with an unknown option fails before anything is written", async () => {
  expect(await refused(["worker", "--fast"])).toContain("--fast");
}, SLOW);

test("PAP-42: start with the name of another role fails before anything is written", async () => {
  expect(await refused(["worker", "leader"])).toContain("leader");
}, SLOW);

test("PAP-42: start worker without a name with the three workers online fails before anything is written", async () => {
  const log = [joined(1, "worker-1"), joined(2, "worker-2"), joined(3, "worker-3"), opened(4)];
  expect(await refused(["worker"], { fetch: logOf(log) })).toContain("worker-3");
}, SLOW);

test("PAP-42: start outside a git repository fails before anything is written", async () => {
  const outside = temp();
  const elsewhere = join(temp(), "trees");
  const line = await refused(["leader"], { env: { ...ENV, SQUAD_WORKTREES: elsewhere } }, outside);
  expect(line).toContain(outside);
  expect(existsSync(elsewhere)).toBe(false);
  expect(existsSync(`${outside}.squad`)).toBe(false);
  expect(readdirSync(outside)).toEqual([]);
}, SLOW);

test("PAP-42: start with a roles file that is not valid fails before anything is written, with its path", async () => {
  const path = rolesFile({ roles: [{ name: "leader", when_to_use: "", skills: [] }] });
  expect(await refused(["leader"], { env: { ...ENV, SQUAD_ROLES: path }, fetch: logOf([opened(1)]) })).toContain(path);
}, SLOW);

test("PAP-42: start with a roles file that is not there fails before anything is written, with its path", async () => {
  const path = join(temp(), "missing.json");
  expect(await refused(["worker"], { env: { ...ENV, SQUAD_ROLES: path } })).toContain(path);
}, SLOW);

test("PAP-36: start with a valid roles file that does not have the role fails before anything is written", async () => {
  const path = rolesFile(JUDGE_ONLY);
  const line = await refused(["leader"], { env: { ...ENV, SQUAD_ROLES: path }, fetch: logOf([opened(1)]) });
  expect(line).toContain("leader");
}, SLOW);

test("PAP-57: a worktree git cannot add fails with the message of git in the line", async () => {
  const { main, worktrees } = repo();
  // the branch of the feature is checked out in the main checkout (PAP-48)
  git(main, "switch", "-q", FEATURE);
  const { code, spawned, lines } = await run(["leader"], main, { fetch: logOf([opened(1)]) });
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatch(/^squad: fatal: .*feat\/importer.* is already /);
  expect(spawned).toEqual([]);
  expect(code).toBe(1);
  expect(existsSync(join(worktrees, "leader"))).toBe(false);
}, SLOW);

test("PAP-50: a session command that cannot be run fails with its name in the line", async () => {
  const { main } = repo();
  const spawn: Deps["spawn"] = async () => Promise.reject(new Error("ENOENT: no such file or directory"));
  for (const [env, command] of [[ENV, "claude"], [{ ...ENV, SQUAD_CLAUDE: "my-claude" }, "my-claude"]] as const) {
    const { code, lines } = await run(["mother"], main, { env, spawn });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toStartWith("squad: ");
    expect(lines[0]).toContain(command);
    expect(code).toBe(1);
  }
}, SLOW);
