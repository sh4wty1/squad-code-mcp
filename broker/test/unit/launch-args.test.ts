import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { allowed, parseStart, sessionArgs, sessionEnv, systemPrompt } from "../../launch.ts";
import type { RoleEntry } from "../../roles.ts";
import { toolsFor } from "../../tools.ts";

const ROLES = ["mother", "leader", "worker", "judge"] as const;
const PREFIX = "mcp__plugin_squad_squad__";

// The squad root is the directory that holds broker/ and plugin/
const PLUGIN = resolve(import.meta.dir, "..", "..", "..", "plugin");

// ---- parseStart ----

test("PAP-37: start takes a role alone", () => {
  expect(parseStart(["worker"])).toEqual({ role: "worker", skip: false });
});

test("PAP-37: start takes a role and a name", () => {
  expect(parseStart(["worker", "worker-2"])).toEqual({ role: "worker", name: "worker-2", skip: false });
});

test("PAP-37: start takes --skip-permissions after the role and after the name", () => {
  expect(parseStart(["worker", "--skip-permissions"])).toEqual({ role: "worker", skip: true });
  expect(parseStart(["worker", "worker-2", "--skip-permissions"])).toEqual({ role: "worker", name: "worker-2", skip: true });
});

test("PAP-37: start takes --skip-permissions before the role and between the role and the name", () => {
  expect(parseStart(["--skip-permissions", "worker"])).toEqual({ role: "worker", skip: true });
  expect(parseStart(["leader", "--skip-permissions", "leader"])).toEqual({ role: "leader", name: "leader", skip: true });
});

for (const [role, name] of [
  ["mother", "mother"],
  ["leader", "leader"],
  ["judge", "judge"],
  ["worker", "worker-1"],
  ["worker", "worker-2"],
  ["worker", "worker-3"],
] as const) {
  test(`PAP-42: ${name} is a name of the role ${role}`, () => {
    expect(parseStart([role, name])).toEqual({ role, name, skip: false });
  });
}

test("PAP-42: start without a role is an error", () => {
  expect(parseStart([])).toEqual({ error: expect.stringContaining("role") });
  expect(parseStart(["--skip-permissions"])).toEqual({ error: expect.stringContaining("role") });
});

test("PAP-42: a role that is not one of the four is an error", () => {
  expect(parseStart(["boss"])).toEqual({ error: expect.stringContaining("boss") });
  expect(parseStart(["worker-1"])).toEqual({ error: expect.stringContaining("worker-1") });
});

test("PAP-42: two positional arguments after the role are an error", () => {
  expect(parseStart(["worker", "worker-1", "worker-2"])).toEqual({ error: expect.stringContaining("worker-2") });
});

test("PAP-42: an option that is not --skip-permissions is an error", () => {
  expect(parseStart(["worker", "--fast"])).toEqual({ error: expect.stringContaining("--fast") });
  expect(parseStart(["--skip-permission", "worker"])).toEqual({ error: expect.stringContaining("--skip-permission") });
  expect(parseStart(["worker", "-s"])).toEqual({ error: expect.stringContaining("-s") });
});

for (const [role, name] of [
  ["worker", "leader"],
  ["mother", "worker-1"],
  ["worker", "worker-4"],
] as const) {
  test(`PAP-42: ${name} is not a name of the role ${role}: an error`, () => {
    expect(parseStart([role, name])).toEqual({ error: expect.stringContaining(name) });
  });
}

// ---- allowed ----

const BASH = {
  mother: [
    "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)", "Bash(git rev-parse:*)",
    "Bash(git switch:*)", "Bash(git add:*)", "Bash(git commit:*)",
  ],
  leader: [
    "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)", "Bash(git rev-parse:*)",
    "Bash(git switch:*)", "Bash(git add:*)", "Bash(git commit:*)",
    "Bash(git merge:*)",
  ],
  worker: [
    "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)", "Bash(git rev-parse:*)",
    "Bash(git switch:*)", "Bash(git add:*)", "Bash(git commit:*)",
  ],
  judge: [
    "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)", "Bash(git rev-parse:*)",
    "Bash(git switch:*)",
  ],
};

const POWERSHELL = {
  mother: [
    "PowerShell(git status:*)", "PowerShell(git diff:*)", "PowerShell(git log:*)", "PowerShell(git show:*)",
    "PowerShell(git rev-parse:*)", "PowerShell(git switch:*)", "PowerShell(git add:*)", "PowerShell(git commit:*)",
  ],
  leader: [
    "PowerShell(git status:*)", "PowerShell(git diff:*)", "PowerShell(git log:*)", "PowerShell(git show:*)",
    "PowerShell(git rev-parse:*)", "PowerShell(git switch:*)", "PowerShell(git add:*)", "PowerShell(git commit:*)",
    "PowerShell(git merge:*)",
  ],
  worker: [
    "PowerShell(git status:*)", "PowerShell(git diff:*)", "PowerShell(git log:*)", "PowerShell(git show:*)",
    "PowerShell(git rev-parse:*)", "PowerShell(git switch:*)", "PowerShell(git add:*)", "PowerShell(git commit:*)",
  ],
  judge: [
    "PowerShell(git status:*)", "PowerShell(git diff:*)", "PowerShell(git log:*)", "PowerShell(git show:*)",
    "PowerShell(git rev-parse:*)", "PowerShell(git switch:*)",
  ],
};

// The squad tools of a role, as the spec defines them: ready, then those of toolsFor
function squadTools(role: string): string[] {
  return ["ready", ...toolsFor(role).map((tool) => tool.name)].map((name) => PREFIX + name);
}

for (const role of ROLES) {
  test(`PAP-43: the allowed list of the ${role} starts with ready and follows the tools of the role, and has no other squad tool`, () => {
    for (const platform of ["linux", "win32"]) {
      const list = allowed(role, platform);
      expect(list[0]).toBe("mcp__plugin_squad_squad__ready");
      expect(list.slice(0, squadTools(role).length)).toEqual(squadTools(role));
      expect(list.filter((item) => item.includes("squad"))).toEqual(squadTools(role));
    }
  });

  test(`PAP-44: after the squad tools the ${role} has the Bash rules of its git commands, in order, and nothing else`, () => {
    expect(allowed(role, "linux").slice(squadTools(role).length)).toEqual(BASH[role]);
  });

  test(`PAP-45: on win32 the ${role} has the same rules again for PowerShell, after those of Bash`, () => {
    expect(allowed(role, "win32").slice(squadTools(role).length)).toEqual([...BASH[role], ...POWERSHELL[role]]);
  });

  test(`PAP-45: on linux and on darwin the ${role} has no PowerShell rule`, () => {
    expect(allowed(role, "linux").filter((item) => item.includes("PowerShell"))).toEqual([]);
    expect(allowed(role, "darwin").filter((item) => item.includes("PowerShell"))).toEqual([]);
    expect(allowed(role, "darwin")).toEqual(allowed(role, "linux"));
  });

  test(`PAP-44: the allowed list of the ${role} never has push, reset, checkout or rm`, () => {
    for (const platform of ["linux", "darwin", "win32"]) {
      expect(allowed(role, platform).filter((item) => /\b(push|reset|checkout|rm)\b/.test(item))).toEqual([]);
    }
  });
}

test("PAP-43: the whole allowed list of the worker, which has no tool of another role", () => {
  const list = allowed("worker", "linux");
  expect(list).toEqual([
    "mcp__plugin_squad_squad__ready",
    "mcp__plugin_squad_squad__list_peers",
    "mcp__plugin_squad_squad__state",
    "mcp__plugin_squad_squad__history",
    "mcp__plugin_squad_squad__blocked",
    "mcp__plugin_squad_squad__unblocked",
    "mcp__plugin_squad_squad__send_result",
    "mcp__plugin_squad_squad__ask",
    "mcp__plugin_squad_squad__answer",
    "mcp__plugin_squad_squad__escalate",
    "Bash(git status:*)",
    "Bash(git diff:*)",
    "Bash(git log:*)",
    "Bash(git show:*)",
    "Bash(git rev-parse:*)",
    "Bash(git switch:*)",
    "Bash(git add:*)",
    "Bash(git commit:*)",
  ]);
  for (const tool of ["send_verdict", "plan", "open_feature"]) {
    expect([tool, list.includes(PREFIX + tool)]).toEqual([tool, false]);
  }
});

test("GAT-35: the allowed list of the mother has the gate tool, and that of no other role has it", () => {
  for (const platform of ["linux", "win32"]) {
    expect(allowed("mother", platform)).toContain("mcp__plugin_squad_squad__gate");
    for (const role of ["leader", "worker", "judge"]) {
      expect([role, allowed(role, platform).includes("mcp__plugin_squad_squad__gate")]).toEqual([role, false]);
    }
  }
});

test("PAP-44: git merge is the last Bash rule of the leader and of no other role", () => {
  expect(allowed("leader", "linux").at(-1)).toBe("Bash(git merge:*)");
  for (const role of ["mother", "worker", "judge"]) {
    expect(allowed(role, "win32").filter((item) => item.includes("git merge"))).toEqual([]);
  }
});

// ---- systemPrompt ----

function entry(fields: Partial<RoleEntry> & { name: RoleEntry["name"] }): RoleEntry {
  return { when_to_use: "The text the launcher does not use.", skills: [], ...fields };
}

test("PAP-46: the system prompt of a role with the two workflows has the five lines", () => {
  const worker = entry({
    name: "worker",
    skills: ["coding-guidelines", "ponytail", "write-commit", "codenavi"],
    workflows: { tlc: ["tlc-implement"], "matt-pocock": ["implement", "tdd"] },
  });
  expect(systemPrompt("worker-2", worker)).toBe(
    "Squad name: worker-2. Squad role: worker.\n" +
      "Base skills of your role: coding-guidelines, ponytail, write-commit, codenavi.\n" +
      "With the tlc workflow, also: tlc-implement.\n" +
      "With the matt-pocock workflow, also: implement, tdd.\n" +
      "Use only the skills of the workflow of the open feature."
  );
});

test("PAP-46: the system prompt of the judge, which has no workflows, has two lines", () => {
  const judge = entry({ name: "judge", skills: ["spec-driven-eval", "ponytail-review"] });
  expect(systemPrompt("judge", judge)).toBe(
    "Squad name: judge. Squad role: judge.\nBase skills of your role: spec-driven-eval, ponytail-review."
  );
});

test("PAP-46: a role with the tlc workflow alone has its line and the last one", () => {
  const leader = entry({ name: "leader", skills: ["help-me"], workflows: { tlc: ["tlc-plan"] } });
  expect(systemPrompt("leader", leader)).toBe(
    "Squad name: leader. Squad role: leader.\n" +
      "Base skills of your role: help-me.\n" +
      "With the tlc workflow, also: tlc-plan.\n" +
      "Use only the skills of the workflow of the open feature."
  );
});

test("PAP-46: a role with the matt-pocock workflow alone has its line and the last one", () => {
  const leader = entry({ name: "leader", skills: ["help-me"], workflows: { "matt-pocock": ["to-tickets"] } });
  expect(systemPrompt("leader", leader)).toBe(
    "Squad name: leader. Squad role: leader.\n" +
      "Base skills of your role: help-me.\n" +
      "With the matt-pocock workflow, also: to-tickets.\n" +
      "Use only the skills of the workflow of the open feature."
  );
});

test("PAP-46: an empty list of base skills leaves its line out", () => {
  const mother = entry({ name: "mother", skills: [], workflows: { tlc: ["tlc-discover"] } });
  expect(systemPrompt("mother", mother)).toBe(
    "Squad name: mother. Squad role: mother.\n" +
      "With the tlc workflow, also: tlc-discover.\n" +
      "Use only the skills of the workflow of the open feature."
  );
});

test("PAP-46: an empty list of a workflow leaves its line out, and the last one goes with the two", () => {
  const one = entry({ name: "mother", skills: ["the-fool"], workflows: { tlc: [], "matt-pocock": ["to-spec"] } });
  expect(systemPrompt("mother", one)).toBe(
    "Squad name: mother. Squad role: mother.\n" +
      "Base skills of your role: the-fool.\n" +
      "With the matt-pocock workflow, also: to-spec.\n" +
      "Use only the skills of the workflow of the open feature."
  );
  const none = entry({ name: "mother", skills: ["the-fool"], workflows: { tlc: [], "matt-pocock": [] } });
  expect(systemPrompt("mother", none)).toBe("Squad name: mother. Squad role: mother.\nBase skills of your role: the-fool.");
});

// ---- sessionEnv ----

test("PAP-39: the session has the environment of the launcher without the CLAUDE variables of a session around it, with its name and role", () => {
  const env = {
    PATH: "/usr/bin",
    HOME: "/home/dev",
    SQUAD_PORT: "7955",
    SQUAD_NAME: "leader",
    SQUAD_ROLE: "leader",
    ANTHROPIC_API_KEY: "key",
    MY_CLAUDE: "kept",
    CLAUDECODE: "1",
    CLAUDE_CODE_ENTRYPOINT: "cli",
    CLAUDE_PLUGIN_ROOT: "/somewhere/plugin",
  };
  const before = { ...env };
  expect(sessionEnv(env, "worker-2", "worker")).toEqual({
    PATH: "/usr/bin",
    HOME: "/home/dev",
    SQUAD_PORT: "7955",
    SQUAD_NAME: "worker-2",
    SQUAD_ROLE: "worker",
    ANTHROPIC_API_KEY: "key",
    MY_CLAUDE: "kept",
  });
  expect(env).toEqual(before);
});

test("PAP-39: the three CLAUDE variables the dev sets for Claude Code stay, and every other one leaves", () => {
  const env = {
    PATH: "/usr/bin",
    CLAUDE_CONFIG_DIR: "/home/dev/.claude-work",
    CLAUDE_CODE_OAUTH_TOKEN: "token",
    CLAUDE_CODE_GIT_BASH_PATH: "C:\\Program Files\\Git\\bin\\bash.exe",
    CLAUDE: "1",
    CLAUDEX: "1",
    CLAUDE_CONFIG_DIR_OLD: "/home/dev/.claude",
    CLAUDE_CODE_OAUTH_SCOPES: "user:inference",
    CLAUDE_CODE_CHILD_SESSION: "1",
    // with the case counting, this starts with CLAUDE and is not one of the three: it leaves
    CLAUDE_config_dir: "/home/dev/.claude-other",
    // the comparison minds the case: these do not start with CLAUDE, and stay
    claude_home: "/home/dev/claude",
    Claude_Code_Entrypoint: "cli",
  };
  expect(sessionEnv(env, "mother", "mother")).toEqual({
    PATH: "/usr/bin",
    CLAUDE_CONFIG_DIR: "/home/dev/.claude-work",
    CLAUDE_CODE_OAUTH_TOKEN: "token",
    CLAUDE_CODE_GIT_BASH_PATH: "C:\\Program Files\\Git\\bin\\bash.exe",
    claude_home: "/home/dev/claude",
    Claude_Code_Entrypoint: "cli",
    SQUAD_NAME: "mother",
    SQUAD_ROLE: "mother",
  });
});

test("PAP-39: SQUAD_NAME and SQUAD_ROLE enter an environment that did not have them", () => {
  expect(sessionEnv({ PATH: "/usr/bin" }, "judge", "judge")).toEqual({
    PATH: "/usr/bin",
    SQUAD_NAME: "judge",
    SQUAD_ROLE: "judge",
  });
});

// ---- sessionArgs ----

const JUDGE = entry({ name: "judge", skills: ["spec-driven-eval", "ponytail-review"] });
const LEADER = entry({ name: "leader", skills: ["help-me", "the-jury"], workflows: { tlc: ["tlc-plan"], "matt-pocock": ["to-tickets"] } });

test("PAP-40: the arguments of a session without --skip-permissions, in order", () => {
  expect(sessionArgs("judge", JUDGE, "linux", false)).toEqual([
    "--plugin-dir",
    PLUGIN,
    "--dangerously-load-development-channels",
    "plugin:squad@inline",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    "mcp__plugin_squad_squad__ready",
    "mcp__plugin_squad_squad__list_peers",
    "mcp__plugin_squad_squad__state",
    "mcp__plugin_squad_squad__history",
    "mcp__plugin_squad_squad__blocked",
    "mcp__plugin_squad_squad__unblocked",
    "mcp__plugin_squad_squad__send_verdict",
    "mcp__plugin_squad_squad__ask",
    "Bash(git status:*)",
    "Bash(git diff:*)",
    "Bash(git log:*)",
    "Bash(git show:*)",
    "Bash(git rev-parse:*)",
    "Bash(git switch:*)",
    "--append-system-prompt",
    "Squad name: judge. Squad role: judge.\nBase skills of your role: spec-driven-eval, ponytail-review.",
    "/squad:judge",
  ]);
});

test("PAP-40: on win32 the PowerShell rules go in the arguments too, one argument per rule", () => {
  expect(sessionArgs("judge", JUDGE, "win32", false).slice(15, 29)).toEqual([
    "Bash(git status:*)",
    "Bash(git diff:*)",
    "Bash(git log:*)",
    "Bash(git show:*)",
    "Bash(git rev-parse:*)",
    "Bash(git switch:*)",
    "PowerShell(git status:*)",
    "PowerShell(git diff:*)",
    "PowerShell(git log:*)",
    "PowerShell(git show:*)",
    "PowerShell(git rev-parse:*)",
    "PowerShell(git switch:*)",
    "--append-system-prompt",
    "Squad name: judge. Squad role: judge.\nBase skills of your role: spec-driven-eval, ponytail-review.",
  ]);
});

test("PAP-47: with --skip-permissions the mode and the allowed list give way to --dangerously-skip-permissions", () => {
  for (const platform of ["linux", "win32"]) {
    expect(sessionArgs("leader", LEADER, platform, true)).toEqual([
      "--plugin-dir",
      PLUGIN,
      "--dangerously-load-development-channels",
      "plugin:squad@inline",
      "--dangerously-skip-permissions",
      "--append-system-prompt",
      "Squad name: leader. Squad role: leader.\n" +
        "Base skills of your role: help-me, the-jury.\n" +
        "With the tlc workflow, also: tlc-plan.\n" +
        "With the matt-pocock workflow, also: to-tickets.\n" +
        "Use only the skills of the workflow of the open feature.",
      "/squad:leader",
    ]);
  }
});

for (const role of ROLES) {
  test(`PAP-40: the last argument of the ${role} is its skill, right after the value of --append-system-prompt`, () => {
    for (const skip of [false, true]) {
      const args = sessionArgs(role === "worker" ? "worker-3" : role, entry({ name: role, skills: ["a-skill"] }), "win32", skip);
      expect(args.slice(-3)).toEqual([
        "--append-system-prompt",
        `Squad name: ${role === "worker" ? "worker-3" : role}. Squad role: ${role}.\nBase skills of your role: a-skill.`,
        `/squad:${role}`,
      ]);
    }
  });
}
