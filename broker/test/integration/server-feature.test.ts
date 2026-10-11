import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { closeSessions, post, readDb, readDeliveries, startBroker, startSession, waitFor } from "./helpers.ts";

type Broker = Awaited<ReturnType<typeof startBroker>>;
type Session = Awaited<ReturnType<typeof startSession>>;

const POLL_MS = 50;

let broker: Broker | undefined;

afterEach(async () => {
  await closeSessions();
  await broker?.stop();
  broker = undefined;
});

const FIELDS = {
  title: "the importer",
  workflow: "matt-pocock",
  branch: "feat/importer",
  base_branch: "develop",
  spec_ref: ".specs/features/importer/spec.md",
  spec_commit: "9f8e7d6",
};

// A session of the name, registered: the model answered the ping. It polls on a short interval.
async function joined(b: Broker, name: string): Promise<Session> {
  const session = await startSession(b.port, {
    SQUAD_NAME: name,
    SQUAD_ROLE: name,
    SQUAD_POLL_INTERVAL_MS: String(POLL_MS),
  });
  await session.register();
  return session;
}

function featureRows(b: Broker) {
  const db = new Database(b.dbFile, { readonly: true });
  try {
    return db.query("SELECT * FROM features ORDER BY id").all() as Record<string, any>[];
  } finally {
    db.close();
  }
}

// The credential of a registered name, as the broker stored it
const idOf = (b: Broker, name: string) => readDb(b.dbFile).peers.find((p) => p.name === name)!.id as string;

const pendingFor = (b: Broker, name: string) =>
  readDeliveries(b.dbFile).filter((d) => d.recipient === name && d.acked_at === null).map((d) => d.event_seq);

test("FEAT-29: the session of the mother lists open_feature and close_feature, and the one of the leader does not", async () => {
  broker = await startBroker();
  const mother = await joined(broker, "mother");
  const leader = await joined(broker, "leader");
  expect(await mother.toolNames()).toEqual([
    "list_peers", "state", "history", "blocked", "unblocked", "send_task", "open_feature", "close_feature",
    "ask", "answer", "escalate", "merge_question",
  ]);
  const ofLeader = await leader.toolNames();
  expect(ofLeader).not.toContain("open_feature");
  expect(ofLeader).not.toContain("close_feature");
});

test("FEAT-30/31: open_feature answers the id and the seq of the feature it opened, and close_feature the seq", async () => {
  broker = await startBroker();
  const mother = await joined(broker, "mother");

  const opened = await mother.call("open_feature", { ...FIELDS, id: "not-an-id" });
  expect(opened).toEqual({ isError: false, text: "Feature 1 opened with seq 2." });
  expect(featureRows(broker)).toEqual([
    // the project is the repository this server runs in
    { id: 1, project: expect.any(String), ...FIELDS, opened_seq: 2, closed_seq: null, outcome: null },
  ]);
  const stored = readDb(broker.dbFile).events[1]!;
  expect([stored.seq, stored.kind, stored.feature_id, stored.from_name, stored.data]).toEqual([
    2, "feature_opened", 1, "mother", FIELDS,
  ]);

  const closed = await mother.call("close_feature", { outcome: "abandoned", body: "the spec was wrong" });
  expect(closed).toEqual({ isError: false, text: "Recorded with seq 3." });
  expect(featureRows(broker).map((f) => [f.id, f.closed_seq, f.outcome])).toEqual([[1, 3, "abandoned"]]);
  const last = readDb(broker.dbFile).events[2]!;
  expect([last.seq, last.kind, last.feature_id, last.body, last.data]).toEqual([
    3, "feature_closed", 1, "the spec was wrong", { outcome: "abandoned" },
  ]);
});

test("FEAT-32: a refused open_feature or close_feature is an error with the error and the hint of the broker", async () => {
  broker = await startBroker();
  const mother = await joined(broker, "mother");
  const id = idOf(broker, "mother");

  // what the broker answers to the same calls over HTTP
  const noFeature = (await post(broker.url, "/close-feature", { id, outcome: "delivered" })).json;
  expect(noFeature.error).toBe("no_open_feature");
  expect(await mother.call("close_feature", { outcome: "delivered" })).toEqual({
    isError: true,
    text: `close_feature refused: no_open_feature. ${noFeature.hint}`,
  });

  expect((await mother.call("open_feature", FIELDS)).isError).toBe(false);
  const alreadyOpen = (await post(broker.url, "/open-feature", { id, ...FIELDS })).json;
  expect(alreadyOpen.error).toBe("feature_already_open");
  expect(await mother.call("open_feature", { ...FIELDS, title: "the second" })).toEqual({
    isError: true,
    text: `open_feature refused: feature_already_open. ${alreadyOpen.hint}`,
  });
  expect(featureRows(broker).map((f) => f.title)).toEqual(["the importer"]);
});

test("FEAT-33: the leader gets the feature_opened and the feature_closed through the channel, and each one is confirmed", async () => {
  broker = await startBroker();
  const b = broker;
  const mother = await joined(b, "mother");
  const leader = await joined(b, "leader");
  expect(leader.client.getInstructions()).toContain("feature_opened");
  expect(leader.client.getInstructions()).toContain("feature_closed");

  expect((await mother.call("open_feature", FIELDS)).text).toBe("Feature 1 opened with seq 3.");
  await waitFor(() => leader.pushed().length === 1, "the push of the feature_opened");
  const [opened] = leader.pushed();
  expect(opened!.method).toBe("notifications/claude/channel");
  expect(opened!.params.meta).toEqual({ kind: "feature_opened", seq: "3", from: "mother" });
  expect(opened!.params.content).toBe(
    [
      "title: the importer",
      "workflow: matt-pocock",
      "branch: feat/importer",
      "base_branch: develop",
      "spec_ref: .specs/features/importer/spec.md",
      "spec_commit: 9f8e7d6",
    ].join("\n")
  );
  await waitFor(() => pendingFor(b, "leader").length === 0, "the ack of the feature_opened");
  expect((await post(b.url, "/poll-messages", { id: idOf(b, "leader") })).json).toEqual({ events: [] });

  expect((await mother.call("close_feature", { outcome: "delivered", body: "all tickets approved" })).text).toBe(
    "Recorded with seq 4."
  );
  await waitFor(() => leader.pushed().length === 2, "the push of the feature_closed");
  const closed = leader.pushed()[1]!;
  expect(closed.params.meta).toEqual({ kind: "feature_closed", seq: "4", from: "mother" });
  expect(closed.params.content).toBe("all tickets approved\n\noutcome: delivered");
  await waitFor(() => pendingFor(b, "leader").length === 0, "the ack of the feature_closed");
  expect((await post(b.url, "/poll-messages", { id: idOf(b, "leader") })).json).toEqual({ events: [] });

  // pushed once each, and nothing of her own to the mother
  await Bun.sleep(POLL_MS * 4);
  expect(leader.pushed()).toHaveLength(2);
  expect(mother.pushed()).toEqual([]);
  expect(readDeliveries(b.dbFile).filter((d) => d.recipient === "leader")).toEqual([
    { event_seq: 3, recipient: "leader", acked_at: expect.any(Number) },
    { event_seq: 4, recipient: "leader", acked_at: expect.any(Number) },
  ]);
});

test("FEAT-13/14: the mother and the leader go from open_feature to close_feature through a task and a plan, with nothing written in features from outside", async () => {
  broker = await startBroker();
  const b = broker;
  const mother = await joined(b, "mother");
  const leader = await joined(b, "leader");

  expect((await mother.call("send_task", { to: "leader", summary: "kick off" })).text).toContain("no_open_feature");
  expect((await mother.call("open_feature", FIELDS)).text).toBe("Feature 1 opened with seq 4.");
  expect(await mother.call("send_task", { to: "leader", summary: "kick off" })).toEqual({
    isError: false,
    text: "Recorded with seq 5.",
  });
  await waitFor(() => leader.pushed().length === 2, "the pushes of the feature_opened and of the task");
  expect(leader.pushed().map((p) => p.params.meta.kind)).toEqual(["feature_opened", "task"]);
  expect(await leader.call("plan", { tickets: [{ ticket_ref: "A", title: "the parser" }] })).toEqual({
    isError: false,
    text: "Recorded with seq 6.",
  });
  expect((await mother.call("close_feature", { outcome: "delivered" })).text).toBe("Recorded with seq 7.");
  expect((await leader.call("plan", { tickets: [{ ticket_ref: "A", title: "the parser" }] })).text).toContain(
    "no_open_feature"
  );

  expect(readDb(b.dbFile).events.map((e) => [e.seq, e.kind, e.feature_id])).toEqual([
    [1, "peer_joined", null],
    [2, "peer_joined", null],
    [3, "refused", null],
    [4, "feature_opened", 1],
    [5, "task", 1],
    [6, "plan", 1],
    [7, "feature_closed", 1],
    [8, "refused", null],
  ]);
  expect(featureRows(b).map(({ project, ...row }) => row)).toEqual([
    { id: 1, ...FIELDS, opened_seq: 4, closed_seq: 7, outcome: "delivered" },
  ]);
});
