// What a screen draws from: the derived squad, the lines of the feed and the state of the
// screen itself. A screen is a pure function of a View.

import type { Squad } from "../shared/derive.ts";
import type { PriceTable } from "./config.ts";
import type { FeedRow } from "./feed.ts";
import type { Color } from "./grid.ts";

// The modal of answer of a question
export interface Modal {
  // the id of the question
  question: number;
  // the selected line of the choice mode; null is the text mode
  choice: number | null;
  text: string;
  expanded: boolean;
  // the answer was sent and the broker did not say yet
  sending: boolean;
  // the broker refused the answer: the question had closed
  refused: boolean;
}

export interface Ui {
  screen: "main" | "topology" | "thread" | "questions" | "help";
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
  // the id of the selected question of the tab of questions; null for the first of the list
  question: number | null;
  // the panel of that tab the keys move
  qfocus: "list" | "history";
  // how many of the latest resolved questions the history leaves above
  historyOffset: number;
  modal: Modal | null;
  // the answer the loop has to send to the broker
  send: { question_id: number; answer: string } | null;
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
