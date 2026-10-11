#!/usr/bin/env bun
/**
 * squad broker daemon
 *
 * A singleton HTTP server on 127.0.0.1 (port 7900 by default) backed by SQLite.
 * Tracks the peers of the squad and keeps the event log: what they send to each
 * other, what is still to be delivered and what each one owes.
 *
 * Auto-launched by the MCP server if not already running.
 * Run directly: bun broker.ts
 */

import { cleanupIntervalMs, dbPath, expireIntervalMs, port, tokenPath } from "./shared/config.ts";
import { openDatabase } from "./db.ts";
import { createFeature, type Where } from "./feature.ts";
import { createLog, type HistoryFilter } from "./log.ts";
import { createPeers, refuse, type RegisterRequest } from "./peers.ts";
import { createPermission, loadHumanToken } from "./permission.ts";
import { createPlan } from "./plan.ts";
import { createQuestion } from "./question.ts";
import { createSend, type Caller } from "./send.ts";
import { createSession } from "./session.ts";
import { createState } from "./state.ts";

const PORT = port();
const DB_PATH = dbPath();
const PEER_ROUTES = ["/register", "/heartbeat", "/list-peers", "/unregister"];
// The routes that only a registered peer calls: its id says who it is
const CREDENTIAL_ROUTES = [
  "/send",
  "/plan",
  "/poll-messages",
  "/ack",
  "/history",
  "/state",
  "/blocked",
  "/unblocked",
  "/usage",
  "/turn-started",
  "/permission-request",
  "/open-feature",
  "/close-feature",
  "/ask",
  "/escalate",
  "/merge-question",
];
// The human is not a peer: the decision of a permission is authorized by its own credential.
// So is the answer of the dev, on the route the holder of a question answers with its id.
const ROUTES = [...PEER_ROUTES, ...CREDENTIAL_ROUTES, "/permission-decision", "/answer"];

const db = openDatabase(DB_PATH);
const peers = createPeers(db);
const log = createLog(db);
// Read once, here, and created if it is not there. No answer and no event carries it.
const humanToken = loadHumanToken(tokenPath());
const question = createQuestion(db, log, humanToken);
const { send } = createSend(log, question.delivered);
const { plan } = createPlan(log);
const session = createSession(log);
const permission = createPermission(log, humanToken);
const { state } = createState(log);
const feature = createFeature(log);

// Clean up stale peers (PIDs that no longer exist) on startup, then periodically
peers.cleanStale();
setInterval(peers.cleanStale, cleanupIntervalMs());

// The deadlines of the questions: one that came while the broker was down closes here,
// before any request is served, and the others at the check of every second
question.expire();
setInterval(question.expire, expireIntervalMs());

// Exactly one of the three filters, of its type. A filter that is null was not sent.
function historyFilter(body: Record<string, unknown>): HistoryFilter | null {
  const { ticket_ref, question_id, gate_id } = body;
  if ([ticket_ref, question_id, gate_id].filter((f) => f != null).length !== 1) return null;
  if (typeof ticket_ref === "string") return { ticket_ref };
  if (Number.isInteger(question_id)) return { question_id: question_id as number };
  if (Number.isInteger(gate_id)) return { gate_id: gate_id as number };
  return null;
}

// The whole log after a cursor, for the TUI: every feature and the events of none.
// `after` is the query parameter as it came, null when absent.
function eventsAfter(after: string | null): unknown {
  if (after !== null && !/^\d+$/.test(after)) {
    return refuse("invalid_field", "after must be an integer of zero or more: the last seq already read.");
  }
  return { events: log.after(Number(after ?? 0)), last_seq: log.lastSeq() };
}

// What a route with credential answers to `peer`, the holder of the id of the request.
// The refusals of /ack and /history are of transport and reading: they leave no trace in the log.
function answer(path: string, peer: Caller & Where, body: Record<string, unknown>): unknown {
  switch (path) {
    case "/send":
      return send(peer, body);
    case "/plan":
      return plan(peer, body);
    case "/poll-messages":
      return { events: log.pending(peer.name) };
    case "/ack": {
      const { seqs } = body;
      if (!Array.isArray(seqs) || !seqs.every(Number.isInteger)) {
        return refuse("missing_field", "Send seqs as the list of the integer seq of each event received.");
      }
      log.ack(peer.name, seqs);
      return { ok: true };
    }
    case "/history": {
      const filter = historyFilter(body);
      if (!filter) {
        return refuse(
          "missing_field",
          "Send exactly one of ticket_ref as a string, question_id as an integer or gate_id as an integer."
        );
      }
      return { events: log.history(filter) };
    }
    case "/state":
      return state(peer);
    case "/blocked":
      return session.blocked(peer, body);
    case "/unblocked":
      return session.unblocked(peer);
    case "/usage":
      return session.usage(peer, body);
    case "/turn-started":
      return session.turnStarted(peer);
    case "/open-feature":
      return feature.open(peer, body);
    case "/close-feature":
      return feature.close(peer, body);
    case "/ask":
      return question.ask(peer, body);
    case "/escalate":
      return question.escalate(peer, body);
    case "/merge-question":
      return question.merge(peer, body);
    case "/answer":
      return question.answer(peer, body);
    default:
      return permission.request(peer, body);
  }
}

// --- HTTP Server ---

Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method !== "POST") {
      if (path === "/health") {
        return Response.json({ status: "ok", peers: peers.count() });
      }
      if (path === "/events") {
        return Response.json(eventsAfter(url.searchParams.get("after")));
      }
      return new Response("squad broker", { status: 200 });
    }

    // Before reading the body: an unknown route is a 404 whatever it carries
    if (!ROUTES.includes(path)) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    try {
      // A refusal is a 200 with { ok: false, error, hint }
      const body: unknown = await req.json().catch(() => null);
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return Response.json({ ok: false, error: "missing_field", hint: "Send a JSON object as the body." });
      }

      if (path === "/permission-decision") {
        return Response.json(permission.decision(body as Record<string, unknown>));
      }

      // The key human_token, whatever its value, makes it the answer of the dev: a wrong
      // token is never the refusal of the peer whose id came along
      if (path === "/answer" && "human_token" in body) {
        return Response.json(question.answerAsHuman(body as Record<string, unknown>));
      }

      if (path === "/answer" || CREDENTIAL_ROUTES.includes(path)) {
        // Before any rule: who is not registered leaves no event, not even a refused
        const peer = peers.find((body as Record<string, unknown>).id);
        if (!peer) {
          return Response.json(
            refuse("unknown_peer", "This id is not registered. Register again and use the id that comes back.")
          );
        }
        return Response.json(answer(path, peer, body as Record<string, unknown>));
      }

      // An id that is missing or not a string is an id nobody has
      const id = "id" in body && typeof body.id === "string" ? body.id : "";

      switch (path) {
        case "/register":
          return Response.json(peers.register(body as RegisterRequest));
        case "/heartbeat":
          peers.heartbeat(id);
          return Response.json({ ok: true });
        case "/list-peers":
          return Response.json(peers.listPeers(id));
        case "/unregister":
          peers.unregister(id);
          return Response.json({ ok: true });
        default:
          return Response.json({ error: "not found" }, { status: 404 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ error: msg }, { status: 500 });
    }
  },
});

console.error(`[squad broker] listening on 127.0.0.1:${PORT} (db: ${DB_PATH})`);
