// The modal of answer of a question, over the tab of questions in gray: the context, what
// was asked, the options to choose from or the field of the text, and what an answer does;
// once the broker refused the answer, the field in red and the refusal. Ported from `qModal`
// of the prototype, over `drawModal` of `modal.ts`; the question comes from the derived squad.

import { qid } from "../../shared/contract.ts";
import { effect, left } from "../asked.ts";
import { mmss, wrap, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { drawKeys } from "./chrome.ts";
import { drawModal, rows, type Item } from "./modal.ts";
import { absorbed, arrived, clip, labeled, route, ticket, waited } from "./questions.ts";

// The box of the modal: 82 columns from column 19, with 76 of text
const X = 19;
const BOX = 82;
const W = 76;

// Draws over `g`, the tab of questions, the modal of `view.ui.modal`, and the keys of its mode
export function answer(g: Grid, view: View): Grid {
  const { squad, ui } = view;
  const q = squad.questions.find((other) => other.id === ui.modal?.question);
  // Any question of the open feature, not only the ones that wait: a closed one has the modal of its refusal
  if (!ui.modal || !q) return g;
  const { choice, text, expanded, refused } = ui.modal;
  const who = q.asked_by;
  const merged = absorbed(q, squad);
  const choosing = choice !== null && q.options.length > 0;
  // Only a non-blocking question has a deadline, after which its default applies
  const fallback = q.blocking ? null : q.default;

  const context: Item[] = [
    [["contexto", "gray"]],
    ticket(q, squad),
    [["thread  ", "gray"], [`${arrived(q, squad.now)} · há ${waited(q, squad.now)}`, "white"]],
    [["rota    ", "gray"], ...route(q, "você"), merged.length > 0 && [`   (${merged.join(" · ")})`, "gray"]],
  ];
  const asks: Seg[] = [[who + " pergunta", "gray"], ["   "], q.blocking ? [`[BLOQUEANTE] só ${who} está pausado`, "bred", true] : [`não-bloqueante · ${who} segue com o default`, "byellow"]];
  const applies: Item[] =
    fallback === null ? [] : [[["default ", "gray"], [fallback, "byellow", true], [refused ? "  · aplicado (o prazo venceu)" : `  · aplicado em ${mmss(left(q, squad.now))} se você não responder`, "gray"]]];
  const refusal: Item[] = refused ? [[["✗ recusada pelo broker: ", "bred", true], [`${qid(q.id)} já fechada${fallback === null ? "" : " · default aplicado: " + fallback}`, "bred"]]] : [];
  const body: Item[] = choosing
    ? [...q.options, "outra resposta…"].map((label, i) => ({ option: i, label, chosen: i === choice, other: i === q.options.length }))
    : [
        ...applies,
        [["resposta", "gray"], [expanded ? "  (expandido · ctrl+e recolhe)" : "  (uma linha · ctrl+e expande)", "gray"]],
        { field: text, rows: expanded ? 8 : 3, red: refused },
        [["⚠ a resposta fica gravada no log e não pode ser apagada", "byellow"]],
        ...refusal,
      ];
  const does = clip(wrap(effect(q, squad), W - 8), 2, W - 8);
  // The modal and its margin have the 36 lines between the tabs and the tokens: the text and
  // the reason take what the other lines leave of the 32 inside the box
  const room = 32 - context.length - 4 - body.reduce((sum, item) => sum + rows(item), 0) - does.length;
  const said = clip(wrap(q.text, W), room - 1, W);
  const why = clip(wrap(q.why, W - 8), room - said.length, W - 8);

  g.dim();
  drawModal(
    g,
    X,
    BOX,
    [...context, ...labeled("por quê ", why), "SEP", asks, ...said.map((line): Seg[] => [[line, "bwhite", true]]), [], ...body, "SEP", ...labeled("efeito  ", does)],
    `? responder ${qid(q.id)} · ${q.blocking ? "BLOQUEANTE" : "timeout " + mmss(left(q, squad.now))}`,
    q.blocking ? "bred" : "byellow",
    "bwhite"
  );
  drawKeys(
    g,
    39,
    refused
      ? [["esc", "fechar"]]
      : choosing
        ? [[`1-${q.options.length + 1}`, "escolher"], ["↑↓", "mover"], ["enter", "confirmar"], ["esc", "cancelar"]]
        : [["enter", "enviar"], ["ctrl+e", expanded ? "recolher" : "expandir"], ["ctrl+u", "limpar"], ["esc", "cancelar"]],
    true
  );
  return g;
}
