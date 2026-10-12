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

### AD-015
- **Decision**: O plugin vive em `plugin/`, na raiz, com o nome `squad`, e é carregado no lugar: `--plugin-dir <raiz>/plugin` com `--dangerously-load-development-channels plugin:squad@inline`. Vindas do plugin, as tools se chamam `mcp__plugin_squad_squad__<tool>` e o canal chega com `source="plugin:squad:squad"`; o servidor MCP deixa de escrever o `source` nos textos que o modelo lê.
- **Reason**: Visto em sessões reais no Claude Code 2.1.296 em 2026-10-11: o canal de desenvolvimento aceita um plugin de diretório, sem marketplace. O plugin alcança `broker/` por caminho relativo (`.mcp.json` e os hooks), o que uma cópia instalada no cache do Claude Code não faria.
- **Trade-off**: O plugin não é distribuível por marketplace como está. O AD-003 previa `mcp__squad__*` na lista de permitidas: esse nome só vale para o servidor carregado por `.mcp.json` solto.
- **Scope**: `plugin/`, launcher, `broker/server.ts` e a fatia Gate (tool de gate na lista de permitidas). Detalha o ADR-001 e corrige o AD-003 no nome das tools.
- **Date**: 2026-10-11
- **Status**: active

### AD-016
- **Decision**: O servidor MCP grava a credencial da sessão em `<SQUAD_DB>.<nome>.id` ao registrar e a apaga ao sair. Os hooks da sessão leem esse arquivo para chamar o broker.
- **Reason**: Os hooks são processos à parte e toda rota exige `{ id }` (ADR-003). Ao lado do banco, um teste com `SQUAD_DB` temporário nunca escreve no home.
- **Trade-off**: A credencial de um peer passa a existir em disco, fora de qualquer worktree: um agente com shell a lê. É o limite cooperativo do AD-007. Uma sessão morta sem aviso deixa o arquivo, que o broker recusa (`unknown_peer`) até o registro seguinte regravá-lo.
- **Scope**: `broker/server.ts`, `plugin/hooks/` e qualquer processo auxiliar de uma sessão. Detalha o ADR-003.
- **Date**: 2026-10-11
- **Status**: active

### AD-017
- **Decision**: O hook de parada decide com a regra de status do contrato (`squad` de `broker/shared/derive.ts`) aplicada a `GET /events` como se o turno tivesse acabado, e só devolve ao trabalho quem sairia `stalled`. Quando devolve, não envia `usage`.
- **Reason**: O design manda o hook consultar `/state`, mas o `owed` de `/state` não sabe de `blocked` nem de pergunta bloqueante aberta: um worker à espera do dev seria empurrado de volta a cada turno. `usage` é a marca de fim de turno; enviado antes da volta, o agente apareceria `stalled` enquanto paga a dívida.
- **Trade-off**: O hook lê o log inteiro a cada fim de turno, e o plugin passa a depender da função de derivação. `/state` continua sendo o que a skill de papel consulta ao começar.
- **Scope**: `plugin/hooks/stop.ts`. Detalha o ADR-006.
- **Date**: 2026-10-11
- **Status**: active

### AD-018
- **Decision**: O uso é lido pelo hook de fim de turno do transcript do Claude Code: as linhas `assistant` do arquivo de `transcript_path` e de `<transcript sem .jsonl>/subagents/*.jsonl`, uma por `message.id`, somadas por `message.model`. Sem transcript legível o hook envia um `usage` com `model` `unknown` e zeros.
- **Reason**: Spike da fatia Papéis, resolvido em 2026-10-11 no Claude Code 2.1.296: o `Stop` de um plugin recebe `transcript_path`, e a soma por `message.id` deu os números do próprio CLI. Sem a regra do id o total dobra; sem os subagentes ele fica abaixo do real.
- **Trade-off**: O formato do transcript é interno ao Claude Code e não é documentado: uma versão nova pode zerar os tokens sem erro. O plano de volta do design (o broker lendo o diretório de transcripts) não foi construído.
- **Scope**: `plugin/hooks/usage.ts` e a tela de tokens da TUI. Detalha o ADR-006.
- **Date**: 2026-10-11
- **Status**: active

### AD-019
- **Decision**: O launcher sobe toda sessão com `--permission-mode acceptEdits` e uma lista de permitidos: as tools do squad do papel e git local por papel (leitura para todos; `switch`, `add` e `commit` para worker, leader e mother; `switch` para o judge; `merge` só para o leader). `push`, `reset` e `checkout` nunca entram, e o merge da entrega, que é da mother, fica de fora. `--skip-permissions` troca tudo por `--dangerously-skip-permissions`. O formato do `roles.json` é o do manifest do registry, com as skills de cada workflow separadas: `{ "roles": [ { "name", "when_to_use", "skills", "workflows": { "tlc", "matt-pocock" } } ] }`.
- **Reason**: Defaults 3 e 4 da fatia Papéis, decididos pelo dev em 2026-10-11. O manifest (`skills/setup-fassi-skills/manifest.json`, registry em `8a33ffd`) agrupa por lista de objetos com `name`, `when_to_use` e `skills`, e tem a `workflow_rule`, que a lista do START.md quebrava ao misturar os dois workflows no mesmo papel.
- **Trade-off**: Comando do projeto (teste, build) pede permissão a menos que esteja no `.claude/settings.json` do repositório. O launcher não sabe o workflow da feature: quem escolhe a lista é a skill de papel. `help-me` fica no leader embora esteja fora de `skills[]` do manifest.
- **Scope**: `broker/launch.ts`, `plugin/roles.json` e as skills de papel. Detalha o ADR-011.
- **Date**: 2026-10-11
- **Status**: active

### AD-020
- **Decision**: Até a fatia Gate, a mother escala ao dev a pergunta bloqueante de uma ação irreversível e não a responde por conta própria, e antes da entrega final faz ao dev uma pergunta bloqueante com o commit e a ação. A fatia Papéis fecha o pedido de permissão até a rota `POST /permission-decision`; a tecla na TUI é da Gate. Os worktrees ficam em `<pai do checkout principal>/<nome>.squad/<sessão>`, e sem feature aberta todo worktree nasce em HEAD destacado.
- **Reason**: As linhas "Agente precisa de ação irreversível" e "Sessão para num pedido de permissão" da fatia Papéis dependem do pedido de gate e do modal de permissão, que o Handoff deixou com a Gate. Decidido pelo dev em 2026-10-11. O dev pode subir as sessões antes de a mother abrir a feature.
- **Trade-off**: Uma resposta de texto livre faz o papel do gate: não há decisão tipada nem a recusa `gate_required`. A skill da mother tem duas seções marcadas que a Gate reescreve. O leader troca para o branch da feature no kickoff, por instrução da skill e não pelo launcher.
- **Scope**: `plugin/skills/mother/SKILL.md`, `broker/launch.ts` e a fatia Gate. Detalha o ADR-008, o ADR-011 e o ADR-012.
- **Date**: 2026-10-11
- **Status**: active

## Handoff

Atualizado em 2026-10-12, numa pausa pedida pelo dev para outra sessão seguir.

- **Feature**: Papéis, `.specs/features/papeis/`.
- **Phase / Task**: Specify e Design fechados. `tasks.md` não foi escrito e nenhum código da fatia existe. A Question está na `main` (PR 9); o relatório dela é `.specs/features/question/validation.md`.
- **Completed**: suíte da `main` no Linux antes da fatia; spike da fatia resolvido; as quatro perguntas ao dev respondidas; `spec.md` com 73 requisitos (`validate_spec.py papeis` exit 0); `design.md`; AD-015 a AD-020. Tudo num commit de documentos no branch.
- **In-progress** (file:line): nada. Nenhuma tarefa começada.
- **Next step**: escrever `.specs/features/papeis/tasks.md` a partir da lista "Tarefas planejadas" abaixo, rodar `validate_tasks.py papeis`, e antes de executar apresentar ao dev a oferta de sub-agentes da skill (são cerca de 19 tarefas; ele ainda não foi perguntado). Depois: executar com um commit por tarefa, exercitar RS-01 a RS-14 e escrever `real-sessions.md`, rodar a suíte no Linux, despachar o Verifier, abrir o PR sem merge e marcar o ROADMAP.
- **Blockers**: nenhum. Para o Linux o Docker Desktop tem de estar de pé (`docker desktop start`); ele estava parado no fim desta sessão. O login do Claude Code do dev avisava "expires in 1 day" em 2026-10-12: as sessões reais (RS) precisam dele válido.
- **Uncommitted files**: nenhum depois do commit desta pausa. Nada descartado nem em stash.
- **Branch**: `feat/papeis`, saído da `main` em `f162184`. Só local: nada foi enviado ao remoto.

### O que o dev pediu para esta fatia (o prompt não está no repositório)

- A spec deriva da fatia; não reabrir decisões. No STATE só decisão nova, apontando para o ADR.
- Fora: pedido e decisão de gate, modais de gate e de permissão da TUI (fatia Gate). Se a spec precisar de um deles para fechar um estado da tabela do design, parar e perguntar. Isso já aconteceu duas vezes e está respondido (AD-020).
- O plugin fica em diretório separado do broker. A spec diz o que os testes automáticos cobrem e o que só uma sessão real mostra; exercitar o que der com sessões reais e registrar o que ficou sem exercitar.
- Windows e Linux: a suíte da `main` no Linux antes de começar (feito) e de novo antes de fechar, ou registrar qual dos dois ficou sem rodar.
- Verificação: o Verifier é um agente que não escreveu código, teste nem relatório, e a cópia de trabalho dele não tem junction nem link para o `node_modules` real (cópia física, `bun install` próprio). Limite de três voltas de correção e verificação; depois o resíduo e a decisão voltam para o dev.
- Commits na convenção do repositório (uma frase imperativa em inglês, minúsculas, sem prefixo, com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Trabalhar no branch, abrir um PR no fim, sem merge. Ao terminar, marcar a fatia em `ROADMAP.md`, e lá também as duas pendências já resolvidas: o formato do `roles.json` conferido contra o manifest e o modo de permissão decidido.

### Respostas do dev em 2026-10-11

1. Modo de permissão (default 3): `acceptEdits` mais lista de permitidos; `--skip-permissions` por escolha (AD-019).
2. Formato do `roles.json` (default 4): o padrão do manifest com as skills de cada workflow separadas (AD-019). A comparação com o manifest está na spec, em "Assumptions".
3. "Sessão para num pedido de permissão": a fatia fecha até a rota `POST /permission-decision`, provada com sessão real; a tecla na TUI é da Gate (AD-020).
4. "Agente precisa de ação irreversível": até a Gate a mother escala a pergunta bloqueante ao dev, e faz uma pergunta bloqueante antes da entrega (AD-020).

### Tarefas planejadas (ainda não estão em `tasks.md`)

- Fase 1, fundação: T1 `broker/shared/config.ts` (`idPath`, `rolesPath`, `pluginDir`, `worktreesDir`, `claudeCommand`), teste de unidade. T2 `broker/server.ts` grava e apaga o arquivo de credencial e tira `source="squad"` dos quatro textos (linhas 145, 147, 166 e 263), integração, PAP-05 a PAP-09. T3 `plugin/` com `plugin.json`, `.mcp.json` e `hooks/hooks.json`, mais `include` de `../plugin` em `broker/tsconfig.json`, PAP-01 a PAP-03.
- Fase 2, hooks: T4 `plugin/hooks/usage.ts`, unidade, PAP-14 a PAP-19. T5 `plugin/hooks/session.ts` (credencial, chamada com prazo, payload), unidade, PAP-12 e PAP-20. T6 `plugin/hooks/turn-started.ts`, integração com broker real, PAP-10 a PAP-13. T7 `plugin/hooks/nudge.ts`, unidade, PAP-22, PAP-28, PAP-29 e PAP-32. T8 `plugin/hooks/stop.ts`, integração, PAP-21, PAP-23 a PAP-27, PAP-30 e PAP-31.
- Fase 3, launcher: T9 `broker/roles.ts`, unidade, PAP-33. T10 `plugin/roles.json`, PAP-34. T11 `broker/launch.ts`, partes puras (argumentos, lista de permitidos, texto do sistema, ambiente), unidade, PAP-39, PAP-40, PAP-43 a PAP-47. T12 `broker/launch.ts`, `launch` com git real em repositório temporário e `spawn` injetado, PAP-35 a PAP-38, PAP-41, PAP-42, PAP-48 a PAP-58. T13 `broker/cli.ts` com `start` e `tui`, e `bin.squad` no `package.json`, PAP-59.
- Fase 4, skills: T14 worker e o teste de conteúdo das skills, T15 judge, T16 leader, T17 mother (com PAP-04 e PAP-72); PAP-60 a PAP-72.
- Fase 5, fechamento: T18 documentação (PAP-73). T19 sessões reais e `real-sessions.md`.
- Os testes do plugin ficam em `broker/test/`, importando `../../../plugin/...`, para um `bun test` e um `tsc` só.

### Sessões reais: o que já foi visto e como repetir

- Visto em 2026-10-11 e 12, Claude Code 2.1.296, Windows: a tabela "Pesquisa" do `design.md`. Já respondem em parte RS-01, RS-02 e RS-03, com um plugin descartável chamado `spk`, não com o plugin da fatia: repetir com o de verdade.
- `.specs/features/papeis/real-session-driver.py` dirige uma sessão interativa do `claude` num ConPTY e grava a tela a cada passo. Precisa de `pywinpty` (já no Python do dev) e de `pyte` (`pip install pyte` num venv). Uso no cabeçalho do arquivo. Só serve no Windows.
- Toda sessão de teste sobe com as variáveis `CLAUDE*` removidas e com `SQUAD_PORT`, `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários; depois, `SQUAD_PORT=<porta> bun cli.ts kill-broker`. `--model haiku` deixa o teste barato.
- Dois diálogos aparecem ao subir: a confiança na pasta, na primeira vez em cada diretório (a opção marcada é "No, exit"), e o aviso do canal de desenvolvimento, em toda subida (a opção marcada é "I am using this for local development").
- `-p` não carrega canal: serve para hooks, skills e nomes de tools (`--output-format stream-json --verbose` lista tudo no `init`), não para o ping.
- `--allowedTools` é variádico: o prompt posicional vem depois de uma opção de um valor só (`--append-system-prompt`), como PAP-40 manda.

### O que a Question deixa para a Gate

- Os modais de gate e de permissão escrevem como o de resposta, por um comando em `Ui` (AD-014), e a regra de colagem do modal de resposta (QST-78) vale para o campo de texto deles. `g` e `x` continuam com o aviso `chega com a fatia Gate`.
- Gates pendentes no encerramento da feature são o mesmo caso das perguntas (AD-012).

### Evidência e limites

- Linux, `main` em `f162184`, antes da fatia Papéis: contêiner `oven/bun:1.4.2` sobre clone limpo, `tsc` 0 e 3 de 3 execuções com 1306 pass, 1 skip, 0 fail, 63 arquivos, em cerca de 90 s cada. A instabilidade de tempo em testes de integração que a Question registrou não apareceu nessas três.
- Windows, `main`: o último registro é o da Question em `4f3fa89`, `tsc` 0 e 1303 pass, 4 skip, 0 fail. Não foi rodada de novo nesta sessão.
- Rodar de dentro de `broker/`: `bun test` e `bun node_modules/typescript/bin/tsc --noEmit`. Não usar `bun x tsc`. No Linux desta máquina a suíte roda num contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps` instalados dentro dele (`apt-get`), sobre um clone do repositório montado só para leitura, com `bun install --frozen-lockfile`; o WSL Debian não tem `bun`.
- Nunca subir `broker.ts` ou `server.ts` à mão sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários.
- Riscos conhecidos, não corrigidos: `expire` e `cleanStale` rodam em `setInterval` sem `try` em `broker.ts`, e uma exceção num temporizador do Bun encerra o broker; a colagem num terminal sem os marcadores do modo 2004; `tui/demo.ts` sem teste automático.
- Não exercitados: macOS, e tudo de RS-04 a RS-14 da spec da Papéis.
