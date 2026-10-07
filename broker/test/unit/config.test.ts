import { expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { brokerUrl, dbPath, port } from "../../shared/config.ts";

test("PEER-19: default database is in the system home directory", () => {
  expect(dbPath({})).toBe(join(homedir(), ".squad-code-mcp.db"));
});

test("PEER-19: the default database does not come from HOME", () => {
  expect(dbPath({ HOME: "/not/the/home" })).toBe(join(homedir(), ".squad-code-mcp.db"));
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
