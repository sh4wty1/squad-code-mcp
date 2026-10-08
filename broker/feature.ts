/**
 * squad broker /open-feature and /close-feature
 *
 * The mother opens the feature the squad works on and closes it. One feature is
 * open at a time.
 */

import { win32 } from "node:path";

// Where the session of a peer runs
export type Where = { cwd: string; git_root: string | null };

// The name of the project of a feature. win32 takes both separators: the git_root comes
// with "/" and the cwd with "\" on Windows.
export function projectOf(git_root: string | null, cwd: string): string {
  if (git_root === null) return win32.basename(cwd);
  const last = win32.basename(git_root);
  return last === ".git" ? win32.basename(win32.dirname(git_root)) : last;
}
