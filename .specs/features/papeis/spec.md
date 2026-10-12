# Papéis Specification

Fonte: fatia Papéis de `.design/squad-mvp.md`, ADR-003, ADR-005, ADR-006, ADR-008, ADR-009,
ADR-010, ADR-011 e ADR-012, STATE AD-001, AD-002, AD-003, AD-007, AD-011, AD-012 e AD-013, o
Handoff de `.specs/STATE.md`, `docs/fase-0/teste-1.md` e `docs/fase-0/spikes.md`. Esta spec
deriva da fatia; onde a fatia não decide, a escolha está em "Assumptions & Open Questions".

## Problem Statement

O broker já grava `turn_started`, `usage` e `permission_request`, expõe as tools por papel e
responde `/state`, e nada faz uma sessão do Claude Code virar um papel: o dev monta o
ambiente à mão, nenhum hook marca o turno nem lê o uso, e nenhum agente sabe o protocolo.
Falta o que liga uma sessão real ao contrato: o plugin (servidor MCP, hooks e as quatro
skills de protocolo), o `roles.json` e o launcher que sobe cada sessão no lugar certo.

## Goals

- [ ] `squad start <papel> [nome]` abre uma sessão do Claude Code com nome e papel no ambiente, no worktree do papel, com o plugin carregado como canal, a lista de permitidos e a skill do papel como primeira instrução.
- [ ] Todo turno de uma sessão registrada deixa um `turn_started` no início e um `usage` com o acumulado da sessão no fim, sem o agente gastar turno com isso.
- [ ] Uma sessão que encerra o turno devendo um evento é devolvida ao trabalho uma vez, com o que falta dito.
- [ ] As quatro skills de protocolo dizem a cada papel o que fazer com cada evento que recebe, e proíbem o que a Fase 0 e a fatia Question mandaram proibir.
- [ ] A spec diz o que os testes automáticos cobrem e o que só uma sessão real mostra; o que foi exercitado com sessão real e o que ficou sem exercitar está em `real-sessions.md`.
- [ ] A suíte passa no Windows e no Linux.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Pedido e decisão de gate (`/gate`, `/gate-decision`, tool de gate), modal de gate e modal de permissão da TUI, teclas `g` e `x` | Fatia Gate (Handoff). A skill da mother leva uma seção marcada que a Gate reescreve |
| A decisão de permissão por tecla na TUI | Fatia Gate. Esta fatia fecha o estado até a rota `POST /permission-decision`, que já existe (decidido pelo dev em 2026-10-11) |
| Subir todas as sessões de uma vez, worker sob demanda, quarto worker | Default 1 do design e Boundary |
| Instalar as skills base do `roles.json` no projeto | O registry tem o comando de instalação; o projeto referencia por nome |
| Publicar o plugin num marketplace | O launcher carrega o plugin do diretório; a cópia que o Claude Code faz de um plugin instalado não leva `broker/` junto |
| Reinício automático de sessão morta | Boundary: a sessão é relançada à mão com o mesmo nome |
| Remover worktrees, limpar branches de ticket | Nenhuma linha da fatia; o dev usa `git worktree remove` |
| Comandos do projeto (testes, build) na lista de permitidos | Vêm do `.claude/settings.json` do próprio repositório, que todo worktree tem por ser versionado |
| Pergunta de cima para baixo, `verdict` entregue ao dono do ticket | Decidido na Fase 0: o contrato não muda |
| Tela de tokens na TUI | Já lê `usage` desde a TUI leitura; esta fatia só entrega o evento |
| macOS | Não exercitado em nenhuma fatia |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| **Modo de permissão** (pergunta ao dev, default 3) | `--permission-mode acceptEdits` e uma lista de permitidos: as tools do squad do papel e git local por papel. `--skip-permissions` troca os dois por `--dangerously-skip-permissions` | Respondido pelo dev em 2026-10-11. Sem `--permission-mode` a sessão sobe no modo default da máquina do dev (`auto` na dele), então o launcher sempre passa o modo | y |
| **Formato do `roles.json`** (pergunta ao dev, default 4) | `{ "roles": [ { "name", "when_to_use", "skills": [...], "workflows": { "tlc": [...], "matt-pocock": [...] } } ] }` | Respondido pelo dev em 2026-10-11, depois da comparação com `skills/setup-fassi-skills/manifest.json` do registry em `8a33ffd`: o manifest agrupa por lista de objetos com `name`, `when_to_use` e `skills` (é a forma de `workflows[]`) e tem a `workflow_rule`, que a lista do START.md quebrava ao misturar os dois workflows no mesmo papel | y |
| **Pedido de permissão** (pergunta ao dev) | A fatia prova com sessão real que o servidor carregado pelo plugin grava o `permission_request` e devolve o veredito de um `POST /permission-decision`. Nenhum código novo no broker | Respondido pelo dev em 2026-10-11. O relay já existe desde a Event; o spike A não testou servidor vindo de plugin | y |
| **Ação irreversível até a fatia Gate** (pergunta ao dev) | A mother escala a pergunta bloqueante ao dev e não a responde por conta própria; antes da entrega final faz ao dev uma pergunta bloqueante com o commit e a ação | Respondido pelo dev em 2026-10-11. O pedido de gate é da fatia Gate | y |
| Spike: o hook de fim de turno recebe o caminho do transcript? | Recebe. O uso é lido do transcript pelo hook `Stop`; o plano de volta do design não é usado | Três sessões reais no Claude Code 2.1.296 com um plugin descartável (2026-10-11): o `Stop` de um plugin traz `transcript_path`, o arquivo tem todas as linhas do turno, e a soma por `message.id` deu os números do próprio CLI (6, 323, 12198 e 79889) | y |
| Como o plugin é carregado | `--plugin-dir <plugin>` com `--dangerously-load-development-channels plugin:squad@inline` | Sessão interativa real: o ping chegou, `ready` registrou e `peer_joined` foi gravado, sem marketplace. A documentação só mostra a forma com marketplace | y |
| Nome das tools e do canal | Vindas de um plugin, as tools se chamam `mcp__plugin_squad_squad__<tool>` e o canal chega com `source="plugin:squad:squad"`. O AD-003 previa `mcp__squad__*` | Visto na sessão real. O servidor deixa de escrever o `source` nos textos que o modelo lê | y |
| Como os hooks se identificam ao broker | O servidor MCP grava a credencial da sessão num arquivo ao lado do banco, `<SQUAD_DB>.<nome>.id`, e os hooks a leem | Os hooks são processos à parte e as rotas exigem `{ id }`; o ambiente da sessão (`SQUAD_*`) chega aos hooks. Mesmo limite cooperativo da credencial humana (AD-007). Ao lado do banco para que um teste com `SQUAD_DB` temporário nunca escreva no home | y |
| O que decide a volta ao trabalho | A regra de status do contrato (`squad` de `broker/shared/derive.ts`) sobre `GET /events`, como se o turno tivesse acabado; não o `owed` de `/state` sozinho | O design diz "consulta `/state`", mas o `owed` não sabe de `blocked` nem de pergunta bloqueante aberta: um worker à espera do dev seria empurrado de volta a cada turno. `stalled` fica definido num lugar só (ADR-006). `/state` continua sendo o que a skill consulta ao começar | y |
| `usage` quando o hook devolve o agente ao trabalho | Não é enviado: o turno não acabou | `usage` é a marca de fim de turno; enviado antes, o agente apareceria `stalled` enquanto paga a dívida | y |
| Uso de subagentes | Somado: o hook lê também `<transcript sem .jsonl>/subagents/*.jsonl` | "Soma o uso da sessão inteira". Visto no 2.1.296: o transcript de um subagente fica nesse diretório, com `message.usage` igual. O formato é interno ao Claude Code e pode mudar | y |
| Linhas repetidas do transcript | Uma mensagem com vários blocos vira várias linhas com o mesmo `message.id` e o mesmo `usage`; conta a última de cada id | Visto no 2.1.296; sem isso o total dobra | y |
| Fim de turno sem transcript legível | Um `usage` com `model` `unknown` e os quatro números zero | A marca de fim de turno não pode faltar, e zero não muda nenhum total | y |
| Onde ficam os worktrees | `<SQUAD_WORKTREES>/<nome>`, default `<pai do checkout principal>/<nome do checkout principal>.squad/<nome>` | Fora do repositório, para não aparecer no `git status` nem ser lido como parte do projeto | y |
| Worktree sem feature aberta | HEAD destacado no `HEAD` do checkout principal, para os três papéis. Com feature aberta: worker e judge destacados na ponta do branch da feature, leader no branch da feature | O dev pode subir as sessões antes de a mother abrir a feature. O worker cria o branch do ticket a partir do branch da feature ao receber o `task`, o leader troca para o branch da feature no kickoff e o judge vai ao commit de cada `result` (ADR-012) | y |
| Sessão relançada | O worktree que já existe é usado como está: nenhum comando git, nenhuma cópia de `.env*` | Pode ter trabalho sem commit da sessão que morreu | y |
| Quais `.env*` são copiados | Os arquivos regulares da raiz do checkout principal cujo nome começa com `.env` e que o git não versiona, sem sobrescrever | Default 5 do design; os versionados já vêm no checkout | y |
| Nome default do worker | O primeiro de `worker-1`, `worker-2`, `worker-3` que não está online no log; com o broker sem responder, `worker-1` | `squad start <papel> [nome]`: o nome é opcional. Sem isso o segundo `squad start worker` morreria em `name_taken` dentro da sessão | y |
| Git na lista de permitidos | Todos: `git status`, `git diff`, `git log`, `git show`, `git rev-parse`. Worker, leader e mother: mais `git switch`, `git add`, `git commit`. Judge: mais `git switch`. Leader: mais `git merge`. Nunca `push`, `reset`, `checkout`, `rm` | Aprovado pelo dev em 2026-10-11. `git rev-parse` dá o hash do `result`; o judge vai ao commit com `git switch --detach`. O merge da entrega, que é da mother, fica de fora de propósito: pede permissão no terminal dela | y |
| Tool `PowerShell` | No Windows cada regra de git entra também como `PowerShell(...)` | No Windows a sessão tem as duas tools de shell | y |
| `help-me` no `roles.json` | Fica na lista do leader | Está no START.md e é skill do próprio registry (`skills/help-me`), embora fora de `skills[]` do manifest. As outras 20 estão em `skills[]` com esses nomes | y |
| Como o launcher passa as skills base | Em `--append-system-prompt`, com nome, papel e as listas do `roles.json` | Determinístico e testável; a skill de papel manda usar só as do workflow da feature aberta | y |
| Comando `squad` | `broker/cli.ts`, com `bin.squad` no `package.json` do broker: `start`, `tui`, `status`, `kill-broker` | Default 6. O CLI e a TUI já vivem em `broker/` (AD-001, AD-010); o plugin fica em `plugin/` | y |
| Idioma das skills | Inglês | É o das tools e das instruções do servidor MCP | y |
| Eventos acumulados num turno marcam um `turn_started` só? | Não resolvido; a regra de "em turno" funciona com um ou com vários | Pergunta deixada pelo spike B. Fica em `real-sessions.md` como não exercitado se nenhuma sessão real mostrar | y |

**Open questions:** none - all resolved or logged above. As quatro primeiras linhas foram respondidas pelo dev em 2026-10-11.

Implicit-requirement dimensions: validação de entrada → PAP-33, PAP-41, PAP-42, PAP-20 a
PAP-22. Falha parcial → PAP-08, PAP-13, PAP-27, PAP-31, PAP-57. Idempotência e repetição →
PAP-25 (acumulado), PAP-29 (uma volta por turno), PAP-55 (relançar). Fronteira de
autenticação → PAP-06 a PAP-09 (a credencial num arquivo, limite cooperativo); limite de
taxa N/A porque cada hook faz no máximo duas leituras e um envio por modelo, por turno, em
`127.0.0.1`. Concorrência e ordem → PAP-23 (ordem dos envios), PAP-28 (bloqueio antes do
uso); corrida entre hooks de sessões diferentes N/A porque cada um usa a credencial da sua
sessão e o broker serializa. Ciclo de vida do dado → PAP-07 (o arquivo de credencial sai
com a sessão), PAP-55 (o worktree fica). Observabilidade → PAP-10, PAP-23 (os próprios
eventos), PAP-41 (mensagens do launcher). Falha de dependência externa → PAP-13, PAP-27,
PAP-31 (broker), PAP-24 (transcript), PAP-57 (git), PAP-50 (Claude Code). Integridade de
transição → PAP-28 a PAP-32 (a volta ao trabalho segue a regra de status).

## Definições

Valem as das specs anteriores. Mais:

- **Sessão do squad**: processo com `SQUAD_ROLE` não vazio no ambiente.
- **Arquivo de credencial** de um nome: o caminho de `SQUAD_DB` (default `<home>/.squad-code-mcp.db`) seguido de `.<nome>.id`.
- **Checkout principal**: a primeira árvore de trabalho de `git worktree list --porcelain`, de onde quer que o comando rode.
- **Diretório de worktrees**: `SQUAD_WORKTREES`, ou `<pai do checkout principal>/<nome do diretório do checkout principal>.squad`.
- **Feature aberta, para o launcher**: a feature sem `feature_closed` em `GET /events?after=0`, lido com prazo de 2000 ms. Se a leitura falha não há feature aberta e ninguém está online.
- **Tools do squad de um papel**: `ready` mais as de `toolsFor(papel)` de `broker/tools.ts`, cada uma com o prefixo `mcp__plugin_squad_squad__`.
- **Linha contada** de um transcript: linha que é um objeto JSON com `type` `assistant`, `message.usage` objeto e `message.model` texto não vazio diferente de `<synthetic>`.
- **Transcripts da sessão**: o arquivo de `transcript_path` e todo `*.jsonl` de `<transcript_path sem a extensão .jsonl>/subagents/`.
- **Fim de turno hipotético**: o log de `GET /events?after=0` mais um `usage` do nome com `seq` e `ts` depois dos últimos.
- **Raiz do squad**: o diretório que contém `broker/` e `plugin/`.

---

## O que os testes automáticos cobrem e o que só uma sessão real mostra

Os testes automáticos rodam o launcher com git real em repositórios temporários e um
`spawn` falso, os hooks como processos reais contra um broker real com transcripts de
fixture, e o servidor MCP por um cliente MCP de teste. Eles provam o que este código faz
com uma entrada. Não provam que o Claude Code entrega essa entrada: isso só uma sessão real
mostra. Cada item abaixo é exercitado com sessão real ou registrado como não exercitado em
`.specs/features/papeis/real-sessions.md`, com a evidência.

| Id | Só uma sessão real mostra |
| -- | ------------------------- |
| RS-01 | O Claude Code carrega o plugin por `--plugin-dir`: as skills aparecem como `squad:<papel>` e o servidor conecta |
| RS-02 | O canal de desenvolvimento aceita `plugin:squad@inline`: o ping chega, o modelo chama `ready` e o broker grava `peer_joined` |
| RS-03 | A primeira instrução `/squad:<papel>` roda a skill do papel numa sessão interativa |
| RS-04 | Com `acceptEdits` e a lista do launcher, uma tool do squad e um `git` da lista rodam sem pedido, e um comando fora da lista pede permissão |
| RS-05 | O hook de início dispara em turno digitado e em turno aberto pelo canal, e o `turn_started` aparece no log |
| RS-06 | O hook de fim dispara com `transcript_path`, e o `usage` gravado tem os números que o próprio Claude Code reporta para a sessão |
| RS-07 | Um `{"decision":"block"}` do hook de fim devolve o agente ao trabalho, e a segunda parada do mesmo turno passa |
| RS-08 | Uma sessão lançada pelo launcher de dentro de outra sessão do Claude Code grava transcript |
| RS-09 | Pelo servidor do plugin: o pedido de permissão vira `permission_request`, e um `POST /permission-decision` libera (`allow`) ou nega (`deny`) a sessão |
| RS-10 | Com as quatro skills, quatro sessões levam uma feature de dois tickets do kickoff à pergunta de entrega, sem aviso de recebimento |
| RS-11 | Uma pergunta até o dev, um rework e um pedido de credencial com as skills reais |
| RS-12 | O launcher e uma sessão no Linux |
| RS-13 | Eventos acumulados num turno marcam um `turn_started` ou vários |
| RS-14 | `squad` instalado por `bun link` abre a sessão no Windows e no Linux |

O que os testes de conteúdo das skills (PAP-60 a PAP-63) cobrem é a estrutura do arquivo,
as tools citadas e os comandos literais. Se o agente segue o texto, só RS-10 e RS-11 mostram.

---

## User Stories

### P1: Plugin em diretório próprio ⭐ MVP

**User Story**: Como dev, quero o servidor MCP, os hooks e as skills num plugin, para que uma flag os ligue numa sessão sem configuração manual.

**Why P1**: Default 2 do design; sem o plugin os hooks seriam configuração por sessão.

**Acceptance Criteria**:

1. **PAP-01** O repositório SHALL ter `plugin/.claude-plugin/plugin.json` com `name` igual a `squad`, e nenhum arquivo do plugin dentro de `broker/`.
2. **PAP-02** `plugin/.mcp.json` SHALL declarar em `mcpServers` um único servidor, `squad`, com `command` `bun` e `args` `["${CLAUDE_PLUGIN_ROOT}/../broker/server.ts"]`.
3. **PAP-03** `plugin/hooks/hooks.json` SHALL declarar em `hooks` exatamente `UserPromptSubmit` e `Stop`, cada um com um único hook de `type` `command`: `bun "${CLAUDE_PLUGIN_ROOT}/hooks/turn-started.ts"` com `timeout` 10, e `bun "${CLAUDE_PLUGIN_ROOT}/hooks/stop.ts"` com `timeout` 20.
4. **PAP-04** O plugin SHALL ter exatamente quatro skills, `plugin/skills/<papel>/SKILL.md` para `mother`, `leader`, `worker` e `judge`.
5. **PAP-05** As instruções do servidor MCP, a descrição da tool `ready` e a resposta de `ready` a um número errado SHALL identificar o ping por `kind="ping"` e não conter `source="squad"`.

**Independent Test**: os quatro arquivos são lidos e conferidos; o servidor de teste devolve as instruções sem `source=`.

---

### P1: Credencial da sessão para os hooks ⭐ MVP

**User Story**: Como hook da sessão, quero a credencial que o broker deu ao servidor MCP, para escrever no log em nome da sessão.

**Why P1**: Toda rota exige `{ id }` (ADR-003) e o hook é outro processo.

**Acceptance Criteria**:

1. **PAP-06** WHEN `ready` registra a sessão no broker THEN o servidor MCP SHALL gravar o arquivo de credencial do nome com exatamente o `id` recebido, antes de responder à tool, com modo `0600` onde o sistema tem modo.
2. **PAP-07** WHEN o servidor MCP encerra depois de registrado THEN o servidor SHALL apagar o arquivo de credencial do nome.
3. **PAP-08** IF o arquivo de credencial não pode ser gravado ou apagado THEN o servidor MCP SHALL concluir o registro ou o encerramento do mesmo jeito.
4. **PAP-09** IF o broker recusa o registro THEN o servidor MCP SHALL não gravar arquivo de credencial algum.

**Independent Test**: uma sessão de teste registra, o arquivo aparece com o `id` que as rotas aceitam, e some quando a sessão fecha.

---

### P1: Início de turno ⭐ MVP

**User Story**: Como dev, quero que o log saiba quando um agente começou um turno, para distinguir quem trabalha de quem parou devendo.

**Why P1**: ADR-006: sem a marca de turno, `stalled` não existe.

**Acceptance Criteria**:

1. **PAP-10** WHEN `plugin/hooks/turn-started.ts` roda numa sessão do squad cujo arquivo de credencial existe THEN o hook SHALL fazer um único `POST /turn-started` com `{ id }` igual ao conteúdo do arquivo sem espaços nas pontas, e sair com código 0.
2. **PAP-11** The hook `turn-started.ts` SHALL não escrever nada na saída padrão, em nenhum caso.
3. **PAP-12** IF `SQUAD_ROLE` está ausente ou vazio, ou o arquivo de credencial não existe ou está vazio THEN `turn-started.ts` e `stop.ts` SHALL não fazer nenhuma chamada ao broker, não escrever nada na saída padrão e sair com código 0.
4. **PAP-13** IF o broker não responde em 2000 ms, responde com status diferente de 200 ou responde uma recusa THEN `turn-started.ts` SHALL sair com código 0.

**Independent Test**: o hook roda como processo contra um broker de teste com um peer registrado, e o log ganha um `turn_started` do nome.

---

### P1: Uso no fim do turno ⭐ MVP

**User Story**: Como dev, quero ver na TUI os tokens de cada agente, sem o agente reportar nada.

**Why P1**: O `usage` é a única fonte dos tokens e é a marca de fim de turno.

**Acceptance Criteria**:

1. **PAP-14** WHEN o uso de uma sessão é calculado THEN o cálculo SHALL dar, para cada `message.model` das linhas contadas dos transcripts da sessão, a soma de `input`, `output`, `cache_write` e `cache_read`, lidos de `message.usage.input_tokens`, `output_tokens`, `cache_creation_input_tokens` e `cache_read_input_tokens`.
2. **PAP-15** WHEN várias linhas contadas dos transcripts da sessão têm o mesmo `message.id` THEN o cálculo SHALL contar só a última delas, na ordem do arquivo; uma linha contada sem `message.id` SHALL ser contada sozinha.
3. **PAP-16** IF um dos quatro campos de `message.usage` está ausente ou não é inteiro de zero ou mais THEN o cálculo SHALL contá-lo como 0.
4. **PAP-17** IF uma linha de um transcript não é JSON válido ou não é uma linha contada THEN o cálculo SHALL ignorá-la e seguir com as outras.
5. **PAP-18** WHEN o diretório `subagents` da sessão tem arquivos `*.jsonl` THEN o cálculo SHALL somar as linhas contadas deles às do transcript principal, com a regra de PAP-15 valendo entre todos os arquivos.
6. **PAP-19** IF o transcript principal não existe ou não pode ser lido THEN o cálculo SHALL dar nenhum modelo, sem falhar.
7. **PAP-23** WHEN `plugin/hooks/stop.ts` encerra um turno (PAP-30 e PAP-32) THEN o hook SHALL fazer um `POST /usage` por modelo calculado, em ordem crescente do nome do modelo, cada um com `{ id, session_id, model, input, output, cache_write, cache_read }`, em que `session_id` é o do payload do hook, e sair com código 0 sem escrever na saída padrão.
8. **PAP-24** IF o cálculo dá nenhum modelo THEN `stop.ts` SHALL fazer um único `POST /usage` com `model` `unknown` e os quatro números iguais a 0.
9. **PAP-25** WHEN `stop.ts` roda duas vezes sobre os mesmos transcripts THEN os dois conjuntos de `usage` gravados SHALL ter os mesmos números.
10. **PAP-26** IF o payload do hook não é um objeto JSON, ou `session_id` está ausente ou não é texto não vazio THEN `stop.ts` SHALL enviar `session_id` `unknown` e calcular o uso como em PAP-19.
11. **PAP-27** IF o broker não responde a `/usage` em 2000 ms, responde com status diferente de 200 ou responde uma recusa THEN `stop.ts` SHALL sair com código 0 sem escrever na saída padrão.

**Independent Test**: um transcript de fixture com uma mensagem em três linhas e um subagente dá um `usage` por modelo com as somas escritas à mão na spec do teste.

---

### P1: Devolver ao trabalho quem para devendo ⭐ MVP

**User Story**: Como dev, quero que um agente que encerra o turno devendo um evento seja lembrado uma vez, para não ter de ir ao terminal dele.

**Why P1**: É o segundo sinal de fracasso do design: sessão travada.

**Acceptance Criteria**:

1. **PAP-28** WHEN `stop.ts` roda com `stop_hook_active` diferente de `true` e a regra de status do contrato, aplicada ao fim de turno hipotético, dá `stalled` para o nome da sessão THEN o hook SHALL escrever na saída padrão exatamente um objeto JSON `{ "decision": "block", "reason": <texto de PAP-29> }`, não fazer nenhum `POST /usage` e sair com código 0.
2. **PAP-29** WHEN `stop.ts` bloqueia a parada THEN `reason` SHALL ser `You are ending the turn and still owe the squad ` seguido da frase da dívida mais antiga e de ` If you cannot go on, ask a question with ask or call blocked.`, em que a frase é: para `result`, `the result of ticket <ticket_ref>, for the task of seq <seq>. Finish it and send it with send_result.`; para `verdict`, `the verdict of ticket <ticket_ref>, for the result of seq <seq>. Judge it and send it with send_verdict.`; para `task`, `the rework task of ticket <ticket_ref>, after the verdict of seq <seq>. Send it with send_task.`; para `plan`, `the plan of the feature, after the kickoff of seq <seq>. Send it with plan.`; para `answer`, `an answer to question <question_id>, which you hold since seq <seq>. Answer it with answer or pass it on with escalate.`
3. **PAP-30** WHEN `stop.ts` roda com `stop_hook_active` igual a `true` THEN o hook SHALL não ler `/events`, não bloquear e encerrar o turno como em PAP-23.
4. **PAP-31** IF `GET /events?after=0` não responde em 2000 ms ou responde algo que não é `{ events: [...] }` THEN `stop.ts` SHALL não bloquear e encerrar o turno como em PAP-23.
5. **PAP-32** WHEN a regra de status, aplicada ao fim de turno hipotético, dá outro status que não `stalled` para o nome THEN `stop.ts` SHALL não bloquear e encerrar o turno como em PAP-23; isso inclui o agente sem dívida, o que só tem entrega pendente, o que declarou `blocked`, o que tem `permission_request` aberto e o que é `asked_by` de uma pergunta bloqueante aberta.

**Independent Test**: com um `task` para `worker-1` no log, o hook como `worker-1` imprime o bloqueio com o ticket e o `seq`; com `stop_hook_active` verdadeiro, grava o `usage`.

---

### P1: `roles.json` ⭐ MVP

**User Story**: Como dev, quero um arquivo que diga as skills base de cada papel pelo nome do registry, para trocar o subconjunto sem tocar no código.

**Why P1**: Fase 4 do START.md.

**Acceptance Criteria**:

1. **PAP-33** WHEN o `roles.json` é lido THEN o leitor SHALL aceitá-lo só se for um objeto com `roles` lista, em que cada item tem `name` igual a um dos quatro papéis e sem repetição, `when_to_use` texto não vazio, `skills` lista de textos não vazios e, se presente, `workflows` objeto cujas chaves são só `tlc` e `matt-pocock` e cujos valores são listas de textos não vazios; em qualquer outro caso SHALL falhar com uma mensagem que contém o caminho do arquivo.
2. **PAP-34** The `plugin/roles.json` SHALL ter os quatro papéis com: `mother`, `skills` `the-fool` e `create-adr`, `tlc` `tlc-discover`, `matt-pocock` `grill-with-docs` e `to-spec`; `leader`, `skills` `help-me` e `the-jury`, `tlc` `tlc-plan`, `matt-pocock` `to-tickets`; `worker`, `skills` `coding-guidelines`, `ponytail`, `write-commit` e `codenavi`, `tlc` `tlc-implement`, `matt-pocock` `implement`; `judge`, `skills` `spec-driven-eval`, `ponytail-review`, `security-best-practices`, `break-ui`, `web-quality-audit` e `review-animations`, sem `workflows`.
3. **PAP-35** WHERE `SQUAD_ROLES` está definido THEN o launcher SHALL ler o `roles.json` desse caminho; sem ele SHALL ler `<raiz do squad>/plugin/roles.json`.
4. **PAP-36** IF o `roles.json` lido é válido e não tem o papel lançado THEN o launcher SHALL falhar como em PAP-42.

**Independent Test**: o arquivo do plugin passa no leitor e tem as listas acima; um arquivo com papel repetido é recusado com o caminho na mensagem.

---

### P1: Lançar uma sessão ⭐ MVP

**User Story**: Como dev, quero um comando por terminal que abra a sessão de um papel já configurada, para não montar ambiente, flags e lista de permitidos à mão.

**Why P1**: Default 1 do design e os três achados do teste 1 da Fase 0.

**Acceptance Criteria**:

1. **PAP-37** WHEN `squad start <papel> [nome] [--skip-permissions]` roda com um papel dos quatro THEN o launcher SHALL abrir um único processo, o comando de `SQUAD_CLAUDE` ou `claude` sem ele, com entrada, saída e erro herdados do terminal, e sair com o código de saída desse processo.
2. **PAP-38** WHEN o nome não é dado THEN o launcher SHALL usar o próprio papel para `mother`, `leader` e `judge`, e para `worker` o primeiro de `worker-1`, `worker-2` e `worker-3` cujo último evento de presença no log não é `peer_joined`; se a leitura do log falha SHALL usar `worker-1`.
3. **PAP-39** WHEN o launcher abre a sessão THEN o ambiente do processo SHALL ser o do launcher sem nenhuma variável cujo nome começa com `CLAUDE`, com `SQUAD_NAME` igual ao nome e `SQUAD_ROLE` igual ao papel, e as outras variáveis sem mudança.
4. **PAP-40** WHEN o launcher abre a sessão sem `--skip-permissions` THEN os argumentos SHALL ser, nesta ordem: `--plugin-dir`, `<raiz do squad>/plugin`, `--dangerously-load-development-channels`, `plugin:squad@inline`, `--permission-mode`, `acceptEdits`, `--allowedTools`, cada item da lista de permitidos (PAP-43 e PAP-44) como um argumento, `--append-system-prompt`, o texto de PAP-46 e, por último, `/squad:<papel>`.
5. **PAP-41** WHEN o launcher falha antes de abrir a sessão THEN o launcher SHALL escrever na saída de erro uma linha que começa com `squad: ` e diz a causa, não abrir processo algum e sair com código 1.
6. **PAP-42** IF o papel está ausente ou não é um dos quatro, há mais de um argumento posicional depois do papel, há uma opção que não é `--skip-permissions`, o nome dado não é um dos nomes do papel (`mother`, `leader`, `judge`, ou `worker-1` a `worker-3` para `worker`), os três nomes de worker estão online e nenhum nome foi dado, o diretório atual não está num repositório git, ou o `roles.json` não é válido ou não tem o papel THEN o launcher SHALL falhar como em PAP-41 sem criar worktree nem copiar arquivo.
7. **PAP-43** The lista de permitidos SHALL começar pelas tools do squad do papel, na ordem `ready` e depois a de `toolsFor(papel)`, e não conter tool do squad de outro papel.
8. **PAP-44** The lista de permitidos SHALL ter, depois das tools do squad, uma regra `Bash(<comando>:*)` para cada comando git do papel, nesta ordem: `git status`, `git diff`, `git log`, `git show`, `git rev-parse` para todos; depois `git switch`, `git add`, `git commit` para `worker`, `leader` e `mother`, e só `git switch` para `judge`; depois `git merge` para `leader`.
9. **PAP-45** WHERE a plataforma é `win32` THEN a lista de permitidos SHALL ter, depois das regras `Bash`, as mesmas regras na mesma ordem com `PowerShell(` no lugar de `Bash(`; em outra plataforma SHALL não ter regra `PowerShell`.
10. **PAP-46** The texto de `--append-system-prompt` SHALL ser as linhas, separadas por `\n`: `Squad name: <nome>. Squad role: <papel>.`; `Base skills of your role: <skills separadas por ", ">.`; `With the tlc workflow, also: <lista>.`; `With the matt-pocock workflow, also: <lista>.`; `Use only the skills of the workflow of the open feature.`; em que uma linha de lista vazia ou ausente é omitida, e a última só existe se alguma das duas de workflow existe.
11. **PAP-47** WHERE `--skip-permissions` é dado THEN os argumentos SHALL ter `--dangerously-skip-permissions` no lugar de `--permission-mode`, `acceptEdits`, `--allowedTools` e da lista, com o resto igual a PAP-40.
12. **PAP-50** IF o comando da sessão não pode ser executado THEN o launcher SHALL falhar como em PAP-41, com o nome do comando na linha.

**Independent Test**: num repositório temporário, `launch` com um `spawn` que só registra devolve o comando, os argumentos, o ambiente e o diretório esperados.

---

### P1: Worktree por papel ⭐ MVP

**User Story**: Como dev, quero cada papel no seu worktree, com as credenciais do projeto, para que as sessões não pisem umas nas outras nem comecem sem `.env`.

**Why P1**: ADR-012 e default 5.

**Acceptance Criteria**:

1. **PAP-51** WHEN o papel é `mother` THEN o launcher SHALL abrir a sessão com o checkout principal como diretório de trabalho, sem criar worktree, sem copiar arquivo e sem rodar nenhum comando git que escreva.
2. **PAP-52** WHEN o papel é `leader`, `worker` ou `judge` THEN o launcher SHALL abrir a sessão com `<diretório de worktrees>/<nome>` como diretório de trabalho.
3. **PAP-53** WHEN o worktree de um `worker` ou `judge` não existe THEN o launcher SHALL criá-lo com HEAD destacado no commit da ponta do branch da feature aberta, ou no `HEAD` do checkout principal quando não há feature aberta ou o branch dela não existe no repositório.
4. **PAP-54** WHEN o worktree do `leader` não existe THEN o launcher SHALL criá-lo no branch da feature aberta, ou com HEAD destacado no `HEAD` do checkout principal quando não há feature aberta ou o branch dela não existe no repositório.
5. **PAP-55** WHEN o diretório do worktree já existe THEN o launcher SHALL usá-lo como está, sem rodar comando git que escreva e sem copiar arquivo.
6. **PAP-56** WHEN o launcher cria um worktree THEN o launcher SHALL copiar para a raiz dele cada arquivo regular da raiz do checkout principal cujo nome começa com `.env` e que o git não versiona, com o mesmo nome e conteúdo, sem sobrescrever arquivo que já esteja lá.
7. **PAP-57** IF `git worktree add` falha THEN o launcher SHALL falhar como em PAP-41 com a mensagem do git na linha, sem copiar arquivo.
8. **PAP-58** WHEN `squad start` roda de dentro de um worktree do repositório THEN o launcher SHALL resolver o checkout principal e o diretório de worktrees como se rodasse do checkout principal.

**Independent Test**: num repositório temporário com um `.env` não versionado, `launch` de `worker` cria `<repo>.squad/worker-1` destacado, com o `.env` copiado; a segunda chamada não muda nada.

---

### P1: Comando `squad` ⭐ MVP

**User Story**: Como dev, quero um comando só para subir sessões e a TUI.

**Why P1**: Default 6.

**Acceptance Criteria**:

1. **PAP-59** The `broker/package.json` SHALL ter `bin.squad` igual a `./cli.ts`, e `cli.ts` SHALL aceitar `start` (o launcher), `tui` (roda a TUI no mesmo terminal e sai com o código dela), `status` e `kill-broker`, e para qualquer outro primeiro argumento escrever o uso com as quatro linhas e sair com código 0 sem argumento e 1 com um comando desconhecido.

**Independent Test**: `bun cli.ts` lista os quatro comandos; `bun cli.ts start nada` sai com 1 e `squad: `.

---

### P1: Skills de protocolo ⭐ MVP

**User Story**: Como agente lançado num papel, quero saber o que fazer com cada evento que recebo e o que nunca fazer, para o squad andar sem o dev em cada terminal.

**Why P1**: Sem elas nenhuma sessão segue o contrato.

**Acceptance Criteria**:

1. **PAP-60** Cada `plugin/skills/<papel>/SKILL.md` SHALL começar com um frontmatter YAML com `name` igual ao papel e `description` não vazia, e ter as seções de nível 2, nesta ordem: `Start`, `No acknowledgements`, `Your work`, `Asking`, `Credentials`, `Irreversible actions`, `When the feature closes`.
2. **PAP-61** Cada skill SHALL citar entre crases só tools do squad do seu papel, e SHALL citar todas estas: `ready`, `state`, `ask`, `blocked`, mais `send_result`, `answer` e `history` no `worker`; `send_verdict` e `history` no `judge`; `plan`, `send_task`, `send_result`, `answer` e `escalate` no `leader`; `open_feature`, `send_task`, `answer`, `escalate`, `merge_question` e `close_feature` na `mother`.
3. **PAP-62** A seção `Start` de cada skill SHALL mandar esperar o ping e chamar `ready` com o número dele, depois chamar `state` antes de qualquer outra coisa e agir pelo que ele devolve (feature aberta, ticket atual, o que deve), e ler a spec com `git show <spec_commit>:<spec_ref>`.
4. **PAP-63** A seção `No acknowledgements` de cada skill SHALL proibir enviar mensagem cujo único conteúdo é avisar que algo foi recebido, lido ou começado.
5. **PAP-64** A seção `Asking` de cada skill SHALL mandar perguntar em vez de decidir o que a spec não define; escrever a pergunta completa na origem, porque o dev lê o texto de quem perguntou primeiro (o `summary` como a pergunta numa linha e o `body` com o que precisa ser decidido e o que já foi visto); dar `why`; dar até 3 `options` quando há alternativas; usar `blocking` falso com `default` sempre que der para seguir, e `blocking` verdadeiro só quando não dá.
6. **PAP-65** A seção `Credentials` de cada skill SHALL mandar, quando falta uma credencial, declarar `blocked` e fazer uma pergunta bloqueante que diz onde a credencial deve ser colocada e pede a confirmação; e SHALL proibir pedir o valor e escrever um segredo em qualquer mensagem.
7. **PAP-66** A seção `Irreversible actions` das skills de `worker`, `leader` e `judge` SHALL listar merge ou push no branch base, deploy, migração de dados, apagar algo fora do worktree e chamada externa com efeito, e mandar não executar nenhuma delas sem resposta a uma pergunta bloqueante ao nível de cima.
8. **PAP-67** A seção `When the feature closes` de cada skill SHALL dizer que um `feature_closed` encerra as perguntas da feature, inclusive a bloqueante de que o agente espera resposta, e mandar parar o trabalho da feature sem enviar mais nada sobre ela.
9. **PAP-68** A seção `Your work` do `worker` SHALL mandar: ao receber `task`, criar o branch do ticket a partir do branch da feature com `git switch -c`; trabalhar com as skills base do papel e as do `loadout`; fazer commit; enviar `send_result` ao `judge` com `ticket_ref`, `task_seq` do `task` mais recente, `branch` e `commit`; nunca fazer merge nem push; num `task` de rework, seguir no mesmo branch e citar o `task_seq` novo; responder com `answer` a pergunta do judge; e parar depois do `result`, porque o veredito não chega ao worker.
10. **PAP-69** A seção `Your work` do `judge` SHALL mandar: ao receber `result`, ir ao commit com `git switch --detach`; ler com `history` o `task` do ticket e as perguntas e respostas dele; avaliar o commit contra os critérios do ticket e essas respostas; enviar `send_verdict` ao `leader` com `result_seq` do `result` mais recente, `outcome` e um item de `criteria` por critério; em `stale_reference`, julgar o `result` mais recente; e perguntar ao worker dono do ticket em caso de dúvida sobre a entrega.
11. **PAP-70** A seção `Your work` do `leader` SHALL mandar: no kickoff, trocar para o branch da feature com `git switch` e enviar o `plan` antes do primeiro `task`; enviar `send_task` com `ticket_ref`, `loadout` e `criteria`, um ticket por worker e só depois de aprovadas as dependências; num `approve`, integrar o branch do ticket no branch da feature com `git merge`; num `rework`, enviar novo `task` ao mesmo worker; em `rework_limit`, fazer uma pergunta bloqueante à mother e, com a resposta, marcar o ticket `dropped` no `plan`; responder as perguntas dos workers ou escalar; e, com todos os tickets aprovados, enviar um único `send_result` à mother, sem reportar ticket a ticket.
12. **PAP-71** A seção `Your work` da `mother` SHALL mandar: fazer a descoberta com o dev no terminal, fora do broker; criar o branch da feature a partir do branch base, commitar a spec nele e voltar ao branch base antes de `open_feature`; enviar o kickoff ao leader com `send_task`; responder as perguntas que souber, mesclar as iguais com `merge_question` quando têm o mesmo `blocking`, e escalar as outras ao dev; e mandar ao leader, com `send_task`, o trabalho novo que uma resposta do dev pedir.
13. **PAP-72** A skill da `mother` SHALL ter, depois de `Irreversible actions`, a seção `Delivery (until the gate exists)`, e as duas SHALL trazer a linha `<!-- Gate slice: rewrite this section to use the gate -->`; a primeira SHALL mandar escalar ao dev a pergunta bloqueante de uma ação irreversível e não respondê-la por conta própria; a segunda SHALL mandar, ao receber o `result` do leader, fazer ao dev uma pergunta bloqueante com o commit do branch da feature e a ação de entrega, executar exatamente essa ação só depois de uma resposta que a autoriza, e então `close_feature` com `delivered`; e a skill SHALL não citar tool de gate.

**Independent Test**: um teste lê cada `SKILL.md`, confere o frontmatter, as seções na ordem, as tools citadas contra `toolsFor(papel)` e os comandos literais.

---

### P2: Documentação

**User Story**: Como dev, quero o passo a passo de subir o squad num só lugar.

**Why P2**: Não muda comportamento.

**Acceptance Criteria**:

1. **PAP-73** The `README.md` da raiz SHALL ter uma seção que mostra `bun link` em `broker/`, `squad start` para os quatro papéis, `squad tui` e `--skip-permissions`, e `broker/CLAUDE.md` SHALL descrever `launch.ts`, `roles.ts`, o arquivo de credencial e o diretório `plugin/`.

---

## Edge Cases

- **PAP-20** IF o conteúdo do arquivo de credencial tem espaços ou quebra de linha nas pontas THEN os hooks SHALL usar o texto sem eles.
- **PAP-21** IF o payload de `stop.ts` não tem `transcript_path` texto THEN o hook SHALL calcular o uso como em PAP-19.
- **PAP-22** IF `SQUAD_NAME` não é um nome do squad THEN `stop.ts` SHALL não bloquear e encerrar o turno como em PAP-23.
- **PAP-48** IF o branch da feature aberta está em checkout em outra árvore de trabalho quando o worktree do leader é criado THEN o launcher SHALL falhar como em PAP-57.
- **PAP-49** WHEN o nome é dado e já está online no log THEN o launcher SHALL abrir a sessão do mesmo jeito: quem recusa é o broker, no registro (`name_taken`).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PAP-01 | P1: Plugin em diretório próprio | - | Pending |
| PAP-02 | P1: Plugin em diretório próprio | - | Pending |
| PAP-03 | P1: Plugin em diretório próprio | - | Pending |
| PAP-04 | P1: Plugin em diretório próprio | - | Pending |
| PAP-05 | P1: Plugin em diretório próprio | - | Pending |
| PAP-06 | P1: Credencial da sessão para os hooks | - | Pending |
| PAP-07 | P1: Credencial da sessão para os hooks | - | Pending |
| PAP-08 | P1: Credencial da sessão para os hooks | - | Pending |
| PAP-09 | P1: Credencial da sessão para os hooks | - | Pending |
| PAP-10 | P1: Início de turno | - | Pending |
| PAP-11 | P1: Início de turno | - | Pending |
| PAP-12 | P1: Início de turno | - | Pending |
| PAP-13 | P1: Início de turno | - | Pending |
| PAP-14 | P1: Uso no fim do turno | - | Pending |
| PAP-15 | P1: Uso no fim do turno | - | Pending |
| PAP-16 | P1: Uso no fim do turno | - | Pending |
| PAP-17 | P1: Uso no fim do turno | - | Pending |
| PAP-18 | P1: Uso no fim do turno | - | Pending |
| PAP-19 | P1: Uso no fim do turno | - | Pending |
| PAP-20 | Edge case | - | Pending |
| PAP-21 | Edge case | - | Pending |
| PAP-22 | Edge case | - | Pending |
| PAP-23 | P1: Uso no fim do turno | - | Pending |
| PAP-24 | P1: Uso no fim do turno | - | Pending |
| PAP-25 | P1: Uso no fim do turno | - | Pending |
| PAP-26 | P1: Uso no fim do turno | - | Pending |
| PAP-27 | P1: Uso no fim do turno | - | Pending |
| PAP-28 | P1: Devolver ao trabalho quem para devendo | - | Pending |
| PAP-29 | P1: Devolver ao trabalho quem para devendo | - | Pending |
| PAP-30 | P1: Devolver ao trabalho quem para devendo | - | Pending |
| PAP-31 | P1: Devolver ao trabalho quem para devendo | - | Pending |
| PAP-32 | P1: Devolver ao trabalho quem para devendo | - | Pending |
| PAP-33 | P1: `roles.json` | - | Pending |
| PAP-34 | P1: `roles.json` | - | Pending |
| PAP-35 | P1: `roles.json` | - | Pending |
| PAP-36 | P1: `roles.json` | - | Pending |
| PAP-37 | P1: Lançar uma sessão | - | Pending |
| PAP-38 | P1: Lançar uma sessão | - | Pending |
| PAP-39 | P1: Lançar uma sessão | - | Pending |
| PAP-40 | P1: Lançar uma sessão | - | Pending |
| PAP-41 | P1: Lançar uma sessão | - | Pending |
| PAP-42 | P1: Lançar uma sessão | - | Pending |
| PAP-43 | P1: Lançar uma sessão | - | Pending |
| PAP-44 | P1: Lançar uma sessão | - | Pending |
| PAP-45 | P1: Lançar uma sessão | - | Pending |
| PAP-46 | P1: Lançar uma sessão | - | Pending |
| PAP-47 | P1: Lançar uma sessão | - | Pending |
| PAP-48 | Edge case | - | Pending |
| PAP-49 | Edge case | - | Pending |
| PAP-50 | P1: Lançar uma sessão | - | Pending |
| PAP-51 | P1: Worktree por papel | - | Pending |
| PAP-52 | P1: Worktree por papel | - | Pending |
| PAP-53 | P1: Worktree por papel | - | Pending |
| PAP-54 | P1: Worktree por papel | - | Pending |
| PAP-55 | P1: Worktree por papel | - | Pending |
| PAP-56 | P1: Worktree por papel | - | Pending |
| PAP-57 | P1: Worktree por papel | - | Pending |
| PAP-58 | P1: Worktree por papel | - | Pending |
| PAP-59 | P1: Comando `squad` | - | Pending |
| PAP-60 | P1: Skills de protocolo | - | Pending |
| PAP-61 | P1: Skills de protocolo | - | Pending |
| PAP-62 | P1: Skills de protocolo | - | Pending |
| PAP-63 | P1: Skills de protocolo | - | Pending |
| PAP-64 | P1: Skills de protocolo | - | Pending |
| PAP-65 | P1: Skills de protocolo | - | Pending |
| PAP-66 | P1: Skills de protocolo | - | Pending |
| PAP-67 | P1: Skills de protocolo | - | Pending |
| PAP-68 | P1: Skills de protocolo | - | Pending |
| PAP-69 | P1: Skills de protocolo | - | Pending |
| PAP-70 | P1: Skills de protocolo | - | Pending |
| PAP-71 | P1: Skills de protocolo | - | Pending |
| PAP-72 | P1: Skills de protocolo | - | Pending |
| PAP-73 | P2: Documentação | - | Pending |

**Coverage:** 73 total, 0 mapped to tasks, 73 unmapped.

---

## Success Criteria

- [ ] Num repositório temporário, o launcher monta para cada papel o comando, os argumentos, o ambiente e o worktree desta spec, com git real.
- [ ] Os dois hooks, rodados como processos contra um broker real, gravam `turn_started` e `usage` e devolvem ao trabalho quem a regra de status dá como `stalled`, e só ele.
- [ ] As quatro skills passam no teste de conteúdo e foram lidas contra PAP-62 a PAP-72 por quem não as escreveu.
- [ ] `real-sessions.md` diz, para RS-01 a RS-14, o que foi exercitado com sessão real, com a evidência, e o que ficou sem exercitar.
- [ ] `bun node_modules/typescript/bin/tsc --noEmit` e `bun test` passam no Windows e no Linux, ou a spec registra qual dos dois ficou sem rodar. Antes da fatia, `main` em `f162184`: Linux, contêiner `oven/bun:1.4.2` sobre clone limpo, `tsc` 0 e 3 de 3 execuções com 1306 pass, 1 skip, 0 fail, 63 arquivos.
