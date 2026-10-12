# Papéis Validation

**Result**: FAIL

**Round**: 1 de no máximo 3
**Date**: 2026-10-12
**Spec**: `.specs/features/papeis/spec.md`, PAP-01 a PAP-75, edge cases e "Success Criteria"
**Diff range**: `f162184..0848c8f` (`main..feat/papeis`), 25 commits, 51 arquivos
**Verifier**: agente novo e independente (author ≠ verifier). Não escreveu código, testes, tarefas nem relatórios da fatia.
**Environment**: Windows 11 Pro 10.0.26200, Bun 1.4.2, git real. Tudo rodou numa cópia física do branch em `0848c8f`, com `bun install` próprio, fora do repositório.

73 dos 75 requisitos têm evidência que bate com a spec. Dois não: PAP-37 e PAP-08. O gate está verde. O sensor injetou 76 mutações e 5 sobreviveram. Três delas estão no mesmo lugar: o `start` de `broker/cli.ts`, que é a única parte do launcher que nenhum teste roda até o fim com um comando que existe. Nenhum defeito de produção foi visto: os quatro sobreviventes de comportamento da spec são testes que não distinguem, não código errado.

O critério do Linux das "Success Criteria" roda em paralelo com o orquestrador e fica pendente aqui. Ele não entrou no veredito.

Durante a verificação o `HEAD` do repositório real passou de `0848c8f` para `ea490f4`, por dois commits de documentos que não são deste agente (`STATE.md`, `handoff-codex.md` e uma frase de "Assumptions" na spec). Nenhum AC e nenhum arquivo de `broker/`, `plugin/` ou `README.md` mudou. O intervalo verificado continua `f162184..0848c8f`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 a T21 | ✅ Done | Todo item de "Done when" marcado; conferido contra o código e os testes abaixo |
| T15 | ⚠️ Partial | O teste do `start` pelo processo real só cobre caminhos que falham antes de a sessão abrir. Ver PAP-37 |
| T2 | ⚠️ Partial | O teste do arquivo que não pode ser apagado não distingue encerrar de cair. Ver PAP-08 |
| T22 | ✅ Done | `real-sessions.md` cobre RS-01 a RS-14. Julgado abaixo |
| T23 | ✅ Done | PAP-74 e PAP-75 nas quatro skills e no conferidor |

`tasks.md` tem 0 itens em aberto. O cabeçalho ainda diz `In Progress`: é do orquestrador fechar.

---

## Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`. `:N` sozinho continua o arquivo citado antes na mesma célula. Cada resultado esperado foi relido na spec antes de olhar a asserção.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-01 | `plugin.json` com `name` `squad`; nenhum arquivo do plugin em `broker/` | `test/unit/plugin-manifest.test.ts:13` `expect(json(".claude-plugin", "plugin.json").name).toBe("squad")`; `:18` `expect([name, existsSync(join(BROKER, name))]).toEqual([name, false])` para `.claude-plugin`, `hooks`, `skills` e `roles.json` | ✅ PASS ⚠️ precisão: a spec não diz o que é "arquivo do plugin" |
| PAP-02 | Um servidor só, `squad`, `bun` e `["${CLAUDE_PLUGIN_ROOT}/../broker/server.ts"]` | `test/unit/plugin-manifest.test.ts:23` `expect(json(".mcp.json").mcpServers).toEqual({ squad: { command: "bun", args: [...] } })` | ✅ PASS |
| PAP-03 | Só `UserPromptSubmit` e `Stop`, um hook `command` cada, `timeout` 10 e 20 | `test/unit/plugin-manifest.test.ts:29` chaves `["Stop", "UserPromptSubmit"]`; `:33` e `:39` `toEqual([{ hooks: [{ type: "command", command: 'bun "${CLAUDE_PLUGIN_ROOT}/hooks/…"', timeout: 10 \| 20 }] }])` | ✅ PASS |
| PAP-04 | Exatamente quatro skills, `SKILL.md` em cada | `test/unit/skills.test.ts:278` `expect(readdirSync(SKILLS).sort()).toEqual(["judge", "leader", "mother", "worker"])`; `:280` cada diretório `["SKILL.md"]` | ✅ PASS |
| PAP-05 | Instruções, descrição de `ready` e resposta a número errado com `kind="ping"` e sem `source="squad"` | `test/integration/server.test.ts:309` `toContain('kind="ping"')`, `:310` `not.toContain("source=")`; `:317`–`:319` a frase de `task\|result\|verdict`; `:326`–`:327` a descrição; `:334`–`:336` a resposta com `isError` | ✅ PASS |
| PAP-06 | Arquivo `<SQUAD_DB>.<nome>.id` com exatamente o `id`, antes de responder, modo `0600` onde há modo | `test/integration/server-credential.test.ts:40` não existe antes; `:45` `expect(existsSync(file)).toBe(true)` logo depois de `ready`; `:48`–`:50` `POST /state` com o conteúdo lido: 200 e `{ feature: null, ticket: null, owed: [] }`; `:53` o `turn_started` sai como `worker-1`; `:61` `expect(statSync(file).mode & 0o777).toBe(0o600)`, pulado no Windows; caminho em `test/unit/config.test.ts:80` e `:85` | ✅ PASS. A asserção do modo só roda fora do Windows: fica para a suíte do Linux |
| PAP-07 | O arquivo some quando o servidor encerra depois de registrado | `test/integration/server-credential.test.ts:73` some em até 1500 ms; `:75` `expect(existsSync(file)).toBe(false)`; `:76` `["peer_joined", "peer_left"]` | ✅ PASS |
| PAP-08 | Arquivo que não pode ser gravado ou apagado: o registro e o encerramento concluem do mesmo jeito | Gravar: `test/integration/server-credential.test.ts:85`–`:90` sem erro, texto `Registered in the squad as worker-1 (worker).`, `peer_joined`, `send_result` listada. Apagar: `:105`–`:112` `peer_left` `unregistered`, processo morto, `kept` intacto | ❌ GAP na metade "apagado": o teste passa igual com o servidor caindo com código 1 (V6). ⚠️ precisão: "do mesmo jeito" não diz o observável |
| PAP-09 | Registro recusado não grava arquivo | `test/integration/server-credential.test.ts:119`–`:125` `invalid_name`, nenhum arquivo, nem depois de fechar; `:133`–`:135` `name_taken`; `:153`–`:157` o arquivo de quem tem o nome fica igual | ✅ PASS |
| PAP-10 | Um único `POST /turn-started` com `{ id }` sem espaços nas pontas, código 0 | `test/integration/hook-turn-started.test.ts:52` log `[["peer_joined", "broker"], ["turn_started", "worker-1"]]`; `:61` `expect(server.requests).toEqual([{ method: "POST", path: "/turn-started", body: { id: "the-id-of-worker-1" } }])` a partir de `"  the-id-of-worker-1 \n"`; `:62` código 0 | ✅ PASS |
| PAP-11 | Nada na saída padrão, em nenhum caso | `test/integration/hook-turn-started.test.ts:51`, `:63`, `:72`, `:80`, `:86`, `:94`, `:103`, `:111` `expect(hook.stdout).toBe("")` nos oito casos | ✅ PASS |
| PAP-12 | Sem `SQUAD_ROLE`, ou sem arquivo, ou arquivo vazio: nenhuma chamada, saída vazia, código 0 | `test/unit/hook-session.test.ts:41`, `:45`, `:49`, `:53`, `:57` `credential(...)` nulo, um gatilho por teste; pelo processo: `test/integration/hook-turn-started.test.ts:70`–`:72`, `:78`–`:80` e `test/integration/hook-stop.test.ts:327`–`:329`, `:335`–`:337` `expect(server.requests).toEqual([])`, código 0, saída vazia | ✅ PASS |
| PAP-13 | Broker sem resposta em 2000 ms, status ≠ 200 ou recusa: código 0 | `test/integration/hook-turn-started.test.ts:85` fora do ar; `:93`–`:95` `unknown_peer` de um broker real, log vazio; `:101`–`:103` status 500; `:109`–`:112` sem resposta, `hook.ms < 4000`; `test/unit/hook-session.test.ts:128`–`:129` `took >= 2000` e `< 3500`; `test/unit/config.test.ts:117` `expect(HOOK_TIMEOUT_MS).toBe(2000)` | ✅ PASS |
| PAP-14 | Soma por modelo dos quatro campos | `test/unit/hook-usage.test.ts:66`–`:69` `toEqual({ "claude-opus": { input: 110, output: 220, cache_write: 330, cache_read: 440 }, "claude-sonnet": { input: 6, output: 8, cache_write: 10, cache_read: 12 } })`; `:78` pelo arquivo | ✅ PASS |
| PAP-15 | Mesmo `message.id`: só a última linha; sem id conta sozinha | `test/unit/hook-usage.test.ts:94` `{ input: 107, output: 208, cache_write: 309, cache_read: 410 }` com a última sendo a menor; `:99` duas linhas iguais sem id somam; `:105` id vazio, número e `null` | ✅ PASS ⚠️ precisão: id que não é texto não vazio |
| PAP-16 | Campo ausente ou não inteiro ≥ 0 conta 0 | `test/unit/hook-usage.test.ts:119`–`:122`, quatro valores (ausente, `-5`, `1.5`, `"12"`) em cada um dos quatro campos | ✅ PASS |
| PAP-17 | Linha que não é JSON ou não é contada é ignorada, as vizinhas contam | `test/unit/hook-usage.test.ts:134`–`:137`, `:142`, `:147`–`:148`, `:153`, `:159`, `:164` `toEqual(NEIGHBOURS)`; `:169` a ignorada não troca a contada do mesmo id | ✅ PASS |
| PAP-18 | `subagents/*.jsonl` somam, com a regra do id entre todos os arquivos | `test/unit/hook-usage.test.ts:181`–`:184` dois arquivos somam e `agent-c.txt` não; `:190` id repetido conta uma vez com os números do subagente; `:199`–`:202` ordem dos nomes; `:208`–`:209`; `:216`–`:219` | ✅ PASS ⚠️ precisão: arquivo de subagente ilegível |
| PAP-19 | Sem transcript principal legível: nenhum modelo, sem falhar | `test/unit/hook-usage.test.ts:224`–`:225` e `:231` `toEqual({})`, com `subagents/` preenchido | ✅ PASS |
| PAP-20 | Credencial sem espaços nem quebras nas pontas | `test/unit/hook-session.test.ts:29`–`:30`; `test/integration/hook-turn-started.test.ts:61` | ✅ PASS |
| PAP-21 | Sem `transcript_path` texto: uso como PAP-19 | `test/unit/hook-usage.test.ts:235`–`:237`; `test/integration/hook-stop.test.ts:150` um `usage` de `unknown` com zeros | ✅ PASS |
| PAP-22 | `SQUAD_NAME` fora do squad: não bloqueia, encerra como PAP-23 | `test/unit/hook-nudge.test.ts:230` nulo para `worker-4`, `worker`, `human`, `broker` e vazio; `test/integration/hook-stop.test.ts:314`–`:320` saída vazia e os dois `POST /usage` sobre o log em que `worker-1` deve | ✅ PASS |
| PAP-23 | Um `POST /usage` por modelo, em ordem crescente, corpo com os sete campos, código 0, saída vazia | `test/integration/hook-stop.test.ts:128`–`:133` opus antes de sonnet num transcript em que sonnet vem primeiro, somas 15/25/35/45 e 101/202/303/404, `session_id` do payload; `:254`–`:257` os dois corpos por inteiro | ✅ PASS |
| PAP-24 | Nenhum modelo: um único `usage` de `unknown` com zeros | `test/integration/hook-stop.test.ts:142` `expect(usages(b)).toEqual([["worker-1", { session_id: SESSION, model: "unknown", ...ZERO }]])` | ✅ PASS |
| PAP-25 | Duas execuções, os mesmos números | `test/integration/hook-stop.test.ts:159`–`:161` | ✅ PASS |
| PAP-26 | Payload que não é objeto, ou sem `session_id` texto: `session_id` `unknown` e uso como PAP-19 | `test/integration/hook-stop.test.ts:169`; `:177` e `:180` para ausente, vazio e número, com um transcript que tem modelos e não é lido; `test/unit/hook-session.test.ts:156` | ✅ PASS |
| PAP-27 | `/usage` sem resposta em 2000 ms, status ≠ 200 ou recusa: código 0, saída vazia | `test/integration/hook-stop.test.ts:187`–`:189` recusa; `:197`–`:204` status 500, os dois modelos tentados; `:209`–`:210` fora do ar; prazo em `test/unit/hook-session.test.ts:135`–`:136` com `call("/usage", ...)` | ✅ PASS. O gatilho dos 2000 ms tem asserção em `call`, não pelo processo de `stop.ts` |
| PAP-28 | `stalled` no fim de turno hipotético: exatamente `{ decision: "block", reason }`, nenhum `usage`, código 0 | `test/integration/hook-stop.test.ts:217`–`:226` objeto inteiro com `TKT-13` e `seq 6`, uma linha, `usages(b)` vazio, log do mesmo tamanho; `:233`–`:235`; `test/unit/hook-nudge.test.ts:156`–`:157` `working` sobre o log como está e o `reason` mesmo assim | ✅ PASS |
| PAP-29 | Os cinco textos de `reason` e a dívida mais antiga | `test/unit/hook-nudge.test.ts:100`, `:106`, `:113`, `:119`, `:126` `toBe` com o texto inteiro de cada dívida; `:134` e `:145` a mais antiga nas duas ordens | ✅ PASS |
| PAP-30 | `stop_hook_active` `true`: não lê `/events`, não bloqueia, encerra | `test/integration/hook-stop.test.ts:241`–`:246`; `:254` `expect(server.requests).toEqual([...])` só com os dois `POST /usage` | ✅ PASS |
| PAP-31 | `/events` sem resposta em 2000 ms ou sem `{ events: [...] }`: não bloqueia, encerra | `test/integration/hook-stop.test.ts:262`–`:271` `hook.ms >= 2000` e `< 4500`; `:283`–`:289` quatro respostas | ✅ PASS ⚠️ precisão: status ≠ 200 com corpo válido não está no AC; `plugin/hooks/stop.ts:27` não tem teste (S10) |
| PAP-32 | Outro status que não `stalled`: não bloqueia; o `permission_request` aberto não livra | `test/unit/hook-nudge.test.ts:179`–`:183` sem dívida; `:196`–`:197` só entrega pendente; `:203` `blocked`; `:219` e `:222` `asked_by` de bloqueante aberta; `:209`–`:210` pedido aberto e o `reason` mesmo assim; pelo processo `test/integration/hook-stop.test.ts:299`–`:304` | ✅ PASS |
| PAP-33 | Formato do `roles.json`; recusa com o caminho | `test/unit/roles.test.ts:46`, `:51` válidos devolvidos como lidos; `:56`, `:61`, `:71`, `:82`, `:107` (15 recusas, uma por campo), `:113`, `:118` `expect(() => readRoles(path)).toThrow(path)` | ✅ PASS ⚠️ precisão: `workflows: null` |
| PAP-34 | As listas dos quatro papéis | `test/unit/roles.test.ts:127`, `:131`–`:135`, `:139`–`:143`, `:147`–`:151`, `:156`–`:160` por inteiro, `judge` sem a chave `workflows` | ✅ PASS |
| PAP-35 | `SQUAD_ROLES` ou `<raiz>/plugin/roles.json` | `test/unit/launch.test.ts:449`–`:450`; `test/unit/config.test.ts:97`–`:99`; o default em `test/unit/launch.test.ts:185` (o prompt vem do arquivo do plugin) | ✅ PASS |
| PAP-36 | `roles.json` válido sem o papel: falha como PAP-42 | `test/unit/launch.test.ts:520`–`:522`, por `refused` (`:464`–`:470`) | ✅ PASS |
| PAP-37 | Um único processo, `SQUAD_CLAUDE` ou `claude`, entrada, saída e erro herdados, sai com o código dele | `test/unit/launch.test.ts:172`–`:173` um `spawn`, `claude`; `:174`–`:189` argumentos, ambiente e diretório; `:190` `expect(code).toBe(7)`; `:197`; `test/unit/config.test.ts:112`. `broker/cli.ts:59`–`:71`, que dá ao `launch` o diretório atual e o `Bun.spawn` de verdade: nenhuma asserção com um comando que existe | ❌ GAP: herança do terminal, código de saída do processo real e diretório atual sem evidência automática (C1, C2, C6) |
| PAP-38 | Nome default; `worker-1` se a leitura falha | `test/unit/launch.test.ts:252`, `:259`, `:265`, `:273`, `:279`, `:289`–`:290`, `:300`, `:313`–`:317` (`ms >= 2000`) | ✅ PASS |
| PAP-39 | Ambiente sem `CLAUDE*`, com `SQUAD_NAME` e `SQUAD_ROLE` | `test/unit/launch-args.test.ts:273`–`:282` objeto inteiro, `MY_CLAUDE` fica; `:282` a entrada não muda; `test/unit/launch.test.ts:188` | ✅ PASS |
| PAP-40 | Os argumentos, nesta ordem | `test/unit/launch-args.test.ts:299`–`:324` vetor inteiro; `:328`–`:343`; `:369`–`:373`; `test/unit/launch.test.ts:174`–`:187` | ✅ PASS |
| PAP-41 | Uma linha `squad: ` na saída de erro, nenhum processo, código 1 | `test/unit/launch.test.ts:464`–`:468`; `test/integration/cli.test.ts:69`–`:71` `expect(res.err).toMatch(/^squad: .*nada.*\r?\n$/)`, código 1 | ✅ PASS |
| PAP-42 | Cada causa falha sem criar worktree nem copiar | `test/unit/launch.test.ts:475`, `:479`, `:483`, `:487`, `:491`, `:496`, `:502`–`:506`, `:511`, `:516`, cada uma por `refused` (`:469` `expect(existsSync(quiet.worktrees)).toBe(false)`, `:470` árvores iguais); `test/unit/launch-args.test.ts:47`, `:52`, `:57`, `:61`–`:63`, `:72` | ✅ PASS ⚠️ precisão: o que é uma opção e onde ela pode vir |
| PAP-43 | `ready` e depois `toolsFor(papel)`, nenhuma tool de outro papel | `test/unit/launch-args.test.ts:127`–`:129`; `:156`–`:175` a lista do worker escrita à mão; `:177` | ✅ PASS |
| PAP-44 | Regras `Bash(git …:*)` por papel, em ordem | `test/unit/launch-args.test.ts:134` `toEqual(BASH[role])`; `:149` nunca `push`, `reset`, `checkout`, `rm`; `:182`–`:185` | ✅ PASS |
| PAP-45 | `win32`: as mesmas com `PowerShell(` depois; fora dele, nenhuma | `test/unit/launch-args.test.ts:138`; `:142`–`:144` `linux` e `darwin`; `test/unit/launch.test.ts:211`–`:222` | ✅ PASS |
| PAP-46 | As linhas do system prompt | `test/unit/launch-args.test.ts:200`–`:206`, `:211`–`:213`, `:218`–`:223`, `:228`–`:233`, `:238`–`:242`, `:247`–`:254` `toBe` com o texto inteiro | ✅ PASS |
| PAP-47 | `--dangerously-skip-permissions` no lugar do modo e da lista | `test/unit/launch-args.test.ts:348`–`:361`; `test/unit/launch.test.ts:228`–`:239` | ✅ PASS |
| PAP-48 | Branch da feature em checkout em outra árvore: falha como PAP-57 | `test/unit/launch-worktree.test.ts:152`–`:154`; `test/unit/launch.test.ts:531`–`:534` | ✅ PASS |
| PAP-49 | Nome dado e online: abre do mesmo jeito | `test/unit/launch.test.ts:323`–`:327` | ✅ PASS |
| PAP-50 | Comando que não roda: falha com o nome dele | `test/unit/launch.test.ts:541`–`:545`; `test/integration/cli.test.ts:93`–`:98` | ✅ PASS |
| PAP-51 | Mother no checkout principal, nada criado | `test/unit/launch.test.ts:343`–`:350` mesmas árvores, mesmas listagens, mesmo `git status`, sem diretório de worktrees | ✅ PASS |
| PAP-52 | `<diretório de worktrees>/<nome>` | `test/unit/launch.test.ts:358`–`:363`, `:372`–`:375`; `test/unit/config.test.ts:103`–`:104`, `:108` | ✅ PASS |
| PAP-53 | Worker e judge destacados na ponta do branch da feature, ou no `HEAD` | `test/unit/launch-worktree.test.ts:86`–`:89`, `:96`–`:100`, `:107`–`:111`; `test/unit/launch.test.ts:400`–`:402`, `:431`–`:433`, `:439`–`:440` | ✅ PASS |
| PAP-54 | Leader no branch da feature, ou destacado no `HEAD` | `test/unit/launch-worktree.test.ts:119`–`:122` `expect(branch(dir)).toBe(FEATURE)`; `:129`–`:132`; `:139`–`:143`; `test/unit/launch.test.ts:424`–`:425` | ✅ PASS |
| PAP-55 | Worktree que já existe: usado como está | `test/unit/launch-worktree.test.ts:253`–`:258`, `:267`–`:271`; `test/unit/launch.test.ts:411`–`:418` | ✅ PASS |
| PAP-56 | Cópia dos `.env*` não versionados, sem sobrescrever | `test/unit/launch-worktree.test.ts:194`–`:197` listagem inteira; `:206`–`:207`; `:217`–`:218`; `:228`–`:230` `.env.shared` do branch fica | ✅ PASS |
| PAP-57 | `git worktree add` falha: mensagem do git, nada copiado | `test/unit/launch-worktree.test.ts:170`–`:174`; `test/unit/launch.test.ts:529`–`:534` | ✅ PASS |
| PAP-58 | De dentro de um worktree, como do checkout principal | `test/unit/launch-worktree.test.ts:64`–`:67`; `test/unit/launch.test.ts:385`–`:390`, `:344` | ✅ PASS. O vínculo com o diretório atual do processo (`broker/cli.ts:62`) cai em PAP-37 |
| PAP-59 | `bin.squad`, os quatro comandos, uso com 0 e 1 | `test/integration/cli.test.ts:54`–`:56`, `:62`–`:64`, `:69`–`:71`, `:113`–`:115` mesmo código e mesma saída de erro de `bun tui.ts`, `:120` `expect(pkg.bin).toEqual({ squad: "./cli.ts" })` | ✅ PASS |
| PAP-60 | Frontmatter e as sete seções, em ordem | `test/unit/skills.test.ts:231` nos quatro papéis, pelo conferidor de `:161`–`:173`; recusas em `:287`–`:324` | ✅ PASS |
| PAP-61 | Só tools do papel entre crases, e as obrigatórias | `test/unit/skills.test.ts:235`, conferidor em `:180`–`:187`; recusas em `:328`–`:345`, `:386`–`:394`, `:411`, `:441` | ✅ PASS |
| PAP-62 | `Start`: ping e `ready`, `state` antes de tudo, agir pelo que devolve, `git show <spec_commit>:<spec_ref>` | `test/unit/skills.test.ts:239`; prosa em `SKILL.md:16`–`:23` das quatro (tabela das skills) | ✅ PASS |
| PAP-63 | Proíbe o aviso de recebimento | `plugin/skills/worker/SKILL.md:27`, `judge/SKILL.md:27`, `leader/SKILL.md:27`, `mother/SKILL.md:27`: "Never send a message whose only content is to say that something was received, read or started." | ✅ PASS |
| PAP-64 | `Asking`: seis ordens | Tabela das skills: `worker/SKILL.md:51`–`:57`, `judge/SKILL.md:51`–`:57`, `leader/SKILL.md:70`–`:76`, `mother/SKILL.md:59`–`:65` | ✅ PASS |
| PAP-65 | `Credentials`: `blocked`, pergunta bloqueante com o lugar e a confirmação; proíbe pedir o valor e escrever segredo | `worker/SKILL.md:63`–`:67`, `judge/SKILL.md:63`–`:67`, `leader/SKILL.md:82`–`:86`, `mother/SKILL.md:71`–`:75` | ✅ PASS |
| PAP-66 | `Irreversible actions` de worker, leader e judge: as cinco, e nenhuma sem resposta a pergunta bloqueante ao nível de cima | `worker/SKILL.md:73`–`:79`, `judge/SKILL.md:73`–`:79`, `leader/SKILL.md:92`–`:98` | ✅ PASS ⚠️ precisão: PAP-66 e PAP-68 dão respostas diferentes ao merge de um worker |
| PAP-67 | `feature_closed` encerra as perguntas, inclusive a bloqueante esperada; parar sem enviar mais nada | `worker/SKILL.md:83`, `judge/SKILL.md:83`, `leader/SKILL.md:104`, `mother/SKILL.md:110` | ✅ PASS |
| PAP-68 | `Your work` do worker: oito ordens | `test/unit/skills.test.ts:252`; `worker/SKILL.md:35`–`:45` (tabela das skills) | ✅ PASS |
| PAP-69 | `Your work` do judge: seis ordens | `test/unit/skills.test.ts:256`; `judge/SKILL.md:35`–`:43` | ✅ PASS |
| PAP-70 | `Your work` do leader: sete ordens | `test/unit/skills.test.ts:260`; `leader/SKILL.md:35`–`:64` | ✅ PASS |
| PAP-71 | `Your work` da mother: cinco ordens | `test/unit/skills.test.ts:264`; `mother/SKILL.md:33`–`:53` | ✅ PASS |
| PAP-72 | `Delivery (until the gate exists)` depois de `Irreversible actions`, a linha da Gate nas duas, as ordens de cada uma, nenhuma tool de gate | `test/unit/skills.test.ts:268`, `:273`; `mother/SKILL.md:79`, `:89`, `:93`, `:95`, `:99`–`:102` | ✅ PASS |
| PAP-73 | README com `bun link`, `squad start` dos quatro, `squad tui`, `--skip-permissions`; `broker/CLAUDE.md` com `launch.ts`, `roles.ts`, o arquivo de credencial e `plugin/` | `README.md:33` a seção; `:40` `bun link`; `:46`–`:49` os quatro papéis; `:55` `squad tui`; `:63` o modo padrão e `--skip-permissions`; `broker/CLAUDE.md:18` o arquivo de credencial; `:21` `roles.ts`; `:22` `launch.ts`; `:42` `../plugin/` | ✅ PASS |
| PAP-74 | Antes da primeira seção: o projeto é o diretório de trabalho, o diretório da skill é do plugin, proibido mexer nele | `test/unit/skills.test.ts:243`; `SKILL.md:12` das quatro: "Your project is the working directory of this session. The directory this skill was loaded from belongs to the squad plugin, not to your project: never read, write or run anything there." | ✅ PASS |
| PAP-75 | `Start`: `state` no turno de `ready`, buscar as tools pelo nome, não encerrar o turno entre os dois | `test/unit/skills.test.ts:247`; `SKILL.md:17` das quatro | ✅ PASS |

**Status**: ❌ Gaps present: 73 de 75 com evidência que bate com a spec; PAP-08 e PAP-37 em aberto; 8 lacunas de precisão da spec

---

## As quatro skills, cláusula por cláusula

Lidas por inteiro contra PAP-62 a PAP-72, PAP-74 e PAP-75. Cada célula é a linha do `SKILL.md` do papel com a frase que manda ou proíbe. Nenhuma cláusula ficou sem frase.

| Cláusula | worker | judge | leader | mother |
| -------- | ------ | ----- | ------ | ------ |
| PAP-74: o projeto é o diretório de trabalho; nada no diretório do plugin | `:12` | `:12` | `:12` | `:12` |
| PAP-62: esperar o ping e chamar `ready` com o número | `:16` | `:16` | `:16` | `:16` |
| PAP-62: `state` antes de qualquer outra coisa. PAP-75: no mesmo turno, buscar as tools pelo nome, não encerrar o turno | `:17` | `:17` | `:17` | `:17` |
| PAP-62: agir por `feature`, `ticket` e `owed` | `:18`–`:23` | `:18`–`:23` | `:18`–`:23` | `:18`–`:23` |
| PAP-62: ler a spec com `git show <spec_commit>:<spec_ref>` | `:20` | `:20` | `:20` | `:20` |
| PAP-63: nenhuma mensagem só de recebido, lido ou começado | `:27` | `:27` | `:27` | `:27` |
| PAP-64: perguntar em vez de decidir | `:51` | `:51` | `:70` | `:59` |
| PAP-64: pergunta completa na origem; `summary` numa linha, `body` com o que decidir e o que já foi visto | `:53` | `:53` | `:72` | `:61` |
| PAP-64: dar `why` | `:54` | `:54` | `:73` | `:62` |
| PAP-64: até 3 `options` | `:55` | `:55` | `:74` | `:63` |
| PAP-64: `blocking` falso com `default` sempre que der | `:56` | `:56` | `:75` | `:64` |
| PAP-64: `blocking` verdadeiro só quando não dá | `:57` | `:57` | `:76` | `:65` |
| PAP-65: declarar `blocked` | `:63` | `:63` | `:82` | `:71` |
| PAP-65: pergunta bloqueante com o lugar da credencial e o pedido de confirmação | `:64` | `:64` | `:83` | `:72` |
| PAP-65: nunca pedir o valor, nunca escrever segredo em mensagem | `:67` | `:67` | `:86` | `:75` |
| PAP-66: as cinco ações | `:73`–`:77` | `:73`–`:77` | `:92`–`:96` | n/a (PAP-72) |
| PAP-66: nenhuma sem resposta a pergunta bloqueante ao nível de cima | `:79` | `:79` | `:98` | n/a |
| PAP-67: `feature_closed` encerra as perguntas, parar sem enviar mais nada | `:83` | `:83` | `:104` | `:110` |

| Cláusula do papel | Linha |
| ----------------- | ----- |
| PAP-68: ao `task`, branch do ticket a partir do da feature com `git switch -c` | `worker/SKILL.md:35` |
| PAP-68: skills base e as do `loadout` | `worker/SKILL.md:36` |
| PAP-68: commit | `worker/SKILL.md:37` |
| PAP-68: `send_result` ao `judge` com `ticket_ref`, `task_seq` do `task` mais recente, `branch`, `commit` | `worker/SKILL.md:38` |
| PAP-68: parar depois do `result`; o veredito não chega ao worker | `worker/SKILL.md:39` |
| PAP-68: rework no mesmo branch, com o `task_seq` novo | `worker/SKILL.md:41` |
| PAP-68: nunca merge nem push | `worker/SKILL.md:43`, `:79` |
| PAP-68: responder com `answer` a pergunta do judge | `worker/SKILL.md:45` |
| PAP-69: ir ao commit com `git switch --detach` | `judge/SKILL.md:35` |
| PAP-69: `history` do `task` e das perguntas e respostas | `judge/SKILL.md:36` |
| PAP-69: avaliar contra os critérios do ticket e essas respostas | `judge/SKILL.md:37` |
| PAP-69: `send_verdict` ao `leader` com `result_seq` do `result` mais recente, `outcome`, um item de `criteria` por critério | `judge/SKILL.md:38` |
| PAP-69: em `stale_reference`, julgar o `result` mais recente | `judge/SKILL.md:41` |
| PAP-69: na dúvida sobre a entrega, perguntar ao worker dono do ticket | `judge/SKILL.md:43` |
| PAP-70: no kickoff, `git switch` para o branch da feature | `leader/SKILL.md:35` |
| PAP-70: `plan` antes do primeiro `task` | `leader/SKILL.md:36`, `:37` |
| PAP-70: `send_task` com `ticket_ref`, `loadout` e `criteria` | `leader/SKILL.md:43` |
| PAP-70: um ticket por worker | `leader/SKILL.md:45` |
| PAP-70: só depois de aprovadas as dependências | `leader/SKILL.md:46` |
| PAP-70: `approve`: `git merge` do branch do ticket no da feature | `leader/SKILL.md:52` |
| PAP-70: `rework`: novo `task` ao mesmo worker | `leader/SKILL.md:53` |
| PAP-70: `rework_limit`: pergunta bloqueante à mother e `dropped` no `plan` | `leader/SKILL.md:54` |
| PAP-70: responder as perguntas ou escalar | `leader/SKILL.md:58` |
| PAP-70: um único `send_result` à mother, nada ticket a ticket | `leader/SKILL.md:62`, `:64` |
| PAP-71: descoberta com o dev no terminal, fora do broker | `mother/SKILL.md:33` |
| PAP-71: branch da feature, commit da spec, volta ao branch base, só então `open_feature` | `mother/SKILL.md:39`–`:42` |
| PAP-71: kickoff ao leader com `send_task` | `mother/SKILL.md:43` |
| PAP-71: responder as que souber | `mother/SKILL.md:49` |
| PAP-71: `merge_question` só com o mesmo `blocking` | `mother/SKILL.md:50` |
| PAP-71: escalar as outras ao dev | `mother/SKILL.md:51` |
| PAP-71: trabalho novo pedido por uma resposta do dev vai ao leader com `send_task` | `mother/SKILL.md:53` |
| PAP-72: `Delivery (until the gate exists)` logo depois de `Irreversible actions` | `mother/SKILL.md:77`, `:93` |
| PAP-72: a linha da Gate nas duas | `mother/SKILL.md:79`, `:95` |
| PAP-72: escalar ao dev a bloqueante de ação irreversível e nunca respondê-la | `mother/SKILL.md:89` |
| PAP-72: ao `result` do leader, pergunta bloqueante ao dev com o commit e a ação | `mother/SKILL.md:99`, `:100` |
| PAP-72: exatamente essa ação, só depois de resposta que autoriza | `mother/SKILL.md:101`, `:104` |
| PAP-72: então `close_feature` com `delivered` | `mother/SKILL.md:102` |
| PAP-72: nenhuma tool de gate | `gate` só aparece em `mother/SKILL.md:79`, `:93` e `:95`, nunca entre crases |

**Tools, campos e git.** Conferido contra `broker/tools.ts:291`–`:305` e `broker/launch.ts:53`–`:71`:

- Toda tool entre crases é do papel. A skill do judge escreve "kind answer" sem crases (`judge/SKILL.md:57`) porque `answer` não é tool dele.
- Todo campo citado existe no esquema da tool: `ask` (`broker/tools.ts:226`–`:241`), `send_result` (`:120`–`:123`), `send_verdict` com `n`, `text`, `pass` e `note` (`:136`–`:148`), `plan` com `depends_on` e `dropped` (`:171`–`:178`), `open_feature` (`:195`–`:200`), `merge_question` com `into` (`:283`–`:284`), `close_feature` (`:212`), `history` com `ticket_ref` ou `question_id` (`:56`–`:57`), `blocked` (`:70`–`:72`).
- O que as skills leem de `state` (`feature`, `ticket`, `owed` com `result`, `verdict`, `task`, `plan`, `answer`, `delivery`) bate com `broker/shared/derive.ts:96`. O que leem de uma mensagem (`asked_by`, `blocking`, `loadout`, `criteria`, `branch`) chega no texto do canal, que traz cada campo do evento (`broker/delivery.ts:34`–`:40`).
- Os comandos git entre crases são `git show`, `git switch`, `git add`, `git commit`, `git rev-parse` e, só no leader, `git merge`. Todos estão na lista do papel. O judge só tem `git switch --detach` e `git show`, e a skill o proíbe de commitar (`judge/SKILL.md:45`). O merge da entrega, que a mother não tem na lista, vem com o aviso do pedido de permissão em `mother/SKILL.md:106`.
- O limite de rework da skill ("a ticket takes two reworks. After its third `rework` verdict, another task for it is refused", `leader/SKILL.md:54`) bate com `broker/shared/derive.ts:104` (`REWORK_LIMIT = 3`) e `broker/send.ts:111`.

---

## Sessões reais (`real-sessions.md`)

O registro está completo: uma linha para cada um de RS-01 a RS-14. O código das sessões é o do `HEAD` verificado: `git diff 6609630..0848c8f` só tem documentos.

| Id | Estado no registro | Evidência citada | Julgamento |
| -- | ------------------ | ---------------- | ---------- |
| RS-01 | Exercitado | O comando `claude -p … --plugin-dir`, e no `init` o servidor `plugin:squad:squad` `connected` e as quatro `squad:<papel>` | Específica |
| RS-02 | Exercitado | `squad start mother`, a tela com `← squad: Squad ping 210989`, `peer_joined` | Específica |
| RS-03 | Exercitado | `❯ /squad:mother` como primeira linha | Específica |
| RS-04 | Exercitado | `git add` sem pedido, `git tag rs04` com o diálogo "This command requires approval" | Específica |
| RS-05 | Exercitado | `turn_started` depois de prompt digitado e de mensagem do canal | Confere com o log: `turn_started` 9 depois do prompt, 11 a 13 depois do `feature_opened` 10 |
| RS-06 | Exercitado | `modelUsage` 6, 251, 12227, 79943 e o mesmo no `usage` | Específica; o log dessa sessão não está no repositório |
| RS-07 | Exercitado | O texto de `Stop hook error:` na tela, igual ao de PAP-29; `task` 8, `turn_started` 9, `question` 10, `blocked` 11, um `usage`, 12 | Específica; idem |
| RS-08 | Exercitado | Todo `usage` com números diferentes de zero | Confere com o log: os 33 `usage` são de `claude-haiku-5-5`, nenhum `unknown` |
| RS-09 | Exercitado | `allow` cria a tag, `deny` não; mais 13 pedidos liberados | Confere: 13 `permission_request` no log, todos com `permission_decision` `allow` |
| RS-10 | Exercitado | Eventos 10 a 58: da abertura à pergunta de entrega | Confere: `feature_opened` 10, kickoff 14, `plan` 19, `task` 20 e 39, `result` 31 e 44, `verdict` `approve` 36 e 49, `result` do leader 54, pergunta bloqueante 58 com o commit `7dfc648`; nenhuma mensagem de aviso entre eles. Duas afirmações o log não sustenta sozinho: "menos de 7 minutos" (o log não tem horário) e "T2 dependendo de T1" (o `plan` vem sem conteúdo) |
| RS-11 | Exercitado em parte | Duas perguntas até o dev, credencial com `blocked` e pergunta bloqueante, rework com `task_seq` novo | Confere: perguntas 93 e 94 ao `human`; `blocked` 83 e pergunta 85 "name only"; `task` 115 e `result` 126 com `task_seq` 115. O registro diz o que desviou: a mother perguntou em vez de escalar, e o `rework` veio de um substituto |
| RS-12 | Não exercitado | Sem Claude Code com login num Linux | Motivo dado |
| RS-13 | Exercitado | Cinco turnos com dois `turn_started` | Confere, os cinco: leader 13 e 17 até o `usage` 22, 76 e 78 até 92, 107 e 111 até 112; mother 86 e 88 até 96, 104 e 106 até 109 |
| RS-14 | Exercitado no Windows | `bun link` com `BUN_INSTALL` temporário; `squad start nada` sai com 1 | Específica; no Linux não exercitado |

Nada é afirmado além do log, salvo as duas frases de RS-10 acima. Uma inconsistência pequena: o cabeçalho conta "dois não exercitados" e a tabela tem um não exercitado (RS-12) e um exercitado num sistema só (RS-14).

Um ponto que o registro mostra e que não é AC desta fatia: em RS-11 a mother não seguiu `mother/SKILL.md:51` (escalar com `escalate`) e fez perguntas próprias ao dev, o contrário do AD-013. O texto da skill manda o certo. Foi com `haiku`, e o registro diz que nenhum outro modelo foi usado.

---

## Discrimination Sensor

Profundidade acima do nível leve: a fatia decide se um agente pode encerrar o turno e escreve no git em nome do dev. Uma mutação por vez dentro do clone, os testes que a deveriam matar, `git checkout -- <arquivo>` e `git status --porcelain` vazio antes da seguinte. Sem `git stash`. Controle: os 11 arquivos de teste usados passam sem mutação (251 pass, 3 skip).

| Mutation | File:line | Description | Tests run | Killed? |
| -------- | --------- | ----------- | --------- | ------- |
| U1 | `plugin/hooks/usage.ts:56` | PAP-15: conta a primeira linha de um `message.id`, não a última | hook-usage | ✅ Morto, 4 falham. Primeiro: `PAP-15: of the lines with the same message.id only the last of the file counts` |
| U2 | `plugin/hooks/usage.ts:85` | PAP-18: os arquivos de `subagents/` não são lidos | hook-usage | ✅ Morto, 4 falham. Primeiro: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| U3 | `plugin/hooks/usage.ts:65` | PAP-16: um campo negativo é somado | hook-usage | ✅ Morto, 1 falha. Primeiro: `PAP-16: a count that is negative counts 0, and the other three count` |
| U4 | `plugin/hooks/usage.ts:65` | PAP-16: um campo fracionário é somado | hook-usage | ✅ Morto, 1 falha. Primeiro: `PAP-16: a count that is fractional counts 0, and the other three count` |
| U5 | `plugin/hooks/usage.ts:42` | PAP-17: a linha do modelo `<synthetic>` conta | hook-usage | ✅ Morto, 2 falham. Primeiro: `PAP-17: a line of the model <synthetic> is ignored` |
| U6 | `plugin/hooks/usage.ts:53` | PAP-18: a regra da última linha vale por arquivo, não entre os arquivos | hook-usage | ✅ Morto, 3 falham. Primeiro: `PAP-18: a message.id repeated in the main transcript and in a subagent counts once, with…` |
| U7 | `plugin/hooks/usage.ts:79` | PAP-19: sem o transcript principal os subagentes ainda contam | hook-usage | ✅ Morto, 2 falham. Primeiro: `PAP-19: without the main transcript there is no model, even with files of subagents` |
| N1 | `plugin/hooks/nudge.ts:58` | PAP-28: a regra de status é aplicada ao log como está, sem o fim de turno hipotético | hook-nudge | ✅ Morto, 6 falham. Primeiro: `PAP-28: a worker in turn with a task is told what it owes, as if the turn had ended` |
| N2 | `plugin/hooks/nudge.ts:44` | PAP-28: o `usage` hipotético não é do nome da sessão | hook-nudge | ✅ Morto, 6 falham. Primeiro: `PAP-28: a worker in turn with a task is told what it owes, as if the turn had ended` |
| N3 | `plugin/hooks/nudge.ts:40` | PAP-28: o fim hipotético usa o `seq` do último item da lista, não o do evento mais recente | hook-nudge | ✅ Morto, 1 falha. Primeiro: `PAP-28: the end of turn comes after the latest event, whatever the order of the list` |
| N4 | `plugin/hooks/nudge.ts:26` | PAP-29: a frase da dívida de `answer` perde a metade do `escalate` | hook-nudge | ✅ Morto, 2 falham. Primeiro: `PAP-29: who owes an answer is told the question and the seq since which it holds it, and…` |
| S1 | `plugin/hooks/stop.ts:46` | PAP-28: o `usage` é enviado também quando o hook bloqueia | hook-stop | ✅ Morto, 2 falham. Primeiro: `PAP-28: with a task owed the hook writes exactly the block with the ticket and the seq, …` |
| S2 | `plugin/hooks/stop.ts:42` | PAP-30: `stop_hook_active` é ignorado: a segunda parada bloqueia de novo | hook-stop | ✅ Morto, 2 falham. Primeiro: `PAP-30: with stop_hook_active true and a task owed the hook writes nothing and records t…` |
| S3 | `plugin/hooks/stop.ts:42` | PAP-28: qualquer `stop_hook_active` verdadeiro passa, não só `true` | hook-stop | ✅ Morto, 1 falha. Primeiro: `PAP-28: a stop_hook_active that is not true blocks as one that is false` |
| S4 | `plugin/hooks/stop.ts:24` | PAP-31: a leitura de `/events` espera 8000 ms em vez de 2000 ms | hook-stop | ✅ Morto, 1 falha. Primeiro: `PAP-31: with /events not answered in 2000 ms the hook does not block and sends the usage` |
| S5 | `plugin/hooks/stop.ts:31` | PAP-31: uma leitura de `/events` que falha bloqueia a parada | hook-stop | ✅ Morto, 3 falham. Primeiro: `PAP-27: with the broker down the hook exits 0 and writes nothing` |
| S6 | `plugin/hooks/stop.ts:51` | PAP-23: os modelos saem na ordem do arquivo, sem ordenar | hook-stop | ✅ Morto, 10 falham. Primeiro: `PAP-23: the log gains one usage per model, in ascending order of the model, with the sum…` |
| S7 | `plugin/hooks/stop.ts:50` | PAP-26: sem `session_id` o transcript ainda é lido | hook-stop | ✅ Morto, 1 falha. Primeiro: `PAP-26: a payload without a session_id records a usage of the session_id unknown, and it…` |
| S8 | `plugin/hooks/stop.ts:54` | PAP-24: nenhum `usage` de `unknown` quando não há modelo | hook-stop | ✅ Morto, 4 falham. Primeiro: `PAP-24: without the transcript the log gains a single usage of the model unknown with th…` |
| S9 | `plugin/hooks/stop.ts:49` | PAP-26: o `session_id` de uma sessão desconhecida vai vazio, não `unknown` | hook-stop | ✅ Morto, 2 falham. Primeiro: `PAP-26: a payload that is not JSON records a usage of the session_id unknown` |
| S10 | `plugin/hooks/stop.ts:27` | Fora da spec: uma resposta de `/events` com outro status e uma lista de eventos é lida | hook-stop | ❌ Sobreviveu (22 pass, 0 fail) |
| T1 | `plugin/hooks/turn-started.ts:14` | PAP-13: o hook sai com 1 quando o broker falha ou recusa | hook-turn-started | ✅ Morto, 4 falham. Primeiro: `PAP-13: with the broker down the hook exits 0 and writes nothing` |
| T2 | `plugin/hooks/turn-started.ts:14` | PAP-11: o hook escreve na saída padrão | hook-turn-started | ✅ Morto, 6 falham. Primeiro: `PAP-10: with the credential file of a registered session, the log gains exactly one turn…` |
| T3 | `plugin/hooks/turn-started.ts:14` | PAP-10: dois `POST /turn-started` em vez de um | hook-turn-started | ✅ Morto, 4 falham. Primeiro: `PAP-10: with the credential file of a registered session, the log gains exactly one turn…` |
| X1 | `plugin/hooks/session.ts:19` | PAP-20: a credencial é usada sem tirar os espaços das pontas | hook-session, hook-turn-started | ✅ Morto, 3 falham. Primeiro: `PAP-10: the hook makes a single POST /turn-started with the id of the file, without the …` |
| X2 | `plugin/hooks/session.ts:17` | PAP-12: uma sessão sem `SQUAD_ROLE` ainda tem credencial | hook-session, hook-turn-started, hook-stop | ✅ Morto, 4 falham. Primeiro: `PAP-12: without SQUAD_ROLE the hook calls nothing, writes nothing and exits 0` |
| X3 | `plugin/hooks/session.ts:31` | PAP-13: uma chamada espera 6000 ms em vez de 2000 ms | hook-session, hook-turn-started | ✅ Morto, 3 falham. Primeiro: `PAP-13: with a broker that does not answer the hook exits 0 in less than 4 s and writes …` |
| X4 | `plugin/hooks/session.ts:39` | PAP-13: um status diferente de 200 é tomado como resposta | hook-session | ✅ Morto, 1 falha. Primeiro: `PAP-13: call gives null for a status that is not 200, whatever the body` |
| X5 | `plugin/hooks/session.ts:41` | PAP-13: uma recusa é tomada como resposta | hook-session | ✅ Morto, 1 falha. Primeiro: `PAP-13: call gives null for a refusal, which is a 200 with ok false` |
| V1 | `broker/server.ts:389` | PAP-07: o arquivo de credencial não é apagado quando o servidor encerra | server-credential | ✅ Morto, 1 falha. Primeiro: `PAP-07: when the session closes after registering, its credential file is gone` |
| V2 | `broker/server.ts:282` | PAP-09: o arquivo é gravado antes de a recusa ser conhecida | server-credential | ✅ Morto, 3 falham. Primeiro: `PAP-09: a registration refused for the name of another role writes no credential file` |
| V3 | `broker/server.ts:292` | PAP-06: o arquivo tem o `id` e uma quebra de linha, não exatamente o `id` | server-credential | ✅ Morto, 2 falham. Primeiro: `PAP-06: when ready answers, the credential file of the name has exactly the id the broke…` |
| V4 | `broker/server.ts:292` | PAP-06: o arquivo é gravado depois de a tool responder | server-credential | ✅ Morto, 4 falham. Primeiro: `PAP-06: when ready answers, the credential file of the name has exactly the id the broke…` |
| V5 | `broker/server.ts:295` | PAP-08: um arquivo que não pode ser gravado faz `ready` falhar | server-credential | ✅ Morto, 1 falha. Primeiro: `PAP-08: with a directory where the credential file goes, ready registers the same way` |
| V6 | `broker/server.ts:388` | PAP-08: sem o `try` em volta do `rmSync`, um arquivo que não pode ser apagado derruba o encerramento (o processo sai com código 1) | server-credential | ❌ Sobreviveu (7 pass, 0 fail) |
| R1 | `broker/roles.ts:58` | PAP-33: um papel repetido é aceito | roles | ✅ Morto, 1 falha. Primeiro: `PAP-33: a name that repeats is refused, with the path in the message` |
| R2 | `broker/roles.ts:62` | PAP-33: `workflows: null` é aceito como ausente | roles | ✅ Morto, 1 falha. Primeiro: `PAP-33: workflows that is null is refused, with the path in the message` |
| R3 | `broker/roles.ts:63` | PAP-33: uma chave de `workflows` fora de `tlc` e `matt-pocock` é aceita | roles | ✅ Morto, 1 falha. Primeiro: `PAP-33: workflows with a key other than tlc and matt-pocock is refused, with the path in…` |
| R4 | `broker/roles.ts:26` | PAP-33: um texto vazio é aceito | roles | ✅ Morto, 3 falham. Primeiro: `PAP-33: when_to_use that is empty is refused, with the path in the message` |
| R5 | `broker/roles.ts:36` | PAP-33: a recusa não leva o caminho do arquivo | roles | ✅ Morto, 25 falham. Primeiro: `PAP-33: a file that does not exist is refused, with its path in the message` |
| R6 | `broker/roles.ts:54` | PAP-33: um `name` fora dos quatro papéis é aceito | roles | ✅ Morto, 1 falha. Primeiro: `PAP-33: a name outside the four roles is refused, with the path in the message` |
| L1 | `broker/launch.ts:60` | PAP-44: o judge pode `git add` e `git commit` | launch-args | ✅ Morto, 4 falham. Primeiro: `PAP-44: after the squad tools the judge has the Bash rules of its git commands, in order…` |
| L2 | `broker/launch.ts:61` | PAP-44: a mother pode `git merge` sem pedir | launch-args | ✅ Morto, 3 falham. Primeiro: `PAP-44: after the squad tools the mother has the Bash rules of its git commands, in orde…` |
| L3 | `broker/launch.ts:69` | PAP-45: `darwin` ganha regras `PowerShell` | launch-args | ✅ Morto, 4 falham. Primeiro: `PAP-45: on linux and on darwin the mother has no PowerShell rule` |
| L4 | `broker/launch.ts:92` | PAP-39: `CLAUDECODE` fica no ambiente | launch-args | ✅ Morto, 1 falha. Primeiro: `PAP-39: the session has the environment of the launcher without the CLAUDE variables, wi…` |
| L5 | `broker/launch.ts:107` | PAP-40: `/squad:<papel>` vem antes de `--append-system-prompt` | launch-args | ✅ Morto, 7 falham. Primeiro: `PAP-40: the arguments of a session without --skip-permissions, in order` |
| L6 | `broker/launch.ts:105` | PAP-47: `--skip-permissions` mantém a lista de permitidos | launch-args | ✅ Morto, 1 falha. Primeiro: `PAP-47: with --skip-permissions the mode and the allowed list give way to --dangerously-…` |
| L7 | `broker/launch.ts:68` | PAP-43: `ready` vai por último entre as tools do squad | launch-args | ✅ Morto, 6 falham. Primeiro: `PAP-43: the allowed list of the mother starts with ready and follows the tools of the ro…` |
| L8 | `broker/launch.ts:42` | PAP-42: o nome de outro papel é aceito | launch-args | ✅ Morto, 3 falham. Primeiro: `PAP-42: leader is not a name of the role worker: an error` |
| L9 | `broker/launch.ts:83` | PAP-46: a última linha existe sem nenhum workflow | launch-args | ✅ Morto, 8 falham. Primeiro: `PAP-46: the system prompt of the judge, which has no workflows, has two lines` |
| L10 | `broker/launch.ts:142` | PAP-54: o worktree do leader nasce destacado na ponta do branch da feature | launch-worktree | ✅ Morto, 2 falham. Primeiro: `PAP-54: the worktree of the leader is born on the branch of the open feature` |
| L11 | `broker/launch.ts:141` | PAP-53: o worktree de um worker nasce no branch da feature, não destacado | launch-worktree | ✅ Morto, 2 falham. Primeiro: `PAP-53: the worktree of a worker is born detached at the tip of the branch of the open f…` |
| L12 | `broker/launch.ts:153` | PAP-56: um `.env*` que já veio no checkout é sobrescrito | launch-worktree | ✅ Morto, 1 falha. Primeiro: `PAP-56: a .env.shared that came with the checkout of the feature branch is not overwritt…` |
| L13 | `broker/launch.ts:151` | PAP-56: um `.env*` versionado também é copiado | launch-worktree | ✅ Morto, 1 falha. Primeiro: `PAP-56: a file git tracks in the main checkout is not copied to a worktree whose commit …` |
| L14 | `broker/launch.ts:136` | PAP-55: um worktree que já existe é adicionado de novo | launch-worktree | ✅ Morto, 2 falham. Primeiro: `PAP-55: a worktree that already exists is used as it is: its HEAD stays with the feature…` |
| L15 | `broker/launch.ts:140` | PAP-53, PAP-54: não confere se o branch da feature existe no repositório | launch-worktree | ✅ Morto, 3 falham. Primeiro: `PAP-53: with a feature whose branch is not in the repository the worktree of a worker is…` |
| L16 | `broker/launch.ts:151` | PAP-56: todo arquivo com `env` no nome é copiado | launch-worktree | ✅ Morto, 1 falha. Primeiro: `PAP-56: the regular files of the root that start with .env and git does not track are co…` |
| L17 | `broker/launch.ts:146` | PAP-57: um `git worktree add` que falha segue para a cópia | launch-worktree | ✅ Morto, 2 falham. Primeiro: `PAP-48: with the branch of the feature checked out in the main checkout the worktree of …` |
| L18 | `broker/launch.ts:208` | PAP-36, PAP-42: o papel é procurado no `roles.json` depois de o worktree ser criado | launch | ✅ Morto, 1 falha. Primeiro: `PAP-36: start with a valid roles file that does not have the role fails before anything …` |
| L19 | `broker/launch.ts:212` | PAP-38: o worker default é sempre `worker-1` | launch | ✅ Morto, 8 falham. Primeiro: `PAP-38: without a name a worker is worker-2 when worker-1 is online` |
| L20 | `broker/launch.ts:212` | PAP-38: um worker que saiu continua dono do nome | launch | ✅ Morto, 1 falha. Primeiro: `PAP-38: without a name a worker is worker-1 again after the peer_left of worker-1` |
| L21 | `broker/launch.ts:218` | PAP-51: a mother ganha um worktree | launch | ✅ Morto, 1 falha. Primeiro: `PAP-51: the mother opens in the main checkout, also from inside a worktree, and nothing …` |
| L22 | `broker/launch.ts:216` | PAP-53: uma feature fechada conta como aberta | launch | ✅ Morto, 1 falha. Primeiro: `PAP-53: a feature the log closed is not open: the worktree is born at the HEAD of the ma…` |
| L23 | `broker/launch.ts:184` | PAP-38, leitura da spec: um log respondido com outro status é lido | launch | ✅ Morto, 1 falha. Primeiro: `PAP-38: without a name a worker is worker-1 when the read of the log answers with anothe…` |
| L24 | `broker/launch.ts:224` | PAP-50: a linha de erro não traz o nome do comando | launch, cli | ✅ Morto, 1 falha. Primeiro: `PAP-50: a session command that cannot be run fails with its name in the line` |
| L25 | `broker/launch.ts:180` | PAP-38: o launcher espera 12000 ms pelo log | launch | ✅ Morto, 1 falha. Primeiro: `PAP-38: without a name a worker is worker-1 when the broker does not answer in 2000 ms` |
| L26 | `broker/launch.ts:205` | PAP-58: o diretório atual é tomado como checkout principal | launch | ✅ Morto, 3 falham. Primeiro: `PAP-51: the mother opens in the main checkout, also from inside a worktree, and nothing …` |
| L27 | `broker/launch.ts:213` | PAP-42: com os três workers online o launcher abre `worker-3` de novo | launch | ✅ Morto, 5 falham. Primeiro: `PAP-42: start worker without a name with the three workers online fails before anything …` |
| L28 | `broker/launch.ts:216` | PAP-53, PAP-54: a feature aberta do log é ignorada pelo `launch` | launch | ✅ Morto, 3 falham. Primeiro: `PAP-53: with a feature open in the log the worktree of the worker is born at the tip of …` |
| C1 | `broker/cli.ts:67` | PAP-37: a sessão não herda entrada, saída e erro do terminal do launcher (`stdio` `ignore`) | cli | ❌ Sobreviveu (10 pass, 0 fail) |
| C2 | `broker/cli.ts:67` | PAP-37: o launcher sai com 0 qualquer que seja o código de saída da sessão | cli | ❌ Sobreviveu (10 pass, 0 fail) |
| C3 | `broker/cli.ts:60` | PAP-41: o código de saída do launcher é descartado | cli | ✅ Morto, 2 falham. Primeiro: `PAP-59: start is the launcher: a role that is not one of the four is one line of squad: …` |
| C4 | `broker/cli.ts:124` | PAP-59: um comando desconhecido sai com 0 | cli | ✅ Morto, 1 falha. Primeiro: `PAP-59: with an unknown command the CLI writes the same usage and exits 1` |
| C5 | `broker/cli.ts:76` | PAP-59: `tui` não sai com o código da TUI | cli | ✅ Morto, 1 falha. Primeiro: `PAP-59: tui runs the TUI on the same terminal and exits with its code` |
| C6 | `broker/cli.ts:61` | PAP-37, PAP-42, PAP-58: `start` roda a partir do diretório de `broker/`, não do diretório atual | cli | ❌ Sobreviveu (10 pass, 0 fail) |
| C7 | `broker/cli.ts:75` | PAP-59: a TUI não roda no mesmo terminal (`stdio` `ignore`) | cli | ✅ Morto, 1 falha. Primeiro: `PAP-59: tui runs the TUI on the same terminal and exits with its code` |

**Sensor depth**: acima do nível leve: 76 mutações de comportamento, em `plugin/hooks/` (29), `broker/server.ts` (6), `broker/roles.ts` (6), `broker/launch.ts` (28) e `broker/cli.ts` (7)
**Result**: 71 de 76 mortos, 5 sobreviventes - FAIL

Os cinco sobreviventes:

- **C1, C2 e C6** (`broker/cli.ts:59`–`:71`, PAP-37). Só `test/integration/cli.test.ts` roda `start`, e só com um papel inválido (`:68`) e com um comando que não existe (`:90`). Nenhum teste abre um comando que existe. Por isso não há asserção de que a sessão herda o terminal, de que o launcher sai com o código dela, nem de que o diretório atual do processo é o que o `launch` recebe. `launch` em si está coberto com `spawn` e `cwd` injetados; o que falta é o objeto que `cli.ts` monta. A herança do terminal e o diretório atual têm evidência de sessão real (RS-02, RS-03 e RS-10); o código de saída não tem nenhuma.
- **V6** (`broker/server.ts:388`–`:392`, PAP-08). Sem o `try`, o `rmSync` de um diretório não vazio lança `ERR_FS_EISDIR` e o servidor cai. Medido no clone com uma sonda que lê o processo do transporte: original sai com código 0 em 18 ms; mutante sai com código 1 em 19 ms. O teste de `test/integration/server-credential.test.ts:94` passa nos dois casos, porque o `peer_left` é gravado antes do `rmSync` e o processo some de qualquer jeito.
- **S10** (`plugin/hooks/stop.ts:27`). Fora da spec: PAP-31 não diz o que vale um `/events` que responde outro status com uma lista de eventos. O código trata como leitura que falhou e nenhum teste passa por essa linha. Entra como lacuna de precisão, não como AC descoberto.

Não injetado: o modo `0600` de `broker/server.ts:292`. A única asserção do modo é pulada no Windows (`test/integration/server-credential.test.ts:57`), então a mutação sobreviveria aqui por construção. Fica para a suíte do Linux.

O `tsc` confere `plugin/`: um erro de tipo posto à mão em `plugin/hooks/nudge.ts` deu `error TS2322` e código 2, e foi desfeito.

---

## Interactive UAT Results (if performed)

Não realizado: não há usuário nesta execução. O que só uma sessão real mostra está em `real-sessions.md`, julgado acima.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Os hooks são cinco arquivos de 15 a 97 linhas; `launch.ts` tem 230. Repetição pequena: o `fetch` com prazo próprio existe três vezes (`plugin/hooks/session.ts:28`, `plugin/hooks/stop.ts:21`, `broker/launch.ts:172`) e `isObject` duas (`plugin/hooks/usage.ts:28`, `broker/roles.ts:21`) |
| Surgical changes | ✅ Fora do código novo: o `export` de `namesOf` (`broker/peers.ts:72`), os quatro textos de PAP-05 e a credencial em `server.ts`, `start` e `tui` em `cli.ts`, `include` em `tsconfig.json`, `bin` em `package.json` |
| No scope creep | ✅ Nenhuma rota, tool ou tela nova. `real-session-driver.py` e `real-session-tools/` ficam em `.specs/`, fora de `broker/` e `plugin/`, como apoio para repetir a T22 |
| Matches patterns | ✅ `env.X ?? default` em `shared/config.ts`, comentários na densidade dos vizinhos, nomes de teste começando pelo requisito |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 73 de 75. PAP-37 e PAP-08 acima |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ Hooks, leitor, launcher e servidor: sim. CLI: a matriz pede "o processo real: … `start` que falha" e é isso que há; PAP-37 pede também o `start` que abre |
| Every test maps to a spec requirement - no unclaimed tests | ✅ As 246 declarações de teste novas (321 testes com os laços) têm `PAP-NN` no nome e batem com um AC, um edge case ou uma definição da spec |
| Documented guidelines followed: `broker/CLAUDE.md`, regras de `tasks.md`, `.specs/LESSONS.md` (L-001, L-004, L-010, L-020) | ✅ L-001: PAP-23 usa um transcript em que a ordem do arquivo difere da ordem dos nomes. L-004: os defaults em `shared/config.ts` com teste do valor. L-020: 2000, 10, 20 e `0o600` como literais. L-010: cada gatilho de PAP-12, PAP-13, PAP-31 e PAP-42 tem a sua asserção; em PAP-27 o dos 2000 ms está só em `call` |

Nenhuma asserção anterior foi enfraquecida: as únicas linhas removidas em `broker/test/` são três `import` trocados por versões com mais nomes.

---

## Edge Cases

- [x] PAP-20: espaços e quebras em volta da credencial. `test/unit/hook-session.test.ts:29`–`:30`, `test/integration/hook-turn-started.test.ts:61`
- [x] PAP-21: payload sem `transcript_path` texto. `test/unit/hook-usage.test.ts:235`–`:237`, `test/integration/hook-stop.test.ts:150`
- [x] PAP-22: `SQUAD_NAME` fora do squad. `test/unit/hook-nudge.test.ts:230`, `test/integration/hook-stop.test.ts:314`–`:320`
- [x] PAP-48: branch da feature em checkout em outra árvore. `test/unit/launch-worktree.test.ts:152`–`:154`
- [x] PAP-49: nome dado e já online. `test/unit/launch.test.ts:323`–`:327`

---

## Gate Check

- **Gate command**: de `broker/` do clone, `bun node_modules/typescript/bin/tsc --noEmit && bun test`
- **tsc**: código de saída 0
- **Totals**: 1623 passed, 0 failed, 5 skipped; 1628 testes em 75 arquivos, 109283 asserções, 268,74 s. Uma execução; `EVT-43` passou, sem repetição
- **Test count before feature**: 1303 pass, 4 skip (1307 em 63 arquivos)
- **Test count after feature**: 1623 pass, 5 skip (1628 em 75 arquivos)
- **Delta**: +321 testes, +12 arquivos, nenhum removido
- **Skipped tests**: quatro anteriores à fatia: `PEER-44` duas vezes (`test/integration/cli.test.ts:154` e `:189`, busca e sinal de listener por plataforma), `PEER-14` (`test/unit/presence.test.ts:6`, pid de outro usuário, Windows) e o produto completo de `QST-99, QST-78` sem `SQUAD_TEST_FULL` (`test/unit/tui-loop.test.ts:990`). Um novo: `PAP-06: the credential file has mode 0600` (`test/integration/server-credential.test.ts:57`), porque o Windows não tem modo de arquivo; roda no Linux
- **Failures**: nenhuma
- **Linux**: pendente, com o orquestrador. É o quinto item das "Success Criteria" e não entrou neste veredito

---

## Leituras da spec

As treze linhas de "Leituras da spec" de `tasks.md`, julgadas uma a uma. Não discordo de nenhuma. Seis delas resolvem algo que a spec deveria dizer e entram como lacuna de precisão.

| Ponto | Leitura dos implementadores | Julgamento |
| ----- | --------------------------- | ---------- |
| `workflows: null` (PAP-33) | Recusado | De acordo. "Se presente" é a chave; `null` não é objeto. Testado em `test/unit/roles.test.ts:103`. ⚠️ A spec deveria dizer (L-024) |
| `--skip-permissions` antes do papel (PAP-37) | Aceito em qualquer posição | De acordo. Não tira nada do AC. `test/unit/launch-args.test.ts:29`–`:30` |
| "Arquivo do plugin dentro de `broker/`" (PAP-01) | `.claude-plugin`, `hooks`, `skills`, `roles.json`; `broker/.mcp.json` fica | De acordo: o `.mcp.json` do broker é o servidor solto do upstream. ⚠️ A spec deveria listar os caminhos |
| Tool de gate (PAP-72) | Nenhum texto entre crases com `gate` no nome | De acordo. Mais forte do que o AC pede |
| `message.id` que não é texto não vazio (PAP-15) | Linha sem id | De acordo. `test/unit/hook-usage.test.ts:105`. ⚠️ A spec deveria dizer (L-036) |
| `message.usage` lista (PAP-17) | Não é objeto | De acordo: é a leitura literal. `test/unit/hook-usage.test.ts:152` |
| Arquivo de `subagents/` ilegível (PAP-18) | Não conta nada, os outros contam | De acordo: é o que PAP-17 faz com uma linha. `test/unit/hook-usage.test.ts:216`. ⚠️ A spec só fala do principal |
| O que é uma opção (PAP-42) | Todo argumento que começa com `-` | De acordo. `test/unit/launch-args.test.ts:61`–`:63`. ⚠️ A spec deveria dizer |
| Log lido pelo launcher com outro status ou sem `events` | Leitura que falhou, "como em PAP-31" | De acordo com o comportamento, testado em `test/unit/launch.test.ts:295`–`:296`. Um reparo: PAP-31 não fala de status. O hook faz o mesmo em `plugin/hooks/stop.ts:27`, sem teste (S10). ⚠️ |
| Tool "citada entre crases" e literal de uma seção | A regra do conferidor | De acordo. É estrutura; a prosa foi lida acima |
| Merge ou push de um worker com resposta que autoriza (PAP-66 contra PAP-68) | Continua proibido | De acordo: vale a regra mais estrita, e a skill a diz em `worker/SKILL.md:79`. ⚠️ Os dois ACs dão respostas diferentes ao mesmo caso e a spec não diz qual vence |
| "Antes de `open_feature`" (PAP-71) | Ordem das primeiras citações em `Your work` | De acordo como teste de estrutura. A prosa também manda a ordem: "So, in this order" e "Only then call `open_feature`" (`mother/SKILL.md:37`, `:42`) |
| Tool de gate nas outras três skills | A mesma regra nas quatro | De acordo |

As duas mudanças de texto de AC feitas durante a execução foram julgadas como estão escritas: PAP-32 sem o `permission_request` aberto na lista (`test/unit/hook-nudge.test.ts:206`–`:212` prova o caso) e PAP-74 e PAP-75.

---

## Fix Plans (if issues found)

### Fix 1: o `start` de `cli.ts` não é exercitado com um comando que existe (PAP-37)

- **Root cause**: `launch` é testado com `spawn`, `cwd` e `fetch` injetados. O objeto que `broker/cli.ts:59`–`:71` passa a ele (o diretório atual do processo, o `Bun.spawn` com `stdio` herdado, o `.exited`) só é alcançado por testes que falham antes de abrir a sessão. C1, C2 e C6 sobrevivem.
- **Fix task**: em `test/integration/cli.test.ts`, rodar `bun cli.ts start <papel>` num repositório temporário, a partir de um subdiretório dele, com `SQUAD_CLAUDE` num comando que existe, escreve na saída e sai com um código que não é 0 nem 1. Sem `claude` de verdade: `git` serve, porque responde `unknown option: --plugin-dir` na saída de erro e sai com 129. O teste tem de provar três coisas: o que o filho escreve chega à saída do CLI (C1); o CLI sai com o código do filho (C2); com `start worker`, o worktree nasce no repositório temporário e sob o `SQUAD_WORKTREES` do teste, não no repositório do squad (C6).
- **Done when**: C1, C2 e C6 morrem.
- **Priority**: Major

### Fix 2: o teste do arquivo que não pode ser apagado não distingue encerrar de cair (PAP-08)

- **Root cause**: `test/integration/server-credential.test.ts:94`–`:113` olha o `peer_left`, que é gravado antes do `rmSync`, e o processo morto, que morre nos dois casos.
- **Fix task**: afirmar que o servidor encerra sozinho com código 0 quando o arquivo de credencial não pode ser apagado. A sonda usada aqui leu `exit` do processo do transporte: 0 no original, 1 sem o `try`.
- **Done when**: V6 morre.
- **Priority**: Minor

### Fix 3: `/events` com outro status (PAP-31)

- **Root cause**: o AC não define o caso; `plugin/hooks/stop.ts:27` o trata e nenhum teste passa por ali. S10 sobrevive.
- **Fix task**: dizer em PAP-31 que um status diferente de 200 é leitura que falhou, e um caso em `test/integration/hook-stop.test.ts` em que `GET /events` responde 500 com o log de um worker que deve: saída vazia e os `usage` enviados.
- **Done when**: S10 morre.
- **Priority**: Minor

### Fix 4: o que a spec deixa sem dizer

- **Root cause**: seis leituras de `tasks.md` decidem o que um AC deveria decidir, e PAP-08 não diz o observável de "do mesmo jeito".
- **Fix task**: levar para o texto de PAP-01, PAP-08, PAP-15, PAP-18, PAP-33, PAP-42 e do par PAP-66 e PAP-68 o que a tabela "Leituras da spec" já fixou. Acertar o cabeçalho de `real-sessions.md` (RS-14) e o `Status` de `tasks.md`.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-01 a PAP-07 | Implementing | ✅ Verified |
| PAP-08 | Implementing | ❌ Needs Fix (Fix 2) |
| PAP-09 a PAP-36 | Implementing | ✅ Verified |
| PAP-37 | Implementing | ❌ Needs Fix (Fix 1) |
| PAP-38 a PAP-75 | Implementing | ✅ Verified |

PAP-06 fica verificado com a asserção do modo `0600` ainda por rodar no Linux. PAP-31 fica verificado com a lacuna de precisão do Fix 3.

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 73 de 75 ACs batem com a spec; 8 lacunas de precisão (PAP-01, PAP-08, PAP-15, PAP-18, PAP-31, PAP-33, PAP-42, PAP-66 com PAP-68)
**Sensor**: 71 de 76 mutações mortas; sobrevivem C1, C2, C6 (PAP-37), V6 (PAP-08) e S10 (fora da spec)
**Gate**: 1623 passed, 5 skipped, 0 failed; `tsc` 0. Linux pendente

**What works**: o plugin e o manifesto; a credencial da sessão; os dois hooks como processos contra broker real, com o uso por modelo, a regra do `message.id`, os subagentes e a volta ao trabalho só de quem sairia `stalled`; o leitor e o `roles.json`; o launcher inteiro com git real (argumentos, ambiente, lista de permitidos por papel e plataforma, nome default, worktree destacado ou no branch, cópia dos `.env*`, validação antes de qualquer escrita); o comando `squad` no uso, no comando desconhecido, no `start` que falha e no `tui`; as quatro skills, com frase para cada cláusula de PAP-62 a PAP-72, PAP-74 e PAP-75 e sem tool, campo ou comando git que o papel não tenha; a documentação; o registro das sessões reais.

**Issues found**: quatro, nenhuma de produção. 1. `start` do `cli.ts` sem teste com um comando que existe (Fix 1). 2. O teste da metade "apagado" de PAP-08 não distingue (Fix 2). 3. `/events` com outro status sem AC e sem teste (Fix 3). 4. Leituras que deveriam estar na spec (Fix 4).

**Next steps**: Fix 1 e Fix 2 por um implementador, com teste e commit próprios; Fix 3 e Fix 4 se o dev aceitar mexer no texto da spec; a suíte no Linux; segunda rodada do Verifier restrita a PAP-08, PAP-37, PAP-31 e aos cinco mutantes.

---

## Lições registradas

Pelo `lessons.py`, só de sinal deste relatório:

- L-050, agora confirmada (segunda fatia): C1, C2 e C6, PAP-37.
- L-071: V6, PAP-08.
- L-072: S10, PAP-31.
- L-024 e L-036, já confirmadas, com mais uma ocorrência: PAP-33 e PAP-15.
- L-073 a L-077: PAP-66 com PAP-68, PAP-18, PAP-01, PAP-42 e PAP-08.

## Isolamento

`git status --porcelain` do repositório real antes: vazio. Depois: `.specs/features/papeis/validation.md` novo, `.specs/lessons.json` e `.specs/LESSONS.md` alterados pelo script, e nada mais. Nenhum commit, push, stash, troca de branch ou reset feito por este agente. O clone ficou limpo depois de cada mutação e no fim (`git status --porcelain` vazio em `0848c8f`). Nenhum `claude` real foi executado e nenhum `broker.ts` ou `server.ts` foi iniciado à mão.
