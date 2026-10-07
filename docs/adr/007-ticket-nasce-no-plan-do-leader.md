# ADR-007: O ticket nasce no `plan` do leader e sai por `dropped`

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: contrato, tickets

## Contexto e problema

Na primeira versão do contrato o ticket não tinha evento de criação: passava a existir no primeiro `task`. O pre-mortem achou dois defeitos. Com um ticket dependendo de outro, entre a aprovação do primeiro e o `task` do segundo o log dizia que tudo estava aprovado, e um leader relançado nesse intervalo não tinha de onde recuperar a decomposição. E um ticket com três reworks ficava `escalated` sem saída: nunca aprovado, com o worker dono preso em `worker_busy` até a feature ser abandonada.

## Critérios

- A decomposição sobrevive à sessão do leader.
- `done` só quando o trabalho planejado acabou.
- O limite de dois reworks continua valendo, mas com saída.

## Opções consideradas

- **Kind de registro `plan`, com a lista inteira de tickets; descartar é um campo da entrada.**
- Tabela e eventos próprios de ticket (criado, cancelado). Descartada: três kinds para o que uma lista resolve.
- Ticket implícito no primeiro `task`. Descartada pelos defeitos acima.

## Decisão

Opção escolhida: **`plan`**. O leader envia `plan` com `{ ticket_ref, title, depends_on?, dropped? }` antes do primeiro `task` e o reenvia inteiro para mudar; o mais recente vale.

- `task` com `ticket_ref` fora do plano é recusado (`unplanned_ticket`); o plano não pode omitir ticket que já recebeu `task`.
- Ticket `dropped` conta como concluído, libera o worker e não aceita mais `task`.
- `done` é "todos os tickets não descartados do plano mais recente aprovados".
- "Mais uma tentativa" depois do limite de rework é descartar o ticket e planejar um novo, com contador próprio.

### Consequências positivas

- A TUI mostra os tickets `planned` antes de qualquer trabalho.
- Contornar o limite de rework com um ticket novo fica visível no log em vez de ser um truque do agente.

### Consequências negativas

- O leader tem um passo a mais antes de distribuir trabalho.
- Replanejar reenvia a lista inteira; um leader descuidado pode tentar omitir um ticket e ser recusado.
- `planned` e `dropped` não estão no design do handoff.

## Links

- `.design/squad-mvp.md`, slice Event (regras do contrato) e derivação de status
- ADR-004, ADR-006
