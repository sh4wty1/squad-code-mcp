#!/usr/bin/env bun
/**
 * squad broker daemon
 *
 * A singleton HTTP server on 127.0.0.1 (port 7900 by default) backed by SQLite.
 * Tracks the peers of the squad and logs their presence as events.
 *
 * Auto-launched by the MCP server if not already running.
 * Run directly: bun broker.ts
 */

import { dbPath, port } from "./shared/config.ts";
import { openDatabase } from "./db.ts";
import { createPeers, type RegisterRequest } from "./peers.ts";

const PORT = port();
const DB_PATH = dbPath();
const CLEANUP_INTERVAL_MS = parseInt(process.env.SQUAD_CLEANUP_INTERVAL_MS ?? "30000", 10);

const db = openDatabase(DB_PATH);
const peers = createPeers(db);

// Clean up stale peers (PIDs that no longer exist) on startup, then periodically
peers.cleanStale();
setInterval(peers.cleanStale, CLEANUP_INTERVAL_MS);

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
      return new Response("squad broker", { status: 200 });
    }

    try {
      const body = await req.json();

      // A refusal is a 200 with { ok: false, error, hint }
      switch (path) {
        case "/register":
          return Response.json(peers.register(body as RegisterRequest));
        case "/heartbeat":
          peers.heartbeat((body as { id: string }).id);
          return Response.json({ ok: true });
        case "/list-peers":
          return Response.json(peers.listPeers((body as { id: string }).id));
        case "/unregister":
          peers.unregister((body as { id: string }).id);
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
