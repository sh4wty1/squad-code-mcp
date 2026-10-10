import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GLYPHS } from "../../tui/glyphs.ts";

const FRAMES = join(import.meta.dir, "..", "frames");

test("TUI-59: every character above U+024F in a frame is a glyph the probe measures", () => {
  const frames = readdirSync(FRAMES).filter((file) => file.endsWith(".txt"));
  expect(frames.length).toBe(47);
  const drawn = new Set<string>();
  for (const file of frames) {
    for (const char of readFileSync(join(FRAMES, file), "utf8")) {
      if (char.codePointAt(0)! > 0x24f) drawn.add(char);
    }
  }
  expect([...drawn].filter((char) => !GLYPHS.includes(char))).toEqual([]);
});
