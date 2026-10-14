// The modal of a permission request, over the main screen in gray: who stopped its turn,
// its ticket, the tool, the preview of the exact command it would run, which the keys
// scroll, and what allowing or denying does; once the request was answered in the
// terminal of the agent, that it was and when the TUI learned it. Ported from `permModal`
// and `preLines` of the prototype; the request comes from the derived squad.

import { age, clock, len, wrap, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { drawKeys, statusSegs, tone, type Keys } from "./chrome.ts";
import { drawModal, type Item } from "./modal.ts";

// How many lines of the preview the modal shows, and the width of each one
export const PREVIEW_ROWS = 8;
const PREVIEW_COLS = 70;

// The box of the modal: 82 columns from column 19, with 76 of text
const X = 19;
const BOX = 82;
const W = 76;

// The lines of the preview of `text`: each line of the text in pieces of 70 characters, the
// first with the number of its line and each continuation with none. An empty line is one
// line with no text, and so is an empty text. Ported from `preLines` of the prototype.
export function preview(text: string): { n: number | null; t: string }[] {
  return text.split("\n").flatMap((line, i) => {
    const chars = [...line];
    if (!chars.length) return [{ n: i + 1, t: "" }];
    const pieces = [];
    for (let k = 0; k < chars.length; k += PREVIEW_COLS) pieces.push({ n: k ? null : i + 1, t: chars.slice(k, k + PREVIEW_COLS).join("") });
    return pieces;
  });
}

const label = (name: string): Seg => [name, "gray"];

// Draws over `g`, the main screen, the modal of `view.ui.permission`, and the keys of its state
export function permission(g: Grid, view: View): Grid {
  const { squad, ui } = view;
  const m = ui.permission;
  const r = squad.requests.find((other) => other.request.seq === m?.seq);
  const agent = squad.agents.find((a) => a.name === r?.request.from);
  if (!m || !r || !agent) return g;
  const { request } = r;
  const { name, short } = agent;
  // Answered in the terminal of the agent: no queue, and only esc
  const answered = !r.open;
  const queue = answered ? [] : squad.permissions;
  const pos = queue.findIndex((p) => p.seq === request.seq);
  const many = queue.length > 1;
  const lines = preview(request.input_preview);
  const shown = Math.min(lines.length, PREVIEW_ROWS);
  const end = lines.length - shown;
  const offset = Math.min(m.offset, end);
  const locked = !answered && offset < end;
  const ticket = squad.tickets.find((t) => t.ticket_ref === agent.ticket);

  const items: Item[] = [
    answered
      ? [[name, tone(name), true], [` pediu permissão às ${clock(request.ts)} · o pedido já foi respondido`, "white"]]
      : [[name, tone(name), true], [` parou o turno e pede permissão para usar uma tool · há ${age(Math.floor((squad.now - request.ts) / 1000))}`, "white"]],
  ];
  const tagOf = (seq: number) => {
    const other = squad.requests.find((p) => p.request.seq === seq)!;
    return `${other.label} ${squad.agents.find((a) => a.name === other.request.from)?.short ?? other.request.from} ${other.request.tool_name}`;
  };
  if (many) {
    items.push([
      label("fila      "),
      ...queue.flatMap((p, i): Seg[] => [[i === pos ? "▶ " : "  ", i === pos ? "bwhite" : "gray", true], [tagOf(p.seq), i === pos ? "bwhite" : "gray", i === pos], ["   "]]),
      ["antigo antes", "gray"],
    ]);
  }
  items.push(
    [],
    [label("agente    "), [short + " ", tone(name), true], [name, tone(name)], ["  "], ...statusSegs(agent)],
    [
      label("ticket    "),
      ...(ticket ? ([[ticket.ticket_ref, "bwhite", true], [" " + ticket.title, "white"]] satisfies Seg[]) : ([[squad.feature ? "— sem ticket" : "— sem feature aberta", "gray"]] satisfies Seg[])),
    ],
    [label("tool      "), [request.tool_name, "bwhite", true]],
    [label("descrição "), [`"${request.description}"`, "white"], ["  · texto do agente, não diz o que roda", "gray"]],
    "SEP",
    [["vai executar", "bwhite", true], ["  · a entrada exata e inteira", "gray"]],
    { pre: lines, rows: shown + 2, offset, dim: answered, title: `entrada · ${request.tool_name}` },
    "SEP"
  );
  if (answered) {
    items.push(
      [[`⚠ já respondido no terminal do ${name}`, "byellow", true]],
      [[`a TUI soube às ${clock(r.closedTs ?? request.ts)}, quando o ${name} voltou a agir. Nada foi enviado.`, "white"]],
      [["a", "gray", true], [" e ", "gray"], ["d", "gray", true], [" não valem mais · esc fecha", "gray"]]
    );
  } else {
    items.push([
      ["[a]", locked ? "gray" : "bgreen", true], [" permitir", locked ? "gray" : "white"], ["      "],
      ["[d]", "bred", true], [" negar", "white"], ["      "],
      ["esc", "bwhite", true], [" fechar · o pedido continua pendente", "gray"],
    ]);
    if (locked) items.push([["a só vale depois de ver o fim da prévia · j/k rola · G vai ao fim", "byellow"]]);
    items.push(...wrap(`a: ${name} roda o comando e segue o turno · d: recebe a recusa e escolhe outro caminho`, W).map((line): Item => [[line, "gray"]]));
  }

  g.dim();
  const at = drawModal(
    g,
    X,
    BOX,
    items,
    `⚠ permissão ${r.label} · ${short} · ${request.tool_name}`,
    "bcyan",
    "bcyan",
    many ? ` pedido ${pos + 1} de ${queue.length} ` : answered ? " resolvido no terminal " : undefined
  );
  // A click on a request of the queue goes to it; the box keeps the rest of its cells inert
  if (many) {
    let x = X + 3 + len("fila      ");
    for (const p of queue) {
      const w = Math.min(2 + len(tagOf(p.seq)), X + BOX - 2 - x);
      if (w > 0) g.mark(x, at[1]!, w, 1, { modal: true, request: p.seq });
      x += 2 + len(tagOf(p.seq)) + 3;
    }
  }
  const keys: Keys = answered
    ? [["esc", "fechar"]]
    : [
        ["a", locked ? "permitir (veja o fim)" : "permitir"],
        ["d", "negar"],
        ...(end > 0 ? ([["j/k", "rolar"], ["G", "fim"]] satisfies Keys) : []),
        ...(many ? ([["]", "próximo"], ["[", "anterior"]] satisfies Keys) : []),
        ["esc", "fechar sem decidir"],
      ];
  drawKeys(g, 39, keys, true);
  return g;
}
