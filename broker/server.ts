#!/usr/bin/env bun
/**
 * squad MCP server
 *
 * Spawned by Claude Code as a stdio MCP server (one per session).
 * A session launched with SQUAD_NAME and SQUAD_ROLE joins the squad; one
 * without a role is a regular Claude Code session and gets nothing from here.
 *
 * The server does not register when it starts. It pushes a ping through the
 * channel and exposes a single tool, `ready`. Only when the model calls
 * `ready` with the number of the ping does it register with the broker and
 * expose the tools of its role. So a registered peer is one whose channel
 * works end to end (ADR-009).
 *
 * Once registered it asks the broker, on an interval, for what was sent to the
 * session, pushes each event through the channel and confirms it. It also
 * relays the permission prompts of the session: the request goes to the log
 * and the decision of the dev comes back as its verdict (ADR-011).
 *
 * Usage:
 *   claude --dangerously-load-development-channels server:squad
 *
 * With .mcp.json:
 *   { "squad": { "command": "bun", "args": ["./server.ts"] } }
 */

import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createDelivery } from "./delivery.ts";
import type { ListedPeer, Refusal, RegisterResponse } from "./peers.ts";
import { brokerUrl, heartbeatIntervalMs, pingIntervalMs, pollIntervalMs } from "./shared/config.ts";
import type { SquadEvent } from "./shared/contract.ts";
import { getGitRoot } from "./shared/git.ts";
import { ROUTE_OF, toolsFor } from "./tools.ts";

// --- Configuration ---

const BROKER_URL = brokerUrl();
const HEARTBEAT_INTERVAL_MS = heartbeatIntervalMs();
const PING_INTERVAL_MS = pingIntervalMs();
const POLL_INTERVAL_MS = pollIntervalMs();
// fileURLToPath, not URL.pathname: on Windows the latter is "/C:/..." with spaces as %20
const BROKER_SCRIPT = fileURLToPath(new URL("./broker.ts", import.meta.url));
const NAME = process.env.SQUAD_NAME ?? "";
const ROLE = process.env.SQUAD_ROLE ?? "";

// --- Broker communication ---

async function brokerFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BROKER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Broker error (${path}): ${res.status} ${err}`);
  }
  return res.json() as Promise<T>;
}

async function isBrokerAlive(): Promise<boolean> {
  try {
    const res = await fetch(`${BROKER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureBroker(): Promise<void> {
  if (await isBrokerAlive()) {
    log("Broker already running");
    return;
  }

  log("Starting broker daemon...");
  // Same runtime that runs this server, so `bun` does not have to be on PATH.
  // Detached with no inherited handles, so the broker survives this process.
  const proc = spawn(process.execPath, [BROKER_SCRIPT], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  // Unref so this process can exit without waiting for the broker
  proc.unref();

  // Wait for it to come up
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (await isBrokerAlive()) {
      log("Broker started");
      return;
    }
  }
  throw new Error("Failed to start broker daemon after 6 seconds");
}

// --- Utility ---

function log(msg: string) {
  // MCP stdio servers must only use stderr for logging (stdout is the MCP protocol)
  console.error(`[squad] ${msg}`);
}

function text(message: string, isError = false) {
  return { content: [{ type: "text" as const, text: message }], isError };
}

function isRefusal(result: unknown): result is Refusal {
  return typeof result === "object" && result !== null && (result as Refusal).ok === false;
}

// --- State ---

// The credential the broker gave this session. Null until `ready` succeeds.
let myId: string | null = null;
const pingNumber = randomInt(100_000, 1_000_000);
let pingTimer: ReturnType<typeof setInterval> | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;

// --- MCP Server ---

const mcp = new Server(
  { name: "squad", version: "0.1.0" },
  {
    capabilities: {
      // A session without a role is not a channel. One with a role also answers the
      // permission prompts of its session through it.
      ...(ROLE ? { experimental: { "claude/channel": {}, "claude/channel/permission": {} } } : {}),
      tools: { listChanged: true },
    },
    instructions: ROLE
      ? `You are a member of a squad of Claude Code sessions. Your name is ${NAME} and your role is ${ROLE}.

IMPORTANT: When a <channel source="squad" kind="ping" ...> message arrives, call the ready tool with the number it carries, right away. That registers this session in the squad. Until then the squad cannot reach you and ready is the only squad tool.

After ready, what the squad sends you arrives as <channel source="squad" kind="task|result|verdict" seq="..." from="..." ticket_ref="..."> messages. The seq is what you cite when you answer: task_seq in a result, result_seq in a verdict.

The mother opens and closes the feature the squad works on. Everyone else is told through the channel: kind="feature_opened" carries its title, workflow, branch, base_branch, spec_ref and spec_commit, and kind="feature_closed" its outcome.

Available tools after ready:
${toolsFor(ROLE)
  .map((t) => `- ${t.name}: ${t.description}`)
  .join("\n")}`
      : undefined,
  }
);

// --- Tool definitions ---

const READY_TOOL = {
  name: "ready",
  description:
    'Answer the squad ping. Call it with the number from the <channel source="squad" kind="ping"> message to register this session in the squad.',
  inputSchema: {
    type: "object" as const,
    properties: {
      number: {
        type: "integer" as const,
        description: "The number carried by the ping",
      },
    },
    required: ["number"],
  },
};

// A session only sees the tools of its role (ADR-010)
function currentTools() {
  if (!ROLE) return [];
  if (!myId) return [READY_TOOL];
  return toolsFor(ROLE);
}

// --- Channel ping ---

async function pushPing() {
  try {
    await mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: `Squad ping ${pingNumber}. Call the ready tool with number ${pingNumber} to join the squad as ${NAME} (${ROLE}).`,
        meta: { kind: "ping", number: String(pingNumber) },
      },
    });
  } catch (e) {
    log(`Ping error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function stopPing() {
  clearInterval(pingTimer);
  pingTimer = undefined;
}

// --- Delivery and permission relay ---

// A refusal here is a failed call: the cycle stops and the next one tries again
async function brokerCall<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const result = await brokerFetch<T | Refusal>(path, { ...body, id: myId });
  if (isRefusal(result)) throw new Error(`${path} refused: ${result.error}`);
  return result;
}

const delivery = createDelivery({
  poll: async () => (await brokerCall<{ events: SquadEvent[] }>("/poll-messages", {})).events,
  push: (message) => mcp.notification({ method: "notifications/claude/channel", params: { ...message } }),
  ack: async (seqs) => {
    await brokerCall("/ack", { seqs });
  },
  verdict: (request_id, behavior) =>
    mcp.notification({ method: "notifications/claude/channel/permission", params: { request_id, behavior } }),
});

// A permission prompt of this session. Not a schema of the SDK, so it comes here.
mcp.fallbackNotificationHandler = async (notification) => {
  if (notification.method !== "notifications/claude/channel/permission_request") return;
  // Before the registration there is no id to record it with: the dialog of the terminal stands
  if (!myId) return;
  const { request_id, tool_name, description, input_preview } = notification.params ?? {};
  try {
    const { seq } = await brokerCall<{ seq: number }>("/permission-request", {
      request_id,
      tool_name,
      description,
      input_preview,
    });
    // The decision cites the seq, and the verdict has to cite the request_id
    delivery.remember(seq, request_id as string);
  } catch (e) {
    log(`Permission request error: ${e instanceof Error ? e.message : String(e)}`);
  }
};

// --- Tool handlers ---

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: currentTools(),
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (!currentTools().some((t) => t.name === name)) {
    throw new Error(`Unknown tool: ${name}`);
  }

  switch (name) {
    case "ready": {
      if (String((args as { number?: unknown } | undefined)?.number) !== String(pingNumber)) {
        return text(
          'That is not the number of the ping. Wait for the <channel source="squad" kind="ping"> message and call ready with the number it carries.',
          true
        );
      }
      // The channel works. What can still fail is the broker, and ready can be called again for that.
      stopPing();
      try {
        await ensureBroker();
        const cwd = process.cwd();
        const result = await brokerFetch<RegisterResponse | Refusal>("/register", {
          pid: process.pid,
          cwd,
          git_root: await getGitRoot(cwd),
          name: NAME,
          role: ROLE,
        });
        if (isRefusal(result)) {
          return text(`Registration refused: ${result.error}. ${result.hint}`, true);
        }
        myId = result.id;
      } catch (e) {
        return text(`Error registering: ${e instanceof Error ? e.message : String(e)}`, true);
      }
      log(`Registered as ${NAME} (${ROLE})`);

      heartbeatTimer = setInterval(async () => {
        try {
          await brokerFetch("/heartbeat", { id: myId });
        } catch {
          // Non-critical
        }
      }, HEARTBEAT_INTERVAL_MS);
      // Only from here on: before the registration nothing is asked of the broker
      pollTimer = setInterval(delivery.cycle, POLL_INTERVAL_MS);

      await mcp.sendToolListChanged();
      return text(`Registered in the squad as ${NAME} (${ROLE}).`);
    }

    case "list_peers": {
      try {
        const result = await brokerFetch<ListedPeer[] | Refusal>("/list-peers", { id: myId });
        if (isRefusal(result)) {
          return text(`Failed to list peers: ${result.error}. ${result.hint}`, true);
        }
        const lines = result.map((p) => `${p.name} (${p.role}): ${p.online ? "online" : "offline"}`);
        return text(`The other members of the squad:\n\n${lines.join("\n")}`);
      } catch (e) {
        return text(`Error listing peers: ${e instanceof Error ? e.message : String(e)}`, true);
      }
    }

    // Every other tool is one route of the broker, called in the name of this session
    default: {
      const route = ROUTE_OF[name];
      if (!route) throw new Error(`Unknown tool: ${name}`);
      try {
        // The kind is the tool's and the id is this session's, whatever the arguments say
        const result = await brokerFetch<unknown>(route.path, {
          ...args,
          ...(route.kind && { kind: route.kind }),
          id: myId,
        });
        if (isRefusal(result)) {
          return text(`${name} refused: ${result.error}. ${result.hint}`, true);
        }
        const { seq, feature_id } = result as { seq?: unknown; feature_id?: unknown };
        // Only /open-feature answers a feature_id, and the mother needs it
        if (typeof feature_id === "number") return text(`Feature ${feature_id} opened with seq ${seq}.`);
        return text(typeof seq === "number" ? `Recorded with seq ${seq}.` : JSON.stringify(result, null, 2));
      } catch (e) {
        return text(`Error calling ${name}: ${e instanceof Error ? e.message : String(e)}`, true);
      }
    }
  }
});

// --- Startup ---

async function main() {
  if (ROLE) {
    // The ping proves the channel, so it only starts once the client is listening
    mcp.oninitialized = () => {
      pushPing();
      pingTimer = setInterval(pushPing, PING_INTERVAL_MS);
    };

    try {
      await ensureBroker();
    } catch (e) {
      // ready tries again
      log(e instanceof Error ? e.message : String(e));
    }
    log(`Name: ${NAME}, role: ${ROLE}`);
  } else {
    log("No SQUAD_ROLE: not a squad session");
  }

  // Clean up on exit. On Windows the session ends by closing stdin, not by a signal.
  let exiting = false;
  const cleanup = async () => {
    if (exiting) return;
    exiting = true;
    stopPing();
    clearInterval(heartbeatTimer);
    clearInterval(pollTimer);
    if (myId) {
      try {
        await brokerFetch("/unregister", { id: myId });
        log("Unregistered from broker");
      } catch {
        // Best effort
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.stdin.on("end", cleanup);
  process.stdin.on("close", cleanup);

  await mcp.connect(new StdioServerTransport());
  log("MCP connected");
}

main().catch((e) => {
  log(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
