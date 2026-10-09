// Reads the log of the broker by cursor. The only call the TUI makes: GET /events?after=<cursor>.

import type { SquadEvent } from "../shared/contract.ts";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export function createReader({ fetch, url, timeoutMs = 2000 }: { fetch: Fetch; url: string; timeoutMs?: number }) {
  let log: SquadEvent[] = [];
  let cursor = 0;

  // The whole log read so far. `ok` is false when the broker did not answer what a read
  // answers: the log and the cursor stay as they were, and the next read asks the same.
  async function poll(): Promise<{ ok: boolean; events: SquadEvent[] }> {
    let body: any;
    // A timer of its own: a fake fetch that listened to AbortSignal.timeout hung bun test 1.3.14
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const res = await fetch(`${url}/events?after=${cursor}`, { signal: abort.signal });
      if (res.status !== 200) return { ok: false, events: log };
      body = await res.json();
    } catch {
      return { ok: false, events: log };
    } finally {
      clearTimeout(timer);
    }
    if (!Array.isArray(body?.events) || !Number.isInteger(body.last_seq)) return { ok: false, events: log };
    if (body.last_seq < cursor) {
      // The broker came back over a new database: the next read starts from nothing
      log = [];
      cursor = 0;
      return { ok: true, events: log };
    }
    const fresh = (body.events as SquadEvent[]).filter((e) => e.seq > cursor).sort((a, b) => a.seq - b.seq);
    // A new list when it grows, so that who holds the old one can tell
    if (fresh.length) log = [...log, ...fresh.filter((e, i) => e.seq !== fresh[i - 1]?.seq)];
    cursor = body.last_seq;
    return { ok: true, events: log };
  }

  return { poll };
}
