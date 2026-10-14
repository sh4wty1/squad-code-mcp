import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { main } from "../../tui/screens/main.ts";
import { permission } from "../../tui/screens/permission.ts";
import type { PermissionModal, View } from "../../tui/view.ts";
import { LOGS } from "../frames/logs.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

// Frame 14: worker-1 asked at 14:30:10 to run `bun test src/player`, at 14:31:40. Frame 22c: and
// worker-2 at 14:30:41 to run the command of 10 lines. Frame 22g: the judge, with no ticket of
// his own. Frame 29c: worker-1 with no open feature.
const modal = (seq: number, offset = 0): PermissionModal => ({ seq, offset, sending: false });
function draw(id: string, m: PermissionModal, change?: Change) {
  const v = frameView(id, change);
  const view: View = { ...v, ui: { ...v.ui, permission: m } };
  const g = permission(main(view), view);
  const lines = g.text();
  const y = lines.findIndex((line) => [...line].slice(19, 34).join("") === "┌─ ⚠ permissão ");
  const end = lines.findIndex((line, i) => i > y && [...line][19] === "└");
  return { g, lines, y, end, box: lines.slice(y, end + 1).map((line) => [...line.padEnd(120)].slice(19, 101).join("")) };
}

const top = (title: string, tag = "") => `┌─ ${title} `.padEnd(79 - tag.length, "─") + tag + "──┐";
const row = (text: string) => "│  " + text.padEnd(78) + "│";
const SEP = "├" + "─".repeat(80) + "┤";
const BOTTOM = "└" + "─".repeat(80) + "┘";
// The box of the preview: 76 columns from column 22
const pre = (title: string, lines: string[], bottom = "") => [
  row(`┌─ ${title} `.padEnd(75, "─") + "┐"),
  ...lines.map((line) => row("│" + line.padEnd(74) + "│")),
  row("└".padEnd(74 - bottom.length, "─") + bottom + "─┘"),
];

test("GAT-61, GAT-62, GAT-63, GAT-64: the modal of an open request of one line, with its agent blocked, its ticket and what each key does", () => {
  const { box, lines, y, end, g } = draw("14", modal(459));
  expect(box).toEqual([
    top("⚠ permissão P-01 · w1 · Bash"),
    row("worker-1 parou o turno e pede permissão para usar uma tool · há 1m30s"),
    row(""),
    row("agente    w1 worker-1  [blocked x]"),
    row("ticket    TKT-12 player de áudio"),
    row("tool      Bash"),
    row('descrição "Rodar os testes do player"  · texto do agente, não diz o que roda'),
    SEP,
    row("vai executar  · a entrada exata e inteira"),
    ...pre("entrada · Bash", ["  1 bun test src/player"]),
    SEP,
    row("[a] permitir      [d] negar      esc fechar · o pedido continua pendente"),
    row("a: worker-1 roda o comando e segue o turno · d: recebe a recusa e escolhe"),
    row("outro caminho"),
    BOTTOM,
  ]);
  // 17 lines centered in the 40, as in frame 22a
  expect([y, end]).toEqual([11, 27]);
  expect(g.rows[y]![19]!.fg).toBe("bcyan");
  expect(lines[39]).toBe(" a permitir   d negar   esc fechar sem decidir");
});

test("GAT-71: a request answered in the terminal says when the TUI learned it, with the status of the agent now, the preview in gray and only esc", () => {
  // worker-1 acts again at 14:31:02
  const back = { ...LOGS["14"]!.events.find((e) => e.kind === "turn_started" && e.from === "judge")!, seq: 460.2, from: "worker-1", role_from: "worker", ts: LOGS["14"]!.events.find((e) => e.seq === 460.1)!.ts + 6000 } as SquadEvent;
  const { box, lines, g, y } = draw("14", modal(459), (events) => [...events, back]);
  expect(box).toEqual([
    top("⚠ permissão P-01 · w1 · Bash", " resolvido no terminal "),
    row("worker-1 pediu permissão às 14:30:10 · o pedido já foi respondido"),
    row(""),
    row("agente    w1 worker-1  [working]"),
    row("ticket    TKT-12 player de áudio"),
    row("tool      Bash"),
    row('descrição "Rodar os testes do player"  · texto do agente, não diz o que roda'),
    SEP,
    row("vai executar  · a entrada exata e inteira"),
    ...pre("entrada · Bash", ["  1 bun test src/player"]),
    SEP,
    row("⚠ já respondido no terminal do worker-1"),
    row("a TUI soube às 14:31:02, quando o worker-1 voltou a agir. Nada foi enviado."),
    row("a e d não valem mais · esc fecha"),
    BOTTOM,
  ]);
  expect(lines[39]).toBe(" esc fechar");
  // The text of the preview in gray
  expect(g.rows[y + 10]![27]!.fg).toBe("gray");
  expect(draw("14", modal(459)).g.rows[y + 10]![27]!.fg).toBe("bwhite");
});

test("GAT-71, GAT-61: a request answered in the terminal while two others are open has no queue, the tag of the state and only esc", () => {
  // Frame 22c with a third request, of worker-3, and worker-1 acting again at 14:31:02
  const request = LOGS["22c"]!.events.find((e) => e.seq === 459)!;
  const { box, lines } = draw("22c", modal(459), (events) => [
    ...events,
    { ...request, seq: 500, from: "worker-3", request_id: "r500" } as SquadEvent,
    { ...request, seq: 600, ts: request.ts + 52_000, kind: "turn_started", summary: "", body: "", to: null } as SquadEvent,
  ]);
  expect(box[0]).toBe(top("⚠ permissão P-01 · w1 · Bash", " resolvido no terminal "));
  expect(box[1]).toBe(row("worker-1 pediu permissão às 14:30:10 · o pedido já foi respondido"));
  expect(box.filter((line) => line.slice(3).startsWith("fila"))).toEqual([]);
  expect(lines[39]).toBe(" esc fechar");
});

test("GAT-61, GAT-62, GAT-64: with two open requests the tag says which, the queue marks this one, and the keys go to the next and the previous", () => {
  const first = draw("22c", modal(459));
  expect(first.box[0]).toBe(top("⚠ permissão P-01 · w1 · Bash", " pedido 1 de 2 "));
  expect(first.box[2]).toBe(row("fila      ▶ P-01 w1 Bash     P-02 w2 Bash   antigo antes"));
  expect(first.lines[39]).toBe(" a permitir   d negar   ] próximo   [ anterior   esc fechar sem decidir");
  // Each request of the queue is clicked on its mark and its text
  const queue = first.g.hits[first.y + 2]!;
  expect([queue[31], queue[32], queue[45], queue[46], queue[49], queue[62], queue[63]]).toEqual([
    { modal: true },
    { modal: true, request: 459 },
    { modal: true, request: 459 },
    { modal: true },
    { modal: true, request: 460 },
    { modal: true, request: 460 },
    { modal: true },
  ]);
  const second = draw("22c", modal(460));
  expect(second.box[0]).toBe(top("⚠ permissão P-02 · w2 · Bash", " pedido 2 de 2 "));
  expect(second.box[2]).toBe(row("fila        P-01 w1 Bash   ▶ P-02 w2 Bash   antigo antes"));
  expect(second.box[7]).toBe(row("descrição \"Atualizar a fixture da setlist\"  · texto do agente, não diz o que…"));
});

test("GAT-63, GAT-64: a preview of 13 lines shows 8 from the offset, says which on its border, and a waits for the end in view", () => {
  const at = (offset: number) => draw("22c", modal(460, offset));
  const head = at(0);
  const start = head.box.findIndex((line) => line.includes("┌─ entrada · Bash"));
  expect(head.box.slice(start, start + 10)).toEqual(
    pre(
      "entrada · Bash",
      [
        "  1 curl -sS --retry 3 \\",
        '  2   -H "Authorization: Bearer $RADIO_API_KEY" \\',
        '  3   -H "Accept: application/json" \\',
        '  4   "https://api.radio89.com.br/v1/setlist?limit=50&include=artist,cover',
        '  · ,program" \\',
        "  5   | jq '[.items[] | {artist: .artist.name, track: .title, played_at, c",
        "  · over: .cover.url // null}]' \\",
        "  6   > src/api/__fixtures__/setlist.json \\",
      ],
      " 1–8 de 13 · ▼ mais abaixo "
    )
  );
  expect(head.box.slice(start + 11, start + 15)).toEqual([
    row("[a] permitir      [d] negar      esc fechar · o pedido continua pendente"),
    row("a só vale depois de ver o fim da prévia · j/k rola · G vai ao fim"),
    row("a: worker-2 roda o comando e segue o turno · d: recebe a recusa e escolhe"),
    row("outro caminho"),
  ]);
  expect(head.lines[39]).toBe(" a permitir (veja o fim)   d negar   j/k rolar   G fim   ] próximo   [ anterior   esc fechar sem decidir");
  // [a] in gray while the end is not in view
  expect(head.g.rows[head.y + start + 11]![22]!.fg).toBe("gray");
  const middle = at(3);
  expect(middle.box[start + 1]).toBe(row('│  4   "https://api.radio89.com.br/v1/setlist?limit=50&include=artist,cover│'));
  expect(middle.box[start + 9]).toBe(pre("entrada · Bash", [], " 4–11 de 13 · ▼ mais abaixo ")[1]!);
  expect(middle.lines[39]).toBe(head.lines[39]);
  const tail = at(5);
  expect(tail.box[start + 8]).toBe(row("│  · xas\"".padEnd(75) + "│"));
  expect(tail.box[start + 9]).toBe(pre("entrada · Bash", [], " 6–13 de 13 · fim ")[1]!);
  expect(tail.box.slice(start + 11, start + 13)).toEqual([row("[a] permitir      [d] negar      esc fechar · o pedido continua pendente"), row("a: worker-2 roda o comando e segue o turno · d: recebe a recusa e escolhe")]);
  expect(tail.g.rows[tail.y + start + 11]![22]!.fg).toBe("bgreen");
  expect(tail.lines[39]).toBe(" a permitir   d negar   j/k rolar   G fim   ] próximo   [ anterior   esc fechar sem decidir");
});

// The request of frame 14 with another command
const command = (text: string): Change => (events) => events.map((e) => (e.kind === "permission_request" ? ({ ...e, input_preview: text } as SquadEvent) : e));
const numbered = (n: number) => Array.from({ length: n }, (_, i) => `linha ${i + 1}`).join("\n");

test("GAT-63, GAT-64: with 8 lines the preview has them all and no count on its border, and with 9 the count from the first and at the end", () => {
  const eight = draw("14", modal(459), command(numbered(8)));
  const start = eight.box.findIndex((line) => line.includes("┌─ entrada · Bash"));
  expect(eight.box.slice(start, start + 10)).toEqual(pre("entrada · Bash", Array.from({ length: 8 }, (_, i) => `  ${i + 1} linha ${i + 1}`)));
  expect(eight.lines[39]).toBe(" a permitir   d negar   esc fechar sem decidir");
  const nine = draw("14", modal(459), command(numbered(9)));
  expect(nine.box[start + 9]).toBe(pre("entrada · Bash", [], " 1–8 de 9 · ▼ mais abaixo ")[1]!);
  expect(nine.box[start + 12]).toBe(row("a só vale depois de ver o fim da prévia · j/k rola · G vai ao fim"));
  expect(nine.lines[39]).toBe(" a permitir (veja o fim)   d negar   j/k rolar   G fim   esc fechar sem decidir");
  const end = draw("14", modal(459, 1), command(numbered(9)));
  expect(end.box.slice(start + 8, start + 10)).toEqual([row("│  9 linha 9".padEnd(75) + "│"), pre("entrada · Bash", [], " 2–9 de 9 · fim ")[1]!]);
  expect(end.lines[39]).toBe(" a permitir   d negar   j/k rolar   G fim   esc fechar sem decidir");
});

test("GAT-94: an empty preview is one line with its number and no text, with the end in view", () => {
  const { box, lines } = draw("14", modal(459), command(""));
  const start = box.findIndex((line) => line.includes("┌─ entrada · Bash"));
  expect(box.slice(start, start + 3)).toEqual(pre("entrada · Bash", ["  1 "]));
  expect(box[start + 4]).toBe(row("[a] permitir      [d] negar      esc fechar · o pedido continua pendente"));
  expect(lines[39]).toBe(" a permitir   d negar   esc fechar sem decidir");
});

test("GAT-62, GAT-95: the ticket of an agent without one in the open feature, and of a request with no open feature", () => {
  expect(draw("22g", modal(461)).box[4]).toBe(row("ticket    — sem ticket"));
  const none = draw("29c", modal(487));
  expect(none.box.slice(0, 5)).toEqual([
    top("⚠ permissão P-01 · w1 · Bash"),
    row("worker-1 parou o turno e pede permissão para usar uma tool · há 2m38s"),
    row(""),
    row("agente    w1 worker-1  [blocked x]"),
    row("ticket    — sem feature aberta"),
  ]);
});
