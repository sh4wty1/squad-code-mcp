# Roadmap

Onde o projeto está e o que falta. Marque `[x]` ao concluir um item; é o único lugar que
diz o estado geral. O desenho de cada fatia está em [`.design/squad-mvp.md`](.design/squad-mvp.md)
e as decisões em [`docs/adr/`](docs/adr/).

**Agora:** TUI leitura concluída e na `main` (PR 8, merge `9a4d921`). A fatia Question está em andamento no branch `feat/question`. Terminal interativo real e macOS não foram exercitados. O estado está no Handoff de `.specs/STATE.md`.

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
| [ ] | Question | 3 | Perguntar, escalar, mesclar, responder e expirar; aba Perguntas | TUI leitura |
| [ ] | Papéis | 4 | `roles.json`, quatro skills de papel, launcher, plugin com hooks | Question |
| [ ] | Gate | 5 | Pedido e decisão de gate; modal com texto e confirmação | Papéis |

**Marco do broker:** com Peer, Event e Feature prontas, duas sessões trocam mensagens pelo
fork. **Marco do MVP:** com as sete prontas, uma feature de dois tickets vai do kickoff ao
gate aprovado usando só o terminal da mother e a TUI.

## Pendências fora da ordem

- [x] Segunda rodada de frames no Claude Design: modal de pedido de permissão, agente
      `stalled`, ticket `planned`, ticket `dropped` e a linha de `refused` com contador
      (frames 22 a 25 no handoff).
- [x] Terceira rodada de frames no Claude Design (frames 26 a 30 no handoff): a linha 0
      sem feature aberta, a abertura da feature no feed, a feature abandonada, o broker
      sem nenhuma feature e o squad sem feature com um agente `blocked` ou `offline`.
      O que ele decidiu por conta própria está em
      `docs/claude-design-handoff/DECISOES-rodada-3.md`.
- [ ] Guardar em `docs/claude-design-handoff/` a lista do que o Claude Design decidiu por
      conta própria na primeira rodada.
- [ ] Conferir o formato do `roles.json` contra o `manifest.json` do registry, antes da
      fatia Papéis.
- [ ] Decidir o modo de permissão das sessões (default 3 da fatia Papéis).

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

Para parar no meio: `pause work`. Para voltar em outra sessão: `/tlc-spec-driven resume work`.
