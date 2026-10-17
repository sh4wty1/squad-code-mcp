# Papéis Validation

**Result**: FAIL. Na fatia, 74 de 75 requisitos verificados: PAP-07, PAP-37 e PAP-39 na volta 6, PAP-56 na volta 5, PAP-21, PAP-31 e PAP-53 na volta 4, e os outros antes. PAP-18 segue com lacuna de teste (Fix 24)

**Round**: 10, reverificação do Fix 23 (T53, T54), pedida pelo dev em 2026-10-17
**Date**: 2026-10-17
**Spec**: `.specs/features/papeis/spec.md`, PAP-01 a PAP-75, edge cases e "Success Criteria"
**Diff range**: `bd014a3..a7f81d6` (fase 15 de `test/papeis-gaps`, sobre `main` em `055d629`). A volta 9 foi `d8f7371..18f6d10`, a volta 8 foi `8d03ff4..3344174`, a volta 7 `5c7f815..15b7a37`, a volta 6 `7f79a02..dbe2483`, a volta 5 `c8cb88c..ce5f774`, e a volta 4 `055d629..959bcb6`
**Verifier**: agente novo e independente (author ≠ verifier). Não escreveu código, testes, tarefas nem relatórios da fatia, e não é o Verifier das voltas 1 a 9.
**Environment**: volta 10: só Linux (Linux 7.0.0-38-generic, `/tmp` em tmpfs, usuário 1000), Bun 1.3.14, cópia `scratchpad/verifier10` de `plugin/` e `broker/` em `a7f81d6` por `git archive`, fora do repositório, com `broker/node_modules` ligado ao do repositório. Nesta máquina não há Windows nem docker: nenhuma mutação nem sonda desta volta rodou no Windows. Volta 9: só Linux (Linux 7.0.0-38-generic, `/tmp` em tmpfs), Bun 1.3.14, cópia `scratchpad/verifier9` de `plugin/` e `broker/` em `18f6d10` por `git archive`, fora do repositório, com `broker/node_modules` ligado ao do repositório. Nesta máquina não há Windows nem docker: nenhuma mutação nem sonda desta volta rodou no Windows. Volta 8: só Linux (Linux 7.0.0-38-generic, `/tmp` em tmpfs), Bun 1.3.14, cópia `scratchpad/verifier8` de `plugin/` e `broker/` em `3344174` por `git archive`, fora do repositório, com `broker/node_modules` ligado ao do repositório. Nesta máquina não há Windows nem docker: nenhuma mutação nem sonda desta volta rodou no Windows. Volta 7: Windows 11 Pro 10.0.26200, Bun 1.3.14, clone físico `verifier7` do branch em `15b7a37`, fora do repositório, com `bun install --frozen-lockfile` próprio; Linux num contêiner `oven/bun:1.4.2` sobre uma cópia desse clone, só para os dois arquivos da camada. Volta 6: Bun 1.3.14, clone `verifier6` em `dbe2483` e contêiner `oven/bun:1.4.2`. Volta 5: Bun 1.3.14, clone `verifier5` em `ce5f774` e contêiner `oven/bun:1.4.2`. Volta 4: Bun 1.3.14, clone `verifier4` em `959bcb6` e contêiner `oven/bun:1.3.14`. Volta 3: Bun 1.4.2, clone em `ac25e8d` e contêiner `oven/bun:1.4.2`.

Os nove sobreviventes da volta 9 morrem, cada um no caso que o Fix 23 trouxe: U8 pelo `subagents` que é arquivo regular (`test/unit/hook-usage.test.ts:264`) e pelo `subagents` de modo `0o000` (`:252`–`:260`), U9 e U13 pelo `agent-y.jsonl` de modo `0o000` (`:245`), U2 e U12 pela lista do caso da soma (`:191`, `:192`), U4 pelo caso dos pontos (`:272`), U1 e U3 pelo laço dos transcripts sem a extensão (`:296`), U5 pelo laço dos que a perdem (`:283`, `:284`). R1, R2, R4, R17, R5, Q2, Q5, Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos. Nenhum arquivo de produção mudou em `055d629..a7f81d6`, e nenhuma asserção foi afrouxada nem apagada: os cinco casos de um transcript que saíram voltam nos dois laços com a mesma entrada e o mesmo esperado, e o de `logs.jsonl.d` ganhou um `s1/subagents` que não conta. O único skip novo é o do caso das permissões no Windows e no root, e aqui ele roda. Os casos novos afirmam o que a spec diz. Das 22 mutações novas, 9 morrem, 1 é equivalente, e 1 vive só numa ordem que a spec não decide (N13, a ordem com ou sem a extensão no nome): lacuna de precisão. Mesmo assim a volta falha: 11 sobrevivem e mudam o que a spec diz, de quatro naturezas. Formas do nome que as listas não têm: `trim()` do caminho em `:82` (N2: `"s1.jsonl "` ganha os de `s1/`; original 1, mutante 101), `/\.?jsonl$/` em `:82` (N6: `s1jsonl`; 1 contra 101), `trim()` do nome em `:85` (N8: `"agent-k.jsonl "` conta; 1 contra 9001), `/\.jsonl$/m` em `:82` e `:85` (N20, N21: um `\n` depois de `.jsonl`; 1 contra 101 e 1 contra 9001), e um filtro que tira o nome do principal em `:85` (N7: `subagents/s1.jsonl` não conta; 101 contra 1). A lista: um teto de três arquivos em `:89` (N12: quatro de 100; 401 contra 301), e os textos iguais lidos uma vez só em `:96` (N14: dois arquivos com a mesma linha sem id; 201 contra 101). O principal que não conta nada: `return {}` antes de `:82` (N15: um principal só com uma linha `user`, ou vazio, e `agent-a.jsonl` de 100; 100 contra `{}`). E listas de códigos de erro que deixam passar só os que os testes fazem: em `:86` (N16: `subagents` que é um link para si mesmo; 1 contra `ELOOP` lançado) e em `:92` (N17: `agent-l.jsonl` que é um link para si mesmo; 1 e haiku 5 contra `ELOOP`). Lançar ali derruba o hook em `plugin/hooks/stop.ts:50`. Nenhum defeito de produção foi visto: em todas as sondas, o código original faz o que a spec diz.

Os parágrafos abaixo são da volta 9.

Os quatro sobreviventes da volta 8 morrem, cada um no caso que o Fix 22 trouxe: R1 pelo caso novo do transcript `s1.json` (`test/unit/hook-usage.test.ts:258`), R2 e R4 pelo `agent-g.json` do caso da soma (`:189`), R17 pelo link sem alvo do caso do ilegível (`:227`). R5, recomendado fora do veredito, morre também, no caso da ordem escrito b, c, a (`:205`–`:207`). Q2, Q5, Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos. Nenhum arquivo de produção mudou em `055d629..18f6d10`, e nenhuma asserção foi afrouxada, apagada ou pulada: o diff de teste de `d8f7371..18f6d10` tem 14 linhas a mais e 3 a menos: acrescenta 11 e troca 3 (o import de `symlinkSync`, um comentário e a linha de `agent-c`, que mudou de lugar), sem tocar em nenhum `expect`. Os casos novos afirmam o que a spec diz: `agent-g.json` não é `*.jsonl`, `s1.json` não tem a extensão `.jsonl` para tirar (`spec.md:106`), e um link sem alvo não pode ser lido, não conta, e os outros contam (PAP-18). Das 15 mutações novas em `plugin/hooks/usage.ts`, 1 morre, 2 são equivalentes, e 3 vivem só em entradas que a spec não decide (U6, a ordem por localidade; U7, um nome que começa com ponto; U11, o nome que é só `.jsonl`): lacuna de precisão. Mesmo assim a volta falha: 9 sobrevivem e mudam o que a spec diz, em formas que nenhum teste usa. As letras depois do sufixo: `/\.jsonl\w*$/` em `:82` (U1: `s1.jsonld` ganha os subagentes de `s1/`; original 1, mutante 101) e em `:85` (U2: `agent-h.jsonld` conta; 101 contra 9101). O ponto do transcript: `/.jsonl$/` sem escape em `:82` (U3: `s1-jsonl` ganha os de `s1/`; 1 contra 101). Outro ponto no nome: `/^[^.]+\.jsonl$/` em `:85` (U4: `agent.2.jsonl` não conta; 1101 contra 101) e o corte no primeiro ponto do nome do transcript em `:82` (U5: `s1.v2.jsonl` lê `s1/subagents`; 101 contra 10001). Um subdiretório: `readdirSync(..., { recursive: true })` em `:85` (U12: `subagents/nested/agent-n.jsonl` conta; 101 contra 1101). E uma checagem antes da leitura no lugar de um `try`: `existsSync` antes do `readdirSync` de `:85` (U8: um `subagents` que é arquivo regular, ou um diretório sem permissão, faz `sessionUsage` lançar `ENOTDIR` ou `EACCES`, onde o original dá 1), e `statSync(...).isFile()` antes do `readFileSync` de `:91` (U9; e U13, que só engole `EISDIR` e `ENOENT`): um `agent-a.jsonl` sem permissão de leitura faz `sessionUsage` lançar `EACCES`, onde o original conta os outros (PAP-18). Lançar ali derruba o hook: `plugin/hooks/stop.ts:50` chama `sessionUsage` sem `try`, o processo sai com 1 e nenhum `usage` é gravado (PAP-23, PAP-24). Nenhum defeito de produção foi visto: em todas as sondas, o código original faz o que a spec diz.

Os parágrafos abaixo são da volta 8.

Os dois sobreviventes da volta 7 morrem, cada um no caso que o Fix 21 trouxe: Q2 pelo caso novo do transcript `s1.jsonl.bak` (`test/unit/hook-usage.test.ts:247`), Q5 pelo `agent-fjsonl` do caso da soma (`:187`). Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos. Nenhum arquivo de produção mudou em `055d629..3344174`, e nenhuma asserção foi afrouxada, apagada ou pulada: o diff de teste de `8d03ff4..3344174` só acrescenta 8 linhas. Os dois casos novos afirmam o que a definição "Transcripts da sessão" (`spec.md:106`) diz: `agent-fjsonl` não é `*.jsonl`, e `s1.jsonl.bak` não tem a extensão `.jsonl` para tirar, então `s1/subagents` não conta. Das 19 mutações novas em `plugin/hooks/usage.ts`, 11 morrem, 2 são equivalentes com sonda (R7, R15), e 2 vivem só em entradas que a spec não decide (R5, a ordem entre arquivos de subagentes; R18, um link simbólico para arquivo): lacuna de precisão. Mesmo assim a volta falha: R1, R2, R4 e R17 sobrevivem e mudam o que a spec diz. R1: `/\.jsonl?$/` em `:82`, e o transcript `s1.json` ganha os subagentes de `s1/subagents` (sonda: original 1, mutante 101). R2 e R4: `/\.jsonl?$/` ou `|| name.endsWith(".json")` em `:85`, e um `agent-g.json` de `subagents` conta (original 101, mutante 9101). R17: o filtro de `:85` faz `statSync(...).isFile()`, e um `agent-z.jsonl` que não pode ser lido (link simbólico sem alvo) derruba a leitura do diretório inteiro, e os outros não contam mais (original 101, mutante 1; PAP-18: "os outros contam"). Nenhum defeito de produção foi visto: em todas as sondas, o código original faz o que a spec diz.

Os parágrafos abaixo são da volta 7.

Os dois sobreviventes da volta 6 morrem, cada um no caso que o Fix 20 trouxe, no Windows e no Linux: Z4 pelo `agent-e.JSONL` do caso da soma (`test/unit/hook-usage.test.ts:185`), Z11 pelo caso novo do transcript `s1.JSONL` (`:239`). Y5, Y6, W5 e K15 seguem mortos. Nenhum arquivo de produção mudou em `055d629..15b7a37`, e nenhuma asserção foi afrouxada, apagada ou pulada: o diff de teste de `5c7f815..15b7a37` só acrescenta 8 linhas. A frase nova da definição "Transcripts da sessão" (`spec.md:106`) diz o que o código faz: `/\.jsonl$/` sem `i` (`plugin/hooks/usage.ts:82`) e `endsWith(".jsonl")` (`:85`) contam a caixa. Das 7 mutações novas em `plugin/hooks/usage.ts`, 3 morrem (Q1, Q3, e Q7 no Linux), e 2 vivem só em entradas que a spec não decide, um nome que é só `.jsonl` e um caminho com separador no fim (Q4 e Q6, lacuna de precisão). Mesmo assim a volta falha: Q2 e Q5 sobrevivem e mudam o que a definição diz. Q2: o diretório dos subagentes sai do último `.jsonl` do caminho, e não do fim, então `s1.jsonl.bak` ganha os subagentes de `s1/subagents` (`:82`). Q5: o nome de `subagents/` termina em `jsonl` sem o ponto, e `agent-fjsonl` conta (`:85`). Nas duas sondas o original dá 1 e o mutante 101, no Windows e no Linux. Nenhum defeito de produção foi visto: em todas as sondas, o código original faz o que a spec diz.

Os parágrafos abaixo são da volta 6.

Os cinco sobreviventes da volta 5 morrem, cada um no teste que a correção trouxe: Y5, Y6, Y7 e Y9 no Windows, Y1 no Linux. W2, W5, W12, W17, A10, K13, K15 e K2 seguem mortos. Nenhum arquivo de produção mudou em `055d629..dbe2483`, e nenhuma asserção foi afrouxada, apagada ou pulada: o caso de `SIGTERM` virou um laço sobre `SIGTERM` e `SIGINT` com o mesmo corpo. Os casos novos afirmam o que a spec define: o arquivo some e o servidor sai com 0 depois de `SIGINT` (PAP-07); só o `.jsonl` do fim sai do caminho, e `agent-d.jsonl.bak` não é `*.jsonl` (PAP-18, `spec.md:106`); `CLAUDE_config_dir` sai, porque a caixa conta (PAP-39); e um log que chega aos 2500 ms é de uma leitura que falhou, e o worker é `worker-1` (PAP-37, PAP-38, `spec.md:103`). O caso novo de PAP-38 mediu de 2391 a 2450 ms em oito execuções e passou em 18 de 18, sem limite de tempo que oscile. Das 11 mutações novas, 8 morrem e 1 é equivalente com sonda (Z2). Mesmo assim a volta falha: Z4 e Z11 sobrevivem e mudam o que a definição de transcripts da sessão diz. Z4: um `agent-a.JSONL` de `subagents` conta (`plugin/hooks/usage.ts:85`). Z11: o `.JSONL` sai do fim do caminho, e `s2.JSONL` ganha os subagentes de `s2/subagents` (`plugin/hooks/usage.ts:82`). Nos dois, a sonda dá 1 no original e 101 no mutante. Ficam verificados PAP-07, PAP-37 e PAP-39, e PAP-38 segue verificado. Nenhum defeito de produção foi visto: em todas as sondas, o código original faz o que a spec diz.

Os parágrafos abaixo são da volta 5.

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
| 6 | `7f79a02..dbe2483` | FAIL | Os cinco da volta 5 morrem (Y1 no Linux). Sobrevivem Z4 e Z11 (`usage.ts`, PAP-18): a caixa de `.jsonl` | Fix 20, em "Reverificação dos Fix 15 a Fix 19 (2026-10-16)" |
| 7 | `5c7f815..15b7a37` | FAIL | Os dois da volta 6 morrem. Sobrevivem Q2 e Q5 (`usage.ts`, PAP-18): o último `.jsonl` do caminho e o `jsonl` sem ponto | Fix 21, em "Reverificação do Fix 20 (2026-10-16)" |
| 8 | `8d03ff4..3344174` | FAIL | Os dois da volta 7 morrem. Sobrevivem R1, R2 e R4 (`usage.ts`, PAP-18): `.json`, o começo de `.jsonl`, no transcript e em `subagents`; e R17 (`usage.ts`, PAP-18): uma entrada ilegível derruba as outras | Fix 22, em "Reverificação do Fix 21 (2026-10-16)" |
| 9 | `d8f7371..18f6d10` | FAIL | Os quatro da volta 8 morrem, e R5 também. Sobrevivem U1, U2, U3, U4, U5 e U12 (`usage.ts`, PAP-18): `.jsonld`, `.jsonl` sem o ponto escapado no transcript, outro ponto no nome e um subdiretório; e U8, U9 e U13 (`usage.ts`, PAP-18): uma checagem antes da leitura deixa `sessionUsage` lançar num `subagents` que não é diretório e num arquivo sem permissão de leitura | Fix 23, em "Reverificação do Fix 22 (2026-10-17)" |

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

---

## Reverificação dos Fix 15 a Fix 19 (2026-10-16)

Volta 6. O dev decidiu em 2026-10-16 aplicar Fix 15 a Fix 19. O autor fez isso em `test/papeis-gaps`, `46c6ae9..dbe2483` sobre `7f79a02` (T45 a T49, fase 11 de `tasks.md`), só em teste. Escopo desta volta: PAP-07, PAP-18, PAP-37 e PAP-39, e PAP-38, que o caso do Fix 19 também cobre. As linhas de código citadas são de `dbe2483`.

### Ambiente e isolamento

- **Intervalo**: `7f79a02..dbe2483`.
- **Ambiente**: Windows 11 Pro 10.0.26200, Bun 1.3.14. Clone físico `scratchpad\verifier6` (`git clone --no-hardlinks -c core.autocrlf=false --branch test/papeis-gaps`) em `dbe2483`, com `bun install --frozen-lockfile` próprio. Linux: contêiner `oven/bun:1.4.2` sobre `scratchpad\v6lin`, um clone de `verifier6` montado só para leitura e copiado para dentro, com `git`, `lsof`, `procps` e `bun install` próprios.
- **Repositório real**: `git status --porcelain` antes, vazio, em `test/papeis-gaps` e `dbe2483`. Nenhum stash, commit, push, troca de branch nem reset. As mutações rodaram no clone, uma de cada vez. Antes de cada uma o script confere `git status --porcelain` vazio; depois, `git checkout -- <arquivo>` e de novo o vazio. As sondas rodam numa terceira cópia (`scratchpad\v6probe`), com o mutante gravado ao lado do original ou aplicado e desfeito com `git checkout --`; essa cópia ficou limpa. Os scripts e as saídas ficam em `scratchpad\v6`. Os outros clones do scratchpad não foram tocados. Nenhum `claude` real rodou: os casos de `cli.test.ts` usam `SQUAD_CLAUDE=git` ou um script compilado. Todo `broker.ts` e `server.ts` subiu pelos ajudantes de teste, com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.
- **No fim**: `git status --porcelain` mostra `.specs/features/papeis/validation.md` (este relatório), `.specs/LESSONS.md` e `.specs/lessons.json` (gravados pelo `lessons.py`), e nada mais.

### Produção intacta

- `git diff 055d629..dbe2483 --stat` só lista arquivos de `broker/test/`, de `.specs/` e `ROADMAP.md`. Nenhum arquivo de produção.
- `7f79a02..dbe2483` muda `spec.md`, `tasks.md` e quatro arquivos de `broker/test/`, com 170 linhas a mais e 19 a menos. Em `spec.md` só mudam as quatro linhas de rastreabilidade, que dizem `Implementing`; nenhum texto de AC nem de definição.
- O diff de `broker/test` foi lido linha a linha. Nenhum `expect` foi removido nem afrouxado, e nenhum `skip` novo entrou. As 13 linhas removidas são o caso de `SIGTERM` e o comentário dele, que voltam iguais dentro de `for (const signal of ["SIGTERM", "SIGINT"] as const)` (`test/integration/server-credential.test.ts:98`); o título com `${signal}` dá o mesmo nome de antes para `SIGTERM`, e o `skipIf` do Windows é o mesmo. As outras mudanças só acrescentam: um arquivo e um comentário no caso de `hook-usage.test.ts:172`, um caso em `:231`, uma variável e um comentário em `launch-args.test.ts:306`, e um caso em `launch.test.ts:342`.

### Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-07 | O arquivo de credencial some quando o servidor MCP encerra depois de registrado | `test/integration/server-credential.test.ts:98`–`:109`: para `SIGTERM` e para `SIGINT`, sessão registrada, `process.kill(pid, signal)` (`:105`), sai com 0 em até 1500 ms (`:106`), o arquivo some (`:107`). Pulado no Windows, onde o sinal termina o processo. O 0 é o que o código dá (`broker/server.ts:396`) e o que PAP-08 pede ao encerramento | ✅ PASS. No Linux os dois casos rodam e passam (controle: 28 pass, 0 fail). Y1 e W2 morrem cada um no seu caso, e Z1 (o `SIGINT` sai com 0 sem limpar) morre pela asserção do arquivo. Z3 morre nos dois sinais. K13 segue morto; Z2 é equivalente com sonda |
| PAP-18 | Todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/` soma (`spec.md:106`) | `test/unit/hook-usage.test.ts:172`–`:188`: `agent-d.jsonl.bak` (`:183`) fora da soma, com o objeto inteiro (`:184`); `:231`–`:235`: `logs.jsonl.d/s1.jsonl` com `logs.jsonl.d/s1/subagents/agent-a.jsonl`, 101 em cada campo (`:234`) | ❌ GAP parcial. Os dois casos afirmam o resultado da definição e matam Y5 e Y6; W5 e K15 seguem mortos. A definição escreve o padrão e a extensão em minúsculas, e a fatia lê nomes com a caixa contando (PAP-39, e as voltas 4 e 5, que deram W12 por sobrevivente e `s2.JSONL` por caminho sem `.jsonl` na sonda de Y10). `agent-a.JSONL` não é `*.jsonl`, e `s2.JSONL` não perde a extensão `.jsonl`. Nenhum nome dos testes tem `.jsonl` em outra caixa, e Z4 e Z11 vivem. Peso pequeno: o Claude Code grava `.jsonl` em minúsculas |
| PAP-37 | Um processo, código de saída dele; pela definição (`spec.md:103`), a leitura lida com prazo de 2000 ms que não responde nele é abandonada nele, e nada dela segura o launcher | `test/unit/launch.test.ts:342`–`:356`: um `fetch` que obedece ao sinal e responde aos 2500 ms um log com `worker-1` online; a sessão abre como `worker-1` (`:354`) e o código é o da sessão, 7 (`:355`). `test/integration/cli.test.ts:229`–`:253` segue com `res.ms` abaixo de 5000 (`:242`) | ✅ PASS. Y9 morre no caso novo; W17 e A10 seguem mortos no de `cli.test.ts`. Z10 (prazo de 1000 ms) morre em `test/unit/launch.test.ts:337`, que pede ao menos 2000 ms. O caso novo não tem limite de tempo e não oscila (abaixo) |
| PAP-38 | Sem nome, o worker é o primeiro dos três sem `peer_joined` por último; se a leitura do log falha, `worker-1`. A leitura que não responde em 2000 ms falha (`spec.md:103`) | O mesmo caso de `test/unit/launch.test.ts:342`: a resposta dos 2500 ms é de uma leitura que falhou, e o nome é `worker-1`, não `worker-2` | ✅ PASS. O esperado é o que a spec define. Z8 (`after=1`) e Z9 (a falha da leitura derruba o `start`) morrem |
| PAP-39 | Sem nenhuma variável cujo nome começa com `CLAUDE`, com a caixa contando, a não ser as três do dev; as outras sem mudança | `test/unit/launch-args.test.ts:294`–`:321`: `CLAUDE_config_dir` (`:306`) no ambiente e fora do esperado, com o objeto inteiro (`:311`) | ✅ PASS. Com a caixa contando, `CLAUDE_config_dir` começa com `CLAUDE` e não é `CLAUDE_CONFIG_DIR`, e sai: é o que `broker/launch.ts:97` faz. Y7 morre; W12 e K2 seguem mortos; Z6 (as `SQUAD_*` do launcher saem) e Z7 (`SQUAD_ROLE` igual ao nome) morrem |

### Discrimination Sensor

Um script aplica cada mutação, confere que ela casou uma vez só, roda os testes da camada e restaura o arquivo com `git checkout --`, conferindo `git status --porcelain` vazio antes e depois. Controle: sem mutação, os seis arquivos do gate passam (abaixo, "Gate no clone"). Testes por camada:

- `server-credential.test.ts` e `server.test.ts` para `server.ts`;
- `hook-usage.test.ts` e `hook-stop.test.ts` para `usage.ts`;
- `launch-args.test.ts`, `launch.test.ts` e `cli.test.ts` para `sessionEnv`;
- `launch.test.ts` e `cli.test.ts` para `readLog`.

No Linux, no contêiner, rodaram `server-credential.test.ts` e `server.test.ts` sem mutação (28 pass, 0 fail) e com Y1, W2, K13, Z1, Z2 e Z3.

#### Os cinco da volta 5 e os oito mortos antes, reinjetados

| Mutation | File:line at dbe2483 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| Y1 | `broker/server.ts:399` | PAP-07: sem `process.on("SIGINT", cleanup)` | ✅ Morto no Linux, 1 falha: `PAP-07: when the session registered is ended by SIGINT, its credential file is gone and it exits with 0`. No Windows vive (25 pass), porque o caso é pulado lá, como deve |
| Y5 | `plugin/hooks/usage.ts:82` | PAP-18: `/\.jsonl/` sem `$`: sai o primeiro `.jsonl` do caminho | ✅ Morto, 1 falha: `PAP-18: only the .jsonl at the end leaves the transcript path: a folder with .jsonl in its name keeps it` |
| Y6 | `plugin/hooks/usage.ts:85` | PAP-18: conta todo nome de `subagents/` que contém `.jsonl` | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| Y7 | `broker/launch.ts:97` | PAP-39: as três que ficam comparadas sem caixa (`OF_THE_DEV.includes(key.toUpperCase())`) | ✅ Morto, 1 falha: `PAP-39: the three CLAUDE variables the dev sets for Claude Code stay, and every other one leaves` |
| Y9 | `broker/launch.ts:186` | PAP-37: o prazo da leitura do log é 1,5 × 2000 ms | ✅ Morto, 1 falha: `PAP-38: without a name a worker is worker-1 when the log with worker-1 online comes 500 ms after the 2000 ms`. O caso de `cli.test.ts` passa, como na volta 5 |
| W2 | `broker/server.ts:400` | PAP-07: sem `process.on("SIGTERM", cleanup)` | ✅ Morto no Linux, 1 falha: `PAP-07: when the session registered is ended by SIGTERM, its credential file is gone and it exits with 0`. No Windows vive (25 pass), pulado lá |
| W5 | `plugin/hooks/usage.ts:82` | PAP-18: o diretório dos subagentes é o `transcript_path` sem qualquer extensão | ✅ Morto, 1 falha: `PAP-18: only .jsonl leaves the transcript path: the subagents of s1.txt are in s1.txt/subagents, not in s1/subagents` |
| W12 | `broker/launch.ts:97` | PAP-39: o prefixo `CLAUDE` conferido sem caixa | ✅ Morto, 1 falha: o mesmo teste de Y7 |
| W17 | `broker/launch.ts:184` | PAP-37: a leitura abortada 2 × 2000 ms depois do prazo | ✅ Morto, 1 falha: `PAP-37: with a broker that takes the connection and never answers, start exits with the code of the session soon after it, with the read of the log abandoned` |
| A10 | `broker/launch.ts:184` | PAP-37: sem `abort.abort()` no prazo | ✅ Morto, 1 falha: o mesmo teste de W17, que estoura os 30 s dele |
| K13 | `broker/server.ts:386` | PAP-07: o `rmSync` dentro do `try` do `/unregister` | ✅ Morto no Windows e no Linux, 1 falha: `PAP-07: when the session closes after registering with the broker already gone, its credential file is gone and it exits with 0` |
| K15 | `plugin/hooks/usage.ts:85` | PAP-18: só `agent-*.jsonl` de `subagents/` | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| K2 | `broker/launch.ts:97` | PAP-39: só `CLAUDE_*` e `CLAUDECODE*` saem | ✅ Morto, 1 falha: o mesmo teste de Y7 |

#### Mutações novas

Nenhuma está nas tabelas das voltas 1 a 5 (conferidas também no histórico de `validation.md`), nem entre as da T31.

| Mutation | File:line at dbe2483 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| Z1 | `broker/server.ts:399` | PAP-07: o `SIGINT` sai com 0 sem limpar (`process.on("SIGINT", () => process.exit(0))`) | ✅ Morto no Linux, 1 falha: `PAP-07: when the session registered is ended by SIGINT, its credential file is gone and it exits with 0`, na asserção do arquivo. No Windows vive (25 pass), pulado lá |
| Z2 | `broker/server.ts:378` | PAP-07, PAP-08: sem a guarda `if (exiting) return;`, e o encerramento corre duas vezes (`end` e `close` da entrada) | ⚪ Equivalente, com sonda (25 pass no Windows, 28 no Linux) |
| Z3 | `broker/server.ts:396` | PAP-07, PAP-08: `process.exitCode = 0` no lugar de `process.exit(0)` | ✅ Morto no Linux, 2 falham. Primeiro: `PAP-07: when the session registered is ended by SIGTERM, its credential file is gone and it exits with 0`: o servidor fica de pé depois do sinal. No Windows vive (25 pass): com a entrada fechada o processo sai sozinho com 0 |
| Z4 | `plugin/hooks/usage.ts:85` | PAP-18: o nome de `subagents/` termina em `.jsonl` sem caixa (`name.toLowerCase().endsWith(".jsonl")`) | ❌ Sobreviveu (52 pass, 0 fail) |
| Z5 | `plugin/hooks/usage.ts:96` | PAP-15, PAP-18: o transcript principal é lido por último | ✅ Morto, 1 falha: `PAP-18: a message.id repeated in the main transcript and in a subagent counts once, with the numbers of the file read last` |
| Z6 | `broker/launch.ts:97` | PAP-39: as variáveis `SQUAD_*` do launcher saem do ambiente | ✅ Morto, 2 falham. Primeiro: `PAP-39: the session has the environment of the launcher without the CLAUDE variables of a session around it, with its name and role` |
| Z7 | `broker/launch.ts:99` | PAP-39: `SQUAD_ROLE` igual ao nome | ✅ Morto, 18 falham. Primeiro: `PAP-52: start worker opens the session command in its worktree, with its name and its role in the environment and, of the CLAUDE variables of the launcher, only the ones of the dev` |
| Z8 | `broker/launch.ts:189` | PAP-38: o log é lido de `/events?after=1` | ✅ Morto, 2 falham. Primeiro: `PAP-38: start worker reads the log of the broker of SQUAD_PORT: with worker-1 online the session is worker-2` |
| Z9 | `broker/launch.ts:196` | PAP-37, PAP-38: a falha da leitura do log é lançada, e não dá um log vazio | ✅ Morto, 8 falham. Primeiro: `PAP-50: start with a session command that does not exist exits 1 and names the command` |
| Z10 | `broker/launch.ts:186` | PAP-37, PAP-38: o prazo da leitura do log é 0,5 × 2000 ms | ✅ Morto, 1 falha: `PAP-38: without a name a worker is worker-1 when the broker does not answer in 2000 ms` |
| Z11 | `plugin/hooks/usage.ts:82` | PAP-18: a extensão `.jsonl` sai do caminho sem caixa (`/\.jsonl$/i`) | ❌ Sobreviveu (52 pass, 0 fail) |

**Sensor depth**: 13 reinjeções e 11 mutações novas, em `broker/server.ts` (3), `plugin/hooks/usage.ts` (3) e `broker/launch.ts` (5) entre as novas; Y1, W2, K13, Z1, Z2 e Z3 também no Linux
**Sensor result**: 13 de 13 reinjetados mortos (Y1 e W2 no Linux). Dos 11 novos, 8 mortos (Z1 e Z3 no Linux), 1 equivalente com sonda e 2 sobreviventes. FAIL

#### As sondas

Cada sonda roda o original e o mutante com a mesma entrada, em `scratchpad\v6probe`, fora do clone das mutações.

| Mutante | Entrada | Original | Mutante | Julgamento |
| ------- | ------- | -------- | ------- | ---------- |
| Z2 | `server-credential.test.ts -t "PAP-0[789]" --rerun-each 10`: no Windows 70 casos e 20 pulados; no Linux 90 casos, sinais incluídos | Todos passam | Todos passam, com o `["peer_joined", "peer_left"]` exato de `:76` em cada volta | Equivalente: o segundo encerramento manda outro `/unregister`, que o broker ignora para um id que já saiu (`broker/peers.ts:205`, `if (peer)`); o `rmSync` é com `force`, e o primeiro `process.exit(0)` encerra o processo. O arquivo some, o código é 0 e há um só `peer_left` |
| Z4 | `s1.jsonl` (1 em cada campo) com `s1/subagents/agent-a.JSONL` (100) | `claude-opus` com 1 | `claude-opus` com 101 | Sobrevivente: `agent-a.JSONL` não é `*.jsonl` (`spec.md:106`) |
| Z11 | `s2.JSONL` (1) com `s2/subagents/agent-a.jsonl` (100) | `claude-opus` com 1 | `claude-opus` com 101 | Sobrevivente: `s2.JSONL` não tem a extensão `.jsonl` para perder; os subagentes dele seriam os de `s2.JSONL/subagents`, que não pode existir |

### Os tempos do caso novo de PAP-38

O caso de `test/unit/launch.test.ts:342`, oito vezes seguidas no Windows, sem mutação, com o tempo do relatório `junit` do `bun test`: 2400, 2408, 2391, 2450, 2402, 2402, 2420 e 2432 ms. Os oito passam, e passam também 10 de 10 com `--rerun-each 10`. O caso não oscila: não afirma tempo, e o prazo de 2000 ms é armado antes do `fetch` de 2500 ms no mesmo processo (`broker/launch.ts:182`–`:186` antes de `:189`), então o temporizador do prazo dispara primeiro mesmo com a máquina carregada. Com Y9 o caso falha: a leitura dura até os 2500 ms e o nome é `worker-2`.

### Gate no clone

- `bun node_modules/typescript/bin/tsc --noEmit`: código 0.
- Os seis arquivos sem mutação (`server-credential`, `hook-usage`, `hook-stop`, `launch-args`, `launch`, `cli`): 181 pass, 5 skip, 0 fail, 186 testes, 606 asserções, 43,78 s. Os cinco pulados no Windows: o modo `0600`, o `SIGTERM` e o `SIGINT` de `server-credential.test.ts`, e os dois casos do laço de `test/integration/cli.test.ts`, pulados no Windows.
- No Linux, sem mutação, `server-credential.test.ts` e `server.test.ts`: 28 pass, 0 fail, os dois sinais incluídos.
- A suíte inteira no Windows e no Linux é do orquestrador; esta volta não a rodou.

### Correções propostas

Só de teste. Nenhuma pede mudança de produção.

- **Fix 20 (PAP-18, Z4 e Z11)**: em `test/unit/hook-usage.test.ts`, um `agent-e.JSONL` no caso de `:172`, fora da soma; e um caso com o transcript `s1.JSONL` e `s1/subagents/agent-a.jsonl`, em que só o principal conta. Os dois rodam no Windows também: o `readdirSync` dá o nome com a caixa gravada, e `s1` não é `s1.JSONL`. Para tirar a dúvida de leitura, a definição "Transcripts da sessão" (`spec.md:106`) pode dizer, como PAP-39, que a caixa conta em `.jsonl`; é o que `plugin/hooks/usage.ts:82` e `:85` já fazem, e a decisão do texto é do dev. Done when: Z4 e Z11 morrem, e Y5, Y6, W5 e K15 seguem mortos.

### Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-07 | Implementing: Fix 15 de `validation.md` aplicado na T45, à espera da reverificação | ✅ Verified: Y1 e W2 morrem no Linux em `test/integration/server-credential.test.ts:98`, cada um no seu sinal; Z1 e Z3 morrem lá; K13 segue morto; Z2 é equivalente com sonda (`broker/peers.ts:205`) |
| PAP-18 | Implementing: Fix 17 de `validation.md` aplicado na T47, à espera da reverificação | ❌ Needs Fix (Fix 20): Y5 morre em `test/unit/hook-usage.test.ts:231` e Y6 em `:172`; W5 e K15 seguem mortos; Z4 (`plugin/hooks/usage.ts:85`) e Z11 (`:82`), a caixa de `.jsonl`, sobrevivem |
| PAP-37 | Implementing: Fix 19 de `validation.md` aplicado na T49, à espera da reverificação | ✅ Verified: Y9 morre em `test/unit/launch.test.ts:342`, que passou 18 de 18 entre 2391 e 2450 ms; W17 e A10 seguem mortos em `test/integration/cli.test.ts:242`; Z9 e Z10 morrem |
| PAP-39 | Implementing: Fix 18 de `validation.md` aplicado na T48, à espera da reverificação | ✅ Verified: a caixa conta como em `broker/launch.ts:97`; Y7 morre em `test/unit/launch-args.test.ts:294`, com `CLAUDE_config_dir` em `:306`; W12 e K2 seguem mortos; Z6 e Z7 morrem |

PAP-38 segue `Verified`: o caso do Fix 19 afirma o nome que ele define quando a leitura falha, e Z8 morre.

### Lições registradas

Pelo `lessons.py`: Z4 e Z11 junto a L-099, com o mesmo texto.

---

## Reverificação do Fix 20 (2026-10-16)

Volta 7. O dev decidiu em 2026-10-16 aplicar o Fix 20. O autor fez isso em `test/papeis-gaps`, `5c7f815..15b7a37` (T50, fase 12 de `tasks.md`): dois acréscimos em `broker/test/unit/hook-usage.test.ts` e uma frase na definição "Transcripts da sessão". Escopo desta volta: só PAP-18. As linhas de código citadas são de `15b7a37`.

### Ambiente e isolamento

- **Intervalo**: `5c7f815..15b7a37`.
- **Ambiente**: Windows 11 Pro 10.0.26200, Bun 1.3.14. Clone físico `scratchpad\verifier7` (`git clone --no-hardlinks -c core.autocrlf=false --branch test/papeis-gaps`) em `15b7a37`, com `bun install --frozen-lockfile` próprio. Linux: contêiner `oven/bun:1.4.2` (Linux 6.18.33.1-microsoft-standard-WSL2) com `verifier7` montado só para leitura e copiado para `/w` sem `.git` nem `node_modules`, com `bun install --frozen-lockfile` próprio.
- **Repositório real**: `git status --porcelain` antes, vazio, em `test/papeis-gaps` e `15b7a37`. Nenhum stash, commit, push, troca de branch nem reset. As mutações rodaram no clone, uma de cada vez, pelo script `scratchpad\v7\mutate.ts`: confere `git status --porcelain` vazio antes, aplica a troca conferindo que ela casa uma vez só, roda os testes da camada, restaura com `git checkout --` e confere o vazio de novo ("clean after: yes" nas 13). No contêiner, sem `git`, o mesmo script restaura regravando o texto original e confere o conteúdo igual antes e depois. As sondas (`scratchpad\v7\probe.ts`) gravam o original e cada mutante como arquivos à parte em `scratchpad\v7probe` no Windows e em `/tmp/v7probe` no contêiner, fora do clone das mutações; o clone ficou limpo depois delas. As saídas ficam em `scratchpad\v7` (`mutate-win.txt`, `mutate-linux.txt`, `probe-win.txt`, `probe-linux.txt`, `paths-win.txt`). Nenhum `claude` real rodou.
- **No fim**: `git status --porcelain` mostra só `.specs/features/papeis/validation.md` (este relatório). A cópia de trabalho dele é LF (`git ls-files --eol`: `i/lf w/lf`), e ficou LF.

### Produção intacta

- `git diff --numstat 055d629..15b7a37 -- plugin broker ':!broker/test'`: nenhuma linha. Nenhum arquivo de produção mudou desde `main`.
- `git diff --stat 5c7f815..15b7a37`: `spec.md` (2 linhas trocadas), `tasks.md` (36 a mais, 2 trocadas) e `broker/test/unit/hook-usage.test.ts` (8 a mais, nenhuma a menos).
- O diff de teste, linha a linha: um comentário e `file(["sub", "s1", "subagents", "agent-e.JSONL"], ...)` com 9000 em cada campo dentro do caso de `:172`, antes do `expect` de `:186`, que não mudou; e um caso novo em `:239`–`:243`. Nenhum `expect` removido nem afrouxado, nenhum `skip`.
- Em `spec.md` mudam a definição "Transcripts da sessão" (`:106`) e a linha de PAP-18 da rastreabilidade (`:387`, `Implementing`). Nenhum texto de AC.
- A frase nova diz o que o código faz. "`agent-a.JSONL` não é `*.jsonl`": `plugin/hooks/usage.ts:85` filtra com `name.endsWith(".jsonl")`, que conta a caixa. "`s1.JSONL` não tem a extensão `.jsonl` para tirar, então os subagentes dele são os de `s1.JSONL/subagents/`": `:82` tira `/\.jsonl$/`, sem `i`, e junta `subagents` ao caminho inteiro. A sonda de Q4 confirma no original: `s1.JSONL` com `s1/subagents/agent-a.jsonl` dá 1 (`probe-win.txt`, `probe-linux.txt`).

### Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`. PAP-18 (`spec.md:209`): os `*.jsonl` de `subagents` somam às linhas do principal, com PAP-15 entre todos os arquivos, e o ilegível não conta. "Transcripts da sessão" (`spec.md:106`): o principal e todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/`, com a caixa contando em `.jsonl`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-18, a soma | Principal mais todo `*.jsonl` de `s1/subagents`, e nada de nome que não é `*.jsonl` | `test/unit/hook-usage.test.ts:172`–`:190`: principal opus (10, 20, 30, 40); `agent-a.jsonl` haiku (5, 6, 7, 8); `agent-b.jsonl` haiku (100, 200, 300, 400) e opus 1; `sidechain-7.jsonl` opus 100; fora, com 9000: `agent-c.txt`, `agent-d.jsonl.bak` e `agent-e.JSONL` (`:185`). `toEqual` do objeto inteiro (`:186`–`:189`): opus 111, 121, 131, 141; haiku 105, 206, 307, 408 | ✅ PASS. As contas batem campo a campo com a definição; um 9000 a mais apareceria em haiku. Z4, Y6 e K15 morrem aqui. Q5 não: nenhum nome de `subagents/` termina em `jsonl` sem o ponto |
| PAP-18 com PAP-15 entre arquivos | Um `message.id` repetido conta uma vez, a última linha | `:192`–`:196`: `m2` no principal (500) e no subagente (2, 3, 4, 5); `toEqual` 12, 23, 34, 45. `:210`–`:215`: `usageOf` nas duas ordens | ✅ PASS. A ordem "principal e depois os nomes" é de `design.md:117`; o caso de `:198` a afirma. O texto da spec não diz a ordem entre arquivos de subagentes, e por isso nenhuma mutação desta volta mexe no `sort` |
| PAP-18, o ilegível | Não conta, e os outros contam | `:217`–`:225`: `agent-a.jsonl` que é diretório, `agent-b.jsonl` haiku 5, 6, 7, 8 | ✅ PASS |
| Definição: só `.jsonl` sai | `s1.txt` não perde extensão; os subagentes dele seriam os de `s1.txt/subagents` | `:227`–`:231`: `s1.txt` com `s1/subagents/agent-a.jsonl`; `toEqual` 1 em cada campo | ✅ PASS. W5 morre aqui |
| Definição: só o `.jsonl` do fim sai | `logs.jsonl.d/s1.jsonl` tem os subagentes de `logs.jsonl.d/s1/subagents` | `:233`–`:237`: `toEqual` 101 em cada campo | ✅ PASS. Y5 morre aqui. Q2 não: o último `.jsonl` desse caminho é o do fim |
| Definição: a caixa conta (nova) | `s1.JSONL` não perde `.jsonl`; `s1/subagents` não conta | `:239`–`:243`: `s1.JSONL` (1) com `s1/subagents/agent-a.jsonl` (100); `toEqual` 1 em cada campo | ✅ PASS. Z11 morre aqui, e Q1 também |
| PAP-18 pelo hook | O `usage` de opus soma o subagente | `test/integration/hook-stop.test.ts:48`–`:59`: `agent-a.jsonl` opus 5 ao lado do principal; `OPUS` 15, 25, 35, 45 (`:61`), afirmado nos casos de PAP-23 e PAP-30 | ✅ PASS. Q3 e Q7 (no Linux) morrem também aqui |

**Status**: ❌ GAP parcial em PAP-18. Cada asserção bate com o resultado que a spec define, e Z4 e Z11 morrem. Falta distinguir duas formas que a definição também decide: um `.jsonl` que não está no fim do nome do transcript (Q2) e um nome de `subagents/` que termina em `jsonl` sem o ponto (Q5).

### Discrimination Sensor

Testes da camada, de dentro de `broker/`: `bun test test/unit/hook-usage.test.ts test/integration/hook-stop.test.ts`. Controle sem mutação: 53 pass, 0 fail, no Windows e no Linux (abaixo, "Gate no clone"). Todas as mutações rodaram nos dois sistemas.

#### Os dois da volta 6 e os quatro mortos antes, reinjetados

| Mutation | File:line at 15b7a37 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| Z4 | `plugin/hooks/usage.ts:85` | PAP-18: `name.toLowerCase().endsWith(".jsonl")` | ✅ Morto no Windows e no Linux, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| Z11 | `plugin/hooks/usage.ts:82` | PAP-18: `/\.jsonl$/i` | ✅ Morto no Windows e no Linux, 1 falha: `PAP-18: the case counts in .jsonl: the subagents of s1.JSONL are in s1.JSONL/subagents, not in s1/subagents` |
| Y5 | `plugin/hooks/usage.ts:82` | PAP-18: `/\.jsonl/` sem `$` | ✅ Morto nos dois, 1 falha: `PAP-18: only the .jsonl at the end leaves the transcript path: a folder with .jsonl in its name keeps it` |
| Y6 | `plugin/hooks/usage.ts:85` | PAP-18: `name.includes(".jsonl")` | ✅ Morto nos dois, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| W5 | `plugin/hooks/usage.ts:82` | PAP-18: tira qualquer extensão (`/\.[^./\\]+$/`) | ✅ Morto nos dois, 2 falhas: `PAP-18: only .jsonl leaves the transcript path: the subagents of s1.txt are in s1.txt/subagents, not in s1/subagents` e o caso de `s1.JSONL` |
| K15 | `plugin/hooks/usage.ts:85` | PAP-18: só `agent-*.jsonl` | ✅ Morto nos dois, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |

#### Mutações novas

Nenhuma está nas tabelas das voltas 1 a 6 (W4, W5, W6, Y5, Y6, Y10, Z4, Z5, Z11, K9 e K15 são as de `usage.ts`), nem entre as da T31.

| Mutation | File:line at 15b7a37 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| Q1 | `plugin/hooks/usage.ts:82` | PAP-18: tira sempre os 6 últimos caracteres (`transcriptPath.slice(0, -".jsonl".length)`) | ✅ Morto nos dois, 1 falha: o caso de `s1.JSONL` (`:239`). Só o caso novo o mata: em `s1.txt` o corte dá `extension/`, sem `subagents` |
| Q2 | `plugin/hooks/usage.ts:82` | PAP-18: corta no último `.jsonl` do caminho, onde quer que esteja (`lastIndexOf(".jsonl")`), e não só no fim | ❌ Sobreviveu (53 pass, 0 fail, nos dois) |
| Q3 | `plugin/hooks/usage.ts:82` | PAP-18: `/jsonl$/`, sem o ponto: `s1.jsonl` vira `s1.` | ✅ Morto nos dois, 16 falhas. Primeiro no Windows: `PAP-23: the log gains one usage per model, in ascending order of the model, with the sums and the session_id of the payload` |
| Q4 | `plugin/hooks/usage.ts:10`, `:82` | PAP-18: `join(dirname(transcriptPath), basename(transcriptPath, ".jsonl"), "subagents")` | ⚠ Vive (53 pass, nos dois) só em entradas que a spec não decide (sonda abaixo): lacuna de precisão, não sobrevivente |
| Q5 | `plugin/hooks/usage.ts:85` | PAP-18: `name.endsWith("jsonl")`, sem o ponto | ❌ Sobreviveu (53 pass, 0 fail, nos dois) |
| Q6 | `plugin/hooks/usage.ts:10`, `:85` | PAP-18: `extname(name) === ".jsonl"` | ⚠ Vive (53 pass, nos dois) só num nome que é só `.jsonl`, que a spec não decide: lacuna de precisão, não sobrevivente |
| Q7 | `plugin/hooks/usage.ts:82` | PAP-18: o diretório `Subagents`, com maiúscula | ✅ Morto no Linux, 16 falhas. Primeiro: `PAP-18: the lines of the files of subagents add to the ones of the main transcript`. No Windows vive (53 pass) e é equivalente lá: o sistema de arquivos não distingue a caixa, e `s1\Subagents` é `s1\subagents` |

**Sensor depth**: 6 reinjeções e 7 mutações novas, todas em `plugin/hooks/usage.ts` (`:82` e `:85`, com o import de `:10`), cada uma no Windows e no Linux
**Sensor result**: 6 de 6 reinjetados mortos, nos dois. Dos 7 novos, 3 mortos (Q7 só no Linux), 2 vivos em entradas que a spec não decide e 2 sobreviventes. FAIL

#### As sondas

Cada sonda roda o original e o mutante com a mesma entrada, fora do clone das mutações (`probe-win.txt`, `probe-linux.txt`; os números são o `input` de `claude-opus`, e os quatro campos andam juntos).

| Mutante | Entrada | Original | Mutante | Julgamento |
| ------- | ------- | -------- | ------- | ---------- |
| Q2 | `s1.jsonl.bak` (1) com `s1/subagents/agent-a.jsonl` (100) | 1 | 101 | Sobrevivente: a extensão de `s1.jsonl.bak` é `.bak`, não há `.jsonl` para tirar, e os subagentes dele seriam os de `s1.jsonl.bak/subagents` (`spec.md:106`). Igual no Windows e no Linux |
| Q2 | `logs.jsonl.d/s1.txt` (1) com `logs/subagents/agent-a.jsonl` (100) | 1 | 101 | Sobrevivente: o mesmo, com o `.jsonl` numa pasta. O caso de `:233` não pega porque lá o último `.jsonl` é o do fim |
| Q5 | `s1.jsonl` (1) com `s1/subagents/agent-fjsonl` (100) | 1 | 101 | Sobrevivente: `agent-fjsonl` não é `*.jsonl` (`spec.md:106`). Igual nos dois |
| Q4 | `s1.jsonl`, `s1.JSONL`, `logs.jsonl.d/s1.jsonl` e o caminho relativo `s1.jsonl`, cada um com seu `subagents` | 101, 1, 101, 101 | 101, 1, 101, 101 | Igual nas formas que a spec decide |
| Q4 | Transcript de nome `.jsonl` (1), com `subagents/agent-a.jsonl` (100) no mesmo diretório | 101 | 1 | Fora do que a spec decide: o original tira `.jsonl` e procura `<diretório>/subagents`; `basename(".jsonl", ".jsonl")` dá `.jsonl` (`paths-win.txt`), e o mutante procura `.jsonl/subagents`. Se um nome que é só `.jsonl` tem a extensão `.jsonl`, a definição não diz; `extname` de Node diz que não |
| Q4 | `s1.jsonl/`, com separador no fim, e `s1/subagents/agent-a.jsonl` (100) | Windows 1; Linux `{}` | Windows 101; Linux `{}` | Fora do que a spec decide. No Linux o principal não é lido (`ENOTDIR`) e os dois dão `{}`. No Windows o principal é lido (`paths-win.txt`: "lido, 170 bytes"): o original, lendo a definição como texto, não acha `.jsonl` no fim e procura `s1.jsonl\subagents`; o mutante, lendo como caminho, procura `s1\subagents`. A definição não diz qual das duas leituras vale. O Claude Code não manda separador no fim |
| Q6 | `s1.jsonl` (1) com `s1/subagents/.jsonl` (100) | 101 | 1 | Fora do que a spec decide: se `*` casa com nada e com nome que começa com ponto, `.jsonl` é `*.jsonl` e o original está certo; na regra do shell não é, e o mutante está certo |
| Q6 | `s1.jsonl` (1) com `agent-a.jsonl` (100) e `agent-b.jsonl.bak` (9000) | 101 | 101 | Igual |

### Gate no clone

- `bun node_modules/typescript/bin/tsc --noEmit`: código 0.
- Os dois arquivos da camada sem mutação, no Windows: 53 pass, 0 fail, 150 asserções, 7,52 s. No Linux, no contêiner: 53 pass, 0 fail, 150 asserções, 3,56 s.
- A suíte inteira no Windows e no Linux é do orquestrador; esta volta não a rodou.

### Lacunas de precisão

- **PAP-18, o nome que é só `.jsonl` (Q4, Q6)**: a definição não diz se um nome que é só `.jsonl`, sem nada antes, é `*.jsonl` (em `subagents/`) ou tem a extensão `.jsonl` (no transcript). O código responde sim aos dois (`plugin/hooks/usage.ts:82`, `:85`). O Claude Code grava `agent-<id>.jsonl` e `<session_id>.jsonl`, nunca um nome vazio antes do ponto.
- **PAP-18, o separador no fim de `transcript_path` (Q4)**: no Windows `readFileSync` lê `s1.jsonl/` como o arquivo `s1.jsonl`, e o código não acha os subagentes de `s1/`. Pela leitura de texto da definição isso está certo; pela leitura de caminho, não. Nenhuma das duas está no texto.

Nenhuma das duas entra no veredito. A decisão de texto, se houver, é do dev; o código não precisa mudar em nenhuma leitura que mantenha o que ele faz.

### Correções propostas

Só de teste. Nenhuma pede mudança de produção.

- **Fix 21 (PAP-18, Q2 e Q5)**: em `test/unit/hook-usage.test.ts`, um `agent-f` sem o ponto, `agent-fjsonl`, no caso de `:172`, fora da soma; e um caso com o transcript `s1.jsonl.bak` e `s1/subagents/agent-a.jsonl`, em que só o principal conta, 1 em cada campo, junto aos casos de `:227` e `:239`. Os dois rodam no Windows e no Linux. Done when: Q2 e Q5 morrem, e Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos.

Sobre o caminho: é a quarta volta seguida em que o sensor acha uma forma nova do mesmo par de linhas, `:82` e `:85` (W5; Y5 e Y6; Z4 e Z11; Q2 e Q5). Nenhuma é defeito de produção, e todas são formas que o Claude Code não grava. O Fix 21 fecha as formas de um sufixo que faltam, o ponto e a posição, e com ele a regra fica cercada nas quatro direções: ponto, âncora no fim, caixa e lugar no caminho. Aplicar o Fix 21 e reverificar, ou aceitar PAP-18 com Q2 e Q5 registrados, é decisão do dev, como foi na volta 3.

### Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-18 | Implementing: Fix 20 de `validation.md` aplicado na T50, com a caixa contando em `.jsonl` na definição "Transcripts da sessão", à espera da reverificação | ❌ Needs Fix (Fix 21): Z4 morre em `test/unit/hook-usage.test.ts:172` (`agent-e.JSONL`, `:185`) e Z11 em `:239`; Y5, Y6, W5 e K15 seguem mortos; Q1 e Q3 morrem, e Q7 no Linux; Q2 (`plugin/hooks/usage.ts:82`, o último `.jsonl` do caminho) e Q5 (`:85`, `jsonl` sem o ponto) sobrevivem |

A linha de cobertura de `spec.md:446` segue com 74 `Verified` e 1 `Needs Fix`.

### Lições

O que eu recomendaria registrar (o orquestrador registra):

- Q2 e Q5 junto a L-099, com o mesmo texto: o teste usa só a forma comum da entrada.
- Nova: uma regra de sufixo num nome (`*.jsonl`, "sem a extensão `.jsonl`") tem quatro vizinhanças que o teste precisa cercar de uma vez: o ponto, a âncora no fim, a caixa e o lugar no caminho (o nome, uma pasta, o meio do nome). Fechar uma por volta custou quatro voltas em PAP-18.
- Nova: no Windows o sistema de arquivos não distingue a caixa, e um mutante na caixa de um nome de diretório (Q7) vive lá e só morre no Linux. A camada de arquivos precisa do Linux no gate, não só da suíte do Windows.

---

## Reverificação do Fix 21 (2026-10-16)

Volta 8. O dev decidiu em 2026-10-16 aplicar o Fix 21. O autor fez isso em `test/papeis-gaps`, `8d03ff4..3344174` (T51, fase 13 de `tasks.md`): dois acréscimos em `broker/test/unit/hook-usage.test.ts`. Escopo desta volta: só PAP-18. As linhas de código citadas são de `3344174`.

### Ambiente e isolamento

- **Intervalo**: `8d03ff4..3344174`.
- **Ambiente**: só Linux: Linux 7.0.0-38-generic, Bun 1.3.14, `os.tmpdir()` em `/tmp`, que é tmpfs. Nesta máquina não há Windows nem docker, e nenhuma mutação nem sonda desta volta rodou no Windows. A diferença da caixa de nomes de diretório (Q7, L-104) não entra em nenhuma mutação desta volta.
- **Cópia**: `scratchpad/verifier8`, feita com `git archive 3344174 plugin broker`, fora do repositório, com `broker/node_modules` como link para o do repositório. `diff -r` da `plugin/` da cópia contra a do repositório: igual.
- **Repositório real**: `git status --porcelain` antes, vazio, em `test/papeis-gaps` e `3344174`. Nenhum stash, commit, push, troca de branch nem reset. As mutações rodaram na cópia, uma de cada vez, pelo script `scratchpad/v8/mutate.py`: confere que cada troca casa uma vez só, grava o mutante, roda os testes da camada, regrava o texto original e confere o conteúdo igual ao de antes (`restored: True`). As sondas (`scratchpad/v8/probe.ts`, `probe2.ts`) gravam o original e cada mutante como arquivos à parte em `scratchpad/v8probe`, fora da cópia das mutações. As saídas ficaram em `scratchpad/v8` (`mutate.txt`, `probe.txt`) enquanto a volta durou. Nenhum `claude` real rodou. A cópia e as saídas foram apagadas no fim.
- **No fim**: `git status --porcelain` mostra só `.specs/features/papeis/validation.md` (este relatório) e os dois arquivos das lições (`.specs/lessons.json`, `.specs/LESSONS.md`), mais o registro desta volta em `docs/tasks/2026-10-16-papeis-volta-8.md`, pedido pela regra global do dev. O `docs/tasks/2026-10-16-papeis-fix-21.md` sem commit, o registro da T51, apareceu durante a volta, gravado por outro agente, e não foi tocado.

### Produção intacta

- `git diff --stat 055d629..3344174 -- plugin broker ':!broker/test'`: nenhuma linha. Nenhum arquivo de produção mudou desde `main`.
- `git diff --stat 8d03ff4..3344174`: `spec.md` (1 linha trocada, a de PAP-18 na rastreabilidade, `:387`), `tasks.md` (35 a mais, 2 trocadas) e `broker/test/unit/hook-usage.test.ts` (8 a mais, nenhuma a menos).
- O diff de teste, linha a linha: um comentário e `file(["sub", "s1", "subagents", "agent-fjsonl"], ...)` com 9000 em cada campo dentro do caso de `:172`, antes do `expect` de `:188`, que não mudou; e um caso novo em `:247`–`:251`. Nenhum `expect` removido nem afrouxado, nenhum `skip`. Nenhum texto de AC nem de definição mudou.

### Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`. PAP-18 (`spec.md:209`): os `*.jsonl` de `subagents` somam às linhas do principal, com PAP-15 entre todos os arquivos; um arquivo de `subagents` que não pode ser lido não conta nada, e os outros contam. "Transcripts da sessão" (`spec.md:106`): o principal e todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/`, com a caixa contando em `.jsonl`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-18, a soma | Principal mais todo `*.jsonl` de `s1/subagents`, e nada de nome que não é `*.jsonl` | `test/unit/hook-usage.test.ts:172`–`:192`: principal opus (10, 20, 30, 40); `agent-a.jsonl` haiku (5, 6, 7, 8); `agent-b.jsonl` haiku (100, 200, 300, 400) e opus 1; `sidechain-7.jsonl` opus 100; fora, com 9000: `agent-c.txt`, `agent-d.jsonl.bak`, `agent-e.JSONL` e `agent-fjsonl` (`:187`, novo). `toEqual` do objeto inteiro (`:188`–`:191`): opus 111, 121, 131, 141; haiku 105, 206, 307, 408 | ✅ PASS no que afirma. Q5, Z4, Y6 e K15 morrem aqui. R2 e R4 não: nenhum nome de `subagents/` é `.json` |
| PAP-18 com PAP-15 entre arquivos | Um `message.id` repetido conta uma vez, a última linha | `:194`–`:198`: `m2` no principal (500) e no subagente (2, 3, 4, 5); `toEqual` 12, 23, 34, 45. `:212`–`:217`: `usageOf` nas duas ordens | ✅ PASS. R16 e R19 morrem aqui |
| Ordem entre arquivos de subagentes | Não está na spec; `design.md:117` diz "em ordem de nome" | `:200`–`:210`: escritos `agent-c`, `agent-b`, `agent-a`, com o mesmo id; `toEqual` haiku 1 | ⚠️ Lacuna de precisão (R5, abaixo). R6 morre aqui |
| PAP-18, o ilegível | Não conta, e os outros contam | `:219`–`:227`: `agent-a.jsonl` que é diretório, `agent-b.jsonl` haiku 5, 6, 7, 8 | ✅ PASS no que afirma. R8 e R9 morrem aqui. R17 não: um diretório não faz `statSync` falhar |
| Definição: só `.jsonl` sai | `s1.txt` não perde extensão | `:229`–`:233`: `s1.txt` com `s1/subagents/agent-a.jsonl`; `toEqual` 1 em cada campo | ✅ PASS. W5 e R14 morrem aqui |
| Definição: só o `.jsonl` do fim sai | `logs.jsonl.d/s1.jsonl` tem os subagentes de `logs.jsonl.d/s1/subagents` | `:235`–`:239`: `toEqual` 101 em cada campo | ✅ PASS. Y5, R3 e R13 morrem aqui |
| Definição: a caixa conta | `s1.JSONL` não perde `.jsonl` | `:241`–`:245`: `toEqual` 1 em cada campo | ✅ PASS. Z11 e Q1 morrem aqui |
| Definição: um `.jsonl` que não está no fim (novo) | `s1.jsonl.bak` não tem a extensão `.jsonl`; `s1/subagents` não conta | `:247`–`:251`: `s1.jsonl.bak` (1) com `s1/subagents/agent-a.jsonl` (100); `toEqual` 1 em cada campo | ✅ PASS. Q2 morre aqui, e R13 também. R1 não: `s1.json` não aparece |
| PAP-19 | Sem o principal, nada | `:253`–`:263` | ✅ PASS. R11 morre aqui |
| PAP-18 pelo hook | O `usage` de opus soma o subagente | `test/integration/hook-stop.test.ts:48`–`:61`: `agent-a.jsonl` opus 5 ao lado do principal; `OPUS` 15, 25, 35, 45 | ✅ PASS. R12 morre também aqui |

**Status**: ❌ GAP parcial em PAP-18. Cada asserção bate com o resultado que a spec define, e Q2 e Q5 morrem. Falta distinguir duas formas que a spec também decide: `.json`, o começo de `.jsonl`, no nome do transcript e no de `subagents/` (R1, R2, R4), e uma entrada `*.jsonl` ilegível que faz uma checagem por entrada falhar (R17).

### Discrimination Sensor

Testes da camada, de dentro de `broker/`: `bun test test/unit/hook-usage.test.ts test/integration/hook-stop.test.ts` (só `stop.ts` importa `usage.ts`). Controle sem mutação: 54 pass, 0 fail, 151 asserções.

#### Os dois da volta 7 e os sete mortos antes, reinjetados

| Mutation | File:line at 3344174 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| Q2 | `plugin/hooks/usage.ts:82` | Corta no último `.jsonl` do caminho (`lastIndexOf(".jsonl")`), e não só no fim | ✅ Morto, 1 falha: `PAP-18: only a .jsonl at the end leaves the transcript path: the subagents of s1.jsonl.bak are in s1.jsonl.bak/subagents, not in s1/subagents` |
| Q5 | `plugin/hooks/usage.ts:85` | `name.endsWith("jsonl")`, sem o ponto | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| Z4 | `plugin/hooks/usage.ts:85` | `name.toLowerCase().endsWith(".jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| Z11 | `plugin/hooks/usage.ts:82` | `/\.jsonl$/i` | ✅ Morto, 1 falha: o caso de `s1.JSONL` |
| Y5 | `plugin/hooks/usage.ts:82` | `/\.jsonl/` sem `$` | ✅ Morto, 1 falha: o caso de `logs.jsonl.d` |
| Y6 | `plugin/hooks/usage.ts:85` | `name.includes(".jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| W5 | `plugin/hooks/usage.ts:82` | Tira qualquer extensão (`/\.[^./\\]+$/`) | ✅ Morto, 2 falhas: o caso de `s1.txt` e o de `s1.JSONL` |
| K15 | `plugin/hooks/usage.ts:85` | Só `agent-*.jsonl` | ✅ Morto, 1 falha: o caso da soma |
| Q1 | `plugin/hooks/usage.ts:82` | Tira sempre os 6 últimos caracteres | ✅ Morto, 1 falha: o caso de `s1.JSONL` |

#### Mutações novas

Nenhuma está nas tabelas das voltas 1 a 7 (W4, W5, W6, Y5, Y6, Y10, Z4, Z5, Z11, K9, K15 e Q1 a Q7 são as de `usage.ts`), nem entre as da T31. R20, que comparava com `names[0]` dentro do próprio inicializador, foi descartada antes de rodar: é a mesma função.

| Mutation | File:line at 3344174 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| R1 | `plugin/hooks/usage.ts:82` | `/\.jsonl?$/`: o `l` opcional, e `.json` também sai do caminho | ❌ Sobreviveu (54 pass, 0 fail) |
| R2 | `plugin/hooks/usage.ts:85` | `/\.jsonl?$/.test(name)`: um `*.json` de `subagents` conta | ❌ Sobreviveu (54 pass, 0 fail) |
| R3 | `plugin/hooks/usage.ts:82` | Tira o primeiro `.json` do caminho e depois um `l` do fim | ✅ Morto, 1 falha: o caso de `logs.jsonl.d` |
| R4 | `plugin/hooks/usage.ts:85` | `name.endsWith(".jsonl") \|\| name.endsWith(".json")` | ❌ Sobreviveu (54 pass, 0 fail) |
| R5 | `plugin/hooks/usage.ts:85` | Sem o `.sort()`: os nomes na ordem de `readdirSync` | ⚠ Vive (54 pass) só numa ordem que a spec não decide (sonda abaixo): lacuna de precisão, não sobrevivente |
| R6 | `plugin/hooks/usage.ts:85` | `.sort().reverse()` | ✅ Morto, 1 falha: `PAP-18: the files of subagents are read in the order of their names, after the main transcript` |
| R7 | `plugin/hooks/usage.ts:89` | `transcripts.reverse()` antes do laço dos subagentes | ➖ Equivalente: ali a lista só tem o principal |
| R8 | `plugin/hooks/usage.ts:93` | O subagente ilegível dá `return {}` | ✅ Morto, 1 falha: `PAP-18: a file of subagents that cannot be read counts nothing, and the others count` |
| R9 | `plugin/hooks/usage.ts:93` | O subagente ilegível dá `break` | ✅ Morto, 1 falha: o mesmo caso |
| R10 | `plugin/hooks/usage.ts:87` | Sem diretório `subagents`, `return {}` | ✅ Morto, 4 falhas. Primeiro: `PAP-14: the usage of a session is read from the file of its transcript` |
| R11 | `plugin/hooks/usage.ts:80` | Sem o principal, segue para os subagentes | ✅ Morto, 2 falhas, os dois casos de PAP-19 |
| R12 | `plugin/hooks/usage.ts:10`, `:82` | `join(dirname(transcriptPath), "subagents")` | ✅ Morto, 16 falhas |
| R13 | `plugin/hooks/usage.ts:82` | `transcriptPath.split(".jsonl")[0]` | ✅ Morto, 2 falhas: o caso de `s1.jsonl.bak` e o de `logs.jsonl.d` |
| R14 | `plugin/hooks/usage.ts:10`, `:82` | `join(dirname(p), parse(p).name)`: tira qualquer extensão | ✅ Morto, 2 falhas: o caso de `s1.txt` e o de `s1.JSONL` |
| R15 | `plugin/hooks/usage.ts:82` | Troca `.jsonl` por `/` em vez de por nada | ➖ Equivalente com sonda, menos no nome que é só `.jsonl` com caminho relativo, a lacuna de precisão da volta 7 (Q4, Q6) |
| R16 | `plugin/hooks/usage.ts:56` | A chave de `message.id` leva o índice do transcript: PAP-15 só dentro de cada arquivo | ✅ Morto, 3 falhas: `PAP-18: a message.id repeated in the main transcript and in a subagent counts once, with the numbers of the file read last` e mais dois |
| R17 | `plugin/hooks/usage.ts:9`, `:85` | O filtro também exige `statSync(join(subagents, name)).isFile()` | ❌ Sobreviveu (54 pass, 0 fail) |
| R18 | `plugin/hooks/usage.ts:85` | `readdirSync(..., { withFileTypes: true })` e só `isFile()`: um link simbólico sai | ⚠ Vive (54 pass) só num link simbólico para arquivo, que a spec não decide: lacuna de precisão |
| R19 | `plugin/hooks/usage.ts:91` | `unshift` em vez de `push`: os subagentes antes do principal | ✅ Morto, 2 falhas: o caso do `m2` repetido e o da ordem |

**Sensor depth**: 9 reinjeções e 19 mutações novas, todas em `plugin/hooks/usage.ts` (`:56`, `:80` a `:93`, com os imports de `:9` e `:10`), só no Linux
**Sensor result**: 9 de 9 reinjetados mortos. Dos 19 novos, 11 mortos, 2 equivalentes, 2 vivos em entradas que a spec não decide e 4 sobreviventes. FAIL

#### As sondas

Cada sonda roda o original e o mutante com a mesma entrada, fora da cópia das mutações (`probe.txt`; os números são o `input` de `claude-opus`, ou de `claude-haiku` onde dito, e os quatro campos andam juntos).

| Mutante | Entrada | Original | Mutante | Julgamento |
| ------- | ------- | -------- | ------- | ---------- |
| R1 | `s1.json` (1) com `s1/subagents/agent-a.jsonl` (100) | 1 | 101 | Sobrevivente: a extensão de `s1.json` é `.json`, não há `.jsonl` para tirar, e os subagentes dele seriam os de `s1.json/subagents` (`spec.md:106`) |
| R2, R4 | `s1.jsonl` (1) com `agent-a.jsonl` (100) e `agent-g.json` (9000) | 101 | 9101 | Sobrevivente: `agent-g.json` não é `*.jsonl` (`spec.md:106`, PAP-18) |
| R17 | `s1.jsonl` (1) com `agent-a.jsonl` (100) e `agent-z.jsonl`, link simbólico sem alvo | 101 | 1 | Sobrevivente: `agent-z.jsonl` não pode ser lido e não conta; os outros contam (PAP-18). No mutante o `statSync` dele lança dentro do `try` de `:84`, `names` fica vazio, e `agent-a.jsonl` some. O diretório `agent-a.jsonl` de `:221` não pega: `statSync` de um diretório não lança |
| R17 | As entradas de R2 | 101 | 101 | Igual |
| R18 | `s1.jsonl` (1) com `agent-l.jsonl`, link simbólico para um arquivo com 100 | 101 | 1 | Fora do que a spec decide: se um link simbólico de nome `*.jsonl` é um arquivo `*.jsonl` de `subagents`, PAP-18 e a definição não dizem. PAP-56 diz isso dos `.env*`, com a palavra "regular"; aqui não há a palavra. O Claude Code grava arquivos, não links |
| R18 | O link sem alvo de R17 | 101 | 101 | Igual |
| R5 | `agent-a` (900), `agent-b` (70), `agent-c` (1) de haiku com o mesmo id, escritos na ordem a, b, c | haiku 1 | haiku 900 | Fora do que a spec decide: a ordem entre arquivos de subagentes é de `design.md:117`, não da spec. Escritos na ordem do teste, c, b, a, os dois dão 1: em tmpfs `readdirSync` lista do mais novo para o mais velho (`agent-a,agent-b,agent-c`), que é a ordem dos nomes. O caso de `:200` foi escrito "do último para o primeiro" para que a criação não fosse a ordem dos nomes, e em tmpfs é exatamente o que a torna igual. No NTFS a listagem já vem por nome e R5 é equivalente lá |
| R7, R15 | As entradas de R1 e de R2 | 1; 101 | 1; 101 | Iguais |
| R15 | Transcript de nome `.jsonl`, caminho relativo, com `subagents/agent-a.jsonl` (100) no diretório atual | 101 | 1 | Fora do que a spec decide: a lacuna do nome que é só `.jsonl` (Q4, Q6, volta 7). Com o caminho absoluto, os dois dão 101 |

### Gate na cópia

- `bun node_modules/typescript/bin/tsc --noEmit`: código 0.
- `bun test test/unit`: 2240 pass, 1 skip, 0 fail, 657791 asserções, 77 arquivos, 55,01 s. O skip é `test/unit/tui-loop.test.ts:1015` (QST-99, só com `SQUAD_TEST_FULL`), fora da fatia.
- Os dois arquivos da camada sem mutação: 54 pass, 0 fail, 151 asserções.
- A suíte inteira, e qualquer coisa no Windows, é do orquestrador; esta volta não as rodou.

### Lacunas de precisão

- **PAP-18, a ordem entre arquivos de subagentes (R5)**: a spec não diz em que ordem os arquivos de `subagents` entram na regra de PAP-15; `design.md:117` diz "em ordem de nome", e o caso de `:200` afirma isso, mas em tmpfs não distingue a falta do `sort`. Escrever os arquivos numa ordem que não é a dos nomes nem a inversa (por exemplo b, c, a) distingue nos dois sentidos. Não entra no veredito: é decisão de design, não de spec.
- **PAP-18, link simbólico em `subagents` (R18)**: a spec não diz se um link de nome `*.jsonl` conta. O código o segue e conta o alvo.
- As duas da volta 7 (o nome que é só `.jsonl`, e o separador no fim) seguem como estavam; R15 toca a primeira.

### Correções propostas

Só de teste. Nenhuma pede mudança de produção.

- **Fix 22 (PAP-18, R1, R2, R4 e R17)**: em `test/unit/hook-usage.test.ts`:
  1. um `agent-g.json` no caso de `:172`, com 9000 em cada campo, fora da soma (mata R2 e R4);
  2. um caso com o transcript `s1.json` e `s1/subagents/agent-a.jsonl`, em que só o principal conta, 1 em cada campo, junto aos casos de `:229` e `:247` (mata R1);
  3. no caso de `:219`, uma entrada `agent-z.jsonl` que é um link sem alvo, criado com `symlinkSync(join(dir, "missing"), ..., "junction")` (o tipo `junction` não pede privilégio no Windows e é ignorado no Linux), e `agent-b.jsonl` segue contando, 5, 6, 7, 8 (mata R17).

  Recomendado, fora do veredito: no caso de `:200`, escrever os três arquivos na ordem b, c, a, para que a ordem de criação não coincida com a dos nomes em tmpfs (R5). Done when: R1, R2, R4 e R17 morrem no Linux, e Q2, Q5, Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos.

Sobre o caminho: é a quinta volta seguida em `:82` e `:85`, e nenhuma é defeito de produção. As quatro direções de L-103 (ponto, âncora, caixa, lugar) estão cercadas agora; R1, R2 e R4 são uma quinta, as letras do sufixo: `.json` é um começo de `.jsonl`. R17 é de outra natureza: o teste do ilegível usa um diretório, que só falha na leitura, e não uma entrada que falha já no `stat`. Aplicar o Fix 22 e reverificar, ou aceitar PAP-18 com R1, R2, R4 e R17 registrados, é decisão do dev, como foi na volta 3.

### Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-18 | Implementing: Fix 21 de `validation.md` aplicado na T51, à espera da oitava volta | ❌ Needs Fix (Fix 22): Q2 morre em `test/unit/hook-usage.test.ts:247` e Q5 em `:187`; Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos; R1 (`plugin/hooks/usage.ts:82`, `.json` sai do caminho), R2 e R4 (`:85`, `*.json` conta) e R17 (`:85`, um `statSync` que lança derruba as outras entradas) sobrevivem |

A linha de cobertura de `spec.md:446` segue com 74 `Verified` e 1 `Needs Fix`.

### Lições registradas

Pelo `scripts/lessons.py`:

- R1, R2, R4 somados a L-099, com o mesmo texto.
- Nova: o começo do sufixo (`.json` para `.jsonl`) como mais uma vizinhança de uma regra de sufixo, ao lado das quatro de L-103.
- Nova: o caso de "um ilegível não conta e os outros contam" precisa de uma entrada que falha já no `stat` (link sem alvo), não só de uma que falha na leitura (diretório) (R17).
- Nova: em tmpfs `readdir` lista do mais novo para o mais velho, e escrever na ordem inversa dos nomes não distingue a falta de um `sort` (R5).

## Reverificação do Fix 22 (2026-10-17)

Volta 9. O dev decidiu em 2026-10-17 aplicar o Fix 22, com o R5 recomendado fora do veredito. O autor fez isso em `test/papeis-gaps`, `d8f7371..18f6d10` (T52, fase 14 de `tasks.md`): três acréscimos e uma troca de ordem em `broker/test/unit/hook-usage.test.ts`. Escopo desta volta: só PAP-18. As linhas de código citadas são de `18f6d10`.

### Ambiente e isolamento

- **Intervalo**: `d8f7371..18f6d10`.
- **Ambiente**: só Linux: Linux 7.0.0-38-generic, Bun 1.3.14, `os.tmpdir()` em `/tmp`, que é tmpfs, usuário 1000 (não root). Nesta máquina não há Windows nem docker, e nenhuma mutação nem sonda desta volta rodou no Windows.
- **Cópia**: `scratchpad/verifier9`, feita com `git archive 18f6d10 plugin broker`, fora do repositório, com `broker/node_modules` como link para o do repositório. `diff -r` da `plugin/` e da `broker/` da cópia contra as do repositório: iguais.
- **Repositório real**: `git status --porcelain` antes, vazio, em `test/papeis-gaps` e `18f6d10`. Nenhum stash, commit, push, troca de branch nem reset. As mutações rodaram na cópia, uma de cada vez, pelo script `scratchpad/v9/mutate.py`: confere que cada troca casa uma vez só, grava o mutante, roda os testes da camada, regrava o texto original e confere o conteúdo igual ao de antes (`restored: True` nas 30 execuções; `cmp` com a cópia guardada do original no fim: igual). A sonda (`scratchpad/v9/probe.ts`) carrega o original e cada mutante como módulos à parte em `scratchpad/v9probe`, fora da cópia das mutações, e apaga os dados dela no fim. As saídas ficaram em `scratchpad/v9` (`mutate-old.txt`, `mutate-new.txt`, `probe.txt`). Nenhum `claude` real rodou.
- **No fim**: `git status --porcelain` depois das mutações e da sonda mostra só `docs/tasks/2026-10-17-papeis-fix-22.md`, o registro da T52, gravado por outro agente durante a volta (16:45) e não tocado. Depois deste relatório entram `.specs/features/papeis/validation.md` e os dois arquivos das lições (`.specs/lessons.json`, `.specs/LESSONS.md`).

### Produção intacta

- `git diff --stat 055d629..18f6d10 -- plugin broker ':!broker/test'`: nenhuma linha. Nenhum arquivo de produção mudou desde `main`.
- `git diff --numstat d8f7371..18f6d10`: `spec.md` (1 linha trocada, a de PAP-18 na rastreabilidade, `:387`), `tasks.md` (37 a mais, 2 a menos) e `broker/test/unit/hook-usage.test.ts` (14 a mais, 3 a menos).
- O diff de teste, linha a linha. As 3 linhas a menos: o import, que ganha `symlinkSync` (`:2`); o comentário do caso da ordem, que passa a dizer "written b, c, a" (`:204`); e a linha de `agent-c.jsonl`, que desce para depois da de `agent-b.jsonl` (`:206`), com o mesmo conteúdo. As 11 a mais: um comentário e `agent-g.json` com 9000 em cada campo no caso da soma (`:188`–`:189`), antes do `expect` de `:190`, que não mudou; dois comentários e o `symlinkSync(join(dir, "missing"), ..., "agent-z.jsonl"), "junction")` no caso do ilegível (`:225`–`:227`), antes do `expect` de `:228`, que não mudou; e um caso novo em `:258`–`:262`. Nenhum `expect` removido nem afrouxado, nenhum `skip`. Nenhum texto de AC nem de definição mudou.
- O link sem alvo: no Linux o tipo `junction` é ignorado e `symlinkSync` cria um link simbólico para `<dir>/missing`, que não existe; `readdirSync` lista `agent-z.jsonl`, `readFileSync` lança `ENOENT` e o `catch` de `plugin/hooks/usage.ts:92` o deixa sem contar. R17 morre nesse caso (abaixo), o que confirma que a entrada falha já no `stat`. No Windows o `junction` não pede privilégio e o alvo é absoluto (`mkdtempSync(join(tmpdir(), ...))`), como a junção pede; uma junção para um alvo que não existe é criada, e `statSync` e `readFileSync` dela lançam. Isso é leitura da plataforma, não execução: esta volta não rodou no Windows.

### Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`. PAP-18 (`spec.md:209`): os `*.jsonl` de `subagents` somam às linhas do principal, com PAP-15 entre todos os arquivos; um arquivo de `subagents` que não pode ser lido não conta nada, e os outros contam. "Transcripts da sessão" (`spec.md:106`): o principal e todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/`, com a caixa contando em `.jsonl`. `design.md:117`: `subagents/*.jsonl` em ordem de nome.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-18, a soma | Principal mais todo `*.jsonl` de `s1/subagents`, e nada de nome que não é `*.jsonl` | `test/unit/hook-usage.test.ts:172`–`:194`: principal opus (10, 20, 30, 40); `agent-a.jsonl` haiku (5, 6, 7, 8); `agent-b.jsonl` haiku (100, 200, 300, 400) e opus 1; `sidechain-7.jsonl` opus 100; fora, com 9000: `agent-c.txt`, `agent-d.jsonl.bak`, `agent-e.JSONL`, `agent-fjsonl` e `agent-g.json` (`:189`, novo). `toEqual` do objeto inteiro (`:190`–`:193`): opus 111, 121, 131, 141; haiku 105, 206, 307, 408 | ✅ PASS no que afirma. R2, R4, Q5, Z4, Y6 e K15 morrem aqui. U2, U4 e U12 não: nenhum nome de `subagents/` tem letras depois de `.jsonl`, nenhum `*.jsonl` tem outro ponto, e nenhum `*.jsonl` está num subdiretório |
| PAP-18 com PAP-15 entre arquivos | Um `message.id` repetido conta uma vez, a última linha | `:196`–`:200`: `m2` no principal (500) e no subagente (2, 3, 4, 5); `toEqual` 12, 23, 34, 45. `:214`–`:219`: `usageOf` nas duas ordens | ✅ PASS |
| Ordem entre arquivos de subagentes | Não está na spec; `design.md:117` diz "em ordem de nome" | `:202`–`:212`: escritos `agent-b`, `agent-c`, `agent-a` (`:205`–`:207`), com o mesmo id; `toEqual` haiku 1, o de `agent-c` | ✅ no que afirma: R5 morre aqui agora. ⚠️ Lacuna de precisão na comparação dos nomes (U6, abaixo) |
| PAP-18, o ilegível | Não conta, e os outros contam | `:221`–`:232`: `agent-a.jsonl` que é diretório, `agent-z.jsonl` que é link sem alvo (`:227`, novo), `agent-b.jsonl` haiku 5, 6, 7, 8; `toEqual` opus 10, 20, 30, 40 e haiku 5, 6, 7, 8 | ✅ PASS no que afirma. R17 morre aqui. U8, U9 e U13 não: nenhuma entrada é um arquivo regular que não pode ser lido, e nenhum `subagents` é outra coisa que um diretório legível ou ausente |
| Definição: só `.jsonl` sai | `s1.txt` não perde extensão | `:234`–`:238`: `toEqual` 1 em cada campo | ✅ PASS. W5 e U10 morrem aqui |
| Definição: só o `.jsonl` do fim sai | `logs.jsonl.d/s1.jsonl` tem os subagentes de `logs.jsonl.d/s1/subagents` | `:240`–`:244`: `toEqual` 101 em cada campo | ✅ PASS. Y5 morre aqui |
| Definição: a caixa conta | `s1.JSONL` não perde `.jsonl` | `:246`–`:250`: `toEqual` 1 em cada campo | ✅ PASS. Z11, Q1 e W5 morrem aqui |
| Definição: um `.jsonl` que não está no fim | `s1.jsonl.bak` não tem a extensão `.jsonl` | `:252`–`:256`: `toEqual` 1 em cada campo | ✅ PASS. Q2 morre aqui |
| Definição: o `.jsonl` inteiro (novo) | `s1.json` não tem a extensão `.jsonl`; `s1/subagents` não conta | `:258`–`:262`: `s1.json` (1) com `s1/subagents/agent-a.jsonl` (100); `toEqual` 1 em cada campo | ✅ PASS. R1 morre aqui. U1, U3 e U5 não: nenhum transcript tem letras depois de `.jsonl`, um `jsonl` sem ponto antes, ou outro ponto no nome |
| PAP-19 | Sem o principal, nada | `:264`–`:274` | ✅ PASS |
| PAP-18 pelo hook | O `usage` de opus soma o subagente | `test/integration/hook-stop.test.ts:48`–`:61`: `agent-a.jsonl` opus 5 ao lado do principal; `OPUS` 15, 25, 35, 45 | ✅ PASS |

**Status**: ❌ GAP parcial em PAP-18. Cada asserção bate com o resultado que a spec define, e os quatro da volta 8 morrem, com R5. Falta distinguir formas que a spec também decide: letras depois de `.jsonl` (U1, U2), um `jsonl` sem ponto no fim do transcript (U3), outro ponto no nome (U4, U5), um `*.jsonl` num subdiretório (U12), e duas entradas que não podem ser lidas e que os testes não têm: um `subagents` que não é diretório legível (U8) e um arquivo regular sem permissão de leitura (U9, U13).

### Discrimination Sensor

Testes da camada, de dentro de `broker/`: `bun test test/unit/hook-usage.test.ts test/integration/hook-stop.test.ts` (só `stop.ts` importa `usage.ts`). Controle sem mutação: 55 pass, 0 fail, 152 asserções.

#### Os quatro da volta 8, R5, R18 e os nove mortos antes, reinjetados

| Mutation | File:line at 18f6d10 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| R1 | `plugin/hooks/usage.ts:82` | `/\.jsonl?$/` | ✅ Morto, 1 falha: `PAP-18: only the whole .jsonl leaves the transcript path: the subagents of s1.json are in s1.json/subagents, not in s1/subagents` |
| R2 | `plugin/hooks/usage.ts:85` | `/\.jsonl?$/.test(name)` | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| R4 | `plugin/hooks/usage.ts:85` | `name.endsWith(".jsonl") \|\| name.endsWith(".json")` | ✅ Morto, 1 falha: o caso da soma |
| R17 | `plugin/hooks/usage.ts:9`, `:85` | O filtro também exige `statSync(join(subagents, name)).isFile()` | ✅ Morto, 1 falha: `PAP-18: a file of subagents that cannot be read counts nothing, and the others count` |
| R5 | `plugin/hooks/usage.ts:85` | Sem o `.sort()` | ✅ Morto, 1 falha: `PAP-18: the files of subagents are read in the order of their names, after the main transcript` |
| R18 | `plugin/hooks/usage.ts:85` | `withFileTypes` e só `isFile()`: um link simbólico sai | ⚠ Vive (55 pass), como na volta 8: lacuna de precisão, o link para arquivo |
| Q2 | `plugin/hooks/usage.ts:82` | Corta no último `.jsonl` do caminho | ✅ Morto, 1 falha: o caso de `s1.jsonl.bak` |
| Q5 | `plugin/hooks/usage.ts:85` | `name.endsWith("jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| Z4 | `plugin/hooks/usage.ts:85` | `name.toLowerCase().endsWith(".jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| Z11 | `plugin/hooks/usage.ts:82` | `/\.jsonl$/i` | ✅ Morto, 1 falha: o caso de `s1.JSONL` |
| Y5 | `plugin/hooks/usage.ts:82` | `/\.jsonl/` sem `$` | ✅ Morto, 1 falha: o caso de `logs.jsonl.d` |
| Y6 | `plugin/hooks/usage.ts:85` | `name.includes(".jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| W5 | `plugin/hooks/usage.ts:82` | Tira qualquer extensão | ✅ Morto, 3 falhas: os casos de `s1.txt`, `s1.JSONL` e `s1.json` |
| K15 | `plugin/hooks/usage.ts:85` | Só `agent-*.jsonl` | ✅ Morto, 1 falha: o caso da soma |
| Q1 | `plugin/hooks/usage.ts:82` | Tira sempre os 6 últimos caracteres | ✅ Morto, 1 falha: o caso de `s1.JSONL` |

#### Mutações novas

Nenhuma está nas tabelas das voltas 1 a 8 (as de `usage.ts` são W4 a W6, Y5, Y6, Y10, Z4, Z5, Z11, K9, K15, Q1 a Q7 e R1 a R19). U1 a U5 são a próxima forma das duas linhas de sempre; U8, U9, U12 e U13 são de outra natureza: o que acontece quando ler falha num lugar que os testes não fazem falhar, e o que há dentro de `subagents` além de nomes.

| Mutation | File:line at 18f6d10 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| U1 | `plugin/hooks/usage.ts:82` | `/\.jsonl\w*$/`: letras depois de `.jsonl` também saem | ❌ Sobreviveu (55 pass, 0 fail) |
| U2 | `plugin/hooks/usage.ts:85` | `/\.jsonl\w*$/.test(name)`: um `*.jsonld` conta | ❌ Sobreviveu (55 pass, 0 fail) |
| U3 | `plugin/hooks/usage.ts:82` | `/.jsonl$/`, o ponto sem escape: qualquer caractere antes de `jsonl` sai com ele | ❌ Sobreviveu (55 pass, 0 fail) |
| U4 | `plugin/hooks/usage.ts:85` | `/^[^.]+\.jsonl$/.test(name)`: um nome com outro ponto não conta | ❌ Sobreviveu (55 pass, 0 fail) |
| U5 | `plugin/hooks/usage.ts:10`, `:82` | Num caminho que termina em `.jsonl`, `join(dirname(p), basename(p).split(".")[0])`: o nome do transcript é cortado no primeiro ponto | ❌ Sobreviveu (55 pass, 0 fail) |
| U6 | `plugin/hooks/usage.ts:85` | `.sort((a, b) => a.localeCompare(b))` | ⚠ Vive (55 pass) só numa ordem que a spec não decide: lacuna de precisão |
| U7 | `plugin/hooks/usage.ts:85` | O filtro tira nomes que começam com ponto | ⚠ Vive (55 pass) só num nome que a spec não decide: lacuna de precisão |
| U8 | `plugin/hooks/usage.ts:9`, `:84`–`:88` | Sem o `try`: `names = existsSync(subagents) ? readdirSync(...)... : []` | ❌ Sobreviveu (55 pass, 0 fail) |
| U9 | `plugin/hooks/usage.ts:9`, `:90`–`:94` | Sem o `try`: lê só se `statSync(..., { throwIfNoEntry: false })?.isFile()` | ❌ Sobreviveu (55 pass, 0 fail) |
| U10 | `plugin/hooks/usage.ts:86` | O `catch` do `readdirSync` relança tudo que não é `ENOENT` | ✅ Morto, 4 falhas: os casos de `s1.txt`, `s1.JSONL`, `s1.jsonl.bak` e `s1.json`, em que `<transcript>/subagents` dá `ENOTDIR` |
| U11 | `plugin/hooks/usage.ts:10`, `:82` | `extname(p) === ".jsonl" ? p.slice(0, -6) : p` | ⚠ Vive (55 pass) só no nome que é só `.jsonl`, a lacuna de Q4 e Q6 (volta 7) |
| U12 | `plugin/hooks/usage.ts:85` | `readdirSync(subagents, { recursive: true })` | ❌ Sobreviveu (55 pass, 0 fail) |
| U13 | `plugin/hooks/usage.ts:92` | O `catch` da leitura de um subagente relança tudo que não é `EISDIR` nem `ENOENT` | ❌ Sobreviveu (55 pass, 0 fail) |
| U14 | `plugin/hooks/usage.ts:85` | `.sort()` antes do `.filter()` | ➖ Equivalente: o filtro guarda a ordem que recebe |
| U15 | `plugin/hooks/usage.ts:82` | `/\.jsonl$/g` | ➖ Equivalente: com `$` só há um lugar que casa |

**Sensor depth**: 15 reinjeções e 15 mutações novas, todas em `plugin/hooks/usage.ts` (`:82`, `:84` a `:94`, com os imports de `:9` e `:10`), só no Linux
**Sensor result**: 14 de 15 reinjetados mortos; R18 segue vivo como lacuna de precisão. Dos 15 novos, 1 morto, 2 equivalentes, 3 vivos em entradas que a spec não decide e 9 sobreviventes. FAIL

#### As sondas

Cada sonda roda o original e o mutante com a mesma entrada, fora da cópia das mutações (`probe.txt`; os números são o `input` de `claude-opus`, ou de `claude-haiku` onde dito, e os quatro campos andam juntos).

| Mutante | Entrada | Original | Mutante | Julgamento |
| ------- | ------- | -------- | ------- | ---------- |
| U1 | `s1.jsonld` (1) com `s1/subagents/agent-a.jsonl` (100) | 1 | 101 | Sobrevivente: a extensão de `s1.jsonld` é `.jsonld`; não há `.jsonl` para tirar, e os subagentes dele seriam os de `s1.jsonld/subagents` (`spec.md:106`). Com `s1.jsonl`, os dois dão 101 |
| U2 | `s1.jsonl` (1) com `agent-a.jsonl` (100) e `agent-h.jsonld` (9000) | 101 | 9101 | Sobrevivente: `agent-h.jsonld` não é `*.jsonl` (`spec.md:106`, PAP-18) |
| U3 | `s1-jsonl` (1) com `s1/subagents/agent-a.jsonl` (100); e `s1jsonl` (1) com `s/subagents/agent-a.jsonl` (100) | 1; 1 | 101; 101 | Sobrevivente: nenhum dos dois nomes tem a extensão `.jsonl`. O par de `agent-fjsonl` (Q5) existe para `:85`; para `:82` não |
| U4 | `s1.jsonl` (1) com `agent-a.jsonl` (100) e `agent.2.jsonl` (1000) | 1101 | 101 | Sobrevivente: `agent.2.jsonl` é um `*.jsonl` de `subagents` e conta (PAP-18) |
| U5 | `s1.v2.jsonl` (1) com `s1.v2/subagents/agent-a.jsonl` (100) e `s1/subagents/agent-a.jsonl` (10000) | 101 | 10001 | Sobrevivente: `s1.v2.jsonl` sem a extensão `.jsonl` é `s1.v2`, e os subagentes são os de `s1.v2/subagents` (`spec.md:106`) |
| U6 | `agent-B.jsonl` (haiku 70) e `agent-a.jsonl` (haiku 1), mesmo id | haiku 1 | haiku 70 | Fora do que a spec decide: por unidade de código `B` vem antes de `a`, pela localidade depois. `design.md:117` diz "em ordem de nome", sem dizer qual. Com `agent-a`, `agent-b`, `agent-c`, os dois dão 1 |
| U7 | `s1.jsonl` (1) com `.agent-h.jsonl` (100) | 101 | 1 | Fora do que a spec decide: se `*.jsonl` pega um nome que começa com ponto, como num glob de shell que não pega, a definição não diz. O original conta. O Claude Code não grava nome oculto em `subagents` |
| U8 | `s1.jsonl` (1) com `s1/subagents` arquivo regular | 1 | lança `ENOTDIR` | Sobrevivente: os transcripts da sessão são o principal e os `*.jsonl` de `subagents/`; um `subagents` que não é diretório não tem nenhum, e o cálculo dá o principal (`spec.md:106`, PAP-14). Lançar derruba `stop.ts:50`, que sai com 1 sem `usage` (PAP-23, PAP-24) |
| U8 | `s1.jsonl` (1) com `s1/subagents` de modo `0o000`, com `agent-a.jsonl` (100) dentro | 1 | lança `EACCES` | O mesmo |
| U8 | Sem `subagents` | 1 | 1 | Igual |
| U9, U13 | `s1.jsonl` (1) com `agent-a.jsonl` de modo `0o000` (100) e `agent-b.jsonl` (haiku 5) | opus 1, haiku 5 | lança `EACCES` | Sobrevivente: `agent-a.jsonl` não pode ser lido, não conta, e os outros contam (PAP-18, a letra do critério). `statSync` diz que ele é arquivo regular, e a leitura lança fora de qualquer `try`. Lançar derruba `stop.ts:50` (PAP-23, PAP-24) |
| U9, U13 | As entradas de `:221`: diretório `agent-a.jsonl`, link sem alvo `agent-z.jsonl`, `agent-b.jsonl` (haiku 5) | opus 1, haiku 5 | opus 1, haiku 5 | Igual: o diretório e o link falham em `statSync` ou em `EISDIR`/`ENOENT`, que os dois mutantes deixam passar |
| U11 | Transcript de nome `.jsonl` (1) com `subagents/agent-a.jsonl` (100) ao lado | 101 | 1 | Fora do que a spec decide: a lacuna do nome que é só `.jsonl` (Q4, Q6, volta 7). Com `s1.jsonl`, os dois dão 101 |
| U12 | `s1.jsonl` (1) com `agent-a.jsonl` (100) e `subagents/nested/agent-n.jsonl` (1000) | 101 | 1101 | Sobrevivente: `agent-n.jsonl` é um arquivo de `subagents/nested/`, não de `subagents/`; os arquivos `*.jsonl` do diretório `subagents` (PAP-18) são os que estão nele |
| U14, U15 | As entradas de U2; e `s1.jsonl.jsonl` (1) com `s1.jsonl/subagents` (100) e `s1/subagents` (10000) | 101; 101 | 101; 101 | Iguais |
| R18 | `s1.jsonl` (1) com `agent-l.jsonl`, link simbólico para um arquivo com 100 | 101 | 1 | Fora do que a spec decide, como na volta 8 |

Que um módulo do hook que lança faz o processo sair com 1 foi conferido com um arquivo de uma linha que lança depois de um `await` no nível de cima: `bun` sai com 1. `plugin/hooks/stop.ts:50` chama `sessionUsage` sem `try`, e as chamadas de `/usage` de `:52`–`:56` vêm depois.

### Gate na cópia

- `bun node_modules/typescript/bin/tsc --noEmit`: código 0.
- `bun test test/unit`: 2241 pass, 1 skip, 0 fail, 657792 asserções, 77 arquivos, 50,99 s. O skip é `test/unit/tui-loop.test.ts:1015` (QST-99, só com `SQUAD_TEST_FULL`), fora da fatia. Um teste a mais que na volta 8: o caso de `s1.json`.
- Os dois arquivos da camada sem mutação: 55 pass, 0 fail, 152 asserções.
- A suíte inteira, e qualquer coisa no Windows, é do orquestrador; esta volta não as rodou.

### Lacunas de precisão

- **A comparação dos nomes na ordem (U6)**: `design.md:117` diz "em ordem de nome", e o código usa a ordem por unidade de código do `.sort()` sem comparador. A spec não fala de ordem entre arquivos de subagentes. Se a ordem fica no design, dizer "por unidade de código" e testar com nomes que diferem na caixa (`agent-B`, `agent-a`) fecha a lacuna. Não entra no veredito.
- **Nome que começa com ponto (U7)**: a definição não diz se `.agent-h.jsonl` é um `*.jsonl`. O código conta.
- **Link simbólico em `subagents` (R18)** e **o nome que é só `.jsonl` (U11, Q4, Q6)**: como estavam.

### Correções propostas

Só de teste. Nenhuma pede mudança de produção.

- **Fix 23 (PAP-18, U1 a U5, U8, U9, U12 e U13)**: em `test/unit/hook-usage.test.ts`:
  1. um caso do ilegível com um `agent-y.jsonl` de modo `0o000` (`chmodSync`), com `agent-b.jsonl` contando 5, 6, 7, 8 e o principal 10, 20, 30, 40, sem lançar; `test.skipIf(process.platform === "win32" || process.getuid?.() === 0)`, porque no Windows `chmod` não tira a leitura e o root lê assim mesmo: um skip registrado, como `test/integration/server-credential.test.ts:57` (mata U9 e U13);
  2. um caso com `s1/subagents` que é um arquivo regular, em que só o principal conta, 1 em cada campo, sem lançar (mata U8; roda nas duas plataformas);
  3. no caso da soma de `:172`, com 9000 em cada campo e fora da soma: `agent-h.jsonld` (mata U2) e `nested/agent-n.jsonl` dentro de `subagents/nested/` (mata U12). O `expect` de `:190` não muda;
  4. um caso com `agent.2.jsonl` (100) ao lado do principal (1), em que os dois contam, 101 em cada campo (mata U4);
  5. junto ao caso de `s1.json` (`:258`), três transcripts: `s1.jsonld` e `s1-jsonl`, cada um com `s1/subagents/agent-a.jsonl` (100), em que só o principal conta, 1 em cada campo (matam U1 e U3); e `s1.v2.jsonl` (1) com `s1.v2/subagents/agent-a.jsonl` (100) e `s1/subagents/agent-a.jsonl` (10000), 101 em cada campo (mata U5).

  Done when: U1, U2, U3, U4, U5, U8, U12 morrem no Linux e no Windows, U9 e U13 no Linux, e R1, R2, R4, R5, R17, Q2, Q5, Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos.

Sobre o caminho: é a sexta volta seguida em `:82` e `:85`, e nenhuma é defeito de produção. Cada volta cercou as formas que a anterior achou, e a seguinte achou a vizinha: depois de `.json`, `.jsonld`; depois de `agent-fjsonl` em `subagents`, `s1-jsonl` no transcript; e um ponto a mais no nome, que nenhum caso tem. Uma forma de parar a corrente é trocar os casos de um nome por dois laços, um sobre nomes de `subagents/` (os que contam e os que não contam) e outro sobre nomes de transcript (com o diretório dos subagentes de cada um), com as formas das voltas 4 a 9 e as do item 5 de uma vez. U8, U9, U13 e U12 são de outra natureza: o critério diz "não pode ser lido", e os testes só fazem falhar um diretório e um link, nunca um arquivo regular, e nunca o próprio `subagents`. Aplicar o Fix 23 e reverificar, ou aceitar PAP-18 com esses mutantes registrados, é decisão do dev, como foi na volta 3.

### Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-18 | Implementing: Fix 22 de `validation.md` aplicado na T52, à espera da nona volta | ❌ Needs Fix (Fix 23): R1 morre em `test/unit/hook-usage.test.ts:258`, R2 e R4 em `:189`, R17 em `:227` e R5 em `:205`–`:207`; Q2, Q5, Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos; U1, U3 e U5 (`plugin/hooks/usage.ts:82`: `.jsonld`, `s1-jsonl` e `s1.v2.jsonl`), U2, U4 e U12 (`:85`: `agent-h.jsonld`, `agent.2.jsonl` e um subdiretório) e U8, U9 e U13 (`:84`–`:94`: um `subagents` que não é diretório e um arquivo sem permissão fazem `sessionUsage` lançar) sobrevivem |

A linha de cobertura de `spec.md:446` segue com 74 `Verified` e 1 `Needs Fix`.

### Lições registradas

Pelo `scripts/lessons.py`:

- U1, U2, U4, U5 somados a L-099, e U3 a L-103, com os mesmos textos.
- L-108: uma extensão que só começa com o sufixo (`.jsonld` para `.jsonl`), o par de L-105 (U1, U2).
- L-109: um nome com outros pontos antes da extensão (`agent.2.jsonl`), para que um corte no primeiro ponto falhe (U4, U5).
- L-110: o ilegível também com um arquivo regular sem permissão de leitura, o que uma checagem de `stat` antes da leitura deixa passar (U9, U13).
- L-111: o diretório listado também quando o caminho é um arquivo regular, para que uma checagem de existência antes de listar falhe (U8).
- L-112: um subdiretório com um arquivo que casa, para que uma listagem recursiva falhe (U12).
- L-113 (lacuna de precisão): dizer se a ordem dos nomes é por unidade de código ou por localidade, e testar com nomes que diferem na caixa (U6).
- L-114 (lacuna de precisão): dizer se um padrão como `*.jsonl` pega um nome que começa com ponto (U7).

---
## Reverificação do Fix 23 (2026-10-17)

Volta 10. O dev decidiu em 2026-10-17 aplicar o Fix 23 inteiro. O autor fez isso em `test/papeis-gaps`, `bd014a3..a7f81d6` (T53 `f387585` e T54 `a7f81d6`, fase 15 de `tasks.md`), só em `broker/test/unit/hook-usage.test.ts`. Escopo desta volta: só PAP-18. As linhas de código citadas são de `a7f81d6`.

### Ambiente e isolamento

- **Intervalo**: `bd014a3..a7f81d6`.
- **Ambiente**: só Linux: Linux 7.0.0-38-generic, Bun 1.3.14, `os.tmpdir()` em `/tmp`, que é tmpfs, usuário 1000 (não root, então o caso de `:241` roda). Nesta máquina não há Windows nem docker, e nenhuma mutação nem sonda desta volta rodou no Windows.
- **Cópia**: `scratchpad/verifier10`, feita com `git archive a7f81d6 plugin broker`, fora do repositório, com `broker/node_modules` como link para o do repositório. `diff -r` da `plugin/` e da `broker/` da cópia contra as do repositório: iguais.
- **Repositório real**: `git status --porcelain` antes, em `test/papeis-gaps` e `a7f81d6`: `?? docs/tasks/2026-10-17-papeis-fix-23.md`, o registro da fase 15, de outro agente, não tocado. Nenhum stash, commit, push, troca de branch nem reset. As mutações rodaram na cópia, uma de cada vez, pelo script `scratchpad/v10/run.py` com as trocas de `scratchpad/v10/muts.py`: confere que cada troca casa uma vez só, grava o mutante, roda os testes da camada, regrava o original e compara com a cópia guardada (`restored: True` nas 46 execuções; no fim, `cmp` de `usage.ts` e `stop.ts` da cópia contra os do repositório: iguais). A sonda (`scratchpad/v10/probe.ts`) carrega o original e cada mutante como módulos à parte em `scratchpad/v10probe`, fora da cópia das mutações, e apaga os dados dela no fim. As saídas ficaram em `scratchpad/v10` (`mutate-old.txt`, `mutate-new.txt`, `probe.txt`). Nenhum `claude` real rodou.
- **No fim**: `git status --porcelain` depois das mutações e da sonda: o mesmo `?? docs/tasks/2026-10-17-papeis-fix-23.md` de antes. Depois deste relatório entram `.specs/features/papeis/validation.md` e os dois arquivos das lições (`.specs/lessons.json`, `.specs/LESSONS.md`).

### Produção intacta

- `git diff --stat 055d629..a7f81d6 -- plugin broker ':!broker/test'`: nenhuma linha. Nenhum arquivo de produção mudou desde `main`.
- `git diff --numstat bd014a3..a7f81d6`: `spec.md` (1 linha trocada, a de PAP-18 na rastreabilidade, `:387`), `tasks.md` (55 a mais, 1 a menos) e `broker/test/unit/hook-usage.test.ts` (73 a mais, 33 a menos).
- O diff de teste. O import ganha `chmodSync` (`:2`). No caso da soma, as cinco linhas de um nome que não conta viram a lista de `:184`–`:195`, com os mesmos cinco nomes e mais `jsonl`, `agent-h.jsonld` e `nested/agent-n.jsonl`, todos com 9000; o `expect` de `:196`–`:199` não mudou. Saem cinco casos de um transcript (`s1.txt`, `logs.jsonl.d/s1.jsonl`, `s1.JSONL`, `s1.jsonl.bak`, `s1.json`) e voltam nos dois laços com a mesma entrada e o mesmo esperado: `logs.jsonl.d/s1.jsonl` em `:282`, agora com um `s1/subagents` de 9000 ao lado (`:289`), que não conta, e os outros quatro em `:296`. Entram o caso das permissões (`:240`–`:262`, com `test.skipIf(process.platform === "win32" || process.getuid?.() === 0)` em `:241`), o do `subagents` arquivo (`:264`–`:268`), o dos pontos (`:270`–`:276`) e os laços de `:278`–`:292` e `:294`–`:302`. Das quatro linhas de `expect` a menos no diff, as quatro voltam iguais nos laços (`:290`, `:300`). Nenhum `expect` afrouxado, nenhum caso pulado fora do Windows e do root, nenhum texto de AC nem de definição mudou.
- O caso das permissões restaura o modo de `subagents` num `finally` (`:257`–`:260`); o `agent-y.jsonl` fica em `0o000`, e o `rmSync(..., { force: true })` de `:8` o apaga assim mesmo, porque apagar depende do diretório, não do arquivo. Nenhum resto em `/tmp` depois do gate.

### Spec-Anchored Acceptance Criteria

Caminhos de teste relativos a `broker/`. PAP-18 (`spec.md:209`): os `*.jsonl` de `subagents` somam às linhas do principal, com PAP-15 entre todos os arquivos; um arquivo de `subagents` que não pode ser lido não conta nada, e os outros contam. "Transcripts da sessão" (`spec.md:106`): o principal e todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/`, com a caixa contando em `.jsonl`. PAP-19 (`spec.md:210`): só um principal que não existe ou não pode ser lido dá nenhum modelo. `design.md:117`: `subagents/*.jsonl` em ordem de nome.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PAP-18, a soma | Principal mais todo `*.jsonl` de `s1/subagents`, e nada de nome que não é `*.jsonl` nem de subdiretório | `test/unit/hook-usage.test.ts:172`–`:200`: principal opus (10, 20, 30, 40); `agent-a.jsonl` haiku (5, 6, 7, 8); `agent-b.jsonl` haiku (100, 200, 300, 400) e opus 1; `sidechain-7.jsonl` opus 100; fora, com 9000, a lista de `:184`–`:193`. `toEqual` do objeto inteiro (`:196`–`:199`): opus 111, 121, 131, 141; haiku 105, 206, 307, 408 | ✅ PASS no que afirma. U2, U12, R2, R4, Q5, Z4, Y6, K15 e N9 morrem aqui. N7, N8, N12 e N21 não: nenhum nome tem espaço ou `\n` depois de `.jsonl`, nenhum tem o nome do principal, e nenhum caso tem mais de três arquivos que contam |
| PAP-18 com PAP-15 entre arquivos | Um `message.id` repetido conta uma vez, a última linha | `:202`–`:206`: `toEqual` 12, 23, 34, 45. `:220`–`:225`: `usageOf` nas duas ordens | ✅ PASS. N14 não morre: nenhum caso tem dois arquivos com o mesmo texto e linhas sem id |
| Ordem entre arquivos de subagentes | Não está na spec; `design.md:117` diz "em ordem de nome" | `:208`–`:218`: escritos `agent-b`, `agent-c`, `agent-a`, com o mesmo id; `toEqual` haiku 1, o de `agent-c` | ✅ no que afirma: R5 morre aqui. ⚠️ Lacuna de precisão no nome comparado (N13, abaixo) |
| PAP-18, o ilegível | Não conta, e os outros contam | `:227`–`:238`: diretório `agent-a.jsonl`, link sem alvo `agent-z.jsonl`, `agent-b.jsonl` haiku 5, 6, 7, 8; `toEqual` opus 10, 20, 30, 40 e haiku 5, 6, 7, 8 | ✅ PASS. R17 e N19 morrem aqui |
| PAP-18, o ilegível por permissão (novo) | Um `agent-y.jsonl` sem leitura não conta, e `agent-b.jsonl` conta; um `subagents` sem leitura não tem arquivo que conte | `:240`–`:262`: `agent-y.jsonl` em `0o000` (`:245`), `toEqual` opus 10, 20, 30, 40 e haiku 5, 6, 7, 8 (`:247`–`:250`); `subagents` em `0o000` (`:254`), `toEqual` opus 1 (`:256`) | ✅ PASS. U8, U9, U13, N18 e N19 morrem aqui. N16 e N17 não: o erro de cada entrada é `EACCES`, `EISDIR`, `ENOENT` ou `ENOTDIR`, e uma lista desses códigos passa |
| PAP-18, `subagents` arquivo (novo) | Um `subagents` que não é diretório não tem arquivo de subagente: só o principal | `:264`–`:268`: `toEqual` 1 em cada campo | ✅ PASS. U8 e N18 morrem aqui |
| PAP-18, outros pontos no nome (novo) | `agent.2.jsonl`, `agent-i.json.jsonl` e `agent-j.jsonl.jsonl` são `*.jsonl` e contam | `:270`–`:276`: 100 cada, principal 1; `toEqual` 301 em cada campo | ✅ PASS. U4, K15, N10 e N11 morrem aqui |
| Definição: o `.jsonl` do fim sai (novo laço) | `s1.jsonl`, `logs.jsonl.d/s1.jsonl`, `s1.v2.jsonl` e `s1.jsonl.jsonl` têm os subagentes de `s1`, `logs.jsonl.d/s1`, `s1.v2` e `s1.jsonl`; os de `s1/subagents`, quando não é esse, não contam | `:278`–`:292`: 100 no diretório certo, 9000 em `s1/subagents` (`:289`); `toEqual` 101 em cada campo (`:290`) | ✅ PASS. U5, Y5, N3, N4 e N5 morrem aqui |
| Definição: sem a extensão `.jsonl` (novo laço) | `s1.txt`, `s1.JSONL`, `s1.jsonl.bak`, `s1.json`, `s1.jsonld` e `s1-jsonl` não perdem nada; `s1/subagents` não conta | `:294`–`:302`: `toEqual` 1 em cada campo (`:300`) | ✅ PASS. U1, U3, R1, Q1, Q2, Z11, W5, N5 e N18 morrem aqui. N2, N6 e N20 não: nenhum nome é `s1jsonl`, nem tem espaço ou `\n` depois de `.jsonl` |
| PAP-18 com um principal que não conta nada | O principal existe e é lido (PAP-19 não vale); os subagentes somam às zero linhas dele | Nenhum caso | ❌ GAP: N15 sobrevive |
| PAP-19 | Sem o principal, nada | `:304`–`:314` | ✅ PASS |
| PAP-18 pelo hook | O `usage` de opus soma o subagente | `test/integration/hook-stop.test.ts:48`–`:61`: `agent-a.jsonl` opus 5 ao lado do principal; `OPUS` 15, 25, 35, 45 | ✅ PASS. N22 morre aqui |

**Status**: ❌ GAP parcial em PAP-18. Cada asserção bate com o resultado que a spec define, e os nove da volta 9 morrem. Falta distinguir formas que a spec também decide e que nenhum caso usa: um espaço ou um `\n` depois de `.jsonl` (N2, N8, N20, N21), `s1jsonl` (N6), um subagente com o nome do principal (N7), mais de três arquivos que contam (N12), dois arquivos de texto igual (N14), um principal que não conta nada (N15), e um erro de leitura de código que os casos não fazem (N16, N17).

### Discrimination Sensor

Testes da camada, de dentro de `broker/`: `bun test test/unit/hook-usage.test.ts test/integration/hook-stop.test.ts` (só `stop.ts` importa `usage.ts`). Controle sem mutação: 63 pass, 0 fail, 161 asserções, 0 skip; cinco vezes seguidas, 63 pass.

#### Os nove do Fix 23 e os catorze mortos antes, reinjetados

| Mutation | File:line at a7f81d6 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| U1 | `plugin/hooks/usage.ts:82` | `/\.jsonl\w*$/` | ✅ Morto, 1 falha: `PAP-18: s1.jsonld has no extension .jsonl: the subagents of s1/subagents do not count` |
| U2 | `plugin/hooks/usage.ts:85` | `/\.jsonl\w*$/.test(name)` | ✅ Morto, 1 falha: `PAP-18: the lines of the files of subagents add to the ones of the main transcript` |
| U3 | `plugin/hooks/usage.ts:82` | `/.jsonl$/`, o ponto sem escape | ✅ Morto, 1 falha: o caso de `s1-jsonl` |
| U4 | `plugin/hooks/usage.ts:85` | `/^[^.]+\.jsonl$/.test(name)` | ✅ Morto, 1 falha: `PAP-18: a *.jsonl of subagents with other dots in its name counts` |
| U5 | `plugin/hooks/usage.ts:10`, `:82` | O nome do transcript cortado no primeiro ponto | ✅ Morto, 2 falhas: os casos de `s1.v2.jsonl` e de `s1.jsonl.jsonl` |
| U8 | `plugin/hooks/usage.ts:9`, `:83`–`:88` | `existsSync` no lugar do `try` | ✅ Morto, 2 falhas: o caso das permissões e `PAP-18: a subagents that is a file has no file of subagents: only the main transcript counts` |
| U9 | `plugin/hooks/usage.ts:9`, `:90`–`:94` | `statSync(...)?.isFile()` no lugar do `try` | ✅ Morto, 1 falha: `PAP-18: a file of subagents without permission to read, or a subagents directory without it, counts nothing, and the others count` |
| U12 | `plugin/hooks/usage.ts:85` | `readdirSync(subagents, { recursive: true })` | ✅ Morto, 1 falha: o caso da soma |
| U13 | `plugin/hooks/usage.ts:92` | O `catch` relança o que não é `EISDIR` nem `ENOENT` | ✅ Morto, 1 falha: o caso das permissões |
| R1 | `plugin/hooks/usage.ts:82` | `/\.jsonl?$/` | ✅ Morto, 1 falha: o caso de `s1.json` |
| R2 | `plugin/hooks/usage.ts:85` | `/\.jsonl?$/.test(name)` | ✅ Morto, 1 falha: o caso da soma |
| R4 | `plugin/hooks/usage.ts:85` | `\|\| name.endsWith(".json")` | ✅ Morto, 1 falha: o caso da soma |
| R17 | `plugin/hooks/usage.ts:9`, `:85` | O filtro também exige `statSync(...).isFile()` | ✅ Morto, 1 falha: `PAP-18: a file of subagents that cannot be read counts nothing, and the others count` |
| R5 | `plugin/hooks/usage.ts:85` | Sem o `.sort()` | ✅ Morto, 1 falha: o caso da ordem |
| Q2 | `plugin/hooks/usage.ts:82` | Corta no último `.jsonl` do caminho | ✅ Morto, 2 falhas: os casos de `s1.jsonl.bak` e de `s1.jsonld` |
| Q5 | `plugin/hooks/usage.ts:85` | `name.endsWith("jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| Z4 | `plugin/hooks/usage.ts:85` | `name.toLowerCase().endsWith(".jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| Z11 | `plugin/hooks/usage.ts:82` | `/\.jsonl$/i` | ✅ Morto, 1 falha: o caso de `s1.JSONL` |
| Y5 | `plugin/hooks/usage.ts:82` | `/\.jsonl/` sem `$` | ✅ Morto, 1 falha: o caso de `logs.jsonl.d/s1.jsonl`. Na primeira execução falhou também um caso de PAP-31 (o do status 201), com um tempo de 7064464927279 ms, que é leitura de relógio, não demora; na segunda, só o de PAP-18, e o controle passou cinco vezes seguidas |
| Y6 | `plugin/hooks/usage.ts:85` | `name.includes(".jsonl")` | ✅ Morto, 1 falha: o caso da soma |
| W5 | `plugin/hooks/usage.ts:82` | Tira qualquer extensão | ✅ Morto, 4 falhas: os casos de `s1.txt`, `s1.JSONL`, `s1.json` e `s1.jsonld` |
| K15 | `plugin/hooks/usage.ts:85` | Só `agent-*.jsonl` | ✅ Morto, 2 falhas: o caso da soma e o dos pontos |
| Q1 | `plugin/hooks/usage.ts:82` | Tira sempre os 6 últimos caracteres | ✅ Morto, 2 falhas: os casos de `s1.JSONL` e de `s1-jsonl` |

#### Mutações novas

Nenhuma está nas tabelas das voltas 1 a 9 (as de `usage.ts` são W4 a W6, Y5, Y6, Y10, Z4, Z5, Z11, K9, K15, Q1 a Q7, R1 a R19 e U1 a U15). N1 a N6 e N20 são outras formas de `:82`; N7 a N11 e N21, de `:85`; N12 a N15, da lista e do principal; N16 a N19, dos caminhos de erro; N22, da chamada de `plugin/hooks/stop.ts:50`.

| Mutation | File:line at a7f81d6 | Description | Killed? |
| -------- | -------------------- | ----------- | ------- |
| N1 | `plugin/hooks/usage.ts:82` | `p.endsWith(".jsonl") ? p.slice(0, -6) : p` | ➖ Equivalente: sem a flag `m`, o `$` de uma regex de JS só casa no fim do texto, e então `/\.jsonl$/` casa onde `endsWith(".jsonl")` é verdadeiro e tira os mesmos 6 caracteres. Sonda com cinco formas, abaixo |
| N2 | `plugin/hooks/usage.ts:82` | `transcriptPath.trim().replace(/\.jsonl$/, "")` | ❌ Sobreviveu (63 pass, 0 fail) |
| N3 | `plugin/hooks/usage.ts:82` | `/(\.jsonl)+$/`: todos os `.jsonl` do fim saem | ✅ Morto, 1 falha: o caso de `s1.jsonl.jsonl` |
| N4 | `plugin/hooks/usage.ts:82` | `/\.jsonl\b/` | ✅ Morto, 1 falha: o caso de `logs.jsonl.d/s1.jsonl` |
| N5 | `plugin/hooks/usage.ts:82` | `/\.jsonl[^/]*$/`: o `.jsonl` e o resto do nome saem | ✅ Morto, 3 falhas: `s1.jsonl.jsonl`, `s1.jsonl.bak` e `s1.jsonld` |
| N6 | `plugin/hooks/usage.ts:82` | `/\.?jsonl$/`: o ponto opcional | ❌ Sobreviveu (63 pass, 0 fail) |
| N7 | `plugin/hooks/usage.ts:10`, `:85` | `name.endsWith(".jsonl") && name !== basename(transcriptPath)` | ❌ Sobreviveu (63 pass, 0 fail) |
| N8 | `plugin/hooks/usage.ts:85` | `name.trim().endsWith(".jsonl")` | ❌ Sobreviveu (63 pass, 0 fail) |
| N9 | `plugin/hooks/usage.ts:85` | `name.lastIndexOf(".jsonl") === name.length - 6`: um nome de 5 caracteres conta | ✅ Morto, 1 falha: o caso da soma, pelo nome `jsonl` |
| N10 | `plugin/hooks/usage.ts:85` | `name.split(".")[1] === "jsonl"` | ✅ Morto, 2 falhas: o caso da soma e o dos pontos |
| N11 | `plugin/hooks/usage.ts:85` | O filtro tira um nome com outro `.jsonl` antes do fim | ✅ Morto, 1 falha: o caso dos pontos, por `agent-j.jsonl.jsonl` |
| N12 | `plugin/hooks/usage.ts:89` | `for (const name of names.slice(0, 3))`: no máximo três arquivos | ❌ Sobreviveu (63 pass, 0 fail) |
| N13 | `plugin/hooks/usage.ts:85` | `.sort((a, b) => (a.slice(0, -6) < b.slice(0, -6) ? -1 : 1))`: a ordem pelo nome sem a extensão | ⚠ Vive (63 pass) só numa ordem que a spec não decide: lacuna de precisão |
| N14 | `plugin/hooks/usage.ts:96` | `usageOf([...new Set(transcripts)])`: textos iguais contam uma vez | ❌ Sobreviveu (63 pass, 0 fail) |
| N15 | `plugin/hooks/usage.ts:81`–`:82` | `if (Object.keys(usageOf(transcripts)).length === 0) return {}` antes dos subagentes | ❌ Sobreviveu (63 pass, 0 fail) |
| N16 | `plugin/hooks/usage.ts:86` | O `catch` do `readdirSync` relança o que não é `ENOENT`, `ENOTDIR` nem `EACCES` | ❌ Sobreviveu (63 pass, 0 fail) |
| N17 | `plugin/hooks/usage.ts:92` | O `catch` da leitura relança o que não é `EISDIR`, `ENOENT` nem `EACCES` | ❌ Sobreviveu (63 pass, 0 fail) |
| N18 | `plugin/hooks/usage.ts:86` | O `catch` do `readdirSync` dá `return {}` no que não é `ENOENT` | ✅ Morto, 8 falhas: o caso das permissões, o do `subagents` arquivo e os seis do laço de `:296` |
| N19 | `plugin/hooks/usage.ts:92` | Um arquivo ilegível descarta os subagentes lidos antes dele (`transcripts.length = 1`) | ✅ Morto, 2 falhas: o caso do ilegível e o das permissões |
| N20 | `plugin/hooks/usage.ts:82` | `/\.jsonl$/m` | ❌ Sobreviveu (63 pass, 0 fail) |
| N21 | `plugin/hooks/usage.ts:85` | `/\.jsonl$/m.test(name)` | ❌ Sobreviveu (63 pass, 0 fail) |
| N22 | `plugin/hooks/stop.ts:17`, `:50` | O hook lê só o principal: `usageOf([readFileSync(...)])` no lugar de `sessionUsage` | ✅ Morto, 11 falhas. Primeiro: `PAP-23: the log gains one usage per model, in ascending order of the model, with the sums and the session_id of the payload` |

**Sensor depth**: 23 reinjeções e 22 mutações novas, 21 em `plugin/hooks/usage.ts` (`:82`, `:83` a `:96`, com os imports de `:9` e `:10`) e 1 em `plugin/hooks/stop.ts:50`, só no Linux
**Sensor result**: 23 de 23 reinjetados mortos. Dos 22 novos, 9 mortos, 1 equivalente, 1 vivo numa ordem que a spec não decide e 11 sobreviventes. FAIL

#### As sondas

Cada sonda roda o original e o mutante com a mesma entrada, fora da cópia das mutações (`probe.txt`; os números são o `input` de `claude-opus`, ou de `claude-haiku` onde dito, e os quatro campos andam juntos).

| Mutante | Entrada | Original | Mutante | Julgamento |
| ------- | ------- | -------- | ------- | ---------- |
| N1 | `s1.jsonl`, `s1.JSONL`, `s1.jsonl.bak`, `"s1.jsonl\n"` e `s1-jsonl`, cada um com `s1/subagents` | igual ao mutante nos cinco | igual | Equivalente |
| N2 | `"s1.jsonl "` (1, com espaço no fim) e `s1/subagents/agent-a.jsonl` (100) | 1 | 101 | Sobrevivente: `"s1.jsonl "` não tem a extensão `.jsonl`; os subagentes dele seriam os de `"s1.jsonl "/subagents` (`spec.md:106`). Com `s1.jsonl`, os dois dão 101 |
| N6 | `s1jsonl` (1) com `s1/subagents/agent-a.jsonl` (100); e `s1-jsonl` | 1; 1 | 101; 1 | Sobrevivente: `s1jsonl` não tem a extensão `.jsonl`. O laço de `:296` tem `s1-jsonl`, que mata U3 e não este |
| N7 | `s1.jsonl` (1) com `s1/subagents/s1.jsonl` (100) | 101 | 1 | Sobrevivente: `s1.jsonl` de `subagents` é um `*.jsonl` de `subagents` e conta (PAP-18, `spec.md:106`) |
| N8 | `s1.jsonl` (1) com `subagents/"agent-k.jsonl "` (9000) | 1 | 9001 | Sobrevivente: `"agent-k.jsonl "` não é `*.jsonl` |
| N12 | `s1.jsonl` (1) com `agent-a` a `agent-d.jsonl`, 100 cada | 401 | 301 | Sobrevivente: todo `*.jsonl` de `subagents` conta. Os casos que mais têm arquivos que contam têm três (`:172`, `:208`, `:270`) |
| N13 | `agent-a.jsonl` (haiku 1) e `agent-a-2.jsonl` (haiku 70), mesmo id | haiku 1 | haiku 70 | Fora do que a spec decide: com a extensão, `agent-a-2.jsonl` vem antes (`-` antes de `.`); sem ela, `agent-a` vem antes. A spec não fala de ordem entre arquivos, e `design.md:117` diz "em ordem de nome" sem dizer se o nome tem a extensão. Com `agent-a`, `agent-b`, `agent-c`, os dois dão 1 |
| N14 | `s1.jsonl` (1) com `agent-a.jsonl` e `agent-b.jsonl`, cada um com a mesma linha sem `message.id` (100) | 201 | 101 | Sobrevivente: uma linha contada sem `message.id` é contada sozinha (PAP-15), e as linhas de cada arquivo somam (PAP-18). Com a mesma linha com id, os dois dão 101 |
| N15 | Principal só com uma linha `user`, e `agent-a.jsonl` (100); e principal vazio, com o mesmo | 100; 100 | `{}`; `{}` | Sobrevivente: o principal existe e é lido, então PAP-19 não vale, e PAP-18 soma as linhas dos subagentes às dele, que são nenhuma. No hook, o `usage` de opus 100 viraria o `unknown` com 0 de PAP-24 |
| N16 | `s1.jsonl` (1) com `s1/subagents` que é um link para si mesmo | 1 | lança `ELOOP` | Sobrevivente: um `subagents` que não pode ser listado não tem arquivo que conte, e o cálculo dá o principal, como U8 na volta 9. Lançar derruba `stop.ts:50`, que sai com 1 sem `usage` (PAP-23, PAP-24) |
| N16 | `subagents` em `0o000` com `agent-a.jsonl` (100) | 1 | 1 | Igual: `EACCES` está na lista |
| N17 | `agent-l.jsonl` que é um link para si mesmo, e `agent-b.jsonl` (haiku 5) | opus 1, haiku 5 | lança `ELOOP` | Sobrevivente: `agent-l.jsonl` não pode ser lido, não conta, e os outros contam (PAP-18, a letra do critério). Lançar derruba `stop.ts:50` |
| N17 | `agent-y.jsonl` em `0o000` e `agent-b.jsonl` (haiku 5) | opus 1, haiku 5 | opus 1, haiku 5 | Igual |
| N20 | `"s1.jsonl\nx"` (1) com `"s1\nx/subagents/agent-a.jsonl"` (100) | 1 | 101 | Sobrevivente: `"s1.jsonl\nx"` não tem a extensão `.jsonl`. Com a flag `m`, o `$` casa antes do `\n`. No Linux o nome é válido; no Windows não |
| N21 | `s1.jsonl` (1) com `subagents/"agent-k.jsonl\nx"` (9000) | 1 | 9001 | Sobrevivente: `"agent-k.jsonl\nx"` não é `*.jsonl` |

Que lançar em `sessionUsage` derruba o hook foi conferido na volta 9: `plugin/hooks/stop.ts:50` chama `sessionUsage` sem `try`, e um módulo do hook que lança depois de um `await` no nível de cima faz `bun` sair com 1, antes das chamadas de `/usage` de `:52`–`:56`.

### Gate na cópia

- `bun node_modules/typescript/bin/tsc --noEmit`: código 0.
- `bun test test/unit`: 2249 pass, 1 skip, 0 fail, 657801 asserções, 77 arquivos, 52,49 s. O skip é `test/unit/tui-loop.test.ts:1015` (QST-99, só com `SQUAD_TEST_FULL`), fora da fatia; o de `test/unit/hook-usage.test.ts:241` não pula aqui. Oito testes a mais que na volta 9: 13 casos entram e 5 saem em `hook-usage.test.ts`.
- Os dois arquivos da camada sem mutação: 63 pass, 0 fail, 161 asserções.
- A suíte inteira, e qualquer coisa no Windows, é do orquestrador; esta volta não as rodou. O Done when da T53 e da T54 pede U1 a U5, U8 e U12 mortos também no Windows: não conferido aqui.

### Lacunas de precisão

- **O nome comparado na ordem (N13)**: `design.md:117` diz "em ordem de nome", e o código compara o nome inteiro, com a extensão. Se a ordem fica no design, dizer "o nome do arquivo, com a extensão, por unidade de código" e testar com `agent-a.jsonl` e `agent-a-2.jsonl` fecha esta lacuna e a de U6. Não entra no veredito.
- **Link simbólico em `subagents` (R18)**, **nome que começa com ponto (U7)**, **o nome que é só `.jsonl` (U11, Q4, Q6)** e **a ordem por localidade (U6)**: como estavam.

### Correções propostas

Só de teste. Nenhuma pede mudança de produção.

- **Fix 24 (PAP-18, N2, N6, N7, N8, N12, N14, N15, N16, N17, N20 e N21)**: em `test/unit/hook-usage.test.ts`:
  1. no laço de `:296`, `s1jsonl` (mata N6); e, num laço só fora do Windows, que não aceita esses nomes, `"s1.jsonl "` e `"s1.jsonl\nx"`, cada um com o `s1/subagents` (100) e, para o segundo, também `"s1\nx/subagents"` (100), em que só o principal conta, 1 em cada campo (matam N2 e N20);
  2. na lista de `:184`, fora do Windows, `"agent-k.jsonl "` e `"agent-k.jsonl\nx"`, com 9000 (matam N8 e N21); o `expect` de `:196` não muda;
  3. no caso dos pontos de `:270`, um `s1.jsonl` dentro de `subagents`, o nome do principal, que conta (mata N7), e arquivos que contam até passar de três, por exemplo `agent-0.jsonl` a `agent-9.jsonl` com 100 cada, com o `toEqual` refeito (mata N12 e qualquer teto abaixo de dez);
  4. um caso com dois arquivos de `subagents` de texto igual, uma linha contada sem `message.id`, em que os dois contam (mata N14);
  5. um caso com o principal só com a linha `USER`, e outro com o principal vazio, cada um com `agent-a.jsonl` de 100, em que o subagente conta, 100 em cada campo (mata N15);
  6. no caso do ilegível, um `agent-l.jsonl` que é link para si mesmo, e um caso com `s1/subagents` que é link para si mesmo, em que os outros contam e nada lança (matam N16 e N17), com o skip de link de `test/unit/launch-worktree.test.ts:315` onde o link não puder ser criado.

  Done when: N2, N6, N7, N8, N12, N14, N15, N16, N17, N20 e N21 morrem no Linux, N6, N7, N12, N14, N15, N16 e N17 também no Windows, e os 23 reinjetados desta volta seguem mortos.

Sobre o caminho: é a sétima volta seguida em PAP-18, e nenhuma achou defeito de produção. As listas da T54 fecharam as formas que as voltas 4 a 9 acharam, mas uma lista só tem o que se pôs nela, e a forma vizinha ficou de fora: `s1-jsonl` está e `s1jsonl` não; letras depois de `.jsonl` estão, espaço e `\n` não. Uma forma de parar essa parte é gerar os nomes, prefixo × separador × `jsonl` em cada caixa × sufixo (vazio, letra, espaço, `\n`, `.bak`, `.jsonl`), e comparar cada um com o que a definição de `spec.md:106` diz dele, num laço só para `:82` e outro para `:85`. Os caminhos de erro são de outra natureza: N16 e N17 deixam passar exatamente os códigos que os casos fazem, e qualquer lista fixa tem a próxima; o link para si mesmo mata estes dois, e um caso que faz `readdirSync` e `readFileSync` lançarem um código qualquer, por exemplo `EIO`, com o `node:fs` substituído só nesse caso, mataria a classe inteira. N12, N14 e N15 são da lista e do principal, que nenhuma volta antes testou. Aplicar o Fix 24 e reverificar, ou aceitar PAP-18 com esses mutantes registrados, é decisão do dev, como foi na volta 3; o laço de correção e reverificação desta fatia já passou das três voltas que a skill dá antes de levar ao dev.

### Requirement Traceability Update

Não editei `spec.md`. O que o orquestrador deve gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAP-18 | Implementing: Fix 23 de `validation.md` aplicado inteiro na T53 (U8, U9 e U13) e na T54 (U1 a U5 e U12, com os casos de um nome trocados por listas de nomes), à espera da décima volta | ❌ Needs Fix (Fix 24): U8 morre em `test/unit/hook-usage.test.ts:252`–`:268`, U9 e U13 em `:245`, U2 e U12 em `:191`–`:192`, U4 em `:272`, U1 e U3 em `:296`, U5 em `:283`–`:284`; R1, R2, R4, R17, R5, Q2, Q5, Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos; N2, N6 e N20 (`plugin/hooks/usage.ts:82`: `"s1.jsonl "`, `s1jsonl` e `"s1.jsonl\nx"`), N7, N8 e N21 (`:85`: `subagents/s1.jsonl`, `"agent-k.jsonl "` e `"agent-k.jsonl\nx"`), N12 (`:89`: um teto de três arquivos), N14 (`:96`: textos iguais uma vez), N15 (`:81`–`:82`: o principal que não conta nada dá `{}`) e N16 e N17 (`:86`, `:92`: um link para si mesmo faz `sessionUsage` lançar `ELOOP`) sobrevivem |

A linha de cobertura de `spec.md:446` segue com 74 `Verified` e 1 `Needs Fix`.

Para quando PAP-18 passar: `scripts/validate_state.py` junta, do arquivo inteiro, a linha do resultado do topo e a linha do resultado do sensor de cada volta (`_verdict`, `:52`–`:71`), e as das voltas 1 a 10 dizem FAIL. Com o veredito do topo aprovado, ele leria os dois juntos e daria o veredito por não preenchido. Quem gravar a aprovação precisa tirar o FAIL dessas linhas das voltas passadas, ou mover o histórico para outro arquivo.

### Lições registradas

Pelo `scripts/lessons.py`:

- N2 e N8 somados a L-080 (confirmada), o `trim()` que muda o nome antes da regra do sufixo, com o mesmo texto. Não penalizei L-080: não há como mostrar que ela foi carregada na T53 e na T54.
- N6, N20 e N21 somados a L-103, o ponto e a âncora do fim, com o mesmo texto.
- L-115: uma entrada com o nome do arquivo a que o diretório pertence, para que um filtro que tira esse nome falhe (N7).
- L-116: mais arquivos do que qualquer outro caso lê, para que um teto falhe (N12).
- L-117: dois arquivos de texto igual numa soma, para que tirar textos repetidos falhe (N14).
- L-118: os arquivos ao lado do principal somam também quando o principal não conta nada (N15).
- L-119: o ilegível com um código de erro que os outros casos não fazem, como um link em laço, para que uma lista de códigos falhe (N16, N17).
- L-120 (lacuna de precisão): dizer se a extensão faz parte do nome comparado na ordem, e testar com um nome que é prefixo do outro (N13).
