import { expect, test } from "bun:test";
import { report } from "../../tui/probe.ts";

test("TUI-59: the probe reports widths and exits zero when every glyph takes one cell", () => {
  expect(report({ "⚠": 1, "⟳": 1 })).toEqual({
    lines: ["⚠  U+26A0  1", "⟳  U+27F3  1", "every glyph takes one cell"], exitCode: 0,
  });
});

test("TUI-59: the probe reports a double width and exits two", () => {
  expect(report({ "⚠": 2, "⟳": 1 })).toEqual({
    lines: ["⚠  U+26A0  2", "⟳  U+27F3  1", "not one cell: ⚠"], exitCode: 2,
  });
});
