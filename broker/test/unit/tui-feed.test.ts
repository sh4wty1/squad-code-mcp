import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { SQUAD } from "../../shared/derive.ts";
import { debt, feed, label } from "../../tui/feed.ts";

const T0 = 1791331200000;

// An event in the read format, `seq` seconds after T0
function event(seq: number, fields: Record<string, unknown>): SquadEvent {
  return {
    seq,
    ts: T0 + seq * 1000,
    feature_id: 1,
    role_from: SQUAD.find((a) => a.name === fields.from)?.role ?? fields.from,
    to: null,
    summary: "",
    body: "",
    ticket_ref: null,
    ...fields,
  } as SquadEvent;
}

const opened = (seq: number, title = "player ao vivo") => event(seq, { kind: "feature_opened", from: "mother", to: "*", title, workflow: "tlc" });
const kickoff = (seq: number) => event(seq, { kind: "task", from: "mother", to: "leader", summary: "spec" });
const plan = (seq: number, tickets: unknown[]) => event(seq, { kind: "plan", from: "leader", tickets });
const task = (seq: number, to: string, ticket_ref: string) => event(seq, { kind: "task", from: "leader", to, ticket_ref, summary: "do it" });
const result = (seq: number, from: string, ticket_ref: string) => event(seq, { kind: "result", from, to: "judge", ticket_ref, summary: "done" });
const rework = (seq: number, ticket_ref: string) =>
  event(seq, { kind: "verdict", from: "judge", to: "leader", ticket_ref, summary: "rework", outcome: "rework", result_seq: seq - 1, criteria: [] });
const joined = (seq: number, peer: string) => event(seq, { kind: "peer_joined", from: "broker", peer, role: "worker", feature_id: null });
const left = (seq: number, peer: string, reason: string) => event(seq, { kind: "peer_left", from: "broker", peer, reason, feature_id: null });
const refused = (seq: number, peer: string, error: string, attempted_kind = "task") => event(seq, { kind: "refused", from: "broker", peer, attempted_kind, error });
const usage = (seq: number, from: string) =>
  event(seq, { kind: "usage", from, session_id: "s", model: "m", input: seq, output: 0, cache_write: 0, cache_read: 0 });

const texts = (events: SquadEvent[]) => feed(events).map((row) => row.text);

test("TUI-20: every kind of message has a line with its event and the first line of the summary", () => {
  const events = [
    event(1, { kind: "task", from: "leader", to: "worker-1", summary: "player HLS\nsecond line" }),
    event(2, { kind: "result", from: "worker-1", to: "judge", summary: "4 files" }),
    event(3, { kind: "verdict", from: "judge", to: "leader", summary: "approve 1/1", outcome: "approve", result_seq: 2, criteria: [] }),
    event(4, { kind: "question", from: "worker-1", to: "leader", summary: "Q-07?", question_id: 7, asked_by: "worker-1", blocking: true, why: "" }),
    event(5, { kind: "answer", from: "human", to: "worker-1", summary: "Q-07: infinite", question_id: 7, answer: "infinite", resolved_by: "human" }),
    event(6, { kind: "answer", from: "worker-2", to: "judge", summary: "Q-11: yes", question_id: 11, answer: "yes", resolved_by: "agent" }),
    event(7, { kind: "gate", from: "mother", to: "human", summary: "G-01 delivery", gate_id: 1, scope: "delivery", action: "a", effect: "e" }),
    event(8, { kind: "gate_decision", from: "human", to: "mother", summary: "G-01 approved", gate_id: 1, decision: "approve" }),
    event(9, { kind: "permission_request", from: "worker-1", to: "human", summary: "Bash: Rodar os testes", request_id: "r", tool_name: "Bash", description: "Rodar os testes", input_preview: "bun test" }),
    event(10, { kind: "permission_decision", from: "human", to: "worker-1", summary: "allow: Bash", request_seq: 9, behavior: "allow" }),
  ];
  const rows = feed(events);
  expect(rows.map((row) => [row.seq, row.ts, row.sys, row.text])).toEqual([
    [1, T0 + 1000, undefined, "player HLS"],
    [2, T0 + 2000, undefined, "4 files"],
    [3, T0 + 3000, undefined, "approve 1/1"],
    [4, T0 + 4000, undefined, "Q-07?"],
    [5, T0 + 5000, undefined, "Q-07: infinite"],
    [6, T0 + 6000, undefined, "Q-11: yes"],
    [7, T0 + 7000, undefined, "G-01 delivery"],
    [8, T0 + 8000, undefined, "G-01 approved"],
    [9, T0 + 9000, undefined, "Bash: Rodar os testes"],
    [10, T0 + 10000, undefined, "allow: Bash"],
  ]);
  expect(rows.map((row) => row.event)).toEqual(events);
});

test("TUI-20: the short labels of the six, of the dev, and the first three characters of a name outside the squad", () => {
  expect(["mother", "leader", "worker-1", "worker-2", "worker-3", "judge"].map(label)).toEqual(["mot", "ldr", "w1", "w2", "w3", "jdg"]);
  expect(label("human")).toBe("hum");
  expect(label("reviewer-9")).toBe("rev");
  expect(label("ab")).toBe("ab");
});

test("TUI-21: an answer by default is a system line without from and to", () => {
  const asked = event(1, { kind: "question", from: "worker-2", to: "leader", question_id: 10, asked_by: "worker-2", blocking: false, why: "" });
  const forwarded = event(2, { kind: "question", from: "mother", to: "human", question_id: 10, asked_by: "worker-2", blocking: false, why: "" });
  const rows = feed([
    asked,
    forwarded,
    event(3, { kind: "answer", from: "broker", to: "worker-3", question_id: 5, answer: "HH:mm", resolved_by: "timeout_default" }),
    event(4, { kind: "answer", from: "broker", to: "worker-2", question_id: 10, answer: "as is", resolved_by: "result_default" }),
  ]);
  expect(rows.slice(2).map((row) => [row.sys, row.text])).toEqual([
    ["default", "⟳ Q-05 timeout · default aplicado: HH:mm"],
    ["default", "⟳ Q-10 fechada · w2 entregou antes da resposta"],
  ]);
});

test("TUI-22: a blocked is the line of the agent with the reason", () => {
  const rows = feed([event(1, { kind: "blocked", from: "worker-2", reason: "RADIO_API_KEY ausente", detail: "d", last_action: "l" })]);
  expect(rows.map((row) => [row.sys, row.text])).toEqual([["blocked", "⚠ w2 [blocked] RADIO_API_KEY ausente"]]);
});

test("TUI-23: equal refusals next to each other are one line with the count and the hour of the first", () => {
  const rows = feed([refused(1, "worker-1", "worker_busy"), refused(2, "leader", "ticket_dropped"), refused(3, "leader", "ticket_dropped"), refused(4, "leader", "ticket_dropped")]);
  expect(rows.map((row) => [row.seq, row.ts, row.sys, row.text, row.count, row.lastTs])).toEqual([
    [1, T0 + 1000, "refused", "✗ w1 recusado · task · worker_busy", undefined, undefined],
    [2, T0 + 2000, "refused", "✗ ldr recusado · task · ticket_dropped ×3", 3, T0 + 4000],
  ]);
  expect(texts([refused(1, "leader", "ticket_dropped"), refused(2, "leader", "ticket_dropped")])).toEqual(["✗ ldr recusado · task · ticket_dropped ×2"]);
});

test("TUI-23: a different line between two refusals keeps them apart, and so does another peer, kind or error", () => {
  expect(texts([refused(1, "leader", "ticket_dropped"), kickoff(2), refused(3, "leader", "ticket_dropped")])).toEqual([
    "✗ ldr recusado · task · ticket_dropped",
    "spec",
    "✗ ldr recusado · task · ticket_dropped",
  ]);
  expect(texts([refused(1, "leader", "e"), refused(2, "judge", "e"), refused(3, "judge", "e", "result"), refused(4, "judge", "other", "result")])).toEqual([
    "✗ ldr recusado · task · e",
    "✗ jdg recusado · task · e",
    "✗ jdg recusado · result · e",
    "✗ jdg recusado · result · other",
  ]);
});

test("TUI-24: the feature opens and closes, delivered or abandoned", () => {
  const rows = feed([
    opened(1),
    event(2, { kind: "feature_closed", from: "mother", to: "*", outcome: "delivered" }),
    { ...opened(3, "busca"), feature_id: 2 },
    event(4, { kind: "feature_closed", from: "mother", to: "*", outcome: "abandoned", feature_id: 2 }),
  ]);
  expect(rows.map((row) => [row.sys, row.text])).toEqual([
    ["opened", "▶ feature aberta · player ao vivo"],
    ["closed", "✓ feature encerrada · entregue"],
    ["opened", "▶ feature aberta · busca"],
    ["closed", "✗ feature encerrada · abandonada"],
  ]);
});

test("TUI-40: the line of a feature_closed carries the squad right before the feature closed", () => {
  const rows = feed([opened(1), kickoff(2), plan(3, [{ ticket_ref: "TKT-12", title: "player" }]), task(4, "worker-1", "TKT-12"), event(5, { kind: "feature_closed", from: "mother", to: "*", outcome: "abandoned" })]);
  const before = rows.at(-1)!.squad!;
  expect(before.feature?.title).toBe("player ao vivo");
  expect(before.now).toBe(T0 + 5000);
  expect(before.tickets.map((t) => [t.ticket_ref, t.status])).toEqual([["TKT-12", "working"]]);
  expect(rows[0]!.squad).toBeUndefined();
});

test("TUI-24: a plan is a line with its version in the feature and the tickets it keeps", () => {
  const tickets = [{ ticket_ref: "TKT-12", title: "a" }, { ticket_ref: "TKT-13", title: "b" }, { ticket_ref: "TKT-14", title: "c" }];
  const rows = feed([opened(1), plan(2, tickets), plan(3, [{ ...tickets[0], dropped: true }, tickets[1], tickets[2], { ticket_ref: "TKT-15", title: "d" }])]);
  expect(rows.slice(1).map((row) => [row.sys, row.text])).toEqual([
    ["plan", "▶ plano v1 de ldr · 3 tickets"],
    ["plan", "▶ plano v2 de ldr · 3 tickets"],
  ]);
  // The version starts again in the next feature
  const next = feed([opened(1), plan(2, tickets), event(3, { kind: "feature_closed", from: "mother", to: "*", outcome: "delivered" }), { ...opened(4), feature_id: 2 }, { ...plan(5, tickets), feature_id: 2 }]);
  expect(next.at(-1)!.text).toBe("▶ plano v1 de ldr · 3 tickets");
});

test("TUI-24: a peer enters, leaves dead or closed, and comes back to its open ticket", () => {
  const rows = feed([
    joined(1, "leader"),
    joined(2, "worker-2"),
    joined(3, "worker-3"),
    opened(4),
    plan(5, [{ ticket_ref: "TKT-13", title: "api" }]),
    task(6, "worker-2", "TKT-13"),
    left(7, "worker-2", "died"),
    left(8, "worker-3", "unregistered"),
    joined(9, "worker-2"),
    joined(10, "worker-3"),
  ]);
  expect(rows.filter((row) => row.sys === "joined" || row.sys === "left").map((row) => [row.sys, row.text])).toEqual([
    ["joined", "● ldr entrou"],
    ["joined", "● w2 entrou"],
    ["joined", "● w3 entrou"],
    ["left", "○ w2 saiu · sessão morta"],
    ["left", "○ w3 saiu · sessão encerrada"],
    ["joined", "● w2 voltou · retoma TKT-13"],
    ["joined", "● w3 voltou"],
  ]);
});

test("TUI-24: a merged question is a line with the two ids", () => {
  const rows = feed([event(1, { kind: "question_merged", from: "mother", question_id: 12, into: 7 })]);
  expect(rows.map((row) => [row.sys, row.text])).toEqual([["merged", "⟳ Q-12 mesclada em Q-07 pela mother"]]);
});

test("TUI-25: the usage that ends a turn of an agent that owes is the line of stalled, at the hour of that usage", () => {
  const events = [joined(1, "worker-2"), opened(2), plan(3, [{ ticket_ref: "TKT-13", title: "api" }]), usage(4, "worker-2"), task(5, "worker-2", "TKT-13"), event(6, { kind: "turn_started", from: "worker-2" }), usage(7, "worker-2"), result(8, "worker-2", "TKT-13"), usage(9, "worker-2")];
  const rows = feed(events).filter((row) => row.event.kind === "usage");
  // Not at 4, when it owed nothing, and not at 9, after the result
  expect(rows.map((row) => [row.seq, row.ts, row.sys, row.text])).toEqual([[7, T0 + 7000, "stalled", "‖ w2 [stalled] deve result TKT-13"]]);
});

test("TUI-25: the debt is what is owed and of which ticket or question", () => {
  expect(debt({ owes: "plan", seq: 1 })).toBe("plan");
  expect(debt({ owes: "verdict", ticket_ref: "TKT-13", seq: 1 })).toBe("verdict TKT-13");
  expect(debt({ owes: "answer", question_id: 7, seq: 1 })).toBe("answer Q-07");
});

test("TUI-25: resent usage emits one stalled line per agent and debt origin", () => {
  const events = [joined(1, "worker-2"), opened(2), plan(3, [{ ticket_ref: "TKT-13", title: "api" }]),
    task(4, "worker-2", "TKT-13"), usage(5, "worker-2"), usage(6, "worker-2"),
    result(7, "worker-2", "TKT-13"), rework(8, "TKT-13"), task(9, "worker-2", "TKT-13"),
    usage(10, "worker-2"), usage(11, "worker-2")];
  expect(feed(events).filter((r) => r.sys === "stalled").map((r) => [r.seq, r.ts, r.owes?.seq, r.text])).toEqual([
    [5, T0 + 5000, 4, "‖ w2 [stalled] deve result TKT-13"],
    [10, T0 + 10000, 9, "‖ w2 [stalled] deve result TKT-13"],
  ]);
});

test("TUI-26: the line of the limit comes right after the third verdict of rework, and not after the second", () => {
  const round = (seq: number) => [task(seq, "worker-1", "TKT-12"), result(seq + 1, "worker-1", "TKT-12"), rework(seq + 2, "TKT-12")];
  const two = [opened(1), plan(2, [{ ticket_ref: "TKT-12", title: "player" }]), ...round(3), ...round(6)];
  expect(feed(two).some((row) => row.sys === "limit")).toBe(false);
  const rows = feed([...two, ...round(9), kickoff(12)]);
  expect(rows.slice(-3).map((row) => [row.seq, row.ts, row.sys, row.text])).toEqual([
    [11, T0 + 11000, undefined, "rework"],
    [11.5, T0 + 11000, "limit", "⚠ TKT-12 no limite ⟳ 2/2 · sem 3º rework"],
    [12, T0 + 12000, undefined, "spec"],
  ]);
});

test("TUI-27: a turn_started, an unblocked, a usage of who owes nothing and an unknown kind have no line", () => {
  const rows = feed([
    joined(1, "worker-1"),
    event(2, { kind: "turn_started", from: "worker-1" }),
    event(3, { kind: "unblocked", from: "worker-1", peer: "worker-1" }),
    usage(4, "worker-1"),
    event(5, { kind: "telemetry", from: "worker-1", summary: "unknown" }),
  ]);
  expect(rows.map((row) => row.text)).toEqual(["● w1 entrou"]);
});

test("TUI-20: the lines come in the order of seq whatever the order of the log", () => {
  expect(texts([kickoff(3), opened(1), refused(2, "leader", "e")])).toEqual(["▶ feature aberta · player ao vivo", "✗ ldr recusado · task · e", "spec"]);
});
