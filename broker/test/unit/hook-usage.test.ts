import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sessionUsage, usageOf } from "../../../plugin/hooks/usage.ts";

const dir = mkdtempSync(join(tmpdir(), "squad-usage-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// An `assistant` line of a transcript, as Claude Code 2.1.296 writes it. `counts` are
// input_tokens, output_tokens, cache_creation_input_tokens and cache_read_input_tokens.
// `message` and `entry` replace fields of the message and of the line.
function line(
  model: unknown,
  id: unknown,
  counts: unknown[],
  message: Record<string, unknown> = {},
  entry: Record<string, unknown> = {}
): string {
  const [input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens] = counts;
  return JSON.stringify({
    parentUuid: "p",
    isSidechain: false,
    type: "assistant",
    uuid: "u",
    timestamp: "2026-10-11T12:00:00.000Z",
    message: {
      id,
      type: "message",
      role: "assistant",
      model,
      content: [{ type: "text", text: "done" }],
      usage: {
        input_tokens,
        output_tokens,
        cache_creation_input_tokens,
        cache_read_input_tokens,
        // not one of the four counts
        cache_creation: { ephemeral_5m_input_tokens: 9000, ephemeral_1h_input_tokens: 9000 },
        service_tier: "standard",
      },
      ...message,
    },
    ...entry,
  });
}

// A file of the test directory with the lines, and its path
function file(path: string[], lines: string[]): string {
  const full = join(dir, ...path);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, lines.join("\n") + "\n");
  return full;
}

const USER = JSON.stringify({ type: "user", uuid: "u0", message: { role: "user", content: "go" } });

test("PAP-14: each model has the sum of input, output, cache_write and cache_read of its lines", () => {
  const transcript = [
    USER,
    line("claude-opus", "m1", [10, 20, 30, 40]),
    line("claude-sonnet", "m2", [1, 2, 3, 4]),
    line("claude-opus", "m3", [100, 200, 300, 400]),
    line("claude-sonnet", "m4", [5, 6, 7, 8]),
  ].join("\n");
  expect(usageOf([transcript])).toEqual({
    "claude-opus": { input: 110, output: 220, cache_write: 330, cache_read: 440 },
    "claude-sonnet": { input: 6, output: 8, cache_write: 10, cache_read: 12 },
  });
});

test("PAP-14: the usage of a session is read from the file of its transcript", () => {
  const path = file(["only", "s1.jsonl"], [
    USER,
    line("claude-opus", "m1", [6, 300, 12000, 70000]),
    line("claude-opus", "m2", [0, 23, 198, 9889]),
  ]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 6, output: 323, cache_write: 12198, cache_read: 79889 } });
});

test("PAP-14: no transcript and a transcript without a counted line give no model", () => {
  expect(usageOf([])).toEqual({});
  expect(usageOf(["", USER])).toEqual({});
});

test("PAP-15: of the lines with the same message.id only the last of the file counts", () => {
  const transcript = [
    line("claude-opus", "m1", [1, 1, 1, 1]),
    // not the greatest: the last
    line("claude-opus", "m1", [50, 50, 50, 50]),
    line("claude-opus", "m2", [100, 200, 300, 400]),
    line("claude-opus", "m1", [7, 8, 9, 10]),
  ].join("\n");
  expect(usageOf([transcript])).toEqual({ "claude-opus": { input: 107, output: 208, cache_write: 309, cache_read: 410 } });
});

test("PAP-15: a counted line without message.id counts alone, even next to an equal one", () => {
  const alone = line("claude-opus", undefined, [3, 4, 5, 6]);
  expect(usageOf([[alone, alone].join("\n")])).toEqual({ "claude-opus": { input: 6, output: 8, cache_write: 10, cache_read: 12 } });
});

test("PAP-15: a message.id that is not a non-empty text is no id: its line counts alone", () => {
  for (const id of ["", 7, null]) {
    const transcript = [line("claude-opus", id, [3, 4, 5, 6]), line("claude-opus", id, [3, 4, 5, 6])].join("\n");
    expect([id, usageOf([transcript])]).toEqual([id, { "claude-opus": { input: 6, output: 8, cache_write: 10, cache_read: 12 } }]);
  }
});

// [what the field has, what the case is called]
for (const [bad, called] of [
  [undefined, "absent"],
  [-5, "negative"],
  [1.5, "fractional"],
  ["12", "a text"],
] as const) {
  test(`PAP-16: a count that is ${called} counts 0, and the other three count`, () => {
    const good = line("claude-opus", "m0", [1000, 2000, 3000, 4000]);
    const one = (counts: unknown[]) => usageOf([[good, line("claude-opus", "m1", counts)].join("\n")])["claude-opus"];
    expect(one([bad, 2, 3, 4])).toEqual({ input: 1000, output: 2002, cache_write: 3003, cache_read: 4004 });
    expect(one([1, bad, 3, 4])).toEqual({ input: 1001, output: 2000, cache_write: 3003, cache_read: 4004 });
    expect(one([1, 2, bad, 4])).toEqual({ input: 1001, output: 2002, cache_write: 3000, cache_read: 4004 });
    expect(one([1, 2, 3, bad])).toEqual({ input: 1001, output: 2002, cache_write: 3003, cache_read: 4000 });
  });
}

// The lines before and after `ignored` count, and nothing of it does
function around(ignored: string) {
  return usageOf([[line("claude-opus", "m1", [1, 2, 3, 4]), ignored, line("claude-opus", "m2", [10, 20, 30, 40])].join("\n")]);
}

const NEIGHBOURS = { "claude-opus": { input: 11, output: 22, cache_write: 33, cache_read: 44 } };

test("PAP-17: a line that is not JSON is ignored and the lines around it count", () => {
  expect(around("not json at all")).toEqual(NEIGHBOURS);
  // a line cut in the middle, and an empty one
  expect(around(line("claude-haiku", "m9", [5, 5, 5, 5]).slice(0, 80))).toEqual(NEIGHBOURS);
  expect(around("")).toEqual(NEIGHBOURS);
});

test("PAP-17: a line that is JSON and not an object, or has no message, is ignored", () => {
  for (const ignored of ["7", "null", '"assistant"', "[]", JSON.stringify({ type: "assistant" }), JSON.stringify({ type: "assistant", message: "text" })]) {
    expect([ignored, around(ignored)]).toEqual([ignored, NEIGHBOURS]);
  }
});

test("PAP-17: a line whose type is not assistant is ignored", () => {
  expect(around(line("claude-haiku", "m9", [5, 5, 5, 5], {}, { type: "user" }))).toEqual(NEIGHBOURS);
  expect(around(line("claude-haiku", "m9", [5, 5, 5, 5], {}, { type: undefined }))).toEqual(NEIGHBOURS);
});

test("PAP-17: a line whose message.usage is not an object is ignored", () => {
  for (const usage of [undefined, null, "none", 12, [1, 2, 3, 4]]) {
    expect([usage, around(line("claude-haiku", "m9", [], { usage }))]).toEqual([usage, NEIGHBOURS]);
  }
});

test("PAP-17: a line whose message.model is empty or is not a text is ignored", () => {
  for (const model of ["", undefined, null, 4]) {
    expect([model, around(line(model, "m9", [5, 5, 5, 5]))]).toEqual([model, NEIGHBOURS]);
  }
});

test("PAP-17: a line of the model <synthetic> is ignored", () => {
  expect(around(line("<synthetic>", "m9", [5, 5, 5, 5]))).toEqual(NEIGHBOURS);
});

test("PAP-17: an ignored line with the message.id of a counted one does not replace it", () => {
  const transcript = [line("claude-opus", "m1", [1, 2, 3, 4]), line("<synthetic>", "m1", [0, 0, 0, 0])].join("\n");
  expect(usageOf([transcript])).toEqual({ "claude-opus": { input: 1, output: 2, cache_write: 3, cache_read: 4 } });
});

test("PAP-18: the lines of the files of subagents add to the ones of the main transcript", () => {
  const path = file(["sub", "s1.jsonl"], [USER, line("claude-opus", "m1", [10, 20, 30, 40])]);
  file(["sub", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "a1", [5, 6, 7, 8], {}, { isSidechain: true })]);
  file(["sub", "s1", "subagents", "agent-b.jsonl"], [
    line("claude-haiku", "b1", [100, 200, 300, 400], {}, { isSidechain: true }),
    line("claude-opus", "b2", [1, 1, 1, 1], {}, { isSidechain: true }),
  ]);
  // a *.jsonl whose name does not start with agent- counts too
  file(["sub", "s1", "subagents", "sidechain-7.jsonl"], [line("claude-opus", "s7", [100, 100, 100, 100], {}, { isSidechain: true })]);
  // only *.jsonl is a transcript: not a name that only has .jsonl inside it
  file(["sub", "s1", "subagents", "agent-c.txt"], [line("claude-haiku", "c1", [9000, 9000, 9000, 9000])]);
  file(["sub", "s1", "subagents", "agent-d.jsonl.bak"], [line("claude-haiku", "d1", [9000, 9000, 9000, 9000])]);
  // the case counts in .jsonl: agent-e.JSONL is not a *.jsonl
  file(["sub", "s1", "subagents", "agent-e.JSONL"], [line("claude-haiku", "e1", [9000, 9000, 9000, 9000])]);
  // the dot counts: agent-fjsonl ends in jsonl but is not a *.jsonl
  file(["sub", "s1", "subagents", "agent-fjsonl"], [line("claude-haiku", "f1", [9000, 9000, 9000, 9000])]);
  // every letter counts: agent-g.json is the start of .jsonl but is not a *.jsonl
  file(["sub", "s1", "subagents", "agent-g.json"], [line("claude-haiku", "g1", [9000, 9000, 9000, 9000])]);
  expect(sessionUsage(path)).toEqual({
    "claude-opus": { input: 111, output: 121, cache_write: 131, cache_read: 141 },
    "claude-haiku": { input: 105, output: 206, cache_write: 307, cache_read: 408 },
  });
});

test("PAP-18: a message.id repeated in the main transcript and in a subagent counts once, with the numbers of the file read last", () => {
  const path = file(["repeat", "s1.jsonl"], [line("claude-opus", "m1", [10, 20, 30, 40]), line("claude-opus", "m2", [500, 500, 500, 500])]);
  file(["repeat", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "m2", [2, 3, 4, 5])]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 12, output: 23, cache_write: 34, cache_read: 45 } });
});

test("PAP-18: the files of subagents are read in the order of their names, after the main transcript", () => {
  const path = file(["order", "s1.jsonl"], [line("claude-opus", "m1", [10, 20, 30, 40])]);
  // written b, c, a: the order is of the names, not of the creation
  file(["order", "s1", "subagents", "agent-b.jsonl"], [line("claude-haiku", "x", [70, 70, 70, 70])]);
  file(["order", "s1", "subagents", "agent-c.jsonl"], [line("claude-haiku", "x", [1, 2, 3, 4])]);
  file(["order", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "x", [900, 900, 900, 900])]);
  expect(sessionUsage(path)).toEqual({
    "claude-opus": { input: 10, output: 20, cache_write: 30, cache_read: 40 },
    "claude-haiku": { input: 1, output: 2, cache_write: 3, cache_read: 4 },
  });
});

test("PAP-18: across the transcripts given, the last line of a message.id is the one of the last transcript", () => {
  const first = line("claude-opus", "m1", [10, 20, 30, 40]);
  const second = line("claude-opus", "m1", [1, 2, 3, 4]);
  expect(usageOf([first, second])).toEqual({ "claude-opus": { input: 1, output: 2, cache_write: 3, cache_read: 4 } });
  expect(usageOf([second, first])).toEqual({ "claude-opus": { input: 10, output: 20, cache_write: 30, cache_read: 40 } });
});

test("PAP-18: a file of subagents that cannot be read counts nothing, and the others count", () => {
  const path = file(["unreadable", "s1.jsonl"], [line("claude-opus", "m1", [10, 20, 30, 40])]);
  mkdirSync(join(dir, "unreadable", "s1", "subagents", "agent-a.jsonl"), { recursive: true });
  file(["unreadable", "s1", "subagents", "agent-b.jsonl"], [line("claude-haiku", "b1", [5, 6, 7, 8])]);
  // a link without a target fails already when it is looked at, not only when it is read;
  // a junction needs no privilege on Windows, and the type is ignored elsewhere
  symlinkSync(join(dir, "missing"), join(dir, "unreadable", "s1", "subagents", "agent-z.jsonl"), "junction");
  expect(sessionUsage(path)).toEqual({
    "claude-opus": { input: 10, output: 20, cache_write: 30, cache_read: 40 },
    "claude-haiku": { input: 5, output: 6, cache_write: 7, cache_read: 8 },
  });
});

test("PAP-18: only .jsonl leaves the transcript path: the subagents of s1.txt are in s1.txt/subagents, not in s1/subagents", () => {
  const path = file(["extension", "s1.txt"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["extension", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
});

test("PAP-18: only the .jsonl at the end leaves the transcript path: a folder with .jsonl in its name keeps it", () => {
  const path = file(["folder", "logs.jsonl.d", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["folder", "logs.jsonl.d", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 101, output: 101, cache_write: 101, cache_read: 101 } });
});

test("PAP-18: the case counts in .jsonl: the subagents of s1.JSONL are in s1.JSONL/subagents, not in s1/subagents", () => {
  const path = file(["case", "s1.JSONL"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["case", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
});

test("PAP-18: only a .jsonl at the end leaves the transcript path: the subagents of s1.jsonl.bak are in s1.jsonl.bak/subagents, not in s1/subagents", () => {
  const path = file(["suffix", "s1.jsonl.bak"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["suffix", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
});

test("PAP-18: only the whole .jsonl leaves the transcript path: the subagents of s1.json are in s1.json/subagents, not in s1/subagents", () => {
  const path = file(["letters", "s1.json"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["letters", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
});

test("PAP-19: without the main transcript there is no model, even with files of subagents", () => {
  file(["absent", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "a1", [5, 6, 7, 8])]);
  expect(sessionUsage(join(dir, "absent", "s1.jsonl"))).toEqual({});
  expect(sessionUsage(join(dir, "nowhere", "s1.jsonl"))).toEqual({});
});

test("PAP-19: a main transcript that is a directory gives no model, even with files of subagents", () => {
  mkdirSync(join(dir, "folder", "s1.jsonl"), { recursive: true });
  file(["folder", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "a1", [5, 6, 7, 8])]);
  expect(sessionUsage(join(dir, "folder", "s1.jsonl"))).toEqual({});
});

test("PAP-21: a transcript path that is not a text, or is an empty one, gives no model", () => {
  expect(sessionUsage(undefined)).toEqual({});
  expect(sessionUsage(12)).toEqual({});
  expect(sessionUsage("")).toEqual({});
});
