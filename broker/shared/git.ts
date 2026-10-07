// The git common directory of a working directory, or null outside a repository.
// Every worktree of a repository has the same one, while the top of the working
// tree is different in each. It is what puts the workers in the mother's project.
export async function getGitRoot(cwd: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], {
      cwd,
      stdout: "pipe",
      stderr: "ignore",
    });
    const text = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code === 0) {
      return text.trim();
    }
  } catch {
    // not a git repo
  }
  return null;
}
