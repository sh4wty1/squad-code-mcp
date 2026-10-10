// What a terminal smaller than 120×40 shows: its size and the one the screens need, in the
// middle of the grid it has. Ported from `rSmall` of the prototype.

import { grid, type Grid, type Seg } from "../grid.ts";
import { segLen } from "./chrome.ts";

export function small(cols: number, rows: number): Grid {
  const g = grid(cols, rows);
  const lines: Seg[][] = [
    [["squad-tui", "bwhite", true]],
    [],
    [["terminal pequeno demais", "byellow", true]],
    [],
    [["atual       ", "gray"], [`${cols} × ${rows}`, "bred", true]],
    [["necessário  ", "gray"], ["120 × 40", "bgreen", true]],
    [],
    [["aumente a janela ou reduza a fonte", "white"]],
    [["a tela volta sozinha ao atingir o tamanho", "gray"]],
    [],
    [["q", "bwhite", true], [" sair", "gray"]],
  ];
  const top = Math.floor((rows - lines.length) / 2);
  lines.forEach((line, i) => g.segs(Math.floor((cols - segLen(line)) / 2), top + i, line));
  return g;
}
