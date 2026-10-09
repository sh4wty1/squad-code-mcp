// The main screen while the broker does not answer: the last state in gray, since when it
// is frozen and the attempt of the read. Ported from `rBrokerDown` of the prototype.

import { clock, len, type Grid } from "../grid.ts";
import type { View } from "../view.ts";
import { drawKeys } from "./chrome.ts";
import { main } from "./main.ts";

export function down(view: View): Grid {
  const { since, attempt } = view.down ?? { since: view.squad.now, attempt: 0 };
  const g = main(view);
  g.dim(2, 37);
  g.put(84 - len("○ congelado") - 2, 2, " ○ congelado ", "byellow", { bold: true });
  g.clear(29, 3, 56, 1);
  g.segs(30, 3, [["○ congelado em " + clock(since), "byellow", true], [" · último estado conhecido", "gray"]]);
  g.clear(0, 38, 120, 1);
  // ponytail: the text says 1s, the default of the interval of read; pass the interval in the View when SQUAD_POLL_INTERVAL_MS has to show here
  g.segs(1, 38, [["○ ", "bred", true], ["broker inacessível · reconexão automática a cada 1s · tentativa " + attempt, "white"], ["  · responder, gate e permissão desabilitados", "gray"]]);
  const x = drawKeys(g, 39, [["j/k", "mover"], ["enter", "abrir"], ["1-4", "telas"], ["?", "ajuda"], ["q", "sair"]]);
  g.put(x + 4, 39, "sem tecla de reconectar: a TUI tenta sozinha", "gray");
  return g;
}
