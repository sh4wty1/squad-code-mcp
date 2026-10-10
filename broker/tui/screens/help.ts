// The legend of colors, statuses and glyphs, and the keys. Ported from `rHelp` of the
// prototype, without what is of the slices Question and Gate: the keys of the modals, the
// focus on the history of questions and the line of a permission closed in the terminal.

import type { AgentStatus, TicketStatus } from "../../shared/derive.ts";
import { grid, pad, type Grid, type Seg } from "../grid.ts";
import type { View } from "../view.ts";
import { chrome, drawRows, STATUS, TICKET_TONE, type Keys, type Line } from "./chrome.ts";

const KEYS: Keys = [
  ["esc", "voltar"],
  ["q", "sair"],
];

const agent = (glyph: string, status: AgentStatus, says: string): Seg[] => [[glyph + " ", STATUS[status][0], true], [pad(`[${status}]`, 13), STATUS[status][0]], [says, "white"]];
const tickets = (a: TicketStatus, aSays: string, b: TicketStatus, bSays: string): Seg[] => [[pad(`[${a}]`, 12), TICKET_TONE[a]], [pad(aSays, 16), "white"], [pad(`[${b}]`, 12), TICKET_TONE[b]], [bSays, "white"]];
const key = (keys: string, does: string): Seg[] => [[pad(keys, 12), "bwhite", true], [does, "white"]];

const LEGEND: Line[] = [
  [["papéis", "gray"]],
  [["● ", "magenta", true], ["mother ", "magenta", true], ["magenta   ", "gray"], ["● ", "cyan", true], ["leader ", "cyan", true], ["ciano   ", "gray"], ["● ", "green", true], ["worker-n ", "green", true], ["verde", "gray"]],
  [["● ", "yellow", true], ["judge  ", "yellow", true], ["amarelo   ", "gray"], ["● ", "bwhite", true], ["dev    ", "bwhite", true], ["branco  ", "gray"], ["⚠ ", "bred", true], ["erro     ", "bred", true], ["vermelho", "gray"]],
  [["status do agente", "gray"], [" · do mais forte ao mais fraco", "gray"]],
  agent("◌", "offline", "sessão morta · relançar com o mesmo nome"),
  agent("⚠", "blocked", "impedimento externo · resolve fora"),
  [["⚠ ", "bred", true], ["[blocked ", "bred"], ["x", "bwhite", true], ["]  ", "bred"], ["permissão pendente · sai com tecla", "white"]],
  [["? ", "bred", true], ["[waiting ", "white"], ["?", "bred", true], ["]  ", "white"], ["pergunta bloqueante sua", "white"]],
  agent("○", "waiting", "aguarda outro agente"),
  agent("‖", "stalled", "turno acabou devendo · ir ao terminal"),
  agent("●", "working", "em turno"),
  agent("✓", "done", "tickets do plano mais recente aprovados"),
  agent("○", "idle", "sem ticket · sem feature, todos menos ⚠ ◌"),
  [["· ", "gray", true], ["[não lançado] ", "gray"], ["nunca entrou · ≠ offline", "white"]],
  [["status do ticket", "gray"], [" · dropped vence qualquer regra", "gray"]],
  tickets("planned", "sem task ainda", "working", "executando"),
  tickets("review", "com o judge", "waiting", "aguarda resposta"),
  tickets("blocked", "dono impedido", "escalated", "estourou ⟳ 2/2"),
  tickets("done", "aprovado", "dropped", "saiu do plano"),
  [["kinds", "gray"]],
  [["[task]", "bblue"], [" "], ["[result]", "white"], [" "], ["[verdict]", "byellow"], [" "], ["[question]", "bwhite"], [" "], ["[answer]", "blue"]],
  [["[gate]", "bmagenta"], [" "], ["[gate_decision]", "bmagenta"], [" "], ["[permission_request]", "bcyan"]],
  [["[permission_decision]", "cyan"], ["  decisões: ", "gray"], ["✓", "bgreen", true], [" ", "gray"], ["✗", "bred", true], [" comentário", "bwhite"]],
  [["linhas de sistema", "gray"]],
  [[pad("▶ plano v1 de ldr", 27), "cyan", true], ["✗ w1 recusado · erro ×3", "bred"]],
  [[pad("‖ w2 [stalled] deve result", 27), "byellow", true], ["⟳ Q-05 default aplicado", "byellow"]],
  [[pad("⚠ w2 [blocked] credencial", 27), "bred", true], ["⚠ TKT-12 no limite ⟳ 2/2", "bred", true]],
  [["○ w2 saiu", "red"], [" · ", "gray"], ["● w2 voltou", "bgreen"]],
  [[pad("● ldr entrou", 27), "bgreen"], ["▶ feature aberta · título", "bmagenta", true]],
  [["feature encerrada · ", "white"], ["✓ entregue", "bgreen", true], ["  "], ["✗ abandonada", "byellow", true]],
  [["● ○ ▶ ✓ ✗ ⟳ ⚠", "bwhite"], ["   extras ", "gray"], ["?", "bred", true], [" pergunta  ", "white"], ["◌", "red", true], [" offline  ", "white"], ["‖", "byellow", true], [" parado", "white"]],
  [["≈", "bwhite", true], [" custo estimado   ", "white"], ["━━", "bcyan", true], [" aresta ativa   ", "white"], ["broker ", "gray"], ["○", "bred", true], [" congela", "white"]],
];

// Each key where the frame has it: the lines of what is not of this slice stay empty
const SHORTCUTS: Line[] = [
  [["global", "gray"]],
  key("1 2 3 4", "principal · topologia · thread · perguntas"),
  key("g", "abrir o gate pendente mais antigo"),
  key("x", "abrir o pedido de permissão mais antigo"),
  key("p", "pausar / retomar o feed"),
  key("t", "rodapé: tokens da feature ↔ da sessão"),
  key("? · q", "ajuda · sair (o broker segue rodando)"),
  [],
  [["navegação", "gray"]],
  key("tab ⇧tab", "painel seguinte / anterior"),
  key("j k ↑ ↓", "mover seleção"),
  key("enter · esc", "abrir · voltar / fechar modal"),
  [],
  [["perguntas", "gray"]],
  key("b", "ir direto à próxima bloqueante"),
  key("enter", "responder a selecionada"),
  ...Array.from({ length: 15 }, (): Seg[] => []),
  [["a TUI escreve três coisas: respostas a", "gray"]],
  [["perguntas, decisões de gate e decisões de", "gray"]],
  [["pedido de permissão. O resto é leitura do broker.", "gray"]],
];

export function help(view: View): Grid {
  const g = grid();
  chrome(g, view, "help", KEYS);
  g.box(0, 2, 60, 36, "bwhite", "cores, status e glifos", "bwhite");
  g.box(60, 2, 60, 36, "gray", "atalhos de teclado", "bwhite");
  drawRows(g, 2, 3, 36, LEGEND, 0, 60, "gray");
  drawRows(g, 62, 3, 36, SHORTCUTS, 60, 60, "gray");
  return g;
}
