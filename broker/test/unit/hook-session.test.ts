import { afterAll, afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, credential, payload } from "../../../plugin/hooks/session.ts";

const root = mkdtempSync(join(tmpdir(), "squad-hook-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const ID = "3f2c9a52-7d1e-4c8b-9a60-0e5b6f1d2c3a";

let cases = 0;

// The environment of a session of worker-1 over a database of its own, and its credential
// file with `content`; no file when `content` is not given
function session(content?: string) {
  const dir = join(root, `case-${cases++}`);
  mkdirSync(dir);
  const file = join(dir, "squad.db.worker-1.id");
  if (content !== undefined) writeFileSync(file, content);
  return { env: { SQUAD_NAME: "worker-1", SQUAD_ROLE: "worker", SQUAD_DB: join(dir, "squad.db") }, dir, file };
}

test("PAP-20: the credential is the content of the credential file of the name", () => {
  expect(credential(session(ID).env)).toBe(ID);
});

test("PAP-20: spaces and line breaks around the credential in its file are left out", () => {
  expect(credential(session(`  ${ID}\n`).env)).toBe(ID);
  expect(credential(session(`\r\n\t${ID} \r\n`).env)).toBe(ID);
});

test("PAP-20: the credential file read is the one of SQUAD_NAME", () => {
  const { env, dir } = session(ID);
  writeFileSync(join(dir, "squad.db.judge.id"), "the-id-of-the-judge");
  expect(credential({ ...env, SQUAD_NAME: "judge", SQUAD_ROLE: "judge" })).toBe("the-id-of-the-judge");
});

test("PAP-12: without SQUAD_ROLE there is no credential, whatever the file has", () => {
  const { env } = session(ID);
  expect(credential({ SQUAD_NAME: env.SQUAD_NAME, SQUAD_DB: env.SQUAD_DB })).toBeNull();
});

test("PAP-12: with an empty SQUAD_ROLE there is no credential, whatever the file has", () => {
  expect(credential({ ...session(ID).env, SQUAD_ROLE: "" })).toBeNull();
});

test("PAP-12: without the credential file there is no credential", () => {
  expect(credential(session().env)).toBeNull();
});

test("PAP-12: with an empty credential file there is no credential", () => {
  expect(credential(session("").env)).toBeNull();
});

test("PAP-12: with a credential file of spaces and line breaks only there is no credential", () => {
  expect(credential(session(" \n\t\r\n ").env)).toBeNull();
});

type Request = { method: string; path: string; type: string | null; body: string };

const servers: { stop: (force: boolean) => unknown }[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop(true);
});

// A server that answers every request with `answer` and keeps what it received
function serve(answer: () => Response | Promise<Response>) {
  const requests: Request[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      requests.push({ method: req.method, path: url.pathname + url.search, type: req.headers.get("content-type"), body: await req.text() });
      return answer();
    },
  });
  servers.push(server);
  return { requests, env: { SQUAD_PORT: String(server.port) } };
}

test("PAP-10: call sends one POST with the body as JSON and gives the body of a 200", async () => {
  const { requests, env } = serve(() => Response.json({ ok: true, seq: 41 }));
  expect(await call("/turn-started", { id: ID }, env)).toEqual({ ok: true, seq: 41 });
  expect(requests).toHaveLength(1);
  expect(requests[0]!.method).toBe("POST");
  expect(requests[0]!.path).toBe("/turn-started");
  expect(requests[0]!.type).toContain("application/json");
  expect(JSON.parse(requests[0]!.body)).toEqual({ id: ID });
});

test("PAP-13: call gives null for a status that is not 200, whatever the body", async () => {
  for (const status of [500, 404, 201]) {
    const { requests, env } = serve(() => Response.json({ ok: true, seq: 41 }, { status }));
    expect([status, await call("/turn-started", { id: ID }, env)]).toEqual([status, null]);
    expect(requests).toHaveLength(1);
  }
});

test("PAP-13: call gives null for a refusal, which is a 200 with ok false", async () => {
  const { requests, env } = serve(() =>
    Response.json({ ok: false, error: "unknown_peer", hint: "This id is not registered. Register again and use the id that comes back." })
  );
  expect(await call("/turn-started", { id: ID }, env)).toBeNull();
  expect(requests).toHaveLength(1);
});

test("PAP-13: call gives null for a 200 whose body is not JSON", async () => {
  const { env } = serve(() => new Response("squad broker"));
  expect(await call("/turn-started", { id: ID }, env)).toBeNull();
});

test("PAP-13: call gives null when nobody listens on the port", async () => {
  const { env } = serve(() => Response.json({ ok: true }));
  await servers.pop()!.stop(true);
  expect(await call("/turn-started", { id: ID }, env)).toBeNull();
});

test("PAP-13: call gives up on a server that does not answer after 2000 ms", async () => {
  // never answers
  const { requests, env } = serve(() => new Promise<Response>(() => {}));
  const started = performance.now();
  const answer = await call("/turn-started", { id: ID }, env);
  const took = performance.now() - started;
  expect(answer).toBeNull();
  expect(requests).toHaveLength(1);
  expect(took).toBeGreaterThanOrEqual(2000);
  expect(took).toBeLessThan(3500);
});

test("PAP-13: call gives up on a server that answers the status and never ends the body", async () => {
  const { env } = serve(() => new Response(new ReadableStream({ start: (stream) => stream.enqueue(new TextEncoder().encode('{"ok":')) })));
  const started = performance.now();
  expect(await call("/usage", { id: ID }, env)).toBeNull();
  expect(performance.now() - started).toBeLessThan(3500);
});

test("PAP-26: the payload of a hook is the object of its JSON", () => {
  expect(payload('{"session_id":"s1","stop_hook_active":false,"transcript_path":"/tmp/a b/s1.jsonl"}')).toEqual({
    session_id: "s1",
    stop_hook_active: false,
    transcript_path: "/tmp/a b/s1.jsonl",
  });
  expect(payload("{}")).toEqual({});
});

for (const [text, called] of [
  ["not json", "a text that is not JSON"],
  ['["session_id"]', "a list"],
  ["12", "a number"],
  ["null", "null"],
  ["", "an empty text"],
] as const) {
  test(`PAP-26: the payload of ${called} is an empty object`, () => {
    expect(payload(text)).toEqual({});
  });
}
