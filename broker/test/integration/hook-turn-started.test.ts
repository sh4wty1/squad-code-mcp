import { afterEach, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeSessions, freePort, readDb, removeDir, runHook, startBroker, startRecorder, startSession, tempDir } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;
const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  await closeSessions();
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  await broker?.stop();
  broker = undefined;
});

// What Claude Code writes to the standard input of a UserPromptSubmit hook
const PAYLOAD = JSON.stringify({
  session_id: "0b6f6c5e-5d0f-4a39-9b1c-2f1f4f6f8a11",
  transcript_path: "/home/dev/.claude/projects/repo/0b6f6c5e-5d0f-4a39-9b1c-2f1f4f6f8a11.jsonl",
  cwd: "/repo",
  hook_event_name: "UserPromptSubmit",
  prompt: "go on",
});

// The environment of the hooks of a session of worker-1 that speaks to `port`, over a database
// of its own; with `content`, its credential file has it
function worker(port: number, content?: string) {
  const dir = tempDir();
  cleanups.push(() => removeDir(dir));
  if (content !== undefined) writeFileSync(join(dir, "squad.db.worker-1.id"), content);
  return { SQUAD_NAME: "worker-1", SQUAD_ROLE: "worker", SQUAD_PORT: String(port), SQUAD_DB: join(dir, "squad.db") };
}

function recorder(...args: Parameters<typeof startRecorder>) {
  const server = startRecorder(...args);
  cleanups.push(server.stop);
  return server;
}

test("PAP-10: with the credential file of a registered session, the log gains exactly one turn_started of the name", async () => {
  broker = await startBroker();
  const env = worker(broker.port);
  // the MCP server of the session writes the file the hook reads
  const session = await startSession(broker.port, env);
  await session.register();

  const hook = await runHook("turn-started.ts", env, PAYLOAD);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(readDb(broker.dbFile).events.map((e) => [e.kind, e.from_name])).toEqual([
    ["peer_joined", "broker"],
    ["turn_started", "worker-1"],
  ]);
});

test("PAP-10: the hook makes a single POST /turn-started with the id of the file, without the spaces around it", async () => {
  const server = recorder();
  const hook = await runHook("turn-started.ts", worker(server.port, "  the-id-of-worker-1 \n"), PAYLOAD);
  expect(server.requests).toEqual([{ method: "POST", path: "/turn-started", body: { id: "the-id-of-worker-1" } }]);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});

test("PAP-12: without SQUAD_ROLE the hook calls nothing, writes nothing and exits 0", async () => {
  const server = recorder();
  const { SQUAD_ROLE, ...env } = worker(server.port, "the-id-of-worker-1");
  const hook = await runHook("turn-started.ts", env, PAYLOAD);
  expect(server.requests).toEqual([]);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});

test("PAP-12: without the credential file the hook calls nothing, writes nothing and exits 0", async () => {
  const server = recorder();
  const hook = await runHook("turn-started.ts", worker(server.port), PAYLOAD);
  expect(server.requests).toEqual([]);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});

test("PAP-13: with the broker down the hook exits 0 and writes nothing", async () => {
  const hook = await runHook("turn-started.ts", worker(await freePort(), "the-id-of-worker-1"), PAYLOAD);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});

test("PAP-13: with a credential the broker refuses the hook exits 0 and writes nothing", async () => {
  // a real broker answers unknown_peer to an id nobody has
  broker = await startBroker();
  const hook = await runHook("turn-started.ts", worker(broker.port, "an-id-nobody-has"), PAYLOAD);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(readDb(broker.dbFile).events).toEqual([]);
});

test("PAP-13: with a status 500 the hook exits 0 and writes nothing", async () => {
  const server = recorder(() => Response.json({ error: "boom" }, { status: 500 }));
  const hook = await runHook("turn-started.ts", worker(server.port, "the-id-of-worker-1"), PAYLOAD);
  expect(server.requests).toHaveLength(1);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
});

test("PAP-13: with a broker that does not answer the hook exits 0 in less than 4 s and writes nothing", async () => {
  const server = recorder(() => new Promise<Response>(() => {}));
  const hook = await runHook("turn-started.ts", worker(server.port, "the-id-of-worker-1"), PAYLOAD);
  expect(server.requests).toHaveLength(1);
  expect(hook.code).toBe(0);
  expect(hook.stdout).toBe("");
  expect(hook.ms).toBeLessThan(4000);
});
