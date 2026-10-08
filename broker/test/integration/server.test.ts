import { afterEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { getGitRoot } from "../../shared/git.ts";
import {
  BROKER_DIR,
  PING_MS,
  cleanEnv,
  closeSessions,
  freePort,
  isUp,
  post,
  readDb,
  removeDir,
  startBroker,
  startSession,
  tempDir,
  waitFor,
} from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;
const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  await closeSessions();
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  await broker?.stop();
  broker = undefined;
});

function registerOverHttp(b: Broker, name: string, role: string, pid: number) {
  return post(b.url, "/register", { pid, cwd: "/elsewhere", git_root: null, name, role });
}

test("PEER-26: without SQUAD_ROLE the server lists no tools, sends no ping and stays away from the broker", async () => {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const session = await startSession(port, { SQUAD_NAME: "leader" });
  expect(await session.toolNames()).toEqual([]);
  await Bun.sleep(PING_MS * 4);
  expect(session.pings()).toEqual([]);
  // with a role it would have started the broker on this port to register
  expect(await isUp(url)).toBe(false);
});

test("PEER-27: with name and role the server pings through the channel, lists only ready and does not register", async () => {
  broker = await startBroker();
  const session = await startSession(broker.port, { SQUAD_NAME: "leader", SQUAD_ROLE: "leader" });
  const number = await session.pingNumber();
  const ping = session.pings()[0]!;
  expect(ping.method).toBe("notifications/claude/channel");
  expect(Number.isInteger(number)).toBe(true);
  expect(number).toBeGreaterThanOrEqual(100000);
  expect(number).toBeLessThanOrEqual(999999);
  expect(ping.params.meta.number).toBe(String(number));
  expect(ping.params.content).toContain(String(number));
  expect(await session.toolNames()).toEqual(["ready"]);
  expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] });
});

test("PEER-28: until ready is called the same ping is sent again on the interval", async () => {
  broker = await startBroker();
  const session = await startSession(broker.port, { SQUAD_NAME: "judge", SQUAD_ROLE: "judge" });
  const started = Date.now();
  await waitFor(() => session.pings().length >= 4, "four pings");
  // the first ping is immediate, the next three are one interval apart
  expect(Date.now() - started).toBeGreaterThanOrEqual(PING_MS * 2);
  const numbers = new Set(session.pings().map((p) => p.params.meta.number));
  expect(numbers.size).toBe(1);
  expect(readDb(broker.dbFile).peers).toEqual([]);
});

test("PEER-28: without SQUAD_PING_INTERVAL_MS the ping does not repeat before 10 s", async () => {
  broker = await startBroker();
  const session = await startSession(broker.port, {
    SQUAD_NAME: "judge",
    SQUAD_ROLE: "judge",
    SQUAD_PING_INTERVAL_MS: "",
  });
  await session.pingNumber();
  await Bun.sleep(1500);
  expect(session.pings()).toHaveLength(1);
});

test("PEER-29: ready with another number is an error, registers nothing and the ping goes on", async () => {
  broker = await startBroker();
  const session = await startSession(broker.port, { SQUAD_NAME: "leader", SQUAD_ROLE: "leader" });
  const number = await session.pingNumber();
  const result = await session.ready(number + 1);
  expect(result.isError).toBe(true);
  // no arguments at all is a wrong number too, not a protocol error
  const bare = (await session.client.callTool({ name: "ready" })) as { isError?: boolean };
  expect(bare.isError).toBe(true);
  expect(await session.toolNames()).toEqual(["ready"]);
  expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] });
  const sent = session.pings().length;
  await waitFor(() => session.pings().length > sent, "another ping after the wrong number");
});

test("PEER-30: ready with the ping number registers the session and swaps ready for the role tools", async () => {
  broker = await startBroker();
  const session = await startSession(broker.port, { SQUAD_NAME: "worker-2", SQUAD_ROLE: "worker" });
  const result = await session.ready(await session.pingNumber());
  expect(result.isError).toBeFalsy();

  const { peers, events } = readDb(broker.dbFile);
  expect(peers).toHaveLength(1);
  expect(peers[0]!.name).toBe("worker-2");
  expect(peers[0]!.role).toBe("worker");
  expect(peers[0]!.pid).toBe(session.transport.pid!);
  expect(peers[0]!.cwd).toBe(BROKER_DIR);
  expect(peers[0]!.git_root).toBe(await getGitRoot(BROKER_DIR));
  expect(events.map((e) => [e.kind, e.data])).toEqual([["peer_joined", { peer: "worker-2", role: "worker" }]]);

  await waitFor(
    () => session.notifications.some((n) => n.method === "notifications/tools/list_changed"),
    "tools/list_changed"
  );
  // the tools of a worker since the Event slice (EVT-89)
  expect(await session.toolNames()).toEqual(["list_peers", "state", "history", "blocked", "unblocked", "send_result"]);

  const sent = session.pings().length;
  await Bun.sleep(PING_MS * 4);
  expect(session.pings().length).toBe(sent);
});

test("PEER-31: when the broker refuses, ready answers the error and the hint, keeps only ready and stops the ping", async () => {
  broker = await startBroker();
  await registerOverHttp(broker, "leader", "leader", process.pid);
  const refusal = (await registerOverHttp(broker, "leader", "leader", process.ppid)).json;
  expect(refusal.error).toBe("role_taken");

  const session = await startSession(broker.port, { SQUAD_NAME: "leader", SQUAD_ROLE: "leader" });
  const result = await session.ready(await session.pingNumber());
  expect(result.isError).toBe(true);
  expect(result.content[0]!.text).toContain("role_taken");
  expect(result.content[0]!.text).toContain(refusal.hint);
  expect(await session.toolNames()).toEqual(["ready"]);
  expect(readDb(broker.dbFile).peers.map((p) => p.pid)).toEqual([process.pid]);

  const sent = session.pings().length;
  await Bun.sleep(PING_MS * 4);
  expect(session.pings().length).toBe(sent);
});

test("PEER-32: list_peers answers name, role and online or offline of the others, and no id", async () => {
  broker = await startBroker();
  const leader = (await registerOverHttp(broker, "leader", "leader", process.pid)).json;
  const session = await startSession(broker.port, { SQUAD_NAME: "mother", SQUAD_ROLE: "mother" });
  await session.ready(await session.pingNumber());

  const result = (await session.client.callTool({ name: "list_peers", arguments: {} })) as {
    isError?: boolean;
    content: { text: string }[];
  };
  expect(result.isError).toBeFalsy();
  const lines = result.content[0]!.text.split("\n");
  expect(lines).toContain("leader (leader): online");
  expect(lines).toContain("judge (judge): offline");
  expect(lines).toContain("worker-1 (worker): offline");
  expect(lines).toContain("worker-2 (worker): offline");
  expect(lines).toContain("worker-3 (worker): offline");
  expect(lines.some((line) => line.startsWith("mother"))).toBe(false);
  const mother = readDb(broker.dbFile).peers.find((p) => p.name === "mother")!;
  expect(result.content[0]!.text).not.toContain(leader.id);
  expect(result.content[0]!.text).not.toContain(mother.id);
});

test("PEER-33: when the session closes its stdin the server unregisters", async () => {
  broker = await startBroker();
  const session = await startSession(broker.port, { SQUAD_NAME: "judge", SQUAD_ROLE: "judge" });
  await session.ready(await session.pingNumber());
  expect(readDb(broker.dbFile).peers.map((p) => p.name)).toEqual(["judge"]);

  // close() sends SIGTERM 2 s after closing stdin; the unregister has to come from the stdin close alone
  const closing = session.client.close();
  const b = broker;
  await waitFor(() => readDb(b.dbFile).events.length === 2, "peer_left", 1500);
  await closing;
  const { peers, events } = readDb(b.dbFile);
  expect(peers).toEqual([]);
  expect(events.map((e) => [e.kind, e.data])).toEqual([
    ["peer_joined", { peer: "judge", role: "judge" }],
    ["peer_left", { peer: "judge", reason: "unregistered" }],
  ]);
});

test("PEER-34: the server starts the broker from a path with a space, and the broker outlives it", async () => {
  // A copy of the fork under a directory with a space in its name
  const dir = tempDir();
  const copy = join(dir, "squad fork");
  mkdirSync(copy);
  for (const file of [
    "server.ts",
    "broker.ts",
    "cli.ts",
    "db.ts",
    "peers.ts",
    "log.ts",
    "send.ts",
    "plan.ts",
    "feature.ts",
    "session.ts",
    "permission.ts",
    "state.ts",
    "tools.ts",
    "delivery.ts",
    "shared",
    "package.json",
  ]) {
    cpSync(join(BROKER_DIR, file), join(copy, file), { recursive: true });
  }
  symlinkSync(join(BROKER_DIR, "node_modules"), join(copy, "node_modules"), "junction");

  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const env = { SQUAD_PORT: String(port), SQUAD_DB: join(dir, "squad.db") };
  cleanups.push(async () => {
    const kill = Bun.spawn([process.execPath, join(BROKER_DIR, "cli.ts"), "kill-broker"], {
      env: cleanEnv(env),
      stdio: ["ignore", "ignore", "ignore"],
    });
    await kill.exited;
    await waitFor(async () => !(await isUp(url)), "the broker to stop");
    removeDir(dir);
  });

  expect(await isUp(url)).toBe(false);
  const session = await startSession(port, { ...env, SQUAD_NAME: "mother", SQUAD_ROLE: "mother" }, copy);
  expect(await isUp(url)).toBe(true);
  if (process.platform !== "win32") {
    // Detached: the broker leads its own process group. On POSIX a child outlives its parent either way.
    const text = (cmd: string[]) => Bun.spawnSync(cmd).stdout.toString().trim();
    const brokerPid = text(["lsof", "-ti", `tcp@127.0.0.1:${port}`, "-sTCP:LISTEN"]);
    expect(text(["ps", "-o", "pgid=", "-p", brokerPid])).toBe(brokerPid);
  }

  const serverPid = session.transport.pid!;
  await session.client.close();
  await waitFor(() => {
    try {
      process.kill(serverPid, 0);
      return false;
    } catch {
      return true;
    }
  }, "the server process to exit");
  await Bun.sleep(500);
  expect(await isUp(url)).toBe(true);
});

test("PEER-27: each server process generates its own ping number", async () => {
  broker = await startBroker();
  const numbers = new Set<number>();
  for (const name of ["mother", "leader", "judge"]) {
    const session = await startSession(broker.port, { SQUAD_NAME: name, SQUAD_ROLE: name });
    numbers.add(await session.pingNumber());
  }
  expect(numbers.size).toBeGreaterThan(1);
});

test("PEER-40: a tool that is not listed cannot be called", async () => {
  broker = await startBroker();
  // The message of the error a call ends with, or "answered" if the server ran the tool
  const call = (s: Awaited<ReturnType<typeof startSession>>, name: string, number = 0) =>
    s.client.callTool({ name, arguments: { number } }).then(
      () => "answered",
      (e) => String(e)
    );

  const plain = await startSession(broker.port, {});
  expect(await call(plain, "ready")).toContain("Unknown tool: ready");
  expect(await call(plain, "list_peers")).toContain("Unknown tool: list_peers");

  const session = await startSession(broker.port, { SQUAD_NAME: "leader", SQUAD_ROLE: "leader" });
  const number = await session.pingNumber();
  expect(await call(session, "list_peers")).toContain("Unknown tool: list_peers");
  expect(readDb(broker.dbFile)).toEqual({ events: [], peers: [] });

  await session.ready(number);
  expect(await call(session, "ready", number)).toContain("Unknown tool: ready");
  expect(readDb(broker.dbFile).events).toHaveLength(1);
});

test("PEER-46: a registered session sends a heartbeat on the interval", async () => {
  broker = await startBroker();
  const b = broker;
  const session = await startSession(b.port, {
    SQUAD_NAME: "judge",
    SQUAD_ROLE: "judge",
    SQUAD_HEARTBEAT_INTERVAL_MS: "100",
  });
  expect((await session.ready(await session.pingNumber())).isError).toBeFalsy();
  const { registered_at } = readDb(b.dbFile).peers[0]!;
  await waitFor(() => readDb(b.dbFile).peers[0]!.last_seen > registered_at, "last_seen to move");
  const first = readDb(b.dbFile).peers[0]!.last_seen;
  await waitFor(() => readDb(b.dbFile).peers[0]!.last_seen > first, "last_seen to move again");
});
