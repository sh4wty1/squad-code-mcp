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

### AD-022
- **Decision**: O `feature_closed` encerra os gates pendentes da feature, em `delivered` e em `abandoned`, sem evento novo: a linha de `gates` passa a `rejected` com `decision_seq` nulo, e a derivação trata do mesmo jeito o gate pendente de feature fechada. O broker escreve o `summary` de um `gate_decision` (`G-NN aprovado`, `G-NN rejeitado: <texto>`, `G-NN comentado: <texto>`, cortado em 80), e a tool `gate` responde o `gate_id`. A TUI rotula um pedido de permissão `P-NN` pela ordem dele entre todos os `permission_request` do log.
- **Reason**: O Handoff mandou tratar gates pendentes no encerramento como as perguntas (AD-012); o design só dizia "gates pendentes rejeitados" no `abandoned`. `/gate-decision` não recebe `summary` e o kind é de mensagem. A mother reemite pelo `gate_id` depois de um comentário. O contrato não tem id de pedido de permissão além do `seq` e do `request_id` do Claude Code.
- **Trade-off**: Um gate `action` pendente numa entrega aprovada fecha rejeitado sem que o dev o decida. O `P-NN` cresce pelo banco inteiro e não recomeça a cada feature.
- **Scope**: `broker/gate.ts`, `broker/log.ts`, `broker/shared/derive.ts`, `broker/server.ts`, TUI. Detalha o ADR-008, o ADR-011 e o AD-012. Os defaults da fatia que não são de projeto estão em "Assumptions" de `.specs/features/gate/spec.md`.
- **Date**: 2026-10-14
- **Status**: active

## Handoff

**2026-10-19, a suíte da Papéis no Windows.** O [PR 16](https://github.com/sh4wty1/squad-code-mcp/pull/16) está mergeado na `main` (`d6e4c93`). Suíte em `d6e4c93`, Windows, Bun 1.3.14: `tsc` 0 e 2524 pass, 9 skip, 2 fail, 96 arquivos, 178 s. Uma das falhas é o `EVT-43` (`broker/test/integration/routes.test.ts:268`), a instável já registrada, com o `acked_at` 1 ms antes do `started`: não foi tocada. A outra é o caso de PAP-18 "every name of subagents that ends in .jsonl counts" (`broker/test/unit/hook-usage.test.ts`), que deu opus 701 e haiku 9000 no lugar de opus 1101: o NTFS não diferencia caixa, e `agent.JSONL` grava por cima de `agent.jsonl`, e `agent<sep>JSONL.jsonl` por cima de `agent<sep>jsonl.jsonl` nos três separadores. A T62 (fase 17) corrige só o teste: no win32 o caso grava o primeiro nome de cada grafia sem diferença de caixa, como `AFTER` já faz com os fins que o Windows não aceita, e o total sai da lista gravada (1101 no Linux, 801 no Windows). Os 36 casos por forma do Windows (63 no Linux) não colidem do mesmo jeito: em três, `s1JSONL.jsonl`, `s1.JSONL.jsonl` e `s1-JSONL.jsonl`, um diretório da leitura errada só difere do radical na caixa, mas o arquivo que conta é gravado depois e fica; passam pela ordem das gravações. Numa cópia fora do repositório, no contêiner `oven/bun:1.4.2`, o arquivo de teste passa com o `usage.ts` original e falha só nesse caso com um `usage.ts` que conta `agent.JSONL`. Conferido também no Windows: os três casos com `spyOn` em `node:fs` passam, então o espião chega a `usage.ts`, e o caso da T59 (100 000 linhas, mais de 8 MiB) leva por volta de 115 ms. Suíte depois da correção, no Windows: `tsc` 0 e 2526 pass, 9 skip, 0 fail, 96 arquivos, 179 s; o `EVT-43` passou desta vez. A suíte inteira no Linux não rodou depois da correção. `validate_state.py papeis` continua saindo com 1 pela volta 11, o estado aceito. Branch `test/papeis-windows-case`, saído de `d6e4c93`, enviado ao `origin` com PR contra a `main`, a pedido do dev. Próximo passo: a revisão e o merge desse PR pelo dev. O parágrafo abaixo é o anterior.

**2026-10-18, o fechamento do resíduo da Papéis.** Do Fix 25, o dev decidiu aplicar só o que derruba o hook ou conta errado numa sessão real e fechar sem décima segunda volta. A fase 17 tem quatro tarefas, todas commitadas:
- T58 (`7834595`): um principal que é link para si mesmo, um sem permissão e um com `EIO`, mata G3;
- T59 (`bf2da98`): um principal de 100 000 linhas e um subagente de mais de 8 MiB, mata G8 e G9;
- T60 (`92cc928`): um id `"0"` ao lado de uma linha sem id, mata G2;
- T61, o commit de fechamento: a linha de "Assumptions" com G4, G25, G23, G6 e G7 aceitos e N13 e G10 como o código faz, a rastreabilidade (75 `Verified`, PAP-18 com o resíduo aceito), a nota de fechamento no fim de `validation.md` e o `ROADMAP.md`.

Cada caso novo passa no `usage.ts` original e falha com o seu mutante e as variantes, numa cópia fora do repositório. A conferência é do autor dos testes, e não houve volta independente depois das T58 a T60. Nenhum código de produção mudou desde `055d629`. Suíte em `92cc928`, só no Linux, nesta máquina: `tsc` 0 e 2561 pass, 1 skip, 0 fail, 96 arquivos, 130 s. `validate_state.py papeis` sai com 1, porque o veredito da volta 11 é FAIL: é o estado aceito, como na Gate. Não ajustar o relatório para o script passar.

Próximo passo: a suíte no Windows, com duas coisas a olhar lá: se o `spyOn` em `node:fs` chega a `usage.ts` e quanto tempo leva o caso da T59. Depois, a revisão do PR 16 pelo dev e o merge. O branch foi enviado ao `origin` em 2026-10-18, a pedido do dev, e a descrição do [PR 16](https://github.com/sh4wty1/squad-code-mcp/pull/16) cobre os Fix 1 a 25 e o fechamento. O parágrafo abaixo é o anterior.

**2026-10-18, a décima primeira volta.** No Linux, a fase 16 aplicou o Fix 24 inteiro, só de teste, em três commits. A T55 (`5166c35`) traz um `agent-l.jsonl` e um `subagents` que são links para si mesmos (`test.skipIf(!canLink)`), e dois casos com o `readdirSync` e o `readFileSync` de `node:fs` trocados por `spyOn`, só neles, por um que lança `EIO`. A T56 (`91a0b8c`) gera as formas do fim do nome: separador × `jsonl`, `JSONL` ou `json` × o que vem depois. São 63 transcripts `s1<forma>`, cada um ao lado dos subagentes de todo nome que uma leitura errada tomaria pelo radical, e um `subagents` com `agent<forma>` e `s1.jsonl`. A T57 (`22cf788`) traz dois arquivos de texto igual e um principal que não conta nada. Numa cópia fora do repositório, cada um dos onze passa nos testes de antes e falha nos novos. Suíte em `22cf788`, só no Linux, nesta máquina: `tsc` 0 e 2556 pass, 1 skip, 0 fail, 96 arquivos, 138 s. O Windows não rodou, e lá falta conferir se o `spyOn` em `node:fs` chega a `usage.ts`; no Linux chega e não vaza, segundo o Verifier.

A décima primeira volta independente (`validation.md`, "Reverificação do Fix 24") deu FAIL por PAP-18, PAP-15 e PAP-19, sem defeito de produção: 72 de 75. Das 64 mutações, 52 morrem, 1 é equivalente, 2 são lacuna de precisão (N13 e G10, a codificação dos transcripts) e 9 sobrevivem. Na ordem de risco do Verifier:
- G3 (`usage.ts:79`–`:81`, PAP-19): o `catch` do principal com uma lista de códigos derruba `stop.ts:50`;
- G8 e G9: um teto de 64 KiB por arquivo ou de 1000 linhas, que conta errado numa sessão real grande;
- G4, G25 e G23: a frente do nome com espaço ou acento (`"agent 1.jsonl"`, `agente-ç.jsonl`, `"s1 .jsonl"`);
- G2 (`:56`, PAP-15): `String(alone++)`, e um id `"0"`;
- G6 e G7: NFKC, com caracteres de largura cheia.

O Fix 25, só de teste, está em `validation.md`. Lições: L-121 a L-124 novas, e evidência nova em L-080 e L-084. `validate_state.py papeis` sai com 1. Para a volta que aprovar, o Verifier propõe mover o histórico das voltas para `validation-history.md`, ou trocar o rótulo das linhas antigas do sensor, porque o script lê todas elas. É a oitava volta seguida em PAP-18. Próximo passo: o dev decide se aplica o Fix 25 com mais uma volta ou se aceita a fatia com os nove mutantes registrados. O branch tem commits locais sem push desde `d8f7371`, e o push espera o sim do dev. O parágrafo abaixo é o anterior.

**2026-10-17, a décima volta.** No Linux, a fase 15 aplicou o Fix 23 inteiro, só de teste, em dois commits. A T53 (`f387585`) traz um `agent-y.jsonl` e um `subagents` de modo `0o000`, com `test.skipIf(win32 || root)`, e um `subagents` que é arquivo regular. A T54 (`a7f81d6`) aplica a sugestão do Verifier: os casos de um nome viraram listas de nomes de `subagents/`, que agora têm `agent-h.jsonld`, `nested/agent-n.jsonl` e `jsonl`, mais três `*.jsonl` com outros pontos no nome, que contam, e dois laços de nomes de transcript. Numa cópia fora do repositório, cada um de U1, U2, U3, U4, U5, U8, U9, U12 e U13 passa nos testes de antes e falha nos novos, e os 14 antigos seguem mortos. Suíte em `a7f81d6`, só no Linux, nesta máquina, sem contêiner: `tsc` 0 e 2487 pass, 1 skip, 0 fail, 96 arquivos, 130 s. O Windows não rodou.

A décima volta independente (`validation.md`, "Reverificação do Fix 23") deu FAIL só por PAP-18, sem defeito de produção. Os 23 mutantes reinjetados morrem. Das 22 mutações novas, 9 morrem, 1 é equivalente, 1 é lacuna de precisão (N13, a ordem pelo nome sem a extensão) e 11 sobrevivem. Os sobreviventes são:
- em `usage.ts:82`: N2, N6 e N20 (`"s1.jsonl "`, `s1jsonl` e `"s1.jsonl\nx"`);
- em `:85`: N7, N8 e N21 (`subagents/s1.jsonl`, `"agent-k.jsonl "` e `"agent-k.jsonl\nx"`);
- N12, um teto de três arquivos;
- N14, `new Set` sobre os textos;
- N15, o principal que não conta nada dá `{}`;
- N16 e N17, um link para si mesmo faz `sessionUsage` lançar `ELOOP` e derruba `stop.ts:50`.

O Fix 24, só de teste, está em `validation.md`. O Verifier sugere gerar os nomes por combinação, e fazer o `fs` lançar um código qualquer (`EIO`) para matar de uma vez a classe das listas de códigos de erro. Lições: L-115 a L-120 novas, e evidência nova em L-080 e L-103. `validate_state.py papeis` sai com 1. O Verifier notou também que `validate_state.py` lê todo `**Sensor result**:` do arquivo: quando PAP-18 passar, os FAIL das voltas antigas vão ter de sair dessas linhas, ou o histórico vai ter de ir para outro arquivo. É a sétima volta seguida em PAP-18, muito além das três da skill. Próximo passo: o dev decide se aplica o Fix 24 com mais uma volta ou se aceita PAP-18 com os onze mutantes registrados, como na volta 3. O branch tem commits locais sem push desde `d8f7371`, e o push espera o sim do dev. O parágrafo abaixo é o anterior.

**2026-10-17, a nona volta.** No Linux, a T52 (fase 14, `18f6d10`) aplicou o Fix 22, só de teste: um `agent-g.json` fora da soma, o transcript `s1.json` sem os subagentes de `s1/`, um link sem alvo `agent-z.jsonl` (`symlinkSync(..., "junction")`) no caso do ilegível, e o caso da ordem escrito b, c, a (R5). Numa cópia fora do repositório, R1, R2, R4, R17 e R5 morrem com os casos novos e passam sem eles; Q2, Q5, Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos. Suíte em `18f6d10`, só no Linux, nesta máquina, sem contêiner: `tsc` 0 e 2479 pass, 1 skip, 0 fail, 96 arquivos, 131 s. O Windows não rodou. A nona volta independente (`validation.md`, "Reverificação do Fix 22") deu FAIL só por PAP-18, sem defeito de produção: os cinco morrem, e de 15 mutações novas 9 sobrevivem. Seis são formas novas do nome: U1, U3, U5 em `usage.ts:82` (`s1.jsonld`, `s1-jsonl`, `s1.v2.jsonl`), U2, U4, U12 em `:85` (`agent-h.jsonld`, `agent.2.jsonl`, `subagents/nested/`). Três fazem `sessionUsage` lançar, o que derruba o hook em `stop.ts:50`: U8 (`subagents` que é arquivo), U9 e U13 (um `agent-y.jsonl` de modo `0o000`, só no Linux e fora do root). Fix 23, só de teste, sete casos, em `validation.md`; o Verifier sugere trocar os casos de um nome por laços sobre listas de nomes. Lições L-108 a L-114 novas, evidência nova em L-099 e L-103. `validate_state.py papeis` sai com 1. Próximo passo, decidido pelo dev em 2026-10-17: aplicar o Fix 23 inteiro (fase 15, T53, um commit por tarefa, cada caso conferido com o seu mutante numa cópia fora do repositório), rodar a suíte e uma décima volta independente de PAP-18, de outra sessão, pelo resume do `tlc-spec-driven`. O branch tem commits locais sem push desde `d8f7371`; o push espera o sim do dev. O parágrafo abaixo é o anterior.

**2026-10-16, a oitava volta.** De outra máquina, Linux, a T51 (fase 13, `3344174`) aplicou o Fix 21, só de teste: um `agent-fjsonl` fora da soma e o transcript `s1.jsonl.bak` sem os subagentes de `s1/`. Numa cópia fora do repositório, Q2 e Q5 morrem com os casos novos e passam sem eles; Z4, Z11, Y5, Y6, W5, K15 e Q1 seguem mortos. Suíte em `3344174`, só no Linux, nesta máquina, sem contêiner: `tsc` 0 e 2478 pass, 1 skip, 0 fail, 96 arquivos, 124 s. O Windows não rodou. A oitava volta independente (`validation.md`, "Reverificação do Fix 21") deu FAIL só por PAP-18, sem defeito de produção: Q2 e Q5 morrem, e das 19 mutações novas sobrevivem R1 (`usage.ts:82`, `/\.jsonl?$/`: o transcript `s1.json` ganha os subagentes de `s1/`), R2 e R4 (`:85`: um `agent-g.json` conta) e R17 (`:85`: um filtro por `isFile()` faz um link sem alvo esvaziar a lista, contra o "os outros contam"). Fix 22, só de teste. Lições L-105 a L-107 novas, evidência nova em L-099. `validate_state.py papeis` sai com 1. É a quinta volta seguida que acha uma forma nova das mesmas duas linhas de `usage.ts`, e o laço de correção passou muito do limite de três voltas da skill. Próximo passo, decidido pelo dev em 2026-10-17: aplicar o Fix 22 (fase 14, T52, só de teste, os três casos da seção "Reverificação do Fix 21" de `validation.md`, conferidos com R1, R2, R4 e R17 numa cópia fora do repositório, um commit por tarefa), a partir de outra máquina, pelo resume do `tlc-spec-driven`. Se vai ter nona volta ou se o PR 16 fecha direto, o dev ainda não disse. Para o caso do link sem alvo, o Verifier sugere `symlinkSync(..., "junction")`, que não pede privilégio no Windows. Branch enviado ao `origin` em 2026-10-17. O parágrafo abaixo é o anterior, da mesma data.

**2026-10-16, o resíduo da Papéis.** Os PRs 14 e 15 estão mergeados na `main` (`055d629`) e o MVP está fechado. No branch `test/papeis-gaps`, T32 a T39 de `.specs/features/papeis/tasks.md` aplicaram os Fix 1 a Fix 9 de `validation.md`, só testes e texto da spec; nenhum código de produção mudou. Cada teste novo falha com o seu mutante e passa sem ele. A reverificação independente (`validation.md`, "Reverificação do resíduo") deu FAIL: os oito mutantes do resíduo morrem, PAP-21, PAP-31 e PAP-53 ficam `Verified`, e cinco mutações novas sobrevivem (Fix 10 a Fix 14, só de teste; o Fix 12 pede ao dev decidir se a caixa conta em PAP-39). Suíte em `959bcb6`: Windows, Bun 1.3.14, `tsc` 0 e 2466 pass, 5 skip, 0 fail, 96 arquivos, 196 s; Linux, contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps` sobre clone com `core.autocrlf=false`, `tsc` 0 e 3 de 3 com 2470 pass, 1 skip, 0 fail, entre 110 e 120 s. Depois, a pedido do dev, T40 a T44 aplicaram os Fix 10 a Fix 14, com a caixa contando em PAP-39 como o código faz (só texto e teste). A quinta volta deu FAIL de novo: os cinco mutantes morrem, PAP-56 fica `Verified`, e cinco mutações novas vivem em PAP-07, PAP-18, PAP-37 e PAP-39 (Fix 15 a Fix 19, só de teste). O padrão das cinco voltas é o mesmo: o teste usa só a forma mais comum da entrada, e cada volta acha a forma seguinte. Suíte em `ce5f774`: Windows `tsc` 0 e 2468 pass, 6 skip, 0 fail, 96 arquivos, 181 s; Linux, do mesmo jeito, `tsc` 0 e 3 de 3 com 2473 pass, 1 skip, 0 fail, entre 104 e 112 s. `validate_state.py papeis` sai com 1. Depois, a pedido do dev, T45 a T49 aplicaram os Fix 15 a Fix 19, só de teste. A sexta volta deu FAIL só por PAP-18: os cinco mutantes morrem, PAP-07, PAP-37 e PAP-39 ficam `Verified` (74 de 75), e duas mutações da caixa de `.jsonl` (Z4, Z11) vivem (Fix 20, só de teste, com a dúvida de leitura da caixa na definição "Transcripts da sessão"). Suíte em `dbe2483`: Windows `tsc` 0 e 2470 pass, 7 skip, 0 fail, 96 arquivos, 181 s; Linux `tsc` 0 e 3 de 3 com 2476 pass, 1 skip, 0 fail, entre 97 e 105 s. Depois, a pedido do dev, a T50 (fase 12, `15b7a37`) aplicou o Fix 20: um `agent-e.JSONL` fora da soma, um caso com o transcript `s1.JSONL`, e a frase da caixa em `.jsonl` na definição "Transcripts da sessão", como o código faz. Num clone fora do repositório, Z4 e Z11 morrem pelos casos novos, e Y5, Y6, W5 e K15 seguem mortos. A sétima volta deu FAIL só por PAP-18: Z4 e Z11 morrem, e duas mutações novas vivem, Q2 (o diretório dos subagentes sai do último `.jsonl` do caminho, e `s1.jsonl.bak` ganha os de `s1/subagents`, `usage.ts:82`) e Q5 (`endsWith("jsonl")` sem o ponto, e `agent-fjsonl` conta, `usage.ts:85`): Fix 21, só de teste. Ela registrou também duas lacunas de precisão fora do veredito (um nome que é só `.jsonl`, e `transcript_path` com separador no fim), e Q7 (a caixa de `subagents`), que só morre no Linux. Lições: Q2 e Q5 junto a L-099; L-103 e L-104 novas. Suíte em `15b7a37`: Windows `tsc` 0 e 2471 pass, 7 skip, 0 fail, 96 arquivos, 182 s; Linux `tsc` 0 e 3 de 3 com 2477 pass, 1 skip, 0 fail, entre 93 e 117 s. Próximo passo, decidido pelo dev em 2026-10-16: aplicar o Fix 21 antes de fechar a fatia, como as fases 9 a 12 (a fase 13 com a T51, os testes conferidos com Q2 e Q5 num clone fora do repositório, um commit por tarefa), rodar a suíte no Windows e no Linux e uma oitava volta independente de PAP-18. O trabalho continua de outra máquina, pelo resume do `tlc-spec-driven`; os clones de scratchpad desta não vão junto. É a quarta volta seguida que acha uma forma nova das mesmas duas linhas de `usage.ts`, nenhuma que o Claude Code grave. O PR é o 16. A seção abaixo, da Gate, é de 2026-10-15.

Atualizado em 2026-10-15, com a fatia Gate fechada e o PR aberto contra a `main`, à espera da revisão do dev. As seções abaixo desta, da TUI clicável e da Papéis, continuam valendo.

- **Feature**: a Gate, `.specs/features/gate/`, no branch `feat/gate`, saído da `main` em `3922651` e enviado ao `origin`. É a última fatia do MVP: com ela as oito estão prontas.
- **PR**: [PR 14](https://github.com/sh4wty1/squad-code-mcp/pull/14), `feat/gate` → `main`. O dev pediu o push e o PR, e parar: nada foi mesclado.
- **Phase / Task**: fechada. T1 a T47 commitadas; T30 é o fechamento. As três voltas do Verifier deram FAIL só por lacuna de teste (volta 1, 84 mutações, 5 vivas, T31 a T36; volta 2, 55 novas, 2 vivas, T37 e T38; volta 3, 31 novas, 6 vivas). O dev decidiu em 2026-10-15 fechar sem quarta volta: as cinco correções da volta 3 e a varredura de cada `filter` e `find` que ela recomendou viraram T39 a T47, só testes. O veredito de `validation.md` continua FAIL, com uma nota de fechamento no fim; `python .claude/skills/tlc-spec-driven/scripts/validate_state.py gate` sai com 1, o estado aceito, como na Papéis e na TUI clicável.
- **Completed**: spec `07d311c`, design e tarefas `438d603`; T1 a T7 de `04b2ac4` a `595a80c`; T8 a T16 de `7fc4413` a `8f433b9`, com `cc6da26` (a tool `gate` responde o `gate_id`); T17 a T23 de `d037a31` a `41a285a`; T24 a T26 de `b0b40d9` a `fdccdec`; T27 `eb39b01`; T28 `a6a96a8`; T29 `fed6607`; voltas do Verifier `d351ae8`, `798b999`, `b098e0c`; T31 a T36 de `c691138` a `1078607`; T37 `393d3b1`, T38 `be4118d`; plano da volta 3 `50c6aec`; T39 a T47 de `439c2e1` a `1fcba77`; T30 no commit de fechamento, o último do branch.
- **In-progress** (file:line): nada.
- **Next step**: a revisão do PR pelo dev e o merge. Depois do merge, apontar o `ROADMAP.md` e este Handoff para "Depois do MVP".
- **Blockers**: nenhum.
- **Para o dev revisar**: as linhas `n` de "Assumptions" da spec são defaults do agente; as que mudam o que o dev vê ou o contrato estão listadas no corpo do PR e no AD-022.
- **A varredura da volta 3**: 51 mutações de predicado em `broker/tui/keys.ts`, `broker/tui/screens/gate.ts`, `broker/tui/screens/permission.ts` e `requests()` de `broker/shared/derive.ts`, num `git worktree` fora da árvore. 39 morreram pelos testes que havia; das vivas, as do relatório morrem por T39 a T43, quatro novas por T44 a T47, e quatro são equivalentes (`gate.ts:41`, `gate.ts:42`, `gate.ts:72`, `gate.ts:80` sem `t.planned`), com a razão na nota de fechamento de `validation.md`. Cada teste novo falha com a sua mutação e passa sem ela. Nenhum código de produção mudou.
- **Suíte**: em `1fcba77`, Windows com Bun 1.3.14, `tsc` 0 e 2449 pass, 5 skip, 0 fail, 96 arquivos, 142 s; Linux no contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps`, sobre um clone com `core.autocrlf=false` montado só para leitura (`docker run --rm -v <clone>:/src:ro oven/bun:1.4.2 sh -c 'apt-get install git lsof procps; cp -r /src /work; cd /work/broker; bun install --frozen-lockfile; ...'`), `tsc` 0 e 3 de 3 com 2453 pass, 1 skip, 0 fail, entre 91 e 95 s. O `EVT-43` passou desta vez.
- **Marco do MVP**: conferido em 2026-10-14 com sessões reais, `.specs/features/gate/marco-mvp.md`: a feature `slugs` de dois tickets do kickoff ao `feature_closed` `delivered`, com o dev só no terminal da mother e na TUI.
- **Notado e não tocado**: o laço da TUI sobre o log do frame 22a, que tem `seq` fracionário, não termina o primeiro desenho num teste (T25 usou o de 22c); o broker só grava `seq` inteiro. A mensagem do commit `b0b40d9` diz "500 ms" onde é "menos de 500 ms". O Claude Code 2.1.299 mostra na subida um diálogo novo, da extensão do Chrome, que o launcher não trata.
- **Uncommitted files**: nenhum.
- **Branch**: `feat/gate`, enviado ao `origin`.

### Como o Verifier da TUI clicável terminou

- Cada volta rodou numa cópia física (`git clone` em pasta temporária) com `bun install --frozen-lockfile` próprio, no Windows com o Bun 1.3.14. A árvore real só recebeu o `validation.md`.
- Volta 1, sobre `5441e1c`: 33 mutações, 30 mortas, 2 equivalentes, 1 viva, M31 (`broker/tui.ts:182`: na tela pequena, `q` procurado caractere a caractere sai da TUI com `ESC [ M q!`). T28 pôs o caso de CLK-10 em 119×40 e 120×39.
- Volta 2, sobre `923a71d`: o M31 morre; 43 mutações novas, 42 mortas, 1 viva, N30 (`broker/tui/screens/questions.ts:216`, `ky <= 24` → `ky < 24`: com Q-07 de 4 opções a linha das teclas do detalhe cai na última linha da caixa e fica sem marcas). T29 pôs os dois casos de CLK-33 com 4 opções.
- Volta 3, sobre `b0468be`: M31 e N30 morrem; 34 mutações novas, 32 mortas, 2 vivas:
  - **R20**, CLK-03 e CLK-04, `broker/tui/keys.ts:40`: com `[0-9;]{0,24}` no lugar de `[0-9;]*`, um relatório com um inteiro de 400 dígitos vira 382 itens, e os dígitos agem como teclas (`2` troca de tela, `9` entra no campo do modal). Os testes do edge case de inteiros longos chamam `parse` e `point` direto, nunca `keysOf`, `input` ou `take`. Fix 1: um caso de CLK-04 em `test/unit/tui-mouse-input.test.ts` pela entrada.
  - **R32**, CLK-20, `broker/tui/mouse.ts:110`: com `from <= 0` no lugar de `from < 0`, com a primeira linha do log selecionada um clique noutra linha do feed deixa a seleção na primeira. Os testes partem da linha 417 ou de nenhuma seleção. Fix 2: um caso de CLK-20 em `test/unit/tui-mouse.test.ts` com `seq` 1 selecionada.
- O padrão das quatro vivas é o mesmo: o teste usa só a forma mais comum da entrada, longe do limite. Todas as mutações que gravariam uma resposta por engano morreram nas três voltas.
- O fechamento: T30 (`85f3860`) pôs dois casos de CLK-04 com um inteiro de 400 dígitos `2`, na coluna e na linha, por `keysOf`, `input` e `take`; T31 (`dafa7f1`) pôs um caso de CLK-20 com a linha de `seq` 1 selecionada. Numa cópia física do branch, os casos da T30 falham com o R20 e o da T31 com o R32, e passam sem eles. Na spec os 57 requisitos estão `Verified`; `validation.md` tem, no fim, uma nota de fechamento que diz isso e que não houve quarta volta, por decisão do dev.
- O que ficou sem cobrir, por não haver quarta volta: nenhuma varredura de mutantes nova sobre `b0468be..dafa7f1`, nem releitura independente dos três casos novos, que só acrescentam testes.
- `python .claude/skills/tlc-spec-driven/scripts/validate_state.py tui-clicavel` sai com 1, porque o veredito da volta 3 continua FAIL. É o estado aceito, como na Papéis: não ajustar o relatório para o script passar.
- As lições: oito candidatas de fatias anteriores voltaram e foram confirmadas (L-040, L-055, L-057, L-067, L-068, L-069, L-073, L-080); cinco candidatas novas de lacunas de precisão da spec (L-090 a L-094); L-010, carregada pela fatia, levou uma penalidade, porque a volta 1 a achou descumprida em CLK-10.

### As lacunas de precisão da spec, decididas

As nove que o Verifier acusou nas três voltas (CLK-09; CLK-14 e CLK-15; CLK-50 com `m` na tela congelada; a ordem dos pares de CLK-01, CLK-02 e CLK-50; o "clique anterior" de CLK-46; `m` e o clique anterior; a borda de CLK-41 com CLK-44; o formato antigo partido de CLK-10; a sonda de CLK-17) ficam como o código faz, por decisão do dev de 2026-10-14. Cada uma está em "Assumptions" da spec, com o que o código faz. Nenhum código mudou por elas.

Da lista dos workers, o Verifier não acusou e ninguém registrou na spec: a cor do aviso de `m` e `m` dentro de uma colagem; CLK-39 (o custo vale `t` mesmo com o lado direito da linha 38 desenhado por cima); os bits de modificador que `parse` deixa no botão e `point` tira.

### Onde a TUI clicável está

- A suíte da T26, em `b63acf8`: Windows com `tsc` 0 e 2073 pass, 5 skip, 0 fail, 83 arquivos, em 149 s; Linux no contêiner `oven/bun:1.4.2` com `git`, `lsof` e `procps`, sobre um clone feito com `git clone -c core.autocrlf=false` montado só para leitura, `tsc` 0 e 3 de 3 execuções com 2077 pass, 1 skip, 0 fail, 83 arquivos, entre 79 e 81 s. Antes da fatia, no Windows: 1646 pass, 5 skip. Na volta 3, em `b0468be`, Windows: `tsc` 0 e 2076 pass, 5 skip, 1 fail, o `EVT-43`, que passou sozinho em seguida. No fechamento, em `dafa7f1`: Windows, Bun 1.3.14, `tsc` 0 e 2080 pass, 5 skip, 0 fail, 83 arquivos, em 164 s (o `EVT-43` passou); Linux, no mesmo contêiner e do mesmo jeito, `tsc` 0 e 3 de 3 execuções com 2084 pass, 1 skip, 0 fail, 83 arquivos, entre 78 e 79 s.
- **O Bun do Windows mudou**: em 2026-10-14 a máquina tem o Bun 1.3.14 do winget (`C:\Users\Dev\AppData\Local\Microsoft\WinGet\Links\bun.exe`), não o 1.4.2 das fatias anteriores, e o Docker passou de 28.0.4 a 29.8.0. A imagem `oven/bun:1.4.2` voltou a estar no Docker no fechamento. A T26 rodou o Windows com o 1.3.14 e o registrou. Instalar outro Bun é decisão do dev; o winget oferece o 1.4.3.
- Na prévia da T26, em `c4205ad`, a primeira de cinco execuções no Linux teve 21 falhas em 1422 s: `PEER-38/13` estourou 5 s, e vinte casos de `test/unit/launch.test.ts` e `test/unit/launch-worktree.test.ts` (PAP-37, 38, 42, 51 a 55, 57, 58) estouraram 60 s com um `git` de `Bun.spawnSync` que não voltou, stderr vazio. Nas três execuções da T26 não voltou. A causa não foi achada; entra na lista dos instáveis: uma falha assim no Linux pede outra execução antes de concluir que algo quebrou.
- **`EVT-43` falha muito no Windows com o Bun 1.3.14**: depois da T26, 2 de 2 execuções da suíte inteira e 8 de 8 do arquivo sozinho, com o `acked_at` gravado pelo processo do broker de 1 a 4 ms antes do `Date.now()` do teste; na `main` em `36440a6`, num clone com `bun install` próprio, 3 de 3. Nas cópias do Verifier passou nas voltas 1 e 2 e falhou na 3, passando sozinho em seguida. Não é a fatia. Com o Bun 1.4.2 a falha era rara (lista dos instáveis). Uma falha só dele não bloqueia a suíte.
- `EVT-90/92` de `test/integration/server-tools.test.ts`, anterior à fatia, falhou uma vez em cinco execuções da suíte inteira no Windows (3335 ms) e passou sozinho na seguinte: entra na lista dos instáveis de "Evidência e limites".
- No Linux o clone se faz com `git clone -c core.autocrlf=false`: nesta máquina `core.autocrlf` é `true` e o repositório não tem `.gitattributes`, então um clone sem a opção leva CRLF para o contêiner.
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
