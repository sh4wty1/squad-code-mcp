# ADR-004: Envelope com vinte kinds, com o kind como único discriminante

- **Date**: 2026-10-07
- **Status**: Accepted (os kinds `permission_request`, `permission_decision` e `turn_started` dependem dos spikes da Fase 0)
- **Deciders**: Lucas Fassi
- **Tags**: contrato

## Contexto e problema

O contrato do START.md não carregava o que o design da TUI mostra e o contradizia em nove pontos. O envelope e a lista de kinds são a porta do sistema: broker, TUI e skills leem os dois. A sessão de pre-mortem e red team de 2026-10-07 mostrou eventos e estados que a primeira versão, com quinze kinds, não representava.

## Critérios

- Nenhum consumidor decide o significado de um evento olhando campos opcionais.
- Pequeno o bastante para uma skill de papel seguir sem errar.
- Tudo o que a TUI precisa mostrar tem de estar no log.

## Opções consideradas

- **Kinds fechados, campos próprios por kind, `feature_id` em todos, sem `thread` nem uuid.**
- Mensagem de texto livre com metadados opcionais, como o upstream. Descartada: o significado ficaria na interpretação de cada consumidor.
- `review` como kind de progresso do judge. Descartada: custa tokens e interrompe o leader; o `verdict` carrega tudo.

## Decisão

Opção escolhida: **kinds fechados**. Nove de mensagem: `task`, `result`, `verdict`, `question`, `answer`, `gate`, `gate_decision`, `permission_request`, `permission_decision`. Onze de registro: `feature_opened`, `feature_closed`, `peer_joined`, `peer_left`, `plan`, `turn_started`, `blocked`, `unblocked`, `usage`, `question_merged`, `refused`.

Campos comuns: `seq`, `ts`, `kind`, `feature_id`, `from`, `role_from`, `to`, `summary` (até 80), `body`, `ticket_ref`. `answer` é toda resposta a uma pergunta; `result` é só entrega e relatório. O autor de um evento gerado pelo broker é `"broker"`.

`usage` leva o acumulado da sessão por `session_id` e `model`, não a diferença, e é também a marca de fim de turno.

### Consequências positivas

- O kind basta para rotear, desenhar e derivar.
- `usage` acumulado é idempotente: um reenvio do hook não muda o total, que é a única contenção de custo do MVP.

### Consequências negativas

- Acrescentar um kind depois é barato; mudar os campos de um existente obriga a migrar o log e reescrever skills e TUI.
- `question` é reusado na escalação: distinguir criação de escalação exige olhar o histórico.
- O total de uma feature sai por diferença entre acumulados, não por soma.

## Links

- `.design/squad-mvp.md`, Key decision 3 e slice Event
- ADR-006, ADR-007, ADR-010, ADR-011
