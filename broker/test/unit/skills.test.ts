import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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

// PAP-61: the squad tools the skill of each role has to cite
const REQUIRED: Record<string, string[]> = {
  worker: ["ready", "state", "ask", "blocked", "send_result", "answer", "history"],
  judge: ["ready", "state", "ask", "blocked", "send_verdict", "history"],
  leader: ["ready", "state", "ask", "blocked", "plan", "send_task", "send_result", "answer", "escalate"],
};

// What one section has to have in backticks: `cited` in any place, `ordered` with the first
// citation of each one after that of the one before, and `never` a command it does not have
interface Rule {
  id: string;
  section: string;
  cited?: string[];
  ordered?: string[];
  never?: string[];
}

const OF_EVERY_ROLE: Rule[] = [
  { id: "PAP-62", section: "Start", ordered: ["ready", "state"], cited: ["git show <spec_commit>:<spec_ref>"] },
];

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
// code is its name; a tool of another role is refused wherever a code has its name.
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
  if (titles !== SECTIONS.join(" | ")) found.push(`PAP-60: the sections are ${titles}`);

  const mine = squadTools(role);
  const all = code(text);
  for (const name of new Set(all.flatMap((span) => span.match(/[A-Za-z_]+/g) ?? []))) {
    if (EVERY_TOOL.has(name) && !mine.includes(name)) found.push(`PAP-61: ${name} is cited and is not a tool of the ${role}`);
  }
  for (const name of REQUIRED[role] ?? []) {
    if (!all.includes(name)) found.push(`PAP-61: ${name} is not cited`);
  }

  for (const { id, section, cited = [], ordered = [], never = [] } of [...OF_EVERY_ROLE, ...(OF_ROLE[role] ?? [])]) {
    const spans = code(parts.find((part) => part.title === section)?.body ?? "");
    const first = (literal: string) => spans.findIndex((span) => cites(span, literal));
    for (const literal of [...ordered, ...cited]) {
      if (first(literal) < 0) found.push(`${id}: ${section} does not cite ${literal}`);
    }
    const places = ordered.map(first);
    if (places.every((place) => place >= 0) && places.some((place, i) => i > 0 && place <= places[i - 1]!)) {
      found.push(`${id}: ${section} does not cite ${ordered.join(", then ")} in this order`);
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

for (const role of ["worker", "judge", "leader"]) {
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
  expect(problems("worker", swapped)).toEqual(["PAP-62: Start does not cite ready, then state in this order"]);
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
