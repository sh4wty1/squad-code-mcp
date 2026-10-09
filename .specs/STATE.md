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

Escrito em 2026-10-09, com a fatia TUI leitura implementada e reprovada pelo Verifier. O branch está no GitHub; não há PR.

- **Feature**: fatia TUI leitura, `.specs/features/tui-leitura/`
- **Phase / Task**: Execute. T1 a T30 commitadas (`4657be1` a `1f377d5`). O Verifier deu FAIL na primeira rodada.
- **Completed**: T1 a T30. Nenhum requisito está `Verified`.
- **In-progress** (file:line): nada
- **Next step**: fechar as lacunas listadas em `.specs/features/tui-leitura/fix-round-1.md` (o handoff da rodada de correção; o relatório completo é o `validation.md`) e rodar o Verifier de novo. Só depois: marcar a fatia em `ROADMAP.md`, atualizar a rastreabilidade da spec e abrir o PR.
- **Blockers**: veredito FAIL. `validate_state.py tui-leitura` sai com 1.
- **Uncommitted files**: none
- **Branch**: `feat/tui-leitura`

### O que o Verifier achou

Relatório em `.specs/features/tui-leitura/validation.md`, sobre `main..1f377d5`. Nenhum comportamento contradiz a spec; o FAIL é dos testes.

- 56 de 64 ACs com evidência que bate com a spec; 9 de 9 edge cases.
- 210 mutações, 186 mortas, 24 sobreviventes, 18 delas não equivalentes: TUI-60, TUI-61, TUI-56, TUI-40, TUI-45, TUI-10, TUI-16, TUI-35, TUI-57, TUI-37, TUI-41, TUI-62, mais TUI-59 e TUI-58, que estão dentro de limites já declarados.
- Um log de teste dobrado: `broker/test/frames/logs.ts:263` tem um `refused` de `worker_busy` com `peer: worker-1`, e o broker o grava para o leader (`send.ts:116`). Falta trocar pelo evento legítimo e declarar o desvio D1 no frame 25a.
- Quatro lacunas de precisão da spec, ainda sem decisão do dev: um `usage` reenviado desenha a linha de `stalled` duas vezes (TUI-25); `◌ parado` em ticket `done`, `planned` ou `dropped` (TUI-37); a legenda mantém `g`, `x`, `enter responder` e "a TUI escreve três coisas" (TUI-49); o prazo `? m:ss` depois de vencido.
- Os 41 frames são idênticos byte a byte a uma nova extração do zip. Os 16 desvios de status são exatamente a tabela do `design.md`, cada um com a linha do design.

### Ambiente

- De dentro de `broker/`: `bun node_modules/typescript/bin/tsc --noEmit && bun test`. Windows, bun 1.3.14, em `1f377d5`: 893 testes, 890 passam, 3 pulados, uns 60 s. Nunca `bun x tsc`.
- Linux, em `1f377d5`: 893 passam, 0 falham, 0 pulados, no contêiner `oven/bun:1.3.14` com `git`, `lsof` e `procps` instalados por `apt-get` e a suíte rodada num clone do branch. Sem `lsof` e `ps`, `PEER-34`, `PEER-35` e `PEER-45` falham, na `main` também: a imagem não os traz.
- A TUI roda com `bun tui.ts`; a sonda de glifos com `bun tui/probe.ts`. No Windows Terminal 1.24.11911.0 os 43 glifos contam uma célula.
- Teste instável: `EVT-43` em `broker/test/integration/routes.test.ts` falha de vez em quando por 1 ms. Sob carga a suíte de integração já estourou tempo uma vez e passou na repetição.
- Os testes de integração sobem processos reais, sempre com `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Nunca subir `broker.ts` ou `server.ts` à mão sem os dois.
- No bun, `await expect(promessa).rejects...` trava o laço de eventos nos testes de integração, e um `fetch` falso que escuta `AbortSignal.timeout` trava o `bun test`.
- No Git Bash desta máquina, crase dentro de heredoc quebra o comando, e um heredoc pode trocar `\` por `\`.
- Python é `py -3`; `python3` não está instalado.
- Mensagens de commit seguem a convenção do repositório (frase imperativa em minúsculas), não Conventional Commits.

### Pendências que a fatia deixa

- `cost()` casa o nome do modelo exato: um `usage.model` com sufixo de data ou `[1m]` custa zero sem aviso. É da fatia Papéis, que entrega o hook.
- `/escalate`, na fatia Question, precisa copiar `timeout_s` para o `question` que chega ao dev; senão o prazo cai em 240 s.
- Nenhuma tecla limpa a seleção do feed: depois de selecionar uma linha, o resumo da última feature (TUI-40) não volta.
- A tela de broker desconectado diz "a cada 1s" qualquer que seja `SQUAD_POLL_INTERVAL_MS`.
- Da Event, ainda aberta: ticket descartado que nunca recebeu `task` pode sumir de um `plan` e voltar no seguinte; `SQUAD_POLL_INTERVAL_MS` não numérica vira `NaN` em `broker/shared/config.ts` (a TUI trata o próprio uso).
- O relatório da Peer (`.specs/features/peer/validation.md`) termina em FAIL na rodada 6, por mutantes sobreviventes; não foi conferido se foram fechados depois.

### Não verificado

- Terminal interativo real: a TUI só foi vista subindo e ficando de pé por 7 s no Windows Terminal, sem broker. Ninguém olhou a tela nem apertou tecla.
- `SIGINT`, `SIGTERM` e erro não tratado reais; o intervalo padrão de 1 s por relógio.
- Sessão real do Claude Code alimentando a tela, e eventos de `question`, `answer` e `gate` gravados pelo broker.
- macOS.
