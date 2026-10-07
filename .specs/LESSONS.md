# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - When an AC fixes the order of two steps, test a scenario whose result differs if the steps are swapped
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker-rules` · harmful: 0
- features: peer
- evidence: P7 broker/peers.ts:117 (PEER-09) (broker-rules) (+1 more)
- last seen: 2026-10-07T19:35:33Z

### L-002 - Assert the listen address of a server on the real socket, not on a URL helper
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: peer
- evidence: B4 broker/broker.ts:31 (PEER-20) (routes)
- last seen: 2026-10-07T18:54:23Z

### L-003 - Assert range and variation of a generated secret, not just its type
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: peer
- evidence: S15 broker/server.ts:117 (PEER-27) (mcp-server)
- last seen: 2026-10-07T18:54:23Z

### L-004 - Put every spec-defined default in the config module and unit-test the default value
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `config` · harmful: 0
- features: peer
- evidence: B3 broker/broker.ts:18, S7 broker/server.ts:39 (PEER-38, PEER-28) (config)
- last seen: 2026-10-07T18:54:23Z

### L-005 - Test every HTTP route with an empty body and a malformed body, not only with valid JSON
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: peer
- evidence: PEER-23 broker/broker.ts:44 (routes)
- last seen: 2026-10-07T18:54:23Z

### L-006 - When an AC lists several triggers, give each trigger its own assertion or a recorded platform skip
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: peer
- evidence: PEER-33 broker/test/integration/server.test.ts:195 (mcp-server)
- last seen: 2026-10-07T18:54:23Z

### L-007 - Before tasks, check every edge case against every AC that writes on the refusal path and state which rule wins
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: peer
- evidence: PEER-09 vs edge case 3, broker/peers.ts:117 (spec)
- last seen: 2026-10-07T18:54:23Z

### L-008 - Test a caller-relative result from a caller whose group has several members, not only from a singleton
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: peer
- evidence: mutant N28 broker/peers.ts:169 (PEER-16) (broker tests)
- last seen: 2026-10-07T19:20:35Z

### L-009 - State in the spec what a request answers when any field has the wrong type, not only the required fields
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec routes` · harmful: 0
- features: peer
- evidence: PEER-10 / validation.md spec-precision gap 1 (git_root object answers 500) (spec routes) (+1 more)
- last seen: 2026-10-07T19:35:33Z

### L-010 - When an AC lists several triggers, give each trigger its own assertion or a recorded platform skip
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: peer
- evidence: mutant M12 broker/broker.ts:59 (PEER-21 id ausente) (mcp-server)
- last seen: 2026-10-07T19:35:33Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
