#!/usr/bin/env bun
/**
 * squad CLI
 *
 * Utility commands for managing the broker.
 *
 * Usage:
 *   bun cli.ts status          — Show broker status
 *   bun cli.ts kill-broker     — Stop the broker daemon
 */

import { brokerUrl, port } from "./shared/config.ts";

const BROKER_PORT = port();
const BROKER_URL = brokerUrl();

async function brokerFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BROKER_URL}${path}`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// PIDs of the processes that own the broker port
function listenerPids(): number[] {
  const run = (cmd: string[]) => new TextDecoder().decode(Bun.spawnSync(cmd).stdout);

  if (process.platform === "win32") {
    // No lsof on Windows. netstat prints: proto, local address, foreign address, state, pid.
    // The state column is localized, so match on the local address only.
    const pids = run(["netstat", "-ano", "-p", "TCP"])
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter((cols) => cols[0] === "TCP" && cols[1] === `127.0.0.1:${BROKER_PORT}`)
      .map((cols) => parseInt(cols[cols.length - 1] ?? "", 10))
      .filter((pid) => pid > 0);
    return [...new Set(pids)];
  }

  // -sTCP:LISTEN: without it lsof also lists every client connected to the port, the CLI itself included.
  // The address keeps out whoever listens on the same port of another interface.
  return run(["lsof", "-ti", `tcp@127.0.0.1:${BROKER_PORT}`, "-sTCP:LISTEN"])
    .trim()
    .split("\n")
    .filter((p) => p)
    .map((p) => parseInt(p, 10));
}

const cmd = process.argv[2];

switch (cmd) {
  case "status": {
    try {
      const health = await brokerFetch<{ status: string; peers: number }>("/health");
      console.log(`Broker: ${health.status} (${health.peers} peer(s) registered)`);
      console.log(`URL: ${BROKER_URL}`);
    } catch {
      console.log("Broker is not running.");
    }
    break;
  }

  case "kill-broker": {
    let health: { status: string; peers: number };
    try {
      health = await brokerFetch("/health");
    } catch {
      console.log("Broker is not running.");
      break;
    }
    console.log(`Broker has ${health.peers} peer(s). Shutting down...`);
    try {
      // Find and kill the broker process on the port
      const pids = listenerPids();
      if (pids.length === 0) throw new Error(`no process found listening on 127.0.0.1:${BROKER_PORT}`);
      for (const pid of pids) {
        process.kill(pid, "SIGTERM");
      }
      console.log("Broker stopped.");
    } catch (e) {
      console.error(`Could not stop the broker: ${e instanceof Error ? e.message : String(e)}. It is still running.`);
      process.exitCode = 1;
    }
    break;
  }

  default:
    console.log(`squad CLI

Usage:
  bun cli.ts status          Show broker status
  bun cli.ts kill-broker     Stop the broker daemon`);
}
