# Roadmap

Onde o projeto está e o que falta. Marque `[x]` ao concluir um item; é o único lugar que
diz o estado geral. O desenho de cada fatia está em [`.design/squad-mvp.md`](.design/squad-mvp.md)
e as decisões em [`docs/adr/`](docs/adr/).

**Agora:** o MVP está fechado. As oito fatias estão na `main`: a Gate entrou pelo [PR 14](https://github.com/sh4wty1/squad-code-mcp/pull/14) e o seguimento do `gate_reissued` pelo [PR 15](https://github.com/sh4wty1/squad-code-mcp/pull/15), e o marco do MVP foi conferido com sessões reais (`.specs/features/gate/marco-mvp.md`). As lacunas de teste que a fatia Papéis deixou (Fix 1 a Fix 9) foram fechadas no branch `test/papeis-gaps`; as reverificações seguintes fecharam os Fix 10 a Fix 19, e a sexta à décima volta deixaram 74 de 75 requisitos verificados, com uma lacuna de teste em PAP-18. Os Fix 20 a 24 entraram, e a décima primeira volta deixou 72 de 75. Em 2026-10-18 a parte do Fix 25 que derruba o hook ou conta errado entrou, e o resíduo da fatia fechou sem décima segunda volta, com cinco mutantes aceitos em PAP-18; o [PR 16](https://github.com/sh4wty1/squad-code-mcp/pull/16) está mergeado (`d6e4c93`). A suíte no Windows, depois do merge, achou o caso dos nomes de `subagents` falhando porque o NTFS não diferencia caixa; a T62 corrige só o teste, no branch `test/papeis-windows-case`, com o [PR 17](https://github.com/sh4wty1/squad-code-mcp/pull/17) aberto contra a `main`. Em 2026-10-19 o dev conferiu a TUI clicável no Windows Terminal (RT-01 a RT-07); falta a RT-08, no Linux. O que sobra antes de "Depois do MVP" são as pendências fora da ordem abaixo; o estado está no Handoff de `.specs/STATE.md`.

## Decidir (concluído)

- [x] Documento de partida: `docs/start-document/START.md`
- [x] Handoff do Claude Design lido: `docs/claude-design-handoff/DESIGN-NOTES.md`
- [x] Design do MVP (`/tlc-discover`): `.design/squad-mvp.md`
- [x] Pre-mortem e ataque ao contrato (`/the-fool`)
- [x] 12 ADRs (`/create-adr`): `docs/adr/`
- [x] Frames dos estados faltantes, primeira rodada (frames 12 a 21 no handoff)

## Fase 0: provar as suposições antes de congelar o contrato

- [x] Teste 1, uma feature com quatro sessões reais: `docs/fase-0/teste-1.md`
- [x] Spike A, relay de permissão pelo canal → decide o ADR-011: `docs/fase-0/spikes.md`
- [x] Spike B, hook de início de turno → decide o ADR-006: `docs/fase-0/spikes.md`
- [x] Atualizar o status dos ADRs 004, 006 e 011 com o resultado dos spikes

## Construir

Uma fatia por vez, na ordem. Cada fatia é uma feature do `/tlc-spec-driven`: spec,
tarefas, implementação e verificação independente, com PR revisado por `/the-judge`.

| | Fatia | Fase do START | Entrega | Depende de |
|---|---|---|---|---|
| [x] | Peer | 1 | Sessões entram no broker com nome e papel; presença vira evento | Fase 0 |
| [x] | Event | 1 | Log append-only, envio com recusa por topologia, entrega, leitura por cursor | Peer |
| [x] | Feature | 1 | Abertura e encerramento de feature com workflow travado | Event |
| [x] | TUI leitura | 2 | Feed, agentes, tickets, topologia e detalhe de ticket | Feature, frames |
| [x] | Question | 3 | Perguntar, escalar, mesclar, responder e expirar; aba Perguntas | TUI leitura |
| [x] | Papéis | 4 | `roles.json`, quatro skills de papel, launcher, plugin com hooks | Question |
| [x] | TUI clicável | — | Clique em abas, linhas, tickets, perguntas, atalhos e no modal de resposta; roda do mouse; `m` liga e desliga | Question |
| [x] | Gate | 5 | Pedido e decisão de gate; modal com texto e confirmação | Papéis, TUI clicável |

**Marco do broker:** com Peer, Event e Feature prontas, duas sessões trocam mensagens pelo
fork. **Marco do MVP:** com as oito prontas, uma feature de dois tickets vai do kickoff ao
gate aprovado usando só o terminal da mother e a TUI. Conferido em 2026-10-14 com sessões reais: a feature `slugs`, de dois tickets, do kickoff ao `feature_closed` `delivered` ([`marco-mvp.md`](.specs/features/gate/marco-mvp.md)).

A TUI clicável não está no design do MVP nem no START: o dev a pediu em 2026-10-12. A
fonte dela é [`.specs/features/tui-clicavel/spec.md`](.specs/features/tui-clicavel/spec.md).

## Pendências fora da ordem

- [x] Segunda rodada de frames no Claude Design: modal de pedido de permissão, agente
      `stalled`, ticket `planned`, ticket `dropped` e a linha de `refused` com contador
      (frames 22 a 25 no handoff). O que os frames 12 a 25 mostram e o que ele decidiu
      por conta própria está em `docs/claude-design-handoff/DECISOES-rodada-2.md`.
- [x] Terceira rodada de frames no Claude Design (frames 26 a 30 no handoff): a linha 0
      sem feature aberta, a abertura da feature no feed, a feature abandonada, o broker
      sem nenhuma feature e o squad sem feature com um agente `blocked` ou `offline`.
      O que ele decidiu por conta própria está em
      `docs/claude-design-handoff/DECISOES-rodada-3.md`.
- [ ] Guardar em `docs/claude-design-handoff/` a lista do que o Claude Design decidiu por
      conta própria na primeira rodada.
- [x] Conferir o formato do `roles.json` contra o `manifest.json` do registry, antes da
      fatia Papéis. Conferido contra o registry em `8a33ffd`; o formato está no AD-019.
- [x] Decidir o modo de permissão das sessões (default 3 da fatia Papéis). Decidido em
      2026-10-11: `acceptEdits` com lista de permitidos por papel (AD-019).
- [x] Lacunas de teste que a fatia Papéis deixou: Fix 1 a Fix 9 de
      `.specs/features/papeis/validation.md`. Fechadas em 2026-10-16 (T32 a T39); a
      reverificação matou os oito mutantes e achou cinco lacunas novas, as do item abaixo.
- [x] Lacunas de teste da reverificação da fatia Papéis: Fix 10 a Fix 14 de
      `.specs/features/papeis/validation.md`. Fechadas em 2026-10-16 (T40 a T44), com a
      caixa contando em PAP-39; a quinta volta matou os cinco mutantes e achou outros cinco.
- [x] Lacunas de teste da quinta volta da fatia Papéis: Fix 15 a Fix 19 de
      `.specs/features/papeis/validation.md`. Fechadas em 2026-10-16 (T45 a T49); a sexta
      volta deu 74 de 75 requisitos verificados.
- [x] Lacuna de teste da sexta volta da fatia Papéis: Fix 20 de
      `.specs/features/papeis/validation.md` (PAP-18, a caixa de `.jsonl`). Fechada em
      2026-10-16 (T50), com a caixa contando em `.jsonl` na spec; a sétima volta matou os
      dois mutantes e achou outros dois em PAP-18.
- [x] Lacuna de teste da sétima volta da fatia Papéis: Fix 21 de
      `.specs/features/papeis/validation.md` (PAP-18, o último `.jsonl` do caminho e o
      `jsonl` sem o ponto). Fechada em 2026-10-16 (T51); a oitava volta matou os dois
      mutantes e achou outros quatro em PAP-18.
- [x] Lacuna de teste da oitava volta da fatia Papéis: Fix 22 de
      `.specs/features/papeis/validation.md` (PAP-18, `.json` no lugar de `.jsonl` e um
      link sem alvo em `subagents`). Fechada em 2026-10-17 (T52); a nona volta matou os
      quatro mutantes e achou outros nove em PAP-18.
- [x] Lacuna de teste da nona volta da fatia Papéis: Fix 23 de
      `.specs/features/papeis/validation.md` (PAP-18, seis formas novas do nome em
      `usage.ts:82` e `:85`, e três mutações que fazem `sessionUsage` lançar). Fechada em
      2026-10-17 (T53, T54); a décima volta matou os nove mutantes e achou outros onze
      em PAP-18.
- [x] Lacuna de teste da décima volta da fatia Papéis: Fix 24 de
      `.specs/features/papeis/validation.md` (PAP-18, nomes com espaço, `\n` ou sem o
      ponto, o nome do principal em `subagents`, um teto na lista, textos iguais, o
      principal que não conta nada e um link para si mesmo). Fechada em 2026-10-18
      (T55 a T57); a décima primeira volta matou os onze mutantes e achou outros nove,
      em PAP-18, PAP-15 e PAP-19.
- [x] Lacuna de teste da décima primeira volta da fatia Papéis: Fix 25 de
      `.specs/features/papeis/validation.md`. Fechada em 2026-10-18 sem décima segunda
      volta, por decisão do dev: G3, G8, G9 e G2 entraram (T58 a T60), e a frente do
      nome com espaço ou acento e os caracteres de largura cheia ficam aceitos em
      "Assumptions" da spec (T61).
- [ ] Conferência em terminal real da TUI clicável: RT-08 de
      `.specs/features/tui-clicavel/real-terminal.md`, num terminal Linux. RT-01 a RT-07
      funcionaram no Windows Terminal 1.24.12741.0 em 2026-10-19, segundo o dev.
- [x] Fatia Distribuição: quem não clonou instala com
      `bun add -g github:sh4wty1/squad-code-mcp` e roda `squad` de dentro do próprio
      projeto (`.specs/features/distribuicao/`, AD-023). Fechada em 2026-10-19 no branch
      `feat/distribuicao`; o README explica só esse caminho.

## Depois do MVP

- [ ] Fase 6, segundo cérebro: busca em grafo sobre vault markdown.
- [ ] Segunda rodada de teste com spec ambígua, para exercitar pergunta até o dev e rework
      com as skills de papel reais.

## Como rodar uma fatia

Sessão nova neste repositório:

```text
/tlc-spec-driven

Implemente a fatia <nome> de .design/squad-mvp.md. O design e os ADRs em docs/adr/ já
estão decididos: a spec deriva da fatia, não reabra as decisões. Registre no STATE.md
só o que for decisão nova, apontando para o ADR quando existir um.

Precisa rodar no Windows e no Linux: rode a suíte nos dois antes de fechar, ou registre
qual dos dois ficou sem rodar. Mensagens de commit seguem a convenção do repositório.
Trabalhe num branch e abra um PR no fim. Ao terminar, marque a fatia em ROADMAP.md.
```

A fatia Peer é a primeira de código e precisa trazer o upstream antes. Para ela, use este
prompt no lugar do modelo acima:

```text
/tlc-spec-driven

Implemente a fatia Peer de .design/squad-mvp.md. É a primeira fatia de código: o
repositório só tem documentos.

Antes da fatia, traga o código do upstream para cá. O broker é um fork de
https://github.com/louislva/claude-peers-mcp no commit 640183f (ADR-001): copie o código
desse commit como primeiro commit de código, mantendo o aviso da licença MIT do autor
original, e só depois comece a alterar.

O design e os ADRs em docs/adr/ já estão decididos: a spec deriva da fatia, não reabra
as decisões. docs/fase-0/ tem o que os testes com sessões reais mostraram. Registre no
STATE.md só o que for decisão nova, apontando para o ADR quando existir um.

Precisa rodar no Windows: a seção Work do design lista o que o upstream não faz aqui.
Mensagens de commit seguem a convenção do repositório. Trabalhe num branch e abra um PR
no fim. Ao terminar, marque a fatia Peer em ROADMAP.md.
```

A fatia TUI leitura tem frames e decisões do Claude Design para conferir. Para ela, use
este prompt no lugar do modelo:

```text
/tlc-spec-driven

Implemente a fatia TUI leitura de .design/squad-mvp.md. O design e os ADRs em docs/adr/ já
estão decididos: a spec deriva da fatia, não reabra as decisões. Registre no STATE.md
só o que for decisão nova, apontando para o ADR quando existir um.

Comece pelo Handoff de .specs/STATE.md: ele diz o que as fatias anteriores deixaram para
esta e como rodar a suíte nesta máquina.

Os frames estão em docs/claude-design-handoff/Handoff-Design.zip (Squad TUI.dc.html,
frames 01 a 30). A fatia entrega as telas de leitura; os modais de resposta, de gate e de
permissão ficam de fora, porque escrever é das fatias Question e Gate. O design manda
portar as funções de desenho do protótipo e usar cada frame como caso de teste: mesmo
estado, mesmas 40 linhas.

Antes de qualquer tela, resolva a pergunta aberta da fatia: se ⚠ e ⟳ ocupam uma célula no
Windows Terminal.

O Claude Design decidiu coisas que o design não tem. Estão em
docs/claude-design-handoff/DECISOES-rodada-3.md, e a lista da segunda rodada não foi
guardada: o que os frames 22 a 25 mostram e a fatia não descreve é decisão dele. Na spec,
adote ou corte cada uma, e me pergunte antes de fechar estas três, que tocam a derivação
ou o contrato:
- de onde a TUI tira o nome do projeto, que não está em nenhum evento;
- o status do nome que nunca entrou no broker ([não lançado] nos frames), que a regra de
  offline do design não cobre;
- a tecla t, que alterna os tokens entre a feature e a sessão.

Precisa rodar no Windows e no Linux: rode a suíte nos dois antes de fechar, ou registre
qual dos dois ficou sem rodar. Mensagens de commit seguem a convenção do repositório.
Trabalhe num branch e abra um PR no fim. Ao terminar, marque a fatia em ROADMAP.md.
```

A fatia TUI clicável já tem spec e não está no design. Para ela, use este prompt no lugar
do modelo:

```text
/tlc-spec-driven

Implemente a fatia TUI clicável. Ela não está em .design/squad-mvp.md: a spec já existe em
.specs/features/tui-clicavel/spec.md, com as decisões do dev em context.md. Parta dela para
o design e as tarefas; não reabra o que está marcado `y` em "Assumptions". As linhas
marcadas `n` são defaults do agente: me mostre as que mudam o que eu vejo antes do design.

Comece pelo Handoff de .specs/STATE.md, que diz como rodar a suíte nesta máquina.

Antes de qualquer outra tarefa, resolva a suposição aberta da spec: se o stdin do Bun em
modo cru entrega os relatórios de mouse no Windows Terminal. A sonda de CLK-17 é a
primeira tarefa, e sou eu quem a roda, porque um agente não clica. Se os relatórios não
chegam, pare e me diga.

Registre no STATE.md a regra geral do clique (todo efeito do mouse é o de uma tecla que já
existe) como decisão nova. O que só um terminal real mostra fica em real-terminal.md, com
o que ficou sem conferir.

Precisa rodar no Windows e no Linux: rode a suíte nos dois antes de fechar, ou registre
qual dos dois ficou sem rodar. Mensagens de commit seguem a convenção do repositório.
Trabalhe num branch e abra um PR no fim. Ao terminar, marque a fatia em ROADMAP.md.
```

Para parar no meio: `pause work`. Para voltar em outra sessão: `/tlc-spec-driven resume work`.
