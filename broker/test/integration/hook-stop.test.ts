import { afterEach, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { freePort, openFeature, post, readDb, removeDir, runHook, startBroker, startRecorder, tempDir } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;
const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  await broker?.stop();
  broker = undefined;
});

const SESSION = "0b6f6c5e-5d0f-4a39-9b1c-2f1f4f6f8a11";

// An `assistant` line of a transcript. `counts` are input_tokens, output_tokens,
// cache_creation_input_tokens and cache_read_input_tokens.
function line(model: string, id: string, counts: number[]): string {
  const [input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens] = counts;
  return JSON.stringify({
    type: "assistant",
    uuid: `u-${id}`,
    message: {
      id,
      role: "assistant",
      model,
      content: [{ type: "text", text: "done" }],
      usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, service_tier: "standard" },
    },
  });
}

// The transcript of a session in a directory of its own, with a space in its path
function transcript(lines: string[], subagents: Record<string, string[]> = {}): string {
  const dir = join(tempDir(), "the project");
  cleanups.push(() => removeDir(join(dir, "..")));
  mkdirSync(join(dir, SESSION, "subagents"), { recursive: true });
  writeFileSync(join(dir, `${SESSION}.jsonl`), lines.join("\n") + "\n");
  for (const [name, own] of Object.entries(subagents)) writeFileSync(join(dir, SESSION, "subagents", name), own.join("\n") + "\n");
  return join(dir, `${SESSION}.jsonl`);
}

// sonnet comes first in the file and second in the alphabet. The second line of m3 is the
// one that counts, and the subagent adds to opus.
function twoModels(): string {
  return transcript(
    [
      JSON.stringify({ type: "user", message: { role: "user", content: "go" } }),
      line("claude-sonnet", "m1", [1, 2, 3, 4]),
      line("claude-opus", "m2", [10, 20, 30, 40]),
      line("claude-sonnet", "m3", [900, 900, 900, 900]),
      line("claude-sonnet", "m3", [100, 200, 300, 400]),
    ],
    { "agent-a.jsonl": [line("claude-opus", "a1", [5, 5, 5, 5])] }
  );
}

const OPUS = { input: 15, output: 25, cache_write: 35, cache_read: 45 };
const SONNET = { input: 101, output: 202, cache_write: 303, cache_read: 404 };
const ZERO = { input: 0, output: 0, cache_write: 0, cache_read: 0 };

// What Claude Code writes to the standard input of a Stop hook
function payload(fields: Record<string, unknown> = {}): string {
  return JSON.stringify({
    session_id: SESSION,
    cwd: "/repo",
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done",
    ...fields,
  });
}

// The environment of the hooks of a session of `name` that speaks to `port`, over a database
// of its own; with `id`, its credential file has it
function session(port: number, id?: string, name = "worker-1") {
  const dir = tempDir();
  cleanups.push(() => removeDir(dir));
  if (id !== undefined) writeFileSync(join(dir, `squad.db.${name}.id`), `${id}\n`);
  return { SQUAD_NAME: name, SQUAD_ROLE: "worker", SQUAD_PORT: String(port), SQUAD_DB: join(dir, "squad.db") };
}

function recorder(...args: Parameters<typeof startRecorder>) {
  const server = startRecorder(...args);
  cleanups.push(server.stop);
  return server;
}

async function register(b: Broker, name: string, pid: number): Promise<string> {
  const role = name.startsWith("worker") ? "worker" : name;
  return (await post(b.url, "/register", { pid, cwd: "/repo", git_root: null, name, role })).json.id;
}

// A real broker with worker-1 in it and nothing else: it owes nothing
async function alone() {
  broker = await startBroker();
  const worker = await register(broker, "worker-1", process.pid);
  return { b: broker, env: session(broker.port, worker) };
}

// A real broker with a feature open and the task of TKT-13 for worker-1, which is seq 6: one
// pid holds one registration, and the broker, this test and its parent are the three at hand
async function tasked() {
  broker = await startBroker();
  const mother = await register(broker, "mother", broker.proc.pid);
  await openFeature(broker.url, mother);
  const leader = await register(broker, "leader", process.ppid);
  const worker = await register(broker, "worker-1", process.pid);
  await post(broker.url, "/plan", { id: leader, tickets: [{ ticket_ref: "TKT-13", title: "the parser" }] });
  const task = await post(broker.url, "/send", { id: leader, kind: "task", to: "worker-1", summary: "do it", ticket_ref: "TKT-13", loadout: [] });
  expect(task.json).toEqual({ ok: true, seq: 6 });
  return { b: broker, worker, env: session(broker.port, worker) };
}

// The usage events of the log, in its order
function usages(b: Broker) {
  return readDb(b.dbFile)
    .events.filter((e) => e.kind === "usage")
    .map((e) => [e.from_name, e.data]);
}

test("PAP-23: the log gains one usage per model, in ascending order of the model, with the sums and the session_id of the payload", async () => {
  const { b, env } = await alone();
  const hook = await runHook("stop.ts", env, payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(usages(b)).toEqual([
    ["worker-1", { session_id: SESSION, model: "claude-opus", ...OPUS }],
    ["worker-1", { session_id: SESSION, model: "claude-sonnet", ...SONNET }],
  ]);
});

test("PAP-24: without the transcript the log gains a single usage of the model unknown with the four numbers 0", async () => {
  const { b, env } = await alone();
  // next to a transcript that is there, a path that is not
  const hook = await runHook("stop.ts", env, payload({ transcript_path: join(twoModels(), "..", "gone.jsonl") }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(usages(b)).toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]]);
});

test("PAP-21: without transcript_path in the payload the log gains a single usage of the model unknown with the four numbers 0", async () => {
  const { b, env } = await alone();
  const hook = await runHook("stop.ts", env, payload());
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(usages(b)).toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]]);
});

// 0 is the number of the standard input of the hook: a read of it is not a read of a transcript
test("PAP-21: with a transcript_path 0 the log gains a single usage of the model unknown with the four numbers 0", async () => {
  const { b, env } = await alone();
  const hook = await runHook("stop.ts", env, payload({ transcript_path: 0 }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(usages(b)).toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]]);
});

test("PAP-25: two runs over the same transcripts record the same numbers", async () => {
  const { b, env } = await alone();
  const input = payload({ transcript_path: twoModels() });
  await runHook("stop.ts", env, input);
  await runHook("stop.ts", env, input);
  const all = usages(b);
  expect(all).toHaveLength(4);
  expect(all.slice(2)).toEqual(all.slice(0, 2));
  expect(all[3]).toEqual(["worker-1", { session_id: SESSION, model: "claude-sonnet", ...SONNET }]);
});

test("PAP-26: a payload that is not JSON records a usage of the session_id unknown", async () => {
  const { b, env } = await alone();
  const hook = await runHook("stop.ts", env, "not json");
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(usages(b)).toEqual([["worker-1", { session_id: "unknown", model: "unknown", ...ZERO }]]);
});

test("PAP-26: a payload without a session_id records a usage of the session_id unknown, and its transcript is not read", async () => {
  const { b, env } = await alone();
  const transcript_path = twoModels();
  for (const session_id of [undefined, "", 7]) {
    const hook = await runHook("stop.ts", env, payload({ session_id, transcript_path }));
    expect([session_id, hook.code, hook.stdout]).toEqual([session_id, 0, ""]);
  }
  const unknown = ["worker-1", { session_id: "unknown", model: "unknown", ...ZERO }];
  expect(usages(b)).toEqual([unknown, unknown, unknown]);
});

test("PAP-27: with /usage refused the hook exits 0 and writes nothing", async () => {
  // a real broker answers unknown_peer to an id nobody has
  broker = await startBroker();
  const hook = await runHook("stop.ts", session(broker.port, "an-id-nobody-has"), payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(readDb(broker.dbFile).events).toEqual([]);
});

test("PAP-27: with a status 500 for /usage the hook exits 0 and writes nothing", async () => {
  const server = recorder((request) =>
    request.method === "GET" ? Response.json({ events: [], last_seq: 0 }) : Response.json({ error: "boom" }, { status: 500 })
  );
  const hook = await runHook("stop.ts", session(server.port, "the-id-of-worker-1"), payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  // every model was tried
  expect(server.requests.map((r) => [r.method, r.path])).toEqual([
    ["GET", "/events?after=0"],
    ["POST", "/usage"],
    ["POST", "/usage"],
  ]);
});

test("PAP-27: with the broker down the hook exits 0 and writes nothing", async () => {
  const hook = await runHook("stop.ts", session(await freePort(), "the-id-of-worker-1"), payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});

test("PAP-28: with a task owed the hook writes exactly the block with the ticket and the seq, and records no usage", async () => {
  const { b, env } = await tasked();
  const before = readDb(b.dbFile).events.length;
  const hook = await runHook("stop.ts", env, payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(JSON.parse(hook.stdout)).toEqual({
    decision: "block",
    reason:
      "You are ending the turn and still owe the squad the result of ticket TKT-13, for the task of seq 6. Finish it and send it with send_result. If you cannot go on, ask a question with ask or call blocked.",
  });
  // one object and nothing else
  expect(hook.stdout.trim().split("\n")).toHaveLength(1);
  expect(usages(b)).toEqual([]);
  expect(readDb(b.dbFile).events).toHaveLength(before);
});

test("PAP-28: a stop_hook_active that is not true blocks as one that is false", async () => {
  const { b, env } = await tasked();
  for (const stop_hook_active of [undefined, "true", 1]) {
    const hook = await runHook("stop.ts", env, payload({ stop_hook_active, transcript_path: twoModels() }));
    expect([stop_hook_active, hook.code, JSON.parse(hook.stdout).decision]).toEqual([stop_hook_active, 0, "block"]);
  }
  expect(usages(b)).toEqual([]);
});

test("PAP-30: with stop_hook_active true and a task owed the hook writes nothing and records the usage", async () => {
  const { b, env } = await tasked();
  const hook = await runHook("stop.ts", env, payload({ stop_hook_active: true, transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(usages(b)).toEqual([
    ["worker-1", { session_id: SESSION, model: "claude-opus", ...OPUS }],
    ["worker-1", { session_id: SESSION, model: "claude-sonnet", ...SONNET }],
  ]);
});

test("PAP-30: with stop_hook_active true the hook does not read /events, and sends each usage whole", async () => {
  const server = recorder();
  const hook = await runHook("stop.ts", session(server.port, "the-id-of-worker-1"), payload({ stop_hook_active: true, transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(server.requests).toEqual([
    { method: "POST", path: "/usage", body: { id: "the-id-of-worker-1", session_id: SESSION, model: "claude-opus", ...OPUS } },
    { method: "POST", path: "/usage", body: { id: "the-id-of-worker-1", session_id: SESSION, model: "claude-sonnet", ...SONNET } },
  ]);
});

test("PAP-31: with /events not answered in 2000 ms the hook does not block and sends the usage", async () => {
  const server = recorder((request) => (request.method === "GET" ? new Promise<Response>(() => {}) : Response.json({ ok: true, seq: 1 })));
  const hook = await runHook("stop.ts", session(server.port, "the-id-of-worker-1"), payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(server.requests.map((r) => [r.method, r.path])).toEqual([
    ["GET", "/events?after=0"],
    ["POST", "/usage"],
    ["POST", "/usage"],
  ]);
  expect(hook.ms).toBeGreaterThanOrEqual(2000);
  expect(hook.ms).toBeLessThan(4500);
});

for (const [called, answer] of [
  ["an object without events", () => Response.json({ ok: true })],
  ["events that are not a list", () => Response.json({ events: "none", last_seq: 0 })],
  ["a refusal", () => Response.json({ ok: false, error: "invalid_field", hint: "after must be an integer of zero or more." })],
  ["a text that is not JSON", () => new Response("squad broker")],
] as const) {
  test(`PAP-31: with ${called} for /events the hook does not block and sends the usage`, async () => {
    const server = recorder((request) => (request.method === "GET" ? answer() : Response.json({ ok: true, seq: 1 })));
    const hook = await runHook("stop.ts", session(server.port, "the-id-of-worker-1"), payload({ transcript_path: twoModels() }));
    expect(hook.code).toBe(0);
    expect(hook.stdout).toBe("");
    expect(server.requests).toEqual([
      { method: "GET", path: "/events?after=0", body: null },
      { method: "POST", path: "/usage", body: { id: "the-id-of-worker-1", session_id: SESSION, model: "claude-opus", ...OPUS } },
      { method: "POST", path: "/usage", body: { id: "the-id-of-worker-1", session_id: SESSION, model: "claude-sonnet", ...SONNET } },
    ]);
  });
}

// 201 is a status of success that is not 200
for (const status of [500, 201]) {
  test(`PAP-31: with a status ${status} for /events the hook does not block and sends the usage, even with a log in which the worker owes a result`, async () => {
    // the log of a real broker where worker-1 owes the result of TKT-13, answered with another status
    const { b, worker } = await tasked();
    const server = recorder(async (request) =>
      request.method === "GET"
        ? Response.json(await (await fetch(`${b.url}${request.path}`)).json(), { status })
        : Response.json({ ok: true, seq: 1 })
    );
    const hook = await runHook("stop.ts", session(server.port, worker), payload({ transcript_path: twoModels() }));
    expect(hook.code).toBe(0);
    expect(hook.stdout).toBe("");
    expect(server.requests).toEqual([
      { method: "GET", path: "/events?after=0", body: null },
      { method: "POST", path: "/usage", body: { id: worker, session_id: SESSION, model: "claude-opus", ...OPUS } },
      { method: "POST", path: "/usage", body: { id: worker, session_id: SESSION, model: "claude-sonnet", ...SONNET } },
    ]);
  });
}

test("PAP-32: the worker that declared blocked with its task still owed is not blocked and records the usage", async () => {
  const { b, worker, env } = await tasked();
  const declared = await post(b.url, "/blocked", { id: worker, ticket_ref: "TKT-13", reason: "missing credential", detail: "no API key", last_action: "ran the tests" });
  expect(declared.json.ok).toBe(true);

  const hook = await runHook("stop.ts", env, payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(usages(b)).toEqual([
    ["worker-1", { session_id: SESSION, model: "claude-opus", ...OPUS }],
    ["worker-1", { session_id: SESSION, model: "claude-sonnet", ...SONNET }],
  ]);
});

test("PAP-22: with a SQUAD_NAME that is not of the squad the hook does not block and sends the usage", async () => {
  // the log of a real broker where worker-1 owes a result, read as worker-9
  const { b } = await tasked();
  const server = recorder(async (request) =>
    request.method === "GET" ? Response.json(await (await fetch(`${b.url}${request.path}`)).json()) : Response.json({ ok: true, seq: 1 })
  );
  const hook = await runHook("stop.ts", session(server.port, "the-id-of-worker-9", "worker-9"), payload({ transcript_path: twoModels() }));
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(server.requests).toEqual([
    { method: "GET", path: "/events?after=0", body: null },
    { method: "POST", path: "/usage", body: { id: "the-id-of-worker-9", session_id: SESSION, model: "claude-opus", ...OPUS } },
    { method: "POST", path: "/usage", body: { id: "the-id-of-worker-9", session_id: SESSION, model: "claude-sonnet", ...SONNET } },
  ]);
});

test("PAP-12: without SQUAD_ROLE the hook calls nothing, writes nothing and exits 0", async () => {
  const server = recorder();
  const { SQUAD_ROLE, ...env } = session(server.port, "the-id-of-worker-1");
  const hook = await runHook("stop.ts", env, payload({ transcript_path: twoModels() }));
  expect(server.requests).toEqual([]);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});

test("PAP-12: without the credential file the hook calls nothing, writes nothing and exits 0", async () => {
  const server = recorder();
  const hook = await runHook("stop.ts", session(server.port), payload({ transcript_path: twoModels() }));
  expect(server.requests).toEqual([]);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});
