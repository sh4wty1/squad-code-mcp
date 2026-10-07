# Peer Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.design/squad-mvp.md`, fatia Peer (sem `design.md` próprio)
**Status**: Done

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
T4 → T5 → T6 → T7 → T8 → T9
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
