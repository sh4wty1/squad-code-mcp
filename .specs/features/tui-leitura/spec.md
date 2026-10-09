# TUI leitura Specification

Fonte: fatia TUI leitura de `.design/squad-mvp.md`, ADR-002, ADR-004, ADR-006, ADR-007,
ADR-009 e ADR-011, STATE AD-001, AD-002, AD-006 e AD-007, o Handoff de `.specs/STATE.md`,
os frames de `docs/claude-design-handoff/Handoff-Design.zip` (`Squad TUI.dc.html`, 01 a 30)
e `docs/claude-design-handoff/DECISOES-rodada-3.md`. Esta spec deriva da fatia; onde a
fatia não decide, a escolha está em "Assumptions & Open Questions".

## Problem Statement

O broker grava tudo o que o squad faz num log que ninguém consegue ler: `GET /events`
devolve JSON, e hoje o dev só sabe o estado do squad entrando no terminal de cada sessão.
Falta a tela única que lê o log por cursor, calcula o status de agentes e tickets com a
função de derivação do contrato e desenha o feed, os agentes, os tickets, a estrela e o
detalhe de um ticket. Esta fatia só lê: responder, decidir gate e decidir permissão são
das fatias Question e Gate.

## Goals

- [ ] `bun tui.ts`, num terminal de 120×40 ou maior, mostra o estado do squad a partir de `GET /events` e o atualiza a cada segundo, sem ler o banco.
- [ ] O status de cada agente e de cada ticket sai de uma função pura sobre os eventos, em `broker/shared/derive.ts`, com a precedência da fatia.
- [ ] Cada frame de leitura do handoff é um caso de teste: um log que reproduz o estado do frame desenha as mesmas 40 linhas, e toda diferença está declarada com o motivo.
- [ ] A TUI não escreve nada no broker.
- [ ] A suíte passa no Windows e no Linux.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Aba Perguntas (frame 04) e modais de resposta (05 a 07, 20a, 20b) | Fatia Question |
| Modal de gate (08, 16a a 17, 18b, 19b) | Fatia Gate |
| Modal de permissão (22a, 22b, 22d a 22f, 29d), os ids `P-nn` e a linha `✓ P-01 fechado · respondido no terminal` | Escrever é das fatias Question e Gate; os ids e a linha só existem no modal |
| Qualquer `POST` da TUI ao broker, e a leitura de `SQUAD_TOKEN_FILE` | A fatia só lê |
| Skills base de cada papel na terceira linha do agente e no bloco `loadout` | Vêm do `roles.json`, fatia Papéis; não estão em nenhum evento |
| Tokens por ticket e por etapa, e "custo do thread" | Fora da TUI no design (N25, parte) |
| "avaliado com" na tela de thread | Skills do judge: `roles.json`, fatia Papéis |
| Texto do rodapé `✗ TKT-12 descartado · nova: TKT-15` (frame 25a) | O log não diz que um ticket substitui outro |
| Topologia órbita, filtros `f` `t` `/`, esquemas de cor, terminal menor que 120×40 | Fora da TUI no design |
| Comando `squad tui` | O nome é do launcher, fatia Papéis; aqui a entrada é `bun tui.ts` |
| Mais de uma feature aberta | Fora do MVP no design |
| Corrigir `SQUAD_POLL_INTERVAL_MS` não numérica | Pendência da Event; a TUI trata só o próprio uso (TUI-58) |
| Sessão real do Claude Code alimentando a tela | Os testes usam logs montados; a primeira feature real é a revisão do design |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| **Nome do projeto na linha 0** (pergunta ao dev) | A TUI usa o nome do repositório de onde foi lançada, pela mesma regra que o broker aplica ao `git_root` da mother (`projectOf`); fora de um repositório, a linha 0 mostra o rótulo cinza `feature` antes do título | `project` não está em nenhum evento e o design diz que não é campo do evento. Lançada no repositório da mother, a TUI chega ao mesmo nome sem mudar o contrato | y |
| **Nome que nunca entrou no broker** (pergunta ao dev) | Oitavo status derivado, `never`, exibido `[não lançado]`, acima de `offline` na precedência: o log não tem nenhum evento de presença do nome | A regra de `offline` da fatia exige um `peer_left`; sem a regra nova o nome cairia em `idle` e a tela diria que há uma sessão ociosa onde não há sessão | y |
| **Tecla `t`** (pergunta ao dev) | Adotada: com feature aberta o rodapé mostra os tokens da feature e `t` alterna para a sessão; sem feature só existe a sessão e `t` avisa | Os dois totais já estão definidos no contrato; a tecla `t` de filtro (N23) está fora e a letra está livre | y |
| Leituras da tabela de status que a fatia não fecha (respondidas pelo dev em 2026-10-09) | "Ticket em andamento" segue a cláusula de `working` de cada papel (ver Definições). "Escalou uma pergunta" inclui quem a fez. O ticket depois de um `rework` abaixo do limite é `working` e o dono fica `idle`. "Nada pendente com o dev" são só as perguntas e os gates da própria mother: um pedido de permissão de outro agente não a tira de `working` | Linhas 356, 358 e 364 do design; STATE AD-011 | y |
| Desvio de status na tabela de desvios | Só entra com a linha do design que contradiz o protótipo, citada no motivo | Pedido do dev; a linha 362 diz que a derivação reproduz o mock | y |
| Onde vive o código | `broker/tui/` para os módulos, `broker/tui.ts` como entrada, testes em `broker/test/unit/tui-*.test.ts` e frames em `broker/test/frames/` | AD-001 já previa a TUI importar do broker; mesmo pacote, mesmo `tsc`, mesma suíte | y |
| O que é "mesmo estado, mesmas 40 linhas" | Cada frame de leitura tem um log de teste; `desenho(derivação(log, agora))` é comparado, linha a linha, ao texto do frame extraído do protótipo. Uma linha só pode diferir se estiver numa tabela de desvios no arquivo de teste, com a classe do desvio | O protótipo desenha estados escritos à mão; onde ele contradiz a fatia ou mostra o que o log não tem, a fatia vence e a diferença fica visível |  y |
| Classes de desvio | D1: a derivação da fatia dá status ou atividade diferente do valor escrito à mão no protótipo. D2: o frame mostra conteúdo sem fonte no log (skills base, tokens por etapa, prosa do cenário). D3: item cortado nesta spec (Out of Scope) | Fecha a lista do que pode justificar uma linha diferente | y |
| O que se compara | O caractere de cada célula. A cor e o negrito são testados por requisito (TUI-28, TUI-29, TUI-33), não célula a célula | "Mesmas 40 linhas"; um teste de cor por célula travaria 4800 atributos por frame | y |
| Frames de leitura | 01, 02, 03, 09a, 09b, 10, 11, 12, 13a, 13b, 13c, 14, 15a, 15b, 18a, 19a, 21, 22c, 22g, 22h, 23a, 23b, 24a, 24b, 24c, 24d, 25a, 25b, 26a, 26b, 26c, 27a, 27b, 27c, 28a, 28b, 28c, 29a, 29b, 29c, 30 | São os que não têm modal aberto nem a aba Perguntas | y |
| Eventos de `question`, `answer`, `question_merged`, `gate` e `gate_decision` | A derivação e o feed os leem como o contrato os define, embora nenhuma rota os grave antes das fatias Question e Gate | A fatia pede `waiting ?`, `waiting`, cor de `answer` e de `gate`; os tipos já estão em `contract.ts` | y |
| Pergunta aberta | Tem ao menos um `question` com o `question_id`, nenhum `answer` com ele e nenhum `question_merged` que a mescle; a mesclada fecha quando a de destino fecha. O holder é o `to` do `question` mais recente | Definição da fatia Question, lida só dos eventos | y |
| Prazo de pergunta não-bloqueante | `ts` do primeiro `question` com `to` `human` mais `timeout_s` (240 se ausente) | "O relógio começa quando a pergunta chega ao dev" | y |
| Gate pendente | Tem `gate` com o `gate_id` e nenhum `gate_decision` de `approve` ou `reject` | `comment` não decide (ADR-008) | y |
| "Evento do peer" | Evento com `from` igual ao nome. `refused`, `peer_joined` e `peer_left` têm `from` `broker` e não contam; um `unblocked` gravado pelo broker também não | A fatia: o `refused` não conta em nenhuma regra de derivação | y |
| Eventos considerados na derivação de agentes e tickets | Os da feature aberta para tickets, dívidas, perguntas e gates; o log inteiro para presença, bloqueio, pedido de permissão, turno e tokens | AD-006: esses kinds são gravados sem feature, e encerrar não fecha um `blocked` |  y |
| Rótulos curtos | `mot`, `ldr`, `w1`, `w2`, `w3`, `jdg` para os seis nomes, `hum` para `human` na coluna do feed e `dev` no texto corrido | Como nos frames | y |
| Hora na tela | `HH:MM:SS` no fuso local da máquina que roda a TUI | O broker grava epoch ms; os frames mostram hora de relógio | y |
| `msg #0417` | `seq` com quatro dígitos, zeros à esquerda; acima de 9999 o número inteiro | Fatia Event: o `seq` é o `msg #0416` da tela | y |
| Corpo da linha de mensagem | O `summary` do evento, sempre. Um `permission_request` mostra `Bash: Rodar os testes`, como o broker grava, e não `Bash · bun test` do frame (D1) | Fatia: "com `summary` no corpo" | y |
| Linha `‖ <id> [stalled] deve <o quê>` no feed | Adotada: uma linha no `usage` que encerra um turno quando, até aquele evento, o status do agente é `stalled` | Decisão do Claude Design (frame 23a). É um fato do log naquele ponto e não muda depois | y |
| Linha `⚠ TKT-12 no limite ⟳ 2/2 · sem 3º rework` | Adotada: linha de sistema logo depois do terceiro `verdict` de `rework` de um ticket | Frame 15a; é o que explica o `[escalated]` no feed | y |
| Linha de sistema para `unblocked`, `turn_started` e `usage` | Nenhuma, fora a de `stalled` acima | Os frames não têm; o painel de agentes mostra a mudança | y |
| Volta de um peer | `peer_joined` de um nome que já teve `peer_left` vira `● w2 voltou`, com ` · retoma <ticket>` se ele é dono de um ticket aberto; o primeiro `peer_joined` do nome vira `● ldr entrou` | Frames 13c e 28b | y |
| Saída de um peer | `○ w2 saiu · sessão morta` com `reason` `died`; `○ w2 saiu · sessão encerrada` com `unregistered` | Frame 13a só desenha a primeira; a segunda precisa de texto | y |
| Recusas agrupadas | Um `refused` se junta à linha anterior do feed quando ela é um `refused` do mesmo `peer`, `attempted_kind` e `error`; o contador vira `×N` | "Recusas repetidas do mesmo peer com o mesmo erro viram uma linha com contador" | y |
| Detalhe de uma recusa | Agente, kind tentado, erro, vezes e intervalo. A prosa "o que houve" do frame 25a sai (D2): o `refused` não guarda o `hint` | O evento só tem `peer`, `attempted_kind` e `error` | y |
| Detalhe de um `blocked` | `desde` e idade, ticket, `motivo` com `reason`, depois `detail` e `última ação` com `last_action`. Os blocos "tipo", "resolver em" e "escalação" do frame 10 saem ou são derivados: a escalação é a lista de `question` do ticket depois do `blocked` (D2) | Fatia: "detalhe com motivo, detalhe e última ação" | y |
| Versão do plano | Ordinal do `plan` dentro da feature. O título do bloco de tickets mostra `· plano vN` enquanto o plano tem ticket em `planned` | Reproduz 24a, 24b, 24c e 25a, e o 01 sem o rótulo | y |
| Painel de tickets | Duas linhas por ticket até três tickets; uma linha por ticket de quatro a sete; com mais de sete, seis linhas e `+N tickets` na sétima | Decisão do Claude Design no 24c. O protótipo corta em silêncio depois do sétimo; a tela não pode esconder estado | y |
| Selos da linha 1 | Um por alerta, da direita para a esquerda nesta ordem: gate pendente, permissão pendente, ticket `escalated`, agente `stalled`, agente `offline`, agente `blocked` sem ser por permissão. O que não cabe à direita das abas não é desenhado | O protótipo escreve os selos à mão por cenário; a regra precisa ser uma só (D1 onde o texto difere) | y |
| Lado direito do rodapé | O primeiro que existir: aviso de tecla (4 s); alertas de agente, com a idade se for um só e na forma curta `⚠ w2 ◌ w3` se forem vários, seguidos de ` · ○ ocioso desde HH:MM` sem feature aberta; `⚠ G-01 aguarda você`; `○ ocioso desde HH:MM` ou `○ nenhuma feature ainda`; `rework <ticket> ⟳ n/2` do ticket da linha selecionada; `rework —` | Idem; reproduz 01, 08, 09a, 10, 13a, 23a, 29a | y |
| Texto de atividade do agente | Uma tabela por papel e status no `design.md`. Onde ela dá texto diferente do frame, é D1 | "Montado pela TUI a partir da derivação"; o protótipo o escreve à mão e não é consistente entre cenários | y |
| Tokens de um agente | Soma de `input`, `output`, `cache_write` e `cache_read`, exibida em milhares arredondados (`41k`); `—` sem `usage` | O frame mostra um número por agente | y |
| Tabela de preços | Dólares por milhão de tokens, por `model` e tipo de token, num arquivo JSON apontado por `SQUAD_PRICES`; sem a variável, a tabela embutida em `broker/tui/prices.json`. Modelo fora da tabela custa zero | "Dólar calculado de uma tabela de preços em configuração" | y |
| Terminal maior que 120×40 | A tela é desenhada no canto superior esquerdo; o resto fica vazio | A grade é fixa | y |
| Glifo de largura dupla | `SQUAD_TUI_GLYPHS` troca glifos na saída (`⚠=!,⟳=~`). A sonda `bun tui/probe.ts` mede o terminal | Default da pergunta aberta 1 da fatia | y |
| Resultado da pergunta aberta 1 | No Windows Terminal 1.24.11911.0, `⚠`, `⟳` e os outros 41 glifos fora do ASCII que as telas usam contam uma célula cada (sonda rodada em 2026-10-09). A sonda mede o que o terminal conta, não o que a fonte desenha | "É a primeira coisa a ver funcionando, antes de qualquer tela" | y |
| Teclas de escrita e da aba 4 | `g`, `x`, `4` e `enter` sobre uma pergunta aberta mostram um aviso no rodapé (`chega com a fatia Gate` ou `Question`) e não mudam de tela | Os selos dos frames anunciam `g` e `x`; a tecla precisa responder | y |
| `b` | Move a seleção do feed para o `question` mais recente da pergunta bloqueante aberta mais antiga que chegou ao dev; sem nenhuma, avisa `nenhuma bloqueante` | "Pular para a próxima bloqueante" (N24) é desta fatia; a aba para onde o protótipo pula é da Question | y |
| Tela de thread sem ticket selecionado | `3` e `enter` abrem o thread do ticket da linha selecionada; se a linha não tem ticket, o do primeiro ticket do plano; sem plano, a tela diz `○ nenhum ticket ainda` | O protótipo abre sempre o TKT-12 | y |
| Entrada `result` do leader no thread (frame 03, 14:44:02 "ticket fechado") | Sai (D2) | O contrato não dá `ticket_ref` ao `result` do leader, e o leader não reporta ticket fechado | y |
| Feed pausado | `p` congela a lista de linhas e a seleção; a leitura do broker continua, e ao retomar o feed mostra o que chegou | "Pausar o feed" (N24) | y |
| Pergunta mesclada | Deixa de contar como aberta: quem a fez não fica `waiting` por ela e o holder não deve nada; fecha com a de destino | Fatia Question: "a mesclada sai da lista e segue a sorte da outra". É o que mantém o leader `working` no frame 01 | y |
| Leader entre o kickoff e o `plan` | Em turno, `idle`; fora de turno, `stalled` devendo o `plan` | Nenhuma regra acima de `idle` vale sem ticket no plano | y |
| Ticket descartado | Não é ticket em andamento do worker nem `result` à espera do judge | Fatia Event: descartado conta como concluído e libera o dono | y |
| `done` com todos os tickets do plano descartados | Vale `done` | A regra só exige os não descartados aprovados | y |
| Alcance de "sem reação" | O log inteiro; mensagem é qualquer evento com `to` igual ao nome | Entregas pendentes sobrevivem ao encerramento da feature | y |
| `timeout_s` de uma pergunta | Lido do `question` que chega a `human`; ausente, 240 | Pendência para a fatia Question: `/escalate` precisa copiar o campo | y |
| Linhas de entrada antes da feature | Um log legítimo tem o `peer_joined` de cada agente; nos frames em que o protótipo não os desenha, a régua `▲ antes da feature` ocupa uma linha e o feed desce (D1) | Sem os `peer_joined` todo agente seria `never` | y |
| Um só alerta de agente sem feature aberta, no rodapé | Sem a idade: `⚠ w1 bloqueado · ○ ocioso desde 14:53` | Frame 29c; com a idade o texto passa por cima do custo | y |
| `gate_decision` no feed | Sempre magenta claro, não verde ou vermelho pelo desfecho como no protótipo | TUI-28 | y |
| Ticket descartado no painel | Dono `—` | O descarte libera o dono | y |
| Testes | `bun test`, só unidade: derivação e desenho são funções puras; o laço de leitura recebe `fetch`, relógio e saída injetados. Um teste de integração sobe o broker real e lê `GET /events` | Convenção em uso | y |

**Open questions:** none - all resolved or logged above. As três primeiras linhas foram respondidas pelo dev em 2026-10-09.

Implicit-requirement dimensions: validação de entrada → TUI-56 a TUI-58 (variáveis de
ambiente), TUI-52 (resposta do broker que não é o formato esperado). Falha parcial →
TUI-51, TUI-52 (a tela mantém o último estado). Idempotência e repetição → TUI-50 (um
`seq` já visto não entra duas vezes). Fronteira de autenticação → N/A porque `GET /events`
não tem credencial e a TUI não escreve (TUI-55). Limite de taxa → N/A porque é uma leitura
por segundo em `127.0.0.1`. Concorrência e ordem → TUI-50 (ordem por `seq`). Ciclo de vida
do dado → N/A porque a TUI não guarda nada em disco. Observabilidade → TUI-51 (indicador
de conexão). Falha de dependência externa → TUI-51, TUI-52, TUI-53. Integridade de
transição → TUI-01 a TUI-18 (precedência dos status).

---

## Definições

Valem as das specs da Event e da Feature. Mais:

- **Log**: todos os eventos de `GET /events`, em ordem de `seq`.
- **Agora**: o relógio da máquina da TUI, em epoch ms, passado à derivação; ela não lê relógio.
- **Feature aberta**: a última de `features(log)` com `closed_seq` nulo.
- **Em turno**: entre os `turn_started` e `usage` do agente, o mais recente é `turn_started`.
- **Pedido de permissão aberto**: `permission_request` sem `permission_decision` que o cite em `request_seq` e sem evento do mesmo peer com `seq` maior.
- **Ticket em andamento**: para o worker, ticket da feature aberta de que ele é dono e cujo último evento de ticket é `task`; para o leader, algum ticket do plano nem aprovado nem descartado; para o judge, um `result` sem `verdict`; a mother nunca tem. Depois de um `verdict` de `rework` abaixo do limite o ticket continua `working`, mas a bola está com o leader: o worker dono não tem ticket em andamento nem dívida, e fica `idle`.
- **Frame**: as linhas de texto de um frame do protótipo, extraídas uma vez para `broker/test/frames/<id>.txt`.

---

## User Stories

### P1: Status derivado do log ⭐ MVP

**User Story**: Como dev, quero que o status de cada agente e de cada ticket saia do log por uma regra única, para que a tela e o broker nunca digam coisas diferentes.

**Why P1**: É a Key decision 5 e o ADR-006; toda tela desenha o resultado desta função.

**Acceptance Criteria**:

1. **TUI-01** WHEN o log não tem nenhum `peer_joined` nem `peer_left` de um nome do squad THEN a derivação SHALL dar a esse agente o status `never`.
2. **TUI-02** WHEN o último evento de presença de um nome é `peer_left` THEN a derivação SHALL dar ao agente o status `offline` e o `ts` desse `peer_left` como início.
3. **TUI-03** WHEN um agente no ar tem um `blocked` sem `unblocked` posterior com o seu nome em `peer` THEN a derivação SHALL dar ao agente o status `blocked`, com o `reason` desse `blocked`.
4. **TUI-04** WHEN um agente no ar tem um pedido de permissão aberto THEN a derivação SHALL dar ao agente o status `blocked`, com o `seq` do pedido aberto mais antigo.
5. **TUI-05** WHEN um agente no ar, sem `blocked`, é `asked_by` de uma pergunta bloqueante aberta THEN a derivação SHALL dar ao agente o status `waiting` com a marca de pergunta bloqueante e o `question_id`.
6. **TUI-06** WHEN um agente no ar, fora dos casos acima, enviou um `question` de uma pergunta ainda aberta, como quem perguntou ou como quem a encaminhou, ou um `gate` ainda pendente, e não tem ticket em andamento THEN a derivação SHALL dar ao agente o status `waiting`.
7. **TUI-07** WHEN um agente no ar, fora dos casos acima, deve um evento e não está em turno THEN a derivação SHALL dar ao agente o status `stalled`, com a dívida mais antiga.
8. **TUI-08** The derivação SHALL contar como dívida de um agente: para o worker, o `result` de um ticket seu em `working`; para o judge, o `verdict` de um `result` sem `verdict`; para o leader, o `task` depois de um `verdict` de `rework` abaixo do limite e o `plan` depois do kickoff; para qualquer agente, a resposta de uma pergunta aberta de que é holder.
9. **TUI-09** WHEN um agente no ar, fora dos casos acima, é worker com ticket em andamento, judge com `result` sem `verdict`, leader com algum ticket do plano nem aprovado nem descartado, ou mother com feature aberta THEN a derivação SHALL dar ao agente o status `working`.
10. **TUI-10** WHEN um agente no ar, fora dos casos acima, está numa feature aberta que tem `plan` e todos os tickets não descartados do `plan` mais recente estão aprovados THEN a derivação SHALL dar ao agente o status `done`.
11. **TUI-11** WHEN um agente no ar não cai em nenhum caso acima THEN a derivação SHALL dar ao agente o status `idle`.
12. **TUI-12** IF um agente satisfaz mais de uma regra THEN a derivação SHALL dar o primeiro status nesta ordem: `never`, `offline`, `blocked`, `waiting` com pergunta bloqueante, `waiting`, `stalled`, `working`, `done`, `idle`.
13. **TUI-13** WHEN não há feature aberta THEN a derivação SHALL dar a cada agente um status entre `never`, `offline`, `blocked` e `idle`.
14. **TUI-14** The derivação SHALL dar a cada ticket do plano mais recente ou com evento de ticket na feature aberta um status, o primeiro que valer nesta ordem: `dropped` se o plano mais recente o marca; `planned` se nunca recebeu `task`; `escalated` se tem três `verdict` de `rework`; `done` se o último evento do ticket é `verdict` de `approve`; `blocked` se o dono está `blocked` e o ticket é o seu ticket em andamento; `waiting` se o dono é `asked_by` de uma pergunta bloqueante aberta com esse `ticket_ref`; `review` se o último evento do ticket é `result`; `working` nos demais.
15. **TUI-15** The derivação SHALL considerar como evento de um ticket só `task`, `result` e `verdict`.
16. **TUI-16** WHEN um agente no ar tem uma mensagem endereçada a ele com `ts` 120000 ms ou mais antes de agora e nenhum evento dele com `seq` maior que o dela THEN a derivação SHALL dar a idade da mais antiga dessas mensagens como "sem reação".
17. **TUI-17** The derivação SHALL calcular o total de tokens de um agente como a soma, por `session_id` e `model`, do `usage` mais recente dele, e o total da feature aberta como esse valor menos o do último `usage` de cada `session_id` e `model` com `seq` menor que o do `feature_opened`.
18. **TUI-18** The derivação SHALL ser pura: os mesmos eventos e o mesmo agora dão o mesmo resultado, sem ler relógio, banco nem rede.

**Independent Test**: `bun test test/unit/derive-squad.test.ts` monta logs à mão e confere cada status.

---

### P1: Feed e tela principal ⭐ MVP

**User Story**: Como dev, quero ver numa tela o que cada agente está fazendo e o que foi dito, para acompanhar a feature sem entrar em terminal nenhum.

**Why P1**: É o frame 01, a tela em que o dev passa o tempo.

**Acceptance Criteria**:

1. **TUI-19** The TUI SHALL desenhar cada tela como uma função pura do estado derivado para um buffer de 120 colunas por 40 linhas de células com caractere, cor de frente, cor de fundo e negrito.
2. **TUI-20** WHEN o log tem um evento de `task`, `result`, `verdict`, `question`, `answer` de `resolved_by` `human` ou `agent`, `gate`, `gate_decision`, `permission_request` ou `permission_decision` THEN o feed SHALL ter uma linha com a hora, o rótulo curto de `from`, `→`, o rótulo curto de `to`, o kind entre colchetes e o `summary` cortado com `…` na coluna 84.
3. **TUI-21** WHEN o log tem um `answer` de `resolved_by` `timeout_default` ou `result_default` THEN o feed SHALL ter uma linha de sistema amarela `⟳ Q-<id> timeout · default aplicado: <answer>` ou `⟳ Q-<id> fechada · <rótulo> entregou antes da resposta`, sem `de → para`.
4. **TUI-22** WHEN o log tem um `blocked` THEN o feed SHALL ter a linha de sistema vermelha `⚠ <rótulo> [blocked] <reason>`.
5. **TUI-23** WHEN o log tem `refused` consecutivos no feed com o mesmo `peer`, `attempted_kind` e `error` THEN o feed SHALL ter uma única linha `✗ <rótulo> recusado · <attempted_kind> · <error>`, com ` ×N` a partir do segundo e a hora do primeiro.
6. **TUI-24** WHEN o log tem `feature_opened`, `feature_closed`, `plan`, `peer_joined`, `peer_left` ou `question_merged` THEN o feed SHALL ter a linha de sistema correspondente: `▶ feature aberta · <título>`, `✓ feature encerrada · entregue` ou `✗ feature encerrada · abandonada`, `▶ plano v<N> de ldr · <n> tickets`, `● <rótulo> entrou` ou `● <rótulo> voltou`, `○ <rótulo> saiu · sessão morta` ou `○ <rótulo> saiu · sessão encerrada`, `⟳ Q-<id> mesclada em Q-<into> pela mother`.
7. **TUI-25** WHEN um `usage` encerra um turno e o status do agente, calculado só com os eventos até ele, é `stalled` THEN o feed SHALL ter a linha `‖ <rótulo> [stalled] deve <dívida>` com a hora desse `usage`.
8. **TUI-26** WHEN um ticket recebe o terceiro `verdict` de `rework` THEN o feed SHALL ter, logo depois da linha desse `verdict`, a linha `⚠ <ticket> no limite ⟳ 2/2 · sem 3º rework`.
9. **TUI-27** The feed SHALL não ter linha para `turn_started`, `unblocked` nem para um `usage` fora do caso de TUI-25.
10. **TUI-28** The feed SHALL desenhar o kind `answer` em azul, `gate` e `gate_decision` em magenta claro, `verdict` de `rework` e `permission_decision` de `deny` em vermelho claro, e `verdict` de `approve` e `permission_decision` de `allow` em verde claro.
11. **TUI-29** WHEN há feature aberta e o log tem linhas anteriores ao `feature_opened` dela THEN o feed SHALL desenhar essas linhas em cinza, acima de uma régua `▲ anterior · <título> · ✓ entregue` ou `✗ abandonada`, ou `▲ antes da feature · entradas no broker` se não houve feature antes.
12. **TUI-30** WHILE não há feature aberta e o log tem um `feature_closed` the feed SHALL desenhar em cinza as linhas anteriores ao último `feature_closed`, manter a cor dessa linha e das posteriores, e desenhar logo abaixo dela a faixa `squad ocioso desde <hora> · sem feature ativa`, ou `squad sem feature desde <hora> · <N> fora de [idle]` quando N agentes estão `blocked` ou `offline`.
13. **TUI-31** WHILE o log não tem nenhuma feature the feed SHALL desenhar a faixa `broker no ar desde <hora> · nenhuma feature ainda`, com a hora do primeiro evento do log, e `○ log vazio` quando o log não tem evento.
14. **TUI-32** The feed SHALL mostrar as últimas 33 linhas, ou rolar para manter a linha selecionada visível quando ela está acima delas.
15. **TUI-33** The linha 0 SHALL mostrar, com feature aberta, o projeto, `›`, o título cortado com `…` no espaço que sobra à esquerda do contador de perguntas, e `workflow <workflow>` inteiro; sem feature aberta, `○ sem feature aberta` em cinza; sem nenhuma feature no log, `○ nenhuma feature ainda`.
16. **TUI-34** The linha 0 SHALL mostrar o contador `? N` das perguntas abertas cujo holder é `human`, com fundo vermelho se alguma é bloqueante, o indicador `broker ● conectado` e o relógio.
17. **TUI-35** The painel de agentes SHALL mostrar, para cada um dos seis nomes, o glifo e o rótulo do status, o papel, o texto de atividade e uma terceira linha que é a primeira que existir entre: `sem sessão no broker`; `◌ sessão morta há <idade>`; `x <tool> · <primeira linha de input_preview>`; `‖ deve <dívida>`; `⚠ <reason>`; `? Q-<id> bloqueante · <holder>`, com `dev` para `human` e o rótulo curto para um agente; `sem reação há <idade>`; o `loadout` do `task` do ticket em andamento; `sem loadout`.
18. **TUI-36** The título do painel de agentes SHALL ser `agentes · 6` quando nenhum agente é `never` e `agentes · <n>/6 no ar` caso contrário.
19. **TUI-37** The painel de tickets SHALL mostrar cada ticket com a referência, o título, o dono, `⟳n/2` com n limitado a 2, o status entre colchetes e uma nota: `dep <tickets>` para `planned` com `depends_on`, `◌ parado` com o dono `offline`, `‖ parado` com o dono `stalled`, `→ mot` para `escalated`, `? dev` para `waiting`.
20. **TUI-38** WHEN não há ticket THEN o painel de tickets SHALL mostrar `○ nenhum ticket ainda` com feature aberta, e `○ sem feature aberta` sem ela, com as duas linhas de explicação dos frames 26a, 09a e 28a.
21. **TUI-39** The painel de detalhe SHALL mostrar, para a linha selecionada do feed: de uma mensagem, `msg #<seq>`, kind, de, para, hora, ticket e rework, o `body` quebrado em 30 colunas, os critérios de um `verdict`, as cinco últimas mensagens do ticket e o loadout; de uma linha de sistema, o bloco do seu tipo, como nos frames 10, 13a, 13c, 23a, 24a, 25a, 26a e 27a.
22. **TUI-40** WHEN nenhuma linha está selecionada e não há feature aberta THEN o painel de detalhe SHALL mostrar o resumo da última feature fechada: desfecho e hora, título, a decisão de gate de `approve` se houver, o `body` do `feature_closed` como motivo ou `sem motivo registrado` numa abandonada, tickets aprovados sobre o total com o status em que cada um parou, perguntas por tipo de resolução, duração da abertura ao encerramento, número de mensagens e custo.
23. **TUI-41** The rodapé SHALL mostrar os tokens de cada agente, `│ feature ≈$<total> est.` ou `│ sessão ≈$<total> est.`, e o lado direito definido em Assumptions.
24. **TUI-42** WHEN `t` é pressionada com feature aberta THEN a TUI SHALL alternar o rodapé entre os tokens da feature aberta e os da sessão; sem feature aberta, SHALL mostrar os da sessão e avisar `sem feature aberta · só a sessão`.
25. **TUI-43** WHEN um log de teste reproduz o estado de um frame de leitura THEN o desenho SHALL ser igual ao frame em toda linha que não esteja na tabela de desvios do teste, e cada desvio SHALL ter a classe D1, D2 ou D3.

**Independent Test**: `bun test test/unit/tui-frames.test.ts` desenha os frames 01, 09a, 10 e os demais da tela principal a partir de logs montados.

---

### P1: Topologia, thread, legenda e estados da tela ⭐ MVP

**User Story**: Como dev, quero ver a estrela com a aresta ativa, o histórico de um ticket e a legenda, para entender quem fala com quem e por que um ticket está onde está.

**Why P1**: São as telas 02, 03 e 11 da fatia.

**Acceptance Criteria**:

1. **TUI-44** The tela de topologia SHALL desenhar o nó do dev, os seis nós com glifo, nome, status e atividade, as arestas da estrela em cinza e, em cor clara e traço grosso, a aresta do par `de → para` do evento de mensagem mais recente; sem feature aberta, essa aresta na cor normal com o rótulo `○ última`.
2. **TUI-45** The painel `arestas` SHALL mostrar a aresta ativa, as seis últimas mensagens, as perguntas abertas com holder `human`, o volume das cinco arestas com mais mensagens e os reworks por ticket.
3. **TUI-46** The tela de thread SHALL mostrar, para um ticket, o cabeçalho com dono, abertura, desfecho e rework; as entradas `task`, `result`, `verdict`, `question` e `answer` do ticket em ordem, cada uma com hora, kind, de, para, a anotação derivada e o `summary`; a linha de fluxo; e, à direita, a matriz de critérios por `verdict`, os vereditos com `passou/total`, as notas do judge e as perguntas do ticket.
4. **TUI-47** The anotação de uma entrada do thread SHALL ser: num `result`, o tempo desde o `task` que ele cita; num `verdict`, `REWORK ⟳ n/2 · p/t` ou `APPROVE · p/t`, e `REPROVADO · p/t · limite atingido` no terceiro `rework`; num `task` depois de um `rework`, `rework n/2`; num `question`, `Q-<id>`, `[BLOQUEANTE]` se bloqueante, e a rota; num `answer`, `Q-<id>` e o tempo no dev quando `resolved_by` é `human`.
5. **TUI-48** WHEN o ticket do thread está `planned` THEN a tela SHALL mostrar `○ sem linha do tempo` com o título, as dependências e o dono `—`, como no frame 24d; WHEN está `dropped`, SHALL terminar com a entrada `[dropped]` do `plan` que o descartou.
6. **TUI-49** The tela de legenda SHALL ser igual ao frame 11 em toda linha que não cite uma tecla ou tela fora desta fatia.
7. **TUI-50** WHEN `GET /events?after=<cursor>` responde `{ events, last_seq }` THEN a TUI SHALL acrescentar ao log os eventos com `seq` maior que o cursor, em ordem de `seq`, e avançar o cursor para `last_seq`.
8. **TUI-51** IF a leitura falha por conexão recusada, tempo esgotado ou status diferente de 200 THEN a TUI SHALL manter o último estado, desenhar a tela do frame 12 com `broker ○ desconectado · <N>s` e o número da tentativa, e tentar de novo a cada intervalo de leitura.
9. **TUI-52** IF a resposta tem status 200 e não é JSON com `events` em lista e `last_seq` inteiro THEN a TUI SHALL tratá-la como falha de leitura (TUI-51) e não mudar o log.
10. **TUI-53** WHEN uma leitura volta a responder depois de uma falha THEN a TUI SHALL voltar à tela normal e continuar do cursor em que parou.
11. **TUI-54** WHILE o terminal tem menos de 120 colunas ou menos de 40 linhas the TUI SHALL desenhar só a mensagem do frame 21 com o tamanho atual, e voltar à tela quando o tamanho bastar.
12. **TUI-55** The TUI SHALL não enviar ao broker nenhum pedido além de `GET /events`.

**Independent Test**: `bun test test/unit/tui-frames.test.ts` para 02, 03, 11, 12 e 21; `bun test test/unit/tui-loop.test.ts` com `fetch` falso para a leitura.

---

### P1: Rodar no terminal ⭐ MVP

**User Story**: Como dev, quero abrir a TUI com um comando, mover a seleção pelo teclado e sair deixando o terminal como estava.

**Why P1**: Sem isto as telas só existem nos testes.

**Acceptance Criteria**:

1. **TUI-56** WHERE `SQUAD_TUI_GLYPHS` está definida como pares `glifo=substituto` separados por vírgula the TUI SHALL escrever o substituto no lugar do glifo; IF um par não tem exatamente um caractere de cada lado THEN a TUI SHALL sair com código 1 e uma mensagem que cita o par.
2. **TUI-57** WHERE `SQUAD_PRICES` aponta um arquivo the TUI SHALL calcular o custo com a tabela dele; IF o arquivo não existe ou não é um objeto JSON de `model` para `{ input, output, cache_write, cache_read }` numéricos THEN a TUI SHALL sair com código 1 e uma mensagem que cita o caminho.
3. **TUI-58** IF `SQUAD_POLL_INTERVAL_MS` não é um inteiro positivo THEN a TUI SHALL ler a cada 1000 ms.
4. **TUI-59** WHEN `bun tui/probe.ts` roda num terminal THEN ela SHALL escrever a largura em células de cada glifo fora do ASCII usado pelas telas e sair com 0 se todas são 1 e com 2 se alguma não é; fora de um terminal, SHALL sair com 1.
5. **TUI-60** WHEN a TUI sobe THEN ela SHALL entrar na tela alternativa, esconder o cursor e pôr a entrada em modo cru; WHEN ela sai por `q`, `ctrl+c`, `SIGTERM` ou erro não tratado THEN SHALL restaurar os três antes de terminar.
6. **TUI-61** The TUI SHALL escrever a cada desenho só as linhas do buffer que mudaram desde o desenho anterior, com as 16 cores ANSI e negrito.
7. **TUI-62** WHEN uma tecla é pressionada THEN a TUI SHALL: com `1`, `2`, `3`, `?` trocar de tela; com `esc` voltar à principal; com `j` `k` `↑` `↓` mover a seleção do feed, ou rolar o thread; com `tab` e `shift+tab` trocar o painel em foco; com `enter` abrir o thread do ticket da linha selecionada; com `[` e `]` ir ao ticket anterior e ao seguinte no thread; com `p` pausar e retomar o feed, com `○ pausado` no título; com `b` ir à bloqueante; com `q` sair.
8. **TUI-63** WHEN `g`, `x`, `4` ou `enter` sobre o `question` de uma pergunta aberta com holder `human` é pressionada THEN a TUI SHALL mostrar por 4 s no rodapé `chega com a fatia Gate` (para `g` e `x`) ou `chega com a fatia Question`, e não trocar de tela.
9. **TUI-64** The TUI SHALL tomar o nome do projeto do repositório do diretório em que foi lançada, pela regra `projectOf` do broker, e mostrar o rótulo `feature` no lugar dele fora de um repositório.

**Independent Test**: `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários, `bun broker.ts` e `bun tui.ts` num Windows Terminal de 120×40.

---

## Edge Cases

- IF o log tem um evento de kind que a TUI não conhece THEN a TUI SHALL ignorá-lo no feed e na derivação.
- IF um evento tem `from` ou `to` fora dos seis nomes, de `human`, `broker` e `*` THEN o feed SHALL mostrar os três primeiros caracteres do nome.
- IF `summary` tem quebra de linha THEN o feed SHALL mostrar só a primeira linha.
- WHEN o título da feature tem mais caracteres que o espaço da linha 0 THEN a TUI SHALL cortá-lo com `…` e manter `workflow`, `? N`, o indicador do broker e o relógio no lugar (frame 26c).
- WHEN a seleção está numa linha e chegam eventos novos THEN a TUI SHALL manter a mesma linha selecionada.
- WHEN o broker é reiniciado com um banco novo e `last_seq` é menor que o cursor THEN a TUI SHALL esvaziar o log e ler desde o cursor 0.
- IF um `permission_decision` cita um `request_seq` que não é um `permission_request` THEN a derivação SHALL ignorá-lo.
- IF dois `peer_joined` do mesmo nome aparecem sem `peer_left` entre eles THEN a derivação SHALL tratar o agente como no ar.
- WHEN o terminal é redimensionado THEN a TUI SHALL redesenhar a tela inteira.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TUI-01 | P1: Status derivado do log | Specify | Implementing |
| TUI-02 | P1: Status derivado do log | Specify | Implementing |
| TUI-03 | P1: Status derivado do log | Specify | Implementing |
| TUI-04 | P1: Status derivado do log | Specify | Implementing |
| TUI-05 | P1: Status derivado do log | Specify | Implementing |
| TUI-06 | P1: Status derivado do log | Specify | Implementing |
| TUI-07 | P1: Status derivado do log | Specify | Implementing |
| TUI-08 | P1: Status derivado do log | Specify | Implementing |
| TUI-09 | P1: Status derivado do log | Specify | Implementing |
| TUI-10 | P1: Status derivado do log | Specify | Implementing |
| TUI-11 | P1: Status derivado do log | Specify | Implementing |
| TUI-12 | P1: Status derivado do log | Specify | Implementing |
| TUI-13 | P1: Status derivado do log | Specify | Implementing |
| TUI-14 | P1: Status derivado do log | Specify | Implementing |
| TUI-15 | P1: Status derivado do log | Specify | Implementing |
| TUI-16 | P1: Status derivado do log | Specify | Implementing |
| TUI-17 | P1: Status derivado do log | Specify | Implementing |
| TUI-18 | P1: Status derivado do log | Specify | Implementing |
| TUI-19 | P1: Feed e tela principal | Specify | Implementing |
| TUI-20 | P1: Feed e tela principal | Specify | Implementing |
| TUI-21 | P1: Feed e tela principal | Specify | Implementing |
| TUI-22 | P1: Feed e tela principal | Specify | Implementing |
| TUI-23 | P1: Feed e tela principal | Specify | Implementing |
| TUI-24 | P1: Feed e tela principal | Specify | Implementing |
| TUI-25 | P1: Feed e tela principal | Specify | Implementing |
| TUI-26 | P1: Feed e tela principal | Specify | Implementing |
| TUI-27 | P1: Feed e tela principal | Specify | Implementing |
| TUI-28 | P1: Feed e tela principal | Specify | Implementing |
| TUI-29 | P1: Feed e tela principal | Specify | Implementing |
| TUI-30 | P1: Feed e tela principal | Specify | Implementing |
| TUI-31 | P1: Feed e tela principal | Specify | Implementing |
| TUI-32 | P1: Feed e tela principal | Specify | Implementing |
| TUI-33 | P1: Feed e tela principal | Specify | Implementing |
| TUI-34 | P1: Feed e tela principal | Specify | Implementing |
| TUI-35 | P1: Feed e tela principal | Specify | Implementing |
| TUI-36 | P1: Feed e tela principal | Specify | Implementing |
| TUI-37 | P1: Feed e tela principal | Specify | Implementing |
| TUI-38 | P1: Feed e tela principal | Specify | Implementing |
| TUI-39 | P1: Feed e tela principal | Specify | Implementing |
| TUI-40 | P1: Feed e tela principal | Specify | Implementing |
| TUI-41 | P1: Feed e tela principal | Specify | Implementing |
| TUI-42 | P1: Feed e tela principal | Specify | Implementing |
| TUI-43 | P1: Feed e tela principal | Specify | Implementing |
| TUI-44 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-45 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-46 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-47 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-48 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-49 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-50 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-51 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-52 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-53 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-54 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-55 | P1: Topologia, thread, legenda e estados da tela | Specify | Implementing |
| TUI-56 | P1: Rodar no terminal | Specify | Implementing |
| TUI-57 | P1: Rodar no terminal | Specify | Implementing |
| TUI-58 | P1: Rodar no terminal | Specify | Implementing |
| TUI-59 | P1: Rodar no terminal | Specify | Implementing |
| TUI-60 | P1: Rodar no terminal | Specify | Pending |
| TUI-61 | P1: Rodar no terminal | Specify | Implementing |
| TUI-62 | P1: Rodar no terminal | Specify | Implementing |
| TUI-63 | P1: Rodar no terminal | Specify | Implementing |
| TUI-64 | P1: Rodar no terminal | Specify | Pending |

**Coverage:** 64 total, 0 mapped to tasks, 64 unmapped.

---

## Success Criteria

- [ ] Com um broker de teste no ar e um log de uma feature de dois tickets, `bun tui.ts` mostra a tela principal, a topologia, o thread e a legenda, e acompanha eventos novos em até um intervalo de leitura.
- [ ] Os 41 frames de leitura passam como casos de teste, com todo desvio classificado.
- [ ] Derrubar o broker congela a tela com o indicador de desconexão; subi-lo de novo a descongela sem reiniciar a TUI.
- [ ] `bun node_modules/typescript/bin/tsc --noEmit` e `bun test` passam no Windows e no Linux, ou a spec registra qual dos dois ficou sem rodar.
