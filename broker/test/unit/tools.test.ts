import { expect, test } from "bun:test";
import { LIST_PEERS_TOOL, ROUTE_OF, toolsFor } from "../../tools.ts";

const names = (role: string) => toolsFor(role).map((t) => t.name);

const COMMON = ["list_peers", "state", "history", "blocked", "unblocked"];

function tool(role: string, name: string) {
  const found = toolsFor(role).find((t) => t.name === name);
  if (!found) throw new Error(`${role} has no ${name}`);
  return found;
}

test("EVT-89/FEAT-29: the mother has the common tools, send_task, open_feature and close_feature, and no other", () => {
  expect(names("mother")).toEqual([...COMMON, "send_task", "open_feature", "close_feature"]);
});

test("FEAT-29: no other role has open_feature or close_feature", () => {
  for (const role of ["leader", "worker", "judge"]) {
    expect(names(role)).not.toContain("open_feature");
    expect(names(role)).not.toContain("close_feature");
  }
});

test("FEAT-29: open_feature requires the six fields of a feature, and workflow is tlc or matt-pocock", () => {
  const schema = tool("mother", "open_feature").inputSchema as any;
  const fields = ["title", "workflow", "branch", "base_branch", "spec_ref", "spec_commit"];
  expect(schema.type).toBe("object");
  expect(Object.keys(schema.properties)).toEqual(fields);
  for (const field of fields) expect(schema.properties[field].type).toBe("string");
  expect(schema.properties.workflow.enum).toEqual(["tlc", "matt-pocock"]);
  expect(schema.required).toEqual(fields);
});

test("FEAT-29: close_feature requires only outcome, which is delivered or abandoned, and takes a body", () => {
  const schema = tool("mother", "close_feature").inputSchema as any;
  expect(schema.type).toBe("object");
  expect(Object.keys(schema.properties)).toEqual(["outcome", "body"]);
  expect(schema.properties.outcome).toMatchObject({ type: "string", enum: ["delivered", "abandoned"] });
  expect(schema.properties.body.type).toBe("string");
  expect(schema.required).toEqual(["outcome"]);
});

test("EVT-89: the leader has the common tools, plan, send_task and send_result, and no other", () => {
  expect(names("leader")).toEqual([...COMMON, "plan", "send_task", "send_result"]);
});

test("EVT-89: a worker has the common tools and send_result, and no other", () => {
  expect(names("worker")).toEqual([...COMMON, "send_result"]);
});

test("EVT-89: the judge has the common tools and send_verdict, and no other", () => {
  expect(names("judge")).toEqual([...COMMON, "send_verdict"]);
});

test("EVT-89: a role that does not exist has no tools", () => {
  for (const role of ["", "boss", "human", "broker", "worker-1", "Mother", "toString", "constructor", "__proto__"]) {
    expect(toolsFor(role)).toEqual([]);
  }
});

test("EVT-89: list_peers is the tool the Peer slice listed", () => {
  expect(toolsFor("judge")[0]).toBe(LIST_PEERS_TOOL);
  expect(LIST_PEERS_TOOL.inputSchema).toEqual({ type: "object", properties: {} });
});

test("EVT-90: send_task declares the envelope and the fields of a task", () => {
  for (const role of ["mother", "leader"]) {
    const schema = tool(role, "send_task").inputSchema as any;
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties)).toEqual(["to", "summary", "body", "ticket_ref", "loadout", "criteria"]);
    expect(schema.properties.to.type).toBe("string");
    expect(schema.properties.summary.type).toBe("string");
    expect(schema.properties.body.type).toBe("string");
    expect(schema.properties.ticket_ref.type).toBe("string");
    expect(schema.properties.loadout).toMatchObject({ type: "array", items: { type: "string" } });
    expect(schema.properties.criteria).toMatchObject({ type: "array", items: { type: "integer" } });
    // the task of the mother has no ticket: only the envelope is required of both
    expect(schema.required).toEqual(["to", "summary"]);
  }
});

test("EVT-90: send_result declares the envelope and the fields of a result", () => {
  for (const role of ["leader", "worker"]) {
    const schema = tool(role, "send_result").inputSchema as any;
    expect(Object.keys(schema.properties)).toEqual(["to", "summary", "body", "ticket_ref", "task_seq", "branch", "commit"]);
    expect(schema.properties.ticket_ref.type).toBe("string");
    expect(schema.properties.task_seq.type).toBe("integer");
    expect(schema.properties.branch.type).toBe("string");
    expect(schema.properties.commit.type).toBe("string");
    // the result of the leader has no ticket
    expect(schema.required).toEqual(["to", "summary"]);
  }
});

test("EVT-90: send_verdict declares the envelope and the fields of a verdict", () => {
  const schema = tool("judge", "send_verdict").inputSchema as any;
  expect(Object.keys(schema.properties)).toEqual(["to", "summary", "body", "ticket_ref", "result_seq", "outcome", "criteria"]);
  expect(schema.properties.ticket_ref.type).toBe("string");
  expect(schema.properties.result_seq.type).toBe("integer");
  expect(schema.properties.outcome).toMatchObject({ type: "string", enum: ["approve", "rework"] });
  expect(schema.properties.criteria.type).toBe("array");
  const item = schema.properties.criteria.items;
  expect(Object.keys(item.properties)).toEqual(["n", "text", "pass", "note"]);
  expect(item.properties.n.type).toBe("integer");
  expect(item.properties.text.type).toBe("string");
  expect(item.properties.pass.type).toBe("boolean");
  expect(item.properties.note.type).toBe("string");
  expect(item.required).toEqual(["n", "text", "pass"]);
  expect(schema.required).toEqual(["to", "summary", "ticket_ref", "result_seq", "outcome", "criteria"]);
});

test("EVT-92: plan, blocked and history declare the fields of their routes", () => {
  const plan = tool("leader", "plan").inputSchema as any;
  expect(Object.keys(plan.properties)).toEqual(["tickets"]);
  expect(Object.keys(plan.properties.tickets.items.properties)).toEqual(["ticket_ref", "title", "depends_on", "dropped"]);
  expect(plan.properties.tickets.items.required).toEqual(["ticket_ref", "title"]);
  expect(plan.required).toEqual(["tickets"]);

  const blocked = tool("worker", "blocked").inputSchema as any;
  expect(Object.keys(blocked.properties).sort()).toEqual(["detail", "last_action", "reason", "ticket_ref"]);
  expect(blocked.required).toEqual(["reason", "detail", "last_action"]);

  const history = tool("worker", "history").inputSchema as any;
  expect(Object.keys(history.properties)).toEqual(["ticket_ref", "question_id", "gate_id"]);
  expect(history.properties.question_id.type).toBe("integer");
  expect(history.properties.gate_id.type).toBe("integer");
  // exactly one of the three: none is required by itself
  expect(history.required).toBeUndefined();
});

test("EVT-90/92: each tool but list_peers has its route, and each tool that sends its kind", () => {
  expect(ROUTE_OF).toEqual({
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
  });
  const listed = new Set(["mother", "leader", "worker", "judge"].flatMap(names));
  expect([...listed].sort()).toEqual(["list_peers", ...Object.keys(ROUTE_OF)].sort());
});
