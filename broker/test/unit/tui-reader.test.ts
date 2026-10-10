import { expect, test } from "bun:test";
import type { SquadEvent } from "../../shared/contract.ts";
import { createReader, type Fetch } from "../../tui/reader.ts";

const BROKER = "http://127.0.0.1:7900";

const event = (seq: number) => ({ seq, ts: 1000 + seq, kind: "turn_started", feature_id: null, from: "leader", role_from: "leader", to: null, summary: "", body: null, ticket_ref: null }) as unknown as SquadEvent;

const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// A fetch that answers each call with the next of `answers` and keeps what was asked
function fake(...answers: (() => Promise<Response>)[]) {
  const calls: { method: string; url: string }[] = [];
  const fetch: Fetch = (url, init) => {
    calls.push({ method: init?.method ?? "GET", url });
    return answers.shift()!();
  };
  return { fetch, calls };
}

test("TUI-50: the events of each read are added in order of seq and the cursor goes to last_seq", async () => {
  const { fetch, calls } = fake(json({ events: [event(2), event(1)], last_seq: 2 }), json({ events: [event(4), event(3)], last_seq: 4 }), json({ events: [], last_seq: 4 }));
  const reader = createReader({ fetch, url: BROKER });

  expect(await reader.poll()).toEqual({ ok: true, events: [event(1), event(2)] });
  expect(await reader.poll()).toEqual({ ok: true, events: [event(1), event(2), event(3), event(4)] });
  expect(await reader.poll()).toEqual({ ok: true, events: [event(1), event(2), event(3), event(4)] });
  expect(calls.map((c) => c.url)).toEqual([`${BROKER}/events?after=0`, `${BROKER}/events?after=2`, `${BROKER}/events?after=4`]);
});

test("TUI-50: a seq already seen does not enter twice", async () => {
  const { fetch } = fake(json({ events: [event(1), event(2)], last_seq: 2 }), json({ events: [event(2), event(3), event(3)], last_seq: 3 }));
  const reader = createReader({ fetch, url: BROKER });
  await reader.poll();

  expect((await reader.poll()).events.map((e) => e.seq)).toEqual([1, 2, 3]);
});

const FAILURES: [string, () => Promise<Response>][] = [
  ["a refused connection", () => Promise.reject(new Error("ConnectionRefused"))],
  ["status 500", json({ events: [event(9)], last_seq: 9 }, 500)],
  ["a body that is not JSON", async () => new Response("squad broker", { status: 200 })],
  ["events that is not a list", json({ events: { 0: event(9) }, last_seq: 9 })],
  ["last_seq that is not an integer", json({ events: [event(9)], last_seq: "9" })],
  ["last_seq with a fraction", json({ events: [event(9)], last_seq: 9.5 })],
];

for (const [what, answer] of FAILURES) {
  test(`TUI-51, TUI-52, TUI-53: ${what} is a failed read, the log stays and the next read uses the same cursor`, async () => {
    const { fetch, calls } = fake(json({ events: [event(1), event(2)], last_seq: 2 }), answer, json({ events: [event(3)], last_seq: 3 }));
    const reader = createReader({ fetch, url: BROKER });
    await reader.poll();

    expect(await reader.poll()).toEqual({ ok: false, events: [event(1), event(2)] });
    expect(await reader.poll()).toEqual({ ok: true, events: [event(1), event(2), event(3)] });
    expect(calls.map((c) => c.url)).toEqual([`${BROKER}/events?after=0`, `${BROKER}/events?after=2`, `${BROKER}/events?after=2`]);
  });
}

test("TUI-51: a broker that takes longer than the timeout is a failed read", async () => {
  // Answers only when the reader gives up
  const hung: Fetch = (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason)));
  const reader = createReader({ fetch: hung, url: BROKER, timeoutMs: 20 });

  expect(await reader.poll()).toEqual({ ok: false, events: [] });
});

test("edge case: last_seq smaller than the cursor empties the log and reads from cursor 0", async () => {
  const { fetch, calls } = fake(json({ events: [event(1), event(2), event(3)], last_seq: 3 }), json({ events: [], last_seq: 1 }), json({ events: [event(1)], last_seq: 1 }));
  const reader = createReader({ fetch, url: BROKER });
  await reader.poll();

  expect(await reader.poll()).toEqual({ ok: true, events: [] });
  expect(await reader.poll()).toEqual({ ok: true, events: [event(1)] });
  expect(calls.map((c) => c.url)).toEqual([`${BROKER}/events?after=0`, `${BROKER}/events?after=3`, `${BROKER}/events?after=0`]);
});

test("TUI-55: the reader asks the broker for nothing but GET /events?after=", async () => {
  const { fetch, calls } = fake(json({ events: [event(1)], last_seq: 1 }), json({}, 500), () => Promise.reject(new Error("down")), json({ events: [], last_seq: 0 }), json({ events: [], last_seq: 0 }));
  const reader = createReader({ fetch, url: BROKER });
  for (let i = 0; i < 5; i++) await reader.poll();

  expect(calls).toHaveLength(5);
  for (const call of calls) {
    expect(call.method).toBe("GET");
    expect(call.url).toMatch(/^http:\/\/127\.0\.0\.1:7900\/events\?after=\d+$/);
  }
});
