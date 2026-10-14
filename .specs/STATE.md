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

### AD-021
- **Decision**: Todo efeito do mouse na TUI é o de uma tecla, ou de uma sequência de teclas, que já existe naquele estado. Cada tela marca, ao desenhar, o que há em cada célula (a camada `hits` do `Grid`); `tui/mouse.ts` lê a marca do último desenho escrito e muda o estado da tela só por `press`, tecla a tecla. O que é do mouse, ligado ou não e a hora do último clique, fica em `Pointer`, fora de `Ui`. `m` é tecla, não relatório: `take` a trata, porque ela muda `Pointer`, e só põe o aviso de 4 s.
- **Reason**: O design manda tudo navegável por teclado e os frames são os casos de teste (AD-010). Com o clique reduzido a teclas, nenhuma tela ganha comportamento que o teclado não tem, e o teste de cada clique compara com `press` aplicado ao mesmo estado. O envio de uma resposta pelo mouse é o da tecla `enter` (AD-014): um `POST` por resposta, com a credencial lida na hora. `Ui` é escrito campo a campo em testes de teclas e de frames que a fatia não altera.
- **Trade-off**: O mouse não faz nada que uma tecla não faça: não há hover, arrasto, rolagem do feed separada da seleção, nem clique num agente ou num nó da topologia. Um elemento só é clicável se a tela o marca ao desenhar, e uma tecla só é alcançada pelo mouse se aparece num atalho ou num elemento marcado. Com um modal aberto, o clique que chega menos de 500 ms depois do anterior não faz nada, também quando o dev quis clicar duas vezes.
- **Scope**: `broker/tui/mouse.ts`, `broker/tui/grid.ts`, `broker/tui/screens/`, `broker/tui.ts`, e os modais de gate e de permissão da fatia Gate, que ficam clicáveis pela mesma regra: o clique marca e não decide, a decisão sai de um atalho da linha 39 que a nomeia, e clicar fora fecha. Detalha o AD-010 e o AD-014.
- **Date**: 2026-10-13
- **Status**: active

## Handoff

Atualizado em 2026-10-14, no fechamento da fatia TUI clicável pela T27, antes do Verifier. As seções da Papéis, abaixo, são do fechamento dela em 2026-10-12 e continuam valendo.

- **Feature**: TUI clicável, `.specs/features/tui-clicavel/`. Depois dela vem a Gate, que ainda não tem spec. A Papéis está fechada e mesclada na `main` pelo PR 12, com o resíduo registrado abaixo.
- **Phase / Task**: Execute, depois da última tarefa. T1 a T27 commitadas. Falta o Verifier.
- **Completed**: T1 `313d433`; a aprovação do design e das tarefas, `db54d04`; T2 a T10, de `e0cc06e` a `726f1e6`, por um worker; a correção do selo de bloqueio, `2622949`; T11 a T18, de `0fd0088` a `9d5f345`, por outro worker, com um ajuste fora da lista em `0ae5896`; T19 `b958711`, T20 `8b68837`, T21 `87739b1`, T22 `ba3eb25`, T23 `18eed8d`, T24 `5744614`, T25 `08f3c88` e T26 `4b9b0eb`, pelo orquestrador; T27 no commit deste Handoff.
- **In-progress** (file:line): nada.
- **Next step**: o Verifier numa cópia física do branch, com `bun install` próprio, até três voltas de correção; `python .claude/skills/tlc-spec-driven/scripts/validate_state.py tui-clicavel`; as lições com `lessons.py`. As lacunas de precisão da spec listadas abaixo que o Verifier também acusar vão ao dev para ele decidir; o orquestrador não as fecha sozinho.
- **Blockers**: nenhum. O Docker está de pé (29.8.0) e tem a imagem `oven/bun:1.4.2`, baixada de novo em 2026-10-14.
- **A conferência em terminal real**: o dev decidiu em 2026-10-14 fechar a fatia sem ela. `real-terminal.md` tem a RT-01 como "funcionou, segundo o dev", sem a versão do terminal e sem os quatro cantos, RT-02 a RT-07 "não conferido" e RT-08 "não exercitado". Na spec ficaram sem marcar, com a razão, a meta do percurso com o mouse, a da volta do terminal, e os critérios de sucesso do percurso só com o mouse e da RT-07. Ela está em "Pendências fora da ordem" de `ROADMAP.md`.
- **Uncommitted files**: nenhum.
- **Branch**: `feat/tui-clicavel`, saído da `main` em `36440a6`, só local: nada foi enviado. `git push` e o PR pedem o sim do dev na hora. O commit de cada tarefa não pede (decisão do dev de 2026-10-13, nas regras de `tasks.md`).

### Onde a TUI clicável está

- A suíte da T26, em `b63acf8`: Windows com `tsc` 0 e 2073 pass, 5 skip, 0 fail, 83 arquivos, em 149 s; Linux no contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps`, sobre um clone feito com `git clone -c core.autocrlf=false` montado só para leitura, `tsc` 0 e 3 de 3 execuções com 2077 pass, 1 skip, 0 fail, 83 arquivos, entre 79 e 81 s. Antes da fatia, no Windows: 1646 pass, 5 skip.
- **O Bun do Windows mudou**: em 2026-10-14 a máquina tem o Bun 1.3.14 do winget (`C:\Users\Dev\AppData\Local\Microsoft\WinGet\Links\bun.exe`), não o 1.4.2 das fatias anteriores, e o Docker passou de 28.0.4 a 29.8.0 sem a imagem `oven/bun:1.4.2`. A T26 rodou o Windows com o 1.3.14 e o registrou. Instalar outro Bun é decisão do dev; o winget oferece o 1.4.3.
- Na prévia da T26, em `c4205ad`, a primeira de cinco execuções no Linux teve 21 falhas em 1422 s: `PEER-38/13` estourou 5 s, e vinte casos de `test/unit/launch.test.ts` e `test/unit/launch-worktree.test.ts` (PAP-37, 38, 42, 51 a 55, 57, 58) estouraram 60 s com um `git` de `Bun.spawnSync` que não voltou, stderr vazio. Nas três execuções da T26 não voltou. A causa não foi achada; entra na lista dos instáveis: uma falha assim no Linux pede outra execução antes de concluir que algo quebrou.
- **`EVT-43` falha sempre no Windows com o Bun 1.3.14**: depois da T26, 2 de 2 execuções da suíte inteira e 8 de 8 do arquivo sozinho, com o `acked_at` gravado pelo processo do broker de 1 a 4 ms antes do `Date.now()` do teste; na `main` em `36440a6`, num clone com `bun install` próprio, 3 de 3. Não é a fatia. A execução da T26 que passou foi sorte. Com o Bun 1.4.2 a falha era rara (lista dos instáveis). Uma falha só dele não bloqueia a fatia; o Verifier foi avisado.
- `EVT-90/92` de `test/integration/server-tools.test.ts`, anterior à fatia, falhou uma vez em cinco execuções da suíte inteira no Windows (3335 ms) e passou sozinho na seguinte: entra na lista dos instáveis de "Evidência e limites".
- No Linux o clone se faz com `git clone -c core.autocrlf=false`: nesta máquina `core.autocrlf` é `true` e o repositório não tem `.gitattributes`, então um clone sem a opção leva CRLF para o contêiner.
- O que os workers apontaram como lacuna de precisão da spec, sem correção, para o Verifier e para o dev: CLK-39 (o custo continua valendo `t` se o lado direito da linha 38 for desenhado por cima dele); CLK-09 (`ESC [ <` seguido de um caractere que não é letra nem dígito deixa esse caractere como tecla); CLK-50 (a cor do aviso de `m` não está na spec, e `m` dentro de uma colagem delimitada sem modal liga e desliga o mouse); CLK-15 com CLK-20 e CLK-24 (o clique numa linha que uma tecla anterior do mesmo chunk selecionou abre em vez de selecionar); o botão de `Report` sai de `parse` com os bits de modificador, que `point` tira.
- Na T27, o critério de sucesso do clique duplo foi marcado pelos testes, com uma leitura: com o modal já aberto, o primeiro clique de um duplo sobre `enter confirmar` envia, como a tecla `enter`; o segundo não faz nada.
- Notado e não tocado: o detalhe de uma pergunta com 8 ou mais opções desenha `undefined …` (`broker/tui/screens/questions.ts:164`, anterior à fatia); a seção da TUI de `broker/README.md` ainda diz que ela não escreve nada no broker e não lista a tecla `4`, de antes da fatia Question; `test/unit/tui-mouse.test.ts` repete ajudantes que `tui-hits.test.ts` tem (os testes do laço usam `test/terminal.ts`).
- Num heredoc do Bash desta máquina, um escape com barra invertida (`\r`, `\t`) não chega ao arquivo como foi escrito: vira o caractere de verdade ou perde uma barra. Código com esses escapes se escreve com Write ou Edit. Os `.md` de `.specs/` e o `ROADMAP.md` têm CRLF na cópia de trabalho: um script que troca um trecho de várias linhas tem de levar isso em conta.

### O que a TUI clicável deixa para a Gate

- A seção "O que esta fatia deixa para a Gate" da spec: os selos de gate e de permissão já valem como `g` e `x` (CLK-36, CLK-37), e os modais de gate e de permissão seguem as regras do modal de resposta com o mouse (CLK-40, CLK-41, CLK-43, CLK-45, CLK-46).
- A regra do clique é o AD-021: todo efeito do mouse é o de uma tecla que já existe. Um modal novo da Gate ganha o clique marcando as células dele no grid ao desenhar, como o modal de resposta.
- A conferência em terminal real não feita (RT-02 a RT-08) e a versão do Windows Terminal da RT-01.

### Como a Papéis fechou

- O limite da skill são três voltas de correção e verificação, e as três deram FAIL: cinco mutantes vivos na primeira, cinco na segunda, seis na terceira, mais dois motivos da varredura da T31 que o Verifier refutou. Nenhuma achou defeito de produção: o código faz o que a spec diz em toda sonda, e não mudou desde `6609630`.
- O dev decidiu em 2026-10-12 aceitar a fatia com o resíduo registrado, em vez de abrir uma quarta volta. A linha está em "Assumptions" da spec.
- `python .claude/skills/tlc-spec-driven/scripts/validate_state.py papeis` sai com 1, porque `validation.md` diz FAIL. É o estado aceito, não trabalho pela metade: não ajustar o relatório para o script passar.
- Na tabela da spec: 68 requisitos `Verified`, 7 `Needs Fix` com a lacuna de teste aceita, e PAP-37 `Verified` com texto e teste a reforçar.
- O dev confirmou em 2026-10-12 a frase da definição de "feature aberta, para o launcher". Não há confirmação pendente.

### O resíduo: os testes que faltam

São os Fix 1 a Fix 9 de `.specs/features/papeis/validation.md`, todos só de teste menos o texto do Fix 8. O padrão é o mesmo nas três voltas: o teste usa só a forma mais comum da entrada. Quem mexer num destes trechos na fatia Gate escreve antes o teste da lacuna dele.

- **PAP-31**, `plugin/hooks/stop.ts:27`: `/events` respondido com outro 2xx. O único status diferente de 200 dos testes é 500.
- **PAP-07**, `broker/server.ts:383`: a sessão que fecha com o broker já fora. O arquivo de credencial tem de sumir do mesmo jeito.
- **PAP-56**, `broker/launch.ts:157`: um `.env*` que não é `.env` nem `.env.<algo>`, como `.envrc`.
- **PAP-18**, `plugin/hooks/usage.ts:85`: um arquivo de subagente `*.jsonl` que não se chama `agent-*`.
- **PAP-39**, `broker/launch.ts:97`: uma variável `CLAUDE*` sem `_` nem `CODE` depois, como `CLAUDEX`. Respondido na revisão do PR 12: o teste entrou em `test/unit/launch-args.test.ts` junto com a mudança do texto de PAP-39 (ficam `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_OAUTH_TOKEN` e `CLAUDE_CODE_GIT_BASH_PATH`), sem volta do Verifier depois.
- **PAP-53**, `broker/launch.ts:149`: um branch de nome curto `refs/heads/<branch da feature>`. Sem o `--detach` o worktree do worker nasce nele.
- **PAP-21**, `plugin/hooks/usage.ts:75`: `transcript_path` `0`, `1` ou `2`. Sem a guarda o hook lê um descritor: sai com 1 ou trava.
- **PAP-37**, `broker/launch.ts:184`: com um broker que aceita a conexão e nunca responde, o launcher sem o `abort` sai 360 s depois da sessão. A spec não diz quando o launcher sai: falta a frase e um teste pelo processo.
- **Documentos**: seis "Leituras da spec" de `tasks.md` que a spec deveria dizer ela mesma (PAP-01, PAP-15, PAP-18, PAP-33, PAP-42 e o par PAP-66 e PAP-68).

As lições das três voltas estão em `.specs/LESSONS.md`; as da terceira são L-083 a L-089.

### O que a Question e a Papéis deixam para a Gate

- Os modais de gate e de permissão escrevem como o de resposta, por um comando em `Ui` (AD-014), e a regra de colagem do modal de resposta (QST-78) vale para o campo de texto deles. `g` e `x` continuam com o aviso `chega com a fatia Gate`.
- Gates pendentes no encerramento da feature são o mesmo caso das perguntas (AD-012).
- A skill da mother tem duas seções com a linha `<!-- Gate slice: rewrite this section to use the gate -->` (AD-020), e a tool de gate entra na lista de permitidos de `broker/launch.ts` (AD-015).
- A decisão de permissão por tecla: a rota `POST /permission-decision` foi provada com sessão real (RS-09).
- `squad tui` tem um teste num pseudo-terminal (`terminal` de `Bun.spawn`, em `test/integration/cli.test.ts`), que roda no Windows e no Linux: serve de modelo para testar um modal pela tela de verdade.

### Para o dev decidir (nada disto bloqueia)

- A mother, em `haiku`, perguntou ao dev com `ask` em vez de `escalate` nas perguntas do leader, e não chamou `unblocked` depois da credencial. A skill manda os dois; se repetir com outro modelo, a regra precisa de outro texto.
- Todo comando do projeto e todo comando composto pede permissão: 13 pedidos em duas features pequenas. É o que a spec define; sem o modal da Gate o dev decide em cada terminal.
- O launcher não repassa Ctrl+C à sessão; lê o log também para a mother (até 2 s com o broker travado); `claude` que é só o `claude.cmd` do npm não foi testado.
- O Bun carrega o `.env` do diretório do hook: um `.env` de projeto com `SQUAD_*` chegaria aos hooks. Não exercitado.
- A linha de status do `README.md` ("does not carry messages yet"), o `broker/README.md` e o comentário de uso no topo de `broker/server.ts` ainda descrevem a forma `server:squad` de antes da fatia.

### Evidência e limites

- Windows, `ac25e8d`: `tsc` 0 e 1645 pass, 5 skip, 0 fail, 75 arquivos; o Verifier repetiu no clone dele. Antes da fatia: 1303 pass, 4 skip. O skip novo é a asserção do modo `0600` do arquivo de credencial, que o Windows não tem.
- Linux, `ac25e8d`: contêiner `oven/bun:1.4.2` sobre clone limpo, `tsc` 0 e 3 de 3 execuções com 1649 pass, 1 skip, 0 fail, 75 arquivos, entre 90 e 99 s cada; o Verifier rodou mais duas no contêiner dele, com o mesmo resultado. O skip é o de `QST-99`, anterior à fatia. A asserção do modo `0600` de PAP-06 passa lá e mata o mutante `0644`. Antes da fatia: 1306 pass, 1 skip.
- Sessões reais: `real-sessions.md`, com o log em `real-sessions-log.txt` e as ferramentas para repetir em `real-session-driver.py` e `real-session-tools/`. Tudo em `haiku`, no Windows. RS-01 a RS-04, RS-06, RS-07 e RS-14 só têm a narrativa: nenhum artefato do repositório permite reler.
- Rodar de dentro de `broker/`: `bun test` e `bun node_modules/typescript/bin/tsc --noEmit`. Não usar `bun x tsc`. `EVT-43` em `test/integration/routes.test.ts` falha de vez em quando por poucos ms, e `PEER-28` e `PEER-29` em `test/integration/server.test.ts` estouraram o tempo de 5 s uma vez com a suíte inteira e a máquina ocupada: rodar de novo. O caso de PAP-38 que mede os 2000 ms em `test/unit/launch.test.ts` afirma menos de 5000 ms e falha com a máquina ocupada (três suítes ao mesmo tempo): numa varredura de mutantes, uma morte que vem só dele não vale, e a mutação roda de novo sozinha.
- No Linux a suíte roda num contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps` instalados dentro dele, sobre um clone montado só para leitura. Sem os três, `PEER-34`, `PEER-35` e `PEER-45`, anteriores à fatia, falham.
- `claude` está no caminho desta máquina: um mutante que faça `cli.ts` ou `launch.ts` ignorar `SQUAD_CLAUDE` ou o ambiente não roda contra `test/integration/cli.test.ts`, que abriria uma sessão de verdade.
- Docker Desktop: em 2026-10-12 ele não subia por causa de um socket velho em `%LOCALAPPDATA%\Docker\run`, que o Windows não deixa apagar. Renomear a pasta `run` resolve (ficaram `run.stale-20261010` e `run.stale-20261012`).
- Nunca subir `broker.ts` ou `server.ts` à mão sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários. Sessão real de teste: só em repositório descartável, com `SQUAD_PORT`, `SQUAD_DB`, `SQUAD_TOKEN_FILE` e `SQUAD_WORKTREES` temporários e sem as variáveis `CLAUDE*`.
- As sessões de teste deixaram cinco pastas de transcript em `~/.claude/projects/` com `scratchpad-rs` no nome. São descartáveis; ninguém as apagou.
- Riscos conhecidos, não corrigidos: `expire` e `cleanStale` rodam em `setInterval` sem `try` em `broker.ts`; a colagem num terminal sem os marcadores do modo 2004; `tui/demo.ts` sem teste automático; o formato do transcript do Claude Code é interno e pode mudar (AD-018).
- Não exercitados: macOS; sessão real no Linux; outro modelo que não `haiku`; a TUI ao lado de sessões reais; o resto da lista em `real-sessions.md`.
