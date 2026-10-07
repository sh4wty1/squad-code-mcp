# ADR-001: Fork do claude-peers como base do broker

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: broker, fundação

## Contexto e problema

O squad precisa que várias sessões do Claude Code na mesma máquina troquem mensagens e sejam acordadas quando uma mensagem chega. O `louislva/claude-peers-mcp` (lido no commit `640183f`) já resolve essa parte: um daemon HTTP único em `127.0.0.1` com SQLite, um servidor MCP stdio por sessão e o push pelo canal do Claude Code.

## Critérios

- Não reescrever o que já funciona: daemon, registro, heartbeat, polling de 1 s, limpeza por PID morto.
- O contrato do squad (papéis, topologia, log de eventos) não existe no upstream e muda o schema.
- Tem de rodar no Windows, e o upstream não roda inteiro.

## Opções consideradas

- **Fork: copiar o código e mudar por dentro.**
- Usar o claude-peers instalado e pôr o squad por cima, com um MCP chamando o outro. Descartada: o remetente é um campo que quem chama preenche, a entrega é marcada antes de chegar à sessão e mensagens não entregues são apagadas; nada disso se corrige por fora.
- Escrever do zero. Descartada: refaz daemon, registro e canal sem ganho.

## Decisão

Opção escolhida: **fork**. O código do upstream é reaproveitado; nunca um MCP chama outro. O fork usa porta e caminho de banco próprios para conviver com um claude-peers instalado.

### Consequências positivas

- A fase 1 começa de um daemon que já funciona.
- Os três comportamentos do upstream que o squad não pode herdar são corrigidos na origem (ADR-002, ADR-003, ADR-009).

### Consequências negativas

- O fork não acompanha o upstream: a tabela `messages` deixa de existir e as rotas mudam.
- Trabalho de Windows na fase 1: o caminho do banco depende de `HOME`, o comando de parar o broker usa `lsof`, e a sobrevivência do daemon ao fechamento do terminal que o subiu não foi verificada.

## Links

- `.design/squad-mvp.md`, seções Situation e Unchanged
- https://github.com/louislva/claude-peers-mcp
