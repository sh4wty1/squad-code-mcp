# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-001 - When an AC fixes the order of two steps, test a scenario whose result differs if the steps are swapped
- signal: `surviving_mutant` · recurrence: 3 feature(s) · scope: `broker-rules` · harmful: 0
- features: peer, tui-leitura, question
- evidence: P7 broker/peers.ts:117 (PEER-09) (broker-rules) (+3 more)
- last seen: 2026-10-10T11:07:42Z

### L-004 - Put every spec-defined default in the config module and unit-test the default value
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `config` · harmful: 0
- features: peer, question
- evidence: B3 broker/broker.ts:18, S7 broker/server.ts:39 (PEER-38, PEER-28) (config) (+1 more)
- last seen: 2026-10-10T11:07:42Z

### L-010 - When an AC lists several triggers, give each trigger its own assertion or a recorded platform skip
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `mcp-server` · harmful: 0
- features: peer, question
- evidence: mutant M12 broker/broker.ts:59 (PEER-21 id ausente) (mcp-server) (+3 more)
- last seen: 2026-10-10T11:07:42Z

### L-020 - Assert a spec-defined limit with the literal value from the spec, not with the constant imported from the code under test
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `broker tests` · harmful: 0
- features: peer, tui-leitura
- evidence: mutant P11 broker/peers.ts:79 (PEER-14, PEER-42, PEER-43 60 s) (broker tests) (+1 more)
- last seen: 2026-10-09T17:54:51Z

### L-024 - State for every optional field whether null counts as absent or as a present value of the wrong type
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec routes` · harmful: 0
- features: event, question
- evidence: EVT-51 vs EVT-04; broker/session.ts:24 (spec routes) (+1 more)
- last seen: 2026-10-10T11:07:42Z

### L-036 - State for every optional text field what the empty string means: refused, absent or stored as sent
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec routes` · harmful: 0
- features: event, question
- evidence: EVT-50, EVT-51 (ticket_ref vazio em /blocked); broker/session.ts:24 (spec routes) (+1 more)
- last seen: 2026-10-10T11:07:43Z

### L-048 - When an AC lists alternatives that can hold together, state which one wins
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec` · harmful: 0
- features: tui-leitura, question
- evidence: TUI-37 (spec) (+3 more)
- last seen: 2026-10-10T11:07:42Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

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
- evidence: PEER-10 / validation.md spec-precision gap 1 (git_root object answers 500) (spec routes) (+2 more)
- last seen: 2026-10-07T20:24:49Z

### L-011 - For each validated input field, test a present value of the wrong type, not only the absent field
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: peer
- evidence: X5 peers.ts:100 (PEER-10) (broker tests)
- last seen: 2026-10-07T20:24:49Z

### L-012 - Assert every element of a refusal, hint included, for each input class the AC names
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: peer
- evidence: X1 broker.ts:65 (PEER-18) (routes)
- last seen: 2026-10-07T20:24:49Z

### L-013 - Assert the mechanism an AC names on every supported platform, not only an outcome one platform reaches without it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: peer
- evidence: mutant L6 broker/server.ts:79 (PEER-34 detached, survives on Linux) (mcp-server) (+1 more)
- last seen: 2026-10-07T22:23:44Z

### L-014 - Test each OS error code a helper branches on with a real case that raises it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker-rules` · harmful: 0
- features: peer
- evidence: mutant L2 broker/peers.ts:74 (PEER-14 EPERM) (broker-rules)
- last seen: 2026-10-07T22:23:44Z

### L-015 - Word an AC per platform when the OS API it relies on behaves differently on each
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: peer
- evidence: PEER-19 broker/shared/config.ts:29 (os.homedir reads HOME on POSIX) (spec)
- last seen: 2026-10-07T22:23:44Z

### L-016 - Revisit an assumption justified by one platform's limits when a second platform enters scope
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: peer
- evidence: Assumptions row SIGINT/SIGTERM, mutant L4 broker/server.ts:316 (spec)
- last seen: 2026-10-07T22:23:44Z

### L-017 - When a command stops a process it looks up, state in the AC that nothing else is signalled and test it with a decoy
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `cli` · harmful: 0
- features: peer
- evidence: PEER-35 broker/cli.ts:44 (kill-broker signals listeners on other addresses of the port) (cli)
- last seen: 2026-10-07T22:23:44Z

### L-018 - When a new rule makes an existing background behavior load-bearing, write an AC and a test for that behavior
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: peer
- evidence: mutant S3 broker/server.ts:249 (PEER-42 depends on a heartbeat no AC requires) (spec)
- last seen: 2026-10-07T22:57:31Z

### L-019 - When a shared rule gains a condition, test the new condition through every entry point that applies the rule
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker-rules` · harmful: 0
- features: peer
- evidence: mutant P13 broker/peers.ts:190 (PEER-16 listing vs heartbeat rule) (broker-rules)
- last seen: 2026-10-07T22:57:31Z

### L-021 - Assert that a client makes no call with a fake server that counts requests, not with the state a real server leaves
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: event
- evidence: M127 broker/server.ts:341 (EVT-81) (mcp-server) (+1 more)
- last seen: 2026-10-08T04:22:30Z

### L-022 - List a route in a refusal requirement only when the spec defines a refusal that route can reach
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: event
- evidence: EVT-47, EVT-48 (/unblocked, /turn-started) (spec)
- last seen: 2026-10-08T04:22:30Z

### L-023 - Write the order of refusals for every route and kind that has more than one, not only for the main one
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: event
- evidence: EVT-10, EVT-16 (result, verdict, /plan); broker/test/unit/send-result.test.ts:158, broker/test/unit/plan.test.ts:138 (spec)
- last seen: 2026-10-08T04:22:31Z

### L-025 - When an assumption says a state never comes back, write the AC over the whole history, not only over the current state
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: event
- evidence: EVT-17 vs Assumptions (ticket que volta de dropped); broker/plan.ts:69 (spec)
- last seen: 2026-10-08T04:22:31Z

### L-026 - When two ACs each say their refusal comes first, state which one wins
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: event
- evidence: EVT-65 vs EVT-12; broker/broker.ts:146 (spec)
- last seen: 2026-10-08T04:22:31Z

### L-027 - State whether an absent optional key is stored omitted or with its default
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: event
- evidence: EVT-15; broker/plan.ts:85 (spec)
- last seen: 2026-10-08T04:22:31Z

### L-028 - When a spec says a component ignores an input, state whether a call that gets refused downstream still counts as ignoring
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: event
- evidence: Assumptions: pedido de permissao antes do registro (M107) (spec)
- last seen: 2026-10-08T04:22:31Z

### L-029 - When a handler acts on one named input, send it a different input and assert nothing happens
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: event
- evidence: N02 broker/server.ts:224 (EVT-86) (mcp-server)
- last seen: 2026-10-08T04:43:21Z

### L-030 - Test a must-not-happen-until-X rule on the path where X was tried and refused, not only before X is tried
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: event
- evidence: N03 broker/server.ts:264 (EVT-81) (mcp-server)
- last seen: 2026-10-08T04:43:21Z

### L-031 - To assert that a timer waits one interval before its first run, have the work already pending when the timer starts
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: event
- evidence: N04 broker/server.ts:292 (Assumptions: primeiro polling) (mcp-server)
- last seen: 2026-10-08T04:43:21Z

### L-032 - Test at the wiring layer that a refusal answer from the server counts as a failed call, not only with an injected call that throws
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mcp-server` · harmful: 0
- features: event
- evidence: N01 broker/server.ts:208 (EVT-84) (mcp-server)
- last seen: 2026-10-08T04:43:22Z

### L-033 - When a read is scoped to the current container, test a row that belongs to no container, not only a row of another container
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker-rules` · harmful: 0
- features: event
- evidence: R14 broker/log.ts:147 (EVT-69) (broker-rules)
- last seen: 2026-10-08T04:58:15Z

### L-034 - When code reuses an existing value or else creates one, test the reuse with a value the creator would never produce
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: event
- evidence: R20 broker/permission.ts:19 (EVT-62) (broker tests)
- last seen: 2026-10-08T04:58:15Z

### L-035 - Test the empty string for every optional text field of a request
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: event
- evidence: R16 broker/session.ts:39 (EVT-50) (broker tests)
- last seen: 2026-10-08T04:58:15Z

### L-037 - When a setting or a kept state is unit-tested in a pure function, also assert through the loop that wires it that a non-default value reaches the function
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: tui-leitura
- evidence: T13 and T17 broker/tui.ts:93, L29 broker/tui.ts:116 (TUI-61, TUI-56, TUI-58) (tui)
- last seen: 2026-10-09T17:54:51Z

### L-038 - Give every settled assumption of the spec that changes an outcome its own test case, not only the ACs
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `spec tests` · harmful: 0
- features: tui-leitura
- evidence: D17 broker/shared/derive.ts:584, D19 broker/shared/derive.ts:527 (spec tests)
- last seen: 2026-10-09T17:54:51Z

### L-039 - When code picks or filters by a condition an AC names, test with an item that fails the condition, not only with items that pass it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: tui-leitura
- evidence: X11 broker/tui/screens/detail.ts:419, X02 broker/tui/screens/detail.ts:366, L16 broker/tui/screens/topology.ts:144 (TUI-40, TUI-45) (tui) (+1 more)
- last seen: 2026-10-09T18:48:24Z

### L-040 - Test a count limit or a rounding rule at its boundary value, not only well past it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: tui-leitura
- evidence: L08 broker/tui/screens/main.ts:77, S23 broker/tui/screens/chrome.ts:127 (tui)
- last seen: 2026-10-09T17:54:51Z

### L-041 - Test a validated collection with one valid and one invalid entry, not only with a single invalid entry
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `config` · harmful: 0
- features: tui-leitura
- evidence: C03 broker/tui/config.ts:31 (TUI-57) (config)
- last seen: 2026-10-09T17:54:51Z

### L-042 - Keep the decision of an exit code in an exported pure function so that it is tested without a terminal
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `cli` · harmful: 0
- features: tui-leitura
- evidence: TUI-59 broker/tui/probe.ts:66 (P01) (cli)
- last seen: 2026-10-09T17:54:51Z

### L-043 - When an event doubles as a marker and may be sent again, state in the AC what a resend produces
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-leitura
- evidence: TUI-25 broker/tui/feed.ts:106 (spec)
- last seen: 2026-10-09T17:54:52Z

### L-044 - State for each note of a list item which statuses of the item it applies to
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-leitura
- evidence: TUI-37 broker/tui/screens/main.ts:98 (L06) (spec)
- last seen: 2026-10-09T17:54:52Z

### L-045 - When a slice keeps a screen of the full design, state what each line that names a key of a later slice shows
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-leitura
- evidence: TUI-49 broker/tui/screens/help.ts:70 (spec)
- last seen: 2026-10-09T17:54:52Z

### L-046 - When an AC lists alternatives in order of precedence, test every pair of alternatives that can hold together, not only one pair
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: tui-leitura
- evidence: N25..N29 tui/screens/main.ts:47-55 (TUI-35) (tui)
- last seen: 2026-10-09T18:48:24Z

### L-047 - Test an is-not-equal rule with a value on each side of the expected one, not only above it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `cli` · harmful: 0
- features: tui-leitura
- evidence: N05 tui/probe.ts:46 (TUI-59) (cli)
- last seen: 2026-10-09T18:48:24Z

### L-049 - Assert cell attributes or emitted ANSI when a TUI behavior changes only styling, because text snapshots cannot detect it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: tui-leitura
- evidence: R07-F3; test/unit/tui-loop.test.ts:324 (tui)
- last seen: 2026-10-09T22:42:40Z

### L-050 - Test through the real process each callback the composition root injects into a module, not only through the wiring of the test helper
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: question
- evidence: B08 broker/broker.ts:57 (QST-36: /send not wired to delivered, whole suite green) (broker tests) (+1 more)
- last seen: 2026-10-10T11:07:41Z

### L-051 - Test the filter of a recursive walk on a member reached through another member, not only on one reached directly
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker-rules` · harmful: 0
- features: question
- evidence: M10b broker/question.ts:73 (QST-37: follower two merges away already closed) (broker-rules)
- last seen: 2026-10-10T11:07:42Z

### L-052 - Test a condition with a fixture where it differs from the conditions that coincide with it in every other fixture
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: question
- evidence: N01 broker/tui/screens/answer.ts:73 (QST-73, QST-80: no blocking question with a default) (tui)
- last seen: 2026-10-10T11:07:42Z

### L-053 - State what a line that carries a count shows when the count is zero
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: question
- evidence: QST-62 (+n mais antigas with n = 0); broker/tui/screens/questions.ts:189 (spec)
- last seen: 2026-10-10T11:07:43Z

### L-054 - State for each key and each mark of a screen with more than one focus what it does in every focus
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: question
- evidence: QST-56 (mark of the selected question); Q01 broker/tui/screens/questions.ts:105 (spec) (+1 more)
- last seen: 2026-10-10T11:07:43Z

### L-055 - State at which moment of a multi-key input a rule that depends on the mode reads the mode
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: question
- evidence: QST-78 (mode read at the start of the chunk); broker/tui/keys.ts:44 (spec)
- last seen: 2026-10-10T11:07:43Z

### L-056 - When a layer reshapes its input before a rule about that input applies, test the rule at the entry of the layer with an input the reshaping changes
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tui input` · harmful: 0
- features: question
- evidence: QST-78 broker/tui.ts:182 (validation.md round 2, gap 1) (tui input)
- last seen: 2026-10-10T11:55:55Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
