# ADR-009: Entrega ao menos uma vez até o transporte, e registro que prova o canal

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: broker, entrega, canais

## Contexto e problema

Uma mensagem só serve se chegar ao modelo da sessão destinatária, e uma sessão ociosa só acorda pelo canal do Claude Code. O upstream marca a mensagem como entregue no polling, antes de ela chegar à sessão. A primeira versão desta decisão dizia "entrega confirmada depois do push". A documentação de canais desmente: o Claude Code não confirma notificações, o `await` resolve quando a mensagem é escrita no transporte, e eventos são descartados em silêncio quando a sessão não carregou o servidor como canal.

## Critérios

- Uma sessão surda tem de aparecer antes de a feature depender dela.
- O dev vê mensagem parada sem entrar no terminal.
- O canal exige login claude.ai e a flag de canais de desenvolvimento; não há alternativa para acordar a sessão.

## Opções consideradas

- **Ack depois do push, tratado como prova de escrita; canal provado no registro; reação medida pelo log.**
- Recibo do modelo por mensagem (uma tool de confirmação a cada entrega). Descartada: um turno e tokens por mensagem.
- Ack no polling, como o upstream. Descartada: perde mensagem se a sessão cair entre o polling e o push.

## Decisão

Opção escolhida: **entrega até o transporte**.

- Entregas ficam em `deliveries`, por nome do destinatário, e voltam no polling seguinte até o ack; o `seq` permite reconhecer a repetição.
- A única prova de que uma mensagem chegou ao modelo é o evento seguinte do destinatário.
- O servidor MCP não registra ao subir: empurra um ping pelo canal e só registra quando o modelo chama a tool `ready` com o número do ping. `peer_joined` passa a significar canal funcionando de ponta a ponta.
- A TUI mostra, por agente, a idade da mensagem mais antiga sem reação.

### Consequências positivas

- Flag ausente, diálogo recusado ou política da organização aparecem no lançamento, como `offline`.
- Nenhuma mensagem é apagada por morte de peer.

### Consequências negativas

- Depois do registro, uma mensagem ainda pode se perder na compactação de contexto; só a idade sem reação a denuncia.
- Cada sessão mostra o diálogo de confirmação da flag ao subir, e a flag é ignorada em modo não interativo.
- Canais estão em research preview; a decisão depende de um recurso que pode mudar.

## Links

- `.design/squad-mvp.md`, Key decision 8, slices Peer e Event
- https://code.claude.com/docs/en/channels-reference
- ADR-001, ADR-003
