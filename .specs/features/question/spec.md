# Question Specification

Fonte: fatia Question de `.design/squad-mvp.md`, ADR-002, ADR-004, ADR-005, ADR-006,
ADR-008, ADR-009 e ADR-010, STATE AD-002, AD-005, AD-006, AD-007, AD-010 e AD-011, o
Handoff de `.specs/STATE.md` e os frames 04, 05, 06, 07, 20a e 20b de
`docs/claude-design-handoff/Handoff-Design.zip` (`Squad TUI.dc.html`). Esta spec deriva da
fatia; onde a fatia não decide, a escolha está em "Assumptions & Open Questions".

## Problem Statement

O contrato tem `question`, `answer` e `question_merged`, a derivação e o feed já os leem,
e nenhuma rota os grava: um agente com dúvida não tem como perguntar, e o dev não tem como
responder. Falta o ciclo de vida da pergunta no broker (perguntar, escalar, mesclar,
responder e expirar, com uma única resolução por pergunta) e a tela em que o dev vê o que
chegou a ele e responde. É a primeira fatia em que a TUI escreve: a resposta do dev vai
com a credencial humana do AD-007.

## Goals

- [x] Um agente pergunta ao nível de cima, o holder responde ou escala, e a pergunta tem exatamente uma resolução: resposta, prazo, `result` do `asked_by` ou encerramento da feature.
- [x] A tabela `questions` e `questions()` de `broker/shared/derive.ts`, aplicada aos eventos da feature, dizem a mesma coisa depois de qualquer sequência de chamadas.
- [x] A aba Perguntas mostra o que espera o dev e o histórico, e o dev responde pelo modal; a TUI não faz nenhum outro `POST`.
- [x] Os frames 04, 05, 06, 07, 20a e 20b são casos do teste de frames, sem edição dos arquivos extraídos e sem desvio de classe D3 por "fatia Question".
- [x] A suíte passa no Windows e no Linux; no Linux, com a instabilidade de tempo em testes de integração anteriores à fatia que os critérios de sucesso descrevem.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Quando perguntar, escalar ou responder; a redação da pergunta de credencial ("coloque no lugar e confirme") | Regra das skills de papel, fatia Papéis. O broker não lê o texto |
| Modal de gate e de permissão, teclas `g` e `x` | Fatia Gate; seguem com o aviso de TUI-63 |
| Pergunta de cima para baixo e `verdict` entregue ao dono do ticket | Decidido no design: o contrato não muda |
| Conferir se o worker de `judge → worker` é o dono do `ticket_ref` | A fatia só lista a aresta; "pergunta ao worker dono" é regra da skill |
| Conferir `ticket_ref` de uma pergunta contra o `plan` | A fatia não lista a recusa; o campo é opcional e só casa perguntas com o `result` |
| Reabrir, corrigir ou apagar uma resposta | Resolução única (ADR-005); `events` é append-only |
| Aba Perguntas com o histórico de uma feature já fechada | `squad.questions` é da feature aberta; sem feature a aba fica vazia |
| Cursor dentro do campo de texto, seleção e colagem delimitada | O protótipo só acrescenta no fim, apaga o último e limpa |
| Bloco "resolver em" e a linha `b responder Q-09` no detalhe de um `blocked` (frame 10) | Prosa do cenário; o desvio D2 da TUI leitura continua |
| Linha de sistema no feed para pergunta fechada pelo encerramento da feature | Nenhum evento novo: o `feature_closed` já tem a sua linha |
| Corrigir logs de frames de leitura que têm dois `answer` para a mesma pergunta (Q-13 em 25b) | São da TUI leitura; a derivação lê só o primeiro |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| **Perguntas abertas no encerramento da feature** (pergunta ao dev) | O `feature_closed` encerra as perguntas da feature, em `delivered` e em `abandoned`, sem evento novo. Na tabela, `defaulted` se a pergunta tem default, senão o status novo `discarded`. A derivação trata pergunta de feature fechada como fechada | O design só diz "resolvidas pelo default ou descartadas" e não dá evento nem status. O `feature_closed` já é entregue a todos; o envelope do ADR-004 não muda. Respondido pelo dev em 2026-10-10 | y |
| **Texto de uma pergunta escalada** (pergunta ao dev) | Texto, `why`, `options` e `default` vêm do primeiro `question`; o texto é o `body`, ou o `summary` se o `body` é vazio. O que quem escala escreve em `summary` e `body` aparece no feed e no thread | É a regra que a derivação já usa para `asked_by`, `blocking` e `default`; a Q-09 do frame 20a tem 86 caracteres e não cabe num `summary`. Respondido pelo dev em 2026-10-10 | y |
| Arestas de `/ask` | Por papel: worker → leader, judge → worker (qualquer worker), judge → leader, leader → mother, mother → `human` | Tabela de kinds do design | y |
| Destino de `/escalate` | O nível de cima do holder: worker → `leader`, leader → `mother`, mother → `human`. A rota não recebe `to` | "O roteamento é sempre pela mother, sem atalho" | y |
| O que o `question` de uma escalação carrega | `asked_by`, `blocking`, `why`, `options`, `default`, `timeout_s` e `ticket_ref` copiados do primeiro `question`; `summary` e `body` os enviados, ou os do `question` anterior | "Novo `question` com o mesmo id e novo `to`"; a TUI lê `timeout_s` do `question` que chega a `human` (pendência da TUI leitura) e o holder recebe a pergunta inteira na entrega | y |
| `timeout_s` ausente | O evento e a tabela guardam só o que foi enviado; o prazo usa 240 | "Ausente, vale 240" | y |
| `default` em pergunta bloqueante | Aceito e guardado quando é texto não vazio; só é usado no encerramento da feature. Vazio é `missing_field`, como na não-bloqueante | A fatia o torna obrigatório na não-bloqueante e não o proíbe na outra | y |
| Pergunta inexistente | `invalid_field`, sem código novo | AD-005: campo presente, do tipo certo e com valor não permitido; é o que `/permission-decision` faz com um `request_seq` que não é pedido | y |
| Responder ou escalar uma pergunta mesclada | `question_closed`: só a de destino é respondida | "A mesclada sai da lista e segue a sorte da outra" | y |
| Quem pode ser mesclado | Duas perguntas `open` da feature aberta, diferentes, com o mesmo `blocking`, quem quer que seja o holder de cada uma. Uma pergunta já mesclada não é origem nem destino | A fatia só restringe o `blocking`; "sai da lista" supõe que a mesclada podia já estar com o dev. Sem destino mesclado não há ciclo | y |
| Quem recebe um `answer` | O `asked_by`, os `asked_by` das perguntas mescladas nela, direta ou indiretamente, e a mother quando quem responde é o dev; nunca quem escreveu o `answer`, e cada nome uma vez | Fatia: "entregue ao `asked_by`, aos `asked_by` das mescladas e à mother". Um `answer` de default também é entregue: o diagrama de sequência entrega os dois | y |
| `summary` e `body` de um `answer` | `summary` é `Q-<id com dois dígitos>: <resposta>` cortado em 80; `body` é a resposta inteira | A rota não recebe `summary`, e o kind é de mensagem; é o texto dos logs dos frames | y |
| Resposta vazia | `answer` precisa ter ao menos um caractere que não seja espaço; é gravado como chegou | "Rejeitar ou comentar sem texto" do Gate recusa do mesmo jeito | y |
| Quais perguntas o `result` fecha | As não-bloqueantes com `asked_by` igual a quem envia e `ticket_ref` igual ao do `result`, em `open` ou `merged`. Bloqueante, de outro ticket ou sem `ticket_ref` continua aberta | ADR-005: "o `result` do próprio agente para aquele ticket" | y |
| Ordem dos eventos de um `result` | O `result`, o `unblocked` se houver, depois um `answer` por pergunta fechada, em ordem de id | O `unblocked` já vem logo depois do `result` (fatia Event) | y |
| Conferência dos prazos | Ao subir, antes de atender, e a cada 1000 ms | "Um prazo já vencido resolve na subida"; a TUI mostra `0:00` até o `answer` chegar | y |
| Credencial em `/answer` | Corpo com a chave `human_token` segue o caminho do dev, mesmo que traga `id`; sem ela vale o `id` | A rota aceita `id \| human_token`; o dev não é um peer | y |
| Recusa ao dev | Não grava `refused` | O `refused` é de um peer registrado; é o que `/permission-decision` faz | y |
| `attempted_kind` das recusas | `question` em `/ask` e `/escalate`, `answer` em `/answer`, `question_merged` em `/merge-question` | O `refused` guarda o kind tentado, não a rota | y |
| Tools por papel | `ask` para os quatro papéis; `answer` e `escalate` para worker, leader e mother; `merge_question` só para a mother | Fatia Papéis: "só a mother vê mesclar pergunta"; ninguém pergunta ao judge, e ele nunca é holder | y |
| Perguntas da aba | A lista tem as perguntas `open` com holder `human`; o histórico tem toda pergunta da feature aberta que não está `open`, inclusive as que nunca chegaram ao dev | ADR-005 e frame 04 (Q-11, Q-12) | y |
| Ordem da lista | Bloqueantes primeiro, da que chegou ao dev há mais tempo para a mais recente; depois as não-bloqueantes, da que vence antes para a que vence depois | Rodapé do painel: "bloqueantes primeiro · depois por tempo restante" | y |
| Ordem e hora do histórico | A hora é a do `answer` próprio, ou a do `question_merged` enquanto a mesclada não tem `answer` próprio; a mais recente primeiro | Frame 04: Q-12 às 14:31:36, a hora da mescla | y |
| Pergunta mesclada no histórico | Continua `▶ mesclada em Q-<n> pela mother · recebe a mesma resposta` depois que a de destino fecha; se fechou pelo próprio `result`, mostra a linha de default | Frame 20b: a Q-12 continua assim com a Q-07 já respondida | y |
| Linha "efeito" | Montada pela TUI: bloqueante, `<nome> retoma o <ticket>[ (rework n/2)] assim que você confirmar.` (`o trabalho` sem ticket); não-bloqueante, `<nome> troca o default pela sua resposta; nada é refeito.` O efeito escrito à mão da Q-09 (frame 20a) é desvio D2 | Design: "'Ao responder' é montado pela TUI a partir de `asked_by` e `ticket_ref`; não é campo" | y |
| `enter` no feed sobre uma pergunta aberta com o dev | Abre a aba com a pergunta selecionada e o modal por cima; o protótipo abre só a aba e pede outro `enter` | Pedido do dev: "passam a abrir a aba e o modal" | y |
| `b` | De qualquer tela abre a aba com a primeira bloqueante da lista; já na aba, vai à bloqueante seguinte e volta à primeira depois da última | Protótipo e rodapé `b próx. bloqueante`; substitui a leitura de `b` da TUI leitura | y |
| Prazo vence com o modal aberto | Sem envio recusado, o modal fecha na leitura que mostra a pergunta fechada e o texto se perde (design). Com um envio recusado por `question_closed`, o modal fica com o aviso do frame 20b até o `esc` | O design fecha o modal; o frame 20b é "o prazo venceu antes do envio". As duas coisas valem: a recusa só existe depois de um envio | y |
| Opção escolhida e recusada | O modal passa ao estado recusado do frame 20b com o texto da opção no campo | O frame só desenha a recusa no modo texto | y |
| Broker sem responder | Sem modal aberto, `enter` avisa `broker desconectado · responder desabilitado`. Com modal aberto, as teclas não mudam o modal e ele volta com o texto quando o broker responde | Frame 12: "responder, gate e permissão desabilitados"; a tela congelada da TUI leitura continua | y |
| Token do dev | Lido de `SQUAD_TOKEN_FILE` (default `<home>/.squad-code-mcp.token`) a cada envio; nunca desenhado | AD-007; o broker pode criar o arquivo depois de a TUI subir | y |
| Colagem com quebra de linha | Num bloco de entrada com mais de uma tecla, `\r` e `\n` viram espaço e não enviam | A resposta fica gravada e não pode ser apagada: uma colagem não pode enviá-la pela metade | y |
| Logs dos frames novos | 04 a 07 e 20b usam o log do cenário principal e 20a o do cenário de erro, com `body`, `why` e `options` das perguntas como o protótipo os escreve em `QS`. A pergunta do leader respondida pela mother às 14:19:05, que o protótipo deixa fora do histórico, entra: desvio D1 | AD-010: um frame, um log; o mesmo cenário não ganha um log que esconde evento | y |
| Legenda (frame 11) | As quatro linhas de Question (`h`, `modal de resposta` e as duas de teclas) voltam a ser desenhadas e saem da tabela de desvios; as de gate e de permissão continuam D3 | Pendência da TUI leitura | y |
| TUI-63 e a leitura de `b` da TUI leitura | Substituídos por QST-64 a QST-67 para `4`, `enter` e `b`; `g` e `x` continuam como estão | Esta fatia entrega a aba | y |

**Open questions:** none - all resolved or logged above. As duas primeiras linhas foram respondidas pelo dev em 2026-10-10.

Implicit-requirement dimensions: validação de entrada → QST-05 a QST-08, QST-15, QST-21,
QST-29, QST-76, QST-78. Falha parcial → QST-12, QST-80, QST-81. Idempotência e repetição →
QST-38 (uma resolução), QST-79 (um envio por vez); entrega repetida já coberta por EVT-42.
Fronteira de autenticação → QST-24, QST-26 a QST-29, QST-52, QST-83. Limite de taxa → N/A
porque o broker só escuta em `127.0.0.1` para seis sessões e uma TUI. Concorrência e ordem
→ QST-36, QST-38, QST-41, QST-79; corrida entre handlers N/A porque são síncronos num
processo único, e a conferência de prazos roda no mesmo laço. Ciclo de vida do dado →
QST-43 a QST-45 (nada é apagado; o encerramento fecha). Observabilidade → QST-09, QST-77,
QST-80, QST-81. Falha de dependência externa → QST-81, QST-83, QST-84. Integridade de
transição → QST-16, QST-22, QST-31, QST-37, QST-38, QST-46, QST-47.

---

## Definições

Valem as das specs da Event, da Feature e da TUI leitura. Mais:

- **Pergunta aberta**: linha de `questions` com `status` `open`. Na derivação, pergunta com `question`, sem `answer` próprio, sem `question_merged` que a mescle e de feature sem `feature_closed`.
- **Holder**: o `to` do `question` mais recente da pergunta.
- **Nível de cima**: `leader` para um worker, `mother` para o leader, `human` para a mother.
- **Chegar ao dev**: o primeiro `question` da pergunta com `to` `human`. O `ts` desse evento é a chegada.
- **Prazo**: para uma não-bloqueante que chegou ao dev, a chegada mais `timeout_s` segundos, ou mais 240 sem `timeout_s`. Uma bloqueante não tem prazo.
- **Mescladas de uma pergunta**: as perguntas em `merged` cujo `merged_into` leva a ela, direto ou por outra mesclada.
- **Texto da pergunta**: o `body` do primeiro `question`, ou o `summary` dele quando o `body` é vazio.
- **Rótulo `Q-NN`**: `Q-` e o id com dois dígitos, zero à esquerda; acima de 99 o número inteiro.
- **Rotas com credencial**: as da Feature mais `/ask`, `/escalate` e `/merge-question`. `/answer` aceita a credencial de um peer ou a humana.

---

## User Stories

### P1: Perguntar ao nível de cima ⭐ MVP

**User Story**: Como agente, quero perguntar ao nível de cima com um id que a pergunta mantém até o fim, para não decidir sozinho o que a spec não define.

**Why P1**: É a origem de todo o ciclo; sem ela nenhuma outra rota tem o que tratar.

**Acceptance Criteria**:

1. **QST-01** WHEN `POST /ask` recebe `{ id, to, summary, body?, why, blocking, options?, default?, timeout_s?, ticket_ref? }` válido, por uma aresta permitida e com feature aberta THEN o broker SHALL gravar uma linha em `questions` com `id` igual ao maior id da tabela mais um (1 na tabela vazia), `feature_id` da feature aberta, `ticket_ref`, `asked_by` igual ao nome de quem chama, `holder` igual a `to`, `blocking`, `default_answer`, `timeout_s` como enviado ou nulo, `status` `open`, `merged_into` e `answer_seq` nulos, e responder `{ ok: true, question_id, seq }`.
2. **QST-02** WHEN o broker grava a linha de QST-01 THEN o broker SHALL gravar na mesma transação um evento `question` com `from_name` e `role_from` de quem chama, `to_name` igual a `to`, o `summary`, o `body` (vazio se ausente), o `ticket_ref`, a coluna `question_id` igual ao id e `data` só com `question_id`, `asked_by`, `blocking`, `why` e, quando enviados, `options`, `default` e `timeout_s`.
3. **QST-03** WHEN o `to` de um `question` gravado é o nome de um peer THEN o broker SHALL gravar na mesma transação uma entrega pendente para esse nome; WHEN é `human` THEN o broker SHALL não gravar entrega alguma.
4. **QST-04** WHEN `/ask` grava uma pergunta não-bloqueante com `to` `human` THEN o broker SHALL gravar `deadline_ts` igual ao `ts` do evento mais `timeout_s` vezes 1000, ou mais 240000 sem `timeout_s`; em qualquer outro caso de `/ask` `deadline_ts` SHALL ficar nulo.
5. **QST-05** IF `to` ou `summary` está ausente ou não é texto, `summary` é vazio, `why` está ausente, não é texto ou é vazio, `blocking` não é booleano, `body` está presente e não é texto, `options` está presente e não é lista de textos, `default` está presente e não é texto não vazio, `timeout_s` está presente e não é inteiro, `ticket_ref` está presente e não é texto não vazio, ou `blocking` é falso e `default` está ausente THEN o broker SHALL responder `missing_field`.
6. **QST-06** IF `summary` tem mais de 80 caracteres, `options` é lista vazia ou tem um texto vazio, `timeout_s` é menor que 1, ou `timeout_s` vem com `blocking` verdadeiro THEN o broker SHALL responder `invalid_field`.
7. **QST-07** IF `options` tem mais de 3 itens THEN o broker SHALL responder `too_many_options`; com exatamente 3 a pergunta SHALL ser aceita.
8. **QST-08** IF `to` não é um dos seis nomes do squad nem `human` THEN o broker SHALL responder `unknown_recipient`; IF o par papel de quem chama e destino não é worker → leader, judge → worker, judge → leader, leader → mother ou mother → `human` THEN o broker SHALL responder `edge_not_allowed`; IF não há feature aberta THEN o broker SHALL responder `no_open_feature`.
9. **QST-09** IF `/ask`, `/escalate`, `/merge-question` ou `/answer` com `id` recusa um peer registrado THEN o broker SHALL gravar um `refused` com `peer` igual ao nome, `attempted_kind` `question`, `question`, `question_merged` ou `answer`, nessa ordem de rotas, e o `error` da recusa, e não gravar nenhuma linha em `questions`, nenhum outro evento e nenhuma entrega.
10. **QST-10** IF `/ask` falha em mais de uma regra THEN o broker SHALL responder a primeira nesta ordem: `unknown_peer`, `missing_field`, `invalid_field`, `too_many_options`, `unknown_recipient`, `edge_not_allowed`, `no_open_feature`.
11. **QST-11** WHEN `POST /send` recebe `kind` `question`, `answer` ou `question_merged` THEN o broker SHALL responder `invalid_kind` com um `hint` que nomeia `/ask`, `/answer` ou `/merge-question`, na mesma ordem.
12. **QST-12** IF a gravação da linha de `questions`, do evento ou de uma entrega falha em qualquer rota desta fatia THEN o broker SHALL não gravar nenhum dos três.

**Independent Test**: com uma feature aberta, o worker chama `/ask` para o leader; `GET /events` mostra o `question`, a tabela tem a linha `open` e o leader recebe a entrega no polling.

---

### P1: Escalar ⭐ MVP

**User Story**: Como holder que não sabe responder, quero passar a pergunta ao nível de cima com o mesmo id, para que a rota até o dev fique no log.

**Why P1**: É o que leva uma pergunta ao dev e o que liga o prazo.

**Acceptance Criteria**:

1. **QST-13** WHEN `POST /escalate` recebe `{ id, question_id, summary?, body? }` do holder de uma pergunta aberta THEN o broker SHALL gravar um evento `question` com o mesmo `question_id` na coluna e em `data`, `from_name` e `role_from` de quem chama, `to_name` igual ao nível de cima de quem chama, o `ticket_ref` da pergunta e, em `data`, `asked_by`, `blocking`, `why`, `options`, `default` e `timeout_s` iguais aos do primeiro `question` da pergunta, atualizar `holder` para o novo `to` e responder `{ ok: true, seq }`.
2. **QST-14** WHEN `/escalate` não recebe `summary` THEN o evento SHALL levar o `summary` do `question` mais recente da pergunta; WHEN não recebe `body` THEN o evento SHALL levar o `body` desse mesmo `question`; o que for enviado SHALL ser gravado no lugar.
3. **QST-15** IF `question_id` não é inteiro, `summary` está presente e não é texto não vazio, ou `body` está presente e não é texto THEN o broker SHALL responder `missing_field`; IF `summary` tem mais de 80 caracteres ou nenhuma linha de `questions` tem o `question_id` THEN o broker SHALL responder `invalid_field`.
4. **QST-16** IF a pergunta de `/escalate` não está `open` THEN o broker SHALL responder `question_closed`; IF está `open` e quem chama não é o holder THEN o broker SHALL responder `not_holder`; a ordem das recusas SHALL ser `unknown_peer`, `missing_field`, `invalid_field`, `question_closed`, `not_holder`.
5. **QST-17** WHEN a mother escala THEN o `to_name` SHALL ser `human` e nenhuma entrega SHALL ser gravada; WHEN o worker ou o leader escala THEN o broker SHALL gravar a entrega pendente para `leader` ou `mother`.
6. **QST-18** WHEN uma pergunta não-bloqueante chega ao dev por `/escalate` THEN o broker SHALL gravar `deadline_ts` igual ao `ts` desse evento mais `timeout_s` vezes 1000, ou mais 240000 sem `timeout_s`; WHEN a pergunta é bloqueante THEN `deadline_ts` SHALL ficar nulo.
7. **QST-19** WHILE uma pergunta não-bloqueante está com um holder que não é `human` the broker SHALL manter `deadline_ts` nulo e não fechá-la por prazo.

**Independent Test**: worker pergunta, leader escala, mother escala; o log tem três `question` com o mesmo id e `to` `leader`, `mother`, `human`, e `deadline_ts` só aparece no terceiro.

---

### P1: Responder como holder ⭐ MVP

**User Story**: Como holder que sabe responder, quero responder direto a quem perguntou, para que a dúvida não suba.

**Why P1**: É a resolução mais comum, e o caminho do judge ao worker.

**Acceptance Criteria**:

1. **QST-20** WHEN `POST /answer` recebe `{ id, question_id, answer }` do holder de uma pergunta aberta THEN o broker SHALL gravar um evento `answer` com `from_name` e `role_from` de quem chama, `to_name` igual ao `asked_by`, `summary` igual a `Q-NN: ` mais a resposta, cortado em 80 caracteres, `body` igual à resposta, o `ticket_ref` da pergunta, a coluna `question_id` e `data` com `question_id`, `answer` e `resolved_by` `agent`, pôr a linha em `answered` com `answer_seq` igual ao `seq`, e responder `{ ok: true, seq }`.
2. **QST-21** IF `question_id` não é inteiro, ou `answer` está ausente, não é texto ou não tem caractere que não seja espaço THEN o broker SHALL responder `missing_field`; IF nenhuma linha de `questions` tem o `question_id` THEN o broker SHALL responder `invalid_field`.
3. **QST-22** IF a pergunta de `/answer` não está `open` THEN o broker SHALL responder `question_closed`; IF está `open` e quem responde não é o holder THEN o broker SHALL responder `not_holder`; a ordem das recusas SHALL ser `unknown_peer` ou `invalid_token`, `missing_field`, `invalid_field`, `question_closed`, `not_holder`.
4. **QST-23** WHEN o broker grava um `answer` THEN o broker SHALL gravar na mesma transação uma entrega pendente para o `asked_by` e para o `asked_by` de cada mesclada da pergunta, uma por nome, e nenhuma para quem escreveu o `answer`.

**Independent Test**: o judge pergunta ao worker-2 e o worker-2 responde; o log tem `answer` de `worker-2` para `judge` com `resolved_by` `agent`, e a pergunta nunca tem `question` para `human`.

---

### P1: Responder como dev ⭐ MVP

**User Story**: Como dev, quero que só a minha credencial escreva como `human`, para que a resposta que o agente recebe seja minha.

**Why P1**: É a primeira escrita com a credencial humana fora do pedido de permissão.

**Acceptance Criteria**:

1. **QST-24** WHEN `POST /answer` recebe `{ human_token, question_id, answer }` com a credencial humana, para uma pergunta aberta cujo holder é `human` THEN o broker SHALL gravar o `answer` de QST-20 com `from_name` `human`, `role_from` `human` e `resolved_by` `human`, pôr a linha em `answered` e responder `{ ok: true, seq }`.
2. **QST-25** WHEN o dev responde THEN o broker SHALL gravar entrega pendente para o `asked_by`, para o `asked_by` de cada mesclada e para `mother`, uma por nome.
3. **QST-26** IF o corpo de `/answer` tem a chave `human_token` e o valor não é a credencial humana THEN o broker SHALL responder `invalid_token`, antes de qualquer outra regra e mesmo que o corpo traga um `id` registrado.
4. **QST-27** IF o dev responde uma pergunta aberta cujo holder não é `human` THEN o broker SHALL responder `not_holder`.
5. **QST-28** IF `/answer` recusa um corpo com `human_token` THEN o broker SHALL não gravar `refused` nem qualquer outro evento; IF o corpo não tem `human_token` e o `id` não é de um peer registrado THEN o broker SHALL responder `unknown_peer`.

**Independent Test**: com a pergunta no dev, `/answer` com o token do arquivo grava `human → worker-1 [answer]`; com outro token responde `invalid_token` e o log não muda.

---

### P1: Mesclar ⭐ MVP

**User Story**: Como mother, quero mesclar uma pergunta em outra que pede a mesma coisa, para que o dev responda uma vez.

**Why P1**: É a deduplicação que a mother faz antes de levar ao dev.

**Acceptance Criteria**:

1. **QST-29** IF quem chama `/merge-question` não é a mother THEN o broker SHALL responder `edge_not_allowed`; IF `question_id` ou `into` não é inteiro THEN `missing_field`; IF os dois são iguais ou algum não é id de uma linha de `questions` THEN `invalid_field`; IF alguma das duas não está `open` THEN `question_closed`; IF as duas têm `blocking` diferente THEN `merge_not_allowed`; a ordem das recusas SHALL ser essa, depois de `unknown_peer`.
2. **QST-30** WHEN `POST /merge-question` recebe `{ id, question_id, into }` da mother com duas perguntas `open` de mesmo `blocking` THEN o broker SHALL gravar um evento `question_merged` com `from_name` `mother`, `to_name` nulo, o `ticket_ref` da pergunta mesclada, a coluna `question_id` igual a `question_id` e `data` com `question_id` e `into`, pôr a linha mesclada em `merged` com `merged_into` igual a `into`, não gravar entrega e responder `{ ok: true, seq }`.
3. **QST-31** WHEN a pergunta de destino recebe um `answer` THEN o broker SHALL pôr cada mesclada dela no mesmo status da de destino (`answered` ou `defaulted`) com o mesmo `answer_seq`, na mesma transação.
4. **QST-32** WHILE uma pergunta está `merged` the broker SHALL não fechá-la pelo próprio prazo.

**Independent Test**: a mother mescla a pergunta do leader na do worker-1; o dev responde a do worker-1; `worker-1`, `leader` e `mother` recebem o mesmo `answer`, e as duas linhas ficam `answered` com o mesmo `answer_seq`.

---

### P1: Prazo, default e resolução única ⭐ MVP

**User Story**: Como agente que seguiu com o default, quero que a pergunta feche sozinha, para que ninguém responda o que já não muda nada.

**Why P1**: É a regra que impede o squad de parar por dúvida com default razoável (ADR-005).

**Acceptance Criteria**:

1. **QST-33** WHEN o relógio do broker alcança o `deadline_ts` de uma pergunta `open` THEN o broker SHALL gravar um `answer` com `from_name` `broker`, `role_from` `broker`, `to_name` igual ao `asked_by`, `answer` igual ao `default_answer`, `resolved_by` `timeout_default`, `summary` e `body` como em QST-20, pôr a linha em `defaulted` com `answer_seq`, e gravar as entregas de QST-23.
2. **QST-34** The broker SHALL conferir os prazos ao subir, antes de atender a primeira requisição, e depois a cada 1000 ms, o default de `SQUAD_EXPIRE_INTERVAL_MS`.
3. **QST-35** WHEN o broker sobe sobre um banco com pergunta `open` de `deadline_ts` já vencido THEN o broker SHALL fechá-la como em QST-33 nessa subida; uma pergunta de prazo ainda não vencido SHALL fechar no `deadline_ts` gravado, não num prazo recontado.
4. **QST-36** WHEN `/send` grava o `result` de um worker para o judge com `ticket_ref` T THEN o broker SHALL gravar na mesma transação, depois do `result` e do `unblocked` se houver, um `answer` de `broker` com o `default_answer` e `resolved_by` `result_default` para cada pergunta não-bloqueante com `asked_by` igual a quem envia, `ticket_ref` igual a T e `status` `open` ou `merged`, em ordem crescente de id, e pôr cada uma em `defaulted`.
5. **QST-37** WHEN o `result` fecha uma pergunta `merged` THEN o broker SHALL fechar ela e as mescladas dela (QST-31), sem mudar a pergunta de destino; depois disso o `answer` da de destino SHALL não ser entregue ao `asked_by` dela por causa dessa mescla nem mudar a sua linha.
6. **QST-38** The broker SHALL gravar no máximo um `answer` por `question_id`: a leitura do `status` e a gravação acontecem na mesma transação, e quem chega depois recebe `question_closed`.
7. **QST-39** IF o `result` é de um worker com pergunta bloqueante aberta do mesmo ticket, com não-bloqueante de outro ticket ou sem `ticket_ref`, ou é o `result` do leader para a mother THEN o broker SHALL não fechar essas perguntas.
8. **QST-40** WHILE uma pergunta bloqueante está aberta the broker SHALL mantê-la `open` sem prazo, qualquer que seja o tempo passado.
9. **QST-41** WHEN o prazo de uma pergunta e a resposta do dev a ela chegam no mesmo instante THEN o log SHALL ter exatamente um `answer` daquele `question_id`: o que foi gravado primeiro.

**Independent Test**: uma não-bloqueante com `timeout_s` 1 chega ao dev; dois segundos depois o log tem `answer` de `broker` com `timeout_default`, e um `/answer` do dev recebe `question_closed`.

---

### P1: Encerramento da feature e paridade com o log ⭐ MVP

**User Story**: Como quem lê o log, quero que a tabela `questions` não diga nada que o log não diga, para que a TUI e o broker decidam sobre o mesmo estado.

**Why P1**: A TUI deriva do log e o broker decide pela tabela (ADR-002, ADR-006); se divergem, o dev responde o que o broker já fechou.

**Acceptance Criteria**:

1. **QST-42** WHEN o broker sobe sobre um banco criado pelas fatias anteriores, sem a tabela `questions` THEN o broker SHALL criá-la com as colunas da fatia (`id`, `feature_id`, `ticket_ref`, `asked_by`, `holder`, `blocking`, `default_answer`, `timeout_s`, `deadline_ts`, `status`, `merged_into`, `answer_seq`) e manter as linhas e os eventos que o banco já tinha.
2. **QST-43** WHEN `/close-feature` fecha a feature, com `delivered` ou `abandoned` THEN o broker SHALL pôr, na mesma transação, cada pergunta `open` ou `merged` da feature em `defaulted` se `default_answer` não é nulo, senão em `discarded`, com `answer_seq` nulo, sem gravar `answer`.
3. **QST-44** WHEN uma pergunta foi fechada por QST-43 THEN `/answer`, `/escalate` e `/merge-question` sobre ela SHALL responder `question_closed`, e a conferência de prazos SHALL não gravar `answer` para ela.
4. **QST-45** The broker SHALL nunca apagar uma linha de `questions`.
5. **QST-46** The função `questions(eventos)` SHALL dar a cada pergunta um `status`, pela primeira regra que valer: `answered` com `answer` próprio de `resolved_by` `human` ou `agent`; `defaulted` com `answer` próprio de `timeout_default` ou `result_default`; para a mesclada sem `answer` próprio, o status e o `answer_seq` da pergunta de destino quando a de destino tem `answer`, próprio ou herdado de outra mescla; `defaulted` se a própria pergunta tem default, ou `discarded` se não tem, quando os eventos têm o `feature_closed` da feature; `merged` se foi mesclada; `open`.
6. **QST-47** The função `questions(eventos)` SHALL dar a cada pergunta `open` falso sempre que o `status` não é `open`.
7. **QST-48** WHEN qualquer sequência de chamadas aceitas e recusadas desta fatia, de `/send` e de `/close-feature` termina THEN, para cada feature, `questions()` aplicada aos eventos daquela feature SHALL dar, para cada linha de `questions` da feature e só para elas, os mesmos `id`, `asked_by`, `holder`, `blocking`, `ticket_ref`, `default_answer`, `status`, `merged_into`, `deadline_ts` e `answer_seq`.
8. **QST-49** The função `questions(eventos)` SHALL dar a cada pergunta o texto, o `why`, as `options` e o `default` do primeiro `question`, o `timeout_s` e a chegada do primeiro `question` com `to` `human`, a hora e o autor do `answer` que a resolveu, a hora do `question_merged` que a mesclou e os ids das perguntas mescladas nela.
9. **QST-50** WHEN `POST /history` recebe `question_id` THEN o broker SHALL devolver todo `question`, `answer` e `question_merged` daquela pergunta, em ordem de `seq`.

**Independent Test**: um teste gera sequências de chamadas, lê `GET /events` e a tabela, e compara linha a linha.

---

### P1: O que o agente vê ⭐ MVP

**User Story**: Como sessão de um papel, quero as tools de pergunta do meu papel e a lista do que devo responder, para retomar depois de relançada.

**Why P1**: Sem as tools a rota não é alcançável pelo modelo.

**Acceptance Criteria**:

1. **QST-51** WHEN `POST /state` é chamado por um peer THEN `owed` SHALL ter um item `{ owes: "answer", question_id, seq }` para cada pergunta `open` cujo holder é o peer, com `seq` igual ao do `question` mais recente dela, na ordem de `seq` com os outros itens.
2. **QST-52** The servidor MCP SHALL expor `ask` aos quatro papéis, `answer` e `escalate` a worker, leader e mother, e `merge_question` só à mother; o judge SHALL não ver `answer`, `escalate` nem `merge_question`.
3. **QST-53** WHEN uma sessão chama `ask`, `escalate`, `answer` ou `merge_question` THEN o servidor MCP SHALL chamar `/ask`, `/escalate`, `/answer` ou `/merge-question` com o `id` da sessão e devolver ao modelo a resposta do broker: o `question_id` e o `seq`, ou o `error` e o `hint`.
4. **QST-54** WHEN um `question` ou um `answer` é entregue a uma sessão THEN o push pelo canal SHALL levar o `summary`, o `body` e os campos do kind, com `kind`, `seq` e `from` em `meta`.

**Independent Test**: dois clientes MCP de teste, worker e leader: o worker chama `ask`, o leader recebe o push e chama `answer`, o worker recebe o push do `answer`.

---

### P1: Aba Perguntas ⭐ MVP

**User Story**: Como dev, quero uma aba com o que o squad espera de mim e o que já foi resolvido, para responder na ordem certa.

**Why P1**: É onde a pergunta chega; sem ela o prazo vence sem o dev ver.

**Acceptance Criteria**:

1. **QST-55** WHEN a tela de perguntas é desenhada THEN o painel esquerdo SHALL ter o título `perguntas abertas · <n>`, o selo ` <b> bloqueante ` quando há bloqueante, e as perguntas `open` com holder `human` na ordem: bloqueantes da chegada mais antiga para a mais recente, depois não-bloqueantes do prazo mais próximo para o mais distante; a linha 24 SHALL dizer `bloqueantes primeiro · depois por tempo restante`.
2. **QST-56** WHEN uma pergunta é desenhada na lista THEN SHALL ocupar: uma linha com `▶` se selecionada e o foco está na lista, o rótulo `Q-NN`, `[BLOQUEANTE]` ou `timeout m:ss` com o tempo que falta para o prazo, o rótulo curto e o nome do `asked_by`, o ticket e `há <idade>` desde a chegada; até duas linhas do texto quebrado em 54 colunas; uma linha `opções 1 <a> · 2 <b> · <n+1> texto` cortada em 47 colunas quando a pergunta tem opções ou é bloqueante (`opções 1 texto` sem opções), senão `default <default>  · <nome> segue com ele`; uma linha `rota` com os rótulos curtos da rota e `dev` no fim, seguida de `  · absorveu Q-NN (<papel>)` para cada mesclada; e uma linha vazia.
3. **QST-57** WHEN não há pergunta `open` com holder `human` THEN a lista SHALL mostrar `○ nenhuma pergunta aberta` e `o squad não depende de você agora.`, o painel de detalhe SHALL ter o título `detalhe` e as linhas `nenhuma pergunta aberta` e `os agentes seguem sem depender do dev.`, e o título da lista SHALL dizer `perguntas abertas · 0`.
4. **QST-58** WHEN uma pergunta está selecionada THEN o painel direito SHALL ter o título `Q-NN · detalhe` e, nesta ordem: a linha do rótulo com `[BLOQUEANTE]` ou `timeout m:ss` e, à direita, `no dev há <idade>`; `ticket` com o ticket, o título do plano e ` · rework n/2` quando o ticket tem rework; `thread` com o ticket e `chegou ao dev HH:MM:SS`; `origem` com rótulo e nome do `asked_by` e `(só ele pausa)` ou `(segue com o default)`; `rota`; `dedup` com `absorveu Q-NN (<papel>) · mesclada pela mother` quando há mesclada; um separador; o texto; `por quê` com o `why`; um separador; as opções numeradas e `outra resposta (texto livre)` quando a pergunta tem opções ou é bloqueante, senão `default  <default>  · aplicado em m:ss sem resposta`, com dois espaços depois de `default` como no protótipo; um separador; `efeito`; e `enter responder   b próxima bloqueante`.
5. **QST-59** The linha `efeito` SHALL ser, para uma bloqueante, `<nome> retoma o <ticket> assim que você confirmar.`, com ` (rework n/2)` depois do ticket quando ele tem rework e `o trabalho` no lugar do ticket quando a pergunta não tem `ticket_ref`; e, para uma não-bloqueante, `<nome> troca o default pela sua resposta; nada é refeito.`
6. **QST-60** WHEN a tela de perguntas é desenhada THEN o painel de baixo SHALL ter o título `histórico · <n> resolvidas` com `n` igual ao número de perguntas da feature aberta que não estão `open`, e listá-las da resolução mais recente para a mais antiga, duas linhas cada: a hora da resolução, o rótulo, a rota, o ticket e o texto cortado em 66 colunas; e a linha do desfecho.
7. **QST-61** The linha do desfecho SHALL ser: `✓ respondida pelo dev: <resposta>` para `human`; `✓ respondida por <nome>: <resposta>  · rota curta, não chegou ao dev` para `agent`; `⟳ default aplicado · timeout: <default>` para `timeout_default`; `⟳ default aplicado · <nome do asked_by> entregou o ticket antes da resposta: <default>` para `result_default`; e `▶ mesclada em Q-NN pela mother · recebe a mesma resposta` para a mesclada sem `answer` próprio, antes e depois de a pergunta de destino fechar.
8. **QST-62** WHEN o histórico tem até 5 perguntas THEN a tela SHALL mostrar todas; WHEN tem mais de 5 THEN SHALL mostrar 4 a partir do deslocamento e, na linha seguinte, `+<n> mais antigas · h e j/k para rolar` com `n` igual às que ficam abaixo; sem nenhuma abaixo, essa linha fica vazia.
9. **QST-63** WHEN `h` é pressionada na tela de perguntas THEN o foco SHALL alternar entre a lista e o histórico, e o painel em foco SHALL ter a borda branca e o outro cinza; WHILE o foco está no histórico `j`, `k`, `↓` e `↑` SHALL deslocar o histórico uma pergunta, sem passar do começo nem deixar menos de 4 visíveis; WHILE o foco está na lista SHALL mover a seleção, sem passar da primeira nem da última.
10. **QST-64** WHEN `4` é pressionada sem modal aberto THEN a TUI SHALL mostrar a tela de perguntas, com a aba `4 perguntas` destacada e o rodapé `j/k mover   enter responder   b próx. bloqueante   h histórico   esc voltar   1-4 telas   ? ajuda   q sair`; WHEN `esc` é pressionada nela THEN a TUI SHALL voltar à tela principal.
11. **QST-65** WHEN `b` é pressionada fora da tela de perguntas e há bloqueante `open` com holder `human` THEN a TUI SHALL mostrar a tela de perguntas com a primeira bloqueante da lista selecionada e o foco na lista; WHEN é pressionada na tela de perguntas THEN SHALL selecionar a bloqueante seguinte à selecionada na ordem da lista, voltando à primeira depois da última, e levar o foco à lista; IF não há bloqueante THEN a TUI SHALL avisar `nenhuma bloqueante` por 4 s e não trocar de tela.
12. **QST-66** WHEN `enter` é pressionada na tela principal sobre a linha de um `question` de pergunta `open` com holder `human` THEN a TUI SHALL mostrar a tela de perguntas com essa pergunta selecionada e o modal de resposta aberto; sobre qualquer outra linha `enter` SHALL abrir o thread, como antes.
13. **QST-67** WHEN `enter` é pressionada na tela de perguntas com o foco na lista e uma pergunta selecionada THEN a TUI SHALL abrir o modal dela; com o foco no histórico `enter` SHALL abrir o mesmo modal e levar o foco à lista; IF não há pergunta na lista THEN `enter` SHALL não fazer nada.
14. **QST-68** WHEN a pergunta selecionada deixa de estar na lista THEN a seleção SHALL passar à primeira pergunta da lista; a seleção SHALL acompanhar a pergunta pelo id quando a ordem muda.
15. **QST-69** WHEN a tela de perguntas é desenhada a partir do log do frame 04 THEN as 40 linhas SHALL ser as do frame, a não ser nas linhas declaradas na tabela de desvios com classe D1 ou D2.

**Independent Test**: `bun tui/demo.ts 04` mostra a aba com a Q-07 e a Q-08, o detalhe da selecionada e o histórico.

---

### P1: Modal de resposta ⭐ MVP

**User Story**: Como dev, quero responder escolhendo uma opção ou escrevendo, sabendo que o que eu enviar fica no log, para destravar quem perguntou.

**Why P1**: É a escrita da fatia.

**Acceptance Criteria**:

1. **QST-70** WHEN o modal é aberto THEN SHALL ser desenhado sobre a tela de perguntas escurecida, com o título `? responder Q-NN · BLOQUEANTE` ou `? responder Q-NN · timeout m:ss`, e nesta ordem: `contexto`; `ticket`; `thread` com o ticket, `chegou ao dev HH:MM:SS` e `há <idade>`; `rota` com `você` no fim e, entre parênteses, o que a pergunta absorveu; `por quê`; um separador; `<nome> pergunta` com `[BLOQUEANTE] só <nome> está pausado` ou `não-bloqueante · <nome> segue com o default`; o texto; uma linha vazia; o corpo do modo; um separador; e `efeito`.
2. **QST-71** WHEN a pergunta tem `options` THEN o modal SHALL abrir no modo escolha, com uma linha numerada por opção e, por último, `outra resposta…`, a primeira selecionada, e o rodapé `1-<n+1> escolher   ↑↓ mover   enter confirmar   esc cancelar`; WHEN não tem THEN SHALL abrir no modo texto com o campo vazio.
3. **QST-72** WHILE o modal está no modo escolha um dígito de 1 a n+1 SHALL selecionar a linha daquele número, `↓` e `j` a seguinte, `↑` e `k` a anterior, sem passar da primeira nem da última; `enter` sobre uma opção SHALL enviar o texto dela, e sobre `outra resposta…` SHALL passar ao modo texto com o campo vazio.
4. **QST-73** WHILE o modal está no modo texto the modal SHALL mostrar, para uma não-bloqueante, `default <default>  · aplicado em m:ss se você não responder`; a linha `resposta  (uma linha · ctrl+e expande)` ou `resposta  (expandido · ctrl+e recolhe)`; o campo de 3 linhas, ou de 8 quando expandido, com o texto, o cursor `█` e ` <n> chars ` na borda de baixo; e, logo abaixo do campo, `⚠ a resposta fica gravada no log e não pode ser apagada`, nos dois tamanhos; o rodapé SHALL ser `enter enviar   ctrl+e expandir   ctrl+u limpar   esc cancelar`, com `recolher` quando expandido.
5. **QST-74** WHILE o modal está no modo texto um caractere imprimível SHALL entrar no fim do texto, `backspace` SHALL apagar o último caractere, `ctrl+u` SHALL esvaziar o campo e `ctrl+e` SHALL alternar o tamanho; `q`, os dígitos, `b`, `h`, `g`, `x`, `p`, `t` e `?` SHALL entrar no texto e não fazer o que fazem fora do modal.
6. **QST-75** WHEN o texto não cabe na linha única THEN o campo SHALL mostrar `…` e o fim do texto; WHEN está expandido THEN SHALL quebrar o texto na largura do campo e mostrar as últimas 6 linhas.
7. **QST-76** WHEN `enter` é pressionada no modo texto com ao menos um caractere que não seja espaço THEN a TUI SHALL enviar `POST /answer` com `{ human_token, question_id, answer }`, com `answer` sem os espaços das pontas; IF o campo só tem espaços ou está vazio THEN a TUI SHALL não enviar nada e manter o modal.
8. **QST-77** WHEN o broker responde `{ ok: true }` ao envio THEN a TUI SHALL fechar o modal e avisar `✓ Q-NN respondida` em verde por 4 s.
9. **QST-78** IF um bloco de entrada com mais de uma tecla contém `\r` ou `\n` e, na vez dessa tecla, o modal está no modo texto THEN a TUI SHALL pôr um espaço no lugar dela e não enviar, mesmo que o modal tenha entrado no modo texto por uma tecla anterior do mesmo bloco; IF, na vez dessa tecla, o modal está no modo escolha THEN a TUI SHALL ignorá-la, sem confirmar opção nem enviar: um bloco colado nunca envia uma resposta. Sem modal aberto na vez dela, a tecla faz o que `enter` faz naquela tela, e pode abrir o modal.
10. **QST-79** WHILE um envio espera a resposta do broker the TUI SHALL não fazer outro `POST` e não mudar o modal por tecla alguma.
11. **QST-80** WHEN o broker responde `question_closed` ao envio THEN o modal SHALL ficar no estado recusado: o campo com o texto enviado e a borda vermelha, `default <default>  · aplicado (o prazo venceu)` quando a pergunta é não-bloqueante, a linha `✗ recusada pelo broker: Q-NN já fechada · default aplicado: <default>` (sem a parte do default numa bloqueante) abaixo do aviso fixo, o rodapé `esc fechar`, e só `esc` SHALL fechá-lo.
12. **QST-81** IF o broker responde outra recusa, um status que não é 200, um corpo que não é `{ ok }`, ou não responde em 2000 ms THEN a TUI SHALL manter o modal com o texto e avisar em vermelho por 4 s `✗ resposta não enviada · <erro>`, com o `error` da recusa ou `broker não respondeu`.
13. **QST-82** WHEN uma leitura mostra que a pergunta do modal não está mais `open`, sem envio dela em curso nem recusado, THEN a TUI SHALL fechar o modal, descartar o texto e avisar `⟳ default aplicado` em amarelo quando ela fechou por default, senão `Q-NN fechada`; com um envio em curso o modal SHALL esperar a resposta do broker, que o fecha ou o deixa recusado; e WHEN a pergunta do modal deixa de existir entre as perguntas da feature aberta THEN a TUI SHALL fechar o modal com `Q-NN fechada`, mesmo recusado.
14. **QST-83** WHEN a TUI vai enviar THEN SHALL ler a credencial do arquivo de `SQUAD_TOKEN_FILE`, ou de `<home>/.squad-code-mcp.token` sem a variável, naquele momento; IF o arquivo não existe ou está vazio THEN a TUI SHALL não enviar, manter o modal e avisar `✗ credencial humana não encontrada`; the TUI SHALL nunca desenhar a credencial.
15. **QST-84** WHILE o broker não responde às leituras `enter` sobre uma pergunta, na tela principal ou na de perguntas, SHALL não abrir o modal e deixar o aviso `broker desconectado · responder desabilitado` por 4 s, que só aparece se o broker voltar nesse tempo, porque a tela congelada ocupa a linha 38 com `responder, gate e permissão desabilitados`; um modal já aberto SHALL não mudar por tecla alguma e SHALL voltar a ser desenhado com o seu texto quando o broker responder.
16. **QST-85** WHEN `esc` é pressionada com o modal aberto THEN a TUI SHALL fechá-lo sem enviar, e a tela de perguntas SHALL continuar com a mesma seleção; `ctrl+c` SHALL sair da TUI em qualquer modo.
17. **QST-86** The TUI SHALL fazer `POST` só para `/answer`, e só pelo `enter` do modal.
18. **QST-87** WHEN o modal é desenhado a partir do log e do estado de cada um dos frames 05, 06, 07, 20a e 20b THEN as 40 linhas SHALL ser as do frame, a não ser nas linhas declaradas na tabela de desvios com classe D1 ou D2.

**Independent Test**: com um broker de teste, abrir a Q-08, escrever, `enter`: o log ganha `hum → w2 [answer]` e a pergunta passa ao histórico como `✓ respondida pelo dev`.

---

### P2: Legenda e tabela de desvios

**User Story**: Como quem mantém a TUI, quero que a legenda e a tabela de desvios digam o que a tela faz agora, para que um desvio não esconda uma tela que já existe.

**Why P2**: Não muda o que o dev faz; fecha a pendência do AD-010.

**Acceptance Criteria**:

1. **QST-88** WHEN a legenda é desenhada THEN SHALL ter, onde o frame 11 as tem, as linhas `h           foco no histórico`, `modal de resposta`, `1–4 enter   escolher · enviar · esc cancela` e `ctrl+e · u  expandir o texto · limpar`; as linhas de gate e de permissão SHALL continuar vazias, com o desvio D3.
2. **QST-89** The tabela de desvios SHALL não ter desvio de classe D3 para os frames 04, 05, 06, 07, 20a e 20b, e nenhum desvio cujo motivo seja uma tela ou tecla da fatia Question.
3. **QST-90** The arquivos `broker/test/frames/<id>.txt` dos frames 04, 05, 06, 07, 20a e 20b SHALL ser a saída de `broker/test/frames/extract.ts` sobre `Squad TUI.dc.html`, e os 41 arquivos já existentes SHALL ficar idênticos aos da `main`.
4. **QST-91** WHEN `g` ou `x` é pressionada THEN a TUI SHALL continuar avisando `chega com a fatia Gate`; `4` e `enter` SHALL não avisar `chega com a fatia Question` em nenhum caso.

**Independent Test**: `bun test test/unit/tui-frames.test.ts` desenha os 47 frames.

---

## Edge Cases

- **QST-92** WHEN uma pergunta mesclada em outra é, por sua vez, destino de uma terceira e a pergunta do fim da cadeia recebe um `answer` THEN as três SHALL fechar com o mesmo `answer_seq`, e cada `asked_by` SHALL receber uma entrega.
- **QST-93** WHEN o `asked_by` de uma mesclada é quem escreve o `answer`, ou é a mother numa resposta do dev THEN o broker SHALL gravar uma só entrega por nome e nenhuma para o autor.
- **QST-94** WHEN uma pergunta é feita com `to` de um peer offline THEN o broker SHALL gravá-la, e a entrega SHALL ficar pendente até uma sessão registrar aquele nome.
- **QST-95** WHEN o holder de uma pergunta sai do broker THEN a pergunta SHALL continuar `open` com o mesmo holder.
- **QST-96** IF o texto da pergunta, o `why` ou uma opção não cabe na largura do painel ou do modal THEN a tela SHALL quebrar ou cortar com `…` dentro da caixa, sem escrever fora dela.
- **QST-97** WHEN a lista tem mais perguntas do que cabem nas linhas 3 a 19 THEN a tela SHALL desenhar as que cabem inteiras a partir de uma posição que mantém a selecionada visível.
- **QST-98** WHEN o prazo de uma pergunta já passou e o `answer` ainda não foi lido THEN a lista, o detalhe e o título do modal SHALL mostrar `timeout 0:00`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| QST-01 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-02 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-03 | P1: Perguntar ao nível de cima | T3, T6 | Verified |
| QST-04 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-05 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-06 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-07 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-08 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-09 | P1: Perguntar ao nível de cima | T6, T8 | Verified |
| QST-10 | P1: Perguntar ao nível de cima | T6 | Verified |
| QST-11 | P1: Perguntar ao nível de cima | T15 | Verified |
| QST-12 | P1: Perguntar ao nível de cima | T6, T16 | Verified |
| QST-13 | P1: Escalar | T7 | Verified |
| QST-14 | P1: Escalar | T7 | Verified |
| QST-15 | P1: Escalar | T7 | Verified |
| QST-16 | P1: Escalar | T7 | Verified |
| QST-17 | P1: Escalar | T7 | Verified |
| QST-18 | P1: Escalar | T7 | Verified |
| QST-19 | P1: Escalar | T7, T11 | Verified |
| QST-20 | P1: Responder como holder | T1, T8 | Verified |
| QST-21 | P1: Responder como holder | T8 | Verified |
| QST-22 | P1: Responder como holder | T8 | Verified |
| QST-23 | P1: Responder como holder | T8 | Verified |
| QST-24 | P1: Responder como dev | T9 | Verified |
| QST-25 | P1: Responder como dev | T9 | Verified |
| QST-26 | P1: Responder como dev | T9, T16 | Verified |
| QST-27 | P1: Responder como dev | T9 | Verified |
| QST-28 | P1: Responder como dev | T9, T16 | Verified |
| QST-29 | P1: Mesclar | T10 | Verified |
| QST-30 | P1: Mesclar | T10 | Verified |
| QST-31 | P1: Mesclar | T10 | Verified |
| QST-32 | P1: Mesclar | T10 | Verified |
| QST-33 | P1: Prazo, default e resolução única | T11 | Verified |
| QST-34 | P1: Prazo, default e resolução única | T16 | Verified |
| QST-35 | P1: Prazo, default e resolução única | T11, T16 | Verified |
| QST-36 | P1: Prazo, default e resolução única | T12, T13 | Verified |
| QST-37 | P1: Prazo, default e resolução única | T12 | Verified |
| QST-38 | P1: Prazo, default e resolução única | T8 | Verified |
| QST-39 | P1: Prazo, default e resolução única | T12, T13 | Verified |
| QST-40 | P1: Prazo, default e resolução única | T11 | Verified |
| QST-41 | P1: Prazo, default e resolução única | T11 | Verified |
| QST-42 | P1: Encerramento da feature e paridade com o log | T2 | Verified |
| QST-43 | P1: Encerramento da feature e paridade com o log | T14 | Verified |
| QST-44 | P1: Encerramento da feature e paridade com o log | T14 | Verified |
| QST-45 | P1: Encerramento da feature e paridade com o log | T18 | Verified |
| QST-46 | P1: Encerramento da feature e paridade com o log | T4 | Verified |
| QST-47 | P1: Encerramento da feature e paridade com o log | T4 | Verified |
| QST-48 | P1: Encerramento da feature e paridade com o log | T18 | Verified |
| QST-49 | P1: Encerramento da feature e paridade com o log | T4 | Verified |
| QST-50 | P1: Encerramento da feature e paridade com o log | T3 | Verified |
| QST-51 | P1: O que o agente vê | T5 | Verified |
| QST-52 | P1: O que o agente vê | T17 | Verified |
| QST-53 | P1: O que o agente vê | T17 | Verified |
| QST-54 | P1: O que o agente vê | T17 | Verified |
| QST-55 | P1: Aba Perguntas | T22, T23 | Verified |
| QST-56 | P1: Aba Perguntas | T23 | Verified |
| QST-57 | P1: Aba Perguntas | T23 | Verified |
| QST-58 | P1: Aba Perguntas | T24 | Verified |
| QST-59 | P1: Aba Perguntas | T22, T24 | Verified |
| QST-60 | P1: Aba Perguntas | T22, T25 | Verified |
| QST-61 | P1: Aba Perguntas | T22, T25 | Verified |
| QST-62 | P1: Aba Perguntas | T25 | Verified |
| QST-63 | P1: Aba Perguntas | T25, T31 | Verified |
| QST-64 | P1: Aba Perguntas | T20, T23, T31 | Verified |
| QST-65 | P1: Aba Perguntas | T31 | Verified |
| QST-66 | P1: Aba Perguntas | T31 | Verified |
| QST-67 | P1: Aba Perguntas | T31 | Verified |
| QST-68 | P1: Aba Perguntas | T33 | Verified |
| QST-69 | P1: Aba Perguntas | T21, T26, T37 | Verified |
| QST-70 | P1: Modal de resposta | T27 | Verified |
| QST-71 | P1: Modal de resposta | T27 | Verified |
| QST-72 | P1: Modal de resposta | T32 | Verified |
| QST-73 | P1: Modal de resposta | T28 | Verified |
| QST-74 | P1: Modal de resposta | T32 | Verified |
| QST-75 | P1: Modal de resposta | T28 | Verified |
| QST-76 | P1: Modal de resposta | T32, T35 | Verified |
| QST-77 | P1: Modal de resposta | T33 | Verified |
| QST-78 | P1: Modal de resposta | T32 | Verified |
| QST-79 | P1: Modal de resposta | T32, T35 | Verified |
| QST-80 | P1: Modal de resposta | T29, T33 | Verified |
| QST-81 | P1: Modal de resposta | T33, T34 | Verified |
| QST-82 | P1: Modal de resposta | T33 | Verified |
| QST-83 | P1: Modal de resposta | T35 | Verified |
| QST-84 | P1: Modal de resposta | T33, T35 | Verified |
| QST-85 | P1: Modal de resposta | T32 | Verified |
| QST-86 | P1: Modal de resposta | T34, T35, T38 | Verified |
| QST-87 | P1: Modal de resposta | T21, T30, T37 | Verified |
| QST-88 | P2: Legenda e tabela de desvios | T36 | Verified |
| QST-89 | P2: Legenda e tabela de desvios | T26, T30, T36 | Verified |
| QST-90 | P2: Legenda e tabela de desvios | T19 | Verified |
| QST-91 | P2: Legenda e tabela de desvios | T31, T36 | Verified |
| QST-92 | Edge cases | T10 | Verified |
| QST-93 | Edge cases | T10 | Verified |
| QST-94 | Edge cases | T6 | Verified |
| QST-95 | Edge cases | T7 | Verified |
| QST-96 | Edge cases | T23, T28 | Verified |
| QST-97 | Edge cases | T23 | Verified |
| QST-98 | Edge cases | T22, T28 | Verified |

**Coverage:** 98 total, 98 mapped to tasks, 0 unmapped. Verificados em `2ac91fe`, na terceira rodada do Verifier; relatório em `validation.md`, rodadas de correção em `fix-round-1.md` e `fix-round-2.md`.

---

## Success Criteria

- [x] Três clientes MCP de teste, `worker-1`, `leader` e `mother`, levam uma pergunta do `ask` até `human` por duas escalações, e um `POST /answer` com a credencial humana a devolve ao `worker-1`, sem nenhuma linha escrita em `questions` por fora das rotas.
- [x] Depois de qualquer sequência de chamadas, `questions()` aplicada a `GET /events` devolve as linhas de `questions` (QST-48).
- [x] Nenhum caminho deixa dois `answer` resolverem a mesma pergunta.
- [x] A TUI, sobre um broker de teste, abre a aba, responde uma pergunta por opção e outra por texto, e recebe a recusa de uma já fechada.
- [x] Os 47 frames passam no teste de frames; os 41 anteriores não mudam.
- [x] `bun node_modules/typescript/bin/tsc --noEmit` e `bun test` passam no Windows e no Linux, ou a spec registra qual dos dois ficou sem rodar. Windows 11, Bun 1.4.2, em `2ac91fe`: `tsc` passa; 1270 passam, 3 pulados por condição de plataforma anterior à fatia, zero falham. Linux, contêiner `oven/bun:1.4.2` (kernel 6.18 do WSL2) sobre um clone limpo: `tsc` passa e a suíte inteira passou em 10 de 13 execuções sobre o código final, com 1273 passando e zero pulados. As 3 que falharam caíram cada uma num teste de integração anterior à fatia (`EVT-85` duas vezes, `EVT-89` uma), por tempo esgotado à espera de um broker ou servidor MCP real. A `main` falha do mesmo jeito no mesmo contêiner (`EVT-81`, 1 de 14 repetições de `server-delivery.test.ts` e `server-tools.test.ts`; o HEAD passou 14 de 14): a instabilidade é anterior à fatia e não teve a causa investigada.
