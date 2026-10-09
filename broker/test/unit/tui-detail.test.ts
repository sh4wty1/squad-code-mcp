import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { feed } from "../../tui/feed.ts";
import { detailLines } from "../../tui/screens/detail.ts";
import { LOGS } from "../frames/logs.ts";
import { frameView } from "../frames/view.ts";

type Change = (events: SquadEvent[]) => SquadEvent[];

// The lines of the detail of a frame as text, a separator as `---`. `selected` is the seq
// of another line of its feed.
function detail(frame: string, selected?: number | null, change?: Change): string[] {
  const view = frameView(frame, change);
  const seq = selected === undefined ? view.ui.selected : selected;
  return detailLines(view, view.rows.find((row) => row.seq === seq)).map((line) =>
    line === "SEP" ? "---" : line.map((seg) => (seg ? seg[0] : "")).join("")
  );
}

test("TUI-39: a message has its header, the body in 30 columns, the criteria, the thread of the ticket and the loadout", () => {
  expect(detail("01")).toEqual([
    "msg #0417            [verdict]",
    "de    jdg judge",
    "para  ldr leader",
    "hora  14:28:03",
    "ticket TKT-12 player de áudio",
    "rework ⟳ 1/2",
    "---",
    "TKT-12 não atende o critério",
    '"reconexão após queda do',
    'stream". Ao derrubar o HLS o',
    "player fica em erro e não",
    "tenta reconectar.",
    "Esperado: retry com backoff e",
    "retomada sem ação do usuário.",
    "",
    "critérios da spec",
    "✓ play/pause e volume",
    "✓ metadados da faixa",
    "✗ reconexão após queda",
    "✓ acessível por teclado",
    "✓ funciona no iOS",
    "---",
    "thread TKT-12 · 8 msgs",
    " 14:28 ldr→w1  [task]",
    " 14:29 w1→ldr [question]",
    " 14:29 ldr→mot [question]",
    " 14:29 mot→hum [question]",
    " 14:31 ldr→mot [question]",
    "---",
    "loadout worker-1",
    "sem loadout",
  ]);
});

test("TUI-39: the loadout is the one of the latest task of the ticket, and the selected message is marked in its thread", () => {
  const loadout: Change = (events) => events.map((e) => (e.seq === 418 ? { ...e, loadout: ["tlc-implement", "ponytail"] } : e));
  const lines = detail("01", 418, loadout);
  expect(lines.slice(-2)).toEqual(["loadout worker-1", "tlc-implement · ponytail"]);
  expect(lines).toContain("▶14:28 ldr→w1  [task]");
});

test("TUI-39: a body that does not fit is cut so that the panel keeps its 34 lines", () => {
  const long: Change = (events) => events.map((e) => (e.seq === 417 ? { ...e, body: Array.from({ length: 40 }, (_, i) => `linha ${i + 1} do corpo`).join("\n") } : e));
  const lines = detail("01", 417, long);
  expect(lines.length).toBe(34);
  // The header, the criteria, the thread and the loadout take 24: ten of the forty lines
  // of the body have room, and the last one says there is more
  expect(lines.slice(7, 17)).toEqual([...Array.from({ length: 9 }, (_, i) => `linha ${i + 1} do corpo`), "linha 10 do corpo …"]);
  expect(lines[17]).toBe("");
});

test("TUI-39: a message outside a ticket shows the scope and the messages of the feature; a seq above 9999 is shown whole", () => {
  const lines = detail("24a", 402);
  expect(lines.slice(0, 5)).toEqual(["msg #0402               [task]", "de    mot mother", "para  ldr leader", "hora  14:18:02", "escopo feature (sem ticket)"]);
  expect(lines).toContain("thread da feature · 3 msgs");
  expect(lines.slice(-2)).toEqual(["loadout leader", "sem loadout"]);
  const far: Change = (events) => [...events, { ...events.find((e) => e.seq === 402)!, seq: 12345 }];
  expect(detail("24a", 12345, far)[0]).toBe("msg #12345              [task]");
  // To or from the dev, the loadout is the one of the mother
  expect(detail("18a").slice(-2)).toEqual(["loadout mother", "sem loadout"]);
});

test("TUI-39: a blocked has since when, the ticket, the reason, the detail, the last action and how it went up", () => {
  expect(detail("10")).toEqual([
    "⚠ worker-2 [blocked]",
    "desde  14:29:41 · há 1m24s",
    "ticket TKT-13 API da setlist",
    "---",
    "motivo",
    "RADIO_API_KEY ausente",
    "GET /v1/setlist → 401. A",
    "RADIO_API_KEY não está no .env",
    "do worktree do worker-2.",
    "última ação",
    "bun test src/api, 3 tentativas",
    "---",
    "escalação",
    " 14:29 w2→ldr [question]",
    " 14:30 ldr→mot [question]",
    " 14:30 mot→hum [question]",
    "---",
    "enter thread TKT-13",
  ]);
});

test("TUI-39: who left and who came back, with the ticket and the time away", () => {
  const gone = detail("13a");
  expect(gone.slice(0, 3)).toEqual(["◌ worker-2 [offline]", "desde  14:30:12 · há 2m10s", "ticket TKT-13 parado, com w2"]);
  expect(gone).toContain("  worker-2");
  expect(gone).toContain("● w2 voltou aparece no feed");
  const closed: Change = (events) => events.map((e) => (e.kind === "peer_left" ? { ...e, reason: "unregistered" } : e));
  expect(detail("13a", 446, closed).slice(5, 8)).toEqual(["A sessão do Claude Code do", "worker-2 foi encerrada: o peer", "sumiu do broker no meio do"]);
  expect(detail("13c").slice(0, 5)).toEqual(["● worker-2 voltou", "às     14:34:05", "offline 3m53s", "ticket TKT-13 retomado", "---"]);
});

test("TUI-39: the first entry of a name lists who of the squad entered", () => {
  const lines = detail("28b");
  expect(lines.slice(0, 2)).toEqual(["● leader entrou", "às      15:02:31"]);
  expect(lines.slice(5, 12)).toEqual([
    "squad · 2 de 6 entraram",
    "○ mother   [idle]",
    "○ leader   [idle]",
    "· worker-1 [não lançado]",
    "· worker-2 [não lançado]",
    "· worker-3 [não lançado]",
    "· judge    [não lançado]",
  ]);
});

test("TUI-39: a stalled agent has since when, the ticket and what it owes", () => {
  expect(detail("23a").slice(0, 4)).toEqual(["‖ worker-2 [stalled]", "desde  14:26:00 · há 5m13s", "ticket TKT-13 API da setlist", "deve   result TKT-13"]);
  expect(detail("23a")).toContain("peça que termine o TKT-13.");
});

test("TUI-39: a plan lists its tickets, what each depends on, the ones it adds and the ones it drops", () => {
  expect(detail("24a").slice(0, 10)).toEqual([
    "▶ plano v1 · leader",
    "publicado 14:19:50",
    "evento do log, não mensagem",
    "entre peers: não tem de/para.",
    "---",
    "tickets · 3 no plano",
    "  TKT-12 player de áudio",
    "  TKT-13 API da setlist",
    "    depende de TKT-12",
    "  TKT-14 data na setlist",
  ]);
  expect(detail("25a", 469).slice(0, 12)).toEqual([
    "▶ plano v2 · leader",
    "publicado 14:51:10",
    "evento do log, não mensagem",
    "entre peers: não tem de/para.",
    "---",
    "tickets · 3 no plano",
    "✗ TKT-12 player de áudio",
    "    descartado · w1 liberado",
    "  TKT-13 API da setlist",
    "  TKT-14 data na setlist",
    "+ TKT-15 player no iOS",
    "---",
  ]);
});

test("TUI-39: a refusal has the agent, what it tried, the error, how many times and from when to when", () => {
  expect(detail("25a").slice(0, 6)).toEqual(["✗ recusa do broker", "agente ldr leader", "tentou [task]", "erro   ticket_dropped", "vezes  ×3 · 14:51:40–52:05", "---"]);
  expect(detail("25a", 470).slice(1, 5)).toEqual(["agente w1  worker-1", "tentou [task]", "erro   worker_busy", "vezes  1 · 14:51:25"]);
});

test("TUI-39: the opening of a feature has what the event has, and the feature before it", () => {
  expect(detail("26a").slice(0, 17)).toEqual([
    "▶ feature aberta · mother",
    "às       14:17:48",
    "aviso da mother a todos: sem",
    "destinatário, não acende",
    "aresta.",
    "---",
    "título",
    "player ao vivo com setlist",
    "workflow tlc",
    "branch   feat/player-ao-vivo",
    "base     main",
    "spec",
    "  .specs/features/",
    "  player-ao-vivo/spec.md",
    "commit   a3f9c21",
    "---",
    "loadout mother",
  ]);
  expect(detail("26b").slice(15, 19)).toEqual(["---", "feature anterior", "✓ player ao vivo com setlist", "  entregue 14:53:31"]);
});

test("TUI-39: the closing of a feature has the outcome, how long it took, the reason and where each ticket stopped", () => {
  const abandoned = detail("27a");
  expect(abandoned.slice(0, 4)).toEqual(["✗ feature encerrada", "desfecho abandonada", "às       14:41:12", "duração  23 min · desde 14:17"]);
  expect(abandoned.slice(10, 22)).toEqual([
    "---",
    "motivo · texto da mother",
    '"o dev trocou a prioridade; a',
    "busca de programas entra",
    'antes"',
    "---",
    "tickets no encerramento",
    "✓ TKT-13 ⟳0/2 w2",
    "✓ TKT-14 ⟳0/2 w3",
    "○ TKT-12 ⟳1/2 w1",
    "  parou em [working]",
    "---",
  ]);
  expect(detail("27b").slice(10, 13)).toEqual(["---", "motivo · texto da mother", "— não registrado · é opcional"]);
  const delivered = detail("09a", 441);
  expect(delivered.slice(0, 4)).toEqual(["✓ feature encerrada", "desfecho entregue", "às       14:53:31", "duração  36 min · desde 14:17"]);
  expect(delivered.slice(10, 15)).toEqual(["---", "tickets no encerramento", "✓ TKT-12 ⟳1/2 w1", "✓ TKT-13 ⟳0/2 w2", "✓ TKT-14 ⟳0/2 w3"]);
});

test("TUI-39: a permission request has the tool, the description, the input, and whether it is still open", () => {
  expect(detail("14").slice(0, 17)).toEqual([
    "msg #0459  [permission_request]",
    "de    w1  worker-1",
    "para  hum dev  pela TUI",
    "hora  14:30:10",
    "ticket TKT-12 player de áudio",
    "---",
    "tool  Bash",
    "descrição · texto do agente",
    '"Rodar os testes do player"',
    "vai executar",
    "bun test src/player",
    "---",
    "⚠ worker-1 [blocked x]",
    "parado há 1m30s",
    "x abre, de qualquer tela",
    "a permite   d nega",
    "---",
  ]);
  expect(detail("22h", 459).slice(11, 14)).toEqual(["---", "✓ pedido fechado", "---"]);
  // The four first lines of a long input, each cut at the width of the panel
  expect(detail("22c", 460).slice(10, 15)).toEqual(["vai executar", "curl -sS --retry 3 \\", '  -H "Authorization: Bearer $R', "ADIO_API_KEY\" \\", '  -H "Accept: application/json']);
  expect(detail("29c")[4]).toBe("ticket — sem feature aberta");
});

test("TUI-39: a default applied, a merge and the limit of rework show the line and what the event says", () => {
  expect(detail("01", 414)).toEqual(["evento do broker", "⟳ 14:25:30", "---", "Q-05 expirou 4min depois de", "chegar ao dev. worker-3 seguiu", "com o default HH:mm."]);
  expect(detail("01", 431)).toEqual(["evento do broker", "⟳ 14:31:36", "---", "⟳ Q-12 mesclada em Q-07 pela", "mother"]);
  expect(detail("15a", 453.5)).toEqual(["evento do broker", "⚠ 14:47:30", "---", "⚠ TKT-12 no limite ⟳ 2/2 · sem", "3º rework"]);
});

test("TUI-39: without a selected line the panel says so", () => {
  expect(detail("01", null)).toEqual(["nenhuma mensagem selecionada"]);
});

test("TUI-24, TUI-25: the line of a plan carries its version, the one of who left or came back its ticket, the one of stalled the debt", () => {
  const row = (frame: string, seq: number) => feed(LOGS[frame]!.events).find((r) => r.seq === seq)!;
  expect(row("25a", 405).version).toBe(1);
  expect(row("25a", 469).version).toBe(2);
  expect(row("13c", 446).ticket).toBe("TKT-13");
  expect(row("13c", 447).ticket).toBe("TKT-13");
  expect(row("13c", 4).ticket).toBeUndefined();
  expect(row("23a", 414.5).owes).toEqual({ owes: "result", ticket_ref: "TKT-13", seq: 407 });
});

test("TUI-40: without a selected line and without an open feature, the summary of the last feature", () => {
  expect(detail("09a")).toEqual([
    "nenhuma mensagem selecionada",
    "",
    "última feature",
    "✓ entregue · 14:53:31",
    "  player ao vivo com setlist",
    "---",
    "tickets · 3 de 3 aprovados",
    "✓ TKT-12 ⟳1/2 w1",
    "✓ TKT-13 ⟳0/2 w2",
    "✓ TKT-14 ⟳0/2 w3",
    "---",
    "perguntas",
    // Q-06 and Q-07 by the dev; the question of the leader to the mother and Q-11 between agents
    "✓ 2 pelo dev · 2 entre agentes",
    // Q-05 and Q-08 by timeout, Q-10 by the result
    "⟳ 3 com default aplicado",
    "▶ 1 mesclada",
    "---",
    "feature",
    // From 14:17:48 to 14:53:31
    "duração   36 min",
    // 27 until 14:31:48, then the answer of the dev, a result, two verdicts and the report
    "mensagens 32",
    // What was spent between the opening and the closing: 678000 tokens at $15 a million
    "custo     ≈$10.17 est.",
    "---",
    "j/k navega o histórico",
  ]);
});

test("TUI-40: the summary has the gate that was approved", () => {
  expect(detail("09b").slice(3, 7)).toEqual(["✓ entregue · 14:53:31", "  player ao vivo com setlist", "  G-01 aprovado 14:53:20", "---"]);
});

test("TUI-40: an abandoned feature shows the reason, or that none was given, and where each ticket stopped", () => {
  expect(detail("27c").slice(3, 14)).toEqual([
    "✗ abandonada · 14:41:12",
    "  player ao vivo com setlist",
    "  motivo",
    "  o dev trocou a prioridade; a",
    "  busca de programas entra",
    "  antes",
    "---",
    "tickets · 2 de 3 aprovados",
    "✓ TKT-13 ⟳0/2 w2",
    "✓ TKT-14 ⟳0/2 w3",
    "○ TKT-12 ⟳1/2 w1",
  ]);
  expect(detail("27c")[14]).toBe("  parou em [working]");
  expect(detail("27c").slice(-6, -2)).toEqual(["feature", "duração   23 min", "mensagens 29", "custo     ≈$8.14 est."]);
  expect(detail("27b", null).slice(3, 7)).toEqual(["✗ abandonada · 14:41:12", "  player ao vivo com setlist", "  sem motivo registrado", "---"]);
});

test("TUI-40: a log without any feature says what there is of the broker", () => {
  expect(detail("28a")).toEqual([
    "nenhuma feature ainda",
    "",
    "O log deste broker não tem",
    "feature aberta nem encerrada:",
    "não há resumo, última entrega",
    "nem ocioso desde.",
    "---",
    "sessão",
    "broker no ar —",
    "agentes      0 de 6 entraram",
    "mensagens    0",
    "---",
    "A mother abre a feature quando",
    "a spec estiver pronta; a linha",
    "0 passa a mostrá-la.",
  ]);
  // With events, the hour of the first one
  expect(detail("28b", null).slice(8, 11)).toEqual(["broker no ar 15:02:24 · há 2m16s", "agentes      2 de 6 entraram", "mensagens    0"]);
});
