import { expect, test } from "bun:test";
import type { GateRow } from "../../db.ts";
import type { Caller } from "../../send.ts";
import { gates } from "../../shared/derive.ts";
import { HUMAN_TOKEN, LEADER, MOTHER, OPENED, setup, WORKER_1 } from "./helpers.ts";

// The seed of the first sequence; the one of index i runs with SEED + i, so a failure is
// replayed alone by its seed
const SEED = 20261014;
const SEQUENCES = 200;
const STEPS = 40;

const TICKETS = ["T-1", "T-2"];

// mulberry32, as in question-replay.test.ts
function prng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What the sequences did, all together: a generator that stopped reaching a route, a refusal
// or a status would leave the comparison with nothing to compare
function tally() {
  return {
    accepted: {} as Record<string, number>,
    refused: new Set<string>(),
    statuses: new Set<string>(),
    // gates rejected by the close of their feature, by outcome
    closedPending: new Set<string>(),
  };
}

type Broker = ReturnType<typeof setup>;

// GAT-30: the seven fields of each gate of each feature, from the log and from the table
function compareGates(b: Broker) {
  const table = b.gateRows() as unknown as GateRow[];
  const events = b.log.after(0);
  const features = (b.db.query("SELECT id FROM features ORDER BY id").all() as { id: number }[]).map((f) => f.id);
  for (const feature of features) {
    const derived = gates(events.filter((e) => e.feature_id === feature)).map((g) => ({
      id: g.id,
      requested_by: g.requested_by,
      scope: g.scope,
      commit: g.commit,
      status: g.status,
      request_seq: g.request_seq,
      decision_seq: g.decision_seq,
    }));
    const stored = table
      .filter((row) => row.feature_id === feature)
      .map(({ feature_id, ...row }) => row);
    expect(derived.sort((x, y) => x.id - y.id)).toEqual(stored);
  }
  expect(table.filter((row) => !features.includes(row.feature_id))).toEqual([]);
}

function run(seed: number, seen: ReturnType<typeof tally>) {
  const random = prng(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const chance = (p: number) => random() < p;
  const b = setup();
  const steps: string[] = [];

  function call(step: string, body: unknown, fn: () => unknown) {
    const answer = fn() as { ok: boolean; error?: string };
    steps.push(`${step} ${JSON.stringify(body)} → ${answer.ok ? "ok" : answer.error}`);
    if (answer.ok) seen.accepted[step] = (seen.accepted[step] ?? 0) + 1;
    else seen.refused.add(`${step.split(" ")[0]} ${answer.error}`).add(`${step} ${answer.error}`);
    return answer;
  }

  const rows = () => b.gateRows() as unknown as GateRow[];

  // The id of a gate for a call: a pending one most of the time, any one of any feature
  // otherwise, and now and then a value that is the id of none
  function anId(): unknown {
    const all = rows();
    if (all.length === 0 || chance(0.06)) return pick([0, 99, "1", null]);
    const open = all.filter((g) => g.status === "pending");
    return pick(open.length > 0 && chance(0.75) ? open : all).id;
  }

  function open() {
    const mother = { ...MOTHER, cwd: "/repo", git_root: "/repo/.git" };
    const answer = call("open", {}, () => b.feature.open(mother, OPENED));
    // with a plan of open tickets now and then: a delivery waits for them
    if (answer.ok && chance(0.5)) b.given.plan(TICKETS.map((ticket_ref) => ({ ticket_ref, title: ticket_ref })));
  }

  // The tickets of the plan approved, as the rules would leave them
  function approveTickets() {
    for (const ref of TICKETS) b.given.verdict(ref, b.given.result(ref, "worker-1", b.given.task(ref, "worker-1")), "approve");
    steps.push("approve the tickets");
  }

  function request() {
    const peer: Caller = chance(0.94) ? MOTHER : pick([LEADER, WORKER_1]);
    const scope = chance(0.95) ? pick(["delivery", "action"]) : "deploy";
    const body: Record<string, unknown> = {
      scope,
      summary: chance(0.96) ? "ship it" : "x".repeat(81),
      action: "merge",
      effect: "main gets it",
    };
    if (scope !== "action" ? chance(0.94) : chance(0.4)) body.commit = pick(["abc1234", "def5678"]);
    if (chance(0.3)) body.diffstat = " 1 file changed";
    // asked again, the one the dev commented most of the time
    if (chance(0.4)) body.gate_id = anId();
    call(body.gate_id === undefined ? "request" : "reissue", body, () => b.gate.request(peer, body));
  }

  function decide() {
    const decision = chance(0.95) ? pick(["approve", "reject", "comment"]) : "bogus";
    const gate_id = anId();
    // the version the gate has now most of the time, otherwise one before it (GAT-98)
    const now = rows().find((g) => g.id === gate_id)?.request_seq ?? 1;
    const body: Record<string, unknown> = {
      human_token: chance(0.95) ? HUMAN_TOKEN : "wrong",
      gate_id,
      request_seq: chance(0.9) ? now : now - 1,
      decision,
    };
    if (decision === "approve" ? chance(0.3) : chance(0.94)) body.text = pick(["looks good", "not this", " "]);
    call(`decide ${decision}`, { ...body, human_token: body.human_token === HUMAN_TOKEN ? "right" : "wrong" }, () => b.gate.decide(body));
  }

  function close() {
    const outcome = pick(["delivered", "abandoned"]);
    const pending = rows().filter((g) => g.status === "pending" && g.feature_id === b.log.openFeature()?.id);
    const answer = call("close", { outcome }, () => b.feature.close(MOTHER, { outcome }));
    if (answer.ok && pending.length > 0) seen.closedPending.add(outcome);
  }

  const STEP: [() => void, number][] = [
    [request, 30],
    [decide, 34],
    [close, 8],
    [open, 3],
    [approveTickets, 4],
  ];
  const total = STEP.reduce((sum, [, weight]) => sum + weight, 0);

  function step() {
    // with no feature open almost every call is refused: one opens soon
    if (!b.log.openFeature() && chance(0.5)) return open();
    let roll = random() * total;
    for (const [fn, weight] of STEP) {
      if ((roll -= weight) < 0) return fn();
    }
  }

  function compare() {
    compareGates(b);
    const table = rows();
    // no row leaves the table, and no id is given twice
    expect(table.map((row) => row.id)).toEqual(table.map((_, i) => i + 1));
    // GAT-24: no gate has two final decisions
    const finals = b.log.after(0).filter((e) => e.kind === "gate_decision" && e.decision !== "comment");
    expect(new Set(finals.map((e) => (e.kind === "gate_decision" ? e.gate_id : 0))).size).toBe(finals.length);
    for (const row of table) seen.statuses.add(row.status);
  }

  try {
    compare();
    for (let i = 0; i < STEPS; i++) {
      step();
      compare();
    }
  } catch (e) {
    throw new Error(
      `seed ${seed}: the table and the log differ after step ${steps.length}\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n${e instanceof Error ? e.message : String(e)}`
    );
  } finally {
    b.db.close();
  }
}

test("GAT-30/24: after each step of 200 generated sequences of 40 calls, the gates of each feature are what its log derives, and no gate has two final decisions", () => {
  const seen = tally();
  for (let i = 0; i < SEQUENCES; i++) run(SEED + i, seen);

  // The sequences went through every route, asked again, decided again and closed both ways
  const accepted = ["open", "request", "reissue", "decide approve", "decide reject", "decide comment", "close"];
  expect(accepted.filter((s) => !seen.accepted[s])).toEqual([]);
  expect(
    [
      "request edge_not_allowed",
      "request missing_field",
      "request invalid_field",
      "request no_open_feature",
      "reissue invalid_field",
      "reissue gate_closed",
      "reissue tickets_open",
      "request tickets_open",
      "decide invalid_token",
      "decide missing_field",
      "decide invalid_field",
      "decide approve gate_closed",
      "decide reject gate_closed",
      "decide approve gate_reissued",
      "close gate_required",
    ].filter((s) => !seen.refused.has(s))
  ).toEqual([]);
  expect([...seen.statuses].sort()).toEqual(["approved", "pending", "rejected"]);
  expect([...seen.closedPending].sort()).toEqual(["abandoned", "delivered"]);
}, 60000);
