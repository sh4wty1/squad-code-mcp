# Peer Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.design/squad-mvp.md`, fatia Peer (sem `design.md` próprio)
**Status**: In Progress (T15 a T20: correções da revisão do PR 2)

Todo o código fica em `broker/`; os comandos rodam de dentro dele. Mensagens de commit
seguem a convenção do repositório (frase imperativa em minúsculas, sem prefixo), não
Conventional Commits: é instrução do dono do repositório para esta fatia.

---

## Test Coverage Matrix

> Guidelines found: none - strong defaults applied. O upstream não tem testes; `package.json` já declara `bun test`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Regras do broker (`peers.ts`, `db.ts`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Configuração e git (`shared/config.ts`, `shared/git.ts`) | unit | 1:1 com os ACs | `broker/test/unit/*.test.ts` | `bun test test/unit` |
| Rotas HTTP (`broker.ts`) | integration | Toda rota: caminho feliz, recusa e 404, contra o processo real | `broker/test/integration/*.test.ts` | `bun test` |
| Servidor MCP (`server.ts`) | integration | Todo AC do handshake, com cliente MCP real por stdio | `broker/test/integration/*.test.ts` | `bun test` |
| CLI (`cli.ts`) | integration | `status` e `kill-broker` contra o processo real | `broker/test/integration/*.test.ts` | `bun test` |
| Tipos (`shared/types.ts`) | none | build gate only | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas só com teste de unidade | `bun test test/unit` |
| Full | Tarefas com teste de integração | `bun test` |
| Build | Fim de fase | `bun x tsc --noEmit && bun test` |

Não há linter configurado no upstream; o build gate é tipo mais testes.

---

## Execution Plan

### Phase 1: Regras do broker

```
T1 → T2 → T3 → T4
```

### Phase 2: Processos

```
T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 3: Revisão do PR 2

```
T14 → T15 → T16 → T17 → T18 → T19 → T20
```

---

## Task Breakdown

### T1: Configuração própria do fork

**What**: `port(env)`, `brokerUrl(env)` e `dbPath(env)` com os defaults do squad, sem depender de `HOME`.
**Where**: `broker/shared/config.ts`
**Depends on**: None
**Requirement**: PEER-19, PEER-20

**Done when**:

- [x] `dbPath({})` é `<os.homedir()>/.squad-code-mcp.db` e `dbPath({ SQUAD_DB })` devolve o valor da variável
- [x] `port({})` é 7900 e `port({ SQUAD_PORT: "7955" })` é 7955
- [x] Gate: `bun test test/unit` - 5 testes

**Tests**: unit
**Gate**: quick

---

### T2: Schema e gravação de evento

**What**: `openDatabase(path)` cria `peers` (com `name` e `role`, sem `tty` e `summary`) e `events`, sem `messages`; `appendEvent(db, e)` grava e devolve o `seq`.
**Where**: `broker/db.ts`
**Depends on**: T1
**Requirement**: PEER-15

**Done when**:

- [x] Dois eventos seguidos têm `seq` crescente e `ts` em epoch ms
- [x] `peers` tem exatamente as colunas da fatia; `messages` não existe
- [x] Gate: `bun test test/unit` - 9 testes

**Tests**: unit
**Gate**: quick

---

### T3: Registro com recusas

**What**: `register(body)` com as recusas na ordem da spec e `peer_joined` na mesma transação.
**Where**: `broker/peers.ts`
**Depends on**: T2
**Requirement**: PEER-01 a PEER-10, PEER-37 (hint)

**Done when**:

- [x] Cada AC de PEER-01 a PEER-10 tem um teste que confere o valor da spec
- [x] Toda recusa deixa `peers` e `events` com a mesma contagem e traz `hint` não vazio
- [x] Gate: `bun test test/unit` - 26 testes

**Tests**: unit
**Gate**: quick

---

### T4: Saída, limpeza, heartbeat e listagem

**What**: `unregister`, `cleanStale`, `heartbeat`, `listPeers` e `count`.
**Where**: `broker/peers.ts` (modify)
**Depends on**: T3
**Requirement**: PEER-11 a PEER-14, PEER-16 a PEER-18, PEER-21 (regra)

**Done when**:

- [x] Cada AC citado tem um teste que confere o valor da spec
- [x] A listagem não tem chave além de `name`, `role`, `online`
- [x] Gate: `bun x tsc --noEmit && bun test` - 36 testes

**Tests**: unit
**Gate**: build

---

### T5: Rotas HTTP do broker

**What**: `broker.ts` passa a usar `config`, `db` e `peers`; as rotas de mensagem e de resumo saem; a limpeza roda na subida e a cada 30 s.
**Where**: `broker/broker.ts`
**Depends on**: T4
**Requirement**: PEER-19 a PEER-23, PEER-37 (status 200), PEER-38

**Done when**:

- [x] Com o processo real: registro, recusa com status 200, heartbeat, listagem, unregister, health e 404 das rotas removidas
- [x] Sem `SQUAD_DB` e sem `HOME`, o banco nasce no diretório home do sistema
- [x] Gate: `bun test` - 49 testes

**Tests**: integration
**Gate**: full

---

### T6: Diretório git comum

**What**: `getGitRoot(cwd)` devolve o caminho absoluto do diretório git comum, ou nulo fora de um repositório.
**Where**: `broker/shared/git.ts`
**Depends on**: T5
**Requirement**: PEER-24, PEER-25

**Done when**:

- [x] Num repositório temporário, o valor do worktree é igual ao do checkout principal e é absoluto
- [x] Fora de um repositório, nulo
- [x] Gate: `bun test test/unit` - 2 testes novos

**Tests**: unit
**Gate**: quick

---

### T7: CLI no Windows

**What**: `cli.ts` fica com `status` e `kill-broker`; `kill-broker` acha o PID por `netstat` no Windows e por `lsof` nos demais.
**Where**: `broker/cli.ts`
**Depends on**: T6
**Requirement**: PEER-35, PEER-36

**Done when**:

- [x] `status` imprime `Broker: ok (0 peer(s) registered)` com o broker no ar
- [x] Depois de `kill-broker`, `/health` não responde
- [x] Gate: `bun test` - 53 testes

**Tests**: integration
**Gate**: full

---

### T8: Servidor MCP com ping e `ready`

**What**: `server.ts` não registra ao subir: empurra o ping, expõe `ready`, registra na resposta certa, troca as tools, sobe o broker destacado e chama `/unregister` na saída. `shared/summarize.ts` e `shared/types.ts` do upstream saem.
**Where**: `broker/server.ts`
**Depends on**: T7
**Requirement**: PEER-26 a PEER-34

**Done when**:

- [x] Cada AC de PEER-26 a PEER-34 tem um teste com cliente MCP real
- [x] O broker iniciado pelo servidor continua no ar depois que o servidor sai
- [x] Gate: `bun x tsc --noEmit && bun test` - 63 testes

**Tests**: integration
**Gate**: build

---

### T9: Correções da primeira verificação

**What**: Fecha o que o Verifier apontou em `validation.md`: rota desconhecida responde 404 antes de ler o corpo; corpo que não é objeto JSON vira recusa `missing_field`; o registro anterior de um PID só sai quando o novo é aceito; os intervalos de ping e de limpeza passam a ter default testado; os testes passam a fixar o endereço de escuta, a faixa do número do ping, a chamada de tool não listada e a atomicidade de peer e evento.
**Where**: `broker/broker.ts`
**Depends on**: T8
**Requirement**: PEER-09, PEER-20, PEER-23, PEER-27, PEER-28, PEER-33, PEER-38, PEER-39, PEER-40, PEER-41

**Done when**:

- [x] Cada lacuna numerada de 1 a 13 do relatório tem teste ou virou suposição registrada na spec
- [x] Gate: `bun x tsc --noEmit && bun test` - 78 testes

**Tests**: integration
**Gate**: build

---

### T10: Correções da segunda verificação

**What**: Testes que fixam a listagem pedida por um worker e o segundo heartbeat; `/register` recusa `pid` não positivo e `git_root` de tipo errado; o teste de PEER-41 leva o id certo.
**Where**: `broker/peers.ts`
**Depends on**: T9
**Requirement**: PEER-10, PEER-16, PEER-21, PEER-41

**Done when**:

- [x] As duas mutações sobreviventes da segunda rodada (N28 e N15) têm teste
- [x] Gate: `bun x tsc --noEmit && bun test` - 82 testes

**Tests**: unit
**Gate**: build

---

### T11: Correções da terceira verificação

**What**: `id` ausente ou que não é texto vale como desconhecido nas três rotas que o recebem; testes fixam isso e a ordem da limpeza em `/register`.
**Where**: `broker/broker.ts`
**Depends on**: T10
**Requirement**: PEER-03, PEER-04, PEER-10, PEER-12, PEER-18, PEER-21

**Done when**:

- [x] As mutações M11 e M12 da terceira rodada têm teste
- [x] Gate: `bun x tsc --noEmit && bun test` - 85 testes
- [ ] Verificação independente depois desta correção (a terceira rodada foi a última automática)

**Tests**: integration
**Gate**: build

---

### T12: `kill-broker` fora do Windows

**What**: `lsof` passa a listar só quem escuta na porta. Sem isso ele devolvia também todo cliente conectado, e o `kill-broker` encerrava a própria CLI e qualquer sessão com conexão aberta; no Linux a suíte matava o próprio `bun test`.
**Where**: `broker/cli.ts`
**Depends on**: T11
**Requirement**: PEER-35

**Done when**:

- [x] No Linux, o teste de PEER-35 e o de PEER-34 terminam e passam
- [x] Gate: `bun x tsc --noEmit && bun test` - 85 testes

**Tests**: integration
**Gate**: build

---

### T13: Correções da quarta verificação

**What**: As asserções que faltavam para os mutantes X5 e X1, e `ready` sem argumentos responde o erro normal de número errado em vez de um erro interno do JSON-RPC.
**Where**: `broker/server.ts`, `broker/test/`
**Depends on**: T12
**Requirement**: PEER-10, PEER-12, PEER-29

**Done when**:

- [x] `cwd: 5` e `cwd: { a: 1 }` são recusados com `missing_field` (X5)
- [x] A recusa `unknown_peer` de `/list-peers` traz `hint` não vazio (X1)
- [x] `ready` sem argumentos devolve `isError` e não registra
- [x] Gate: `bun x tsc --noEmit && bun test` - 85 testes

**Tests**: integration
**Gate**: build

---

### T14: Correções da quinta verificação

**What**: `kill-broker` procura quem escuta em `127.0.0.1` na porta, e não em qualquer endereço, e avisa quando não acha o processo. Testes que só discriminam fora do Windows: o broker iniciado pelo servidor lidera o próprio grupo de processos, o `/unregister` vem do fechamento da entrada padrão antes do `SIGTERM` do cliente, e um PID de outro usuário conta como vivo.
**Where**: `broker/cli.ts`, `broker/test/`
**Depends on**: T13
**Requirement**: PEER-14, PEER-33, PEER-34, PEER-35

**Done when**:

- [x] Os mutantes L6 (`detached`), L3 (handlers de stdin) e L2 (`EPERM`) da quinta rodada têm teste
- [x] `kill-broker` não sinaliza quem escuta na mesma porta em outro endereço
- [x] Gate: `bun x tsc --noEmit && bun test` - 86 testes no Linux (85 no Windows, um pulado)

**Tests**: integration
**Gate**: build

---

### T15: Peer vivo por PID e heartbeat (F1)

**What**: A limpeza também tira o peer cujo `last_seen` tem mais de 60 s, contados do maior entre `last_seen` e o instante em que o broker subiu ou voltou de uma pausa. Uma linha velha cujo PID passou a ser de outro processo deixa de prender a posição.
**Where**: `broker/peers.ts`, `broker/test/unit/presence.test.ts`, `broker/README.md`
**Depends on**: T14
**Requirement**: PEER-14, PEER-42, PEER-43

**Done when**:

- [x] Peer com PID vivo e sem heartbeat sai com `peer_left` `died` na limpeza depois de 60 s, e fica aos 60 s exatos
- [x] O papel de uma linha velha com PID vivo volta a aceitar registro depois de 60 s
- [x] Peer com `last_seen` velho fica quando o broker acabou de subir sobre o mesmo banco, e quando a limpeza anterior foi há mais de 60 s
- [x] Gate: `bun test test/unit` - 56 testes

**Tests**: unit
**Gate**: quick

---

### T16: `kill-broker` diz quando não parou o broker (F2)

**What**: Só a consulta a `/health` decide `Broker is not running.`. Falha ao achar ou sinalizar o processo imprime `Could not stop the broker: <motivo>. It is still running.` e sai com código 1.
**Where**: `broker/cli.ts`, `broker/test/integration/cli.test.ts`
**Depends on**: T15
**Requirement**: PEER-44

**Done when**:

- [x] Com o comando de busca fora do `PATH`, `kill-broker` sai com código 1, imprime a mensagem de PEER-44, não imprime `Broker is not running.` e `/health` continua respondendo
- [x] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T17: Teste do filtro de endereço do `kill-broker` (F3)

**What**: Um processo de isca escuta a porta do broker em `127.0.0.2`; `kill-broker` derruba o broker e a isca continua no ar.
**Where**: `broker/test/integration/cli.test.ts`
**Depends on**: T16
**Requirement**: PEER-45

**Done when**:

- [x] O teste falha com o filtro `@127.0.0.1` de `broker/cli.ts` revertido para `tcp:<porta>`
- [x] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T18: Testes de PEER-19 dizem o que conferem (F4)

**What**: Sai o teste de unidade "does not come from HOME", que não tinha como falhar. O teste de integração passa a se chamar pelo que confere: o banco fica no diretório home que o sistema informa.
**Where**: `broker/test/unit/config.test.ts`, `broker/test/integration/broker.test.ts`
**Depends on**: T17
**Requirement**: PEER-19

**Done when**:

- [x] PEER-19 continua com um teste de unidade do default e um de integração com o home trocado
- [x] Gate: `bun test`

**Tests**: integration
**Gate**: full

---

### T19: SDK do MCP em 1.32 (F6)

**What**: `@modelcontextprotocol/sdk` sai de 1.27.1, dentro da faixa de quatro advisories corrigidos em 1.31.0 e 1.32.0.
**Where**: `broker/package.json`, `broker/bun.lock`
**Depends on**: T18
**Requirement**: PEER-27, PEER-28, PEER-30

**Done when**:

- [x] O lockfile resolve o SDK em 1.32.0 ou mais novo
- [x] Os testes do ping pelo canal e do `ready` passam sem mudança
- [x] Gate: `bun x tsc --noEmit && bun test`

**Tests**: integration
**Gate**: build

---

### T20: README e CLAUDE.md do broker (F5, F7)

**What**: O README deixa de afirmar macOS, onde nada rodou. O `broker/CLAUDE.md` perde o texto do `bun init` sobre Redis, Postgres, React e HTML imports.
**Where**: `broker/README.md`, `broker/CLAUDE.md`
**Depends on**: T19
**Requirement**: PEER-35

**Done when**:

- [ ] O README lista Windows e Linux e diz que macOS não foi testado
- [ ] `broker/CLAUDE.md` termina na seção do Bun, sem as seções APIs, Testing e Frontend
- [ ] Gate: `bun x tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Configuração | unit | unit | ✅ |
| T2 | Regras do broker | unit | unit | ✅ |
| T3 | Regras do broker | unit | unit | ✅ |
| T4 | Regras do broker | unit | unit | ✅ |
| T5 | Rotas HTTP | integration | integration | ✅ |
| T6 | Configuração e git | unit | unit | ✅ |
| T7 | CLI | integration | integration | ✅ |
| T8 | Servidor MCP | integration | integration | ✅ |
| T9 | Rotas HTTP, regras, servidor MCP | integration | integration | ✅ |
| T10 | Regras do broker | unit | unit | ✅ |
| T11 | Rotas HTTP | integration | integration | ✅ |
| T12 | CLI | integration | integration | ✅ |
| T13 | Servidor MCP, rotas HTTP, regras | integration | integration | ✅ |
| T14 | CLI, servidor MCP, regras | integration | integration | ✅ |
| T15 | Regras do broker | unit | unit | ✅ |
| T16 | CLI | integration | integration | ✅ |
| T17 | CLI | integration | integration | ✅ |
| T18 | Configuração, rotas HTTP | unit, integration | integration | ✅ |
| T19 | Servidor MCP (dependência) | integration | integration | ✅ |
| T20 | Documentação | none | none | ✅ |
