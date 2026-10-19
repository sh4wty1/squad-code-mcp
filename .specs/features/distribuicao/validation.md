# Distribuição Validation

**Result**: PASS. Volta 2: o Fix 1 (`592927f`) compara a lista inteira do `git archive` com a do `git ls-tree` e mata S6 e S7; os 11 mutantes reais desta volta morrem. Os 12 requisitos têm evidência, DIST-02 e DIST-04 por `broker/test/unit/package.test.ts:30`, e DIST-08 pela conferência manual do dev (ver "Reverificação do Fix 1")

**Round**: 2, reverificação do Fix 1. A volta 1 reprovou a fatia por S6 e S7 sobreviventes; o relato dela segue abaixo, sem mudança, até "Reverificação do Fix 1"
**Date**: 2026-10-19
**Spec**: `.specs/features/distribuicao/spec.md`, DIST-01 a DIST-12, o edge case e "Success Criteria"
**Diff range**: volta 2 `202a630..592927f`; volta 1 `5ae4dfb..202a630` (branch `feat/distribuicao`: `a65217b`, `cd0b5db`, `3189023`, `202a630`). As mudanças não commitadas de `.specs/STATE.md` e `ROADMAP.md` são registro e ficaram fora
**Verifier**: agente novo e independente (author ≠ verifier). Não escreveu código, teste nem spec da fatia.
**Environment**: Windows 11 Pro 10.0.26200, Bun 1.3.14. Mutações e suíte num `git worktree add --detach` em `202a630` no scratchpad, fora do repositório, com `broker/node_modules` ligado por junção ao do repositório. Reinstalação com `BUN_INSTALL` numa pasta do scratchpad, nunca a do dev. Nada rodou no Linux nesta volta: a evidência do Linux é a do autor.

---

## Task Completion

Não há `tasks.md` na fatia: a pasta tem só `spec.md`. O commit `202a630` diz cobrir DIST-01 a DIST-05 e DIST-09 a DIST-11; DIST-06 a DIST-08 e DIST-12 ficam com a evidência de execução. Sem tasks, não há "Gate Check Commands"; usei o gate das outras fatias, `tsc --noEmit` e `bun test` em `broker/`.

---

## Spec-Anchored Acceptance Criteria

`T` = `broker/test/unit/package.test.ts`. "Manual" = sem teste na suíte; a evidência é a da execução citada.

| Req | Spec-defined outcome | `file:line` + assertion / evidência | Result |
| --- | -------------------- | ----------------------------------- | ------ |
| DIST-01 | `bun add -g github:sh4wty1/squad-code-mcp` instala `squad-code-mcp` e cria `squad` nos bins globais, apontando para `broker/cli.ts` | `T:23` `expect(join(ROOT, bin)).toBe(join(ROOT, "broker", "cli.ts"))`, `T:24` `existsSync` `toBe(true)`; `package.json:8` `"squad": "broker/cli.ts"`. Manual, reconferido: `bun add -g github:sh4wty1/squad-code-mcp#feat/distribuicao` deu `installed squad-code-mcp@github:sh4wty1/squad-code-mcp#202a630 with binaries: - squad`, `<BUN_INSTALL>\bin` com `squad.exe` e `squad.bunx`, e o `.bunx` aponta para `install\global\node_modules\squad-code-mcp\broker\cli.ts`. Linux: evidência do autor (`/usr/local/bin/squad`) | ✅ PASS |
| DIST-02 | `broker/` e `plugin/` lado a lado no pacote; `pluginDir()` e `${CLAUDE_PLUGIN_ROOT}/../broker/server.ts` resolvem dentro dele | `T:34` `expect(exportIgnored(path)).toBe(false)` para `broker`, `plugin` e sete arquivos. Manual, reconferido: a pasta do pacote tem `broker/` e `plugin/`; `pluginDir()` (`broker/shared/config.ts:60`) importado do pacote deu `...\node_modules\squad-code-mcp\plugin`; `broker/server.ts` existe ao lado, que é o alvo de `plugin/.mcp.json:5`. **O teste não vê uma subpasta saindo do tarball: `plugin/hooks export-ignore` e `broker/tui export-ignore` sobrevivem (S6, S7), e com eles o `git archive` perde os 7 arquivos de `plugin/hooks/` e os 31 de `broker/tui/`** | ❌ GAP (teste não discrimina; o pacote de hoje está certo) |
| DIST-03 | `@modelcontextprotocol/sdk` resolve de `broker/server.ts` sem `bun install` em `broker/` | Manual, reconferido: o pacote instalado não tem `broker/node_modules`, e `import.meta.resolve("@modelcontextprotocol/sdk/server/mcp.js")` de dentro de `broker/` deu `<BUN_INSTALL>/install/global/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js`. Sem teste na suíte. A pré-condição está presa por `T:18` `expect(read("package.json").dependencies).toEqual(read("broker/package.json").dependencies)` | ✅ PASS (manual) |
| DIST-04 | Pacote do GitHub sem `broker/test` | `T:29` `expect(exportIgnored("broker/test")).toBe(true)`; `.gitattributes:1` `broker/test export-ignore`. Manual, reconferido: `test -d <pacote>/broker/test` falso. Linux: evidência do autor | ✅ PASS |
| DIST-05 | `dependencies` da raiz = as de `broker/package.json`; `bin.squad` aponta para arquivo que existe | `T:18` `toEqual` das duas listas; `T:24` `existsSync(join(ROOT, bin))` `toBe(true)` | ✅ PASS |
| DIST-06 | `squad status` noutro repositório git, broker parado: `Broker is not running.` e saída 0 | Manual, reconferido: `git init` numa pasta nova do scratchpad, `SQUAD_PORT=7999` e `SQUAD_DB`/`SQUAD_TOKEN_FILE` temporários, `<BUN_INSTALL>\bin\squad.exe status` escreveu `Broker is not running.` e saiu com 0. Linux: evidência do autor | ✅ PASS (manual) |
| DIST-07 | `squad start mother` noutro repositório abre o Claude Code com o plugin da pasta do pacote, até o diálogo do canal | Manual, só evidência do autor e do dev: `claude --plugin-dir <BUN_INSTALL>\install\global\node_modules\squad-code-mcp\plugin --dangerously-load-development-channels plugin:squad@inline ...`, até o aviso com `Channels: plugin:squad@inline`. Não reconferido aqui (abre uma sessão real) | ✅ PASS (manual, não reconferido) |
| DIST-08 | `squad tui` noutro repositório, terminal ≥ 120×40, abre a TUI | Manual, só evidência do dev (Windows Terminal 130×45). "Abrir a TUI" não diz o que se vê | ⚠️ Spec-precision gap (manual, não reconferido) |
| DIST-09 | README instala só com `bun add -g github:sh4wty1/squad-code-mcp`, sem `bun link` | `README.md:36` `bun add -g github:sh4wty1/squad-code-mcp`; `grep "bun link" README.md` sem linha. Sem teste | ✅ PASS (leitura) |
| DIST-10 | README diz como achar a pasta de bins (`bun pm bin -g`) | `README.md:39` "`bun pm bin -g` prints it". Sem teste | ✅ PASS (leitura) |
| DIST-11 | README sem "Status: under construction" | `grep "under construction" README.md` sem linha (removida no diff, antigo `README.md:5`). Sem teste | ✅ PASS (leitura) |
| DIST-12 | Suíte de `broker/` passa no Windows e no Linux, `tsc` 0 | Windows, reconferido em `202a630`: `tsc --noEmit` 0; `bun test` 2530 pass, 9 skip, 0 fail, 97 arquivos, 186 s. Linux: evidência do autor (`oven/bun:1.4.2`, 2563 pass, 3 skip, 0 fail, `tsc` 0) | ✅ PASS (Linux não reconferido) |

**Status**: ❌ Gaps present. 12 de 12 com evidência; 1 lacuna de discriminação (DIST-02); 1 spec-precision gap (DIST-08).

---

## Discrimination Sensor

Baseline `git status --porcelain` do repositório antes: ` M .specs/STATE.md`, ` M ROADMAP.md`. Cada mutante numa worktree descartável, restaurado com `git checkout -- .` dentro dela, contra `bun test test/unit/package.test.ts` (4 pass sem mutação). O efeito real de cada mutante de `.gitattributes` foi conferido com `git archive --worktree-attributes HEAD | tar -t`.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| S1 | `package.json:11` | `"^1.32.0"` → `"^1.31.0"` | ✅ Killed (`T:18`) |
| S2 | `package.json:8` | `bin.squad` `broker/cli.ts` → `broker/server.ts` | ✅ Killed (`T:23`) |
| S3 | `.gitattributes:1` | linha apagada; `broker/test` volta ao tarball | ✅ Killed (`T:29`) |
| S5 | `.gitattributes:2` | `+ plugin export-ignore` (plugin inteiro fora) | ✅ Killed (`T:34`) |
| S6 | `.gitattributes:2` | `+ plugin/hooks export-ignore`; o `git archive` perde os 7 arquivos de `plugin/hooks/` (21 → 14 em `plugin/`) | ❌ Survived |
| S7 | `.gitattributes:2` | `+ broker/tui export-ignore`; o `git archive` perde os 31 arquivos de `broker/tui/`, e `squad tui` quebra | ❌ Survived |

Fora da conta: S4, `broker/test` → `broker/test/` em `.gitattributes:1`, é equivalente (o `git archive` continua sem `broker/test/`, 0 arquivos) e o teste o matou (`T:29`). O teste prende a grafia da linha, não só o efeito; não é lacuna.

Por quê: `git check-attr` só diz `set` para o caminho que casa com o padrão, e um padrão de pasta não se estende aos arquivos de dentro (o próprio comentário de `T:28` diz isso). `T:33` checa `broker`, `plugin` e arquivos; nenhum deles casa com `plugin/hooks` ou `broker/tui`.

Depois: worktree removida (junção desfeita antes, `broker/node_modules` do repositório intacto), `git worktree list` só com o repositório, `git status --porcelain` igual ao baseline.

**Sensor depth**: lightweight (≥ 5, dado que a fatia é quase toda configuração)
**Sensor da volta 1**: 6 injected, 4 killed, 2 survived (o desta volta está em "Reverificação do Fix 1")

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `package.json` de 13 linhas, `.gitattributes` de 1 |
| Surgical changes | ✅ só raiz, README, `broker/CLAUDE.md` e um teste |
| No scope creep | ✅ sem `files`, sem npm, sem skills, `bun link` de `broker/` intacto |
| Matches patterns | ✅ teste com IDs no nome, como os outros de `test/unit` |
| Spec-anchored outcome check | ⚠️ DIST-02 com asserção que não discrimina subpastas |
| Every test maps to a spec requirement | ✅ os 4 testes citam DIST-01, 02, 04, 05 |
| Documented guidelines followed | ✅ `broker/CLAUDE.md` atualizado com o pacote da raiz |

---

## Edge Cases

- [x] Pasta de bins fora do PATH: o Bun avisou ao instalar (`warn: To run "squad", add the global bin folder to $PATH`), e `README.md:39` diz como achá-la.

---

## Gate Check

- **Gate command**: `bunx tsc --noEmit` e `bun test` em `broker/` (não há `tasks.md`)
- **Windows (esta volta, `202a630`)**: `tsc` 0; 2530 passed, 0 failed, 9 skipped, 97 arquivos, 186,43 s
- **Linux**: evidência do autor, não reconferida
- **Test count before feature**: 96 arquivos (o diff só acrescenta `T`, nenhum teste removido nem enfraquecido)
- **Delta**: +4 testes
- **Skipped tests**: os 9 do Windows já existiam antes da fatia; nenhum é de `T`
- **Failures**: nenhuma

---

## Fix Plans

### Fix 1: o teste de DIST-02 não vê uma subpasta de `broker/` ou `plugin/` fora do tarball

- **Root cause**: `T:32`-`T:36` perguntam a `git check-attr` por caminhos escolhidos; um `export-ignore` numa subpasta não aparece em nenhum deles.
- **Fix task**: em `broker/test/unit/package.test.ts`, comparar a lista do `git archive --worktree-attributes HEAD` (`tar -t`) com `git ls-tree -r --name-only HEAD` sem `broker/test/`: as duas iguais. Mata S3, S5, S6 e S7 e deixa S4 (equivalente) viver.
- **Verify**: S6 e S7 desta volta falham; sem mutação, passa no Windows e no Linux.
- **Priority**: Minor (o pacote de hoje está certo; a falta é de guarda)

### Spec-precision (sem fix de código)

- DIST-08: "abrir a TUI" não diz o que se vê. Sugestão: o cabeçalho da TUI na primeira tela, ou sair com 0 por `q`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| DIST-01, DIST-03 a DIST-07, DIST-09 a DIST-12 | Pending | ✅ Verified |
| DIST-02 | Pending | ❌ Needs Fix (teste) |
| DIST-08 | Pending | ✅ Verified (manual), spec-precision gap |

---

## Summary

**Overall**: ❌ Not Ready, por um teste fraco; o pacote instalado funciona

**Spec-anchored check**: 12/12 com evidência; 1 lacuna de discriminação (DIST-02); 1 spec-precision gap (DIST-08)
**Sensor**: 4 de 6 mortos
**Gate**: Windows 2530 pass, 0 fail, `tsc` 0

**What works**: instalação pelo GitHub com `squad` nos bins, `broker/` e `plugin/` lado a lado sem `broker/test`, SDK resolvido sem `bun install` em `broker/`, `squad status` noutro repositório, README só com `bun add -g`.

**Issues found**: Fix 1.

**Next steps**: Fix 1 e reverificação.

---

## Reverificação do Fix 1

**Data**: 2026-10-19. **Commit**: `592927f`, que só muda `broker/test/unit/package.test.ts` (`git diff --stat 202a630 592927f`: 1 arquivo, +9 −14). **Ambiente**: Windows 11, Bun 1.3.14, `git worktree add --detach` em `592927f` no scratchpad, com `broker/node_modules` ligado por junção.

### O teste novo

`T:25`-`T:31` junta num só teste DIST-02 e DIST-04. `T:26` lista os arquivos de `git archive --worktree-attributes HEAD` (por `tar -t`, sem as entradas de pasta); `T:27` lista `git ls-tree -r --name-only HEAD`; `T:30` `expect(tarball.sort()).toEqual(tracked.filter((p) => !p.startsWith("broker/test/")).sort())`. `T:28` e `T:29` exigem que `broker/test/` e `plugin/hooks/` existam no commit, o que impede o teste de passar vazio se o `git` ou o `tar` não devolverem nada. Nenhum caminho do commit tem caractere fora do ASCII nem aspas, então o `core.quotePath` do `git ls-tree` não separa as duas listas.

| Req | `file:line` + assertion | Result |
| --- | ----------------------- | ------ |
| DIST-02 | `T:30` o tarball tem todo arquivo do commit fora de `broker/test/`, logo `broker/` e `plugin/` inteiros, lado a lado; a resolução de `pluginDir()` e de `plugin/.mcp.json:5` dentro do pacote segue a da volta 1 (manual) | ✅ PASS |
| DIST-04 | `T:30` nenhum arquivo de `broker/test/` no tarball, com `T:28` garantindo que eles existem no commit | ✅ PASS |
| DIST-08 | Manual: o dev viu a TUI num Windows Terminal de 130×45 e, num painel de 36×58, a tela "terminal pequeno demais". O texto de `spec.md` no tree (não commitado) agora diz "desenha a sua primeira tela (a principal ou a de broker fora do ar) e sai com `q`", o que fecha a lacuna de precisão da volta 1. O painel de 36×58 fica fora da pré-condição de 120×40 do AC, então é evidência a mais, não a do AC | ✅ PASS (manual) |

Os outros requisitos não mudam: o Fix 1 só toca o teste, e a evidência da volta 1 continua valendo para eles.

### Sensor da volta 2

Baseline `git status --porcelain` do repositório antes: ` M .specs/STATE.md`, ` M .specs/features/distribuicao/spec.md`, ` M ROADMAP.md`, `?? .specs/features/distribuicao/validation.md`. Cada mutante na worktree, restaurado com `git checkout -- .` dentro dela, contra `bun test test/unit/package.test.ts` (3 pass sem mutação).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| S1 | `package.json:11` | `"^1.32.0"` → `"^1.31.0"` | ✅ Killed (`T:15`) |
| S2 | `package.json:8` | `bin.squad` → `broker/server.ts` | ✅ Killed (`T:20`) |
| S3 | `.gitattributes:1` | arquivo vazio; `broker/test` volta ao tarball | ✅ Killed (`T:30`) |
| S5 | `.gitattributes:2` | `+ plugin export-ignore` | ✅ Killed (`T:30`) |
| S6 | `.gitattributes:2` | `+ plugin/hooks export-ignore` (sobreviveu na volta 1) | ✅ Killed (`T:30`) |
| S7 | `.gitattributes:2` | `+ broker/tui export-ignore` (sobreviveu na volta 1) | ✅ Killed (`T:30`) |
| N1 | `.gitattributes:1` | `broker/test` → `broker/test/unit`; o resto de `broker/test/` vai no tarball | ✅ Killed (`T:30`) |
| N2 | `.gitattributes:2` | `+ broker/cli.ts export-ignore` (um arquivo, o alvo do `bin`) | ✅ Killed (`T:30`) |
| N3 | `.gitattributes:2` | `+ *.json export-ignore` (`package.json`, `roles.json`, `prices.json` fora) | ✅ Killed (`T:30`) |
| N4 | `.gitattributes:2` | `+ plugin/.mcp.json export-ignore` (arquivo com ponto) | ✅ Killed (`T:30`) |
| N5 | `.gitattributes:2` | `+ broker export-ignore` | ✅ Killed (`T:30`) |

S4 (`broker/test/ export-ignore`), equivalente, agora vive, como deve: o tarball segue sem `broker/test/`. Na volta 1 o teste o matava pela grafia; esse excesso sumiu com o Fix 1.

Depois: junção desfeita antes da remoção (`broker/node_modules` do repositório intacto), worktree removida, `git worktree list` só com o repositório, `git status --porcelain` igual ao baseline mais `.specs/LESSONS.md` e `.specs/lessons.json`, escritos por `lessons.py` (permitido).

**Sensor result**: 11 injected, 11 killed, 0 survived

### Gate da volta 2

- `tsc --noEmit` em `broker/` na worktree em `592927f`: 0.
- `bun test test/unit/package.test.ts`: 3 pass, 0 fail. Linux (`oven/bun:1.4.2`, só esse arquivo): evidência do autor, 3 pass, 0 fail.
- Suíte inteira: não rodei de novo. Entre `202a630` (2530 pass, 0 fail na volta 1) e `592927f` só mudou este arquivo de teste, e ele não é importado por outro. A contagem cai de 2539 para 2538 testes (4 → 3 neste arquivo), porque dois testes viraram um; nenhuma asserção ficou mais fraca, todas as anteriores estão contidas na de `T:30`.

### Lições

Registradas com `lessons.py add`: L-125 (`surviving_mutant`, S6/S7) "Test what a package ships by comparing the full file list of the built artifact with the expected list, not by probing chosen paths"; L-126 (`spec_precision_gap`, DIST-08) "When an AC says a program opens, state what it draws first and how it exits". As duas como candidatas.

### Resumo da volta 2

**Overall**: ✅ Ready. 12/12 requisitos com evidência, nenhuma lacuna de precisão aberta, sensor 11 de 11, `tsc` 0. Ficam manuais, como na volta 1: DIST-03, DIST-06 a DIST-08 e o README; o Linux da suíte inteira e do `squad status` segue com a evidência do autor.
