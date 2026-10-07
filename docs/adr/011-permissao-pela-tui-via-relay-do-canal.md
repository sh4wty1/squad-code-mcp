# ADR-011: Pedido de permissão respondido pela TUI, via relay do canal

- **Date**: 2026-10-07
- **Status**: Accepted (relay confirmado pelo spike A da Fase 0, 2026-10-07)
- **Deciders**: Lucas Fassi
- **Tags**: contrato, permissões, canais

## Contexto e problema

O critério de sucesso do MVP é o dev usar só o terminal da mother e a TUI; o primeiro sinal de fracasso listado é um pedido de permissão parado no terminal de outro papel. A primeira versão do design respondia com um hook que marcava o agente como `blocked` e uma tela dizendo para ir ao terminal, que é exatamente o fracasso. A documentação de canais descreve um relay: um canal que declara `claude/channel/permission` recebe o pedido (`request_id`, `tool_name`, `description`, `input_preview`) e pode devolver `allow` ou `deny`. O pedido vai ao processo do servidor MCP, não ao modelo, então funciona com a sessão parada.

## Critérios

- O dev não entra em terminal de worker, leader ou judge.
- A decisão é do humano, autenticada.
- O diálogo local continua valendo.

## Opções consideradas

- **Relay de permissão pelo canal do squad, com dois kinds no log.**
- Hook de notificação que emite `blocked`, com saída pelo terminal. É o plano de volta se o spike falhar.
- Lançar todas as sessões pulando permissões. Fica como flag que o dev passa por escolha; é apetite de risco, não default.

## Decisão

Opção escolhida: **relay pelo canal**.

- O servidor MCP da sessão grava `permission_request` (peer → human); o agente aparece `blocked` e a TUI abre um modal com tool, descrição e prévia do comando.
- A decisão do dev é `permission_decision` (human → peer), enviada com a credencial humana e entregue ao servidor MCP, que devolve o veredito ao Claude Code; ela não é empurrada ao modelo.
- O pedido fecha na decisão ou em qualquer evento posterior do mesmo peer, porque o Claude Code não avisa quando o dev respondeu no terminal. Decisão tardia recebe `permission_closed`.

### Consequências positivas

- O caso mais provável de ida a outro terminal passa a ser resolvido na TUI.
- Pedidos e decisões de permissão ficam no histórico.

### Consequências negativas

- Exige Claude Code v2.1.234 ou mais novo e canal carregado. Testado com canal de desenvolvimento na v2.1.292, só com a tool Bash; a resposta no terminal antes do veredito não foi testada.
- `description` é o resumo escrito pelo modelo e não traz o comando; o modal precisa mostrar `input_preview`.
- Um agente com shell pode aprovar o próprio pedido lendo a credencial humana: mesmo limite cooperativo do ADR-008.
- Diálogos de confiança do projeto e de consentimento de servidor MCP não passam pelo relay.

## Links

- `.design/squad-mvp.md`, slices Fase 0, Event e Papéis
- `docs/fase-0/spikes.md`, spike A
- https://code.claude.com/docs/en/channels-reference#relay-permission-prompts
- ADR-004, ADR-008
