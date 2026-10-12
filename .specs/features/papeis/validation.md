# Papéis Validation

**Result**: FAIL

**Round**: 2 de no máximo 3
**Date**: 2026-10-12
**Spec**: `.specs/features/papeis/spec.md`, PAP-01 a PAP-75, edge cases e "Success Criteria"
**Diff range**: `f162184..8f4e442` (`main..feat/papeis` em `8f4e442`)
**Verifier**: agente novo e independente (author ≠ verifier). Não escreveu código, testes, tarefas nem relatórios da fatia, e não é o Verifier da volta 1.
**Environment**: Windows 11 Pro 10.0.26200, Bun 1.4.2, git real. Tudo rodou numa cópia física do branch em `8f4e442`, com `bun install` próprio, fora do repositório.

Os cinco mutantes que sobreviveram na volta 1 morrem agora, cada um no teste que a correção trouxe. O gate está verde. Nenhum arquivo de produção mudou desde a volta 1 e nenhuma asserção anterior foi enfraquecida. Mesmo assim a volta falha: das 21 mutações novas, 5 sobreviveram. Duas estão na linha que a correção T24 mirava: o teste novo de PAP-37 prova que a sessão herda a saída de erro, e não prova a entrada nem a saída padrão, que o AC também nomeia. As outras três estão em `broker/launch.ts`. Nenhum defeito de produção foi visto: as cinco são testes que não distinguem, não código errado.

Durante a verificação o `HEAD` do repositório real passou de `8f4e442` para `1181d25`, por dois commits de documentos que não são deste agente (`.specs/STATE.md` e `handoff-codex.md`). Nenhum arquivo de `broker/`, `plugin/` ou da spec mudou. O intervalo verificado continua `f162184..8f4e442`.

---

## Voltas

**Volta 1** (`f162184..0848c8f`, relatório em `validation-round-1.md`): FAIL. 76 mutações, 5 sobreviventes em três testes: C1, C2 e C6 (`broker/cli.ts`, PAP-37), V6 (`broker/server.ts`, PAP-08) e S10 (`plugin/hooks/stop.ts`, PAP-31). Nenhum defeito de produção. Três commits de correção, só de teste:

| Commit | Tarefa | Arquivos | Mutantes |
| ------ | ------ | -------- | -------- |
| `efb6d74` | T24, PAP-37 | `broker/test/integration/cli.test.ts` | C1, C2, C6 |
| `fa75877` | T25, PAP-08 | `broker/test/integration/server-credential.test.ts`, `broker/test/integration/helpers.ts` | V6 |
| `8f4e442` | T26, PAP-31 | `broker/test/integration/hook-stop.test.ts` | S10 |

O texto de dois requisitos foi completado e confirmado pelo dev em 2026-10-12: PAP-08 diz o que se observa (`spec.md:169`) e PAP-31 diz que um status diferente de 200 é leitura que falhou (`spec.md:228`).

**Volta 2** (este relatório, `8f4e442`):

- `git diff 0848c8f..8f4e442 --stat`: 13 arquivos, 9 em `.specs/` e 4 em `broker/test/`. Nenhum arquivo de produção.
- Li por inteiro os três arquivos de teste mudados e `helpers.ts`, e o diff de `broker/test`.
- Reinjetei os cinco sobreviventes como a volta 1 os descreve.
- Rederivei do zero as 20 linhas cujos testes vivem nos arquivos mudados. Abri e conferi as outras 55, uma a uma, no arquivo e na linha citados. Nenhuma linha foi levada da volta 1 sem abrir.
- Injetei 21 mutações novas, fora da lista da volta 1.
- Rodei o gate inteiro uma vez.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 a T23 | ✅ Done | Todo item de "Done when" marcado. Conferido na volta 1; os arquivos de produção não mudaram desde então |
| T24 | ⚠️ Partial | Marcada e commitada em `efb6d74`. C1, C2 e C6 morrem. O teste prova a saída de erro herdada; a entrada e a saída padrão de PAP-37 seguem sem asserção (C1b, C1c) |
| T25 | ✅ Done | Marcada e commitada em `fa75877`. V6 morre com `Expected: 0`, `Received: 1` |
| T26 | ✅ Done | Marcada e commitada em `8f4e442`. S10 morre |

`tasks.md` tem 166 itens marcados e 0 em aberto. O cabeçalho ainda diz `In Progress` (`tasks.md:12`): é do orquestrador fechar.

Um reparo de documento em T24: o "Done when" diz que `git worktree list` do repositório do squad "continua com uma árvore só" (`tasks.md:655`). O teste afirma outra coisa, e é a certa: que a lista é a mesma de antes (`cli.test.ts:159` e `:166`). O repositório real tem duas árvores.

---

## Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`. `:N` sozinho continua o arquivo citado antes na mesma célula. Coluna **V2**: `R` é rederivado do zero nesta volta, com as linhas de `8f4e442`; `S` é aberto e conferido nesta volta no arquivo e na linha citados (arquivo sem mudança desde `0848c8f`). Nenhuma linha é `C`, levada sem abrir.

| Criterion | Spec-defined outcome | `file:line` + assertion | V2 | Result |
| --------- | -------------------- | ----------------------- | -- | ------ |
| PAP-01 | `plugin.json` com `name` `squad`; nenhum arquivo do plugin em `broker/` | `test/unit/plugin-manifest.test.ts:13` `expect(json(".claude-plugin", "plugin.json").name).toBe("squad")`; `:18` `expect([name, existsSync(join(BROKER, name))]).toEqual([name, false])` para `.claude-plugin`, `hooks`, `skills` e `roles.json` | S | ✅ PASS ⚠️ precisão: a spec não diz o que é "arquivo do plugin" |
| PAP-02 | Um servidor só, `squad`, `bun` e `["${CLAUDE_PLUGIN_ROOT}/../broker/server.ts"]` | `test/unit/plugin-manifest.test.ts:23` `expect(json(".mcp.json").mcpServers).toEqual({ squad: { command: "bun", args: [...] } })` | S | ✅ PASS |
| PAP-03 | Só `UserPromptSubmit` e `Stop`, um hook `command` cada, `timeout` 10 e 20 | `test/unit/plugin-manifest.test.ts:29` chaves `["Stop", "UserPromptSubmit"]`; `:33` e `:39` `toEqual([{ hooks: [{ type: "command", command: 'bun "${CLAUDE_PLUGIN_ROOT}/hooks/…"', timeout: 10 \| 20 }] }])` | S | ✅ PASS |
| PAP-04 | Exatamente quatro skills, `SKILL.md` em cada | `test/unit/skills.test.ts:278` `expect(readdirSync(SKILLS).sort()).toEqual(["judge", "leader", "mother", "worker"])`; `:280` cada diretório `["SKILL.md"]` | S | ✅ PASS |
| PAP-05 | Instruções, descrição de `ready` e resposta a número errado com `kind="ping"` e sem `source="squad"` | `test/integration/server.test.ts:309` `toContain('kind="ping"')`, `:310` `not.toContain("source=")`; `:317`–`:319`; `:326`–`:327`; `:334`–`:336` com `isError` | S | ✅ PASS |
| PAP-06 | Arquivo `<SQUAD_DB>.<nome>.id` com exatamente o `id`, antes de responder, modo `0600` onde há modo | `test/integration/server-credential.test.ts:40` não existe antes de `ready`; `:45` `expect(existsSync(file)).toBe(true)` logo depois; `:48`–`:50` `POST /state` com o conteúdo lido: 200 e `{ feature: null, ticket: null, owed: [] }`; `:52`–`:53` o `turn_started` sai como `worker-1`; `:61` `expect(statSync(file).mode & 0o777).toBe(0o600)`, pulado no Windows (`:57`); caminho em `test/unit/config.test.ts:80` e `:85` | R | ✅ PASS. A asserção do modo não rodou aqui: é do Linux |
| PAP-07 | O arquivo some quando o servidor encerra depois de registrado | `test/integration/server-credential.test.ts:73` some em até 1500 ms; `:75` `expect(existsSync(file)).toBe(false)`; `:76` `["peer_joined", "peer_left"]` | R | ✅ PASS |
| PAP-08 | Não gravado: o registro responde com sucesso e o `peer_joined` é gravado. Não apagado: o `peer_left` é gravado e o processo sai com código 0 | Gravar: `test/integration/server-credential.test.ts:85` `isError` falso, `:86` `toBe("Registered in the squad as worker-1 (worker).")`, `:87`–`:89` `[["peer_joined", { peer: "worker-1", role: "worker" }]]`. Apagar: `:106`–`:109` `peer_joined` e `peer_left` `unregistered`; `:111` `expect(await Promise.race([session.exited, Bun.sleep(1500).then(() => "still running")])).toBe(0)`; `:114` `kept` intacto | R | ✅ PASS. Os dois valores que o texto novo nomeia têm asserção com o literal |
| PAP-09 | Registro recusado não grava arquivo | `test/integration/server-credential.test.ts:121`–`:124` `invalid_name`, nenhum arquivo, `:127` nem depois de fechar; `:135`–`:137` `name_taken`; `:153`–`:155` e `:158`–`:159` o arquivo de quem tem o nome fica igual e ainda vale | R | ✅ PASS |
| PAP-10 | Um único `POST /turn-started` com `{ id }` sem espaços nas pontas, código 0 | `test/integration/hook-turn-started.test.ts:52` log `[["peer_joined", "broker"], ["turn_started", "worker-1"]]`; `:61` `expect(server.requests).toEqual([{ method: "POST", path: "/turn-started", body: { id: "the-id-of-worker-1" } }])` a partir de `"  the-id-of-worker-1 \n"`; `:62` código 0 | S | ✅ PASS |
| PAP-11 | Nada na saída padrão, em nenhum caso | `test/integration/hook-turn-started.test.ts:51`, `:63`, `:72`, `:80`, `:86`, `:94`, `:103`, `:111` `expect(hook.stdout).toBe("")` nos oito casos | S | ✅ PASS |
| PAP-12 | Sem `SQUAD_ROLE`, ou sem arquivo, ou arquivo vazio: nenhuma chamada, saída vazia, código 0 | `test/unit/hook-session.test.ts:41`, `:45`, `:49`, `:53`, `:57` `credential(...)` nulo, um gatilho por teste; pelo processo: `test/integration/hook-turn-started.test.ts:70`–`:72`, `:78`–`:80` e `test/integration/hook-stop.test.ts:345`–`:347`, `:353`–`:355` `expect(server.requests).toEqual([])`, código 0, saída vazia | R | ✅ PASS |
| PAP-13 | Broker sem resposta em 2000 ms, status ≠ 200 ou recusa: código 0 | `test/integration/hook-turn-started.test.ts:85` fora do ar; `:93`–`:95` `unknown_peer` de um broker real; `:101`–`:103` status 500; `:109`–`:112` sem resposta, `hook.ms < 4000`; `test/unit/hook-session.test.ts:128`–`:129` `took >= 2000` e `< 3500`; `test/unit/config.test.ts:117` `expect(HOOK_TIMEOUT_MS).toBe(2000)` | S | ✅ PASS |
| PAP-14 | Soma por modelo dos quatro campos | `test/unit/hook-usage.test.ts:66`–`:69` `toEqual({ "claude-opus": { input: 110, output: 220, cache_write: 330, cache_read: 440 }, "claude-sonnet": { input: 6, output: 8, cache_write: 10, cache_read: 12 } })`; `:78` pelo arquivo | S | ✅ PASS |
| PAP-15 | Mesmo `message.id`: só a última linha; sem id conta sozinha | `test/unit/hook-usage.test.ts:94` `{ input: 107, output: 208, cache_write: 309, cache_read: 410 }`; `:99`; `:105` id vazio, número e `null` | S | ✅ PASS ⚠️ precisão: id que não é texto não vazio |
| PAP-16 | Campo ausente ou não inteiro ≥ 0 conta 0 | `test/unit/hook-usage.test.ts:119`–`:122`, quatro valores em cada um dos quatro campos | S | ✅ PASS |
| PAP-17 | Linha que não é JSON ou não é contada é ignorada, as vizinhas contam | `test/unit/hook-usage.test.ts:134`–`:137`, `:142`, `:147`–`:148`, `:153`, `:159`, `:164` `toEqual(NEIGHBOURS)`; `:169` | S | ✅ PASS |
| PAP-18 | `subagents/*.jsonl` somam, com a regra do id entre todos os arquivos | `test/unit/hook-usage.test.ts:181`–`:184`; `:190`; `:199`–`:202`; `:208`–`:209`; `:216`–`:219` | S | ✅ PASS ⚠️ precisão: arquivo de subagente ilegível |
| PAP-19 | Sem transcript principal legível: nenhum modelo, sem falhar | `test/unit/hook-usage.test.ts:224`–`:225` e `:231` `toEqual({})`, com `subagents/` preenchido | S | ✅ PASS |
| PAP-20 | Credencial sem espaços nem quebras nas pontas | `test/unit/hook-session.test.ts:29`–`:30`; `test/integration/hook-turn-started.test.ts:61` | S | ✅ PASS |
| PAP-21 | Sem `transcript_path` texto: uso como PAP-19 | `test/unit/hook-usage.test.ts:235`–`:237`; `test/integration/hook-stop.test.ts:150` `expect(usages(b)).toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]])` | R | ✅ PASS |
| PAP-22 | `SQUAD_NAME` fora do squad: não bloqueia, encerra como PAP-23 | `test/unit/hook-nudge.test.ts:230` nulo para `worker-4`, `worker`, `human`, `broker` e vazio; `test/integration/hook-stop.test.ts:332`–`:338` saída vazia e os dois `POST /usage` sobre o log em que `worker-1` deve | R | ✅ PASS |
| PAP-23 | Um `POST /usage` por modelo, em ordem crescente, corpo com os sete campos, código 0, saída vazia | `test/integration/hook-stop.test.ts:128`–`:133` opus antes de sonnet num transcript em que sonnet vem primeiro, somas 15/25/35/45 e 101/202/303/404, `session_id` do payload; `:254`–`:257` os dois corpos por inteiro | R | ✅ PASS |
| PAP-24 | Nenhum modelo: um único `usage` de `unknown` com zeros | `test/integration/hook-stop.test.ts:142` `expect(usages(b)).toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]])` | R | ✅ PASS |
| PAP-25 | Duas execuções, os mesmos números | `test/integration/hook-stop.test.ts:159`–`:161` | R | ✅ PASS |
| PAP-26 | Payload que não é objeto, ou sem `session_id` texto: `session_id` `unknown` e uso como PAP-19 | `test/integration/hook-stop.test.ts:169`; `:177` e `:180` para ausente, vazio e número, com um transcript que tem modelos e não é lido; `test/unit/hook-session.test.ts:156` | R | ✅ PASS |
| PAP-27 | `/usage` sem resposta em 2000 ms, status ≠ 200 ou recusa: código 0, saída vazia | `test/integration/hook-stop.test.ts:187`–`:189` recusa; `:197`–`:204` status 500, os dois modelos tentados; `:209`–`:210` fora do ar; prazo em `test/unit/hook-session.test.ts:135`–`:136` com `call("/usage", ...)` | R | ✅ PASS. O gatilho dos 2000 ms tem asserção em `call`, não pelo processo de `stop.ts` |
| PAP-28 | `stalled` no fim de turno hipotético: exatamente `{ decision: "block", reason }`, nenhum `usage`, código 0 | `test/integration/hook-stop.test.ts:217`–`:226` objeto inteiro com `TKT-13` e `seq 6`, uma linha, `usages(b)` vazio, log do mesmo tamanho; `:233`–`:235`; `test/unit/hook-nudge.test.ts:156`–`:157` | R | ✅ PASS |
| PAP-29 | Os cinco textos de `reason` e a dívida mais antiga | `test/unit/hook-nudge.test.ts:100`, `:106`, `:113`, `:119`, `:126` `toBe` com o texto inteiro, comparado palavra a palavra com `spec.md:226`; `:134` e `:145` a mais antiga nas duas ordens | R | ✅ PASS |
| PAP-30 | `stop_hook_active` `true`: não lê `/events`, não bloqueia, encerra | `test/integration/hook-stop.test.ts:241`–`:246`; `:254` `expect(server.requests).toEqual([...])` só com os dois `POST /usage` | R | ✅ PASS |
| PAP-31 | `/events` sem resposta em 2000 ms, com status ≠ 200 ou sem `{ events: [...] }`: não bloqueia, encerra | `test/integration/hook-stop.test.ts:262`–`:271` `hook.ms >= 2000` e `< 4500`; `:283`–`:289` quatro respostas; status: `:298` o log de um broker real em que `worker-1` deve, respondido com 500, `:302` código 0, `:303` `expect(hook.stdout).toBe("")`, `:304`–`:308` o `GET` e os dois `POST /usage` por inteiro | R | ✅ PASS. O caso que o texto novo nomeia tem teste, e o log do teste bloquearia se o status fosse ignorado |
| PAP-32 | Outro status que não `stalled`: não bloqueia; o `permission_request` aberto não livra | `test/unit/hook-nudge.test.ts:179`–`:183`; `:196`–`:197`; `:203`; `:219` e `:222`; `:209`–`:210` pedido aberto e o `reason` mesmo assim; pelo processo `test/integration/hook-stop.test.ts:316`–`:322` | R | ✅ PASS |
| PAP-33 | Formato do `roles.json`; recusa com o caminho | `test/unit/roles.test.ts:46`, `:51`; `:56`, `:61`, `:71`, `:82`, `:107` (15 recusas), `:113`, `:118` `expect(() => readRoles(path)).toThrow(path)` | S | ✅ PASS ⚠️ precisão: `workflows: null` |
| PAP-34 | As listas dos quatro papéis | `test/unit/roles.test.ts:127`, `:131`–`:135`, `:139`–`:143`, `:147`–`:151`, `:156`–`:160`, `judge` sem a chave `workflows`; conferido também contra `plugin/roles.json` | S | ✅ PASS |
| PAP-35 | `SQUAD_ROLES` ou `<raiz>/plugin/roles.json` | `test/unit/launch.test.ts:449`–`:450`; `test/unit/config.test.ts:97`–`:99`; o default em `test/unit/launch.test.ts:185` | S | ✅ PASS |
| PAP-36 | `roles.json` válido sem o papel: falha como PAP-42 | `test/unit/launch.test.ts:520`–`:522`, por `refused` (`:464`–`:470`) | S | ✅ PASS |
| PAP-37 | Um único processo, `SQUAD_CLAUDE` ou `claude`, entrada, saída e erro herdados, sai com o código dele | Pelo processo real, com `git` no lugar da sessão: `test/integration/cli.test.ts:153` e `:161` `expect(res.err).toContain("unknown option: --plugin-dir")`; `:154` e `:162` `expect(res.code).toBe(129)`; `:164` `expect(worktrees(main).map((tree) => realpathSync(tree))).toEqual([main, join(trees, "worker-1")])`; `:166` `expect(worktrees(BROKER_DIR)).toEqual(squad)`. Com `spawn` injetado: `test/unit/launch.test.ts:172`–`:173`, `:174`–`:189`, `:190` `expect(code).toBe(7)`, `:197`; `test/unit/config.test.ts:112` | R | ❌ GAP parcial. Processo único, comando, erro herdado, código de saída e diretório atual: com evidência. Entrada e saída padrão herdadas: nenhuma asserção. `runCli` dá `stdin: "ignore"` (`cli.test.ts:39`) e nenhum teste de PAP-37 olha `res.out`. C1b e C1c sobrevivem |
| PAP-38 | Nome default; `worker-1` se a leitura falha | `test/unit/launch.test.ts:252`, `:259`, `:265`, `:273`, `:279`, `:289`–`:290`, `:300`, `:313`–`:317` (`ms >= 2000`) | S | ✅ PASS ⚠️ precisão: a spec não diz o que é uma leitura que falha quando o broker responde 200 com outro corpo; o caso de `:296` usa `events: "none"`, que o código itera como lista vazia (F3 vive) |
| PAP-39 | Ambiente sem `CLAUDE*`, com `SQUAD_NAME` e `SQUAD_ROLE` | `test/unit/launch-args.test.ts:273`–`:282` objeto inteiro, `MY_CLAUDE` fica, a entrada não muda; `test/unit/launch.test.ts:188` | S | ✅ PASS |
| PAP-40 | Os argumentos, nesta ordem | `test/unit/launch-args.test.ts:299`–`:324` vetor inteiro; `:328`–`:343`; `:369`–`:373`; `test/unit/launch.test.ts:174`–`:187` | S | ✅ PASS |
| PAP-41 | Uma linha `squad: ` na saída de erro, nenhum processo, código 1 | `test/unit/launch.test.ts:464`–`:468`; `test/integration/cli.test.ts:69`–`:71` `expect(res.err).toMatch(/^squad: .*nada.*\r?\n$/)`, código 1 | S | ✅ PASS. Nenhuma causa dos testes tem mais de uma linha; a de git tem, e o trecho que a junta numa linha não é exercitado (F6 vive) |
| PAP-42 | Cada causa falha sem criar worktree nem copiar | `test/unit/launch.test.ts:475`, `:479`, `:483`, `:487`, `:491`, `:496`, `:502`–`:506`, `:511`, `:516`, cada uma por `refused` (`:469`, `:470`); `test/unit/launch-args.test.ts:47`, `:52`, `:57`, `:61`–`:63`, `:72` | S | ✅ PASS ⚠️ precisão: o que é uma opção e onde ela pode vir |
| PAP-43 | `ready` e depois `toolsFor(papel)`, nenhuma tool de outro papel | `test/unit/launch-args.test.ts:127`–`:129`; `:156`–`:175` a lista do worker escrita à mão; `:177` | S | ✅ PASS |
| PAP-44 | Regras `Bash(git …:*)` por papel, em ordem | `test/unit/launch-args.test.ts:134` `toEqual(BASH[role])`; `:149`; `:182`–`:185` | S | ✅ PASS |
| PAP-45 | `win32`: as mesmas com `PowerShell(` depois; fora dele, nenhuma | `test/unit/launch-args.test.ts:138`; `:142`–`:144`; `test/unit/launch.test.ts:211`–`:222` | S | ✅ PASS |
| PAP-46 | As linhas do system prompt | `test/unit/launch-args.test.ts:200`–`:206`, `:211`–`:213`, `:218`–`:223`, `:228`–`:233`, `:238`–`:242`, `:247`–`:254` `toBe` com o texto inteiro | S | ✅ PASS |
| PAP-47 | `--dangerously-skip-permissions` no lugar do modo e da lista | `test/unit/launch-args.test.ts:348`–`:361`; `test/unit/launch.test.ts:228`–`:239` | S | ✅ PASS |
| PAP-48 | Branch da feature em checkout em outra árvore: falha como PAP-57 | `test/unit/launch-worktree.test.ts:152`–`:154`; `test/unit/launch.test.ts:531`–`:534` | S | ✅ PASS |
| PAP-49 | Nome dado e online: abre do mesmo jeito | `test/unit/launch.test.ts:323`–`:327` | S | ✅ PASS |
| PAP-50 | Comando que não roda: falha com o nome dele | `test/unit/launch.test.ts:541`–`:545`; `test/integration/cli.test.ts:93` `toMatch(/^squad: .*\r?\n$/)`, `:94` `toContain(command)`, `:96` código 1, `:97`–`:98` nada criado | R | ✅ PASS |
| PAP-51 | Mother no checkout principal, nada criado | `test/unit/launch.test.ts:343`–`:350` | S | ✅ PASS |
| PAP-52 | `<diretório de worktrees>/<nome>` | `test/unit/launch.test.ts:358`–`:363`, `:372`–`:375`; `test/unit/config.test.ts:103`–`:104`, `:108` | S | ✅ PASS |
| PAP-53 | Worker e judge destacados na ponta do branch da feature aberta, ou no `HEAD` | `test/unit/launch-worktree.test.ts:86`–`:89`, `:96`–`:100`, `:107`–`:111`; `test/unit/launch.test.ts:400`–`:402`, `:431`–`:433`, `:439`–`:440` | S | ✅ PASS. Todo log dos testes tem uma feature só: a aberta depois de uma fechada não é exercitada (F1 vive) |
| PAP-54 | Leader no branch da feature aberta, ou destacado no `HEAD` | `test/unit/launch-worktree.test.ts:119`–`:122` `expect(branch(dir)).toBe(FEATURE)`; `:129`–`:132`; `:139`–`:143`; `test/unit/launch.test.ts:424`–`:425` | S | ✅ PASS. A mesma ressalva de PAP-53 (F1) |
| PAP-55 | Worktree que já existe: usado como está | `test/unit/launch-worktree.test.ts:253`–`:258`, `:267`–`:271`; `test/unit/launch.test.ts:411`–`:418` | S | ✅ PASS |
| PAP-56 | Cópia dos `.env*` não versionados, sem sobrescrever | `test/unit/launch-worktree.test.ts:194`–`:197`; `:206`–`:207`; `:217`–`:218`; `:228`–`:230` | S | ✅ PASS |
| PAP-57 | `git worktree add` falha: mensagem do git, nada copiado | `test/unit/launch-worktree.test.ts:170`–`:174`; `test/unit/launch.test.ts:529`–`:534` | S | ✅ PASS. As duas mensagens do git usadas têm uma linha (F6) |
| PAP-58 | De dentro de um worktree, como do checkout principal | `test/unit/launch-worktree.test.ts:64`–`:67`; `test/unit/launch.test.ts:385`–`:390`, `:344`; pelo processo, de um subdiretório: `test/integration/cli.test.ts:143` e `:164` | S | ✅ PASS |
| PAP-59 | `bin.squad`, os quatro comandos, uso com 0 e 1 | `test/integration/cli.test.ts:54`–`:56`, `:62`–`:64`, `:69`–`:71`, `:179`–`:181` mesmo código e mesma saída de erro de `bun tui.ts`, `:186` `expect(pkg.bin).toEqual({ squad: "./cli.ts" })` | R | ✅ PASS |
| PAP-60 | Frontmatter e as sete seções, em ordem | `test/unit/skills.test.ts:231` nos quatro papéis, pelo conferidor de `:161`–`:173` | S | ✅ PASS |
| PAP-61 | Só tools do papel entre crases, e as obrigatórias | `test/unit/skills.test.ts:235`, conferidor em `:180`–`:187` | S | ✅ PASS |
| PAP-62 | `Start`: ping e `ready`, `state` antes de tudo, agir pelo que devolve, `git show <spec_commit>:<spec_ref>` | `test/unit/skills.test.ts:239`; prosa em `SKILL.md:16`–`:23` das quatro | S | ✅ PASS |
| PAP-63 | Proíbe o aviso de recebimento | `plugin/skills/worker/SKILL.md:27`, `judge/SKILL.md:27`, `leader/SKILL.md:27`, `mother/SKILL.md:27`: "Never send a message whose only content is to say that something was received, read or started." | S | ✅ PASS |
| PAP-64 | `Asking`: seis ordens | `worker/SKILL.md:51`–`:57`, `judge/SKILL.md:51`–`:57`, `leader/SKILL.md:70`–`:76`, `mother/SKILL.md:59`–`:65` | S | ✅ PASS |
| PAP-65 | `Credentials`: `blocked`, pergunta bloqueante com o lugar e a confirmação; proíbe pedir o valor e escrever segredo | `worker/SKILL.md:63`–`:67`, `judge/SKILL.md:63`–`:67`, `leader/SKILL.md:82`–`:86`, `mother/SKILL.md:71`–`:75` | S | ✅ PASS |
| PAP-66 | `Irreversible actions` de worker, leader e judge: as cinco, e nenhuma sem resposta a pergunta bloqueante ao nível de cima | `worker/SKILL.md:73`–`:79`, `judge/SKILL.md:73`–`:79`, `leader/SKILL.md:92`–`:98` | S | ✅ PASS ⚠️ precisão: PAP-66 e PAP-68 dão respostas diferentes ao merge de um worker |
| PAP-67 | `feature_closed` encerra as perguntas, inclusive a bloqueante esperada; parar sem enviar mais nada | `worker/SKILL.md:83`, `judge/SKILL.md:83`, `leader/SKILL.md:104`, `mother/SKILL.md:110` | S | ✅ PASS |
| PAP-68 | `Your work` do worker: oito ordens | `test/unit/skills.test.ts:252`; `worker/SKILL.md:35`–`:45` | S | ✅ PASS |
| PAP-69 | `Your work` do judge: seis ordens | `test/unit/skills.test.ts:256`; `judge/SKILL.md:35`–`:43` | S | ✅ PASS |
| PAP-70 | `Your work` do leader: sete ordens | `test/unit/skills.test.ts:260`; `leader/SKILL.md:35`–`:64` | S | ✅ PASS |
| PAP-71 | `Your work` da mother: cinco ordens | `test/unit/skills.test.ts:264`; `mother/SKILL.md:33`–`:53` | S | ✅ PASS |
| PAP-72 | `Delivery (until the gate exists)` depois de `Irreversible actions`, a linha da Gate nas duas, as ordens de cada uma, nenhuma tool de gate | `test/unit/skills.test.ts:268`, `:273`; `mother/SKILL.md:79`, `:89`, `:93`, `:95`, `:99`–`:102` | S | ✅ PASS |
| PAP-73 | README com `bun link`, `squad start` dos quatro, `squad tui`, `--skip-permissions`; `broker/CLAUDE.md` com `launch.ts`, `roles.ts`, o arquivo de credencial e `plugin/` | `README.md:33` a seção; `:40` `bun link`; `:46`–`:49` os quatro papéis; `:55` `squad tui`; `:63` `--skip-permissions`; `broker/CLAUDE.md:18` o arquivo de credencial; `:21` `roles.ts`; `:22` `launch.ts`; `:42` `../plugin/` | S | ✅ PASS |
| PAP-74 | Antes da primeira seção: o projeto é o diretório de trabalho, o diretório da skill é do plugin, proibido mexer nele | `test/unit/skills.test.ts:243`; `SKILL.md:12` das quatro: "Your project is the working directory of this session. The directory this skill was loaded from belongs to the squad plugin, not to your project: never read, write or run anything there." | S | ✅ PASS |
| PAP-75 | `Start`: `state` no turno de `ready`, buscar as tools pelo nome, não encerrar o turno entre os dois | `test/unit/skills.test.ts:247`; `SKILL.md:17` das quatro | S | ✅ PASS |

**Status**: ❌ Gaps present: 74 de 75 com evidência que bate com a spec (20 rederivados, 55 abertos e conferidos, 0 levados sem abrir); PAP-37 em aberto na entrada e na saída padrão; 7 lacunas de precisão da spec

O que abri para as 55 linhas `S`: por inteiro, `test/unit/launch.test.ts`, `launch-args.test.ts`, `launch-worktree.test.ts`, `hook-usage.test.ts`, `hook-session.test.ts`, `hook-nudge.test.ts`, `roles.test.ts`, `plugin-manifest.test.ts`, `test/integration/hook-turn-started.test.ts`, os quatro `SKILL.md`, `plugin/roles.json` e os três manifestos do plugin; em parte, `test/unit/skills.test.ts` (linhas 1 a 285: o conferidor e os testes das skills como estão; não as recusas de `:287` em diante), `test/unit/config.test.ts` (70 a 118), `test/integration/server.test.ts` (300 a 337), e de `README.md` e `broker/CLAUDE.md` as linhas citadas. Nenhuma linha amostrada estava errada: os números de linha da volta 1 valem em `8f4e442` para todo arquivo que não mudou.

As skills: li as quatro por inteiro e conferi contra a tabela cláusula por cláusula da volta 1 (`validation-round-1.md`, "As quatro skills, cláusula por cláusula"). Toda linha citada lá tem a frase que a tabela diz. Os arquivos não mudaram desde `0848c8f`.

### PAP-08 e PAP-31 como estão escritos agora

- **PAP-08** (`spec.md:169`): "o registro responde à tool com sucesso e o `peer_joined` é gravado; o encerramento grava o `peer_left` e o processo sai com código 0". Os quatro observáveis têm asserção: `server-credential.test.ts:85`–`:86` (sucesso), `:87`–`:89` (`peer_joined`), `:106`–`:109` (`peer_left`), `:111` (código 0, com o literal).
- **PAP-31** (`spec.md:228`): "responde com status diferente de 200". `hook-stop.test.ts:293`–`:309`: o `GET /events` responde 500 com o log de um broker real em que `worker-1` deve o `result` de `TKT-13`; a saída padrão é vazia (`:303`) e os dois `usage` saem (`:304`–`:308`). O teste distingue: sem a conferência do status o hook bloquearia (S10 morre nele).

### O código de saída lido pelo `_process` privado

`helpers.ts:227`–`:228` tira `_process` do transporte por um cast e escuta o `exit` dele. Julgo evidência boa de "o processo sai com código 0", por quatro razões:

1. `_process` é o filho que o transporte abre com `process.execPath` e `server.ts` como argumento, sem shell (`node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js:65`, SDK 1.32.1): o código lido é o do próprio servidor.
2. A corrida de `server-credential.test.ts:111` dá 1500 ms. O `close()` do transporte só manda `SIGTERM` 2000 ms depois de fechar a entrada (`stdio.js`, `close`): um código 0 dentro de 1500 ms é saída por conta própria.
3. Distingue: sem o `try` em volta do `rmSync`, o teste falha com `Expected: 0`, `Received: 1` (V6, abaixo).
4. Não passa por engano se o campo sumir: com `_process` indefinido, `server.once` lança em `startSession` e todo teste que abre uma sessão falha.

A ressalva é de manutenção: é um campo privado de uma biblioteca de terceiros. Uma versão nova do SDK que o renomeie quebra os testes com barulho, não em silêncio.

---

## Discrimination Sensor

Uma mutação por vez dentro do clone, os testes que a deveriam matar, `git checkout -- <arquivo>` e `git status --porcelain` vazio antes da seguinte. Sem `git stash`. Controle: o gate inteiro passa sem mutação.

### Os cinco sobreviventes da volta 1, reinjetados

| Mutation | File:line | Description | Tests run | Killed? |
| -------- | --------- | ----------- | --------- | ------- |
| C1 | `broker/cli.ts:67` | PAP-37: `stdio` `ignore` nos três: a sessão não herda entrada, saída nem erro | cli | ✅ Morto, 2 falham: `PAP-37: start mother gives the session command the standard error of the launcher and exits with its code` e `PAP-37: start worker opens the session command in a worktree of the repository it runs from and exits with its code` |
| C2 | `broker/cli.ts:67` | PAP-37: o launcher sai com 0 qualquer que seja o código da sessão | cli | ✅ Morto, os mesmos 2 |
| C6 | `broker/cli.ts:62` | PAP-37, PAP-58: `start` roda a partir do diretório de `broker/`, não do diretório atual | cli | ✅ Morto, os mesmos 2. A saída de erro recebida: `squad: …\verify2\broker is not inside a git repository` |
| V6 | `broker/server.ts:388` | PAP-08: sem o `try` em volta do `rmSync` | server-credential | ✅ Morto, 1 falha: `PAP-08: with the credential file swapped for a directory that is not empty, the server records the peer_left and exits with 0`, `Expected: 0`, `Received: 1` |
| S10 | `plugin/hooks/stop.ts:27` | PAP-31: sem a conferência do status de `/events` | hook-stop | ✅ Morto, 1 falha: `PAP-31: with a status 500 for /events the hook does not block and sends the usage, even with a log in which the worker owes a result` |

**C6 e o `GIT_CEILING_DIRECTORIES`.** O teste dá ao CLI `GIT_CEILING_DIRECTORIES` igual à raiz do squad (`cli.test.ts:141`). Com ele, um launcher que tome `broker/` por diretório atual não acha repositório, falha com `squad: … is not inside a git repository`, e os dois testes caem na primeira asserção (`:153`, `:161`). O mutante morre pela razão certa: a diferença observada vem do diretório que o `launch` recebeu. A variável também protege: sem ela, o mutante criaria um worktree no repositório do squad.

Para saber se a asserção de lugar distingue sozinha, rodei C6 com a linha da variável tirada do teste (diagnóstico, só no clone). O teste da mother passa: sem a variável ele não mata C6. O do worker falha na asserção de `cli.test.ts:164`: o repositório do teste fica só com o checkout principal. Ou seja, `:164` distingue por si, e a variável é o que faz o teste da mother matar e o que impede a escrita no repositório do squad. O diagnóstico deixou, como previsto, um worktree registrado no `.git` do clone, que removi com `git worktree prune`; o repositório real não foi tocado.

Duas mutações que criam o worktree no lugar errado, ambas mortas: C8 (o `SQUAD_WORKTREES` do ambiente não chega ao `launch`) cai em `cli.test.ts:164`; C9 (dois níveis acima do diretório atual) cai em `:94`, `:153` e `:161`.

### Mutações novas

| Mutation | File:line | Description | Tests run | Killed? |
| -------- | --------- | ----------- | --------- | ------- |
| C1b | `broker/cli.ts:67` | PAP-37: só a saída padrão deixa de ser herdada (`["inherit", "ignore", "inherit"]`) | cli | ❌ Sobreviveu (12 pass, 0 fail) |
| C1c | `broker/cli.ts:67` | PAP-37: só a entrada deixa de ser herdada (`["ignore", "inherit", "inherit"]`) | cli | ❌ Sobreviveu (12 pass, 0 fail) |
| C8 | `broker/cli.ts:61` | PAP-37, PAP-52: o `SQUAD_WORKTREES` do ambiente não chega ao `launch` | cli | ✅ Morto, 1 falha, em `cli.test.ts:164` |
| C9 | `broker/cli.ts:62` | PAP-37: o `launch` recebe dois níveis acima do diretório atual | cli | ✅ Morto, 3 falham. Primeiro: `PAP-50: start with a session command that does not exist exits 1 and names the command` |
| F1 | `broker/launch.ts:216` | PAP-53, PAP-54: só a primeira feature do log é olhada (`features(events).slice(0, 1).find(...)`) | launch, launch-worktree, launch-args, cli | ❌ Sobreviveu (123 pass, 0 fail) |
| F2 | `broker/launch.ts:212` | PAP-38: mother, leader e judge também passam pela regra de quem está online | launch | ✅ Morto, 3 falham. Primeiro: `PAP-38: without a name the mother takes its role as its name, whoever is online` |
| F3 | `broker/launch.ts:186` | PAP-38: o launcher não confere se `events` é uma lista | launch | ❌ Sobreviveu (38 pass, 0 fail) |
| F4 | `broker/launch.ts:69` | PAP-45: no `win32` as regras `PowerShell` vêm antes das `Bash` | launch-args, launch | ✅ Morto, 6 falham. Primeiro: `PAP-45: on win32 the mother has the same rules again for PowerShell, after those of Bash` |
| F5 | `broker/launch.ts:136` | PAP-55, PAP-57: um arquivo no caminho do worktree é tomado por worktree que já existe | launch-worktree, launch | ✅ Morto, 1 falha: `PAP-57: a git worktree add that fails gives the message of git in one line and copies nothing` |
| F6 | `broker/launch.ts:146` | PAP-41, PAP-57: a mensagem do git não é juntada numa linha | launch-worktree, launch, cli | ❌ Sobreviveu (69 pass, 0 fail) |
| F7 | `plugin/hooks/usage.ts:85` | PAP-18: os arquivos de `subagents/` são lidos na ordem inversa dos nomes | hook-usage, hook-stop | ✅ Morto, 1 falha: `PAP-18: the files of subagents are read in the order of their names, after the main transcript` |
| F8 | `plugin/hooks/usage.ts:85` | PAP-18: todo arquivo de `subagents/` é lido, não só `*.jsonl` | hook-usage, hook-stop | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| F9 | `plugin/hooks/usage.ts:82` | PAP-18: `subagents/` é procurado ao lado do transcript, não em `<transcript sem .jsonl>/` | hook-usage, hook-stop | ✅ Morto, 14 falham. Primeiro: `PAP-23: the log gains one usage per model, in ascending order of the model, with the sums…` |
| F10 | `plugin/hooks/session.ts:39` | PAP-13, PAP-27: o prazo de 2000 ms para de valer quando o status chega, e o corpo pode nunca acabar | hook-session, hook-turn-started | ✅ Morto, 1 falha: `PAP-13: call gives up on a server that answers the status and never ends the body` |
| F11 | `broker/roles.ts:30` | PAP-33: basta um texto não vazio na lista (`every` vira `some`) | roles | ✅ Morto, 4 falham. Primeiro: `PAP-33: a valid file with the four roles is returned as read` |
| F12 | `plugin/hooks/stop.ts:48` | PAP-26: um `session_id` vazio conta como conhecido | hook-stop | ✅ Morto, 1 falha: `PAP-26: a payload without a session_id records a usage of the session_id unknown, and its transcript is not read` |
| F13 | `broker/launch.ts:151` | PAP-56: um diretório `.env*` também é copiado | launch-worktree | ✅ Morto, 1 falha: `PAP-56: the regular files of the root that start with .env and git does not track are copied with their content` |
| F14 | `broker/launch.ts:218` | PAP-52: o worktree é criado e a sessão abre no checkout principal | launch, cli | ✅ Morto, 10 falham. Primeiro: `PAP-37: start worker opens one process, claude, with the arguments, the environment and the worktree of the session…` |
| F15 | `broker/shared/config.ts:55` | PAP-06, PAP-20: o arquivo de credencial ignora o ambiente dado | config, hook-session, server-credential | ✅ Morto, 4 falham. Primeiro: `PAP-06: the credential file of a name is the path of the database followed by .<name>.id` |
| F16 | `plugin/hooks/stop.ts:51` | PAP-23: só o primeiro modelo ganha `usage` | hook-stop | ✅ Morto, 13 falham. Primeiro: `PAP-23: the log gains one usage per model, in ascending order of the model…` |
| F17 | `broker/launch.ts:93` | PAP-39: um `SQUAD_NAME` que já está no ambiente do launcher vence o da sessão | launch-args, launch | ✅ Morto, 1 falha: `PAP-39: the session has the environment of the launcher without the CLAUDE variables, with its name and role` |

**Sensor depth**: acima do nível leve: 5 reinjeções e 21 mutações novas de comportamento, em `broker/cli.ts` (4), `broker/launch.ts` (9), `plugin/hooks/` (6), `broker/roles.ts` (1) e `broker/shared/config.ts` (1)
**Result**: 5 de 5 reinjetados mortos; 16 de 21 novos mortos, 5 sobreviventes - FAIL

Os cinco sobreviventes. Nenhum é mutante equivalente: para os três do launcher medi a diferença com uma sonda fora do clone, que chama o `launch` do clone com git real, primeiro no código original e depois em cada mutante.

- **C1b e C1c** (`broker/cli.ts:67`, PAP-37). O AC pede "entrada, saída e erro herdados do terminal". Os dois testes novos só olham a saída de erro (`cli.test.ts:153`, `:161`): `git` escreve a recusa ali e nada na saída padrão, `runCli` dá `stdin: "ignore"` ao CLI (`:39`) e nenhum dos dois testes olha `res.out`. Uma sessão sem a entrada do terminal não lê o teclado, e é o que C1c faz. A evidência que existe é de sessão real (RS-02, RS-03), não automática.
- **F1** (`broker/launch.ts:216`, PAP-53 e PAP-54, e a definição "Feature aberta, para o launcher"). Todo log dos testes tem uma feature só (`launch.test.ts:86`–`:95`, sempre `feature_id: 1`). Com uma feature aberta e fechada e uma segunda aberta em `feat/two`, a sonda deu: original, worktree do worker na ponta de `feat/two`; mutante, no `HEAD` do checkout principal. É o caso normal de um log que dura mais de uma feature.
- **F6** (`broker/launch.ts:146`, PAP-41 e PAP-57). As duas mensagens do git que os testes provocam têm uma linha, então `not.toContain("\n")` (`launch-worktree.test.ts:171`, `launch.test.ts:466`) não distingue. A sonda usou um worktree registrado cujo diretório foi apagado à mão: o git responde em duas linhas (`… is a missing but already registered worktree;` e `use 'add -f' to override, or 'prune' or 'remove' to clear`). Original: uma linha. Mutante: a linha de `squad: ` com uma quebra no meio.
- **F3** (`broker/launch.ts:186`, PAP-38). O único corpo sem lista que os testes dão é `events: "none"` (`launch.test.ts:296`), e um texto é iterável: o código o percorre como uma lista vazia. Com `events` igual a `7`, a um objeto ou a `true`, a sonda deu: original, `worker-1` e a sessão abre; mutante, `squad: Spread syntax requires ...iterable[Symbol.iterator] to be a function` e código 1. O AC só diz "se a leitura do log falha"; o que conta como falha com um 200 de outro corpo está numa leitura de `tasks.md`, não na spec.

Não injetado: o modo `0600` de `broker/server.ts:292`. A única asserção do modo é pulada no Windows (`server-credential.test.ts:57`), então a mutação sobreviveria aqui por construção. Fica para a suíte do Linux.

---

## Interactive UAT Results (if performed)

Não realizado: não há usuário nesta execução. O que só uma sessão real mostra está em `real-sessions.md`.

---

## Documentos

**`real-sessions.md`.** `git diff 0848c8f..8f4e442 -- .specs/features/papeis/real-sessions.md` tem dois trechos, 3 linhas a mais e 2 a menos, e são as três correções que a volta 1 pediu, nada além:

1. O cabeçalho conta agora "Onze itens exercitados, RS-11 em parte, RS-14 só no Windows e RS-12 não exercitado" (`real-sessions.md:4`–`:5`). Bate com a tabela: onze linhas `Exercitado`, RS-11 `Exercitado em parte`, RS-12 `Não exercitado`, RS-14 `Exercitado no Windows`.
2. Em RS-10, "menos de 7 minutos" diz de onde vem: as horas 04:25:27 e 04:32:02 da saída de `dev.py`, "que a listagem do log não guarda" (`real-sessions.md:32`).
3. Em RS-10, "T2 dependendo de T1" diz de onde vem: o `depends_on` de T2 lido na saída de `dev.py` (`real-sessions.md:32`).

`dev.py` imprime de fato a hora e os tickets de um `plan` (`real-session-tools/dev.py:25` e `:30`). A hora é a do relógio de quem roda `dev.py` quando ele vê o evento, não a do evento. A saída em si não está no repositório: as duas frases agora têm fonte declarada, e a fonte não pode ser relida.

**`tasks.md`.** T24, T25 e T26 estão marcadas, cada uma no commit da sua correção. O reparo de T24 está em "Task Completion".

---

## Code Quality

Sobre os arquivos mudados desde a volta 1: `broker/test/integration/cli.test.ts`, `server-credential.test.ts`, `hook-stop.test.ts` e `helpers.ts`.

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ 68, 4, 18 e 6 linhas. Repetição pequena: o `git` de módulo de `cli.test.ts:104` repete o `git` local do teste de PAP-50 (`:78`–`:82`), que não foi tocado |
| Surgical changes | ✅ Só os quatro arquivos de teste. `git diff 0848c8f..8f4e442 --stat` não tem arquivo de `broker/` fora de `test/` nem de `plugin/` |
| No scope creep | ✅ Um caso novo em cada arquivo e um campo `exited` no helper |
| Matches patterns | ✅ Nomes de teste começando pelo requisito, repositório temporário num caminho com espaço, `realpathSync` do temporário, comentários na densidade dos vizinhos |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ PAP-08 e PAP-31: sim, com o literal. PAP-37: o código 129 e a saída de erro sim; a entrada e a saída padrão não |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ CLI: o `start` que abre a sessão agora roda pelo processo real, como mother e como worker. Falta a cláusula das três correntes de PAP-37 |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Os três testes novos são `PAP-37` (dois) e `PAP-31` |
| Documented guidelines followed: `broker/CLAUDE.md`, regras de `tasks.md`, `.specs/LESSONS.md` | ✅ L-020: 129 e 0 como literais. L-050: o `spawn` e o `cwd` que `cli.ts` injeta passam pelo processo real. L-071: PAP-08 afirma o que acontece depois do passo que falha |

**Nenhuma asserção anterior foi enfraquecida.** Em `git diff 0848c8f..8f4e442 -- broker/test` as únicas linhas removidas são: dois `import` trocados por versões com mais nomes (`cli.test.ts:2`, `helpers.ts:2`), o `return` de `startSession` trocado por um com `exited` a mais (`helpers.ts:252`), e o título de um teste de PAP-08 (`server-credential.test.ts:94`: de "the session closes the same way" para "the server records the peer_left and exits with 0"). Esse teste manteve todas as asserções que tinha e ganhou uma (`:111`).

Contagem: 1623 pass na volta 1, 1626 agora. Os três a mais são os três testes novos.

---

## Edge Cases

- [x] PAP-20: espaços e quebras em volta da credencial. `test/unit/hook-session.test.ts:29`–`:30`, `test/integration/hook-turn-started.test.ts:61`
- [x] PAP-21: payload sem `transcript_path` texto. `test/unit/hook-usage.test.ts:235`–`:237`, `test/integration/hook-stop.test.ts:150`
- [x] PAP-22: `SQUAD_NAME` fora do squad. `test/unit/hook-nudge.test.ts:230`, `test/integration/hook-stop.test.ts:332`–`:338`
- [x] PAP-48: branch da feature em checkout em outra árvore. `test/unit/launch-worktree.test.ts:152`–`:154`
- [x] PAP-49: nome dado e já online. `test/unit/launch.test.ts:323`–`:327`

---

## Gate Check

- **Gate command**: de `broker/` do clone, `bun node_modules/typescript/bin/tsc --noEmit` e `bun test`
- **tsc**: código de saída 0
- **Totals**: 1626 passed, 0 failed, 5 skipped; 1631 testes em 75 arquivos, 109295 asserções, 303,03 s. Uma execução, sem repetição: `EVT-43`, `PEER-28` e `PEER-29` passaram
- **Test count before feature**: 1303 pass, 4 skip (1307 em 63 arquivos)
- **Test count after feature**: 1626 pass, 5 skip (1631 em 75 arquivos)
- **Delta**: +324 testes, +12 arquivos, nenhum removido; +3 desde a volta 1
- **Skipped tests**: quatro anteriores à fatia: `PEER-44` duas vezes (`test/integration/cli.test.ts:255`, o laço de dois casos, sinal de listener por plataforma), `PEER-14` (`test/unit/presence.test.ts:6`, pid de outro usuário, Windows) e o produto completo de `QST-99, QST-78` sem `SQUAD_TEST_FULL` (`test/unit/tui-loop.test.ts:990`). Um da fatia: `PAP-06: the credential file has mode 0600` (`test/integration/server-credential.test.ts:57`), porque o Windows não tem modo de arquivo; roda no Linux
- **Failures**: nenhuma
- **Linux**: informado pelo orquestrador, não verificado por este agente. Em `0848c8f`: contêiner `oven/bun:1.4.2`, `tsc` 0 e três execuções com 1627 pass, 1 skip, 0 fail. Em `8f4e442`, pelo que `handoff-codex.md:26`–`:28` registra: `tsc` 0 e três execuções com 1630 pass, 1 skip, 0 fail, com a asserção do modo `0600` de PAP-06 passando. É o quinto item das "Success Criteria" e não entrou neste veredito

---

## Lacunas de precisão que restam

Das oito da volta 1, duas fecharam com o texto novo (PAP-08 e PAP-31). As outras seis seguem como estavam, porque o texto dos ACs não mudou; cada uma tem a leitura fixada em "Leituras da spec" de `tasks.md` e teste do comportamento. Uma é nova.

| AC | O que a spec não diz | Onde está decidido hoje |
| -- | -------------------- | ----------------------- |
| PAP-01 | O que é "arquivo do plugin" dentro de `broker/` | `tasks.md`, e `test/unit/plugin-manifest.test.ts:17` |
| PAP-15 | Um `message.id` que não é texto não vazio | `test/unit/hook-usage.test.ts:102`–`:106` |
| PAP-18 | Um arquivo de `subagents/` que não pode ser lido | `test/unit/hook-usage.test.ts:212`–`:219` |
| PAP-33 | `workflows: null` | `test/unit/roles.test.ts:103` |
| PAP-42 | O que é uma opção e em que posição pode vir | `test/unit/launch-args.test.ts:61`–`:63` |
| PAP-66 com PAP-68 | Merge ou push de um worker com resposta que autoriza | `plugin/skills/worker/SKILL.md:79` |
| PAP-38 e a definição "Feature aberta, para o launcher" (nova) | O que é uma leitura que falha quando o broker responde: PAP-31 diz para o hook (status diferente de 200, ou algo que não é `{ events: [...] }`); para o launcher a spec só diz "se a leitura falha" | `tasks.md`, `broker/launch.ts:184`–`:186`, e `test/unit/launch.test.ts:295`–`:296`, com um corpo que não distingue (F3) |

---

## Fix Plans (if issues found)

### Fix 1: a entrada e a saída padrão herdadas não têm asserção (PAP-37)

- **Root cause**: o comando posto no lugar da sessão (`git`) só escreve na saída de erro e não lê nada, e `runCli` fecha a entrada do CLI (`cli.test.ts:39`). C1b e C1c sobrevivem.
- **Fix task**: em `test/integration/cli.test.ts`, um `start` até o fim com um comando de sessão que lê a entrada e escreve na saída padrão, e com um texto conhecido dado à entrada do CLI. O teste tem de provar: o que foi escrito na entrada do CLI chega ao comando (C1c), e o que o comando escreve na saída padrão chega à saída padrão do CLI (C1b).
- **Done when**: C1b e C1c morrem, e C1, C2 e C6 continuam mortos.
- **Priority**: Major

### Fix 2: a feature aberta depois de uma fechada (PAP-53, PAP-54)

- **Root cause**: todo log dos testes do launcher tem uma feature só. F1 sobrevive.
- **Fix task**: em `test/unit/launch.test.ts`, um log com a feature 1 aberta e fechada e a feature 2 aberta num branch que existe: o worktree do worker nasce na ponta do branch da feature 2 e o do leader nasce nesse branch.
- **Done when**: F1 morre.
- **Priority**: Major

### Fix 3: a mensagem do git com mais de uma linha (PAP-41, PAP-57)

- **Root cause**: as mensagens do git que os testes provocam têm uma linha. F6 sobrevive.
- **Fix task**: um caso em que o git responde em mais de uma linha (um worktree registrado cujo diretório foi apagado dá duas) e a asserção de que a linha de `squad: ` não tem quebra e traz as duas partes da mensagem.
- **Done when**: F6 morre.
- **Priority**: Minor

### Fix 4: `events` que não é lista na leitura do launcher (PAP-38)

- **Root cause**: o corpo sem lista do teste é um texto, que o código itera sem erro. F3 sobrevive. A spec não define o caso para o launcher.
- **Fix task**: dizer em PAP-38, ou na definição "Feature aberta, para o launcher", que um status diferente de 200 e um corpo que não é `{ events: [...] }` são leitura que falhou, como PAP-31 diz para o hook; e juntar ao laço de `test/unit/launch.test.ts:293`–`:297` um corpo com `events` que não é iterável (um número ou um objeto).
- **Done when**: F3 morre.
- **Priority**: Minor

### Fix 5: documentos

- **Fix task**: acertar o "Done when" de T24 (`tasks.md:655`), que diz "uma árvore só" onde o teste afirma "as mesmas de antes"; fechar o `Status` de `tasks.md`; levar para o texto dos ACs as seis leituras que seguem em `tasks.md`.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-01 a PAP-36 | Implementing | ✅ Verified |
| PAP-37 | Implementing | ❌ Needs Fix (Fix 1) |
| PAP-38 | Implementing | ✅ Verified, com teste a reforçar (Fix 4) |
| PAP-39, PAP-40 | Implementing | ✅ Verified |
| PAP-41 | Implementing | ✅ Verified, com teste a reforçar (Fix 3) |
| PAP-42 a PAP-52 | Implementing | ✅ Verified |
| PAP-53, PAP-54 | Implementing | ✅ Verified, com teste a reforçar (Fix 2) |
| PAP-55, PAP-56 | Implementing | ✅ Verified |
| PAP-57 | Implementing | ✅ Verified, com teste a reforçar (Fix 3) |
| PAP-58 a PAP-75 | Implementing | ✅ Verified |

PAP-08 e PAP-31, que a volta 1 deixou em aberto, estão verificados. PAP-06 fica verificado com a asserção do modo `0600` rodando só no Linux, pelo que o orquestrador informa.

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 74 de 75 ACs batem com a spec (20 rederivados, 55 abertos e conferidos, 0 levados sem abrir); 7 lacunas de precisão (PAP-01, PAP-15, PAP-18, PAP-33, PAP-42, PAP-66 com PAP-68, e PAP-38 com a definição de feature aberta)
**Sensor**: 5 de 5 reinjetados mortos; 16 de 21 novos mortos; sobrevivem C1b e C1c (PAP-37), F1 (PAP-53, PAP-54), F6 (PAP-41, PAP-57) e F3 (PAP-38)
**Gate**: 1626 passed, 5 skipped, 0 failed; `tsc` 0. Linux informado pelo orquestrador, não verificado aqui

**What works**: as três correções da volta 1 fazem o que prometeram: os cinco mutantes morrem, PAP-08 e PAP-31 têm teste com o valor que o texto novo nomeia, o código de saída do servidor é lido de forma sólida, e a asserção de onde o worktree nasce distingue por si. Nenhum arquivo de produção mudou, nenhuma asserção foi enfraquecida, e as 55 linhas da volta 1 que abri estão certas. `real-sessions.md` tem as três correções e só elas.

**Issues found**: quatro, nenhuma de produção. 1. A entrada e a saída padrão herdadas de PAP-37 não têm asserção (Fix 1). 2. A feature aberta depois de uma fechada não é exercitada (Fix 2). 3. A mensagem do git com mais de uma linha não é exercitada (Fix 3). 4. `events` que não é lista só é testado com um texto, e a spec não define o caso para o launcher (Fix 4).

**Next steps**: Fix 1 a Fix 3 por um implementador, só de teste, com commit próprio; Fix 4 com o texto da spec confirmado pelo dev; terceira e última volta do Verifier restrita a PAP-37, PAP-38, PAP-41, PAP-53, PAP-54, PAP-57 e aos cinco mutantes desta volta.

---

## Lições registradas

Pelo `lessons.py`, só de sinal novo desta volta, todas como candidatas. As da volta 1 (L-050, L-071 a L-077) não foram registradas de novo.

- L-078: C1b e C1c, PAP-37.
- L-079: F1, PAP-53 e PAP-54.
- L-080: F6, PAP-41 e PAP-57. O texto é o da L-056, que veio da TUI; o script a gravou como lição nova, não como recorrência.
- L-081: F3, PAP-38.
- L-082: a lacuna de precisão de PAP-38 com a definição de feature aberta.

## Isolamento

`git status --porcelain` do repositório real antes: vazio. Depois: `.specs/features/papeis/validation.md` alterado por este relatório, `.specs/lessons.json` e `.specs/LESSONS.md` alterados pelo script, e nada mais. Nenhum commit, push, stash, troca de branch ou reset feito por este agente; o `HEAD` passou de `8f4e442` a `1181d25` por dois commits de documentos de outra mão. A segunda árvore de trabalho do repositório real (`squad-code-mcp.worktrees/tui-clicavel`) não foi tocada: `git worktree list` do repositório real mostra as mesmas duas árvores. O clone ficou limpo depois de cada mutação e no fim (`git status --porcelain` vazio em `8f4e442`, uma árvore só). A sonda e o script das mutações ficam fora do clone, na pasta de rascunho. Nenhum `claude` real foi executado e nenhum `broker.ts` ou `server.ts` foi iniciado à mão.
