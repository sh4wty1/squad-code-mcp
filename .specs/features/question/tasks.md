# Question Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/question/design.md`
**Status**: Approved

Regras do repositório que valem para toda tarefa:

- Comandos rodam de dentro de `broker/`. No Windows o `bun` é o 1.4.2 e o Python é `python`.
- Mensagem de commit: uma frase imperativa em inglês, em minúsculas, sem prefixo de Conventional Commits (veja `git log`), com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` no fim. `check_commit.py` não se aplica.
- Um commit por tarefa, com a tarefa marcada aqui e os requisitos dela em `Implementing` na spec, no mesmo commit.
- Código, comentários e nomes em inglês, no estilo e na densidade de comentário dos arquivos vizinhos; o texto que aparece na tela é o português dos frames.
- O nome de cada teste começa pelo requisito: `QST-33: ...`.
- Lição L-001: quando um AC fixa a ordem de dois passos, o teste usa um cenário cujo resultado muda se os passos trocam. Lição L-020: limite da spec é afirmado com o literal (80, 3, 240, 1000, 2000, 4 s), não com a constante importada do código.
- Nunca subir `broker.ts` ou `server.ts` sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Não usar `bun x tsc`.
- O protótipo está em `docs/claude-design-handoff/Handoff-Design.zip` (`Squad TUI.dc.html`). Extraia-o para um diretório temporário fora do repositório para ler as funções de desenho. Os `.txt` de `broker/test/frames/` não são editados.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `broker/CLAUDE.md` (comandos), `.specs/STATE.md` Handoff (como rodar a suíte), `.specs/LESSONS.md` (L-001, L-020). Sem limiar de cobertura configurado: valem os defaults fortes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contrato (`shared/contract.ts`) | unit | Cada função exportada nova | `broker/test/unit/contract.test.ts` | `bun test test/unit` |
| Armazenamento (`db.ts`) | unit | Esquema e reabertura de banco anterior | `broker/test/unit/db.test.ts` | `bun test test/unit` |
| Log (`log.ts`) | unit | Caminho feliz, transação e regressão da regra de entrega | `broker/test/unit/log.test.ts`, `question-close.test.ts` | `bun test test/unit` |
| Derivação (`shared/derive.ts`) | unit | Todos os ramos; 1:1 com QST-46, QST-47, QST-49 e QST-51 | `broker/test/unit/derive.test.ts`, `state.test.ts` | `bun test test/unit` |
| Rota (`question.ts`, `send.ts`) | unit | 1:1 com os ACs; cada recusa, a ordem delas par a par, e todo edge case da spec | `broker/test/unit/question-*.test.ts`, `send*.test.ts` | `bun test test/unit` |
| Processo do broker (`broker.ts`) | integration | Processo real: rotas, credenciais, prazo e reinício | `broker/test/integration/question.test.ts` | `bun test` |
| Tools e servidor MCP (`tools.ts`, `server.ts`) | integration | Tools por papel; ida e volta por dois clientes MCP reais | `broker/test/unit/tools.test.ts`, `broker/test/integration/server-question.test.ts` | `bun test` |
| Tela pura (`tui/asked.ts`, `tui/screens/*.ts`) | unit | 1:1 com os ACs; cada frame da tela é um caso; todo desvio classificado | `broker/test/unit/tui-*.test.ts` | `bun test test/unit` |
| Processo da TUI (`tui/keys.ts`, `tui/writer.ts`) | unit | Cada tecla de cada modo, cada resultado de envio e cada falha da spec | `broker/test/unit/tui-keys.test.ts`, `tui-writer.test.ts` | `bun test test/unit` |
| Entrada da TUI (`tui.ts`) | integration | Laço com `fetch` falso e um broker real respondido pela TUI | `broker/test/unit/tui-loop.test.ts`, `broker/test/integration/tui.test.ts` | `bun test` |
| Tipos (`tui/view.ts`) | none | - (build gate only) | - | build gate only |
| Frames (`test/frames/*.txt`, `logs.ts`) | none | - (build gate only; o teste de frames os consome) | - | build gate only |
| Demo (`tui/demo.ts`) | none | - (conferido à mão num terminal) | - | build gate only |
| Documentação | none | - | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefa só com teste de unidade | `bun test test/unit` |
| Full | Depois de tarefa com teste de integração | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |
| Build | Última tarefa de cada fase, e tarefa sem teste | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |

O repositório não tem linter. `EVT-43` em `test/integration/routes.test.ts` falha de vez em quando por poucos ms: rodar de novo. A contagem de testes só cresce: 926 passam e 3 são pulados no Windows antes desta fatia.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Base

O que as rotas e a tela leem: o rótulo, a tabela, o log e a derivação.

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Rotas

`question.ts`: perguntar, escalar, responder e mesclar.

```
T6 → T7 → T8 → T9 → T10
```

### Phase 3: Fechamentos

O que fecha uma pergunta sem resposta: prazo, `result` e encerramento da feature.

```
T11 → T12 → T13 → T14 → T15
```

### Phase 4: Broker no ar

As rotas no processo real, as tools e a paridade com o log.

```
T16 → T17 → T18
```

### Phase 5: Aba Perguntas

Os frames, os logs e a tela de leitura da aba.

```
T19 → T20 → T21 → T22 → T23 → T24 → T25 → T26
```

### Phase 6: Modal

O modal de resposta como função pura.

```
T27 → T28 → T29 → T30
```

### Phase 7: Teclas, escrita e processo

O redutor, o `POST` e o laço; legenda, demo e documentação.

```
T31 → T32 → T33 → T34 → T35 → T36 → T37 → T38
```

---

## Task Breakdown

### T1: Rótulo `Q-NN` no contrato

**What**: `qid` sai de `tui/feed.ts` e passa a ser exportado por `shared/contract.ts`; `feed.ts` e quem o importa de lá passam a importar do contrato.
**Where**: `broker/shared/contract.ts`
**Depends on**: None
**Reuses**: `qid` de `broker/tui/feed.ts:37`
**Requirement**: QST-20

**Done when**:

- [x] `qid(7)` é `Q-07`, `qid(12)` é `Q-12` e `qid(123)` é `Q-123`, com teste em `test/unit/contract.test.ts`
- [x] `tui/feed.ts` não define mais `qid`; nenhuma tela muda (`bun test test/unit/tui-frames.test.ts` passa)
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T2: Tabela `questions`

**What**: `openDatabase` cria `questions` com as doze colunas da fatia e exporta `QuestionRow`.
**Where**: `broker/db.ts`
**Depends on**: T1
**Reuses**: `CREATE TABLE IF NOT EXISTS` das outras tabelas
**Requirement**: QST-42

**Done when**:

- [x] `PRAGMA table_info(questions)` dá exatamente `id`, `feature_id`, `ticket_ref`, `asked_by`, `holder`, `blocking`, `default_answer`, `timeout_s`, `deadline_ts`, `status`, `merged_into`, `answer_seq`, com `id` como chave primária
- [x] Um banco em arquivo criado sem a tabela, com uma linha em `features` e eventos, é reaberto por `openDatabase`: a tabela existe e as linhas e os eventos são os mesmos
- [x] Testes em `test/unit/db.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T3: `question_id` e destinatários explícitos no log

**What**: `NewRecord` ganha `question_id` (coluna de `events`) e `recipients` (entregas explícitas no lugar da regra por kind).
**Where**: `broker/log.ts`
**Depends on**: T2
**Reuses**: `write` e `appendEvent`
**Requirement**: QST-03, QST-50

**Done when**:

- [x] Um `record` com `question_id` preenche a coluna, e `history({ question_id })` o devolve
- [x] Com `recipients: ["leader", "mother"]` há uma entrega pendente por nome; com `recipients: []` nenhuma, mesmo num kind de `DELIVERED`; sem `recipients` vale a regra de antes (teste de regressão com `task` e com `feature_opened`)
- [x] Evento e entregas na mesma transação: uma entrega que falha (nome repetido em `recipients`) não deixa o evento
- [x] Testes em `test/unit/log.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T4: `questions()` com status, texto e encerramento

**What**: `Question` ganha `text`, `why`, `options`, `timeout_s`, `status`, `answer_seq`, `answered_by`, `closed_ts` e `absorbed`, e `questions()` passa a ler o `feature_closed`.
**Where**: `broker/shared/derive.ts`
**Depends on**: T3
**Reuses**: `questions` atual; a caminhada de mescla já existe
**Requirement**: QST-46, QST-47, QST-49

**Done when**:

- [x] Um teste por regra de `status` de QST-46, na ordem dela, e um para a precedência entre duas que valem ao mesmo tempo (mesclada com `answer` próprio; mesclada cujo destino fecha depois do `feature_closed`)
- [x] Cadeia de três mescladas: as duas de cima herdam `status` e `answer_seq` da última
- [x] `open` é falso em todo `status` que não é `open`
- [x] `text` é o `body` do primeiro `question`, e o `summary` quando o `body` é vazio, mesmo que uma escalação traga outro `body`; `timeout_s` e a chegada vêm do primeiro `question` para `human`
- [x] `closed_ts` é o `ts` do `answer` próprio, ou o do `question_merged` sem ele; `answered_by` é o `from` do `answer`; `absorbed` tem os ids mesclados direto nela, em ordem
- [x] Os testes de `questions` que já existiam passam sem mudar nenhum valor esperado; o `toEqual` de objeto inteiro de `TUI-06` ganha as chaves dos campos novos; testes novos em `test/unit/derive.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T5: Dívida de `answer` em `owed()`

**What**: `owed()` devolve `{ owes: "answer", question_id, seq }` para cada pergunta aberta de que o nome é holder, e `squad` deixa de somá-la por fora.
**Where**: `broker/shared/derive.ts`
**Depends on**: T4
**Reuses**: `owed`, `squad`, `createState`
**Requirement**: QST-51

**Done when**:

- [x] `/state` de um holder tem o item, com o `seq` do `question` mais recente, na ordem de `seq` com os outros itens; a pergunta fechada, a mesclada e a de outro holder não aparecem (testes em `test/unit/state.test.ts` e `test/unit/derive.test.ts`)
- [x] `test/unit/derive-squad.test.ts` passa sem mudança de expectativa: `stalled` por pergunta continua igual
- [x] Gate build passa

**Tests**: unit
**Gate**: build

---

### T6: `/ask`

**What**: `createQuestion(db, log, token, now)` com `ask`, e o `setup` dos testes de unidade passa a criar o módulo.
**Where**: `broker/question.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `send.ts` (ordem das recusas, `no`), `feature.ts` (forma do módulo), `log.record`
**Requirement**: QST-01, QST-02, QST-03, QST-04, QST-05, QST-06, QST-07, QST-08, QST-09, QST-10, QST-12, QST-94

**Done when**:

- [x] Um teste por AC de QST-01 a QST-10, com a linha de `questions`, o evento como gravado e as entregas comparados por inteiro
- [x] QST-07: 3 opções aceitas e 4 recusadas, com o literal 3; QST-06: 80 caracteres aceitos e 81 recusados; QST-04: 240000 sem `timeout_s`, com o literal
- [x] QST-10: uma chamada que falha em duas regras responde a primeira, para cada par vizinho da ordem
- [x] QST-12: com a gravação da entrega forçada a falhar, não fica linha, evento nem entrega
- [x] QST-94: pergunta a um peer que não está registrado fica gravada com a entrega pendente
- [x] `test/unit/helpers.ts` expõe `question` em `setup()`; testes em `test/unit/question-ask.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T7: `/escalate`

**What**: `escalate`: novo `question` com o mesmo id para o nível de cima, com os campos do primeiro.
**Where**: `broker/question.ts`
**Depends on**: T6
**Reuses**: `log.history({ question_id })`, `NEXT`
**Requirement**: QST-13, QST-14, QST-15, QST-16, QST-17, QST-18, QST-19, QST-95

**Done when**:

- [x] worker → leader → mother → human: três `question` com o mesmo id; `asked_by`, `blocking`, `why`, `options`, `default`, `timeout_s` e `ticket_ref` iguais aos do primeiro em cada um
- [x] `summary` e `body` ausentes vêm do `question` anterior; enviados, substituem só naquele evento
- [x] `deadline_ts` nulo enquanto o holder é agente, e igual ao `ts` do evento para `human` mais `timeout_s` vezes 1000 (ou 240000) na não-bloqueante; nulo na bloqueante
- [x] A ordem de recusas de QST-16, par a par; `refused` com `attempted_kind` `question`
- [x] QST-95: o holder sai do broker e a pergunta continua `open` com o mesmo holder
- [x] Testes em `test/unit/question-escalate.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T8: `/answer` do holder

**What**: `answer` e a função interna `resolve`, que fecha uma pergunta por `answer` numa transação.
**Where**: `broker/question.ts`
**Depends on**: T7
**Reuses**: `qid`, `SUMMARY_MAX`, `NewRecord.recipients`
**Requirement**: QST-09, QST-20, QST-21, QST-22, QST-23, QST-38

**Done when**:

- [x] O `answer` gravado é comparado por inteiro: `from`, `to` igual ao `asked_by`, `summary` `Q-NN: <resposta>` cortado em 80, `body`, `ticket_ref`, coluna e `data`
- [x] Entrega só para o `asked_by`; nenhuma quando quem responde é o próprio `asked_by` de uma mesclada (coberto em T10) nem para o autor
- [x] A ordem de recusas de QST-22, par a par; `answer` só com espaços é `missing_field`
- [x] QST-38: a segunda resposta à mesma pergunta recebe `question_closed` e o log tem um só `answer` do `question_id`
- [x] Testes em `test/unit/question-answer.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T9: `/answer` do dev

**What**: `answerAsHuman`: a resposta com a credencial humana, entregue também à mother.
**Where**: `broker/question.ts`
**Depends on**: T8
**Reuses**: `permission.decision` (token primeiro, sem `refused`)
**Requirement**: QST-24, QST-25, QST-26, QST-27, QST-28

**Done when**:

- [x] `human → asked_by [answer]` com `resolved_by` `human`; entregas para o `asked_by` e para `mother`, uma só quando o `asked_by` é a mother
- [x] Token errado: `invalid_token` antes de qualquer outra regra, mesmo com `question_id` inválido, e o log não ganha evento
- [x] Holder agente: `not_holder`; pergunta fechada: `question_closed`; nenhuma recusa grava `refused`
- [x] Testes em `test/unit/question-human.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T10: `/merge-question` e as mescladas

**What**: `merge`, e `resolve` passa a fechar e a avisar as mescladas da pergunta respondida.
**Where**: `broker/question.ts`
**Depends on**: T9
**Reuses**: `resolve` de T8; consulta recursiva sobre `merged_into`
**Requirement**: QST-29, QST-30, QST-31, QST-32, QST-92, QST-93

**Done when**:

- [x] A ordem de recusas de QST-29, par a par, com `attempted_kind` `question_merged`
- [x] O `question_merged` gravado é comparado por inteiro; a linha fica `merged` com `merged_into`; nenhuma entrega
- [x] Resposta à de destino: a mesclada fica com o mesmo status e `answer_seq`, e o `asked_by` dela recebe a entrega
- [x] QST-92: cadeia de três; QST-93: `asked_by` repetido e `asked_by` igual ao autor recebem uma entrega ou nenhuma
- [x] Responder, escalar ou mesclar uma pergunta `merged` responde `question_closed`
- [x] Testes em `test/unit/question-merge.test.ts`; gate build passa

**Tests**: unit
**Gate**: build

---

### T11: Prazo

**What**: `expire()`: fecha por `timeout_default` toda pergunta `open` de prazo vencido.
**Where**: `broker/question.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `resolve`
**Requirement**: QST-19, QST-33, QST-35, QST-40, QST-41

**Done when**:

- [x] No instante `deadline_ts - 1` nada é gravado; em `deadline_ts` o `answer` de `broker` é gravado, comparado por inteiro, e a linha fica `defaulted`
- [x] Pergunta bloqueante, pergunta com holder agente e pergunta `merged` não fecham, com o relógio um dia adiante
- [x] QST-41: `expire()` e `answerAsHuman` no mesmo instante, nas duas ordens: um só `answer`, e quem chega depois recebe `question_closed` ou não grava
- [x] QST-35: um módulo novo criado sobre o mesmo banco fecha a vencida na primeira `expire()` e mantém o `deadline_ts` gravado da que ainda não venceu
- [x] As mescladas de uma pergunta que vence fecham com ela
- [x] Testes em `test/unit/question-expire.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T12: Default pelo `result`

**What**: `delivered(worker, ticket_ref)`: fecha por `result_default` as não-bloqueantes do worker naquele ticket, abertas ou mescladas.
**Where**: `broker/question.ts`
**Depends on**: T11
**Reuses**: `resolve`
**Requirement**: QST-36, QST-37, QST-39

**Done when**:

- [x] Duas perguntas do mesmo worker e ticket fecham em ordem crescente de id, cada uma com o seu `default_answer`
- [x] QST-37: a mesclada fecha sozinha, a de destino continua `open`, e a resposta posterior à de destino não entrega nada ao `asked_by` dela nem muda a linha dela; as mescladas da própria mesclada a acompanham
- [x] QST-39: bloqueante do mesmo ticket, não-bloqueante de outro ticket, sem `ticket_ref` e de outro worker continuam `open`
- [x] Testes em `test/unit/question-result.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T13: `result` chama o default

**What**: `createSend(log, afterResult?)`: o `result` de um worker chama `afterResult` dentro da sua transação, depois do `unblocked`; o `setup` dos testes liga `question.delivered`.
**Where**: `broker/send.ts`
**Depends on**: T12
**Reuses**: A transação de `send` que já grava o `unblocked`
**Requirement**: QST-36, QST-39

**Done when**:

- [x] `/send` de um `result` de worker bloqueado com uma não-bloqueante aberta grava, nesta ordem de `seq`: `result`, `unblocked`, `answer` (L-001: o teste falha se dois deles trocam de lugar)
- [x] O `result` do leader para a mother não fecha pergunta alguma
- [x] Se `afterResult` lança, o `result` não fica gravado
- [x] Testes em `test/unit/send-result.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T14: Encerramento da feature fecha as perguntas

**What**: `log.close` põe as perguntas `open` e `merged` da feature em `defaulted` ou `discarded`, na transação do `feature_closed`.
**Where**: `broker/log.ts`
**Depends on**: T13
**Reuses**: `close`
**Requirement**: QST-43, QST-44

**Done when**:

- [x] Com `delivered` e com `abandoned`: a pergunta com default fica `defaulted`, a sem default `discarded`, as duas com `answer_seq` nulo; a `answered` não muda; nenhum `answer` é gravado
- [x] Depois do encerramento, `/answer`, `/escalate` e `/merge-question` respondem `question_closed`, e `expire()` com o relógio adiante não grava nada
- [x] A pergunta de uma feature anterior, já fechada, não é tocada pelo encerramento da seguinte
- [x] Testes em `test/unit/question-close.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T15: `/send` aponta a rota das perguntas

**What**: `/send` com `kind` `question`, `answer` ou `question_merged` responde `invalid_kind` com a rota no `hint`.
**Where**: `broker/send.ts`
**Depends on**: T14
**Reuses**: `ROUTE_OF`
**Requirement**: QST-11

**Done when**:

- [x] O `hint` de cada um dos três kinds nomeia `/ask`, `/answer` e `/merge-question`; teste em `test/unit/send.test.ts`
- [x] Gate build passa

**Tests**: unit
**Gate**: build

---

### T16: Rotas e conferência de prazos no broker

**What**: `broker.ts` atende `/ask`, `/escalate`, `/merge-question` e `/answer`, confere os prazos antes de servir e a cada 1000 ms.
**Where**: `broker/broker.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: O despacho de `/permission-decision`; `test/integration/helpers.ts`
**Requirement**: QST-12, QST-26, QST-28, QST-34, QST-35

**Done when**:

- [x] Broker real com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários: worker pergunta, leader e mother escalam, `POST /answer` com o token do arquivo devolve a resposta ao worker no polling
- [x] `/answer` sem `human_token` e com `id` desconhecido responde `unknown_peer`; com `human_token` errado e `id` registrado responde `invalid_token` e o log não muda
- [x] Não-bloqueante com `timeout_s` 1 que chega ao dev: em até 3 s o log tem o `answer` de `broker`
- [x] Broker derrubado com uma pergunta de prazo vencido no banco e relançado: o `answer` de default está em `GET /events` na primeira leitura
- [x] Testes em `test/integration/question.test.ts`; gate full passa

**Tests**: integration
**Gate**: full

---

### T17: Tools de pergunta

**What**: `ask`, `answer`, `escalate` e `merge_question`, por papel, com a rota de cada uma.
**Where**: `broker/tools.ts`
**Depends on**: T16
**Reuses**: `OF_ROLE`, `ROUTE_OF`; o despacho de `server.ts`
**Requirement**: QST-52, QST-53, QST-54

**Done when**:

- [x] `toolsFor` de cada papel tem exatamente as tools de QST-52: o judge tem `ask` e não tem `answer`, `escalate` nem `merge_question`; só a mother tem `merge_question` (`test/unit/tools.test.ts`)
- [x] Dois clientes MCP reais, worker-1 e leader: `ask` devolve `question_id` e `seq`; o leader recebe o push com `summary`, `body`, `why` e `kind`, `seq`, `from` em `meta`; `answer` do leader chega ao worker-1 como push; uma recusa devolve `error` e `hint` (`test/integration/server-question.test.ts`)
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

### T18: Paridade entre a tabela e o log

**What**: Um teste que gera sequências de chamadas e compara `questions` com `questions()` de cada feature.
**Where**: `broker/test/unit/question-replay.test.ts`
**Depends on**: T17
**Reuses**: `setup`; `test/unit/replay.test.ts` como modelo
**Requirement**: QST-45, QST-48

**Done when**:

- [x] Gerador com semente fixa: ao menos 200 sequências de 40 passos entre `ask`, `escalate`, `answer`, `answerAsHuman`, `merge`, `expire` com o relógio avançando, `send` de `task` e de `result`, `close` e `open` de feature, com entradas válidas e inválidas
- [x] Depois de cada passo, para cada feature: os dez campos de QST-48 de cada linha são os de `questions()` sobre os eventos daquela feature, e não há pergunta em um lado só
- [x] Depois de cada passo o número de linhas de `questions` não diminui (QST-45), e nenhum `question_id` tem dois `answer`
- [x] Uma falha imprime a semente e os passos; gate build passa

**Tests**: unit
**Gate**: build

---

### T19: Frames de Question extraídos

**What**: Os frames 04, 05, 06, 07, 20a e 20b em texto, pela ferramenta de extração.
**Where**: `broker/test/frames/04.txt`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `test/frames/extract.ts` sobre `Squad TUI.dc.html`
**Requirement**: QST-90

**Done when**:

- [x] `broker/test/frames/` ganha `04.txt`, `05.txt`, `06.txt`, `07.txt`, `20a.txt` e `20b.txt`, como a ferramenta os escreve, com 40 linhas cada
- [x] `git status --porcelain broker/test/frames` só mostra os seis arquivos novos: os 41 que existiam não mudam
- [x] `test/unit/tui-glyphs.test.ts` passa a contar 47 frames, e TUI-59 vale para os seis novos
- [x] Gate build passa

**Tests**: none
**Gate**: build

---

### T20: Estado da aba e do modal

**What**: `Ui` ganha `questions` em `screen`, `question`, `qfocus`, `historyOffset`, `modal` e `send`; `Modal` é exportado; `START` e `frameView` ganham os valores iniciais.
**Where**: `broker/tui/view.ts`
**Depends on**: T19
**Reuses**: `Ui`, `START` de `tui/keys.ts`
**Requirement**: QST-64

**Done when**:

- [x] `tsc` passa com os campos novos em `START`, em `frameView` e em todo teste que constrói um `Ui`
- [x] Nenhuma tela muda: gate build passa com a mesma contagem de testes

**Tests**: none
**Gate**: build

---

### T21: Logs dos frames de Question

**What**: `MAIN` e `ERR_X` ganham `body`, `why` e `options` nas perguntas, como `QS` do protótipo; `FrameLog` ganha `ui`; `LOGS` ganha os seis frames.
**Where**: `broker/test/frames/logs.ts`
**Depends on**: T20
**Reuses**: `QS`, `HMAIN`, `HFIN`, `TXT06`, `TXT07` do protótipo; `frameView`
**Requirement**: QST-69, QST-87

**Done when**:

- [x] Cada pergunta de `QS` e de `H05` a `H12` tem no primeiro `question` do log o texto do protótipo como `body`; Q-07, Q-08 e Q-09 têm `why`, e Q-07 e Q-09 as `options`
- [x] `LOGS` tem `04`, `05`, `06`, `07` e `20b` sobre o cenário principal (20b com o relógio em 14:35:17 e os dois primeiros eventos de `FINAL`) e `20a` sobre o cenário de erro, cada um com a seleção e o `modal` do frame em `ui`
- [x] `bun test test/unit/tui-frames.test.ts` passa: os 41 frames de leitura são os mesmos, sem desvio novo
- [x] Gate build passa

**Tests**: none
**Gate**: build

---

### T22: Perguntas da tela

**What**: `waiting`, `resolved`, `effect`, `outcome` e `left`.
**Where**: `broker/tui/asked.ts`
**Depends on**: T21
**Reuses**: `label`, `SQUAD`, `Question`
**Requirement**: QST-55, QST-59, QST-60, QST-61, QST-98

**Done when**:

- [x] `waiting`: bloqueantes da chegada mais antiga para a mais recente, depois não-bloqueantes do prazo mais próximo para o mais distante; pergunta com holder agente, fechada ou mesclada fica fora
- [x] `resolved`: toda pergunta da feature que não está `open`, da resolução mais recente para a mais antiga
- [x] `effect`: os quatro textos de QST-59, comparados por inteiro
- [x] `outcome`: as cinco linhas de QST-61, comparadas por inteiro, inclusive a mesclada cuja de destino já fechou e a mesclada fechada pelo próprio `result`
- [x] `left` nunca é negativo: prazo passado dá 0
- [x] Testes em `test/unit/tui-asked.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T23: Tela de perguntas: a lista

**What**: `questions(view)` com o chrome da aba, o painel da lista e o estado vazio.
**Where**: `broker/tui/screens/questions.ts`
**Depends on**: T22
**Reuses**: `rQs` do protótipo; `chrome`, `stats`, `waiting`
**Requirement**: QST-55, QST-56, QST-57, QST-64, QST-96, QST-97

**Done when**:

- [x] As linhas 2 a 25, colunas 0 a 59, do log do frame 04 são as do frame, e as do log do frame 20b as do estado vazio
- [x] A aba `4 perguntas` está destacada e a linha 39 é a de QST-64
- [x] QST-96: um texto de 300 caracteres e uma opção de 100 não escrevem fora da caixa
- [x] QST-97: com sete perguntas abertas, a selecionada está sempre desenhada inteira, para a primeira, a do meio e a última
- [x] Testes em `test/unit/tui-questions.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T24: Tela de perguntas: o detalhe

**What**: O painel direito da selecionada, e o do estado vazio.
**Where**: `broker/tui/screens/questions.ts`
**Depends on**: T23
**Reuses**: `qDetailRows` do protótipo; `effect`
**Requirement**: QST-58, QST-59

**Done when**:

- [x] As linhas 2 a 25, colunas 60 a 119, do log do frame 04 com a Q-07 selecionada são as do frame, a não ser onde a spec dá outro texto
- [x] Com a Q-08 selecionada: `timeout 3:08`, `(segue com o default)`, a linha `default logo da 89  · aplicado em 3:08 sem resposta` e o efeito de não-bloqueante
- [x] Pergunta sem `ticket_ref`: as linhas `ticket` e `thread` não quebram a tela e o efeito diz `o trabalho`
- [x] Testes em `test/unit/tui-questions.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T25: Tela de perguntas: o histórico

**What**: O painel de baixo, com o deslocamento e a borda do painel em foco.
**Where**: `broker/tui/screens/questions.ts`
**Depends on**: T24
**Reuses**: `histRow` do protótipo; `resolved`, `outcome`
**Requirement**: QST-60, QST-61, QST-62, QST-63

**Done when**:

- [ ] Com 5 resolvidas a tela mostra as 5; com 6, mostra 4 e `+2 mais antigas · h e j/k para rolar`; com `historyOffset` 1, as 4 seguintes e `+1 mais antigas`
- [ ] O título diz `histórico · <n> resolvidas` com o total, não o que está visível
- [ ] Com `qfocus` `history` a borda do histórico é branca e a da lista cinza, e o contrário com `list` (teste de cor das células da borda)
- [ ] Testes em `test/unit/tui-questions.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T26: Frame 04 no teste de frames

**What**: O frame 04 entra no teste de frames, com os desvios D1 e D2 que a spec explica.
**Where**: `broker/test/frames/deviations.ts`
**Depends on**: T25
**Reuses**: `d`, `status`, `footer` e os motivos já escritos para o cenário principal
**Requirement**: QST-69, QST-89

**Done when**:

- [ ] `test/unit/tui-frames.test.ts` desenha o frame 04 com `questions` e compara as 40 linhas
- [ ] Todo desvio do frame 04 tem classe D1 ou D2 e um motivo que cita a spec ou o design; nenhum é D3
- [ ] O histórico tem a pergunta do leader respondida pela mother às 14:19:05, e o desvio diz que o protótipo a deixa de fora
- [ ] Gate build passa

**Tests**: unit
**Gate**: build

---

### T27: Modal: contexto e modo escolha

**What**: `answer(g, view)`: escurece a tela e desenha o modal com o contexto, a pergunta, as opções e o efeito.
**Where**: `broker/tui/screens/answer.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `qModal` e `drawModal` do protótipo; `effect`, `drawKeys`
**Requirement**: QST-70, QST-71

**Done when**:

- [ ] Título, ordem das linhas e rodapé de QST-70 e QST-71 para uma bloqueante com 3 opções e para uma com 2: a linha `outra resposta…` é a de número n+1 e o rodapé diz `1-4` ou `1-3`
- [ ] A linha selecionada tem `▶`; fora do modal, toda célula da tela de baixo é cinza
- [ ] A caixa tem 82 colunas a partir da coluna 19 e fica centrada na altura para qualquer número de linhas de `por quê`
- [ ] Testes em `test/unit/tui-answer.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T28: Modal: modo texto

**What**: O campo de uma linha e o expandido, o contador, a linha do default e o aviso fixo.
**Where**: `broker/tui/screens/answer.ts`
**Depends on**: T27
**Reuses**: `drawInput` do protótipo; `left`, `mmss`
**Requirement**: QST-73, QST-75, QST-96, QST-98

**Done when**:

- [ ] Campo de 3 linhas e de 8 linhas, com `█` depois do texto e ` <n> chars ` na borda de baixo, para 0, 40 e 184 caracteres
- [ ] O aviso `⚠ a resposta fica gravada no log e não pode ser apagada` está logo abaixo do campo nos dois tamanhos
- [ ] Texto maior que a linha: `…` e o fim do texto; expandido com mais de 6 linhas: as 6 últimas
- [ ] Não-bloqueante: `default <default>  · aplicado em m:ss se você não responder`; bloqueante: sem a linha; prazo passado: `timeout 0:00` no título
- [ ] Rodapé de QST-73, com `recolher` quando expandido
- [ ] Testes em `test/unit/tui-answer.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T29: Modal: resposta recusada

**What**: O estado recusado: a borda vermelha, a linha do default aplicado, a linha da recusa e o rodapé `esc fechar`.
**Where**: `broker/tui/screens/answer.ts`
**Depends on**: T28
**Reuses**: O ramo `m.refused` de `qModal`
**Requirement**: QST-80

**Done when**:

- [ ] Com default: `default <default>  · aplicado (o prazo venceu)` e `✗ recusada pelo broker: Q-NN já fechada · default aplicado: <default>` abaixo do aviso fixo
- [ ] Sem default: `✗ recusada pelo broker: Q-NN já fechada`, sem a linha do default
- [ ] A borda do campo é vermelha e a linha 39 é só `esc fechar`
- [ ] Uma pergunta de opções recusada é desenhada no modo texto com o texto da opção no campo
- [ ] Testes em `test/unit/tui-answer.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T30: Frames 05, 06, 07, 20a e 20b no teste de frames

**What**: Os cinco frames de modal entram no teste de frames, com os desvios D1 e D2.
**Where**: `broker/test/frames/deviations.ts`
**Depends on**: T29
**Reuses**: Os desvios do frame 04 e do frame 10
**Requirement**: QST-87, QST-89

**Done when**:

- [ ] `test/unit/tui-frames.test.ts` desenha cada um com `questions` e `answer` por cima e compara as 40 linhas
- [ ] 20a: o efeito escrito à mão da Q-09 é desvio D2, e o selo da linha 1 segue a regra de selos da TUI leitura (D1, como no frame 10)
- [ ] Nenhum desvio dos cinco é D3
- [ ] Gate build passa

**Tests**: unit
**Gate**: build

---

### T31: Teclas da aba

**What**: `4`, `esc`, `h`, `j`/`k` na lista e no histórico, `b` e `enter` sem modal aberto.
**Where**: `broker/tui/keys.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `press`; `waiting`, `resolved`
**Requirement**: QST-63, QST-64, QST-65, QST-66, QST-67, QST-91

**Done when**:

- [ ] `4` abre a aba de qualquer tela e `esc` volta à principal
- [ ] `j`/`k` e as setas movem a seleção na lista sem passar das pontas; com o foco no histórico deslocam uma pergunta, sem passar do começo nem deixar menos de 4 visíveis
- [ ] `b`: de fora abre a aba na primeira bloqueante; na aba vai à seguinte e volta à primeira; sem bloqueante avisa `nenhuma bloqueante` por 4 s e não troca de tela
- [ ] `enter` no feed sobre o `question` de uma pergunta aberta com o dev abre a aba com ela selecionada e o modal; sobre outra linha abre o thread; na aba abre o modal da selecionada, e não faz nada sem pergunta
- [ ] `g` e `x` continuam avisando `chega com a fatia Gate`; o texto `chega com a fatia Question` não existe mais no código
- [ ] Testes em `test/unit/tui-keys.test.ts`, com os de TUI-63 e de `b` atualizados para as regras novas
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T32: Teclas do modal

**What**: O ramo do modal em `press`, nos dois modos, e `keysOf` para um bloco de entrada.
**Where**: `broker/tui/keys.ts`
**Depends on**: T31
**Reuses**: `textKeys` e o ramo `s.modal` de `onKey` do protótipo
**Requirement**: QST-72, QST-74, QST-76, QST-78, QST-79, QST-85

**Done when**:

- [ ] Modo escolha: dígito, `j`/`k`, setas e `enter` como em QST-72; `enter` em `outra resposta…` passa ao modo texto com o campo vazio
- [ ] Modo texto: imprimível entra no fim (inclusive `q`, dígitos, `b`, `h`, `g`, `x`, `p`, `t`, `?` e letras acentuadas), `\x7f` e `\x08` apagam o último, `\x15` limpa, `\x05` alterna o tamanho; uma seta não muda o texto
- [ ] `enter` com texto: `send` com `answer` sem os espaços das pontas e `modal.sending` verdadeiro; com o campo vazio ou só espaços, nada muda
- [ ] QST-79: com `modal.sending` nenhuma tecla muda o `Ui`, a não ser `ctrl+c`, que sai
- [ ] QST-85: `esc` fecha o modal sem `send` e mantém a seleção
- [ ] `keysOf`: num bloco de mais de uma tecla no modo texto, `\r` e `\n` viram espaço; num bloco de uma tecla só, `\r` continua `\r`
- [ ] Testes em `test/unit/tui-keys.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T33: Resultado do envio e sincronia com a leitura

**What**: `settle(ui, result, view)` e `sync(ui, view)`, e o ramo de `press` para o broker sem responder.
**Where**: `broker/tui/keys.ts`
**Depends on**: T32
**Reuses**: `toast`
**Requirement**: QST-68, QST-77, QST-80, QST-81, QST-82, QST-84

**Done when**:

- [ ] `settle` com `{ ok: true }`: modal fechado e aviso `✓ Q-NN respondida` em verde por 4 s; com `question_closed`: `refused` verdadeiro; com outro erro: modal no modo de antes, com o texto, e aviso vermelho `✗ resposta não enviada · <erro>`; `send` nulo nos três
- [ ] `sync`: a pergunta do modal fechou sem recusa → modal fechado e aviso `⟳ default aplicado` (default) ou `Q-NN fechada`; com `refused` o modal fica
- [ ] `sync`: a seleção segue o id quando a ordem muda, e vai para a primeira da lista quando a selecionada sai
- [ ] QST-84: com `view.down`, `enter` sobre pergunta avisa `broker desconectado · responder desabilitado` e não abre modal; com modal aberto, nenhuma tecla o muda
- [ ] Testes em `test/unit/tui-keys.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T34: Escrita

**What**: `createWriter`: o `POST /answer` da TUI.
**Where**: `broker/tui/writer.ts`
**Depends on**: T33
**Reuses**: `createReader` (tempo esgotado próprio, `fetch` injetado)
**Requirement**: QST-81, QST-86

**Done when**:

- [ ] O pedido é `POST <url>/answer` com `{ human_token, question_id, answer }` em JSON, e nenhum outro caminho existe no módulo
- [ ] `{ ok: true, seq }` → `{ ok: true }`; `{ ok: false, error }` → o `error`; status 500, corpo que não é JSON, corpo sem `ok` e `fetch` que rejeita → `broker não respondeu`
- [ ] Sem resposta em 2000 ms (literal, com relógio falso) → `broker não respondeu`
- [ ] Testes em `test/unit/tui-writer.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T35: A TUI escreve

**What**: `tui.ts`: a tela de perguntas e o modal no desenho, `io.token`, o envio depois das teclas e `sync` depois de cada leitura.
**Where**: `broker/tui.ts`
**Depends on**: T34
**Reuses**: `start`, `dispatch`, `tick`; `tokenPath`
**Requirement**: QST-76, QST-79, QST-83, QST-84, QST-86

**Done when**:

- [ ] Laço com `fetch` falso: `enter` no modal faz um `POST /answer` com o token de `io.token()`; um segundo `enter` antes da resposta não faz outro
- [ ] Token nulo: nenhum `POST`, modal mantido e aviso `✗ credencial humana não encontrada`; o token não aparece em nenhuma escrita de `io.write`
- [ ] Toda chamada de `fetch` da TUI é `GET /events` ou `POST /answer` (QST-86), numa sessão que abre a aba, responde e sai
- [ ] Broker real: a TUI, alimentada por teclas, responde uma pergunta por opção e outra por texto, e recebe a recusa de uma já fechada; `GET /events` tem os dois `answer` de `human` (`test/integration/tui.test.ts`)
- [ ] Testes de unidade em `test/unit/tui-loop.test.ts`; gate full passa

**Tests**: integration
**Gate**: full

---

### T36: Legenda com as teclas de Question

**What**: As quatro linhas de Question voltam à legenda e saem da tabela de desvios.
**Where**: `broker/tui/screens/help.ts`
**Depends on**: T35
**Reuses**: `SHORTCUTS`; frame 11
**Requirement**: QST-88, QST-89, QST-91

**Done when**:

- [ ] As linhas `h           foco no histórico`, `modal de resposta`, `1–4 enter   escolher · enviar · esc cancela` e `ctrl+e · u  expandir o texto · limpar` são desenhadas onde o frame 11 as tem
- [ ] O desvio D3 do frame 11 fica só com as linhas de gate e de permissão, e o teste de TUI-49 lista só essas
- [ ] `DEVIATIONS` não tem desvio D3 para 04, 05, 06, 07, 20a e 20b, nem motivo que cite a fatia Question como tela por vir (teste)
- [ ] Testes em `test/unit/tui-frames.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T37: Demo responde

**What**: O servidor do demo aceita `POST /answer` e sobe a TUI com um arquivo de token temporário.
**Where**: `broker/tui/demo.ts`
**Depends on**: T36
**Reuses**: O servidor de `GET /events` do demo
**Requirement**: QST-69, QST-87

**Done when**:

- [ ] `bun tui/demo.ts 04`: `4` mostra a aba; responder a Q-07 acrescenta o `answer` ao log do demo e a pergunta vai para o histórico
- [ ] Uma pergunta que já tem `answer` no log do demo responde `question_closed`
- [ ] O demo não toca `SQUAD_DB` nem o arquivo de token do usuário
- [ ] Gate build passa

**Tests**: none
**Gate**: build

---

### T38: Documentação do broker

**What**: `broker/CLAUDE.md` descreve `question.ts`, a tabela, a tela de perguntas, o modal, o writer e o que mudou em `tui.ts` e `keys.ts`.
**Where**: `broker/CLAUDE.md`
**Depends on**: T37
**Reuses**: A seção Architecture
**Requirement**: QST-86

**Done when**:

- [ ] Cada arquivo novo tem a sua linha na seção Architecture, e as linhas de `log.ts`, `shared/derive.ts`, `tui.ts`, `tui/keys.ts` e `test/frames/` dizem o que mudou
- [ ] `tui.ts` deixa de ser descrita como um processo que só lê
- [ ] Gate build passa

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15
Phase 4:  T16 → T17 → T18
Phase 5:  T19 → T20 → T21 → T22 → T23 → T24 → T25 → T26
Phase 6:  T27 → T28 → T29 → T30
Phase 7:  T31 → T32 → T33 → T34 → T35 → T36 → T37 → T38
```

Lotes de execução (fases inteiras, perto de 7 tarefas por worker): fase 1; fase 2; fases 3 e 4; fase 5; fase 6; fase 7.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Rótulo `Q-NN` no contrato | 1 arquivo: `contract.ts` | ✅ Granular |
| T2: Tabela `questions` | 1 arquivo: `db.ts` | ✅ Granular |
| T3: `question_id` e destinatários explícitos no log | 1 arquivo: `log.ts` | ✅ Granular |
| T4: `questions()` com status, texto e encerramento | 1 arquivo: `derive.ts` | ✅ Granular |
| T5: Dívida de `answer` em `owed()` | 1 arquivo: `derive.ts` | ✅ Granular |
| T6: `/ask` | 1 arquivo: `question.ts` | ✅ Granular |
| T7: `/escalate` | 1 arquivo: `question.ts` | ✅ Granular |
| T8: `/answer` do holder | 1 arquivo: `question.ts` | ✅ Granular |
| T9: `/answer` do dev | 1 arquivo: `question.ts` | ✅ Granular |
| T10: `/merge-question` e as mescladas | 1 arquivo: `question.ts` | ✅ Granular |
| T11: Prazo | 1 arquivo: `question.ts` | ✅ Granular |
| T12: Default pelo `result` | 1 arquivo: `question.ts` | ✅ Granular |
| T13: `result` chama o default | 1 arquivo: `send.ts` | ✅ Granular |
| T14: Encerramento da feature fecha as perguntas | 1 arquivo: `log.ts` | ✅ Granular |
| T15: `/send` aponta a rota das perguntas | 1 arquivo: `send.ts` | ✅ Granular |
| T16: Rotas e conferência de prazos no broker | 1 arquivo: `broker.ts` | ✅ Granular |
| T17: Tools de pergunta | 1 arquivo: `tools.ts` | ✅ Granular |
| T18: Paridade entre a tabela e o log | 1 arquivo: `question-replay.test.ts` | ✅ Granular |
| T19: Frames de Question extraídos | 1 arquivo: `04.txt` | ✅ Granular |
| T20: Estado da aba e do modal | 1 arquivo: `view.ts` | ✅ Granular |
| T21: Logs dos frames de Question | 1 arquivo: `logs.ts` | ✅ Granular |
| T22: Perguntas da tela | 1 arquivo: `asked.ts` | ✅ Granular |
| T23: Tela de perguntas: a lista | 1 arquivo: `questions.ts` | ✅ Granular |
| T24: Tela de perguntas: o detalhe | 1 arquivo: `questions.ts` | ✅ Granular |
| T25: Tela de perguntas: o histórico | 1 arquivo: `questions.ts` | ✅ Granular |
| T26: Frame 04 no teste de frames | 1 arquivo: `deviations.ts` | ✅ Granular |
| T27: Modal: contexto e modo escolha | 1 arquivo: `answer.ts` | ✅ Granular |
| T28: Modal: modo texto | 1 arquivo: `answer.ts` | ✅ Granular |
| T29: Modal: resposta recusada | 1 arquivo: `answer.ts` | ✅ Granular |
| T30: Frames 05, 06, 07, 20a e 20b no teste de frames | 1 arquivo: `deviations.ts` | ✅ Granular |
| T31: Teclas da aba | 1 arquivo: `keys.ts` | ✅ Granular |
| T32: Teclas do modal | 1 arquivo: `keys.ts` | ✅ Granular |
| T33: Resultado do envio e sincronia com a leitura | 1 arquivo: `keys.ts` | ✅ Granular |
| T34: Escrita | 1 arquivo: `writer.ts` | ✅ Granular |
| T35: A TUI escreve | 1 arquivo: `tui.ts` | ✅ Granular |
| T36: Legenda com as teclas de Question | 1 arquivo: `help.ts` | ✅ Granular |
| T37: Demo responde | 1 arquivo: `demo.ts` | ✅ Granular |
| T38: Documentação do broker | 1 arquivo: `CLAUDE.md` | ✅ Granular |

Três tarefas mexem também no `setup` dos testes (`test/unit/helpers.ts`) ou num importador: T1, T6 e T13. É a ligação do que a própria tarefa cria, e sem ela a tarefa não tem teste.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | None (a fase anterior inteira) | início da fase 2 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | None (a fase anterior inteira) | início da fase 3 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | None (a fase anterior inteira) | início da fase 4 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | None (a fase anterior inteira) | início da fase 5 | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |
| T21 | T20 | T20 → T21 | ✅ Match |
| T22 | T21 | T21 → T22 | ✅ Match |
| T23 | T22 | T22 → T23 | ✅ Match |
| T24 | T23 | T23 → T24 | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |
| T26 | T25 | T25 → T26 | ✅ Match |
| T27 | None (a fase anterior inteira) | início da fase 6 | ✅ Match |
| T28 | T27 | T27 → T28 | ✅ Match |
| T29 | T28 | T28 → T29 | ✅ Match |
| T30 | T29 | T29 → T30 | ✅ Match |
| T31 | None (a fase anterior inteira) | início da fase 7 | ✅ Match |
| T32 | T31 | T31 → T32 | ✅ Match |
| T33 | T32 | T32 → T33 | ✅ Match |
| T34 | T33 | T33 → T34 | ✅ Match |
| T35 | T34 | T34 → T35 | ✅ Match |
| T36 | T35 | T35 → T36 | ✅ Match |
| T37 | T36 | T36 → T37 | ✅ Match |
| T38 | T37 | T37 → T38 | ✅ Match |

A primeira tarefa de cada fase depende da fase anterior inteira, como nas fatias anteriores; nenhuma dependência aponta para a frente.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Rótulo `Q-NN` no contrato | Contrato | unit | unit | ✅ OK |
| T2: Tabela `questions` | Armazenamento | unit | unit | ✅ OK |
| T3: `question_id` e destinatários explícitos no log | Log | unit | unit | ✅ OK |
| T4: `questions()` com status, texto e encerramento | Derivação | unit | unit | ✅ OK |
| T5: Dívida de `answer` em `owed()` | Derivação | unit | unit | ✅ OK |
| T6: `/ask` | Rota | unit | unit | ✅ OK |
| T7: `/escalate` | Rota | unit | unit | ✅ OK |
| T8: `/answer` do holder | Rota | unit | unit | ✅ OK |
| T9: `/answer` do dev | Rota | unit | unit | ✅ OK |
| T10: `/merge-question` e as mescladas | Rota | unit | unit | ✅ OK |
| T11: Prazo | Rota | unit | unit | ✅ OK |
| T12: Default pelo `result` | Rota | unit | unit | ✅ OK |
| T13: `result` chama o default | Rota | unit | unit | ✅ OK |
| T14: Encerramento da feature fecha as perguntas | Log | unit | unit | ✅ OK |
| T15: `/send` aponta a rota das perguntas | Rota | unit | unit | ✅ OK |
| T16: Rotas e conferência de prazos no broker | Processo do broker | integration | integration | ✅ OK |
| T17: Tools de pergunta | Tools e servidor MCP | integration | integration | ✅ OK |
| T18: Paridade entre a tabela e o log | Rota | unit | unit | ✅ OK |
| T19: Frames de Question extraídos | Frames | none | none | ✅ OK |
| T20: Estado da aba e do modal | Tipos | none | none | ✅ OK |
| T21: Logs dos frames de Question | Frames | none | none | ✅ OK |
| T22: Perguntas da tela | Tela pura | unit | unit | ✅ OK |
| T23: Tela de perguntas: a lista | Tela pura | unit | unit | ✅ OK |
| T24: Tela de perguntas: o detalhe | Tela pura | unit | unit | ✅ OK |
| T25: Tela de perguntas: o histórico | Tela pura | unit | unit | ✅ OK |
| T26: Frame 04 no teste de frames | Tela pura | unit | unit | ✅ OK |
| T27: Modal: contexto e modo escolha | Tela pura | unit | unit | ✅ OK |
| T28: Modal: modo texto | Tela pura | unit | unit | ✅ OK |
| T29: Modal: resposta recusada | Tela pura | unit | unit | ✅ OK |
| T30: Frames 05, 06, 07, 20a e 20b no teste de frames | Tela pura | unit | unit | ✅ OK |
| T31: Teclas da aba | Processo da TUI | unit | unit | ✅ OK |
| T32: Teclas do modal | Processo da TUI | unit | unit | ✅ OK |
| T33: Resultado do envio e sincronia com a leitura | Processo da TUI | unit | unit | ✅ OK |
| T34: Escrita | Processo da TUI | unit | unit | ✅ OK |
| T35: A TUI escreve | Entrada da TUI | integration | integration | ✅ OK |
| T36: Legenda com as teclas de Question | Tela pura | unit | unit | ✅ OK |
| T37: Demo responde | Demo | none | none | ✅ OK |
| T38: Documentação do broker | Documentação | none | none | ✅ OK |
