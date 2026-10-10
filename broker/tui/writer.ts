// Sends the answer of the dev to a question. The only write of the TUI: POST /answer, with
// the human credential.

import type { Fetch } from "./reader.ts";

// What the broker said of the answer: it took it, or the error of its refusal
export type Sent = { ok: true } | { ok: false; error: string };

// The error of a broker that did not say either
const SILENT = "broker não respondeu";

export function createWriter({ fetch, url, timeoutMs = 2000 }: { fetch: Fetch; url: string; timeoutMs?: number }) {
  // The broker answers 200 with `ok` to what it takes and to what it refuses. Anything else
  // is the broker not answering: a failed connection, another status, another body, or
  // nothing within the timeout.
  async function answer(token: string, question_id: number, answer: string): Promise<Sent> {
    let body: any;
    // A timer of its own, as in the reader
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const res = await fetch(`${url}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ human_token: token, question_id, answer }),
        signal: abort.signal,
      });
      if (res.status !== 200) return { ok: false, error: SILENT };
      body = await res.json();
    } catch {
      return { ok: false, error: SILENT };
    } finally {
      clearTimeout(timer);
    }
    if (body?.ok === true) return { ok: true };
    return body?.ok === false && typeof body.error === "string" ? { ok: false, error: body.error } : { ok: false, error: SILENT };
  }

  return { answer };
}
