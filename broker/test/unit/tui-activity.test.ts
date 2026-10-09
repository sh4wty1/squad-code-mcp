import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { squad } from "../../shared/derive.ts";
import { activity, refs, right, seals } from "../../tui/activity.ts";
import { feed } from "../../tui/feed.ts";
import { LOGS } from "../frames/logs.ts";

// The state of a frame of the prototype, with more events or only the first ones
function state(frame: string, change: (events: SquadEvent[]) => SquadEvent[] = (events) => events) {
  const { now, selected } = LOGS[frame]!;
  const events = change(LOGS[frame]!.events);
  const derived = squad(events, now);
  const rows = feed(events);
  const of = (short: string) => activity(derived.agents.find((a) => a.short === short)!, derived, rows);
  return { squad: derived, rows, selected, text: (short: string) => of(short).text, of };
}

const more = (...fields: Record<string, unknown>[]) => (events: SquadEvent[]) => [
  ...events,
  ...fields.map((f, i) => ({ ...events.at(-1)!, seq: 900 + i, to: null, ticket_ref: null, summary: "", ...f }) as SquadEvent),
];
const gate = { kind: "gate", from: "mother", role_from: "mother", to: "human", gate_id: 1, scope: "delivery", action: "a", effect: "e" };

test("TUI-35: who never entered and who has no feature", () => {
  expect(state("28a").text("w1")).toBe("nunca entrou");
  // No feature in the whole log: the same text for every role
  expect(["mot", "ldr"].map(state("28b").text)).toEqual(["sem feature", "sem feature"]);
  // A feature closed before: one text per role
  expect(["mot", "ldr", "w1", "jdg"].map(state("09a").text)).toEqual(["sem feature", "sem tickets", "sem ticket", "sem review"]);
});

test("TUI-35: blocked by a permission request, waiting for its blocking question or stalled, the agent shows its ticket", () => {
  expect(state("14").text("w1")).toBe("TKT-12");
  expect(state("01").text("w1")).toBe("TKT-12");
  expect(state("23a").text("w2")).toBe("TKT-13");
  // Without a ticket of its own, the text of the rule that follows
  expect(state("15a").text("ldr")).toBe("escalou TKT-12");
  expect(state("22g").text("jdg")).toBe("rev TKT-13");
});

test("TUI-35: the mother", () => {
  expect(state("18a").text("mot")).toBe("G-01 com o dev");
  expect(state("10").text("mot")).toBe("Q-09 → dev");
  expect(state("01").text("mot")).toBe("2 perguntas → dev");
  expect(state("15a").text("mot")).toBe("decide TKT-12");
  const held = more({ kind: "question", from: "leader", role_from: "leader", to: "mother", question_id: 20, asked_by: "leader", blocking: false, why: "" });
  expect(state("24a", held).text("mot")).toBe("decide Q-20");
  expect(state("24a").text("mot")).toBe("aguarda squad");
  expect(state("26a").text("mot")).toBe("feature aberta");
});

test("TUI-35: the leader", () => {
  expect(state("10").text("ldr")).toBe("escalou TKT-13");
  const asked = more({ kind: "question", from: "leader", role_from: "leader", to: "mother", question_id: 20, asked_by: "leader", blocking: false, why: "" });
  expect(state("24a", asked).text("ldr")).toBe("escalou Q-20");
  // After the kickoff and before the plan
  expect(state("24a", (events) => events.filter((e) => e.seq < 405)).text("ldr")).toBe("planejando");
  expect(state("26a").text("ldr")).toBe("sem tarefa ainda");
  expect(state("24a").text("ldr")).toBe("plano v1 · 3 tickets");
  expect(state("24c").text("ldr")).toBe("plano v2 · 4 tickets");
  expect(state("19a").text("ldr")).toBe("3/3 tickets");
  expect(state("14").text("ldr")).toBe("TKT-12/13");
  expect(state("25a").text("ldr")).toBe("TKT-15");
});

test("TUI-35: the worker, with the reworks of the ticket in the text", () => {
  expect(state("10").of("w1")).toEqual({ text: "TKT-12", rework: 1, left: null });
  expect(state("14").of("w2")).toEqual({ text: "TKT-13 review", rework: null, left: null });
  expect(state("23a").of("w1")).toEqual({ text: "TKT-12 aguarda ldr", rework: 1, left: null });
  expect(state("15a").of("w1")).toEqual({ text: "TKT-12 aguarda ldr", rework: 2, left: null });
  expect(state("01").of("w3")).toEqual({ text: "TKT-14 ✓", rework: null, left: null });
  expect(state("19a").of("w1")).toEqual({ text: "TKT-12 ✓", rework: 1, left: null });
  expect(state("13a").text("w2")).toBe("TKT-13 parado");
  expect(state("24a").text("w1")).toBe("sem ticket");
  expect(state("25a").text("w1")).toBe("sem ticket");
});

test("TUI-35: the judge", () => {
  expect(state("01").text("jdg")).toBe("rev TKT-13");
  expect(state("19a").text("jdg")).toBe("7/7 critérios");
  expect(state("10").text("jdg")).toBe("sem review");
});

test("TUI-35: the time left of a non-blocking question of the agent that reached the dev", () => {
  // Q-08 reached the dev at 14:31:15 with 240 s; the frame is at 14:32:07
  expect(state("01").of("w2")).toEqual({ text: "TKT-13 review", rework: null, left: 188 });
  expect(state("01").of("w1").left).toBeNull();
});

test("TUI-35: references with the same prefix are joined, the others are separated by a space", () => {
  expect(refs(["TKT-12", "TKT-13", "TKT-14"])).toBe("TKT-12/13/14");
  expect(refs(["TKT-12"])).toBe("TKT-12");
  expect(refs(["TKT-12", "API-3"])).toBe("TKT-12 API-3");
  expect(refs(["alpha", "beta"])).toBe("alpha beta");
});

test("TUI-41: one seal alone takes the long form", () => {
  const one = (frame: string, change?: (events: SquadEvent[]) => SquadEvent[]) => {
    const s = state(frame, change);
    return seals(s.squad, s.rows);
  };
  expect(one("01")).toEqual([]);
  expect(one("10")).toEqual([["⚠ w2 bloqueado · RADIO_API_KEY ausente", "bred"]]);
  expect(one("13a")).toEqual([["◌ w2 offline · sessão morta", "red"]]);
  expect(one("13a", (events) => events.map((e) => (e.kind === "peer_left" ? { ...e, reason: "unregistered" } : e)))).toEqual([["◌ w2 offline · sessão encerrada", "red"]]);
  expect(one("23a")).toEqual([["‖ w2 parado · deve result TKT-13", "byellow"]]);
  expect(one("15a")).toEqual([["⚠ TKT-12 escalado à mother", "bred"]]);
  expect(one("14")).toEqual([["⚠ permissão w1 · x", "bcyan"]]);
  expect(one("22c")).toEqual([["⚠ 2 permissões · x", "bcyan"]]);
  expect(one("18a")).toEqual([["⚠ gate G-01 pendente · g", "bmagenta"]]);
  expect(one("19a")).toEqual([["⚠ 2 gates pendentes · g", "bmagenta"]]);
});

test("TUI-41: more than one seal take the short form, in the order of the design", () => {
  const all = (frame: string, change?: (events: SquadEvent[]) => SquadEvent[]) => {
    const s = state(frame, change);
    return seals(s.squad, s.rows).map(([text]) => text);
  };
  expect(all("29a")).toEqual(["⚠ w2 bloqueado", "◌ w3 offline"]);
  expect(all("22g")).toEqual(["⚠ permissão jdg · x", "⚠ gate G-02 pendente · g"]);
  expect(all("23a", more(gate))).toEqual(["‖ w2 parado", "⚠ gate G-01 pendente · g"]);
  expect(all("15a", more(gate))).toEqual(["⚠ TKT-12 escalado", "⚠ gate G-01 pendente · g"]);
  // blocked, offline, stalled, permission and gate together
  const left = { kind: "peer_left", from: "broker", role_from: "broker", peer: "worker-3", reason: "died" };
  const blocked = { kind: "blocked", from: "worker-1", role_from: "worker", reason: "sem rede", detail: "", last_action: "" };
  const asked = { kind: "permission_request", from: "judge", role_from: "judge", to: "human", request_id: "r", tool_name: "Bash", description: "d", input_preview: "i" };
  expect(all("23a", more(left, blocked, asked, gate))).toEqual(["⚠ w1 bloqueado", "◌ w3 offline", "‖ w2 parado", "⚠ permissão jdg · x", "⚠ gate G-01 pendente · g"]);
});

test("TUI-41: the right side of the footer is the first of the list that exists", () => {
  const side = (frame: string, ui: Record<string, unknown> = {}) => {
    const s = state(frame);
    return right(s.squad, s.rows, { toast: null, selected: s.selected, ...ui });
  };
  // 1. the notice of a key, until its time
  const now = LOGS["10"]!.now;
  expect(side("10", { toast: { text: "chega com a fatia Gate", color: "gray", until: now + 1 } })).toEqual([["chega com a fatia Gate", "gray"]]);
  expect(side("10", { toast: { text: "chega com a fatia Gate", color: "gray", until: now } })).toEqual([["⚠ w2 bloqueado há 1m24s", "bred"]]);
  // 2. the alerts of agents
  expect(side("13a")).toEqual([["◌ w2 offline há 2m10s", "red"]]);
  expect(side("23a")).toEqual([["‖ w2 parado há 5m13s", "byellow"]]);
  expect(side("14")).toEqual([["⚠ w1 bloqueado há 1m30s", "bred"]]);
  expect(side("22c")).toEqual([["⚠ 2 bloqueados por permissão", "bred"]]);
  expect(side("29a")).toEqual([["⚠ w2", "bred"], [" ◌ w3", "red"], [" · ", "gray"], ["○ ocioso desde 14:53", "gray"]]);
  // Without an open feature the age gives its place to the idle hour, as in frame 29c
  expect(side("29c")).toEqual([["⚠ w1 bloqueado", "bred"], [" · ", "gray"], ["○ ocioso desde 14:53", "gray"]]);
  // An alert comes before a gate
  expect(side("22g")).toEqual([["⚠ jdg bloqueado há 17s", "bred"]]);
  // 3. the pending gate, the oldest
  expect(side("19a")).toEqual([["⚠ G-01 aguarda você", "bmagenta"]]);
  // 4. no open feature
  expect(side("09a")).toEqual([["○ ocioso desde 14:53", "gray"]]);
  expect(side("28a")).toEqual([["○ nenhuma feature ainda", "gray"]]);
  // 5. the reworks of the ticket of the selected line
  expect(side("01")).toEqual([["rework TKT-12 ⟳ 1/2", "byellow"]]);
  expect(side("24b")).toEqual([["rework TKT-12 ⟳ 0/2", "gray"]]);
  expect(side("15a")).toEqual([["rework TKT-12 ⟳ 2/2 limite", "bred"]]);
  // 6. a line without ticket, or no line
  expect(side("24a")).toEqual([["rework —", "gray"]]);
  expect(side("01", { selected: null })).toEqual([["rework —", "gray"]]);
});
