# Peer Specification

Fonte: fatia Peer de `.design/squad-mvp.md`, ADR-001, ADR-003, ADR-009 e ADR-010. Esta spec
deriva da fatia; onde a fatia não decide, a escolha está em "Assumptions & Open Questions".

## Problem Statement

O broker herdado do claude-peers registra qualquer sessão ao subir, com um `id` aleatório
que serve de endereço e aparece nas listagens. O squad precisa de nome e papel estáveis,
de um registro que só acontece quando o canal da sessão funciona de ponta a ponta, e de
presença gravada como evento. O upstream também não roda inteiro no Windows.

## Goals

- [ ] Uma sessão lançada com nome e papel só entra no broker depois de o modelo devolver o ping recebido pelo canal.
- [ ] Entrada e saída de peer ficam no log como `peer_joined` e `peer_left`.
- [ ] O `id` é credencial: nunca aparece em listagem.
- [ ] Broker, servidor MCP e CLI rodam no Windows sem `HOME`, `ps` nem `lsof`.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| `/send`, `/poll-messages`, `/ack`, `deliveries`, `GET /events` | Fatia Event |
| Evento `refused` | Fatia Event; e as recusas de `/register` vão a quem ainda não é peer registrado |
| Herança de entregas pendentes pelo nome relançado | Fatia Event cria as entregas; aqui o nome já é o endereço |
| Tools de papel além de `list_peers` | Entram com as rotas de cada fatia |
| Launcher, hooks e skills de papel | Fatia Papéis; aqui nome e papel são lidos do ambiente |
| TUI mostrando `offline` | Fatia TUI leitura |
| Troca de mensagens do upstream (`messages`, `/send-message`, `/poll-messages`, `/set-summary`) | Endereça por `id`, confia no remetente do corpo e apaga não entregues (ADR-002, ADR-003, ADR-009). Sai aqui; a fatia Event traz o envio e o polling de volta sobre `events` |
| Resumo automático via OpenAI e campo `summary` do peer | Fora do MVP (Boundary do design) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Onde fica o código do fork | Diretório `broker/` na raiz, cópia fiel do upstream no primeiro commit | A raiz já tem `README.md` e `.gitignore` do projeto; o design pede o plugin "em diretório separado do broker" | n (STATE AD-001) |
| Nomes aceitos no registro | Lista fixa: `mother`, `leader`, `judge`, `worker-1` a `worker-3`. Papel único exige nome igual ao papel; `worker` exige `worker-N`. Fora disso, recusa `invalid_name` | ADR-003 fixa os seis nomes; a fatia não dá código para o nome inválido. Sem a lista fixa, `online: false` e "destinatário conhecido mas offline" não têm de onde vir, porque a linha do peer é apagada na saída | n (STATE AD-002) |
| Credencial desconhecida em `/list-peers` | Recusa `unknown_peer` | A fatia exige `{ id }` e não nomeia o erro; o diagrama da Event prevê "credencial desconhecida" | n (STATE AD-002) |
| `id` ausente ou que não é texto em `/heartbeat`, `/list-peers` e `/unregister` | Vale como `id` desconhecido: `{ ok: true }` nas duas primeiras de efeito nulo, `unknown_peer` na listagem | Sem isso o SQLite devolvia 500 para um `id` objeto ou lista | n |
| `git_root` ausente em `/register` | Vale como nulo | O campo é opcional na tabela da fatia | n |
| Campo obrigatório ausente ou de tipo errado em `/register` (`pid` que não é inteiro positivo, `cwd` vazio, `git_root` que não é texto nem nulo) | Recusa `missing_field` | Código já usado pelo design em outras rotas; sem a checagem o SQLite devolvia 500 e um `pid` 0 aparecia como vivo | n |
| Ordem das recusas em `/register` | `missing_field` → `invalid_role` → `invalid_name` → `role_taken` ou `worker_limit` → `name_taken` | Mantém os quatro códigos da fatia alcançáveis com a lista fixa de nomes | n |
| Variáveis de ambiente e defaults | `SQUAD_NAME`, `SQUAD_ROLE`, `SQUAD_PORT` (7900), `SQUAD_DB` (`<home>/.squad-code-mcp.db`); servidor MCP e canal se chamam `squad` | O design pede porta e banco próprios e configuração por variável com default; o nome `squad` é o default 6 da fatia Papéis | n (STATE AD-003) |
| Número do ping | Inteiro de 6 dígitos gerado uma vez por processo; a repetição reenvia o mesmo número | A fatia diz "repete o ping"; um número só aceita a resposta a qualquer das cópias | n |
| Ping depois de `ready` correto com registro recusado | O ping para; `ready` continua exposta para tentar de novo | O canal já foi provado; repetir o ping gastaria um turno a cada 10 s por um problema que é do broker | n |
| Intervalos em teste | `SQUAD_PING_INTERVAL_MS`, default 10000, e `SQUAD_CLEANUP_INTERVAL_MS`, default 30000 | Permite testar a repetição do ping e da limpeza sem esperar 10 s e 30 s | n |
| Formato do `id` | `crypto.randomUUID()` | O `id` virou credencial secreta (ADR-003); 8 caracteres de `Math.random` não servem para isso | n |
| Tabela `events` nesta fatia | Criada com todas as colunas da fatia Event; índices e `deliveries` ficam para a Event | Presença já é evento; criar a tabela inteira evita migrar o log na fatia seguinte | n |
| Registro repetido pelo mesmo PID | Se o novo é aceito, o anterior sai com `peer_left` `died` antes do `peer_joined`; se é recusado, o anterior fica | O upstream troca o registro do PID; cobre PID reutilizado pelo sistema antes da limpeza. Uma recusa não pode tirar do squad quem já estava nele |  n |
| `SIGINT` e `SIGTERM` no servidor MCP | Os handlers do upstream continuam e chamam `/unregister`; não são requisito desta fatia | No Windows um processo não recebe esses sinais de outro, então não há como testar aqui. A sessão encerra fechando a entrada padrão (PEER-33) | n |
| "Mesmo executável" em PEER-34 | `process.execPath` | Só se prova numa máquina com outro `bun` no `PATH`; o teste cobre o broker subir e sobreviver | n |
| `/list-peers` e `/register` rodam a limpeza de PIDs mortos antes de responder | Sim. Em `/register` ela roda depois de `missing_field`, `invalid_role` e `invalid_name`; o `peer_left` de um morto achado ali fica gravado mesmo se o registro for recusado em seguida | O upstream já limpa na listagem; sem isso "nome de um peer que morreu" dependeria dos 30 s. A saída do morto é um fato à parte da recusa | n |
| Parar o broker no Windows | `netstat -ano` para achar o PID que escuta a porta; `lsof` nos demais sistemas | Não muda `/health`, que o design lista em Unchanged | n |
| Sobrevivência do daemon ao fechamento do terminal | Broker lançado destacado; o teste cobre a saída do processo pai, não o fechamento de uma janela real | ADR-001 marca como não verificado; fechar uma janela de terminal não é automatizável aqui | n |
| Quando um peer conta como vivo | PID existe **e** `last_seen` tem 60 s ou menos (quatro heartbeats de 15 s). A idade conta a partir do maior entre `last_seen` e o instante em que o broker subiu ou voltou de uma pausa (limpeza rodando mais de 60 s depois da anterior) | Só o PID prende a posição para sempre quando o sistema reutiliza o PID de uma linha velha (revisão do PR 2, F1). Contar do instante em que o broker voltou evita derrubar a sessão viva que atravessou uma queda do broker ou a suspensão da máquina: ela não tem mais `ready` para voltar | n |
| Sessão viva cujo heartbeat falha por mais de 60 s com o broker no ar | Sai com `peer_left` `died` e não volta sozinha | Só acontece com a sessão congelada; relançar a sessão resolve. Reentrada automática fica para quando aparecer | n |
| `SQUAD_CLEANUP_INTERVAL_MS` acima de 60000 | Cada limpeza conta como volta de pausa, e a saída por heartbeat velho só acontece nas limpezas feitas por `/register` e `/list-peers` | O default é 30000; o valor maior só existe para teste | n |
| Falha de `kill-broker` depois de `/health` responder | Mensagem própria e código de saída 1; `Broker is not running.` só quando `/health` não responde | Antes qualquer falha (sem `lsof`, sinal recusado) saía com 0 dizendo que o broker não estava no ar (revisão do PR 2, F2) | n |
| Diretório home em PEER-19 | `os.homedir()`: lê `USERPROFILE` no Windows e `HOME` nos demais | O requisito é não depender de `HOME` no Windows, onde ela não existe; em POSIX `HOME` é a fonte do sistema (revisão do PR 2, F4) | n |
| Testes | `bun test`, unidade com SQLite em memória e integração com processos reais | O upstream não tem testes nem diretriz; vale o default forte da skill | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: validação de entrada → PEER-03, PEER-04, PEER-10. Falha
parcial → PEER-02 (peer e evento na mesma transação). Idempotência → PEER-12, PEER-09.
Fronteira de autenticação → PEER-17, PEER-18. Limite de taxa → N/A porque o broker só
escuta em `127.0.0.1` para até seis sessões. Concorrência → N/A porque os handlers são
síncronos num processo único sobre SQLite. Ciclo de vida do dado → PEER-11, PEER-13,
PEER-42 (a linha do peer sai; o evento fica). Observabilidade → PEER-02, PEER-11, PEER-13.
Falha de dependência externa → PEER-34 (broker fora do ar). Integridade de transição →
PEER-05 a PEER-08.

---

## User Stories

### P1: Registro com nome e papel ⭐ MVP

**User Story**: Como sessão do squad, quero entrar no broker com meu nome e papel para ser endereçada por eles.

**Why P1**: Todo evento das fatias seguintes é carimbado com o nome e o papel do registro.

**Acceptance Criteria**:

1. **PEER-01** WHEN `POST /register` recebe `{ pid, cwd, git_root, name, role }` com papel válido, nome do papel e ambos livres THEN o broker SHALL gravar uma linha em `peers` com `name`, `role`, `pid`, `cwd`, `git_root`, e `registered_at` igual a `last_seen` em epoch ms, e responder `{ id }` com `id` texto não vazio.
2. **PEER-02** WHEN um registro é aceito THEN o broker SHALL gravar na mesma transação um evento com `kind` `peer_joined`, `from_name` `broker`, `role_from` `broker`, `to_name` nulo, `feature_id` nulo, `summary` vazio e `data` igual a `{ "peer": <name>, "role": <role> }`.
3. **PEER-03** IF `role` não é `mother`, `leader`, `worker` ou `judge` THEN o broker SHALL responder `{ ok: false, error: "invalid_role", hint }` sem gravar peer nem evento.
4. **PEER-04** IF `name` não é o nome do papel (`mother`, `leader`, `judge` para o papel de mesmo nome; `worker-1`, `worker-2` ou `worker-3` para `worker`) THEN o broker SHALL responder `{ ok: false, error: "invalid_name", hint }` sem gravar peer nem evento.
5. **PEER-05** IF o papel é `mother`, `leader` ou `judge` e existe um peer vivo com esse papel THEN o broker SHALL responder `{ ok: false, error: "role_taken", hint }` sem gravar peer nem evento.
6. **PEER-06** IF o papel é `worker` e existem três workers vivos THEN o broker SHALL responder `{ ok: false, error: "worker_limit", hint }` sem gravar peer nem evento.
7. **PEER-07** IF o nome pertence a um peer vivo THEN o broker SHALL responder `{ ok: false, error: "name_taken", hint }` sem gravar peer nem evento.
8. **PEER-08** WHEN o nome pertence a um peer cujo PID não existe mais THEN o broker SHALL gravar `peer_left` com `data` `{ "peer": <name>, "reason": "died" }`, depois registrar a nova sessão e responder `{ id }` diferente do anterior.
9. **PEER-09** WHEN o PID que registra já tem um registro e o novo registro é aceito THEN o broker SHALL remover o registro anterior gravando `peer_left` com `reason` `died` antes do `peer_joined` do novo, sem contar o registro anterior como ocupante de nome ou papel.
10. **PEER-41** IF o PID que registra já tem um registro e o novo registro é recusado THEN o broker SHALL manter o registro anterior sem gravar evento.
11. **PEER-10** IF `pid` não é inteiro maior que zero, `cwd` não é texto não vazio, ou `git_root` não é texto nem nulo THEN o broker SHALL responder `{ ok: false, error: "missing_field", hint }` sem gravar peer nem evento.
12. **PEER-37** The broker SHALL responder toda recusa com status HTTP 200 e `hint` texto não vazio.
13. **PEER-39** IF o corpo de um `POST` a `/register`, `/heartbeat`, `/list-peers` ou `/unregister` não é um objeto JSON (ausente, malformado, `null`, lista ou texto) THEN o broker SHALL responder `{ ok: false, error: "missing_field", hint }` sem gravar peer nem evento.

**Independent Test**: registrar `mother` num broker vazio e ler `peers` e `events`.

---

### P1: Presença na saída ⭐ MVP

**User Story**: Como dev, quero que a saída de uma sessão fique no log para saber quem está offline.

**Why P1**: `offline` na TUI é o último evento de presença do nome.

**Acceptance Criteria**:

1. **PEER-11** WHEN `POST /unregister` recebe o `id` de um peer registrado THEN o broker SHALL apagar a linha do peer, gravar `peer_left` com `from_name` `broker` e `data` `{ "peer": <name>, "reason": "unregistered" }`, e responder `{ ok: true }`.
2. **PEER-12** IF `POST /unregister` recebe um `id` desconhecido, ausente ou que não é texto THEN o broker SHALL responder `{ ok: true }` sem gravar evento.
3. **PEER-13** WHEN a limpeza roda e o PID de um peer não existe mais THEN o broker SHALL apagar a linha do peer e gravar `peer_left` com `data` `{ "peer": <name>, "reason": "died" }`.
4. **PEER-14** WHILE o PID de um peer existe e seu `last_seen` tem 60 s ou menos the broker SHALL manter a linha do peer na limpeza sem gravar evento.
5. **PEER-42** WHEN a limpeza roda e o `last_seen` de um peer tem mais de 60 s THEN o broker SHALL apagar a linha do peer e gravar `peer_left` com `data` `{ "peer": <name>, "reason": "died" }`, mesmo que o PID exista.
6. **PEER-43** WHEN o broker sobe, ou a limpeza roda mais de 60 s depois da limpeza anterior, THEN o broker SHALL contar os 60 s de PEER-42 a partir desse instante para todo peer cujo `last_seen` é anterior a ele.
7. **PEER-15** The broker SHALL dar a cada evento um `seq` inteiro maior que o de todo evento anterior e um `ts` em epoch ms.
8. **PEER-38** The broker SHALL rodar a limpeza ao subir e a cada 30 s.

**Independent Test**: registrar, chamar `/unregister` e ler o último evento.

---

### P1: Listagem sem credencial ⭐ MVP

**User Story**: Como peer, quero saber quem mais está no squad e se está vivo, sem ver a credencial de ninguém.

**Why P1**: O `id` deixou de ser endereço; vazá-lo permite escrever em nome de outro.

**Acceptance Criteria**:

1. **PEER-16** WHEN `POST /list-peers` recebe o `id` de um peer registrado THEN o broker SHALL responder uma lista com os outros cinco nomes do squad, cada item `{ name, role, online }`, com `online` verdadeiro só para nome registrado que a limpeza mantém (PEER-14).
2. **PEER-17** The broker SHALL responder `/list-peers` sem nenhum campo além de `name`, `role` e `online` em cada item.
3. **PEER-18** IF `POST /list-peers` recebe um `id` desconhecido, ausente ou que não é texto THEN o broker SHALL responder `{ ok: false, error: "unknown_peer", hint }`.

**Independent Test**: registrar `mother` e `leader`, listar como `mother` e conferir que `leader` está `online` e os workers não.

---

### P1: Broker próprio e rodando no Windows ⭐ MVP

**User Story**: Como dev no Windows, quero subir, consultar e parar o broker do squad sem conflito com um claude-peers instalado.

**Why P1**: A máquina de desenvolvimento é Windows; sem isso nada roda.

**Acceptance Criteria**:

1. **PEER-19** WHERE `SQUAD_DB` não está definida the broker SHALL abrir o banco em `<diretório home do usuário>/.squad-code-mcp.db`, obtido de `os.homedir()`, que não depende da variável `HOME` no Windows.
2. **PEER-20** WHERE `SQUAD_PORT` não está definida the broker SHALL escutar na porta 7900, e em qualquer porta SHALL responder só em `127.0.0.1`, não nos outros endereços da máquina.
3. **PEER-21** WHEN `POST /heartbeat` recebe o `id` de um peer registrado THEN o broker SHALL atualizar `last_seen` para o epoch ms atual, manter `registered_at` e responder `{ ok: true }`; com `id` desconhecido, ausente ou que não é texto SHALL responder `{ ok: true }` sem alterar nenhum peer, como no upstream.
4. **PEER-22** WHEN `GET /health` é chamado THEN o broker SHALL responder `{ status: "ok", peers: <número de peers registrados> }`.
5. **PEER-23** IF um `POST` chega a uma rota que não é `/register`, `/heartbeat`, `/list-peers` ou `/unregister` (incluindo `/set-summary`, `/send-message` e `/poll-messages` do upstream) THEN o broker SHALL responder status 404, com qualquer corpo ou sem corpo.
6. **PEER-34** WHEN o servidor MCP sobe com papel e o broker não responde THEN o servidor SHALL iniciar o broker como processo destacado, com o mesmo executável que o roda, e o broker SHALL continuar respondendo `/health` depois de o servidor sair.
7. **PEER-35** WHEN `cli.ts kill-broker` roda com o broker no ar THEN o processo do broker SHALL terminar e `/health` SHALL deixar de responder, sem depender de `lsof` no Windows.
8. **PEER-36** WHEN `cli.ts status` roda com o broker no ar THEN o CLI SHALL imprimir `Broker: ok (<n> peer(s) registered)`.
9. **PEER-44** IF `cli.ts kill-broker` roda com `/health` respondendo e o CLI não consegue achar ou sinalizar o processo do broker THEN o CLI SHALL imprimir `Could not stop the broker: <motivo>. It is still running.`, não imprimir `Broker is not running.` e sair com código 1.
10. **PEER-45** WHEN `cli.ts kill-broker` roda THEN o CLI SHALL sinalizar só o processo que escuta a porta em `127.0.0.1`, não o que escuta a mesma porta em outro endereço.

**Independent Test**: subir o broker numa porta de teste, `status`, `kill-broker`, `status` de novo.

---

### P1: Repositório comum entre worktrees ⭐ MVP

**User Story**: Como worker num worktree, quero ser registrado no mesmo projeto da mother.

**Why P1**: Cada papel roda num worktree; o topo da árvore de trabalho é diferente em cada um.

**Acceptance Criteria**:

1. **PEER-24** WHEN o `cwd` da sessão é um worktree THEN o servidor MCP SHALL usar como `git_root` o caminho absoluto do diretório git comum, igual ao obtido no checkout principal.
2. **PEER-25** IF o `cwd` não está num repositório git THEN o servidor MCP SHALL usar `git_root` nulo.

**Independent Test**: criar um repositório temporário com um worktree e comparar os dois valores.

---

### P1: Registro que prova o canal ⭐ MVP

**User Story**: Como dev, quero que uma sessão surda apareça `offline` no lançamento, não no meio da feature.

**Why P1**: É o que faz `peer_joined` significar canal funcionando (ADR-009).

**Acceptance Criteria**:

1. **PEER-26** IF `SQUAD_ROLE` está ausente ou vazia THEN o servidor MCP SHALL listar zero tools, não empurrar ping e não registrar no broker.
2. **PEER-27** WHEN o servidor MCP sobe com `SQUAD_NAME` e `SQUAD_ROLE` THEN o servidor SHALL empurrar pelo canal (`notifications/claude/channel`) um ping com um número inteiro de 100000 a 999999 sorteado no processo, presente no texto e em `meta.number`, listar apenas a tool `ready` e não registrar no broker.
3. **PEER-28** WHILE `ready` não foi chamada com o número do ping the servidor MCP SHALL reenviar o mesmo ping a cada 10 s, ou a cada `SQUAD_PING_INTERVAL_MS` quando definida.
4. **PEER-29** IF `ready` é chamada com um número diferente do ping THEN o servidor MCP SHALL devolver erro, não registrar no broker e manter apenas a tool `ready`.
5. **PEER-30** WHEN `ready` é chamada com o número do ping e o broker aceita THEN o servidor MCP SHALL registrar com `pid`, `cwd`, `git_root`, `name` e `role`, parar o ping, enviar `notifications/tools/list_changed` e passar a listar as tools do papel (`list_peers`) sem `ready`.
6. **PEER-31** IF `ready` é chamada com o número do ping e o broker recusa o registro THEN o servidor MCP SHALL devolver erro com o `error` e o `hint` do broker, manter apenas a tool `ready` e parar o ping.
7. **PEER-32** WHEN a tool `list_peers` é chamada THEN o servidor MCP SHALL devolver um texto com nome, papel e `online` ou `offline` de cada um dos outros nomes do squad, sem nenhum `id`.
8. **PEER-33** WHEN a entrada padrão do servidor MCP fecha com o peer registrado THEN o servidor MCP SHALL chamar `/unregister`.
9. **PEER-40** IF uma tool que não está na lista atual é chamada (`ready` sem papel ou depois do registro; `list_peers` antes do registro) THEN o servidor MCP SHALL responder erro `Unknown tool` sem chamar o broker.

**Independent Test**: abrir o servidor com um cliente MCP de teste, receber o ping, chamar `ready` e listar as tools.

---

## Edge Cases

- IF o papel é válido e o nome é de outro papel (`name: "mother"`, `role: "worker"`) THEN o broker SHALL responder `invalid_name` (PEER-04).
- WHEN três workers estão registrados e um deles morreu THEN o broker SHALL aceitar um novo worker com o nome do morto (PEER-06, PEER-08).
- IF uma recusa acontece e nenhum peer registrado morreu THEN o broker SHALL deixar a contagem de linhas de `peers` e de `events` inalterada (PEER-03 a PEER-07, PEER-10).
- WHEN o caminho do repositório tem espaço THEN o servidor MCP SHALL iniciar o broker assim mesmo (PEER-34).
- WHEN um registro é recusado por `role_taken`, `worker_limit` ou `name_taken` e a limpeza feita antes achou um peer morto THEN o broker SHALL manter gravado o `peer_left` desse peer.
- WHEN o PID de uma linha velha passou a ser de outro processo THEN o broker SHALL aceitar o registro do papel dessa linha depois de 60 s sem heartbeat (PEER-42, PEER-05).
- WHEN um peer vivo manda heartbeat depois de o broker voltar de uma queda mais longa que 60 s THEN o broker SHALL manter a linha do peer (PEER-43).
- IF a gravação do evento falha THEN o broker SHALL não gravar o peer (PEER-02).
- IF um registro é recusado por `missing_field`, `invalid_role` ou `invalid_name` e existe um peer morto ainda não limpo THEN o broker SHALL não gravar o `peer_left` desse peer nessa chamada.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PEER-01 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-02 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-03 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-04 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-05 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-06 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-07 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-08 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-09 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-10 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-11 | P1: Presença na saída | Execute | Implementing |
| PEER-12 | P1: Presença na saída | Execute | Implementing |
| PEER-13 | P1: Presença na saída | Execute | Implementing |
| PEER-14 | P1: Presença na saída | Execute | Implementing |
| PEER-15 | P1: Presença na saída | Execute | Implementing |
| PEER-16 | P1: Listagem sem credencial | Execute | Implementing |
| PEER-17 | P1: Listagem sem credencial | Execute | Implementing |
| PEER-18 | P1: Listagem sem credencial | Execute | Implementing |
| PEER-19 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-20 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-21 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-22 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-23 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-24 | P1: Repositório comum entre worktrees | Execute | Implementing |
| PEER-25 | P1: Repositório comum entre worktrees | Execute | Implementing |
| PEER-26 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-27 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-28 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-29 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-30 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-31 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-32 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-33 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-34 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-35 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-36 | P1: Broker próprio e rodando no Windows | Execute | Implementing |
| PEER-37 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-38 | P1: Presença na saída | Execute | Implementing |
| PEER-39 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-40 | P1: Registro que prova o canal | Execute | Implementing |
| PEER-41 | P1: Registro com nome e papel | Execute | Implementing |
| PEER-42 | P1: Presença na saída | Execute | Implementing |
| PEER-43 | P1: Presença na saída | Execute | Implementing |
| PEER-44 | P1: Broker próprio e rodando no Windows | Tasks | In Tasks |
| PEER-45 | P1: Broker próprio e rodando no Windows | Tasks | In Tasks |

**Coverage:** 45 total, 45 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Um cliente MCP de teste sobe o servidor como `leader`, recebe o ping, chama `ready`, e o log tem `peer_joined` de `leader`.
- [ ] O mesmo cliente fecha, e o log tem `peer_left` com `unregistered`.
- [ ] `bun test` e `tsc --noEmit` passam no Windows.
