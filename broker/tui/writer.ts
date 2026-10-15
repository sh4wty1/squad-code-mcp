// Sends the decisions of the dev, with the human credential: the answer to a question
// (POST /answer), the decision of a gate (POST /gate-decision) and that of a permission
// request (POST /permission-decision). The only writes of the TUI.

import type { Fetch } from "./reader.ts";

// What the broker said of the decision: it took it, or the error of its refusal
export type Sent = { ok: true } | { ok: false; error: string };

// The error of a broker that did not say either
const SILENT = "broker não respondeu";

export function createWriter({ fetch, url, timeoutMs = 2000 }: { fetch: Fetch; url: string; timeoutMs?: number }) {
  // The broker answers 200 with `ok` to what it takes and to what it refuses. Anything else
  // is the broker not answering: a failed connection, another status, another body, or
  // nothing within the timeout.
  async function post(path: string, payload: Record<string, unknown>): Promise<Sent> {
    let body: any;
    // A timer of its own, as in the reader
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const res = await fetch(`${url}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  return {
    answer: (token: string, question_id: number, answer: string) => post("/answer", { human_token: token, question_id, answer }),
    // text only when there is one: the approve of the modal has none
    gate: (token: string, gate_id: number, request_seq: number, decision: "approve" | "reject" | "comment", text?: string) =>
      post("/gate-decision", { human_token: token, gate_id, request_seq, decision, ...(text !== undefined && { text }) }),
    permission: (token: string, request_seq: number, behavior: "allow" | "deny") =>
      post("/permission-decision", { human_token: token, request_seq, behavior }),
  };
}
