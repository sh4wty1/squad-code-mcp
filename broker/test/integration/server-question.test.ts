import { afterEach, expect, test } from "bun:test";
import { closeSessions, openFeature, post, readDb, startBroker, startSession, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;
type Session = Awaited<ReturnType<typeof startSession>>;

const POLL_MS = 50;

let broker: Broker | undefined;

afterEach(async () => {
  await closeSessions();
  await broker?.stop();
  broker = undefined;
});

// A session of the name, registered, that polls on a short interval
async function joined(b: Broker, name: string): Promise<Session> {
  const session = await startSession(b.port, {
    SQUAD_NAME: name,
    SQUAD_ROLE: name.startsWith("worker") ? "worker" : name,
    SQUAD_POLL_INTERVAL_MS: String(POLL_MS),
  });
  await session.register();
  return session;
}

// A peer registered over HTTP with the pid of the test, for the name that has no session. Returns its id.
async function registered(b: Broker, name: string): Promise<string> {
  const role = name.startsWith("worker") ? "worker" : name;
  return (await post(b.url, "/register", { pid: process.pid, cwd: "/repo", git_root: null, name, role })).json.id;
}

// The seq a tool answered in its text
function seqOf(answer: { isError: boolean; text: string }): number {
  expect(answer.isError).toBe(false);
  const found = /\bseq (\d+)\b/.exec(answer.text);
  if (!found) throw new Error(`no seq in "${answer.text}"`);
  return Number(found[1]);
}

// The push of the kind a session got, once it comes
async function pushOf(session: Session, kind: string) {
  const find = () => session.pushed().find((p) => p.params.meta.kind === kind);
  await waitFor(() => find() !== undefined, `the push of the ${kind}`);
  return find()!.params as { content: string; meta: Record<string, string> };
}

test("QST-53/54: ask of a worker answers the question_id and the seq, the leader gets the question through the channel, and its answer comes back to the worker the same way", async () => {
  broker = await startBroker();
  const b = broker;
  const feature = await openFeature(b.url, await registered(b, "mother"));
  const worker = await joined(b, "worker-1");
  const leader = await joined(b, "leader");

  // The id is the session's, whatever the arguments carry
  const asked = await worker.call("ask", {
    to: "leader",
    summary: "which port?",
    body: "8080 or 9090?",
    why: "the spec gives two",
    blocking: true,
    options: ["8080", "9090"],
    id: "not-an-id",
  });
  // 1 and 2 are the mother joining and the feature_opened, 3 and 4 the two sessions joining
  expect(seqOf(asked)).toBe(5);
  expect(asked.text).toMatch(/\bQuestion 1\b/);
  expect(readDb(b.dbFile).events[4]).toEqual({
    seq: 5,
    ts: expect.any(Number),
    kind: "question",
    feature_id: feature,
    from_name: "worker-1",
    role_from: "worker",
    to_name: "leader",
    summary: "which port?",
    body: "8080 or 9090?",
    ticket_ref: null,
    question_id: 1,
    gate_id: null,
    data: { question_id: 1, asked_by: "worker-1", blocking: true, why: "the spec gives two", options: ["8080", "9090"] },
  });

  const question = await pushOf(leader, "question");
  expect(question.meta).toEqual({ kind: "question", seq: "5", from: "worker-1" });
  for (const part of [
    "which port?",
    "8080 or 9090?",
    "why: the spec gives two",
    "question_id: 1",
    "asked_by: worker-1",
    "blocking: true",
    'options: ["8080","9090"]',
  ]) {
    expect(question.content).toContain(part);
  }

  expect(seqOf(await leader.call("answer", { question_id: 1, answer: "8080", id: "not-an-id" }))).toBe(6);
  const answer = await pushOf(worker, "answer");
  expect(answer.meta).toEqual({ kind: "answer", seq: "6", from: "leader" });
  for (const part of ["Q-01: 8080", "question_id: 1", "answer: 8080", "resolved_by: agent"]) {
    expect(answer.content).toContain(part);
  }
  // the summary, then the body, which is the whole answer, then the fields
  expect(answer.content.startsWith("Q-01: 8080\n\n8080\n\n")).toBe(true);

  // a refusal is an error with the error and the hint of the broker
  const again = await leader.call("answer", { question_id: 1, answer: "9090" });
  expect(again.isError).toBe(true);
  expect(again.text).toContain("question_closed");
  expect(again.text).toContain("Q-01 is closed and takes no answer.");
  expect(readDb(b.dbFile).events.slice(5).map((e) => [e.seq, e.kind, e.from_name, e.data])).toEqual([
    [6, "answer", "leader", { question_id: 1, answer: "8080", resolved_by: "agent" }],
    [7, "refused", "broker", { peer: "leader", attempted_kind: "answer", error: "question_closed" }],
  ]);
});

test("QST-53: escalate and merge_question call their routes with the id of the session and answer the seq, or the error and the hint", async () => {
  broker = await startBroker();
  const b = broker;
  const mother = await joined(b, "mother");
  const feature = await openFeature(b.url, readDb(b.dbFile).peers[0]!.id);
  const leader = await joined(b, "leader");
  const worker = await registered(b, "worker-1");
  const asking = { id: worker, to: "leader", summary: "which port?", why: "the spec gives two", blocking: true };
  // 1 to 4 are the mother, the feature_opened, the leader and the worker
  expect((await post(b.url, "/ask", asking)).json).toEqual({ ok: true, question_id: 1, seq: 5 });
  expect((await post(b.url, "/ask", asking)).json).toEqual({ ok: true, question_id: 2, seq: 6 });

  expect(seqOf(await leader.call("escalate", { question_id: 1, id: "not-an-id" }))).toBe(7);
  expect(seqOf(await mother.call("merge_question", { question_id: 2, into: 1, id: "not-an-id" }))).toBe(8);
  expect(seqOf(await mother.call("escalate", { question_id: 1, summary: "which port, dev?" }))).toBe(9);
  const stored = readDb(b.dbFile).events.slice(6);
  expect(stored.map((e) => [e.seq, e.kind, e.feature_id, e.from_name, e.to_name, e.summary, e.question_id])).toEqual([
    [7, "question", feature, "leader", "mother", "which port?", 1],
    [8, "question_merged", feature, "mother", null, "", 2],
    [9, "question", feature, "mother", "human", "which port, dev?", 1],
  ]);
  expect(stored[1]!.data).toEqual({ question_id: 2, into: 1 });

  const closed = await leader.call("escalate", { question_id: 2 });
  expect(closed.isError).toBe(true);
  expect(closed.text).toContain("question_closed");
  expect(closed.text).toContain("Q-02 is closed.");
  const refused = await leader.call("ask", { to: "human", summary: "which port?", why: "the spec gives two", blocking: true });
  expect(refused.isError).toBe(true);
  expect(refused.text).toContain("edge_not_allowed");
  expect(refused.text).toContain("A leader asks only the mother.");
});
