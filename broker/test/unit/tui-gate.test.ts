import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { gate } from "../../tui/screens/gate.ts";
import { main } from "../../tui/screens/main.ts";
import type { GateModal, View } from "../../tui/view.ts";
import { LOGS } from "../frames/logs.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

// The log of frame 19a, at 14:52:35: the feature of the three tickets approved, G-01 asked at
// 14:51:58 and G-02 at 14:52:30. `only` leaves G-01 alone, without body and diffstat unless
// the test gives them.
const G02 = LOGS["19a"]!.events.find((e) => e.kind === "gate" && e.gate_id === 2)!;
const BARE = { body: "", diffstat: undefined };
const only = (fields: Record<string, unknown> = {}, more: SquadEvent[] = []): Change => (events) => [
  ...events.filter((e) => e !== G02).map((e) => (e.kind === "gate" && e.gate_id === 1 ? ({ ...e, ...BARE, ...fields } as SquadEvent) : e)),
  ...more,
];

const modal = (id: number, more: Partial<GateModal> = {}): GateModal => ({ id, mode: "view", text: "", expanded: false, empty: false, sending: false, version: 1, ...more });
function draw(m: GateModal, change?: Change) {
  const v = frameView("19a", change);
  const view: View = { ...v, ui: { ...v.ui, gate: m } };
  const g = gate(main(view), view);
  const lines = g.text();
  const y = lines.findIndex((line) => [...line].slice(20, 33).join("") === "┌─ ⚠ gate G-0");
  const end = lines.findIndex((line, i) => i > y && [...line][20] === "└");
  return { g, lines, y, end, box: lines.slice(y, end + 1).map((line) => [...line.padEnd(120)].slice(20, 100).join("")) };
}

// The lines of the box: its top with the title and the tag, a line of text, a separator and its bottom
const top = (title: string, tag = "") => `┌─ ${title} `.padEnd(77 - tag.length, "─") + tag + "──┐";
const row = (text: string) => "│  " + text.padEnd(76) + "│";
const SEP = "├" + "─".repeat(78) + "┤";
const BOTTOM = "└" + "─".repeat(78) + "┘";

const DIFF = [" src/a.ts | 10 ++++++++--", " src/b.ts |  2 +-", " 2 files changed, 9 insertions(+), 3 deletions(-)"].join("\n");
const HEAD = [
  row("mother pede aprovação antes de uma ação irreversível · 14:51:58"),
  row(""),
  row("ação      merge feat/player-ao-vivo → main"),
  row("efeito    deploy automático em produção"),
  row("feature   3 tickets · 1 rework · 34 min · ≈$10.17 (custo est.)"),
  row("perguntas ✓ 2 pelo dev · 2 entre agentes  ⟳ 3 default aplicado  ▶ 1 mescla…"),
];
const SUMMARY = [SEP, row("resumo"), row("O player está pronto."), row("O judge aprovou os três tickets.")];
const BODY = "O player está pronto.\nO judge aprovou os três tickets.";

test("GAT-41, GAT-42, GAT-43, GAT-44, GAT-45, GAT-46, GAT-47, GAT-49: the view mode of a delivery gate of version 1, with its summary, its diffstat and the judge", () => {
  const { g, box, y, end, lines } = draw(modal(1), only({ body: BODY, diffstat: DIFF }));
  expect(box).toEqual([
    top("⚠ gate G-01"),
    ...HEAD,
    ...SUMMARY,
    SEP,
    row("diff stat"),
    row(" src/a.ts | 10 ++++++++--"),
    row(" src/b.ts |  2 +-"),
    row(" 2 files changed, 9 insertions(+), 3 deletions(-)"),
    SEP,
    row("judge     ✓ TKT-12 5/5  ✓ TKT-13 1/1  ✓ TKT-14 1/1"),
    row(""),
    row("[a]provar      [r]ejeitar      [c]omentar            esc fechar"),
    BOTTOM,
  ]);
  // 21 lines centered in the 40
  expect([y, end]).toEqual([9, 29]);
  expect(lines[39]).toBe(" a aprovar   r rejeitar   c comentar   esc fechar sem decidir");
  // Over the main screen in gray: outside the box and its margin, nothing keeps its color
  const lit = g.rows.slice(0, 39).flatMap((cells, i) => cells.flatMap((cell, x) => ((x < 19 || x > 100 || i < y - 1 || i > end + 1) && cell.ch !== " " && cell.fg !== "gray" ? [`${i}:${x}`] : [])));
  expect(lit).toEqual([]);
  expect(g.rows[y]![20]!.fg).toBe("bmagenta");
  // Outside the box a click is esc; inside, nothing
  expect([g.hits[0]![0], g.hits[y + 1]![30]]).toEqual([{ modal: true, key: "\x1b" }, { modal: true }]);
});

test("GAT-51: the confirm mode has the last line of the diffstat in place of it, and asks to confirm the action and its effect", () => {
  const { box, lines } = draw(modal(1, { mode: "confirm" }), only({ body: BODY, diffstat: DIFF }));
  expect(box).toEqual([
    top("⚠ gate G-01"),
    ...HEAD,
    ...SUMMARY,
    row("diff      2 files changed, 9 insertions(+), 3 deletions(-)"),
    SEP,
    row("⚠ confirmar aprovação de G-01 · não dá para desfazer"),
    row("  ação    merge feat/player-ao-vivo → main"),
    row("  efeito  deploy automático em produção"),
    row(""),
    row("[y] sim, aprovar e executar            esc voltar ao gate sem decidir"),
    BOTTOM,
  ]);
  expect(lines[39]).toBe(" y confirmar   esc voltar ao gate");
});

// The field of the text in the box: its 74 columns from column 23
const field = (lines: string[]) => lines.map((line) => "│  " + line + "  │");
const count = (n: number) => "└".padEnd(72 - ` ${n} chars `.length, "─") + ` ${n} chars ` + "─┘";

test("GAT-53: the mode of the text of a reject has the field of 3 lines and the warning that the text stays in the log", () => {
  const { box, lines } = draw(modal(1, { mode: "reject", text: "sem changelog" }), only({ body: BODY, diffstat: DIFF }));
  expect(box).toEqual([
    top("⚠ gate G-01"),
    ...HEAD,
    ...SUMMARY,
    row("diff      2 files changed, 9 insertions(+), 3 deletions(-)"),
    SEP,
    row("rejeitar G-01 · motivo (obrigatório)"),
    ...field(["┌" + "─".repeat(72) + "┐", "│ " + "sem changelog█".padEnd(71) + "│", count(13)]),
    row("⚠ fica gravado no log da feature e não pode ser apagado"),
    BOTTOM,
  ]);
  expect(lines[39]).toBe(" enter enviar   ctrl+e expandir   ctrl+u limpar   esc voltar ao gate");
});

test("GAT-53: the comment says the gate stays pending, and expanded the field has 7 lines with the last 5 of the text", () => {
  const text = Array.from({ length: 7 }, (_, i) => `linha${i + 1}`.padEnd(69, "x")).join(" ");
  const { box, lines } = draw(modal(1, { mode: "comment", text, expanded: true }), only({ body: BODY, diffstat: DIFF }));
  const at = box.indexOf(row("comentar G-01 · comentário (obrigatório)  · o gate continua pendente"));
  expect(at).toBeGreaterThan(0);
  expect(box.slice(at + 1, at + 9)).toEqual([
    ...field([
      "┌" + "─".repeat(72) + "┐",
      ...[3, 4, 5, 6].map((i) => "│ " + `linha${i}`.padEnd(69, "x").padEnd(71) + "│"),
      "│ " + (`linha7`.padEnd(69, "x") + "█").padEnd(71) + "│",
      count(text.length),
    ]),
    row("⚠ fica gravado no log da feature e não pode ser apagado"),
  ]);
  expect(lines[39]).toBe(" enter enviar   ctrl+e recolher   ctrl+u limpar   esc voltar ao gate");
});

test("GAT-56: enter on an empty text paints the field in red and says below the warning that nothing was sent", () => {
  for (const [mode, said] of [["reject", "✗ motivo obrigatório · nada foi enviado"], ["comment", "✗ comentário obrigatório · nada foi enviado"]] as const) {
    const { g, box, y } = draw(modal(1, { mode, empty: true }), only({ body: BODY, diffstat: DIFF }));
    const warning = box.indexOf(row("⚠ fica gravado no log da feature e não pode ser apagado"));
    expect(box.slice(warning, warning + 3)).toEqual([row("⚠ fica gravado no log da feature e não pode ser apagado"), row(said), BOTTOM]);
    // The top border of the field, three lines above the warning
    expect(g.rows[y + warning - 3]![23]!.fg).toBe("bred");
    const { g: ok } = draw(modal(1, { mode }), only({ body: BODY, diffstat: DIFF }));
    expect(ok.rows[y + warning - 2]![23]!.fg).toBe("bcyan");
  }
});

test("GAT-41, GAT-42, GAT-49: with two pending gates the tag says which, the queue marks this one, and the keys go to the next and the previous", () => {
  const first = draw(modal(1));
  expect(first.box[0]).toBe(top("⚠ gate G-01", " gate 1 de 2 "));
  expect(first.box[2]).toBe(row("fila      ▶ G-01 entrega final     G-02 excluir branch antiga   antigo ant…"));
  expect(first.box.at(-2)).toBe(row("[a]provar      [r]ejeitar      [c]omentar      ] próximo  [ anterior"));
  expect(first.lines[39]).toBe(" a aprovar   r rejeitar   c comentar   ] próximo gate   [ anterior   esc fechar sem decidir");
  // Each gate of the queue is clicked on its mark and its summary
  const queue = first.g.hits[first.y + 2]!;
  expect([queue[32], queue[33], queue[52], queue[53], queue[56], queue[83], queue[84]]).toEqual([
    { modal: true },
    { modal: true, gate: 1 },
    { modal: true, gate: 1 },
    { modal: true },
    { modal: true, gate: 2 },
    { modal: true, gate: 2 },
    { modal: true },
  ]);
  const second = draw(modal(2));
  expect(second.box[0]).toBe(top("⚠ gate G-02", " gate 2 de 2 "));
  expect(second.box[2]).toBe(row("fila        G-01 entrega final   ▶ G-02 excluir branch antiga   antigo ant…"));
});

test("GAT-41, GAT-42: with G-01 approved and G-02 and G-03 pending, the tag counts the queue of the pending, not every gate", () => {
  const G03 = { ...G02, seq: 458.5, ts: G02.ts + 2000, gate_id: 3, summary: "G-03 chave" } as SquadEvent;
  const approved = { ...G02, seq: 458.6, ts: G02.ts + 3000, from: "human", role_from: "human", to: "mother", kind: "gate_decision", gate_id: 1, decision: "approve", summary: "G-01 aprovado", body: "" } as SquadEvent;
  const { box } = draw(modal(2), (events) => [...events, G03, approved]);
  expect(box[0]).toBe(top("⚠ gate G-02", " gate 1 de 2 "));
  expect(box[2]).toBe(row("fila      ▶ G-02 excluir branch antiga     G-03 chave   antigo antes"));
});

test("GAT-45, GAT-46, GAT-47: an action gate without diffstat has no diff and no judge, and one without body no summary", () => {
  const { box } = draw(modal(2));
  expect(box.slice(3)).toEqual([
    row(""),
    row("ação      git push origin --delete feat/player-v0"),
    row("efeito    a branch abandonada some do remoto, sem volta"),
    row("feature   3 tickets · 1 rework · 34 min · ≈$10.17 (custo est.)"),
    row("perguntas ✓ 2 pelo dev · 2 entre agentes  ⟳ 3 default aplicado  ▶ 1 mescla…"),
    SEP,
    row("resumo"),
    row("G-02: peço aprovação para excluir do remoto a branch abandonada"),
    row("feat/player-v0."),
    row(""),
    row("[a]provar      [r]ejeitar      [c]omentar      ] próximo  [ anterior"),
    BOTTOM,
  ]);
  // A delivery gate without body and diffstat: the judge follows the questions
  const bare = draw(modal(1), only({ body: "" }));
  expect(bare.box.slice(6)).toEqual([row("perguntas ✓ 2 pelo dev · 2 entre agentes  ⟳ 3 default aplicado  ▶ 1 mescla…"), SEP, row("judge     ✓ TKT-12 5/5  ✓ TKT-13 1/1  ✓ TKT-14 1/1"), row(""), row("[a]provar      [r]ejeitar      [c]omentar            esc fechar"), BOTTOM]);
  // And in the confirm mode, without diffstat, no line of the diff
  expect(draw(modal(1, { mode: "confirm" }), only({ body: "" })).box[7]).toBe(SEP);
});

test("GAT-47: the judge of a ticket is its latest verdict, ✗ for a rework; without any verdict there is no judge", () => {
  const verdict = LOGS["19a"]!.events.find((e) => e.kind === "verdict" && e.ticket_ref === "TKT-14")!;
  const rework = { ...verdict, seq: 438.5, outcome: "rework", criteria: [{ n: 1, text: "horário legível na setlist", pass: false }] } as SquadEvent;
  expect(draw(modal(1), only({ body: "" }, [rework])).box[8]).toBe(row("judge     ✓ TKT-12 5/5  ✓ TKT-13 1/1  ✗ TKT-14 0/1"));
  const none = draw(modal(1), (events) => only({ body: "" })(events).filter((e) => e.kind !== "verdict"));
  expect(none.box.slice(6, 9)).toEqual([row("perguntas ✓ 2 pelo dev · 2 entre agentes  ⟳ 3 default aplicado  ▶ 1 mescla…"), row(""), row("[a]provar      [r]ejeitar      [c]omentar            esc fechar")]);
});

test("GAT-43: ticket and rework take the plural with a number other than 1", () => {
  const plan = LOGS["19a"]!.events.find((e) => e.kind === "plan")!;
  const one = { ...plan, tickets: [{ ticket_ref: "TKT-12", title: "player de áudio" }] } as SquadEvent;
  expect(draw(modal(1), (events) => only()(events).map((e) => (e === plan ? one : e))).box[5]).toBe(row("feature   1 ticket · 1 rework · 34 min · ≈$10.17 (custo est.)"));
  const verdict = LOGS["19a"]!.events.find((e) => e.kind === "verdict" && e.outcome === "rework")!;
  const again = { ...verdict, seq: 419.5, ticket_ref: "TKT-14" } as SquadEvent;
  expect(draw(modal(1), only({}, [again])).box[5]).toBe(row("feature   3 tickets · 2 reworks · 34 min · ≈$10.17 (custo est.)"));
  expect(draw(modal(1), (events) => only()(events).filter((e) => e !== verdict)).box[5]).toBe(row("feature   3 tickets · 0 reworks · 34 min · ≈$10.17 (custo est.)"));
});

test("GAT-43: a ticket the latest plan dropped is not counted", () => {
  const plan = LOGS["19a"]!.events.find((e) => e.kind === "plan")! as SquadEvent & { tickets: object[] };
  const four = { ...plan, tickets: [...plan.tickets, { ticket_ref: "TKT-15", title: "x", dropped: true }] } as SquadEvent;
  expect(draw(modal(1), (events) => only()(events).map((e) => (e === plan ? four : e))).box[5]).toBe(row("feature   3 tickets · 1 rework · 34 min · ≈$10.17 (custo est.)"));
});

test("GAT-44: a merged question with an answer of its own counts once, by its resolved_by, and not as merged", () => {
  // The mother answers Q-12, merged into Q-07 at 14:31:36, to the leader
  const between = LOGS["19a"]!.events.find((e) => e.kind === "answer" && e.seq === 404)!;
  const own = { ...between, seq: 431.5, ts: between.ts + 751_000, ticket_ref: "TKT-12", question_id: 12 } as SquadEvent;
  expect(draw(modal(1), only({}, [own])).box[6]).toBe(row("perguntas ✓ 2 pelo dev · 3 entre agentes  ⟳ 3 default aplicado  ▶ 0 mescla…"));
});

test("GAT-44: an open question counts in none of the four", () => {
  // At 14:32:07 Q-07 and Q-08 wait for the dev, and Q-12 is merged into Q-07
  const v = frameView("01", (events) => [...events, { ...LOGS["19a"]!.events.find((e) => e.kind === "gate" && e.gate_id === 1)!, seq: 432.5 } as SquadEvent]);
  const view: View = { ...v, ui: { ...v.ui, gate: modal(1) } };
  const lines = gate(main(view), view).text();
  expect(lines.some((line) => line.includes("perguntas ✓ 1 pelo dev · 2 entre agentes  ⟳ 2 default aplicado  ▶ 1 mescla…"))).toBe(true);
});

// The comment of 18a, and G-01 asked again at 14:55:40
const COMMENT = { ...LOGS["18a"]!.events.find((e) => e.kind === "gate_decision")!, text: "Confirme o autoplay." } as SquadEvent;
const G01 = LOGS["19a"]!.events.find((e) => e.kind === "gate" && e.gate_id === 1)!;
const again = (fields: Record<string, unknown>) => ({ ...G01, ...BARE, seq: 457, ts: G01.ts + 222_000, ...fields }) as SquadEvent;
const V2 = [" src/a.ts | 12 ++++++++++--", " src/b.ts |  2 +-", " src/c.ts |  1 +", " 3 files changed, 12 insertions(+), 3 deletions(-)"].join("\n");

test("GAT-41, GAT-42, GAT-45, GAT-46, GAT-48: version 2 is updated, with the comment of the dev, what the mother changed, and the line of the diffstat that changed", () => {
  const { box } = draw(modal(1, { version: 2 }), only({ body: BODY, diffstat: DIFF }, [COMMENT, again({ body: "+ o autoplay espera um gesto", diffstat: V2 })]));
  expect(box).toEqual([
    top("⚠ gate G-01 · atualizado"),
    row("mother reemitiu G-01 com conteúdo atualizado · versão 2 · 14:55:40"),
    ...HEAD.slice(1),
    SEP,
    row("seu comentário · 14:53:02"),
    row('"Confirme o autoplay."'),
    row("o que a mother mudou"),
    row("+ o autoplay espera um gesto"),
    SEP,
    row("diff stat"),
    row(" src/a.ts | 12 ++++++++++--   ~ mudou"),
    row(" src/b.ts |  2 +-"),
    row(" src/c.ts |  1 +"),
    row(" 3 files changed, 12 insertions(+), 3 deletions(-)"),
    SEP,
    row("judge     ✓ TKT-12 5/5  ✓ TKT-13 1/1  ✓ TKT-14 1/1"),
    row(""),
    row("[a]provar      [r]ejeitar      [c]omentar            esc fechar"),
    BOTTOM,
  ]);
});

test("GAT-45: version 2 without a comment has only what the mother changed, and without a body nothing of it", () => {
  const { box } = draw(modal(1, { version: 2 }), only({}, [again({ body: "+ outra coisa" })]));
  expect(box.slice(7, 10)).toEqual([SEP, row("o que a mother mudou"), row("+ outra coisa")]);
  const bare = draw(modal(1, { version: 2 }), only({}, [again({ body: "" })]));
  expect(bare.box.slice(6, 9)).toEqual([row("perguntas ✓ 2 pelo dev · 2 entre agentes  ⟳ 3 default aplicado  ▶ 1 mescla…"), SEP, row("judge     ✓ TKT-12 5/5  ✓ TKT-13 1/1  ✓ TKT-14 1/1")]);
});

test("GAT-93: an action, an effect and a line of the diffstat too long are cut inside the box, and the body is broken", () => {
  const long = "x".repeat(90);
  const { box } = draw(modal(1), only({ action: long, effect: long, body: "a ".repeat(50).trim(), diffstat: ` ${long} | 1 +` }));
  expect(box[3]).toBe(row("ação      " + "x".repeat(64) + "…"));
  expect(box[4]).toBe(row("efeito    " + "x".repeat(64) + "…"));
  expect(box.slice(9, 11)).toEqual([row("a ".repeat(37).trim()), row("a ".repeat(13).trim())]);
  expect(box[13]).toBe(row(" " + "x".repeat(73) + "…"));
});

test("GAT-93: a body and a diffstat that do not fit in the lines 2 to 37 lose lines from the end of each", () => {
  const body = Array.from({ length: 30 }, (_, i) => `corpo ${i + 1}`).join("\n");
  const diff = Array.from({ length: 30 }, (_, i) => ` f${i + 1}.ts | 1 +`).join("\n");
  const { box, y, end } = draw(modal(1), only({ body, diffstat: diff }));
  // 36 lines from line 2: 14 of the box are not the body nor the diffstat, 20 are
  expect([y, end]).toEqual([2, 37]);
  const shown = box.filter((line) => /corpo|\.ts/.test(line));
  expect(shown).toEqual([...Array.from({ length: 10 }, (_, i) => row(`corpo ${i + 1}`)), ...Array.from({ length: 10 }, (_, i) => row(` f${i + 1}.ts | 1 +`))]);
});

test("GAT-93: with a body and a diffstat of as many lines, the body gives up a line first, so an odd number of lines to cut leaves it one line shorter", () => {
  const body = Array.from({ length: 30 }, (_, i) => `corpo ${i + 1}`).join("\n");
  const diff = Array.from({ length: 30 }, (_, i) => ` f${i + 1}.ts | 1 +`).join("\n");
  // G-02 stays pending: the line of the queue leaves 19 lines to the body and the diffstat, 41 to cut
  const { box, y, end } = draw(modal(1), (events) => events.map((e) => (e.kind === "gate" && e.gate_id === 1 ? ({ ...e, body, diffstat: diff } as SquadEvent) : e)));
  expect([y, end]).toEqual([2, 37]);
  const shown = box.filter((line) => /corpo|\.ts \|/.test(line));
  expect(shown).toEqual([...Array.from({ length: 9 }, (_, i) => row(`corpo ${i + 1}`)), ...Array.from({ length: 10 }, (_, i) => row(` f${i + 1}.ts | 1 +`))]);
});
