import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

// Opens a feature the way the Feature slice will: a row with closed_seq NULL, written
// straight into the database file of a running broker. Returns its id.
export function openFeature(file: string): number {
  const db = new Database(file);
  try {
    db.run("PRAGMA busy_timeout = 3000");
    const result = db.run(
      `INSERT INTO features (project, title, workflow, branch, base_branch, spec_ref, spec_commit, opened_seq)
       VALUES ('/repo', ?, ?, ?, ?, ?, ?, 0)`,
      [FEATURE.title, FEATURE.workflow, FEATURE.branch, FEATURE.base_branch, FEATURE.spec_ref, FEATURE.spec_commit]
    );
    return Number(result.lastInsertRowid);
  } finally {
    db.close();
  }
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
