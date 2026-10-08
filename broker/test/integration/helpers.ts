import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const BROKER_DIR = join(import.meta.dir, "..", "..");

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "squad-test-"));
}

export function removeDir(dir: string) {
  // On Windows the SQLite files stay locked for a moment after the broker exits
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch {
    // leftover temp files are not a test failure
  }
}

export function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

export async function isUp(url: string): Promise<boolean> {
  try {
    return (await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) })).ok;
  } catch {
    return false;
  }
}

export async function waitFor(check: () => boolean | Promise<boolean>, what: string, ms = 8000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await check()) return;
    await Bun.sleep(50);
  }
  throw new Error(`timed out waiting for ${what}`);
}

// The environment of a child process, without the squad settings of whoever runs the tests.
// An empty value in `extra` removes the variable.
export function cleanEnv(extra: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...process.env, ...extra })) {
    if (value && (key in extra || !key.startsWith("SQUAD_"))) env[key] = value;
  }
  return env;
}

export async function post(url: string, path: string, body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

export async function get(url: string, path: string): Promise<{ status: number; json: any }> {
  const res = await fetch(`${url}${path}`);
  return { status: res.status, json: await res.json() };
}

// What the broker wrote, read straight from its database file
export function readDb(file: string) {
  const db = new Database(file, { readonly: true });
  try {
    const events = (db.query("SELECT * FROM events ORDER BY seq").all() as Record<string, any>[]).map((e) => ({
      ...e,
      data: JSON.parse(e.data),
    })) as Record<string, any>[];
    const peers = db.query("SELECT * FROM peers ORDER BY name").all() as Record<string, any>[];
    return { events, peers };
  } finally {
    db.close();
  }
}

// The deliveries the broker wrote, read straight from its database file
export function readDeliveries(file: string) {
  const db = new Database(file, { readonly: true });
  try {
    return db.query("SELECT * FROM deliveries ORDER BY event_seq, recipient").all() as {
      event_seq: number;
      recipient: string;
      acked_at: number | null;
    }[];
  } finally {
    db.close();
  }
}

// What /state answers about the feature `openFeature` opens, besides its id
export const FEATURE = {
  title: "the feature",
  workflow: "tlc",
  branch: "feat/x",
  base_branch: "main",
  spec_ref: ".specs/features/x/spec.md",
  spec_commit: "abc1234",
};

// Opens a feature by the route, as the mother of the id: the feature_opened takes a seq and
// waits for each of the other five. Returns the id of the feature.
export async function openFeature(url: string, motherId: string): Promise<number> {
  const { json } = await post(url, "/open-feature", { id: motherId, ...FEATURE });
  if (!json.ok) throw new Error(`the feature was not opened: ${json.error}`);
  return json.feature_id;
}

// A real broker process on a free port, over a database in a temp directory.
// The human credential goes to the same directory, never to the home of whoever runs the tests.
export async function startBroker(extraEnv: Record<string, string> = {}, dir = tempDir()) {
  const port = await freePort();
  const dbFile = join(dir, "squad.db");
  const tokenFile = join(dir, "squad.token");
  const url = `http://127.0.0.1:${port}`;
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "broker.ts")], {
    env: cleanEnv({ SQUAD_PORT: String(port), SQUAD_DB: dbFile, SQUAD_TOKEN_FILE: tokenFile, ...extraEnv }),
    stdio: ["ignore", "ignore", "ignore"],
  });
  await waitFor(() => isUp(url), "the broker to answer /health");

  async function stop() {
    proc.kill();
    await proc.exited;
    removeDir(dir);
  }

  return { url, port, dbFile, tokenFile, dir, proc, stop };
}

type Notification = { method: string; params?: any };
type ToolResult = { isError?: boolean; content: { text: string }[] };

export const PING_MS = 100;

const sessionCleanups: (() => Promise<void> | void)[] = [];

// Closes every session `startSession` started. For the afterEach of a test file, before the broker stops.
export async function closeSessions() {
  for (const cleanup of sessionCleanups.splice(0).reverse()) await cleanup();
}

// A real server.ts process driven by an MCP client over stdio, the way Claude Code drives it
export async function startSession(port: number, env: Record<string, string>, serverDir = BROKER_DIR) {
  const dir = tempDir();
  sessionCleanups.push(() => removeDir(dir));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(serverDir, "server.ts")],
    cwd: BROKER_DIR,
    // SQUAD_DB and SQUAD_TOKEN_FILE always set: a server that starts a broker by mistake must not
    // touch the real database nor the real human credential
    env: cleanEnv({
      SQUAD_PORT: String(port),
      SQUAD_DB: join(dir, "squad.db"),
      SQUAD_TOKEN_FILE: join(dir, "squad.token"),
      SQUAD_PING_INTERVAL_MS: String(PING_MS),
      ...env,
    }),
    stderr: "ignore",
  });
  const client = new Client({ name: "squad-test", version: "0.0.0" });
  const notifications: Notification[] = [];
  client.fallbackNotificationHandler = async (n) => {
    notifications.push(n as Notification);
  };
  await client.connect(transport);
  sessionCleanups.push(() => client.close());

  const channel = () => notifications.filter((n) => n.method === "notifications/claude/channel");
  const pings = () => channel().filter((n) => n.params.meta.kind === "ping");
  // What the channel pushed besides the ping: the events sent to the session
  const pushed = () => channel().filter((n) => n.params.meta.kind !== "ping");
  const toolNames = async () => (await client.listTools()).tools.map((t) => t.name);
  const ready = (number: number) => client.callTool({ name: "ready", arguments: { number } }) as Promise<ToolResult>;
  // The number the model would read in the ping
  async function pingNumber(): Promise<number> {
    await waitFor(() => pings().length > 0, "the first ping");
    return Number(pings()[0]!.params.meta.number);
  }
  // Answers the ping, as the model would, and fails if the broker refuses the session
  async function register() {
    const result = await ready(await pingNumber());
    if (result.isError) throw new Error(result.content[0]!.text);
  }
  // Calls a tool and returns its text and whether it is an error
  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = (await client.callTool({ name, arguments: args })) as ToolResult;
    return { isError: result.isError === true, text: result.content[0]!.text };
  }

  return { client, transport, notifications, pings, pushed, toolNames, ready, pingNumber, register, call };
}
