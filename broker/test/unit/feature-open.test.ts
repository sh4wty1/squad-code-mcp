import { expect, test } from "bun:test";
import { createFeature, projectOf } from "../../feature.ts";
import { JUDGE, LEADER, MOTHER, NOW, setup, WORKER_1 } from "./helpers.ts";

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

const FIELDS = {
  title: "the importer",
  workflow: "tlc",
  branch: "feat/importer",
  base_branch: "develop",
  spec_ref: ".specs/features/importer/spec.md",
  spec_commit: "9f8e7d6",
};

// Where the session of each peer runs: what `find` answers besides the name and the role
const AT = { cwd: "/work/wt", git_root: "/work/importer/.git" };
const mother = { ...MOTHER, ...AT };

function start() {
  const b = setup();
  return { ...b, feature: createFeature(b.log) };
}

function featureRows(b: ReturnType<typeof setup>) {
  return b.db.query("SELECT * FROM features ORDER BY id").all() as Record<string, unknown>[];
}

// A refused /open-feature (FEAT-10): the trace with feature_opened as the attempted kind,
// and `features` as it was
function refusedOpen(b: ReturnType<typeof start>, peer: typeof mother, body: Record<string, unknown>, error: string) {
  const rows = featureRows(b);
  b.refusedWith(() => b.feature.open(peer, body), peer.name, "feature_opened", error);
  expect(featureRows(b)).toEqual(rows);
}

test("FEAT-01: the mother opens a feature and gets its id and the seq of the feature_opened", () => {
  const b = start();
  b.log.record({ kind: "turn_started", from: "mother", role_from: "mother" });
  b.clock.now = NOW + 200;
  expect(b.feature.open(mother, FIELDS)).toEqual({ ok: true, feature_id: 1, seq: 2 });
  expect(featureRows(b)).toEqual([
    { id: 1, project: "importer", ...FIELDS, opened_seq: 2, closed_seq: null, outcome: null },
  ]);
  expect(b.events()[1]).toEqual({
    seq: 2,
    ts: NOW + 200,
    kind: "feature_opened",
    feature_id: 1,
    from_name: "mother",
    role_from: "mother",
    to_name: "*",
    summary: "",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: FIELDS,
  });
});

test("FEAT-11: the project of the row comes from the git_root of the mother, and from her cwd outside a repository", () => {
  const b = start();
  b.feature.open({ ...MOTHER, cwd: "C:\\Users\\Dev\\proj", git_root: null }, FIELDS);
  expect(featureRows(b).map((f) => f.project)).toEqual(["proj"]);
});

for (const peer of [LEADER, WORKER_1, JUDGE]) {
  test(`FEAT-02: a ${peer.role} that opens a feature is refused with edge_not_allowed`, () => {
    const b = start();
    refusedOpen(b, { ...peer, ...AT }, FIELDS, "edge_not_allowed");
    expect(featureRows(b)).toEqual([]);
  });
}

test("FEAT-03: with a feature open, a second one is refused with feature_already_open and the open one stays as it was", () => {
  const b = start();
  const opened = b.feature.open(mother, FIELDS) as { feature_id: number };
  refusedOpen(b, mother, { ...FIELDS, title: "the second" }, "feature_already_open");
  // the refused belongs to the feature that is open
  expect(b.events().at(-1)!.feature_id).toBe(opened.feature_id);
  expect(featureRows(b).map((f) => [f.id, f.title])).toEqual([[opened.feature_id, "the importer"]]);
});

for (const field of Object.keys(FIELDS)) {
  const { [field as keyof typeof FIELDS]: _, ...without } = FIELDS;
  const cases: [string, Record<string, unknown>][] = [
    ["absent", without],
    ["null", { ...FIELDS, [field]: null }],
    ["not a text", { ...FIELDS, [field]: 7 }],
    ["an empty text", { ...FIELDS, [field]: "" }],
  ];
  for (const [what, body] of cases) {
    test(`FEAT-04: ${field} ${what} is refused with missing_field`, () => {
      const b = start();
      refusedOpen(b, mother, body, "missing_field");
      expect(featureRows(b)).toEqual([]);
    });
  }
}

test("FEAT-05: a workflow that is not tlc or matt-pocock is refused with invalid_field", () => {
  const b = start();
  refusedOpen(b, mother, { ...FIELDS, workflow: "scrum" }, "invalid_field");
  expect(featureRows(b)).toEqual([]);
});

for (const workflow of ["tlc", "matt-pocock"]) {
  test(`FEAT-05: the workflow ${workflow} is accepted`, () => {
    const b = start();
    expect(b.feature.open(mother, { ...FIELDS, workflow })).toEqual({ ok: true, feature_id: 1, seq: 1 });
    expect(featureRows(b).map((f) => f.workflow)).toEqual([workflow]);
  });
}

test("FEAT-06: a leader that opens with a feature already open is refused by the role, not by the state", () => {
  const b = start();
  b.feature.open(mother, FIELDS);
  refusedOpen(b, { ...LEADER, ...AT }, FIELDS, "edge_not_allowed");
});

test("FEAT-06: the mother with a feature open and a field missing is refused by the state, not by the field", () => {
  const b = start();
  b.feature.open(mother, FIELDS);
  refusedOpen(b, mother, { ...FIELDS, title: "" }, "feature_already_open");
});

test("FEAT-06: a field missing and an invalid workflow are refused with missing_field", () => {
  const b = start();
  refusedOpen(b, mother, { ...FIELDS, workflow: "scrum", spec_commit: null }, "missing_field");
});

test("FEAT-01: feature_id, project, from and opened_seq of the body are ignored", () => {
  const b = start();
  const body = { ...FIELDS, feature_id: 40, project: "other", from: "leader", opened_seq: 99, note: "ignored" };
  expect(b.feature.open(mother, body)).toEqual({ ok: true, feature_id: 1, seq: 1 });
  expect(featureRows(b)).toEqual([
    { id: 1, project: "importer", ...FIELDS, opened_seq: 1, closed_seq: null, outcome: null },
  ]);
  const [opened] = b.events();
  expect(opened!.data).toEqual(FIELDS);
  expect([opened!.feature_id, opened!.from_name]).toEqual([1, "mother"]);
});

test("FEAT-13: once a feature is open, the task of the mother to the leader and the plan are recorded in it", () => {
  const b = start();
  const kickoff = { kind: "task", to: "leader", summary: "go" };
  const tickets = [{ ticket_ref: "A", title: "the parser" }];
  b.refusedWith(() => b.send(MOTHER, kickoff), "mother", "task", "no_open_feature");
  b.refusedWith(() => b.plan(LEADER, { tickets }), "leader", "plan", "no_open_feature");

  const { feature_id } = b.feature.open(mother, FIELDS) as { feature_id: number };
  expect(b.send(MOTHER, kickoff)).toEqual({ ok: true, seq: 4 });
  expect(b.plan(LEADER, { tickets })).toEqual({ ok: true, seq: 5 });
  expect(b.events().slice(3).map((e) => [e.kind, e.feature_id])).toEqual([
    ["task", feature_id],
    ["plan", feature_id],
  ]);
});

test("FEAT-13: once a feature is open, the state answers its seven fields", () => {
  const b = start();
  const { feature_id } = b.feature.open(mother, FIELDS) as { feature_id: number };
  expect(b.state(MOTHER).feature).toEqual({ id: feature_id, ...FIELDS });
});
