# STATE

Só decisões novas. O que já está em `docs/adr/` não se repete aqui.

## Decisions

### AD-001
- **Decision**: O código do fork vive em `broker/`, e o primeiro commit desse diretório é a cópia fiel do upstream em `640183f`.
- **Reason**: A raiz já tem o `README.md` e o `.gitignore` do projeto, e o design pede o plugin da fatia Papéis em diretório separado do broker. A cópia sem alteração deixa o `git diff` contra o import mostrar tudo o que o fork mudou.
- **Trade-off**: Comandos rodam de dentro de `broker/`. A TUI, que compartilha tipos com o broker, importa de lá ou força uma reorganização.
- **Scope**: Todas as fatias de código. Detalha o ADR-001.
- **Date**: 2026-10-07
- **Status**: active

### AD-002
- **Decision**: O broker só aceita os seis nomes do ADR-003, amarrados ao papel, e a fatia Peer acrescenta dois códigos de recusa ao contrato: `invalid_name` (nome fora da lista ou de outro papel) e `unknown_peer` (credencial que o broker não conhece).
- **Reason**: O design lista os nomes mas não dá erro para o nome inválido, e exige `{ id }` em toda rota sem nomear o erro da credencial desconhecida. A lista fixa é o que permite listar um nome como `offline` depois que a linha do peer é apagada.
- **Trade-off**: Crescer o squad exige mudar a lista no broker, não só o launcher. Com a lista fixa, `name_taken` nunca aparece para mother, leader ou judge: `role_taken` chega antes.
- **Scope**: Broker, servidor MCP e toda rota das fatias seguintes que recebe `{ id }`. Detalha o ADR-003 e o ADR-010.
- **Date**: 2026-10-07
- **Status**: active

### AD-003
- **Decision**: A sessão lê nome e papel de `SQUAD_NAME` e `SQUAD_ROLE`. O broker usa `SQUAD_PORT` (default 7900) e `SQUAD_DB` (default `<home>/.squad-code-mcp.db`). O servidor MCP e o canal se chamam `squad`.
- **Reason**: O design pede porta e banco próprios para conviver com um claude-peers instalado (7899, `~/.claude-peers.db`) e não dá os nomes. O launcher da fatia Papéis precisa deles.
- **Trade-off**: Trocar qualquer um depois muda o launcher, o plugin e a lista de tools permitidas (`mcp__squad__*`).
- **Scope**: Broker, servidor MCP, CLI, launcher e plugin. Detalha o ADR-001 e o ADR-003.
- **Date**: 2026-10-07
- **Status**: active

### AD-004
- **Decision**: A fatia Peer remove a troca de mensagens do upstream (tabela `messages`, `/send-message`, `/poll-messages`, `/set-summary`, as tools correspondentes e o laço de polling do servidor MCP) em vez de mantê-la até a fatia Event.
- **Reason**: Ela endereça por `id`, que deixou de ser listado, confia no remetente do corpo e apaga mensagens não entregues: os três comportamentos que ADR-002, ADR-003 e ADR-009 mandam não copiar. Mantê-la deixaria no ar rotas que contradizem o contrato.
- **Trade-off**: Entre Peer e Event o fork não troca mensagens, e o polling de 1 s que o design lista como inalterado não existe. A fatia Event precisa recriar o laço de polling no servidor MCP sobre `/poll-messages` e `/ack`.
- **Scope**: Fatias Peer e Event.
- **Date**: 2026-10-07
- **Status**: active

## Handoff

Escrito em 2026-10-07. Para retomar: `git fetch && git checkout feat/peer`, depois `/tlc-spec-driven resume work`.

- **Feature**: fatia Peer, `.specs/features/peer/`
- **Phase / Task**: fechada. T1 a T21 feitas; PR 2 pronto para revisão.
- **Completed**: T1 a T21
- **In-progress** (file:line): nada
- **Next step**: fatia Event, em branch nova a partir de `feat/peer` (ou de `main` depois do merge do PR 2).
- **Blockers**: nenhum
- **Uncommitted files**: none
- **Branch**: `feat/peer`, no remoto. PR: https://github.com/sh4wty1/squad-code-mcp/pull/2

### Como a Peer fechou

A verificação independente rodou seis vezes e deu FAIL nas seis; a fatia foi fechada por decisão do Lucas sem um PASS. Nenhuma das duas últimas rodadas achou resposta do código contrária à spec: o FAIL veio de mutações que a suíte não matava.

- Rodada 6 (`.specs/features/peer/validation.md`, verificada em `ec2aba6`): 27 mutações, 20 mortas, 5 sobreviventes. As cinco foram fechadas em `a247e09` e reaplicadas pelo autor numa cópia: todas morrem. Uma sétima rodada foi iniciada e interrompida antes de dar veredito.
- `validate_state.py peer` continua saindo com 1 por causa do FAIL gravado.
- A rastreabilidade de `spec.md` ficou em `Implementing`, não `Verified`, pelo mesmo motivo.

### O que a fatia Event precisa saber

- Peer vivo é PID existente e heartbeat nos últimos 60 s (PEER-14, PEER-42, PEER-43). O servidor MCP manda `/heartbeat` a cada 15 s (PEER-46).
- `/heartbeat` com `id` desconhecido responde `{ ok: true }` sem efeito. Uma sessão tirada pela limpeza não fica sabendo e não volta sozinha.
- AD-004: o laço de polling do servidor MCP saiu na Peer e precisa ser recriado sobre `/poll-messages` e `/ack`.

### Ambiente

- Bun 1.3 ou mais novo. De dentro de `broker/`: `bun install`, depois `bun x tsc --noEmit && bun test`. Esperado no Linux: 98 testes passando, uns 12 s.
- Os testes de integração sobem processos reais em portas livres e sempre com `SQUAD_DB` temporário. Nunca subir `broker.ts` ou `server.ts` à mão sem `SQUAD_DB`: ele cria `~/.squad-code-mcp.db`.
- No bun, `await expect(promessa).rejects...` trava o laço de eventos nos testes de integração; os testes evitam isso de propósito.
- Mensagens de commit seguem a convenção do repositório (frase imperativa em minúsculas), não Conventional Commits.

### Não verificado

- Sessão real do Claude Code: os testes usam um cliente MCP de teste. Ninguém viu o ping chegar a um modelo nem `tools/list_changed` trocar as tools, nem antes nem depois do SDK 1.32.1.
- A suíte no Windows depois de `2f50812`. Os testes novos de `kill-broker` com `lsof` falso são pulados lá; o que esvazia o `PATH` não foi rodado lá.
- macOS: nada rodou. O teste de PEER-45 é pulado onde `127.0.0.2` não aceita escuta.
- Sobrevivência do broker ao fechamento de uma janela de terminal real.
