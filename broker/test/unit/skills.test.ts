import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { toolsFor } from "../../tools.ts";

const SKILLS = join(import.meta.dir, "..", "..", "..", "plugin", "skills");

// PAP-60: the sections of level 2 of a skill, in this order
const SECTIONS = [
  "Start",
  "No acknowledgements",
  "Your work",
  "Asking",
  "Credentials",
  "Irreversible actions",
  "When the feature closes",
];

// PAP-72: the mother has one more, right after `Irreversible actions`
const OF_THE_MOTHER = [
  "Start",
  "No acknowledgements",
  "Your work",
  "Asking",
  "Credentials",
  "Irreversible actions",
  "Delivery",
  "When the feature closes",
];

// GAT-37: the line that marked what the Gate slice rewrites, which no skill has any longer
const GATE_LINE = "<!-- Gate slice: rewrite this section to use the gate -->";

// PAP-61: the squad tools the skill of each role has to cite
const REQUIRED: Record<string, string[]> = {
  worker: ["ready", "state", "ask", "blocked", "send_result", "answer", "history"],
  judge: ["ready", "state", "ask", "blocked", "send_verdict", "history"],
  leader: ["ready", "state", "ask", "blocked", "plan", "send_task", "send_result", "answer", "escalate"],
  mother: [
    "ready", "state", "ask", "blocked", "open_feature", "send_task", "answer", "escalate", "merge_question", "close_feature",
  ],
};

// What one section has to have in backticks: `cited` in any place, `ordered` with the first
// citation of each one after that of the one before, and `never` a command it does not have.
// `lines` are whole lines of the section, and `says` are sentences of it.
interface Rule {
  id: string;
  section: string;
  says?: string[];
  cited?: string[];
  ordered?: string[];
  never?: string[];
  lines?: string[];
  uncited?: string[];
}

const OF_EVERY_ROLE: Rule[] = [
  { id: "PAP-62", section: "Start", ordered: ["ready", "state"], cited: ["git show <spec_commit>:<spec_ref>"] },
  {
    id: "PAP-75",
    section: "Start",
    says: [
      "Call `state` in the same turn, right after `ready`",
      "if `state` is not among your tools yet, look the squad tools up by name",
      "Do not end the turn between `ready` and `state`.",
    ],
  },
];

// PAP-74: what a skill says before its first section about where the project is
const PROJECT = [
  "Your project is the working directory of this session.",
  "The directory this skill was loaded from belongs to the squad plugin, not to your project: never read, write or run anything there.",
];

// GAT-37 to GAT-39: the sentences of the mother about the gate, by requirement and section
const GAT_SAYS: Record<string, string[]> = {
  "GAT-37: Irreversible actions": [
    "When you need one of them yourself, call `gate` with `scope` set to `action`, the exact `action` you will take and its `effect`",
    "When a blocking question asks whether one of them may be done, call `gate` with `scope` set to `action`, the exact `action` the agent will take and its `effect`.",
  ],
  "GAT-37: Delivery": ["Call `gate` with `scope` set to `delivery` and `commit` set to that commit."],
  "GAT-38: Irreversible actions": [
    "After `approve`, take exactly the `action` of the gate, nothing more and nothing different, and, when the gate has a `commit`, only if the branch of the feature is still at it.",
    "If it is not, do not take it: ask a new gate, without `gate_id`, with the new commit.",
    "After `reject`, do not take the action.",
    "After `comment`, the gate is still pending: do what the comment asks, then call `gate` again with the same `gate_id`",
    "When an agent asked for the action, the agent is the one who takes it, by the same rules: answer its blocking question with the decision, with `answer`, so that it takes the action or does not.",
  ],
  "GAT-39: Delivery": [
    "Call `close_feature` with `outcome` set to `delivered` only after you took the approved delivery, saying in `body` what was done.",
  ],
};

const OF_ROLE: Record<string, Rule[]> = {
  worker: [
    {
      id: "PAP-68",
      section: "Your work",
      cited: ["git switch -c", "ticket_ref", "task_seq", "branch", "commit", "loadout"],
      never: ["git merge", "git push"],
    },
  ],
  judge: [
    {
      id: "PAP-69",
      section: "Your work",
      cited: ["git switch --detach", "result_seq", "outcome", "criteria", "stale_reference"],
    },
  ],
  leader: [
    {
      id: "PAP-70",
      section: "Your work",
      cited: ["git switch", "git merge", "ticket_ref", "loadout", "criteria", "rework_limit", "dropped"],
      ordered: ["plan", "send_task"],
    },
  ],
  mother: [
    {
      id: "PAP-71",
      section: "Your work",
      cited: ["merge_question"],
      // the branch of the feature, the spec in it and the way back, before the feature opens
      ordered: ["git switch -c", "git commit", "git switch <base_branch>", "open_feature"],
    },
    { id: "PAP-72", section: "Delivery", cited: ["close_feature", "delivered"] },
    {
      id: "GAT-37",
      section: "Irreversible actions",
      cited: ["gate"],
      says: GAT_SAYS["GAT-37: Irreversible actions"],
      uncited: ["ask", "escalate"],
    },
    {
      id: "GAT-37",
      section: "Delivery",
      says: GAT_SAYS["GAT-37: Delivery"],
      ordered: ["git rev-parse <branch>", "gate"],
      uncited: ["ask", "escalate"],
    },
    { id: "GAT-38", section: "Irreversible actions", says: GAT_SAYS["GAT-38: Irreversible actions"] },
    { id: "GAT-39", section: "Delivery", says: GAT_SAYS["GAT-39: Delivery"], ordered: ["gate", "close_feature"] },
  ],
};

// The squad tools of a role, and those of the four
const squadTools = (role: string) => ["ready", ...toolsFor(role).map((tool) => tool.name)];
const EVERY_TOOL = new Set(["mother", "leader", "worker", "judge"].flatMap(squadTools));

// The skill as written. git may hand it out with the line ends of Windows.
function read(role: string): string {
  return readFileSync(join(SKILLS, role, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
}

// What a text has as code, in order: what is between backticks in a line, and each line
// of a fenced block
function code(text: string): string[] {
  const found: string[] = [];
  let fenced = false;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) fenced = !fenced;
    else if (fenced) found.push(line.trim());
    else for (const span of line.matchAll(/`([^`]+)`/g)) found.push(span[1]!);
  }
  return found;
}

// The sections of level 2, each with the text under its title
function sections(text: string): { title: string; body: string }[] {
  return text
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const [title = "", ...body] = part.split("\n");
      return { title: title.trim(), body: body.join("\n") };
    });
}

// A name is cited by itself, and a command with or without what comes after it
const cites = (span: string, literal: string) => span === literal || span.startsWith(`${literal} `);

// What the skill of a role has wrong, one line for each thing and none for a skill that
// follows PAP-60 to PAP-62 and has the literals of its role. A squad tool is cited when a
// code is its name; a tool of another role is refused wherever a code has its name, and
// so is any code with `gate` in it.
function problems(role: string, text: string): string[] {
  const found: string[] = [];

  const front = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
  const field = (key: string) => {
    const value = front?.match(new RegExp(`^${key}:(.*)$`, "m"))?.[1] ?? "";
    return value.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  };
  if (front === undefined) found.push("PAP-60: the skill does not start with a frontmatter");
  else {
    if (field("name") !== role) found.push(`PAP-60: the name of the frontmatter is not ${role}`);
    if (field("description") === "") found.push("PAP-60: the description of the frontmatter is empty");
  }
  const parts = sections(text);
  const titles = parts.map((part) => part.title).join(" | ");
  if (titles !== (role === "mother" ? OF_THE_MOTHER : SECTIONS).join(" | ")) found.push(`PAP-60: the sections are ${titles}`);

  const intro = text.split(/^## /m)[0] ?? "";
  for (const sentence of PROJECT) {
    if (!intro.includes(sentence)) found.push(`PAP-74: the skill does not say before its sections: ${sentence}`);
  }

  const mine = squadTools(role);
  const all = code(text);
  for (const name of new Set(all.flatMap((span) => span.match(/[A-Za-z_]+/g) ?? []))) {
    if (EVERY_TOOL.has(name) && !mine.includes(name)) found.push(`PAP-61: ${name} is cited and is not a tool of the ${role}`);
  }
  for (const name of REQUIRED[role] ?? []) {
    if (!all.includes(name)) found.push(`PAP-61: ${name} is not cited`);
  }
  // The gate is the mother's alone: no other skill cites a code with gate in it
  if (role !== "mother") {
    for (const span of all) {
      if (/gate/i.test(span)) found.push(`GAT-39: ${span} is cited, and has gate in it`);
    }
  }
  if (text.split("\n").includes(GATE_LINE)) found.push(`GAT-37: the skill has the line ${GATE_LINE}`);

  for (const { id, section, says = [], cited = [], ordered = [], never = [], lines = [], uncited = [] } of [...OF_EVERY_ROLE, ...(OF_ROLE[role] ?? [])]) {
    const body = parts.find((part) => part.title === section)?.body ?? "";
    const spans = code(body);
    for (const sentence of says) {
      if (!body.includes(sentence)) found.push(`${id}: ${section} does not say: ${sentence}`);
    }
    for (const line of lines) {
      if (!body.split("\n").includes(line)) found.push(`${id}: ${section} does not have the line ${line}`);
    }
    const first = (literal: string) => spans.findIndex((span) => cites(span, literal));
    for (const literal of [...ordered, ...cited]) {
      if (first(literal) < 0) found.push(`${id}: ${section} does not cite ${literal}`);
    }
    const places = ordered.map(first);
    if (places.every((place) => place >= 0) && places.some((place, i) => i > 0 && place <= places[i - 1]!)) {
      found.push(`${id}: ${section} does not cite ${ordered.join(", then ")} in this order`);
    }
    for (const literal of uncited) {
      if (first(literal) >= 0) found.push(`${id}: ${section} cites ${literal}`);
    }
    for (const command of never) {
      if (spans.some((span) => span.includes(command))) found.push(`${id}: ${section} has the command ${command}`);
    }
  }
  return found;
}

// The text with `from` replaced by `to`. `from` has to be there: a change that changes
// nothing proves nothing.
function changed(text: string, from: string | RegExp, to: string): string {
  const out = typeof from === "string" ? text.replaceAll(from, to) : text.replace(from, to);
  if (out === text) throw new Error(`nothing to change: ${from}`);
  return out;
}

// --- The skills as they are ---

for (const role of ["worker", "judge", "leader", "mother"]) {
  const of = (id: string) => problems(role, read(role)).filter((problem) => problem.startsWith(id));

  test(`PAP-60: the ${role} skill starts with the frontmatter of its role and has its sections, in order`, () => {
    expect(of("PAP-60")).toEqual([]);
  });

  test(`PAP-61: the ${role} skill cites in backticks no squad tool of another role, and every one it has to`, () => {
    expect(of("PAP-61")).toEqual([]);
  });

  test(`PAP-62: Start of the ${role} skill cites ready, then state, and the command that reads the spec`, () => {
    expect(of("PAP-62")).toEqual([]);
  });

  test(`PAP-74: the ${role} skill says before its sections that the project is the working directory and that nothing is done in the directory of the plugin`, () => {
    expect(of("PAP-74")).toEqual([]);
  });

  test(`PAP-75: Start of the ${role} skill orders state in the turn of ready, the lookup of the squad tools that are not listed yet, and no end of turn between the two`, () => {
    expect(of("PAP-75")).toEqual([]);
  });
}

test("PAP-68: Your work of the worker skill has the literals of a result and no command that merges or pushes", () => {
  expect(problems("worker", read("worker")).filter((problem) => problem.startsWith("PAP-68"))).toEqual([]);
});

test("PAP-69: Your work of the judge skill has the literals of a verdict", () => {
  expect(problems("judge", read("judge")).filter((problem) => problem.startsWith("PAP-69"))).toEqual([]);
});

test("PAP-70: Your work of the leader skill has the literals of its git, of a task and of the rework limit, and plan before send_task", () => {
  expect(problems("leader", read("leader")).filter((problem) => problem.startsWith("PAP-70"))).toEqual([]);
});

test("PAP-71: Your work of the mother skill cites merge_question, and the branch, the commit of the spec and the way back to the base branch before open_feature", () => {
  expect(problems("mother", read("mother")).filter((problem) => problem.startsWith("PAP-71"))).toEqual([]);
});

test("GAT-37: the mother skill has no line of the Gate slice, and Irreversible actions and Delivery ask for a gate with the tool gate, of scope action and of scope delivery with the commit", () => {
  expect(problems("mother", read("mother")).filter((problem) => problem.startsWith("GAT-37"))).toEqual([]);
});

test("GAT-38: Irreversible actions of the mother says what to do after approve, reject and comment, and with the action an agent asked for", () => {
  expect(problems("mother", read("mother")).filter((problem) => problem.startsWith("GAT-38"))).toEqual([]);
});

test("GAT-39/PAP-72: Delivery of the mother calls close_feature with delivered only after the approved delivery, saying in body what was done", () => {
  expect(problems("mother", read("mother")).filter((problem) => /^(GAT-39|PAP-72)/.test(problem))).toEqual([]);
});

test("GAT-39: no skill of another role cites the gate tool, nor any code with gate in it", () => {
  for (const role of ["worker", "judge", "leader"]) {
    expect(problems(role, read(role)).filter((problem) => /^GAT-3[79]/.test(problem))).toEqual([]);
  }
});

test("PAP-04: the plugin has exactly the skills mother, leader, worker and judge, each one with SKILL.md alone", () => {
  expect(readdirSync(SKILLS).sort()).toEqual(["judge", "leader", "mother", "worker"]);
  for (const role of ["mother", "leader", "worker", "judge"]) {
    expect([role, readdirSync(join(SKILLS, role))]).toEqual([role, ["SKILL.md"]]);
  }
});

// --- What the checker refuses: the worker skill with one thing changed ---

test("PAP-60: a skill with the name of another role in the frontmatter fails", () => {
  expect(problems("worker", changed(read("worker"), "name: worker", "name: judge"))).toEqual([
    "PAP-60: the name of the frontmatter is not worker",
  ]);
});

test("PAP-60: a skill with an empty description fails", () => {
  expect(problems("worker", changed(read("worker"), /^description:.*$/m, "description:"))).toEqual([
    "PAP-60: the description of the frontmatter is empty",
  ]);
});

test("PAP-60: a skill that does not start with a frontmatter fails, with none and with a line before it", () => {
  const none = ["PAP-60: the skill does not start with a frontmatter"];
  expect(problems("worker", changed(read("worker"), /^---\n[\s\S]*?\n---\n/, ""))).toEqual(none);
  expect(problems("worker", `# Squad worker\n${read("worker")}`)).toEqual(none);
});

test("PAP-60: a skill without one of the sections fails", () => {
  expect(problems("worker", changed(read("worker"), "## Credentials", "### Credentials"))).toEqual([
    "PAP-60: the sections are Start | No acknowledgements | Your work | Asking | Irreversible actions | When the feature closes",
  ]);
});

test("PAP-60: a skill with two sections in each other's place fails", () => {
  const swapped = changed(
    changed(changed(read("worker"), "## Asking", "## @"), "## Credentials", "## Asking"),
    "## @",
    "## Credentials"
  );
  expect(problems("worker", swapped)).toEqual([
    "PAP-60: the sections are Start | No acknowledgements | Your work | Credentials | Asking | Irreversible actions | When the feature closes",
  ]);
});

test("PAP-60: a skill with one more section of level 2 fails", () => {
  expect(problems("worker", `${read("worker")}\n## Notes\n\nNothing.\n`)).toEqual([
    "PAP-60: the sections are Start | No acknowledgements | Your work | Asking | Credentials | Irreversible actions | When the feature closes | Notes",
  ]);
});

test("PAP-61: a skill of the worker with send_verdict in backticks fails", () => {
  expect(problems("worker", `${read("worker")}\nThen call \`send_verdict\`.\n`)).toEqual([
    "PAP-61: send_verdict is cited and is not a tool of the worker",
  ]);
});

test("PAP-61: a tool of another role fails inside a longer code and inside a fenced block", () => {
  expect(problems("worker", `${read("worker")}\nThen \`send_verdict to the leader\`.\n`)).toEqual([
    "PAP-61: send_verdict is cited and is not a tool of the worker",
  ]);
  expect(problems("worker", `${read("worker")}\n\`\`\`\nplan the tickets\n\`\`\`\n`)).toEqual([
    "PAP-61: plan is cited and is not a tool of the worker",
  ]);
});

test("PAP-61: a skill of the worker that leaves one of its seven tools out of the backticks fails", () => {
  for (const name of ["ready", "state", "ask", "blocked", "send_result", "answer", "history"]) {
    expect(problems("worker", changed(read("worker"), `\`${name}\``, name))).toContain(`PAP-61: ${name} is not cited`);
  }
});

test("PAP-62: Start that cites state before ready fails", () => {
  const swapped = changed(changed(changed(read("worker"), "`ready`", "`@`"), "`state`", "`ready`"), "`@`", "`state`");
  // the swap also undoes the three orders of PAP-75, which name the two tools
  expect(problems("worker", swapped)).toEqual([
    "PAP-62: Start does not cite ready, then state in this order",
    "PAP-75: Start does not say: Call `state` in the same turn, right after `ready`",
    "PAP-75: Start does not say: if `state` is not among your tools yet, look the squad tools up by name",
    "PAP-75: Start does not say: Do not end the turn between `ready` and `state`.",
  ]);
});

test("PAP-62: Start without the command that reads the spec fails, also when another section has it", () => {
  const without = changed(read("worker"), "git show <spec_commit>:<spec_ref>", "git show");
  const missing = ["PAP-62: Start does not cite git show <spec_commit>:<spec_ref>"];
  expect(problems("worker", without)).toEqual(missing);
  expect(problems("worker", `${without}\nRead it with \`git show <spec_commit>:<spec_ref>\`.\n`)).toEqual(missing);
});

test("PAP-68: Your work of the worker without one of its six literals fails", () => {
  const worker = read("worker");
  expect(problems("worker", changed(worker, "git switch -c", "git switch"))).toContain(
    "PAP-68: Your work does not cite git switch -c"
  );
  for (const name of ["ticket_ref", "task_seq", "branch", "commit", "loadout"]) {
    expect(problems("worker", changed(worker, `\`${name}\``, name))).toContain(`PAP-68: Your work does not cite ${name}`);
  }
});

test("PAP-68: Your work of the worker with a command that merges or pushes in backticks fails", () => {
  const withCommand = (command: string) => changed(read("worker"), "\n## Asking", `\nThen \`${command}\`.\n\n## Asking`);
  expect(problems("worker", withCommand("git merge <ticket branch>"))).toEqual(["PAP-68: Your work has the command git merge"]);
  expect(problems("worker", withCommand("git push origin <ticket branch>"))).toEqual(["PAP-68: Your work has the command git push"]);
});

// --- The same for the judge skill ---

test("PAP-61: a skill of the judge with answer or escalate in backticks fails, also as the kind of a message", () => {
  const refused = (name: string) => [`PAP-61: ${name} is cited and is not a tool of the judge`];
  expect(problems("judge", `${read("judge")}\nReply with \`answer\`.\n`)).toEqual(refused("answer"));
  expect(problems("judge", `${read("judge")}\nPass it on with \`escalate\`.\n`)).toEqual(refused("escalate"));
  expect(problems("judge", `${read("judge")}\nIt arrives with \`kind="answer"\`.\n`)).toEqual(refused("answer"));
});

test("PAP-61: a skill of the judge that leaves one of its six tools out of the backticks fails", () => {
  for (const name of ["ready", "state", "ask", "blocked", "send_verdict", "history"]) {
    expect(problems("judge", changed(read("judge"), `\`${name}\``, name))).toContain(`PAP-61: ${name} is not cited`);
  }
});

test("PAP-69: Your work of the judge without one of its five literals fails", () => {
  const judge = read("judge");
  expect(problems("judge", changed(judge, "git switch --detach", "git switch"))).toContain(
    "PAP-69: Your work does not cite git switch --detach"
  );
  for (const name of ["result_seq", "outcome", "criteria", "stale_reference"]) {
    expect(problems("judge", changed(judge, `\`${name}\``, name))).toContain(`PAP-69: Your work does not cite ${name}`);
  }
});

// --- The same for the leader skill ---

test("PAP-61: a skill of the leader that leaves one of its nine tools out of the backticks fails", () => {
  for (const name of ["ready", "state", "ask", "blocked", "plan", "send_task", "send_result", "answer", "escalate"]) {
    expect(problems("leader", changed(read("leader"), `\`${name}\``, name))).toContain(`PAP-61: ${name} is not cited`);
  }
});

test("PAP-70: Your work of the leader without one of its seven literals fails", () => {
  const leader = read("leader");
  // every `git switch` of the skill, with and without what comes after it
  expect(problems("leader", changed(leader, /`git switch[^`]*`/g, "git switch"))).toContain(
    "PAP-70: Your work does not cite git switch"
  );
  expect(problems("leader", changed(leader, /`git merge[^`]*`/g, "git merge"))).toContain(
    "PAP-70: Your work does not cite git merge"
  );
  for (const name of ["ticket_ref", "loadout", "criteria", "rework_limit", "dropped"]) {
    expect(problems("leader", changed(leader, `\`${name}\``, name))).toContain(`PAP-70: Your work does not cite ${name}`);
  }
});

test("PAP-70: Your work of the leader that cites send_task before plan fails", () => {
  const swapped = changed(changed(changed(read("leader"), "`plan`", "`@`"), "`send_task`", "`plan`"), "`@`", "`send_task`");
  expect(problems("leader", swapped)).toEqual(["PAP-70: Your work does not cite plan, then send_task in this order"]);
});

// --- The same for the mother skill ---

test("PAP-61: a skill of the mother that leaves one of its ten tools out of the backticks fails", () => {
  const tools = [
    "ready", "state", "ask", "blocked", "open_feature", "send_task", "answer", "escalate", "merge_question", "close_feature",
  ];
  for (const name of tools) {
    expect(problems("mother", changed(read("mother"), `\`${name}\``, name))).toContain(`PAP-61: ${name} is not cited`);
  }
});

test("PAP-72: a skill of the mother without Delivery, or with it after When the feature closes, fails", () => {
  const without = changed(read("mother"), "## Delivery", "### Delivery");
  expect(problems("mother", without)).toContain(
    "PAP-60: the sections are Start | No acknowledgements | Your work | Asking | Credentials | Irreversible actions | When the feature closes"
  );
  const after = changed(
    changed(changed(read("mother"), "## Delivery", "## @"), "## When the feature closes", "## Delivery"),
    "## @",
    "## When the feature closes"
  );
  expect(problems("mother", after)).toContain(
    "PAP-60: the sections are Start | No acknowledgements | Your work | Asking | Credentials | Irreversible actions | When the feature closes | Delivery"
  );
});

test("GAT-37: a skill with the line of the Gate slice fails, in the mother and in another role", () => {
  expect(problems("mother", changed(read("mother"), "## Delivery\n", `## Delivery\n\n${GATE_LINE}\n`))).toEqual([
    `GAT-37: the skill has the line ${GATE_LINE}`,
  ]);
  expect(problems("judge", `${read("judge")}\n${GATE_LINE}\n`)).toEqual([`GAT-37: the skill has the line ${GATE_LINE}`]);
});

test("GAT-37/38/39: the mother skill without one of the sentences of the gate fails, also when another section has it", () => {
  for (const [where, sentences] of Object.entries(GAT_SAYS)) {
    for (const sentence of sentences) {
      const moved = changed(
        changed(read("mother"), sentence, "Then wait."),
        "## When the feature closes\n",
        `## When the feature closes\n\n${sentence}\n`
      );
      expect(problems("mother", moved)).toContain(`${where} does not say: ${sentence}`);
    }
  }
});

test("GAT-37: Irreversible actions or Delivery of the mother that asks or escalates instead of the gate fails", () => {
  const added = (next: string, code: string) =>
    changed(read("mother"), `\n## ${next}\n`, `\nOr call \`${code}\` with \`to\` set to \`human\`.\n\n## ${next}\n`);
  expect(problems("mother", added("Delivery", "ask"))).toEqual(["GAT-37: Irreversible actions cites ask"]);
  expect(problems("mother", added("Delivery", "escalate"))).toEqual(["GAT-37: Irreversible actions cites escalate"]);
  expect(problems("mother", added("When the feature closes", "ask"))).toEqual(["GAT-37: Delivery cites ask"]);
});

test("GAT-37/39: Delivery of the mother that calls close_feature before the gate, or the gate before the commit, fails", () => {
  const first = (code: string) => changed(read("mother"), "1. Take the commit of the branch", `1. Call \`${code}\`. Take the commit of the branch`);
  expect(problems("mother", first("close_feature"))).toContain("GAT-39: Delivery does not cite gate, then close_feature in this order");
  expect(problems("mother", first("gate"))).toContain("GAT-37: Delivery does not cite git rev-parse <branch>, then gate in this order");
});

test("GAT-39: a skill of another role with the gate tool, or with any code with gate in it, fails, and the mother skill does not", () => {
  expect(problems("worker", `${read("worker")}\nThen call \`gate\`.\n`)).toEqual([
    "PAP-61: gate is cited and is not a tool of the worker",
    "GAT-39: gate is cited, and has gate in it",
  ]);
  expect(problems("leader", `${read("leader")}\nThen wait for the \`gate_decision\`.\n`)).toEqual([
    "GAT-39: gate_decision is cited, and has gate in it",
  ]);
  expect(problems("mother", `${read("mother")}\nThen wait for the \`gate_decision\`.\n`)).toEqual([]);
});

test("PAP-72: Delivery of the mother without close_feature or without delivered fails", () => {
  const mother = read("mother");
  for (const name of ["close_feature", "delivered"]) {
    expect(problems("mother", changed(mother, `\`${name}\``, name))).toContain(
      `PAP-72: Delivery does not cite ${name}`
    );
  }
});

test("PAP-71: Your work of the mother without merge_question, open_feature or one of the three git steps before it fails", () => {
  const mother = read("mother");
  for (const name of ["merge_question", "open_feature", "git commit", "git switch <base_branch>"]) {
    expect(problems("mother", changed(mother, `\`${name}\``, name))).toContain(`PAP-71: Your work does not cite ${name}`);
  }
  expect(problems("mother", changed(mother, "git switch -c", "git branch"))).toContain(
    "PAP-71: Your work does not cite git switch -c"
  );
});

test("PAP-71: Your work of the mother that cites open_feature before the branch, the commit and the way back fails", () => {
  const order = [
    "PAP-71: Your work does not cite git switch -c, then git commit, then git switch <base_branch>, then open_feature in this order",
  ];
  const mother = read("mother");
  expect(problems("mother", changed(mother, "## Your work\n", "## Your work\n\nCall `open_feature` first.\n"))).toEqual(order);
  // the way back to the base branch before the commit of the spec
  const swapped = changed(
    changed(changed(mother, "`git commit`", "`@`"), "`git switch <base_branch>`", "`git commit`"),
    "`@`",
    "`git switch <base_branch>`"
  );
  expect(problems("mother", swapped)).toEqual(order);
});

test("PAP-74: a skill without one of the two sentences about the project fails, also when a section has it", () => {
  const worker = read("worker");
  for (const sentence of PROJECT) {
    expect(problems("worker", changed(worker, sentence, ""))).toEqual([`PAP-74: the skill does not say before its sections: ${sentence}`]);
    const moved = changed(changed(worker, sentence, ""), "## Start\n", `## Start\n\n${sentence}\n`);
    expect(problems("worker", moved)).toEqual([`PAP-74: the skill does not say before its sections: ${sentence}`]);
  }
});

test("PAP-75: Start without one of its three orders about state fails, also when another section has it", () => {
  const judge = read("judge");
  for (const sentence of [
    "Call `state` in the same turn, right after `ready`",
    "if `state` is not among your tools yet, look the squad tools up by name",
    "Do not end the turn between `ready` and `state`.",
  ]) {
    const moved = changed(changed(judge, sentence, ""), "## Asking\n", `## Asking\n\n${sentence}\n`);
    expect(problems("judge", moved)).toEqual([`PAP-75: Start does not say: ${sentence}`]);
  }
});
