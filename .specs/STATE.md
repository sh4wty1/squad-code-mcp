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
- **Phase / Task**: Execute, depois da T11. Código pronto; falta fechar a verificação.
- **Completed**: T1 a T11 (a T11 sem verificação independente aprovada)
- **In-progress** (file:line): nada pela metade
- **Next step**: decidir entre os dois caminhos abaixo e aplicar as correções da rodada 4.
- **Blockers**: decisão do Lucas sobre como fechar (abaixo).
- **Uncommitted files**: none
- **Branch**: `feat/peer`, no remoto. PR em rascunho: https://github.com/sh4wty1/squad-code-mcp/pull/2

### Onde parou

A verificação independente rodou quatro vezes e deu FAIL nas quatro. O relatório da rodada 4 está em `.specs/features/peer/validation.md`. Na rodada 4 não há defeito de código: a sondagem à mão fez 346 chamadas ao broker real sem nenhum 500 e sem resposta contrária à spec. O FAIL vem de duas asserções faltando:

1. `broker/test/unit/register.test.ts`, teste de `cwd` em PEER-10: falta `expectRefusal` para `cwd: 5` e `cwd: { a: 1 }` (mutante X5 em `broker/peers.ts:100`).
2. `broker/test/integration/broker.test.ts`, teste "PEER-12/18/21": falta `expect(listed.json.hint.length).toBeGreaterThan(0)` (mutante X1 em `broker/broker.ts:65`).

Três comportamentos que a spec não define, achados na rodada 4 e ainda sem decisão:

- `ready` sem argumentos termina em erro interno do JSON-RPC (TypeError em `broker/server.ts:220`) em vez da mensagem de erro normal. Não registra, mas por acidente.
- `ready` aceita o número como texto ou como lista de um item, por causa da comparação por `String()`.
- `POST //register` é roteado como `/register`; métodos que não são `POST` nas quatro rotas respondem 200 sem efeito.

### Decisão pendente

1. Fechar aqui (recomendado): as três asserções, endurecer `ready` sem argumento, commit, marcar a fatia em `ROADMAP.md`, tirar o PR de rascunho. `validate_state.py` continua acusando FAIL porque o último relatório gravado é o da rodada 4; dizer isso no PR. O portão passa a ser a revisão por `/the-judge`.
2. Quinta rodada: mesmas correções e mais uma verificação (uns 20 minutos), com risco de outro FAIL por asserção faltando. Cada rodada injeta mutações diferentes.

### Ainda por fazer em qualquer caminho

- Marcar a fatia Peer em `ROADMAP.md` e atualizar a linha "Agora".
- Atualizar a descrição do PR #2: ela fala em três rodadas e 85 testes.
- Passar a traceability de `spec.md` de `Implementing` para `Verified` e o status de `tasks.md` para `Done`.

### Ambiente

- Precisa do Bun 1.3 ou mais novo. No PC onde isto foi escrito ele não estava instalado; foi usada uma cópia local em pasta temporária (`npm install bun@1.3.14` numa pasta fora do repositório).
- De dentro de `broker/`: `bun install`, depois `bun x tsc --noEmit && bun test`. Esperado: 85 testes passando, uns 16 s.
- Os testes de integração sobem processos reais em portas livres e sempre com `SQUAD_DB` temporário. Nunca subir `broker.ts` ou `server.ts` à mão sem `SQUAD_DB`: ele cria `~/.squad-code-mcp.db`.
- No bun, `await expect(promessa).rejects...` trava o laço de eventos nos testes de integração; os testes evitam isso de propósito.
- Mensagens de commit seguem a convenção do repositório (frase imperativa em minúsculas), não Conventional Commits.

### Não verificado

- Sessão real do Claude Code: os testes usam um cliente MCP de teste. Ninguém viu o ping chegar a um modelo nem `tools/list_changed` trocar as tools.
- Sobrevivência do broker ao fechamento de uma janela de terminal real.
- `SIGINT` e `SIGTERM` no servidor MCP, e os caminhos que não são Windows (`lsof`, `EPERM`, `homedir` em POSIX).
