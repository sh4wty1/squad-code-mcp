// What a screen draws from: the derived squad, the lines of the feed and the state of the
// screen itself. A screen is a pure function of a View.

import type { Squad } from "../shared/derive.ts";
import type { PriceTable } from "./config.ts";
import type { FeedRow } from "./feed.ts";
import type { Color } from "./grid.ts";

export interface Ui {
  screen: "main" | "topology" | "thread" | "help";
  // the seq of the selected line of the feed; null for none
  selected: number | null;
  // the panel in focus: agents and tickets, feed, detail
  focus: 0 | 1 | 2;
  paused: boolean;
  // which tokens the footer shows
  scope: "feature" | "session";
  // the notice of a key, shown while the clock is before `until`
  toast: { text: string; color: Color; until: number } | null;
  threadTicket: string | null;
  threadOffset: number;
}

export interface View {
  squad: Squad;
  rows: FeedRow[];
  ui: Ui;
  // the name of the repository the TUI was launched from; null outside one
  project: string | null;
  // since when the broker does not answer and how many reads failed; null while it answers
  down: { since: number; attempt: number } | null;
  prices: PriceTable;
}
