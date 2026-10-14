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

// The modal of a pending gate
export interface GateModal {
  // the id of the gate
  id: number;
  // reading the gate, confirming the approve, or writing the text of a reject or a comment
  mode: "view" | "confirm" | "reject" | "comment";
  text: string;
  expanded: boolean;
  // enter with an empty text: the field is red until a key changes the text (GAT-56)
  empty: boolean;
  // the decision was sent and the broker did not say yet
  sending: boolean;
  // the version on the screen when the confirm mode opened (GAT-59)
  version: number;
}

// The modal of a permission request
export interface PermissionModal {
  // the seq of the permission_request
  seq: number;
  // the first line of the preview drawn
  offset: number;
  // the decision was sent and the broker did not say yet
  sending: boolean;
}

// What the loop has to send to the broker: an answer, the decision of a gate or that of a
// permission request, told apart by their fields
export type Send =
  | { question_id: number; answer: string }
  | { gate_id: number; decision: "approve" | "reject" | "comment"; text?: string }
  | { request_seq: number; behavior: "allow" | "deny" };

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
  // the modals of gate and of permission; absent is closed, as null
  gate?: GateModal | null;
  permission?: PermissionModal | null;
  send: Send | null;
  // the terminal sent the mark of the start of a paste, and not yet the one of its end
  pasting: boolean;
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
