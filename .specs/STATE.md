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

### AD-005
- **Decision**: `/send` só aceita `task`, `result` e `verdict`, e a fatia Event acrescenta quatro códigos de recusa ao contrato: `invalid_kind` (kind fora dos três em `/send`), `invalid_field` (campo presente, do tipo certo e com valor não permitido), `ticket_closed` (`task` para ticket aprovado) e `invalid_token` (credencial humana errada). Um `task` gravado depois de um `result` tira desse `result` o direito a `verdict` (`stale_reference`).
- **Reason**: O design só nomeia `missing_field` para problema de campo e não diz o que acontece com um `task` para ticket aprovado nem com um `task` que chega entre o `result` e o `verdict`. Os outros kinds têm rota própria.
- **Trade-off**: `missing_field` continua valendo para ausente ou de tipo errado, como na Peer; quem consome o contrato trata dois códigos de campo. As fatias Question e Gate herdam `invalid_field` e `invalid_token`.
- **Scope**: Broker, servidor MCP, TUI e skills de papel. Detalha o ADR-002, o ADR-004 e o ADR-010.
- **Date**: 2026-10-08
- **Status**: active

### AD-006
- **Decision**: Só `task`, `result`, `verdict` e `plan` exigem feature aberta. `blocked`, `unblocked`, `usage`, `turn_started`, `permission_request`, `permission_decision` e `refused` são gravados com `feature_id` nulo quando não há feature. A feature aberta é a linha de `features` com `closed_seq` nulo; a tabela é criada na fatia Event e preenchida a partir da fatia Feature.
- **Reason**: O envelope do design diz "nulo só em presença e em `usage` fora de feature", mas o hook de início de turno dispara em todo turno, inclusive na conversa de descoberta da mother, e recusar gravaria um `refused` por turno. `/open-feature` é da fatia seguinte, e a Event precisa de `no_open_feature` e de `feature_id`.
- **Trade-off**: Contraria a letra do envelope. Entre Event e Feature, em uso real, todo `task`, `result`, `verdict` e `plan` recebe `no_open_feature`; só os testes inserem a linha.
- **Scope**: Broker, TUI (regra de derivação) e fatia Feature. Detalha o ADR-004 e o ADR-006.
- **Date**: 2026-10-08
- **Status**: active

### AD-007
- **Decision**: A credencial humana fica num arquivo em `SQUAD_TOKEN_FILE`, default `<home>/.squad-code-mcp.token`. O broker cria o arquivo com um token aleatório se ele não existe e reusa o que existe. Quem escreve como `human` envia o conteúdo em `human_token`.
- **Reason**: O design pede a credencial "gerada pelo broker e fora de qualquer worktree" e a descreve na fatia Gate, mas `/permission-decision` já precisa dela na Event.
- **Trade-off**: Um agente com shell lê o arquivo: é o limite cooperativo do ADR-008. A TUI precisa do mesmo caminho que o broker.
- **Scope**: Broker, TUI, fatias Question e Gate. Detalha o ADR-008 e o ADR-011.
- **Date**: 2026-10-08
- **Status**: active

## Handoff

Escrito em 2026-10-08. A fatia Feature está implementada e verificada no branch `feat/feature`, com o PR 4 aberto (https://github.com/sh4wty1/squad-code-mcp/pull/4).

- **Feature**: fatia Feature, `.specs/features/feature/`
- **Phase / Task**: Execute concluído. T1 a T31, um commit por tarefa, de `c76e70b` a `ae14f01`.
- **Completed**: FEAT-01 a FEAT-33, todos verificados. `validate_state.py feature` sai com 0.
- **In-progress** (file:line): nada
- **Next step**: revisão do PR 4 por `/the-judge` e merge. Depois, a fatia TUI leitura, que pede antes a segunda rodada de frames (`ROADMAP.md`, Pendências).
- **Blockers**: nenhum
- **Uncommitted files**: none
- **Branch**: `feat/feature`, saído da `main` em `61e1411`. Está no `origin`.

### Como a verificação ficou

Relatório em `.specs/features/feature/validation.md`, verificado em `ae14f01`, PASS.

- 33 de 33 ACs e os 10 edge cases com evidência `file:line` e valor igual ao da spec.
- 57 mutações, 55 mortas. As duas sobreviventes estão em `features()` de `broker/shared/derive.ts` e foram classificadas como equivalentes: só um log que viole FEAT-09 ou FEAT-12 as distingue. Um caso de unidade com log malformado mataria as duas, se o Lucas quiser.
- Auditoria da migração dos testes: mesma contagem por arquivo, nenhum teste apagado, pulado ou afrouxado.
- Lacunas não bloqueantes anotadas no relatório: o edge case de `/open-feature` com feature aberta só é exercitado com o `leader`, não com um worker; FEAT-09 "por qualquer conexão" é provado com SQL cru e arquivo reaberto, não com duas conexões simultâneas.
- Nenhuma lição nova.

### O que a fatia TUI leitura precisa saber

- `features(events)` em `broker/shared/derive.ts` devolve as linhas de `features` sem `project`, a partir de `GET /events`. `project` não está em nenhum evento: a TUI que quiser o nome do projeto não o tem pelo log.
- `feature_opened` e `feature_closed` têm `to` `*` e uma entrega para cada um dos cinco nomes que não são `mother`, com sessão ou não. Um nome nunca lançado acumula duas entregas por feature.
- Encerrar não grava nada além do `feature_closed`: um `blocked` aberto continua aberto e as entregas pendentes continuam pendentes.
- `/close-feature` ainda não confere gate (`gate_required` entra com a fatia Gate).
- O comentário sobre a tabela `features` em `broker/db.ts` ainda diz que a fatia Feature é quem a preenche; ficou desatualizado.
- Brecha conhecida da Event, ainda aberta: ticket descartado que nunca recebeu `task` pode sumir de um `plan` e voltar no seguinte.
- `SQUAD_POLL_INTERVAL_MS` não numérica vira `NaN` em `broker/shared/config.ts`; ninguém tratou.

### Ambiente

- O `bun` do `PATH` é o 1.3.14 (WinGet). O 1.4.2 de `~/.bun/bin` não existe mais. A fatia Feature rodou inteira no 1.3.14.
- De dentro de `broker/`: `bun node_modules/typescript/bin/tsc --noEmit && bun test`. No Windows: 539 testes, 536 passam, 3 pulados, uns 45 s. Só `test/unit`: 400 testes.
- `bun x tsc` baixa um `tsc` 7 em vez de usar o TypeScript 5.9.3 instalado, e ele acusa centenas de erros de tipo global. `broker/CLAUDE.md` ainda mostra `bun x tsc --noEmit`.
- Teste instável: `EVT-43: /ack confirms...` em `broker/test/integration/routes.test.ts` compara `Date.now()` do teste com o relógio do processo do broker e falha de vez em quando por poucos ms. Rodar de novo.
- `broker/test/integration/server.test.ts` (`PEER-34`) copia uma lista fixa de fontes: módulo novo importado pelo `broker.ts` ou pelo `server.ts` tem de entrar nela.
- Os testes de integração sobem processos reais, sempre com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Nunca subir `broker.ts` ou `server.ts` à mão sem os dois: ele cria `~/.squad-code-mcp.db` e `~/.squad-code-mcp.token`.
- No bun, `await expect(promessa).rejects...` trava o laço de eventos nos testes de integração.
- No Git Bash desta máquina, um heredoc pode trocar `\\` por `\` ao gravar um arquivo.
- Python é `py -3`; `python3` não está instalado.
- Mensagens de commit seguem a convenção do repositório (frase imperativa em minúsculas), não Conventional Commits.

### Não verificado

- Linux: nem a suíte da Event nem a da Feature rodaram lá. O WSL Debian desta máquina não tem bun.
- Sessão real do Claude Code: abertura e encerramento de feature, push de evento e veredito de permissão só foram vistos por cliente MCP de teste.
- O intervalo padrão de 1 s é testado por tempo de relógio.
- Da Peer, continuam sem verificar: macOS e a sobrevivência do broker ao fechamento de uma janela de terminal real.
