# Event Validation

**Result**: FAIL

**Rodada**: 3, a última do laço limitado (re-verificação depois de `53ffdf4`, que respondeu as quatro lacunas da rodada 2)
**Data**: 2026-10-08
**Spec**: `.specs/features/event/spec.md` (92 requisitos, EVT-01 a EVT-92, 14 edge cases; 16 linhas de Assumptions acrescentadas nas rodadas 1 e 2)
**Diff range**: `91d6917..HEAD`, código sob `broker/`; verificado em `53ffdf47bf22399c0f4e4aacf9e4f62deff96170`. Desde a rodada 2 (`bb7054a`) só mudaram `broker/test/integration/server-delivery.test.ts` (um helper e quatro testes) e `spec.md` (duas linhas de Assumptions). Nenhum arquivo de código mudou desde `8d1ac88`. Os commits `224d869` e `1d1ae45` ficaram de fora (só tocam `RUN_FATIAS.md` e `docs/`)
**Verifier**: sub-agente independente (autor ≠ verificador)
**Máquina**: Windows 11 Pro 10.0.26200, Bun 1.4.2

O gate está verde (422 testes, 419 passam, 3 pulados, `tsc` limpo). As quatro lacunas da rodada 2
estão fechadas: N01, N02, N03 e N04 morrem, cada um no teste novo que leva o nome do seu caso
(`test/integration/server-delivery.test.ts:233`, `:247`, `:276`, `:286`). A lacuna de precisão 8 está fechada por uma linha de
Assumptions. A leitura do código contra a spec continua **sem achar resposta que contradiga um
critério**.

O veredito é FAIL pela regra do sensor, e é o terceiro seguido. A rodada 3 plantou 20 defeitos
novos, espalhados por 12 dos 15 arquivos de código. Dezessete morrem. Três passam nos 422 testes
e nenhum é equivalente:

1. **EVT-69, "os eventos da feature aberta"** (`broker/log.ts:147`). Com `/history` por
   `ticket_ref` devolvendo também os eventos gravados sem feature (R14), tudo passa. Os testes
   excluem o evento de uma feature fechada (`test/unit/log.test.ts:327-335`), nunca o de
   nenhuma feature: um `blocked` com `ticket_ref` gravado sem feature aberta (EVT-59 permite)
   apareceria no histórico do ticket homônimo da feature seguinte.
2. **EVT-62, "reusa se existe"** (`broker/permission.ts:19-22`). Com o arquivo de credencial
   de token curto tratado como inexistente e recriado (R20), tudo passa: os dois testes de
   reuso usam tokens de 36 e 43 caracteres (`test/unit/permission.test.ts:64`,
   `test/integration/events.test.ts:157`).
3. **EVT-50, `ticket_ref` vazio em `/blocked`** (`broker/session.ts:39`). Com `ticket_ref: ""`
   gravado como nulo (R16), tudo passa. Nenhum teste envia o texto vazio, e a spec não diz se
   ele é um ticket ou é ausente (lacuna de precisão 9).

Os três são de prioridade baixa: uma partição da entrada que nenhum teste visita, não um
caminho inteiro sem guarda como nas rodadas 1 e 2. Uma asserção de fechamento foi rodada no
scratch para cada um: passa no HEAD e falha no seu mutante.

**Sobre a taxa de sobreviventes, dito sem rodeio.** Rodada 1: 2 de 127 (1,6%), numa varredura
larga. Rodada 2: 4 de 16 (25%), mirada em `server.ts`. Rodada 3: 3 de 20 (15%), mirada onde eu
julguei a suíte mais fina em todos os arquivos. Os sobreviventes continuam aparecendo quando a
amostra é escolhida para achá-los, mas a gravidade cai a cada rodada: chamadas indevidas ao
broker, depois caminhos de recusa do servidor MCP, agora valores de borda (evento sem feature,
texto vazio, token curto). Isso diz que a suíte cobre o que a spec enumera e que o que sobra são
classes de entrada que a spec não enumera. Mais uma rodada de "um teste por mutante" acharia
outros do mesmo tamanho; não converge a zero por esse caminho. A decisão é do dono: aceitar a
fatia com os três testes abaixo, ou pedir à spec que enumere as partições (texto vazio, evento
sem feature, valor fora da faixa) para cada campo e rota.

Os caminhos de teste abaixo são relativos a `broker/`.

---

## Task Completion

`tasks.md` e `design.md` não foram lidos, por instrução: a cobertura foi rederivada só da spec.
Esta tabela fica para o orquestrador.

| Task | Status | Notes |
| ---- | ------ | ----- |
| todas | não avaliado | O Verifier não leu `tasks.md` |

---

## Gate Check

- **Comando**: `bun x tsc --noEmit` e `bun test`, em `broker/`, na árvore real
- **`tsc`**: exit 0
- **`bun test`**: exit 0; 422 testes em 25 arquivos, 419 passam, 0 falham, 3 pulados, 3703 `expect()`, 38,7 s (rodada 1: 417 testes; rodada 2: 418)
- **Declarações de teste antes da fatia** (`91d6917`): 88
- **Declarações de teste agora**: 389 (os laços `for` geram o resto dos 422)
- **Delta**: +301 declarações; +1 na rodada 2 e +4 na rodada 3. Nenhum teste da Peer foi apagado; os três editados têm motivo no próprio arquivo: `/poll-messages` saiu da lista de rotas 404 (`test/integration/broker.test.ts`), as tools de um worker passaram a ser as de EVT-89 e o `startSession` foi para `helpers.ts` (`test/integration/server.test.ts`)
- **Pulados**: os três são da Peer e já existiam: `test/unit/presence.test.ts` (EPERM, pulado no Windows), `test/integration/cli.test.ts:65` (`127.0.0.2`) e `:100` (POSIX)
- **Falhas**: nenhuma

---

## Spec-Anchored Acceptance Criteria

Cada linha foi rederivada dos arquivos de teste em `8d1ac88`; depois disso só
`test/integration/server-delivery.test.ts` mudou, e as citações desse arquivo abaixo já estão na numeração de
`53ffdf4` (o helper `standIn` em `:38-52` empurrou os testes antigos 18 linhas para baixo). `refusedWith` é o helper de
`test/unit/helpers.ts:125-151`: afirma a resposta `{ ok: false, error, hint }` com `hint` não
vazio (`:129-130`), o log igual ao anterior mais **uma** linha `refused` com todas as colunas
(`:131-148`) e `deliveries` inalterada (`:149`). `expectRefusal` é o de
`test/integration/routes.test.ts:50-54` (status 200, `{ ok: false, error, hint }`, `hint` não vazio).

### P1: Envio pelas arestas da estrela

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-01 | evento com `kind`, `feature_id`, `to_name`, `summary`, `body` (vazio se ausente), `ticket_ref` (nulo se ausente), `data` só com os campos do kind; `{ ok: true, seq }` | `test/unit/send.test.ts:33-35` - `expect(answer).toEqual({ ok: true, seq: 1 })`, `expect(b.events()).toEqual([stored(1, id, { ts: NOW + 700 })])`; `:65-68` (body e ticket_ref ausentes); `:77` - `expect(b.events().map((e) => e.data)).toEqual([{}, {}])`; HTTP: `test/integration/routes.test.ts:141-153` | ✅ PASS |
| EVT-02 | `from_name`, `role_from`, `seq`, `ts`, `feature_id` do broker; os do corpo ignorados | `test/unit/send.test.ts:96-107` - corpo com `from: "worker-2"`, `seq: 900`, `ts: 5`, `feature_id: id - 1`; `expect(b.events()[1]).toEqual(stored(2, id, { ts: NOW + 60, from_name: "leader", role_from: "leader", ... }))`; `test/integration/routes.test.ts:142-154` | ✅ PASS |
| EVT-03 | `unknown_peer` nas 11 rotas com credencial, sem evento e sem `refused` | `test/integration/routes.test.ts:101-104` - seis formas de `id` por rota, `expectRefusal(..., "unknown_peer")`, `expect(snapshot(broker, feature)).toEqual(before)`; `test/unit/presence.test.ts:423-427` | ✅ PASS |
| EVT-04 | `missing_field` | `test/unit/send.test.ts:115-121` (kind, to), `:129-132` (summary ausente, número, null, vazio), `:138-140` (body 5, objeto, null), todos por `refusedWith(..., "missing_field")` | ✅ PASS |
| EVT-05 | `invalid_kind` | `test/unit/send.test.ts:146-148` - dez kinds, `refusedWith(..., kind, "invalid_kind")` | ✅ PASS |
| EVT-06 | `invalid_field` com mais de 80 | `test/unit/send.test.ts:171` - `"x".repeat(81)` → `invalid_field`; `:172-173` - 80 aceito e gravado | ✅ PASS |
| EVT-07 | `unknown_recipient` fora dos seis nomes e `human` | `test/unit/send.test.ts:179-181` (`*`, `worker-4`, ...); `:188-190` os sete conhecidos caem em `edge_not_allowed` | ✅ PASS |
| EVT-08 | `edge_not_allowed` fora dos cinco trios | `test/unit/send.test.ts:206-218` - 84 trios, `expect(passed.sort()).toEqual([...allowed].sort())`; `test/unit/contract.test.ts:73-79` | ✅ PASS |
| EVT-09 | `no_open_feature` em `/send` e `/plan` | `test/unit/send.test.ts:223-226`; `test/unit/plan.test.ts:131-133`; `test/integration/routes.test.ts:175-176` | ✅ PASS |
| EVT-10 | primeira recusa na ordem dada | `test/unit/send.test.ts:231`, `:242-247`, `:252-257`, `:262`, `:267`, `:272`; `test/unit/send-task.test.ts:226`, `:231-232`; `test/unit/send-result.test.ts:174`, `:179-180`; `test/unit/send-verdict.test.ts:204`, `:209-210`, `:215-217` - um par de vizinhos por teste | ✅ PASS |
| EVT-11 | status 200, `ok` falso, `hint` texto não vazio | `test/integration/routes.test.ts:51-53` - `expect(res.status).toBe(200)`, `toEqual({ ok: false, error, hint: expect.any(String) })`, `expect(res.json.hint).not.toBe("")`, usado em toda recusa por HTTP; `test/unit/helpers.ts:129-130` em toda recusa de unidade | ✅ PASS |
| EVT-12 | corpo que não é objeto: `missing_field`, sem evento | `test/integration/routes.test.ts:109-113` - cinco corpos por rota, `expect(snapshot(broker)).toEqual({ events: [], peers: [], deliveries: [], feature: null })`; `test/integration/events.test.ts:221-225` (`/permission-decision`) | ✅ PASS |
| EVT-13 | destinatário sem sessão: grava e responde `{ ok: true, seq }` | `test/unit/send.test.ts:278-281` - `expect(b.rows()).toEqual([])`, `toEqual({ ok: true, seq: 1 })`, `expect(b.log.pending("leader").map((e) => e.seq)).toEqual([1])` | ✅ PASS |

### P1: Plano e ciclo do ticket

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-14 | `missing_field` | `test/unit/plan.test.ts:79-81` (lista), `:98-101` (nove itens ruins), `:108-113` (`depends_on`, `dropped`) | ✅ PASS |
| EVT-15 | `plan` com `from_name` `leader`, `to_name` nulo, `summary` vazio, `ticket_ref` nulo, `data` `{ tickets }` só com as quatro chaves | `test/unit/plan.test.ts:29-47` - linha inteira por `toEqual`, `expect(b.deliveries()).toEqual([])`; `:67-73` chaves extras fora; `test/integration/routes.test.ts:189-193` | ✅ PASS (ver lacuna de precisão 6) |
| EVT-16 | `edge_not_allowed` antes de qualquer outra | `test/unit/plan.test.ts:120`, `:123`, `:125` - sem feature, plano inválido e plano válido, para `mother`, `judge` e `worker-1` | ✅ PASS |
| EVT-17 | `invalid_plan` | `test/unit/plan.test.ts:144` (repetido), `:150-151` (fora da lista, o próprio), `:161-162` (descartado que volta) | ✅ PASS (ver lacuna de precisão 4) |
| EVT-18 | `plan_drops_started_ticket` | `test/unit/plan.test.ts:185-191`, `:195`; outra feature não conta `:204` | ✅ PASS |
| EVT-19 | `missing_field` | `test/unit/send-task.test.ts:53-55`, `:60-62`, `:67-69` | ✅ PASS |
| EVT-20 | `unplanned_ticket` | `test/unit/send-task.test.ts:74`, `:77` (só em plano anterior), `:87` (sem plano na feature aberta) | ✅ PASS |
| EVT-21 | `ticket_dropped` em `task`, `result` de worker e `verdict` | `test/unit/send-task.test.ts:93`; `test/unit/send-result.test.ts:111`; `test/unit/send-verdict.test.ts:130` | ✅ PASS |
| EVT-22 | `ticket_closed` | `test/unit/send-task.test.ts:101-102` | ✅ PASS |
| EVT-23 | `rework_limit` com três `rework` | `test/unit/send-task.test.ts:109` (aceito depois do segundo), `:111-112` (recusado depois do terceiro); ciclo inteiro pelas rotas: `test/unit/send-verdict.test.ts:228-233` | ✅ PASS |
| EVT-24 | `worker_busy` | `test/unit/send-task.test.ts:120`, `:123`, `:125`; liberado por aprovação `:134` | ✅ PASS |
| EVT-25 | ordem `unplanned_ticket`, `ticket_dropped`, `ticket_closed`, `rework_limit`, `worker_busy` | `test/unit/send-task.test.ts:198`, `:206`, `:214`, `:221` | ✅ PASS |
| EVT-26 | `invalid_field` | `test/unit/send.test.ts:287-289`, `:295` | ✅ PASS |
| EVT-27 | `data` com `loadout` e, se veio, `criteria`, e nada mais | `test/unit/send-task.test.ts:25-39` - `data: { loadout: ["tdd", "review"], criteria: [1, 4] }` com `extra` e `title` no corpo; `:47-48` | ✅ PASS |
| EVT-28 | `missing_field` | `test/unit/send-result.test.ts:71-73`, `:80` | ✅ PASS |
| EVT-29 | `not_owner` | `test/unit/send-result.test.ts:86`, `:89-90`, `:103-105` | ✅ PASS |
| EVT-30 | `stale_reference` | `test/unit/send-result.test.ts:118-120` - seis `task_seq` errados; `:121` o certo passa | ✅ PASS |
| EVT-31 | `stale_reference` com `verdict` depois do `task` | `test/unit/send-result.test.ts:140`, `:145`; outro ticket não conta `:152` | ✅ PASS |
| EVT-32 | `data` `{ task_seq, branch, commit }`; segundo `result` aceito | `test/unit/send-result.test.ts:38-54`; `:60-65` | ✅ PASS |
| EVT-33 | `missing_field` | `test/unit/send-verdict.test.ts:80-88`; `:115-117` - 18 formas de `criteria` | ✅ PASS |
| EVT-34 | `invalid_field` | `test/unit/send-verdict.test.ts:122-124` | ✅ PASS |
| EVT-35 | `stale_reference` | `test/unit/send-verdict.test.ts:137-139`, `:147-151`, `:159-161` | ✅ PASS |
| EVT-36 | `stale_reference` | `test/unit/send-verdict.test.ts:168-169` | ✅ PASS |
| EVT-37 | `stale_reference` | `test/unit/send-verdict.test.ts:183`, `:186` | ✅ PASS |
| EVT-38 | `data` `{ result_seq, outcome, criteria }` | `test/unit/send-verdict.test.ts:41-57`; `:68-75` (cada critério só com `n`, `text`, `pass`, `note`) | ✅ PASS |

### P1: Entrega até o transporte

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-39 | linha em `deliveries` com `event_seq`, `recipient` = `to_name`, `acked_at` nulo, na mesma transação | `test/unit/log.test.ts:109` - `expect(b.deliveries()).toEqual([{ event_seq: seq, recipient: "worker-1", acked_at: null }])`; `:118-122` (result, verdict, permission_decision); transação: `:154-156` | ✅ PASS |
| EVT-40 | nenhum outro kind gera entrega | `test/unit/log.test.ts:136`, `:146` - `expect(b.deliveries()).toEqual([])`; `test/unit/permission.test.ts:98` (`to_name` `human`) | ✅ PASS |
| EVT-41 | `{ events }` pendentes do nome, `seq` crescente, formato de leitura | `test/unit/log.test.ts:229-233`; `test/integration/routes.test.ts:222`; formato: `test/unit/contract.test.ts:21-34`, `:38-40` | ✅ PASS |
| EVT-42 | devolvida em todo polling enquanto não confirmada | `test/unit/log.test.ts:243-244`; `test/integration/routes.test.ts:223`, `:227` | ✅ PASS |
| EVT-43 | `acked_at` epoch ms atual só nas pendentes do nome em `seqs`; `{ ok: true }` | `test/unit/log.test.ts:254-257` (`acked_at: NOW + 4000`), `:267-270` (outro nome), `:282` (já confirmada), `:291`; `test/integration/routes.test.ts:240-241`, `:246-254`, `:261` | ✅ PASS |
| EVT-44 | `missing_field` sem alterar entrega | `test/integration/routes.test.ts:272-275` - nove formas, `expect(snapshot(broker, feature)).toEqual(before)` | ✅ PASS |
| EVT-45 | pendentes voltam para o novo `id` do nome | `test/unit/presence.test.ts:409`; `test/integration/routes.test.ts:289-290` | ✅ PASS |
| EVT-46 | `deliveries` do nome como estavam, por `/unregister` e pela limpeza | `test/unit/presence.test.ts:379-383`, `:394` | ✅ PASS |

### P1: Recusa com rastro

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-47 | `refused` de `broker`, `to_name` nulo, `summary` vazio, `feature_id` da feature ou nulo, `data` `{ peer, attempted_kind, error }`; sem o evento tentado e sem entrega | `test/unit/log.test.ts:173-190`, `:200-201`; `test/unit/helpers.ts:131-149` em cada recusa; por HTTP: `test/integration/routes.test.ts:168` (`/send`), `:202` (`/plan`), `:485` (`/blocked`), `:521` (`/usage`), `:563` (`/permission-request`) | ⚠️ PASS nas cinco rotas que recusam; `/unblocked` e `/turn-started` são lacuna de precisão 1 |
| EVT-48 | `attempted_kind`: o `kind` de até 40 caracteres, vazio nos outros casos; nome fixo nas outras rotas | `test/unit/send.test.ts:302-305` (40 mantido, 41 vazio, não texto vazio); `test/unit/session.test.ts:175-179` (`blocked`, `usage`); `test/unit/plan.test.ts:80` (`plan`); `test/unit/permission.test.ts:120` (`permission_request`) | ⚠️ PASS; `unblocked` e `turn_started` são lacuna de precisão 1 |
| EVT-49 | sem `refused` nas rotas de leitura e transporte | `/ack`: `test/integration/routes.test.ts:275`; `/history`: `:425`; `/poll-messages` e `/state`: `:104`; `/permission-decision`: `test/integration/events.test.ts:193`, `:210`, `:215`; `GET /events`: `:91` | ✅ PASS |

### P1: Registros da sessão

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-50 | `blocked` com `from_name` do peer, `to_name` nulo, `ticket_ref` (nulo se ausente), `data` `{ reason, detail, last_action }` | `test/unit/session.test.ts:32-34` (`ticket_ref: "A"`), `:41-44` (ausente e `null`); `test/integration/routes.test.ts:465-477` | ❌ GAP pequeno: nenhum teste envia `ticket_ref: ""`; gravá-lo como nulo passa (R16 sobrevive). Ver lacuna de precisão 9 |
| EVT-51 | `missing_field` | `test/unit/session.test.ts:49-55`, `:60-62` | ✅ PASS (ver lacuna de precisão 3) |
| EVT-52 | `invalid_field` com mais de 80 | `test/unit/session.test.ts:67` (81), `:68-69` (80 gravado) | ✅ PASS |
| EVT-53 | `unblocked` com `data` `{ peer }` | `test/unit/session.test.ts:83-84`, `:91-96`; `test/integration/routes.test.ts:493-496` | ✅ PASS |
| EVT-54 | `unblocked` do `broker` depois do `result`, na mesma transação | `test/unit/send-result.test.ts:188-203`; sem bloqueio `:239`; líder `:259`; transação `:269-271` | ✅ PASS |
| EVT-55 | `unblocked` do `broker` na transação do `peer_left` | `test/unit/presence.test.ts:291-299`, `:311-321`; transação `:361-363` | ✅ PASS |
| EVT-56 | `missing_field` | `test/unit/session.test.ts:103-106`, `:111-115` (`-1`, `1.5`, `"10"`) | ✅ PASS |
| EVT-57 | `usage` com os seis campos, inclusive repetido | `test/unit/session.test.ts:125-128`, `:134-136` | ✅ PASS |
| EVT-58 | `turn_started` com `data` `{}` | `test/unit/session.test.ts:143-148`; `test/integration/routes.test.ts:530-533` | ✅ PASS |
| EVT-59 | `feature_id` nulo sem feature aberta, sem recusar | `test/unit/session.test.ts:159-170`; `test/unit/permission.test.ts:181-186`; `test/unit/log.test.ts:164` | ✅ PASS |

### P1: Permissão decidida fora do terminal

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-60 | `permission_request` para `human`, `summary` = 80 primeiros de `<tool_name>: <description>`, `body` = `input_preview`, `data` com os quatro campos | `test/unit/permission.test.ts:80-98`; corte em 80: `:109-110` | ✅ PASS |
| EVT-61 | `missing_field` | `test/unit/permission.test.ts:121-128` | ✅ PASS |
| EVT-62 | token do arquivo em `SQUAD_TOKEN_FILE`, criado com 32 caracteres ou mais **se não existe**; em nenhuma resposta nem evento | `test/unit/permission.test.ts:47-50` - `expect(token.length).toBeGreaterThanOrEqual(32)`; `:65-66` (reuso de um token de 36 caracteres); `:222-223` - `not.toContain(HUMAN_TOKEN)`; `test/unit/config.test.ts:49`, `:53`; broker real: `test/integration/events.test.ts:101-103`, `:150-152`, `:160` | ❌ GAP pequeno: o reuso só é testado com token de 32 caracteres ou mais; o arquivo de token curto recriado passa (R20 sobrevive) |
| EVT-63 | `missing_field`; `invalid_field` | `test/unit/permission.test.ts:229-235`; `:241-243`; `:253-255`; `:261-263`; ordem `:272-274` | ✅ PASS |
| EVT-64 | `permission_closed` sem gravar | `test/unit/permission.test.ts:281-282`, `:309` (turn_started, usage, blocked, outro pedido), `:336`, `:346` (peer_left); `refused` não fecha `:326` | ✅ PASS |
| EVT-65 | `invalid_token` antes de qualquer outra, sem gravar | `test/unit/permission.test.ts:192-195`, `:205-208`; `test/integration/events.test.ts:189-194` | ✅ PASS (ver lacuna de precisão 5) |
| EVT-66 | `permission_decision` de `human` para o peer do pedido, `summary` = 80 primeiros de `<behavior>: <tool_name>`, `data` `{ request_seq, behavior }` | `test/unit/permission.test.ts:137-154`; `:164-169`; `test/integration/events.test.ts:112-129` | ✅ PASS |

### P1: Leitura do log

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-67 | `{ events, last_seq }`, `seq` maior que `n`, toda feature e nenhuma, `after` ausente = 0, `last_seq` 0 com log vazio | `test/integration/events.test.ts:46-47`, `:73`, `:75-80`; `test/unit/log.test.ts:296-297`, `:307-313`, `:319-321` | ✅ PASS |
| EVT-68 | status 200 com `invalid_field` | `test/integration/events.test.ts:88-90` - `-1`, `1.5`, `abc`, vazio, `1e2`, `0x1`, `1,2` | ✅ PASS |
| EVT-69 | `{ events }` por `ticket_ref` **na feature aberta**, ou vazio sem feature; por `question_id` e `gate_id` na coluna | `test/unit/log.test.ts:334-349`, `:357`, `:370-389`; `test/integration/routes.test.ts:336-364`, `:374`, `:396-402` | ❌ GAP pequeno: fica de fora o evento de uma feature fechada, mas nenhum teste tem um evento sem feature com o mesmo `ticket_ref` (R14 sobrevive) |
| EVT-70 | `missing_field` | `test/integration/routes.test.ts:409-425` - doze filtros ruins | ✅ PASS |
| EVT-71 | `{ feature, ticket, owed }`, `feature` nulo ou com os sete campos | `test/unit/state.test.ts:12`, `:32-44`; `test/integration/routes.test.ts:435-442`, `:456` | ✅ PASS |
| EVT-72 | `ticket` `{ ticket_ref, title, task_seq, reworks }` só para worker com ticket aberto | `test/unit/state.test.ts:53`, `:59`, `:64`, `:66`; `:78-81` (outros papéis nulo); `:90`, `:97`, `:104`, `:112` | ✅ PASS |
| EVT-73 | `{ owes: "result", ticket_ref, seq }` do `task` | `test/unit/derive.test.ts:219`, `:224-229`, `:233-240`; `test/unit/state.test.ts:149-152` | ✅ PASS |
| EVT-74 | `{ owes: "verdict", ticket_ref, seq }` do último `result` | `test/unit/derive.test.ts:259-262`, `:267`, `:274`; `test/unit/state.test.ts:165-170` | ✅ PASS |
| EVT-75 | `{ owes: "task", ticket_ref, seq }` do `verdict`, com menos de três `rework` | `test/unit/derive.test.ts:288-289`, `:293`, `:297-303`; `test/unit/state.test.ts:180-184` | ✅ PASS |
| EVT-76 | `{ owes: "plan", seq }` do primeiro `task` da mother | `test/unit/derive.test.ts:307-308`, `:312-313`, `:317-320`; `test/unit/state.test.ts:123-134` | ✅ PASS |
| EVT-77 | `UPDATE` e `DELETE` abortados, linha como estava | `test/unit/db.test.ts:55-57`, `:65-67`; outra conexão `:80-81`, `:85` | ✅ PASS |
| EVT-78 | mesmas respostas e mesmas recusas de estado depois de subir de novo | `test/integration/events.test.ts:265` - `expect(await answers(second)).toEqual(before)`; `:268-269` | ✅ PASS |
| EVT-79 | entrega falha: evento não gravado | `test/unit/log.test.ts:154-156` | ✅ PASS |
| EVT-80 | `{ owes: "delivery", seq }` por entrega pendente; `owed` em `seq` crescente | `test/unit/derive.test.ts:324-329`, `:338-342`, `:352-357`; `test/unit/state.test.ts:215-218` | ✅ PASS |

### P1: Polling, push e tools no servidor MCP

| Critério | Resultado definido na spec | `file:line` + asserção | Resultado |
| -------- | -------------------------- | ---------------------- | --------- |
| EVT-81 | polling a cada 1 s ou `SQUAD_POLL_INTERVAL_MS`; nenhuma chamada antes do registro | intervalo: `test/unit/config.test.ts:57-58` - `expect(pollIntervalMs({})).toBe(1000)`; `test/integration/server-delivery.test.ts:66` (700 ms com 50), `:117-119` (default). Antes do `ready`: `:226` - `expect(fake.posts).toEqual([])`. Depois de um `ready` recusado: `:238-240` - `expect(answer.isError).toBe(true)`, `expect(fake.posts).toEqual(["/register"])`. Primeiro ciclo um intervalo depois, com entrega já pendente: `:295-297` - `expect(leader.pushed()).toEqual([])` aos 500 ms | ✅ PASS (M127, N03 e N04 morrem) |
| EVT-82 | um push por evento, `seq` crescente, `content` com `summary`, `body` e campos do kind, `meta` com `kind`, `seq`, `from` e `ticket_ref` quando não nulo | `test/unit/delivery.test.ts:106-107`, `:114-118`, `:135-149`; `test/integration/server-delivery.test.ts:68-71`, `:135-138` | ✅ PASS |
| EVT-83 | `/ack` depois do push; push que falha não confirma nem empurra os seguintes | `test/unit/delivery.test.ts:106`, `:159-160`, `:164` | ✅ PASS |
| EVT-84 | `/ack` de novo no ciclo seguinte, sem push repetido | no laço: `test/unit/delivery.test.ts:171-181`; na ligação com o broker: `test/integration/server-delivery.test.ts:268-269` - três `/ack` recusados e `expect(leader.pushed().map((p) => p.params.meta.seq)).toEqual(["3"])` | ✅ PASS (N01 morre) |
| EVT-85 | capacidade `claude/channel/permission` | `test/integration/server-delivery.test.ts:144-147` | ✅ PASS |
| EVT-86 | `/permission-request` com os quatro campos e o `id`, quando chega `notifications/claude/channel/permission_request` | `test/integration/server-delivery.test.ts:161-168`; antes do registro nada é enviado: `:226`; outra notificação não é repassada: `:280-283` - `expect(readDb(b.dbFile).events.map((e) => e.kind)).toEqual(["peer_joined"])` | ✅ PASS (M107 e N02 morrem) |
| EVT-87 | `notifications/claude/channel/permission` com `request_id` e `behavior`, sem push, com `/ack` | `test/unit/delivery.test.ts:188-190`; `test/integration/server-delivery.test.ts:176`, `:178`, `:182-183` | ✅ PASS |
| EVT-88 | `/ack` sem veredito e sem push | `test/unit/delivery.test.ts:197-198`; `test/integration/server-delivery.test.ts:198-201` | ✅ PASS |
| EVT-89 | tools por papel, e nenhuma outra | `test/unit/tools.test.ts:15`, `:19`, `:23`, `:27`; `test/integration/server-tools.test.ts:50`, `:54`, `:57` | ✅ PASS |
| EVT-90 | `/send` com o `kind` da tool, o `id` da sessão e os argumentos; `seq` em texto | `test/integration/server-tools.test.ts:74-89` (argumentos com `kind: "verdict"` e `id: "not-an-id"`), `:135-143`; `test/unit/tools.test.ts:107-116` | ✅ PASS |
| EVT-91 | erro com o `error` e o `hint` do broker | `test/integration/server-tools.test.ts:102-104`, `:151-154`, `:174-176`, `:222-224` | ✅ PASS |
| EVT-92 | rota de mesmo nome com o `id` e os argumentos; `seq` ou conteúdo em texto | `test/integration/server-tools.test.ts:116`, `:163-170`, `:193-198`, `:202-218` | ✅ PASS |

**Status**: ❌ Lacunas presentes. 89/92 critérios com asserção no resultado da spec em toda cláusula e classe de entrada; EVT-81, EVT-84 e EVT-86, abertos na rodada 2, estão fechados; EVT-50, EVT-62 e EVT-69 têm uma classe de entrada sem evidência cada. EVT-47 e EVT-48 ficam ⚠️ só porque duas rotas da lista não têm recusa alcançável, o que a spec declara.

### Lacunas de precisão da spec

**As sete da rodada 1 estão fechadas por um default declarado na tabela de Assumptions (conferido na rodada 2), e a oitava também (rodada 3).**

| # | Lacuna da rodada 1 | Linha de Assumptions que a fecha | Código e teste batem? |
| - | ------------------ | -------------------------------- | --------------------- |
| 1 | `/unblocked` e `/turn-started` em EVT-47/48 | "`/unblocked` e `/turn-started` em EVT-47 e EVT-48": não têm recusa além de `unknown_peer`; o `attempted_kind` só existe se ganharem uma | ✅ `broker/session.ts:46-49`, `:78-81` não recusam |
| 2 | Ordem das recusas de `result`, `verdict` e `/plan` | "Ordem das recusas de `result` de worker, de `verdict` e de `/plan`" | ✅ `test/unit/send-result.test.ts:158`, `:164`, `:169`; `test/unit/send-verdict.test.ts:199`; `test/unit/plan.test.ts:120`, `:138`, `:210`, `:218-219` |
| 3 | `null` em campo opcional | "`null` num campo opcional": `ticket_ref: null` ausente em toda rota, filtro `null` não enviado; `body`, `criteria`, `depends_on`, `dropped`, `note` com `null` recebem `missing_field` | ✅ `test/unit/send.test.ts:61`, `:140`; `test/unit/session.test.ts:40`; `test/integration/routes.test.ts:367`; `test/unit/send-task.test.ts:67`; `test/unit/plan.test.ts:108`, `:111`; `test/unit/send-verdict.test.ts:111` |
| 4 | Ticket descartado que volta | "Ticket descartado que nunca recebeu `task`": pode ser omitido e voltar sem `dropped`; fica como está | ✅ Declarado como brecha conhecida. `test/unit/plan.test.ts:165`, `:177` |
| 5 | EVT-65 contra EVT-12 | "`invalid_token` e corpo que não é objeto JSON": `missing_field` primeiro | ✅ `test/integration/events.test.ts:223` |
| 6 | Chave opcional ausente no `plan` | "Chaves gravadas em `data`": só as chaves do contrato que vieram, sem default | ✅ `test/unit/plan.test.ts:67-72`; `test/unit/send-verdict.test.ts:68-75`; `test/unit/send.test.ts:77` |
| 7 | "Ignora" o pedido antes do registro | "'Ignora' o pedido de permissão antes do registro": nenhuma chamada ao broker antes do registro | ✅ `test/integration/server-delivery.test.ts:226` |

As outras linhas novas também foram conferidas: arquivo de credencial vazio (`test/unit/permission.test.ts:68-71`), `after` só com dígitos (`test/integration/events.test.ts:88`), empate de `seq` em `owed` (`test/unit/state.test.ts:123-127`, `test/unit/derive.test.ts:352-357`), `question_id` e `gate_id` fora do formato de leitura (`test/unit/contract.test.ts:38-40`), texto das tools (`test/integration/server-tools.test.ts:33`, `:102-104`). "Pedido de permissão que o broker recusa" se declara sem teste; pela leitura, `broker/server.ts:237-239` faz o que a linha diz. "Primeiro polling" tem teste desde a rodada 3 (`test/integration/server-delivery.test.ts:286-298`).

**Lacuna 8, da rodada 2: fechada.** "Recusa do broker a `/poll-messages` ou `/ack` no laço de entrega: vale como falha da chamada". O código bate (`broker/server.ts:208`) e o teste também (`test/integration/server-delivery.test.ts:247-274`). A outra linha nova, "Sessão cujo registro foi recusado", bate com `broker/server.ts:275-281`, `:292` e com `test/integration/server-delivery.test.ts:233-245`.

**Uma lacuna nova na rodada 3, pequena:**

9. **`ticket_ref` vazio em `/blocked`.** A linha "`null` num campo opcional" diz o que `null` vale; nada diz o que o texto vazio vale. Em `/send` o `ticket_ref` vazio é recusado nas duas direções (`test/unit/send.test.ts:288`, `test/unit/send-task.test.ts:53`). Em `/blocked` ele é aceito e gravado como `""` (`broker/session.ts:24`, `:39`), sem teste. É o mutante R16. A spec deve dizer se é `missing_field`, se vale como ausente, ou se é gravado como veio.

As sete da rodada 1, como foram escritas então (o código não mudou):

1. **EVT-47 e EVT-48 listam `/unblocked` e `/turn-started`** entre as rotas que gravam `refused`, com `attempted_kind` `unblocked` e `turn_started`. A spec não define nenhuma recusa para as duas além de `unknown_peer`, que não grava `refused` (EVT-03). O resultado é inalcançável e não há teste possível. Ou a spec tira as duas da lista, ou diz qual recusa elas têm.
2. **Ordem das recusas fora do `task`.** EVT-10 remete às "recusas de estado, na ordem dada em cada kind", mas só EVT-25 dá uma ordem. Para `result` (`not_owner` → `ticket_dropped` → `stale_reference`) e `verdict` (`ticket_dropped` → `stale_reference`) quem decide é o teste: `test/unit/send-result.test.ts:158`, `:164`, `:169`; `test/unit/send-verdict.test.ts:199`. O mesmo em `/plan`: EVT-16 só põe `edge_not_allowed` em primeiro; `no_open_feature` → `missing_field` → `invalid_plan` → `plan_drops_started_ticket` vem de `test/unit/plan.test.ts:138`, `:210`, `:218-219`.
3. **`null` é ausente ou presente?** EVT-04 trata `body: null` como presente e recusa (`test/unit/send.test.ts:140`); EVT-51 diz "`ticket_ref` presente e não é texto", e `/blocked` aceita `ticket_ref: null` como ausente (`broker/session.ts:24`, `test/unit/session.test.ts:40`). Em `/history` um filtro `null` também "não foi enviado" (`test/integration/routes.test.ts:367`). A spec não diz qual vale em cada campo opcional.
4. **Ticket descartado que volta.** A linha de Assumptions diz que o ticket descartado "não aceita mais `task`" e a volta é `invalid_plan`; EVT-17 só olha o plano vigente. Um ticket descartado que nunca recebeu `task` pode sair do plano (`test/unit/plan.test.ts:165`) e voltar num plano posterior sem `dropped` (`broker/plan.ts:69`; `test/unit/plan.test.ts:168-177` afirma que só o plano vigente conta). A spec precisa escolher entre a regra de EVT-17 e a da Assumption.
5. **EVT-65 "antes de qualquer outra recusa" contra EVT-12.** Um corpo que não é objeto em `/permission-decision` responde `missing_field` (`broker/broker.ts:146-148`, `test/integration/events.test.ts:223`), antes de `invalid_token`. Inofensivo, mas os dois critérios dizem "primeiro".
6. **EVT-15 "só com as chaves `ticket_ref`, `title`, `depends_on` e `dropped`".** A spec não diz se a chave opcional ausente é omitida ou gravada com default. O código omite (`broker/plan.ts:85-90`) e o teste fixa isso (`test/unit/plan.test.ts:70`).
7. **"O servidor MCP ignora" o pedido de permissão antes do registro** (Assumptions). A spec não diz se chamar o broker e ser recusado conta como ignorar. É o mutante M107.

---

## Edge Cases

- [x] `task` do mesmo ticket para outro worker libera o dono anterior: `test/unit/send-task.test.ts:151-154`
- [x] plano que descarta o ticket aberto libera o worker: `test/unit/send-task.test.ts:160-162`
- [x] aceito depois de dois `rework`, `rework_limit` depois do terceiro: `test/unit/send-task.test.ts:109-112`
- [x] feature fechada com o mesmo `ticket_ref` é ignorada: `test/unit/send-task.test.ts:183-188`; `result` que cita `task` dela é `stale_reference`: `test/unit/send-result.test.ts:133-134`
- [x] `result` de ticket de outro worker é `not_owner`: `test/unit/send-result.test.ts:86`
- [x] segundo `verdict` para o mesmo `result` é `stale_reference`: `test/unit/send-verdict.test.ts:168-169`
- [x] `task` entre o `result` e o `verdict`: `test/unit/send-verdict.test.ts:183`
- [x] `/ack` com `seq` de entrega de outro nome: `test/unit/log.test.ts:266-270`; `test/integration/routes.test.ts:239-241`
- [x] sessão cai entre o polling e o `/ack`: `test/integration/routes.test.ts:283-290`
- [x] recusa aumenta `events` em exatamente uma linha e não altera `deliveries`: `test/unit/helpers.ts:131-149`; `test/integration/routes.test.ts:59-70`
- [x] qualquer evento do peer depois do pedido fecha a permissão, inclusive `turn_started` e `usage`: `test/unit/permission.test.ts:299-300`, `:309`
- [x] `refused` depois do pedido mantém o pedido aberto: `test/unit/permission.test.ts:325-326`
- [x] `after` maior que o maior `seq`: `test/integration/events.test.ts:80` - `toEqual({ events: [], last_seq: 3 })`
- [x] `from` de outro peer no corpo: `test/unit/send.test.ts:89-107`; `test/integration/routes.test.ts:134`, `:147`

---

## Código contra a spec (leitura direta)

Os quinze arquivos de código foram lidos inteiros contra os 92 critérios. Nenhuma resposta
contradiz um critério. Três observações, nenhuma delas falha:

- `broker/server.ts:229-236`: o `request_id` só é lembrado depois que `/permission-request` responde. Uma decisão que chegue no polling entre a gravação no broker e essa resposta seria confirmada sem veredito (o caminho de EVT-88). Pede uma decisão humana em milissegundos; não foi reproduzido.
- `broker/send.ts:237` e `broker/session.ts:32` contam os 80 "caracteres" em unidades UTF-16 (`length`). A spec não define a unidade.
- `broker/shared/config.ts:34` (lido, não rodado): `SQUAD_POLL_INTERVAL_MS` definida mas vazia ou não numérica dá `parseInt` igual a `NaN`, e o `setInterval` de `broker/server.ts:292` roda sem espera. A spec diz "quando definida" e não diz o que vale um valor que não é número; os testes removem a variável vazia do ambiente (`test/integration/helpers.ts:56`). O mesmo vale para os intervalos da Peer.

---

## Discrimination Sensor

Scratch: cópia de `broker/` em `8d1ac88` (com `node_modules`) no scratchpad da sessão, fora de
qualquer repositório git. Um mutante por vez sobre a cópia, restaurada do original depois de
cada um. Baseline do scratch: 302 passam na unidade e os quatro arquivos de integração da
fatia passam. Cada mutante rodou `bun test test/unit` (send, plan, session, permission, log,
db, state, derive, contract, config, peers, delivery, tools) ou os arquivos de integração da
rota (`broker.ts`: `routes.test.ts` ou `events.test.ts`; `server.ts`: `server-delivery.test.ts`
ou `server-tools.test.ts`). Os quatro sobreviventes e o M128 rodaram contra a suíte inteira.

| Mutação | File:line | Descrição | Morto? |
| ------- | --------- | --------- | ------ |
| M01 | `broker/send.ts:237` | `summary.length > 80` → `>=` | ✅ EVT-06 |
| M02 | `broker/send.ts:218` | `attempted_kind`: `<= 40` → `< 40` | ✅ EVT-48 |
| M03 | `broker/send.ts:230` | `invalid_field` do `summary` antes de `invalid_kind` | ✅ EVT-10 |
| M04 | `broker/send.ts:254` | sem `no_open_feature` em `/send` | ✅ EVT-10, EVT-09 |
| M05 | `broker/send.ts:106` | limite de rework `>= 3` → `> 3` | ✅ EVT-23 |
| M06 | `broker/send.ts:113` | `worker_busy` conta ticket descartado | ✅ EVT-24 |
| M07 | `broker/send.ts:100` | `ticket_closed` antes de `ticket_dropped` | ✅ EVT-25 |
| M08 | `broker/send.ts:135` | `result` sem checar o dono | ✅ EVT-29 |
| M09 | `broker/send.ts:146` | `result` sem `stale_reference` de task já julgado | ✅ EVT-31 |
| M10 | `broker/send.ts:186` | `verdict` sem `stale_reference` de result substituído | ✅ EVT-37 |
| M11 | `broker/send.ts:186` | `verdict` sem `stale_reference` de segundo veredito | ✅ EVT-36 |
| M12 | `broker/send.ts:69` | `ticket_ref` aceito em mother → leader | ✅ EVT-26 |
| M13 | `broker/send.ts:154` | `data` do `result` sem `commit` | ✅ EVT-32 |
| M14 | `broker/send.ts:273` | `unblocked` também para o result do leader | ✅ EVT-54 |
| M15 | `broker/send.ts:203` | `criteria` gravado cru | ✅ EVT-38 |
| M16 | `broker/send.ts:245` | aresta ignora o papel do destinatário | ✅ EVT-07, EVT-08 |
| M17 | `broker/send.ts:241` | `human` vira `unknown_recipient` | ✅ EVT-07 |
| M18 | `broker/send.ts:226` | sem checar o tipo de `body` | ✅ EVT-04 |
| M19 | `broker/send.ts:94` | ticket fora do plano com eventos passa | ✅ EVT-25 |
| M20 | `broker/send.ts:179` | `verdict` sem `ticket_dropped` | ✅ EVT-21 |
| M21 | `broker/send.ts:141` | `result` sem `ticket_dropped` | ✅ EVT-21 |
| M22 | `broker/send.ts:84` | `criteria: null` aceito | ✅ EVT-19 |
| M23 | `broker/send.ts:61` | `note` de qualquer tipo | ✅ EVT-33 |
| M116 | `broker/send.ts:274` | `unblocked` do result com autor worker | ✅ EVT-54 |
| M24 | `broker/plan.ts:42` | `no_open_feature` antes de `edge_not_allowed` | ✅ EVT-16 |
| M25 | `broker/plan.ts:62` | dependência de si mesmo aceita | ✅ EVT-17 |
| M26 | `broker/plan.ts:69` | descartado volta com `dropped` omitido | ✅ EVT-17 |
| M27 | `broker/plan.ts:76` | ticket iniciado e descartado pode sair | ✅ EVT-18 |
| M28 | `broker/plan.ts:91` | itens gravados crus | ✅ EVT-15 |
| M29 | `broker/plan.ts:22` | lista vazia aceita | ✅ EVT-14 |
| M30 | `broker/plan.ts:59` | `ticket_ref` repetido aceito | ✅ EVT-17 |
| M31 | `broker/session.ts:32` | `reason.length > 80` → `>=` | ✅ EVT-52 |
| M32 | `broker/session.ts:54` | `usage` com zero recusado | ✅ EVT-57, EVT-64 |
| M33 | `broker/session.ts:40` | `data` do `blocked` sem `last_action` | ✅ EVT-50 |
| M34 | `broker/session.ts:47` | `data` do `unblocked` sem `peer` | ✅ EVT-53 |
| M35 | `broker/session.ts:24` | sem checar o tipo de `ticket_ref` | ✅ EVT-51 |
| M36 | `broker/session.ts:72` | `data` do `usage` sem `cache_read` | ✅ EVT-57 |
| M37 | `broker/permission.ts:55` | sem checar o token humano | ✅ EVT-65 |
| M38 | `broker/permission.ts:79` | evento posterior do peer não fecha | ✅ EVT-64 |
| M39 | `broker/permission.ts:80` | `peer_left` não fecha | ✅ EVT-64 |
| M40 | `broker/permission.ts:46` | `summary` do pedido cortado em 81 | ✅ EVT-60 |
| M41 | `broker/permission.ts:67` | decisão aceita para `seq` que não é pedido | ✅ EVT-63 |
| M42 | `broker/permission.ts:23` | token de 16 caracteres | ✅ EVT-62 |
| M43 | `broker/permission.ts:78` | qualquer decisão posterior fecha | ✅ EVT-64, EVT-66 |
| M44 | `broker/permission.ts:90` | decisão endereçada a `human` | ✅ EVT-66 |
| M45 | `broker/permission.ts:66` | `request_seq` abaixo do log vale o primeiro evento | ✅ EVT-63 |
| M46 | `broker/permission.ts:92` | token dentro do evento da decisão | ✅ EVT-66, EVT-62 |
| M121 | `broker/permission.ts:91` | `summary` da decisão cortado em 81 | ✅ EVT-66 |
| M47 | `broker/log.ts:45` | sem linha de entrega para `permission_decision` | ✅ EVT-39 |
| M48 | `broker/log.ts:121` | `/ack` regrava `acked_at` já confirmado | ✅ EVT-43 |
| M49 | `broker/log.ts:121` | `/ack` confirma entrega de outro nome | ✅ EVT-43 |
| M50 | `broker/log.ts:131` | `after`: `seq > n` → `>=` | ✅ EVT-67 |
| M51 | `broker/log.ts:110` | pendentes em `seq` decrescente | ✅ EVT-41 |
| M52 | `broker/log.ts:147` | histórico por `ticket_ref` entre features | ✅ EVT-69 |
| M53 | `broker/log.ts:76` | evento fica quando a entrega falha | ✅ EVT-79 |
| M54 | `broker/log.ts:67` | `refused` sempre sem feature | ✅ EVT-47 |
| M55 | `broker/log.ts:110` | pendentes incluem as confirmadas | ✅ EVT-43 |
| M122 | `broker/log.ts:84` | result e `unblocked` fora de uma transação | ✅ EVT-54 |
| M124 | `broker/log.ts:63` | evento e entrega fora de uma transação | ✅ EVT-79 |
| M56 | `broker/db.ts:86` | gatilho de `DELETE` desligado | ✅ EVT-77 |
| M57 | `broker/db.ts:82` | gatilho de `UPDATE` só para `summary` | ✅ EVT-77 |
| M58 | `broker/db.ts:139` | `isBlocked` lê o primeiro, não o último | ✅ EVT-55, EVT-54 |
| M59 | `broker/db.ts:138` | `isBlocked` ignora o `unblocked` do broker | ✅ EVT-55 |
| M60 | `broker/state.ts:35` | ticket aprovado ainda é do worker | ✅ EVT-72 |
| M61 | `broker/state.ts:45` | `feature` sem `spec_commit` | ✅ EVT-71 |
| M62 | `broker/state.ts:54` | sem dívida de entrega | ✅ EVT-80, EVT-76 |
| M63 | `broker/state.ts:48` | `reworks` sempre 0 | ✅ EVT-72 |
| M113 | `broker/state.ts:48` | `title` não é o do plano | ✅ EVT-72 |
| M64 | `broker/shared/derive.ts:118` | leader deve `task` depois do terceiro rework | ✅ EVT-75 |
| M65 | `broker/shared/derive.ts:127` | dívida de `plan` cita o último kickoff | ✅ EVT-76 |
| M66 | `broker/shared/derive.ts:110` | dívidas de ticket descartado | ✅ EVT-73, EVT-74 |
| M67 | `broker/shared/derive.ts:56` | plano vigente é o primeiro | ✅ EVT-20 e 16 outros |
| M68 | `broker/shared/derive.ts:112` | todo worker deve todo result | ✅ EVT-73 |
| M69 | `broker/shared/derive.ts:130` | `owed` sem ordenar | ✅ EVT-80, EVT-74 |
| M70 | `broker/shared/derive.ts:126` | dívida de `plan` por qualquer `task`, não só da mother | ⚪ Sobreviveu, equivalente: sem `plan` na feature aberta todo `task` leader → worker é recusado com `unplanned_ticket` (`broker/send.ts:94`, EVT-20), então os únicos `task` que existem ali são mother → leader. Não contado |
| M71 | `broker/shared/derive.ts:77` | `resultSeq` é o primeiro result | ✅ EVT-35 |
| M118 | `broker/shared/derive.ts:115` | todo papel deve o `verdict` | ✅ EVT-73, EVT-74 |
| M119 | `broker/shared/derive.ts:118` | todo papel deve o `task` do rework | ✅ EVT-73, EVT-75 |
| M123 | `broker/shared/derive.ts:125` | todo papel deve o `plan` | ✅ EVT-76 |
| M72 | `broker/shared/contract.ts:157` | formato de leitura sem os campos do kind | ✅ EVT-41/67 |
| M73 | `broker/shared/contract.ts:44` | aresta a mais: `verdict` judge → mother | ✅ EVT-08 |
| M74 | `broker/shared/contract.ts:168` | `data` por cima do envelope no formato de leitura | ⚪ Sobreviveu, equivalente no que o broker grava: nenhuma chave de `data` que o código escreve (`loadout`, `criteria`, `task_seq`, `branch`, `commit`, `result_seq`, `outcome`, `tickets`, `reason`, `detail`, `last_action`, `peer`, `role`, `session_id`, `model`, as quatro contagens, `request_id`, `tool_name`, `description`, `input_preview`, `request_seq`, `behavior`, `attempted_kind`, `error`) tem o nome de um campo do envelope. Só muda para uma linha escrita por fora. Não contado |
| M75 | `broker/shared/config.ts:34` | polling default de 100 ms | ✅ EVT-81 |
| M76 | `broker/shared/config.ts:44` | arquivo do token no cwd | ✅ EVT-62 |
| M77 | `broker/peers.ts:93` | sem `unblocked` quando o peer bloqueado sai | ✅ EVT-55 |
| M78 | `broker/peers.ts:91` | entregas pendentes apagadas na saída | ✅ EVT-46, EVT-45 |
| M115 | `broker/peers.ts:98` | `unblocked` da saída sempre sem feature | ✅ EVT-55 |
| M79 | `broker/broker.ts:157` | sem `unknown_peer` em `/ack` | ✅ EVT-03 |
| M80 | `broker/broker.ts:70` | `after` negativo aceito | ✅ EVT-68 |
| M81 | `broker/broker.ts:88` | `/ack` aceita lista de não inteiros | ✅ EVT-44 |
| M82 | `broker/broker.ts:60` | `/history` aceita mais de um filtro | ✅ EVT-70 |
| M83 | `broker/broker.ts:89` | recusa de `/ack` grava `refused` | ✅ EVT-44/49 |
| M84 | `broker/broker.ts:73` | `last_seq` 0 depois do fim | ✅ EVT-67 |
| M85 | `broker/broker.ts:85` | `/poll-messages` confirma ao ler (o defeito do upstream) | ✅ EVT-41/42 |
| M86 | `broker/broker.ts:146` | lista JSON passa por corpo | ✅ EVT-12 |
| M87 | `broker/broker.ts:150` | recusa de `/permission-decision` grava `refused` | ✅ EVT-65/49 |
| M88 | `broker/broker.ts:133` | `after` inválido responde 400 | ✅ EVT-68 |
| M89 | `broker/broker.ts:102` | histórico em `seq` decrescente | ✅ EVT-69 |
| M125 | `broker/broker.ts:156` | `/state` responde sem `id` registrado | ✅ EVT-03 |
| M114 | `broker/broker.ts:27` | `/permission-decision` na lista de rotas com credencial | ⚪ Inválido: a rota é atendida antes dessa lista (`broker/broker.ts:150`), a mudança não altera nada. Não contado |
| M90 | `broker/delivery.ts:75` | `/ack` antes do push | ✅ EVT-82/83 |
| M91 | `broker/delivery.ts:61` | `permission_decision` empurrada ao modelo | ✅ EVT-87 |
| M92 | `broker/delivery.ts:77` | push repetido depois de `/ack` falho | ✅ EVT-84 |
| M93 | `broker/delivery.ts:64` | decisão desconhecida nunca confirmada | ✅ EVT-88 |
| M94 | `broker/delivery.ts:73` | push na ordem do polling | ✅ EVT-82 |
| M95 | `broker/delivery.ts:43` | `meta` sem `from` | ✅ EVT-82 |
| M96 | `broker/delivery.ts:76` | eventos seguintes empurrados depois de push falho | ✅ EVT-83 |
| M97 | `broker/delivery.ts:36` | `content` sem o `commit` | ✅ EVT-82 |
| M98 | `broker/delivery.ts:44` | `meta.ticket_ref` presente como `"null"` | ✅ EVT-82 |
| M112 | `broker/delivery.ts:70` | dois ciclos ao mesmo tempo | ✅ EVT-82 |
| M117 | `broker/delivery.ts:39` | `content` sem o `body` | ✅ EVT-82 |
| M120 | `broker/delivery.ts:64` | veredito sempre `allow` | ✅ EVT-87 |
| M99 | `broker/tools.ts:195` | `plan` exposta ao worker | ✅ EVT-89 |
| M100 | `broker/tools.ts:208` | `send_result` envia `task` | ✅ EVT-90/92 |
| M101 | `broker/tools.ts:189` | `send_verdict` exposta a todo papel | ✅ EVT-89 |
| M102 | `broker/server.ts:139` | capacidade de permissão não declarada | ✅ EVT-85 |
| M103 | `broker/server.ts:318` | argumentos por cima do `kind` e do `id` | ✅ EVT-90 |
| M104 | `broker/server.ts:323` | recusa não é erro da tool | ✅ EVT-91 |
| M105 | `broker/server.ts:236` | pedido não lembrado: sem veredito | ✅ EVT-86/87 |
| M106 | `broker/server.ts:323` | recusa da tool sem o `hint` | ✅ EVT-91 |
| M107 | `broker/server.ts:226` | pedido de permissão repassado ao broker antes do registro | Rodada 1: ❌ sobreviveu. Rodada 2: ✅ morto por `EVT-81/86: before ready the server sends the broker no request...` |
| M108 | `broker/server.ts:292` | sem polling depois do registro | ✅ EVT-81/82/83 |
| M109 | `broker/server.ts:219` | veredito pelo canal do modelo | ✅ EVT-86/87 |
| M110 | `broker/server.ts:232` | pedido repassado sem `input_preview` | ✅ EVT-86/87 |
| M111 | `broker/server.ts:326` | resposta da tool sem o `seq` | ✅ EVT-90 |
| M126 | `broker/server.ts:214` | push sem `seq` e `from` em `meta` | ✅ EVT-81/82/83 |
| M127 | `broker/server.ts:341` | timer de polling ligado antes do registro | Rodada 1: ❌ sobreviveu. Rodada 2: ✅ morto pelo mesmo teste |
| M128 | `broker/server.ts:292` | polling a cada quatro intervalos | ✅ EVT-81 |

**Rodada 1**: 128 mutações sobre os 15 arquivos de código, 127 válidas (M114 não muda comportamento), 123 mortas, 4 sobreviventes: 2 equivalentes (M70, M74) e 2 não equivalentes (M107, M127). As 123 mortas não foram repetidas na rodada 2: nenhum arquivo de código mudou.

### Rodada 2

Scratch novo: cópia de `broker/` em `bb7054a`. Cada mutante rodou contra a suíte inteira (`bun test`, 418 testes).

| Mutação | File:line | Descrição | Morto? |
| ------- | --------- | --------- | ------ |
| M127 | `broker/server.ts:341` | timer de polling ligado antes do registro (sobrevivente da rodada 1) | ✅ `EVT-81/86: before ready the server sends the broker no request, with or without a permission request` |
| M107 | `broker/server.ts:226` | pedido de permissão repassado antes do registro (sobrevivente da rodada 1) | ✅ o mesmo teste |
| M70 | `broker/shared/derive.ts:126` | dívida de `plan` por qualquer `task` | ⚪ Sobreviveu, equivalente, pelo mesmo argumento da rodada 1. Não contado |
| M74 | `broker/shared/contract.ts:168` | `data` por cima do envelope | ⚪ Sobreviveu, equivalente no que o broker grava, pelo mesmo argumento. Não contado |
| N01 | `broker/server.ts:208` | recusa do broker a `/poll-messages` ou `/ack` não é falha da chamada | Rodada 2: ❌ sobreviveu. Rodada 3: ✅ morto por `EVT-84: an ack the broker refuses is a failed ack...` |
| N02 | `broker/server.ts:224` | qualquer notificação sem handler é repassada como pedido de permissão | Rodada 2: ❌ sobreviveu. Rodada 3: ✅ morto por `EVT-86: a notification that is not a permission request is not relayed to the broker` |
| N03 | `broker/server.ts:264` | timer de polling ligado pelo `ready` mesmo quando o registro é recusado | Rodada 2: ❌ sobreviveu. Rodada 3: ✅ morto por `EVT-81: a session whose registration was refused asks the broker for nothing else` |
| N04 | `broker/server.ts:292` | primeiro polling na hora do registro, não um intervalo depois | Rodada 2: ❌ sobreviveu. Rodada 3: ✅ morto por `EVT-81: what was already pending at the registration waits for the first interval` |
| N05 | `broker/server.ts:251` | tool não listada pode ser chamada | ✅ EVT-89 (quatro papéis), PEER-40 |
| N06 | `broker/broker.ts:85` | `/poll-messages` pelo papel em vez do nome | ✅ EVT-62/66, EVT-78 e 3 outros |
| N07 | `broker/broker.ts:91` | `/ack` pelo papel em vez do nome | ✅ EVT-82, EVT-86/87, EVT-88 |
| N08 | `broker/delivery.ts:37` | campos de texto do kind empurrados com aspas de JSON | ✅ EVT-82 |
| N09 | `broker/delivery.ts:79` | um `/ack` só para o ciclo inteiro, depois de todos os pushes | ✅ EVT-82/83, EVT-83 e 3 outros |
| N10 | `broker/delivery.ts:75` | evento cujo push falhou conta como entregue | ✅ EVT-83, EVT-83/87 |
| N11 | `broker/server.ts:319` | a tool não envia o seu `kind` | ✅ EVT-90, EVT-91 |
| N12 | `broker/broker.ts:60` | filtro `null` de `/history` conta como enviado | ✅ EVT-69 |
| N13 | `broker/server.ts:298` | a tool `state` responde sem chamar o broker | ✅ EVT-92 |
| N14 | `broker/tools.ts:213` | `state` e `history` chamam a rota uma da outra | ✅ EVT-92, EVT-90/92 |
| N15 | `broker/server.ts:236` | o veredito cita o `tool_name` em vez do `request_id` | ✅ EVT-86/87 |
| N16 | `broker/broker.ts:112` | `/turn-started` ligada a `unblocked` | ✅ EVT-58, EVT-67 |

Por que nenhum dos quatro é equivalente:

- **N02**: muda o que o broker grava. Uma notificação qualquer para uma sessão registrada vira um `refused` de `permission_request` com `missing_field` no log.
- **N03**: muda as chamadas ao broker de uma sessão não registrada, o que EVT-81 e a linha "'Ignora' o pedido de permissão antes do registro" proíbem.
- **N04**: muda quando o modelo recebe o que estava pendente no registro, contra o default que a spec agora declara.
- **N01**: muda o que o modelo recebe quando o `/ack` é recusado: os eventos seguintes do ciclo são empurrados e o mesmo `seq` volta a cada polling. O broker deste repositório só recusa `/ack` a um `id` que também não consegue mais fazer polling, então na prática é uma corrida de um ciclo. Fica contado, com a prioridade mais baixa, e a spec deve dizer que recusa é falha (lacuna de precisão 8).

**Contagem da rodada 2**: 4 repetidas e 16 novas; das novas, 12 mortas e 4 sobreviventes não equivalentes (N01, N02, N03, N04). Dos quatro sobreviventes da rodada 1, dois morreram (M127, M107) e dois seguem equivalentes (M70, M74)

### Asserções de fechamento da rodada 2 (rodadas no scratch; adotadas em `53ffdf4`)

As quatro viraram testes de `test/integration/server-delivery.test.ts` em `53ffdf4`. Como foram propostas:

- **N02**: broker real, sessão `worker-1` registrada, `client.notification({ method: "notifications/claude/channel/other", params: { request_id: "abcde" } })`, 400 ms; `expect(readDb(broker.dbFile).events.map((e) => e.kind)).toEqual(["peer_joined"])`. No mutante o log ganha um `refused`.
- **N03**: broker substituto que responde `/register` com `{ ok: false, error: "role_taken", hint }`; sessão `judge` com polling de 50 ms chama `ready` com o número do ping; `expect(answer.isError).toBe(true)`, 400 ms, `expect(posts).toEqual(["/register"])`. No mutante a lista segue com `"/poll-messages"`.
- **N04**: broker real, feature aberta, a mother envia um `task` ao `leader` antes de ele registrar; sessão `leader` sem `SQUAD_POLL_INTERVAL_MS`; depois do `register()`, 500 ms e `expect(leader.pushed()).toEqual([])`, e então o push chega em até 2,5 s. No mutante o push já está lá aos 500 ms.
- **N01**: broker substituto que responde `/register` com um `id`, `/poll-messages` com dois eventos (`seq` 3 e 4) e `/ack` com `{ ok: false, error: "unknown_peer", hint }`; sessão `leader` com polling de 50 ms; espera três `POST /ack`; `expect(leader.pushed().map((p) => p.params.meta.seq)).toEqual(["3"])`. No mutante vêm `"3"`, `"4"` e repetições.

### Asserção de fechamento da rodada 1 (adotada em `bb7054a`)

Um broker substituto que anota todo `POST`, uma sessão com papel e polling curto, o
`permission_request` enviado antes do `ready`, e `expect(posts).toEqual([])`. É o teste de
`test/integration/server-delivery.test.ts:219-231` (numeração de `53ffdf4`); M127 e M107 morrem nele.

### Rodada 3

Scratch novo: cópia de `broker/` em `53ffdf4`, apagada no fim. N01 a N04 rodaram contra a suíte inteira (422 testes). Os 20 novos rodaram a unidade (e `routes.test.ts` e `events.test.ts` para `broker.ts`, `log.ts` e `permission.ts`); os três sobreviventes rodaram de novo contra a suíte inteira.

**Como a amostra foi escolhida.** Nada em `server.ts`, já mutado duas vezes. Quatro famílias que as rodadas 1 e 2 não tinham tentado: (a) o escopo de uma leitura, feature aberta contra nenhuma feature e contra todas (R01, R05, R14, R15); (b) o defeito de forma natural, uma regra aplicada a mais ou a menos do que deve (R02, R03, R04, R07, R08, R13, R17); (c) a troca de ordem entre duas recusas que a rodada 1 só tinha removido, não trocado (R10, R11, R12); (d) o valor de borda de um campo: texto vazio, nulo, token curto (R06, R16, R18, R19, R20); mais uma rota trocada que faltava (R09).

| Mutação | File:line | Descrição | Morto? |
| ------- | --------- | --------- | ------ |
| N01 | `broker/server.ts:208` | recusa do broker não é falha da chamada (sobrevivente da rodada 2) | ✅ `EVT-84: an ack the broker refuses is a failed ack...` |
| N02 | `broker/server.ts:224` | qualquer notificação repassada como pedido (sobrevivente da rodada 2) | ✅ `EVT-86: a notification that is not a permission request is not relayed to the broker` |
| N03 | `broker/server.ts:264` | timer de polling com registro recusado (sobrevivente da rodada 2) | ✅ `EVT-81: a session whose registration was refused asks the broker for nothing else` |
| N04 | `broker/server.ts:292` | primeiro polling na hora do registro (sobrevivente da rodada 2) | ✅ `EVT-81: what was already pending at the registration waits for the first interval` |
| R01 | `broker/permission.ts:63` | `permission_closed` olha só os eventos da feature aberta | ✅ EVT-64, EVT-62 |
| R02 | `broker/send.ts:145` | `result`: qualquer `verdict` do ticket torna o `task` velho | ✅ EVT-31, EVT-23 |
| R03 | `broker/shared/derive.ts:72` | `reworks` contados só desde o último `task` | ✅ EVT-23, EVT-75 e 5 outros |
| R04 | `broker/broker.ts:91` | `/ack` confirma tudo o que está pendente, ignorando `seqs` | ✅ EVT-43 |
| R05 | `broker/state.ts:54` | dívida de entrega só da feature aberta | ✅ EVT-80 |
| R06 | `broker/broker.ts:70` | `after` vazio vale como ausente | ✅ EVT-68 |
| R07 | `broker/plan.ts:62` | `depends_on` pode citar ticket do plano vigente que a lista nova omite | ✅ EVT-17/18 |
| R08 | `broker/peers.ts:93` | sem `unblocked` no `/unregister`, só na limpeza | ✅ EVT-55 |
| R09 | `broker/broker.ts:108` | `/unblocked` ligada a `turnStarted` | ✅ EVT-53/59 |
| R10 | `broker/send.ts:135` | `result`: `ticket_dropped` antes de `not_owner` | ✅ EVT-29/21 |
| R11 | `broker/send.ts:179` | `verdict`: `stale_reference` antes de `ticket_dropped` | ✅ EVT-21/35 |
| R12 | `broker/plan.ts:45` | `/plan`: `missing_field` antes de `no_open_feature` | ✅ EVT-09 |
| R13 | `broker/tools.ts:201` | papel inexistente recebe as tools comuns | ✅ EVT-89 |
| R14 | `broker/log.ts:147` | histórico por `ticket_ref` inclui eventos sem feature | ❌ Sobreviveu (suíte inteira) |
| R15 | `broker/log.ts:57` | os eventos da feature aberta incluem os de nenhuma feature | ✅ `featureEvents are the events of the open feature...` |
| R16 | `broker/session.ts:39` | `blocked`: `ticket_ref` vazio gravado como nulo | ❌ Sobreviveu (suíte inteira) |
| R17 | `broker/delivery.ts:63` | o pedido é esquecido na primeira tentativa do veredito | ✅ EVT-83/87 |
| R18 | `broker/shared/contract.ts:165` | formato de leitura: `to` vazio em vez de nulo | ✅ EVT-41/67 |
| R19 | `broker/db.ts:122` | `body` vazio gravado como cópia do `summary` | ✅ EVT-60, EVT-66 |
| R20 | `broker/permission.ts:19` | arquivo de credencial com token curto é recriado | ❌ Sobreviveu (suíte inteira) |

Por que nenhum dos três é equivalente:

- **R14**: muda a resposta de `/history`. Um `/blocked` com `ticket_ref` é aceito sem feature aberta (EVT-59) e fica com `feature_id` nulo; quando uma feature tem um ticket de mesmo nome, o mutante o devolve no histórico desse ticket, contra "os eventos da feature aberta" de EVT-69.
- **R20**: muda o arquivo em disco e o token aceito. A linha de Assumptions "Onde fica a credencial humana" diz "reusa se existe", e a exceção declarada é só o arquivo vazio ou com espaços.
- **R16**: muda a coluna gravada (`""` contra nulo) e o que `/history` por `ticket_ref` devolve. EVT-50 só manda gravar nulo "se ausente". Fica contado; a spec deve decidir o texto vazio (lacuna de precisão 9).

**Contagem da rodada 3**: 4 repetidas, todas mortas agora; 20 novas, 17 mortas e 3 sobreviventes não equivalentes (R14, R16, R20)
**Profundidade**: expandida, três rodadas
**Contagem total**: 163 mutações válidas distintas (127 + 16 + 20), 158 mortas, 2 equivalentes (M70, M74), 3 sobreviventes não equivalentes

**Isolamento**: `git status --porcelain` da árvore real antes da rodada 3: ` M .specs/LESSONS.md`, ` M .specs/lessons.json`, `?? .specs/features/event/validation.md` (o que as rodadas anteriores deixaram). Depois da limpeza do scratch: igual. Nenhum `git stash`, `git reset` ou worktree; os três scratch foram apagados. `C:\Users\lucas\.squad-code-mcp.token` e `C:\Users\lucas\.squad-code-mcp.db` não existem. Nenhum processo `bun` ficou rodando. No temp do sistema ficaram só os sete `squad-*` do dia 7, que não são desta verificação.

### Asserções de fechamento da rodada 3 (rodadas no scratch: as três passam no HEAD, cada uma falha no seu mutante)

- **R14**, em `test/unit/log.test.ts`: `b.session.blocked(WORKER_1, { reason: "r", detail: "", last_action: "", ticket_ref: "T-1" })` sem feature; `b.openFeature()`; um `task` com `ticket_ref` `"T-1"`; `expect(b.log.history({ ticket_ref: "T-1" }).map((e) => e.seq)).toEqual([task])`.
- **R20**, em `test/unit/permission.test.ts`: `writeFileSync(path, "short-token")`; `expect(loadHumanToken(path)).toBe("short-token")`; `expect(readFileSync(path, "utf8")).toBe("short-token")`.
- **R16**, em `test/unit/session.test.ts`, se a spec decidir que o texto vazio é gravado como veio: `expect(b.session.blocked(WORKER_1, { ...BLOCKED, ticket_ref: "" })).toEqual({ ok: true, seq: 1 })`, `expect(b.events()[0]!.ticket_ref).toBe("")`. Se decidir outra coisa, a asserção e `broker/session.ts:24` mudam juntas.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo | ✅ Uma rota por módulo, sem abstração de uso único |
| Mudanças cirúrgicas | ✅ Os testes da Peer editados têm o motivo no arquivo |
| Sem escopo a mais | ✅ Nenhuma rota das fatias Feature, Question ou Gate |
| Segue os padrões | ✅ Relógio e banco injetados, como na Peer |
| Asserções miram o resultado da spec | ✅ Linha inteira por `toEqual`, limites 80, 40 e 3 com valor literal |
| Cobertura por camada | ❌ Três classes de entrada sem asserção: evento sem feature em `/history` (EVT-69), token curto no arquivo de credencial (EVT-62), `ticket_ref` vazio em `/blocked` (EVT-50). O servidor MCP fora do caminho feliz, aberto na rodada 2, está coberto |
| Todo teste mapeia um requisito | ✅ Cada teste nomeia seu EVT; os que fixam ordem não definida estão nas lacunas de precisão 2 |
| Diretrizes documentadas: `broker/CLAUDE.md` | ✅ |

---

## Não verificado

- Linux: nada foi rodado lá em nenhuma das três rodadas.
- Sessão real do Claude Code recebendo o push e o veredito de permissão (fora de escopo na spec).
- A porta 7900, o banco default e o arquivo default do token nunca foram abertos por um processo real.
- `tasks.md` e `design.md`: não lidos.

---

## Fix Plans

Ordenados. Os três são de teste, de uma asserção cada, já mostrada passando no HEAD e falhando no mutante. Nenhum pede mudança de código, salvo o Fix 3 se a spec decidir diferente do que o código faz hoje.

### Fix 1: EVT-69, `/history` por `ticket_ref` deixa de fora o evento sem feature (R14)

- **Causa**: `test/unit/log.test.ts:324-350` exclui o evento de uma feature fechada; nenhum teste tem um evento de `feature_id` nulo com o mesmo `ticket_ref`.
- **Tarefa**: em `test/unit/log.test.ts`, a asserção de fechamento R14.
- **Pronto quando**: passa no HEAD e falha com `OR feature_id IS NULL` na consulta de `broker/log.ts:147`.
- **Prioridade**: Minor

### Fix 2: EVT-62, o arquivo de credencial que existe é reusado, qualquer que seja o tamanho do token (R20)

- **Causa**: os testes de reuso usam tokens de 36 e 43 caracteres (`test/unit/permission.test.ts:64`, `test/integration/events.test.ts:157`).
- **Tarefa**: em `test/unit/permission.test.ts`, a asserção de fechamento R20.
- **Pronto quando**: passa no HEAD e falha com `token.length >= 32` em `broker/permission.ts:21`.
- **Prioridade**: Minor

### Fix 3: `ticket_ref` vazio em `/blocked` (R16, lacuna de precisão 9)

- **Causa**: a spec não diz o que o texto vazio vale em `/blocked`, e nenhum teste o envia.
- **Tarefa**: uma linha de Assumptions com a decisão, e em `test/unit/session.test.ts` a asserção que a fixa (a de fechamento R16 se a decisão for "gravado como veio").
- **Pronto quando**: a asserção passa no HEAD e falha com `|| null` em `broker/session.ts:39`.
- **Prioridade**: Minor

### Decisão do dono (fim do laço limitado)

Esta é a terceira rodada com FAIL e a última do laço. As lacunas de cada rodada foram fechadas na seguinte, e cada rodada nova achou outras, menores. O Verifier não recomenda uma quarta rodada do mesmo tipo. As saídas são duas: aplicar os Fix 1 a 3 e aceitar a fatia sabendo que uma amostra mirada ainda acha um sobrevivente em cada seis ou sete tentativas, todos em valores de borda; ou trocar a amostragem manual por uma ferramenta de mutação sobre `broker/` e tratar a taxa dela como o número a acompanhar.

---

## Requirement Traceability Update

Não aplicado a `spec.md` (o Verifier só escreve este relatório). Proposto:

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| EVT-01 a EVT-49, EVT-51 a EVT-61, EVT-63 a EVT-68, EVT-70 a EVT-92 | Implementing | ✅ Verified (no Windows) |
| EVT-50 | Implementing | ❌ Needs Fix (decidir e testar `ticket_ref` vazio) |
| EVT-62 | Implementing | ❌ Needs Fix (reuso de token curto) |
| EVT-69 | Implementing | ❌ Needs Fix (evento sem feature fora do histórico do ticket) |

---

## Summary

**Geral**: ❌ Não pronto, por três lacunas de prioridade baixa

**Checagem ancorada na spec**: 89/92 critérios com asserção no resultado da spec em toda cláusula e classe de entrada | 3 com uma classe de entrada sem evidência (EVT-50, EVT-62, EVT-69) | EVT-81, EVT-84 e EVT-86 fechados | 8 lacunas de precisão fechadas, 1 nova
**Sensor**: rodada 3: N01 a N04 mortos; 20 novas, 17 mortas, 3 sobreviventes não equivalentes (R14, R16, R20). Total das três rodadas: 158/163 mortas, 2 equivalentes
**Gate**: 419 passam, 3 pulados, 0 falham; `tsc` exit 0

**O que funciona**: o código. Em três rodadas nenhuma resposta contradisse um critério. Tudo o que as rodadas 1 e 2 acharam está fechado e morre no teste que nomeia o caso.

**Problemas**: três valores de borda sem teste (Fix 1 a 3) e uma decisão de spec (lacuna 9).

**Próximos passos**: decisão do dono, descrita acima.
