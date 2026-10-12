#!/usr/bin/env bun
/**
 * squad hook: stop
 *
 * Runs on Stop, when a turn of the session is about to end. A session that would
 * come out of the turn stalled is sent back to work once, with what it owes
 * (AD-017); any other records its `usage`, the tokens of the session so far and
 * the mark of the end of the turn (ADR-006, AD-018). It always exits with 0 and
 * writes to the standard output only the block: a broker that is not there never
 * holds a session.
 */

import { brokerUrl, HOOK_TIMEOUT_MS } from "../../broker/shared/config.ts";
import type { SquadEvent } from "../../broker/shared/contract.ts";
import { nudge } from "./nudge.ts";
import { call, credential, payload } from "./session.ts";
import { sessionUsage } from "./usage.ts";

// What the session is told to go back to work, or null when it may stop: also when the
// log cannot be read
async function owed(): Promise<string | null> {
  // A timer of its own, as in the reader of the TUI
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), HOOK_TIMEOUT_MS);
  try {
    const res = await fetch(`${brokerUrl()}/events?after=0`, { signal: abort.signal });
    if (res.status !== 200) return null;
    const body = (await res.json()) as { events?: unknown } | null;
    if (!Array.isArray(body?.events)) return null;
    return nudge(body.events as SquadEvent[], process.env.SQUAD_NAME ?? "", Date.now());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const id = credential();
if (id) {
  const input = payload(await Bun.stdin.text());
  // The stop that follows a block passes: one return to work per turn
  const reason = input.stop_hook_active === true ? null : await owed();
  if (reason) {
    // The turn has not ended: no usage
    console.log(JSON.stringify({ decision: "block", reason }));
  } else {
    // Without the id of the session its tokens could not be told from those of another
    const known = typeof input.session_id === "string" && input.session_id !== "";
    const session_id = known ? input.session_id : "unknown";
    const usage = known ? sessionUsage(input.transcript_path) : {};
    const models = Object.keys(usage).sort();
    for (const model of models) await call("/usage", { id, session_id, model, ...usage[model] });
    // The end of the turn is marked all the same
    if (models.length === 0) {
      await call("/usage", { id, session_id, model: "unknown", input: 0, output: 0, cache_write: 0, cache_read: 0 });
    }
  }
}
