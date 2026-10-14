# Gate Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/gate/design.md`
**Status**: In Progress

Regras do repositório que valem para toda tarefa:

- Comandos rodam de dentro de `broker/`. No Windows o `bun` é o 1.3.14 do winget (Handoff) e o Python é `python`.
- Mensagem de commit: uma frase imperativa em inglês, em minúsculas, sem prefixo de Conventional Commits (veja `git log`), com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` no fim. `check_commit.py` não se aplica. O commit de cada tarefa não pede sim; `git push` e o PR pedem.
- Um commit por tarefa, com a tarefa marcada aqui e os requisitos dela em `Implementing` na spec, no mesmo commit.
- Código, comentários e nomes em inglês, no estilo e na densidade de comentário dos arquivos vizinhos; o texto que aparece na tela é português.
- O nome de cada teste começa pelo requisito: `GAT-15: ...`.
- Os `.txt` de `test/frames/` que já existem não são editados; os 13 novos são a saída de `extract.ts`.
- O resultado esperado vem da spec: textos da tela e códigos de recusa com o literal da spec; "como a tecla K" se afirma comparando com `press` aplicado ao mesmo estado.
- Lições: L-001, L-010, L-020 (80 caracteres, 500 ms, 4 s, 2000 ms, 8 linhas, 70 colunas com o literal), L-024 e L-036 (`null` e vazio em cada campo opcional), L-040 (limite no valor exato), L-048 e L-073 (a ordem das recusas), L-050 (o que a raiz injeta, pelo processo real), L-055, L-057, L-067, L-068 e L-069 (entrada da TUI pelo laço, primeiro, último e no meio, partida em duas leituras), L-080.
- Nunca subir `broker.ts` ou `server.ts` sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Não usar `bun x tsc`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `broker/CLAUDE.md` (comandos), `.specs/STATE.md` Handoff (como rodar a suíte), `.specs/LESSONS.md` (lições confirmadas acima). Sem limiar de cobertura configurado: valem os defaults fortes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Regras do broker (`gate.ts`, `feature.ts`, `log.ts`, `db.ts`, `send.ts`) | unit | 1:1 com GAT-01 a GAT-29; cada recusa, a ordem delas, `null` e vazio em cada opcional, limite de 80 | `broker/test/unit/gate-*.test.ts`, `feature-close.test.ts`, `db.test.ts` | `bun test test/unit` |
| Derivação (`shared/derive.ts`) | unit | Cada campo de `Gate` e de `requests`; paridade com a tabela por sequências geradas | `broker/test/unit/derive-gate.test.ts`, `gate-replay.test.ts` | `bun test test/unit` |
| Rotas HTTP (`broker.ts`) | integration | `/gate` e `/gate-decision` pelo broker real: sucesso, recusa de peer, credencial humana | `broker/test/integration/gate.test.ts` | `bun test` |
| Tools e entrega (`tools.ts`, `server.ts`) | integration | A tool só da mother; o `gate_decision` empurrado e confirmado | `broker/test/integration/server-tools.test.ts` | `bun test` |
| Skill da mother | unit | As seções reescritas e nenhuma outra skill com `gate` | `broker/test/unit/skills.test.ts` | `bun test test/unit` |
| Escritor da TUI (`tui/writer.ts`) | unit | Cada rota: corpo enviado, ok, recusa, status, corpo inválido, prazo | `broker/test/unit/tui-writer.test.ts` | `bun test test/unit` |
| Redutor de teclas (`tui/keys.ts`) | unit | 1:1 com GAT-40, GAT-50 a GAT-60, GAT-65 a GAT-77; cada modo; colagem com a tecla primeiro, no meio e por último | `broker/test/unit/tui-gate-keys.test.ts`, `tui-permission-keys.test.ts` | `bun test test/unit` |
| Telas (`tui/screens/*.ts`) | unit | Os frames 08 a 29d; cada linha de GAT-41 a GAT-49, GAT-51, GAT-53, GAT-61 a GAT-64, GAT-71 fora dos frames (plural, sem `body`, sem `diffstat`, prévia vazia) | `broker/test/unit/tui-frames.test.ts`, `tui-gate.test.ts`, `tui-permission.test.ts` | `bun test test/unit` |
| Mouse (`tui/mouse.ts`, marcas) | unit | GAT-79 a GAT-84: fora da caixa, cada atalho, a fila do primeiro ao último, a roda, o clique duplo | `broker/test/unit/tui-mouse-gate.test.ts` | `bun test test/unit` |
| Laço (`tui.ts` `start`) | unit | Um `POST` por decisão, na rota certa, com a credencial lida na hora; colagem pelo laço; tela pequena | `broker/test/unit/tui-gate-loop.test.ts` | `bun test test/unit` |
| Ponta a ponta | integration | Clientes MCP de teste e a TUI num pseudo-terminal sobre um broker real, do kickoff ao `close_feature` | `broker/test/integration/gate-e2e.test.ts` | `bun test` |
| Documentação, `.specs/`, `ROADMAP.md` | none | - | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefa só com teste de unidade | `bun test test/unit` |
| Full | Depois de tarefa com teste de integração | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |
| Build | Última tarefa de cada fase, e tarefa sem teste | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |

O repositório não tem linter. A contagem de testes só cresce. Antes desta fatia, na `main` em `3922651`, Windows com o Bun 1.3.14: 2080 passam e 5 são pulados (Handoff, em `dafa7f1`). Os testes instáveis conhecidos estão no Handoff (`EVT-43`, `EVT-90/92`, `PEER-28`, `PEER-29`, PAP-38 de 2000 ms; no Linux, os `git` de `launch*.test.ts`): rodar de novo antes de concluir que algo quebrou.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Broker

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Agentes

```
T8 → T9 → T10
```

### Phase 3: Estado da TUI

```
T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 4: Telas

```
T17 → T18 → T19 → T20 → T21 → T22 → T23
```

### Phase 5: Mouse e laço

```
T24 → T25 → T26
```

### Phase 6: Fechamento

```
T27 → T28 → T29 → T30
```

---

## Task Breakdown

### T1: Tabela `gates` e `gate_id` no registro

**What**: `openDatabase` cria `gates`; `GateRow`; `NewRecord.gate_id` chega a `appendEvent`.
**Where**: `broker/db.ts`
**Depends on**: None
**Reuses**: o molde de `questions`
**Requirement**: GAT-01, GAT-02

**Done when**:

- [ ] A tabela tem as oito colunas do design, com `commit` entre aspas; abrir duas vezes o mesmo banco não falha
- [ ] Um registro com `gate_id` grava a coluna; sem ele, nula
- [ ] Testes em `test/unit/db.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T2: `gates()` da derivação

**What**: `Gate` com todos os campos do design; `gates(events)` com versões, comentário, decisão final e o `feature_closed`; `pending` como antes.
**Where**: `broker/shared/derive.ts`
**Depends on**: T1
**Reuses**: `gates`, `bySeq`
**Requirement**: GAT-30, GAT-31, GAT-32, GAT-33

**Done when**:

- [ ] Cada campo de GAT-31 afirmado em `test/unit/derive-gate.test.ts`, com 1, 2 e 3 versões, sem e com dois `comment` (vale o mais recente), `approve` depois de `comment`, e um `reject` depois de um `approve` que não conta
- [ ] Gate pendente com `feature_closed` é `rejected` sem `decision_seq`; gate decidido antes do `feature_closed` não muda
- [ ] Os testes de `derive*.test.ts` e de frames que já passavam continuam; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T3: `/gate`

**What**: `createGate(db, log, token).request`: pedido novo e reemissão, na ordem de recusas de GAT-07, com `refused`.
**Where**: `broker/gate.ts`
**Depends on**: T2
**Reuses**: `question.ts` (`no`, `isText`, `log.transaction`), `tickets()`
**Requirement**: GAT-01, GAT-02, GAT-03, GAT-04, GAT-05, GAT-06, GAT-07, GAT-08, GAT-09, GAT-10, GAT-12, GAT-13, GAT-14

**Done when**:

- [ ] Cada AC com o seu caso em `test/unit/gate-request.test.ts`: linha e evento, `data` só com os campos enviados, nenhuma entrega
- [ ] `missing_field` para cada obrigatório ausente, não texto e vazio; para cada opcional `null`, não texto e vazio; `delivery` sem `commit`; `summary` de 80 aceito e de 81 `invalid_field`
- [ ] Cada par de recusas vizinhas da ordem de GAT-07 num caso que falha nas duas
- [ ] `tickets_open` com ticket em `working`, `review` e `escalated`; aceito sem `plan`, com aprovados e descartados, e com `scope` `action`; o `hint` nomeia os tickets
- [ ] Reemissão de pendente atualiza `scope`, `commit` e `request_seq`; de `approved` e de `rejected` dá `gate_closed`; `gate_id` de outra feature e inexistente dá `invalid_field`
- [ ] Uma falha forçada no meio da transação não deixa linha nem evento (GAT-10); gate quick passa

**Tests**: unit
**Gate**: quick

---

### T4: `/gate-decision`

**What**: `decide(body)`: credencial humana, as três decisões, a entrega à mother, o `summary` do broker e a decisão única.
**Where**: `broker/gate.ts`
**Depends on**: T3
**Reuses**: `answerAsHuman`, `resolve` (releitura na transação)
**Requirement**: GAT-15, GAT-16, GAT-17, GAT-18, GAT-19, GAT-20, GAT-21, GAT-22, GAT-23, GAT-24, GAT-25

**Done when**:

- [ ] Cada AC com o seu caso em `test/unit/gate-decision.test.ts`; o `summary` de 80 e o cortado; `body` vazio sem `text`
- [ ] `reject` e `comment` com `text` ausente, `null`, vazio e só espaços dão `missing_field`; `approve` com `text` vazio é aceito e guardado
- [ ] Nenhuma recusa grava `refused`; a ordem de GAT-25 por pares
- [ ] `comment` deixa a linha igual; `approve` depois de `comment` decide; segundo `approve` e `reject` depois de `approve` dão `gate_closed`; gate de feature fechada dá `gate_closed`
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### T5: `gate_required` e o encerramento

**What**: `log.close` rejeita os gates pendentes; `createFeature(log, approved)` responde `gate_required`.
**Where**: `broker/feature.ts`
**Depends on**: T4
**Reuses**: `log.close`, `createGate().approved`
**Requirement**: GAT-26, GAT-27, GAT-28, GAT-29

**Done when**:

- [ ] `delivered` sem gate, com gate `delivery` pendente, rejeitado, e só com `action` aprovado: `gate_required` com `refused`; com `delivery` aprovado fecha
- [ ] `abandoned` fecha com gate pendente; nos dois `outcome` os pendentes viram `rejected` com `decision_seq` nulo e os decididos não mudam
- [ ] A ordem de GAT-29 por pares; `test/unit/feature-close.test.ts` e os testes que fecham feature `delivered` sem gate passam a pedir o gate; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T6: Rotas e `invalid_kind`

**What**: `broker.ts` liga `/gate` (peer) e `/gate-decision` (humana); `send.ts` aponta `gate` e `gate_decision` para elas.
**Where**: `broker/broker.ts`
**Depends on**: T5
**Reuses**: `PEER_ROUTES`, o caminho de `/permission-decision`, `ROUTE_OF` de `send.ts`
**Requirement**: GAT-05, GAT-11, GAT-20, GAT-26

**Done when**:

- [ ] `test/integration/gate.test.ts` pelo broker real: pedido, `approve`, `close_feature` `delivered`; `unknown_peer` em `/gate`; `invalid_token` em `/gate-decision`; `gate_required` antes do gate
- [ ] `/send` com `gate` e com `gate_decision` dá `invalid_kind` com o `hint` que nomeia a rota
- [ ] Gate full passa

**Tests**: integration
**Gate**: full

---

### T7: Paridade por sequências geradas

**What**: um teste que gera sequências de `/gate`, `/gate-decision` e `/close-feature` e compara `gates()` de `GET /events` com as linhas.
**Where**: `broker/test/unit/gate-replay.test.ts`
**Depends on**: T6
**Reuses**: `question-replay.test.ts`
**Requirement**: GAT-30, GAT-24

**Done when**:

- [ ] Pelo menos 200 sequências com semente fixa, com reemissão, comentário, decisões repetidas e encerramento nos dois `outcome`
- [ ] Nenhum gate com dois `gate_decision` finais; gate build passa

**Tests**: unit
**Gate**: build

---

### T8: Tool `gate`

**What**: `GATE_TOOL` em `OF_ROLE.mother` e `ROUTE_OF.gate`.
**Where**: `broker/tools.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `ASK_TOOL`
**Requirement**: GAT-34, GAT-35

**Done when**:

- [ ] Só a mother lista `gate`, com os obrigatórios e opcionais de GAT-34; `allowed("mother")` tem `mcp__plugin_squad_squad__gate` e nenhum outro papel tem
- [ ] Testes em `test/unit/tools.test.ts` e `test/unit/launch-args.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T9: Entrega do `gate_decision` à sessão da mother

**What**: um teste de integração em que o servidor MCP da mother recebe pelo canal o `gate_decision` e o confirma.
**Where**: `broker/test/integration/server-tools.test.ts`
**Depends on**: T8
**Reuses**: os ajudantes de `server-delivery.test.ts`
**Requirement**: GAT-36, GAT-18

**Done when**:

- [ ] A tool `gate` chamada pela sessão de teste grava o gate; o `approve` com a credencial humana chega como notificação do canal e a entrega fica confirmada
- [ ] Gate full passa

**Tests**: integration
**Gate**: full

---

### T10: Skill da mother

**What**: as seções "Irreversible actions" e "Delivery" reescritas com a tool `gate`; os testes de PAP-72 trocados pelos de GAT-37 a GAT-39.
**Where**: `plugin/skills/mother/SKILL.md`
**Depends on**: T9
**Reuses**: o texto das seções de hoje
**Requirement**: GAT-37, GAT-38, GAT-39

**Done when**:

- [ ] Sem a linha do AD-020; cada mandamento de GAT-38 e GAT-39 numa frase que o teste procura; nenhuma outra skill cita `gate`
- [ ] `test/unit/skills.test.ts` atualizado; gate build passa

**Tests**: unit
**Gate**: build

---

### T11: Escritor das decisões

**What**: `createWriter` ganha `gate(token, gate_id, decision, text?)` e `permission(token, request_seq, behavior)` sobre um `post` comum.
**Where**: `broker/tui/writer.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `answer`
**Requirement**: GAT-58, GAT-69, GAT-72

**Done when**:

- [ ] Cada rota: o corpo enviado, `ok`, recusa com `error`, status 500, corpo sem `ok`, exceção e 2000 ms sem resposta dão o que GAT-58 diz
- [ ] Os testes de `answer` continuam; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T12: `squad.requests` e os campos de `Ui`

**What**: `Squad.requests` (rótulo `P-NN`, aberto, como fechou, quando); `Ui.gate`, `Ui.permission` opcionais e `Ui.send` como união.
**Where**: `broker/shared/derive.ts`
**Depends on**: T11
**Reuses**: `openPermissions`
**Requirement**: GAT-61, GAT-62, GAT-70, GAT-71, GAT-96

**Done when**:

- [ ] `P-01`, `P-02` em ordem do log inteiro; fechado por decisão, por evento do peer e por `peer_left`, com o `ts` de quem fechou; um `refused` sobre o peer não fecha
- [ ] `tsc` passa com os campos novos; testes em `test/unit/derive-gate.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T13: Teclas do modal de gate

**What**: `g` abre; `gating` com os modos de leitura, confirmação e texto.
**Where**: `broker/tui/keys.ts`
**Depends on**: T12
**Reuses**: `answering`, `notice`
**Requirement**: GAT-40, GAT-50, GAT-52, GAT-54, GAT-55, GAT-56, GAT-76, GAT-90, GAT-91, GAT-92

**Done when**:

- [ ] Cada tecla de cada modo em `test/unit/tui-gate-keys.test.ts`, com `q`, dígitos, `g`, `x`, `4` e `enter` onde a spec os nomeia; `]` e `[` no primeiro, no meio e no último da fila
- [ ] `g` sem gate, com o broker fora e com outro modal aberto; `y` e `enter` deixam o `send` de GAT-52 e GAT-55; vazio e só espaços não deixam e marcam o erro, que some na tecla seguinte que muda o texto
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### T14: Teclas do modal de permissão

**What**: `x` abre; `permitting` com rolagem, fila, `a` só com o fim à vista, `d`, e o estado respondido.
**Where**: `broker/tui/keys.ts`
**Depends on**: T13
**Reuses**: `gating`
**Requirement**: GAT-60, GAT-65, GAT-66, GAT-67, GAT-71, GAT-94, GAT-95

**Done when**:

- [ ] Cada tecla em `test/unit/tui-permission-keys.test.ts`, com prévia de 1, 8, 9 e 13 linhas e vazia; `a` na penúltima posição não envia e na última envia; `G` vai ao fim
- [ ] No estado respondido só `esc` muda o estado; `x` sem pedido e com o broker fora; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T15: `settle` e `sync` dos modais novos

**What**: o que a resposta do broker e cada leitura fazem aos modais de gate e de permissão.
**Where**: `broker/tui/keys.ts`
**Depends on**: T14
**Reuses**: `settle`, `sync`
**Requirement**: GAT-57, GAT-58, GAT-59, GAT-68, GAT-69, GAT-70, GAT-73, GAT-74, GAT-97

**Done when**:

- [ ] Cada resposta do broker de GAT-57, GAT-58, GAT-68, GAT-69 e a credencial ausente, com o aviso literal e os 4 s
- [ ] `sync`: gate decidido, feature fechada, versão nova em confirmação e em texto; pedido decidido por outro e fechado pelo peer; com envio em curso nada muda
- [ ] Os testes de `settle` e `sync` da resposta continuam; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T16: Colagem e broker fora nos modais novos

**What**: `input` ignora em bloco colado o que decidiria; o broker fora congela os modais.
**Where**: `broker/tui/keys.ts`
**Depends on**: T15
**Reuses**: `input`, `PASTE_START`
**Requirement**: GAT-75, GAT-77

**Done when**:

- [ ] `y`, `a`, `d`, `\r` e `\n` primeiro, no meio e por último num bloco, e entre marcadores de colagem delimitada partidos em duas leituras; nos modos de texto o salto vira espaço e as letras entram
- [ ] Com `view.down` nenhuma tecla muda os modais a não ser `ctrl+c`; gate build passa

**Tests**: unit
**Gate**: build

---

### T17: `drawModal` comum

**What**: `drawModal`, `drawInput` e o item da prévia saem para `screens/modal.ts`, com `x`, `w`, cor da borda e etiqueta; `answer.ts` passa a usá-los.
**Where**: `broker/tui/screens/modal.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `drawModal` e `drawInput` de `answer.ts`, `drawPre` do protótipo
**Requirement**: GAT-41, GAT-61, GAT-63

**Done when**:

- [ ] Os frames 05, 06, 07, 20a e 20b passam sem mudar a tabela de desvios
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### T18: Tela do modal de gate

**What**: `gate(g, view)`, porta de `gateModal`, com as marcas da fila e de fora da caixa.
**Where**: `broker/tui/screens/gate.ts`
**Depends on**: T17
**Reuses**: `drawModal`, `drawKeys`, `stats` (custo da feature), `questions` da derivação
**Requirement**: GAT-41, GAT-42, GAT-43, GAT-44, GAT-45, GAT-46, GAT-47, GAT-48, GAT-49, GAT-51, GAT-53, GAT-56, GAT-93

**Done when**:

- [ ] `test/unit/tui-gate.test.ts`: cada linha nos três modos; plural e singular; sem `body`, sem `diffstat`, sem `verdict`, com `action`; versão 2 sem `comment`; `~ mudou` só na linha que mudou; corte de `body` e `diffstat` longos dentro das linhas 2 a 37
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### T19: Tela do modal de permissão

**What**: `permission(g, view)`, porta de `permModal`, com a prévia, a fila e o estado respondido.
**Where**: `broker/tui/screens/permission.ts`
**Depends on**: T18
**Reuses**: `drawModal`, `statusSegs`, `drawKeys`
**Requirement**: GAT-61, GAT-62, GAT-63, GAT-64, GAT-71, GAT-94, GAT-95

**Done when**:

- [ ] `test/unit/tui-permission.test.ts`: título e etiquetas; `[blocked x]` e outro status; os três textos de ticket; a borda da prévia com 8, 9 e 13 linhas no começo, no meio e no fim; os dois rodapés; o estado respondido
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### T20: Desenho dos modais pelo laço e a legenda

**What**: `tui.ts` desenha a tela principal com o modal de gate ou de permissão por cima; `help.ts` ganha as oito linhas.
**Where**: `broker/tui.ts`
**Depends on**: T19
**Reuses**: `screen()`, `SCREENS`
**Requirement**: GAT-40, GAT-60, GAT-87, GAT-88

**Done when**:

- [ ] Com `Ui.gate` em outra aba, o desenho é o da tela principal com o modal (teste do laço)
- [ ] O frame 11 passa só com o D4 de CLK-55 e o D3 da linha de sistema fora de escopo; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T21: Frames de gate

**What**: os frames 08, 16a, 16b, 16c, 17, 18b e 19b extraídos, com log, estado e desvios.
**Where**: `broker/test/frames/logs.ts`
**Depends on**: T20
**Reuses**: `G01`, `COMMENT`, `G02`, `gated`
**Requirement**: GAT-85, GAT-88, GAT-89

**Done when**:

- [ ] Os sete `.txt` são a saída de `extract.ts`; os 47 anteriores idênticos aos da `main`
- [ ] O `body` do G-01 é o resumo; `diffstat` das duas versões; a reemissão de 18b; o `text` do comentário
- [ ] Cada desvio com classe D1 ou D2 e motivo; nenhum no conteúdo do modal; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T22: Frames de permissão

**What**: os frames 22a, 22b, 22d, 22e, 22f e 29d extraídos, com log, estado e desvios.
**Where**: `broker/test/unit/tui-frames.test.ts`
**Depends on**: T21
**Reuses**: `permitted`, os logs de 22c e 29c
**Requirement**: GAT-86, GAT-88, GAT-89

**Done when**:

- [ ] Os seis `.txt` são a saída de `extract.ts`; o 22b com o evento de worker-1 às 14:31:02 que fecha o pedido
- [ ] O D3 da linha de sistema só no 22b e no 11; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T23: Marcas do selo e dos atalhos dos modais

**What**: `SENT` com `a`, `r`, `c`, `y`, `d`, `G`, `]` e `[`; os selos de gate e de permissão continuam marcados com `g` e `x`.
**Where**: `broker/tui/screens/chrome.ts`
**Depends on**: T22
**Reuses**: `drawKeys`
**Requirement**: GAT-79, GAT-82

**Done when**:

- [ ] Cada atalho dos rodapés dos dois modais tem a sua tecla na tecla e no texto; `j/k` cada letra; a célula entre dois atalhos não tem marca
- [ ] Gate build passa

**Tests**: unit
**Gate**: build

---

### T24: Clique nos modais

**What**: `point` com "algum modal aberto"; `answered` despacha para os três modais; a fila por `[` e `]`.
**Where**: `broker/tui/mouse.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `walk`, `tap`
**Requirement**: GAT-79, GAT-80, GAT-81, GAT-82, GAT-83, GAT-84

**Done when**:

- [ ] `test/unit/tui-mouse-gate.test.ts`: cada GAT comparado com `press` no mesmo estado; fora da caixa nos quatro modos de gate e nos dois de permissão; a fila do primeiro ao último e o marcado; dentro da caixa inerte; a roda; 499 e 500 ms
- [ ] Os testes de `tui-mouse.test.ts` continuam; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T25: Envio das decisões pelo laço

**What**: `post()` de `tui.ts` escolhe a rota pelo formato de `Ui.send`.
**Where**: `broker/tui.ts`
**Depends on**: T24
**Reuses**: `post`, `settle`
**Requirement**: GAT-72, GAT-73, GAT-74, GAT-78

**Done when**:

- [ ] `test/unit/tui-gate-loop.test.ts`: `g a y` e `g r <texto> enter` fazem um `POST /gate-decision` cada; `x a` um `POST /permission-decision`; a credencial lida na hora; uma tecla durante o envio não faz outro `POST`; a colagem pelo laço; a tela pequena com o modal aberto
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### T26: De ponta a ponta

**What**: clientes MCP de teste da mother, do leader, de um worker e do judge levam dois tickets ao gate, e a TUI num pseudo-terminal decide um pedido de permissão e aprova o gate.
**Where**: `broker/test/integration/gate-e2e.test.ts`
**Depends on**: T25
**Reuses**: `test/integration/helpers.ts`, `test/terminal.ts`, `cli.test.ts`
**Requirement**: GAT-26, GAT-27, GAT-40, GAT-52, GAT-60, GAT-66

**Done when**:

- [ ] `close_feature` `delivered` recebe `gate_required` antes do `approve` e fecha depois; o pedido de permissão chega ao servidor MCP como veredito
- [ ] Gate full passa

**Tests**: integration
**Gate**: full

---

### T27: Documentação

**What**: `broker/CLAUDE.md`, `broker/README.md` e o comentário de `tui.ts` dizem o que a fatia mudou.
**Where**: `broker/CLAUDE.md`
**Depends on**: None (a fase anterior inteira)
**Reuses**: o texto atual
**Requirement**: GAT-72

**Done when**:

- [ ] `gate.ts`, as duas rotas, a tabela, os dois modais e as três escritas da TUI descritos; gate build passa

**Tests**: none
**Gate**: build

---

### T28: Suíte no Windows e no Linux

**What**: a suíte inteira nos dois sistemas, registrada na spec.
**Where**: `.specs/features/gate/spec.md`
**Depends on**: T27
**Reuses**: o contêiner `oven/bun:1.4.2` do Handoff
**Requirement**: GAT-89

**Done when**:

- [ ] Windows: `tsc` 0 e a contagem; Linux: clone com `core.autocrlf=false`, `git`, `lsof` e `procps`, 3 execuções; ou o que ficou sem rodar

**Tests**: none
**Gate**: build

---

### T29: Marco do MVP

**What**: sessões reais do Claude Code levam uma feature de dois tickets do kickoff ao gate aprovado, com o dev só no terminal da mother e na TUI.
**Where**: `.specs/features/gate/marco-mvp.md`
**Depends on**: T28
**Reuses**: `.specs/features/papeis/real-session-driver.py`, `real-session-tools/`
**Requirement**: GAT-37, GAT-38, GAT-39

**Done when**:

- [ ] O log da feature, as entradas em terminais que não o da mother contadas, e o que ficou sem exercitar

**Tests**: none
**Gate**: build

---

### T30: Fechamento

**What**: roadmap, Handoff e traceability.
**Where**: `ROADMAP.md`
**Depends on**: T29
**Reuses**: -
**Requirement**: GAT-89

**Done when**:

- [ ] A fatia marcada, o marco do MVP conferido ou não, o Handoff apontando o PR

**Tests**: none
**Gate**: build

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início da fase 1 | ✅ |
| T2 a T7 | a anterior | a seta da anterior | ✅ |
| T8 | a fase anterior | início da fase 2 | ✅ |
| T9, T10 | a anterior | a seta da anterior | ✅ |
| T11 | a fase anterior | início da fase 3 | ✅ |
| T12 a T16 | a anterior | a seta da anterior | ✅ |
| T17 | a fase anterior | início da fase 4 | ✅ |
| T18 a T23 | a anterior | a seta da anterior | ✅ |
| T24 | a fase anterior | início da fase 5 | ✅ |
| T25, T26 | a anterior | a seta da anterior | ✅ |
| T27 | a fase anterior | início da fase 6 | ✅ |
| T28 a T30 | a anterior | a seta da anterior | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 a T5, T7 | Regras do broker | unit | unit | ✅ |
| T6 | Rotas HTTP | integration | integration | ✅ |
| T2, T12 | Derivação | unit | unit | ✅ |
| T8 | Tools | unit (lista) | unit | ✅ |
| T9 | Entrega | integration | integration | ✅ |
| T10 | Skill da mother | unit | unit | ✅ |
| T11 | Escritor | unit | unit | ✅ |
| T13 a T16 | Redutor de teclas | unit | unit | ✅ |
| T17 a T23 | Telas | unit | unit | ✅ |
| T24 | Mouse | unit | unit | ✅ |
| T25 | Laço | unit | unit | ✅ |
| T26 | Ponta a ponta | integration | integration | ✅ |
| T27 a T30 | Documentação e `.specs/` | none | none | ✅ |
