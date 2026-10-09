import { expect, test } from "bun:test";
import { join } from "node:path";
import { BROKER_DIR, cleanEnv } from "./helpers.ts";

test("TUI-59: the probe outside a terminal says it needs one and exits 1", async () => {
  const proc = Bun.spawn([process.execPath, join(BROKER_DIR, "tui", "probe.ts")], {
    env: cleanEnv({}),
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  expect(await proc.exited).toBe(1);
  expect(err.trim()).toBe("probe needs a terminal on stdin and stdout");
  expect(out).toBe("");
});
