# ADR-002: Log único de eventos, append-only, com `seq` como única identidade

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: contrato, persistência

## Contexto e problema

O broker, a TUI e as quatro skills de papel precisam concordar sobre o que aconteceu no squad. Se a mensagem entre peers, o histórico e a fonte da tela forem coisas diferentes, elas divergem. O upstream guarda só mensagens e apaga as não entregues quando o peer morre.

## Critérios

- Um único registro que seja mensagem, histórico e fonte da TUI.
- O estado do squad sobrevive à morte de qualquer sessão.
- Mudar o contrato depois da fase 1 custa migrar o log e reescrever os três consumidores.

## Opções consideradas

- **Tabela única `events`, append-only, com `seq` inteiro como único identificador.**
- JSONL em arquivo além do SQLite. Ganha se outra ferramenta precisar seguir o log sem falar com o broker; hoje a única leitora é a TUI.
- Uuid além do `seq`. Ganha se um evento precisar ser citado fora do banco, o que só a fase 6 pediria.

## Decisão

Opção escolhida: **tabela única append-only**. Nenhum evento é alterado ou apagado. Features, perguntas, gates e entregas pendentes são projeções gravadas na mesma transação do evento que as muda. Duas regras completam a decisão:

- Features, perguntas e gates são reconstruíveis só a partir dos eventos, e um teste de replay prova isso.
- Toda mensagem que responde a outra cita o `seq` ou o id do que responde (`result.task_seq`, `verdict.result_seq`, `question_id`, `gate_id`, `request_seq`), e o broker recusa com `stale_reference` a citação que não é a mais recente.

### Consequências positivas

- Não há segundo estado para divergir: a TUI lê `GET /events?after=<seq>` e calcula tudo.
- A citação obrigatória impede o veredito sobre um commit já substituído, o veredito repetido e a entrega atrasada de uma feature anterior com o mesmo `ticket_ref`.

### Consequências negativas

- A máquina de estados de perguntas e gates existe duas vezes (projeção SQL no broker, dobra de eventos na TUI); o teste de replay é o que as mantém iguais.
- O ack de entrega não é evento, então a TUI não o vê (ADR-009).
- O log só cresce; não há compactação no MVP.

## Links

- `.design/squad-mvp.md`, Key decision 1 e slice Event
- ADR-004, ADR-009
