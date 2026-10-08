# Event Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/event/design.md`
**Status**: In Progress

Linha de base no Windows antes da T1, com Bun 1.4.2: 98 testes, 95 passam, 3 pulados, 0 falhas.

Todo o código fica em `broker/`; os comandos rodam de dentro dele. Mensagens de commit
seguem a convenção do repositório (frase imperativa em minúsculas, sem prefixo), não
Conventional Commits: é instrução do dono do repositório, e por isso `check_commit.py` não
se aplica. Cada teste leva no nome o id do requisito, como na Peer (`"EVT-08: ..."`).

---

## Test Coverage Matrix

> Guidelines found: none - strong defaults applied. `broker/CLAUDE.md` só fixa `bun test` e `bun x tsc --noEmit`; os testes da Peer dão o estilo e o piso.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Regras do broker (`send.ts`, `plan.ts`, `session.ts`, `permission.ts`, `state.ts`, `log.ts`, `peers.ts`, `db.ts`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Contrato e derivação (`shared/contract.ts`, `shared/derive.ts`, `shared/config.ts`) | unit | 1:1 com os ACs e com as Definições da spec | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Laço de entrega e tools (`delivery.ts`, `tools.ts`) | unit | Todos os ramos, inclusive falha de push e de ack | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Rotas HTTP (`broker.ts`) | integration | Toda rota: caminho feliz, uma recusa de regra, `unknown_peer` e corpo inválido, contra o processo real | `broker/test/integration/*.test.ts` | `bun test` |
| Servidor MCP (`server.ts`) | integration | Todo AC de tools, entrega e relay, com cliente MCP real por stdio | `broker/test/integration/*.test.ts` | `bun test` |
| Documentação (`README.md`, `CLAUDE.md`) | none | build gate only | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas só com teste de unidade | `bun test test/unit` |
| Full | Tarefas com teste de integração | `bun test` |
| Build | Fim de fase e tarefas sem teste | `bun x tsc --noEmit && bun test` |

Não há linter configurado; o build gate é tipo mais testes. A contagem de testes antes da
fatia é a do fim da Peer; cada tarefa só pode aumentá-la.

---

## Execution Plan

### Phase 1: Contrato, armazenamento e log

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 2: Regras

```
T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 3: Processos

```
T16 → T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24
```

---

## Task Breakdown

### T1: Tipos do contrato e formato de leitura

**What**: `SquadEvent`, a lista dos vinte kinds, `EDGES` (os cinco trios de EVT-08) e `toRead(row)`, que devolve as colunas com `from` e `to` e os campos de `data` no mesmo nível.
**Where**: `broker/shared/contract.ts`
**Depends on**: None
**Reuses**: `Role` de `broker/peers.ts`
**Requirement**: EVT-08, EVT-41, EVT-67

**Done when**:

- [x] `toRead` de uma linha `task` devolve exatamente `seq`, `ts`, `kind`, `feature_id`, `from`, `role_from`, `to`, `summary`, `body`, `ticket_ref` e os campos de `data`, sem `from_name`, `to_name` nem `data`
- [x] `EDGES` tem os cinco trios da spec e nenhum outro
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T2: Caminho da credencial e intervalo de polling

**What**: `tokenPath(env)` com default `<os.homedir()>/.squad-code-mcp.token` e `pollIntervalMs(env)` com default 1000.
**Where**: `broker/shared/config.ts`
**Depends on**: T1
**Reuses**: `dbPath` e `pingIntervalMs` no mesmo arquivo
**Requirement**: EVT-62, EVT-81

**Done when**:

- [x] `tokenPath({})` é o default e `tokenPath({ SQUAD_TOKEN_FILE })` devolve a variável
- [x] `pollIntervalMs({})` é 1000 e lê `SQUAD_POLL_INTERVAL_MS`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T3: Schema de `features` e `deliveries`, índices e append-only

**What**: `openDatabase` cria `features` e `deliveries` como no design, os índices de `events` e os gatilhos que abortam `UPDATE` e `DELETE` em `events`; `appendEvent(db, event)` grava qualquer kind e `appendBrokerEvent` passa a usá-lo.
**Where**: `broker/db.ts`
**Depends on**: T2
**Reuses**: `openDatabase` e `appendBrokerEvent` atuais
**Requirement**: EVT-77

**Done when**:

- [x] `UPDATE events ...` e `DELETE FROM events ...` lançam erro e a linha fica igual
- [x] `features` e `deliveries` têm exatamente as colunas do design
- [x] `appendEvent` grava `feature_id`, `to_name`, `summary`, `body`, `ticket_ref` e `data` recebidos e devolve o `seq`
- [x] Os testes de presença da Peer continuam passando
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T4: Estado dos tickets a partir dos eventos

**What**: `tickets(events)`: para cada `ticket_ref` do plano vigente ou com evento do ticket, `title`, `dropped`, `owner`, `taskSeq`, `resultSeq`, `last`, `reworks`, `approved`, conforme as Definições da spec.
**Where**: `broker/shared/derive.ts`
**Depends on**: T3
**Reuses**: `SquadEvent` de `broker/shared/contract.ts`
**Requirement**: EVT-20, EVT-21, EVT-22, EVT-23, EVT-24

**Done when**:

- [x] Um teste por definição: plano vigente é o de maior `seq`; dono é o `to` do `task` mais recente; aprovado só quando o último evento do ticket é `verdict` `approve`; `reworks` conta os `verdict` de `rework`; `dropped` vem do plano vigente
- [x] `question`, `answer` e `blocked` com `ticket_ref` não contam como evento do ticket
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T5: Dívidas de um peer

**What**: `owed(name, role, events, pendingSeqs)` devolve a lista de `{ owes, ticket_ref?, seq }` em ordem crescente de `seq`.
**Where**: `broker/shared/derive.ts` (modify)
**Depends on**: T4
**Reuses**: `tickets` da T4
**Requirement**: EVT-73, EVT-74, EVT-75, EVT-76, EVT-80

**Done when**:

- [x] Worker com ticket cujo último evento é `task` deve `result` com o `seq` do `task`; depois do `result` não deve
- [x] Judge deve um `verdict` por ticket não descartado em `result`, com o `seq` do `result`
- [x] Leader deve `task` depois de `verdict` de `rework` com menos de três reworks, e não deve no terceiro
- [x] Leader deve `plan` com `task` mother → leader e sem `plan`, com o `seq` do primeiro `task`; com `plan`, não deve
- [x] Toda entrega pendente vira `{ owes: "delivery", seq }` e a lista sai ordenada por `seq`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T6: Escrita no log: evento, entrega e recusa

**What**: `createLog(db, now)` com `openFeature()`, `featureEvents()`, `record(event)` (evento e entrega na mesma transação, entrega só para `task`, `result`, `verdict` e `permission_decision`) e `refused(peer, attemptedKind, error, hint)`.
**Where**: `broker/log.ts`
**Depends on**: T5
**Reuses**: `appendEvent` de `broker/db.ts`; `refuse` de `broker/peers.ts`; padrão de fábrica de `createPeers`
**Requirement**: EVT-13, EVT-39, EVT-40, EVT-47, EVT-79

**Done when**:

- [x] `record` de um `task` grava a linha de `deliveries` com `recipient` igual ao `to` e `acked_at` nulo, com o destinatário offline
- [x] `record` de `plan`, `blocked` e `permission_request` não grava entrega
- [x] Com a escrita em `deliveries` forçada a falhar, `events` fica sem o evento
- [x] `refused` grava `from_name` e `role_from` `broker`, `to_name` nulo, `summary` vazio, `feature_id` da feature aberta ou nulo e `data` `{ peer, attempted_kind, error }`, e devolve `{ ok: false, error, hint }`
- [x] `openFeature` devolve a linha com `closed_seq` nulo, ou nulo
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T7: Leitura do log e confirmação de entrega

**What**: `pending(name)`, `ack(name, seqs)`, `after(n)`, `lastSeq()` e `history(filter)` no formato de leitura.
**Where**: `broker/log.ts` (modify)
**Depends on**: T6
**Reuses**: `toRead` de `broker/shared/contract.ts`
**Requirement**: EVT-41, EVT-42, EVT-43, EVT-67, EVT-69

**Done when**:

- [x] `pending` devolve as entregas do nome em ordem de `seq`, e as mesmas numa segunda chamada sem `ack`
- [x] `ack` preenche `acked_at` só nas entregas pendentes do nome; a de outro nome e a já confirmada ficam como estavam
- [x] `after(1)` com três eventos devolve os dois últimos, de qualquer feature e sem feature; `lastSeq()` é 3, e 0 com o log vazio
- [x] `history` por `ticket_ref` só traz a feature aberta e vem vazio sem ela; por `question_id` e `gate_id` filtra pela coluna
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T8: Peer por credencial e desbloqueio na saída

**What**: `find(id)` devolve `{ name, role }` ou nulo; a saída de um peer com `blocked` aberto grava `unblocked` do broker na mesma transação do `peer_left`; `deliveries` não é tocada.
**Where**: `broker/peers.ts` (modify)
**Depends on**: T7
**Reuses**: `remove` atual; `appendEvent`
**Requirement**: EVT-45, EVT-46, EVT-55

**Done when**:

- [x] Peer bloqueado sai por `unregister` e pela limpeza: o log ganha `unblocked` com `from_name` `broker` e `data` `{ peer }`; sem `blocked` aberto, não ganha
- [x] As entregas pendentes do nome continuam pendentes depois da saída, e `log.pending` as devolve depois de um novo registro do nome
- [x] `find` com `id` desconhecido devolve nulo
- [x] Gate: `bun x tsc --noEmit && bun test`

**Tests**: unit
**Gate**: build

---

### T9: `/send`: envelope, aresta e os dois kinds sem regra de estado

**What**: `createSend(log)` com `send(peer, body)`: validação do envelope na ordem de EVT-10, carimbo de origem, `task` mother → leader e `result` leader → mother aceitos; toda recusa passa por `log.refused` com o `attempted_kind` de EVT-48.
**Where**: `broker/send.ts`
**Depends on**: T8
**Reuses**: `EDGES`; `ROSTER`; `log.record`, `log.refused`
**Requirement**: EVT-01, EVT-02, EVT-04, EVT-05, EVT-06, EVT-07, EVT-08, EVT-09, EVT-10, EVT-26, EVT-48

**Done when**:

- [x] Um teste por AC de EVT-01 a EVT-10 (sem EVT-03) e EVT-26, conferindo o código de erro ou os campos gravados da spec
- [x] Um corpo com `from`, `role_from`, `seq`, `ts` e `feature_id` falsos grava os valores do broker
- [x] Cada um dos cinco trios é aceito ou chega à regra do kind, e um trio fora deles recebe `edge_not_allowed`
- [x] Um envio que falha em duas regras recebe o erro da primeira da ordem, para cada par vizinho da ordem
- [x] Toda recusa grava um `refused` com `attempted_kind` igual ao `kind` recebido, e vazio quando o `kind` não é texto ou passa de 40 caracteres
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T10: `/plan`

**What**: `createPlan(log)` com `plan(peer, body)` e as recusas de EVT-14 a EVT-18.
**Where**: `broker/plan.ts`
**Depends on**: T9
**Reuses**: `tickets` de `broker/shared/derive.ts`; `log.record`, `log.refused`
**Requirement**: EVT-09, EVT-14, EVT-15, EVT-16, EVT-17, EVT-18

**Done when**:

- [x] Um teste por AC, com o evento `plan` conferido campo a campo e `data.tickets` só com as quatro chaves
- [x] `invalid_plan` para `ticket_ref` repetido, `depends_on` fora da lista, dependência de si mesmo e ticket que volta de `dropped`
- [x] Quem não é leader recebe `edge_not_allowed` mesmo sem feature aberta e com corpo inválido
- [x] Toda recusa grava `refused` com `attempted_kind` `plan`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T11: Regras do `task` leader → worker

**What**: Campos e recusas de estado do `task` para worker, na ordem de EVT-25.
**Where**: `broker/send.ts` (modify)
**Depends on**: T10
**Reuses**: `tickets`
**Requirement**: EVT-19, EVT-20, EVT-21, EVT-22, EVT-23, EVT-24, EVT-25, EVT-27

**Done when**:

- [x] Um teste por AC de EVT-19 a EVT-25 e EVT-27, com o código de erro ou o `data` da spec
- [x] Edge cases: `task` do mesmo ticket para outro worker libera o dono anterior; ticket descartado libera o worker; ticket de feature fechada com o mesmo `ticket_ref` não conta
- [x] `task` para ticket em `working` e em `review` é aceito
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T12: Regras do `result` worker → judge

**What**: Campos, `not_owner`, `ticket_dropped`, `stale_reference` e o `unblocked` do broker para o worker bloqueado.
**Where**: `broker/send.ts` (modify)
**Depends on**: T11
**Reuses**: `tickets`
**Requirement**: EVT-21, EVT-28, EVT-29, EVT-30, EVT-31, EVT-32, EVT-54

**Done when**:

- [x] Um teste por AC de EVT-28 a EVT-32, com o código de erro ou o `data` da spec
- [x] `result` de worker bloqueado grava `unblocked` do broker com `seq` maior que o do `result`; de worker não bloqueado, não grava
- [x] Edge cases: `result` de quem não é dono; `result` citando `task` de outra feature recebe `stale_reference`; segundo `result` para o mesmo `task` antes do `verdict` é aceito
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T13: Regras do `verdict`

**What**: Campos, `invalid_field` de `outcome`, `ticket_dropped` e os três casos de `stale_reference`.
**Where**: `broker/send.ts` (modify)
**Depends on**: T12
**Reuses**: `tickets`
**Requirement**: EVT-21, EVT-23, EVT-33, EVT-34, EVT-35, EVT-36, EVT-37, EVT-38

**Done when**:

- [x] Um teste por AC de EVT-33 a EVT-38, com o código de erro ou o `data` da spec
- [x] Edge cases: segundo `verdict` para o mesmo `result`; `verdict` de `result` substituído por `task` posterior
- [x] Ciclo inteiro: `plan`, `task`, `result`, `verdict` de `rework` três vezes; o `task` depois do segundo `rework` é aceito e o depois do terceiro recebe `rework_limit`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T14: `/blocked`, `/unblocked`, `/usage` e `/turn-started`

**What**: `createSession(log)` com as quatro funções; nenhuma recusa por falta de feature.
**Where**: `broker/session.ts`
**Depends on**: T13
**Reuses**: `log.record`, `log.refused`
**Requirement**: EVT-48, EVT-50, EVT-51, EVT-52, EVT-53, EVT-56, EVT-57, EVT-58, EVT-59

**Done when**:

- [x] Um teste por AC, com o evento conferido campo a campo
- [x] Sem feature aberta os quatro eventos têm `feature_id` nulo; com feature, o id dela
- [x] `/unblocked` de peer não bloqueado grava o evento; `/usage` repetido grava de novo
- [x] Cada recusa grava `refused` com `attempted_kind` `blocked` ou `usage`
- [x] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T15: Pedido e decisão de permissão, e a credencial humana

**What**: `loadHumanToken(path)` cria ou lê o arquivo; `createPermission(log, token)` com `request(peer, body)` e `decision(body)`.
**Where**: `broker/permission.ts`
**Depends on**: T14
**Reuses**: `log.record`, `log.refused`
**Requirement**: EVT-59, EVT-60, EVT-61, EVT-62, EVT-63, EVT-64, EVT-65, EVT-66

**Done when**:

- [ ] Um teste por AC de EVT-60 a EVT-66, com evento, entrega e código de erro da spec
- [ ] `loadHumanToken` cria o arquivo com 32 caracteres ou mais quando não existe e devolve o mesmo valor numa segunda chamada
- [ ] `invalid_token` vem antes de qualquer outra recusa e não grava evento nem `refused`
- [ ] Edge cases: `turn_started` do peer depois do pedido fecha; `refused` para o peer não fecha; `peer_left` do peer fecha; segunda decisão recebe `permission_closed`
- [ ] `summary` de pedido e de decisão cortados em 80 caracteres
- [ ] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T16: `/state`

**What**: `createState(log)` com `state(peer)` devolvendo `{ feature, ticket, owed }`.
**Where**: `broker/state.ts`
**Depends on**: T15
**Reuses**: `tickets` e `owed` de `broker/shared/derive.ts`; `log.openFeature`, `log.pending`
**Requirement**: EVT-71, EVT-72, EVT-73, EVT-74, EVT-75, EVT-76, EVT-80

**Done when**:

- [ ] `feature` nulo sem feature aberta; com ela, exatamente as sete chaves de EVT-71
- [ ] `ticket` de worker com ticket aberto traz `ticket_ref`, `title`, `task_seq` e `reworks`; nulo para worker sem ticket e para os outros papéis
- [ ] `owed` de cada papel num cenário com `plan`, `task`, `result` e `verdict` de `rework` confere com EVT-73 a EVT-76 e EVT-80
- [ ] Gate: `bun x tsc --noEmit && bun test`

**Tests**: unit
**Gate**: build

---

### T17: Rotas com credencial

**What**: `/send`, `/plan`, `/poll-messages`, `/ack`, `/history`, `/state`, `/blocked`, `/unblocked`, `/usage`, `/turn-started` e `/permission-request` no broker, com `unknown_peer` antes do módulo de regra e as validações de `/ack` e `/history`.
**Where**: `broker/broker.ts` (modify)
**Depends on**: T16
**Reuses**: bloco de recusa e de corpo inválido de `broker/broker.ts:48`; `startBroker`, `post`, `readDb` dos testes de integração
**Requirement**: EVT-03, EVT-11, EVT-12, EVT-44, EVT-49, EVT-69, EVT-70

**Done when**:

- [ ] Cada uma das onze rotas tem, contra o processo real: caminho feliz, `unknown_peer` com `id` desconhecido, ausente e não texto, e corpo que não é objeto JSON
- [ ] Toda recusa responde status 200 com `ok` falso e `hint` não vazio; `unknown_peer` e corpo inválido não aumentam `events`
- [ ] `/ack` com `seqs` que não é lista de inteiros recebe `missing_field`; `/history` com zero ou dois filtros recebe `missing_field`; nenhum dos dois grava `refused`
- [ ] Uma recusa de `/send` aumenta `events` em uma linha, o `refused`, e não altera `deliveries`
- [ ] Sessão que cai entre o polling e o `/ack`: o novo `id` do mesmo nome recebe os mesmos eventos
- [ ] Um `POST` a rota desconhecida continua respondendo 404
- [ ] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T18: `GET /events`, `/permission-decision` e a credencial no arranque

**What**: O broker lê a credencial humana ao subir, expõe `GET /events?after=` e `POST /permission-decision`.
**Where**: `broker/broker.ts` (modify)
**Depends on**: T17
**Reuses**: `loadHumanToken`, `tokenPath`, `log.after`
**Requirement**: EVT-49, EVT-62, EVT-65, EVT-67, EVT-68, EVT-78

**Done when**:

- [ ] `GET /events?after=1` com três eventos devolve os dois últimos e `last_seq` 3; sem `after` devolve tudo; com `after` maior que o último devolve lista vazia e `last_seq` do log
- [ ] `after` negativo, fracionário e não numérico recebem status 200 com `invalid_field`
- [ ] O broker cria o arquivo em `SQUAD_TOKEN_FILE` ao subir; a decisão com esse token é gravada e aparece no polling do peer; com token errado recebe `invalid_token`; o token não aparece em nenhuma resposta nem em `events`
- [ ] Recusa de `/permission-decision` e de `GET /events` não grava `refused`
- [ ] Parar o broker e subir outro sobre o mesmo banco: `/state`, `/poll-messages` e `GET /events` respondem o mesmo, e um `result` com `task_seq` velho continua recebendo `stale_reference`
- [ ] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T19: Tools por papel

**What**: Definições de `send_task`, `send_result`, `send_verdict`, `plan`, `blocked`, `unblocked`, `state` e `history`, `toolsFor(role)` e o mapa de tool para rota e `kind`.
**Where**: `broker/tools.ts`
**Depends on**: T18
**Reuses**: `LIST_PEERS_TOOL` de `broker/server.ts`, que muda para cá
**Requirement**: EVT-89

**Done when**:

- [ ] `toolsFor` de cada papel devolve exatamente os nomes de EVT-89, e lista vazia para papel desconhecido
- [ ] Cada tool de envio declara no schema os campos do seu kind
- [ ] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T20: Laço de entrega

**What**: `createDelivery({ poll, push, ack, verdict })` com `cycle()` e `remember(requestSeq, requestId)`: push em ordem, ack depois do push, parada na falha, sem push repetido depois de ack falho, e veredito no lugar do push para `permission_decision`.
**Where**: `broker/delivery.ts`
**Depends on**: T19
**Reuses**: `SquadEvent`
**Requirement**: EVT-82, EVT-83, EVT-84, EVT-87, EVT-88

**Done when**:

- [ ] Três eventos: três pushes em ordem de `seq`, cada `content` com `summary`, `body` e os campos próprios, `meta` com `kind`, `seq` e `from` como texto e `ticket_ref` só quando não nulo; ack de cada `seq` depois do seu push
- [ ] Push do segundo falha: ack só do primeiro, o terceiro não é empurrado naquele ciclo
- [ ] Ack falha: o ciclo seguinte confirma o mesmo `seq` e não chama `push` para ele
- [ ] `permission_decision` de pedido lembrado: `verdict` chamado com o `request_id` e o `behavior`, `push` não chamado, ack feito; de pedido desconhecido: só ack
- [ ] Dois ciclos não rodam ao mesmo tempo
- [ ] Gate: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T21: Tools do papel no servidor MCP

**What**: O servidor lista `toolsFor(ROLE)` depois do registro e encaminha cada tool à rota do broker com o `id`, devolvendo `seq` ou conteúdo em texto, e erro com `error` e `hint` na recusa.
**Where**: `broker/server.ts` (modify)
**Depends on**: T20
**Reuses**: `brokerFetch`, `isRefusal`, `text` do próprio arquivo; `startSession` dos testes
**Requirement**: EVT-89, EVT-90, EVT-91, EVT-92

**Done when**:

- [ ] Com cliente MCP real, a lista de tools de cada um dos quatro papéis depois de `ready` é a de EVT-89
- [ ] `send_task` da `mother` com feature aberta devolve o `seq` e o evento está no banco com `from_name` `mother`
- [ ] `send_task` de um `worker` não existe; `send_task` da `mother` sem feature devolve erro com `no_open_feature` e o `hint`
- [ ] `plan`, `blocked`, `unblocked`, `state` e `history` chamam a rota de mesmo nome e devolvem o `seq` ou o conteúdo
- [ ] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T22: Entrega e relay de permissão no servidor MCP

**What**: Depois do registro o servidor roda o laço de entrega no intervalo de polling, declara `claude/channel/permission`, grava o pedido de permissão que chega e devolve o veredito quando a decisão chega.
**Where**: `broker/server.ts` (modify)
**Depends on**: T21
**Reuses**: `createDelivery`; `pollIntervalMs`; `heartbeatTimer` como modelo de temporizador
**Requirement**: EVT-81, EVT-82, EVT-85, EVT-86, EVT-87

**Done when**:

- [ ] `mother` envia `task`; o cliente do `leader` recebe um `notifications/claude/channel` com `meta.seq` igual ao `seq`, e a entrega fica confirmada no banco
- [ ] Antes de `ready` nenhuma chamada a `/poll-messages` acontece: um evento pendente para o nome não chega ao cliente
- [ ] A capacidade `claude/channel/permission` aparece nas capacidades do servidor com papel
- [ ] O cliente envia `notifications/claude/channel/permission_request`; o log ganha `permission_request` do peer; a decisão feita por HTTP chega ao cliente como `notifications/claude/channel/permission` com o mesmo `request_id` e o `behavior`, e não como `notifications/claude/channel`
- [ ] Ao fechar a entrada padrão o servidor para o laço e sai
- [ ] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T23: README do broker

**What**: Rotas, kinds aceitos, variáveis `SQUAD_TOKEN_FILE` e `SQUAD_POLL_INTERVAL_MS`, e o que só funciona depois da fatia Feature.
**Where**: `broker/README.md` (modify)
**Depends on**: T22
**Requirement**: EVT-62, EVT-81

**Done when**:

- [ ] Toda rota da fatia aparece com corpo e resposta
- [ ] O README diz que `task`, `result`, `verdict` e `plan` recebem `no_open_feature` até a fatia Feature
- [ ] Gate: `bun x tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

### T24: Mapa de arquivos em `CLAUDE.md`

**What**: A lista de arquitetura ganha `log.ts`, `send.ts`, `plan.ts`, `session.ts`, `permission.ts`, `state.ts`, `delivery.ts`, `tools.ts` e `shared/contract.ts`, `shared/derive.ts`.
**Where**: `broker/CLAUDE.md` (modify)
**Depends on**: T23
**Requirement**: EVT-01

**Done when**:

- [ ] Cada arquivo novo tem uma linha dizendo o que é
- [ ] Gate: `bun x tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
Phase 2:  T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16
Phase 3:  T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24
```

24 tarefas em três fases de oito: três lotes, um por fase.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 arquivo de tipos e 1 função | ✅ |
| T2 | 2 funções de configuração | ✅ |
| T3 | schema de 1 arquivo | ✅ |
| T4 | 1 função | ✅ |
| T5 | 1 função | ✅ |
| T6 | escrita do log, 1 arquivo | ✅ |
| T7 | leitura do log, mesmo arquivo | ✅ |
| T8 | 2 mudanças coesas em `peers.ts` | ✅ |
| T9 | envelope de 1 rota | ✅ |
| T10 | 1 rota | ✅ |
| T11 | regras de 1 kind | ✅ |
| T12 | regras de 1 kind | ✅ |
| T13 | regras de 1 kind | ✅ |
| T14 | 4 rotas de registro, 1 arquivo, mesma forma | ⚠️ coeso |
| T15 | 2 rotas de permissão e a credencial | ⚠️ coeso |
| T16 | 1 rota | ✅ |
| T17 | ligação de 11 rotas já testadas em unidade | ⚠️ coeso |
| T18 | 2 rotas e o arranque | ✅ |
| T19 | 1 arquivo de definições | ✅ |
| T20 | 1 módulo | ✅ |
| T21 | handlers de tools | ✅ |
| T22 | laço e relay | ✅ |
| T23 | 1 arquivo de documentação | ✅ |
| T24 | 1 arquivo de documentação | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início | ✅ |
| T2 a T8 | a anterior | cadeia T1 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 a T16 | a anterior | cadeia T9 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 a T24 | a anterior | cadeia T17 → T24 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1, T2, T4, T5 | Contrato e derivação | unit | unit | ✅ |
| T3, T6, T7, T8 | Regras do broker | unit | unit | ✅ |
| T9 a T16 | Regras do broker | unit | unit | ✅ |
| T17, T18 | Rotas HTTP | integration | integration | ✅ |
| T19, T20 | Laço de entrega e tools | unit | unit | ✅ |
| T21, T22 | Servidor MCP | integration | integration | ✅ |
| T23, T24 | Documentação | none | none | ✅ |
