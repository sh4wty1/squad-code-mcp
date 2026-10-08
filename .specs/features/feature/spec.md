# Feature Specification

Fonte: fatia Feature de `.design/squad-mvp.md`, ADR-002, ADR-004, ADR-009, ADR-010 e
ADR-012, STATE AD-006 e o Handoff de `.specs/STATE.md`. Esta spec deriva da fatia; onde a
fatia não decide, a escolha está em "Assumptions & Open Questions".

## Problem Statement

Depois da fatia Event o broker grava e entrega `task`, `result` e `verdict`, mas só dentro
de uma feature aberta, e ninguém consegue abrir uma: a tabela `features` existe e só os
testes a preenchem (STATE AD-006). Em uso real todo envio recebe `no_open_feature`. Falta a
mother abrir a feature com a spec e o workflow travados e encerrá-la, com o evento e a
linha de `features` gravados juntos.

## Goals

- [x] A mother abre uma feature por `/open-feature`, e a partir daí `/send` e `/plan` deixam de responder `no_open_feature`.
- [x] A mother encerra a feature por `/close-feature`, e o squad volta a não ter feature aberta.
- [x] Nunca há duas features abertas: o broker recusa a segunda e o banco também.
- [x] `feature_opened` e `feature_closed` chegam às outras cinco posições do squad pelo canal.
- [x] `features` é reconstruível só a partir de `events`, e um teste de replay prova isso.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| `gate_required` ao encerrar como `delivered` | A fatia diz: "a regra entra com a slice Gate; antes dela o encerramento é aceito" |
| Resolver perguntas abertas e rejeitar gates pendentes ao encerrar como `abandoned` | As tabelas `questions` e `gates` não existem; cada efeito entra com a fatia Question e a fatia Gate |
| Conferir no git que `branch`, `base_branch`, `spec_ref` e `spec_commit` existem | ADR-012: "o broker não confere isso, só exige o campo". A regra de git é da skill da mother, fatia Papéis |
| Recusar `delivered` com ticket do plano ainda aberto | O design põe essa conferência no pedido de gate (`tickets_open`), fatia Gate |
| `ocioso desde`, cabeçalho da feature e tela "tudo idle" | Fatia TUI leitura. O `ts` do último `feature_closed` já sai de `GET /events` |
| Total de `usage` da feature | Fatia TUI leitura; aqui só o `feature_opened` que serve de marco |
| Mais de uma feature aberta | Fora do MVP no design |
| Reabrir uma feature fechada, ou mudar título, workflow, branch ou spec de uma aberta | Dois estados, e `workflow` é imutável; uma spec corrigida exige feature nova (ADR-012) |
| `SQUAD_POLL_INTERVAL_MS` não numérica virar `NaN` | Pendência da Event anotada no Handoff; não toca nenhum estado desta fatia |
| Comandos novos no `cli.ts` | Nenhum estado da fatia depende deles |
| Sessão real do Claude Code abrindo feature | Os testes usam cliente MCP de teste, como nas fatias anteriores |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| O que é "entregue a todos" | Uma linha em `deliveries` para cada um dos cinco nomes do squad que não são `mother`, com sessão registrada ou não. O evento tem `to_name` `*` | ADR-009: a entrega é por nome e espera a sessão. Um leader relançado recebe a abertura que perdeu. Custo: um nome nunca lançado (`worker-3`) acumula duas entregas por feature e as recebe todas quando subir | y |
| A mother recebe os próprios `feature_opened` e `feature_closed` | Não | Ela é a autora e tem o `seq` na resposta | y |
| Códigos de recusa | Nenhum novo. `feature_already_open`, `missing_field` e `edge_not_allowed` são da fatia; `invalid_field` (AD-005) cobre `workflow` e `outcome` fora da lista; `no_open_feature` cobre encerrar sem feature aberta | A fatia não nomeia os dois últimos casos, e os códigos já existem com esse sentido | y |
| Campos obrigatórios na abertura | Os seis: `title`, `workflow`, `branch`, `base_branch`, `spec_ref`, `spec_commit`, texto não vazio | A fatia só lista `spec_ref`, `spec_commit` e `workflow`, mas as seis colunas são `NOT NULL` e o evento leva as seis | y |
| Tamanho de `title` | Sem limite | A fatia não dá; quem corta para caber no cabeçalho é a TUI | y |
| `branch` igual a `base_branch` | Aceito | O broker não confere git (ADR-012) | y |
| `body` em `/close-feature` | Opcional; ausente vale texto vazio; presente e não texto recebe `missing_field` | Mesmo tratamento de `/send` (spec da Event). `abandoned` pode não ter o que dizer | y |
| `summary` e `body` dos dois eventos | `summary` vazio nos dois; `body` vazio em `feature_opened` e o `body` recebido em `feature_closed` | "Vazio em registro" na tabela `events`; `/open-feature` não tem `body` | y |
| Ordem das recusas | `/open-feature`: `unknown_peer` → `edge_not_allowed` → `feature_already_open` → `missing_field` → `invalid_field`. `/close-feature`: `unknown_peer` → `edge_not_allowed` → `no_open_feature` → `missing_field` → `invalid_field` | Mesma ordem de `/plan`: papel, estado, campos | y |
| Recusas que gravam `refused` | Todas as de `/open-feature` e `/close-feature` a um peer registrado, com `attempted_kind` `feature_opened` ou `feature_closed`. O `refused` de `feature_already_open` leva o `feature_id` da feature aberta | As duas rotas gravam evento em nome do peer (regra da Event, EVT-47) | y |
| Resposta das rotas | `/open-feature` responde `{ ok: true, feature_id, seq }` e `/close-feature` `{ ok: true, seq }` | A fatia dá `{ ok, feature_id }` e `{ ok }`; toda outra rota que grava evento devolve o `seq`, e a tool da mother o repassa | y |
| `feature_id` dos dois eventos | `feature_opened` leva o `id` da feature que ele abre; `feature_closed` o da que ele fecha | "`feature_id` em todos"; os dois pertencem à feature | y |
| `id` de uma feature | Inteiro crescente por banco, nunca reusado | O `feature_id` de eventos antigos não pode passar a apontar outra feature | y |
| `project` | O nome do diretório que contém o diretório git comum da mother quando este se chama `.git`; senão o último segmento do `git_root`; com `git_root` nulo, o último segmento do `cwd` da mother | "Derivado do `git_root` da mother"; `git_root` é nulo fora de repositório e a coluna é `NOT NULL` | y |
| Índice único | Índice único parcial em `features` para `closed_seq` nulo, criado também sobre um banco que já existe | Handoff: "não há índice único que impeça duas features abertas: é da Feature" | y |
| Tickets, bloqueios e entregas ao encerrar | Nada é gravado além do `feature_closed`: os tickets deixam de contar porque toda regra só lê a feature aberta; um `blocked` aberto continua aberto; entregas pendentes continuam pendentes | O bloqueio é do agente (Event), e a entrega espera o ack (ADR-009) | y |
| Replay | Uma função pura em `shared/derive.ts` devolve, a partir de todos os eventos, as linhas de `features` sem `project`. O teste a compara com a tabela | Key decision 1; `project` "não é campo do evento" | y |
| Nomes e texto das tools | `open_feature` e `close_feature`, só para a mother. Texto: `Feature <id> opened with seq N.` e `Recorded with seq N.`; recusa como nas outras tools | "Só a mother vê abrir e fechar feature"; a mother precisa do `feature_id` | y |
| Campos extras no corpo | Ignorados; `data` leva só os campos do contrato | Como em `/plan` (Event) | y |
| `null` num campo obrigatório | `missing_field` | Como na Event | y |
| Testes | `bun test`, unidade com SQLite em memória e integração com processos reais. Os helpers que hoje inserem a linha em `features` passam a abrir pela rota | Convenção em uso; a linha inserida à mão não tem `feature_opened` e quebraria o replay | y |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: validação de entrada → FEAT-04 a FEAT-06, FEAT-17 a
FEAT-19. Falha parcial → FEAT-08, FEAT-21 (evento, linha e entregas na mesma transação).
Idempotência e repetição → FEAT-03, FEAT-16 (a segunda chamada é recusada); entrega
repetida já coberta por EVT-42. Fronteira de autenticação → FEAT-02, FEAT-15; credencial
desconhecida já coberta por EVT-03. Limite de taxa → N/A porque o broker só escuta em
`127.0.0.1` para até seis sessões. Concorrência e ordem → FEAT-09 (índice único); corrida
entre handlers N/A porque são síncronos num processo único. Ciclo de vida do dado →
FEAT-22, FEAT-23 (nada é apagado ao fechar). Observabilidade → FEAT-10, FEAT-20.
Falha de dependência externa → N/A porque a fatia não chama nada fora do SQLite.
Integridade de transição → FEAT-03, FEAT-16, FEAT-24, FEAT-25.

---

## Definições

Valem as da spec da Event. Mais:

- **Feature aberta**: a linha de `features` com `closed_seq` nulo. Há no máximo uma, agora garantido por índice.
- **Os outros cinco**: `leader`, `judge`, `worker-1`, `worker-2` e `worker-3`.
- **Rotas com credencial**: as da Event mais `/open-feature` e `/close-feature`.

---

## User Stories

### P1: Abrir a feature ⭐ MVP

**User Story**: Como mother, quero abrir a feature com a spec e o workflow travados, para que o squad possa trabalhar nela.

**Why P1**: Sem feature aberta todo `task`, `result`, `verdict` e `plan` é recusado (AD-006).

**Acceptance Criteria**:

1. **FEAT-01** WHEN `POST /open-feature` recebe `{ id, title, workflow, branch, base_branch, spec_ref, spec_commit }` da mother, sem feature aberta e com os campos válidos THEN o broker SHALL gravar uma linha em `features` com os seis campos, `project`, `opened_seq` igual ao `seq` do evento, `closed_seq` e `outcome` nulos, gravar um evento `feature_opened` com `from_name` `mother`, `role_from` `mother`, `to_name` `*`, `summary` e `body` vazios, `ticket_ref` nulo, `feature_id` igual ao `id` da linha e `data` só com os seis campos, e responder `{ ok: true, feature_id, seq }`.
2. **FEAT-02** IF quem chama `/open-feature` não tem o papel `mother` THEN o broker SHALL responder `edge_not_allowed`, antes de qualquer outra recusa que não seja `unknown_peer`.
3. **FEAT-03** IF já existe feature aberta THEN o broker SHALL responder `feature_already_open` a `/open-feature`, antes de conferir os campos.
4. **FEAT-04** IF `title`, `workflow`, `branch`, `base_branch`, `spec_ref` ou `spec_commit` está ausente, é `null`, não é texto ou é texto vazio THEN o broker SHALL responder `missing_field`.
5. **FEAT-05** IF `workflow` não é `tlc` nem `matt-pocock` THEN o broker SHALL responder `invalid_field`.
6. **FEAT-06** IF `/open-feature` falha em mais de uma regra THEN o broker SHALL responder a primeira nesta ordem: `unknown_peer`, `edge_not_allowed`, `feature_already_open`, `missing_field`, `invalid_field`.
7. **FEAT-07** WHEN o broker grava um `feature_opened` THEN o broker SHALL gravar na mesma transação uma linha em `deliveries` para cada um dos outros cinco, com `acked_at` nulo, e nenhuma para `mother`.
8. **FEAT-08** IF a gravação da linha de `features` ou de uma entrega falha THEN o broker SHALL não gravar o `feature_opened`, a linha nem entrega alguma.
9. **FEAT-09** IF um `INSERT` ou `UPDATE` deixaria duas linhas de `features` com `closed_seq` nulo, por qualquer conexão THEN o banco SHALL abortar o comando com erro.
10. **FEAT-10** WHEN `/open-feature` recusa um peer registrado THEN o broker SHALL gravar um `refused` com `attempted_kind` `feature_opened`, nos termos de EVT-47, e não gravar linha em `features` nem entrega.
11. **FEAT-11** The broker SHALL preencher `project` com o nome do diretório que contém o `git_root` do registro da mother quando o último segmento do `git_root` é `.git`, com o último segmento do `git_root` nos outros casos, e com o último segmento do `cwd` do registro quando o `git_root` é nulo.
12. **FEAT-12** The broker SHALL dar a cada feature um `id` inteiro maior que o de toda feature já gravada no banco.
13. **FEAT-13** WHEN uma feature é aberta THEN o broker SHALL aceitar o `task` mother → leader e o `plan` seguintes, gravando-os com o `feature_id` dela, e responder a `/state` com `feature` igual a `{ id, title, workflow, branch, base_branch, spec_ref, spec_commit }` dela.

**Independent Test**: `mother` chama `/open-feature`; `GET /events` traz o `feature_opened`; o `task` da `mother` ao `leader`, antes recusado com `no_open_feature`, é aceito.

---

### P1: Encerrar a feature ⭐ MVP

**User Story**: Como mother, quero encerrar a feature como entregue ou abandonada, para que o squad fique livre para a próxima.

**Why P1**: Com uma feature aberta por vez, a que não fecha impede todas as seguintes.

**Acceptance Criteria**:

1. **FEAT-14** WHEN `POST /close-feature` recebe `{ id, outcome, body? }` da mother, com feature aberta e `outcome` `delivered` ou `abandoned` THEN o broker SHALL gravar um evento `feature_closed` com `from_name` `mother`, `role_from` `mother`, `to_name` `*`, `summary` vazio, `body` igual ao recebido (vazio se ausente), `ticket_ref` nulo, `feature_id` da feature que fecha e `data` `{ "outcome": <outcome> }`, preencher na linha dela `closed_seq` com o `seq` do evento e `outcome`, e responder `{ ok: true, seq }`.
2. **FEAT-15** IF quem chama `/close-feature` não tem o papel `mother` THEN o broker SHALL responder `edge_not_allowed`, antes de qualquer outra recusa que não seja `unknown_peer`.
3. **FEAT-16** IF não há feature aberta THEN o broker SHALL responder `no_open_feature` a `/close-feature`, antes de conferir os campos.
4. **FEAT-17** IF `outcome` está ausente, é `null` ou não é texto, ou `body` está presente e não é texto THEN o broker SHALL responder `missing_field`.
5. **FEAT-18** IF `outcome` é texto e não é `delivered` nem `abandoned` THEN o broker SHALL responder `invalid_field`.
6. **FEAT-19** IF `/close-feature` falha em mais de uma regra THEN o broker SHALL responder a primeira nesta ordem: `unknown_peer`, `edge_not_allowed`, `no_open_feature`, `missing_field`, `invalid_field`.
7. **FEAT-20** WHEN `/close-feature` recusa um peer registrado THEN o broker SHALL gravar um `refused` com `attempted_kind` `feature_closed`, nos termos de EVT-47, e manter a linha de `features` como estava.
8. **FEAT-21** WHEN o broker grava um `feature_closed` THEN o broker SHALL gravar na mesma transação a alteração da linha de `features` e uma linha em `deliveries` para cada um dos outros cinco; IF qualquer uma das três gravações falha THEN o broker SHALL não gravar nenhuma.
9. **FEAT-22** WHEN uma feature é fechada THEN o broker SHALL manter como estavam as linhas de `events` e de `deliveries` dela, inclusive as entregas pendentes, e não gravar nenhum evento além do `feature_closed`.
10. **FEAT-23** The broker SHALL aceitar `/close-feature` com `outcome` `delivered` sem conferir gate: nesta fatia a rota nunca responde `gate_required`.
11. **FEAT-24** WHEN uma feature é fechada THEN o broker SHALL responder `no_open_feature` ao `/send` e ao `/plan` seguintes, e `feature` nulo, `ticket` nulo e nenhuma dívida de `result`, `verdict`, `task` ou `plan` em `/state`.
12. **FEAT-25** WHEN uma feature é fechada THEN o broker SHALL aceitar um `/open-feature` seguinte, e SHALL ignorar na feature nova, em toda regra de estado, os eventos da anterior.

**Independent Test**: com feature aberta e um ticket em `working`, `mother` chama `/close-feature` com `abandoned`; `/state` do worker vem com `feature` e `ticket` nulos; uma nova `/open-feature` é aceita.

---

### P1: Features reconstruíveis do log ⭐ MVP

**User Story**: Como TUI, quero calcular a feature aberta e as fechadas só com o que `GET /events` devolve, e chegar ao mesmo que o broker tem na tabela.

**Why P1**: A projeção que diverge do log é o defeito que o ADR-002 proíbe, e a TUI não lê o banco.

**Acceptance Criteria**:

1. **FEAT-26** WHEN a função de derivação de features recebe todos os eventos do log, no formato de leitura THEN ela SHALL devolver, em ordem crescente de `id`, um item `{ id, title, workflow, branch, base_branch, spec_ref, spec_commit, opened_seq, closed_seq, outcome }` por `feature_opened`, com `id` igual ao `feature_id` do evento, `opened_seq` igual ao `seq` dele, e `closed_seq` e `outcome` do `feature_closed` de mesmo `feature_id`, ou nulos quando não há.
2. **FEAT-27** The broker SHALL manter `features`, sem a coluna `project`, igual ao que a função de FEAT-26 devolve para `GET /events`, depois de qualquer sequência de aberturas, encerramentos e recusas.
3. **FEAT-28** WHEN o broker sobe de novo sobre o mesmo banco THEN o broker SHALL ter a mesma feature aberta, ou nenhuma, e aplicar `feature_already_open` e `no_open_feature` como antes de parar.

**Independent Test**: abrir, fechar como `abandoned`, tentar fechar de novo, abrir outra; a função aplicada a `GET /events` devolve as mesmas duas linhas da tabela.

---

### P1: Tools da mother e entrega pelo canal ⭐ MVP

**User Story**: Como mother, quero abrir e fechar a feature por tools; como qualquer outro papel, quero ser avisado pelo canal.

**Why P1**: O modelo só alcança o broker pelas tools do seu papel (ADR-010), e a sessão ociosa só acorda pelo canal.

**Acceptance Criteria**:

1. **FEAT-29** WHEN o peer registrado é a `mother` THEN o servidor MCP SHALL listar `open_feature` e `close_feature` além das tools de EVT-89; para os outros papéis SHALL não listar nenhuma das duas.
2. **FEAT-30** WHEN `open_feature` é chamada THEN o servidor MCP SHALL chamar `/open-feature` com o seu `id` e os argumentos recebidos, e devolver o texto `Feature <feature_id> opened with seq <seq>.` quando aceito.
3. **FEAT-31** WHEN `close_feature` é chamada THEN o servidor MCP SHALL chamar `/close-feature` com o seu `id` e os argumentos recebidos, e devolver o texto `Recorded with seq <seq>.` quando aceito.
4. **FEAT-32** IF o broker recusa `open_feature` ou `close_feature` THEN o servidor MCP SHALL devolver erro com o `error` e o `hint` do broker, como em EVT-91.
5. **FEAT-33** WHEN o polling de um dos outros cinco devolve um `feature_opened` ou um `feature_closed` THEN o servidor MCP SHALL empurrá-lo pelo canal e confirmá-lo nos termos de EVT-82 e EVT-83, com os campos próprios do kind no `content`.

**Independent Test**: dois clientes MCP de teste, `mother` e `leader`: `mother` chama `open_feature` e o `leader` recebe a notificação de canal com `kind` `feature_opened`, `spec_ref` e `spec_commit`; o polling seguinte do `leader` vem vazio.

---

## Edge Cases

- WHEN `mother` abre uma feature com `leader` offline THEN o broker SHALL devolver o `feature_opened` no primeiro `/poll-messages` da sessão que registrar `leader` (FEAT-07, EVT-45).
- WHEN `mother` chama `/poll-messages` depois de abrir ou fechar THEN o broker SHALL não devolver o `feature_opened` nem o `feature_closed` dela (FEAT-07, FEAT-21).
- IF um worker ou o leader chama `/open-feature` com uma feature já aberta THEN o broker SHALL responder `edge_not_allowed`, não `feature_already_open` (FEAT-06).
- IF `/open-feature` é recusada com `feature_already_open` THEN o broker SHALL gravar o `refused` com o `feature_id` da feature aberta e manter a linha dela como estava (FEAT-10).
- IF `/close-feature` chega duas vezes THEN o broker SHALL responder `no_open_feature` à segunda e manter `closed_seq` e `outcome` da primeira (FEAT-16).
- WHEN uma feature fechada tinha um ticket `T` aberto para `worker-1` THEN o broker SHALL aceitar, na feature seguinte, um `task` de outro `ticket_ref` para `worker-1` e um `plan` com um ticket `T` novo (FEAT-25).
- WHEN uma feature é fechada com um peer bloqueado THEN o broker SHALL não gravar `unblocked` para ele (FEAT-22).
- WHEN `/blocked`, `/usage` ou `/turn-started` é chamada depois do encerramento THEN o broker SHALL gravar o evento com `feature_id` nulo (EVT-59).
- IF o corpo de `/open-feature` traz `feature_id`, `project`, `from` ou `opened_seq` THEN o broker SHALL ignorá-los (FEAT-01, EVT-02).
- WHEN o broker sobe sobre um banco criado pela fatia Event, sem o índice THEN o broker SHALL criar o índice e recusar a segunda feature aberta (FEAT-09).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FEAT-01 | P1: Abrir a feature | Execute | Verified |
| FEAT-02 | P1: Abrir a feature | Execute | Verified |
| FEAT-03 | P1: Abrir a feature | Execute | Verified |
| FEAT-04 | P1: Abrir a feature | Execute | Verified |
| FEAT-05 | P1: Abrir a feature | Execute | Verified |
| FEAT-06 | P1: Abrir a feature | Execute | Verified |
| FEAT-07 | P1: Abrir a feature | Execute | Verified |
| FEAT-08 | P1: Abrir a feature | Execute | Verified |
| FEAT-09 | P1: Abrir a feature | Execute | Verified |
| FEAT-10 | P1: Abrir a feature | Execute | Verified |
| FEAT-11 | P1: Abrir a feature | Execute | Verified |
| FEAT-12 | P1: Abrir a feature | Execute | Verified |
| FEAT-13 | P1: Abrir a feature | Execute | Verified |
| FEAT-14 | P1: Encerrar a feature | Execute | Verified |
| FEAT-15 | P1: Encerrar a feature | Execute | Verified |
| FEAT-16 | P1: Encerrar a feature | Execute | Verified |
| FEAT-17 | P1: Encerrar a feature | Execute | Verified |
| FEAT-18 | P1: Encerrar a feature | Execute | Verified |
| FEAT-19 | P1: Encerrar a feature | Execute | Verified |
| FEAT-20 | P1: Encerrar a feature | Execute | Verified |
| FEAT-21 | P1: Encerrar a feature | Execute | Verified |
| FEAT-22 | P1: Encerrar a feature | Execute | Verified |
| FEAT-23 | P1: Encerrar a feature | Execute | Verified |
| FEAT-24 | P1: Encerrar a feature | Execute | Verified |
| FEAT-25 | P1: Encerrar a feature | Execute | Verified |
| FEAT-26 | P1: Features reconstruíveis do log | Execute | Verified |
| FEAT-27 | P1: Features reconstruíveis do log | Execute | Verified |
| FEAT-28 | P1: Features reconstruíveis do log | Execute | Verified |
| FEAT-29 | P1: Tools da mother e entrega pelo canal | Execute | Verified |
| FEAT-30 | P1: Tools da mother e entrega pelo canal | Execute | Verified |
| FEAT-31 | P1: Tools da mother e entrega pelo canal | Execute | Verified |
| FEAT-32 | P1: Tools da mother e entrega pelo canal | Execute | Verified |
| FEAT-33 | P1: Tools da mother e entrega pelo canal | Execute | Verified |

**Coverage:** 33 total, 33 mapped to tasks, 0 unmapped. Verificados em `ae14f01`, relatório em `validation.md`.

---

## Success Criteria

- [x] Dois clientes MCP de teste, `mother` e `leader`, vão de `open_feature` a `close_feature` passando por um `task` e um `plan`, sem nenhuma linha escrita em `features` por fora das rotas.
- [x] Depois de qualquer sequência de aberturas e encerramentos, a função de derivação aplicada a `GET /events` devolve as linhas de `features`.
- [x] Nenhum caminho, do broker ou de outra conexão, deixa duas features abertas.
- [x] `bun node_modules/typescript/bin/tsc --noEmit` e `bun test` passam no Windows, e a spec registra se o Linux ficou sem rodar. Windows 11, bun 1.3.14: 539 testes, 536 passam, 3 pulados. O Linux ficou sem rodar: o WSL Debian da máquina não tem bun.
