// The package that `bun add -g github:sh4wty1/squad-code-mcp` installs: the package.json of the
// root, and the .gitattributes that keeps the tests out of the tarball of GitHub.

import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

// What `git archive`, and so the tarball of GitHub, leaves out of a path
function exportIgnored(path: string): boolean {
  const out = Bun.spawnSync(["git", "check-attr", "export-ignore", "--", path], { cwd: ROOT });
  return new TextDecoder().decode(out.stdout).trim().endsWith(": set");
}

test("DIST-05: the dependencies of the root are the ones of broker/", () => {
  expect(read("package.json").dependencies).toEqual(read("broker/package.json").dependencies);
});

test("DIST-01, DIST-05: the bin squad of the root is broker/cli.ts, and it exists", () => {
  const bin = read("package.json").bin.squad;
  expect(join(ROOT, bin)).toBe(join(ROOT, "broker", "cli.ts"));
  expect(existsSync(join(ROOT, bin))).toBe(true);
});

test("DIST-04: the tests of broker/ are left out of the tarball", () => {
  // On a directory, git archive leaves out the whole tree under it
  expect(exportIgnored("broker/test")).toBe(true);
});

test("DIST-02: broker/ and plugin/ go in the tarball, side by side", () => {
  for (const path of ["broker", "plugin", "broker/cli.ts", "broker/server.ts", "broker/shared/config.ts", "broker/tui/prices.json", "plugin/.mcp.json", "plugin/hooks/stop.ts", "plugin/roles.json"]) {
    expect(exportIgnored(path)).toBe(false);
  }
});
