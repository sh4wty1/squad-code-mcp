/**
 * squad hook session
 *
 * What a hook needs to speak to the broker in the name of its session: the
 * credential the MCP server left in a file (AD-016), a call that never throws and
 * never waits long, and the payload Claude Code writes to the standard input.
 */

import { readFileSync } from "node:fs";
import { brokerUrl, HOOK_TIMEOUT_MS, idPath } from "../../broker/shared/config.ts";

type Env = Record<string, string | undefined>;

// The credential of the session, or null when it is not a squad session or the MCP
// server has not registered it
export function credential(env: Env = process.env): string | null {
  if (!env.SQUAD_ROLE) return null;
  try {
    return readFileSync(idPath(env.SQUAD_NAME ?? "", env), "utf8").trim() || null;
  } catch {
    return null;
  }
}

// What the broker answered to a POST, or null for anything that is not a 200 the broker
// did not refuse: a failed connection, another status, another body, a refusal or
// nothing within the timeout
export async function call(path: string, body: unknown, env: Env = process.env): Promise<unknown | null> {
  // A timer of its own, as in the reader of the TUI
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), HOOK_TIMEOUT_MS);
  try {
    const res = await fetch(`${brokerUrl(env)}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    if (res.status !== 200) return null;
    const answer: unknown = await res.json();
    return (answer as { ok?: unknown } | null)?.ok === false ? null : answer;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// The payload of a hook: the JSON object of the text, or an empty one
export function payload(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
