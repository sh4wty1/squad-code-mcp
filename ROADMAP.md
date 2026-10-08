# Roadmap

Onde o projeto está e o que falta. Marque `[x]` ao concluir um item; é o único lugar que
diz o estado geral. O desenho de cada fatia está em [`.design/squad-mvp.md`](.design/squad-mvp.md)
e as decisões em [`docs/adr/`](docs/adr/).

**Agora:** fatia Feature, no branch `feat/feature`: spec confirmada em `.specs/features/feature/spec.md`; Design aprovado em `.specs/features/feature/design.md`; falta quebrar em tarefas. A Peer foi mesclada pelo PR 2 e a Event pelo PR 3.

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
| [ ] | Feature | 1 | Abertura e encerramento de feature com workflow travado | Event |
| [ ] | TUI leitura | 2 | Feed, agentes, tickets, topologia e detalhe de ticket | Feature, frames |
| [ ] | Question | 3 | Perguntar, escalar, mesclar, responder e expirar; aba Perguntas | TUI leitura |
| [ ] | Papéis | 4 | `roles.json`, quatro skills de papel, launcher, plugin com hooks | Question |
| [ ] | Gate | 5 | Pedido e decisão de gate; modal com texto e confirmação | Papéis |

**Marco do broker:** com Peer, Event e Feature prontas, duas sessões trocam mensagens pelo
fork. **Marco do MVP:** com as sete prontas, uma feature de dois tickets vai do kickoff ao
gate aprovado usando só o terminal da mother e a TUI.

## Pendências fora da ordem

- [ ] Segunda rodada de frames no Claude Design, antes da fatia TUI leitura. O `/the-fool`
      criou estados depois do primeiro pedido: modal de pedido de permissão (só se o
      spike A passar), agente `stalled`, ticket `planned`, ticket `dropped` e a linha de
      `refused` com contador.
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

Para parar no meio: `pause work`. Para voltar em outra sessão: `/tlc-spec-driven resume work`.
