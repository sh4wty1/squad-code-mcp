import { expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import {
  brokerUrl,
  claudeCommand,
  cleanupIntervalMs,
  dbPath,
  expireIntervalMs,
  heartbeatIntervalMs,
  HOOK_TIMEOUT_MS,
  idPath,
  pingIntervalMs,
  pluginDir,
  pollIntervalMs,
  port,
  rolesPath,
  tokenPath,
  worktreesDir,
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

test("QST-34: the deadlines are checked every 1000 ms unless SQUAD_EXPIRE_INTERVAL_MS says otherwise", () => {
  expect(expireIntervalMs({})).toBe(1000);
  expect(expireIntervalMs({ SQUAD_EXPIRE_INTERVAL_MS: "250" })).toBe(250);
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

// A path with the separator of the system written with "/"
function slashed(path: string): string {
  return path.replaceAll("\\", "/");
}

test("PAP-06: the credential file of a name is the path of the database followed by .<name>.id", () => {
  expect(idPath("worker-1", { SQUAD_DB: "/tmp/x.db" })).toBe("/tmp/x.db.worker-1.id");
  expect(idPath("judge", { SQUAD_DB: "/tmp/x.db" })).toBe("/tmp/x.db.judge.id");
});

test("PAP-06: without SQUAD_DB the credential file is next to the default database, in the system home directory", () => {
  expect(idPath("worker-1", {})).toBe(join(homedir(), ".squad-code-mcp.db.worker-1.id"));
});

test("PAP-35: the plugin directory is absolute, is called plugin and sits next to broker/", () => {
  const dir = pluginDir();
  expect(isAbsolute(dir)).toBe(true);
  expect(basename(dir)).toBe("plugin");
  // the squad root is the directory that has this broker/ in it
  expect(realpathSync(join(dirname(dir), "broker"))).toBe(realpathSync(join(import.meta.dir, "..", "..")));
});

test("PAP-35: the roles file is roles.json of the plugin directory unless SQUAD_ROLES says otherwise", () => {
  expect(rolesPath({})).toBe(join(pluginDir(), "roles.json"));
  expect(basename(rolesPath({}))).toBe("roles.json");
  expect(rolesPath({ SQUAD_ROLES: "/tmp/other roles.json" })).toBe("/tmp/other roles.json");
});

test("PAP-52: the worktrees directory is the name of the main checkout plus .squad, in its parent", () => {
  expect(slashed(worktreesDir("/a/b/repo", {}))).toBe("/a/b/repo.squad");
  expect(slashed(worktreesDir("/a/b c/the repo", {}))).toBe("/a/b c/the repo.squad");
});

test("PAP-52: SQUAD_WORKTREES overrides the default worktrees directory", () => {
  expect(worktreesDir("/a/b/repo", { SQUAD_WORKTREES: "/tmp/trees" })).toBe("/tmp/trees");
});

test("PAP-37: the command of the session is claude unless SQUAD_CLAUDE says otherwise", () => {
  expect(claudeCommand({})).toBe("claude");
  expect(claudeCommand({ SQUAD_CLAUDE: "/opt/claude dev/claude" })).toBe("/opt/claude dev/claude");
});

test("PAP-13: a hook waits 2000 ms for the broker", () => {
  expect(HOOK_TIMEOUT_MS).toBe(2000);
});
