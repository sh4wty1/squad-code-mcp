import { expect, test } from "bun:test";
import { projectOf } from "../../feature.ts";

test("FEAT-11: the project is the directory that holds the git directory when it is called .git", () => {
  expect(projectOf("/repo/.git", "/repo/wt")).toBe("repo");
  expect(projectOf("C:/Fassi/squad-code-mcp/.git", "C:\\Fassi\\wt-1")).toBe("squad-code-mcp");
});

test("FEAT-11: the project is the last segment of a git_root that does not end in .git", () => {
  expect(projectOf("/srv/repo.git", "/srv/wt")).toBe("repo.git");
});

test("FEAT-11: without a git_root the project is the last segment of the cwd", () => {
  expect(projectOf(null, "C:\\Users\\Dev\\proj")).toBe("proj");
  expect(projectOf(null, "/home/dev/proj")).toBe("proj");
});

test("FEAT-11: without a git_root and at the root of the disk the project is empty", () => {
  expect(projectOf(null, "C:\\")).toBe("");
});
