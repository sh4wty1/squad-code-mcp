/**
 * squad hook usage
 *
 * The tokens a session used so far, read from the transcripts Claude Code keeps of
 * it: the main one and the one of each subagent (AD-018). The format is internal to
 * Claude Code, seen in 2.1.296: a line it does not have the shape of counts nothing.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Each count of a `usage` event and the field of `message.usage` it is read from
const FIELDS = {
  input: "input_tokens",
  output: "output_tokens",
  cache_write: "cache_creation_input_tokens",
  cache_read: "cache_read_input_tokens",
} as const;

export type Counts = Record<keyof typeof FIELDS, number>;

interface Counted {
  id: unknown;
  model: string;
  usage: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The line when it counts: an `assistant` one with the usage of a real model
function counted(line: string): Counted | null {
  let entry: unknown;
  try {
    entry = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isObject(entry) || entry.type !== "assistant" || !isObject(entry.message)) return null;
  const { id, model, usage } = entry.message;
  if (!isObject(usage) || typeof model !== "string" || model === "" || model === "<synthetic>") return null;
  return { id, model, usage };
}

// The tokens of each model in the text of the transcripts, in the order given. A message
// with several blocks is several lines with the same id and the same usage: only the
// last line of an id counts, across all the transcripts.
export function usageOf(transcripts: string[]): Record<string, Counts> {
  const messages = new Map<string | number, Counted>();
  // A line without id is a message of its own: a number is the key no id has
  let alone = 0;
  for (const transcript of transcripts) {
    for (const line of transcript.split("\n")) {
      const message = counted(line);
      if (message) messages.set(typeof message.id === "string" && message.id !== "" ? message.id : alone++, message);
    }
  }

  const totals: Record<string, Counts> = {};
  for (const { model, usage } of messages.values()) {
    const total = (totals[model] ??= { input: 0, output: 0, cache_write: 0, cache_read: 0 });
    for (const [count, field] of Object.entries(FIELDS) as [keyof Counts, string][]) {
      const n = usage[field];
      if (typeof n === "number" && Number.isInteger(n) && n >= 0) total[count] += n;
    }
  }
  return totals;
}

// The usage of the session of the transcript: its file, then every *.jsonl of the
// subagents directory next to it, in the order of the names. Without the main
// transcript there is nothing to count, whatever the subagents have.
export function sessionUsage(transcriptPath: unknown): Record<string, Counts> {
  if (typeof transcriptPath !== "string") return {};
  const transcripts: string[] = [];
  try {
    transcripts.push(readFileSync(transcriptPath, "utf8"));
  } catch {
    return {};
  }
  const subagents = join(transcriptPath.replace(/\.jsonl$/, ""), "subagents");
  let names: string[] = [];
  try {
    names = readdirSync(subagents).filter((name) => name.endsWith(".jsonl")).sort();
  } catch {
    // No subagents
  }
  for (const name of names) {
    try {
      transcripts.push(readFileSync(join(subagents, name), "utf8"));
    } catch {
      // One that cannot be read counts nothing, and the others count
    }
  }
  return usageOf(transcripts);
}
