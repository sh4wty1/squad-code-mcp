/**
 * squad broker /open-feature and /close-feature
 *
 * The mother opens the feature the squad works on and closes it. One feature is
 * open at a time.
 */

import { win32 } from "node:path";
import type { Log } from "./log.ts";
import type { Refusal } from "./peers.ts";
import { isText, type Answer, type Caller } from "./send.ts";

// Where the session of a peer runs
export type Where = { cwd: string; git_root: string | null };

// The name of the project of a feature. win32 takes both separators: the git_root comes
// with "/" and the cwd with "\" on Windows.
export function projectOf(git_root: string | null, cwd: string): string {
  if (git_root === null) return win32.basename(cwd);
  const last = win32.basename(git_root);
  return last === ".git" ? win32.basename(win32.dirname(git_root)) : last;
}

const WORKFLOWS: readonly string[] = ["tlc", "matt-pocock"];
const OUTCOMES: readonly string[] = ["delivered", "abandoned"];

export function createFeature(log: Log) {
  // `peer` is who the id of the request belongs to and `body` the JSON object received
  function open(
    peer: Caller & Where,
    body: Record<string, unknown>
  ): { ok: true; feature_id: number; seq: number } | Refusal {
    const no = (error: string, hint: string) => log.refused(peer.name, "feature_opened", error, hint);

    if (peer.role !== "mother") {
      return no("edge_not_allowed", "Only the mother opens a feature. Ask the mother for what you need.");
    }
    if (log.openFeature()) {
      return no("feature_already_open", "A feature is already open. Close it before opening another.");
    }
    const { title, workflow, branch, base_branch, spec_ref, spec_commit } = body;
    if (
      !isText(title) ||
      !isText(workflow) ||
      !isText(branch) ||
      !isText(base_branch) ||
      !isText(spec_ref) ||
      !isText(spec_commit)
    ) {
      return no(
        "missing_field",
        "Send title, workflow, branch, base_branch, spec_ref and spec_commit as non-empty strings."
      );
    }
    if (!WORKFLOWS.includes(workflow)) {
      return no("invalid_field", "workflow must be tlc or matt-pocock.");
    }

    // Only the six fields of the contract are stored, and nothing of the rest of the body
    const opened = log.open(peer, projectOf(peer.git_root, peer.cwd), {
      title,
      workflow,
      branch,
      base_branch,
      spec_ref,
      spec_commit,
    });
    return { ok: true, ...opened };
  }

  // No gate is read here: the rule of the delivery gate comes with the Gate slice
  function close(peer: Caller, body: Record<string, unknown>): Answer {
    const no = (error: string, hint: string) => log.refused(peer.name, "feature_closed", error, hint);

    if (peer.role !== "mother") {
      return no("edge_not_allowed", "Only the mother closes a feature. Ask the mother for what you need.");
    }
    if (!log.openFeature()) {
      return no("no_open_feature", "No feature is open. There is nothing to close.");
    }
    const { outcome } = body;
    if (typeof outcome !== "string" || (body.body !== undefined && typeof body.body !== "string")) {
      return no("missing_field", "Send outcome as a string and body, if any, as a string.");
    }
    if (!OUTCOMES.includes(outcome)) {
      return no("invalid_field", "outcome must be delivered or abandoned.");
    }
    return { ok: true, seq: log.close(peer, outcome, body.body ?? "") };
  }

  return { open, close };
}
