import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadHumanToken } from "../../permission.ts";
import { HUMAN_TOKEN, JUDGE, NOW, setup, WORKER_1, WORKER_2 } from "./helpers.ts";

const REQUEST = {
  request_id: "abcde",
  tool_name: "Bash",
  description: "run the tests",
  input_preview: '{"command":"bun test"}',
};

type Broker = ReturnType<typeof setup>;

function decide(b: Broker, request_seq: unknown, behavior: unknown = "allow", fields: Record<string, unknown> = {}) {
  return b.permission.decision({ human_token: HUMAN_TOKEN, request_seq, behavior, ...fields });
}

// Runs a decision that has to be refused: the answer is the refusal with a hint, and
// neither the log nor the deliveries change. The human is not a peer: no `refused`.
function refusedDecision(b: Broker, call: () => unknown, error: string) {
  const events = b.events();
  const deliveries = b.deliveries();
  const answer = call() as { ok: boolean; error: string; hint: string };
  expect({ ...answer, hint: typeof answer.hint }).toEqual({ ok: false, error, hint: "string" });
  expect(answer.hint).not.toBe("");
  expect(b.events()).toEqual(events);
  expect(b.deliveries()).toEqual(deliveries);
}

// A directory of the test for the credential file: never the home of the user
function withTokenFile(run: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "squad-token-"));
  try {
    run(join(dir, "human.token"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("EVT-62: loadHumanToken creates the file with a token of 32 characters or more and answers the same one afterwards", () => {
  withTokenFile((path) => {
    expect(existsSync(path)).toBe(false);
    const token = loadHumanToken(path);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(readFileSync(path, "utf8")).toBe(token);
    expect(loadHumanToken(path)).toBe(token);
    expect(readFileSync(path, "utf8")).toBe(token);
  });
});

test("EVT-62: loadHumanToken creates a different token for each file", () => {
  withTokenFile((first) => {
    withTokenFile((second) => {
      expect(loadHumanToken(first)).not.toBe(loadHumanToken(second));
    });
  });
});

test("EVT-62: loadHumanToken reuses the token of a file that exists, and replaces an empty file", () => {
  withTokenFile((path) => {
    writeFileSync(path, "a-token-the-dev-put-there-0123456789\n");
    expect(loadHumanToken(path)).toBe("a-token-the-dev-put-there-0123456789");
    expect(readFileSync(path, "utf8")).toBe("a-token-the-dev-put-there-0123456789\n");

    writeFileSync(path, "\n");
    const token = loadHumanToken(path);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(readFileSync(path, "utf8")).toBe(token);
  });
});

test("EVT-60: a permission request is stored addressed to the human, with its four fields in data and no delivery", () => {
  const b = setup();
  const id = b.openFeature();
  b.clock.now = NOW + 25;
  const answer = b.permission.request(WORKER_1, { ...REQUEST, to: "leader", summary: "s", body: "b", ticket_ref: "A", extra: 1 });
  expect(answer).toEqual({ ok: true, seq: 1 });
  expect(b.events()).toEqual([
    {
      seq: 1,
      ts: NOW + 25,
      kind: "permission_request",
      feature_id: id,
      from_name: "worker-1",
      role_from: "worker",
      to_name: "human",
      summary: "Bash: run the tests",
      body: '{"command":"bun test"}',
      ticket_ref: null,
      question_id: null,
      gate_id: null,
      data: REQUEST,
    },
  ]);
  expect(b.deliveries()).toEqual([]);
});

test("EVT-60: the summary of a request is the first 80 characters of tool_name and description", () => {
  const b = setup();
  // "Bash: " and 74 characters make 80, kept whole; one more is cut
  const exact = "d".repeat(74);
  b.permission.request(WORKER_1, { ...REQUEST, description: exact });
  b.permission.request(WORKER_1, { ...REQUEST, description: exact + "e" });
  b.permission.request(WORKER_1, { ...REQUEST, tool_name: "T".repeat(90), description: "" });
  b.permission.request(WORKER_1, { ...REQUEST, description: "", input_preview: "" });
  expect(b.events().map((e) => e.summary)).toEqual([`Bash: ${exact}`, `Bash: ${exact}`, "T".repeat(80), "Bash: "]);
  expect(b.events()[0]!.summary).toHaveLength(80);
  // data and body are not cut
  expect(b.events()[1]!.data.description).toBe(exact + "e");
  expect(b.events()[2]!.data.tool_name).toBe("T".repeat(90));
  expect(b.events()[3]!.body).toBe("");
});

test("EVT-61: a request without request_id and tool_name as non-empty strings, or description and input_preview as strings, is refused with missing_field", () => {
  const b = setup();
  const no = (fields: Record<string, unknown>) =>
    b.refusedWith(() => b.permission.request(WORKER_1, { ...REQUEST, ...fields }), "worker-1", "permission_request", "missing_field");
  for (const value of [undefined, null, "", 8]) {
    no({ request_id: value });
    no({ tool_name: value });
  }
  for (const value of [undefined, null, 8, { text: "x" }]) {
    no({ description: value });
    no({ input_preview: value });
  }
});

test("EVT-66: a decision with the human credential is stored from the human to the peer of the request, with a pending delivery", () => {
  const b = setup();
  const id = b.openFeature();
  const asked = b.permission.request(WORKER_1, REQUEST) as { seq: number };
  b.clock.now = NOW + 3000;
  const answer = decide(b, asked.seq, "allow", { to: "leader", from: "worker-1", summary: "s", body: "b", ticket_ref: "A" });
  expect(answer).toEqual({ ok: true, seq: 2 });
  expect(b.events()[1]).toEqual({
    seq: 2,
    ts: NOW + 3000,
    kind: "permission_decision",
    feature_id: id,
    from_name: "human",
    role_from: "human",
    to_name: "worker-1",
    summary: "allow: Bash",
    body: "",
    ticket_ref: null,
    question_id: null,
    gate_id: null,
    data: { request_seq: 1, behavior: "allow" },
  });
  expect(b.deliveries()).toEqual([{ event_seq: 2, recipient: "worker-1", acked_at: null }]);
  expect(b.log.pending("worker-1").map((e) => e.seq)).toEqual([2]);
});

test("EVT-66: a decision of deny is stored, with the first 80 characters of behavior and tool_name as summary", () => {
  const b = setup();
  b.permission.request(JUDGE, { ...REQUEST, tool_name: "T".repeat(74) });
  b.permission.request(WORKER_2, { ...REQUEST, tool_name: "T".repeat(74) });
  // "deny: " and 74 characters make 80, kept whole; "allow: " makes 81 and is cut
  expect(decide(b, 1, "deny")).toEqual({ ok: true, seq: 3 });
  expect(decide(b, 2, "allow")).toEqual({ ok: true, seq: 4 });
  expect(b.events().slice(2).map((e) => [e.to_name, e.summary, e.data])).toEqual([
    ["judge", `deny: ${"T".repeat(74)}`, { request_seq: 1, behavior: "deny" }],
    ["worker-2", `allow: ${"T".repeat(73)}`, { request_seq: 2, behavior: "allow" }],
  ]);
  expect(b.events()[2]!.summary).toHaveLength(80);
  expect(b.events()[3]!.summary).toHaveLength(80);
});

test("EVT-59: without an open feature the request and the decision are stored with feature_id null", () => {
  const b = setup();
  expect(b.permission.request(WORKER_1, REQUEST)).toEqual({ ok: true, seq: 1 });
  expect(decide(b, 1)).toEqual({ ok: true, seq: 2 });
  // and a request of a feature that closed is decided in none
  const old = b.openFeature();
  expect(b.permission.request(WORKER_2, REQUEST)).toEqual({ ok: true, seq: 3 });
  b.closeFeature(old);
  expect(decide(b, 3, "deny")).toEqual({ ok: true, seq: 4 });
  expect(b.events().map((e) => [e.kind, e.feature_id])).toEqual([
    ["permission_request", null],
    ["permission_decision", null],
    ["permission_request", old],
    ["permission_decision", null],
  ]);
});

test("EVT-65: a decision without the human credential is refused with invalid_token and leaves no event", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  for (const human_token of [undefined, null, "", "wrong", HUMAN_TOKEN + "x", HUMAN_TOKEN.slice(1), 7, [HUMAN_TOKEN]]) {
    refusedDecision(b, () => b.permission.decision({ human_token, request_seq: 1, behavior: "allow" }), "invalid_token");
  }
  refusedDecision(b, () => b.permission.decision({ request_seq: 1, behavior: "allow" }), "invalid_token");
  // the request is still open
  expect(decide(b, 1)).toEqual({ ok: true, seq: 2 });
});

test("EVT-65: invalid_token comes before any other refusal", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  decide(b, 1);
  // missing fields, invalid fields and a closed request
  refusedDecision(b, () => b.permission.decision({}), "invalid_token");
  refusedDecision(b, () => b.permission.decision({ human_token: "wrong", request_seq: "1" }), "invalid_token");
  refusedDecision(b, () => b.permission.decision({ human_token: "wrong", request_seq: 99, behavior: "maybe" }), "invalid_token");
  refusedDecision(b, () => b.permission.decision({ human_token: "wrong", request_seq: 1, behavior: "allow" }), "invalid_token");
});

test("EVT-62: the human credential is in no answer and in no event", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  const answers = [
    decide(b, 1),
    decide(b, 1),
    decide(b, "1"),
    decide(b, 1, "maybe"),
    b.permission.decision({ human_token: "wrong", request_seq: 1, behavior: "allow" }),
  ];
  expect(answers.map((a) => a.ok)).toEqual([true, false, false, false, false]);
  expect(JSON.stringify(answers)).not.toContain(HUMAN_TOKEN);
  expect(JSON.stringify(b.events())).not.toContain(HUMAN_TOKEN);
});

test("EVT-63: a decision without request_seq as an integer or behavior as a string is refused with missing_field", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  for (const request_seq of [undefined, null, "1", 1.5, [1]]) {
    refusedDecision(b, () => decide(b, request_seq), "missing_field");
  }
  for (const behavior of [null, 1, true, ["allow"]]) {
    refusedDecision(b, () => decide(b, 1, behavior), "missing_field");
  }
  refusedDecision(b, () => b.permission.decision({ human_token: HUMAN_TOKEN, request_seq: 1 }), "missing_field");
});

test("EVT-63: a behavior that is not allow nor deny is refused with invalid_field", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  for (const behavior of ["maybe", "", "Allow", "approve", "denied"]) {
    refusedDecision(b, () => decide(b, 1, behavior), "invalid_field");
  }
});

test("EVT-63: a request_seq that is not the seq of a permission_request is refused with invalid_field", () => {
  const b = setup();
  b.session.turnStarted(WORKER_1);
  b.permission.request(WORKER_1, REQUEST);
  decide(b, 2);
  b.session.turnStarted(WORKER_2);
  // another kind of event before and after, a decision, and seqs that do not exist
  for (const request_seq of [1, 3, 4, 0, -1, 5, 99]) {
    refusedDecision(b, () => decide(b, request_seq), "invalid_field");
  }
});

test("EVT-63: the missing_field of a decision comes before its invalid_field, and this before permission_closed", () => {
  const b = setup();
  b.session.turnStarted(WORKER_1);
  b.permission.request(WORKER_1, REQUEST);
  decide(b, 2);
  refusedDecision(b, () => decide(b, "2", "maybe"), "missing_field");
  refusedDecision(b, () => decide(b, 1, 5), "missing_field");
  refusedDecision(b, () => decide(b, 2, "maybe"), "invalid_field");
});

test("EVT-64: a second decision for the same request is refused with permission_closed", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  expect(decide(b, 1, "deny")).toEqual({ ok: true, seq: 2 });
  refusedDecision(b, () => decide(b, 1, "allow"), "permission_closed");
  refusedDecision(b, () => decide(b, 1, "deny"), "permission_closed");
});

test("EVT-64: the decision of another request does not close this one", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  b.permission.request(WORKER_2, REQUEST);
  expect(decide(b, 2)).toEqual({ ok: true, seq: 3 });
  expect(decide(b, 1)).toEqual({ ok: true, seq: 4 });
  expect(b.events().slice(2).map((e) => [e.to_name, e.data.request_seq])).toEqual([
    ["worker-2", 2],
    ["worker-1", 1],
  ]);
});

test("EVT-64: any later event of the peer of the request closes it, turn_started and usage included", () => {
  const later: ((b: Broker) => unknown)[] = [
    (b) => b.session.turnStarted(WORKER_1),
    (b) => b.session.usage(WORKER_1, { session_id: "s", model: "m", input: 1, output: 1, cache_write: 0, cache_read: 0 }),
    (b) => b.session.blocked(WORKER_1, { reason: "r", detail: "", last_action: "" }),
    (b) => b.permission.request(WORKER_1, { ...REQUEST, request_id: "fghij" }),
  ];
  for (const event of later) {
    const b = setup();
    b.permission.request(WORKER_1, REQUEST);
    event(b);
    expect(b.events()).toHaveLength(2);
    refusedDecision(b, () => decide(b, 1), "permission_closed");
  }
});

test("EVT-64: an event of the peer before the request, and one of another peer after it, leave the request open", () => {
  const b = setup();
  b.session.turnStarted(WORKER_1);
  b.permission.request(WORKER_1, REQUEST);
  b.session.turnStarted(WORKER_2);
  b.permission.request(WORKER_2, REQUEST);
  expect(decide(b, 2)).toEqual({ ok: true, seq: 5 });
});

test("EVT-64: a refused about the peer after the request leaves it open, because it is of the broker", () => {
  const b = setup();
  b.permission.request(WORKER_1, REQUEST);
  b.refusedWith(() => b.session.usage(WORKER_1, {}), "worker-1", "usage", "missing_field");
  expect(decide(b, 1)).toEqual({ ok: true, seq: 3 });
});

test("EVT-64: the peer_left of the peer of the request closes it, by unregister and by the cleanup", () => {
  const b = setup();
  const { id } = b.join("worker-1", "worker", 100) as { id: string };
  b.join("worker-2", "worker", 200);
  b.permission.request(WORKER_1, REQUEST);
  b.permission.request(WORKER_2, REQUEST);
  b.peers.unregister(id);
  refusedDecision(b, () => decide(b, 3), "permission_closed");
  // the peer that stays has its request open
  expect(decide(b, 4)).toEqual({ ok: true, seq: 6 });

  const c = setup();
  c.join("judge", "judge", 300);
  c.permission.request(JUDGE, REQUEST);
  c.alive.delete(300);
  c.peers.cleanStale();
  expect(c.events().map((e) => e.kind)).toEqual(["peer_joined", "permission_request", "peer_left"]);
  refusedDecision(c, () => decide(c, 2), "permission_closed");
});

test("EVT-64: the peer_left of another peer leaves the request open", () => {
  const b = setup();
  const { id } = b.join("worker-2", "worker", 200) as { id: string };
  b.permission.request(WORKER_1, REQUEST);
  b.peers.unregister(id);
  expect(decide(b, 2)).toEqual({ ok: true, seq: 4 });
});
