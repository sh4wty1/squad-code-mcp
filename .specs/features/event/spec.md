# Event Specification

Fonte: fatia Event de `.design/squad-mvp.md`, ADR-002, ADR-004, ADR-006, ADR-009, ADR-010 e
ADR-011, e `docs/fase-0/spikes.md`. Esta spec deriva da fatia; onde a fatia não decide, a
escolha está em "Assumptions & Open Questions".

## Problem Statement

Depois da fatia Peer o broker sabe quem está no squad, mas ninguém fala com ninguém: a troca
de mensagens do upstream saiu (STATE AD-004) e o log só tem presença. O squad precisa do
envio de `task`, `result` e `verdict` com as recusas de topologia e de estado, da entrega
que sobrevive à queda da sessão, e da leitura do log por cursor, que é a fonte da TUI.

## Goals

- [ ] Um peer envia `task`, `result` e `verdict` pelas arestas da estrela, e o broker recusa o resto sem gravar o evento tentado.
- [ ] Toda recusa a um peer registrado fica no log como `refused`.
- [ ] Uma mensagem fica pendente por nome até o ack, e volta no polling enquanto não for confirmada.
- [ ] O servidor MCP faz polling, empurra pelo canal e só então confirma.
- [ ] `GET /events?after=<seq>` devolve o log inteiro em ordem, e `/state` diz a um peer o que ele deve.
- [ ] Um pedido de permissão vira evento, e a decisão do dev volta ao Claude Code pelo relay do canal.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| `/open-feature`, `/close-feature`, eventos `feature_opened` e `feature_closed` | Fatia Feature. Aqui a tabela `features` é criada e lida; quem a preenche é a fatia seguinte |
| `/ask`, `/escalate`, `/merge-question`, `/answer`, `/gate`, `/gate-decision`, tabelas `questions` e `gates` | Fatias Question e Gate. `/send` recusa esses kinds |
| Perguntas de que o peer é holder em `owed` | Fatia Question |
| Hooks que chamam `/turn-started` e `/usage`, e como um hook obtém o `id` da sessão | Fatia Papéis. Aqui as duas rotas existem e são testadas por HTTP |
| Hook de parada que consulta `/state` | Fatia Papéis |
| Status do agente (`offline`, `blocked`, `stalled`, `working`...) | Fatia TUI leitura. Aqui só o que `/send` e `/state` precisam: estado do ticket e dívidas |
| Teste de replay de features, perguntas e gates | Entra com cada projeção. Aqui nenhuma regra lê tabela de ticket: tudo sai do log |
| Paginação ou limite em `GET /events` | O design não pede; o log de uma feature cabe numa resposta |
| Ordem de execução por `depends_on` e ciclo de dependência no `plan` | O broker só recusa o que o design lista; a ordem é do leader |
| Comandos novos no `cli.ts` | Nenhum estado da fatia depende deles |
| Sessão real do Claude Code recebendo o push e o veredito de permissão | Os testes usam um cliente MCP de teste, como na Peer; fica em "Não verificado" |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| De onde vem a "feature aberta" antes da fatia Feature | Esta fatia cria a tabela `features` com as colunas da fatia Feature; feature aberta é a linha com `closed_seq` nulo. Os testes inserem a linha; em uso real, entre Event e Feature, todo `task`, `result`, `verdict` e `plan` recebe `no_open_feature` | A fatia exige `no_open_feature` e `feature_id` em todo evento, e `/open-feature` é da fatia seguinte. Mesmo caminho da Peer, que criou `events` inteira | y |
| Kinds aceitos por `/send` | Só `task`, `result` e `verdict`. Qualquer outro, dos vinte ou não, recebe `invalid_kind`; o `hint` aponta a rota do kind quando ela existe | A fatia entrega esses três; os outros kinds têm rota própria, nesta fatia ou nas seguintes | y |
| Códigos de recusa que a fatia não nomeia | `invalid_kind` (kind fora dos três em `/send`), `invalid_field` (campo presente, do tipo certo e com valor não permitido), `ticket_closed` (`task` para ticket aprovado), `invalid_token` (credencial humana errada) | O design só tem `missing_field`; a Peer já o usa para ausente ou de tipo errado. Sem `ticket_closed`, um `task` reabriria um ticket aprovado, que o design chama de fechamento | y |
| Quais kinds exigem feature aberta | `task`, `result`, `verdict` e `plan`. `blocked`, `unblocked`, `usage`, `turn_started`, `permission_request`, `permission_decision` e `refused` são gravados com `feature_id` nulo quando não há feature | O envelope diz "nulo só em presença e em `usage` fora de feature", mas o hook de início de turno dispara em todo turno, inclusive na conversa de descoberta da mother: recusar gravaria um `refused` por turno. Pedido de permissão também acontece fora de feature | y |
| Recusas que gravam `refused` | As das rotas que gravam evento em nome do peer: `/send`, `/plan`, `/blocked`, `/unblocked`, `/usage`, `/turn-started`, `/permission-request`. Não gravam: `unknown_peer`, `invalid_token`, corpo que não é objeto JSON, e as recusas de `/poll-messages`, `/ack`, `/history`, `/state`, `/permission-decision` e `GET /events` | "Toda recusa a um peer registrado" e `attempted_kind` supõem um evento tentado. As rotas de leitura e de transporte não tentam evento; `human` não é peer | y |
| `attempted_kind` quando o `kind` de `/send` não serve | O texto recebido se tiver até 40 caracteres; texto vazio nos outros casos | O dev precisa ver na TUI o que o agente tentou (ADR-010), sem deixar um valor arbitrário crescer no log | y |
| Ordem das recusas de `/send` | `unknown_peer` → `missing_field` do envelope → `invalid_kind` → `invalid_field` do `summary` → `unknown_recipient` → `edge_not_allowed` → `no_open_feature` → `missing_field` e `invalid_field` dos campos do kind → recusas de estado, na ordem dada em cada kind | Mantém todos os códigos alcançáveis e a resposta determinística | y |
| `body` ausente | Vale como texto vazio | Um `verdict` de `approve` com `criteria` pode não ter mais nada a dizer | y |
| Nomes conhecidos como destinatário | Os seis do ADR-003 e `human`. `*` recebe `unknown_recipient` | `*` só é destino de `feature_opened` e `feature_closed`, que não passam por `/send`. `human` é conhecido, e cai em `edge_not_allowed` nos três kinds | y |
| `ticket_ref` num `task` mother → leader ou num `result` leader → mother | Recusa `invalid_field` | O design diz "sem `ticket_ref`"; gravá-lo poria o evento na história de um ticket | y |
| `loadout` | Obrigatório, lista de textos, pode ser vazia | A tabela de kinds marca os opcionais com `?`, e `loadout` não tem | y |
| `criteria` do `task` | Opcional, lista de inteiros | "números na spec" | y |
| `task` para ticket em `working` ou em `review` | Aceito. O `result` anterior a ele deixa de poder receber `verdict` (`stale_reference`), e o worker entrega de novo citando o `task` novo | O design não recusa, e a mother pode acrescentar escopo. Sem a regra do `verdict`, o veredito sobre uma entrega já substituída travaria o ticket | y |
| `task` de um ticket para outro worker | Aceito; o dono passa a ser o novo destinatário e o anterior fica livre | "O dono é o `to` do `task` mais recente" | y |
| Quando `rework_limit` vale | `task` para ticket com três `verdict` de `rework` na feature aberta | Dois reworks por ticket: o `task` inicial e dois de rework são aceitos; o ticket fica `escalated` no terceiro `rework` | y |
| `result` ou `verdict` de ticket `dropped` | Recusa `ticket_dropped` | Descartado conta como concluído | y |
| `result` de ticket que nunca recebeu `task` | Recusa `not_owner` | Não há dono | y |
| Ticket que volta de `dropped` num `plan` posterior | Recusa `invalid_plan` | "Não aceita mais `task`"; a saída do design é planejar um ticket novo | y |
| `plan` em que um ticket depende de si mesmo | Recusa `invalid_plan` | Mesmo defeito de um `depends_on` fora da lista: nunca se resolve | y |
| `plan` com lista vazia ou item malformado | Recusa `missing_field` | Sem ticket não há plano | y |
| `/unblocked` de quem não está bloqueado | Aceito; grava o evento | Não muda a derivação ("`blocked` sem `unblocked` depois"), e recusar gravaria um `refused` no lugar | y |
| Qual `blocked` o broker fecha no `result` | Qualquer `blocked` aberto do worker, com ou sem `ticket_ref` | `unblocked` só carrega `peer`: o bloqueio é do agente | y |
| Limite de `reason` em `/blocked` | 80 caracteres, como `summary` | "`reason` (curto)" | y |
| `summary` e `body` de `permission_request` e `permission_decision` | O broker monta: no pedido, `summary` são os primeiros 80 caracteres de `<tool_name>: <description>` e `body` é o `input_preview`; na decisão, `summary` são os primeiros 80 de `<behavior>: <tool_name>` e `body` é vazio | Quem chama é o servidor MCP ou a TUI, não um modelo; `summary` é obrigatório nos kinds de mensagem | y |
| Onde fica a credencial humana | Arquivo em `SQUAD_TOKEN_FILE`, default `<home>/.squad-code-mcp.token`. O broker cria com um token aleatório se não existe e reusa se existe | O design pede "gerada pelo broker e fora de qualquer worktree" e a descreve na fatia Gate; `/permission-decision` já precisa dela aqui. No home, ao lado do banco | y |
| Pedido de permissão de um peer que saiu | Fechado: um `peer_left` do peer depois do pedido conta como evento posterior | A sessão que conhecia o `request_id` não existe mais | y |
| `request_seq` que não é de um `permission_request` | Recusa `invalid_field` | Não é pedido fechado; é citação errada | y |
| Formato de leitura de um evento | Objeto plano: os campos do envelope com os nomes do design (`from`, `to`) e os campos próprios do kind no mesmo nível | É o formato de `/send`; em TypeScript vira uma união discriminada por `kind` | y |
| `last_seq` de `GET /events` | O maior `seq` do log, 0 com o log vazio | A TUI usa como próximo cursor mesmo quando a lista vem vazia | y |
| `after` inválido em `GET /events` | Status 200 com `{ ok: false, error: "invalid_field", hint }` | Mesma forma de recusa das outras rotas | y |
| `GET /events` sem credencial | Sim | O design não pede; é leitura em `127.0.0.1`, e o limite cooperativo é o do ADR-008 | y |
| `/history` por `ticket_ref` | Só eventos da feature aberta; sem feature aberta, lista vazia. `question_id` e `gate_id` são ids do banco e não filtram por feature | `ticket_ref` é único dentro da feature, não entre features | y |
| `ticket` em `/state` | Só para worker: o ticket de que é dono e que não foi aprovado nem descartado. Nulo para os outros papéis | Um worker tem um ticket por vez; judge e leader têm vários, e eles estão em `owed` | y |
| Forma de `owed` | Lista de `{ owes, ticket_ref?, seq }`, em que `seq` é o evento que criou a dívida e `owes` é `result`, `verdict`, `task`, `plan` ou `delivery` | Uma lista com discriminante aceita a dívida de pergunta da fatia Question sem mudar de forma | y |
| Quando o leader deve o `plan` | Existe `task` mother → leader na feature aberta e nenhum `plan` nela | "O `plan` depois do kickoff"; um `task` de acréscimo de escopo não obriga a replanejar | y |
| Nomes das tools | `send_task`, `send_result`, `send_verdict`, `plan`, `blocked`, `unblocked`, `state`, `history`, além de `list_peers` | "Só o judge vê enviar `verdict`" pede uma tool por kind | y |
| Texto do push de um evento | `content` traz `summary`, `body` e os campos próprios do kind; `meta` traz `kind`, `seq`, `from` e `ticket_ref` como texto | O worker precisa do `seq` do `task` para citar em `task_seq`, e o judge do `seq`, `branch` e `commit` do `result` | y |
| `permission_decision` cujo pedido este processo não conhece | O servidor MCP confirma a entrega e não envia veredito | Só acontece com sessão relançada; o `request_id` era da sessão anterior | y |
| Pedido de permissão antes do registro | O servidor MCP ignora; vale o diálogo do terminal | Sem `id` não há como gravar | y |
| Intervalo de polling em teste | `SQUAD_POLL_INTERVAL_MS`, default 1000 | Como os intervalos da Peer | y |
| Append-only na prática | Gatilhos do SQLite abortam `UPDATE` e `DELETE` em `events` | Torna o ADR-002 verificável por teste, e não só uma regra do código | y |
| Tamanho máximo de `body` | Sem limite | O design só limita `summary` | y |
| Testes | `bun test`, unidade com SQLite em memória e integração com processos reais, como na Peer | Convenção já em uso | y |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: validação de entrada → EVT-04 a EVT-07, EVT-14, EVT-19,
EVT-26, EVT-33, EVT-44, EVT-52, EVT-56, EVT-63. Falha parcial → EVT-39, EVT-79 (evento e
entrega na mesma transação). Idempotência e repetição → EVT-42, EVT-43, EVT-83, EVT-84.
Fronteira de autenticação → EVT-02, EVT-03, EVT-62, EVT-65. Limite de taxa → N/A porque o
broker só escuta em `127.0.0.1` para até seis sessões e a TUI. Concorrência e ordem →
EVT-41, EVT-82; corrida entre handlers N/A porque são síncronos num processo único sobre
SQLite. Ciclo de vida do dado → EVT-46, EVT-77 (nada é apagado). Observabilidade → EVT-47,
EVT-48. Falha de dependência externa → EVT-83, EVT-84 (push ou ack que falha).
Integridade de transição → EVT-20 a EVT-24, EVT-28 a EVT-31, EVT-35 a EVT-38, EVT-64.

---

## Definições

Valem para toda a spec e são calculadas só a partir de `events` (ADR-002, ADR-006).

- **Feature aberta**: a linha de `features` com `closed_seq` nulo. Há no máximo uma.
- **Evento do ticket**: `task`, `result` ou `verdict` com aquele `ticket_ref` na feature aberta.
- **Plano vigente**: o `plan` de maior `seq` na feature aberta.
- **Dono** de um ticket: o `to` do `task` de maior `seq` do ticket.
- **Aprovado**: o evento do ticket de maior `seq` é um `verdict` com `outcome` `approve`.
- **Descartado**: o plano vigente traz o ticket com `dropped` verdadeiro.
- **Aberto para um worker**: ele é o dono, e o ticket não está aprovado nem descartado.
- **Formato de leitura**: `{ seq, ts, kind, feature_id, from, role_from, to, summary, body, ticket_ref }` mais os campos próprios do kind no mesmo nível.
- **Rotas com credencial**: `/send`, `/poll-messages`, `/ack`, `/history`, `/blocked`, `/unblocked`, `/usage`, `/turn-started`, `/plan`, `/state`, `/permission-request`.

---

## User Stories

### P1: Envio pelas arestas da estrela ⭐ MVP

**User Story**: Como peer, quero enviar `task`, `result` e `verdict` a quem a topologia permite, com o broker carimbando quem eu sou.

**Why P1**: É a porta do contrato (ADR-004); as outras fatias gravam no mesmo envelope.

**Acceptance Criteria**:

1. **EVT-01** WHEN `POST /send` recebe `{ id, kind, to, summary, body?, ticket_ref?, ...campos do kind }` de um peer registrado, com kind, aresta, feature aberta e regras do kind atendidos THEN o broker SHALL gravar um evento com `kind`, `feature_id` da feature aberta, `to_name`, `summary`, `body` (vazio se ausente), `ticket_ref` (nulo se ausente) e `data` igual ao JSON só dos campos próprios do kind, e responder `{ ok: true, seq }` com o `seq` do evento.
2. **EVT-02** The broker SHALL preencher `from_name` e `role_from` com o nome e o papel do registro do `id`, e `seq`, `ts` e `feature_id` por conta própria, ignorando qualquer `from`, `role_from`, `seq`, `ts` ou `feature_id` vindo no corpo.
3. **EVT-03** IF uma rota com credencial recebe um `id` desconhecido, ausente ou que não é texto THEN o broker SHALL responder `{ ok: false, error: "unknown_peer", hint }` sem gravar nenhum evento, nem `refused`.
4. **EVT-04** IF `kind` ou `to` está ausente ou não é texto, `summary` está ausente, não é texto ou é vazio, ou `body` está presente e não é texto THEN o broker SHALL responder `missing_field`.
5. **EVT-05** IF `kind` não é `task`, `result` nem `verdict` THEN o broker SHALL responder `invalid_kind`.
6. **EVT-06** IF `summary` tem mais de 80 caracteres THEN o broker SHALL responder `invalid_field`.
7. **EVT-07** IF `to` não é `mother`, `leader`, `judge`, `worker-1`, `worker-2`, `worker-3` nem `human` THEN o broker SHALL responder `unknown_recipient`.
8. **EVT-08** IF o trio (kind, papel de quem chama, papel do destinatário) não é `task` mother → leader, `task` leader → worker, `result` worker → judge, `result` leader → mother nem `verdict` judge → leader THEN o broker SHALL responder `edge_not_allowed`.
9. **EVT-09** IF não há feature aberta THEN o broker SHALL responder `no_open_feature` a `/send` e a `/plan`.
10. **EVT-10** IF um envio falha em mais de uma regra THEN o broker SHALL responder o erro da primeira nesta ordem: `unknown_peer`, `missing_field` do envelope (EVT-04), `invalid_kind`, `invalid_field` do `summary`, `unknown_recipient`, `edge_not_allowed`, `no_open_feature`, `missing_field` dos campos do kind, `invalid_field` dos campos do kind, recusas de estado.
11. **EVT-11** The broker SHALL responder toda recusa das rotas desta fatia com status HTTP 200, `ok` falso e `hint` texto não vazio.
12. **EVT-12** IF o corpo de um `POST` a uma rota desta fatia não é um objeto JSON THEN o broker SHALL responder `{ ok: false, error: "missing_field", hint }` sem gravar evento.
13. **EVT-13** WHEN o destinatário é um nome do squad sem sessão registrada THEN o broker SHALL gravar o evento e responder `{ ok: true, seq }`.

**Independent Test**: com uma feature aberta, `mother` envia `task` a `leader` e o evento aparece em `GET /events` com `from` `mother`.

---

### P1: Plano e ciclo do ticket ⭐ MVP

**User Story**: Como leader, quero que o broker só aceite `task`, `result` e `verdict` coerentes com o plano e com o estado do ticket.

**Why P1**: Um worker com dois tickets, um veredito sobre commit substituído ou um quarto rework corrompem o log que a TUI lê (ADR-007, ADR-010).

**Acceptance Criteria**:

1. **EVT-14** IF `tickets` em `/plan` não é uma lista não vazia, ou um item não tem `ticket_ref` e `title` texto não vazio, ou tem `depends_on` que não é lista de textos ou `dropped` que não é booleano THEN o broker SHALL responder `missing_field`.
2. **EVT-15** WHEN `POST /plan` recebe `{ id, tickets }` válido do leader com feature aberta THEN o broker SHALL gravar um evento `plan` com `from_name` `leader`, `to_name` nulo, `summary` vazio, `ticket_ref` nulo e `data` `{ "tickets": [...] }` só com as chaves `ticket_ref`, `title`, `depends_on` e `dropped` de cada item, e responder `{ ok: true, seq }`.
3. **EVT-16** IF quem chama `/plan` não tem o papel `leader` THEN o broker SHALL responder `edge_not_allowed`, antes de qualquer outra recusa que não seja `unknown_peer`.
4. **EVT-17** IF o `plan` repete um `ticket_ref`, tem `depends_on` com um `ticket_ref` que não está na lista ou que é o do próprio item, ou traz sem `dropped` verdadeiro um ticket descartado no plano vigente THEN o broker SHALL responder `invalid_plan`.
5. **EVT-18** IF o `plan` omite um `ticket_ref` que já recebeu `task` na feature aberta THEN o broker SHALL responder `plan_drops_started_ticket`.
6. **EVT-19** IF um `task` leader → worker não tem `ticket_ref` texto não vazio, não tem `loadout` lista de textos, ou tem `criteria` que não é lista de inteiros THEN o broker SHALL responder `missing_field`.
7. **EVT-20** IF o `ticket_ref` de um `task` leader → worker não está no plano vigente, ou não há `plan` na feature aberta THEN o broker SHALL responder `unplanned_ticket`.
8. **EVT-21** IF um `task`, um `result` de worker ou um `verdict` cita um ticket descartado THEN o broker SHALL responder `ticket_dropped`.
9. **EVT-22** IF um `task` cita um ticket aprovado THEN o broker SHALL responder `ticket_closed`.
10. **EVT-23** IF um `task` cita um ticket com três `verdict` de `outcome` `rework` na feature aberta THEN o broker SHALL responder `rework_limit`.
11. **EVT-24** IF o destinatário de um `task` leader → worker tem aberto para si um ticket com outro `ticket_ref` THEN o broker SHALL responder `worker_busy`.
12. **EVT-25** IF um `task` leader → worker falha em mais de uma regra de estado THEN o broker SHALL responder a primeira nesta ordem: `unplanned_ticket`, `ticket_dropped`, `ticket_closed`, `rework_limit`, `worker_busy`.
13. **EVT-26** IF um `task` mother → leader ou um `result` leader → mother traz `ticket_ref` não nulo THEN o broker SHALL responder `invalid_field`.
14. **EVT-27** WHEN um `task` leader → worker é aceito THEN o broker SHALL gravar em `data` `loadout` e, se veio, `criteria`, e nada mais.
15. **EVT-28** IF um `result` worker → judge não tem `ticket_ref`, `branch` e `commit` texto não vazio, ou `task_seq` inteiro THEN o broker SHALL responder `missing_field`.
16. **EVT-29** IF quem envia um `result` worker → judge não é o dono do ticket, ou o ticket não recebeu `task` na feature aberta THEN o broker SHALL responder `not_owner`.
17. **EVT-30** IF o `task_seq` de um `result` não é o `seq` do `task` de maior `seq` do ticket THEN o broker SHALL responder `stale_reference`.
18. **EVT-31** IF existe `verdict` do ticket com `seq` maior que o do `task` citado THEN o broker SHALL responder `stale_reference` ao `result`.
19. **EVT-32** WHEN um `result` worker → judge é aceito THEN o broker SHALL gravar em `data` `task_seq`, `branch` e `commit`, inclusive quando já existe outro `result` para o mesmo `task` ainda sem `verdict`.
20. **EVT-33** IF um `verdict` não tem `ticket_ref` texto não vazio, `result_seq` inteiro, `outcome` texto, ou `criteria` lista não vazia de `{ n: inteiro, text: texto, pass: booleano, note?: texto }` THEN o broker SHALL responder `missing_field`.
21. **EVT-34** IF o `outcome` de um `verdict` não é `approve` nem `rework` THEN o broker SHALL responder `invalid_field`.
22. **EVT-35** IF o `result_seq` de um `verdict` não é o `seq` do `result` de maior `seq` do ticket, ou o ticket não tem `result` THEN o broker SHALL responder `stale_reference`.
23. **EVT-36** IF existe `verdict` do ticket com `seq` maior que o do `result` citado THEN o broker SHALL responder `stale_reference` ao `verdict`.
24. **EVT-37** IF existe `task` do ticket com `seq` maior que o do `result` citado THEN o broker SHALL responder `stale_reference` ao `verdict`.
25. **EVT-38** WHEN um `verdict` é aceito THEN o broker SHALL gravar em `data` `result_seq`, `outcome` e `criteria`.

**Independent Test**: com feature aberta, o leader envia `plan` e `task`, o worker envia `result`, o judge envia `verdict` de `rework`; repetir até o `task` que recebe `rework_limit`.

---

### P1: Entrega até o transporte ⭐ MVP

**User Story**: Como peer, quero receber o que me foi enviado mesmo que minha sessão tenha caído entre o envio e a leitura.

**Why P1**: O upstream marca como entregue no polling e apaga o não entregue quando o peer morre (ADR-009).

**Acceptance Criteria**:

1. **EVT-39** WHEN o broker grava um `task`, `result`, `verdict` ou `permission_decision` THEN o broker SHALL gravar na mesma transação uma linha em `deliveries` com `event_seq`, `recipient` igual ao `to_name` e `acked_at` nulo.
2. **EVT-40** The broker SHALL gravar entrega só para os quatro kinds de EVT-39: nenhum evento com `to_name` nulo ou `human` gera linha em `deliveries`.
3. **EVT-41** WHEN `POST /poll-messages` recebe o `id` de um peer registrado THEN o broker SHALL responder `{ events }` com os eventos de entrega pendente para o nome do peer, em ordem crescente de `seq`, no formato de leitura.
4. **EVT-42** WHILE uma entrega não foi confirmada por `/ack` the broker SHALL devolvê-la em todo `/poll-messages` do destinatário.
5. **EVT-43** WHEN `POST /ack` recebe `{ id, seqs }` THEN o broker SHALL preencher `acked_at` com o epoch ms atual nas entregas pendentes do nome de quem chama cujo `event_seq` está em `seqs`, não alterar entrega de outro nome nem entrega já confirmada, e responder `{ ok: true }`.
6. **EVT-44** IF `seqs` em `/ack` não é uma lista de inteiros THEN o broker SHALL responder `missing_field` sem alterar entrega.
7. **EVT-45** WHEN uma sessão registra um nome que tem entregas pendentes de uma sessão anterior THEN o broker SHALL devolvê-las no `/poll-messages` do novo `id`.
8. **EVT-46** WHEN um peer sai por `/unregister` ou pela limpeza THEN o broker SHALL manter as linhas de `deliveries` do nome dele como estavam.

**Independent Test**: enviar `task` a `leader` offline, registrar `leader`, fazer polling duas vezes, confirmar, fazer polling de novo.

---

### P1: Recusa com rastro ⭐ MVP

**User Story**: Como dev, quero ver na TUI quando um agente está sendo recusado.

**Why P1**: Um agente em laço de recusas não aparecia no log (ADR-010).

**Acceptance Criteria**:

1. **EVT-47** WHEN `/send`, `/plan`, `/blocked`, `/unblocked`, `/usage`, `/turn-started` ou `/permission-request` recusa um peer registrado THEN o broker SHALL gravar um evento `refused` com `from_name` `broker`, `role_from` `broker`, `to_name` nulo, `summary` vazio, `feature_id` da feature aberta ou nulo, e `data` `{ "peer": <nome>, "attempted_kind": <kind>, "error": <código> }`, e não gravar o evento tentado nem entrega.
2. **EVT-48** The broker SHALL preencher `attempted_kind` com o `kind` do corpo em `/send` quando ele é texto de até 40 caracteres e com texto vazio quando não é, e nas outras rotas com `plan`, `blocked`, `unblocked`, `usage`, `turn_started` ou `permission_request`.
3. **EVT-49** IF `/poll-messages`, `/ack`, `/history`, `/state`, `/permission-decision` ou `GET /events` recusa THEN o broker SHALL não gravar `refused`.

**Independent Test**: um worker envia `task`; a resposta é `edge_not_allowed` e o último evento do log é `refused` com o nome dele.

---

### P1: Registros da sessão ⭐ MVP

**User Story**: Como sessão, quero gravar bloqueio, turno e uso para que o status seja derivado do log.

**Why P1**: São as três exceções emitidas da derivação (ADR-006).

**Acceptance Criteria**:

1. **EVT-50** WHEN `POST /blocked` recebe `{ id, ticket_ref?, reason, detail, last_action }` de um peer registrado THEN o broker SHALL gravar um evento `blocked` com `from_name` do peer, `to_name` nulo, `ticket_ref` (nulo se ausente) e `data` `{ reason, detail, last_action }`, e responder `{ ok: true, seq }`.
2. **EVT-51** IF `reason` não é texto não vazio, `detail` ou `last_action` não é texto, ou `ticket_ref` está presente e não é texto THEN o broker SHALL responder `missing_field`.
3. **EVT-52** IF `reason` tem mais de 80 caracteres THEN o broker SHALL responder `invalid_field`.
4. **EVT-53** WHEN `POST /unblocked` recebe o `id` de um peer registrado THEN o broker SHALL gravar um evento `unblocked` com `from_name` do peer, `to_name` nulo e `data` `{ "peer": <nome> }`, e responder `{ ok: true, seq }`.
5. **EVT-54** WHEN o broker grava um `result` worker → judge de um worker que tem `blocked` sem `unblocked` de `seq` maior THEN o broker SHALL gravar na mesma transação, depois do `result`, um `unblocked` com `from_name` `broker` e `data` `{ "peer": <nome> }`.
6. **EVT-55** WHEN um peer sai por `/unregister` ou pela limpeza tendo `blocked` sem `unblocked` de `seq` maior THEN o broker SHALL gravar na mesma transação do `peer_left` um `unblocked` com `from_name` `broker` e `data` `{ "peer": <nome> }`.
7. **EVT-56** IF `session_id` ou `model` em `/usage` não é texto não vazio, ou `input`, `output`, `cache_write` ou `cache_read` não é inteiro maior ou igual a zero THEN o broker SHALL responder `missing_field`.
8. **EVT-57** WHEN `POST /usage` recebe `{ id, session_id, model, input, output, cache_write, cache_read }` válido THEN o broker SHALL gravar um evento `usage` com `from_name` do peer, `to_name` nulo e `data` com os seis campos, e responder `{ ok: true, seq }`, inclusive quando os valores repetem o `usage` anterior.
9. **EVT-58** WHEN `POST /turn-started` recebe o `id` de um peer registrado THEN o broker SHALL gravar um evento `turn_started` com `from_name` do peer, `to_name` nulo e `data` `{}`, e responder `{ ok: true, seq }`.
10. **EVT-59** WHERE não há feature aberta the broker SHALL gravar `blocked`, `unblocked`, `usage`, `turn_started`, `permission_request` e `permission_decision` com `feature_id` nulo, sem recusar.

**Independent Test**: sem feature aberta, chamar `/turn-started` e `/usage` e ler os dois eventos com `feature_id` nulo.

---

### P1: Permissão decidida fora do terminal ⭐ MVP

**User Story**: Como dev, quero permitir ou negar pela TUI o pedido de permissão de qualquer sessão.

**Why P1**: Pedido de permissão parado em outro terminal é o primeiro sinal de fracasso do MVP (ADR-011).

**Acceptance Criteria**:

1. **EVT-60** WHEN `POST /permission-request` recebe `{ id, request_id, tool_name, description, input_preview }` de um peer registrado THEN o broker SHALL gravar um evento `permission_request` com `from_name` do peer, `to_name` `human`, `summary` igual aos primeiros 80 caracteres de `<tool_name>: <description>`, `body` igual a `input_preview` e `data` com os quatro campos, e responder `{ ok: true, seq }`.
2. **EVT-61** IF `request_id` ou `tool_name` não é texto não vazio, ou `description` ou `input_preview` não é texto THEN o broker SHALL responder `missing_field`.
3. **EVT-62** WHEN o broker sobe THEN o broker SHALL ler a credencial humana do arquivo em `SQUAD_TOKEN_FILE` (default `<diretório home>/.squad-code-mcp.token`), criando-o com um token aleatório de 32 caracteres ou mais se não existe, e SHALL não incluí-la em nenhuma resposta nem evento.
4. **EVT-63** IF `request_seq` em `/permission-decision` não é inteiro ou `behavior` não é texto THEN o broker SHALL responder `missing_field`; IF `behavior` não é `allow` nem `deny`, ou `request_seq` não é o `seq` de um `permission_request` THEN o broker SHALL responder `invalid_field`.
5. **EVT-64** IF o pedido citado já tem `permission_decision`, ou existe evento de `seq` maior com `from_name` igual ao peer do pedido, ou `peer_left` de `seq` maior desse peer THEN o broker SHALL responder `permission_closed` sem gravar evento.
6. **EVT-65** IF `human_token` em `/permission-decision` está ausente ou é diferente da credencial humana THEN o broker SHALL responder `{ ok: false, error: "invalid_token", hint }` sem gravar evento, antes de qualquer outra recusa.
7. **EVT-66** WHEN `POST /permission-decision` recebe `{ human_token, request_seq, behavior }` com a credencial certa, um pedido aberto e `behavior` `allow` ou `deny` THEN o broker SHALL gravar um evento `permission_decision` com `from_name` `human`, `role_from` `human`, `to_name` igual ao peer do pedido, `summary` igual aos primeiros 80 caracteres de `<behavior>: <tool_name>` e `data` `{ request_seq, behavior }`, e responder `{ ok: true, seq }`.

**Independent Test**: um peer grava um pedido; a decisão com o token do arquivo aparece no polling dele; uma segunda decisão recebe `permission_closed`.

---

### P1: Leitura do log ⭐ MVP

**User Story**: Como TUI ou agente, quero ler o log por cursor, o histórico de um ticket e o que devo.

**Why P1**: A TUI não lê o banco, e uma sessão relançada começa perguntando ao broker o que deve.

**Acceptance Criteria**:

1. **EVT-67** WHEN `GET /events?after=<n>` é chamado THEN o broker SHALL responder `{ events, last_seq }` com todos os eventos de `seq` maior que `n`, de qualquer feature e sem feature, em ordem crescente de `seq` e no formato de leitura, com `n` valendo 0 quando `after` está ausente e `last_seq` igual ao maior `seq` do log, ou 0 com o log vazio.
2. **EVT-68** IF `after` não é um inteiro maior ou igual a zero THEN o broker SHALL responder status 200 com `{ ok: false, error: "invalid_field", hint }`.
3. **EVT-69** WHEN `POST /history` recebe `{ id }` e exatamente um de `ticket_ref`, `question_id` ou `gate_id` THEN o broker SHALL responder `{ events }` em ordem crescente de `seq` e no formato de leitura: com `ticket_ref`, os eventos da feature aberta com aquele `ticket_ref`, ou lista vazia sem feature aberta; com `question_id` ou `gate_id`, os eventos com aquele valor na coluna.
4. **EVT-70** IF `/history` recebe nenhum ou mais de um dos três filtros, `ticket_ref` que não é texto, ou `question_id` ou `gate_id` que não é inteiro THEN o broker SHALL responder `missing_field`.
5. **EVT-71** WHEN `POST /state` recebe o `id` de um peer registrado THEN o broker SHALL responder `{ feature, ticket, owed }` com `feature` nulo sem feature aberta, ou `{ id, title, workflow, branch, base_branch, spec_ref, spec_commit }` da feature aberta.
6. **EVT-72** WHEN quem chama `/state` é um worker com um ticket aberto para si THEN o broker SHALL responder `ticket` `{ ticket_ref, title, task_seq, reworks }`, com `title` do plano vigente, `task_seq` do `task` de maior `seq` do ticket e `reworks` igual ao número de `verdict` de `rework` do ticket; nos outros casos SHALL responder `ticket` nulo.
7. **EVT-73** WHEN um worker tem um ticket aberto para si cujo evento do ticket de maior `seq` é um `task` THEN o broker SHALL incluir em `owed` `{ owes: "result", ticket_ref, seq }` com o `seq` desse `task`.
8. **EVT-74** WHEN quem chama `/state` é o judge THEN o broker SHALL incluir em `owed` um `{ owes: "verdict", ticket_ref, seq }` para cada ticket não descartado cujo evento do ticket de maior `seq` é um `result`, com o `seq` desse `result`.
9. **EVT-75** WHEN quem chama `/state` é o leader THEN o broker SHALL incluir em `owed` um `{ owes: "task", ticket_ref, seq }` para cada ticket não descartado cujo evento do ticket de maior `seq` é um `verdict` de `rework` e que tem menos de três `verdict` de `rework`, com o `seq` desse `verdict`.
10. **EVT-76** WHEN quem chama `/state` é o leader, existe `task` mother → leader na feature aberta e nenhum `plan` nela THEN o broker SHALL incluir em `owed` `{ owes: "plan", seq }` com o `seq` do primeiro desses `task`.
11. **EVT-77** IF um `UPDATE` ou `DELETE` é executado em `events`, por qualquer conexão THEN o banco SHALL abortar o comando com erro e manter a linha como estava.
12. **EVT-78** WHEN o broker sobe de novo sobre o mesmo banco THEN o broker SHALL responder a `/state`, `/poll-messages` e `GET /events` o mesmo que respondia antes de parar, e aplicar as mesmas recusas de estado.
13. **EVT-79** IF a gravação da entrega falha THEN o broker SHALL não gravar o evento.
14. **EVT-80** The broker SHALL incluir em `owed` de qualquer peer um `{ owes: "delivery", seq }` para cada entrega pendente do nome dele, e responder `owed` em ordem crescente de `seq`.

**Independent Test**: gravar três eventos, ler `GET /events?after=1` e receber os dois últimos com `last_seq` 3.

---

### P1: Polling, push e tools no servidor MCP ⭐ MVP

**User Story**: Como sessão do squad, quero que o que me foi enviado chegue ao modelo pelo canal e que minhas tools sejam as do meu papel.

**Why P1**: A sessão ociosa só acorda pelo canal, e a Peer tirou o laço de polling (STATE AD-004).

**Acceptance Criteria**:

1. **EVT-81** WHILE o peer está registrado the servidor MCP SHALL chamar `/poll-messages` com o seu `id` a cada 1 s, ou a cada `SQUAD_POLL_INTERVAL_MS` quando definida, e não chamar antes do registro.
2. **EVT-82** WHEN o polling devolve eventos que não são `permission_decision` THEN o servidor MCP SHALL empurrar um `notifications/claude/channel` por evento, em ordem crescente de `seq`, com `content` contendo `summary`, `body` e o valor de cada campo próprio do kind, e `meta` com `kind`, `seq` e `from` como texto, e `ticket_ref` quando não nulo.
3. **EVT-83** WHEN o push de um evento conclui THEN o servidor MCP SHALL chamar `/ack` com o `seq` dele; IF o push de um evento falha THEN o servidor MCP SHALL não confirmar esse evento nem empurrar os seguintes naquele ciclo.
4. **EVT-84** IF o `/ack` falha depois do push THEN o servidor MCP SHALL confirmar de novo no ciclo seguinte sem empurrar aquele `seq` outra vez no mesmo processo.
5. **EVT-85** WHERE a sessão tem papel the servidor MCP SHALL declarar a capacidade `claude/channel/permission`.
6. **EVT-86** WHEN o servidor MCP registrado recebe `notifications/claude/channel/permission_request` com `request_id`, `tool_name`, `description` e `input_preview` THEN o servidor MCP SHALL chamar `/permission-request` com esses campos e o seu `id`.
7. **EVT-87** WHEN o polling devolve uma `permission_decision` cujo `request_seq` é de um pedido gravado por este processo THEN o servidor MCP SHALL enviar `notifications/claude/channel/permission` com o `request_id` do pedido e o `behavior`, não empurrar `notifications/claude/channel` para ela, e chamar `/ack`.
8. **EVT-88** IF o polling devolve uma `permission_decision` cujo `request_seq` este processo não gravou THEN o servidor MCP SHALL chamar `/ack` sem enviar veredito nem push.
9. **EVT-89** WHEN o peer está registrado THEN o servidor MCP SHALL listar, além de `list_peers`, `state`, `history`, `blocked` e `unblocked`: para `mother`, `send_task`; para `leader`, `plan`, `send_task` e `send_result`; para `worker`, `send_result`; para `judge`, `send_verdict`; e nenhuma outra.
10. **EVT-90** WHEN `send_task`, `send_result` ou `send_verdict` é chamada THEN o servidor MCP SHALL chamar `/send` com o `kind` da tool, o seu `id` e os argumentos recebidos, e devolver o `seq` em texto quando aceito.
11. **EVT-91** IF o broker recusa a chamada de uma tool THEN o servidor MCP SHALL devolver erro com o `error` e o `hint` do broker.
12. **EVT-92** WHEN `plan`, `blocked`, `unblocked`, `state` ou `history` é chamada THEN o servidor MCP SHALL chamar a rota de mesmo nome com o seu `id` e os argumentos recebidos, e devolver em texto o `seq` ou o conteúdo da resposta.

**Independent Test**: dois clientes MCP de teste, `mother` e `leader`, com feature aberta: `mother` chama `send_task` e o `leader` recebe a notificação de canal com o `seq`; o polling seguinte do `leader` vem vazio.

---

## Edge Cases

- WHEN um `task` do mesmo ticket vai para outro worker THEN o broker SHALL aceitar um `task` de outro ticket para o dono anterior (EVT-24).
- WHEN o plano vigente descarta o ticket aberto de um worker THEN o broker SHALL aceitar um `task` de outro ticket para esse worker (EVT-24).
- WHEN um ticket tem dois `verdict` de `rework` THEN o broker SHALL aceitar o `task` seguinte, e SHALL recusar com `rework_limit` o `task` depois do terceiro (EVT-23).
- WHEN outra feature, já fechada, tem um ticket com o mesmo `ticket_ref` THEN o broker SHALL ignorar os eventos dela em toda regra de estado e recusar com `stale_reference` o `result` que cita um `task` dela (EVT-30).
- IF um worker envia `result` de um ticket cujo dono é outro worker THEN o broker SHALL responder `not_owner` (EVT-29).
- IF o judge envia um segundo `verdict` para o mesmo `result` THEN o broker SHALL responder `stale_reference` (EVT-36).
- WHEN um `task` chega depois do `result` e antes do `verdict` THEN o broker SHALL recusar com `stale_reference` o `verdict` daquele `result` (EVT-37).
- IF `/ack` cita o `seq` de uma entrega de outro nome THEN o broker SHALL manter essa entrega pendente (EVT-43).
- WHEN a sessão cai depois do polling e antes do `/ack` THEN o broker SHALL devolver os mesmos eventos à sessão seguinte daquele nome (EVT-42, EVT-45).
- IF uma recusa acontece THEN o broker SHALL aumentar `events` em exatamente uma linha, o `refused`, e não alterar `deliveries` (EVT-47).
- IF o peer do pedido de permissão gravou qualquer evento depois dele, inclusive `turn_started` ou `usage` THEN o broker SHALL responder `permission_closed` à decisão (EVT-64).
- WHEN um `refused` é gravado para o peer depois do pedido de permissão THEN o broker SHALL manter o pedido aberto, porque o `refused` é do broker (EVT-64).
- WHEN `GET /events?after=<n>` recebe `n` maior que o maior `seq` THEN o broker SHALL responder lista vazia e `last_seq` igual ao maior `seq` (EVT-67).
- IF um corpo de `/send` traz `from` com o nome de outro peer THEN o broker SHALL gravar o nome de quem tem o `id` (EVT-02).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| EVT-01 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-02 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-03 | P1: Envio pelas arestas da estrela | Tasks | In Tasks |
| EVT-04 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-05 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-06 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-07 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-08 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-09 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-10 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-11 | P1: Envio pelas arestas da estrela | Tasks | In Tasks |
| EVT-12 | P1: Envio pelas arestas da estrela | Tasks | In Tasks |
| EVT-13 | P1: Envio pelas arestas da estrela | Execute | Implementing |
| EVT-14 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-15 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-16 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-17 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-18 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-19 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-20 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-21 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-22 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-23 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-24 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-25 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-26 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-27 | P1: Plano e ciclo do ticket | Execute | Implementing |
| EVT-28 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-29 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-30 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-31 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-32 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-33 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-34 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-35 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-36 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-37 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-38 | P1: Plano e ciclo do ticket | Tasks | In Tasks |
| EVT-39 | P1: Entrega até o transporte | Execute | Implementing |
| EVT-40 | P1: Entrega até o transporte | Execute | Implementing |
| EVT-41 | P1: Entrega até o transporte | Execute | Implementing |
| EVT-42 | P1: Entrega até o transporte | Execute | Implementing |
| EVT-43 | P1: Entrega até o transporte | Execute | Implementing |
| EVT-44 | P1: Entrega até o transporte | Tasks | In Tasks |
| EVT-45 | P1: Entrega até o transporte | Execute | Implementing |
| EVT-46 | P1: Entrega até o transporte | Execute | Implementing |
| EVT-47 | P1: Recusa com rastro | Execute | Implementing |
| EVT-48 | P1: Recusa com rastro | Execute | Implementing |
| EVT-49 | P1: Recusa com rastro | Tasks | In Tasks |
| EVT-50 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-51 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-52 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-53 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-54 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-55 | P1: Registros da sessão | Execute | Implementing |
| EVT-56 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-57 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-58 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-59 | P1: Registros da sessão | Tasks | In Tasks |
| EVT-60 | P1: Permissão decidida fora do terminal | Tasks | In Tasks |
| EVT-61 | P1: Permissão decidida fora do terminal | Tasks | In Tasks |
| EVT-62 | P1: Permissão decidida fora do terminal | Execute | Implementing |
| EVT-63 | P1: Permissão decidida fora do terminal | Tasks | In Tasks |
| EVT-64 | P1: Permissão decidida fora do terminal | Tasks | In Tasks |
| EVT-65 | P1: Permissão decidida fora do terminal | Tasks | In Tasks |
| EVT-66 | P1: Permissão decidida fora do terminal | Tasks | In Tasks |
| EVT-67 | P1: Leitura do log | Execute | Implementing |
| EVT-68 | P1: Leitura do log | Tasks | In Tasks |
| EVT-69 | P1: Leitura do log | Execute | Implementing |
| EVT-70 | P1: Leitura do log | Tasks | In Tasks |
| EVT-71 | P1: Leitura do log | Tasks | In Tasks |
| EVT-72 | P1: Leitura do log | Tasks | In Tasks |
| EVT-73 | P1: Leitura do log | Execute | Implementing |
| EVT-74 | P1: Leitura do log | Execute | Implementing |
| EVT-75 | P1: Leitura do log | Execute | Implementing |
| EVT-76 | P1: Leitura do log | Execute | Implementing |
| EVT-77 | P1: Leitura do log | Execute | Implementing |
| EVT-78 | P1: Leitura do log | Tasks | In Tasks |
| EVT-79 | P1: Leitura do log | Execute | Implementing |
| EVT-80 | P1: Leitura do log | Execute | Implementing |
| EVT-81 | P1: Polling, push e tools no servidor MCP | Execute | Implementing |
| EVT-82 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-83 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-84 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-85 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-86 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-87 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-88 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-89 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-90 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-91 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |
| EVT-92 | P1: Polling, push e tools no servidor MCP | Tasks | In Tasks |

**Coverage:** 92 total, 92 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Com uma feature aberta, dois clientes MCP de teste trocam `task` e `result` pelo broker, e cada um recebe o evento pelo canal uma vez por processo.
- [ ] Um ticket vai de `plan` a `verdict` de `approve` passando por um `rework`, e cada recusa do caminho aparece no log como `refused`.
- [ ] `GET /events` devolve o log inteiro, e nenhum comando altera ou apaga uma linha de `events`.
- [ ] `bun test` e `bun x tsc --noEmit` passam no Windows e no Linux, ou a spec registra qual dos dois ficou sem rodar.
