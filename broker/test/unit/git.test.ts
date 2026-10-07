import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { getGitRoot } from "../../shared/git.ts";

function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync(["git", "-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
}

test("PEER-24: a worktree has the same absolute git_root as the main checkout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "squad-git-"));
  try {
    const main = join(dir, "main");
    const worktree = join(dir, "worker 1");
    git(dir, "init", "-q", "main");
    git(main, "commit", "-q", "--allow-empty", "-m", "first");
    git(main, "worktree", "add", "-q", "--detach", worktree);

    const fromMain = await getGitRoot(main);
    const fromWorktree = await getGitRoot(worktree);
    expect(fromMain).not.toBeNull();
    expect(isAbsolute(fromMain!)).toBe(true);
    expect(fromMain!.endsWith("/main/.git")).toBe(true);
    expect(fromWorktree).toBe(fromMain);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PEER-25: outside a git repository git_root is null", async () => {
  const dir = mkdtempSync(join(tmpdir(), "squad-nogit-"));
  try {
    expect(await getGitRoot(dir)).toBeNull();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
