import { afterEach, expect, test } from "bun:test";
import { createServer } from "node:net";
import { join } from "node:path";
import { BROKER_DIR, cleanEnv, isUp, post, removeDir, startBroker, tempDir, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;

let broker: Broker | undefined;

afterEach(async () => {
  await broker?.stop();
  broker = undefined;
});

// A second loopback address to listen on. macOS has none unless one is configured.
const DECOY_HOST = "127.0.0.2";
const canListenOnDecoyHost = await new Promise<boolean>((resolve) => {
  const server = createServer();
  server.once("error", () => resolve(false));
  server.listen(0, DECOY_HOST, () => server.close(() => resolve(true)));
});

async function cli(b: Broker, command: string, extraEnv: Record<string, string> = {}) {
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "cli.ts"), command], {
    env: cleanEnv({ SQUAD_PORT: String(b.port), ...extraEnv }),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { out, err, code: await proc.exited };
}

test("PEER-36: status prints the broker state and the number of registered peers", async () => {
  broker = await startBroker();
  expect((await cli(broker, "status")).out.split(/\r?\n/)).toContain("Broker: ok (0 peer(s) registered)");
  await post(broker.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name: "mother", role: "mother" });
  expect((await cli(broker, "status")).out.split(/\r?\n/)).toContain("Broker: ok (1 peer(s) registered)");
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

test("PEER-44: kill-broker that cannot look up the broker process says it is still running and exits 1", async () => {
  broker = await startBroker();
  // lsof and netstat are found through the path, whatever the case of its name on Windows
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const empty = tempDir();
  const res = await cli(broker, "kill-broker", { [pathKey]: empty });
  removeDir(empty);
  expect(res.code).toBe(1);
  expect(res.err).toMatch(/^Could not stop the broker: .+\. It is still running\.$/m);
  expect(res.out + res.err).not.toContain("Broker is not running.");
  expect(await isUp(broker.url)).toBe(true);
});

test.skipIf(!canListenOnDecoyHost)(
  "PEER-45: kill-broker does not signal a process listening on the same port of another address",
  async () => {
    broker = await startBroker();
    const { url, port, proc } = broker;
    const decoyUrl = `http://${DECOY_HOST}:${port}`;
    const decoy = Bun.spawn(
      [
        process.execPath,
        "-e",
        `Bun.serve({ hostname: "${DECOY_HOST}", port: ${port}, fetch: () => new Response("decoy") })`,
      ],
      { stdio: ["ignore", "ignore", "ignore"] }
    );
    try {
      await waitFor(() => isUp(decoyUrl), "the decoy to listen");
      expect((await cli(broker, "kill-broker")).code).toBe(0);
      await waitFor(async () => !(await isUp(url)), "the broker to stop answering");
      await proc.exited;
      // A signal sent to the decoy went out together with the one that stopped the broker
      await Bun.sleep(300);
      expect(decoy.exitCode).toBeNull();
      expect(await (await fetch(decoyUrl)).text()).toBe("decoy");
    } finally {
      decoy.kill();
      await decoy.exited;
    }
  }
);
