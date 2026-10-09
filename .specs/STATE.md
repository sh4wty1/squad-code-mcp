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

### AD-008
- **Decision**: A derivação ganha um oitavo status de agente, `never`, exibido `[não lançado]`, acima de `offline` na precedência: o log não tem nenhum `peer_joined` nem `peer_left` do nome.
- **Reason**: A regra de `offline` do design exige um `peer_left`. Sem a regra nova, um nome que nunca subiu cairia em `idle` e a tela mostraria uma sessão ociosa onde não há sessão; tratá-lo como `offline` diria "sessão morta" de uma sessão que nunca existiu. Decidido pelo dev em 2026-10-09, a partir dos frames 28a a 28c.
- **Trade-off**: A regra de derivação do contrato tem um status que o design não lista, e a frase da fatia Peer "o nome continua `offline` na TUI" deixa de valer para quem nunca registrou. `never` é sobre o banco inteiro, não sobre a sessão do broker: um nome que entrou uma vez nunca mais volta a `never`.
- **Scope**: `broker/shared/derive.ts`, TUI e qualquer consumidor do status derivado. Detalha o ADR-006.
- **Date**: 2026-10-09
- **Status**: active

### AD-009
- **Decision**: A TUI tira o nome do projeto do repositório de onde foi lançada, com a mesma regra `projectOf` que o broker aplica ao `git_root` da mother, e fora de um repositório mostra o rótulo `feature`. `project` continua fora de todo evento.
- **Reason**: `project` não está no log e o design diz que não é campo do evento. As alternativas eram não mostrar projeto ou mudar o contrato congelado (ADR-004). Decidido pelo dev em 2026-10-09.
- **Trade-off**: É o único dado da tela que não vem de `GET /events`. Lançada em outro repositório, a TUI mostra o nome errado, e nada avisa.
- **Scope**: TUI. Detalha o ADR-002 e o ADR-004.
- **Date**: 2026-10-09
- **Status**: active

### AD-010
- **Decision**: A TUI vive em `broker/tui/`, com entrada em `broker/tui.ts`, no mesmo pacote do broker. Os frames do handoff são extraídos uma vez para `broker/test/frames/<id>.txt` e não são editados: o teste desenha cada frame a partir de um log e só aceita linha diferente se ela estiver na tabela de desvios, com classe D1 (a derivação do design vence o valor escrito à mão), D2 (conteúdo sem fonte no log) ou D3 (item cortado na spec).
- **Reason**: O design manda usar cada frame como caso de teste, e o protótipo desenha estados escritos à mão que contradizem a derivação em vários cenários. Sem a tabela, ou os frames deixam de ser teste ou a tela copia o que o log não diz.
- **Trade-off**: Comandos da TUI rodam de dentro de `broker/`. As fatias Question e Gate herdam a tabela: os frames de modal entram do mesmo jeito, e um frame novo do Claude Design exige nova extração.
- **Scope**: TUI e as fatias Question e Gate. Detalha o AD-001.
- **Date**: 2026-10-09
- **Status**: active

### AD-011
- **Decision**: Quatro leituras da tabela de status do agente que o design não fecha. "Ticket em andamento", na regra de `waiting`, segue a cláusula de `working` de cada papel: worker com ticket cujo último evento é `task`, leader com algum ticket não concluído, judge com `result` sem `verdict`, mother nunca. "Escalou uma pergunta" inclui quem a fez. O ticket cujo último evento é um `verdict` de `rework` abaixo do limite é `working`, e o dono fica `idle`. "Nada pendente com o dev", da mother, são só as perguntas e os gates dela.
- **Reason**: As linhas 356, 358 e 364 do design deixam os quatro pontos em aberto, e cada leitura muda o status na tela. Com estas, a derivação reproduz o protótipo em todo frame de leitura menos seis casos, cada um com a linha do design que o contradiz (tabela no `design.md` da fatia). Decidido pelo dev em 2026-10-09.
- **Trade-off**: O leader do frame 10 sai `working` onde o protótipo desenha `waiting`; nenhuma leitura reproduz o 10 e o 01 ao mesmo tempo. O worker à espera da task de rework aparece `idle`, igual a um worker sem ticket: só o texto de atividade os distingue.
- **Scope**: `broker/shared/derive.ts` e TUI. Detalha o ADR-006.
- **Date**: 2026-10-09
- **Status**: active

## Handoff

Atualizado em 2026-10-09. PR 8: https://github.com/sh4wty1/squad-code-mcp/pull/8.

- **Feature**: TUI leitura, `.specs/features/tui-leitura/`.
- **Phase / Task**: verificação concluída; correções commitadas e publicadas após aprovação do dev.
- **Completed**: T1–T30 e F1–F4 corrigidos. Verifier independente, rodada 3: PASS, 64/64 ACs, 9/9 bordas, 24/24 mutações mortas ao final. Requisitos Verified e TUI leitura marcada no ROADMAP.
- **In-progress** (file:line): nenhuma implementação em curso. Correções em `1eaf4b1`, `a943d95`, `83f1eef` e `98b8323`, publicadas sobre `004fe43`; tabela Resolution em `.specs/features/tui-leitura/fix-round-2.md:9`.
- **Next step**: conferir a resolução F1–F4 no PR 8 se solicitado; Question é a próxima fatia e não foi iniciada. Não fazer merge sem instrução do dev.
- **Blockers**: nenhum bloqueio técnico; commits e push aprovados pelo dev em 2026-10-09. Windows, macOS e terminal interativo real não executados nesta rodada.
- **Uncommitted files**: após o commit documental aprovado, somente os três registros anteriores preservados: `docs/tasks/2026-10-09-handoff-pr-8.md`, `docs/tasks/2026-10-09-judge-pr-8.md` e `docs/tasks/2026-10-09-sincronizar-e-localizar-retomada.md`. Não incluídos no escopo aprovado.
- **Branch**: `feat/tui-leitura`, base revisada `004fe43`; correções publicadas até `98b8323`, seguidas pelo commit documental aprovado. Sem merge.

### Evidência e limites

- TypeScript passa; Linux com Bun 1.3.14: 929 testes passam, zero falham/pulados, 5664 assertions, 48 arquivos. `validate_state.py tui-leitura`: exit 0.
- Sensor em cópia isolada: os oito sobreviventes da rodada 2, as duas prioridades clarificadas e 14 mutações novas morreram. Shift-tab sobreviveu inicialmente ao teste de texto; após asserção da saída ANSI morreu na repetição. L-049 registrada como candidata.
- Os 41 frames permanecem idênticos à extração original. Relatório: `.specs/features/tui-leitura/validation.md`; registro: `docs/tasks/2026-10-09-corrigir-review-pr-8.md`.
- A review The Judge original foi COMMENT com quatro should-fix. F1–F4 foram conferidos localmente; nenhuma nova review ou resolução de comentários foi publicada no GitHub.
- Nunca subir `broker.ts` ou `server.ts` manualmente sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários; não usar `bun x tsc`.
- Compatibilidade Windows e terminal real são limites explícitos do relatório. Pendências anteriores continuam em ROADMAP, design e histórico deste STATE; nenhuma foi implementada fora do escopo.
