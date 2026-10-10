// What a key does to the state of the screen. Pure: the clock is the one of the view, and a
// key is the string the terminal sends in raw mode. Ported from the branch of `onKey` of
// the prototype with no modal open.

import type { Question } from "../shared/derive.ts";
import { resolved, waiting } from "./asked.ts";
import type { FeedRow } from "./feed.ts";
import type { Color } from "./grid.ts";
import { selected } from "./screens/questions.ts";
import { threadTicket } from "./screens/thread.ts";
import type { Ui, View } from "./view.ts";

export const START: Ui = { screen: "main", selected: null, focus: 1, paused: false, scope: "feature", toast: null, threadTicket: null, threadOffset: 0, question: null, qfocus: "list", historyOffset: 0, modal: null, send: null };

// How long the notice of a key stays in the footer
const TOAST_MS = 4000;

const UP = "\x1b[A";
const DOWN = "\x1b[B";

// The lines of the feed to show: while it is paused, the ones it had
export function visible(ui: Ui, fresh: FeedRow[], shown: FeedRow[]): FeedRow[] {
  return ui.paused ? shown : fresh;
}

// The state after the key, or null when the key quits
export function press(ui: Ui, key: string, view: View): Ui | null {
  const { squad, rows } = view;
  const toast = (text: string, color: Color = "gray"): Ui => ({ ...ui, toast: { text, color, until: squad.now + TOAST_MS } });
  const thread = (): Ui => ({ ...ui, screen: "thread", threadTicket: null, threadOffset: 0 });
  // The questions that wait for the dev, in the order of the tab, and the selected one
  const asked = waiting(squad);
  const chosen = selected(view);
  // The tab with the question selected and the modal of its answer: on its first option, or on the text
  const answer = (q: Question): Ui => ({
    ...ui,
    screen: "questions",
    question: q.id,
    qfocus: "list",
    modal: { question: q.id, choice: q.options.length ? 0 : null, text: "", expanded: false, sending: false, refused: false },
  });

  switch (key) {
    case "q":
    case "\x03":
      return null;
    case "1":
      return { ...ui, screen: "main" };
    case "2":
      return { ...ui, screen: "topology" };
    case "3":
      return thread();
    case "?":
      return { ...ui, screen: "help" };
    case "\x1b":
      return { ...ui, screen: "main" };
    case "4":
      return { ...ui, screen: "questions" };
    case "g":
    case "x":
      return toast("chega com a fatia Gate");
    case "h":
      return ui.screen === "questions" ? { ...ui, qfocus: ui.qfocus === "list" ? "history" : "list" } : ui;
    case "\r": {
      if (ui.screen === "questions") return chosen ? answer(chosen) : ui;
      // Any question of a question that waits for the dev, where it was asked or where it reached him
      const e = rows.find((row) => row.seq === ui.selected)?.event;
      const q = e?.kind === "question" ? asked.find((q) => q.id === e.question_id) : undefined;
      return q ? answer(q) : thread();
    }
    case "j":
    case "k":
    case DOWN:
    case UP: {
      const step = key === "j" || key === DOWN ? 1 : -1;
      // The offset of the thread counts up from the latest entry; the screen clamps the top
      if (ui.screen === "thread") return { ...ui, threadOffset: Math.max(0, ui.threadOffset - step) };
      if (ui.screen === "questions" && ui.qfocus === "history") {
        // Five fit; with more the screen shows four from the offset, and never fewer
        const past = resolved(squad).length;
        return { ...ui, historyOffset: Math.max(0, Math.min(past > 5 ? past - 4 : 0, ui.historyOffset + step)) };
      }
      if (ui.screen === "questions") {
        if (!chosen) return ui;
        return { ...ui, question: asked[Math.max(0, Math.min(asked.length - 1, asked.indexOf(chosen) + step))]!.id };
      }
      if (!rows.length) return ui;
      const at = rows.findIndex((row) => row.seq === ui.selected);
      const next = at < 0 ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, at + step));
      return { ...ui, selected: rows[next]!.seq };
    }
    case "[":
    case "]": {
      const at = squad.tickets.findIndex((t) => t.ticket_ref === threadTicket(view));
      if (ui.screen !== "thread" || at < 0) return ui;
      const next = Math.max(0, Math.min(squad.tickets.length - 1, at + (key === "]" ? 1 : -1)));
      return { ...ui, threadTicket: squad.tickets[next]!.ticket_ref, threadOffset: 0 };
    }
    case "\t":
      return { ...ui, focus: ((ui.focus + 1) % 3) as Ui["focus"] };
    case "\x1b[Z":
      return { ...ui, focus: ((ui.focus + 2) % 3) as Ui["focus"] };
    case "p":
      return { ...ui, paused: !ui.paused };
    case "t":
      return squad.feature ? { ...ui, scope: ui.scope === "feature" ? "session" : "feature", toast: null } : toast("sem feature aberta · só a sessão");
    case "b": {
      // From the tab, the blocking one after the selected in the order of the list, and around; from outside, the first
      const at = ui.screen === "questions" && chosen ? asked.indexOf(chosen) : -1;
      const q = asked.slice(at + 1).find((q) => q.blocking) ?? asked.find((q) => q.blocking);
      return q ? { ...ui, screen: "questions", question: q.id, qfocus: "list" } : toast("nenhuma bloqueante");
    }
  }
  return ui;
}
