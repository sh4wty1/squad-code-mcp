# Papéis: sessões reais

O que só uma sessão real mostra (RS-01 a RS-14 da spec), exercitado em 2026-10-12 com o
plugin e o launcher da fatia. Onze itens exercitados, um em parte, dois não exercitados.

**Ambiente:** Windows 11 Pro 10.0.26200, Claude Code 2.1.296, Bun 1.4.2, modelo
`claude-haiku-5-5` em todas as sessões (`--model haiku` nas de `-p`, `ANTHROPIC_MODEL` nas
do launcher). Nenhuma sessão rodou com outro modelo.

**Código sob teste:** RS-01 a RS-09 em `7c58a5d`; RS-10, RS-11, RS-13 e RS-14 em `6609630`,
depois da correção que a primeira rodada de quatro sessões pediu (T23).

**Isolamento:** um repositório descartável fora deste, `SQUAD_PORT`, `SQUAD_DB`,
`SQUAD_TOKEN_FILE` e `SQUAD_WORKTREES` temporários, as variáveis `CLAUDE*` removidas. O
broker de teste foi encerrado no fim e nenhum processo das sessões ficou de pé. Este
repositório não foi tocado por nenhuma sessão (ver o defeito 1, abaixo).

## Resultado por item

| Id | Estado | O que foi feito | O que foi visto |
| -- | ------ | --------------- | --------------- |
| RS-01 | Exercitado | `claude -p ... --plugin-dir <raiz>/plugin --output-format stream-json --verbose` | No `init`: plugin `squad` de `squad@inline`, servidor `plugin:squad:squad` `connected`, tool `mcp__plugin_squad_squad__ready`, skills `squad:judge`, `squad:leader`, `squad:mother` e `squad:worker` |
| RS-02 | Exercitado | `squad start mother`, sessão interativa num ConPTY | O aviso do canal de desenvolvimento, o ping (`← squad: Squad ping 210989`), `ready` chamado sem pedido de permissão e `peer_joined` de `mother` no log |
| RS-03 | Exercitado | A mesma sessão; repetido com os quatro papéis em RS-10 | `❯ /squad:mother` é a primeira linha da sessão; a skill roda, espera o ping, registra, chama `state` e começa a descoberta |
| RS-04 | Exercitado | Na sessão da mother, um prompt digitado que pede `git status`, um arquivo novo com `git add`, e `git tag rs04` | As tools do squad, a escrita do arquivo e o `git add` rodaram sem pedido. `git tag rs04`, fora da lista, abriu o diálogo "This command requires approval" |
| RS-05 | Exercitado | Turno digitado (RS-04) e turno aberto pelo canal (RS-07, RS-10) | `turn_started` depois de cada prompt digitado e depois de cada mensagem do canal a uma sessão registrada. O turno do ping não tem `turn_started`: a credencial só existe depois de `ready` |
| RS-06 | Exercitado | Um peer registrado à mão, o arquivo de credencial dele escrito à mão, e `claude -p ... --output-format json` com o plugin | `modelUsage` do CLI: 6, 251, 12227 e 79943. `usage` gravado pelo hook: 6, 251, 12227 e 79943, com o `session_id` da sessão |
| RS-07 | Exercitado | Worker real pelo launcher; um `task` que manda não começar e não enviar nada | Na tela: `Stop hook error: You are ending the turn and still owe the squad the result of ticket T-1, for the task of seq 8. Finish it and send it with send_result. If you cannot go on, ask a question with ask or call blocked.` O agente fez uma pergunta bloqueante e declarou `blocked`; a segunda parada passou. No log: `task` 8, `turn_started` 9, `question` 10, `blocked` 11, e um único `usage`, 12 |
| RS-08 | Exercitado | Todas as sessões do launcher subiram de dentro de uma sessão do Claude Code | Todo `usage` gravado tem números diferentes de zero: o transcript foi gravado e lido |
| RS-09 | Exercitado | Os dois pedidos de RS-04, decididos com `POST /permission-decision` e a credencial humana | `permission_request` 7 → `allow` → a tag `rs04` existe. `permission_request` 11 → `deny` → a tag `rs04b` não existe e o agente diz que o pedido foi negado. Mais 13 pedidos liberados pela rota em RS-10 e RS-11 |
| RS-10 | Exercitado | Mother, leader, worker e judge pelo `squad` instalado; a feature digitada no terminal da mother; o dev responde só pelas rotas | Do `feature_opened` à pergunta de entrega em menos de 7 minutos (eventos 10 a 58 do log): `feature_opened`, kickoff, `plan` com T2 dependendo de T1, `task`, `result`, `verdict` `approve` e merge de cada ticket, um `result` do leader, a pergunta bloqueante de entrega com o commit. Nenhuma mensagem de aviso de recebimento. Com a resposta do dev, a mother fez o merge e fechou como `delivered` |
| RS-11 | Exercitado em parte | Uma segunda feature nas mesmas sessões, com uma credencial que não existe e um ponto que a spec deixa em aberto; o judge trocado por um substituto que manda `rework` | Pergunta até o dev: sim, duas. Credencial: `blocked`, pergunta bloqueante com o caminho do `.env` e o pedido de confirmação, sem pedir o valor. Rework: o leader mandou novo `task` ao mesmo worker, que seguiu no mesmo branch e citou o `task_seq` novo. Os desvios estão abaixo |
| RS-12 | Não exercitado | - | Não há Claude Code com login num Linux desta máquina. O launcher roda no Linux pela suíte (`launch*.test.ts`, com git real), não por uma sessão |
| RS-13 | Exercitado | Lido no log de RS-10 e RS-11 | Vários: cada mensagem do canal que chega com o agente em turno marca um `turn_started`, e o turno tem um `usage` só. Cinco turnos com dois `turn_started` (leader 13 e 17, 76 e 78, 107 e 111; mother 86 e 88, 104 e 106) |
| RS-14 | Exercitado no Windows | `bun link` em `broker/` com `BUN_INSTALL` temporário, e `squad.exe` de lá | `squad` sem argumento lista os quatro comandos; `squad start nada` sai com 1 e `squad: nada is not a role`; as quatro sessões de RS-10 subiram por `squad start <papel>`. No Linux: não exercitado |

O log inteiro de RS-10 e RS-11 está em `real-sessions-log.txt`, 142 eventos.

## Defeitos que as sessões mostraram

Os dois apareceram na primeira rodada com quatro sessões, em `7c58a5d`, e foram corrigidos
na T23 (`6609630`), com PAP-74 e PAP-75 novos na spec. A segunda rodada não os repetiu.

1. **A mother tomou o diretório do plugin pelo projeto.** O Claude Code põe
   `Base directory for this skill: <raiz>/plugin/skills/mother` no começo da skill. A mother
   leu esse caminho como a raiz do repositório e pediu para rodar `git status` e ler
   arquivos na raiz deste repositório, não no descartável. Os pedidos caíram em permissão
   (fora da lista) e foram negados; perguntada, ela citou a linha. Correção: cada skill diz
   que o projeto é o diretório de trabalho da sessão e proíbe mexer no diretório do plugin.
2. **Worker e judge pararam depois de `ready` sem chamar `state`.** Nesta máquina as tools
   do squad entram como tools adiadas: o modelo as carrega por busca. Depois de `ready` as
   outras tools aparecem, mas pedem nova busca; os dois disseram "next I'll call state" e
   encerraram o turno. Sem dívida, nada os acordaria. Correção: `Start` manda chamar `state`
   no mesmo turno, buscar as tools pelo nome e não encerrar o turno entre os dois. Na
   segunda rodada os quatro chamaram `state` no turno do ping.

## Desvios vistos e não corrigidos

Comportamento do modelo ou atrito, com `haiku`. Nenhum travou uma feature.

- **A mother perguntou em vez de escalar.** Em RS-11 ela não usou `escalate` nas duas
  perguntas do leader: fez duas perguntas novas ao dev com `ask` e, com as respostas,
  respondeu as do leader com `answer`. O dev leu o texto dela, não o de quem perguntou
  (o contrário do AD-013), e a pergunta original ficou aberta até a resposta dela.
- **A mother declarou `blocked` e não chamou `unblocked`.** Ficaria `blocked` na TUI até o
  fim da feature.
- **Quem levantou a credencial foi o leader**, antes de mandar o `task`, e o caminho que
  ele deu foi o do `.env` do worktree dele, não o do worker. O worker entregou a parte que
  não dependia do segredo.
- **O veredito de `rework` veio de um substituto**, não de um judge real: um script
  registrado como `judge`. O rework de leader e worker é real; o julgamento que o causou,
  não.
- **Seis `refused` de primeira chamada** (`missing_field` e `invalid_field` em `send_result`,
  `ask` e `blocked`). Os campos estão no esquema das tools; o agente acertou na chamada
  seguinte, pela dica da recusa.
- **Todo comando do projeto pede permissão.** `node`, `cat`, e todo comando composto
  (`git add ... && git commit ...` junto com outro) caem fora da lista: 13 pedidos em duas
  features pequenas. É o que a spec define (os comandos do projeto vêm do
  `.claude/settings.json` do repositório), e a rota respondeu a todos. Sem TUI para decidir
  (fatia Gate), o dev decide em cada terminal.

## Não exercitado

- RS-12, e RS-14 no Linux: sessão real no Linux. macOS.
- Outro modelo que não `haiku`.
- Um `rework` decidido por um judge real, e o limite de rework (`rework_limit`).
- Uma pergunta de worker ou de judge escalada salto a salto com `escalate`.
- `--skip-permissions` numa sessão real.
- A TUI ao lado das sessões: as respostas e as decisões do dev foram por `POST /answer` e
  `POST /permission-decision`, não por tecla.
- Uma sessão relançada no lugar de outra que morreu no meio de um ticket.
- Um `.env` de projeto que define `SQUAD_*`: o Bun o carrega no diretório do hook.
- Uma máquina em que `claude` é só o `claude.cmd` do npm, e um Ctrl+C no launcher antes de
  a sessão assumir o terminal.

## Outras coisas vistas

- A confiança na pasta foi pedida uma vez, no checkout principal, e não nos worktrees do
  mesmo repositório.
- O launcher criou os worktrees dos três papéis em `SQUAD_WORKTREES`: com a feature aberta,
  o do worker nasceu destacado na ponta do branch dela, com o `.env` não versionado copiado.
- O bloqueio do hook de parada aparece na tela como `Stop hook error:`. O texto é o de
  PAP-29; o rótulo é do Claude Code.
- Uma sessão morta à força deixa o arquivo de credencial e o registro; o broker tira o peer
  na limpeza seguinte (`peer_left` com `died`).

## Como repetir

`real-session-driver.py` sobe um programa num ConPTY, espera a tela e manda teclas; texto
posto em `<prefixo>.in` é digitado na sessão e `<prefixo>.now.txt` tem a tela do momento.
Precisa de `pywinpty` e `pyte`. Só serve no Windows.

`real-session-tools/` tem o resto, tudo sobre `SQUAD_PORT`, `SQUAD_DB` e `SQUAD_TOKEN_FILE`
do ambiente:

- `events.py`: o log, uma linha por evento.
- `dev.py <segundos>`: o dev olhando o squad. Mostra os eventos novos e libera pela rota os
  pedidos de permissão de comandos que ficam dentro do worktree; os da mother e os que
  citam outro caminho ficam abertos.
- `decide.py <allow|deny> [nome]`: a decisão do dev para o último pedido.
- `api.py human answer '<json>'`: a resposta do dev a uma pergunta. `api.py post <nome>
  <rota> '<json>'`: uma chamada em nome de um substituto.
- `standin.py <nome> <papel>`: um substituto de sessão, que se registra com o próprio pid e
  manda o heartbeat. Um pid tem um registro só, e um peer sem heartbeat por 60 s sai.

Os dois diálogos de subida: na confiança na pasta a opção marcada é "No, exit" (seta para
baixo e Enter); no aviso do canal a marcada é "I am using this for local development"
(Enter).
