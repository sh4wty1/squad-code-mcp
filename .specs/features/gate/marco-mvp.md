# Gate: o marco do MVP

**Veredito:** conferido. Uma feature de dois tickets, o segundo dependendo do primeiro, foi do
kickoff ao gate aprovado e ao `feature_closed` `delivered` com o dev usando só o terminal da
mother e a TUI. Depois da subida das sessões, ninguém digitou nada nos terminais do leader, do
worker-1 nem do judge.

**Quando e onde:** 2026-10-14, das 17:48 às 18:06, no Windows 11 Pro 10.0.26200, com o Claude
Code 2.1.299, o Bun 1.3.14 e o modelo `claude-haiku-5-5` (`ANTHROPIC_MODEL`) nas quatro sessões.
O código sob teste é o do branch `feat/gate` em `a6a96a8`.

**Isolamento:** um repositório descartável (`textkit`, com um commit em `main`) na pasta de
rascunho da sessão, fora deste repositório. `SQUAD_PORT` 7931, e `SQUAD_DB`,
`SQUAD_TOKEN_FILE` e `SQUAD_WORKTREES` temporários; as variáveis `CLAUDE*` removidas do ambiente.
No fim o broker de teste foi parado com `kill-broker` e nenhuma sessão ficou de pé. Este
repositório não foi tocado por nenhuma sessão.

## Como rodou

- Cinco programas, cada um num ConPTY de 140×50 pelo `real-session-driver.py` da Papéis
  (`.specs/features/papeis/`): `squad start mother`, `squad start leader`, `squad start worker
  worker-1` e `squad start judge` (por `bun broker/cli.ts`), e `bun broker/tui.ts`.
- A subida de cada sessão passa por três diálogos, que o roteiro (`marco-mvp-tools/session.json`)
  responde: a confiança na pasta, o aviso do canal de desenvolvimento e um diálogo novo desta
  versão do Claude Code, que oferece a extensão do Chrome (respondido com "No, keep browser tools
  off"). São da subida da sessão, não da feature.
- O dev:
  - digitou **uma** mensagem no terminal da mother: o pedido da feature, com os critérios dos dois
    tickets, o workflow `tlc`, o branch `feat/slugs` e a entrega como merge em `main` depois do
    gate;
  - decidiu pela TUI os **11** pedidos de permissão da rodada (mother 5, worker-1 3, judge 2,
    leader 1), todos com `x` e `a` (e `G` antes do `a`). Nove foram apertados por
    `marco-mvp-tools/autodev.py`, que só escreve teclas na TUI, e dois à mão, também na TUI: o 10,
    o primeiro da rodada, antes de o script existir, e o 41 (abaixo);
  - comentou o gate pela TUI (`g`, `c`, o texto e `enter`): a mother perguntava, no resumo, se o
    push fazia parte da entrega, e o repositório não tem `origin`;
  - aprovou a versão 2 do gate pela TUI (`g`, `a`, `y`).

## O que o log mostra

O log inteiro, 79 eventos, está em `marco-mvp-log.txt`. Os eventos de mensagem e de registro da
feature, em ordem:

| seq | evento | o que foi |
| --- | ------ | --------- |
| 12 | `feature_opened` | a mother abre `slugs` com a spec commitada em `feat/slugs` (`a9d09a0`) |
| 16 | `task` mot → ldr | o kickoff |
| 21 | `plan` | dois tickets, `slugPath` dependendo de `slugify` |
| 22, 29 | `task`, `result` | `slugify` do worker-1 ao judge |
| 34, 35 | `refused`, `verdict` | um `verdict` sem campo recusado (`missing_field`) e reenviado certo: `approve` 5/5 |
| 38, 43, 48 | `task`, `result`, `verdict` | `slugPath`, `approve` 4/4 |
| 53 | `result` ldr → mot | 2 de 2 tickets aprovados e mergeados em `feat/slugs` |
| 60 | `gate` | G-01, `delivery`, commit `cd06d1d`, com resumo, `diffstat` e a pergunta do push |
| 62 | `gate_decision` `comment` | "Sem push: este repositorio nao tem origin. A entrega e so o merge de feat/slugs em main. Reemita o G-01 sem o push." |
| 64 | `gate` | G-01 reemitido com o mesmo id, versão 2, sem o push |
| 66 | `gate_decision` `approve` | `G-01 aprovado` |
| 68 a 71 | permissão | o merge e os testes em `main`, pedidos no terminal da mother e decididos pela TUI |
| 72 | `feature_closed` `delivered` | depois do merge `0275064` em `main`, com 8 testes passando |

## Visto na TUI real

- O modal de permissão abriu com o comando inteiro, a fila e o `[blocked x]` do agente; o `a`
  chegou à sessão pelo relay e ela seguiu sem nada no terminal dela.
- O modal de gate mostrou a ação, o efeito, `2 tickets · 0 reworks · 12 min · ≈$0.05`, o resumo
  da mother, o diff stat e `judge ✓ slugify 5/5 ✓ slugPath 4/4`; a versão 2 mostrou o título
  `⚠ gate G-01 · atualizado`, `seu comentário · 18:04:24` com o texto entre aspas e o `body` novo
  em `o que a mother mudou`.
- `a` abriu `⚠ confirmar aprovação de G-01 · não dá para desfazer`, e `y` gravou o `approve`.
- O comentário e as duas versões do gate chegaram à mother como evento do canal; ela reemitiu
  com o `gate_id` que a tool devolve.

## O que não saiu como esperado

1. **O pedido 41 esperou 10 minutos.** O primeiro `autodev.py` apertava `x` assim que o pedido
   aparecia em `GET /events`, no mesmo segundo em que foi gravado e antes da leitura de 1 s da
   TUI: a TUI avisou `nenhum pedido de permissão`, e `G` e `a` caíram na tela principal, onde não
   fazem nada. Não é defeito da TUI, é a corrida do script; um dev de verdade aperta `x` depois de
   ver o selo. O pedido foi decidido à mão pela TUI (`x`, `G`, `a`) e o script passou a esperar o
   selo e a conferir o `P-NN` do modal antes do `a`. O worker-1 ficou esses 10 minutos parado no
   diálogo do terminal dele, que é o que o critério de fracasso do design descreve: sem a TUI, o
   dev teria de ir lá.
2. **Um `verdict` recusado** (`missing_field`, seq 34): o judge reenviou certo no turno seguinte.
3. **A ação do primeiro gate tinha um push** que a spec da feature não pediu. O dev pegou no
   modal e comentou; é o caminho que a fatia dá para isso.

## Não exercitado

- `reject`, a fila de dois gates, o comando longo com rolagem e o estado "respondido no
  terminal" numa sessão real: estão nos testes de unidade, de frames e de ponta a ponta, não
  nesta rodada.
- O mouse: nenhuma decisão desta rodada foi por clique.
- O Linux: não há Claude Code com login num Linux desta máquina.
- Outro modelo que não `haiku`.

## Como repetir

`marco-mvp-tools/` tem o roteiro das sessões (`session.json`), o da TUI (`tui.json`), o
`autodev.py` (o dev que decide os pedidos pela TUI) e o `watch.py` (os eventos, os selos da TUI
e a mother parada), além do que o `autodev.py` registrou nesta rodada. Os dois scripts leem a
pasta deles e a porta 7931; o driver e as ferramentas de leitura do log estão em
`.specs/features/papeis/`. O driver precisa de `pywinpty` e `pyte`.
