import { expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  brokerUrl,
  cleanupIntervalMs,
  dbPath,
  heartbeatIntervalMs,
  pingIntervalMs,
  pollIntervalMs,
  port,
  tokenPath,
} from "../../shared/config.ts";

test("PEER-19: default database is in the system home directory", () => {
  expect(dbPath({})).toBe(join(homedir(), ".squad-code-mcp.db"));
});

test("PEER-19: SQUAD_DB overrides the default database", () => {
  expect(dbPath({ SQUAD_DB: "/tmp/other.db" })).toBe("/tmp/other.db");
});

test("PEER-20: default port is 7900 on 127.0.0.1", () => {
  expect(port({})).toBe(7900);
  expect(brokerUrl({})).toBe("http://127.0.0.1:7900");
});

test("PEER-20: SQUAD_PORT overrides the default port", () => {
  expect(port({ SQUAD_PORT: "7955" })).toBe(7955);
  expect(brokerUrl({ SQUAD_PORT: "7955" })).toBe("http://127.0.0.1:7955");
});

test("PEER-28: the ping repeats every 10 s unless SQUAD_PING_INTERVAL_MS says otherwise", () => {
  expect(pingIntervalMs({})).toBe(10000);
  expect(pingIntervalMs({ SQUAD_PING_INTERVAL_MS: "250" })).toBe(250);
});

test("PEER-38: the cleanup runs every 30 s unless SQUAD_CLEANUP_INTERVAL_MS says otherwise", () => {
  expect(cleanupIntervalMs({})).toBe(30000);
  expect(cleanupIntervalMs({ SQUAD_CLEANUP_INTERVAL_MS: "250" })).toBe(250);
});

test("PEER-46: the heartbeat repeats every 15 s unless SQUAD_HEARTBEAT_INTERVAL_MS says otherwise", () => {
  expect(heartbeatIntervalMs({})).toBe(15000);
  expect(heartbeatIntervalMs({ SQUAD_HEARTBEAT_INTERVAL_MS: "250" })).toBe(250);
});

test("EVT-62: the default file of the human credential is in the system home directory", () => {
  expect(tokenPath({})).toBe(join(homedir(), ".squad-code-mcp.token"));
});

test("EVT-62: SQUAD_TOKEN_FILE overrides the default file of the human credential", () => {
  expect(tokenPath({ SQUAD_TOKEN_FILE: "/tmp/other.token" })).toBe("/tmp/other.token");
});

test("EVT-81: the polling repeats every 1 s unless SQUAD_POLL_INTERVAL_MS says otherwise", () => {
  expect(pollIntervalMs({})).toBe(1000);
  expect(pollIntervalMs({ SQUAD_POLL_INTERVAL_MS: "250" })).toBe(250);
});
