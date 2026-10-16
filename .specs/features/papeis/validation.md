# Papéis Validation

**Result**: FAIL. Na fatia, 71 de 75 requisitos verificados: PAP-56 nesta volta, PAP-21, PAP-31 e PAP-53 na volta 4, e os outros antes. PAP-07, PAP-18, PAP-37 e PAP-39 seguem com lacuna de teste (Fix 15 a Fix 19)

**Round**: 5, reverificação dos Fix 10 a Fix 14 (T40 a T44), pedida pelo dev em 2026-10-16
**Date**: 2026-10-16
**Spec**: `.specs/features/papeis/spec.md`, PAP-01 a PAP-75, edge cases e "Success Criteria"
**Diff range**: `c8cb88c..ce5f774` (fase 10 de `test/papeis-gaps`, sobre `main` em `055d629`). A volta 4 foi `055d629..959bcb6`
**Verifier**: agente novo e independente (author ≠ verifier). Não escreveu código, testes, tarefas nem relatórios da fatia, e não é o Verifier das voltas 1 a 4.
**Environment**: volta 5: Windows 11 Pro 10.0.26200, Bun 1.3.14, clone físico `verifier5` do branch em `ce5f774`, fora do repositório, com `bun install --frozen-lockfile` próprio; Linux num contêiner `oven/bun:1.4.2` sobre uma cópia desse clone. Volta 4: Bun 1.3.14, clone `verifier4` em `959bcb6` e contêiner `oven/bun:1.3.14`. Volta 3: Bun 1.4.2, clone em `ac25e8d` e contêiner `oven/bun:1.4.2`.

Os cinco sobreviventes da volta 4 morrem, cada um no teste que a correção trouxe: W5, W12, W15 e W17 no Windows, W2 no Linux. K13, K15, K2, K1, A10 e V6 seguem mortos. Nenhum arquivo de produção mudou em `055d629..ce5f774`, e nenhuma asserção foi afrouxada: o único esperado trocado, o limite do caso de PAP-37, ficou mais estrito (10 s do caso inteiro para 5000 ms só do processo do CLI). As duas frases novas dizem o que o código faz: a caixa conta em PAP-39 (`broker/launch.ts:97`), e um link simbólico não é arquivo regular em PAP-56 (`broker/launch.ts:157`). O caso de PAP-37 mediu de 2138 a 2439 ms em oito execuções, com 2,5 s de folga até o limite. Mesmo assim a volta falha: das 10 mutações novas, 2 morrem, 3 são equivalentes com sonda, e 5 sobrevivem mudando um resultado que um requisito define. Y1: sem o tratamento de `SIGINT` (`broker/server.ts:399`), o arquivo de credencial fica no Linux (PAP-07). Y5: o `.jsonl` sai do primeiro lugar do caminho, não do fim (`plugin/hooks/usage.ts:82`, PAP-18). Y6: um `agent-b.jsonl.bak` de `subagents` conta (`plugin/hooks/usage.ts:85`, PAP-18). Y7: as três variáveis que ficam são comparadas sem caixa, e `CLAUDE_config_dir` fica (`broker/launch.ts:97`, PAP-39). Y9: o prazo da leitura do log é de 3000 ms, e não de 2000 (`broker/launch.ts:186`, PAP-37). Com Y9, um log respondido aos 2500 ms é lido, e o worker abre como `worker-2` em vez de `worker-1`; o CLI sai aos 3,14 s, abaixo do limite. PAP-56 fica verificado. Nenhum defeito de produção foi visto: em todas as sondas, o código original faz o que a spec diz.

Os parágrafos abaixo são da volta 4.

Os oito mutantes do resíduo (K1, K2, K9, K13, K15, K16, A2, A10) morrem, cada um no teste que a correção trouxe, e S10 e V6 seguem mortos. Nenhum arquivo de produção mudou em `055d629..959bcb6` e nenhuma asserção foi afrouxada. Os seis textos do Fix 9 dizem o que o código e os testes já faziam. A frase nova da definição de feature aberta (`spec.md:103`) fecha a lacuna de precisão de PAP-37 no texto. Mesmo assim a volta falha: das 18 mutações novas, 11 morrem, 2 são equivalentes com sonda, e 5 sobrevivem mudando um resultado que um requisito define. W2: sem o tratamento de `SIGTERM` (`broker/server.ts:400`) o arquivo de credencial fica no Linux (PAP-07). W5: o diretório `subagents` é procurado tirando qualquer extensão (`plugin/hooks/usage.ts:82`, PAP-18). W12: uma variável `claude_*` em minúsculas sai do ambiente (`broker/launch.ts:97`, PAP-39). W15: um link simbólico `.env*` é copiado (`broker/launch.ts:157`, PAP-56). W17: a leitura do log é abandonada 4 s depois do prazo, e o launcher sai aos 6,09 s em vez de 2,16 s; o limite de 10 s de `test/integration/cli.test.ts:240` deixa passar (PAP-37, com ressalva). Ficam verificados PAP-21, PAP-31 e PAP-53. Nenhum defeito de produção foi visto: em todas as sondas, o código original faz o que a spec diz.

Os parágrafos abaixo são da volta 3.

Os dez mutantes que sobreviveram nas voltas 1 e 2 morrem, cada um no teste que a correção trouxe. O gate está verde no Windows e no Linux. Nenhum arquivo de produção mudou depois de `6609630` e nenhuma asserção foi afrouxada, apagada ou pulada. As quatro skills dizem o que PAP-62 a PAP-72, PAP-74 e PAP-75 pedem. Mesmo assim a volta falha: das 17 mutações novas, 6 sobrevivem, e cada uma muda um resultado que um requisito define, confirmado por uma sonda que roda o código original e o mutante com a mesma entrada. Das 13 mutações que a T31 deixou vivas sem teste, concordo com 11; uma dada por equivalente não é (A2), e a outra tem um motivo que a sonda desmente (A10). Nenhum defeito de produção foi visto: o código original faz o que a spec diz em todas as sondas. O que falta são testes que distinguem.

O padrão das seis: o teste usa só a forma mais comum da entrada. Todo `.env*` dos testes é `.env` ou `.env.<algo>`; toda variável `CLAUDE*` é `CLAUDE_...` ou `CLAUDECODE`; todo arquivo de subagente se chama `agent-*.jsonl`; o único status diferente de 200 dado a `/events` é 500; toda sessão dos testes fecha com o broker de pé; e o único `transcript_path` que não é texto é `12` ou ausente.

---

## Voltas

| Volta | Intervalo | Veredito | Sobreviventes | Correção |
| ----- | --------- | -------- | ------------- | -------- |
| 1 | `f162184..0848c8f` | FAIL | C1, C2, C6 (`cli.ts`, PAP-37), V6 (`server.ts`, PAP-08), S10 (`stop.ts`, PAP-31) | T24, T25, T26 (`efb6d74`, `fa75877`, `8f4e442`), só de teste |
| 2 | `f162184..8f4e442` | FAIL | C1b, C1c (`cli.ts`, PAP-37), F1, F6, F3 (`launch.ts`, PAP-53/54, PAP-41/57, PAP-38) | T27 a T31 (`8539150`, `3166093`, `117ab87`, `a3280e3`, `ac25e8d`), só de teste, e uma frase na definição de "feature aberta, para o launcher" |
| 3 | `f162184..ac25e8d` | FAIL | K1, K2 (`launch.ts`, PAP-56, PAP-39), K13 (`server.ts`, PAP-07), K9, K15, K16 (`plugin/hooks/`, PAP-21, PAP-18, PAP-31), A2 (`launch.ts`, PAP-53) e A10 com ressalva (`launch.ts`, PAP-37) | Fix 1 a Fix 9, abaixo |
| 4 | `055d629..959bcb6` | FAIL | Os oito do resíduo morrem. Sobrevivem W2 (`server.ts`, PAP-07, só no Linux), W5 (`usage.ts`, PAP-18), W12 e W15 (`launch.ts`, PAP-39, PAP-56) e W17 com ressalva (`launch.ts`, PAP-37) | Fix 10 a Fix 14, em "Reverificação do resíduo (2026-10-16)" |
| 5 | `c8cb88c..ce5f774` | FAIL | Os cinco da volta 4 morrem (W2 no Linux). Sobrevivem Y1 (`server.ts`, PAP-07, só no Linux), Y5 e Y6 (`usage.ts`, PAP-18), Y7 (`launch.ts`, PAP-39) e Y9 (`launch.ts`, PAP-37) | Fix 15 a Fix 19, em "Reverificação dos Fix 10 a Fix 14 (2026-10-16)" |

O que foi feito nesta volta:

- Gate inteiro no clone, no Windows; e de novo no Linux, num contêiner próprio.
- As 75 linhas rederivadas da spec e do código. Li por inteiro `launch.ts`, `cli.ts`, `roles.ts`, `shared/config.ts`, os cinco arquivos de `plugin/hooks/`, os manifestos, `roles.json`, as quatro skills, e os trechos do arquivo de credencial em `server.ts`; e os arquivos de teste da fatia, com cada linha citada abaixo aberta em `ac25e8d`.
- 40 mutações, uma por vez: 10 reinjeções, 17 novas e as 13 que a T31 deixou vivas.
- 11 sondas fora do clone, que rodam o código original e o mutante com a mesma entrada.
- O diff de `broker/test` de `8f4e442..ac25e8d` lido linha a linha.
- `real-sessions.md` conferido contra os 142 eventos de `real-sessions-log.txt`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 a T26 | ✅ Done | Conferidas nas voltas 1 e 2; os arquivos de produção não mudaram depois de `6609630` |
| T27 | ✅ Done | `8539150`. C1b e C1c morrem em `test/integration/cli.test.ts:219` |
| T28 | ✅ Done | `3166093`. F1 morre em `test/unit/launch.test.ts:478` e `:485` |
| T29 | ✅ Done | `117ab87`. F6 morre em `test/unit/launch-worktree.test.ts:246` e `test/unit/launch.test.ts:604` |
| T30 | ✅ Done | `a3280e3`. F3 morre em `test/unit/launch.test.ts:318`, nos três valores |
| T31 | ⚠️ Partial | `ac25e8d`. Os nove testes novos existem e passam. Dois itens de "Done when" não se sustentam: "todo mutante vivo sem teste novo está no relatório com o motivo: equivalente ou comportamento que nenhum requisito define" (A2 não é equivalente; o motivo de A10 é falso), e a varredura dos hooks deixou passar o mesmo `!res.ok` que ela achou e corrigiu no launcher (K16) |

`tasks.md` tem 190 itens marcados e 0 em aberto. O cabeçalho ainda diz `In Progress` (`tasks.md:12`).

---

## Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`. `:N` sozinho continua o arquivo citado antes na mesma célula. Toda linha foi aberta em `ac25e8d` nesta volta.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-01 | `plugin.json` com `name` `squad`; nenhum arquivo do plugin em `broker/` | `test/unit/plugin-manifest.test.ts:13` `expect(json(".claude-plugin", "plugin.json").name).toBe("squad")`; `:18` `expect([name, existsSync(join(BROKER, name))]).toEqual([name, false])` para `.claude-plugin`, `hooks`, `skills`, `roles.json` | ✅ PASS ⚠️ precisão: o que é "arquivo do plugin" |
| PAP-02 | Um servidor só, `squad`, `bun`, `["${CLAUDE_PLUGIN_ROOT}/../broker/server.ts"]` | `test/unit/plugin-manifest.test.ts:23` `expect(json(".mcp.json").mcpServers).toEqual({ squad: { command: "bun", args: [...] } })` | ✅ PASS |
| PAP-03 | Só `UserPromptSubmit` e `Stop`, um hook `command` cada, `timeout` 10 e 20 | `test/unit/plugin-manifest.test.ts:29` chaves `["Stop", "UserPromptSubmit"]`; `:33` e `:39` `toEqual([{ hooks: [{ type: "command", command: 'bun "${CLAUDE_PLUGIN_ROOT}/hooks/…"', timeout: 10 \| 20 }] }])` | ✅ PASS |
| PAP-04 | Exatamente quatro skills, `SKILL.md` em cada | `test/unit/skills.test.ts:278` `expect(readdirSync(SKILLS).sort()).toEqual(["judge", "leader", "mother", "worker"])`; `:280` cada diretório `["SKILL.md"]` | ✅ PASS |
| PAP-05 | Instruções, descrição de `ready` e resposta a número errado com `kind="ping"` e sem `source="squad"` | `test/integration/server.test.ts:309` `toContain('kind="ping"')`, `:310` `not.toContain("source=")`; `:317`–`:319`; `:326`–`:327`; `:334`–`:336` com `isError` | ✅ PASS |
| PAP-06 | Arquivo `<SQUAD_DB>.<nome>.id` com exatamente o `id`, antes de responder, modo `0600` onde há modo | `test/integration/server-credential.test.ts:40` não existe antes; `:45` `expect(existsSync(file)).toBe(true)`; `:46`–`:50` `POST /state` com o conteúdo lido sem `trim`: 200 e `{ feature: null, ticket: null, owed: [] }`; `:52`–`:53` o `turn_started` sai como `worker-1`; `:61` `expect(statSync(file).mode & 0o777).toBe(0o600)`, pulado no Windows (`:57`); caminho em `test/unit/config.test.ts:80` e `:85` | ✅ PASS. `:61` rodou e passou no Linux deste agente, e mata o modo `0o644` lá |
| PAP-07 | O arquivo some quando o servidor encerra depois de registrado | `test/integration/server-credential.test.ts:73` some em até 1500 ms; `:75` `expect(existsSync(file)).toBe(false)`; `:76` `["peer_joined", "peer_left"]` | ❌ GAP parcial. Com o broker de pé: evidência. Com o broker já fora quando a sessão fecha: nenhuma asserção, e K13 sobrevive |
| PAP-08 | Não gravado: o registro responde com sucesso e o `peer_joined` é gravado. Não apagado: o `peer_left` é gravado e o processo sai com 0 | `test/integration/server-credential.test.ts:85`–`:89` `isError` falso, `toBe("Registered in the squad as worker-1 (worker).")`, `[["peer_joined", { peer: "worker-1", role: "worker" }]]`; `:106`–`:109` `peer_left` `unregistered`; `:111` `expect(await Promise.race([session.exited, …])).toBe(0)`; `:114` | ✅ PASS |
| PAP-09 | Registro recusado não grava arquivo | `test/integration/server-credential.test.ts:121`–`:124` `invalid_name`, nenhum arquivo, `:127` nem depois de fechar; `:135`–`:137` `name_taken`; `:153`–`:155` e `:158`–`:159` o arquivo de quem tem o nome fica igual e ainda vale | ✅ PASS |
| PAP-10 | Um único `POST /turn-started` com `{ id }` sem espaços nas pontas, código 0 | `test/integration/hook-turn-started.test.ts:52` log `[["peer_joined", "broker"], ["turn_started", "worker-1"]]`; `:61` `expect(server.requests).toEqual([{ method: "POST", path: "/turn-started", body: { id: "the-id-of-worker-1" } }])`; `:62` código 0 | ✅ PASS |
| PAP-11 | Nada na saída padrão, em nenhum caso | `test/integration/hook-turn-started.test.ts:51`, `:63`, `:72`, `:80`, `:86`, `:94`, `:103`, `:111` `expect(hook.stdout).toBe("")` | ✅ PASS |
| PAP-12 | Sem `SQUAD_ROLE`, ou vazio, ou sem arquivo, ou arquivo vazio: nenhuma chamada, saída vazia, código 0 | `test/unit/hook-session.test.ts:41`, `:45`, `:49`, `:53`, `:57` `credential(...)` nulo; pelo processo `test/integration/hook-turn-started.test.ts:70`–`:72`, `:78`–`:80` e `test/integration/hook-stop.test.ts:345`–`:347`, `:353`–`:355` `expect(server.requests).toEqual([])`, código 0, saída vazia | ✅ PASS |
| PAP-13 | Broker sem resposta em 2000 ms, status ≠ 200 ou recusa: código 0 | `test/integration/hook-turn-started.test.ts:85`, `:93`–`:95`, `:101`–`:103`, `:109`–`:112` (`hook.ms < 4000`); `test/unit/hook-session.test.ts:96` status 500, 404 e 201, `:105`, `:128`–`:129`, `:135`–`:136`; `test/unit/config.test.ts:117` `expect(HOOK_TIMEOUT_MS).toBe(2000)` | ✅ PASS |
| PAP-14 | Soma por modelo dos quatro campos | `test/unit/hook-usage.test.ts:66`–`:69` `toEqual({ "claude-opus": { input: 110, output: 220, cache_write: 330, cache_read: 440 }, "claude-sonnet": { input: 6, output: 8, cache_write: 10, cache_read: 12 } })`; `:78` | ✅ PASS |
| PAP-15 | Mesmo `message.id`: só a última linha; sem id conta sozinha | `test/unit/hook-usage.test.ts:94` `{ input: 107, output: 208, cache_write: 309, cache_read: 410 }`; `:99`; `:105` | ✅ PASS ⚠️ precisão: id que não é texto não vazio |
| PAP-16 | Campo ausente ou não inteiro ≥ 0 conta 0 | `test/unit/hook-usage.test.ts:119`–`:122`, quatro valores em cada um dos quatro campos | ✅ PASS |
| PAP-17 | Linha que não é JSON ou não é contada é ignorada | `test/unit/hook-usage.test.ts:134`–`:137`, `:142`, `:147`–`:148`, `:153`, `:159`, `:164` `toEqual(NEIGHBOURS)`; `:169` | ✅ PASS |
| PAP-18 | Todo `*.jsonl` de `subagents/` soma, com a regra do id entre todos os arquivos | `test/unit/hook-usage.test.ts:181`–`:184`; `:190`; `:199`–`:202`; `:208`–`:209`; `:216`–`:219` | ❌ GAP parcial. Todo arquivo dos testes se chama `agent-*.jsonl`: K15 sobrevive. ⚠️ precisão: arquivo de subagente ilegível |
| PAP-19 | Sem transcript principal legível: nenhum modelo, sem falhar | `test/unit/hook-usage.test.ts:224`–`:225` e `:231` `toEqual({})` | ✅ PASS |
| PAP-20 | Credencial sem espaços nem quebras nas pontas | `test/unit/hook-session.test.ts:29`–`:30`; `test/integration/hook-turn-started.test.ts:61` | ✅ PASS |
| PAP-21 | Sem `transcript_path` texto: uso como PAP-19 | `test/unit/hook-usage.test.ts:235`–`:237` para ausente, `12` e vazio; `test/integration/hook-stop.test.ts:150` `expect(usages(b)).toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]])` | ❌ GAP parcial. Sem a guarda, `12` falha sozinho na leitura e dá o mesmo resultado: K9 sobrevive, e com `0`, `1` ou `2` o hook cai ou não termina |
| PAP-22 | `SQUAD_NAME` fora do squad: não bloqueia, encerra | `test/unit/hook-nudge.test.ts:230`; `test/integration/hook-stop.test.ts:332`–`:338` | ✅ PASS |
| PAP-23 | Um `POST /usage` por modelo, em ordem crescente, corpo com os sete campos, código 0, saída vazia | `test/integration/hook-stop.test.ts:128`–`:133` opus antes de sonnet, somas 15/25/35/45 e 101/202/303/404; `:254`–`:257` os dois corpos por inteiro | ✅ PASS |
| PAP-24 | Nenhum modelo: um único `usage` de `unknown` com zeros | `test/integration/hook-stop.test.ts:142` | ✅ PASS |
| PAP-25 | Duas execuções, os mesmos números | `test/integration/hook-stop.test.ts:159`–`:161` | ✅ PASS |
| PAP-26 | Payload que não é objeto, ou sem `session_id` texto: `session_id` `unknown`, uso como PAP-19 | `test/integration/hook-stop.test.ts:169`; `:177` e `:180` para ausente, vazio e número; `test/unit/hook-session.test.ts:156` | ✅ PASS |
| PAP-27 | `/usage` sem resposta em 2000 ms, status ≠ 200 ou recusa: código 0, saída vazia | `test/integration/hook-stop.test.ts:187`–`:189`; `:197`–`:204`; `:209`–`:210`; prazo em `test/unit/hook-session.test.ts:135`–`:136` | ✅ PASS. Os 2000 ms têm asserção em `call`, não pelo processo de `stop.ts` |
| PAP-28 | `stalled` no fim de turno hipotético: exatamente `{ decision: "block", reason }`, nenhum `usage`, código 0 | `test/integration/hook-stop.test.ts:217`–`:226`; `:233`–`:235` para `undefined`, `"true"` e `1`; `test/unit/hook-nudge.test.ts:156`–`:157`, `:164` | ✅ PASS |
| PAP-29 | Os cinco textos de `reason` e a dívida mais antiga | `test/unit/hook-nudge.test.ts:100`, `:106`, `:113`, `:119`, `:126` `toBe` com o texto inteiro; `:134` e `:145` | ✅ PASS |
| PAP-30 | `stop_hook_active` `true`: não lê `/events`, não bloqueia, encerra | `test/integration/hook-stop.test.ts:241`–`:246`; `:254` `expect(server.requests).toEqual([...])` só com os dois `POST /usage` | ✅ PASS |
| PAP-31 | `/events` sem resposta em 2000 ms, com status ≠ 200 ou sem `{ events: [...] }`: não bloqueia, encerra | `test/integration/hook-stop.test.ts:262`–`:271`; `:283`–`:289`; `:302`–`:308` com status 500 e o log em que `worker-1` deve | ❌ GAP parcial. O único status diferente de 200 é 500: com 201 e o mesmo log o original não bloqueia e K16 bloqueia, e nenhum teste falha |
| PAP-32 | Outro status que não `stalled`: não bloqueia; o `permission_request` aberto não livra | `test/unit/hook-nudge.test.ts:179`–`:183`; `:196`–`:197`; `:203`; `:219`, `:222`; `:209`–`:210`; `test/integration/hook-stop.test.ts:316`–`:322` | ✅ PASS |
| PAP-33 | Formato do `roles.json`; recusa com o caminho | `test/unit/roles.test.ts:46`, `:51`; `:56`, `:61`, `:71`, `:82`, `:108` (16 recusas, com `workflows` lista vazia), `:114`, `:119` `expect(() => readRoles(path)).toThrow(path)` | ✅ PASS ⚠️ precisão: `workflows: null` |
| PAP-34 | As listas dos quatro papéis | `test/unit/roles.test.ts:128`, `:132`–`:136`, `:140`–`:144`, `:148`–`:152`, `:157`–`:161`, `judge` sem a chave `workflows` | ✅ PASS |
| PAP-35 | `SQUAD_ROLES` ou `<raiz>/plugin/roles.json` | `test/unit/launch.test.ts:502`–`:503`; `test/unit/config.test.ts:97`–`:99`; o default em `test/unit/launch.test.ts:185` | ✅ PASS |
| PAP-36 | `roles.json` válido sem o papel: falha como PAP-42 | `test/unit/launch.test.ts:572`–`:575`, por `refused` (`:513`–`:525`) | ✅ PASS |
| PAP-37 | Um único processo, `SQUAD_CLAUDE` ou `claude`, entrada, saída e erro herdados, sai com o código dele | Pelo processo real: `test/integration/cli.test.ts:196`–`:197` `toContain("unknown option: --plugin-dir")`, `toBe(129)`; `:204`–`:209`; `:219` `expect(res.out).toBe(typed)`, `:220` `expect(res.code).toBe(42)`. Com `spawn` injetado: `test/unit/launch.test.ts:172`–`:173`, `:174`–`:190`, `:197`; `test/unit/config.test.ts:112`–`:113` | ✅ PASS ⚠️ precisão: a spec não diz em quanto tempo o launcher sai depois da sessão; A10 o segura por 360 s e nenhum teste falha |
| PAP-38 | Nome default; `worker-1` se a leitura falha (sem resposta, status ≠ 200, corpo sem `events` lista) | `test/unit/launch.test.ts:252`–`:253`, `:259`, `:265`–`:267`, `:273`, `:279`, `:289`–`:290`, `:301`–`:303` (falha, 500, 201, texto), `:318`–`:324` (número, objeto com forma de lista, `true`), `:335`–`:339`; pelo processo `test/integration/cli.test.ts:264`–`:266` | ✅ PASS |
| PAP-39 | Ambiente sem nenhuma variável cujo nome começa com `CLAUDE`, com `SQUAD_NAME` e `SQUAD_ROLE` | `test/unit/launch-args.test.ts:273`–`:282` objeto inteiro, `MY_CLAUDE` fica; `:286`–`:290`; `test/unit/launch.test.ts:188`; `test/integration/cli.test.ts:244`–`:248` | ❌ GAP parcial. As variáveis dos testes são `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT` e `CLAUDE_PLUGIN_ROOT`: K2 deixa passar `CLAUDE`, `CLAUDEX` e `CLAUDES_HOME` e nenhum teste falha |
| PAP-40 | Os argumentos, nesta ordem | `test/unit/launch-args.test.ts:299`–`:324` vetor inteiro; `:328`–`:343`; `:369`–`:373`; `test/unit/launch.test.ts:174`–`:187` | ✅ PASS |
| PAP-41 | Uma linha `squad: ` na saída de erro, nenhum processo, código 1 | `test/unit/launch.test.ts:517`–`:521`; `:602`–`:607` com a mensagem de duas linhas do git; `test/integration/cli.test.ts:74`–`:76` `toMatch(/^squad: .*nada.*\r?\n$/)`, saída padrão vazia, código 1 | ✅ PASS |
| PAP-42 | Cada causa falha sem criar worktree nem copiar | `test/unit/launch.test.ts:528`, `:532`, `:536`, `:540`, `:544`, `:549`, `:555`–`:559`, `:564`, `:569`, cada uma por `refused` (`:522`, `:523`); `test/unit/launch-args.test.ts:47`–`:48`, `:52`–`:53`, `:57`, `:61`–`:63`, `:72`; `test/unit/launch-worktree.test.ts:73` | ✅ PASS ⚠️ precisão: o que é uma opção e onde pode vir |
| PAP-43 | `ready` e depois `toolsFor(papel)`, nenhuma tool de outro papel | `test/unit/launch-args.test.ts:127`–`:129`; `:156`–`:175` a lista do worker escrita à mão; `:177` | ✅ PASS |
| PAP-44 | Regras `Bash(git …:*)` por papel, em ordem | `test/unit/launch-args.test.ts:134` `toEqual(BASH[role])`; `:149`; `:182`–`:185` | ✅ PASS |
| PAP-45 | `win32`: as mesmas com `PowerShell(` depois; fora dele, nenhuma | `test/unit/launch-args.test.ts:138`; `:142`–`:144`; `test/unit/launch.test.ts:211`–`:222`; pelo processo `test/integration/cli.test.ts:229`–`:231` | ✅ PASS |
| PAP-46 | As linhas do system prompt | `test/unit/launch-args.test.ts:200`–`:206`, `:211`–`:213`, `:218`–`:223`, `:228`–`:233`, `:238`–`:242`, `:247`–`:254` `toBe` com o texto inteiro | ✅ PASS |
| PAP-47 | `--dangerously-skip-permissions` no lugar do modo e da lista | `test/unit/launch-args.test.ts:348`–`:361`; `test/unit/launch.test.ts:228`–`:239` | ✅ PASS |
| PAP-48 | Branch da feature em checkout em outra árvore: falha como PAP-57 | `test/unit/launch-worktree.test.ts:202`–`:204`; `test/unit/launch.test.ts:582`–`:587` | ✅ PASS |
| PAP-49 | Nome dado e online: abre do mesmo jeito | `test/unit/launch.test.ts:345`–`:349` | ✅ PASS |
| PAP-50 | Comando que não roda: falha com o nome dele | `test/unit/launch.test.ts:615`–`:619`; `test/integration/cli.test.ts:98`–`:103` | ✅ PASS |
| PAP-51 | Mother no checkout principal, nada criado | `test/unit/launch.test.ts:363`–`:372` | ✅ PASS |
| PAP-52 | `<diretório de worktrees>/<nome>` | `test/unit/launch.test.ts:378`–`:385`, `:392`–`:397`; `test/unit/config.test.ts:103`–`:104`, `:108`; pelo processo `test/integration/cli.test.ts:242` | ✅ PASS |
| PAP-53 | Worker e judge destacados na ponta do branch da feature aberta, ou no `HEAD` | `test/unit/launch-worktree.test.ts:86`–`:89`, `:96`–`:100`, `:107`–`:111`, `:157`–`:159`, `:182`–`:184`; `test/unit/launch.test.ts:420`–`:424`, `:452`–`:455`, `:478`–`:479`, `:492`–`:493` | ❌ GAP parcial. Num repositório que tem também um branch de nome curto `refs/heads/<branch da feature>`, o original nasce destacado na ponta do branch da feature e A2 nasce nesse outro branch, noutro commit; nenhum teste falha |
| PAP-54 | Leader no branch da feature aberta, ou destacado no `HEAD` | `test/unit/launch-worktree.test.ts:119`–`:122`, `:129`–`:132`, `:139`–`:143`, `:166`–`:168`, `:191`–`:193`; `test/unit/launch.test.ts:446`–`:447`, `:485`–`:486` | ✅ PASS |
| PAP-55 | Worktree que já existe: usado como está | `test/unit/launch-worktree.test.ts:327`–`:332`, `:341`–`:345`; `test/unit/launch.test.ts:433`–`:440` | ✅ PASS |
| PAP-56 | Cópia de cada arquivo regular da raiz cujo nome começa com `.env` e que o git não versiona, sem sobrescrever | `test/unit/launch-worktree.test.ts:268`–`:271`; `:281`; `:291`–`:292`; `:302`–`:304` | ❌ GAP parcial. Os arquivos dos testes são `.env`, `.env.local`, `.env.new`, `.env.shared` e `.env.example`: K1 não copia `.envrc`, `.env-production`, `.env_test` nem `.environment`, e nenhum teste falha |
| PAP-57 | `git worktree add` falha: mensagem do git, nada copiado | `test/unit/launch-worktree.test.ts:220`–`:224`, `:245`–`:248`; `test/unit/launch.test.ts:583`–`:587` | ✅ PASS |
| PAP-58 | De dentro de um worktree, como do checkout principal | `test/unit/launch-worktree.test.ts:64`–`:67`; `test/unit/launch.test.ts:402`–`:412`, `:365`–`:366`; pelo processo, de um subdiretório, `test/integration/cli.test.ts:149` e `:207` | ✅ PASS |
| PAP-59 | `bin.squad`, os quatro comandos, uso com 0 e 1 | `test/integration/cli.test.ts:59`–`:61`, `:67`–`:69`, `:74`–`:76`, `:276`–`:279`, `:295`–`:298`, `:309`–`:315`, `:320` `expect(pkg.bin).toEqual({ squad: "./cli.ts" })`; `status` e `kill-broker` em `:325` e `:334`–`:338` | ✅ PASS |
| PAP-60 | Frontmatter e as sete seções, em ordem | `test/unit/skills.test.ts:231` nos quatro papéis, pelo conferidor de `:161`–`:173` | ✅ PASS |
| PAP-61 | Só tools do papel entre crases, e as obrigatórias | `test/unit/skills.test.ts:235`, conferidor em `:180`–`:187`, lista em `:35`–`:42` igual à do AC | ✅ PASS |
| PAP-62 | `Start`: ping e `ready`, `state` antes de tudo, agir pelo que devolve, `git show <spec_commit>:<spec_ref>` | `test/unit/skills.test.ts:239`; prosa em `SKILL.md:16`–`:23` das quatro | ✅ PASS |
| PAP-63 | Proíbe o aviso de recebimento | `plugin/skills/worker/SKILL.md:27`, `judge/SKILL.md:27`, `leader/SKILL.md:27`, `mother/SKILL.md:27`: "Never send a message whose only content is to say that something was received, read or started." | ✅ PASS, por leitura |
| PAP-64 | `Asking`: seis ordens | `worker/SKILL.md:51`–`:57`, `judge/SKILL.md:51`–`:57`, `leader/SKILL.md:70`–`:76`, `mother/SKILL.md:59`–`:65` | ✅ PASS, por leitura |
| PAP-65 | `Credentials`: `blocked`, pergunta bloqueante com o lugar e a confirmação; proíbe pedir o valor e escrever segredo | `worker/SKILL.md:61`–`:67`, `judge/SKILL.md:61`–`:67`, `leader/SKILL.md:80`–`:86`, `mother/SKILL.md:69`–`:75` | ✅ PASS, por leitura |
| PAP-66 | `Irreversible actions` de worker, leader e judge: as cinco, e nenhuma sem resposta a pergunta bloqueante ao nível de cima | `worker/SKILL.md:71`–`:79`, `judge/SKILL.md:71`–`:79`, `leader/SKILL.md:90`–`:98` | ✅ PASS, por leitura ⚠️ precisão: PAP-66 e PAP-68 sobre o merge de um worker |
| PAP-67 | `feature_closed` encerra as perguntas, inclusive a bloqueante esperada; parar sem enviar mais nada | `worker/SKILL.md:83`, `judge/SKILL.md:83`, `leader/SKILL.md:104`, `mother/SKILL.md:110` | ✅ PASS, por leitura |
| PAP-68 | `Your work` do worker: oito ordens | `test/unit/skills.test.ts:252`; `worker/SKILL.md:33`–`:45` | ✅ PASS |
| PAP-69 | `Your work` do judge: seis ordens | `test/unit/skills.test.ts:256`; `judge/SKILL.md:33`–`:43` | ✅ PASS |
| PAP-70 | `Your work` do leader: sete ordens | `test/unit/skills.test.ts:260`; `leader/SKILL.md:33`–`:64` | ✅ PASS |
| PAP-71 | `Your work` da mother: cinco ordens | `test/unit/skills.test.ts:264`; `mother/SKILL.md:33`–`:53` | ✅ PASS |
| PAP-72 | `Delivery (until the gate exists)` depois de `Irreversible actions`, a linha da Gate nas duas, as ordens de cada uma, nenhuma tool de gate | `test/unit/skills.test.ts:268`, `:273`; `mother/SKILL.md:79`, `:89`, `:93`, `:95`, `:97`–`:102` | ✅ PASS |
| PAP-73 | README com `bun link`, `squad start` dos quatro, `squad tui`, `--skip-permissions`; `broker/CLAUDE.md` com `launch.ts`, `roles.ts`, o arquivo de credencial e `plugin/` | `README.md:33`, `:40`, `:46`–`:49`, `:55`, `:63`; `broker/CLAUDE.md:18`, `:21`, `:22`, `:42` | ✅ PASS |
| PAP-74 | Antes da primeira seção: o projeto é o diretório de trabalho, o diretório da skill é do plugin, proibido mexer nele | `test/unit/skills.test.ts:243` (frases em `:71`–`:74`); `SKILL.md:12` das quatro | ✅ PASS |
| PAP-75 | `Start`: `state` no turno de `ready`, buscar as tools pelo nome, não encerrar o turno entre os dois | `test/unit/skills.test.ts:247` (frases em `:62`–`:66`); `SKILL.md:17` das quatro | ✅ PASS |

**Status**: ❌ Gaps present: 68 de 75 com evidência que bate com a spec; 7 com lacuna parcial que um mutante vivo mostra (PAP-07, PAP-18, PAP-21, PAP-31, PAP-39, PAP-53, PAP-56); 7 lacunas de precisão da spec

---

## As quatro skills, frase a frase

Li as quatro por inteiro contra PAP-62 a PAP-72, PAP-74 e PAP-75. O teste automático confere estrutura, tools citadas e comandos literais (`test/unit/skills.test.ts:158`–`:215`); a prosa abaixo é leitura.

| AC | Cláusula | worker | judge | leader | mother |
| -- | -------- | ------ | ----- | ------ | ------ |
| PAP-74 | O projeto é o diretório de trabalho; o diretório da skill é do plugin; nunca ler, escrever ou rodar nada lá; antes da primeira seção | `:12` | `:12` | `:12` | `:12` |
| PAP-62 | Esperar o ping e chamar `ready` com o número | `:16` | `:16` | `:16` | `:16` |
| PAP-62, PAP-75 | `state` no mesmo turno, antes de tudo; buscar as tools pelo nome; não encerrar o turno entre os dois | `:17` | `:17` | `:17` | `:17` |
| PAP-62 | Agir por `feature`, `ticket` e `owed` | `:19`–`:23` | `:19`–`:23` | `:19`–`:23` | `:19`–`:23` |
| PAP-62 | `git show <spec_commit>:<spec_ref>` | `:20` | `:20` | `:20` | `:20` |
| PAP-63 | Nenhuma mensagem só de recebido, lido ou começado | `:27` | `:27` | `:27` | `:27` |
| PAP-64 | Perguntar em vez de decidir | `:51` | `:51` | `:70` | `:59` |
| PAP-64 | A pergunta inteira na origem, porque o dev lê o texto de quem perguntou primeiro; `summary` numa linha, `body` com o que decidir e o que já foi visto | `:53` | `:53` | `:72` | `:61` |
| PAP-64 | `why`; até 3 `options`; `blocking` falso com `default` sempre que der; verdadeiro só quando não dá | `:54`–`:57` | `:54`–`:57` | `:73`–`:76` | `:62`–`:65` |
| PAP-65 | `blocked`; pergunta bloqueante com o lugar e o pedido de confirmação; nunca pedir o valor nem escrever segredo | `:63`–`:67` | `:63`–`:67` | `:82`–`:86` | `:71`–`:75` |
| PAP-66 | As cinco ações; nenhuma sem resposta a pergunta bloqueante ao nível de cima | `:73`–`:79` (leader) | `:73`–`:79` (leader) | `:92`–`:98` (mother) | não se aplica |
| PAP-67 | `feature_closed` encerra as perguntas, inclusive a bloqueante esperada; parar e não enviar mais nada | `:83` | `:83` | `:104` | `:110` |

`Your work`, por papel:

- **worker** (PAP-68): `git switch -c` a partir do branch da feature (`:35`); skills base e `loadout` (`:36`); commit (`:37`); `send_result` ao `judge` com `ticket_ref`, `task_seq` do `task` mais recente, `branch` e `commit` (`:38`); parar depois do `result`, porque o veredito não chega (`:39`); rework no mesmo branch com o `task_seq` novo (`:41`); nunca merge nem push (`:43`); `answer` à pergunta do judge (`:45`).
- **judge** (PAP-69): `git switch --detach <commit>` (`:35`); `history` com o `task` e as perguntas e respostas (`:36`); avaliar contra os critérios e essas respostas (`:37`); `send_verdict` ao `leader` com `result_seq` do `result` mais recente, `outcome` e um item de `criteria` por critério (`:38`); em `stale_reference`, julgar o `result` mais recente (`:41`); perguntar ao worker dono do ticket (`:43`).
- **leader** (PAP-70): `git switch <feature branch>` e `plan` antes do primeiro `task` (`:35`–`:37`); `send_task` com `ticket_ref`, `loadout` e `criteria` (`:43`), um ticket por worker (`:45`), só depois de aprovadas as dependências (`:46`); `approve` com `git merge` no branch da feature (`:52`); `rework` com novo `task` ao mesmo worker (`:53`); `rework_limit` com pergunta bloqueante à mother e `dropped` no `plan` (`:54`); responder ou escalar (`:58`); um único `send_result` à mother, sem ticket a ticket (`:62`–`:64`).
- **mother** (PAP-71): descoberta no terminal, fora do broker (`:33`); branch da feature, commit da spec, volta ao branch base, só então `open_feature` (`:39`–`:42`); kickoff com `send_task` (`:43`); responder, mesclar com `merge_question` só com o mesmo `blocking`, escalar (`:49`–`:51`); trabalho novo com `send_task` (`:53`).
- **mother** (PAP-72): a linha da Gate em `Irreversible actions` (`:79`) e em `Delivery (until the gate exists)` (`:93`, `:95`); escalar e nunca responder por conta própria (`:89`); no `result` do leader, pergunta bloqueante com o commit e a ação (`:99`–`:100`), exatamente essa ação só depois de resposta que autoriza (`:101`), `close_feature` com `delivered` (`:102`); nenhuma tool de gate (conferido por `test/unit/skills.test.ts:189`–`:191`).

Nenhuma cláusula falta. Nenhuma frase contradiz outra, fora o par PAP-66 com PAP-68 que a skill do worker resolve em `:79` ("No answer lifts the rule of `Your work`") e que segue como lacuna de precisão da spec.

---

## Discrimination Sensor

Uma mutação por vez dentro do clone, os testes que a deveriam matar, `git checkout -- <arquivo>` e `git status --porcelain` vazio antes da seguinte. Sem `git stash`. Controle: o gate inteiro passa sem mutação. Nenhuma morte veio só de um teste de tempo. Nenhuma mutação tocou `SQUAD_CLAUDE` nem o ambiente que o comando recebe, e todo teste de `cli.test.ts` que abre uma sessão define `SQUAD_CLAUDE`: nenhum `claude` real rodou.

### Os dez sobreviventes das voltas 1 e 2, reinjetados

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| C1 | `broker/cli.ts:67` | PAP-37: `stdio` `ignore` nos três | ✅ Morto, 6 falham. Primeiro: `PAP-37: start mother gives the session command the standard error of the launcher and exits with its code` |
| C2 | `broker/cli.ts:67` | PAP-37: o launcher sai com 0 qualquer que seja o código da sessão | ✅ Morto, 3 falham. O mesmo primeiro |
| C6 | `broker/cli.ts:62` | PAP-37, PAP-58: `start` roda a partir do diretório de `broker/` | ✅ Morto, 6 falham. O mesmo primeiro |
| V6 | `broker/server.ts:388` | PAP-08: sem o `try` em volta do `rmSync` | ✅ Morto, 1 falha: `PAP-08: with the credential file swapped for a directory that is not empty, the server records the peer_left and exits with 0` |
| S10 | `plugin/hooks/stop.ts:27` | PAP-31: sem a conferência do status de `/events` | ✅ Morto, 1 falha: `PAP-31: with a status 500 for /events the hook does not block and sends the usage, even with a log in which the worker owes a result` |
| C1b | `broker/cli.ts:67` | PAP-37: só a saída padrão deixa de ser herdada | ✅ Morto, 4 falham. Primeiro: `PAP-37: start gives the session command the standard input and the standard output of the launcher and exits with its code` |
| C1c | `broker/cli.ts:67` | PAP-37: só a entrada deixa de ser herdada | ✅ Morto, 1 falha: o mesmo teste |
| F1 | `broker/launch.ts:216` | PAP-53, PAP-54: só a primeira feature do log é olhada | ✅ Morto, 2 falham. Primeiro: `PAP-53: with a feature closed and a second one open, the worktree of the worker is born detached at the tip of the branch of the second` |
| F6 | `broker/launch.ts:146` | PAP-41, PAP-57: a mensagem do git não é juntada numa linha | ✅ Morto, 2 falham. Primeiro: `PAP-57: a message of git with more than one line comes in one line, with each line of it` |
| F3 | `broker/launch.ts:186` | PAP-38: sem conferir se `events` é uma lista | ✅ Morto, 3 falham. Primeiro: `PAP-38: without a name a worker is worker-1, with no feature open, when the broker answers 200 with events that is a number` |

### Mutações novas

Nenhuma está nas tabelas das voltas 1 e 2. Testes rodados: os três `launch*.test.ts` e `cli.test.ts` para `launch.ts`; `cli.test.ts` para `cli.ts`; os cinco `hook-*.test.ts` para `plugin/hooks/`; `roles.test.ts` para `roles.ts`; `server-credential.test.ts` (e `server.test.ts` em K13) para `server.ts`.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| K1 | `broker/launch.ts:151` | PAP-56: só `.env` e `.env.<algo>` são copiados, não todo nome que começa com `.env` | ❌ Sobreviveu (123 pass, 0 fail; no Linux também) |
| K2 | `broker/launch.ts:92` | PAP-39: só saem `CLAUDE_*` e `CLAUDECODE*`, não toda variável cujo nome começa com `CLAUDE` | ❌ Sobreviveu (141 pass, 0 fail; no Linux também) |
| K3 | `broker/launch.ts:149` | PAP-56: o que o git versiona é perguntado ao worktree novo, não ao checkout principal | ✅ Morto, 1 falha: `PAP-56: a file git tracks in the main checkout is not copied to a worktree whose commit does not have it` |
| K4 | `broker/launch.ts:212` | PAP-49: um nome dado e online é recusado pelo launcher | ✅ Morto, 1 falha: `PAP-49: a name that is given and is online in the log opens the session all the same` |
| K5 | `broker/cli.ts:67` | PAP-40: a sessão abre sem os argumentos | ✅ Morto, 3 falham. Primeiro: `PAP-37: start mother gives the session command the standard error of the launcher and exits with its code` |
| K6 | `broker/cli.ts:68` | PAP-41: a linha de `squad: ` vai para a saída padrão | ✅ Morto, 2 falham. Primeiro: `PAP-59: start is the launcher: a role that is not one of the four is one line of squad: and the exit code 1` |
| K7 | `broker/cli.ts:124` | PAP-59: sem comando, o uso sai com 1 | ✅ Morto, 1 falha: `PAP-59: without a command the CLI writes the usage, one line for each of the four commands, and exits 0` |
| K8 | `plugin/hooks/stop.ts:42` | PAP-30: com `stop_hook_active` verdadeiro o hook ainda lê `/events`, sem bloquear | ✅ Morto, 1 falha: `PAP-30: with stop_hook_active true the hook does not read /events, and sends each usage whole` |
| K9 | `plugin/hooks/usage.ts:75` | PAP-21: sem a guarda de `transcript_path` que não é texto | ❌ Sobreviveu (92 pass, 0 fail) |
| K10 | `plugin/hooks/session.ts:17` | PAP-12: um `SQUAD_ROLE` vazio conta como sessão do squad | ✅ Morto, 1 falha: `PAP-12: with an empty SQUAD_ROLE there is no credential, whatever the file has` |
| K11 | `broker/roles.ts:61` | PAP-33: um texto vazio é aceito em `skills`, e só lá | ✅ Morto, 1 falha: `PAP-33: skills with an empty text is refused, with the path in the message` |
| K12 | `broker/roles.ts:50` | PAP-33: `roles` que não é lista não é recusado pela conferência do leitor | ✅ Morto, 1 falha: `PAP-33: roles that is an object is refused, with the path in the message` |
| K13 | `broker/server.ts:383` | PAP-07: o arquivo de credencial só é apagado quando o broker aceita o `unregister` | ❌ Sobreviveu (24 pass, 0 fail) |
| K14 | `broker/server.ts:381` | PAP-09: uma sessão que nunca registrou apaga o arquivo de credencial do nome ao fechar | ✅ Morto, 1 falha: `PAP-09: a refused session leaves the credential file of the session that holds the name as it is` |
| K15 | `plugin/hooks/usage.ts:85` | PAP-18: só `agent-*.jsonl` de `subagents/` é lido, não todo `*.jsonl` | ❌ Sobreviveu (92 pass, 0 fail; no Linux também) |
| K16 | `plugin/hooks/stop.ts:27` | PAP-31: qualquer 2xx de `/events` é leitura que deu certo (`!res.ok`) | ❌ Sobreviveu (92 pass, 0 fail; no Linux também) |
| K17 | `plugin/hooks/session.ts:39` | PAP-13, PAP-27: qualquer 2xx é resposta para `call` | ✅ Morto, 1 falha: `PAP-13: call gives null for a status that is not 200, whatever the body` |

No Linux, a mais: o modo `0o644` em `broker/server.ts:292` (PAP-06), que as três voltas não tinham injetado. ✅ Morto: `PAP-06: the credential file has mode 0600`.

**Sensor depth**: acima do nível leve: 10 reinjeções, 17 mutações novas e as 13 da T31, em `broker/launch.ts` (17), `broker/cli.ts` (9), `plugin/hooks/` (9), `broker/roles.ts` (2) e `broker/server.ts` (3), mais 1 em `broker/server.ts` no Linux
**Sensor result**: 10 de 10 reinjetados mortos; 11 de 17 novos mortos, 6 sobreviventes; das 13 da T31, 2 em desacordo - FAIL

### As sondas dos seis sobreviventes novos

Cada sonda fica fora do clone e chama o código do clone, primeiro no original e depois no mutante.

| Mutante | Entrada | Original | Mutante |
| ------- | ------- | -------- | ------- |
| K1 | Checkout principal com `.env`, `.env.local`, `.envrc`, `.env-production`, `.environment` e `.env_test` não versionados; `worktree()` de `worker-1` | O worktree tem os seis | Só `.env` e `.env.local` |
| K2 | `sessionEnv` com `CLAUDE`, `CLAUDEX`, `CLAUDE-DIR`, `CLAUDES_HOME`, `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, `MY_CLAUDE` | Ficam só `PATH` e `MY_CLAUDE` | Ficam também `CLAUDE`, `CLAUDEX`, `CLAUDE-DIR` e `CLAUDES_HOME` |
| K9 | `stop.ts` como processo, com `transcript_path` `12`, `true`, `null`, `2`, `1` e `0` | Nos seis: um `POST /usage` de `unknown`, código 0 | `12`, `true` e `null`: igual. `0`: código 1, `TypeError: transcriptPath.replace is not a function`, nenhum `usage`. `1` e `2`: o hook ainda roda 8 s depois, nenhum `usage` |
| K13 | Sessão real registrada, o broker encerrado, e só então a sessão fecha | O arquivo de credencial some; código 0 | O arquivo fica; código 0 |
| K15 | Transcript com `subagents/agent-a.jsonl` (10) e `subagents/sidechain-7.jsonl` (100) | `claude-opus` com 111 em cada campo | 11 em cada campo |
| K16 | Broker real em que `worker-1` deve o `result` de `TKT-13`; `/events` respondido com esse log e status 200, 201 e 500 | 200 bloqueia; 201 e 500 não bloqueiam e mandam o `usage` | 201 bloqueia, sem `usage` |

K16 é o mesmo desvio que a T31 achou e fechou no launcher ("qualquer 2xx é leitura que deu certo", `test/unit/launch.test.ts:296`). No hook de parada o caso ficou sem teste: `test/integration/hook-stop.test.ts:298` só dá 500.

K13 não é caso raro: `squad kill-broker` e depois fechar as sessões é a ordem natural de encerrar um squad. O original apaga o arquivo porque o `rmSync` está fora do `try` do `unregister` (`broker/server.ts:388`–`:392`); nada nos testes prende isso.

K9 só se distingue com um `transcript_path` que é um descritor aberto (`0`, `1`, `2`); o Claude Code não manda isso. É o de menor peso dos seis, e ainda assim PAP-21 nomeia o caso ("não tem `transcript_path` texto") e a guarda que o cumpre pode sair sem teste falhar.

---

## Os 13 vivos sem teste novo da T31

Reinjetados um a um: os 13 seguem vivos, como `tasks.md:831`–`:845` diz. O julgamento de cada um:

| Id | Mutante (`tasks.md`) | Motivo dado | Julgamento | Evidência |
| -- | -------------------- | ----------- | ---------- | --------- |
| A1 | `launch.ts:216`, `findLast` | Equivalente: o broker não grava duas features abertas | Concordo | `broker/feature.ts:39` recusa com `feature_already_open`; `broker/log.ts:63` "There is at most one"; a própria regra de status usa `findLast` (`broker/shared/derive.ts:531`) |
| A2 | `launch.ts:143`, sem `--detach` | Equivalente: o git destaca sozinho num ref que não é nome curto de branch | **Discordo: não é equivalente** | Sonda: repositório com `feat/importer` e um branch de nome curto `refs/heads/feat/importer` noutro commit. Original: `worker-1` destacado na ponta de `feat/importer`. Mutante: `worker-1` no branch `refs/heads/feat/importer`, no commit desse outro branch. O git lê o argumento como nome curto antes de lê-lo como ref. PAP-53 define os dois: destacado, e na ponta do branch da feature. No Linux também vive |
| A3 | `launch.ts:144`, sem `--detach` | O mesmo | Concordo | Sonda: destacado no `HEAD` nos dois. O git recusa `HEAD` como nome de branch (`fatal: 'HEAD' is not a valid branch name`), e com `refs/heads/HEAD` criado por `update-ref` `git worktree add <dir> HEAD` ainda destaca no `HEAD` do checkout |
| A4, A5 | `launch.ts:124`, uma das metades da guarda | Equivalente: fora de um repositório o git falha e não escreve nada | Concordo | Fora: código 128 e 0 bytes na saída padrão. Dentro: código 0 e a primeira linha começa com `worktree ` |
| A6 | `nudge.ts:36`, sem a guarda do nome | Equivalente: esse nome não tem agente na regra de status | Concordo | `broker/shared/derive.ts:559` monta os agentes só de `SQUAD`; `nudge.ts:58` não acha o nome e devolve nulo |
| A7 | `nudge.ts:59`, sem `stalled` | Equivalente: só o agente `stalled` tem `owes` | Concordo | `broker/shared/derive.ts:588` `owes: null` na base; só `:627` põe `owes`, junto com `status: "stalled"` |
| A8 | `launch.ts:126`, sem `resolve` | Nenhum requisito define o separador | Concordo | O diretório é o mesmo; `worktreesDir` passa por `join` (`broker/shared/config.ts:69`) |
| A9 | `launch.ts:146`, sem `trim` | Nenhum requisito define um espaço no fim da linha | Concordo | A linha continua uma só, começa com `squad: ` e traz a mensagem |
| A10 | `launch.ts:178`, sem `abort` | Nenhum requisito define: a leitura atrasada não é cancelada, e o resultado é o mesmo | **Discordo do motivo: o resultado não é o mesmo** | Sonda: `bun cli.ts start mother` com um broker que aceita a conexão e nunca responde, e `git` no lugar da sessão (sai na hora com 129). Original: o launcher sai com 129 em 2,2 s. Mutante: ainda vivo aos 40 s; sai com 129 aos 360 s. PAP-37 manda sair com o código da sessão e a definição dá à leitura um prazo de 2000 ms; nenhum dos dois diz em quanto tempo o launcher sai. Conto como sobrevivente com ressalva e como lacuna de precisão |
| A11 | `launch.ts:193`, sem `clearTimeout` | Nenhum requisito define: até 2 s a mais para sair | Concordo | Sonda: 2,2 s nos dois |
| A12 | `launch.ts:224`, sem o motivo depois do nome do comando | PAP-50 pede o nome do comando | Concordo | A linha continua dizendo a causa (`could not run <comando>`) |
| A13 | `cli.ts:75`, a TUI roda com o `bun` do caminho | Nenhum requisito define qual `bun` | Concordo | `squad` já depende de `bun` no caminho pelo `#!/usr/bin/env bun` de `broker/cli.ts:1` |

**Concordo com 11 de 13.** A2 muda um resultado que PAP-53 define e nenhum teste falha: é mutante sobrevivente. A10 tem o motivo desmentido pela sonda; se o tempo de saída do launcher é requisito, a spec não diz, e por isso entra como sobrevivente com ressalva.

A T31 testou "um branch chamado `null`" e "uma tag com o nome do branch" (`test/unit/launch-worktree.test.ts:153`–`:194`). O branch de nome curto `refs/heads/<branch>` é do mesmo tipo de entrada, e acontece: `git branch refs/heads/x` cria `refs/heads/refs/heads/x`.

---

## Sessões reais

`real-sessions.md` diz, para RS-01 a RS-14, o estado e o que foi visto: onze `Exercitado`, RS-11 `Exercitado em parte`, RS-12 `Não exercitado`, RS-14 `Exercitado no Windows`. Não abri sessão real. Conferi o que o log de 142 eventos permite:

| Id | O que o registro afirma | Contra `real-sessions-log.txt` |
| -- | ----------------------- | ------------------------------ |
| RS-05 | `turn_started` depois de cada mensagem do canal; o turno do ping não tem | Confere: 11, 12 e 13 logo depois do `feature_opened` 10; os eventos 1 a 8 têm `peer_joined` e `usage` sem `turn_started` |
| RS-08 | Todo `usage` tem números diferentes de zero | Confere nos 33 `usage`, os quatro números de cada um |
| RS-09 | "Mais 13 pedidos liberados pela rota em RS-10 e RS-11" | Confere: 13 `permission_decision` `allow` (24, 26, 28, 35, 43, 48, 53, 63, 98, 119, 121, 123, 125) |
| RS-10 | Eventos 10 a 58: `feature_opened`, kickoff, `plan`, `task`, `result`, `verdict` `approve` de cada ticket, um `result` do leader, a pergunta de entrega com o commit; sem aviso de recebimento; merge e `delivered` | Confere: 10, 14, 19, 20, 31, 36, 39, 44, 49, 54, 58 (`Merge feat-math (7dfc648) into main?`), 60, 64 `delivered`. T2 só sai (39) depois do `approve` de T1 (36). Nenhum evento do intervalo é aviso. O merge de T1 não aparece no log (o `git merge` do leader está na lista de permitidos); o de T2 aparece como pedido 52 |
| RS-11 | Duas perguntas até o dev; `blocked` e pergunta bloqueante com o `.env`; novo `task` ao mesmo worker com o `task_seq` novo | Confere: 93 e 94; 83 e 85; 113 `rework`, 115 `task` a `worker-1`, 126 com `task_seq` 115. O substituto do judge: `peer_left` 73 e `peer_joined` 101. "No mesmo branch" não se lê na listagem |
| RS-13 | Cinco turnos com dois `turn_started` (leader 13 e 17, 76 e 78, 107 e 111; mother 86 e 88, 104 e 106), um `usage` por turno | Confere, os cinco e só eles |
| Desvios | Seis `refused`; a mother pergunta em vez de escalar; a mother não chama `unblocked` | Confere: 29, 30, 57, 82, 84, 91; 93 e 94 seguidos de 105 e 108; `blocked` 95 sem `unblocked` da mother |

RS-01 a RS-04, RS-06, RS-07, os dois primeiros pedidos de RS-09 e RS-14 vêm de sessões em `7c58a5d` cujo log não está no repositório: o registro traz os números e os textos vistos (por exemplo 6, 251, 12227 e 79943 em RS-06, e o `reason` inteiro em RS-07), e não há artefato para reler. Fica como a spec pede ("exercitado com sessão real ou registrado como não exercitado, com a evidência"), com essa ressalva.

---

## Integridade das correções

- `git diff --stat 6609630..ac25e8d`: 24 arquivos, todos em `.specs/` ou `broker/test/`. `git diff --stat 6609630..ac25e8d -- . ':!.specs' ':!broker/test'` é vazio: nenhum arquivo de produção mudou.
- `git diff 8f4e442..ac25e8d -- broker/test`: quatro arquivos (`cli.test.ts`, `launch.test.ts`, `launch-worktree.test.ts`, `roles.test.ts`), 296 linhas a mais e 13 a menos. As 13 removidas são de três ajudantes generalizados, sem asserção: `runCli` ganhou a entrada (`cli.test.ts:36`), `startWithGit` virou `startWith("git", …)` (`:126`, `:160`), e `opened` e `closed` ganharam o id da feature (`launch.test.ts:86`, `:93`). Nenhum `expect` removido, nenhum valor esperado trocado, nenhum `skip`, `todo` ou `only` novo.
- `spec.md` mudou em `8f4e442..ac25e8d` em duas linhas: a definição de "feature aberta, para o launcher" ganhou a frase das três causas de leitura que falha (`spec.md:100`), e a tabela de premissas ganhou a linha que a registra, com "Falta a confirmação do dev" e `n` (`spec.md:74`). O texto bate com o código (`broker/launch.ts:184`–`:186`) e com os testes; a confirmação do dev segue em aberto.
- Contagem: 1626 pass na volta 2, 1645 agora. Os 19 a mais são os testes novos de T27 a T31.

---

## Interactive UAT Results (if performed)

Não realizado: não há usuário nesta execução. O que só uma sessão real mostra está em `real-sessions.md`.

---

## Code Quality

Sobre os arquivos mudados desde a volta 2: `broker/test/integration/cli.test.ts`, `broker/test/unit/launch.test.ts`, `launch-worktree.test.ts` e `roles.test.ts`.

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Um caso por mutante, com os ajudantes que já existiam generalizados em vez de copiados |
| Surgical changes | ✅ Só os quatro arquivos de teste; nenhum de produção |
| No scope creep | ✅ Todo teste novo leva o id de um requisito |
| Matches patterns | ✅ Repositório temporário em caminho com espaço, `realpathSync`, nomes de teste começando pelo requisito |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ Os valores afirmados batem com a spec. Em sete ACs a entrada dos testes é só a forma comum, e o valor afirmado não distingue a regra da spec de uma regra mais estreita ou mais larga |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ Servidor MCP: PAP-07 sem o caso do broker fora. Hook, processo: PAP-31 sem outro 2xx. O resto cumpre a matriz |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `broker/CLAUDE.md`, regras de `tasks.md`, `.specs/LESSONS.md` | ⚠️ L-072 (o que um status diferente de 200 significa para toda leitura HTTP) foi aplicada ao launcher na T31 e não ao hook de parada |

---

## Edge Cases

- [x] PAP-20: espaços e quebras em volta da credencial. `test/unit/hook-session.test.ts:29`–`:30`, `test/integration/hook-turn-started.test.ts:61`
- [ ] PAP-21: payload sem `transcript_path` texto. Evidência em `test/unit/hook-usage.test.ts:235`–`:237` e `test/integration/hook-stop.test.ts:150`; K9 vive
- [x] PAP-22: `SQUAD_NAME` fora do squad. `test/unit/hook-nudge.test.ts:230`, `test/integration/hook-stop.test.ts:332`–`:338`
- [x] PAP-48: branch da feature em checkout em outra árvore. `test/unit/launch-worktree.test.ts:202`–`:204`
- [x] PAP-49: nome dado e já online. `test/unit/launch.test.ts:345`–`:349`

---

## Gate Check

- **Gate command**: de `broker/` do clone, `bun node_modules/typescript/bin/tsc --noEmit` e `bun test`
- **tsc**: código de saída 0, no Windows e no Linux
- **Windows**: 1645 passed, 0 failed, 5 skipped; 1650 testes em 75 arquivos, 109376 asserções, 178,37 s. Uma execução, com a máquina ocupada: `EVT-43`, `PEER-28`, `PEER-29` e o caso de 2000 ms de PAP-38 passaram
- **Linux**: contêiner `oven/bun:1.4.2` deste agente, com `git`, `lsof` e `procps` instalados, sobre um clone do clone em `ac25e8d`: `tsc` 0 e 2 de 2 execuções com 1649 passed, 0 failed, 1 skipped, 1650 testes em 75 arquivos. A asserção do modo `0600` de PAP-06 passa lá
- **Test count before feature**: 1303 pass, 4 skip (1307 em 63 arquivos)
- **Test count after feature**: 1645 pass, 5 skip (1650 em 75 arquivos)
- **Delta**: +343 testes, +12 arquivos, nenhum removido; +19 desde a volta 2
- **Skipped tests**: no Windows, quatro anteriores à fatia: `PEER-44` duas vezes (`test/integration/cli.test.ts:389`, o laço de dois casos, substituto do `lsof`), `PEER-14` (`test/unit/presence.test.ts:6`, pid de outro usuário) e o produto completo de `QST-99, QST-78` sem `SQUAD_TEST_FULL` (`test/unit/tui-loop.test.ts:990`). Um da fatia: `PAP-06: the credential file has mode 0600` (`test/integration/server-credential.test.ts:57`), que roda e passa no Linux. No Linux, só o de `QST-99`
- **Failures**: nenhuma
- **Uma nota do Linux, fora da fatia**: na imagem `oven/bun:1.4.2` sem `lsof` e sem `ps`, três testes anteriores à fatia falham por falta da ferramenta: `PEER-35` e `PEER-45` (`kill-broker` procura o processo com `lsof`) e `PEER-34` (`test/integration/server.test.ts:238` chama `ps`). Com as duas instaladas, zero falhas. O Handoff diz o contêiner e não diz os três pacotes

---

## Lacunas de precisão

Seis seguem das voltas anteriores, com a leitura fixada em "Leituras da spec" de `tasks.md` (`tasks.md:872`–`:890`) e não no texto do AC. Uma é nova.

| AC | O que a spec não diz | Onde está decidido hoje |
| -- | -------------------- | ----------------------- |
| PAP-01 | O que é "arquivo do plugin" dentro de `broker/` | `tasks.md:880`, `test/unit/plugin-manifest.test.ts:17` |
| PAP-15 | Um `message.id` que não é texto não vazio | `tasks.md:882`, `test/unit/hook-usage.test.ts:102`–`:106` |
| PAP-18 | Um arquivo de `subagents/` que não pode ser lido | `tasks.md:884`, `test/unit/hook-usage.test.ts:212`–`:219` |
| PAP-33 | `workflows: null` | `tasks.md:878`, `test/unit/roles.test.ts:104` |
| PAP-42 | O que é uma opção e em que posição pode vir | `tasks.md:885`, `test/unit/launch-args.test.ts:61`–`:63` |
| PAP-66 com PAP-68 | Merge ou push de um worker com resposta que autoriza | `tasks.md:888`, `plugin/skills/worker/SKILL.md:79` |
| PAP-37 com a definição "feature aberta, para o launcher" (nova) | Se a leitura do log é abandonada no prazo, e em quanto tempo o launcher sai depois da sessão | Só no código: `broker/launch.ts:178` |

A lacuna de PAP-38 da volta 2 fechou no texto (`spec.md:100`); falta a confirmação do dev (`spec.md:74`).

---

## Fix Plans (if issues found)

Em ordem de peso. Todos são de teste; nenhum pede mudança de produção.

### Fix 1: `/events` respondido com outro 2xx (PAP-31, K16)

- **Root cause**: o único status diferente de 200 que `test/integration/hook-stop.test.ts:298` dá é 500. `!res.ok` no lugar de `res.status !== 200` (`plugin/hooks/stop.ts:27`) passa.
- **Fix task**: em `test/integration/hook-stop.test.ts`, o caso de `:293` com status 201 (o log de um broker real em que `worker-1` deve, respondido com 201): saída padrão vazia e os dois `POST /usage`.
- **Done when**: K16 morre; S10 continua morto.
- **Priority**: Major

### Fix 2: a sessão fecha com o broker fora (PAP-07, K13)

- **Root cause**: toda sessão dos testes fecha com o broker de pé. Com o `rmSync` dentro do `try` do `unregister` (`broker/server.ts:383`–`:392`), o arquivo fica quando o broker não responde.
- **Fix task**: em `test/integration/server-credential.test.ts`, registrar, encerrar o broker, fechar a sessão: o arquivo de credencial some e o processo sai com 0.
- **Done when**: K13 morre; V1 e V6 continuam mortos.
- **Priority**: Major

### Fix 3: um `.env*` que não é `.env` nem `.env.<algo>` (PAP-56, K1)

- **Root cause**: os arquivos de `test/unit/launch-worktree.test.ts:259`–`:260` são `.env` e `.env.local`.
- **Fix task**: juntar ao caso de `:253` um `.envrc` e um `.env-production` não versionados e afirmar que são copiados com o conteúdo.
- **Done when**: K1 morre; L16 e F13 continuam mortos.
- **Priority**: Major

### Fix 4: um arquivo de subagente com outro nome (PAP-18, K15)

- **Root cause**: todo arquivo de `subagents/` dos testes se chama `agent-*.jsonl` (`test/unit/hook-usage.test.ts:174`–`:176`).
- **Fix task**: juntar ao caso de `:172` um `*.jsonl` cujo nome não começa com `agent-` e afirmar a soma com ele.
- **Done when**: K15 morre; F8 continua morto.
- **Priority**: Minor

### Fix 5: uma variável `CLAUDE*` sem `_` nem `CODE` depois (PAP-39, K2)

- **Root cause**: as variáveis de `test/unit/launch-args.test.ts:268`–`:270` são `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT` e `CLAUDE_PLUGIN_ROOT`.
- **Fix task**: juntar `CLAUDE` e `CLAUDEX` ao ambiente de `:260` e mantê-las fora do esperado de `:273`.
- **Done when**: K2 morre; L4 e F17 continuam mortos.
- **Priority**: Minor

### Fix 6: um branch de nome curto `refs/heads/<branch da feature>` (PAP-53, A2)

- **Root cause**: nenhum repositório dos testes tem um branch cujo nome curto é o ref inteiro do branch da feature; sem `--detach` (`broker/launch.ts:143`) o git escolhe esse branch.
- **Fix task**: em `test/unit/launch-worktree.test.ts`, ao lado dos casos da tag e do branch `null`, um repositório com esse branch noutro commit: o worktree do worker e o do judge nascem destacados na ponta do branch da feature. Acertar a linha de `tasks.md:836`, que dá o mutante por equivalente.
- **Done when**: A2 morre.
- **Priority**: Minor

### Fix 7: `transcript_path` que é um número de descritor (PAP-21, K9)

- **Root cause**: o único valor que não é texto em `test/unit/hook-usage.test.ts:236` é `12`, que a leitura recusa sozinha.
- **Fix task**: em `test/integration/hook-stop.test.ts`, ao lado de `:145`, `stop.ts` como processo com `transcript_path` `0`: um `usage` de `unknown`, código 0.
- **Done when**: K9 morre.
- **Priority**: Minor

### Fix 8: o launcher sai quando a sessão sai, com o broker sem responder (PAP-37, A10)

- **Root cause**: o teste do prazo (`test/unit/launch.test.ts:328`) usa um `fetch` falso, e nenhum teste do processo tem um broker que não responde. Sem o `abort` (`broker/launch.ts:178`) o launcher fica 360 s vivo depois de a sessão sair.
- **Fix task**: dizer na spec (PAP-37 ou a definição) que a leitura é abandonada no prazo e que o launcher sai quando a sessão sai; em `test/integration/cli.test.ts`, um `start` com um servidor que aceita a conexão e não responde e um comando de sessão que sai na hora: o CLI sai com o código dela em poucos segundos. Acertar a linha de `tasks.md:842`.
- **Done when**: A10 morre.
- **Priority**: Minor, e pede a decisão do dev sobre o texto

### Fix 9: documentos

- **Fix task**: levar para o texto dos ACs as seis leituras de `tasks.md:872`–`:890`; obter a confirmação do dev para `spec.md:74`; fechar o `Status` de `tasks.md:12`; registrar no Handoff que a suíte no Linux precisa de `git`, `lsof` e `procps` na imagem.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-01 a PAP-06 | Implementing | ✅ Verified |
| PAP-07 | Implementing | ❌ Needs Fix (Fix 2) |
| PAP-08 a PAP-17 | Implementing | ✅ Verified |
| PAP-18 | Implementing | ❌ Needs Fix (Fix 4) |
| PAP-19, PAP-20 | Implementing | ✅ Verified |
| PAP-21 | Implementing | ❌ Needs Fix (Fix 7) |
| PAP-22 a PAP-30 | Implementing | ✅ Verified |
| PAP-31 | Implementing | ❌ Needs Fix (Fix 1) |
| PAP-32 a PAP-36 | Implementing | ✅ Verified |
| PAP-37 | Implementing | ✅ Verified, com texto e teste a reforçar (Fix 8) |
| PAP-38 | Implementing | ✅ Verified |
| PAP-39 | Implementing | ❌ Needs Fix (Fix 5) |
| PAP-40 a PAP-52 | Implementing | ✅ Verified |
| PAP-53 | Implementing | ❌ Needs Fix (Fix 6) |
| PAP-54, PAP-55 | Implementing | ✅ Verified |
| PAP-56 | Implementing | ❌ Needs Fix (Fix 3) |
| PAP-57 a PAP-75 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 68 de 75 ACs batem com a spec sem ressalva de mutante; 7 com lacuna parcial (PAP-07, PAP-18, PAP-21, PAP-31, PAP-39, PAP-53, PAP-56); 7 lacunas de precisão (PAP-01, PAP-15, PAP-18, PAP-33, PAP-42, PAP-66 com PAP-68, PAP-37 com a definição de feature aberta)
**Sensor**: 10 de 10 reinjetados mortos; 11 de 17 novos mortos; sobrevivem K1 (`broker/launch.ts:151`), K2 (`broker/launch.ts:92`), K9 (`plugin/hooks/usage.ts:75`), K13 (`broker/server.ts:383`), K15 (`plugin/hooks/usage.ts:85`) e K16 (`plugin/hooks/stop.ts:27`); das 13 da T31, A2 (`broker/launch.ts:143`) não é equivalente e A10 (`broker/launch.ts:178`) tem o motivo desmentido
**Gate**: Windows 1645 passed, 5 skipped, 0 failed; Linux 1649 passed, 1 skipped, 0 failed; `tsc` 0 nos dois

**What works**: as cinco correções da volta 2 fazem o que prometeram, e os dez mutantes das duas voltas morrem pela razão certa. O código de produção faz o que a spec diz em todas as sondas, e não mudou desde `6609630`. Nenhuma asserção foi afrouxada. As quatro skills têm cada cláusula de PAP-62 a PAP-72, PAP-74 e PAP-75. `real-sessions.md` confere com o log em tudo o que o log permite conferir. A suíte passa nos dois sistemas, com a asserção do modo `0600` rodando no Linux.

**Issues found**: oito, nenhuma de produção. Seis mutantes novos vivos, todos pelo mesmo padrão de entrada só na forma comum (Fix 1 a Fix 5 e Fix 7); um mutante que a T31 deu por equivalente e não é (Fix 6); e um com motivo falso, que segura o launcher por 360 s (Fix 8).

**Next steps**: esta é a terceira volta, e o protocolo manda escalar ao usuário em vez de abrir uma quarta. A decisão é do dev: aplicar Fix 1 a Fix 7 (só de teste, uma asserção ou um caso cada) e Fix 8 com o texto, e mandar reverificar; ou aceitar a fatia com essas lacunas registradas. O código não precisa mudar em nenhum dos dois caminhos.

---

## Lições registradas

Pelo `lessons.py`, só de sinal novo desta volta, todas como candidatas (L-083 a L-089). As das voltas 1 e 2 não foram registradas de novo.

- L-083: K1 (PAP-56), K2 (PAP-39) e K15 (PAP-18). O mesmo texto nos três sinais; o script juntou numa lição só.
- L-084: K16, PAP-31.
- L-085: K13, PAP-07.
- L-086: K9, PAP-21.
- L-087: A2, PAP-53.
- L-088: A10, PAP-37.
- L-089: a lacuna de precisão de PAP-37 com a definição de feature aberta.

## Isolamento

`git status --porcelain` do repositório real antes: vazio, em `ac25e8d`. Depois: `.specs/features/papeis/validation.md` alterado por este relatório, `.specs/lessons.json` e `.specs/LESSONS.md` alterados pelo script, e nada mais. Nenhum commit, push, stash, troca de branch ou reset. A outra árvore de trabalho (`squad-code-mcp.worktrees/tui-clicavel`) não foi tocada. Tudo rodou no clone `verifier3` da pasta de rascunho e num contêiner que monta esse clone só para leitura; o clone ficou limpo depois de cada mutação e no fim, com uma árvore só. As sondas, o script das mutações e os logs ficam fora do clone, na pasta de rascunho (`v3-*`). Nada do autor foi apagado nem reusado (`m1`, `m2`, `m3`, `lin`). Nenhum `claude` real foi executado; todo `broker.ts` e `server.ts` subiu pelos ajudantes de teste, com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.

---

## Reverificação do resíduo (2026-10-16)

Volta 4. O dev decidiu em 2026-10-16 aplicar Fix 1 a Fix 9. O autor fez isso em `test/papeis-gaps`, `0a4c8e1..959bcb6` sobre `main` em `055d629` (T32 a T39). O Fix 5 (PAP-39, K2) não teve tarefa nova: o teste veio em `e9bb908`, com a revisão do PR 12, que já está em `main`. Escopo desta volta: PAP-07, PAP-18, PAP-21, PAP-31, PAP-37, PAP-39, PAP-53, PAP-56, e os seis textos do Fix 9. As linhas de código citadas são de `959bcb6`.

### Ambiente e isolamento

- **Intervalo**: `055d629..959bcb6`.
- **Ambiente**: Windows 11 Pro 10.0.26200, Bun 1.3.14. Clone físico `scratchpad\verifier4` (`git clone --no-hardlinks -c core.autocrlf=false`) em `test/papeis-gaps`, `959bcb6`, com `bun install --frozen-lockfile` próprio. W2 e W3 também foram sondados no Linux: contêiner `oven/bun:1.3.14` sobre uma cópia do clone, montado só para leitura, com `bun install` próprio.
- **Repositório real**: `git status --porcelain` antes, vazio, em `test/papeis-gaps` e `959bcb6`. Nenhum stash, commit, push, troca de branch nem reset. As mutações rodaram no clone, uma de cada vez. Depois de cada uma: `git checkout -- <arquivo>`, e `git status --porcelain` vazio conferido pelo script antes da seguinte. Os scripts, as sondas e as saídas ficam fora do clone (`scratchpad\v4`). O clone `mut` do autor não foi usado nem apagado. Nenhum `claude` real rodou: as sessões de `cli.test.ts` e as sondas usam `SQUAD_CLAUDE=git`. Todo `broker.ts` e `server.ts` subiu pelos ajudantes de teste, com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.
- **No fim**: `git status --porcelain` mostra `.specs/features/papeis/validation.md` (este relatório) e `.specs/LESSONS.md` e `.specs/lessons.json` (gravados pelo `lessons.py`). Mostra também ` M ROADMAP.md`, que apareceu durante a volta e não é deste agente.

### Produção intacta

- `git diff 055d629..959bcb6 --stat` lista 7 arquivos, 324 linhas a mais e 43 a menos. São `spec.md`, `tasks.md` e cinco arquivos de `broker/test/`: `cli.test.ts`, `hook-stop.test.ts`, `server-credential.test.ts`, `hook-usage.test.ts` e `launch-worktree.test.ts`. Nenhum arquivo de produção.
- O diff de `broker/test` foi lido linha a linha. Nenhum `expect` foi removido, nenhum `skip`, `todo` ou `only` entrou. As linhas removidas são de dois tipos:
  - O caso de 500 de PAP-31 virou um laço sobre 500 e 201 (`test/integration/hook-stop.test.ts:303`), com as mesmas asserções.
  - Dois esperados foram trocados porque a entrada cresceu, e ficaram mais estritos. Em `test/unit/hook-usage.test.ts:184`, o `claude-opus` foi de 11/21/31/41 para 111/121/131/141, com o `sidechain-7.jsonl` de 100 em cada campo. Em `test/unit/launch-worktree.test.ts:294`, a listagem ganhou `.env-production` e `.envrc`.
- `spec.md` mudou em sete pontos:
  - a frase nova da definição de feature aberta (`spec.md:103`);
  - os seis textos do Fix 9 (PAP-01, PAP-15, PAP-18, PAP-33, PAP-42, PAP-68);
  - as linhas de rastreabilidade, que agora dizem `Implementing`.

### Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-07 | O arquivo de credencial some quando o servidor MCP encerra depois de registrado | `test/integration/server-credential.test.ts:79`–`:94`: broker encerrado, sessão fechada, o arquivo some em até 1500 ms (`:89`), o processo sai com 0 sozinho (`:91`), `:93` `expect(existsSync(file)).toBe(false)`. O caso com o broker de pé segue em `:64`–`:77` | ❌ GAP parcial. O valor afirmado é o da spec e mata K13. Sem o `SIGTERM` (W2), o arquivo fica no Linux, e nenhum teste falha |
| PAP-18 | Todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/` soma; o arquivo que não pode ser lido não conta, e os outros contam | `test/unit/hook-usage.test.ts:172`–`:187`: `sidechain-7.jsonl` entra na soma (`:184` 111/121/131/141); `:214`–`:221` o ilegível | ❌ GAP parcial. Mata K15 e W4. Todo `transcript_path` dos testes termina em `.jsonl`, e W5 vive |
| PAP-21 | Sem `transcript_path` texto, uso como PAP-19, ou seja, um único `usage` de `unknown` com zeros (PAP-24) | `test/integration/hook-stop.test.ts:154`–`:160`: `transcript_path` `0`, código 0, saída vazia, `toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]])` | ✅ PASS. Mata K9 |
| PAP-31 | `/events` com status diferente de 200: não bloqueia e encerra como PAP-23 | `test/integration/hook-stop.test.ts:303`–`:321`, com 500 e 201: saída vazia, código 0, o `GET /events?after=0` e os dois `POST /usage` por inteiro e em ordem | ✅ PASS. Mata K16 e S10. W8 morre em `:269`, W10 em 9 casos, e W9 é equivalente |
| PAP-37 | Um processo, código de saída dele; pela definição (`spec.md:103`), a leitura que não responde no prazo é abandonada nele, e nada dela segura o launcher depois de a sessão sair | `test/integration/cli.test.ts:226`–`:251`: broker que aceita a conexão e nunca responde, `git` no lugar da sessão. `:237` `toBe(129)`; `:240` `toBeLessThan(10_000)`; `:246` a conexão chegou | ❌ GAP parcial, com ressalva. A frase fecha a lacuna de texto da volta 3. O teste mata A10 (360 s), W7 e W18. O limite de 10 s é 4,6 vezes os 2,16 s medidos, e W17 vive: abandona a leitura 4 s depois do prazo, e o launcher sai aos 6,09 s |
| PAP-39 | Sem nenhuma variável cujo nome começa com `CLAUDE`, a não ser as três do dev; as outras sem mudança | `test/unit/launch-args.test.ts:294`–`:313`: as três ficam; `CLAUDE`, `CLAUDEX`, `CLAUDE_CONFIG_DIR_OLD`, `CLAUDE_CODE_OAUTH_SCOPES` e `CLAUDE_CODE_CHILD_SESSION` saem; objeto inteiro. `:268`–`:291` `MY_CLAUDE` fica | ❌ GAP parcial. Mata K2, W11 e W13. Nenhuma variável dos testes tem minúsculas no começo do nome, e W12 vive. ⚠️ precisão: a spec não diz se a caixa conta, e no Windows os nomes de variável de ambiente não diferem por caixa |
| PAP-53 | Worker e judge destacados na ponta do branch da feature aberta | `test/unit/launch-worktree.test.ts:196`–`:216`: um branch de nome curto `refs/heads/<branch da feature>` no `HEAD`; para worker e judge, `head(dir)` igual a `tip(main)` e `branch(dir)` vazio | ✅ PASS. Mata A2 (2 casos) e W16 |
| PAP-56 | Cópia de cada arquivo regular da raiz cujo nome começa com `.env` e que o git não versiona, com o mesmo nome e conteúdo | `test/unit/launch-worktree.test.ts:275`–`:299`: `.envrc` e `.env-production` copiados com o conteúdo (`:297`, `:298`); `:294` a listagem inteira | ❌ GAP parcial. Mata K1 e W14. Nenhum `.env*` dos testes é link simbólico, e W15 vive. ⚠️ precisão menor: a spec não diz se um link para um arquivo regular conta como arquivo regular. O código lê a entrada sem seguir o link (`Dirent.isFile`, `broker/launch.ts:157`) e não o copia |

Os seis textos do Fix 9, contra o código e os testes:

| AC | Texto novo | Código e teste | Result |
| -- | ---------- | -------------- | ------ |
| PAP-01 | Nem `.claude-plugin`, nem `hooks`, nem `skills`, nem `roles.json` em `broker/`; `broker/.mcp.json` fica | `test/unit/plugin-manifest.test.ts:17`–`:20` com os quatro nomes; `broker/.mcp.json` existe | ✅ Bate |
| PAP-15 | `message.id` que não é texto não vazio conta sozinho | `plugin/hooks/usage.ts:56`; `test/unit/hook-usage.test.ts:102`–`:107` com `""`, `7` e `null`. W6, o id número usado como chave, morre aí | ✅ Bate |
| PAP-18 | O arquivo de `subagents` que não pode ser lido não conta, e os outros contam | `plugin/hooks/usage.ts:90`–`:94`; `test/unit/hook-usage.test.ts:214`. W4, que para no primeiro ilegível, morre aí | ✅ Bate |
| PAP-33 | `workflows` presente, qualquer que seja o valor, inclusive `null`, tem de ser o objeto | `broker/roles.ts:62`–`:64` (`"workflows" in entry`); `test/unit/roles.test.ts:104` | ✅ Bate |
| PAP-42 | Opção é todo argumento que começa com `-`, em qualquer posição, e nunca é papel nem nome; `--skip-permissions` vale em qualquer posição | `broker/launch.ts:33`–`:37`, `:45`; `test/unit/launch-args.test.ts:61`–`:63` | ✅ Bate |
| PAP-68 | Nunca merge nem push, nem com a resposta a uma pergunta de PAP-66 que os autorize | `plugin/skills/worker/SKILL.md:79` ("No answer lifts the rule of `Your work`") | ✅ Bate |

### Discrimination Sensor

Um script aplica cada mutação, confere que ela casou uma vez só, roda os testes da camada e restaura o arquivo com `git checkout --`. Depois confere `git status --porcelain` vazio no clone antes da seguinte. Controle: sem mutação, os sete arquivos passam (abaixo, "Gate no clone"). Testes por camada:

- `hook-stop.test.ts` para `stop.ts`;
- `hook-usage.test.ts` e `hook-stop.test.ts` para `usage.ts`;
- `server-credential.test.ts` e `server.test.ts` para `server.ts`;
- os três `launch*.test.ts` e `cli.test.ts` para o `worktree`;
- `launch-args.test.ts`, `launch.test.ts` e `cli.test.ts` para `sessionEnv`;
- `launch.test.ts` e `cli.test.ts` para `readLog`.

#### O resíduo, reinjetado

| Mutation | File:line at 959bcb6 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| K16 | `plugin/hooks/stop.ts:27` | PAP-31: `!res.ok` no lugar de `res.status !== 200` | ✅ Morto, 1 falha: `PAP-31: with a status 201 for /events the hook does not block and sends the usage, even with a log in which the worker owes a result` |
| K13 | `broker/server.ts:391` | PAP-07: o `rmSync` dentro do `try` do `/unregister` (`:384`–`:389`) | ✅ Morto, 1 falha: `PAP-07: when the session closes after registering with the broker already gone, its credential file is gone and it exits with 0` |
| K1 | `broker/launch.ts:157` | PAP-56: só `.env` e `.env.<algo>` copiados | ✅ Morto, 1 falha: `PAP-56: the regular files of the root that start with .env and git does not track are copied with their content` |
| K15 | `plugin/hooks/usage.ts:85` | PAP-18: só `agent-*.jsonl` de `subagents/` | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| K2 | `broker/launch.ts:97` | PAP-39: só `CLAUDE_*` e `CLAUDECODE*` saem | ✅ Morto, 1 falha: `PAP-39: the three CLAUDE variables the dev sets for Claude Code stay, and every other one leaves` |
| A2 | `broker/launch.ts:149` | PAP-53: sem `--detach` antes do ref do branch da feature | ✅ Morto, 2 falham. Primeiro: `PAP-53: with a branch whose short name is refs/heads/<branch of the feature>, the worktree of the worker is born detached at the tip of the branch of the feature` |
| K9 | `plugin/hooks/usage.ts:75` | PAP-21: sem a guarda de `transcript_path` que não é texto | ✅ Morto, 1 falha: `PAP-21: with a transcript_path 0 the log gains a single usage of the model unknown with the four numbers 0` |
| A10 | `broker/launch.ts:184` | PAP-37: sem `abort.abort()` no prazo da leitura do log | ✅ Morto, 1 falha: `PAP-37: with a broker that takes the connection and never answers, start exits with the code of the session soon after it, with the read of the log abandoned`. O caso estoura os 30 s dele: a morte vem de um limite de tempo, que é o que o requisito agora diz |
| S10 | `plugin/hooks/stop.ts:27` | PAP-31: sem a conferência do status de `/events` | ✅ Morto, 2 falham (500 e 201). Primeiro: `PAP-31: with a status 500 for /events the hook does not block and sends the usage, even with a log in which the worker owes a result` |
| V6 | `broker/server.ts:390` | PAP-08: sem o `try` em volta do `rmSync` | ✅ Morto, 1 falha: `PAP-08: with the credential file swapped for a directory that is not empty, the server records the peer_left and exits with 0` |

#### Mutações novas

Nenhuma está nas tabelas das voltas 1 a 3 nem na varredura da T31.

| Mutation | File:line at 959bcb6 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| W1 | `broker/server.ts:391` | PAP-07, PAP-08: `rmSync` com `recursive: true`: um diretório no lugar do arquivo é apagado com o que tem | ✅ Morto, 1 falha: `PAP-08: with the credential file swapped for a directory that is not empty, the server records the peer_left and exits with 0` |
| W2 | `broker/server.ts:400` | PAP-07: sem `process.on("SIGTERM", cleanup)` | ❌ Sobreviveu (25 pass, 0 fail no Windows). Sonda abaixo: muda o resultado no Linux |
| W3 | `broker/server.ts:401` | PAP-07: sem o ouvinte de `end` da entrada; fica o de `close` | ⚪ Equivalente, com sonda (25 pass no Windows; 10 de 10 no Linux) |
| W4 | `plugin/hooks/usage.ts:93` | PAP-18: o primeiro arquivo de `subagents` ilegível encerra a leitura dos outros (`break`) | ✅ Morto, 1 falha: `PAP-18: a file of subagents that cannot be read counts nothing, and the others count` |
| W5 | `plugin/hooks/usage.ts:82` | PAP-18: o diretório dos subagentes é o `transcript_path` sem qualquer extensão, não só sem `.jsonl` | ❌ Sobreviveu (50 pass, 0 fail) |
| W6 | `plugin/hooks/usage.ts:56` | PAP-15: um `message.id` número serve de id | ✅ Morto, 1 falha: `PAP-15: a message.id that is not a non-empty text is no id: its line counts alone` |
| W7 | `broker/launch.ts:189` | PAP-37: o `fetch` do log não recebe o sinal do prazo | ✅ Morto, 1 falha: `PAP-37: with a broker that takes the connection and never answers, start exits with the code of the session soon after it, with the read of the log abandoned` |
| W8 | `plugin/hooks/stop.ts:24` | PAP-31: o prazo de `/events` não aborta a leitura | ✅ Morto, 1 falha: `PAP-31: with /events not answered in 2000 ms the hook does not block and sends the usage` |
| W9 | `plugin/hooks/stop.ts:29` | PAP-31: aceita `events` que é qualquer objeto, não só lista | ⚪ Equivalente, com sonda (25 pass) |
| W10 | `plugin/hooks/stop.ts:26` | PAP-28, PAP-31: o log é lido com `after=1` | ✅ Morto, 9 falham. Primeiro: `PAP-27: with a status 500 for /usage the hook exits 0 and writes nothing` |
| W11 | `broker/launch.ts:97` | PAP-39: fica toda variável cujo nome começa com o de uma das três do dev | ✅ Morto, 1 falha: `PAP-39: the three CLAUDE variables the dev sets for Claude Code stay, and every other one leaves` |
| W12 | `broker/launch.ts:97` | PAP-39: o prefixo `CLAUDE` é conferido sem caixa (`toUpperCase`) | ❌ Sobreviveu (120 pass, 0 fail) |
| W13 | `broker/launch.ts:91` | PAP-39: `CLAUDE_CODE_GIT_BASH_PATH` sai da lista das que ficam | ✅ Morto, 1 falha: o mesmo teste de W11 |
| W14 | `broker/launch.ts:155` | PAP-56: `git ls-files` sem `-z`, e a lista do que o git versiona deixa de casar com os nomes | ✅ Morto, 1 falha: `PAP-56: a file git tracks in the main checkout is not copied to a worktree whose commit does not have it` |
| W15 | `broker/launch.ts:157` | PAP-56: `!file.isFile()` vira `file.isDirectory()`, e um link simbólico `.env*` é copiado | ❌ Sobreviveu (90 pass, 0 fail) |
| W16 | `broker/launch.ts:147` | PAP-53: o judge nasce no branch da feature, como o leader | ✅ Morto, 2 falham. Primeiro: `PAP-53: the worktree of a judge is born detached at the tip of the branch of the open feature` |
| W17 | `broker/launch.ts:184` | PAP-37: a leitura do log é abortada 2 × 2000 ms depois do prazo, e não nele | ❌ Sobreviveu (64 pass, 0 fail) |
| W18 | `broker/launch.ts:195` | PAP-37, PAP-38: sem o prazo próprio; só o sinal do `fetch` encerra a leitura | ✅ Morto. `test/unit/launch.test.ts` não termina, porque o caso `PAP-38: without a name a worker is worker-1 when the broker does not answer in 2000 ms` (`:328`) fica preso no `fetch` que ignora o sinal. Sozinho, o caso não acaba em 60 s; os outros 44 do arquivo passam |

**Sensor depth**: 10 reinjeções e 18 mutações novas, em `broker/server.ts` (5), `plugin/hooks/usage.ts` (6), `plugin/hooks/stop.ts` (5) e `broker/launch.ts` (12)
**Sensor result**: 10 de 10 reinjetados mortos. Dos 18 novos, 11 mortos, 2 equivalentes com sonda e 5 sobreviventes. FAIL

#### As sondas

Cada sonda fica fora do clone e chama o código do clone: primeiro o original, depois o mutante.

| Mutante | Entrada | Original | Mutante | Julgamento |
| ------- | ------- | -------- | ------- | ---------- |
| W2 | Linux (`oven/bun:1.3.14`): sessão real registrada, `process.kill(pid, "SIGTERM")` | O arquivo de credencial some; o processo sai com 0 | O processo morre sem código (`null`) e o arquivo fica | Sobrevivente no Linux. No Windows o `SIGTERM` termina o processo sem ouvinte nos dois casos, e só a entrada fechada vale. Nenhum teste encerra a sessão por sinal |
| W3 | Os 9 casos de `server-credential.test.ts`, que fecham a entrada, no Windows e no Linux | 9 de 9 passam, e o arquivo some | 9 de 9 passam, e o arquivo some | Equivalente: o `close` da entrada vem depois do `end`, e `cleanup` só corre uma vez (`exiting`, `broker/server.ts:378`) |
| W5 | `transcript_path` `s1.txt` (main, 1 em cada campo) e `s1/subagents/agent-a.jsonl` (100) | `claude-opus` com 1 | `claude-opus` com 101 | Sobrevivente. Pela definição de "Transcripts da sessão" (`spec.md:106`), os subagentes de `s1.txt` ficam em `s1.txt/subagents`. Claude Code manda `.jsonl`: pouco peso, como K9 na volta 3 |
| W9 | `stop.ts` como processo, `worker-1`, `/events` com 200 e `events` `null`, `{}`, `{ reduce: 1, length: 1 }` e `{ "0": { seq: 1 } }` | Nos quatro: não bloqueia, um `POST /usage`, código 0 | O mesmo nos quatro | Equivalente. `nudge` chama `events.reduce` (`plugin/hooks/nudge.ts:40`). JSON não traz função, então todo objeto que não é lista lança erro aí, e o `catch` de `stop.ts:31` dá nulo. O nome fora do squad volta antes (`nudge.ts:36`) |
| W12 | `sessionEnv` com `claude_home`, `Claude_Code_Entrypoint`, `CLAUDE_CONFIG_DIR_X`, `CLAUDE_CONFIG_DIR` | Ficam `claude_home` e `Claude_Code_Entrypoint`; sai `CLAUDE_CONFIG_DIR_X` | Saem também `claude_home` e `Claude_Code_Entrypoint` | Sobrevivente: o texto diz que o nome começa com `CLAUDE` e que as outras ficam sem mudança. Fica também a lacuna de precisão da caixa |
| W15 | `.env.link`, link simbólico para um arquivo regular fora da raiz; `worktree()` de `worker-1` | O worktree não tem `.env.link` | O worktree tem `.env.link` com `SECRET=1` | Sobrevivente: um link não é arquivo regular na leitura do código, e o mutante copia o conteúdo do alvo. A sonda rodou no Windows, onde o link foi criado |
| W17 | `bun cli.ts start mother` com broker que aceita e nunca responde, `SQUAD_CLAUDE=git` | Sai com 129 aos 2,16 s | Sai com 129 aos 6,09 s | Sobrevivente com ressalva. A sessão sai em cerca de 2,1 s, e a leitura ainda segura o launcher por 4 s, contra o que `spec.md:103` diz. Um limite de tempo sempre tem folga; esta passa 4,6 vezes o tempo medido |

### Gate no clone

- `bun node_modules/typescript/bin/tsc --noEmit`: código 0.
- Os sete arquivos sem mutação (`hook-stop`, `server-credential`, `launch-worktree`, `hook-usage`, `launch-args`, `cli`, `launch`): 204 pass, 3 skip, 0 fail, 207 testes, 695 asserções, 60,66 s.
- A suíte inteira no Windows e no Linux é do orquestrador; esta volta não a rodou.

### Lacunas de precisão

- **PAP-37**: fechada no texto pela frase de `spec.md:103`. O que falta é um teste que distinga (W17), não texto.
- **PAP-39 (nova)**: "nome começa com `CLAUDE`" não diz se a caixa conta. O código confere com caixa (`broker/launch.ts:97`). No Windows, `claudecode` e `CLAUDECODE` são a mesma variável para o sistema.
- **PAP-56 (nova, menor)**: "arquivo regular" não diz o que é um link simbólico para um arquivo regular. O código não segue o link e não copia (`broker/launch.ts:157`).

### Correções propostas

Todas são de teste. Nenhuma pede mudança de produção, exceto a escolha de texto do Fix 12.

- **Fix 10 (PAP-07, W2)**: em `test/integration/server-credential.test.ts`, encerrar a sessão registrada com `SIGTERM`: o arquivo some e o processo sai com 0. O caso fica pulado no Windows, como o do modo `0600`, e roda no Linux. Done when: W2 morre no Linux.
- **Fix 11 (PAP-18, W5)**: em `test/unit/hook-usage.test.ts`, um `transcript_path` sem `.jsonl` (`s1.txt`) com `s1/subagents/agent-a.jsonl` ao lado: conta só o principal. Done when: W5 morre.
- **Fix 12 (PAP-39, W12)**: o dev decide se a caixa conta. Se não conta, como o código: juntar `claude_home` ao caso de `test/unit/launch-args.test.ts:294`, no esperado, e dizer em PAP-39 que a comparação respeita a caixa. Se conta: muda o código e o texto. Done when: W12 morre.
- **Fix 13 (PAP-56, W15)**: em `test/unit/launch-worktree.test.ts`, junto ao caso de `:275`, um `.env.link` que é link simbólico para um arquivo regular não é copiado. O caso fica pulado onde o link não pode ser criado. Dizer em PAP-56 que o link não conta. Done when: W15 morre.
- **Fix 14 (PAP-37, W17)**: apertar `test/integration/cli.test.ts:240` para o prazo mais uma folga, por exemplo 5000 ms; o original mede 2,16 s. Done when: W17 morre e A10 segue morto.

### Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-07 | Implementing | ❌ Needs Fix (Fix 10): K13 morre; W2 sobrevive no Linux, `broker/server.ts:400` |
| PAP-18 | Implementing | ❌ Needs Fix (Fix 11): K15 e W4 morrem; W5 sobrevive, `plugin/hooks/usage.ts:82` |
| PAP-21 | Implementing | ✅ Verified: K9 morre em `test/integration/hook-stop.test.ts:154` |
| PAP-31 | Implementing | ✅ Verified: K16 e S10 morrem em `test/integration/hook-stop.test.ts:304`; W8 e W10 morrem; W9 é equivalente |
| PAP-37 | Implementing | ❌ Needs Fix (Fix 14), com ressalva: o texto fechou e A10, W7 e W18 morrem; W17 sobrevive ao limite de 10 s de `test/integration/cli.test.ts:240` |
| PAP-39 | Texto mudado na revisão do PR 12 (as três variáveis que ficam), com o teste do Fix 5 de `validation.md` junto; sem volta do Verifier depois disso | ❌ Needs Fix (Fix 12): K2, W11 e W13 morrem em `test/unit/launch-args.test.ts:294`; W12 sobrevive, `broker/launch.ts:97`, com a lacuna de precisão da caixa |
| PAP-53 | Implementing | ✅ Verified: A2 morre em `test/unit/launch-worktree.test.ts:208`, para worker e judge; W16 morre |
| PAP-56 | Implementing | ❌ Needs Fix (Fix 13): K1 e W14 morrem; W15 sobrevive, `broker/launch.ts:157` |

PAP-01, PAP-15, PAP-33, PAP-42 e PAP-68 seguem `Verified`: os textos do Fix 9 batem com o código e com os testes.

### Lições registradas

Pelo `lessons.py`, todas como candidatas:

- L-099: W12, W15 e W5, com o mesmo texto, juntados pelo script.
- L-100: W17.
- L-101: W2.

---

## Reverificação dos Fix 10 a Fix 14 (2026-10-16)

Volta 5. O dev decidiu em 2026-10-16 aplicar Fix 10 a Fix 14, com a caixa contando em PAP-39 como o código faz (Fix 12 só em texto e teste). O autor fez isso em `test/papeis-gaps`, `9f1ebd0..ce5f774` sobre `c8cb88c` (T40 a T44, fase 10 de `tasks.md`). Escopo desta volta: PAP-07, PAP-18, PAP-37, PAP-39 e PAP-56. As linhas de código citadas são de `ce5f774`.

### Ambiente e isolamento

- **Intervalo**: `c8cb88c..ce5f774`.
- **Ambiente**: Windows 11 Pro 10.0.26200, Bun 1.3.14. Clone físico `scratchpad\verifier5` (`git clone --no-hardlinks -c core.autocrlf=false --branch test/papeis-gaps`) em `ce5f774`, com `bun install --frozen-lockfile` próprio. Linux: contêiner `oven/bun:1.4.2` sobre `scratchpad\v5lin`, um clone de `verifier5` montado só para leitura e copiado para dentro, com `git`, `lsof`, `procps` e `bun install` próprios.
- **Repositório real**: `git status --porcelain` antes, vazio, em `test/papeis-gaps` e `ce5f774`. Nenhum stash, commit, push, troca de branch nem reset. As mutações rodaram no clone, uma de cada vez. Depois de cada uma: `git checkout -- <arquivo>`, e `git status --porcelain` vazio conferido pelo script antes da seguinte. As sondas rodam numa terceira cópia (`scratchpad\v5probe`), com o mutante gravado ao lado do original como `<arquivo>.<id>.ts` e apagado depois; essa cópia ficou limpa. Os scripts e as saídas ficam em `scratchpad\v5`. Os clones `mut`, `lin` e `verifier4` não foram tocados. Nenhum `claude` real rodou: os casos de `cli.test.ts` usam `SQUAD_CLAUDE=git` ou um script compilado. Todo `broker.ts` e `server.ts` subiu pelos ajudantes de teste, com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.
- **No fim**: `git status --porcelain` mostra `.specs/features/papeis/validation.md` (este relatório), `.specs/LESSONS.md` e `.specs/lessons.json` (gravados pelo `lessons.py`), e nada mais.

### Produção intacta

- `git diff 055d629..ce5f774 --name-only` só lista arquivos de `broker/test/`, de `.specs/` e `ROADMAP.md`. Nenhum arquivo de produção.
- `c8cb88c..ce5f774` muda `spec.md`, `tasks.md` e cinco arquivos de `broker/test/`, com 191 linhas a mais e 15 a menos. O diff de `broker/test` foi lido linha a linha. Nenhum `expect` foi removido. Entraram dois `skipIf`, ambos em casos novos: o de `SIGTERM`, no Windows, e o do link, onde o link não pode ser criado; neste Windows o link é criado e o caso roda. As linhas removidas:
  - o `started` do caso de PAP-37;
  - o comentário e o `expect(Date.now() - started).toBeLessThan(10_000)`, trocados por `expect(res.ms).toBeLessThan(5000)` (`test/integration/cli.test.ts:242`), mais estrito: o tempo agora conta só o processo do CLI, sem o repositório de teste que `startWith` monta;
  - o `return` de `runCli`, que ganhou `ms` e manteve o resto. O `import` de `launch-worktree.test.ts` ganhou `symlinkSync`.
- `spec.md` mudou em PAP-39 (a caixa), em PAP-56 (o link) e nas cinco linhas de rastreabilidade, que dizem `Implementing`.

### Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-07 | O arquivo de credencial some quando o servidor MCP encerra depois de registrado | `test/integration/server-credential.test.ts:98`–`:107`: sessão registrada, `process.kill(pid, "SIGTERM")` (`:104`), sai com 0 em até 1500 ms (`:105`), o arquivo some (`:107`). Pulado no Windows. O 0 é o que o código dá (`broker/server.ts:396`) e o que PAP-08 pede ao encerramento; o resultado de PAP-07 é o arquivo | ❌ GAP parcial. O caso mata W2 no Linux. Nenhum caso encerra a sessão por `SIGINT`, e Y1 vive: sem `process.on("SIGINT", cleanup)` (`broker/server.ts:399`), o processo morre pelo sinal e o arquivo fica. Ctrl+C no terminal manda `SIGINT` ao grupo de processos inteiro, servidor MCP incluído |
| PAP-18 | Todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/` soma (`spec.md:106`) | `test/unit/hook-usage.test.ts:224`–`:228`: `s1.txt` com `s1/subagents/agent-a.jsonl` ao lado; `toEqual` com só o principal (1 em cada campo) | ❌ GAP parcial. O caso afirma o resultado da definição e mata W5. Sobrevivem Y5: o `.jsonl` sai do primeiro lugar do caminho, não do fim (`plugin/hooks/usage.ts:82`). E Y6: um nome que só contém `.jsonl`, como `agent-b.jsonl.bak`, conta (`:85`). Nenhum caminho dos testes tem `.jsonl` antes do fim, e nenhum arquivo de `subagents` termina em outra coisa depois de `.jsonl`. O título diz que os subagentes de `s1.txt` ficam em `s1.txt/subagents`; esse diretório não pode existir, porque `s1.txt` é um arquivo (`ENOTDIR`, sonda de Y10). O título é coerente com a definição, só que vazio |
| PAP-37 | Um processo, código de saída dele; pela definição (`spec.md:103`), a leitura lida com prazo de 2000 ms que não responde nele é abandonada nele, e nada dela segura o launcher | `test/integration/cli.test.ts:229`–`:253`: broker que aceita e nunca responde, `git` no lugar da sessão; `:239` `toBe(129)`; `:242` `res.ms` menor que 5000; a conexão chegou. Oito execuções sem mutação: de 2138 a 2439 ms (abaixo) | ❌ GAP parcial. O limite é certo para o que mede, e não oscila: a folga é de 2,5 s sobre o maior tempo visto. Mata W17 (6248 ms) e A10 (o caso estoura os 30 s). Um limite de tempo de saída não fixa o valor do prazo: Y9, prazo de 3000 ms, sai aos 3140 ms e passa, e `test/unit/launch.test.ts:337`–`:339` (de 2000 a 5000 ms) também deixa passar. A sonda mostra o resultado que muda: um log respondido aos 2500 ms é abandonado pelo original e lido pelo mutante |
| PAP-39 | Sem nenhuma variável cujo nome começa com `CLAUDE`, com a caixa contando, a não ser as três do dev; as outras sem mudança | `test/unit/launch-args.test.ts:294`–`:319`: `claude_home` e `Claude_Code_Entrypoint` ficam (`:306`, `:314`), com o objeto inteiro | ❌ GAP parcial. A frase nova diz o que `broker/launch.ts:97` faz (`startsWith` e `includes` com caixa), e o caso mata W12 e K2. A caixa vale também para as três exceções: `CLAUDE_config_dir` começa com `CLAUDE` e não é `CLAUDE_CONFIG_DIR`, e sai. Nenhum caso tem uma exceção com outra caixa, e Y7 vive. ⚠️ No Windows o sistema não distingue a caixa: a `Claude_Code_Entrypoint` que fica chega à sessão como a `CLAUDE_CODE_ENTRYPOINT` que PAP-39 tira. Quem põe o nome com outra caixa é o dev; a decisão foi dele e está escrita |
| PAP-56 | Cópia de cada arquivo regular da raiz cujo nome começa com `.env` e que o git não versiona; um link simbólico, mesmo para um arquivo regular, não é arquivo regular e não é copiado | `test/unit/launch-worktree.test.ts:315`–`:323`: `.env.link`, link para `secret` fora da raiz; `:322` a listagem inteira é `.env`, `.git`, `README.md`. Pulado onde o link não pode ser criado; rodou no Windows e no Linux | ✅ PASS. A frase nova diz o que `broker/launch.ts:157` faz: `Dirent.isFile()` de `readdirSync(..., { withFileTypes: true })` não segue o link. O caso mata W15 no Windows e no Linux; K1 e Y8 morrem |

### Discrimination Sensor

Um script aplica cada mutação, confere que ela casou uma vez só, roda os testes da camada e restaura o arquivo com `git checkout --`. Depois confere `git status --porcelain` vazio no clone antes da seguinte. Controle: sem mutação, os sete arquivos passam (abaixo, "Gate no clone"). Testes por camada:

- `server-credential.test.ts` e `server.test.ts` para `server.ts`;
- `hook-usage.test.ts` e `hook-stop.test.ts` para `usage.ts`;
- `launch-args.test.ts`, `launch.test.ts` e `cli.test.ts` para `sessionEnv`;
- os três `launch*.test.ts` e `cli.test.ts` para o `worktree`;
- `launch.test.ts` e `cli.test.ts` para `readLog`.

No Linux, rodaram sem mutação, com W2, Y1, Y4 e W15: `server-credential.test.ts`, `server.test.ts` e `launch-worktree.test.ts`, e a sonda de `SIGINT`. Sem mutação: 65 pass, 0 fail.

#### Os cinco da volta 4 e os seis mortos antes, reinjetados

| Mutation | File:line at ce5f774 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| W2 | `broker/server.ts:400` | PAP-07: sem `process.on("SIGTERM", cleanup)` | ✅ Morto no Linux, 1 falha: `PAP-07: when the session registered is ended by SIGTERM, its credential file is gone and it exits with 0`. No Windows vive (25 pass), porque o caso é pulado lá, como deve |
| W5 | `plugin/hooks/usage.ts:82` | PAP-18: o diretório dos subagentes é o `transcript_path` sem qualquer extensão | ✅ Morto, 1 falha: `PAP-18: only .jsonl leaves the transcript path: the subagents of s1.txt are in s1.txt/subagents, not in s1/subagents` |
| W12 | `broker/launch.ts:97` | PAP-39: o prefixo `CLAUDE` conferido sem caixa (`toUpperCase`) | ✅ Morto, 1 falha: `PAP-39: the three CLAUDE variables the dev sets for Claude Code stay, and every other one leaves` |
| W15 | `broker/launch.ts:157` | PAP-56: `!file.isFile()` vira `file.isDirectory()`, e o link é copiado | ✅ Morto, 1 falha no Windows e no Linux: `PAP-56: a .env* that is a symbolic link to a regular file is not a regular file, and is not copied` |
| W17 | `broker/launch.ts:184` | PAP-37: a leitura abortada 2 × 2000 ms depois do prazo | ✅ Morto, 1 falha: `PAP-37: with a broker that takes the connection and never answers, start exits with the code of the session soon after it, with the read of the log abandoned`. O CLI sai aos 6248 ms |
| K13 | `broker/server.ts:386` | PAP-07: o `rmSync` dentro do `try` do `/unregister` | ✅ Morto, 1 falha: `PAP-07: when the session closes after registering with the broker already gone, its credential file is gone and it exits with 0` |
| K15 | `plugin/hooks/usage.ts:85` | PAP-18: só `agent-*.jsonl` de `subagents/` | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| K2 | `broker/launch.ts:97` | PAP-39: só `CLAUDE_*` e `CLAUDECODE*` saem | ✅ Morto, 1 falha: o mesmo teste de W12 |
| K1 | `broker/launch.ts:157` | PAP-56: só `.env` e `.env.<algo>` copiados | ✅ Morto, 1 falha: `PAP-56: the regular files of the root that start with .env and git does not track are copied with their content` |
| A10 | `broker/launch.ts:184` | PAP-37: sem `abort.abort()` no prazo | ✅ Morto, 1 falha: o mesmo teste de W17, que estoura os 30 s dele |
| V6 | `broker/server.ts:390` | PAP-08: sem o `try` em volta do `rmSync` | ✅ Morto, 1 falha: `PAP-08: with the credential file swapped for a directory that is not empty, the server records the peer_left and exits with 0` |

#### Mutações novas

Nenhuma está nas tabelas das voltas 1 a 4, nem entre as da T31.

| Mutation | File:line at ce5f774 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| Y1 | `broker/server.ts:399` | PAP-07: sem `process.on("SIGINT", cleanup)` | ❌ Sobreviveu (25 pass no Windows; no Linux, 0 falhas fora da sonda). Sonda abaixo: muda o resultado no Linux |
| Y2 | `broker/server.ts:385` | PAP-07, PAP-08: o `/unregister` é mandado sem `await`, e o processo sai logo depois do `rmSync` | ⚪ Equivalente, com sonda e ressalva (25 pass) |
| Y3 | `broker/server.ts:396` | PAP-07, PAP-08: o encerramento sai com 1 | ✅ Morto, 2 falham. Primeiro: `PAP-07: when the session closes after registering with the broker already gone, its credential file is gone and it exits with 0` |
| Y4 | `broker/server.ts:402` | PAP-07: sem o ouvinte de `close` da entrada; fica o de `end` | ⚪ Equivalente, com sonda (25 pass no Windows, 38 no Linux) |
| Y5 | `plugin/hooks/usage.ts:82` | PAP-18: `/\.jsonl/` sem `$`: sai o primeiro `.jsonl` do caminho, não o do fim | ❌ Sobreviveu (51 pass, 0 fail) |
| Y6 | `plugin/hooks/usage.ts:85` | PAP-18: conta todo nome de `subagents/` que contém `.jsonl`, não só o que termina nele | ❌ Sobreviveu (51 pass, 0 fail) |
| Y7 | `broker/launch.ts:97` | PAP-39: as três que ficam são comparadas sem caixa (`OF_THE_DEV.includes(key.toUpperCase())`) | ❌ Sobreviveu (120 pass, 0 fail) |
| Y8 | `broker/launch.ts:155` | PAP-56: `git ls-files -z -- .env`, e só o `.env` conta como versionado | ✅ Morto, 1 falha: `PAP-56: a file git tracks in the main checkout is not copied to a worktree whose commit does not have it` |
| Y9 | `broker/launch.ts:186` | PAP-37: o prazo da leitura do log é 1,5 × 2000 ms | ❌ Sobreviveu (64 pass, 0 fail). O caso de `cli.test.ts` mede 3140 ms |
| Y10 | `plugin/hooks/usage.ts:82` | PAP-18: sem `.jsonl` no fim, nenhum diretório de subagentes é procurado | ⚪ Equivalente, com sonda (51 pass) |

**Sensor depth**: 11 reinjeções e 10 mutações novas, em `broker/server.ts` (4), `plugin/hooks/usage.ts` (4) e `broker/launch.ts` (2) entre as novas; W2, Y1, Y4 e W15 também no Linux
**Sensor result**: 11 de 11 reinjetados mortos (W2 no Linux). Dos 10 novos, 2 mortos, 3 equivalentes com sonda e 5 sobreviventes. FAIL

#### As sondas

Cada sonda roda o original e o mutante com a mesma entrada, fora do clone das mutações.

| Mutante | Entrada | Original | Mutante | Julgamento |
| ------- | ------- | -------- | ------- | ---------- |
| Y1 | Linux (`oven/bun:1.4.2`): o caso de `SIGTERM` de `server-credential.test.ts:98` com `SIGINT`, numa cópia do arquivo | Sai com 0; o arquivo some | Morre pelo sinal (código `null`); o arquivo fica | Sobrevivente no Linux. PAP-07 vale para todo encerramento depois do registro, e Ctrl+C no terminal manda `SIGINT` ao servidor MCP junto com a sessão |
| Y2 | `server-credential.test.ts -t "PAP-0[78]" --rerun-each 10`: 40 casos no Windows, 50 no Linux | Todos passam; `peer_left` com `reason: "unregistered"` | Todos passam; o mesmo `peer_left` | Equivalente para PAP-07: o `rmSync` é síncrono e roda antes do `process.exit` nos dois, então o arquivo some igual. Ressalva para PAP-08: o `peer_left` passa a depender de o `fetch` do Bun escrever o pedido antes da saída; em 90 de 90 encerramentos escreveu |
| Y4 | Os casos de `server-credential.test.ts`, que fecham a entrada, no Windows e no Linux; e o pai da sessão registrada morto com `kill(9)`, 5 vezes em cada | Os casos passam. No Linux o pai morto dá fim de arquivo, e o arquivo some (`peer_left:unregistered`) 5 de 5. No Windows o servidor morre com o pai, e o arquivo fica 5 de 5 | O mesmo nos três | Equivalente: o fim da entrada dá `end` antes de `close`, e `cleanup` só corre uma vez (`exiting`, `broker/server.ts:378`). No Windows nenhum ouvinte roda, porque o processo é terminado |
| Y5 | `transcript_path` `logs.jsonl.d/s1.jsonl` (1 em cada campo) e `logs.jsonl.d/s1/subagents/agent-a.jsonl` (100) | `claude-opus` com 101 | `claude-opus` com 1 | Sobrevivente: o mutante procura em `logs.d/s1.jsonl/subagents`. Pouco peso: uma pasta de projeto com `.jsonl` no nome |
| Y6 | `s1.jsonl` (1), `s1/subagents/agent-a.jsonl` (10) e `s1/subagents/agent-b.jsonl.bak` (100) | `claude-opus` com 11 | `claude-opus` com 111 | Sobrevivente: `agent-b.jsonl.bak` não é `*.jsonl` (`spec.md:106`) |
| Y7 | `sessionEnv` com `CLAUDE_config_dir`, `Claude_Config_Dir`, `CLAUDE_CODE_oauth_token` e `CLAUDE_CONFIG_DIR` | Saem `CLAUDE_config_dir` e `CLAUDE_CODE_oauth_token`; ficam `Claude_Config_Dir` e `CLAUDE_CONFIG_DIR` | Ficam as quatro | Sobrevivente: com a caixa contando, `CLAUDE_config_dir` começa com `CLAUDE` e não é uma das três |
| Y9 | `launch(["worker"])` num repositório, com um `fetch` que responde aos 2500 ms um log em que `worker-1` está online e que obedece ao sinal | Abandona a leitura aos 2000 ms: abre `worker-1`, em 2136 ms | Lê o log: abre `worker-2`, em 2648 ms | Sobrevivente: pela definição (`spec.md:103`) a leitura que não responde em 2000 ms falha, e ninguém está online. Muda também o nome que PAP-38 escolhe |
| Y10 | `s1.txt` com `s1/subagents/agent-a.jsonl` (100); `mkdirSync("s1.txt/subagents")`; e `s2.JSONL` com `s2/subagents/agent-a.jsonl` | 1 em cada campo nos dois; o diretório não pode ser criado (`ENOTDIR`) | O mesmo | Equivalente: quando o principal pode ser lido, ele é um arquivo, e `<caminho sem .jsonl>/subagents` só difere do caminho quando ele termina em `.jsonl` |

### Os tempos do caso de PAP-37

O mesmo caso de `test/integration/cli.test.ts:229`, oito vezes seguidas no Windows, sem mutação, com `res.ms` impresso por uma linha posta só para isso e tirada depois (`git checkout --`): 2171, 2142, 2138, 2166, 2141, 2157, 2439 e 2327 ms. Os oito passam. No gate e nas 9 mutações que rodam `cli.test.ts`, o caso só falhou com as duas do prazo (W17 e A10). Com mutação: W17 6248 ms (falha), Y9 3140 ms (passa), A10 acima de 30 s (falha).

O limite de 5000 ms são os 2000 ms do prazo mais a partida do `bun`, o `git` do launcher e a sessão, que sai na hora, com 2,5 s de folga sobre o maior tempo visto. É certo para o que o caso afirma, que a leitura não segura o launcher muito depois do prazo, e não oscila nesta máquina. Não pode ser apertado a ponto de fixar o valor do prazo sem ficar instável: o que distingue o prazo é uma resposta que chega depois dele (Fix 19).

### Gate no clone

- `bun node_modules/typescript/bin/tsc --noEmit`: código 0.
- Os sete arquivos sem mutação (`server-credential`, `hook-usage`, `launch-args`, `launch-worktree`, `cli`, `launch`, `hook-stop`): 206 pass, 4 skip, 0 fail, 210 testes, 697 asserções, 55,30 s. Os quatro pulados no Windows: o modo `0600` e o `SIGTERM` de `server-credential.test.ts`, e os dois casos do laço de `test/integration/cli.test.ts:419`, pulados no Windows. O caso do link rodou.
- No Linux, sem mutação, `server-credential.test.ts`, `server.test.ts` e `launch-worktree.test.ts`: 65 pass, 0 fail.
- A suíte inteira no Windows e no Linux é do orquestrador; esta volta não a rodou.

### Correções propostas

Todas são de teste. Nenhuma pede mudança de produção nem de texto.

- **Fix 15 (PAP-07, Y1)**: em `test/integration/server-credential.test.ts:98`, o caso de `SIGTERM` também com `SIGINT`: o arquivo some e o processo sai com 0. Pulado no Windows, como o de `SIGTERM`. Done when: Y1 morre no Linux e W2 segue morto.
- **Fix 16 (PAP-18, Y5)**: em `test/unit/hook-usage.test.ts`, um transcript numa pasta com `.jsonl` no nome (`logs.jsonl.d/s1.jsonl`, com `logs.jsonl.d/s1/subagents/agent-a.jsonl`): o subagente conta. Done when: Y5 morre.
- **Fix 17 (PAP-18, Y6)**: no mesmo arquivo, um `agent-b.jsonl.bak` em `subagents/` não conta. Done when: Y6 morre.
- **Fix 18 (PAP-39, Y7)**: em `test/unit/launch-args.test.ts:294`, `CLAUDE_config_dir` no ambiente e fora do esperado. Done when: Y7 morre e W12 segue morto.
- **Fix 19 (PAP-37, Y9)**: em `test/unit/launch.test.ts`, junto ao caso de `:328`, um `fetch` que obedece ao sinal e responde aos 2500 ms um log em que `worker-1` está online: o worker abre como `worker-1`. A folga é de 500 ms para cada lado do prazo, sem limite de tempo de saída. Done when: Y9 morre, e W17 e A10 seguem mortos.

### Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-07 | Implementing: Fix 10 de `validation.md` aplicado na T40, à espera da reverificação | ❌ Needs Fix (Fix 15): K13 e V6 morrem; W2 morre no Linux em `test/integration/server-credential.test.ts:98`; Y1 sobrevive no Linux, `broker/server.ts:399` |
| PAP-18 | Implementing: Fix 11 de `validation.md` aplicado na T41, à espera da reverificação | ❌ Needs Fix (Fix 16, Fix 17): W5 morre em `test/unit/hook-usage.test.ts:224`, K15 segue morto; Y5 (`plugin/hooks/usage.ts:82`) e Y6 (`:85`) sobrevivem |
| PAP-37 | Implementing: Fix 14 de `validation.md` aplicado na T44, à espera da reverificação | ❌ Needs Fix (Fix 19): W17 e A10 morrem em `test/integration/cli.test.ts:242`, que mediu de 2138 a 2439 ms; Y9, o prazo de 3000 ms, sobrevive, `broker/launch.ts:186` |
| PAP-39 | Implementing: Fix 12 de `validation.md` aplicado na T42, à espera da reverificação | ❌ Needs Fix (Fix 18): a frase da caixa bate com `broker/launch.ts:97`; W12 e K2 morrem em `test/unit/launch-args.test.ts:294`; Y7 sobrevive |
| PAP-56 | Implementing: Fix 13 de `validation.md` aplicado na T43, à espera da reverificação | ✅ Verified: a frase do link bate com `broker/launch.ts:157`; W15 morre em `test/unit/launch-worktree.test.ts:315` no Windows e no Linux; K1 e Y8 morrem |

Y9 muda também o nome que PAP-38 escolhe, porque a definição de feature aberta é a mesma; o caso do Fix 19 cobre os dois.

### Lições registradas

Pelo `lessons.py`, como candidatas:

- Y1 junto a L-101, com o mesmo texto.
- Y5, Y6 e Y7 junto a L-099, com o mesmo texto.
- L-102: Y9, lição nova.
