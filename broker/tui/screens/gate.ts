// The modal of a pending gate, over the main screen in gray: what the mother asks, what the
// feature did, its summary or what changed since the comment of the dev, the diff and the
// judge, and the confirmation of the approve or the field of the text of a reject or a
// comment. Ported from `gateModal` of the prototype; the gate comes from the derived squad.

import { gid } from "../../shared/contract.ts";
import type { Gate } from "../../shared/derive.ts";
import { clock, len, wrap, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { drawKeys, featureCost, tone, type Keys } from "./chrome.ts";
import { drawModal, rows, type Item } from "./modal.ts";

// The box of the modal: 80 columns from column 20, with 74 of text
const X = 20;
const BOX = 80;
const W = 74;
// The lines 2 to 37
const ROOM = 36;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const label = (name: string): Seg => [name, "gray"];

// The tickets of the latest plan not dropped, the verdicts of rework of the feature, the
// minutes from its opening to the first gate, and what it cost
function feature(g: Gate, view: View): Seg[] {
  const { squad, rows } = view;
  const live = squad.tickets.filter((t) => t.planned && !t.dropped);
  const reworks = squad.tickets.reduce((n, t) => n + t.reworks, 0);
  const opened = rows.find((row) => row.seq === squad.feature?.opened_seq)?.ts ?? g.first_ts;
  const minutes = Math.floor((g.first_ts - opened) / 60_000);
  return [
    label("feature   "),
    [`${plural(live.length, "ticket")} · ${plural(reworks, "rework")} · ${minutes} min · ≈$${featureCost(view).toFixed(2)}`, "white"],
    [" (custo est.)", "gray"],
  ];
}

// The questions of the feature by how they closed: a merged one without an answer of its
// own apart, an open one not at all
function questions(view: View): Seg[] {
  const closed = view.squad.questions.filter((q) => !q.open);
  const merged = closed.filter((q) => q.merged_into !== null && q.answered_by === null).length;
  const by = (...how: string[]) => closed.filter((q) => !(q.merged_into !== null && q.answered_by === null) && how.includes(q.resolved_by ?? "")).length;
  return [
    label("perguntas "),
    [`✓ ${by("human")} pelo dev · ${by("agent")} entre agentes`, "bgreen"],
    [`  ⟳ ${by("timeout_default", "result_default")} default aplicado`, "byellow"],
    [`  ▶ ${merged} mesclada`, "white"],
  ];
}

// A line of the diffstat as it came, with the count and the bar in their colors, and the
// mark of a line that changed since the version before
function diffLine(line: string, changed: boolean): Seg[] {
  const bar = /^([^|]*)\|(\s*\S*\s?)(\+*)(-*)(.*)$/.exec(line);
  if (!bar) return [[line, "gray"]];
  return [
    [bar[1]!, "white"],
    ["|", "gray"],
    [bar[2]!, changed ? "byellow" : "white", changed],
    [bar[3]!, "green"],
    [bar[4]!, "red"],
    [bar[5]!, "white"],
    changed && ["   ~ mudou", "byellow"],
  ];
}

// A line with `|` changed when the diffstat before did not have it and had its file
function changes(g: Gate): boolean[] {
  const lines = (g.diffstat ?? "").split("\n");
  const before = g.previous === null ? [] : g.previous.split("\n");
  const files = before.filter((line) => line.includes("|")).map((line) => line.split("|")[0]);
  return lines.map((line) => g.previous !== null && line.includes("|") && !before.includes(line) && files.includes(line.split("|")[0]));
}

// The judge of each ticket of the latest plan not dropped with a verdict, by its latest one
function judge(view: View): Seg[] {
  const { squad, rows } = view;
  const marks = squad.tickets
    .filter((t) => t.planned && !t.dropped)
    .flatMap((t): Seg[] => {
      const verdict = rows.findLast((row) => row.event.kind === "verdict" && row.event.ticket_ref === t.ticket_ref && row.event.feature_id === squad.feature?.id)?.event;
      if (verdict?.kind !== "verdict") return [];
      const ok = verdict.outcome === "approve";
      return [[`${ok ? "✓" : "✗"} ${t.ticket_ref} ${verdict.criteria.filter((c) => c.pass).length}/${verdict.criteria.length}`, ok ? "bgreen" : "bred"]];
    });
  return marks.flatMap((mark, i) => (i ? [["  "], mark] : [mark]));
}

// Draws over `g`, the main screen, the modal of `view.ui.gate`, and the keys of its mode
export function gate(g: Grid, view: View): Grid {
  const { squad, ui } = view;
  const m = ui.gate;
  const G = squad.gates.find((other) => other.id === m?.id);
  if (!m || !G) return g;
  const id = gid(G.id);
  const queue = squad.gates.filter((other) => other.pending);
  const pos = queue.findIndex((other) => other.id === G.id);
  const many = queue.length > 1;
  const reading = m.mode === "view";
  const writing = m.mode === "reject" || m.mode === "comment";
  const who = G.requested_by;

  const head: Item[] = [
    G.version > 1
      ? [[who, tone(who), true], [" reemitiu ", "white"], [id, "bwhite", true], [` com conteúdo atualizado · versão ${G.version} · ${clock(G.ts)}`, "white"]]
      : [[who, tone(who), true], [` pede aprovação antes de uma ação irreversível · ${clock(G.first_ts)}`, "white"]],
  ];
  const fila: Seg[] = [
    label("fila      "),
    ...queue.flatMap((other, i): Seg[] => [[i === pos ? "▶ " : "  ", i === pos ? "bwhite" : "gray", true], [other.summary, i === pos ? "bwhite" : "gray", i === pos], ["   "]]),
    ["antigo antes", "gray"],
  ];
  if (many) head.push(fila);
  head.push([], [label("ação      "), [G.action, "bwhite", true]], [label("efeito    "), [G.effect, "white"]], feature(G, view), questions(view));

  // The body and the diffstat give lines to the rest, from the end of each, while the box
  // would go past the lines 2 to 37
  let body = G.body ? wrap(G.body, W) : [];
  const marked = changes(G);
  let diff = G.diffstat === null ? [] : G.diffstat.split("\n");
  const build = (): Item[] => {
    const items = [...head];
    if (G.version > 1) {
      const said: Item[] = G.comment ? [[label(`seu comentário · ${clock(G.comment.ts)}`)], ...wrap(`"${G.comment.text}"`, W).map((line): Item => [[line, "bwhite"]])] : [];
      const changed: Item[] = body.length ? [[label("o que a mother mudou")], ...body.map((line): Item => [[line, "white"]])] : [];
      if (said.length || changed.length) items.push("SEP", ...said, ...changed);
    } else if (body.length) items.push("SEP", [label("resumo")], ...body.map((line): Item => [[line, "white"]]));
    if (reading) {
      if (G.diffstat !== null) items.push("SEP", [label("diff stat")], ...diff.map((line, i) => diffLine(line, marked[i]!)));
      const judged = G.scope === "delivery" ? judge(view) : [];
      if (judged.length) items.push("SEP", [label("judge     "), ...judged]);
      items.push([], [
        ["[a]", "bgreen", true], ["provar", "white"], ["      "],
        ["[r]", "bred", true], ["ejeitar", "white"], ["      "],
        ["[c]", "bblue", true], ["omentar", "white"],
        [many ? "      ] próximo  [ anterior" : "            esc fechar", "gray"],
      ]);
    } else if (G.diffstat !== null) items.push([label("diff      "), [G.diffstat.split("\n").at(-1)!.trim(), "gray"]]);
    if (m.mode === "confirm") {
      items.push(
        "SEP",
        [[`⚠ confirmar aprovação de ${id} · não dá para desfazer`, "bmagenta", true]],
        [label("  ação    "), [G.action, "bwhite", true]],
        [label("  efeito  "), [G.effect, "white"]],
        [],
        [["[y]", "bgreen", true], [" sim, aprovar e executar", "white"], ["            "], ["esc", "bwhite", true], [" voltar ao gate sem decidir", "gray"]]
      );
    } else if (writing) {
      const rejecting = m.mode === "reject";
      items.push(
        "SEP",
        [[rejecting ? `rejeitar ${id} · motivo` : `comentar ${id} · comentário`, rejecting ? "bred" : "bblue", true], [" (obrigatório)", "gray"], [rejecting ? "" : "  · o gate continua pendente", "gray"]],
        { field: m.text, rows: m.expanded ? 7 : 3, red: m.empty },
        [["⚠ fica gravado no log da feature e não pode ser apagado", "byellow"]]
      );
      if (m.empty) items.push([[`✗ ${rejecting ? "motivo" : "comentário"} obrigatório · nada foi enviado`, "bred", true]]);
    }
    return items;
  };
  let items = build();
  while (items.reduce((sum, item) => sum + rows(item), 2) > ROOM && (body.length || diff.length)) {
    if (body.length >= diff.length) body = body.slice(0, -1);
    else diff = diff.slice(0, -1);
    items = build();
  }

  g.dim();
  const at = drawModal(g, X, BOX, items, `⚠ gate ${id}${G.version > 1 ? " · atualizado" : ""}`, "bmagenta", "bmagenta", many ? ` gate ${pos + 1} de ${queue.length} ` : undefined);
  // A click on a gate of the queue goes to it; the box keeps the rest of its cells inert
  if (many) {
    let x = X + 3 + len("fila      ");
    for (const other of queue) {
      const w = Math.min(2 + len(other.summary), X + BOX - 2 - x);
      if (w > 0) g.mark(x, at[1]!, w, 1, { modal: true, gate: other.id });
      x += 2 + len(other.summary) + 3;
    }
  }
  const keys: Keys =
    m.mode === "confirm"
      ? [["y", "confirmar"], ["esc", "voltar ao gate"]]
      : writing
        ? [["enter", "enviar"], ["ctrl+e", m.expanded ? "recolher" : "expandir"], ["ctrl+u", "limpar"], ["esc", "voltar ao gate"]]
        : [["a", "aprovar"], ["r", "rejeitar"], ["c", "comentar"], ...(many ? ([["]", "próximo gate"], ["[", "anterior"]] satisfies Keys) : []), ["esc", "fechar sem decidir"]];
  drawKeys(g, 39, keys, true);
  return g;
}
