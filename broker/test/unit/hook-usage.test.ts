import { afterAll, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
  // only a *.jsonl of subagents itself is a transcript: not a name that only has .jsonl inside
  // it, in another case, without the dot, with fewer or more letters, nor a *.jsonl of a
  // directory inside subagents
  for (const name of [
    "agent-c.txt",
    "agent-d.jsonl.bak",
    "agent-e.JSONL",
    "agent-fjsonl",
    "jsonl",
    "agent-g.json",
    "agent-h.jsonld",
    "nested/agent-n.jsonl",
  ]) {
    file(["sub", "s1", "subagents", ...name.split("/")], [line("claude-haiku", name, [9000, 9000, 9000, 9000])]);
  }
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

// Windows has no file mode and root reads it anyway: only there the case does not run
test.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
  "PAP-18: a file of subagents without permission to read, or a subagents directory without it, counts nothing, and the others count",
  () => {
    const path = file(["denied", "s1.jsonl"], [line("claude-opus", "m1", [10, 20, 30, 40])]);
    chmodSync(file(["denied", "s1", "subagents", "agent-y.jsonl"], [line("claude-haiku", "y1", [9000, 9000, 9000, 9000])]), 0o000);
    file(["denied", "s1", "subagents", "agent-b.jsonl"], [line("claude-haiku", "b1", [5, 6, 7, 8])]);
    expect(sessionUsage(path)).toEqual({
      "claude-opus": { input: 10, output: 20, cache_write: 30, cache_read: 40 },
      "claude-haiku": { input: 5, output: 6, cache_write: 7, cache_read: 8 },
    });

    const closed = file(["closed", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
    file(["closed", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
    chmodSync(join(dir, "closed", "s1", "subagents"), 0o000);
    try {
      expect(sessionUsage(closed)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
    } finally {
      // so that the directory of the test can be removed
      chmodSync(join(dir, "closed", "s1", "subagents"), 0o755);
    }
  }
);

test("PAP-18: a subagents that is a file has no file of subagents: only the main transcript counts", () => {
  const path = file(["plain", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["plain", "s1", "subagents"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
});

// Windows creates a symbolic link only with the developer mode or as an administrator
const canLink = (() => {
  const probe = mkdtempSync(join(tmpdir(), "squad-link-"));
  try {
    writeFileSync(join(probe, "target"), "");
    symlinkSync(join(probe, "target"), join(probe, "link"), "file");
    return true;
  } catch {
    return false;
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
})();

test.skipIf(!canLink)("PAP-18: a file of subagents or a subagents directory that is a link to itself counts nothing, and the others count", () => {
  const path = file(["loop", "s1.jsonl"], [line("claude-opus", "m1", [10, 20, 30, 40])]);
  const looped = join(dir, "loop", "s1", "subagents", "agent-l.jsonl");
  file(["loop", "s1", "subagents", "agent-b.jsonl"], [line("claude-haiku", "b1", [5, 6, 7, 8])]);
  symlinkSync(looped, looped, "file");
  expect(sessionUsage(path)).toEqual({
    "claude-opus": { input: 10, output: 20, cache_write: 30, cache_read: 40 },
    "claude-haiku": { input: 5, output: 6, cache_write: 7, cache_read: 8 },
  });

  const closed = file(["looped", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  mkdirSync(join(dir, "looped", "s1"));
  symlinkSync(join(dir, "looped", "s1", "subagents"), join(dir, "looped", "s1", "subagents"), "dir");
  expect(sessionUsage(closed)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
});

// Any error of the disk, not only the ones a test can make: EIO stands for them
const EIO = () => {
  throw Object.assign(new Error("EIO: i/o error"), { code: "EIO" });
};

test("PAP-18: a subagents directory whose reading fails with any error has no file of subagents: only the main transcript counts", () => {
  const path = file(["eio", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["eio", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  const list = spyOn(fs, "readdirSync").mockImplementation(EIO);
  try {
    expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
  } finally {
    list.mockRestore();
  }
});

test("PAP-18: a file of subagents whose reading fails with any error counts nothing, and the others count", () => {
  const path = file(["eio-file", "s1.jsonl"], [line("claude-opus", "m1", [10, 20, 30, 40])]);
  const failing = file(["eio-file", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "a1", [9000, 9000, 9000, 9000])]);
  file(["eio-file", "s1", "subagents", "agent-b.jsonl"], [line("claude-haiku", "b1", [5, 6, 7, 8])]);
  const { readFileSync } = fs;
  const read = spyOn(fs, "readFileSync").mockImplementation(((path: string, options: "utf8") =>
    path === failing ? EIO() : readFileSync(path, options)) as typeof readFileSync);
  try {
    expect(sessionUsage(path)).toEqual({
      "claude-opus": { input: 10, output: 20, cache_write: 30, cache_read: 40 },
      "claude-haiku": { input: 5, output: 6, cache_write: 7, cache_read: 8 },
    });
  } finally {
    read.mockRestore();
  }
});

test("PAP-18: a *.jsonl of subagents with other dots in its name counts", () => {
  const path = file(["dots", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  for (const name of ["agent.2.jsonl", "agent-i.json.jsonl", "agent-j.jsonl.jsonl"]) {
    file(["dots", "s1", "subagents", name], [line("claude-opus", name, [100, 100, 100, 100])]);
  }
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 301, output: 301, cache_write: 301, cache_read: 301 } });
});

// [the transcript, the directory of its subagents]: only the whole .jsonl at the end of the
// name leaves it. The subagents of s1, when it is not that directory, do not count.
for (const [i, [transcript, subagents]] of ([
  ["s1.jsonl", "s1"],
  ["logs.jsonl.d/s1.jsonl", "logs.jsonl.d/s1"],
  ["s1.v2.jsonl", "s1.v2"],
  ["s1.jsonl.jsonl", "s1.jsonl"],
] as const).entries()) {
  test(`PAP-18: the subagents of ${transcript} are in ${subagents}/subagents`, () => {
    const path = file(["kept", String(i), ...transcript.split("/")], [line("claude-opus", "m1", [1, 1, 1, 1])]);
    file(["kept", String(i), ...subagents.split("/"), "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
    if (subagents !== "s1") file(["kept", String(i), "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "s1", [9000, 9000, 9000, 9000])]);
    expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 101, output: 101, cache_write: 101, cache_read: 101 } });
  });
}

// A transcript without the extension .jsonl, in its case and with its dot, keeps its whole
// name: its subagents are in <name>/subagents, which a file cannot have
for (const [i, transcript] of ["s1.txt", "s1.JSONL", "s1.jsonl.bak", "s1.json", "s1.jsonld", "s1-jsonl"].entries()) {
  test(`PAP-18: ${transcript} has no extension .jsonl: the subagents of s1/subagents do not count`, () => {
    const path = file(["whole", String(i), transcript], [line("claude-opus", "m1", [1, 1, 1, 1])]);
    file(["whole", String(i), "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
    expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1, output: 1, cache_write: 1, cache_read: 1 } });
  });
}

// The forms of the end of a name: a separator, jsonl in a case, and what comes after it. A
// form is *.jsonl only when the name ends in .jsonl, with its dot and in lowercase. Windows
// takes no line break in a name and drops a space at its end: there those ends are left out.
const AFTER = ["", "d", ".bak", ".jsonl", ...(process.platform === "win32" ? [] : [" ", "\n", "\nx"])];
const FORMS = ["", ".", "-"].flatMap((separator) =>
  ["jsonl", "JSONL", "json"].flatMap((jsonl) =>
    AFTER.map((after) => [separator + jsonl + after, after === ".jsonl" || (after === "" && separator + jsonl === ".jsonl")] as const)
  )
);

// Every name a wrong reading of the extension could take for the stem: the name without a
// piece that has json in it, in any case
function misread(name: string): Set<string> {
  const names = new Set<string>();
  for (let i = 0; i < name.length; i++) {
    for (let j = i + 4; j <= name.length; j++) {
      if (/json/i.test(name.slice(i, j))) names.add(name.slice(0, i) + name.slice(j));
    }
  }
  return names;
}

for (const [i, [form, jsonl]] of FORMS.entries()) {
  const transcript = `s1${form}`;
  // the name without the .jsonl of its end, or none: a file cannot have a subagents directory
  const stem = jsonl ? transcript.slice(0, -".jsonl".length) : null;
  test(`PAP-18: the subagents of ${JSON.stringify(transcript)} are ${stem === null ? "none" : `in ${JSON.stringify(stem)}/subagents`}`, () => {
    const path = file(["formed", String(i), transcript], [line("claude-opus", "m1", [1, 1, 1, 1])]);
    for (const other of misread(transcript)) {
      if (other !== stem) file(["formed", String(i), other, "subagents", "agent-a.jsonl"], [line("claude-haiku", "a9", [9000, 9000, 9000, 9000])]);
    }
    if (stem !== null) file(["formed", String(i), stem, "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
    const n = stem === null ? 1 : 101;
    expect(sessionUsage(path)).toEqual({ "claude-opus": { input: n, output: n, cache_write: n, cache_read: n } });
  });
}

test("PAP-18: every name of subagents that ends in .jsonl counts, the one of the main transcript too, and no other", () => {
  const path = file(["formed", "names", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  for (const [form, jsonl] of [...FORMS.map(([form, jsonl]) => [`agent${form}`, jsonl] as const), ["s1.jsonl", true] as const]) {
    const counts = jsonl ? [100, 100, 100, 100] : [9000, 9000, 9000, 9000];
    file(["formed", "names", "s1", "subagents", form], [line(jsonl ? "claude-opus" : "claude-haiku", form, counts)]);
  }
  // agent.jsonl, the nine that end in .jsonl after another form, and s1.jsonl: 11 of 100
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 1101, output: 1101, cache_write: 1101, cache_read: 1101 } });
});

test("PAP-18: two files of subagents with the same text both count, a line without message.id being a message of its own", () => {
  const path = file(["twins", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  for (const name of ["agent-a.jsonl", "agent-b.jsonl"]) {
    file(["twins", "s1", "subagents", name], [line("claude-opus", undefined, [100, 100, 100, 100])]);
  }
  expect(sessionUsage(path)).toEqual({ "claude-opus": { input: 201, output: 201, cache_write: 201, cache_read: 201 } });
});

test("PAP-18: a main transcript that counts nothing, or is empty, still has the files of its subagents", () => {
  const user = file(["silent", "s1.jsonl"], [USER]);
  file(["silent", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  expect(sessionUsage(user)).toEqual({ "claude-opus": { input: 100, output: 100, cache_write: 100, cache_read: 100 } });

  const empty = join(dir, "empty", "s1.jsonl");
  file(["empty", "s1", "subagents", "agent-a.jsonl"], [line("claude-opus", "a1", [100, 100, 100, 100])]);
  writeFileSync(empty, "");
  expect(sessionUsage(empty)).toEqual({ "claude-opus": { input: 100, output: 100, cache_write: 100, cache_read: 100 } });
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

test.skipIf(!canLink)("PAP-19: a main transcript that is a link to itself gives no model, even with files of subagents", () => {
  const path = join(dir, "self", "s1.jsonl");
  file(["self", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "a1", [5, 6, 7, 8])]);
  symlinkSync(path, path, "file");
  expect(sessionUsage(path)).toEqual({});
});

// Windows has no file mode and root reads it anyway: only there the case does not run
test.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
  "PAP-19: a main transcript without permission to read gives no model, even with files of subagents",
  () => {
    const path = file(["locked", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
    file(["locked", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "a1", [5, 6, 7, 8])]);
    chmodSync(path, 0o000);
    expect(sessionUsage(path)).toEqual({});
  }
);

test("PAP-19: a main transcript whose reading fails with any error gives no model, even with files of subagents", () => {
  const path = file(["eio-main", "s1.jsonl"], [line("claude-opus", "m1", [1, 1, 1, 1])]);
  file(["eio-main", "s1", "subagents", "agent-a.jsonl"], [line("claude-haiku", "a1", [5, 6, 7, 8])]);
  const { readFileSync } = fs;
  const read = spyOn(fs, "readFileSync").mockImplementation(((file: string, options: "utf8") =>
    file === path ? EIO() : readFileSync(file, options)) as typeof readFileSync);
  try {
    expect(sessionUsage(path)).toEqual({});
  } finally {
    read.mockRestore();
  }
});

test("PAP-21: a transcript path that is not a text, or is an empty one, gives no model", () => {
  expect(sessionUsage(undefined)).toEqual({});
  expect(sessionUsage(12)).toEqual({});
  expect(sessionUsage("")).toEqual({});
});
