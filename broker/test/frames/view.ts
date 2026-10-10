// What the tests of the screens share: the lines of a frame of the prototype and the View
// its log gives.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { feed } from "../../tui/feed.ts";
import type { View } from "../../tui/view.ts";
import { LOGS, PRICES } from "./logs.ts";

// The lines of `<id>.txt`, as extracted. Git may check the file out with CRLF.
export function frame(id: string): string[] {
  return readFileSync(join(import.meta.dir, `${id}.txt`), "utf8").replace(/\r?\n$/, "").split(/\r?\n/);
}

// The View of the frame: its log at its clock, with the selection of the prototype, the
// ticket of its thread and the project of the prototype. `change` gives another log from the one of the frame.
export function frameView(id: string, change: (events: SquadEvent[]) => SquadEvent[] = (events) => events): View {
  const { now, selected, ticket } = LOGS[id]!;
  const events = change(LOGS[id]!.events);
  return {
    squad: squad(events, now),
    rows: feed(events),
    ui: { screen: "main", selected, focus: 1, paused: false, scope: "feature", toast: null, threadTicket: ticket ?? null, threadOffset: 0 },
    project: "portal-89fm",
    down: null,
    prices: PRICES,
  };
}
