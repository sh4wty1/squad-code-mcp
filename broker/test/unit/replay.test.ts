import { expect, test } from "bun:test";
import { createFeature } from "../../feature.ts";
import { features } from "../../shared/derive.ts";
import { MOTHER, setup } from "./helpers.ts";

const FIELDS = {
  title: "the importer",
  workflow: "tlc",
  branch: "feat/importer",
  base_branch: "develop",
  spec_ref: ".specs/features/importer/spec.md",
  spec_commit: "9f8e7d6",
};

const mother = { ...MOTHER, cwd: "/work/wt", git_root: "/work/importer/.git" };

test("FEAT-27: the features derived from the whole log are the rows of the table without project", () => {
  const b = setup();
  const feature = createFeature(b.log);
  const table = () =>
    (b.db.query("SELECT * FROM features ORDER BY id").all() as Record<string, unknown>[]).map(({ project, ...row }) => row);
  const replayed = () => features(b.log.after(0)) as object[];
  expect(replayed()).toEqual(table());

  expect(feature.open(mother, FIELDS).ok).toBe(true);
  expect(replayed()).toEqual(table());
  expect(feature.open(mother, { ...FIELDS, title: "the second" }).ok).toBe(false);
  expect(replayed()).toEqual(table());
  expect(feature.close(MOTHER, { outcome: "abandoned" }).ok).toBe(true);
  expect(replayed()).toEqual(table());
  expect(feature.close(MOTHER, { outcome: "delivered" }).ok).toBe(false);
  expect(feature.open(mother, { ...FIELDS, title: "the next one", workflow: "matt-pocock" }).ok).toBe(true);

  expect(replayed()).toEqual(table());
  expect(table()).toEqual([
    { id: 1, ...FIELDS, opened_seq: 1, closed_seq: 3, outcome: "abandoned" },
    { id: 2, ...FIELDS, title: "the next one", workflow: "matt-pocock", opened_seq: 5, closed_seq: null, outcome: null },
  ]);
});
