// The package that `bun add -g github:sh4wty1/squad-code-mcp` installs: the package.json of the
// root, and the .gitattributes that keeps the tests out of the tarball of GitHub.

import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

const run = (cmd: string[], stdin?: Uint8Array) => Bun.spawnSync(cmd, { cwd: ROOT, stdin }).stdout;
const lines = (out: Uint8Array) => new TextDecoder().decode(out).split("\n").map((l) => l.trim()).filter((l) => l);

test("DIST-05: the dependencies of the root are the ones of broker/", () => {
  expect(read("package.json").dependencies).toEqual(read("broker/package.json").dependencies);
});

test("DIST-01, DIST-05: the bin squad of the root is broker/cli.ts, and it exists", () => {
  const bin = read("package.json").bin.squad;
  expect(join(ROOT, bin)).toBe(join(ROOT, "broker", "cli.ts"));
  expect(existsSync(join(ROOT, bin))).toBe(true);
});

// The tarball of GitHub is the git archive of the commit, with the .gitattributes of the tree
test("DIST-02, DIST-04: the tarball has every file of the commit but the tests of broker/", () => {
  const tarball = lines(run(["tar", "-t"], run(["git", "archive", "--worktree-attributes", "HEAD"]))).filter((p) => !p.endsWith("/"));
  const tracked = lines(run(["git", "ls-tree", "-r", "--name-only", "HEAD"]));
  expect(tracked.some((p) => p.startsWith("broker/test/"))).toBe(true);
  expect(tracked.some((p) => p.startsWith("plugin/hooks/"))).toBe(true);
  expect(tarball.sort()).toEqual(tracked.filter((p) => !p.startsWith("broker/test/")).sort());
});
