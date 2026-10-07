# ADR-010: Topologia e limites são recusas do broker, e toda recusa deixa rastro

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: broker, topologia

## Contexto e problema

O squad é uma estrela: mother, leader, judge e até três workers, com arestas fixas por kind e papel. Alguém tem de garantir que um worker não fale direto com a mother nem receba dois tickets. As skills de papel ainda não rodaram, então não há evidência de que agentes sigam o protocolo por conta própria. O red team mostrou também o que um agente faz quando é recusado: tenta variações, reencaixa a mensagem em outro kind ou explica no próprio terminal, e nada disso aparecia no log.

## Critérios

- As regras valem mesmo se uma skill errar.
- O broker continua simples.
- A TUI é a única janela do dev: um agente em laço de recusas tem de aparecer nela.

## Opções consideradas

- **O broker só recusa o que a topologia ou o estado não permitem, e registra a recusa.**
- Broker como motor de workflow, que atribui tickets e conduz as transições. Ganha se as skills se mostrarem incapazes de seguir o protocolo; a Fase 0 é quem dá essa evidência.
- Topologia como convenção das skills. Descartada: sem garantia nenhuma.

## Decisão

Opção escolhida: **recusas com rastro**.

- Recusas do broker: arestas permitidas por kind e papel, uma feature aberta, no máximo três workers, um ticket por worker, dois reworks por ticket, e as de estado (`not_owner`, `stale_reference`, `unplanned_ticket`, `ticket_dropped`, `tickets_open`).
- O servidor MCP só expõe a cada sessão as tools do seu papel.
- A resposta de recusa é `{ ok: false, error, hint }`, em que `hint` diz o próximo passo válido.
- Toda recusa a um peer registrado grava um registro `refused` (`peer`, `attempted_kind`, `error`), que vira linha de sistema no feed. O evento tentado não é gravado, e o `refused` não conta como evento do peer na derivação.

### Consequências positivas

- Um agente não corrompe o log por erro de protocolo.
- Laço de recusas e mensagem sem aresta ficam visíveis ao dev.

### Consequências negativas

- O broker não conduz nada: se um agente não age, o trabalho para, e só o `stalled` avisa (ADR-006).
- Um agente em laço enche o log de `refused`; a TUI agrupa, o log não.
- Um worker continua sem aresta para avisos que não são pergunta; a Fase 0 mede se isso faz falta.

## Links

- `.design/squad-mvp.md`, Shape, Key decision 6 e slice Event
- ADR-004, ADR-007
