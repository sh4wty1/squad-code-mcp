# RUN FATIAS

## Documento para uso humano

1. Fechar a fatia anterior. Verificação independente feita, PR revisado pelo /the-judge e mesclado, fatia marcada [x] no ROADMAP.md e linha "Agora" atualizada. Cada fatia depende da anterior, então a próxima parte do main já com ela.

2. Abrir sessão nova no repositório e colar:

"""
/tlc-spec-driven

Implemente a fatia <nome> de .design/squad-mvp.md. O design e os ADRs em docs/adr/ já
estão decididos: a spec deriva da fatia, não reabra as decisões. Registre no STATE.md
só o que for decisão nova, apontando para o ADR quando existir um. Mensagens de commit
seguem a convenção do repositório. Ao terminar, marque a fatia em ROADMAP.md.
"""

1. O que a skill conduz a partir daí: spec, tarefas, implementação com um commit por tarefa, verificação independente e PR.

2. No meio do caminho: pause work para parar, /tlc-spec-driven resume work em outra sessão para voltar.

Fatias, na ordem:

**Próxima a rodar: Event.** A Peer está fechada no PR 2, pronto para revisão e ainda não mesclado: mesclar antes, para a Event partir do `main` (passo 1).

┌──────────────┬─────────────┬──────────────────────────────────────────────────────────────────────────────┐
│              │    Fatia    │                                   Entrega                                    │
├──────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ feita (PR 2) │ Peer        │ Sessões entram no broker com nome e papel; presença vira evento              │
├──────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ próxima      │ Event       │ Log append-only, envio com recusa por topologia, entrega, leitura por cursor │
├──────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ falta        │ Feature     │ Abertura e encerramento de feature com workflow travado                      │
├──────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ falta        │ TUI leitura │ Feed, agentes, tickets, topologia e detalhe de ticket                        │
├──────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ falta        │ Question    │ Perguntar, escalar, mesclar, responder e expirar                             │
├──────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ falta        │ Papéis      │ roles.json, quatro skills de papel, launcher, plugin com hooks               │
├──────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ falta        │ Gate        │ Pedido e decisão de gate; modal com confirmação                              │
└──────────────┴─────────────┴──────────────────────────────────────────────────────────────────────────────┘