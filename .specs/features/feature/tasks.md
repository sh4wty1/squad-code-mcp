# Feature Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/feature/design.md`
**Status**: Approved

Linha de base no Windows antes da T1, com Bun 1.4.2: 424 testes, 421 passam, 3 pulados
(`.specs/STATE.md`); só `test/unit`: 305 testes, 304 passam, 1 pulado (medido em `af3534d`).
Confirmar os dois números antes da T1.

Todo o código fica em `broker/`; os comandos rodam de dentro dele. Mensagens de commit
seguem a convenção do repositório (frase imperativa em minúsculas, sem prefixo), não
Conventional Commits: é instrução do dono do repositório, e por isso `check_commit.py` não
se aplica. Cada teste leva no nome o id do requisito (`"FEAT-08: ..."`).

### Regra das tarefas de migração (T11 a T20, T26 a T29)

O helper novo entra ao lado do antigo e cada arquivo de teste migra em uma tarefa. Abrir
pela regra custa um `seq` e cinco entregas pendentes (`leader`, `judge`, `worker-1`,
`worker-2`, `worker-3`); fechar custa o mesmo. Em cada arquivo:

- Toda chamada do helper antigo vira a do novo. Nenhuma sobra no arquivo.
- O valor esperado novo é calculado a partir da spec (o `feature_opened` ocupa um `seq`, as
  cinco entregas existem e ficam pendentes, o `leader` e os outros devem `delivery` em
  `/state`), não copiado da saída do teste que falhou.
- Nenhum teste é apagado, pulado ou enfraquecido: a contagem de testes do arquivo é a mesma
  antes e depois, e uma comparação exata continua exata (`toEqual` não vira `toContain`).
- A suíte inteira fica verde no fim de cada tarefa.

---

## Test Coverage Matrix

> Guidelines found: none - strong defaults applied. `broker/CLAUDE.md` só fixa `bun test` e a checagem de tipos; os testes da Peer e da Event dão o estilo e o piso.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Regras do broker (`feature.ts`, `log.ts`, `peers.ts`, `db.ts`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Derivação (`shared/derive.ts`) | unit | 1:1 com FEAT-26 e FEAT-27 | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Tools (`tools.ts`) | unit | Lista por papel, schema e rota de cada tool nova | `broker/test/unit/tools.test.ts` | `bun test test/unit` |
| Rotas HTTP (`broker.ts`) | integration | Toda rota nova: caminho feliz, uma recusa de regra, `unknown_peer` e corpo inválido, contra o processo real | `broker/test/integration/*.test.ts` | `bun test` |
| Servidor MCP (`server.ts`) | integration | Todo AC de tools e de entrega, com cliente MCP real por stdio | `broker/test/integration/*.test.ts` | `bun test` |
| Arquivo de teste migrado (`test/unit/*.test.ts`) | unit | Mesma contagem de testes; nenhuma comparação enfraquecida | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Arquivo de teste migrado (`test/integration/*.test.ts`) | integration | Mesma contagem de testes; nenhuma comparação enfraquecida | `broker/test/integration/*.test.ts` | `bun test` |
| Helpers de teste (`test/*/helpers.ts`) | none | build gate only: a suíte que os usa é a prova | - | build gate only |
| Documentação (`README.md`, `CLAUDE.md`) | none | build gate only | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas só com teste de unidade | `bun test test/unit` |
| Full | Tarefas com teste de integração | `bun test` |
| Build | Fim de fase e tarefas sem teste | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |

Não há linter configurado; o build gate é tipo mais testes. `bun x tsc` não serve: baixa um
`tsc` 7 que acusa erros de tipo global (`.specs/STATE.md`, Ambiente). A contagem de testes
só pode aumentar, e nas tarefas de migração e de renomear fica igual.

---

## Execution Plan

### Phase 1: Banco, log, regra e derivação

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9
```

### Phase 2: Migração dos testes de unidade, primeira metade

```
T9 → T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 3: Migração dos testes de unidade, segunda metade

```
T15 → T16 → T17 → T18 → T19 → T20 → T21
```

### Phase 4: Processos

```
T21 → T22 → T23 → T24
```

### Phase 5: Migração dos testes de integração e documentação

```
T24 → T25 → T26 → T27 → T28 → T29 → T30 → T31
```

31 tarefas. Em lotes de fases inteiras: Phase 1 (9), Phase 2 (6), Phase 3 (6), Phases 4 e 5 (11, ou 3 e 8).

---

## Task Breakdown

### T1: Índice único da feature aberta

**What**: `openDatabase` cria `CREATE UNIQUE INDEX IF NOT EXISTS features_one_open ON features ((1)) WHERE closed_seq IS NULL`, também sobre um banco que já existe.
**Where**: `broker/db.ts`
**Depends on**: None
**Reuses**: `openDatabase`; os testes de schema de `broker/test/unit/db.test.ts`
**Requirement**: FEAT-09

**Done when**:

- [x] O segundo `INSERT` em `features` com `closed_seq` nulo lança erro e a tabela fica com uma linha
- [x] O `UPDATE` que põe `closed_seq` nulo numa fechada, havendo outra aberta, lança erro e a linha fica igual
- [x] Duas fechadas e uma aberta são aceitas
- [x] Um banco em arquivo temporário do qual o índice foi apagado ganha o índice no `openDatabase` seguinte e recusa a segunda aberta (edge case do banco da Event)
- [x] Os 305 testes de unidade continuam como estavam (medido: o índice sozinho não quebra nenhum)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T2: Entrega de um evento com `to` `*`

**What**: `record` grava, para um evento com `to` `*`, uma entrega para cada nome de `ROSTER` que não é o autor; os quatro kinds de `DELIVERED` continuam indo ao `to`. Por dentro, o `feature_id` passa a poder vir de quem chama.
**Where**: `broker/log.ts`
**Depends on**: T1
**Reuses**: `ROSTER` de `broker/peers.ts`; `record` e `DELIVERED` atuais
**Requirement**: FEAT-07, FEAT-21

**Done when**:

- [x] `record` de um evento da `mother` com `to` `*` deixa exatamente cinco entregas, `leader`, `judge`, `worker-1`, `worker-2` e `worker-3`, com `acked_at` nulo, e nenhuma para `mother`
- [x] `task`, `result`, `verdict` e `permission_decision` continuam com uma entrega, para o `to`
- [x] Um kind sem entrega (`plan`, `refused`) continua sem nenhuma
- [x] Sem `feature_id` informado, o evento leva o da feature aberta, como antes
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T3: `log.open`

**What**: `open(by, project, fields): { feature_id, seq }` e o tipo `FeatureFields`: reserva o `id` com `MAX(feature_id) + 1` de `events`, grava o `feature_opened`, a linha de `features` com `id` explícito e as cinco entregas, em uma transação.
**Where**: `broker/log.ts` (modify)
**Depends on**: T2
**Reuses**: `record` da T2; `appendEvent` de `broker/db.ts`
**Requirement**: FEAT-01, FEAT-07, FEAT-08, FEAT-12

**Done when**:

- [x] A linha tem os seis campos, `project`, `opened_seq` igual ao `seq` devolvido, `closed_seq` e `outcome` nulos
- [x] O evento tem `from_name` `mother`, `role_from` `mother`, `to_name` `*`, `summary` e `body` vazios, `ticket_ref` nulo, `feature_id` igual ao `id` da linha e `data` com exatamente os seis campos
- [x] Cinco entregas pendentes, nenhuma para `mother`
- [x] FEAT-12: depois de abrir, fechar e apagar a linha de `features` por fora, a abertura seguinte recebe um `id` maior que todo `feature_id` de `events`
- [x] FEAT-08: com um gatilho temporário que aborta o `INSERT` em `features`, `open` lança erro e não há evento, linha nem entrega novos; o mesmo com o gatilho em `deliveries`
- [x] Com uma feature aberta, `open` lança erro pelo índice e nada é gravado
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T4: `log.close`

**What**: `close(by, outcome, body): number`: grava o `feature_closed` com o `feature_id` da aberta, as cinco entregas e o `UPDATE` de `closed_seq` e `outcome` da linha, em uma transação.
**Where**: `broker/log.ts` (modify)
**Depends on**: T3
**Reuses**: `record` da T2; `openFeature()`
**Requirement**: FEAT-14, FEAT-21, FEAT-22

**Done when**:

- [x] O evento tem `from_name` `mother`, `role_from` `mother`, `to_name` `*`, `summary` vazio, o `body` recebido, `ticket_ref` nulo, `feature_id` da feature que fecha e `data` `{ outcome }`
- [x] A linha fica com `closed_seq` igual ao `seq` devolvido e `outcome`; `openFeature()` passa a devolver nulo
- [x] Cinco entregas pendentes do `feature_closed`, nenhuma para `mother`
- [x] FEAT-21: com um gatilho temporário que aborta o `UPDATE` em `features`, `close` lança erro e não há evento nem entrega novos e a linha fica aberta; o mesmo com o gatilho em `deliveries`
- [x] FEAT-22: os eventos e as entregas anteriores, inclusive as pendentes, ficam iguais, e o log ganha um evento só
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T5: `find` devolve `cwd` e `git_root`

**What**: `peers.find(id)` passa a devolver `{ name, role, cwd, git_root }` do registro.
**Where**: `broker/peers.ts`
**Depends on**: T4
**Reuses**: `find` atual; `join` de `broker/test/unit/helpers.ts`
**Requirement**: FEAT-11

**Done when**:

- [x] `find` do id de uma sessão registrada devolve o `cwd` e o `git_root` que ela mandou no `/register`
- [x] `git_root` nulo no registro volta nulo
- [x] Id desconhecido continua devolvendo nulo
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T6: `projectOf`

**What**: Módulo novo com `projectOf(git_root, cwd): string`, pura e exportada, e o tipo `Where`.
**Where**: `broker/feature.ts` (novo)
**Depends on**: T5
**Reuses**: `win32.basename` e `win32.dirname` de `node:path`
**Requirement**: FEAT-11

**Done when**:

- [x] `/repo/.git` → `repo`; `C:/Fassi/squad-code-mcp/.git` → `squad-code-mcp`
- [x] `git_root` que não termina em `.git` (`/srv/repo.git`) → o último segmento, `repo.git`
- [x] `git_root` nulo com `cwd` `C:\Users\Dev\proj` → `proj`; com `cwd` `/home/dev/proj` → `proj`
- [x] `git_root` nulo com `cwd` `C:\` → texto vazio
- [x] Testes em `broker/test/unit/feature-open.test.ts`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T7: Regra de `/open-feature`

**What**: `createFeature(log)` com `open(peer, body)`: papel, estado, campos na ordem de FEAT-06, `project` por `projectOf`, `data` montado campo a campo, recusas por `log.refused` com `attempted_kind` `feature_opened`.
**Where**: `broker/feature.ts` (modify)
**Depends on**: T6
**Reuses**: `isText`, `Caller`, `Answer` de `broker/send.ts`; o formato de `createPlan` em `broker/plan.ts`; `refusedWith` de `broker/test/unit/helpers.ts`
**Requirement**: FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-10, FEAT-13

**Done when**:

- [x] FEAT-01: a `mother` abre e a resposta é `{ ok: true, feature_id, seq }`; `project` da linha sai do `git_root` e do `cwd` do peer
- [x] FEAT-02: cada um dos outros três papéis recebe `edge_not_allowed`
- [x] FEAT-03: com feature aberta, `feature_already_open`; o `refused` leva o `feature_id` da aberta e a linha dela fica igual
- [x] FEAT-04: um teste por campo, para ausente, `null`, não texto e texto vazio → `missing_field`
- [x] FEAT-05: `workflow` fora de `tlc` e `matt-pocock` → `invalid_field`; os dois valores são aceitos
- [x] FEAT-06: `leader` com feature aberta → `edge_not_allowed`; `mother` com feature aberta e campo faltando → `feature_already_open`; campo faltando e `workflow` inválido → `missing_field`
- [x] FEAT-10: toda recusa passa por `refusedWith(..., "feature_opened", ...)` e não deixa linha em `features`
- [x] `feature_id`, `project`, `from` e `opened_seq` no corpo são ignorados: nem a linha nem `data` os levam
- [x] FEAT-13: depois de abrir, o `task` mother → leader e o `plan` são aceitos e gravados com o `feature_id` dela, e `/state` devolve `feature` com os sete campos
- [x] Testes em `broker/test/unit/feature-open.test.ts`, com `createFeature(s.log)` sobre o `setup()`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T8: Regra de `/close-feature`

**What**: `close(peer, body)` em `createFeature`: papel, estado, campos na ordem de FEAT-19, `body` opcional, recusas com `attempted_kind` `feature_closed`, nenhuma leitura de gate.
**Where**: `broker/feature.ts` (modify)
**Depends on**: T7
**Reuses**: `open` da T7; `log.close` da T4
**Requirement**: FEAT-14, FEAT-15, FEAT-16, FEAT-17, FEAT-18, FEAT-19, FEAT-20, FEAT-22, FEAT-23, FEAT-24, FEAT-25

**Done when**:

- [x] FEAT-14: `delivered` e `abandoned` são aceitos e respondem `{ ok: true, seq }`; sem `body` o evento leva `body` vazio
- [x] FEAT-15: cada um dos outros três papéis recebe `edge_not_allowed`
- [x] FEAT-16: sem feature aberta, `no_open_feature`; a segunda chamada seguida recebe `no_open_feature` e `closed_seq` e `outcome` da primeira ficam
- [x] FEAT-17: `outcome` ausente, `null` ou não texto, e `body` presente e não texto → `missing_field`
- [x] FEAT-18: `outcome` texto fora dos dois → `invalid_field`
- [x] FEAT-19: `leader` sem feature aberta → `edge_not_allowed`; `mother` sem feature e sem `outcome` → `no_open_feature`; `outcome` inválido com `body` não texto → `missing_field`
- [x] FEAT-20: toda recusa passa por `refusedWith(..., "feature_closed", ...)` e a linha fica igual
- [x] FEAT-22: fechar com um peer bloqueado não grava `unblocked`; `/blocked`, `/usage` e `/turn-started` depois do encerramento gravam `feature_id` nulo
- [x] FEAT-23: `delivered` é aceito sem nenhum gate no log
- [x] FEAT-24: depois de fechar, `/send` e `/plan` recebem `no_open_feature`; `/state` do worker que tinha ticket vem com `feature` e `ticket` nulos e sem dívida de `result`, `verdict`, `task` ou `plan`
- [x] FEAT-25: uma nova abertura é aceita; nela, `worker-1`, que tinha o ticket `T` aberto na anterior, recebe `task` de outro `ticket_ref`, e um `plan` com um `T` novo é aceito
- [x] Testes em `broker/test/unit/feature-close.test.ts`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T9: Derivação de features e teste de replay

**What**: `features(events): DerivedFeature[]`, pura, em ordem crescente de `id`, e o tipo `DerivedFeature`.
**Where**: `broker/shared/derive.ts` (modify)
**Depends on**: T8
**Reuses**: `SquadEvent` de `broker/shared/contract.ts`; `log.after(0)` como entrada do replay
**Requirement**: FEAT-26, FEAT-27

**Done when**:

- [x] FEAT-26 em `broker/test/unit/derive.test.ts`: log vazio → lista vazia; uma aberta com `closed_seq` e `outcome` nulos; uma fechada com o `seq` e o `outcome` do `feature_closed` de mesmo `feature_id`; duas features em ordem de `id`; `refused` e os outros kinds não geram item
- [x] FEAT-27 em `broker/test/unit/replay.test.ts`: depois de abrir, recusar uma segunda abertura, fechar como `abandoned`, recusar um segundo encerramento e abrir outra, `features(log.after(0))` é igual a `SELECT` de `features` sem `project`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T10: Helper de unidade novo, ao lado do antigo

**What**: `setup()` cria `feature = createFeature(log)` e ganha `openByRule(fields?)`, que chama `feature.open` como `mother` (`cwd` `/repo`, `git_root` `/repo/.git`) e devolve o `feature_id`, e `closeByRule()`, que chama `feature.close` com `delivered`. `openFeature` e `closeFeature` antigos ficam como estão. O helper não confirma entrega nenhuma.
**Where**: `broker/test/unit/helpers.ts`
**Depends on**: T9
**Reuses**: `createFeature` da T7; os valores padrão do `openFeature` atual
**Requirement**: FEAT-27

**Done when**:

- [x] `openByRule` e `closeByRule` lançam erro se a regra recusar, em vez de devolver a recusa
- [x] Os helpers antigos não mudam e nenhum arquivo de teste muda
- [x] Gate: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T11: Migrar `log.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração. Os parâmetros `project` e `opened_seq` somem das chamadas: a linha esperada passa a ter `project` `repo` e o `opened_seq` do `feature_opened`.
**Where**: `broker/test/unit/log.test.ts`
**Depends on**: T10
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada de `openFeature` nem de `closeFeature` no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (o design mediu 16 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T12: Migrar `send.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/send.test.ts`
**Depends on**: T11
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (10 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T13: Migrar `send-task.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/send-task.test.ts`
**Depends on**: T12
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (10 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T14: Migrar `send-result.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/send-result.test.ts`
**Depends on**: T13
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (8 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T15: Migrar `send-verdict.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/send-verdict.test.ts`
**Depends on**: T14
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (6 testes afetados)
- [x] Gate: `bun node_modules/typescript/bin/tsc --noEmit && bun test` (fim de fase)

**Tests**: unit
**Gate**: build

---

### T16: Migrar `plan.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/plan.test.ts`
**Depends on**: T15
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (8 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T17: Migrar `state.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração. Quem não é a `mother` passa a dever a `delivery` do `feature_opened` em `/state`.
**Where**: `broker/test/unit/state.test.ts`
**Depends on**: T16
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (4 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T18: Migrar `session.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/session.test.ts`
**Depends on**: T17
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (5 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T19: Migrar `presence.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/presence.test.ts`
**Depends on**: T18
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (4 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T20: Migrar `permission.test.ts`

**What**: Trocar as chamadas de `openFeature` e `closeFeature` pelo helper novo, pela regra das tarefas de migração.
**Where**: `broker/test/unit/permission.test.ts`
**Depends on**: T19
**Reuses**: `openByRule`, `closeByRule` da T10
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada do helper antigo no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida (3 testes afetados)
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T21: Apagar o helper de unidade antigo e renomear o novo

**What**: Apagar `openFeature` e `closeFeature` antigos; `openByRule` vira `openFeature` e `closeByRule` vira `closeFeature`, no helper e, só o nome, em todo arquivo de `broker/test/unit/` que os chama.
**Where**: `broker/test/unit/helpers.ts`
**Depends on**: T20
**Reuses**: nada novo
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhum `openByRule` nem `closeByRule` em `broker/test/`
- [x] Nenhum `INSERT INTO features` nem `UPDATE features` em `broker/test/unit/helpers.ts`
- [x] Mesma contagem de testes de unidade do fim da T20
- [x] Gate: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T22: Rotas `/open-feature` e `/close-feature`

**What**: As duas rotas entram em `CREDENTIAL_ROUTES` e no `switch` de `answer`, chamando `feature.open(peer, body)` e `feature.close(peer, body)`; `peer` passa a levar `cwd` e `git_root`.
**Where**: `broker/broker.ts`
**Depends on**: T21
**Reuses**: `createFeature` da T7; `startBroker`, `post`, `get`, `readDb`, `readDeliveries` de `broker/test/integration/helpers.ts`; `features` da T9
**Requirement**: FEAT-01, FEAT-03, FEAT-07, FEAT-14, FEAT-16, FEAT-27, FEAT-28

**Done when**:

- [x] Testes em `broker/test/integration/feature.test.ts`, contra o processo real, com a `mother` registrada por `/register`
- [x] Por rota: caminho feliz, uma recusa de regra com o seu `refused`, `unknown_peer` sem `refused`, e corpo que não é objeto
- [x] O `task` mother → leader, recusado com `no_open_feature` antes, é aceito depois de `/open-feature` (teste independente da história 1)
- [x] `leader` offline na abertura recebe o `feature_opened` no primeiro `/poll-messages` depois de registrar; o `/poll-messages` da `mother` não traz o `feature_opened` nem o `feature_closed`
- [x] FEAT-27: abrir, fechar como `abandoned`, tentar fechar de novo, abrir outra; `features` aplicada a `GET /events` devolve as duas linhas da tabela sem `project`
- [x] FEAT-28: o broker parado e erguido sobre o mesmo banco responde `feature_already_open` com feature aberta e `no_open_feature` sem
- [x] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T23: Tools `open_feature` e `close_feature`

**What**: As duas tools em `OF_ROLE.mother` e em `ROUTE_OF`: `open_feature` com os seis campos `required` e `workflow` com `enum`; `close_feature` com `outcome` com `enum` e `body` opcional.
**Where**: `broker/tools.ts`
**Depends on**: T22
**Reuses**: `string`, o formato de `PLAN_TOOL`; `broker/test/unit/tools.test.ts`
**Requirement**: FEAT-29

**Done when**:

- [x] `toolsFor("mother")` lista as duas além das de EVT-89; `leader`, `worker` e `judge` não listam nenhuma
- [x] `open_feature` tem `required` com os seis campos e `workflow` com `enum` `tlc`, `matt-pocock`
- [x] `close_feature` tem `required` só com `outcome`, com `enum` `delivered`, `abandoned`
- [x] `ROUTE_OF` leva `open_feature` a `/open-feature` e `close_feature` a `/close-feature`, sem `kind`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T24: Texto das tools e instruções no servidor MCP

**What**: Resposta com `feature_id` numérico vira `Feature <feature_id> opened with seq <seq>.`; as outras continuam `Recorded with seq <seq>.`. As instruções do servidor passam a citar `feature_opened` e `feature_closed` entre os kinds que chegam pelo canal.
**Where**: `broker/server.ts`
**Depends on**: T23
**Reuses**: o caminho comum de recusa em `server.ts`; `toPush` de `broker/delivery.ts`, sem mudança; `startSession` de `broker/test/integration/helpers.ts`
**Requirement**: FEAT-29, FEAT-30, FEAT-31, FEAT-32, FEAT-33

**Done when**:

- [x] Testes em `broker/test/integration/server-feature.test.ts`, com clientes MCP reais
- [x] FEAT-29: a sessão da `mother` lista `open_feature` e `close_feature`; a do `leader` não
- [x] FEAT-30: `open_feature` devolve `Feature <id> opened with seq <n>.`, com o `id` e o `seq` gravados
- [x] FEAT-31: `close_feature` devolve `Recorded with seq <n>.`
- [x] FEAT-32: `open_feature` com feature aberta devolve erro com `feature_already_open` e o `hint` do broker
- [x] FEAT-33: o `leader` recebe pelo canal a notificação com `kind` `feature_opened` e, no `content`, os seis campos; a entrega dele fica confirmada e o polling seguinte vem vazio; o mesmo para `feature_closed` com `outcome`
- [x] Critério de sucesso 1: `mother` e `leader` vão de `open_feature` a `close_feature` passando por um `send_task` e um `plan`, sem escrita em `features` por fora
- [x] Gate: `bun node_modules/typescript/bin/tsc --noEmit && bun test` (fim de fase)

**Tests**: integration
**Gate**: build

---

### T25: Helper de integração novo, ao lado do antigo

**What**: `openByRoute(url, motherId)`, que faz `POST /open-feature` com os campos de `FEATURE` e devolve o `feature_id`; lança erro se o broker recusar. O `openFeature(file)` antigo fica como está.
**Where**: `broker/test/integration/helpers.ts`
**Depends on**: T24
**Reuses**: `post` e `FEATURE` no mesmo arquivo
**Requirement**: FEAT-27

**Done when**:

- [x] O helper antigo não muda e nenhum arquivo de teste muda
- [x] Gate: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T26: Migrar `routes.test.ts`

**What**: Trocar as 12 chamadas por `await openByRoute(...)`, registrando uma `mother` por `/register` no teste que não tem, e o `UPDATE features SET closed_seq` da linha 372 por `POST /close-feature`, pela regra das tarefas de migração.
**Where**: `broker/test/integration/routes.test.ts`
**Depends on**: T25
**Reuses**: `openByRoute` da T25
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada de `openFeature` e nenhuma escrita em `features` no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida
- [x] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T27: Migrar `events.test.ts`

**What**: Trocar as 2 chamadas por `await openByRoute(...)`, pela regra das tarefas de migração.
**Where**: `broker/test/integration/events.test.ts`
**Depends on**: T26
**Reuses**: `openByRoute` da T25
**Requirement**: FEAT-27

**Done when**:

- [x] Nenhuma chamada de `openFeature` no arquivo
- [x] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida
- [x] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T28: Migrar `server-delivery.test.ts`

**What**: Trocar as 6 chamadas por `await openByRoute(...)`, pela regra das tarefas de migração. Toda sessão que não é a `mother` passa a receber um `feature_opened` em `pushed()` antes do que o teste envia.
**Where**: `broker/test/integration/server-delivery.test.ts`
**Depends on**: T27
**Reuses**: `openByRoute` da T25
**Requirement**: FEAT-27, FEAT-33

**Done when**:

- [ ] Nenhuma chamada de `openFeature` no arquivo
- [ ] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida: onde o teste comparava `pushed()` inteiro, continua comparando inteiro, com o `feature_opened` na frente
- [ ] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T29: Migrar `server-tools.test.ts`

**What**: Trocar as 4 chamadas por `await openByRoute(...)`, pela regra das tarefas de migração.
**Where**: `broker/test/integration/server-tools.test.ts`
**Depends on**: T28
**Reuses**: `openByRoute` da T25
**Requirement**: FEAT-27

**Done when**:

- [ ] Nenhuma chamada de `openFeature` no arquivo
- [ ] Mesma contagem de testes do arquivo; nenhuma comparação enfraquecida
- [ ] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T30: Apagar o helper de integração antigo e renomear o novo

**What**: Apagar o `openFeature(file)` antigo; `openByRoute` vira `openFeature`, no helper e, só o nome, em todo arquivo de `broker/test/integration/` que o chama.
**Where**: `broker/test/integration/helpers.ts`
**Depends on**: T29
**Reuses**: nada novo
**Requirement**: FEAT-27

**Done when**:

- [ ] Nenhum `openByRoute` em `broker/test/`
- [ ] Nenhum `INSERT INTO features` em `broker/test/integration/`, e o helper não abre mais o arquivo do banco para escrita
- [ ] Mesma contagem de testes do fim da T29
- [ ] Gate: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T31: Documentação do broker

**What**: No README: o status passa a incluir a fatia Feature, as duas rotas entram na tabela de rotas com a ordem das recusas, as duas tools entram na linha da `mother`, a frase sobre `no_open_feature` "até a fatia Feature" sai, e as duas rotas entram na lista das que gravam `refused`. O `CLAUDE.md` do broker ganha a linha de `feature.ts` na arquitetura.
**Where**: `broker/README.md`, `broker/CLAUDE.md`
**Depends on**: T30
**Reuses**: o formato das linhas de `/plan` no README e de `plan.ts` no `CLAUDE.md`
**Requirement**: FEAT-06, FEAT-19, FEAT-29

**Done when**:

- [ ] Nenhuma frase do README diz que nada abre uma feature
- [ ] As ordens de recusa escritas são as de FEAT-06 e FEAT-19
- [ ] Gate: `bun node_modules/typescript/bin/tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9
Phase 2:  T10 → T11 → T12 → T13 → T14 → T15
Phase 3:  T16 → T17 → T18 → T19 → T20 → T21
Phase 4:  T22 → T23 → T24
Phase 5:  T25 → T26 → T27 → T28 → T29 → T30 → T31
```

Execução estritamente sequencial. Depois da T31: Verifier, rastreabilidade da spec, marcar a
fatia em `ROADMAP.md`, rodar ou registrar o Linux, e o PR (com o aval do Lucas para o push).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 índice em 1 arquivo | ✅ |
| T2 | 1 regra de entrega em `record` | ✅ |
| T3 | 1 função (`log.open`) | ✅ |
| T4 | 1 função (`log.close`) | ✅ |
| T5 | 1 função (`find`) | ✅ |
| T6 | 1 função (`projectOf`) | ✅ |
| T7 | 1 função (`feature.open`) | ✅ |
| T8 | 1 função (`feature.close`), 11 requisitos da mesma rota | ⚠️ coesa |
| T9 | 1 função (`features`) e o replay que a prova | ✅ |
| T10 | 2 helpers no mesmo arquivo | ⚠️ coesa |
| T11 a T20 | 1 arquivo de teste cada | ✅ |
| T21 | 1 helper; troca de nome nos arquivos que o chamam | ⚠️ mecânica, não se divide sem deixar a suíte quebrada |
| T22 | 2 rotas no mesmo `switch` | ⚠️ coesa |
| T23 | 2 tools no mesmo arquivo | ⚠️ coesa |
| T24 | 1 texto de resposta e as instruções | ✅ |
| T25 | 1 helper | ✅ |
| T26 a T29 | 1 arquivo de teste cada | ✅ |
| T30 | 1 helper; troca de nome nos arquivos que o chamam | ⚠️ mecânica |
| T31 | 2 arquivos de documentação | ⚠️ coesa |

## Diagram-Definition Cross-Check

Cadeia linear: a T1 não depende de nenhuma e cada T(n) depende só da T(n-1), no corpo e no
diagrama. Nenhuma dependência aponta para uma fase posterior. As setas `T9 → T10`,
`T15 → T16`, `T21 → T22` e `T24 → T25` no começo das fases 2 a 5 são a dependência da
primeira tarefa da fase na última da fase anterior.

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ |
| T2 a T31 | T(n-1) | T(n-1) → T(n) | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Regras do broker (`db.ts`) | unit | unit | ✅ |
| T2, T3, T4 | Regras do broker (`log.ts`) | unit | unit | ✅ |
| T5 | Regras do broker (`peers.ts`) | unit | unit | ✅ |
| T6, T7, T8 | Regras do broker (`feature.ts`) | unit | unit | ✅ |
| T9 | Derivação | unit | unit | ✅ |
| T10, T21 | Helpers de teste (unidade) | none | none | ✅ |
| T11 a T20 | Arquivo de teste migrado (unidade) | unit | unit | ✅ |
| T22 | Rotas HTTP | integration | integration | ✅ |
| T23 | Tools | unit | unit | ✅ |
| T24 | Servidor MCP | integration | integration | ✅ |
| T25, T30 | Helpers de teste (integração) | none | none | ✅ |
| T26 a T29 | Arquivo de teste migrado (integração) | integration | integration | ✅ |
| T31 | Documentação | none | none | ✅ |
