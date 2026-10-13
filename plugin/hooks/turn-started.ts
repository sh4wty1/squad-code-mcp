#!/usr/bin/env bun
/**
 * squad hook: turn started
 *
 * Runs on UserPromptSubmit, when a turn of the session starts, and marks it in the
 * log with a `turn_started` (ADR-006). It writes nothing to the standard output,
 * which would enter the context of the turn, and always exits with 0: a session
 * outside the squad, or a broker that is not there, goes on as if it had not run.
 */

import { call, credential } from "./session.ts";

const id = credential();
if (id) await call("/turn-started", { id });
process.exit(0);
