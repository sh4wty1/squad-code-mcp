# Gate Specification

Fonte: fatia Gate de `.design/squad-mvp.md` (Key decision 7), ADR-004, ADR-005, ADR-008,
ADR-010 e ADR-011, STATE AD-005, AD-007, AD-010, AD-012, AD-014, AD-015, AD-019, AD-020 e
AD-021, o Handoff de `.specs/STATE.md`, a seção "O que esta fatia deixa para a Gate" de
`.specs/features/tui-clicavel/spec.md`, e os frames 08, 09b, 16a, 16b, 16c, 17, 18a, 18b,
19a, 19b, 22a a 22h e 29c e 29d de `docs/claude-design-handoff/Handoff-Design.zip`
(`Squad TUI.dc.html`), com `gateModal` e `permModal` do protótipo. Esta spec deriva da
fatia; onde a fatia não decide, a escolha está em "Assumptions & Open Questions".

## Problem Statement

O contrato tem `gate` e `gate_decision`, a derivação conta os gates pendentes e a TUI mostra
o selo, mas nenhuma rota os grava: a mother pede a entrega final ao dev com uma pergunta de
texto livre (AD-020), sem decisão tipada, e `close_feature` aceita `delivered` sem gate. O
pedido de permissão chega à TUI, mas `x` só avisa `chega com a fatia Gate`: o dev decide no
terminal do agente, que é o primeiro sinal de fracasso do MVP. Esta fatia fecha os dois: o
pedido e a decisão de gate no broker, a regra `gate_required`, e os modais de gate e de
permissão na TUI, com teclado e mouse. É a última fatia do MVP.

## Goals

- [ ] A mother pede um gate, o dev aprova, rejeita ou comenta pela TUI com a credencial humana, e o gate tem exatamente uma decisão final.
- [ ] `close_feature` com `delivered` só passa com um gate `delivery` aprovado na feature.
- [ ] O dev decide um pedido de permissão pela TUI, sem ir ao terminal do agente.
- [ ] A tabela `gates` e `gates()` de `broker/shared/derive.ts`, aplicada aos eventos, dizem a mesma coisa depois de qualquer sequência de chamadas.
- [ ] Os frames 08, 16a, 16b, 16c, 17, 18b, 19b, 22a, 22b, 22d, 22e, 22f e 29d são casos do teste de frames, sem edição dos arquivos extraídos; os 47 que já existem continuam passando, e a legenda do frame 11 perde os desvios D3 dos modais.
- [ ] O marco do MVP: uma feature de dois tickets vai do kickoff ao gate aprovado com o dev usando só o terminal da mother e a TUI.
- [ ] A suíte passa no Windows e no Linux, ou a spec registra qual dos dois ficou sem rodar.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| O que exige gate, quando pedir e como executar a ação aprovada | Regra das skills de papel; esta fatia reescreve as duas seções da skill da mother marcadas pelo AD-020, não muda o broker por elas |
| Conferir no broker que o branch da feature está no `commit` do gate | ADR-008: é regra da skill, não do broker |
| Reabrir, corrigir ou apagar uma decisão de gate | Uma decisão final (ADR-008); `events` é append-only |
| Isolamento contra um agente que leia a credencial humana | Key decision 7: limite cooperativo aceito |
| A linha de sistema `✓ P-NN fechado no terminal` no feed e o seu detalhe (frame 22b, legenda do frame 11) | Não há evento que a represente: o pedido fecha por qualquer evento posterior do peer, que tem a linha dele. O modal mostra o fechamento (GAT-71) |
| `enter` numa linha de `gate` ou de `permission_request` do feed abrir o modal | O design só dá `g` e `x`; `enter` continua abrindo o thread |
| A roda do mouse rolar a prévia do comando no modal de permissão | AD-021: com um modal aberto a roda não rola nada; `j`, `k` e `G` rolam |
| Clique em `[a]provar`, `[r]ejeitar`, `[c]omentar`, `[y]`, `[a] permitir` e `[d] negar` dentro da caixa | AD-021: o clique marca e não decide; a decisão sai de um atalho da linha 39 que a nomeia |
| Gate de uma feature já fechada na TUI | `squad.gates` é da feature aberta; sem feature o modal não abre |
| Tokens e custo por gate | O modal mostra o custo da feature, o mesmo do rodapé |
| Conferência em terminal real dos modais novos | Como na TUI clicável: o que só um terminal real mostra fica registrado sem conferir, e a pendência da RT-02 a RT-08 continua em `ROADMAP.md` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Gates pendentes no encerramento da feature | O `feature_closed` encerra os gates pendentes da feature, em `delivered` e em `abandoned`, sem evento novo: a linha de `gates` passa a `rejected` com `decision_seq` nulo, e a derivação trata gate pendente de feature fechada como rejeitado | É o mesmo caso das perguntas, que o Handoff manda tratar pelo AD-012. A fatia diz "gates pendentes rejeitados" no `abandoned` e o diagrama de estados tem `pending → rejected: feature abandoned (broker)`; um gate `action` pendente numa entrega já aprovada fica sem quem o decida | n |
| "Envia `result` com o que foi feito" depois de `approve` | A mother diz o que fez no `body` de `close_feature` quando o gate era a entrega final, e, num gate de ação pedido por um agente, na resposta à pergunta bloqueante dele. Nenhum `result` da mother | O contrato não tem aresta `result` da mother (`EDGES` de `broker/shared/contract.ts`), e o design não reabre o contrato. As duas mensagens já existem e chegam a quem precisa | n |
| Reemissão com outro `scope`, `commit`, `action` ou `effect` | Aceita, com as mesmas regras de um pedido novo (`tickets_open` vale para `delivery`). O gate passa a ser o que o `gate` mais recente dele diz; a linha de `gates` guarda o `scope` e o `commit` dele | O design só diz "reemitindo o gate com o mesmo id". O dev aprova o que o modal mostra, e o modal mostra sempre a versão mais recente (GAT-48) | n |
| Rótulo `G-NN` | `G-` e o id com dois dígitos, zero à esquerda; acima de 99 o número inteiro | É o `gid` que a TUI já usa e o `Q-NN` das perguntas | y |
| Rótulo `P-NN` de um pedido de permissão | `P-` e a ordem do `permission_request` entre todos os `permission_request` do log, a partir de 1, com dois dígitos | O contrato não tem id de pedido além do `seq` e do `request_id` do Claude Code. A ordem reproduz os frames 22a, 22d e 29d; é sequencial por banco, como `Q-NN` | n |
| `summary` e `body` de um `gate_decision` | O broker escreve `summary` `G-NN aprovado`, `G-NN rejeitado: <texto>` ou `G-NN comentado: <texto>`, cortado em 80; `body` é o texto como chegou, vazio sem texto | A rota não recebe `summary` e o kind é de mensagem; `G-01 aprovado` é o texto dos logs dos frames 09b e 09a | n |
| `body`, `diffstat`, `commit` e `ticket_ref` de `/gate` | `body` opcional, texto, vazio quando ausente; `commit`, `diffstat` e `ticket_ref`, quando presentes, texto não vazio, senão `missing_field`; `null` conta como presente com tipo errado | A rota do design lista `body` como a de `/ask`, que o trata como opcional; `missing_field` para opcional vazio é a regra de `/ask` (`default`, `ticket_ref`) | n |
| `text` em `approve` | Aceito e guardado como chegou, também vazio; não é exigido | O design só torna o texto obrigatório em `reject` e `comment` | n |
| Gate inexistente, de outra feature ou de feature fechada | `/gate` com `gate_id` que não é de um gate da feature aberta: `invalid_field`. `/gate-decision` com `gate_id` que não está em `gates`: `invalid_field`; de gate não `pending` (inclusive o de uma feature fechada): `gate_closed` | É o que `/escalate` e `/answer` fazem com uma pergunta inexistente (AD-005) | n |
| Ordem das recusas de `/gate` | `unknown_peer`, `edge_not_allowed`, `missing_field`, `invalid_field` dos campos, `no_open_feature`, `invalid_field` do `gate_id`, `gate_closed`, `tickets_open` | `close_feature` e `merge_question` recusam o papel primeiro; a feature aberta vem antes do que só existe nela | n |
| Ordem das recusas de `/gate-decision` | `invalid_token`, `missing_field`, `invalid_field`, `gate_closed` | É a de `/permission-decision` | n |
| Ordem das recusas de `/close-feature` | `edge_not_allowed`, `no_open_feature`, `missing_field`, `invalid_field`, `gate_required` | `gate_required` é a única regra nova e depende do `outcome` já válido | n |
| `tickets_open` sem `plan` | Aceito: sem `plan` não há ticket em aberto | "ticket do `plan` nem aprovado nem descartado" | n |
| Onde o modal de gate e o de permissão são desenhados | Sobre a tela principal escurecida, como `rGate` e `rPerm` do protótipo: `g` e `x` levam à tela principal antes de abrir | O modal de resposta abre sobre a aba Perguntas pela mesma razão: é a tela do protótipo | n |
| Esc no modo de texto ou de confirmação do gate | Volta ao modo de leitura do mesmo gate e descarta o texto | Rodapé do protótipo: `esc voltar ao gate` | n |
| `a` com a prévia do comando sem o fim à vista | Não faz nada; o modal já diz `a só vale depois de ver o fim da prévia` | `permModal` do protótipo: `locked` é a posição atual da prévia; o frame 22e mostra o rodapé `a permitir (veja o fim)` | n |
| Gate reemitido com o modal no modo de confirmação | O modal volta ao modo de leitura da versão nova; nos modos de texto o texto fica | O dev aprova só o que viu: a confirmação é da versão que estava na tela | n |
| Pedido de permissão fechado com o modal aberto | Fechado por um evento posterior do peer ou pela saída dele: o modal fica no estado "respondido no terminal" (frame 22b) até `esc`. Fechado por uma `permission_decision` que não é deste modal: o modal fecha com o aviso `P-NN decidido` | O frame 22b desenha o primeiro caso; o segundo só acontece com duas TUIs, e o texto do 22b seria falso para ele | n |
| Ticket no modal de permissão | O ticket do agente na feature aberta, com o título do `plan`; `— sem ticket` com feature e sem ticket; `— sem feature aberta` sem feature | `permission_request` não leva `ticket_ref` (`broker/permission.ts`); o frame 29d escreve `— sem feature aberta` | n |
| Conteúdo do modal de gate que o log não tem | Sem fonte, fica de fora com desvio D2: nenhum. O que o protótipo escreve à mão sai do log: `feature` e `perguntas` são agregados da derivação, `resumo` e `o que a mother mudou` são o `body`, `diff stat` é o `diffstat` linha a linha, `~ mudou` compara com o `diffstat` da versão anterior, `judge` sai dos `verdict` | Design: "os agregados do modal são derivados do log" e "o resumo vai no `body`" | n |
| Log do frame 08 e seguintes | O `body` do `gate` G-01 dos logs dos frames passa a ser o resumo do modal; a prosa do protótipo que o detalhe da tela principal mostra atrás do modal vira desvio D2 | O design põe o resumo no `body`; manter a prosa desalinharia a caixa inteira do modal em seis frames | n |
| Marco do MVP | Conferido com sessões reais do Claude Code, como a RS-10 da Papéis: quatro sessões em `haiku` pelo launcher num repositório descartável, o dev simulado digitando só no terminal da mother e decidindo pela TUI num pseudo-terminal. O que não for exercitado fica registrado em `marco-mvp.md` | É a frase do design ("só com o terminal da mother e a TUI") e o que a Papéis fez para RS-10 | n |

**Open questions:** none - all resolved or logged above.

## Definições

Valem as das specs da Event, da Feature, da TUI leitura, da Question e da TUI clicável. Mais:

- **Gate pendente**: linha de `gates` com `status` `pending`. Na derivação, gate com `gate`, sem `gate_decision` de `approve` ou `reject`, e de feature sem `feature_closed`.
- **Versão de um gate**: o número de eventos `gate` com aquele `gate_id`; o `gate` mais recente é a versão atual.
- **Rótulo `G-NN`**: `G-` e o id com dois dígitos, zero à esquerda; acima de 99 o número inteiro.
- **Rótulo `P-NN`**: `P-` e a posição do `permission_request` entre todos os `permission_request` do log, a partir de 1, com dois dígitos.
- **Pedido de permissão aberto**: o de `openPermissions` de `broker/shared/derive.ts` (ADR-011).
- **Fim da prévia à vista**: no modal de permissão, a última linha da prévia está entre as linhas desenhadas.
- **Modal aberto**: o de resposta, o de gate ou o de permissão; só um por vez.
- **Bloco colado**: o da QST-78: um bloco de entrada com mais de uma tecla, ou qualquer bloco entre os marcadores de uma colagem delimitada.

---

## User Stories

### P1: Pedir gate ⭐ MVP

**User Story**: Como mother, quero pedir ao dev a aprovação de uma ação irreversível, com a ação, o efeito e o commit, para executar só o que ele aprovou.

**Why P1**: É a origem de todo gate; sem ela a entrega não fecha.

**Acceptance Criteria**:

1. **GAT-01** WHEN `POST /gate` recebe `{ id, scope, summary, action, effect, body?, commit?, diffstat?, ticket_ref? }` válido, sem `gate_id`, da mother, com feature aberta THEN o broker SHALL gravar uma linha em `gates` com `id` igual ao maior id da tabela mais um (1 na tabela vazia), `feature_id` da feature aberta, `requested_by` `mother`, `scope`, `commit` como enviado ou nulo, `status` `pending`, `request_seq` igual ao `seq` do evento e `decision_seq` nulo, e responder `{ ok: true, gate_id, seq }`.
2. **GAT-02** WHEN o broker grava a linha de GAT-01 THEN o broker SHALL gravar na mesma transação um evento `gate` com `from_name` `mother`, `role_from` `mother`, `to_name` `human`, o `summary`, o `body` (vazio se ausente), o `ticket_ref` (nulo se ausente), a coluna `gate_id` igual ao id, e `data` só com `gate_id`, `scope`, `action`, `effect` e, quando enviados, `commit` e `diffstat`, e não gravar entrega alguma.
3. **GAT-03** IF `scope`, `summary`, `action` ou `effect` está ausente, não é texto ou é vazio, `body` está presente e não é texto, `commit`, `diffstat` ou `ticket_ref` está presente e não é texto não vazio, `gate_id` está presente e não é inteiro, ou `scope` é `delivery` e `commit` está ausente THEN o broker SHALL responder `missing_field`; `null` num campo opcional SHALL contar como presente.
4. **GAT-04** IF `scope` não é `delivery` nem `action`, ou `summary` tem mais de 80 caracteres THEN o broker SHALL responder `invalid_field`; com exatamente 80 o pedido SHALL ser aceito.
5. **GAT-05** IF quem chama não é a mother THEN o broker SHALL responder `edge_not_allowed`; IF não há feature aberta THEN o broker SHALL responder `no_open_feature`.
6. **GAT-06** IF `scope` é `delivery` e o `plan` mais recente da feature aberta tem um ticket nem aprovado nem descartado THEN o broker SHALL responder `tickets_open`, com um `hint` que nomeia esses tickets; sem `plan`, ou com todos aprovados ou descartados, o pedido SHALL ser aceito; com `scope` `action` a regra SHALL não valer.
7. **GAT-07** IF `/gate` falha em mais de uma regra THEN o broker SHALL responder a primeira nesta ordem: `unknown_peer`, `edge_not_allowed`, `missing_field`, `invalid_field` (GAT-04), `no_open_feature`, `invalid_field` (GAT-09), `gate_closed`, `tickets_open`.
8. **GAT-08** IF `/gate` recusa um peer registrado THEN o broker SHALL gravar um `refused` com `peer` igual ao nome, `attempted_kind` `gate` e o `error` da recusa, e não gravar linha em `gates`, nenhum outro evento e nenhuma entrega.
9. **GAT-09** IF `gate_id` é inteiro e não é o id de um gate da feature aberta THEN o broker SHALL responder `invalid_field`.
10. **GAT-10** IF a gravação da linha de `gates`, do evento ou de uma entrega falha em qualquer rota desta fatia THEN o broker SHALL não gravar nenhum deles.
11. **GAT-11** WHEN `POST /send` recebe `kind` `gate` ou `gate_decision` THEN o broker SHALL responder `invalid_kind` com um `hint` que nomeia `/gate` ou `/gate-decision`, nessa ordem.

**Independent Test**: com uma feature aberta e os tickets aprovados, a mother chama `/gate` com `scope` `delivery`; `GET /events` mostra `mot → hum [gate]`, a tabela tem a linha `pending` e a TUI mostra o selo `⚠ gate G-01 pendente · g`.

---

### P1: Reemitir depois do comentário ⭐ MVP

**User Story**: Como mother, quero reemitir o gate comentado com o mesmo id e o conteúdo atualizado, para que o dev decida sobre o que mudou sem abrir outro assunto.

**Why P1**: É a resposta da mother a `comment`, o único caminho que mantém o gate pendente.

**Acceptance Criteria**:

1. **GAT-12** WHEN `POST /gate` recebe um pedido válido com `gate_id` de um gate `pending` da feature aberta THEN o broker SHALL gravar um evento `gate` como em GAT-02 com aquele `gate_id`, atualizar na mesma transação `scope`, `commit` e `request_seq` da linha, e responder `{ ok: true, gate_id, seq }` com o mesmo `gate_id`.
2. **GAT-13** IF `gate_id` é de um gate `approved` ou `rejected` THEN o broker SHALL responder `gate_closed`, com um `hint` que manda pedir um gate novo, e não mudar a linha.
3. **GAT-14** The reemissão SHALL seguir GAT-03 a GAT-06 como um pedido novo: um `delivery` reemitido com ticket em aberto SHALL receber `tickets_open`.

**Independent Test**: depois de um `comment`, a mother chama `/gate` com o mesmo `gate_id`; o modal do dev mostra `versão 2`.

---

### P1: Decidir um gate ⭐ MVP

**User Story**: Como dev, quero aprovar, rejeitar ou comentar um gate com a credencial humana, para que só o que eu aprovei seja executado.

**Why P1**: É a decisão que o MVP pede no fim de toda feature.

**Acceptance Criteria**:

1. **GAT-15** WHEN `POST /gate-decision` recebe `{ human_token, gate_id, decision: "approve", text? }` válido para um gate `pending` THEN o broker SHALL gravar um evento `gate_decision` de `human` (`from_name` e `role_from` `human`) para o `requested_by` do gate, com a coluna `gate_id`, `data` com `gate_id`, `decision` e, quando enviado, `text`, e na mesma transação pôr na linha `status` `approved` e `decision_seq` igual ao `seq` do evento, e responder `{ ok: true, seq }`.
2. **GAT-16** WHEN a `decision` é `reject` com texto válido THEN o broker SHALL gravar como em GAT-15 e pôr na linha `status` `rejected` e `decision_seq` igual ao `seq`.
3. **GAT-17** WHEN a `decision` é `comment` com texto válido THEN o broker SHALL gravar o evento como em GAT-15 e não mudar a linha: o gate SHALL continuar `pending`, com `decision_seq` nulo.
4. **GAT-18** WHEN o broker grava um `gate_decision` THEN SHALL gravar na mesma transação uma entrega pendente para o `requested_by` do gate, nas três decisões.
5. **GAT-19** The broker SHALL escrever no `gate_decision` o `summary` `G-NN aprovado`, `G-NN rejeitado: <text>` ou `G-NN comentado: <text>`, cortado em 80 caracteres, e o `body` igual a `text`, vazio sem `text`.
6. **GAT-20** IF `human_token` não é o conteúdo do arquivo da credencial humana THEN o broker SHALL responder `invalid_token`, sem gravar nada; nenhuma recusa de `/gate-decision` SHALL gravar `refused`.
7. **GAT-21** IF `gate_id` não é inteiro, `decision` não é texto, `text` está presente e não é texto, ou `decision` é `reject` ou `comment` e `text` está ausente ou não tem um caractere que não seja espaço THEN o broker SHALL responder `missing_field`.
8. **GAT-22** IF `decision` não é `approve`, `reject` nem `comment`, ou `gate_id` não é o id de uma linha de `gates` THEN o broker SHALL responder `invalid_field`.
9. **GAT-23** IF o gate não está `pending` THEN o broker SHALL responder `gate_closed`, nas três decisões, sem gravar nada.
10. **GAT-24** IF uma decisão e outra chegam para o mesmo gate pendente THEN SHALL valer a primeira a gravar, e a outra, se é `approve` ou `reject`, SHALL receber `gate_closed`: um gate SHALL ter no máximo um `gate_decision` de `approve` ou `reject`.
11. **GAT-25** IF `/gate-decision` falha em mais de uma regra THEN o broker SHALL responder a primeira nesta ordem: `invalid_token`, `missing_field`, `invalid_field`, `gate_closed`.

**Independent Test**: com um gate pendente, `POST /gate-decision` com `approve` e a credencial humana: a linha fica `approved`, a mother recebe a entrega no polling, e um segundo `approve` recebe `gate_closed`.

---

### P1: Encerrar a feature com o gate ⭐ MVP

**User Story**: Como dev, quero que a feature só feche como entregue depois que eu aprovei a entrega, para que nada chegue ao branch base sem o meu sim.

**Why P1**: É a regra do broker que o ADR-008 manda tornar não vazia.

**Acceptance Criteria**:

1. **GAT-26** IF `/close-feature` recebe `outcome` `delivered` e a feature aberta não tem linha em `gates` com `scope` `delivery` e `status` `approved` THEN o broker SHALL responder `gate_required`, gravar o `refused` com `attempted_kind` `feature_closed`, e não fechar a feature; um gate `action` aprovado SHALL não bastar.
2. **GAT-27** WHEN `/close-feature` recebe `delivered` com um gate `delivery` aprovado na feature, ou `abandoned` com ou sem gate THEN o broker SHALL fechar a feature como antes desta fatia.
3. **GAT-28** WHEN o broker grava um `feature_closed` THEN SHALL pôr, na mesma transação, `status` `rejected` em toda linha de `gates` da feature com `status` `pending`, com `decision_seq` nulo, sem evento novo.
4. **GAT-29** IF `/close-feature` falha em mais de uma regra THEN o broker SHALL responder a primeira nesta ordem: `edge_not_allowed`, `no_open_feature`, `missing_field`, `invalid_field`, `gate_required`.

**Independent Test**: com os tickets aprovados e sem gate, `close_feature` `delivered` recebe `gate_required`; depois de `/gate` e de um `approve`, o mesmo pedido fecha a feature.

---

### P1: Paridade com o log ⭐ MVP

**User Story**: Como quem mantém o broker, quero que o estado de cada gate saia só dos eventos, para que a TUI e o broker nunca discordem.

**Why P1**: Key decision 1: o teste de replay prova que as projeções são reconstruíveis.

**Acceptance Criteria**:

1. **GAT-30** The função `gates(events)` de `broker/shared/derive.ts`, aplicada aos eventos de uma feature, SHALL devolver para cada gate o `id`, `requested_by`, `scope`, `commit`, `status` (`pending`, `approved` ou `rejected`), `request_seq` (o `gate` mais recente) e `decision_seq`, iguais aos da linha de `gates`, depois de qualquer sequência de chamadas de `/gate`, `/gate-decision` e `/close-feature`.
2. **GAT-31** The derivação SHALL dar a cada gate também a `version`, o `summary`, o `body`, `action`, `effect` e `diffstat` da versão atual, o `ts` do primeiro `gate` e o da versão atual, o `diffstat` da versão anterior, o `text` e o `ts` do `comment` mais recente, e o `text` da decisão final.
3. **GAT-32** The derivação SHALL tratar como `rejected` o gate pendente de uma feature com `feature_closed`, sem `decision_seq`.
4. **GAT-33** The `Gate` de `squad()` SHALL continuar com `pending` verdadeiro só para o gate `pending`, e o status do agente, os selos e o rodapé SHALL não mudar para os frames de leitura que já passam.

**Independent Test**: um teste gera sequências de chamadas às rotas desta fatia e compara `gates()` de `GET /events` com as linhas de `gates`.

---

### P1: O que a mother vê ⭐ MVP

**User Story**: Como mother, quero ter a tool de gate e saber o que o dev decidiu, para executar a ação ou mudar o que ele pediu.

**Why P1**: Sem a tool e sem a entrega a mother não fecha a feature.

**Acceptance Criteria**:

1. **GAT-34** The servidor MCP de uma sessão `mother` SHALL listar a tool `gate`, com `scope`, `summary`, `action` e `effect` obrigatórios e `body`, `commit`, `diffstat`, `ticket_ref` e `gate_id` opcionais, que chama `/gate`; nenhum outro papel SHALL vê-la.
2. **GAT-35** The lista de permitidos que o launcher dá à mother SHALL ter `mcp__plugin_squad_squad__gate`, e a de nenhum outro papel SHALL tê-la.
3. **GAT-36** WHEN a mother recebe um `gate_decision` no polling THEN o servidor MCP SHALL empurrá-lo pelo canal como empurra qualquer outro evento e confirmá-lo depois do push.
4. **GAT-37** The skill da mother SHALL não ter mais a linha `<!-- Gate slice: rewrite this section to use the gate -->`, e as seções de ação irreversível e de entrega SHALL mandar pedir um gate com a tool `gate`: `scope` `delivery` com o commit do branch da feature para a entrega final, `scope` `action` para uma ação irreversível sua ou pedida por um agente.
5. **GAT-38** The skill da mother SHALL mandar: depois de `approve`, executar exatamente a `action` do gate, só se o branch da feature ainda está no `commit` dele, senão pedir um gate novo; depois de `reject`, não executar; depois de `comment`, reemitir o gate com o mesmo `gate_id`; e, numa ação pedida por um agente, responder à pergunta bloqueante dele com a decisão, para que ele execute.
6. **GAT-39** The skill da mother SHALL mandar chamar `close_feature` com `delivered` só depois de executar a entrega aprovada, dizendo no `body` o que foi feito, e nenhuma skill de outro papel SHALL citar a tool `gate`.

**Independent Test**: uma sessão de teste da mother lista `gate`; a de um worker não; `skills.test.ts` lê as seções reescritas.

---

### P1: Modal de gate ⭐ MVP

**User Story**: Como dev, quero ver o que a mother pede, com a ação, o efeito, o que a feature fez e o diff, e decidir ali, para não aprovar no escuro.

**Why P1**: É a tela do gate.

**Acceptance Criteria**:

1. **GAT-40** WHEN `g` é pressionada sem modal aberto, com gate pendente e o broker respondendo THEN a TUI SHALL ir à tela principal e abrir o modal de gate no modo de leitura, no gate pendente mais antigo; IF não há gate pendente THEN SHALL avisar `nenhum gate pendente` por 4 s; IF o broker não responde às leituras THEN SHALL avisar `broker desconectado · gate desabilitado` por 4 s e não abrir.
2. **GAT-41** WHEN o modal de gate é desenhado THEN SHALL ser uma caixa de 80 colunas a partir da coluna 20, centrada nas 40 linhas e nunca acima da linha 2, sobre a tela principal escurecida, com o título `⚠ gate G-NN`, mais ` · atualizado` a partir da versão 2, e, com mais de um gate pendente, a etiqueta ` gate <n> de <total> ` na borda de cima.
3. **GAT-42** The modal SHALL ter, de cima para baixo: `<requested_by> pede aprovação antes de uma ação irreversível · HH:MM:SS` com o `ts` do primeiro `gate`, ou, a partir da versão 2, `<requested_by> reemitiu G-NN com conteúdo atualizado · versão <n> · HH:MM:SS` com o `ts` da versão atual; com mais de um gate pendente, `fila      ` e cada gate pendente, do mais antigo ao mais novo, como `▶ <summary>` o deste modal e `  <summary>` os outros, separados por três espaços, e `antigo antes`; uma linha vazia; `ação      <action>`; `efeito    <effect>`; `feature   <n> ticket(s) · <r> rework(s) · <m> min · ≈$<custo> (custo est.)`; e `perguntas ✓ <h> pelo dev · <a> entre agentes  ⟳ <d> default aplicado  ▶ <s> mesclada`.
4. **GAT-43** The linha `feature` SHALL contar os tickets do `plan` mais recente não descartados, os `verdict` de `rework` da feature, os minutos inteiros (para baixo) do `feature_opened` ao primeiro `gate` do gate, e o custo da feature que o rodapé mostra; `ticket` e `rework` SHALL ir ao plural com número diferente de 1.
5. **GAT-44** The linha `perguntas` SHALL contar as perguntas da feature mescladas sem resposta própria em `<s>`, e as outras fechadas por `resolved_by`: `human` em `<h>`, `agent` em `<a>`, `timeout_default` e `result_default` em `<d>`; as abertas SHALL não contar.
6. **GAT-45** WHILE o gate está na versão 1 the modal SHALL ter, depois de um separador, `resumo` e o `body` quebrado em 74 colunas, e sem `body` SHALL não ter essa parte; WHILE está na versão 2 ou mais SHALL ter, depois de um separador, `seu comentário · HH:MM:SS` e o texto do `comment` mais recente entre aspas, quando há um `comment`, e `o que a mother mudou` com o `body` quebrado em 74 colunas.
7. **GAT-46** WHILE o modal está no modo de leitura e o gate tem `diffstat` the modal SHALL ter um separador, `diff stat` e cada linha do `diffstat` como veio, com `   ~ mudou` depois da linha que tem `|`, não está no `diffstat` da versão anterior e cujo texto antes do `|` está numa linha dele; WHILE está no modo de confirmação ou de texto SHALL ter, em lugar disso, `diff      <última linha do diffstat sem os espaços das pontas>`.
8. **GAT-47** WHILE o modal está no modo de leitura e o gate é `delivery` the modal SHALL ter um separador e `judge     ` com, para cada ticket do `plan` mais recente não descartado que tem `verdict`, em ordem do `plan`, `✓` ou `✗` pelo `outcome` do `verdict` mais recente, o `ticket_ref` e `<aprovados>/<critérios>` dele, separados por dois espaços; sem `verdict` algum SHALL não ter essa parte.
9. **GAT-48** The modal SHALL mostrar sempre a versão atual do gate, também quando ele é reemitido com o modal aberto.
10. **GAT-49** WHILE o modal está no modo de leitura the modal SHALL terminar com uma linha vazia e `[a]provar      [r]ejeitar      [c]omentar` seguido de `            esc fechar` com um gate pendente, ou de `      ] próximo  [ anterior` com mais; e o rodapé SHALL ser `a aprovar   r rejeitar   c comentar   esc fechar sem decidir`, com `] próximo gate   [ anterior` antes de `esc` quando há mais de um.
11. **GAT-50** WHILE o modal está no modo de leitura `a` SHALL passar ao modo de confirmação, `r` ao de texto de rejeição com o campo vazio, `c` ao de texto de comentário com o campo vazio, `]` e `[` SHALL mudar para o gate pendente seguinte ou anterior da fila, sem passar do último nem do primeiro, `esc` SHALL fechar o modal sem enviar, e nenhuma outra tecla, nem `q`, SHALL mudar o estado da tela; `ctrl+c` SHALL sair da TUI.
12. **GAT-51** WHILE o modal está no modo de confirmação the modal SHALL ter, depois de um separador, `⚠ confirmar aprovação de G-NN · não dá para desfazer`, `  ação    <action>`, `  efeito  <effect>`, uma linha vazia e `[y] sim, aprovar e executar            esc voltar ao gate sem decidir`, com o rodapé `y confirmar   esc voltar ao gate`.
13. **GAT-52** WHILE o modal está no modo de confirmação `y` SHALL enviar `POST /gate-decision` com `{ human_token, gate_id, decision: "approve" }`, `esc` SHALL voltar ao modo de leitura, e nenhuma outra tecla SHALL mudar o estado da tela.
14. **GAT-53** WHILE o modal está num modo de texto the modal SHALL ter, depois de um separador, `rejeitar G-NN · motivo (obrigatório)` ou `comentar G-NN · comentário (obrigatório)  · o gate continua pendente`; o campo de 3 linhas, ou de 7 quando expandido, como o do modal de resposta (QST-73, QST-75), com as últimas 5 linhas do texto quando expandido; e `⚠ fica gravado no log da feature e não pode ser apagado`; o rodapé SHALL ser `enter enviar   ctrl+e expandir   ctrl+u limpar   esc voltar ao gate`, com `recolher` quando expandido.
15. **GAT-54** WHILE o modal está num modo de texto um caractere imprimível SHALL entrar no fim do texto, `backspace` SHALL apagar o último, `ctrl+u` SHALL esvaziar o campo, `ctrl+e` SHALL alternar o tamanho, `esc` SHALL voltar ao modo de leitura sem o texto, e as letras de comando, os dígitos e `q` SHALL entrar no texto.
16. **GAT-55** WHEN `enter` é pressionada num modo de texto com ao menos um caractere que não seja espaço THEN a TUI SHALL enviar `POST /gate-decision` com `{ human_token, gate_id, decision, text }`, `decision` `reject` ou `comment` pelo modo e `text` sem os espaços das pontas.
17. **GAT-56** IF `enter` é pressionada num modo de texto com o campo vazio ou só com espaços THEN a TUI SHALL não enviar, pintar a borda do campo de vermelho e mostrar abaixo do aviso fixo `✗ motivo obrigatório · nada foi enviado` ou `✗ comentário obrigatório · nada foi enviado`, até a próxima tecla que mude o texto.
18. **GAT-57** WHEN o broker responde `{ ok: true }` a uma decisão THEN a TUI SHALL fechar o modal e avisar em verde por 4 s `✓ G-NN aprovado`, `✓ G-NN rejeitado` ou `✓ G-NN comentado · continua pendente`.
19. **GAT-58** WHEN o broker responde `gate_closed` THEN a TUI SHALL fechar o modal e avisar em vermelho por 4 s `✗ G-NN já decidido`; IF responde outra recusa, um status que não é 200, um corpo que não é `{ ok }`, ou não responde em 2000 ms THEN SHALL voltar ao modo de onde enviou, com o texto, e avisar em vermelho por 4 s `✗ decisão não enviada · <erro>`, com o `error` da recusa ou `broker não respondeu`.
20. **GAT-59** WHEN uma leitura mostra que o gate do modal não está mais pendente, sem envio dele em curso THEN a TUI SHALL fechar o modal, descartar o texto e avisar `G-NN fechado` por 4 s; WHEN mostra uma versão nova do gate com o modal no modo de confirmação THEN SHALL voltar ao modo de leitura.

**Independent Test**: com um broker de teste e um gate pendente, `g`, `a`, `y`: o log ganha `hum → mot [gate_decision]` com `approve`, e o selo some.

---

### P1: Modal de permissão ⭐ MVP

**User Story**: Como dev, quero ver o comando exato que um agente quer rodar e permitir ou negar pela TUI, para não entrar no terminal dele.

**Why P1**: É o primeiro sinal de fracasso do MVP (ADR-011).

**Acceptance Criteria**:

1. **GAT-60** WHEN `x` é pressionada sem modal aberto, com pedido de permissão aberto e o broker respondendo THEN a TUI SHALL ir à tela principal e abrir o modal de permissão no pedido aberto mais antigo, com a prévia na primeira linha; IF não há pedido aberto THEN SHALL avisar `nenhum pedido de permissão` por 4 s; IF o broker não responde às leituras THEN SHALL avisar `broker desconectado · permissão desabilitada` por 4 s e não abrir.
2. **GAT-61** WHEN o modal de permissão é desenhado THEN SHALL ser uma caixa de 82 colunas a partir da coluna 19, centrada nas 40 linhas e nunca acima da linha 2, sobre a tela principal escurecida, com o título `⚠ permissão P-NN · <curto> · <tool_name>` e, na borda de cima, ` pedido <n> de <total> ` com mais de um pedido aberto, ou ` resolvido no terminal ` no estado de GAT-71.
3. **GAT-62** The modal SHALL ter, de cima para baixo: `<nome> parou o turno e pede permissão para usar uma tool · há <idade>`, com a idade desde o `ts` do pedido; com mais de um pedido aberto, `fila      ` e cada pedido aberto, do mais antigo ao mais novo, como `▶ P-NN <curto> <tool_name>` o deste modal e `  P-NN <curto> <tool_name>` os outros, separados por três espaços, e `antigo antes`; uma linha vazia; `agente    <curto> <nome>  [<status>]`, com `[blocked x]` para o agente bloqueado por um pedido; `ticket    <ticket> <título>`, ou `— sem ticket`, ou `— sem feature aberta`; `tool      <tool_name>`; `descrição "<description>"  · texto do agente, não diz o que roda`, cortado com `…` dentro da caixa; um separador; `vai executar  · a entrada exata e inteira`; a prévia; um separador; e a parte do estado.
4. **GAT-63** The prévia SHALL ser uma caixa de 76 colunas com o título `entrada · <tool_name>` e o `input_preview` em linhas de 70 caracteres, cada linha do texto com o número dela em 3 colunas e cada continuação com `  · `, mostrando até 8 linhas a partir da posição atual; com mais de 8 linhas a borda de baixo SHALL ter ` <primeira>–<última> de <total> · ▼ mais abaixo ` antes do fim, ou ` <primeira>–<última> de <total> · fim ` com o fim à vista.
5. **GAT-64** WHILE o pedido do modal está aberto the parte do estado SHALL ser `[a] permitir      [d] negar      esc fechar · o pedido continua pendente`; sem o fim da prévia à vista, `a só vale depois de ver o fim da prévia · j/k rola · G vai ao fim`; e `a: <nome> roda o comando e segue o turno · d: recebe a recusa e escolhe outro caminho` quebrado em 76 colunas. O rodapé SHALL ser `a permitir`, ou `a permitir (veja o fim)` sem o fim à vista, `d negar`, `j/k rolar   G fim` quando a prévia tem mais de 8 linhas, `] próximo   [ anterior` com mais de um pedido aberto, e `esc fechar sem decidir`.
6. **GAT-65** WHILE o pedido do modal está aberto `j` e `↓` SHALL descer a prévia uma linha e `k` e `↑` subir uma, sem passar do fim nem do começo, `G` SHALL ir ao fim, `]` e `[` SHALL mudar para o pedido aberto seguinte ou anterior, com a prévia na primeira linha, sem passar do último nem do primeiro, `esc` SHALL fechar sem enviar, e nenhuma outra tecla, nem `q`, SHALL mudar o estado da tela.
7. **GAT-66** WHEN `a` é pressionada com o fim da prévia à vista THEN a TUI SHALL enviar `POST /permission-decision` com `{ human_token, request_seq, behavior: "allow" }`; IF o fim não está à vista THEN `a` SHALL não enviar nem mudar o estado da tela.
8. **GAT-67** WHEN `d` é pressionada THEN a TUI SHALL enviar `POST /permission-decision` com `{ human_token, request_seq, behavior: "deny" }`, em qualquer posição da prévia.
9. **GAT-68** WHEN o broker responde `{ ok: true }` THEN a TUI SHALL fechar o modal e avisar em verde por 4 s `✓ P-NN permitido` ou `✓ P-NN negado`.
10. **GAT-69** WHEN o broker responde `permission_closed` THEN o modal SHALL ficar no estado de GAT-71; IF responde outra recusa, um status que não é 200, um corpo que não é `{ ok }`, ou não responde em 2000 ms THEN SHALL ficar como estava e avisar em vermelho por 4 s `✗ decisão não enviada · <erro>`.
11. **GAT-70** WHEN uma leitura mostra que o pedido do modal fechou por uma `permission_decision`, sem envio dele em curso THEN a TUI SHALL fechar o modal e avisar `P-NN decidido` por 4 s.
12. **GAT-71** WHILE o pedido do modal fechou por um evento posterior do peer ou pela saída dele the modal SHALL ter como primeira linha `<nome> pediu permissão às HH:MM:SS · o pedido já foi respondido`, sem fila, o status atual do agente, a prévia em cinza, e a parte do estado `⚠ já respondido no terminal do <nome>`, `a TUI soube às HH:MM:SS, quando o <nome> voltou a agir. Nada foi enviado.`, com o `ts` do evento que o fechou, e `a e d não valem mais · esc fecha`; o rodapé SHALL ser `esc fechar`, e só `esc` SHALL mudar o estado da tela.

**Independent Test**: com um broker de teste e um pedido aberto, `x`, `a`: o log ganha `hum → w1 [permission_decision]` com `allow`, e o servidor MCP do peer recebe o veredito.

---

### P1: Teclado e escrita comuns aos modais ⭐ MVP

**User Story**: Como dev, quero que os três modais escrevam do mesmo jeito, para que nenhum envie o que eu não pedi.

**Why P1**: A TUI passa a escrever em três rotas; a regra da colagem e do envio único tem de valer em todas.

**Acceptance Criteria**:

1. **GAT-72** The TUI SHALL fazer `POST` só para `/answer`, `/gate-decision` e `/permission-decision`: a primeira só pelo `enter` do modal de resposta, a segunda só pelo `y` do modo de confirmação e pelo `enter` dos modos de texto do modal de gate, e a terceira só pelo `a` e pelo `d` do modal de permissão.
2. **GAT-73** WHILE um envio de um modal espera a resposta do broker the TUI SHALL não fazer outro `POST` e não mudar o modal por tecla alguma, a não ser `ctrl+c`.
3. **GAT-74** WHEN a TUI vai enviar uma decisão THEN SHALL ler a credencial do arquivo naquele momento, como QST-83; IF ela não existe THEN SHALL não enviar, voltar ao modo de onde enviou e avisar `✗ credencial humana não encontrada`.
4. **GAT-75** IF um bloco colado tem `y`, `a`, `d`, `\r` ou `\n` e, na vez dessa tecla, o modal de gate está no modo de leitura ou de confirmação ou o de permissão está aberto THEN a TUI SHALL ignorá-la; IF na vez dela o modal de gate está num modo de texto THEN `\r` e `\n` SHALL virar espaço no texto e as letras SHALL entrar nele: um bloco colado nunca decide um gate nem uma permissão.
5. **GAT-76** WHILE um modal está aberto the TUI SHALL não abrir outro: com o modal de resposta aberto `g` e `x` SHALL entrar no texto ou não fazer nada, como hoje, e com o de gate ou o de permissão aberto `g`, `x`, `4` e `enter` SHALL fazer só o que GAT-50, GAT-54, GAT-55, GAT-65 e GAT-71 dizem.
6. **GAT-77** WHILE o broker não responde às leituras a TUI SHALL não mudar um modal aberto por tecla alguma, a não ser `ctrl+c`, e SHALL voltar a desenhá-lo quando o broker responder, como QST-84.
7. **GAT-78** WHILE o terminal tem menos de 120 colunas ou menos de 40 linhas the regra de QST-99 SHALL valer também para o modal de gate e o de permissão: só `q` e `ctrl+c` saem, e o modal volta com o seu estado quando o tamanho basta.

**Independent Test**: uma colagem de `ay` com o gate aberto não grava `gate_decision`; `x` seguido de uma colagem de `a` não grava `permission_decision`.

---

### P1: Mouse nos modais ⭐ MVP

**User Story**: Como dev que usa o mouse, quero que os modais de gate e de permissão respondam ao clique como o de resposta, sem que um clique decida sozinho.

**Why P1**: A TUI clicável deixou os dois modais para esta fatia pela regra do AD-021.

**Acceptance Criteria**:

1. **GAT-79** WHEN, sem modal aberto, um clique cai no selo de gate da linha 1 THEN a TUI SHALL fazer como `g`; WHEN cai no selo de permissão THEN SHALL fazer como `x` (CLK-36, CLK-37).
2. **GAT-80** WHILE o modal de gate ou o de permissão está aberto the TUI SHALL dar a um clique só os efeitos de GAT-81 a GAT-84, e a roda SHALL não fazer nada.
3. **GAT-81** WHEN um clique cai numa célula das linhas 0 a 38 fora da caixa do modal THEN a TUI SHALL fazer como `esc` naquele modo.
4. **GAT-82** WHEN um clique cai num atalho da linha 39 THEN a TUI SHALL fazer como a tecla dele naquele modo: `a`, `r`, `c`, `y`, `d`, `G`, `enter`, `ctrl+e`, `ctrl+u` e `esc` pelo texto ou pela tecla, `]` e `[` cada um pelo seu caractere, e `j/k` cada letra pela sua.
5. **GAT-83** WHEN um clique cai num item da linha `fila` THEN a TUI SHALL fazer `]` ou `[` tantas vezes quantas levam do item marcado ao clicado, e nada no item marcado; um clique em qualquer outra célula dentro da caixa SHALL não mudar o estado da tela.
6. **GAT-84** IF um clique chega menos de 500 ms depois do clique anterior com um modal aberto THEN a TUI SHALL não mudar o estado da tela nem enviar nada (CLK-46).

**Independent Test**: com o gate aberto, um clique em `a aprovar` e outro, 600 ms depois, em `y confirmar` gravam o `approve`; o mesmo par a 300 ms não grava.

---

### P1: Frames e legenda ⭐ MVP

**User Story**: Como quem mantém a TUI, quero cada frame de gate e de permissão como caso de teste, para que a tela seja a do design.

**Why P1**: AD-010: os frames são os casos de teste.

**Acceptance Criteria**:

1. **GAT-85** WHEN o modal de gate é desenhado a partir do log e do estado de cada um dos frames 08, 16a, 16b, 16c, 17, 18b e 19b THEN as 40 linhas SHALL ser as do frame, a não ser nas linhas declaradas na tabela de desvios com classe D1 ou D2.
2. **GAT-86** WHEN o modal de permissão é desenhado a partir do log e do estado de cada um dos frames 22a, 22b, 22d, 22e, 22f e 29d THEN as 40 linhas SHALL ser as do frame, a não ser nas linhas declaradas na tabela de desvios com classe D1, D2 ou D3.
3. **GAT-87** WHEN a legenda é desenhada THEN SHALL ter, onde o frame 11 as tem, as linhas `gate (modal)`, `a           aprovar → pede confirmação (y)`, `r · c       rejeitar · comentar, texto obrigatório`, `] [ · esc   fila de gates · fechar sem decidir`, `permissão (modal)`, `a · d       permitir (após ver o fim) · negar`, `j k · G     rolar a prévia · ir ao fim` e `] [ · esc   fila · fechar, o pedido segue`.
4. **GAT-88** The tabela de desvios SHALL não ter desvio cujo motivo seja uma tela ou tecla desta fatia por fazer; o único D3 da fatia SHALL ser o da linha de sistema `✓ P-NN fechado no terminal` (Out of Scope), no frame 11 e no 22b.
5. **GAT-89** The arquivos `broker/test/frames/<id>.txt` dos frames 08, 16a, 16b, 16c, 17, 18b, 19b, 22a, 22b, 22d, 22e, 22f e 29d SHALL ser a saída de `broker/test/frames/extract.ts` sobre `Squad TUI.dc.html`, e os 47 já existentes SHALL ficar idênticos aos da `main`.
6. **GAT-90** WHEN `g` ou `x` é pressionada THEN a TUI SHALL não avisar `chega com a fatia Gate` em caso algum.

**Independent Test**: `bun test test/unit/tui-frames.test.ts` desenha os 60 frames.

---

## Edge Cases

- **GAT-91** WHEN dois gates estão pendentes THEN o selo SHALL ser `⚠ 2 gates pendentes · g`, `g` SHALL abrir o mais antigo, e o contador `? N` da linha 0 SHALL não contar gate algum.
- **GAT-92** WHEN o gate do modal é decidido e há outro pendente THEN o modal SHALL fechar como GAT-57, e `g` SHALL abrir o que sobrou.
- **GAT-93** IF o `diffstat`, o `body`, a `action` ou o `effect` não cabe na largura do modal THEN o modal SHALL quebrar o `body` e cortar as outras linhas com `…` dentro da caixa, e IF o modal tem mais linhas do que cabem nas linhas 2 a 37 THEN SHALL cortar as linhas do `body` e do `diffstat`, a partir do fim de cada um, até caber.
- **GAT-94** WHEN o `input_preview` é vazio THEN a prévia SHALL ter uma linha, `  1 ` sem texto, e o fim SHALL estar à vista.
- **GAT-95** WHEN um pedido de permissão chega sem feature aberta THEN `x` SHALL abrir o modal igual, com `ticket    — sem feature aberta` (frame 29d).
- **GAT-96** WHEN o agente de um pedido sai do broker com o modal aberto THEN o modal SHALL ficar no estado de GAT-71, com o `ts` do `peer_left`.
- **GAT-97** WHEN a feature fecha com o modal de gate aberto THEN o modal SHALL fechar como GAT-59.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| GAT-01 | P1: Pedir gate | T1, T3 | Implementing |
| GAT-02 | P1: Pedir gate | T1, T3 | Implementing |
| GAT-03 | P1: Pedir gate | T3 | Implementing |
| GAT-04 | P1: Pedir gate | T3 | Implementing |
| GAT-05 | P1: Pedir gate | T3, T6 | Implementing |
| GAT-06 | P1: Pedir gate | T3 | Implementing |
| GAT-07 | P1: Pedir gate | T3 | Implementing |
| GAT-08 | P1: Pedir gate | T3 | Implementing |
| GAT-09 | P1: Pedir gate | T3 | Implementing |
| GAT-10 | P1: Pedir gate | T3 | Implementing |
| GAT-11 | P1: Pedir gate | T6 | Implementing |
| GAT-12 | P1: Reemitir depois do comentário | T3 | Implementing |
| GAT-13 | P1: Reemitir depois do comentário | T3 | Implementing |
| GAT-14 | P1: Reemitir depois do comentário | T3 | Implementing |
| GAT-15 | P1: Decidir um gate | T4 | Implementing |
| GAT-16 | P1: Decidir um gate | T4 | Implementing |
| GAT-17 | P1: Decidir um gate | T4 | Implementing |
| GAT-18 | P1: Decidir um gate | T4, T9 | Implementing |
| GAT-19 | P1: Decidir um gate | T4 | Implementing |
| GAT-20 | P1: Decidir um gate | T4, T6 | Implementing |
| GAT-21 | P1: Decidir um gate | T4 | Implementing |
| GAT-22 | P1: Decidir um gate | T4 | Implementing |
| GAT-23 | P1: Decidir um gate | T4 | Implementing |
| GAT-24 | P1: Decidir um gate | T4, T7 | Implementing |
| GAT-25 | P1: Decidir um gate | T4 | Implementing |
| GAT-26 | P1: Encerrar a feature com o gate | T5, T6, T26 | Implementing |
| GAT-27 | P1: Encerrar a feature com o gate | T5, T26 | Implementing |
| GAT-28 | P1: Encerrar a feature com o gate | T5 | Implementing |
| GAT-29 | P1: Encerrar a feature com o gate | T5 | Implementing |
| GAT-30 | P1: Paridade com o log | T2, T7 | Implementing |
| GAT-31 | P1: Paridade com o log | T2 | Implementing |
| GAT-32 | P1: Paridade com o log | T2 | Implementing |
| GAT-33 | P1: Paridade com o log | T2 | Implementing |
| GAT-34 | P1: O que a mother vê | T8 | Implementing |
| GAT-35 | P1: O que a mother vê | T8 | Implementing |
| GAT-36 | P1: O que a mother vê | T9 | Implementing |
| GAT-37 | P1: O que a mother vê | T10, T29 | In Tasks |
| GAT-38 | P1: O que a mother vê | T10, T29 | In Tasks |
| GAT-39 | P1: O que a mother vê | T10, T29 | In Tasks |
| GAT-40 | P1: Modal de gate | T13, T20, T26 | In Tasks |
| GAT-41 | P1: Modal de gate | T17, T18 | In Tasks |
| GAT-42 | P1: Modal de gate | T18 | In Tasks |
| GAT-43 | P1: Modal de gate | T18 | In Tasks |
| GAT-44 | P1: Modal de gate | T18 | In Tasks |
| GAT-45 | P1: Modal de gate | T18 | In Tasks |
| GAT-46 | P1: Modal de gate | T18 | In Tasks |
| GAT-47 | P1: Modal de gate | T18 | In Tasks |
| GAT-48 | P1: Modal de gate | T18 | In Tasks |
| GAT-49 | P1: Modal de gate | T18 | In Tasks |
| GAT-50 | P1: Modal de gate | T13 | In Tasks |
| GAT-51 | P1: Modal de gate | T18 | In Tasks |
| GAT-52 | P1: Modal de gate | T13, T26 | In Tasks |
| GAT-53 | P1: Modal de gate | T18 | In Tasks |
| GAT-54 | P1: Modal de gate | T13 | In Tasks |
| GAT-55 | P1: Modal de gate | T13 | In Tasks |
| GAT-56 | P1: Modal de gate | T13, T18 | In Tasks |
| GAT-57 | P1: Modal de gate | T15 | In Tasks |
| GAT-58 | P1: Modal de gate | T11, T15 | In Tasks |
| GAT-59 | P1: Modal de gate | T15 | In Tasks |
| GAT-60 | P1: Modal de permissão | T14, T20, T26 | In Tasks |
| GAT-61 | P1: Modal de permissão | T12, T17, T19 | In Tasks |
| GAT-62 | P1: Modal de permissão | T12, T19 | In Tasks |
| GAT-63 | P1: Modal de permissão | T17, T19 | In Tasks |
| GAT-64 | P1: Modal de permissão | T19 | In Tasks |
| GAT-65 | P1: Modal de permissão | T14 | In Tasks |
| GAT-66 | P1: Modal de permissão | T14, T26 | In Tasks |
| GAT-67 | P1: Modal de permissão | T14 | In Tasks |
| GAT-68 | P1: Modal de permissão | T15 | In Tasks |
| GAT-69 | P1: Modal de permissão | T11, T15 | In Tasks |
| GAT-70 | P1: Modal de permissão | T12, T15 | In Tasks |
| GAT-71 | P1: Modal de permissão | T12, T14, T19 | In Tasks |
| GAT-72 | P1: Teclado e escrita comuns aos modais | T11, T25, T27 | In Tasks |
| GAT-73 | P1: Teclado e escrita comuns aos modais | T15, T25 | In Tasks |
| GAT-74 | P1: Teclado e escrita comuns aos modais | T15, T25 | In Tasks |
| GAT-75 | P1: Teclado e escrita comuns aos modais | T16 | In Tasks |
| GAT-76 | P1: Teclado e escrita comuns aos modais | T13 | In Tasks |
| GAT-77 | P1: Teclado e escrita comuns aos modais | T16 | In Tasks |
| GAT-78 | P1: Teclado e escrita comuns aos modais | T25 | In Tasks |
| GAT-79 | P1: Mouse nos modais | T23, T24 | In Tasks |
| GAT-80 | P1: Mouse nos modais | T24 | In Tasks |
| GAT-81 | P1: Mouse nos modais | T24 | In Tasks |
| GAT-82 | P1: Mouse nos modais | T23, T24 | In Tasks |
| GAT-83 | P1: Mouse nos modais | T24 | In Tasks |
| GAT-84 | P1: Mouse nos modais | T24 | In Tasks |
| GAT-85 | P1: Frames e legenda | T21 | In Tasks |
| GAT-86 | P1: Frames e legenda | T22 | In Tasks |
| GAT-87 | P1: Frames e legenda | T20 | In Tasks |
| GAT-88 | P1: Frames e legenda | T20, T21, T22 | In Tasks |
| GAT-89 | P1: Frames e legenda | T21, T22, T28, T30 | In Tasks |
| GAT-90 | P1: Frames e legenda | T13 | In Tasks |
| GAT-91 | Edge cases | T13 | In Tasks |
| GAT-92 | Edge cases | T13 | In Tasks |
| GAT-93 | Edge cases | T18 | In Tasks |
| GAT-94 | Edge cases | T14, T19 | In Tasks |
| GAT-95 | Edge cases | T14, T19 | In Tasks |
| GAT-96 | Edge cases | T12 | In Tasks |
| GAT-97 | Edge cases | T15 | In Tasks |

**Coverage:** 97 total, 97 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Clientes MCP de teste da mother, do leader e de um worker levam uma feature de dois tickets do `open_feature` ao `gate` de entrega, e a TUI, sobre o mesmo broker, aprova o gate pelo modal; `close_feature` `delivered` passa só depois disso.
- [ ] Depois de qualquer sequência de chamadas, `gates()` aplicada a `GET /events` devolve as linhas de `gates` (GAT-30).
- [ ] Nenhum caminho deixa um gate com duas decisões finais.
- [ ] A TUI, sobre um broker de teste, decide um pedido de permissão pelo modal, e o servidor MCP do peer recebe o veredito.
- [ ] Os 60 frames passam no teste de frames; os 47 anteriores não mudam.
- [ ] O marco do MVP conferido com sessões reais, ou o que ficou sem conferir registrado em `marco-mvp.md`.
- [ ] `bun node_modules/typescript/bin/tsc --noEmit` e `bun test` passam no Windows e no Linux, ou a spec registra qual dos dois ficou sem rodar.
