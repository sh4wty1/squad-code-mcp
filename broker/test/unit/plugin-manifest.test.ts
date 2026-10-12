import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BROKER = join(import.meta.dir, "..", "..");
const PLUGIN = join(BROKER, "..", "plugin");

function json(...path: string[]): any {
  return JSON.parse(readFileSync(join(PLUGIN, ...path), "utf8"));
}

test("PAP-01: the plugin has its manifest in plugin/.claude-plugin, with the name squad", () => {
  expect(json(".claude-plugin", "plugin.json").name).toBe("squad");
});

test("PAP-01: no file of the plugin is inside broker/", () => {
  for (const name of [".claude-plugin", "hooks", "skills", "roles.json"]) {
    expect([name, existsSync(join(BROKER, name))]).toEqual([name, false]);
  }
});

test("PAP-02: the plugin declares one MCP server, squad, which is server.ts of broker/ run by bun", () => {
  expect(json(".mcp.json").mcpServers).toEqual({
    squad: { command: "bun", args: ["${CLAUDE_PLUGIN_ROOT}/../broker/server.ts"] },
  });
});

test("PAP-03: the plugin declares exactly the hooks UserPromptSubmit and Stop", () => {
  expect(Object.keys(json("hooks", "hooks.json").hooks).sort()).toEqual(["Stop", "UserPromptSubmit"]);
});

test("PAP-03: UserPromptSubmit has a single command hook, turn-started.ts with a timeout of 10", () => {
  expect(json("hooks", "hooks.json").hooks.UserPromptSubmit).toEqual([
    { hooks: [{ type: "command", command: 'bun "${CLAUDE_PLUGIN_ROOT}/hooks/turn-started.ts"', timeout: 10 }] },
  ]);
});

test("PAP-03: Stop has a single command hook, stop.ts with a timeout of 20", () => {
  expect(json("hooks", "hooks.json").hooks.Stop).toEqual([
    { hooks: [{ type: "command", command: 'bun "${CLAUDE_PLUGIN_ROOT}/hooks/stop.ts"', timeout: 20 }] },
  ]);
});
