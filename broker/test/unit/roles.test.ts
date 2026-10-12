import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readRoles, type RoleEntry } from "../../roles.ts";
import { rolesPath } from "../../shared/config.ts";

const dir = mkdtempSync(join(tmpdir(), "squad-roles-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let files = 0;

// A roles file with this text, in a path of its own
function written(text: string): string {
  const path = join(dir, `roles-${++files}.json`);
  writeFileSync(path, text);
  return path;
}

function file(content: unknown): string {
  return written(JSON.stringify(content));
}

// A valid entry. Each refusal below differs from it in one thing.
const WORKER: RoleEntry = {
  name: "worker",
  when_to_use: "To implement one ticket.",
  skills: ["coding-guidelines"],
  workflows: { tlc: ["tlc-implement"], "matt-pocock": ["implement"] },
};

// The entry with one field changed, or without it when the value is undefined
function worker(changed: Record<string, unknown>): Record<string, unknown> {
  const entry: Record<string, unknown> = { ...WORKER, ...changed };
  for (const key of Object.keys(entry)) if (entry[key] === undefined) delete entry[key];
  return entry;
}

test("PAP-33: a valid file with the four roles is returned as read", () => {
  const roles: RoleEntry[] = [
    { name: "mother", when_to_use: "To talk to the dev.", skills: ["the-fool", "create-adr"], workflows: { tlc: ["tlc-discover"] } },
    { name: "leader", when_to_use: "To plan the tickets.", skills: [], workflows: { "matt-pocock": ["to-tickets"] } },
    WORKER,
    { name: "judge", when_to_use: "To judge a result.", skills: ["ponytail-review"], workflows: {} },
  ];
  expect(readRoles(file({ roles }))).toEqual(roles);
});

test("PAP-33: a valid file with one role and no workflows is returned as read", () => {
  const roles: RoleEntry[] = [{ name: "judge", when_to_use: "To judge a result.", skills: ["spec-driven-eval", "ponytail-review"] }];
  expect(readRoles(file({ roles }))).toEqual(roles);
});

test("PAP-33: a file that does not exist is refused, with its path in the message", () => {
  const path = join(dir, "missing.json");
  expect(() => readRoles(path)).toThrow(path);
});

test("PAP-33: a text that is not JSON is refused, with the path in the message", () => {
  const path = written("{ roles: [");
  expect(() => readRoles(path)).toThrow(path);
});

for (const [what, root] of [
  ["a list", [WORKER]],
  ["a text", "roles"],
  ["null", null],
] as const) {
  test(`PAP-33: a root that is ${what} is refused, with the path in the message`, () => {
    const path = file(root);
    expect(() => readRoles(path)).toThrow(path);
  });
}

for (const [what, roles] of [
  ["absent", undefined],
  ["an object", { worker: WORKER }],
  ["a text", "worker"],
] as const) {
  test(`PAP-33: roles that is ${what} is refused, with the path in the message`, () => {
    const path = file({ roles });
    expect(() => readRoles(path)).toThrow(path);
  });
}

// One refusal per entry: the valid entry with one field out of the format
for (const [what, changed] of [
  ["a name outside the four roles", { name: "worker-1" }],
  ["a name that is absent", { name: undefined }],
  ["when_to_use that is absent", { when_to_use: undefined }],
  ["when_to_use that is empty", { when_to_use: "" }],
  ["when_to_use that is not a text", { when_to_use: 3 }],
  ["skills that is absent", { skills: undefined }],
  ["skills that is not a list", { skills: "coding-guidelines" }],
  ["skills with an empty text", { skills: ["coding-guidelines", ""] }],
  ["skills with an item that is not a text", { skills: ["coding-guidelines", 3] }],
  ["workflows with a key other than tlc and matt-pocock", { workflows: { tlc: ["tlc-implement"], other: ["implement"] } }],
  ["workflows that is a list", { workflows: [["tlc-implement"]] }],
  ["a workflow that is not a list", { workflows: { tlc: "tlc-implement" } }],
  ["a workflow with an empty text", { workflows: { "matt-pocock": ["implement", ""] } }],
  ["a workflow with an item that is not a text", { workflows: { tlc: [3] } }],
  // "if present": the key is there and its value is not an object
  ["workflows that is null", { workflows: null }],
] as const) {
  test(`PAP-33: ${what} is refused, with the path in the message`, () => {
    const path = file({ roles: [worker(changed)] });
    expect(() => readRoles(path)).toThrow(path);
  });
}

test("PAP-33: an item of roles that is not an object is refused, with the path in the message", () => {
  const path = file({ roles: [WORKER.name] });
  expect(() => readRoles(path)).toThrow(path);
});

test("PAP-33: a name that repeats is refused, with the path in the message", () => {
  const path = file({ roles: [WORKER, { name: "judge", when_to_use: "To judge.", skills: [] }, WORKER] });
  expect(() => readRoles(path)).toThrow(path);
});

// The file of the plugin, without the text of when_to_use, which readRoles already checks
function pluginRoles() {
  return readRoles(rolesPath({})).map(({ name, skills, workflows }) => ({ name, skills, workflows }));
}

test("PAP-34: the roles file of the plugin is accepted by the reader and has the four roles", () => {
  expect(readRoles(rolesPath({})).map((entry) => entry.name)).toEqual(["mother", "leader", "worker", "judge"]);
});

test("PAP-34: the mother has its base skills and those of each workflow", () => {
  expect(pluginRoles()[0]).toEqual({
    name: "mother",
    skills: ["the-fool", "create-adr"],
    workflows: { tlc: ["tlc-discover"], "matt-pocock": ["grill-with-docs", "to-spec"] },
  });
});

test("PAP-34: the leader has its base skills and those of each workflow", () => {
  expect(pluginRoles()[1]).toEqual({
    name: "leader",
    skills: ["help-me", "the-jury"],
    workflows: { tlc: ["tlc-plan"], "matt-pocock": ["to-tickets"] },
  });
});

test("PAP-34: the worker has its base skills and those of each workflow", () => {
  expect(pluginRoles()[2]).toEqual({
    name: "worker",
    skills: ["coding-guidelines", "ponytail", "write-commit", "codenavi"],
    workflows: { tlc: ["tlc-implement"], "matt-pocock": ["implement"] },
  });
});

test("PAP-34: the judge has its base skills and no workflows", () => {
  const judge = readRoles(rolesPath({}))[3]!;
  expect({ name: judge.name, skills: judge.skills }).toEqual({
    name: "judge",
    skills: ["spec-driven-eval", "ponytail-review", "security-best-practices", "break-ui", "web-quality-audit", "review-animations"],
  });
  expect(Object.hasOwn(judge, "workflows")).toBe(false);
});
