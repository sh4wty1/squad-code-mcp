# ADR-006: Status derivado do log por uma função única, com marca de turno

- **Date**: 2026-10-07
- **Status**: Accepted (marca de início de turno confirmada pelo spike B da Fase 0, 2026-10-07)
- **Deciders**: Lucas Fassi
- **Tags**: contrato, TUI

## Contexto e problema

A TUI mostra o status de cada agente e de cada ticket. Um agente que reporta o próprio status gasta tokens e pode mentir ou esquecer. Derivar tudo dos eventos de protocolo tem outro defeito, achado no pre-mortem: o log sabe o que o agente deve, não se ele está fazendo. Um worker que encerra o turno sem enviar o `result` aparecia como `working` para sempre.

## Critérios

- A TUI é a única janela do dev; ela não pode mostrar trabalho onde há uma sessão parada.
- Broker e TUI têm de chegar ao mesmo status.
- O agente não deve gastar turno reportando estado.

## Opções consideradas

- **Função única de derivação, com três exceções emitidas: presença, bloqueio e turno.**
- Status reportado pelo agente. Descartada: custo e falta de confiança.
- Derivação só de eventos de protocolo, sem turno. Descartada: não distingue dever de fazer.

## Decisão

Opção escolhida: **derivação com marca de turno**. A função é escrita em TypeScript, compartilhada por broker e TUI, e faz parte do contrato.

- Presença: o broker emite `peer_joined` e `peer_left`.
- Bloqueio: o agente declara `blocked`; um `permission_request` aberto também conta.
- Turno: hooks da sessão emitem `turn_started` no início e `usage` no fim.

Status novo `stalled`: o agente deve um evento (o `result`, o `verdict`, o `task` de rework, o `plan`, ou a resposta de uma pergunta de que é holder) e não está em turno. Um hook de parada consulta `/state` e devolve o agente ao trabalho uma vez por turno.

"Último evento do ticket" considera só `task`, `result` e `verdict`.

### Consequências positivas

- Sessão parada com dívida fica visível na TUI sem o dev entrar no terminal.
- Nenhum token gasto com relatório de status.

### Consequências negativas

- Depende de dois hooks do Claude Code, `UserPromptSubmit` e `Stop`. O spike B viu os dois dispararem em turnos abertos por canal; não testou eventos que chegam com a sessão ocupada.
- Mudar a regra de derivação é mudar o contrato.
- `stalled` não está no design do handoff e precisa de desenho.

## Links

- `.design/squad-mvp.md`, Key decision 5, slices TUI leitura e Fase 0
- `docs/fase-0/spikes.md`, spike B
- ADR-004, ADR-007
