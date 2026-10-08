/**
 * squad MCP tools
 *
 * What a registered session can call, by role: a session only sees the tools of
 * its role (ADR-010). Each tool but list_peers is one route of the broker, and
 * each tool that sends is one kind. No MCP and no HTTP here.
 */

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const string = (description: string) => ({ type: "string" as const, description });
const integer = (description: string) => ({ type: "integer" as const, description });

// The envelope of what is sent: the same in the three kinds
const ENVELOPE = {
  to: string("Name of the recipient: mother, leader, judge, worker-1, worker-2 or worker-3"),
  summary: string("One line of up to 80 characters saying what this is"),
  body: string("The full text. Optional."),
};

export const LIST_PEERS_TOOL: Tool = {
  name: "list_peers",
  description:
    "List the other members of the squad. Returns the name and role of each one and whether it is online.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const STATE_TOOL: Tool = {
  name: "state",
  description:
    "See where you are: the open feature, the ticket you have and what you owe (a result, a verdict, a task, a plan, or an event still to be read). Call it when you start and whenever you are not sure what to do next.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const HISTORY_TOOL: Tool = {
  name: "history",
  description:
    "Read the events of one ticket of the open feature, of one question or of one gate, in order. Send exactly one of ticket_ref, question_id or gate_id.",
  inputSchema: {
    type: "object",
    properties: {
      ticket_ref: string("The ticket, as the plan names it"),
      question_id: integer("The id of the question"),
      gate_id: integer("The id of the gate"),
    },
  },
};

const BLOCKED_TOOL: Tool = {
  name: "blocked",
  description:
    "Tell the squad you cannot go on by yourself. It is recorded and shown to the dev; it is not sent to anyone.",
  inputSchema: {
    type: "object",
    properties: {
      reason: string("What blocks you, in up to 80 characters"),
      detail: string("What you need to go on"),
      last_action: string("The last thing you did before stopping"),
      ticket_ref: string("The ticket you were working on. Optional."),
    },
    required: ["reason", "detail", "last_action"],
  },
};

const UNBLOCKED_TOOL: Tool = {
  name: "unblocked",
  description: "Tell the squad you are no longer blocked and went back to work.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const SEND_TASK_TOOL: Tool = {
  name: "send_task",
  description:
    "Send a task. The mother sends it to the leader, about the feature: only to, summary and body. The leader sends it to a worker, about one ticket of the plan: ticket_ref and loadout are required then.",
  inputSchema: {
    type: "object",
    properties: {
      ...ENVELOPE,
      ticket_ref: string("The ticket of the plan this task is about. Only from the leader to a worker."),
      loadout: {
        type: "array",
        items: { type: "string" },
        description: "The skills the worker loads for the ticket. May be empty. Only from the leader to a worker.",
      },
      criteria: {
        type: "array",
        items: { type: "integer" },
        description: "The numbers of the acceptance criteria of the spec the ticket covers. Optional.",
      },
    },
    required: ["to", "summary"],
  },
};

const SEND_RESULT_TOOL: Tool = {
  name: "send_result",
  description:
    "Send a result. A worker sends it to the judge, about its ticket: ticket_ref, task_seq, branch and commit are required then. The leader sends it to the mother, about the feature: only to, summary and body.",
  inputSchema: {
    type: "object",
    properties: {
      ...ENVELOPE,
      ticket_ref: string("The ticket this result delivers. Only from a worker to the judge."),
      task_seq: integer("The seq of the task this result answers: the latest task of the ticket"),
      branch: string("The branch with the work"),
      commit: string("The commit to be judged"),
    },
    required: ["to", "summary"],
  },
};

const SEND_VERDICT_TOOL: Tool = {
  name: "send_verdict",
  description: "Send to the leader the verdict of the latest result of a ticket: approve or rework, criterion by criterion.",
  inputSchema: {
    type: "object",
    properties: {
      ...ENVELOPE,
      ticket_ref: string("The ticket judged"),
      result_seq: integer("The seq of the result judged: the latest result of the ticket"),
      outcome: { type: "string", enum: ["approve", "rework"], description: "approve or rework" },
      criteria: {
        type: "array",
        description: "One item per acceptance criterion judged. At least one.",
        items: {
          type: "object",
          properties: {
            n: integer("The number of the criterion in the spec"),
            text: string("The criterion"),
            pass: { type: "boolean", description: "Whether the result meets it" },
            note: string("What was seen. Optional."),
          },
          required: ["n", "text", "pass"],
        },
      },
    },
    required: ["to", "summary", "ticket_ref", "result_seq", "outcome", "criteria"],
  },
};

const PLAN_TOOL: Tool = {
  name: "plan",
  description:
    "Hand over the whole list of tickets of the open feature. It replaces the plan before it: keep every ticket that already received a task, with dropped true if it is abandoned.",
  inputSchema: {
    type: "object",
    properties: {
      tickets: {
        type: "array",
        description: "Every ticket of the feature. At least one.",
        items: {
          type: "object",
          properties: {
            ticket_ref: string("The name of the ticket, unique in the feature"),
            title: string("What the ticket delivers"),
            depends_on: {
              type: "array",
              items: { type: "string" },
              description: "The ticket_ref of other tickets of this plan it depends on. Optional.",
            },
            dropped: { type: "boolean", description: "True when the ticket is abandoned. Optional." },
          },
          required: ["ticket_ref", "title"],
        },
      },
    },
    required: ["tickets"],
  },
};

const OPEN_FEATURE_TOOL: Tool = {
  name: "open_feature",
  description:
    "Open the feature the squad will work on, with its spec and workflow locked. Only one feature is open at a time: close the open one first.",
  inputSchema: {
    type: "object",
    properties: {
      title: string("What the feature delivers, in one line"),
      workflow: { type: "string", enum: ["tlc", "matt-pocock"], description: "tlc or matt-pocock" },
      branch: string("The branch of the feature"),
      base_branch: string("The branch the feature leaves from and goes back to"),
      spec_ref: string("The path of the spec in the repository"),
      spec_commit: string("The commit that has the spec the squad follows"),
    },
    required: ["title", "workflow", "branch", "base_branch", "spec_ref", "spec_commit"],
  },
};

const CLOSE_FEATURE_TOOL: Tool = {
  name: "close_feature",
  description: "Close the open feature as delivered or abandoned. The squad is then free for the next one.",
  inputSchema: {
    type: "object",
    properties: {
      outcome: { type: "string", enum: ["delivered", "abandoned"], description: "delivered or abandoned" },
      body: string("What there is to say about the closing. Optional."),
    },
    required: ["outcome"],
  },
};

// What every registered session has
const COMMON = [LIST_PEERS_TOOL, STATE_TOOL, HISTORY_TOOL, BLOCKED_TOOL, UNBLOCKED_TOOL];

// What each role sends, after the edges of the star
const OF_ROLE: Record<string, Tool[]> = {
  mother: [SEND_TASK_TOOL, OPEN_FEATURE_TOOL, CLOSE_FEATURE_TOOL],
  leader: [PLAN_TOOL, SEND_TASK_TOOL, SEND_RESULT_TOOL],
  worker: [SEND_RESULT_TOOL],
  judge: [SEND_VERDICT_TOOL],
};

// The tools of a registered session of the role, and none for a role that does not exist
export function toolsFor(role: string): Tool[] {
  return Object.hasOwn(OF_ROLE, role) ? [...COMMON, ...OF_ROLE[role]!] : [];
}

// The route of the broker each tool calls, and the kind of the ones that send.
// list_peers is not here: its answer is not a seq nor an event.
export const ROUTE_OF: Record<string, { path: string; kind?: "task" | "result" | "verdict" }> = {
  send_task: { path: "/send", kind: "task" },
  send_result: { path: "/send", kind: "result" },
  send_verdict: { path: "/send", kind: "verdict" },
  plan: { path: "/plan" },
  blocked: { path: "/blocked" },
  unblocked: { path: "/unblocked" },
  state: { path: "/state" },
  history: { path: "/history" },
  open_feature: { path: "/open-feature" },
  close_feature: { path: "/close-feature" },
};
