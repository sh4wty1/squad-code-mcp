# TUI leitura Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/tui-leitura/design.md`
**Status**: Approved

Regras do repositório que valem para toda tarefa:

- Comandos rodam de dentro de `broker/`. `bun` é o 1.3.14; Python é `py -3`.
- Mensagem de commit: uma frase imperativa em inglês, em minúsculas, sem prefixo de Conventional Commits (veja `git log`), com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` no fim. `check_commit.py` não se aplica.
- Código, comentários e nomes em inglês, no estilo dos arquivos vizinhos; o texto que aparece na tela é o português dos frames.
- Nunca subir `broker.ts` ou `server.ts` sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.
- O protótipo está em `docs/claude-design-handoff/Handoff-Design.zip` (`Squad TUI.dc.html`). Extraia-o para um diretório temporário fora do repositório para ler as funções de desenho.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `broker/CLAUDE.md` (comandos), `.specs/STATE.md` Handoff (como rodar a suíte). Sem limiar de cobertura configurado: valem os defaults fortes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Derivação (`shared/derive.ts`) | unit | Todos os ramos; 1:1 com os ACs TUI-01 a TUI-18; todo edge case da spec que toca a derivação | `broker/test/unit/derive-squad.test.ts` | `bun test test/unit` |
| Tela pura (`tui/grid.ts`, `tui/feed.ts`, `tui/activity.ts`, `tui/screens/*.ts`) | unit | 1:1 com os ACs; cada frame de leitura da tela é um caso; todo desvio classificado | `broker/test/unit/tui-*.test.ts` | `bun test test/unit` |
| Processo (`tui/ansi.ts`, `tui/config.ts`, `tui/reader.ts`, `tui/keys.ts`) | unit | Caminho feliz, cada falha da spec e cada valor inválido de configuração | `broker/test/unit/tui-*.test.ts` | `bun test test/unit` |
| Entrada (`tui.ts`, `tui/probe.ts`) | integration | Processo real: saída fora de terminal, leitura de um broker real | `broker/test/integration/tui.test.ts` | `bun test` |
| Frames e ferramenta de extração (`test/frames/`) | none | - (build gate only) | - | build gate only |
| Documentação | none | - | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefa só com teste de unidade | `bun test test/unit` |
| Full | Depois de tarefa com teste de integração | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |
| Build | Última tarefa de cada fase, e tarefa sem teste | `bun node_modules/typescript/bin/tsc --noEmit && bun test` |

O repositório não tem linter. `EVT-43` em `test/integration/routes.test.ts` falha de vez em quando por poucos ms: rodar de novo.

---

## Execution Plan

### Phase 1: Fundação

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Derivação

```
T6 → T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 3: Feed e tela principal

```
T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21
```

### Phase 4: Outras telas

```
T22 → T23 → T24 → T25 → T26
```

### Phase 5: Processo

```
T27 → T28 → T29 → T30
```

---

## Task Breakdown

### T1: Sonda de largura dos glifos

**What**: A lista dos glifos fora do ASCII que as telas usam e a sonda que mede cada um no terminal.
**Where**: `broker/tui/probe.ts`
**Depends on**: None
**Reuses**: `broker/tui/glyphs.ts` e `broker/tui/probe.ts` já escritos na resolução da pergunta aberta
**Requirement**: TUI-59

**Done when**:

- [x] `bun tui/probe.ts` fora de um terminal sai com 1 (teste de integração em `test/integration/tui.test.ts`)
- [x] Todo caractere acima de U+024F que aparece em `test/frames/*.txt` está em `GLYPHS` (teste de unidade em `test/unit/tui-glyphs.test.ts`)
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

### T2: Frames do protótipo como arquivos de teste

**What**: Os 41 frames de leitura em texto e a ferramenta que os extrai do protótipo.
**Where**: `broker/test/frames/extract.ts`
**Depends on**: T1
**Reuses**: Extração já feita para `broker/test/frames/*.txt`
**Requirement**: TUI-43

**Done when**:

- [x] `broker/test/frames/` tem um `.txt` para cada frame de leitura listado na spec
- [x] `bun test/frames/extract.ts <html> <dir>` reproduz os mesmos arquivos
- [x] Gate build passa

**Tests**: none
**Gate**: build

---

### T3: Grade de células

**What**: O buffer 120×40 com `put`, `segs`, `bg`, `clear`, `box`, `sep`, `dim`, `text`, e os auxiliares de texto.
**Where**: `broker/tui/grid.ts`
**Depends on**: T2
**Reuses**: `Grid`, `L`, `tr`, `pad`, `wrap`, `mmss`, `ageS` do protótipo
**Requirement**: TUI-19

**Done when**:

- [x] `put` escreve caractere, cor, fundo e negrito, corta fora da grade e devolve a coluna seguinte
- [x] `box`, `sep`, `dim`, `clear` e `bg` dão o mesmo resultado do protótipo para os mesmos argumentos
- [x] `cut` corta com `…`, `wrap` quebra por palavra e parte a palavra maior que a largura, `age` e `mmss` formatam como o protótipo, `clock` dá `HH:MM:SS` local
- [x] Testes em `test/unit/tui-grid.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T4: Saída ANSI e troca de glifos

**What**: `paint` com só as linhas que mudaram, as 16 cores e negrito, e `parseGlyphs`.
**Where**: `broker/tui/ansi.ts`
**Depends on**: T3
**Reuses**: `grid.ts`
**Requirement**: TUI-56, TUI-61

**Done when**:

- [x] `paint(next, null)` escreve todas as linhas; `paint(next, prev)` só as que diferem, cada uma com o posicionamento do cursor da sua linha
- [x] Cada cor do protótipo vira o SGR do design, com negrito e fundo
- [x] Um glifo com substituto sai trocado; `parseGlyphs("⚠=!,⟳=~")` devolve os dois pares; um par sem exatamente um caractere de cada lado lança com o par na mensagem
- [x] Testes em `test/unit/tui-ansi.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T5: Preços e intervalo de leitura

**What**: A tabela de preços embutida e por `SQUAD_PRICES`, `cost` e `readIntervalMs`.
**Where**: `broker/tui/config.ts`
**Depends on**: T4
**Reuses**: Padrão de `broker/shared/config.ts`
**Requirement**: TUI-57, TUI-58

**Tools**:

- Skill: `claude-api` para os preços atuais dos modelos Claude em `prices.json`; nunca de memória

**Done when**:

- [x] `broker/tui/prices.json` tem dólares por milhão de tokens por modelo e tipo de token, tirados da referência da skill
- [x] `prices(env)` lê `SQUAD_PRICES` quando definida; arquivo ausente ou fora do formato lança com o caminho
- [x] `cost` soma por modelo e tipo; modelo fora da tabela custa zero
- [x] `readIntervalMs` devolve `SQUAD_POLL_INTERVAL_MS` quando é inteiro positivo e 1000 para ausente, vazio, `abc`, `0`, `-5` e `1.5`
- [x] Testes em `test/unit/tui-config.test.ts`; gate build passa

**Tests**: unit
**Gate**: build

---

### T6: Presença, bloqueio e pedido de permissão aberto

**What**: `SQUAD`, `presence`, `openPermissions` e o bloqueio declarado de um agente.
**Where**: `broker/shared/derive.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: Estilo de `tickets` e `features` no mesmo arquivo
**Requirement**: TUI-01, TUI-02, TUI-03, TUI-04

**Done when**:

- [x] Nome sem evento de presença não tem entrada; último `peer_left` dá offline com o `ts`; dois `peer_joined` seguidos dão no ar
- [x] Um pedido fecha com a `permission_decision` que o cita e com qualquer evento posterior do mesmo peer; `refused` e `unblocked` do broker não fecham; decisão com `request_seq` inexistente é ignorada
- [x] `blocked` sem `unblocked` posterior com o nome em `peer` dá o `reason`
- [x] Testes em `test/unit/derive-squad.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T7: Perguntas e gates a partir dos eventos

**What**: `questions(events)` e `gates(events)`.
**Where**: `broker/shared/derive.ts`
**Depends on**: T6
**Reuses**: Tipos `question`, `answer`, `question_merged`, `gate`, `gate_decision` de `contract.ts`
**Requirement**: TUI-05, TUI-06

**Done when**:

- [x] Pergunta aberta, holder, rota, `reached_human_ts` e prazo (240 por default) conforme Assumptions
- [x] Mesclada sai das abertas e fecha com a de destino
- [x] Gate com `comment` continua pendente; com `approve` ou `reject` fecha
- [x] Testes em `test/unit/derive-squad.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T8: Tokens por agente

**What**: `usageTotals(events, sinceSeq?)` com o total da sessão e o da feature.
**Where**: `broker/shared/derive.ts`
**Depends on**: T7
**Reuses**: Regra de `usage` da fatia Event
**Requirement**: TUI-17

**Done when**:

- [x] O total soma o `usage` mais recente por `session_id` e `model`; um `usage` repetido não muda o total
- [x] O total da feature desconta o último `usage` anterior ao `feature_opened` de cada `session_id` e `model`, e conta inteiro o de uma sessão que começou depois
- [x] Testes em `test/unit/derive-squad.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T9: Status do ticket

**What**: O status de cada ticket na ordem de TUI-14.
**Where**: `broker/shared/derive.ts`
**Depends on**: T8
**Reuses**: `tickets()`, `REWORK_LIMIT`
**Requirement**: TUI-14, TUI-15

**Done when**:

- [x] Um caso por status, e um caso para cada par vizinho da ordem em que as duas regras valem
- [x] `question`, `answer` e `blocked` com `ticket_ref` não mudam o último evento do ticket
- [x] Ticket com `rework` como último evento, abaixo do limite, é `working`
- [x] Testes em `test/unit/derive-squad.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T10: Dívidas, turno e status do agente

**What**: A precedência de TUI-12 para os oito status, com a dívida de holder de pergunta.
**Where**: `broker/shared/derive.ts`
**Depends on**: T9
**Reuses**: `owed()`, `presence`, `openPermissions`, `questions`, `gates`
**Requirement**: TUI-05, TUI-06, TUI-07, TUI-08, TUI-09, TUI-10, TUI-11, TUI-12, TUI-13

**Done when**:

- [x] Um caso por status e por papel que a regra cita
- [x] Um caso para cada par vizinho da precedência em que as duas regras valem, com o resultado da mais forte
- [x] Sem feature aberta só saem `never`, `offline`, `blocked` e `idle`
- [x] Em turno: o mais recente entre `turn_started` e `usage` do agente
- [x] Testes em `test/unit/derive-squad.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T11: Mensagem sem reação

**What**: A idade da mensagem mais antiga endereçada ao agente sem evento dele depois.
**Where**: `broker/shared/derive.ts`
**Depends on**: T10
**Reuses**: "Evento do peer" das Assumptions
**Requirement**: TUI-16

**Done when**:

- [x] 119999 ms não aparece; 120000 ms aparece
- [x] Um evento do agente com `seq` maior zera; um `refused` com o nome dele em `peer` não zera
- [x] Agente fora do ar não tem "sem reação"
- [x] Testes em `test/unit/derive-squad.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T12: `squad(events, now)`

**What**: A função que junta tudo no `Squad` do design.
**Where**: `broker/shared/derive.ts`
**Depends on**: T11
**Reuses**: Tudo de T6 a T11
**Requirement**: TUI-18

**Done when**:

- [x] Devolve feature aberta, última fechada, versão do plano, agentes na ordem de `SQUAD`, tickets na ordem do plano, perguntas, gates, permissões e tokens
- [x] Duas chamadas com os mesmos argumentos dão resultados iguais em profundidade, e os eventos de entrada não são alterados
- [x] Eventos fora de ordem de `seq` dão o mesmo resultado; kind desconhecido é ignorado
- [x] `broker/CLAUDE.md` descreve o que `derive.ts` passou a fazer
- [x] Testes em `test/unit/derive-squad.test.ts`; gate build passa

**Tests**: unit
**Gate**: build

---

### T13: Logs dos frames

**What**: Os logs de teste que reproduzem os cenários do protótipo (`main`, `gate`, `idle`, `error`, `offline`, `back`, `perm`, `permq`, `stall`, `plan`, `drop`, `esc`, `open1`, `open2`, `aband`, `never`, `partial`, `leftover`, `leftperm` e as variantes dos frames de leitura).
**Where**: `broker/test/frames/logs.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: Arrays `MAIN`, `FINAL`, `IDLE_X`, `ERR_X` etc. do protótipo; `SquadEvent`
**Requirement**: TUI-43

**Done when**:

- [x] Cada cenário é uma lista de `SquadEvent` com os horários, resumos e `seq` do protótipo, mais os eventos que o protótipo não tem e a derivação precisa (`peer_joined`, `turn_started`, `usage`, `blocked`, `plan`, `feature_opened`)
- [x] Cada cenário exporta também o `agora` do frame
- [x] `tsc` aceita todos os eventos como `SquadEvent`; gate build passa

**Tests**: none
**Gate**: build

---

### T14: Linhas do feed

**What**: `feed(events, now)` com as linhas de mensagem e de sistema.
**Where**: `broker/tui/feed.ts`
**Depends on**: T13
**Reuses**: `squad`, `questions`, `tickets`
**Requirement**: TUI-20, TUI-21, TUI-22, TUI-23, TUI-24, TUI-25, TUI-26, TUI-27

**Done when**:

- [x] Uma linha por kind de mensagem, com rótulos curtos e `summary` de uma linha só
- [x] As linhas de sistema de TUI-21, TUI-22 e TUI-24 com o texto exato da spec, incluindo `entrou` e `voltou`, `sessão morta` e `sessão encerrada`, e a versão do plano
- [x] Recusas iguais e vizinhas viram uma linha com `×N`; uma linha diferente entre elas separa
- [x] A linha de `stalled` sai no `usage` certo e não sai quando o agente não deve nada; a de limite sai depois do terceiro `rework` e não depois do segundo
- [x] Nenhuma linha para `turn_started`, `unblocked` e `usage` comum; kind desconhecido não gera linha; nome fora do squad vira os três primeiros caracteres
- [x] Testes em `test/unit/tui-feed.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T15: Atividade, selos e lado direito do rodapé

**What**: As três tabelas do design como funções puras sobre o `Squad`.
**Where**: `broker/tui/activity.ts`
**Depends on**: T14
**Reuses**: `Squad` do design
**Requirement**: TUI-35, TUI-41

**Done when**:

- [x] Uma asserção por linha da tabela de atividade
- [x] Selos: forma longa com um, curta com mais de um, na ordem do design
- [x] Lado direito: uma asserção por item da lista, na ordem de prioridade
- [x] Testes em `test/unit/tui-activity.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T16: Linha 0, abas, selos e teclas

**What**: `chrome` e `stats`: as linhas 0, 1, 38 e 39.
**Where**: `broker/tui/screens/chrome.ts`
**Depends on**: T15
**Reuses**: `chrome`, `stats`, `drawKeys` do protótipo; `activity.ts`
**Requirement**: TUI-33, TUI-34, TUI-41, TUI-42

**Done when**:

- [x] As nove linhas do frame 26c saem iguais para os nove estados (com e sem projeto, título longo, desconectado, sem feature, nenhuma feature)
- [x] `? N` conta só perguntas com holder `human`, com fundo vermelho se alguma é bloqueante
- [x] As seis linhas do frame 30 saem iguais para os seis estados de tokens e escopo
- [x] Testes em `test/unit/tui-chrome.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T17: Painéis de agentes e de tickets

**What**: A coluna esquerda da tela principal.
**Where**: `broker/tui/screens/main.ts`
**Depends on**: T16
**Reuses**: Trecho de agentes e tickets de `rMain`
**Requirement**: TUI-35, TUI-36, TUI-37, TUI-38

**Done when**:

- [x] A terceira linha do agente segue a ordem de TUI-35, uma asserção por alternativa
- [x] Título `agentes · 6` e `agentes · 2/6 no ar`
- [x] Tickets em duas linhas até três, uma linha de quatro a sete, `+N tickets` acima de sete; as notas de TUI-37; os três textos de painel vazio
- [x] Colunas 0 a 27 dos frames 01, 10, 13a, 14, 23a, 24a, 24c, 25a, 26a, 28a e 28b batem, fora os desvios declarados
- [x] Testes em `test/unit/tui-main.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T18: Painel do feed

**What**: O feed desenhado: cabeçalho, linhas, cores, cinza, réguas, faixas e rolagem.
**Where**: `broker/tui/screens/main.ts`
**Depends on**: T17
**Reuses**: `feedRow` e o trecho de feed de `rMain`
**Requirement**: TUI-28, TUI-29, TUI-30, TUI-31, TUI-32

**Done when**:

- [x] As cores de TUI-28 por kind e desfecho, cada uma com asserção na célula
- [x] Linhas anteriores em cinza e a régua, nos três textos de TUI-29
- [x] As três faixas de TUI-30 e TUI-31, e `○ log vazio`
- [x] 33 linhas visíveis; a selecionada acima delas rola a janela
- [x] Colunas 28 a 85 dos frames 01, 09a, 26b, 27a, 28a, 29a e 29c batem, fora os desvios declarados
- [x] Testes em `test/unit/tui-main.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T19: Detalhe de mensagem e de linha de sistema

**What**: `detailLines` para a linha selecionada.
**Where**: `broker/tui/screens/detail.ts`
**Depends on**: T18
**Reuses**: `detailLines`, `threadRows`, `loadRows`, `openRows`, `endRows`, `joinRows` do protótipo
**Requirement**: TUI-39

**Done when**:

- [x] Mensagem: cabeçalho, corpo em 30 colunas cortado para caber, critérios do `verdict`, cinco últimas do ticket, loadout do `task`
- [x] Um bloco por tipo de linha de sistema: `blocked`, saída, volta, entrada, `stalled`, plano, recusa, abertura, encerramento, pedido de permissão
- [x] Testes em `test/unit/tui-detail.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T20: Resumo da última feature e broker sem feature

**What**: O painel de detalhe sem linha selecionada.
**Where**: `broker/tui/screens/detail.ts`
**Depends on**: T19
**Reuses**: `sumRows`, `noSumRows`, `tkSum`, `featSpan` do protótipo
**Requirement**: TUI-40

**Done when**:

- [x] Resumo de entregue e de abandonada com e sem motivo; linha do gate aprovado; tickets com o status em que pararam; perguntas por tipo de resolução; duração, mensagens e custo
- [x] Sem nenhuma feature: o bloco do frame 28a
- [x] Testes em `test/unit/tui-detail.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T21: Frames da tela principal

**What**: O teste que desenha cada frame da tela principal a partir do seu log e a tabela de desvios.
**Where**: `broker/test/unit/tui-frames.test.ts`
**Depends on**: T20
**Reuses**: `test/frames/logs.ts`, `test/frames/*.txt`
**Requirement**: TUI-43

**Done when**:

- [x] Um caso para cada um de 01, 09a, 09b, 10, 13a, 13c, 14, 15a, 18a, 19a, 22c, 22g, 22h, 23a, 24a, 24b, 24c, 25a, 26a, 26b, 27a, 27b, 27c, 28a, 28b, 29a, 29c
- [x] Toda linha fora de `DEVIATIONS` bate com o frame; toda entrada de `DEVIATIONS` tem classe e motivo, e a linha desenhada bate com o `expected` dela
- [x] Um teste falha se `DEVIATIONS` tem entrada cuja linha já bate com o frame (desvio morto)
- [x] Gate build passa

**Tests**: unit
**Gate**: build

---

### T22: Topologia

**What**: A tela da estrela e o painel de arestas.
**Where**: `broker/tui/screens/topology.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `rTopo`, `node`, `edgePath` do protótipo
**Requirement**: TUI-44, TUI-45

**Done when**:

- [x] A aresta ativa de cada par permitido sai no caminho do protótipo, em cor clara e negrito; sem feature, cor normal e `○ última`
- [x] O painel de arestas com as cinco partes de TUI-45
- [x] Frames 02, 13b, 23b, 28c e 29b entram em `tui-frames.test.ts` com os seus desvios
- [x] Testes em `test/unit/tui-topology.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T23: Thread de um ticket

**What**: A tela de thread derivada dos eventos do ticket.
**Where**: `broker/tui/screens/thread.ts`
**Depends on**: T22
**Reuses**: `rThread` do protótipo; `questions`, `tickets`
**Requirement**: TUI-46, TUI-47, TUI-48

**Done when**:

- [x] Uma asserção por anotação de TUI-47
- [x] Matriz de critérios, vereditos com `passou/total`, notas do judge e perguntas do ticket
- [x] Ticket `planned` e ticket `dropped` conforme TUI-48; dobra `… N eventos antes · k rola` quando não cabe
- [x] Frames 03, 15b, 24d e 25b entram em `tui-frames.test.ts` com os seus desvios
- [x] Testes em `test/unit/tui-thread.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T24: Legenda e atalhos

**What**: A tela de ajuda.
**Where**: `broker/tui/screens/help.ts`
**Depends on**: T23
**Reuses**: `rHelp` do protótipo
**Requirement**: TUI-49

**Done when**:

- [x] Frame 11 entra em `tui-frames.test.ts`; os desvios são só as linhas que citam tecla ou tela fora da fatia, classe D3
- [x] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### T25: Terminal pequeno

**What**: A mensagem do frame 21 com o tamanho atual.
**Where**: `broker/tui/screens/small.ts`
**Depends on**: T24
**Reuses**: `rSmall` do protótipo
**Requirement**: TUI-54

**Done when**:

- [x] `small(80, 24)` bate com o frame 21; `small(100, 30)` mostra `100 × 30` centralizado na grade de 100×30
- [x] Testes em `test/unit/tui-frames.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T26: Broker desconectado

**What**: A tela congelada do frame 12.
**Where**: `broker/tui/screens/down.ts`
**Depends on**: T25
**Reuses**: `rBrokerDown` do protótipo; `main`
**Requirement**: TUI-51

**Done when**:

- [x] Frame 12 entra em `tui-frames.test.ts`: tela em cinza, `○ congelado`, `broker ○ desconectado · 12s`, tentativa no rodapé
- [x] O número de segundos e o da tentativa vêm de `view.down`
- [x] Gate build passa

**Tests**: unit
**Gate**: build

---

### T27: Leitura por cursor

**What**: `createReader` com cursor, falha, retomada e reinício do banco.
**Where**: `broker/tui/reader.ts`
**Depends on**: None (a fase anterior inteira)
**Reuses**: `brokerUrl`
**Requirement**: TUI-50, TUI-51, TUI-52, TUI-53, TUI-55

**Done when**:

- [x] Com `fetch` falso: eventos acrescentados em ordem de `seq`, um `seq` já visto não entra duas vezes, cursor igual a `last_seq`
- [x] Conexão recusada, tempo esgotado, status 500, corpo que não é JSON, `events` que não é lista e `last_seq` que não é inteiro: `ok: false` e o log igual
- [x] Depois de uma falha a leitura seguinte usa o mesmo cursor
- [x] `last_seq` menor que o cursor esvazia o log e volta ao cursor 0
- [x] O `fetch` falso só vê `GET` em `/events?after=`
- [x] Testes em `test/unit/tui-reader.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T28: Teclas

**What**: `press(ui, key, view)`, o redutor puro do estado de tela.
**Where**: `broker/tui/keys.ts`
**Depends on**: T27
**Reuses**: `onKey` do protótipo, só o ramo sem modal
**Requirement**: TUI-42, TUI-62, TUI-63

**Done when**:

- [x] Uma asserção por tecla de TUI-62, incluindo as setas como sequência de escape crua e `shift+tab`
- [x] `g`, `x`, `4` e `enter` sobre pergunta aberta com holder `human` dão o aviso da fatia certa por 4 s e não trocam de tela
- [x] `t` alterna com feature aberta e avisa sem ela; `b` vai à bloqueante ou avisa `nenhuma bloqueante`
- [x] Seleção mantida quando chegam linhas novas; `p` congela as linhas e a seleção
- [x] Testes em `test/unit/tui-keys.test.ts`; gate quick passa

**Tests**: unit
**Gate**: quick

---

### T29: Processo da TUI

**What**: `bun tui.ts`: configuração, terminal, laço de leitura e desenho, redimensionamento e saída.
**Where**: `broker/tui.ts`
**Depends on**: T28
**Reuses**: Tudo; `projectOf`, `getGitRoot`
**Requirement**: TUI-54, TUI-60, TUI-64

**Done when**:

- [ ] O laço é uma função com `fetch`, relógio, tamanho do terminal, entrada e saída injetados; o processo só a liga ao terminal real
- [ ] Configuração inválida sai com 1 antes de entrar na tela alternativa
- [ ] Entra e sai da tela alternativa, do cursor escondido e do modo cru em `q`, `ctrl+c`, `SIGTERM` e erro não tratado
- [ ] Terminal menor que 120×40 desenha a tela pequena e volta quando cresce; redimensionar redesenha inteiro
- [ ] O projeto vem do diretório de lançamento; fora de repositório, `null`
- [ ] Teste de integração em `test/integration/tui.test.ts`: broker real com banco temporário, uma feature aberta pela rota, e o laço com saída capturada mostra o título da feature
- [ ] Gate full passa

**Tests**: integration
**Gate**: full

---

### T30: Documentação e script

**What**: `broker/CLAUDE.md`, `broker/README.md` e o script `tui` do pacote.
**Where**: `broker/CLAUDE.md`
**Depends on**: T29
**Reuses**: Seções existentes dos dois arquivos
**Requirement**: TUI-59, TUI-60

**Done when**:

- [ ] `CLAUDE.md` lista os módulos de `tui/` e troca `bun x tsc --noEmit` pelo comando que funciona
- [ ] `README.md` diz como rodar a TUI e a sonda, e as três variáveis (`SQUAD_TUI_GLYPHS`, `SQUAD_PRICES`, `SQUAD_POLL_INTERVAL_MS`)
- [ ] `package.json` tem o script `tui`
- [ ] Gate build passa

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10 → T11 → T12
Phase 3:  T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21
Phase 4:  T22 → T23 → T24 → T25 → T26
Phase 5:  T27 → T28 → T29 → T30
```

Lotes: 30 tarefas em cinco workers, um por fase (5, 7, 9, 5 e 4 tarefas). A fase 3 passa
do orçamento de 7 porque é uma cadeia só: cada painel é testado contra os frames que a
tarefa anterior deixou desenhando.

---

## Diagram-Definition Cross-Check

Cadeia linear: cada tarefa depende da anterior, no diagrama e no corpo. T1 não depende de
nenhuma. Nenhuma dependência aponta para fase posterior.

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | Entrada | integration | integration | ✅ |
| T2 | Frames | none | none | ✅ |
| T3 | Tela pura | unit | unit | ✅ |
| T4, T5 | Processo | unit | unit | ✅ |
| T6 a T12 | Derivação | unit | unit | ✅ |
| T13 | Frames | none | none | ✅ |
| T14 a T20 | Tela pura | unit | unit | ✅ |
| T21 | Tela pura (teste de frames) | unit | unit | ✅ |
| T22 a T26 | Tela pura | unit | unit | ✅ |
| T27, T28 | Processo | unit | unit | ✅ |
| T29 | Entrada | integration | integration | ✅ |
| T30 | Documentação | none | none | ✅ |
