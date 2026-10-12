# Papéis Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/papeis/design.md`
**Status**: Approved

Regras do repositório que valem para toda tarefa:

- Comandos rodam de dentro de `broker/`. No Windows o `bun` é o 1.4.2 e o Python é `python`.
- Mensagem de commit: uma frase imperativa em inglês, em minúsculas, sem prefixo de Conventional Commits (veja `git log`), com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` no fim. `check_commit.py` não se aplica.
- Um commit por tarefa, com a tarefa marcada aqui e os requisitos dela em `Implementing` na spec, no mesmo commit. Nada de `git push`.
- Código, comentários e nomes em inglês, no estilo e na densidade de comentário dos arquivos vizinhos. As skills e as mensagens do launcher são em inglês.
- O nome de cada teste começa pelo requisito: `PAP-14: ...`.
- Os testes do plugin ficam em `broker/test/`, importando `../../../plugin/...`: um `bun test` e um `tsc` só.
- Lição L-001: quando um AC fixa a ordem de dois passos, o teste usa um cenário cujo resultado muda se os passos trocam. L-004: todo default da spec fica em `shared/config.ts` com teste do valor. L-010: quando um AC lista vários gatilhos, cada um tem a sua asserção ou um skip de plataforma registrado. L-020: limite da spec é afirmado com o literal (2000, 10, 20, 3, `0600`), não com a constante importada do código.
- Nunca subir `broker.ts` ou `server.ts` sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Não usar `bun x tsc`.
- Nenhum teste automático chama o `claude` de verdade: o launcher recebe `spawn` injetado e os hooks rodam com um payload escrito pelo teste. Todo processo de teste sobe com `cleanEnv`.
- O repositório do dev fica num caminho com espaço (`E:\projetos fassi\...`), e o git escreve caminhos com `/` no Windows: todo caminho passado a um processo vai como argumento separado, e os testes comparam caminhos depois de normalizar (`realpathSync`, separador).
- `broker/.mcp.json` é o servidor solto do upstream (`server:squad`) e fica como está; o do plugin é outro arquivo, em `plugin/`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `broker/CLAUDE.md` (comandos), `.specs/STATE.md` Handoff (como rodar a suíte), `.specs/LESSONS.md` (L-001, L-004, L-010, L-020). Sem limiar de cobertura configurado: valem os defaults fortes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Configuração (`shared/config.ts`) | unit | Cada função nova, com o default e com a variável que o troca | `broker/test/unit/config.test.ts` | `bun test test/unit` |
| Servidor MCP (`server.ts`) | integration | Processo real dirigido por um cliente MCP; 1:1 com PAP-05 a PAP-09 | `broker/test/integration/server*.test.ts` | `bun test` |
| Manifesto do plugin (`plugin/.claude-plugin/`, `plugin/.mcp.json`, `plugin/hooks/hooks.json`, `plugin/roles.json`) | unit | Os arquivos lidos e comparados com os valores da spec, por inteiro | `broker/test/unit/plugin-manifest.test.ts`, `roles.test.ts` | `bun test test/unit` |
| Hook, parte pura (`plugin/hooks/usage.ts`, `session.ts`, `nudge.ts`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case da spec; somas e textos escritos à mão no teste | `broker/test/unit/hook-*.test.ts` | `bun test test/unit` |
| Hook, processo (`plugin/hooks/turn-started.ts`, `stop.ts`) | integration | O hook como processo contra um broker real e contra um servidor que conta chamadas: caminho feliz, cada falha da spec, saída padrão e código de saída | `broker/test/integration/hook-*.test.ts` | `bun test` |
| Leitor do `roles.json` (`roles.ts`) | unit | O arquivo válido e cada recusa de PAP-33, com o caminho na mensagem | `broker/test/unit/roles.test.ts` | `bun test test/unit` |
| Launcher (`launch.ts`) | unit | 1:1 com os ACs; partes puras por valor inteiro; `launch` e o worktree com git real em repositório temporário, `fetch` falso e `spawn` que só registra | `broker/test/unit/launch*.test.ts` | `bun test test/unit` |
| CLI (`cli.ts`) | integration | O processo real: uso, comando desconhecido, `start` que falha, `tui` | `broker/test/integration/cli.test.ts` | `bun test` |
| Skills (`plugin/skills/*/SKILL.md`) | unit | Estrutura, tools citadas contra `toolsFor(papel)` e comandos literais; a prosa é lida pelo Verifier contra PAP-62 a PAP-72 | `broker/test/unit/skills.test.ts` | `bun test test/unit` |
| Documentação (`README.md`, `broker/CLAUDE.md`) | none | - | - | build gate only |
| Sessões reais (`real-sessions.md`) | none | - (RS-01 a RS-14: exercitado com evidência, ou não exercitado com o motivo) | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefa só com teste de unidade | `bun test test/unit` |
| Full | Depois de tarefa com teste de integração | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |
| Build | Última tarefa de cada fase, e tarefa sem teste | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |

O repositório não tem linter. `EVT-43` em `test/integration/routes.test.ts` falha de vez em quando por poucos ms: rodar de novo. A contagem de testes só cresce: antes desta fatia, 1303 passam e 4 são pulados no Windows (`feat/papeis` em `368bd72`, 2026-10-12), e 1306 passam com 1 pulado no Linux (`main` em `f162184`).

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Fundação

Os caminhos da fatia, a credencial que o servidor deixa para os hooks e o plugin como diretório.

```
T1 → T2 → T3 → T4
```

### Phase 2: Hooks

O uso lido do transcript, a marca de início de turno e a volta ao trabalho.

```
T5 → T6 → T7 → T8 → T9
```

### Phase 3: Launcher

O `roles.json`, os argumentos da sessão, o worktree e o comando `squad`.

```
T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 4: Skills

As quatro skills de protocolo e o teste de conteúdo delas.

```
T16 → T17 → T18 → T19
```

### Phase 5: Documentação

```
T20 → T21
```

### Phase 6: Sessões reais

O que só uma sessão real mostra. Fica com o orquestrador, não com um worker.

```
T22
```

---

## Task Breakdown

### T1: Caminhos e comando da fatia na configuração

**What**: `idPath(name, env)`, `rolesPath(env)`, `pluginDir()`, `worktreesDir(mainCheckout, env)`, `claudeCommand(env)` e `HOOK_TIMEOUT_MS`.
**Where**: `broker/shared/config.ts`
**Depends on**: None
**Reuses**: `dbPath`, `tokenPath` e o padrão `env.X ?? default` do arquivo
**Requirement**: PAP-35, PAP-37 (as definições "arquivo de credencial", "diretório de worktrees" e "raiz do squad" da spec)

**Done when**:

- [x] `idPath("worker-1", { SQUAD_DB: "/tmp/x.db" })` é `/tmp/x.db.worker-1.id`; sem `SQUAD_DB` é `<home>/.squad-code-mcp.db.worker-1.id`
- [x] `pluginDir()` é absoluto, termina em `plugin`, e o pai dele contém `broker/`; `rolesPath({})` é `<pluginDir>/roles.json` e `SQUAD_ROLES` vence
- [x] `worktreesDir("/a/b/repo", {})` é `/a/b/repo.squad` (pai do checkout, nome do checkout mais `.squad`) e `SQUAD_WORKTREES` vence
- [x] `claudeCommand({})` é `claude` e `SQUAD_CLAUDE` vence; `HOOK_TIMEOUT_MS` é 2000, afirmado com o literal
- [x] Testes em `test/unit/config.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T2: Arquivo de credencial da sessão

**What**: Depois do `/register` aceito o servidor grava o `id` em `idPath(NAME)` com modo `0600`, e no `cleanup`, depois do `/unregister`, apaga o arquivo; as duas operações dentro de `try`.
**Where**: `broker/server.ts`
**Depends on**: T1
**Reuses**: `loadHumanToken` de `permission.ts` (arquivo com modo `0600`); `startBroker` e `startSession` de `test/integration/helpers.ts`
**Requirement**: PAP-06, PAP-07, PAP-08, PAP-09

**Done when**:

- [x] PAP-06: quando a chamada de `ready` volta, o arquivo `<SQUAD_DB da sessão>.<nome>.id` existe e o conteúdo dele é exatamente o `id` que uma rota aceita (`POST /state` com ele responde 200); fora do Windows o modo é `0600`, com o literal, e no Windows a asserção de modo é um skip registrado
- [x] PAP-07: fechada a sessão, o arquivo não existe mais
- [x] PAP-08: com um diretório no lugar do arquivo de credencial, `ready` registra do mesmo jeito (o `peer_joined` está no log e a resposta é a de sucesso); com o arquivo trocado por um diretório não vazio depois do registro, a sessão encerra e o `peer_left` é gravado
- [x] PAP-09: registro recusado (nome de outro papel, e nome já em uso) não deixa arquivo
- [x] Testes em `test/integration/server-credential.test.ts`
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

### T3: Textos do servidor identificam o ping por `kind`

**What**: As instruções do servidor (duas frases), a descrição da tool `ready` e a resposta a um número errado deixam de escrever `source="squad"`.
**Where**: `broker/server.ts`
**Depends on**: T2
**Reuses**: As asserções de instruções e de `ready` de `test/integration/server.test.ts`
**Requirement**: PAP-05

**Done when**:

- [x] As instruções que o cliente MCP recebe, a `description` de `ready` na lista de tools e o texto da resposta de `ready` a um número errado contêm `kind="ping"` e não contêm `source=`, uma asserção por texto
- [x] A frase das instruções sobre `task|result|verdict` também não contém `source=`
- [x] Nenhum teste anterior do servidor muda de expectativa além do `source`
- [x] Testes em `test/integration/server.test.ts`
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

### T4: Manifesto do plugin

**What**: `plugin/.claude-plugin/plugin.json`, `plugin/.mcp.json` e `plugin/hooks/hooks.json`, e o `include` de `../plugin` em `broker/tsconfig.json` para o `tsc` conferir os hooks.
**Where**: `plugin/` (diretório novo, na raiz)
**Depends on**: T3
**Reuses**: Os nomes vistos na pesquisa do `design.md` (AD-015)
**Requirement**: PAP-01, PAP-02, PAP-03

**Done when**:

- [x] PAP-01: `plugin.json` tem `name` `squad`; em `broker/` não existem `.claude-plugin`, `hooks`, `skills` nem `roles.json`
- [x] PAP-02: `mcpServers` de `plugin/.mcp.json` é, por inteiro, `{ squad: { command: "bun", args: ["${CLAUDE_PLUGIN_ROOT}/../broker/server.ts"] } }`
- [x] PAP-03: as chaves de `hooks` são exatamente `UserPromptSubmit` e `Stop`; cada uma tem um único hook `command`, com os dois comandos da spec comparados como texto e os `timeout` 10 e 20 com o literal
- [x] `tsconfig.json` inclui `../plugin` sem deixar de incluir `broker/`: um erro de tipo posto à mão num `.ts` de `plugin/` faz o `tsc` falhar (conferido e desfeito, não commitado)
- [x] Testes em `test/unit/plugin-manifest.test.ts`
- [x] Gate build passa

**Tests**: unit
**Gate**: build

---

### T5: Uso a partir dos transcripts

**What**: `usageOf(transcripts)` puro, que guarda por `message.id` a última linha contada e soma por modelo, e `sessionUsage(transcriptPath)`, que lê o principal e `subagents/*.jsonl` em ordem de nome.
**Where**: `plugin/hooks/usage.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: O formato visto na pesquisa do `design.md`; os nomes de contagem de `usageTotals` em `shared/derive.ts`
**Requirement**: PAP-14, PAP-15, PAP-16, PAP-17, PAP-18, PAP-19, PAP-21

**Done when**:

- [x] PAP-14: dois modelos num transcript dão as quatro somas de cada um, escritas à mão no teste
- [x] PAP-15: uma mensagem em três linhas com o mesmo `message.id` e `usage` diferentes conta só a última; uma linha contada sem `message.id` conta sozinha, mesmo ao lado de outra igual
- [x] PAP-16: campo ausente, negativo, fracionário e texto contam 0, um caso por valor
- [x] PAP-17: linha que não é JSON, `type` diferente de `assistant`, `message.usage` que não é objeto, `message.model` vazio e `<synthetic>` são ignoradas, e as linhas vizinhas contam
- [x] PAP-18: as linhas de dois arquivos de `subagents/` somam às do principal, e um `message.id` repetido entre o principal e um subagente conta uma vez, com os números do arquivo lido por último
- [x] PAP-19: transcript principal ausente, e caminho que é um diretório, dão `{}` sem lançar, mesmo com `subagents/` preenchido; PAP-21: `sessionUsage` de `undefined`, de número e de texto vazio dá `{}`
- [x] Testes em `test/unit/hook-usage.test.ts`, com transcripts criados pelo teste em diretório temporário
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T6: Sessão do hook

**What**: `credential(env)`, `call(path, body, env)` com prazo de 2000 ms e `payload(text)`.
**Where**: `plugin/hooks/session.ts`
**Depends on**: T5
**Reuses**: `idPath`, `brokerUrl` e `HOOK_TIMEOUT_MS` de `shared/config.ts`
**Requirement**: PAP-12, PAP-20

**Done when**:

- [x] `credential` é nulo sem `SQUAD_ROLE`, com `SQUAD_ROLE` vazio, sem o arquivo, com o arquivo vazio e com o arquivo só de espaços, um caso por gatilho (PAP-12)
- [x] PAP-20: arquivo com `"  <id>\n"` dá `<id>`
- [x] `call`, contra um `Bun.serve` do teste: devolve o corpo num 200; devolve nulo num status diferente de 200, num corpo de recusa (`ok` falso), numa porta sem ninguém e num servidor que não responde, este entre 2000 e 3500 ms com o literal; o `POST` leva o corpo como JSON
- [x] `payload` devolve o objeto de um JSON de objeto, e `{}` para texto que não é JSON, lista, número, `null` e texto vazio
- [x] Testes em `test/unit/hook-session.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T7: Hook de início de turno

**What**: Entrada fina: `credential` e um `POST /turn-started`; nunca escreve na saída padrão e sempre sai com 0.
**Where**: `plugin/hooks/turn-started.ts`
**Depends on**: T6
**Reuses**: `startBroker`, `post`, `get` e `cleanEnv` de `test/integration/helpers.ts`
**Requirement**: PAP-10, PAP-11, PAP-12, PAP-13

**Done when**:

- [x] PAP-10: rodado como processo com o arquivo de credencial de um peer registrado, o log de um broker real ganha exatamente um `turn_started` do nome, e um servidor que conta chamadas recebe um único `POST /turn-started` com o corpo `{ id }` por inteiro, a partir de um arquivo com espaços nas pontas
- [x] PAP-11: a saída padrão é vazia em todos os casos desta tarefa
- [x] PAP-12: sem `SQUAD_ROLE`, e sem arquivo de credencial, o servidor que conta chamadas não recebe nenhuma e o código é 0
- [x] PAP-13: código 0 com o broker fora do ar, com uma credencial que o broker recusa (`unknown_peer`), com um status 500 e com um servidor que não responde, este em menos de 4 s
- [x] Testes em `test/integration/hook-turn-started.test.ts`
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

### T8: Regra da volta ao trabalho

**What**: `nudge(events, name, now)` puro: acrescenta ao log um `usage` do nome com `seq` e `ts` depois dos últimos, chama `squad` e devolve o `reason` de PAP-29 se o agente sai `stalled`.
**Where**: `plugin/hooks/nudge.ts`
**Depends on**: T7
**Reuses**: `squad` e `Owed` de `shared/derive.ts`; os construtores de log de `test/unit/derive-squad.test.ts`
**Requirement**: PAP-22, PAP-28, PAP-29, PAP-32

**Done when**:

- [x] PAP-29: um teste por dívida (`result`, `verdict`, `task`, `plan`, `answer`), com o `reason` comparado por inteiro com o texto da spec, `ticket_ref`, `question_id` e `seq` incluídos
- [x] Com duas dívidas, o `reason` fala da mais antiga
- [x] PAP-28, fim de turno hipotético: um worker em turno (`turn_started` por último) com um `task` recebe o `reason`, embora `squad` sobre o log sem o `usage` acrescentado o dê como `working`; `events` não é alterado
- [x] PAP-32: nulo para o agente sem dívida, para o que só tem entrega pendente, para o que declarou `blocked` e para o `asked_by` de uma pergunta bloqueante aberta, um teste por caso
- [x] PAP-28 e PAP-32: um worker que deve o `result` e tem um `permission_request` ainda aberto no log recebe o `reason`: o fim de turno hipotético fecha o pedido (decidido pelo dev em 2026-10-12)
- [x] PAP-22: nulo para um nome que não é do squad
- [x] Testes em `test/unit/hook-nudge.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T9: Hook de fim de turno

**What**: Credencial; se `stop_hook_active` não é `true`, `GET /events?after=0` e `nudge`; com `reason`, imprime o bloqueio e sai; senão um `POST /usage` por modelo em ordem de nome, ou o de `unknown`.
**Where**: `plugin/hooks/stop.ts`
**Depends on**: T8
**Reuses**: `sessionUsage`, `credential`, `call`, `payload` e `nudge`; `startBroker`, `openFeature` e `FEATURE` dos helpers de integração
**Requirement**: PAP-12, PAP-21, PAP-22, PAP-23, PAP-24, PAP-25, PAP-26, PAP-27, PAP-28, PAP-30, PAP-31, PAP-32

**Done when**:

- [x] PAP-23: com um transcript de dois modelos em que o segundo no alfabeto aparece primeiro no arquivo, o log ganha dois `usage` em ordem crescente de modelo, com as somas escritas à mão e o `session_id` do payload; saída padrão vazia, código 0
- [x] PAP-24 e PAP-21: sem transcript, e sem `transcript_path` no payload, um único `usage` com `model` `unknown` e os quatro números 0
- [x] PAP-25: duas execuções sobre os mesmos transcripts gravam os mesmos números
- [x] PAP-26: payload que não é JSON, e payload sem `session_id`, gravam `session_id` `unknown`
- [x] PAP-27: código 0 e saída padrão vazia com `/usage` recusado, com status 500 e com o broker fora do ar
- [x] PAP-28: com um `task` para `worker-1` num broker real, o hook como `worker-1` imprime exatamente um objeto JSON `{ decision: "block", reason }` com o ticket e o `seq`, o log não ganha `usage` e o código é 0
- [x] PAP-30: na mesma situação com `stop_hook_active` `true`, a saída é vazia e o `usage` é gravado; um servidor que conta chamadas não recebe `GET /events`
- [x] PAP-31: `/events` que não responde em 2000 ms, e `/events` que responde algo sem `events` lista, não bloqueiam e o `usage` é enviado
- [x] PAP-32, pelo processo: o worker que declarou `blocked` com o `task` em aberto não é bloqueado e grava `usage`; PAP-22: `SQUAD_NAME` fora do squad não bloqueia e envia o `usage`
- [x] PAP-12: sem `SQUAD_ROLE`, e sem arquivo de credencial, nenhuma chamada, saída vazia e código 0
- [x] Testes em `test/integration/hook-stop.test.ts`
- [x] Gate build passa

**Tests**: integration
**Gate**: build

---

### T10: Leitor do `roles.json`

**What**: `readRoles(path): RoleEntry[]`, que lança `Error` com o caminho na mensagem para todo arquivo fora do formato.
**Where**: `broker/roles.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `Role` e `ROSTER` de `peers.ts`
**Requirement**: PAP-33

**Done when**:

- [x] Um arquivo válido com os quatro papéis, e um válido com um papel só e sem `workflows`, são devolvidos como lidos
- [x] Cada recusa tem o seu teste, com o caminho na mensagem: arquivo ausente, texto que não é JSON, raiz que não é objeto, `roles` que não é lista, `name` fora dos quatro, `name` repetido, `when_to_use` ausente e vazio, `skills` que não é lista e com um texto vazio, `workflows` com chave diferente de `tlc` e `matt-pocock`, valor de `workflows` que não é lista de textos não vazios
- [x] `workflows: null` é recusado: a chave está presente e o valor não é objeto (leitura de PAP-33, em "Leituras da spec" abaixo)
- [x] Testes em `test/unit/roles.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T11: `roles.json` do plugin

**What**: O arquivo com os quatro papéis e as listas de PAP-34, no formato do AD-019.
**Where**: `plugin/roles.json`
**Depends on**: T10
**Reuses**: `readRoles`; `when_to_use` de cada papel a partir do manifest do registry citado na spec
**Requirement**: PAP-34

**Done when**:

- [x] `readRoles(rolesPath({}))` aceita o arquivo
- [x] `skills` e `workflows` de cada papel são comparados por inteiro com as listas de PAP-34, escritas à mão no teste, na ordem da spec; o `judge` não tem a chave `workflows`
- [x] Testes em `test/unit/roles.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T12: Partes puras do launcher

**What**: `parseStart(argv)`, `allowed(role, platform)`, `systemPrompt(name, entry)`, `sessionEnv(env, name, role)` e `sessionArgs(...)`; `namesOf` de `peers.ts` passa a ser exportado.
**Where**: `broker/launch.ts`
**Depends on**: T11
**Reuses**: `toolsFor` de `tools.ts`, `namesOf` de `peers.ts`, `pluginDir` de `shared/config.ts`
**Requirement**: PAP-39, PAP-40, PAP-42, PAP-43, PAP-44, PAP-45, PAP-46, PAP-47

**Done when**:

- [x] `parseStart` aceita `worker`, `worker worker-2` e `--skip-permissions` antes e depois do papel; devolve erro para papel ausente, papel fora dos quatro, dois posicionais depois do papel, opção desconhecida e nome que não é do papel (`worker leader`, `mother worker-1`, `worker worker-4`), um teste por gatilho (PAP-42)
- [x] PAP-43: para cada papel a lista começa por `mcp__plugin_squad_squad__ready` e segue a ordem de `toolsFor(papel)` com o prefixo; a do `worker` é comparada com a lista escrita à mão e não tem `send_verdict`, `plan` nem `open_feature`
- [x] PAP-44: as regras `Bash(<comando>:*)` de cada papel, na ordem da spec, comparadas por inteiro: cinco para todos, mais três para `worker`, `leader` e `mother`, só `git switch` para `judge`, e `git merge` por último só no `leader`; nenhuma lista tem `push`, `reset`, `checkout` ou `rm`
- [x] PAP-45: em `win32` as mesmas regras vêm de novo depois das `Bash`, na mesma ordem, com `PowerShell(`; em `linux` e em `darwin` nenhuma regra `PowerShell`
- [x] PAP-46: o texto por inteiro para um papel com os dois workflows, para o `judge` (duas linhas) e para um papel com um workflow só; uma lista vazia omite a linha dela
- [x] PAP-39: sai toda variável que começa com `CLAUDE` (`CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, `CLAUDE_PLUGIN_ROOT`), entram `SQUAD_NAME` e `SQUAD_ROLE`, o resto fica igual e o objeto de entrada não muda
- [x] PAP-40 e PAP-47: o vetor de argumentos comparado por inteiro, sem e com `--skip-permissions`; o último é `/squad:<papel>` e vem logo depois do valor de `--append-system-prompt`
- [x] Testes em `test/unit/launch-args.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T13: Worktree do papel

**What**: `mainCheckout(cwd)`, pela primeira árvore de `git worktree list --porcelain`, e a criação do worktree de um nome com a cópia dos `.env*` não versionados, com git real.
**Where**: `broker/launch.ts`
**Depends on**: T12
**Reuses**: `worktreesDir` de `shared/config.ts`; o `git(...)` de teste de `test/unit/git.test.ts`
**Requirement**: PAP-48, PAP-53, PAP-54, PAP-55, PAP-56, PAP-57, PAP-58

**Done when**:

- [x] PAP-58: `mainCheckout` dá o mesmo caminho a partir do checkout principal, de um subdiretório dele e de dentro de um worktree; fora de um repositório dá a falha que `launch` reporta
- [x] PAP-53: com o branch da feature num commit diferente do `HEAD` do checkout principal, o worktree de `worker` e o de `judge` nascem com HEAD destacado nesse commit; sem feature aberta, e com um branch de feature que não existe, nascem destacados no `HEAD` do checkout principal, uma asserção por gatilho
- [x] PAP-54: o worktree do `leader` nasce no branch da feature (`git branch --show-current`); sem feature aberta, e com branch que não existe, nasce destacado no `HEAD` do checkout principal
- [x] PAP-48: com o branch da feature em checkout no checkout principal, a criação do worktree do `leader` falha com a mensagem do git e nada é copiado
- [x] PAP-56: `.env` e `.env.local` não versionados são copiados com o mesmo conteúdo; um `.env.example` versionado não é copiado por cima do que veio no checkout; um diretório `.env.d` e um arquivo `env.txt` ficam de fora; um `.env.shared` que já veio no checkout do branch da feature não é sobrescrito pelo não versionado do checkout principal
- [x] PAP-55: com o diretório já existente, o `HEAD` do worktree não muda mesmo com o branch da feature adiantado, e um `.env.new` criado depois no checkout principal não é copiado
- [x] PAP-57: uma falha de `git worktree add` (caminho do worktree ocupado por um arquivo) devolve a mensagem do git e não copia nada
- [x] Um dos repositórios de teste fica num caminho com espaço
- [x] Testes em `test/unit/launch-worktree.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T14: `launch`

**What**: `launch(argv, deps)`: argumentos, checkout principal, `roles.json`, log (feature aberta e presença), nome, worktree e `spawn`; toda falha antes do `spawn` é `squad: <causa>` e código 1, e as de validação vêm antes de qualquer escrita.
**Where**: `broker/launch.ts`
**Depends on**: T13
**Reuses**: `features` e `presence` de `shared/derive.ts`; `readRoles`; `rolesPath`, `claudeCommand` e `brokerUrl`
**Requirement**: PAP-35, PAP-36, PAP-37, PAP-38, PAP-41, PAP-42, PAP-49, PAP-50, PAP-51, PAP-52, PAP-55, PAP-58

**Done when**:

- [x] PAP-37: `launch(["worker"])` num repositório temporário chama o `spawn` uma vez, com `claude` (e com o valor de `SQUAD_CLAUDE` quando há), os argumentos de PAP-40, o ambiente de PAP-39 e o diretório do worktree, e devolve o código que o `spawn` devolveu (7 no teste)
- [x] PAP-38: `mother`, `leader` e `judge` usam o próprio papel; `worker` usa `worker-1` com o log vazio, `worker-2` com `worker-1` online, `worker-1` de novo depois do `peer_left` dele, e `worker-1` com o `fetch` que falha e com o que não responde em 2000 ms
- [x] PAP-49: com o nome dado e online no log, a sessão abre do mesmo jeito
- [x] PAP-51: `mother` abre no checkout principal, também quando o comando roda de dentro de um worktree; `git worktree list` continua com as mesmas árvores e nenhum arquivo é criado
- [x] PAP-52 e PAP-58: `leader`, `worker` e `judge` abrem em `<diretório de worktrees>/<nome>`, com o default e com `SQUAD_WORKTREES`, também a partir de dentro de outro worktree
- [x] Com uma feature aberta no log e o branch dela no repositório, o worktree do `worker` nasce na ponta do branch; a segunda chamada não muda nada (PAP-55)
- [x] PAP-35 e PAP-36: o arquivo de `SQUAD_ROLES` é o lido; um arquivo válido sem o papel lançado falha
- [x] PAP-41 e PAP-42, um teste por causa: papel ausente, papel fora dos quatro, posicional a mais, opção desconhecida, nome de outro papel, os três workers online sem nome dado, diretório fora de um repositório, `roles.json` inválido e `roles.json` sem o papel. Em todos: uma linha em `stderr` que começa com `squad: `, nenhum `spawn`, código 1, e o diretório de worktrees não existe depois
- [x] PAP-50: um `spawn` que rejeita dá `squad: ` com o nome do comando e código 1
- [x] Testes em `test/unit/launch.test.ts`
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T15: Comando `squad`

**What**: `cli.ts` ganha `start` (chama `launch` com `Bun.spawn` de `stdio: "inherit"`) e `tui` (roda `tui.ts` no mesmo terminal e sai com o código dela), o uso lista os quatro comandos, e `broker/package.json` ganha `bin.squad`.
**Where**: `broker/cli.ts`
**Depends on**: T14
**Reuses**: `runCli` de `test/integration/cli.test.ts`; `launch`
**Requirement**: PAP-59, PAP-50

**Done when**:

- [x] `bun cli.ts` escreve o uso com uma linha para cada um de `start`, `tui`, `status` e `kill-broker`, e sai com 0; `bun cli.ts nada` escreve o mesmo uso e sai com 1
- [x] `bun cli.ts start nada` sai com 1 e a saída de erro começa com `squad: `
- [x] PAP-50 pelo processo real: `bun cli.ts start mother` num repositório temporário, com `SQUAD_CLAUDE` num comando que não existe, sai com 1 e `squad: ` traz o nome do comando
- [x] `bun cli.ts tui`, numa condição em que `bun tui.ts` sai com código diferente de 0, sai com o mesmo código
- [x] `bin.squad` de `broker/package.json` é `./cli.ts`, lido pelo teste
- [x] `status` e `kill-broker` passam nos testes que já existiam, sem mudança de expectativa
- [x] Testes em `test/integration/cli.test.ts`
- [x] Gate build passa

**Tests**: integration
**Gate**: build

---

### T16: Skill do worker e o teste de conteúdo

**What**: A skill de protocolo do worker, e o teste que lê uma skill e confere frontmatter, seções, tools citadas e comandos literais.
**Where**: `plugin/skills/worker/SKILL.md`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `toolsFor` de `tools.ts`; os achados de `docs/fase-0/teste-1.md`; AD-013 (a pergunta é escrita na origem)
**Requirement**: PAP-60, PAP-61, PAP-62, PAP-63, PAP-64, PAP-65, PAP-66, PAP-67, PAP-68

**Done when**:

- [x] PAP-60: frontmatter com `name` `worker` e `description` não vazia; as sete seções de nível 2, com esses títulos e nessa ordem, e nenhuma outra de nível 2
- [x] PAP-61: todo nome de tool do squad entre crases é do `worker` (`ready` mais `toolsFor("worker")`), e estão citadas `ready`, `state`, `ask`, `blocked`, `send_result`, `answer` e `history`; uma skill de teste com `send_verdict` entre crases reprova no mesmo conferidor
- [x] PAP-62: `Start` cita `ready`, depois `state`, nessa ordem, e o comando literal `git show <spec_commit>:<spec_ref>`
- [x] PAP-68: `Your work` tem os literais `git switch -c`, `ticket_ref`, `task_seq`, `branch`, `commit` e `loadout`, e nenhum comando `git merge` ou `git push` entre crases
- [x] PAP-63 a PAP-67 e o resto de PAP-68 estão no texto, cada regra da spec numa frase que a manda ou a proíbe; a conferência disso é a leitura do Verifier
- [x] Testes em `test/unit/skills.test.ts`, com o conferidor escrito para receber o papel
- [x] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T17: Skill do judge

**What**: A skill de protocolo do judge.
**Where**: `plugin/skills/judge/SKILL.md`
**Depends on**: T16
**Reuses**: O conferidor de `test/unit/skills.test.ts`; a estrutura da skill do worker
**Requirement**: PAP-60, PAP-61, PAP-62, PAP-63, PAP-64, PAP-65, PAP-66, PAP-67, PAP-69

**Done when**:

- [ ] O conferidor passa para `judge`: frontmatter, as sete seções, tools só do papel, com `ready`, `state`, `ask`, `blocked`, `send_verdict` e `history` citadas; `answer` e `escalate` não aparecem entre crases
- [ ] PAP-69: `Your work` tem os literais `git switch --detach`, `result_seq`, `outcome`, `criteria` e `stale_reference`
- [ ] PAP-62 a PAP-67 e o resto de PAP-69 estão no texto, cada regra numa frase
- [ ] Testes em `test/unit/skills.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T18: Skill do leader

**What**: A skill de protocolo do leader.
**Where**: `plugin/skills/leader/SKILL.md`
**Depends on**: T17
**Reuses**: O conferidor; a estrutura das duas skills anteriores
**Requirement**: PAP-60, PAP-61, PAP-62, PAP-63, PAP-64, PAP-65, PAP-66, PAP-67, PAP-70

**Done when**:

- [ ] O conferidor passa para `leader`, com `ready`, `state`, `ask`, `blocked`, `plan`, `send_task`, `send_result`, `answer` e `escalate` citadas
- [ ] PAP-70: `Your work` tem os literais `git switch`, `git merge`, `ticket_ref`, `loadout`, `criteria`, `rework_limit` e `dropped`, e `plan` é citado antes de `send_task`
- [ ] PAP-62 a PAP-67 e o resto de PAP-70 estão no texto, cada regra numa frase
- [ ] Testes em `test/unit/skills.test.ts`
- [ ] Gate quick passa: `bun test test/unit`

**Tests**: unit
**Gate**: quick

---

### T19: Skill da mother

**What**: A skill de protocolo da mother, com a oitava seção e as duas linhas marcadas para a fatia Gate.
**Where**: `plugin/skills/mother/SKILL.md`
**Depends on**: T18
**Reuses**: O conferidor; AD-020 (o que a mother faz até a Gate existir)
**Requirement**: PAP-04, PAP-60, PAP-61, PAP-62, PAP-63, PAP-64, PAP-65, PAP-67, PAP-71, PAP-72

**Done when**:

- [ ] O conferidor passa para `mother`, com `ready`, `state`, `ask`, `blocked`, `open_feature`, `send_task`, `answer`, `escalate`, `merge_question` e `close_feature` citadas
- [ ] PAP-72: as seções de nível 2 são as sete mais `Delivery (until the gate exists)`, logo depois de `Irreversible actions`; cada uma das duas tem a linha `<!-- Gate slice: rewrite this section to use the gate -->` por inteiro; nenhum texto entre crases cita uma tool de gate; `Delivery` cita `close_feature` e `delivered`
- [ ] PAP-71: `Your work` cita `open_feature` e `merge_question`, e manda criar o branch da feature, commitar a spec e voltar ao branch base antes de `open_feature`
- [ ] PAP-04: `plugin/skills/` tem exatamente os diretórios `mother`, `leader`, `worker` e `judge`, cada um só com `SKILL.md`
- [ ] PAP-62 a PAP-65, PAP-67 e o resto de PAP-71 e PAP-72 estão no texto, cada regra numa frase
- [ ] Testes em `test/unit/skills.test.ts`
- [ ] Gate build passa

**Tests**: unit
**Gate**: build

---

### T20: Passo a passo no README da raiz

**What**: Uma seção que mostra `bun link` em `broker/`, `squad start` para os quatro papéis, `squad tui` e `--skip-permissions`.
**Where**: `README.md`
**Depends on**: None (a fase anterior inteira)
**Reuses**: O que o `README.md` já diz do projeto; os dois diálogos de subida descritos no Handoff
**Requirement**: PAP-73

**Done when**:

- [ ] A seção tem `bun link`, uma linha `squad start` para cada um de `mother`, `leader`, `worker` e `judge`, `squad tui` e `--skip-permissions`, com o que o modo padrão permite e o que a flag troca
- [ ] Diz os dois diálogos que aparecem ao subir e que o launcher não os responde, e onde ficam os worktrees
- [ ] Nenhuma instrução manda instalar o plugin por marketplace
- [ ] Gate build passa

**Tests**: none
**Gate**: build

---

### T21: Documentação do broker

**What**: `broker/CLAUDE.md` descreve `launch.ts`, `roles.ts`, o arquivo de credencial e o diretório `plugin/`, e a seção Running passa a subir a sessão pelo launcher.
**Where**: `broker/CLAUDE.md`
**Depends on**: T20
**Reuses**: A seção Architecture
**Requirement**: PAP-73

**Done when**:

- [ ] `launch.ts` e `roles.ts` têm a sua linha na seção Architecture; a de `server.ts` diz o arquivo de credencial; a de `cli.ts` diz `start` e `tui`; a de `shared/config.ts` diz os caminhos novos
- [ ] Uma linha para `../plugin/`: manifesto, `.mcp.json`, os dois hooks e o que cada arquivo de `hooks/` faz, `roles.json` e as quatro skills
- [ ] Running mostra `squad start <papel>` e deixa o comando com `server:squad` como a forma sem plugin
- [ ] Gate build passa

**Tests**: none
**Gate**: build

---

### T22: Sessões reais e o registro delas

**What**: RS-01 a RS-14 exercitados com o plugin e o launcher de verdade, e `real-sessions.md` com o que foi visto, a evidência e o que ficou sem exercitar.
**Where**: `.specs/features/papeis/real-sessions.md`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `real-session-driver.py` e a seção "Sessões reais: o que já foi visto e como repetir" do Handoff
**Requirement**: PAP-02, PAP-03, PAP-10, PAP-23, PAP-28, PAP-37, PAP-40 (a metade que só uma sessão real mostra: RS-01 a RS-14 da spec)

**Done when**:

- [ ] Cada linha de RS-01 a RS-14 está em `real-sessions.md` como exercitada, com data, versão do Claude Code, sistema, o comando e o que foi visto (o evento no log, a tela gravada ou a saída), ou como não exercitada, com o motivo
- [ ] RS-01, RS-02 e RS-03 são repetidos com o plugin da fatia, não com o `spk`
- [ ] Toda sessão sobe com `SQUAD_PORT`, `SQUAD_DB`, `SQUAD_TOKEN_FILE` e `SQUAD_WORKTREES` temporários e sem as variáveis `CLAUDE*`, num repositório descartável; o broker de teste é encerrado no fim
- [ ] Um defeito que uma sessão real mostra vira tarefa de correção com teste e commit próprios, antes de esta fechar
- [ ] A pergunta do spike B (RS-13) fica respondida ou registrada como não exercitada
- [ ] Gate build passa

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7 → T8 → T9
Phase 3:  T10 → T11 → T12 → T13 → T14 → T15
Phase 4:  T16 → T17 → T18 → T19
Phase 5:  T20 → T21
Phase 6:  T22
```

Lotes de execução (fases inteiras, perto de 7 tarefas por worker): fases 1 e 2 (9 tarefas); fase 3 (6); fases 4 e 5 (6). A fase 6 não vai para um worker: precisa do login do dev, do ConPTY e de julgamento sobre o que a tela mostra, e fica com o orquestrador.

Depois da última tarefa, fora da lista: a suíte no Linux (contêiner `oven/bun:1.4.2` sobre clone limpo) e de novo no Windows, com as contagens na spec; o Verifier numa cópia física com `bun install` próprio, até três voltas de correção; `validate_state.py papeis`; a fatia e as duas pendências resolvidas marcadas em `ROADMAP.md`; o Handoff. O `git push` e o PR sem merge pedem o sim do dev na hora.

---

## Leituras da spec

Pontos em que a tarefa fixa o que a spec deixa sem dizer. Nenhum muda um AC.

| Ponto | Leitura | Tarefa |
| ----- | ------- | ------ |
| `workflows: null` no `roles.json` (PAP-33, "se presente") | Recusado: a chave está presente e o valor não é objeto | T10 |
| `--skip-permissions` antes do papel (PAP-37 mostra depois) | Aceito em qualquer posição | T12 |
| "Arquivo do plugin dentro de `broker/`" (PAP-01) | `.claude-plugin`, `hooks`, `skills` e `roles.json`. O `broker/.mcp.json` do upstream não é do plugin e fica | T4 |
| Tool de gate que a skill da mother não cita (PAP-72) | Nenhum texto entre crases com `gate` no nome | T19 |
| `message.id` que não é texto não vazio (PAP-15, "sem `message.id`") | Linha sem id: conta sozinha | T5 |
| `message.usage` que é uma lista (PAP-17, "`message.usage` objeto") | Não é objeto: a linha é ignorada | T5 |
| Arquivo de `subagents/` que não pode ser lido (PAP-18; PAP-19 só fala do principal) | Não conta nada; o principal e os outros arquivos contam | T5 |
| O que é uma opção em `squad start` (PAP-42, "uma opção que não é `--skip-permissions`") | Todo argumento que começa com `-`; nunca é lido como papel nem como nome | T12 |
| Leitura do log pelo launcher que responde outro status, ou algo sem `events` lista ("se a leitura falha", na definição de feature aberta para o launcher) | Leitura que falhou, como em PAP-31: sem feature aberta e ninguém online | T14 |
| Tool do squad "citada entre crases" e literal de uma seção (PAP-61, PAP-62, PAP-68 a PAP-72) | Proibida: todo identificador de um trecho entre crases, ou de uma linha de bloco cercado, que é nome de tool de outro papel (`kind="answer"` conta na skill do judge). Exigida: um trecho entre crases que é só o nome. Um comando literal vale no trecho que é o literal ou começa por ele | T16 |
| Merge ou push pedido a um worker com resposta que autoriza (PAP-66 lista os dois, PAP-68 diz nunca) | Continua proibido: a skill do worker diz que nenhuma resposta levanta a regra de `Your work` | T16 |

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Caminhos e comando da fatia na configuração | 1 arquivo: `config.ts` | ✅ Granular |
| T2: Arquivo de credencial da sessão | 1 arquivo: `server.ts` | ✅ Granular |
| T3: Textos do servidor identificam o ping por `kind` | 1 arquivo: `server.ts` | ✅ Granular |
| T4: Manifesto do plugin | 3 arquivos JSON de um diretório, um conceito | ⚠️ Coeso |
| T5: Uso a partir dos transcripts | 1 arquivo: `usage.ts` | ✅ Granular |
| T6: Sessão do hook | 1 arquivo: `session.ts` | ✅ Granular |
| T7: Hook de início de turno | 1 arquivo: `turn-started.ts` | ✅ Granular |
| T8: Regra da volta ao trabalho | 1 função: `nudge` | ✅ Granular |
| T9: Hook de fim de turno | 1 arquivo: `stop.ts` | ✅ Granular |
| T10: Leitor do `roles.json` | 1 função: `readRoles` | ✅ Granular |
| T11: `roles.json` do plugin | 1 arquivo: `roles.json` | ✅ Granular |
| T12: Partes puras do launcher | 5 funções puras de `launch.ts` | ⚠️ Coeso |
| T13: Worktree do papel | 1 arquivo: `launch.ts`, o worktree | ✅ Granular |
| T14: `launch` | 1 função: `launch` | ✅ Granular |
| T15: Comando `squad` | 1 arquivo: `cli.ts` | ✅ Granular |
| T16: Skill do worker e o teste de conteúdo | 1 arquivo: `worker/SKILL.md` | ✅ Granular |
| T17: Skill do judge | 1 arquivo: `judge/SKILL.md` | ✅ Granular |
| T18: Skill do leader | 1 arquivo: `leader/SKILL.md` | ✅ Granular |
| T19: Skill da mother | 1 arquivo: `mother/SKILL.md` | ✅ Granular |
| T20: Passo a passo no README da raiz | 1 arquivo: `README.md` | ✅ Granular |
| T21: Documentação do broker | 1 arquivo: `CLAUDE.md` | ✅ Granular |
| T22: Sessões reais e o registro delas | 1 arquivo: `real-sessions.md` | ✅ Granular |

Quatro tarefas mexem também num arquivo de ligação: T4 em `broker/tsconfig.json`, T12 no `export` de `namesOf` em `peers.ts`, T15 em `broker/package.json` e T16 no conferidor de `skills.test.ts`. É a ligação do que a própria tarefa cria. T4 e T12 ficam inteiras: os três JSON só valem juntos como um plugin, e as cinco funções de T12 são uma linha cada sobre a mesma entrada.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | None (a fase anterior inteira) | início da fase 2 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | None (a fase anterior inteira) | início da fase 3 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | None (a fase anterior inteira) | início da fase 4 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |
| T20 | None (a fase anterior inteira) | início da fase 5 | ✅ Match |
| T21 | T20 | T20 → T21 | ✅ Match |
| T22 | None (a fase anterior inteira) | fase 6, sozinha | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Caminhos e comando da fatia na configuração | Configuração | unit | unit | ✅ OK |
| T2: Arquivo de credencial da sessão | Servidor MCP | integration | integration | ✅ OK |
| T3: Textos do servidor identificam o ping por `kind` | Servidor MCP | integration | integration | ✅ OK |
| T4: Manifesto do plugin | Manifesto do plugin | unit | unit | ✅ OK |
| T5: Uso a partir dos transcripts | Hook, parte pura | unit | unit | ✅ OK |
| T6: Sessão do hook | Hook, parte pura | unit | unit | ✅ OK |
| T7: Hook de início de turno | Hook, processo | integration | integration | ✅ OK |
| T8: Regra da volta ao trabalho | Hook, parte pura | unit | unit | ✅ OK |
| T9: Hook de fim de turno | Hook, processo | integration | integration | ✅ OK |
| T10: Leitor do `roles.json` | Leitor do `roles.json` | unit | unit | ✅ OK |
| T11: `roles.json` do plugin | Manifesto do plugin | unit | unit | ✅ OK |
| T12: Partes puras do launcher | Launcher | unit | unit | ✅ OK |
| T13: Worktree do papel | Launcher | unit | unit | ✅ OK |
| T14: `launch` | Launcher | unit | unit | ✅ OK |
| T15: Comando `squad` | CLI | integration | integration | ✅ OK |
| T16: Skill do worker e o teste de conteúdo | Skills | unit | unit | ✅ OK |
| T17: Skill do judge | Skills | unit | unit | ✅ OK |
| T18: Skill do leader | Skills | unit | unit | ✅ OK |
| T19: Skill da mother | Skills | unit | unit | ✅ OK |
| T20: Passo a passo no README da raiz | Documentação | none | none | ✅ OK |
| T21: Documentação do broker | Documentação | none | none | ✅ OK |
| T22: Sessões reais e o registro delas | Sessões reais | none | none | ✅ OK |
