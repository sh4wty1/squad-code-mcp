import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";
import { BROKER_DIR, cleanEnv, isUp, post, startBroker, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

async function cli(b: Broker, command: string): Promise<string> {
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "cli.ts"), command], {
    env: cleanEnv({ SQUAD_PORT: String(b.port) }),
    stdout: "pipe",
    stderr: "ignore",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out;
}

test("PEER-36: status prints the broker state and the number of registered peers", async () => {
  broker = await startBroker();
  expect((await cli(broker, "status")).split(/\r?\n/)).toContain("Broker: ok (0 peer(s) registered)");
  await post(broker.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "mother", role: "mother" });
  expect((await cli(broker, "status")).split(/\r?\n/)).toContain("Broker: ok (1 peer(s) registered)");
});

test("PEER-35: kill-broker ends the broker process and /health stops answering", async () => {
  broker = await startBroker();
  const { url, proc } = broker;
  expect(await isUp(url)).toBe(true);
  await cli(broker, "kill-broker");
  await waitFor(async () => !(await isUp(url)), "the broker to stop answering");
  await proc.exited;
  expect(proc.killed || proc.exitCode !== null).toBe(true);
  expect(await isUp(url)).toBe(false);
});
