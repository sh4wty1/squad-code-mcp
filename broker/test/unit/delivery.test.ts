import { expect, test } from "bun:test";
import { createDelivery, type Push } from "../../delivery.ts";
import type { SquadEvent } from "../../shared/contract.ts";

const envelope = { ts: 1, feature_id: 1, summary: "", body: "", ticket_ref: null };

const KICKOFF = {
  ...envelope,
  seq: 3,
  kind: "task",
  from: "mother",
  role_from: "mother",
  to: "leader",
  summary: "kick off",
  body: "the spec is approved",
} as SquadEvent;

const RESULT = {
  ...envelope,
  seq: 4,
  kind: "result",
  from: "worker-1",
  role_from: "worker",
  to: "judge",
  summary: "first done",
  ticket_ref: "T1",
  task_seq: 2,
  branch: "squad/t1",
  commit: "abc1234",
} as SquadEvent;

const VERDICT = {
  ...envelope,
  seq: 5,
  kind: "verdict",
  from: "judge",
  role_from: "judge",
  to: "leader",
  summary: "one criterion fails",
  body: "see the note",
  ticket_ref: "T1",
  result_seq: 4,
  outcome: "rework",
  criteria: [{ n: 1, text: "it lists the peers", pass: false, note: "the list is empty" }],
} as SquadEvent;

function decision(seq: number, request_seq: number, behavior: "allow" | "deny") {
  return {
    ...envelope,
    feature_id: null,
    seq,
    kind: "permission_decision",
    from: "human",
    role_from: "human",
    to: "leader",
    summary: `${behavior}: Bash`,
    request_seq,
    behavior,
  } as SquadEvent;
}

// A delivery loop over fakes. `pending` is what the broker still has for the session;
// a confirmed seq leaves it, as in the broker. `fail` names the calls that reject.
function setup(pending: SquadEvent[]) {
  const calls: string[] = [];
  const pushes: Push[] = [];
  const fail = new Set<string>();
  const state = { pending };

  function attempt(call: string) {
    calls.push(call);
    if (fail.has(call)) throw new Error(`${call} failed`);
  }

  const delivery = createDelivery({
    poll: async () => {
      attempt("poll");
      return state.pending;
    },
    push: async (message) => {
      attempt(`push ${message.meta.seq}`);
      pushes.push(message);
    },
    ack: async (seqs) => {
      attempt(`ack ${seqs.join(",")}`);
      state.pending = state.pending.filter((e) => !seqs.includes(e.seq));
    },
    verdict: async (requestId, behavior) => {
      attempt(`verdict ${requestId} ${behavior}`);
    },
  });

  // The calls of one cycle
  async function cycle() {
    calls.length = 0;
    await delivery.cycle();
    return [...calls];
  }

  return { delivery, calls, pushes, fail, state, cycle };
}

test("EVT-82/83: three events are pushed in ascending seq, each one confirmed after its own push", async () => {
  // whatever the order the poll answers in
  const { cycle, pushes, state } = setup([VERDICT, KICKOFF, RESULT]);
  expect(await cycle()).toEqual(["poll", "push 3", "ack 3", "push 4", "ack 4", "push 5", "ack 5"]);
  expect(pushes.map((p) => p.meta.seq)).toEqual(["3", "4", "5"]);
  expect(state.pending).toEqual([]);
});

test("EVT-82: the meta of a push has kind, seq and from as text, and ticket_ref only when it is not null", async () => {
  const { cycle, pushes } = setup([KICKOFF, RESULT, VERDICT]);
  await cycle();
  expect(pushes.map((p) => p.meta)).toEqual([
    { kind: "task", seq: "3", from: "mother" },
    { kind: "result", seq: "4", from: "worker-1", ticket_ref: "T1" },
    { kind: "verdict", seq: "5", from: "judge", ticket_ref: "T1" },
  ]);
  // what the channel takes: plain identifiers and strings
  for (const { meta } of pushes) {
    for (const [key, value] of Object.entries(meta)) {
      expect(key).toMatch(/^[a-z_]+$/);
      expect(typeof value).toBe("string");
    }
  }
});

test("EVT-82: the content of a push has the summary, the body and the value of each field of the kind", async () => {
  const task = { ...KICKOFF, seq: 6, from: "leader", to: "worker-1", ticket_ref: "T1", loadout: ["tdd", "review"], criteria: [1, 2] };
  const { cycle, pushes } = setup([KICKOFF, RESULT, VERDICT, task as SquadEvent]);
  await cycle();
  const [kickoff, result, verdict, assigned] = pushes.map((p) => p.content);

  // a task of the mother has no field of its own
  expect(kickoff).toBe("kick off\n\nthe spec is approved");

  expect(result).toContain("first done");
  expect(result).toContain("task_seq: 2");
  expect(result).toContain("branch: squad/t1");
  expect(result).toContain("commit: abc1234");

  expect(verdict).toContain("one criterion fails");
  expect(verdict).toContain("see the note");
  expect(verdict).toContain("result_seq: 4");
  expect(verdict).toContain("outcome: rework");
  expect(verdict).toContain('criteria: [{"n":1,"text":"it lists the peers","pass":false,"note":"the list is empty"}]');

  expect(assigned).toContain('loadout: ["tdd","review"]');
  expect(assigned).toContain("criteria: [1,2]");
  // the envelope is in the meta or is the broker's: it is not repeated as a field
  for (const content of [result, verdict, assigned]) {
    expect(content).not.toMatch(/^(seq|ts|kind|feature_id|from|role_from|to|summary|body|ticket_ref): /m);
  }
});

test("EVT-83: when the push of the second event fails only the first is confirmed, and the third is not pushed in that cycle", async () => {
  const { cycle, fail, state } = setup([KICKOFF, RESULT, VERDICT]);
  fail.add("push 4");
  expect(await cycle()).toEqual(["poll", "push 3", "ack 3", "push 4"]);
  expect(state.pending.map((e) => e.seq)).toEqual([4, 5]);

  // The event that was not pushed is pushed by the next cycle, and the first is not again
  fail.clear();
  expect(await cycle()).toEqual(["poll", "push 4", "ack 4", "push 5", "ack 5"]);
});

test("EVT-84: when the ack fails the next cycle confirms the same seq without pushing it again", async () => {
  const { cycle, fail, pushes, state } = setup([KICKOFF, RESULT]);
  fail.add("ack 3");
  // the cycle stops at the call that failed
  expect(await cycle()).toEqual(["poll", "push 3", "ack 3"]);
  expect(state.pending.map((e) => e.seq)).toEqual([3, 4]);

  // still failing: confirmed again, never pushed again
  expect(await cycle()).toEqual(["poll", "ack 3"]);

  fail.clear();
  expect(await cycle()).toEqual(["poll", "ack 3", "push 4", "ack 4"]);
  expect(pushes.map((p) => p.meta.seq)).toEqual(["3", "4"]);
  expect(state.pending).toEqual([]);
  expect(await cycle()).toEqual(["poll"]);
});

test("EVT-87: the decision of a request this process remembers becomes the verdict of the request, is not pushed and is confirmed", async () => {
  const { delivery, cycle, pushes, state } = setup([decision(7, 6, "allow"), KICKOFF, decision(9, 8, "deny")]);
  delivery.remember(6, "abcde");
  delivery.remember(8, "fghij");
  expect(await cycle()).toEqual(["poll", "push 3", "ack 3", "verdict abcde allow", "ack 7", "verdict fghij deny", "ack 9"]);
  expect(pushes.map((p) => p.meta.kind)).toEqual(["task"]);
  expect(state.pending).toEqual([]);
});

test("EVT-88: the decision of a request this process does not know is confirmed with no verdict and no push", async () => {
  const { delivery, cycle, pushes } = setup([decision(7, 6, "allow")]);
  // another request, not the one decided
  delivery.remember(5, "abcde");
  expect(await cycle()).toEqual(["poll", "ack 7"]);
  expect(pushes).toEqual([]);
});

test("EVT-83/87: when the verdict fails the decision is not confirmed, and the next cycle sends the verdict", async () => {
  const { delivery, cycle, fail, state } = setup([decision(7, 6, "deny"), KICKOFF]);
  delivery.remember(6, "abcde");
  fail.add("verdict abcde deny");
  expect(await cycle()).toEqual(["poll", "push 3", "ack 3", "verdict abcde deny"]);
  expect(state.pending.map((e) => e.seq)).toEqual([7]);
  fail.clear();
  expect(await cycle()).toEqual(["poll", "verdict abcde deny", "ack 7"]);
});

test("EVT-84/87: when the ack of a decision fails the next cycle confirms it without sending the verdict again", async () => {
  const { delivery, cycle, fail } = setup([decision(7, 6, "allow")]);
  delivery.remember(6, "abcde");
  fail.add("ack 7");
  expect(await cycle()).toEqual(["poll", "verdict abcde allow", "ack 7"]);
  fail.clear();
  expect(await cycle()).toEqual(["poll", "ack 7"]);
});

test("EVT-83: a poll that fails ends the cycle with nothing pushed, and the next cycle goes on", async () => {
  const { cycle, fail } = setup([KICKOFF]);
  fail.add("poll");
  expect(await cycle()).toEqual(["poll"]);
  fail.clear();
  expect(await cycle()).toEqual(["poll", "push 3", "ack 3"]);
});

test("EVT-82: two cycles do not run at the same time", async () => {
  const calls: string[] = [];
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let polls = 0;
  const delivery = createDelivery({
    poll: async () => {
      polls++;
      calls.push("poll");
      // the first poll waits; the event is confirmed by the time a second one asks
      if (polls === 1) {
        await held;
        return [KICKOFF];
      }
      return [];
    },
    push: async (message) => {
      calls.push(`push ${message.meta.seq}`);
    },
    ack: async (seqs) => {
      calls.push(`ack ${seqs.join(",")}`);
    },
    verdict: async () => {},
  });

  const first = delivery.cycle();
  // started while the first is still waiting for its poll: it does nothing
  await delivery.cycle();
  await delivery.cycle();
  expect(calls).toEqual(["poll"]);
  release();
  await first;
  expect(calls).toEqual(["poll", "push 3", "ack 3"]);

  // once it ended, the next one runs
  await delivery.cycle();
  expect(calls).toEqual(["poll", "push 3", "ack 3", "poll"]);
});
