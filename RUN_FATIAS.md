# RUN FATIAS

Guia para uso humano: como rodar uma fatia do MVP do começo ao fim. O estado geral do
projeto fica no [ROADMAP.md](ROADMAP.md); o desenho de cada fatia, em
[.design/squad-mvp.md](.design/squad-mvp.md).

## Onde estamos

| Estado | Fatia | Entrega |
|---|---|---|
| feita, PR 2 aberto | Peer | Sessões entram no broker com nome e papel; presença vira evento |
| em andamento | Event | Log append-only, envio com recusa por topologia, entrega, leitura por cursor |
| falta | Feature | Abertura e encerramento de feature com workflow travado |
| falta | TUI leitura | Feed, agentes, tickets, topologia e detalhe de ticket |
| falta | Question | Perguntar, escalar, mesclar, responder e expirar; aba Perguntas |
| falta | Papéis | `roles.json`, quatro skills de papel, launcher, plugin com hooks |
| falta | Gate | Pedido e decisão de gate; modal com texto e confirmação |

- **Peer:** o PR 2 (`feat/peer`) já foi revisado e os achados da revisão foram corrigidos.
  Falta só mesclar no `main`.
- **Event:** a spec está escrita em `.specs/features/event/spec.md`, ainda sem commit. O
  branch `feat/event` saiu de `feat/peer`, porque o PR 2 não estava mesclado. Mescle o PR 2
  antes de abrir o PR da Event, senão o diff dela carrega a Peer junto.

## Passo a passo

### 1. Fechar a fatia anterior

Cada fatia depende da anterior, então a próxima parte do `main` já com ela. Antes de
começar, confira:

- [ ] verificação independente feita
- [ ] PR revisado pelo `/the-judge` e mesclado
- [ ] fatia marcada `[x]` na tabela do ROADMAP.md
- [ ] linha "Agora" do ROADMAP.md atualizada

Se o PR anterior ainda não foi mesclado, dá para sair do branch dele (foi o caso da
Event), desde que ele entre no `main` antes do PR da fatia nova.

### 2. Abrir sessão nova e colar o prompt

Sessão nova neste repositório, trocando `<nome>` pela fatia:

```text
/tlc-spec-driven

Implemente a fatia <nome> de .design/squad-mvp.md. O design e os ADRs em docs/adr/ já
estão decididos: a spec deriva da fatia, não reabra as decisões. Registre no STATE.md
só o que for decisão nova, apontando para o ADR quando existir um.

Precisa rodar no Windows e no Linux: rode a suíte nos dois antes de fechar, ou registre
qual dos dois ficou sem rodar. Mensagens de commit seguem a convenção do repositório.
Trabalhe num branch e abra um PR no fim. Ao terminar, marque a fatia em ROADMAP.md.
```

É o mesmo prompt da seção "Como rodar uma fatia" do ROADMAP.md.

### 3. Deixar a skill conduzir

A partir daí a skill leva a fatia por: spec, tarefas, implementação com um commit por
tarefa, verificação independente e PR.

### 4. Parar e retomar

| Para | Comando |
|---|---|
| parar no meio | `pause work` |
| voltar em outra sessão | `/tlc-spec-driven resume work` |
