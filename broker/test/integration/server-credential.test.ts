import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeSessions, post, readDb, removeDir, startBroker, startSession, tempDir, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;
const cleanups: (() => void)[] = [];

afterEach(async () => {
  await closeSessions();
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  await broker?.stop();
  broker = undefined;
});

// A session of worker-1 over a SQUAD_DB of its own, not the one of the broker, and the
// credential file that goes next to it
async function worker(b: Broker, env: Record<string, string> = {}) {
  const dir = tempDir();
  cleanups.push(() => removeDir(dir));
  const session = await startSession(b.port, {
    SQUAD_NAME: "worker-1",
    SQUAD_ROLE: "worker",
    SQUAD_DB: join(dir, "squad.db"),
    ...env,
  });
  return { session, dir, file: join(dir, "squad.db.worker-1.id") };
}

function kinds(b: Broker): string[] {
  return readDb(b.dbFile).events.map((e) => e.kind);
}

test("PAP-06: when ready answers, the credential file of the name has exactly the id the broker accepts", async () => {
  broker = await startBroker();
  const { session, file } = await worker(broker);
  const number = await session.pingNumber();
  expect(existsSync(file)).toBe(false);

  const result = await session.ready(number);
  expect(result.isError).toBeFalsy();
  // already there when the tool answers, with nothing around the id
  expect(existsSync(file)).toBe(true);
  const id = readFileSync(file, "utf8");

  const state = await post(broker.url, "/state", { id });
  expect(state.status).toBe(200);
  expect(state.json).toEqual({ feature: null, ticket: null, owed: [] });
  // and it is the credential of this name: what it sends is recorded as worker-1
  expect((await post(broker.url, "/turn-started", { id })).json.ok).toBe(true);
  expect(readDb(broker.dbFile).events.at(-1)).toMatchObject({ kind: "turn_started", from_name: "worker-1" });
});

// Windows has no file mode: the file is written the same way and only this is not checked
test.skipIf(process.platform === "win32")("PAP-06: the credential file has mode 0600", async () => {
  broker = await startBroker();
  const { session, file } = await worker(broker);
  await session.register();
  expect(statSync(file).mode & 0o777).toBe(0o600);
});

test("PAP-07: when the session closes after registering, its credential file is gone", async () => {
  broker = await startBroker();
  const b = broker;
  const { session, file } = await worker(b);
  await session.register();
  expect(existsSync(file)).toBe(true);

  // close() kills the server 2 s after closing stdin: the file has to go before that
  const closing = session.client.close();
  await waitFor(() => !existsSync(file), "the credential file to be deleted", 1500);
  await closing;
  expect(existsSync(file)).toBe(false);
  expect(kinds(b)).toEqual(["peer_joined", "peer_left"]);
});

test("PAP-08: with a directory where the credential file goes, ready registers the same way", async () => {
  broker = await startBroker();
  const { session, file } = await worker(broker);
  mkdirSync(file);

  const result = await session.ready(await session.pingNumber());
  expect(result.isError).toBeFalsy();
  expect(result.content[0]!.text).toBe("Registered in the squad as worker-1 (worker).");
  expect(readDb(broker.dbFile).events.map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "worker-1", role: "worker" }],
  ]);
  expect(await session.toolNames()).toContain("send_result");
  expect(statSync(file).isDirectory()).toBe(true);
});

test("PAP-08: with the credential file swapped for a directory that is not empty, the server records the peer_left and exits with 0", async () => {
  broker = await startBroker();
  const b = broker;
  const { session, file } = await worker(b);
  await session.register();
  rmSync(file);
  mkdirSync(file);
  writeFileSync(join(file, "kept"), "x");
  const pid = session.transport.pid!;

  const closing = session.client.close();
  await waitFor(() => readDb(b.dbFile).events.length === 2, "peer_left", 1500);
  expect(readDb(b.dbFile).events.map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "worker-1", role: "worker" }],
    ["peer_left", { peer: "worker-1", reason: "unregistered" }],
  ]);
  // by itself: close() kills the server 2 s after closing stdin
  expect(await Promise.race([session.exited, Bun.sleep(1500).then(() => "still running")])).toBe(0);
  await closing;
  expect(() => process.kill(pid, 0)).toThrow();
  expect(readFileSync(join(file, "kept"), "utf8")).toBe("x");
});

test("PAP-09: a registration refused for the name of another role writes no credential file", async () => {
  broker = await startBroker();
  const { session, dir } = await worker(broker, { SQUAD_NAME: "leader" });
  const result = await session.ready(await session.pingNumber());
  expect(result.isError).toBe(true);
  expect(result.content[0]!.text).toContain("invalid_name");
  expect(existsSync(join(dir, "squad.db.leader.id"))).toBe(false);
  expect(existsSync(join(dir, "squad.db.worker-1.id"))).toBe(false);

  await session.client.close();
  expect(existsSync(join(dir, "squad.db.leader.id"))).toBe(false);
});

test("PAP-09: a registration refused for a name in use writes no credential file", async () => {
  broker = await startBroker();
  await post(broker.url, "/register", { pid: process.pid, cwd: "/elsewhere", git_root: null, name: "worker-1", role: "worker" });
  const { session, file } = await worker(broker);
  const result = await session.ready(await session.pingNumber());
  expect(result.isError).toBe(true);
  expect(result.content[0]!.text).toContain("name_taken");
  expect(existsSync(file)).toBe(false);
});

test("PAP-09: a refused session leaves the credential file of the session that holds the name as it is", async () => {
  broker = await startBroker();
  const holder = await worker(broker);
  await holder.session.register();
  const id = readFileSync(holder.file, "utf8");

  // a second worker-1 over the same SQUAD_DB: the same credential file
  const second = await startSession(broker.port, {
    SQUAD_NAME: "worker-1",
    SQUAD_ROLE: "worker",
    SQUAD_DB: join(holder.dir, "squad.db"),
  });
  const result = await second.ready(await second.pingNumber());
  expect(result.isError).toBe(true);
  expect(result.content[0]!.text).toContain("name_taken");
  expect(readFileSync(holder.file, "utf8")).toBe(id);

  await second.client.close();
  expect(readFileSync(holder.file, "utf8")).toBe(id);
  expect((await post(broker.url, "/state", { id })).json).toEqual({ feature: null, ticket: null, owed: [] });
});
