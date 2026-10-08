/**
 * squad delivery loop
 *
 * What a registered session does with what was sent to it: asks the broker,
 * pushes each event through the channel in order and only then confirms it
 * (ADR-009). The decision of a permission is not pushed to the model: it goes
 * back to Claude Code as the verdict of the request (ADR-011).
 *
 * No MCP and no HTTP here: the four calls come from whoever creates the loop.
 */

import type { SquadEvent } from "./shared/contract.ts";

// What goes through the channel for one event. The values of meta are strings and
// its keys plain identifiers: that is what the channel takes.
export interface Push {
  content: string;
  meta: Record<string, string>;
}

export interface DeliveryCalls {
  // the events still to be delivered to this session
  poll: () => Promise<SquadEvent[]>;
  push: (message: Push) => Promise<void>;
  ack: (seqs: number[]) => Promise<void>;
  // answers the permission request `requestId` of this session
  verdict: (requestId: string, behavior: "allow" | "deny") => Promise<void>;
}

// What every event has. The rest are the fields of its kind.
const ENVELOPE = ["seq", "ts", "kind", "feature_id", "from", "role_from", "to", "summary", "body", "ticket_ref"];

// The text the model reads: the summary, the body and each field of the kind
export function toPush(event: SquadEvent): Push {
  const fields = Object.entries(event)
    .filter(([key]) => !ENVELOPE.includes(key))
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
  return {
    content: [event.summary, event.body, fields.join("\n")].filter((part) => part !== "").join("\n\n"),
    meta: {
      kind: event.kind,
      seq: String(event.seq),
      from: event.from,
      ...(event.ticket_ref !== null && { ticket_ref: event.ticket_ref }),
    },
  };
}

export function createDelivery({ poll, push, ack, verdict }: DeliveryCalls) {
  let running = false;
  // Handed over and not confirmed yet: an ack that failed is tried again, the push is not
  const handed = new Set<number>();
  // The permission requests this process recorded: seq of the request → its request_id
  const requests = new Map<number, string>();

  function remember(requestSeq: number, requestId: string) {
    requests.set(requestSeq, requestId);
  }

  async function hand(event: SquadEvent) {
    if (event.kind !== "permission_decision") return push(toPush(event));
    // The request of a session before this one: nobody here waits for the verdict
    const requestId = requests.get(event.request_seq);
    if (requestId !== undefined) await verdict(requestId, event.behavior);
  }

  // One round of poll, push and ack. It stops at the first call that fails and leaves
  // the rest to the next round; a round that finds another one running does nothing.
  async function cycle(): Promise<void> {
    if (running) return;
    running = true;
    try {
      const events = [...(await poll())].sort((a, b) => a.seq - b.seq);
      for (const event of events) {
        if (!handed.has(event.seq)) {
          await hand(event);
          handed.add(event.seq);
        }
        await ack([event.seq]);
        handed.delete(event.seq);
      }
    } catch {
      // What was not confirmed comes back in the next poll
    } finally {
      running = false;
    }
  }

  return { cycle, remember };
}
