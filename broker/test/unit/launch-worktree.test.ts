import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mainCheckout, worktree } from "../../launch.ts";

// git for real, in temporary repositories. On Windows each call takes a while.
const SLOW = 60_000;

const FEATURE = "feat/importer";

function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", "-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
  return result.stdout.toString().trim();
}

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

function commit(main: string, file: string, text: string) {
  writeFileSync(join(main, file), text);
  git(main, "add", "--", file);
  git(main, "commit", "-q", "-m", `add ${file}`);
}

// A repository in a path with a space, on the branch main with one commit, and nothing else
// in its parent: the default directory of worktrees lands there
function repo() {
  // the real path: the temporary directory may come in its short form on Windows
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "squad-launch-")));
  dirs.push(parent);
  const main = join(parent, "the repo");
  git(parent, "init", "-q", "-b", "main", "the repo");
  commit(main, "README.md", "the project\n");
  return { parent, main, worktrees: join(parent, "the repo.squad") };
}

// The branch of the feature one commit ahead of the main checkout, which goes back to main
function feature(main: string, file = "importer.txt", text = "the importer\n") {
  git(main, "switch", "-q", "-c", FEATURE);
  commit(main, file, text);
  git(main, "switch", "-q", "main");
}

const head = (dir: string) => git(dir, "rev-parse", "HEAD");
const tip = (main: string) => git(main, "rev-parse", `refs/heads/${FEATURE}`);
// Empty when HEAD is detached
const branch = (dir: string) => git(dir, "branch", "--show-current");
const same = (a: string, b: string) => expect(realpathSync(a)).toBe(realpathSync(b));

// ---- mainCheckout ----

test("PAP-58: the main checkout is the same from itself, from a subdirectory of it and from inside a worktree", () => {
  const { parent, main } = repo();
  mkdirSync(join(main, "src", "deep"), { recursive: true });
  const tree = join(parent, "a worktree");
  git(main, "worktree", "add", "-q", "--detach", tree);
  mkdirSync(join(tree, "src"));

  same(mainCheckout(main), main);
  same(mainCheckout(join(main, "src", "deep")), main);
  same(mainCheckout(tree), main);
  same(mainCheckout(join(tree, "src")), main);
}, SLOW);

test("PAP-42: outside a git repository there is no main checkout, and the failure says where", () => {
  const outside = realpathSync(mkdtempSync(join(tmpdir(), "squad-nogit-")));
  dirs.push(outside);
  expect(() => mainCheckout(outside)).toThrow(outside);
}, SLOW);

// ---- worktree: where it is born ----

for (const role of ["worker", "judge"] as const) {
  const name = role === "worker" ? "worker-1" : "judge";

  test(`PAP-53: the worktree of a ${role} is born detached at the tip of the branch of the open feature`, () => {
    const { main, worktrees } = repo();
    feature(main);
    expect(tip(main)).not.toBe(head(main));

    const dir = worktree(main, name, role, FEATURE, {});
    same(dir, join(worktrees, name));
    expect(head(dir)).toBe(tip(main));
    expect(branch(dir)).toBe("");
  }, SLOW);

  test(`PAP-53: without an open feature the worktree of a ${role} is born detached at the HEAD of the main checkout`, () => {
    const { main, worktrees } = repo();
    feature(main);

    const dir = worktree(main, name, role, null, {});
    same(dir, join(worktrees, name));
    expect(head(dir)).toBe(head(main));
    expect(head(dir)).not.toBe(tip(main));
    expect(branch(dir)).toBe("");
  }, SLOW);

  test(`PAP-53: with a feature whose branch is not in the repository the worktree of a ${role} is born detached at the HEAD of the main checkout`, () => {
    const { main, worktrees } = repo();
    feature(main);

    const dir = worktree(main, name, role, "feat/missing", {});
    same(dir, join(worktrees, name));
    expect(head(dir)).toBe(head(main));
    expect(head(dir)).not.toBe(tip(main));
    expect(branch(dir)).toBe("");
  }, SLOW);
}

test("PAP-54: the worktree of the leader is born on the branch of the open feature", () => {
  const { main, worktrees } = repo();
  feature(main);

  const dir = worktree(main, "leader", "leader", FEATURE, {});
  same(dir, join(worktrees, "leader"));
  expect(branch(dir)).toBe(FEATURE);
  expect(head(dir)).toBe(tip(main));
}, SLOW);

test("PAP-54: without an open feature the worktree of the leader is born detached at the HEAD of the main checkout", () => {
  const { main } = repo();
  feature(main);

  const dir = worktree(main, "leader", "leader", null, {});
  expect(branch(dir)).toBe("");
  expect(head(dir)).toBe(head(main));
  expect(head(dir)).not.toBe(tip(main));
}, SLOW);

test("PAP-54: with a feature whose branch is not in the repository the worktree of the leader is born detached at the HEAD of the main checkout", () => {
  const { main } = repo();
  feature(main);

  const dir = worktree(main, "leader", "leader", "feat/missing", {});
  expect(branch(dir)).toBe("");
  expect(head(dir)).toBe(head(main));
  // and the branch was not created by the way
  expect(git(main, "branch", "--list", "feat/missing")).toBe("");
}, SLOW);

test("PAP-48: with the branch of the feature checked out in the main checkout the worktree of the leader fails with the message of git, and nothing is copied", () => {
  const { main, worktrees } = repo();
  feature(main);
  git(main, "switch", "-q", FEATURE);
  writeFileSync(join(main, ".env"), "KEY=1\n");

  expect(() => worktree(main, "leader", "leader", FEATURE, {})).toThrow(/fatal: .*feat\/importer.* is already /);
  expect(existsSync(join(worktrees, "leader"))).toBe(false);
  expect(git(main, "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
}, SLOW);

test("PAP-57: a git worktree add that fails gives the message of git in one line and copies nothing", () => {
  const { main, worktrees } = repo();
  writeFileSync(join(main, ".env"), "KEY=1\n");
  // the path of the worktree is taken by a file
  mkdirSync(worktrees);
  writeFileSync(join(worktrees, "worker-1"), "not a directory");

  let message = "";
  try {
    worktree(main, "worker-1", "worker", null, {});
  } catch (e) {
    message = (e as Error).message;
  }
  expect(message).toMatch(/^fatal: .*worker-1.* already exists/);
  expect(message).not.toContain("\n");
  expect(readdirSync(worktrees)).toEqual(["worker-1"]);
  expect(readFileSync(join(worktrees, "worker-1"), "utf8")).toBe("not a directory");
  expect(git(main, "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
}, SLOW);

test("PAP-57: a message of git with more than one line comes in one line, with each line of it", () => {
  const { main, worktrees } = repo();
  writeFileSync(join(main, ".env"), "KEY=1\n");
  // git has the worktree of worker-1 registered, and its directory is gone
  const dir = join(worktrees, "worker-1");
  git(main, "worktree", "add", "-q", "--detach", dir);
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  // what git says of adding it again, as git says it
  const raw = Bun.spawnSync(["git", "worktree", "add", "--quiet", "--detach", dir, "HEAD"], { cwd: main }).stderr.toString().trim();
  expect(raw).toStartWith("fatal: ");
  expect(raw).toContain("\n");

  let message = "";
  try {
    worktree(main, "worker-1", "worker", null, {});
  } catch (e) {
    message = (e as Error).message;
  }
  expect(message).toStartWith("fatal: ");
  expect(message).not.toMatch(/[\r\n]/);
  for (const line of raw.split(/\r?\n/)) expect(message).toContain(line.trim());
  expect(existsSync(dir)).toBe(false);
}, SLOW);

// ---- worktree: the .env* files ----

test("PAP-56: the regular files of the root that start with .env and git does not track are copied with their content", () => {
  const { main } = repo();
  writeFileSync(join(main, ".gitignore"), ".env\n");
  git(main, "add", "--", ".gitignore");
  git(main, "commit", "-q", "-m", "ignore .env");
  // one ignored, one merely untracked
  writeFileSync(join(main, ".env"), "KEY=1\nOTHER=two words\n");
  writeFileSync(join(main, ".env.local"), "LOCAL=1\n");
  // what does not count: a directory, a name that does not start with .env, a file below the root
  mkdirSync(join(main, ".env.d"));
  writeFileSync(join(main, ".env.d", "inner"), "INNER=1\n");
  writeFileSync(join(main, "env.txt"), "NOT=1\n");
  mkdirSync(join(main, "sub"));
  writeFileSync(join(main, "sub", ".env"), "SUB=1\n");

  const dir = worktree(main, "worker-1", "worker", null, {});
  expect(readdirSync(dir).sort()).toEqual([".env", ".env.local", ".git", ".gitignore", "README.md"]);
  expect(readFileSync(join(dir, ".env"), "utf8")).toBe("KEY=1\nOTHER=two words\n");
  expect(readFileSync(join(dir, ".env.local"), "utf8")).toBe("LOCAL=1\n");
}, SLOW);

test("PAP-56: a tracked .env.example is not copied over the one that came with the checkout", () => {
  const { main } = repo();
  commit(main, ".env.example", "KEY=committed\n");
  // changed in the main checkout, without a commit
  writeFileSync(join(main, ".env.example"), "KEY=changed\n");

  const dir = worktree(main, "judge", "judge", null, {});
  expect(readFileSync(join(dir, ".env.example"), "utf8").replace(/\r\n/g, "\n")).toBe("KEY=committed\n");
}, SLOW);

test("PAP-56: a file git tracks in the main checkout is not copied to a worktree whose commit does not have it", () => {
  const { main } = repo();
  feature(main);
  // tracked on main only: the tip of the feature does not have it
  commit(main, ".env.example", "KEY=committed\n");
  writeFileSync(join(main, ".env"), "KEY=1\n");

  const dir = worktree(main, "worker-2", "worker", FEATURE, {});
  expect(readdirSync(dir).sort()).toEqual([".env", ".git", "README.md", "importer.txt"]);
}, SLOW);

test("PAP-56: a .env.shared that came with the checkout of the feature branch is not overwritten by the untracked one of the main checkout", () => {
  const { main } = repo();
  feature(main, ".env.shared", "SHARED=of the feature\n");
  // on main the file is not tracked
  writeFileSync(join(main, ".env.shared"), "SHARED=of the main checkout\n");
  writeFileSync(join(main, ".env"), "KEY=1\n");

  const dir = worktree(main, "worker-1", "worker", FEATURE, {});
  expect(readFileSync(join(dir, ".env.shared"), "utf8").replace(/\r\n/g, "\n")).toBe("SHARED=of the feature\n");
  expect(readFileSync(join(dir, ".env"), "utf8")).toBe("KEY=1\n");
}, SLOW);

// ---- worktree: relaunch ----

test("PAP-55: a worktree that already exists is used as it is: its HEAD stays with the feature branch ahead, and a new .env file is not copied", () => {
  const { main, worktrees } = repo();
  feature(main);
  writeFileSync(join(main, ".env"), "KEY=1\n");
  const dir = worktree(main, "worker-1", "worker", FEATURE, {});
  const born = head(dir);
  expect(born).toBe(tip(main));
  // work without a commit of the session that died
  writeFileSync(join(dir, "wip.txt"), "half done\n");
  writeFileSync(join(dir, ".env"), "KEY=edited in the worktree\n");

  // the feature goes ahead and the main checkout gains another .env file
  git(main, "switch", "-q", FEATURE);
  commit(main, "more.txt", "more\n");
  git(main, "switch", "-q", "main");
  writeFileSync(join(main, ".env.new"), "NEW=1\n");
  expect(tip(main)).not.toBe(born);

  const again = worktree(main, "worker-1", "worker", FEATURE, {});
  same(again, join(worktrees, "worker-1"));
  expect(head(again)).toBe(born);
  expect(existsSync(join(again, ".env.new"))).toBe(false);
  expect(readFileSync(join(again, ".env"), "utf8")).toBe("KEY=edited in the worktree\n");
  expect(readFileSync(join(again, "wip.txt"), "utf8")).toBe("half done\n");
}, SLOW);

test("PAP-55: a directory that is already there is used as it is, with no worktree added and no file copied", () => {
  const { main, worktrees } = repo();
  feature(main);
  writeFileSync(join(main, ".env"), "KEY=1\n");
  mkdirSync(join(worktrees, "leader"), { recursive: true });

  const dir = worktree(main, "leader", "leader", FEATURE, {});
  same(dir, join(worktrees, "leader"));
  expect(statSync(dir).isDirectory()).toBe(true);
  expect(readdirSync(dir)).toEqual([]);
  expect(git(main, "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
}, SLOW);
