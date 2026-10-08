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

Escrito em 2026-10-08. Para retomar: `git checkout feat/event`, depois `/tlc-spec-driven resume work`.

- **Feature**: fatia Event, `.specs/features/event/`
- **Phase / Task**: Execute. T1 a T24 feitas; verificação independente em FAIL depois de três rodadas, que é o limite. Falta a decisão do Lucas sobre como fechar.
- **Completed**: T1 a T24, mais três commits de teste que respondem às rodadas 1, 2 e 3
- **In-progress** (file:line): nada
- **Next step**: decidir (a) o que vale `ticket_ref` vazio em `/blocked` (`broker/session.ts:39`, lacuna 9 do relatório) e (b) se a fatia fecha como está ou ganha uma ferramenta de mutação. Depois: marcar a Event em `ROADMAP.md`, push e PR, que ainda não foram pedidos.
- **Blockers**: decisão humana, acima
- **Uncommitted files**: none
- **Branch**: `feat/event`, só local, saído de `feat/peer`. O PR 2 (Peer) continua aberto: mesclá-lo antes do PR da Event, senão o diff dela carrega a Peer.

### Como a verificação ficou

Relatório em `.specs/features/event/validation.md`, verificado em `53ffdf4`. Nas três rodadas nenhum comportamento do código contrariou a spec; todo FAIL veio de mutação que a suíte não matava.

- Rodada 1 (`8d1ac88`): 127 mutações, 2 sobreviventes reais. Fechadas em `bb7054a`.
- Rodada 2 (`bb7054a`): 16 novas, 4 sobreviventes, todas em `server.ts`. Fechadas em `53ffdf4`.
- Rodada 3 (`53ffdf4`): 20 novas, 3 sobreviventes. Duas ganharam teste no commit seguinte, sem nova rodada: ninguém reaplicou os mutantes R14 e R20 depois dele. A terceira (R16) espera a decisão (a).
- Total: 158 de 163 mutações mortas, 2 equivalentes. O verificador diz que a amostragem dirigida acha um sobrevivente a cada seis, com gravidade caindo, e que mais rodadas à mão não convergem a zero.
- `validate_state.py event` sai com 1 por causa do FAIL gravado. A rastreabilidade da spec ficou em `Implementing`.
- Lições candidatas L-021 a L-036 em `.specs/lessons.json`; nenhuma confirmada.

### O que a fatia Feature precisa saber

- A tabela `features` já existe (AD-006). `/open-feature` precisa gravar a linha e o `feature_opened` na mesma transação; `log.openFeature()` lê a linha com `closed_seq` nulo.
- Não há índice único que impeça duas features abertas: é da Feature.
- `events` é append-only por gatilho. Fechar feature grava `closed_seq` em `features`, não em `events`.
- O formato de leitura não traz `question_id` nem `gate_id`; `log.record` também não os recebe.
- Brecha conhecida, registrada na spec: ticket descartado que nunca recebeu `task` pode sumir de um `plan` e voltar no seguinte.
- `SQUAD_POLL_INTERVAL_MS` não numérica vira `NaN` em `broker/shared/config.ts`; ninguém tratou.

### Ambiente

- Bun 1.4.2 em `~/.bun/bin`, instalado nesta sessão; pode não estar no `PATH` de um terminal antigo. De dentro de `broker/`: `bun x tsc --noEmit && bun test`. No Windows: 423 testes, 420 passam, 3 pulados, uns 40 s.
- Os testes de integração sobem processos reais, sempre com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Nunca subir `broker.ts` ou `server.ts` à mão sem os dois: ele cria `~/.squad-code-mcp.db` e `~/.squad-code-mcp.token`.
- No bun, `await expect(promessa).rejects...` trava o laço de eventos nos testes de integração.
- Mensagens de commit seguem a convenção do repositório (frase imperativa em minúsculas), não Conventional Commits.

### Não verificado

- Linux: a suíte da Event não rodou lá. O WSL Debian desta máquina não tem bun.
- Sessão real do Claude Code: push de evento e veredito de permissão só foram vistos por cliente MCP de teste.
- O intervalo padrão de 1 s é testado por tempo de relógio.
- Da Peer, continuam sem verificar: macOS e a sobrevivência do broker ao fechamento de uma janela de terminal real.
