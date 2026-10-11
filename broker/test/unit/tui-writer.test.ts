import { expect, test } from "bun:test";
import type { Fetch } from "../../tui/reader.ts";
import { createWriter } from "../../tui/writer.ts";

const BROKER = "http://127.0.0.1:7900";
const TOKEN = "f".repeat(64);
const SILENT = { ok: false, error: "broker não respondeu" };

const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// A fetch that answers each call with the next of `answers` and keeps what was asked
function fake(...answers: (() => Promise<Response>)[]) {
  const calls: { method: string; url: string; headers: unknown; body: unknown }[] = [];
  const fetch: Fetch = (url, init) => {
    calls.push({ method: init?.method ?? "GET", url, headers: init?.headers, body: JSON.parse(String(init?.body)) });
    return answers.shift()!();
  };
  return { fetch, calls };
}

test("QST-76, QST-86: the writer asks POST /answer with the credential, the question and the answer as JSON", async () => {
  const { fetch, calls } = fake(json({ ok: true, seq: 434 }));
  await createWriter({ fetch, url: BROKER }).answer(TOKEN, 8, "logo da 89, quadrado");

  expect(calls).toEqual([
    { method: "POST", url: "http://127.0.0.1:7900/answer", headers: { "Content-Type": "application/json" }, body: { human_token: TOKEN, question_id: 8, answer: "logo da 89, quadrado" } },
  ]);
});

test("QST-77: an answer the broker took is ok, without its seq", async () => {
  const { fetch } = fake(json({ ok: true, seq: 434 }));
  expect(await createWriter({ fetch, url: BROKER }).answer(TOKEN, 8, "logo da 89")).toEqual({ ok: true });
});

for (const error of ["question_closed", "invalid_token", "not_holder", "missing_field", "invalid_field"]) {
  test(`QST-80, QST-81: the refusal ${error} gives its error, without the hint`, async () => {
    const { fetch } = fake(json({ ok: false, error, hint: "what to do about it" }));
    expect(await createWriter({ fetch, url: BROKER }).answer(TOKEN, 8, "logo da 89")).toEqual({ ok: false, error });
  });
}

const FAILURES: [string, () => Promise<Response>][] = [
  ["a refused connection", () => Promise.reject(new Error("ConnectionRefused"))],
  ["status 500 with the message of the SQL failure", json({ error: "database is locked" }, 500)],
  ["status 500 with a body that says ok", json({ ok: true, seq: 9 }, 500)],
  ["status 404", async () => new Response("not found", { status: 404 })],
  ["a body that is not JSON", async () => new Response("squad broker", { status: 200 })],
  ["a body without ok", json({ seq: 9 })],
  ["an ok that is not a boolean", json({ ok: "true", seq: 9 })],
  ["a refusal without its error", json({ ok: false })],
  ["a body that is null", json(null)],
];

for (const [what, answer] of FAILURES) {
  test(`QST-81: ${what} is the broker not answering`, async () => {
    const { fetch } = fake(answer);
    expect(await createWriter({ fetch, url: BROKER }).answer(TOKEN, 8, "logo da 89")).toEqual(SILENT);
  });
}

// A clock the test moves: the timers set while it is on fire only when `advance` reaches them
function fakeClock() {
  const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const timers = new Map<number, { at: number; fire: () => void }>();
  let now = 0;
  let ids = 0;
  Object.assign(globalThis, {
    setTimeout: (fire: () => void, ms = 0) => (timers.set(++ids, { at: now + ms, fire }), ids),
    clearTimeout: (id: number) => void timers.delete(id),
  });
  return {
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at > now) continue;
        timers.delete(id);
        timer.fire();
      }
    },
    restore: () => void Object.assign(globalThis, real),
  };
}

// Lets what was waiting for a promise run
const turn = () => new Promise((resolve) => setImmediate(resolve));

test("QST-81: with no answer in 2000 ms the writer gives up and says the broker did not answer", async () => {
  // Answers only when the writer gives up
  const hung: Fetch = (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason)));
  const clock = fakeClock();
  try {
    let said: unknown = null;
    const sending = createWriter({ fetch: hung, url: BROKER })
      .answer(TOKEN, 8, "logo da 89")
      .then((result) => (said = result));
    clock.advance(1999);
    await turn();
    expect(said).toBeNull();
    clock.advance(1);
    await sending;
    expect(said).toEqual(SILENT);
  } finally {
    clock.restore();
  }
});

test("QST-86: the writer asks the broker for nothing but POST /answer", async () => {
  const { fetch, calls } = fake(json({ ok: true, seq: 1 }), json({ ok: false, error: "question_closed", hint: "" }), json({}, 500), () => Promise.reject(new Error("down")), json({ ok: true, seq: 2 }));
  const writer = createWriter({ fetch, url: BROKER });
  for (let i = 0; i < 5; i++) await writer.answer(TOKEN, i + 1, "sim");

  expect(calls).toHaveLength(5);
  for (const call of calls) expect([call.method, call.url]).toEqual(["POST", "http://127.0.0.1:7900/answer"]);
  expect(Object.keys(createWriter({ fetch, url: BROKER }))).toEqual(["answer"]);
});
