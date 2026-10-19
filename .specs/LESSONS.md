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
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `mcp-server` · harmful: 1
- features: peer, question
- evidence: mutant M12 broker/broker.ts:59 (PEER-21 id ausente) (mcp-server) (+3 more)
- last seen: 2026-10-14T16:16:04Z

### L-012 - Assert every element of a refusal, hint included, for each input class the AC names
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `routes` · harmful: 0
- features: peer, gate
- evidence: X1 broker.ts:65 (PEER-18) (routes) (+1 more)
- last seen: 2026-10-14T21:37:53Z

### L-020 - Assert a spec-defined limit with the literal value from the spec, not with the constant imported from the code under test
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `broker tests` · harmful: 0
- features: peer, tui-leitura
- evidence: mutant P11 broker/peers.ts:79 (PEER-14, PEER-42, PEER-43 60 s) (broker tests) (+1 more)
- last seen: 2026-10-09T17:54:51Z

### L-024 - State for every optional field whether null counts as absent or as a present value of the wrong type
- signal: `spec_precision_gap` · recurrence: 3 feature(s) · scope: `spec routes` · harmful: 0
- features: event, question, papeis
- evidence: EVT-51 vs EVT-04; broker/session.ts:24 (spec routes) (+2 more)
- last seen: 2026-10-12T08:33:56Z

### L-036 - State for every optional text field what the empty string means: refused, absent or stored as sent
- signal: `spec_precision_gap` · recurrence: 3 feature(s) · scope: `spec routes` · harmful: 0
- features: event, question, papeis
- evidence: EVT-50, EVT-51 (ticket_ref vazio em /blocked); broker/session.ts:24 (spec routes) (+2 more)
- last seen: 2026-10-12T08:33:56Z

### L-039 - When code picks or filters by a condition an AC names, test with an item that fails the condition, not only with items that pass it
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `tui` · harmful: 0
- features: tui-leitura, gate
- evidence: X11 broker/tui/screens/detail.ts:419, X02 broker/tui/screens/detail.ts:366, L16 broker/tui/screens/topology.ts:144 (TUI-40, TUI-45) (tui) (+10 more)
- last seen: 2026-10-14T23:08:57Z

### L-040 - Test a count limit or a rounding rule at its boundary value, not only well past it
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `tui` · harmful: 0
- features: tui-leitura, tui-clicavel
- evidence: L08 broker/tui/screens/main.ts:77, S23 broker/tui/screens/chrome.ts:127 (tui) (+1 more)
- last seen: 2026-10-14T16:15:56Z

### L-048 - When an AC lists alternatives that can hold together, state which one wins
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec` · harmful: 0
- features: tui-leitura, question
- evidence: TUI-37 (spec) (+3 more)
- last seen: 2026-10-10T11:07:42Z

### L-050 - Test through the real process each callback the composition root injects into a module, not only through the wiring of the test helper
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `broker tests` · harmful: 0
- features: question, papeis
- evidence: B08 broker/broker.ts:57 (QST-36: /send not wired to delivered, whole suite green) (broker tests) (+2 more)
- last seen: 2026-10-12T08:33:55Z

### L-055 - State at which moment of a multi-key input a rule that depends on the mode reads the mode
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec` · harmful: 0
- features: question, tui-clicavel
- evidence: QST-78 (mode read at the start of the chunk); broker/tui/keys.ts:44 (spec) (+1 more)
- last seen: 2026-10-14T16:15:57Z

### L-057 - When an AC states a rule for each mode of a component, state what the same input does when the component is in none of them
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec` · harmful: 0
- features: question, tui-clicavel
- evidence: QST-78 vs Assumptions row 'Colagem com quebra de linha'; mutant K4 broker/tui/keys.ts:187 (validation.md round 3, P3) (spec) (+1 more)
- last seen: 2026-10-14T16:15:57Z

### L-067 - Assert a rule an AC states for an input loop through the loop, not only on the pure function the loop calls
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `tui input` · harmful: 0
- features: question, tui-clicavel
- evidence: V13 tui.ts:170; test/unit/tui-keys.test.ts:591 (QST-99, round 6 gap 4) (tui input) (+1 more)
- last seen: 2026-10-14T16:15:56Z

### L-068 - Test a rule that holds for any item of a list with the item first, last and between two others
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `tui input` · harmful: 0
- features: question, tui-clicavel
- evidence: V2 tui.ts:171; test/unit/tui-loop.test.ts:628 (QST-99, round 6 gap 6) (tui input) (+1 more)
- last seen: 2026-10-14T16:15:56Z

### L-069 - When an AC names an input of several bytes, state what happens when it arrives split across two reads
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec` · harmful: 0
- features: question, tui-clicavel
- evidence: SP4, QST-78 with QST-99; V8 tui.ts:191 (round 6) (spec) (+1 more)
- last seen: 2026-10-14T16:15:57Z

### L-073 - When two ACs give different outcomes for the same case, state in both which one wins
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec` · harmful: 0
- features: papeis, tui-clicavel
- evidence: validation.md PAP-66 and PAP-68, plugin/skills/worker/SKILL.md:79 (spec) (+1 more)
- last seen: 2026-10-14T16:15:56Z

### L-080 - When a layer reshapes its input before a rule about that input applies, test the rule at the entry of the layer with an input the reshaping changes
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `broker tests` · harmful: 0
- features: papeis, tui-clicavel
- evidence: F6 - PAP-41, PAP-57 - broker/launch.ts:146 (broker tests) (+3 more)
- last seen: 2026-10-18T18:22:10Z

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

### L-051 - Test the filter of a recursive walk on a member reached through another member, not only on one reached directly
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker-rules` · harmful: 0
- features: question
- evidence: M10b broker/question.ts:73 (QST-37: follower two merges away already closed) (broker-rules) (+2 more)
- last seen: 2026-10-11T08:09:51Z

### L-052 - Test a condition with a fixture where it differs from the conditions that coincide with it in every other fixture
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: question
- evidence: N01 broker/tui/screens/answer.ts:73 (QST-73, QST-80: no blocking question with a default) (tui) (+2 more)
- last seen: 2026-10-11T08:09:51Z

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

### L-056 - When a layer reshapes its input before a rule about that input applies, test the rule at the entry of the layer with an input the reshaping changes
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tui input` · harmful: 0
- features: question
- evidence: QST-78 broker/tui.ts:182 (validation.md round 2, gap 1) (tui input)
- last seen: 2026-10-10T11:55:55Z

### L-058 - In a test that loops over alternative triggers, send after each trigger no other input that alone produces the asserted outcome
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui tests` · harmful: 0
- features: question
- evidence: A3 broker/tui.ts:168, broker/test/unit/tui-loop.test.ts:613 (QST-99: q pressed after ctrl+c quits in its place; validation.md round 4) (tui tests)
- last seen: 2026-10-11T06:12:12Z

### L-059 - When an AC says a rule holds with or without a state, assert it in both
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui tests` · harmful: 0
- features: question
- evidence: A6 broker/tui.ts:168 (QST-99: q in a small terminal with no modal open; validation.md round 4) (tui tests)
- last seen: 2026-10-11T06:12:12Z

### L-060 - Test a key rule of an input loop with the key inside a chunk of several keys, not only alone in its read
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui input` · harmful: 0
- features: question
- evidence: A8 broker/tui.ts:168 (QST-99: q among other keys of a chunk in a small terminal; validation.md round 4) (tui input) (+2 more)
- last seen: 2026-10-11T07:20:50Z

### L-061 - When a rule gains a new trigger, test every branch of the rule under the new trigger, not only the branches the change was made for
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui input` · harmful: 0
- features: question
- evidence: B5 broker/tui/keys.ts:199 (QST-78: a delimited paste with no modal open; validation.md round 4) (tui input) (+2 more)
- last seen: 2026-10-11T07:20:50Z

### L-062 - When an AC names several inputs for one rule, assert the rule with each input in every state the AC gives
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `spec tests` · harmful: 0
- features: question
- evidence: QST-78 broker/tui/keys.ts:132 (a line feed with no modal open is not enter, the AC says it is; validation.md round 4, gap 6) (spec tests)
- last seen: 2026-10-11T06:12:13Z

### L-063 - When an AC makes a state ignore input, state what happens to an input sequence that starts in one state and ends in the other
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: question
- evidence: QST-78 with QST-99 broker/tui.ts:168 (the marks of a paste in a small terminal; validation.md round 4, SP1) (spec) (+1 more)
- last seen: 2026-10-11T07:20:51Z

### L-064 - When the condition of an AC is an or, assert each outcome of the AC with a fixture where only one side of the or holds
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui tests` · harmful: 0
- features: question
- evidence: X5, X6, X7 broker/tui.ts:171, broker/test/unit/tui-loop.test.ts:630 (QST-99: q and ctrl+c quit asserted at 100x30 only, not at 119x40 nor 120x39; validation.md round 5, gap 1) (tui tests)
- last seen: 2026-10-11T07:20:50Z

### L-065 - When an AC names several inputs for one rule, assert the rule with each input in every state the AC gives
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `spec tests` · harmful: 0
- features: question
- evidence: L4 broker/tui/keys.ts:207 (QST-78: a line feed with no modal open and keys held back after it, where the carriage return has its assertion; validation.md round 5, gap 5) (spec tests) (+2 more)
- last seen: 2026-10-11T08:09:52Z

### L-066 - When an AC says what happens to the items a rule acts on and to linked items of another owner, state what happens to a linked item of the same owner the rule does not act on
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: question
- evidence: QST-36 with QST-31 and QST-39; mutants Q6, Q6a broker/question.ts:74, :71 (a question of the same worker about another ticket merged into one the result closes; validation.md round 5, SP2) (spec)
- last seen: 2026-10-11T07:20:51Z

### L-070 - Test fragmented terminal control sequences through successive incomplete reads before the terminator, for both paste markers and every terminal size class.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker/tui` · harmful: 0
- features: question
- evidence: I4; broker/tui.ts:191; QST-78/QST-99; .specs/features/question/validation.md round 7 (broker/tui)
- last seen: 2026-10-11T09:38:31Z

### L-071 - To test that a step may fail without stopping what follows, assert something that happens after the step, not what was done before it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: papeis
- evidence: validation.md V6, PAP-08, broker/test/integration/server-credential.test.ts:94 (broker tests)
- last seen: 2026-10-12T08:33:56Z

### L-072 - State what a status other than 200 means for every HTTP read a client makes, not only for its writes
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec routes` · harmful: 0
- features: papeis
- evidence: validation.md S10, PAP-31, plugin/hooks/stop.ts:27 (spec routes)
- last seen: 2026-10-12T08:33:56Z

### L-074 - State what a failure of each secondary input does, not only of the main one
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: papeis
- evidence: validation.md PAP-18, broker/test/unit/hook-usage.test.ts:216 (spec)
- last seen: 2026-10-12T08:33:57Z

### L-075 - Write a requirement that nothing of a kind is in a place as the list of paths that must not exist
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: papeis
- evidence: validation.md PAP-01, broker/test/unit/plugin-manifest.test.ts:18 (spec)
- last seen: 2026-10-12T08:33:57Z

### L-076 - State in the AC of a command what counts as an option and in which positions it may come
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec cli` · harmful: 0
- features: papeis
- evidence: validation.md PAP-42, broker/test/unit/launch-args.test.ts:61 (spec cli)
- last seen: 2026-10-12T08:33:58Z

### L-077 - When an AC says a flow concludes the same way after a failed step, name the observable that proves it
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: papeis
- evidence: validation.md PAP-08, broker/server.ts:389 (spec)
- last seen: 2026-10-12T08:33:58Z

### L-078 - When an AC says a child process inherits several streams, run a child that uses each stream and assert each one
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `cli tests` · harmful: 0
- features: papeis
- evidence: C1b, C1c - PAP-37 - broker/cli.ts:67 - broker/test/integration/cli.test.ts:153 (cli tests)
- last seen: 2026-10-12T09:24:37Z

### L-079 - When code picks the one item of a log that passes a condition, test a log with an item that fails it before the one that passes
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: papeis
- evidence: F1 - PAP-53, PAP-54 - broker/launch.ts:216 (broker tests)
- last seen: 2026-10-12T09:24:37Z

### L-081 - Test a field that must be a list with a wrong value that is not iterable, not only with a text
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `broker tests` · harmful: 0
- features: papeis
- evidence: F3 - PAP-38 - broker/launch.ts:186 - broker/test/unit/launch.test.ts:296 (broker tests)
- last seen: 2026-10-12T09:24:37Z

### L-082 - State what a failed read is for every client that reads the same route, not only for one of them
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec routes` · harmful: 0
- features: papeis
- evidence: PAP-38 - .specs/features/papeis/spec.md:99 - F3 (spec routes)
- last seen: 2026-10-12T09:24:38Z

### L-083 - When a rule selects names by a prefix or a pattern, test a name that matches it without the separator the usual names have
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `launcher` · harmful: 0
- features: papeis
- evidence: K1 broker/launch.ts:151 (PAP-56) (launcher) (+2 more)
- last seen: 2026-10-12T11:29:26Z

### L-084 - When a surviving mutant gets a test, give the same case to every other place that has the same check
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: K16 plugin/hooks/stop.ts:27 (PAP-31) (hooks) (+1 more)
- last seen: 2026-10-18T18:22:10Z

### L-085 - Test a shutdown with each external dependency already gone, and assert every cleanup that must still happen
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server` · harmful: 0
- features: papeis
- evidence: K13 broker/server.ts:383 (PAP-07) (server)
- last seen: 2026-10-12T11:29:27Z

### L-086 - Test a type guard with a wrong value the code after it would take as valid, not only with one that fails by itself
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: K9 plugin/hooks/usage.ts:75 (PAP-21) (hooks)
- last seen: 2026-10-12T11:29:27Z

### L-087 - When code passes a flag to a tool to force one behavior, test an input for which the tool without the flag would choose another
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `launcher` · harmful: 0
- features: papeis
- evidence: A2 broker/launch.ts:143 (PAP-53) (launcher)
- last seen: 2026-10-12T11:29:27Z

### L-088 - Test a deadline on a request through the real process with a peer that never answers: a request left pending keeps the process alive
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `launcher` · harmful: 0
- features: papeis
- evidence: A10 broker/launch.ts:178 (PAP-37) (launcher)
- last seen: 2026-10-12T11:29:27Z

### L-089 - State what a process does with a request still pending when its deadline passes, and how soon the process may exit
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `launcher` · harmful: 0
- features: papeis
- evidence: PAP-37 with the definition of the open feature for the launcher, spec.md:100 (launcher)
- last seen: 2026-10-12T11:29:27Z

### L-090 - When an AC emits more than one sequence for one step, state their order
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-clicavel
- evidence: CLK-01, CLK-02, CLK-50 (validation.md volta 3) (spec)
- last seen: 2026-10-14T16:15:57Z

### L-091 - When a rule measures the time since the previous event, state which events count as previous and which clock measures it
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-clicavel
- evidence: CLK-46 (validation.md volta 3) (spec)
- last seen: 2026-10-14T16:15:57Z

### L-092 - When an AC parses a sequence of the input, state what happens when a character outside its grammar ends it
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-clicavel
- evidence: CLK-09 (validation.md volta 3) (spec)
- last seen: 2026-10-14T16:15:57Z

### L-093 - State what a tool that reads one kind of input does with every other input
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-clicavel
- evidence: CLK-17 (validation.md volta 3) (spec)
- last seen: 2026-10-14T16:15:57Z

### L-094 - When a toggle turns a feature off and on, state which state of the feature survives the toggle
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: tui-clicavel
- evidence: CLK-46, CLK-50 (validation.md volta 3) (spec)
- last seen: 2026-10-14T16:15:57Z

### L-095 - When an AC says a state of a screen shows no list, test that state while the list still has two or more other items
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: gate
- evidence: P05 broker/tui/screens/permission.ts:47 (GAT-71) (tui)
- last seen: 2026-10-14T21:37:53Z

### L-096 - Test a click on an item drawn before a read that removed it, not only on items still in the list
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui input` · harmful: 0
- features: gate
- evidence: M06 broker/tui/mouse.ts:139 (GAT-83, Assumptions) (tui input)
- last seen: 2026-10-14T21:37:53Z

### L-097 - When a rule picks by the larger of two counts, state what it does when they are equal
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: gate
- evidence: S04 broker/tui/screens/gate.ts:163 (GAT-93) (spec)
- last seen: 2026-10-14T21:37:53Z

### L-098 - When an AC counts over a whole set next to a count over a filtered part of it, test with an item only the whole set has
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tui` · harmful: 0
- features: gate
- evidence: V27 broker/tui/screens/gate.ts:28 (GAT-43) (tui)
- last seen: 2026-10-14T23:08:57Z

### L-099 - Test each word of a rule that narrows its input (regular file, the case of a prefix, the extension a path loses) with an input only that word leaves out
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `launcher` · harmful: 0
- features: papeis
- evidence: W12 broker/launch.ts:97 (PAP-39) (launcher) (+11 more)
- last seen: 2026-10-17T19:53:25Z

### L-100 - Bound a test of a deadline by the deadline plus a margin, not by several times the time measured: a wide bound lets a late abort pass
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `launcher` · harmful: 0
- features: papeis
- evidence: W17 broker/launch.ts:184 (PAP-37) (launcher)
- last seen: 2026-10-16T15:08:17Z

### L-101 - Test every way a process can end that must still clean up, signals included, on the platform where that way runs
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server` · harmful: 0
- features: papeis
- evidence: W2 broker/server.ts:400 (PAP-07) (server) (+1 more)
- last seen: 2026-10-16T15:49:01Z

### L-102 - Test a deadline with an answer that arrives after it, not only with one that never arrives: a bound on the exit time lets a longer deadline pass
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `launcher` · harmful: 0
- features: papeis
- evidence: Y9 broker/launch.ts:186 (PAP-37) (launcher)
- last seen: 2026-10-16T15:49:02Z

### L-103 - Fence a suffix rule on a name in one go on its four sides, the dot, the anchor at the end, the case and the place in the path, instead of one side per round
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: Q2, Q5 plugin/hooks/usage.ts:82, :85 (PAP-18) (hooks) (+2 more)
- last seen: 2026-10-17T22:01:11Z

### L-104 - Run the tests of a file-system layer on Linux too: a mutant on the case of a directory name lives on the case-insensitive file system of Windows
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: Q7 plugin/hooks/usage.ts:82 (PAP-18) (hooks)
- last seen: 2026-10-16T18:05:43Z

### L-105 - Fence a suffix rule on a name also with a name that ends in a shorter start of the suffix, such as .json for .jsonl
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: R1, R2, R4 plugin/hooks/usage.ts:82, :85 (PAP-18) (hooks)
- last seen: 2026-10-16T23:13:15Z

### L-106 - Test that one unreadable entry does not hide the others with an entry that fails already at stat, such as a dangling link, not only with one that fails at read
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: R17 plugin/hooks/usage.ts:85 (PAP-18) (hooks)
- last seen: 2026-10-16T23:13:15Z

### L-107 - To test a sort of directory entries, create the files in an order that is neither the sorted one nor its reverse: tmpfs lists the newest first
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: R5 plugin/hooks/usage.ts:85 (PAP-18, design.md:117) (hooks)
- last seen: 2026-10-16T23:13:15Z

### L-108 - Fence a suffix rule on a name also with a name whose extension only starts with the suffix, such as .jsonld for .jsonl
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: U1, U2 plugin/hooks/usage.ts:82, :85 (PAP-18) (hooks)
- last seen: 2026-10-17T19:53:26Z

### L-109 - Give a rule on a file extension a name whose stem has dots of its own, such as agent.2.jsonl, so a rule that cuts at the first dot fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: U4, U5 plugin/hooks/usage.ts:82, :85 (PAP-18) (hooks)
- last seen: 2026-10-17T19:53:26Z

### L-110 - Test that an unreadable file counts nothing also with a regular file without read permission, the one a stat check before the read lets through
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: U9, U13 plugin/hooks/usage.ts:90-94 (PAP-18) (hooks)
- last seen: 2026-10-17T19:53:26Z

### L-111 - Test a directory that is listed for its entries also when the path is a regular file, so a check that it exists before listing it fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: U8 plugin/hooks/usage.ts:84-88 (PAP-18) (hooks)
- last seen: 2026-10-17T19:53:26Z

### L-112 - Give a rule on the entries of a directory a subdirectory with a matching file inside, so a recursive listing fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: U12 plugin/hooks/usage.ts:85 (PAP-18) (hooks)
- last seen: 2026-10-17T19:53:26Z

### L-113 - When files are read in the order of their names, say whether the order is by code unit or by locale, and test it with names that differ in case
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: U6 plugin/hooks/usage.ts:85 (PAP-18, design.md:117) (hooks)
- last seen: 2026-10-17T19:53:26Z

### L-114 - When a spec selects files by a pattern such as *.jsonl, say whether a name that starts with a dot matches
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: U7 plugin/hooks/usage.ts:85 (PAP-18, spec.md:106) (hooks)
- last seen: 2026-10-17T19:53:26Z

### L-115 - Give a rule that takes every matching entry of a directory an entry with the name of the file the directory belongs to, so a filter that drops that name fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: N7 plugin/hooks/usage.ts:85 (PAP-18) (hooks)
- last seen: 2026-10-17T22:01:11Z

### L-116 - Test a rule over every file of a directory with more files than any other case reads, so a cap on how many are read fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: N12 plugin/hooks/usage.ts:89 (PAP-18) (hooks)
- last seen: 2026-10-17T22:01:11Z

### L-117 - Test a sum over several files with two files of the same text, so a dedup of the texts fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: N14 plugin/hooks/usage.ts:96 (PAP-15, PAP-18) (hooks)
- last seen: 2026-10-17T22:01:11Z

### L-118 - Test that the files next to a main file add to it also when the main file counts nothing, so a shortcut on an empty main fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: N15 plugin/hooks/usage.ts:81-82 (PAP-18, PAP-19) (hooks)
- last seen: 2026-10-17T22:01:11Z

### L-119 - Test that an unreadable entry is skipped with an error code the other cases do not raise, such as a link loop, so a list of the codes let through fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: N16, N17 plugin/hooks/usage.ts:86, :92 (PAP-18) (hooks)
- last seen: 2026-10-17T22:01:11Z

### L-120 - When files are read in the order of their names, say whether the extension is part of the name compared, and test it with a stem that is a prefix of another
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: N13 plugin/hooks/usage.ts:85, design.md:117 (PAP-18) (hooks)
- last seen: 2026-10-17T22:01:11Z

### L-121 - When test names are generated, generate the stem too, with a space and a letter outside ASCII, so a filter on the characters of the name fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: validation.md volta 11, G4, G25 (plugin/hooks/usage.ts:85) (hooks)
- last seen: 2026-10-18T18:22:10Z

### L-122 - Test a rule over every line of every file with a file of the size a real one reaches, so a cap on the bytes or the lines read fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: validation.md volta 11, G8, G9 (plugin/hooks/usage.ts:54, :90-91) (hooks)
- last seen: 2026-10-18T18:22:10Z

### L-123 - Test an entry without id next to an entry whose id is the text of a small number, so a counter key that can equal a real id fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: papeis
- evidence: validation.md volta 11, G2 (plugin/hooks/usage.ts:56) (hooks)
- last seen: 2026-10-18T18:22:10Z

### L-124 - State the text encoding of every file a spec reads, and test it with a value outside ASCII
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: papeis
- evidence: validation.md volta 11, G10 (plugin/hooks/usage.ts:91) (spec)
- last seen: 2026-10-18T18:22:11Z

### L-125 - Test what a package ships by comparing the full file list of the built artifact with the expected list, not by probing chosen paths
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `packaging` · harmful: 0
- features: distribuicao
- evidence: validation.md S6, S7; broker/test/unit/package.test.ts:32 (packaging)
- last seen: 2026-10-19T15:31:07Z

### L-126 - When an AC says a program opens, state what it draws first and how it exits
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: distribuicao
- evidence: DIST-08 (spec)
- last seen: 2026-10-19T15:31:07Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
