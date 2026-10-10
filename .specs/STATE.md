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

### AD-012
- **Decision**: O `feature_closed` encerra as perguntas da feature, em `delivered` e em `abandoned`, sem evento novo. Na tabela `questions` a pergunta vira `defaulted` se tem default e `discarded` se não tem, um quinto status que o design não lista; a derivação trata pergunta de feature fechada do mesmo jeito.
- **Reason**: O design só diz "resolvidas pelo default ou descartadas" e não dá evento nem status para isso. O `feature_closed` já é entregue a todos, e o envelope do ADR-004 fica como está. Decidido pelo dev em 2026-10-10.
- **Trade-off**: O log não diz, pergunta a pergunta, o que aconteceu no encerramento, e o resumo da feature fechada não conta essas perguntas como respondidas nem como default. Um agente pausado numa bloqueante só sabe que ela acabou pelo `feature_closed`.
- **Scope**: `broker/log.ts`, `broker/shared/derive.ts`, tabela `questions`, e a fatia Gate, que tem o mesmo caso com gates pendentes. Detalha o ADR-005.
- **Date**: 2026-10-10
- **Status**: active

### AD-013
- **Decision**: O que uma pergunta é sai do primeiro `question` dela: texto (`body`, ou `summary` se o `body` é vazio), `why`, `options`, `default`, `asked_by` e `blocking`. `/escalate` copia esses campos e o `timeout_s` para cada `question` novo; o `summary` e o `body` de quem escala são a nota do salto e aparecem só no feed e no thread.
- **Reason**: Os frames têm um texto por pergunta e `/escalate` aceita `summary` e `body` novos a cada salto. É a regra que a derivação já usava para `asked_by`, `blocking` e `default`. Decidido pelo dev em 2026-10-10.
- **Trade-off**: A mother não consegue reescrever a pergunta para o dev: se o texto do worker é ruim, o dev lê o texto ruim. A skill de papel tem de fazer o agente perguntar direito na origem.
- **Scope**: `broker/question.ts`, `broker/shared/derive.ts`, TUI e as skills da fatia Papéis. Detalha o ADR-005.
- **Date**: 2026-10-10
- **Status**: active

### AD-014
- **Decision**: A TUI escreve por um comando que o redutor de teclas deixa no estado (`Ui.send`); o laço de `tui.ts` faz o `POST` e devolve o resultado a outro redutor puro (`settle`). A credencial humana é lida do arquivo a cada envio.
- **Reason**: `press` é pura e testada sem rede; um `fetch` dentro dela acabaria com isso. O broker pode criar o arquivo do token depois de a TUI subir.
- **Trade-off**: Um envio são dois passos no estado, e enquanto ele espera resposta o modal não aceita tecla.
- **Scope**: `broker/tui/keys.ts`, `broker/tui.ts`, e os modais de gate e de permissão da fatia Gate. Detalha o AD-007 e o AD-010.
- **Date**: 2026-10-10
- **Status**: active

## Handoff

Atualizado em 2026-10-10.

- **Feature**: Question, `.specs/features/question/`.
- **Phase / Task**: concluída e verificada; falta a review e o merge do PR.
- **Completed**: T1–T38, F1–F11 (`fix-round-1.md`) e F12–F13 (`fix-round-2.md`). Verifier independente, rodada 3: PASS, 98/98 requisitos, 36 de 38 mutações mortas (as duas que sobraram estão fora da fatia ou fora da spec). Requisitos Verified e Question marcada no ROADMAP.
- **In-progress** (file:line): nada.
- **Next step**: o dev olha a aba e o modal num terminal real (`bun tui/demo.ts 04`, de dentro de `broker/`: `4`, `enter`, responder) e decide a review e o merge do PR. Depois do merge, a fatia Papéis sai da `main` atualizada. Não fazer merge sem instrução do dev.
- **Blockers**: nenhum bloqueio técnico. O merge é decisão do dev.
- **Uncommitted files**: none.
- **Branch**: `feat/question`, saído da `main` em `9a4d921`.

### O que esta fatia deixa para as próximas

- Papéis: as skills de papel têm de fazer o agente perguntar direito na origem, porque o texto que o dev lê é o do primeiro `question` (AD-013), e de pedir uma credencial com "coloque no lugar e confirme". Um agente pausado numa bloqueante só sabe que ela acabou no encerramento pelo `feature_closed` (AD-012).
- Gate: os modais de gate e de permissão escrevem como o de resposta, por um comando em `Ui` (AD-014), e a regra de colagem do modal de resposta (QST-78) vale para o campo de texto deles. `g` e `x` continuam com o aviso `chega com a fatia Gate`.
- Gate: gates pendentes no encerramento da feature são o mesmo caso das perguntas (AD-012).

### Evidência e limites

- Windows 11, Bun 1.4.2, em `2ac91fe`: `tsc` passa; 1270 passam, 3 pulados por condição de plataforma anterior à fatia, zero falham, 63 arquivos. Antes da fatia: 926 passam, 3 pulados.
- Linux, contêiner `oven/bun:1.4.2` (kernel 6.18 do WSL2) sobre um clone limpo: `tsc` passa e a suíte inteira passou em 10 de 13 execuções sobre o código final, com 1273 passando e zero pulados. As 3 que falharam caíram cada uma num teste de integração anterior à fatia (`EVT-85` duas vezes, `EVT-89` uma), por tempo esgotado à espera de um broker ou servidor MCP real. A `main` falha do mesmo jeito no mesmo contêiner (`EVT-81`, 1 de 14 repetições de `server-delivery.test.ts` e `server-tools.test.ts`; o HEAD passou 14 de 14): a instabilidade é anterior à fatia e não teve a causa investigada.
- `validate_state.py question`: exit 0. Relatório em `.specs/features/question/validation.md`.
- Os 41 frames de leitura permanecem idênticos à extração original; os 6 de Question (04, 05, 06, 07, 20a, 20b) são a saída da ferramenta, sem edição, e nenhum tem desvio D3.
- Riscos conhecidos, não corrigidos: `expire` roda num `setInterval` sem `try` em `broker.ts`, como o `cleanStale`, e uma exceção num temporizador do Bun encerra o broker; uma colagem que o terminal entrega em várias leituras, com o `\r` sozinho numa delas, envia a resposta; `tui/demo.ts` não tem teste automático.
- Rodar de dentro de `broker/`: `bun test` e `bun node_modules/typescript/bin/tsc --noEmit`. Não usar `bun x tsc`. No Linux desta máquina a suíte roda num contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps` instalados dentro dele, sobre um clone do repositório; o WSL Debian não tem `bun`.
- Nunca subir `broker.ts` ou `server.ts` à mão sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.
- Não exercitados: terminal interativo real (teclas, colagem, cores como a fonte desenha), macOS, sinais reais e uma sessão do Claude Code perguntando e recebendo a resposta. Pendências anteriores continuam em ROADMAP, design e histórico deste STATE.
