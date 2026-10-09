# TUI leitura: rodada de correção 1

Handoff para quem vai fechar as lacunas que o Verifier achou. Escrito em 2026-10-09 sobre o
branch `feat/tui-leitura` em `a167cd7`. Leia inteiro antes de mexer em qualquer arquivo.

## O que aconteceu

A fatia TUI leitura foi implementada em 30 tarefas (`4657be1` a `1f377d5`). A suíte passa:
890 testes, 3 pulados, no Windows; 893, 0 pulados, no Linux. Depois da última tarefa, um
Verifier independente rodou e devolveu **FAIL**.

O FAIL não é de comportamento: o Verifier não achou nada que contradiga a spec. É dos
testes. Ele injetou 210 mutações no código, uma de cada vez, numa cópia separada, e rodou
a suíte em cada uma. Em 24 a suíte continuou passando. Seis são equivalentes (a mutação não
muda comportamento observável). As outras 18 são código quebrado que nenhum teste percebe.

O trabalho desta rodada é escrever os testes que matam essas mutações, corrigir um log de
teste dobrado e fixar quatro pontos que a spec não definia. Só muda código de produção onde
um teste novo mostrar que ele está errado, ou onde este documento disser.

## O que é o Verifier e por que ele reprova

O Verifier é o último passo da skill `tlc-spec-driven` (`.claude/skills/tlc-spec-driven/`,
checklist em `references/validate.md`). Regras que decidem o veredito:

- **Autor ≠ verificador.** Quem escreveu o código não verifica. Ele não herda contexto: lê a
  spec, o diff e os testes do zero.
- **Evidência ou zero.** Cada critério de aceitação (AC) da spec precisa de `arquivo:linha`
  com a expressão do `expect`. Sem isso, o AC conta como não coberto.
- **Resultado ancorado na spec.** O valor que o teste confere tem de ser o que a spec
  define, escrito como literal. Um teste que compara com uma constante importada do código
  sob teste não prova nada: se a constante estiver errada, o teste passa.
- **Sensor de discriminação.** Mutações de comportamento (inverter condição, trocar
  `findLast` por `find`, tirar um efeito) rodadas num `git worktree` temporário. Mutante que
  sobrevive e não é equivalente vira lacuna.
- **FAIL** se qualquer AC ficar sem evidência, se uma asserção passar sob uma implementação
  errada plausível, se qualquer mutante não equivalente sobreviver ou se a suíte falhar.

A consequência prática para quem corrige: **um teste novo só vale se falha com o mutante
aplicado e passa sem ele.** Para cada lacuna abaixo, aplique a mutação à mão, veja o teste
falhar, desfaça a mutação, veja passar. Um teste que passa nos dois casos não fecha nada.

O relatório completo está em `.specs/features/tui-leitura/validation.md`: tabela por AC, a
tabela das 210 mutações com o código antes e depois (seção "Discrimination Sensor", ids
como `D17`, `T13`), e a seção "Fix Plans". Este documento é o resumo operacional dele.

## Onde está cada coisa

Todos os caminhos de código são relativos a `broker/`, e os comandos rodam de dentro dele.

| O quê | Onde |
| ----- | ---- |
| Spec, com os 64 ACs e a tabela de Assumptions | `.specs/features/tui-leitura/spec.md` |
| Design, com as regras de texto, selos e a tabela de desvios de status | `.specs/features/tui-leitura/design.md` |
| Tarefas, com a matriz de testes e os comandos de gate | `.specs/features/tui-leitura/tasks.md` |
| Relatório do Verifier | `.specs/features/tui-leitura/validation.md` |
| Decisões do projeto | `.specs/STATE.md` (AD-008 a AD-011 são desta fatia) |
| Design do produto | `.design/squad-mvp.md` (derivação de status: linhas 349 a 364) |
| Derivação do estado do squad | `shared/derive.ts` |
| Tela | `tui/` (`grid.ts`, `ansi.ts`, `config.ts`, `feed.ts`, `activity.ts`, `reader.ts`, `keys.ts`, `probe.ts`, `screens/*.ts`) |
| Processo | `tui.ts` |
| Testes | `test/unit/derive-squad.test.ts`, `test/unit/tui-*.test.ts`, `test/integration/tui.test.ts` |
| Frames do protótipo e apoio | `test/frames/*.txt` (não editar), `logs.ts`, `view.ts`, `deviations.ts` |

## As lacunas

Cada linha: o id do mutante no relatório, o AC, a mutação que sobrevive e o teste que a
mata. "Feito" é o mutante falhar o teste novo.

### 1. Sequências do terminal comparadas com a constante do código (TUI-60)

- **A07** `tui/ansi.ts:29`: `ENTER = "\x1b[?1049h\x1b[?25l"` → `"\x1b[?1049h"` (não esconde o cursor).
- **A06** `tui/ansi.ts:30`: `LEAVE = "\x1b[?25h\x1b[?1049l"` → `"\x1b[?1049l"` (não mostra o cursor de novo).
- **Causa**: `test/unit/tui-loop.test.ts:77`, `:84`, `:101` e `test/integration/tui.test.ts:102`, `:113` comparam com `ENTER` e `LEAVE` importados de `tui/ansi.ts`.
- **Teste**: em `test/unit/tui-ansi.test.ts`, confira os dois literais uma vez: `ENTER` é `\x1b[?1049h\x1b[?25l` e `LEAVE` é `\x1b[?25h\x1b[?1049l`.

### 2. O que o laço entrega ao `paint` (TUI-61, TUI-56, TUI-58)

Os três estão em `tui.ts`, e a causa é a mesma: `test/unit/tui-loop.test.ts:68-71` sempre
lança o laço com `glyphs: new Map()` e nunca olha quanto um segundo desenho escreve.

- **T13** `tui.ts:93`: `paint(next, whole ? null : prev, settings.glyphs)` → `paint(next, null, settings.glyphs)`. O laço redesenha as 40 linhas a cada desenho.
  **Teste**: depois do primeiro desenho, pressione `j` e confira que o que foi escrito desde então tem o posicionamento de cursor só das linhas que mudaram.
- **T17** `tui.ts:93`: `settings.glyphs` não é passado ao `paint`.
  **Teste**: lance com `glyphs: new Map([["⚠", "!"]])` sobre o log do frame 10 e confira que a saída tem `!` e não tem `⚠`.
- **L29** `tui.ts:116`: `setTimeout(..., settings.intervalMs)` → `setTimeout(..., 5)`.
  **Teste**: lance com um intervalo longo e confira que, depois de uma espera curta, só uma leitura aconteceu.

### 3. Resumo da última feature (TUI-40)

- **X11** `tui/screens/detail.ts:419`: `view.rows.findLast((r) => r.sys === "closed")` → `find`. Mostra a primeira feature fechada.
  **Teste**: em `test/unit/tui-detail.test.ts`, um log com duas features fechadas e nada selecionado; o resumo é o da segunda.
- **X02** `tui/screens/detail.ts:366`: o filtro `decision === "approve"` some. Um `comment` ou um `reject` vira `G-01 aprovado`.
  **Teste**: um log cuja única decisão de gate é `comment`, e outro com `reject`; nenhum dos dois tem a linha `aprovado`.

### 4. Perguntas abertas na topologia (TUI-45)

- **L16** `tui/screens/topology.ts:144`: `q.open && q.holder === "human"` → `q.open`.
- **Teste**: em `test/unit/tui-topology.test.ts`, um log com uma pergunta aberta ainda com o leader; ela não aparece em `perguntas abertas` nem na contagem do nó do dev.

### 5. Ordem da terceira linha do agente (TUI-35)

- **S14** `tui/screens/main.ts:47`: `else if (a.permission)` → `else if (a.permission && a.blockedReason === null)`.
- **Teste**: em `test/unit/tui-main.test.ts`, um agente com um `blocked` declarado e um pedido de permissão aberto depois dele mostra `x <tool> · …`, não `⚠ <reason>`.
- **Atenção**: a derivação só preenche `permission` e `blockedReason` quando aquela regra deu o status. Leia como `squad` trata o agente com os dois antes de escrever o teste; se ele nunca entrega os dois juntos, o teste é sobre `squad` + tela, não sobre um `Agent` montado à mão que a derivação não produz.

### 6. Duas Assumptions da derivação sem teste (TUI-10, TUI-16)

- **D17** `shared/derive.ts:584`: acrescenta `live.some((t) => t.planned) &&` à regra de `done`. Com todos os tickets descartados o squad vira `idle`.
  **Teste**: em `test/unit/derive-squad.test.ts`, um `plan` com todos os tickets `dropped` dá `done` (Assumption "`done` com todos os tickets do plano descartados").
- **D19** `shared/derive.ts:527`: a busca da mensagem sem reação passa a olhar só os eventos da feature aberta.
  **Teste**: uma mensagem para um agente antes do `feature_closed`, sem evento dele depois, continua "sem reação" depois que a feature fecha (Assumption "Alcance de sem reação").

### 7. Fronteiras

- **S23** `tui/screens/chrome.ts:127`: `Math.round` → `Math.floor`.
  **Teste**: em `test/unit/tui-chrome.test.ts`, um total de 1600 tokens desenha `2k`.
- **L08** `tui/screens/main.ts:77`: `all.length > 7` → `> 8`.
  **Teste**: em `test/unit/tui-main.test.ts`, exatamente oito tickets desenham seis linhas e `+2 tickets`.
- **C03** `tui/config.ts:31`: `every(isPrice)` → `some(isPrice)`.
  **Teste**: em `test/unit/tui-config.test.ts`, uma tabela com um modelo válido e um inválido lança.
- **L28** `tui.ts:124`: `press(ui, k, { ...seen, ui })` → `press(ui, k, seen)`. Um bloco de teclas com `]]` avança um ticket em vez de dois.
  **Teste**: em `test/unit/tui-loop.test.ts`, o bloco `3]]` num plano de três tickets termina no terceiro.

### 8. Código de saída da sonda (TUI-59)

- **P01** `tui/probe.ts:66`: `process.exit(wide.length === 0 ? 0 : 2)` → `process.exit(0)`.
- **Correção**: tire de `tui/probe.ts:59-66` a decisão "0 se toda largura é 1, senão 2" e as linhas impressas para uma função pura exportada, e teste-a com um mapa que tem uma largura 2. É a única lacuna que pede mudança de código de produção por si.

### 9. Log de teste dobrado (frame 25a)

- `test/frames/logs.ts:263`, `seq` 470: um `refused` com `peer: "worker-1"`, `attempted_kind: "task"`, `error: "worker_busy"`. O broker grava `worker_busy` para o **leader** que mandou a task (`send.ts:116`); um worker não tenta `task`. O evento foi dobrado para reproduzir a linha `✗ w1 recusado · task · worker_busy` do protótipo.
- **Correção**: escreva o evento como o broker escreveria (`peer: "leader"`) e declare a linha do frame 25a como desvio **D1** em `test/frames/deviations.ts`, com o motivo. Confira o que mais muda no 25a (o feed, o detalhe se a linha estiver selecionada, o agrupamento com a recusa `ticket_dropped` do leader que vem depois: são erros diferentes e não se juntam).

## Quatro pontos que a spec não definia

O Verifier não pode decidir comportamento. Estes são os defaults propostos; **o dev confirma
ou troca antes de a rodada começar**. Cada um vira uma linha na tabela de Assumptions da
spec e um teste.

| # | Ponto | Default proposto | Onde |
| - | ----- | ---------------- | ---- |
| 1 | Um `usage` reenviado desenha a linha `‖ … [stalled] deve …` duas vezes (TUI-25). O contrato permite o reenvio (design, linha 200) | Uma linha de `stalled` por dívida: um `usage` não gera a linha se o agente já tem uma linha de `stalled` para a mesma dívida (mesmo `seq` de origem). Muda código | `tui/feed.ts:106-110` |
| 2 | `◌ parado` e `‖ parado` em ticket `planned`, `done` ou `dropped` (TUI-37; mutante **L06**, `tui/screens/main.ts:102`) | Só em ticket que não é `planned`, `done` nem `dropped`: é o que o código faz. Só teste | `tui/screens/main.ts:98-105` |
| 3 | A legenda mantém `g abrir o gate…`, `x abrir o pedido…`, `enter responder a selecionada` e "a TUI escreve três coisas", e nesta fatia `g` e `x` só avisam e a TUI não escreve (TUI-49). O mesmo vale para `x abre` e `a permite   d nega` no detalhe de um pedido de permissão | Manter as linhas do frame: as fatias Question e Gate as tornam verdadeiras, e trocá-las agora cria desvio para desfazer depois. Só a linha na spec | `tui/screens/help.ts:70-76`, `tui/screens/detail.ts:300-301` |
| 4 | O prazo `? m:ss` depois de vencido, antes de o broker gravar o default (mutante **L22**, `tui/activity.ts:31`) | Para em `0:00`: é o que o código faz. Só teste | `tui/activity.ts:31` |

## O que não fazer

- **Não edite `test/frames/*.txt`.** São a extração intocada do protótipo; o Verifier confere byte a byte contra o zip.
- **Não enfraqueça, pule nem apague teste** para a suíte passar. Não use `.skip`, `.todo` nem `.only`.
- **Não acrescente desvio de status de agente.** A lista fixada em `test/unit/tui-frames.test.ts:53-70` (16 entradas) é a tabela aprovada pelo dev no `design.md`. Se um status mudar depois de uma correção, pare e reporte.
- **Não dobre um log** para reproduzir o protótipo. Se o log legítimo desenha outra coisa, é desvio D1 declarado.
- **Não compare com constante importada do código sob teste** quando a spec dá o valor: 120000 ms, 240 s, 4000 ms, 1000 ms, 60 s, as sequências de escape.
- **Não refatore** o que as lacunas não pedem, e não acrescente dependência.
- **Não suba `broker.ts` ou `server.ts`** sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.
- Não faça merge nem abra PR: o Verifier roda antes.

## Como rodar

De dentro de `broker/`, com bun 1.3.14:

```bash
bun test test/unit                                            # rápido
bun node_modules/typescript/bin/tsc --noEmit && bun test      # completo, uns 60 s
```

- Nunca `bun x tsc`: baixa um `tsc` 7 que acusa centenas de erros falsos.
- `EVT-43` em `test/integration/routes.test.ts` falha de vez em quando por 1 ms, e sob carga a integração já estourou tempo uma vez. Rode de novo antes de concluir; se a falha repetir, anote quais testes.
- No Linux a suíte precisa de `git`, `lsof` e `ps` no `PATH`.
- Python é `py -3` nesta máquina.

## Commits e fechamento

- Um commit por lacuna (1 a 9), mais um para os quatro pontos da spec. Mensagem: uma frase imperativa em inglês, em minúsculas, sem prefixo de Conventional Commits (veja `git log --oneline -20`).
- No fim, na spec: as quatro linhas novas em Assumptions. **Não** mude o status dos requisitos para `Verified` nem o veredito de `validation.md`: quem faz isso é o Verifier da próxima rodada.
- Entregue um resumo com: para cada mutante da lista (A06, A07, T13, T17, L29, X02, X11, L16, S14, D17, D19, S23, L08, C03, L28, P01, L06, L22), o teste que o mata (`arquivo:linha`) e a confirmação de que o viu falhar com a mutação aplicada; a contagem final da suíte; e qualquer coisa que tenha mudado em código de produção, com o motivo.

## Depois desta rodada

O Verifier roda de novo sobre `main..HEAD`, do zero, com o mesmo checklist. Com PASS:
`validate_state.py tui-leitura` sai com 0, a rastreabilidade da spec vai a `Verified`, a
fatia é marcada em `ROADMAP.md` e o PR é aberto. A skill limita o ciclo correção → nova
verificação a três rodadas antes de escalar ao dev.
