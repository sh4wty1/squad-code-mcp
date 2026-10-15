# Gate Validation

**Date**: 2026-10-14
**Round**: Volta 1 (abaixo), Volta 2 e Volta 3 (no fim do arquivo)
**Spec**: `.specs/features/gate/spec.md`
**Diff range**: `3922651..fed6607` (branch `feat/gate`). O código (`broker/`, `plugin/`) foi verificado em `a6a96a8`; `fed6607` só acrescenta `.specs/` (o marco do MVP, T29), e `git diff --stat a6a96a8..fed6607` não toca `broker/` nem `plugin/`
**Verifier**: independent sub-agent (author ≠ verifier), em duas cópias físicas (`git clone` + `bun install --frozen-lockfile`) em `a6a96a8`, Bun 1.3.14, Windows 11

**Overall**: ❌ FAIL (volta 3, em `be4118d`, a última antes de escalar ao dev: N02 e N09 da volta 2 morreram, mas seis mutantes novos sobrevivem à suíte inteira, V15 em GAT-50, V18 em GAT-65, V10 em GAT-70/71, V23 em GAT-61, V28 em GAT-47 e V27 em GAT-43; ver "Volta 3")

Volta 1 — cinco mutantes sobrevivem à suíte inteira (`bun test`, 96 arquivos), todos de desenho ou de clique da TUI, nenhum do broker. Cada um é um caso que a spec decide e nenhum teste monta:

1. `broker/tui/screens/permission.ts:47`, `answered ? [] : squad.permissions` → `squad.permissions`. Um pedido respondido no terminal com outros dois pedidos abertos ganha a linha `fila` (sem `▶`) e a etiqueta ` pedido 0 de 2 ` em vez de ` resolvido no terminal `. Contra GAT-71 ("sem fila") e GAT-61. Os testes de GAT-71 (`TP:61`, `PK:177`, `PK:229`) usam o frame 14, com um pedido só.
2. `broker/tui/screens/gate.ts:27`, `t.planned && !t.dropped` → `t.planned`. A linha `feature` conta os tickets descartados. Contra GAT-43. Nenhum teste do modal de gate tem ticket descartado no `plan` (`TG:198` só muda para 1 ticket e o número de reworks).
3. `broker/tui/screens/gate.ts:42`, `q.merged_into !== null && q.answered_by === null` → `q.merged_into !== null`. Uma pergunta mesclada que teve resposta própria conta duas vezes: em `▶ <s> mesclada` e no seu `resolved_by`. Contra GAT-44. `TG:208` e os frames só têm mesclada sem resposta própria.
4. `broker/tui/mouse.ts:139`, `a < 0 || b < 0 ? []` → `a < 0 ? []`. Um clique num item da fila que já saiu dela (decidido depois do último desenho) anda `[` até o primeiro da fila em vez de não fazer nada. Contra a linha "Clique num item da fila que já saiu dela" das Assumptions e GAT-83. Os testes de GAT-83 (`MG:235`, `MG:255`) só clicam itens que ainda estão na fila.
5. `broker/gate.ts:71`, o `hint` de `gate_closed` trocado por `G-01 is approved.`, sem mandar pedir um gate novo. Contra GAT-13 ("com um `hint` que manda pedir um gate novo"). `GR:354` só confere que o `hint` é texto não vazio (pelo `refusedWith` de `helpers.ts:232`).

Dois mutantes a mais sobrevivem e não contam: o S10 é equivalente (o filtro `!q.open` é redundante: uma pergunta aberta não tem `resolved_by` nem `merged_into`) e o S04 só muda o desempate do corte de GAT-93, que a spec não decide (lacuna de precisão abaixo).

O broker está sólido: as 31 mutações de `gate.ts`, `feature.ts`, `log.ts` e `derive.ts` morreram, e todas as do caminho que escreve como o humano (colagem, `a` travado, `y` fora da confirmação, segundo `POST` em curso, rota do `post`, corpo do escritor) morreram. A suíte passa: `tsc` 0, 2431 pass, 5 skip, 0 fail.

---

## Task Completion

Conferido em `tasks.md` em `fed6607`: T1 a T29 com todos os itens `- [x]`; T30 (fechamento: `ROADMAP.md`, Handoff, traceability) com `- [ ]`, que é o passo do orquestrador depois desta validação.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 a T28 | ✅ Done | - |
| T29 | ✅ Done | `fed6607`, `marco-mvp.md`: conferido com quatro sessões `haiku` sobre `a6a96a8`. Não é teste automatizado; não entra no sensor |
| T30 | ⏳ Aberta | Fechamento, depois da validação |

---

## Spec-Anchored Acceptance Criteria

Caminhos relativos a `broker/test/`. `GR` = `unit/gate-request.test.ts`, `GD` = `unit/gate-decision.test.ts`, `GP` = `unit/gate-replay.test.ts`, `FC` = `unit/feature-close.test.ts`, `DG` = `unit/derive-gate.test.ts`, `DB` = `unit/db.test.ts`, `IG` = `integration/gate.test.ts`, `E2E` = `integration/gate-e2e.test.ts`, `ST` = `integration/server-tools.test.ts`, `TO` = `unit/tools.test.ts`, `LA` = `unit/launch-args.test.ts`, `SK` = `unit/skills.test.ts`, `TG` = `unit/tui-gate.test.ts`, `TK` = `unit/tui-gate-keys.test.ts`, `TL` = `unit/tui-gate-loop.test.ts`, `TP` = `unit/tui-permission.test.ts`, `PK` = `unit/tui-permission-keys.test.ts`, `MG` = `unit/tui-mouse-gate.test.ts`, `F` = `unit/tui-frames.test.ts`, `MO` = `unit/tui-modal.test.ts`, `W` = `unit/tui-writer.test.ts`, `H` = `unit/tui-hits.test.ts`, `MH` = `unit/tui-mouse-help.test.ts`, `KY` = `unit/tui-keys.test.ts`, `LO` = `unit/tui-loop.test.ts`, `MS` = `unit/tui-mouse.test.ts`. `refusedWith` (`unit/helpers.ts:228`) confere o `refused` campo a campo (`peer`, `attempted_kind`, `error`), nenhuma entrega e o log sem outro evento.

### Pedir e reemitir (GAT-01 a GAT-14)

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-01 | Linha com id = max+1, `feature_id`, `mother`, `scope`, `commit` ou nulo, `pending`, `request_seq`, `decision_seq` nulo; `{ ok, gate_id, seq }` | `GR:69` `toEqual({ ok: true, gate_id: 1, seq: 2 })`, `GR:70` `gateRows()).toEqual([gateRow(1, …)])` (8 campos); `GR:77` commit nulo; `GR:87`/`GR:90` id 8 sobre o buraco 7 e 9 na feature seguinte; `DB:6` colunas | ✅ PASS |
| GAT-02 | `gate` de `mother` a `human`, `body` vazio, `ticket_ref` nulo, coluna `gate_id`, `data` só com os campos, sem entrega | `GR:112` evento inteiro (`storedGate`) com campos estranhos no corpo ignorados; `GR:118` `body`, `ticket_ref`, `diffstat`; `GR:131` sem `commit`; `GR:138` `deliveries()).toEqual(toOthers(1))`; `IG:68` pela rota | ✅ PASS |
| GAT-03 | `missing_field` para obrigatório ausente/nulo/número/vazio, `body` não texto, opcional nulo/número/vazio, `gate_id` não inteiro, `delivery` sem `commit` | `GR:149` (4×4 casos), `GR:163`, `GR:180` (3×3), `GR:191`, `GR:200`; `GR:170` `body` vazio aceito | ✅ PASS |
| GAT-04 | `invalid_field` para `scope` fora e `summary` > 80; 80 aceito | `GR:205`; `GR:211` 81 recusado, `GR:212`-`GR:213` 80 aceito e gravado | ✅ PASS |
| GAT-05 | `edge_not_allowed` fora da mother; `no_open_feature` | `GR:218` leader, worker, judge; `GR:223`; `IG:130` pela rota | ✅ PASS |
| GAT-06 | `tickets_open` com hint que nomeia os tickets; sem `plan` aceito; `action` não vale | `GR:247` `filter(…).toEqual(["C", "D", "E"])` (só os abertos); `GR:254`; `GR:267` só o plano mais recente; `GR:271`; `GR:277` | ✅ PASS |
| GAT-07 | Ordem `unknown_peer` … `tickets_open` | Pares vizinhos `GR:283`, `GR:287`, `GR:291`, `GR:295`, `GR:304`, `GR:311`; `unknown_peer` `IG:119` com `snapshot` igual | ✅ PASS |
| GAT-08 | `refused` com `peer`, `attempted_kind` `gate`, `error`; nada mais | `refusedGate` (`GR:60`) → `helpers.ts:234` evento inteiro + `GR:63` `gates` igual; `IG:133` | ✅ PASS |
| GAT-09 | `gate_id` inteiro que não é de gate da feature aberta → `invalid_field` | `GR:317` (0, 2, 99); `GR:326` gate de outra feature | ✅ PASS |
| GAT-10 | Falha na linha, no evento ou na entrega: nada gravado | `GR:384`-`GR:386`, `GR:394`-`GR:396`; `GD:276`-`GD:278`, `GD:286`-`GD:289`; `FC:325` | ✅ PASS |
| GAT-11 | `/send` `gate`/`gate_decision` → `invalid_kind`, hint com a rota | `IG:165`-`IG:171` `toContain("/gate")`, `not.toContain("/gate-decision")`, `toContain("/gate-decision")` | ✅ PASS |
| GAT-12 | Reemissão: evento com o mesmo `gate_id`, linha com `scope`, `commit`, `request_seq` novos | `GR:334` `{ ok, gate_id: 1, seq: 3 }`; `GR:335` evento inteiro; `GR:342` linha; `GR:350` `action` sem commit | ✅ PASS |
| GAT-13 | Gate decidido → `gate_closed`, **hint que manda pedir um gate novo**, linha igual | `GR:358`-`GR:359` erro e linha. **O conteúdo do hint não é afirmado** (só "texto não vazio", `helpers.ts:233`) — o mutante G19 sobrevive | ❌ GAP |
| GAT-14 | Reemissão segue GAT-03 a GAT-06 | `GR:368` `tickets_open` + `GR:369` hint com `C`; `GR:376`-`GR:377`; `GP:181` (200 sequências passam por `reissue tickets_open`, `reissue invalid_field`, `reissue gate_closed`) | ✅ PASS |

### Decidir e encerrar (GAT-15 a GAT-29)

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-15 | `gate_decision` de `human` ao `requested_by`, `data` com `gate_id`, `decision`, `text` quando enviado; linha `approved` com `decision_seq`; `{ ok, seq }` | `GD:82` `toEqual({ ok: true, seq: 3 })`; `GD:83` evento inteiro (campos estranhos ignorados); `GD:84` linha; `GD:90`, `GD:98` texto e texto vazio | ✅ PASS |
| GAT-16 | `reject` → `rejected` com `decision_seq` | `GD:104`-`GD:112` | ✅ PASS |
| GAT-17 | `comment` não muda a linha | `GD:117`-`GD:125` `gateRows()).toEqual([gateRow()])`; `GD:237`-`GD:240` | ✅ PASS |
| GAT-18 | Entrega pendente ao `requested_by` nas três decisões | `GD:136` `toEqual([...toOthers(1), { event_seq: 3, recipient: "mother", acked_at: null }])` × 3 | ✅ PASS |
| GAT-19 | `G-NN aprovado` / `rejeitado: <t>` / `comentado: <t>`, corte em 80, `body` = `text` | `GD:83`, `GD:107`, `GD:120`; `GD:145`-`GD:151` exatamente 80 e corte; `GD:158` `G-12` | ✅ PASS |
| GAT-20 | Credencial errada → `invalid_token`, nada gravado, nenhum `refused` | `refusedDecision` (`GD:56`): `GD:61` erro, `GD:63`-`GD:65` log, entregas e `gates` iguais; `GD:170` três casos; `IG:146`-`IG:159` pela rota com `snapshot` | ✅ PASS |
| GAT-21 | `missing_field` (tipos e texto obrigatório) | `GD:188` (9 casos), `GD:202` (2×4) | ✅ PASS |
| GAT-22 | `invalid_field` (decisão fora, gate inexistente) | `GD:209` (inclui `""`), `GD:215` | ✅ PASS |
| GAT-23 | Gate não pendente → `gate_closed`, nas três | `GD:221`-`GD:223`, `GD:231`, `GD:252` (feature fechada nos dois `outcome`) | ✅ PASS |
| GAT-24 | No máximo um `approve`/`reject` | `GD:225` `toHaveLength(1)`; `GP:162` em 200×40 passos | ✅ PASS |
| GAT-25 | Ordem `invalid_token`, `missing_field`, `invalid_field`, `gate_closed` | `GD:258`, `GD:262`-`GD:263`, `GD:269`; `IG:156` | ✅ PASS |
| GAT-26 | `delivered` sem `delivery` aprovado → `gate_required`, `refused` `feature_closed`, feature aberta; `action` não basta | `FC:244`-`FC:245`; `FC:254`-`FC:255` (pendente, comentado, rejeitado, só `action`); `FC:263`; `IG:63`; `E2E:67`-`E2E:68` | ✅ PASS |
| GAT-27 | Com `delivery` aprovado, ou `abandoned`, fecha | `FC:276`-`FC:277`; `FC:283`-`FC:284`; `IG:107`; `E2E:117` | ✅ PASS |
| GAT-28 | `feature_closed` rejeita os pendentes com `decision_seq` nulo, sem evento | `FC:302`-`FC:309` linhas antes e depois, `FC:310`-`FC:311` só o `feature_closed`; `FC:322` outra feature intacta | ✅ PASS |
| GAT-29 | Ordem `edge_not_allowed` … `gate_required` | `FC:337`-`FC:339`, `FC:344`-`FC:345`, `FC:350`-`FC:351` | ✅ PASS |

### Paridade, tool e skill (GAT-30 a GAT-39)

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-30 | `gates()` = linhas de `gates` (7 campos) depois de qualquer sequência | `GP:59` `expect(derived…).toEqual(stored)` a cada passo de 200 sequências de 40 chamadas; `GP:187`/`GP:205` todas as rotas e recusas exercitadas; `DG:137`, `DG:144` | ✅ PASS |
| GAT-31 | `version`, campos da versão atual, `first_ts`/`ts`, `previous`, último `comment`, `text` da decisão | `DG:86`, `DG:90`-`DG:91`, `DG:96`-`DG:99`, `DG:103`-`DG:108`, `DG:113`, `DG:126` (`text` nulo) — objetos inteiros (`pendingAt`) | ✅ PASS |
| GAT-32 | Pendente de feature fechada = `rejected` sem `decision_seq` | `DG:155` (dois `outcome`); `DG:163` | ✅ PASS |
| GAT-33 | `pending` só para `pending`; frames de leitura iguais | `DG:171`, `DG:176`; os 47 frames de `F:37` (TUI-43, QST-*) | ✅ PASS |
| GAT-34 | Tool `gate` só da mother, 4 obrigatórios, 5 opcionais, chama `/gate` | `TO:15`, `TO:103`, `TO:109`-`TO:118`; `ST:57` sessão real lista e os outros papéis recebem `Unknown tool` | ✅ PASS |
| GAT-35 | `mcp__plugin_squad_squad__gate` só na lista da mother | `LA:183`-`LA:185` (linux e win32) | ✅ PASS |
| GAT-36 | `gate_decision` empurrado e confirmado depois | `ST:281`-`ST:284` `meta` e conteúdo; `ST:290` `acked_at` | ✅ PASS |
| GAT-37 | Sem a linha do AD-020; seções mandam usar `gate` `delivery`/`action` | `SK:305` via `GAT_SAYS` (`SK:77`); `SK:524`-`SK:528` (falha se a linha volta); `SK:529` frase movida falha; `SK:533` `ask`/`escalate` falham | ✅ PASS |
| GAT-38 | Depois de `approve`, `reject`, `comment`; ação de agente | `SK:309` com as 5 frases de `SK:84`-`SK:90`; resposta da tool `ST:266` `toBe("Gate 1 requested with seq 3.")` | ✅ PASS |
| GAT-39 | `close_feature` `delivered` depois da entrega, `body`; nenhuma outra skill cita `gate` | `SK:313`, `SK:317`; `SK:541`-`SK:548` | ✅ PASS |

### Modal de gate (GAT-40 a GAT-59)

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-40 | `g` abre o mais antigo na tela principal; `nenhum gate pendente` 4 s; `broker desconectado · gate desabilitado` 4 s | `TK:49` de cada tela; `TK:57` `toast: { text: "nenhum gate pendente", color: "gray", until: now + 4000 }`; `TK:64`; `TK:79` versão atual; `LO:256`; `E2E:110` | ✅ PASS |
| GAT-41 | 80 colunas da 20, centrada, nunca acima da linha 2, título, `· atualizado`, ` gate n de N ` | `MO:8`-`MO:12`, `MO:19`-`MO:22`, `MO:27`; `TG:68` `[9, 29]`; `TG:147`; `TG:225` | ✅ PASS |
| GAT-42 | Cabeça v1/v2, `fila` com `▶`, linhas de ação, efeito, feature, perguntas | `TG:52` caixa inteira; `TG:148`, `TG:164`; `TG:226` | ✅ PASS |
| GAT-43 | Tickets do `plan` **não descartados**, reworks, minutos para baixo, custo; plural | `TG:201`, `TG:204`, `TG:205`; `TG:44`. **Nenhum ticket descartado em teste algum** — o mutante S05 sobrevive | ❌ GAP |
| GAT-44 | `<s>` = mescladas **sem resposta própria**; as outras pelo `resolved_by`; abertas fora | `TG:45`, `TG:213`; `F:184` (D1). **Nenhuma mesclada com resposta própria** — o mutante S07 sobrevive | ❌ GAP |
| GAT-45 | v1 `resumo` + `body` em 74; v2 `seu comentário` + `o que a mother mudou` | `TG:52`, `TG:224`-`TG:244`, `TG:249`, `TG:251`; `TG:168` sem `body` | ✅ PASS |
| GAT-46 | `diff stat` linha a linha com `   ~ mudou`; `diff      <última>` fora da leitura | `TG:235`-`TG:238` (mudou só em `a.ts`; `c.ts` novo sem marca); `TG:84`, `TG:187` | ✅ PASS |
| GAT-47 | `judge` por ticket, `✓`/`✗` do último `verdict`, `a/c`; sem verdict nada; só `delivery` | `TG:62`, `TG:193`, `TG:195`, `TG:169` (`action` sem judge) | ✅ PASS |
| GAT-48 | Sempre a versão atual | `TG:224`; `TK:79`, `TK:100` | ✅ PASS |
| GAT-49 | Linha de teclas e rodapé, com fila ou sem | `TG:64`, `TG:69`, `TG:149`-`TG:150` | ✅ PASS |
| GAT-50 | `a`/`r`/`c`/`]`/`[`/`esc`; nenhuma outra tecla, nem `q`; `ctrl+c` sai | `TK:95`-`TK:100`, `TK:105`-`TK:106`, `TK:111`-`TK:112`, `TK:119`-`TK:126`; `MG:361` (`m`) | ✅ PASS |
| GAT-51 | Confirmação com separador, ação, efeito, `[y]`…, rodapé | `TG:80`-`TG:93` | ✅ PASS |
| GAT-52 | `y` envia `{ human_token, gate_id, decision: "approve" }`; `esc` volta | `TK:133`, `TK:138`-`TK:140`; `TL:105` corpo do `POST`; `E2E:113`-`E2E:115` | ✅ PASS |
| GAT-53 | Título do modo de texto, campo 3/7 linhas, últimas 5, aviso, rodapé `expandir`/`recolher` | `TG:102`-`TG:113`, `TG:121`-`TG:130` | ✅ PASS |
| GAT-54 | Texto: imprimível, `backspace`, `ctrl+u`, `ctrl+e`, `esc`; letras de comando, dígitos e `q` no texto | `TK:149`, `TK:155`-`TK:162`, `TK:167`; `MG:355`-`MG:357` | ✅ PASS |
| GAT-55 | `enter` envia `decision` do modo e `text` sem espaços das pontas | `TK:172`-`TK:176`; `TL:121`; `TL:253` | ✅ PASS |
| GAT-56 | Vazio: não envia, borda vermelha, `✗ motivo/comentário obrigatório · nada foi enviado` até a próxima tecla que muda o texto | `TK:183`-`TK:198`; `TG:137`-`TG:141` | ✅ PASS |
| GAT-57 | `ok` → fecha, verde 4 s com o texto de cada decisão | `TK:218` | ✅ PASS |
| GAT-58 | `gate_closed` → fecha, `✗ G-NN já decidido` vermelho; outra recusa/status/corpo/2000 ms → volta ao modo com o texto, `✗ decisão não enviada · <erro>` | `TK:224`; `TK:235` (4 erros × 3 modos); `W:128`, `W:158`-`W:171`; `W:181`-`W:185` 1999 ms nulo, 2000 ms `SILENT` | ✅ PASS |
| GAT-59 | Leitura com o gate fechado: fecha, descarta, `G-NN fechado` 4 s; versão nova tira da confirmação | `TK:257`, `TK:272`-`TK:279`, `TK:284`, `TK:286` | ✅ PASS |

### Modal de permissão (GAT-60 a GAT-71)

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-60 | `x` abre o mais antigo, prévia na linha 1; avisos de 4 s | `PK:62`, `PK:68`, `PK:80`, `PK:85`, `PK:90`; `LO:256`; `E2E:95` | ✅ PASS |
| GAT-61 | 82 colunas da 19, título `⚠ permissão P-NN · <curto> · <tool>`, ` pedido n de N ` **ou ` resolvido no terminal ` no estado de GAT-71** | `TP:39`, `TP:56`-`TP:57`, `TP:66`, `TP:90`, `TP:105`; `DG:203`, `DG:239`. A etiqueta de GAT-71 só com um pedido no log — ver GAT-71 | ✅ PASS (o caso com fila em GAT-71) |
| GAT-62 | Linhas do modal, `[blocked x]`, ticket / `— sem ticket` / `— sem feature aberta`, descrição cortada | `TP:38`-`TP:54`, `TP:107`, `TP:178`, `TP:180`-`TP:186` | ✅ PASS |
| GAT-63 | Prévia 76 colunas, 70 por linha, número em 3, `  · `, 8 linhas, borda com `a–b de N · ▼ mais abaixo` / `· fim` | `PK:47`-`PK:56`; `TP:114`-`TP:129`, `TP:140`-`TP:145`, `TP:158`-`TP:165`; `MO:39` | ✅ PASS |
| GAT-64 | Parte do estado, aviso de `a`, explicação em 76, rodapé com `(veja o fim)`, `j/k`, `G`, fila | `TP:50`-`TP:58`, `TP:130`-`TP:138`, `TP:146`-`TP:148`, `TP:159`, `TP:163` | ✅ PASS |
| GAT-65 | `j`/`↓`/`k`/`↑` sem passar das pontas, `G`, `]`/`[` com prévia no topo, `esc`; nenhuma outra tecla | `PK:105`-`PK:128`, `PK:134`-`PK:138`, `PK:165`-`PK:171`, `PK:103`-`PK:105` | ✅ PASS |
| GAT-66 | `a` com o fim à vista envia `allow`; sem ele nada | `PK:143`; `PK:150` (inclusive a linha antes do fim); `TL:137`; `E2E:97`-`E2E:105` | ✅ PASS |
| GAT-67 | `d` envia `deny` em qualquer posição | `PK:157`; `TL:137` | ✅ PASS |
| GAT-68 | `ok` → fecha, `✓ P-NN permitido`/`negado` verde 4 s | `PK:195`, `PK:198` | ✅ PASS |
| GAT-69 | `permission_closed` → estado de GAT-71; outra recusa → fica, vermelho | `PK:203`; `PK:208`; `W:143`, `W:181`-`W:185` | ✅ PASS |
| GAT-70 | Leitura com `permission_decision` de outro: fecha, `P-NN decidido` 4 s | `PK:226`; `PK:238`-`PK:240`; `DG:215` | ✅ PASS |
| GAT-71 | Fechado pelo peer: primeira linha, **sem fila**, status atual, prévia cinza, texto do estado, rodapé `esc fechar`, só `esc` | `TP:65`-`TP:85` com um pedido; `PK:180`-`PK:182`; `PK:231`. **Sem fila com outros pedidos abertos: nenhum teste** — o mutante P05 sobrevive | ❌ GAP |

### Teclado, mouse, frames e edge cases (GAT-72 a GAT-97)

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-72 | `POST` só para as três rotas, cada uma pela sua tecla | `TL:314`-`TL:319` (sessão inteira: só `GET /events` e os dois `POST`); `TL:105`, `TL:121`, `TL:137`; `W:115`, `W:128`, `W:143` | ✅ PASS |
| GAT-73 | Envio em curso: nenhum outro `POST`, nenhuma tecla muda o modal | `TK:249`; `PK:220`; `TL:188`-`TL:189`; `MG:346` | ✅ PASS |
| GAT-74 | Credencial lida no envio; sem ela não envia, volta, `✗ credencial humana não encontrada` | `TK:243`; `PK:215`; `TL:152`-`TL:157`, `TL:167`-`TL:171` | ✅ PASS |
| GAT-75 | Bloco colado não decide; no texto `\r`/`\n` viram espaço | `TK:300`, `TK:305`-`TK:307`, `TK:314`, `TK:320`-`TK:325`, `TK:333`-`TK:338`; `PK:254`-`PK:262`, `PK:268`, `PK:274`-`PK:277`; `TL:221`-`TL:238`, `TL:250`-`TL:253` | ✅ PASS |
| GAT-76 | Um modal por vez; `g`, `x`, `4`, `enter` só o que as regras dizem | `TK:85`-`TK:88`, `TK:111`; `PK:95`-`PK:99`, `PK:104` | ✅ PASS |
| GAT-77 | Broker sem responder: nenhuma tecla muda o modal, a não ser `ctrl+c` | `TK:345`-`TK:348`; `PK:283`-`PK:286` | ✅ PASS |
| GAT-78 | Terminal pequeno: só `q`/`ctrl+c`, modal volta com o estado | `TL:275`-`TL:287` | ✅ PASS |
| GAT-79 | Clique no selo = `g`/`x` | `H:845`-`H:847`; `MS:196`-`MS:200` | ✅ PASS |
| GAT-80 | Com modal, só os efeitos de GAT-81 a 84; roda nada | `MG:153`-`MG:154`, `MG:325`, `MG:331`, `MG:346` | ✅ PASS |
| GAT-81 | Clique fora da caixa = `esc` no modo | `MG:118`-`MG:127` (toda célula de 0 a 38 fora da caixa, quatro modos e os modais de permissão) | ✅ PASS |
| GAT-82 | Atalho da linha 39 = a tecla; `]`/`[`; `j/k` por letra | `MG:206`-`MG:207`, `MG:217`-`MG:222`, `MG:231`; `H:826`-`H:840` | ✅ PASS |
| GAT-83 | Item da fila: `]`/`[` tantas vezes; marcado nada; outra célula da caixa nada | `MG:138`-`MG:141`, `MG:245`-`MG:248`, `MG:266`-`MG:269`. **Item que já saiu da fila (Assumption): nenhum teste** — o mutante M06 sobrevive | ❌ GAP |
| GAT-84 | Clique < 500 ms: nada | `MG:287`-`MG:288` (499 ms), `MG:299`-`MG:300` (500 ms vale), `MG:308`-`MG:314` (600 vs 300 ms) | ✅ PASS |
| GAT-85 | 7 frames de gate, só D1/D2 | `F:41`-`F:42` (frames 08, 16a, 16b, 16c, 17, 18b, 19b); `F:178`-`F:186` | ✅ PASS |
| GAT-86 | 6 frames de permissão, D1/D2/D3 | `F:41`-`F:42` (22a, 22b, 22d, 22e, 22f, 29d); `F:189`-`F:199` | ✅ PASS |
| GAT-87 | Oito linhas da legenda onde o frame 11 as tem | `F:146`-`F:157`; `MH:18`-`MH:23` | ✅ PASS |
| GAT-88 | Nenhum desvio por tela por fazer; único D3 o de `✓ P-NN fechado no terminal`, nos frames 11 e 22b | `F:135`-`F:139`; `F:196`-`F:198` | ✅ PASS |
| GAT-89 | 13 arquivos = saída de `extract.ts`; 47 idênticos à `main` | Reextraído nesta volta: `bun test/frames/extract.ts "Squad TUI.dc.html"` do `Handoff-Design.zip` → 60 de 60 iguais (`diff --strip-trailing-cr`); `git diff --quiet 3922651 HEAD` nos 47 da `main` → idênticos | ✅ PASS |
| GAT-90 | `g`/`x` nunca avisam `chega com a fatia Gate` | `TK:57`, `TK:64`; `PK:85`, `PK:90`; `KY:115`-`KY:120` | ✅ PASS |
| GAT-91 | `⚠ 2 gates pendentes · g`; `g` o mais antigo; `? N` sem gates | `TK:69`; `H:114`-`H:117` (selo); linha 0 dos frames 19a/19b em `F:41` | ✅ PASS |
| GAT-92 | Decidido com outro pendente: fecha; `g` abre o que sobrou | `TK:74` | ✅ PASS |
| GAT-93 | Corta com `…`, quebra o `body`; corta `body`/`diffstat` do fim até caber | `TG:257`-`TG:260`; `TG:268`-`TG:270` | ✅ PASS (desempate: lacuna de precisão) |
| GAT-94 | Prévia vazia: `  1 `, fim à vista | `PK:47`; `TP:172`-`TP:174`; `PK:143` (`a` com `""`) | ✅ PASS |
| GAT-95 | Sem feature: abre com `— sem feature aberta` | `PK:73`; `TP:180`-`TP:186` | ✅ PASS |
| GAT-96 | Peer saiu: estado de GAT-71 com o `ts` do `peer_left` | `DG:228`; `PK:231` | ✅ PASS |
| GAT-97 | Feature fecha com o modal aberto: fecha como GAT-59 | `TK:265` (três modos) | ✅ PASS |

**Status**: ❌ 92 de 97 cobertos com o valor da spec; 5 lacunas (GAT-13, GAT-43, GAT-44, GAT-71, GAT-83 pela linha das Assumptions), cada uma com um mutante vivo.

### ⚠️ Spec-precision gaps

1. **GAT-93, desempate do corte.** A linha "Ordem do corte de GAT-93" diz "de quem tiver mais linhas entre o `body` e o `diffstat`", sem dizer quem cede no empate. O código (`broker/tui/screens/gate.ts:163`, `>=`) corta o `body` primeiro; com `>` o `diffstat` cede primeiro e o resultado só muda com um total ímpar de linhas a cortar. `TG:263` usa 30 e 30 e corta 20, par: os dois dão 10 e 10. Mutante S04 sobrevive, contado como equivalente pela spec. Decidir na spec e, então, testar com um total ímpar.
2. **GAT-24, "a primeira a gravar".** O teste é sequencial (`GD:218`, `GP:162`); a garantia vem da transação síncrona do `bun:sqlite` (`broker/gate.ts:146`). Não há dois escritores no processo, então não há o que testar além disso; registrado para não parecer coberto por concorrência real.

---

## Edge Cases

- [x] GAT-91 dois gates: selo e `g` no mais antigo (`TK:69`, `H:114`)
- [x] GAT-92 decidido com outro pendente (`TK:74`)
- [x] GAT-93 corte e quebra (`TG:254`, `TG:263`); desempate não decidido pela spec
- [x] GAT-94 prévia vazia (`TP:169`)
- [x] GAT-95 sem feature aberta (`PK:71`, `TP:177`)
- [x] GAT-96 peer saiu (`DG:226`, `PK:229`)
- [x] GAT-97 feature fecha com o modal aberto (`TK:261`)
- [ ] Assumption "Clique num item da fila que já saiu dela → nada": não testado (M06)

---

## Gate Check

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit` e `bun test`, de `broker/`, na cópia física em `a6a96a8`
- **Result**: `tsc` 0; 2431 pass, 5 skip, 0 fail, 96 arquivos, 659622 `expect()`, 134,55 s
- **Test count before feature**: 2080 pass, 5 skip (`main` em `3922651`, registrado na spec)
- **Test count after feature**: 2431 pass, 5 skip
- **Delta**: +351
- **Skipped tests**: os 5 de antes da fatia (nenhum skip novo)
- **Failures**: nenhuma

---

## Discrimination Sensor

Tier expandido (caminho crítico: a TUI escreve como o humano). 84 mutações de comportamento, uma por vez, numa segunda cópia física (`git clone` + `bun install --frozen-lockfile`); cada uma rodou contra os testes da sua área (as do broker: `GR`, `GD`, `GP`, `FC`, `DG`, `DB`, `question-close`, `IG`, `integration/feature`; as da TUI: os 14 arquivos `tui-*` e `DG`; as de `tui.ts`/`writer.ts`, também `E2E`; as de tools, `TO`, `ST`, `LA`, `send`). Os sobreviventes rodaram de novo contra a suíte inteira (`bun test`, 96 arquivos): S04, S05, S07 e M06 só "morreram" por EVT-43, flaky conhecido, e por isso contam como vivos. Duas mutações caíram em código anterior à fatia (o primeiro `if (e.kind === "feature_closed")` de `derive.ts:169`, e o `m.text.trim()` do modal de resposta em `keys.ts:90`) e não contam; refeitas como D03b e K08b.

| # | File:line | Description | Killed? (primeiro teste que falha) |
| - | --------- | ----------- | ---------------------------------- |
| G01 | `broker/gate.ts:59` | `summary.length > 80` → `> 81` | ✅ GAT-04 (`GR:209`) |
| G02 | `broker/gate.ts:36` | só o leader recusado com `edge_not_allowed` | ✅ GAT-05 worker/judge |
| G03b | `broker/gate.ts:52` | `delivery` sem `commit` aceito | ✅ GAT-30/24 (`GP:181`), GAT-03 |
| G04 | `broker/gate.ts:41` | `null` num opcional aceito como ausente | ✅ GAT-03 `commit`/`diffstat`/`ticket_ref` null |
| G05 | `broker/gate.ts:74` | `tickets_open` conta os descartados | ✅ GAT-06, GAT-14 |
| G06 | `broker/gate.ts:73` | `tickets_open` não vale na reemissão | ✅ GAT-14 (`GR:363`), `GP:181` |
| G07 | `broker/gate.ts:67` | `gate_id` de outra feature não é `invalid_field` | ✅ GAT-07 (`GR:298`), GAT-09 |
| G08 | `broker/gate.ts:108` | reemissão não atualiza `request_seq` | ✅ GAT-12, `GP:181` |
| G09 | `broker/gate.ts:85` | id = `COUNT(*) + 1` | ✅ GAT-01 (`GR:80`) |
| G10 | `broker/gate.ts:154` | `summary` da decisão cortado em 79 | ✅ GAT-19 (`GD:140`) |
| G11 | `broker/gate.ts:161` | `comment` também decide a linha | ✅ GAT-17, GAT-28 |
| G12 | `broker/gate.ts:147` | segunda decisão final aceita | ✅ GAT-23/24, `IG:58`, `GP:181` |
| G13 | `broker/gate.ts:157` | `gate_decision` sem entrega | ✅ GAT-18, GAT-36 (`ST:248`) |
| G14 | `broker/gate.ts:131` | texto só de espaços aceito | ✅ GAT-21 |
| G15 | `broker/gate.ts:123` | `human_token` ausente aceito | ✅ GAT-20 (`GD:166`, `IG:143`) |
| G16 | `broker/gate.ts:155` | `body` da decisão sempre vazio | ✅ GAT-15/19, GAT-16/19 |
| G17 | `broker/gate.ts:181` | `approved()` aceita gate `action` | ✅ GAT-26 só `action` (`FC:255`) |
| G18 | `broker/gate.ts:104` | `diffstat` fora do `data` | ✅ GAT-02 (`GR:115`), `IG:58` |
| G19 | `broker/gate.ts:71` | hint de `gate_closed` sem mandar pedir um gate novo | ❌ **Survived** (2431 pass) |
| F01 | `broker/feature.ts:89` | `gate_required` nunca | ✅ GAT-26 (9 testes) |
| F02 | `broker/feature.ts:82` | `gate_required` antes de `missing_field` | ✅ GAT-29 (`FC:342`) |
| L01 | `broker/log.ts:145` | `feature_closed` rejeita gates de outra feature | ✅ GAT-28 (`FC:315`) |
| L02 | `broker/log.ts:144` | `feature_closed` não rejeita os pendentes | ✅ GAT-28, `GP:181` |
| D01 | `broker/shared/derive.ts:480` | `previous` sempre nulo | ✅ GAT-31 |
| D02 | `broker/shared/derive.ts:481` | `first_ts` da versão atual | ✅ GAT-31 |
| D03b | `broker/shared/derive.ts:490` | `feature_closed` não rejeita na derivação | ✅ GAT-32 (`DG:154`) |
| D04 | `broker/shared/derive.ts:498` | primeiro `comment` em vez do último | ✅ GAT-31 (`DG:102`) |
| D05 | `broker/shared/derive.ts:496` | decisão depois da final conta | ✅ GAT-30 (`DG:137`), GAT-32 |
| D06 | `broker/shared/derive.ts:261` | `P-NN` a partir de 0 | ✅ GAT-61/62 (`DG:200`) e 21 outros |
| D07 | `broker/shared/derive.ts:257` | evento posterior do peer não fecha o pedido | ✅ GAT-71 (`DG:221`), GAT-86 frame 22b |
| D08 | `broker/shared/derive.ts:474` | `version` sempre 1 | ✅ GAT-31 |
| K01 | `broker/tui/keys.ts:338` | `a` colado não é ignorado | ✅ GAT-75 (`TK:296`) |
| K02 | `broker/tui/keys.ts:337` | colagem decide no modo de confirmação | ✅ GAT-75 |
| K03 | `broker/tui/keys.ts:194` | `a` com a prévia travada envia `allow` | ✅ GAT-66, GAT-82 |
| K04 | `broker/tui/keys.ts:134` | `a` na leitura aprova direto (sem `y`) | ✅ GAT-50 (`TK:93`) |
| K05 | `broker/tui/keys.ts:123` | gate: tecla muda o modal com envio em curso | ✅ GAT-73 (`TK:246`, `TL:177`, `MG:336`) |
| K06 | `broker/tui/keys.ts:123` | gate: tecla muda o modal com o broker sem responder | ✅ GAT-77 (`TK:342`) |
| K07 | `broker/tui/keys.ts:174` | permissão: segundo envio com o primeiro em curso | ✅ GAT-73 (`TL:177`, `PK:218`) |
| K08b | `broker/tui/keys.ts:157` | `enter` não apara o texto | ✅ GAT-55, GAT-56 |
| K09 | `broker/tui/keys.ts:362` | `gate_closed` tratado como outra recusa | ✅ GAT-58 (`TK:222`) |
| K10 | `broker/tui/keys.ts:359` | recusa fecha o modal e perde o texto | ✅ GAT-58 (`TK:227`) |
| K11 | `broker/tui/keys.ts:400` | versão nova não tira da confirmação | ✅ GAT-59 (`TK:269`) |
| K12 | `broker/tui/keys.ts:397` | leitura fecha o modal com envio em curso | ✅ GAT-59 (`TK:282`) |
| K13 | `broker/tui/keys.ts:409` | pedido aberto fecha o modal na leitura | ✅ GAT-70, GAT-78 |
| K14 | `broker/tui/keys.ts:254` | `g` abre o mais novo | ✅ GAT-91 |
| K15 | `broker/tui/keys.ts:260` | `x` abre o mais novo | ✅ GAT-60, GAT-66/67/72 |
| K16 | `broker/tui/keys.ts:339` | `\r` colado no texto do gate não vira espaço | ✅ GAT-75 (`TK:329`) |
| K17 | `broker/tui/keys.ts:347` | `✓ G-NN comentado` sem `· continua pendente` | ✅ GAT-57 |
| K18 | `broker/tui/keys.ts:373` | `permission_closed` fecha o modal | ✅ GAT-69 (`PK:201`) |
| K19 | `broker/tui/keys.ts:178` | pedido respondido no terminal aceita `a`/`d` | ✅ GAT-71 (`PK:177`) |
| K20 | `broker/tui/keys.ts:253` | `g` abre com o broker sem responder | ✅ GAT-40 (`TK:62`) |
| K21 | `broker/tui/keys.ts:164` | marca de vazio não sai com a tecla que muda o texto | ✅ GAT-56 |
| S01 | `broker/tui/screens/gate.ts:30` | minutos arredondados | ✅ GAT-43 (`TG:167` e outros) |
| S02 | `broker/tui/screens/gate.ts:73` | `~ mudou` sem exigir o arquivo na versão anterior | ✅ GAT-46 (`TG:222`) |
| S03 | `broker/tui/screens/gate.ts:18` | caixa até a linha 38 | ✅ GAT-93 (`TG:263`) |
| S04 | `broker/tui/screens/gate.ts:163` | empate do corte: `diffstat` cede primeiro | ⚪ Equivalente pela spec (lacuna de precisão 1) |
| S05 | `broker/tui/screens/gate.ts:27` | `feature` conta tickets descartados | ❌ **Survived** (só EVT-43 na suíte inteira) |
| S06 | `broker/tui/screens/gate.ts:131` | `judge` também em gate `action` | ✅ GAT-47 (`TG:167`) |
| S07 | `broker/tui/screens/gate.ts:42` | mesclada com resposta própria conta em `<s>` | ❌ **Survived** (só EVT-43 na suíte inteira) |
| S08 | `broker/tui/screens/gate.ts:119` | `body` quebrado em 75 | ✅ GAT-93 (`TG:254`) |
| S09 | `broker/tui/screens/gate.ts:47` | `result_default` fora de `<d>` | ✅ GAT-85 frames 08 a 19b |
| S10 | `broker/tui/screens/gate.ts:41` | perguntas abertas no agregado | ⚪ Equivalente (aberta não tem `resolved_by` nem `merged_into`) |
| S11 | `broker/tui/screens/gate.ts:73` | `~ mudou` também em linha igual | ✅ GAT-46, GAT-85 frame 18b |
| S12 | `broker/tui/screens/gate.ts:82` | `judge` pelo primeiro `verdict` | ✅ GAT-47, GAT-85 |
| P01 | `broker/tui/screens/permission.ts:14` | prévia em 71 colunas | ✅ GAT-86 frame 22e |
| P02 | `broker/tui/screens/permission.ts:54` | trava uma linha antes | ✅ GAT-63/64 (`TP:155`) |
| P03 | `broker/tui/screens/permission.ts:78` | `— sem ticket` e `— sem feature aberta` trocados | ✅ GAT-86 frame 29d, GAT-95 |
| P04 | `broker/tui/screens/permission.ts:90` | `a TUI soube às` com o `ts` do pedido | ✅ GAT-86 frame 22b, GAT-71 |
| P05 | `broker/tui/screens/permission.ts:47` | fila também no estado "respondido no terminal" | ❌ **Survived** (2431 pass) |
| M01 | `broker/tui/mouse.ts:186` | sem a regra dos 500 ms | ✅ GAT-84 (`MG:282`) |
| M02 | `broker/tui/mouse.ts:139` | fila anda ao contrário | ✅ GAT-83 (`MG:235`) |
| M03 | `broker/tui/mouse.ts:133` | modal de permissão não conta como aberto | ✅ GAT-81 (`MG:112`) |
| M04 | `broker/tui/mouse.ts:66` | 400 ms em vez de 500 | ✅ GAT-84 (499 ms) |
| M05 | `broker/tui/mouse.ts:203` | `m` liga/desliga o mouse com o gate aberto | ✅ GAT-54/50 (`MG:352`), GAT-75 |
| M06 | `broker/tui/mouse.ts:139` | item que saiu da fila anda até o primeiro | ❌ **Survived** (só EVT-43 na suíte inteira) |
| T01 | `broker/tui.ts:175` | decisão de permissão vai a `/gate-decision` como `approve` | ✅ `E2E:44`, GAT-66/67/72 (`TL:129`) |
| T02 | `broker/tui.ts:123` | modal de permissão não desenhado | ✅ `E2E:44`, GAT-60 |
| T03 | `broker/tui.ts:203` | um `POST` por desenho enquanto `send` existe | ✅ GAT-73 (`TL:177`) |
| W01 | `broker/tui/writer.ts:44` | rota `/gate-decisions` | ✅ `E2E:44`, `W:120` |
| W02 | `broker/tui/writer.ts:46` | `behavior` sempre `allow` | ✅ GAT-66/67/72 |
| X01 | `broker/tools.ts:319` | worker ganha a tool `gate` | ✅ EVT-89/GAT-34 (`ST:55`) |
| X02 | `broker/tools.ts:345` | tool `gate` chama `/ask` | ✅ GAT-36/18 (`ST:248`), `TO:106` |
| X03 | `broker/tools.ts:307` | `effect` opcional | ✅ GAT-34 (`TO:106`) |
| X04 | `broker/send.ts:44` | hint de `gate_decision` com `/gate` | ✅ GAT-11 (`IG:161`) |

**Sensor depth**: expandido (P0)
**Result**: 84 injetadas, 77 mortas, 5 vivas, 2 equivalentes — ❌ FAIL

Isolamento: as duas cópias em `C:\tmp\gatev` foram apagadas no fim; `git status --porcelain` da árvore real vazio antes e depois (fora este arquivo).

---

## Interactive UAT Results

Não feito por este verificador. O marco do MVP com sessões reais está em `marco-mvp.md` (T29, `fed6607`).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ (`gate.ts` segue `question.ts`/`permission.ts`; os modais reusam `modal.ts`) |
| Spec-anchored outcome check (asserted values match spec) | ❌ GAT-13, GAT-43, GAT-44, GAT-71, linha de Assumption de GAT-83 |
| Per-layer Coverage Expectation met | ✅ broker 1:1 e rotas com sucesso, recusa e credencial; ❌ cinco casos de desenho e clique |
| Every test maps to a spec requirement | ✅ todo teste novo cita um GAT ou um requisito anterior |
| Documented guidelines followed: `broker/CLAUDE.md`, `tasks.md` (Gate Check Commands) | ✅ |

Achado sem mutante: `decide` (`broker/gate.ts:147`) também recusa com `gate_closed` um gate `pending` de feature não aberta. Pelo GAT-28 essa linha não existe (o `feature_closed` a rejeita na mesma transação), então a cláusula só pesa num banco editado à mão. Não é lacuna.

---

## Fix Plans

### Fix 1: GAT-71 sem fila quando outros pedidos estão abertos (P05) — Major

- **Root cause**: os testes do estado "respondido no terminal" (`TP:61`, `PK:177`, `PK:229`) usam o frame 14, com um pedido só; `squad.permissions` tem no máximo um item, e `many` nunca é verdadeiro.
- **Fix task**: em `broker/test/unit/tui-permission.test.ts`, um teste com o log do frame 22c (P-01 de worker-1, P-02 de worker-2) mais um terceiro pedido de outro agente (como `third` de `PK`) e um `turn_started` de worker-1 depois de P-01. Desenhar `modal(459)` e afirmar `box[0]` `toBe(top("⚠ permissão P-01 · w1 · Bash", " resolvido no terminal "))`, que nenhuma linha da caixa começa com `fila`, e `lines[39]` `toBe(" esc fechar")`. Deve falhar com P05 (`permission.ts:47` → `squad.permissions`).
- **Priority**: Major

### Fix 2: GAT-43 com ticket descartado (S05) — Major

- **Root cause**: nenhum `plan` dos testes do modal de gate tem ticket `dropped`.
- **Fix task**: em `broker/test/unit/tui-gate.test.ts`, no teste de GAT-43 (`TG:198`), um `plan` com os três tickets do 19a e um quarto `{ ticket_ref: "TKT-15", title: "x", dropped: true }`; afirmar `box[5]` `toBe(row("feature   3 tickets · 1 rework · 34 min · ≈$10.17 (custo est.)"))`. Deve falhar com S05 (`gate.ts:27` → `t.planned`).
- **Priority**: Major

### Fix 3: GAT-44 com mesclada que teve resposta própria (S07) — Major

- **Root cause**: os testes e os frames só têm mesclada sem resposta própria (Q-12).
- **Fix task**: em `broker/test/unit/tui-gate.test.ts`, um teste com o log do 19a mais um `answer` da mesclada Q-12 por um agente (`resolved_by` `agent`) antes do gate; afirmar a linha `perguntas` com `<a>` um a mais e `<s>` um a menos que a de `HEAD` (`TG:45`): a mesclada com resposta própria sai de `▶ <s> mesclada` e conta só pelo seu `resolved_by`. Deve falhar com S07 (`gate.ts:42` → `q.merged_into !== null`), que a conta nos dois.
- **Priority**: Major

### Fix 4: clique num item que saiu da fila (M06) — Major

- **Root cause**: `MG:235` e `MG:255` só clicam itens da fila da leitura atual.
- **Fix task**: em `broker/test/unit/tui-mouse-gate.test.ts`, desenhar o modal de G-03 com três gates pendentes (19a + `third` de `TK`), depois um `view` em que G-01 foi aprovado (a fila da leitura fica G-02, G-03, com o marcado no índice 1); clicar a célula de G-01 do desenho antigo e afirmar `point(...)!.ui` `toBe(v.ui)`. O mesmo para a fila de pedidos (três abertos, marcado o terceiro, o primeiro decidido). O marcado tem de ficar no índice 1 ou mais da fila nova: no índice 0 o mutante anda `[` uma vez e para no mesmo item. Deve falhar com M06 (`mouse.ts:139` → `a < 0 ? []`, que anda `[` até o primeiro).
- **Priority**: Major

### Fix 5: hint de `gate_closed` em GAT-13 (G19) — Minor

- **Root cause**: `refusedWith` só confere que o hint é texto não vazio.
- **Fix task**: em `broker/test/unit/gate-request.test.ts:358`, guardar o retorno de `refusedGate` e afirmar `expect(hint).toMatch(/new gate/i)` e `expect(hint).toContain("without gate_id")`. Deve falhar com G19.
- **Priority**: Minor

### Fix 6 (spec): desempate do corte de GAT-93 (S04)

- **Fix task**: a spec decide quem cede no empate (o código corta o `body` primeiro) na linha "Ordem do corte de GAT-93"; depois, em `TG:263`, um caso com total ímpar a cortar (por exemplo 30 de `body` e 31 de `diffstat`) que afirma as linhas que ficam.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| GAT-01 a GAT-12, GAT-14 a GAT-42, GAT-45 a GAT-70, GAT-72 a GAT-82, GAT-84 a GAT-97 | Implementing | ✅ Verified |
| GAT-13 | Implementing | ❌ Needs Fix (Fix 5) |
| GAT-43 | Implementing | ❌ Needs Fix (Fix 2) |
| GAT-44 | Implementing | ❌ Needs Fix (Fix 3) |
| GAT-71 | Implementing | ❌ Needs Fix (Fix 1) |
| GAT-83 | Implementing | ❌ Needs Fix (Fix 4, linha das Assumptions) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 92/97 com o valor da spec; 5 lacunas; 2 lacunas de precisão
**Sensor**: 77/84 mortas, 5 vivas, 2 equivalentes
**Gate**: `tsc` 0; 2431 pass, 5 skip, 0 fail

**What works**: as rotas `/gate` e `/gate-decision`, a regra `gate_required`, o fechamento dos gates com a feature, a paridade tabela-log (200 sequências geradas), a tool e a skill da mother, e todo o caminho em que a TUI escreve como o humano: colagem, `a` travado, `y` só na confirmação, um `POST` por decisão, a rota de cada `send`, a credencial lida no envio.

**Issues found**: cinco casos de desenho e de clique sem teste (Fix 1 a 5), todos de teste, nenhum de produção.

**Next steps**: Fix 1 a 5 como tarefas de teste (cada uma deve falhar com o mutante indicado e passar no código atual), Fix 6 na spec, e uma volta 2 desta validação.

---

# Volta 2

**Date**: 2026-10-14
**Diff range**: fatia `3922651..1078607`; volta de correção `d351ae8..1078607` (T31 a T36: só testes em `broker/test/unit/` e a linha "Empate no corte de GAT-93" nas Assumptions da spec; `git diff --stat d351ae8..HEAD -- broker/` não toca código de produção)
**Verifier**: sub-agente independente (author ≠ verifier), em duas cópias físicas novas (`git clone` + `bun install --frozen-lockfile`) em `C:\tmp\gatev2`, em `1078607`, Bun 1.3.14, Windows 11

**Overall**: ❌ FAIL

Os seis mutantes da volta 1 (P05, S05, S07, M06, G19 e o desempate S04) morrem agora, cada um pelo teste novo da sua tarefa, e as cinco lacunas da volta 1 estão cobertas com o valor da spec. A varredura nova, de 55 mutações, achou dois mutantes vivos, ambos de desenho do modal de gate e ambos de teste, nenhum de produção:

1. **N02**, `broker/tui/screens/gate.ts:169`, ` gate ${pos + 1} de ${queue.length} ` → `${squad.gates.length}`. Com um gate já decidido e dois pendentes a etiqueta diz ` gate 1 de 3 ` em vez de ` gate 1 de 2 `. Contra GAT-41: o `<n>` é a posição na fila de pendentes de GAT-42, então o `<total>` é o tamanho dela. Todos os testes da etiqueta (`TG:147`, frames 19a e 19b) só têm gates pendentes. Na suíte inteira só "morre" por EVT-43, flaky conhecido: conta como vivo.
2. **N09**, `broker/tui/screens/gate.ts:82`, sem `&& row.event.feature_id === squad.feature?.id`. O `judge` passa a mostrar o `verdict` de uma feature anterior para um ticket de mesmo `ticket_ref` (o `plan` só exige `ticket_ref` único dentro dele, `broker/plan.ts:59`, e `rows` é o feed do log inteiro). Alcançável: com um gate `delivery` pendente, um `plan` novo traz um ticket ainda sem `verdict` nesta feature cujo ref já teve `verdict` numa anterior; o modal mostra um `✓ <ref> a/c` falso. Contra GAT-47 ("cada ticket do `plan` mais recente ... que tem `verdict`": sem `verdict` dele, nada). Nenhum teste tem duas features com o mesmo ref. Vivo também na suíte inteira (2437 pass).

## Mutantes da volta 1

Cada um rodado sozinho na cópia `b`, contra os arquivos `tui-*` e `derive-gate` (os de TUI, 1091 testes) ou contra `GR`, `GD`, `GP` e `integration/gate` (o G19); o teste que mata é o novo, e nenhum flaky entra.

| # | Mutação | Killed? | Teste que mata |
| - | ------- | ------- | -------------- |
| P05 | `permission.ts:47` `answered ? [] : squad.permissions` → `squad.permissions` | ✅ | `TP:88` (T31), 1 fail |
| S05 | `gate.ts:27` `t.planned && !t.dropped` → `t.planned` | ✅ | `TG:208` (T32), 1 fail |
| S07 | `gate.ts:42` sem `&& q.answered_by === null` | ✅ | `TG:214` (T33), 1 fail |
| M06 | `mouse.ts:139` `a < 0 \|\| b < 0` → `a < 0` | ✅ | `MG:278` e `MG:288` (T34), 2 fail |
| G19 | `broker/gate.ts:71` hint sem `Ask a new gate, without gate_id.` | ✅ | `GR:358` nos dois casos, `approved` e `rejected` (T35) |
| S04 | `gate.ts:163` `>=` → `>` | ✅ | `TG:286` (T36), 1 fail |

## Spec-anchored: os testes novos

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-13 | `gate_closed` com hint que manda pedir um gate novo | `GR:358` `refusedGate(…, "gate_closed")`; `GR:360` `toMatch(/ask a new gate/i)`; `GR:361` `toContain("without gate_id")` (gate novo = sem `gate_id`, GAT-01); `GR:362` linha igual | ✅ PASS |
| GAT-43 | Só os tickets do `plan` mais recente não descartados | `TG:211`, com um quarto ticket `dropped: true`: `box[5]` `toBe(row("feature   3 tickets · 1 rework · 34 min · ≈$10.17 (custo est.)"))` | ✅ PASS |
| GAT-44 | Mesclada com resposta própria conta pelo `resolved_by`, não em `<s>` | `TG:218`, Q-12 mesclada e respondida pela mother ao leader: `toBe(row("perguntas ✓ 2 pelo dev · 3 entre agentes  ⟳ 3 default aplicado  ▶ 0 mescla…"))` (`<a>` 2→3, `<s>` 1→0 contra `TG:45`) | ✅ PASS |
| GAT-71, GAT-61 | Sem fila, etiqueta ` resolvido no terminal `, rodapé `esc fechar`, com outros dois pedidos abertos | `TP:96` `top(…, " resolvido no terminal ")`; `TP:97` primeira linha; `TP:98` nenhuma linha `fila`, `toEqual([])`; `TP:99` `" esc fechar"` | ✅ PASS |
| Assumption "Clique num item da fila que já saiu dela" (GAT-83) | Não faz nada | `MG:284` fila nova `[2, 3]` com o marcado (G-03) no índice 1; `MG:285` `point(…)!.ui` `toBe(after.ui)`; pedidos: `MG:294` `[460, 500]`, `MG:295` | ✅ PASS |
| GAT-93, desempate | Assumption nova: com `body` e `diffstat` do mesmo tamanho o `body` cede primeiro | `TG:291` `[y, end]` `[2, 37]`; `TG:293` 9 linhas de `corpo` e 10 de `f*.ts` (41 a cortar, ímpar) | ✅ PASS |

As afirmações vêm da spec, não do código: os valores esperados são os da linha da spec (contagens, etiqueta, rodapé, "nada muda"), e o M06 só é discriminado porque o marcado está no índice 1 da fila nova, como a volta 1 pediu.

### Lacunas de precisão da volta 1

1. **GAT-93, desempate**: decidido na spec (linha "Empate no corte de GAT-93", `spec.md:80`, `n`: escolha do orquestrador, não confirmada pelo dev) e testado com total ímpar (`TG:286`). Fechada.
2. **GAT-24**: continua sem teste concorrente, e a spec como está escrita não precisa de um. `decide` (`broker/gate.ts:122`) é síncrona do começo ao fim, sem `await` entre ler a linha e gravar (`broker/gate.ts:145`-`169`), e a rota a chama de forma síncrona depois de ler o corpo (`broker/broker.ts:187`-`188`). Num processo só, dois `POST` simultâneos se serializam no laço de eventos: "a primeira a gravar" é a primeira a entrar em `decide`, e o resto é o caso sequencial que `GD:225` e `GP:162` cobrem. Um teste com `Promise.all` não exercitaria nada a mais.

### Requisitos com mutante vivo nesta volta

| Req | Spec-defined outcome | Evidência | Result |
| --- | -------------------- | --------- | ------ |
| GAT-41 | ` gate <n> de <total> ` com o total da fila de pendentes | `TG:147` e frames 19a e 19b só com gates pendentes; nenhum desenho com gate decidido e dois pendentes: N02 vivo | ❌ GAP |
| GAT-47 | `judge` só com o `verdict` do ticket desta feature | `TG:193`, `TG:195` com uma feature só: N09 vivo | ❌ GAP |

**Status**: ❌ 95 de 97 com o valor da spec e testes que os discriminam; as cinco lacunas da volta 1 fechadas; GAT-41 e GAT-47 abertos por mutante novo.

## Gate Check (volta 2)

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit` e `bun test`, de `broker/`, na cópia `a` em `1078607`
- **Result**: `tsc` 0; 2437 pass, 5 skip, 0 fail, 2442 testes, 96 arquivos, 659638 `expect()`, 140,00 s
- **Delta**: 2431 pass na volta 1 → 2437 (+6, os seis testes de T31 a T36); nenhum teste removido, nenhum skip novo

## Discrimination Sensor (volta 2)

55 mutações novas, nenhuma repetida da tabela da volta 1, uma por vez na cópia `b` (as de TUI contra os arquivos `tui-*` e `derive-gate`, 1091 testes; as de `broker/gate.ts` contra `GR`, `GD`, `GP`, `FC`, `DG` e `integration/gate`, 181 testes). Os sobreviventes rodaram de novo contra a suíte inteira. Peso onde a volta 1 achou vivos: 17 nos dois modais, 5 em `modal.ts`, 6 em `mouse.ts`, 16 em `keys.ts`, 5 em `derive.ts`, 6 em `broker/gate.ts`.

| # | File:line | Description | Killed? (primeiro teste que falha) |
| - | --------- | ----------- | ---------------------------------- |
| N01 | `broker/tui/screens/gate.ts:111` | `▶` no mais antigo da fila, não no deste modal | ✅ GAT-41/42/49 (dois gates) |
| N02 | `broker/tui/screens/gate.ts:169` | ` gate n de ` com o total de todos os gates, não da fila | ❌ **Survived** (suíte inteira: só EVT-43) |
| N03 | `broker/tui/screens/gate.ts:105` | cabeça de versão 2 só a partir da 3 | ✅ GAT-85 frame 18b, GAT-45/48 |
| N04 | `broker/tui/screens/gate.ts:106` | versão 2 com o `ts` do primeiro `gate` | ✅ GAT-85 frame 18b |
| N05 | `broker/tui/screens/gate.ts:125` | comentário sem aspas | ✅ GAT-85 frame 18b, GAT-45 |
| N06 | `broker/tui/screens/gate.ts:139` | `diff` com a primeira linha do diffstat | ✅ GAT-85 frames 16a, 16b, 16c, 17 |
| N07 | `broker/tui/screens/gate.ts:139` | `diff` sem aparar as pontas | ✅ GAT-85 frames 16a a 17 |
| N08 | `broker/tui/screens/gate.ts:85` | `judge` `c/c` em vez de `a/c` | ✅ GAT-47 |
| N09 | `broker/tui/screens/gate.ts:82` | `verdict` de qualquer feature | ❌ **Survived** (2437 pass na suíte inteira) |
| N10 | `broker/tui/screens/gate.ts:30` | minutos até a versão atual, não até o primeiro `gate` | ✅ GAT-85 frame 18b, GAT-43 |
| N11 | `broker/tui/screens/gate.ts:176` | marca de clique da fila deslocada | ✅ GAT-83 (`MG`), GAT-41 |
| N12 | `broker/tui/screens/gate.ts:184` | `] próximo gate` no rodapé com um gate só | ✅ GAT-85 frame 08, GAT-49 |
| N13 | `broker/tui/screens/permission.ts:69` | `▶` no mais antigo da fila de pedidos | ✅ GAT-86 frames 22e e 22f, GAT-62 |
| N14 | `broker/tui/screens/permission.ts:84` | prévia não fica cinza no estado de GAT-71 | ✅ GAT-71 (`TP:61`) |
| N15 | `broker/tui/screens/permission.ts:128` | `j/k rolar   G fim` só com 10 linhas ou mais | ✅ GAT-63/64 (9 linhas) |
| N16 | `broker/tui/screens/permission.ts:120` | marca de clique da fila de pedidos deslocada | ✅ GAT-83, GAT-61/62 |
| N17 | `broker/tui/screens/permission.ts:60` | `há <idade>` não conta do `ts` do pedido | ✅ GAT-86 frames 22a, 22d, 22e, 22f |
| N18 | `broker/tui/screens/modal.ts:65` | caixa pode começar na linha 1 | ✅ GAT-41 (`MO`) |
| N19 | `broker/tui/screens/modal.ts:53` | borda da prévia `a–b` a partir de 0 | ✅ GAT-63, GAT-86 frames 22e e 22f |
| N20 | `broker/tui/screens/modal.ts:52` | `▼ mais abaixo` também com o fim à vista | ✅ GAT-63/64, GAT-86 frame 22f |
| N21 | `broker/tui/screens/modal.ts:27` | campo expandido com as últimas 4 linhas | ✅ GAT-53, QST-75 |
| N22 | `broker/tui/screens/modal.ts:67` | linha 0 fora da marca de `esc` | ✅ GAT-81, CLK-40/43 (27 testes) |
| N23 | `broker/tui/mouse.ts:186` | a roda num modal clica | ✅ GAT-80 (14 testes) |
| N24 | `broker/tui/mouse.ts:150` | fila do clique com os gates decididos | ✅ GAT-83 (`MG:278`, novo) |
| N25 | `broker/tui/mouse.ts:151` | fila do clique com todos os pedidos | ✅ GAT-83 (`MG:288`, novo) |
| N26 | `broker/tui/mouse.ts:171` | clique a exatamente 500 ms ignorado | ✅ GAT-84, CLK-46/49 |
| N27 | `broker/tui/mouse.ts:173` | a roda conta como clique para os 500 ms | ✅ GAT-80 |
| N28 | `broker/tui/mouse.ts:133` | modal de gate não conta como aberto | ✅ GAT-81, GAT-75 |
| N29 | `broker/tui/keys.ts:134` | `a` não guarda a versão da tela | ✅ GAT-50 |
| N30 | `broker/tui/keys.ts:141` | `]` e `[` do gate dão a volta na fila | ✅ GAT-50 |
| N31 | `broker/tui/keys.ts:202` | `]` e `[` do pedido dão a volta na fila | ✅ GAT-65 |
| N32 | `broker/tui/keys.ts:154` | `esc` do texto guarda o texto | ✅ GAT-54, GAT-81 |
| N33 | `broker/tui/keys.ts:164` | tecla que não muda o texto tira a marca de vazio | ✅ GAT-56 |
| N34 | `broker/tui/keys.ts:160` | `ctrl+e` não recolhe | ✅ GAT-54, GAT-82 |
| N35 | `broker/tui/keys.ts:187` | `j` passa do fim da prévia | ✅ GAT-65 |
| N36 | `broker/tui/keys.ts:361` | aviso de decisão aceita sem verde | ✅ GAT-57 |
| N37 | `broker/tui/keys.ts:371` | `permitido` e `negado` trocados | ✅ GAT-68, GAT-66/67/72 |
| N38 | `broker/tui/keys.ts:374` | outra recusa fecha o modal de permissão | ✅ GAT-69 |
| N39 | `broker/tui/keys.ts:359` | recusa deixa o gate em envio | ✅ GAT-58, GAT-74 |
| N40 | `broker/tui/keys.ts:409` | leitura fecha o modal do pedido fechado pelo peer | ✅ GAT-71/96 |
| N41 | `broker/tui/keys.ts:410` | sem `P-NN decidido` | ✅ GAT-70 |
| N42 | `broker/tui/keys.ts:399` | sem `G-NN fechado` | ✅ GAT-59, GAT-97 |
| N43 | `broker/tui/keys.ts:255` | `g` não vai à tela principal | ✅ GAT-40 |
| N44 | `broker/tui/keys.ts:261` | `x` não vai à tela principal | ✅ GAT-60 |
| N45 | `broker/shared/derive.ts:257` | o próprio pedido conta como o evento que o fecha | ✅ GAT-70/71/96, GAT-86 frame 22b |
| N46 | `broker/shared/derive.ts:257` | `peer_left` não fecha o pedido em `requests` | ✅ GAT-96 (`DG:226`) |
| N47 | `broker/shared/derive.ts:468` | `commit` da primeira versão | ✅ GAT-31, GAT-30 |
| N48 | `broker/shared/derive.ts:467` | `scope` da primeira versão | ✅ GAT-31 |
| N49 | `broker/shared/derive.ts:506` | `text` da decisão sempre nulo | ✅ GAT-30/31 |
| N50 | `broker/gate.ts:74` | `tickets_open` sem exigir `planned` | ⚪ Equivalente: só um ticket com evento fica fora do `plan`, e `task` exige ticket planejado (`broker/send.ts:101`) e o `plan` não tira ticket começado (`broker/plan.ts:76`) |
| N51 | `broker/gate.ts:108` | reemissão guarda o `commit` antigo | ✅ GAT-12, GAT-30 (`GP`) |
| N52 | `broker/gate.ts:85` | reemissão ganha id novo | ✅ GAT-12, GAT-10, GAT-30 |
| N53 | `broker/gate.ts:70` | gate `rejected` aceita versão nova | ✅ GAT-13, GAT-07 |
| N54 | `broker/gate.ts:67` | `gate_id` de outra feature aceito | ✅ GAT-09, GAT-07 |
| N55 | `broker/gate.ts:148` | `summary` sem `: <text>` quando `text` falta | ⚪ Equivalente: `reject` e `comment` sem texto já são `missing_field` (`broker/gate.ts:131`) |

**Sensor depth**: expandido (P0)
**Result**: 55 injetadas, 51 mortas, 2 vivas (N02, N09), 2 equivalentes (N50, N55) — ❌ FAIL

Isolamento: `git status --porcelain` da árvore real vazio antes; depois, só este arquivo e os de lições. As cópias em `C:\tmp\gatev2` foram apagadas no fim.

## Fix Plans (volta 2)

### Fix 7: etiqueta ` gate n de N ` com um gate decidido (N02) — Major

- **Root cause**: nenhum desenho do modal de gate tem um gate decidido ao lado de dois pendentes.
- **Fix task**: em `broker/test/unit/tui-gate.test.ts`, o log de três gates (como `threeGates` de `tui-mouse-gate.test.ts`) com um `gate_decision` `approve` de G-01; desenhar o modal de G-02 e afirmar `box[0]` com a etiqueta ` gate 1 de 2 ` e a linha `fila` com só G-02 e G-03. Deve falhar com `gate.ts:169` `queue.length` → `squad.gates.length`.
- **Priority**: Major

### Fix 8: `judge` com `verdict` de outra feature (N09) — Minor

- **Root cause**: nenhum teste do modal tem duas features com o mesmo `ticket_ref`.
- **Fix task**: em `broker/test/unit/tui-gate.test.ts`, um log com uma feature fechada em que `TKT-12` teve `verdict` `approve`, e a feature aberta com um gate `delivery` pendente e, depois dele, um `plan` com um `TKT-12` ainda sem `verdict` nela; afirmar que a linha `judge` não traz `TKT-12` (ou não existe, se nenhum ticket desta feature tem `verdict`). Deve falhar com `gate.ts:82` sem `&& row.event.feature_id === squad.feature?.id`.
- **Priority**: Minor

## Requirement Traceability Update (volta 2)

| Requirement | Volta 1 | Volta 2 |
| ----------- | ------- | ------- |
| GAT-13, GAT-43, GAT-44, GAT-71, GAT-83 | ❌ Needs Fix | ✅ Verified |
| GAT-41 | ✅ Verified | ❌ Needs Fix (Fix 7) |
| GAT-47 | ✅ Verified | ❌ Needs Fix (Fix 8) |
| os outros 90 | ✅ Verified | ✅ Verified |

## Summary (volta 2)

**Overall**: ❌ Not Ready

**Spec-anchored check**: os seis testes novos afirmam o valor da spec; 95/97 sem mutante vivo; lacuna de GAT-93 fechada na spec; GAT-24 não precisa de teste concorrente
**Sensor**: mutantes da volta 1, 6/6 mortos; varredura nova, 51/55 mortas, 2 vivas, 2 equivalentes
**Gate**: `tsc` 0; 2437 pass, 5 skip, 0 fail

**Next steps**: Fix 7 e Fix 8 como tarefas de teste (cada uma deve falhar com o mutante indicado e passar no código atual) e uma volta 3, a última antes de escalar ao dev.

---

# Volta 3

**Date**: 2026-10-14
**Diff range**: fatia `3922651..be4118d`; volta de correção `798b999..be4118d` (T37 `393d3b1` e T38 `be4118d`: só `broker/test/unit/tui-gate.test.ts` e `tasks.md`; `git diff --stat 798b999..HEAD -- broker/` não toca código de produção)
**Verifier**: sub-agente independente (author ≠ verifier), em duas cópias físicas novas (`git clone` + `bun install --frozen-lockfile`) em `C:\tmp\gatev3`, em `be4118d`, Bun 1.3.14, Windows 11

**Overall**: ❌ FAIL — a última volta antes de escalar ao dev

Os dois mutantes da volta 2 morrem, cada um pelo teste novo da sua tarefa, que afirma o valor da spec. A varredura nova, de 31 mutações, todas do tipo "filtro com um item que falha a condição" ou "valor de fronteira" onde cabia, achou seis mutantes vivos na suíte inteira (2439 pass, 0 fail em cada um, nenhum flaky no meio). Todos são de teste, nenhum de produção: o código faz o que a spec diz, e nenhum teste monta o caso em que um item fora do filtro está presente. Cada um foi confirmado alcançável com um teste de sondagem descartável na cópia `b` (a saída do código atual contra a do mutante, citada abaixo):

1. **V15**, `broker/tui/keys.ts:126`, `view.squad.gates.filter((g) => g.pending)` → `view.squad.gates`. Com G-01 aprovado e G-02 e G-03 pendentes, `[` no modal de G-02 abre o modal de G-01, já decidido (sondagem: `gate.id` 2 → 1). Contra GAT-50 ("`]` e `[` SHALL mudar para o gate pendente seguinte ou anterior da fila, sem passar ... do primeiro"). `TK:115` só tem três pendentes.
2. **V18**, `broker/tui/keys.ts:200`, `view.squad.permissions` → `view.squad.requests.map((r) => r.request)`. Com 459 fechado no terminal (evento posterior de worker-1) e 460 e 500 abertos, `[` no modal de 460 vai a 459 (sondagem: `seq` 460 → 459). Contra GAT-65 ("o pedido aberto seguinte ou anterior"). `PK:161` só tem três abertos.
3. **V10**, `broker/shared/derive.ts:252`, `decides` sem `&& e.request_seq === request.seq`. Com P-01 (worker-1) e P-02 (worker-2) abertos, o dev decide P-02 e depois worker-1 volta a agir: P-01 passa a `closedBy` `decision` com o `ts` da decisão de P-02, e a leitura fecha o modal de P-01 com o aviso `P-01 decidido` (sondagem: `peer` e modal aberto → `decision` e `"P-01 decidido"`). Contra GAT-71 (fechado por evento do peer: o estado "respondido no terminal", com o `ts` do evento que o fechou) e GAT-70 (só a `permission_decision` que o cita). `DG:213`, `DG:221`, `DG:226` e `PK:224` não têm decisão de outro pedido no log.
4. **V23**, `broker/tui/screens/permission.ts:112`, ` pedido ${pos + 1} de ${queue.length} ` → `${squad.requests.length}`. Com um pedido fechado e dois abertos a etiqueta diz ` pedido 1 de 3 ` em vez de ` pedido 1 de 2 ` (sondagem). Contra GAT-61: o `<total>` é o da fila de pedidos abertos de GAT-62. É o N02 da volta 2 no outro modal; os testes da etiqueta (`TP:36`, frames 22e e 22f) só têm pedidos abertos.
5. **V28**, `broker/tui/screens/gate.ts:80`, `judge` sem `&& !t.dropped`. Com um `plan` posterior que descarta TKT-12 depois do `verdict` dele, a linha `judge` ainda traz `✓ TKT-12 5/5` (sondagem: `✓ TKT-13 1/1  ✓ TKT-14 1/1` → `✓ TKT-12 5/5  ✓ TKT-13 1/1  ✓ TKT-14 1/1`). Contra GAT-47 ("cada ticket do `plan` mais recente não descartado que tem `verdict`"). O ticket descartado de `TG:236` (T32) não tem `verdict`. O `plan` leva a isso: um ticket começado fica no `plan` com `dropped: true` (`broker/plan.ts:76`).
6. **V27**, `broker/tui/screens/gate.ts:28`, `squad.tickets.reduce` → `live.reduce`. Com o mesmo `plan` (TKT-12, o do rework, descartado), a linha `feature` diz `0 reworks` em vez de `1 rework` (sondagem). Contra GAT-43, que conta "os `verdict` de `rework` da feature", não só os dos tickets vivos. Nenhum teste tem um ticket com rework descartado.

## Mutantes da volta 2

Cada um rodado sozinho na cópia `b` contra os arquivos `tui-*` e `derive-gate` (1088 testes); o teste que mata é o novo, e nenhum flaky entra.

| # | Mutação | Killed? | Teste que mata |
| - | ------- | ------- | -------------- |
| N02 | `broker/tui/screens/gate.ts:169` `queue.length` → `squad.gates.length` | ✅ | `TG:167` (T37), 1 fail |
| N09 | `broker/tui/screens/gate.ts:82` sem `&& row.event.feature_id === squad.feature?.id` | ✅ | `TG:206` (T38), 1 fail |

## Spec-anchored: os testes novos

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | -------------------- | ----------------------- | ------ |
| GAT-41, GAT-42 | ` gate <n> de <total> ` com o total da fila de pendentes; `fila` só com os pendentes | `TG:171` `box[0]` `toBe(top("⚠ gate G-02", " gate 1 de 2 "))` com G-01 aprovado e três gates; `TG:172` `box[2]` `toBe(row("fila      ▶ G-02 excluir branch antiga     G-03 chave   antigo antes"))` | ✅ PASS |
| GAT-47 | `judge` só com tickets que têm `verdict` nesta feature; o mesmo ref com `verdict` numa feature fechada não conta | `TG:222` a feature aberta é a 2 e TKT-15 está no `plan` (o caso existe); `TG:223` a linha `judge` `toEqual([row("judge     ✓ TKT-12 5/5  ✓ TKT-13 1/1  ✓ TKT-14 1/1")])`: sem TKT-15, com os outros três | ✅ PASS |

As afirmações vêm da spec: a etiqueta e a fila são as de GAT-41/42 sobre os pendentes, e a linha `judge` é a de GAT-47 com os `verdict` desta feature. `TG:222` confirma que o caso montado é o que a tarefa pede antes de afirmar o desenho.

### Requisitos com mutante vivo nesta volta

| Req | Spec-defined outcome | Evidência | Result |
| --- | -------------------- | --------- | ------ |
| GAT-50 | `]`/`[` só entre os gates pendentes | `TK:115` só com pendentes: V15 vivo | ❌ GAP |
| GAT-65 | `]`/`[` só entre os pedidos abertos | `PK:161` só com abertos: V18 vivo | ❌ GAP |
| GAT-70, GAT-71 | Pedido fechado pelo peer fica no estado de GAT-71, mesmo com a decisão de outro pedido no meio | `DG:213`, `DG:221`, `PK:224` sem decisão de outro pedido: V10 vivo | ❌ GAP |
| GAT-61 | ` pedido <n> de <total> ` com o total dos abertos | `TP:36`, frames 22e/22f só com abertos: V23 vivo | ❌ GAP |
| GAT-47 | `judge` sem ticket descartado | `TG:236` com descartado sem `verdict`: V28 vivo | ❌ GAP |
| GAT-43 | `rework` conta os `verdict` de `rework` da feature inteira | nenhum ticket com rework descartado: V27 vivo | ❌ GAP |

**Status**: ❌ 90 de 97 sem mutante vivo; GAT-41 fechado; GAT-43, GAT-47, GAT-50, GAT-61, GAT-65, GAT-70 e GAT-71 abertos por mutante novo.

## Gate Check (volta 3)

- **Gate command**: `bun node_modules/typescript/bin/tsc --noEmit` e `bun test`, de `broker/`, na cópia `a` em `be4118d`
- **Result**: `tsc` 0; 2439 pass, 5 skip, 0 fail, 2444 testes, 96 arquivos, 659642 `expect()`, 129,77 s
- **Delta**: 2437 pass na volta 2 → 2439 (+2, os testes de T37 e T38); nenhum teste removido, nenhum skip novo

## Discrimination Sensor (volta 3)

31 mutações novas, nenhuma repetida das tabelas das voltas 1 e 2, uma por vez na cópia `b`: as de TUI contra os arquivos `tui-*` e `derive-gate` (1088 testes); as de `broker/gate.ts`, `derive.ts` e `log.ts` contra `GR`, `GD`, `GP`, `FC`, `DG`, `DB` e `integration/gate` (mais `integration/gate-e2e` e `integration/feature` para as da regra de fechamento); as de `tools.ts`, `server.ts` e `broker.ts` contra `TO`, `ST`, `LA` e as rotas; a da skill contra `SK`. Os seis sobreviventes rodaram de novo, um por vez, contra a suíte inteira (`bun test`, 96 arquivos): 2439 pass e 0 fail em todos. Uma primeira tentativa de V13 caiu no `gate_id` da tool `history` (de antes da fatia) e foi refeita no da tool `gate`; conta uma vez.

| # | File:line | Description | Killed? (primeiro teste que falha) |
| - | --------- | ----------- | ---------------------------------- |
| V01 | `broker/gate.ts:47` | `body` que não é texto aceito | ✅ GAT-03 (`body` null, número, objeto) |
| V02 | `broker/gate.ts:131` | `comment` sem texto aceito (só `reject` exige) | ✅ GAT-21 (3 casos de `comment`) |
| V03 | `broker/gate.ts:130` | `text` que não é texto aceito | ✅ GAT-21 (`text` null e número no `approve`) |
| V04 | `broker/gate.ts:158` | `text` vazio do `approve` fora do `data` | ✅ GAT-15 (approve com texto vazio guardado vazio) |
| V05 | `broker/gate.ts:182` | `approved()` aceita o `delivery` aprovado de qualquer feature | ✅ GAT-26 (o aprovado de uma feature fechada não entrega a seguinte) |
| V06 | `broker/gate.ts:59` | `scope` fora de `delivery`/`action` aceito | ✅ GAT-04, GAT-14 |
| V07 | `broker/gate.ts:94` | `ticket_ref` não gravado | ✅ GAT-02 |
| V08 | `broker/log.ts:145` | `feature_closed` rejeita também os gates decididos | ✅ GAT-28 (os dois `outcome`), GAT-30 (`GP`) |
| V09 | `broker/shared/derive.ts:490` | `feature_closed` rejeita na derivação também os decididos | ✅ GAT-32, GAT-33, GAT-30 |
| V10 | `broker/shared/derive.ts:252` | decisão de outro pedido fecha o pedido como `decision` | ❌ **Survived** (2439 pass na suíte inteira) |
| V11 | `broker/shared/derive.ts:498` | `ts` do `comment` = `ts` da versão do gate | ✅ GAT-31, GAT-30/31, GAT-32 (6 testes) |
| V12 | `broker/server.ts:345` | resposta da tool com o `seq` no lugar do `gate_id` | ✅ GAT-36/18 (`ST`) |
| V13 | `broker/tools.ts:305` | `gate_id` da tool `gate` como texto | ✅ GAT-34 (`TO`) |
| V14 | `broker/broker.ts:47` | `/gate` fora das rotas | ✅ GAT-26/27/40/52/60/66 (`E2E`), GAT-05/07/08 (`IG`) |
| V15 | `broker/tui/keys.ts:126` | `]`/`[` do gate com os gates decididos na fila | ❌ **Survived** (2439 pass na suíte inteira) |
| V16 | `broker/tui/keys.ts:254` | `g` abre o primeiro gate, pendente ou não | ✅ GAT-92 (`TK:72`) |
| V17 | `broker/tui/keys.ts:260` | `x` abre o primeiro pedido, aberto ou não | ✅ GAT-60, GAT-90 |
| V18 | `broker/tui/keys.ts:200` | `]`/`[` do pedido com os pedidos fechados na fila | ❌ **Survived** (2439 pass na suíte inteira) |
| V19 | `broker/tui/keys.ts:338` | `d` colado não é ignorado | ✅ GAT-75 (4 testes, inclusive pelo laço) |
| V20 | `broker/tui/keys.ts:400` | toda leitura tira da confirmação, mesmo sem versão nova | ✅ GAT-59, GAT-78 |
| V21 | `broker/tui/writer.ts:44` | `approve` envia `text: ""` | ✅ GAT-52/72 (`TL`), `E2E` |
| V22 | `broker/tui.ts:173` | rota escolhida por `"text" in sent`: o `approve` vai a `/permission-decision` | ✅ GAT-52/72/75/78 (`TL`), `E2E` |
| V23 | `broker/tui/screens/permission.ts:112` | ` pedido n de ` com o total de todos os pedidos | ❌ **Survived** (2439 pass na suíte inteira) |
| V24 | `broker/tui/screens/permission.ts:59` | `pediu permissão às` com o `ts` de quem fechou | ✅ GAT-86 frame 22b, GAT-71 |
| V25 | `broker/tui/screens/modal.ts:50` | borda `a–b de N` também com exatamente 8 linhas | ✅ GAT-86 frames 22a, 22b, 22d, 29d |
| V26 | `broker/tui/screens/modal.ts:65` | caixa centrada para baixo (`ceil`) | ✅ QST-70/73/75 (17 testes) |
| V27 | `broker/tui/screens/gate.ts:28` | reworks só dos tickets vivos | ❌ **Survived** (2439 pass na suíte inteira) |
| V28 | `broker/tui/screens/gate.ts:80` | `judge` com ticket descartado | ❌ **Survived** (2439 pass na suíte inteira) |
| V29 | `broker/tui/screens/gate.ts:127` | separador da versão 2 sem `comment` e sem `body` | ✅ GAT-45 |
| V30 | `broker/tui/screens/help.ts:81` | legenda `fila · fechar sem decidir` | ✅ GAT-87, TUI-43 frame 11 |
| V31 | `plugin/skills/worker/SKILL.md` | a skill do worker cita a tool `gate` | ✅ GAT-39 (`SK:315`), PAP-61 |

**Sensor depth**: expandido (P0)
**Result**: 31 injetadas, 25 mortas, 6 vivas (V10, V15, V18, V23, V27, V28), 0 equivalentes — ❌ FAIL

Isolamento: `git status --porcelain` da árvore real vazio antes; depois, só este arquivo e os de lições. A cópia `b` voltou limpa depois de cada mutação e da sondagem; as cópias em `C:\tmp\gatev3` foram apagadas no fim.

## Fix Plans (volta 3)

Todas de teste: cada uma deve falhar com o mutante indicado e passar no código atual.

### Fix 9: `]`/`[` do gate com um gate decidido (V15) — Major

- **Fix task**: em `broker/test/unit/tui-gate-keys.test.ts`, o 19a com `third` e `decided(…, 1, "approve")`; modal de G-02: `[` devolve `toBe(v.ui)` e `]` dá `modal(3)`. Deve falhar com `keys.ts:126` sem o `.filter((g) => g.pending)`.

### Fix 10: `]`/`[` do pedido com um pedido fechado (V18) — Major

- **Fix task**: em `broker/test/unit/tui-permission-keys.test.ts`, o 22c com `third` e um `turn_started` de worker-1 depois de 459; modal de 460: `[` devolve `toBe(v.ui)` e `]` dá `modal(500)`. Deve falhar com `keys.ts:200` trocado por `view.squad.requests.map((r) => r.request)`.

### Fix 11: pedido fechado pelo peer com a decisão de outro no meio (V10) — Major

- **Fix task**: em `broker/test/unit/derive-gate.test.ts`, 459 (worker-1) e 460 (worker-2), um `permission_decision` de 460 e depois um evento de worker-1: o pedido 459 de `requests()` com `closedBy` `"peer"` e `closedTs` do evento de worker-1; e em `tui-permission-keys.test.ts`, `sync` com o modal de 459 aberto o deixa aberto, sem aviso. Deve falhar com `derive.ts:252` sem `&& e.request_seq === request.seq`.

### Fix 12: etiqueta ` pedido n de N ` com um pedido fechado (V23) — Major

- **Fix task**: em `broker/test/unit/tui-permission.test.ts`, o log de Fix 10, modal de 460: `box[0]` `toBe(top("⚠ permissão P-02 · w2 · Bash", " pedido 1 de 2 "))` e a linha `fila` só com P-02 e o pedido de worker-3. Deve falhar com `permission.ts:112` `queue.length` → `squad.requests.length`.

### Fix 13: `judge` e `feature` com ticket descartado depois do `verdict` (V28, V27) — Minor

- **Fix task**: em `broker/test/unit/tui-gate.test.ts`, o 19a com um `plan` posterior que traz TKT-12 com `dropped: true`: a linha `judge` `toBe(row("judge     ✓ TKT-13 1/1  ✓ TKT-14 1/1"))` (V28, `gate.ts:80` sem `&& !t.dropped`) e a linha `feature` `toBe(row("feature   2 tickets · 1 rework · 34 min · ≈$10.17 (custo est.)"))` (V27, `gate.ts:28` `squad.tickets.reduce` → `live.reduce`).

## Requirement Traceability Update (volta 3)

| Requirement | Volta 2 | Volta 3 |
| ----------- | ------- | ------- |
| GAT-41 | ❌ Needs Fix | ✅ Verified |
| GAT-47 | ❌ Needs Fix | ❌ Needs Fix (Fix 13: N09 fechado, V28 aberto) |
| GAT-43 | ✅ Verified | ❌ Needs Fix (Fix 13) |
| GAT-50 | ✅ Verified | ❌ Needs Fix (Fix 9) |
| GAT-61 | ✅ Verified | ❌ Needs Fix (Fix 12) |
| GAT-65 | ✅ Verified | ❌ Needs Fix (Fix 10) |
| GAT-70, GAT-71 | ✅ Verified | ❌ Needs Fix (Fix 11) |
| os outros 89 | ✅ Verified | ✅ Verified |

## Summary (volta 3)

**Overall**: ❌ Not Ready — escalar ao dev (terceira volta de correção esgotada)

**Spec-anchored check**: os dois testes novos afirmam o valor da spec; 90/97 sem mutante vivo
**Sensor**: mutantes da volta 2, 2/2 mortos; varredura nova, 25/31 mortas, 6 vivas, 0 equivalentes
**Gate**: `tsc` 0; 2439 pass, 5 skip, 0 fail

**What works**: o broker inteiro (as 14 mutações de `gate.ts`, `log.ts`, `gates()`, `tools.ts`, `server.ts` e `broker.ts` morreram), o caminho que escreve como o humano (rota, corpo, colagem) e a skill.

**Issues found**: os seis vivos são o mesmo padrão das voltas 1 e 2 (L-039): uma fila, uma contagem ou um fechamento que filtra por uma condição, testado só com itens que passam nela. Cada volta achou alguns casos; esta mostra que o padrão continua nos dois modais e em `requests()`.

**Next steps**: escalar ao dev com Fix 9 a 13. Recomendação: em vez de mais uma volta de poucos casos, uma tarefa que varra cada `filter`/`find` de `tui/keys.ts`, `tui/screens/gate.ts`, `tui/screens/permission.ts` e `requests()` com um item que falha a condição.

---

## Nota de fechamento (2026-10-15, depois da volta 3)

Escrita pelo orquestrador, não pelo Verifier. O veredito da volta 3 acima continua **FAIL** e não foi mudado.

- O dev decidiu em 2026-10-15 aplicar do Fix 9 ao Fix 13 como tarefas de teste e fechar a fatia **sem uma quarta volta do Verifier**, como fez com a Papéis e a TUI clicável. Pela recomendação da volta 3, as tarefas também cobrem a varredura de cada `filter` e `find` de `broker/tui/keys.ts`, `broker/tui/screens/gate.ts`, `broker/tui/screens/permission.ts` e de `requests()` (com `openPermissions()`, que ela usa) em `broker/shared/derive.ts`, cada um com um item que falha a condição (L-039).
- Tudo rodou numa cópia fora da árvore, um `git worktree` destacado em `C:\tmp\gate-mut` com `bun install --frozen-lockfile` próprio, no Windows com o Bun 1.3.14. Cada mutação, uma por vez, contra os arquivos `tui-*` e `derive*` (1386 testes antes dos novos), com o arquivo restaurado depois. A árvore real só recebeu testes e `.specs/`; nenhum código de produção mudou (`git diff --stat cdb8517..1fcba77 -- broker ':!broker/test'` vazio).
- **A varredura**: 51 mutações, o predicado de cada `filter`/`find` trocado por `() => true` (ou o `filter` tirado) e, num predicado de mais de uma condição, cada condição tirada por vez. 39 morreram pelos testes que já existiam. Das 12 vivas, 4 são mutantes do relatório (V15, V18, V10, V28) e uma variante de V23 (`permission.ts:47` com todos os pedidos na fila); 4 são novas e viraram T44 a T47; 4 são equivalentes:
  - `gate.ts:41` sem o `filter((q) => !q.open)`: uma pergunta aberta não tem `merged_into` (uma mesclada não é aberta, `derive.ts:419`) nem `resolved_by`, então não entra em nenhuma das quatro contagens com ou sem o filtro.
  - `gate.ts:42` sem `q.merged_into !== null &&`: toda pergunta fechada da feature aberta que não é mesclada tem `answered_by` (o autor da resposta, ou `broker` no default); só o `feature_closed` fecha sem resposta, e ele tira a feature do modal.
  - `gate.ts:72` sem o `filter((line) => line.includes("|"))`: a linha sem `|` de um `diffstat` é o total (`N files changed, …`), que nunca é o texto antes do `|` de uma linha de arquivo.
  - `gate.ts:80` sem `t.planned &&`: um ticket com `verdict` recebeu `task`, que exige ticket do `plan` (`send.ts:101`), e um `plan` novo não tira um ticket começado (`plan.ts:76`): ele fica com `dropped: true`.
- **Cada teste novo falha com a sua mutação e passa sem ela**, na mesma cópia:

| Tarefa | Commit | Mutação | Testes que falham |
| ------ | ------ | ------- | ----------------- |
| T39 (Fix 9) | `439c2e1` | V15, `keys.ts:126` sem `.filter((g) => g.pending)` | 1, o de T39 |
| T40 (Fix 10) | `97ac84d` | V18, `keys.ts:200` `view.squad.requests.map((r) => r.request)` | 1, o de T40 |
| T41 (Fix 11) | `4380b38` | V10, `derive.ts:252` sem `&& e.request_seq === request.seq` | 2, os dois de T41 |
| T42 (Fix 12) | `465cd7e` | V23, `permission.ts:112` `squad.requests.length`; e `permission.ts:47` com todos os pedidos | 1 cada, o de T42 |
| T43 (Fix 13) | `2219259` | V28, `gate.ts:80` sem `&& !t.dropped`; V27, `gate.ts:28` `live.reduce` | 1 cada, o de T43 |
| T44 | `f0b857b` | K134, `keys.ts:134` `queue.find(() => true)` | 1, o de T44 |
| T45 | `abed948` | K398, `keys.ts:398` `gates.find(() => true)` | 1, o de T45 |
| T46 | `20ab72b` | K408, `keys.ts:408` `requests.find(() => true)` | 1, o de T46 |
| T47 | `1fcba77` | G82a, `gate.ts:82` sem `row.event.kind === "verdict" &&` | 1, o de T47 |

- A suíte em `1fcba77`: Windows 11, Bun 1.3.14, `tsc` 0 e 2449 pass, 5 skip, 0 fail, 96 arquivos, 142 s; Linux, contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps` sobre um clone `core.autocrlf=false` montado só para leitura, `tsc` 0 e 3 de 3 execuções com 2453 pass, 1 skip, 0 fail, 96 arquivos, entre 91 e 95 s.
- Na spec, os 97 requisitos passam a `Verified`: GAT-43, GAT-47, GAT-50, GAT-61, GAT-65, GAT-70 e GAT-71 pelos testes de T39 a T43, e GAT-50, GAT-59, GAT-70 e GAT-47 também pelos de T44 a T47.
- **O que ficou sem cobrir**, por não haver quarta volta: a varredura e a conferência das mutações foram do autor dos testes, não de um Verifier independente; nenhuma releitura independente dos dez testes novos; a varredura só trocou predicados de `filter`/`find`, sem outros tipos de mutação nesses arquivos. `validate_state.py gate` continua saindo com 1, porque o veredito acima é FAIL: é o estado aceito.
