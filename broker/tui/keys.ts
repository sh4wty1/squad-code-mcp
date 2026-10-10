// What a key does to the state of the screen. Pure: the clock is the one of the view, and a
// key is the string the terminal sends in raw mode. Ported from `onKey` and `textKeys` of
// the prototype, without the modals of gate and of permission.

import { qid } from "../shared/contract.ts";
import type { Question } from "../shared/derive.ts";
import { resolved, waiting } from "./asked.ts";
import type { FeedRow } from "./feed.ts";
import type { Color } from "./grid.ts";
import { selected } from "./screens/questions.ts";
import { threadTicket } from "./screens/thread.ts";
import type { Modal, Ui, View } from "./view.ts";
import type { Sent } from "./writer.ts";

export const START: Ui = { screen: "main", selected: null, focus: 1, paused: false, scope: "feature", toast: null, threadTicket: null, threadOffset: 0, question: null, qfocus: "list", historyOffset: 0, modal: null, send: null };

// How long a notice stays in the footer
const TOAST_MS = 4000;

const UP = "\x1b[A";
const DOWN = "\x1b[B";

const notice = (view: View, text: string, color: Color = "gray"): Ui["toast"] => ({ text, color, until: view.squad.now + TOAST_MS });

// The last offset of the history: five fit, and with more the screen shows four from the offset, never fewer
function historyEnd(view: View): number {
  const past = resolved(view.squad).length;
  return past > 5 ? past - 4 : 0;
}

// The lines of the feed to show: while it is paused, the ones it had
export function visible(ui: Ui, fresh: FeedRow[], shown: FeedRow[]): FeedRow[] {
  return ui.paused ? shown : fresh;
}

// One complete key: a CSI escape sequence, or a character
const KEY = /\x1b\[[0-9;]*[A-Za-z~]|[\s\S]/gu;

// The keys of one chunk of the input. A chunk of more than one key into the text of the
// modal is a paste: its line breaks become spaces, or one of them would send half an answer,
// and nothing erases an answer from the log.
export function keysOf(chunk: string, ui: Ui): string[] {
  const keys = chunk.match(KEY) ?? [];
  return keys.length > 1 && ui.modal?.choice === null ? keys.map((k) => (k === "\r" || k === "\n" ? " " : k)) : keys;
}

// What a key does with the modal of answer open. The answer is not sent here: it is left in
// `send`, for the loop.
function answering(ui: Ui, m: Modal, key: string, view: View): Ui | null {
  if (key === "\x03") return null;
  // No key changes the modal while the broker did not say what it did with the answer, nor
  // while it does not answer the reads: the frozen screen covers the modal
  if (m.sending || view.down) return ui;
  if (key === "\x1b") return { ...ui, modal: null };
  // Only esc closes a refused answer
  if (m.refused) return ui;
  const set = (modal: Partial<Modal>): Ui => ({ ...ui, modal: { ...m, ...modal } });
  const send = (answer: string): Ui => ({ ...ui, modal: { ...m, sending: true }, send: { question_id: m.question, answer } });
  const options = view.squad.questions.find((q) => q.id === m.question)?.options ?? [];

  if (m.choice !== null && options.length) {
    // The line after the options is `outra resposta…`: it leads to the text
    const other = options.length;
    if (/^[1-9]$/.test(key) && Number(key) <= other + 1) return set({ choice: Number(key) - 1 });
    if (key === "j" || key === DOWN) return set({ choice: Math.min(other, m.choice + 1) });
    if (key === "k" || key === UP) return set({ choice: Math.max(0, m.choice - 1) });
    if (key === "\r") return m.choice === other ? set({ choice: null, text: "" }) : send(options[m.choice]!);
    return ui;
  }
  switch (key) {
    case "\r": {
      const text = m.text.trim();
      return text ? send(text) : ui;
    }
    case "\x7f":
    case "\x08":
      return set({ text: [...m.text].slice(0, -1).join("") });
    case "\x15":
      return set({ text: "" });
    case "\x05":
      return set({ expanded: !m.expanded });
  }
  // A character that is not a control one goes to the end of the text; an arrow is not one character
  return [...key].length === 1 && !/[\x00-\x1f\x7f-\x9f]/u.test(key) ? set({ text: m.text + key }) : ui;
}

// The state after the key, or null when the key quits
export function press(ui: Ui, key: string, view: View): Ui | null {
  // With the modal open every key is its own: q, the digits and the letters are text
  if (ui.modal) return answering(ui, ui.modal, key, view);
  const { squad, rows } = view;
  const toast = (text: string, color?: Color): Ui => ({ ...ui, toast: notice(view, text, color) });
  const thread = (): Ui => ({ ...ui, screen: "thread", threadTicket: null, threadOffset: 0 });
  // The questions that wait for the dev, in the order of the tab, and the selected one
  const asked = waiting(squad);
  const chosen = selected(view);
  // The tab with the question selected and the modal of its answer: on its first option, or
  // on the text. A broker that does not answer the reads would not take the answer.
  const answer = (q: Question): Ui =>
    view.down
      ? toast("broker desconectado · responder desabilitado")
      : {
          ...ui,
          screen: "questions",
          question: q.id,
          qfocus: "list",
          modal: { question: q.id, choice: q.options.length ? 0 : null, text: "", expanded: false, sending: false, refused: false },
        };

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
      if (ui.screen === "questions" && ui.qfocus === "history") return { ...ui, historyOffset: Math.max(0, Math.min(historyEnd(view), ui.historyOffset + step)) };
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

// The state after the answer of `send` was sent, which is no longer to send. `result` is what
// the broker said of it, or null when there was no human credential to send it with.
export function settle(ui: Ui, result: Sent | null, view: View): Ui {
  const { modal: m, send } = ui;
  const idle: Ui = { ...ui, send: null };
  if (!m || !send) return idle;
  // The modal as it was before the send, to send again
  const back = (text: string): Ui => ({ ...idle, modal: { ...m, sending: false }, toast: notice(view, text, "bred") });
  if (!result) return back("✗ credencial humana não encontrada");
  if (result.ok) return { ...idle, modal: null, toast: notice(view, `✓ ${qid(send.question_id)} respondida`, "bgreen") };
  // The question closed before the answer: the modal stays with what was sent, as a text, until esc
  if (result.error === "question_closed") return { ...idle, modal: { ...m, choice: null, text: send.answer, sending: false, refused: true } };
  return back(`✗ resposta não enviada · ${result.error}`);
}

// The state after a read. The selection of the tab follows its question when the order of
// the list changes, and goes to the first when the question left it. The modal of a question
// that closed is closed and its text is lost; the one of a refused answer stays, and the one
// of an answer on its way waits for what the broker says of it.
export function sync(ui: Ui, view: View): Ui {
  const { squad } = view;
  const asked = waiting(squad);
  const question = asked.some((q) => q.id === ui.question) ? ui.question : (asked[0]?.id ?? null);
  const historyOffset = Math.min(ui.historyOffset, historyEnd(view));
  const m = ui.modal;
  const q = squad.questions.find((other) => other.id === m?.question);
  // Without its question among the ones of the open feature, no modal is drawn
  const closed = m !== null && !m.sending && (q === undefined || (!q.open && !m.refused));
  if (question === ui.question && historyOffset === ui.historyOffset && !closed) return ui;
  const next: Ui = { ...ui, question, historyOffset };
  if (!closed) return next;
  return { ...next, modal: null, toast: q?.status === "defaulted" ? notice(view, "⟳ default aplicado", "byellow") : notice(view, `${qid(m.question)} fechada`) };
}
