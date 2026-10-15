import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";
import { BROKER_DIR, FEATURE, cleanEnv, closeSessions, readDb, startBroker, startSession, waitFor } from "./helpers.ts";

// From the kickoff to the close of a feature of two tickets: test MCP sessions of the mother,
// the leader, a worker and the judge over a real broker, and the TUI on a terminal of 120×40
// over the same broker, where the dev decides a permission request of the worker and approves
// the gate of the delivery.

type Broker = Awaited<ReturnType<typeof startBroker>>;
type Session = Awaited<ReturnType<typeof startSession>>;

let broker: Broker | undefined;
let tui: ReturnType<typeof Bun.spawn> | undefined;

afterEach(async () => {
  tui?.kill();
  tui = undefined;
  await closeSessions();
  await broker?.stop();
  broker = undefined;
});

// A session of the name, registered, that polls on a short interval
async function joined(b: Broker, name: string): Promise<Session> {
  const session = await startSession(b.port, { SQUAD_NAME: name, SQUAD_ROLE: name.startsWith("worker") ? "worker" : name, SQUAD_POLL_INTERVAL_MS: "50" });
  await session.register();
  return session;
}

// The seq a tool answered in its text
function seqOf(answer: { isError: boolean; text: string }): number {
  expect(answer).toMatchObject({ isError: false });
  const found = /\bseq (\d+)\b/.exec(answer.text);
  if (!found) throw new Error(`no seq in "${answer.text}"`);
  return Number(found[1]);
}

// A command of 12 lines: its end is not in view until the preview goes to it
const PREVIEW = Array.from({ length: 12 }, (_, i) => `echo ${i + 1}`).join("\n");
const REQUEST = { request_id: "e2e01", tool_name: "Bash", description: "print twelve lines", input_preview: PREVIEW };
const VERDICT = "notifications/claude/channel/permission";

test("GAT-26, GAT-27, GAT-40, GAT-52, GAT-60, GAT-66: two tickets go from the kickoff to the gate; delivered is refused with gate_required until the dev approves the gate in the TUI, which also allows the permission request of the worker, whose session gets the verdict", async () => {
  broker = await startBroker();
  const b = broker;
  const mother = await joined(b, "mother");
  const leader = await joined(b, "leader");
  const worker = await joined(b, "worker-1");
  const judge = await joined(b, "judge");

  // The kickoff, the plan of two tickets, a task, a result and an approve for each, and the report to the mother
  seqOf(await mother.call("open_feature", FEATURE));
  seqOf(await mother.call("send_task", { to: "leader", summary: "kick off", body: "the spec is approved" }));
  seqOf(await leader.call("plan", { tickets: [{ ticket_ref: "T1", title: "first" }, { ticket_ref: "T2", title: "second" }] }));
  for (const ref of ["T1", "T2"]) {
    const task = seqOf(await leader.call("send_task", { to: "worker-1", summary: `do ${ref}`, ticket_ref: ref, loadout: ["tdd"], criteria: [1] }));
    const result = seqOf(await worker.call("send_result", { to: "judge", summary: `${ref} done`, ticket_ref: ref, task_seq: task, branch: `squad/${ref}`, commit: "abc1234" }));
    seqOf(await judge.call("send_verdict", { to: "leader", summary: `${ref} approved`, ticket_ref: ref, result_seq: result, outcome: "approve", criteria: [{ n: 1, text: "it works", pass: true }] }));
  }
  seqOf(await leader.call("send_result", { to: "mother", summary: "2/2 tickets approved" }));

  // GAT-26: without a gate the delivery is refused, and the refusal is in the log
  const early = await mother.call("close_feature", { outcome: "delivered", body: "merged" });
  expect(early.isError).toBe(true);
  expect(early.text).toStartWith("close_feature refused: gate_required.");
  expect(readDb(b.dbFile).events.at(-1)).toMatchObject({ kind: "refused", data: { peer: "mother", attempted_kind: "feature_closed", error: "gate_required" } });

  // The TUI on a terminal, with the human credential of this broker
  const decoder = new TextDecoder();
  let out = "";
  tui = Bun.spawn([process.execPath, join(BROKER_DIR, "tui.ts")], {
    env: cleanEnv({ SQUAD_PORT: String(b.port), SQUAD_DB: b.dbFile, SQUAD_TOKEN_FILE: b.tokenFile, SQUAD_TUI_MOUSE: "0" }),
    terminal: { cols: 120, rows: 40, data: (_terminal, data) => void (out += decoder.decode(data, { stream: true })) },
  });
  const proc = tui;
  // What was written since `from`, without the escapes that split it
  const text = (from = 0) => out.slice(from).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
  // Types a key, and waits for the text it should draw
  async function press(key: string, drawn: string, what: string) {
    const from = out.length;
    proc.terminal!.write(key);
    await waitFor(() => text(from).includes(drawn), what, 15_000);
  }
  await waitFor(() => text().includes(FEATURE.title), "the title of the feature on the terminal", 15_000);

  // GAT-60, GAT-66: the permission request of the session of the worker, decided in the TUI
  await worker.client.notification({ method: "notifications/claude/channel/permission_request", params: REQUEST });
  await waitFor(() => text().includes("⚠ permissão w1 · x"), "the seal of the request", 15_000);
  await press("x", "⚠ permissão P-01 · w1 · Bash", "the modal of permission");
  // a does nothing before the end of the preview is in view, where a modal sending would take no G; G goes to it
  proc.terminal!.write("a");
  await press("G", "5–12 de 12 · fim", "the end of the preview");
  await press("a", "✓ P-01 permitido", "the notice of the allow");
  const verdicts = () => worker.notifications.filter((n) => n.method === VERDICT);
  await waitFor(() => verdicts().length > 0, "the verdict in the session of the worker");
  expect(verdicts().map((n) => n.params)).toEqual([{ request_id: "e2e01", behavior: "allow" }]);
  const asked = readDb(b.dbFile).events.find((e) => e.kind === "permission_request")!;
  const decisions = readDb(b.dbFile).events.filter((e) => e.kind === "permission_decision");
  expect(decisions.map((e) => [e.from_name, e.to_name, e.data])).toEqual([["human", "worker-1", { request_seq: asked.seq, behavior: "allow" }]]);

  // GAT-40, GAT-52: the gate of the delivery, approved in the TUI with g, a and y
  expect(await mother.call("gate", { scope: "delivery", summary: "deliver T1 and T2", action: "merge feat/x into main", effect: "main gets T1 and T2", commit: "abc1234" })).toMatchObject({
    isError: false,
    text: expect.stringMatching(/^Gate 1 requested with seq \d+\.$/),
  });
  await waitFor(() => text().includes("⚠ gate G-01 pendente · g"), "the seal of the gate", 15_000);
  // GAT-26: a pending gate is not an approved one
  expect((await mother.call("close_feature", { outcome: "delivered", body: "merged" })).text).toStartWith("close_feature refused: gate_required.");
  await press("g", "mother pede aprovação antes de uma ação irreversível", "the modal of the gate");
  await press("a", "⚠ confirmar aprovação de G-01 · não dá para desfazer", "the confirm mode");
  await press("y", "✓ G-01 aprovado", "the notice of the approve");
  const approved = readDb(b.dbFile).events.filter((e) => e.kind === "gate_decision");
  expect(approved.map((e) => [e.from_name, e.to_name, e.gate_id, e.data])).toEqual([["human", "mother", 1, { gate_id: 1, decision: "approve" }]]);
  await waitFor(() => mother.pushed().some((n) => n.params.meta.kind === "gate_decision"), "the push of the approve to the mother");

  // GAT-27: with the gate approved the delivery closes the feature
  const closed = seqOf(await mother.call("close_feature", { outcome: "delivered", body: "merged" }));
  expect(readDb(b.dbFile).events.at(-1)).toMatchObject({ seq: closed, kind: "feature_closed", data: { outcome: "delivered" } });

  proc.terminal!.write("q");
  expect(await proc.exited).toBe(0);
}, 90_000);
